import { Buffer } from 'node:buffer';

export interface GrokGenerationOptions {
  imageBuffer: Buffer;
  mimeType: string;
  prompt: string;
  model?: string;
  quality?: string;
}

export interface GrokGenerationResult {
  imageUrl?: string;
  imageBase64?: string;
  modelUsed: string;
}

const DEFAULT_MODEL = 'grok-imagine-image-2.0-2k-medium';
const TIMEOUT_MS = 60000;

export async function generateFieldNoteImage(options: GrokGenerationOptions): Promise<GrokGenerationResult> {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey || apiKey.startsWith('xai-your-api-key') || apiKey === 'mock') {
    console.warn('[Grok] No valid XAI_API_KEY configured. Generating mock 4:3 Field Note poster.');
    return generateMockPoster(options);
  }

  const requestedModel = options.model || DEFAULT_MODEL;
  return await executeXaiCall(options, requestedModel, apiKey);
}

async function executeXaiCall(
  options: GrokGenerationOptions,
  requestedModel: string,
  apiKey: string
): Promise<GrokGenerationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Parse exact model, resolution, and quality tier
  const isQualityModel = requestedModel.toLowerCase().includes('quality');
  const is1k = requestedModel.toLowerCase().includes('1k');
  const isLow = requestedModel.toLowerCase().includes('low') || options.quality === 'low';

  const actualModel = isQualityModel
    ? 'grok-imagine-image-quality'
    : 'grok-imagine-image-2.0';

  const resolution = is1k ? '1k' : '2k';
  const quality = isLow ? 'low' : 'medium';

  try {
    const base64Url = `data:${options.mimeType || 'image/jpeg'};base64,${options.imageBuffer.toString('base64')}`;

    console.log(`[Grok] Sending image edit request to xAI: model=${actualModel}, resolution=${resolution}, quality=${quality}...`);

    const response = await fetch('https://api.x.ai/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: {
          url: base64Url,
        },
        prompt: options.prompt,
        model: actualModel,
        aspect_ratio: '4:3',
        resolution,
        quality,
        response_format: 'b64_json',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`xAI API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const imageObj = data.data?.[0];

    if (!imageObj) {
      throw new Error('xAI returned an empty image list');
    }

    if (imageObj.b64_json) {
      return {
        imageBase64: imageObj.b64_json,
        modelUsed: `${actualModel} (${resolution} ${quality})`,
      };
    } else if (imageObj.url) {
      return {
        imageUrl: imageObj.url,
        modelUsed: `${actualModel} (${resolution} ${quality})`,
      };
    } else {
      throw new Error('No image URL or b64_json found in xAI response');
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('xAI generation timed out after 60 seconds');
    }
    throw error;
  }
}

/**
 * Mock generator for development and testing when xAI key is not present.
 */
function generateMockPoster(options: GrokGenerationOptions): GrokGenerationResult {
  return {
    imageBase64: options.imageBuffer.toString('base64'),
    modelUsed: 'mock-grok-imagine-2.0',
  };
}
