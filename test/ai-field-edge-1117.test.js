// 11-17 사용자 「컬러 배경 왜 칙칙해지나」: 바탕 있는 밝은 그림에서 AI 지면이 그림 변과 동떨어진 진한 색이면 그림 변 지면을 쓴다(CANON.aiFieldEdgeMax)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveField } from '../core/field.js';
import { normalizeStyle } from '../core/style.js';
const edge = hex => ({ hex, from: hex, to: hex, opaque: 1, rough: 0, std: 0, flat: true });
const KV = { ar: 1.5, px: [1500, 1000], colors: ['#6CB6F6'], field: { kind: 'illust', opaque: 1, lum: 0.7, sat: 0.46, flatEdges: 4, edges: { top: edge('#61AEF2'), bottom: edge('#A4CAFC'), left: edge('#80BEF9'), right: edge('#88C0F9') } } };
const st = ai => normalizeStyle({ colors: ['#4585DD'], keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: KV, background: { mode: 'auto', ai } });

test('AI 지면이 그림 변 색에서 멀면(#2B65B0 — .25) 그림 변 지면(kv-edge)', () => {
  const f = resolveField(st({ stops: ['#2B65B0', '#4585DD'], angle: 315 }), { facing: 'left' });
  assert.equal(f.source, 'kv-edge');
});
test('AI 지면이 그림 변 색과 가까우면 AI 지면 그대로', () => {
  const f = resolveField(st({ stops: ['#5AA6EC'], angle: 180 }), { facing: 'left' });
  assert.equal(f.source, 'ai');
});
test('바탕 없는 그림(사진)은 예전처럼 AI 지면', () => {
  const photo = { ...KV, field: { ...KV.field, kind: 'photo', flatEdges: 0, edges: {} } };
  const f = resolveField(normalizeStyle({ colors: ['#4585DD'], keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: photo, background: { mode: 'auto', ai: { stops: ['#2B65B0'] } } }), { facing: 'left' });
  assert.equal(f.source, 'ai');
});
