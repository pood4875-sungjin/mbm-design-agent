// 11-10 글자 범위 서식 — 색에 더해 굵기(w)·크기(px)·자간(ls)·불투명도(o)를 범위마다 따로(core/elementedit.js addRun · applyRuns · stripRuns)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addRun, applyRuns, applyElementEdits, normElementEdits, normRuns, stripRuns, scaleRuns, withElementEdit, WEIGHT_NAME } from '../core/elementedit.js';

const T = '2025년 GS에너지신입 공채';   // <br> 은 0글자 — 「2025년 GS에너지」 + 「신입 공채」

test('같은 범위에 여러 속성을 겹쳐도 각각 남는다 — 색만 바꿔도 굵기는 안 지운다', () => {
  let r = addRun(null, { s: 6, e: 12, w: 800 }, T);
  r = addRun(r, { s: 6, e: 12, c: '#ff0000' }, T);
  assert.deepEqual(r, [{ s: 6, e: 12, c: '#FF0000', w: 800, t: 'GS에너지신' }]);
  // 일부만 겹치게 색 → 굵기 범위는 그대로, 색 범위만 생긴다
  r = addRun(addRun(null, { s: 6, e: 12, w: 800 }, T), { s: 8, e: 14, c: '#00AA00' }, T);
  assert.deepEqual(r.map(x => [x.s, x.e, x.w ?? null, x.c ?? null]), [[6, 8, 800, null], [8, 12, 800, '#00AA00'], [12, 14, null, '#00AA00']]);
});

test('속성별 지우기(null) — 굵기만 지우면 색은 남고, 색을 지우면 불투명도도 같이 빠진다', () => {
  let r = addRun(null, { s: 0, e: 5, w: 700, c: '#112233', o: 40, px: 90 }, T);
  r = addRun(r, { s: 0, e: 5, w: null }, T);
  assert.deepEqual(r, [{ s: 0, e: 5, c: '#112233', o: 40, px: 90, t: '2025년' }]);
  r = addRun(r, { s: 0, e: 5, c: null }, T);
  assert.deepEqual(r, [{ s: 0, e: 5, px: 90, t: '2025년' }]);
  assert.equal(addRun(r, { s: 0, e: 5, px: null }, T), null);
  assert.equal(addRun(null, { s: 0, e: 3, o: 50 }, T), null, '색 없는 불투명도는 저장 안 함');
});

test('잘못된 값은 버린다 — 굵기는 100 단위 100~900, 크기 4~600', () => {
  assert.equal(normRuns([{ s: 0, e: 2, w: 750 }, { s: 0, e: 2, w: 1000 }, { s: 0, e: 2, px: 1 }]), null);
  assert.deepEqual(normRuns([{ s: 0, e: 2, w: 100, ls: -2.5 }]), [{ s: 0, e: 2, w: 100, ls: -2.5 }]);
  assert.equal(WEIGHT_NAME[800], 'ExtraBold');
});

test('그리기: 색만이면 예전과 같은 span, 굵기·크기·자간·불투명도는 한 span 의 style 로', () => {
  assert.match(applyRuns('한진정보통신', [{ s: 2, e: 4, c: '#FF0000' }]), /한진<span data-run="1" style="color:#FF0000">정보<\/span>통신/);
  const out = applyRuns('2025년 GS에너지<br/>신입 공채', [{ s: 6, e: 9, w: 800, c: '#FF0000', o: 50, px: 90, ls: -2 }]);
  assert.match(out, /<span data-run="1" style="color:rgba\(255,0,0,0\.5\);font-weight:800;font-size:90px;letter-spacing:-0\.02em">GS에<\/span>너지/);
});

test('범위 크기가 있으면 px 행간을 글자 크기 대비 비율로(큰 글자 줄이 그만큼 높아진다)', () => {
  const html = '<div data-ad="1"><div data-field="main" style="position:absolute;top:40px;font-size:72px;line-height:86.4px;font-weight:500">2025년 GS에너지<br/>신입 공채</div></div>';
  const out = applyElementEdits(html, { main: { runs: [{ s: 6, e: 12, w: 800, px: 96 }] } });
  assert.match(out, /line-height:1\.2[";]/);
  assert.match(out, /font-weight:500/, '요소 굵기는 그대로');
  assert.match(out, /<span data-run="1" style="font-weight:800;font-size:96px">GS에너지<\/span><br\/><span data-run="1" style="font-weight:800;font-size:96px">신<\/span>입 공채/);
  // 범위 크기가 없으면 행간 그대로
  assert.match(applyElementEdits(html, { main: { runs: [{ s: 6, e: 12, w: 800 }] } }), /line-height:86\.4px/);
});

test('요소 값(범위 없이): 자간·행간·불투명도·숨김 저장과 그리기', () => {
  const E = normElementEdits({ main: { ls: -3, lh: 130, op: 60 }, sub: { hid: 1, op: 100 } });
  assert.deepEqual(E, { main: { ls: -3, lh: 130, op: 60 }, sub: { hid: 1 } });
  const out = applyElementEdits('<div data-field="main" style="font-size:40px;letter-spacing:-0.8px;line-height:48px">가<span style="letter-spacing:1px">나</span></div><div data-field="sub" style="color:#000">다</div>', E);
  assert.match(out, /letter-spacing:-0\.03em/); assert.match(out, /line-height:1\.3/); assert.match(out, /opacity:0\.6/);
  assert.doesNotMatch(out, /letter-spacing:1px/, '안쪽 자간은 요소 값이 덮는다');
  assert.match(out, /data-field="sub" style="color:#000;opacity:0"/);
});

test('요소 전체 값을 바꾸면 그 속성의 범위 서식만 걷힌다(피그마처럼) · 크기 비율은 범위 크기도 같이', () => {
  const runs = [{ s: 0, e: 4, w: 800, c: '#FF0000', t: '2025' }, { s: 6, e: 8, px: 90, t: 'GS' }];
  assert.deepEqual(stripRuns(runs, ['w'], T), [{ s: 0, e: 4, c: '#FF0000', t: '2025' }, { s: 6, e: 8, px: 90, t: 'GS' }]);
  assert.deepEqual(stripRuns(runs, ['c'], T), [{ s: 0, e: 4, w: 800, t: '2025' }, { s: 6, e: 8, px: 90, t: 'GS' }]);
  assert.equal(stripRuns([{ s: 0, e: 4, c: '#FF0000', o: 30 }], ['c'], T), null);
  assert.deepEqual(scaleRuns(runs, 0.5)[1], { s: 6, e: 8, px: 45, t: 'GS' });
  const ed = withElementEdit({ main: { runs } }, 'main', { runs: stripRuns(runs, ['w', 'c', 'px'], T) });
  assert.equal(ed, null, '다 걷히면 저장값도 비운다');
});

test('문구가 바뀌어 자리가 밀려도 속성 묶음째 따라간다', () => {
  const r = [{ s: 6, e: 8, w: 800, c: '#FF0000', t: 'GS' }];
  assert.match(applyRuns('2026년 하반기 GS에너지', r), /하반기 <span data-run="1" style="color:#FF0000;font-weight:800">GS<\/span>에너지/);
  // addRun 도 밀린 자리 기준으로 겹친다
  const T2 = '2026년 하반기 GS에너지';
  assert.deepEqual(addRun(r, { s: 10, e: 12, px: 80 }, T2).map(x => [x.s, x.e, x.w ?? null, x.px ?? null]), [[10, 12, 800, 80]]);
});

test('오토레이아웃: 범위 크기로 커진 만큼 글상자 max-height 를 늘리고 아래 글자는 내린다(옮긴 요소는 그대로)', () => {
  const h = '<div data-ad="1"><div data-text-col="1" style="position:absolute;left:70px;top:130px;width:730px;height:269px"><div data-field="sub" style="position:absolute;left:0px;top:206.8px;font-size:52px;line-height:62.4px">11.10</div><div data-field="date" data-free="1" style="position:absolute;left:0px;top:240px">x</div><div data-field="main" style="position:absolute;left:0px;top:0px;font-size:72px;line-height:88px;max-height:176px;overflow:hidden">2025년 GS에너지<br/>신입 공채</div></div></div>';
  const out = applyElementEdits(h, { main: { runs: [{ s: 6, e: 11, px: 90 }, { s: 11, e: 13, px: 80 }] } });
  // 첫 줄 (90−72)×1.222 = 22 · 둘째 줄 (80−72)×1.222 = 9.8
  assert.match(out, /data-run-grow="31\.8"/);
  assert.match(out, /max-height:207\.8px/);
  assert.match(out, /data-field="sub" style="position:absolute;left:0px;top:238\.6px/);
  assert.match(out, /data-field="date" data-free="1" style="position:absolute;left:0px;top:240px"/);
  assert.match(out, /data-text-col="1" style="[^"]*height:300\.8px/);
});
