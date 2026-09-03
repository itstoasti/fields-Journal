import * as ImageManipulator from 'expo-image-manipulator';
import { Paths, Directory, File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

/**
 * Downscale image so the longest edge is between 1600-2048px with ~0.82 JPEG quality.
 */
export async function preparePhotoForGeneration(sourceUri: string): Promise<ProcessedImage> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      sourceUri,
      [
        {
          resize: {
            width: 1800,
          },
        },
      ],
      {
        compress: 0.82,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    return {
      uri: manipResult.uri,
      width: manipResult.width,
      height: manipResult.height,
      base64: manipResult.base64,
    };
  } catch (error) {
    console.warn('[Image] Downscale with base64 failed, trying direct manipulate:', error);
    const fallback = await ImageManipulator.manipulateAsync(
      sourceUri,
      [],
      {
        compress: 0.82,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    return {
      uri: fallback.uri,
      width: fallback.width,
      height: fallback.height,
      base64: fallback.base64,
    };
  }
}

/**
 * Fast lightweight thumbnail generator for Vision AI (512px, compress: 0.7).
 */
export async function preparePhotoForVision(sourceUri: string): Promise<ProcessedImage> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      sourceUri,
      [
        {
          resize: {
            width: 512,
          },
        },
      ],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    return {
      uri: manipResult.uri,
      width: manipResult.width,
      height: manipResult.height,
      base64: manipResult.base64,
    };
  } catch (error) {
    console.warn('[Image] Thumbnail creation failed, trying original without resize:', error);
    const fallback = await ImageManipulator.manipulateAsync(
      sourceUri,
      [],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    return {
      uri: fallback.uri,
      width: fallback.width,
      height: fallback.height,
      base64: fallback.base64,
    };
  }
}

/**
 * Base64 to Uint8Array decoder for writing binary files.
 */
function base64ToUint8Array(base64Str: string): Uint8Array {
  const binaryString = atob(base64Str);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Save poster image permanently in app documents directory using Expo SDK 54 File API.
 */
export async function savePosterLocally(
  noteId: string,
  imageBase64OrUri: string
): Promise<string> {
  const notesDir = new Directory(Paths.document, 'field_notes');
  if (!notesDir.exists) {
    notesDir.create({ intermediates: true, idempotent: true });
  }

  const targetFile = new File(notesDir, `poster_${noteId}.jpg`);

  if (imageBase64OrUri.startsWith('http://') || imageBase64OrUri.startsWith('https://')) {
    const downloaded = await File.downloadFileAsync(imageBase64OrUri, targetFile, { idempotent: true });
    return downloaded.uri;
  } else if (imageBase64OrUri.startsWith('file://')) {
    const sourceFile = new File(imageBase64OrUri);
    await sourceFile.copy(targetFile);
    return targetFile.uri;
  } else {
    // Clean base64 string
    const cleanBase64 = imageBase64OrUri.replace(/^data:image\/\w+;base64,/, '');
    const bytes = base64ToUint8Array(cleanBase64);
    targetFile.write(bytes);
    return targetFile.uri;
  }
}

/**
 * Save poster image to device photo gallery.
 */
export async function saveToDeviceGallery(posterUri: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, error: 'Photo library permission was not granted.' };
    }

    const asset = await MediaLibrary.createAssetAsync(posterUri);
    // Try to place into "Field Notes" album
    const album = await MediaLibrary.getAlbumAsync('Field Notes');
    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      await MediaLibrary.createAlbumAsync('Field Notes', asset, false);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Gallery] Save to gallery error:', err);
    return { success: false, error: err.message || 'Failed to save to gallery.' };
  }
}
