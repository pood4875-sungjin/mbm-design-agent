// 내보내기 — 노드 트리를 canvas2d 로 그린다(DOM 렌더와 같은 규칙). PNG · 썸네일 · ZIP(JSZip CDN)
import { walk } from './doc.js';

const imgCache = new Map();
export function loadImage(src) {
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  imgCache.set(src, p); return p;
}
export async function preload(nodes) { const srcs = new Set(); walk(nodes, n => { for (const f of n.fills ?? []) if (f.type === 'image') srcs.add(f.src); }); await Promise.all([...srcs].map(loadImage)); }
const hexA = (hex, a = 1) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex; const v = parseInt(m[1], 16); return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`; };
function rrect(ctx, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath(); }
function fitRect(iw, ih, w, h, fit) {
  if (fit === 'fill') return [0, 0, w, h];
  const s = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih); const dw = iw * s, dh = ih * s; return [(w - dw) / 2, (h - dh) / 2, dw, dh];
}
export function wrapText(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/(\s+)/); let line = '';
    for (const wd of words) {
      if (ctx.measureText(line + wd).width <= maxW || !line) { line += wd; if (ctx.measureText(line).width > maxW && line.trim().length > 1) { // 한 어절이 너무 길면 글자 단위
          let chunk = ''; for (const ch of line) { if (ctx.measureText(chunk + ch).width > maxW && chunk) { out.push(chunk); chunk = ''; } chunk += ch; } line = chunk; } }
      else { out.push(line.trimEnd()); line = wd.trimStart(); }
    }
    out.push(line.trimEnd());
  }
  return out;
}
export function drawNode(ctx, n, images) {
  if (n.visible === false) return;
  ctx.save();
  ctx.translate(n.x, n.y);
  if (n.rotation) { ctx.translate(n.w / 2, n.h / 2); ctx.rotate(n.rotation * Math.PI / 180); ctx.translate(-n.w / 2, -n.h / 2); }
  ctx.globalAlpha *= n.opacity ?? 1;
  if (n.blend && n.blend !== 'normal') ctx.globalCompositeOperation = n.blend;
  const r = n.radius ?? 0;
  // 효과(바깥 그림자 · 흐림)
  const drop = (n.effects ?? []).find(e => e.visible !== false && e.type === 'drop');
  const blur = (n.effects ?? []).find(e => e.visible !== false && e.type === 'blur');
  if (blur) ctx.filter = `blur(${blur.blur}px)`;
  const fills = (n.fills ?? []).filter(f => f.visible !== false);
  if (n.type !== 'text') {
    if (drop && (fills.length || n.type === 'frame')) { ctx.save(); ctx.shadowColor = hexA(drop.color, drop.opacity); ctx.shadowOffsetX = drop.x; ctx.shadowOffsetY = drop.y; ctx.shadowBlur = drop.blur; rrect(ctx, n.w, n.h, r); ctx.fillStyle = fills[0]?.type === 'solid' ? hexA(fills[0].color, fills[0].opacity) : 'rgba(0,0,0,.01)'; ctx.fill(); ctx.restore(); }
    for (const f of fills) {
      rrect(ctx, n.w, n.h, r);
      if (f.type === 'solid') { ctx.fillStyle = hexA(f.color, f.opacity ?? 1); ctx.fill(); }
      else if (f.type === 'image') { const im = images.get(f.src); if (im) { ctx.save(); ctx.clip(); const [dx, dy, dw, dh] = fitRect(im.naturalWidth, im.naturalHeight, n.w, n.h, f.fit); ctx.drawImage(im, dx, dy, dw, dh); ctx.restore(); } }
    }
    // 안쪽 그림자
    for (const e of (n.effects ?? []).filter(e => e.visible !== false && e.type === 'inner')) {
      ctx.save(); rrect(ctx, n.w, n.h, r); ctx.clip(); ctx.shadowColor = hexA(e.color, e.opacity); ctx.shadowOffsetX = e.x; ctx.shadowOffsetY = e.y; ctx.shadowBlur = e.blur; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.rect(-n.w, -n.h, n.w * 3, n.h * 3); rrect(ctx, n.w, n.h, r); ctx.fill('evenodd'); ctx.restore();
    }
  }
  if (n.children) {
    ctx.save(); if (n.clip !== false && n.type === 'frame') { rrect(ctx, n.w, n.h, r); ctx.clip(); }
    for (const k of n.children) drawNode(ctx, k, images);
    ctx.restore();
  }
  if (n.type === 'text') {
    const t = n.text; const col = fills[0]?.type === 'solid' ? hexA(fills[0].color, fills[0].opacity ?? 1) : '#000';
    ctx.font = `${t.weight} ${t.size}px ${t.family}, Pretendard, sans-serif`; ctx.fillStyle = col; ctx.textBaseline = 'alphabetic'; ctx.textAlign = t.align;
    if (drop) { ctx.shadowColor = hexA(drop.color, drop.opacity); ctx.shadowOffsetX = drop.x; ctx.shadowOffsetY = drop.y; ctx.shadowBlur = drop.blur; }
    ctx.letterSpacing = `${(t.letterSpacing ?? 0) * t.size}px`;
    const lh = t.size * t.lineHeight; const lines = wrapText(ctx, t.content, t.auto === 'width' ? 1e9 : n.w);
    const total = lines.length * lh; let y0 = t.valign === 'middle' ? (n.h - total) / 2 : t.valign === 'bottom' ? n.h - total : 0;
    const x0 = t.align === 'center' ? n.w / 2 : t.align === 'right' ? n.w : 0;
    lines.forEach((ln, i) => ctx.fillText(ln, x0, y0 + lh * i + lh / 2 + t.size * .35));
  }
  // 선
  for (const st of (n.strokes ?? []).filter(s => s.visible !== false)) {
    if (n.type === 'text') continue;
    ctx.save(); ctx.strokeStyle = hexA(st.color, st.opacity ?? 1); const wdt = st.width;
    if (st.align === 'inside') { rrect(ctx, n.w, n.h, r); ctx.clip(); ctx.lineWidth = wdt * 2; }
    else if (st.align === 'outside') { ctx.lineWidth = wdt * 2; ctx.beginPath(); ctx.rect(-wdt * 2, -wdt * 2, n.w + wdt * 4, n.h + wdt * 4); rrect(ctx, n.w, n.h, r); ctx.clip('evenodd'); }
    else ctx.lineWidth = wdt;
    rrect(ctx, n.w, n.h, r); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
export async function renderFrame(frame, scale = 1, bg = null) {
  const srcs = new Set(); walk([frame], n => { for (const f of n.fills ?? []) if (f.type === 'image') srcs.add(f.src); });
  const images = new Map(); await Promise.all([...srcs].map(async s => images.set(s, await loadImage(s))));
  try { await document.fonts.load(`700 ${20}px Pretendard`); } catch { /* 글꼴 없이 진행 */ }
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(frame.w * scale)); c.height = Math.max(1, Math.round(frame.h * scale));
  const ctx = c.getContext('2d'); if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.scale(scale, scale); drawNode(ctx, { ...frame, x: 0, y: 0, rotation: 0 }, images); return c;
}
export async function thumbnail(frame, px = 36) { const s = px / Math.max(frame.w, frame.h); const c = await renderFrame(frame, s); return c.toDataURL('image/png'); }
export async function framePng(frame, scale = 1) { const c = await renderFrame(frame, scale); return new Promise(res => c.toBlob(res, 'image/png')); }
export function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
let zipLib;
async function jszip() { if (zipLib) return zipLib; await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); zipLib = window.JSZip; return zipLib; }
export const safe = s => String(s).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
export async function exportZip(frames, { scale = 1, name = '광고소재', onProgress } = {}) {
  const JSZip = await jszip(); const zip = new JSZip(); let i = 0;
  for (const f of frames) { const blob = await framePng(f, scale); zip.folder(safe(f.media ?? '기타')).file(`${safe(f.name)}_${f.w}x${f.h}${scale !== 1 ? '@' + scale + 'x' : ''}.png`, blob); onProgress?.(++i, frames.length); }
  const out = await zip.generateAsync({ type: 'blob' }); download(out, `${safe(name)}.zip`);
}
