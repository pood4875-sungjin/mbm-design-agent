// AI 디자인 스튜디오 목업 — 피그마 UI2 키트 컴포넌트(fui/ui2.css · fui/icons.js)로 홈 → 광고 소재 흐름
//   시작 = 자연어 + 예시(샘플) → 불러오는 중 → 에디터(툴바 · 레이어/입력 사이드바 · 캔버스 · 디자인/검수 사이드바)
//   실제 생성 · 내보내기는 하지 않는다. 보드 그림은 history/img 의 예시 렌더(EXAMPLES).
import { TOOLS, toolById } from './tools.js';
import { STAGES } from './mock-data.js';
import { icon } from './fui/icons.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 없이 동작 */ } };
const TOOL_IC = { elevator: ['#1BC47D', 'E'], ad: ['#18A0FB', 'A'], mbm: ['#7B61FF', 'M'], offline: ['#F24822', 'O'] };
const FIELDS = [['client', '고객사'], ['hire', '채용 구분'], ['role', '모집 직무', 'area'], ['start', '접수 시작', 'half'], ['end', '지원 마감', 'half'], ['season', '시즌'], ['slogan', '슬로건'], ['notice', '필수 고지 문구', 'area'], ['type', '고용 형태', 'half'], ['place', '근무지', 'half']];
const ALL = STAGES.flatMap(s => s.specs.map(x => ({ ...x, stage: s.stage })));
const LOGO_IMG = 'assets/midas-logo.png';
const IMG = '../history/img/';

// 예시(샘플) — 시작 화면 카드. 그림은 2026-10-22 AI 샘플 렌더(51 규격 전부 있음)
const GS = { client: 'GS에너지', hire: '신입 공채', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', start: '2025-06-20', end: '2025-07-02', season: '2025 상반기', slogan: '', notice: '', type: '정규직', place: '서울 강남' };
const MIDAS = { client: '마이다스아이티', hire: '신입 공채', role: '경영 · 개발 · 디자인', start: '2025-09-01', end: '2025-09-21', season: '2025 하반기', slogan: '', notice: '', type: '정규직', place: '판교' };
export const EXAMPLES = [
  { id: 'gs-illust', title: 'GS에너지 신입 공채', by: '일러스트 키비주얼', dir: '2026-10-22_ai-samples-bg', case: 't1014-gs2025', kv: 't1014-gs2025_kv.png', fields: GS, prompt: 'GS에너지 2025 상반기 신입 공채. 일반(사업·재무)과 보훈 전형, 6월 20일부터 7월 2일 17시까지 접수. 일러스트 키비주얼로 밝게.' },
  { id: 'gs-photo', title: 'GS에너지 신입 공채', by: '신호등 사진 키비주얼', dir: '2026-10-22_ai-samples-bg', case: 'pin-15', kv: 'pin-15_kv.jpg', fields: GS, prompt: 'GS에너지 2025 상반기 신입 공채. 사진 키비주얼(신호등)을 살리고 글자는 사진을 피해서.' },
  { id: 'midas-team', title: '마이다스아이티 신입 공채', by: '팀 사진 키비주얼', dir: '2026-10-22_ai-samples-midas', case: 'midas-team-photo', kv: 'midas-team-photo_kv.jpg', fields: MIDAS, prompt: '마이다스아이티 2025 하반기 신입 공채. 경영·개발·디자인 직군, 9월 1일부터 21일까지. 팀 사진을 키비주얼로.' },
  { id: 'midas-3d', title: '마이다스아이티 신입 공채', by: '3D 캐릭터 키비주얼', dir: '2026-10-22_ai-samples-midas', case: 'midas-faces-3d', kv: 'midas-faces-3d_kv.jpg', fields: MIDAS, prompt: '마이다스아이티 2025 하반기 신입 공채. 3D 캐릭터 얼굴 키비주얼, 얼굴은 가리지 말 것.' },
  { id: 'midas-iso', title: '마이다스아이티 신입 공채', by: '아이소메트릭 키비주얼', dir: '2026-10-22_ai-samples-midas', case: 'midas-jeil-iso', kv: 'midas-jeil-iso_kv.png', fields: MIDAS, prompt: '마이다스아이티 2025 하반기 신입 공채. 아이소메트릭 일러스트 키비주얼.' },
];
const exById = id => EXAMPLES.find(e => e.id === id) ?? EXAMPLES[0];
const frameImg = (ex, s) => `${IMG}${ex.dir}/${ex.case}_${s.id}_C.png`;
const kvImg = ex => `${IMG}${ex.dir}/${ex.kv}`;
const thumbImg = ex => `${IMG}${ex.dir}/${ex.case}_kakao-display-pc-promo_C.png`;

let tabs = [], active = 'home';
let recent = read('aiStudioMock.recent', null) ?? [{ name: 'GS에너지 신입 공채', tool: 'ad', ex: 'gs-illust', at: Date.now() - 3600e3, sample: true }];
const saveRecent = () => write('aiStudioMock.recent', recent);
const newId = () => 't' + Math.random().toString(36).slice(2, 8);
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '방금 수정' : m < 60 ? `${m}분 전 수정` : m < 1440 ? `${Math.round(m / 60)}시간 전 수정` : `${Math.round(m / 1440)}일 전 수정`; };
const shortName = s => (s.name ?? s.id).replace(/^.*? - /, '');

// ── 공통: 벨(토스트) · 모달 ──
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }
function modal(title, body, actions) {
  $('modalBox').innerHTML = `<div class="f-sec lg"><span>${esc(title)}</span><button class="f-ib" aria-label="닫기" data-m="x">${icon('x')}</button></div><div class="modal-b">${body}</div><div class="modal-f">${actions.map((a, i) => `<button class="f-btn${a.pri ? ' pri' : ''}${a.dest ? ' dest' : ''}" data-m="${i}">${esc(a.label)}</button>`).join('')}</div>`;
  $('modal').hidden = false;
  $('modalBox').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const a = actions[+b.dataset.m]; closeModal(); a?.run?.(); });
  $('modalBox').querySelector('.f-btn.pri, .f-btn')?.focus();
}
function closeModal() { $('modal').hidden = true; }
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });

// ── 탭스트립(키트 Desktop app › Tabstrip: 홈 탭 40 · 파일 탭 title 11 + ✗ · 새 탭 26) ──
$('homeTab').innerHTML = icon('layer-component');
$('newTab').innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 .5v9M.5 5h9" stroke="currentColor"/></svg>`;
function renderTabs() {
  $('homeTab').setAttribute('aria-selected', String(active === 'home'));
  $('tabs').innerHTML = tabs.map(t => `<div class="f-tab" role="tab" tabindex="0" data-tab="${t.id}" aria-selected="${active === t.id}" title="${esc(t.name)}"><span class="t">${esc(t.name)}</span><button class="x" data-close="${t.id}" aria-label="${esc(t.name)} 닫기"><svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M1 1l6 6M7 1L1 7" stroke="currentColor" stroke-width="1.5"/></svg></button></div>`).join('');
}
function activate(id) {
  active = id;
  document.querySelectorAll('#views > .view').forEach(v => { v.hidden = v.dataset.view !== id; });
  if (id === 'home') renderHome(homeEl, null);
  renderTabs();
  const t = tabs.find(x => x.id === id); if (t?.stage === 'board') requestAnimationFrame(() => applyZoom(t));
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

// ── 홈(키트 Org page 문법: 왼쪽 내비 · 상단 탭 · 카드) ──
const homeEl = document.createElement('section'); homeEl.className = 'view home'; homeEl.dataset.view = 'home'; $('views').appendChild(homeEl);
function renderHome(el, pickId) {
  const nav = `<nav class="home-nav" aria-label="홈 내비게이션"><div class="me"><span class="f-ava">성</span>김성진</div>
    <button class="nav-it">${icon('s-search') || icon('search')}<span>검색</span></button><button class="nav-it">${icon('recent')}<span>최근</span></button><button class="nav-it">${icon('world')}<span>커뮤니티</span></button>
    <hr class="f-hr inset"><div class="f-sec">도구</div>${TOOLS.map(t => `<button class="nav-it" data-tool="${t.id}" ${t.enabled ? '' : 'aria-disabled="true"'}><i class="sq" style="background:${TOOL_IC[t.id][0]}"></i><span>${esc(t.name)}</span>${t.enabled ? '' : `<span class="meta">준비 중</span>`}</button>`).join('')}
    <hr class="f-hr inset"><div class="f-sec">최근 작업<span class="cnt">${recent.length}</span></div>${recent.slice(0, 4).map((r, i) => `<button class="nav-it" data-recent="${i}">${icon('draft')}<span class="nm" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</span></button>`).join('')}</nav>`;
  const cards = TOOLS.map(t => { const [c, l] = TOOL_IC[t.id]; return `<div class="f-card ct" data-tool="${t.id}"${t.enabled ? '' : ' aria-disabled="true"'} role="button" tabindex="0"><div class="hd"><span class="ic" style="background:${c}">${l}</span><button class="f-btn" ${t.enabled ? '' : 'disabled'}>${t.enabled ? '시작' : '준비 중'}</button></div><div class="ttl">${esc(t.name)}</div><div class="desc">${esc(t.desc)}</div><div class="ft"><span class="f-tag ${t.tone === 'off' ? 'grey' : 'blue'}">${esc(t.status)}</span><span>${esc(t.owner)}</span></div></div>`; }).join('');
  const files = recent.length ? `<div class="files">${recent.map((r, i) => `<button class="f-card file" data-recent="${i}"><span class="th" style="background-image:url('${thumbImg(exById(r.ex))}')"></span><span class="bd"><span class="ttl">${esc(r.name)}${r.sample ? ' (예시)' : ''}</span><span class="sub">${esc(toolById(r.tool).name)} · ${ago(r.at)}</span></span></button>`).join('')}</div>` : '<div class="empty-files">아직 연 작업이 없어요. 위에서 만들 산출물을 골라요.</div>';
  el.innerHTML = `${nav}<div class="home-main"><div class="home-top"><button class="t" aria-selected="true">만들기</button><button class="t">최근 작업</button><button class="t">도구</button><button class="f-btn" data-tool="ad">새 광고 소재</button></div>
    <div class="home-body"><h1>무엇을 만들까요?</h1><p class="lead">만들 산출물을 고르면 새 탭에서 바로 작업 화면이 열려요.</p><div class="cards">${cards}</div>
    ${pickId ? '' : `<div class="sec-h"><h2>최근 작업</h2><span>이 브라우저에서 연 작업 · 서버 저장은 2차</span></div>${files}`}</div></div>`;
  el.querySelectorAll('[data-tool]').forEach(b => { b.onclick = () => pickTool(b.dataset.tool, pickId); b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } }; });
  el.querySelectorAll('[data-recent]').forEach(b => b.onclick = () => { const r = recent[+b.dataset.recent]; openBoard(r.name, r.ex); });
}
const freshTab = (over) => ({ tool: 'ad', stage: 'start', name: '새 광고 소재', ex: null, prompt: '', att: [], fields: Object.fromEntries(FIELDS.map(f => [f[0], ''])), page: '하', sel: null, zoom: null, lt: 'layers', rt: 'design', approved: new Set(), toolMode: 'move', ...over });
function pickTool(toolId, pickId) {
  const t = toolById(toolId);
  if (!t.enabled) { if (t.note) modal(`${t.name}은 준비 중이에요`, `<p>${esc(t.note)}</p>`, [{ label: '확인', pri: true }]); return; }
  if (toolId !== 'ad') { modal('엘리베이터 콘텐츠 목업은 다음 단계예요', '<p>이번 목업은 광고 소재 흐름 위주로 만들었어요. 엘리베이터는 같은 틀로 이어서 그릴게요.</p>', [{ label: '확인', pri: true }]); return; }
  let tab = pickId ? tabs.find(x => x.id === pickId) : null;
  if (tab) Object.assign(tab, freshTab()); else { tab = { id: newId(), ...freshTab() }; tabs.push(tab); }
  mount(tab); activate(tab.id);
}
function openBoard(name, exId = 'gs-illust') {
  const ex = exById(exId);
  const tab = { id: newId(), ...freshTab({ stage: 'board', name, ex: ex.id, fields: { ...ex.fields }, prompt: ex.prompt }) };
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
  if (tab.stage === 'start') { el.className = 'view'; el.innerHTML = toolbarHtml(tab) + `<div class="make-body"></div>`; wireToolbar(tab); renderStart(tab); return; }
  if (tab.stage === 'loading') { el.className = 'view'; el.innerHTML = toolbarHtml(tab) + loadingHtml(); wireToolbar(tab); return; }
  el.className = 'view';
  el.innerHTML = toolbarHtml(tab) + `<div class="editor-body"><aside class="f-sidebar left lp" aria-label="왼쪽 사이드바"></aside><div class="canvas f-canvas" tabindex="-1" aria-label="캔버스"></div><aside class="f-sidebar right rp" aria-label="오른쪽 사이드바"></aside></div>`;
  wireToolbar(tab); renderLeft(tab); renderCanvas(tab); renderRight(tab); wireCanvas(tab);
}

// 툴바(키트 Toolbar › Editor: 메뉴 · 도구 · 가운데 「프로젝트 / 파일 이름」 · 아바타 · Share(파랑) · 재생 · 줌)
function toolbarHtml(tab) {
  const board = tab.stage === 'board';
  const tools = board ? `<button class="f-tool" data-mode="move" aria-pressed="${tab.toolMode === 'move'}" title="선택 (V)" aria-label="선택">${icon('tb-move')}<i class="dd"></i></button><button class="f-tool" title="프레임 (F)" aria-label="프레임" data-na>${icon('tb-frame')}<i class="dd"></i></button><button class="f-tool" title="사각형 (R)" aria-label="사각형" data-na>${icon('tb-rectangle')}<i class="dd"></i></button><button class="f-tool" title="펜 (P)" aria-label="펜" data-na>${icon('tb-pen')}<i class="dd"></i></button><button class="f-tool" title="텍스트 (T)" aria-label="텍스트" data-na>${icon('tb-type')}</button><button class="f-tool" data-mode="hand" aria-pressed="${tab.toolMode === 'hand'}" title="손 (H)" aria-label="손">${icon('tb-pan')}</button><button class="f-tool" data-comment title="코멘트 (C)" aria-label="코멘트">${icon('tb-comment')}</button>` : '';
  const right = board
    ? `<div class="f-avatars"><span class="f-ava" style="background:#7B61FF" title="나">성</span><span class="f-ava" style="background:#1BC47D" title="수민">수</span></div><button class="f-btn pri" data-export>내보내기</button><button class="f-tool" title="미리보기" aria-label="미리보기" data-na>${icon('tb-play')}</button><button class="f-zoom" data-zoom aria-haspopup="menu">${tab.zoom ? Math.round(tab.zoom * 100) + '%' : '맞춤'}<svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 3l3 3 3-3" fill="none" stroke="currentColor"/></svg></button>`
    : `<div class="f-avatars"><span class="f-ava" style="background:#7B61FF" title="나">성</span></div><button class="f-btn pri" disabled>내보내기</button>`;
  return `<div class="f-toolbar" role="toolbar" aria-label="도구"><button class="f-tool" title="메뉴" aria-label="메뉴" data-menu>${icon('tb-menu')}</button>${tools}
    <div class="f-center"><span class="proj">광고 소재</span><span class="sep">/</span><span class="name" contenteditable="true" spellcheck="false" data-rename>${esc(tab.name)}</span>${tab.stage === 'board' ? '' : `<span class="sep">·</span><span class="proj">${tab.stage === 'loading' ? '그리는 중' : '초안'}</span>`}</div>${right}</div>`;
}
function wireToolbar(tab) {
  const el = viewOf(tab);
  const rn = el.querySelector('[data-rename]');
  rn.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); rn.blur(); } };
  rn.onblur = () => { tab.name = rn.textContent.trim() || tab.name; renderTabs(); };
  el.querySelector('[data-menu]').onclick = e => { e.stopPropagation(); menuPop(el.querySelector('[data-menu]'), [['새 광고 소재', '⌘N', () => pickTool('ad', null)], ['홈으로', '', () => activate('home')], null, ['작업 내역…', '', () => $('historyBtn').click()], ['설정…', '', () => $('settingsBtn').click()]]); };
  el.querySelectorAll('[data-na]').forEach(b => b.onclick = () => toast('이 도구는 목업에서 비워 뒀어요'));
  el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { tab.toolMode = b.dataset.mode; el.querySelector('.canvas')?.classList.toggle('pan', tab.toolMode === 'hand'); el.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mode === tab.toolMode))); });
  el.querySelector('[data-comment]')?.addEventListener('click', () => toast('코멘트는 2차(서버 · 로그인) 뒤에 열려요'));
  el.querySelector('[data-export]')?.addEventListener('click', () => exportModal(tab));
  el.querySelector('[data-zoom]')?.addEventListener('click', e => { e.stopPropagation(); menuPop(e.currentTarget, [['화면에 맞춤', '⇧1', () => { tab.zoom = null; applyZoom(tab); }], ['확대', '+', () => { tab.zoom = Math.min(2, (tab.zoom ?? .2) * 1.25); applyZoom(tab); }], ['축소', '−', () => { tab.zoom = Math.max(.05, (tab.zoom ?? .2) / 1.25); applyZoom(tab); }], null, ['50%', '', () => { tab.zoom = .5; applyZoom(tab); }], ['100%', '⇧0', () => { tab.zoom = 1; applyZoom(tab); }]]); });
}

// ── 시작 화면: 자연어 프롬프트 + 첨부 + 예시 카드 ──
function renderStart(tab) {
  const el = viewOf(tab).querySelector('.make-body');
  const cards = EXAMPLES.map(ex => `<button class="f-card ex" data-ex="${ex.id}" aria-pressed="${tab.ex === ex.id}"><span class="th" style="background-image:url('${thumbImg(ex)}')"></span><span class="bd"><span class="ttl">${esc(ex.title)}</span><span class="sub">샘플 · ${esc(ex.by)}</span></span></button>`).join('');
  const att = tab.att.map((a, i) => `<span class="chip"><i style="background-image:url('${a.src}')"></i>${esc(a.name)}<button class="f-ib" data-att-x="${i}" aria-label="${esc(a.name)} 빼기">${icon('x').replace('width="32" height="32"', 'width="16" height="16"')}</button></span>`).join('');
  el.innerHTML = `<h1>무엇을 만들까요?</h1><p class="lead">채용 광고를 말로 적거나 공고 · 브리프 파일을 붙이면 매체 규격 ${ALL.length}종을 한 번에 그려요.</p>
    <div class="prompt"><textarea rows="2" data-prompt placeholder="어떤 채용 광고인지 적어 주세요. 예) GS에너지 2025 상반기 신입 공채, 6월 20일부터 7월 2일까지 접수">${esc(tab.prompt)}</textarea>
      <div class="att" ${tab.att.length ? '' : 'hidden'}>${att}</div>
      <div class="prow"><button class="f-ib" data-attach title="파일 붙이기" aria-label="파일 붙이기">${icon('plus')}</button><input type="file" accept=".txt,.md,.pdf,.docx,.png,.jpg" hidden data-file>
        <button class="f-ib" data-kv title="키비주얼 붙이기" aria-label="키비주얼 붙이기">${icon('tb-image').replace('width="40" height="40"', 'width="32" height="32"')}</button>
        <button class="f-opt" data-scope aria-haspopup="menu">${esc(tab.scope ?? `전체 ${ALL.length}종`)}</button><button class="f-opt" data-style aria-haspopup="menu">${esc(tab.style ?? '지면 자동')}</button>
        <button class="send" data-send aria-disabled="${!(tab.prompt.trim() || tab.att.length)}" aria-label="생성">${icon('s-arrow-up')}</button></div></div>
    <div class="examples"><div class="ex-h"><b>예시로 시작하기</b><a class="f-link" data-more>더 보기</a><div class="nav"><button class="f-ib" data-prev aria-label="이전">${icon('s-arrow-left')}</button><button class="f-ib" data-next aria-label="다음">${icon('s-arrow-right')}</button></div></div><div class="ex-grid" style="--off:${tab.exOff ?? 0}">${cards}</div></div>`;
  const ta = el.querySelector('[data-prompt]'), send = el.querySelector('[data-send]');
  const sync = () => { send.setAttribute('aria-disabled', String(!(tab.prompt.trim() || tab.att.length))); };
  ta.oninput = () => { tab.prompt = ta.value; sync(); ta.style.height = 'auto'; ta.style.height = Math.min(200, ta.scrollHeight) + 'px'; };
  ta.onkeydown = e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send.click(); } };
  const inp = el.querySelector('[data-file]');
  el.querySelector('[data-attach]').onclick = () => inp.click();
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; tab.att.push({ name: f.name, src: /image/.test(f.type) ? URL.createObjectURL(f) : '' }); if (!tab.ex) tab.ex = 'gs-illust'; renderStart(tab); toast(`${f.name} 를 붙였어요 (목업: 내용은 샘플로 읽어요)`); };
  el.querySelector('[data-kv]').onclick = () => { const ex = exById(tab.ex ?? 'gs-illust'); tab.ex = ex.id; if (!tab.att.some(a => a.kv)) tab.att.push({ name: '키비주얼 · ' + ex.by, src: kvImg(ex), kv: true }); renderStart(tab); };
  el.querySelectorAll('[data-att-x]').forEach(b => b.onclick = () => { tab.att.splice(+b.dataset.attX, 1); renderStart(tab); });
  el.querySelector('[data-scope]').onclick = e => { e.stopPropagation(); menuPop(e.currentTarget, [[`전체 ${ALL.length}종`, '', () => { tab.scope = null; renderStart(tab); }], null, ...STAGES.map(s => [`${s.stage} 차수만 · ${s.specs.length}종`, '', () => { tab.scope = `${s.stage} 차수 ${s.specs.length}종`; renderStart(tab); }])]); };
  el.querySelector('[data-style]').onclick = e => { e.stopPropagation(); menuPop(e.currentTarget, [['지면 자동', '', () => { tab.style = null; renderStart(tab); }], ['키비주얼에 맞춤', '', () => { tab.style = '키비주얼에 맞춤'; renderStart(tab); }], ['브랜드 컬러', '', () => { tab.style = '브랜드 컬러'; renderStart(tab); }], ['밝은 지면', '', () => { tab.style = '밝은 지면'; renderStart(tab); }]]); };
  el.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => { const ex = exById(b.dataset.ex); tab.ex = ex.id; tab.prompt = ex.prompt; tab.fields = { ...ex.fields }; tab.att = [{ name: '키비주얼 · ' + ex.by, src: kvImg(ex), kv: true }, { name: '채용 브리프.txt', src: '' }]; renderStart(tab); viewOf(tab).querySelector('[data-prompt]').focus(); });
  el.querySelector('[data-more]').onclick = () => toast('예시는 다섯 개예요 · 더 많은 사례는 2차에');
  el.querySelector('[data-prev]').onclick = () => rotateEx(tab, -1); el.querySelector('[data-next]').onclick = () => rotateEx(tab, 1);
  send.onclick = () => { if (send.getAttribute('aria-disabled') === 'true') { ta.focus(); toast('무엇을 만들지 적거나 예시를 골라요'); return; } generate(tab); };
}
function rotateEx(tab, d) { const g = viewOf(tab).querySelector('.ex-grid'); const list = [...g.children]; d > 0 ? g.appendChild(list[0]) : g.prepend(list[list.length - 1]); }

// ── 불러오는 중(키트 사이드바 뼈대 + Silver 캔버스 + 진행 막대) ──
function loadingHtml() {
  const sk = (n) => `<div class="f-sb-tabs"><span class="f-skel" style="width:48px;height:16px;margin:0 8px"></span><span class="f-skel" style="width:40px;height:16px"></span><span class="grow"></span><span class="f-skel" style="width:48px;height:16px"></span></div><div class="ld-sk">${Array.from({ length: n }, (_, i) => `<span class="f-skel line${i % 3 ? ' w' + (i % 3 + 1) : ''}"></span>`).join('')}</div>`;
  return `<div class="loading editor-body" aria-busy="true"><aside class="f-sidebar left">${sk(12)}</aside><div class="ld-center"><div class="ld-mark"><img src="${LOGO_IMG}" alt="" width="96" style="opacity:.9"><div class="ld-prog"><i data-prog></i></div><span class="ld-note" data-note>규격 ${ALL.length}종을 그리는 중…</span></div></div><aside class="f-sidebar right">${sk(9)}</aside></div>`;
}
function generate(tab) {
  if (!tab.ex) { tab.ex = EXAMPLES[0].id; }
  const ex = exById(tab.ex);
  if (!tab.fields.client) tab.fields = { ...ex.fields };
  tab.stage = 'loading'; mount(tab); renderTabs();
  const el = viewOf(tab), bar = el.querySelector('[data-prog]'), note = el.querySelector('[data-note]');
  const steps = [[.15, '브리프를 읽는 중…'], [.4, '키비주얼 그림 판단(AI) 1회…'], [.7, `규격 ${ALL.length}종을 그리는 중…`], [.9, '가이드 검수 중…'], [1, '거의 다 됐어요']];
  let i = 0; const tick = () => { if (tab.stage !== 'loading') return; const [p, m] = steps[i]; bar.style.width = p * 100 + '%'; note.textContent = m; if (++i < steps.length) setTimeout(tick, 420); else setTimeout(done, 380); };
  const done = () => {
    if (tab.name.startsWith('새 ')) tab.name = `${tab.fields.client} ${tab.fields.hire}`.trim();
    tab.stage = 'board'; tab.lt = 'layers'; tab.sel = null; tab.zoom = null;
    recent = [{ name: tab.name, tool: 'ad', ex: tab.ex, at: Date.now() }, ...recent.filter(r => r.name !== tab.name && !r.sample)].slice(0, 8); saveRecent();
    mount(tab); renderTabs(); requestAnimationFrame(() => applyZoom(tab));
    toast(`${tab.page} 차수 ${ALL.filter(x => x.stage === tab.page).length}개 · 전체 ${ALL.length}개 규격을 그렸어요`);
  };
  setTimeout(tick, 200);
}

// ── 왼쪽 사이드바(키트 Sidebar › Layers: 탭 「레이어 | 입력」 · 오른쪽 페이지 · Pages 섹션 · 레이어 트리) ──
function renderLeft(tab) {
  const el = viewOf(tab).querySelector('.lp');
  const ex = exById(tab.ex);
  const field = ([k, l, kind]) => `<div class="f-label pos" style="height:24px;padding-top:8px">${l}</div>` + (kind === 'area'
    ? `<textarea class="f-val" data-f="${k}" rows="2" aria-label="${l}">${esc(tab.fields[k])}</textarea>`
    : `<input class="f-val" data-f="${k}" value="${esc(tab.fields[k])}" aria-label="${l}">`);
  const rows = []; for (let i = 0; i < FIELDS.length; i++) { const f = FIELDS[i]; if (f[2] === 'half' && FIELDS[i + 1]?.[2] === 'half') { rows.push(`<div class="f-row2"><div>${field(f)}</div><div>${field(FIELDS[i + 1])}</div></div>`); i++; } else rows.push(field(f)); }
  const pages = STAGES.map(s => `<button class="f-page" data-page="${s.stage}" aria-current="${tab.page === s.stage}"><span class="ck">${icon('s-menu-checkmark-on')}</span><span>${s.stage}</span><span class="meta">${s.specs.length}</span></button>`).join('');
  const groups = {}; for (const s of ALL.filter(x => x.stage === tab.page)) (groups[s.media] ??= []).push(s);
  tab.open ??= new Set(Object.keys(groups));
  const layers = Object.entries(groups).map(([m, list]) => `<button class="f-layer top" data-grp="${esc(m)}" aria-expanded="${tab.open.has(m)}"><span class="tw">${icon('s-caret-right')}</span><span class="li">${icon('layer-frame')}</span><span class="nm">${esc(m)}</span><span class="meta">${list.length}</span></button>`
    + (tab.open.has(m) ? list.map(s => `<button class="f-layer d1" data-sel="${s.id}" aria-selected="${tab.sel === s.id}"><span class="li">${icon('layer-image')}</span><span class="nm">${esc(shortName(s))}</span><span class="meta">${s.w}×${s.h}</span></button>`).join('') : '')).join('');
  el.innerHTML = `<div class="f-sb-tabs" role="tablist"><button class="f-sb-tab" role="tab" data-lt="layers" aria-selected="${tab.lt === 'layers'}">레이어</button><button class="f-sb-tab" role="tab" data-lt="input" aria-selected="${tab.lt === 'input'}">입력</button><span class="grow"></span><button class="f-sb-page" data-pagemenu aria-haspopup="menu">${tab.page} 차수 ${icon('ctl-chevron-up')}</button></div>
    <div class="f-sb-body" ${tab.lt === 'layers' ? '' : 'hidden'}>
      <div class="f-sec">페이지<button class="f-ib" title="차수 추가" aria-label="차수 추가" data-na>${icon('plus')}</button></div>${pages}
      <hr class="f-hr"><div class="f-sec" style="margin-top:8px">레이어<span class="cnt">${ALL.filter(x => x.stage === tab.page).length}</span></div>${layers}</div>
    <div class="f-sb-body" ${tab.lt === 'input' ? '' : 'hidden'}>
      <div class="f-sec">브리프<button class="f-ib" data-sample title="예시 값으로 채우기" aria-label="예시 값으로 채우기">${icon('return')}</button></div>
      <div style="padding:0 8px 8px">${rows.join('')}</div>
      <hr class="f-hr"><div class="f-sec">에셋</div>
      <div class="asset"><span class="sw" style="background-image:url('${kvImg(ex)}')"></span><span>키비주얼 · ${esc(ex.by)}</span><button class="f-ib" aria-label="바꾸기" data-na>${icon('s-swap')}</button></div>
      <div class="asset"><span class="sw" style="background:#fff url('${LOGO_IMG}') center/80% no-repeat"></span><span>로고</span><button class="f-ib" aria-label="바꾸기" data-na>${icon('s-swap')}</button></div>
      <hr class="f-hr"><div class="f-sec">프롬프트</div><div style="padding:0 8px 8px"><textarea class="f-val outline" rows="3" data-f-prompt>${esc(tab.prompt)}</textarea></div></div>`;
  el.querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { tab.lt = b.dataset.lt; renderLeft(tab); });
  el.querySelectorAll('[data-f]').forEach(i => i.oninput = () => { tab.fields[i.dataset.f] = i.value; });
  el.querySelector('[data-f-prompt]').oninput = e => { tab.prompt = e.target.value; };
  el.querySelector('[data-sample]').onclick = () => { tab.fields = { ...ex.fields }; renderLeft(tab); toast('예시 값으로 채웠어요'); };
  el.querySelectorAll('[data-page]').forEach(b => b.onclick = () => setPage(tab, b.dataset.page));
  el.querySelector('[data-pagemenu]').onclick = e => { e.stopPropagation(); menuPop(e.currentTarget, STAGES.map(s => [`${s.stage} 차수 · ${s.specs.length}`, tab.page === s.stage ? '✓' : '', () => setPage(tab, s.stage)])); };
  el.querySelectorAll('[data-grp]').forEach(b => b.onclick = () => { const m = b.dataset.grp; tab.open.has(m) ? tab.open.delete(m) : tab.open.add(m); renderLeft(tab); });
  el.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => select(tab, b.dataset.sel, true));
  el.querySelectorAll('[data-na]').forEach(b => b.onclick = () => toast('목업에서는 비워 뒀어요'));
}
function setPage(tab, p) { tab.page = p; tab.sel = null; tab.zoom = null; tab.open = null; renderLeft(tab); renderCanvas(tab); renderRight(tab); }

// ── 캔버스(Silver 지면 · 매체 섹션 · 규격 프레임 · 선택 외곽/핸들) ──
function renderCanvas(tab) {
  const cv = viewOf(tab).querySelector('.canvas');
  const ex = exById(tab.ex);
  const groups = {}; for (const s of ALL.filter(x => x.stage === tab.page)) (groups[s.media] ??= []).push(s);
  cv.innerHTML = `<div class="sizer"><div class="board">${Object.entries(groups).map(([m, list]) => `<div class="msec"><span class="msec-t">${esc(m)}</span><div class="frames">${list.map(s => `<div class="frame${tab.sel === s.id ? ' sel' : ''}${tab.approved.has(s.id) ? ' approved' : ''}" data-frame="${s.id}" style="width:${s.w}px;height:${s.h}px"><span class="fl">${esc(shortName(s))}</span><img src="${esc(frameImg(ex, s))}" alt="${esc(s.media + ' ' + shortName(s))}" loading="lazy" draggable="false"><span class="sz">${s.w} × ${s.h}</span><i class="hd a"></i><i class="hd b"></i><i class="hd c"></i><i class="hd d"></i></div>`).join('')}</div></div>`).join('')}</div></div>`;
  cv.querySelectorAll('[data-frame]').forEach(f => f.onclick = e => { if (tab.toolMode !== 'move') return; e.stopPropagation(); select(tab, f.dataset.frame, false); });
  cv.querySelector('.sizer').onclick = () => { if (tab.sel) { tab.sel = null; refreshSel(tab); } };
  applyZoom(tab);
}
function boardSize(cv) { const b = cv.querySelector('.board'); return b ? [b.scrollWidth, b.scrollHeight] : [0, 0]; }
function applyZoom(tab) {
  const cv = viewOf(tab).querySelector('.canvas'); if (!cv?.querySelector('.board')) return;
  if (tab.zoom == null && !cv.clientWidth) return;   // 아직 안 보이는 탭 — 보일 때(activate) 맞춘다
  if (tab.zoom == null) { const [bw] = boardSize(cv); tab.zoom = Math.max(.05, Math.min(1, (cv.clientWidth - 40) / (bw || 1))); }
  cv.style.setProperty('--z', tab.zoom);
  const [bw, bh] = boardSize(cv); const sz = cv.querySelector('.sizer'); sz.style.width = bw * tab.zoom + 'px'; sz.style.height = bh * tab.zoom + 120 + 'px';
  const zs = viewOf(tab).querySelector('[data-zoom]'); if (zs) zs.firstChild.textContent = Math.round(tab.zoom * 100) + '%';
}
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
  if (scroll) viewOf(tab).querySelector(`[data-frame="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
}
function refreshSel(tab) {
  viewOf(tab).querySelectorAll('[data-frame]').forEach(f => { f.classList.toggle('sel', f.dataset.frame === tab.sel); f.classList.toggle('approved', tab.approved.has(f.dataset.frame)); });
  viewOf(tab).querySelectorAll('.lp [data-sel]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sel === tab.sel)));
  renderRight(tab);
}

// ── 오른쪽 사이드바(키트 Design 패널 문법: 탭 「디자인 | 검수」 · 섹션 32 · 값 칸 · 옵션 메뉴 · 체크 행) ──
function renderRight(tab) {
  const el = viewOf(tab).querySelector('.rp');
  const ex = exById(tab.ex);
  const s = ALL.find(x => x.id === tab.sel);
  const pageList = ALL.filter(x => x.stage === tab.page);
  const okN = pageList.filter(x => tab.approved.has(x.id)).length;
  const opt = (label, items, cur) => `<div class="f-label pos" style="height:24px;padding-top:8px">${label}</div><button class="f-opt" data-opt aria-haspopup="menu" data-items="${esc(items.join('|'))}">${esc(cur ?? items[0])}</button>`;
  const tabsHtml = `<div class="f-sb-tabs" role="tablist"><button class="f-sb-tab" role="tab" data-rt="design" aria-selected="${tab.rt === 'design'}">디자인</button><button class="f-sb-tab" role="tab" data-rt="check" aria-selected="${tab.rt === 'check'}">검수</button><button class="f-sb-tab" role="tab" aria-selected="false" data-na>내보내기</button></div>`;
  let body;
  if (tab.rt === 'check') {
    const items = s ? [['크기', `${s.w}×${s.h}`, true], ['매체 글자 수 규정', '확인 필요'], ['로고', '확인 필요'], ['안전 영역', '확인 필요'], ['글자-그림 겹침', '확인 필요'], ['글자 대비', '확인 필요']] : [['이 페이지 규격', `${pageList.length}개`, true], ['승인', `${okN}/${pageList.length}`, okN === pageList.length]];
    body = `<div class="f-sec">${s ? esc(shortName(s)) : '페이지 ' + tab.page} 검수</div>${items.map(([k, v, ok]) => `<div class="chk-row"><span class="dot${ok ? ' ok' : ''}"></span>${k}<span class="v">${v}</span></div>`).join('')}<p class="note">목업이에요 — 실제 결과는 광고 소재 도구의 가이드 검수가 채워요.</p>`;
  } else if (!s) {
    body = `<div class="f-sec">페이지 · ${tab.page}</div><div class="f-row2" style="padding:0 8px"><div class="f-val-ic"><span class="k">#</span><input class="f-val" value="${pageList.length}개 규격" readonly></div><div class="f-val-ic"><span class="k">✓</span><input class="f-val" value="승인 ${okN}" readonly></div></div><div class="pad" style="padding-top:8px"><button class="f-btn full" data-approve-all>이 페이지 모두 승인</button></div>
      <hr class="f-hr"><div class="f-sec">스타일</div><div class="pad">${opt('지면', ['키비주얼에 맞춤(자동)', '브랜드 컬러', '밝은 지면'], tab.style)}<div class="f-label pos" style="height:24px;padding-top:8px">글자 톤</div><div class="f-strip" data-strip><button aria-pressed="true">자동</button><button aria-pressed="false">다크</button><button aria-pressed="false">라이트</button></div></div>
      <div class="f-sec">브랜드 컬러<button class="f-ib" aria-label="추가" data-na>${icon('plus')}</button></div><div class="swatches"><i style="background:#0B5FA5"></i><i style="background:#79C3EA"></i><i style="background:#D9F0FA"></i></div>
      <hr class="f-hr"><div class="f-sec">키비주얼</div><div class="asset"><span class="sw" style="background-image:url('${kvImg(ex)}')"></span><span>${esc(ex.by)}</span><button class="f-ib" aria-label="바꾸기" data-na>${icon('s-swap')}</button></div><div class="pad"><button class="f-btn full" data-ai>AI 그림 판단 다시</button></div>
      <hr class="f-hr"><div class="f-sec">내보내기<button class="f-ib" aria-label="내보내기 추가" data-export>${icon('plus')}</button></div><div class="f-row3" style="padding:0 8px"><button class="f-opt" data-na>PNG 묶음(ZIP)</button><button class="f-opt" data-na>1x</button><button class="f-ib" aria-label="더 보기" data-na>${icon('more')}</button></div><div class="f-row3" style="padding:0 8px"><button class="f-opt" data-na>피그마 편집용 SVG</button><button class="f-opt" data-na>—</button><button class="f-ib" aria-label="더 보기" data-na>${icon('more')}</button></div><div class="pad" style="padding-top:8px"><button class="f-btn full" data-export>${pageList.length}개 규격 내보내기</button></div>`;
  } else {
    body = `<div class="f-sec">${esc(shortName(s))}</div><div class="f-label" style="height:16px;margin-top:-8px">${esc(s.media)} · 차수 ${s.stage}</div>
      <div class="f-row2" style="padding:0 8px"><div class="f-val-ic"><span class="k">W</span><input class="f-val" value="${s.w}" readonly></div><div class="f-val-ic"><span class="k">H</span><input class="f-val" value="${s.h}" readonly></div></div><p class="note">크기는 매체 규정이라 바꿀 수 없어요.</p>
      <hr class="f-hr"><div class="f-sec">배치</div><div class="pad">${opt('키비주얼 위치', ['자동(AI 판단)', '오른쪽', '왼쪽', '아래', '배경 전체'])}${opt('키비주얼 크기', ['자동', '크게', '보통', '작게'])}<div class="f-label pos" style="height:24px;padding-top:8px">글자 정렬</div><div class="f-strip" data-strip><button aria-pressed="true">자동</button><button aria-pressed="false">왼쪽</button><button aria-pressed="false">가운데</button><button aria-pressed="false">오른쪽</button></div></div>
      <hr class="f-hr"><div class="f-sec">글자</div><div class="pad"><div class="f-label pos" style="height:24px;padding-top:8px">메인 문구</div><input class="f-val" value="${esc(tab.fields.client + ' ' + tab.fields.hire)}"><div class="f-label pos" style="height:24px;padding-top:8px">날짜</div><input class="f-val" value="6.20(금) - 7.2(수) 17시"></div>
      <hr class="f-hr"><div class="f-sec">내보내기<button class="f-ib" aria-label="내보내기 추가" data-export>${icon('plus')}</button></div><div class="f-row3" style="padding:0 8px"><button class="f-opt" data-na>PNG</button><button class="f-opt" data-na>1x</button><button class="f-ib" aria-label="더 보기" data-na>${icon('more')}</button></div>
      <div class="pad" style="padding-top:8px"><button class="f-btn full${tab.approved.has(s.id) ? '' : ' pri'}" data-approve>${tab.approved.has(s.id) ? '승인 취소' : '이 규격 승인'}</button></div>`;
  }
  el.innerHTML = tabsHtml + `<div class="f-sb-body">${body}</div>`;
  el.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { tab.rt = b.dataset.rt; renderRight(tab); });
  el.querySelectorAll('[data-export]').forEach(b => b.onclick = () => exportModal(tab));
  el.querySelector('[data-ai]')?.addEventListener('click', () => toast('AI 그림 판단 — 실제 도구에서 캠페인당 한 번 돌아요(목업)'));
  el.querySelector('[data-approve]')?.addEventListener('click', () => { tab.approved.has(s.id) ? tab.approved.delete(s.id) : tab.approved.add(s.id); refreshSel(tab); });
  el.querySelector('[data-approve-all]')?.addEventListener('click', () => { pageList.forEach(x => tab.approved.add(x.id)); refreshSel(tab); toast(`${tab.page} 차수 ${pageList.length}개를 승인했어요`); });
  el.querySelectorAll('[data-strip]').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)))));
  el.querySelectorAll('[data-opt]').forEach(b => b.onclick = e => { e.stopPropagation(); menuPop(b, b.dataset.items.split('|').map(it => [it, b.textContent === it ? '✓' : '', () => { b.textContent = it; if (b.previousElementSibling?.textContent === '지면') tab.style = it; }])); });
  el.querySelectorAll('[data-na]').forEach(b => b.onclick = () => toast('목업에서는 비워 뒀어요'));
}
function exportModal(tab) {
  const n = tab.approved.size;
  const radio = (name, lbl, sub, on) => `<label class="f-chk" style="height:auto;align-items:flex-start;padding:4px 8px"><span class="f-radio" aria-checked="${on}"><i></i></span><span class="lb" style="padding-top:8px"><b>${lbl}</b><br><span style="color:var(--f-black3)">${sub}</span></span><input type="radio" name="${name}" ${on ? 'checked' : ''} hidden></label>`;
  modal('내보내기', radio('fmt', 'PNG 묶음(ZIP)', '매체별 폴더 · 매체가 정한 이름 규칙', true) + radio('fmt', '피그마 편집용 SVG', '글자는 고칠 수 있는 텍스트로', false) + `<hr class="f-hr inset">` + radio('scope', '승인한 규격만', `${n}개`, !!n) + radio('scope', '전체(검토용)', `${ALL.length}개 · 승인 안 한 건 「미승인_검토용」 폴더로`, !n),
    [{ label: '취소' }, { label: '내보내기', pri: true, run: () => { recent = [{ name: tab.name, tool: 'ad', ex: tab.ex, at: Date.now() }, ...recent.filter(r => r.name !== tab.name)].slice(0, 8); saveRecent(); toast('목업이라 파일은 만들지 않아요 · 작업 내역에 남겼어요'); } }]);
  $('modalBox').querySelectorAll('label.f-chk').forEach(l => l.onclick = () => { const name = l.querySelector('input').name; $('modalBox').querySelectorAll(`input[name="${name}"]`).forEach(i => i.closest('label').querySelector('.f-radio').setAttribute('aria-checked', 'false')); l.querySelector('.f-radio').setAttribute('aria-checked', 'true'); });
}

// ── HUD 메뉴(키트 Menu base: #222 · 항목 24 · 단축키 오른쪽) — 팝오버 공용 ──
function menuPop(anchor, items) {
  const p = $('pop'); const r = anchor.getBoundingClientRect();
  p.innerHTML = items.map((it, i) => it === null ? '<div class="f-msep"></div>' : `<button class="f-mi" role="menuitem" data-i="${i}">${it[1] === '✓' ? `<span class="ck">${icon('s-menu-checkmark-on').replace('fill="currentColor"', 'fill="#fff"')}</span>` : ''}${esc(it[0])}${it[1] && it[1] !== '✓' ? `<span class="sc">${esc(it[1])}</span>` : ''}</button>`).join('');
  p.style.top = r.bottom + 4 + 'px'; p.style.left = Math.min(r.left, innerWidth - 240) + 'px'; p.style.right = 'auto';
  p.hidden = false; p.dataset.for = '';
  p.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { p.hidden = true; items[+b.dataset.i][2]?.(); });
  p.querySelector('.f-mi')?.focus();
}
function pop(btn, fill) {
  const p = $('pop'); const open = p.hidden || p.dataset.for !== btn.id;
  p.hidden = true; document.querySelectorAll('.tabbtn').forEach(b => b.setAttribute('aria-expanded', 'false'));
  if (!open) return; p.dataset.for = btn.id; p.style.top = '40px'; p.style.left = 'auto'; p.style.right = '8px'; fill(p); p.hidden = false; btn.setAttribute('aria-expanded', 'true');
}
$('historyBtn').onclick = e => { e.stopPropagation(); pop($('historyBtn'), p => { p.innerHTML = '<div class="f-mhead">작업 내역 · 이 브라우저</div>' + (recent.length ? recent.map((r, i) => `<button class="f-mi" data-h="${i}">${esc(r.name)}${r.sample ? ' (예시)' : ''}<span class="sc">${esc(ago(r.at))}</span></button>`).join('') : '<div class="f-mhead">아직 연 작업이 없어요.</div>'); p.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { p.hidden = true; const r = recent[+b.dataset.h]; const open = tabs.find(t => t.name === r.name && t.stage === 'board'); open ? activate(open.id) : openBoard(r.name, r.ex); }); }); };
$('settingsBtn').onclick = e => { e.stopPropagation(); pop($('settingsBtn'), p => { p.innerHTML = '<div class="f-mhead">설정</div><button class="f-mi" disabled>AI 키 · 글꼴 — 각 도구 안에서</button><button class="f-mi" disabled>로그인 · 팀 — 2차(서버)</button><div class="f-msep"></div><button class="f-mi" data-clear>목업 기록 지우기</button>'; p.querySelector('[data-clear]').onclick = () => { recent = []; saveRecent(); tabs = []; document.querySelectorAll('#views > .view:not([data-view="home"])').forEach(v => v.remove()); p.hidden = true; activate('home'); }; }); };
document.addEventListener('click', e => { if (!e.target.closest('.pop')) { $('pop').hidden = true; document.querySelectorAll('.tabbtn').forEach(b => b.setAttribute('aria-expanded', 'false')); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); $('pop').hidden = true; }
  const t = tabs.find(x => x.id === active); if (!t || t.stage !== 'board' || /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
  if (e.key === 'v' || e.key === 'h') viewOf(t).querySelector(`[data-mode="${e.key === 'v' ? 'move' : 'hand'}"]`)?.click();
});
window.addEventListener('resize', () => { const t = tabs.find(x => x.id === active); if (t?.stage === 'board') applyZoom(t); });

activate('home');
// 바로 보기: #start = 새 광고 소재 시작 화면, #board = 생성된 보드(공유 · 리뷰용), #board=midas-3d 처럼 예시 고르기
const h = location.hash;
if (h === '#start' || h === '#empty') pickTool('ad', null);
else if (h === '#loading') { pickTool('ad', null); const t = tabs[tabs.length - 1]; t.ex = 'gs-illust'; t.prompt = EXAMPLES[0].prompt; generate(t); }
else if (h.startsWith('#board')) { const ex = exById(h.split('=')[1] ?? 'gs-illust'); openBoard(ex.title, ex.id); }
