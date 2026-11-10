// 그림·로고 회전(11-10 오후 사용자 결정 「회전 — 전부」) — core/elementedit.js rot → 그 층 transform 끝 rotate() + data-rot(svgexport 가 읽는다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyElementEdits, normElementEdits } from '../core/elementedit.js';

const objTag = h => h.match(/<div [^>]*data-object="1"[^>]*>/)?.[0] ?? '';
const HTML = '<div data-ad="1"><div data-object="1" style="position:absolute;left:10px;top:0px;width:200px;height:100px;-webkit-mask-image:linear-gradient(to right,transparent 0%,#000 30%)"></div></div>';

test('정리: rot 은 그림·로고만, -180~180 으로 접고 0 은 지운다', () => {
  assert.deepEqual(normElementEdits({ kv: { rot: 370 } }), { kv: { rot: 10 } });
  assert.deepEqual(normElementEdits({ logo: { rot: 270 } }), { logo: { rot: -90 } });
  assert.deepEqual(normElementEdits({ kv: { rot: 15.26 } }), { kv: { rot: 15.3 } });
  assert.equal(normElementEdits({ kv: { rot: 360 } }), null);
  assert.equal(normElementEdits({ main: { rot: 30 } }), null, '글자는 회전 없음');
});

test('옮김 없이 회전: 그 층에 rotate()·data-rot, 녹임 마스크는 같은 층(같이 돈다)', () => {
  const t = objTag(applyElementEdits(HTML, { kv: { rot: 30 } }, { w: 300, h: 100 }));
  assert.match(t, /data-rot="30"/); assert.match(t, /transform:rotate\(30deg\)/); assert.match(t, /mask-image/);
});

test('뒤집기 + 회전: 뒤집은 뒤 돌린다(문자열 순서 scale → rotate)', () => {
  const t = objTag(applyElementEdits(HTML, { kv: { rot: -45, flip: 'h' } }, { w: 300, h: 100 }));
  assert.match(t, /transform:scale\(-1,1\) rotate\(-45deg\)/);
});

test('옮김 + 회전: 바깥 층이 옮기고 안쪽 층이 돈다', () => {
  const out = applyElementEdits(HTML, { kv: { dx: 0.1, scale: 1.1, ox: 0.5, oy: 0.5, rot: 12 } }, { w: 300, h: 100 });
  assert.match(out, /<div data-edit="kv"[^>]*transform/);
  assert.match(objTag(out), /data-rot="12"[^>]*transform:rotate\(12deg\)|transform:rotate\(12deg\)[^>]*data-rot/);
});

test('흐름 안 그림: translate·scale 뒤에 rotate 를 이어 붙인다', () => {
  const html = '<div data-ad="1"><div data-object="1" style="width:200px;height:100px"></div></div>';
  const t = objTag(applyElementEdits(html, { kv: { dx: 0.1, scale: 1, ox: 0.5, oy: 0.5, rot: 90 } }, { w: 300, h: 100 }));
  assert.match(t, /translate\([^)]*\) scale\(1\) rotate\(90deg\)/);
});
