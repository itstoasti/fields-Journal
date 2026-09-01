import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/deanfieldz/.gemini/antigravity/brain/7e424507-d11b-4a16-a840-4b7bea0592c2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const icons = [
  {
    id: 'icon_vibrant_1_klein_blue',
    title: 'Option A: International Klein Blue Stamp',
    category: 'Vibrant Monochromatic',
    html: `
      <div style="width:1024px; height:1024px; background: #0047FF; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; border-radius:220px; font-family:'Courier New', monospace;">
        <!-- Subtle paper/grain noise overlay -->
        <div style="position:absolute; inset:0; opacity:0.08; background: radial-gradient(#fff 1px, transparent 1px); background-size: 8px 8px;"></div>
        
        <!-- Central Stamped Relief Box -->
        <div style="width:580px; height:580px; border: 24px solid #FBF8F2; border-radius: 40px; display:flex; flex-direction:column; align-items:center; justify-content:center; background: rgba(251, 248, 242, 0.04); position:relative; box-shadow: inset 0 0 40px rgba(0,0,0,0.15);">
          <!-- Topographic / Sun Stamp Graphic inside -->
          <svg width="340" height="340" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="36" r="16" fill="#FBF8F2"/>
            <path d="M15 76 L38 48 L56 66 L68 54 L85 76 Z" fill="#FBF8F2"/>
            <rect x="15" y="82" width="70" height="5" rx="2.5" fill="#FBF8F2"/>
          </svg>
          <div style="color:#FBF8F2; font-size:36px; font-weight:900; letter-spacing:14px; margin-top:20px; margin-left:14px;">FIELD</div>
        </div>
      </div>
    `
  },
  {
    id: 'icon_vibrant_2_signal_orange',
    title: 'Option B: Signal Orange Archival Seal',
    category: 'High-Visibility Warm',
    html: `
      <div style="width:1024px; height:1024px; background: #FF3B14; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; border-radius:220px; font-family:'Courier New', monospace;">
        <!-- Circular Japanese Travel Stamp Motif -->
        <div style="width:620px; height:620px; border-radius:50%; border: 28px solid #FDFBF7; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative;">
          <!-- Carved Sun Rays & Ridge -->
          <svg width="360" height="360" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Sun & Rays -->
            <path d="M50 15 L50 25 M30 22 L36 30 M70 22 L64 30 M20 38 L30 41 M80 38 L70 41" stroke="#FDFBF7" stroke-width="6" stroke-linecap="round"/>
            <circle cx="50" cy="48" r="15" fill="#FDFBF7"/>
            <!-- Wave Mountain Horizon -->
            <path d="M12 72 Q32 58 50 68 T88 64 L88 80 L12 80 Z" fill="#FDFBF7"/>
          </svg>
          <div style="color:#FDFBF7; font-size:32px; font-weight:900; letter-spacing:10px; margin-top:10px; margin-left:10px;">N° 01</div>
        </div>
      </div>
    `
  },
  {
    id: 'icon_vibrant_3_split_signature',
    title: 'Option C: Signature 58/42 Split Identity',
    category: 'Layout Archetype',
    html: `
      <div style="width:1024px; height:1024px; display:flex; border-radius:220px; overflow:hidden; position:relative; font-family:'Courier New', monospace;">
        <!-- Left Side: Vivid Emerald Pine (58%) -->
        <div style="width:58%; height:100%; background: #1B4332; display:flex; align-items:center; justify-content:center; position:relative;">
          <!-- Mountain Silhouette -->
          <svg width="280" height="280" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 80 L50 20 L90 80 Z" fill="#40916C" opacity="0.5"/>
            <path d="M30 80 L65 35 L100 80 Z" fill="#74C69D" opacity="0.7"/>
            <circle cx="28" cy="30" r="10" fill="#D8F3DC"/>
          </svg>
        </div>
        
        <!-- Right Side: Aged Paper + Red Stamp (42%) -->
        <div style="width:42%; height:100%; background: #F4EFE6; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; box-sizing:border-box;">
          <!-- Mini Red Rubber Stamp -->
          <div style="width:190px; height:190px; border:10px solid #C84B31; border-radius:20px; display:flex; align-items:center; justify-content:center; transform: rotate(-6deg); margin-bottom:24px;">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="#C84B31">
              <path d="M20 75 L50 25 L80 75 Z"/>
            </svg>
          </div>
          <!-- Typewriter Metadata -->
          <div style="color:#1C1917; font-size:24px; font-weight:800; letter-spacing:2px; text-align:center;">KYOTO</div>
          <div style="color:#78716C; font-size:18px; font-weight:600; letter-spacing:2px; margin-top:4px;">No. 01</div>
          <div style="color:#78716C; font-size:18px; font-weight:600; letter-spacing:2px; margin-top:4px;">2026</div>
        </div>
      </div>
    `
  },
  {
    id: 'icon_vibrant_4_acid_monogram',
    title: 'Option D: Acid Yellow & Carbon "FN" Viewfinder',
    category: 'High-Contrast Technical',
    html: `
      <div style="width:1024px; height:1024px; background: #121212; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; border-radius:220px; font-family:'Courier New', monospace;">
        <!-- Four Corner Camera / Print Crop Marks -->
        <div style="position:absolute; top:80px; left:80px; width:44px; height:44px; border-top:10px solid #DFFF00; border-left:10px solid #DFFF00;"></div>
        <div style="position:absolute; top:80px; right:80px; width:44px; height:44px; border-top:10px solid #DFFF00; border-right:10px solid #DFFF00;"></div>
        <div style="position:absolute; bottom:80px; left:80px; width:44px; height:44px; border-bottom:10px solid #DFFF00; border-left:10px solid #DFFF00;"></div>
        <div style="position:absolute; bottom:80px; right:80px; width:44px; height:44px; border-bottom:10px solid #DFFF00; border-right:10px solid #DFFF00;"></div>

        <!-- Center Monogram "FN" in Carved Stamp Block -->
        <div style="width:520px; height:520px; background: #DFFF00; border-radius:36px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow: 0 0 80px rgba(223, 255, 0, 0.25);">
          <div style="color:#121212; font-size:180px; font-weight:900; letter-spacing:8px; line-height:160px; font-family:'Arial Black', sans-serif;">FN</div>
          <div style="width:280px; height:8px; background:#121212; border-radius:4px; margin-top:20px;"></div>
          <div style="color:#121212; font-size:24px; font-weight:800; letter-spacing:10px; margin-top:14px; margin-left:10px;">FIELD NOTES</div>
        </div>
      </div>
    `
  },
  {
    id: 'icon_vibrant_5_terracotta_stamp_block',
    title: 'Option E: Tactile Terracotta Stamp Block',
    category: 'Material & Object',
    html: `
      <div style="width:1024px; height:1024px; background: #E0533C; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; border-radius:220px; font-family:'Courier New', monospace;">
        <!-- Wooden/Rubber Stamp Top-down Geometric Representation -->
        <div style="width:560px; height:560px; background: #FFFDF9; border-radius:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow: 0 30px 60px rgba(0,0,0,0.25); position:relative;">
          <!-- Inset carved graphic -->
          <svg width="300" height="300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,15 85,80 15,80" fill="#E0533C"/>
            <polygon points="50,42 70,80 30,80" fill="#FFFDF9"/>
            <circle cx="50" cy="62" r="6" fill="#E0533C"/>
          </svg>
          <div style="color:#E0533C; font-size:32px; font-weight:900; letter-spacing:6px; margin-top:16px;">STAMP / 01</div>
        </div>
      </div>
    `
  },
  {
    id: 'icon_vibrant_6_nordic_indigo',
    title: 'Option F: Nordic Deep Indigo & Warm Amber Sun',
    category: 'Editorial Minimalist',
    html: `
      <div style="width:1024px; height:1024px; background: #162032; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; border-radius:220px; font-family:'Courier New', monospace;">
        <!-- Clean geometric horizon -->
        <div style="width:600px; height:600px; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative;">
          <svg width="420" height="420" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Radiant Amber Sun -->
            <circle cx="50" cy="40" r="22" fill="#FFAA00"/>
            <!-- Razor Sharp Mountain Contour -->
            <path d="M10 82 L42 42 L62 64 L74 50 L95 82 Z" fill="#F4EFE6"/>
            <!-- Ink baseline -->
            <line x1="8" y1="88" x2="92" y2="88" stroke="#FFAA00" stroke-width="4" stroke-linecap="round"/>
          </svg>
          <div style="color:#F4EFE6; font-size:30px; font-weight:800; letter-spacing:12px; margin-top:20px; margin-left:12px;">NOTES</div>
        </div>
      </div>
    `
  }
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  for (const icon of icons) {
    console.log(`Rendering ${icon.title}...`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { width:1024px; height:1024px; overflow:hidden; display:flex; align-items:center; justify-content:center; background: transparent; }
          </style>
        </head>
        <body>
          ${icon.html}
        </body>
      </html>
    `, { waitUntil: 'load' });

    const outPath = path.join(ARTIFACT_DIR, `${icon.id}.png`);
    await page.screenshot({ path: outPath, omitBackground: true });
    await page.close();
    console.log(`✓ Saved ${outPath}`);
  }

  await browser.close();
  console.log('ALL 6 VIBRANT VECTOR ICONS GENERATED SUCCESSFULLY!');
  process.exit(0);
}

main().catch(console.error);
