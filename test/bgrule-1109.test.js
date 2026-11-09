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
  assert.match(obj(pp), /left:245px;top:181px;width:305px;height:219px;[^"]*linear-gradient\(to right,transparent 0%,#000 27.5%\),linear-gradient\(to bottom,transparent 0%,#000 39.7%\),linear-gradient\(135\.4\ddeg,transparent 13\.4%,rgba\(0,0,0,0\.4\) 26\.[34]%,#000 39\.3%\)/);   // 11-09 시안 실측 84/305·87/219 + 왼쪽 위 대각(「네모로만 주면 각져 보여」);
});

test('누끼는 시안 칸·녹임을 쓰지 않는다(예전 칸 contain, 녹임 없음)', () => {
  const h = renderArtifact('jasoseol-pc-standard-jobpost-pc', ctx, st(CUT), {});
  assert.doesNotMatch(h, /data-bgrule/); assert.match(obj(h), /center bottom\/contain no-repeat/);
});

test('다른 매체는 그림 칸 자리로 자동: 리멤버 오른쪽 열 = 왼쪽 27% · 구글 580 모서리 = 왼 26%·위 38% · 구글 300×1050 가는 띠 = 위 53% — 둥근 칸(카카오 비즈보드)은 제외', () => {
  const r = renderArtifact('remember-main-top-mo', ctx, st(PHOTO), {});
  assert.match(r, /data-bgrule="1" data-melt="27" data-melt-dir="to right"/); assert.ok(traceOf(r).rules.includes('templateMold.bgRuleAuto'));
  if (traceOf(r).field.gradient) assert.equal(traceOf(r).field.angle, 270);
  assert.match(renderArtifact('google-gdn-580x400', ctx, st(PHOTO), {}), /data-bgrule="1" data-melt="28" data-melt-dir="to right" data-melt-top="40"/);
  assert.match(renderArtifact('google-gdn-300x1050', ctx, st(PHOTO), {}), /data-bgrule="1" data-melt="53" data-melt-dir="to bottom"/);
  assert.doesNotMatch(renderArtifact('kakao-bizboard-mo', ctx, st(PHOTO), {}), /data-bgrule/);
});

// ---- 11-09 (3) 시안 대조(_out/figma-1109/compare) 뒤 고친 것 4가지 ----
const flatE = (hex, std = 1) => ({ hex, from: hex, to: hex, flat: true, rough: 0, std, opaque: 1 });
const roughE = (hex, std = 60) => ({ hex, from: hex, to: hex, flat: false, rough: 0.025, std, opaque: 1 });
// 바탕 있는 일러스트(한림 알약 꼴): 위·아래 변 평평, 주인공 상자가 그림 거의 전부(100×80%) — 예전엔 칸 cover 가 「주인공 60% 미만」 이라 bgRuleFitBack 으로 예전 칸(0,400 160×200)에 갔다
const PILLS = { ar: 1.4, px: [1400, 1000], colors: ['#4A4DC0', '#8B92E4'], field: { kind: 'illust', opaque: 1, lum: 0.59, flatEdges: 2, focus: { x: 0.5, y: 0.48, w: 1, h: 0.8, parts: 1, others: [], density: 0.68 }, edges: { top: flatE('#4A4DC2'), bottom: flatE('#4A4DC2'), left: roughE('#93A1C7'), right: roughE('#7E7EC2') } } };
// 그라데이션 바탕 캐릭터(10-15 여우·DN 폰): gradEdge + character
const GE = { flat: true, from: '#93C3FA', to: '#A5CDFB', hex: '#9CC8FA', rough: 0.001, std: 6, opaque: 1 };
const CHAR = { ar: 1, px: [1000, 1000], colors: ['#A3CCFB', '#1579E9'], field: { kind: 'illust', opaque: 1, lum: 0.75, flatEdges: 4, edges: { top: GE, bottom: GE, left: GE, right: GE }, focus: { x: 0.53, y: 0.6, w: 0.7, h: 0.8, parts: 1, others: [] } } };
// 흰 종이 위 RGB 아이소(세아 항만): 변이 「평평」 문턱(std < 15)에 못 미쳐 사진으로 분류, 세 변이 거의 흰색(std 22~32) — 오른변만 그림이 걸침
const paperE = (hex, std) => ({ hex, from: hex, to: hex, flat: false, rough: 0.009, std, opaque: 1 });
const PAPER = { ar: 0.91, px: [1000, 1100], colors: ['#547EBB', '#CBC1B2', '#2F465A'], field: { kind: 'photo', opaque: 1, lum: 0.81, flatEdges: 0, focus: { x: 0.5, y: 0.57, w: 1, h: 0.83, parts: 1, others: [], density: 0.34 }, edges: { top: paperE('#FBFBF4', 22), bottom: paperE('#FCFBF9', 23), left: paperE('#F6F5EC', 32), right: { ...roughE('#B0C1CE', 70), rough: 0.018 } } } };

test('바탕 있는 일러스트(주인공 상자 = 그림 거의 전부)는 채용공고 시안 칸(0,355 160×245 + 위 53% 녹임)을 그대로 쓴다 — 11-02 보일 부분 60% 예외(bgRuleFitBack)는 사진에서 주인공 상자를 잘라야 할 때만', () => {
  const h = renderArtifact('jasoseol-pc-premium-jobpost-pc', ctx, st(PILLS), {}); const t = traceOf(h);
  assert.ok(t.rules.includes('templateMold.bgRule') && !t.rules.includes('templateMold.bgRuleFitBack'), t.rules.join(','));
  assert.match(obj(h), /left:0px;top:355px;width:160px;height:245px;[^"]*\/cover no-repeat;[^"]*linear-gradient\(to bottom,transparent 0%,rgba\(0,0,0,0\.2\) 26\.5%,#000 53%\)/);
  assert.match(obj(h), /data-bgrule="1" data-melt="53" data-melt-dir="to bottom"/);
  // 사진 + 주인공 상자(세로 긴 사진을 가로 열에)는 예전대로 fitBack — desk-16 재현은 cover-fit.test
  const tall = { ar: 0.67, px: [670, 1000], colors: ['#113F9E'], field: { kind: 'photo', opaque: 1, lum: 0.28, flatEdges: 0, focus: { x: 0.47, y: 0.41, w: 0.85, h: 0.82, parts: 2, others: [] }, edges: { top: roughE('#2A3A5A', 18), bottom: roughE('#1A2A4A', 8), left: roughE('#2A3A5A', 20), right: roughE('#2A3A5A', 18) } } };
  assert.ok(traceOf(renderArtifact('jasoseol-m-premium-popup-mo', ctx, st(tall), {})).rules.includes('templateMold.bgRuleFitBack'));
});

test('그라데이션 바탕 캐릭터도 bgRule 틀(PC팝업·M팝업·리멤버 자동)에서는 시안 칸 cover + 짧은 녹임 — 10-15 contain 은 bgRule 없는 틀(mold.bgRule:false)에만', () => {
  for (const id of ['jasoseol-pc-premium-popup-pc', 'jasoseol-m-premium-popup-mo', 'remember-main-top-pc']) {
    const h = renderArtifact(id, ctx, st(CHAR), {}); const t = traceOf(h);
    assert.ok(t.rules.includes('templateMold.bgRule') && !t.rules.includes('templateMold.containGrad'), id + ' ' + t.rules.join(','));
    assert.match(obj(h), /\/cover no-repeat;/); assert.doesNotMatch(obj(h), /contain no-repeat|data-cut-melt=/);
  }
  const pp = obj(renderArtifact('jasoseol-pc-premium-popup-pc', ctx, st(CHAR), {}));
  assert.match(pp, /left:245px;top:181px;width:305px;height:219px;/); assert.match(pp, /data-bgrule="1" data-melt="28" data-melt-dir="to right" data-melt-top="40"/);
});

test('흰/밝은 단색 바탕 RGB 그림(사진으로 분류, 세 변이 거의 흰색): 지면 = 그 바탕색(kv-edge 단색) + 어두운 글자, 시안 칸 cover, 후광·cutFade 없음 — 자소설 M팝업·네이버 DA·리멤버', async () => {
  const { resolveField, flatLightBg } = await import('../core/field.js');
  assert.ok(flatLightBg(PAPER.field)); assert.ok(!flatLightBg(PHOTO.field)); assert.ok(!flatLightBg(CUT.field));
  const f = resolveField(st(PAPER));
  assert.equal(f.source, 'kv-edge'); assert.deepEqual(f.stops, ['#F6F5EC']); assert.equal(f.text.toUpperCase(), '#000000');
  const mo = renderArtifact('jasoseol-m-premium-popup-mo', ctx, st(PAPER), {}); const t = traceOf(mo);
  assert.equal(t.field.source, 'kv-edge'); assert.ok(t.rules.includes('templateMold.bgRule') && !t.rules.includes('templateMold.bgRuleFitBack'), t.rules.join(','));
  assert.match(obj(mo), /left:0px;top:523px;width:600px;height:357px;[^"]*\/cover no-repeat;/); assert.doesNotMatch(obj(mo), /data-cut-melt=|data-kv-fit=/);
  for (const id of ['naver-gfa-mobile-da-1250x560', 'remember-main-top-mo', 'jobda-main-pc']) {
    const h = renderArtifact(id, ctx, st(PAPER), {}); assert.equal(traceOf(h).field.source, 'kv-edge', id); assert.match(h, /data-field-source="kv-edge"/);
  }
});

test('사람이 편집기에서 정한 그라데이션(manual-gradient 각도·정지점)은 bgRule 이 덮지 않는다 — 자동 지면(kv·palette)일 때만 규칙 각도', () => {
  const G = { type: 'linear', angle: 225, stops: [{ color: '#2D2F5F', pos: 0 }, { color: '#0D0E2C', pos: 100 }] };
  for (const [id, kv] of [['jasoseol-pc-premium-popup-pc', PHOTO], ['jasoseol-pc-premium-popup-pc', CUT], ['kakao-display-pc-promo', PHOTO], ['jasoseol-pc-standard-main-pc', PHOTO]]) {
    const man = normalizeStyle({ colors: ['#3B73C6'], keyVisual: PNG, kvMeta: kv, background: { mode: 'gradient', gradient: G } });
    const t = traceOf(renderArtifact(id, ctx, man, {}));
    assert.equal(t.field.source, 'manual-gradient', id); assert.equal(t.field.angle, 225, id); assert.ok(!t.rules.includes('templateMold.bgRuleGrad'), id + ' ' + t.rules.join(','));
  }
  // 사람이 색 자리만 고친 팔레트(palette-manual)는 자동 — 규칙 각도(PC팝업 이미지 315°)
  const pal = normalizeStyle({ colors: ['#3B73C6', '#1D3860'], colorsManual: true, keyVisual: PNG, kvMeta: PHOTO });
  const tp = traceOf(renderArtifact('jasoseol-pc-premium-popup-pc', ctx, pal, {}));
  if (tp.field.gradient) { assert.equal(tp.field.angle, 315); assert.ok(tp.rules.includes('templateMold.bgRuleGrad')); }
});

test('검수기(adcheck): bgRule 칸(data-bgrule)은 시안 녹임 길이(27%)를 CANON.melt 자로 재지 않는다 — 같은 칸에 표식이 없으면 short-melt', async () => {
  const { checkAdDoc } = await import('../core/adcheck.js');
  const rect = (x, y, w, h) => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h });
  const mkEl = (attrs, r, style) => ({ attrs, r, style, getBoundingClientRect: () => rect(r.x, r.y, r.w, r.h), hasAttribute: k => k in attrs, getAttribute: k => attrs[k] ?? null, querySelectorAll: () => [], querySelector: () => null, getClientRects: () => [r], naturalHeight: 0 });
  const run = withFlag => {
    const o = mkEl(withFlag ? { 'data-object': '1', 'data-bgrule': '1' } : { 'data-object': '1' }, { x: 0, y: 0, w: 350, h: 280 }, { maskImage: 'linear-gradient(to left, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.2) 12.4%, rgb(0, 0, 0) 27%)', webkitMaskImage: 'none', borderTopLeftRadius: '0px', backgroundSize: 'cover', backgroundPosition: '50% 50%' });
    const root = mkEl({ 'data-ad': '1', 'data-kv-use': 'part' }, { x: 0, y: 0, w: 1200, h: 280 }, { backgroundColor: 'rgb(59, 115, 198)', backgroundImage: 'none' });
    root.querySelectorAll = sel => sel === '[data-object]' ? [o] : [];
    const doc = { querySelector: sel => sel === '[data-ad]' ? root : null, createTreeWalker: () => ({ nextNode: () => null }) };
    const prev = globalThis.getComputedStyle, prevNF = globalThis.NodeFilter;
    globalThis.getComputedStyle = el => el.style; globalThis.NodeFilter = { SHOW_TEXT: 4 };
    try { return checkAdDoc(doc, { kvMeta: { ar: 1.5, field: { kind: 'photo', opaque: 1, edges: { right: { hex: '#F2E6D0' } }, focus: { x: 0.5, y: 0.5, w: 0.4, h: 0.5 } } } }); }
    finally { globalThis.getComputedStyle = prev; globalThis.NodeFilter = prevNF; }
  };
  assert.ok(run(false).warnings.some(w => w.code === 'short-melt'), '표식 없는 칸은 예전대로 경고');
  assert.ok(!run(true).warnings.some(w => w.code === 'short-melt'), 'bgRule 칸은 제외');
});
