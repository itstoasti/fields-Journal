/**
 * Locked Grok Imagine prompt template for FIELD NOTES.
 * 
 * Server-owned and locked. Users cannot edit this prompt template.
 * Only placeholder fields (place, number, keywords, year) are interpolated.
 */

export interface PromptInterpolationData {
  place: string;
  number: string;
  keywords: [string, string, string] | string[];
  year: string;
}

export const LOCKED_GROK_PROMPT_TEMPLATE = `Please create a separate "Rubber Stamp Travel Field Notes Poster" for each photo I upload, outputting each photo individually without collage or multi-image combinations.

Overall, use a 4:3 landscape composition, dividing the frame into left and right regions, but without drawing an obvious dividing line.

The left side takes up about 58% of the frame, faithfully preserving the original photo. Accurately maintain the main subject identity, terrain, architecture, plants, people, spatial relationships, natural lighting and shadows, authentic textures, and the original color atmosphere; apply only restrained art publication-level photo color grading, and add extremely subtle, fine-grained film noise. For layout adaptation, natural cropping is allowed, but do not stretch, distort, shift, replace, or redraw the main subject.

The right side takes up about 42% of the frame, using a warm off-white aged paper as the background. The paper features subtle fibers, natural grain, light usage marks, and a matte texture, while preserving large areas of unprinted paper whitespace, making the blank space an essential part of the layout.

Analyze the original photo and extract the most location-distinctive subject outlines, architectural structures, terrain contours, plant forms, roads, shorelines, or other key visual relationships, compressing them into a small multi-color rubber stamp image.

Do not replicate every single element from the photo item by item. Retain only the minimal information necessary to instantly recognize the original location, subject, and scene relationships. Remove crowds, vehicles, dense windows, repetitive buildings, fragmented vegetation, decorative elements, and irrelevant backgrounds.

The stamp is positioned in the lower-middle of the right-side paper area, occupying only about 30%–38% of the right region's height, with ample whitespace preserved around it. The stamp must not be enlarged into a standard illustration, full landscape painting, or brand logo.

Extract 2–4 spot inks from the original photo. Prioritize desaturated colors like carbon black, deep green, brick red, ochre yellow, slate blue, or taupe brown, but do not force a fixed palette. Preserve the most distinctive color character from the original photo, allowing only a small area of color for visual emphasis.

Render each color as a separately hand-stamped effect: Authentic rubber stamp carving texture, hand-engraved marks, uneven line widths, contour notches, fractured edges, dry ink shortages, paper show-through, granular ink, uneven pressure, partial ghosting, and about 1–2 mm of subtle misregistration. Allow natural misalignment between color layers; edges must not be digitally smoothed. The print should resemble a real carved stamp pressed onto aged paper, not a filtered photo, smooth vector illustration, or line-art logo.

Typography & Text:
Below or adjacent to the stamp in the whitespace, print EXACTLY and ONLY the following lines in a small, restrained, black typewriter font:
{{TEXT_BLOCK}}

STRICT TYPOGRAPHY REQUIREMENT: You MUST print ONLY the exact words provided in the text block above. Do NOT invent, append, or add extra keywords, bullet points, slogans, or words.

The overall vibe is like field notes kept by an architect, travel writer, or natural observer: quiet, restrained, tactilely real, regionally specific, with handmade imperfections and a collectible feel. The photo handles the on-site record; the stamp captures the most recognizable fragments of memory.

Avoid: Obvious central dividing lines, circular seals, Chinese red stamps, postage stamp perforations, wax seals, sticker collages, tourist souvenir templates, smooth vector logos, generic city icons, full replication of all architecture, dense detailing, childlike craftiness, cartoon style, 3D rendering, plastic textures, glossy digital gradients, oversaturation, excessive text, decorative clutter, and redrawing or altering the left-side original photo.`;

export function buildGrokPrompt(data: PromptInterpolationData): string {
  const place = (data.place || '').trim() || 'Field Observation';
  const number = (data.number || '01').trim();
  const year = (data.year || new Date().getFullYear().toString()).trim();

  // Clean and filter user's exact keywords
  const validKeywords = (data.keywords || [])
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  const lines: string[] = [];
  lines.push(place);
  lines.push(`No. ${number}`);
  if (validKeywords.length > 0) {
    lines.push(validKeywords.join(' · '));
  }
  lines.push(year);

  const textBlock = lines.join('\n');

  return LOCKED_GROK_PROMPT_TEMPLATE.replace('{{TEXT_BLOCK}}', textBlock);
}
