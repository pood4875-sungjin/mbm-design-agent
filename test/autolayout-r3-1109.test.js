// 11-09 R3: 옮긴 글자 = 자유 위치(절대) — 틀(mold)·자유 배치(flex)·시안 틀 세 경로 통일. 흐름 안 요소는 옮기기 전 자리(fx·fy·fw)에서 절대 위치로 빼고 나머지는 스택
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyElementEdits, normElementEdits, withElementEdit } from '../core/elementedit.js';

const flex = '<div data-ad="1"><div data-text-col="1" style="position:relative;display:flex;flex-direction:column"><div data-field="main" style="font-size:40px">a</div><div data-field="date" style="font-size:20px;margin-top:8px">b</div></div></div>';
test('흐름 안 글자(자유 배치·시안 틀 열): fx·fy 가 있으면 position:absolute 로 빼고 left/top = 옮기기 전 자리 + 이동, 폭 고정', () => {
  const out = applyElementEdits(flex, { date: { dx: 4, dy: 12, fx: 10, fy: 96, fw: 300 } });
  const tag = out.match(/<div data-free="1" data-field="date"[^>]*>/)?.[0] ?? out.match(/<div[^>]*data-field="date"[^>]*>/)[0];
  assert.match(tag, /position:absolute;left:14px;top:108px;width:300px;box-sizing:border-box;max-width:none;margin:0/);
  assert.doesNotMatch(tag, /margin-top:8px/, '흐름 여백은 지운다');
  assert.match(tag, /data-free="1"/);
  assert.match(out, /data-field="main" style="font-size:40px"/, '나머지는 그대로(스택)');
});
test('fx 없는 옛 저장값은 예전처럼 relative · 틀(이미 절대)은 sdy 규칙 그대로(fx 무시)', () => {
  assert.match(applyElementEdits(flex, { date: { dy: 12 } }), /position:relative;left:0px;top:12px/);
  const mold = '<div data-ad="1"><div data-field="date" data-stack-dy="40" style="position:absolute;left:0px;top:200px">x</div></div>';
  assert.match(applyElementEdits(mold, { date: { dy: 10, sdy: 15, fx: 0, fy: 999 } }), /top:185px/);
});
test('저장 정리: fx·fy·fw 는 옮겼을 때만 남고, 자동 배치로 되돌리기(null)면 다 지운다', () => {
  assert.deepEqual(normElementEdits({ date: { dy: 12, fx: 10.04, fy: 96, fw: 300 } }), { date: { dy: 12, fx: 10, fy: 96, fw: 300 } });
  assert.equal(normElementEdits({ date: { fx: 10, fy: 96 } }), null);
  const e = withElementEdit({ date: { dy: 12, fx: 10, fy: 96, fw: 300, color: '#112233' } }, 'date', { dx: null, dy: null, sdy: null, fx: null, fy: null, fw: null });
  assert.deepEqual(e, { date: { color: '#112233' } });
});
