// 「대화로 시안 뽑기」(11-05 사용자 결정) — Claude(로컬 서버의 Claude Code 브리지 또는 API 키)가 키비주얼로 새 배경·자유 타이포 HTML 을 만들고,
//   말로 고치며 계속 뽑고, 맘에 드는 안은 소재의 안(variants kind 'free')으로 쓰거나 「내 자유 시안」으로 저장해 같은 규격 다른 캠페인에서 다시 쓴다.
//   규칙은 검수기가 강제: 카드마다 measureArtifact → lintArtifact → approvalGate 로 차단/경고를 단다(글자 수·안전영역·금지색·폰트·로고).
//
// 서버 계약(server/ 가 만든다 — 여기서 바꾸지 않는다):
//   POST /api/freedesign { specId, brief, kv:{dataUrl,meta}, logo:{dataUrl,tone}|null, brand:{primary,secondary,accent}, rules, history:[{role,text}], prev:{html}|null, engine:'claude-code'|'api', n:1 }
//     → { html, notes, engine, model, ms }
//   GET /api/health → { hasKey, freedesign:{ claudeCode:bool } }
// 서버가 없을 때(배포 앱): 엔진 없음 안내만 — 브라우저에서 api.anthropic.com 직접 호출은 이번엔 만들지 않는다(안내 문구만).
import { toTemplate, fillTemplate, validateFreeHtml, normalizeFreeHtml, fontNamesIn, freeTemplateRecord, FREE_FIELDS } from '../core/freetpl.js';
import { FONTS, fontRuleOf, fontIdOfName, isBundledFont } from '../core/fonts.js';
import { scoreCandidates, exemplarsFor, prefRecord, prefStats, mergePrefs, fingerprintOf, RATING_LABEL, SCOPE_LABEL, normRating } from '../core/freeprefs.js';   // 취향 학습(11-05): 좋음/보통/절대 안 됨 → 5점 셀렉이 정렬·프롬프트 참고가 된다

export const PREFS_DB = 'mbm-free-prefs';   // IndexedDB(mbm-free-prefs / prefs, keyPath id) → 안 되면 localStorage 같은 키. 파일 ref/learned/free-prefs.json 과 같은 레코드(core/freeprefs.js prefRecord)
let PREFS = [];   // 메모리 캐시(패널 열 때 적재)
function prefsDb() {
  return new Promise((ok, no) => { try { const r = indexedDB.open(PREFS_DB, 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('prefs')) r.result.createObjectStore('prefs', { keyPath: 'id' }); }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } });
}
export async function loadPrefs() {
  let local = [];
  try { const db = await prefsDb(); local = await new Promise((ok, no) => { const q = db.transaction('prefs').objectStore('prefs').getAll(); q.onsuccess = () => ok(q.result ?? []); q.onerror = () => no(q.error); }); }
  catch { try { local = JSON.parse(ls()?.getItem(PREFS_DB) ?? '[]'); } catch { local = []; } }
  let file = [];   // 레포 파일(다른 컴퓨터·대화창 평가) — 서버가 있으면 /api/freeprefs, 없으면 정적 파일
  try { const r = await fetch('/api/freeprefs', { cache: 'no-store' }); if (r.ok) file = (await r.json()).prefs ?? []; } catch {}
  if (!file.length) { try { const r = await fetch('../ref/learned/free-prefs.json', { cache: 'no-store' }); if (r.ok) file = (await r.json()).prefs ?? []; } catch {} }
  PREFS = mergePrefs(local, file);
  return PREFS;
}
export async function savePrefRecord(rec) {
  PREFS = mergePrefs(PREFS, [rec]);
  try { const db = await prefsDb(); await new Promise((ok, no) => { const tx = db.transaction('prefs', 'readwrite'); tx.objectStore('prefs').put(rec); tx.oncomplete = ok; tx.onerror = () => no(tx.error); }); }
  catch { try { ls()?.setItem(PREFS_DB, JSON.stringify(PREFS.map(({ png, ...p }) => p))); } catch {} }
  try { fetch('/api/freeprefs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prefs: [{ ...rec, png: undefined }] }) }).catch(() => {}); } catch {}   // 로컬 서버가 있으면 파일에도(없으면 조용히)
  return rec;
}
export const currentPrefs = () => PREFS;
export function exportPrefsJson() { return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), prefs: PREFS.map(({ png, ...p }) => p) }, null, 1); }

export const FREE_LS = 'mbm-free-templates';
const BRIEF_KEYS = ['client', 'hiringType', 'season', 'role', 'startDate', 'deadline', 'deadlineTime', 'slogan', 'notice'];

/* ── 저장소(「자유 시안으로 저장」) — localStorage. 틀(자리표시 HTML)만 넣으므로 가볍다 ── */
function ls() { try { return window.localStorage; } catch { return null; } }
export function loadFreeTemplates() { try { const v = JSON.parse(ls()?.getItem(FREE_LS) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
export function saveFreeTemplates(list) { try { ls()?.setItem(FREE_LS, JSON.stringify(list)); return true; } catch { return false; } }
export function freeTemplatesFor(specId) { return loadFreeTemplates().filter(t => t.specId === specId); }
export function removeFreeTemplate(id) { saveFreeTemplates(loadFreeTemplates().filter(t => t.id !== id)); }

// 이 규격에서 허용되는 글꼴 이름(family) — 매체 고정(required)이면 그것만, allowed 가 있으면 그것, 아니면 묶은 무료 글꼴 전부
export function allowedFontNames(spec) {
  const r = fontRuleOf(spec?.mediumRules, spec?.rules);
  if (r.fixed) { const id = r.requiredId; return [FONTS[id]?.family ?? r.required]; }
  if (r.allowed?.length) return r.allowed.map(n => FONTS[fontIdOfName(n)]?.family ?? n);
  return Object.keys(FONTS).filter(id => isBundledFont(id) && !FONTS[id].custom).map(id => FONTS[id].family);
}
// 자유 HTML 이 쓰는 글꼴 id 목록(카탈로그에 있는 것만) — 미리보기 @font-face·내보내기 바이트 주입에 쓴다
export function freeFontIds(html) { return [...new Set(fontNamesIn(html).map(fontIdOfName).filter(Boolean))]; }

// 서버로 보낼 규칙 묶음 — 규격 JSON 값을 그대로(서버가 프롬프트로 바꾼다)
export function rulesFor(spec) {
  const R = spec.rules ?? {}, r = fontRuleOf(spec.mediumRules, R);
  const notes = [...(spec.mediumRules?.common ?? spec.mediumRules?.rules ?? []).map(x => x?.rule ?? x).filter(x => typeof x === 'string'), ...(R.layoutNotes ? [].concat(R.layoutNotes) : []), ...(R.note ? [String(R.note)] : [])];
  return { w: spec.w, h: spec.h, exportScale: spec.exportScale ?? 1, safeArea: R.safeArea ?? null, textLimits: R.textLimits ?? [], fonts: { allowed: allowedFontNames(spec), required: r.required ?? null }, logo: R.logo ?? null, background: R.background ?? null, textColors: R.textColors ?? spec.mediumRules?.textColors ?? null, mold: R.safeArea?.measuredFromTemplate?.mold ?? null, notes };
}
export function briefOf(ctx) { const c = ctx?.core ?? {}; const b = {}; for (const k of BRIEF_KEYS) b[k] = c[k] ?? null; if (!b.client && c.name) b.client = c.name; return b; }

let healthP = null;
export function freeHealth(force = false) {
  if (healthP && !force) return healthP;
  healthP = (async () => { try { const r = await fetch('/api/health', { cache: 'no-store' }); if (!r.ok) return { server: false }; const j = await r.json(); return { server: true, hasKey: !!j.hasKey, claudeCode: !!j.freedesign?.claudeCode, model: j.model ?? null }; } catch { return { server: false }; } })();
  return healthP;
}
export function enginesOf(h) { const out = []; if (h?.claudeCode) out.push('claude-code'); if (h?.hasKey) out.push('api'); return out; }
export const ENGINE_LABEL = { 'claude-code': 'Claude Code(로컬)', api: 'API 키(서버)' };

export async function requestFreeDesign(body) {
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null; const timer = ac ? setTimeout(() => ac.abort(), 300000) : null;
  let r; try { r = await fetch('/api/freedesign', { method: 'POST', signal: ac?.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
  catch (e) { throw new Error(e?.name === 'AbortError' ? '응답이 5분을 넘겨 중단했습니다' : `호출 실패: ${e?.message ?? e}`); }
  finally { if (timer) clearTimeout(timer); }
  let res; try { res = await r.json(); } catch { throw new Error(`서버 응답이 JSON 이 아닙니다(HTTP ${r.status})`); }
  if (!r.ok || res.error) throw new Error(res.error ?? `HTTP ${r.status}`);
  if (!res.html) throw new Error('응답에 html 이 없습니다');
  return res;
}

/* ── 패널 ──
   deps: { state, SPECS, $, escH, previewDoc, measureArtifact, lintArtifact, approvalGate, STATE_LABEL, adEffCtx, apiCopy, rasterizeCanvas, toast, log, useFree, artLabel, naturalSize }
   useFree(a, free) — 앱이 소재 a 의 안(kind 'free')으로 넣고 고른다(app.js). free = { id, tpl, texts, notes, logoTone, html } */
export function createFreeDesign(D) {
  const sessions = new Map();   // 캠페인 id → { specId, history:[{role,text}], results:[], prev, engine }
  const sessionOf = c => { let s = sessions.get(c.id); if (!s) { s = { specId: null, history: [], results: [], prev: null, engine: null }; sessions.set(c.id, s); } return s; };
  let root = null, io = null;

  const adsOf = c => (c?.artifacts ?? []).filter(a => a.channel === 'ad' && D.SPECS[a.specId]?.rules && D.SPECS[a.specId].w > 0);
  const specLabel = a => D.artLabel(a);
  const keyOf = a => a.key ?? a.specId;

  async function checkResult(res, spec, ctx) {   // 검수: 규격 검사 + 승인 게이트(디자인 검수는 생략 — 자유 시안은 사람이 본다)
    try {
      const m = await D.measureArtifact(res.html, spec); res.measure = { texts: m.texts, logo: m.logo, objects: m.objects ?? [], bgColors: m.bgColors, fontFamily: m.fontFamily };
      res.lint = D.lintArtifact({ spec: spec.rules, medium: spec.mediumRules, measure: m, ctx });
      res.design = await designCheck(res.html, spec);   // 디자인 검수(겹침·가림·잘림) — 보드와 같은 core/adcheck.js, 숨은 iframe 에서
      res.gate = D.approvalGate({ grade: spec.grade ?? null, lint: res.lint, design: res.design });
    } catch (e) { res.lint = { level: 'warn', issues: [{ level: 'warn', code: 'measure', msg: `측정 실패: ${e.message}` }] }; res.gate = { state: 'review', reasons: [`측정 실패: ${e.message}`] }; }
  }

  async function designCheck(html, spec) {
    if (!D.checkAdDoc) return null;
    const f = document.createElement('iframe'); f.width = spec.w; f.height = spec.h; f.style.cssText = `position:fixed;left:-30000px;top:0;width:${spec.w}px;height:${spec.h}px;border:0;visibility:hidden`; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true');
    document.body.appendChild(f);
    try {
      await new Promise(ok => { f.onload = ok; f.srcdoc = D.previewDoc(html, null); setTimeout(ok, 4000); });
      try { await f.contentDocument?.fonts?.ready; } catch {}
      return D.checkAdDoc(f.contentDocument, { kvMeta: D.state.campaign?.style?.kvMeta ?? null });
    } catch (e) { return { warnings: [{ code: 'design-failed', level: 'warn', msg: '디자인 검수 실패 — 사람이 확인' }] }; }
    finally { f.remove(); }
  }
  async function thumbOf(html, spec) {   // 저장 목록용 작은 그림(JPEG ≤ 160px)
    try { const k = Math.min(1, 160 / spec.w); const { canvas } = await D.rasterizeCanvas(html, spec.w, spec.h, k, 'jpg', 0.7); return canvas.toDataURL('image/jpeg', 0.7); } catch { return null; }
  }

  function close() { io?.disconnect(); io = null; root?.remove(); root = null; document.removeEventListener('keydown', onKey, true); }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }

  function open(a0 = null) {
    const c = D.state.campaign; if (!c) return;
    const ads = adsOf(c); if (!ads.length) { D.toast('광고 소재가 있는 캠페인에서만 쓸 수 있어요'); return; }
    const S = sessionOf(c);
    const a = a0 && ads.includes(a0) ? a0 : ads.find(x => keyOf(x) === S.specId) ?? ads.find(x => keyOf(x) === D.state.selected) ?? ads[0];
    S.specId = keyOf(a);
    if (root) close();
    root = document.createElement('div'); root.id = 'freePanel';
    root.innerHTML = `<div class="fp-panel" role="dialog" aria-modal="true" aria-labelledby="fpTitle">
      <div class="fp-head"><h3 id="fpTitle">대화로 시안 뽑기</h3>
        <label class="fp-spec">규격 <select id="fpSpec" aria-label="규격">${ads.map(x => `<option value="${D.escH(keyOf(x))}" ${keyOf(x) === S.specId ? 'selected' : ''}>${D.escH(specLabel(x))}</option>`).join('')}</select></label>
        <span class="fp-engine" id="fpEngine" aria-live="polite">엔진 확인 중…</span>
        <span class="fp-prefs" id="fpPrefs" aria-live="polite"></span>
        <button class="btn" id="fpClose">닫기</button></div>
      <div class="fp-body">
        <div class="fp-chat">
          <div class="fp-note">Claude 가 키비주얼로 새 배경 디자인과 자유 타이포를 만들어요. 규칙(글자 수·안전영역·색·폰트·로고)은 검수기가 강제해 카드마다 배지로 보여요.</div>
          <div class="fp-hist" id="fpHist" aria-live="polite"></div>
          <div class="fp-prev" id="fpPrev" hidden></div>
          <textarea id="fpIn" rows="3" placeholder="예: 키비주얼을 오른쪽에 크게, 메인은 두 줄, 배경은 브랜드색 그라데이션"></textarea>
          <div class="fp-row"><span class="fp-msg" id="fpMsg" role="status"></span><button class="btn pri" id="fpGo">뽑기</button></div>
        </div>
        <div class="fp-results" id="fpResults"></div>
      </div></div>`;
    document.body.appendChild(root);
    document.addEventListener('keydown', onKey, true);
    root.querySelector('#fpClose').onclick = close;
    root.addEventListener('click', e => { if (e.target === root) close(); });
    root.querySelector('#fpSpec').onchange = e => { S.specId = e.target.value; S.prev = null; renderPrev(S); renderResults(c, S); };
    root.querySelector('#fpGo').onclick = () => go(c, S);
    root.querySelector('#fpIn').onkeydown = e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') go(c, S); };
    renderHist(S); renderPrev(S); renderResults(c, S);
    loadPrefs().then(() => { if (root) renderResults(c, S); });   // 평가 적재 → 정렬·머리 갱신
    freeHealth().then(h => { const el = root?.querySelector('#fpEngine'); if (!el) return; const list = enginesOf(h); S.engine = list.includes(S.engine) ? S.engine : list[0] ?? null;
      if (!list.length) { el.innerHTML = `<span class="fp-none">엔진 없음</span> <small>${h.server ? '서버에 Claude Code 도 API 키도 없어요' : '로컬 서버에서 Claude Code 로 쓰거나 API 키 서버가 필요해요(배포 앱에선 안내만)'}</small>`; root.querySelector('#fpGo').disabled = true; return; }
      el.innerHTML = list.length > 1 ? `엔진 <select id="fpEngineSel">${list.map(k => `<option value="${k}" ${k === S.engine ? 'selected' : ''}>${ENGINE_LABEL[k]}</option>`).join('')}</select>` : `엔진 <b>${ENGINE_LABEL[list[0]]}</b>`;
      const sel = el.querySelector('#fpEngineSel'); if (sel) sel.onchange = () => { S.engine = sel.value; };
    });
    setTimeout(() => root?.querySelector('#fpIn')?.focus(), 0);
  }

  function renderHist(S) {
    const box = root?.querySelector('#fpHist'); if (!box) return;
    box.innerHTML = S.history.length ? S.history.map(h => `<div class="fp-bub ${h.role}">${D.escH(h.text)}</div>`).join('') : '<div class="fp-empty">아직 대화가 없어요. 아래에 원하는 느낌을 적고 「뽑기」.</div>';
    box.scrollTop = box.scrollHeight;
  }
  function renderPrev(S) {
    const el = root?.querySelector('#fpPrev'); if (!el) return;
    el.hidden = !S.prev; if (!S.prev) return;
    el.innerHTML = `수정 모드 — <b>안 ${S.prev.n}</b> 을 기준으로 고쳐요 <button type="button" class="lnk" id="fpPrevOff">새로 뽑기</button>`;
    el.querySelector('#fpPrevOff').onclick = () => { S.prev = null; renderPrev(S); };
  }

  async function go(c, S) {
    const inp = root.querySelector('#fpIn'), msg = root.querySelector('#fpMsg'), btn = root.querySelector('#fpGo');
    const text = inp.value.trim();
    if (!S.engine) { msg.textContent = '엔진이 없어요'; return; }
    const a = adsOf(c).find(x => keyOf(x) === S.specId); if (!a) return;
    const spec = D.SPECS[a.specId];
    if (!c.style.keyVisual) { msg.textContent = '키비주얼이 있어야 해요(비주얼에서 올려 주세요)'; return; }
    const ctx = D.adEffCtx(a);
    const userText = text || (S.prev ? '같은 방향으로 다른 안 하나 더' : '이 키비주얼로 이 규격에 맞는 시안 하나');
    S.history.push({ role: 'user', text: userText }); renderHist(S); inp.value = '';
    btn.disabled = true; msg.textContent = `${ENGINE_LABEL[S.engine]} 로 만드는 중… (1~3분)`;
    try {
      const kvSent = await D.apiCopy(c.style.keyVisual, (c.style.kvMeta?.field?.opaque ?? 1) < 0.5);
      const logoTone = c.style.logoTone === 'light' ? 'light' : 'dark';
      const body = {
        specId: a.specId, brief: briefOf(ctx), kv: { dataUrl: kvSent, meta: c.style.kvMeta ?? null },
        logo: c.style.logo ? { dataUrl: c.style.logo, tone: logoTone } : null,
        brand: { primary: c.style.palette?.primary ?? null, secondary: c.style.palette?.secondary ?? null, accent: c.style.palette?.accent ?? null },
        rules: rulesFor(spec), history: S.history.slice(-12), prev: S.prev ? { html: S.prev.html } : null, engine: S.engine, n: 1,
        prefs: exemplarsFor(PREFS, { specId: a.specId, kvMeta: c.style.kvMeta ?? null, n: 3 }),   // 취향 학습 — 채택된 안 참고(최대 3)·피할 안(최대 1, 「모든 유형」만)
      };
      const res = await requestFreeDesign(body);
      const vars = Array.isArray(res.variants) && res.variants.length ? res.variants : [{ html: res.html, notes: res.notes, style: null }];   // 서버가 방향 여럿을 주면 전부 카드로(묶음)
      const batch = Date.now(); const items = [];
      for (const vr of vars) {
        const html = normalizeFreeHtml(vr.html, { specId: a.specId, w: spec.w, h: spec.h });
        const v = validateFreeHtml(html, { w: spec.w, h: spec.h, allowedFonts: allowedFontNames(spec) });
        const n = S.results.length + 1;
        const item = { n, specKey: keyOf(a), specId: a.specId, html, notes: String(vr.notes ?? ''), style: vr.style ?? null, engine: res.engine ?? S.engine, model: res.model ?? null, ms: res.ms ?? null, kvSent, logoTone, valid: v, lint: null, gate: null, at: Date.now(), batch, fp: fingerprintOf(html, { specId: a.specId, kvMeta: c.style.kvMeta ?? null }), rating: null, scope: 'type', note: '' };
        S.results.unshift(item); items.push(item);
        S.history.push({ role: 'assistant', text: `안 ${n}${item.style?.name ? `(${item.style.name})` : ''}${item.notes ? ` — ${item.notes}` : ''}${v.ok ? '' : ` (형식 문제: ${v.errors.join(' / ')})`}` });
      }
      renderHist(S); renderResults(c, S);
      const first = items[0], v = first.valid, n = first.n;
      msg.textContent = v.ok ? `안 ${n}${items.length > 1 ? `~${items[items.length - 1].n}` : ''} 완성 — 검수 중…` : `안 ${n}: 계약과 다른 HTML(${v.errors[0]}) — 「다시」로 고쳐 달라고 해 보세요`;
      D.log(`자유 시안 ${n}${items.length > 1 ? `~${items[items.length - 1].n}` : ''} (${spec.id}, ${first.engine}${first.model ? ' · ' + first.model : ''}${first.ms ? ' · ' + (first.ms / 1000).toFixed(0) + 's' : ''})`);
      for (const it of items) { await checkResult(it, spec, ctx); it.fp = fingerprintOf(it.html, { specId: a.specId, kvMeta: c.style.kvMeta ?? null, measure: it.measure ?? null }); }
      renderResults(c, S);
      if (v.ok) msg.textContent = `안 ${n}: ${D.STATE_LABEL[first.gate?.state] ?? ''}${first.gate?.reasons?.length ? ' — ' + first.gate.reasons[0] : ''}`;
    } catch (e) {
      S.history.push({ role: 'assistant', text: `실패: ${e.message}` }); renderHist(S); msg.textContent = `실패: ${e.message}`;
    } finally { btn.disabled = false; }
  }

  function renderResults(c, S) {
    const box = root?.querySelector('#fpResults'); if (!box) return;
    io?.disconnect();
    const raw = S.results.filter(r => r.specKey === S.specId);
    renderPrefHead();
    if (!raw.length) { box.innerHTML = `<div class="fp-empty">이 규격으로 뽑은 안이 아직 없어요.</div>`; return; }
    const a = adsOf(c).find(x => keyOf(x) === S.specId), spec = D.SPECS[a.specId], [nw, nh] = [spec.w, spec.h];
    // 카드 정렬 = 취향 점수 순(core/freeprefs.js scoreCandidates — 버리지 않는다, 탐색 안 1개 표시). 같은 묶음끼리 모은다(최신 묶음 먼저)
    const scored = scoreCandidates(raw.map(r => ({ r, fp: r.fp, html: r.html })), PREFS, { specId: a.specId, kvMeta: c.style.kvMeta ?? null });
    for (const s of scored) { s.r.score = s.score; s.r.layoutScore = s.layoutScore; s.r.styleScore = s.styleScore; s.r.explore = s.explore; }
    const list = scored.map(s => s.r).sort((x, y) => (y.batch ?? y.at) - (x.batch ?? x.at) || y.score - x.score);
    const wide = nw / nh > 1.5, cardW = wide ? 460 : 300, k = Math.min(cardW / nw, 340 / nh);
    box.style.setProperty('--fp-w', `${Math.round(nw * k)}px`);
    box.innerHTML = '';
    io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { const f = e.target; f.srcdoc = D.previewDoc(list[+f.dataset.i].html, null); io.unobserve(f); } }, { root: box, rootMargin: '200px' });
    const batches = [...new Set(list.map(r => r.batch ?? r.at))];
    if (list.length > 1) {   // 묶음 단위 「다 아님」(전부 1 절대 못씀) — 최신 묶음
      const bar = document.createElement('div'); bar.className = 'fp-batchbar';
      bar.innerHTML = `<span>${list.length}안 · 취향 점수 순${batches.length > 1 ? ` · 묶음 ${batches.length}` : ''}</span><button type="button" class="btn" data-allbad="1" title="이번 묶음 전부 「1 절대 못씀」으로 기록">이 묶음 다 아님</button>`;
      bar.querySelector('[data-allbad]').onclick = async () => { const b = batches[0]; for (const r of list.filter(x => (x.batch ?? x.at) === b)) await rate(r, 1, c, a); renderResults(c, S); D.toast('묶음 전부 「절대 못씀」으로 기록'); };
      box.appendChild(bar);
    }
    list.forEach((r, i) => {
      const card = document.createElement('div'); card.className = 'fp-card'; card.dataset.n = r.n;
      const gate = r.gate, gs = gate?.state ?? 'pending';
      const badge = !r.valid.ok ? `<span class="badge gate blocked" title="${D.escH(r.valid.errors.join('\n'))}">형식 오류</span>` : `<span class="badge gate ${gs}" title="${D.escH((gate?.reasons ?? []).join('\n'))}">${gate ? D.STATE_LABEL[gs] : '검사 중'}</span>`;
      const issues = [...(r.lint?.issues ?? []), ...((r.design?.warnings ?? []).filter(w => w.level !== 'info').map(w => ({ level: 'warn', msg: `디자인 · ${w.msg ?? w.code}` })))];
      const rv = normRating(r.rating);
      const scoreB = PREFS.length ? `<span class="badge fp-score ${r.score < 0 ? 'neg' : ''}" title="취향 점수(레이아웃 ${r.layoutScore} · 스타일 ${r.styleScore}) — 평가가 쌓일수록 정렬에 반영">${r.score > 0 ? '+' : ''}${r.score ?? 0}</span>` : '';
      const exploreB = r.explore ? '<span class="badge fp-explore" title="점수와 무관하게 남긴 탐색 안(좋음들과 가장 먼 구조)">탐색</span>' : '';
      card.innerHTML = `<div class="fp-top"><b>안 ${r.n}</b>${r.style?.name ? ` <span class="badge">${D.escH(r.style.name)}</span>` : ''} ${badge} ${scoreB}${exploreB} <small>${D.escH(ENGINE_LABEL[r.engine] ?? r.engine ?? '')}${r.ms ? ` · ${(r.ms / 1000).toFixed(0)}s` : ''}</small></div>
        <button type="button" class="fp-box" title="크게 보기" style="width:${Math.round(nw * k)}px;height:${Math.round(nh * k)}px"><iframe width="${nw}" height="${nh}" data-i="${i}" tabindex="-1" aria-hidden="true" style="transform:scale(${k})"></iframe></button>
        ${r.notes ? `<div class="fp-notes">${D.escH(r.notes)}</div>` : ''}
        ${issues.length ? `<ul class="fp-issues">${issues.map(x => `<li class="${x.level}">${D.escH(x.msg ?? x.code)}</li>`).join('')}</ul>` : r.lint ? '<div class="fp-ok">규격 통과 — 치수·글자수·색·폰트 규정 안</div>' : ''}
        ${r.valid.warnings?.length ? `<div class="fp-warn">${D.escH(r.valid.warnings.join(' · '))}</div>` : ''}
        <div class="fp-rate" role="radiogroup" aria-label="평가">${[5, 4, 3, 2, 1].map(v => `<button type="button" data-rate="${v}" class="${rv === v ? 'on' : ''}" aria-pressed="${rv === v}" title="${v} ${RATING_LABEL[v]} (키 ${v})">${v}<small>${RATING_LABEL[v]}</small></button>`).join('')}</div>
        <div class="fp-scope"><select aria-label="평가 범위" data-scope="1">${['kv', 'type', 'all'].map(k => `<option value="${k}" ${(r.scope ?? 'type') === k ? 'selected' : ''}>${SCOPE_LABEL[k]}</option>`).join('')}</select><input data-note="1" placeholder="이유 한 줄(#레이아웃 #톤 #타이포 #키비주얼)" value="${D.escH(r.note ?? '')}"></div>
        <div class="fp-acts"><button type="button" class="btn pri" data-use="1" ${r.valid.ok ? '' : 'disabled'}>이 안으로 쓰기</button><button type="button" class="btn" data-redo="1">다시: 말로 수정</button><button type="button" class="btn" data-save="1" ${r.valid.ok ? '' : 'disabled'}>자유 시안으로 저장</button></div>`;
      card.tabIndex = 0;
      for (const bt of card.querySelectorAll('[data-rate]')) bt.onclick = async () => { await rate(r, +bt.dataset.rate, c, a); renderResults(c, S); };
      card.querySelector('[data-scope]').onchange = e => { r.scope = e.target.value; if (r.rating) rate(r, r.rating, c, a); };
      card.querySelector('[data-note]').onchange = e => { r.note = e.target.value; if (r.rating) rate(r, r.rating, c, a); };
      card.onkeydown = e => { if (/^[1-5]$/.test(e.key) && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); rate(r, +e.key, c, a).then(() => renderResults(c, S)); } };
      const f = card.querySelector('iframe'); io.observe(f);
      card.querySelector('.fp-box').onclick = () => enlarge(r, spec);
      card.querySelector('[data-use]').onclick = () => {
        const { tpl, texts } = toTemplate(r.html, { kv: r.kvSent, logo: c.style.logo ?? null });
        const id = `free-${r.at.toString(36)}-${r.n}`;
        D.useFree(a, { id, tpl, texts, notes: r.notes, logoTone: r.logoTone, html: r.html });
        if (!normRating(r.rating) || normRating(r.rating) < 4) rate(r, 5, c, a);   // 채택 = 좋음(5) 자동 기록
        D.toast(`안 ${r.n} 을 ${specLabel(a)} 에 넣었어요`); close();
      };
      card.querySelector('[data-redo]').onclick = () => { S.prev = { n: r.n, html: r.html }; renderPrev(S); const inp = root.querySelector('#fpIn'); inp.placeholder = `안 ${r.n} 에서 고칠 점 — 예: 메인 글자를 더 크게, 로고는 오른쪽 아래`; inp.focus(); };
      card.querySelector('[data-save]').onclick = async () => {
        const { tpl, texts, leftover } = toTemplate(r.html, { kv: r.kvSent, logo: c.style.logo ?? null });
        const list0 = loadFreeTemplates(), n = list0.filter(t => t.specId === a.specId).length + 1;
        const rec = freeTemplateRecord({ id: `ft-${Date.now().toString(36)}`, specId: a.specId, tpl, notes: r.notes, thumb: await thumbOf(r.html, spec), label: `내 자유 시안 ${n}`, createdAt: Date.now() });
        rec.texts = texts;
        if (!saveFreeTemplates([rec, ...list0])) { D.toast('저장 실패 — 브라우저 저장 공간을 확인해 주세요'); return; }
        D.toast(`「${rec.label}」 저장 — 같은 규격의 다른 캠페인 「다른 시안 보기」 맨 앞에 떠요${leftover ? ' (틀에 그림 data URL 이 남아 무거워요)' : ''}`);
        D.log(`자유 시안 저장: ${rec.label} (${a.specId})`);
      };
      box.appendChild(card);
    });
  }

  // 평가 기록 — 레코드(core/freeprefs.js prefRecord: 지문·KV 유형·범위·메모·썸네일) → IndexedDB + 로컬 서버 파일
  async function rate(r, v, c, a) {
    r.rating = v;
    const spec = D.SPECS[a.specId];
    const png = r.png ?? (r.png = await thumbOf(r.html, spec));
    const { tpl } = toTemplate(r.html, { kv: r.kvSent, logo: c.style.logo ?? null });
    const rec = prefRecord({ id: r.prefId ?? (r.prefId = `fp-${(r.batch ?? r.at).toString(36)}-${r.n}`), specId: a.specId, kvMeta: c.style.kvMeta ?? null, caseId: c.id ?? null, html: tpl, png, rating: v, note: r.note ?? '', scope: r.scope ?? 'type', at: Date.now(), batch: String(r.batch ?? r.at), fp: r.fp ?? null, measure: r.measure ?? null });
    await savePrefRecord(rec);
    D.log(`자유 시안 평가: 안 ${r.n} → ${v} ${RATING_LABEL[v]}(${SCOPE_LABEL[r.scope ?? 'type']})`);
    return rec;
  }
  function renderPrefHead() {
    const el = root?.querySelector('#fpPrefs'); if (!el) return;
    const s = prefStats(PREFS);
    el.innerHTML = s.total ? `평가 <b>${s.total}</b> · 좋음 <b>${s.good}</b> · 보통 <b>${s.ok}</b> · 안 됨 <b>${s.bad}</b> <button type="button" class="lnk" id="fpPrefExport" title="ref/learned/free-prefs.json 형식">내보내기</button>` : '<span class="fp-none">평가 없음 — 카드의 1~5 로 고르면 정렬·프롬프트에 반영돼요</span>';
    const ex = el.querySelector('#fpPrefExport'); if (ex) ex.onclick = () => { const a = document.createElement('a'); a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(exportPrefsJson()); a.download = 'free-prefs.json'; a.click(); };
  }

  function enlarge(r, spec) {
    const big = document.createElement('div'); big.className = 'fp-big';
    const k = Math.min(1, (window.innerWidth - 80) / spec.w, (window.innerHeight - 120) / spec.h);
    big.innerHTML = `<div class="fp-big-in"><div class="fp-big-head"><b>안 ${r.n}</b> <span>${spec.w}×${spec.h}</span><button class="btn" type="button">닫기</button></div><div class="fp-big-box" style="width:${Math.round(spec.w * k)}px;height:${Math.round(spec.h * k)}px"><iframe width="${spec.w}" height="${spec.h}" style="transform:scale(${k})" tabindex="-1"></iframe></div></div>`;
    big.querySelector('iframe').srcdoc = D.previewDoc(r.html, null);
    const off = () => big.remove();
    big.querySelector('button').onclick = off; big.addEventListener('click', e => { if (e.target === big) off(); });
    root.appendChild(big);
  }

  // 「다른 시안 보기」 맨 앞에 넣을 내 자유 시안(같은 규격) — 이 캠페인의 글감·키비주얼로 채워 보여 준다
  function choicesFor(a, c, renderOpts) {
    const spec = D.SPECS[a.specId]; if (!spec) return [];
    const tpls = freeTemplatesFor(a.specId);
    const scored = PREFS.length ? scoreCandidates(tpls.map(t => ({ t, html: t.html })), PREFS, { specId: a.specId, kvMeta: c.style.kvMeta ?? null }).map(s => s.t) : tpls;   // 좋음 평가와 닮은 틀 먼저
    return scored.map(t => {
      const free = { id: t.id, tpl: t.html, notes: t.notes ?? '', logoTone: c.style.logoTone === 'light' ? 'light' : 'dark', saved: true };
      let html = ''; try { html = D.renderArtifact(a.specId, D.adEffCtx(a), { ...c.style, free }, renderOpts); } catch { return null; }
      return html ? { label: t.label ?? '내 자유 시안', style: { free }, html, saved: t } : null;
    }).filter(Boolean);
  }

  return { open, choicesFor, templatesFor: freeTemplatesFor, isOpen: () => !!root, close };
}
export { toTemplate, fillTemplate, FREE_FIELDS };
