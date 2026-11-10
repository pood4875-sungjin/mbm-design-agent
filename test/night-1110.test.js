// 11-10 밤샘 루프에서 고친 규칙들(history/2026-11-10_밤샘루프_계획.md)
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('인물 상자: 색 덩어리 상자가 그림 거의 전체(80%↑)면 주인공이 아니다 — 인물 상자를 쓴다(desk-32 소파 두 사람)', async () => {
  const { personFocus } = await import('../core/palette.js');
  const field = { kind: 'photo', focus: { x: 0.5, y: 0.5, w: 0.92, h: 1, parts: 1, others: [], density: 0.58 } };
  const person = { x0: 0.158, x1: 0.742, y0: 0.245, y1: 1, area: 0.243, fill: 0.551 };
  const f = personFocus(field, person);
  assert.equal(f.focus.source, 'person'); assert.ok(f.focus.w < 0.7 && f.focus.h < 0.8);
  // 색 상자가 진짜 주인공(작고 진함)이면 그대로
  const g = personFocus({ kind: 'photo', focus: { x: 0.3, y: 0.4, w: 0.3, h: 0.4, density: 0.7 } }, person);
  assert.notEqual(g.focus.source, 'person');
});
