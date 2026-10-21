// 끊김 녹임(cutFade, 10-19 사용자 「그라데이션으로 옅게 처리하던지 해 줘. 끊기는 건. 네이버도 마찬가지」)
//   누끼: 보이는 창(상자 ∩ 지면) 밖으로 넘친 변을 녹인다 · 사진: 상자 변이 지면 안쪽에 있는 변을 녹인다 · 둥근 상자·템플릿 여백 변(edgeInset)·지면 전체 그림은 제외
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
// 가로로 긴 떼 누끼(ABL 6인) — 구글 300×600 에서 상자가 지면 좌우 밖으로 나간다
const CROWD = { ar: 1.6, px: [1600, 1000], field: { kind: 'cutout', opaque: 0.2, lum: 0.5, sat: 0.4, focus: { x: 0.5, y: 0.5, w: 0.9, h: 0.9, parts: 6, others: [] } } };
const cut = normalizeStyle({ colors: ['#E2401A'], keyVisual: PNG, kvMeta: CROWD });
const photo = normalizeStyle({ colors: ['#8C5A2B'], keyVisual: PNG, kvMeta: { ar: 1.5, px: [1500, 1000], field: { kind: 'photo', opaque: 1, lum: 0.5, sat: 0.3 } } });
const fadeOf = html => (html.match(/data-cut-fade="([^"]*)"/) ?? [])[1] ?? null;
const rulesOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"')).rules;

test('누끼가 지면 변에서 잘리면 그 변을 녹인다 — 구글 300×600 좌우, 에브리타임 홈카드 우하단 · trace rules 에 cutFade', () => {
  const h = renderAd(ctx, cut, specs['google-gdn-300x600']);
  const f = fadeOf(h); assert.ok(f && /L\d+/.test(f) && /R\d+/.test(f), '300×600 좌우: ' + f);
  assert.ok(rulesOf(h).includes('cutFade'));
  assert.match(h, /data-object="1"[^>]*mask-image:linear-gradient\(to right,transparent \d+(\.\d+)?px/, '마스크는 px 기준(상자가 지면 밖이면 잘리는 선 = 지면 변)');
  const e = fadeOf(renderAd(ctx, cut, specs['everytime-home-card-image'])); assert.ok(e && /R\d+/.test(e) && /B\d+/.test(e), '에브리타임 우하단: ' + e);
});

test('사진 상자의 안쪽 변만 녹인다 — 네이버 DA 사진 칸 오른쪽·아래(지면 변에 붙은 변은 그대로)', () => {
  // __fix: {} 로 빈 지면 보정(emptyFix, 10-21)을 끄고 칸 그대로 — 칸 바닥이 지면 바닥에서 20px 떠 있어 오른쪽·아래 두 변이 안쪽 변
  const h = renderAd(ctx, { ...photo, __fix: {} }, specs['naver-gfa-mobile-da-1250x560']);
  const f = fadeOf(h); assert.ok(f && /R28/.test(f) && /B28/.test(f) && !/L/.test(f), '네이버: ' + f);
  // 빈 지면 보정(emptyFix)은 키운 칸(상자 기준)에 글자가 들어가면 안 키운다 — 네이버 DA 는 상세 값 행이 칸 왼쪽으로 닿아 보정 없이 그대로(녹임도 같다)
  const g = renderAd(ctx, photo, specs['naver-gfa-mobile-da-1250x560']);
  assert.ok(!/data-empty="/.test(g) && fadeOf(g) === f, '네이버(보정 없음): ' + fadeOf(g));
});

test('제외 — 둥근 상자(카카오 썸네일) · 템플릿 여백 변(자소설 PC팝업 8/30) · 칸 안 contain 누끼(자소설 160×600·네이버 DA)', () => {
  assert.equal(fadeOf(renderAd(ctx, photo, specs['kakao-display-pc-promo'])), null, '카카오 둥근 상자');
  assert.equal(fadeOf(renderAd(ctx, photo, specs['jasoseol-pc-premium-popup-pc'])), null, '자소설 팝업 edgeInset');
  assert.equal(fadeOf(renderAd(ctx, cut, specs['jasoseol-pc-premium-jobpost-pc'])), null, '160×600 contain');
  assert.equal(fadeOf(renderAd(ctx, cut, specs['naver-gfa-mobile-da-1250x560'])), null, '네이버 누끼 contain');
});
