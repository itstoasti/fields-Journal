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
 * Fast Base64 -> ArrayBuffer decoder for React Native Hermes.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let bufferLength = base64.length * 0.75;
  const len = base64.length;
  if (base64[len - 1] === '=') {
    bufferLength--;
    if (base64[len - 2] === '=') {
      bufferLength--;
    }
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const enc1 = lookup[base64.charCodeAt(i)];
    const enc2 = lookup[base64.charCodeAt(i + 1)];
    const enc3 = lookup[base64.charCodeAt(i + 2)];
    const enc4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (p < bufferLength) bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    if (p < bufferLength) bytes[p++] = ((enc3 & 3) << 6) | (enc4 & 63);
  }

  return arrayBuffer;
}

/**
 * Read image file binary buffer using modern Expo File class or legacy fallback
 */
async function readImageFileBuffer(uri: string): Promise<ArrayBuffer | null> {
  // Method A: Modern Expo SDK 54 File API
  try {
    const { File } = require('expo-file-system');
    if (File) {
      const file = new File(uri);
      if (typeof file.base64 === 'function') {
        const b64 = await file.base64();
        if (b64 && b64.length > 0) {
          return base64ToArrayBuffer(b64.slice(0, 524288));
        }
      }
    }
  } catch (e) {
    console.log('[Picker] Modern File API read skipped, trying legacy:', e);
  }

  // Method B: Legacy FileSystem readAsStringAsync
  try {
    const FileSystemLegacy = require('expo-file-system/legacy');
    if (FileSystemLegacy && typeof FileSystemLegacy.readAsStringAsync === 'function') {
      const b64 = await FileSystemLegacy.readAsStringAsync(uri, { encoding: 'base64' });
      if (b64 && b64.length > 0) {
        return base64ToArrayBuffer(b64.slice(0, 131072));
      }
    }
  } catch (e) {
    console.warn('[Picker] Legacy FileSystem read error:', e);
  }

  return null;
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

    // Step 1: Binary EXIF Parsing directly from image file bytes
    if (asset.uri) {
      try {
        console.log('[Picker] Reading binary file bytes from:', asset.uri);
        const buffer = await readImageFileBuffer(asset.uri);
        if (buffer && buffer.byteLength > 0) {
          console.log(`[Picker] Read ${buffer.byteLength} bytes from image header`);
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
        const buffer = await readImageFileBuffer(asset.uri);
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
