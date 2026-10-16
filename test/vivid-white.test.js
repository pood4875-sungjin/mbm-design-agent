// 10-12 사용자 피드백 묶음 — 채도 높은 지면 흰 글자(CANON vividWhite) · 녹임 길이·곡선(CANON melt) · 배경형 위 띠 · 분위기 지면(CANON kvMood) ·
// 누끼 분위기(cutoutAuto·bgPalette·maxUpscale) · 질감 진정(textureCalm) · 쌓인 덩어리 한 주인공.
// history/2026-10-12_흰글자_그라데이션_이음.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CANON } from '../core/canon.js';
import { vividWhite, resolveField, meltGradient, meltLength, profileFocus, moodStops, cutoutCapW, relLum } from '../core/field.js';
import { contrast, fieldFromImage, WHITE, BLACK } from '../core/palette.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
const ctx = createContext({ client: '세방그룹', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const meta = id => JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8'));
const styleOf = (id, primary, extra = {}) => normalizeStyle({ colors: [primary], keyVisual: PNG, kvMeta: meta(id), logo: PNG, logoTone: 'light', ...extra });
const shell = html => html.match(/<div data-ad="1"[^>]*>/)[0];
const img = (w, h, px) => { const a = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, al = 255] = px(x, y); const i = (y * w + x) * 4; a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = al; } return a; };

// ── 1. 채도 높은 지면 흰 글자 ──
test('desk-12 세방 초록 지면(#2EBA56)은 흰 메인 — 같은 색상으로 명도만 내리고 그림도 같은 비율로 어둡힌다(이음매 유지)', () => {
  const v = vividWhite(['#2EBA56']);
  assert.ok(v && v.d <= CANON.vividWhite.smallMaxDL && v.large <= CANON.vividWhite.maxDL, JSON.stringify(v));
  for (const id of ['google-gdn-580x400', 'remember-main-top-mo', 'google-gdn-300x600', 'instagram-feed-1080']) {
    const html = renderAd(ctx, styleOf('desk-12', '#00A8A8'), specs[id]);
    assert.match(shell(html), /color:#FFFFFF/, id);
    assert.match(html, /data-dim="0\.\d+"><style>\[data-dim="0\.\d+"\] \[data-object="1"\]\{filter:brightness\(0\.\d+\)\}/, id);
  }
});

test('노랑(#F8C808)·파스텔(라벤더)·밝은 주황은 검정 그대로 — 명도 0.12 안에서 흰 3:1에 못 닿거나 파스텔', () => {
  assert.equal(vividWhite(['#F8C808']), null);
  assert.equal(vividWhite(['#F8A040']), null);
  assert.equal(vividWhite(['#B8ACED']), null);
  assert.equal(resolveField({ palette: { primary: '#F8C808' }, background: { color: '#F8C808' } }).text, BLACK);
});

test('작은 글자 4.5:1 — 흰 글자로 바꾼 지면은 내린 뒤 지면 어디서나 흰색 대비 4.5 이상(못 닿으면 3:1만 지키고 contrast 로 알린다)', () => {
  for (const c of ['#2EBA56', '#2DB84F', '#00A8A8', '#E0813A']) {
    const v = vividWhite([c]);
    assert.ok(v, c);
    const worst = Math.min(...v.stops.map(s => contrast(s, WHITE)));
    assert.ok(v.small != null ? worst >= 4.5 : worst >= 3, `${c} ${worst}`);
  }
  assert.ok(relLum('#2EBA56') > 0.3 && relLum('#2EBA56') < CANON.vividWhite.maxLum);
});

// ── 2·4·6. 녹임 길이·곡선, 배경형 위 띠 ──
test('녹임은 smoothstep 여러 마디이고, 그림 변과 지면색이 멀수록 길다(30% → 55%)', () => {
  const g = meltGradient('to right', 40);
  assert.equal((g.match(/%/g) ?? []).length, CANON.melt.stops);
  assert.match(g, /^linear-gradient\(to right,transparent 0%,rgba\(0,0,0,0\.0\d\) /);
  assert.equal(meltLength('#123A6B', '#123A6B', 16), 16, '같은 색이면 원래 길이');
  const far = meltLength('#E0F0FF', '#002B49', 30), near = meltLength('#7898F0', '#5A7FE0', 30);
  assert.ok(far >= 50 && far <= 55, String(far));
  assert.ok(near >= 30 && near < far, String(near));
});

test('midas-cards-orange 배경형: 그림을 아래로 밀어 생긴 위 띠는 단색이 아니라 그림 맨 윗줄을 늘인 층으로 잇는다(data-kv-fill)', () => {
  const html = renderAd(ctx, normalizeStyle({ colors: ['#00146E'], keyVisual: PNG, kvMeta: meta('midas-cards-orange'), logo: PNG, logoTone: 'dark' }), specs['google-gdn-580x400']);
  const sh = shell(html);
  if (/data-kv-use="bg"/.test(sh) && /no-repeat #|px auto no-repeat,/.test(sh)) {
    const oy = Number((sh.match(/url\('[^']*'\) -?\d+px (-?\d+)px\//) ?? [])[1]);
    if (oy > 0) { assert.match(sh, /data-kv-fill="row"/); assert.equal((sh.match(/url\(/g) ?? []).length, 2); }
  }
});

test('desk-15 세로 그림(주인공 상자 없음): 줄 프로필로 주인공을 어림해 1080 아래 띠가 하늘만 보이지 않는다', () => {
  const f = meta('desk-15').field;
  const pf = profileFocus(f);
  assert.ok(pf && pf.derived && pf.y > 0.5, JSON.stringify(pf));
  const html = renderAd(ctx, styleOf('desk-15', '#0076B4', { logoTone: 'dark' }), specs['instagram-feed-1080']);
  const obj = html.match(/<div data-object="1"[^>]*>/)?.[0] ?? '';
  assert.doesNotMatch(obj, /center top\/cover/, obj);
});

// ── 8·9·10. 분위기 지면 ──
test('분위기 있는 KV 배경 > 브랜드 지면색: 어두운 사진은 사진 변 색의 어두운 지면, 채도 있는 그라데이션 변은 그 그라데이션', () => {
  const kb = meta('desk-05').field;   // KB 어두운 행사장 사진
  const d = moodStops({ kvMeta: { field: kb } }, kb.edges.left, kb);
  assert.equal(d.source, 'kv-mood-dark');
  assert.ok(d.stops.every(s => contrast(s, WHITE) >= 4.5), d.stops.join());
  const kia = meta('desk-04').field;   // 기아 라벤더 → 파랑
  assert.equal(moodStops({ kvMeta: { field: kia } }, kia.edges.left, kia).source, 'kv-mood');
  // 구글(밝은 지면 매체)에서도 KB 는 어두운 지면 + 흰 글자
  const html = renderAd(ctx, styleOf('desk-05', '#787060', { logoTone: 'dark' }), specs['google-gdn-300x600']);
  assert.match(shell(html), /data-field-source="kv-mood-dark"[^>]*color:#FFFFFF|color:#FFFFFF[^>]*/);
});

test('누끼: 원본 바탕 팔레트(bgPalette)가 있으면 브랜드 틴트 대신 그 색 — 없으면(앱 업로드 누끼) 예전처럼 브랜드', () => {
  const m = meta('desk-37-cut');
  assert.ok(m.bgPalette?.stops?.length === 2, '장부가 원본 desk-37 바탕을 남겼다');
  const f = resolveField({ palette: { primary: '#E86800' }, keyVisual: PNG, kvMeta: m });
  assert.equal(f.source, 'kv-mood');
  const { bgPalette, ...bare } = m;
  assert.notEqual(resolveField({ palette: { primary: '#E86800' }, keyVisual: PNG, kvMeta: bare }).source, 'kv-mood');
  assert.deepEqual(CANON.cutoutAuto, { chromaMax: 0.12, gradMax: 0.15 });
});

test('작은 누끼는 원본의 1.5배까지(CANON maxUpscale) — desk-37-cut 163px', () => {
  const m = meta('desk-37-cut');
  assert.equal(cutoutCapW({ kvMeta: m }), Math.round(m.px[0] * CANON.maxUpscale.cutout));
  const html = renderAd(ctx, styleOf('desk-37-cut', '#E86800', { logoTone: 'dark' }), specs['remember-main-top-mo']);
  const sizes = [...html.matchAll(/data-object="1"[^>]*?\/(\d+)px auto/g)].map(x => Number(x[1]));
  assert.ok(sizes.every(s => s <= m.px[0] * 1.5 + 1), sizes.join());
  assert.equal(cutoutCapW({ kvMeta: meta('desk-12') }), Infinity, '바탕 있는 그림엔 걸지 않는다');
});

// ── 3·7. 질감 진정 ──
test('질감 위 글자: 어지러울수록 진한 지면색 스크림(제주항공 > 대한항공), 매끈한 질감(texture-dark)은 없음', () => {
  const calm = id => { const html = renderAd(ctx, styleOf(id, '#2456D6', { logoTone: 'dark' }), specs['instagram-story-1080x1920']); /* 10-15 저녁: 구글GDN 은 ABL 틀 — 자유 배치 픽스처는 인스타 */ /* 10-16 인스타 1080 은 틀(사용자 수정본)이 생겨 자유 규격 instagram-story-1080x1920 로 */ return Number((shell(html).match(/data-calm="([\d.]+)"/) ?? [])[1] ?? 0); };
  const jeju = calm('desk-23'), kal = calm('desk-02'), smooth = calm('texture-dark');
  assert.ok(kal >= CANON.textureCalm.scrimMin && kal < jeju && jeju <= CANON.textureCalm.scrimMax, `${kal} ${jeju}`);
  assert.equal(smooth, 0);
});

// ── 11·12. 쌓인 덩어리 = 한 주인공 ──
test('위아래로 쌓인 덩어리(구 머리 + 반구 몸)는 한 주인공 — 가장 큰 몸만 고르지 않는다. 옆으로 나란히 선 떼는 묶지 않는다', () => {
  const W = 200, H = 200, bg = [10, 90, 190];
  const fig = img(W, H, (x, y) => (Math.hypot(x - 100, y - 100) < 24 || (y > 140 && Math.hypot(x - 100, y - 200) < 60)) ? [235, 240, 250] : bg);
  const f = fieldFromImage(fig, W, H);
  assert.equal(f.kind, 'illust');
  assert.ok(f.focus.stacked && f.focus.y - f.focus.h / 2 < 0.4, `머리까지 ${JSON.stringify(f.focus)}`);
  const row = img(W, H, (x, y) => [40, 100, 160].some(cx => Math.hypot(x - cx, y - 150) < 16) ? [235, 240, 250] : bg);
  const g = fieldFromImage(row, W, H);
  assert.ok(!g.focus?.stacked, JSON.stringify(g.focus));
});

test('desk-06 동원·desk-07 코스맥스: 장부 실측 주인공 상자가 머리를 품는다', () => {
  for (const id of ['desk-06', 'desk-07']) {
    const fo = meta(id).field.focus;
    assert.ok(fo.y - fo.h / 2 < 0.35, `${id} ${JSON.stringify(fo)}`);
  }
  assert.equal(meta('desk-06').field.kind, 'illust', '별 점 흩뿌린 그라데이션 3D는 사진이 아니다');
});
