/**
 * Pure binary EXIF parser for JPEG files on mobile.
 * Reads GPS coordinates (Latitude, Longitude) and DateTimeOriginal directly from JPEG binary bytes.
 */

export interface ParsedExif {
  latitude?: number;
  longitude?: number;
  dateTime?: string;
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  dateTimeModified?: string;
}

export function parseJpegBinaryExif(buffer: ArrayBuffer): ParsedExif {
  const result: ParsedExif = {};
  const view = new DataView(buffer);
  const maxLen = view.byteLength;

  if (maxLen < 12) {
    console.log('[ExifReader] Buffer too small:', maxLen);
    return result;
  }

  // Look for 0xFFE1 (APP1 Exif marker) anywhere in the buffer
  let app1Pos = -1;
  const searchLimit = Math.min(maxLen - 8, 131072);

  for (let i = 0; i < searchLimit; i++) {
    if (view.getUint8(i) === 0xff && view.getUint8(i + 1) === 0xe1) {
      const dataStart = i + 4;
      if (dataStart + 6 <= maxLen) {
        const isExif =
          view.getUint8(dataStart) === 0x45 && // E
          view.getUint8(dataStart + 1) === 0x78 && // x
          view.getUint8(dataStart + 2) === 0x69 && // i
          view.getUint8(dataStart + 3) === 0x66 && // f
          view.getUint8(dataStart + 4) === 0x00 &&
          view.getUint8(dataStart + 5) === 0x00;

        if (isExif) {
          app1Pos = i;
          console.log(`[ExifReader] Found valid APP1 Exif header at byte offset ${i}`);
          break;
        }
      }
    }
  }

  if (app1Pos === -1) {
    console.log('[ExifReader] No APP1 Exif marker found in file header.');
    return result;
  }

  try {
    const tiffStart = app1Pos + 10;
    parseTiffHeader(view, tiffStart, result);
    // Prioritize original photo capture date over modification date
    result.dateTime = result.dateTimeOriginal || result.dateTimeDigitized || result.dateTimeModified;
    console.log(`[ExifReader] ✅ Selected authoritative date: ${result.dateTime} (original: ${result.dateTimeOriginal}, digitized: ${result.dateTimeDigitized}, modified: ${result.dateTimeModified})`);
  } catch (e) {
    console.warn('[ExifReader] Error parsing TIFF header:', e);
  }

  return result;
}

function parseTiffHeader(view: DataView, tiffStart: number, result: ParsedExif): void {
  if (tiffStart + 8 > view.byteLength) return;

  const endian = view.getUint16(tiffStart);
  let littleEndian = false;

  if (endian === 0x4949) {
    littleEndian = true; // 'II' = Intel Little Endian
  } else if (endian === 0x4d4d) {
    littleEndian = false; // 'MM' = Motorola Big Endian
  } else {
    console.log(`[ExifReader] Unknown endian tag: 0x${endian.toString(16)}`);
    return;
  }

  const tag42 = view.getUint16(tiffStart + 2, littleEndian);
  if (tag42 !== 0x002a) {
    console.log(`[ExifReader] Invalid TIFF magic number: ${tag42}`);
    return;
  }

  const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
  console.log(`[ExifReader] TIFF endian: ${littleEndian ? 'Little' : 'Big'}, IFD0 offset: ${ifd0Offset}`);

  parseIfd(view, tiffStart, tiffStart + ifd0Offset, littleEndian, result, 0);
}

function parseIfd(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  result: ParsedExif,
  depth: number
): void {
  if (depth > 5 || ifdOffset + 2 > view.byteLength) return;

  const count = view.getUint16(ifdOffset, littleEndian);
  let entryOffset = ifdOffset + 2;

  let exifSubIfdOffset: number | null = null;
  let gpsIfdOffset: number | null = null;

  for (let i = 0; i < count; i++) {
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    const valueOffset = entryOffset + 8;

    // DateTime (0x0132) - File modification timestamp
    if (tag === 0x0132) {
      const strCount = view.getUint32(entryOffset + 4, littleEndian);
      result.dateTimeModified = readStringValue(view, tiffStart, valueOffset, strCount, littleEndian);
      console.log(`[ExifReader] Found IFD0 DateTime (modified): ${result.dateTimeModified}`);
    }
    // Exif Sub-IFD pointer (0x8769)
    else if (tag === 0x8769) {
      exifSubIfdOffset = view.getUint32(valueOffset, littleEndian);
    }
    // GPS IFD pointer (0x8825)
    else if (tag === 0x8825) {
      gpsIfdOffset = view.getUint32(valueOffset, littleEndian);
      console.log(`[ExifReader] Found GPS IFD pointer at offset: ${gpsIfdOffset}`);
    }

    entryOffset += 12;
  }

  if (gpsIfdOffset !== null) {
    parseGpsIfd(view, tiffStart, tiffStart + gpsIfdOffset, littleEndian, result);
  }

  if (exifSubIfdOffset !== null) {
    parseExifSubIfd(view, tiffStart, tiffStart + exifSubIfdOffset, littleEndian, result);
  }
}

function parseExifSubIfd(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  result: ParsedExif
): void {
  if (ifdOffset + 2 > view.byteLength) return;

  const count = view.getUint16(ifdOffset, littleEndian);
  let entryOffset = ifdOffset + 2;

  let nestedGpsOffset: number | null = null;

  for (let i = 0; i < count; i++) {
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    const valueOffset = entryOffset + 8;

    // DateTimeOriginal (0x9003) - True Camera Shutter Capture Time
    if (tag === 0x9003) {
      const strCount = view.getUint32(entryOffset + 4, littleEndian);
      result.dateTimeOriginal = readStringValue(view, tiffStart, valueOffset, strCount, littleEndian);
      console.log(`[ExifReader] Found DateTimeOriginal (0x9003): ${result.dateTimeOriginal}`);
    }
    // DateTimeDigitized (0x9004)
    else if (tag === 0x9004) {
      const strCount = view.getUint32(entryOffset + 4, littleEndian);
      result.dateTimeDigitized = readStringValue(view, tiffStart, valueOffset, strCount, littleEndian);
      console.log(`[ExifReader] Found DateTimeDigitized (0x9004): ${result.dateTimeDigitized}`);
    }
    // Nested GPS IFD pointer (0x8825)
    else if (tag === 0x8825) {
      nestedGpsOffset = view.getUint32(valueOffset, littleEndian);
      console.log(`[ExifReader] Found nested GPS IFD pointer in SubIFD at: ${nestedGpsOffset}`);
    }

    entryOffset += 12;
  }

  if (nestedGpsOffset !== null && (result.latitude === undefined || result.longitude === undefined)) {
    parseGpsIfd(view, tiffStart, tiffStart + nestedGpsOffset, littleEndian, result);
  }
}

function parseGpsIfd(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  result: ParsedExif
): void {
  if (ifdOffset + 2 > view.byteLength) {
    console.log(`[ExifReader] GPS IFD offset ${ifdOffset} exceeds buffer size ${view.byteLength}`);
    return;
  }

  const count = view.getUint16(ifdOffset, littleEndian);
  let entryOffset = ifdOffset + 2;

  let latRef = 'N';
  let lonRef = 'E';
  let latValues: number[] | null = null;
  let lonValues: number[] | null = null;

  for (let i = 0; i < count; i++) {
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    const valCount = view.getUint32(entryOffset + 4, littleEndian);
    const valueOffset = entryOffset + 8;

    // Tag 1: GPSLatitudeRef (0x0001)
    if (tag === 0x0001) {
      latRef = String.fromCharCode(view.getUint8(valueOffset));
    }
    // Tag 2: GPSLatitude (0x0002) - 3 Rationals
    else if (tag === 0x0002) {
      latValues = readRationals(view, tiffStart, valueOffset, valCount, littleEndian);
    }
    // Tag 3: GPSLongitudeRef (0x0003)
    if (tag === 0x0003) {
      lonRef = String.fromCharCode(view.getUint8(valueOffset));
    }
    // Tag 4: GPSLongitude (0x0004) - 3 Rationals
    else if (tag === 0x0004) {
      lonValues = readRationals(view, tiffStart, valueOffset, valCount, littleEndian);
    }

    entryOffset += 12;
  }

  if (latValues && latValues.length >= 3) {
    let lat = latValues[0] + latValues[1] / 60 + latValues[2] / 3600;
    if (latRef === 'S') lat = -Math.abs(lat);
    if (!isNaN(lat) && Math.abs(lat) > 0.0001) {
      result.latitude = lat;
    }
  }

  if (lonValues && lonValues.length >= 3) {
    let lon = lonValues[0] + lonValues[1] / 60 + lonValues[2] / 3600;
    if (lonRef === 'W') lon = -Math.abs(lon);
    if (!isNaN(lon) && Math.abs(lon) > 0.0001) {
      result.longitude = lon;
    }
  }

  console.log(`[ExifReader] GPS parsing result: lat=${result.latitude}, lon=${result.longitude}`);
}

function readStringValue(
  view: DataView,
  tiffStart: number,
  valueOffset: number,
  count: number,
  littleEndian: boolean
): string {
  let strOffset = valueOffset;
  if (count > 4) {
    strOffset = tiffStart + view.getUint32(valueOffset, littleEndian);
  }

  let s = '';
  for (let i = 0; i < count; i++) {
    if (strOffset + i >= view.byteLength) break;
    const code = view.getUint8(strOffset + i);
    if (code === 0) break;
    s += String.fromCharCode(code);
  }
  return s.trim();
}

function readRationals(
  view: DataView,
  tiffStart: number,
  valueOffset: number,
  count: number,
  littleEndian: boolean
): number[] {
  const actualOffset = tiffStart + view.getUint32(valueOffset, littleEndian);
  const values: number[] = [];

  for (let i = 0; i < count; i++) {
    const pos = actualOffset + i * 8;
    if (pos + 8 > view.byteLength) break;
    const numerator = view.getUint32(pos, littleEndian);
    const denominator = view.getUint32(pos + 4, littleEndian);
    values.push(denominator === 0 ? 0 : numerator / denominator);
  }

  return values;
}
