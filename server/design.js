// B 트랙 — Claude 호출 한 번(필요하면 재요청 한 번)으로 레이아웃 JSON 을 받는다. 서버(server.mjs)와 헤드리스 비교(scripts/ab-run.mjs)가 같이 쓴다.
//   흐름: 고정 조건(core/trackb/prompt.js buildFixed) → 프롬프트 + 이미지 → structured output(LAYOUT_SCHEMA) → 검증(validateLayout) → 위반이면 retryPrompt 로 한 번 더 → 결과 + 사용량·비용·시간
//   키는 호출자가 Anthropic 클라이언트를 만들어 넘긴다(server.mjs 가 .env / 환경변수 / app/config.local.js 에서 읽는다). 이 파일은 키를 모른다.

import Anthropic from '@anthropic-ai/sdk';
import { SPECS } from '../core/contract.js';
import { registerAll } from '../core/generate.js';
import { createContext } from '../core/context.js';
import { kvTypeOf, kvTypeSummary } from '../core/kvtypes.js';
import { LAYOUT_SCHEMA, validateLayout } from '../core/trackb/schema.js';
import { buildFixed, buildPrompt, retryPrompt, SYSTEM_PROMPT } from '../core/trackb/prompt.js';
import { estimateCost, sumUsage, DEFAULT_MODEL, PRICES } from '../core/trackb/cost.js';
import { ANALYSIS_SYSTEM, analysisPrompt, validateAnalysis, parseAnalysisText } from '../core/trackb/analyze.js';

registerAll();

const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024;   // API 한도 5MB — 앱이 1600px 로 줄여 보낸다

export function imageBlock(dataUrl, name = '이미지') {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? '').trim());
  if (!m) throw new Error(`${name}: data:image/png|jpeg|webp;base64 형식이어야 합니다`);
  const bytes = Math.floor(m[2].length * 3 / 4);
  if (bytes > MAX_IMAGE_BYTES) throw new Error(`${name}: ${(bytes / 1048576).toFixed(1)}MB — 4.5MB 이하로 줄여 주세요`);
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
}

export function makeClient(apiKey) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 가 없습니다 — server/.env 또는 환경변수에 넣어 주세요');
  return new Anthropic({ apiKey, maxRetries: 2, timeout: 180_000 });
}

// 한 번 호출 — 서버 측 폴백(거절 시 다른 모델로) 을 켜서 부른다. 베타 경로가 거부되면 일반 경로로 다시 한 번.
async function callOnce(client, params) {
  try {
    return await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError) return client.messages.create(params);
    throw e;
  }
}

function textOf(res) {
  if (res.stop_reason === 'refusal') throw new Error(`모델이 요청을 거절했습니다(${res.stop_details?.category ?? 'refusal'})`);
  const t = (res.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  if (!t) throw new Error(`빈 응답(stop_reason=${res.stop_reason})`);
  try { return JSON.parse(t); } catch { throw new Error('응답이 JSON 이 아닙니다: ' + t.slice(0, 200)); }
}

// 입력: { specId, brief:{client,hiringType,role,season,startDate,deadline,deadlineTime,slogan,notice,headline}, brand:{primary,accent,colors}, requests, fontId,
//        kv:{dataUrl, meta}, logo:{dataUrl, meta}, model, effort, maxCalls }
// 출력: { layout, fixed, fixes, unresolved, rationale, usage, cost, calls, ms, model, effort, raw }
export async function designLayout(client, input = {}) {
  const spec = SPECS[input.specId]; if (!spec || spec.channel !== 'ad') throw new Error(`알 수 없는 광고 규격: ${input.specId}`);
  const model = PRICES[input.model] ? input.model : DEFAULT_MODEL;
  const effort = ['low', 'medium', 'high', 'xhigh'].includes(input.effort) ? input.effort : 'high';
  const maxCalls = Math.max(1, Math.min(3, Number(input.maxCalls ?? 2)));
  const brief = input.brief ?? {};
  const ctx = createContext(brief, 'recruit');
  const kvMeta = input.kv?.meta ?? null, logoMeta = input.logo?.meta ?? null;
  const hasKv = !!input.kv?.dataUrl, hasLogo = !!input.logo?.dataUrl;
  const fixed = buildFixed(spec, { ctx, fontId: input.fontId, kvMeta, logoMeta, hasKv, hasLogo });
  const typeSummary = kvMeta ? (() => { try { return kvTypeSummary(kvMeta) || kvTypeOf(kvMeta)?.name || null; } catch { return null; } })() : null;
  const userText = buildPrompt(fixed, { brief, brand: input.brand ?? {}, requests: input.requests ?? '', kvMeta, logoMeta, kvTypeSummary: typeSummary });
  const content = [];
  if (hasKv) content.push(imageBlock(input.kv.dataUrl, '키비주얼'));
  if (hasLogo) content.push(imageBlock(input.logo.dataUrl, '로고'));
  content.push({ type: 'text', text: userText });
  const messages = [{ role: 'user', content }];
  const params = { model, max_tokens: 8000, system: SYSTEM_PROMPT, messages, output_config: { effort, format: { type: 'json_schema', schema: LAYOUT_SCHEMA } } };

  const t0 = Date.now(); const usages = []; let calls = 0, raw = null, result = null;
  while (calls < maxCalls) {
    const res = await callOnce(client, params); calls++;
    usages.push(res.usage ?? {});
    raw = textOf(res);
    result = validateLayout(raw, fixed);
    if (!result.retry.length) break;
    if (calls >= maxCalls) break;
    messages.push({ role: 'assistant', content: JSON.stringify(raw) }, { role: 'user', content: retryPrompt(result.retry) });
  }
  const usage = sumUsage(usages);
  return {
    layout: result.layout, fixed, fixes: result.fixes, unresolved: result.retry, rationale: result.layout.rationale ?? '',
    usage, cost: estimateCost(model, usage), calls, ms: Date.now() - t0, model, effort, raw,
    prompt: { system: SYSTEM_PROMPT, user: userText },
  };
}

// 하이브리드(A+AI) — 그림 판단 1회. 입력: { kv:{dataUrl, meta}, logo?:{dataUrl, meta}, brief, brand, requests, model(기본 Sonnet), effort(기본 medium) }
// 출력: { analysis, fixes, usage, cost, calls, ms, model, effort, raw, prompt }
export const ANALYZE_MODEL = 'claude-sonnet-5-5';
export async function analyzeKv(client, input = {}) {
  if (!input.kv?.dataUrl) throw new Error('키비주얼이 필요합니다');
  const model = PRICES[input.model] ? input.model : ANALYZE_MODEL;
  const effort = ['low', 'medium', 'high'].includes(input.effort) ? input.effort : 'medium';
  const kvMeta = input.kv.meta ?? null, logoMeta = input.logo?.meta ?? null, hasLogo = !!input.logo?.dataUrl;
  const userText = analysisPrompt({ kvMeta, logoMeta, brief: input.brief ?? {}, brand: input.brand ?? {}, requests: input.requests ?? '' });
  const content = [imageBlock(input.kv.dataUrl, '키비주얼')];
  if (hasLogo) content.push(imageBlock(input.logo.dataUrl, '로고'));
  content.push({ type: 'text', text: userText });
  const messages = [{ role: 'user', content }];
  const params = { model, max_tokens: 6000, system: ANALYSIS_SYSTEM, messages, output_config: { effort } };
  const t0 = Date.now(); const usages = []; let raw = null, lastErr = null;
  for (let i = 0; i < 2 && !raw; i++) {   // 형식이 깨지면 한 번 더
    const res = await callOnce(client, params); usages.push(res.usage ?? {});
    if (res.stop_reason === 'refusal') throw new Error('모델이 요청을 거절했습니다');
    const text = (res.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('');
    try { raw = parseAnalysisText(text); } catch (e) { lastErr = e; messages.push({ role: 'assistant', content: text || '(빈 응답)' }, { role: 'user', content: 'JSON 하나만 다시 — 설명·코드펜스 없이, 형식 그대로.' }); }
  }
  if (!raw) throw lastErr ?? new Error('JSON 을 받지 못했습니다');
  const { analysis, fixes } = validateAnalysis(raw, { kvMeta, hasLogo });
  const usage = sumUsage(usages);
  return { analysis, fixes, usage, cost: estimateCost(model, usage), calls: usages.length, ms: Date.now() - t0, model, effort, raw, prompt: { system: ANALYSIS_SYSTEM, user: userText } };
}
