import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStyle } from '../core/style.js';
import { resolveField } from '../core/field.js';

// 11-09 담당자 재지적(노션 「주색/보조 변경 후 → 보조색을 통한 변화 없음」): 자동 모드에서도 손으로 고른 팔레트의 보조색이 두 번째 정지점이어야 한다
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const vividMeta = { ar: 1.6, px: [2400, 1500], colors: ['#2575D3', '#0A419A', '#5CB85C'], field: { kind: 'cutout', opaque: 0.3, edges: {} } };
const st = (mode, colors = ['#2575D3', '#00AA55', '#5CB85C'], extra = {}) => normalizeStyle({ colors, keyVisual: PNG, kvMeta: vividMeta, colorsManual: true, background: { mode }, ...extra });

test('보조색이 있으면 모드와 무관하게 stops[1] === 보조색 — 자동·그라데이션 같은 값, 단색은 하나', () => {
  const a = resolveField(st('auto'), { facing: 'left' }), g = resolveField(st('gradient'), { facing: 'left' });
  assert.deepEqual(a.stops, ['#2575D3', '#00AA55']); assert.equal(a.source, 'palette-manual'); assert.equal(a.angle, 135);
  assert.deepEqual(g.stops, a.stops, '그라데이션 모드로 바꿔도 정지점 보존'); assert.equal(g.angle, a.angle);
  assert.equal(resolveField(st('solid'), { facing: 'left' }).stops.length, 1);
});

test('보조색이 주색과 같으면(또는 없으면) 주색을 조금 어둡힌 색 · 자동 모드 KV 추출 색은 손으로 바꾸면 더는 안 쓴다', () => {
  const same = resolveField(st('auto', ['#C62828', '#C62828']), { facing: 'left' });
  assert.equal(same.stops[0], '#C62828'); assert.equal(same.stops.length, 2); assert.notEqual(same.stops[1], '#C62828');
  const auto = resolveField(normalizeStyle({ colors: ['#2575D3', '#0A419A'], keyVisual: PNG, kvMeta: vividMeta }), { facing: 'left' });
  assert.match(auto.source, /^kv-vivid/, '손대기 전엔 비주얼 우선');
  const red = resolveField(st('auto', ['#C62828', '#0A419A']), { facing: 'left' });
  assert.deepEqual(red.stops, ['#C62828', '#0A419A']);
});

test('AI 지면(background.ai)은 1차 값일 뿐 — 손으로 고른 팔레트가 앞선다', () => {
  const f = resolveField(st('auto', ['#C62828', '#0A419A'], { background: { mode: 'auto', ai: { stops: ['#1E4FBF', '#0B2A6E'], angle: 90, text: 'light', melt: 0.6 } } }), { facing: 'left' });
  assert.equal(f.source, 'palette-manual'); assert.deepEqual(f.stops, ['#C62828', '#0A419A']);
  const untouched = resolveField(normalizeStyle({ colors: ['#C62828'], background: { ai: { stops: ['#1E4FBF', '#0B2A6E'], angle: 90, text: 'light', melt: 0.6 } } }), { facing: 'left' });
  assert.equal(untouched.source, 'ai');
});
