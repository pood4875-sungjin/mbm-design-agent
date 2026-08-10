// MBM Design Agent — 앞문 UI. 플로우차트 그대로: 기획 입력 → Context → 산출물 선택
// → 추가 항목 → 그래픽 가이드 → 자동 생성 → 리뷰(일괄 전파·개별 편집) → 승인.
// 코어 엔진(순수 모듈)을 브라우저에서 직접 사용. LLM 파싱 자리는 parseBrief()가 대역.

import { createContext, updateContext, missingFields, CORE_FIELDS } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS } from '../core/contract.js';
import { registerAll, generateArtifacts, logEvent } from '../core/generate.js';
import { propagate } from '../core/propagate.js';

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

const SAMPLE = `10월 15일 코엑스에서 2026 ONSITE MBM 서울 진행.
대상은 건설 구조 엔지니어, 사전등록 받아야 함.
eDM이랑 랜딩페이지, 배너, 포스터, X배너 필요해.`;

const state = { step: 'brief', ctx: null, channels: [], style: null, campaign: null };

const chat = document.getElementById('chat');
const $ = id => document.getElementById(id);

/* ---------- chat helpers ---------- */
function agent(text) {
  const d = document.createElement('div');
  d.className = 'msg agent'; d.textContent = text;
  chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
}
function user(text) {
  const d = document.createElement('div');
  d.className = 'msg user'; d.textContent = text;
  chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
}
function widget(html) {
  const d = document.createElement('div');
  d.className = 'widget'; d.innerHTML = html;
  chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
  return d;
}
function toast(t) {
  const el = $('toast'); el.textContent = t; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}
function setStep(s) {
  state.step = s;
  const order = ['brief', 'context', 'channels', 'style', 'review', 'done'];
  document.querySelectorAll('#stepper span').forEach(el => {
    const i = order.indexOf(el.dataset.s), cur = order.indexOf(s);
    el.className = i < cur ? 'done' : i === cur ? 'on' : '';
  });
}

/* ---------- brief parsing (LLM 대역 — 앞문 서브플랜에서 교체) ---------- */
function parseBrief(text) {
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
  const channels = [];
  if (/eDM|이디엠|메일/i.test(text)) channels.push('edm');
  if (/랜딩/.test(text)) channels.push('landing');
  if (/(?<![Xx스])배너/.test(text)) channels.push('banner');
  if (/X\s?배너|엑스배너/i.test(text)) channels.push('xbanner');
  if (/포스터/.test(text)) channels.push('poster');
  if (/현수막/.test(text)) channels.push('hyunsumak');
  return { fields: out, channels: [...new Set(channels)] };
}

/* ---------- step 1: brief ---------- */
function stepBrief() {
  setStep('brief');
  agent('안녕하세요, MBM 캠페인 디자인 에이전트입니다.\n기획 내용을 자유롭게 붙여넣어 주세요. PPT·워드 파일도 좋습니다.');
  const w = widget(`
    <h4>기획 입력</h4>
    <textarea id="briefText" placeholder="예) 10월 15일 코엑스에서 MBM 진행..."></textarea>
    <div class="btn-row">
      <button class="btn" id="sampleBtn">샘플 기획 넣기</button>
      <button class="btn pri" id="briefGo">보내기</button>
    </div>`);
  w.querySelector('#sampleBtn').onclick = () => { w.querySelector('#briefText').value = SAMPLE; };
  w.querySelector('#briefGo').onclick = () => {
    const t = w.querySelector('#briefText').value.trim();
    if (!t) return;
    w.remove(); user(t); onBrief(t);
  };
}

function onBrief(text) {
  const { fields, channels } = parseBrief(text);
  state.ctx = createContext(fields);
  state.detectedChannels = channels;
  const found = CORE_FIELDS.filter(f => state.ctx.core[f]);
  agent(`이렇게 정리했어요.\n${found.map(f => `· ${FIELD_LABEL[f]} — ${state.ctx.core[f]}`).join('\n')}`);
  stepContext();
}

/* ---------- step 2: context 빈칸 ---------- */
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

/* ---------- step 3: 산출물 선택 ---------- */
function stepChannels() {
  setStep('channels');
  const pre = state.detectedChannels ?? [];
  if (pre.length) agent(`기획에서 ${pre.map(c => CHANNEL_LABEL[c]).join(', ')}를 발견해 미리 선택했어요. 필요한 산출물을 확정해 주세요.`);
  else agent('어떤 산출물을 만들까요?');
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

/* ---------- step 4: 채널별 추가 항목 ---------- */
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
      const v = i.value.trim() || '기본';
      (patch[i.dataset.ch] ??= {})[i.dataset.f] = v;
    });
    state.ctx = updateContext(state.ctx, { channelFields: patch });
    w.remove(); user('입력 완료');
    stepStyle();
  };
}

/* ---------- step 5: 그래픽 가이드 ---------- */
function stepStyle() {
  setStep('style');
  agent('이제 그래픽 가이드를 주세요. 키비주얼 이미지를 첨부하고 메인 컬러를 고르면, 모든 산출물에 하나의 스타일로 적용됩니다.');
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

/* ---------- step 6: 자동 생성 ---------- */
function runGenerate() {
  setStep('review');
  agent('자동 생성 중...');
  state.campaign = {
    id: slug(state.ctx.core.name), context: state.ctx, style: state.style,
    channels: state.channels, artifacts: [], log: [],
  };
  logEvent(state.campaign, 'campaign_created', {});
  registerAll();
  setTimeout(() => {
    generateArtifacts(state.campaign);
    renderBoard();
    const n = state.campaign.artifacts.length;
    agent(`${n}종 산출물을 생성했습니다. 오른쪽 보드에서 확인하세요.\n\n· 수정은 두 가지 — Context 값을 바꿔 [일괄 반영]하거나, 카드의 [편집]으로 개별 산출물만 고칠 수 있어요.\n· 검토가 끝나면 [전체 승인]을 눌러 주세요.`);
  }, 400);
}

function slug(name) {
  return (name || 'campaign').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
}

/* ---------- board ---------- */
const PREVIEW_W = { banner: s => s.w, edm: () => 600, landing: () => 1000 };
function naturalSize(spec) {
  if (spec.unit === 'mm') {
    const k = 3.7795;
    return [ (spec.wmm + spec.bleed * 2) * k, (spec.hmm + spec.bleed * 2) * k ];
  }
  if (spec.channel === 'banner') return [spec.w, spec.h];
  if (spec.channel === 'edm') return [600, 900];
  return [1000, 1400];
}

function renderBoard() {
  $('boardEmpty').style.display = 'none';
  $('boardHead').style.display = 'flex';
  $('ctxbar').style.display = 'block';
  $('campName').textContent = state.campaign.id;
  $('boardTitle').textContent = `${state.ctx.core.name} — 산출물 ${state.campaign.artifacts.length}종`;
  renderCtxBar();
  renderGrid();
}

function renderCtxBar() {
  const fields = ['date', 'venue', 'cta'];
  $('ctxFields').innerHTML = fields.map(f =>
    `<div class="f"><label>${FIELD_LABEL[f]}</label><input type="text" data-f="${f}" value="${state.campaign.context.core[f] ?? ''}"></div>`
  ).join('') + `<button class="btn pri" id="propBtn">일괄 반영</button>`;
  $('propBtn').onclick = () => {
    const patch = {};
    $('ctxFields').querySelectorAll('input').forEach(i => {
      if (i.value.trim() !== (state.campaign.context.core[i.dataset.f] ?? '')) patch[i.dataset.f] = i.value.trim();
    });
    if (!Object.keys(patch).length) { toast('변경된 값이 없습니다'); return; }
    const { impacted, conflicts } = propagate(state.campaign, patch);
    state.ctx = state.campaign.context;
    renderGrid();
    const note = $('propNote');
    note.style.display = 'block';
    note.textContent = conflicts.length
      ? `${impacted.length}종 일괄 반영 · ${conflicts.length}건 충돌(직접 편집한 값과 겹침) — 노란 배지 카드를 확인하세요`
      : `${impacted.length}종에 일괄 반영 완료 — 직접 편집한 표현은 그대로 보존됐습니다`;
    agent(`Context 변경(${Object.keys(patch).map(f => FIELD_LABEL[f]).join(', ')}) → 산출물 ${impacted.length}종 일괄 반영${conflicts.length ? `, ${conflicts.length}건은 확인 필요` : ''}.`);
  };
}

function renderGrid() {
  const grid = $('grid');
  grid.innerHTML = '';
  for (const a of state.campaign.artifacts) {
    const spec = SPECS[a.specId];
    const [nw, nh] = naturalSize(spec);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="prev"></div>
      <div class="meta"><b>${a.specId}</b><span class="badge ${a.status}">${
        { draft: 'DRAFT', approved: '승인됨', needsReview: '확인 필요' }[a.status] ?? a.status}</span></div>
      <div class="acts">
        <button class="btn ghost" data-act="edit">편집</button>
        <button class="btn ghost" data-act="open">크게 보기</button>
        <button class="btn ghost" data-act="dl">HTML</button>
      </div>`;
    const prev = card.querySelector('.prev');
    const iframe = document.createElement('iframe');
    const scale = Math.min(250 / nw, 210 / nh);
    iframe.width = nw; iframe.height = nh;
    iframe.style.transform = `translateX(-50%) scale(${scale})`;
    iframe.style.transformOrigin = 'top center';
    iframe.srcdoc = a.html;
    prev.appendChild(iframe);
    card.querySelector('[data-act=edit]').onclick = () => editArtifact(a);
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

function editArtifact(a) {
  const cur = a.overrides.core ?? {};
  const val = prompt(`[${a.specId}] 이 산출물에서만 바꿀 행사명 표기 (비우면 원복)`, cur.name ?? state.campaign.context.core.name);
  if (val === null) return;
  if (val.trim() && val.trim() !== state.campaign.context.core.name) {
    a.overrides.core = { ...cur, name: val.trim() };
  } else {
    delete (a.overrides.core ?? {}).name;
  }
  a.status = 'draft';
  logEvent(state.campaign, 'manual_edit', { specId: a.specId });
  generateArtifacts(state.campaign);
  renderGrid();
  toast(`${a.specId} 개별 편집 적용 — 다른 산출물은 그대로`);
}

function approveAll() {
  for (const a of state.campaign.artifacts) a.status = 'approved';
  logEvent(state.campaign, 'artifact_approved', { all: true });
  renderGrid();
  setStep('done');
  const kpi = state.campaign.log.reduce((m, e) => (m[e.type] = (m[e.type] ?? 0) + 1, m), {});
  agent(`전체 승인 완료.\n\n산출물 ${state.campaign.artifacts.length}종 — 배너·eDM·랜딩은 파일로, 포스터·X배너·현수막은 인쇄용 PDF 변환(scripts) 대상입니다.\n\nKPI 로그: 생성 ${kpi.artifact_generated ?? 0} · 개별 편집 ${kpi.manual_edit ?? 0} · 일괄 전파 ${kpi.propagation_run ?? 0}`);
  toast('전체 승인 완료');
}

/* ---------- boot ---------- */
stepBrief();
