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
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  console.log('1. Loading Home screen...');
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
  await delay(1500);

  // 1. Home Empty Screen
  console.log('1. Capturing Home screen empty state...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_1_home_empty.png') });

  // 2. Click button to go to Compose Screen
  console.log('2. Clicking NEW FIELD NOTE button...');
  // Find element containing NEW FIELD NOTE
  const elements = await page.$$('div');
  for (const el of elements) {
    const text = await page.evaluate(e => e.innerText, el);
    if (text && text.includes('NEW FIELD NOTE')) {
      await el.click();
      console.log('Clicked NEW FIELD NOTE element!');
      break;
    }
  }

  await delay(2500);
  console.log('2. Capturing Compose screen...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_2_compose.png') });

  // 3. In Compose screen, click MAKE NOTE
  console.log('3. Clicking MAKE NOTE button to navigate...');
  const composeElements = await page.$$('div');
  for (const el of composeElements) {
    const text = await page.evaluate(e => e.innerText, el);
    if (text && text.includes('MAKE NOTE')) {
      await el.click();
      console.log('Clicked MAKE NOTE element!');
      break;
    }
  }

  await delay(3000);
  console.log('3. Capturing Pressing / Result screen...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_3_result.png') });

  await browser.close();
  console.log('DONE!');
  process.exit(0);
}

main().catch(console.error);
