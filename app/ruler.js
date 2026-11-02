// 캔버스 눈금자(hub/canvas.js 룰러를 앱으로) — 보드 좌표. 고른 프레임 범위는 파랗게. 보기용, 내보내기·선택과 무관.
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

export function createRuler({ top, left, view, range }) {
  // top·left: <canvas>, view(): { panX, panY, zoom } · range(): 고른 프레임 { x, y, w, h } 또는 null
  const css = () => { const s = getComputedStyle(top); return { bg: s.getPropertyValue('--ruler-bg').trim() || '#fff', ink: s.getPropertyValue('--sub').trim() || '#666', line: s.getPropertyValue('--line').trim() || '#ddd', hit: s.getPropertyValue('--focus').trim() || '#2f6fed' }; };
  function axis(cv, horizontal, pan, zoom, sel, C) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    const len = horizontal ? W : H, step = STEPS.find(s => s * zoom >= 56) ?? 5000;
    if (sel) { const a = sel.at * zoom + pan, b = (sel.at + sel.len) * zoom + pan; g.fillStyle = C.hit; g.globalAlpha = .16; if (horizontal) g.fillRect(a, 0, b - a, H); else g.fillRect(0, a, W, b - a); g.globalAlpha = 1; }
    g.font = '9px Pretendard,system-ui,sans-serif'; g.textBaseline = 'top'; g.fillStyle = C.ink; g.strokeStyle = C.line; g.lineWidth = 1;
    const first = Math.floor(-pan / zoom / step) * step;
    for (let v = first; v * zoom + pan < len; v += step) {
      const p = Math.round(v * zoom + pan) + .5; if (p < 0) continue;
      g.beginPath(); if (horizontal) { g.moveTo(p, H - 6); g.lineTo(p, H); } else { g.moveTo(W - 6, p); g.lineTo(W, p); } g.stroke();
      if (horizontal) g.fillText(String(v), p + 3, 2);
      else { g.save(); g.translate(2, p + 3); g.rotate(Math.PI / 2); g.textBaseline = 'bottom'; g.fillText(String(v), 0, 0); g.restore(); }
    }
    g.beginPath(); if (horizontal) { g.moveTo(0, H - .5); g.lineTo(W, H - .5); } else { g.moveTo(W - .5, 0); g.lineTo(W - .5, H); } g.stroke();
  }
  function draw() {
    const v = view(), C = css(), r = range();
    axis(top, true, v.panX - top.offsetLeft, v.zoom, r ? { at: r.x, len: r.w } : null, C);
    axis(left, false, v.panY - left.offsetTop, v.zoom, r ? { at: r.y, len: r.h } : null, C);
  }
  try { new ResizeObserver(draw).observe(top.parentElement); } catch {}
  return { draw };
}
