import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 6060;
const ARTIFACT_DIR = '/Users/deanfieldz/.gemini/antigravity/brain/7e424507-d11b-4a16-a840-4b7bea0592c2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendCdp(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1000000);
  return new Promise((resolve, reject) => {
    const onMessage = async (event) => {
      try {
        let raw;
        if (typeof event.data === 'string') {
          raw = event.data;
        } else if (event.data && typeof event.data.text === 'function') {
          raw = await event.data.text();
        } else if (Buffer.isBuffer(event.data)) {
          raw = event.data.toString('utf8');
        } else {
          raw = String(event.data);
        }
        const msg = JSON.parse(raw);
        if (msg.id === id) {
          ws.removeEventListener('message', onMessage);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      } catch (err) {
        console.error('Error parsing CDP message:', err);
      }
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  console.log('Launching headless Chrome on port 9777...');
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--remote-debugging-port=9777',
      '--window-size=400,860',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let wsUrl = '';
  for (let i = 0; i < 20; i++) {
    await delay(400);
    try {
      const res = await fetch('http://127.0.0.1:9777/json/list');
      const pages = await res.json();
      if (pages[0]?.webSocketDebuggerUrl) {
        wsUrl = pages[0].webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  console.log('Connected to Chrome WebSocket');
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));

  await sendCdp(ws, 'Page.enable');
  await sendCdp(ws, 'Runtime.enable');

  // Seed sample notes
  console.log('1. Loading Home screen and seeding sample notes...');
  await sendCdp(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await delay(2000);

  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      try {
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
      } catch(e){}
    `,
  });

  // Reload Home to render 2-column note cards
  await sendCdp(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await delay(2500);

  console.log('Capturing Home screen with 2-column cards...');
  const homeShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'live_screen_home_rendered.png'), Buffer.from(homeShot.data, 'base64'));
  console.log('✓ Home screen captured');

  // 2. Compose Screen
  console.log('2. Loading Compose screen...');
  await sendCdp(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/compose` });
  await delay(2500);

  const composeShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'live_screen_compose_rendered.png'), Buffer.from(composeShot.data, 'base64'));
  console.log('✓ Compose screen captured');

  // 3. Result Screen
  console.log('3. Loading Result screen...');
  const resultUrl = `http://127.0.0.1:${PORT}/result?place=Kyoto%20Old%20District&number=01&year=2026&keywords=%5B%22Cedar%20trees%22%2C%22Temple%20bell%22%2C%22Dusk%20mist%22%5D&posterUri=` + encodeURIComponent('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80');
  await sendCdp(ws, 'Page.navigate', { url: resultUrl });
  await delay(2500);

  const resultShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'live_screen_result_rendered.png'), Buffer.from(resultShot.data, 'base64'));
  console.log('✓ Result screen captured');

  ws.close();
  chrome.kill();
  console.log('ALL APP SCREENSHOTS CAPTURED SUCCESSFULLY!');
  process.exit(0);
}

main().catch(console.error);
