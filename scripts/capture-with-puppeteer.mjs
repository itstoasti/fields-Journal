import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/deanfieldz/.gemini/antigravity/brain/7e424507-d11b-4a16-a840-4b7bea0592c2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 6060;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('Launching browser with puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  // 1. Home Screen (Empty State)
  console.log('1. Navigating to Home screen (initial)...');
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
  await delay(1500);

  const homeEmptyPath = path.join(ARTIFACT_DIR, 'screen_home_empty_verified.png');
  await page.screenshot({ path: homeEmptyPath });
  console.log('✓ Captured empty home:', homeEmptyPath);

  // 2. Seed notes and consent
  console.log('2. Seeding notes into localStorage...');
  await page.evaluate(() => {
    const sampleNotes = [
      {
        id: 'fn_1',
        createdAt: new Date().toISOString(),
        place: 'Kyoto',
        number: '01',
        keywords: ['Cedar trees', 'Temple bell', 'Dusk mist'],
        year: '2026',
        sourceUri: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80',
        posterUri: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80',
        width: 1600,
        height: 1200,
      },
      {
        id: 'fn_2',
        createdAt: new Date().toISOString(),
        place: 'Mount Fuji',
        number: '02',
        keywords: ['Snow peak', 'Pine silence', 'Dawn air'],
        year: '2026',
        sourceUri: 'https://images.unsplash.com/photo-1578637387939-43c525550085?w=800&auto=format&fit=crop&q=80',
        posterUri: 'https://images.unsplash.com/photo-1578637387939-43c525550085?w=800&auto=format&fit=crop&q=80',
        width: 1600,
        height: 1200,
      },
      {
        id: 'fn_3',
        createdAt: new Date().toISOString(),
        place: 'Kyoto',
        number: '03',
        keywords: ['Old street', 'Eaves rain', 'Stone steps'],
        year: '2026',
        sourceUri: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80',
        posterUri: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80',
        width: 1600,
        height: 1200,
      },
      {
        id: 'fn_4',
        createdAt: new Date().toISOString(),
        place: 'Mount Fuji',
        number: '04',
        keywords: ['Mirror lake', 'Shore reeds', 'First light'],
        year: '2026',
        sourceUri: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?w=800&auto=format&fit=crop&q=80',
        posterUri: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?w=800&auto=format&fit=crop&q=80',
        width: 1600,
        height: 1200,
      },
    ];
    localStorage.setItem('fn_saved_notes_json', JSON.stringify(sampleNotes));
    localStorage.setItem('fn_privacy_consented_v1', 'true');
  });

  await page.reload({ waitUntil: 'networkidle0' });
  await delay(2000);

  // 3. Home Screen (2-Column Note Card Grid)
  console.log('3. Capturing Home screen with 2-column cards...');
  const homeGridPath = path.join(ARTIFACT_DIR, 'screen_home_grid_verified.png');
  await page.screenshot({ path: homeGridPath });
  console.log('✓ Captured home grid:', homeGridPath);

  // 4. Compose Screen
  console.log('4. Navigating to Compose screen...');
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const btn = divs.find((d) => d.innerText && d.innerText.trim() === 'NEW FIELD NOTE');
    if (btn) btn.click();
  });
  await delay(2500);

  const composePath = path.join(ARTIFACT_DIR, 'screen_compose_verified.png');
  await page.screenshot({ path: composePath });
  console.log('✓ Captured compose screen:', composePath);

  // 5. Result Screen (with 4:3 Poster)
  console.log('5. Navigating to Result screen...');
  const posterUrl = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80';
  await page.goto(
    `http://127.0.0.1:${PORT}/result?place=Kyoto%20Old%20District&number=01&year=2026&keywords=%5B%22Cedar%20trees%22%2C%22Temple%20bell%22%2C%22Dusk%20mist%22%5D&posterUri=${encodeURIComponent(posterUrl)}`,
    { waitUntil: 'networkidle0' }
  );
  await delay(2500);

  const resultPath = path.join(ARTIFACT_DIR, 'screen_result_verified.png');
  await page.screenshot({ path: resultPath });
  console.log('✓ Captured result screen:', resultPath);

  // 6. Settings Screen
  console.log('6. Navigating to Settings screen...');
  await page.goto(`http://127.0.0.1:${PORT}/settings`, { waitUntil: 'networkidle0' });
  await delay(2000);

  const settingsPath = path.join(ARTIFACT_DIR, 'screen_settings_verified.png');
  await page.screenshot({ path: settingsPath });
  console.log('✓ Captured settings screen:', settingsPath);

  await browser.close();
  console.log('\nALL VERIFIED APP SCREENSHOTS CAPTURED SUCCESSFULLY!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Puppeteer error:', err);
  process.exit(1);
});
