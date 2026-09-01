import puppeteer from 'puppeteer-core';

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
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  
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
  ];

  await page.evaluate((notes) => {
    localStorage.setItem('fn_saved_notes_json', JSON.stringify(notes));
    console.log('Saved notes in localStorage, length:', localStorage.getItem('fn_saved_notes_json').length);
  }, sampleNotes);

  await page.reload({ waitUntil: 'load' });
  await delay(2000);

  const notesFromStorage = await page.evaluate(() => localStorage.getItem('fn_saved_notes_json'));
  console.log('Notes from storage after reload:', notesFromStorage?.slice(0, 100));

  await browser.close();
  process.exit(0);
}

main().catch(console.error);
