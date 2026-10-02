import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd, copyFor, templateScale } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
const ctx = createContext({
  client: '한진정보통신', role: '백엔드 개발자', employType: '정규직', location: '서울 강남',
  deadline: '2026-10-31', applyUrl: 'https://example.com/apply', notice: '본 광고는 고용정책기본법에 따릅니다',
}, 'recruit');
const style = normalizeStyle({ colors: ['#0B3C8C'] });

const attrs = html => [...html.matchAll(/\s(data-[a-z-]+)(?=[\s>])/g)].map(m => m[1]);

test('the shell is exactly the spec canvas and is marked for measurement', () => {
  const spec = specs['kakao-bizboard-mo'];
  const html = renderAd(ctx, style, spec);
  assert.match(html, /width:1029px;height:258px/);
  assert.match(html, /data-ad="1"/);
  assert.match(html, /data-spec="kakao-bizboard-mo"/);
});

test('markup is XML-safe — rasterization goes through SVG foreignObject', () => {
  for (const id of ['kakao-bizboard-mo', 'jasoseol-pc-premium-popup-pc', 'google-gdn-300x600', 'everytime-home-banner']) {
    const html = renderAd(ctx, style, specs[id]);
    assert.deepEqual(attrs(html), [], `${id}: 값 없는 속성`);
    assert.ok(!/<img[^>]*[^/]>/.test(html) || /<img[^>]*\/>/.test(html) || !/<img/.test(html), `${id}: img는 자기닫힘`);
  }
});

test('medium text colors are applied exactly where the medium defines them (kakao/NAP bizboard)', () => {
  const html = renderAd(ctx, style, specs['kakao-bizboard-mo']);
  assert.match(html, /data-field="main"[^>]*color:#4C4C4C/i);
  assert.match(html, /data-field="sub"[^>]*color:#(555555|777777)/i);
});

test('a transparent-background spec renders no fill and says so', () => {
  const html = renderAd(ctx, style, specs['kakao-bizboard-mo']);
  assert.match(html, /data-transparent="1"/);
  assert.doesNotMatch(html.split('>')[0], /background/);
  const opaque = renderAd(ctx, style, specs['google-gdn-300x600']);
  assert.match(opaque, /data-transparent="0"/);
  assert.match(opaque.split('>')[0], /background/);
});

test('font sizes stated by the medium are used as-is (jasoseol 35/22/17 on the 550×400 popup)', () => {
  const html = renderAd(ctx, style, specs['jasoseol-pc-premium-popup-pc']);
  assert.match(html, /data-field="main"[^>]*font-size:35px/);
  assert.match(html, /data-field="sub"[^>]*font-size:22px/);
});

test('the required font goes first in the stack when the medium names one', () => {
  const html = renderAd(ctx, style, specs['jasoseol-pc-premium-popup-pc']);
  assert.match(html, /font-family:\s*'Pretendard'/);
});

test('no button is drawn — not even where the medium has a CTA field', () => {
  // 구글 GDN은 글자 규정이 없다 → 기본 슬롯(메인·서브)만, CTA 없음
  const noCta = renderAd(ctx, style, specs['google-gdn-300x600']);
  assert.doesNotMatch(noCta, /data-field="cta"/);
  const withCta = renderAd(ctx, style, { ...specs['kakao-bizboard-mo'], rules: { ...specs['kakao-bizboard-mo'].rules, textLimits: [{ field: '메인문구', maxChars: 20, lines: 2 }, { field: '랜딩버튼', maxChars: 7, lines: 1 }] } });
  // 버튼은 그리지 않기로 했다(2026-10-02). CTA 칸이 있는 규격도 마찬가지 — 실제 소재 141장에도 버튼은 없었다.
  assert.doesNotMatch(withCta, /data-field="cta"/);
});

test('copy comes from the recruit context; an event context still renders through the same slots', () => {
  const c = copyFor(ctx);
  assert.equal(c.main, '한진정보통신 백엔드 개발자 채용');
  assert.equal(c.advertiser, '한진정보통신');
  assert.match(c.date, /10\.31|10-31|10\/31/);
  const ev = createContext({ name: 'MBM 2026', date: '2026-11-05', venue: '코엑스', audience: '고객사', cta: '사전등록' });
  const html = renderAd(ev, style, specs['google-gdn-300x600']);
  assert.match(html, /MBM 2026/);
});

test('numeric safe area becomes padding so text starts inside it', () => {
  // 에브리타임 홈배너: 상하좌우 20px
  const html = renderAd(ctx, style, specs['everytime-home-banner']);
  assert.match(html, /padding:20px 20px 20px 20px/);
});

test('copy ladder picks the longest phrasing that fits the medium character limit', () => {
  // 카카오 비즈보드 메인카피 15자: "한진정보통신 클라우드 플랫폼 엔지니어 채용"(23)는 못 들어가고 "클라우드 플랫폼 엔지니어 채용"(16)도 넘쳐 "클라우드 플랫폼 엔지니어"(13)가 뽑힌다
  const long = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울', deadline: '2026-10-31', applyUrl: 'x' }, 'recruit');
  const html = renderAd(long, style, specs['kakao-bizboard-mo']);
  assert.match(html, /data-field="main"[^>]*>클라우드 플랫폼 엔지니어</);
  // 규정이 없는 매체는 첫 칸(가장 긴 표현)을 그대로 쓴다
  const free = renderAd(long, style, specs['google-gdn-300x600']);
  assert.match(free, /data-field="main"[^>]*>한진정보통신 클라우드 플랫폼 엔지니어 채용</);
});

test('logo-only specs (브랜드 로고 96×96, 프로필 300) carry no headline slot', () => {
  const html = renderAd(ctx, style, specs['blind-brand-logo']);
  assert.doesNotMatch(html, /data-field="main"/);
  assert.match(html, /data-field="advertiser"[^>]*>한진정보통신</, '로고 파일이 없으면 광고주명이 워드마크 자리에 선다');
});

test('a strip lays out in a row, and a flat spec uses a solid background', () => {
  const strip = renderAd(ctx, style, specs['albamon-pc-main-curtain']);
  assert.match(strip, /flex-direction:row;align-items:center/);
  const flat = renderAd(ctx, style, { ...specs['google-gdn-300x600'], flat: true });
  assert.match(flat.split('>')[0], /background:#0B3C8C;/i);
});

test('"이미지 밖 텍스트 필드" rows are handed over, not drawn — a profile image with only such rows is logo-only', () => {
  const html = renderAd(ctx, style, specs['everytime-daily-message-profile']);
  assert.doesNotMatch(html, /data-field="main"/);
  assert.equal(specs['everytime-daily-message-profile'].outsideTexts.length, 3);
});

/* ── 디자인 프로필(core/design.js)이 그림을 정한다 ── */
import { DESIGN } from '../core/design.js';

test('the date is plain text — no outlined pill, no widened tracking', () => {
  for (const id of ['google-gdn-580x400', 'kakao-bizboard-mo', 'nap-dsp-full-300x250']) {
    const html = renderAd(ctx, style, specs[id]);
    assert.doesNotMatch(html, /data-field="date"[^>]*border-radius/, `${id}: 날짜에 테두리 알약을 두르지 않는다`);
    assert.doesNotMatch(html, /letter-spacing/, `${id}: 자간을 건드리지 않는다`);
  }
});

test('a light-field medium (자소설 9/13 밝은 단색) paints a light background and dark copy', () => {
  assert.ok((DESIGN.jasoseol?.bgLight?.value ?? 0) >= 0.6, '프로필 전제');
  const html = renderAd(ctx, style, specs['jasoseol-pc-premium-popup-pc']);
  // 순백이 아니라 브랜드색 파스텔 틴트(현대케피코 라벤더 블루) — 위가 조금 진하고 아래가 옅다
  assert.match(html.split('>')[0], /background:linear-gradient\(180deg,#[C-F][0-9A-F]{5} 0%,#[D-F][0-9A-F]{5} 100%\)/i);
  assert.match(html, /data-field="main"[^>]*color:#000000/);
});

test('tall formats stack and center, wide formats keep copy left — and the logo follows', () => {
  const withLogo = { ...style, logo: 'data:image/png;base64,iVBORw0KGgo=' };
  const tallHtml = renderAd(ctx, withLogo, specs['google-gdn-300x600']);
  assert.match(tallHtml, /text-align:center/);
  assert.match(tallHtml, /justify-content:center;height:\d+px/, '중앙 정렬이면 로고도 상단 중앙');
  const wideHtml = renderAd(ctx, withLogo, specs['google-gdn-970x250']);
  assert.match(wideHtml, /text-align:left/);
});

test('with a key visual the image bleeds to the edge instead of sitting in a rounded box', () => {
  const kv = { ...style, keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: { ar: 1.5, edge: '#0B3C8C' } };
  const wide = renderAd(ctx, kv, specs['naver-gfa-mobile-da-1250x560']);
  assert.match(wide, /data-object="1" style="position:absolute;top:0;right:0px;[^"]*height:560px/, '오른쪽 끝·위아래 끝까지');
  assert.doesNotMatch(wide, /data-object="1"[^>]*border-radius/);
  assert.match(wide, /data-object="1"[^>]*mask-image:linear-gradient\(to right,transparent 0%/, '글자 쪽 변만 지면으로 녹인다');
  const tallHtml = renderAd(ctx, kv, specs['google-gdn-300x1050']);
  assert.match(tallHtml, /data-object="1" style="position:absolute;left:0;bottom:0;width:300px/);
  // 키비주얼이 없으면 오브젝트 자체가 없다 — 빈 상자를 그리지 않는다
  assert.doesNotMatch(renderAd(ctx, style, specs['naver-gfa-mobile-da-1250x560']), /data-object/);
});

test('the field colour is read from the key visual, not chosen as light or dark', () => {
  const edge = (from, to, rough = 0.004, opaque = 1) => ({ hex: from, from, to, rough, opaque });
  const kvMeta = { colors: ['#E67814'], field: { opaque: 1, edges: { left: edge('#F2E9FF', '#D9C8FF'), top: edge('#F2E9FF', '#F2E9FF'), right: edge('#F2E9FF', '#D9C8FF'), bottom: edge('#D9C8FF', '#D9C8FF') } } };
  const kv = { ...style, keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta };
  const wide = renderAd(ctx, kv, specs['naver-gfa-mobile-da-1250x560']).split('>')[0];
  assert.match(wide, /background:linear-gradient\(180deg,#F2E9FF 0%,#D9C8FF 100%\)/, '이미지의 왼쪽 변에 그라데이션이 있으면 지면도 그 그라데이션');
  assert.match(wide, /color:#000000/, '밝은 지면이면 글자는 검정 — 사람이 고르지 않는다');
  assert.match(wide, /data-field-source="kv-edge"/);
  // 변이 한 색이면 지면도 단색
  const flatEdge = { ...kv, kvMeta: { ...kvMeta, field: { opaque: 1, edges: { ...kvMeta.field.edges, left: edge('#123A6B', '#123A6B') } } } };
  assert.match(renderAd(ctx, flatEdge, specs['naver-gfa-mobile-da-1250x560']).split('>')[0], /background:#123A6B;.*color:#FFFFFF/);
  // 가장자리가 복잡한 사진이면 대표색
  const photo = { ...kv, kvMeta: { ...kvMeta, field: { opaque: 1, edges: { ...kvMeta.field.edges, left: edge('#777777', '#333333', 0.12) } } } };
  assert.match(renderAd(ctx, photo, specs['naver-gfa-mobile-da-1250x560']).split('>')[0], /background:#E67814;/);
  // 단색만 허용하는 지면(에브리타임 홈배너)은 그라데이션을 접는다
  assert.doesNotMatch(renderAd(ctx, kv, specs['everytime-home-banner']).split('>')[0], /linear-gradient/);
});

test('template measurements taken on a 2x frame are scaled to the 1x canvas (자소설 PC달력배너)', () => {
  const spec = specs['jasoseol-pc-calendar-pc'];
  assert.equal(spec.w, 164);
  assert.equal(templateScale(spec.rules, spec.w), 0.5, '328×466 프레임 실측 → 164×233 캔버스');
  const html = renderAd(ctx, style, spec);
  // 문구 칸 x≈49(2배) → 25(1배), 폰트 40(2배) → 20(1배)
  assert.match(html.split('>')[0], /padding:\d+px \d+px \d+px 2[45]px/);
  assert.match(html, /data-field="main"[^>]*font-size:20px/);
  // 환산할 것이 없는 규격은 1
  assert.equal(templateScale(specs['kakao-bizboard-mo'].rules, 1029), 1);
});

/* ── 자소설 실제 소재의 위계: 로고 칸 → 서브(시즌) → 메인 → 상세("라벨 : 값") → 이미지 띠 ── */
test('자소설 jobpost renders sub above main, detail lines below, in the template text column', () => {
  const html = renderAd(ctx, style, specs['jasoseol-pc-standard-jobpost-pc']);
  const iSub = html.indexOf('data-field="sub"'), iMain = html.indexOf('data-field="main"'), iDet = html.indexOf('data-field="detail"');
  assert.ok(iSub > 0 && iMain > 0 && iDet > 0, '세 슬롯이 모두 있어야 한다');
  assert.ok(iSub < iMain && iMain < iDet, '서브 → 메인 → 상세 순');
  assert.match(html, /data-field="detail"[^>]*>.*모집직무/s);
  assert.match(html, /data-field="main"[^>]*font-size:24px/, '템플릿 폰트 크기 그대로');
  assert.match(html.split('>')[0], /padding:\d+px \d+px \d+px 1[56]px/, '문구 칸 x=15.5');
});

test('a logo goes into the template logo slot exactly (130×30 at 15,23) and is dropped where the medium forbids one', () => {
  const withLogo = { ...style, logo: 'data:image/png;base64,iVBORw0KGgo=' };
  const html = renderAd(ctx, withLogo, specs['jasoseol-pc-standard-jobpost-pc']);
  assert.match(html, /data-logo-slot="1"[^>]*left:1[56]px;top:23px;width:130px;height:30px/);
  // 로고 칸 아래에서 글자가 시작한다 (템플릿: 로고 23~53 → 서브 82)
  assert.match(html.split('>')[0], /padding:(7[5-9]|8[0-9])px/);
  // M스탠다드 메인배너·PC달력배너는 로고 삽입 불가
  assert.doesNotMatch(renderAd(ctx, withLogo, specs['jasoseol-m-standard-main-mo']), /data-logo/);
  assert.doesNotMatch(renderAd(ctx, withLogo, specs['jasoseol-pc-calendar-pc']), /data-logo/);
});

test('on a dark field the white logo variant is used as-is; without one the colour logo is inverted', () => {
  const dark = specs['google-gdn-580x400'];   // 단색 브랜드 지면 → 흰 글자
  const both = { ...style, logo: 'data:image/png;base64,AAAA', logoLight: 'data:image/png;base64,BBBB' };
  const html = renderAd(ctx, both, dark);
  assert.match(html, /data-logo="1" src="data:image\/png;base64,BBBB"/);
  assert.doesNotMatch(html, /invert\(1\)/);
  const only = renderAd(ctx, { ...style, logo: 'data:image/png;base64,AAAA' }, dark);
  assert.match(only, /src="data:image\/png;base64,AAAA"[^>]*invert\(1\)/);
  // 밝은 지면(자소설)에서는 원색 로고 그대로
  const light = renderAd(ctx, both, specs['jasoseol-pc-premium-popup-pc']);
  assert.match(light, /src="data:image\/png;base64,AAAA"/);
  assert.doesNotMatch(light, /invert\(1\)/);
});

test('with a key visual the template image area is filled full-bleed at the template rect', () => {
  const kv = { ...style, keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: { ar: 1.5, edge: '#0B3C8C' } };
  const html = renderAd(ctx, kv, specs['jasoseol-pc-standard-jobpost-pc']);
  assert.match(html, /data-object="1"[^>]*left:0px;top:370px;width:160px;height:230px/);
});

test('the sub line does not repeat what the headline already says', () => {
  for (const id of ['naver-gfa-mobile-da-1250x560', 'google-gdn-580x400', 'kakao-display-pc-promo']) {
    const html = renderAd(ctx, style, specs[id]);
    const main = html.match(/data-field="main"[^>]*>([^<]*)</)[1];
    const sub = html.match(/data-field="sub"[^>]*>([^<]*)</)?.[1] ?? '';
    assert.ok(!sub || !sub.split(/\s+/).every(w => main.includes(w)), `${id}: "${sub}"가 "${main}" 안에 다 들어 있다`);
  }
});

test('an image whose facing edge matches the field joins at that edge; a busy photo is centred and melted wider', () => {
  const edge = (from, to, rough = 0.004) => ({ hex: from, from, to, rough, opaque: 1 });
  const calm = { colors: ['#E67814'], field: { opaque: 1, edges: { left: edge('#123A6B', '#123A6B'), top: edge('#123A6B', '#123A6B'), right: edge('#123A6B', '#123A6B'), bottom: edge('#123A6B', '#123A6B') } } };
  const busy = { colors: ['#E67814'], field: { opaque: 1, edges: { left: edge('#777777', '#333333', 0.12), top: edge('#777777', '#333333', 0.12), right: edge('#777777', '#333333', 0.12), bottom: edge('#777777', '#333333', 0.12) } } };
  const kv = 'data:image/png;base64,iVBORw0KGgo=';
  const a = renderAd(ctx, { ...style, keyVisual: kv, kvMeta: calm }, specs['naver-gfa-mobile-da-1250x560']);
  assert.match(a, /data-object="1"[^>]*left center\/cover[^>]*#000 10%/);
  const b = renderAd(ctx, { ...style, keyVisual: kv, kvMeta: busy }, specs['naver-gfa-mobile-da-1250x560']);
  assert.match(b, /data-object="1"[^>]*center\/cover[^>]*#000 26%/);
  // 배경을 딴 이미지는 자르지 않고, 녹이지도 않는다
  const cut = { colors: ['#E67814'], field: { opaque: 0.1, edges: {} } };
  const c = renderAd(ctx, { ...style, keyVisual: kv, kvMeta: cut }, specs['naver-gfa-mobile-da-1250x560']);
  assert.match(c, /data-object="1"[^>]*right center\/contain/);
  assert.doesNotMatch(c, /data-object="1"[^>]*mask-image/);
});
