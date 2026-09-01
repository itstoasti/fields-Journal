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
      `--screenshot=${outFile}`,
      url,
    ];

    console.log(`Starting capture: ${outputFilename} for ${url}...`);
    const cp = spawn(CHROME_PATH, args);

    cp.on('close', (code) => {
      console.log(`Process closed for ${outputFilename} (code ${code}), exists: ${fs.existsSync(outFile)}, size: ${fs.existsSync(outFile) ? fs.statSync(outFile).size : 0}`);
      resolve();
    });
  });
}

async function main() {
  console.log('Launching parallel screenshot captures...');
  await Promise.all([
    takeShot(`http://127.0.0.1:${PORT}/compose`, 'captured_compose_live.png'),
    takeShot(`http://127.0.0.1:${PORT}/result?place=Kyoto%20Old%20District&number=01&year=2026&keywords=%5B%22Cedar%20trees%22%2C%22Temple%20bell%22%2C%22Dusk%20mist%22%5D&posterUri=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1503899036084-c55cdd92da26%3Fw%3D800`, 'captured_result_live.png'),
    takeShot(`http://127.0.0.1:${PORT}/settings`, 'captured_settings_live.png'),
  ]);
  console.log('All parallel captures finished!');
}

main().catch(console.error);
