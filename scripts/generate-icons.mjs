/**
 * Emit minimal valid PNGs for the extension (solid color, exact dimensions).
 * Run: node scripts/generate-icons.mjs
 */
import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'icons');

// RGBA: zen accent-ish green on dark
const r = 0x00, g = 0xe5, b = 0xa0, a = 0xff;

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = crc32_buf(body);
  return Buffer.concat([len, body, int32(crc)]);
}

// CRC32 (PNG)
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32_buf(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function int32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function pngForSize(w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const raw = Buffer.alloc((1 + w * 4) * h);
  const row = Buffer.alloc(1 + w * 4);
  row[0] = 0; // filter None
  for (let x = 0; x < w; x++) {
    row[1 + x * 4] = r;
    row[1 + x * 4 + 1] = g;
    row[1 + x * 4 + 2] = b;
    row[1 + x * 4 + 3] = a;
  }
  for (let y = 0; y < h; y++) {
    row.copy(raw, y * (1 + w * 4));
  }

  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const sizes = [16, 48, 128];
async function main() {
  try {
    await stat(outDir);
  } catch {
    await mkdir(outDir, { recursive: true });
  }
  for (const s of sizes) {
    const path = join(outDir, `icon${s}.png`);
    const png = pngForSize(s, s);
    await new Promise((resolve, reject) => {
      const ws = createWriteStream(path);
      ws.on('error', reject);
      ws.on('finish', resolve);
      ws.end(png);
    });
  }
  console.log('Wrote', sizes.map((s) => `icons/icon${s}.png`).join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
