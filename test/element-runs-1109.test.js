// 11-09 글자 범위 색 — overrides.elements[요소].runs = [{ s, e, c, t }] 를 그린 html 에 입힌다(core/elementedit.js applyRuns · addRun)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyElementEdits, applyRuns, addRun, normElementEdits, textOfInner, withElementEdit } from '../core/elementedit.js';

const html = '<div data-ad="1"><div data-field="main" style="color:#FFFFFF">한진정보통신<br/>신입 &amp; 경력 <span style="color:#00FFE2">채용</span></div><div data-field="detail" style="color:#FFFFFF">모집 : 10.31</div></div>';

test('글자 셈은 DOM textContent 와 같다 — <br> 은 0글자, 엔티티는 1글자', () => {
  assert.equal(textOfInner('한진<br/>신입 &amp; <b>경력</b>'), '한진신입 & 경력');
});

test('범위만 <span data-run> 으로 칠한다 · 줄바꿈·엔티티·안쪽 태그를 넘어가도 깨지지 않는다', () => {
  const out = applyElementEdits(html, { main: { runs: [{ s: 2, e: 4, c: '#ff0000', t: '정보' }, { s: 5, e: 9, c: '#00aa00' }] } });
  assert.match(out, /한진<span data-run="1" style="color:#FF0000">정보<\/span>통/);
  assert.match(out, /통<span data-run="1" style="color:#00AA00">신<\/span><br\/><span data-run="1" style="color:#00AA00">신입 <\/span>&amp;/, '줄바꿈 양쪽으로 나뉜다');
  assert.match(out, /data-field="detail" style="color:#FFFFFF">모집 : 10\.31/, '다른 요소는 그대로');
});

test('문구가 바뀌어 자리가 밀리면 고른 글자(t)를 다시 찾아 칠하고, 없으면 버린다', () => {
  const runs = [{ s: 2, e: 4, c: '#FF0000', t: '정보' }];
  assert.match(applyRuns('대한민국정보통신', runs), /대한민국<span data-run="1" style="color:#FF0000">정보<\/span>통신/);
  assert.equal(applyRuns('케이티 채용', runs), '케이티 채용');
});

test('겹치게 다시 칠하면 나중 색이 이기고 옛 범위는 겹친 몫만 잘린다 · 색 지우기(c null)', () => {
  const text = '한진정보통신';
  let r = addRun(null, { s: 0, e: 6, c: '#111111' }, text);
  r = addRun(r, { s: 2, e: 4, c: '#FF0000' }, text);
  assert.deepEqual(r, [{ s: 0, e: 2, c: '#111111', t: '한진' }, { s: 2, e: 4, c: '#FF0000', t: '정보' }, { s: 4, e: 6, c: '#111111', t: '통신' }]);
  assert.deepEqual(addRun(r, { s: 0, e: 6, c: null }, text), null);
  assert.equal(normElementEdits(withElementEdit({}, 'main', { runs: [{ s: 3, e: 1, c: '#FF0000' }] })), null, '잘못된 범위는 저장 안 함');
});

// 11-09 사용자 「유채 A′ + 무채 브랜드색」 — 사진 지면(core/field.js photoEdgeField)
import { photoEdgeField } from '../core/field.js';
import { contrast, colorDistance, rgbToHsl, hexToRgb } from '../core/palette.js';
test('사진 지면(피그마 시안 기준): 이음 쪽 사진과 같은 색 계열을 진하게 + 흰 글자 4.5:1, 무채 변은 null(브랜드 경로)', () => {
  const hue = x => rgbToHsl(hexToRgb(x))[0], hd = (a, b) => { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 1 - d) * 360; };
  // 숲 변(어두운 청록 초록) + 사진 속 잔디(노란 초록) → 잔디 쪽 색으로, 채도 0.4~0.5 · 명도 0.34 이상(시안 236:3717 과 같은 계열)
  const park = photoEdgeField('#4C674A', ['#ACC6D1', '#51701E', '#223720']), [, ps, pl] = rgbToHsl(hexToRgb(park));
  assert.ok(hd(park, '#51701E') < 3 && ps >= 0.39 && ps <= 0.51 && pl >= 0.3, `잔디 계열 ${park}`);
  for (const e of ['#6E85A0', '#9A7A9D', '#4E606A', '#6895CB', '#AEE0F6']) {   // ilhwa-roomy · desk-33 · midas-city · desk-28 · fig-03
    const c = photoEdgeField(e, []);
    assert.ok(c && contrast(c, '#FFFFFF') >= 4.5, e + ' 흰 글자');
    assert.ok(hd(c, e) <= 40, `${e} → ${c} 같은 색 계열`);
  }
  // 변 색상과 먼 사진 속 색은 쓰지 않는다(회색 변 + 주황 셔츠 → 주황 지면이 됐다)
  assert.ok(hd(photoEdgeField('#6895CB', ['#E67814']), '#6895CB') <= 40);
  for (const e of ['#938989', '#717065', '#75776D', '#817E84']) assert.equal(photoEdgeField(e, ['#2650D9', '#BD5821']), null, e + ' 무채');   // hr-doctor · desk-27 · hr-nurse-ai · fig-22
});

import { resolveField } from '../core/field.js';
import { normalizeStyle } from '../core/style.js';
test('무채 변 사진: 밝으면(≥0.55) 옅은 브랜드 틴트 단색, 어두우면 브랜드 딥 — 사진에서 색을 지어내지 않는다', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgo=';
  const meta = lum => ({ ar: 1.5, px: [1500, 1000], colors: ['#B3B7C8', '#2650D9'], field: { kind: 'photo', opaque: 1, flatEdges: 0, lum, edges: { left: { hex: '#938989' }, top: { hex: '#B3B7C8' }, right: { hex: '#A9ACB9' }, bottom: { hex: '#C1C7DC' } } } });
  const bright = resolveField(normalizeStyle({ colors: ['#08D868'], keyVisual: PNG, kvMeta: meta(0.74) }));
  assert.equal(bright.source, 'brand-tint-photo'); assert.equal(bright.stops.length, 1);
  const dark = resolveField(normalizeStyle({ colors: ['#1F529C'], keyVisual: PNG, kvMeta: meta(0.47) }));
  assert.match(dark.source, /^brand-photo/);
});
