import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBanner } from '../core/renderers/banner.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { hexToRgb, rgbToHsl } from '../core/palette.js';

const ctx = createContext({
  name: '2026 ONSITE MBM 서울', date: '2026-10-15', venue: '코엑스',
  audience: '건설 엔지니어', cta: '사전등록',
});
const style = normalizeStyle({ colors: ['#0A3D91', '#F5F7FA'] });
const spec = { channel: 'banner', w: 300, h: 250, unit: 'px', output: 'image' };

test('renderBanner emits fixed-size self-contained html', () => {
  const html = renderBanner(ctx, style, spec);
  assert.match(html, /width:300px/);
  assert.match(html, /height:250px/);
  assert.match(html, /2026 ONSITE MBM 서울/);
  assert.match(html, /사전등록/);
  assert.match(html, /#0A3D91/);
  assert.doesNotMatch(html, /http/, '외부 의존 금지 — 자기완결');
});

test('renderBanner uses key visual as background when present', () => {
  const withKv = normalizeStyle({ keyVisual: 'kv.png', colors: ['#0A3D91'] });
  assert.match(renderBanner(ctx, withKv, spec), /kv\.png/);
});

test('renderBanner escapes html in context values', () => {
  const bad = createContext({ name: '<script>x</script>', date: 'd', venue: 'v', audience: 'a', cta: 'c' });
  assert.doesNotMatch(renderBanner(bad, style, spec), /<script>/);
});

test('renderBanner variant 1 inverts to white background', () => {
  const html = renderBanner(ctx, style, { ...spec, variant: 1 });
  assert.match(html, /background:#fff/i);
  assert.match(html, /color:#0A3D91/);
});

test('renderBanner variant 2 adds bottom color band', () => {
  const html = renderBanner(ctx, style, { ...spec, variant: 2 });
  assert.match(html, /data-band="1"/);
});

/* ── 디자인 품질 회귀 방지 ── */

const wideLogo = normalizeStyle({ colors: ['#0A3D91'], logo: 'logo.svg' });
const LONG = '2026 ONSITE MBM 서울 구조엔지니어링 및 디지털 트윈 기술 혁신 컨퍼런스 with MIDAS IT';
const longCtx = createContext({ name: LONG, date: '2026-10-15', venue: '코엑스 그랜드볼룸', audience: 'a', cta: '사전등록' });
const titleSize = h => Number(h.match(/font-size:(\d+)px;font-weight:800/)[1]);

test('logo lives in the layout flow, never absolutely on top of the type', () => {
  // 절대배치로 얹으면 행사명이 길어질 때 글자를 덮는다 — 실제로 났던 버그다.
  const html = renderBanner(ctx, wideLogo, spec);
  const img = html.match(/<img[^>]*logo\.svg[^>]*>/)[0];
  assert.doesNotMatch(img, /position:absolute/);
  assert.match(img, /height:\d+px/, '높이로 크기를 잡고');
  assert.match(img, /max-width:\d+px/, '폭을 물린다');
  assert.match(img, /object-fit:contain/, '정사각·가로긴 로고 모두 왜곡 없이');
});

test('type scales with the surface instead of one fixed size', () => {
  // 기존은 전 규격 18px 고정이라 큰 지면이 텅 비어 보였다.
  const small = renderBanner(ctx, style, { ...spec, w: 320, h: 100 });
  const large = renderBanner(ctx, style, { ...spec, w: 336, h: 280 });
  assert.ok(titleSize(large) > titleSize(small), `${titleSize(large)} > ${titleSize(small)}`);
});

test('a long event name shrinks the title instead of spilling out', () => {
  const short = renderBanner(ctx, wideLogo, spec);
  const long = renderBanner(longCtx, wideLogo, spec);
  assert.ok(titleSize(long) < titleSize(short), `${titleSize(long)} < ${titleSize(short)}`);
  assert.match(long, /-webkit-line-clamp:\d+/, '남는 줄은 말줄임 — 지면 밖으로 흘리지 않는다');
});

test('titles can break long Korean compounds when a narrow format leaves no choice', () => {
  // keep-all만 걸면 "구조엔지니어링"이 160px 폭에서 줄바꿈되지 못하고 옆으로 흘러 잘린다.
  const sky = renderBanner(ctx, style, { ...spec, w: 160, h: 600 });
  assert.match(sky, /word-break:keep-all;overflow-wrap:anywhere/);
});

test('a plain colour field gets a derived gradient, not one flat slab', () => {
  const html = renderBanner(ctx, style, spec);
  assert.match(html, /radial-gradient/, '키비주얼이 없어도 지면에 결이 있다');
  // 지면에 쓰인 색은 전부 팔레트이거나 주색에서 명도·채도만 옮긴 파생색이어야 한다.
  // 색상(hue)까지 돌면 글자 대비 판정(순백/순흑)의 전제가 깨진다.
  const hueOf = h => rgbToHsl(hexToRgb(h))[0];
  const palette = new Set(Object.values(style.palette).filter(v => /^#[0-9A-Fa-f]{6}$/.test(v)).map(v => v.toUpperCase()));
  for (const m of html.matchAll(/#[0-9A-Fa-f]{6}/g)) {
    const hex = m[0].toUpperCase();
    if (palette.has(hex)) continue;
    const d = Math.abs(hueOf(hex) - hueOf(style.palette.primary));
    assert.ok(Math.min(d, 1 - d) < 0.02, `주색 계열 밖의 색이 들어왔다: ${hex}`);
  }
});

test('the compact strip gives the logo, the type and the cta separate columns', () => {
  const html = renderBanner(ctx, wideLogo, { ...spec, w: 728, h: 90 });
  assert.match(html, /flex-direction:row/);
  assert.match(html, /flex:1 1 auto;min-width:0/, '글자 칸만 줄어든다');
  assert.match(html, /flex:none/, '로고·CTA는 줄지 않는다');
});

test('banner hierarchy has three levels, not just title and subtitle', () => {
  const html = renderBanner(ctx, style, spec);
  assert.match(html, /letter-spacing:0\.18em/, '아이브로우(일자)');
  assert.match(html, /font-weight:800/, '행사명');
  assert.match(html, /코엑스/, '장소');
});

test('banner markup is XML-safe so canvas rasterization can parse it', () => {
  // PNG/JPG 내보내기는 SVG foreignObject를 거친다 — 엄격 XML이라
  // 값 없는 속성(<div data-scrim>)이 하나만 있어도 이미지 생성이 통째로 실패한다.
  const kv = normalizeStyle({ colors: ['#0A3D91'], keyVisual: 'kv.png',
    kvReadability: { banner: { text: '#FFFFFF', scrim: true } } });
  for (const variant of [0, 1, 2]) {
    const html = renderBanner(ctx, kv, { ...spec, variant });
    const bare = html.match(/<[a-z]+[^>]*\s([a-zA-Z-]+)(?=[\s>])[^>]*>/g) ?? [];
    assert.doesNotMatch(html, /\s(data-[a-z-]+)(?=[\s>])/, `variant ${variant}에 값 없는 속성이 있다`);
  }
});
