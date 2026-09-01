import { Buffer } from 'node:buffer';

export interface GrokGenerationOptions {
  imageBuffer: Buffer;
  mimeType: string;
  prompt: string;
  model?: string;
}

export interface GrokGenerationResult {
  imageUrl?: string;
  imageBase64?: string;
  modelUsed: string;
}

const DEFAULT_MODEL = process.env.XAI_IMAGE_MODEL || 'grok-imagine-image-2.0';
const FALLBACK_MODEL = 'grok-imagine-image';
const TIMEOUT_MS = 60000;

export async function generateFieldNoteImage(options: GrokGenerationOptions): Promise<GrokGenerationResult> {
  const apiKey = process.env.XAI_API_KEY;

  // Fallback to mock generation if no xAI key is provided in development
  if (!apiKey || apiKey.startsWith('xai-your-api-key') || apiKey === 'mock') {
    console.warn('[Grok] No valid XAI_API_KEY configured. Generating mock 4:3 Field Note poster.');
    return generateMockPoster(options);
  }

  const primaryModel = options.model || DEFAULT_MODEL;

  // First try with primaryModel, then 1 retry with FALLBACK_MODEL if 5xx/empty
  try {
    return await executeXaiCall(options, primaryModel, apiKey);
  } catch (err: any) {
    console.warn(`[Grok] Primary model ${primaryModel} failed: ${err.message}. Retrying once with ${FALLBACK_MODEL}...`);
    try {
      return await executeXaiCall(options, FALLBACK_MODEL, apiKey);
    } catch (retryErr: any) {
      console.error(`[Grok] Retry failed: ${retryErr.message}`);
      throw new Error(`Failed to generate field note poster: ${retryErr.message}`);
    }
  }
}

async function executeXaiCall(
  options: GrokGenerationOptions,
  model: string,
  apiKey: string
): Promise<GrokGenerationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const base64Url = `data:${options.mimeType || 'image/jpeg'};base64,${options.imageBuffer.toString('base64')}`;

    console.log(`[Grok] Sending image edit request to xAI using model ${model}...`);

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
        model,
        aspect_ratio: '4:3',
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
        modelUsed: model,
      };
    } else if (imageObj.url) {
      return {
        imageUrl: imageObj.url,
        modelUsed: model,
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
 * Returns base64 mock image of the uploaded photo.
 */
function generateMockPoster(options: GrokGenerationOptions): GrokGenerationResult {
  return {
    imageBase64: options.imageBuffer.toString('base64'),
    modelUsed: 'mock-grok-imagine-2.0',
  };
}
