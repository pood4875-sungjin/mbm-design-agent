// 요소 하나에 말로 고치기(11-10 사용자 「텍스트 영역 클릭하면 AI 아이콘 → '더 강약을 줘' 하면 반영」 — 피그마 AI 처럼).
//   ① quickElementEdit: 규칙으로 바로 되는 지시(굵게·크게·작게·색·정렬·자간·강약·한 줄로·「…」만 ~)는 LLM 없이 0초(core/freequick.js 방식 — 절 하나라도 모르면 통째로 ok:false → ②)
//   ② 로컬 서버 POST /api/element-edit(server/elementedit.js — claude -p)가 같은 연산(ops)을 낸다
//   두 길 모두 validateElementOps 를 지난다: 그 글꼴이 가진 굵기만 · 최소 글자 크기 · 지면 대비 4.5 · 매체 잠금(색·굵기·크기) · 안전영역·다른 요소 겹침.
//   연산(ops) — 앱(app/elai.js)이 overrides.elements 로 옮긴다(PNG·SVG·ZIP 같은 길):
//     { runs: [{ s, e, w?, px?, c?, ls? }],   글자 범위(textContent 위치, <br> 0글자) — 준 속성만
//       clearRuns: bool,                       기존 범위 서식을 먼저 비움
//       el: { weight?, scale?, color?, align?, ls?, lh?, dx?, dy? },   요소 전체(글자) — scale 은 배율, dx·dy 는 px
//       box: { scale?, dx?, dy? },             그림·로고 — dx·dy 는 캔버스 몫(0.05 = 폭의 5%)
//       text: '…' }                            문구 바꾸기(「한 줄로」 — 줄바꿈 빼기)
//   순수 함수 — 브라우저·서버·테스트가 같이 쓴다. test/elementai-1110.test.js

import { colorFrom, contrast } from './freequick.js';
import { CANON } from './canon.js';

const r1 = v => Math.round(v * 10) / 10;
const BIG = /크게|키워|키우|확대|늘려|커지|크게/, SMALL = /작게|줄여|줄이|축소|작아/;
const AMOUNT = t => { const m = /(\d+(?:\.\d+)?)\s*%/.exec(t); if (m) return +m[1] / 100; if (/조금|살짝|약간/.test(t)) return 0.05; if (/많이|크게 크게|훨씬|확/.test(t)) return 0.2; return 0.1; };

// 낱말 자리 — 공백·줄바꿈으로 나눈 조각 [{ s, e, w }] (textContent 위치: 줄바꿈은 0글자라 lines 를 이어 셈)
//   줄바꿈(\n)이 든 글(innerText)을 주면 줄바꿈을 0글자로 빼고 셈한다 — 「GS에너지<br>신입」이 한 낱말로 붙지 않게
export function wordsOf(text) { const out = []; const re = /\S+/g; let m; const t = String(text ?? ''); while ((m = re.exec(t))) { const nl = (t.slice(0, m.index).match(/\n/g) ?? []).length; out.push({ s: m.index - nl, e: m.index - nl + m[0].length, w: m[0] }); } return out; }
const isYear = w => /^(19|20)\d{2}(년|년도)?$/.test(w);
const isNum = w => /^[\d.,~\-()월일시분:]+$/.test(w);
// 핵심어: 고객사 이름이 든 낱말 → 숫자·연도가 아닌 가장 긴 낱말
export function keyWordOf(text, client = '') {   // text: 줄바꿈 든 글이면 줄바꿈 0글자 셈
  const flat = String(text ?? '').replace(/\n/g, ''); const ws = wordsOf(text).filter(x => !isYear(x.w) && !isNum(x.w)); if (!ws.length) return null;
  const c = String(client ?? '').trim();
  if (c) { const i = flat.indexOf(c); if (i >= 0) return { s: i, e: i + c.length, w: c }; }
  return ws.slice().sort((a, b) => b.w.length - a.w.length || a.s - b.s)[0];
}
const near = (ws, t) => ws.reduce((p, q) => (Math.abs(q - t) < Math.abs(p - t) ? q : p), ws[0]);
const boldOf = ws => ws.filter(x => x >= 700)[0] ?? Math.max(...ws);
const regularOf = ws => { const r = ws.filter(x => x >= 400 && x <= 500); return r.length ? r[0] : near(ws, 400); };

// 지시 → 절(쉼표·「하고」·「그리고」·「고,」)
const clauses = t => String(t).split(/\s*(?:,|，|그리고|하고\s|하고$|\s고\s|및)\s*/).map(x => x.trim()).filter(Boolean);
// 「…」·'…'·"…" 로 집은 낱말
const quoted = t => { const m = /[「『"'“‘]([^」』"'”’]+)[」』"'”’]/.exec(t); return m ? m[1] : null; };

// ① 규칙 경로. input: { kind:'text'|'kv'|'logo', text, lines?, cur:{ px, w, color, align, ls }, weights, brand:{primary}, client, instr }
export function quickElementEdit(input) {
  const { kind = 'text', instr = '' } = input ?? {};
  const cls = clauses(instr); if (!cls.length) return { ok: false, reason: '빈 지시' };
  const ops = { runs: [] }, applied = [];
  if (kind === 'kv' || kind === 'logo') {
    const box = {};
    for (const c of cls) {
      let hit = false;
      if (BIG.test(c)) { box.scale = r1((box.scale ?? 1) * (1 + AMOUNT(c)) * 100) / 100; hit = true; applied.push(`크게 ${Math.round(AMOUNT(c) * 100)}%`); }
      else if (SMALL.test(c)) { box.scale = r1((box.scale ?? 1) * (1 - AMOUNT(c)) * 100) / 100; hit = true; applied.push(`작게 ${Math.round(AMOUNT(c) * 100)}%`); }
      const step = /조금|살짝|약간/.test(c) ? 0.03 : /많이|훨씬/.test(c) ? 0.1 : 0.05;
      if (/왼쪽|좌측/.test(c)) { box.dx = r1(((box.dx ?? 0) - step) * 1000) / 1000; hit = true; applied.push('왼쪽으로'); }
      if (/오른쪽|우측/.test(c)) { box.dx = r1(((box.dx ?? 0) + step) * 1000) / 1000; hit = true; applied.push('오른쪽으로'); }
      if (/위로|위쪽|올려/.test(c)) { box.dy = r1(((box.dy ?? 0) - step) * 1000) / 1000; hit = true; applied.push('위로'); }
      if (/아래로|아래쪽|내려/.test(c)) { box.dy = r1(((box.dy ?? 0) + step) * 1000) / 1000; hit = true; applied.push('아래로'); }
      if (!hit) return { ok: false, reason: `「${c}」 — 규칙으로 못 알아들음` };
      // 11-10 밤: 아는 낱말만 있을 때만 규칙으로 — 「글자랑 안 겹치게 … 작게」「로켓 머리만 크게」처럼 남는 말이 있으면 Claude(/api/kv-edit)로
      const rest = c.replace(/\d+(?:\.\d+)?\s*%/g, ' ').replace(/(그림|키비주얼|비주얼|로고|이미지|더|좀|조금|살짝|약간|많이|훨씬|확|크게|키워|키우|확대|늘려|커지|작게|줄여|줄이|축소|작아|왼쪽|오른쪽|좌측|우측|위쪽|아래쪽|위로|아래로|올려|내려|으로|로|쪽|이동|옮겨|해\s*줘|해\s*주세요|줘|주세요|해|만큼|정도|요)/g, ' ').replace(/[\s.,!~·]+/g, '');
      if (rest) return { ok: false, reason: `「${c}」 — 「${rest}」는 규칙 밖` };
    }
    return { ok: true, ops: { box }, applied };
  }
  const text = String(input.text ?? ''), ws = input.weights?.length ? input.weights : [400, 700], cur = input.cur ?? {};
  const base = cur.px || 0, el = {};
  for (const c0 of cls) {
    const q = quoted(c0), c = c0.replace(/[「『"'“‘][^」』"'”’]+[」』"'”’]/, ' ');
    // 대상: 「…」만 / 없으면 문구 전체
    const tgt = q ? (() => { const i = text.indexOf(q); return i >= 0 ? { s: i, e: i + q.length } : null; })() : null;
    if (q && !tgt) return { ok: false, reason: `「${q}」 — 문구에 없음` };
    if (!q && /[가-힣A-Za-z0-9]+만(\s|$)/.test(c)) return { ok: false, reason: `「${c0}」 — 대상 낱말(…만)을 규칙으로 못 집음` };   // 「연도만 작게」 같은 대상 지정은 AI 로
    let hit = false;
    if (/강약|대비|리듬|임팩트|위계|힘을/.test(c) && !tgt) {
      const k = keyWordOf(input.lines ?? text, input.client); if (!k) return { ok: false, reason: '핵심어를 못 찾음' };
      const W = wordsOf(input.lines ?? text); const bw = Math.max(...ws), rw = regularOf(ws);
      ops.clearRuns = true;
      for (const x of W) {
        const inKey = x.s < k.e && x.e > k.s;
        if (inKey) continue;
        ops.runs.push({ s: x.s, e: x.e, w: rw, ...(base ? { px: r1(base * 0.78) } : {}) });
      }
      ops.runs.push({ s: k.s, e: k.e, w: bw });
      if (bw !== cur.w) el.weight = bw;
      applied.push(`강약: 「${k.w}」 ${bw} · 나머지 ${rw}${base ? ` · ${Math.round(base * 0.78)}px` : ''}`);
      hit = true;
    }
    if (/굵게|두껍게|볼드|진하게/.test(c)) {
      const now = cur.w ?? 400, nx = ws.filter(x => x > now)[0] ?? Math.max(...ws);
      if (tgt) ops.runs.push({ ...tgt, w: boldOf(ws) }); else el.weight = nx;
      applied.push(`${tgt ? `「${q}」 ` : ''}굵게 ${tgt ? boldOf(ws) : nx}`); hit = true;
    } else if (/얇게|가늘게|가볍게|라이트/.test(c)) {
      const now = cur.w ?? 400, nx = ws.filter(x => x < now).at(-1) ?? Math.min(...ws);
      if (tgt) ops.runs.push({ ...tgt, w: regularOf(ws) }); else el.weight = nx;
      applied.push(`${tgt ? `「${q}」 ` : ''}얇게`); hit = true;
    }
    if ((BIG.test(c) || SMALL.test(c)) && !/자간/.test(c)) {
      const k = BIG.test(c) ? 1 + AMOUNT(c) : 1 - AMOUNT(c);
      if (tgt) { if (!base) return { ok: false, reason: '글자 크기를 모름' }; ops.runs.push({ ...tgt, px: r1(base * k) }); }
      else el.scale = Math.round((el.scale ?? 1) * k * 1000) / 1000;
      applied.push(`${tgt ? `「${q}」 ` : ''}${k > 1 ? '크게' : '작게'} ${Math.round(Math.abs(k - 1) * 100)}%`); hit = true;
    }
    if (/색|컬러|칠/.test(c) || (/강조/.test(c) && /브랜드|포인트/.test(c))) {
      const col = colorFrom(c, input.brand);
      if (!col) return { ok: false, reason: `「${c0}」 — 색 이름을 못 읽음` };
      if (tgt) ops.runs.push({ ...tgt, c: col });
      else if (/강조/.test(c)) { const k = keyWordOf(input.lines ?? text, input.client); if (!k) return { ok: false, reason: '핵심어를 못 찾음' }; ops.runs.push({ s: k.s, e: k.e, c: col }); }
      else el.color = col;
      applied.push(`${tgt ? `「${q}」 ` : ''}색 ${col}`); hit = true;
    } else if (/강조/.test(c) && tgt) { ops.runs.push({ ...tgt, w: boldOf(ws) }); applied.push(`「${q}」 강조(굵게)`); hit = true; }
    if (/왼쪽\s*정렬|좌측\s*정렬/.test(c)) { el.align = 'left'; applied.push('왼쪽 정렬'); hit = true; }
    else if (/가운데\s*정렬|중앙\s*정렬/.test(c)) { el.align = 'center'; applied.push('가운데 정렬'); hit = true; }
    else if (/오른쪽\s*정렬|우측\s*정렬/.test(c)) { el.align = 'right'; applied.push('오른쪽 정렬'); hit = true; }
    if (/자간/.test(c)) {
      const d = /좁|줄|타이트/.test(c) ? -2 : /넓|늘|벌/.test(c) ? 2 : null; if (d == null) return { ok: false, reason: '자간 방향을 모름' };
      el.ls = Math.min(0, r1((cur.ls ?? 0) + d)); applied.push(`자간 ${el.ls}%`); hit = true;   // 양의 자간은 쓰지 않는다(docs/freedesign-rules.md 「AI 티」)
    }
    if (/한\s*줄로|한줄로|줄바꿈\s*(빼|없)/.test(c)) {
      const lines = input.lines ?? text; if (!/\n/.test(lines)) return { ok: false, reason: '이미 한 줄' };
      ops.text = lines.replace(/\s*\n\s*/g, ' ').trim(); applied.push('한 줄로'); hit = true;
    }
    if (!hit) return { ok: false, reason: `「${c0}」 — 규칙으로 못 알아들음` };
  }
  if (Object.keys(el).length) ops.el = el;
  if (!ops.runs.length) delete ops.runs;
  return { ok: true, ops, applied };
}

// ② 검증 — ctx: { kind, textLen, weights, minPx, basePx, locks:{ color, style, size, font }, bg(지면 hex), W, H, box(이 요소 상자 px), others:[{ id, box }], safe:{ x, y, w, h } }
//   고칠 수 있으면 고치고(굵기 가까운 값·최소 크기), 못 쓰면 그 연산만 뺀다. notes 에 사유
export function validateElementOps(ops0, ctx = {}) {
  const notes = [], ops = {};
  if (!ops0 || typeof ops0 !== 'object') return { ops: {}, notes: ['연산 없음'] };
  const ws = ctx.weights?.length ? ctx.weights : [100, 200, 300, 400, 500, 600, 700, 800, 900];
  const minPx = ctx.minPx ?? 10, L = ctx.locks ?? {};
  const okColor = c => { if (!/^#[0-9A-Fa-f]{6}$/.test(c ?? '')) return false; if (ctx.bg && contrast(c, ctx.bg) < CANON.contrastMin.small) { notes.push(`색 ${c} — 지면 ${ctx.bg} 와 대비 ${contrast(c, ctx.bg).toFixed(1)}:1(${CANON.contrastMin.small} 미만)이라 뺐어요`); return false; } return true; };
  const snapW = w => { const v = near(ws, +w); if (v !== +w) notes.push(`굵기 ${w} → ${v}(이 글꼴이 가진 굵기)`); return v; };
  if (ctx.kind === 'kv' || ctx.kind === 'logo') {
    const b = ops0.box ?? {}, box = {};
    if (Number.isFinite(+b.scale) && +b.scale > 0) { if (L.size) notes.push('크기가 규정으로 정해진 칸이라 크기는 그대로예요'); else box.scale = Math.min(1.6, Math.max(0.5, +b.scale)); }
    for (const k of ['dx', 'dy']) if (Number.isFinite(+b[k]) && +b[k]) box[k] = Math.max(-0.5, Math.min(0.5, +b[k]));
    // 안전영역: 옮긴 상자가 캔버스 밖으로 나가면 안쪽으로
    if (ctx.box && ctx.W && ctx.H && (box.dx || box.dy || box.scale)) {
      const k = box.scale ?? 1, w = ctx.box.w * k, h = ctx.box.h * k;
      const x = ctx.box.x + ctx.box.w / 2 - w / 2 + (box.dx ?? 0) * ctx.W, y = ctx.box.y + ctx.box.h / 2 - h / 2 + (box.dy ?? 0) * ctx.H;
      if (ctx.kind === 'logo' && ctx.safe && (x < ctx.safe.x - 0.5 || y < ctx.safe.y - 0.5 || x + w > ctx.safe.x + ctx.safe.w + 0.5 || y + h > ctx.safe.y + ctx.safe.h + 0.5)) { notes.push('로고가 안전영역 밖으로 나가 옮기기는 뺐어요'); delete box.dx; delete box.dy; }
    }
    if (Object.keys(box).length) ops.box = box;
    return { ops, notes };
  }
  const n = ctx.textLen ?? Infinity;
  const runs = [];
  for (const r of Array.isArray(ops0.runs) ? ops0.runs : []) {
    const s = Math.max(0, Math.floor(+r.s)), e = Math.min(n, Math.floor(+r.e));
    if (!(e > s)) continue;
    const q = { s, e };
    if (r.w != null) { if (L.style) notes.push('이 매체는 굵기를 바꿀 수 없어요(규정)'); else q.w = snapW(r.w); }
    if (r.px != null && +r.px > 0) { if (L.size) notes.push('글자 크기가 규정인 규격이라 크기는 그대로예요'); else { q.px = r1(Math.max(minPx, +r.px)); if (+r.px < minPx) notes.push(`크기 ${r.px}px → ${minPx}px(최소 글자 크기)`); } }
    if (r.c != null) { if (L.color) notes.push('이 매체는 글자색이 규정이라 색은 그대로예요'); else if (okColor(String(r.c).toUpperCase())) q.c = String(r.c).toUpperCase(); }
    if (r.ls != null && Number.isFinite(+r.ls)) { if (L.style) notes.push('이 매체는 자간을 바꿀 수 없어요(규정)'); else q.ls = Math.max(-10, Math.min(0, r1(+r.ls))); }
    if (Object.keys(q).length > 2) runs.push(q);
  }
  if (runs.length) ops.runs = runs;
  if (ops0.clearRuns) ops.clearRuns = true;
  const e0 = ops0.el ?? {}, el = {};
  if (e0.weight != null) { if (L.style) notes.push('이 매체는 굵기를 바꿀 수 없어요(규정)'); else el.weight = snapW(e0.weight); }
  if (e0.scale != null && +e0.scale > 0) {
    if (L.size) notes.push('글자 크기가 규정인 규격이라 크기는 그대로예요');
    else { let k = Math.min(1.6, Math.max(0.6, +e0.scale)); if (ctx.basePx && ctx.basePx * k < minPx) { k = minPx / ctx.basePx; notes.push(`최소 글자 크기 ${minPx}px 까지만 줄였어요`); } if (Math.abs(k - 1) > 1e-3) el.scale = Math.round(k * 1000) / 1000; }
  }
  if (e0.color != null) { if (L.color) notes.push('이 매체는 글자색이 규정이라 색은 그대로예요'); else if (okColor(String(e0.color).toUpperCase())) el.color = String(e0.color).toUpperCase(); }
  if (['left', 'center', 'right'].includes(e0.align)) el.align = e0.align;
  if (e0.ls != null && Number.isFinite(+e0.ls)) { if (L.style) notes.push('이 매체는 자간을 바꿀 수 없어요(규정)'); else el.ls = Math.max(-10, Math.min(0, r1(+e0.ls))); }
  if (e0.lh != null && +e0.lh >= 80 && +e0.lh <= 250) el.lh = r1(+e0.lh);
  for (const k of ['dx', 'dy']) if (Number.isFinite(+e0[k]) && +e0[k]) el[k] = r1(+e0[k]);
  // 옮김: 안전영역 밖·다른 글자와 겹치면 뺀다
  if ((el.dx || el.dy) && ctx.box) {
    const b = { x: ctx.box.x + (el.dx ?? 0), y: ctx.box.y + (el.dy ?? 0), w: ctx.box.w, h: ctx.box.h };
    const out = ctx.safe && (b.x < ctx.safe.x - 0.5 || b.y < ctx.safe.y - 0.5 || b.x + b.w > ctx.safe.x + ctx.safe.w + 0.5 || b.y + b.h > ctx.safe.y + ctx.safe.h + 0.5);
    const hit = (ctx.others ?? []).filter(o => o.box && b.x < o.box.x + o.box.w && o.box.x < b.x + b.w && b.y < o.box.y + o.box.h && o.box.y < b.y + b.h);
    if (out || hit.length) { notes.push(out ? '안전영역 밖이라 옮기기는 뺐어요' : `${hit.map(o => o.id).join('·')}와 겹쳐 옮기기는 뺐어요`); delete el.dx; delete el.dy; }
  }
  // 지금 값과 같은 요소 값은 뺀다(모델이 형식을 채우느라 그대로 돌려준 값 — 범위 서식을 괜히 걷지 않게)
  const C = ctx.cur ?? {};
  if (el.weight != null && el.weight === C.w) delete el.weight;
  if (el.color && C.color && el.color === String(C.color).toUpperCase()) delete el.color;
  if (el.align && el.align === C.align) delete el.align;
  if (el.ls != null && el.ls === (C.ls ?? 0)) delete el.ls;
  if (el.scale === 1) delete el.scale;
  if (Object.keys(el).length) ops.el = el;
  if (typeof ops0.text === 'string' && ops0.text.trim()) { if (ops0.text.replace(/\s+/g, '') === String(ctx.text ?? '').replace(/\s+/g, '')) ops.text = ops0.text.trim(); else notes.push('글자 내용이 바뀌는 수정은 뺐어요(줄바꿈만 바꿀 수 있어요)'); }
  return { ops, notes };
}

// 추천 칩(팝오버) — 요소 종류별
export function suggestionsFor(kind, role) {
  if (kind === 'kv') return ['배경 제거', '더 크게', '작게', '좀 더 밝게'];   // 11-10 밤: 규칙 밖 지시는 연결된 Claude(/api/kv-edit)
  if (kind === 'logo') return ['조금 크게', '조금 작게', '흑백으로'];
  if (role === 'main') return ['강약 주기', '더 굵게', '한 줄로', '브랜드색 강조'];
  return ['더 굵게', '조금 크게', '조금 작게', '브랜드색으로'];
}

// ② AI 프롬프트 — 서버(server/elementedit.js)가 쓴다. 출력은 JSON 하나
export function elementEditPrompt(b) {
  const lines = [
    '광고 소재(채용 광고)의 글자 요소 하나만 고친다. 다른 요소·문구 내용은 바꾸지 않는다.',
    `캔버스 ${b.W}×${b.H}px · 요소 ${b.roleName ?? b.role} · 상자 x${Math.round(b.box?.x ?? 0)} y${Math.round(b.box?.y ?? 0)} w${Math.round(b.box?.w ?? 0)} h${Math.round(b.box?.h ?? 0)}`,
    `글자(줄바꿈 그대로):\n${b.lines ?? b.text}`,
    `글자 위치 셈: 아래 textContent 기준(줄바꿈은 0글자) — 「${b.text}」 (길이 ${String(b.text ?? '').length})`,
    `낱말 위치: ${wordsOf(b.lines ?? b.text ?? '').map(x => `${x.w}[${x.s},${x.e})`).join(' ')}`,
    `지금 스타일: 크기 ${b.cur?.px}px · 굵기 ${b.cur?.w} · 색 ${b.cur?.color} · 정렬 ${b.cur?.align} · 자간 ${b.cur?.ls ?? 0}%`,
    `기존 범위 서식: ${JSON.stringify(b.runs ?? [])}`,
    `이 글꼴이 가진 굵기: ${(b.weights ?? []).join(', ')} · 최소 글자 크기 ${b.minPx ?? 10}px · 지면색 ${b.bg ?? '모름'}(색은 대비 ${CANON.contrastMin.small}:1 이상)`,
    b.client ? `회사명: ${b.client}` : '',
    b.brand?.primary ? `브랜드색: ${b.brand.primary}${b.brand.accent ? ` · 보조 ${b.brand.accent}` : ''}` : '',
    `잠김(바꾸면 안 됨): ${[b.locks?.color && '색', b.locks?.style && '굵기·자간', b.locks?.size && '크기'].filter(Boolean).join(', ') || '없음'}`,
    `주변 요소: ${(b.others ?? []).map(o => `${o.id}(x${Math.round(o.box.x)} y${Math.round(o.box.y)} w${Math.round(o.box.w)} h${Math.round(o.box.h)})`).join(' ') || '없음'}`,
    '',
    `지시: ${b.instr}`,
    '',
    '출력: JSON 하나만(설명·코드블록 없이). 형식:',
    '{"runs":[{"s":0,"e":5,"w":800,"px":60,"c":"#RRGGBB","ls":-2}],"clearRuns":false,"el":{"weight":700,"scale":1.0,"color":"#RRGGBB","align":"left","ls":0,"lh":120},"note":"한 줄 설명"}',
    '- runs: 글자 범위 [s,e) 에 준 속성만(w 굵기 · px 글자 크기 · c 색 · ls 자간 %). 위 낱말 위치를 그대로 쓴다.',
    '- clearRuns: 기존 범위 서식을 지우고 새로 줄 때 true.',
    '- el: 요소 전체(scale 은 지금 크기 대비 배율). 바꿀 것만 넣는다.',
    '- 강약·강조는 굵기 차(가진 굵기 중) + 크기 차(보조 글자 0.7~0.85배)로. 색은 꼭 필요할 때만. 자간은 0 이하.',
  ];
  return lines.filter(x => x !== '').join('\n');
}
// 응답에서 JSON 하나 꺼내기
export function parseOpsJson(text) {
  const t = String(text ?? '');
  const m = /```(?:json)?\s*([\s\S]*?)```/.exec(t); const body = m ? m[1] : t;
  const i = body.indexOf('{'), j = body.lastIndexOf('}');
  if (i < 0 || j <= i) throw new Error('JSON 을 찾지 못함');
  return JSON.parse(body.slice(i, j + 1));
}
