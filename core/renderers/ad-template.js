// core/renderers/ad-template.js — 시안 틀 렌더러. 피그마 시안의 칸(글자·뱃지·이미지·로고)에 캠페인 내용을 채운다.
//   배경은 키비주얼에서 뽑은 지면(resolveField), 색은 역할(fg·accent)로만 받는다. 내용이 없는 칸은 비우고 아래 줄을 끌어올린다.
import { esc, textWidth } from './banner.js';
import { fontStack, textColorLocked } from '../fonts.js';
import { TEMPLATE_NORMS } from '../template-norms.js';
import { resolveField, coverPos, cutoutCapW } from '../field.js';
import { contrast, mix } from '../palette.js';
import { kvTypeOf, massBand } from '../kvtypes.js';
import { familyById, frameFor } from '../recipes.js';
import { KV_SIZE_K } from '../editlayout.js';
import { BP, blueprintOf } from '../typoaudit.js';

const WHITE = '#FFFFFF', DARK = '#1A1A1A';
const KO = (t, fs) => textWidth(t) * fs;
const NOWRAP = 'white-space:nowrap';

// 줄 나누기: 띄어쓰기에서만. 한 낱말이 칸보다 길면 글자 단위로
function wrapRows(text, fs, W) {
  let rows = 0;
  for (const line of String(text).split('\n')) {
    let cur = 0, n = 1;
    for (const tk of line.split(' ')) {
      const w = KO(tk, fs), sp = cur ? fs * 0.3 : 0;
      if (w > W) { const k = Math.ceil((cur + sp + w) / W); n += k - 1; cur = (cur + sp + w) % W; continue; }
      if (cur + sp + w > W) { n++; cur = w; } else cur += sp + w;
    }
    rows += n;
  }
  return rows;
}

// 편집 프리셋이 시안 칸을 바꾸는 방식 — 위치: 'bg' 면 전면, 옆·아래면 그 쪽 칸(시안의 full·visual 을 덮어씀). core/editopts.js 가 같은 판정을 쓴다(소재 패널에 먹는 선택지만)
export const TEMPLATE_SIDES = ['right', 'left', 'bottom'];
export function templateKvMode(style, fr) {
  const p = style?.kvPlace;
  return { full: p === 'bg' ? true : TEMPLATE_SIDES.includes(p) ? false : !!fr.full, visual: TEMPLATE_SIDES.includes(p) ? p : fr.visual };
}

export function renderTemplate(ctx, style, spec) {
  const family = familyById(style.tpl), fr = frameFor(family, spec);
  const { w: W, h: H } = spec;
  const sx = W / fr.w, sy = H / fr.h, sf = Math.min(sx, sy);
  const core = ctx.core ?? {};
  const client = String(core.client ?? '').trim();
  const hire = String(core.hiringType ?? core.employType ?? '').trim();
  const season = String(core.season ?? '').trim();
  const dateText = (() => {
    const md = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? '')); if (!m) return ''; const d = new Date(+m[1], +m[2] - 1, +m[3]); return `${+m[2]}.${+m[3]}(${'일월화수목금토'[d.getDay()]})`; };
    const a = md(core.startDate), b = md(core.deadline);
    return b ? (a ? `${a} - ${b}` : `~${b}`) : '';
  })();
  const roleText = String(core.role ?? '').trim();

  const rules = spec.rules ?? {}, INK = 0.92;
  const range0 = (rules.textLimits ?? []).find(t => t.fontSizeRange)?.fontSizeRange ?? null, th = rules.textHeightPx ?? null;
  const limits = (range0 || th) ? { max: Math.min(range0?.max ?? Infinity, th?.max != null ? Math.floor(th.max / INK) : Infinity), min: Math.max(range0?.min ?? 0, th?.min != null ? Math.ceil(th.min / INK) : 0) } : null;
  const mainRule = (rules.textLimits ?? []).find(t => /메인|광고 문구|이미지 내 텍스트/.test(String(t.field ?? ''))) ?? null;
  const sa = rules.safeArea ?? {}, saL = +sa.left || 0, saR = +sa.right || 0, saT = +sa.top || 0, saB = +sa.bottom || 0;
  // 키비주얼 칸. 비율이 달라도 칸은 규격 안에 남긴다
  const kvMeta = style.kvMeta, hasKv = !!style.keyVisual, kind = kvTypeOf(kvMeta)?.id ?? null, cutout = kind === 'cutout';
  // 편집 프리셋(일괄): 위치·크기·스크림
  const { full: frFull, visual: frVisual } = templateKvMode(style, fr);
  const kvK = KV_SIZE_K[style.kvSize] ?? 1;
  const slot = { x: fr.slot.x * sx, y: fr.slot.y * sy, w: fr.slot.w * sx, h: fr.slot.h * sy };
  const facing = frVisual === 'right' ? 'left' : frVisual === 'left' ? 'right' : frVisual === 'bottom' ? 'top' : frVisual === 'top' ? 'bottom' : 'left';
  const field = resolveField(style, { facing }) ?? {};
  const stops0 = field.stops?.length ? field.stops : [style.palette?.primary ?? '#1428A0'];
  // 지면 톤은 시안을 따른다: 밝은 지면 시안이면 같은 색을 옅게 풀어 쓴다(글자는 어둡게). 배경 그림을 만들지 않고 톤으로 느낌을 낸다
  const lightTone = !frFull && fr.tone === 'light' && cutout && contrast(stops0[0], '#FFFFFF') > 2.2;   // 배경 있는 그림은 그림 색으로 잇는다(옅게 풀면 이음이 탁해진다)
  const stops = lightTone ? stops0.map((c, i) => mix(c, '#FFFFFF', i === 0 ? 0.9 : 0.84)) : stops0;
  const fieldCss = lightTone ? `linear-gradient(180deg,${stops[0]},${stops[stops.length - 1]})` : (field.css ?? `linear-gradient(180deg,${stops[0]},${stops[stops.length - 1]})`);
  const edge = stops[0];

  // 글자색: 지면 전체에서 대비가 나는 쪽
  const worst = c => Math.min(...stops.map(s => contrast(s, c)));
  const colorLocked = textColorLocked(spec.mediumRules, rules);
  const toneFg = !colorLocked && style.textTone === 'light' ? WHITE : !colorLocked && style.textTone === 'dark' ? DARK : null;
  const baseFg = toneFg ?? (worst(WHITE) >= worst(DARK) ? WHITE : DARK);
  const fgIsDark = baseFg === DARK;
  const HEX = /^#[0-9A-Fa-f]{6}$/;
  const customFg = !colorLocked && HEX.test(style.textColor ?? '') ? style.textColor.toUpperCase() : null;
  const fg = customFg ?? baseFg;
  const rcOf = k => (!colorLocked && HEX.test(style.roleColors?.[k] ?? '') ? style.roleColors[k].toUpperCase() : null);
  const accent = (() => {
    const p = style.palette?.primary; if (!p) return null;
    const toward = fgIsDark ? '#000000' : '#FFFFFF';
    let c = p, k = 0; while (worst(c) < 4.5 && k < 8) { c = mix(c, toward, 0.15); k++; }
    return worst(c) >= 4.5 && contrast(c, fg) >= 1.3 ? c : null;
  })();
  const roleColor = r => (r === 'accent' && accent && !customFg ? accent : fg);
  const badgeFill = r => (r === 'accent' ? (accent ?? fg) : fg);
  const onFill = c => (contrast(c, WHITE) >= contrast(c, DARK) ? WHITE : DARK);

  // 레이어: 지면 → 키비주얼 → 전면이면 글자 쪽 스크림
  const layers = [];
  if (hasKv) {
    const url = esc(style.keyVisual);
    if (frFull) {
      const c = coverPos(style, W, H, {});
      layers.push(`<div data-object="1" data-kv-only="1" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;background:url('${url}') ${c.pos}/cover no-repeat"></div>`);
    }
  }

  let logoEl = '', logoFail = false, logoRect = null;
  const logoSrc = (!fgIsDark && style.logoLight) ? style.logoLight : style.logo;

  const clampFs = fs => { let v = fs; if (limits?.max != null) v = Math.min(v, limits.max); if (limits?.min != null) v = Math.max(v, limits.min); return v; };
    const mainFull = hire && client ? `${client}\n${hire}` : (client || hire);
  if (!mainFull) return null;

  const family0 = fontStack(style.fonts?.heading ?? family.font);
  const rowsOut = [];
  const parts = [];
  const emph = fr.rows.find(r => r.role === 'main')?.emph ?? null;
  const textOf = r => {
    if (r.role === 'main') return mainFull;
    if (r.role === 'season') return season || null;
    if (r.role === 'date') return dateText || null;
    if (r.role === 'role' && roleText) return r.hash ? roleText.split(/\s*,\s*/).filter(Boolean).slice(0, 4).map(t => `#${t.replace(/\s+/g, '')}`).join(' ') : roleText;
    return null;
  };
  // 글자가 쓸 수 있는 가로 범위: 칸 시안은 그림 쪽으로 넘어가지 않게
  const edgePad = Math.round(Math.min(W, H) * 0.05);
  const safeL = Math.max(edgePad, saL), safeR = W - Math.max(edgePad, saR), safeT = Math.max(edgePad * 0.8, saT), safeB = H - Math.max(edgePad, saB);
  const mainRowBp = fr.rows.find(r => r.role === 'main');
  // 청사진 제목 칸의 끝까지는 쓴다(기준선이 밀리지 않게 — 11-03 검사기 pad-x). 그림 칸이 지면 폭의 3/4를 넘는 시안(글자 뒤까지 깔린 그림)은 옆 칸으로 안 가둔다
  const slotWide = slot.w > W * 0.75;
  const textRight = Math.min(safeR, (!frFull && frVisual === 'right' && !slotWide) ? Math.max(W * 0.45, slot.x + slot.w * 0.08, (mainRowBp.x + mainRowBp.w) * sx) : W);
  const textLeft = Math.max(safeL, (!frFull && frVisual === 'left' && !slotWide) ? Math.min(W * 0.55, slot.x + slot.w * 0.92, mainRowBp.x * sx) : 0);
  const textBottom = Math.min(safeB, (!frFull && frVisual === 'bottom' && !cutout) ? Math.max(H * 0.5, slot.y + slot.h * 0.2) : H);

  // 정렬은 시안 하나에 하나. 피그마의 글상자 정렬값 대신 글자 칸이 실제로 어디에 맞춰 있는지로 판단한다
  const colRows = fr.rows.filter(r => r.role !== 'label');
  const mainRow0 = fr.rows.find(r => r.role === 'main');
  const spread = f0 => { const v = colRows.map(f0); return Math.max(...v) - Math.min(...v); };
  const frameAlign = mainRow0.al === 'left' ? 'left' : colRows.length < 2 ? mainRow0.al : (mainRow0.al === 'center' && spread(r => r.x + r.w / 2) + 4 < spread(r => r.x)) ? 'center' : mainRow0.al === 'right' && spread(r => r.x + r.w) < spread(r => r.x) ? 'right' : 'left';
  const baseEdge = frameAlign === 'center' ? (mainRow0.x + mainRow0.w / 2) * sx : frameAlign === 'right' ? (mainRow0.x + mainRow0.w) * sx : Math.min(...colRows.map(r => r.x)) * sx;
  const bpTop = Math.min(...colRows.map(r => (r.y - (r.lines ?? 1) * r.fs * 0.625) * sy));
  const bpBot = Math.max(...colRows.map(r => (r.y + (r.lines ?? 1) * r.fs * 0.625) * sy));

  // 줄 하나의 크기 → 줄 수·높이·낱말 꺾임. 알약 세로 여백은 글자의 .22(청사진 날짜 알약 높이/글자 중앙값 1.78 ≈ 1.32 + .22×2)
  const sizeRow = (p, fs) => {
    const { r, text, bw, labelW, lfs, pill } = p;
    const padX = pill ? Math.round(fs * 0.9) * 2 : 0, rows = wrapRows(text, fs, bw - labelW - padX), padY = pill ? Math.round(fs * 0.22) : 0;
    let blockH = rows * fs * p.lh + padY * 2;
    if (r.label && r.labelTop) blockH += lfs * 1.3 + lfs * 0.5;
    const wb = String(text).split(/[\s\n]+/).some(tk => KO(tk, fs) > bw - labelW - padX);   // 한 낱말이 칸보다 길어 글자 단위로 꺾임(검사기 word-break)
    const tw = Math.min(bw - labelW - padX, KO(String(text).split('\n').sort((a, b) => b.length - a.length)[0], fs) * 1.04) + padX + labelW;   // 글자 상자 폭 추정(알약 여백·옆 라벨 포함) — 그림 자리·로고·검사기가 같은 값을 쓴다
    return Object.assign(p, { fs: Math.round(fs), rows, padY, blockH, wb, tw });
  };
  // 위계: 서브·날짜·상세는 메인의 몇 % 까지(세트 값 ×1.15 와 청사진 분포 상한 중 작은 쪽 — core/typoaudit.js BP). 메인이 줄어든 만큼 따라 줄인다(11-03 「서브 비중이 타이틀보다 큼」)
  const bpRef = blueprintOf(fr);
  const capHierarchy = plan => {
    const mp = plan.find(p => p.r.role === 'main'); if (!mp) return plan;
    for (const p of plan) {
      if (p === mp) continue;
      const role = { season: 'sub', date: 'date', role: 'detail' }[p.r.role] ?? 'detail', b0 = bpRef.ratio[role];
      if (b0 == null) continue;
      const glob = p.pill ? (BP.badgePx[role] ?? BP[role]) : BP[role];
      let bound = Math.min(glob, b0 * BP.kRel);
      if (p.pill) { const hb = bpRef.badgeH[role], hg = BP.badgeH[role] ?? 1.1, hbound = hb == null ? hg : Math.min(hg, hb * BP.kRel); bound = Math.min(bound, hbound / 1.8); }
      const cap = Math.floor(mp.fs * bound);
      if (p.fs > cap && cap >= 8) sizeRow(p, cap);
    }
    return plan;
  };
  // 한 줄씩 계획: 시안의 글자 크기·간격을 쓰고, 칸이 비면 건너뛰고 위에서 아래로 쌓는다
  const planAt = k => {
    const plan = [];
    for (const r of [...fr.rows].sort((p, q) => p.y - q.y)) {
      const isMain = r.role === 'main';
      let text = textOf(r); if (!text) continue;
      const floor = isMain ? Math.max(limits?.min ?? 0, r.fs * sf * 0.6) : Math.max(limits?.min ?? 0, Math.round(Math.sqrt(W * H) * 0.03), 11);
      const rs = style.roleScale?.[{ season: 'sub', date: 'date', role: 'detail' }[r.role] ?? 'main'] ?? 1;
      let fs = Math.max(floor, clampFs(r.fs * sf * k * rs));
      const al0 = frameAlign;
      let anchor = baseEdge;
      const avail = textRight - textLeft, minW = Math.min(avail, W * 0.45, Math.max(W * 0.3, r.w * sx));   // 칸이 좁아져 글자가 세로로 서지 않게 기준선을 안쪽으로 민다(청사진 칸이 그보다 좁으면 그 폭까지만)
      if (al0 === 'center') anchor = Math.max(textLeft + minW / 2, Math.min(textRight - minW / 2, anchor));
      else if (al0 === 'right') anchor = Math.max(textLeft + minW, Math.min(textRight, anchor));
      else anchor = Math.max(textLeft, Math.min(textRight - minW, anchor));
      const left0 = al0 === 'left' ? anchor : textLeft;
      const bw = al0 === 'center' ? 2 * Math.min(anchor - textLeft, textRight - anchor) : al0 === 'right' ? anchor - textLeft : textRight - left0;
      const lfs = r.label ? Math.max(limits?.min ?? 0, 10, Math.round(clampFs(r.label.fs * sf * k))) : 0;
      const labelW = r.label && !r.labelTop ? KO('접수기간', lfs) + lfs * 2 : 0;
      const parts0 = String(text).split('\n'), longName = parts0.some(l => [...l].length > 11);   // 짧은 문구는 줄을 더 꺾지 않는다. 긴 기업명만 한 줄 더
      const pill = !!(r.badge && (r.badge.fill || r.badge.stroke));
      const maxRows = isMain ? (mainRule?.lines != null ? Math.min(mainRule.lines, parts0.length + (longName ? 1 : 0)) : parts0.length + (longName ? 1 : 0)) : r.role === 'date' || r.role === 'season' || pill ? 1 : Math.max(2, r.lines ?? 1);   // 알약은 한 줄(두 줄 알약은 청사진에 없다)
      // 규정 줄 수·글자 수에 안 들면 기업명만
      if (isMain && client && hire && (wrapRows(text, floor, bw - labelW) > maxRows || (mainRule?.maxChars != null && text.split('\n').some(l => [...l.replace(/\s/g, '')].length > mainRule.maxChars)))) text = client;
      let rows = wrapRows(text, fs, bw - labelW);
      while (fs > floor && rows > maxRows) { fs -= 1; rows = wrapRows(text, fs, bw - labelW); }
      // 긴 기업명이 낱말 안에서 꺾이면 먼저 줄인다(청사진의 72%까지 — typeWeak 선). 그 아래로도 안 들어가면 꺾는다(검사기 word-break → 이 안은 이 문구에 안 맞음)
      if (isMain) { const tok = Math.max(...String(text).split(/[\s\n]+/).map(t => textWidth(t))), lo = Math.max(floor, r.fs * sf * 0.72); while (fs > lo && tok * fs > bw - labelW) fs -= 1; rows = wrapRows(text, fs, bw - labelW); }
      // 알약은 한 줄에 못 들어가면 알약 없이 글자만(두 줄 알약은 청사진에 없고 제목보다 커 보인다 — 11-03 검사기 badge-h)
      let pillOn = pill;
      if (pill && wrapRows(text, fs, bw - labelW - Math.round(fs * 0.9) * 2) > 1) { pillOn = false; rows = wrapRows(text, fs, bw - labelW); const mr = Math.max(2, r.lines ?? 1); while (fs > floor && rows > mr) { fs -= 1; rows = wrapRows(text, fs, bw - labelW); } }
      // 제목은 시안 글상자 폭까지 키운다(짧은 문구가 작고 듬성해 보이지 않게). 통과 소재 상위선 + 시안의 1.35배까지
      if (isMain && rows === parts0.length && k === 1) {
        const line = Math.max(...text.split('\n').map(l => KO(l, fs)));
        const norm = TEMPLATE_NORMS[spec.id], cap = Math.min(fs * 1.35, norm ? norm.main[2] * 1.12 * Math.sqrt(W * H) : Infinity);
        let up = Math.min(cap, fs * Math.min(r.w * sx, bw - labelW) * 0.96 / Math.max(1, line));
        up = clampFs(up);
        while (up > fs && wrapRows(text, up, bw - labelW) > rows) up -= 1;
        if (up > fs) fs = up;
      }
      fs = Math.round(fs);
      const lh = isMain ? 1.2 : 1.32;
      const H0 = (r.lines ?? 1) * r.fs * 1.25;
      plan.push(sizeRow({ r, text, fs, lh, bw, left0, anchor, lfs, labelW, pill: pillOn, top0: (r.y - H0 / 2) * sy, bot0: (r.y + H0 / 2) * sy }, fs));
    }
    return capHierarchy(plan);
  };
  const placeAll = (plan, gapK) => {
    let cur = null, prev = null;
    for (const p of plan) {
      if (!prev) { p.top = Math.max(safeT, p.top0); cur = p.top + p.blockH; prev = p; continue; }
      const gap0 = p.top0 - prev.bot0;
      const gap = Math.max(Math.min(p.fs, prev.fs) * 0.12, Math.min(gap0, H * 0.12) * gapK);   // 바닥은 글자의 .12(행간에 이미 여유가 있다). 청사진이 붙여 둔 시즌·제목을 .4 로 벌리던 것(11-03 검사기 gap)
      p.gap = Math.round(gap); p.top = cur + gap; cur = p.top + p.blockH; prev = p;
    }
    return cur;
  };
  let plan = planAt(1), end = placeAll(plan, 1);
  // 간격은 청사진의 80% 아래로 조이지 않는다(조여서 맞추면 덩어리가 답답하다 — 11-03 검사기 gap ±20%). 안 들어가면 글자를 줄이고, 그래도 안 되면 줄을 뺀다
  if (end > textBottom) end = placeAll(plan, 0.85);
  for (let k = 0.94; end > textBottom && k >= 0.6; k -= 0.06) { plan = planAt(k); end = placeAll(plan, 0.85); }
  // 내용이 줄어도 글자 덩어리는 청사진의 자리: 세로 가운데를 맞춘다(그림이 아래인 시안은 위 기준 그대로)
  const recenter = () => {
    if (!plan.length || frVisual === 'bottom') return;
    const t = plan[0].top, b = plan[plan.length - 1].top + plan[plan.length - 1].blockH;
    const dy = Math.max(safeT - t, Math.min(textBottom - b, (bpTop + bpBot) / 2 - (t + b) / 2));
    for (const p of plan) p.top += dy;
    end = b + dy;
  };
  // 그래도 넘치면 뒤 항목부터 뺀다(일정·기업명은 끝까지 남긴다)
  while (end > textBottom && plan.some(p => p.r.role === 'role' || p.r.role === 'season')) { const i = plan.findLastIndex(p => p.r.role === 'role' || p.r.role === 'season'); plan.splice(i, 1); end = placeAll(plan, 0.85); }

  recenter();
  for (const p of plan) {
    const { r, text, fs, lh, bw, left0, anchor, rows, top, lfs, padY } = p;
    const fieldKey = r.role === 'main' ? 'main' : r.role === 'season' ? 'sub' : r.role === 'date' ? 'date' : 'detail';
    const color = rcOf(fieldKey) ?? roleColor(r.color), al = frameAlign;
    const mainHtml = () => {
      if (!(client && hire) || text === client) return esc(text).replace(/\n/g, '<br/>');
      const span = (t, on) => {
        if (emph?.kind === 'color' && emph.on === on && accent && !customFg && !rcOf('main')) return `<span data-accent="1" style="color:${accent}">${esc(t)}</span>`;
        if (emph?.kind === 'weight') return `<span data-weight-part="${on}" style="font-weight:${on === 'client' ? emph.client : emph.hire}">${esc(t)}</span>`;
        return esc(t);
      };
      return `${span(client, 'client')}<br/>${span(hire, 'hire')}`;
    };
    const html = r.role === 'main' ? mainHtml() : esc(text);
    const dataField = r.role === 'main' ? 'main' : r.role === 'season' ? 'sub' : r.role === 'date' ? 'date' : 'detail';
    const wtMain = r.role === 'main' && emph?.kind === 'weight' && !(client && hire && text !== client) ? Math.max(emph.client, emph.hire) : r.wt;   // 굵기 대비형에서 기업명만 남으면 굵은 쪽(가는 300 한 줄은 날짜보다 약해진다)
    const inner = `font-size:${fs}px;line-height:${lh};font-weight:${wtMain};text-align:${al};word-break:keep-all;overflow-wrap:anywhere`;
    const justify = al === 'center' ? 'center' : al === 'right' ? 'flex-end' : 'flex-start';
    const b = p.pill ? r.badge : null;
    const fill = b?.fill ? badgeFill(b.fill) : null;
    const valueCss = b ? `display:inline-block;box-sizing:border-box;max-width:100%;padding:${padY}px ${Math.round(fs * 0.9)}px;border-radius:${Math.max(4, Math.min(fs, Math.round(b.r * sf)))}px;${fill ? `background:${fill};` : ''}${b.stroke ? `border:${Math.max(1, Math.round(2 * sf))}px solid ${color};` : ''}color:${fill ? onFill(fill) : color};` : `color:${color};`;
    const value = `<div data-field="${dataField}" style="${valueCss}${inner}${r.role === 'date' || r.role === 'season' ? `;${NOWRAP}` : ''}">${html}</div>`;
    let labelHtml = '';
    if (r.label) {
      const L = r.label, lb = L.badge, lfill = lb?.fill ? badgeFill(lb.fill) : null, lpadX = lb ? Math.round(lfs * 0.7) : 0, lpadY = lb ? Math.round(lfs * 0.2) : 0;
      labelHtml = `<div data-field="label" style="flex:none;box-sizing:border-box;padding:${lpadY}px ${lpadX}px;border-radius:${lb ? Math.max(3, Math.min(lfs, Math.round((lb.r || lfs) * sf))) : 0}px;${lfill ? `background:${lfill};` : ''}${lb?.stroke ? `border:1px solid ${roleColor(L.color)};` : ''}color:${lfill ? onFill(lfill) : roleColor(L.color)};font-size:${lfs}px;line-height:1.3;font-weight:${L.wt};${NOWRAP}">${r.role === 'date' ? '접수기간' : '모집직무'}</div>`;
    }
    const dir = r.label && r.labelTop ? `flex-direction:column;align-items:${justify};gap:${Math.round(lfs * 0.5)}px` : `align-items:${rows > 1 ? 'flex-start' : 'center'};justify-content:${justify};gap:${Math.round(Math.max(lfs, fs) * 0.6)}px`;
    parts.push(`<div style="display:flex;max-width:100%;${dir};${parts.length ? `margin-top:${p.gap ?? 0}px` : ''}">${labelHtml}${value}</div>`);
    // 검사기(core/typoaudit.js) 입력: 글자 상자(라벨 포함) 추정·굵기(강조 굵기 포함)·뱃지 여부·낱말 꺾임
    const tw = p.tw;
    const x0 = al === 'center' ? anchor - tw / 2 : al === 'right' ? anchor - tw : left0;
    const wt = r.role === 'main' && emph?.kind === 'weight' ? Math.max(emph.client, emph.hire) : r.wt;
    rowsOut.push({ role: dataField, px: fs, rows, wt, x: Math.round(x0), y: Math.round(top), w: Math.round(tw), h: Math.round(p.blockH), badge: !!b, gap: p.gap ?? 0, wb: p.wb });
  }
  let kvPx = null, kvCap = null;   // kvCap: 작은 누끼를 원본 1.5배에서 멈춘 기록(trace.tpl.kvCap)
  // 전면 그림: 글자 덩어리 뒤만 지면색으로 덮고 글자 밖에서 풀어 준다(그림 가운데까지 탁하게 덮지 않는다)
  if (hasKv && frFull && style.scrim !== 'none') {
    const t0 = plan[0].top, t1 = plan[plan.length - 1].top + plan[plan.length - 1].blockH;
    const a0 = { low: 0.45, mid: 0.65, high: 0.85 }[style.scrim] ?? 0.86, hx = Math.round(a0 * 255).toString(16).padStart(2, '0'), fade = H * 0.2;
    const fromTop = (t0 + t1) / 2 < H / 2;
    const near = fromTop ? t1 : H - t0, stop = Math.round(near / H * 100), end = Math.min(100, Math.round((near + fade) / H * 100));
    layers.push(`<div data-scrim="1" style="position:absolute;inset:0;background:linear-gradient(${fromTop ? 'to bottom' : 'to top'},${edge}${hx} 0%,${edge}${hx} ${stop}%,${edge}00 ${end}%)"></div>`);
  }
  // 키비주얼: 시안 칸에 가두지 않고 글자 옆 남는 자리를 채운다(디자이너 소재의 주인공 크기). 누끼는 그대로, 배경 있는 그림은 글자 쪽 변을 녹인다
  if (hasKv && !frFull) {
    const tw0 = p => p.tw;
    const tR = Math.max(...plan.map(p => (frameAlign === 'center' ? p.anchor + tw0(p) / 2 : frameAlign === 'right' ? p.anchor : p.left0 + tw0(p))));
    const tL = Math.min(...plan.map(p => (frameAlign === 'center' ? p.anchor - tw0(p) / 2 : frameAlign === 'right' ? p.anchor - tw0(p) : p.left0)));
    const tT = plan[0].top, tB = plan[plan.length - 1].top + plan[plan.length - 1].blockH;
    const horizV = frVisual === 'right' || frVisual === 'left';
    const gapX = Math.max(Math.min(W, H) * 0.04, horizV ? Math.min(W * 0.1, (bpRef.kvGap ?? 0) * sx) : 0), gapY = Math.max(Math.min(W, H) * 0.04, horizV ? 0 : Math.min(H * 0.1, (bpRef.kvGap ?? 0) * sy)), person = !!kvTypeOf(kvMeta)?.flags?.character, inset = (!cutout || person) ? 0 : Math.round(Math.min(W, H) * 0.04);
    const url = esc(style.keyVisual);
    const v = frVisual;
    let b0, kvPx0;
    if (cutout) {
      const ar = kvMeta?.ar ?? 1, flags = kvTypeOf(kvMeta)?.flags ?? {};
      // 후보 자리 중 그림이 가장 크게 들어가는 곳. 세로로 긴 그림은 글자 아래 빈칸이 아니라 글자 옆 전체 높이를 쓴다
      const boxes = [];
      // 칸은 글자 끝에서 시작한다(글자 위로 넘어오지 않는다). 그래서 작아지면 kvMisfit 이 거른다(11-03 검사기 kv-overlap)
      if (v === 'right' || (v === 'bottom' && frameAlign === 'left')) boxes.push({ x: tR + gapX, y: inset, r: W - inset, b: H - inset, ax: 'right' });
      if (v === 'left' || (v === 'bottom' && frameAlign === 'right')) boxes.push({ x: inset, y: inset, r: tL - gapX, b: H - inset, ax: 'left' });
      if (v === 'top') boxes.push({ x: inset, y: inset, r: W - inset, b: tT - gapY, ax: 'center', top: true });
      if (v === 'bottom') boxes.push({ x: inset, y: tB + gapY, r: W - inset, b: H - inset, ax: frameAlign === 'left' ? 'right' : 'center' });
      // 가로형 떼·아이소(왼쪽 정렬 시안): 제목 아래·짧은 줄(일정·직무) 오른쪽의 ㄱ자 빈 칸 — 통과 소재 떼 세트(22111 fig-13 580×400)가 제목 밑 우하단 63%×55%에 둔 자리. 오른쪽 열만 쓰면 폭 때문에 작아진다
      const herd0 = !person && (flags.group || flags.multi) && ar > 1.3, mainIdx = plan.findIndex(p => p.r.role === 'main');
      if (herd0 && frameAlign === 'left' && (v === 'right' || v === 'bottom') && mainIdx >= 0 && mainIdx < plan.length - 1) {
        const below = plan.slice(mainIdx + 1), bR = Math.max(...below.map(p => p.left0 + tw0(p))), mB = plan[mainIdx].top + plan[mainIdx].blockH;
        boxes.push({ x: bR + gapX, y: mB + gapX, r: W - inset, b: H - inset, ax: 'right', ell: true });
      }
      const fit = q => { const w = q.r - q.x, h = q.b - q.y, c = Math.min(w / ar, h); return c * c * ar; };
      b0 = boxes.reduce((p, q) => (fit(q) > fit(p) ? q : p));
      // 사람은 아래로, 단일 사물은 오른쪽·아래로 흘려 크게 쓴다(디자이너 소재의 크기). 여러 덩어리·아이소는 자르지 않는다
      const bw0 = b0.r - b0.x, bh0 = b0.b - b0.y;
      let ih = Math.min(bw0 / ar, bh0);
      const cut = person ? (b0.ax !== 'center' && !b0.top && b0.y > H * 0.2 ? 0.45 : 0.35) : flags.single && ih * ih * ar < W * H * 0.22 ? 0.25 : 0;
      if (cut && !b0.top) ih = Math.min(bw0 / ar, bh0 / (1 - cut));
      // 가로형 떼·아이소(자르지 않는 누끼)는 글자 아래 남는 높이를 다 쓴다 — 폭이 넘치면 좌우로 12%까지 블리드, 위쪽 성긴 칸(더듬이·머리끝, 불투명 폭 < 최대 15%)은 글자 틈까지만 올라온다.
      // 맞춰 넣기(contain)만 하면 바닥에 얇은 띠로 들어가 위가 텅 빈다(11-03 fig-07 시트 15~25%). 목표는 통과 소재 떼 세트(22111 fig-13) 그림 칸 29~34%
      const herd = herd0, mb = herd ? massBand(kvMeta?.field?.rows, 0.15) : { top: 0, bottom: 1 };
      if (herd && !b0.top) {
        const span = Math.max(0.3, mb.bottom - mb.top), floor0 = b0.y;   // 그림 윗변은 칸 위(= 글자 아래 + 간격. 성긴 칸이 글자를 덮지 않게)
        ih = Math.min(bw0 * 1.12 / ar, bh0 / span, (b0.b - floor0) / Math.max(0.5, mb.bottom));
      }
      ih *= kvK;
      // 작은 누끼는 원본의 1.5배(CANON maxUpscale.cutout, 기본안 field.js cutoutCapW 와 같은 선)에서 멈춘다 — 인물 크롭 확대로 174px 그림을 3~4배 키우던 것(11-03 dongsuh-model 전수 97건 전부 1.6배 이상). 넘는 만큼은 그림 탓: 필요 px 를 남겨 검수가 알린다
      const capW = cutoutCapW(style);
      if (ih * ar > capW) { kvCap = { need: Math.round(ih * ar), max: capW, k: Math.round(ih * ar / kvMeta.px[0] * 10) / 10 }; ih = capW / ar; }
      const iw = ih * ar;
      const ix = b0.ax === 'right' ? b0.r - Math.min(iw, bw0) : b0.ax === 'left' ? Math.min(b0.x, b0.r - iw) : b0.x + (bw0 - iw) / 2;   // 블리드는 지면 바깥으로만(글자 쪽으로는 안 넘친다 — 왼쪽 칸은 왼쪽 밖으로)
      const iy = b0.top ? b0.y : ((person || cut) ? Math.max(b0.y, b0.b - ih * (1 - cut)) : herd ? b0.b - ih * mb.bottom : b0.b - ih);   // 사람·흘린 사물은 머리(윗부분)를 남기고 아래를 지면 밖으로 자른다(글자 쪽으로 올라오지 않는다). 떼는 덩어리 바닥을 칸 바닥에
      kvPx0 = { x: ix, y: iy, w: iw, h: ih }; kvPx = kvPx0;
      layers.push(`<div data-object="1"${kvCap ? ` data-kv-need="${kvCap.need}"` : ''} style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;background:url('${url}') ${Math.round(ix)}px ${Math.round(iy)}px/${Math.round(iw)}px ${Math.round(ih)}px no-repeat${kvCap ? ';--kv-capped:1' : ''}"></div>`);
    } else {
      // 녹이는 구간은 글자 끝에서 시작한다. 길이는 시안 실측: 이미지의 가로 45%·세로 30%(이음 측정 중앙값 .28~.94 중 그림이 보이는 쪽)
      if (v === 'right') b0 = { x: Math.max(0, Math.min(tR - W * 0.04, W * 0.6)), y: 0, r: W, b: H };
      else if (v === 'left') b0 = { x: 0, y: 0, r: Math.min(W, Math.max(tL + W * 0.04, W * 0.4)), b: H };
      else if (v === 'top') b0 = { x: 0, y: 0, r: W, b: Math.min(H, Math.max(tT + H * 0.03, H * 0.35)) };
      else b0 = { x: 0, y: Math.max(0, Math.min(tB - H * 0.03, H * 0.65)), r: W, b: H };
      const bw = b0.r - b0.x, bh = b0.b - b0.y, pos = coverPos(style, Math.round(bw), Math.round(bh), {}).pos;
      const dir = v === 'right' ? 'to right' : v === 'left' ? 'to left' : v === 'top' ? 'to top' : 'to bottom', len = (v === 'right' || v === 'left') ? bw * 0.45 : bh * 0.3;
      const mask = `linear-gradient(${dir},transparent,#000 ${Math.round(len)}px)`;
      layers.push(`<div data-object="1" style="position:absolute;left:${Math.round(b0.x)}px;top:${Math.round(b0.y)}px;width:${Math.round(bw)}px;height:${Math.round(bh)}px;background:url('${url}') ${pos}/cover no-repeat;-webkit-mask-image:${mask};mask-image:${mask}"></div>`);
    }
    slot.x = b0.x; slot.y = b0.y; slot.w = b0.r - b0.x; slot.h = b0.b - b0.y;
  }
  // 글자 열: 정렬선은 하나. 모든 줄이 이 열 안에서 쌓여 겹치거나 어긋날 수 없다
  const p0 = plan[0];
  const colLeft = Math.round(frameAlign === 'center' ? p0.anchor - p0.bw / 2 : frameAlign === 'right' ? p0.anchor - p0.bw : p0.left0);
  const colW = Math.round(p0.bw), colTop = Math.round(p0.top);
  // 로고: 시안 자리 → 글자와 닿으면 다른 모서리
  if (logoSrc) {
    const ar = style.logoMeta?.px ? style.logoMeta.px[0] / Math.max(1, style.logoMeta.px[1]) : 3;
    const lh = Math.round(Math.min(Math.max(16, Math.sqrt(W * H) * 0.05), (Math.min(W * 0.26, W - saL - saR) / ar))), lw = Math.round(lh * ar);
    const pad = Math.round(Math.min(W, H) * 0.06), xs = [W - lw - Math.max(pad, saR), Math.max(pad, saL), Math.round(W / 2 - lw / 2)], ys = [Math.max(pad * 0.7, saT), H - lh - Math.max(pad * 0.7, saB)];
    const estTw = p => p.tw;
    const touches = (x, y) => plan.some(p => { const tw = estTw(p), x0 = frameAlign === 'center' ? p.anchor - tw / 2 : frameAlign === 'right' ? p.anchor - tw : p.left0; const m = Math.min(W, H) * 0.03; return x < x0 + tw + m && x + lw > x0 - m && y < p.top + p.blockH + m && y + lh > p.top - m; });
    // 로고가 주인공 위에 얹히지 않게: 누끼가 차지하는 자리도 피한다
    const kvRect = kvPx;
    const onKv = (x, y) => kvRect && x < kvRect.x + kvRect.w && x + lw > kvRect.x && y < kvRect.y + kvRect.h && y + lh > kvRect.y;
    const firstX = fr.logo && fr.logo.x + fr.logo.w / 2 < fr.w * 0.4 ? 1 : fr.logo && Math.abs(fr.logo.x + fr.logo.w / 2 - fr.w / 2) < fr.w * 0.1 ? 2 : 0;
    const firstY = fr.logo && fr.logo.y + fr.logo.h / 2 > fr.h * 0.6 ? 1 : 0;
    const order = [[firstX, firstY], [firstX, 1 - firstY], [0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [2, 1]];
    const pick = order.find(([i, j]) => !touches(xs[i], ys[j]) && !onKv(xs[i], ys[j])) ?? order.find(([i, j]) => !touches(xs[i], ys[j])) ?? null;
    const filter = fgIsDark ? '' : (style.logoLight ? '' : 'filter:brightness(0) invert(1);');
    if (pick) { logoRect = { x: Math.round(xs[pick[0]]), y: Math.round(ys[pick[1]]), w: lw, h: lh }; logoEl = `<img data-logo="1" src="${esc(logoSrc)}" alt="" style="position:absolute;z-index:2;left:${logoRect.x}px;top:${logoRect.y}px;height:${lh}px;width:auto;object-fit:contain;${filter}"/>`; }
    else logoFail = true;
  }
  // 그림이 칸을 채우는가 · 글자와 그림 사이가 텅 비는가(세로 인물을 넓은 칸에 넣는 경우 등) — 안 맞으면 후보에서 뺀다
  const kvMisfit = (() => {
    const ar = kvMeta?.ar; if (!hasKv || !ar || frFull) return false;
    if (!cutout && (Math.min(W, slot.x + slot.w) - Math.max(0, slot.x)) * (Math.min(H, slot.y + slot.h) - Math.max(0, slot.y)) / (W * H) < 0.18) return true;
    const x0 = Math.max(0, slot.x), y0 = Math.max(0, slot.y), bw = Math.min(W, slot.x + slot.w) - x0, bh = Math.min(H, slot.y + slot.h) - y0;
    if (!cutout) return false;
    if (!kvPx) return false;
    const kt = kvTypeOf(kvMeta)?.flags ?? {}, herd = !kt.character && (kt.group || kt.multi) && ar > 1.3;
    const iw = kvPx.w, ih = Math.min(H, kvPx.y + kvPx.h) - Math.max(0, kvPx.y);
    // 주인공이 작으면 지면이 빈다. 통과 소재 그림 칸 하위선(.17~.29)보다 조금 아래까지 허용, 세로 인물은 폭 때문에 낮게. 가로형 떼·아이소는 통과 소재 떼 세트(22111 fig-13 그림 칸 .29~.34)에 맞춰 25% — 얇은 띠로 들어간 안은 후보에서 뺀다(11-03)
    // 떼의 25% 는 얇은 띠(높이 35% 미만)일 때만 — 제목 아래 ㄱ자 칸에 높이를 다 쓴 떼는 면적이 작아도 띠가 아니다(11-03 검사기 전수: 제목을 청사진 폭까지 키우면 칸이 줄어 전부 빠지던 것)
    if ((Math.min(W, kvPx.x + iw) - Math.max(0, kvPx.x)) * ih / (W * H) < (kt.character ? 0.1 : herd && ih / H < 0.35 ? 0.25 : 0.15)) return true;
    const textR = Math.max(...plan.map(p => { const tw = p.tw; return frameAlign === 'center' ? p.anchor + tw / 2 : frameAlign === 'right' ? p.anchor : p.left0 + tw; }));
    const textB = plan[plan.length - 1].top + plan[plan.length - 1].blockH;
    if (frVisual === 'right' && kvPx.x - textR > W * 0.22) return true;
    if (frVisual === 'bottom' && kvPx.y > textB && kvPx.y - textB > H * 0.16) return true;
    return false;
  })();
  // 글자가 주인공 위에 얼마나 얹히는지 — 고르기 후보에서 거르는 값
  const overlap = (() => {
    const fc = kvMeta?.field?.focus, ar = kvMeta?.ar;
    if (!hasKv || !fc || !ar) return 0;
    const box = frFull ? { x: 0, y: 0, w: W, h: H } : { x: Math.max(0, slot.x), y: Math.max(0, slot.y), w: Math.min(W, slot.x + slot.w) - Math.max(0, slot.x), h: Math.min(H, slot.y + slot.h) - Math.max(0, slot.y) };
    const k = (cutout && !frFull) ? Math.min(box.w / ar, box.h) : Math.max(box.w / ar, box.h);
    const iw = kvPx ? kvPx.w : k * ar, ih = kvPx ? kvPx.h : k, ox = kvPx ? kvPx.x : box.x + (box.w - iw) / 2, oy = kvPx ? kvPx.y : box.y + (box.h - ih) / 2;
    const S = { x0: ox + (fc.x - fc.w / 2) * iw, x1: ox + (fc.x + fc.w / 2) * iw, y0: oy + (fc.y - fc.h / 2) * ih, y1: oy + (fc.y + fc.h / 2) * ih };
    let worst = 0;
    for (const p of plan) {
      const tw = Math.min(p.bw, KO(p.text.split('\n').sort((a, b) => b.length - a.length)[0], p.fs));
      const x0 = frameAlign === 'center' ? p.anchor - tw / 2 : frameAlign === 'right' ? p.anchor - tw : p.left0, x1 = x0 + tw, y0 = p.top, y1 = p.top + p.blockH;
      const a = Math.max(0, Math.min(x1, S.x1) - Math.max(x0, S.x0)) * Math.max(0, Math.min(y1, S.y1) - Math.max(y0, S.y0));
      worst = Math.max(worst, a / Math.max(1, (x1 - x0) * (y1 - y0)));
    }
    return Math.round(worst * 100) / 100;
  })();
  // 규정 줄 수·글자 높이를 못 지키면 이 시안은 이 내용에 안 맞는다(후보에서 뺀다)
  const mainPlan = plan.find(p => p.r.role === 'main');
  const mainP = plan.find(p => p.r.role === 'main');
  const typeWeak = mainP && (mainP.fs < mainP.r.fs * sf * 0.72 || plan.some(p => p !== mainP && p.fs > mainP.fs * 0.88));   // 제목 위계가 무너진 조합
  const unfit = typeWeak || (mainRule?.lines != null && mainPlan && mainPlan.rows > mainRule.lines) || plan.some(p => limits?.min && p.fs < limits.min) || end > H - 2 || kvMisfit || logoFail;
  const m = rowsOut.find(x => x.role === 'main');
  const trace = { v: 1, rules: [`tpl.${family.id}`], tpl: { id: family.id, name: family.name, frame: fr.id, overlap, unfit: !!unfit, align: frameAlign, sx, sy, sf, ...(kvCap ? { kvCap } : {}), rows: rowsOut, logo: logoRect, kv: kvPx ? { x: Math.round(kvPx.x), y: Math.round(kvPx.y), w: Math.round(kvPx.w), h: Math.round(kvPx.h) } : null, kvCutout: !!(hasKv && !frFull && cutout) }, fonts: { main: { px: m?.px ?? 0, lines: m?.rows ?? 0, weight: fr.rows.find(r => r.role === 'main')?.wt ?? 700 } }, copy: { main: mainFull, sub: season || null, date: dateText || null, details: roleText ? ['모집직무'] : [] }, field: { stops } };
  const tr = esc(JSON.stringify(trace)).replace(/"/g, '&quot;');
  return `<div data-ad="1" data-spec="${esc(spec.id ?? '')}" data-transparent="0" data-field-source="${esc(field.source ?? 'none')}" data-trace="${tr}" style="position:relative;width:${W}px;height:${H}px;overflow:hidden;box-sizing:border-box;background:${fieldCss};font-family:${family0};color:${fg}">
${layers.join('\n')}
<div data-text-col="1" style="position:absolute;left:${colLeft}px;top:${colTop}px;width:${colW}px;display:flex;flex-direction:column;align-items:${frameAlign === 'center' ? 'center' : frameAlign === 'right' ? 'flex-end' : 'flex-start'}">
${parts.join('\n')}
</div>
${logoEl}
</div>`;
}
