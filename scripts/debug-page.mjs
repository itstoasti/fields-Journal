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
  page.on('console', (msg) => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.error('[BROWSER PAGE ERROR]', err.message, err.stack));

  console.log('Navigating directly to /compose...');
  await page.goto(`http://127.0.0.1:${PORT}/compose`, { waitUntil: 'networkidle0' });
  await delay(2000);

  const html = await page.evaluate(() => document.body.innerHTML);
  console.log('Body HTML length:', html.length, 'preview:', html.slice(0, 300));

  await browser.close();
  process.exit(0);
}

main().catch(console.error);
