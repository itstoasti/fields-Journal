import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 6060;
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

function startServer() {
  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/' || reqUrl === '') reqUrl = '/index.html';

    let filePath = path.join(DIST_DIR, reqUrl);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Server listening on http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

function capture(url, outputFile) {
  return new Promise((resolve) => {
    const cp = spawn(CHROME_PATH, [
      '--headless=new',
      '--disable-gpu',
      '--window-size=390,844',
      `--screenshot=${outputFile}`,
      url,
    ], { stdio: 'ignore' });

    const timer = setTimeout(() => {
      try { cp.kill(); } catch {}
      resolve();
    }, 6000);

    cp.on('close', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function main() {
  const server = await startServer();

  console.log('1. Capturing Compose Screen...');
  const composePath = path.join(ARTIFACT_DIR, 'live_screen_compose.png');
  await capture(`http://127.0.0.1:${PORT}/compose`, composePath);
  console.log('✓ Compose captured:', fs.existsSync(composePath));

  console.log('2. Capturing Result Screen...');
  const resultPath = path.join(ARTIFACT_DIR, 'live_screen_result.png');
  await capture(`http://127.0.0.1:${PORT}/result?place=Kyoto%20Old%20District&number=01&year=2026`, resultPath);
  console.log('✓ Result captured:', fs.existsSync(resultPath));

  console.log('3. Capturing Settings Screen...');
  const settingsPath = path.join(ARTIFACT_DIR, 'live_screen_settings.png');
  await capture(`http://127.0.0.1:${PORT}/settings`, settingsPath);
  console.log('✓ Settings captured:', fs.existsSync(settingsPath));

  server.close();
  console.log('All screenshots completed successfully!');
  process.exit(0);
}

main().catch(console.error);
