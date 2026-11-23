// 피그마식 채우기 패널(11-23 사용자 「컬러편집은 피그마처럼 — 단톤·그라 설정, 방향, 추가 레이어 쌓기」 · 범위: 배경 + 글자 + 도형·박스)
//   · 채우기 목록(피그마 Fill 칸): 위층부터 한 줄씩 — 끌어 순서 · 견본(누르면 팝업) · 헥스/종류 · 불투명도 % · 보이기 · 빼기, 머리 + 로 층 더하기
//   · 팝업(피그마 Custom): 종류 탭(단색·선형·방사형·이미지) → 색 판(채도·명도) + 색상 막대 + 불투명도 막대 + 스포이드 + 헥스·%,
//     그라데이션은 각도 · 90° · 뒤집기 · 막대(누르면 정지점 추가 · 끌기 · Delete) · 정지점 목록(위치 · 색 · 불투명도 · 빼기)
//   값 모양은 core/paint.js(0번 = 맨 아래). 끄는 동안 onLive(보드 미리보기, 저장·되돌리기 없음) · 놓거나 입력이 끝나면 onChange 한 번
import { normPaint, paintSwatchCss, paintLabel, convertPaint, newPaint, rgbOf, hexOf, PAINT_NAME, GRAD_MAX_STOPS, normAngle } from '../core/paint.js';
import { addStop, removeStop, moveStop, flipGradient, rotateGradient, colorAt } from '../core/gradient.js';
import { ic, iconBtn, parseHex, wireFui } from './fui.js';

const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const TYPE_ICON = {
  solid: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1.5" fill="currentColor"/></svg>',
  linear: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><defs><linearGradient id="fpL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity=".1"/></linearGradient></defs><rect x="3" y="3" width="10" height="10" rx="1.5" fill="url(#fpL)" stroke="currentColor" stroke-width=".8"/></svg>',
  radial: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><defs><radialGradient id="fpR"><stop offset="0" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity=".1"/></radialGradient></defs><rect x="3" y="3" width="10" height="10" rx="1.5" fill="url(#fpR)" stroke="currentColor" stroke-width=".8"/></svg>',
  image: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="9" rx="1.5" fill="none" stroke="currentColor"/><circle cx="6" cy="6.5" r="1.2" fill="currentColor"/><path d="M3 12l3.5-3.5 2 2L11 8l2.5 3" fill="none" stroke="currentColor"/></svg>',
};
const GRIP = '<svg width="8" height="14" viewBox="0 0 8 14" aria-hidden="true"><g fill="currentColor"><circle cx="2" cy="3" r="1"/><circle cx="6" cy="3" r="1"/><circle cx="2" cy="7" r="1"/><circle cx="6" cy="7" r="1"/><circle cx="2" cy="11" r="1"/><circle cx="6" cy="11" r="1"/></g></svg>';

/* ── 색 변환(HSV) ── */
export function hexToHsv(hex) {
  const [r, g, b] = rgbOf(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
}
export function hsvToHex({ h, s, v }) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return hexOf([f(5), f(3), f(1)].map(x => x * 255));
}

/* ── 채우기 목록 ── */
// rows: 위층부터 { key, paint, locked?, sub?, auto? } — key 는 fills 의 번호(0 = 맨 아래) 또는 'base'(배경 지면: 빼기·숨김·순서 없음, 불투명)
export function fillSectionHtml(id, { title = '채우기', fills = [], base = null, canAdd = true, disabled = false, note = '', mode = '' } = {}) {
  const rows = [...fills.map((p, i) => ({ key: i, paint: p })).reverse(), ...(base ? [{ key: 'base', paint: base.paint, locked: true, sub: base.sub, auto: base.auto }] : [])];
  const row = r => {
    const p = r.paint, solid = p.type === 'solid', hid = !!p.hidden;
    if (p.type === 'kv') return `<div class="flrow kv" data-fl="${r.key}" ${disabled ? '' : 'draggable="true"'}>
      <span class="flgrip" aria-hidden="true">${GRIP}</span>
      <div class="fcin"><button type="button" class="flsw" data-flsw="${r.key}" style="--sw:${esc(paintSwatchCss(p))}" aria-label="키비주얼 설정 열기" ${disabled ? 'disabled' : ''}><i></i></button><button type="button" class="fllab" data-flopen="${r.key}">키비주얼</button><span class="ft">이미지</span></div>
      <span class="fib" aria-hidden="true"></span><span class="fib" aria-hidden="true"></span></div>`;
    const lab = solid ? `<input type="text" class="fhex" data-flhex="${r.key}" value="${r.auto ? '' : esc(p.color.slice(1))}" placeholder="${esc(p.color.slice(1))}" maxlength="7" spellcheck="false" aria-label="${esc(title)} 색 헥스" ${disabled ? 'disabled' : ''}>`
      : `<button type="button" class="fllab" data-flopen="${r.key}" ${disabled ? 'disabled' : ''}>${esc(paintLabel(p))}</button>`;
    return `<div class="flrow${hid ? ' hid' : ''}${r.locked ? ' base' : ''}" data-fl="${r.key}" ${r.locked || disabled ? '' : 'draggable="true"'}>
      <span class="flgrip" aria-hidden="true">${r.locked ? '' : GRIP}</span>
      <div class="fcin"><button type="button" class="flsw" data-flsw="${r.key}" style="--sw:${esc(paintSwatchCss(p))}" aria-label="${esc(title)} ${esc(PAINT_NAME[p.type])} 편집 열기" ${disabled ? 'disabled' : ''}><i></i></button>${lab}${r.sub ? `<span class="ft">${esc(r.sub)}</span>` : ''}
        ${r.locked ? '' : `<span class="fop"><input type="text" inputmode="decimal" class="fnum fopn" data-flop="${r.key}" value="${p.opacity ?? 100}" aria-label="${esc(title)} 층 불투명도(%)" ${disabled ? 'disabled' : ''}><i aria-hidden="true">%</i></span>`}</div>
      ${r.locked ? (base?.reset ? iconBtn('swap', base.reset, `data-flreset="1" ${disabled ? 'disabled' : ''}`) : '<span class="fib" aria-hidden="true"></span>') + '<span class="fib" aria-hidden="true"></span>'
        : `${iconBtn(hid ? 'eye-off' : 'eye', hid ? '층 보이기' : '층 숨기기', `data-fleye="${r.key}" aria-pressed="${hid}" ${disabled ? 'disabled' : ''}`)}${iconBtn('minus', '층 빼기', `data-fldel="${r.key}" ${disabled ? 'disabled' : ''}`)}`}
    </div>`;
  };
  return `<div class="fill" id="${esc(id)}Fill">
    <div class="flab"><span>${esc(title)}${mode ? ` <em>· ${esc(mode)}</em>` : ''}</span>${canAdd ? iconBtn('plus', `${title} 층 더하기`, `data-fladd="1" ${disabled ? 'disabled' : ''}`) : ''}</div>
    <div class="fllist">${rows.map(row).join('')}</div>${note ? `<div class="fnote">${note}</div>` : ''}</div>`;
}

// 목록 묶기. opts:
//   fills(): 지금 층(0 = 아래) · base(): 지면 칠(없으면 null) · onChange(fills, label) · onLive(fills)
//   onBase(paint, label) · onBaseLive(paint) · onBaseReset() · allowImage(위층 이미지) · allowAlpha · addPaint(): 새 층 · baseTypes
export function bindFillSection(root, id, opts) {
  const box = root?.querySelector(`#${CSS.escape(id)}Fill`); if (!box) return;
  wireFui(box);
  const fills = () => (opts.fills() ?? []).map(p => ({ ...p }));
  const set = (next, label) => opts.onChange(next, label);
  const keyOf = el => { const k = el.dataset.flsw ?? el.dataset.flopen ?? el.dataset.flhex ?? el.dataset.flop ?? el.dataset.fleye ?? el.dataset.fldel; return k === 'base' ? 'base' : +k; };
  const paintOf = k => k === 'base' ? opts.base() : fills()[k];
  const open = (anchor, k) => {
    const isBase = k === 'base';
    if (!isBase && paintOf(k)?.type === 'kv') { opts.onKv?.(anchor); return; }
    openPaintPopover(anchor, paintOf(k), {
      types: isBase ? (opts.baseTypes ?? ['solid', 'linear', 'radial']) : ['solid', 'linear', 'radial', ...(opts.allowImage ? ['image'] : [])],
      allowAlpha: !isBase && opts.allowAlpha !== false,
      title: isBase ? (opts.baseTitle ?? '지면') : `${opts.title ?? '채우기'} ${fills().length - k}`, box: (isBase ? opts.baseBox ?? opts.box : opts.box) ?? null,   // 지면은 틀의 지면 칸에 그려진다(손잡이도 그 칸 기준)
      onLive: p => { if (isBase) opts.onBaseLive?.(p); else { const f = fills(); f[k] = p; opts.onLive?.(f); } },
      onChange: (p, label) => { if (isBase) opts.onBase(p, label); else { const f = fills(); f[k] = p; set(f, label); } },
    });
  };
  box.querySelectorAll('[data-flsw],[data-flopen]').forEach(b => b.onclick = e => { e.stopPropagation(); open(b.closest('.flrow'), keyOf(b)); });
  box.querySelector('[data-fladd]')?.addEventListener('click', () => { const f = fills(); if (f.length >= 8) return; f.push(opts.addPaint?.() ?? newPaint()); set(f, '채우기 층 더하기'); });
  box.querySelector('[data-flreset]')?.addEventListener('click', () => opts.onBaseReset?.());
  box.querySelectorAll('[data-fleye]').forEach(b => b.onclick = () => { const f = fills(), k = keyOf(b); f[k] = { ...f[k], hidden: !f[k].hidden || undefined }; if (!f[k].hidden) delete f[k].hidden; set(f, f[k].hidden ? '채우기 층 숨기기' : '채우기 층 보이기'); });
  box.querySelectorAll('[data-fldel]').forEach(b => b.onclick = () => { const f = fills(); f.splice(keyOf(b), 1); closePaintPopover(); set(f, '채우기 층 빼기'); });
  box.querySelectorAll('[data-flop]').forEach(inp => inp.onchange = () => { const f = fills(), k = keyOf(inp), v = clamp(Math.round(parseFloat(inp.value)), 0, 100); if (!Number.isFinite(v)) { inp.value = f[k].opacity ?? 100; return; } f[k] = { ...f[k], opacity: v }; set(f, '채우기 층 불투명도'); });
  box.querySelectorAll('[data-flhex]').forEach(inp => {
    const commit = () => {
      const k = keyOf(inp), hx = parseHex(inp.value); if (!hx) { inp.value = inp.placeholder && inp.value === '' ? '' : (paintOf(k)?.color ?? '').slice(1); return; }
      if (k === 'base') opts.onBase({ type: 'solid', color: hx, opacity: 100 }, '지면 색');
      else { const f = fills(); f[k] = { ...f[k], color: hx }; set(f, '채우기 색'); }
    };
    inp.onchange = commit; inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } };
  });
  // 끌어 순서 바꾸기(피그마: 층 줄을 위아래로). 보이는 줄은 위층부터라 번호를 뒤집어 넣는다
  let drag = null;
  box.querySelectorAll('.flrow[draggable]').forEach(r => {
    r.ondragstart = e => { drag = +r.dataset.fl; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-fill', String(drag)); r.classList.add('dragging'); };
    r.ondragend = () => { r.classList.remove('dragging'); box.querySelectorAll('.flrow').forEach(x => x.classList.remove('dropa', 'dropb')); drag = null; };
    r.ondragover = e => { if (drag == null) return; e.preventDefault(); const rc = r.getBoundingClientRect(), above = e.clientY < rc.top + rc.height / 2; r.classList.toggle('dropa', above); r.classList.toggle('dropb', !above); };
    r.ondragleave = () => r.classList.remove('dropa', 'dropb');
    r.ondrop = e => {
      e.preventDefault(); if (drag == null) return;
      const f = fills(), to0 = +r.dataset.fl, rc = r.getBoundingClientRect(), above = e.clientY < rc.top + rc.height / 2;
      const [m] = f.splice(drag, 1); let to = above ? to0 + 1 : to0; if (drag < to) to--; f.splice(clamp(to, 0, f.length), 0, m);
      set(f, '채우기 층 순서');
    };
  });
}

/* ── 팝업 ── */
let POP = null;   // { el, state, opts }
export function closePaintPopover() { if (!POP) return; cancelAnimationFrame(POP.raf); POP.gh?.remove(); POP.el.remove(); document.removeEventListener('pointerdown', POP.outside, true); document.removeEventListener('keydown', POP.key, true); POP = null; }
export const paintPopoverOpen = () => !!POP;

export function openPaintPopover(anchor, paint0, opts) {
  closePaintPopover();
  const el = document.createElement('div'); el.className = 'fpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${opts.title ?? '채우기'} 편집`);
  document.body.appendChild(el);
  const S = { p: normPaint(paint0, { allowImage: true }) ?? newPaint(), sel: 0, opts, pk: false };
  if (!opts.allowAlpha) S.p = opaqueOf(S.p);
  const outside = e => { if (!el.contains(e.target) && !POP?.gh?.contains(e.target) && !e.target.closest?.('[data-flsw],[data-flopen]')) closePaintPopover(); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); closePaintPopover(); anchor?.querySelector?.('[data-flsw]')?.focus?.(); } };
  document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', key, true);
  POP = { el, S, outside, key, gh: null, raf: 0 };
  renderPop(el, S); place(el, anchor);
  // 11-23 캔버스 방향 손잡이(피그마): 칠한 상자(opts.box) 위에 그라데이션 선·손잡이를 띄운다 — 캔버스를 옮기거나 확대해도 따라가게 매 프레임 자리만 맞춘다
  if (opts.box) { const tick = () => { if (!POP || POP.S !== S) return; drawHandles(S); POP.raf = requestAnimationFrame(tick); }; tick(); }
}

/* ── 캔버스 손잡이 ── */
// 선형: CSS 각도 θ 의 그라데이션 선(상자 가운데를 지나는 길이 |w sinθ|+|h cosθ|) 위 from·to(%) 자리가 시작·끝 손잡이
function linGeom(p, w, h) {
  const th = (p.angle ?? 180) * Math.PI / 180, d = [Math.sin(th), -Math.cos(th)], L = Math.abs(w * d[0]) + Math.abs(h * d[1]);
  const at = u => [w / 2 + d[0] * L * (u - 0.5), h / 2 + d[1] * L * (u - 0.5)];
  return { p1: at((p.from ?? 0) / 100), p2: at((p.to ?? 100) / 100), at };
}
// 두 손잡이 자리 → 각도·from·to(손잡이를 선에 수직으로 옮긴 것은 같은 그림 — 선 위로 투영)
export function linearFromPoints(P1, P2, w, h) {
  const vx = P2[0] - P1[0], vy = P2[1] - P1[1]; if (Math.hypot(vx, vy) < 2) return null;
  const angle = normAngle(Math.atan2(vx, -vy) * 180 / Math.PI), th = angle * Math.PI / 180, d = [Math.sin(th), -Math.cos(th)], L = Math.abs(w * d[0]) + Math.abs(h * d[1]);
  const pr = P => Math.round((((P[0] - w / 2) * d[0] + (P[1] - h / 2) * d[1]) / L + 0.5) * 1000) / 10;
  return { angle, from: pr(P1), to: pr(P2) };
}
// 방사형: 중심 cx·cy(%) · 반지름 rx(폭 %)·ry(높이 %) — 없으면 예전 「가운데 원, 가장 먼 모서리까지」와 같은 값
function radGeom(p, w, h) {
  if (p.rx != null) return { cx: p.cx, cy: p.cy, rx: p.rx, ry: p.ry };
  const R = Math.hypot(w / 2, h / 2); return { cx: 50, cy: 50, rx: Math.round(R / w * 1000) / 10, ry: Math.round(R / h * 1000) / 10 };
}
const stopCss = s => s.a != null ? `rgba(${rgbOf(s.color).join(',')},${s.a / 100})` : s.color;
function drawHandles(S) {
  let gh = POP.gh;
  const B = isGrad(S.p) ? S.opts.box?.() : null;
  if (!B?.rect || !(B.w > 0)) { if (gh) gh.hidden = true; return; }
  if (!gh) { gh = POP.gh = document.createElement('div'); gh.className = 'fgh'; gh.setAttribute('aria-label', '그라데이션 방향 손잡이'); document.body.appendChild(gh); }
  gh.hidden = false;
  const { rect, w, h } = B, k = rect.width / w, X = x => rect.left + x * k, Y = y => rect.top + y * k, p = S.p;
  let svg, hs;
  if (p.type === 'linear') {
    const g = linGeom(p, w, h), mid = p.stops.slice(1, -1).map(s => g.at(((p.from ?? 0) + s.pos * ((p.to ?? 100) - (p.from ?? 0)) / 100) / 100));
    svg = `<line x1="${X(g.p1[0])}" y1="${Y(g.p1[1])}" x2="${X(g.p2[0])}" y2="${Y(g.p2[1])}"/>${mid.map(m => `<circle cx="${X(m[0])}" cy="${Y(m[1])}" r="3"/>`).join('')}`;
    hs = [['p1', g.p1, p.stops[0]], ['p2', g.p2, p.stops[p.stops.length - 1]]];
  } else {
    const r = radGeom(p, w, h), cx = r.cx / 100 * w, cy = r.cy / 100 * h, rx = r.rx / 100 * w, ry = r.ry / 100 * h;
    svg = `<ellipse cx="${X(cx)}" cy="${Y(cy)}" rx="${rx * k}" ry="${ry * k}"/><line x1="${X(cx)}" y1="${Y(cy)}" x2="${X(cx + rx)}" y2="${Y(cy)}"/><line x1="${X(cx)}" y1="${Y(cy)}" x2="${X(cx)}" y2="${Y(cy + ry)}"/>`;
    hs = [['c', [cx, cy], p.stops[0]], ['rx', [cx + rx, cy], p.stops[p.stops.length - 1]], ['ry', [cx, cy + ry], p.stops[p.stops.length - 1]]];
  }
  const sig = svg + hs.map(x => x[0] + stopCss(x[2])).join('');
  if (gh.__sig === sig) return; gh.__sig = sig;
  gh.innerHTML = `<svg width="100%" height="100%" aria-hidden="true">${svg}</svg>${hs.map(([id, pt, st]) => `<button type="button" class="fgh-h" data-gh="${id}" style="left:${X(pt[0])}px;top:${Y(pt[1])}px;--c:${stopCss(st)}" aria-label="${{ p1: '시작점', p2: '끝점', c: '중심', rx: '가로 반지름', ry: '세로 반지름' }[id]} — 끌어서 옮기기 · Shift 45° 단위"></button>`).join('')}`;
  gh.querySelectorAll('[data-gh]').forEach(b => b.onpointerdown = e => dragHandle(e, b.dataset.gh, S));
}
function dragHandle(e, id, S) {
  if (e.button !== 0) return; e.preventDefault(); e.stopPropagation();
  const B = S.opts.box?.(); if (!B) return;
  const { rect, w, h } = B, k = rect.width / w, el = POP.el;
  const P = ev => [(ev.clientX - rect.left) / k, (ev.clientY - rect.top) / k];
  const move = ev => {
    let q = P(ev), p = S.p;
    if (p.type === 'linear') {
      const g = linGeom(p, w, h), other = id === 'p1' ? g.p2 : g.p1;
      if (ev.shiftKey) { const v = [q[0] - other[0], q[1] - other[1]], len = Math.hypot(...v), a = Math.round(Math.atan2(v[1], v[0]) / (Math.PI / 4)) * (Math.PI / 4); q = [other[0] + len * Math.cos(a), other[1] + len * Math.sin(a)]; }
      const r = id === 'p1' ? linearFromPoints(q, other, w, h) : linearFromPoints(other, q, w, h);
      if (r) S.p = { ...p, ...r };
    } else {
      const r = radGeom(p, w, h), r1 = v => Math.round(v * 10) / 10;
      if (id === 'c') S.p = { ...p, ...r, cx: r1(q[0] / w * 100), cy: r1(q[1] / h * 100) };
      else if (id === 'rx') S.p = { ...p, ...r, rx: Math.max(1, r1(Math.abs(q[0] - r.cx / 100 * w) / w * 100)), ...(ev.shiftKey ? { ry: Math.max(1, r1(Math.abs(q[0] - r.cx / 100 * w) / h * 100)) } : {}) };
      else S.p = { ...p, ...r, ry: Math.max(1, r1(Math.abs(q[1] - r.cy / 100 * h) / h * 100)), ...(ev.shiftKey ? { rx: Math.max(1, r1(Math.abs(q[1] - r.cy / 100 * h) / w * 100)) } : {}) };
    }
    renderPop(el, S); drawHandles(S); live(S);
  };
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); commit(el, S, '그라데이션 방향'); };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}
function place(el, anchor, keep = false) {
  if (keep) { const h = el.offsetHeight, t = parseFloat(el.style.top) || 8; if (t + h > innerHeight - 8) el.style.top = `${Math.max(8, innerHeight - h - 8)}px`; return; }
  const r = anchor?.getBoundingClientRect?.() ?? { left: innerWidth / 2, top: 80, right: innerWidth / 2, bottom: 80 };
  const w = el.offsetWidth || 248, h = el.offsetHeight || 420;
  let x = r.left - w - 10; if (x < 8) x = Math.min(innerWidth - w - 8, r.right + 10);
  let y = Math.min(Math.max(8, r.top - 8), innerHeight - h - 8);
  el.style.left = `${Math.max(8, x)}px`; el.style.top = `${Math.max(8, y)}px`;
}
const isGrad = p => p.type === 'linear' || p.type === 'radial';
// 투명이 안 되는 칸(지면): 정지점 불투명도를 걷고, 단색 → 그라데이션은 「그 색 → 투명」 대신 「그 색 → 조금 어두운 색」
function opaqueOf(p) {
  if (!isGrad(p)) return p;
  const st = p.stops.map(({ a, ...x }) => x);
  if (p.stops.some(x => x.a === 0) && st.length === 2 && st[0].color === st[1].color) st[1] = { ...st[1], color: hexOf(rgbOf(st[0].color).map(v => v * 0.6)) };
  return { ...p, stops: st };
}
// 지금 고른 색(단색 = 칠 색 · 그라데이션 = 고른 정지점) — 불투명도는 단색이면 층 불투명도, 그라데이션이면 정지점 불투명도
function curColor(S) { const p = S.p; if (isGrad(p)) { const s = p.stops[Math.min(S.sel, p.stops.length - 1)]; return { hex: s.color, a: s.a ?? 100 }; } return { hex: p.type === 'solid' ? p.color : '#D9D9D9', a: p.opacity ?? 100 }; }
function setColor(S, hex, a) {
  const p = S.p;
  if (isGrad(p)) { const i = Math.min(S.sel, p.stops.length - 1); S.p = { ...p, stops: p.stops.map((s, k) => k === i ? { color: hex, pos: s.pos, ...(a != null && a < 100 ? { a: Math.round(a) } : {}) } : s) }; }
  else if (p.type === 'solid') S.p = { ...p, color: hex, ...(a != null ? { opacity: Math.round(a) } : {}) };
}

function pickerHtml(S) {
  const { hex, a } = curColor(S), hsv = S.hsv && hsvToHex(S.hsv) === hex ? S.hsv : hexToHsv(hex); S.hsv = hsv;
  const hue = hsvToHex({ h: hsv.h, s: 1, v: 1 }), alpha = S.opts.allowAlpha;
  return `<div class="fpk">
    <div class="fpk-sv" data-pk="sv" style="--hue:${hue}" role="slider" tabindex="0" aria-label="채도·명도" aria-valuetext="${hex}"><i style="left:${hsv.s * 100}%;top:${(1 - hsv.v) * 100}%"></i></div>
    <div class="fpk-row">
      ${window.EyeDropper ? `<button type="button" class="fib" data-pk="eye" title="스포이드 — 화면에서 색 고르기" aria-label="스포이드">${'<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5l3 3-1.5 1.5-1-1-5.5 5.5-2.5.5.5-2.5L9 4l-1-1z" fill="none" stroke="currentColor" stroke-linejoin="round"/></svg>'}</button>` : ''}
      <div class="fpk-bars">
        <div class="fpk-hue" data-pk="hue" role="slider" tabindex="0" aria-label="색상" aria-valuemin="0" aria-valuemax="360" aria-valuenow="${Math.round(hsv.h)}"><i style="left:${hsv.h / 360 * 100}%"></i></div>
        ${alpha ? `<div class="fpk-al" data-pk="al" style="--c:${hex}" role="slider" tabindex="0" aria-label="불투명도" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a}"><i style="left:${a}%"></i></div>` : ''}
      </div>
    </div>
    <div class="fpk-in"><span class="fpk-m">Hex</span><input type="text" class="fhex" data-pk="hex" value="${hex.slice(1)}" maxlength="7" spellcheck="false" aria-label="헥스">
      ${alpha ? `<span class="fop"><input type="text" inputmode="decimal" class="fnum fopn" data-pk="a" value="${a}" aria-label="불투명도(%)"><i aria-hidden="true">%</i></span>` : ''}</div>
  </div>`;
}
function gradHtml(S) {
  // 피그마 Custom › 그라데이션: 종류 드롭다운 · 돌리기 · 뒤집기 → 막대(정지점 손잡이) → 정지점 목록(위치 · 색 · 불투명도 · 빼기). 색 판은 정지점을 누르면 열린다
  const p = S.p, sel = Math.min(S.sel, p.stops.length - 1), alpha = S.opts.allowAlpha;
  const css = s => s.a != null ? `rgba(${rgbOf(s.color).join(',')},${s.a / 100})` : s.color;
  const bar = `linear-gradient(90deg,${p.stops.map(s => `${css(s)} ${s.pos}%`).join(',')})`;
  return `<div class="fpg-top"><select class="fsel" data-pg="type" aria-label="그라데이션 종류">${[['linear', '선형'], ['radial', '방사형']].map(([k, n]) => `<option value="${k}" ${p.type === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
      ${p.type === 'linear' ? `<div class="fin unit"><input type="text" inputmode="decimal" class="fnum" data-pg="ang" value="${p.angle}" aria-label="각도(도) — 180 = 위에서 아래"><span class="u" aria-hidden="true">°</span></div>${iconBtn('rot', '90도 돌리기', 'data-pg="rot"')}` : '<span></span><span></span>'}${iconBtn('flip-h', '색 순서 뒤집기', 'data-pg="flip"')}</div>
    <div class="gbar fpg-bar" data-pg="bar" title="누르면 정지점 추가 · 끌어서 옮기기 · Delete 로 지우기" style="--bar:${bar}">${p.stops.map((s, i) => `<button type="button" class="gpin ${i === sel ? 'on' : ''}" data-pgpin="${i}" style="left:${s.pos}%;--c:${css(s)}" aria-label="정지점 ${i + 1} ${s.color} 위치 ${s.pos}%"></button>`).join('')}</div>
    <div class="ghead"><span>정지점</span>${iconBtn('plus', '정지점 더하기', `data-pg="add" ${p.stops.length >= GRAD_MAX_STOPS ? 'disabled' : ''}`)}</div>
    <div class="fpg-stops">${p.stops.map((s, i) => `<div class="fpg-stop ${i === sel ? 'on' : ''}" data-pgrow="${i}">
      <div class="fin unit"><input type="text" inputmode="decimal" class="fnum" data-pgpos="${i}" value="${Math.round(s.pos)}" aria-label="정지점 ${i + 1} 위치"><span class="u" aria-hidden="true">%</span></div>
      <div class="fcin"><button type="button" class="flsw" data-pgsel="${i}" style="--sw:${css(s)}" aria-label="정지점 ${i + 1} 색 판 열기" aria-expanded="${S.pk && i === sel}"><i></i></button><input type="text" class="fhex" data-pghex="${i}" value="${s.color.slice(1)}" maxlength="7" spellcheck="false" aria-label="정지점 ${i + 1} 헥스"><span class="fop"><input type="text" inputmode="decimal" class="fnum fopn" data-pga="${i}" value="${s.a ?? 100}" aria-label="정지점 ${i + 1} 불투명도(%)" ${alpha ? '' : 'disabled title="지면은 불투명 — 위에 채우기 층을 더하면 투명을 쓸 수 있어요"'}><i aria-hidden="true">%</i></span></div>
      ${iconBtn('minus', `정지점 ${i + 1} 빼기`, `data-pgdel="${i}" ${p.stops.length <= 2 ? 'disabled' : ''}`)}</div>`).join('')}</div>
    ${S.pk ? pickerHtml(S) : ''}`;
}
const FITS = [['cover', '꽉 채우기'], ['contain', '전체 보기'], ['tile', '반복']];
function imageHtml(S) {
  const p = S.p;
  return `<div class="fpi-prev" style="${p.src ? `background-image:url(&quot;${esc(p.src)}&quot;)` : ''}">${p.src ? '' : '<span>이미지 없음</span>'}</div>
    <button type="button" class="btn" data-pi="pick" style="width:100%;margin-top:6px">${p.src ? '이미지 바꾸기' : '이미지 고르기'}</button><input type="file" accept="image/*" data-pi="file" hidden>
    <div class="fseg" role="group" aria-label="배치" style="margin-top:8px">${FITS.map(([k, n]) => `<button type="button" data-pifit="${k}" class="${p.fit === k ? 'on' : ''}" aria-pressed="${p.fit === k}">${n}</button>`).join('')}</div>
    ${p.fit === 'tile' ? `<label class="fpi-r"><span>반복 크기</span><input type="range" min="10" max="100" value="${p.tile ?? 30}" data-pir="tile" aria-label="반복 크기(짧은 변 %)"><b>${p.tile ?? 30}%</b></label>` : ''}
    <label class="fpi-r"><span>가로 위치</span><input type="range" min="0" max="100" value="${p.x ?? 50}" data-pir="x" aria-label="가로 위치(%)"><b>${p.x ?? 50}%</b></label>
    <label class="fpi-r"><span>세로 위치</span><input type="range" min="0" max="100" value="${p.y ?? 50}" data-pir="y" aria-label="세로 위치(%)"><b>${p.y ?? 50}%</b></label>`;
}
function renderPop(el, S) {
  const p = S.p, types = S.opts.types;
  const on = t => p.type === t || (t === 'linear' && p.type === 'radial');
  el.innerHTML = `<div class="fpop-h"><div class="fpop-tabs" role="tablist" aria-label="칠 종류">${types.filter(t => t !== 'radial').map(t => `<button type="button" role="tab" class="fib${on(t) ? ' on' : ''}" data-pt="${t}" aria-selected="${on(t)}" title="${t === 'linear' ? '그라데이션' : PAINT_NAME[t]}" aria-label="${t === 'linear' ? '그라데이션' : PAINT_NAME[t]}">${TYPE_ICON[t]}</button>`).join('')}</div>
    <span class="fpop-t">${esc(S.opts.title ?? '')}</span>${iconBtn('minus', '닫기', 'data-pclose="1"').replace(ic('minus'), '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-linecap="round"/></svg>')}</div>
    <div class="fpop-b">${p.type === 'image' ? imageHtml(S) : isGrad(p) ? gradHtml(S) : pickerHtml(S)}</div>`;
  wirePop(el, S);
}

let rafId = 0;
function live(S) { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(() => S.opts.onLive?.(S.p)); }
function commit(el, S, label) { cancelAnimationFrame(rafId); S.opts.onChange(S.p, label); renderPop(el, S); }
// 누르고 끄는 칸(색 판·막대) — 창에 붙인 이벤트라 다시 그려도 끊기지 않는다
function dragOn(target, el, S, at, label) {
  target.onpointerdown = e => {
    if (e.button !== 0) return; e.preventDefault();
    const rect = target.getBoundingClientRect();
    const move = ev => { at((clamp(ev.clientX, rect.left, rect.right) - rect.left) / (rect.width || 1), (clamp(ev.clientY, rect.top, rect.bottom) - rect.top) / (rect.height || 1)); renderPop(el, S); live(S); };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); commit(el, S, label); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
    move(e);
  };
}
function keySlide(node, el, S, step, label) {
  node.onkeydown = e => { const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key]; if (!d) return; e.preventDefault(); step(d * (e.shiftKey ? 10 : 1)); commit(el, S, label); el.querySelector(`[data-pk="${node.dataset.pk}"]`)?.focus(); };
}
function wirePop(el, S) {
  wireFui(el);
  el.querySelector('[data-pclose]').onclick = () => closePaintPopover();
  el.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { if (S.p.type === b.dataset.pt || (b.dataset.pt === 'linear' && S.p.type === 'radial')) return; S.p = convertPaint(S.p, b.dataset.pt); if (!S.opts.allowAlpha) S.p = opaqueOf(S.p); S.sel = 0; S.hsv = null; S.pk = false; if (S.p.type === 'image' && !S.p.src) { renderPop(el, S); el.querySelector('[data-pi="file"]')?.click(); return; } commit(el, S, `칠 종류 ${PAINT_NAME[S.p.type]}`); });
  // 색 판
  const sv = el.querySelector('[data-pk="sv"]');
  if (sv) {
    dragOn(sv, el, S, (x, y) => { S.hsv = { ...S.hsv, s: x, v: 1 - y }; setColor(S, hsvToHex(S.hsv), null); }, '색 고르기');
    keySlide(sv, el, S, d => { S.hsv = { ...S.hsv, s: clamp(S.hsv.s + d / 100, 0, 1) }; setColor(S, hsvToHex(S.hsv), null); }, '색 고르기');
    const hue = el.querySelector('[data-pk="hue"]');
    dragOn(hue, el, S, x => { S.hsv = { ...S.hsv, h: Math.min(359.9, x * 360) }; setColor(S, hsvToHex(S.hsv), null); }, '색상');
    keySlide(hue, el, S, d => { S.hsv = { ...S.hsv, h: (S.hsv.h + d + 360) % 360 }; setColor(S, hsvToHex(S.hsv), null); }, '색상');
    const al = el.querySelector('[data-pk="al"]');
    if (al) { dragOn(al, el, S, x => setColor(S, curColor(S).hex, Math.round(x * 100)), '불투명도'); keySlide(al, el, S, d => setColor(S, curColor(S).hex, clamp(curColor(S).a + d, 0, 100)), '불투명도'); }
    const hx = el.querySelector('[data-pk="hex"]');
    hx.onchange = () => { const h = parseHex(hx.value); if (!h) { hx.value = curColor(S).hex.slice(1); return; } S.hsv = null; setColor(S, h, null); commit(el, S, '색 헥스'); };
    hx.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); hx.dispatchEvent(new Event('change')); } };
    const ai = el.querySelector('[data-pk="a"]');
    if (ai) ai.onchange = () => { const v = Math.round(parseFloat(ai.value)); if (!Number.isFinite(v)) { ai.value = curColor(S).a; return; } setColor(S, curColor(S).hex, clamp(v, 0, 100)); commit(el, S, '불투명도'); };
    el.querySelector('[data-pk="eye"]')?.addEventListener('click', async () => { try { const r = await new window.EyeDropper().open(); const h = parseHex(r.sRGBHex); if (h) { S.hsv = null; setColor(S, h, null); commit(el, S, '스포이드 색'); } } catch {} });
  }
  // 그라데이션
  if (isGrad(S.p)) {
    const g = () => S.p;
    el.querySelector('[data-pg="type"]').onchange = e => { S.p = { ...g(), type: e.target.value }; commit(el, S, `그라데이션 ${e.target.value === 'radial' ? '방사형' : '선형'}`); };
    const ang = el.querySelector('[data-pg="ang"]'); if (ang) ang.onchange = () => { const v = parseFloat(ang.value); if (!Number.isFinite(v)) { ang.value = g().angle; return; } S.p = { ...g(), angle: normAngle(v) }; commit(el, S, '그라데이션 각도'); };
    el.querySelector('[data-pg="rot"]')?.addEventListener('click', () => { S.p = { ...g(), ...rotateGradient(g(), 90), opacity: g().opacity, ...(g().hidden ? { hidden: true } : {}) }; commit(el, S, '그라데이션 90° 돌리기'); });
    el.querySelector('[data-pg="flip"]').onclick = () => { const f = flipGradient(g()); S.p = { ...g(), stops: f.stops }; S.sel = g().stops.length - 1 - S.sel; commit(el, S, '그라데이션 뒤집기'); };
    el.querySelector('[data-pg="add"]')?.addEventListener('click', () => { const s = g().stops, i = Math.min(S.sel, s.length - 1), j = i < s.length - 1 ? i + 1 : i - 1, pos = (s[i].pos + s[j].pos) / 2; const r = addStop(g(), pos); if (r.index >= 0) { S.p = { ...g(), stops: r.gradient.stops }; S.sel = r.index; S.hsv = null; commit(el, S, '정지점 더하기'); } });
    const bar = el.querySelector('[data-pg="bar"]');
    const posOf = ev => { const r = bar.getBoundingClientRect(); return clamp((ev.clientX - r.left) / (r.width || 1) * 100, 0, 100); };
    bar.onpointerdown = e => {
      if (e.button !== 0) return; e.preventDefault();
      const pin = e.target.closest('[data-pgpin]');
      if (!pin) { const r = addStop(g(), posOf(e)); if (r.index < 0) return; S.p = { ...g(), stops: r.gradient.stops }; S.sel = r.index; S.hsv = null; commit(el, S, '정지점 더하기'); return; }
      S.sel = +pin.dataset.pgpin; S.hsv = null; let moved = false;
      const move = ev => { moved = true; const r = moveStop(g(), S.sel, posOf(ev)); S.p = { ...g(), stops: r.gradient.stops }; S.sel = r.index; renderPop(el, S); live(S); };
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); if (moved) commit(el, S, '정지점 옮기기'); else { S.pk = true; renderPop(el, S); place(el, null, true); el.querySelector(`[data-pgpin="${S.sel}"]`)?.focus(); } };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    };
    el.querySelectorAll('[data-pgpin]').forEach(b => b.onkeydown = e => {
      const i = +b.dataset.pgpin;
      if ((e.key === 'Delete' || e.key === 'Backspace') && g().stops.length > 2) { e.preventDefault(); S.p = { ...g(), stops: removeStop(g(), i).stops }; S.sel = Math.max(0, i - 1); commit(el, S, '정지점 빼기'); return; }
      const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (!d) return; e.preventDefault();
      const r = moveStop(g(), i, g().stops[i].pos + d * (e.shiftKey ? 10 : 1)); S.p = { ...g(), stops: r.gradient.stops }; S.sel = r.index; commit(el, S, '정지점 옮기기'); el.querySelector(`[data-pgpin="${S.sel}"]`)?.focus();
    });
    el.querySelectorAll('[data-pgsel]').forEach(b => b.onclick = () => { const i = +b.dataset.pgsel; S.pk = !(S.pk && S.sel === i); S.sel = i; S.hsv = null; renderPop(el, S); place(el, null, true); });
    el.querySelectorAll('[data-pgrow]').forEach(r => r.addEventListener('focusin', () => { const i = +r.dataset.pgrow; if (S.sel !== i) { S.sel = i; S.hsv = null; el.querySelectorAll('.fpg-stop').forEach(x => x.classList.toggle('on', +x.dataset.pgrow === i)); el.querySelectorAll('.gpin').forEach(x => x.classList.toggle('on', +x.dataset.pgpin === i)); } }));
    el.querySelectorAll('[data-pgpos]').forEach(inp => inp.onchange = () => { const i = +inp.dataset.pgpos, v = parseFloat(inp.value); if (!Number.isFinite(v)) { inp.value = Math.round(g().stops[i].pos); return; } const r = moveStop(g(), i, v); S.p = { ...g(), stops: r.gradient.stops }; S.sel = r.index; commit(el, S, '정지점 위치'); });
    el.querySelectorAll('[data-pghex]').forEach(inp => inp.onchange = () => { const i = +inp.dataset.pghex, h = parseHex(inp.value); if (!h) { inp.value = g().stops[i].color.slice(1); return; } S.sel = i; S.hsv = null; setColor(S, h, g().stops[i].a ?? 100); commit(el, S, '정지점 색'); });
    el.querySelectorAll('[data-pga]').forEach(inp => inp.onchange = () => { const i = +inp.dataset.pga, v = Math.round(parseFloat(inp.value)); if (!Number.isFinite(v)) { inp.value = g().stops[i].a ?? 100; return; } S.sel = i; setColor(S, g().stops[i].color, clamp(v, 0, 100)); commit(el, S, '정지점 불투명도'); });
    el.querySelectorAll('[data-pgdel]').forEach(b => b.onclick = () => { const i = +b.dataset.pgdel; S.p = { ...g(), stops: removeStop(g(), i).stops }; S.sel = Math.max(0, Math.min(S.sel, S.p.stops.length - 1)); commit(el, S, '정지점 빼기'); });
  }
  // 이미지
  if (S.p.type === 'image') {
    const file = el.querySelector('[data-pi="file"]');
    el.querySelector('[data-pi="pick"]').onclick = () => file.click();
    file.onchange = async () => { const f = file.files?.[0]; if (!f) return; const src = await readImage(f); if (!src) return; S.p = { ...S.p, src, name: f.name.slice(0, 80) }; commit(el, S, '배경 이미지 넣기'); };
    el.querySelectorAll('[data-pifit]').forEach(b => b.onclick = () => { S.p = { ...S.p, fit: b.dataset.pifit }; commit(el, S, '배경 이미지 배치'); });
    el.querySelectorAll('[data-pir]').forEach(r => { r.oninput = () => { S.p = { ...S.p, [r.dataset.pir]: +r.value }; r.nextElementSibling.textContent = `${r.value}%`; live(S); }; r.onchange = () => commit(el, S, '배경 이미지 위치·크기'); });
  }
}
// 큰 사진은 긴 변 2400px 로 줄여 넣는다(저장 용량 — 배경 장식이라 그 이상은 티가 안 난다)
async function readImage(file) {
  const url = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(file); });
  if (!url) return null;
  try {
    const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const k = Math.min(1, 2400 / Math.max(img.width, img.height)); if (k >= 1) return url;
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL(/png|gif|webp/.test(file.type) ? 'image/png' : 'image/jpeg', 0.9);
  } catch { return url; }
}
export { colorAt };

/* ── 테두리(피그마 Stroke) — 한 줄: 견본 · 헥스 · % · 눈 · 빼기 / 위치(안쪽) · 두께 ── */
export function strokeSectionHtml(id, stroke, { title = '테두리', disabled = false } = {}) {
  const S = stroke;
  return `<div class="fill" id="${esc(id)}Stroke"><div class="flab"><span>${esc(title)}</span>${S ? '' : iconBtn('plus', `${title} 더하기`, `data-sadd="1" ${disabled ? 'disabled' : ''}`)}</div>
    ${S ? `<div class="fllist"><div class="flrow${S.hidden ? ' hid' : ''}"><span class="flgrip"></span>
      <div class="fcin"><button type="button" class="flsw" data-ssw="1" style="--sw:${esc(paintSwatchCss({ type: 'solid', color: S.color, opacity: S.opacity }))}" aria-label="${esc(title)} 색 편집 열기" ${disabled ? 'disabled' : ''}><i></i></button><input type="text" class="fhex" data-shex="1" value="${esc(S.color.slice(1))}" maxlength="7" spellcheck="false" aria-label="${esc(title)} 색 헥스" ${disabled ? 'disabled' : ''}><span class="fop"><input type="text" inputmode="decimal" class="fnum fopn" data-sop="1" value="${S.opacity ?? 100}" aria-label="${esc(title)} 불투명도(%)" ${disabled ? 'disabled' : ''}><i aria-hidden="true">%</i></span></div>
      ${iconBtn(S.hidden ? 'eye-off' : 'eye', S.hidden ? '테두리 보이기' : '테두리 숨기기', `data-seye="1" aria-pressed="${!!S.hidden}" ${disabled ? 'disabled' : ''}`)}${iconBtn('minus', '테두리 빼기', `data-sdel="1" ${disabled ? 'disabled' : ''}`)}</div></div>
    <div class="fgrid2" style="margin-top:6px"><div class="fin"><input type="text" class="fnum" value="안쪽" disabled aria-label="테두리 위치(안쪽)" title="테두리는 소재 안쪽에 그려요 — 크기가 바뀌지 않게"></div><div class="fin unit pre"><span class="k" aria-hidden="true">${ic('lh')}</span><input type="text" inputmode="decimal" class="fnum" data-sw="1" value="${S.width}" aria-label="테두리 두께(px)" ${disabled ? 'disabled' : ''}><span class="u" aria-hidden="true">px</span></div></div>` : ''}</div>`;
}
// opts: stroke() · onChange(stroke|null, label) · onLive(stroke)
export function bindStrokeSection(root, id, opts) {
  const box = root?.querySelector(`#${CSS.escape(id)}Stroke`); if (!box) return;
  wireFui(box);
  const cur = () => ({ ...(opts.stroke() ?? {}) });
  box.querySelector('[data-sadd]')?.addEventListener('click', () => opts.onChange({ color: '#000000', width: 1, opacity: 100 }, '테두리 더하기'));
  box.querySelector('[data-sdel]')?.addEventListener('click', () => { closePaintPopover(); opts.onChange(null, '테두리 빼기'); });
  box.querySelector('[data-seye]')?.addEventListener('click', () => { const S = cur(); if (S.hidden) delete S.hidden; else S.hidden = true; opts.onChange(S, S.hidden ? '테두리 숨기기' : '테두리 보이기'); });
  const hx = box.querySelector('[data-shex]'); if (hx) { hx.onchange = () => { const h = parseHex(hx.value); if (!h) { hx.value = cur().color?.slice(1) ?? ''; return; } opts.onChange({ ...cur(), color: h }, '테두리 색'); }; hx.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); hx.blur(); } }; }
  const op = box.querySelector('[data-sop]'); if (op) op.onchange = () => { const v = Math.round(parseFloat(op.value)); if (!Number.isFinite(v)) { op.value = cur().opacity ?? 100; return; } opts.onChange({ ...cur(), opacity: clamp(v, 0, 100) }, '테두리 불투명도'); };
  const w = box.querySelector('[data-sw]'); if (w) w.onchange = () => { const v = parseFloat(w.value); if (!(v > 0)) { w.value = cur().width ?? 1; return; } opts.onChange({ ...cur(), width: clamp(v, 0.5, 40) }, '테두리 두께'); };
  box.querySelector('[data-ssw]')?.addEventListener('click', e => {
    e.stopPropagation(); const S = cur();
    openPaintPopover(e.currentTarget.closest('.flrow'), { type: 'solid', color: S.color, opacity: S.opacity ?? 100 }, { types: ['solid'], allowAlpha: true, title: '테두리',
      onLive: p => opts.onLive?.({ ...cur(), color: p.color, opacity: p.opacity }), onChange: (p, label) => opts.onChange({ ...cur(), color: p.color, opacity: p.opacity }, label ?? '테두리 색') });
  });
}

/* ── 선택 색(피그마 Selection colors) — 이 소재에 실제로 쓰인 칠. 바꾸면 그 칠을 쓰는 곳이 다 바뀐다 ── */
// items: [{ paint, label, types, allowAlpha, set(paint, label), live?(paint) }]
export function selColorsHtml(id, items, { title = '선택 색' } = {}) {
  if (!items.length) return '';
  return `<div class="fill" id="${esc(id)}Sel"><div class="flab"><span>${esc(title)}</span></div><div class="fllist">${items.map((it, i) => `<div class="flrow sel"><span class="flgrip"></span>
    <div class="fcin"><button type="button" class="flsw" data-csw="${i}" style="--sw:${esc(paintSwatchCss(it.paint))}" aria-label="${esc(it.label)} 편집 열기" ${it.set ? '' : 'disabled'}><i></i></button><button type="button" class="fllab" data-csw="${i}" ${it.set ? '' : 'disabled'}>${esc(paintLabel(it.paint))}</button><span class="ft">${esc(it.label)}</span><span class="fop"><input type="text" class="fnum fopn" value="${it.paint.opacity ?? 100}" disabled aria-label="불투명도"><i aria-hidden="true">%</i></span></div>
    <span class="fib" aria-hidden="true"></span><span class="fib" aria-hidden="true"></span></div>`).join('')}</div></div>`;
}
export function bindSelColors(root, id, items, box = null) {
  const el = root?.querySelector(`#${CSS.escape(id)}Sel`); if (!el) return;
  el.querySelectorAll('[data-csw]').forEach(b => b.onclick = e => {
    e.stopPropagation(); const it = items[+b.dataset.csw]; if (!it?.set) return;
    openPaintPopover(b.closest('.flrow'), it.paint, { types: it.types ?? ['solid'], allowAlpha: !!it.allowAlpha, title: it.label, box: it.box ?? box, onLive: p => it.live?.(p), onChange: (p, label) => it.set(p, label) });
  });
}

/* ── 자유 팝업(키비주얼 칸 등) — 채우기 팝업과 같은 자리·닫기 ── */
export function openCustomPopover(anchor, title, html, bind) {
  closePaintPopover();
  const el = document.createElement('div'); el.className = 'fpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', title);
  el.innerHTML = `<div class="fpop-h"><span class="fpop-t" style="text-align:left;color:var(--ink);font-weight:600">${esc(title)}</span>${iconBtn('minus', '닫기', 'data-pclose="1"').replace(ic('minus'), '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-linecap="round"/></svg>')}</div><div class="fpop-b">${html}</div>`;
  document.body.appendChild(el);
  const outside = e => { if (!el.contains(e.target) && !e.target.closest?.('[data-flsw],[data-flopen]')) closePaintPopover(); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); closePaintPopover(); } };
  document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', key, true);
  POP = { el, S: null, outside, key, gh: null, raf: 0 };
  el.querySelector('[data-pclose]').onclick = () => closePaintPopover();
  wireFui(el); bind?.(el); place(el, anchor);
  return el;
}
