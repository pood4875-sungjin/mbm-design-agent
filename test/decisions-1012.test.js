// 10-12 결정 반영 + 남은 문제 — 유형 직접 지정(결정 5) · 에브리타임 메인 800(결정 9) · 글자 속 구멍은 단색 변환 때만(결정 12) ·
// 인물 상자(Apple Vision)로 주인공 잡기(hr-doctor·AI 간호사) · 짧은 회사명 한 덩어리(MIDAS IT) · 가로 띠 넘친 누끼 왼변 녹임 · 아주 좁은 세로 띠 면적.
// history/2026-10-12_결정반영_남은문제.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CANON, weightOf } from '../core/canon.js';
import { MEDIA } from '../core/media.js';
import { kvTypeOf, kvTypeChoices, applyKvTypeOverride, baseKvMeta, isKvTypeOverride } from '../core/kvtypes.js';
import { personFocus, PERSON_FOCUS } from '../core/palette.js';
import { portraitFit, kvLayer } from '../core/field.js';
import { knockoutLogo, prepLogoRGBA } from '../core/logo.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
// 10-16: 카카오 PC디스플레이 1200×600 은 한국앤컴퍼니 샘플 틀(templateMold)이 생겼다 — 이 파일의 자유 배치 검증은 틀 뗀 사본으로(숫자·안전영역·글자 한도는 그대로)
specs['kakao-display-pc-promo'] = (e => { const c = structuredClone(e); delete c.rules.safeArea.measuredFromTemplate.mold; return c; })(specs['kakao-display-pc-promo']);
const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const meta = id => JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8'));
const img = (w, h, px) => { const a = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, al = 255] = px(x, y); const i = (y * w + x) * 4; a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = al; } return a; };

// 사진 측정값(축약) — 색으로는 주인공을 못 가른 흰 바탕 사진
const photoMeta = (focus = null, extra = {}) => ({ ar: 1, px: [1000, 1000], colors: ['#C0C4D0'], field: { kind: 'photo', opaque: 1, flatEdges: 0, lum: 0.7, sat: 0.1, edges: { top: { hex: '#C0C4D0' }, bottom: { hex: '#C0C4D0' }, left: { hex: '#C0C4D0' }, right: { hex: '#C0C4D0' } }, focus, rows: null, cols: null, room: null, ...extra } });

// ── 결정 5: 유형 직접 지정 ──
test('유형 지정 — 고를 수 있는 값은 4유형 + 세분 유형, auto·모르는 값은 자동', () => {
  const ch = kvTypeChoices();
  assert.deepEqual(ch.map(t => t.id), ['cutout', 'texture', 'photo', 'illust']);
  assert.ok(ch.find(t => t.id === 'photo').subs.some(s => s.id === 'photo-portrait'));
  assert.equal(isKvTypeOverride('photo-portrait'), true);
  assert.equal(isKvTypeOverride('auto'), false);
  assert.equal(isKvTypeOverride('nope'), false);
  assert.equal(normalizeStyle({ kvMeta: photoMeta(), kvTypeOverride: 'nope' }).kvTypeOverride, null);
});

test('유형 지정 — 세분 유형을 고르면 그것이 대표가 되고 깃발이 켜진다. 자동으로 돌리면 측정값 그대로(여러 번 입혀도 같은 답)', () => {
  const m = photoMeta();
  assert.notEqual(kvTypeOf(m).sub.id, 'photo-portrait');
  const s = normalizeStyle({ kvMeta: m, kvTypeOverride: 'photo-portrait' });
  const t = kvTypeOf(s.kvMeta);
  assert.equal(t.sub.id, 'photo-portrait'); assert.equal(t.flags.character, true); assert.equal(t.override, 'photo-portrait');
  assert.ok(s.kvMeta.field.focus, '주인공 상자를 모르면 위쪽 90%를 사람으로 본다');
  // 다시 입혀도(앱 restyle 이 지정된 kvMeta 를 다시 넘긴다) 같은 답, 자동이면 원래 측정값
  const again = normalizeStyle({ kvMeta: s.kvMeta, kvTypeOverride: 'photo-portrait' });
  assert.deepEqual(again.kvMeta, s.kvMeta);
  const back = normalizeStyle({ kvMeta: s.kvMeta, kvTypeOverride: null });
  assert.deepEqual(back.kvMeta, baseKvMeta(s.kvMeta));
  assert.equal(back.kvMeta.field.focus, null);
  assert.equal(back.kvMeta.typeOverride, undefined);
  // 유형만 고르면 kind 만 바뀐다(세분 자동)
  const tex = applyKvTypeOverride(m, 'texture');
  assert.equal(kvTypeOf(tex).id, 'texture'); assert.equal(tex.field.focus, null);
});

test('유형 지정 — 렌더러가 따른다: 사진을 「현장·군중」으로 지정하면 지면 전체(data-kv-use=full)', () => {
  const m = photoMeta({ x: 0.7, y: 0.5, w: 0.4, h: 0.6, parts: 1, others: [], density: 0.7 });
  const FREE = specs['instagram-story-1080x1920'];   // 10-16 인스타 1080 은 틀(사용자 수정본)이 생겨 자유 규격 instagram-story-1080x1920 로
  const auto = renderAd(ctx, normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta: m }), FREE);   // 10-15 저녁: 구글GDN 은 ABL 틀(templateMold) — 자유 배치 픽스처는 다른 매체로
  const crowd = renderAd(ctx, normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta: m, kvTypeOverride: 'photo-crowd' }), FREE);
  assert.doesNotMatch(auto, /data-kv-use="full"/);
  assert.match(crowd, /data-kv-use="full"/);
});

test('유형 지정 — 앱(선택 상자·라벨·restyle 전달)과 케이스 장부(type 명령·typeOverride)가 같은 값을 쓴다', () => {
  const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
  assert.match(app, /function kvTypeControlHtml/);
  assert.match(app, /<label for="\$\{id\}">키비주얼 유형/);
  assert.match(app, /<select id="\$\{id\}" aria-describedby=/);
  assert.match(app, /opt\('auto', `자동 \(지금:/);
  const restyle = app.slice(app.indexOf('function restyleWith('), app.indexOf('...patch,', app.indexOf('function restyleWith(')));
  assert.match(restyle, /kvTypeOverride: c\.style\.kvTypeOverride/);
  const cases = readFileSync(new URL('../scripts/cases.mjs', import.meta.url), 'utf8');
  assert.match(cases, /if \(cmd === 'type'\)/);
  assert.match(cases, /kvTypeOverride: c\.typeOverride \?\? null/);
});

// ── 남은 문제: 인물 상자 ──
test('인물 상자 — 색 주인공이 성글고 사람 상자를 절반도 못 덮으면(hr-doctor) 사람 상자가 주인공, 바탕 있는 일러스트 판정이면 사진으로', () => {
  const f = { kind: 'illust', focus: { x: 0.3, y: 0.41, w: 0.6, h: 0.82, parts: 4, others: [{}], density: 0.28 } };
  const p = { x0: 0.326, y0: 0, x1: 0.982, y1: 1, area: 0.555, fill: 0.846 };
  const g = personFocus(f, p);
  assert.equal(g.kind, 'photo'); assert.equal(g.focus.source, 'person'); assert.equal(g.focus.parts, 1);
  assert.equal(g.focus.x, 0.65); assert.equal(g.focus.w, 0.66);
  const t = kvTypeOf({ ar: 1.94, field: { ...g, opaque: 1, lum: 0.74, edges: {} } });
  assert.equal(t.sub.id, 'photo-portrait');
});

test('인물 상자 — 색 주인공이 뚜렷하거나(손 든 컨트롤러 desk-25 밀도 0.61) 사람이 작고 흩어지면 그대로', () => {
  const f = { kind: 'illust', focus: { x: 0.53, y: 0.53, w: 0.47, h: 0.43, parts: 1, others: [], density: 0.61 } };
  assert.equal(personFocus(f, { x0: 0.096, y0: 0.076, x1: 0.76, y1: 1, area: 0.386, fill: 0.628 }), f);
  assert.equal(personFocus({ kind: 'photo', focus: null }, { x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.9, area: 0.11, fill: 0.21 }).focus, null);
  assert.equal(personFocus({ kind: 'cutout', focus: null }, { x0: 0.1, y0: 0.1, x1: 0.6, y1: 0.9, area: 0.3, fill: 0.8 }).kind, 'cutout');
  assert.ok(PERSON_FOCUS.fill > 0 && PERSON_FOCUS.cover > 0);
});

test('인물 사진 아래 띠 — 폭 맞춤으로 머리~턱이 안 들어가면 줄여 오른쪽에 붙이고 왼변·윗변을 녹인다(AI 간호사 인스타 1080: 코에서 잘림 → 얼굴 전체)', () => {
  const person = { x0: 0.096, y0: 0.279, x1: 0.969, y1: 1, area: 0.329, fill: 0.522, faces: [{ x0: 0.351, y0: 0.4, x1: 0.653, y1: 0.702, conf: 0.88 }] };
  const m = photoMeta({ x: 0.53, y: 0.64, w: 0.87, h: 0.72, parts: 1, others: [], density: 0.52, source: 'person' }, { person });
  const st = { kvMeta: m, keyVisual: PNG };
  const pf = portraitFit(st, 1080, 393);
  assert.ok(pf && pf.portrait.w < 1080, JSON.stringify(pf));
  // 머리 윗변(0.259) ~ 턱 아래(0.702 + 얼굴 25%)가 띠 안에
  const top = -pf.oy, sc = pf.scale * 1000;
  assert.ok(0.259 * sc >= top - 1 && (0.702 + 0.302 * 0.25) * sc <= top + 393 + 1, JSON.stringify({ top, sc }));
  const html = kvLayer(st, { stops: ['#7B3FF2'] }, { side: 'bottom', w: 1080, h: 1080, size: 393 });
  assert.match(html, /right:0;bottom:0;width:\d+px/); assert.match(html, /mask-composite:intersect/);
  // 띠가 넉넉하면(머리~턱이 들어가면) 손대지 않는다 · 얼굴을 모르면 손대지 않는다
  assert.equal(portraitFit(st, 1080, 700), null);
  assert.equal(portraitFit({ kvMeta: photoMeta(m.field.focus, { person: { ...person, faces: [] } }) }, 1080, 393), null);
});

// ── 결정 9: 에브리타임 메인 800 ──
test('에브리타임 메인 800(ExtraBold) — 매체 guide.weights 가 CANON 700 을 이긴다. 다른 매체는 700', () => {
  assert.equal(weightOf('main', { medium: MEDIA.find(m => m.id === 'everytime') }), 800);
  assert.equal(weightOf('main', { medium: MEDIA.find(m => m.id === 'google') }), CANON.weights.main);
});

// ── 결정 12: 글자 속 구멍 ──
test('로고 글자 속 — 흰 바탕 로고는 원색에서 속의 흰색을 남기고, 단색용 사본(mono)만 속을 지운다. 실측은 잉크(사본)로', () => {
  const W = 120, H = 60;
  const ring = () => img(W, H, (x, y) => { const r = Math.hypot(x - 60, y - 30); return (r < 20 && r > 10) ? [200, 0, 0, 255] : [255, 255, 255, 255]; });
  const p = prepLogoRGBA(ring(), W, H);
  assert.ok(p.mono, '단색용 사본');
  const at = (a, x, y) => a[((y - 0) * p.w + x) * 4 + 3];
  // 트림 뒤 좌표 — 고리 가운데는 트림 상자의 가운데
  const cx = Math.floor(p.w / 2), cy = Math.floor(p.h / 2);
  assert.equal(at(p.rgba, cx, cy), 255, '원색: 속의 흰색을 남긴다');
  assert.equal(at(p.mono, cx, cy), 0, '단색용: 속을 지운다');
  assert.ok(p.meta.lum < 0.5, '실측은 잉크만(흰 속을 세지 않는다) ' + p.meta.lum);
});

test('로고 글자 속 — 어두운 상자 로고(도루코 검정 상자)의 속은 상자 찌꺼기라 원색에서도 지운다(단색용 사본 없음)', () => {
  const W = 120, H = 60;
  const ring = img(W, H, (x, y) => { const r = Math.hypot(x - 60, y - 30); return (r < 20 && r > 10) ? [255, 255, 255, 255] : [0, 0, 0, 255]; });
  const k = knockoutLogo(new Uint8ClampedArray(ring), W, H);
  assert.ok(k.holes > 0);
  assert.equal(prepLogoRGBA(new Uint8ClampedArray(ring), W, H).mono, null);
});

test('로고 글자 속 — 렌더러는 단색으로 바꿀 때만 logoMono 를 쓴다(어두운 지면 반전), 원색 그대로면 원래 로고', () => {
  const MONO = 'data:image/png;base64,TU9OTw==';
  const base = { colors: ['#0A1E5A'], keyVisual: null, logo: PNG, logoMono: MONO, logoTone: 'dark' };
  const logoTag = html => html.match(/<img data-logo="1"[^>]*>/)[0];
  const dark = logoTag(renderAd(ctx, normalizeStyle({ ...base, background: { mode: 'solid', color: '#0A1E5A' } }), specs['kakao-display-pc-promo']));   // 10-15 저녁: 구글GDN 은 ABL 틀(templateMold) — 자유 배치 픽스처는 다른 매체로
  assert.match(dark, /TU9OTw==/); assert.match(dark, /filter:brightness\(0\) invert\(1\)/);
  const light = logoTag(renderAd(ctx, normalizeStyle({ ...base, background: { mode: 'solid', color: '#FFFFFF' } }), specs['kakao-display-pc-promo']));
  assert.doesNotMatch(light, /filter/); assert.doesNotMatch(light, /TU9OTw==/);
});

// ── 남은 문제: 레이아웃 ──
test('짧은 회사명(12자 이하, 띄어쓰기 있음)은 줄이 회사명 속에서 바뀌지 않는다 — 「MIDAS IT」(유리 슬랩 580×400)', () => {
  const c2 = createContext({ client: 'MIDAS IT', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
  const html = renderAd(c2, normalizeStyle({ colors: ['#00146E'] }), specs['google-gdn-580x400']);
  const main = html.match(/data-field="main"[^>]*>(.*?)<\/div>/)[1];
  assert.match(main, /MIDAS IT/);
  assert.doesNotMatch(main, /MIDAS IT/);
});

test('가로 띠에 넘쳐 흘린 누끼는 열 왼변을 녹인다(320×50·400×76·728×90 「뚝 끊김」)', () => {
  const cols = Array.from({ length: 32 }, () => ({ bg: 0.3 }));
  const m = { ar: 2.2, px: [2200, 1000], field: { kind: 'cutout', opaque: 0.3, focus: { x: 0.5, y: 0.5, w: 0.98, h: 0.9, parts: 1, others: [], density: 0.4 }, cols, rows: cols, edges: {} } };
  const html = kvLayer({ kvMeta: m, keyVisual: PNG }, { stops: ['#1428A0'] }, { side: 'right', w: 728, h: 90, size: 170 });
  assert.match(html, /--kv-bleed:1/);
  assert.match(html, /mask-image:linear-gradient\(to right/);
});

test('아주 좁은 세로 띠(폭 ≤ 160) 단일 사물은 면적 목표가 더 크다(CANON objectBleed.tower)', () => {
  const T = CANON.objectBleed.tower;
  assert.equal(T.maxW, 160);
  assert.ok(T.targetArea.tower[0] > CANON.objectBleed.targetArea.tower[1]);
  assert.ok(T.maxCut > CANON.objectBleed.narrow.maxCut);
});
