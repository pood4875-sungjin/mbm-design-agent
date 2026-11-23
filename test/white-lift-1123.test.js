// 11-23 사용자 「배경이 하얀색일 때 비주얼이 잘 안 보이는 경우 보완」 + 리멤버 「차단」: 흰 바탕 그림의 변을 그대로 지면으로 쓰면 흰 종이(#FFFFFF — 리멤버 금지색).
//   CANON.whiteLift — 그림 속 유채색의 옅은 틴트 지면(kv-edge-tint), 배치(seamless)는 그대로
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveField } from '../core/field.js';
import { normalizeStyle } from '../core/style.js';
import { lintArtifact } from '../core/lint.js';
const edge = hex => ({ hex, from: hex, to: hex, opaque: 1, rough: 0, std: 0, flat: true });
const kv = (edges, colors) => ({ ar: 1.3, px: [900, 700], colors, field: { kind: 'illust', opaque: 1, lum: 0.8, sat: 0.3, flatEdges: 4, edges } });
const st = (meta, extra = {}) => normalizeStyle({ colors: ['#2456D6'], keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: meta, ...extra });
const W = edge('#FFFFFF');

test('흰 바탕 그림 → 그림 유채색 옅은 틴트 지면, 흰색 아님', () => {
  const f = resolveField(st(kv({ top: W, bottom: W, left: W, right: edge('#146E32') }, ['#146E32', '#2FBB61', '#9BE6B5'])), { facing: 'left' });
  assert.equal(f.source, 'kv-edge-tint');
  assert.notEqual(f.stops[0], '#FFFFFF');
  assert.equal(f.seamless, true, '배치는 흰 바탕 그림 그대로');
  assert.equal(f.text, '#000000');
});

test('틴트 지면은 리멤버 금지색(흰·근접 흰) 판정에 안 걸린다', () => {
  const f = resolveField(st(kv({ top: W, bottom: W, left: W, right: W }, ['#146E32'])), { facing: 'left' });
  const medium = { backgroundColors: { banned: ['#FFFFFF', '#000000', '#FF5414', '#F7F7F0', '#E8E7E0'] } };
  const r = lintArtifact({ spec: { id: 't', w: 100, h: 100, format: ['png'] }, medium, measure: { w: 100, h: 100, format: 'png', bgColors: [f.stops[0]] } });
  const r0 = lintArtifact({ spec: { id: 't', w: 100, h: 100, format: ['png'] }, medium, measure: { w: 100, h: 100, format: 'png', bgColors: ['#FFFFFF'] } });
  assert.ok(r0.issues.some(i => i.code === 'bg-banned'), '흰색이면 차단(대조)');
  assert.ok(!r.issues.some(i => /bg-banned/.test(i.code)), JSON.stringify(r.issues));
});

test('그림에 유채색이 없으면 브랜드색 틴트', () => {
  const f = resolveField(st(kv({ top: W, bottom: W, left: W, right: W }, ['#FFFFFF', '#888888'])), { facing: 'left' });
  assert.equal(f.source, 'kv-edge-tint');
});

test('밝지만 색 있는 바탕(하늘색)은 그대로 kv-edge', () => {
  const B = edge('#BFE0FF');
  const f = resolveField(st(kv({ top: B, bottom: B, left: B, right: B }, ['#1579E9'])), { facing: 'left' });
  assert.equal(f.source, 'kv-edge');
});

test('손으로 고른 흰색은 그대로', () => {
  const f = resolveField(st(kv({ top: W, bottom: W, left: W, right: W }, ['#146E32']), { background: { color: '#FFFFFF' } }), { facing: 'left' });
  assert.equal(f.stops[0].toUpperCase(), '#FFFFFF');
});

// 11-23 사용자 「비주얼 부분만 하얗게 되면 어색해 — 자연스럽게 연결」: 틴트 지면 위 흰 바탕 그림 층은 곱하기로 섞어 흰 칸이 지면에 녹는다
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
test('틴트 지면이면 그림 층이 mix-blend-mode:multiply, 아니면 없음', () => {
  const specs = adSpecEntries(), ctx = createContext({ client: '동서식품', main: '동서식품 채용' }, 'recruit');
  const whiteKv = st(kv({ top: W, bottom: W, left: W, right: edge('#146E32') }, ['#146E32', '#2FBB61']));
  const html = renderAd(ctx, whiteKv, specs['remember-job-side-pc']);
  assert.match(html, /data-field-source="kv-edge-tint"/);
  assert.match(html, /mix-blend-mode:multiply" data-blend="multiply"/);
  const B = edge('#BFE0FF');
  const plain = renderAd(ctx, st(kv({ top: B, bottom: B, left: B, right: B }, ['#1579E9'])), specs['remember-job-side-pc']);
  assert.doesNotMatch(plain, /mix-blend-mode/);
});

// 11-23 사용자 「이동하면 갑자기 누끼 따져 있던 게 배경 생겨」: 옮긴 그림은 transform 층(data-edit="kv")에 감싸져 혼합이 지면까지 안 닿았다 — 감싸는 층에도 같은 혼합
import { applyElementEdits } from '../core/elementedit.js';
test('그림을 옮겨도 감싸는 층(data-edit kv)에 multiply', () => {
  const specs = adSpecEntries(), ctx = createContext({ client: '동서식품', main: '동서식품 채용' }, 'recruit');
  const html = renderAd(ctx, st(kv({ top: W, bottom: W, left: W, right: edge('#146E32') }, ['#146E32'])), specs['kakao-display-pc-promo']);
  const moved = applyElementEdits(html, { kv: { dx: -0.15, dy: 0 } }, { w: 1200, h: 600 });
  assert.match(moved, /<div data-edit="kv" style="[^"]*transform:[^"]*mix-blend-mode:multiply/);
  const plain = applyElementEdits(renderAd(ctx, st(kv({ top: edge('#BFE0FF'), bottom: edge('#BFE0FF'), left: edge('#BFE0FF'), right: edge('#BFE0FF') }, ['#1579E9'])), specs['kakao-display-pc-promo']), { kv: { dx: -0.15, dy: 0 } }, { w: 1200, h: 600 });
  assert.doesNotMatch(plain, /mix-blend-mode/);
});

// 11-23 사용자 「이런 거 센터로 와야 하는 거 아냐」: 가운데 정렬 틀(인스타 1080)의 흰 바탕 그림 칸은 누끼처럼 가운데로
test('인스타 1080: 흰 바탕 그림 칸이 지면 가운데 · 녹임 없음', () => {
  const specs = adSpecEntries(), ctx = createContext({ client: '동서식품', main: '2026년 동서식품\n대졸 신입/경력사원 채용' }, 'recruit');
  const html = renderAd(ctx, st(kv({ top: W, bottom: W, left: W, right: W }, ['#2FBB61', '#3794FE'])), specs['instagram-feed-1080']);
  const m = html.match(/<div data-object="1" style="position:absolute;left:(-?\d+)px;top:\d+px;width:(\d+)px/);
  assert.ok(m, '그림 칸');
  assert.ok(Math.abs(+m[1] + +m[2] / 2 - 540) <= 2, `칸 가운데 ${+m[1] + +m[2] / 2}`);
  assert.doesNotMatch(html.match(/<div data-object="1"[^>]*>/)[0], /mask-image/);
  // 색 있는 바탕 그림은 예전 칸 그대로(오른쪽 아래)
  const B = edge('#BFE0FF');
  const blue = renderAd(ctx, st(kv({ top: B, bottom: B, left: B, right: B }, ['#1579E9'])), specs['instagram-feed-1080']);
  assert.match(blue, /<div data-object="1" style="position:absolute;left:262px/);
});
