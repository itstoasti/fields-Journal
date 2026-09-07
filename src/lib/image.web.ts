export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

/**
 * Loads an image from a URL, blob URL, or data URL, resizes it on an HTML5 canvas,
 * and extracts a high-quality JPEG base64 string.
 */
function processImageWithCanvas(
  sourceUri: string,
  maxDimension: number,
  quality: number
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve({
        uri: sourceUri,
        width: maxDimension,
        height: maxDimension,
        base64: '',
      });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.naturalWidth || img.width || 1600;
      let height = img.naturalHeight || img.height || 1200;

      // Scale down proportionally so longest edge <= maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      // Fill white background in case source has transparency
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        resolve({
          uri: dataUrl,
          width,
          height,
          base64,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      console.error('[Image Web] Failed to load image for canvas processing:', err);
      reject(new Error('Failed to load selected image into memory.'));
    };

    img.src = sourceUri;
  });
}

/**
 * Downscale image so the longest edge is at most 1800px with ~0.82 JPEG quality,
 * returning full base64 for AI poster generation.
 */
export async function preparePhotoForGeneration(sourceUri: string): Promise<ProcessedImage> {
  return processImageWithCanvas(sourceUri, 1800, 0.82);
}

/**
 * Fast lightweight thumbnail generator for Vision AI (512px, quality: 0.7)
 * returning base64 for keyword detection.
 */
export async function preparePhotoForVision(sourceUri: string): Promise<ProcessedImage> {
  return processImageWithCanvas(sourceUri, 512, 0.7);
}

/**
 * Save poster image locally in web context.
 */
export async function savePosterLocally(
  noteId: string,
  imageBase64OrUri: string
): Promise<string> {
  if (imageBase64OrUri.startsWith('http') || imageBase64OrUri.startsWith('data:') || imageBase64OrUri.startsWith('blob:')) {
    return imageBase64OrUri;
  }
  return `data:image/jpeg;base64,${imageBase64OrUri}`;
}

/**
 * Save poster image to device photo gallery or trigger native download.
 * On iOS Safari, leverages navigator.share if available to allow saving straight to Camera Roll.
 */
export async function saveToDeviceGallery(posterUri: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Check if native Web Share API with files is supported (e.g. iOS Safari)
    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      navigator.canShare
    ) {
      try {
        const res = await fetch(posterUri);
        const blob = await res.blob();
        const file = new File([blob], `field_note_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Field Note Poster',
          });
          return { success: true };
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return { success: true };
        }
        console.warn('[Image Web] Web share failed, falling back to download:', shareErr);
      }
    }

    // 2. Standard Web Download
    const a = document.createElement('a');
    a.href = posterUri;
    a.download = `field_note_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to download poster.' };
  }
}
