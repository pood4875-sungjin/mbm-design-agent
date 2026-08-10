// BYOK LLM 클라이언트 — onsite llm.js 패턴 축소판.
// 키는 이 브라우저 localStorage에만 저장, api.anthropic.com 직접 호출.
// 키가 없으면 app.js가 정규식 파서로 폴백 — 데모는 항상 동작.

const KEY_LS = 'mbm-ai-key';
const MODEL = 'claude-sonnet-5';

export function getKey() { try { return localStorage.getItem(KEY_LS) || ''; } catch { return ''; } }
export function setKey(v) { try { v ? localStorage.setItem(KEY_LS, v) : localStorage.removeItem(KEY_LS); } catch {} }
export function hasKey() { return !!getKey(); }
export function maskKey() { const k = getKey(); return k ? (k.length <= 12 ? '••••' : k.slice(0, 7) + '…' + k.slice(-4)) : ''; }

async function messages(system, user, maxTokens = 800) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': getKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

function parseJson(raw) {
  raw = raw.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  try { return JSON.parse(raw); } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// 기획 텍스트 → Campaign Context 초안 (빈칸은 null — 추측 금지 규칙을 프롬프트로 강제)
export async function parseBriefLLM(text) {
  const system = '너는 MBM 캠페인 기획을 구조화하는 파서다. 사용자 텍스트에서 아래 JSON만 출력한다:\n'
    + '{"name":행사명|null,"date":"YYYY-MM-DD"|null,"venue":장소|null,"audience":대상 청중|null,"cta":행동유도 문구|null,'
    + '"channels":["edm","landing","banner","poster","xbanner","hyunsumak"] 중 언급된 것}\n'
    + '텍스트에 없는 값은 반드시 null. 추측 금지. 설명·코드펜스 없이 JSON만.';
  const out = parseJson(await messages(system, text, 600));
  if (!out) throw new Error('PARSE_FAIL');
  return out;
}

// 자유 지시 → Context 변경 패치 {date?,venue?,cta?,name?} 또는 null
export async function parseCommandLLM(text) {
  const system = '너는 캠페인 수정 지시를 해석한다. 사용자 문장에서 바꾸려는 값만 JSON으로: '
    + '{"date":"YYYY-MM-DD"|생략,"venue":장소|생략,"cta":문구|생략,"name":행사명|생략}. 해당 없으면 {}. JSON만.';
  return parseJson(await messages(system, text, 300));
}
