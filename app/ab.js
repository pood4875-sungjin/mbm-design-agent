// A/B 비교 화면 — 같은 키비주얼·문구·규격으로 A(규칙 렌더러 renderArtifact)와 B(서버 /api/design → 레이아웃 JSON → renderLayout)를 나란히.
//   A 는 브라우저에서 그린다(앱과 같은 코드). B 는 「B 생성」을 누를 때만 서버(server/server.mjs)가 Claude 를 부른다.
//   검수는 둘 다 기존 코드: 규격 검사(app/measure.js → core/lint.js) · 디자인 검수(core/adcheck.js) · 승인 게이트(core/gate.js).
//   B 결과는 층 편집 패널에서 문구·위치·크기·색을 고칠 수 있다 — 고칠 때마다 서버와 같은 검증(validateLayout)을 다시 돌려 고정 조건을 지킨다.
//   비교 기록(사람 평가 + 자동 수치)은 localStorage 에 쌓고 Markdown/JSON 으로 뽑는다.

import { registerAll } from '../core/generate.js';
import { SPECS, renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { fieldFromImage, extractPalette, edgeColor, colorDistance } from '../core/palette.js';
import { logoMeta as logoMetaRGBA } from '../core/logo.js';
import { FONTS, fontIds, isBundledFont, localFaceCss, DEFAULT_FONT, effectiveFontId } from '../core/fonts.js';
import { checkAdDoc } from '../core/adcheck.js';
import { lintArtifact } from '../core/lint.js';
import { approvalGate, STATE_LABEL } from '../core/gate.js';
import { kvTypeSummary } from '../core/kvtypes.js';
import { validateLayout, ROLE_LABEL, WEIGHTS, TEXT_ROLES } from '../core/trackb/schema.js';
import { renderLayout, layerList } from '../core/trackb/render.js';
import { buildFixed } from '../core/trackb/prompt.js';
import { PRICES, DEFAULT_MODEL } from '../core/trackb/cost.js';
import { measureArtifact } from './measure.js';
import { rasterize, download, downloadText } from './raster.js';

registerAll();
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const toast = (m, ms = 2600) => { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms); };
const fmtMs = ms => ms == null ? '–' : ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
const BRIEF_FIELDS = ['client', 'hiringType', 'role', 'startDate', 'deadline', 'deadlineTime', 'season', 'headline', 'slogan', 'notice'];
const SPEC_IDS = ['kakao-display-pc-promo', 'google-gdn-580x400'];   // B 트랙 대표 규격(자유 매체) — 규정 매체(자소설)는 틀이 고정이라 차이가 안 드러난다
const LS_REC = 'mbm-ab-records';

const state = {
  kv: null, logo: null,          // { dataUrl, meta, name, apiDataUrl }
  caseLabel: '직접 입력',
  a: null,                       // { html, ms, checks }
  b: null,                       // { res, layout, fixed, html, checks, edits, t0, editMs, done }
  server: null,
};

/* ── 폰트: 앱과 같게 묶은 폰트 @font-face 를 문서와 미리보기 iframe 양쪽에 ── */
const FACES = fontIds().filter(isBundledFont).map(id => localFaceCss(id)).join('');
document.head.insertAdjacentHTML('beforeend', `<style>${FACES}</style>`);
const previewDoc = html => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}${FACES}</style></head><body>${html}</body></html>`;

/* ── 입력 읽기 ── */
const brief = () => Object.fromEntries(BRIEF_FIELDS.map(k => [k, ($('f_' + k).value || '').trim() || null]));
const brand = () => { const hex = v => /^#[0-9A-Fa-f]{6}$/.test((v || '').trim()) ? v.trim().toUpperCase() : null; return { primary: hex($('b_primary').value), accent: hex($('b_accent').value) }; };
const specId = () => $('specSel').value;
const fontId = () => $('fontSel').value || DEFAULT_FONT;
const fontIdFor = spec => effectiveFontId(spec.mediumRules, fontId(), spec.rules);

/* ── 그림 올리기 · 측정(앱 analyzeKeyVisual 와 같은 셈) ── */
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('이미지를 읽지 못했습니다')); i.src = src; });
const fileToDataUrl = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(f); });
function rgbaOf(img, W) {
  const H = Math.max(1, Math.round(W * img.height / img.width));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
  return { data: g.getImageData(0, 0, W, H).data, W, H };
}
async function kvMetaOf(dataUrl) {
  const img = await loadImg(dataUrl);
  const { data, W, H } = rgbaOf(img, 240);
  const field = fieldFromImage(data, W, H);
  const bgHexes = [...Object.values(field.edges ?? {}).filter(e => e.flat && e.hex).map(e => e.hex), field.room?.hex].filter(Boolean);
  const isBg = c => bgHexes.some(b => colorDistance(c, b) < 0.08);
  const raw = extractPalette(data, 6);
  const colors = (raw.filter(c => !isBg(c)).length ? raw.filter(c => !isBg(c)) : raw).slice(0, 3);
  return { ar: img.width / img.height, edge: edgeColor(data, W, H), px: [img.width, img.height], field, colors };
}
async function logoMetaOf(dataUrl) {
  const img = await loadImg(dataUrl);
  const { data, W, H } = rgbaOf(img, Math.min(480, img.width));
  const m = logoMetaRGBA(data, W, H) ?? {};
  return { ...m, ar: img.width / img.height, px: [img.width, img.height] };
}
// API 로 보낼 사본 — 긴 변 1600px·JPEG(투명 PNG 는 PNG 유지). 미리보기·렌더는 원본을 쓴다
async function apiCopy(dataUrl, keepPng = false) {
  const img = await loadImg(dataUrl);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  if (k === 1 && dataUrl.length < 3_000_000) return dataUrl;
  const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return keepPng ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.9);
}
async function setKv(dataUrl, name = '') {
  const meta = await kvMetaOf(dataUrl);
  state.kv = { dataUrl, meta, name, apiDataUrl: await apiCopy(dataUrl) };
  $('kvTh').style.backgroundImage = `url(${dataUrl})`;
  $('kvInfo').textContent = `${name || '키비주얼'} · ${meta.px[0]}×${meta.px[1]} · ${kvTypeSummary(meta) || ''}`;
  if (!$('b_primary').value && meta.colors?.[0]) $('b_primary').value = meta.colors[0];
}
async function setLogo(dataUrl, name = '') {
  const meta = await logoMetaOf(dataUrl);
  state.logo = { dataUrl, meta, name, apiDataUrl: await apiCopy(dataUrl, true) };
  $('logoTh').style.backgroundImage = `url(${dataUrl})`; $('logoTh').style.backgroundColor = meta.tone === 'light' ? '#333' : '#fafafa';
  $('logoInfo').textContent = `${name || '로고'} · ${meta.px[0]}×${meta.px[1]} · 톤 ${meta.tone ?? '?'}`;
}
$('kvBtn').onclick = () => $('kvFile').click();
$('kvFile').onchange = async () => { const f = $('kvFile').files[0]; if (!f) return; try { await setKv(await fileToDataUrl(f), f.name); state.caseLabel = f.name.replace(/\.[^.]+$/, ''); } catch (e) { toast(e.message); } };
$('logoBtn').onclick = () => $('logoFile').click();
$('logoFile').onchange = async () => { const f = $('logoFile').files[0]; if (!f) return; try { await setLogo(await fileToDataUrl(f), f.name); } catch (e) { toast(e.message); } };
$('logoClr').onclick = () => { state.logo = null; $('logoTh').style.backgroundImage = ''; $('logoInfo').textContent = '없음'; };

/* ── 샘플(비교 테스트 케이스) — ref/learned/cases 의 그림 + 홈 화면 샘플 브리프(app/samples.js 문법) ── */
const SAMPLES = {
  'pin-28': { kv: '../ref/learned/cases/pin-28/kv.jpg', brief: { client: 'GS에너지', hiringType: '신입 공채', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', startDate: '2025-06-20', deadline: '2025-07-02', deadlineTime: '17:00', season: '2025년', slogan: '', notice: '', headline: '' }, primary: '#326CD1', requests: '' },
  'pin-32': { kv: '../ref/learned/cases/pin-32/kv.jpg', brief: { client: '동서식품', hiringType: '대졸 신입/경력사원 채용', role: '(신입) 영업, 일반관리, 제조, 연구, 물류, 전산 / (경력) 연구(QA), 디자인', startDate: '2026-09-28', deadline: '2026-10-12', deadlineTime: '', season: '2026년', slogan: '동서식품의 새로운 인재를 찾습니다!', notice: '', headline: '' }, primary: '#C75420', requests: '' },
};
async function loadSample(id) {
  const s = SAMPLES[id];
  try {
    const r = await fetch(s.kv); if (!r.ok) throw new Error(`${s.kv} 를 못 읽음(${r.status}) — ref/learned/cases/${id} 폴더가 있어야 합니다`);
    const blob = await r.blob(); await setKv(await fileToDataUrl(blob), `${id}/kv.jpg`);
    for (const k of BRIEF_FIELDS) $('f_' + k).value = s.brief[k] ?? '';
    $('b_primary').value = s.primary; $('b_accent').value = ''; $('requests').value = s.requests;
    state.caseLabel = id; toast(`샘플 ${id} 불러옴 — A 그리기 / B 생성`);
  } catch (e) { toast(e.message, 5000); }
}
$('sample28').onclick = () => loadSample('pin-28');
$('sample32').onclick = () => loadSample('pin-32');

/* ── 규격·폰트·모델 선택지 ── */
for (const id of SPEC_IDS) { const s = SPECS[id]; $('specSel').add(new Option(`${s.title} (${s.w}×${s.h})`, id)); }
function specInfo() {
  const s = SPECS[specId()]; const sa = s.rules?.safeArea ?? {};
  const fr = s.mediumRules?.fonts?.required;
  $('specInfo').textContent = `등급 ${s.grade} · 안전영역 ${[sa.top, sa.right, sa.bottom, sa.left].map(v => v ?? '–').join('/')} · 폰트 ${fr ? fr + ' 고정' : '캠페인 선택'} · ${s.maxKB ?? '–'}KB`;
}
$('specSel').onchange = specInfo; specInfo();
for (const id of fontIds()) $('fontSel').add(new Option(FONTS[id].label, id, id === DEFAULT_FONT, id === DEFAULT_FONT));
for (const [id, p] of Object.entries(PRICES)) $('modelSel').add(new Option(`${p.label} ($${p.in}/$${p.out} MTok)`, id, id === DEFAULT_MODEL, id === DEFAULT_MODEL));

/* ── 미리보기(iframe, 비율 맞춤) + 검수 ── */
function showPreview(host, html, spec) {
  host.innerHTML = '';
  const boxW = host.getBoundingClientRect().width || 560, k = Math.min(1, boxW / spec.w);   // iframe 은 absolute 라 열 폭을 안 밀어낸다 — 열 폭에 비율 맞춤
  host.style.height = `${Math.round(spec.h * k)}px`;
  const f = document.createElement('iframe'); f.width = spec.w; f.height = spec.h; f.style.transform = `scale(${k})`; f.tabIndex = -1;
  host.appendChild(f);
  return new Promise(ok => { f.onload = () => setTimeout(() => ok(f), 60); f.srcdoc = previewDoc(html); });
}
async function checksOf(iframe, html, spec, kvMeta) {
  let design; try { design = checkAdDoc(iframe.contentDocument, { kvMeta }) ?? { warnings: [] }; } catch (e) { design = { warnings: [{ code: 'design-failed', level: 'warn', msg: '디자인 검수 실패: ' + e.message }] }; }
  let lint; try { const m = await measureArtifact(html, spec); lint = lintArtifact({ spec: spec.rules, medium: spec.mediumRules, measure: m }); lint.measure = { bytes: m.bytes, fontFamily: m.fontFamily }; } catch (e) { lint = { level: 'warn', issues: [{ level: 'warn', code: 'measure-failed', msg: '규격 측정 실패: ' + e.message }] }; }
  const gate = approvalGate({ grade: spec.grade, lint, design, samples: 0 });
  return { design, lint, gate };
}
function renderChecks(el, c) {
  if (!c) { el.innerHTML = ''; return; }
  const tag = (t, cls) => `<span class="tag ${cls}">${esc(t)}</span>`;
  const lintCls = c.lint.level === 'block' ? 'bad' : c.lint.level === 'warn' ? 'warn' : 'ok';
  const warns = (c.design.warnings ?? []).filter(w => w.level !== 'info');
  const gateCls = c.gate.state === 'ready' ? 'ok' : c.gate.state === 'blocked' ? 'bad' : 'warn';
  el.innerHTML = tag(`규격 검사 ${c.lint.level === 'pass' ? '통과' : c.lint.level === 'block' ? '차단 ' + c.lint.issues.filter(i => i.level === 'block').length : '경고 ' + c.lint.issues.length}`, lintCls)
    + tag(`디자인 검수 ${warns.length ? '경고 ' + warns.length : '통과'}`, warns.length ? 'warn' : 'ok')
    + tag(`게이트 ${STATE_LABEL[c.gate.state]}`, gateCls)
    + (c.lint.measure ? `<span class="mini"> · ${Math.round(c.lint.measure.bytes / 1024)}KB · ${esc((c.lint.measure.fontFamily ?? '').split(',')[0])}</span>` : '')
    + (c.lint.issues.length || warns.length ? `<ul class="fx">${[...c.lint.issues.map(i => `[규정${i.level === 'block' ? '·차단' : ''}] ${i.msg ?? i.code}`), ...warns.map(w => `[디자인] ${w.msg ?? w.code}`)].map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '');
}
const checkSummary = c => !c ? '–' : `규정 ${c.lint.level === 'pass' ? '통과' : c.lint.level === 'block' ? '차단' : '경고' + c.lint.issues.length} · 디자인 ${(c.design.warnings ?? []).filter(w => w.level !== 'info').length ? '경고' + (c.design.warnings ?? []).filter(w => w.level !== 'info').length : '통과'} · ${STATE_LABEL[c.gate.state]}`;

/* ── A 트랙 ── */
function styleFor() {
  const b = brand(); const colors = [b.primary ?? state.kv?.meta?.colors?.[0] ?? '#2456D6']; if (b.accent) colors.push(b.accent);
  const lg = state.logo;
  return normalizeStyle({ colors, keyVisual: state.kv?.dataUrl ?? null, kvMeta: state.kv?.meta ?? null, logo: lg?.dataUrl ?? null, logoMeta: lg?.meta ?? null, logoTone: lg?.meta?.tone ?? null, logoLight: lg?.meta?.tone === 'light' ? lg.dataUrl : null, fonts: { heading: fontId(), body: fontId() } });
}
async function runA() {
  const spec = SPECS[specId()]; const ctx = createContext(brief(), 'recruit');
  if (!ctx.core.client) return toast('고객사를 적어 주세요');
  const t0 = performance.now();
  let html; try { html = renderArtifact(spec.id, ctx, styleFor(), {}); } catch (e) { return toast('A 렌더 실패: ' + e.message, 5000); }
  const ms = performance.now() - t0;
  $('aTitle').textContent = `${spec.w}×${spec.h} · ${FONTS[fontIdFor(spec)]?.label}`;
  const f = await showPreview($('aPv'), html, spec);
  const checks = await checksOf(f, html, spec, state.kv?.meta ?? null);
  state.a = { html, ms, checks, specId: spec.id };
  renderChecks($('aChk'), checks);
  $('aMeta').textContent = `생성 ${fmtMs(ms)} (브라우저 렌더, API 없음)`;
}
$('runA').onclick = runA;

/* ── B 트랙 ── */
async function health() {
  try { const r = await fetch('/api/health'); state.server = await r.json(); }
  catch { state.server = null; }
  const s = state.server;
  $('srvSt').innerHTML = s ? (s.hasKey ? `서버 ✓ · 키 <b>${esc(s.keyFrom)}</b> · 기본 ${esc(s.model)}` : `서버 ✓ · <b style="color:#ffb4a8">키 없음</b> — server/.env 에 ANTHROPIC_API_KEY 를 넣고 다시 켜 주세요`) : `<b style="color:#ffb4a8">서버 없음</b> — <code>node server/server.mjs 4796</code> 으로 열어야 B 생성이 됩니다`;
  $('runB').disabled = !(s && s.hasKey);
}
async function runB() {
  const spec = SPECS[specId()]; const br = brief();
  if (!br.client) return toast('고객사를 적어 주세요');
  if (!state.kv) return toast('키비주얼을 올려 주세요');
  const model = $('modelSel').value, effort = $('effortSel').value;
  if (!confirm(`Claude ${PRICES[model]?.label} (effort ${effort}) 를 호출합니다 — 유료(이미지 1~2장 + 레이아웃 JSON, 보통 $0.05~0.2). 진행할까요?`)) return;
  $('runB').disabled = true; $('bPv').innerHTML = '<div class="busy">AI 가 레이아웃을 설계하는 중… (10~60초)</div>'; $('bChk').innerHTML = ''; $('bMeta').textContent = '';
  const body = { specId: spec.id, brief: br, brand: brand(), requests: $('requests').value, fontId: fontId(), model, effort, kv: { dataUrl: state.kv.apiDataUrl, meta: state.kv.meta }, logo: state.logo ? { dataUrl: state.logo.apiDataUrl, meta: state.logo.meta } : null };
  const t0 = performance.now();
  let res;
  try {
    const r = await fetch('/api/design', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    res = await r.json(); if (!r.ok || res.error) throw new Error(res.error ?? `HTTP ${r.status}`);
  } catch (e) { $('bPv').innerHTML = ''; $('bMeta').textContent = '실패: ' + e.message; $('runB').disabled = false; return toast('B 생성 실패: ' + e.message, 6000); }
  res.clientMs = performance.now() - t0;
  state.b = { res, layout: res.layout, fixed: res.fixed, edits: 0, t0: performance.now(), editMs: null, done: false, specId: spec.id, model, effort };
  await drawB(); fillEditor();
  $('bFixes').innerHTML = [...res.fixes.map(s => `<li>고침: ${esc(s)}</li>`), ...res.unresolved.map(s => `<li style="color:var(--danger)">미해결: ${esc(s)}</li>`)].join('') || '<li>고친 것 없음</li>';
  $('bPrompt').textContent = `[system]\n${res.prompt.system}\n\n[user]\n${res.prompt.user}`;
  $('editor').hidden = false; $('runB').disabled = false;
  toast(`B 완료 — ${fmtMs(res.ms)} · ${res.calls}회 · $${res.cost}`);
}
$('runB').onclick = runB;
async function drawB() {
  const B = state.b; const spec = SPECS[B.specId];
  const fid = fontIdFor(spec);
  B.html = renderLayout(B.layout, { kv: state.kv?.dataUrl, logo: state.logo?.dataUrl, fontStack: FONTS[fid]?.stack, specId: spec.id });
  $('bTitle').textContent = `${spec.w}×${spec.h} · ${FONTS[fid]?.label} · ${PRICES[B.model]?.label ?? B.model}`;
  const f = await showPreview($('bPv'), B.html, spec);
  B.checks = await checksOf(f, B.html, spec, state.kv?.meta ?? null);
  renderChecks($('bChk'), B.checks);
  const u = B.res.usage;
  $('bMeta').textContent = `생성 ${fmtMs(B.res.ms)} (API ${B.res.calls}회 · 왕복 ${fmtMs(B.res.clientMs)}) · 토큰 입력 ${u.input_tokens.toLocaleString()} / 출력 ${u.output_tokens.toLocaleString()}${u.cache_read_input_tokens ? ` / 캐시 ${u.cache_read_input_tokens.toLocaleString()}` : ''} · 비용 추정 $${B.res.cost} · ${B.res.model} · effort ${B.res.effort}\n근거: ${B.res.rationale || '–'}`;
}

/* ── B 층 편집 — 값 하나 바꿀 때마다 검증(validateLayout) → 다시 그림. 수정 횟수·시간을 센다 ── */
let editingKey = null;
function fillEditor() {
  const B = state.b; const sel = $('layerSel'); const keep = editingKey; sel.innerHTML = '';
  for (const l of layerList(B.layout)) sel.add(new Option(l.label, l.key));
  if (keep && [...sel.options].some(o => o.value === keep)) sel.value = keep; else sel.value = sel.options[sel.options.length - 1]?.value ?? 'background';
  editingKey = sel.value; renderFields(); editStatus();
}
$('layerSel').onchange = () => { editingKey = $('layerSel').value; renderFields(); };
const field = (label, key, type = 'number', opts = {}) => `<div class="${opts.wide ? 'wide' : ''}"><label class="f">${label}</label>${type === 'select' ? `<select data-k="${key}">${opts.options.map(o => `<option value="${esc(o.v)}"${String(o.v) === String(opts.value) ? ' selected' : ''}>${esc(o.l)}</option>`).join('')}</select>` : type === 'textarea' ? `<textarea data-k="${key}" rows="2">${esc(opts.value)}</textarea>` : `<input data-k="${key}" type="${type}" value="${esc(opts.value)}"${opts.step ? ` step="${opts.step}"` : ''}>`}</div>`;
function target() {
  if (!state.b || !editingKey) return null;
  const L = state.b.layout; const [kind, i] = editingKey.split(':');
  if (kind === 'background') return { kind, obj: L.background.base };
  if (kind === 'shape') return { kind, obj: L.background.shapes[+i], list: L.background.shapes, i: +i };
  if (kind === 'image') return { kind, obj: L.images[+i], list: L.images, i: +i };
  if (kind === 'text') return { kind, obj: L.texts[+i], list: L.texts, i: +i };
  return null;
}
function renderFields() {
  const t = target(); const el = $('fields'); if (!t) { el.innerHTML = ''; return; }
  const o = t.obj; let h = '';
  if (t.kind === 'background') {
    h += field('종류', 'kind', 'select', { options: [{ v: 'solid', l: '단색' }, { v: 'linear', l: '선형 그라데이션' }, { v: 'radial', l: '원형 그라데이션' }], value: o.kind });
    h += field('색 1', 'colors.0', 'text', { value: o.colors[0] ?? '' }) + field('색 2', 'colors.1', 'text', { value: o.colors[1] ?? '' }) + field('색 3', 'colors.2', 'text', { value: o.colors[2] ?? '' });
    h += field('각도', 'angle', 'number', { value: o.angle });
  } else if (t.kind === 'shape') {
    h += field('모양', 'kind', 'select', { options: [{ v: 'rect', l: '사각' }, { v: 'ellipse', l: '원' }], value: o.kind });
    for (const k of ['x', 'y', 'w', 'h']) h += field(k.toUpperCase(), k, 'number', { value: o[k] });
    h += field('색', 'color', 'text', { value: o.color }) + field('불투명', 'opacity', 'number', { value: o.opacity, step: '0.05' }) + field('모서리', 'radius', 'number', { value: o.radius }) + field('블러', 'blur', 'number', { value: o.blur });
  } else if (t.kind === 'image') {
    for (const k of ['x', 'y', 'w', 'h']) h += field(k.toUpperCase(), k, 'number', { value: o[k] });
    if (o.id === 'kv') { for (const k of ['x', 'y', 'w', 'h']) h += field('crop ' + k, 'crop.' + k, 'number', { value: o.crop[k], step: '0.01' }); h += field('녹임', 'fade', 'select', { options: ['none', 'left', 'right', 'top', 'bottom'].map(v => ({ v, l: v })), value: o.fade }); h += field('불투명', 'opacity', 'number', { value: o.opacity, step: '0.05' }); }
  } else if (t.kind === 'text') {
    h += field('역할', 'role', 'select', { options: TEXT_ROLES.map(v => ({ v, l: ROLE_LABEL[v] })), value: o.role });
    h += field('문구 (줄바꿈 = Enter)', 'text', 'textarea', { value: o.text, wide: true });
    for (const k of ['x', 'y', 'w']) h += field(k.toUpperCase(), k, 'number', { value: o[k] });
    h += field('크기', 'size', 'number', { value: o.size }) + field('굵기', 'weight', 'select', { options: WEIGHTS.map(v => ({ v, l: String(v) })), value: o.weight }) + field('색', 'color', 'text', { value: o.color });
    h += field('정렬', 'align', 'select', { options: [{ v: 'left', l: '왼쪽' }, { v: 'center', l: '가운데' }, { v: 'right', l: '오른쪽' }], value: o.align }) + field('행간', 'lineHeight', 'number', { value: o.lineHeight, step: '0.05' }) + field('자간(em)', 'letterSpacing', 'number', { value: o.letterSpacing, step: '0.01' });
  }
  el.innerHTML = h;
  el.querySelectorAll('[data-k]').forEach(inp => inp.onchange = () => applyEdit(inp.dataset.k, inp.tagName === 'SELECT' || inp.type === 'text' || inp.tagName === 'TEXTAREA' ? inp.value : Number(inp.value)));
}
async function applyEdit(key, value) {
  const t = target();
  if (t && key !== '__noop') {
    const path = key.split('.'); let o = t.obj;
    for (let i = 0; i < path.length - 1; i++) o = o[path[i]] ?? (o[path[i]] = {});
    const last = path.at(-1);
    if (key.startsWith('colors.')) { const arr = t.obj.colors; const idx = +last; if (value) arr[idx] = value; else arr.splice(idx, 1); }
    else o[last] = key === 'weight' ? Number(value) : value;
  }
  // 서버와 같은 검증 — 고정 조건(안전영역·글자 크기·로고 비율…)은 편집으로도 못 넘는다
  const r = validateLayout(state.b.layout, state.b.fixed);
  state.b.layout = r.layout; state.b.edits++;
  if (r.fixes.length) toast('고정 조건으로 되돌림: ' + r.fixes.join(' · '), 4000);
  await drawB(); fillEditor();
}
$('addText').onclick = () => { const B = state.b; const f = B.fixed; B.layout.texts.push({ role: 'sub', text: '새 문구', x: f.safe.left, y: f.safe.top, w: Math.round(f.w / 2), size: f.fontSize.min, weight: 700, color: B.layout.texts[0]?.color ?? '#222222', align: 'left', lineHeight: 1.25, letterSpacing: 0 }); editingKey = `text:${B.layout.texts.length - 1}`; applyEdit('__noop', 0); };
$('addShape').onclick = () => { const B = state.b; B.layout.background.shapes.push({ kind: 'rect', x: 0, y: 0, w: Math.round(B.fixed.w / 3), h: Math.round(B.fixed.h / 3), color: brand().primary ?? '#000000', opacity: 0.2, radius: 0, blur: 0 }); editingKey = `shape:${B.layout.background.shapes.length - 1}`; applyEdit('__noop', 0); };
$('delLayer').onclick = () => { const t = target(); if (!t?.list) return toast('배경은 지울 수 없어요'); if (t.kind === 'image') return toast('그림 층은 지우지 않아요(필수) — 크기·위치를 바꾸세요'); t.list.splice(t.i, 1); editingKey = null; applyEdit('__noop', 0); };
function editStatus() { const B = state.b; if (!B) return; $('editSt').textContent = `수정 ${B.edits}회 · ${B.done ? `완료 ${fmtMs(B.editMs)}` : `경과 ${fmtMs(performance.now() - B.t0)}`}`; }
setInterval(editStatus, 1000);
$('editDone').onclick = () => { const B = state.b; if (!B) return; B.editMs = performance.now() - B.t0; B.done = true; editStatus(); toast(`B 수정 완료 — ${B.edits}회 · ${fmtMs(B.editMs)}`); };

/* ── 저장·복사 ── */
async function savePng(track) {
  const T = state[track]; if (!T?.html) return toast(`${track.toUpperCase()} 결과가 없어요`);
  const spec = SPECS[T.specId];
  try { download(await rasterize(T.html, spec.w, spec.h, 1, 'png'), `${state.caseLabel}_${spec.id}_${track.toUpperCase()}.png`); } catch (e) { toast('PNG 실패: ' + e.message); }
}
$('aPng').onclick = () => savePng('a'); $('bPng').onclick = () => savePng('b');
$('aHtml').onclick = () => state.a && navigator.clipboard.writeText(state.a.html).then(() => toast('A HTML 복사'));
$('bHtml').onclick = () => state.b && navigator.clipboard.writeText(state.b.html).then(() => toast('B HTML 복사'));
// 저장해 둔 B 결과(JSON 내려받기 · scripts/ab-run.mjs 의 *_B.json) 다시 열기 — API 없이 렌더·편집·기록
async function loadB(j, label = '') {
  if (!j?.layout || !j?.fixed) throw new Error('layout · fixed 가 있는 B JSON 이어야 합니다');
  if (!state.kv) throw new Error('키비주얼을 먼저 올리거나 샘플을 불러 주세요(그림은 JSON 에 없습니다)');
  const spec = SPECS[j.fixed.specId] ?? SPECS[specId()]; if (!spec) throw new Error('규격을 모름: ' + j.fixed.specId);
  $('specSel').value = spec.id; specInfo();
  const res = { layout: j.layout, fixed: j.fixed, fixes: j.fixes ?? [], unresolved: j.unresolved ?? [], usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, ...(j.usage ?? {}) }, cost: j.cost ?? 0, calls: j.calls ?? 0, ms: j.ms ?? 0, clientMs: 0, model: j.model ?? '(불러옴)', effort: j.effort ?? '–', rationale: j.rationale ?? '', prompt: j.prompt ?? { system: '', user: '(불러온 JSON — 프롬프트 없음)' } };
  state.b = { res, layout: structuredClone(j.layout), fixed: j.fixed, edits: 0, t0: performance.now(), editMs: null, done: false, specId: spec.id, model: res.model, effort: res.effort };
  await drawB(); fillEditor();
  $('bFixes').innerHTML = [...res.fixes.map(s => `<li>고침: ${esc(s)}</li>`), ...res.unresolved.map(s => `<li style="color:var(--danger)">미해결: ${esc(s)}</li>`)].join('') || '<li>고친 것 없음</li>';
  $('bPrompt').textContent = res.prompt.user ? `[user]\n${res.prompt.user}` : '';
  $('editor').hidden = false; toast(`B JSON 불러옴${label ? ' — ' + label : ''}`);
}
$('bLoad').onclick = () => $('bLoadFile').click();
$('bLoadFile').onchange = async () => { const f = $('bLoadFile').files[0]; if (!f) return; try { await loadB(JSON.parse(await f.text()), f.name); } catch (e) { toast(e.message, 5000); } };
$('bJson').onclick = () => state.b && downloadText(JSON.stringify({ layout: state.b.layout, fixed: state.b.fixed, fixes: state.b.res.fixes, usage: state.b.res.usage, cost: state.b.res.cost, model: state.b.res.model }, null, 2), `${state.caseLabel}_${state.b.specId}_B.json`, 'application/json');

/* ── 비교 기록 ── */
const loadRec = () => { try { return JSON.parse(localStorage.getItem(LS_REC) || '[]'); } catch { return []; } };
const saveRec = r => localStorage.setItem(LS_REC, JSON.stringify(r));
function addRecord() {
  if (!state.a && !state.b) return toast('먼저 A 또는 B 를 그려 주세요');
  const A = state.a, B = state.b;
  const rec = {
    at: new Date().toISOString(), case: state.caseLabel, spec: B?.specId ?? A?.specId, model: B ? `${PRICES[B.model]?.label ?? B.model} · ${B.effort}` : '–',
    scores: { aQ: null, bQ: null, aR: null, bR: null }, note: '',
    aChecks: A ? checkSummary(A.checks) : '–', bChecks: B ? checkSummary(B.checks) : '–',
    aEdit: '', bEdit: B ? `${B.edits}회 · ${B.done ? fmtMs(B.editMs) : '미완료'}` : '–',
    aMs: A ? fmtMs(A.ms) : '–', bMs: B ? `${fmtMs(B.res.ms)} (${B.res.calls}회)` : '–',
    usage: B ? `입 ${B.res.usage.input_tokens.toLocaleString()} · 출 ${B.res.usage.output_tokens.toLocaleString()} · ${B.res.calls}요청 · $${B.res.cost}` : '–',
    bFixes: B ? B.res.fixes.length : null,
  };
  const r = loadRec(); r.push(rec); saveRec(r); renderRecords(); toast('표에 추가 — 사람 평가 칸을 채워 주세요');
}
function renderRecords() {
  const r = loadRec(); const tb = $('recTbl').tBodies[0];
  const num = (i, k, v) => `<input type="number" min="1" max="5" data-i="${i}" data-k="${k}" value="${v ?? ''}">`;
  tb.innerHTML = r.map((x, i) => `<tr>
    <td>${i + 1}</td><td>${esc(x.case)}<br><span class="mini">${esc(x.at.slice(0, 16).replace('T', ' '))}</span></td><td>${esc(x.spec)}</td><td>${esc(x.model)}</td>
    <td>${num(i, 'aQ', x.scores.aQ)} / ${num(i, 'bQ', x.scores.bQ)}</td><td>${num(i, 'aR', x.scores.aR)} / ${num(i, 'bR', x.scores.bR)}</td>
    <td>A ${esc(x.aChecks)}<br>B ${esc(x.bChecks)}${x.bFixes != null ? `<br><span class="mini">서버 고침 ${x.bFixes}건</span>` : ''}</td>
    <td><input type="text" data-i="${i}" data-k="aEdit" value="${esc(x.aEdit)}" placeholder="예: 3회 · 4분" style="min-width:90px"> / ${esc(x.bEdit)}</td>
    <td>${esc(x.aMs)} / ${esc(x.bMs)}</td><td>${esc(x.usage)}</td>
    <td><input type="text" data-i="${i}" data-k="note" value="${esc(x.note)}"></td><td><button class="sm" data-del="${i}">삭제</button></td></tr>`).join('') || '<tr><td colspan="12" class="mini">아직 기록이 없습니다.</td></tr>';
  tb.querySelectorAll('input').forEach(inp => inp.onchange = () => { const r = loadRec(); const x = r[+inp.dataset.i]; const k = inp.dataset.k; if (k in x.scores) x.scores[k] = inp.value === '' ? null : Number(inp.value); else x[k] = inp.value; saveRec(r); });
  tb.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const r = loadRec(); r.splice(+b.dataset.del, 1); saveRec(r); renderRecords(); });
}
const toMd = r => ['| # | 케이스 | 규격 | B 모델 | 디자인 품질 A/B | 요구 반영 A/B | 규정 준수 A | 규정 준수 B | 수정 A | 수정 B | 생성 A | 생성 B | API 사용량(B) | 메모 |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...r.map((x, i) => `| ${i + 1} | ${x.case} | ${x.spec} | ${x.model} | ${x.scores.aQ ?? '–'} / ${x.scores.bQ ?? '–'} | ${x.scores.aR ?? '–'} / ${x.scores.bR ?? '–'} | ${x.aChecks} | ${x.bChecks}${x.bFixes != null ? ` (서버 고침 ${x.bFixes})` : ''} | ${x.aEdit || '–'} | ${x.bEdit} | ${x.aMs} | ${x.bMs} | ${x.usage} | ${x.note} |`)].join('\n');
$('recAdd').onclick = addRecord;
$('recMd').onclick = () => navigator.clipboard.writeText(toMd(loadRec())).then(() => toast('Markdown 표 복사'));
$('recJson').onclick = () => downloadText(JSON.stringify(loadRec(), null, 2), `ab-records_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
$('recClear').onclick = () => { if (confirm('비교 기록을 모두 지울까요?')) { saveRec([]); renderRecords(); } };
renderRecords();
health();

// 테스트·콘솔에서 들여다볼 수 있게
window.__ab = { state, runA, runB, loadB, setKv, validateLayout, renderLayout, buildFixed, SPECS };
