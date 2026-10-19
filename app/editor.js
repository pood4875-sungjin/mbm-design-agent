// 편집 고도화·가이드 검수(10-14) — 앱의 작업 화면(app.js)에 붙는 세 가지.
//   ① 프리셋: 키비주얼 위치·크기·글자 정렬·배경(채움·그라데이션·스크림). 캠페인 일괄 + 산출물 개별(「공통 따름」), 컨트롤마다 「자동: …」
//   ② 직접 수정: 고른 산출물 미리보기 위 손잡이(키비주얼·글자 덩어리·로고) — 끌어 옮기기, 모서리로 크기, 화살표 1px·Shift 10px, +/− 크기, Esc 해제.
//      값은 a.overrides.layout(캔버스 몫 단위). 안전영역 밖이면 빨간 테두리, 놓으면 안쪽으로. 「같은 모양 규격에도 적용」·「자동으로 되돌리기」
//   ③ 가이드 검수: 그릴 때마다 iframe 에서 실측(core/guidemeasure.js) → 판정(core/guidecheck.js) → 카드 배지 「가이드 ✓41 · ✗2」, 인스펙터 「가이드 검수」.
//      ✗ 는 승인을 막지 않는다(막는 건 매체 규정 위반뿐). 「규칙대로 고치기」 = 그 규칙에 닿는 편집을 이 산출물에서 지움 · 「의도한 것, 넘기기」 = 이유를 남김
// 계산(경계·옮기기·되돌리기)은 core/editlayout.js 의 순수 함수.

import { PRESETS, PRESET_KEYS, placeAvail, sizeAvail, bgAvail, autoLabel, MODE_LABEL, traceOfHtml, normLayout, applyBox, invertBox, anchorOf, outOfBounds, snapDelta, clampScale, sameShapeTargets, propagateLayout, shapeName, editsTouching, fixOverrides } from '../core/editlayout.js';
import { RULES as GUIDE_RULES, HUMAN_RULES, rulesetOf, guideContext, evaluate as guideEvaluate, guideSummary } from '../core/guidecheck.js';
import { RULES_DATA } from '../core/rules-data.js';
import { kvGrid, measureGuideDoc } from '../core/guidemeasure.js';
import { guideFor } from '../core/canon.js';
import { shapeOf } from '../core/layouts.js';
import { kvTypeOf } from '../core/kvtypes.js';
import { renderArtifact } from '../core/contract.js';
import { ALIGN_CHOICES, alignLockOf, lockedSummary } from '../core/alignrule.js';

// 직접 수정(끌어 옮기기) 손잡이·섹션은 숨긴다(10-19 사용자 「텍스트 이동하는 기능은 빼도 되는데 정렬만 바꿀 수 있게」) — 데이터(overrides.layout)·렌더 훅은 남겨 기존 캠페인이 깨지지 않게
const MANUAL_EDIT_UI = false;

const RULESET = rulesetOf(RULES_DATA);
export const GUIDE_RULE_COUNT = GUIDE_RULES.length, GUIDE_HUMAN_COUNT = HUMAN_RULES.length;
const PART_LABEL = { kv: '키비주얼', text: '글자 덩어리', logo: '로고' };
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SHORT = { bgFill: { kv: 'KV 이어 칠하기' } };   // 좁은 인스펙터에서 줄임 — 전체 이름은 title
const label = (k, v) => SHORT[k]?.[v] ?? PRESETS[k].choices[v];

export function createEditor(E) {
  // E: { state, SPECS, frames, pushHistory, regen, refreshFrames, autosave, renderInspector, log, toast, select, artLabel, adEffCtx, logEvent }
  const S = E.state;
  const camp = () => S.campaign;
  const effStyleOf = a => { const c = camp(); return a.overrides?.style && Object.keys(a.overrides.style).length ? { ...c.style, ...a.overrides.style } : c.style; };
  const specOf = a => E.SPECS[a.specId];
  const ads = () => (camp()?.artifacts ?? []).filter(a => a.channel === 'ad');
  const keyOf = a => a.key ?? a.specId;

  /* ── 자동(프리셋 없이) 그렸으면 무엇이었나 — 「자동: 오른쪽 열」 ── */
  const stripEdits = st => { const s = { ...st }; for (const k of PRESET_KEYS) delete s[k]; delete s.manualLayout; s.kvUse = 'auto'; s.background = { ...(s.background ?? {}), mode: 'auto', color: null }; return s; };
  const autoCache = new Map();
  function autoTrace(a) {
    const st = stripEdits(effStyleOf(a));
    const sig = `${keyOf(a)}|${camp().context?.version}|${JSON.stringify(a.overrides?.core ?? {})}|${a.variant ?? 0}|${st.palette?.primary}|${st.keyVisual?.length}|${st.kvTypeOverride}|${st.chipTone}|${st.fonts?.heading}|${st.logo?.length}`;
    if (autoCache.has(sig)) return autoCache.get(sig);
    let t = null;
    try { t = traceOfHtml(renderArtifact(a.specId, E.adEffCtx(a), st, { variant: a.variant ?? 0, purpose: a.purpose, arrow: a.arrow, size: a.size })); } catch {}
    autoCache.set(sig, t); return t;
  }
  const availOf = (key, a, v, t) => {
    const spec = specOf(a), ctx = { gate: t?.gate ?? {}, mode: t?.place?.mode, objectBox: !!spec.rules?.objectBox, cutout: t?.kv?.type === 'cutout' && !(t?.kv?.flags ?? []).includes('frame') };
    if (key === 'kvPlace') return placeAvail(spec, v, ctx);
    if (key === 'kvSize') return sizeAvail(spec, v, ctx);
    if (key === 'bgFill' || key === 'bgGrad') return key === 'bgFill' ? bgAvail(spec, v, ctx) : (['bg-room', 'bg-texture', 'full'].includes(ctx.mode) && v !== 'auto' ? { ok: false, why: '그림이 곧 지면' } : { ok: true });
    if (key === 'scrim') return (ctx.gate.transparent && v !== 'auto') ? { ok: false, why: '투명 배경 규격' } : { ok: true };
    if (key === 'textAlign') { const L = alignLockOf(spec); return (v !== 'auto' && L.locked) ? { ok: false, why: L.why } : { ok: true }; }   // 정렬 잠금(10-19 core/alignrule.js)
    return { ok: true };
  };
  // 예전 값(kvUse·background.mode·background.color)을 프리셋 화면에 보이는 값으로
  const shownValue = (st, k) => {
    if (st[k]) return st[k];
    if (k === 'kvPlace' && st.kvUse === 'full') return 'bg';
    if (k === 'bgGrad') return st.background?.mode === 'solid' ? 'none' : st.background?.mode === 'gradient' ? 'v' : 'auto';
    if (k === 'bgFill' && st.background?.color) return 'custom';
    return 'auto';
  };

  /* ── ① 프리셋 — 캠페인 일괄 ── */
  function presetCampaignHtml() {
    const c = camp(); const list = ads();
    if (!list.length) return '';
    const traces = list.map(a => ({ a, t: autoTrace(a) }));
    const dist = k => { const m = new Map(); for (const { t } of traces) { const l = autoLabel(k, t); if (l) m.set(l, (m.get(l) ?? 0) + 1); } return [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([l, n]) => `${l} ${n}`).join(' · '); };
    const ctl = k => {
      const cur = shownValue(c.style, k);
      const blocked = v => v === 'auto' ? [] : traces.filter(({ a, t }) => !availOf(k, a, v, t).ok);
      const notes = cur !== 'auto' ? blocked(cur) : [];
      const why = notes.length ? [...notes.reduce((m, { a, t }) => { const r = availOf(k, a, cur, t).why; m.set(r, (m.get(r) ?? 0) + 1); return m; }, new Map())].map(([r, n]) => `${r} ${n}`).join(' · ') : '';
      return `<div class="pctl" role="group" aria-labelledby="pl-${k}"><div class="plab" id="pl-${k}">${PRESETS[k].label} <span class="pauto">자동: ${escH(dist(k) || '—')}</span></div>
        <div class="pseg">${Object.keys(PRESETS[k].choices).map(v => { const b = blocked(v).length; return `<button data-pk="${k}" data-pv="${v}" class="${cur === v ? 'on' : ''}" aria-pressed="${cur === v}" title="${escH(PRESETS[k].choices[v])}${b ? (k === 'textAlign' ? ` — ${b}개 규격은 규정으로 잠김` : ` — ${b}개 규격은 매체 규정·형태 때문에 자동 유지`) : ''}">${escH(label(k, v))}${b && v !== 'auto' ? `<sup aria-label="${b}개 규격 적용 안 됨">${b}</sup>` : ''}</button>`; }).join('')}</div>
        ${k === 'bgFill' ? `<div class="bgrow" style="margin-top:6px"><label class="bgpick"><input type="color" id="pBgColor" value="${escH(c.style.background?.color ?? c.style.palette?.primary ?? '#2456D6')}" aria-label="배경 직접 색">직접 색 고르기</label></div>` : ''}
        ${why ? `<div class="pwhy">적용 안 됨(자동 유지): ${escH(why)}</div>` : ''}</div>`;
    };
    return `<section class="isec" id="inspPreset"><h3>배치 · 배경 <span class="mode">전 규격</span></h3>
      <div class="hint">고르면 전 규격에 적용 — 매체 템플릿 칸·오브젝트 상자·투명 지면처럼 매체 규정이 정한 자리는 자동 그대로입니다. 산출물을 고르면 개별로 바꿀 수 있어요.</div>
      ${PRESET_KEYS.map(ctl).join('')}</section>`;
  }
  function bindPresetCampaign(insp, restyle) {
    const c = camp();
    insp.querySelectorAll('#inspPreset [data-pk]').forEach(b => b.onclick = () => {
      const k = b.dataset.pk, v = b.dataset.pv;
      if (shownValue(c.style, k) === v && v !== 'custom') return;
      const patch = { [k]: v };
      if (k === 'kvPlace') patch.kvUse = 'auto';                                     // 예전 「사진 쓰임」은 위치 프리셋이 맡는다
      if (k === 'bgGrad') patch.background = { ...c.style.background, mode: 'auto' };
      if (k === 'bgFill') patch.background = { ...c.style.background, color: v === 'custom' ? (c.style.background?.color ?? c.style.palette?.primary ?? null) : null };
      restyle(patch, `${PRESETS[k].label} ${PRESETS[k].choices[v]}`);
      E.renderInspector();
      insp.querySelector(`#inspPreset [data-pk="${k}"][data-pv="${v}"]`)?.focus();
    });
    const pc = insp.querySelector('#pBgColor');
    if (pc) pc.onchange = () => { restyle({ bgFill: 'custom', background: { ...c.style.background, color: pc.value.toUpperCase() } }, '배경 직접 색'); E.renderInspector(); };
  }

  /* ── ① 프리셋 — 산출물 개별(공통 따름 + 선택지) ── */
  function presetArtifactHtml(a) {
    const c = camp(); const t = autoTrace(a), now = traceOfHtml(a.html);
    const ov = a.overrides?.style ?? {};
    const ctl = k => {
      const own = ov[k] ?? null;
      const camp0 = shownValue(c.style, k);
      const opts = Object.keys(PRESETS[k].choices);
      const dis = opts.map(v => [v, availOf(k, a, v, t)]).filter(([, r]) => !r.ok);
      const applied = now?.edit?.presets?.[k];
      const note = (k === 'kvPlace' && now?.edit?.place && !now.edit.place.ok) ? `지금 값 「${PRESETS.kvPlace.choices[now.edit.place.want]}」은 이 규격에서 안 됨 — ${now.edit.place.why ?? ''}` : '';
      return `<div class="pctl" role="group" aria-labelledby="pa-${k}"><div class="plab" id="pa-${k}">${PRESETS[k].label} <span class="pauto">자동: ${escH(autoLabel(k, t) || '—')}${camp0 !== 'auto' ? ` · 공통: ${escH(label(k, camp0))}` : ''}</span></div>
        <div class="pseg"><button data-ak="${k}" data-av="" class="${!own ? 'on' : ''}" aria-pressed="${!own}">공통 따름</button>${opts.map(v => { const d = dis.find(([x]) => x === v); return `<button data-ak="${k}" data-av="${v}" class="${own === v ? 'on' : ''}" aria-pressed="${own === v}"${d ? ` disabled aria-disabled="true" title="${escH(d[1].why)}"` : ` title="${escH(PRESETS[k].choices[v])}"`}>${escH(label(k, v))}</button>`; }).join('')}</div>
        ${dis.length ? `<div class="pwhy">못 고름: ${dis.map(([v, r]) => `${escH(label(k, v))} — ${escH(r.why)}`).join(' · ')}</div>` : ''}${note ? `<div class="pwhy warn">${escH(note)}</div>` : ''}${applied && !note ? '' : ''}</div>`;
    };
    return `<section class="isec" id="inspPresetA"><h3>배치 · 배경 <span class="mode">이 산출물만</span></h3>${PRESET_KEYS.map(ctl).join('')}</section>`;
  }
  function bindPresetArtifact(insp, a) {
    insp.querySelectorAll('#inspPresetA [data-ak]').forEach(b => b.onclick = () => {
      const k = b.dataset.ak, v = b.dataset.av || null;
      if ((a.overrides.style?.[k] ?? null) === v) return;
      E.pushHistory(`${E.artLabel(a)} ${PRESETS[k].label} 개별`);
      const st = { ...(a.overrides.style ?? {}) };
      if (v) st[k] = v; else delete st[k];
      if (k === 'bgFill') { if (v === 'custom') st.background = { ...(camp().style.background ?? {}), color: camp().style.background?.color ?? camp().style.palette?.primary }; else delete st.background; }
      a.overrides.style = st; a.status = 'draft';
      E.logEvent(camp(), 'manual_edit', { specId: a.specId, style: k });
      E.regen(); E.autosave(); E.refreshFrames(keyOf(a)); E.renderInspector();
      document.querySelector(`#inspPresetA [data-ak="${k}"][data-av="${v ?? ''}"]`)?.focus();
      E.log(`${a.specId} ${PRESETS[k].label} ${v ? PRESETS[k].choices[v] : '공통 따름'}`);
    });
  }

  /* ── ①-b 글자 정렬 세그먼트(10-19, 인스펙터 「스타일」) — 캠페인 일괄 + 산출물 개별. 잠긴 규격(규정 매체 틀·글자 없음)은 비활성 + 사유 한 줄(core/alignrule.js alignLockOf) ── */
  function alignCampaignHtml() {
    const c = camp(); const list = ads(); if (!list.length) return '';
    const cur = c.style.textAlign ?? 'auto';
    const lock = lockedSummary(list.map(a => specOf(a)).filter(Boolean));
    return `<label>글자 정렬 <span style="opacity:.6">· 키비주얼·로고 자리가 따라감</span></label>
      <div class="vseg" id="iAlignSeg" role="group" aria-label="글자 정렬">${Object.entries(ALIGN_CHOICES).map(([k, v]) => `<button data-al="${k}" class="${cur === k ? 'on' : ''}" aria-pressed="${cur === k}" title="${escH(v)}">${escH(v)}</button>`).join('')}</div>
      <div class="fontNote" style="font-size:11px;line-height:1.5;margin-top:4px;color:var(--sub)">왼쪽 → 키비주얼 오른쪽 · 오른쪽 → 왼쪽(거울) · 가운데 → 아래 띠${lock.n ? `<br>${lock.n}개 규격은 규정으로 잠김 — ${escH(lock.reasons.map(([r, n]) => `${r} ${n}`).join(' · '))}` : ''}</div>`;
  }
  function bindAlignCampaign(insp, restyle) {
    const c = camp();
    insp.querySelectorAll('#iAlignSeg [data-al]').forEach(b => b.onclick = () => {
      const v = b.dataset.al; if ((c.style.textAlign ?? 'auto') === v) return;
      restyle({ textAlign: v }, `글자 정렬 ${ALIGN_CHOICES[v]}`);
      E.renderInspector();
      document.querySelector(`#iAlignSeg [data-al="${v}"]`)?.focus();
    });
  }
  function alignArtifactHtml(a) {
    const c = camp(); const spec = specOf(a); if (!spec) return '';
    const L = alignLockOf(spec);
    const own = a.overrides?.style?.textAlign ?? null, camp0 = c.style.textAlign ?? 'auto';
    const t = autoTrace(a);
    if (L.locked) return `<label>글자 정렬</label><div style="font-size:11.5px;color:var(--sub);line-height:1.5">잠김 — ${escH(L.why)}</div>`;
    return `<label>글자 정렬 <span style="opacity:.6">공통: ${escH(ALIGN_CHOICES[camp0] ?? camp0)}${camp0 === 'auto' && autoLabel('textAlign', t) ? `(${escH(autoLabel('textAlign', t))})` : ''}</span></label>
      <div class="vseg" id="iAlignOv" role="group" aria-label="글자 정렬(이 산출물만)"><button data-alo="" class="${!own ? 'on' : ''}" aria-pressed="${!own}">공통 따름</button>${Object.entries(ALIGN_CHOICES).filter(([k]) => k !== 'auto').map(([k, v]) => `<button data-alo="${k}" class="${own === k ? 'on' : ''}" aria-pressed="${own === k}" title="${escH(v)}">${escH(v)}</button>`).join('')}</div>`;
  }
  function bindAlignArtifact(insp, a) {
    insp.querySelectorAll('#iAlignOv [data-alo]').forEach(b => b.onclick = () => {
      const v = b.dataset.alo || null;
      if ((a.overrides.style?.textAlign ?? null) === v) return;
      E.pushHistory(`${E.artLabel(a)} 글자 정렬 개별`);
      const st = { ...(a.overrides.style ?? {}) };
      if (v) st.textAlign = v; else delete st.textAlign;
      a.overrides.style = st; a.status = 'draft';
      E.logEvent(camp(), 'manual_edit', { specId: a.specId, style: 'textAlign' });
      E.regen(); E.autosave(); E.refreshFrames(keyOf(a)); E.renderInspector();
      document.querySelector(`#iAlignOv [data-alo="${v ?? ''}"]`)?.focus();
      E.log(`${a.specId} 글자 정렬 ${v ? ALIGN_CHOICES[v] : '공통 따름'}`);
    });
  }

  /* ── ② 직접 수정 ── */
  const frameOf = a => E.frames.get(keyOf(a));
  const rel = (el, base) => { const r = el.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }; };
  const union = rs => { const v = rs.filter(r => r && r.w > 0 && r.h > 0); if (!v.length) return null; const x0 = Math.min(...v.map(r => r.x)), y0 = Math.min(...v.map(r => r.y)), x1 = Math.max(...v.map(r => r.x + r.w)), y1 = Math.max(...v.map(r => r.y + r.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
  // 지금 그림에서 세 덩어리 상자(캔버스 px) — 못 옮기는 덩어리는 이유
  function partsOf(a) {
    const f = frameOf(a); const doc = f?.iframe?.contentDocument; const root = doc?.querySelector('[data-ad]');
    if (!root) return null;
    const base = root.getBoundingClientRect(); const out = { root, doc, why: {} };
    let tr = null; try { tr = JSON.parse(root.dataset.trace || 'null'); } catch {}
    out.trace = tr;
    const use = root.dataset.kvUse;
    const objs = [...root.querySelectorAll('[data-object]')].filter(el => !el.parentElement.closest('[data-object]'));
    if (tr?.gate?.template) out.why.kv = '매체 템플릿이 정한 그림 칸 — 매체 규정이 이깁니다';
    else if (specOf(a).rules?.objectBox) out.why.kv = '매체가 정한 오브젝트 상자 — 매체 규정이 이깁니다';
    else if (['bg', 'full'].includes(use)) out.why.kv = '그림이 지면 전체 — 위치 프리셋(오른쪽·아래)으로 바꾸면 옮길 수 있어요';
    else if (!objs.length) out.why.kv = '이 규격엔 키비주얼이 없음';
    else out.kv = { box: union(objs.map(el => rel(el, base))), els: objs, wrap: root.querySelector(':scope > [data-edit="kv"]') };
    const main = root.querySelector('[data-field="main"]');
    if (main) { let col = main; while (col.parentElement && col.parentElement !== root) col = col.parentElement; out.text = { box: union([...col.querySelectorAll('[data-field]')].map(el => rel(el, base))), el: col }; }
    else out.why.text = '글자 덩어리 없음';
    const slotWrap = root.querySelector(':scope > [data-edit="logo"]');
    const slot = (slotWrap ?? root).querySelector(':scope > [data-logo-slot]');
    if (tr?.logo?.template) out.why.logo = '매체 템플릿이 정한 로고 칸';
    else if (!slot) out.why.logo = root.querySelector('[data-logo]') ? '로고가 글자 덩어리 안 — 글자와 함께 움직임' : '로고 없음';
    else { const img = slot.querySelector('[data-logo]'); out.logo = { box: rel(img ?? slot, base), el: slot, wrap: slotWrap }; }
    return out;
  }
  let ov = null;   // { a, el, parts, drag }
  function hideOverlay() { ov?.el?.remove(); ov = null; }
  function showOverlay(a) {
    if (!MANUAL_EDIT_UI) { hideOverlay(); return; }   // 10-19: 끌어 옮기기 진입 숨김 — 정렬 프리셋으로 대신
    const keepFocus = ov?.a && keyOf(ov.a) === keyOf(a) ? document.activeElement?.dataset?.part ?? S.editFocus : S.editFocus;
    hideOverlay();
    if (!a || a.channel !== 'ad') return;
    const f = frameOf(a); const P = partsOf(a); if (!f || !P) return;
    const spec = specOf(a); const body = f.frame.querySelector('.fbody');
    const ds = body.clientWidth / spec.w;
    const el = document.createElement('div'); el.className = 'eov'; el.style.cssText = `width:${body.clientWidth}px;height:${body.clientHeight}px`;
    const L = normLayout(a.overrides?.layout) ?? {};
    // 겹치면 작은 상자가 위(나중) — 큰 키비주얼 상자가 글자·로고를 덮어 못 잡는 일이 없게. 이름표·크기 손잡이는 늘 맨 위(CSS z-index)
    const order = ['kv', 'text', 'logo'].filter(k => P[k]?.box).sort((x, y) => P[y].box.w * P[y].box.h - P[x].box.w * P[x].box.h);
    for (const part of order) {
      const p = P[part]; if (!p?.box) continue;
      const b = document.createElement('button');
      b.type = 'button'; b.className = `eh eh-${part}`; b.dataset.part = part;
      b.setAttribute('aria-label', `${PART_LABEL[part]} — 끌어 옮기기, 화살표 1px · Shift+화살표 10px${part !== 'text' ? ', +/− 크기' : ''}, Esc 선택 해제`);
      b.style.cssText = `left:${p.box.x * ds}px;top:${p.box.y * ds}px;width:${Math.max(14, p.box.w * ds)}px;height:${Math.max(14, p.box.h * ds)}px`;
      // 크기 손잡이는 크기 원점(붙어 있는 가장자리)에서 가장 먼 모서리에 — 원점 쪽 모서리를 잡으면 거리가 0 에 가까워 배율이 튄다
      let corner = 'br';
      if (part !== 'text') { const base = invertBox(p.box, L[part] ?? null, spec.w, spec.h); const an = L[part]?.ox != null ? { ox: L[part].ox, oy: L[part].oy } : anchorOf(base, spec.w, spec.h); const Ox = an.ox * spec.w, Oy = an.oy * spec.h; corner = `${Oy > p.box.y + p.box.h / 2 ? 't' : 'b'}${Ox > p.box.x + p.box.w / 2 ? 'l' : 'r'}`; }
      b.dataset.corner = corner;
      b.innerHTML = `<span class="ehl" aria-hidden="true">${PART_LABEL[part]}${L[part] ? ' · 수정됨' : ''}</span>${part !== 'text' ? `<span class="ehr ehr-${corner}" aria-hidden="true"></span>` : ''}`;
      el.appendChild(b);
      bindHandle(a, b, part, ds);
    }
    const live = document.createElement('div'); live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); live.id = 'eovLive'; el.appendChild(live);
    f.frame.appendChild(el);
    ov = { a, el, P, ds };
    if (keepFocus) el.querySelector(`.eh[data-part="${keepFocus}"]`)?.focus({ preventScroll: true });
  }
  const say = t => { const l = document.getElementById('eovLive'); if (l) l.textContent = t; };
  // 미리보기 iframe 안에 바로 입혀 본다(손을 떼면 다시 그린다)
  function livePreview(a, part, p) {
    const P = ov?.P; if (!P?.[part]) return;
    const spec = specOf(a), W = spec.w, H = spec.h;
    const t = p ? `translate(${p.dx * W}px,${p.dy * H}px) scale(${p.scale ?? 1})` : '';
    const O = p ? { x: (p.ox ?? 0.5) * W, y: (p.oy ?? 0.5) * H } : { x: 0, y: 0 };
    if (part === 'text') { P.text.el.style.left = p ? `${p.dx * W}px` : ''; P.text.el.style.top = p ? `${p.dy * H}px` : ''; return; }
    const wrap = P[part].wrap;
    if (wrap) { wrap.style.transformOrigin = `${O.x}px ${O.y}px`; wrap.style.transform = t; return; }
    const els = part === 'kv' ? P.kv.els : [P.logo.el];
    const base = P.root.getBoundingClientRect();
    for (const e of els) { e.style.transform = ''; const r = rel(e, base); e.style.transformOrigin = `${O.x - r.x}px ${O.y - r.y}px`; e.style.transform = t; }
  }
  function placeHandle(b, box, ds, bad) {
    b.style.left = `${box.x * ds}px`; b.style.top = `${box.y * ds}px`; b.style.width = `${Math.max(14, box.w * ds)}px`; b.style.height = `${Math.max(14, box.h * ds)}px`;
    b.classList.toggle('oob', !!bad);
  }
  function bindHandle(a, b, part, ds) {
    const spec = specOf(a);
    const start = () => {
      const cur = normLayout(a.overrides?.layout)?.[part] ?? null;
      const box = ov.P[part].box;
      const base = invertBox(box, cur, spec.w, spec.h);
      return { cur, box, base, anchor: cur?.ox != null ? { ox: cur.ox, oy: cur.oy } : anchorOf(base, spec.w, spec.h) };
    };
    const totalOf = (st, dxPx, dyPx, k) => {
      const c0 = st.cur ?? { dx: 0, dy: 0, scale: 1 };
      const p = { dx: (c0.dx ?? 0) + dxPx / spec.w, dy: (c0.dy ?? 0) + dyPx / spec.h };
      if (part !== 'text') { p.scale = clampScale((c0.scale ?? 1) * k); p.ox = st.anchor.ox; p.oy = st.anchor.oy; }
      return p;
    };
    const check = (st, p) => { const nb = applyBox(st.base, p, spec.w, spec.h); return { nb, bad: outOfBounds(part, nb, spec, p.scale ?? 1, part === 'kv' ? null : st.base) }; };
    const finish = (st, p, label, coalesce = false) => {
      let { nb, bad } = check(st, p);
      if (bad) {
        if (part !== 'text') p.scale = clampScale(p.scale ?? 1);
        nb = applyBox(st.base, p, spec.w, spec.h);
        const d = snapDelta(part, nb, spec, part === 'kv' ? null : st.base);
        p.dx += d.ddx / spec.w; p.dy += d.ddy / spec.h;
        say(`${PART_LABEL[part]}: 안전영역 밖 — 안쪽으로 되돌렸어요`);
      }
      commit(a, part, p, label, coalesce, bad);
    };
    b.addEventListener('pointerdown', e => {
      e.stopPropagation(); e.preventDefault();
      if (e.button !== 0) return;
      b.focus({ preventScroll: true }); S.editFocus = part;
      const resize = e.target.classList.contains('ehr');
      const st = start(); const z = S.zoom * ds;
      const x0 = e.clientX, y0 = e.clientY;
      const O = { x: st.anchor.ox * spec.w, y: st.anchor.oy * spec.h };
      // 배율 손잡이: 원점에서 포인터까지 거리 비(시작 대비)
      const cn = b.dataset.corner ?? 'br';
      const cx = st.box.x + (cn[1] === 'r' ? st.box.w : 0), cy = st.box.y + (cn[0] === 'b' ? st.box.h : 0);
      const d0 = Math.hypot(cx - O.x, cy - O.y) || 1;
      let last = null;
      try { b.setPointerCapture(e.pointerId); } catch {}
      b.classList.add('drag');
      const move = ev => {
        const dx = (ev.clientX - x0) / z, dy = (ev.clientY - y0) / z;
        const p = resize ? totalOf(st, 0, 0, Math.hypot(cx + dx - O.x, cy + dy - O.y) / d0) : totalOf(st, dx, dy, 1);
        last = p;
        const { nb, bad } = check(st, p);
        placeHandle(b, nb, ds, bad);
        livePreview(a, part, p);
        if (bad) say(`${PART_LABEL[part]}: 안전영역 밖 — 놓으면 안쪽으로 되돌아갑니다`);
      };
      const up = () => {
        b.removeEventListener('pointermove', move); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up);
        b.classList.remove('drag');
        if (!last) return;
        finish(st, last, resize ? `${E.artLabel(a)} ${PART_LABEL[part]} 크기` : `${E.artLabel(a)} ${PART_LABEL[part]} 옮김`);
      };
      b.addEventListener('pointermove', move); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    });
    b.addEventListener('keydown', e => {
      const step = e.shiftKey ? 10 : 1;
      const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      const sc = part !== 'text' ? ({ '+': 1.02, '=': 1.02, '-': 1 / 1.02, '_': 1 / 1.02 }[e.key] ?? null) : null;
      if (e.key === 'Escape') { e.preventDefault(); S.editFocus = null; E.select(null); return; }
      if (!mv && !sc) return;
      e.preventDefault(); e.stopPropagation();
      S.editFocus = part;
      const st = start();
      const p = mv ? totalOf(st, mv[0], mv[1], 1) : totalOf(st, 0, 0, sc);
      finish(st, p, `${E.artLabel(a)} ${PART_LABEL[part]} ${mv ? '미세 이동' : '크기'}`, true);
    });
    b.addEventListener('click', e => e.stopPropagation());
  }
  function commit(a, part, p, label, coalesce = false, snapped = false) {
    E.pushHistory(label, coalesce);
    const L = { ...(normLayout(a.overrides?.layout) ?? {}), [part]: p };
    const n = normLayout(L);
    if (n) a.overrides.layout = n; else delete a.overrides.layout;
    a.status = 'draft';
    E.logEvent(camp(), 'manual_edit', { specId: a.specId, layout: part });
    E.regen(); E.autosave(); E.refreshFrames(keyOf(a));
    renderEditState(a);
    E.log(`${a.specId} 직접 수정 — ${PART_LABEL[part]}${snapped ? ' (안전영역 안으로 맞춤)' : ''}`);
  }
  function revertLayout(a) {
    if (!normLayout(a.overrides?.layout)) return;
    E.pushHistory(`${E.artLabel(a)} 자동으로 되돌리기`);
    delete a.overrides.layout; a.status = 'draft';
    E.logEvent(camp(), 'manual_edit', { specId: a.specId, layout: 'revert' });
    E.regen(); E.autosave(); E.refreshFrames(keyOf(a)); E.renderInspector();
    E.toast('직접 수정을 지우고 자동 배치로 되돌렸어요');
  }
  // 같은 모양 규격에도 — 몫 단위 이동·배율을 그대로, 크기 원점은 대상 그림에서 다시. 그린 뒤 안전영역 밖이면 한 번 안쪽으로(pendingSnap)
  function propagate(a) {
    const src = normLayout(a.overrides?.layout); if (!src) return;
    const items = ads().map(x => ({ key: keyOf(x), spec: specOf(x), a: x }));
    const targets = sameShapeTargets({ key: keyOf(a), spec: specOf(a) }, items);
    if (!targets.length) { E.toast(`같은 모양(${shapeName(specOf(a))}) 규격이 이 캠페인에 없어요`); return; }
    E.pushHistory(`${E.artLabel(a)} 직접 수정 → ${shapeName(specOf(a))} ${targets.length}개`);
    for (const t of targets) {
      const P = partsOf(t.a); const own = normLayout(t.a.overrides?.layout) ?? {};
      const baseBoxes = { kv: P?.kv?.box ? invertBox(P.kv.box, own.kv, t.spec.w, t.spec.h) : null, logo: P?.logo?.box ? invertBox(P.logo.box, own.logo, t.spec.w, t.spec.h) : null };
      const L = propagateLayout(src, t.spec, baseBoxes);
      // 대상에서 못 옮기는 덩어리(그림이 지면 전체·템플릿 로고 칸)는 뺀다
      for (const part of Object.keys(L ?? {})) if (P && !P[part]) delete L[part];
      if (L && Object.keys(L).length) { t.a.overrides.layout = L; t.a.status = 'draft'; t.a.pendingSnap = true; }
    }
    E.logEvent(camp(), 'manual_edit', { specId: a.specId, layout: 'propagate', n: targets.length });
    E.regen(); E.autosave(); E.refreshFrames();
    E.toast(`${shapeName(specOf(a))} ${targets.length}개 규격에 적용 — 안전영역 밖이면 안쪽으로 맞춥니다`);
    E.log(`직접 수정 같은 모양 적용: ${targets.map(t => t.a.specId).join(', ')}`);
  }
  // 옮긴 뒤 처음 그려졌을 때 — 덩어리가 안전영역 밖이면 안쪽으로(한 번만)
  function enforceBounds(a) {
    if (!a.pendingSnap) return false;
    a.pendingSnap = false;
    const P = partsOf(a); const spec = specOf(a); const L = normLayout(a.overrides?.layout); if (!P || !L) return false;
    let changed = false; const next = { ...L };
    for (const part of Object.keys(L)) {
      const p = { ...L[part] }; const box = P[part]?.box; if (!box) continue;
      const base = invertBox(box, p, spec.w, spec.h);
      if (!outOfBounds(part, box, spec, p.scale ?? 1, part === 'kv' ? null : base)) continue;
      if (part !== 'text') p.scale = clampScale(p.scale ?? 1);
      const d = snapDelta(part, applyBox(base, p, spec.w, spec.h), spec, part === 'kv' ? null : base);
      p.dx += d.ddx / spec.w; p.dy += d.ddy / spec.h; next[part] = p; changed = true;
    }
    if (!changed) return false;
    a.overrides.layout = normLayout(next);
    E.regen(); E.refreshFrames(keyOf(a)); E.autosave();
    E.log(`${a.specId} 같은 모양 적용 — 안전영역 밖이라 안쪽으로 맞춤`);
    return true;
  }
  const fmtPart = (k, p) => `${PART_LABEL[k]} ${p.dx || p.dy ? `→ ${Math.round(p.dx * 1000) / 10}% · ${Math.round(p.dy * 1000) / 10}%` : ''}${p.scale && p.scale !== 1 ? ` ×${p.scale}` : ''}`;
  function editStateHtml(a) {
    const L = normLayout(a.overrides?.layout);
    return L ? `<div class="estate">직접 수정됨 — ${Object.entries(L).map(([k, p]) => escH(fmtPart(k, p))).join(' · ')}</div>` : '<div class="estate none">직접 수정 없음 — 자동 배치 그대로</div>';
  }
  function renderEditState(a) { const box = document.getElementById('editState'); if (box && S.selected === keyOf(a)) box.innerHTML = editStateHtml(a); const r = document.getElementById('iEditRevert'), p = document.getElementById('iEditProp'); const has = !!normLayout(a.overrides?.layout); if (r) r.disabled = !has; if (p) p.disabled = !has; }
  function editSectionHtml(a) {
    if (!MANUAL_EDIT_UI) return '';   // 10-19: 직접 수정 섹션 숨김
    const P = partsOf(a); const n = ads().filter(x => x !== a && shapeOf(specOf(x).w, specOf(x).h) === shapeOf(specOf(a).w, specOf(a).h)).length;
    const why = P ? Object.entries(P.why).map(([k, w]) => `<li>${PART_LABEL[k]}: ${escH(w)}</li>`).join('') : '';
    const has = !!normLayout(a.overrides?.layout);
    return `<section class="isec" id="inspEdit"><h3>직접 수정 <span class="mode">이 산출물만</span></h3>
      <div class="hint">미리보기의 상자를 끌어 옮기고, 오른쪽 아래 모서리로 크기를 바꿉니다. 상자를 Tab 으로 고른 뒤 화살표 1px · Shift+화살표 10px · +/− 크기 · Esc 해제. 안전영역 밖이면 빨간 테두리, 놓으면 안쪽으로 돌아옵니다.</div>
      <div id="editState">${editStateHtml(a)}</div>
      ${why ? `<ul class="pwhy" style="padding-left:16px;margin:6px 0 0">${why}</ul>` : ''}
      <div class="row" style="margin-top:8px"><button class="btn" id="iEditRevert"${has ? '' : ' disabled'}>자동으로 되돌리기</button><button class="btn" id="iEditProp"${has && n ? '' : ' disabled'} title="몫 단위 이동·배율을 같은 모양(${escH(shapeName(specOf(a)))}) 규격 ${n}개에 — 각 규격 안전영역 안으로 맞춤">같은 모양 규격에도 적용${n ? ` (${n})` : ''}</button></div></section>`;
  }
  function bindEditSection(insp, a) {
    insp.querySelector('#iEditRevert')?.addEventListener('click', () => revertLayout(a));
    insp.querySelector('#iEditProp')?.addEventListener('click', () => propagate(a));
  }

  /* ── ③ 가이드 검수 ── */
  const grids = new Map();
  const gridOf = url => { if (!url) return Promise.resolve(null); if (!grids.has(url)) grids.set(url, kvGrid(url)); return grids.get(url); };
  let queue = Promise.resolve();
  function guideCheck(a) {
    queue = queue.then(() => runGuide(a)).catch(() => {});
    return queue;
  }
  async function runGuide(a) {
    const c = camp(); if (!c || a.channel !== 'ad') return;
    const f = frameOf(a); const doc = f?.iframe?.contentDocument; const root = doc?.querySelector('[data-ad]'); if (!root) return;
    const html = a.html;
    try { await doc.fonts?.ready; } catch {}
    const st = effStyleOf(a);
    const objectVisual = root.dataset.visual === 'object';
    const meta = objectVisual ? st.objectMeta : st.kvMeta;
    const G = await gridOf(objectVisual ? st.object : st.keyVisual);
    if (a.html !== html || !doc.querySelector('[data-ad]')) return;   // 그 사이 다시 그려졌다
    const m = measureGuideDoc(doc, { kvMeta: meta ?? null, G });
    if (m.error) { a.guide = { error: m.error, rows: [] }; guideBadge(a); return; }
    const spec = specOf(a);
    const ctx = E.adEffCtx(a);
    const C = guideContext({ spec, trace: m.trace, m, meta: meta ?? null, kt: kvTypeOf(meta), guide: guideFor(spec.mediumRules ?? {}), shape: shapeOf(spec.w, spec.h), logoMeta: st.logoMeta ?? null, primary: st.palette?.primary ?? null, kind: c.kind ?? 'recruit', hasDate: !!(ctx.core?.deadline || ctx.core?.date) });
    const rows = guideEvaluate(C, RULESET);
    a.guide = { rows, at: Date.now() };
    guideBadge(a);
    if (S.selected === keyOf(a)) { const box = document.getElementById('inspGuide'); if (box) { box.outerHTML = guideSectionHtml(a); bindGuideSection(document.getElementById('inspector'), a); } }
  }
  const sumOf = a => a.guide?.rows ? guideSummary(a.guide.rows, a.guideSkips ?? {}) : null;
  function guideBadge(a) {
    const f = frameOf(a); if (!f?.guide) return;
    if (a.channel !== 'ad') { f.guide.style.display = 'none'; return; }
    const s = sumOf(a);
    f.guide.style.display = '';
    if (!s) { f.guide.className = 'badge guide'; f.guide.textContent = a.guide?.error ? '가이드 측정 실패' : '가이드 검수 중…'; f.guide.title = a.guide?.error ?? ''; return; }
    f.guide.className = `badge guide ${s.fail ? 'warn' : 'pass'}`;
    f.guide.textContent = `가이드 ✓${s.pass} · ✗${s.fail}${s.skipped ? ` · 넘김 ${s.skipped}` : ''}`;
    f.guide.title = (a.guide.rows.filter(r => r.ok === false).map(r => `${a.guideSkips?.[r.id] ? '(넘김) ' : ''}${r.name}: 가이드 ${r.expect} → 지금 ${r.actual}`).join('\n')) || '가이드 규칙 모두 맞음';
  }
  function editedBadge(a) {
    const f = frameOf(a); if (!f?.edited) return;
    const on = !!normLayout(a.overrides?.layout);
    f.edited.style.display = on ? '' : 'none';
    f.edited.textContent = on ? '직접 수정됨' : '';
    f.edited.title = on ? Object.entries(normLayout(a.overrides.layout)).map(([k, p]) => fmtPart(k, p)).join('\n') : '';
  }
  function guideSectionHtml(a) {
    if (a.channel !== 'ad') return '';
    const rows = a.guide?.rows ?? null; const s = sumOf(a);
    if (!rows) return `<section class="isec" id="inspGuide"><h3>가이드 검수</h3><div class="hint">${a.guide?.error ? `측정 실패: ${escH(a.guide.error).slice(0, 120)}` : '미리보기를 재는 중…'}</div></section>`;
    const skips = a.guideSkips ?? {}, human = a.guideHuman ?? {};
    const eff = effStyleOf(a);
    const fails = rows.filter(r => r.ok === false && !skips[r.id]);
    const skipped = rows.filter(r => r.ok === false && skips[r.id]);
    const passes = rows.filter(r => r.ok === true);
    const humans = rows.filter(r => r.id.startsWith('human.'));
    const failLi = r => {
      const t = editsTouching(r.id, eff, a.overrides?.layout);
      const keys = t.map(k => k.startsWith('layout.') ? `직접 수정(${PART_LABEL[k.slice(7)]})` : PRESETS[k]?.label ?? k);
      return `<li class="gf" data-rid="${escH(r.id)}"><div class="gname">${escH(r.name)}${r.level === 'warn' ? ' <span class="gtag">권장</span>' : ''}</div>
        <div class="gline">가이드 ${escH(r.expect)} → 지금 <b>${escH(r.actual)}</b></div>${r.note ? `<div class="gnote">${escH(r.note)}</div>` : ''}
        <div class="grow"><button class="btn sm" data-gfix="${escH(r.id)}"${t.length ? '' : ' disabled aria-disabled="true"'} title="${t.length ? `이 산출물의 ${escH(keys.join('·'))} 편집을 지우고 다시 그립니다` : '이 산출물에 걸린 편집이 없어요 — 자동 렌더도 ✗(규칙 쪽 과제)'}">규칙대로 고치기</button><button class="btn sm" data-gskip="${escH(r.id)}" aria-expanded="false" aria-controls="gs-${escH(r.id)}">의도한 것, 넘기기</button></div>
        ${t.length ? `<div class="gnote">지울 편집: ${escH(keys.join(' · '))}</div>` : '<div class="gnote">걸린 편집 없음 — 자동 렌더의 ✗(규칙장부 과제)</div>'}
        <form class="gskipf" id="gs-${escH(r.id)}" hidden><input type="text" maxlength="80" aria-label="넘기는 이유" placeholder="이유 — 예: 브랜드 요청으로 키비주얼 크게"><button class="btn sm pri" type="submit">넘기기</button><div class="gerr" role="alert"></div></form></li>`;
    };
    return `<section class="isec" id="inspGuide"><h3>가이드 검수 <span class="mode ${s.fail ? 'warn' : ''}">✓${s.pass} · ✗${s.fail}${s.skipped ? ` · 넘김 ${s.skipped}` : ''}</span></h3>
      <div class="hint">디자인 가이드 규칙 ${GUIDE_RULE_COUNT}개 중 이 규격에 해당하는 ${s.checked + rows.filter(r => r.ok === null && !r.id.startsWith('human.')).length}개를 미리보기 실측과 견줍니다(문장은 규칙장부). ✗ 는 경고일 뿐 승인을 막지 않습니다 — 막는 건 매체 규정(규격 검사) 위반뿐.</div>
      ${fails.length ? `<ul class="glist">${fails.map(failLi).join('')}</ul>` : `<div class="gok">${skipped.length ? '넘기지 않은 ✗ 없음' : '✗ 없음 — 측정되는 가이드 규칙이 모두 맞아요'}</div>`}
      ${skipped.length ? `<ul class="glist">${skipped.map(r => `<li class="gf skipped"><div class="gname">${escH(r.name)} <span class="gtag">넘김</span></div><div class="gline">가이드 ${escH(r.expect)} → 지금 ${escH(r.actual)}</div><div class="gnote">이유: ${escH(skips[r.id].reason)}</div><button class="lnk" data-gunskip="${escH(r.id)}">다시 보기</button></li>`).join('')}</ul>` : ''}
      <details class="gdet"><summary>✓ 맞음 ${passes.length}</summary><ul class="gok-list">${passes.map(r => `<li>${escH(r.name)} <span>— ${escH(r.actual)}</span></li>`).join('')}</ul></details>
      <details class="gdet"${humans.some(h => !human[h.id]) ? '' : ''}><summary>눈으로 확인 ${humans.filter(h => human[h.id]).length}/${humans.length}</summary><div class="ghuman">${humans.map(h => `<label><input type="checkbox" data-ghum="${escH(h.id)}"${human[h.id] ? ' checked' : ''}> <span><b>${escH(h.name)}</b> — ${escH(h.text)}</span></label>`).join('')}</div></details>
    </section>`;
  }
  function bindGuideSection(insp, a) {
    const sec = insp?.querySelector('#inspGuide'); if (!sec) return;
    sec.querySelectorAll('[data-gfix]').forEach(b => b.onclick = () => {
      const id = b.dataset.gfix; const r = a.guide?.rows?.find(x => x.id === id);
      const { overrides, touched } = fixOverrides(id, a.overrides, camp().style);
      if (!touched.length) return;
      E.pushHistory(`${E.artLabel(a)} 규칙대로 고치기 — ${r?.name ?? id}`);
      a.overrides = overrides; a.status = 'draft';
      E.logEvent(camp(), 'manual_edit', { specId: a.specId, guideFix: id, touched });
      E.regen(); E.autosave(); E.refreshFrames(keyOf(a)); E.renderInspector();
      E.toast(`${r?.name ?? id}: ${touched.map(k => k.startsWith('layout.') ? '직접 수정' : PRESETS[k]?.label ?? k).join('·')} 편집을 이 산출물에서 되돌림`);
      E.log(`${a.specId} 규칙대로 고치기 ${id} (${touched.join(', ')})`);
    });
    sec.querySelectorAll('[data-gskip]').forEach(b => b.onclick = () => {
      const f = sec.querySelector(`#gs-${CSS.escape(b.dataset.gskip)}`); if (!f) return;
      f.hidden = !f.hidden; b.setAttribute('aria-expanded', String(!f.hidden));
      if (!f.hidden) f.querySelector('input').focus();
    });
    sec.querySelectorAll('form.gskipf').forEach(f => {
      const inp = f.querySelector('input'), err = f.querySelector('.gerr');
      // 이유는 비우지 않는다 — 칸을 떠날 때·제출할 때 칸 옆에서 알려 준다(ux-patterns.md > 폼 인라인 검증)
      const valid = () => { const ok = inp.value.trim().length >= 2; inp.setAttribute('aria-invalid', String(!ok)); err.textContent = ok ? '' : '넘기는 이유를 두 글자 이상 적어 주세요'; return ok; };
      inp.addEventListener('blur', () => { if (inp.value) valid(); });
      f.onsubmit = e => {
        e.preventDefault(); if (!valid()) { inp.focus(); return; }
        const id = f.id.slice(3);
        E.pushHistory(`${E.artLabel(a)} 가이드 넘김 — ${id}`);
        a.guideSkips = { ...(a.guideSkips ?? {}), [id]: { reason: inp.value.trim(), at: Date.now() } };
        E.logEvent(camp(), 'manual_edit', { specId: a.specId, guideSkip: id });
        E.autosave(); guideBadge(a);
        sec.outerHTML = guideSectionHtml(a); bindGuideSection(document.getElementById('inspector'), a);
        E.log(`${a.specId} 가이드 넘김 ${id}: ${inp.value.trim()}`);
      };
    });
    sec.querySelectorAll('[data-gunskip]').forEach(b => b.onclick = () => {
      E.pushHistory(`${E.artLabel(a)} 가이드 넘김 취소`);
      const s0 = { ...(a.guideSkips ?? {}) }; delete s0[b.dataset.gunskip]; a.guideSkips = s0;
      E.autosave(); guideBadge(a);
      sec.outerHTML = guideSectionHtml(a); bindGuideSection(document.getElementById('inspector'), a);
    });
    sec.querySelectorAll('[data-ghum]').forEach(cb => cb.onchange = () => {
      a.guideHuman = { ...(a.guideHuman ?? {}), [cb.dataset.ghum]: cb.checked };
      if (!cb.checked) delete a.guideHuman[cb.dataset.ghum];
      E.autosave();
      const sm = cb.closest('details').querySelector('summary'); const all = sec.querySelectorAll('[data-ghum]');
      sm.textContent = `눈으로 확인 ${[...all].filter(x => x.checked).length}/${all.length}`;
    });
  }
  // 전체 승인 전 요약 — 가이드 ✗ 는 막지 않는다
  function approveSummary() {
    const list = ads(); let fail = 0, skipped = 0, pending = 0; const top = new Map();
    for (const a of list) { const s = sumOf(a); if (!s) { pending++; continue; } fail += s.fail + s.skipped; skipped += s.skipped; for (const r of a.guide.rows) if (r.ok === false && !a.guideSkips?.[r.id]) top.set(r.name, (top.get(r.name) ?? 0) + 1); }
    return { fail, skipped, pending, n: list.length, top: [...top.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5) };
  }
  // 그려질 때마다(iframe load) — 경계 맞춤 → 손잡이 → 가이드 검수
  function afterRender(a) {
    if (a.channel !== 'ad') return;
    if (enforceBounds(a)) return;          // 다시 그린다 — 다음 load 에서 이어서
    editedBadge(a);
    if (S.selected === keyOf(a)) showOverlay(a);
    guideCheck(a);
  }
  return { presetCampaignHtml, bindPresetCampaign, presetArtifactHtml, bindPresetArtifact, alignCampaignHtml, bindAlignCampaign, alignArtifactHtml, bindAlignArtifact, editSectionHtml, bindEditSection, guideSectionHtml, bindGuideSection, showOverlay, hideOverlay, afterRender, guideBadge, editedBadge, approveSummary, partsOf };
}
