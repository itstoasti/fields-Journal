import { spawn } from 'node:child_process';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const delay = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  '--disable-gpu',
  '--remote-debugging-port=9888',
  '--window-size=400,860',
  'http://127.0.0.1:6060/compose'
], { stdio: 'ignore' });

let wsUrl = '';
for (let i = 0; i < 20; i++) {
  await delay(400);
  try {
    const listRes = await fetch('http://127.0.0.1:9888/json/list');
    const pages = await listRes.json();
    if (pages[0]?.webSocketDebuggerUrl) {
      wsUrl = pages[0].webSocketDebuggerUrl;
      break;
    }
  } catch {}
}

console.log('WS URL:', wsUrl);
const ws = new WebSocket(wsUrl);

ws.addEventListener('open', async () => {
  console.log('WS Open!');
  ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
  await delay(1000);
  console.log('Sending captureScreenshot...');
  ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } }));
});

ws.addEventListener('message', async (event) => {
  let text;
  if (typeof event.data === 'string') {
    text = event.data;
  } else if (event.data && typeof event.data.text === 'function') {
    text = await event.data.text();
  } else {
    text = Buffer.from(event.data).toString('utf8');
  }
  console.log('Got message len:', text.length, 'preview:', text.slice(0, 60));
  if (text.includes('"id":2')) {
    const json = JSON.parse(text);
    console.log('Screenshot received! base64 length:', json.result?.data?.length);
    import('node:fs').then(fs => {
      fs.writeFileSync('/Users/deanfieldz/.gemini/antigravity/brain/7e424507-d11b-4a16-a840-4b7bea0592c2/debug_screen_compose.png', Buffer.from(json.result.data, 'base64'));
      console.log('SAVED debug_screen_compose.png SUCCESSFULLY!');
      ws.close();
      chrome.kill();
      process.exit(0);
    });
  }
});
