// 프레임 안 요소 고르기(11-02 사용자 「프레임 안에서 개별로 선택해서도 조정이 될 수 있도록」, hub/canvas.js 의 선택 상자·핸들을 앱으로).
//   프레임을 고른 뒤 글자(data-field)·로고(data-logo)·키비주얼(data-object)을 누르면 테두리와 네 모서리 핸들. 끌어 옮기기 · 모서리 크기 · 화살표 1px(Shift 10) · +/− 크기 · Esc 위로.
//   저장: 글자 → overrides.elements(core/elementedit.js) · 그림·로고 → overrides.layout(manualLayout, 틀 칸이라 안 들으면 overrides.elements).
//   경계는 직접 수정과 같은 계산(core/editlayout.js) — 안전영역 밖이면 빨간 테두리, 놓으면 안쪽으로.
//   끄는 동안은 campaign 을 안 고친다(E.live) — 놓을 때 E.commit 한 번이 되돌리기 한 걸음.

import { normLayout, invertBox, applyBox, anchorOf, outOfBounds, snapDelta, clampScale } from '../core/editlayout.js';
import { elementId, elementName, withElementEdit } from '../core/elementedit.js';

const rel = (el, base) => { const r = el.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }; };
const union = rs => { const v = rs.filter(r => r && r.w > 0 && r.h > 0); if (!v.length) return null; const x0 = Math.min(...v.map(r => r.x)), y0 = Math.min(...v.map(r => r.y)), x1 = Math.max(...v.map(r => r.x + r.w)), y1 = Math.max(...v.map(r => r.y + r.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };

// 렌더된 문서에서 고를 수 있는 요소 — 문서 순서. core/elementedit.js 의 id 와 같은 번호(역할 안 몇 번째)
export function listElements(doc) {
  const root = doc?.querySelector('[data-ad]'); if (!root) return [];
  const base = root.getBoundingClientRect(), out = [], seen = new Map();
  for (const el of root.querySelectorAll('[data-field]')) {
    const role = el.dataset.field, n = seen.get(role) ?? 0; seen.set(role, n + 1);
    const box = rel(el, base); if (box.w < 1 || box.h < 1) continue;
    out.push({ id: elementId(role, n), kind: 'text', role, el, box });
  }
  const logoImg = root.querySelector('[data-logo]');
  if (logoImg) { const box = rel(logoImg, base); if (box.w >= 1) out.push({ id: 'logo', kind: 'logo', role: 'logo', el: logoImg, box }); }
  const objs = [...root.querySelectorAll('[data-object]')].filter(el => el.dataset.object !== 'logo' && !el.parentElement.closest('[data-object]'));
  const kvBox = union(objs.map(el => rel(el, base)));
  if (kvBox) out.push({ id: 'kv', kind: 'kv', role: 'kv', el: objs[0], box: kvBox });
  return out;
}

export function createElementSelect(E) {
  // E: { frames, keyOf, specOf, zoom(), partsOf(a), commit(a,{elements,layout},label,coalesce), live(a,{elements,layout,ov}), liveStop(), pick(a,id), up(a), locks(a,id) }
  let ovl = null;   // { a, id, el(레이어), box(버튼) }
  const frameOf = a => E.frames.get(E.keyOf(a));
  const docOf = a => frameOf(a)?.iframe?.contentDocument ?? null;
  const dsOf = a => { const f = frameOf(a), b = f?.frame.querySelector('.fbody'), s = E.specOf(a); return b && s?.w ? b.clientWidth / s.w : 1; };
  const list = a => listElements(docOf(a));
  const find = (a, id) => list(a).find(x => x.id === id) ?? null;

  // 누른 자리의 요소 — 글자가 먼저(가장 작은 상자), 그다음 로고, 그다음 키비주얼
  function at(a, e) {
    const f = frameOf(a), ifr = f?.iframe, doc = ifr?.contentDocument; if (!doc) return null;
    const r = ifr.getBoundingClientRect(), k = r.width / (ifr.offsetWidth || r.width), x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k;
    const hits = list(a).filter(it => x >= it.box.x && x <= it.box.x + it.box.w && y >= it.box.y && y <= it.box.y + it.box.h);
    const by = kind => hits.filter(h => h.kind === kind).sort((p, q) => p.box.w * p.box.h - q.box.w * q.box.h)[0];
    return (by('text') ?? by('logo') ?? by('kv'))?.id ?? null;
  }

  // 지금 값 + 변형 전 상자 — 그림·로고는 직접 수정(몫 단위), 글자는 px
  function xform(a, it) {
    const spec = E.specOf(a), W = spec.w, H = spec.h, box = it.box;
    if (it.kind === 'text') { const e = a.overrides?.elements?.[it.id] ?? {}; const cur = { dx: e.dx ?? 0, dy: e.dy ?? 0 }; return { W, H, box, cur, mode: 'text', base: { ...box, x: box.x - cur.dx, y: box.y - cur.dy } }; }
    const P = E.partsOf(a); const mode = P?.[it.kind] ? 'layout' : 'patch';
    const cur = mode === 'layout' ? (normLayout(a.overrides?.layout)?.[it.kind] ?? null) : (a.overrides?.elements?.[it.kind] ?? null);
    const base = invertBox(box, cur, W, H);
    return { W, H, box, cur, mode, base, anchor: cur?.ox != null ? { ox: cur.ox, oy: cur.oy } : anchorOf(base, W, H) };
  }
  const withKind = (a, kind, p, mode) => mode === 'layout'
    ? { layout: normLayout({ ...(normLayout(a.overrides?.layout) ?? {}), [kind]: p }) }
    : { elements: withElementEdit(a.overrides?.elements, kind, p) };

  // 값 만들기: 이동량(캔버스 px)·새 상자 → 저장 값과 그때의 상자
  function moved(a, it, st, dxPx, dyPx) {
    if (st.mode === 'text') { const p = { dx: st.cur.dx + dxPx, dy: st.cur.dy + dyPx }; return { p, nb: { ...st.base, x: st.base.x + p.dx, y: st.base.y + p.dy } }; }
    const c0 = st.cur ?? { dx: 0, dy: 0, scale: 1 };
    const p = { dx: (c0.dx ?? 0) + dxPx / st.W, dy: (c0.dy ?? 0) + dyPx / st.H, scale: c0.scale ?? 1, ox: st.anchor.ox, oy: st.anchor.oy };
    return { p, nb: applyBox(st.base, p, st.W, st.H) };
  }
  // 모서리 끌기: 반대쪽 모서리를 붙박고 비율대로 — 그 상자가 되도록 이동량을 되짚는다(원점 ox·oy 와 무관)
  function resized(a, it, st, corner, dX, dY) {
    const b = st.box, fx = corner[1] === 'r' ? b.x : b.x + b.w, fy = corner[0] === 'b' ? b.y : b.y + b.h;
    const px = (corner[1] === 'r' ? b.x + b.w : b.x) + dX, py = (corner[0] === 'b' ? b.y + b.h : b.y) + dY;
    const k0 = Math.max(Math.abs(px - fx) / Math.max(1, b.w), Math.abs(py - fy) / Math.max(1, b.h));
    if (st.mode === 'text') return { k: Math.max(0.2, k0) };
    const cs = st.cur?.scale ?? 1, s = clampScale(cs * Math.max(0.05, k0)), k = s / cs, w = b.w * k, h = b.h * k;
    const nb = { x: corner[1] === 'r' ? fx : fx - w, y: corner[0] === 'b' ? fy : fy - h, w, h };
    const ox = st.anchor.ox, oy = st.anchor.oy, O = { x: ox * st.W, y: oy * st.H };
    return { p: { dx: (nb.x - O.x - (st.base.x - O.x) * s) / st.W, dy: (nb.y - O.y - (st.base.y - O.y) * s) / st.H, scale: s, ox, oy }, nb };
  }
  const checkBad = (it, st, nb, p) => outOfBounds(it.kind === 'text' ? 'text' : it.kind, nb, st.spec, p?.scale ?? 1, it.kind === 'kv' ? null : st.base);
  // 놓을 때 — 밖이면 안쪽으로 되돌려 저장
  function settle(a, it, st, q, label, coalesce) {
    const { p, nb } = q;
    if (checkBad(it, st, nb, p)) {
      const d = snapDelta(it.kind === 'text' ? 'text' : it.kind, nb, st.spec, it.kind === 'kv' ? null : st.base);
      if (st.mode === 'text') { p.dx += d.ddx; p.dy += d.ddy; } else { p.dx += d.ddx / st.W; p.dy += d.ddy / st.H; }
    }
    const patch = st.mode === 'text' ? { elements: withElementEdit(a.overrides?.elements, it.id, { dx: p.dx, dy: p.dy }) } : withKind(a, it.kind, p, st.mode);
    E.commit(a, patch, label, coalesce);
  }
  const previewOf = (a, it, st, q) => st.mode === 'text' ? { elements: withElementEdit(a.overrides?.elements, it.id, { dx: q.p.dx, dy: q.p.dy }) } : withKind(a, it.kind, q.p, st.mode);

  function hide() { ovl?.el?.remove(); ovl = null; }
  function place(btn, box, ds) { btn.style.left = `${box.x * ds}px`; btn.style.top = `${box.y * ds}px`; btn.style.width = `${Math.max(6, box.w * ds)}px`; btn.style.height = `${Math.max(6, box.h * ds)}px`; }

  function show(a, id) {
    const hadFocus = ovl?.box && document.activeElement === ovl.box;
    hide();
    if (!a || !id) return;
    const it = find(a, id), f = frameOf(a); if (!it || !f) return;
    const body = f.frame.querySelector('.fbody'), ds = dsOf(a), locks = E.locks(a, id);
    const el = document.createElement('div'); el.className = 'eov'; el.style.cssText = `width:${body.clientWidth}px;height:${body.clientHeight}px`;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = `esel esel-${it.kind}`; btn.dataset.el = id;
    btn.setAttribute('aria-label', `${elementName(id)} 선택됨 — 화살표 1px 이동 · Shift+화살표 10px${locks.size ? '' : ' · +/− 크기'} · Esc 위로`);
    place(btn, it.box, ds);
    btn.innerHTML = `<span class="esel-tag" aria-hidden="true">${elementName(id)}</span>${locks.size ? '' : ['tl', 'tr', 'bl', 'br'].map(c => `<span class="egrip egrip-${c}" data-c="${c}" aria-hidden="true"></span>`).join('')}`;
    el.appendChild(btn); f.frame.appendChild(el);
    ovl = { a, id, el, box: btn };
    bind(a, id, btn, ds);
    if (hadFocus) btn.focus({ preventScroll: true });
  }
  function bind(a, id, btn, ds) {
    btn.addEventListener('click', e => e.stopPropagation());
    btn.addEventListener('pointerdown', e => {
      e.stopPropagation(); e.preventDefault();
      if (e.button !== 0) return;
      btn.focus({ preventScroll: true });
      const it = find(a, id); if (!it) return;
      const st = { ...xform(a, it), spec: E.specOf(a) };
      const corner = e.target.dataset?.c ?? null, z = E.zoom() * ds, x0 = e.clientX, y0 = e.clientY;
      let last = null, movedAny = false;
      try { btn.setPointerCapture(e.pointerId); } catch {}
      const move = ev => {
        const dX = (ev.clientX - x0) / z, dY = (ev.clientY - y0) / z;
        if (!movedAny && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 3) return;
        movedAny = true;
        if (corner) {
          const q = resized(a, it, st, corner, dX, dY); last = q;
          if (st.mode === 'text') { place(btn, { ...st.box, w: st.box.w * q.k, h: st.box.h * q.k }, ds); E.liveText?.(a, id, q.k); return; }
          place(btn, q.nb, ds); btn.classList.toggle('oob', !!checkBad(it, st, q.nb, q.p)); E.live(a, previewOf(a, it, st, q));
        } else {
          const q = moved(a, it, st, dX, dY); last = q;
          place(btn, q.nb, ds); btn.classList.toggle('oob', !!checkBad(it, st, q.nb, q.p)); E.live(a, previewOf(a, it, st, q));
        }
      };
      const up = ev => {
        btn.removeEventListener('pointermove', move); btn.removeEventListener('pointerup', up); btn.removeEventListener('pointercancel', up);
        if (!movedAny) { const next = at(a, ev); if (next && next !== id) E.pick(a, next); return; }   // 끌지 않고 눌렀으면 그 자리의 요소로(큰 그림 위 글자)
        if (corner && st.mode === 'text') { E.commitTextScale?.(a, id, last.k); return; }
        settle(a, it, st, last, `${elementName(id)} ${corner ? '크기' : '옮김'}`, false);
      };
      btn.addEventListener('pointermove', move); btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up);
    });
    btn.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); E.up(a); return; }
      const step = e.shiftKey ? 10 : 1;
      const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      const sc = { '+': 1.02, '=': 1.02, '-': 1 / 1.02, _: 1 / 1.02 }[e.key] ?? null;
      if (!mv && !sc) return;
      e.preventDefault(); e.stopPropagation();
      const it = find(a, id); if (!it) return;
      const st = { ...xform(a, it), spec: E.specOf(a) };
      if (mv) { settle(a, it, st, moved(a, it, st, mv[0], mv[1]), `${elementName(id)} 미세 이동`, true); return; }
      if (E.locks(a, id).size) return;
      if (st.mode === 'text') { E.commitTextScale?.(a, id, sc); return; }
      const c0 = st.cur?.scale ?? 1, s = clampScale(c0 * sc), p = { dx: st.cur?.dx ?? 0, dy: st.cur?.dy ?? 0, scale: s, ox: st.anchor.ox, oy: st.anchor.oy };
      settle(a, it, st, { p, nb: applyBox(st.base, p, st.W, st.H) }, `${elementName(id)} 크기`, true);
    });
  }

  // 올려 둔 자리 표시 — 프레임을 고른 동안 어디를 누를 수 있는지
  let hov = null;
  function hover(a, e) {
    const id = e ? at(a, e) : null;
    if (hov && (!id || hov.dataset.el !== id || hov.parentElement?.dataset.key !== E.keyOf(a))) { hov.parentElement?.remove(); hov = null; }
    if (!id || hov || ovl?.id === id) return;
    const it = find(a, id), f = frameOf(a); if (!it || !f) return;
    const body = f.frame.querySelector('.fbody'), lay = document.createElement('div');
    lay.className = 'eov'; lay.dataset.key = E.keyOf(a); lay.style.cssText = `width:${body.clientWidth}px;height:${body.clientHeight}px`;
    hov = document.createElement('div'); hov.className = 'ehov'; hov.dataset.el = id; place(hov, it.box, dsOf(a));
    lay.appendChild(hov); f.frame.appendChild(lay);
  }

  // 패널 숫자 칸 — 위치 X·Y(캔버스 px), W·H(그림·로고)
  function setXY(a, id, x, y) {
    const it = find(a, id); if (!it) return;
    const st = { ...xform(a, it), spec: E.specOf(a) };
    const dx = (x ?? it.box.x) - it.box.x, dy = (y ?? it.box.y) - it.box.y; if (!dx && !dy) return;
    settle(a, it, st, moved(a, it, st, dx, dy), `${elementName(id)} 위치`, false);
  }
  function setSize(a, id, w, h) {
    const it = find(a, id); if (!it || it.kind === 'text') return;
    const st = { ...xform(a, it), spec: E.specOf(a) }, k = w != null ? w / it.box.w : h / it.box.h; if (!(k > 0) || Math.abs(k - 1) < 1e-3) return;
    const s = clampScale((st.cur?.scale ?? 1) * k), kk = s / (st.cur?.scale ?? 1), nb = { x: it.box.x, y: it.box.y, w: it.box.w * kk, h: it.box.h * kk };
    const O = { x: st.anchor.ox * st.W, y: st.anchor.oy * st.H }, p = { dx: (nb.x - O.x - (st.base.x - O.x) * s) / st.W, dy: (nb.y - O.y - (st.base.y - O.y) * s) / st.H, scale: s, ox: st.anchor.ox, oy: st.anchor.oy };
    settle(a, it, st, { p, nb }, `${elementName(id)} 크기`, false);
  }

  return { list, find, at, show, hide, hover, setXY, setSize, get current() { return ovl ? { key: E.keyOf(ovl.a), id: ovl.id } : null; }, focus() { ovl?.box?.focus({ preventScroll: true }); } };
}
