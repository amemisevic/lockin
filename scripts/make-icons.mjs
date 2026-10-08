// Writes icons/icon-180.png and icons/icon-512.png: full-bleed opaque square, flat #0062CC,
// white checkmark of two thick segments. iOS applies the rounded mask itself.
// Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x00, 0x62, 0xcc], FG = [255, 255, 255];
const CHECK = [[0.27, 0.53], [0.43, 0.69], [0.74, 0.35]]; // points as fractions of the size
const HALF_WIDTH = 0.05;

const CRC = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc32 = buf => { let c = ~0; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return ~c >>> 0; };

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function png(size) {
  const raw = Buffer.alloc(size * (1 + size * 3)); // filter byte + RGB per row
  const pts = CHECK.map(([x, y]) => [x * size, y * size]);
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    for (let x = 0; x < size; x++) {
      const d = Math.min(distToSegment(x + 0.5, y + 0.5, pts[0], pts[1]), distToSegment(x + 0.5, y + 0.5, pts[1], pts[2]));
      const a = Math.max(0, Math.min(1, HALF_WIDTH * size - d + 0.5)); // 1 px anti-aliased edge
      for (let c = 0; c < 3; c++) raw[row + 1 + x * 3 + c] = Math.round(BG[c] + (FG[c] - BG[c]) * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB, no alpha
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync(new URL('../icons/', import.meta.url), { recursive: true });
for (const size of [180, 512]) writeFileSync(new URL(`../icons/icon-${size}.png`, import.meta.url), png(size));
console.log('Wrote icons/icon-180.png and icons/icon-512.png');
