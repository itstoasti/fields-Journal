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
 */
async function reverseGeocode(latitude: number, longitude: number): Promise<{
  place: string;
  city: string;
  district: string;
  region: string;
  country: string;
}> {
  const empty = { place: '', city: '', district: '', region: '', country: '' };

  // 1. Native geocoder (on-device, zero latency)
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

  // 2. OpenStreetMap Nominatim (English, comprehensive)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'FieldNotesApp/1.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || '';
      const district = addr.quarter || addr.suburb || addr.neighbourhood || addr.borough || addr.attraction || '';
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
 * Generate 3 curated, evocative travel memory keywords.
 */
export function generateKeywords(
  geo: { city?: string; district?: string; region?: string; country?: string },
  month?: number,
  hour?: number,
): [string, string, string] {
  const city = (geo.city || '').toLowerCase();
  const district = (geo.district || '').toLowerCase();
  const region = (geo.region || '').toLowerCase();
  const country = (geo.country || '').toLowerCase();

  // === KEYWORD 1: Landmark / Specific Geographic Feature ===
  let kw1 = 'Expedition record';
  if (geo.district && !/^\d+$/.test(geo.district)) {
    kw1 = geo.district;
  } else if (geo.city) {
    kw1 = `${geo.city} passage`;
  } else if (geo.country) {
    kw1 = `${geo.country} trail`;
  }

  // === KEYWORD 2: Cinematic Atmosphere / Lighting / Season ===
  let kw2 = 'Golden hour haze';
  if (hour !== undefined) {
    if (hour >= 20 || hour < 5) {
      kw2 = 'Midnight blue';
    } else if (hour >= 5 && hour < 8) {
      kw2 = month && month >= 9 && month <= 11 ? 'Crisp autumn dawn' : 'Early sunrise';
    } else if (hour >= 8 && hour < 12) {
      kw2 = 'Morning light';
    } else if (hour >= 12 && hour < 17) {
      kw2 = month && month >= 6 && month <= 8 ? 'Midsummer haze' : 'Sunlit afternoon';
    } else if (hour >= 17 && hour < 20) {
      kw2 = month && month >= 9 && month <= 11 ? 'Autumn amber' : 'Twilight glow';
    }
  } else if (month !== undefined) {
    if (month >= 3 && month <= 5) kw2 = 'Spring blossom';
    else if (month >= 6 && month <= 8) kw2 = 'Midsummer warmth';
    else if (month >= 9 && month <= 11) kw2 = 'Autumn amber';
    else kw2 = 'Winter stillness';
  }

  // === KEYWORD 3: Tactile Regional Material & Sensory Texture ===
  let textures: string[] = [];

  // Greece / Mediterranean
  if (country.includes('greece') || city.includes('athens') || country.includes('cyprus')) {
    textures = ['Ancient marble', 'Aegean breeze', 'Olive grove', 'Parthenon crest', 'Moonlit stone', 'Temple column'];
    if (kw1 === 'Expedition record') kw1 = 'Acropolis ridge';
  }
  // Italy / Southern Europe
  else if (country.includes('italy') || country.includes('rome') || country.includes('florence') || country.includes('venice')) {
    textures = ['Cobblestone alley', 'Terracotta roof', 'Iron balcony', 'Tuscan cypress', 'Piazza shadow'];
  }
  // Japan / Korea / East Asia
  else if (country.includes('japan') || country.includes('korea') || country.includes('taiwan') || city.includes('tokyo') || city.includes('seoul')) {
    textures = ['Temple stone', 'Cedar incense', 'Paper lantern', 'Moss pathway', 'Rain-slicked neon', 'Roof tiles'];
  }
  // California / Ocean Coasts
  else if (city.includes('beach') || region.includes('california') || city.includes('coast') || city.includes('ocean')) {
    textures = ['Pacific swell', 'Coastal mist', 'Salt air', 'Highway 1 curve', 'Ocean horizon', 'Warm asphalt'];
  }
  // Desert / Mountains
  else if (region.includes('arizona') || region.includes('utah') || region.includes('nevada') || city.includes('sedona')) {
    textures = ['Red rock canyon', 'Desert cedar', 'Canyon wind', 'Sandstone cliff', 'Sagebrush'];
  }
  // Default Atmospheric Explorations
  else {
    textures = ['Weathered stone', 'Timberline pine', 'Distant ridge', 'Wild horizon', 'Shadowed pass', 'Mountain air'];
  }

  const seed = (city.length + district.length + (month || 1) + (hour || 12)) % textures.length;
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

  // === Date ===
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

  // === Location ===
  if (location && Math.abs(location.latitude) > 0.001 && Math.abs(location.longitude) > 0.001) {
    result.latitude = location.latitude;
    result.longitude = location.longitude;

    const geo = await reverseGeocode(location.latitude, location.longitude);
    if (geo.place) {
      result.place = geo.place;
    }
    result.keywords = generateKeywords(geo, dateInfo.month, dateInfo.hour);
  } else {
    console.log('[Metadata] No GPS coordinates — leaving location and keywords blank for user input.');
  }

  console.log('[Metadata] === FINAL OUTPUT ===');
  console.log('[Metadata] place:', result.place || 'NONE');
  console.log('[Metadata] year:', result.year || 'NONE');
  console.log('[Metadata] keywords:', result.keywords || 'NONE');

  return result;
}
