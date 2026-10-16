// 10-14 t1014 테스트 예시(10개 고객사 디자이너 산출물 54장 대조) — 규칙 12개.
// 마감 시각 · 일정 고지 문구가 날짜 자리 · 회사/채용구분 줄 나눔 말줄임 · 밝은 난색 브랜드 틴트 지면 · 로고 전용 규격 흰 바탕 · 심볼 원색 유지 ·
// 맞닿은 사람 떼 · 벡터 그림 판정 · 전신 인물 상반신 · 어두운 사진 브리지 끔 · 떼 누끼 샘플 상세 생략 · 모집직무 라벨 중복
// ref/learned/cases/_out/t1014-report.md · history/2026-10-14_테스트예시_1014.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CANON } from '../core/canon.js';
import { kvTypeOf } from '../core/kvtypes.js';
import { flatFillOf, topPeaksOf } from '../core/palette.js';
import { resolveField, warmLightBrand } from '../core/field.js';
import { logoEmblem, logoMeta } from '../core/logo.js';
import { renderAd, copyLadder } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { textWidth } from '../core/renderers/banner.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const img = (w, h, px) => { const a = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, al = 255] = px(x, y); const i = (y * w + x) * 4; a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = al; } return a; };
const field = (html, role) => { const m = html.match(new RegExp(`data-field="${role}"[^>]*>([^]*?)</div>`)); return m ? m[1].replace(/<[^>]+>/g, '').replace(/[⁠​]/g, '') : null; };
const prof = n => Array.from({ length: n }, () => ({ hex: null, bg: 0.5 }));
// 세로로 선 전신 인물 누끼(동서식품 축약) — 비율 0.42, 주인공 상자 높이 95%, 밀도 0.62 → 캐릭터
const personMeta = { ar: 0.42, px: [700, 1660], colors: ['#E8E4E0'], field: { kind: 'cutout', opaque: 0.2, flatEdges: 0, lum: 0.6, sat: 0.3, semi: 0.02, edges: {}, focus: { x: 0.5, y: 0.5, w: 0.9, h: 0.95, parts: 1, others: [], density: 0.62 }, rows: prof(32), cols: prof(32), room: null, topPeaks: 1 } };

test('마감 시각: 정시는 「17시」, 아니면 「23:59」를 날짜 뒤에(GS에너지·LT소재·제일약품)', () => {
  const a = copyLadder(createContext({ client: 'GS에너지', startDate: '2025-06-20', deadline: '2025-07-02', deadlineTime: '17:00' }, 'recruit'));
  assert.equal(a.date[0], '6.20(금) - 7.2(수) 17시');
  const b = copyLadder(createContext({ client: 'LT소재', deadline: '2026-07-01', deadlineTime: '23:59' }, 'recruit'));
  assert.equal(b.date[0], '~7.1(수) 23:59');
  const c = copyLadder(createContext({ client: 'LT소재', deadline: '2026-07-01' }, 'recruit'));
  assert.equal(c.date[0], '~7.1(수)');
});

test('마감일이 없고 고지 문구가 일정을 말하면 그 문구가 날짜 자리 — 자리표시 「0/00」 대신(한진정보통신 9/9 날짜 없음)', () => {
  const ctx = createContext({ client: '한진정보통신', hiringType: '경력직 채용', role: 'SW개발, 보안', notice: '* 채용 일정은 공고별 상이합니다.' }, 'recruit');
  const L = copyLadder(ctx);
  assert.deepEqual(L.date, ['* 채용 일정은 공고별 상이합니다.', '채용 일정 공고별 상이', '공고별 상이']);
  assert.deepEqual(L.notice, []);
  const style = normalizeStyle({ colors: ['#061266'] });
  for (const id of ['nap-dsp-band-320x100', 'nap-dsp-full-300x250', 'instagram-feed-1080']) {
    const html = renderAd(ctx, style, specs[id]);
    assert.doesNotMatch(html, /0\/00/, id);
  }
  // 일정 말이 아닌 고지는 날짜가 아니다
  assert.deepEqual(copyLadder(createContext({ client: 'A', notice: '본 공고는 정규직 채용입니다' }, 'recruit')).date, []);
});

test('모집직무 라벨이 상세 줄과 겹치면 한 번만(한진 NAP 320×480)', () => {
  const ctx = createContext({ client: '한진정보통신', hiringType: '경력직 채용', role: 'SW개발, 보안', notice: '* 채용 일정은 공고별 상이합니다.' }, 'recruit');
  const html = renderAd(ctx, normalizeStyle({ colors: ['#061266'] }), specs['nap-dsp-full-320x480']).replace(/data-trace="[^"]*"/, '');
  assert.equal((html.match(/모집분야/g) ?? []).length, 1);   // 10-15 밤: NAP 320×480 은 HS화성 틀 — 라벨 「모집분야」 한 번
  assert.equal((html.match(/모집직무/g) ?? []).length, 0);
});

test('회사 + 긴 채용구분: 채용구분이 한 줄에 안 들어가면 회사 뒤에서 나누지 않는다 — 세 줄 말줄임 금지(한샘 2/2)', () => {
  const ctx = createContext({ client: '한샘', hiringType: '리모델링 디자이너 영업직 채용', deadline: '2026-08-09', startDate: '2026-07-27', slogan: '한샘과 함께 성장할 인재를 찾습니다' }, 'recruit');
  // 한샘 사진(꽉 찬 사진 · 아래 띠) — 메인 칸 3줄 상한, 90px 에서 「리모델링 디자이너 영업직 채용」은 한 줄(924px)에 안 들어간다
  const photo = { ar: 1.64, px: [1111, 677], colors: ['#806050'], field: { kind: 'photo', opaque: 1, flatEdges: 1, lum: 0.49, sat: 0.4, edges: { top: { hex: '#A08070' }, left: { hex: '#A08070' }, bottom: { hex: '#E0D8D0' }, right: { hex: '#A08070' } }, focus: null, rows: null, cols: null, room: null, texture: { rough: 0.037, sharp: 0.135, spread: 70 } } };
  const html = renderAd(ctx, normalizeStyle({ colors: ['#C61E1E'], keyVisual: PNG, kvMeta: photo }), specs['instagram-story-1080x1920']);   // 10-16 인스타 1080 은 틀(사용자 수정본)이 생겨 자유 규격 instagram-story-1080x1920 로 — 글자 열 폭은 같은 924(1080 − 78×2)
  const main = html.match(/data-field="main"[^>]*>([^]*?)<\/div>/)[1];
  const fs = +html.match(/data-field="main" style="[^"]*font-size:(\d+)px/)[1];
  // 나눴다면 채용구분 줄이 한 줄에 들어가야 한다(아니면 회사 / 채용구분 2줄 / … 로 말줄임)
  const clamp = +html.match(/data-field="main" style="[^"]*line-clamp:(\d+)/)[1];
  // 나눴다면 「채용구분이 한 줄에 들어가거나」 「세 줄 칸」이어야 한다 — 두 줄 칸에서 회사 / 채용구분(두 줄)이면 말줄임(…)
  if (/^한샘<br\/?>/.test(main)) assert.ok(clamp >= 3 || textWidth('리모델링 디자이너 영업직 채용') * fs * 1.02 <= 924, `${fs}px · ${clamp}줄`);
  assert.match(field(html, 'main'), /리모델링 디자이너 영업직 채용/);
});

test('밝은 난색 브랜드(노랑·주황)는 지면을 어둡히지 않고 틴트 — 갈색·올리브 금지(동서식품 9/9 · 바이오노트 V2)', () => {
  assert.equal(warmLightBrand('#FFC000'), true);
  assert.equal(warmLightBrand('#F67E06'), true);
  assert.equal(warmLightBrand('#2EBA56'), false);   // 초록 — 10-12 채도 지면 흰 글자 그대로
  assert.equal(warmLightBrand('#F64E4E'), false);   // 빨강은 딥 그대로
  assert.equal(warmLightBrand('#1E72F6'), false);
  const f = resolveField(normalizeStyle({ colors: ['#FFC000'], keyVisual: PNG, kvMeta: personMeta }), { light: false });
  assert.equal(f.source, 'kv-harmony-tint');   // 10-16 오후: 무채(#E8E4E0) 그림 = 「안 묻는」 그림 → 그때만 밝은 틴트 + 검정 글자(채도 있는 그림이면 kv-vivid + 흰 글자)
  assert.equal(f.text, '#000000');
  const g = resolveField(normalizeStyle({ colors: ['#D21242'], keyVisual: PNG, kvMeta: personMeta }), { light: false });
  assert.notEqual(g.source, 'brand-tint-warm');
});

test('로고 전용 규격(프로필)은 흰 바탕 + 원색 로고 — 샘플 5/5 · 제일약품 3/3. 흰 로고만 있으면 예전대로', () => {
  const ctx = createContext({ client: '제일약품' }, 'recruit');
  const html = renderAd(ctx, normalizeStyle({ colors: ['#0460AF'], logo: PNG, logoTone: 'dark' }), specs['naver-gfa-native-pc-profile-300']);
  assert.match(html, /data-field-source="logo-only-white"/);
  assert.doesNotMatch(html, /data-logo="1"[^>]*filter:brightness/);
  const white = renderAd(ctx, normalizeStyle({ colors: ['#0460AF'], logo: PNG, logoTone: 'light' }), specs['naver-gfa-native-pc-profile-300']);
  assert.doesNotMatch(white, /logo-only-white/);
});

// 가로 로고: 왼쪽 정사각 심볼(파랑 판 + 흰 무늬) + 빈 열 + 글자 막대
const logoPx = (withEmblemDetail = true) => img(300, 80, (x, y) => {
  if (x < 80) { const inner = withEmblemDetail && x > 18 && x < 62 && y > 18 && y < 62; return inner ? [255, 255, 255, 255] : [0, 97, 176, 255]; }
  if (x < 100) return [0, 0, 0, 0];
  return ((x - 100) % 30 < 18 && y > 15 && y < 65) ? [0, 97, 176, 255] : [0, 0, 0, 0];
});
test('로고 심볼 찾기: 속에 흰 무늬가 있는 왼쪽 색 심볼만(제일약품 JEIL·LT소재 꽃) — 무늬 없는 심볼·글자만 로고는 없음', () => {
  const e = logoEmblem(logoPx(true), 300, 80);
  assert.ok(e && e.x1 > 0.26 && e.x1 < 0.34, JSON.stringify(e));
  assert.equal(logoEmblem(logoPx(false), 300, 80), null);
  assert.ok(logoMeta(logoPx(true), 300, 80).emblem);
});

test('어두운 지면에서 로고를 흰 단색으로 바꿀 때 심볼은 원색 그대로(두 장 겹치고 마스크로 가름)', () => {
  const ctx = createContext({ client: '제일약품', hiringType: 'ETC 영업 채용', deadline: '2026-01-18' }, 'recruit');
  const lm = { px: [300, 80], solid: 0.4, lum: 0.4, sat: 0.6, tone: 'dark', colors: [{ hex: '#0061B0', share: 0.8 }], emblem: { x1: 0.3 } };
  // 그림이 있어 로고가 모서리 칸(px 높이)에 앉는 경우 — 그림 없는 지면에선 로고가 오브젝트 상자(% 크기)라 한 장 그대로
  const kv = { ar: 1.43, px: [625, 437], colors: ['#1E4FA0'], field: { kind: 'cutout', opaque: 0.3, lum: 0.66, sat: 0.3, semi: 0.02, focus: { x: 0.5, y: 0.5, w: 0.95, h: 0.9, parts: 1, others: [], density: 0.5 }, cols: prof(32), rows: prof(32), topPeaks: 1, edges: {}, room: null } };   // 10-16: 채도 있는 그림 색 → 어두운(화사한) 지면 + 흰 로고 변환. 무채(#CCCCCC)면 밝은 틴트라 변환 자체가 없다
  const html = renderAd(ctx, normalizeStyle({ colors: ['#0460AF'], keyVisual: PNG, kvMeta: kv, logo: PNG, logoTone: 'dark', logoMeta: lm }), specs['instagram-story-1080x1920']);   // 10-16 인스타 1080 은 틀(사용자 수정본)이 생겨 자유 규격 instagram-story-1080x1920 로
  assert.match(html, /data-logo-keep="30"/);
  assert.match(html, /data-logo-emblem="1"[^>]*mask-image:linear-gradient\(to right,#000 30%,transparent 30%\)/);
  assert.equal((html.match(/data-logo="1"/g) ?? []).length, 1);
  // 심볼이 없으면 예전처럼 한 장
  const plain = renderAd(ctx, normalizeStyle({ colors: ['#0460AF'], keyVisual: PNG, kvMeta: kv, logo: PNG, logoTone: 'dark', logoMeta: { ...lm, emblem: null } }), specs['instagram-story-1080x1920']);   // 10-16 인스타 1080 은 틀(사용자 수정본)이 생겨 자유 규격 instagram-story-1080x1920 로
  assert.doesNotMatch(plain, /data-logo-keep/);
});

test('맞닿은 사람 떼: 누끼 윗선 봉우리 ≥ 5 · 가로로 넓으면 떼(ABL 어깨동무) — 단일 사물 블리드로 사람을 자르지 않는다', () => {
  const heads = img(480, 200, (x, y) => { const c = (x % 80) - 40; const top = 20 + Math.abs(c) * 0.9; return y >= top ? [200, 150, 120, 255] : [0, 0, 0, 0]; });
  assert.ok(topPeaksOf(heads, 480, 200) >= 5);
  const blob = img(480, 200, (x, y) => (y > 20 && x > 40 && x < 440) ? [200, 150, 120, 255] : [0, 0, 0, 0]);
  assert.ok(topPeaksOf(blob, 480, 200) <= 1);
  const m = { ar: 1.6, px: [2400, 1500], field: { kind: 'cutout', opaque: 0.3, focus: { x: 0.5, y: 0.5, w: 0.95, h: 0.87, parts: 1, others: [], density: 0.43 }, cols: prof(32), rows: prof(32), topPeaks: 7, edges: {} } };
  const t = kvTypeOf(m);
  assert.equal(t.flags.group, true);
  assert.equal(t.flags.multi, false);   // 장면의 「누끼 위 빈 곳 겹침 허용」은 받지 않는다
  assert.equal(t.flags.single, false);
  assert.equal(kvTypeOf({ ...m, field: { ...m.field, topPeaks: 3 } }).flags.single, true);
  assert.equal(CANON.crowdPeaks.peaks, 5);
});

test('벡터 그림 판정: 이웃 픽셀 같은 색 몫이 높으면 평평한 그림, 잡티 있는 사진은 낮다', () => {
  const flat = img(200, 200, (x, y) => y < 120 ? [20, 120, 200] : [60, 180, 90]);
  assert.ok(flatFillOf(flat, 200, 200) > 0.95);
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const noisy = img(200, 200, () => { const v = 100 + Math.round(rnd() * 40); return [v, v, v]; });
  assert.ok(flatFillOf(noisy, 200, 200) < 0.2);
  assert.equal(CANON.flatVector, 0.8);
});

test('전신 인물 누끼는 상반신으로 — 머리를 상자 위에, 허리 아래는 흘린다. 세로로 긴 지면은 전신 그대로(동서식품 9/9)', () => {
  const ctx = createContext({ client: '동서식품', hiringType: '대졸 신입/경력사원 채용', deadline: '2026-10-12', startDate: '2026-09-28' }, 'recruit');
  const style = normalizeStyle({ colors: ['#FFC000'], keyVisual: PNG, kvMeta: personMeta });
  const sq = renderAd(ctx, style, specs['instagram-feed-1080']);
  assert.match(sq, /data-bust="0.55"/);
  assert.match(sq, /&quot;kv\.bust&quot;/);
  const tower = renderAd(ctx, style, specs['google-gdn-300x1050']);
  assert.doesNotMatch(tower, /data-bust/);
  // 캐릭터가 아닌(넓은) 누끼는 그대로
  const wide = renderAd(ctx, normalizeStyle({ colors: ['#FFC000'], keyVisual: PNG, kvMeta: { ...personMeta, ar: 1.4 } }), specs['instagram-feed-1080']);
  assert.doesNotMatch(wide, /data-bust/);
});

test('어두운 사진(밝기 < 0.55)은 지면을 그림 변 색으로 당기지 않는다 — 남색 브랜드가 청록 회색이 됐다(한진 9/9 남색)', () => {
  const photo = lum => ({ ar: 2.2, px: [1920, 870], colors: ['#6A9AC0'], field: { kind: 'photo', opaque: 1, flatEdges: 0, lum, sat: 0.4, edges: { left: { hex: '#D8E6F2' }, top: { hex: '#D8E6F2' }, right: { hex: '#2A5A80' }, bottom: { hex: '#2A5A80' } }, focus: null, rows: null, cols: null, room: null } });
  const dark = resolveField(normalizeStyle({ colors: ['#061266'], keyVisual: PNG, kvMeta: photo(0.4) }), { facing: 'left' });
  assert.equal(dark.source, 'kv-vivid-photo');   // 10-16 비주얼 우선: 사진 지면 = 글자 쪽 변 색(#D8E6F2)을 흰 글자 4.5:1 까지 어둡힌 같은 색상 — 브랜드 남색·브릿지 둘 다 아님
  assert.notEqual(dark.stops[0].toUpperCase(), '#061266');
  const bright = resolveField(normalizeStyle({ colors: ['#061266'], keyVisual: PNG, kvMeta: photo(0.71) }), { facing: 'left' });
  assert.equal(bright.source, 'kv-vivid-photo');
});

test('누끼 떼는 샘플이 보여 준 상세 줄을 더하지 않는다 — 머리 위로 올라갔다(ABL·바이오노트 NAP 300×250, ABL 디자이너 상세 없음)', () => {
  const ctx = createContext({ client: 'ABL생명', hiringType: '신입사원 공개채용', season: '2024', role: '영업마케팅, 상품/계리/리스크, 경영지원', startDate: '2024-02-28', deadline: '2024-03-10' }, 'recruit');
  const m = { ar: 1.6, px: [2400, 1500], colors: ['#CCCCCC'], field: { kind: 'cutout', opaque: 0.3, lum: 0.6, sat: 0.3, semi: 0.02, focus: { x: 0.5, y: 0.5, w: 0.95, h: 0.87, parts: 1, others: [], density: 0.43 }, cols: prof(32), rows: prof(32), topPeaks: 7, edges: {}, room: null } };
  const html = renderAd(ctx, normalizeStyle({ colors: ['#F64E4E'], keyVisual: PNG, kvMeta: m }), specs['nap-dsp-full-300x250']);
  assert.equal(field(html, 'detail'), null);
  assert.match(html, /sample\.detail\.groupSkip/);
});
