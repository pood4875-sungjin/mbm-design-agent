// 키비주얼 주인공 확인·직접 지정(11-02 컨시어지 한희하 「어느 사이즈를 넣어도 중앙 중심으로 배치 · 잘리면 안 되는 곳을 지정 · AI 판단 불확실」,
//   사용자 「무조건 센터 중심이 아니라 판단해서 포인트를 잘 잡아내거나, 그걸 한 번 더 확인하는 장치」).
// 썸네일(인테이크 스타일 카드 kvThumb · 인스펙터 iKv) 위에 지금 판정된 주인공 상자(focus)·AI 보존 상자(keep·faces)를 반투명 네모로 겹쳐 보여 주고,
//   클릭 = 주인공 가운데(점) · 드래그 = 잘리면 안 되는 곳(keep 상자) · 「자동으로」 = 해제. 값은 kvMeta.manual = { focus, keep } (field.manual 에도 같은 것) — core/field.js effectiveField 가 읽는다.
// 좌표는 그림 기준 0~1. focus 는 가운데 기준 {x,y,w,h}, keep 은 왼쪽 위 기준 {x,y,w,h}(AI keep 과 같은 꼴).
import { effectiveField, profileFocus } from '../core/field.js';
import { kvTypeOf } from '../core/kvtypes.js';

const r3 = v => Math.round(v * 1000) / 1000;
const clamp01 = v => Math.min(1, Math.max(0, v));

// manual 을 kvMeta 에 입힌다(없애려면 null). kvMeta.manual 과 field.manual 둘 다 — 렌더러(field.js)는 field 만 받는다
export function withManual(kvMeta, manual) {
  if (!kvMeta) return kvMeta;
  const m = manual && (manual.focus || manual.keep) ? { focus: manual.focus ?? null, keep: manual.keep ?? null } : null;
  const { manual: _m, ...rest } = kvMeta;
  const { manual: _f, ...field } = kvMeta.field ?? {};
  return { ...rest, ...(m ? { manual: m } : {}), field: kvMeta.field ? { ...field, ...(m ? { manual: m } : {}) } : kvMeta.field };
}

// 썸네일(background-image 로 그림을 보여 주는 칸)에 오버레이를 붙인다. 다시 부르면 이전 오버레이를 갈아 끼운다.
//   opts.kvMeta: 지금 kvMeta(유형 지정 입힌 것) · opts.onChange(manual|null) · opts.readOnly
export function mountKvFocus(thumb, { kvMeta, onChange, readOnly = false } = {}) {
  if (!thumb) return null;
  thumb.querySelector('.kvfocus')?.remove();
  const ar = kvMeta?.ar;
  if (!ar || !kvMeta.field) return null;
  thumb.classList.add('hasfocus');
  thumb.style.backgroundSize = 'contain';   // 전체가 보여야 점을 찍는다(cover 는 잘린 곳을 못 찍는다)
  const ov = document.createElement('div');
  ov.className = 'kvfocus';
  ov.tabIndex = readOnly ? -1 : 0;
  ov.setAttribute('role', 'group');
  ov.setAttribute('aria-label', '키비주얼 주인공 확인 — 클릭: 주인공 가운데, 드래그: 잘리면 안 되는 곳, 방향키: 가운데 옮기기, Esc: 자동으로');
  ov.title = readOnly ? '주인공으로 읽은 곳' : '클릭 = 주인공 가운데 · 드래그 = 잘리면 안 되는 곳 · Esc = 자동으로';
  thumb.appendChild(ov);

  const manual = kvMeta.manual ?? kvMeta.field.manual ?? null;
  const F = effectiveField(kvMeta.field);
  const auto = kvMeta.field.focus ?? profileFocus({ ...kvMeta.field, manual: null });
  const focus = manual?.focus || manual?.keep ? F.focus : auto;
  const keep = manual?.keep ?? null;
  const ai = kvMeta.ai ?? null;
  const T = kvTypeOf(kvMeta);
  const typeName = T ? (T.sub?.name ?? T.name) : '';

  // 그림이 칸 안에서 차지하는 자리(contain) — 네모는 이 자리 기준
  const layout = () => {
    const W = thumb.clientWidth, H = thumb.clientHeight;
    const s = Math.min(W / ar, H), dw = s * ar, dh = s;
    const r = { x: (W - dw) / 2, y: (H - dh) / 2, w: dw, h: dh };
    ov.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
    return r;
  };
  let R = layout();
  const box = (cls, b, text) => {   // b: 왼쪽 위 기준 0~1
    const d = document.createElement('div');
    d.className = `kvbox ${cls}`;
    d.style.cssText = `left:${clamp01(b.x) * 100}%;top:${clamp01(b.y) * 100}%;width:${(clamp01(b.x + b.w) - clamp01(b.x)) * 100}%;height:${(clamp01(b.y + b.h) - clamp01(b.y)) * 100}%`;
    if (text) { const t = document.createElement('i'); t.textContent = text; d.appendChild(t); }
    ov.appendChild(d); return d;
  };
  const tl = f => ({ x: f.x - f.w / 2, y: f.y - f.h / 2, w: f.w, h: f.h });
  const draw = () => {
    ov.querySelectorAll('.kvbox,.kvdot,.kvtag,.kvauto').forEach(e => e.remove());
    for (const f of ai?.faces ?? []) box('face', f, '얼굴');
    for (const k of ai?.keep ?? []) box('aikeep', k, 'AI 보존');
    if (keep) box('keep', keep, '잘리면 안 되는 곳');
    if (focus) {
      const isManual = focus.source === 'manual';
      box(isManual ? 'focus manual' : 'focus', tl(focus), isManual ? '직접 지정' : `주인공으로 읽은 곳${focus.derived ? '(어림)' : ''}`);
      const dot = document.createElement('div'); dot.className = 'kvdot'; dot.style.cssText = `left:${focus.x * 100}%;top:${focus.y * 100}%`; ov.appendChild(dot);
    }
    const tag = document.createElement('div'); tag.className = 'kvtag';
    tag.textContent = focus ? `${typeName}${manual ? ' · 직접 지정' : ''}` : `${typeName} · 주인공을 못 찾음 — 클릭해서 찍어 주세요`;
    ov.appendChild(tag);
    if (manual && !readOnly) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'kvauto'; b.textContent = '자동으로';
      b.title = '직접 지정을 지우고 자동 판정으로';
      b.onpointerdown = e => e.stopPropagation();
      b.onclick = e => { e.stopPropagation(); onChange?.(null); };
      ov.appendChild(b);
    }
  };
  draw();
  if (readOnly) return ov;

  // 포인터: 누른 곳에서 6px 넘게 끌면 keep 상자, 아니면 점
  let st = null, rubber = null;
  const at = e => { const b = ov.getBoundingClientRect(); return { x: clamp01((e.clientX - b.left) / b.width), y: clamp01((e.clientY - b.top) / b.height), cx: e.clientX, cy: e.clientY }; };
  ov.onpointerdown = e => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    R = layout(); st = at(e); ov.setPointerCapture(e.pointerId);
  };
  ov.onpointermove = e => {
    if (!st) return;
    const p = at(e);
    if (!rubber && Math.hypot(p.cx - st.cx, p.cy - st.cy) < 6) return;
    if (!rubber) { rubber = document.createElement('div'); rubber.className = 'kvbox keep rubber'; ov.appendChild(rubber); }
    const x = Math.min(st.x, p.x), y = Math.min(st.y, p.y), w = Math.abs(p.x - st.x), h = Math.abs(p.y - st.y);
    rubber.style.cssText = `left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${h * 100}%`;
  };
  ov.onpointerup = e => {
    if (!st) return;
    e.stopPropagation();
    const p = at(e), s0 = st; st = null;
    try { ov.releasePointerCapture(e.pointerId); } catch {}
    if (rubber) {
      rubber.remove(); rubber = null;
      const x = Math.min(s0.x, p.x), y = Math.min(s0.y, p.y), w = Math.abs(p.x - s0.x), h = Math.abs(p.y - s0.y);
      if (w < 0.03 || h < 0.03) return;   // 너무 작은 상자는 실수
      onChange?.({ focus: manual?.focus ?? null, keep: { x: r3(x), y: r3(y), w: r3(w), h: r3(h) } });
    } else {
      onChange?.({ focus: { x: r3(p.x), y: r3(p.y), w: r3(auto?.w ?? 0.5), h: r3(auto?.h ?? 0.5) }, keep: manual?.keep ?? null });
    }
  };
  ov.onpointercancel = () => { st = null; rubber?.remove(); rubber = null; };
  ov.onclick = e => e.stopPropagation();   // 썸네일의 파일 열기(onclick)를 막는다 — 교체는 아래 「교체」로
  ov.onkeydown = e => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) {
      e.preventDefault(); e.stopPropagation();
      const f = focus ?? { x: 0.5, y: 0.5, w: 0.5, h: 0.5 };
      onChange?.({ focus: { x: r3(clamp01(f.x + d[0])), y: r3(clamp01(f.y + d[1])), w: r3(f.w), h: r3(f.h) }, keep: manual?.keep ?? null });
    } else if ((e.key === 'Escape' || e.key === 'Backspace') && manual) { e.preventDefault(); e.stopPropagation(); onChange?.(null); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); thumb.onclick?.(); }   // 키보드로 교체
  };
  const rep = document.createElement('button'); rep.type = 'button'; rep.className = 'kvrep'; rep.textContent = '교체'; rep.title = '다른 그림으로 바꾸기';
  rep.onpointerdown = e => e.stopPropagation();
  rep.onclick = e => { e.stopPropagation(); thumb.onclick?.(e); };
  ov.appendChild(rep);
  return ov;
}
