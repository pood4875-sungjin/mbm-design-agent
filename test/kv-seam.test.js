// 키비주얼 이음 전수 감사(10-20, scripts/kv-seam-audit.mjs) 회귀 — 측정 없이 trace·마스크 문자열로 고정할 수 있는 것
//   ① 녹임 길이 교정 meltFix: 덮어 자른(cover) 사진 칸의 글자 쪽 변은 그림 변 색(갈색)이 아니라 속 색(크림·하늘색)으로 재서 CANON.melt 최대(55%)까지 늘인다
//   ② 바탕이 평평하고 지면과 같은 색인 변(kv-edge 흰 바탕 × 흰 지면)은 그대로 — 녹임을 늘일 이유가 없다 · 주인공을 가르는 변만 늘인다
//   ③ 누끼는 손대지 않는다(녹임 없음 원칙) · ④ seamHexes/meltNeed 단위
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { seamHexes, meltNeed } from '../core/field.js';
import { CANON } from '../core/canon.js';

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
const prof = (n, f) => Array.from({ length: n }, (_, i) => ({ hex: f(i / (n - 1)).hex, bg: f(i / (n - 1)).bg }));
const edge = (hex, flat, from = hex, to = hex) => ({ hex, from, to, flat, rough: flat ? 0.004 : 0.02, std: flat ? 10 : 40, opaque: 1 });
// 한샘 사무실 사진 꼴(t1014-hanssem): 변은 갈색이라 지면(갈색 kv-vivid)과 가깝지만 속은 크림 벽·하늘색 화면
const PHOTO = { ar: 1.64, px: [1111, 677], colors: ['#A87045', '#95C7EB', '#CDBEA0'], field: { kind: 'photo', opaque: 1, lum: 0.49, sat: 0.3, flatEdges: 1,
  edges: { top: edge('#A26C42', false), bottom: edge('#9F957C', false), left: edge('#815734', true), right: edge('#CF9C6B', false) },
  quadrants: { tl: '#8A5B3A', tr: '#C9B59A', bl: '#7A4E30', br: '#B89A7C' }, cols: prof(32, () => ({ hex: '#8F5934', bg: 0.45 })), rows: prof(32, () => ({ hex: '#935E38', bg: 0.3 })) } };
// 비씨월드 꼴 흰 바탕 장면 일러스트(bc-illust): 네 변 흰 바탕(평평) · 바탕 줄은 왼쪽·위 3% 뿐, 나머지는 남색 주인공
const ILLUST = { ar: 1.5, px: [1500, 1000], colors: ['#1E3A8A', '#FAF9FE', '#3B82F6'], field: { kind: 'illust', opaque: 1, lum: 0.8, sat: 0.4, flatEdges: 4,
  edges: { top: edge('#FAF9FE', true), bottom: edge('#FAF9FE', true), left: edge('#FAF9FE', true), right: edge('#FAF9FE', true) }, focus: { x: 0.6, y: 0.58, w: 0.7, h: 0.8, parts: 1, others: [] },
  quadrants: { tl: '#F0F2F8', tr: '#2A4A9A', bl: '#2A4A9A', br: '#1E3A8A' }, cols: prof(32, t => t < 0.03 ? { hex: '#FAF9FE', bg: 0.98 } : { hex: '#2A4A9A', bg: 0.35 }), rows: prof(32, t => t < 0.03 ? { hex: '#FAF9FE', bg: 0.98 } : { hex: '#2A4A9A', bg: 0.35 }) } };
// 같은 그림인데 어느 줄이나 바탕(조용한 그림) — 늘일 이유가 없다
const QUIET = { ...ILLUST, field: { ...ILLUST.field, focus: null, cols: prof(32, () => ({ hex: '#FAF9FE', bg: 0.98 })), rows: prof(32, () => ({ hex: '#FAF9FE', bg: 0.98 })) } };
const CROWD = { ar: 1.6, px: [1600, 1000], field: { kind: 'cutout', opaque: 0.05, lum: 0.5, sat: 0.4, focus: { x: 0.5, y: 0.58, w: 0.8, h: 0.8, parts: 6, others: [] }, cols: prof(32, t => ({ hex: null, bg: (t < 0.12 || t > 0.92) ? 0.97 : 0.35 })), rows: prof(32, t => ({ hex: null, bg: t < 0.2 ? 0.95 : 0.4 })) } };
const styleOf = (kv, primary = '#E2401A') => normalizeStyle({ colors: [primary], keyVisual: PNG, kvMeta: kv });
const rulesOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"')).rules;
const objOf = html => (html.match(/<div data-object="1"[^>]*>/g) ?? []).find(t => /mask-image/.test(t)) ?? '';

test('meltFix ① 덮어 자른 사진 칸: 변 색(갈색 ≈ 지면)이 아니라 속 색(크림·하늘색)으로 재서 글자 쪽 녹임을 55% 까지 늘인다 — 리멤버 1005×360 · 구글 580 모서리 칸(왼·위) · data-melt 도 같은 값', () => {
  const h = renderAd(ctx, styleOf(PHOTO), specs['remember-main-top-mo']);
  const o = objOf(h);
  assert.match(o, /data-melt="55" data-melt-dir="to right"/, o.slice(-300));
  assert.match(o, /mask-image:linear-gradient\(to right,transparent 0%,[^;]*#000 55%\)/, '마스크 길이 = data-melt');
  assert.match(o, /data-melt-fix="L3\d→55"/);
  assert.ok(rulesOf(h).includes('meltFix'));
  const g = objOf(renderAd(ctx, styleOf(PHOTO), specs['google-gdn-580x400']));
  assert.match(g, /data-melt="55"[^>]*data-melt-top="55"/, '모서리 칸은 왼쪽·위 둘 다');
  assert.match(g, /data-melt-fix="L3\d→55,T\d+→55"/);
});

test('meltFix ② 흰 바탕 일러스트 × 흰 지면(kv-edge) 인스타 1080 틀 칸(cover): 그림 변이 그대로 보이는 왼변(평평·같은 색)은 34% 그대로, cover 로 잘려 남색 주인공을 가로지르는 윗변만 55% 로 — 조용한 그림은 어디도 안 늘인다', () => {
  const h = renderAd(ctx, styleOf(ILLUST, '#1E3A8A'), specs['instagram-feed-1080']);
  const o = objOf(h);
  assert.match(o, /data-melt="34" data-melt-dir="to right"/, '왼변: 그림의 변(흰 바탕) = 지면 → 34% 그대로: ' + o.slice(-200));
  assert.match(o, /data-melt-top="55"/, '윗변: cover 로 5.5% 잘려 주인공 줄 → 55%');
  assert.match(o, /data-melt-fix="T34→55"/);
  // 흰 바탕 × 흰 지면인데 덮어 자른 칸은 녹임이 있어야 한다(10-20 전수 감사: 예전엔 cornerSeamless 라 녹임 없이 주인공을 가로질렀다) — 마스크 문자열이 `;` 로 이어져 overflow:hidden 도 살아 있다
  assert.match(o, /no-repeat;-webkit-mask-image:linear-gradient\(to right[^"]*overflow:hidden"/);
  // 조용한 그림(어느 줄이나 바탕)은 아무 데도 늘이지 않는다
  const q = renderAd(ctx, styleOf(QUIET, '#1E3A8A'), specs['instagram-feed-1080']);
  assert.doesNotMatch(q, /data-melt-fix=/);
  assert.ok(!rulesOf(q).includes('meltFix'));
});

test('meltFix ③ 누끼는 손대지 않는다 — 떼 누끼 580·네이버 DA 에 meltFix 없음(cutFade 만)', () => {
  for (const id of ['google-gdn-580x400', 'naver-gfa-mobile-da-1250x560', 'instagram-feed-1080']) {
    const h = renderAd(ctx, styleOf(CROWD), specs[id]);
    assert.doesNotMatch(h, /data-melt-fix=/, id);
    assert.ok(!rulesOf(h).includes('meltFix'), id);
  }
});

test('④ seamHexes / meltNeed: 그림 변(frac 0)·바탕 줄·주인공 줄에 따라 후보가 달라지고, 길이는 가장 먼 색으로 CANON.melt 안에서', () => {
  const st = styleOf(ILLUST, '#1E3A8A');
  assert.deepEqual(seamHexes(st, 'top', 0), ['#FAF9FE'], '평평한 그림 변 → 변 색');
  assert.deepEqual(seamHexes(st, 'left', 0.03), ['#FAF9FE'], '바탕 줄(bg ≥ .85) → 그 줄 색');
  const inside = seamHexes(st, 'left', 0.5);
  assert.ok(inside.includes('#2A4A9A') && inside.includes('#1E3A8A') && inside.includes('#FAF9FE'), '주인공 줄 → 걸린 줄 + 대표색 + 사분면: ' + inside.join(','));
  const ph = styleOf(PHOTO);
  assert.ok(seamHexes(ph, 'left', 0).includes('#95C7EB'), '사진은 변이 평평해도 속 색으로');
  const need = meltNeed(['#FAF9FE'], ['#FAF9FE'], 34); assert.equal(need.pct, 34, '같은 색이면 그대로');
  const far = meltNeed(['#FAF9FE', '#1E3A8A'], ['#FAF9FE', '#F0F0F0'], 34);
  assert.equal(far.pct, Math.round(CANON.melt.max * 100)); assert.equal(far.seam, '#1E3A8A');
});

// ── 지면색 일관성(10-20 사용자 「배경색 일관되지 않게 나오는 것도 문제」 — 한진정보통신 × ABL 떼 누끼: 자소설 550·1200·750·네이버 DA 는 빨강, 160×600·카카오 1200×600·네이버 300 은 청록) ──
//   지면은 캠페인(style) 단위로 한 번 — 규격(facing·치수)이 달라도 field.source·stops 가 같다. 규정이 강제하는 규격만 벗어나고 trace field.deviation 에 이유를 남긴다
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"'));
const FOUR = ['jasoseol-pc-premium-popup-pc', 'jasoseol-pc-premium-jobpost-pc', 'kakao-display-pc-promo', 'naver-gfa-native-mo-profile-300'];
// 세로 그라데이션 바탕 일러스트(desk-21 꼴): 위 남색 → 아래 파랑, 네 변 평평
const GRAD = { ar: 0.75, px: [1080, 1440], colors: ['#065FED', '#062C86', '#5DCFFE'], field: { kind: 'illust', opaque: 1, lum: 0.32, sat: 0.6, flatEdges: 4,
  edges: { top: edge('#081A4E', true), bottom: edge('#0144D3', true), left: edge('#0349C2', true, '#04389B', '#0159E9'), right: edge('#0340B6', true, '#053093', '#004FD8') }, focus: null,
  quadrants: { tl: '#0A2260', tr: '#0A2260', bl: '#0B4AC8', br: '#0B4AC8' }, cols: prof(32, () => ({ hex: '#0A2C75', bg: 0.3 })), rows: prof(32, t => t < 0.1 ? { hex: '#081B4E', bg: 1 } : { hex: '#0B2D7D', bg: 0.3 }) } };

test('지면은 캠페인 단위로 한 번 — 같은 style 로 자소설 550·160×600·카카오 1200×600·네이버 300 을 그리면 field.source 와 stops 가 같다(사진·누끼·그라데이션 일러스트)', () => {
  for (const [name, kv] of [['사진', PHOTO], ['떼 누끼', CROWD], ['그라데이션 일러스트', GRAD]]) {
    const st = styleOf(kv, '#E72510');
    const seen = new Set();
    for (const id of FOUR) { const f = traceOf(renderAd(ctx, st, specs[id])).field; assert.ok(f && !f.deviation, `${name} ${id}: 지면 없음/편차 ${f?.deviation}`); seen.add(`${f.source} ${f.stops.join('>')}`); }
    assert.equal(seen.size, 1, `${name}: 한 캠페인에 지면 ${seen.size}가지 — ${[...seen].join(' | ')}`);
  }
  // 전에는 사진이 글자 쪽 변(facing) 색으로 갈렸다: 오른쪽 열 규격(왼변 갈색) vs 아래 띠 규격(윗변) — 이제 사진은 왼변 하나로 고정
  const ph = traceOf(renderAd(ctx, styleOf(PHOTO), specs['jasoseol-pc-premium-jobpost-pc'])).field;
  assert.equal(ph.source, 'kv-vivid-photo');
});

test('규정이 강제하는 규격만 벗어나고 이유를 남긴다 — 에브리타임 홈배너 「동일한 단색 배경만」: 그라데이션 지면을 가운데 색으로 접고 field.deviation = solid-only', () => {
  const f = traceOf(renderAd(ctx, styleOf(GRAD, '#E72510'), specs['everytime-home-banner'])).field;
  assert.equal(f.deviation, 'solid-only'); assert.equal(f.stops.length, 1); assert.equal(f.source, 'kv-edge');
  const g = traceOf(renderAd(ctx, styleOf(GRAD, '#E72510'), specs['kakao-display-pc-promo'])).field;
  assert.equal(g.deviation, null); assert.equal(g.stops.length, 2);
});

test('fieldAlign — 그림 네 변에서 정한 세로 그라데이션(위 남색 → 아래 파랑)을 규격마다 그림 자리에 px 로 건다: 자소설 M팝업 하단 띠(그림 y 544~880)·구글 580 모서리 칸, 색은 같고 위치만 다르다', () => {
  const st = styleOf(GRAD, '#E72510');
  const a = renderAd(ctx, st, specs['jasoseol-m-premium-popup-mo']), b = renderAd(ctx, st, specs['google-gdn-580x400']);
  const ta = traceOf(a), tb = traceOf(b);
  assert.deepEqual(ta.field.stops, ['#081A4E', '#0144D3']); assert.deepEqual(tb.field.stops, ta.field.stops);
  assert.ok(ta.rules.includes('fieldAlign') && tb.rules.includes('fieldAlign'));
  const ma = a.match(/<div data-ad="1"[^>]*style="[^"]*background:linear-gradient\(180deg,#081A4E ([\d.]+)px,#0144D3 ([\d.]+)px\)/); assert.ok(ma, '루트 지면이 px 정지점 그라데이션');
  assert.ok(+ma[1] >= 544 && +ma[2] <= 880 && +ma[2] > +ma[1], `하단 띠 안에서 위 3%→아래 97%: ${ma[1]}~${ma[2]}`);
  // 모서리 칸은 빈 지면 보정(emptyFix, 10-21)이 글자 쪽으로 키울 수 있다 — 정지점은 실제 칸(trace place.tImage) 안이면 된다
  const tb0 = tb.place.tImage, mb = b.match(/background:linear-gradient\(180deg,#081A4E ([\d.]+)px,#0144D3 ([\d.]+)px\)/); assert.ok(mb && +mb[1] >= tb0.y && +mb[2] <= tb0.y + tb0.h, `모서리 칸 ${tb0.y}~${tb0.y + tb0.h} 안: ${mb?.[1]}~${mb?.[2]}`);
  // 글자 쪽 양옆 녹임은 늘이지 않는다(변 색 = 같은 높이의 지면 색) — meltFix 가 55% 로 키우지 않는다
  const o = (a.match(/<div data-object="1"[^>]*>/g) ?? []).find(t => /mask-image/.test(t)) ?? '';
  const dm = +((o.match(/data-melt="([\d.]+)"/) ?? [])[1] ?? 0); assert.ok(dm > 0 && dm < 50, '양옆 녹임 ' + dm);
});
