// 글자 범위 색(11-09 사용자 「글자색 편집은 글자 하나하나 단위로 열어 주라 — 드래그해서 수정할 수 있게」).
//   고른 프레임에서 글자를 더블클릭(또는 인스펙터 「글자 일부 색」)하면 그 프레임이 글자 고르기 모드가 된다:
//   미리보기 글자를 끌어 고르면 그 자리에 색 고르기가 뜨고, 색을 고르면 그 글자만 칠한다(core/elementedit.js runs).
//   Esc · 「끝내기」 · 다른 프레임 고르기로 나온다. 새로 그려져도(색 적용 후) 모드는 유지된다.
//   저장 단위는 요소(data-field 역할 + 몇 번째) 글자(textContent — <br> 은 0글자)의 [s, e) — core/elementedit.js applyRuns 가 같은 셈으로 칠한다.

const CSS_ID = 'charsel-css';
const CSS = '[data-ad]{-webkit-user-select:none;user-select:none}[data-field],[data-field] *{-webkit-user-select:text;user-select:text;cursor:text}::selection{background:rgba(31,79,209,.35)}';
const hexOf = css => { const m = String(css).match(/\d+(\.\d+)?/g); if (!m || m.length < 3) return '#000000'; return '#' + m.slice(0, 3).map(v => Math.round(+v).toString(16).padStart(2, '0')).join('').toUpperCase(); };

export function createCharSel({ frames, keyOf, onApply, onState = () => {}, toast = () => {} }) {
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
    if (doc.__charsel) return;
    doc.__charsel = true;
    doc.addEventListener('mouseup', () => setTimeout(check, 0));
    doc.addEventListener('keyup', e => { if (e.key === 'Escape') exit(); else check(); });
  }
  function check() {
    if (!cur) return;
    const doc = docOf(cur.f), sel = doc?.getSelection?.();
    if (!sel || !sel.rangeCount || sel.isCollapsed) { cur.pick = null; hidePop(); return; }
    const r = sel.getRangeAt(0);
    const fieldOf = n => (n?.nodeType === 1 ? n : n?.parentElement)?.closest?.('[data-field]') ?? null;
    const f0 = fieldOf(r.startContainer), f1 = fieldOf(r.endContainer);
    if (!f0 || f0 !== f1) { cur.pick = null; hidePop(); toast('한 문구 안에서 골라 주세요'); return; }
    const off = (node, o) => { const q = doc.createRange(); q.setStart(f0, 0); q.setEnd(node, o); return q.toString().length; };
    const s = off(r.startContainer, r.startOffset), e = off(r.endContainer, r.endOffset);
    if (e <= s) { hidePop(); return; }
    const role = f0.dataset.field, n = [...doc.querySelectorAll(`[data-field="${role}"]`)].indexOf(f0);
    const text = f0.textContent;
    cur.pick = { id: n > 0 ? `${role}#${n}` : role, s, e, text };
    // 자리 — iframe 은 보드 배율로 줄어 있다: 문서 좌표 × (화면 폭 / 문서 폭)
    const ir = cur.f.iframe.getBoundingClientRect(), k = ir.width / Math.max(1, cur.f.iframe.clientWidth || cur.f.iframe.offsetWidth || ir.width);
    const rr = r.getBoundingClientRect();
    const p = popEl(); p.hidden = false;
    p.querySelector('#cpTxt').textContent = `「${text.slice(s, e).slice(0, 24)}${e - s > 24 ? '…' : ''}」 ${e - s}글자`;
    const c0 = hexOf(doc.defaultView.getComputedStyle((r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement)).color);
    p.querySelector('#cpColor').value = c0; p.querySelector('#cpHex').value = c0;
    const x = ir.left + rr.left * k, y = ir.top + rr.bottom * k + 8;
    p.style.left = `${Math.max(8, Math.min(window.innerWidth - p.offsetWidth - 8, x))}px`;
    p.style.top = `${Math.min(window.innerHeight - p.offsetHeight - 8, y)}px`;
  }

  function enter(a) {
    const key = keyOf(a), f = frames.get(key); if (!f) return;
    if (cur && cur.key !== key) exit();
    cur = { a, key, f, pick: null };
    f.frame.classList.add('charsel');
    f.iframe.addEventListener('load', arm);
    document.addEventListener('keydown', onKey);
    arm(); onState(true, a);
    toast('글자를 끌어 고르면 색을 바꿀 수 있어요 · Esc 로 끝내기');
  }
  function exit() {
    if (!cur) return;
    const { f } = cur, doc = docOf(f);
    f.frame.classList.remove('charsel'); f.iframe.removeEventListener('load', arm);
    doc?.getElementById(CSS_ID)?.remove(); try { doc?.getSelection?.().removeAllRanges(); } catch {}
    document.removeEventListener('keydown', onKey);
    const a = cur.a; cur = null; hidePop(); onState(false, a);
  }
  // 프레임이 새로 그려진 뒤(색 적용 · 실시간 미리보기) — 글자 고르기 스타일·이벤트를 다시 건다
  function rearm(key) { if (cur && (!key || key === cur.key)) { cur.f = frames.get(cur.key) ?? cur.f; arm(); hidePop(); } }
  return { enter, exit, rearm, get key() { return cur?.key ?? null; }, get on() { return !!cur; } };
}
