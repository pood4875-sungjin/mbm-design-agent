// AI 디자인 스튜디오 — 통합 홈 · 작업 탭
//   홈(산출물 카드) → 카드 고르면 새 탭(입력) → 파일을 넣거나 바로 시작하면 같은 탭이 도구 화면(iframe)
//   탭 · 최근 작업은 이 브라우저(localStorage)에만 남는다 — 1차(링크 연결) 범위. 서버 · 로그인은 2차 이후.
import { TOOLS, toolById } from './tools.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY_TABS = 'aiStudio.tabs', KEY_RECENT = 'aiStudio.recent';
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 사생활 보호 창 등 — 저장 없이 동작 */ } };

const ICON = {
  elevator: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M8 9l1.5-2L11 9M13 15l1.5 2 1.5-2"/></svg>',
  ad: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/></svg>',
  pick: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8" stroke-linecap="round"/></svg>',
};
const X_ICON = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

let tabs = read(KEY_TABS, []).filter(t => t && t.id && (t.stage === 'pick' || toolById(t.tool)));
let recent = read(KEY_RECENT, []).filter(r => toolById(r.tool));
let active = 'home';
const files = new Map();   // 탭 id → 입력에서 받은 파일(새로고침하면 사라진다 — 파일은 저장하지 않는다)
const save = () => write(KEY_TABS, tabs.map(({ id, tool, stage, name }) => ({ id, tool, stage, name })));
const newId = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ── 탭 막대 ──
function renderTabs() {
  $('homeTab').setAttribute('aria-selected', String(active === 'home'));
  $('tabList').innerHTML = tabs.map(t => {
    const on = active === t.id;
    return `<div class="tab" role="tab" tabindex="0" id="tab-${t.id}" data-tab="${t.id}" aria-selected="${on}" aria-controls="view-${t.id}" title="${esc(t.name)}">
      ${ICON[t.stage === 'pick' ? 'pick' : t.tool] ?? ICON.pick}<span class="nm">${esc(t.name)}</span>
      <button class="x" data-close="${t.id}" aria-label="${esc(t.name)} 탭 닫기" title="닫기">${X_ICON}</button></div>`;
  }).join('');
}
function activate(id) {
  active = id;
  document.querySelectorAll('#views > .view').forEach(v => { v.hidden = v.dataset.view !== id; });
  if (id === 'home') renderHome($('homeView'), null);
  renderTabs();
  const el = id === 'home' ? $('homeTab') : document.getElementById('tab-' + id);
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// ── 홈 · 새 탭 고르기(같은 카드) ──
function cardsHtml() {
  return TOOLS.map(t => `<button class="card" data-tool="${t.id}"${t.enabled ? '' : ' aria-disabled="true"'}>
    <span class="th" aria-hidden="true"></span><span class="nm">${esc(t.name)}</span><span class="ds">${esc(t.desc)}</span>
    <span class="pill ${t.tone}">${esc(t.status)}</span><span class="go">${esc(t.cta)}</span></button>`).join('');
}
function recentHtml() {
  const items = recent.slice(0, 4).map((r, i) => { const t = toolById(r.tool);
    return `<button class="rc" data-recent="${i}"><b>${esc(r.name)}</b><small>${esc(t.name)} · ${new Date(r.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</small></button>`; });
  while (items.length < 4) items.push(`<div class="rc">${items.length === 0 && !recent.length ? '최근 작업이 없어요' : ''}</div>`);
  return items.join('');
}
function renderHome(el, tabId) {
  el.innerHTML = `<div class="home"><h1>무엇을 만들까요?</h1><p class="lead">만들 산출물을 고르면 해당 제너레이터로 이동해요.</p>
    <div class="cards">${cardsHtml()}</div>
    ${tabId ? '' : `<div class="recent-h"><h2>최근 작업</h2><span>이 브라우저에서 연 작업</span></div><div class="recent">${recentHtml()}</div>`}</div>`;
  el.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => pickTool(b.dataset.tool, tabId));
  el.querySelectorAll('[data-recent]').forEach(b => b.onclick = () => { const r = recent[+b.dataset.recent]; openWork(r.tool, r.name); });
}
function pickTool(toolId, tabId) {
  const t = toolById(toolId);
  if (!t.enabled) { if (t.note) showModal(`${t.name}은 준비 중이에요`, t.note); return; }
  let tab = tabId ? tabs.find(x => x.id === tabId) : null;
  if (tab) Object.assign(tab, { tool: toolId, stage: 'input', name: `새 ${t.name}` });
  else { tab = { id: newId(), tool: toolId, stage: 'input', name: `새 ${t.name}` }; tabs.push(tab); }
  save(); mountView(tab); activate(tab.id);
}

// ── 탭 화면 ──
function viewOf(tab) {
  let el = document.querySelector(`#views > [data-view="${tab.id}"]`);
  if (!el) { el = document.createElement('section'); el.className = 'view'; el.dataset.view = tab.id; el.id = 'view-' + tab.id; el.setAttribute('role', 'tabpanel'); el.setAttribute('aria-labelledby', 'tab-' + tab.id); el.hidden = true; $('views').appendChild(el); }
  return el;
}
function mountView(tab) {
  const el = viewOf(tab);
  if (tab.stage === 'pick') { el.className = 'view view-pick'; renderHome(el, tab.id); return; }
  const t = toolById(tab.tool);
  if (tab.stage === 'input') {
    el.className = 'view view-input';
    el.innerHTML = `<h1>${esc(t.inputTitle)}</h1>
      <button class="drop" id="drop-${tab.id}"><span>${esc(t.drop)}</span></button>
      <input type="file" id="file-${tab.id}" accept="${esc(t.accept)}" hidden>
      <button class="skip" id="skip-${tab.id}">파일 없이 바로 시작</button>`;
    const drop = el.querySelector('.drop'), inp = el.querySelector('input[type=file]');
    drop.onclick = () => inp.click();
    inp.onchange = () => inp.files[0] && startWork(tab, inp.files[0]);
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) startWork(tab, f); };
    el.querySelector('.skip').onclick = () => startWork(tab, null);
    return;
  }
  el.className = 'view view-work';
  el.innerHTML = `<iframe title="${esc(t.name)} — ${esc(tab.name)}" src="${esc(new URL(t.url, location.href).href)}" allow="clipboard-read; clipboard-write" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  const fr = el.querySelector('iframe');
  fr.addEventListener('load', () => handOff(fr, tab), { once: true });
}
function startWork(tab, file) {
  const t = toolById(tab.tool);
  tab.stage = 'work';
  if (file) { tab.name = file.name.replace(/\.[^.]+$/, '') || tab.name; files.set(tab.id, file); }
  remember(tab.tool, tab.name);
  save(); mountView(tab); renderTabs();
  if (active === tab.id) viewOf(tab).hidden = false;
  void t;
}
function openWork(toolId, name) {
  const tab = { id: newId(), tool: toolId, stage: 'work', name };
  tabs.push(tab); remember(toolId, name); save(); mountView(tab); activate(tab.id);
}
function remember(tool, name) {
  recent = [{ tool, name, at: Date.now() }, ...recent.filter(r => !(r.tool === tool && r.name === name))].slice(0, 12);
  write(KEY_RECENT, recent);
}
// 입력에서 받은 파일을 도구로 넘긴다 — 같은 출처(광고 소재 = 이 저장소 app/)는 도구의 파일 입력에 직접, 다른 출처는 postMessage(도구가 받아 주면 동작)
function handOff(fr, tab) {
  const file = files.get(tab.id); if (!file) return;
  files.delete(tab.id);
  let doc = null; try { doc = fr.contentDocument; } catch { doc = null; }
  if (doc) {
    let n = 0;
    const tryPut = () => { const inp = doc.getElementById('fileIn');
      if (inp) { const dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); return; }
      if (++n < 50) setTimeout(tryPut, 100); };
    tryPut();
  } else {
    const t = toolById(tab.tool);
    try { fr.contentWindow.postMessage({ type: 'ai-studio:files', files: [file], name: tab.name }, new URL(t.url).origin); } catch { /* 도구가 아직 받지 않음 */ }
  }
}
function closeTab(id) {
  const tab = tabs.find(t => t.id === id); if (!tab) return;
  const doClose = () => {
    const i = tabs.indexOf(tab); tabs.splice(i, 1); files.delete(id);
    document.querySelector(`#views > [data-view="${id}"]`)?.remove(); save();
    if (active === id) activate(tabs[i]?.id ?? tabs[i - 1]?.id ?? 'home'); else renderTabs();
  };
  if (tab.stage === 'work') showModal('이 탭을 닫을까요?', '도구에서 저장하지 않은 작업은 사라질 수 있어요.', { ok: '닫기', cancel: '취소', onOk: doClose });
  else doClose();
}

// ── 팝오버 · 모달 ──
function togglePop(btn, pop, fill) {
  const open = pop.hidden; closePops();
  if (!open) return;
  fill(pop); pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
}
function closePops() { for (const [b, p] of [['historyBtn', 'historyPop'], ['settingsBtn', 'settingsPop']]) { $(p).hidden = true; $(b).setAttribute('aria-expanded', 'false'); } }
function fillHistory(pop) {
  pop.innerHTML = `<h3>작업 내역 · 이 브라우저</h3>` + (recent.length
    ? recent.map((r, i) => `<button class="it" data-h="${i}"><b>${esc(r.name)}</b><small>${esc(toolById(r.tool).name)} · ${new Date(r.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></button>`).join('')
    : '<p>아직 연 작업이 없어요. 홈에서 산출물을 골라 시작해요.</p>');
  pop.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { closePops(); const r = recent[+b.dataset.h]; openWork(r.tool, r.name); });
}
function fillSettings(pop) {
  pop.innerHTML = `<h3>설정</h3><p>AI 키 같은 도구 설정은 각 도구 화면 안에서 해요. 로그인 · 공용 작업 내역은 서버를 합친 뒤(2차) 열려요.</p>
    <button class="it" id="closeAll"><b>열린 탭 모두 닫기</b><small>${tabs.length}개</small></button>`;
  pop.querySelector('#closeAll').onclick = () => { closePops(); showModal('열린 탭을 모두 닫을까요?', '도구에서 저장하지 않은 작업은 사라질 수 있어요.', { ok: '모두 닫기', cancel: '취소', onOk: () => { tabs = []; files.clear(); document.querySelectorAll('#views > .view:not(#homeView)').forEach(v => v.remove()); save(); activate('home'); } }); };
}
let modalOk = null;
function showModal(title, body, { ok = '확인', cancel = null, onOk = null } = {}) {
  $('modalTitle').textContent = title; $('modalBody').textContent = body;
  const act = document.querySelector('.modal-act');
  act.innerHTML = `${cancel ? `<button class="btn" id="modalCancel">${esc(cancel)}</button> ` : ''}<button class="btn pri" id="modalOk">${esc(ok)}</button>`;
  modalOk = onOk; $('modal').hidden = false; $('modalOk').focus();
  $('modalOk').onclick = () => { const f = modalOk; hideModal(); f?.(); };
  if (cancel) $('modalCancel').onclick = hideModal;
}
function hideModal() { $('modal').hidden = true; modalOk = null; }

// ── 이벤트 ──
$('homeTab').onclick = () => activate('home');
$('newTab').onclick = () => { const tab = { id: newId(), tool: null, stage: 'pick', name: '새 탭' }; tabs.push(tab); save(); mountView(tab); activate(tab.id); };
$('tabList').addEventListener('click', e => {
  const x = e.target.closest('[data-close]'); if (x) { e.stopPropagation(); closeTab(x.dataset.close); return; }
  const t = e.target.closest('[data-tab]'); if (t) activate(t.dataset.tab);
});
$('tabList').addEventListener('keydown', e => {
  const t = e.target.closest('[data-tab]'); if (!t) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(t.dataset.tab); }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); closeTab(t.dataset.tab); }
});
$('historyBtn').onclick = e => { e.stopPropagation(); togglePop($('historyBtn'), $('historyPop'), fillHistory); };
$('settingsBtn').onclick = e => { e.stopPropagation(); togglePop($('settingsBtn'), $('settingsPop'), fillSettings); };
document.addEventListener('click', e => { if (!e.target.closest('.pop')) closePops(); });
$('modal').addEventListener('click', e => { if (e.target === $('modal')) hideModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePops(); hideModal(); } });

// ── 시작 ──
$('homeView').dataset.view = 'home';
tabs.forEach(mountView);
activate('home');
