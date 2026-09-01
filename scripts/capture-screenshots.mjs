import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = '/Users/deanfieldz/.gemini/antigravity/brain/7e424507-d11b-4a16-a840-4b7bea0592c2';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendCdp(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1000000);
  return new Promise((resolve, reject) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.off('message', handler);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  console.log('Launching headless Chrome with DevTools Protocol...');
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--remote-debugging-port=9222',
      '--window-size=390,844',
      '--hide-scrollbars',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  await delay(1500);

  // Get WebSocket debugger URL
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await listRes.json();
  const wsUrl = pages[0]?.webSocketDebuggerUrl;
  if (!wsUrl) {
    throw new Error('No Chrome WebSocket URL found');
  }

  console.log('Connecting to Chrome CDP at:', wsUrl);
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.on('open', resolve));

  // Enable Page and Runtime
  await sendCdp(ws, 'Page.enable');
  await sendCdp(ws, 'Runtime.enable');
  await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  console.log('Navigating to Home screen http://localhost:8085 ...');
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:8085/' });

  // Wait for React bundle to compile & load
  console.log('Waiting for Expo web application to compile and mount...');
  let mounted = false;
  for (let i = 0; i < 30; i++) {
    await delay(1000);
    try {
      const evalRes = await sendCdp(ws, 'Runtime.evaluate', {
        expression: 'document.body.innerText',
      });
      const text = evalRes?.result?.value || '';
      if (text.includes('FIELD NOTES')) {
        mounted = true;
        console.log('App successfully mounted! Content detected:', text.slice(0, 60));
        break;
      }
    } catch {}
  }

  if (!mounted) {
    console.warn('Warning: FIELD NOTES text not detected within 30s, continuing anyway.');
  }

  // 1. Seed sample field notes for realistic 2-column mockup display
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
            place: 'Kyoto Pagoda',
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
            place: 'Mount Fuji Lake',
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

  // Reload to pick up local storage
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:8085/' });
  await delay(2500);

  // Capture Home Screen Screenshot
  console.log('Capturing Home screen screenshot...');
  const homeScreenShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const homePath = path.join(ARTIFACT_DIR, 'live_screen_home.png');
  fs.writeFileSync(homePath, Buffer.from(homeScreenShot.data, 'base64'));
  console.log('✓ Saved:', homePath);

  // 2. Navigate to Compose Screen
  console.log('Navigating to Compose screen http://localhost:8085/compose ...');
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:8085/compose' });
  await delay(2000);

  // Preload sample image in compose
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      // Inject sample image into compose screen state if available
      const sampleImg = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80';
      // Find image element or trigger mock
    `,
  });
  await delay(1500);

  console.log('Capturing Compose screen screenshot...');
  const composeScreenShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const composePath = path.join(ARTIFACT_DIR, 'live_screen_compose.png');
  fs.writeFileSync(composePath, Buffer.from(composeScreenShot.data, 'base64'));
  console.log('✓ Saved:', composePath);

  // 3. Navigate to Result Screen with sample poster
  console.log('Navigating to Result screen http://localhost:8085/result ...');
  await sendCdp(ws, 'Page.navigate', {
    url: 'http://localhost:8085/result?place=Kyoto%20Old%20District&number=01&year=2026&keywords=%5B%22Cedar%20trees%22%2C%22Temple%20bell%22%2C%22Dusk%20mist%22%5D&posterUri=' + encodeURIComponent('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80'),
  });
  await delay(2000);

  console.log('Capturing Result screen screenshot...');
  const resultScreenShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const resultPath = path.join(ARTIFACT_DIR, 'live_screen_result.png');
  fs.writeFileSync(resultPath, Buffer.from(resultScreenShot.data, 'base64'));
  console.log('✓ Saved:', resultPath);

  console.log('\nAll live app screenshots captured successfully!');

  // Close chrome
  ws.close();
  chromeProcess.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});
