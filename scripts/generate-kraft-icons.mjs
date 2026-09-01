import puppeteer from 'puppeteer-core';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/deanfieldz/.gemini/antigravity/brain/7e424507-d11b-4a16-a840-4b7bea0592c2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const kraftIcons = [
  {
    id: 'kraft_icon_v1_classic_vermilion',
    title: 'Variation 1: Classic Kraft Memo Book (Vermilion Stamp)',
    description: 'Edge-to-edge golden kraft cardboard canvas, dark charcoal spine tape with metallic staple stitches on the left, debossed FIELD NOTES header, and a bold circular terracotta-vermilion mountain stamp in the center.',
    html: `
      <div style="width:1024px; height:1024px; background: linear-gradient(145deg, #D4A368, #B58348); position:relative; overflow:hidden; border-radius:228px; font-family:'Courier New', monospace; box-shadow: inset 0 0 120px rgba(74, 46, 24, 0.4), inset 0 4px 12px rgba(255,255,255,0.3), inset 0 -4px 12px rgba(0,0,0,0.5);">
        
        <!-- Authentic Kraft Paper Texture / Grain -->
        <svg style="position:absolute; inset:0; width:100%; height:100%; opacity:0.12; pointer-events:none;">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)"/>
        </svg>

        <!-- Subtle Graph Grid Pattern Across Cover -->
        <div style="position:absolute; inset:0; opacity:0.12; background-image: linear-gradient(#3E2723 2px, transparent 2px), linear-gradient(90deg, #3E2723 2px, transparent 2px); background-size: 48px 48px;"></div>

        <!-- Left Spine Binding Tape (18% width) -->
        <div style="position:absolute; left:0; top:0; bottom:0; width:180px; background: linear-gradient(90deg, #18181B 0%, #27272A 70%, #18181B 100%); box-shadow: 12px 0 24px rgba(0,0,0,0.45); display:flex; flex-direction:column; align-items:center; justify-content:space-evenly; padding: 60px 0; z-index:2; border-right: 2px solid #09090B;">
          <!-- Realistic Stitched Staples with Metallic Glint -->
          <div style="width:14px; height:68px; background: linear-gradient(90deg, #71717A, #E4E4E7, #A1A1AA); border-radius:7px; box-shadow: 0 4px 8px rgba(0,0,0,0.8), inset 0 1px 2px #FFF;"></div>
          <div style="width:14px; height:68px; background: linear-gradient(90deg, #71717A, #E4E4E7, #A1A1AA); border-radius:7px; box-shadow: 0 4px 8px rgba(0,0,0,0.8), inset 0 1px 2px #FFF;"></div>
          <div style="width:14px; height:68px; background: linear-gradient(90deg, #71717A, #E4E4E7, #A1A1AA); border-radius:7px; box-shadow: 0 4px 8px rgba(0,0,0,0.8), inset 0 1px 2px #FFF;"></div>
        </div>

        <!-- Spine Fold Shadow Crease -->
        <div style="position:absolute; left:180px; top:0; bottom:0; width:36px; background: linear-gradient(90deg, rgba(0,0,0,0.35), transparent); z-index:1;"></div>

        <!-- Main Cover Artwork Area -->
        <div style="margin-left:180px; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding: 90px 60px; box-sizing:border-box; position:relative; z-index:1;">
          
          <!-- Top Stamped Black Brand Label -->
          <div style="background: #18181B; padding: 18px 36px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.2); text-align:center;">
            <div style="color:#F4EFE6; font-size:44px; font-weight:900; letter-spacing:10px; font-family:'Arial Black', Impact, sans-serif;">FIELD NOTES</div>
          </div>

          <!-- Central Bold Rubber Stamp Impression -->
          <div style="width:440px; height:440px; border-radius:50%; border: 16px solid #C2410C; background: rgba(254, 237, 213, 0.45); display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow: inset 0 0 30px rgba(194, 65, 12, 0.25), 0 8px 20px rgba(194, 65, 12, 0.15); transform: rotate(-3deg); position:relative;">
            
            <!-- Rubber Stamp Mountain & Sun Icon -->
            <svg width="280" height="280" viewBox="0 0 100 100" fill="none" style="filter: drop-shadow(0 2px 4px rgba(194, 65, 12, 0.3));">
              <!-- Stamped Sun -->
              <circle cx="50" cy="36" r="16" fill="#C2410C"/>
              <!-- Mountain Layers -->
              <path d="M12 76 L48 30 L72 60 L80 50 L92 76 Z" fill="#C2410C"/>
              <line x1="8" y1="82" x2="92" y2="82" stroke="#C2410C" stroke-width="6" stroke-linecap="round"/>
            </svg>
            
            <!-- Typewriter Label Inside Stamp -->
            <div style="color:#C2410C; font-size:24px; font-weight:900; letter-spacing:8px; margin-top:-10px; font-family:'Arial Black', sans-serif;">TRAVEL</div>
          </div>

          <!-- Bottom Archival Log Label -->
          <div style="color:#27272A; font-size:26px; font-weight:800; letter-spacing:8px; opacity:0.85; text-align:center;">
            N° 01 · 2026 EDITION
          </div>

        </div>

        <!-- Top Right Corner Highlight -->
        <div style="position:absolute; top:0; right:0; width:300px; height:300px; background: radial-gradient(circle at 100% 0%, rgba(255,255,255,0.25), transparent 70%); pointer-events:none;"></div>
      </div>
    `
  },
  {
    id: 'kraft_icon_v2_emerald_forest',
    title: 'Variation 2: Kraft Journal & Deep Emerald Stamp',
    description: 'Deep warm kraft texture with canvas spine band and an oversized deep pine green / forest stamp seal with golden sun contrast.',
    html: `
      <div style="width:1024px; height:1024px; background: linear-gradient(135deg, #C29358, #A3743B); position:relative; overflow:hidden; border-radius:228px; font-family:'Courier New', monospace; box-shadow: inset 0 0 120px rgba(50, 30, 15, 0.5), inset 0 4px 12px rgba(255,255,255,0.3);">
        
        <!-- Left Fabric/Cloth Spine -->
        <div style="position:absolute; left:0; top:0; bottom:0; width:170px; background: #1C1917; box-shadow: 14px 0 28px rgba(0,0,0,0.5); display:flex; flex-direction:column; align-items:center; justify-content:space-evenly; padding: 70px 0; z-index:2;">
          <div style="width:12px; height:60px; background: #E5E5E5; border-radius:6px; box-shadow:0 3px 6px rgba(0,0,0,0.7);"></div>
          <div style="width:12px; height:60px; background: #E5E5E5; border-radius:6px; box-shadow:0 3px 6px rgba(0,0,0,0.7);"></div>
          <div style="width:12px; height:60px; background: #E5E5E5; border-radius:6px; box-shadow:0 3px 6px rgba(0,0,0,0.7);"></div>
        </div>
        <div style="position:absolute; left:170px; top:0; bottom:0; width:40px; background: linear-gradient(90deg, rgba(0,0,0,0.4), transparent); z-index:1;"></div>

        <!-- Cover Content Area -->
        <div style="margin-left:170px; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding: 90px 60px; box-sizing:border-box; position:relative; z-index:1;">
          
          <!-- Top Monospace Header -->
          <div style="text-align:center;">
            <div style="color:#1C1917; font-size:46px; font-weight:900; letter-spacing:10px; font-family:'Arial Black', sans-serif;">FIELD NOTES</div>
            <div style="color:#4A2E18; font-size:18px; font-weight:800; letter-spacing:6px; margin-top:4px;">TRAVEL EDITIONS</div>
          </div>

          <!-- Large Rectangular Emerald Rubber Stamp Block -->
          <div style="width:480px; height:440px; border: 16px solid #144A32; border-radius: 36px; background: rgba(220, 245, 230, 0.35); display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow: inset 0 0 35px rgba(20, 74, 50, 0.25), 0 10px 25px rgba(0,0,0,0.2); transform: rotate(2deg);">
            <svg width="280" height="260" viewBox="0 0 100 100" fill="none">
              <!-- Warm Amber Sun -->
              <circle cx="50" cy="34" r="16" fill="#D97706"/>
              <!-- Pine Peak Contours -->
              <path d="M15 76 L50 28 L85 76 Z" fill="#144A32"/>
              <path d="M50 28 L68 54 L85 76 L50 76 Z" fill="#0B2E1E"/>
              <line x1="10" y1="84" x2="90" y2="84" stroke="#144A32" stroke-width="6" stroke-linecap="round"/>
            </svg>
            <div style="color:#144A32; font-size:26px; font-weight:900; letter-spacing:8px; margin-top:6px; font-family:'Arial Black', sans-serif;">RUBBER STAMP</div>
          </div>

          <!-- Bottom Label -->
          <div style="background:#144A32; color:#F4EFE6; padding:8px 24px; border-radius:6px; font-size:22px; font-weight:900; letter-spacing:4px;">
            EXPEDITION RECORD
          </div>

        </div>
      </div>
    `
  },
  {
    id: 'kraft_icon_v3_stamped_polaroid_journal',
    title: 'Variation 3: Kraft Journal with Stamped Photo Overlay',
    description: 'Kraft notebook cover with a framed travel photo card held by tape and stamped with a bold scarlet red rubber seal.',
    html: `
      <div style="width:1024px; height:1024px; background: linear-gradient(145deg, #CF9E62, #AD7B40); position:relative; overflow:hidden; border-radius:228px; font-family:'Courier New', monospace; box-shadow: inset 0 0 100px rgba(60, 35, 15, 0.5);">
        
        <!-- Left Spine -->
        <div style="position:absolute; left:0; top:0; bottom:0; width:160px; background: #18181B; box-shadow: 12px 0 24px rgba(0,0,0,0.5); display:flex; flex-direction:column; align-items:center; justify-content:space-evenly; padding: 70px 0; z-index:3;">
          <div style="width:12px; height:60px; background: #D4D4D8; border-radius:6px; box-shadow:0 3px 6px rgba(0,0,0,0.7);"></div>
          <div style="width:12px; height:60px; background: #D4D4D8; border-radius:6px; box-shadow:0 3px 6px rgba(0,0,0,0.7);"></div>
          <div style="width:12px; height:60px; background: #D4D4D8; border-radius:6px; box-shadow:0 3px 6px rgba(0,0,0,0.7);"></div>
        </div>

        <!-- Cover Area -->
        <div style="margin-left:160px; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding: 80px 40px; box-sizing:border-box; position:relative;">
          
          <!-- Header -->
          <div style="text-align:center;">
            <div style="color:#18181B; font-size:42px; font-weight:900; letter-spacing:8px; font-family:'Arial Black', sans-serif;">FIELD NOTES</div>
          </div>

          <!-- Central Framed Photo Card -->
          <div style="width:520px; height:420px; background: #FFFFFF; border-radius: 16px; padding: 16px 16px 24px 16px; box-shadow: 0 20px 45px rgba(0,0,0,0.35); position:relative; transform: rotate(-3deg); z-index:1;">
            
            <!-- Corner Washi Tape -->
            <div style="position:absolute; top:-16px; left:-20px; width:90px; height:32px; background: rgba(220, 200, 160, 0.85); transform: rotate(-35deg); box-shadow: 0 2px 6px rgba(0,0,0,0.2);"></div>
            <div style="position:absolute; top:-16px; right:-20px; width:90px; height:32px; background: rgba(220, 200, 160, 0.85); transform: rotate(35deg); box-shadow: 0 2px 6px rgba(0,0,0,0.2);"></div>

            <!-- Photo Artwork Inside -->
            <div style="width:100%; height:100%; border-radius: 10px; overflow:hidden; background: linear-gradient(180deg, #1E3A8A 0%, #3B82F6 40%, #F59E0B 70%, #10B981 100%);">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <circle cx="28" cy="30" r="12" fill="#FEF08A"/>
                <polygon points="50,22 15,88 85,88" fill="#0F172A" opacity="0.9"/>
                <polygon points="50,22 35,52 65,52" fill="#E2E8F0"/>
              </svg>
            </div>

            <!-- Overlapping Red Stamped Seal -->
            <div style="position:absolute; bottom: -30px; right: -30px; width:250px; height:250px; border-radius:50%; border: 10px solid #DC2626; background: rgba(254, 226, 226, 0.9); box-shadow: 0 10px 25px rgba(220, 38, 38, 0.4); display:flex; flex-direction:column; align-items:center; justify-content:center; transform: rotate(14deg); z-index:2;">
              <div style="color:#DC2626; font-size:18px; font-weight:900; letter-spacing:4px;">★ PASSED ★</div>
              <div style="color:#DC2626; font-size:32px; font-weight:900; letter-spacing:2px; font-family:'Arial Black', sans-serif;">KYOTO</div>
              <div style="color:#DC2626; font-size:16px; font-weight:800; letter-spacing:2px;">N° 01 · 2026</div>
            </div>
          </div>

          <!-- Bottom Label -->
          <div style="color:#3F2D1D; font-size:24px; font-weight:800; letter-spacing:6px; margin-top:20px;">
            RUBBER STAMP EDITIONS
          </div>

        </div>
      </div>
    `
  },
  {
    id: 'kraft_icon_v4_bold_embossed_stamp',
    title: 'Variation 4: Bold Embossed Mountain Seal on Kraft',
    description: 'High-contrast minimalist kraft cover with large deeply-embossed two-color rubber stamp seal and crisp stamped typography.',
    html: `
      <div style="width:1024px; height:1024px; background: linear-gradient(145deg, #DBA86E, #B88247); position:relative; overflow:hidden; border-radius:228px; font-family:'Courier New', monospace; box-shadow: inset 0 0 120px rgba(60, 35, 15, 0.45), inset 0 4px 10px rgba(255,255,255,0.35);">
        
        <!-- Left Spine Tape -->
        <div style="position:absolute; left:0; top:0; bottom:0; width:160px; background: #1C1917; box-shadow: 12px 0 24px rgba(0,0,0,0.5); display:flex; flex-direction:column; align-items:center; justify-content:space-evenly; padding: 70px 0; z-index:2;">
          <div style="width:12px; height:60px; background: #F4EFE6; border-radius:6px; box-shadow:0 3px 6px rgba(0,0,0,0.7);"></div>
          <div style="width:12px; height:60px; background: #F4EFE6; border-radius:6px; box-shadow:0 3px 6px rgba(0,0,0,0.7);"></div>
          <div style="width:12px; height:60px; background: #F4EFE6; border-radius:6px; box-shadow:0 3px 6px rgba(0,0,0,0.7);"></div>
        </div>

        <!-- Cover Artwork -->
        <div style="margin-left:160px; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding: 85px 50px; box-sizing:border-box; position:relative; z-index:1;">
          
          <!-- Top Brand Header Badge -->
          <div style="background: #1C1917; padding: 16px 36px; border-radius: 10px; box-shadow: 0 8px 20px rgba(0,0,0,0.3); text-align:center;">
            <div style="color:#F4EFE6; font-size:42px; font-weight:900; letter-spacing:8px; font-family:'Arial Black', sans-serif;">FIELD NOTES</div>
          </div>

          <!-- Large Octagonal Expedition Stamp Seal -->
          <div style="width:460px; height:460px; border: 16px solid #1C1917; border-radius: 60px; background: rgba(255, 255, 255, 0.4); display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow: inset 0 0 30px rgba(0,0,0,0.1), 0 12px 30px rgba(0,0,0,0.15); transform: rotate(-2deg); position:relative;">
            
            <!-- Red Sun & Charcoal Mountain -->
            <svg width="300" height="300" viewBox="0 0 100 100" fill="none">
              <!-- Vibrant Scarlet Sun -->
              <circle cx="50" cy="35" r="18" fill="#DC2626"/>
              <!-- Bold Mountain Silhouette -->
              <path d="M12 78 L50 28 L88 78 Z" fill="#1C1917"/>
              <path d="M50 28 L68 52 L88 78 L50 78 Z" fill="#383431"/>
              <line x1="8" y1="84" x2="92" y2="84" stroke="#DC2626" stroke-width="6" stroke-linecap="round"/>
            </svg>

            <div style="color:#DC2626; font-size:26px; font-weight:900; letter-spacing:10px; margin-top:-6px; font-family:'Arial Black', sans-serif;">STAMP</div>
          </div>

          <!-- Bottom Archival Record Line -->
          <div style="color:#1C1917; font-size:26px; font-weight:900; letter-spacing:6px; text-align:center;">
            MEMO BOOK · 48-PAGE
          </div>

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

  for (const icon of kraftIcons) {
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
  console.log('ALL 4 KRAFT JOURNAL APP ICONS GENERATED SUCCESSFULLY!');
  process.exit(0);
}

main().catch(console.error);
