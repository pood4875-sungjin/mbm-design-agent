import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStyle } from '../core/style.js';
import { resolveField } from '../core/field.js';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const cutoutMeta = { ar: 1.6, px: [2400, 1500], colors: ['#3A8A6A', '#F2D24B', '#5CB85C'], field: { kind: 'cutout', opaque: 0.3, edges: {} } };

test('손으로 고친 색(colorsManual)은 지면이 주색을 따라간다 — 그라데이션까지(10-19 사용자)', () => {
  const auto = resolveField(normalizeStyle({ colors: ['#3A8A6A', '#F2D24B', '#5CB85C'], keyVisual: PNG, kvMeta: cutoutMeta }));
  assert.match(auto.source, /^kv-vivid/, '자동은 비주얼 우선');
  const manual = resolveField(normalizeStyle({ colors: ['#1E8BFF', '#F2D24B', '#5CB85C'], keyVisual: PNG, kvMeta: cutoutMeta, colorsManual: true }));
  assert.equal(manual.source, 'palette-manual');
  assert.equal(manual.stops[0], '#1E8BFF'); assert.equal(manual.stops.length, 2, '주색 → 조금 어둡힌 같은 색 그라데이션'); assert.equal(manual.angle, 135);
  assert.equal(manual.text, '#FFFFFF');
  assert.equal(normalizeStyle({ colors: ['#1E8BFF'] }).colorsManual, false, '기본은 자동');
});

test('글자색 톤(textTone): 규정 없는 매체는 다크 → #333 글자, 라이트 → 흰 글자(서브 70%) · 규정 매체(자소설)는 무시(10-19 사용자 「텍스트는 무조건 블랙 아니면 화이트, 다크/라이트 선택」)', async () => {
  const { renderArtifact } = await import('../core/contract.js'); const { registerAll } = await import('../core/generate.js'); const { createContext } = await import('../core/context.js');
  registerAll();
  const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', deadline: '2026-10-31' }, 'recruit');
  const trace = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  const base = { colors: ['#1428A0', '#F2D24B', '#5CB85C'], keyVisual: PNG, kvMeta: cutoutMeta };
  const dark = trace(renderArtifact('google-gdn-580x400', ctx, normalizeStyle({ ...base, textTone: 'dark' }), {}));
  assert.equal(dark.text.mainFg, '#333333'); assert.match(dark.text.subFg, /rgba\(51,51,51,0\.7\)/); assert.ok(dark.rules.includes('textTone.dark'));
  const light = trace(renderArtifact('google-gdn-580x400', ctx, normalizeStyle({ ...base, textTone: 'light' }), {}));
  assert.equal(light.text.mainFg, '#FFFFFF'); assert.match(light.text.subFg, /rgba\(255,255,255,0\.7\)/);
  const jaso = trace(renderArtifact('jasoseol-pc-premium-popup-pc', ctx, normalizeStyle({ ...base, textTone: 'light' }), {}));
  assert.ok(!jaso.rules.includes('textTone.light'), '자소설은 규정 매체 — 톤 무시');
  assert.equal(normalizeStyle({ colors: ['#000000'] }).textTone, 'auto');
});
