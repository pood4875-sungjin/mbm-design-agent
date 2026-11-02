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
