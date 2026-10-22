// 하이브리드(A+AI) — 브라우저 쪽: 서버의 그림 판단(/api/analyze) → 모양 묶음마다 키비주얼 crop 사본 + 측정 → 규격별 스타일 조각.
//   그리기는 기존 규칙 렌더러(renderArtifact)가 한다. 비교 화면(app/ab.js)과 본 앱(app/app.js) 둘 다 이 모듈을 쓴다.
import { SHAPES, groupFor, shapeOfSpec, presetPatch, kvMetaWithAi } from '../core/trackb/analyze.js';

const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('이미지를 읽지 못했습니다')); i.src = src; });

// 원본에서 crop(비율 상자)만큼 잘라 새 데이터 URL — 투명(누끼)은 PNG, 아니면 JPEG. 전체(0,0,1,1)면 원본 그대로
export async function cropKv(dataUrl, crop, { transparent = false } = {}) {
  if (!crop || (crop.x <= 0.001 && crop.y <= 0.001 && crop.w >= 0.999 && crop.h >= 0.999)) return dataUrl;
  const img = await loadImg(dataUrl);
  const sx = Math.round(crop.x * img.width), sy = Math.round(crop.y * img.height), sw = Math.max(1, Math.round(crop.w * img.width)), sh = Math.max(1, Math.round(crop.h * img.height));
  const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
  cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return transparent ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.92);
}

// API 로 보낼 사본 — 긴 변 1600px·JPEG(투명 PNG 는 PNG 유지). 미리보기·렌더는 원본을 쓴다
export async function apiCopy(dataUrl, keepPng = false) {
  const img = await loadImg(dataUrl);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  if (k === 1 && dataUrl.length < 3_000_000) return dataUrl;
  const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return keepPng ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.9);
}

// 서버 호출 — 「AI 그림 판단」 버튼에서만. apiDataUrl 은 1600px 사본(호출자가 만든다)
export async function requestAnalysis({ kv, logo = null, brief = {}, brand = {}, requests = '', model, effort } = {}) {
  const r = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kv, logo, brief, brand, requests, model, effort }) });
  let res; try { res = await r.json(); } catch { throw new Error(`서버 응답이 JSON 이 아닙니다(HTTP ${r.status}) — B 서버(node server/server.mjs 4796)로 열었는지 확인`); }
  if (!r.ok || res.error) throw new Error(res.error ?? `HTTP ${r.status}`);
  return res;
}

// 판단 → 모양 묶음마다 { keyVisual(사본), kvMeta(측정 + AI 주인공), patch(프리셋·유형) }. metaOf(dataUrl) 는 호출자의 측정 함수(앱 analyzeKeyVisual / ab.js kvMetaOf)
export async function buildGroupStyles(analysis, { keyVisual, kvMeta, metaOf }) {
  const transparent = (kvMeta?.field?.opaque ?? 1) < 0.5;
  const out = {};
  const cache = new Map();   // 같은 crop 이면 사본 한 번만
  for (const s of SHAPES) {
    const g = analysis.groups?.[s]; if (!g) continue;
    const key = JSON.stringify(g.crop);
    if (!cache.has(key)) cache.set(key, (async () => { const kv = await cropKv(keyVisual, g.crop, { transparent }); const meta = kv === keyVisual ? kvMeta : await metaOf(kv); return { kv, meta }; })());
    const { kv, meta } = await cache.get(key);
    out[s] = { keyVisual: kv, kvMeta: kvMetaWithAi(meta, analysis, g.crop), patch: presetPatch(g, analysis), crop: g.crop, why: g.why };
  }
  return out;
}

// 규격 하나에 입힐 스타일 조각
export function styleFor(groupStyles, spec) {
  const gs = groupStyles?.[shapeOfSpec(spec)]; if (!gs) return {};
  return { keyVisual: gs.keyVisual, kvMeta: gs.kvMeta, ...gs.patch };
}
export { groupFor, shapeOfSpec };
