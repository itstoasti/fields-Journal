import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPngBuffer(width, height, rgbaGenerator) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = rgbaGenerator(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrChunk = Buffer.alloc(13);
  ihdrChunk.writeUInt32BE(width, 0);
  ihdrChunk.writeUInt32BE(height, 4);
  ihdrChunk[8] = 8;
  ihdrChunk[9] = 6;
  ihdrChunk[10] = 0;
  ihdrChunk[11] = 0;
  ihdrChunk[12] = 0;

  const ihdr = makeChunk('IHDR', ihdrChunk);
  const idat = makeChunk('IDAT', compressedData);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcPayload = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcPayload);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const assetsDir = path.resolve(process.cwd(), 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Icon (512x512)
const iconPng = createPngBuffer(512, 512, (x, y) => {
  const dx = x - 256;
  const dy = y - 256;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  let r = 244, g = 239, b = 230, a = 255;
  if (dist > 220 && dist <= 236) {
    return [28, 25, 23, 220];
  }
  if (dist > 236) {
    return [0, 0, 0, 0];
  }
  const noise = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  r = Math.min(255, Math.max(0, r + Math.floor(noise * 8 - 4)));
  g = Math.min(255, Math.max(0, g + Math.floor(noise * 8 - 4)));
  b = Math.min(255, Math.max(0, b + Math.floor(noise * 8 - 4)));

  if (y > 230 && y < 340) {
    const peak1 = Math.abs(x - 210) < (340 - y) * 0.9;
    const peak2 = Math.abs(x - 300) < (340 - y) * 0.7;
    if (peak1 || peak2) {
      return [136, 48, 37, 240];
    }
  }

  if (y >= 350 && y <= 356 && x >= 160 && x <= 352) {
    return [28, 25, 23, 230];
  }

  return [r, g, b, a];
});
fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconPng);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), iconPng);

// 2. Splash (1024x1024)
const splashPng = createPngBuffer(1024, 1024, (x, y) => {
  let r = 244, g = 239, b = 230;
  const noise = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  r = Math.min(255, Math.max(0, r + Math.floor(noise * 6 - 3)));
  g = Math.min(255, Math.max(0, g + Math.floor(noise * 6 - 3)));
  b = Math.min(255, Math.max(0, b + Math.floor(noise * 6 - 3)));

  if (x >= 432 && x <= 592 && y >= 470 && y <= 554) {
    const border = x <= 436 || x >= 588 || y <= 474 || y >= 550;
    if (border) {
      return [120, 113, 108, 180];
    }
  }

  return [r, g, b, 255];
});
fs.writeFileSync(path.join(assetsDir, 'splash.png'), splashPng);

// 3. Paper Tile (256x256)
const paperTilePng = createPngBuffer(256, 256, (x, y) => {
  let r = 244, g = 239, b = 230;
  const noise = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  r = Math.min(255, Math.max(0, r + Math.floor(noise * 8 - 4)));
  g = Math.min(255, Math.max(0, g + Math.floor(noise * 8 - 4)));
  b = Math.min(255, Math.max(0, b + Math.floor(noise * 8 - 4)));
  return [r, g, b, 255];
});
fs.writeFileSync(path.join(assetsDir, 'paper-tile.png'), paperTilePng);

// 4. Empty Stamp (200x200)
const emptyStampPng = createPngBuffer(200, 200, (x, y) => {
  const isOuter = x >= 20 && x <= 180 && y >= 20 && y <= 180;
  const isInner = x >= 26 && x <= 174 && y >= 26 && y <= 174;
  if (isOuter && !isInner) {
    if ((x + y) % 8 < 6) {
      return [120, 113, 108, 100];
    }
  }
  if (y > 90 && y < 140 && x > 50 && x < 150) {
    const peak = Math.abs(x - 100) < (140 - y) * 0.8;
    if (peak && (y % 4 < 2)) {
      return [136, 48, 37, 70];
    }
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(assetsDir, 'empty-stamp.png'), emptyStampPng);

// 5. Press Texture (256x256)
const pressTexturePng = createPngBuffer(256, 256, (x, y) => {
  const noise = (Math.sin(x * 37.1 + y * 91.7) * 43758.5453) % 1;
  const alpha = Math.floor(noise * 30);
  return [28, 25, 23, alpha];
});
fs.writeFileSync(path.join(assetsDir, 'press-texture.png'), pressTexturePng);

console.log('Successfully generated assets in /assets');
