import { Buffer } from 'node:buffer';
import { GrokGenerationOptions, GrokGenerationResult } from './grok.js';

const TIMEOUT_MS = 60000;

export async function generateGeminiImage(options: GrokGenerationOptions): Promise<GrokGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'mock') {
    throw new Error('No GEMINI_API_KEY configured on server.');
  }

  const model = options.model || 'gemini-3.1-flash-image';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const base64Data = options.imageBuffer.toString('base64');
    const mimeType = options.mimeType || 'image/jpeg';

    console.log(`[Gemini] Sending image request to Google Generative AI using model: ${model}...`);

    // Call Google Generative Language API
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: options.prompt,
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: '4:3',
          },
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const part = candidate?.content?.parts?.find((p: any) => p.inline_data || p.inlineData);

    const inlineData = part?.inline_data || part?.inlineData;

    if (inlineData?.data) {
      return {
        imageBase64: inlineData.data,
        modelUsed: model,
      };
    }

    // Check if URL returned or text description
    const textPart = candidate?.content?.parts?.find((p: any) => p.text)?.text;
    if (textPart) {
      throw new Error(`Gemini returned text instead of image: ${textPart.slice(0, 100)}`);
    }

    throw new Error('No image returned from Gemini API response');
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Gemini generation timed out after 60 seconds');
    }
    throw error;
  }
}
