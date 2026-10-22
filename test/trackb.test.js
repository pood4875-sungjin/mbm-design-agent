// test/trackb.test.js — B 트랙(AI 레이아웃) 순수 모듈: 고정 조건 · 검증 · 렌더 · 비용
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerAll } from '../core/generate.js';
import { SPECS } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { LAYOUT_SCHEMA, validateLayout } from '../core/trackb/schema.js';
import { buildFixed, buildPrompt, safeAreaOf, retryPrompt } from '../core/trackb/prompt.js';
import { renderLayout, layerList, backgroundCss } from '../core/trackb/render.js';
import { estimateCost, sumUsage } from '../core/trackb/cost.js';

registerAll();
const meta28 = JSON.parse(readFileSync(new URL('../ref/learned/cases/pin-28/meta.json', import.meta.url), 'utf8'));
const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '일반(사업, 재무 등)', deadline: '2025-07-02', startDate: '2025-06-20', season: '2025년', deadlineTime: '17:00', notice: '자세한 내용은 홈페이지 참고' }, 'recruit');
const kakao = SPECS['kakao-display-pc-promo'], gdn = SPECS['google-gdn-580x400'];

test('고정 조건 — 카카오 PC 는 매체 JSON 값(1200×600 · 안전영역 40/40/90/40 · 글자 48~164 · 3줄 · Pretendard 고정), 구글 580 은 권장값(여백 4% · 폰트 캠페인 선택)', () => {
  const f = buildFixed(kakao, { ctx, kvMeta: meta28, hasKv: true, hasLogo: false });
  assert.equal(f.w, 1200); assert.equal(f.h, 600);
  assert.deepEqual([f.safe.top, f.safe.right, f.safe.bottom, f.safe.left], [40, 40, 90, 40]);
  assert.deepEqual([f.fontSize.min, f.fontSize.max, f.maxLines, f.noticeMin], [48, 164, 3, 24]);
  assert.equal(f.font.family, 'Pretendard'); assert.equal(f.font.fixed, true);
  assert.deepEqual(f.weights, [400, 500, 600, 700], '묶은 Pretendard 굵기만');
  assert.deepEqual(f.requiredTexts.map(r => r.text), ['GS에너지', '6.20(금) - 7.2(수) 17시', '자세한 내용은 홈페이지 참고']);
  const g = buildFixed(gdn, { ctx, fontId: 'KakaoBigSans', hasKv: true });
  assert.deepEqual([g.safe.top, g.safe.left], [16, 16]); assert.equal(g.font.fixed, false); assert.equal(g.font.family, 'Kakao Big Sans');
  assert.equal(safeAreaOf(gdn).source.includes('권장'), true);
});

test('프롬프트 — 고정 조건·문구·브랜드·요구가 들어가고 문구는 A 트랙 사다리와 같다', () => {
  const f = buildFixed(kakao, { ctx, kvMeta: meta28, hasKv: true, hasLogo: true, logoMeta: { ar: 2.5, tone: 'light' } });
  const p = buildPrompt(f, { brief: ctx.core, brand: { primary: '#326CD1' }, requests: '지구본이 잘 보이게', kvMeta: meta28, logoMeta: { ar: 2.5, tone: 'light' } });
  for (const s of ['1200×600', '위 40 · 오른쪽 40 · 아래 90 · 왼쪽 40', '48~164px', 'Pretendard (매체 지정', 'GS에너지 신입 공채', '6.20(금) - 7.2(수) 17시', '#326CD1', '지구본이 잘 보이게', '흰색(밝은 로고', '자세한 내용은 홈페이지 참고']) assert.ok(p.includes(s), s);
  assert.ok(retryPrompt(['x']).includes('- x'));
  assert.equal(LAYOUT_SCHEMA.additionalProperties, false);
  assert.ok(LAYOUT_SCHEMA.required.includes('texts'));
});

const fixedK = () => buildFixed(kakao, { ctx, kvMeta: meta28, hasKv: true, hasLogo: true, logoMeta: { ar: 3 } });
const good = () => ({
  background: { base: { kind: 'linear', colors: ['#1E4FBF', '#0B2A6E'], angle: 135 }, shapes: [{ kind: 'ellipse', x: 700, y: -100, w: 600, h: 600, color: '#FFFFFF', opacity: 0.08, radius: 0, blur: 40 }] },
  images: [{ id: 'kv', x: 700, y: 0, w: 500, h: 600, crop: { x: 0.05, y: 0.1, w: 0.888, h: 0.8 }, opacity: 1, fade: 'left' }, { id: 'logo', x: 60, y: 50, w: 150, h: 50, crop: { x: 0, y: 0, w: 1, h: 1 }, opacity: 1, fade: 'none' }],
  texts: [
    { role: 'main', text: '2025년 GS에너지\n신입 공채', x: 60, y: 140, w: 620, size: 72, weight: 700, color: '#FFFFFF', align: 'left', lineHeight: 1.2, letterSpacing: -0.02 },
    { role: 'period', text: '접수기간 6.20(금) - 7.2(수) 17시', x: 60, y: 340, w: 620, size: 48, weight: 500, color: '#FFFFFF', align: 'left', lineHeight: 1.3, letterSpacing: 0 },
    { role: 'notice', text: '자세한 내용은 홈페이지 참고', x: 60, y: 460, w: 620, size: 24, weight: 400, color: '#FFFFFF', align: 'left', lineHeight: 1.3, letterSpacing: 0 },
  ],
  rationale: '글자는 왼쪽, 지구본은 오른쪽.',
});

test('검증 — 올바른 레이아웃은 그대로 통과(고침 0 · 재요청 0), 캔버스는 규격 값', () => {
  const r = validateLayout(good(), fixedK());
  assert.deepEqual(r.retry, []); assert.deepEqual(r.fixes, []);
  assert.deepEqual(r.layout.canvas, { w: 1200, h: 600 });
  assert.equal(r.layout.images[1].h, 50, '로고 150/3 = 50 그대로');
});

test('검증 — 고정 조건 위반은 고친다: 안전영역 밖 글자·로고, 글자 크기 범위, 로고 비율, 굵기, 키비주얼 crop 비율(왜곡 금지), 빠진 고지 문구', () => {
  const L = good();
  L.texts[0].x = 10; L.texts[0].size = 300; L.texts[1].size = 20; L.texts[1].weight = 900;
  L.images[1].h = 90; L.images[1].y = 5;
  L.images[0].crop = { x: 0, y: 0, w: 1, h: 1 };   // 상자 500×600(0.833) vs 원본 0.751 → 비율 안 맞음
  L.texts.splice(2, 1);                            // 고지 빠짐
  const r = validateLayout(L, fixedK());
  assert.deepEqual(r.retry, [], '전부 고칠 수 있는 위반');
  const t0 = r.layout.texts[0]; assert.equal(t0.x, 40); assert.equal(t0.size, 164);
  const t1 = r.layout.texts[1]; assert.equal(t1.size, 48); assert.equal(t1.weight, 700, '900 → 보유 굵기 700');
  const lg = r.layout.images[1]; assert.equal(lg.h, 50); assert.equal(lg.y, 40);
  const kv = r.layout.images[0]; const ar = (kv.crop.w * meta28.ar) / kv.crop.h; assert.ok(Math.abs(ar - kv.w / kv.h) < 0.02, `crop 비율 ${ar} ≈ 상자 ${kv.w / kv.h}`);
  const notice = r.layout.texts.find(t => t.role === 'notice'); assert.ok(notice, '고지 문구 자동 추가'); assert.equal(notice.size, 24); assert.ok(notice.y + 24 * 1.3 <= 600 - 90 + 0.5, '아래 안전영역 안');
  assert.ok(r.fixes.length >= 6, r.fixes.join(' / '));
});

test('검증 — crop 이 원본 픽셀로 오면 비율로 환산한다(10-22 실제 응답)', () => {
  const L = good(); L.images[0].crop = { x: 0, y: 30, w: 736, h: 883 };
  const r = validateLayout(L, fixedK());
  const c = r.layout.images[0].crop;
  assert.ok(r.fixes.some(s => s.includes('픽셀 → 비율')));
  assert.ok(c.w > 0.5 && c.h > 0.5 && c.x >= 0 && c.y >= 0, JSON.stringify(c));
  assert.ok(Math.abs((c.w * meta28.ar) / c.h - 500 / 600) < 0.02, '상자 비율로 맞춤');
});

test('검증 — 고객사 이름·접수 기간이 없거나 로고 층이 빠지면 재요청 사유, 로고 파일이 없는데 로고 층이 있으면 지움', () => {
  const L = good(); L.texts[0].text = '신입 공채'; L.texts[1].text = '접수기간 6월'; L.images.splice(1, 1);
  const r = validateLayout(L, fixedK());
  assert.ok(r.retry.some(s => s.includes('GS에너지'))); assert.ok(r.retry.some(s => s.includes('6.20(금)'))); assert.ok(r.retry.some(s => s.includes('로고 층')));
  const r2 = validateLayout(good(), buildFixed(kakao, { ctx, kvMeta: meta28, hasKv: true, hasLogo: false }));
  assert.equal(r2.layout.images.length, 1); assert.ok(r2.fixes.some(s => s.includes('로고')));
  const r3 = validateLayout({}, fixedK());
  assert.ok(r3.retry.some(s => s.includes('GS에너지')), '빈 응답 — 고객사 이름 없음'); assert.equal(r3.layout.texts.length, 1, '고지 문구만 자동 추가');
  const r4 = validateLayout({}, buildFixed(kakao, { ctx: createContext({ client: 'X', hiringType: 'Y', deadline: '2026-01-01' }, 'recruit'), hasKv: false }));
  assert.ok(r4.retry.includes('글자 층이 하나도 없다'));
});

test('렌더 — A 트랙과 같은 표식(data-ad · data-field · data-object · data-logo), 폰트는 호출자가 박고 JSON 에는 없다, crop → background-size/position', () => {
  const r = validateLayout(good(), fixedK());
  const html = renderLayout(r.layout, { kv: 'kv.jpg', logo: 'logo.png', fontStack: `'Pretendard',sans-serif`, specId: 'kakao-display-pc-promo' });
  assert.ok(html.startsWith('<div data-ad="1" data-track="b"'));
  assert.ok(html.includes('width:1200px;height:600px'));
  assert.ok(html.includes(`font-family:'Pretendard',sans-serif`));
  assert.equal((html.match(/data-field="/g) ?? []).length, 3);
  assert.ok(html.includes('data-field="main"') && html.includes('2025년 GS에너지\n신입 공채'));
  assert.ok(html.includes('data-object="1"') && html.includes("url('kv.jpg')"));
  assert.ok(html.includes('data-logo="1"') && html.includes('object-fit:contain'));
  assert.ok(html.includes('mask-image:linear-gradient(to right'), '왼쪽 녹임');
  assert.ok(html.includes('background:linear-gradient(135deg,#1E4FBF 0%,#0B2A6E 100%)'));
  assert.ok(/background:url\('kv\.jpg'\) -?[\d.]+px -?[\d.]+px\/[\d.]+px [\d.]+px no-repeat/.test(html));
  assert.ok(html.includes('&lt;') === false && !html.includes('<script'));
  assert.deepEqual(layerList(r.layout).map(l => l.kind), ['background', 'shape', 'image', 'image', 'text', 'text', 'text']);
  assert.equal(backgroundCss({ kind: 'solid', colors: ['#ABCDEF'] }), '#ABCDEF');
});

test('비용 — 공개 단가로 추정, 모르는 모델은 null, 사용량 합산', () => {
  assert.equal(estimateCost('claude-opus-5-5', { input_tokens: 1_000_000, output_tokens: 100_000 }), 6);
  assert.equal(estimateCost('claude-sonnet-5-5', { input_tokens: 500_000, output_tokens: 0, cache_read_input_tokens: 500_000 }), 1.1);
  assert.equal(estimateCost('nope', {}), null);
  assert.deepEqual(sumUsage([{ input_tokens: 1, output_tokens: 2 }, { input_tokens: 3 }]), { input_tokens: 4, output_tokens: 2, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
});
