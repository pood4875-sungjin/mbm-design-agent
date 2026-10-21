// 빈 지면 보정 사다리(emptyFix, 10-21 사용자 「이런 경우 키비주얼이 꽤 크게 들어가야 비어 보이지 않고 임팩트」)
//   글자 행 ∪ 그림 주인공이 지면을 덮는 몫(coverageOf)이 CANON.emptyFix.min(30%) 미만이면 키비주얼 배율 1.25·1.5·1.8·2.2 순으로 다시 그려 처음 30% 에 닿는 것을 쓴다.
//   틀 그림 칸은 지면 변에 닿은 변을 두고 글자 쪽으로 키운다(emptyFix.slot). 겹침이 생기는 단계·더 못 키우는 단계에서 멈춘다. 규정 매체 틀·편집 크기·그림이 지면 전체면 제외
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd, coverageOf, overlapRatio } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { CANON } from '../core/canon.js';

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const SHORT = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' };
const prof = (n, f) => Array.from({ length: n }, (_, i) => ({ bg: f(i / (n - 1)), hex: null }));
// 파란 바탕 발광 큐브(pin-glow-cube 꼴): 세로형 1080×1440, 위·아래 변이 평평한 그라데이션(gradEdge → 그라데이션 바탕 일러스트), 주인공은 가운데 55%×40% — 열·행 프로필의 바탕 몫으로만 드러난다
const CUBE = { ar: 0.75, px: [1080, 1440], edge: '#081A4E', colors: ['#2672FE', '#0B2A7A', '#9CC8FF'], field: {
  kind: 'illust', opaque: 1, lum: 0.32, lumSpread: 0.3, sat: 0.6, semi: 0, flatEdges: 2, focus: null, room: null, topPeaks: 1,
  edges: { top: { flat: true, hex: '#081A4E', from: '#081A4E', to: '#0B2A7A', opaque: 1, rough: 0.01, std: 4 }, bottom: { flat: true, hex: '#0144D3', from: '#0144D3', to: '#0A5CF0', opaque: 1, rough: 0.01, std: 4 },
    left: { flat: false, hex: '#0349C2', from: '#0349C2', to: '#0349C2', opaque: 1, rough: 0.07, std: 35 }, right: { flat: false, hex: '#0340B6', from: '#0340B6', to: '#0340B6', opaque: 1, rough: 0.08, std: 43 } },
  cols: prof(32, t => (t > 0.1 && t < 0.9) ? 0.3 : 0.98), rows: prof(32, t => (t > 0.15 && t < 0.85) ? 0.3 : 0.98),
  quadrants: { tl: '#0B2A7A', tr: '#0B2A7A', bl: '#0144D3', br: '#0144D3' }, texture: { rough: 0.05, sharp: 0.2, spread: 40 } } };
// 주인공이 그림을 거의 다 차지하는 가로 사진(디자이너 샘플 꼴 — 칸을 채운다)
const PHOTO = { ar: 1.5, px: [1500, 1000], field: { kind: 'photo', opaque: 1, lum: 0.5, sat: 0.3, focus: { x: 0.5, y: 0.5, w: 0.9, h: 0.9 } } };
const cube = normalizeStyle({ colors: ['#2672FE'], keyVisual: PNG, kvMeta: CUBE });
const photo = normalizeStyle({ colors: ['#8C5A2B'], keyVisual: PNG, kvMeta: PHOTO });
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
const emptyAttr = html => (html.match(/data-empty="([^"]*)"/) ?? [])[1] ?? null;
const ctx = createContext(SHORT, 'recruit');

test('구글 580 모서리 칸 × 세로형 그라데이션 바탕 일러스트(큐브): 덮는 몫 30% 미만 → 칸을 글자 쪽으로 키워(emptyFix.slot) 30% 이상 · data-empty "전>후:배율" · 겹침 없음', () => {
  const spec = specs['google-gdn-580x400'];
  const before = renderAd(ctx, { ...cube, __fix: {} }, spec), after = renderAd(ctx, cube, spec);
  const c0 = coverageOf(before, traceOf(before), cube, spec), c1 = coverageOf(after, traceOf(after), cube, spec);
  assert.ok(c0.all < CANON.emptyFix.min, `전 ${c0.all}`);
  assert.ok(c1.all >= CANON.emptyFix.min && c1.all > c0.all, `전 ${c0.all} → 후 ${c1.all}`);
  const ev = emptyAttr(after); assert.ok(ev, '보정 표시'); const m = ev.match(/^(\d+)>(\d+):([\d.]+)$/); assert.ok(m, ev);
  assert.ok(CANON.emptyFix.steps.includes(+m[3]), '사다리 배율 ' + m[3]);
  const tr = traceOf(after); assert.ok(tr.rules.includes('emptyFix.ok') && tr.rules.includes('emptyFix.slot'), tr.rules.join(','));
  const b = traceOf(before).place.tImage, a = tr.place.tImage;
  assert.ok(a.w > b.w && a.h > b.h, `${JSON.stringify(b)} → ${JSON.stringify(a)}`);
  assert.equal(a.x + a.w, b.x + b.w, '오른쪽 변은 그대로'); assert.equal(a.y + a.h, b.y + b.h, '아랫변은 그대로');
  assert.ok((overlapRatio(after, tr, cube, spec) ?? 0) <= CANON.overlapFix.other, '글자와 안 겹친다');
  assert.equal(emptyAttr(before), null, '__fix: {} 는 사다리를 끈다');
  assert.equal(cube.__fix, undefined);
});

test('주인공이 작아 상한(모서리 칸 지면의 80%)에 닿아도 30% 에 못 미치면 — 키운 데까지 쓰고 emptyFix.max', () => {
  const small = normalizeStyle({ colors: ['#2672FE'], keyVisual: PNG, kvMeta: { ...CUBE, field: { ...CUBE.field, cols: prof(32, t => (t > 0.3 && t < 0.7) ? 0.3 : 0.98), rows: prof(32, t => (t > 0.35 && t < 0.65) ? 0.3 : 0.98) } } });
  const spec = specs['google-gdn-580x400'];
  const before = renderAd(ctx, { ...small, __fix: {} }, spec), after = renderAd(ctx, small, spec);
  const c0 = coverageOf(before, traceOf(before), small, spec).all, c1 = coverageOf(after, traceOf(after), small, spec).all;
  assert.ok(c1 > c0 && c1 < CANON.emptyFix.min, `전 ${c0} → 후 ${c1}`);
  const tr = traceOf(after); assert.ok(tr.rules.includes('emptyFix.max'), tr.rules.join(','));
  assert.ok(tr.place.tImage.h <= Math.round(spec.h * CANON.emptyFix.slotCap), '칸 높이 상한');
});

test('덮는 몫이 이미 30% 이상이면 아무것도 안 한다 — 주인공이 큰 사진(칸을 채운다)은 구글 580·NAP 300×250 에서 보정 표시 없음', () => {
  for (const id of ['google-gdn-580x400', 'nap-dsp-full-300x250']) {
    const html = renderAd(ctx, photo, specs[id]);
    assert.equal(emptyAttr(html), null, id);
    assert.ok(!traceOf(html).rules.some(r => r.startsWith('emptyFix')), id);
  }
});

test('편집 「키비주얼 크기」를 손으로 정했으면 안 건드린다 · 규정 매체 틀(자소설 PC 팝업)도 켠다(emptyFix.regulated=true, 10-21 사용자) — 칸은 우하단 변 그대로 글자 쪽으로', () => {
  const manual = renderAd(ctx, { ...cube, kvSize: 'sm' }, specs['google-gdn-580x400']);
  assert.equal(emptyAttr(manual), null, '편집 크기');
  const spec = specs['jasoseol-pc-premium-popup-pc'];
  const before = renderAd(ctx, { ...cube, __fix: {} }, spec), reg = renderAd(ctx, cube, spec);
  assert.ok(CANON.emptyFix.regulated && emptyAttr(reg), '규정 매체도 보정: ' + emptyAttr(reg));
  const b = traceOf(before).place.tImage, a = traceOf(reg).place.tImage;
  assert.ok(a.w > b.w || a.h > b.h, `${JSON.stringify(b)} → ${JSON.stringify(a)}`);
  assert.equal(a.x + a.w, b.x + b.w); assert.equal(a.y + a.h, b.y + b.h);
  assert.equal(traceOf(reg).mold.rows.main.px, traceOf(before).mold.rows.main.px, '글자 규정은 그대로');
});

test('coverageOf — 글자 행이 없으면 null, 주인공 상자는 열·행 프로필에서 (큐브는 그림 가운데 덩어리만 센다: 그림 전체보다 작다)', () => {
  const spec = specs['google-gdn-580x400'];
  const html = renderAd(ctx, { ...cube, __fix: {} }, spec), tr = traceOf(html);
  const c = coverageOf(html, tr, cube, spec);
  assert.ok(c.text > 0 && c.kv > 0 && c.all <= c.text + c.kv + 1e-9 && c.all >= Math.max(c.text, c.kv) - 1e-9, JSON.stringify(c));
  const box = tr.place.tImage; assert.ok(c.kv < box.w * box.h / (spec.w * spec.h), '주인공 < 칸');
  assert.equal(coverageOf(html, { ...tr, textBox: null }, cube, spec), null);
});
