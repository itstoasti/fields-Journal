import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

export interface PickResult {
  canceled: boolean;
  uri?: string;
  width?: number;
  height?: number;
  exif?: Record<string, any>;
  location?: { latitude: number; longitude: number };
  creationTime?: number;
  /** True when we couldn't read any metadata (Expo Go Android limitation) */
  metadataUnavailable?: boolean;
}

/**
 * Extract GPS from EXIF — handles every Android/iOS nesting format.
 */
function extractGpsFromExif(exif: Record<string, any>): { latitude: number; longitude: number } | null {
  if (typeof exif.GPSLatitude === 'number' && typeof exif.GPSLongitude === 'number') {
    let lat = exif.GPSLatitude;
    let lon = exif.GPSLongitude;
    if (exif.GPSLatitudeRef === 'S') lat = -Math.abs(lat);
    if (exif.GPSLongitudeRef === 'W') lon = -Math.abs(lon);
    if (Math.abs(lat) > 0.001 && Math.abs(lon) > 0.001) return { latitude: lat, longitude: lon };
  }

  for (const gpsKey of ['{GPS}', 'GPS', 'gps', 'GPSInfo']) {
    const gps = exif[gpsKey];
    if (gps && typeof gps === 'object') {
      let lat: number | null = null;
      let lon: number | null = null;
      let latRef = 'N';
      let lonRef = 'E';
      for (const k of ['Latitude', 'latitude', 'GPSLatitude']) { if (gps[k] !== undefined) { lat = Number(gps[k]); break; } }
      for (const k of ['Longitude', 'longitude', 'GPSLongitude']) { if (gps[k] !== undefined) { lon = Number(gps[k]); break; } }
      for (const k of ['LatitudeRef', 'GPSLatitudeRef']) { if (gps[k]) { latRef = String(gps[k]); break; } }
      for (const k of ['LongitudeRef', 'GPSLongitudeRef']) { if (gps[k]) { lonRef = String(gps[k]); break; } }
      if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon) && Math.abs(lat) > 0.001 && Math.abs(lon) > 0.001) {
        if (latRef === 'S') lat = -Math.abs(lat);
        if (lonRef === 'W') lon = -Math.abs(lon);
        return { latitude: lat, longitude: lon };
      }
    }
  }

  for (const key of Object.keys(exif)) {
    const val = exif[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const lat = Number(val.Latitude ?? val.latitude ?? val.GPSLatitude);
      const lon = Number(val.Longitude ?? val.longitude ?? val.GPSLongitude);
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) > 0.001 && Math.abs(lon) > 0.001) {
        return { latitude: lat, longitude: lon };
      }
    }
  }
  return null;
}

/**
 * Extract creation timestamp from EXIF. Returns epoch ms.
 */
function extractDateFromExif(exif: Record<string, any>): number | undefined {
  const candidates: any[] = [
    exif.DateTimeOriginal, exif.DateTimeDigitized, exif.DateTime,
    exif.CreateDate, exif.DateCreated,
    exif['{Exif}']?.DateTimeOriginal, exif['{Exif}']?.DateTimeDigitized,
    exif['{TIFF}']?.DateTime, exif['{TIFF}']?.DateCreated,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    if (raw instanceof Date && !isNaN(raw.getTime())) return raw.getTime();
    if (typeof raw === 'number' && raw > 0) return raw < 10000000000 ? raw * 1000 : raw;
    const str = String(raw).trim();
    const m = str.match(/^(\d{4})[:\-\/](\d{1,2})[:\-\/](\d{1,2})[ T](\d{1,2}):(\d{1,2}):?(\d{1,2})?/);
    if (m) {
      const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), parseInt(m[4]), parseInt(m[5]), parseInt(m[6] || '0'));
      if (!isNaN(d.getTime())) return d.getTime();
    }
    const iso = new Date(str);
    if (!isNaN(iso.getTime()) && iso.getFullYear() > 1990) return iso.getTime();
  }
  return undefined;
}

/**
 * When assetId is null (Expo Go), try calling MediaLibrary directly
 * without permission check — the system photo picker may grant implicit access.
 */
async function tryMediaLibrarySearch(
  width: number,
  height: number,
  fileName?: string | null,
): Promise<{
  location?: { latitude: number; longitude: number };
  creationTime?: number;
  exif?: Record<string, any>;
} | null> {
  // Try without permission check first — catch and move on if blocked
  try {
    const assets = await MediaLibrary.getAssetsAsync({
      first: 50,
      sortBy: [MediaLibrary.SortBy.modificationTime],
      mediaType: MediaLibrary.MediaType.photo,
    });

    console.log(`[Picker] MediaLibrary returned ${assets.assets.length} assets (no permission check)`);

    let bestMatch: MediaLibrary.Asset | null = null;

    for (const asset of assets.assets) {
      if (fileName && asset.filename === fileName) {
        bestMatch = asset;
        console.log(`[Picker] ✅ Filename match: ${asset.filename}`);
        break;
      }
      if ((asset.width === width && asset.height === height) ||
          (asset.width === height && asset.height === width)) {
        if (!bestMatch) {
          bestMatch = asset;
          console.log(`[Picker] ✅ Dimension match: ${asset.filename} (${asset.width}x${asset.height})`);
        }
      }
    }

    if (!bestMatch) {
      console.log('[Picker] ❌ No matching asset found');
      return null;
    }

    const info = await MediaLibrary.getAssetInfoAsync(bestMatch.id);
    console.log('[Picker] Matched asset info:', JSON.stringify({
      filename: bestMatch.filename,
      location: info?.location,
      creationTime: info?.creationTime,
      exifKeys: info?.exif ? Object.keys(info.exif) : 'none',
    }));

    if (info) {
      let location: { latitude: number; longitude: number } | undefined;
      let creationTime: number | undefined;

      if (info.location && Math.abs(info.location.latitude) > 0.001) {
        location = info.location;
      }
      if (info.creationTime) creationTime = info.creationTime;

      const exif = info.exif || {};
      if (!location) {
        const gps = extractGpsFromExif(exif);
        if (gps) location = gps;
      }
      if (!creationTime) {
        const date = extractDateFromExif(exif);
        if (date) creationTime = date;
      }
      if (!creationTime && bestMatch.creationTime) {
        creationTime = new Date(bestMatch.creationTime).getTime();
      }

      return { location, creationTime, exif };
    }
  } catch (e) {
    console.log('[Picker] MediaLibrary direct access failed:', e);
  }

  // If direct access failed, try requesting permission explicitly
  try {
    const { status, accessPrivileges } = await MediaLibrary.requestPermissionsAsync();
    console.log(`[Picker] MediaLibrary permission: status=${status}, privileges=${accessPrivileges}`);

    if (status === 'granted' || accessPrivileges === 'limited') {
      const assets = await MediaLibrary.getAssetsAsync({
        first: 50,
        sortBy: [MediaLibrary.SortBy.modificationTime],
        mediaType: MediaLibrary.MediaType.photo,
      });

      console.log(`[Picker] MediaLibrary (after permission) returned ${assets.assets.length} assets`);

      for (const asset of assets.assets) {
        const dimMatch = (asset.width === width && asset.height === height) ||
                         (asset.width === height && asset.height === width);
        const nameMatch = fileName && asset.filename === fileName;

        if (nameMatch || dimMatch) {
          console.log(`[Picker] ✅ Match after permission: ${asset.filename}`);
          const info = await MediaLibrary.getAssetInfoAsync(asset.id);
          if (info) {
            let location: { latitude: number; longitude: number } | undefined;
            let creationTime: number | undefined;

            if (info.location && Math.abs(info.location.latitude) > 0.001) location = info.location;
            if (info.creationTime) creationTime = info.creationTime;
            if (!creationTime && asset.creationTime) creationTime = new Date(asset.creationTime).getTime();

            return { location, creationTime, exif: info.exif || {} };
          }
        }
      }
    }
  } catch (e2) {
    console.log('[Picker] MediaLibrary permission request also failed:', e2);
  }

  return null;
}

export async function pickImageFromLibrary(): Promise<PickResult> {
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
    let metadataUnavailable = false;

    console.log('========== PHOTO PICKER DEBUG ==========');
    console.log('[Picker] assetId:', asset.assetId);
    console.log('[Picker] fileName:', asset.fileName);
    console.log('[Picker] dimensions:', asset.width, 'x', asset.height);
    console.log('[Picker] EXIF keys:', Object.keys(exif));

    // === Source 1: Direct EXIF from picker ===
    const exifGps = extractGpsFromExif(exif);
    if (exifGps) {
      location = exifGps;
      console.log('[Picker] ✅ GPS from picker EXIF');
    }
    const exifDate = extractDateFromExif(exif);
    if (exifDate) {
      creationTime = exifDate;
      console.log('[Picker] ✅ Date from picker EXIF:', new Date(exifDate).toISOString());
    }

    // === Source 2: MediaLibrary via assetId ===
    if (asset.assetId) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset.assetId);
        if (info) {
          if (!location && info.location && Math.abs(info.location.latitude) > 0.001) {
            location = info.location;
            console.log('[Picker] ✅ GPS from MediaLibrary assetId');
          }
          if (!creationTime && info.creationTime) {
            creationTime = info.creationTime;
            console.log('[Picker] ✅ Date from MediaLibrary assetId');
          }
          if (info.exif) exif = { ...exif, ...info.exif };
        }
      } catch (e) {
        console.log('[Picker] MediaLibrary assetId failed:', e);
      }
    }

    // === Source 3: MediaLibrary search workaround (Expo Go) ===
    if (!location || !creationTime) {
      console.log('[Picker] Trying MediaLibrary search workaround...');
      const found = await tryMediaLibrarySearch(asset.width, asset.height, asset.fileName);
      if (found) {
        if (!location && found.location) {
          location = found.location;
          console.log('[Picker] ✅ GPS from search workaround');
        }
        if (!creationTime && found.creationTime) {
          creationTime = found.creationTime;
          console.log('[Picker] ✅ Date from search workaround');
        }
        if (found.exif) exif = { ...exif, ...found.exif };
      }
    }

    // If we still have nothing, flag it
    if (!location && !creationTime) {
      metadataUnavailable = true;
      console.log('[Picker] ⚠️ No metadata recovered — Expo Go Android limitation');
    }

    console.log('[Picker] === FINAL ===');
    console.log('[Picker] Location:', location ? `${location.latitude}, ${location.longitude}` : 'NONE');
    console.log('[Picker] CreationTime:', creationTime ? new Date(creationTime).toISOString() : 'NONE');
    console.log('=========================================');

    return {
      canceled: false,
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      exif,
      location,
      creationTime,
      metadataUnavailable,
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

    const exifGps = extractGpsFromExif(exif);
    if (exifGps) location = exifGps;
    const exifDate = extractDateFromExif(exif);
    if (exifDate) creationTime = exifDate;

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
