// 하이브리드(A+AI) — AI 는 「그림 판단」만, 그리기는 규칙. 캠페인당 호출 1회.
//   AI 가 정하는 것: 키비주얼 유형·주인공 상자·지켜야 할 요소·잘라도 되는 변·분위기 색, 그리고 모양 묶음(wide·tall·square·tower·strip)마다
//   crop(원본 픽셀)·키비주얼 자리·크기·글자 정렬·세로 위치·배경 방식·그라데이션·스크림 — 전부 기존 프리셋(core/editlayout.js PRESETS) 값 중에서.
//   규칙이 하는 것: 문구·타이포·로고 크기·검수 — 그대로(core/renderers/ad.js).
//   이 파일은 순수(스키마·검증·프롬프트·적용 계산). 호출은 server/design.js analyzeKv, 그리기는 app/hybrid.js(브라우저) · scripts/ab-run.mjs(헤드리스).

import { PRESETS } from '../editlayout.js';
import { shapeOf } from '../layouts.js';
import { kvTypeChoices } from '../kvtypes.js';

export const SHAPES = ['wide', 'tall', 'square', 'tower', 'strip'];
export const SHAPE_LABEL = { wide: '가로형(비율 ≥ 1.8)', tall: '세로형(1.2~2.5)', square: '정사각(0.8~1.2)', tower: '세로 띠(≥ 2.5)', strip: '가로 띠(높이 < 120px)' };
const TYPE_IDS = kvTypeChoices().flatMap(t => [t.id, ...t.subs.map(s => s.id)]);
const choice = key => ({ type: 'string', enum: Object.keys(PRESETS[key].choices) });
const NUM = { type: 'number' }, STR = { type: 'string' };
const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties });
const box = obj({ x: NUM, y: NUM, w: NUM, h: NUM });

export const ANALYSIS_SCHEMA = obj({
  kv: obj({
    type: { type: 'string', enum: TYPE_IDS },
    subject: box,                                      // 주인공 상자 — 원본 픽셀(왼쪽 위 기준)
    keep: { type: 'array', items: obj({ x: NUM, y: NUM, w: NUM, h: NUM, label: STR }) },   // 반드시 보존(로고 마크·제품·얼굴…)
    cutSafe: obj({ top: NUM, right: NUM, bottom: NUM, left: NUM }),   // 각 변에서 잘라도 되는 몫(0~0.5, 원본 비율)
    mood: obj({ tone: { type: 'string', enum: ['light', 'dark'] }, colors: { type: 'array', items: STR } }),
    note: STR,
  }),
  // 모양 묶음 5개 — 배열(항목 하나에 shape 꼬리표). 묶음마다 객체를 복제하면 API 가 「스키마가 너무 크다」로 거부한다(10-22)
  groups: { type: 'array', items: obj({
    shape: { type: 'string', enum: SHAPES },
    crop: box,                                         // 이 모양에서 보일 부분 — 원본 픽셀
    kvPlace: choice('kvPlace'), kvSize: choice('kvSize'),
    textAlign: choice('textAlign'), textAnchor: choice('textAnchor'),
    bgFill: choice('bgFill'), bgGrad: choice('bgGrad'), scrim: choice('scrim'),
    // 10-22 사용자 「배경은 규칙 말고 AI 가 직접」: 지면 색 1~3개(#RRGGBB)·각도·글자 톤·녹임 길이. colors 가 비면 규칙(bgFill 프리셋)이 정한다
    field: obj({ colors: { type: 'array', items: STR }, angle: NUM, text: { type: 'string', enum: ['auto', 'light', 'dark'] }, melt: NUM }),
    // 10-22 사용자 「비중 정해 놓고 규칙대로 하는 느낌 — AI 가 직접」: 그림 상자(캔버스 몫 0~1, 지면 밖으로 흘려도 됨)·녹일 변(그림 상자 몫 0~0.6). w 가 0 이면 규칙 자리
    kvBox: box,
    fade: obj({ left: NUM, right: NUM, top: NUM, bottom: NUM }),
    why: STR,
  }) },
  logo: obj({ kind: { type: 'string', enum: ['wordmark', 'symbol', 'combo', 'none'] } }),
  rationale: STR,
});

export const ANALYSIS_SYSTEM = `너는 채용 광고 소재 제작의 아트디렉터다. 키비주얼(과 로고)을 보고 「그림을 어떻게 쓸지」만 판단한다. 글자·타이포·로고 크기·검수는 규칙 엔진이 맡는다 — 네가 정하지 않는다.

판단할 것:
1. 키비주얼 유형(주어진 id 중 하나), 주인공 상자(사람이면 얼굴·상반신 포함), 반드시 보존할 요소(제품·로고 마크·얼굴 등), 각 변에서 잘라도 되는 몫, 분위기(밝/어둡 + 색 2~3개).
2. 모양 묶음 5개(wide·tall·square·tower·strip — groups 배열에 shape 마다 한 항목, 빠짐없이 5개): 보일 부분(crop, 원본 픽셀)·키비주얼 자리·크기·글자 정렬·글자 세로 위치·배경 방식·그라데이션·스크림. 값은 주어진 선택지 중에서만. 모르겠으면 auto.
3. 그림 상자(kvBox)를 네가 직접 정한다 — 캔버스 비율(0~1) {x,y,w,h}, 지면 밖으로 흘려도 된다(x<0, x+w>1). 이 모양에서 그림을 얼마나 크게, 어디에 둘지가 핵심 판단이다. 글자 덩어리는 kvPlace 반대쪽(오른쪽 그림이면 왼쪽 약 55%, 아래 그림이면 위쪽)에 놓이고 로고는 위쪽 모서리에 놓인다 — 주인공(얼굴·제품)은 글자 쪽과 위쪽 로고 모서리에 들어가지 않게. 그림 상자가 글자 쪽으로 넘어가도 되지만 그 변은 fade 로 녹여야 한다. fade 는 그림 상자 각 변을 녹이는 길이(상자 폭·높이의 0~0.6, 0 이면 안 녹임) — 글자 쪽을 향한 변은 0.3 이상. 누끼(투명 배경)는 fade 0. 그림을 크게 써서 지면이 비어 보이지 않게 하되, 겹치면 서버가 줄이거나 규칙 자리로 되돌린다. 모르겠으면 kvBox 의 w 를 0 으로.
4. 지면(field)은 네가 직접 정한다 — 그림과 이어지는 색 1~3개(#RRGGBB, 그림의 바탕·가장자리 색에서 고르거나 브랜드색과 섞어서), 그라데이션 각도(두 색 이상일 때), 글자 톤(light=흰 글자·dark=검정 글자·auto), 그림 변을 지면으로 녹이는 길이 melt(그림 폭의 0.3~0.75, 0이면 규칙). 그림 바탕이 그라데이션이면 그 그라데이션을 그대로 연장하는 색을 고른다. 글자가 읽혀야 하니 글자 쪽 끝은 글자 톤과 대비가 나는 색으로. colors 를 비우면 배경 방식 프리셋(bgFill)으로 규칙이 정한다.
원칙: 주인공과 보존 요소는 crop 안에. 글자가 놓일 쪽(키비주얼 반대쪽)이 비어 보이지 않게 자리를 정한다. 사진은 글자 쪽에 어두운 부분이 오면 스크림, 누끼는 배경을 그림에 이어 칠하기(kv) 또는 브랜드색. 세로 띠·가로 띠는 글자 공간이 좁으니 키비주얼을 작게 또는 한쪽 끝에. 좌표는 원본 픽셀, 왼쪽 위가 (0,0).`;

export function analysisPrompt({ kvMeta, logoMeta = null, brief = {}, brand = {}, requests = '' } = {}) {
  const [W, H] = kvMeta?.px ?? [0, 0];
  const lines = [];
  lines.push(`## 키비주얼(첫 번째 이미지)`);
  lines.push(`- 원본 ${W}×${H}px · 비율 ${kvMeta?.ar ? kvMeta.ar.toFixed(3) : '?'}${kvMeta?.field?.opaque != null ? ` · 투명 ${kvMeta.field.opaque < 0.5 ? '있음(누끼 가능성)' : '없음'}` : ''}${kvMeta?.colors?.length ? ` · 픽셀 대표색 ${kvMeta.colors.join(' ')}` : ''}`);
  lines.push(`- 유형 id: ${TYPE_IDS.join(', ')}`);
  if (logoMeta) lines.push(`## 로고(두 번째 이미지): 비율 ${logoMeta.ar ? logoMeta.ar.toFixed(2) : '?'} · 톤 ${logoMeta.tone ?? '?'}`); else lines.push(`## 로고: 없음 → logo.kind = none`);
  lines.push(`## 모양 묶음과 선택지`);
  for (const s of SHAPES) lines.push(`- ${s}: ${SHAPE_LABEL[s]}`);
  for (const k of ['kvPlace', 'kvSize', 'textAlign', 'textAnchor', 'bgFill', 'bgGrad', 'scrim']) lines.push(`- ${k}(${PRESETS[k].label}): ${Object.entries(PRESETS[k].choices).map(([v, l]) => `${v}=${l}`).join(' · ')}`);
  lines.push(`## 캠페인`);
  lines.push(`- 고객사 ${brief.client ?? '?'} · ${brief.hiringType ?? ''} · 메인 문구 2줄 + 접수 기간 1줄(+ 직무) 이 글자 쪽에 놓인다`);
  lines.push(`- 브랜드 색 ${[brand.primary, brand.accent].filter(Boolean).join(' ') || '없음'}`);
  lines.push(`- 고객사 요구: ${requests?.trim() || '없음'}`);
  lines.push(`위를 보고 JSON 으로 답하라. rationale 은 한국어 두 문장.`);
  return lines.join('\n');
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v)) ? v : d;
const HEX = /^#[0-9A-Fa-f]{6}$/;
const r3 = v => Math.round(v * 1000) / 1000;

// 픽셀 상자 → 비율 상자(왼쪽 위 기준). 값이 전부 ≤ 1 이면 이미 비율로 본다
function fracBox(b, W, H) {
  if (!b) return null;
  const px = ['x', 'y', 'w', 'h'].some(k => num(b[k]) > 1);
  const o = px ? { x: num(b.x) / W, y: num(b.y) / H, w: num(b.w, W) / W, h: num(b.h, H) / H } : { x: num(b.x), y: num(b.y), w: num(b.w, 1), h: num(b.h, 1) };
  o.x = clamp(o.x, 0, 0.98); o.y = clamp(o.y, 0, 0.98); o.w = clamp(o.w, 0.02, 1 - o.x); o.h = clamp(o.h, 0.02, 1 - o.y);
  return { x: r3(o.x), y: r3(o.y), w: r3(o.w), h: r3(o.h) };
}
const union = (a, b) => { if (!a) return b; if (!b) return a; const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }; };
const contains = (c, b) => c.x <= b.x + 1e-6 && c.y <= b.y + 1e-6 && c.x + c.w >= b.x + b.w - 1e-6 && c.y + c.h >= b.y + b.h - 1e-6;

// 검증·정리 — 돌려주는 것: { analysis(비율 상자·프리셋 값), fixes[] }
export function validateAnalysis(raw, { kvMeta, hasLogo = false } = {}) {
  const fixes = [], [W, H] = kvMeta?.px ?? [1, 1];
  const A = structuredClone(raw ?? {});
  const kv = A.kv ?? (A.kv = {});
  if (!TYPE_IDS.includes(kv.type)) { fixes.push(`유형 「${kv.type}」 모름 → 자동`); kv.type = null; }
  kv.subject = fracBox(kv.subject, W, H) ?? { x: 0.15, y: 0.1, w: 0.7, h: 0.8 };
  kv.keep = (Array.isArray(kv.keep) ? kv.keep : []).slice(0, 6).map(k => ({ ...fracBox(k, W, H), label: String(k.label ?? '').slice(0, 40) }));
  const cs = kv.cutSafe ?? {}; kv.cutSafe = Object.fromEntries(['top', 'right', 'bottom', 'left'].map(k => [k, r3(clamp(num(cs[k]), 0, 0.5))]));
  const mood = kv.mood ?? {}; kv.mood = { tone: mood.tone === 'dark' ? 'dark' : 'light', colors: (Array.isArray(mood.colors) ? mood.colors : []).filter(c => HEX.test(c)).map(c => c.toUpperCase()).slice(0, 3) };
  kv.note = String(kv.note ?? '').slice(0, 300);
  // 반드시 보존 = 주인공 ∪ keep
  const must = kv.keep.reduce((u, k) => union(u, k), kv.subject);
  // 배열(shape 꼬리표) → 모양별 맵. 빠진 모양은 가장 가까운 것(없으면 빈 것)을 복사
  const list = Array.isArray(A.groups) ? A.groups : Object.entries(A.groups ?? {}).map(([shape, g]) => ({ ...g, shape }));
  const map = {}; for (const g of list) if (g && SHAPES.includes(g.shape) && !map[g.shape]) map[g.shape] = g;
  const NEAR = { wide: ['strip', 'square'], tall: ['tower', 'square'], square: ['wide', 'tall'], tower: ['tall', 'square'], strip: ['wide', 'square'] };
  for (const s of SHAPES) if (!map[s]) { const from = NEAR[s].find(n => map[n]); map[s] = from ? { ...structuredClone(map[from]), shape: s } : { shape: s }; fixes.push(`${s} 묶음이 없어 ${from ? from + ' 값을 복사' : '빈 값'}`); }
  A.groups = {};
  for (const s of SHAPES) {
    const g = A.groups[s] = map[s]; delete g.shape;
    let crop = fracBox(g.crop, W, H) ?? { x: 0, y: 0, w: 1, h: 1 };
    if (crop.w < 0.3 || crop.h < 0.3) { fixes.push(`${s}: crop 이 너무 작아(${r3(crop.w)}×${r3(crop.h)}) 원본 전체로`); crop = { x: 0, y: 0, w: 1, h: 1 }; }
    if (!contains(crop, must)) { const u = union(crop, must); crop = { x: r3(u.x), y: r3(u.y), w: r3(u.w), h: r3(u.h) }; fixes.push(`${s}: crop 이 주인공·보존 요소를 잘라 넓힘`); }
    g.crop = crop;
    for (const k of ['kvPlace', 'kvSize', 'textAlign', 'textAnchor', 'bgFill', 'bgGrad', 'scrim']) { if (!PRESETS[k].choices[g[k]]) { if (g[k] != null) fixes.push(`${s}.${k} 「${g[k]}」 선택지에 없음 → auto`); g[k] = 'auto'; } }
    if (g.bgFill === 'custom') { g.bgFill = 'auto'; if (!g.field?.colors?.length) fixes.push(`${s}: 직접 색은 사람만 → auto`); }   // AI 가 지면 색(field)을 직접 줬으면 custom 은 그 뜻 — 조용히 auto
    const fd = g.field ?? {};
    const cols = (Array.isArray(fd.colors) ? fd.colors : []).filter(c => typeof c === 'string' && HEX.test(c)).map(c => c.toUpperCase()).slice(0, 3);
    if (Array.isArray(fd.colors) && fd.colors.length && cols.length !== fd.colors.length) fixes.push(`${s}: 지면 색 중 #RRGGBB 아닌 값 버림`);
    g.field = { colors: cols, angle: r3(clamp(num(fd.angle, 180), 0, 360)), text: ['light', 'dark'].includes(fd.text) ? fd.text : 'auto', melt: fd.melt > 0 ? r3(clamp(num(fd.melt), 0.3, 0.75)) : 0 };
    // 그림 상자 — 캔버스 몫. 너무 작거나(폭·높이 < 0.15) 값이 없으면 규칙 자리(w 0)
    const kb = g.kvBox ?? {};
    let K = { x: num(kb.x), y: num(kb.y), w: num(kb.w), h: num(kb.h) };
    if (K.w > 1.6 || K.h > 1.6 || K.x > 1.6 || K.y > 1.6) { fixes.push(`${s}: 그림 상자가 캔버스 몫(0~1)이 아니라 규칙 자리로`); K = { x: 0, y: 0, w: 0, h: 0 }; }
    if (K.w > 0 && (K.w < 0.15 || K.h < 0.15)) { fixes.push(`${s}: 그림 상자가 너무 작아(${r3(K.w)}×${r3(K.h)}) 규칙 자리로`); K = { x: 0, y: 0, w: 0, h: 0 }; }
    if (K.w > 0) { K.w = clamp(K.w, 0.15, 1.4); K.h = clamp(K.h, 0.15, 1.4); K.x = clamp(K.x, -0.4, 1 - 0.1); K.y = clamp(K.y, -0.4, 1 - 0.1); }
    g.kvBox = { x: r3(K.x), y: r3(K.y), w: r3(K.w), h: r3(K.h) };
    const fa = g.fade ?? {}; const transparentKv = (kvMeta?.field?.opaque ?? 1) < 0.5;
    g.fade = Object.fromEntries(['left', 'right', 'top', 'bottom'].map(k => [k, transparentKv ? 0 : r3(clamp(num(fa[k]), 0, 0.6))]));
    g.why = String(g.why ?? '').slice(0, 200);
  }
  A.logo = { kind: hasLogo ? (['wordmark', 'symbol', 'combo'].includes(A.logo?.kind) ? A.logo.kind : 'combo') : 'none' };
  A.rationale = String(A.rationale ?? '').slice(0, 400);
  return { analysis: A, fixes };
}

// 규격 → 모양 묶음 → 그 묶음의 판단
export function groupFor(analysis, spec) { return analysis?.groups?.[shapeOf(spec.w, spec.h)] ?? null; }
export function shapeOfSpec(spec) { return shapeOf(spec.w, spec.h); }

// 판단 → 렌더러가 읽는 스타일 조각(프리셋 키 + 유형 지정). crop 은 호출자가 그림 사본을 만든 뒤 kvMeta 와 같이 넣는다
export function presetPatch(group, analysis) {
  if (!group) return {};
  const out = {};
  // 글자 정렬·세로 위치(textAlign·textAnchor)는 넘기지 않는다 — 타이포는 규칙(10-22 사용자 「타이포는 규칙」, 구글 300×600 가운데 틀에 왼쪽 정렬이 들어가 글자가 가장자리에 붙었다)
  for (const k of ['kvPlace', 'kvSize', 'bgFill', 'bgGrad', 'scrim']) if (group[k] && group[k] !== 'auto') out[k] = group[k];
  if (analysis?.kv?.type) out.kvTypeOverride = analysis.kv.type;
  // AI 그림 상자 — 렌더러 aiBoxRender 가 규칙 렌더 뒤 그림 층만 바꾸고 겹침·로고 가림을 다시 잰다(넘으면 축소 → 규칙 자리)
  if (group.kvBox?.w > 0) { out.aiKvBox = { ...group.kvBox }; out.aiFade = { ...(group.fade ?? {}) }; }
  // AI 지면(있으면 bgFill/bgGrad 프리셋보다 앞) — 렌더러 규칙이 글자색 대비·녹임 상한을 다시 검사
  const fd = group.field;
  if (fd?.colors?.length) { out.background = { mode: 'auto', color: null, ai: { stops: fd.colors, angle: fd.angle ?? 180, text: fd.text !== 'auto' ? fd.text : null, melt: fd.melt ?? 0 } }; if (fd.text && fd.text !== 'auto') out.textTone = fd.text; }
  else if (fd?.melt) out.background = { mode: 'auto', color: null, ai: { stops: [], angle: 180, text: null, melt: fd.melt } };
  return out;
}

// crop 뒤 좌표계에서의 주인공 상자(중심 기준 — 렌더러 kvMeta.field.focus 형식) · 없으면 null
export function focusInCrop(analysis, crop) {
  const s = analysis?.kv?.subject; if (!s || !crop) return null;
  const x0 = Math.max(s.x, crop.x), y0 = Math.max(s.y, crop.y), x1 = Math.min(s.x + s.w, crop.x + crop.w), y1 = Math.min(s.y + s.h, crop.y + crop.h);
  if (x1 <= x0 || y1 <= y0) return null;
  const w = (x1 - x0) / crop.w, h = (y1 - y0) / crop.h;
  return { x: r3((x0 - crop.x) / crop.w + w / 2), y: r3((y0 - crop.y) / crop.h + h / 2), w: r3(w), h: r3(h), parts: 1, others: [], density: 0.6, source: 'ai' };
}

// 판단을 입힌 kvMeta(사본) — 주인공 상자는 AI, 나머지 측정값은 그대로
export function kvMetaWithAi(kvMeta, analysis, crop = { x: 0, y: 0, w: 1, h: 1 }) {
  if (!kvMeta) return kvMeta;
  const fo = focusInCrop(analysis, crop);
  const field = kvMeta.field ? { ...kvMeta.field, ...(fo ? { focus: fo } : {}) } : kvMeta.field;
  return { ...kvMeta, field, ai: { type: analysis?.kv?.type ?? null, mood: analysis?.kv?.mood ?? null, cutSafe: analysis?.kv?.cutSafe ?? null, crop } };
}

// 산출물 개별 스타일에 aiShape 가 있으면 캠페인 c.ai.groups[aiShape] 의 crop 사본·주인공 kvMeta 를 얹는다(사본은 캠페인에 모양별 5개만 — 산출물마다 복제하지 않는다).
// c.ai 가 없거나(해제) 그 모양이 없으면 그대로 — 프리셋 값은 남아 있어도 그림은 원본
export function resolveAiStyle(campaign, style) {
  const shape = style?.aiShape; if (!shape) return style;
  const g = campaign?.ai?.groups?.[shape]; if (!g?.keyVisual) return style;
  return { ...style, keyVisual: g.keyVisual, kvMeta: g.kvMeta ?? style.kvMeta };
}
