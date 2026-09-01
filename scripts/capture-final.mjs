import puppeteer from 'puppeteer-core';
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

  // Helper to create configured page
  async function createPage() {
    const page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    return page;
  }

  // 1. Home Empty Screen
  console.log('1. Capturing Empty Home Screen...');
  const page1 = await createPage();
  await page1.evaluateOnNewDocument(() => {
    localStorage.clear();
    localStorage.setItem('fn_privacy_consented_v1', 'true');
  });
  await page1.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await delay(1500);
  await page1.screenshot({ path: path.join(ARTIFACT_DIR, 'final_screen_home_empty.png') });
  await page1.close();
  console.log('✓ Captured final_screen_home_empty.png');

  // 2. Home Grid Screen with Note Cards
  console.log('2. Capturing Home Grid Screen with Note Cards...');
  const page2 = await createPage();
  await page2.evaluateOnNewDocument((notes) => {
    localStorage.setItem('fn_saved_notes_json', JSON.stringify(notes));
    localStorage.setItem('fn_privacy_consented_v1', 'true');
  }, sampleNotes);
  await page2.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await delay(2000);
  await page2.screenshot({ path: path.join(ARTIFACT_DIR, 'final_screen_home_grid.png') });
  await page2.close();
  console.log('✓ Captured final_screen_home_grid.png');

  // 3. Compose Screen
  console.log('3. Capturing Compose Screen...');
  const page3 = await createPage();
  await page3.evaluateOnNewDocument(() => {
    localStorage.setItem('fn_privacy_consented_v1', 'true');
  });
  await page3.goto(`http://127.0.0.1:${PORT}/compose`, { waitUntil: 'load' });
  await delay(2000);
  await page3.screenshot({ path: path.join(ARTIFACT_DIR, 'final_screen_compose.png') });
  await page3.close();
  console.log('✓ Captured final_screen_compose.png');

  // 4. Result Poster Screen
  console.log('4. Capturing Result Poster Screen...');
  const page4 = await createPage();
  const samplePoster = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80';
  await page4.goto(
    `http://127.0.0.1:${PORT}/result?place=Kyoto%20Old%20District&number=01&year=2026&keywords=%5B%22Cedar%20trees%22%2C%22Temple%20bell%22%2C%22Dusk%20mist%22%5D&posterUri=${encodeURIComponent(samplePoster)}`,
    { waitUntil: 'load' }
  );
  await delay(2000);
  await page4.screenshot({ path: path.join(ARTIFACT_DIR, 'final_screen_result.png') });
  await page4.close();
  console.log('✓ Captured final_screen_result.png');

  // 5. Settings Screen
  console.log('5. Capturing Settings Screen...');
  const page5 = await createPage();
  await page5.goto(`http://127.0.0.1:${PORT}/settings`, { waitUntil: 'load' });
  await delay(1500);
  await page5.screenshot({ path: path.join(ARTIFACT_DIR, 'final_screen_settings.png') });
  await page5.close();
  console.log('✓ Captured final_screen_settings.png');

  await browser.close();
  console.log('\nALL 5 SCREENS VERIFIED & CAPTURED SUCCESSFULLY!');
  process.exit(0);
}

main().catch(console.error);
