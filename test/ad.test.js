import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd, copyFor } from '../core/renderers/ad.js';
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

test('only slots the medium has get rendered — no CTA chip unless the medium has a CTA field', () => {
  // 구글 GDN은 글자 규정이 없다 → 기본 슬롯(메인·서브)만, CTA 없음
  const noCta = renderAd(ctx, style, specs['google-gdn-300x600']);
  assert.doesNotMatch(noCta, /data-field="cta"/);
  const withCta = renderAd(ctx, style, { ...specs['kakao-bizboard-mo'], rules: { ...specs['kakao-bizboard-mo'].rules, textLimits: [{ field: '메인문구', maxChars: 20, lines: 2 }, { field: '랜딩버튼', maxChars: 7, lines: 1 }] } });
  assert.match(withCta, /data-field="cta"/);
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
