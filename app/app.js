// MBM Design Agent — Stitch 스타일 앞문.
// 홈: 사이드바(내 캠페인·자산 검색) + 웰컴 히어로 + 대형 입력 카드.
// 작업: 좌 대화 카드 · 중앙 캔버스(산출물 그리드) · 우 Context/Style 패널 · 하단 지시 바.
// 기획 해석: AI 키 있으면 LLM(llm.js), 없으면 정규식 폴백 — 데모 항상 동작.

import { createContext, updateContext, missingFields, CORE_FIELDS } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS } from '../core/contract.js';
import { registerAll, generateArtifacts, logEvent } from '../core/generate.js';
import { propagate } from '../core/propagate.js';
import * as LLM from './llm.js';

const FIELD_LABEL = {
  name: '행사명', date: '일시', venue: '장소', audience: '대상', cta: 'CTA',
  senderName: '발신자명', subject: '메일 제목', formFields: '등록 폼 항목', printSize: '인쇄 규격',
};
const CHANNEL_LABEL = {
  banner: '홍보 배너 (3규격)', edm: 'eDM', landing: '랜딩페이지',
  poster: '포스터', xbanner: 'X배너', hyunsumak: '현수막',
};
const ONLINE = ['edm', 'landing', 'banner'];
const OFFLINE = ['poster', 'xbanner', 'hyunsumak'];
const VARIANTS = { banner: 3, landing: 2, poster: 2, xbanner: 2, hyunsumak: 2, edm: 1 };
const STORE_LS = 'mbm-campaigns';

const SAMPLES = [
  '10월 15일 코엑스에서 2026 ONSITE MBM 서울 진행. 대상은 건설 구조 엔지니어, 사전등록 받아야 함. eDM이랑 랜딩페이지, 배너, 포스터, X배너 필요해.',
  '내년 3월 킨텍스 MBM 부산 세미나. 교량 설계 실무자 대상, 현장 데모 신청 유도. 랜딩이랑 현수막, 배너만.',
  '2026 ONSITE MBM 도쿄 — 6월 20일, 대상 일본 파트너사. eDM과 포스터.',
];

const state = { step: 'brief', ctx: null, channels: [], style: null, campaign: null, detectedChannels: [] };
const $ = id => document.getElementById(id);
const chat = () => $('chat');

/* ═══════════ helpers ═══════════ */
function agent(text) {
  const d = document.createElement('div');
  d.className = 'msg agent'; d.textContent = text;
  chat().appendChild(d); chat().scrollTop = 1e9;
  return d;
}
function user(text) {
  const d = document.createElement('div');
  d.className = 'msg user'; d.textContent = text;
  chat().appendChild(d); chat().scrollTop = 1e9;
}
function widget(html) {
  const d = document.createElement('div');
  d.className = 'widget'; d.innerHTML = html;
  chat().appendChild(d); chat().scrollTop = 1e9;
  return d;
}
function toast(t) {
  const el = $('toast'); el.textContent = t; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2400);
}
const STEP_LABEL = { brief: '기획 입력', context: 'Context 확정', channels: '산출물 선택', style: '그래픽 가이드', review: '생성 · 리뷰', done: '완료' };
function setStep(s) { state.step = s; $('stepLabel').textContent = STEP_LABEL[s] ?? ''; }

function showHome() {
  $('home').style.display = 'flex'; $('work').style.display = 'none';
  $('campPill').style.display = 'none'; $('approveAll').style.display = 'none';
  renderSidebar();
}
function showWork() {
  $('home').style.display = 'none'; $('work').style.display = 'block';
}

/* ═══════════ modal ═══════════ */
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

/* ═══════════ brief parsing (정규식 폴백) ═══════════ */
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

/* ═══════════ home ═══════════ */
function initHome() {
  const box = $('samples');
  box.innerHTML = '';
  for (const s of SAMPLES) {
    const b = document.createElement('button');
    b.textContent = s.slice(0, 34) + '…';
    b.title = s;
    b.onclick = () => { $('briefText').value = s; };
    box.appendChild(b);
  }
  $('briefGo').onclick = () => {
    const t = $('briefText').value.trim();
    if (!t) { toast('기획 내용을 입력하세요'); return; }
    startCampaign(t);
  };
  $('fileBtn').onclick = () => $('fileIn').click();
  $('fileIn').onchange = () => {
    const f = $('fileIn').files[0]; if (!f) return;
    if (!/\.(txt|md)$/i.test(f.name)) { toast('PPT·워드 파싱은 서버 연동 후 지원 — 지금은 txt/md'); return; }
    const r = new FileReader();
    r.onload = () => { $('briefText').value = r.result.slice(0, 4000); toast(`${f.name} 읽음`); };
    r.readAsText(f);
  };
  $('searchIn').oninput = () => renderSidebar($('searchIn').value.trim());
  refreshAiChip();
}
function refreshAiChip() {
  $('aiChip').textContent = LLM.hasKey() ? `AI 해석: 켜짐 (${LLM.maskKey()})` : 'AI 해석: 꺼짐 — 정규식 파서';
}

/* ═══════════ 자산 검색 (사이드바) ═══════════ */
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
  const chips = $('qchips');
  chips.innerHTML = '';
  if (query) {
    for (const [k, v] of Object.entries(cond)) {
      const s = document.createElement('span');
      s.textContent = { year: `연도 ${v}`, channel: CHANNEL_LABEL[v] ?? v, q: `"${v}"` }[k];
      chips.appendChild(s);
    }
  }
  let list = loadStore();
  if (cond.year) list = list.filter(c => (c.context.core.date ?? '').startsWith(cond.year));
  if (cond.channel) list = list.filter(c => c.channels.includes(cond.channel));
  if (cond.q) list = list.filter(c => (c.context.core.name ?? '').includes(cond.q));
  list.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));

  const box = $('campList');
  box.innerHTML = '';
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

function openStored(saved) {
  state.ctx = saved.context;
  state.channels = saved.channels;
  state.style = saved.style;
  state.campaign = { ...saved, log: saved.log ?? [] };
  registerAll();
  generateArtifacts(state.campaign);           // 원본 재현 — context+style+overrides+variant에서 복원
  for (const a of state.campaign.artifacts) {
    const s = (saved.artifacts ?? []).find(x => x.specId === a.specId);
    if (s?.status) a.status = s.status;
  }
  showWork();
  setStep('review');
  chat().innerHTML = '';
  agent(`저장된 캠페인 "${saved.context.core.name}"을 열었습니다. 원본을 그대로 재현했어요.\n수정하거나 그대로 재사용할 수 있습니다.`);
  enterReview();
  logEvent(state.campaign, 'campaign_reopened', {});
}

/* ═══════════ 캠페인 시작 ═══════════ */
async function startCampaign(text) {
  showWork();
  setStep('brief');
  chat().innerHTML = '';
  $('grid').innerHTML = '';
  $('stylePanel').style.display = 'none';
  $('cmdBar').style.display = 'none';
  user(text.length > 140 ? text.slice(0, 140) + '…' : text);

  let parsed = null;
  if (LLM.hasKey()) {
    const wait = agent('AI가 기획을 해석하는 중…');
    try {
      const r = await LLM.parseBriefLLM(text);
      parsed = { fields: {}, channels: r.channels ?? [] };
      for (const f of CORE_FIELDS) if (r[f]) parsed.fields[f] = r[f];
      wait.remove();
    } catch (e) {
      wait.textContent = `AI 해석 실패(${e.message}) — 규칙 파서로 대신할게요.`;
    }
  }
  if (!parsed) parsed = parseBriefRegex(text);

  state.ctx = createContext(parsed.fields);
  state.detectedChannels = parsed.channels;
  const found = CORE_FIELDS.filter(f => state.ctx.core[f]);
  agent(`이렇게 정리했어요.\n${found.map(f => `· ${FIELD_LABEL[f]} — ${state.ctx.core[f]}`).join('\n') || '· (추출된 정보 없음)'}`);
  stepContext();
}

/* ═══════════ steps ═══════════ */
function stepContext() {
  setStep('context');
  const missing = missingFields(state.ctx, []);
  if (!missing.length) { agent('필수 정보가 모두 채워졌습니다.'); stepChannels(); return; }
  agent(`${missing.map(m => FIELD_LABEL[m.field]).join(' · ')} 정보가 비어 있어요. 추측하지 않고 여쭤볼게요.`);
  const w = widget(`
    <h4>빈칸 채우기</h4>
    ${missing.map(m => `<label>${FIELD_LABEL[m.field]}</label><input type="text" data-f="${m.field}">`).join('')}
    <div class="btn-row"><button class="btn pri" id="ctxGo">확정</button></div>`);
  w.querySelector('#ctxGo').onclick = () => {
    const patch = {};
    w.querySelectorAll('input').forEach(i => { if (i.value.trim()) patch[i.dataset.f] = i.value.trim(); });
    state.ctx = updateContext(state.ctx, { core: patch });
    const still = missingFields(state.ctx, []);
    if (still.length) { toast(`아직 비어 있음: ${still.map(m => FIELD_LABEL[m.field]).join(', ')}`); return; }
    w.remove(); user(Object.values(patch).join(' / ') || '확정');
    stepChannels();
  };
}

function stepChannels() {
  setStep('channels');
  const pre = state.detectedChannels ?? [];
  agent(pre.length
    ? `기획에서 ${pre.map(c => CHANNEL_LABEL[c]).join(', ')}를 발견해 미리 선택했어요.`
    : '어떤 산출물을 만들까요?');
  const group = (title, list) => `<h4>${title}</h4>` + list.map(c =>
    `<label class="chk ${pre.includes(c) ? 'on' : ''}"><input type="checkbox" value="${c}" ${pre.includes(c) ? 'checked' : ''}>${CHANNEL_LABEL[c]}</label>`).join('');
  const w = widget(`${group('온라인', ONLINE)}${group('오프라인', OFFLINE)}
    <div class="btn-row"><button class="btn pri" id="chGo">선택 완료</button></div>`);
  w.querySelectorAll('input').forEach(i => i.onchange = () => i.closest('.chk').classList.toggle('on', i.checked));
  w.querySelector('#chGo').onclick = () => {
    const sel = [...w.querySelectorAll('input:checked')].map(i => i.value);
    if (!sel.length) { toast('산출물을 하나 이상 선택하세요'); return; }
    w.remove(); user(sel.map(c => CHANNEL_LABEL[c]).join(', '));
    state.channels = sel;
    stepChannelFields();
  };
}

function stepChannelFields() {
  const missing = missingFields(state.ctx, state.channels);
  if (!missing.length) { stepStyle(); return; }
  agent('선택한 채널에 필요한 정보가 몇 가지 더 있어요.');
  const w = widget(`
    <h4>채널별 추가 항목</h4>
    ${missing.map(m => `<label>${CHANNEL_LABEL[m.channel]} — ${FIELD_LABEL[m.field]}</label><input type="text" data-ch="${m.channel}" data-f="${m.field}" placeholder="${m.field === 'printSize' ? '예: 기본 규격 사용' : ''}">`).join('')}
    <div class="btn-row"><button class="btn pri" id="cfGo">입력 완료</button></div>`);
  w.querySelector('#cfGo').onclick = () => {
    const patch = {};
    w.querySelectorAll('input').forEach(i => {
      (patch[i.dataset.ch] ??= {})[i.dataset.f] = i.value.trim() || '기본';
    });
    state.ctx = updateContext(state.ctx, { channelFields: patch });
    w.remove(); user('입력 완료');
    stepStyle();
  };
}

function stepStyle() {
  setStep('style');
  agent('이제 그래픽 가이드를 주세요. 키비주얼과 컬러가 모든 산출물에 하나의 스타일로 적용됩니다.');
  const w = widget(`
    <h4>그래픽 가이드</h4>
    <div class="kvthumb" id="kvThumb">키비주얼 업로드 (선택)</div>
    <input type="file" id="kvFile" accept="image/*" style="display:none">
    <label>컬러 (메인 · 배경)</label>
    <div class="palette">
      <input type="color" class="swatch" id="c1" value="#0A3D91">
      <input type="color" class="swatch" id="c2" value="#F5F7FA">
    </div>
    <label>폰트</label>
    <select id="fontSel"><option>Pretendard</option><option>Noto Sans KR</option><option>Apple SD Gothic Neo</option></select>
    <label>무드 키워드</label>
    <input type="text" id="moodIn" placeholder="예: 테크, 신뢰">
    <div class="btn-row"><button class="btn pri" id="styleGo">이 스타일로 확정</button></div>`);
  let kvData = null;
  const thumb = w.querySelector('#kvThumb'), file = w.querySelector('#kvFile');
  thumb.onclick = () => file.click();
  file.onchange = () => {
    const f = file.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { kvData = r.result; thumb.style.backgroundImage = `url(${kvData})`; thumb.textContent = ''; };
    r.readAsDataURL(f);
  };
  w.querySelector('#styleGo').onclick = () => {
    const c1 = w.querySelector('#c1').value.toUpperCase();
    const c2 = w.querySelector('#c2').value.toUpperCase();
    state.style = normalizeStyle({
      keyVisual: kvData,
      colors: [c1, c2],
      fonts: { heading: w.querySelector('#fontSel').value, body: w.querySelector('#fontSel').value },
      mood: w.querySelector('#moodIn').value.split(',').map(s => s.trim()).filter(Boolean),
    });
    w.remove(); user(`컬러 ${c1} · ${w.querySelector('#fontSel').value}${kvData ? ' · 키비주얼 첨부' : ''}`);
    runGenerate();
  };
}

/* ═══════════ 생성 · 리뷰 ═══════════ */
function slug(name) {
  return (name || 'campaign').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
}

function runGenerate() {
  setStep('review');
  agent('자동 생성 중…');
  state.campaign = {
    id: slug(state.ctx.core.name), context: state.ctx, style: state.style,
    channels: state.channels, artifacts: [], log: [],
  };
  logEvent(state.campaign, 'campaign_created', {});
  registerAll();
  setTimeout(() => {
    generateArtifacts(state.campaign);
    agent(`${state.campaign.artifacts.length}종 산출물을 생성했습니다.\n\n· 오른쪽 패널 — Context·컬러를 바꾸고 [일괄 반영]\n· 카드 [편집] — 그 산출물만 예외 수정\n· 카드 [다른 시안] — 레이아웃 베리에이션\n· 아래 입력바 — "장소 킨텍스로 변경" 같은 자유 지시`);
    enterReview();
  }, 350);
}

function enterReview() {
  $('campPill').textContent = state.campaign.context.core.name;
  $('campPill').style.display = 'block';
  $('approveAll').style.display = 'block';
  $('stylePanel').style.display = 'block';
  $('cmdBar').style.display = 'flex';
  renderPanel();
  renderGrid();
}

/* ═══════════ 우측 패널 ═══════════ */
function renderPanel() {
  const fields = ['name', 'date', 'venue', 'cta'];
  $('ctxFields').innerHTML = fields.map(f =>
    `<label>${FIELD_LABEL[f]}</label><input type="text" data-f="${f}" value="${state.campaign.context.core[f] ?? ''}">`
  ).join('');
  $('pColor1').value = state.campaign.style.palette.primary;
  $('pColor2').value = state.campaign.style.palette.bg;
  $('pFont').value = state.campaign.style.fonts.heading;
  $('propBtn').onclick = applyPanel;
}

function applyPanel() {
  const patch = {};
  $('ctxFields').querySelectorAll('input').forEach(i => {
    if (i.value.trim() !== (state.campaign.context.core[i.dataset.f] ?? '')) patch[i.dataset.f] = i.value.trim();
  });
  const c1 = $('pColor1').value.toUpperCase(), c2 = $('pColor2').value.toUpperCase(), font = $('pFont').value;
  const styleChanged = c1 !== state.campaign.style.palette.primary || c2 !== state.campaign.style.palette.bg || font !== state.campaign.style.fonts.heading;
  if (styleChanged) {
    state.campaign.style = normalizeStyle({
      keyVisual: state.campaign.style.keyVisual,
      colors: [c1, c2], fonts: { heading: font, body: font },
      mood: state.campaign.style.mood,
    });
    logEvent(state.campaign, 'style_changed', {});
  }
  if (!Object.keys(patch).length && !styleChanged) { toast('변경된 값이 없습니다'); return; }

  let impacted = [], conflicts = [];
  if (Object.keys(patch).length) {
    ({ impacted, conflicts } = propagate(state.campaign, patch));
    state.ctx = state.campaign.context;
  } else {
    generateArtifacts(state.campaign);
    impacted = state.campaign.artifacts.map(a => a.specId);
  }
  if (styleChanged && Object.keys(patch).length) generateArtifacts(state.campaign);
  renderGrid();
  const note = $('propNote');
  note.style.display = 'block';
  note.textContent = conflicts.length
    ? `${impacted.length}종 반영 · ${conflicts.length}건 충돌 — 노란 카드 확인`
    : `${impacted.length}종 일괄 반영 완료 — 개별 편집한 표현은 보존`;
  agent(`일괄 반영 → ${impacted.length}종 갱신${conflicts.length ? `, ${conflicts.length}건은 확인 필요` : ''}.`);
}

/* ═══════════ 캔버스 ═══════════ */
function naturalSize(spec) {
  if (spec.unit === 'mm') {
    const k = 3.7795;
    return [(spec.wmm + spec.bleed * 2) * k, (spec.hmm + spec.bleed * 2) * k];
  }
  if (spec.channel === 'banner') return [spec.w, spec.h];
  if (spec.channel === 'edm') return [600, 900];
  return [1000, 1400];
}

function renderGrid() {
  const grid = $('grid');
  grid.innerHTML = '';
  for (const a of state.campaign.artifacts) {
    const spec = SPECS[a.specId];
    const [nw, nh] = naturalSize(spec);
    const card = document.createElement('div');
    card.className = 'card';
    const nVar = VARIANTS[a.channel] ?? 1;
    card.innerHTML = `
      <div class="prev"></div>
      <div class="meta"><b>${a.specId}${a.variant ? ` · 시안${a.variant + 1}` : ''}</b><span class="badge ${a.status}">${
        { draft: 'DRAFT', approved: '승인됨', needsReview: '확인 필요' }[a.status] ?? a.status}</span></div>
      <div class="acts">
        <button class="btn ghost" data-act="edit">편집</button>
        ${nVar > 1 ? '<button class="btn ghost" data-act="var">다른 시안</button>' : ''}
        <button class="btn ghost" data-act="open">크게</button>
        <button class="btn ghost" data-act="dl">HTML</button>
      </div>`;
    const prev = card.querySelector('.prev');
    const iframe = document.createElement('iframe');
    const scale = Math.min(240 / nw, 195 / nh);
    iframe.width = nw; iframe.height = nh;
    iframe.style.transform = `translateX(-50%) scale(${scale})`;
    iframe.srcdoc = a.html;
    prev.appendChild(iframe);
    card.querySelector('[data-act=edit]').onclick = () => editArtifact(a);
    const vb = card.querySelector('[data-act=var]');
    if (vb) vb.onclick = () => cycleVariant(a);
    card.querySelector('[data-act=open]').onclick = () => {
      const win = window.open('', '_blank'); win.document.write(a.html); win.document.close();
    };
    card.querySelector('[data-act=dl]').onclick = () => {
      const blob = new Blob([a.html], { type: 'text/html' });
      const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${a.specId}.html` });
      link.click();
    };
    grid.appendChild(card);
  }
  $('approveAll').onclick = approveAll;
}

function cycleVariant(a) {
  a.variant = ((a.variant ?? 0) + 1) % (VARIANTS[a.channel] ?? 1);
  a.status = 'draft';
  logEvent(state.campaign, 'variation_cycled', { specId: a.specId, variant: a.variant });
  generateArtifacts(state.campaign);
  renderGrid();
  toast(`${a.specId} — 시안 ${a.variant + 1}/${VARIANTS[a.channel]}`);
}

function editArtifact(a) {
  const cur = a.overrides.core ?? {};
  const fields = ['name', 'date', 'venue', 'cta'];
  modal({
    title: `${a.specId} 개별 편집`,
    desc: '이 산출물에서만 다르게 표기할 값을 입력하세요. 비워두면 캠페인 공통값을 따릅니다. (표현은 디자이너 소유 — 일괄 반영에서 보존됩니다)',
    body: fields.map(f =>
      `<label>${FIELD_LABEL[f]} <span style="opacity:.6">공통: ${state.campaign.context.core[f] ?? '—'}</span></label>
       <input type="text" data-f="${f}" value="${cur[f] ?? ''}" placeholder="${state.campaign.context.core[f] ?? ''}">`
    ).join(''),
    actions: [
      { label: '초기화', fn: () => { a.overrides.core = {}; applyEdit(a); } },
      { label: '적용', pri: true, fn: () => {
        const o = {};
        $('modalBody').querySelectorAll('input').forEach(i => { if (i.value.trim()) o[i.dataset.f] = i.value.trim(); });
        a.overrides.core = o;
        applyEdit(a);
      } },
    ],
  });
}
function applyEdit(a) {
  a.status = 'draft';
  logEvent(state.campaign, 'manual_edit', { specId: a.specId });
  generateArtifacts(state.campaign);
  renderGrid();
  toast(`${a.specId} 개별 편집 적용`);
}

/* ═══════════ 하단 지시 바 ═══════════ */
function parseCommandRegex(text) {
  const patch = {};
  const venue = text.match(/(?:장소|장소를)\s*([가-힣A-Za-z0-9 ]+?)\s*(?:으로|로)\s*(?:변경|바꿔|수정)/) || text.match(/([가-힣A-Za-z0-9]+)(?:으로|로)\s*장소\s*변경/);
  if (venue) patch.venue = venue[1].trim();
  const date = text.match(/(?:일시|날짜)를?\s*([\d\-\.년월일\s]+?)\s*(?:으로|로)\s*(?:변경|바꿔|수정)/);
  if (date) patch.date = date[1].trim();
  const cta = text.match(/CTA를?\s*([가-힣A-Za-z0-9 ]+?)\s*(?:으로|로)\s*(?:변경|바꿔|수정)/i);
  if (cta) patch.cta = cta[1].trim();
  return Object.keys(patch).length ? patch : null;
}

async function onCommand(text) {
  user(text);
  if (/다른\s*시안|시안\s*바꿔/.test(text)) {
    for (const a of state.campaign.artifacts) if ((VARIANTS[a.channel] ?? 1) > 1) a.variant = ((a.variant ?? 0) + 1) % VARIANTS[a.channel];
    generateArtifacts(state.campaign);
    renderGrid();
    agent('전 산출물의 레이아웃 시안을 한 단계씩 바꿨어요.');
    return;
  }
  let patch = parseCommandRegex(text);
  if (!patch && LLM.hasKey()) {
    const wait = agent('지시 해석 중…');
    try { patch = await LLM.parseCommandLLM(text); } catch {}
    wait.remove();
    if (patch && !Object.keys(patch).length) patch = null;
  }
  if (!patch) { agent('이해하지 못했어요. 예: "장소 킨텍스로 변경" · "일시 11월 3일로 바꿔" · "다른 시안"'); return; }
  const { impacted, conflicts } = propagate(state.campaign, patch);
  state.ctx = state.campaign.context;
  renderPanel(); renderGrid();
  agent(`${Object.entries(patch).map(([f, v]) => `${FIELD_LABEL[f]} → ${v}`).join(', ')} — ${impacted.length}종 일괄 반영${conflicts.length ? `, ${conflicts.length}건 확인 필요` : ''}.`);
}
$('cmdGo').onclick = () => { const t = $('cmdIn').value.trim(); if (t) { $('cmdIn').value = ''; onCommand(t); } };
$('cmdIn').onkeydown = e => { if (e.key === 'Enter') $('cmdGo').click(); };

/* ═══════════ 승인 · 저장 ═══════════ */
function approveAll() {
  for (const a of state.campaign.artifacts) a.status = 'approved';
  logEvent(state.campaign, 'artifact_approved', { all: true });
  renderGrid();
  setStep('done');
  const kpi = state.campaign.log.reduce((m, e) => (m[e.type] = (m[e.type] ?? 0) + 1, m), {});
  agent(`전체 승인 완료 — 캠페인이 자산 서랍에 저장됐습니다.\n\nKPI 로그: 생성 ${kpi.artifact_generated ?? 0} · 개별 편집 ${kpi.manual_edit ?? 0} · 일괄 전파 ${kpi.propagation_run ?? 0} · 시안 변경 ${kpi.variation_cycled ?? 0}`);
  saveCampaignToStore();
  toast('전체 승인 완료 — 홈의 내 캠페인에 저장됨');
}

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
    snapshot.style = { ...snapshot.style, keyVisual: null };   // 쿼터 초과 — 키비주얼만 빼고 저장
    try { saveStore(list); } catch { toast('저장 공간 부족 — 캠페인 저장 실패'); }
  }
}

/* ═══════════ AI 키 ═══════════ */
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

/* ═══════════ boot ═══════════ */
$('homeBtn').onclick = showHome;
initHome();
showHome();
