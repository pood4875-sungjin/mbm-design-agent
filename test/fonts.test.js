import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FONTS, FONT_IDS, fontIds, fontStack, fontLink, registerCustomFont, customFontCss, isCustomFont } from '../core/fonts.js';
import { normalizeStyle } from '../core/style.js';
import { renderBanner } from '../core/renderers/banner.js';
import { renderEdm } from '../core/renderers/edm.js';
import { renderPrint } from '../core/renderers/print.js';
import { createContext, updateContext } from '../core/context.js';
import { SPECS } from '../core/contract.js';

const ctx = updateContext(createContext({
  name: 'MBM', date: 'd', venue: 'v', audience: 'a', cta: 'c',
}), { channelFields: { edm: { senderName: 'S', subject: 'T' } } });

// 10-14: 카탈로그 = 기본 Pretendard + 묶은 무료 폰트 8종(사용자 지정 순서 나눔스퀘어 → 네오 → 라운드 → 카카오 큰글씨가 앞). 자세한 모양 검사는 test/fonts-bundled.test.js
test('catalog starts with Paperlogy(default) · Pretendard · Freesentation, then the four user picks in order (10-15 저녁: 사용자 제공 폰트 2종 탑재)', () => {
  assert.deepEqual(FONT_IDS.slice(0, 8), ['Paperlogy', 'Pretendard', 'Freesentation', 'A2Z', 'NanumSquare', 'NanumSquareNeo', 'NanumSquareRound', 'KakaoBigSans']);
  for (const id of FONT_IDS) assert.ok(FONTS[id].label && FONTS[id].stack && FONTS[id].dir, id);
});

test('unknown font falls back to Paperlogy (default since 10-15)', () => {
  const s = normalizeStyle({ fonts: { heading: 'Comic Sans', body: 'Comic Sans' } });
  assert.equal(s.fonts.heading, 'KakaoBigSans');   // 10-15 밤: 기본 카카오 빅산스
  assert.match(fontStack(s.fonts.heading), /Kakao Big Sans/);
});

test('chosen font reaches the rendered stack', () => {
  const s = normalizeStyle({ colors: ['#0A3D91'], fonts: { heading: 'NanumSquareRound', body: 'NanumSquareRound' } });
  assert.match(renderBanner(ctx, s, SPECS['banner-300x250']), /나눔스퀘어라운드/);
  assert.match(renderPrint(ctx, s, SPECS['poster-a2']), /나눔스퀘어라운드/);
});

test('webfont link is included for print but never for email', () => {
  const s = normalizeStyle({ colors: ['#0A3D91'], fonts: { heading: 'NanumSquare', body: 'NanumSquare' } });
  assert.match(renderPrint(ctx, s, SPECS['poster-a2']), /<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net/);
  const edm = renderEdm(ctx, s, SPECS['edm-600']);
  assert.doesNotMatch(edm, /<link/, '이메일은 외부 CSS 금지');
  assert.match(edm, /NanumSquare/, '스택으로는 지정');
});

test('logo is embedded across media when provided', () => {
  const s = normalizeStyle({ colors: ['#0A3D91'], logo: 'data:image/png;base64,AAA' });
  for (const html of [
    renderBanner(ctx, s, SPECS['banner-300x250']),
    renderEdm(ctx, s, SPECS['edm-600']),
    renderPrint(ctx, s, SPECS['poster-a2']),
  ]) assert.match(html, /data:image\/png;base64,AAA/);
});

test('no logo means no img placeholder', () => {
  const s = normalizeStyle({ colors: ['#0A3D91'] });
  assert.doesNotMatch(renderPrint(ctx, s, SPECS['poster-a2']), /class="brand"/);
});

test('print keeps the veil over a busy key visual; the banner never puts copy on the image', () => {
  const kv = 'data:image/png;base64,AAA';
  const dark = normalizeStyle({ colors: ['#0A3D91'], keyVisual: kv,
    kvReadability: { banner: { text: '#FFFFFF', scrim: true }, print: { text: '#FFFFFF', scrim: true } } });
  assert.match(renderPrint(ctx, dark, SPECS['poster-a2']), /class="scrim"[^>]*rgba\(0,0,0/, '어두운 글자면 검은 베일');
  // 배너는 이미지를 글자 옆·아래에 따로 두므로 가림막이 필요 없다
  const html = renderBanner(ctx, dark, SPECS['banner-300x250']);
  assert.doesNotMatch(html, /data-scrim/);
  assert.match(html, /data-object="1"/);
});

test('fitKeyVisual still decides crop versus contain for print', async () => {
  const { fitKeyVisual } = await import('../core/palette.js');
  assert.equal(fitKeyVisual(1.2, 1.0, '#88CCFF').mode, 'cover', '비율이 비슷하면 크롭');
  const wide = fitKeyVisual(728 / 90, 1.0, '#88CCFF');
  assert.equal(wide.mode, 'contain');
  assert.match(wide.bg, /#88CCFF/, '여백은 가장자리 색으로 잇는다');
});

test('the banner field comes from the key visual and the image sits beside the copy', () => {
  const edge = (from, to) => ({ hex: from, from, to, rough: 0.004, opaque: 1 });
  const s = normalizeStyle({ colors: ['#0A3D91'], keyVisual: 'kv.png',
    kvMeta: { ar: 1.5, edge: '#88CCFF', colors: ['#5B2BD9'], field: { opaque: 1, edges: { left: edge('#E5CAFF', '#C7AEFF'), top: edge('#E5CAFF', '#E5CAFF') } } } });
  const wide = renderBanner(ctx, s, SPECS['banner-728x90']);
  assert.match(wide.split('>')[0], /background:linear-gradient\(180deg,#E5CAFF 0%,#C7AEFF 100%\)/, '가로형: 이미지 왼쪽 변의 색이 지면');
  assert.match(wide, /data-object="1" style="position:absolute;top:0;right:0px/);
  const tall = renderBanner(ctx, s, SPECS['banner-300x600']);
  // 10-20 캠페인 공통 지면(edgeField): 세로형도 가로형과 같은 그라데이션(왼쪽 변 위 반 → 아래 반) — 규격(facing)에 따라 지면이 갈리지 않는다. 전에는 위쪽 변 단색 #E5CAFF
  assert.match(tall.split('>')[0], /background:linear-gradient\(180deg,#E5CAFF 0%,#C7AEFF 100%\)/, '세로형: 가로형과 같은 지면(캠페인 공통)');
  assert.match(tall, /data-object="1" style="position:absolute;left:0;bottom:0/);
  // 사람이 배경색을 고르면 그 색이 이긴다
  const manual = renderBanner(ctx, { ...s, background: { mode: 'auto', color: '#101820' } }, SPECS['banner-300x600']);
  assert.match(manual.split('>')[0], /background:#101820;.*color:#FFFFFF/);
});

test('banner logo sits in the flow so it cannot collide with the title', () => {
  const s = normalizeStyle({ colors: ['#0A3D91'], logo: 'data:image/png;base64,AAA' });
  const html = renderBanner(ctx, s, SPECS['banner-300x250']);
  const logoTag = html.match(/<img[^>]+base64,AAA[^>]*>/)[0];
  assert.doesNotMatch(logoTag, /position:absolute/, '절대배치는 긴 제목과 겹친다');
  assert.match(logoTag, /object-fit:contain/, '가로세로비가 다른 로고도 찌그러지지 않게');
  assert.match(logoTag, /max-width/, '폭을 제한해 제목 자리를 침범하지 않게');
});

/* ── 사용자가 올린 폰트 ──
   행사 전용 서체는 CDN에 없다. 파일을 dataURL @font-face로 카탈로그에 끼운다.
   이 테스트들은 마지막에 둔다 — FONTS를 실제로 늘리므로 앞 테스트의 전제를 흔들지 않게. */

const UPLOAD = { id: 'custom-미다스체', label: '미다스체 (첨부)', dataUrl: 'data:font/woff2;base64,AAAA', format: 'woff2' };

test('an uploaded font joins the catalog without touching the pilot four', () => {
  registerCustomFont(UPLOAD);
  assert.ok(!FONT_IDS.includes(UPLOAD.id) && FONT_IDS.length === 12, 'FONT_IDS는 모듈 로드 시점 값 — 런타임 추가로 흔들리면 안 된다(10-15: Paperlogy·Freesentation·A2Z 추가로 9 → 12)');
  assert.ok(fontIds().includes(UPLOAD.id), 'fontIds()는 지금 고를 수 있는 전부를 준다');
  assert.ok(isCustomFont(UPLOAD.id));
  assert.ok(!isCustomFont('Pretendard'));
});

test('the uploaded family is namespaced so it cannot collide with an installed font', () => {
  registerCustomFont({ ...UPLOAD, id: 'custom-Pretendard', label: 'Pretendard 사본' });
  const stack = fontStack('custom-Pretendard');
  assert.match(stack, /mbmCustom_custom-Pretendard/);
  assert.notEqual(stack, FONTS.Pretendard.stack, '같은 이름 파일을 올려도 CDN 폰트로 되돌아가면 안 된다');
});

test('an uploaded font is embedded even where CDN links are banned', () => {
  registerCustomFont(UPLOAD);
  // dataURL은 외부 요청이 0이다 — 링크를 막는 이유(외부 CSS 요청)가 성립하지 않는다
  const blocked = fontLink(UPLOAD.id, false);
  assert.match(blocked, /@font-face/);
  assert.match(blocked, /data:font\/woff2/);
  assert.doesNotMatch(blocked, /<link/, '외부 링크는 여전히 나가지 않는다');
  assert.equal(fontLink(UPLOAD.id, true), blocked, '매체 정책과 무관하게 같은 결과');
  assert.equal(fontLink('NanumSquare', false), '', 'CDN 폰트는 정책 그대로');
});

test('the face css carries a marker so the app can avoid embedding it twice', () => {
  registerCustomFont(UPLOAD);
  const face = customFontCss(UPLOAD.id);
  assert.match(face, /^\/\*mbm-custom-font\*\//);
  assert.match(face, /font-weight:100 900/, '단일 굵기 파일이어도 위계가 무너지지 않게');
  assert.equal(customFontCss('Pretendard'), '', 'CDN 폰트에는 face가 없다');
});

test('an uploaded font reaches every renderer, including the ones that skip fontLink', () => {
  registerCustomFont(UPLOAD);
  const s = normalizeStyle({ colors: ['#0A3D91'], fonts: { heading: UPLOAD.id, body: UPLOAD.id } });
  assert.equal(s.fonts.heading, UPLOAD.id, '카탈로그에 있으므로 Pretendard로 되돌아가지 않는다');
  // 배너·eDM 렌더러는 fontLink를 부르지 않는다(외부 CSS 정책) — 스택까지는 반드시 도달해야 하고,
  // 실제 @font-face 주입은 앱의 regen()이 맡는다.
  for (const html of [renderBanner(ctx, s, SPECS['banner-300x250']), renderEdm(ctx, s, SPECS['edm-600'])]) {
    assert.match(html, /mbmCustom_/);
  }
  assert.match(renderPrint(ctx, s, SPECS['poster-a2']), /@font-face/, '인쇄물은 자기 경로로 임베드한다');
});
