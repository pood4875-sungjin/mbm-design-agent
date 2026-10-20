// 종합 품질 점수표 루프(10-20, scripts/quality-audit.mjs) 회귀 — 측정 없이 trace·문자열로 고정할 수 있는 것
//   ① 틀 contain 그림을 지면 변 쪽으로 붙임(mold-contain-edge-align) ② 틀 메인이 줄 수를 넘으면 어절 단위로 재서 줄이거나 짧은 후보(mold-main-fit)
//   ③ 틀 글자 칸이 오른쪽 그림 열 밑으로 들어가면 그림 앞에서 멈춤(mold-text-stop-at-image) ④ 틀 칸 cover 는 머리를 지키는 coverPos(mold-cover-keep-head)
//   ⑤ 밝기 판정이 갈리는 그라데이션 지면은 색 쪽 단색(field-mixed-lightness-solid) ⑥ 여백 판정 공용 모듈(kv-gap) ⑦ 가이드 규칙의 틀 예외(weights·tracking·melt.curve)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { textWidth } from '../core/renderers/banner.js';
import { coverPos, resolveField } from '../core/field.js';
import { WHITE } from '../core/palette.js';
import { evaluate, RULES } from '../core/guidecheck.js';
import { judgeGap } from '../scripts/lib/kv-gap.mjs';

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const un = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const traceOf = html => JSON.parse(un(html.match(/data-trace="([^"]*)"/)[1]));
const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
const edge = (hex, flat = true, from = hex, to = hex) => ({ hex, from, to, flat, rough: flat ? 0.004 : 0.02, std: flat ? 10 : 40, opaque: 1 });
// 그라데이션 바탕 일러스트(gradEdge) — 틀 그림 칸에서 contain 으로 들어가는 유형
const E = { flat: true, from: '#6A4FE0', to: '#9B82F2', hex: '#8268E9' };
const GRAD = { ar: 1, px: [1000, 1000], field: { kind: 'illust', opaque: 1, flatEdges: 4, edges: { top: E, bottom: E, left: E, right: E }, focus: { x: 0.5, y: 0.55, w: 0.7, h: 0.8 } } };
// 바탕 있는 사진(주인공 상자가 위쪽에 큼) — 칸 cover 에서 머리가 잘리기 쉬운 꼴
const PHOTO = { ar: 1.5, px: [1500, 1000], colors: ['#A87045', '#95C7EB'], field: { kind: 'photo', opaque: 1, lum: 0.49, sat: 0.3, flatEdges: 0, focus: { x: 0.5, y: 0.3, w: 0.6, h: 0.5, parts: 1, others: [] }, edges: { top: edge('#A26C42', false), bottom: edge('#9F957C', false), left: edge('#815734', false), right: edge('#CF9C6B', false) } } };
const styleOf = (kv, primary = '#1428A0') => normalizeStyle({ colors: [primary], keyVisual: PNG, kvMeta: kv });
// ad.js 틀 분기와 같은 어절 단위 줄 수 어림(word-break:keep-all)
const wrapRows = (t, px, width) => String(t).split('\n').reduce((n, line) => { let rows = 1, cur = 0; for (const wd of line.split(/\s+/).filter(Boolean)) { const ww = textWidth(wd) * px; if (cur > 0 && cur + 0.35 * px + ww > width) { rows++; cur = ww; } else cur = cur > 0 ? cur + 0.35 * px + ww : ww; if (ww > width) rows += Math.ceil(ww / width) - 1; } return n + rows; }, 0);

test('① 틀 contain 그림(gradEdge)은 칸이 닿는 지면 변 쪽으로 붙고 그 변은 녹이지 않는다 — 리멤버 오른쪽 열은 오른쪽 변에, 자소설 M팝업 하단 띠는 가운데 + 양옆 녹임', () => {
  const st = styleOf(GRAD, '#6D5CF5');
  const html = renderAd(ctx, st, specs['remember-main-top-pc']); const tr = traceOf(html);
  assert.equal(tr.mode, 'templateMold');
  assert.ok(tr.rules.includes('templateMold.containGrad') && tr.rules.includes('templateMold.containEdge'), tr.rules.join(','));
  const m = html.match(/data-object="1" style="position:absolute;left:(-?[\d.]+)px;top:(-?[\d.]+)px;width:([\d.]+)px;height:([\d.]+)px;background:url\([^)]*\) center bottom\/contain no-repeat;[^"]*" data-melt="([\d.]+)" data-melt-dir="sides" data-melt-right="([\d.]+)"/);
  assert.ok(m, 'contain 상자');
  const P = tr.place.tImage;
  assert.equal(Math.round(+m[1] + +m[3]), P.x + P.w, '오른쪽 열: 상자 오른변 = 칸 오른변 = 지면 오른변');
  assert.equal(Math.round(+m[3]), Math.min(P.w, P.h), '상자 = contain 그림 사각형(정사각 그림이면 칸 높이만큼)');
  assert.equal(+m[6], 0, '지면 변 쪽(오른쪽)은 안 녹인다'); assert.ok(+m[5] > 0, '글자 쪽(왼쪽)은 녹인다');
  const band = renderAd(ctx, st, specs['jasoseol-m-premium-popup-mo']); const tb = traceOf(band);
  assert.ok(tb.rules.includes('templateMold.containGrad') && !tb.rules.includes('templateMold.containEdge'), '양쪽 다 닿는 하단 띠는 가운데');
  assert.match(band, /data-melt="[1-9][\d.]*" data-melt-dir="sides" data-melt-right="[1-9][\d.]*"/);
});

test('② 틀 메인은 어절 단위로 줄 수를 재서 틀 줄 수 안에 넣는다 — 긴 회사명(한국산업단지공단)이 리멤버 채용공고 상단 모바일 2줄 칸에서 셋째 줄로 잘리지 않는다', () => {
  const long = createContext({ client: '한국산업단지공단', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울', deadline: '2026-10-31' }, 'recruit');
  for (const id of ['remember-job-top-mo', 'kakao-display-pc-promo']) {
    const tr = traceOf(renderAd(long, styleOf(PHOTO), specs[id]));
    const r = tr.mold.rows.main; const lines = tr.mold.rows.main.lines ?? 2;
    assert.ok(wrapRows(r.text, r.px, r.w) <= lines, `${id}: 「${r.text}」 ${r.px}px / ${r.w}px → ${wrapRows(r.text, r.px, r.w)}줄 > ${lines}`);
    assert.ok(r.px >= Math.round(specs[id].rules.safeArea.measuredFromTemplate.mold.rows.main.px * 0.85) - 1, `${id}: 글자는 규정 매체 바닥(.85)까지만 줄인다`);
    assert.ok(tr.mainN <= lines || (tr.mold.mainN ?? lines) <= lines);
  }
});

test('③ 틀 글자 칸이 오른쪽 그림 열 밑으로 들어가면 글자 줄은 그림 칸 앞 8px 에서 접는다(잡다 MO) — 겹치지 않는 틀(잡다 PC)은 그대로', () => {
  const mo = renderAd(ctx, styleOf(PHOTO), specs['jobda-main-mo']); const tm = traceOf(mo);
  const img = tm.place.tImage; const col = mo.match(/data-text-col="1" style="position:absolute;left:([\d.]+)px;top:[\d.]+px;width:([\d.]+)px/);
  assert.ok(tm.rules.includes('templateMold.textStopAtImage'), tm.rules.join(','));
  assert.equal(+col[1] + +col[2], img.x - 8, '글자 칸 오른변 = 그림 칸 − 8');
  const pc = renderAd(ctx, styleOf(PHOTO), specs['jobda-main-pc']); const tp = traceOf(pc);
  assert.ok(!tp.rules.includes('templateMold.textStopAtImage'));
  assert.match(pc, /data-text-col="1" style="position:absolute;left:50px;top:[\d.]+px;width:480px/);
});

test('④ 틀 모서리 칸 cover 는 주인공 머리를 지키는 coverPos 위치 — 주인공 상자(≈그림 전체)가 칸보다 높으면 가운데(kvPos 52%)가 윗변을 자르던 것을 머리 위 숨 4% 로(midas-bridge-icons × 자소설 PC팝업 칸 249×183)', () => {
  // midas-bridge-icons meta.json 요약(어두운 바탕 3D 아이콘, 세로 0.886, 주인공 상자 폭 1·높이 .93 — 칸 cover 에서 윗변 14%·아랫변 16% 잘림이 점수표 ① character.head 155건의 전형)
  const ICONS = { ar: 0.8856624319419237, px: [1952, 2204], colors: ['#17132B', '#C8C8D8'], field: { kind: 'illust', opaque: 1, flatEdges: 1, lum: 0.32, sat: 0.38, focus: { x: 0.5, y: 0.52, w: 1, h: 0.93, parts: 1, others: [], density: 0.56 },
    edges: { top: edge('#17132B', true, '#141027', '#19152F'), bottom: edge('#282545', false, '#2F2C4F', '#221E3A'), left: edge('#434162', false, '#231F3C', '#636289'), right: edge('#403E60', false, '#4D4C6E', '#333152') } } };
  const st = styleOf(ICONS, '#1428A0');
  const html = renderAd(ctx, st, specs['jasoseol-pc-premium-popup-pc']); const tr = traceOf(html);
  assert.ok(tr.rules.includes('templateMold.slotCover'), tr.rules.join(','));
  const T = tr.place.tImage; const want = coverPos(st, T.w, T.h, { fallback: '50% 52%', headroom: 0.04 }).pos;
  assert.notEqual(want, '50% 52%', 'coverPos 가 머리를 지키려 위치를 바꾼다(px 오프셋)');
  const esc = s => s.replace(/[.*+?^${}()|[\]\\%-]/g, '\\$&');
  assert.match(html, new RegExp(`data-object="1" style="position:absolute;left:${T.x}px;top:${T.y}px;width:${T.w}px;height:${T.h}px;background:url\\([^)]*\\) ${esc(want)}/cover`), `칸 cover 위치 ${want}`);
});

test('⑤ 한 끝은 색 지면·한 끝은 파스텔인 그라데이션 지면(연보라 #9CA1FE→#C4D3FE)은 흰 글자가 1.5:1 까지 떨어진다 — 색 쪽 끝 단색으로 접고 흰 글자, deviation mixed-lightness', () => {
  const LAV = { ar: 1.5, px: [1500, 1000], colors: ['#9CA1FE', '#C4D3FE'], field: { kind: 'illust', opaque: 1, lum: 0.6, sat: 0.6, flatEdges: 4, edges: { top: edge('#9CA1FE', true, '#9CA1FE', '#9CA1FE'), bottom: edge('#C4D3FE', true, '#C4D3FE', '#C4D3FE'), left: edge('#AEB8FE', true, '#9CA1FE', '#C4D3FE'), right: edge('#AEB8FE', true, '#9CA1FE', '#C4D3FE') } } };
  const f = resolveField(styleOf(LAV, '#1428A0'));
  assert.equal(f.source, 'kv-edge');
  assert.equal(f.stops.length, 1, '단색으로 접힘: ' + f.stops.join('→'));
  assert.equal(f.stops[0].toUpperCase(), '#9CA1FE', '색 쪽(어두운) 끝');
  assert.equal(f.text, WHITE); assert.equal(f.deviation, 'mixed-lightness');
  // 두 끝 다 파스텔이면 검정 그라데이션 그대로(접지 않는다)
  const PASTEL = { ...LAV, field: { ...LAV.field, edges: { top: edge('#E2DEFD'), bottom: edge('#F0EFFE'), left: edge('#E9E6FE', true, '#E2DEFD', '#F0EFFE'), right: edge('#E9E6FE', true, '#E2DEFD', '#F0EFFE') } } };
  const g = resolveField(styleOf(PASTEL));
  assert.notEqual(g.text, WHITE); assert.ok(!g.deviation);
});

test('⑥ 여백 판정(kv-gap): 지면 변에서 2px 초과 ~ 12% 이하 틈은 ✗, 좌우 같은 여백으로 가운데 놓인 템플릿 칸(자소설 달력 11/11)은 ✓ 대칭', () => {
  const base = { w: 350, h: 220, kvUse: 'part', logoOnly: null, trace: { mode: 'templateMold', rules: [], tImage: null } };
  const sym = judgeGap({ ...base, objs: [{ x: 11, y: 60, w: 328, h: 160, size: 'contain', pos: '50% 100%', hasBg: true, visible: true }] }, { rules: {} }, [328, 160]);
  assert.equal(sym.verdict, '✓'); assert.match(sym.why, /가운데 칸 가운데 대칭/);
  const bad = judgeGap({ ...base, w: 1250, h: 560, objs: [{ x: 553, y: 262, w: 444, h: 278, size: 'contain', pos: '50% 100%', hasBg: true, visible: true }] }, { rules: {} }, [444, 278]);
  assert.equal(bad.verdict, '✗'); assert.deepEqual(bad.bad, ['아래 20px']); assert.equal(bad.why, '칸이 변에서 떨어짐');
  const touch = judgeGap({ ...base, w: 2240, h: 360, objs: [{ x: 1880, y: 0, w: 360, h: 360, size: 'contain', pos: '50% 100%', hasBg: true, visible: true }] }, { rules: {} }, [360, 360]);
  assert.equal(touch.verdict, '✓'); assert.equal(touch.why, '붙음');
});

test('⑦ 가이드 규칙의 틀 예외 — 틀(templateMold)은 굵기를 템플릿 실측(trace.fonts)과 비교하고 자간·위계·보드 가이드 px 규칙은 건너뛴다 · px 마스크(cutFade)는 녹임 마디를 세지 않는다', () => {
  const texts = [{ role: 'main', fs: 48, fw: '600', ls: 0, ink: { x: 48, y: 60, w: 400, h: 110 }, color: 'rgb(255, 255, 255)', colorHex: '#FFFFFF', contrastField: 9 }];
  const C = { spec: { id: 'remember-main-top-pc', w: 2240, h: 360, shape: 'wide', medium: 'remember' }, guide: { tracking: { main: -0.025, mainMinPx: 28 }, weights: { main: 700 }, melt: { stops: 7 }, detailPx: { min: 13, max: 15 }, textColour: 'brand' }, mr: {}, rules: {}, meta: { ar: 1 }, kt: null, logoMeta: null, primary: '#1428A0', kind: 'recruit', hasDate: true,
    trace: { mode: 'templateMold', rules: ['templateMold'], fonts: { main: { px: 48, weight: 600, lh: 1.65, tracking: -0.025, lines: 1 }, sub: null, detail: null }, text: { mainFg: '#FFFFFF' }, field: { source: 'kv-edge', stops: ['#17132B'], text: '#FFFFFF' }, place: { mode: 'mold', objectSide: 'template' }, gate: { template: true } },
    m: { texts, objects: [{ box: { x: 1088, y: 0, w: 1152, h: 360 }, mask: { dir: 'to right', pct: 0, stops: 0 } }], check: { warnings: [], metrics: {} }, ad: {} } };
  const rows = evaluate(C, RULES); const row = id => rows.find(r => r.id === id);
  assert.equal(row('weights').ok, true, '틀 600 = 템플릿 실측 600 ✓ (CANON 700 아님): ' + row('weights').actual);
  assert.equal(row('tracking'), undefined, '틀은 자간 규칙 밖');
  assert.equal(row('hierarchy'), undefined); assert.equal(row('guide.detailPx'), undefined);
  assert.equal(row('melt.curve'), undefined, 'px 마스크(cutFade)만 있으면 녹임 곡선 규칙 밖');
  // 틀이 아니면 예전대로 CANON 700 과 비교해 ✗
  const free = { ...C, trace: { ...C.trace, mode: null, rules: [], place: { mode: 'column', objectSide: 'right' }, gate: {} } };
  assert.equal(evaluate(free, RULES).find(r => r.id === 'weights').ok, false);
});
