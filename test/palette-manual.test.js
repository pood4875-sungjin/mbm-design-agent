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
