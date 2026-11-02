// 선택하기(11-02 컨시어지 박진화 「선택한 소재만 추출」) — 보드에서 소재 여러 장을 골라 그것만 ZIP 으로.
//   켜면: 카드 클릭 = 선택 토글(누적) · 빈 곳 드래그 = 선택 상자(피그마식, 겹치는 카드) · 매체 머리글 클릭 = 그 매체 전체 토글 · Space+드래그 = 화면 이동
//   끄면: 선택 해제, 원래 동작(드래그 = 화면 이동, 클릭 = 인스펙터). 선택은 저장하지 않는다(세션만).
//   순수 함수(pickForExport · boxHits)는 DOM 없이 쓰인다 — test/select-export.test.js

/** 내보낼 매체 소재·전달물 고르기 — exportAdZip 의 필터. only 가 있으면 그 키(a.key ?? a.specId)만.
 *  반환: all(선택 범위의 매체 소재 전부) · approved(그중 승인분) · ads(ZIP 에 들어갈 소재) · assets(전달물) */
export function pickForExport(artifacts, { only = null, includeUnapproved = false } = {}) {
  const keyOf = a => a.key ?? a.specId;
  const inScope = a => !only || only.has(keyOf(a));
  const all = artifacts.filter(a => a.channel === 'ad' && inScope(a));
  const approved = all.filter(a => a.status === 'approved');
  const ads = includeUnapproved ? all : approved;
  const assets = artifacts.filter(a => a.channel === 'asset' && inScope(a) && (includeUnapproved || a.status === 'approved'));
  return { all, approved, ads, assets };
}

/** 선택 상자와 겹치는 카드 — rects: [{ key, x, y, w, h }] · box: { x, y, w, h } (같은 좌표계) */
export function boxHits(rects, box) {
  const bx2 = box.x + box.w, by2 = box.y + box.h;
  return rects.filter(r => r.x < bx2 && r.x + r.w > box.x && r.y < by2 && r.y + r.h > box.y).map(r => r.key);
}

/** 보드 선택 모드 — app.js 가 한 번 만들어 쓴다.
 *  deps: state(zoom·panX·panY), frames(Map key → {frame}), $(id), onChange() */
export function createSelect({ state, frames, $, onChange = () => {} }) {
  const keys = new Set();
  let on = false, space = false;
  let box = null;   // 드래그 중인 선택 상자 { sx, sy, el, base:Set }

  const vp = () => $('viewport');
  const btn = () => $('selectMode');
  const clr = () => $('selectClear');

  function paint() {
    for (const [k, f] of frames) f.frame.classList.toggle('picked', on && keys.has(k));
    const b = btn(); if (b) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? (keys.size ? `${keys.size}장 선택` : '선택 중') : '선택하기'; b.title = on ? '선택 모드 끄기(Esc) — 카드 클릭·빈 곳 드래그로 고르고, 매체 머리글을 누르면 매체 전체' : '소재를 여러 장 골라 그것만 내보내기'; }
    const c = clr(); if (c) c.style.display = on && keys.size ? '' : 'none';
    vp()?.classList.toggle('selecting', on);
    onChange(selected());
  }
  const selected = () => (on ? new Set(keys) : null);

  function setOn(v) {
    on = !!v;
    if (!on) { keys.clear(); endBox(); }
    paint();
  }
  function toggleKey(k) { if (!on) return; if (keys.has(k)) keys.delete(k); else keys.add(k); paint(); }
  function toggleGroup(list) {
    if (!on) return;
    const all = list.every(k => keys.has(k));
    for (const k of list) { if (all) keys.delete(k); else keys.add(k); }
    paint();
  }
  function clear() { keys.clear(); paint(); }

  // 카드의 보드 좌표 사각형(라벨 제외, 그림 상자만)
  function rects() {
    const out = [];
    for (const [key, f] of frames) {
      const fb = f.frame.querySelector('.fbody'); if (!fb) continue;
      out.push({ key, x: f.frame.offsetLeft, y: f.frame.offsetTop, w: fb.offsetWidth, h: fb.offsetHeight });
    }
    return out;
  }
  const toBoard = (clientX, clientY) => {
    const r = vp().getBoundingClientRect();
    return [(clientX - r.left - state.panX) / state.zoom, (clientY - r.top - state.panY) / state.zoom];
  };

  /** viewport pointerdown 에서 먼저 부른다. true 면 선택 모드가 처리한 것(패닝·선택 해제 하지 말 것) */
  function pointerDown(e) {
    if (!on || space || e.button !== 0) return false;
    if (e.target.closest('.hit') || e.target.closest('.rowhead')) return true;   // 클릭은 click 핸들러가
    const v = vp();
    const el = document.createElement('div'); el.className = 'selbox'; v.appendChild(el);
    const r = v.getBoundingClientRect();
    box = { sx: e.clientX - r.left, sy: e.clientY - r.top, el, base: new Set(keys), moved: false };
    v.setPointerCapture(e.pointerId);
    return true;
  }
  function pointerMove(e) {
    if (!box) return false;
    const r = vp().getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    const x = Math.min(cx, box.sx), y = Math.min(cy, box.sy), w = Math.abs(cx - box.sx), h = Math.abs(cy - box.sy);
    if (w > 3 || h > 3) box.moved = true;
    Object.assign(box.el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    const [bx, by] = toBoard(x + r.left, y + r.top);
    const hits = boxHits(rects(), { x: bx, y: by, w: w / state.zoom, h: h / state.zoom });
    keys.clear(); for (const k of box.base) keys.add(k); for (const k of hits) keys.add(k);   // 드래그는 누적(Shift 없이도)
    paint();
    return true;
  }
  function pointerUp() {
    if (!box) return false;
    const moved = box.moved;
    endBox();
    if (!moved) { /* 빈 곳 클릭 — 선택 유지(실수로 다 풀리지 않게) */ }
    paint();
    return true;
  }
  function endBox() { box?.el?.remove(); box = null; }

  function bind() {
    btn()?.addEventListener('click', () => setOn(!on));
    clr()?.addEventListener('click', clear);
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && !/INPUT|TEXTAREA/.test(e.target.tagName) && !e.target.isContentEditable) space = true;
      if (e.key === 'Escape' && on && !box) setOn(false);
    });
    document.addEventListener('keyup', e => { if (e.code === 'Space') space = false; });
    window.addEventListener('blur', () => { space = false; });
  }

  return { get on() { return on; }, keys, selected, setOn, toggleKey, toggleGroup, clear, pointerDown, pointerMove, pointerUp, paint, bind };
}
