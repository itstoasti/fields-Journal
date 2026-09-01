import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PORT = 5050;
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
      console.log(`Server listening on port ${PORT}`);
      resolve(server);
    });
  });
}

function captureUrl(url, outputFile) {
  const cmd = `"${CHROME_PATH}" --headless=new --disable-gpu --window-size=390,844 --screenshot="${outputFile}" "${url}"`;
  console.log(`Capturing: ${url} -> ${outputFile}`);
  try {
    execSync(cmd, { stdio: 'ignore' });
    if (fs.existsSync(outputFile)) {
      console.log(`✓ Success: ${outputFile} (${fs.statSync(outputFile).size} bytes)`);
    }
  } catch (e) {
    console.error(`Failed to capture ${url}:`, e.message);
  }
}

async function main() {
  const server = await startServer();

  // 1. Home screen
  captureUrl(
    `http://127.0.0.1:${PORT}/`,
    path.join(ARTIFACT_DIR, 'live_screen_home.png')
  );

  // 2. Compose screen
  captureUrl(
    `http://127.0.0.1:${PORT}/compose`,
    path.join(ARTIFACT_DIR, 'live_screen_compose.png')
  );

  // 3. Result screen
  captureUrl(
    `http://127.0.0.1:${PORT}/result?place=Kyoto%20Old%20District&number=01&year=2026&keywords=%5B%22Cedar%20trees%22%2C%22Temple%20bell%22%2C%22Dusk%20mist%22%5D`,
    path.join(ARTIFACT_DIR, 'live_screen_result.png')
  );

  // 4. Settings screen
  captureUrl(
    `http://127.0.0.1:${PORT}/settings`,
    path.join(ARTIFACT_DIR, 'live_screen_settings.png')
  );

  server.close();
  console.log('All screen captures finished!');
}

main().catch(console.error);
