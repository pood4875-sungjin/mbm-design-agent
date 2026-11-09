// 11-09 사용자 시안 「자소설 키비주얼별 배경 활용」(docs/jasoseol-bg-rules-1109.md) — 지면 그라데이션 방향 · 이미지 칸 cover + 지면 쪽 변만 짧게 녹임 · 다른 매체 자동 적용 · 예외
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
const { registerAll } = await import('../core/generate.js'); registerAll();
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const ctx = createContext({ client: '한진정보통신', hiringType: '신입 공채', role: '백엔드 개발자', deadline: '2026-10-31' }, 'recruit');
const edge = hex => ({ hex, from: hex, to: hex, flat: false });
const PHOTO = { ar: 1.5, px: [1500, 1000], colors: ['#A87045', '#95C7EB'], field: { kind: 'photo', opaque: 1, lum: 0.5, sat: 0.3, flatEdges: 0, focus: { x: 0.5, y: 0.55, w: 0.4, h: 0.5, parts: 1, others: [] }, edges: { top: edge('#A26C42'), bottom: edge('#6B4A2E'), left: edge('#6B4A2E'), right: edge('#6B4A2E') } } };
const CUT = { ar: 1, px: [800, 800], field: { kind: 'illust', opaque: 0.3, focus: { x: 0.5, y: 0.5, w: 0.8, h: 0.8 } } };
const st = kv => normalizeStyle({ colors: ['#3B73C6'], keyVisual: PNG, kvMeta: kv });
const obj = h => h.match(/<div data-object="1"[^>]*>/)?.[0] ?? '';

test('PC메인 1200×280: 이미지는 0,0 350×280 cover · 오른쪽 27% 녹임(0 → .2@46% → 1) · 불투명도 .9 · 지면 그라데이션 가로 왼→오', () => {
  const h = renderArtifact('jasoseol-pc-standard-main-pc', ctx, st(PHOTO), {}); const t = traceOf(h); const o = obj(h);
  assert.match(o, /left:0px;top:0px;width:350px;height:280px;background:url\([^)]*\) [^/]+\/cover no-repeat;-webkit-mask-image:linear-gradient\(to left,transparent 0%,rgba\(0,0,0,0\.2\) 12\.4%,#000 27%\)/);
  assert.match(o, /opacity:0\.9;/); assert.match(o, /data-bgrule="1" data-melt="27" data-melt-dir="to left"/);
  if (t.field.gradient) assert.equal(t.field.angle, 90);
  assert.ok(t.rules.includes('templateMold.bgRule'));
});

test('세로형·팝업: 이미지가 있으면 그라데이션은 그림 쪽 끝이 주색(채용공고·M팝업 0° = 아래→위, PC팝업 315°), 누끼면 위→아래·대각 135°', () => {
  for (const [id, img, cut] of [['jasoseol-pc-standard-jobpost-pc', 0, 180], ['jasoseol-m-premium-popup-mo', 0, 180], ['jasoseol-pc-premium-popup-pc', 315, 135]]) {
    const a = traceOf(renderArtifact(id, ctx, st(PHOTO), {})), b = traceOf(renderArtifact(id, ctx, st(CUT), {}));
    if (a.field.gradient) assert.equal(a.field.angle, img, id + ' 이미지');
    if (b.field.gradient) assert.equal(b.field.angle, cut, id + ' 누끼');
  }
  const jp = renderArtifact('jasoseol-pc-standard-jobpost-pc', ctx, st(PHOTO), {});
  assert.match(obj(jp), /left:0px;top:355px;width:160px;height:245px;[^"]*linear-gradient\(to bottom,transparent 0%,rgba\(0,0,0,0\.2\) 26\.5%,#000 53%\)/);
  const pp = renderArtifact('jasoseol-pc-premium-popup-pc', ctx, st(PHOTO), {});
  assert.match(obj(pp), /left:245px;top:181px;width:305px;height:219px;[^"]*linear-gradient\(to right,transparent 0%,#000 26%\),linear-gradient\(to bottom,transparent 0%,#000 38%\)/);
});

test('누끼는 시안 칸·녹임을 쓰지 않는다(예전 칸 contain, 녹임 없음)', () => {
  const h = renderArtifact('jasoseol-pc-standard-jobpost-pc', ctx, st(CUT), {});
  assert.doesNotMatch(h, /data-bgrule/); assert.match(obj(h), /center bottom\/contain no-repeat/);
});

test('다른 매체는 그림 칸 자리로 자동: 리멤버 오른쪽 열 = 왼쪽 27% · 구글 580 모서리 = 왼 26%·위 38% · 구글 300×1050 가는 띠 = 위 53% — 둥근 칸(카카오 비즈보드)은 제외', () => {
  const r = renderArtifact('remember-main-top-mo', ctx, st(PHOTO), {});
  assert.match(r, /data-bgrule="1" data-melt="27" data-melt-dir="to right"/); assert.ok(traceOf(r).rules.includes('templateMold.bgRuleAuto'));
  if (traceOf(r).field.gradient) assert.equal(traceOf(r).field.angle, 270);
  assert.match(renderArtifact('google-gdn-580x400', ctx, st(PHOTO), {}), /data-bgrule="1" data-melt="26" data-melt-dir="to right" data-melt-top="38"/);
  assert.match(renderArtifact('google-gdn-300x1050', ctx, st(PHOTO), {}), /data-bgrule="1" data-melt="53" data-melt-dir="to bottom"/);
  assert.doesNotMatch(renderArtifact('kakao-bizboard-mo', ctx, st(PHOTO), {}), /data-bgrule/);
});
