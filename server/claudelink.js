// 11-10 사용자 「API 빼고 CLI 로 개인 Claude 계정 연결 — 그 플랜 토큰 안에서」: 로컬 앱 ↔ Claude Code(claude) 연결.
//   GET  /api/claude/status  설치·로그인·플랜(매번 새로 확인 — 앱 칩이 2초마다 묻는 동안 로그인이 끝나면 바로 「연결됨」)
//   POST /api/claude/login   이 컴퓨터에서 `claude auth login --claudeai` 를 띄운다(브라우저 로그인 창). 끝나면 status 가 loggedIn
//   POST /api/claude/logout  `claude auth logout`
//   POST /api/claude/ask     { system, user, maxTokens? } → { text } — 앱 기획 해석(app/llm.js)을 API 키 없이
//   POST /api/kvjudge        { kv:{ dataUrl, meta }, rule:{ id, sub } } → 그림 종류 트리 한 칸(docs/ai-rule-layers.md · 규칙 지도 「그림 종류」) + 이유. 같은 그림은 다시 안 묻는다(캐시)
// 공개 앱(github.io)에는 서버가 없어 이 길이 없다 — 규칙 판정만.
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runClaudeCode } from './freedesign.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.resolve(HERE, '../ref/learned/cases/_out/kvjudge-cache.json');   // _out 은 git 밖
const ccEnv = () => { const env = { ...process.env }; delete env.CLAUDECODE; return env; };
const run = (args, timeout = 15000) => new Promise(res => execFile('claude', args, { env: ccEnv(), timeout }, (err, out, se) => res({ err, out: String(out ?? ''), se: String(se ?? '') })));

export async function claudeStatus() {
  const v = await run(['--version']);
  if (v.err) return { installed: false, loggedIn: false, error: /ENOENT/.test(String(v.err.code ?? v.err.message)) ? 'not-installed' : String(v.err.message ?? v.err) };
  const a = await run(['auth', 'status', '--json']);
  let st = {}; try { st = JSON.parse(a.out); } catch {}
  return { installed: true, version: v.out.trim(), loggedIn: !!st.loggedIn, authMethod: st.authMethod ?? null, plan: st.subscriptionType ?? null, email: st.email ?? null, org: st.orgName ?? null, login: LOGIN.state };
}

// 로그인 — 브라우저가 열리고 사용자가 로그인을 마치면 프로세스가 끝난다. 앱은 status 를 다시 물어 확인한다
const LOGIN = { state: 'idle', child: null, out: '', url: null, at: 0 };
export function startLogin() {
  if (LOGIN.child && LOGIN.state === 'waiting') return { state: LOGIN.state, url: LOGIN.url };
  LOGIN.state = 'waiting'; LOGIN.out = ''; LOGIN.url = null; LOGIN.at = Date.now();
  const child = spawn('claude', ['auth', 'login', '--claudeai'], { env: ccEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
  LOGIN.child = child;
  const grab = d => { LOGIN.out += String(d); const m = LOGIN.out.match(/https:\/\/\S+/); if (m && !LOGIN.url) LOGIN.url = m[0]; };
  child.stdout.on('data', grab); child.stderr.on('data', grab);
  child.on('error', e => { LOGIN.state = 'error'; LOGIN.out += String(e.message ?? e); LOGIN.child = null; });
  child.on('close', code => { LOGIN.state = code === 0 ? 'done' : (LOGIN.state === 'waiting' ? 'error' : LOGIN.state); LOGIN.child = null; });
  setTimeout(() => { if (LOGIN.child === child && LOGIN.state === 'waiting') { try { child.kill('SIGTERM'); } catch {} LOGIN.state = 'timeout'; } }, 10 * 60_000).unref?.();   // 10분 안에 안 끝나면 접는다
  return { state: LOGIN.state };
}

// ── 그림 종류 판단(트리 한 칸) — 규칙(core/kvtypes.js)이 먼저 판정하고, Claude 가 그림을 보고 다시 고른다. 결과는 앱의 「키비주얼 유형」 지정 값(kvTypeOverride)
export const KV_LEAVES = {
  'character-1': { name: '누끼 · 캐릭터 1개', override: 'cutout-character', cutout: true },
  'character-many': { name: '누끼 · 캐릭터 여럿', override: 'cutout-group-character', cutout: true },
  'object-1': { name: '누끼 · 오브젝트', override: 'cutout-object', cutout: true },
  'object-many': { name: '누끼 · 오브젝트 여럿', override: 'cutout-group', cutout: true },
  'photo': { name: '이미지 · 실사', override: 'photo', cutout: false },
  'photo-person': { name: '이미지 · 실사(인물)', override: 'photo-portrait', cutout: false },
  'graphic-object': { name: '이미지 · 그래픽(오브젝트 + 배경)', override: 'illust', cutout: false },
  'graphic-pattern': { name: '이미지 · 그래픽(패턴)', override: 'texture', cutout: false },
};
const JUDGE_SYSTEM = '너는 채용 광고에 쓸 키비주얼 그림의 종류를 가르는 분류기다. 그림을 보고 정해진 칸 중 하나만 고른다. 도구나 스킬을 쓰지 않고, JSON 한 줄만 답한다.';
export function judgePrompt({ transparent, ruleName }) {
  const keys = Object.entries(KV_LEAVES).filter(([, v]) => v.cutout === transparent);
  return [
    `이 그림은 ${transparent ? '바탕이 투명한 누끼' : '바탕까지 꽉 찬 이미지'}다(픽셀로 잰 값). 규칙 판정: ${ruleName ?? '없음'}.`,
    '아래 칸 중 하나를 고른다:',
    ...keys.map(([k, v]) => `- ${k}: ${v.name}`),
    transparent ? '기준: 캐릭터 = 사람·동물·마스코트처럼 얼굴(머리)이 있는 것. 여럿 = 그런 것이 둘 이상 나란히. 오브젝트 = 사물·아이콘·건물·탈것·3D 물건(로켓·상자·폴더 등), 여럿이면 object-many.'
      : '기준: 실사 = 카메라로 찍은 사진(사람이 주인공이면 photo-person). 그래픽 = 일러스트·3D 렌더 — 눈에 띄는 오브젝트가 있으면 graphic-object, 결·곡선·도형 반복뿐이면 graphic-pattern.',
    '답: {"leaf":"<칸 id>","confidence":0~1,"reason":"한국어 한 문장"}',
  ].join('\n');
}
export function parseJudge(text, transparent) {
  const m = String(text ?? '').match(/\{[\s\S]*\}/); if (!m) throw new Error('JSON 없음: ' + String(text).slice(0, 120));
  const o = JSON.parse(m[0]); const leaf = KV_LEAVES[o.leaf];
  if (!leaf) throw new Error('모르는 칸: ' + o.leaf);
  if (leaf.cutout !== transparent) throw new Error(`투명 여부와 맞지 않는 칸(${o.leaf})`);
  return { leaf: o.leaf, name: leaf.name, override: leaf.override, confidence: Math.max(0, Math.min(1, +o.confidence || 0)), reason: String(o.reason ?? '').slice(0, 200) };
}
const loadCache = () => { try { return JSON.parse(readFileSync(CACHE_FILE, 'utf8')); } catch { return {}; } };
export async function judgeKv({ kv, rule = {} } = {}) {
  if (!kv?.dataUrl) throw new Error('kv.dataUrl 이 필요합니다');
  const transparent = (kv.meta?.field?.opaque ?? 1) < 0.5;
  const hash = createHash('sha1').update(kv.dataUrl).digest('hex').slice(0, 20);
  const cache = loadCache(); if (cache[hash]) return { ...cache[hash], cached: true };
  const r = await runClaudeCode(judgePrompt({ transparent, ruleName: rule.name ?? rule.sub ?? rule.id }), { images: [{ dataUrl: kv.dataUrl }], imageMode: 'stream', tools: false, model: process.env.KVJUDGE_MODEL ?? 'sonnet', effort: 'low', timeoutMs: 120_000, system: JUDGE_SYSTEM });
  const out = { ...parseJudge(r.text, transparent), ms: r.ms, model: r.model };
  try { mkdirSync(path.dirname(CACHE_FILE), { recursive: true }); cache[hash] = { ...out, at: new Date().toISOString() }; writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1)); } catch {}
  return out;
}

// ── 일반 질문(텍스트만) — 앱 기획 해석(app/llm.js messages)을 API 키 없이
const ASK_SYSTEM = '너는 앱 안에서 부르는 도우미다. 도구나 스킬을 쓰지 않고, 사용자 메시지가 정한 형식대로만 답한다.';
export async function ask({ system, user }) {
  const prompt = `${system ? `[지시]\n${system}\n\n` : ''}[입력]\n${user ?? ''}`;
  const r = await runClaudeCode(prompt, { tools: false, model: process.env.ASK_MODEL ?? 'sonnet', effort: 'low', timeoutMs: 120_000, system: ASK_SYSTEM });
  return { text: r.text, ms: r.ms, model: r.model };
}

// 한도·로그인 오류를 사람 말로
export function friendlyError(e) {
  const m = String(e?.message ?? e);
  if (/ENOENT/.test(m)) return { code: 503, error: '이 컴퓨터에 Claude Code(claude)가 없어요 — 설치 후 다시 시도해 주세요' };
  if (/not logged in|login|authenticat|401/i.test(m)) return { code: 503, error: 'Claude 계정 연결이 필요해요 — 위쪽 「Claude 연결하기」 칩에서 연결해 주세요' };
  if (/rate|limit|429|usage/i.test(m)) return { code: 429, error: 'Claude 사용 한도에 걸렸어요 — 잠시 뒤 다시 시도해 주세요. 그동안은 규칙 판정으로 진행해요' };
  if (/시간 초과|timeout/i.test(m)) return { code: 504, error: 'Claude 응답이 늦어요 — 규칙 판정으로 진행하고, 잠시 뒤 다시 시도해 주세요' };
  return { code: 500, error: m.slice(0, 300) };
}

export async function handleClaudeLink(req, res, u, { json, readBody }) {
  const body = async () => { try { return JSON.parse((await readBody(req)).toString('utf8') || '{}'); } catch (e) { throw Object.assign(new Error('본문 JSON 오류'), { code: 400 }); } };
  try {
    if (req.method === 'GET' && u.pathname === '/api/claude/status') return json(res, 200, await claudeStatus()), true;
    if (req.method === 'POST' && u.pathname === '/api/claude/login') return json(res, 200, startLogin()), true;
    if (req.method === 'POST' && u.pathname === '/api/claude/logout') { const r = await run(['auth', 'logout']); return json(res, r.err ? 500 : 200, { ok: !r.err }), true; }
    if (req.method === 'POST' && u.pathname === '/api/claude/ask') return json(res, 200, await ask(await body())), true;
    if (req.method === 'POST' && u.pathname === '/api/kvjudge') return json(res, 200, await judgeKv(await body())), true;
  } catch (e) { const f = e.code === 400 ? { code: 400, error: e.message } : friendlyError(e); console.error('[claude]', u.pathname, f.error); return json(res, f.code, { error: f.error }), true; }
  return false;
}
