// 주인공 직접 지정·보존 상자(11-02 컨시어지 한희하 「중앙 중심 배치 · 잘리면 안 되는 곳 지정」) — core/field.js effectiveField
//   ① manual.focus 가 coverPos 위치를 바꾼다 ② manual.keep 은 subjectCrop 에서 잘리지 않는다 ③ coverPos 도 keep 을 창 안에 · normalizeStyle(유형 지정 포함)이 manual 을 보존한다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coverPos, subjectCrop, effectiveField } from '../core/field.js';
import { normalizeStyle } from '../core/style.js';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const prof = (n, bg) => Array.from({ length: n }, () => ({ hex: '#FAF9FE', bg }));
const edge = hex => ({ hex, from: hex, to: hex, flat: true, rough: 0.004, std: 10, opaque: 1 });
// 가로 긴 일러스트: 자동 주인공은 왼쪽(x .25), 오른쪽 끝에 제품 마크(keep)가 따로 있다
const META = { ar: 2, px: [2000, 1000], colors: ['#1E3A8A'], field: { kind: 'illust', opaque: 1, lum: 0.8, sat: 0.4, flatEdges: 4,
  edges: { top: edge('#FAF9FE'), bottom: edge('#FAF9FE'), left: edge('#FAF9FE'), right: edge('#FAF9FE') },
  focus: { x: 0.25, y: 0.5, w: 0.3, h: 0.5, parts: 1, others: [], density: 0.5 }, cols: prof(32, 0.6), rows: prof(32, 0.6) } };
const styleOf = (kv, extra = {}) => normalizeStyle({ colors: ['#E2401A'], keyVisual: PNG, kvMeta: kv, ...extra });
const withManual = (kv, manual) => ({ ...kv, manual, field: { ...kv.field, manual } });
const pct = pos => parseFloat(String(pos).split(/\s+/)[0]);

test('① manual.focus: 찍은 점이 주인공 가운데가 된다 — 세로 창(300×600)에 2:1 그림을 덮을 때 왼쪽 자동 주인공 대신 오른쪽 점으로 가로 위치가 옮겨간다', () => {
  const auto = coverPos(styleOf(META), 300, 600);
  const man = coverPos(styleOf(withManual(META, { focus: { x: 0.9, y: 0.5 }, keep: null })), 300, 600);
  assert.ok(pct(auto.pos) < 30, `자동은 왼쪽 ${auto.pos}`);
  assert.ok(pct(man.pos) > 80, `직접 지정은 오른쪽 ${man.pos}`);
  const F = effectiveField(withManual(META, { focus: { x: 0.9, y: 0.5 }, keep: null }).field);
  assert.equal(F.focus.source, 'manual');
  assert.equal(F.focus.w, 0.3, '크기를 안 주면 자동 상자의 크기');
});

test('② manual.keep: 주인공으로 당겨 채울 때(subjectCrop) 보존 상자가 창 밖으로 나가지 않는다 — 배율을 낮추고 창을 옮긴다', () => {
  const keep = { x: 0.8, y: 0.1, w: 0.18, h: 0.25 };
  const vis = c => { const left = -c.ox / (c.iw * c.scale), top = -c.oy / (c.ih * c.scale); return { left, right: left + 400 / (c.iw * c.scale), top, bottom: top + 300 / (c.ih * c.scale) }; };
  const auto = subjectCrop(styleOf(META), 400, 300);
  assert.ok(auto, '자동도 주인공으로 당긴다');
  const va = vis(auto);
  assert.ok(va.right < keep.x + keep.w, `자동 창은 오른쪽 마크를 자른다 ${JSON.stringify(va)}`);
  const man = subjectCrop(styleOf(withManual(META, { focus: null, keep })), 400, 300);
  assert.ok(man?.keep, 'keep 표시');
  const vm = vis(man);
  assert.ok(vm.left <= keep.x + 1e-3 && vm.right >= keep.x + keep.w - 1e-3, `가로로 들어간다 ${JSON.stringify(vm)}`);
  assert.ok(vm.top <= keep.y + 1e-3 && vm.bottom >= keep.y + keep.h - 1e-3, `세로로 들어간다 ${JSON.stringify(vm)}`);
  assert.ok(man.scale <= auto.scale, '배율은 자동보다 크지 않다');
});

test('③ coverPos 도 keep 을 창 안에 둔다 · normalizeStyle(유형 지정 입힘)이 kvMeta.manual·field.manual 을 그대로 지닌다', () => {
  const keep = { x: 0.8, y: 0.1, w: 0.18, h: 0.25 };
  const st = styleOf(withManual(META, { focus: { x: 0.25, y: 0.5 }, keep }), { kvTypeOverride: 'illust-object' });
  assert.deepEqual(st.kvMeta.manual, { focus: { x: 0.25, y: 0.5 }, keep });
  assert.deepEqual(st.kvMeta.field.manual, { focus: { x: 0.25, y: 0.5 }, keep });
  assert.equal(st.kvMeta.typeOverride, 'illust-object');
  const c = coverPos(st, 300, 600);   // 그림 폭 1200px 창 300px — 주인공은 왼쪽이지만 keep(오른쪽 끝)이 들어와야 한다
  const px = pct(c.pos) / 100, imgW = 1200, left = px * (imgW - 300) / imgW, right = left + 300 / imgW;
  assert.ok(left <= keep.x + 1e-3 && right >= keep.x + keep.w - 1e-3, `keep 이 창 안 ${c.pos} [${left.toFixed(3)}, ${right.toFixed(3)}]`);
});

// ── 보여 줄 영역(사용자 「차라리 누르면 영역 지정을 내가 할 수 있게」) — 렌더 마지막에 모든 그림 칸에 맞춘다
import { renderAd } from '../core/renderers/ad.js';
import { adSpecGroups } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
const regionMeta = (kv, region) => { const manual = { region, focus: { x: region.x + region.w / 2, y: region.y + region.h / 2, w: region.w, h: region.h }, keep: region }; return { ...kv, manual, field: { ...kv.field, manual } }; };
const CTX = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '영업', deadline: '2026-11-30' }, 'recruit');
const REG = { x: 0.7, y: 0.1, w: 0.25, h: 0.3 };
const groups = adSpecGroups().filter(g => g.entry.extract && !(g.entry.asset || g.entry.rules?.asset));
const layers = h => [...h.matchAll(/<div data-object="1"[^>]*>/g)].map(m => m[0]);

test('④ 영역을 지정하면 그림이 있는 모든 규격에 표시(data-kv-region)·규칙(kvRegion)이 붙는다 — 바탕 있는 그림 · 누끼 모두', () => {
  const CUT = { ar: 0.5, px: [500, 1000], colors: ['#1E3A8A'], field: { kind: 'cutout', opaque: 0.1, lum: 0.5, sat: 0.4, focus: { x: 0.5, y: 0.5, w: 0.8, h: 0.9, parts: 1, others: [], density: 0.5 } } };
  for (const kv of [META, CUT]) {
    const st = styleOf(regionMeta(kv, REG)); let drawn = 0;
    for (const g of groups) { const h = renderAd(CTX, st, g.entry); if (!h.includes(`url('${PNG}')`)) continue; drawn++; assert.match(h, /kvRegion/, `${kv.field.kind} ${g.id}`); }
    assert.ok(drawn >= 20, `그림 있는 규격 ${drawn}`);
  }
});
test('⑤ 누끼는 칸 안에 영역이 통째로 · 바탕 있는 그림은 칸을 다 덮어 빈틈이 없다 · 비슷한 비율 칸에선 영역이 다 보인다', () => {
  const sp = adSpecGroups().find(g => g.id === 'kakao-display-pc-promo').entry;
  const h = renderAd(CTX, styleOf(regionMeta(META, REG)), sp);
  const st = layers(h).find(x => /data-kv-region/.test(x)), w = +st.match(/width:([\d.]+)px/)[1], hh = +st.match(/height:([\d.]+)px/)[1];
  const b = st.match(/ (-?[\d.]+)px (-?[\d.]+)px\/([\d.]+)px ([\d.]+)px no-repeat/); const [ox, oy, dw, dh] = b.slice(1).map(Number);
  assert.ok(ox <= 0 && oy <= 0 && ox + dw >= w - 0.2 && oy + dh >= hh - 0.2, '칸을 덮는다');
  const left = -ox / dw, right = (w - ox) / dw, top = -oy / dh, bottom = (hh - oy) / dh;
  assert.ok(left <= REG.x + 1e-3 && right >= REG.x + REG.w - 1e-3 && top <= REG.y + 1e-3 && bottom >= REG.y + REG.h - 1e-3, JSON.stringify({ left, right, top, bottom }));
});
test('⑥ 영역이 없으면 지금과 똑같다 · AI 그림 상자보다 사람 지정이 먼저 · 끌기 계산은 그림 안에 머문다', async () => {
  const sp = adSpecGroups().find(g => g.id === 'kakao-display-pc-promo').entry;
  assert.ok(!/data-kv-region/.test(renderAd(CTX, styleOf(META), sp)));
  const { withManual: wm, dragRegion } = await import('../app/kvfocus.js');
  assert.deepEqual(wm(META, { region: REG }).manual.keep, REG);
  assert.equal(wm(wm(META, { region: REG }), null).manual, undefined);
  const mv = dragRegion('move', REG, { x: 0, y: 0 }, { x: 0.5, y: 0.9 }); assert.equal(mv.x, 0.75); assert.equal(mv.y, 0.7);
  const dr = dragRegion('draw', null, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.3 }); assert.deepEqual(dr, { x: 0.2, y: 0.3, w: 0.6, h: 0.5 });
  const se = dragRegion('se', REG, { x: 0, y: 0 }, { x: 0.71, y: 0.11 }); assert.ok(se.w >= 0.049 && se.h >= 0.049, JSON.stringify(se));
});
