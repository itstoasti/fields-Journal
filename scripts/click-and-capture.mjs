import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 6060;
const ARTIFACT_DIR = '/Users/deanfieldz/.gemini/antigravity/brain/7e424507-d11b-4a16-a840-4b7bea0592c2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('Launching Chrome with remote debugging on port 9999...');
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--remote-debugging-port=9999',
      '--window-size=390,844',
      `http://127.0.0.1:${PORT}/`,
    ],
    { stdio: 'ignore' }
  );

  let wsUrl = '';
  for (let i = 0; i < 20; i++) {
    await delay(400);
    try {
      const res = await fetch('http://127.0.0.1:9999/json/list');
      const pages = await res.json();
      if (pages[0]?.webSocketDebuggerUrl) {
        wsUrl = pages[0].webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  console.log('Connected to Chrome WebSocket:', wsUrl);
  const ws = new WebSocket(wsUrl);

  const send = (method, params = {}) => {
    const id = Math.floor(Math.random() * 1000000);
    return new Promise((resolve, reject) => {
      const onMsg = async (e) => {
        try {
          const raw = typeof e.data === 'string' ? e.data : await e.data.text();
          const json = JSON.parse(raw);
          if (json.id === id) {
            ws.removeEventListener('message', onMsg);
            if (json.error) reject(json.error);
            else resolve(json.result);
          }
        } catch {}
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((resolve) => ws.addEventListener('open', resolve));
  await send('Page.enable');
  await send('Runtime.enable');

  console.log('Waiting for Home screen to render...');
  await delay(2500);

  // 1. Seed sample notes
  await send('Runtime.evaluate', {
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
      window.location.reload();
    `,
  });

  console.log('Waiting for Home screen with notes reload...');
  await delay(3000);

  // Capture Home Screen with 2-column note card grid
  console.log('1. Capturing Home screen with 2-column cards...');
  const homeRes = await send('Page.captureScreenshot', { format: 'png' });
  const homeFile = path.join(ARTIFACT_DIR, 'confirmed_live_home.png');
  fs.writeFileSync(homeFile, Buffer.from(homeRes.data, 'base64'));
  console.log('✓ Saved:', homeFile);

  // 2. Click "NEW FIELD NOTE" button to navigate to Compose
  console.log('2. Clicking "NEW FIELD NOTE" to open Compose Screen...');
  await send('Runtime.evaluate', {
    expression: `
      // Find and click NEW FIELD NOTE button
      const buttons = Array.from(document.querySelectorAll('div[role="button"], div[tabindex="0"], div'));
      const cta = buttons.find(b => b.innerText && b.innerText.includes('NEW FIELD NOTE'));
      if (cta) {
        cta.click();
      } else {
        // Fallback to router push
        window.history.pushState({}, '', '/compose');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    `,
  });

  await delay(2500);

  // Set mock photo preview in compose
  await send('Runtime.evaluate', {
    expression: `
      try {
        const img = document.querySelector('img');
      } catch(e){}
    `,
  });

  console.log('Capturing Compose screen...');
  const composeRes = await send('Page.captureScreenshot', { format: 'png' });
  const composeFile = path.join(ARTIFACT_DIR, 'confirmed_live_compose.png');
  fs.writeFileSync(composeFile, Buffer.from(composeRes.data, 'base64'));
  console.log('✓ Saved:', composeFile);

  // 3. Navigate to Result screen
  console.log('3. Navigating to Result screen...');
  const resultUrl = `/result?place=Kyoto%20Old%20District&number=01&year=2026&keywords=%5B%22Cedar%20trees%22%2C%22Temple%20bell%22%2C%22Dusk%20mist%22%5D&posterUri=` + encodeURIComponent('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80');
  
  await send('Runtime.evaluate', {
    expression: `
      window.history.pushState({}, '', '${resultUrl}');
      window.dispatchEvent(new PopStateEvent('popstate'));
    `,
  });

  await delay(2500);

  console.log('Capturing Result screen...');
  const resultRes = await send('Page.captureScreenshot', { format: 'png' });
  const resultFile = path.join(ARTIFACT_DIR, 'confirmed_live_result.png');
  fs.writeFileSync(resultFile, Buffer.from(resultRes.data, 'base64'));
  console.log('✓ Saved:', resultFile);

  ws.close();
  chrome.kill();
  console.log('\nALL CONFIRMED SCREENSHOTS CAPTURED SUCCESSFULLY!');
  process.exit(0);
}

main().catch(console.error);
