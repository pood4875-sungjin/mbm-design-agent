import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd, copyFor, templateScale } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
// 10-16: 카카오 PC디스플레이 1200×600 은 한국앤컴퍼니 샘플 틀(templateMold)이 생겼다 — 이 파일의 자유 배치 검증은 틀 뗀 사본으로(숫자·안전영역·글자 한도는 그대로)
specs['kakao-display-pc-promo'] = (e => { const c = structuredClone(e); delete c.rules.safeArea.measuredFromTemplate.mold; return c; })(specs['kakao-display-pc-promo']);
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
  // 레퍼런스 문법(2026-10-06): 메인 = 회사 + 채용구분(없으면 고용형태) + 채용, 직무는 상세 줄로
  assert.equal(c.main, '한진정보통신 정규직 채용');
  assert.equal(c.sub, '2026 하반기', '시즌이 없으면 마감일에서 읽는다 — 적어 준 슬로건이 없으면 시즌이 먼저, 회사명을 넣은 기본 아이브로는 그 다음');
  assert.equal(c.advertiser, '한진정보통신');
  assert.match(c.date, /10\.31|10-31|10\/31/);
  const ev = createContext({ name: 'MBM 2026', date: '2026-11-05', venue: '코엑스', audience: '고객사', cta: '사전등록' });
  const html = renderAd(ev, style, specs['google-gdn-300x600']);
  assert.match(html, /MBM 2026/);
});

test('numeric safe area is a floor for padding — the reference margin wins when it is larger', () => {
  // 에브리타임 홈배너 640×200: 안전영역 상하좌우 20px. 가로형 레퍼런스 왼쪽 여백은 높이의 16.5%(33px)
  const html = renderAd(ctx, style, specs['everytime-home-banner']);
  const [t, r, b, l] = html.match(/padding:(\d+)px (\d+)px (\d+)px (\d+)px/).slice(1).map(Number);
  assert.ok(t >= 20 && r >= 20 && b >= 20 && l >= 20, `안전영역 안에서 시작한다 (${t} ${r} ${b} ${l})`);
  assert.equal(l, 33);
});

test('copy ladder picks the longest phrasing that fits the medium character limit', () => {
  // 카카오 비즈보드 메인카피 15자: "한진정보통신 신입/경력사원 채용"(17)은 못 들어가고 "신입/경력사원 채용"(10)이 뽑힌다
  const long = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', hiringType: '신입/경력사원', location: '서울', deadline: '2026-10-31', applyUrl: 'x' }, 'recruit');
  const html = renderAd(long, style, specs['kakao-bizboard-mo']);
  // "/" 뒤의 U+2060은 줄바꿈 방지용 단어 결합자(6자까지) · 7자 이상 낱말은 U+200B 줄바꿈 자리(10-14 t1014 — 좁은 칸에서 낱말 속이 끊기지 않게)
  assert.match(html, /data-field="main"[^>]*>신입\/[\u2060\u200B]?경력사원 채용</);
  // 규정이 없는 매체는 첫 칸(가장 긴 표현)을 그대로 쓴다. 구글은 시즌이 메인 첫머리 — 적지 않았으면 마감일에서 유추한 시즌(10-06 "정보 없는 건 임의로 넣어야지")
  const free = renderAd(long, style, specs['google-gdn-300x600']);   // 10-16: 구글 300×600 은 템플릿 64:1090 틀 — 메인 2줄 칸(232px, Bold 42), 서브 칸 1줄 223px(안 들어가면 비움)
  assert.match(free, /data-field="main"[^>]*>[^<]+(<br\/>[^<]+){0,3}</, '메인 ≤4줄'); assert.doesNotMatch(free, /data-field="main"[^>]*>[^<]*<br\/>[^<]*<br\/>/);
  assert.match(free, /data-field="main"[^>]*>[\s\S]{0,200}?채용/);   // 10-16: 비씨 틀 메인 4줄 — 채용구분은 아랫줄에 올 수 있다
  // 서브 칸(1줄 223px)에 기본 아이브로가 안 들어가면 비운다(mold.subOptional) — 잘린 채 그리지 않는다
  assert.doesNotMatch(free, /data-field="sub"[^>]*>한진정보통신에서 함께할 인재를 찾습니다<\/div>\n<div data-field="main"[^>]*max-height:1/);
  // 직무는 상세 줄에 간다 — 상세 칸이 있는 매체(자소설 M팝업 상세문구 22자×3줄)에서
  const popup = renderAd(long, style, specs['jasoseol-m-premium-popup-mo']);
  assert.match(popup, /모집직무 :<\/b> 클라우드 플랫폼 엔지니어/);   // 10-15 틀(M팝업): 「라벨 :」 굵게 + 값
});

test('logo-only specs (브랜드 로고 96×96, 프로필 300) carry no headline slot', () => {
  const html = renderAd(ctx, style, specs['blind-brand-logo']);
  assert.doesNotMatch(html, /data-field="main"/);
  assert.match(html, /data-field="advertiser"[^>]*>한진정보통신</, '로고 파일이 없으면 광고주명이 워드마크 자리에 선다');
});

test('a strip under 120px lays out in a row, and a flat spec uses a solid background', () => {
  // 레퍼런스가 없는 120px 미만 띠만 가로 한 줄 문법. 2160×160 커튼 배너는 가로형 레퍼런스 문법(세로 가운데 쌓기)
  const strip = renderAd(ctx, style, specs['albamon-pc-sub-bottom']);   // 10-15 저녁: NAP 띠·전면·PC 는 공식 템플릿 틀(mold) — 자유 배치 픽스처는 다른 매체로(알바몬 PC 서브 하단 495×110)
  assert.match(strip, /flex-direction:row;align-items:center/);
  assert.match(renderAd(ctx, style, specs['albamon-pc-main-curtain']), /justify-content:center/);
  const flat = renderAd(ctx, style, { ...specs['google-gdn-300x600'], flat: true });
  assert.match(flat.split('>')[0], /background:#[0-9A-F]{6};/i, '단색 — 구글은 밝은 브랜드 틴트, 그라데이션 없이');
});

test('"이미지 밖 텍스트 필드" rows are handed over, not drawn — a profile image with only such rows is logo-only', () => {
  const html = renderAd(ctx, style, specs['everytime-daily-message-profile']);
  assert.doesNotMatch(html, /data-field="main"/);
  assert.equal(specs['everytime-daily-message-profile'].outsideTexts.length, 3);
});

/* ── 디자인 프로필(core/design.js)이 그림을 정한다 ── */
import { DESIGN } from '../core/design.js';

test('the date is plain text — no outlined pill, no widened tracking', () => {
  for (const id of ['google-gdn-580x400', 'kakao-bizboard-mo', 'kakao-display-pc-promo']) {   // 10-15 밤: NAP 300×250 은 HS화성 틀(날짜 알약 + 자간 -2%) — 자유 매체로
    const html = renderAd(ctx, style, specs[id]);
    assert.doesNotMatch(html, /data-field="date"[^>]*border-radius/, `${id}: 날짜에 테두리 알약을 두르지 않는다`);
    // 자간은 메인(28px 이상)만 좁힌다(CANON tracking −2.5% — Figma 9월 공채 typo A3). 날짜·서브·상세는 건드리지 않는다
    assert.doesNotMatch(html.replace(/<div data-field="main"[^>]*>/g, ''), /letter-spacing/, `${id}: 메인 밖 글자의 자간을 건드리지 않는다`);
  }
});

test('a light-field medium (자소설 9/13 밝은 단색) paints a light background and dark copy', () => {
  assert.ok((DESIGN.jasoseol?.bgLight?.value ?? 0) >= 0.6, '프로필 전제');
  const html = renderAd(ctx, style, specs['jasoseol-pc-premium-popup-pc']);
  // 순백이 아니라 브랜드색 파스텔 틴트(현대케피코 라벤더 블루) — 위가 조금 진하고 아래가 옅다
  // 10-15 템플릿 틀(templateMold): 자소설 PC팝업은 세아제강 샘플 28:124 이 틀 — 밝은 틴트 지면(단색 또는 위가 조금 진한 그라데이션) + 샘플 글자색 #555555(브랜드색 메인 아님)
  assert.match(html.split('>')[0], /background:(linear-gradient\(180deg,#[C-F][0-9A-F]{5} 0%,#[D-F][0-9A-F]{5} 100%\)|#[C-F][0-9A-F]{5});/i);
  assert.match(html, /data-field="main"[^>]*color:#555555/, '틀 글자색은 샘플 실측(세아제강 #555555) — 밝은 지면에서 브랜드색으로 바꾸지 않는다(10-15)');
});

test('every shape is left-aligned like the references; the logo floats top-right (tall) or top-centre (tower)', () => {
  // 그림이 있을 때 로고는 작게 위에 뜬다. (그림이 없으면 로고가 오브젝트 자리로 간다 — 아래 별도 테스트)
  const withLogo = { ...style, logo: 'data:image/png;base64,iVBORw0KGgo=', keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: { ar: 1, px: [600, 600] } };
  const tallHtml = renderAd(ctx, withLogo, specs['google-gdn-300x600']);   // 10-16: 구글 300 세로형은 템플릿 64:1090 틀 — 가운데 정렬, 로고 우측 칸 (188,20) 누끼 그대로
  assert.match(tallHtml, /data-field="main"[^>]*text-align:center/);
  assert.match(tallHtml, /data-logo-slot="1" style="position:absolute;left:194px;top:19px;width:91px;height:18px/   /* 10-16 저녁 사용자 수정본 135:1353: 300×600 로고 오른쪽 위(전 가운데 79,35) */, '세로형 로고 = 비씨월드 CI 자리 (79,35) 가운데(10-16)');
  assert.match(tallHtml, /data-field="main"[^>]*>[\s\S]{0,200}?정규직 채용/, '메인에 채용구분'); assert.doesNotMatch(tallHtml, /data-field="main"[^>]*>[^<]*(<br\/>[^<]*){4}/, '메인 ≤4줄(비씨)');
  const tower = renderAd(ctx, withLogo, specs['google-gdn-300x1050']);
  assert.match(tower, /data-logo-slot="1" style="position:absolute;left:104px;top:35px;width:91px;height:18px/   /* 10-16 저녁 수정본 135:1375: 1050 로고 가운데 위 */, '세로 띠 로고 = 우측 작은 칸(ABL logo2 자리), 흰 상자 없음(10-16)');
  // 세로 띠도 구글은 회사가 메인에 남는다(일화 "㈜일화 / 신입/경력 / 사원 모집")
  assert.match(tower, /data-field="main"[^>]*>(2026 하반기(<br\/>| ))?한진정보통신/);
  const wideHtml = renderAd(ctx, withLogo, specs['remember-main-top-pc']);
  assert.match(wideHtml, /text-align:left/);
  assert.doesNotMatch(wideHtml, /data-logo/, '가로형 레퍼런스(리멤버)에는 로고가 없다 — 매체가 요구할 때만');
  // 구글 GDN은 규정이 없는 대신 보드 가이드가 로고 자리를 정한다 — 가로형에도 우상단(970 예시 7/7, 템플릿 로고 상자 118×31)
  const gdnWide = renderAd(ctx, withLogo, specs['google-gdn-970x250']);
  assert.match(gdnWide, /data-logo-slot="1" style="position:absolute;left:855px;top:17px;width:96px;height:19px/   /* 10-16 저녁 수정본 135:1333 */, '구글 가로형 로고 = 비씨월드 CI 자리 (848,17)');
});

test('wide formats follow the references: company and job on two lines where the medium gives two main rows', () => {
  // 리멤버 메인 상단 MO: "메인 문구 1"·"메인 문구 2" 각 12자 — 안랩 "AhnLab / 신입/경력 채용"처럼 회사 / 채용 문구
  const html = renderAd(ctx, style, specs['remember-main-top-mo']);
  assert.match(html, /data-field="main"[^>]*>한진정보통신<br\/>[^<]+</);
  // 카카오 비즈보드: 메인 1줄 15자 — 쪼개지 않는다. 둘째 줄(서브)은 접수기간 — 혼자 선 날짜 줄은 라벨 없이(Figma 9월 공채 12/12, typo A7)
  const biz = renderAd(ctx, style, specs['kakao-bizboard-mo']);
  assert.doesNotMatch(biz, /data-field="main"[^>]*<br/);
  assert.match(biz, /data-field="sub"[^>]*>~10\.31\(토\)</);
});

test('with a key visual the image bleeds to the edge instead of sitting in a rounded box', () => {   // 10-15 저녁: 네이버 모바일 DA 는 공식 템플릿 틀 — 자유 가로형 픽스처는 카카오 디스플레이 PC 1200×600
  const kv = { ...style, keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: { ar: 1.5, edge: '#0B3C8C' } };
  const wide = renderAd(ctx, kv, specs['kakao-display-pc-promo']);
  assert.match(wide, /data-object="1" style="position:absolute;top:0;right:0px;[^"]*height:600px/, '오른쪽 끝·위아래 끝까지');
  assert.doesNotMatch(wide, /data-object="1"[^>]*border-radius/);
  assert.match(wide, /data-object="1"[^>]*mask-image:linear-gradient\(to right,transparent 0%/, '글자 쪽 변만 지면으로 녹인다');
  const tallHtml = renderAd(ctx, kv, specs['google-gdn-300x1050']);   // 10-15 저녁: ABL 틀 그림 칸 (1,804) 299×110
  assert.match(tallHtml, /data-object="1" style="position:absolute;left:0px;top:\d+px;width:300px;height:\d+px;[^"]*cover/, '10-15 밤: 틀 매체 KV 는 글자 상자를 피한 아래 띠(자유 배치) — 사진 cover');
  // 키비주얼이 없으면 오브젝트 자체가 없다 — 빈 상자를 그리지 않는다
  assert.doesNotMatch(renderAd(ctx, style, specs['kakao-display-pc-promo']), /data-object/);
});

test('the field colour is read from the key visual, not chosen as light or dark', () => {
  const edge = (from, to, rough = 0.004, opaque = 1) => ({ hex: from, from, to, rough, opaque });
  const kvMeta = { colors: ['#E67814'], field: { opaque: 1, edges: { left: edge('#F2E9FF', '#D9C8FF'), top: edge('#F2E9FF', '#F2E9FF'), right: edge('#F2E9FF', '#D9C8FF'), bottom: edge('#D9C8FF', '#D9C8FF') } } };
  const kv = { ...style, keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta };
  const wide = renderAd(ctx, kv, specs['kakao-display-pc-promo']).split('>')[0];
  // 10-20 fieldAlign: 지면 그라데이션은 캔버스 0~100% 가 아니라 그림 자리에 px 로 걸린다(위 색 → 아래 색, 그림 위 25%·아래 75% 자리) — 색은 같다
  assert.match(wide, /background:linear-gradient\(180deg,#F2E9FF [\d.]+px,#D9C8FF [\d.]+px\)/, '이미지의 왼쪽 변에 그라데이션이 있으면 지면도 그 그라데이션(그림 자리에 맞춰)');
  assert.match(wide, /color:#0B3C8C/, '밝은 지면이면 메인은 브랜드색, 보조 글자는 검정 계열 — 사람이 고르지 않는다');
  assert.match(wide, /data-field-source="kv-edge"/);
  // 변이 한 색이면 지면도 단색
  const flatEdge = { ...kv, kvMeta: { ...kvMeta, field: { opaque: 1, edges: { ...kvMeta.field.edges, left: edge('#123A6B', '#123A6B') } } } };
  assert.match(renderAd(ctx, flatEdge, specs['kakao-display-pc-promo']).split('>')[0], /background:#123A6B;.*color:#FFFFFF/);
  // 글자 쪽 변에만 그림이 걸쳐 있고 다른 변이 평평하면(한미글로벌 3D) 그 바탕색 — 대표색을 쓰면 그림의 바탕이 상자로 드러나고 규격마다 지면색이 달라진다
  const busyLeft = { ...kv, kvMeta: { ...kvMeta, field: { opaque: 1, edges: { ...kvMeta.field.edges, left: edge('#777777', '#333333', 0.12) } } } };
  const busyHtml = renderAd(ctx, busyLeft, specs['kakao-display-pc-promo']).split('>')[0];
  // 10-20 캠페인 공통 지면(edgeField): 글자 쪽 변이 아니라 그림 네 변에서 — 위(#F2E9FF)·아래(#D9C8FF) 평평한 변이 다르면 그 세로 그라데이션(어느 규격이든 같은 답). 전에는 「첫 평평한 변」 단색 #F2E9FF
  assert.match(busyHtml, /background:linear-gradient\(180deg,#F2E9FF [\d.]+px,#D9C8FF [\d.]+px\)/);
  assert.match(busyHtml, /data-field-source="kv-edge"/);
  // 네 변이 모두 복잡한 사진(한독 사옥)은 브랜드색 지면 — 사진의 변은 바탕이 아니다
  const rough = (a, b) => edge(a, b, 0.12);
  const photo = { ...kv, kvMeta: { ...kvMeta, field: { opaque: 1, kind: 'photo', flatEdges: 0, edges: { left: rough('#777777', '#333333'), top: rough('#8899AA', '#445566'), right: rough('#777777', '#333333'), bottom: rough('#555555', '#222222') } } } };
  assert.match(renderAd(ctx, photo, specs['kakao-display-pc-promo']).split('>')[0], /data-field-source="kv-vivid-photo"/);
  // 단색만 허용하는 지면(에브리타임 홈배너)은 그라데이션을 접는다
  assert.doesNotMatch(renderAd(ctx, kv, specs['everytime-home-banner']).split('>')[0], /linear-gradient/);
});

test('template measurements taken on a 2x frame are scaled to the 1x canvas (자소설 PC달력배너)', () => {
  const spec = specs['jasoseol-pc-calendar-pc'];
  assert.equal(spec.w, 164);
  assert.equal(templateScale(spec.rules, spec.w), 0.5, '328×466 프레임 실측 → 164×233 캔버스');
  const html = renderAd(ctx, style, spec);
  // 문구 칸 x≈49(2배) → 25(1배), 폰트 40(2배) → 20(1배)
  assert.match(html, /data-text-col="1" style="position:absolute;left:26px/, '10-15 틀: 글자 왼쪽 패딩 52(2배) → 26');
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
  const dark = specs['instagram-feed-1080'];   // 어두운 프로필 매체(인스타 0.22 — 틀 없음; 10-15 밤 NAP 300×250 은 HS화성 틀이라 제외) → 브랜드 단색 지면 → 흰 글자. 구글은 이제 밝은 틴트 지면이라 제외
  const both = { ...style, logo: 'data:image/png;base64,AAAA', logoLight: 'data:image/png;base64,BBBB' };
  const html = renderAd(ctx, both, dark);
  assert.match(html, /data-logo="1" src="data:image\/png;base64,BBBB"/);
  assert.doesNotMatch(html, /invert\(1\)/);
  // 원색 로고만 있으면 흰색 단색으로 변환한다(brightness(0) invert(1): 불투명 픽셀 전부 흰색, 실루엣 유지)
  const only = renderAd(ctx, { ...style, logo: 'data:image/png;base64,AAAA' }, dark);
  assert.match(only, /src="data:image\/png;base64,AAAA"[^>]*brightness\(0\) invert\(1\)/);
  // 흰색 로고만 올렸으면 로고가 지면을 정한다 — 밝은 매체(자소설)여도 어두운 브랜드색 지면 + 흰 글자
  const whiteOnly = renderAd(ctx, { ...style, logo: 'data:image/png;base64,WWWW', logoLight: 'data:image/png;base64,WWWW', logoTone: 'light' }, specs['jasoseol-pc-premium-popup-pc']);
  assert.match(whiteOnly, /data-field-source="brand-dark-logo"/);
  assert.match(whiteOnly, /data-field="main"[^>]*color:#FFFFFF/);
  assert.doesNotMatch(whiteOnly, /brightness\(0\)/, '어두운 지면의 흰색 로고는 변환 없이 그대로');
  // 그림이 배경을 품고 있으면(흰 바탕 일러스트) 그림이 로고보다 먼저다 — 지면은 그림 가장자리 색, 흰색 로고는 브랜드색 판 위에
  const edgeW = (from, to) => ({ hex: from, from, to, rough: 0.004, opaque: 1, flat: true });
  const whiteBg = { ar: 1.4, px: [700, 500], colors: ['#3366CC'], field: { opaque: 1, kind: 'illust', flatEdges: 4, edges: { left: edgeW('#FFFFFF', '#FFFFFF'), top: edgeW('#FFFFFF', '#FFFFFF'), right: edgeW('#FFFFFF', '#FFFFFF'), bottom: edgeW('#FFFFFF', '#FFFFFF') } } };
  const clash = renderAd(ctx, { ...style, keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: whiteBg, logo: 'data:image/png;base64,WWWW', logoLight: 'data:image/png;base64,WWWW', logoTone: 'light' }, specs['jasoseol-pc-premium-popup-pc']);
  assert.match(clash, /data-field-source="kv-edge"/, '그림 가장자리 색이 지면');
  assert.match(clash, /data-logo="1" src="data:image\/png;base64,WWWW"[^>]*filter:brightness\(0\)(?! invert)/, '밝은 지면의 흰색 로고는 검정 단색으로 변환');
  // 밝은 지면(자소설)에서는 원색 로고 그대로
  const light = renderAd(ctx, both, specs['jasoseol-pc-premium-popup-pc']);
  assert.match(light, /src="data:image\/png;base64,AAAA"/);
  assert.doesNotMatch(light, /invert\(1\)/);
});

test('the template image area takes the picture by its size — 10-15 templateMold: 자소설 채용공고 160×600 은 틀 그림 칸(160×200 @0,400)에 누끼는 contain·가운데, 바탕 있는 그림은 cover(주인공 위치) — 블리드·녹임 없음', () => {
  // 10-13 까지의 하단 띠 문법(native/contain/cover + 윗변 녹임)은 틀(mold)이 없는 템플릿 매체에만 남아 있다 — 자소설 PC 4규격은 세아제강·현대케피코 샘플이 틀이라 이 규칙을 타지 않는다
  const tall = { ...style, keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: { ar: 0.5, px: [160, 324], edge: '#0B3C8C' } };
  const tallHtml = renderAd(ctx, tall, specs['jasoseol-pc-standard-jobpost-pc']);
  // 10-15 사용자 정정: 틀은 칸의 위치·범위만 — 처리(cover + 윗변 녹임 / 누끼 contain)는 디자인 가이드 그대로
  assert.match(tallHtml, /data-object="1"[^>]*left:0px;top:400px;width:160px;height:200px;[^"]*\/cover/);
  assert.match(tallHtml, /data-object="1"[^>]*mask-image:linear-gradient\(to bottom/, '하단 칸 윗변 녹임은 그대로');
  const cut = { ...style, keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: { ar: 1.36, px: [302, 222], field: { opaque: 0.3 } } };
  assert.match(renderAd(ctx, cut, specs['jasoseol-pc-standard-jobpost-pc']), /data-object="1"[^>]*left:0px;top:400px;width:160px;height:200px;[^"]*center bottom\/contain/, '누끼는 칸 안 contain — 10-15 tower 블리드는 10-19 사용자 「비주얼 끊기지 않게」로 끔');
  assert.match(tallHtml, /data-mold="1"/);
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
  const a = renderAd(ctx, { ...style, keyVisual: kv, kvMeta: calm }, specs['kakao-display-pc-promo']);
  assert.match(a, /data-object="1"[^>]*left center\/cover[^>]*#000 16%/);
  const b = renderAd(ctx, { ...style, keyVisual: kv, kvMeta: busy }, specs['kakao-display-pc-promo']);
  // 복잡한 변은 더 길게 녹인다(10-06: 10→16 · 26→30 · 사진 32→38, 이징). 10-12 CANON melt: 회색 사진 변 × 주황 딥 지면은 색 거리가 멀어 30%보다 길게(최대 55%)
  const bm = b.match(/data-object="1"[^>]*center\/cover[^>]*#000 ([\d.]+)%/);
  assert.ok(bm && Number(bm[1]) >= 30 && Number(bm[1]) <= 55, bm?.[1]);
  // 배경을 딴 이미지는 자르지 않고, 녹이지도 않는다
  const cut = { colors: ['#E67814'], field: { opaque: 0.1, edges: {} } };
  const c = renderAd(ctx, { ...style, keyVisual: kv, kvMeta: cut }, specs['kakao-display-pc-promo']);
  assert.match(c, /data-object="1"[^>]*right center\/contain/);
  assert.doesNotMatch(c, /data-object="1"[^>]*mask-image/);
});

test('without a key visual the logo becomes the object (셀트리온·LX·CMTX — 보드 14/136), and only once', () => {
  const html = renderAd(ctx, { ...style, logo: 'data:image/png;base64,iVBORw0KGgo=' }, specs['naver-gfa-native-pc-342x228']);
  assert.match(html, /data-object="logo"/, '로고가 오브젝트 자리에 선다');
  assert.equal((html.match(/data-logo="1"/g) ?? []).length, 1, '로고는 한 번만');
  assert.doesNotMatch(html, /data-logo-slot/, '작은 상단 로고는 생략');
  // 자소설처럼 매체가 로고 칸을 정해 둔 템플릿에서는 로고를 그 칸에 두고 이미지 칸은 비운다
  const tpl = renderAd(ctx, { ...style, logo: 'data:image/png;base64,iVBORw0KGgo=' }, specs['jasoseol-pc-standard-jobpost-pc']);
  assert.match(tpl, /data-logo-slot="1"/); assert.doesNotMatch(tpl, /data-object="logo"/);
});

test('a floating logo stays inside the medium safe area and the copy starts below it', () => {
  // 에브리타임 커뮤니티 네이티브 288×288: 안전영역 상하좌우 20px. 그림이 있어야 로고가 위에 뜬다 (10-16: 네이버 네이티브 342×228 은 「비주얼만」 규격이 되어 로고·글자를 안 그리므로 여기서 뺌)
  const html = renderAd(ctx, { ...style, logo: 'data:image/png;base64,iVBORw0KGgo=', keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: { ar: 1, px: [600, 600] } }, specs['daangn-native-feed-image']);   // 10-16: 에브리타임 288 은 비주얼만(글자·로고 없음)이 되어 당근 200×200 으로
  const m = html.match(/data-logo-slot="1" style="position:absolute;top:(\d+)px;right:(\d+)px;[^"]*height:(\d+)px/);
  assert.ok(m, '로고가 떠 있다');
  const [top, right, lh] = m.slice(1).map(Number);
  const sa = specs['daangn-native-feed-image'].rules?.safeArea ?? {}; const minT = typeof sa.top === 'number' ? sa.top : 10, minR = typeof sa.right === 'number' ? sa.right : 10;   // 당근 200×200: 안전영역 숫자가 있으면 그 값, 없으면 권장 여백 10
  assert.ok(top >= minT && right >= minR, `안전영역 안 (top ${top}, right ${right})`);
  const padTop = Number(html.match(/padding:(\d+)px/)[1]);
  assert.ok(padTop >= top + lh, '글자는 로고 아래에서 시작한다');
});

test('the text height rule caps every line, not only the headline (네이버 22~52px)', () => {
  const html = renderAd(ctx, style, specs['kakao-display-pc-promo']);
  for (const m of html.matchAll(/data-field="(\w+)" style="font-size:(\d+)px/g)) {
    assert.ok(+m[2] >= 22 && +m[2] <= 52, `${m[1]} ${m[2]}px`);
  }
});

test('네이버 네이티브 썸네일 342×228 은 비주얼만 — 키비주얼 하나, 글자·로고 없음 (보드 31:4268 「배너/비주얼만/로고만」, 10-16 사용자)', () => {
  const kv = { ...style, logo: 'data:image/png;base64,iVBORw0KGgo=', keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: { ar: 1.5, px: [600, 400], field: { kind: 'photo', opaque: 1 } } };
  for (const id of ['naver-gfa-native-mo-342x228', 'naver-gfa-native-pc-342x228']) {
    const html = renderAd(ctx, kv, specs[id]);
    assert.match(html, /data-kv-only="1"[^>]*center\/cover/, `${id}: 사진은 칸을 꽉 채운다`);
    assert.doesNotMatch(html, /data-field="(main|sub|detail|date)"/, `${id}: 글자 없음`);
    assert.doesNotMatch(html, /data-logo="1"/, `${id}: 로고 없음(프로필 300×300 별도)`);
  }
  const cut = renderAd(ctx, { ...kv, kvMeta: { ar: 1.2, px: [600, 500], field: { kind: 'cutout', opaque: 0.2 } } }, specs['naver-gfa-native-mo-342x228']);
  assert.match(cut, /data-kv-only="1"[^>]*center\/contain/, '누끼는 지면 위 가운데 contain');
  // 키비주얼이 없으면 로고가 오브젝트로 가운데
  const noKv = renderAd(ctx, { ...style, logo: 'data:image/png;base64,iVBORw0KGgo=' }, specs['naver-gfa-native-mo-342x228']);
  assert.match(noKv, /data-object="logo"/); assert.doesNotMatch(noKv, /data-field="main"/);
});
