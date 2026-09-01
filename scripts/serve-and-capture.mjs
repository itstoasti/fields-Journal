import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 4040;
const DIST_DIR = path.resolve(process.cwd(), 'web-dist');
const ARTIFACT_DIR = '/Users/deanfieldz/.gemini/antigravity/brain/7e424507-d11b-4a16-a840-4b7bea0592c2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/' || reqUrl === '') {
      reqUrl = '/index.html';
    }

    let filePath = path.join(DIST_DIR, reqUrl);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      // SPA Fallback to index.html
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (e) {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Static server running at http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

async function captureScreenWithChrome(url, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--window-size=400,860',
      '--force-device-scale-factor=2',
      `--screenshot=${outputPath}`,
      '--virtual-time-budget=3000',
      url,
    ];

    const cp = spawn(CHROME_PATH, args);
    cp.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`✓ Captured: ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
        resolve();
      } else {
        reject(new Error(`Chrome failed with code ${code}`));
      }
    });
  });
}

async function main() {
  const server = await startStaticServer();

  console.log('Capturing Home screen...');
  const homePath = path.join(ARTIFACT_DIR, 'app_screen_home.png');
  await captureScreenWithChrome(`http://127.0.0.1:${PORT}/`, homePath);

  console.log('Capturing Compose screen...');
  const composePath = path.join(ARTIFACT_DIR, 'app_screen_compose.png');
  await captureScreenWithChrome(`http://127.0.0.1:${PORT}/compose`, composePath);

  console.log('Capturing Result screen...');
  const resultPath = path.join(ARTIFACT_DIR, 'app_screen_result.png');
  await captureScreenWithChrome(`http://127.0.0.1:${PORT}/result?place=Kyoto%20Old%20District&number=01&year=2026`, resultPath);

  server.close();
  console.log('All screen captures complete!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
