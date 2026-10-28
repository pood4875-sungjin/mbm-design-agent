// 브라우저 측정 — 렌더된 소재에서 검사기(core/lint.js)가 비교할 값을 잰다.
//
// 재는 것: 제출 파일 픽셀·바이트·포맷, 알파(투명) 여부, 실제 글꼴, 글자 슬롯마다
// 문구·줄 수·글자 크기·색·상자(캔버스 좌표)·잘림 여부, 로고 상자.
// 재지 못하면 null — 검사기는 null을 위반으로 보지 않는다.
//
// 두 번 그린다: DOM에 한 번(글자 실측), 캔버스에 한 번(제출 파일 실측). 둘은 같은 HTML이다.

import { rasterizeCanvas } from './raster.js';
import { CANON } from '../core/canon.js';

const toHex = rgb => {
  const m = String(rgb).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  return '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
};

export async function measureDom(html, spec) {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${spec.w}px;height:${spec.h}px;overflow:hidden;pointer-events:none`;
  host.innerHTML = html;
  document.body.appendChild(host);
  try { await document.fonts?.ready; } catch {}
  const root = host.querySelector('[data-ad]') ?? host.firstElementChild;
  const rr = root.getBoundingClientRect();
  const texts = [...root.querySelectorAll('[data-field]')].map(el => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const fontPx = parseFloat(cs.fontSize);
    const lh = parseFloat(cs.lineHeight) || fontPx * 1.2;
    // 칩(CTA)처럼 패딩이 있는 요소는 패딩을 뺀 높이로 줄 수를 센다
    const padV = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    return {
      role: el.dataset.field,
      text: el.textContent,
      lines: Math.max(1, Math.round((r.height - padV) / lh)),
      fontPx,
      color: toHex(cs.color),
      bbox: { x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height },
      // line-clamp로 잘린 글자가 있으면 scrollHeight가 보이는 높이보다 크다
      truncated: el.scrollHeight > el.clientHeight + 2,   // 한글 글리프가 줄상자를 1~2px 넘는 건 잘림이 아니다
    };
  });
  const logoEl = root.querySelector('[data-logo]');
  const logo = logoEl ? (() => { const r = logoEl.getBoundingClientRect(); return { bbox: { x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height } }; })() : null;
  const fontFamily = getComputedStyle(root).fontFamily.split(',')[0].replace(/["']/g, '').trim();
  const objects = [...root.querySelectorAll('[data-object]')].map(o => { const r = o.getBoundingClientRect(); return { x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height }; });
  const logoCount = [...root.querySelectorAll('[data-logo]')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; }).length;
  host.remove();
  return { texts, logo, fontFamily, objects, logoCount };
}

// 캔버스 가장자리·모서리 몇 점의 알파를 본다 — 투명 규격인지 아닌지 가르는 데는 충분하다.
function hasAlpha(canvas) {
  const ctx = canvas.getContext('2d');
  const pts = [[0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1],
    [Math.floor(canvas.width / 2), 0], [Math.floor(canvas.width / 2), canvas.height - 1], [0, Math.floor(canvas.height / 2)]];
  for (const [x, y] of pts) if (ctx.getImageData(x, y, 1, 1).data[3] < 255) return true;
  return false;
}

export async function measureArtifact(html, spec, opts = {}) {
  const dom = await measureDom(html, spec);
  const format = opts.format ?? (spec.format?.[0] ?? 'png');
  const submitW = spec.submitW ?? spec.w * (spec.exportScale ?? 1);
  const scale = submitW / spec.w;
  const { canvas, blob } = await rasterizeCanvas(html, spec.w, spec.h, scale, format === 'jpeg' ? 'jpg' : format, opts.quality ?? 0.92, opts.quantize ?? null);   // quantize: PNG 재양자화(용량 맞춤, 10-28)
  // 바탕 샘플색: 캔버스 9점(3×3 격자, 가장자리 6%) 중 글자·로고·그림 상자에 안 걸리는 점의 색. 알파 < 255 면 뺀다(투명 PNG)
  const bgColors = (() => {
    try {
      const ctx2 = canvas.getContext('2d'); const W = canvas.width, H = canvas.height;
      const boxes = [...dom.texts.map(t => t.bbox), dom.logo?.bbox, ...(dom.objects ?? [])].filter(Boolean).map(b => ({ x: b.x * scale, y: b.y * scale, w: b.w * scale, h: b.h * scale }));
      const pad = CANON.bgBanned.boxPad * scale;
      const inBox = (x, y) => boxes.some(b => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad);
      const out = [];
      for (const fx of CANON.bgBanned.grid) for (const fy of CANON.bgBanned.grid) {
        const x = Math.round(W * fx), y = Math.round(H * fy); if (inBox(x, y)) continue;
        const d = ctx2.getImageData(x, y, 1, 1).data; if (d[3] < 255) continue;
        out.push('#' + [d[0], d[1], d[2]].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase());
      }
      return out.length ? [...new Set(out)] : null;
    } catch { return null; }
  })();
  return {
    w: canvas.width, h: canvas.height,
    bytes: blob.size, format,
    transparent: format === 'png' ? hasAlpha(canvas) : false,
    fontFamily: dom.fontFamily,
    texts: dom.texts,
    logo: dom.logo,
    logoCount: dom.logoCount,
    bgColors,
    blob,
  };
}
