import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 4050;
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

function sendCdp(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1000000);
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', onMessage);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function captureScreens() {
  const server = await startStaticServer();

  console.log('Launching Chrome with CDP on port 9444...');
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--remote-debugging-port=9444',
      '--window-size=400,860',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let wsUrl = '';
  for (let i = 0; i < 20; i++) {
    await delay(400);
    try {
      const listRes = await fetch('http://127.0.0.1:9444/json/list');
      const pages = await listRes.json();
      if (pages[0]?.webSocketDebuggerUrl) {
        wsUrl = pages[0].webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));

  await sendCdp(ws, 'Page.enable');
  await sendCdp(ws, 'Runtime.enable');

  // Navigate to root to initialize origin for localStorage
  await sendCdp(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await delay(1200);

  // 1. Capture Empty Home Screen
  console.log('Capturing empty Home screen...');
  const emptyHomeShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'live_screen_home_empty.png'), Buffer.from(emptyHomeShot.data, 'base64'));

  // 2. Seed notes into localStorage and capture 2-column Grid Home Screen
  console.log('Seeding notes for 2-column grid Home screen...');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
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
          height: 1200
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
          height: 1200
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
          height: 1200
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
          height: 1200
        }
      ];
      localStorage.setItem('fn_saved_notes_json', JSON.stringify(sampleNotes));
      localStorage.setItem('fn_privacy_consented_v1', 'true');
    `,
  });

  await sendCdp(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await delay(1800);

  const homeGridShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'live_screen_home_grid.png'), Buffer.from(homeGridShot.data, 'base64'));
  console.log('✓ Home 2-column grid screen captured');

  // 3. Compose Screen with Taped Photo Frame & Boxed Table
  console.log('Navigating to Compose screen...');
  await sendCdp(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/compose` });
  await delay(1800);

  const composeShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'live_screen_compose.png'), Buffer.from(composeShot.data, 'base64'));
  console.log('✓ Compose screen captured');

  // 4. Result Screen with 4:3 Poster
  console.log('Navigating to Result screen...');
  const resultUrl = `http://127.0.0.1:${PORT}/result?place=Kyoto%20Old%20District&number=01&year=2026&keywords=%5B%22Cedar%20trees%22%2C%22Temple%20bell%22%2C%22Dusk%20mist%22%5D&posterUri=` + encodeURIComponent('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80');
  await sendCdp(ws, 'Page.navigate', { url: resultUrl });
  await delay(1800);

  const resultShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'live_screen_result.png'), Buffer.from(resultShot.data, 'base64'));
  console.log('✓ Result screen captured');

  ws.close();
  chrome.kill();
  server.close();
  console.log('ALL LIVE SCREENSHOTS SUCCESSFULLY CAPTURED!');
}

captureScreens().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
