// 겹침 교정 사다리(overlapFix, 10-19 사용자 「키비주얼과 텍스트가 겹쳐서 텍스트가 안 보일 땐 텍스트를 줄이던지 띄어쓰던지 키비주얼 위치를 조정해야」)
//   글자 어림 상자(TR.textBox) × 주인공(누끼는 열·행 불투명 칸, 아니면 focus 상자) 겹침이 문턱(캐릭터·프로필 누끼 2%, 그 외 15%)을 넘으면
//   자유 배치: 글자 줄이기 → 메인 두 줄 → 키비주얼 축소 · 틀: 칸 안 그림 축소(사진은 칸 자체 우하단으로 축소) → 글자(규정 매체 0.85 바닥)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd, overlapRatio, objectRects } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const LONG = { client: '한국산업단지공단', role: '산업단지 개발·관리, 기업지원, 경영기획', employType: '정규직', location: '대구 본사', deadline: '2026-10-31', season: '2026 하반기', hiringType: '정규직 채용' };
const SHORT = { client: '한진정보통신', role: '백엔드 개발자', employType: '정규직', location: '서울', deadline: '2026-10-31' };
// 가로로 긴 떼 누끼(ABL 6인 꼴): 왼쪽 12%·오른쪽 8%는 비고 가운데가 불투명, 위 20% 머리 위 빈 띠
const prof = (n, f) => Array.from({ length: n }, (_, i) => ({ bg: f(i / (n - 1)) }));
const CROWD = { ar: 1.6, px: [1600, 1000], field: { kind: 'cutout', opaque: 0.05, lum: 0.5, sat: 0.4, focus: { x: 0.5, y: 0.58, w: 0.8, h: 0.8, parts: 6, others: [] }, cols: prof(32, t => (t < 0.12 || t > 0.92) ? 0.97 : 0.35), rows: prof(32, t => t < 0.2 ? 0.95 : 0.4) } };
const PHOTO = { ar: 1.5, px: [1500, 1000], field: { kind: 'photo', opaque: 1, lum: 0.5, sat: 0.3, focus: { x: 0.5, y: 0.5, w: 0.9, h: 0.9 } } };
const crowd = normalizeStyle({ colors: ['#E2401A'], keyVisual: PNG, kvMeta: CROWD });
const photo = normalizeStyle({ colors: ['#8C5A2B'], keyVisual: PNG, kvMeta: PHOTO });
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"'));
const overlapAttr = html => (html.match(/data-overlap="([^"]*)"/) ?? [])[1]?.replace(/&gt;/g, '>') ?? null;

test('네이버 DA 틀 + 긴 직무 값 + 떼 누끼: 상세 값이 그림 칸으로 흘러 첫 사람과 겹침 → 칸 안 누끼 축소(kv)로 2% 아래 · trace overlapFix.ok · data-overlap "전>후:단계"', () => {
  const ctx = createContext(LONG, 'recruit');
  const html = renderAd(ctx, crowd, specs['naver-gfa-mobile-da-1250x560']);
  const ov = overlapAttr(html);
  // 11-10 피드백 56(규정 4줄 · 날짜 칸 넓힘): 긴 직무 값이 짧은 후보로 한 줄에 서면 그림 칸까지 흐르지 않는다 — 그때는 교정할 일도 없다
  if (!ov) { const t0 = traceOf(html); assert.ok(t0.rules.includes('templateMold.guideLines') && !t0.rules.includes('overlapFix.fail'), t0.rules.join(',')); return; }
  const m = ov.match(/^(\d+)>(\d+):(\w+)$/); assert.ok(m, ov);
  assert.ok(+m[1] > 2 && +m[2] <= 2, `전 ${m[1]}% → 후 ${m[2]}%`); assert.equal(m[3], 'kv', '틀은 그림 축소부터');
  const tr = traceOf(html); assert.ok(tr.rules.includes('overlapFix.ok') && !tr.rules.includes('overlapFix.text'), tr.rules.join(','));
  assert.match(html, /data-object="1" style="[^"]*right bottom\/auto \d+px/, '칸(contain)이 아니라 그 배율 높이로');
  // 글자는 틀 실측 그대로(네이버 메인 56·상세 31) — 글자를 건드리기 전에 그림이 풀었다
  assert.equal(tr.mold.rows.main.px, 56); assert.equal(tr.mold.rows.detail.px, 31);
});

test('겹치지 않으면 아무것도 안 한다 — 짧은 문구·오른쪽 열 배치(구글 580 떼 누끼), 전달 전 스타일에 __fix 가 남지 않는다', () => {
  const ctx = createContext(SHORT, 'recruit');
  for (const id of ['google-gdn-580x400', 'instagram-feed-1080', 'blind-post-banner']) {
    const html = renderAd(ctx, crowd, specs[id]);
    assert.equal(overlapAttr(html), null, id);
    assert.ok(!traceOf(html).rules.some(r => r.startsWith('overlapFix')), id);
  }
  assert.equal(crowd.__fix, undefined);
});

test('사진 틀 칸(네이버 DA)은 칸 자체를 우하단으로 줄인다 — 오른쪽·아래 변은 그대로, 글자 쪽으로 물러남', () => {
  const ctx = createContext(LONG, 'recruit');
  const before = renderAd(ctx, { ...photo, __fix: {} }, specs['naver-gfa-mobile-da-1250x560']);
  const after = renderAd(ctx, photo, specs['naver-gfa-mobile-da-1250x560']);
  const b = traceOf(before).place.tImage, a = traceOf(after).place.tImage;
  if (overlapAttr(after)) {   // 사진 주인공은 focus 상자라 문턱 15% — 넘었을 때만 칸이 줄어 있어야 한다
    assert.ok(a.w < b.w && a.h < b.h, `${JSON.stringify(b)} → ${JSON.stringify(a)}`);
    assert.equal(a.x + a.w, b.x + b.w); assert.equal(a.y + a.h, b.y + b.h);
  }
  // __fix: {} 는 사다리를 끄는 내부 스위치 — 전(before)에는 교정 표시가 없다
  assert.equal(overlapAttr(before), null);
});

test('겹침 계산은 녹인 변(data-melt)과 빈 칸을 주인공에서 뺀다 — 잡다 MO 사진 칸 왼쪽 35% 녹임 위의 글자는 겹침 아님', () => {
  const ctx = createContext(SHORT, 'recruit');
  const html = renderAd(ctx, { ...photo, __fix: {} }, specs['jobda-main-mo']);
  const objs = objectRects(html, photo, specs['jobda-main-mo']); assert.equal(objs.length, 1);
  assert.ok(objs[0].clip.x > objs[0].box.x + 20, `녹임 구간 제외: clip ${JSON.stringify(objs[0].clip)} box ${JSON.stringify(objs[0].box)}`);
  const r = overlapRatio(html, traceOf(html), photo, specs['jobda-main-mo']); assert.ok(r != null && r < 0.15, `겹침 ${r}`);
});

// 11-17 사용자 화면(블라인드 1200×628): data-overlap="35>12:kv" 의 날 「>」를 [^>]* 로 태그를 찾는 후처리가 태그 끝으로 읽어
// 루트 태그가 끊기고 data-spec·data-trace 가 그림 위 글자로 쏟아졌다 — 값의 「>」는 &gt; 로 쓴다
test('교정 표시(data-overlap·data-empty)가 붙어도 루트 태그가 끊기지 않는다 — 값 안에 날 「>」 없음', () => {
  const ctx = createContext(LONG, 'recruit');
  let marked = 0;
  for (const [id, spec] of Object.entries(specs)) for (const st of [crowd, photo]) {
    const html = renderAd(ctx, st, spec);
    const tag = html.match(/<div data-ad="1"[^>]*>/)?.[0] ?? '';
    if (!/data-(overlap|empty)=/.test(html)) continue;
    marked++;
    assert.match(tag, /data-trace="[^"]*" style="/, `${id}: 루트 태그가 data-trace 앞에서 끊김`);
    assert.doesNotMatch(html, /data-(overlap|empty)="[^"]*>[^"]*"/, id);
  }
  assert.ok(marked > 0, '교정 표시가 붙는 규격이 하나는 있어야 시험이 된다');
});

// 11-17 사용자 「위에 뭐 덧댄 느낌」 — 로고 전용 규격(카카오 프로필 300×300)에 AI 배경 도형이 로고 위로 그려졌다
test('AI 배경 도형은 로고 전용 규격에 넣지 않는다 — 다른 규격엔 그대로', () => {
  const ctx = createContext(SHORT, 'recruit');
  const st = { ...normalizeStyle({ colors: ['#2F5DA8'], keyVisual: PNG, kvMeta: CROWD, logo: PNG, logoTone: 'dark' }), aiShapes: [{ kind: 'circle', x: 0, y: 0, w: .6, h: .6, color: '#DCEBFF', opacity: .8, blur: .2 }] };
  const prof = renderAd(ctx, st, specs['kakao-display-pc-profile']);
  assert.match(prof, /data-logo-only="1"/); assert.doesNotMatch(prof, /data-ai-shape=/);
  assert.match(renderAd(ctx, st, specs['instagram-feed-1080']), /data-ai-shape="0"/);
});
