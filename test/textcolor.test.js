// 직접 고른 글자색(style.textColor, 11-02 컨시어지 박진화 「브랜드컬러 외 폰트 색상 지정 기능」)
//   자유 매체(규정 textColors.main 없고 fonts.required 아님 — 구글·네이버·인스타·에브리타임 등)는 메인·서브·상세 글자색을 그 색으로,
//   규정 매체(자소설·리멤버·카카오·NAP 비즈보드)는 무시하고 trace 에 textColor.ignored · 지면과 대비 3:1 미만이면 textColor.lowContrast + 검수 text-contrast 경고(차단 아님)
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStyle } from '../core/style.js';
import { lintArtifact } from '../core/lint.js';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const cutoutMeta = { ar: 1.6, px: [2400, 1500], colors: ['#3A8A6A', '#F2D24B', '#5CB85C'], field: { kind: 'cutout', opaque: 0.3, edges: {} } };
const trace = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const base = { colors: ['#1428A0', '#F2D24B', '#5CB85C'], keyVisual: PNG, kvMeta: cutoutMeta };
async function setup() {
  const { renderArtifact } = await import('../core/contract.js'); const { registerAll } = await import('../core/generate.js'); const { createContext } = await import('../core/context.js');
  registerAll();
  const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', deadline: '2026-10-31' }, 'recruit');
  return { renderArtifact, ctx };
}

test('자유 매체(구글·네이버·인스타)는 지정 글자색을 메인·서브·상세에 쓴다 — normalizeStyle 이 textColor 보존, 서브는 같은 색 70%', async () => {
  const { renderArtifact, ctx } = await setup();
  const st = normalizeStyle({ ...base, textColor: '#ffd200' });
  assert.equal(st.textColor, '#FFD200', 'normalizeStyle: 대문자 hex 보존');
  assert.equal(normalizeStyle({ ...base, textColor: 'yellow' }).textColor, null, 'hex 아니면 null');
  assert.equal(normalizeStyle({ ...base }).textColor, null, '기본 null(톤대로)');
  for (const id of ['google-gdn-580x400', 'naver-gfa-mobile-da-1250x560', 'instagram-feed-1080']) {
    const h = renderArtifact(id, ctx, st, {}); const t = trace(h);
    assert.equal(t.text.mainFg, '#FFD200', id + ' 메인'); assert.ok(t.rules.includes('textColor'), id + ' trace textColor'); assert.ok(!t.rules.includes('textColor.ignored'));
    assert.ok(t.text.subFg === '#FFD200' || /rgba\(255,210,0,0\.7\)/.test(t.text.subFg), id + ' 서브 ' + t.text.subFg);
    assert.equal(t.text.detailFg, t.text.subFg, id + ' 상세 = 서브');
    assert.match(h, /data-field="main"[^>]*color:#FFD200/, id + ' 메인 글자 style 에 색');
    assert.equal(t.text.textColor.applied, true); assert.equal(typeof t.text.textColor.contrast, 'number');
  }
  // 톤(textTone)보다 우선 — 다크 톤 + 지정 색이면 지정 색
  assert.equal(trace(renderArtifact('google-gdn-580x400', ctx, normalizeStyle({ ...base, textTone: 'dark', textColor: '#FFD200' }), {})).text.mainFg, '#FFD200');
});

test('규정 매체(자소설·리멤버·카카오·NAP 비즈보드)는 지정 글자색을 무시하고 trace 에 textColor.ignored — 틀·규정 색 그대로', async () => {
  const { renderArtifact, ctx } = await setup();
  const st = normalizeStyle({ ...base, textColor: '#FFD200' });
  const plain = normalizeStyle({ ...base });
  for (const id of ['remember-main-top-pc', 'kakao-bizboard-mo', 'nap-dsp-bizboard-1029x258']) {   // 11-02: 색이 정해진 규격만 잠금 — 자소설·카카오 PC 는 아래 테스트
    const h = renderArtifact(id, ctx, st, {});
    const t = trace(h), t0 = trace(renderArtifact(id, ctx, plain, {}));
    assert.notEqual(t.text.mainFg, '#FFD200', id + ' 규정 매체는 무시');
    assert.equal(t.text.mainFg, t0.text.mainFg, id + ' 지정 전과 같은 색');
    assert.ok(t.rules.includes('textColor.ignored') && !t.rules.includes('textColor'), id + ' trace ignored: ' + t.rules.filter(r => /textColor/.test(r)));
    assert.equal(t.text.textColor.applied, false);
  }
});

test('대비 경고 — 지면과 3:1 미만이면 trace textColor.lowContrast · 검수(lint) text-contrast warn(차단 아님) · 3:1 이상이면 없음', async () => {
  const { renderArtifact, ctx } = await setup();
  // 네이비 지면(#1428A0 그라데이션) 위 진남색 글자 → 대비 1점대
  const low = trace(renderArtifact('google-gdn-580x400', ctx, normalizeStyle({ ...base, colorsManual: true, textColor: '#1A2E8A' }), {}));
  assert.ok(low.rules.includes('textColor.lowContrast'), 'lowContrast: ' + JSON.stringify(low.text.textColor));
  assert.ok(low.text.textColor.contrast < 3);
  const ok = trace(renderArtifact('google-gdn-580x400', ctx, normalizeStyle({ ...base, colorsManual: true, textColor: '#FFD200' }), {}));
  assert.ok(!ok.rules.includes('textColor.lowContrast') && ok.text.textColor.contrast >= 3, '노랑은 통과: ' + ok.text.textColor.contrast);
  // 검수: 앱이 유효 글자색을 measure.textColor 로 넘긴다 — bgColors 와 대비
  const spec = { w: 580, h: 400 };
  const L = lintArtifact({ spec, medium: {}, measure: { texts: [], bgColors: ['#1428A0', '#0F1E70'], textColor: '#1A2E8A' } });
  const w = L.issues.find(i => i.code === 'text-contrast');
  assert.ok(w && w.level === 'warn', 'text-contrast warn: ' + JSON.stringify(L.issues));
  assert.equal(L.level, 'warn', '차단 아님');
  assert.ok(!lintArtifact({ spec, medium: {}, measure: { texts: [], bgColors: ['#1428A0'], textColor: '#FFD200' } }).issues.some(i => i.code === 'text-contrast'), '대비 충분하면 없음');
  assert.ok(!lintArtifact({ spec, medium: {}, measure: { texts: [], bgColors: ['#1428A0'] } }).issues.some(i => i.code === 'text-contrast'), '지정 색 없으면 검사 안 함');
});

test('N5 폰트 고정 ≠ 색 고정: 자소설(한 색 통일)·카카오 PC디스플레이는 직접 고른 색이 먹는다 — 자소설은 서브·상세까지 같은 색(70% 없음)', () => {
  const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', deadline: '2026-10-31' }, 'recruit');
  const st = normalizeStyle({ ...base, textColor: '#C2185B' });
  for (const id of ['jasoseol-pc-premium-popup-pc', 'kakao-display-pc-promo']) { const t = trace(renderArtifact(id, ctx, st, {})); assert.equal(t.text.mainFg, '#C2185B', id); assert.ok(t.rules.includes('textColor'), id); }
  const j = trace(renderArtifact('jasoseol-pc-premium-popup-pc', ctx, st, {})); assert.equal(j.text.subFg, '#C2185B'); assert.equal(j.text.detailFg, '#C2185B');
});

test('글자별 색(roleColors): 구글은 메인·날짜 따로 · 자소설은 한 색 규정대로 전 문구 · 리멤버·비즈보드는 잠금', () => {
  const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', deadline: '2026-10-31' }, 'recruit');
  const st = normalizeStyle({ ...base, roleColors: { main: '#C2185B', sub: '#112233' } });
  const g = trace(renderArtifact('google-gdn-580x400', ctx, st, {})); assert.equal(g.text.mainFg, '#C2185B'); assert.equal(g.text.subFg, '#112233');
  const j = trace(renderArtifact('jasoseol-pc-premium-popup-pc', ctx, st, {})); assert.equal(j.text.mainFg, '#C2185B'); assert.equal(j.text.subFg, '#C2185B'); assert.equal(j.text.detailFg, '#C2185B');
  for (const id of ['remember-main-top-pc', 'kakao-bizboard-mo']) assert.notEqual(trace(renderArtifact(id, ctx, st, {})).text.mainFg, '#C2185B', id);
});
