// 요소 AI 편집 팝오버(11-10 사용자 「영역 클릭하면 우측에 AI 아이콘 → 누르고 '더 강약을 줘' 하면 반영」 — 피그마 AI 처럼).
//   캔버스에서 요소를 고르면 선택 상자 오른쪽 위 바깥에 작은 AI 아이콘(app/elselect.js E.aiOpen). 누르면 그 자리 팝오버:
//   고른 요소 칩 · 입력창 · 추천 칩 → Enter 로 보냄 · Esc 닫기.
//   ① 규칙(core/elementai.js quickElementEdit)으로 되면 LLM 없이 바로 ② 아니면 로컬 서버 POST /api/element-edit(claude -p) — 대기 중 진행·취소.
//   결과는 바로 캔버스에 입히고(되돌리기 한 걸음) 「적용 / 되돌리기」. 공개 앱(서버 없음)은 ① 만 — ② 는 「로컬 앱에서만」 안내.
import { quickElementEdit, validateElementOps, suggestionsFor } from '../core/elementai.js';
import { elementName, parseElementId } from '../core/elementedit.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const AI_ICON = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.5l1.5 4 4 1.5-4 1.5L8 12.5 6.5 8.5l-4-1.5 4-1.5z" fill="currentColor"/><path d="M13 10.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="currentColor"/></svg>';

// deps: { ctxOf(a,id) → 요청 재료, apply(a,id,ops,label) → 커밋(되돌리기 한 걸음), undo(), health() → Promise<{ server, elementEdit, kvEdit }>, toast,
//         imageOf(a,id) → 지금 그 소재 그림 dataUrl(원본 우선), applyImage(a,id,dataUrl,label) → 이 소재만 새 그림 }
export function createElAi(deps) {
  let pop = null, cur = null, ac = null, tick = 0;
  const kindOf = id => (id === 'kv' ? 'kv' : id === 'logo' ? 'logo' : 'text');
  function el() {
    if (pop) return pop;
    pop = document.createElement('div'); pop.id = 'elAiPop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'AI로 고치기'); pop.hidden = true;
    document.body.appendChild(pop);
    pop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } });
    pop.addEventListener('pointerdown', e => e.stopPropagation());
    document.addEventListener('pointerdown', e => { if (pop && !pop.hidden && !pop.contains(e.target) && !e.target.closest?.('.eai-btn')) close(); });
    return pop;
  }
  function paint(state = {}) {
    const { a, id } = cur, kind = kindOf(id), { role } = parseElementId(id);
    const sugs = suggestionsFor(kind, role);
    const p = el();
    p.innerHTML = `<div class="eai-head"><span class="eai-chip"><b aria-hidden="true">${kind === 'text' ? 'T' : kind === 'kv' ? '▣' : '◎'}</b>${esc(elementName(id))}</span><button type="button" class="fib eai-x" aria-label="닫기 (Esc)" title="닫기 (Esc)"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button></div>
      <form class="eai-form"><input type="text" class="eai-in" placeholder="${kind === 'text' ? '예: 더 강약을 줘' : '예: 조금 크게'}" aria-label="${esc(elementName(id))} 고칠 내용" autocomplete="off" ${state.busy ? 'disabled' : ''}><button type="submit" class="eai-go" aria-label="보내기 (Enter)" ${state.busy ? 'disabled' : ''}><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button></form>
      ${state.busy || state.done ? '' : `<div class="eai-sugs">${sugs.map(s => `<button type="button" class="eai-sug">${esc(s)}</button>`).join('')}</div>`}
      <div class="eai-status" role="status" aria-live="polite">${state.msg ? esc(state.msg) : ''}</div>
      ${state.busy ? '<div class="eai-acts"><button type="button" class="btn eai-cancel">취소</button></div>' : state.done ? '<div class="eai-acts"><button type="button" class="btn eai-undo">되돌리기</button><button type="button" class="btn pri eai-ok">적용</button></div>' : ''}`;
    const inp = p.querySelector('.eai-in');
    p.querySelector('.eai-x').onclick = () => close();
    p.querySelector('.eai-form').onsubmit = e => { e.preventDefault(); const t = inp.value.trim(); if (t) send(t); };
    p.querySelectorAll('.eai-sug').forEach(b => b.onclick = () => { inp.value = b.textContent; send(b.textContent); });
    p.querySelector('.eai-cancel')?.addEventListener('click', () => { ac?.abort(); });
    p.querySelector('.eai-ok')?.addEventListener('click', () => close());
    p.querySelector('.eai-undo')?.addEventListener('click', () => { deps.undo(); close(); deps.toast?.('되돌렸어요'); });
    if (state.instr) inp.value = state.instr;
    if (!state.busy) setTimeout(() => (state.done ? p.querySelector('.eai-ok') : inp)?.focus(), 0);
  }
  function place(anchor) {
    const p = el(), r = anchor?.getBoundingClientRect?.() ?? { left: 200, top: 200, right: 200, bottom: 200 };
    p.hidden = false;
    const w = p.offsetWidth || 300, h = p.offsetHeight || 160;
    let x = r.right + 8, y = r.top;
    if (x + w > innerWidth - 8) x = Math.max(8, r.left - w - 8);
    if (y + h > innerHeight - 8) y = Math.max(8, innerHeight - h - 8);
    p.style.left = `${Math.round(x)}px`; p.style.top = `${Math.round(y)}px`;
  }
  function open(a, id, anchor) {
    cur = { a, id, anchor };
    paint(); place(anchor);
  }
  function close() { ac?.abort(); ac = null; clearInterval(tick); if (pop) pop.hidden = true; const k = cur; cur = null; k?.anchor?.focus?.({ preventScroll: true }); }
  async function send(instr) {
    if (!cur) return;
    const { a, id } = cur, kind = kindOf(id);
    const ctx = deps.ctxOf(a, id); if (!ctx) { paint({ msg: '요소를 찾지 못했어요', instr }); return; }
    const t0 = performance.now();
    // ① 규칙
    const q = quickElementEdit({ ...ctx, kind, instr });
    if (q.ok) {
      const v = validateElementOps(q.ops, { ...ctx, kind });
      if (!Object.keys(v.ops).length) { paint({ msg: v.notes.join(' · ') || '바꿀 게 없어요', instr }); return; }
      deps.apply(a, id, v.ops, `AI 「${instr}」`);
      const ms = Math.round(performance.now() - t0);
      cur && paint({ done: true, instr, msg: `규칙으로 바로 · ${ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`} — ${q.applied.join(' · ')}${v.notes.length ? ` · ${v.notes.join(' · ')}` : ''}` });
      if (cur) cur.last = { path: 'rule', ms, applied: q.applied, notes: v.notes };
      return;
    }
    if (kind !== 'text') return sendImage(a, id, kind, instr, q.reason);
    // ② 로컬 AI 서버
    const h = await deps.health();
    if (!h?.server || !h?.elementEdit) { paint({ msg: `이 지시는 로컬 앱(AI 서버)에서만 돼요 — 여기서 바로 되는 것: 굵게·얇게·크게·작게·색·정렬·자간·강약·한 줄로·「낱말」만 ~ (${q.reason})`, instr }); return; }
    ac = new AbortController();
    const started = Date.now();
    paint({ busy: true, instr, msg: 'AI가 고치는 중… 0s' });
    clearInterval(tick); tick = setInterval(() => { const s = pop?.querySelector('.eai-status'); if (s) s.textContent = `AI가 고치는 중… ${Math.round((Date.now() - started) / 1000)}s`; }, 1000);
    try {
      const r = await fetch('/api/element-edit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...ctx, kind, instr }), signal: ac.signal });
      const j = await r.json().catch(() => ({}));
      clearInterval(tick);
      if (!r.ok) { cur && paint({ msg: `AI 수정 실패: ${j.error ?? r.status}`, instr }); return; }
      if (!cur || cur.a !== a || cur.id !== id) return;
      if (!Object.keys(j.ops ?? {}).length) { paint({ msg: `바꿀 게 없어요${j.notes?.length ? ` — ${j.notes.join(' · ')}` : ''}`, instr }); return; }
      deps.apply(a, id, j.ops, `AI 「${instr}」`);
      const ms = Date.now() - started;
      paint({ done: true, instr, msg: `AI · ${(ms / 1000).toFixed(1)}s${j.note ? ` — ${j.note}` : ''}${j.notes?.length ? ` · ${j.notes.join(' · ')}` : ''}` });
      cur.last = { path: 'ai', ms, serverMs: j.ms, note: j.note, notes: j.notes, ops: j.ops };
    } catch (e) {
      clearInterval(tick);
      if (e?.name === 'AbortError') { cur && paint({ msg: '취소했어요', instr }); return; }
      cur && paint({ msg: `AI 서버에 닿지 못했어요: ${e.message}`, instr });
    } finally { ac = null; }
  }
  // ③ 그림·로고(11-10 저녁 사용자 「배경 제거 같은 것도 연결된 Claude 로 확실하게」): 로컬 서버 POST /api/kv-edit —
  //   Claude 가 누끼 옵션을 고르고 로컬 도구가 따고 Claude(opus)가 원본과 나란히 검수, 4점 이상만 넣는다(3점은 「작은 흠」, 2점 이하는 그대로 둠).
  //   결과는 이 소재만 새 그림(deps.applyImage → 이 소재 그림 바꾸기와 같은 길, 되돌리기 한 걸음)
  async function sendImage(a, id, kind, instr, reason) {
    const h = await deps.health();
    if (!h?.server || !h?.kvEdit || !deps.imageOf || !deps.applyImage) { paint({ msg: `여기서 바로 되는 것: 크게·작게·왼쪽/오른쪽/위/아래로. 배경 제거 같은 그림 편집은 로컬 앱(Claude 연결)에서 돼요 (${reason})`, instr }); return; }
    const image = deps.imageOf(a, id); if (!image) { paint({ msg: '이 요소의 그림을 찾지 못했어요', instr }); return; }
    ac = new AbortController();
    const started = Date.now();
    paint({ busy: true, instr, msg: 'Claude가 그림을 보고 따는 중… 0s' });
    clearInterval(tick); tick = setInterval(() => { const s = pop?.querySelector('.eai-status'); if (s) s.textContent = `Claude가 그림을 보고 따는 중… ${Math.round((Date.now() - started) / 1000)}s (보통 20~60초)`; }, 1000);
    try {
      const r = await fetch('/api/kv-edit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ instr, kind, image, roleName: elementName(id) }), signal: ac.signal });
      const j = await r.json().catch(() => ({}));
      clearInterval(tick);
      if (!r.ok) { cur && paint({ msg: `AI 수정 실패: ${j.error ?? r.status}`, instr }); return; }
      if (!cur || cur.a !== a || cur.id !== id) return;
      const ms = Date.now() - started, n = j.tries?.length ?? 0;
      if (!j.image) { paint({ msg: `그림은 그대로 뒀어요 — ${j.note ?? '할 수 없는 지시예요'}${n ? ` (${n}번 시도)` : ''}`, instr }); cur.last = { path: 'kv', ms, ok: false, tries: j.tries, note: j.note }; return; }
      await deps.applyImage(a, id, j.image, `AI 「${instr}」`);
      cur && paint({ done: true, instr, msg: `Claude · ${(ms / 1000).toFixed(0)}s · 검수 ${j.score ?? '?'}/5${n > 1 ? ` · ${n}번째 시도` : ''} — ${j.note ?? ''}` });
      if (cur) cur.last = { path: 'kv', ms, ok: true, score: j.score, tries: j.tries, note: j.note };
    } catch (e) {
      clearInterval(tick);
      if (e?.name === 'AbortError') { cur && paint({ msg: '취소했어요', instr }); return; }
      cur && paint({ msg: `AI 서버에 닿지 못했어요: ${e.message}`, instr });
    } finally { ac = null; }
  }
  return { open, close, get on() { return !!cur; }, get last() { return cur?.last ?? null; } };
}
