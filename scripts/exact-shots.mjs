import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/deanfieldz/.gemini/antigravity/brain/7e424507-d11b-4a16-a840-4b7bea0592c2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 6060;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[BROWSER]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.error('[PAGE ERROR]', err.message));

  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  // 1. Home Screen Empty State
  console.log('1. Loading Home screen empty state...');
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await delay(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'confirmed_home_empty.png') });
  console.log('✓ Captured confirmed_home_empty.png');

  // 2. Compose Screen
  console.log('2. Navigating directly to /compose...');
  await page.goto(`http://127.0.0.1:${PORT}/compose`, { waitUntil: 'load' });
  await delay(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'confirmed_compose_screen.png') });
  console.log('✓ Captured confirmed_compose_screen.png');

  // 3. Result Screen
  console.log('3. Navigating to /result...');
  const samplePoster = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80';
  await page.goto(
    `http://127.0.0.1:${PORT}/result?place=Kyoto%20Old%20District&number=01&year=2026&keywords=%5B%22Cedar%20trees%22%2C%22Temple%20bell%22%2C%22Dusk%20mist%22%5D&posterUri=${encodeURIComponent(samplePoster)}`,
    { waitUntil: 'load' }
  );
  await delay(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'confirmed_result_screen.png') });
  console.log('✓ Captured confirmed_result_screen.png');

  // 4. Settings Screen
  console.log('4. Navigating to /settings...');
  await page.goto(`http://127.0.0.1:${PORT}/settings`, { waitUntil: 'load' });
  await delay(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'confirmed_settings_screen.png') });
  console.log('✓ Captured confirmed_settings_screen.png');

  // 5. Seed notes and capture Home Screen Grid
  console.log('5. Seeding notes for Home 2-column grid...');
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
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
        place: 'Kyoto Pagoda',
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
        place: 'Mount Fuji Lake',
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
  await page.reload({ waitUntil: 'load' });
  await delay(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'confirmed_home_grid.png') });
  console.log('✓ Captured confirmed_home_grid.png');

  await browser.close();
  console.log('\nALL SCREENSHOTS COMPLETED!');
  process.exit(0);
}

main().catch(console.error);
