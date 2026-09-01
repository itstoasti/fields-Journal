/**
 * Pure binary EXIF parser for JPEG files.
 * Extracts GPS coordinates (Latitude, Longitude) and DateTimeOriginal directly from JPEG binary bytes.
 */

export interface ParsedExif {
  latitude?: number;
  longitude?: number;
  dateTime?: string;
}

export function parseJpegBinaryExif(buffer: ArrayBuffer): ParsedExif {
  const result: ParsedExif = {};
  const view = new DataView(buffer);

  try {
    // Verify JPEG SOI (0xFFD8)
    if (view.getUint16(0) !== 0xffd8) {
      return result;
    }

    let offset = 2;
    const maxLen = view.byteLength;

    while (offset < maxLen - 4) {
      const marker = view.getUint16(offset);
      offset += 2;

      // APP1 Marker for EXIF is 0xFFE1
      if (marker === 0xffe1) {
        const segLen = view.getUint16(offset);
        const app1Start = offset + 2;

        // Check for 'Exif\0\0' header (0x45786966 0x0000)
        if (
          view.getUint32(app1Start) === 0x45786966 &&
          view.getUint16(app1Start + 4) === 0x0000
        ) {
          const tiffStart = app1Start + 6;
          parseTiffHeader(view, tiffStart, result);
        }
        break;
      } else if ((marker & 0xff00) === 0xff00 && marker !== 0xffd8 && marker !== 0xffd9) {
        // Skip other JPEG segment
        const segLen = view.getUint16(offset);
        offset += segLen;
      } else {
        break;
      }
    }
  } catch (e) {
    console.warn('[ExifReader] Binary parsing error (non-fatal):', e);
  }

  return result;
}

function parseTiffHeader(view: DataView, tiffStart: number, result: ParsedExif): void {
  const endian = view.getUint16(tiffStart);
  let littleEndian = false;

  if (endian === 0x4949) {
    // 'II' = Intel Little Endian
    littleEndian = true;
  } else if (endian === 0x4d4d) {
    // 'MM' = Motorola Big Endian
    littleEndian = false;
  } else {
    return;
  }

  // Tag 0x002A (42)
  if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002a) {
    return;
  }

  const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
  if (ifd0Offset < 8) return;

  parseIfd0(view, tiffStart, tiffStart + ifd0Offset, littleEndian, result);
}

function parseIfd0(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  result: ParsedExif
): void {
  if (ifdOffset >= view.byteLength - 2) return;

  const count = view.getUint16(ifdOffset, littleEndian);
  let entryOffset = ifdOffset + 2;

  let exifSubIfdOffset: number | null = null;
  let gpsIfdOffset: number | null = null;

  for (let i = 0; i < count; i++) {
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    const valueOffset = entryOffset + 8;

    // DateTime (0x0132)
    if (tag === 0x0132 && !result.dateTime) {
      const strCount = view.getUint32(entryOffset + 4, littleEndian);
      result.dateTime = readStringValue(view, tiffStart, valueOffset, strCount, littleEndian);
    }
    // Exif Sub-IFD pointer (0x8769)
    else if (tag === 0x8769) {
      exifSubIfdOffset = view.getUint32(valueOffset, littleEndian);
    }
    // GPS IFD pointer (0x8825)
    else if (tag === 0x8825) {
      gpsIfdOffset = view.getUint32(valueOffset, littleEndian);
    }

    entryOffset += 12;
  }

  if (exifSubIfdOffset !== null) {
    parseExifSubIfd(view, tiffStart, tiffStart + exifSubIfdOffset, littleEndian, result);
  }

  if (gpsIfdOffset !== null) {
    parseGpsIfd(view, tiffStart, tiffStart + gpsIfdOffset, littleEndian, result);
  }
}

function parseExifSubIfd(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  result: ParsedExif
): void {
  if (ifdOffset >= view.byteLength - 2) return;

  const count = view.getUint16(ifdOffset, littleEndian);
  let entryOffset = ifdOffset + 2;

  for (let i = 0; i < count; i++) {
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    const valueOffset = entryOffset + 8;

    // DateTimeOriginal (0x9003) or DateTimeDigitized (0x9004)
    if ((tag === 0x9003 || tag === 0x9004) && !result.dateTime) {
      const strCount = view.getUint32(entryOffset + 4, littleEndian);
      result.dateTime = readStringValue(view, tiffStart, valueOffset, strCount, littleEndian);
    }

    entryOffset += 12;
  }
}

function parseGpsIfd(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  result: ParsedExif
): void {
  if (ifdOffset >= view.byteLength - 2) return;

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

    // Tag 1: GPSLatitudeRef
    if (tag === 0x0001) {
      latRef = String.fromCharCode(view.getUint8(valueOffset));
    }
    // Tag 2: GPSLatitude (3 Rationals)
    else if (tag === 0x0002) {
      latValues = readRationals(view, tiffStart, valueOffset, valCount, littleEndian);
    }
    // Tag 3: GPSLongitudeRef
    if (tag === 0x0003) {
      lonRef = String.fromCharCode(view.getUint8(valueOffset));
    }
    // Tag 4: GPSLongitude (3 Rationals)
    else if (tag === 0x0004) {
      lonValues = readRationals(view, tiffStart, valueOffset, valCount, littleEndian);
    }

    entryOffset += 12;
  }

  if (latValues && latValues.length >= 3) {
    let lat = latValues[0] + latValues[1] / 60 + latValues[2] / 3600;
    if (latRef === 'S') lat = -lat;
    if (!isNaN(lat) && Math.abs(lat) > 0.0001) {
      result.latitude = lat;
    }
  }

  if (lonValues && lonValues.length >= 3) {
    let lon = lonValues[0] + lonValues[1] / 60 + lonValues[2] / 3600;
    if (lonRef === 'W') lon = -lon;
    if (!isNaN(lon) && Math.abs(lon) > 0.0001) {
      result.longitude = lon;
    }
  }
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
