import { Buffer } from 'node:buffer';

export interface KeywordSuggestionOptions {
  imageBuffer: Buffer;
  mimeType: string;
  location?: string;
}

export interface KeywordSuggestionResult {
  success: boolean;
  keywords: string[];
  raw: string;
  source: string;
}

const TIMEOUT_MS = 8000;
const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

export async function suggestMemoryKeywords(
  options: KeywordSuggestionOptions
): Promise<KeywordSuggestionResult> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey && !geminiKey.startsWith('mock')) {
    for (const model of GEMINI_MODELS) {
      try {
        const result = await callGeminiVision(options, model, geminiKey);
        if (result && result.keywords.length >= 2) {
          return {
            success: true,
            keywords: result.keywords,
            raw: result.raw,
            source: model,
          };
        }
      } catch (err: any) {
        console.warn(`[Keywords] ${model} attempt failed: ${err.message}. Trying next model...`);
      }
    }
  }

  // Fallback: Smart semantic location fallback if Gemini is offline
  return generateSemanticLocationKeywords(options.location);
}

async function callGeminiVision(
  options: KeywordSuggestionOptions,
  model: string,
  apiKey: string
): Promise<{ keywords: string[]; raw: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const locContext = options.location && options.location.trim().length > 0
    ? ` The photo was taken at or near "${options.location.trim()}".`
    : '';

  const prompt = `Analyze this travel photo for a physical field journal notebook.${locContext}
List exactly 3 vivid, sensory memory keywords or short descriptive phrases that capture the atmosphere, textures, lighting, or landmarks in this image.
Example format:
crashing surf, golden hour glow, salty sea breeze

Output rules:
1. Exactly 3 items separated by commas.
2. No numbers, no dashes, no bullet points.
3. Output ONLY the 3 comma-separated items on a single line.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: options.mimeType || 'image/jpeg',
                    data: options.imageBuffer.toString('base64'),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1500,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!rawText) {
      return null;
    }

    // Clean and split by comma or newline
    const cleaned = rawText.replace(/[\n\r"*#]/g, ', ').trim();
    const parts = cleaned.split(',')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0 && !p.match(/^\d+$/));

    return {
      keywords: parts.slice(0, 3),
      raw: parts.slice(0, 3).join(', '),
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fallback generator when offline or API limit reached
 */
function generateSemanticLocationKeywords(location?: string): KeywordSuggestionResult {
  const loc = (location || '').toLowerCase();

  let keywords = ['warm ambient light', 'quiet horizon', 'memory in ink'];

  if (loc.includes('beach') || loc.includes('coast') || loc.includes('ocean') || loc.includes('surf')) {
    keywords = ['saltwater breeze', 'coastal tide', 'golden hour haze'];
  } else if (loc.includes('park') || loc.includes('mountain') || loc.includes('trail') || loc.includes('forest')) {
    keywords = ['pine scented air', 'granite ridge', 'whispering canopy'];
  } else if (loc.includes('tokyo') || loc.includes('kyoto') || loc.includes('japan')) {
    keywords = ['cedar temple gate', 'lantern light', 'autumn stone'];
  } else if (loc.includes('paris') || loc.includes('france') || loc.includes('rome') || loc.includes('italy')) {
    keywords = ['cobblestone alleys', 'morning espresso', 'carved limestone'];
  } else if (loc.includes('korea') || loc.includes('seoul')) {
    keywords = ['neon reflections', 'evening chill', 'distant bell'];
  }

  return {
    success: true,
    keywords,
    raw: keywords.join(', '),
    source: 'local-semantic-fallback',
  };
}
