import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { parseJpegBinaryExif } from './exifReader';

export interface PickResult {
  canceled: boolean;
  uri?: string;
  width?: number;
  height?: number;
  exif?: Record<string, any>;
  location?: { latitude: number; longitude: number };
  creationTime?: number;
}

/**
 * Request media library permissions for full asset access.
 */
async function ensureMediaLibraryPermission(): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Parse Date from string or number
 */
function parseDateString(rawDate: any): number | undefined {
  if (!rawDate) return undefined;
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) return rawDate.getTime();
  if (typeof rawDate === 'number' && rawDate > 0) return rawDate < 10000000000 ? rawDate * 1000 : rawDate;

  const str = String(rawDate).trim();
  const m = str.match(/^(\d{4})[:\-\/](\d{1,2})[:\-\/](\d{1,2})[ T](\d{1,2}):(\d{1,2}):?(\d{1,2})?/);
  if (m) {
    const d = new Date(
      parseInt(m[1]),
      parseInt(m[2]) - 1,
      parseInt(m[3]),
      parseInt(m[4]),
      parseInt(m[5]),
      parseInt(m[6] || '0')
    );
    if (!isNaN(d.getTime())) return d.getTime();
  }

  const iso = new Date(str);
  if (!isNaN(iso.getTime()) && iso.getFullYear() > 1990) return iso.getTime();
  return undefined;
}

export async function pickImageFromLibrary(): Promise<PickResult> {
  await ensureMediaLibraryPermission();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    exif: true,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    const asset = result.assets[0];
    let exif = asset.exif ? { ...asset.exif } : {};
    let location: { latitude: number; longitude: number } | undefined;
    let creationTime: number | undefined;

    console.log('[Picker] Selected image:', asset.uri, 'fileName:', asset.fileName);

    // Step 1: Binary EXIF Parsing directly from the image file on device
    if (asset.uri) {
      try {
        console.log('[Picker] Reading raw binary bytes from:', asset.uri);
        const res = await fetch(asset.uri);
        const buffer = await res.arrayBuffer();
        if (buffer && buffer.byteLength > 0) {
          const parsed = parseJpegBinaryExif(buffer);
          console.log('[Picker] Binary EXIF parse result:', parsed);

          if (parsed.latitude !== undefined && parsed.longitude !== undefined) {
            location = { latitude: parsed.latitude, longitude: parsed.longitude };
            console.log('[Picker] ✅ Extracted GPS from binary header:', location);
          }

          if (parsed.dateTime) {
            creationTime = parseDateString(parsed.dateTime);
            console.log('[Picker] ✅ Extracted Date from binary header:', parsed.dateTime);
          }
        }
      } catch (err) {
        console.warn('[Picker] Binary EXIF read error:', err);
      }
    }

    // Step 2: MediaLibrary direct asset lookup if available
    if (asset.assetId && (!location || !creationTime)) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset.assetId);
        if (info) {
          if (!location && info.location && Math.abs(info.location.latitude) > 0.001) {
            location = info.location;
            console.log('[Picker] ✅ GPS from MediaLibrary assetId:', location);
          }
          if (!creationTime && info.creationTime) {
            creationTime = info.creationTime;
          }
          if (info.exif) exif = { ...exif, ...info.exif };
        }
      } catch (e) {
        console.log('[Picker] MediaLibrary assetId read skipped:', e);
      }
    }

    // Step 3: Check JS EXIF object fallback
    if (!creationTime && exif) {
      const rawDate = exif.DateTimeOriginal || exif['{Exif}']?.DateTimeOriginal || exif.DateTime;
      creationTime = parseDateString(rawDate);
    }

    console.log('[Picker] Final resolved location:', location, 'creationTime:', creationTime);

    return {
      canceled: false,
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      exif,
      location,
      creationTime,
    };
  }

  return { canceled: true };
}

export async function pickImageFromCamera(): Promise<PickResult> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Camera permission is required to capture photos directly.');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 1,
    exif: true,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    const asset = result.assets[0];
    const exif = asset.exif ?? {};
    let location: { latitude: number; longitude: number } | undefined;
    let creationTime: number | undefined;

    if (asset.uri) {
      try {
        const res = await fetch(asset.uri);
        const buffer = await res.arrayBuffer();
        if (buffer && buffer.byteLength > 0) {
          const parsed = parseJpegBinaryExif(buffer);
          if (parsed.latitude !== undefined && parsed.longitude !== undefined) {
            location = { latitude: parsed.latitude, longitude: parsed.longitude };
          }
          if (parsed.dateTime) {
            creationTime = parseDateString(parsed.dateTime);
          }
        }
      } catch (e) {
        console.warn('[Picker] Camera binary read error:', e);
      }
    }

    return {
      canceled: false,
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      exif,
      location,
      creationTime,
    };
  }

  return { canceled: true };
}
