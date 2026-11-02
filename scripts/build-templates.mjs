#!/usr/bin/env node
// 피그마 「홍보사업셀」에서 추출한 시안 → 구멍 뚫린 틀 데이터(core/templates-data.js).
//   고객사 문구·이미지·브랜드 색 값은 저장하지 않는다. 글자 칸·크기·글꼴·굵기, 색의 역할, 뱃지, 이미지 칸만 남긴다.
//   node scripts/build-templates.mjs <추출 JSON 파일...>   (파일 내용: { TAG, out: [[frame, ...], ...] })
import { readFileSync, writeFileSync } from 'node:fs';

const FONT_MAP = [
  [/pretendard|inter|noto|spoqa/i, 'Pretendard'], [/gmarket/i, 'GmarketSans'], [/paperlogy/i, 'Paperlogy'],
  [/freesentation/i, 'Freesentation'], [/a2z/i, 'A2Z'], [/suit/i, 'SUIT'], [/nanumsquare neo/i, 'NanumSquareNeo'],
  [/nanumsquare/i, 'NanumSquare'], [/jalnan|impactamin|cafe24|aggro|gangwon|one mobile title|s-core|kohibaeum|hdharmony|elice|pyeojin/i, 'GmarketSans'],
];
const fontId = f => FONT_MAP.find(([re]) => re.test(f))?.[1] ?? 'Pretendard';
const weightOf = s => {
  const t = String(s).toLowerCase();
  if (/(black|heavy|max|9 )/.test(t)) return 900;
  if (/extra ?bold|8 /.test(t)) return 800;
  if (/semi ?bold|6 /.test(t)) return 600;
  if (/bold|^b$|7 /.test(t)) return 700;
  if (/medium|^m$|5 /.test(t)) return 500;
  if (/light|^lt$|3 /.test(t)) return 300;
  return 400;
};
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lumOf = h => { const [r, g, b] = rgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const satOf = h => { const c = rgb(h), a = Math.max(...c), b = Math.min(...c); return a ? (a - b) / a : 0; };
// 색은 값 대신 역할로: 채도 있으면 강조색, 흰·검정·회색이면 글자색
const colorRole = h => (h && satOf(h) > 0.35 ? 'accent' : 'fg');

function normalizeFrame(fr) {
  const [W, H] = fr.s.split('x').map(Number);
  const slot0 = fr.im?.[0]?.b ?? null;
  if (!slot0) return null;
  const area = (Math.min(slot0[0] + slot0[2], W) - Math.max(slot0[0], 0)) * (Math.min(slot0[1] + slot0[3], H) - Math.max(slot0[1], 0)) / (W * H);
  const full = area >= 0.8;
  const texts = fr.t.map(t => ({ role: t[0], x: t[1], y: t[2], w: t[3], h: t[4], fs: t[5], font: t[6], style: t[7], lh: t[8], al: t[9], color: t[10], lines: t[11], len: t[12], segs: t[13] }))
    .filter(t => t.x > -W * 0.2 && t.x + t.w < W * 1.2 && t.y + t.h / 2 > 0 && t.y + t.h / 2 < H)
    .filter((t, i, arr) => arr.findIndex(o => o.x === t.x && o.y === t.y && o.fs === t.fs) === i);   // 겹쳐 놓인 복제 레이어
  // 피그마 위에 얹어 둔 매체 가이드 표시(빨간 안전영역·치수 글자 Inter 32)는 시안이 아니다
  for (let i = texts.length - 1; i >= 0; i--) if (/^inter$/i.test(texts[i].font) && texts[i].fs === 32) texts.splice(i, 1);
  fr.sh = (fr.sh ?? []).filter(b => !(Array.isArray(b[5]) && /^#ff2b2b$/i.test(b[5][0])));
  if (!texts.length) return null;
  const top = Math.max(...texts.map(t => t.fs));
  for (const t of texts) { if (t.fs >= top * 0.9 && t.role !== 'main' && t.role !== 'date') t.role = 'main'; else if (t.role === 'main' && t.fs < top * 0.9) t.role = t.y < texts.find(x => x.fs === top).y ? 'sub' : 'detail'; }
  const cy = t => t.y + t.h / 2;
  const mains = texts.filter(t => t.role === 'main').sort((a, b) => cy(a) - cy(b));
  if (!mains.length) return null;
  const lead = mains[0];
  const rows = [];
  const badgeOf = t => {
    const cx = t.x + t.w / 2;
    const s = (fr.sh ?? []).find(b => cx > b[0] && cx < b[0] + b[2] && cy(t) > b[1] && cy(t) < b[1] + b[3] && b[3] < H * 0.22 && b[2] < W * 0.95);
    if (!s) return null;
    const [x, y, w, h, r, fill, stroke] = s;
    const solid = Array.isArray(fill) ? fill[0] : null;
    return { x, y, w, h, r: Math.min(r ?? 0, h / 2), fill: solid ? colorRole(solid) : null, stroke: !!stroke };
  };
  const rowOf = (role, t, extra = {}) => ({ role, x: t.x, y: Math.round(cy(t)), w: t.w, fs: t.fs, wt: weightOf(t.style), al: t.al === 'C' ? 'center' : t.al === 'R' ? 'right' : 'left', color: colorRole(t.color), badge: badgeOf(t), ...extra });
  // 메인: 한 글상자면 기업명 / 채용구분을 한 칸에, 두 글상자면 줄마다
  const emphOf = () => {
    const segs = lead.segs ?? null;
    const m2 = mains[1];
    if (m2 && colorRole(m2.color) !== colorRole(lead.color)) return { kind: 'color', on: colorRole(lead.color) === 'accent' ? 'client' : 'hire' };
    if (m2 && weightOf(m2.style) !== weightOf(lead.style)) return { kind: 'weight', client: weightOf(lead.style), hire: weightOf(m2.style) };
    if (!segs) return null;
    const big = segs.filter(s => s[3] >= lead.fs * 0.85);
    const cols = big.map(s => colorRole(s[2]));
    if (cols.includes('accent') && cols.includes('fg')) return { kind: 'color', on: cols[0] === 'accent' ? 'client' : 'hire' };
    const wts = big.map(s => weightOf(s[1]));
    if (new Set(wts).size > 1) return { kind: 'weight', client: wts[0], hire: wts[wts.length - 1] };
    return null;
  };
  const mainTop = Math.min(...mains.map(cy));
  rows.push(rowOf('main', lead, { color: colorRole(lead.color) === 'accent' && (lead.segs || mains[1]) ? 'fg' : colorRole(lead.color), lines: mains.length > 1 ? 2 : lead.lines, emph: emphOf(), span: mains.length > 1 ? Math.round(cy(mains[mains.length - 1]) - cy(lead) + lead.h) : lead.h, w: Math.max(...mains.map(m => m.w)), y: Math.round(lead.y + (mains.length > 1 ? (cy(mains[mains.length - 1]) + mains[mains.length - 1].h / 2 - lead.y) : lead.h) / 2) }));
  const sub = texts.find(t => t.role === 'sub' && cy(t) < mainTop);
  if (sub) rows.push(rowOf('season', sub));
  // 정보 줄: 라벨은 오른쪽이나 아래의 값과 묶는다
  const infos = texts.filter(t => ['date', 'detail', 'hash'].includes(t.role)).sort((a, b) => cy(a) - cy(b));
  const labels = texts.filter(t => t.role === 'label');
  let hasDate = false, hasRole = false;
  for (const t of infos) {
    const role = t.role === 'date' && !hasDate ? 'date' : t.role !== 'date' && !hasRole ? 'role' : null;
    if (!role) continue;
    if (role === 'date') hasDate = true; else hasRole = true;
    const near = labels.find(l => (Math.abs(cy(l) - cy(t)) < Math.max(l.h, t.h) * 0.7 && l.x < t.x) || (cy(l) < cy(t) && cy(t) - cy(l) < t.h + l.h * 1.6 && Math.abs(l.x - t.x) < W * 0.12));
    rows.push(rowOf(role, t, { hash: t.role === 'hash', lines: t.lines, label: near ? rowOf('label', near) : null, labelTop: !!near && cy(near) < cy(t) - near.h * 0.6 }));
  }
  const lg = fr.lg && fr.lg[0] >= -2 && fr.lg[1] >= -2 && fr.lg[0] + fr.lg[2] <= W + 2 && fr.lg[1] + fr.lg[3] <= H + 2 && fr.lg[2] < W * 0.4 && fr.lg[3] < H * 0.2 && fr.lg[3] >= H * 0.015 ? fr.lg : null;
  const bgDark = (() => { const b = fr.bg; const h = Array.isArray(b) ? b[0] : b?.s?.[0]?.[1]; return h ? lumOf(h) < 0.45 : false; })();
  return { w: W, h: H, id: fr.id, full, slot: { x: slot0[0], y: slot0[1], w: slot0[2], h: slot0[3], r: fr.im[0].r ?? 0 }, logo: lg ? { x: lg[0], y: lg[1], w: lg[2], h: lg[3] } : null, rows: rows.sort((a, b) => a.y - b.y), font: fontId(lead.font), bgDark };
}

// 이름 규칙: 비주얼 쓰임 + 타이포 특징. 사람이 고를 때 보는 이름
function traitsOf(fr) {
  const main = fr.rows.find(r => r.role === 'main');
  const dateRow = fr.rows.find(r => r.role === 'date');
  const cx = fr.slot.x + fr.slot.w / 2, cy = fr.slot.y + fr.slot.h / 2;
  const visual = fr.full ? 'full' : (fr.w >= fr.h * 1.15 ? (cx >= fr.w / 2 ? 'right' : 'left') : (cy >= fr.h / 2 ? 'bottom' : 'top'));
  const big = main.fs / Math.sqrt(fr.w * fr.h) >= 0.1;
  const typo = main.emph?.kind === 'color' ? 'color' : main.emph?.kind === 'weight' ? 'weight'
    : dateRow?.badge ? 'datebadge' : fr.rows.some(r => r.label?.badge) ? 'labelbadge' : fr.rows.some(r => r.label) ? 'label' : big ? 'big' : 'plain';
  return { visual, typo, align: main.al };
}
const VISUAL_NAME = { full: '전면 비주얼', right: '우측 비주얼', left: '좌측 비주얼', bottom: '하단 비주얼', top: '상단 비주얼' };
const TYPO_NAME = { color: '색 강조형', weight: '굵기 대비형', datebadge: '일정 뱃지형', labelbadge: '라벨 뱃지형', label: '라벨 정보형', big: '타이포 강조형', plain: '기본 타이포형' };

const families = [];
for (const file of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(file, 'utf8'));
  for (const fam of j.out) {
    const frames = fam.map(normalizeFrame).filter(Boolean);
    if (!frames.length) continue;
    for (const fr of frames) { const x = traitsOf(fr); fr.visual = x.visual; fr.name = `${VISUAL_NAME[x.visual]} · ${TYPO_NAME[x.typo]}`; }
    const t = traitsOf(frames[0]);
    families.push({ id: `${String(j.TAG).replace('TPL_', '').toLowerCase()}-${frames[0].id.replace(':', '-')}`, source: j.TAG.replace('TPL_', ''), name: `${VISUAL_NAME[t.visual]} · ${TYPO_NAME[t.typo]}`, ...t, font: frames[0].font, frames });
  }
}
const seen = new Set(), out = families.filter(f => !seen.has(f.id) && seen.add(f.id));
writeFileSync(new URL('../core/templates-data.js', import.meta.url), `// 생성 파일(scripts/build-templates.mjs). 피그마 「홍보사업셀」 시안에서 칸·타이포·뱃지 구조만 옮겼다. 고객사 문구·이미지 없음.\nexport const TEMPLATE_FAMILIES = ${JSON.stringify(out)};\n`);
const count = {}; for (const f of out) count[f.name] = (count[f.name] ?? 0) + 1;
console.log(out.length, '세트', out.reduce((n, f) => n + f.frames.length, 0), '프레임'); console.log(count);
