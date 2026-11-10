// 요소 하나 말로 고치기 — POST /api/element-edit (11-10 사용자 「AI 아이콘 → '더 강약을 줘'」).
//   앱(app/elai.js)이 규칙(core/elementai.js quickElementEdit)으로 못 한 지시만 여기로 보낸다.
//   입력: { W, H, role, roleName, kind, text, lines, cur, runs, weights, minPx, bg, client, brand, locks, box, others, safe, instr }
//   출력: { ops, notes, note, ms, model } — ops 는 validateElementOps 를 지난 것(그 글꼴 굵기·최소 크기·대비 4.5·잠금·겹침)
//   호출: 헤드리스 Claude Code(`claude -p`, 로그인 계정 — server/freedesign.js runClaudeCode 재사용) · sonnet · effort low · 도구 없음
import { runClaudeCode, claudeCodeAvailable } from './freedesign.js';
import { elementEditPrompt, parseOpsJson, validateElementOps } from '../core/elementai.js';

export const ELEMENT_MODEL = process.env.ELEMENT_EDIT_MODEL ?? 'sonnet';
export const ELEMENT_EFFORT = process.env.ELEMENT_EDIT_EFFORT ?? 'low';

export async function handleElementEdit(req, res, { json, readBody, run = runClaudeCode }) {
  if (req.method !== 'POST') return false;
  let b; try { b = JSON.parse((await readBody(req)).toString('utf8')); } catch (e) { json(res, 400, { error: '본문 JSON 오류: ' + e.message }); return true; }
  if (!String(b.instr ?? '').trim()) { json(res, 400, { error: '지시가 비었어요' }); return true; }
  if (b.kind && b.kind !== 'text') { json(res, 400, { error: '그림·로고는 규칙 수정(크게·작게·옮기기)만 돼요' }); return true; }
  if (run === runClaudeCode) {
    const cc = await claudeCodeAvailable();
    if (!cc.ok) { json(res, 503, { error: 'claude 명령을 찾지 못했어요 — Claude Code 설치 후 서버를 다시 켜 주세요' }); return true; }
    if (cc.loggedIn === false) { json(res, 503, { error: 'Claude Code 로그인이 필요해요 — 터미널에서 claude auth login' }); return true; }
  }
  // 앱이 대기 중 「취소」하면 요청이 끊긴다 → 자식 claude 도 끊는다
  const ac = new AbortController();
  res.on('close', () => { if (!res.writableEnded) ac.abort(); });
  const t0 = Date.now();
  try {
    const r = await run(elementEditPrompt(b), { model: ELEMENT_MODEL, effort: ELEMENT_EFFORT, tools: false, imageMode: 'read', timeoutMs: 120_000, signal: ac.signal });
    const raw = parseOpsJson(r.text);
    const v = validateElementOps(raw, { kind: 'text', textLen: String(b.text ?? '').length, text: b.text, weights: b.weights, minPx: b.minPx, basePx: b.cur?.px, cur: b.cur, bg: b.bg, locks: b.locks, box: b.box, others: b.others, safe: b.safe, W: b.W, H: b.H });
    json(res, 200, { ops: v.ops, notes: v.notes, note: typeof raw.note === 'string' ? raw.note.slice(0, 200) : '', ms: Date.now() - t0, model: r.model ?? ELEMENT_MODEL });
  } catch (e) {
    if (e?.cancelled) { if (!res.writableEnded) json(res, 499, { error: '취소됨' }); return true; }
    console.error('[element-edit]', e?.message ?? e);
    json(res, 500, { error: e?.message ?? String(e), ms: Date.now() - t0 });
  }
  return true;
}
