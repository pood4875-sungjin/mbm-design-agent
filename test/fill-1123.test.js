// 11-23 피그마식 채우기 층(core/paint.js · app/fillpanel.js) — 배경 · 글자 · 상자
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normPaint, normFills, paintLayerCss, fillsImageCss, convertPaint, representativeColor, isPlainSolid } from '../core/paint.js';

test('칠 정리 — 단색·그라데이션(정지점 불투명도)·이미지(배경만) · 지면(opaque)은 불투명', () => {
  assert.deepEqual(normPaint({ type: 'solid', color: '#ff0000', opacity: 140 }), { type: 'solid', color: '#FF0000', opacity: 100 });
  const g = normPaint({ type: 'linear', angle: 450, stops: [{ color: '#000000', pos: 0 }, { color: '#ffffff', pos: 100, a: 30 }], opacity: 50, hidden: true });
  assert.equal(g.angle, 90); assert.equal(g.stops[1].a, 30); assert.equal(g.hidden, true);
  assert.equal(normPaint({ type: 'linear', stops: [{ color: '#000000', pos: 0 }, { color: '#ffffff', pos: 100, a: 30 }] }, { opaque: true }).stops[1].a, undefined, '지면은 정지점 불투명도를 걷는다');
  assert.equal(normPaint({ type: 'image', src: 'data:image/png;base64,AA' }), null, '이미지 칠은 배경에만');
  assert.equal(normPaint({ type: 'image', src: 'javascript:1' }, { allowImage: true }), null);
  assert.equal(normFills([]), null);
});

test('칠 → CSS — 층 불투명도·정지점 불투명도를 색에 굽고, CSS 는 위층이 먼저', () => {
  assert.equal(paintLayerCss({ type: 'solid', color: '#FF0000', opacity: 50 }), 'linear-gradient(rgba(255,0,0,0.5),rgba(255,0,0,0.5))');
  assert.equal(paintLayerCss({ type: 'linear', angle: 90, stops: [{ color: '#000000', pos: 0 }, { color: '#FFFFFF', pos: 100, a: 50 }], opacity: 50 }), 'linear-gradient(90deg,rgba(0,0,0,0.5) 0%,rgba(255,255,255,0.25) 100%)');
  assert.equal(paintLayerCss({ type: 'solid', color: '#FF0000', opacity: 100, hidden: true }), null, '숨긴 층은 안 그린다');
  const css = fillsImageCss([{ type: 'solid', color: '#111111', opacity: 100 }, { type: 'solid', color: '#222222', opacity: 100 }]);
  assert.ok(css.indexOf('#222222') < css.indexOf('#111111'), '위층(1번)이 CSS 앞');
  const lin = convertPaint({ type: 'solid', color: '#123456', opacity: 80 }, 'linear');
  assert.equal(lin.stops[0].color, '#123456'); assert.equal(lin.stops[1].a, 0, '피그마처럼 그 색에서 투명까지'); assert.equal(lin.opacity, 80);
  assert.equal(convertPaint(lin, 'solid').color, '#123456');
  assert.equal(representativeColor([{ type: 'linear', angle: 0, stops: [{ color: '#000000', pos: 0 }, { color: '#FFFFFF', pos: 100 }], opacity: 100 }]), '#808080');
  assert.ok(isPlainSolid([{ type: 'solid', color: '#000000', opacity: 100 }]) && !isPlainSolid([{ type: 'solid', color: '#000000', opacity: 50 }]));
});

const setup = async () => {
  const { renderArtifact } = await import('../core/contract.js'); (await import('../core/generate.js')).registerAll();
  const { createContext } = await import('../core/context.js'); const { normalizeStyle } = await import('../core/style.js');
  const { applyElementEdits } = await import('../core/elementedit.js');
  return { renderArtifact, createContext, normalizeStyle, applyElementEdits, ctx: createContext({ client: '한림제약', hiringType: '수시채용', deadline: '2026-11-29', role: '영업, 생산' }, 'recruit') };
};

test('배경 채우기 층 — 예전 배경 이미지 한 장은 층 하나로 · 아래층부터 지면 위·키비주얼 아래 · 숨긴 층 빼기', async () => {
  const { renderArtifact, normalizeStyle, ctx } = await setup();
  const old = normalizeStyle({ colors: ['#2456D6'], background: { image: { src: 'data:image/png;base64,BB', fit: 'tile', opacity: 0.4 } } });
  assert.deepEqual(old.background.layers.map(p => [p.type, p.opacity, p.fit]), [['image', 40, 'tile']]);
  assert.equal(old.background.image, undefined, '저장 모양은 layers 하나');
  const st = normalizeStyle({ colors: ['#2456D6'], keyVisual: 'data:image/png;base64,iVBORw0KGgo=', background: { layers: [
    { type: 'image', src: 'data:image/png;base64,BB', fit: 'cover', opacity: 50 },
    { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0, a: 0 }, { color: '#000000', pos: 100 }], opacity: 60 },
    { type: 'solid', color: '#FF0000', opacity: 100, hidden: true },
  ] } });
  const h = renderArtifact('google-gdn-580x400', ctx, st);
  const iImg = h.indexOf('data-bg-image="1"'), iFill = h.indexOf('data-bg-fill="1"');
  assert.ok(iImg > 0 && iFill > iImg, '이미지(0번) 위에 그라데이션(1번)');
  assert.match(h.slice(iFill, iFill + 300), /linear-gradient\(180deg,rgba\(0,0,0,0\) 0%,rgba\(0,0,0,0\.6\) 100%\)/);
  assert.ok(!h.includes('#FF0000,#FF0000') && !/rgba\(255,0,0/.test(h.slice(iImg, iFill + 400)), '숨긴 층은 안 그린다');
  const kv = h.search(/data-kv="|data-object="1"|<img[^>]*iVBORw0KGgo/); if (kv > 0) assert.ok(iFill < kv, '키비주얼보다 아래');
});

test('지면 그라데이션은 불투명 — 정지점 불투명도가 들어와도 지면 CSS 에는 rgba 가 없다', async () => {
  const { resolveField } = await import('../core/field.js'); const { normalizeStyle } = await import('../core/style.js');
  const st = normalizeStyle({ colors: ['#2456D6'], background: { mode: 'gradient', gradient: { type: 'linear', angle: 90, stops: [{ color: '#112233', pos: 0 }, { color: '#445566', pos: 100, a: 20 }] } } });
  const f = resolveField(st, { facing: 'left' });
  assert.equal(f.source, 'manual-gradient'); assert.ok(!/rgba/.test(f.css), f.css);
});

test('글자 칠 — 여러 겹·그라데이션은 글자 모양으로 자른 배경(대표 색은 color) · 한 장 단색은 색 그대로 · 상자 칠은 상자 배경', async () => {
  const { renderArtifact, normalizeStyle, applyElementEdits, ctx } = await setup();
  const html = renderArtifact('google-gdn-580x400', ctx, normalizeStyle({ colors: ['#2456D6'] }));
  const grad = [{ type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#FF0000', pos: 100 }], opacity: 100 }];
  const h1 = applyElementEdits(html, { main: { fill: grad } });
  const m1 = h1.slice(h1.lastIndexOf('<', h1.indexOf('data-field="main"')), h1.indexOf('>', h1.indexOf('data-field="main"')));
  assert.match(m1, /background-clip:text/); assert.match(m1, /-webkit-text-fill-color:transparent/); assert.match(m1, /color:#800000/); assert.match(m1, /data-tfill-host="1"/);
  const h2 = applyElementEdits(html, { main: { fill: [{ type: 'solid', color: '#00AA00', opacity: 100 }] } });
  const m2 = h2.slice(h2.lastIndexOf('<', h2.indexOf('data-field="main"')), h2.indexOf('>', h2.indexOf('data-field="main"')));
  assert.match(m2, /color:#00AA00/); assert.ok(!/background-clip/.test(m2));
  // 상자(배경 있는 요소): 글자 칠은 안쪽 span 으로, 상자 칠은 상자 배경으로
  const box = '<div data-ad="1" style="position:relative;width:200px;height:100px"><div data-field="chip" style="position:absolute;left:0;top:0;background:#EEEEEE;color:#111111">모집</div></div>';
  const h3 = applyElementEdits(box, { chip: { fill: grad, bfill: [{ type: 'solid', color: '#0000FF', opacity: 50 }] } });
  assert.match(h3, /data-bfill="1"/); assert.match(h3, /background-color:transparent;background-image:linear-gradient\(rgba\(0,0,255,0\.5\),rgba\(0,0,255,0\.5\)\)/);
  assert.ok(!/background:#EEEEEE/.test(h3), '렌더러 상자 색은 걷는다');
  assert.match(h3, /<span data-tfill="1" style="display:inline-block;background-image:linear-gradient\(180deg,#000000 0%,#FF0000 100%\);-webkit-background-clip:text/);
});

test('[카카오] 비즈보드 썸네일(공식 둥근 칸 320×222)은 줄이지 않는다 — 광고주체 로고 칸이 그림 왼쪽 위 8·8 안에 남는다', async () => {
  const { renderArtifact, normalizeStyle, createContext } = await setup();
  const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
  for (const [ar, fw] of [[1, 0.95], [0.8, 0.9]]) {
    const meta = { field: { kind: 'illust', opaque: 1, focus: { x: 0.5, y: 0.5, w: fw, h: fw } }, ar, colors: ['#2244AA'] };
    const h = renderArtifact('kakao-bizboard-mo', ctx, normalizeStyle({ colors: ['#2456D6'], keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: meta, logo: 'data:image/png;base64,LOGO' }));
    const o = h.match(/<div data-object="1" data-slot-round="1" style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px/);
    assert.ok(o, `ar ${ar}`); assert.deepEqual([+o[1], +o[3], +o[4]], [601, 320, 222], `ar ${ar}: 칸 크기 고정`);
    const l = h.match(/data-logo-slot="adlabel" style="position:absolute;left:(\d+)px/); assert.equal(+l[1], 609);
  }
});
