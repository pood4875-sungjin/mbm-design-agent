// 11-10 요소 AI 편집 — 규칙 경로(quickElementEdit)·검증(validateElementOps)·응답 읽기(parseOpsJson)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quickElementEdit, validateElementOps, parseOpsJson, keyWordOf, elementEditPrompt, suggestionsFor } from '../core/elementai.js';

const T = '2025년 GS에너지신입 공채';   // 「2025년 GS에너지」<br>「신입 공채」
const base = { kind: 'text', text: T, lines: '2025년 GS에너지\n신입 공채', cur: { px: 72, w: 800, color: '#FFFFFF', align: 'left' }, weights: [400, 700, 800], client: 'GS에너지', brand: { primary: '#E4002B' } };

test('「강약을 줘」: 회사명은 가장 굵게, 나머지 낱말은 Regular + 0.78배', () => {
  const r = quickElementEdit({ ...base, instr: '더 강약을 줘' });
  assert.equal(r.ok, true);
  assert.equal(r.ops.clearRuns, true);
  const key = r.ops.runs.find(x => x.s === 6);
  assert.deepEqual(key, { s: 6, e: 11, w: 800 });
  assert.ok(r.ops.runs.some(x => x.s === 0 && x.e === 5 && x.w === 400 && x.px === 56.2));
  assert.equal(keyWordOf('2025년 하반기 공채', '').w, '하반기');
});

test('규칙: 굵게·크게·색·정렬·「…」만·한 줄로 · 모르면 통째로 ok:false(→ AI)', () => {
  assert.deepEqual(quickElementEdit({ ...base, cur: { ...base.cur, w: 400 }, instr: '더 굵게' }).ops.el, { weight: 700 });
  assert.deepEqual(quickElementEdit({ ...base, instr: '20% 크게, 가운데 정렬' }).ops.el, { scale: 1.2, align: 'center' });
  assert.deepEqual(quickElementEdit({ ...base, instr: '「신입」 빨간색' }).ops.runs, [{ s: 11, e: 13, c: '#E53935' }]);
  assert.deepEqual(quickElementEdit({ ...base, instr: '브랜드색 강조' }).ops.runs, [{ s: 6, e: 11, c: '#E4002B' }]);
  assert.equal(quickElementEdit({ ...base, instr: '한 줄로' }).ops.text, '2025년 GS에너지 신입 공채');
  assert.equal(quickElementEdit({ ...base, instr: '연도만 작게 하고 회사명 강조' }).ok, false);
  assert.equal(quickElementEdit({ ...base, instr: '좀 더 세련되게' }).ok, false);
  assert.deepEqual(quickElementEdit({ kind: 'kv', instr: '더 크게 왼쪽으로' }).ops.box, { scale: 1.1, dx: -0.05 });
  assert.deepEqual(suggestionsFor('text', 'main'), ['강약 주기', '더 굵게', '한 줄로', '브랜드색 강조']);
});

test('검증: 없는 굵기는 가까운 것으로 · 최소 크기 · 대비 4.5 미만 색 빼기 · 잠금 · 겹치는 옮김 빼기', () => {
  const ctx = { kind: 'text', textLen: T.length, text: T, weights: [400, 700, 800], minPx: 12, bg: '#0C49AE', basePx: 72, box: { x: 70, y: 130, w: 730, h: 176 }, others: [{ id: 'sub', box: { x: 70, y: 337, w: 600, h: 62 } }], safe: { x: 0, y: 0, w: 1200, h: 600 } };
  const v = validateElementOps({ runs: [{ s: 0, e: 5, w: 300, px: 8, c: '#1A3FA0' }, { s: 6, e: 99, w: 900 }], el: { dy: 200, color: '#FFFFFF' } }, ctx);
  assert.deepEqual(v.ops.runs, [{ s: 0, e: 5, w: 400, px: 12 }, { s: 6, e: 16, w: 800 }]);
  assert.deepEqual(v.ops.el, { color: '#FFFFFF' }, '겹치는 옮김은 빠지고 색은 남음');
  assert.ok(v.notes.some(n => /대비/.test(n)) && v.notes.some(n => /겹쳐/.test(n)));
  const L = validateElementOps({ runs: [{ s: 0, e: 5, w: 800, c: '#FFFFFF' }], el: { scale: 1.2 } }, { ...ctx, locks: { color: true, style: true, size: true } });
  assert.deepEqual(L.ops, {});
  assert.equal(validateElementOps({ text: '다른 문구' }, ctx).ops.text, undefined, '내용이 바뀌는 수정은 막음');
});

test('응답 JSON 읽기 · 프롬프트에 낱말 위치', () => {
  assert.deepEqual(parseOpsJson('여기요\n```json\n{"runs":[{"s":0,"e":5,"px":50}]}\n```'), { runs: [{ s: 0, e: 5, px: 50 }] });
  assert.match(elementEditPrompt({ ...base, W: 1200, H: 600, role: 'main', instr: '연도만 작게' }), /2025년\[0,5\) GS에너지\[6,11\)/);
});
