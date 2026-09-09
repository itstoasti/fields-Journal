import { parseJpegBinaryExif } from './exifReader';

export interface PickResult {
  canceled: boolean;
  uri?: string;
  fileName?: string;
  width?: number;
  height?: number;
  exif?: Record<string, any>;
  location?: { latitude: number; longitude: number };
  creationTime?: number;
}

function processWebFile(file: File): Promise<PickResult> {
  return new Promise(async (resolve) => {
    const url = URL.createObjectURL(file);
    let exif: Record<string, any> | undefined;
    let location: { latitude: number; longitude: number } | undefined;
    let creationTime: number | undefined;

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseJpegBinaryExif(buffer);

      if (parsed.latitude !== undefined && parsed.longitude !== undefined) {
        location = { latitude: parsed.latitude, longitude: parsed.longitude };
      }

      if (parsed.dateTime) {
        // e.g. "2023:08:15 14:30:00"
        const parts = parsed.dateTime.split(' ');
        if (parts.length >= 2) {
          const dateParts = parts[0].split(':');
          const timeParts = parts[1].split(':');
          if (dateParts.length === 3) {
            const d = new Date(
              parseInt(dateParts[0], 10),
              parseInt(dateParts[1], 10) - 1,
              parseInt(dateParts[2], 10),
              parseInt(timeParts[0] || '0', 10),
              parseInt(timeParts[1] || '0', 10)
            );
            if (!isNaN(d.getTime())) {
              creationTime = d.getTime();
            }
          }
        }
      }

      if (!creationTime && file.lastModified) {
        creationTime = file.lastModified;
      }

      exif = {
        DateTimeOriginal: parsed.dateTimeOriginal,
        DateTime: parsed.dateTime,
        GPSLatitude: parsed.latitude,
        GPSLongitude: parsed.longitude,
      };
    } catch (err) {
      console.warn('[Picker Web] EXIF parsing error:', err);
    }

    let width = 1600;
    let height = 1200;
    try {
      await new Promise<void>((dimResolve) => {
        const img = new Image();
        img.onload = () => {
          if (img.naturalWidth && img.naturalHeight) {
            width = img.naturalWidth;
            height = img.naturalHeight;
          }
          dimResolve();
        };
        img.onerror = () => dimResolve();
        img.src = url;
      });
    } catch {
      // ignore
    }

    resolve({
      canceled: false,
      uri: url,
      fileName: file.name,
      width,
      height,
      exif,
      location,
      creationTime: creationTime || file.lastModified,
    });
  });
}

export async function pickImageFromLibrary(): Promise<PickResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) {
        resolve({ canceled: true });
        return;
      }
      const res = await processWebFile(file);
      resolve(res);
    };
    input.click();
  });
}

export async function pickImageFromCamera(): Promise<PickResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) {
        resolve({ canceled: true });
        return;
      }
      const res = await processWebFile(file);
      resolve(res);
    };
    input.click();
  });
}
