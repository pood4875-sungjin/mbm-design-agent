// Campaign Agent — 도구형 앞문 (챗봇 아님).
// 홈(입력 우선) → 인테이크 시트(질문지 한 장) → 아트보드 워크스페이스(줌·팬·선택·즉시 편집).
// 편집: 우측 인스펙터 — 선택 없음 = 캠페인 전체(타이핑 즉시 전 산출물 일괄 반영),
//        산출물 선택 = 그것만 즉시 반영(override, 일괄 반영에서 보존).

import { createContext, updateContext, missingFields, CORE_FIELDS } from '../core/context.js';
import { normalizeStyle, cmykText } from '../core/style.js';
import { FONTS, FONT_IDS } from '../core/fonts.js';
import { extractPalette, analyzeRegion, buildPalette, TEXT_ZONES } from '../core/palette.js';
import { SPECS, PURPOSES, ARROWS, SIZE_PRESETS, purposesFor } from '../core/contract.js';
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
  intake: { fields: {}, channels: [], extra: {}, kv: null, logo: null, signage: {}, sizes: {}, mode: 'light', colors: ['#0A3D91', '#11095F', '#B56705'], font: 'Pretendard', mood: '', kvReadability: null, suggests: [], step: 0 },
  campaign: null,
  selected: null,          // specId | null
  zoom: 1, panX: 0, panY: 0,
};
const $ = id => document.getElementById(id);
const frames = new Map();  // artifact.key → {frame, iframe, badge, label}

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
  state.intake = { fields: parsed.fields, channels: parsed.channels, extra: {}, kv: null, logo: null, signage: {}, sizes: {}, mode: 'light', colors: ['#0A3D91', '#11095F', '#B56705'], font: 'Pretendard', mood: '', kvReadability: null, suggests: [], step: 0 };
  renderIntake();
  show('intake');
}

const STEPS = [
  { id: 'core', label: '행사 정보' },
  { id: 'channels', label: '산출물' },
  { id: 'signage', label: '오프라인 세트' },
  { id: 'extra', label: '채널 정보' },
  { id: 'style', label: '그래픽 가이드' },
];

function activeSteps() {
  const it = state.intake;
  return STEPS.filter(s => {
    if (s.id === 'signage') return it.channels.some(c => OFFLINE_CH.includes(c));
    if (s.id === 'extra') return it.channels.some(c => (EXTRA_FIELDS[c] ?? []).length);
    return true;
  });
}

const STEP_SAY = {
  core: it => {
    const n = CORE_FIELDS.filter(f => it.fields[f]).length;
    const miss = CORE_FIELDS.filter(f => !it.fields[f]);
    return n
      ? `기획에서 ${n}개 항목을 읽었어요.${miss.length ? `\n${miss.map(f => FIELD_LABEL[f]).join(' · ')}가 비어 있는데, 추측하지 않고 여쭤볼게요.` : '\n확인만 해주시면 다음으로 넘어갈게요.'}`
      : '기획에서 정보를 읽지 못했어요. 행사 정보를 직접 입력해 주세요.';
  },
  channels: it => it.channels.length
    ? `기획에서 ${it.channels.map(c => CHANNEL_LABEL[c]).join(', ')}를 발견해 미리 선택했어요.\n필요한 산출물을 확정해 주세요.`
    : '어떤 산출물을 만들까요? 온라인·오프라인에서 필요한 것을 골라 주세요.',
  signage: () => '오프라인은 현장에서 여러 장이 세트로 나갑니다.\n방향 안내는 고른 화살표마다 한 장씩 만들어져요. 규격도 여기서 정할 수 있습니다.',
  extra: () => '선택한 채널에 필요한 정보가 몇 가지 더 있어요.',
  style: () => '마지막으로 그래픽 가이드예요.\n키비주얼을 올리면 대표 컬러를 제안하고, 글자가 묻히지 않도록 색과 가림막을 자동으로 잡아 드립니다.',
};

function renderSteps() {
  const it = state.intake;
  const list = activeSteps();
  it.step = Math.min(it.step, list.length - 1);
  const cur = list[it.step];
  $('steps').innerHTML = list.map((s, i) =>
    `<span class="${i === it.step ? 'on' : i < it.step ? 'done' : ''}">${i + 1}. ${s.label}</span>`).join('');
  $('intakeSay').textContent = STEP_SAY[cur.id](it);
  document.querySelectorAll('#intake section[data-step]').forEach(sec => {
    const on = sec.dataset.step === cur.id;
    sec.classList.toggle('active', on);
    sec.style.display = on ? 'block' : 'none';   // 스텝이 표시를 단독 제어
  });
  $('prevBtn').style.visibility = it.step === 0 ? 'hidden' : 'visible';
  const last = it.step === list.length - 1;
  $('nextBtn').style.display = last ? 'none' : 'inline-flex';
  $('genBtn').style.display = last ? 'inline-flex' : 'none';
  validateIntake();
}

function stepValid() {
  const it = state.intake;
  const cur = activeSteps()[it.step];
  if (cur.id === 'core') return CORE_FIELDS.every(f => it.fields[f]);
  if (cur.id === 'channels') return it.channels.length > 0;
  return true;
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
    renderSignage(); renderExtra(); renderSteps();
  });
  $('fontSel').innerHTML = FONT_IDS.map(id => `<option value="${id}">${FONTS[id].label}</option>`).join('');
  $('fontSel').value = it.font;
  $('fontSel').onchange = () => { it.font = $('fontSel').value; };
  $('moodIn').value = it.mood;
  $('moodIn').oninput = () => { it.mood = $('moodIn').value; };
  ['c1', 'c2', 'c3'].forEach((id, i) => {
    $(id).value = it.colors[i];
    $(id).oninput = () => { it.colors[i] = $(id).value.toUpperCase(); };
  });
  $('modeSeg').querySelectorAll('button').forEach(b => {
    b.classList.toggle('on', b.dataset.m === it.mode);
    b.onclick = () => { it.mode = b.dataset.m; applyDerived(); renderIntake(); };
  });
  if (it.kv) { $('kvThumb').style.backgroundImage = `url(${it.kv})`; $('kvThumb').textContent = ''; }
  if (it.logo) { $('logoThumb').style.backgroundImage = `url(${it.logo})`; $('logoThumb').textContent = ''; }
  renderSuggests();
  bindUpload($('kvThumb'), $('kvFile'), async d => {
    it.kv = d;
    $('kvHint').textContent = '분석 중…';
    try {
      const { suggests, readability } = await analyzeKeyVisual(d);
      it.suggests = suggests; it.kvReadability = readability;
      if (suggests[0]) it.colors = [suggests[0], suggests[1] ?? it.colors[1], suggests[2] ?? it.colors[2]];
      applyDerived();
      renderIntake();
      toast('키비주얼에서 컬러를 제안했어요 — 스와치를 눌러 바꿀 수 있습니다');
    } catch { $('kvHint').textContent = ''; }
  });
  bindUpload($('logoThumb'), $('logoFile'), d => { it.logo = d; });
  renderSignage();
  renderExtra();
  renderSteps();
  $('genBtn').onclick = buildAndGenerate;
  $('nextBtn').onclick = () => {
    if (!stepValid()) { toast($('intakeNote').textContent || '이 단계를 먼저 채워 주세요'); return; }
    state.intake.step++; renderSteps(); $('intake').scrollTop = 0;
  };
  $('prevBtn').onclick = () => { state.intake.step = Math.max(0, state.intake.step - 1); renderSteps(); $('intake').scrollTop = 0; };
}

const OFFLINE_CH = ['poster', 'xbanner', 'hyunsumak'];

// 키비주얼 픽셀 분석 — 대표색 제안 + 매체별 글자 가독성(자동 글자색·스크림 필요 여부)
async function analyzeKeyVisual(dataUrl) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const W = 240, H = Math.max(1, Math.round(W * img.height / img.width));
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const { data } = g.getImageData(0, 0, W, H);
  const readability = {};
  for (const [k, zone] of Object.entries(TEXT_ZONES)) readability[k] = analyzeRegion(data, W, H, zone);
  return { suggests: extractPalette(data, 3), readability };
}

function bindUpload(thumb, file, set) {
  thumb.onclick = () => file.click();
  file.onchange = () => {
    const f = file.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { set(r.result); thumb.style.backgroundImage = `url(${r.result})`; thumb.textContent = ''; };
    r.readAsDataURL(f);
  };
}

function renderSignage() {
  const it = state.intake;
  const chans = it.channels.filter(c => OFFLINE_CH.includes(c));
  if (!chans.length) { $('signageBox').innerHTML = ''; return; }
  const box = $('signageBox');
  box.innerHTML = chans.map(ch => {
    const ps = purposesFor(ch);
    const cur = it.signage[ch] ?? (it.signage[ch] = [{ purpose: 'main' }]);
    const presets = SIZE_PRESETS[ch] ?? [];
    const specId = Object.entries(SPECS).find(([, s]) => s.channel === ch)[0];
    const sz = it.sizes[ch];
    return `<div class="sgroup" data-ch="${ch}">
      <div class="sh">${CHANNEL_LABEL[ch]}
        <select data-size="${ch}">${presets.map((pr, i) =>
          `<option value="${i}" ${sz && sz.wmm === pr.wmm && sz.hmm === pr.hmm ? 'selected' : (!sz && i === 0 ? 'selected' : '')}>${pr.label}mm</option>`).join('')}
          <option value="custom" ${sz?.custom ? 'selected' : ''}>직접 입력…</option></select>
      </div>
      <div class="customSz" data-ch="${ch}" style="display:${sz?.custom ? 'flex' : 'none'};gap:8px;margin-bottom:8px">
        <input type="text" data-dim="w" value="${sz?.wmm ?? ''}" placeholder="가로 mm" style="width:110px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;font-size:13px">
        <input type="text" data-dim="h" value="${sz?.hmm ?? ''}" placeholder="세로 mm" style="width:110px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;font-size:13px">
      </div>
      ${ps.map(p => {
        const sel = cur.filter(x => x.purpose === p.id);
        const on = sel.length > 0;
        return `<div class="prow" data-p="${p.id}">
          <input type="checkbox" ${on ? 'checked' : ''}>
          <span>${p.label}</span>
          ${p.needsArrow ? `<span class="arrows">${Object.entries(ARROWS).map(([k, g]) =>
            `<button data-arrow="${k}" class="${sel.some(x => x.arrow === k) ? 'on' : ''}" ${on ? '' : 'disabled'}>${g}</button>`).join('')}</span>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }).join('');

  box.querySelectorAll('.prow input').forEach(cb => cb.onchange = () => {
    const ch = cb.closest('.sgroup').dataset.ch, pid = cb.closest('.prow').dataset.p;
    const list = it.signage[ch] ?? [];
    if (cb.checked) {
      const needsArrow = PURPOSES.find(p => p.id === pid)?.needsArrow;
      list.push({ purpose: pid, arrow: needsArrow ? 'right' : null });
    } else {
      it.signage[ch] = list.filter(x => x.purpose !== pid);
    }
    renderSignage(); renderSteps();
  });
  box.querySelectorAll('.arrows button').forEach(b => b.onclick = () => {
    const ch = b.closest('.sgroup').dataset.ch, pid = b.closest('.prow').dataset.p, ar = b.dataset.arrow;
    const list = it.signage[ch];
    const has = list.some(x => x.purpose === pid && x.arrow === ar);
    if (has) it.signage[ch] = list.filter(x => !(x.purpose === pid && x.arrow === ar));
    else list.push({ purpose: pid, arrow: ar });
    if (!it.signage[ch].some(x => x.purpose === pid)) it.signage[ch].push({ purpose: pid, arrow: 'right' });
    renderSignage(); validateIntake();
  });
  box.querySelectorAll('select[data-size]').forEach(sel => sel.onchange = () => {
    const ch = sel.dataset.size;
    if (sel.value === 'custom') { it.sizes[ch] = { custom: true }; }
    else { const pr = SIZE_PRESETS[ch][+sel.value]; it.sizes[ch] = { wmm: pr.wmm, hmm: pr.hmm }; }
    renderSignage(); validateIntake();
  });
  box.querySelectorAll('.customSz input').forEach(i => i.oninput = () => {
    const ch = i.closest('.customSz').dataset.ch;
    const wrap = i.closest('.customSz');
    const w = +wrap.querySelector('[data-dim=w]').value, h = +wrap.querySelector('[data-dim=h]').value;
    it.sizes[ch] = { custom: true, wmm: w || null, hmm: h || null };
    validateIntake();
  });
}

function applyDerived() {
  const it = state.intake;
  const auto = buildPalette({ primary: it.colors[0], mode: it.mode });
  if (!it.suggests[1]) it.colors[1] = auto.secondary;
  if (!it.suggests[2]) it.colors[2] = auto.accent;
}

function renderSuggests() {
  const it = state.intake;
  const box = $('suggests');
  if (!box) return;
  $('kvHint').textContent = it.suggests.length ? '키비주얼에서 추출' : '';
  box.innerHTML = it.suggests.length
    ? it.suggests.map((c, i) => `<button class="sugg" data-c="${c}"><i style="background:${c}"></i>${c}</button>`).join('')
      + `<button class="sugg" data-reset="1">기본값으로</button>`
    : '';
  box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    it.colors[0] = b.dataset.c; applyDerived(); renderIntake();
  });
  box.querySelector('[data-reset]')?.addEventListener('click', () => {
    it.colors = ['#0A3D91', '#11095F', '#B56705']; it.suggests = []; renderIntake();
  });
}

const EXTRA_FIELDS = { edm: ['senderName', 'subject'], landing: ['formFields'], poster: ['printSize'], xbanner: ['printSize'], hyunsumak: ['printSize'] };
function renderExtra() {
  const it = state.intake;
  const items = [];
  for (const ch of it.channels) for (const f of EXTRA_FIELDS[ch] ?? []) items.push([ch, f]);
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
  $('nextBtn').disabled = !stepValid();
  let n = 0;
  for (const specId of specIdsFor(it.channels)) {
    const ch = SPECS[specId].channel;
    const set = it.signage[ch];
    n += (set?.length && purposesFor(ch).length) ? set.length : 1;
  }
  $('intakeNote').textContent = !it.channels.length
    ? '산출물을 하나 이상 선택하세요'
    : missing.length ? `필수 입력: ${missing.map(f => FIELD_LABEL[f]).join(', ')}` : `${n}종을 생성합니다`;
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
    kvReadability: it.kvReadability,
    logo: it.logo,
    mode: it.mode,
    colors: it.colors,
    fonts: { heading: it.font, body: it.font },
    mood: it.mood.split(',').map(s => s.trim()).filter(Boolean),
  });
  const signage = {};
  for (const [ch, list] of Object.entries(it.signage)) if (it.channels.includes(ch) && list.length) signage[ch] = list;
  state.campaign = { id: slug(ctx.core.name), context: ctx, style, channels: it.channels, signage, artifacts: [], log: [] };
  logEvent(state.campaign, 'campaign_created', {});
  registerAll();
  generateArtifacts(state.campaign);
  for (const a of state.campaign.artifacts) {
    const sz = it.sizes[a.channel];
    if (sz?.wmm && sz?.hmm) a.size = { wmm: sz.wmm, hmm: sz.hmm };
  }
  generateArtifacts(state.campaign);
  enterWork({ staged: true });
}

// 스켈레톤 → 하나씩 실제 산출물로 채워지는 연출 (생성이 눈에 보이게)
function revealStaged() {
  const ids = state.campaign.artifacts.map(a => a.key ?? a.specId);
  for (const id of ids) frames.get(id)?.frame.classList.add('gen');
  ids.forEach((id, i) => setTimeout(() => {
    const a = state.campaign.artifacts.find(x => (x.key ?? x.specId) === id);
    const f = frames.get(id);
    if (!f) return;
    f.frame.classList.remove('gen');
    f.frame.classList.add('done');
    setTimeout(() => f.frame.classList.remove('done'), 600);
    f.iframe.style.visibility = 'visible';
    f.iframe.srcdoc = a.html;
    f.label.textContent = artLabel(a);
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
function effSpec(a) {
  const s = { ...SPECS[a.specId] };
  if (a.size?.wmm) { s.wmm = a.size.wmm; s.hmm = a.size.hmm; }
  return s;
}
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
        const spec = effSpec(a);
        const [nw, nh] = naturalSize(spec);
        const ds = DISPLAY_SCALE[ch] ?? 1;
        const w = nw * ds, h = nh * ds;
        const frame = document.createElement('div');
        frame.className = 'frame';
        frame.style.left = x + 'px'; frame.style.top = y + 'px';
        frame.innerHTML = `
          <div class="flabel"><span class="fname">${opts.blank ? '생성 중…' : artLabel(a)}</span><span class="badge ${a.status}">${badgeText(a.status)}</span></div>
          <div class="fbody" style="width:${w}px;height:${h}px">
            <iframe width="${nw}" height="${nh}" style="transform:scale(${ds})"></iframe>
            <div class="hit"></div>
          </div>`;
        const iframe = frame.querySelector('iframe');
        if (opts.blank) iframe.style.visibility = 'hidden'; else iframe.srcdoc = a.html;
        frame.querySelector('.hit').onclick = e => { e.stopPropagation(); select(a.key ?? a.specId); };
        board.appendChild(frame);
        frames.set(a.key ?? a.specId, { frame, iframe, badge: frame.querySelector('.badge'), label: frame.querySelector('.fname') });
        x += w + 70;
        rowH = Math.max(rowH, h);
      }
    }
    y += rowH + 130;
    state.boardW = Math.max(state.boardW ?? 0, x);
  }
  state.boardH = y;
}
const PURPOSE_SHORT = { main: '', way: '방향', agenda: '프로그램', reception: '등록데스크' };
function artLabel(a) {
  const spec = SPECS[a.specId];
  const sz = a.size ? `${a.size.wmm}×${a.size.hmm}` : (spec.unit === 'mm' ? `${spec.wmm}×${spec.hmm}` : '');
  const pur = a.purpose && a.purpose !== 'main'
    ? ` · ${PURPOSE_SHORT[a.purpose]}${a.arrow ? ' ' + (ARROWS[a.arrow] ?? '') : ''}` : '';
  return `${CHANNEL_LABEL[a.channel] ?? a.specId}${pur}${sz ? ` · ${sz}mm` : ''}`;
}
function badgeText(s) { return { draft: 'DRAFT', approved: '승인됨', needsReview: '확인 필요' }[s] ?? s; }

function refreshFrames(only = null) {
  for (const a of state.campaign.artifacts) {
    const k = a.key ?? a.specId;
    if (only && k !== only) continue;
    const f = frames.get(k);
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
      <label>모드</label>
      <div class="vseg" id="iMode">
        <button data-m="light" class="${c.style.mode !== 'dark' ? 'on' : ''}">라이트</button>
        <button data-m="dark" class="${c.style.mode === 'dark' ? 'on' : ''}">다크</button>
      </div>
      <label>컬러 세트</label>
      <div style="display:flex;gap:10px">
        <span style="display:flex;flex-direction:column;align-items:center;gap:3px"><input type="color" class="swatch" id="iColor1" value="${c.style.palette.primary}"><small style="font-size:10px;color:var(--sub)">주색</small></span>
        <span style="display:flex;flex-direction:column;align-items:center;gap:3px"><input type="color" class="swatch" id="iColor2" value="${c.style.palette.secondary}"><small style="font-size:10px;color:var(--sub)">보조</small></span>
        <span style="display:flex;flex-direction:column;align-items:center;gap:3px"><input type="color" class="swatch" id="iColor3" value="${c.style.palette.accent}"><small style="font-size:10px;color:var(--sub)">포인트</small></span>
      </div>
      <label>키비주얼</label>
      <div class="kvthumb" id="iKv" style="width:100%;height:76px;${c.style.keyVisual ? `background-image:url(${c.style.keyVisual})` : ''}">${c.style.keyVisual ? '' : '업로드 · 교체'}</div>
      <input type="file" id="iKvFile" accept="image/*" style="display:none">
      ${c.style.keyVisual ? '<button class="btn" id="iKvClear" style="width:100%;margin-top:6px">키비주얼 제거</button>' : ''}
      <label>폰트</label>
      <select id="iFont">${FONT_IDS.map(id => `<option value="${id}">${FONTS[id].label}</option>`).join('')}</select>
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
    const restyle = (patch = {}) => {
      c.style = normalizeStyle({
        keyVisual: c.style.keyVisual,
        kvReadability: c.style.kvReadability,
        logo: c.style.logo,
        mode: c.style.mode,
        colors: [insp.querySelector('#iColor1').value.toUpperCase(), insp.querySelector('#iColor2').value.toUpperCase(), insp.querySelector('#iColor3').value.toUpperCase()],
        fonts: { heading: insp.querySelector('#iFont').value, body: insp.querySelector('#iFont').value },
        mood: c.style.mood,
        ...patch,
      });
      logEvent(c, 'style_changed', {});
      generateArtifacts(c);
      refreshFrames();
      $('inspNote').textContent = '스타일 전체 반영됨';
      log('스타일 변경 → 전체 재생성');
    };
    const styleChange = debounce(() => restyle(), 350);
    insp.querySelector('#iColor1').oninput = styleChange;
    insp.querySelector('#iColor2').oninput = styleChange;
    insp.querySelector('#iColor3').oninput = styleChange;
    insp.querySelector('#iFont').onchange = styleChange;
    insp.querySelector('#iFont').value = c.style.fonts.heading;
    insp.querySelectorAll('#iMode button').forEach(b => b.onclick = () => {
      restyle({ mode: b.dataset.m });
      renderInspector();
    });
    // 키비주얼 교체 — 새 이미지의 대표색·가독성을 다시 재고 반영
    const kvIn = insp.querySelector('#iKvFile');
    insp.querySelector('#iKv').onclick = () => kvIn.click();
    kvIn.onchange = () => {
      const f = kvIn.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = async () => {
        let readability = null, suggests = [];
        try { ({ readability, suggests } = await analyzeKeyVisual(r.result)); } catch {}
        restyle({ keyVisual: r.result, kvReadability: readability });
        renderInspector();
        toast(suggests.length ? `키비주얼 교체 — 대표색 ${suggests[0]} 감지` : '키비주얼 교체');
      };
      r.readAsDataURL(f);
    };
    insp.querySelector('#iKvClear')?.addEventListener('click', () => {
      restyle({ keyVisual: null, kvReadability: null });
      renderInspector();
    });
    return;
  }

  const a = c.artifacts.find(x => (x.key ?? x.specId) === state.selected);
  const nVar = VARIANTS[a.channel] ?? 1;
  const spec = effSpec(a);
  const isPrint = spec.unit === 'mm';
  const presets = SIZE_PRESETS[a.channel] ?? [];
  insp.innerHTML = `
    <h3>${artLabel(a)} <span class="mode">개별 편집</span></h3>
    <div class="hint">이 산출물에서만 다르게 표기할 값. 비우면 공통값. 개별 값은 일괄 반영에서 보존됩니다.</div>
    ${['name', 'date', 'venue', 'cta'].map(f => `
      <label>${FIELD_LABEL[f]} <span style="opacity:.55">공통: ${c.context.core[f] ?? '—'}</span></label>
      <input type="text" data-f="${f}" value="${a.overrides.core?.[f] ?? ''}" placeholder="${c.context.core[f] ?? ''}">`).join('')}
    ${nVar > 1 ? `<label>레이아웃 시안</label><div class="vseg">${Array.from({ length: nVar }, (_, i) =>
      `<button data-v="${i}" class="${(a.variant ?? 0) === i ? 'on' : ''}">${i + 1}</button>`).join('')}</div>` : ''}
    ${isPrint ? `
      <label>인쇄 규격 (mm)</label>
      <select id="iSize">${presets.map(pr =>
        `<option value="${pr.wmm}x${pr.hmm}" ${spec.wmm === pr.wmm && spec.hmm === pr.hmm ? 'selected' : ''}>${pr.label}</option>`).join('')}
        <option value="custom" ${!presets.some(pr => pr.wmm === spec.wmm && pr.hmm === spec.hmm) ? 'selected' : ''}>직접 입력…</option></select>
      <div style="display:flex;gap:6px;margin-top:6px">
        <input type="text" id="iW" value="${spec.wmm}" style="width:50%"><input type="text" id="iH" value="${spec.hmm}" style="width:50%">
      </div>
      <div style="font-size:11px;color:var(--sub);margin-top:8px;line-height:1.6">
        용지 ${spec.wmm + spec.bleed * 2}×${spec.hmm + spec.bleed * 2}mm (블리드 ${spec.bleed}mm)<br>
        메인 ${c.style.palette.primary} ≈ ${cmykText(c.style.palette.primary)}
      </div>` : ''}
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
  const applySize = (w, h) => {
    a.size = { wmm: w, hmm: h };
    logEvent(c, 'size_changed', { key: a.key, wmm: w, hmm: h });
    generateArtifacts(c);
    layoutArtboard();
    select(a.key ?? a.specId);
    log(`${artLabel(a)} 규격 변경`);
  };
  insp.querySelector('#iSize')?.addEventListener('change', e => {
    if (e.target.value === 'custom') return;
    const [w, h] = e.target.value.split('x').map(Number);
    applySize(w, h);
  });
  for (const id of ['#iW', '#iH']) insp.querySelector(id)?.addEventListener('change', () => {
    const w = +insp.querySelector('#iW').value, h = +insp.querySelector('#iH').value;
    if (w > 0 && h > 0) applySize(w, h);
  });
  insp.querySelector('#iOpen').onclick = () => { const w = window.open('', '_blank'); w.document.write(a.html); w.document.close(); };
  insp.querySelector('#iExp').onclick = () => exportArtifactModal(a);
  insp.querySelector('#iDesel').onclick = () => select(null);
}

/* ═══ 내보내기 ═══ */
function exportArtifactModal(a) {
  const spec = effSpec(a);
  const kk = a.key ?? a.specId;
  if (spec.channel === 'banner') {
    modal({
      title: `${artLabel(a)} 내보내기`,
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
      title: `${artLabel(a)} 내보내기`,
      desc: spec.channel === 'edm'
        ? '이메일 호환 HTML — 메일 도구에 붙여넣거나 업로드해 사용합니다. (HubSpot 자동 등록은 추후)'
        : '자기완결 HTML 패키지 — 어디든 게시할 수 있습니다.',
      body: '',
      actions: [
        { label: '닫기' },
        { label: 'HTML 다운로드', pri: true, fn: () => { downloadText(a.html, `${kk}.html`); log(`내보내기: ${kk}.html`); } },
      ],
    });
    return;
  }
  // 인쇄물
  modal({
    title: `${artLabel(a)} 내보내기`,
    desc: '인쇄 가이드 적용 — 재단 여백(블리드) 포함 실측 규격의 PDF로 저장됩니다.',
    body: `<div style="font-size:12.5px;color:var(--sub);line-height:1.7">
      · 용지: <b>${spec.wmm + spec.bleed * 2} × ${spec.hmm + spec.bleed * 2}mm</b> (재단 ${spec.wmm}×${spec.hmm} + 블리드 ${spec.bleed}mm)<br>
      · 인쇄 대화상자에서 <b>"PDF로 저장"</b> · 여백 없음 · 배율 100%<br>
      · 인디자인 작업 시 이 PDF를 배치(Place)해 사용<br>
      · 대량·자동 변환은 <code>scripts/demo.js</code>(Chrome headless)</div>`,
    actions: [
      { label: '닫기' },
      { label: 'HTML', fn: () => { downloadText(a.html, `${kk}.html`); } },
      { label: 'PDF로 저장', pri: true, fn: () => { openPrintPdf(a.html); log(`내보내기: ${kk} PDF`); } },
    ],
  });
}

async function doBannerExport(a) {
  const spec = effSpec(a);
  const kk = a.key ?? a.specId;
  const fmt = $('modalBody').querySelector('#expFmt .on').dataset.v;
  const s = Number($('modalBody').querySelector('#expScale .on').dataset.v);
  toast('이미지 생성 중…');
  try {
    const blob = await rasterize(a.html, spec.w, spec.h, s, fmt);
    download(blob, `${kk}@${s}x.${fmt}`);
    log(`내보내기: ${kk}@${s}x.${fmt}`);
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
      · 인쇄 PDF — ${prints.map(a => artLabel(a)).join(', ') || '없음'} <span style="opacity:.7">(각각 인쇄 대화상자)</span></div>`,
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
    const spec = effSpec(a);
    try { download(await rasterize(a.html, spec.w, spec.h, 2, 'png'), `${a.key ?? a.specId}@2x.png`); } catch {}
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
