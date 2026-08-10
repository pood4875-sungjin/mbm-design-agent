// Campaign Agent — 도구형 앞문 (챗봇 아님).
// 홈(입력 우선) → 인테이크 시트(질문지 한 장) → 아트보드 워크스페이스(줌·팬·선택·즉시 편집).
// 편집: 우측 인스펙터 — 선택 없음 = 캠페인 전체(타이핑 즉시 전 산출물 일괄 반영),
//        산출물 선택 = 그것만 즉시 반영(override, 일괄 반영에서 보존).

import { createContext, updateContext, missingFields, CORE_FIELDS } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS } from '../core/contract.js';
import { registerAll, generateArtifacts, logEvent } from '../core/generate.js';
import { propagate } from '../core/propagate.js';
import * as LLM from './llm.js';
import { rasterize, download, downloadText, openPrintPdf } from './raster.js';

const FIELD_LABEL = {
  name: '행사명', date: '일시', venue: '장소', audience: '대상', cta: 'CTA',
  senderName: '발신자명', subject: '메일 제목', formFields: '등록 폼 항목', printSize: '인쇄 규격',
};
const CHANNEL_LABEL = {
  banner: '홍보 배너', edm: 'eDM', landing: '랜딩페이지',
  poster: '포스터', xbanner: 'X배너', hyunsumak: '현수막',
};
const CHANNEL_DESC = {
  banner: '3규격 · PNG', edm: '이메일 HTML', landing: '등록 폼 포함',
  poster: 'A2 · 인쇄 PDF', xbanner: '600×1800 · PDF', hyunsumak: '인쇄 PDF',
};
const ONLINE = ['edm', 'landing', 'banner'];
const OFFLINE = ['poster', 'xbanner', 'hyunsumak'];
const VARIANTS = { banner: 3, landing: 2, poster: 2, xbanner: 2, hyunsumak: 2, edm: 1 };
const DISPLAY_SCALE = { banner: 1, edm: 0.62, landing: 0.42, poster: 0.28, xbanner: 0.1, hyunsumak: 0.05 };
const STORE_LS = 'mbm-campaigns';

const SAMPLES = [
  '10월 15일 코엑스에서 2026 ONSITE MBM 서울 진행. 대상은 건설 구조 엔지니어, 사전등록 받아야 함. eDM이랑 랜딩페이지, 배너, 포스터, X배너 필요해.',
  '내년 3월 킨텍스 MBM 신제품 발표회. 교량 설계 실무자 대상, 현장 데모 신청 유도. 랜딩이랑 현수막, 배너만.',
  '2026 ONSITE MBM 도쿄 — 6월 20일, 대상 일본 파트너사. eDM과 포스터.',
];

const state = {
  intake: { fields: {}, channels: [], extra: {}, kv: null },
  campaign: null,
  selected: null,          // specId | null
  zoom: 1, panX: 0, panY: 0,
};
const $ = id => document.getElementById(id);
const frames = new Map();  // specId → {frame, iframe, badge}

/* ═══ helpers ═══ */
function toast(t) {
  const el = $('toast'); el.textContent = t; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2400);
}
function log(text) {
  const d = document.createElement('div');
  d.textContent = text;
  $('logBody').prepend(d);
  $('logCount').textContent = $('logBody').children.length;
}
function show(view) {
  for (const v of ['home', 'intake', 'work']) $(v).style.display = v === view ? (v === 'home' ? 'flex' : 'block') : 'none';
  $('campPill').style.display = view === 'work' ? 'block' : 'none';
  $('approveAll').style.display = view === 'work' ? 'block' : 'none';
  $('exportAll').style.display = view === 'work' ? 'block' : 'none';
  if (view === 'home') renderSidebar();
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ═══ modal ═══ */
function modal({ title, desc, body, actions }) {
  $('modalTitle').textContent = title;
  $('modalDesc').textContent = desc ?? '';
  $('modalBody').innerHTML = body;
  const btns = $('modalBtns'); btns.innerHTML = '';
  for (const a of actions) {
    const b = document.createElement('button');
    b.className = 'btn' + (a.pri ? ' pri' : '');
    b.textContent = a.label;
    b.onclick = () => { if (a.fn && a.fn() === false) return; closeModal(); };
    btns.appendChild(b);
  }
  $('overlay').style.display = 'flex';
}
function closeModal() { $('overlay').style.display = 'none'; }
$('overlay').onclick = e => { if (e.target === $('overlay')) closeModal(); };

/* ═══ brief parsing ═══ */
function parseBriefRegex(text) {
  const out = {};
  const nameM = text.match(/[\w가-힣 ]*MBM[\w가-힣 ]*/);
  if (nameM) {
    out.name = nameM[0].trim()
      .replace(/(진행|개최).*$/, '')
      .replace(/^\d{1,2}월\s?\d{1,2}일\s*/, '')
      .replace(/^[가-힣A-Za-z]+에서\s*/, '')
      .trim();
  }
  const dateM = text.match(/(\d{4}[-./년]\s?)?(\d{1,2})월\s?(\d{1,2})일/) || text.match(/\d{4}-\d{2}-\d{2}/);
  if (dateM) {
    if (dateM[0].includes('-')) out.date = dateM[0];
    else {
      const y = dateM[1] ? dateM[1].replace(/\D/g, '') : String(new Date().getFullYear());
      out.date = `${y}-${String(dateM[2]).padStart(2, '0')}-${String(dateM[3]).padStart(2, '0')}`;
    }
  }
  const venueM = text.match(/(코엑스|킨텍스|벡스코|세텍|엑스코|송도컨벤시아|[가-힣]+호텔)/);
  if (venueM) out.venue = venueM[0];
  const audM = text.match(/대상은?\s*([가-힣A-Za-z ,·]+?)(?:[,.]|이고|이며|$)/m);
  if (audM) out.audience = audM[1].trim();
  if (/사전\s?등록/.test(text)) out.cta = '사전등록';
  else if (/신청/.test(text)) out.cta = '신청하기';
  const channels = [];
  if (/eDM|이디엠|메일/i.test(text)) channels.push('edm');
  if (/랜딩/.test(text)) channels.push('landing');
  if (/(?<![Xx스])배너/.test(text)) channels.push('banner');
  if (/X\s?배너|엑스배너/i.test(text)) channels.push('xbanner');
  if (/포스터/.test(text)) channels.push('poster');
  if (/현수막/.test(text)) channels.push('hyunsumak');
  return { fields: out, channels: [...new Set(channels)] };
}

/* ═══ home ═══ */
function initHome() {
  const box = $('samples');
  box.innerHTML = '';
  for (const s of SAMPLES) {
    const b = document.createElement('button');
    b.textContent = s.slice(0, 34) + '…'; b.title = s;
    b.onclick = () => { $('briefText').value = s; };
    box.appendChild(b);
  }
  $('briefGo').onclick = () => {
    const t = $('briefText').value.trim();
    if (!t) { toast('기획 내용을 입력하세요'); return; }
    startIntake(t);
  };
  $('fileBtn').onclick = () => $('fileIn').click();
  $('fileIn').onchange = () => {
    const f = $('fileIn').files[0]; if (!f) return;
    if (!/\.(txt|md)$/i.test(f.name)) { toast('PPT·워드 파싱은 서버 연동 후 — 지금은 txt/md'); return; }
    const r = new FileReader();
    r.onload = () => { $('briefText').value = r.result.slice(0, 4000); toast(`${f.name} 읽음`); };
    r.readAsText(f);
  };
  $('searchIn').oninput = () => renderSidebar($('searchIn').value.trim());
  refreshAiChip();
}
function refreshAiChip() {
  $('aiChip').textContent = LLM.hasKey() ? `AI 해석 켜짐 · ${LLM.maskKey()}` : 'AI 해석 꺼짐 — 규칙 파서';
}

/* ═══ 자산 검색 사이드바 ═══ */
function loadStore() { try { return JSON.parse(localStorage.getItem(STORE_LS) || '[]'); } catch { return []; } }
function saveStore(list) { localStorage.setItem(STORE_LS, JSON.stringify(list)); }
function parseQuery(q) {
  const cond = {};
  const y = q.match(/20\d{2}/); if (y) cond.year = y[0];
  if (/작년/.test(q)) cond.year = String(new Date().getFullYear() - 1);
  const CH = { 배너: 'banner', 포스터: 'poster', X배너: 'xbanner', 엑스배너: 'xbanner', 현수막: 'hyunsumak', eDM: 'edm', 랜딩: 'landing' };
  for (const [k, v] of Object.entries(CH)) if (q.includes(k)) { cond.channel = v; break; }
  const kw = q.replace(/20\d{2}|작년|배너|포스터|X배너|엑스배너|현수막|eDM|랜딩(페이지)?/gi, '').replace(/\s+/g, ' ').trim();
  if (kw) cond.q = kw;
  return cond;
}
function renderSidebar(query = '') {
  const cond = query ? parseQuery(query) : {};
  const chips = $('qchips'); chips.innerHTML = '';
  if (query) for (const [k, v] of Object.entries(cond)) {
    const s = document.createElement('span');
    s.textContent = { year: `연도 ${v}`, channel: CHANNEL_LABEL[v] ?? v, q: `"${v}"` }[k];
    chips.appendChild(s);
  }
  let list = loadStore();
  if (cond.year) list = list.filter(c => (c.context.core.date ?? '').startsWith(cond.year));
  if (cond.channel) list = list.filter(c => c.channels.includes(cond.channel));
  if (cond.q) list = list.filter(c => (c.context.core.name ?? '').includes(cond.q));
  list.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  const box = $('campList'); box.innerHTML = '';
  $('campEmpty').style.display = list.length ? 'none' : 'block';
  if (query && !list.length) $('campEmpty').textContent = '조건에 맞는 캠페인이 없습니다 — 조건을 바꿔 다시 검색해 보세요.';
  for (const c of list) {
    const d = document.createElement('div');
    d.className = 'citem';
    const initial = (c.context.core.name ?? 'MB').replace(/[^A-Za-z가-힣0-9]/g, '').slice(0, 2) || 'MB';
    d.innerHTML = `<div class="thumb" style="background:${c.style.palette.primary}">${initial}</div>
      <div class="m"><b>${c.context.core.name ?? c.id}</b><span>${c.context.core.date ?? ''} · ${c.channels.length}채널 · ${c.artifacts?.length ?? 0}종</span></div>`;
    d.onclick = () => openStored(c);
    box.appendChild(d);
  }
}

/* ═══ intake — 질문지 한 장 ═══ */
async function startIntake(text) {
  let parsed = null;
  if (LLM.hasKey()) {
    toast('AI가 기획을 해석하는 중…');
    try {
      const r = await LLM.parseBriefLLM(text);
      parsed = { fields: {}, channels: r.channels ?? [] };
      for (const f of CORE_FIELDS) if (r[f]) parsed.fields[f] = r[f];
    } catch (e) { toast(`AI 해석 실패 — 규칙 파서로 진행`); }
  }
  if (!parsed) parsed = parseBriefRegex(text);
  state.intake = { fields: parsed.fields, channels: parsed.channels, extra: {}, kv: null };
  renderIntake();
  show('intake');
}

function renderIntake() {
  const it = state.intake;
  const foundN = CORE_FIELDS.filter(f => it.fields[f]).length;
  $('intakeSub').textContent = foundN
    ? `기획에서 ${foundN}개 항목을 읽었습니다. 빈칸을 채우고 산출물을 확정하면 바로 생성합니다.`
    : '기획에서 읽어낸 정보가 없어 직접 입력이 필요합니다.';
  $('coreFields').innerHTML = CORE_FIELDS.map(f => `
    <div class="f"><label>${FIELD_LABEL[f]} <span class="req">*</span></label>
    <input type="text" data-f="${f}" value="${it.fields[f] ?? ''}" class="${it.fields[f] ? '' : 'miss'}"></div>`).join('');
  const group = list => list.map(c => `
    <label class="chcard ${it.channels.includes(c) ? 'on' : ''}">
      <input type="checkbox" value="${c}" ${it.channels.includes(c) ? 'checked' : ''}>
      <span>${CHANNEL_LABEL[c]}<small>${CHANNEL_DESC[c]}</small></span></label>`).join('');
  $('chGrid').innerHTML = group(ONLINE) + group(OFFLINE);
  $('coreFields').querySelectorAll('input').forEach(i => i.oninput = () => {
    it.fields[i.dataset.f] = i.value.trim();
    i.classList.toggle('miss', !i.value.trim());
    validateIntake();
  });
  $('chGrid').querySelectorAll('input').forEach(i => i.onchange = () => {
    i.closest('.chcard').classList.toggle('on', i.checked);
    it.channels = [...$('chGrid').querySelectorAll('input:checked')].map(x => x.value);
    renderExtra(); validateIntake();
  });
  const thumb = $('kvThumb'), file = $('kvFile');
  thumb.onclick = () => file.click();
  file.onchange = () => {
    const f = file.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { it.kv = r.result; thumb.style.backgroundImage = `url(${it.kv})`; thumb.textContent = ''; };
    r.readAsDataURL(f);
  };
  renderExtra();
  validateIntake();
  $('genBtn').onclick = buildAndGenerate;
}

const EXTRA_FIELDS = { edm: ['senderName', 'subject'], landing: ['formFields'], poster: ['printSize'], xbanner: ['printSize'], hyunsumak: ['printSize'] };
function renderExtra() {
  const it = state.intake;
  const items = [];
  for (const ch of it.channels) for (const f of EXTRA_FIELDS[ch] ?? []) items.push([ch, f]);
  $('extraSec').style.display = items.length ? 'block' : 'none';
  $('extraFields').innerHTML = items.map(([ch, f]) => `
    <div class="f"><label>${CHANNEL_LABEL[ch]} — ${FIELD_LABEL[f]}</label>
    <input type="text" data-ch="${ch}" data-f="${f}" value="${it.extra[ch]?.[f] ?? ''}" placeholder="${f === 'printSize' ? '기본 규격' : ''}"></div>`).join('');
  $('extraFields').querySelectorAll('input').forEach(i => i.oninput = () => {
    (it.extra[i.dataset.ch] ??= {})[i.dataset.f] = i.value.trim();
  });
}
function validateIntake() {
  const it = state.intake;
  const missing = CORE_FIELDS.filter(f => !it.fields[f]);
  const ok = !missing.length && it.channels.length;
  $('genBtn').disabled = !ok;
  $('intakeNote').textContent = !it.channels.length
    ? '산출물을 하나 이상 선택하세요'
    : missing.length ? `필수 입력: ${missing.map(f => FIELD_LABEL[f]).join(', ')}` : `${specIdsFor(it.channels).length}종을 생성합니다`;
}
function specIdsFor(channels) {
  return Object.entries(SPECS).filter(([, s]) => channels.includes(s.channel)).map(([id]) => id);
}

/* ═══ 생성 → 아트보드 ═══ */
function slug(name) {
  return (name || 'campaign').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
}
function buildAndGenerate() {
  const it = state.intake;
  let ctx = createContext(it.fields);
  const extraPatch = {};
  for (const [ch, fields] of Object.entries(it.extra)) {
    extraPatch[ch] = {};
    for (const [f, v] of Object.entries(fields)) extraPatch[ch][f] = v || '기본';
  }
  for (const ch of it.channels) for (const f of EXTRA_FIELDS[ch] ?? []) (extraPatch[ch] ??= {})[f] ??= '기본';
  ctx = updateContext(ctx, { channelFields: extraPatch });
  const style = normalizeStyle({
    keyVisual: it.kv,
    colors: [$('c1').value.toUpperCase(), $('c2').value.toUpperCase()],
    fonts: { heading: $('fontSel').value, body: $('fontSel').value },
    mood: $('moodIn').value.split(',').map(s => s.trim()).filter(Boolean),
  });
  state.campaign = { id: slug(ctx.core.name), context: ctx, style, channels: it.channels, artifacts: [], log: [] };
  logEvent(state.campaign, 'campaign_created', {});
  registerAll();
  generateArtifacts(state.campaign);
  enterWork({ staged: true });
}

// 스켈레톤 → 하나씩 실제 산출물로 채워지는 연출 (생성이 눈에 보이게)
function revealStaged() {
  const ids = state.campaign.artifacts.map(a => a.specId);
  for (const id of ids) frames.get(id)?.frame.classList.add('gen');
  ids.forEach((id, i) => setTimeout(() => {
    const a = state.campaign.artifacts.find(x => x.specId === id);
    const f = frames.get(id);
    if (!f) return;
    f.frame.classList.remove('gen');
    f.iframe.style.visibility = 'visible';
    f.iframe.srcdoc = a.html;
    f.label.textContent = id;
    log(`생성: ${id}`);
    if (i === ids.length - 1) toast(`${ids.length}종 생성 완료`);
  }, 240 + i * 260));
}

function enterWork(opts = {}) {
  show('work');
  $('campPill').textContent = state.campaign.context.core.name;
  $('logBody').innerHTML = ''; $('logCount').textContent = '';
  state.selected = null;
  layoutArtboard({ blank: !!opts.staged });
  renderInspector();
  fitZoom();
  if (opts.staged) revealStaged();
}

/* ═══ 아트보드 ═══ */
function naturalSize(spec) {
  if (spec.unit === 'mm') {
    const k = 3.7795;
    return [(spec.wmm + spec.bleed * 2) * k, (spec.hmm + spec.bleed * 2) * k];
  }
  if (spec.channel === 'banner') return [spec.w, spec.h];
  if (spec.channel === 'edm') return [600, 900];
  return [1000, 1400];
}

function layoutArtboard(opts = {}) {
  const board = $('artboard');
  board.innerHTML = '';
  frames.clear();
  const rows = [ONLINE.filter(c => state.campaign.channels.includes(c)), OFFLINE.filter(c => state.campaign.channels.includes(c))];
  let y = 60;
  for (const rowChannels of rows) {
    if (!rowChannels.length) continue;
    let x = 60, rowH = 0;
    for (const ch of rowChannels) {
      for (const a of state.campaign.artifacts.filter(a => a.channel === ch)) {
        const spec = SPECS[a.specId];
        const [nw, nh] = naturalSize(spec);
        const ds = DISPLAY_SCALE[ch] ?? 1;
        const w = nw * ds, h = nh * ds;
        const frame = document.createElement('div');
        frame.className = 'frame';
        frame.style.left = x + 'px'; frame.style.top = y + 'px';
        frame.innerHTML = `
          <div class="flabel"><span class="fname">${opts.blank ? '생성 중…' : a.specId}</span><span class="badge ${a.status}">${badgeText(a.status)}</span>${spec.unit === 'mm' ? `<span style="font-weight:400;font-size:11px">${spec.wmm}×${spec.hmm}mm</span>` : ''}</div>
          <div class="fbody" style="width:${w}px;height:${h}px">
            <iframe width="${nw}" height="${nh}" style="transform:scale(${ds})"></iframe>
            <div class="hit"></div>
          </div>`;
        const iframe = frame.querySelector('iframe');
        if (opts.blank) iframe.style.visibility = 'hidden'; else iframe.srcdoc = a.html;
        frame.querySelector('.hit').onclick = e => { e.stopPropagation(); select(a.specId); };
        board.appendChild(frame);
        frames.set(a.specId, { frame, iframe, badge: frame.querySelector('.badge'), label: frame.querySelector('.fname') });
        x += w + 70;
        rowH = Math.max(rowH, h);
      }
    }
    y += rowH + 130;
    state.boardW = Math.max(state.boardW ?? 0, x);
  }
  state.boardH = y;
}
function badgeText(s) { return { draft: 'DRAFT', approved: '승인됨', needsReview: '확인 필요' }[s] ?? s; }

function refreshFrames(only = null) {
  for (const a of state.campaign.artifacts) {
    if (only && a.specId !== only) continue;
    const f = frames.get(a.specId);
    if (!f) continue;
    f.iframe.srcdoc = a.html;
    f.badge.className = 'badge ' + a.status;
    f.badge.textContent = badgeText(a.status);
  }
}

/* zoom · pan */
function applyTransform() {
  $('artboard').style.transform = `translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
  $('zoomPct').textContent = Math.round(state.zoom * 100) + '%';
}
function setZoom(z, cx, cy) {
  z = Math.min(2, Math.max(0.08, z));
  const vp = $('viewport').getBoundingClientRect();
  cx = cx ?? vp.width / 2; cy = cy ?? vp.height / 2;
  const wx = (cx - state.panX) / state.zoom, wy = (cy - state.panY) / state.zoom;
  state.zoom = z;
  state.panX = cx - wx * z; state.panY = cy - wy * z;
  applyTransform();
}
function fitZoom() {
  const vp = $('viewport').getBoundingClientRect();
  const z = Math.min((vp.width - 320) / (state.boardW || 1000), (vp.height - 80) / (state.boardH || 800), 1);
  state.zoom = Math.max(0.08, z);
  state.panX = 20; state.panY = 10;
  applyTransform();
}
$('zIn').onclick = () => setZoom(state.zoom * 1.25);
$('zOut').onclick = () => setZoom(state.zoom / 1.25);
$('zFit').onclick = fitZoom;
{
  const vp = $('viewport');
  let panning = false, sx = 0, sy = 0;
  vp.addEventListener('pointerdown', e => {
    if (e.target.closest('.hit')) return;
    panning = true; sx = e.clientX - state.panX; sy = e.clientY - state.panY;
    vp.classList.add('panning'); vp.setPointerCapture(e.pointerId);
    if (!e.target.closest('.frame')) select(null);
  });
  vp.addEventListener('pointermove', e => {
    if (!panning) return;
    state.panX = e.clientX - sx; state.panY = e.clientY - sy;
    applyTransform();
  });
  vp.addEventListener('pointerup', () => { panning = false; vp.classList.remove('panning'); });
  vp.addEventListener('wheel', e => {
    e.preventDefault();
    const r = vp.getBoundingClientRect();
    setZoom(state.zoom * (e.deltaY < 0 ? 1.09 : 0.92), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
}

/* ═══ 선택 · 인스펙터 ═══ */
function select(specId) {
  state.selected = specId;
  for (const [id, f] of frames) f.frame.classList.toggle('sel', id === specId);
  renderInspector();
}

function renderInspector() {
  const insp = $('inspector');
  const c = state.campaign;
  if (!state.selected) {
    insp.innerHTML = `
      <h3>CAMPAIGN <span class="mode">전체 일괄</span></h3>
      <div class="hint">값을 바꾸면 전 산출물에 즉시 반영됩니다. 산출물을 클릭하면 개별 편집으로 전환.</div>
      ${['name', 'date', 'venue', 'cta'].map(f => `<label>${FIELD_LABEL[f]}</label><input type="text" data-f="${f}" value="${c.context.core[f] ?? ''}">`).join('')}
      <h3 style="margin-top:18px">STYLE</h3>
      <label>컬러 (메인 · 배경)</label>
      <div style="display:flex;gap:8px">
        <input type="color" class="swatch" id="iColor1" value="${c.style.palette.primary}">
        <input type="color" class="swatch" id="iColor2" value="${c.style.palette.bg}">
      </div>
      <label>폰트</label>
      <select id="iFont"><option>Pretendard</option><option>Noto Sans KR</option><option>Apple SD Gothic Neo</option></select>
      <div id="inspNote"></div>`;
    insp.querySelector('#iFont').value = c.style.fonts.heading;
    insp.querySelectorAll('input[data-f]').forEach(i => i.oninput = debounce(() => {
      const f = i.dataset.f, v = i.value.trim();
      if (v === (c.context.core[f] ?? '')) return;
      const { impacted, conflicts } = propagate(c, { [f]: v });
      refreshFrames();
      $('inspNote').textContent = conflicts.length
        ? `${impacted.length}종 반영 · ${conflicts.length}건은 개별 편집값 유지(확인 필요)`
        : `${impacted.length}종 즉시 반영됨`;
      log(`${FIELD_LABEL[f]} → ${v} (${impacted.length}종 일괄${conflicts.length ? `, 충돌 ${conflicts.length}` : ''})`);
    }, 450));
    const styleChange = debounce(() => {
      c.style = normalizeStyle({
        keyVisual: c.style.keyVisual,
        colors: [insp.querySelector('#iColor1').value.toUpperCase(), insp.querySelector('#iColor2').value.toUpperCase()],
        fonts: { heading: insp.querySelector('#iFont').value, body: insp.querySelector('#iFont').value },
        mood: c.style.mood,
      });
      logEvent(c, 'style_changed', {});
      generateArtifacts(c);
      refreshFrames();
      $('inspNote').textContent = '스타일 전체 반영됨';
      log('스타일 변경 → 전체 재생성');
    }, 350);
    insp.querySelector('#iColor1').oninput = styleChange;
    insp.querySelector('#iColor2').oninput = styleChange;
    insp.querySelector('#iFont').onchange = styleChange;
    return;
  }

  const a = c.artifacts.find(x => x.specId === state.selected);
  const nVar = VARIANTS[a.channel] ?? 1;
  insp.innerHTML = `
    <h3>${a.specId} <span class="mode">개별 편집</span></h3>
    <div class="hint">이 산출물에서만 다르게 표기할 값. 비우면 공통값. 개별 값은 일괄 반영에서 보존됩니다.</div>
    ${['name', 'date', 'venue', 'cta'].map(f => `
      <label>${FIELD_LABEL[f]} <span style="opacity:.55">공통: ${c.context.core[f] ?? '—'}</span></label>
      <input type="text" data-f="${f}" value="${a.overrides.core?.[f] ?? ''}" placeholder="${c.context.core[f] ?? ''}">`).join('')}
    ${nVar > 1 ? `<label>레이아웃 시안</label><div class="vseg">${Array.from({ length: nVar }, (_, i) =>
      `<button data-v="${i}" class="${(a.variant ?? 0) === i ? 'on' : ''}">${i + 1}</button>`).join('')}</div>` : ''}
    <div class="row">
      <button class="btn" id="iOpen">크게</button>
      <button class="btn pri" id="iExp">내보내기</button>
      <button class="btn" id="iDesel">해제</button>
    </div>
    <div id="inspNote"></div>`;
  insp.querySelectorAll('input[data-f]').forEach(i => i.oninput = debounce(() => {
    const f = i.dataset.f, v = i.value.trim();
    const o = { ...(a.overrides.core ?? {}) };
    if (v && v !== (c.context.core[f] ?? '')) o[f] = v; else delete o[f];
    a.overrides.core = o;
    a.status = 'draft';
    logEvent(c, 'manual_edit', { specId: a.specId });
    generateArtifacts(c);
    refreshFrames(a.specId);
    $('inspNote').textContent = '이 산출물만 반영됨';
    log(`${a.specId} 개별 편집 (${FIELD_LABEL[f]})`);
  }, 450));
  insp.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
    a.variant = Number(b.dataset.v);
    a.status = 'draft';
    logEvent(c, 'variation_cycled', { specId: a.specId, variant: a.variant });
    generateArtifacts(c);
    refreshFrames(a.specId);
    renderInspector();
    log(`${a.specId} 시안 ${a.variant + 1}`);
  });
  insp.querySelector('#iOpen').onclick = () => { const w = window.open('', '_blank'); w.document.write(a.html); w.document.close(); };
  insp.querySelector('#iExp').onclick = () => exportArtifactModal(a);
  insp.querySelector('#iDesel').onclick = () => select(null);
}

/* ═══ 내보내기 ═══ */
function exportArtifactModal(a) {
  const spec = SPECS[a.specId];
  if (spec.channel === 'banner') {
    modal({
      title: `${a.specId} 내보내기`,
      desc: '온라인 배너 — 이미지 파일로 내보냅니다. 배수를 고르면 고해상도로 뽑힙니다.',
      body: `
        <label>포맷</label>
        <div class="vseg" id="expFmt"><button data-v="png" class="on">PNG</button><button data-v="jpg">JPG</button></div>
        <label>배수 (해상도)</label>
        <div class="vseg" id="expScale">${[1, 2, 3, 4].map(s => `<button data-v="${s}" class="${s === 2 ? 'on' : ''}">${s}x</button>`).join('')}</div>
        <div style="font-size:11.5px;color:var(--sub);margin-top:8px" id="expDim"></div>`,
      actions: [
        { label: '닫기' },
        { label: '다운로드', pri: true, fn: () => { doBannerExport(a); return false; } },
      ],
    });
    const upd = () => {
      const s = Number($('modalBody').querySelector('#expScale .on').dataset.v);
      $('modalBody').querySelector('#expDim').textContent = `${spec.w * s} × ${spec.h * s}px`;
    };
    for (const segId of ['expFmt', 'expScale']) {
      $('modalBody').querySelectorAll(`#${segId} button`).forEach(b => b.onclick = () => {
        $('modalBody').querySelectorAll(`#${segId} button`).forEach(x => x.classList.remove('on'));
        b.classList.add('on'); upd();
      });
    }
    upd();
    return;
  }
  if (spec.channel === 'edm' || spec.channel === 'landing') {
    modal({
      title: `${a.specId} 내보내기`,
      desc: spec.channel === 'edm'
        ? '이메일 호환 HTML — 메일 도구에 붙여넣거나 업로드해 사용합니다. (HubSpot 자동 등록은 추후)'
        : '자기완결 HTML 패키지 — 어디든 게시할 수 있습니다.',
      body: '',
      actions: [
        { label: '닫기' },
        { label: 'HTML 다운로드', pri: true, fn: () => { downloadText(a.html, `${a.specId}.html`); log(`내보내기: ${a.specId}.html`); } },
      ],
    });
    return;
  }
  // 인쇄물
  modal({
    title: `${a.specId} 내보내기`,
    desc: '인쇄 가이드 적용 — 재단 여백(블리드) 포함 실측 규격의 PDF로 저장됩니다.',
    body: `<div style="font-size:12.5px;color:var(--sub);line-height:1.7">
      · 용지: <b>${spec.wmm + spec.bleed * 2} × ${spec.hmm + spec.bleed * 2}mm</b> (재단 ${spec.wmm}×${spec.hmm} + 블리드 ${spec.bleed}mm)<br>
      · 인쇄 대화상자에서 <b>"PDF로 저장"</b> · 여백 없음 · 배율 100%<br>
      · 인디자인 작업 시 이 PDF를 배치(Place)해 사용<br>
      · 대량·자동 변환은 <code>scripts/demo.js</code>(Chrome headless)</div>`,
    actions: [
      { label: '닫기' },
      { label: 'HTML', fn: () => { downloadText(a.html, `${a.specId}.html`); } },
      { label: 'PDF로 저장', pri: true, fn: () => { openPrintPdf(a.html); log(`내보내기: ${a.specId} PDF`); } },
    ],
  });
}

async function doBannerExport(a) {
  const spec = SPECS[a.specId];
  const fmt = $('modalBody').querySelector('#expFmt .on').dataset.v;
  const s = Number($('modalBody').querySelector('#expScale .on').dataset.v);
  toast('이미지 생성 중…');
  try {
    const blob = await rasterize(a.html, spec.w, spec.h, s, fmt);
    download(blob, `${a.specId}@${s}x.${fmt}`);
    log(`내보내기: ${a.specId}@${s}x.${fmt}`);
    closeModal();
  } catch (e) { toast(`실패: ${e.message}`); }
}

function exportAllModal() {
  const c = state.campaign;
  const banners = c.artifacts.filter(a => a.channel === 'banner');
  const htmls = c.artifacts.filter(a => ['edm', 'landing'].includes(a.channel));
  const prints = c.artifacts.filter(a => !['edm', 'landing', 'banner'].includes(a.channel));
  modal({
    title: '전체 내보내기',
    desc: '온라인은 파일로 즉시, 인쇄물은 산출물별 PDF 저장으로 진행합니다.',
    body: `<div style="font-size:12.5px;color:var(--sub);line-height:1.8">
      · 온라인 HTML — ${htmls.map(a => a.specId).join(', ') || '없음'}<br>
      · 배너 PNG 2x — ${banners.map(a => a.specId).join(', ') || '없음'}<br>
      · 인쇄 PDF — ${prints.map(a => a.specId).join(', ') || '없음'} <span style="opacity:.7">(각각 인쇄 대화상자)</span></div>`,
    actions: [
      { label: '닫기' },
      { label: 'HTML 일괄', fn: () => { htmls.forEach(a => downloadText(a.html, `${a.specId}.html`)); log(`내보내기: HTML ${htmls.length}개`); } },
      { label: '배너 PNG 2x 일괄', pri: true, fn: () => { batchBanners(banners); return false; } },
    ],
  });
}
async function batchBanners(banners) {
  toast('배너 이미지 생성 중…');
  for (const a of banners) {
    const spec = SPECS[a.specId];
    try { download(await rasterize(a.html, spec.w, spec.h, 2, 'png'), `${a.specId}@2x.png`); } catch {}
  }
  log(`내보내기: 배너 PNG 2x ${banners.length}개`);
  closeModal();
}
$('exportAll').onclick = () => exportAllModal();

/* ═══ 지시 바 ═══ */
function parseCommandRegex(text) {
  const patch = {};
  const venue = text.match(/(?:장소|장소를)\s*([가-힣A-Za-z0-9 ]+?)\s*(?:으로|로)\s*(?:변경|바꿔|수정)/);
  if (venue) patch.venue = venue[1].trim();
  const date = text.match(/(?:일시|날짜)를?\s*([\d\-\.년월일\s]+?)\s*(?:으로|로)\s*(?:변경|바꿔|수정)/);
  if (date) patch.date = date[1].trim();
  const cta = text.match(/CTA를?\s*([가-힣A-Za-z0-9 ]+?)\s*(?:으로|로)\s*(?:변경|바꿔|수정)/i);
  if (cta) patch.cta = cta[1].trim();
  return Object.keys(patch).length ? patch : null;
}
async function onCommand(text) {
  const c = state.campaign;
  if (/다른\s*시안|시안\s*바꿔/.test(text)) {
    for (const a of c.artifacts) if ((VARIANTS[a.channel] ?? 1) > 1) a.variant = ((a.variant ?? 0) + 1) % VARIANTS[a.channel];
    generateArtifacts(c);
    refreshFrames();
    log('전체 시안 사이클');
    toast('전 산출물 레이아웃 시안 변경');
    return;
  }
  let patch = parseCommandRegex(text);
  if (!patch && LLM.hasKey()) {
    toast('지시 해석 중…');
    try { patch = await LLM.parseCommandLLM(text); } catch {}
    if (patch && !Object.keys(patch).length) patch = null;
  }
  if (!patch) { toast('이해 못함 — 예: "장소 킨텍스로 변경" · "다른 시안"'); return; }
  const { impacted, conflicts } = propagate(c, patch);
  refreshFrames();
  renderInspector();
  log(`지시: ${Object.entries(patch).map(([f, v]) => `${FIELD_LABEL[f]}→${v}`).join(', ')} (${impacted.length}종${conflicts.length ? `, 충돌 ${conflicts.length}` : ''})`);
  toast(`${impacted.length}종 일괄 반영${conflicts.length ? ` · ${conflicts.length}건 확인 필요` : ''}`);
}
$('cmdGo').onclick = () => { const t = $('cmdIn').value.trim(); if (t) { $('cmdIn').value = ''; onCommand(t); } };
$('cmdIn').onkeydown = e => { if (e.key === 'Enter') $('cmdGo').click(); };

/* ═══ 승인 · 저장 · 재열기 ═══ */
function approveAll() {
  const c = state.campaign;
  for (const a of c.artifacts) a.status = 'approved';
  logEvent(c, 'artifact_approved', { all: true });
  refreshFrames();
  const kpi = c.log.reduce((m, e) => (m[e.type] = (m[e.type] ?? 0) + 1, m), {});
  log(`전체 승인 — 생성 ${kpi.artifact_generated ?? 0} · 편집 ${kpi.manual_edit ?? 0} · 전파 ${kpi.propagation_run ?? 0}`);
  saveCampaignToStore();
  toast('전체 승인 — 홈 "내 캠페인"에 저장됨');
}
$('approveAll').onclick = approveAll;

function saveCampaignToStore() {
  const c = state.campaign;
  const snapshot = {
    id: c.id, savedAt: Date.now(),
    context: c.context, style: c.style, channels: c.channels,
    artifacts: c.artifacts.map(a => ({ specId: a.specId, channel: a.channel, overrides: a.overrides, variant: a.variant ?? 0, status: a.status })),
    log: c.log,
  };
  const list = loadStore().filter(x => x.id !== c.id);
  list.push(snapshot);
  try { saveStore(list); } catch {
    snapshot.style = { ...snapshot.style, keyVisual: null };
    try { saveStore(list); } catch { toast('저장 공간 부족 — 저장 실패'); }
  }
}

function openStored(saved) {
  state.campaign = { ...saved, log: saved.log ?? [] };
  registerAll();
  generateArtifacts(state.campaign);
  for (const a of state.campaign.artifacts) {
    const s = (saved.artifacts ?? []).find(x => x.specId === a.specId);
    if (s?.status) a.status = s.status;
  }
  logEvent(state.campaign, 'campaign_reopened', {});
  enterWork();
  log(`저장된 캠페인 재현: ${saved.context.core.name}`);
}

/* ═══ AI 키 ═══ */
$('keyBtn').onclick = () => {
  modal({
    title: 'AI 해석 설정 (BYOK)',
    desc: '개인 Anthropic API 키를 이 브라우저에만 저장합니다. 키가 있으면 기획·지시를 AI가 해석하고, 없으면 규칙 파서로 동작합니다.',
    body: `<label>API 키</label><input type="password" id="keyIn" value="${LLM.getKey()}" placeholder="sk-ant-...">`,
    actions: [
      { label: '지우기', fn: () => { LLM.setKey(''); refreshAiChip(); toast('키 삭제됨'); } },
      { label: '저장', pri: true, fn: () => { LLM.setKey($('modalBody').querySelector('#keyIn').value.trim()); refreshAiChip(); toast('키 저장됨'); } },
    ],
  });
};

/* ═══ boot ═══ */
$('homeBtn').onclick = () => show('home');
$('logHead').onclick = () => $('logCard').classList.toggle('open');
initHome();
show('home');
