// 하이브리드(A+AI) — 브라우저 쪽: 서버의 그림 판단(/api/analyze) → 모양 묶음마다 키비주얼 crop 사본 + 측정 → 규격별 스타일 조각.
//   그리기는 기존 규칙 렌더러(renderArtifact)가 한다. 비교 화면(app/ab.js)과 본 앱(app/app.js) 둘 다 이 모듈을 쓴다.
import { SHAPES, groupFor, shapeOfSpec, presetPatch, kvMetaWithAi, aiEligible, ANALYSIS_SCHEMA, ANALYSIS_SYSTEM, analysisPrompt, validateAnalysis } from '../core/trackb/analyze.js';
import { estimateCost, sumUsage } from '../core/trackb/cost.js';
import { getKey } from './llm.js';

// 10-22 공개 페이지(GitHub Pages)에서도 돌게: 로컬 서버(/api/health 가 키 있음)가 있으면 서버, 없으면 이 브라우저에 저장한 키(앱 「AI 키 · 환경 설정」, localStorage — 저장소엔 없음)로 api.anthropic.com 직접 호출.
//   프롬프트·스키마·검증은 서버와 같은 core/trackb/analyze.js — 결과 모양도 같다.
export const ANALYZE_MODEL = 'claude-sonnet-5-5';
let serverOk = null;
export async function hasServer(fetchFn = fetch) {
  if (serverOk != null) return serverOk;
  try { const r = await fetchFn('/api/health', { cache: 'no-store' }); serverOk = r.ok ? !!(await r.json()).hasKey : false; } catch { serverOk = false; }
  return serverOk;
}
const imageBlock = (dataUrl, name) => {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? '').trim());
  if (!m) throw new Error(`${name}: data:image/png|jpeg|webp;base64 형식이어야 합니다`);
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
};
export async function analyzeDirect(key, { kv, logo = null, brief = {}, brand = {}, requests = '', model = ANALYZE_MODEL, effort = 'medium' } = {}, fetchFn = fetch) {
  if (!kv?.dataUrl) throw new Error('키비주얼이 필요합니다');
  const userText = analysisPrompt({ kvMeta: kv.meta ?? null, logoMeta: logo?.meta ?? null, brief, brand, requests });
  const content = [imageBlock(kv.dataUrl, '키비주얼'), ...(logo?.dataUrl ? [imageBlock(logo.dataUrl, '로고')] : []), { type: 'text', text: userText }];
  const body = { model, max_tokens: 4000, system: ANALYSIS_SYSTEM, messages: [{ role: 'user', content }], output_config: { effort, format: { type: 'json_schema', schema: ANALYSIS_SCHEMA } } };
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null; const timer = ac ? setTimeout(() => ac.abort(), 90000) : null;
  const t0 = Date.now(); let res;
  try {
    res = await fetchFn('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ac?.signal, headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify(body) });
  } catch (e) { throw new Error(e?.name === 'AbortError' ? '응답이 90초를 넘겨 중단했습니다' : `호출 실패: ${e?.message ?? e}`); }
  finally { if (timer) clearTimeout(timer); }
  if (!res.ok) {
    let detail = ''; try { detail = (await res.json())?.error?.message ?? ''; } catch {}
    throw new Error(`HTTP ${res.status}${detail ? ' · ' + detail : ''}${res.status === 401 ? ' (「AI 키 · 환경 설정」의 키를 확인해 주세요)' : ''}`);
  }
  const data = await res.json();
  if (data.stop_reason === 'refusal') throw new Error('모델이 요청을 거절했습니다');
  const text = (data.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  let raw; try { raw = JSON.parse(text); } catch { throw new Error('응답이 JSON 이 아닙니다: ' + text.slice(0, 120)); }
  const { analysis, fixes } = validateAnalysis(raw, { kvMeta: kv.meta ?? null, hasLogo: !!logo?.dataUrl });
  const usage = sumUsage([data.usage ?? {}]);
  return { analysis, fixes, usage, cost: estimateCost(model, usage), calls: 1, ms: Date.now() - t0, model, effort, raw, prompt: { system: ANALYSIS_SYSTEM, user: userText }, via: 'browser' };
}

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
  if (await hasServer()) {
    const r = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kv, logo, brief, brand, requests, model, effort }) });
    let res; try { res = await r.json(); } catch { throw new Error(`서버 응답이 JSON 이 아닙니다(HTTP ${r.status})`); }
    if (!r.ok || res.error) throw new Error(res.error ?? `HTTP ${r.status}`);
    return { ...res, via: 'server' };
  }
  const key = getKey();
  if (!key) throw new Error('AI 키가 없습니다 — 오른쪽 위 「AI 키 · 환경 설정」에 Anthropic API 키를 넣어 주세요(이 브라우저에만 저장됩니다)');
  return analyzeDirect(key, { kv, logo, brief, brand, requests, model: model ?? ANALYZE_MODEL, effort: effort ?? 'medium' });
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
    out[s] = { keyVisual: kv, kvMeta: kvMetaWithAi(meta, analysis, g.crop, g), patch: presetPatch(g, analysis), crop: g.crop, why: g.why, orig: keyVisual, origMeta: kvMeta };
  }
  return out;
}

// 규격 하나에 입힐 스타일 조각
export function styleFor(groupStyles, spec) {
  if (!aiEligible(spec)) return {};   // 틀 고정 매체·비즈보드는 규칙 그대로
  const gs = groupStyles?.[shapeOfSpec(spec)]; if (!gs) return {};
  return { keyVisual: gs.keyVisual, kvMeta: gs.kvMeta, ...gs.patch, ...(gs.patch?.aiKvBox ? { aiKvOrig: gs.orig, aiKvMetaOrig: gs.origMeta } : {}) };
}
export { groupFor, shapeOfSpec };
