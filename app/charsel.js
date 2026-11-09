// 글자 범위 색(11-09 사용자 「글자색 편집은 글자 하나하나 단위로 열어 주라 — 드래그해서 수정할 수 있게」).
//   고른 프레임에서 글자를 더블클릭(또는 인스펙터 「글자 일부 색」)하면 그 프레임이 글자 고르기 모드가 된다:
//   미리보기 글자를 끌어 고르면 그 자리에 색 고르기가 뜨고, 색을 고르면 그 글자만 칠한다(core/elementedit.js runs).
//   Esc · 「끝내기」 · 다른 프레임 고르기로 나온다. 새로 그려져도(색 적용 후) 모드는 유지된다.
//   저장 단위는 요소(data-field 역할 + 몇 번째) 글자(textContent — <br> 은 0글자)의 [s, e) — core/elementedit.js applyRuns 가 같은 셈으로 칠한다.

const CSS_ID = 'charsel-css';
const CSS = '[data-ad]{-webkit-user-select:none;user-select:none}[data-field],[data-field] *{-webkit-user-select:text;user-select:text;cursor:text}::selection{background:rgba(31,79,209,.35)}[contenteditable]{outline:1px dashed rgba(31,79,209,.55);outline-offset:2px;caret-color:#1f4fd1}[contenteditable]:focus{outline:2px solid #1f4fd1}';
const hexOf = css => { const m = String(css).match(/\d+(\.\d+)?/g); if (!m || m.length < 3) return '#000000'; return '#' + m.slice(0, 3).map(v => Math.round(+v).toString(16).padStart(2, '0')).join('').toUpperCase(); };

// 11-09 사용자 「개별은 캔버스에서 바로 수정」: 같은 모드에서 글자를 고친다(contenteditable) — Enter = 줄바꿈 · 바깥 클릭·Esc = 저장(onText → 그 소재만) · 취소는 ⌘Z
const EDITABLE = '[data-field="main"],[data-field="sub"],[data-field="date"],[data-field="detail"]';
const textOfEl = el => el.innerText.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
// 11-09 사용자 「피그마 UI 랑 비슷해야」: 더블클릭 = 누른 자리에 커서(바로 수정) · 끌어 고르면 오른쪽 패널에 그 범위의 색(onPick) — 글자 옆 팝오버는 쓰지 않는다
export function createCharSel({ frames, keyOf, onApply, onText = () => {}, onPick = () => {}, onState = () => {}, toast = () => {} }) {
  let cur = null;   // { a, key, f, doc, pick: { id, s, e, text } }
  let pop = null;

  const docOf = f => f?.iframe?.contentDocument ?? null;
  function popEl() {
    if (pop) return pop;
    pop = document.createElement('div'); pop.id = 'charPop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', '고른 글자 색');
    pop.innerHTML = `<div class="cp-row"><span class="cp-txt" id="cpTxt"></span></div>
      <div class="cp-row"><input type="color" id="cpColor" aria-label="고른 글자 색"><input type="text" id="cpHex" maxlength="7" aria-label="색 코드" spellcheck="false">
      <button type="button" class="btn" id="cpApply">적용</button><button type="button" class="btn" id="cpClear" title="고른 글자의 따로 칠한 색 지우기">색 지우기</button></div>
      <div class="cp-hint">글자를 끌어 고르세요 · <button type="button" class="lnk" id="cpDone">끝내기(Esc)</button></div>`;
    document.body.appendChild(pop);
    const col = pop.querySelector('#cpColor'), hex = pop.querySelector('#cpHex');
    col.oninput = () => { hex.value = col.value.toUpperCase(); };
    hex.oninput = () => { if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) col.value = hex.value; };
    const apply = c => { if (!cur?.pick) return; const p = cur.pick; onApply(cur.a, p.id, { s: p.s, e: p.e, c }, p.text); };
    pop.querySelector('#cpApply').onclick = () => { const v = (/^#[0-9A-Fa-f]{6}$/.test(hex.value) ? hex.value : col.value).toUpperCase(); apply(v); };
    col.onchange = () => apply(col.value.toUpperCase());   // 고르기 창을 닫으면 바로 적용
    pop.querySelector('#cpClear').onclick = () => apply(null);
    pop.querySelector('#cpDone').onclick = () => exit();
    return pop;
  }
  const hidePop = () => { if (pop) pop.hidden = true; };

  function onKey(e) { if (e.key === 'Escape' && cur) { e.preventDefault(); exit(); } }
  function arm() {
    if (!cur) return;
    const doc = docOf(cur.f); if (!doc?.head) return;
    if (!doc.getElementById(CSS_ID)) { const st = doc.createElement('style'); st.id = CSS_ID; st.textContent = CSS; doc.head.appendChild(st); }
    for (const el of doc.querySelectorAll(EDITABLE)) { if (el.closest('[data-sample]') || el.dataset.sample) continue; el.contentEditable = 'true'; el.spellcheck = false; el.dataset.orig = textOfEl(el); }
    if (doc.__charsel) return;
    doc.__charsel = true;
    // 글자 고치기: 포커스가 빠질 때 바뀌었으면 저장(그 소재만). 렌더가 다시 그려지면 rearm 이 원래 글자를 다시 잰다
    const commitEl = el => {
      if (!el || !cur) return;
      const now = textOfEl(el), was = el.dataset.orig ?? '';
      if (now === was) return;
      if (!now) { el.innerText = was; toast('비우면 저장하지 않아요 — 이 줄을 빼려면 Delete, 자동 문구로 되돌리려면 왼쪽 패널에서'); return; }
      const role = el.dataset.field, n = [...doc.querySelectorAll(`[data-field="${role}"]`)].indexOf(el);
      el.dataset.orig = now;
      onText(cur.a, n > 0 ? `${role}#${n}` : role, now, was);
    };
    doc.addEventListener('focusout', e => commitEl(e.target?.closest?.(EDITABLE)));
    doc.addEventListener('keydown', e => {
      const el = e.target?.closest?.(EDITABLE); if (!el) return;
      // 11-09 사용자 「엔터 하면 여기서 줄바꿈 되고 조절되도록」: Enter = 커서 자리 줄바꿈(피그마처럼). 저장은 바깥 클릭·Esc(저장하고 끝내기) · 취소는 ⌘Z
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); doc.execCommand('insertLineBreak'); }
      else if (e.key === 'Escape') { e.preventDefault(); commitEl(el); el.blur(); }   // 저장하고 끝내기(keyup 에서 exit)
    });
    doc.addEventListener('mouseup', () => setTimeout(check, 0));
    doc.addEventListener('keyup', e => { if (e.key === 'Escape') exit(); else check(); });
  }
  function check() {
    if (!cur) return;
    const doc = docOf(cur.f), sel = doc?.getSelection?.();
    const clear = () => { if (cur.pick) { cur.pick = null; onPick(null, cur.a); } };
    if (!sel || !sel.rangeCount || sel.isCollapsed) return clear();
    const r = sel.getRangeAt(0);
    const fieldOf = n => (n?.nodeType === 1 ? n : n?.parentElement)?.closest?.('[data-field]') ?? null;
    const f0 = fieldOf(r.startContainer), f1 = fieldOf(r.endContainer);
    if (!f0 || f0 !== f1) { clear(); toast('한 문구 안에서 골라 주세요'); return; }
    const off = (node, o) => { const q = doc.createRange(); q.setStart(f0, 0); q.setEnd(node, o); return q.toString().length; };
    const s = off(r.startContainer, r.startOffset), e = off(r.endContainer, r.endOffset);
    if (e <= s) return clear();
    const role = f0.dataset.field, n = [...doc.querySelectorAll(`[data-field="${role}"]`)].indexOf(f0);
    const text = f0.textContent;
    const color = hexOf(doc.defaultView.getComputedStyle((r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement)).color);
    const pick = { id: n > 0 ? `${role}#${n}` : role, s, e, text, part: text.slice(s, e), color };
    if (cur.pick && cur.pick.id === pick.id && cur.pick.s === s && cur.pick.e === e) return;
    cur.pick = pick; onPick(pick, cur.a);
  }


  // 더블클릭한 자리(화면 좌표)의 글자에 커서를 둔다 — iframe 은 보드 배율로 줄어 있어 문서 좌표로 바꾼다
  function caretAt(pt) {
    if (!cur || !pt) return;
    const doc = docOf(cur.f); if (!doc) return;
    const ir = cur.f.iframe.getBoundingClientRect(), k = ir.width / Math.max(1, cur.f.iframe.clientWidth || ir.width);
    const x = (pt.x - ir.left) / k, y = (pt.y - ir.top) / k;
    const el = doc.elementFromPoint(x, y)?.closest?.(EDITABLE); if (!el || el.contentEditable !== 'true') return;
    el.focus();
    const rg = doc.caretRangeFromPoint?.(x, y); const sel = doc.getSelection();
    if (rg && sel) { sel.removeAllRanges(); sel.addRange(rg); }
  }
  function enter(a, pt = null) {
    const key = keyOf(a), f = frames.get(key); if (!f) return;
    if (cur && cur.key === key) { caretAt(pt); return; }
    if (cur && cur.key !== key) exit();
    cur = { a, key, f, pick: null };
    f.frame.classList.add('charsel');
    f.iframe.addEventListener('load', arm);
    document.addEventListener('keydown', onKey);
    arm(); onState(true, a);
    try { f.iframe.focus(); } catch {}
    setTimeout(() => caretAt(pt), 0);
    if (!pt) toast('글자를 고치면 이 소재만 바뀌어요 · Enter 줄바꿈 · 끌어 고르면 오른쪽 패널에서 색 · Esc 저장하고 끝내기');
  }
  function exit() {
    if (!cur) return;
    const { f } = cur, doc = docOf(f);
    f.frame.classList.remove('charsel'); f.iframe.removeEventListener('load', arm);
    try { doc?.activeElement?.blur?.(); } catch {}   // 고치던 글자는 저장(focusout)
    doc?.getElementById(CSS_ID)?.remove(); try { doc?.getSelection?.().removeAllRanges(); } catch {}
    for (const el of doc?.querySelectorAll?.('[contenteditable]') ?? []) el.removeAttribute('contenteditable');
    document.removeEventListener('keydown', onKey);
    const a = cur.a, hadPick = !!cur.pick; cur = null; hidePop(); if (hadPick) onPick(null, a); onState(false, a);
  }
  // 프레임이 새로 그려진 뒤(색 적용 · 실시간 미리보기) — 글자 고르기 스타일·이벤트를 다시 건다
  function rearm(key) { if (cur && (!key || key === cur.key)) { cur.f = frames.get(cur.key) ?? cur.f; arm(); hidePop(); if (cur.pick) { cur.pick = null; onPick(null, cur.a); } } }
  return { enter, exit, rearm, get key() { return cur?.key ?? null; }, get on() { return !!cur; }, get pick() { return cur?.pick ?? null; } };
}
