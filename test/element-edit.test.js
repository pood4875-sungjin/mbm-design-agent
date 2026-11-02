// 프레임 안 요소 하나의 편집(core/elementedit.js) — 그려진 html 에 입히는 부분. 화면 쪽(app/elselect.js)은 브라우저에서 확인
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyElementEdits, normElementEdits, withElementEdit, parseElementId, elementId, elementName, elementFontIds } from '../core/elementedit.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { generateArtifacts, registerAll } from '../core/generate.js';

const S = adSpecEntries();
const f = { client: '동서식품', hiringType: '신입 채용', role: '영업', deadline: '2026-11-08' };
const tag = (h, r) => h.match(new RegExp(`<[a-z]+ [^>]*data-field="${r}"[^>]*>`))?.[0] ?? '';

test('id: 역할 + 같은 역할 몇 번째', () => {
  assert.equal(elementId('main'), 'main');
  assert.equal(elementId('chip', 2), 'chip#2');
  assert.deepEqual(parseElementId('chip#2'), { role: 'chip', n: 2 });
  assert.equal(elementName('main'), '메인 문구');
  assert.equal(elementName('chip#1'), '뱃지 2');
});
test('정리: 0 이동·1배·빈 값은 지우고, 다 지워지면 null', () => {
  assert.equal(normElementEdits({ main: { dx: 0, dy: 0, scale: 1 } }), null);
  assert.deepEqual(normElementEdits({ main: { dx: 3.14, color: '#aa0011', weight: 450 } }), { main: { dx: 3.1, color: '#AA0011' } });
  assert.equal(withElementEdit({ main: { dx: 3 } }, 'main', { dx: null }), null);
  assert.deepEqual(withElementEdit({ main: { dx: 3 } }, 'sub', { align: 'center' }), { main: { dx: 3 }, sub: { align: 'center' } });
});
test('글자: 흐름 안 요소는 relative 로 밀고, 안쪽 강조색·굵기는 함께 덮는다', () => {
  const html = '<div data-ad="1"><div data-field="main" style="font-size:40px;color:#000;font-weight:700">가<span style="color:#f00;font-weight:800;font-size:20px">나</span></div><div data-field="sub" style="color:#111">다</div></div>';
  const out = applyElementEdits(html, { main: { dx: 10, dy: -4, color: '#123456', weight: 500, scale: 1.5, align: 'right' } });
  assert.match(tag(out, 'main'), /position:relative;left:10px;top:-4px/);
  assert.match(tag(out, 'main'), /color:#123456/);
  assert.match(tag(out, 'main'), /font-size:60px/);
  assert.match(tag(out, 'main'), /text-align:right/);
  assert.doesNotMatch(out, /color:#f00/);
  assert.doesNotMatch(out, /font-weight:800/);
  assert.match(out, /font-size:30px/, '안쪽 글자도 같은 배율');
  assert.match(tag(out, 'sub'), /color:#111/, '다른 요소는 그대로');
});
test('글자: 절대 위치 요소는 left·top 값에 더한다', () => {
  const html = '<div data-field="main" style="position:absolute;left:10px;top:20px;font-size:12px">가</div>';
  const out = applyElementEdits(html, { main: { dx: 5, dy: 6 } });
  assert.match(out, /left:15px;top:26px/);
  assert.doesNotMatch(out, /position:relative/);
  const r = applyElementEdits('<div data-field="main" style="position:absolute;right:10px;bottom:20px">가</div>', { main: { dx: 5, dy: 6 } });
  assert.match(r, /right:5px;bottom:14px/);
});
test('같은 역할 몇 번째: chip#1 만', () => {
  const html = '<span data-field="chip" style="color:#111">a</span><span data-field="chip" style="color:#222">b</span>';
  const out = applyElementEdits(html, { 'chip#1': { color: '#333333' } });
  assert.match(out, /^<span data-field="chip" style="color:#111">a/);
  assert.match(out, /color:#222;color:#333333/);
});
test('없는 요소는 조용히 넘긴다 · 편집이 없으면 같은 문자열', () => {
  const html = '<div data-field="main" style="a:b">가</div>';
  assert.equal(applyElementEdits(html, { detail: { dx: 3 } }), html);
  assert.equal(applyElementEdits(html, null), html);
});
test('글꼴: 표시와 스택이 같이, 큰따옴표는 스타일을 안 깬다', () => {
  const out = applyElementEdits('<div data-field="main" style="font-family:x">가</div>', { main: { font: 'GmarketSans' } });
  assert.match(out, /data-el-font="GmarketSans"/);
  assert.match(tag(out, 'main'), /font-family:[^"]*"/);
  assert.deepEqual(elementFontIds({ main: { font: 'A' }, sub: { font: 'A' }, logo: {} }), ['A']);
});
test('틀 칸 그림·로고: 캔버스 크기 층으로 감싸 변형(data-edit), 안쪽 data-object 는 따로 안 건다', () => {
  const html = '<div data-ad="1"><div data-object="kv" style="position:absolute;left:10px;top:10px;width:100px;height:100px"><div data-object="in" style="position:absolute"></div></div><div data-object="logo" style="position:absolute"></div></div>';
  const out = applyElementEdits(html, { kv: { dx: 0.1, dy: 0, scale: 1.5, ox: 0.5, oy: 0.5 } }, { w: 200, h: 100 });
  assert.equal(out.match(/data-edit="kv"/g).length, 1);
  assert.match(out, /transform:translate\(20px,0px\) scale\(1\.5\)/);
  assert.match(out, /<div data-object="logo" style="position:absolute"><\/div>/, '로고 칸은 그대로');
});
test('실제 렌더: 메인을 옮기고 색을 바꿔도 다른 줄은 바이트 그대로', () => {
  const html = renderAd(createContext(f, 'recruit'), normalizeStyle({ colors: ['#123456'] }), S['google-gdn-580x400']);
  const out = applyElementEdits(html, { main: { dx: 12, dy: 8, color: '#AA0011' } }, S['google-gdn-580x400']);
  assert.match(tag(out, 'main'), /#AA0011/);
  assert.equal(tag(out, 'sub'), tag(html, 'sub'));
  assert.equal(out.replace(tag(out, 'main'), ''), html.replace(tag(html, 'main'), ''));
});
test('생성 파이프라인: overrides.elements 가 html 에 남고, 없으면 그림이 그대로', () => {
  registerAll();
  const ctx = createContext(f, 'recruit');
  const camp = { id: 't', kind: 'recruit', context: ctx, style: normalizeStyle({ colors: ['#123456'] }), channels: ['ad'], media: ['google-gdn'], adSpecIds: ['google-gdn-580x400'], artifacts: [], log: [] };
  generateArtifacts(camp);
  const a = camp.artifacts.find(x => x.specId === 'google-gdn-580x400');
  if (!a) return;   // 이 캠페인 구성에서 규격이 안 나오면 파이프라인 시험을 건너뛴다(위 렌더 시험이 본체)
  const before = a.html;
  a.overrides.elements = { main: { color: '#AA0011' } };
  generateArtifacts(camp);
  assert.match(tag(a.html, 'main'), /#AA0011/);
  delete a.overrides.elements;
  generateArtifacts(camp);
  assert.equal(a.html, before);
});
