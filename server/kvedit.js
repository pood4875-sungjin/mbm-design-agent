// 그림·로고 요소를 말로 고치기 — POST /api/kv-edit (11-10 저녁 사용자 「배경 제거해줘 같은 것도 연결된 Claude 로 확실하게」).
//   요소 AI(app/elai.js)가 규칙(크게·작게·옮기기)으로 못 한 그림 지시만 여기로 보낸다.
//   Claude 는 픽셀을 직접 못 고친다 → 「판단·검수」를 맡기고, 픽셀은 로컬 누끼 도구(scripts/kv-cutout.py — 외부 API 없음)가 만든다:
//     ① 계획: Claude 가 원본 그림 + 지시를 보고 할 일(cutout | none)과 누끼 옵션(rect·T·person …)을 고른다
//     ② 실행: kv-cutout.py 로 투명 PNG + 두 바탕 미리보기
//     ③ 검수: Claude 가 원본·미리보기를 보고 통과 / 옵션 바꿔 다시. 최대 3번. 통과 못 하면 그림을 바꾸지 않고 사유만
//   입력: { instr, kind:'kv'|'logo', image: dataUrl, roleName?, ctx?:{W,H,box,others,safe} }
//   출력: { image: dataUrl(PNG)|null, ops:{ box?, look? }|null, region:{x,y,w,h}|null, score, note, tries, ms, model }
//   할 일(11-10 밤 사용자 「자연어로 할 수 있는 건 Claude 가 다」): cutout(누끼·검수 고리) · adjust(보정 server/kvadjust.py) · region(보여 줄 영역) · box(자리·크기) · look(불투명도·회전·뒤집기·모서리)
//   호출: 헤드리스 Claude Code(`claude -p`, 로그인 계정 — server/freedesign.js runClaudeCode) · 그림은 stream 으로 직접 · 도구 없음
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runClaudeCode, claudeCodeAvailable } from './freedesign.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CUT = path.join(ROOT, 'scripts', 'kv-cutout.py'), CMP = path.join(ROOT, 'server', 'kvreview.py'), ADJ = path.join(ROOT, 'server', 'kvadjust.py');
export const KV_EDIT_MODEL = process.env.KV_EDIT_MODEL ?? 'sonnet';
export const KV_REVIEW_MODEL = process.env.KV_REVIEW_MODEL ?? 'opus';   // 검수는 눈이 좋은 모델(11-10 실측: sonnet 이 하늘 띠 남은 결과에 4점)
export const KV_EDIT_TRIES = 3;
const SYSTEM = '너는 광고 키비주얼 편집을 돕는 아트디렉터다. 도구를 쓰지 않고, 사용자 메시지가 정한 JSON 한 덩어리만 답한다.';

const OPTS_DOC = `누끼 도구 옵션(모두 선택):
- rect: "x0,y0,x1,y1" 0~1 비율 — 주인공이 있는 자리. 테두리 장식·하늘·바닥을 빼고 주인공만 감싸게
- T: 숫자 — 바탕과의 색 거리 문턱(기본 자동, 보통 20~60). 주인공이 바탕과 비슷해 사라지면 낮추고, 바탕 찌꺼기가 남으면 올린다
- person: true — 사람 사진(맥 인물 분리 마스크 사용)
- skipedge: "bottom" 등(top,bottom,left,right 쉼표) — 주인공이 닿는 변은 바탕 표본에서 뺀다
- largest: 0~1 — 가장 큰 덩어리의 이 배수 이상만 남김(부스러기 제거, 예 0.3)
- fill: true — 주인공 안쪽 구멍 메우기(유리·창처럼 바탕이 비치는 속)
- erode: 0~4 — 가장자리 깎기(바탕 테가 남을 때)`;

const ADJ_DOC = `보정 옵션(adjust): brightness·contrast·saturation·sharpness = 배수(1 그대로, 0.3~2) · gray: true(흑백) · warmth: -1(차갑게)~1(따뜻하게)`;
export function planPrompt({ instr, kind, roleName, ctx = null }) {
  const c = ctx ?? {}, kv = kind !== 'logo';
  const where = c.W ? `\n광고 크기 ${c.W}×${c.H}px. 이 ${kv ? '그림' : '로고'} 상자 ${JSON.stringify(c.box ?? null)} · 다른 요소 상자 ${JSON.stringify((c.others ?? []).slice(0, 8))} · 안전영역 ${JSON.stringify(c.safe ?? null)}` : '';
  return `광고 ${kv ? '키비주얼' : '로고'} 그림(첨부)을 사용자가 이렇게 고쳐 달라고 했다: «${String(instr).slice(0, 300)}»${where}
할 수 있는 일(steps 에 순서대로, 필요한 것만):
- {"do":"cutout","params":{...}} 바탕(배경)을 지우고 주인공만 투명하게(배경 제거·누끼·주인공만)
- {"do":"adjust","params":{...}} 그림 보정(밝게·어둡게·선명하게·흑백·따뜻하게·채도)
${kv ? `- {"do":"region","region":{"x":0~1,"y":0~1,"w":0~1,"h":0~1}} 그림에서 보여 줄 영역(원본 그림 기준 비율 — 「사람 얼굴 위주로」「오른쪽 건물만」처럼). 그림을 실제로 보고 정한다\n` : ''}- {"do":"box","box":{"scale":0.5~1.6,"dx":-0.5~0.5,"dy":-0.5~0.5}} 광고 안 자리·크기(dx·dy 는 광고 폭·높이 비율만큼 옮김, scale 은 지금 크기의 배수 — 「글자랑 안 겹치게」면 다른 요소 상자를 보고 정한다)
- {"do":"look","look":{"op":0~100${kv ? ',"rot":-180~180,"flip":"h"|"v"|"hv"|"","r":모서리px' : ',"rot":-180~180'}}} 외관(불투명도 %, 회전 °${kv ? ', 뒤집기, 둥근 모서리' : ''})
사용자가 말한 것만 한다 — 말하지 않은 일은 넣지 않는다. 특히 cutout 은 배경 제거·누끼·바탕 빼기를 말했을 때만, adjust 는 밝기·색감을 말했을 때만(「안 겹치게」「기울여」「반투명」에 cutout·adjust 를 붙이지 않는다).
그 밖(색 바꾸기·새로 그리기·물체 지우기·이어 그리기 등)은 할 수 없다 → steps 를 비우고 이유.
장면 전체가 하나의 그림이라 「주인공」이 없으면 cutout 은 rect 로 가장 중요한 덩어리를 고른다. 그래도 무리면 cutout 은 빼고 이유.
${OPTS_DOC}
${ADJ_DOC}
JSON 만: {"steps":[...],"why":"한 줄(한국어)"}`;
}
// 옛 모양({action:'cutout',params}) 도 받는다
export function stepsOf(j) {
  if (Array.isArray(j?.steps)) return j.steps.filter(x => x && typeof x === 'object' && ['cutout', 'adjust', 'region', 'box', 'look'].includes(x.do));
  if (j?.action === 'cutout') return [{ do: 'cutout', params: j.params ?? {} }];
  return [];
}
export function adjustArgs(p = {}) {
  const a = [];
  for (const k of ['brightness', 'contrast', 'saturation', 'sharpness']) { const v = +p[k]; if (p[k] != null && p[k] !== '' && Number.isFinite(v) && Math.abs(v - 1) > 1e-3) a.push('--' + k, String(Math.max(0.3, Math.min(2, v)))); }
  if (p.gray === true) a.push('--gray');
  { const v = +p.warmth; if (p.warmth != null && p.warmth !== '' && Number.isFinite(v) && Math.abs(v) > 1e-3) a.push('--warmth', String(Math.max(-1, Math.min(1, v)))); }
  return a;
}
export function regionOf(r) {
  const n = k => +r?.[k]; if (!['x', 'y', 'w', 'h'].every(k => Number.isFinite(n(k)))) return null;
  let x = Math.max(0, Math.min(1, n('x'))), y = Math.max(0, Math.min(1, n('y')));
  const w = Math.max(0.05, Math.min(1 - x, n('w'))), h = Math.max(0.05, Math.min(1 - y, n('h')));
  x = Math.min(x, 1 - w); y = Math.min(y, 1 - h);
  const r3 = v => Math.round(v * 1000) / 1000; return { x: r3(x), y: r3(y), w: r3(w), h: r3(h) };
}
export function reviewPrompt({ instr, params, out, fg = null }) {
  return `사용자 지시: «${String(instr).slice(0, 300)}». 첨부는 세 칸 비교 그림이다 — 1 원본 · 2 누끼 결과를 남색(#14183C)에 · 3 같은 결과를 주황(#FF8C00)에. 세 칸은 같은 크기·같은 위치다. 1과 2·3을 부분부분 짚어 비교하라: 원본에서 바탕이 아닌 것(사람 몸·다리, 땅, 식물, 사물)이 2·3에서 남색·주황으로 바뀌었으면 지워진 것이다. 바탕이 제대로 지워졌으면 주인공 둘레로 남색·주황이 보여야 한다.${fg != null ? ` 남은(불투명) 면적 ${fg}%.` : ''}
쓴 옵션: ${JSON.stringify(params)} · 도구 출력: ${String(out).slice(0, 200)}
엄격하게 검수(후하게 주지 말 것):
① 남색·주황 위에 원본 바탕색(하늘·흰 띠·그라데이션 조각) 덩어리가 남았나 — 띠·조각이 눈에 보이면 최대 2점
② 주인공(사람·사물·식물 등 원본에서 바탕이 아닌 것)이 지워져 남색·주황이 비치는 곳이 있나 — 있으면 최대 2점
③ 가장자리에 원본 바탕색 테(1~2px 넘는)가 둘렸나 — 있으면 최대 3점
④ 사용자가 원한 결과인가
먼저 items 에 원본의 주요 부분을 6~12개 적고(사람마다 머리·몸·다리, 땅·물, 식물, 사물, 하늘·구름 등) 각각 결과에서 어떻게 됐는지 적는다:
  "keep"(바탕 아님, 결과에 온전히 남음) · "lost"(바탕 아닌데 지워짐·잘림) · "removed"(바탕, 지워짐) · "left"(바탕인데 남음)
lost 가 하나라도 있으면 최대 2점, left 가 눈에 띄면 최대 2점.
점수 score: 5 완벽 · 4 광고에 바로 써도 됨(유리·반투명 재질의 작은 비침, 1~2px 가장자리는 괜찮다) · 3 눈에 띄는 작은 흠 · 2 이하 못 씀.
4 이상이면 {"items":[{"part":"…","state":"keep"}],"score":4,"why":"한 줄"}. 3 이하면 다음 시도 옵션도 {"score":3,"params":{...},"why":"무엇이 문제인지 한 줄"}. 고칠 길이 없으면 "give":true.
${OPTS_DOC}
JSON 만.`;
}
// 첫 JSON 덩어리만(괄호 짝·문자열 안 괄호 무시) — 11-10 실측: 답에 JSON 이 두 개 오면 첫 { ~ 끝 } 가 깨졌다
export function parseJson(text) {
  const s = String(text ?? '');
  for (let a = s.indexOf('{'); a >= 0; a = s.indexOf('{', a + 1)) {
    let d = 0, str = false, esc = false;
    for (let i = a; i < s.length; i++) {
      const ch = s[i];
      if (str) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') str = false; continue; }
      if (ch === '"') str = true; else if (ch === '{') d++; else if (ch === '}' && --d === 0) { try { return JSON.parse(s.slice(a, i + 1)); } catch { break; } }
    }
  }
  throw new Error('Claude 답에서 JSON 을 못 찾음');
}
// Claude 가 고른 옵션 → 명령 인자(허용 목록만 · 값 범위 고정)
export function cutArgs(p = {}) {
  const a = [];
  const rect = String(p.rect ?? '').split(',').map(Number);
  if (rect.length === 4 && rect.every(v => Number.isFinite(v) && v >= 0 && v <= 1) && rect[2] > rect[0] && rect[3] > rect[1]) a.push('--rect', rect.map(v => +v.toFixed(3)).join(','));
  if (Number.isFinite(+p.T) && +p.T >= 4 && +p.T <= 400 && p.T !== null && p.T !== '') a.push('--T', String(+p.T));
  if (p.person === true) a.push('--person');
  const se = String(p.skipedge ?? '').split(',').map(s => s.trim()).filter(s => ['top', 'bottom', 'left', 'right'].includes(s));
  if (se.length && se.length < 4) a.push('--skipedge', se.join(','));   // 네 변 다 빼면 바탕 표본이 없어 아무것도 안 지워진다(11-10 실측)
  if (Number.isFinite(+p.largest) && +p.largest > 0 && +p.largest <= 1 && p.largest !== null && p.largest !== '') a.push('--largest', String(+p.largest));
  if (p.fill === true) a.push('--fill');
  if (Number.isInteger(+p.erode) && +p.erode >= 0 && +p.erode <= 4 && p.erode !== null && p.erode !== '') a.push('--erode', String(+p.erode));
  return a;
}
const run = (cmd, args, { signal, timeoutMs = 120_000 } = {}) => new Promise((ok, no) => {
  const ch = spawn(cmd, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }); const o = [], e = [];
  const t = setTimeout(() => ch.kill('SIGKILL'), timeoutMs);
  const ab = () => { try { ch.kill('SIGTERM'); } catch {} };
  signal?.addEventListener?.('abort', ab, { once: true });
  ch.stdout.on('data', d => o.push(d)); ch.stderr.on('data', d => e.push(d));
  ch.on('error', er => { clearTimeout(t); no(er); });
  ch.on('close', code => { clearTimeout(t); signal?.removeEventListener?.('abort', ab); ok({ code, out: Buffer.concat(o).toString('utf8') + Buffer.concat(e).toString('utf8') }); });
});
const dataUrlOf = f => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
// Claude 에 보낼 축소본(긴 변 900, 맥 sips) — 실패하면 원본
async function small(f, signal) { const s = f.replace(/\.png$/, '-s.png'); const r = await run('sips', ['-Z', '900', f, '--out', s], { signal, timeoutMs: 30_000 }).catch(() => null); return r?.code === 0 && existsSync(s) ? s : f; }

export async function kvEdit(b, { call = runClaudeCode, signal = null, log = () => {} } = {}) {
  const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(String(b.image ?? ''));
  if (!m) throw new Error('그림(dataUrl)이 없어요');
  const dir = mkdtempSync(path.join(tmpdir(), 'kvedit-'));
  try {
    const src = path.join(dir, `src.${m[1] === 'jpeg' ? 'jpg' : m[1]}`); writeFileSync(src, Buffer.from(m[2], 'base64'));
    let srcPng = src;
    if (m[1] !== 'png') { srcPng = path.join(dir, 'src.png'); await run('sips', ['-s', 'format', 'png', src, '--out', srcPng], { signal }); }
    const srcS = await small(srcPng, signal), img = f => ({ dataUrl: dataUrlOf(f) });
    const ask = async (prompt, files, model = KV_EDIT_MODEL, effort = 'low') => { const r = await call(prompt, { images: files.map(img), imageMode: 'stream', tools: false, model, effort, system: SYSTEM, timeoutMs: 180_000, signal }); return { j: parseJson(r.text), model: r.model }; };
    const plan = await ask(planPrompt(b), [srcS]); log('plan', plan.j);
    const wantsCut = /배경|바탕|누끼|배경\s*제거|투명\s*배경|주인공만|따\s*줘|따줘|잘라/.test(String(b.instr ?? ''));
    const steps = stepsOf(plan.j).filter(x => x.do !== 'cutout' || wantsCut);   // 시키지 않은 누끼는 버린다(11-10 실측: 「안 겹치게 작게」「반투명」에 누끼를 붙임)
    if (!steps.length) return { image: null, note: plan.j.why || '이 지시는 할 수 없어요', tries: [], model: plan.model };
    // ① 누끼(검수 고리) — 지금 그림(cur)에서. 통과 못 하면 그림은 그대로, 나머지 단계도 하지 않는다(반쪽 결과 금지)
    const cutout = async (cur, params0) => {
      let params = params0 ?? {}; const tries = []; let best = null;
      const re = async why => { const nx = await ask(`${planPrompt(b)}\n\n앞 누끼 시도(옵션 ${JSON.stringify(params)})의 결과: «${why}». cutout 옵션을 바꿔 다시 고른다(skipedge 는 주인공이 실제로 닿는 변만, T 조정, rect 좁히기).`, [srcS]); log('replan', nx.j); return stepsOf(nx.j).find(x => x.do === 'cutout')?.params ?? null; };
      for (let i = 0; i < KV_EDIT_TRIES; i++) {
        const out = path.join(dir, `cut${i}.png`), prev = path.join(dir, `prev${i}.png`);
        const r = await run('python3', [CUT, cur, out, '--preview', prev, ...cutArgs(params)], { signal });
        if (r.code !== 0 || !existsSync(prev)) {   // 도구가 전경을 못 찾음 등 — 다음 옵션은 Claude 가 출력 문장을 보고 고른다
          const why = r.out.trim().split('\n').pop()?.slice(0, 160) ?? `종료 ${r.code}`; tries.push({ params, ok: false, why });
          if (i === KV_EDIT_TRIES - 1 || !(params = await re(why))) break; continue;
        }
        // 수치 검사 먼저(11-10 실측: 투명 0% 결과를 Claude 가 통과시킴)
        const fg = +(/fg=([\d.]+)%/.exec(r.out)?.[1] ?? NaN);
        if (!(fg >= 3 && fg <= 95)) {
          const why = Number.isFinite(fg) ? (fg > 95 ? `바탕이 거의 안 지워짐(남은 면적 ${fg}%)` : `주인공까지 거의 다 지워짐(남은 면적 ${fg}%)`) : '결과 면적을 못 읽음';
          tries.push({ params, ok: false, why }); if (i === KV_EDIT_TRIES - 1 || !(params = await re(why))) break; continue;
        }
        const cmp = path.join(dir, `cmp${i}.png`); await run('python3', [CMP, cur, out, cmp], { signal, timeoutMs: 60_000 });
        const rv = await ask(reviewPrompt({ instr: b.instr, params, out: r.out, fg }), [existsSync(cmp) ? cmp : await small(prev, signal)], KV_REVIEW_MODEL, 'high'); log('review', rv.j);
        const items = Array.isArray(rv.j.items) ? rv.j.items : [], lost = items.filter(x => x?.state === 'lost' || x?.state === 'left');
        const score = Math.max(0, Math.min(lost.length ? 2 : 5, +rv.j.score || (rv.j.ok ? 4 : 2)));   // 잃은·남은 부분이 있으면 점수가 높아도 2
        tries.push({ params, ok: score >= 4, score, fg, why: rv.j.why ?? '', lost: lost.map(x => `${x.part}:${x.state}`) });
        if (score >= 4) return { file: out, score, why: rv.j.why ?? '', tries, model: rv.model };
        if (score >= 3 && (!best || score > best.score)) best = { file: out, score, why: `작은 흠 있음 — ${rv.j.why ?? ''}` };
        if (rv.j.give || !rv.j.params) break;
        params = rv.j.params;
      }
      return best ? { ...best, tries } : { file: null, why: `깔끔하게 못 땄어요 — ${tries.at(-1)?.why ?? ''}`.trim(), tries };
    };
    let cur = srcPng, changed = false, score = null, tries = [], model = plan.model; const notes = [], ops = {}; let region = null;
    for (const st of steps) {
      if (st.do === 'cutout') {
        const r = await cutout(cur, st.params); tries = tries.concat(r.tries ?? []); model = r.model ?? model;
        if (!r.file) return { image: null, note: r.why, tries, model };
        cur = r.file; changed = true; score = r.score; notes.push(r.why);
      } else if (st.do === 'adjust') {
        const args = adjustArgs(st.params); if (!args.length) continue;
        const out = path.join(dir, `adj${notes.length}.png`), r = await run('python3', [ADJ, cur, out, ...args], { signal });
        if (r.code !== 0 || !existsSync(out)) return { image: null, note: `보정 실패: ${r.out.trim().split('\n').pop()?.slice(0, 120)}`, tries, model };
        cur = out; changed = true; notes.push('보정');
      } else if (st.do === 'region' && b.kind !== 'logo') { region = regionOf(st.region); if (region) notes.push('보여 줄 영역'); }
      else if (st.do === 'box' && st.box) { ops.box = st.box; notes.push('자리·크기'); }
      else if (st.do === 'look' && st.look) { ops.look = st.look; notes.push('외관'); }
    }
    // 그림이 바뀌면 영역은 새 그림 기준이 아니라 버린다(새 그림은 분석이 새로 정한다)
    if (changed && region) { region = null; notes.push('(새 그림이라 영역은 자동)'); }
    return { image: changed ? dataUrlOf(cur) : null, ops: Object.keys(ops).length ? ops : null, region, score, note: [plan.j.why, ...notes].filter(Boolean).join(' · ').slice(0, 300), tries, model };
  } finally { try { rmSync(dir, { recursive: true, force: true }); } catch {} }
}

export async function handleKvEdit(req, res, { json, readBody, call = runClaudeCode }) {
  if (req.method !== 'POST') return false;
  let b; try { b = JSON.parse((await readBody(req)).toString('utf8')); } catch (e) { json(res, 400, { error: '본문 JSON 오류: ' + e.message }); return true; }
  if (!String(b.instr ?? '').trim()) { json(res, 400, { error: '지시가 비었어요' }); return true; }
  if (call === runClaudeCode) {
    const cc = await claudeCodeAvailable();
    if (!cc.ok) { json(res, 503, { error: 'claude 명령을 찾지 못했어요 — Claude Code 설치 후 서버를 다시 켜 주세요' }); return true; }
    if (cc.loggedIn === false) { json(res, 503, { error: 'Claude Code 로그인이 필요해요 — 터미널에서 claude auth login' }); return true; }
  }
  const ac = new AbortController(); res.on('close', () => { if (!res.writableEnded) ac.abort(); });
  const t0 = Date.now();
  try { const r = await kvEdit(b, { call, signal: ac.signal, log: (k, v) => console.log('[kv-edit]', k, JSON.stringify(v).slice(0, 300)) }); json(res, 200, { ...r, ms: Date.now() - t0 }); }
  catch (e) {
    if (e?.cancelled || ac.signal.aborted) { if (!res.writableEnded) json(res, 499, { error: '취소됨' }); return true; }
    console.error('[kv-edit]', e?.message ?? e); json(res, 500, { error: e?.message ?? String(e), ms: Date.now() - t0 });
  }
  return true;
}
