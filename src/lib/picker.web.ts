export interface PickResult {
  canceled: boolean;
  uri?: string;
  fileName?: string;
  width?: number;
  height?: number;
  exif?: Record<string, any>;
}

export async function pickImageFromLibrary(): Promise<PickResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) {
        resolve({ canceled: true });
        return;
      }
      const url = URL.createObjectURL(file);
      resolve({
        canceled: false,
        uri: url,
        width: 1600,
        height: 1200,
      });
    };
    input.click();
  });
}

export async function pickImageFromCamera(): Promise<PickResult> {
  return pickImageFromLibrary();
}
