// 그림·로고 외관(11-10 hub 이식 2단계) — core/elementedit.js 불투명도·숨김·모서리·뒤집기, svgexport 뒤집기 행렬
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyElementEdits, normElementEdits, withElementEdit } from '../core/elementedit.js';
import { flipOf } from '../core/svgexport.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const objTag = h => h.match(/<div [^>]*data-object="1"[^>]*>/)?.[0] ?? '';
const SPEC = adSpecEntries();

test('정리: r·flip 은 키비주얼만, op·hid 는 로고도', () => {
  assert.deepEqual(normElementEdits({ kv: { r: 12.4, flip: 'vhx', op: 60 } }), { kv: { r: 12, flip: 'hv', op: 60 } });
  assert.deepEqual(normElementEdits({ logo: { r: 12, flip: 'h', op: 40 } }), { logo: { op: 40 } });
  assert.equal(normElementEdits({ kv: { r: 0, flip: '', op: 100 } }), null, '기본값만이면 저장 안 함');
  assert.equal(withElementEdit({ kv: { flip: 'h' } }, 'kv', { flip: null }), null);
});

test('외관만(옮김 없음): 층을 감싸지 않고 그 층 스타일에', () => {
  const html = '<div data-ad="1"><div data-object="1" style="position:absolute;left:10px;top:0px;width:200px;height:100px;background:url(\'x\') center/cover no-repeat;-webkit-mask-image:linear-gradient(to right,transparent 0%,#000 30%)"></div></div>';
  const out = applyElementEdits(html, { kv: { op: 60, r: 16, flip: 'h' } }, { w: 300, h: 100 });
  assert.doesNotMatch(out, /data-edit="kv"/);
  const t = objTag(out);
  assert.match(t, /opacity:0\.6/); assert.match(t, /border-radius:16px;overflow:hidden/); assert.match(t, /transform:scale\(-1,1\)/);
  assert.match(t, /mask-image/, '녹임 마스크는 같은 층에 그대로(같이 뒤집힘)');
  assert.match(objTag(applyElementEdits(html, { kv: { hid: 1, op: 40 } }, { w: 300, h: 100 })), /opacity:0(;|")/, '숨김이 이긴다');
});

test('옮김 + 뒤집기: 바깥 층이 옮기고 안쪽 층이 뒤집는다', () => {
  const html = '<div data-ad="1"><div data-object="1" style="position:absolute;left:10px;top:0px;width:200px;height:100px"></div></div>';
  const out = applyElementEdits(html, { kv: { dx: 0.1, dy: 0, scale: 1.2, ox: 0.5, oy: 0.5, flip: 'v' } }, { w: 300, h: 100 });
  assert.match(out, /<div data-edit="kv"[^>]*transform/);
  assert.match(objTag(out), /transform:scale\(1,-1\)/);
});

test('흐름 안 그림(절대 위치 아님): translate·scale 뒤에 뒤집기를 이어 붙인다', () => {
  const html = '<div data-ad="1"><div data-object="1" style="width:200px;height:100px;transform:none"></div></div>';
  const t = objTag(applyElementEdits(html, { kv: { dx: 0.1, scale: 1, ox: 0.5, oy: 0.5, flip: 'h' } }, { w: 300, h: 100 }));
  assert.match(t, /transform:translate\(30px,0px\) scale\(1\) scale\(-1,1\)/);
  assert.equal((t.match(/transform:/g) ?? []).length, 1, 'transform 은 하나');
});

test('실제 렌더(카카오·구글 칸형 누끼): 외관이 그 층에 들어가고 글자는 그대로', () => {
  const ctx = createContext({ client: '가나에너지', hiringType: '신입 채용', role: '영업', deadline: '2026-11-24' }, 'recruit');
  const spec = SPEC['google-gdn-930x180'];
  const h0 = renderAd(ctx, normalizeStyle({ colors: ['#2456D6'], keyVisual: 'data:image/png;base64,QUFB', kvMeta: { ar: 1, px: [900, 900], field: { kind: 'cutout', opaque: 0.3 } } }), spec);
  const h1 = applyElementEdits(h0, { kv: { op: 50, r: 8, flip: 'h' } }, spec);
  assert.match(objTag(h1), /opacity:0\.5/); assert.match(objTag(h1), /scale\(-1,1\)/);
  assert.equal(h1.replace(/<div [^>]*data-object="1"[^>]*>/, ''), h0.replace(/<div [^>]*data-object="1"[^>]*>/, ''), '그림 층 밖은 바이트 그대로');
});

test('로고: 불투명도만', () => {
  const html = '<div data-ad="1"><img data-logo="1" src="x" style="position:absolute;left:1px;top:1px;width:50px;height:20px"></div>';
  const out = applyElementEdits(html, { logo: { op: 30 } }, { w: 300, h: 100 });
  assert.match(out, /<img data-logo="1"[^>]*opacity:0\.3/);
});

test('SVG 내보내기: 뒤집기 행렬만 <g transform> 으로, 옮김 섞인 행렬은 아님', () => {
  assert.deepEqual(flipOf('matrix(-1, 0, 0, 1, 0, 0)'), { sx: -1, sy: 1 });
  assert.deepEqual(flipOf('matrix(1, 0, 0, -1, 0, 0)'), { sx: 1, sy: -1 });
  assert.equal(flipOf('matrix(1, 0, 0, 1, 0, 0)'), null);
  assert.equal(flipOf('matrix(-1, 0, 0, 1, 30, 0)'), null);
  assert.equal(flipOf('none'), null);
});
