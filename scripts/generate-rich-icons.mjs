import puppeteer from 'puppeteer-core';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/deanfieldz/.gemini/antigravity/brain/7e424507-d11b-4a16-a840-4b7bea0592c2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const richIcons = [
  {
    id: 'rich_icon_1_kraft_journal',
    title: 'Option 1: The Iconic Kraft Pocket Field Journal',
    description: 'Classic kraft cardstock journal with sewn spine stitching, graph grid texture, and a rich multi-color rubber stamp impression + archival badge.',
    html: `
      <div style="width:1024px; height:1024px; background: #2B1E16; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; border-radius:220px; font-family:'Courier New', monospace; box-shadow: inset 0 0 100px rgba(0,0,0,0.6);">
        
        <!-- Main Kraft Journal Body -->
        <div style="width:860px; height:860px; background: #C89D66; border-radius: 48px; position:relative; overflow:hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.6), inset 0 0 80px rgba(139, 90, 43, 0.4); border: 2px solid #8B5A2B;">
          
          <!-- Subtle Graph Grid on Kraft Cover -->
          <div style="position:absolute; inset:0; opacity:0.18; background-image: linear-gradient(#4A2E18 1.5px, transparent 1.5px), linear-gradient(90deg, #4A2E18 1.5px, transparent 1.5px); background-size: 32px 32px;"></div>

          <!-- Left Stitched Spine Band (Authentic Field Notes Style) -->
          <div style="position:absolute; left:0; top:0; bottom:0; width:120px; background: #1C1917; border-right: 4px solid #3E2723; display:flex; flex-direction:column; align-items:center; justify-content:space-around; padding: 40px 0;">
            <!-- Thread Stitching Details -->
            <div style="width:8px; height:48px; background:#D7CCC8; border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>
            <div style="width:8px; height:48px; background:#D7CCC8; border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>
            <div style="width:8px; height:48px; background:#D7CCC8; border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>
            <div style="width:8px; height:48px; background:#D7CCC8; border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>
            <div style="width:8px; height:48px; background:#D7CCC8; border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>
          </div>

          <!-- Cover Content Container -->
          <div style="margin-left: 130px; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding: 60px 40px; box-sizing:border-box;">
            
            <!-- Top Stamped Header Banner -->
            <div style="background: #1C1917; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); text-align:center;">
              <div style="color:#F4EFE6; font-size:38px; font-weight:900; letter-spacing:8px; font-family:'Arial Black', sans-serif;">FIELD NOTES</div>
              <div style="color:#D7CCC8; font-size:16px; font-weight:700; letter-spacing:4px; margin-top:2px;">TRAVEL EDITIONS · 48-PAGE</div>
            </div>

            <!-- Central Multi-Color Rubber Stamp Mark -->
            <div style="width:360px; height:360px; border-radius:50%; border: 12px dashed #9B2C2C; display:flex; flex-direction:column; align-items:center; justify-content:center; background: rgba(254, 243, 199, 0.4); box-shadow: inset 0 0 20px rgba(155, 44, 44, 0.2); transform: rotate(-4deg); position:relative;">
              <svg width="240" height="240" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Golden Sun -->
                <circle cx="50" cy="38" r="16" fill="#D97706" opacity="0.9"/>
                <!-- Pine Forest Mountains -->
                <path d="M15 75 L45 32 L68 58 L78 46 L92 75 Z" fill="#1B4332" opacity="0.95"/>
                <!-- Pine Trees in Foreground -->
                <polygon points="30,75 25,65 35,65" fill="#0F291E"/>
                <polygon points="40,75 35,62 45,62" fill="#0F291E"/>
                <polygon points="70,75 66,66 74,66" fill="#0F291E"/>
                <!-- Ground line -->
                <line x1="12" y1="78" x2="88" y2="78" stroke="#9B2C2C" stroke-width="4" stroke-linecap="round"/>
              </svg>
              <div style="color:#9B2C2C; font-size:20px; font-weight:900; letter-spacing:6px; margin-top:-6px;">RUBBER STAMP</div>
            </div>

            <!-- Bottom Label Record Box -->
            <div style="width:100%; max-width:440px; border: 3px solid #1C1917; border-radius:6px; padding: 12px 18px; display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.25);">
              <div>
                <div style="color:#4A2E18; font-size:14px; font-weight:800; letter-spacing:1px;">RECORD NO.</div>
                <div style="color:#1C1917; font-size:24px; font-weight:900; letter-spacing:2px;">N° 01 · 2026</div>
              </div>
              <div style="color:#1B4332; font-size:18px; font-weight:900; letter-spacing:2px; border: 2px solid #1B4332; padding: 4px 10px; border-radius:4px;">VERIFIED</div>
            </div>

          </div>
        </div>
      </div>
    `
  },
  {
    id: 'rich_icon_2_taped_photo_stamp',
    title: 'Option 2: Taped Travel Photo & Ink Stamp',
    description: 'A genuine travel photo framed with translucent corner washi-tape on aged paper, overlaid with a prominent red location stamp and field notes log.',
    html: `
      <div style="width:1024px; height:1024px; background: #EADBC8; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; border-radius:220px; font-family:'Courier New', monospace; box-shadow: inset 0 0 80px rgba(0,0,0,0.15);">
        
        <!-- Aged Field Paper Sheet -->
        <div style="width:860px; height:860px; background: #F8F4EC; border-radius: 40px; position:relative; overflow:hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.3); border: 2px solid #D6C7B2; padding: 40px; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:space-between;">
          
          <!-- Top Header Line -->
          <div style="width:100%; display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #D6C7B2; padding-bottom: 12px;">
            <div style="color:#1C1917; font-size:26px; font-weight:900; letter-spacing:4px;">FIELD NOTE</div>
            <div style="color:#78716C; font-size:20px; font-weight:700; letter-spacing:2px;">EXPEDITION #01</div>
          </div>

          <!-- Center Taped Photograph Card -->
          <div style="width:580px; height:440px; background: #FFFFFF; border-radius: 12px; padding: 16px 16px 20px 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.25); position:relative; transform: rotate(-2deg); border: 1px solid #E5E7EB;">
            
            <!-- Corner Washi Tape Strips -->
            <div style="position:absolute; top:-16px; left:-24px; width:90px; height:34px; background: rgba(220, 200, 160, 0.75); transform: rotate(-35deg); box-shadow: 0 2px 6px rgba(0,0,0,0.15); border-left:2px dashed rgba(0,0,0,0.1); border-right:2px dashed rgba(0,0,0,0.1);"></div>
            <div style="position:absolute; top:-16px; right:-24px; width:90px; height:34px; background: rgba(220, 200, 160, 0.75); transform: rotate(35deg); box-shadow: 0 2px 6px rgba(0,0,0,0.15); border-left:2px dashed rgba(0,0,0,0.1); border-right:2px dashed rgba(0,0,0,0.1);"></div>
            <div style="position:absolute; bottom:-16px; left:-24px; width:90px; height:34px; background: rgba(220, 200, 160, 0.75); transform: rotate(35deg); box-shadow: 0 2px 6px rgba(0,0,0,0.15); border-left:2px dashed rgba(0,0,0,0.1); border-right:2px dashed rgba(0,0,0,0.1);"></div>
            <div style="position:absolute; bottom:-16px; right:-24px; width:90px; height:34px; background: rgba(220, 200, 160, 0.75); transform: rotate(-35deg); box-shadow: 0 2px 6px rgba(0,0,0,0.15); border-left:2px dashed rgba(0,0,0,0.1); border-right:2px dashed rgba(0,0,0,0.1);"></div>

            <!-- Scenic Photo Inside Frame -->
            <div style="width:100%; height:100%; border-radius: 6px; overflow:hidden; background: linear-gradient(180deg, #1E3A8A 0%, #3B82F6 45%, #F59E0B 75%, #10B981 100%); position:relative;">
              <!-- Landscape SVG Graphic inside photo -->
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <!-- Mountain Peak in Photo -->
                <polygon points="50,20 15,85 85,85" fill="#1E293B" opacity="0.85"/>
                <polygon points="50,20 35,50 65,50" fill="#E2E8F0" opacity="0.9"/>
                <polygon points="75,40 45,95 105,95" fill="#334155" opacity="0.75"/>
                <circle cx="25" cy="30" r="10" fill="#FEF08A"/>
              </svg>
            </div>
          </div>

          <!-- Overlapping Circular Red Rubber Stamp -->
          <div style="position:absolute; bottom: 90px; right: 80px; width:280px; height:280px; border-radius:50%; border: 10px solid #B91C1C; display:flex; flex-direction:column; align-items:center; justify-content:center; background: rgba(254, 226, 226, 0.85); box-shadow: 0 10px 25px rgba(185, 28, 28, 0.35); transform: rotate(12deg);">
            <div style="color:#B91C1C; font-size:18px; font-weight:900; letter-spacing:4px;">★ KYOTO ★</div>
            <div style="color:#B91C1C; font-size:36px; font-weight:900; letter-spacing:2px; margin: 4px 0;">PASSED</div>
            <div style="color:#B91C1C; font-size:16px; font-weight:800; letter-spacing:3px;">2026 · FIELD</div>
          </div>

          <!-- Bottom Field Note Caption -->
          <div style="width:100%; display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
              <div style="color:#1C1917; font-size:24px; font-weight:900; letter-spacing:1px;">Kyoto Old District</div>
              <div style="color:#78716C; font-size:16px; font-weight:600; letter-spacing:2px;">Cedar · Temple Bell · Dusk</div>
            </div>
            <div style="color:#1C1917; font-size:28px; font-weight:900; font-family:'Arial Black', sans-serif;">4:3</div>
          </div>

        </div>
      </div>
    `
  },
  {
    id: 'rich_icon_3_wooden_stamp_tool',
    title: 'Option 3: The Tangible Wooden Stamp & Ink Pad',
    description: 'A rich physical woodblock stamp handle with brass hardware casting a crisp travel landform imprint onto an open notebook.',
    html: `
      <div style="width:1024px; height:1024px; background: #1C2333; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; border-radius:220px; font-family:'Courier New', monospace; box-shadow: inset 0 0 100px rgba(0,0,0,0.7);">
        
        <!-- Open Notebook Paper Base -->
        <div style="width:840px; height:840px; background: #F5EFE6; border-radius: 40px; position:relative; box-shadow: 0 35px 80px rgba(0,0,0,0.5); padding: 50px; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:space-between; border: 3px solid #D5C7B4;">
          
          <!-- Top Typographic Brand Header -->
          <div style="width:100%; display:flex; justify-content:space-between; align-items:center; border-bottom: 3px double #1C1917; padding-bottom: 14px;">
            <div style="color:#1C1917; font-size:32px; font-weight:900; letter-spacing:6px; font-family:'Arial Black', sans-serif;">FIELD NOTES</div>
            <div style="background:#B91C1C; color:#FFF; font-size:16px; font-weight:900; padding:4px 12px; border-radius:4px; letter-spacing:2px;">ORIGINAL</div>
          </div>

          <!-- Central Wooden Stamp & Imprint Composition -->
          <div style="width:100%; height:500px; position:relative; display:flex; align-items:center; justify-content:center;">
            
            <!-- Red Inked Stamp Impression on Page -->
            <div style="position:absolute; left:40px; width:340px; height:340px; border: 12px solid #C2410C; border-radius: 28px; background: rgba(254, 215, 170, 0.3); display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow: inset 0 0 20px rgba(194, 65, 12, 0.15);">
              <svg width="220" height="220" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="35" r="14" fill="#C2410C"/>
                <path d="M15 75 L50 35 L85 75 Z" fill="#C2410C"/>
                <path d="M50 35 L68 55 L85 75 L50 75 Z" fill="#9A3412"/>
              </svg>
              <div style="color:#C2410C; font-size:22px; font-weight:900; letter-spacing:6px; margin-top:4px;">MT. FUJI</div>
            </div>

            <!-- Tangible Handcrafted Wooden Stamp Tool (3D/Isometric Style) -->
            <div style="position:absolute; right:20px; top:30px; width:300px; height:360px; transform: rotate(-10deg); filter: drop-shadow(20px 25px 30px rgba(0,0,0,0.45));">
              <!-- Wooden Handle Knob -->
              <div style="width:140px; height:120px; background: linear-gradient(135deg, #8B4513, #5C2E0B); border-radius: 70px 70px 30px 30px; margin: 0 auto; box-shadow: inset 0 10px 20px rgba(255,255,255,0.3), inset 0 -10px 20px rgba(0,0,0,0.5);"></div>
              <!-- Brass Collar Ring -->
              <div style="width:100px; height:24px; background: linear-gradient(90deg, #D4AF37, #FFF8DC, #AA820A); border-radius: 6px; margin: -6px auto 0 auto; box-shadow: 0 4px 8px rgba(0,0,0,0.3);"></div>
              <!-- Wooden Base Block -->
              <div style="width:280px; height:160px; background: linear-gradient(180deg, #A0522D, #6B3410); border-radius: 20px; margin: 0 auto; border-top: 4px solid #CD853F; box-shadow: inset 0 0 25px rgba(0,0,0,0.4);"></div>
              <!-- Red Inked Rubber Bottom Pad -->
              <div style="width:280px; height:28px; background: #EA580C; border-radius: 0 0 16px 16px; margin: 0 auto; box-shadow: 0 8px 16px rgba(234, 88, 12, 0.4);"></div>
            </div>

          </div>

          <!-- Bottom Typewriter Metadata Line -->
          <div style="width:100%; border-top: 2px solid #D5C7B4; padding-top: 14px; display:flex; justify-content:space-between; align-items:center;">
            <div style="color:#78716C; font-size:20px; font-weight:800; letter-spacing:3px;">TRAVEL MEMORY LOG</div>
            <div style="color:#1C1917; font-size:22px; font-weight:900; letter-spacing:2px;">NO. 001/2026</div>
          </div>

        </div>
      </div>
    `
  },
  {
    id: 'rich_icon_4_expedition_leather',
    title: 'Option 4: The Expedition Leather Journal & Stamped Badge',
    description: 'Rich saddle-tan leather travel journal with real perimeter saddle-stitching, debossed gold-foil mountain seal, and a green fabric bookmark ribbon.',
    html: `
      <div style="width:1024px; height:1024px; background: #18120C; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; border-radius:220px; font-family:'Courier New', monospace; box-shadow: inset 0 0 120px rgba(0,0,0,0.8);">
        
        <!-- Saddle Tan Leather Journal Cover -->
        <div style="width:860px; height:860px; background: radial-gradient(circle at 30% 30%, #BA6828 0%, #854010 70%, #542507 100%); border-radius: 48px; position:relative; overflow:hidden; box-shadow: 0 35px 80px rgba(0,0,0,0.7), inset 0 0 60px rgba(0,0,0,0.5); border: 3px solid #6E320A; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding: 60px 40px; box-sizing:border-box;">
          
          <!-- Realistic Perimeter Saddle Stitching -->
          <div style="position:absolute; inset: 24px; border: 3px dashed #E6A15C; border-radius: 36px; opacity:0.85; pointer-events:none; box-shadow: 0 1px 2px rgba(0,0,0,0.6);"></div>

          <!-- Hanging Forest Green Ribbon Bookmark -->
          <div style="position:absolute; top:0; right:140px; width:48px; height:180px; background: linear-gradient(90deg, #1B4332, #2D6A4F); box-shadow: 4px 6px 12px rgba(0,0,0,0.5); border-bottom: 24px solid transparent; border-left: 24px solid #1B4332; border-right: 24px solid #1B4332;"></div>

          <!-- Top Embossed Header -->
          <div style="text-align:center; position:relative; z-index:2; margin-top:20px;">
            <div style="color:#FDE68A; font-size:42px; font-weight:900; letter-spacing:10px; font-family:'Arial Black', sans-serif; text-shadow: 0 2px 4px rgba(0,0,0,0.8), 0 -1px 1px rgba(255,255,255,0.4);">FIELD NOTES</div>
            <div style="color:#F59E0B; font-size:18px; font-weight:800; letter-spacing:6px; margin-top:4px;">EXPEDITION LOGBOOK</div>
          </div>

          <!-- Central Debossed Gold & Terracotta Mountain Badge -->
          <div style="width:420px; height:420px; border-radius:50%; border: 12px solid #F59E0B; background: radial-gradient(circle, #1E293B 0%, #0F172A 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow: 0 15px 35px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.8); position:relative; z-index:2;">
            <!-- Badge Graphic -->
            <svg width="280" height="280" viewBox="0 0 100 100" fill="none">
              <!-- Gold Moon / Sun -->
              <circle cx="50" cy="34" r="16" fill="#FBBF24"/>
              <!-- Multi-layer Mountain Relief -->
              <path d="M10 78 L50 26 L90 78 Z" fill="#E2E8F0"/>
              <path d="M50 26 L68 52 L90 78 L50 78 Z" fill="#94A3B8"/>
              <path d="M30 78 L65 38 L95 78 Z" fill="#F87171" opacity="0.6"/>
              <!-- Compass Star Needle Accent -->
              <polygon points="50,10 54,20 50,16 46,20" fill="#F59E0B"/>
            </svg>
            <div style="color:#FDE68A; font-size:20px; font-weight:900; letter-spacing:8px; margin-top:-10px;">EST. 2026</div>
          </div>

          <!-- Bottom Stamped Brass Plate -->
          <div style="background: linear-gradient(180deg, #D97706, #78350F); border: 2px solid #FDE68A; padding: 10px 32px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); position:relative; z-index:2;">
            <div style="color:#FFFBEB; font-size:22px; font-weight:900; letter-spacing:4px;">RUBBER STAMP EDITION</div>
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

  for (const icon of richIcons) {
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
  console.log('ALL RICH FIELD NOTES ICONS GENERATED SUCCESSFULLY!');
  process.exit(0);
}

main().catch(console.error);
