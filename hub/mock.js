// AI 디자인 스튜디오 목업 — 피그마 UI 를 레퍼런스로 홈 → 광고 소재 흐름(플로우 v2 S1~S8)
//   실제 생성 · 내보내기는 하지 않는다. 보드 그림은 GS에너지 샘플 렌더(history/img/2026-10-22_ai-samples-bg).
import { TOOLS, toolById } from './tools.js';
import { STAGES } from './mock-data.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 없이 동작 */ } };
const TOOL_IC = { elevator: ['#14AE5C', 'E'], ad: ['#0D99FF', 'A'], mbm: ['#9747FF', 'M'], offline: ['#F24822', 'O'] };
const SAMPLE = { client: 'GS에너지', hire: '신입 공채', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', start: '2025-06-20', end: '2025-07-02', season: '2025 상반기', slogan: '', notice: '', type: '정규직', place: '서울 강남' };
const FIELDS = [['client', '고객사'], ['hire', '채용 구분'], ['role', '모집 직무', 'area'], ['start', '접수 시작', 'half'], ['end', '지원 마감', 'half'], ['season', '시즌'], ['slogan', '슬로건'], ['notice', '필수 고지 문구', 'area'], ['type', '고용 형태', 'half'], ['place', '근무지', 'half']];
const ALL = STAGES.flatMap(s => s.specs.map(x => ({ ...x, stage: s.stage })));
const KV_IMG = '../history/img/2026-10-22_ai-samples-bg/t1014-gs2025_kv.png';
const LOGO_IMG = 'assets/midas-logo.png';

let tabs = [], active = 'home';
let recent = read('aiStudioMock.recent', null) ?? [{ name: 'GS에너지 신입 공채', tool: 'ad', at: Date.now() - 3600e3, sample: true }];
const saveRecent = () => write('aiStudioMock.recent', recent);
const newId = () => 't' + Math.random().toString(36).slice(2, 8);
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '방금 수정' : m < 60 ? `${m}분 전 수정` : m < 1440 ? `${Math.round(m / 60)}시간 전 수정` : `${Math.round(m / 1440)}일 전 수정`; };

// ── 공통 ──
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 2200); }
function modal(title, body, actions) {
  $('modalBox').innerHTML = `<div class="modal-h"><span>${esc(title)}</span><button aria-label="닫기" data-m="x">✕</button></div><div class="modal-b">${body}</div><div class="modal-f">${actions.map((a, i) => `<button class="btn${a.pri ? ' pri' : ''}" data-m="${i}">${esc(a.label)}</button>`).join('')}</div>`;
  $('modal').hidden = false;
  $('modalBox').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const a = actions[+b.dataset.m]; closeModal(); a?.run?.(); });
  $('modalBox').querySelector('.btn.pri, .btn')?.focus();
}
function closeModal() { $('modal').hidden = true; }
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });

// ── 탭 바 ──
function renderTabs() {
  $('homeTab').setAttribute('aria-selected', String(active === 'home'));
  $('tabs').innerHTML = tabs.map(t => {
    const [c, l] = t.stage === 'pick' ? ['#B3B3B3', '+'] : TOOL_IC[t.tool];
    return `<div class="tab" role="tab" tabindex="0" data-tab="${t.id}" aria-selected="${active === t.id}" title="${esc(t.name)}"><span class="ic" style="background:${c}">${l}</span><span class="nm">${esc(t.name)}</span><button class="x" data-close="${t.id}" aria-label="${esc(t.name)} 닫기">✕</button></div>`;
  }).join('');
}
function activate(id) {
  active = id;
  document.querySelectorAll('#views > .view').forEach(v => { v.hidden = v.dataset.view !== id; });
  if (id === 'home') renderHome(homeEl, null);
  renderTabs();
  const t = tabs.find(x => x.id === id); if (t?.stage === 'board') requestAnimationFrame(() => fitIfNeeded(t));
}
$('homeTab').onclick = () => activate('home');
$('newTab').onclick = () => { const t = { id: newId(), stage: 'pick', name: '새 탭' }; tabs.push(t); mount(t); activate(t.id); };
$('tabs').addEventListener('click', e => { const x = e.target.closest('[data-close]'); if (x) { e.stopPropagation(); closeTab(x.dataset.close); return; } const t = e.target.closest('[data-tab]'); if (t) activate(t.dataset.tab); });
$('tabs').addEventListener('keydown', e => { const t = e.target.closest('[data-tab]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); activate(t.dataset.tab); } });
function closeTab(id) {
  const t = tabs.find(x => x.id === id); if (!t) return;
  const go = () => { const i = tabs.indexOf(t); tabs.splice(i, 1); document.querySelector(`#views > [data-view="${id}"]`)?.remove(); if (active === id) activate(tabs[i]?.id ?? tabs[i - 1]?.id ?? 'home'); else renderTabs(); };
  if (t.stage === 'board') modal('이 탭을 닫을까요?', '<p>저장하지 않은 변경이 있으면 사라질 수 있어요. (목업: 실제로 저장되는 건 없어요)</p>', [{ label: '취소' }, { label: '닫기', pri: true, run: go }]);
  else go();
}

// ── 홈 · 새 탭 고르기(S1 · S1-b · S1-c) ──
const homeEl = document.createElement('section'); homeEl.className = 'view home'; homeEl.dataset.view = 'home'; $('views').appendChild(homeEl);
function renderHome(el, pickId) {
  const create = TOOLS.map(t => { const [c, l] = TOOL_IC[t.id]; return `<button class="ct" data-tool="${t.id}"${t.enabled ? '' : ' aria-disabled="true"'}><span class="ct-ic" style="background:${c}">${l}</span><span><span class="ct-t">${esc(t.name)}</span><span class="ct-d">${esc(t.desc)}</span><span class="tag ${t.tone === 'off' ? 'off' : 'warn'}">${esc(t.status)}</span></span></button>`; }).join('');
  const files = recent.length ? `<div class="files">${recent.map((r, i) => { const [c, l] = TOOL_IC[r.tool]; return `<button class="file" data-recent="${i}"><span class="th"><img src="../history/img/2026-10-22_ai-samples-bg/t1014-gs2025_kakao-display-pc-promo_C.png" alt=""></span><span class="meta"><span class="ic" style="background:${c}">${l}</span><span><b>${esc(r.name)}${r.sample ? ' (예시)' : ''}</b><small>${esc(toolById(r.tool).name)} · ${ago(r.at)}</small></span></span></button>`; }).join('')}</div>` : '<div class="empty-files">아직 연 작업이 없어요. 위에서 만들 산출물을 골라요.</div>';
  el.innerHTML = `<div class="home-in"><h1>무엇을 만들까요?</h1><p class="lead">만들 산출물을 고르면 새 탭에서 바로 작업 화면이 열려요.</p><div class="create">${create}</div>
    ${pickId ? '' : `<div class="sec-h"><h2>최근 작업</h2><span>이 브라우저에서 연 작업 · 서버 저장은 2차</span></div>${files}`}</div>`;
  el.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => pickTool(b.dataset.tool, pickId));
  el.querySelectorAll('[data-recent]').forEach(b => b.onclick = () => { const r = recent[+b.dataset.recent]; openBoard(r.name); });
}
function pickTool(toolId, pickId) {
  const t = toolById(toolId);
  if (!t.enabled) { if (t.note) modal(`${t.name}은 준비 중이에요`, `<p>${esc(t.note)}</p>`, [{ label: '확인', pri: true }]); return; }
  if (toolId !== 'ad') { modal('엘리베이터 콘텐츠 목업은 다음 단계예요', '<p>이번 목업은 광고 소재 흐름 위주로 만들었어요. 엘리베이터는 같은 틀로 이어서 그릴게요.</p>', [{ label: '확인', pri: true }]); return; }
  let tab = pickId ? tabs.find(x => x.id === pickId) : null;
  const fresh = { tool: 'ad', stage: 'empty', name: '새 광고 소재', fields: { ...Object.fromEntries(FIELDS.map(f => [f[0], ''])) }, page: '하', sel: null, zoom: null, lt: 'input', rt: 'design', approved: new Set(), toolMode: 'move' };
  if (tab) Object.assign(tab, fresh); else { tab = { id: newId(), ...fresh }; tabs.push(tab); }
  mount(tab); activate(tab.id);
}
function openBoard(name) {
  const tab = { id: newId(), tool: 'ad', stage: 'board', name, fields: { ...SAMPLE }, page: '하', sel: null, zoom: null, lt: 'layers', rt: 'design', approved: new Set(), toolMode: 'move' };
  tabs.push(tab); mount(tab); activate(tab.id);
}

// ── 탭 화면 ──
function viewOf(tab) {
  let el = document.querySelector(`#views > [data-view="${tab.id}"]`);
  if (!el) { el = document.createElement('section'); el.dataset.view = tab.id; el.hidden = true; $('views').appendChild(el); }
  return el;
}
function mount(tab) {
  const el = viewOf(tab);
  if (tab.stage === 'pick') { el.className = 'view home'; renderHome(el, tab.id); return; }
  el.className = 'view editor';
  el.innerHTML = `<aside class="lp" aria-label="왼쪽 패널"></aside><div class="canvas" tabindex="-1" aria-label="캔버스"></div><aside class="rp" aria-label="오른쪽 패널"></aside>`;
  renderLeft(tab); renderCanvas(tab); renderRight(tab); wireCanvas(tab);
}

// 왼쪽 패널 — 피그마 File 탭(페이지 · 레이어) 문법. 입력 = 캠페인 정보, 레이어 = 차수(페이지) › 매체(섹션) › 규격(프레임)
function renderLeft(tab) {
  const el = viewOf(tab).querySelector('.lp');
  const field = ([k, l, kind]) => kind === 'area'
    ? `<div class="fld"><label for="${tab.id}-${k}">${l}</label><textarea class="in" id="${tab.id}-${k}" data-f="${k}" rows="2">${esc(tab.fields[k])}</textarea></div>`
    : `<div class="fld"><label for="${tab.id}-${k}">${l}</label><input class="in" id="${tab.id}-${k}" data-f="${k}" value="${esc(tab.fields[k])}"></div>`;
  const rows = []; for (let i = 0; i < FIELDS.length; i++) { const f = FIELDS[i]; if (f[2] === 'half' && FIELDS[i + 1]?.[2] === 'half') { rows.push(`<div class="row2">${field(f)}${field(FIELDS[i + 1])}</div>`); i++; } else rows.push(field(f)); }
  const pages = STAGES.map(s => `<button class="li" data-page="${s.stage}" aria-selected="${tab.page === s.stage}"><span class="gl">▤</span><span class="t">${s.stage}</span><span class="n">${s.specs.length}</span></button>`).join('');
  const groups = {}; for (const s of ALL.filter(x => x.stage === tab.page)) (groups[s.media] ??= []).push(s);
  const layers = tab.stage === 'board' ? Object.entries(groups).map(([m, list]) => `<div class="li"><span class="gl">▢</span><span class="t">${esc(m)}</span></div>` + list.map(s => `<button class="li ind" data-sel="${s.id}" aria-selected="${tab.sel === s.id}"><span class="gl">#</span><span class="t">${esc(shortName(s))}</span><span class="n">${s.w}×${s.h}</span></button>`).join('')).join('') : '<p class="empty-note">생성하면 규격 프레임이 여기에 쌓여요.</p>';
  el.innerHTML = `<div class="lp-head"><span class="logo">M</span><div class="fname"><b contenteditable="true" spellcheck="false" data-rename>${esc(tab.name)}</b><small>광고 소재 · ${tab.stage === 'board' ? '보드' : '초안'}</small></div></div>
    <div class="seg" role="tablist"><button role="tab" data-lt="input" aria-selected="${tab.lt === 'input'}">입력</button><button role="tab" data-lt="layers" aria-selected="${tab.lt === 'layers'}">레이어</button></div>
    <div class="pane" ${tab.lt === 'input' ? '' : 'hidden'}>
      <div class="grp"><div class="grp-h">캠페인 정보<button data-sample title="샘플로 채우기" aria-label="샘플로 채우기">⟲</button></div>${rows.join('')}</div>
      <div class="grp"><div class="grp-h">에셋</div>
        <div class="asset"><span class="sw" style="background-image:url('${KV_IMG}')"></span><span>키비주얼 · GS에너지 일러스트</span><button>바꾸기</button></div>
        <div class="asset"><span class="sw" style="background:#fff url('${LOGO_IMG}') center/80% no-repeat"></span><span>로고</span><button>바꾸기</button></div></div>
      <div class="grp"><div class="grp-h">브랜드 컬러</div><div class="swatches"><i style="background:#0B5FA5"></i><i style="background:#79C3EA"></i><i style="background:#D9F0FA"></i></div></div>
    </div>
    <div class="pane" ${tab.lt === 'layers' ? '' : 'hidden'}>
      <div class="grp"><div class="grp-h">페이지 · 차수</div><div class="list">${pages}</div></div>
      <div class="grp"><div class="grp-h">레이어</div><div class="list">${layers}</div></div>
    </div>`;
  el.querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { tab.lt = b.dataset.lt; renderLeft(tab); });
  el.querySelectorAll('[data-f]').forEach(i => i.oninput = () => { tab.fields[i.dataset.f] = i.value; });
  el.querySelector('[data-sample]').onclick = () => { tab.fields = { ...SAMPLE }; renderLeft(tab); toast('샘플 브리프로 채웠어요'); };
  el.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { tab.page = b.dataset.page; tab.sel = null; tab.zoom = null; renderLeft(tab); renderCanvas(tab); renderRight(tab); });
  el.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => select(tab, b.dataset.sel, true));
  const rn = el.querySelector('[data-rename]');
  rn.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); rn.blur(); } };
  rn.onblur = () => { tab.name = rn.textContent.trim() || tab.name; renderTabs(); };
}
const shortName = s => (s.name ?? s.id).replace(/^.*? - /, '');

// 캔버스 — 빈 상태(S2) / 보드(S3~)
function renderCanvas(tab) {
  const cv = viewOf(tab).querySelector('.canvas');
  const toolbar = `<div class="toolbar" role="toolbar" aria-label="도구">
      <button class="tool" data-mode="move" aria-pressed="${tab.toolMode === 'move'}" title="선택 (V)" aria-label="선택"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 2l9 5.5-4 1-2 4z" fill="currentColor"/></svg></button>
      <button class="tool" data-mode="hand" aria-pressed="${tab.toolMode === 'hand'}" title="손 (H)" aria-label="손"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M5 8V3.5a1 1 0 0 1 2 0V7m0-4a1 1 0 0 1 2 0V7m0-3a1 1 0 0 1 2 0v4m0-2a1 1 0 0 1 2 0v4c0 3-2 4.5-4.5 4.5S5 13 4 11L2.5 8.5a1 1 0 0 1 1.7-1L5 8.5"/></svg></button>
      <button class="tool" data-comment title="코멘트 (C)" aria-label="코멘트"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 2.5a5.5 5.5 0 0 0-4.8 8.2L2.5 13.5l2.9-.7A5.5 5.5 0 1 0 8 2.5z"/></svg></button>
      <span class="tool-sep"></span>
      <button class="tool-gen" data-gen><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6z"/></svg>${tab.stage === 'board' ? '다시 생성' : '생성'}</button>
    </div>`;
  if (tab.stage !== 'board') {
    cv.innerHTML = `<div class="drop"><div class="drop-box">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#757575" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 0L7 8m5-5 5 5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>
        <h3>채용 브리프를 여기에 끌어다 놓으세요</h3><p>txt · md · PDF · 워드 · 왼쪽 「입력」에 직접 적어도 돼요</p>
        <div class="drop-act"><button class="btn" data-pick>파일 고르기</button><button class="btn" data-fill>샘플 브리프로 채우기</button></div>
        <input type="file" accept=".txt,.md,.pdf,.docx" hidden data-file></div></div>${toolbar}`;
    const drop = cv.querySelector('.drop'), inp = cv.querySelector('[data-file]');
    const take = f => { tab.fields = { ...SAMPLE }; tab.name = f.name.replace(/\.[^.]+$/, ''); tab.lt = 'input'; renderLeft(tab); renderTabs(); toast(`${f.name} 를 읽어 입력을 채웠어요 (목업: 샘플 값)`); };
    cv.querySelector('[data-pick]').onclick = () => inp.click();
    inp.onchange = () => inp.files[0] && take(inp.files[0]);
    cv.querySelector('[data-fill]').onclick = () => { tab.fields = { ...SAMPLE }; tab.lt = 'input'; renderLeft(tab); toast('샘플 브리프로 채웠어요 · 아래 「생성」을 눌러요'); };
    cv.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    cv.ondragleave = e => { if (!cv.contains(e.relatedTarget)) drop.classList.remove('over'); };
    cv.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) take(f); };
  } else {
    const groups = {}; for (const s of ALL.filter(x => x.stage === tab.page)) (groups[s.media] ??= []).push(s);
    cv.innerHTML = `<div class="sizer"><div class="board">${Object.entries(groups).map(([m, list]) => `<div class="msec"><span class="msec-t">${esc(m)}</span><div class="frames">${list.map(s => `<div class="frame${tab.sel === s.id ? ' sel' : ''}${tab.approved.has(s.id) ? ' approved' : ''}" data-frame="${s.id}" style="width:${s.w}px;height:${s.h}px"><span class="fl">${esc(shortName(s))}</span><img src="${esc(s.img)}" alt="${esc(s.media + ' ' + shortName(s))}" loading="lazy" draggable="false"><span class="sz">${s.w} × ${s.h}</span><i class="hd a"></i><i class="hd b"></i><i class="hd c"></i><i class="hd d"></i></div>`).join('')}</div></div>`).join('')}</div></div>${toolbar}<div class="zoomhint">⌘/Ctrl + 휠 확대 · 손 도구로 이동</div>`;
    cv.querySelectorAll('[data-frame]').forEach(f => f.onclick = e => { if (tab.toolMode !== 'move') return; e.stopPropagation(); select(tab, f.dataset.frame, false); });
    cv.querySelector('.sizer').onclick = () => { if (tab.sel) { tab.sel = null; refreshSel(tab); } };
    applyZoom(tab);
  }
  cv.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { tab.toolMode = b.dataset.mode; cv.classList.toggle('pan', tab.toolMode === 'hand'); cv.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mode === tab.toolMode))); });
  cv.querySelector('[data-comment]').onclick = () => toast('코멘트는 2차(서버 · 로그인) 뒤에 열려요');
  cv.querySelector('[data-gen]').onclick = () => generate(tab);
}
function generate(tab) {
  const f = tab.fields;
  if (!f.client?.trim()) { tab.lt = 'input'; renderLeft(tab); toast('왼쪽 「입력」에 고객사를 적거나 샘플 브리프로 채워요'); viewOf(tab).querySelector('[data-f="client"]')?.focus(); return; }
  const cv = viewOf(tab).querySelector('.canvas');
  const busy = document.createElement('div'); busy.className = 'busy'; busy.innerHTML = `<div class="busy-in"><span class="spin"></span>${ALL.length}개 규격을 그리는 중…</div>`; cv.appendChild(busy);
  setTimeout(() => {
    if (tab.stage !== 'board' && tab.name.startsWith('새 ')) tab.name = `${f.client} ${f.hire}`.trim();
    tab.stage = 'board'; tab.lt = 'layers'; tab.sel = null; tab.zoom = null;
    recent = [{ name: tab.name, tool: 'ad', at: Date.now() }, ...recent.filter(r => r.name !== tab.name && !r.sample)].slice(0, 8); saveRecent();
    renderLeft(tab); renderCanvas(tab); renderRight(tab); renderTabs();
    toast(`${tab.page} 차수 ${ALL.filter(x => x.stage === tab.page).length}개 · 전체 ${ALL.length}개 규격을 그렸어요`);
  }, 900);
}

// 줌 · 이동
function boardSize(cv) { const b = cv.querySelector('.board'); return b ? [b.scrollWidth, b.scrollHeight] : [0, 0]; }
function applyZoom(tab) {
  const cv = viewOf(tab).querySelector('.canvas'); if (!cv.querySelector('.board')) return;
  if (tab.zoom == null && !cv.clientWidth) return;   // 아직 안 보이는 탭 — 보일 때(activate) 맞춘다
  if (tab.zoom == null) { const [bw] = boardSize(cv); tab.zoom = Math.max(.05, Math.min(1, (cv.clientWidth - 40) / (bw || 1))); }
  cv.style.setProperty('--z', tab.zoom);
  const [bw, bh] = boardSize(cv); const sz = cv.querySelector('.sizer'); sz.style.width = bw * tab.zoom + 'px'; sz.style.height = bh * tab.zoom + 120 + 'px';
  const zs = viewOf(tab).querySelector('[data-zoom]'); if (zs) zs.querySelector('option').textContent = Math.round(tab.zoom * 100) + '%';
}
function fitIfNeeded(tab) { if (tab.stage === 'board') applyZoom(tab); }
function wireCanvas(tab) {
  const cv = viewOf(tab).querySelector('.canvas');
  cv.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey) || tab.stage !== 'board') return; e.preventDefault();
    const r = cv.getBoundingClientRect(), px = (cv.scrollLeft + e.clientX - r.left) / tab.zoom, py = (cv.scrollTop + e.clientY - r.top) / tab.zoom;
    tab.zoom = Math.max(.05, Math.min(2, tab.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))); applyZoom(tab);
    cv.scrollLeft = px * tab.zoom - (e.clientX - r.left); cv.scrollTop = py * tab.zoom - (e.clientY - r.top); }, { passive: false });
  let drag = null;
  cv.addEventListener('pointerdown', e => { if (tab.toolMode !== 'hand' && e.button !== 1) return; drag = { x: e.clientX, y: e.clientY, l: cv.scrollLeft, t: cv.scrollTop }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!drag) return; cv.scrollLeft = drag.l - (e.clientX - drag.x); cv.scrollTop = drag.t - (e.clientY - drag.y); });
  cv.addEventListener('pointerup', () => { drag = null; });
}
function select(tab, id, scroll) {
  tab.sel = id; refreshSel(tab);
  if (scroll) { const f = viewOf(tab).querySelector(`[data-frame="${CSS.escape(id)}"]`); f?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }); }
}
function refreshSel(tab) {
  viewOf(tab).querySelectorAll('[data-frame]').forEach(f => { f.classList.toggle('sel', f.dataset.frame === tab.sel); f.classList.toggle('approved', tab.approved.has(f.dataset.frame)); });
  viewOf(tab).querySelectorAll('.lp [data-sel]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sel === tab.sel)));
  renderRight(tab);
}

// 오른쪽 패널 — 피그마 Design / Prototype 자리 = 디자인 / 검수
function renderRight(tab) {
  const el = viewOf(tab).querySelector('.rp');
  const s = ALL.find(x => x.id === tab.sel);
  const pageList = ALL.filter(x => x.stage === tab.page);
  const top = `<div class="rp-top"><span class="ava" title="나">성</span><button class="btn pri" data-export ${tab.stage === 'board' ? '' : 'disabled'}>내보내기</button><select class="zoom" data-zoom aria-label="확대"><option>${tab.zoom ? Math.round(tab.zoom * 100) + '%' : '—'}</option><option value="fit">화면에 맞춤</option><option value=".1">10%</option><option value=".25">25%</option><option value=".5">50%</option><option value="1">100%</option></select></div>
    <div class="seg" role="tablist"><button role="tab" data-rt="design" aria-selected="${tab.rt === 'design'}">디자인</button><button role="tab" data-rt="check" aria-selected="${tab.rt === 'check'}">검수</button></div>`;
  let body = '';
  if (tab.stage !== 'board') body = `<div class="pane"><div class="grp"><div class="grp-h">시작</div><p class="note">왼쪽 「입력」을 채우거나 브리프 파일을 캔버스에 놓고, 아래 「생성」을 눌러요. 생성하면 여기에 고른 규격의 설정이 나와요.</p></div><div class="grp"><div class="grp-h">만들 규격</div>${STAGES.map(x => `<div class="chk"><span class="dot ok"></span>${x.stage}<span class="v">${x.specs.length}개</span></div>`).join('')}<p class="note">차수(하 · 중 · 상 · 보조)는 생성 뒤 왼쪽 「레이어」의 페이지로 나뉘어요.</p></div></div>`;
  else if (tab.rt === 'check') {
    const items = s ? [['크기', `${s.w}×${s.h}`], ['매체 글자 수 규정', '확인 필요'], ['로고', '확인 필요'], ['안전 영역', '확인 필요'], ['글자-그림 겹침', '확인 필요'], ['글자 대비', '확인 필요']] : [['이 페이지 규격', `${pageList.length}개`], ['승인', `${pageList.filter(x => tab.approved.has(x.id)).length}/${pageList.length}`]];
    body = `<div class="pane"><div class="grp"><div class="grp-h">${s ? esc(shortName(s)) : '페이지 ' + tab.page} 검수</div>${items.map(([k, v]) => `<div class="chk"><span class="dot${/^\d/.test(v) || v.includes('×') ? ' ok' : ''}"></span>${k}<span class="v">${v}</span></div>`).join('')}<p class="note">목업이에요 — 실제 결과는 광고 소재 도구의 가이드 검수가 채워요.</p></div></div>`;
  } else if (!s) body = `<div class="pane"><div class="grp"><div class="grp-h">페이지 · ${tab.page}</div><div class="kv"><div class="inbox"><i>#</i><span>${pageList.length}개 규격</span></div><div class="inbox"><i>✓</i><span>승인 ${pageList.filter(x => tab.approved.has(x.id)).length}</span></div></div><button class="btn full" data-approve-all>이 페이지 모두 승인</button></div>
      <div class="grp"><div class="grp-h">스타일</div><div class="fld"><label>지면</label><select class="in"><option>키비주얼에 맞춤(자동)</option><option>브랜드 컬러</option><option>밝은 지면</option></select></div><div class="fld"><label>글자 톤</label><div class="segc"><button aria-pressed="true">자동</button><button aria-pressed="false">다크</button><button aria-pressed="false">라이트</button></div></div></div>
      <div class="grp"><div class="grp-h">키비주얼</div><div class="asset"><span class="sw" style="background-image:url('${KV_IMG}')"></span><span>GS에너지 일러스트</span></div><button class="btn full" data-ai>AI 그림 판단</button></div>
      <div class="grp"><div class="grp-h">내보내기<button data-export aria-label="내보내기">+</button></div><div class="exp-row"><div class="inbox"><span>PNG 묶음(ZIP)</span></div><div class="inbox"><span>1x</span></div><span></span></div><div class="exp-row"><div class="inbox"><span>피그마 편집용 SVG</span></div><div class="inbox"><span>—</span></div><span></span></div></div></div>`;
  else body = `<div class="pane"><div class="grp"><div class="sel-h"># ${esc(shortName(s))}</div><div class="sel-s">${esc(s.media)} · 차수 ${s.stage}</div><div class="kv"><div class="inbox"><i>W</i><span>${s.w}</span></div><div class="inbox"><i>H</i><span>${s.h}</span></div></div><p class="note">크기는 매체 규정이라 바꿀 수 없어요.</p></div>
      <div class="grp"><div class="grp-h">배치</div><div class="fld"><label>키비주얼 위치</label><select class="in"><option>자동(AI 판단)</option><option>오른쪽</option><option>왼쪽</option><option>아래</option><option>배경 전체</option></select></div><div class="fld"><label>키비주얼 크기</label><select class="in"><option>자동</option><option>크게</option><option>보통</option><option>작게</option></select></div><div class="fld"><label>글자 정렬</label><div class="segc"><button aria-pressed="true">자동</button><button aria-pressed="false">왼쪽</button><button aria-pressed="false">가운데</button><button aria-pressed="false">오른쪽</button></div></div></div>
      <div class="grp"><div class="grp-h">글자</div><div class="fld"><label>메인 문구</label><input class="in" value="${esc(tab.fields.client + ' ' + tab.fields.hire)}"></div><div class="fld"><label>날짜</label><input class="in" value="6.20(금) - 7.2(수) 17시"></div></div>
      <div class="grp"><div class="grp-h">내보내기<button data-export aria-label="내보내기">+</button></div><div class="exp-row"><div class="inbox"><span>PNG</span></div><div class="inbox"><span>1x</span></div><span></span></div></div>
      <div class="grp"><button class="btn full${tab.approved.has(s.id) ? '' : ' pri'}" data-approve>${tab.approved.has(s.id) ? '승인 취소' : '이 규격 승인'}</button></div></div>`;
  el.innerHTML = top + body;
  el.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { tab.rt = b.dataset.rt; renderRight(tab); });
  el.querySelectorAll('[data-export]').forEach(b => b.onclick = () => exportModal(tab));
  el.querySelector('[data-zoom]').onchange = e => { const v = e.target.value; if (v === 'fit') tab.zoom = null; else tab.zoom = +v; applyZoom(tab); renderRight(tab); };
  el.querySelector('[data-ai]')?.addEventListener('click', () => toast('AI 그림 판단 — 실제 도구에서 캠페인당 한 번 돌아요(목업)'));
  el.querySelector('[data-approve]')?.addEventListener('click', () => { tab.approved.has(s.id) ? tab.approved.delete(s.id) : tab.approved.add(s.id); refreshSel(tab); });
  el.querySelector('[data-approve-all]')?.addEventListener('click', () => { pageList.forEach(x => tab.approved.add(x.id)); refreshSel(tab); toast(`${tab.page} 차수 ${pageList.length}개를 승인했어요`); });
  el.querySelectorAll('.segc').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)))));
}
function exportModal(tab) {
  const n = tab.approved.size;
  modal('내보내기', `<label class="opt"><input type="radio" name="fmt" checked><span><b>PNG 묶음(ZIP)</b><small>매체별 폴더 · 매체가 정한 이름 규칙</small></span></label>
      <label class="opt"><input type="radio" name="fmt"><span><b>피그마 편집용 SVG</b><small>글자는 고칠 수 있는 텍스트로</small></span></label>
      <label class="opt"><input type="radio" name="scope" ${n ? 'checked' : ''}><span><b>승인한 규격만</b><small>${n}개</small></span></label>
      <label class="opt"><input type="radio" name="scope" ${n ? '' : 'checked'}><span><b>전체(검토용)</b><small>${ALL.length}개 · 승인 안 한 건 「미승인_검토용」 폴더로</small></span></label>`,
    [{ label: '취소' }, { label: '내보내기', pri: true, run: () => { recent = [{ name: tab.name, tool: 'ad', at: Date.now() }, ...recent.filter(r => r.name !== tab.name)].slice(0, 8); saveRecent(); toast('목업이라 파일은 만들지 않아요 · 작업 내역에 남겼어요'); } }]);
}

// ── 작업 내역 · 설정 팝오버(S7) ──
function pop(btn, fill) {
  const p = $('pop'); const open = p.hidden || p.dataset.for !== btn.id;
  p.hidden = true; document.querySelectorAll('.tb-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
  if (!open) return; p.dataset.for = btn.id; fill(p); p.hidden = false; btn.setAttribute('aria-expanded', 'true');
}
$('historyBtn').onclick = e => { e.stopPropagation(); pop($('historyBtn'), p => { p.innerHTML = '<h3>작업 내역 · 이 브라우저</h3>' + (recent.length ? recent.map((r, i) => `<button class="it" data-h="${i}"><b>${esc(r.name)}${r.sample ? ' (예시)' : ''}</b><small>${esc(toolById(r.tool).name)} · ${ago(r.at)}</small></button>`).join('') : '<p>아직 연 작업이 없어요.</p>'); p.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { p.hidden = true; const r = recent[+b.dataset.h]; const open = tabs.find(t => t.name === r.name && t.stage === 'board'); open ? activate(open.id) : openBoard(r.name); }); }); };
$('settingsBtn').onclick = e => { e.stopPropagation(); pop($('settingsBtn'), p => { p.innerHTML = '<h3>설정</h3><p>AI 키 · 글꼴 같은 도구 설정은 각 도구 안에서 해요. 로그인 · 팀 · 공용 작업 내역은 2차(서버)에서 열려요.</p><button class="it" data-clear><b>목업 기록 지우기</b><small>최근 작업 · 열린 탭</small></button>'; p.querySelector('[data-clear]').onclick = () => { recent = []; saveRecent(); tabs = []; document.querySelectorAll('#views > .view:not([data-view="home"])').forEach(v => v.remove()); p.hidden = true; activate('home'); }; }); };
document.addEventListener('click', e => { if (!e.target.closest('.pop')) { $('pop').hidden = true; document.querySelectorAll('.tb-btn').forEach(b => b.setAttribute('aria-expanded', 'false')); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); $('pop').hidden = true; }
  const t = tabs.find(x => x.id === active); if (!t || t.stage === 'pick' || /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
  if (e.key === 'v' || e.key === 'h') { const m = e.key === 'v' ? 'move' : 'hand'; viewOf(t).querySelector(`[data-mode="${m}"]`)?.click(); }
});
window.addEventListener('resize', () => { const t = tabs.find(x => x.id === active); if (t?.stage === 'board') applyZoom(t); });

activate('home');
// 바로 보기: #empty = 새 광고 소재 빈 작업 화면, #board = 생성된 보드(공유 · 리뷰용)
if (location.hash === '#empty') pickTool('ad', null);
else if (location.hash === '#board') openBoard('GS에너지 신입 공채');
