// 하이브리드(A+AI) — AI 는 「그림 판단」만, 그리기는 규칙. 캠페인당 호출 1회.
//   AI 가 정하는 것: 키비주얼 유형·주인공 상자·지켜야 할 요소·잘라도 되는 변·분위기 색, 그리고 모양 묶음(wide·tall·square·tower·strip)마다
//   crop(원본 픽셀)·키비주얼 자리·크기·글자 정렬·세로 위치·배경 방식·그라데이션·스크림 — 전부 기존 프리셋(core/editlayout.js PRESETS) 값 중에서.
//   규칙이 하는 것: 문구·타이포·로고 크기·검수 — 그대로(core/renderers/ad.js).
//   이 파일은 순수(스키마·검증·프롬프트·적용 계산). 호출은 server/design.js analyzeKv, 그리기는 app/hybrid.js(브라우저) · scripts/ab-run.mjs(헤드리스).

import { PRESETS } from '../editlayout.js';
import { shapeOf } from '../layouts.js';
import { kvTypeChoices } from '../kvtypes.js';

export const SHAPES = ['wide', 'tall', 'square', 'tower', 'strip'];
// AI 판단을 안 받는 규격 — 틀 그림 칸이 고정인 매체(자소설·리멤버·잡다·에브리타임·캐치)·비즈보드. 렌더러 aiBoxRender 와 앱 적용·해석이 같은 목록을 쓴다
export const AI_SKIP_MEDIA = new Set(['jasoseol', 'remember', 'jobda', 'everytime', 'catch']);
export const aiEligible = spec => !!spec && !AI_SKIP_MEDIA.has(spec.medium) && !/bizboard/.test(spec.id ?? '');
// 모양 묶음의 대표 캔버스 비율(가로÷세로) — 카카오 1200×600 · 구글 300×600 · 인스타 1080 · 구글 300×1050 · 띠 728×120 급
export const REP_AR = { wide: 2, tall: 0.5, square: 1, tower: 0.29, strip: 6 };
export const SHAPE_LABEL = { wide: '가로형(비율 ≥ 1.8)', tall: '세로형(1.2~2.5)', square: '정사각(0.8~1.2)', tower: '세로 띠(≥ 2.5)', strip: '가로 띠(높이 < 120px)' };
const TYPE_IDS = kvTypeChoices().flatMap(t => [t.id, ...t.subs.map(s => s.id)]);
// 선택지는 enum 대신 문자열 — enum 이 많으면 API 가 「compiled grammar is too large」로 거부한다(10-22 두 번). 값 검사는 validateAnalysis 가 한다
const choice = () => ({ type: 'string' });
const NUM = { type: 'number' }, STR = { type: 'string' };
const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties });
const box = obj({ x: NUM, y: NUM, w: NUM, h: NUM });

export const ANALYSIS_SCHEMA = obj({
  kv: obj({
    type: STR,
    subject: box,                                      // 주인공 상자 — 원본 픽셀(왼쪽 위 기준)
    keep: { type: 'array', items: obj({ x: NUM, y: NUM, w: NUM, h: NUM, label: STR }) },   // 반드시 보존(로고 마크·제품·얼굴…)
    faces: { type: 'array', items: box },               // 10-22 사람·캐릭터 얼굴 상자(원본 픽셀) — 어떤 crop·상자에서도 걸쳐 잘리면 안 된다(통째로 넣거나 통째로 빼거나)
    cutSafe: obj({ top: NUM, right: NUM, bottom: NUM, left: NUM }),   // 각 변에서 잘라도 되는 몫(0~0.5, 원본 비율)
    mood: obj({ tone: STR, colors: { type: 'array', items: STR } }),
    note: STR,
  }),
  // 모양 묶음 5개 — 배열(항목 하나에 shape 꼬리표). 묶음마다 객체를 복제하면 API 가 「스키마가 너무 크다」로 거부한다(10-22)
  groups: { type: 'array', items: obj({
    shape: STR,
    crop: box,                                         // 이 모양에서 보일 부분 — 원본 픽셀
    focus: box,                                        // 10-22 이 모양의 주인공(원본 픽셀) — 좁은 세로형·띠는 장면 전체가 아니라 핵심만(예: 확성기+두 사람)으로 좁혀 크게. 넓은 모양은 전체 주인공
    kvPlace: choice('kvPlace'), kvSize: choice('kvSize'),
    bgFill: choice('bgFill'), scrim: choice('scrim'),   // 글자 정렬·세로 위치는 규칙(10-22), 그라데이션 방향은 field.angle
    // 10-22 사용자 「배경은 규칙 말고 AI 가 직접」: 지면 색 1~3개(#RRGGBB)·각도·글자 톤·녹임 길이. colors 가 비면 규칙(bgFill 프리셋)이 정한다
    field: obj({ colors: { type: 'array', items: STR }, angle: NUM, text: STR, melt: NUM }),
    // 10-22 사용자 「비중 정해 놓고 규칙대로 하는 느낌 — AI 가 직접」: 그림 상자(캔버스 몫 0~1, 지면 밖으로 흘려도 됨)·녹일 변(그림 상자 몫 0~0.6). w 가 0 이면 규칙 자리
    kvBox: box,
    fade: obj({ left: NUM, right: NUM, top: NUM, bottom: NUM }),
    // 10-22 사용자 「클로드가 판단해서 배경 만드는 거 아니었어?」: 배경 그래픽 — 부드러운 원·띠·빛 번짐(캔버스 몫, 지면 밖으로 흘려도 됨). 규칙이 색을 바꾸지 않는다
    shapes: { type: 'array', items: obj({ kind: STR, x: NUM, y: NUM, w: NUM, h: NUM, color: STR, opacity: NUM, blur: NUM }) },
    why: STR,
  }) },
  logo: obj({ kind: STR }),   // wordmark | symbol | combo | none
  rationale: STR,
});

export const ANALYSIS_SYSTEM = `너는 채용 광고 소재 제작의 아트디렉터다. 키비주얼(과 로고)을 보고 「그림을 어떻게 쓸지」만 판단한다. 글자·타이포·로고 크기·검수는 규칙 엔진이 맡는다 — 네가 정하지 않는다.

판단할 것:
1. 키비주얼 유형(주어진 id 중 하나), 주인공 상자(사람이면 얼굴·상반신 포함), 반드시 보존할 요소(제품·로고 마크 등), 사람·캐릭터 얼굴 상자 전부(faces — 머리카락·모자 포함, 원본 픽셀), 각 변에서 잘라도 되는 몫, 분위기(밝/어둡 + 색 2~3개).
2. 모양 묶음 5개(shape 값은 wide·tall·square·tower·strip — groups 배열에 shape 마다 한 항목, 빠짐없이 5개): 보일 부분(crop, 원본 픽셀)·이 모양의 주인공(focus)·키비주얼 자리(kvPlace)·크기(kvSize)·배경 방식(bgFill)·스크림(scrim). 값은 주어진 선택지 문자열 중에서만, 모르겠으면 auto. 글자 정렬은 규칙이 정한다.
3. 그림 상자(kvBox)를 네가 직접 정한다 — 캔버스 비율(0~1) {x,y,w,h}, 지면 밖으로 흘려도 된다(x<0, x+w>1). 이 모양에서 그림을 얼마나 크게, 어디에 둘지가 핵심 판단이다. 글자 덩어리는 kvPlace 반대쪽(오른쪽 그림이면 왼쪽 약 55%, 아래 그림이면 위쪽)에 놓이고 로고는 위쪽 모서리에 놓인다 — 주인공(얼굴·제품)은 글자 쪽과 위쪽 로고 모서리에 들어가지 않게. 그림 상자가 글자 쪽으로 넘어가도 되지만 그 변은 fade 로 녹여야 한다. fade 는 그림 상자 각 변을 녹이는 길이(상자 폭·높이의 0~0.6, 0 이면 안 녹임) — 글자 쪽을 향한 변은 0.3 이상. 누끼(투명 배경)는 fade 0. 그림을 크게 써서 지면이 비어 보이지 않게 하되, 겹치면 서버가 줄이거나 규칙 자리로 되돌린다. 모르겠으면 kvBox 의 w 를 0 으로.
5. 배경 그래픽(shapes)을 모양마다 디자인한다 — 그림에서 뽑은 색으로 부드러운 원(ellipse)·둥근 띠(pill)·사각(rect). 큰 빈 지면이 생기는 모양(정사각·세로형·세로 띠)은 큰 빛 번짐 2~3개(opacity 0.3~0.6, blur 0.12~0.25, 지면의 30~80% 크기)로 지면을 채워 단조롭지 않게, 가로형·가로 띠는 1~2개. 도형 색은 지면보다 확실히 밝거나 어둡게(명도 차 15~25%) — 지면과 거의 같은 색이면 안 보여서 의미가 없다. 좌표는 캔버스 몫(0~1, 지면 밖으로 흘려도 됨), opacity 0.1~0.7, blur 는 캔버스 짧은 변의 몫(0~0.3, 빛 번짐이면 0.1 이상). 목적: 그림의 바탕(하늘·그라데이션·빛)을 지면까지 자연스럽게 이어 지면이 단조롭지 않게, 그림이 지면에 붙어 보이게. 글자 덩어리 뒤는 차분하게(글자 대비를 해치지 않게). 장식을 위한 장식(아이콘·패턴·글자)은 넣지 않는다.
4. 지면(field)은 캠페인 공통 하나다 — 모든 모양에 같은 colors·angle 을 준다(melt 만 모양별). 그림 바탕이 흰색·아주 밝은 색이 아니면 거의 흰 파스텔(밝기 90% 이상)은 쓰지 말고, 그림이나 브랜드에서 뽑은 존재감 있는 중간 톤 이상의 색으로(지면이 비어 보이지 않게 — 실제 광고 디자이너처럼). 네가 직접 정한다 — 그림과 이어지는 색 1~3개(#RRGGBB, 그림의 바탕·가장자리 색에서 고르거나 브랜드색과 섞어서), 그라데이션 각도(두 색 이상일 때), 글자 톤(light=흰 글자·dark=검정 글자·auto), 그림 변을 지면으로 녹이는 길이 melt(그림 폭의 0.3~0.75, 0이면 규칙). 그림 바탕이 그라데이션이면 그 그라데이션을 그대로 연장하는 색을 고른다. 글자가 읽혀야 하니 글자 쪽 끝은 글자 톤과 대비가 나는 색으로. colors 를 비우면 배경 방식 프리셋(bgFill)으로 규칙이 정한다.
원칙: 주인공과 보존 요소는 crop 안에. 모양마다 focus(이 모양의 주인공)를 정한다 — 가로형·정사각은 전체 주인공, 좁은 세로형(tall)·세로 띠(tower)·가로 띠(strip)는 장면 전체를 작게 넣지 말고 핵심만 좁혀(예: 확성기와 두 사람, 인물 한두 명의 상반신, 제품 하나) 크게 쓴다. 얼굴은 어떤 모양에서도 걸쳐 자르지 않는다 — crop 에 넣으면 통째로, 빼면 통째로. 글자가 놓일 쪽(키비주얼 반대쪽)이 비어 보이지 않게 자리를 정한다. 사진은 글자 쪽에 어두운 부분이 오면 스크림, 누끼는 배경을 그림에 이어 칠하기(kv) 또는 브랜드색. 세로 띠·가로 띠는 글자 공간이 좁으니 키비주얼을 작게 또는 한쪽 끝에. 좌표는 원본 픽셀, 왼쪽 위가 (0,0).`;

// structured output(스키마 강제)은 쓰지 않는다 — 판단 칸이 늘 때마다 API 가 「compiled grammar is too large」로 거부(10-22 세 번).
// 대신 프롬프트에 형식(스키마 JSON)을 싣고, 받은 글에서 JSON 을 꺼내 validateAnalysis 가 전부 검사·보정한다
export const ANALYSIS_FORMAT = JSON.stringify(ANALYSIS_SCHEMA);
export function parseAnalysisText(text) {
  let t = String(text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b <= a) throw new Error('응답에 JSON 이 없습니다: ' + t.slice(0, 120));
  return JSON.parse(t.slice(a, b + 1));
}
export function analysisPrompt({ kvMeta, logoMeta = null, brief = {}, brand = {}, requests = '' } = {}) {
  const [W, H] = kvMeta?.px ?? [0, 0];
  const lines = [];
  lines.push(`## 키비주얼(첫 번째 이미지)`);
  lines.push(`- 원본 ${W}×${H}px · 비율 ${kvMeta?.ar ? kvMeta.ar.toFixed(3) : '?'}${kvMeta?.field?.opaque != null ? ` · 투명 ${kvMeta.field.opaque < 0.5 ? '있음(누끼 가능성)' : '없음'}` : ''}${kvMeta?.colors?.length ? ` · 픽셀 대표색 ${kvMeta.colors.join(' ')}` : ''}`);
  lines.push(`- 유형 id: ${TYPE_IDS.join(', ')}`);
  if (logoMeta) lines.push(`## 로고(두 번째 이미지): 비율 ${logoMeta.ar ? logoMeta.ar.toFixed(2) : '?'} · 톤 ${logoMeta.tone ?? '?'}`); else lines.push(`## 로고: 없음 → logo.kind = none`);
  lines.push(`## 모양 묶음과 선택지`);
  for (const s of SHAPES) lines.push(`- ${s}: ${SHAPE_LABEL[s]}`);
  for (const k of ['kvPlace', 'kvSize', 'bgFill', 'scrim']) lines.push(`- ${k}(${PRESETS[k].label}): ${Object.entries(PRESETS[k].choices).map(([v, l]) => `${v}=${l}`).join(' · ')}`);
  lines.push(`## 캠페인`);
  lines.push(`- 고객사 ${brief.client ?? '?'} · ${brief.hiringType ?? ''} · 메인 문구 2줄 + 접수 기간 1줄(+ 직무) 이 글자 쪽에 놓인다`);
  lines.push(`- 브랜드 색 ${[brand.primary, brand.accent].filter(Boolean).join(' ') || '없음'}`);
  lines.push(`- 고객사 요구: ${requests?.trim() || '없음'}`);
  lines.push(`## 답 형식 — 아래 JSON 스키마 모양의 JSON 하나만(설명·코드펜스 없이). 모든 칸을 채운다\n${ANALYSIS_FORMAT}`);
  lines.push(`위를 보고 JSON 으로 답하라. rationale 은 한국어 두 문장. type 은 위 유형 id 중 하나, mood.tone 은 light|dark, field.text 는 auto|light|dark, logo.kind 는 wordmark|symbol|combo|none.`);
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
  // 투명도와 안 맞는 유형은 버린다(측정이 더 정확) — 불투명 그림을 누끼로(10-22 신호등), 투명 그림을 사진·배경 그림으로 보면 렌더러 분기가 틀어진다
  { const op = kvMeta?.field?.opaque; if (kv.type && op != null) { const cut = /^cutout/.test(kv.type); if ((cut && op >= 0.9) || (!cut && op < 0.5)) { fixes.push(`유형 「${kv.type}」 이 그림 투명도(${op})와 안 맞아 → 자동`); kv.type = null; } } }
  kv.subject = fracBox(kv.subject, W, H) ?? { x: 0.15, y: 0.1, w: 0.7, h: 0.8 };
  kv.keep = (Array.isArray(kv.keep) ? kv.keep : []).slice(0, 6).map(k => ({ ...fracBox(k, W, H), label: String(k.label ?? '').slice(0, 40) }));
  const cs = kv.cutSafe ?? {}; kv.cutSafe = Object.fromEntries(['top', 'right', 'bottom', 'left'].map(k => [k, r3(clamp(num(cs[k]), 0, 0.5))]));
  const mood = kv.mood ?? {}; kv.mood = { tone: mood.tone === 'dark' ? 'dark' : 'light', colors: (Array.isArray(mood.colors) ? mood.colors : []).filter(c => HEX.test(c)).map(c => c.toUpperCase()).slice(0, 3) };
  kv.note = String(kv.note ?? '').slice(0, 300);
  // 반드시 보존 = 주인공 ∪ keep
  kv.faces = (Array.isArray(kv.faces) ? kv.faces : []).slice(0, 12).map(f => fracBox(f, W, H)).filter(Boolean).filter(f => f.w * f.h > 0.0004);
  const must = kv.keep.reduce((u, k) => union(u, k), kv.subject);
  const meets = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const NARROW = new Set(['tall', 'tower', 'strip']);
  // 얼굴이 crop 에 걸쳐 있으면 통째로 넣는다(넣었다 뺐다 중 넣기 — 얼굴이 주인공 쪽이니까)
  const faceWhole = c => { let x = c; for (let i = 0; i < 3; i++) { let changed = false; for (const f of kv.faces) if (meets(x, f) && !contains(x, f)) { x = union(x, f); changed = true; } if (!changed) break; } return x; };
  // 배열(shape 꼬리표) → 모양별 맵. 빠진 모양은 가장 가까운 것(없으면 빈 것)을 복사
  const list = Array.isArray(A.groups) ? A.groups : Object.entries(A.groups ?? {}).map(([shape, g]) => ({ ...g, shape }));
  const map = {}; for (const g of list) if (g && SHAPES.includes(g.shape) && !map[g.shape]) map[g.shape] = g;
  const NEAR = { wide: ['strip', 'square'], tall: ['tower', 'square'], square: ['wide', 'tall'], tower: ['tall', 'square'], strip: ['wide', 'square'] };
  for (const s of SHAPES) if (!map[s]) { const from = NEAR[s].find(n => map[n]); map[s] = from ? { ...structuredClone(map[from]), shape: s } : { shape: s }; fixes.push(`${s} 묶음이 없어 ${from ? from + ' 값을 복사' : '빈 값'}`); }
  A.groups = {};
  for (const s of SHAPES) {
    const g = A.groups[s] = map[s]; delete g.shape;
    // 모양별 주인공(focus) — 좁은 모양만 좁힌 주인공을 지킨다(넓은 모양은 전체 주인공 ∪ 보존 요소). 겹치는 얼굴은 통째로 포함
    let fc = fracBox(g.focus, W, H);
    if (!fc || fc.w < 0.05 || fc.h < 0.05) fc = null;
    let mustS = (NARROW.has(s) && fc) ? fc : must;
    for (const f of kv.faces) if (meets(mustS, f)) mustS = union(mustS, f);
    g.focus = fc ? { x: r3(fc.x), y: r3(fc.y), w: r3(fc.w), h: r3(fc.h) } : null;
    let crop = fracBox(g.crop, W, H) ?? { x: 0, y: 0, w: 1, h: 1 };
    if (crop.w < (NARROW.has(s) ? 0.15 : 0.3) || crop.h < (NARROW.has(s) ? 0.15 : 0.3)) { fixes.push(`${s}: crop 이 너무 작아(${r3(crop.w)}×${r3(crop.h)}) 원본 전체로`); crop = { x: 0, y: 0, w: 1, h: 1 }; }
    if (!contains(crop, mustS)) { const u = union(crop, mustS); crop = { x: r3(u.x), y: r3(u.y), w: r3(u.w), h: r3(u.h) }; fixes.push(`${s}: crop 이 주인공·보존 요소를 잘라 넓힘`); }
    g.crop = crop;
    for (const k of ['kvPlace', 'kvSize', 'textAlign', 'textAnchor', 'bgFill', 'bgGrad', 'scrim']) { if (!PRESETS[k].choices[g[k]]) { if (g[k] != null && g[k] !== '') fixes.push(`${s}.${k} 「${g[k]}」 선택지에 없음 → auto`); g[k] = 'auto'; } }
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
    // 보일 부분(crop)과 그림 상자의 비율 맞추기(10-22 GS 300×600: 세로형에 가로로 넓은 아래 58% 만 잘라 정사각 상자에 cover → 사람 잘림·하늘 빠져 가운데가 빔).
    //   모양의 대표 캔버스 비율로 상자 px 비율을 어림하고, crop 을 원본 안에서 넓혀(주인공·보존 요소는 그대로 안에) 맞춘다. 원본 끝에 닿아 못 넓히면 상자를 crop 비율에 맞춘다(글자 반대쪽 변 고정)
    if (g.kvBox.w > 0 && W > 1 && H > 1) {
      const boxAR = (g.kvBox.w / g.kvBox.h) * REP_AR[s], c0 = g.crop, cropAR = (c0.w * W) / (c0.h * H);
      if (Math.abs(Math.log(cropAR / boxAR)) > Math.log(1.15)) {
        let c = { ...c0 };
        if (cropAR > boxAR) { const nh = Math.min(1, (c.w * W / boxAR) / H); const cy = c.y + c.h / 2; c.h = nh; c.y = clamp(cy - nh / 2, 0, 1 - nh); }
        else { const nw = Math.min(1, (c.h * H * boxAR) / W); const cx = c.x + c.w / 2; c.w = nw; c.x = clamp(cx - nw / 2, 0, 1 - nw); }
        if (!contains(c, mustS)) { const u = union(c, mustS); c = { x: u.x, y: u.y, w: u.w, h: u.h }; }
        // ② 넓히기로 모자라면 주인공·보존 요소 폭(높이)까지 좁힌다
        { const a1 = (c.w * W) / (c.h * H);
          if (a1 > boxAR * 1.15) { const nw = Math.max(mustS.w, (c.h * H * boxAR) / W); const mx = mustS.x + mustS.w / 2; c.w = Math.min(c.w, nw); c.x = clamp(mx - c.w / 2, Math.max(0, mustS.x + mustS.w - c.w), Math.min(1 - c.w, mustS.x)); }
          else if (a1 < boxAR / 1.15) { const nh = Math.max(mustS.h, (c.w * W / boxAR) / H); const my = mustS.y + mustS.h / 2; c.h = Math.min(c.h, nh); c.y = clamp(my - c.h / 2, Math.max(0, mustS.y + mustS.h - c.h), Math.min(1 - c.h, mustS.y)); } }
        c = { x: r3(c.x), y: r3(c.y), w: r3(c.w), h: r3(c.h) };
        const ar2 = (c.w * W) / (c.h * H);
        if (Math.abs(Math.log(ar2 / boxAR)) > Math.log(1.15)) {   // 원본 끝 — 상자를 그림 비율에 맞춘다(넓은 그림이면 높이를, 좁은 그림이면 폭을 줄임; 글자 쪽 변을 움직인다)
          const kb2 = { ...g.kvBox };
          if (ar2 > boxAR) { const nh = kb2.w * REP_AR[s] / ar2; if (g.kvPlace === 'bottom' || kb2.y + kb2.h >= 0.98) kb2.y = r3(kb2.y + kb2.h - nh); kb2.h = r3(nh); }
          else { const nw = kb2.h * ar2 / REP_AR[s]; if (g.kvPlace === 'right' || kb2.x + kb2.w >= 0.98) kb2.x = r3(kb2.x + kb2.w - nw); kb2.w = r3(nw); }
          if (kb2.w >= 0.15 && kb2.h >= 0.15) { g.kvBox = kb2; fixes.push(`${s}: 그림 상자를 그림 비율에 맞춤`); }
        }
        g.crop = c; fixes.push(`${s}: 보일 부분을 그림 상자 비율에 맞춰 넓힘`);
      }
    }
    { const c2 = faceWhole(g.crop); if (c2 !== g.crop) { g.crop = { x: r3(c2.x), y: r3(c2.y), w: r3(c2.w), h: r3(c2.h) }; fixes.push(`${s}: 얼굴이 걸쳐 잘려 통째로 넣음`); } }
    { const HEXR = /^#[0-9A-Fa-f]{6}$/;
      g.shapes = (Array.isArray(g.shapes) ? g.shapes : []).slice(0, 4).map(sh => ({ kind: ['ellipse', 'pill', 'rect'].includes(sh?.kind) ? sh.kind : 'ellipse', x: r3(clamp(num(sh?.x), -0.6, 1.2)), y: r3(clamp(num(sh?.y), -0.6, 1.2)), w: r3(clamp(num(sh?.w, 0.3), 0.02, 2)), h: r3(clamp(num(sh?.h, 0.3), 0.02, 2)), color: HEXR.test(sh?.color ?? '') ? sh.color.toUpperCase() : null, opacity: r3(clamp(num(sh?.opacity, 0.3), 0.05, 0.8)), blur: r3(clamp(num(sh?.blur), 0, 0.3)) })).filter(sh => sh.color); }
    const fa = g.fade ?? {}; const transparentKv = (kvMeta?.field?.opaque ?? 1) < 0.5;
    g.fade = Object.fromEntries(['left', 'right', 'top', 'bottom'].map(k => [k, transparentKv ? 0 : r3(clamp(num(fa[k]), 0, 0.6))]));
    g.why = String(g.why ?? '').slice(0, 200);
  }
  // 지면은 캠페인 공통 하나(10-20 원칙 · 10-22 사용자 「배경도 색이 다르구」 — 가로형 베이지·세로형 초록으로 갈렸다): 가로형 → 정사각 → 나머지 순으로 색이 있는 묶음의 지면을 모두에 쓴다. 녹임 길이만 모양별
  { const src = ['wide', 'square', 'tall', 'tower', 'strip'].map(k => A.groups[k]?.field).find(f => f?.colors?.length);
    if (src) for (const k of SHAPES) { const f = A.groups[k].field; if (f.colors.join() !== src.colors.join() || f.angle !== src.angle) { A.groups[k].field = { ...f, colors: [...src.colors], angle: src.angle, text: src.text }; } } }
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
  if (group.shapes?.length) out.aiShapes = group.shapes.map(sh => ({ ...sh }));
  // AI 지면(있으면 bgFill/bgGrad 프리셋보다 앞) — 렌더러 규칙이 글자색 대비·녹임 상한을 다시 검사
  const fd = group.field;
  // 글자색은 규칙(대비 계산) — AI 의 글자 톤은 넘기지 않는다(10-22 연한 초록에 흰 글자 강제)
  if (fd?.colors?.length) out.background = { mode: 'auto', color: null, ai: { stops: fd.colors, angle: fd.angle ?? 180, text: ['light', 'dark'].includes(fd.text) ? fd.text : null, melt: fd.melt ?? 0 } };   // 글자 톤은 「바람」 — field.js 가 글자 쪽 대비 3:1 넘을 때만 따른다
  else if (fd?.melt) out.background = { mode: 'auto', color: null, ai: { stops: [], angle: 180, text: null, melt: fd.melt } };
  return out;
}

// crop 뒤 좌표계에서의 주인공 상자(중심 기준 — 렌더러 kvMeta.field.focus 형식) · 없으면 null
export function focusInCrop(analysis, crop, group = null) {
  const s = group?.focus ?? analysis?.kv?.subject; if (!s || !crop) return null;
  const x0 = Math.max(s.x, crop.x), y0 = Math.max(s.y, crop.y), x1 = Math.min(s.x + s.w, crop.x + crop.w), y1 = Math.min(s.y + s.h, crop.y + crop.h);
  if (x1 <= x0 || y1 <= y0) return null;
  const w = (x1 - x0) / crop.w, h = (y1 - y0) / crop.h;
  return { x: r3((x0 - crop.x) / crop.w + w / 2), y: r3((y0 - crop.y) / crop.h + h / 2), w: r3(w), h: r3(h), parts: 1, others: [], density: 0.6, source: 'ai' };
}

// 판단을 입힌 kvMeta(사본) — 주인공 상자는 AI, 나머지 측정값은 그대로
export function kvMetaWithAi(kvMeta, analysis, crop = { x: 0, y: 0, w: 1, h: 1 }, group = null) {
  if (!kvMeta) return kvMeta;
  const fo = focusInCrop(analysis, crop, group);
  // 얼굴 상자를 crop 좌표로(렌더러 aiBoxRender 가 걸쳐 잘림을 검사) — crop 과 안 겹치는 얼굴은 뺀다
  const toCrop = f => ({ x: (f.x - crop.x) / crop.w, y: (f.y - crop.y) / crop.h, w: f.w / crop.w, h: f.h / crop.h });
  const inCrop = f => f.x < 1 && f.y < 1 && f.x + f.w > 0 && f.y + f.h > 0;
  const R3 = f => ({ x: r3(f.x), y: r3(f.y), w: r3(f.w), h: r3(f.h) });
  const faces = (analysis?.kv?.faces ?? []).map(toCrop).filter(inCrop).map(R3);
  const keep = (analysis?.kv?.keep ?? []).map(toCrop).filter(inCrop).map(R3);   // 보존 요소(제품·로고 마크) — 렌더러 핵심 상자에 쓴다
  const field = kvMeta.field ? { ...kvMeta.field, ...(fo ? { focus: fo } : {}) } : kvMeta.field;
  return { ...kvMeta, field, ai: { type: analysis?.kv?.type ?? null, mood: analysis?.kv?.mood ?? null, cutSafe: analysis?.kv?.cutSafe ?? null, crop, faces, keep } };
}

// 산출물 개별 스타일에 aiShape 가 있으면 캠페인 c.ai.groups[aiShape] 의 crop 사본·주인공 kvMeta 를 얹는다(사본은 캠페인에 모양별 5개만 — 산출물마다 복제하지 않는다).
// c.ai 가 없거나(해제) 그 모양이 없으면 그대로 — 프리셋 값은 남아 있어도 그림은 원본
export function resolveAiStyle(campaign, style, spec = null) {
  const shape = style?.aiShape; if (!shape) return style;
  const A = campaign?.ai?.analysis ?? null, G = campaign?.ai?.groups?.[shape] ?? null;
  const out = { ...style };
  // 예전에 저장된 AI 글자 톤(textTone) — 규칙이 정하게 걷어낸다(10-22). 사람이 따로 고른 값은 AI 값과 다를 때만 남는다
  const aiTone = A?.groups?.[shape]?.field?.text;
  if (out.textTone && (out.textTone === aiTone || out.textTone === G?.patch?.textTone)) delete out.textTone;
  // 틀 고정 매체(자소설·리멤버·잡다·에브리타임·캐치)·비즈보드 — AI 값을 걷어내고 규칙 그대로(예전에 저장된 캠페인 포함)
  if (spec && !aiEligible(spec)) {
    delete out.aiShape; delete out.aiKvBox; delete out.aiFade; delete out.aiShapes;
    if (out.background?.ai) { const { ai, ...rest } = out.background; out.background = rest; }
    if (A?.kv?.type && out.kvTypeOverride === A.kv.type) delete out.kvTypeOverride;
    for (const [k, v] of Object.entries(G?.patch ?? {})) if (PRESETS[k] && out[k] === v) delete out[k];
    return out;
  }
  // 캠페인 공통 지면 — 예전에 모양마다 다르게 저장된 지면도 하나로(녹임 길이는 그 모양 값)
  const cf = ['wide', 'square', 'tall', 'tower', 'strip'].map(k => A?.groups?.[k]?.field).find(f => f?.colors?.length);
  if (cf && out.background?.ai) out.background = { ...out.background, ai: { ...out.background.ai, stops: [...cf.colors], angle: cf.angle ?? out.background.ai.angle, text: ['light', 'dark'].includes(cf.text) ? cf.text : null } };
  if (!G?.keyVisual) return out;
  return { ...out, keyVisual: G.keyVisual, kvMeta: G.kvMeta ?? out.kvMeta, ...(out.aiKvBox ? { aiKvOrig: out.keyVisual, aiKvMetaOrig: out.kvMeta } : {}) };
}
