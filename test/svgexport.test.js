// SVG 내보내기(core/svgexport.js) 순수 부분 — 그라데이션 해석·정지점·배치·줄 묶기·레이어 이름·이스케이프
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escXml, splitTopLevel, parseColor, hexOf, paintAttrs, parseGradient, cssAngle, gradientLine, resolveStops,
  bgPosition, bgSize, bgPlacement, groupLines, layerName, uniqueId, roundRect, clampRadii, gradientDef, svgFrame, figmaBaseline,
} from '../core/svgexport.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test('escXml: 글자·속성에 들어갈 다섯 문자를 막는다', () => {
  assert.equal(escXml(`<b>"R&D" 'x'</b>`), '&lt;b&gt;&quot;R&amp;D&quot; &apos;x&apos;&lt;/b&gt;');
  assert.equal(escXml(null), '');
});

test('splitTopLevel: 괄호 안 쉼표는 나누지 않는다', () => {
  assert.deepEqual(splitTopLevel('linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 30%), url("a,b.png")'),
    ['linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 30%)', 'url("a,b.png")']);
  assert.deepEqual(splitTopLevel('rgba(0, 0, 0, 0.5) 12.5%', ' '), ['rgba(0, 0, 0, 0.5)', '12.5%']);
});

test('parseColor: 계산 스타일 색(rgb·rgba·hex·transparent)', () => {
  assert.deepEqual(parseColor('rgb(252, 241, 234)'), { r: 252, g: 241, b: 234, a: 1 });
  assert.deepEqual(parseColor('rgba(0, 0, 0, 0.72)'), { r: 0, g: 0, b: 0, a: 0.72 });
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.equal(parseColor('transparent').a, 0);
  assert.equal(parseColor('rgb(0 0 0 / 50%)').a, 0.5);
  assert.equal(parseColor('nonsense'), null);
  assert.equal(hexOf({ r: 252, g: 241, b: 234 }), '#FCF1EA');
});

test('paintAttrs: 불투명이면 opacity 를 쓰지 않고, 반투명이면 fill-opacity', () => {
  assert.equal(paintAttrs('rgb(0, 0, 0)'), 'fill="#000000"');
  assert.equal(paintAttrs('rgba(0, 0, 0, 0.66)'), 'fill="#000000" fill-opacity="0.66"');
  assert.equal(paintAttrs('rgba(255, 0, 0, 0.5)', 'stroke'), 'stroke="#FF0000" stroke-opacity="0.5"');
});

test('parseGradient: 방향·정지점(두 위치 포함)·repeating', () => {
  const g = parseGradient('linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.5) 15%, rgb(0, 0, 0) 30%)');
  assert.equal(g.type, 'linear'); assert.equal(g.head, 'to right'); assert.equal(g.stops.length, 3);
  assert.deepEqual(g.stops[1].pos, [{ v: 15, unit: '%' }]);
  const d = parseGradient('linear-gradient(rgb(255, 0, 0), rgb(0, 0, 255))');
  assert.equal(d.head, null); assert.equal(d.stops.length, 2);
  const two = parseGradient('linear-gradient(90deg, rgb(255, 0, 0) 0% 40%, rgb(0, 0, 255) 60%)');
  assert.equal(two.stops[0].pos.length, 2);
  assert.equal(parseGradient('repeating-linear-gradient(45deg, red 0px, blue 10px)')?.repeating, true);
  assert.equal(parseGradient('url(a.png)'), null);
  const r = parseGradient('radial-gradient(circle at 30% 20%, rgb(255, 255, 255), rgba(255, 255, 255, 0) 70%)');
  assert.equal(r.type, 'radial'); assert.equal(r.head, 'circle at 30% 20%');
});

test('cssAngle: 키워드·단위·모서리(상자 비율)', () => {
  assert.equal(cssAngle(null, 100, 100), 180);
  assert.equal(cssAngle('to right', 100, 50), 90);
  assert.equal(cssAngle('to top', 100, 50), 0);
  assert.equal(cssAngle('45deg', 1, 1), 45);
  near(cssAngle('0.25turn', 1, 1), 90);
  // 정사각형의 to bottom right = 135°
  near(cssAngle('to bottom right', 100, 100), 135);
  // 가로로 긴 상자의 to top right — 대각선에 수직(90°보다 작다)
  const a = cssAngle('to top right', 400, 100);
  assert.ok(a > 0 && a < 90, String(a));
});

test('gradientLine: 길이 = |w sinθ| + |h cosθ|, 중심을 지난다', () => {
  const v = gradientLine(180, 200, 100);
  assert.deepEqual([v.x1, v.y1, v.x2, v.y2].map(n => Math.round(n) + 0), [100, 0, 100, 100]);
  const h = gradientLine(90, 200, 100);
  near(h.x1, 0); near(h.x2, 200); near(h.len, 200);
  const d = gradientLine(45, 100, 100);
  near(d.len, 100 * Math.SQRT2);
});

test('resolveStops: 빈 위치 채우기·뒤로 가는 위치 막기·px→비율·두 위치', () => {
  const c = { r: 0, g: 0, b: 0, a: 1 };
  const st = resolveStops([{ color: c, pos: [] }, { color: c, pos: [] }, { color: c, pos: [] }], 100);
  assert.deepEqual(st.map(s => s.offset), [0, 0.5, 1]);
  const back = resolveStops([{ color: c, pos: [{ v: 50, unit: '%' }] }, { color: c, pos: [{ v: 20, unit: '%' }] }], 100);
  assert.deepEqual(back.map(s => s.offset), [0.5, 0.5]);
  const px = resolveStops([{ color: c, pos: [{ v: 0, unit: 'px' }] }, { color: c, pos: [{ v: 50, unit: 'px' }] }], 200);
  assert.deepEqual(px.map(s => s.offset), [0, 0.25]);
  const two = resolveStops([{ color: c, pos: [{ v: 0, unit: '%' }, { v: 40, unit: '%' }] }, { color: c, pos: [{ v: 60, unit: '%' }] }], 100);
  assert.deepEqual(two.map(s => s.offset), [0, 0.4, 0.6]);
});

test('bgSize·bgPosition·bgPlacement: cover/contain/명시 크기, 퍼센트·키워드·4값 위치', () => {
  assert.deepEqual(bgSize('cover', 200, 100, 100, 100), [200, 200]);
  assert.deepEqual(bgSize('contain', 200, 100, 100, 100), [100, 100]);
  assert.deepEqual(bgSize('auto 50px', 200, 100, 100, 200), [25, 50]);
  assert.deepEqual(bgSize('150% auto', 200, 100, 100, 50), [300, 150]);
  assert.deepEqual(bgSize('auto', 200, 100, 80, 40), [80, 40]);
  assert.deepEqual(bgPosition('100% 100%', 200, 100, 100, 100), [100, 0]);
  assert.deepEqual(bgPosition('right bottom', 200, 100, 100, 50), [100, 50]);
  assert.deepEqual(bgPosition('-12px 0px', 200, 100, 100, 100), [-12, 0]);
  assert.deepEqual(bgPosition('right 10px bottom 0px', 200, 100, 100, 50), [90, 50]);
  // 「contain + 오른쪽 아래」 — 580×400 구글 누끼 자리
  const p = bgPlacement({ size: 'contain', position: '100% 100%', area: { x: 294, y: 140, w: 286, h: 260 }, natural: [1100, 1000] });
  near(p.x + p.w, 580); near(p.y + p.h, 400); near(p.h, 260);
});

test('groupLines: 줄 나누기·토막(색이 다르면 나눔)·앞뒤 공백·폭 0 글자', () => {
  const k1 = 'a', k2 = 'b';
  const ch = (c, x, y, key = k1, w = 10) => ({ ch: c, x, y, w, h: 20, key, style: { key }, base: y + 16 });
  const chars = [
    ch('2', 0, 0), ch('0', 10, 0), ch(' ', 20, 0, k1, 5), ch('하', 25, 0, k2), ch('⁠', 35, 0, k1, 0), ch(' ', 35, 0, k1, 5),
    ch('채', 0, 24), ch('용', 10, 24),
  ];
  const L = groupLines(chars);
  assert.equal(L.length, 2);
  assert.deepEqual(L[0].runs.map(r => r.text), ['20 ', '하']);
  assert.equal(L[0].runs[1].x, 25);
  assert.deepEqual(L[1].runs.map(r => r.text), ['채용']);
  // 줄 앞 공백은 버린다
  const lead = groupLines([ch(' ', 0, 0, k1, 4), ch('가', 4, 0)]);
  assert.equal(lead[0].runs[0].text, '가'); assert.equal(lead[0].runs[0].x, 4);
  // 폭 0(접힌 공백)만 있는 줄은 없다
  assert.equal(groupLines([ch(' ', 0, 0, k1, 0)]).length, 0);
});

test('layerName·uniqueId: Figma 레이어 이름(한글) + id 겹침·공백 처리', () => {
  assert.equal(layerName({ 'data-ad': '1' }), '광고');
  assert.equal(layerName({ 'data-field': 'main' }), '메인');
  assert.equal(layerName({ 'data-field': 'sub' }), '서브');
  assert.equal(layerName({ 'data-field': 'date' }), '날짜');
  assert.equal(layerName({ 'data-field': 'detail' }), '상세');
  assert.equal(layerName({ 'data-field': 'cta' }), 'CTA');
  assert.equal(layerName({ 'data-chip': '1' }), '칩');
  assert.equal(layerName({ 'data-logo': '1' }), '로고');
  assert.equal(layerName({ 'data-object': '1' }), '키비주얼');
  assert.equal(layerName({ 'data-object': 'logo' }), '로고 자리');
  assert.equal(layerName({ 'data-field': 'unknownrole' }), 'unknownrole');
  assert.equal(layerName({ style: 'x' }), null);
  const used = new Set();
  assert.equal(uniqueId('칩 접수기간', used), '칩-접수기간');
  assert.equal(uniqueId('칩 접수기간', used), '칩-접수기간-2');
  assert.equal(uniqueId('2026 채용', used), '_2026-채용');
});

test('roundRect·clampRadii: 알약(999px) 반지름은 높이 절반으로, 네 귀가 다르면 path', () => {
  assert.deepEqual(clampRadii([999, 999, 999, 999], 80, 20), [10, 10, 10, 10]);
  assert.equal(roundRect(0, 0, 80, 20, [999, 999, 999, 999], 'fill="#000"'), '<rect x="0" y="0" width="80" height="20" rx="10" fill="#000"/>');
  assert.equal(roundRect(1, 2, 3, 4, [0, 0, 0, 0]), '<rect x="1" y="2" width="3" height="4"/>');
  assert.match(roundRect(0, 0, 100, 50, [10, 0, 0, 10]), /^<path d="M10,0H100V50H10A10,10 0 0 1 0,40V10A10,10 0 0 1 10,0Z"\/>$/);
});

test('gradientDef: 선형은 절대 좌표, 마스크용은 흰색 + 알파, 방사형은 타원 변환', () => {
  const g = parseGradient('linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 30%)');
  const d = gradientDef(g, 'g1', { x: 10, y: 20, w: 100, h: 50 }, { forMask: true });
  assert.match(d, /^<linearGradient id="g1" gradientUnits="userSpaceOnUse" x1="10" y1="45" x2="110" y2="45">/);
  assert.match(d, /<stop offset="0" stop-color="#FFFFFF" stop-opacity="0"\/><stop offset="0.3" stop-color="#FFFFFF"\/>/);
  const r = gradientDef(parseGradient('radial-gradient(50% 25% at 50% 50%, rgb(255, 0, 0), rgb(0, 0, 255))'), 'r1', { x: 0, y: 0, w: 200, h: 200 });
  assert.match(r, /<radialGradient id="r1" gradientUnits="userSpaceOnUse" cx="100" cy="100" r="100" gradientTransform="translate\(100 100\) scale\(1 0.5\) translate\(-100 -100\)">/);
});

test('svgFrame: SVG 는 작업 크기(1배) — 제출 배수(exportScale 2)를 줘도 width/height·viewBox 전부 캔버스 크기(10-28 사용자 결정, 자소설 550×400 ×2 → SVG 550×400)', () => {
  assert.equal(svgFrame(580, 400), 'width="580" height="400" viewBox="0 0 580 400"');
  assert.equal(svgFrame(540, 540, 1080, 1080), 'width="540" height="540" viewBox="0 0 540 540"');
  assert.equal(svgFrame(550, 400, 1100, 800), 'width="550" height="400" viewBox="0 0 550 400"');
});

test('figmaBaseline: Figma 글상자(1.2em)는 줄 상자 가운데 — 줄 간격이 넓어도 렌더 글자 위치와 같다(10-26 리멤버·자소설 달력)', () => {
  // 리멤버 공고 상세 상단 MO: 48px · 줄 간격 79 · 틀 y 70.1 → 렌더 줄 상자 top 59.4, Pretendard content 상자 57px 은 줄 상자 가운데(top 70.4)
  near(figmaBaseline({ top: 70.4, h: 57, lh: 79, fs: 48 }) - 48, 70.1, 0.05);
  // 줄 간격 = 1.2em 이면 예전(줄 상자 top + 1.0em)과 같다 — Kakao Big Sans content 1.48em 도 줄 상자 기준
  near(figmaBaseline({ top: 100 - (1.48 - 1.2) * 20 / 2, h: 1.48 * 20, lh: 24, fs: 20 }), 100 + 20, 0.01);
  // line-height 를 못 읽으면 content 상자 top 기준
  near(figmaBaseline({ top: 10, h: 12, lh: NaN, fs: 10 }), 20, 0.01);
});
