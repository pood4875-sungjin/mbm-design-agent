// PNG 색 줄이기(팔레트 PNG, 8비트 색인) — 용량 상한을 넘는 PNG 소재를 해상도 그대로 가볍게(11-15 노션 「사이트 내 용량 수정」).
//   예전 posterize(채널마다 16~64단계로 뭉침)는 사진·그라데이션에 띠가 생기고 파일도 트루컬러 PNG 라 덜 줄었다.
//   여기는 pngquant 와 같은 길: ① 그림에서 많이 쓰는 색 N개(≤256)를 미디안 컷으로 고르고 ② 오차 확산(Floyd–Steinberg)으로 색인을 매겨
//   ③ PLTE·tRNS 를 가진 색인 PNG 로 쓴다. 같은 그림이 트루컬러 PNG 의 대략 1/3~1/4 — 글자 경계·위치·크기는 그대로, 바뀌는 건 색 수뿐.
//   deflate 는 바깥에서 받는다(브라우저 CompressionStream('deflate') · node zlib.deflateSync) — 이 파일은 순수 계산.

/** rgba(Uint8ClampedArray|Uint8Array, w*h*4) → { palette: Uint8Array(n*4), index: Uint8Array(w*h) } */
export function quantize(rgba, w, h, colors = 256, { dither = true } = {}) {
  const n = w * h, N = Math.max(2, Math.min(256, colors | 0));
  // ① 표본(최대 약 6만 점) — 투명은 알파까지 한 상자로
  const step = Math.max(1, Math.floor(n / 60000));
  const pts = [];
  for (let i = 0; i < n; i += step) { const o = i * 4; pts.push([rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]]); }
  let boxes = [pts];
  while (boxes.length < N) {
    // 가장 넓은(범위 × 점 수) 상자를 가장 긴 축으로 가운데값에서 자른다
    let bi = -1, best = 0, axis = 0;
    for (let b = 0; b < boxes.length; b++) {
      const B = boxes[b]; if (B.length < 2) continue;
      for (let c = 0; c < 4; c++) { let lo = 255, hi = 0; for (const p of B) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; } const s = (hi - lo) * Math.sqrt(B.length); if (s > best) { best = s; bi = b; axis = c; } }
    }
    if (bi < 0) break;
    const B = boxes[bi].sort((p, q) => p[axis] - q[axis]), mid = B.length >> 1;
    boxes.splice(bi, 1, B.slice(0, mid), B.slice(mid));
  }
  const pal = boxes.filter(B => B.length).map(B => { const s = [0, 0, 0, 0]; for (const p of B) for (let c = 0; c < 4; c++) s[c] += p[c]; return s.map(v => Math.round(v / B.length)); });
  // 완전 투명·완전 불투명 끝값은 정확히(가장자리 띠·반투명 테두리 방지)
  for (const p of pal) { if (p[3] < 8) { p[3] = 0; } else if (p[3] > 247) p[3] = 255; }
  const P = pal.length, palette = new Uint8Array(P * 4); pal.forEach((p, i) => palette.set(p, i * 4));
  // ② 가까운 색 — 5·5·5·4비트 칸 캐시
  const cache = new Int16Array(1 << 19).fill(-1);
  const near = (r, g, b, a) => {
    const k = ((r >> 3) << 14) | ((g >> 3) << 9) | ((b >> 3) << 4) | (a >> 4);
    let v = cache[k]; if (v >= 0) return v;
    let bd = Infinity; v = 0;
    for (let i = 0; i < P; i++) { const o = i * 4, dr = r - palette[o], dg = g - palette[o + 1], db = b - palette[o + 2], da = a - palette[o + 3]; const d = dr * dr * 2 + dg * dg * 4 + db * db + da * da * 3; if (d < bd) { bd = d; v = i; } }
    cache[k] = v; return v;
  };
  const index = new Uint8Array(n);
  if (!dither) { for (let i = 0; i < n; i++) { const o = i * 4; index[i] = near(rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]); } return { palette, index }; }
  // Floyd–Steinberg — 두 줄 오차 버퍼(RGB 만, 알파는 확산하지 않는다: 글자·로고 가장자리 보존)
  let cur = new Float32Array((w + 2) * 3), nxt = new Float32Array((w + 2) * 3);
  const cl = v => v < 0 ? 0 : v > 255 ? 255 : v;
  for (let y = 0; y < h; y++) {
    nxt.fill(0);
    for (let x = 0; x < w; x++) {
      const i = y * w + x, o = i * 4, e = (x + 1) * 3;
      const r = cl(rgba[o] + cur[e]), g = cl(rgba[o + 1] + cur[e + 1]), b = cl(rgba[o + 2] + cur[e + 2]), a = rgba[o + 3];
      const v = near(r | 0, g | 0, b | 0, a); index[i] = v;
      const q = v * 4, er = r - palette[q], eg = g - palette[q + 1], eb = b - palette[q + 2];
      for (const [dx, arr, f] of [[1, cur, 7 / 16], [-1, nxt, 3 / 16], [0, nxt, 5 / 16], [1, nxt, 1 / 16]]) { const t = (x + 1 + dx) * 3; arr[t] += er * f; arr[t + 1] += eg * f; arr[t + 2] += eb * f; }
    }
    [cur, nxt] = [nxt, cur];
  }
  return { palette, index };
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8); dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length))); return out;
}

/** 색인 PNG 바이트. deflate: (Uint8Array) => Promise<Uint8Array>|Uint8Array (zlib 형식) */
export async function encodePng8({ palette, index }, w, h, deflate) {
  const P = palette.length / 4;
  const raw = new Uint8Array((w + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; raw.set(index.subarray(y * w, y * w + w), y * (w + 1) + 1); }   // 줄 필터 없음(색인 그림은 이게 제일 작다)
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer); dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const plte = new Uint8Array(P * 3), alpha = new Uint8Array(P); let lastT = -1;
  for (let i = 0; i < P; i++) { plte[i * 3] = palette[i * 4]; plte[i * 3 + 1] = palette[i * 4 + 1]; plte[i * 3 + 2] = palette[i * 4 + 2]; alpha[i] = palette[i * 4 + 3]; if (alpha[i] < 255) lastT = i; }
  const idat = await deflate(raw);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte)];
  if (lastT >= 0) parts.push(chunk('tRNS', alpha.subarray(0, lastT + 1)));
  parts.push(chunk('IDAT', idat instanceof Uint8Array ? idat : new Uint8Array(idat)), chunk('IEND', new Uint8Array(0)));
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// 브라우저 deflate(zlib) — CompressionStream 이 없으면 null(그때는 예전 posterize 로)
export const browserDeflate = typeof CompressionStream === 'function'
  ? async (u8) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer())
  : null;

// 용량 맞춤 사다리(app/adfit.js) — 디자인을 덜 건드리는 순서. 매체 형식·알파에 따라 단계 목록만 만든다(순수, 테스트용)
//   JPG 허용 · 알파 없음 → JPG 품질 0.92 → 0.45 / PNG 만 또는 알파 → 팔레트 PNG 256 → 128 → 64색(오차 확산) → 채널 16단계(마지막 수단)
//   그다음 단색 배경 + 같은 사다리. 해상도(제출 크기)는 어느 단계도 바꾸지 않는다
export function fitLadder(formats = [], alpha = false, { flat = false } = {}) {
  const jpgOk = formats.some(f => /^jpe?g$/.test(f)), pngOk = formats.includes('png');
  const out = [];
  if (jpgOk && !alpha) for (const q of flat ? [0.85, 0.72, 0.6, 0.5, 0.4] : [0.92, 0.85, 0.75, 0.65, 0.55, 0.45]) out.push({ format: 'jpg', quality: q, label: `${flat ? '단색 배경 + ' : ''}JPG 품질 ${q}` });
  if (pngOk && (!jpgOk || alpha)) {
    // 11-20 노션 「사이트 내 용량 수정」 재검수(11-17 [16] PSNR 7~8dB 낮음): 손실 적은 단계부터 — 채널 64·32단계(색 수는 그대로, 미세한 계조만) → 팔레트 PNG → 채널 16단계
    if (!flat) for (const q of [64, 32]) out.push({ format: 'png', quantize: q, label: `PNG 색 ${q}단계` });
    for (const c of flat ? [128, 64, 32] : [256, 128, 64]) out.push({ format: 'png', png8: c, label: `${flat ? '단색 배경 + ' : ''}PNG ${c}색` });
    out.push({ format: 'png', quantize: flat ? 8 : 16, label: `${flat ? '단색 배경 + ' : ''}PNG 색 ${flat ? 8 : 16}단계` });
  }
  return out;
}
