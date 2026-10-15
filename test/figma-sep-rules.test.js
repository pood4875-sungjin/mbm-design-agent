// Figma 9월 공채(디자이너 13장) 비교에서 채택한 규칙 1~10 — 10-08 사용자 결정(케이스 하나여도 채택, 예외가 나오면 조정)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kvTypeOf } from '../core/kvtypes.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { CANON } from '../core/canon.js';

const col = arr => arr.map(bg => ({ bg }));
const cutout = (focus, ar, cols, extra = {}) => ({ ar, px: [Math.round(ar * 1000), 1000], field: { kind: 'cutout', opaque: 0.04, lum: 0.66, sat: 0.4, semi: 0.03, focus, cols: col(cols), rows: col(cols), ...extra } });
const RING = cutout({ x: 0.5, y: 0.49, w: 0.94, h: 0.86, parts: 1, others: [], density: 0.57 }, 1.71, [1, 0.6, 0.4, 0.3, 0.3, 0.4, 0.5, 1], { lum: 0.48, sat: 0.3, semi: 0.157 });

const specs = adSpecEntries();
const ctx = createContext({ client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기', slogan: '자소서 없는 간편지원', role: '자유직무', startDate: '2025-09-22', deadline: '2025-10-12' }, 'recruit');
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const style = normalizeStyle({ colors: ['#00146E'], keyVisual: PNG, kvMeta: RING, logo: PNG, logoTone: 'dark' });
const fsOf = (html, role) => [...html.matchAll(new RegExp(`data-field="${role}" style="[^"]*?font-size:(\\d+)px`, 'g'))].map(m => Number(m[1]));

test('3. 덩어리 하나에 속이 빈 고리(성긴 가로 누끼)는 장면이 아니라 단일 사물 — 장면은 덩어리 여럿(parts > 1 또는 열 봉우리 ≥ 2)일 때만', () => {
  const t = kvTypeOf(RING);
  assert.ok(!t.subs.some(s => s.id === 'cutout-scene'), '고리 = 장면 아님');
  assert.ok(t.subs.some(s => s.id === 'cutout-object'));
  assert.equal(t.flags.single, true);
  // 열 봉우리 둘 이상이면 성긴 가로 누끼는 여전히 장면(ABL 떼)
  const multi = kvTypeOf(cutout({ x: 0.5, y: 0.5, w: 0.95, h: 0.9, parts: 1, others: [], density: 0.53 }, 3, [1, 0.4, 0.3, 0.8, 0.5, 0.2, 0.8, 0.3, 1]));
  assert.ok(multi.subs.some(s => s.id === 'cutout-scene'));
  assert.equal(multi.flags.single, false);
});

test('1. 반사·유리 누끼(무채·중간 밝기·반투명 가장자리 ≥ 10%)는 밝은 매체(구글 lightField)에서도 어두운 브랜드 지면', () => {
  assert.equal(kvTypeOf(RING).flags.glass, true);
  assert.equal(kvTypeOf(cutout(RING.field.focus, 1.71, [1, 0.4, 1], { semi: 0.05 })).flags.glass, false, '반투명 가장자리 5%는 유리 아님');
  const html = renderAd(ctx, style, specs['google-gdn-580x400']);
  assert.doesNotMatch(html, /data-field-source="brand-tint"/);
  assert.match(html, /data-field-source="brand"/);
});

test('4. 로고 폭 ≤ 메인 글자 × 2.4, ≤ 캔버스 폭 12%(폭 320 이하 세로 띠 25%) — 템플릿 틀(mold) 로고 칸은 칸이 크기(상한 없음, 10-15)', () => {
  // 10-15 템플릿 우선: 자소설 PC 4규격(틀)은 로고 칸(150×31·130×30·163.5×45)이 곧 크기 — 세아제강 로고 143×23 이 칸을 채운다
  for (const id of ['jasoseol-pc-standard-jobpost-pc', 'jasoseol-pc-premium-popup-pc', 'jasoseol-m-premium-popup-mo', 'google-gdn-580x400', 'blind-post-banner']) {   // 10-15 저녁: 구글·블라인드 게시글도 틀(로고 칸)
    const html = renderAd(ctx, style, specs[id]);
    assert.match(html, /<img data-logo="1"[^>]*?max-width:100%/, `${id}: 틀 로고는 칸 폭까지`);
    assert.doesNotMatch(html, /<img data-logo="1"[^>]*?max-width:min\(100%/, `${id}: 로고 폭 상한 없음`);
  }
  for (const id of ['instagram-feed-1080', 'kakao-display-pc-promo']) {   // 10-15 저녁: 블라인드 게시글·피드도 공식 템플릿 틀 — 자유 배치 픽스처는 카카오 디스플레이·인스타
    const sp = specs[id], html = renderAd(ctx, style, sp);
    const main = Math.max(...fsOf(html, 'main'));
    const caps = [...html.matchAll(/<img data-logo="1"[^>]*?max-width:(?:min\(100%,)?(\d+)px/g)].map(m => Number(m[1]));
    assert.ok(caps.length, `${id}: 로고 폭 상한이 있다`);
    const limit = Math.min(main * CANON.logoCap.perMainPx, sp.w * (sp.w <= 320 ? CANON.logoCap.wRatioTower : CANON.logoCap.wRatio));
    for (const c of caps) assert.ok(c <= Math.max(24, Math.round(limit)), `${id}: 로고 폭 ${c} > ${Math.round(limit)}`);
  }
});

test('5. 가로형도 우상단 소형 로고 — 매체가 로고 0개(리멤버)면 생략', () => {
  assert.match(renderAd(ctx, style, specs['kakao-display-pc-promo']), /data-logo-slot="1" style="position:absolute;top:\d+px;right:\d+px/);
  assert.doesNotMatch(renderAd(ctx, style, specs['remember-job-side-mo']), /data-logo/);
});

test('6. 매체 글자 크기 띠(블라인드 게시글 32~56)를 렌더러가 지킨다 — 메인 75px 금지, 보조 글자도 띠 안', () => {
  const html = renderAd(ctx, style, specs['blind-post-banner']);
  const main = fsOf(html, 'main');
  assert.ok(main.length && main.every(f => f <= 56 && f >= 32), `메인 ${main}`);
  for (const role of ['sub', 'date']) for (const f of fsOf(html, role)) assert.ok(f >= 32 && f <= 56, `${role} ${f}`);
});

test('8. 로고 전용 규격(자소설 M채팅목록배너 로고): 텍스트로 따로 넘기는 문구(inImage:false)는 로고 전용 판정에서 빠진다 — 완성 배너 금지', () => {
  for (const id of ['jasoseol-m-premium-chatlist-logo-mo', 'jasoseol-m-standard-chatlist-logo-mo']) {
    const html = renderAd(ctx, style, specs[id]);
    assert.match(html, /data-logo-only="1"/, id);
    assert.doesNotMatch(html, /data-field="main"/, id);
    assert.doesNotMatch(html, /data-object="1"/, id);
  }
  assert.ok(specs['jasoseol-m-premium-chatlist-logo-mo'].outsideTexts.length >= 2, '문구는 전달 세트(밖 글자)로');
});

test('9. 채용 소재는 날짜를 버리지 않는다 — 블라인드·카카오에 날짜 줄, 카카오 3줄 = 메인 1 + 슬로건 1 + 날짜 1', () => {
  assert.deepEqual(CANON.required.recruit, ['date']);
  for (const id of ['blind-post-banner', 'kakao-display-pc-promo']) assert.match(renderAd(ctx, style, specs[id]), /data-field="date"[^>]*>[^<]*9\.22/, id);
  const kakao = renderAd(ctx, style, specs['kakao-display-pc-promo']);
  assert.match(kakao, /data-field="main" style="[^"]*-webkit-line-clamp:1;/, '카카오 메인 1줄');
  assert.match(kakao, /data-field="sub"/);
});

test('2·7. 단일 사물 누끼는 우하단 블리드(오른쪽·아래로만), 에브리타임 커뮤니티보드 오브젝트는 폭 220~320·오른쪽 40~360 영역', () => {
  const kakao = renderAd(ctx, style, specs['kakao-display-pc-promo']);
  const m = kakao.match(/data-bleed="1" style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px;background:url\([^)]*\) 0px 0px\/(\d+)px auto/);
  assert.ok(m, '블리드 층');
  const [left, top, vw, vh, dw] = m.slice(1).map(Number);
  assert.equal(left + vw, 1200); assert.equal(top + vh, 600);
  assert.ok(vw / dw >= 0.7 - 1e-9, `가로 보임 ${vw / dw}`);
  const et = renderAd(ctx, style, specs['everytime-community-board']);
  const b = et.match(/data-object="1" style="position:absolute;left:(\d+)px;top:\d+px;width:(\d+)px/);
  assert.ok(b);
  const [x, bw] = b.slice(1).map(Number);
  // 10-15 틀(mold): 오브젝트는 템플릿 1:771 의 칸(658,0 320×258) 그대로 — 폭 320, 오른쪽 51(규칙 폭 220~320·오른쪽 40~360 안)
  assert.ok(bw >= 220 && bw <= 400 && x >= 600, `10-15 밤: 틀 매체 KV 는 글자 상자를 피한 오른쪽 열(자유 배치) — 폭 ${bw} x ${x}`);
});

test('10. 정사각 메인 하한 = 짧은 변 × 0.067(인스타 1080 → 72px 이상)', () => {
  const html = renderAd(ctx, style, specs['instagram-feed-1080']);
  assert.ok(Math.max(...fsOf(html, 'main')) >= Math.round(1080 * CANON.mainFloor.square));
});
