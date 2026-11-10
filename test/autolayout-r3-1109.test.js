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

// 11-10 밤 사용자 「옮기니까 오토레이아웃처럼 틀어진다 — 해제해줘」: 흐름에서 뺀 자리에 같은 크기 빈칸(data-ph) — 나머지 글자는 제자리
test('흐름 안 글자를 옮기면 그 자리에 빈칸을 남긴다(높이 fh · 원래 여백 그대로)', () => {
  const out = applyElementEdits(flex, { date: { dy: 12, fx: 10, fy: 96, fw: 300, fh: 28 } });
  const ph = out.match(/<div data-ph="1"[^>]*><\/div>/)?.[0];
  assert.ok(ph, '빈칸'); assert.match(ph, /height:28px/); assert.match(ph, /margin-top:8px/); assert.match(ph, /visibility:hidden/);
  assert.ok(out.indexOf('data-ph') < out.indexOf('data-field="date"'), '빈칸은 옮긴 글자 앞(원래 자리)');
  assert.deepEqual(normElementEdits({ date: { dy: 12, fx: 10, fy: 96, fw: 300, fh: 28.04 } }), { date: { dy: 12, fx: 10, fy: 96, fw: 300, fh: 28 } });
});
test('fh 없는 옛 저장값은 줄 수 × 행간으로 어림 · 이미 절대인 틀은 빈칸 없음', () => {
  const two = flex.replace('>b</div>', ' style2="">b<br>c</div>').replace('font-size:20px;margin-top:8px', 'font-size:20px;line-height:30px;margin-top:8px');
  assert.match(applyElementEdits(two, { date: { dy: 12, fx: 10, fy: 96, fw: 300 } }), /data-ph="1"[^>]*height:60px/);
  const mold = '<div data-ad="1"><div data-field="date" style="position:absolute;left:0px;top:200px">x</div></div>';
  assert.doesNotMatch(applyElementEdits(mold, { date: { dy: 10, fx: 0, fy: 0, fh: 20 } }), /data-ph/);
});
