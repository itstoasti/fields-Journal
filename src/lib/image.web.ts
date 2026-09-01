export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

export async function preparePhotoForGeneration(sourceUri: string): Promise<ProcessedImage> {
  return {
    uri: sourceUri,
    width: 1600,
    height: 1200,
    base64: '',
  };
}

export async function savePosterLocally(
  noteId: string,
  imageBase64OrUri: string
): Promise<string> {
  return imageBase64OrUri;
}

export async function saveToDeviceGallery(posterUri: string): Promise<{ success: boolean; error?: string }> {
  try {
    const a = document.createElement('a');
    a.href = posterUri;
    a.download = `field_note_${Date.now()}.jpg`;
    a.click();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to download image.' };
  }
}
