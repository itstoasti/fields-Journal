import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface PhotoExtractedMetadata {
  year?: string;
  place?: string;
  keywords?: [string, string, string];
  latitude?: number;
  longitude?: number;
}

/**
 * Reverse geocode coordinates to a clean English place name.
 * Uses expo-location native geocoder first, then OSM Nominatim as fallback.
 * Both are 100% free.
 */
async function reverseGeocode(latitude: number, longitude: number): Promise<{
  place: string;
  city: string;
  district: string;
  region: string;
  country: string;
}> {
  const empty = { place: '', city: '', district: '', region: '', country: '' };

  // 1. Native geocoder (on-device, no API key)
  if (Platform.OS !== 'web') {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (results && results.length > 0) {
          const item = results[0];
          const city = item.city || item.subregion || '';
          const district = item.district || item.name || '';
          const region = item.region || '';
          const country = item.country || '';

          const place = formatPlace(city, district, region, country);
          if (place) {
            console.log(`[Metadata] ✅ Native geocode → ${place}`);
            return { place, city, district, region, country };
          }
        }
      }
    } catch (err) {
      console.warn('[Metadata] Native geocode failed:', err);
    }
  }

  // 2. OpenStreetMap Nominatim (free, no key, English)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'FieldNotesApp/1.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || '';
      const district = addr.quarter || addr.suburb || addr.neighbourhood || addr.borough || '';
      const region = addr.state || addr.region || addr.province || '';
      const country = addr.country || '';

      const place = formatPlace(city, district, region, country);
      if (place) {
        console.log(`[Metadata] ✅ OSM geocode → ${place}`);
        return { place, city, district, region, country };
      }
    }
  } catch (e) {
    console.warn('[Metadata] OSM geocode failed:', e);
  }

  return empty;
}

function formatPlace(city: string, district: string, region: string, country: string): string {
  const isNorthAmerica = country === 'United States' || country === 'Canada' || country === 'US' || country === 'CA';

  if (isNorthAmerica && city && region) {
    return `${city}, ${region}`;
  }
  if (district && city && district !== city && !/^\d+$/.test(district)) {
    return `${district}, ${city}`;
  }
  if (city && country) {
    return `${city}, ${country}`;
  }
  return city || district || region || country || '';
}

/**
 * Generate 3 contextual keywords from geography and time.
 */
function generateKeywords(
  geo: { city: string; district: string; region: string; country: string },
  month?: number,
  hour?: number,
): [string, string, string] {
  const kw1 = geo.district || geo.city || geo.country || 'Field observation';

  let kw2 = 'Afternoon light';
  if (month !== undefined) {
    const seasons: Record<string, string[]> = {
      morning: ['Spring dawn', 'Summer sunrise', 'Autumn morning', 'Winter dawn'],
      day: ['Spring bloom', 'Summer haze', 'Autumn amber', 'Winter frost'],
      evening: ['Spring twilight', 'Summer dusk', 'Autumn glow', 'Winter twilight'],
    };
    const seasonIdx = month >= 3 && month <= 5 ? 0 : month >= 6 && month <= 8 ? 1 : month >= 9 && month <= 11 ? 2 : 3;
    const timeKey = hour !== undefined ? (hour < 10 ? 'morning' : hour < 17 ? 'day' : 'evening') : 'day';
    kw2 = seasons[timeKey][seasonIdx];
  } else if (hour !== undefined) {
    if (hour < 7) kw2 = 'Early dawn';
    else if (hour < 10) kw2 = 'Morning light';
    else if (hour < 16) kw2 = 'Midday sun';
    else if (hour < 19) kw2 = 'Golden hour';
    else kw2 = 'Evening dusk';
  }

  const cityLower = (geo.city || '').toLowerCase();
  const regionLower = (geo.region || '').toLowerCase();
  const countryLower = (geo.country || '').toLowerCase();

  let textures: string[];
  if (cityLower.includes('beach') || regionLower.includes('california') || cityLower.includes('coast') || cityLower.includes('bay')) {
    textures = ['Coastal breeze', 'Salt air', 'Shore light', 'Ocean horizon', 'Tide line'];
  } else if (countryLower.includes('japan') || countryLower.includes('korea') || countryLower.includes('china') || countryLower.includes('taiwan')) {
    textures = ['Temple stone', 'Paper lantern', 'Roof tiles', 'Garden moss', 'Quiet alley'];
  } else if (countryLower.includes('italy') || countryLower.includes('france') || countryLower.includes('spain') || countryLower.includes('greece')) {
    textures = ['Cobblestone', 'Terra cotta', 'Iron balcony', 'Olive shade', 'Plaster wall'];
  } else {
    textures = ['Weathered wood', 'Stone pathway', 'Distant ridge', 'Shadow pattern', 'Old brickwork'];
  }

  const seed = ((geo.city || '').length + (month || 0) + (hour || 0)) % textures.length;
  const kw3 = textures[seed];

  return [kw1, kw2, kw3];
}

/**
 * Parse date from various formats. Returns { year, month, hour }.
 */
function parseDateDetails(raw: any): { year?: string; month?: number; hour?: number } {
  if (!raw) return {};

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return { year: raw.getFullYear().toString(), month: raw.getMonth() + 1, hour: raw.getHours() };
  }

  if (typeof raw === 'number' && raw > 0) {
    // Could be epoch ms or epoch seconds
    const ms = raw < 10000000000 ? raw * 1000 : raw;
    const d = new Date(ms);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1990) {
      return { year: d.getFullYear().toString(), month: d.getMonth() + 1, hour: d.getHours() };
    }
  }

  const str = String(raw).trim();
  const exifMatch = str.match(/^(\d{4})[:\-\/](\d{1,2})[:\-\/](\d{1,2})[ T](\d{1,2}):(\d{1,2})/);
  if (exifMatch) {
    return {
      year: exifMatch[1],
      month: parseInt(exifMatch[2], 10),
      hour: parseInt(exifMatch[4], 10),
    };
  }

  const yearMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) return { year: yearMatch[1] };

  return {};
}

/**
 * Try to find a date in EXIF data by checking every known key.
 */
function extractDateFromExif(exif: Record<string, any>): { year?: string; month?: number; hour?: number } {
  const candidates = [
    exif.DateTimeOriginal,
    exif.DateTimeDigitized,
    exif.DateTime,
    exif.CreateDate,
    exif.DateCreated,
    exif['{Exif}']?.DateTimeOriginal,
    exif['{Exif}']?.DateTimeDigitized,
    exif['{TIFF}']?.DateTime,
    exif['{TIFF}']?.DateCreated,
  ];

  for (const candidate of candidates) {
    const result = parseDateDetails(candidate);
    if (result.year) return result;
  }
  return {};
}

/**
 * Main: Extract metadata from a picked photo.
 */
export async function extractPhotoMetadata(options: {
  uri?: string;
  exif?: Record<string, any>;
  location?: { latitude: number; longitude: number };
  creationTime?: number;
}): Promise<PhotoExtractedMetadata> {
  const { exif = {}, location, creationTime } = options;
  const result: PhotoExtractedMetadata = {};

  console.log('[Metadata] Input - location:', location, 'creationTime:', creationTime);

  // === Date: try creationTime first, then dig through EXIF ===
  let dateInfo: { year?: string; month?: number; hour?: number } = {};

  if (creationTime && creationTime > 0) {
    dateInfo = parseDateDetails(creationTime);
    console.log('[Metadata] Date from creationTime:', dateInfo);
  }

  if (!dateInfo.year && exif) {
    dateInfo = extractDateFromExif(exif);
    console.log('[Metadata] Date from EXIF fallback:', dateInfo);
  }

  if (dateInfo.year) {
    result.year = dateInfo.year;
  }

  // === Location: reverse geocode if available ===
  if (location && Math.abs(location.latitude) > 0.001 && Math.abs(location.longitude) > 0.001) {
    result.latitude = location.latitude;
    result.longitude = location.longitude;

    const geo = await reverseGeocode(location.latitude, location.longitude);
    if (geo.place) {
      result.place = geo.place;
    }
    result.keywords = generateKeywords(geo, dateInfo.month, dateInfo.hour);
  } else {
    console.log('[Metadata] No GPS coordinates — location will be blank for user to fill in.');
    if (dateInfo.year) {
      result.keywords = generateKeywords(
        { city: '', district: '', region: '', country: '' },
        dateInfo.month,
        dateInfo.hour,
      );
    }
  }

  console.log('[Metadata] === FINAL OUTPUT ===');
  console.log('[Metadata] place:', result.place || 'NONE');
  console.log('[Metadata] year:', result.year || 'NONE');
  console.log('[Metadata] keywords:', result.keywords || 'NONE');

  return result;
}
