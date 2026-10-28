// 작업 화면 공용 — 말로 적은 글 읽기 · 배치 프리셋 · 색 테마 · 대비 보정 · 글 상자 높이 · 작은 도우미
import { exById, kvImg, pageOf, node, solid, clamp, paletteFromImage, applyPalette, setTextColorAll, buildFrame, SPECS, imageFill, LOGO_IMG, layoutBoard, walk } from './doc.js';
import { wrapText, renderFrame, framePng, download, safe } from './export.js';
import { fileToDataUrl } from './panel.js';
import { extractRecruit } from '../core/brief.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`; };
export const mix = (h, t, p) => { const v = parseInt(h.slice(1), 16), tv = parseInt(t.slice(1), 16); const ch = s => Math.round(((v >> s) & 255) * (1 - p) + ((tv >> s) & 255) * p); return '#' + [ch(16), ch(8), ch(0)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase(); };
export const palOf = doc => doc.palette ?? exById(doc.ex).palette;
export const MEDIA = [...new Set(SPECS.map(s => s.media))];
export const countOf = m => SPECS.filter(s => s.media === m).length;
export function pickImage(cb, max = 2000) { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = async () => { const f = inp.files[0]; if (!f) return; cb(await fileToDataUrl(f, max), f); }; inp.click(); }

// 아이콘(선 두께 2, 18px)
const S = (p, c = '') => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${c}">${p}</svg>`;
export const I = {
  plus: S('<path d="M12 5v14M5 12h14"/>'), x: S('<path d="M6 6l12 12M18 6L6 18"/>'), back: S('<path d="M15 6l-6 6 6 6"/>'), fwd: S('<path d="M9 6l6 6-6 6"/>'),
  dl: S('<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>'), undo: S('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'), redo: S('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  trash: S('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'), check: S('<path d="M5 12l5 5L20 7"/>'), img: S('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/>'),
  copy: S('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'), front: S('<path d="M12 4l6 6M12 4L6 10M12 4v16"/>'), backw: S('<path d="M12 20l6-6M12 20l-6-6M12 20V4"/>'),
  center: S('<path d="M12 3v18M5 8h14M7 16h10"/>'), edit: S('<path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4"/>'), pen: S('<path d="M12 20h9M16.5 3.5a2 2 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  al: S('<path d="M4 6h16M4 12h10M4 18h14"/>'), ac: S('<path d="M4 6h16M7 12h10M5 18h14"/>'), ar: S('<path d="M4 6h16M10 12h10M6 18h14"/>'), spark: S('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
  grid: S('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  clip: S('<path d="M21 12l-8.5 8.5a5 5 0 0 1-7-7L14 5a3 3 0 0 1 4.5 4.5L10 18a1.5 1.5 0 0 1-2-2l7.5-7.5"/>'), home: S('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  big: S('<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>'), ad: S('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15l3-4 2 3 2-2 3 3"/>'), elev: S('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M8 9l-2 2 2 2M16 9l2 2-2 2"/>'),
  bell: S('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>'), more: S('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'), eye: S('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
};

// ── 말로 적은 글 → 칸(규칙 파서. 읽은 값은 틀릴 수 있어 점선으로 보인다) ──
//   10-28: 앱과 같은 파서(core/brief.js extractRecruit)를 쓴다 — 담당자 사례 4건(피에스케이·한미글로벌·인천국제공항보안·현대오일터미널)이 두 입구에서 같게 읽힌다. 칸 이름만 허브식(hire·start·end·place·type)으로 옮긴다
export function readPrompt(v) {
  const r = extractRecruit(v ?? '');
  const out = {};
  if (r.client) out.client = r.client;
  if (r.hiringType) out.hire = /채용|공채|모집/.test(r.hiringType) ? r.hiringType : `${r.hiringType} 채용`;   // 허브 메인 글자 = 고객사 줄 + 채용 구분 줄(doc.js) — 「채용」 낱말까지
  if (r.startDate) out.start = r.startDate;
  if (r.deadline) out.end = r.deadline;
  if (r.role) out.role = r.role;
  if (r.location) out.place = r.location;
  if (r.season) out.season = r.season;
  if (r.employType) out.type = r.employType;
  return out;
}

// ── 글 상자 높이: 줄 수에 맞춰(넘침 방지, 내보내기와 같은 canvas 측정) ──
const mctx = document.createElement('canvas').getContext('2d');
export function fitTextHeight(n) { const t = n.text; mctx.font = `${t.weight} ${t.size}px ${t.family}, Pretendard, sans-serif`; mctx.letterSpacing = `${(t.letterSpacing ?? 0) * t.size}px`; const lines = wrapText(mctx, t.content, t.auto === 'width' ? 1e9 : n.w); n.h = Math.max(Math.round(t.size * t.lineHeight), Math.round(lines.length * t.size * t.lineHeight)); }

// ── 대비 보정: 규격마다 배경 · 글자 3:1 아래면 팔레트 글자색 · 검정 · 흰색 중 가장 잘 보이는 것 ──
const lum = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return .5; const v = parseInt(m[1], 16); const c = [v >> 16, (v >> 8) & 255, v & 255].map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
export const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
export function fixContrast(doc) {
  const pal = palOf(doc); let fixed = 0;
  for (const f of pageOf(doc).children) {
    if (f.preset === 'overlay') continue;
    const bg = f.children.find(c => c.name === '배경')?.fills?.[0]?.color ?? f.fills?.[0]?.color ?? '#FFFFFF';
    for (const t of f.children) { if (t.type !== 'text' || !t.fills[0]) continue; if (contrast(t.fills[0].color, bg) >= 3) continue; t.fills[0].color = [pal.fg, '#1E1E1E', '#FFFFFF'].sort((a, b) => contrast(b, bg) - contrast(a, bg))[0]; fixed++; }
  }
  return fixed;
}

// ── 색 테마: 그림에서 자동 · 밝게 · 진하게 · 흰 바탕 · 직접 ──
export async function applyTheme(doc, kind, custom) {
  const p = palOf(doc); let np;
  if (kind === 'auto') { np = await paletteFromImage(doc.kvSrc ?? kvImg(exById(doc.ex))); if (!np) return false; }
  else if (kind === 'light') np = { accent: p.accent, bg: mix(p.accent, '#FFFFFF', .85), fg: mix(p.accent, '#000000', .72) };
  else if (kind === 'dark') np = { accent: p.accent, bg: mix(p.accent, '#000000', .72), fg: '#FFFFFF' };
  else if (kind === 'white') np = { accent: p.accent, bg: '#FFFFFF', fg: '#1E1E1E' };
  else np = { ...p, ...custom };
  np.brand = [np.accent, np.bg, np.fg]; applyPalette(doc, np); setTextColorAll(doc, np.fg); fixContrast(doc); return true;
}

// ── 배치 프리셋: auto 생성 규칙 · left 글 왼쪽/그림 오른쪽 · top 글 위/그림 아래 · overlay 그림 전체 + 스크림 32% + 글 가운데 ──
export const PRESETS = [['auto', '자동(규칙)'], ['left', '글 왼쪽 · 그림 오른쪽'], ['top', '글 위 · 그림 아래'], ['overlay', '그림 전체 · 글 가운데']];
export function applyPreset(doc, f, preset) {
  const by = nm => f.children.find(c => c.name === nm); const kv = by('키비주얼'), logo = by('로고'), main = by('메인 문구'), date = by('날짜'), role = by('모집 직무');
  const si = f.children.findIndex(c => c.name === '스크림'); if (si >= 0 && preset !== 'overlay') f.children.splice(si, 1);
  const { w, h } = f; const m = Math.min(w, h); const pad = clamp(Math.round(m * .08), 8, 80); const pal = palOf(doc); const texts = [main, date, role].filter(Boolean);
  f.preset = preset;
  if (preset === 'auto') {
    const fresh = buildFrame({ id: f.specId ?? f.id, name: f.name, media: f.media, w, h }, { palette: pal }, doc.fields);
    for (const c of f.children) { const s = fresh.children.find(x => x.name === c.name); if (!s) continue; Object.assign(c, { x: s.x, y: s.y, w: s.w, h: s.h }); if (c.type === 'text') { c.text.size = s.text.size; c.text.align = 'left'; c.text.valign = 'top'; if (c.fills[0]) c.fills[0].color = pal.fg; } }
    return;
  }
  if (logo) { const lh = clamp(Math.round(m * .075), 10, 56); logo.w = Math.round(lh * 1043 / 304); logo.h = lh; logo.x = w - pad - logo.w; logo.y = pad; }
  const longest = Math.max((doc.fields.client ?? '').length, (doc.fields.hire ?? '').length, 4);
  const stack = (x, tw, align, yMode, color) => {
    const size = clamp(Math.min(Math.round(m * .12), Math.floor(tw / (longest * 1.02))), 11, 140);
    const specs = { '메인 문구': [size, 2], '날짜': [Math.round(size * .42), 1], '모집 직무': [Math.round(size * .34), 1] }; const gap = { '메인 문구': Math.round(size * .25), '날짜': Math.round(size * .12), '모집 직무': 0 };
    for (const t of texts) { const [sz, ln] = specs[t.name]; t.text.size = sz; t.w = tw; t.h = Math.round(sz * 1.25 * ln); t.x = x; t.text.align = align; t.text.valign = 'top'; if (color && t.fills[0]) t.fills[0].color = color; }
    const total = texts.reduce((a, t) => a + t.h + gap[t.name], 0);
    let y = yMode === 'center' ? Math.round((h - total) / 2) : yMode === 'top' ? pad + (logo ? logo.h + Math.round(size * .3) : 0) : yMode;
    for (const t of texts) { t.y = y; y += t.h + gap[t.name]; }
  };
  if (preset === 'left') { if (kv) Object.assign(kv, { x: Math.round(w * .5), y: 0, w: Math.round(w * .5), h }); if (logo) logo.x = pad; stack(pad, Math.round(w * .5) - pad * 2, 'left', 'center', pal.fg); }
  else if (preset === 'top') { if (kv) Object.assign(kv, { x: 0, y: Math.round(h * .5), w, h: Math.round(h * .5) }); stack(pad, w - pad * 2, 'left', 'top', pal.fg); }
  else if (preset === 'overlay') {
    if (kv) Object.assign(kv, { x: 0, y: 0, w, h });
    let sc = by('스크림'); if (!sc) { sc = node('rect', { name: '스크림', x: 0, y: 0, w, h, fills: [solid('#000000', .32)], locked: true, constraints: { h: 'stretch', v: 'stretch' } }); const ki = f.children.indexOf(kv); f.children.splice(ki >= 0 ? ki + 1 : 1, 0, sc); } else Object.assign(sc, { x: 0, y: 0, w, h });
    stack(pad, w - pad * 2, 'center', 'center', '#FFFFFF');
  }
}
export function cornerOf(f, n) { const l = n.x + n.w / 2 < f.w / 2, t = n.y + n.h / 2 < f.h / 2; return (t ? 'n' : 's') + (l ? 'w' : 'e'); }
export function placeCorner(f, n, k) { const pad = clamp(Math.round(Math.min(f.w, f.h) * .08), 8, 80); n.x = k.endsWith('w') ? pad : f.w - pad - n.w; n.y = k.startsWith('n') ? pad : f.h - pad - n.h; n.constraints = { h: k.endsWith('w') ? 'left' : 'right', v: k.startsWith('n') ? 'top' : 'bottom' }; }

// ── 매체 맞추기: 고른 매체의 규격은 있게, 빠진 매체의 규격은 지우게(새 규격은 지금 팔레트 · 그림 · 글꼴로) ──
export function syncMedia(doc, mediaSet) {
  const page = pageOf(doc); const ex = exById(doc.ex); const pal = palOf(doc); let added = 0, removed = 0;
  const keep = page.children.filter(f => !f.media || mediaSet.has(f.media) || !MEDIA.includes(f.media)); removed = page.children.length - keep.length; page.children = keep;
  for (const s of SPECS) { if (!mediaSet.has(s.media) || page.children.some(f => f.specId === s.id)) continue; const f = buildFrame(s, { ...ex, palette: pal }, doc.fields); walk([f], n => { if (n.type === 'text') n.text.family = doc.font ?? 'Pretendard'; if (n.type === 'image') for (const fl of n.fills) { if (n.name === '키비주얼' && doc.kvSrc) fl.src = doc.kvSrc; if (n.name === '로고' && doc.logoSrc) fl.src = doc.logoSrc; } }); page.children.push(f); added++; }
  page.children.sort((a, b) => MEDIA.indexOf(a.media) - MEDIA.indexOf(b.media)); layoutBoard(page.children); fixContrast(doc);
  return { added, removed };
}

// ── 엘리베이터 장면(2692×708): 한 줄에 한 장면 「제목 | 본문」 ──
export const ELEV = { w: 2692, h: 708, media: '엘리베이터' };
export function buildScene(line, i, doc) {
  const [title, ...rest] = line.split('|').map(s => s.trim()); const body = rest.join(' | '); const pal = palOf(doc); const { w, h } = ELEV; const pad = 72;
  const f = node('frame', { name: `장면 ${i + 1}`, media: ELEV.media, sceneId: 's' + i, w, h, fills: [solid(pal.bg)] });
  const kv = node('image', { name: '키비주얼', x: Math.round(w * .62), y: 0, w: Math.round(w * .38), h, fills: [imageFill(doc.kvSrc ?? kvImg(exById(doc.ex)), 'cover')], constraints: { h: 'right', v: 'scale' } });
  const logo = node('image', { name: '로고', x: pad, y: pad, w: Math.round(56 * 1043 / 304), h: 56, fills: [imageFill(doc.logoSrc ?? LOGO_IMG, 'contain')] });
  const tw = Math.round(w * .62) - pad * 2; const size = clamp(Math.min(120, Math.floor(tw / (Math.max(title.length, 6) * 1.02))), 24, 120);
  const mk = (name, content, sz, weight, y, lines) => node('text', { name, x: pad, y, w: tw, h: Math.round(sz * 1.25 * lines), text: { content, size: sz, weight, lineHeight: 1.25, letterSpacing: -0.01, align: 'left', valign: 'top', family: doc.font ?? 'Pretendard', auto: 'height' }, fills: [solid(pal.fg)] });
  const main = mk('메인 문구', title || `장면 ${i + 1}`, size, 700, 0, 1); const sub = mk('본문', body, Math.round(size * .42), 500, 0, 2);
  const total = main.h + (body ? Math.round(size * .3) + sub.h : 0); main.y = Math.round((h - total) / 2); sub.y = main.y + main.h + Math.round(size * .3);
  f.children = [node('rect', { name: '배경', x: 0, y: 0, w, h, fills: [solid(pal.bg)], locked: true, constraints: { h: 'stretch', v: 'stretch' } }), kv, logo, main, ...(body ? [sub] : [])];
  return f;
}

// ── 크게 보기(한 장) ──
export function previewFrame(f) {
  const pv = document.createElement('div'); pv.className = 'preview'; pv.innerHTML = `<div class="bar"><b>${esc(f.name)}</b><span style="opacity:.7">${f.w}×${f.h}</span><span class="grow"></span><button class="ib" data-dl title="PNG 내려받기">${I.dl}</button><button class="ib" data-x aria-label="닫기">${I.x}</button></div><div class="st"></div>`;
  document.body.appendChild(pv); renderFrame(f, 1).then(c => pv.querySelector('.st').appendChild(c));
  pv.querySelector('[data-x]').onclick = () => pv.remove(); pv.querySelector('[data-dl]').onclick = async () => download(await framePng(f, 1), `${safe(f.name)}_${f.w}x${f.h}.png`);
  const k = e => { if (e.key === 'Escape') { pv.remove(); document.removeEventListener('keydown', k); } }; document.addEventListener('keydown', k);
}
