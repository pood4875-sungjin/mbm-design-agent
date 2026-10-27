// 문서 모델 — 페이지 › 프레임(규격) › 레이어(사각형 · 이미지 · 글자 · 그룹). 피그마 문법 그대로.
//   새 문서는 예시(EXAMPLES)의 키비주얼 · 로고 · 브리프로 규격 51종을 규칙 레이아웃으로 채운다(실제 편집 가능한 레이어).
//   저장은 localStorage(studio.doc.<id>), 되돌리기는 페이지 JSON 스냅샷.
import { STAGES } from './mock-data.js';

export const IMG = '../history/img/';
export const LOGO_IMG = 'assets/midas-logo.png';
export const SPECS = STAGES.flatMap(s => s.specs.map(x => ({ ...x, stage: s.stage })));
export const FIELDS = [['client', '고객사'], ['hire', '채용 구분'], ['role', '모집 직무', 'area'], ['start', '접수 시작', 'half'], ['end', '지원 마감', 'half'], ['season', '시즌'], ['slogan', '슬로건'], ['notice', '필수 고지 문구', 'area'], ['type', '고용 형태', 'half'], ['place', '근무지', 'half']];
const GS = { client: 'GS에너지', hire: '신입 공채', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', start: '2025-06-20', end: '2025-07-02', season: '2025년', slogan: '', notice: '', type: '정규직', place: '서울 강남' };
const MIDAS = { client: '마이다스아이티', hire: '신입 공채', role: '경영 · 개발 · 디자인', start: '2025-09-01', end: '2025-09-21', season: '2025 하반기', slogan: '', notice: '', type: '정규직', place: '판교' };
export const EXAMPLES = [
  { id: 'gs-illust', title: 'GS에너지 신입 공채', by: '일러스트 키비주얼', dir: '2026-10-22_ai-samples-bg', case: 't1014-gs2025', kv: 't1014-gs2025_kv.png', fields: GS, palette: { bg: '#D9F0FA', fg: '#0B2A4A', accent: '#0B5FA5', brand: ['#0B5FA5', '#79C3EA', '#D9F0FA'] }, prompt: 'GS에너지 2025 상반기 신입 공채. 일반(사업·재무)과 보훈 전형, 6월 20일부터 7월 2일 17시까지 접수. 일러스트 키비주얼로 밝게.' },
  { id: 'gs-photo', title: 'GS에너지 신입 공채', by: '신호등 사진 키비주얼', dir: '2026-10-22_ai-samples-bg', case: 'pin-15', kv: 'pin-15_kv.jpg', fields: GS, palette: { bg: '#1E3A8A', fg: '#FFFFFF', accent: '#7CC4FF', brand: ['#1E3A8A', '#7CC4FF', '#FFFFFF'] }, prompt: 'GS에너지 2025 상반기 신입 공채. 사진 키비주얼(신호등)을 살리고 글자는 사진을 피해서.' },
  { id: 'midas-team', title: '마이다스아이티 신입 공채', by: '팀 사진 키비주얼', dir: '2026-10-22_ai-samples-midas', case: 'midas-team-photo', kv: 'midas-team-photo_kv.jpg', fields: MIDAS, palette: { bg: '#17202A', fg: '#FFFFFF', accent: '#4DA3FF', brand: ['#17202A', '#4DA3FF', '#FFFFFF'] }, prompt: '마이다스아이티 2025 하반기 신입 공채. 경영·개발·디자인 직군, 9월 1일부터 21일까지. 팀 사진을 키비주얼로.' },
  { id: 'midas-3d', title: '마이다스아이티 신입 공채', by: '3D 캐릭터 키비주얼', dir: '2026-10-22_ai-samples-midas', case: 'midas-faces-3d', kv: 'midas-faces-3d_kv.jpg', fields: MIDAS, palette: { bg: '#4DA3FF', fg: '#FFFFFF', accent: '#0B3D91', brand: ['#4DA3FF', '#0B3D91', '#FFFFFF'] }, prompt: '마이다스아이티 2025 하반기 신입 공채. 3D 캐릭터 얼굴 키비주얼, 얼굴은 가리지 말 것.' },
  { id: 'midas-iso', title: '마이다스아이티 신입 공채', by: '아이소메트릭 키비주얼', dir: '2026-10-22_ai-samples-midas', case: 'midas-jeil-iso', kv: 'midas-jeil-iso_kv.png', fields: MIDAS, palette: { bg: '#2F6FE6', fg: '#FFFFFF', accent: '#FFD166', brand: ['#2F6FE6', '#FFD166', '#FFFFFF'] }, prompt: '마이다스아이티 2025 하반기 신입 공채. 아이소메트릭 일러스트 키비주얼.' },
];
export const exById = id => EXAMPLES.find(e => e.id === id) ?? EXAMPLES[0];
export const kvImg = ex => `${IMG}${ex.dir}/${ex.kv}`;
export const thumbImg = ex => `${IMG}${ex.dir}/${ex.case}_kakao-display-pc-promo_C.png`;
export const refImg = (ex, specId) => `${IMG}${ex.dir}/${ex.case}_${specId}_C.png`;
export const shortName = s => (s.name ?? s.id).replace(/^.*? - /, '');
export const uid = () => Math.random().toString(36).slice(2, 9);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtDate = d => { const m = /(\d{4})-(\d{2})-(\d{2})/.exec(d); if (!m) return d; const dt = new Date(+m[1], +m[2] - 1, +m[3]); return `${+m[2]}.${+m[3]}(${'일월화수목금토'[dt.getDay()]})`; };

// ── 노드 기본값 ──
export const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
export const BLEND_KO = { normal: '통과', multiply: '곱하기', screen: '스크린', overlay: '오버레이', darken: '어둡게', lighten: '밝게', 'color-dodge': '컬러 닷지', 'color-burn': '컬러 번', 'hard-light': '하드 라이트', 'soft-light': '소프트 라이트', difference: '차이', exclusion: '제외', hue: '색조', saturation: '채도', color: '색상', luminosity: '광도' };
export function node(type, p = {}) {
  const base = { id: uid(), type, name: p.name ?? ({ rect: '사각형', image: '이미지', text: '텍스트', group: '그룹', frame: '프레임' }[type]), x: 0, y: 0, w: 100, h: 100, rotation: 0, opacity: 1, visible: true, locked: false, radius: 0, blend: 'normal',
    fills: [], strokes: [], effects: [], constraints: { h: 'left', v: 'top' }, layout: null };
  if (type === 'text') base.text = { content: '텍스트', size: 16, weight: 500, lineHeight: 1.25, letterSpacing: 0, align: 'left', valign: 'top', family: 'Pretendard', auto: 'height' };
  if (type === 'frame' || type === 'group') base.children = [];
  if (type === 'frame') base.clip = true;
  return Object.assign(base, p);
}
export const solid = (color, opacity = 1) => ({ id: uid(), type: 'solid', color, opacity, visible: true });
export const imageFill = (src, fit = 'cover') => ({ id: uid(), type: 'image', src, fit, visible: true });
export const stroke = (color = '#000000', width = 1, align = 'inside') => ({ id: uid(), color, opacity: 1, width, align, visible: true });
export const effect = (type = 'drop') => ({ id: uid(), type, x: 0, y: 4, blur: 4, spread: 0, color: '#000000', opacity: .25, visible: true });

// ── 규격 하나를 레이어로(규칙 레이아웃: 배경 · 키비주얼 · 로고 · 글자 3줄) ──
export function buildFrame(spec, ex, fields) {
  const { w, h } = spec; const m = Math.min(w, h), ar = w / h; const pal = ex.palette;
  const pad = clamp(Math.round(m * .08), 8, 80);
  const f = node('frame', { name: shortName(spec), media: spec.media, specId: spec.id, w, h, fills: [solid(pal.bg)], x: 0, y: 0 });
  // 키비주얼
  let kv;
  if (ar >= 1.8) kv = { x: Math.round(w * .55), y: 0, w: Math.round(w * .45), h };
  else if (ar <= .62) kv = { x: 0, y: Math.round(h * .5), w, h: Math.round(h * .5) };
  else kv = { x: Math.round(w * .48), y: Math.round(h * .38), w: Math.round(w * .52), h: Math.round(h * .62) };
  const kvN = node('image', { name: '키비주얼', ...kv, fills: [imageFill(kvImg(ex), 'cover')], constraints: { h: ar >= 1.8 ? 'right' : 'scale', v: ar <= .62 ? 'bottom' : 'scale' } });
  // 로고(1043×304)
  const lh = clamp(Math.round(m * .075), 10, 56), lw = Math.round(lh * 1043 / 304);
  const logo = node('image', { name: '로고', x: w - pad - lw, y: pad, w: lw, h: lh, fills: [imageFill(LOGO_IMG, 'contain')], constraints: { h: 'right', v: 'top' } });
  // 글자
  const tw = ar >= 1.8 ? Math.round(w * .55) - pad * 2 : ar <= .62 ? w - pad * 2 : Math.round(w * .5) - pad;
  const longest = Math.max(fields.client.length, fields.hire.length, 4);   // 한글 한 글자 ≈ 1em — 글상자에 한 줄이 들어가게
  const size = clamp(Math.min(Math.round(m * .12), Math.floor(tw / (longest * 1.02))), 11, 140);
  const mk = (name, content, sz, weight, y, lines) => node('text', { name, x: pad, y, w: tw, h: Math.round(sz * 1.25 * lines), text: { content, size: sz, weight, lineHeight: 1.25, letterSpacing: -0.01, align: 'left', valign: 'top', family: 'Pretendard', auto: 'height' }, fills: [solid(pal.fg)] });
  let y = pad + (ar <= .62 || ar < 1.8 ? lh + Math.round(size * .3) : 0);
  if (ar >= 1.8) y = Math.round((h - size * 1.25 * 2 - size * .42 * 1.25 - size * .25) / 2);
  const main = mk('메인 문구', `${fields.client}\n${fields.hire}`, size, 700, y, 2); y += main.h + Math.round(size * .25);
  const date = mk('날짜', `${fmtDate(fields.start)} - ${fmtDate(fields.end)} 17시`, Math.round(size * .42), 600, y, 1); y += date.h + Math.round(size * .12);
  const role = mk('모집 직무', `모집직무 : ${fields.role}`, Math.round(size * .34), 400, y, 1);
  f.children = [node('rect', { name: '배경', x: 0, y: 0, w, h, fills: [solid(pal.bg)], locked: true, constraints: { h: 'stretch', v: 'stretch' } }), kvN, logo, main, date, role];
  if (role.y + role.h > h - pad * .5 || tw < 60) f.children.pop();
  f.children = f.children.filter(n => n.type !== 'text' || n.text.size >= 10 || n.name === '메인 문구');   // 10px 미만 글자는 안 깐다(가이드 검수 기준)
  return f;
}

// 보드 배치: 매체별로 한 줄씩 흘려 놓는다(프레임 사이 100 · 매체 사이 240)
export function layoutBoard(frames) {
  const groups = new Map(); for (const f of frames) { if (!groups.has(f.media)) groups.set(f.media, []); groups.get(f.media).push(f); }
  let y = 0; const maxW = 6400;
  for (const [, list] of groups) {
    let x = 0, rowH = 0;
    for (const f of list) {
      if (x > 0 && x + f.w > maxW) { x = 0; y += rowH + 200; rowH = 0; }
      f.x = x; f.y = y; x += f.w + 100; rowH = Math.max(rowH, f.h);
    }
    y += rowH + 360;
  }
}

// ── 문서 ──
export function newDoc({ name, exId, fields, prompt, specIds } = {}) {
  const ex = exById(exId); const fl = { ...ex.fields, ...(fields ?? {}) };
  const specs = specIds ? SPECS.filter(s => specIds.includes(s.id)) : SPECS;
  const frames = specs.map(s => buildFrame(s, ex, fl)); layoutBoard(frames);
  return { id: 'd' + uid(), name: name ?? `${fl.client} ${fl.hire}`, tool: 'ad', ex: ex.id, fields: fl, prompt: prompt ?? ex.prompt, createdAt: Date.now(), updatedAt: Date.now(),
    pages: [{ id: 'p' + uid(), name: '광고 소재', bg: '#F5F5F5', children: frames }], pageId: null,
    styles: ex.palette.brand.map((c, i) => ({ id: uid(), name: ['브랜드', '보조', '밝은 지면'][i] ?? '색', color: c })), approved: [] };
}
export const pageOf = doc => doc.pages.find(p => p.id === doc.pageId) ?? doc.pages[0];

// 트리 유틸
export function walk(nodes, fn, parent = null, depth = 0) { for (const n of nodes) { if (fn(n, parent, depth) === false) continue; if (n.children) walk(n.children, fn, n, depth + 1); } }
export function findNode(page, id) { let r = null; walk(page.children, n => { if (n.id === id) { r = n; return false; } }); return r; }
export function parentOf(page, id) { let r = null; walk(page.children, (n, p) => { if (n.id === id) { r = p; return false; } }); return r ?? page; }
export function absPos(page, n) { let x = 0, y = 0, cur = n; while (cur && cur !== page) { x += cur.x; y += cur.y; cur = parentOf(page, cur.id); if (cur === page) break; } return { x, y }; }
export function frameOf(page, n) { let cur = n, top = n; while (cur && cur !== page) { top = cur; cur = parentOf(page, cur.id); if (cur === page) break; } return top; }
export function removeNode(page, id) { let done = false; walk(page.children, (n, p) => { if (done) return false; const list = p ? p.children : page.children; const i = list.indexOf(n); if (n.id === id) { list.splice(i, 1); done = true; return false; } }); return done; }
export const clone = o => JSON.parse(JSON.stringify(o));
export function cloneNode(n) { const c = clone(n); walk([c], x => { x.id = uid(); }); return c; }

// 자동 레이아웃(흐름): 자식들을 세로/가로/줄바꿈으로 흘린다
export function relayout(n) {
  if (!n.layout || !n.children) return;
  const { flow, gap = 8, pad = 0, align = 'start' } = n.layout; const kids = n.children.filter(k => k.visible !== false);
  if (flow === 'v') { let y = pad; for (const k of kids) { k.x = align === 'center' ? Math.round((n.w - k.w) / 2) : align === 'end' ? n.w - pad - k.w : pad; k.y = y; y += k.h + gap; } }
  else if (flow === 'h') { let x = pad; for (const k of kids) { k.y = align === 'center' ? Math.round((n.h - k.h) / 2) : align === 'end' ? n.h - pad - k.h : pad; k.x = x; x += k.w + gap; } }
  else if (flow === 'wrap') { let x = pad, y = pad, rowH = 0; for (const k of kids) { if (x > pad && x + k.w > n.w - pad) { x = pad; y += rowH + gap; rowH = 0; } k.x = x; k.y = y; x += k.w + gap; rowH = Math.max(rowH, k.h); } }
}
// 부모 크기가 바뀔 때 제약으로 자식 자리 옮기기
export function applyConstraints(n, ow, oh) {
  if (!n.children) return;
  const dw = n.w - ow, dh = n.h - oh;
  for (const k of n.children) {
    const c = k.constraints ?? { h: 'left', v: 'top' };
    if (c.h === 'right') k.x += dw; else if (c.h === 'center') k.x += dw / 2; else if (c.h === 'stretch') k.w += dw; else if (c.h === 'scale') { const s = n.w / ow; k.x *= s; k.w *= s; }
    if (c.v === 'bottom') k.y += dh; else if (c.v === 'center') k.y += dh / 2; else if (c.v === 'stretch') k.h += dh; else if (c.v === 'scale') { const s = n.h / oh; k.y *= s; k.h *= s; }
  }
}
// 선택 안의 색 모으기(채움 · 선 · 효과)
export function collectColors(nodes) {
  const map = new Map();
  walk(nodes, n => { for (const f of n.fills ?? []) if (f.type === 'solid') (map.get(f.color) ?? map.set(f.color, []).get(f.color)).push(f); for (const s of n.strokes ?? []) (map.get(s.color) ?? map.set(s.color, []).get(s.color)).push(s); for (const e of n.effects ?? []) if (e.color) (map.get(e.color) ?? map.set(e.color, []).get(e.color)).push(e); });
  return map;
}

// ── 저장 ──
const K = 'studio.';
export const loadIndex = () => { try { return JSON.parse(localStorage.getItem(K + 'index')) ?? []; } catch { return []; } };
const saveIndex = idx => { try { localStorage.setItem(K + 'index', JSON.stringify(idx)); } catch { /* 공간 없음 */ } };
// 올린 그림(dataURL)은 규격 51개가 같은 src 를 들고 있으니 저장할 땐 한 번만 쓰고(@kv · @logo) 읽을 때 되돌린다
export function serialize(doc) {
  const kv = doc.kvSrc, lg = doc.logoSrc;
  return JSON.stringify(doc, (k, v) => { if (k === 'kvSrc' || k === 'logoSrc') return v; if (typeof v === 'string' && v.length > 200) { if (kv && v === kv) return '@kv'; if (lg && v === lg) return '@logo'; } return v; });
}
export function hydrate(doc) {
  if (!doc) return doc;
  for (const p of doc.pages ?? []) walk(p.children, n => { for (const f of n.fills ?? []) if (f.type === 'image') { if (f.src === '@kv') f.src = doc.kvSrc; else if (f.src === '@logo') f.src = doc.logoSrc; } });
  return doc;
}
export function saveDoc(doc, thumb) {
  doc.updatedAt = Date.now();
  try { localStorage.setItem(K + 'doc.' + doc.id, serialize(doc)); } catch (e) { console.warn('저장 실패(용량)', e); return false; }
  const idx = loadIndex().filter(x => x.id !== doc.id); idx.unshift({ id: doc.id, name: doc.name, tool: doc.tool, ex: doc.ex, updatedAt: doc.updatedAt, thumb: thumb ?? loadIndex().find(x => x.id === doc.id)?.thumb ?? null, frames: pageOf(doc).children.length });
  saveIndex(idx.slice(0, 40)); return true;
}
export function loadDoc(id) { try { const d = hydrate(JSON.parse(localStorage.getItem(K + 'doc.' + id))); if (d) d.pageId ??= d.pages[0].id; return d; } catch { return null; } }
// 로고 바꾸기: 「로고」 이미지 레이어 전부
export function replaceLogo(doc, src) { for (const p of doc.pages) walk(p.children, n => { if (n.type === 'image' && n.name === '로고') for (const f of n.fills) if (f.type === 'image') f.src = src; }); doc.logoSrc = src; }
export function deleteDoc(id) { localStorage.removeItem(K + 'doc.' + id); saveIndex(loadIndex().filter(x => x.id !== id)); }
export function renameDocIndex(doc) { const idx = loadIndex(); const it = idx.find(x => x.id === doc.id); if (it) { it.name = doc.name; saveIndex(idx); } }

// ── 키비주얼 → 색 자동(지면 · 글자 · 포인트) ──
//   그림을 32×32 로 줄여 색을 모으고, 채도 있는 색 중 가장 많은 것을 포인트로, 그 색을 연하게/진하게 해 지면을 만든다.
export async function paletteFromImage(src) {
  const im = await new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  if (!im) return null;
  const c = document.createElement('canvas'); c.width = 32; c.height = 32; const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0, 32, 32);
  let d; try { d = ctx.getImageData(0, 0, 32, 32).data; } catch { return null; }
  const buckets = new Map(); let lumSum = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]; if (a < 128) continue; const r = d[i], g = d[i + 1], b = d[i + 2]; n++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 510; lumSum += l; const s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)) / 255;
    if (s < .25 || l < .12 || l > .92) continue;
    let h = 0; if (mx === r) h = ((g - b) / (mx - mn)) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; h = Math.round(((h * 60 + 360) % 360) / 20) * 20;
    const k = h; const e = buckets.get(k) ?? { n: 0, best: 0, r: 0, g: 0, b: 0 }; e.n++; const vivid = s * (1 - Math.abs(l - .5) * 1.4); if (vivid > e.best) { e.best = vivid; e.r = r; e.g = g; e.b = b; } buckets.set(k, e);   // 묶음 안에서 가장 선명한 픽셀을 대표색으로
  }
  const avgL = n ? lumSum / n : .5;
  const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
  let accent = top ? hex(top.r, top.g, top.b) : '#0D99FF';
  const mix = (h, t, p) => { const v = parseInt(h.slice(1), 16), tv = parseInt(t.slice(1), 16); const ch = s => ((v >> s) & 255) * (1 - p) + ((tv >> s) & 255) * p; return hex(ch(16), ch(8), ch(0)); };
  const dark = avgL < .45;   // 어두운 그림이면 진한 지면 + 흰 글자, 밝으면 연한 지면 + 진한 글자
  const bg = dark ? mix(accent, '#000000', .72) : mix(accent, '#FFFFFF', .82);
  const fg = dark ? '#FFFFFF' : mix(accent, '#000000', .75);
  return { bg, fg, accent, brand: [accent, bg, fg], dark };
}
// 문서 전체에 팔레트 적용: 지면(배경 사각형 · 프레임 채움) · 글자색. 이전 팔레트 색만 바꾼다(사용자가 따로 칠한 색은 둔다)
export function applyPalette(doc, pal) {
  const old = doc.palette ?? exById(doc.ex).palette;
  const map = { [old.bg.toUpperCase()]: pal.bg, [old.fg.toUpperCase()]: pal.fg, [old.accent.toUpperCase()]: pal.accent };
  for (const p of doc.pages) walk(p.children, n => { for (const f of n.fills ?? []) if (f.type === 'solid' && map[f.color.toUpperCase()]) f.color = map[f.color.toUpperCase()]; for (const s of n.strokes ?? []) if (map[s.color.toUpperCase()]) s.color = map[s.color.toUpperCase()]; });
  doc.palette = pal;
  const names = ['브랜드', '보조', '밝은 지면'];
  doc.styles = pal.brand.map((c, i) => ({ id: uid(), name: names[i] ?? '색', color: c }));
}
// 키비주얼 바꾸기: 모든 「키비주얼」 이미지 레이어의 그림을 바꾸고(auto 면) 색도 다시
export async function replaceKv(doc, src, auto = true) {
  for (const p of doc.pages) walk(p.children, n => { if (n.type === 'image') for (const f of n.fills) if (f.type === 'image' && (n.name === '키비주얼' || f.src === doc.kvSrc)) f.src = src; });
  doc.kvSrc = src;
  if (auto) { const pal = await paletteFromImage(src); if (pal) applyPalette(doc, pal); return pal; }
  return null;
}
// 전체 글꼴 바꾸기(문서 설정으로 남겨 새로 만드는 글자에도 적용)
export const FONTS = [['Pretendard', 'Pretendard'], ['Noto Sans KR', '"Noto Sans KR", sans-serif'], ['Nanum Gothic', '"Nanum Gothic", sans-serif'], ['Apple SD Gothic Neo', '"Apple SD Gothic Neo", sans-serif'], ['system-ui', 'system-ui'], ['serif', 'Georgia, serif']];
export function setFontAll(doc, family) { doc.font = family; for (const p of doc.pages) walk(p.children, n => { if (n.type === 'text') n.text.family = family; }); }
export function setTextColorAll(doc, color) { for (const p of doc.pages) walk(p.children, n => { if (n.type === 'text' && n.fills[0]) n.fills[0].color = color; }); }
// 브리프 값 바꾸면 글자 레이어에 반영(이름이 메인 문구 · 날짜 · 모집 직무인 것만)
export function applyFieldsToText(doc) {
  const f = doc.fields; const fmt = d => { const m = /(\d{4})-(\d{2})-(\d{2})/.exec(d); if (!m) return d; const dt = new Date(+m[1], +m[2] - 1, +m[3]); return `${+m[2]}.${+m[3]}(${'일월화수목금토'[dt.getDay()]})`; };
  for (const p of doc.pages) walk(p.children, n => { if (n.type !== 'text') return; if (n.name === '메인 문구') n.text.content = `${f.client}\n${f.hire}`; else if (n.name === '날짜') n.text.content = `${fmt(f.start)} - ${fmt(f.end)} 17시`; else if (n.name === '모집 직무') n.text.content = `모집직무 : ${f.role}`; });
}
