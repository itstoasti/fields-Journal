import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/deanfieldz/.gemini/antigravity/brain/7e424507-d11b-4a16-a840-4b7bea0592c2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 6060;

function takeShot(url, outputFilename) {
  return new Promise((resolve) => {
    const outFile = path.join(ARTIFACT_DIR, outputFilename);
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--window-size=390,844',
      '--virtual-time-budget=3000',
      `--screenshot=${outFile}`,
      url,
    ];

    console.log(`Starting capture: ${outputFilename}...`);
    const cp = spawn(CHROME_PATH, args, { stdio: 'ignore' });

    const timer = setTimeout(() => {
      try { cp.kill('SIGKILL'); } catch {}
      console.log(`Finished ${outputFilename}, exists: ${fs.existsSync(outFile)}`);
      resolve();
    }, 4000);

    cp.on('close', () => {
      clearTimeout(timer);
      console.log(`Process closed for ${outputFilename}, exists: ${fs.existsSync(outFile)}`);
      resolve();
    });
  });
}

async function main() {
  await takeShot(`http://127.0.0.1:${PORT}/compose`, 'captured_compose.png');
  await takeShot(`http://127.0.0.1:${PORT}/result?place=Kyoto%20Old%20District&number=01&year=2026`, 'captured_result.png');
  await takeShot(`http://127.0.0.1:${PORT}/`, 'captured_home.png');
}

main().catch(console.error);
