// 피그마 UI3 식 컨트롤의 값 다루기(app/fui.js) · 실시간 미리보기 순번(app/live.js) — DOM 없이 되는 부분
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evalNum, parseHex } from '../app/fui.js';
import { createLiveScheduler } from '../app/live.js';

test('숫자 칸: 숫자·사칙 식을 계산하고(hub 패널과 같이), 못 읽으면 이전 값', () => {
  assert.equal(evalNum('42'), 42);
  assert.equal(evalNum('90+45'), 135);
  assert.equal(evalNum('10-3'), 7);
  assert.equal(evalNum('2+3*4'), 14);
  assert.equal(evalNum('100/4'), 25);
  assert.equal(evalNum('-5'), -5);
  assert.equal(evalNum('12.5%'), 12.5);
  assert.equal(evalNum('abc', 7), 7);
});
test('헥스 칸: # 있어도 없어도, 3자리도, 대문자로 — 못 읽으면 null', () => {
  assert.equal(parseHex('ff3366'), '#FF3366');
  assert.equal(parseHex('#abc'), '#AABBCC');
  assert.equal(parseHex(' 12ab34 '), '#12AB34');
  assert.equal(parseHex('xyz'), null);
  assert.equal(parseHex('12345'), null);
});

// rAF 를 손으로 돌린다
function withFrames(fn) {
  const q = []; const old = globalThis.requestAnimationFrame, oldC = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = f => { q.push(f); return q.length; };
  globalThis.cancelAnimationFrame = () => { q.length = 0; };
  try { fn(() => { const f = q.shift(); if (f) f(); return !!f; }, q); } finally { globalThis.requestAnimationFrame = old; globalThis.cancelAnimationFrame = oldC; }
}
test('실시간 순번: 한 프레임 예산을 넘기면 다음 프레임으로 — 전부 한 번씩 최신 값으로', () => {
  withFrames(next => {
    const seen = [];
    const items = ['a', 'b', 'c'].map(key => ({ key, apply: v => { seen.push([key, v]); const t = performance.now(); while (performance.now() - t < 2); } }));
    const L = createLiveScheduler({ list: () => items, budget: 0 });   // 예산 0 = 한 프레임에 하나
    L.push(1);
    assert.equal(L.active, true);
    next(); assert.deepEqual(seen, [['a', 1]]);
    next(); assert.deepEqual(seen, [['a', 1], ['b', 1]]);
    L.push(2);                 // 끄는 중 새 값 — 순번은 이어 간다(c 부터), 앞의 것도 새 값으로 다시
    next(); assert.deepEqual(seen.at(-1), ['c', 2]);
    next(); next();
    assert.deepEqual(seen.slice(-3).map(x => x[1]), [2, 2, 2]);
    assert.equal(new Set(seen.slice(-3).map(x => x[0])).size, 3);
    assert.equal(next(), false, '다 그리면 멈춘다');
    L.stop(); assert.equal(L.active, false);
  });
});
test('실시간 순번: stop 뒤 대기 중인 프레임은 아무것도 안 그린다(놓을 때 정식 재렌더가 이긴다)', () => {
  withFrames((next, q) => {
    let n = 0;
    const L = createLiveScheduler({ list: () => [{ key: 'a', apply: () => n++ }] });
    L.push(1); L.stop();
    assert.equal(q.length, 0);
    next(); assert.equal(n, 0);
  });
});
