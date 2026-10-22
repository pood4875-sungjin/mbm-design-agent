// B 트랙 — API 사용량 → 비용 추정(USD). 가격은 Anthropic 1st-party 공개 단가(2026-10 기준, MTok 당).
// 추정일 뿐이다: 캐시 쓰기·배치 할인 등은 반영하지 않는다. 비교표의 「API 사용량」 칸에 들어간다.

export const PRICES = {
  'claude-opus-5-5': { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5, label: 'Opus 5.5' },
  'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5, label: 'Sonnet 5.5' },
};
export const DEFAULT_MODEL = 'claude-opus-5-5';
export const MODELS = Object.keys(PRICES);

export function estimateCost(model, usage = {}) {
  const p = PRICES[model]; if (!p) return null;
  const n = k => Number(usage[k] ?? 0) || 0;
  const usd = (n('input_tokens') * p.in + n('output_tokens') * p.out + n('cache_read_input_tokens') * p.cacheRead + n('cache_creation_input_tokens') * p.cacheWrite) / 1e6;
  return Math.round(usd * 1e4) / 1e4;
}

export function sumUsage(list = []) {
  const out = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  for (const u of list) for (const k of Object.keys(out)) out[k] += Number(u?.[k] ?? 0) || 0;
  return out;
}
