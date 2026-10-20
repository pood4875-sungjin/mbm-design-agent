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

test('글자색 톤(textTone): 규정 없는 매체는 다크 → #333 글자, 라이트 → 흰 글자(서브 70%) · 규정 매체도 글자색 고정이 없으면 따른다(10-20) · 고정색 매체(카카오)는 무시(10-19 사용자 「텍스트는 무조건 블랙 아니면 화이트, 다크/라이트 선택」)', async () => {
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
  assert.ok(jaso.rules.includes('textTone.light') && jaso.text.mainFg === '#FFFFFF', '자소설(글자색 고정 없음)은 톤을 따른다 — 틀 colorDark 흰색(10-20 「일괄 바꿀 수 있어야」)');
  const kakao = trace(renderArtifact('kakao-bizboard-mo', ctx, normalizeStyle({ ...base, textTone: 'light' }), {}));
  assert.ok(!kakao.rules.includes('textTone.light'), '카카오 비즈보드는 글자색 고정(#4C4C4C) — 톤 잠김');
  assert.equal(normalizeStyle({ colors: ['#000000'] }).textTone, 'auto');
});

test('지면 글자색 판정(10-20): 중간 밝기 색면(손 지정 파랑)은 흰 글자, 파스텔·흰 계열만 검정 — CANON.textOn.darkIfLum', async () => {
  const { resolveField } = await import('../core/field.js');
  const blue = resolveField(normalizeStyle({ colors: ['#5B9CF5'], background: { color: '#6AA7F2' } }));
  assert.equal(blue.text, '#FFFFFF', '중간 파랑(흰 대비 < 3) — 흰 글자');
  const pastel = resolveField(normalizeStyle({ colors: ['#5B9CF5'], background: { color: '#DDE8FF' } }));
  assert.equal(pastel.text, '#000000', '파스텔은 검정');
  const navy = resolveField(normalizeStyle({ colors: ['#1428A0'], background: { color: '#1428A0' } }));
  assert.equal(navy.text, '#FFFFFF');
});
