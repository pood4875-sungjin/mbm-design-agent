// 의존성 없는 PNG 읽기·쓰기(node zlib) — headless Chrome 스크린샷(8bit RGB/RGBA, 비인터레이스)을 픽셀로 읽고, 잘라낸 조각을 다시 PNG 로 쓴다.
//   scripts/kv-seam-audit.mjs(키비주얼 이음 전수 감사)가 쓴다. 8bit 그레이·그레이+α·RGB·RGBA · 팔레트 없음 · 인터레이스 없음.
import { inflateSync, deflateSync } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = buf => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

// → { w, h, data: Uint8Array(w*h*4) RGBA }
export function decodePng(buf) {
  if (!SIG.equals(buf.subarray(0, 8))) throw new Error('PNG 아님');
  let p = 8, w = 0, h = 0, depth = 8, ctype = 6, interlace = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), body = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); depth = body[8]; ctype = body[9]; interlace = body[12]; }
    else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || interlace !== 0 || ![0, 2, 4, 6].includes(ctype)) throw new Error(`지원 안 함: depth ${depth} ctype ${ctype} interlace ${interlace}`);
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ctype], stride = w * ch;
  const raw = inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], base = y * (stride + 1) + 1;
    for (let i = 0; i < stride; i++) {
      const x = raw[base + i], a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[i] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, s = x * ch;
      if (ch === 1) { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = 255; }
      else if (ch === 2) { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = cur[s + 1]; }
      else if (ch === 3) { out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = 255; }
      else { out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = cur[s + 3]; }
    }
    [prev, cur] = [cur, prev];
  }
  return { w, h, data: out };
}

// RGBA 픽셀 → PNG 버퍼(필터 0, RGB 로 쓴다 — 스크린샷 조각은 불투명)
export function encodePng({ w, h, data }, { alpha = false } = {}) {
  const ch = alpha ? 4 : 3, stride = w * ch, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, o = y * (stride + 1) + 1 + x * ch; raw[o] = data[i]; raw[o + 1] = data[i + 1]; raw[o + 2] = data[i + 2]; if (alpha) raw[o + 3] = data[i + 3]; }
  }
  const chunk = (type, body) => { const t = Buffer.from(type, 'latin1'); const len = Buffer.alloc(4); len.writeUInt32BE(body.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, body]))); return Buffer.concat([len, t, body, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// 조각 잘라내기(캔버스 밖은 흰색)
export function cropPng(img, x0, y0, cw, ch) {
  const out = new Uint8Array(cw * ch * 4).fill(255);
  for (let y = 0; y < ch; y++) { const sy = y0 + y; if (sy < 0 || sy >= img.h) continue; for (let x = 0; x < cw; x++) { const sx = x0 + x; if (sx < 0 || sx >= img.w) continue; const s = (sy * img.w + sx) * 4, d = (y * cw + x) * 4; out[d] = img.data[s]; out[d + 1] = img.data[s + 1]; out[d + 2] = img.data[s + 2]; out[d + 3] = img.data[s + 3]; } }
  return { w: cw, h: ch, data: out };
}
export const pixelAt = (img, x, y) => { const xi = Math.min(img.w - 1, Math.max(0, Math.round(x))), yi = Math.min(img.h - 1, Math.max(0, Math.round(y))); const i = (yi * img.w + xi) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
