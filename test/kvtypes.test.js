import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kvTypeOf, colHumps } from '../core/kvtypes.js';
import { specOf } from '../core/media.js';
import { limitsByRole } from '../core/adfields.js';

const col = arr => arr.map(bg => ({ bg }));
const cutout = (focus, ar, cols) => ({ ar, field: { kind: 'cutout', opaque: 0.4, focus, cols: col(cols) } });

test('열 봉우리: 틈 열(≥75%)로 갈린 불투명 덩어리만 센다 — 가장자리 빈 열은 세지 않는다', () => {
  assert.equal(colHumps(col([1, 1, 0.4, 0.3, 0.5, 1, 1])), 1);
  assert.equal(colHumps(col([1, 0.4, 0.3, 0.8, 0.5, 0.2, 0.9, 0.3, 1])), 3);
  assert.equal(colHumps(col([1, 0.7, 0.65, 1])), 0);   // 옅은 그림자뿐(60% 아래로 안 내려감)
});

test('맞닿은 누끼 떼(연결 성분 하나)도 열 봉우리가 둘 이상이면 떼 — 떼 규칙(틈 창)이 먼저', () => {
  const t = kvTypeOf(cutout({ x: 0.5, y: 0.55, w: 0.95, h: 0.9, parts: 1, others: [], density: 0.53 }, 3, [1, 0.4, 0.3, 0.8, 0.5, 0.2, 0.8, 0.3, 1]));
  assert.equal(t.flags.group, true);
  assert.equal(t.sub.id, 'cutout-group');
});

test('누끼 캐릭터는 그림 비율이 아니라 주인공 상자 비율로 — 투명 여백을 트림해 그림이 1.10이 돼도 캐릭터', () => {
  const t = kvTypeOf(cutout({ x: 0.5, y: 0.5, w: 0.95, h: 0.93, parts: 1, others: [], density: 0.7 }, 1.1, [1, 0.4, 0.3, 0.4, 1]));
  assert.equal(t.flags.character, true);
  assert.equal(t.sub.id, 'cutout-character');
  const wide = kvTypeOf(cutout({ x: 0.5, y: 0.5, w: 0.93, h: 0.91, parts: 1, others: [], density: 0.53 }, 1.35, [1, 0.4, 0.3, 0.4, 1]));
  assert.equal(wide.flags.character, false);   // 동부 건물 누끼 1.35
});

test('바탕 있는 그림의 캐릭터 판정은 그대로 그림 비율 1.05 미만 — 가로 그림의 3D 호는 캐릭터가 아니다', () => {
  const t = kvTypeOf({ ar: 1.5, field: { kind: 'illust', opaque: 1, flatEdges: 2, focus: { x: 0.5, y: 0.5, w: 0.4, h: 0.6, parts: 2, others: [] } } });
  assert.equal(t.flags.character, false);
});

test('알바몬 스카이 카피는 줄당 5자 × 3줄 — 1줄로 읽으면 "채용 공고"만 남는다', () => {
  const slot = limitsByRole(specOf('albamon-pc-sky-recruit').textLimits).main;
  assert.equal(slot.maxCharsPerLine, 5);
  assert.equal(slot.lines, 3);
});
