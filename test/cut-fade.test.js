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
  // 10-21 사용자 「또 끊김」: 템플릿 여백 변(자소설 팝업 오른쪽 8·아래 30)도 cover 로 자른 사진·바탕 그림은 녹인다 — 칸은 지면 안쪽 그대로. 누끼 contain 은 안 잘리니 그대로 없음
  const jp = fadeOf(renderAd(ctx, photo, specs['jasoseol-pc-premium-popup-pc'])); assert.ok(jp && /R\d+/.test(jp) && /B\d+/.test(jp), '자소설 팝업 사진 칸 오른쪽·아래: ' + jp);
  assert.equal(fadeOf(renderAd(ctx, cut, specs['jasoseol-pc-premium-popup-pc'])), null, '자소설 팝업 누끼 contain 은 안 잘림');
  assert.equal(fadeOf(renderAd(ctx, cut, specs['jasoseol-pc-premium-jobpost-pc'])), null, '160×600 contain');
  assert.equal(fadeOf(renderAd(ctx, cut, specs['naver-gfa-mobile-da-1250x560'])), null, '네이버 누끼 contain');
});

test('녹임 예산(10-21 사용자 「너무 조금 보여… 좌·하단」): 자소설 PC팝업 사진 칸 — 여백 변(오른쪽 8·아래 30)은 photo 28% 고정(insetFixed), 양쪽 합은 60% 이하(keep .4) · 구글 580 모서리 칸(한쪽만 녹임)은 예산 밖', async () => {
  const { CANON } = await import('../core/canon.js');
  // 밝은 속색 사진 × 갈색 지면: 색 차로 왼쪽·위 녹임이 55% 까지 늘고, 여백 변도 55% 까지 늘던 조합
  const bright = normalizeStyle({ colors: ['#B5571B'], keyVisual: PNG, kvMeta: { ar: 1.5, px: [1500, 1000], colors: ['#F4E7D6', '#8FB7E0', '#6B4A2E'], field: { kind: 'photo', opaque: 1, lum: 0.6, sat: 0.3, edges: { left: { hex: '#6B4A2E' }, top: { hex: '#6B4A2E' }, right: { hex: '#6B4A2E' }, bottom: { hex: '#6B4A2E' } }, quadrants: { tl: '#F4E7D6', tr: '#8FB7E0', bl: '#F4E7D6', br: '#8FB7E0' } } } });
  const h = renderAd(ctx, { ...bright, __fix: {} }, specs['jasoseol-pc-premium-popup-pc']);
  const f = fadeOf(h); assert.ok(f && /R28\b/.test(f) && /B28\b/.test(f), '여백 변 28 고정: ' + f);
  const melt = +(h.match(/data-object="1"[^>]*data-melt="([\d.]+)"/) ?? [])[1], top = +(h.match(/data-object="1"[^>]*data-melt-top="([\d.]+)"/) ?? [])[1];
  const limit = Math.round((1 - CANON.cutFade.keep) * 100);
  assert.ok(melt + 28 <= limit + 0.5 && top + 28 <= limit + 0.5, `왼 ${melt}+28 · 위 ${top}+28 ≤ ${limit}`);
  assert.ok(melt >= CANON.melt.min * 100 - 0.5, '글자 쪽 녹임은 바닥(30%) 아래로는 안 줄인다: ' + melt);
  if (/data-fade-budget=/.test(h)) assert.match(h, /data-fade-budget="[LT]\d+(\.\d+)?→\d+/);
  // 한쪽만 녹이는 칸은 그대로 — 구글 580 모서리 칸 왼·위 녹임(오른쪽·아래는 지면 변)
  const g = renderAd(ctx, { ...bright, __fix: {} }, specs['google-gdn-580x400']);
  assert.ok(!/data-fade-budget=/.test(g), '구글 580 은 예산 안: ' + (g.match(/data-fade-budget="[^"]*"/) ?? [''])[0]);
});
