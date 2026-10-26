// 캔버스 편집기 — 보드(페이지) 렌더 · 선택 · 끌기 · 크기 · 회전 표시 · 룰러 · 안내선 · 간격 재기(⌥) · 줌/이동 · 만들기 도구
//   좌표: 페이지 좌표(프레임 x,y 는 페이지 기준, 자식은 부모 기준). 보드 DOM 은 PAD 만큼 안쪽에서 시작하고 scale(z) 로 그린다.
import { node, solid, imageFill, uid, walk, findNode, parentOf, absPos, frameOf, applyConstraints, relayout, clamp } from './doc.js';

const PAD = 400, RUL = 20;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hexA = (hex, a = 1) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex; const v = parseInt(m[1], 16); return a >= 1 ? '#' + m[1] : `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`; };
const svgNS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, ns) => { const e = ns ? document.createElementNS(svgNS, tag) : document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v); } return e; };

export class Editor {
  constructor(host, doc, hooks = {}) {
    this.host = host; this.doc = doc; this.hooks = hooks; this.sel = []; this.zoom = null; this.tool = 'move'; this.hover = null; this.alt = false; this.space = false; this.showRulers = true; this.showCoords = true;
    host.innerHTML = `<div class="cv-grid"><div class="ruler corner"></div><canvas class="ruler rx"></canvas><canvas class="ruler ry"></canvas>
      <div class="cv" tabindex="-1"><div class="sizer"><div class="board"></div></div><div class="labels"></div><svg class="ov"></svg></div></div><div class="coords" hidden></div>`;
    this.cv = host.querySelector('.cv'); this.sizer = host.querySelector('.sizer'); this.board = host.querySelector('.board'); this.ov = host.querySelector('.ov'); this.labels = host.querySelector('.labels');
    this.rx = host.querySelector('.rx'); this.ry = host.querySelector('.ry'); this.coords = host.querySelector('.coords');
    this.render(); this.wire();
    new ResizeObserver(() => { this.applyZoom(); }).observe(this.cv);
  }
  capture(e) { try { this.cv.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 */ } }
  get page() { return this.doc.pages.find(p => p.id === this.doc.pageId) ?? this.doc.pages[0]; }
  emit(k, ...a) { this.hooks[k]?.(...a); }
  commit(label) { this.emit('commit', label); }

  // ── 렌더 ──
  render() {
    this.board.innerHTML = ''; this.board.style.background = 'transparent'; this.cv.style.background = this.page.bg || '#F5F5F5';
    for (const f of this.page.children) this.board.appendChild(this.renderNode(f));
    this.applyZoom(); this.updateOverlay();
  }
  refresh(id) {   // 노드 하나(와 그 자식) 다시 그림
    const n = findNode(this.page, id); if (!n) return this.render();
    const old = this.board.querySelector(`[data-id="${id}"]`); const fresh = this.renderNode(n);
    if (old) old.replaceWith(fresh); else this.board.appendChild(fresh);
    for (const sid of this.sel) fresh.matches(`[data-id="${sid}"]`) ? fresh.classList.add('sel') : fresh.querySelector(`[data-id="${sid}"]`)?.classList.add('sel');
    this.updateOverlay();
  }
  renderNode(n) {
    const d = el('div', { class: 'nd' + (n.type === 'text' ? ' nd-text' : '') + (n.type === 'frame' ? ' nd-frame' : ''), 'data-id': n.id, 'data-type': n.type });
    const s = d.style; s.left = n.x + 'px'; s.top = n.y + 'px'; s.width = n.w + 'px'; s.height = n.h + 'px';
    if (n.rotation) s.transform = `rotate(${n.rotation}deg)`;
    if (n.opacity != null && n.opacity < 1) s.opacity = n.opacity;
    if (n.blend && n.blend !== 'normal') s.mixBlendMode = n.blend;
    if (n.radius) s.borderRadius = n.radius + 'px';
    if (n.visible === false) s.display = 'none';
    if (n.type === 'frame' && n.clip !== false) s.overflow = 'hidden';
    const fills = (n.fills ?? []).filter(f => f.visible !== false);
    const bgs = fills.filter(f => f.type === 'solid').map(f => `linear-gradient(${hexA(f.color, f.opacity ?? 1)},${hexA(f.color, f.opacity ?? 1)})`);
    if (bgs.length && n.type !== 'text') s.background = bgs.reverse().join(',');
    for (const f of fills) if (f.type === 'image' && n.type !== 'text') { const im = el('img', { class: 'fillimg', src: f.src, draggable: 'false', alt: '' }); im.style.objectFit = f.fit ?? 'cover'; d.appendChild(im); }
    // 선 + 효과 → box-shadow
    const sh = [];
    for (const st of (n.strokes ?? []).filter(x => x.visible !== false)) { const c = hexA(st.color, st.opacity ?? 1); if (st.align === 'inside') sh.push(`inset 0 0 0 ${st.width}px ${c}`); else if (st.align === 'outside') sh.push(`0 0 0 ${st.width}px ${c}`); else { sh.push(`inset 0 0 0 ${st.width / 2}px ${c}`); sh.push(`0 0 0 ${st.width / 2}px ${c}`); } }
    const filters = [];
    for (const e of (n.effects ?? []).filter(x => x.visible !== false)) {
      const c = hexA(e.color, e.opacity ?? 1);
      if (e.type === 'drop') { if (n.type === 'text') filters.push(`drop-shadow(${e.x}px ${e.y}px ${e.blur / 2}px ${c})`); else sh.push(`${e.x}px ${e.y}px ${e.blur}px ${e.spread ?? 0}px ${c}`); }
      else if (e.type === 'inner') sh.push(`inset ${e.x}px ${e.y}px ${e.blur}px ${e.spread ?? 0}px ${c}`);
      else if (e.type === 'blur') filters.push(`blur(${e.blur}px)`);
      else if (e.type === 'bgblur') s.backdropFilter = `blur(${e.blur}px)`;
    }
    if (sh.length) s.boxShadow = sh.join(',');
    if (filters.length) s.filter = filters.join(' ');
    if (n.type === 'text') {
      const t = n.text; const tx = el('div', { class: 'tx', text: t.content });
      const ts = tx.style; ts.font = `${t.weight} ${t.size}px/${t.lineHeight} ${t.family}, Pretendard, sans-serif`; ts.letterSpacing = `${t.letterSpacing ?? 0}em`; ts.textAlign = t.align; ts.color = fills[0]?.type === 'solid' ? hexA(fills[0].color, fills[0].opacity ?? 1) : '#000';
      ts.justifyContent = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[t.valign ?? 'top'];
      if (t.auto === 'width') ts.whiteSpace = 'pre';
      d.appendChild(tx);
    }
    if (n.children) for (const k of n.children) d.appendChild(this.renderNode(k));
    return d;
  }

  // ── 줌 · 좌표 ──
  boardSize() { let mx = 0, my = 0; for (const f of this.page.children) { mx = Math.max(mx, f.x + f.w); my = Math.max(my, f.y + f.h); } return [mx + PAD * 2, my + PAD * 2]; }
  applyZoom() {
    if (!this.cv.clientWidth) return;
    const [bw, bh] = this.boardSize();
    if (this.zoom == null) { this.zoom = clamp((this.cv.clientWidth - 80) / Math.max(1, bw - PAD * 2 + 200), .02, 1); this.cv.scrollLeft = PAD * this.zoom - 40; this.cv.scrollTop = PAD * this.zoom - 40; }
    const z = this.zoom; this.board.style.transform = `translate(${PAD * z}px,${PAD * z}px) scale(${z})`; this.board.style.transformOrigin = '0 0';
    this.sizer.style.width = bw * z + 'px'; this.sizer.style.height = bh * z + 'px';
    this.updateOverlay(); this.emit('zoom', z);
  }
  setZoom(z, cx, cy) {   // cx,cy = 화면 기준 고정점(없으면 가운데)
    const r = this.cv.getBoundingClientRect(); cx ??= r.width / 2; cy ??= r.height / 2;
    const px = (this.cv.scrollLeft + cx) / this.zoom, py = (this.cv.scrollTop + cy) / this.zoom;
    this.zoom = clamp(z, .02, 8); this.applyZoom();
    this.cv.scrollLeft = px * this.zoom - cx; this.cv.scrollTop = py * this.zoom - cy; this.updateOverlay();
  }
  fit() { this.zoom = null; this.applyZoom(); }
  zoomTo(ids = this.sel) { const b = this.bbox(ids); if (!b) return this.fit(); const r = this.cv.getBoundingClientRect(); const z = clamp(Math.min((r.width - 80) / b.w, (r.height - 80) / b.h), .02, 4); this.zoom = z; this.applyZoom(); this.cv.scrollLeft = (b.x + PAD + b.w / 2) * z - r.width / 2; this.cv.scrollTop = (b.y + PAD + b.h / 2) * z - r.height / 2; this.updateOverlay(); }
  toPage(clientX, clientY) { const r = this.cv.getBoundingClientRect(); return { x: (clientX - r.left + this.cv.scrollLeft) / this.zoom - PAD, y: (clientY - r.top + this.cv.scrollTop) / this.zoom - PAD }; }
  toScreen(x, y) { return { x: (x + PAD) * this.zoom - this.cv.scrollLeft, y: (y + PAD) * this.zoom - this.cv.scrollTop }; }
  absRect(n) { const p = absPos(this.page, n); return { x: p.x, y: p.y, w: n.w, h: n.h }; }
  bbox(ids) { let b = null; for (const id of ids) { const n = findNode(this.page, id); if (!n) continue; const r = this.absRect(n); b = b ? { x: Math.min(b.x, r.x), y: Math.min(b.y, r.y), x2: Math.max(b.x2, r.x + r.w), y2: Math.max(b.y2, r.y + r.h) } : { x: r.x, y: r.y, x2: r.x + r.w, y2: r.y + r.h }; } return b ? { x: b.x, y: b.y, w: b.x2 - b.x, h: b.y2 - b.y } : null; }

  // ── 선택 ──
  select(ids, { add = false, silent = false } = {}) {
    ids = [...new Set(ids)].filter(id => findNode(this.page, id));
    this.sel = add ? [...new Set([...this.sel, ...ids])] : ids;
    this.board.querySelectorAll('.nd.sel').forEach(e => e.classList.remove('sel'));
    for (const id of this.sel) this.board.querySelector(`[data-id="${id}"]`)?.classList.add('sel');
    this.updateOverlay(); if (!silent) this.emit('select', this.sel);
  }
  toggle(id) { this.sel.includes(id) ? this.select(this.sel.filter(x => x !== id)) : this.select([id], { add: true }); }
  selNodes() { return this.sel.map(id => findNode(this.page, id)).filter(Boolean); }
  // 클릭한 요소에서 고를 노드: 선택 중인 노드의 자식이면 그 자식, 아니면 프레임의 직속 자식(프레임 빈 곳이면 프레임)
  pickFromEl(target) {
    const chain = []; let e = target.closest('.nd'); while (e) { chain.unshift(e.dataset.id); e = e.parentElement.closest('.nd'); }
    if (!chain.length) return null;
    if (chain.length === 1) return chain[0];
    for (const id of this.sel) { const i = chain.indexOf(id); if (i >= 0 && i < chain.length - 1) return chain[i + 1]; }
    const n1 = findNode(this.page, chain[1]); if (n1?.locked) return chain[0];
    return chain[1];
  }
  deepest(target) { const e = target.closest('.nd'); return e ? e.dataset.id : null; }

  // ── 오버레이(선택 상자 · 핸들 · 크기 · 안내선 · 간격 · 라벨 · 룰러) ──
  updateOverlay() {
    const ov = this.ov; ov.innerHTML = ''; const z = this.zoom ?? 1; const r = this.cv.getBoundingClientRect();
    ov.style.transform = this.labels.style.transform = `translate(${this.cv.scrollLeft}px,${this.cv.scrollTop}px)`;   // 스크롤 상자 안에 있으니 보이는 창에 붙여 둔다
    ov.setAttribute('width', r.width); ov.setAttribute('height', r.height); ov.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    // 프레임 라벨
    this.labels.innerHTML = '';
    for (const f of this.page.children) {
      const p = this.toScreen(f.x, f.y); if (p.x > r.width || p.y > r.height || p.x + f.w * z < 0 || p.y + f.h * z < -20) continue;
      const lb = el('div', { class: 'flabel' + (this.sel.includes(f.id) ? ' sel' : ''), 'data-label': f.id, text: f.name }); lb.style.left = p.x + 'px'; lb.style.top = p.y - 18 + 'px'; lb.style.maxWidth = Math.max(40, f.w * z) + 'px'; this.labels.appendChild(lb);
    }
    // hover
    if (this.hover && !this.sel.includes(this.hover)) { const n = findNode(this.page, this.hover); if (n) { const a = this.absRect(n), p = this.toScreen(a.x, a.y); ov.appendChild(el('rect', { x: p.x, y: p.y, width: a.w * z, height: a.h * z, fill: 'none', stroke: '#0D99FF', 'stroke-width': 1, transform: n.rotation ? `rotate(${n.rotation} ${p.x + a.w * z / 2} ${p.y + a.h * z / 2})` : '' }, 1)); } }
    // 선택
    const nodes = this.selNodes(); if (!nodes.length) { this.drawRulers(); return; }
    for (const n of nodes) { const a = this.absRect(n), p = this.toScreen(a.x, a.y); ov.appendChild(el('rect', { x: p.x, y: p.y, width: a.w * z, height: a.h * z, fill: 'none', stroke: '#0D99FF', 'stroke-width': 1, transform: n.rotation ? `rotate(${n.rotation} ${p.x + a.w * z / 2} ${p.y + a.h * z / 2})` : '' }, 1)); }
    const b = this.bbox(this.sel); const p = this.toScreen(b.x, b.y), W = b.w * z, H = b.h * z;
    // 부모 가장자리까지 점선 안내선(x · y 가 어디인지)
    if (nodes.length === 1) {
      const n = nodes[0]; const par = parentOf(this.page, n.id);
      if (par !== this.page && par) { const pa = this.absRect(par), pp = this.toScreen(pa.x, pa.y);
        const line = (x1, y1, x2, y2, txt) => { ov.appendChild(el('line', { x1, y1, x2, y2, stroke: '#0D99FF', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, 1)); if (txt) this.tag(ov, (x1 + x2) / 2, (y1 + y2) / 2, txt, '#0D99FF'); };
        line(p.x, p.y + H / 2, pp.x, p.y + H / 2, Math.round(n.x)); line(p.x + W / 2, p.y, p.x + W / 2, pp.y, Math.round(n.y));
      }
    }
    if (nodes.length > 1) ov.appendChild(el('rect', { x: p.x, y: p.y, width: W, height: H, fill: 'none', stroke: '#0D99FF', 'stroke-width': 1 }, 1));
    // 핸들 8
    const hs = [['nw', p.x, p.y], ['n', p.x + W / 2, p.y], ['ne', p.x + W, p.y], ['e', p.x + W, p.y + H / 2], ['se', p.x + W, p.y + H], ['s', p.x + W / 2, p.y + H], ['sw', p.x, p.y + H], ['w', p.x, p.y + H / 2]];
    for (const [k, x, y] of hs) { if (W < 24 && !['nw', 'ne', 'se', 'sw'].includes(k)) continue; ov.appendChild(el('rect', { class: 'hd', 'data-h': k, x: x - 4, y: y - 4, width: 8, height: 8, fill: '#fff', stroke: '#0D99FF', 'stroke-width': 1 }, 1)); }
    // 크기 태그
    this.tag(ov, p.x + W / 2, p.y + H + 12, `${Math.round(b.w)} × ${Math.round(b.h)}`, '#0D99FF', true);
    // ⌥ 간격 재기
    if (this.alt && this.hover && !this.sel.includes(this.hover)) this.measure(ov, b, this.absRect(findNode(this.page, this.hover)));
    else if (this.alt && nodes.length === 1) { const par = parentOf(this.page, nodes[0].id); if (par && par !== this.page) this.measure(ov, b, this.absRect(par)); }
    this.drawRulers(b);
  }
  tag(ov, x, y, txt, color, solidBg = false) { const t = String(txt); const w = t.length * 6.5 + 8; const g = el('g', {}, 1); g.appendChild(el('rect', { x: x - w / 2, y: y - 8, width: w, height: 16, rx: 2, fill: solidBg ? color : '#fff', stroke: solidBg ? 'none' : color, 'stroke-width': .5 }, 1)); g.appendChild(el('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 10, 'font-family': 'Pretendard, sans-serif', fill: solidBg ? '#fff' : color, text: t }, 1)); ov.appendChild(g); }
  measure(ov, a, b) {   // a=선택 bbox, b=상대 사각형(페이지 좌표). 떨어져 있으면 가까운 변 사이, 안에 있으면 네 변까지
    const z = this.zoom; const red = '#F24822';
    const L = (x1, y1, x2, y2, txt) => { const p1 = this.toScreen(x1, y1), p2 = this.toScreen(x2, y2); ov.appendChild(el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: red, 'stroke-width': 1 }, 1)); this.tag(ov, (p1.x + p2.x) / 2 + (y1 === y2 ? 0 : 18), (p1.y + p2.y) / 2 + (y1 === y2 ? -12 : 0), Math.round(txt), red); };
    const inside = a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
    const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    if (inside) { L(b.x, cy, a.x, cy, a.x - b.x); L(a.x + a.w, cy, b.x + b.w, cy, b.x + b.w - a.x - a.w); L(cx, b.y, cx, a.y, a.y - b.y); L(cx, a.y + a.h, cx, b.y + b.h, b.y + b.h - a.y - a.h); return; }
    if (b.x >= a.x + a.w) L(a.x + a.w, cy, b.x, cy, b.x - a.x - a.w); else if (b.x + b.w <= a.x) L(b.x + b.w, cy, a.x, cy, a.x - b.x - b.w);
    if (b.y >= a.y + a.h) L(cx, a.y + a.h, cx, b.y, b.y - a.y - a.h); else if (b.y + b.h <= a.y) L(cx, b.y + b.h, cx, a.y, a.y - b.y - b.h);
  }
  drawRulers(b) {
    if (!this.showRulers) return; const z = this.zoom ?? 1; const r = this.cv.getBoundingClientRect(); const dpr = devicePixelRatio || 1;
    const setup = (c, w, h) => { c.width = w * dpr; c.height = h * dpr; c.style.width = w + 'px'; c.style.height = h + 'px'; const ctx = c.getContext('2d'); ctx.scale(dpr, dpr); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.font = '9px Pretendard, sans-serif'; ctx.fillStyle = '#8A8A8A'; ctx.strokeStyle = '#D9D9D9'; return ctx; };
    const steps = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]; const step = steps.find(s => s * z >= 60) ?? 10000; const minor = step / 5;
    const cx = setup(this.rx, r.width, RUL), cy = setup(this.ry, RUL, r.height);
    const ox = PAD * z - this.cv.scrollLeft, oy = PAD * z - this.cv.scrollTop;
    // 선택 범위 강조
    if (b) { const p = this.toScreen(b.x, b.y); cx.fillStyle = '#D6EDFF'; cx.fillRect(p.x, 0, b.w * z, RUL); cy.fillStyle = '#D6EDFF'; cy.fillRect(0, p.y, RUL, b.h * z); }
    cx.fillStyle = '#8A8A8A'; cy.fillStyle = '#8A8A8A';
    const x0 = Math.floor(-ox / z / minor) * minor, x1 = (r.width - ox) / z;
    for (let v = x0; v <= x1; v += minor) { const sx = ox + v * z; const major = Math.abs(v / step - Math.round(v / step)) < 1e-6; cx.beginPath(); cx.moveTo(sx + .5, major ? RUL - 8 : RUL - 4); cx.lineTo(sx + .5, RUL); cx.stroke(); if (major) cx.fillText(String(Math.round(v)), sx + 3, 10); }
    const y0 = Math.floor(-oy / z / minor) * minor, y1 = (r.height - oy) / z;
    for (let v = y0; v <= y1; v += minor) { const sy = oy + v * z; const major = Math.abs(v / step - Math.round(v / step)) < 1e-6; cy.beginPath(); cy.moveTo(major ? RUL - 8 : RUL - 4, sy + .5); cy.lineTo(RUL, sy + .5); cy.stroke(); if (major) { cy.save(); cy.translate(10, sy - 3); cy.rotate(-Math.PI / 2); cy.fillText(String(Math.round(v)), 0, 0); cy.restore(); } }
    if (b) { const p = this.toScreen(b.x, b.y); cx.fillStyle = '#0D99FF'; cx.font = 'bold 9px Pretendard, sans-serif'; cx.fillText(String(Math.round(b.x)), p.x + 3, 10); cx.fillText(String(Math.round(b.x + b.w)), p.x + b.w * z - cx.measureText(String(Math.round(b.x + b.w))).width - 3, 10);
      cy.fillStyle = '#0D99FF'; cy.font = 'bold 9px Pretendard, sans-serif'; const rot = (txt, y) => { cy.save(); cy.translate(10, y); cy.rotate(-Math.PI / 2); cy.fillText(txt, 0, 0); cy.restore(); }; rot(String(Math.round(b.y)), p.y - 3); rot(String(Math.round(b.y + b.h)), p.y + b.h * z + cy.measureText(String(Math.round(b.y + b.h))).width + 3); }
  }

  // ── 포인터 ──
  wire() {
    const cv = this.cv;
    cv.addEventListener('scroll', () => this.updateOverlay(), { passive: true });
    cv.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const r = cv.getBoundingClientRect(); this.setZoom(this.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    cv.addEventListener('pointermove', e => {
      const pg = this.toPage(e.clientX, e.clientY); if (this.showCoords) { this.coords.hidden = false; this.coords.textContent = `X ${Math.round(pg.x)}  Y ${Math.round(pg.y)}`; }
      if (this.drag) return;
      const id = this.tool === 'move' ? this.pickFromEl(e.target) : null; if (id !== this.hover) { this.hover = id; this.updateOverlay(); }
    });
    cv.addEventListener('pointerleave', () => { this.hover = null; this.coords.hidden = true; this.updateOverlay(); });
    cv.addEventListener('pointerdown', e => this.down(e));
    cv.addEventListener('dblclick', e => this.dbl(e));
    this.labels.addEventListener('pointerdown', e => { const lb = e.target.closest('[data-label]'); if (!lb) return; e.stopPropagation(); e.shiftKey ? this.toggle(lb.dataset.label) : this.select([lb.dataset.label]); this.startMove(e); });
    this.labels.addEventListener('dblclick', e => { const lb = e.target.closest('[data-label]'); if (lb) this.emit('rename', lb.dataset.label); });
  }
  down(e) {
    if (e.button === 1 || this.tool === 'hand' || this.space) { this.drag = { kind: 'pan', x: e.clientX, y: e.clientY, l: this.cv.scrollLeft, t: this.cv.scrollTop }; this.capture(e); return; }
    if (e.button !== 0) return;
    this.cv.focus({ preventScroll: true });
    const h = e.target.closest?.('.hd'); if (h) { this.startResize(e, h.dataset.h); return; }
    if (this.tool !== 'move') { this.startCreate(e); return; }
    const id = this.pickFromEl(e.target);
    if (!id) { if (!e.shiftKey) this.select([]); this.drag = { kind: 'marquee', x: e.clientX, y: e.clientY, pg: this.toPage(e.clientX, e.clientY) }; this.capture(e); return; }
    const n = findNode(this.page, id);
    if (e.shiftKey) { this.toggle(id); return; }
    if (!this.sel.includes(id)) this.select([id]);
    if (n.locked) return;
    this.startMove(e);
  }
  startMove(e) {
    const nodes = this.selNodes().filter(n => !n.locked); if (!nodes.length) return;
    this.drag = { kind: 'move', x: e.clientX, y: e.clientY, start: nodes.map(n => ({ n, x: n.x, y: n.y })), moved: false }; this.capture(e);
    const mv = ev => this.moveStep(ev), up = ev => { this.cv.removeEventListener('pointermove', mv); this.cv.removeEventListener('pointerup', up); const d = this.drag; this.drag = null; this.snapLines = null; if (d?.moved) { this.relayoutParents(d.start.map(s => s.n)); this.updateOverlay(); this.commit('이동'); this.emit('change', this.sel); } };
    this.cv.addEventListener('pointermove', mv); this.cv.addEventListener('pointerup', up);
  }
  moveStep(ev) {
    const d = this.drag; if (!d || d.kind !== 'move') return;
    let dx = (ev.clientX - d.x) / this.zoom, dy = (ev.clientY - d.y) / this.zoom;
    if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 3) return; d.moved = true;
    if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    // 스냅(페이지 위 프레임 · 형제 변 · 가운데)
    const first = d.start[0]; const par = parentOf(this.page, first.n.id); const sibs = (par === this.page ? this.page.children : par.children).filter(s => !this.sel.includes(s.id));
    const nx = first.x + dx, ny = first.y + dy; const tol = 6 / this.zoom; let sx = null, sy = null;
    const cands = sibs.flatMap(s => [s.x, s.x + s.w, s.x + s.w / 2]); const candsY = sibs.flatMap(s => [s.y, s.y + s.h, s.y + s.h / 2]);
    if (par !== this.page) { cands.push(0, par.w, par.w / 2); candsY.push(0, par.h, par.h / 2); }
    for (const c of cands) for (const [edge, off] of [[nx, 0], [nx + first.n.w, first.n.w], [nx + first.n.w / 2, first.n.w / 2]]) if (Math.abs(edge - c) < tol) { dx += c - edge; sx = c; break; }
    for (const c of candsY) for (const [edge, off] of [[ny, 0], [ny + first.n.h, first.n.h], [ny + first.n.h / 2, first.n.h / 2]]) if (Math.abs(edge - c) < tol) { dy += c - edge; sy = c; break; }
    for (const s of d.start) { s.n.x = Math.round(s.x + dx); s.n.y = Math.round(s.y + dy); const e = this.board.querySelector(`[data-id="${s.n.id}"]`); if (e) { e.style.left = s.n.x + 'px'; e.style.top = s.n.y + 'px'; } }
    this.updateOverlay(); this.emit('live', this.sel);
    if (sx != null || sy != null) { const pa = par === this.page ? { x: 0, y: 0 } : absPos(this.page, par); const r = this.cv.getBoundingClientRect(); if (sx != null) { const p = this.toScreen(pa.x + sx, 0); this.ov.appendChild(el('line', { x1: p.x, y1: 0, x2: p.x, y2: r.height, stroke: '#F24822', 'stroke-width': 1 }, 1)); } if (sy != null) { const p = this.toScreen(0, pa.y + sy); this.ov.appendChild(el('line', { x1: 0, y1: p.y, x2: r.width, y2: p.y, stroke: '#F24822', 'stroke-width': 1 }, 1)); } }
  }
  startResize(e, hk) {
    const nodes = this.selNodes().filter(n => !n.locked); if (!nodes.length) return; e.stopPropagation();
    const b = this.bbox(this.sel); this.drag = { kind: 'resize', hk, x: e.clientX, y: e.clientY, b, start: nodes.map(n => ({ n, x: n.x, y: n.y, w: n.w, h: n.h })) }; this.capture(e);
    const mv = ev => {
      const d = this.drag; let dx = (ev.clientX - d.x) / this.zoom, dy = (ev.clientY - d.y) / this.zoom;
      let { x, y, w, h } = d.b; let nx = x, ny = y, nw = w, nh = h;
      if (hk.includes('e')) nw = Math.max(1, w + dx); if (hk.includes('s')) nh = Math.max(1, h + dy);
      if (hk.includes('w')) { nw = Math.max(1, w - dx); nx = x + w - nw; } if (hk.includes('n')) { nh = Math.max(1, h - dy); ny = y + h - nh; }
      if (ev.shiftKey && hk.length === 2) { const k = Math.max(nw / w, nh / h); nw = w * k; nh = h * k; if (hk.includes('w')) nx = x + w - nw; if (hk.includes('n')) ny = y + h - nh; }
      for (const s of d.start) { const ow = s.n.w, oh = s.n.h; s.n.x = Math.round(nx + (s.x - x) * nw / w); s.n.y = Math.round(ny + (s.y - y) * nh / h); s.n.w = Math.max(1, Math.round(s.w * nw / w)); s.n.h = Math.max(1, Math.round(s.h * nh / h)); if (s.n.children) { applyConstraints(s.n, ow, oh); relayout(s.n); } }
      for (const s of d.start) this.refresh(s.n.id);
      this.emit('live', this.sel);
    };
    const up = () => { this.cv.removeEventListener('pointermove', mv); this.cv.removeEventListener('pointerup', up); this.drag = null; this.commit('크기'); this.emit('change', this.sel); };
    this.cv.addEventListener('pointermove', mv); this.cv.addEventListener('pointerup', up);
  }
  startCreate(e) {
    const pg = this.toPage(e.clientX, e.clientY); const tool = this.tool;
    if (tool === 'text') { const host = this.containerAt(e.target); const rel = this.relTo(host, pg); const t = node('text', { x: Math.round(rel.x), y: Math.round(rel.y), w: 240, h: 40, fills: [solid('#1E1E1E')], text: { content: '텍스트', size: 24, weight: 500, lineHeight: 1.25, letterSpacing: 0, align: 'left', valign: 'top', family: this.doc.font ?? 'Pretendard', auto: 'height' } }); (host?.children ?? this.page.children).push(t); this.refresh(host ? host.id : t.id); this.select([t.id]); this.tool = 'move'; this.emit('tool', 'move'); this.commit('텍스트'); this.emit('change', [t.id]); setTimeout(() => this.editText(t.id), 0); return; }
    const host = tool === 'frame' ? null : this.containerAt(e.target); const rel = this.relTo(host, pg);
    const n = tool === 'frame' ? node('frame', { name: `프레임 ${this.page.children.length + 1}`, x: Math.round(pg.x), y: Math.round(pg.y), w: 1, h: 1, fills: [solid('#FFFFFF')], media: '추가' }) : node('rect', { x: Math.round(rel.x), y: Math.round(rel.y), w: 1, h: 1, fills: [solid('#D9D9D9')] });
    (host?.children ?? this.page.children).push(n); this.refresh(host ? host.id : n.id);
    this.drag = { kind: 'create', x: e.clientX, y: e.clientY, n, ox: n.x, oy: n.y }; this.capture(e);
    const mv = ev => { const d = this.drag; let dx = (ev.clientX - d.x) / this.zoom, dy = (ev.clientY - d.y) / this.zoom; if (ev.shiftKey) dx = dy = Math.max(dx, dy); n.x = Math.round(Math.min(d.ox, d.ox + dx)); n.y = Math.round(Math.min(d.oy, d.oy + dy)); n.w = Math.max(1, Math.round(Math.abs(dx))); n.h = Math.max(1, Math.round(Math.abs(dy))); this.refresh(host ? host.id : n.id); this.select([n.id], { silent: true }); };
    const up = () => { this.cv.removeEventListener('pointermove', mv); this.cv.removeEventListener('pointerup', up); this.drag = null; if (n.w < 4 && n.h < 4) { n.w = tool === 'frame' ? 400 : 100; n.h = tool === 'frame' ? 300 : 100; this.refresh(host ? host.id : n.id); } this.select([n.id]); this.tool = 'move'; this.emit('tool', 'move'); this.commit(tool === 'frame' ? '프레임' : '사각형'); this.emit('change', [n.id]); };
    this.cv.addEventListener('pointermove', mv); this.cv.addEventListener('pointerup', up);
  }
  containerAt(target) { let e = target.closest?.('.nd'); while (e) { const n = findNode(this.page, e.dataset.id); if (n && (n.type === 'frame' || n.type === 'group')) return n; e = e.parentElement.closest('.nd'); } return null; }
  relTo(host, pg) { if (!host) return pg; const a = absPos(this.page, host); return { x: pg.x - a.x, y: pg.y - a.y }; }
  // 마퀴 · 팬은 문서 수준 pointermove 로
  constructorMoveBound = false;
  dbl(e) { const id = this.deepest(e.target); if (!id) return; const n = findNode(this.page, id); if (n?.type === 'text') { this.select([id]); this.editText(id); } else if (n?.type === 'frame') { this.emit('rename', id); } }
  editText(id) {
    const e = this.board.querySelector(`[data-id="${id}"] .tx`); const n = findNode(this.page, id); if (!e || !n) return;
    e.contentEditable = 'plaintext-only'; e.focus(); const sel = getSelection(); sel.selectAllChildren(e);
    const done = () => { e.contentEditable = 'false'; e.removeEventListener('blur', done); const v = e.innerText.replace(/\n$/, ''); if (v !== n.text.content) { n.text.content = v; this.refresh(id); this.commit('글자'); this.emit('change', [id]); } };
    e.addEventListener('blur', done); e.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.preventDefault(); e.blur(); } ev.stopPropagation(); });
  }
  relayoutParents(nodes) { for (const n of nodes) { const p = parentOf(this.page, n.id); if (p && p !== this.page && p.layout) { relayout(p); this.refresh(p.id); } } }
  // 키보드 이동 · 삭제 등은 app 에서 호출
  nudge(dx, dy) { const ns = this.selNodes().filter(n => !n.locked); if (!ns.length) return; for (const n of ns) { n.x += dx; n.y += dy; const e = this.board.querySelector(`[data-id="${n.id}"]`); if (e) { e.style.left = n.x + 'px'; e.style.top = n.y + 'px'; } } this.updateOverlay(); this.commit('이동'); this.emit('change', this.sel); }
  // 정렬: 하나면 부모 기준, 여럿이면 선택 묶음 기준
  align(kind) {
    const ns = this.selNodes().filter(n => !n.locked); if (!ns.length) return;
    let box; if (ns.length === 1) { const p = parentOf(this.page, ns[0].id); if (!p || p === this.page) return; box = { x: 0, y: 0, w: p.w, h: p.h }; } else { const b = this.bbox(this.sel); const pa = absPos(this.page, parentOf(this.page, ns[0].id) === this.page ? { x: 0, y: 0 } : parentOf(this.page, ns[0].id)); box = { x: b.x - (pa.x || 0), y: b.y - (pa.y || 0), w: b.w, h: b.h }; }
    for (const n of ns) { if (kind === 'l') n.x = box.x; if (kind === 'c') n.x = Math.round(box.x + (box.w - n.w) / 2); if (kind === 'r') n.x = box.x + box.w - n.w; if (kind === 't') n.y = box.y; if (kind === 'm') n.y = Math.round(box.y + (box.h - n.h) / 2); if (kind === 'b') n.y = box.y + box.h - n.h; }
    if (kind === 'dh' || kind === 'dv') { const k = kind === 'dh' ? 'x' : 'y', s = kind === 'dh' ? 'w' : 'h'; const sorted = [...ns].sort((a, b) => a[k] - b[k]); const total = sorted.reduce((a, n) => a + n[s], 0); const span = sorted[sorted.length - 1][k] + sorted[sorted.length - 1][s] - sorted[0][k]; const gap = (span - total) / (sorted.length - 1); let pos = sorted[0][k]; for (const n of sorted) { n[k] = Math.round(pos); pos += n[s] + gap; } }
    for (const n of ns) this.refresh(n.id); this.commit('정렬'); this.emit('change', this.sel);
  }
}

// 마퀴 · 팬: 캡처한 포인터의 move/up 을 Editor 밖에서 한 번만 붙인다
export function wireGlobal(ed) {
  ed.cv.addEventListener('pointermove', e => {
    const d = ed.drag; if (!d) return;
    if (d.kind === 'pan') { ed.cv.scrollLeft = d.l - (e.clientX - d.x); ed.cv.scrollTop = d.t - (e.clientY - d.y); }
    else if (d.kind === 'marquee') { const a = d.pg, b = ed.toPage(e.clientX, e.clientY); const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y); ed.updateOverlay(); const p = ed.toScreen(x, y); ed.ov.appendChild(el('rect', { x: p.x, y: p.y, width: w * ed.zoom, height: h * ed.zoom, fill: 'rgba(13,153,255,.1)', stroke: '#0D99FF', 'stroke-width': 1 }, 1));
      const hit = []; const within = (r) => r.x < x + w && r.x + r.w > x && r.y < y + h && r.y + r.h > y;
      const inFrame = ed.page.children.find(f => x >= f.x && y >= f.y && x + w <= f.x + f.w && y + h <= f.y + f.h);
      if (inFrame) { for (const k of inFrame.children) if (within(ed.absRect(k)) && !k.locked) hit.push(k.id); } else for (const f of ed.page.children) if (within(f)) hit.push(f.id);
      d.hit = hit; }
  });
  ed.cv.addEventListener('pointerup', () => { const d = ed.drag; if (!d) return; if (d.kind === 'marquee') { ed.drag = null; if (d.hit?.length) ed.select(d.hit); else ed.updateOverlay(); } else if (d.kind === 'pan') ed.drag = null; });
}
