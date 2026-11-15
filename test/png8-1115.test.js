// 11-15 노션 「사이트 내 용량 수정」 — 팔레트 PNG(색인 8비트)로 해상도 그대로 용량 줄이기 + 용량 맞춤 사다리
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, inflateSync } from 'node:zlib';
import { quantize, encodePng8, fitLadder } from '../core/png8.js';

// 가로 그라데이션 + 투명 모서리 + 흰 글자 같은 띠 — 사진·지면을 흉내 낸 그림
function sample(w = 320, h = 120) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4; d[o] = Math.round(20 + 200 * x / w); d[o + 1] = Math.round(60 + 120 * y / h); d[o + 2] = 200 - Math.round(150 * x / w); d[o + 3] = 255;
    if (y > 40 && y < 60 && x > 30 && x < 200 && (x % 7) < 4) { d[o] = d[o + 1] = d[o + 2] = 255; }
    if (x < 10 && y < 10) d[o + 3] = 0;
  }
  return d;
}
const chunks = buf => { const out = {}; let o = 8; while (o < buf.length) { const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8); (out[type] ??= []).push(buf.subarray(o + 8, o + 8 + len)); o += 12 + len; } return out; };

test('팔레트 PNG: 색 수 ≤ N · 색인 PNG(색형 3) · 투명은 tRNS · 해상도 그대로 · 원래 색과 평균 오차가 작다', async () => {
  const w = 320, h = 120, rgba = sample(w, h);
  for (const N of [256, 64]) {
    const q = quantize(rgba, w, h, N);
    assert.ok(q.palette.length / 4 <= N);
    const png = Buffer.from(await encodePng8(q, w, h, u => deflateSync(u, { level: 9 })));
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const c = chunks(png);
    assert.equal(c.IHDR[0].readUInt32BE(0), w); assert.equal(c.IHDR[0].readUInt32BE(4), h); assert.equal(c.IHDR[0][9], 3, '색인 PNG');
    assert.ok(c.tRNS, '투명 모서리가 있으면 tRNS');
    const raw = inflateSync(Buffer.concat(c.IDAT)); assert.equal(raw.length, (w + 1) * h);
    // 되살린 색과 원본 차이(채널 평균) — 256색은 4 이하, 64색도 8 이하(오차 확산이라 점마다는 흔들려도 평균은 가깝다)
    let err = 0, transparentOk = true;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = raw[y * (w + 1) + 1 + x], o = (y * w + x) * 4, p = i * 4;
      for (let k = 0; k < 3; k++) err += Math.abs(q.palette[p + k] - rgba[o + k]);
      if (rgba[o + 3] === 0 && q.palette[p + 3] !== 0) transparentOk = false;
      if (rgba[o + 3] === 255 && q.palette[p + 3] !== 255) transparentOk = false;
    }
    assert.ok(transparentOk, '투명·불투명 경계는 정확히');
    assert.ok(err / (w * h * 3) < (N === 256 ? 4 : 8), `평균 오차 ${(err / (w * h * 3)).toFixed(2)}`);
  }
});

test('팔레트 PNG 는 같은 그림의 트루컬러 PNG(필터 없음 deflate) 보다 작다', async () => {
  const w = 320, h = 120, rgba = sample(w, h);
  const q = quantize(rgba, w, h, 128);
  const p8 = (await encodePng8(q, w, h, u => deflateSync(u, { level: 9 }))).length;
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const tc = deflateSync(raw, { level: 9 }).length;
  assert.ok(p8 < tc * 0.6, `팔레트 ${p8} · 트루컬러 ${tc}`);
});

test('용량 맞춤 사다리: JPG 허용·알파 없음이면 JPG 품질만, PNG 만(비즈보드·리멤버)이면 팔레트 256→128→64색 뒤 16단계 — 치수는 어느 단계도 안 바꾼다', () => {
  const j = fitLadder(['jpg', 'png'], false);
  assert.deepEqual(j.map(s => s.quality), [0.92, 0.85, 0.75, 0.65, 0.55, 0.45]); assert.ok(j.every(s => s.format === 'jpg'));
  const p = fitLadder(['png'], false);
  assert.deepEqual(p.map(s => s.png8 ?? `q${s.quantize}`), [256, 128, 64, 'q16']);
  assert.deepEqual(fitLadder(['jpg', 'png'], true).map(s => s.format), ['png', 'png', 'png', 'png'], '알파가 있으면 JPG 로 안 바꾼다');
  assert.ok(fitLadder(['png'], false, { flat: true }).every(s => s.label.startsWith('단색 배경')));
  for (const s of [...j, ...p]) assert.ok(!('w' in s) && !('scale' in s));
});
