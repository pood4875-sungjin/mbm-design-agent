// 키비주얼 보여 줄 영역 지정(11-02 컨시어지 한희하 「잘리면 안 되는 곳을 지정」 · 사용자 「차라리 누르면 영역 지정을 내가 할 수 있게」).
//   썸네일(인테이크 kvThumb · 인스펙터 iKv) 위에서 끌면 영역이 그려지고, 안쪽을 끌면 옮기고, 네 모서리로 크기를 바꾼다. 「자동으로」 = 해제.
//   값은 kvMeta.manual = { region, focus, keep } (field.manual 에도 같은 것). region 은 왼쪽 위 기준 그림 몫 0~1 — core/renderers/ad.js regionFit 이 모든 규격 그림 칸에 맞추고,
//   focus(가운데 기준)·keep(왼쪽 위 기준)은 같은 영역을 그리기 규칙(core/field.js effectiveField)에도 알린다.
import { profileFocus } from '../core/field.js';
import { kvTypeOf } from '../core/kvtypes.js';

const r3 = v => Math.round(v * 1000) / 1000;
const clamp01 = v => Math.min(1, Math.max(0, v));
const MIN = 0.05;   // 이보다 작은 영역은 실수로 본다

// manual 을 kvMeta 에 입힌다(없애려면 null). kvMeta.manual 과 field.manual 둘 다 — 렌더러(field.js)는 field 만 받는다
export function withManual(kvMeta, manual) {
  if (!kvMeta) return kvMeta;
  const R = manual?.region ?? null;
  const m = R ? { region: R, focus: { x: r3(R.x + R.w / 2), y: r3(R.y + R.h / 2), w: R.w, h: R.h }, keep: R } : (manual && (manual.focus || manual.keep) ? { focus: manual.focus ?? null, keep: manual.keep ?? null } : null);
  const { manual: _m, ...rest } = kvMeta;
  const { manual: _f, ...field } = kvMeta.field ?? {};
  return { ...rest, ...(m ? { manual: m } : {}), field: kvMeta.field ? { ...field, ...(m ? { manual: m } : {}) } : kvMeta.field };
}
// 끌기 — mode: 'draw'(s=시작점) · 'move' · 'nw|ne|sw|se'. 영역은 그림 안에 머문다
export function dragRegion(mode, from, s, p) {
  if (mode === 'draw') { const x = Math.min(s.x, p.x), y = Math.min(s.y, p.y); return { x: r3(x), y: r3(y), w: r3(Math.abs(p.x - s.x)), h: r3(Math.abs(p.y - s.y)) }; }
  if (mode === 'move') return { x: r3(clamp01(Math.min(from.x + p.x - s.x, 1 - from.w))), y: r3(clamp01(Math.min(from.y + p.y - s.y, 1 - from.h))), w: from.w, h: from.h };
  let x0 = from.x, y0 = from.y, x1 = from.x + from.w, y1 = from.y + from.h;
  if (mode.includes('w')) x0 = Math.min(p.x, x1 - MIN); else x1 = Math.max(p.x, x0 + MIN);
  if (mode.includes('n')) y0 = Math.min(p.y, y1 - MIN); else y1 = Math.max(p.y, y0 + MIN);
  x0 = clamp01(x0); y0 = clamp01(y0); x1 = clamp01(x1); y1 = clamp01(y1);
  return { x: r3(x0), y: r3(y0), w: r3(x1 - x0), h: r3(y1 - y0) };
}

// 썸네일(background-image 로 그림을 보여 주는 칸)에 오버레이를 붙인다. 다시 부르면 이전 오버레이를 갈아 끼운다.
//   opts.kvMeta: 지금 kvMeta(유형 지정 입힌 것) · opts.onChange(manual|null) · opts.readOnly · opts.onLive(region): 끄는 동안 보드 미리보기 · opts.onLiveCancel: 취소
export function mountKvFocus(thumb, { kvMeta, onChange, onLive, onLiveCancel, readOnly = false } = {}) {
  if (!thumb) return null;
  thumb.querySelector('.kvfocus')?.remove();
  const ar = kvMeta?.ar;
  if (!ar || !kvMeta.field) return null;
  thumb.classList.add('hasfocus');
  thumb.style.backgroundSize = 'contain';   // 전체가 보여야 영역을 고른다
  const ov = document.createElement('div');
  ov.className = 'kvfocus';
  ov.tabIndex = readOnly ? -1 : 0;
  ov.setAttribute('role', 'group');
  ov.setAttribute('aria-label', '키비주얼 보여 줄 영역 — 끌어서 지정, 안쪽을 끌면 옮기기, 모서리로 크기, 방향키로 옮기기, Esc 로 자동');
  ov.title = readOnly ? '보여 줄 영역' : '끌어서 보여 줄 영역 지정 · 모든 규격에 반영돼요';
  thumb.appendChild(ov);

  const manual = kvMeta.manual ?? kvMeta.field.manual ?? null;
  let region = manual?.region ?? manual?.keep ?? null;   // 예전 값(keep 만)도 영역으로 본다
  const auto = kvMeta.field.focus ?? profileFocus({ ...kvMeta.field, manual: null });
  const T = kvTypeOf(kvMeta);
  const typeName = T ? (T.sub?.name ?? T.name) : '';

  // 그림이 칸 안에서 차지하는 자리(contain) — 영역은 이 자리 기준
  const layout = () => {
    const W = thumb.clientWidth, H = thumb.clientHeight;
    const s = Math.min(W / ar, H), dw = s * ar, dh = s;
    ov.style.cssText = `left:${(W - dw) / 2}px;top:${(H - dh) / 2}px;width:${dw}px;height:${dh}px`;
  };
  layout();
  const boxCss = b => `left:${b.x * 100}%;top:${b.y * 100}%;width:${b.w * 100}%;height:${b.h * 100}%`;
  let regionEl = null;
  const draw = () => {
    ov.querySelectorAll('.kvbox,.kvtag,.kvauto,.kvregion').forEach(e => e.remove());
    if (region) {
      regionEl = document.createElement('div'); regionEl.className = 'kvregion'; regionEl.style.cssText = boxCss(region);
      if (!readOnly) for (const c of ['nw', 'ne', 'sw', 'se']) { const h = document.createElement('span'); h.className = `kvh ${c}`; h.dataset.h = c; regionEl.appendChild(h); }
      ov.appendChild(regionEl);
    } else if (auto) {
      const d = document.createElement('div'); d.className = 'kvbox'; d.style.cssText = boxCss({ x: clamp01(auto.x - auto.w / 2), y: clamp01(auto.y - auto.h / 2), w: Math.min(auto.w, 1), h: Math.min(auto.h, 1) });
      ov.appendChild(d);
    }
    const tag = document.createElement('div'); tag.className = 'kvtag';
    tag.textContent = region ? '이 영역이 모든 규격에 보여요' : `${typeName ? typeName + ' · ' : ''}끌어서 보여 줄 영역 지정`;
    ov.appendChild(tag);
    if (region && !readOnly) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'kvauto'; b.textContent = '자동으로';
      b.title = '지정을 지우고 자동 판정으로';
      b.onpointerdown = e => e.stopPropagation();
      b.onclick = e => { e.stopPropagation(); onChange?.(null); };
      ov.appendChild(b);
    }
  };
  draw();
  if (readOnly) return ov;

  let st = null;
  const at = e => { const b = ov.getBoundingClientRect(); return { x: clamp01((e.clientX - b.left) / b.width), y: clamp01((e.clientY - b.top) / b.height) }; };
  ov.onpointerdown = e => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation(); layout();
    const h = e.target.dataset?.h, inside = e.target.classList?.contains('kvregion');
    st = { mode: h ?? (inside ? 'move' : 'draw'), s: at(e), from: region, moved: false };
    ov.setPointerCapture(e.pointerId);
  };
  ov.onpointermove = e => {
    if (!st) return;
    const r = dragRegion(st.mode, st.from, st.s, at(e));
    st.moved = true; st.cur = r;
    if (!regionEl || !regionEl.isConnected) { region = r; draw(); }
    regionEl.style.cssText = boxCss(r);
    if (r.w >= MIN && r.h >= MIN) onLive?.(r);
  };
  const end = e => {
    if (!st) return;
    e.stopPropagation();
    const { moved, cur, from } = st; st = null;
    try { ov.releasePointerCapture(e.pointerId); } catch {}
    if (!moved) return;   // 그냥 누른 건 아무것도 안 바꾼다
    if (!(cur.w >= MIN && cur.h >= MIN)) { region = from; draw(); onLiveCancel?.(); return; }
    region = cur; onChange?.({ region: cur });
  };
  ov.onpointerup = end;
  ov.onpointercancel = () => { if (st) { const m = st.moved; region = st.from; st = null; draw(); if (m) onLiveCancel?.(); } };
  ov.onclick = e => e.stopPropagation();   // 썸네일의 파일 열기(onclick)를 막는다 — 교체는 아래 「교체」로
  ov.onkeydown = e => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d && region) { e.preventDefault(); e.stopPropagation(); onChange?.({ region: dragRegion('move', region, { x: 0, y: 0 }, { x: d[0], y: d[1] }) }); }
    else if ((e.key === 'Escape' || e.key === 'Backspace') && region) { e.preventDefault(); e.stopPropagation(); onChange?.(null); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); thumb.onclick?.(); }   // 키보드로 교체
  };
  const rep = document.createElement('button'); rep.type = 'button'; rep.className = 'kvrep'; rep.textContent = '교체'; rep.title = '다른 그림으로 바꾸기';
  rep.onpointerdown = e => e.stopPropagation();
  rep.onclick = e => { e.stopPropagation(); thumb.onclick?.(e); };
  ov.appendChild(rep);
  return ov;
}
