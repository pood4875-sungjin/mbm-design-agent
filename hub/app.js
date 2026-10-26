// AI 디자인 스튜디오 — 홈(검색 · AI 바 · 최근) · 탭 · 시작(자연어 + 예시) · 불러오는 중 · 에디터(실제 편집)
import { TOOLS, toolById } from './tools.js';
import { EXAMPLES, exById, kvImg, thumbImg, refImg, newDoc, loadIndex, loadDoc, saveDoc, deleteDoc, renameDocIndex, pageOf, findNode, parentOf, removeNode, cloneNode, node, imageFill, solid, uid, walk, layoutBoard, buildFrame, SPECS, clone, frameOf } from './doc.js';
import { Editor, wireGlobal } from './canvas.js';
import { renderRight, renderLeft, fileToDataUrl, checkFrame } from './panel.js';
import { exportZip, framePng, download, renderFrame, thumbnail, safe } from './export.js';
import { ic } from './fui/icons3.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TOOL_IC = { elevator: ['#14AE5C', 'file-elev'], ad: ['#0D99FF', 'file-ad'], mbm: ['#9747FF', 'file-mbm'], offline: ['#F24822', 'file-off'] };
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '방금 수정' : m < 60 ? `${m}분 전 수정` : m < 1440 ? `${Math.round(m / 60)}시간 전 수정` : `${Math.round(m / 1440)}일 전 수정`; };
let tabs = [], active = 'home';

// ── 공통 ──
let toastT; function toast(msg, act) { const t = $('toast'); t.innerHTML = esc(msg) + (act ? `<button data-act>${esc(act.label)}</button>` : ''); t.hidden = false; if (act) t.querySelector('[data-act]').onclick = () => { t.hidden = true; act.run(); }; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, act ? 6000 : 2600); }
function modal(title, body, actions) {
  $('modalBox').innerHTML = `<div class="mh"><span>${esc(title)}</span><span class="grow"></span><button class="ib t2" data-m="x">${ic('x')}</button></div><div class="mb">${body}</div><div class="mf">${actions.map((a, i) => `<button class="btn${a.pri ? ' pri' : ''}" data-m="${i}">${esc(a.label)}</button>`).join('')}</div>`;
  $('modal').hidden = false; $('modalBox').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const a = actions[+b.dataset.m]; closeModal(); a?.run?.(); }); $('modalBox').querySelector('.btn.pri, .btn')?.focus();
}
function closeModal() { $('modal').hidden = true; }
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
function menu(anchor, items) {
  const p = $('pop'); const r = anchor.getBoundingClientRect();
  p.innerHTML = items.map((it, i) => it === null ? '<div class="msep"></div>' : `<button class="mi" role="menuitem" data-i="${i}" ${it[2] ? '' : 'disabled'}>${it[1] === '✓' ? `<span class="ck">${ic('check')}</span>` : ''}${esc(it[0])}${it[1] && it[1] !== '✓' ? `<span class="sc">${esc(it[1])}</span>` : ''}</button>`).join('');
  p.hidden = false; const w = p.offsetWidth, h = p.offsetHeight; p.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px'; p.style.top = (r.bottom + 4 + h > innerHeight ? r.top - h - 4 : r.bottom + 4) + 'px';
  p.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { p.hidden = true; items[+b.dataset.i][2]?.(); }); p.querySelector('.mi:not(:disabled)')?.focus();
}
document.addEventListener('pointerdown', e => { if (!e.target.closest('#pop')) $('pop').hidden = true; if (!e.target.closest('#spop, .hsearch')) $('spop').hidden = true; });

// ── 탭스트립 ──
$('homeTab').innerHTML = ic('home'); $('newTab').innerHTML = ic('plus');
function renderTabs() {
  $('homeTab').setAttribute('aria-selected', String(active === 'home'));
  $('tabs').innerHTML = tabs.map(t => `<div class="tab" role="tab" tabindex="0" data-tab="${t.id}" aria-selected="${active === t.id}" title="${esc(t.name)}"><span class="ic">${ic(t.stage === 'pick' ? 'plus' : TOOL_IC[t.tool ?? 'ad'][1])}</span><span class="t">${esc(t.name)}</span><button class="x" data-close="${t.id}" aria-label="${esc(t.name)} 닫기">${ic('x')}</button></div>`).join('');
}
function activate(id) { active = id; document.querySelectorAll('#views > .view').forEach(v => { v.hidden = v.dataset.view !== id; }); if (id === 'home') renderHome(); renderTabs(); const t = tabs.find(x => x.id === id); if (t?.ed) requestAnimationFrame(() => { t.ed.applyZoom(); if (t.ed.zoom == null) t.ed.fit(); }); }
$('homeTab').onclick = () => activate('home');
$('newTab').onclick = () => { const t = { id: 't' + uid(), stage: 'pick', name: '새 탭' }; tabs.push(t); mount(t); activate(t.id); };
$('tabs').addEventListener('click', e => { const x = e.target.closest('[data-close]'); if (x) { e.stopPropagation(); closeTab(x.dataset.close); return; } const t = e.target.closest('[data-tab]'); if (t) activate(t.dataset.tab); });
$('tabs').addEventListener('keydown', e => { const t = e.target.closest('[data-tab]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); activate(t.dataset.tab); } });
function closeTab(id) { const t = tabs.find(x => x.id === id); if (!t) return; if (t.doc) saveNow(t); const i = tabs.indexOf(t); tabs.splice(i, 1); document.querySelector(`#views > [data-view="${id}"]`)?.remove(); if (active === id) activate(tabs[i]?.id ?? tabs[i - 1]?.id ?? 'home'); else renderTabs(); }
$('historyBtn').onclick = e => { e.stopPropagation(); const idx = loadIndex(); menu($('historyBtn'), [['작업 내역 · 이 브라우저', '', null], null, ...(idx.length ? idx.slice(0, 12).map(r => [r.name, ago(r.updatedAt), () => openDoc(r.id)]) : [['아직 없음', '', null]])]); };
$('settingsBtn').onclick = e => { e.stopPropagation(); menu($('settingsBtn'), [['AI 키 · 글꼴 — 각 도구 안에서', '', null], ['로그인 · 팀 — 2차(서버)', '', null], null, ['저장된 작업 전부 지우기', '', () => modal('저장된 작업을 지울까요?', '<p>이 브라우저에 저장한 작업 ' + loadIndex().length + '개가 사라져요.</p>', [{ label: '취소' }, { label: '지우기', pri: true, run: () => { for (const r of loadIndex()) deleteDoc(r.id); tabs = []; document.querySelectorAll('#views > .view:not([data-view="home"])').forEach(v => v.remove()); activate('home'); } }])]]); };

// ── 홈 ──
const homeEl = document.createElement('section'); homeEl.className = 'view home'; homeEl.dataset.view = 'home'; $('views').appendChild(homeEl);
let homeTab = 'recent';
function renderHome() {
  const idx = loadIndex();
  const nav = `<nav class="hnav"><div class="org"><span class="mark">M</span>MIDAS ${ic('chev-d')}<button class="ib t2" title="알림">${ic('bell')}</button></div>
    <div class="hsearch">${ic('search')}<input class="in" id="hsearch" placeholder="검색" autocomplete="off"></div>
    <button class="hitem" data-ht="recent" aria-current="${homeTab === 'recent'}">${ic('clock')}최근</button><button class="hitem" data-ht="mine" aria-current="${homeTab === 'mine'}">${ic('draft')}내 작업<span class="meta">${idx.length}</span></button><button class="hitem" data-ht="team" aria-current="${homeTab === 'team'}">${ic('team')}팀 작업<span class="meta">2차</span></button><button class="hitem" data-ht="trash" aria-current="${homeTab === 'trash'}">${ic('trash')}휴지통</button>
    <div class="hsec">도구</div>${TOOLS.map(t => `<button class="hitem" data-tool="${t.id}" ${t.enabled ? '' : 'aria-disabled="true"'}><span style="color:${TOOL_IC[t.id][0]}">${ic(TOOL_IC[t.id][1])}</span>${esc(t.name)}${t.enabled ? '' : '<span class="meta">준비 중</span>'}</button>`).join('')}
    <div class="hsec">즐겨찾기</div><div class="hnote">파일이나 폴더에 ☆ 를 누르면 여기에 모여요.</div></nav>`;
  const cards = (list, empty) => list.length ? `<div class="hgrid">${list.map(r => `<div class="card" data-open="${r.id}" role="button" tabindex="0"><span class="th ${r.thumb ? '' : 'contain'}" style="background-image:url('${r.thumb ? r.thumb : thumbImg(exById(r.ex))}')"></span><div class="bd"><span class="ic" style="background:${TOOL_IC[r.tool ?? 'ad'][0]}">${ic(TOOL_IC[r.tool ?? 'ad'][1])}</span><span class="grow"><span class="ttl">${esc(r.name)}</span><span class="sub">초안 · ${ago(r.updatedAt)} · ${r.frames ?? ''}규격</span></span><span class="ava" style="background:#9747FF">성</span></div><button class="ib s more t2" data-more="${r.id}">${ic('more')}</button></div>`).join('')}</div>` : `<div class="hempty">${empty}</div>`;
  const exCards = `<div class="hgrid">${EXAMPLES.map(e => `<div class="card" data-ex="${e.id}" role="button" tabindex="0"><span class="th" style="background-image:url('${thumbImg(e)}')"></span><div class="bd"><span class="ic" style="background:${TOOL_IC.ad[0]}">${ic('file-ad')}</span><span class="grow"><span class="ttl">${esc(e.title)}</span><span class="sub">예시 · ${esc(e.by)} · 51규격</span></span></div></div>`).join('')}</div>`;
  const body = homeTab === 'trash' ? '<div class="hempty">휴지통은 비어 있어요.</div>' : homeTab === 'team' ? '<div class="hempty">팀 작업 · 공유는 2차(서버)에서 열려요.</div>' : (homeTab === 'mine' ? cards(idx, '아직 저장한 작업이 없어요. 위에서 만들어 보세요.') : cards(idx.slice(0, 8), '아직 연 작업이 없어요.') + `<div class="htabs" style="margin-top:32px"><button class="htab" aria-selected="true">예시로 시작</button></div>${exCards}`);
  homeEl.innerHTML = `${nav}<div class="hmain"><div class="hhead"><button class="ib t2">${ic('s-arrow-left')}</button><button class="ib t2">${ic('s-arrow-right')}</button><span class="ttl">${{ recent: '최근', mine: '내 작업', team: '팀 작업', trash: '휴지통' }[homeTab]}</span><span class="grow"></span>${TOOLS.map(t => `<button class="btn ghost" data-tool="${t.id}" ${t.enabled ? '' : 'disabled'}><span style="color:${TOOL_IC[t.id][0]}">${ic(TOOL_IC[t.id][1])}</span>${esc(t.name)}</button>`).join('')}<button class="btn ghost" data-more-tools>더 보기 ${ic('chev-d')}</button></div>
    <div class="hbody"><div class="aibar"><div class="h">아이디어를 적으면 바로 만들어 드려요 <span class="tag blue">AI</span><button class="ib s t2" data-ai-close>${ic('x')}</button></div><div class="box">${ic('ai')}<input id="aiPrompt" placeholder="예) GS에너지 2025 상반기 신입 공채, 6월 20일부터 7월 2일까지 접수. 밝은 일러스트 느낌으로" autocomplete="off"><button class="btn dark" data-ai-go>이걸로 만들기 ${ic('s-arrow-up')}</button></div></div>
    <div class="htabs"><button class="htab" data-ht="recent" aria-selected="${homeTab === 'recent'}">최근 본 항목</button><button class="htab" data-ht="mine" aria-selected="${homeTab === 'mine'}">내 작업</button><span class="grow"></span><span class="t2">${idx.length}개 저장됨</span></div>${body}</div></div>`;
  homeEl.querySelectorAll('[data-ht]').forEach(b => b.onclick = () => { homeTab = b.dataset.ht; renderHome(); });
  homeEl.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => pickTool(b.dataset.tool, null));
  homeEl.querySelector('[data-more-tools]').onclick = e => { e.stopPropagation(); menu(e.currentTarget, TOOLS.map(t => [t.name + (t.enabled ? '' : ' · 준비 중'), '', t.enabled ? () => pickTool(t.id, null) : null])); };
  homeEl.querySelectorAll('[data-open]').forEach(c => { c.onclick = e => { if (e.target.closest('[data-more]')) return; openDoc(c.dataset.open); }; c.onkeydown = e => { if (e.key === 'Enter') openDoc(c.dataset.open); }; });
  homeEl.querySelectorAll('[data-more]').forEach(b => b.onclick = e => { e.stopPropagation(); const id = b.dataset.more; menu(b, [['열기', '', () => openDoc(id)], ['복제', '', () => { const d = loadDoc(id); if (!d) return; d.id = 'd' + uid(); d.name += ' 사본'; saveDoc(d); renderHome(); }], null, ['삭제', '', () => { deleteDoc(id); renderHome(); toast('지웠어요'); }]]); });
  homeEl.querySelectorAll('[data-ex]').forEach(c => { c.onclick = () => startFromExample(c.dataset.ex); c.onkeydown = e => { if (e.key === 'Enter') startFromExample(c.dataset.ex); }; });
  homeEl.querySelector('[data-ai-close]').onclick = () => homeEl.querySelector('.aibar').remove();
  const ai = homeEl.querySelector('#aiPrompt'); const go = () => { const v = ai.value.trim(); if (!v) { ai.focus(); return; } const exId = /마이다스|midas/i.test(v) ? (/3d|캐릭터/i.test(v) ? 'midas-3d' : /아이소|iso/i.test(v) ? 'midas-iso' : 'midas-team') : /사진|신호등/.test(v) ? 'gs-photo' : 'gs-illust'; createAndOpen({ exId, prompt: v }); };
  homeEl.querySelector('[data-ai-go]').onclick = go; ai.onkeydown = e => { if (e.key === 'Enter') go(); };
  wireSearch(homeEl.querySelector('#hsearch'));
}
// 검색: 저장한 작업 · 예시 · 도구 · 규격 이름
function wireSearch(inp) {
  const pop = $('spop'); let sel = 0, results = [];
  const run = () => {
    const q = inp.value.trim().toLowerCase(); const r = inp.getBoundingClientRect(); pop.style.left = r.left + 'px'; pop.style.top = r.bottom + 6 + 'px';
    results = [];
    for (const d of loadIndex()) if (!q || d.name.toLowerCase().includes(q)) results.push({ k: '작업', b: d.name, s: `광고 소재 · ${ago(d.updatedAt)}`, run: () => openDoc(d.id), col: '#0D99FF', ic: 'file-ad' });
    for (const e of EXAMPLES) if (!q || (e.title + e.by).toLowerCase().includes(q)) results.push({ k: '예시', b: `${e.title} · ${e.by}`, s: '예시로 시작', run: () => startFromExample(e.id), col: '#9747FF', ic: 'sparkle' });
    for (const t of TOOLS) if (!q || t.name.toLowerCase().includes(q)) results.push({ k: '도구', b: t.name, s: t.desc, run: () => pickTool(t.id, null), col: TOOL_IC[t.id][0], ic: TOOL_IC[t.id][1] });
    if (q) for (const s of SPECS) if ((s.media + ' ' + s.name).toLowerCase().includes(q)) results.push({ k: '규격', b: `${s.media} · ${s.name}`, s: `${s.w}×${s.h} · 새 작업을 열고 이 규격으로 이동`, run: () => createAndOpen({ exId: 'gs-illust', focusSpec: s.id }), col: '#757575', ic: 'frame', t2: true });
    results = results.slice(0, 14); sel = 0;
    pop.innerHTML = `<div class="mhead">${q ? `"${esc(inp.value)}" 결과 ${results.length}` : '최근 · 전부'}</div><div class="filt">${['전부', '작업', '예시', '도구', '규격'].map(f => `<span class="tag grey" aria-pressed="${f === '전부'}">${f}</span>`).join('')}</div>` + (results.length ? results.map((x, i) => `<button class="res" data-i="${i}" aria-selected="${i === sel}"><span class="ic${x.t2 ? ' t2' : ''}" style="${x.t2 ? '' : 'background:' + x.col}">${ic(x.ic)}</span><span class="grow"><b>${esc(x.b)}</b><small>${esc(x.k)} · ${esc(x.s)}</small></span></button>`).join('') : '<div class="hempty">결과 없음</div>');
    pop.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { pop.hidden = true; results[+b.dataset.i].run(); });
    pop.hidden = false;
  };
  inp.onfocus = run; inp.oninput = run;
  inp.onkeydown = e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length; pop.querySelectorAll('[data-i]').forEach((b, i) => b.setAttribute('aria-selected', String(i === sel))); } else if (e.key === 'Enter') { pop.hidden = true; results[sel]?.run(); } else if (e.key === 'Escape') { pop.hidden = true; inp.blur(); } };
}
function pickTool(toolId, pickId) {
  const t = toolById(toolId);
  if (!t.enabled) { if (t.note) modal(`${t.name}은 준비 중이에요`, `<p>${esc(t.note)}</p>`, [{ label: '확인', pri: true }]); return; }
  if (toolId !== 'ad') { modal('엘리베이터 콘텐츠는 다음 단계예요', '<p>이번엔 광고 소재 편집기를 먼저 만들었어요. 엘리베이터는 같은 틀로 이어서 붙일게요.</p>', [{ label: '확인', pri: true }]); return; }
  let tab = pickId ? tabs.find(x => x.id === pickId) : null;
  const fresh = { tool: 'ad', stage: 'start', name: '새 광고 소재', ex: null, prompt: '', att: [], scope: null };
  if (tab) Object.assign(tab, fresh); else { tab = { id: 't' + uid(), ...fresh }; tabs.push(tab); }
  mount(tab); activate(tab.id);
}
function startFromExample(exId) { createAndOpen({ exId }); }
function openDoc(id) { const open = tabs.find(t => t.doc?.id === id); if (open) return activate(open.id); const d = loadDoc(id); if (!d) return toast('저장본을 못 찾았어요'); const tab = { id: 't' + uid(), tool: 'ad', stage: 'editor', name: d.name, doc: d }; tabs.push(tab); mount(tab); activate(tab.id); }
function createAndOpen({ exId, prompt, fields, name, specIds, focusSpec, tab }) {
  tab ??= (() => { const t = { id: 't' + uid(), tool: 'ad', stage: 'loading', name: '새 광고 소재' }; tabs.push(t); return t; })();
  tab.stage = 'loading'; tab.name = tab.name || '새 광고 소재'; mount(tab); activate(tab.id);
  const el = viewOf(tab), bar = el.querySelector('[data-prog]'), note = el.querySelector('[data-note]');
  const steps = [[.15, '브리프를 읽는 중…'], [.4, '키비주얼 그림 판단…'], [.7, '규격 51종을 그리는 중…'], [.9, '가이드 검수 중…'], [1, '거의 다 됐어요']]; let i = 0;
  const tick = () => { if (tab.stage !== 'loading') return; const [p, m] = steps[i]; bar.style.width = p * 100 + '%'; note.textContent = m; if (++i < steps.length) setTimeout(tick, 320); else setTimeout(done, 300); };
  const done = () => { const doc = newDoc({ exId, prompt, fields, name, specIds }); doc.pageId = doc.pages[0].id; tab.doc = doc; tab.name = doc.name; tab.stage = 'editor'; mount(tab); renderTabs(); saveDoc(doc); if (focusSpec) { const f = pageOf(doc).children.find(x => x.specId === focusSpec); if (f) requestAnimationFrame(() => { tab.ed.select([f.id]); tab.ed.zoomTo([f.id]); }); } toast(`규격 ${pageOf(doc).children.length}개를 그렸어요 · 편집할 수 있어요`); };
  setTimeout(tick, 150);
}

// ── 탭 화면 ──
function viewOf(tab) { let el = document.querySelector(`#views > [data-view="${tab.id}"]`); if (!el) { el = document.createElement('section'); el.dataset.view = tab.id; el.hidden = true; $('views').appendChild(el); } return el; }
function mount(tab) {
  const el = viewOf(tab);
  if (tab.stage === 'pick') { el.className = 'view home'; el.innerHTML = '<div class="hmain"><div class="hhead"><span class="ttl">새 탭</span></div><div class="hbody"><h2 style="margin:0 0 4px;font-size:20px">무엇을 만들까요?</h2><p class="t2" style="margin:0 0 20px">도구를 고르면 이 탭에서 바로 열려요.</p><div class="hgrid">' + TOOLS.map(t => `<div class="card" data-tool="${t.id}" role="button" tabindex="0" ${t.enabled ? '' : 'aria-disabled="true" style="opacity:.5"'}><div class="bd"><span class="ic" style="background:${TOOL_IC[t.id][0]}">${ic(TOOL_IC[t.id][1])}</span><span class="grow"><span class="ttl">${esc(t.name)}</span><span class="sub">${esc(t.desc)} · ${esc(t.status)}</span></span></div></div>`).join('') + '</div></div></div>'; el.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => pickTool(b.dataset.tool, tab.id)); return; }
  if (tab.stage === 'start') { el.className = 'view start'; renderStart(tab, el); return; }
  if (tab.stage === 'loading') { el.className = 'view loading'; const sk = n => `<aside class="panel"><div class="phead"><span class="skel" style="width:120px;height:16px"></span></div><div class="ldsk">${Array.from({ length: n }, (_, i) => `<span class="skel${i % 3 ? ' w' + (i % 3 + 1) : ''}"></span>`).join('')}</div></aside>`; el.innerHTML = `<div class="rail"></div>${sk(14).replace('class="panel"', 'class="panel l"')}<div class="ldc"><div class="ldm"><img src="assets/midas-logo.png" alt="" width="96" style="opacity:.9"><div class="ldp"><i data-prog></i></div><span class="t2" data-note>준비 중…</span></div></div>${sk(10).replace('class="panel"', 'class="panel r"')}`; return; }
  el.className = 'view editor'; mountEditor(tab, el);
}

// ── 시작 화면 ──
function renderStart(tab, el) {
  const att = tab.att.map((a, i) => `<span class="chip"><i style="background-image:url('${a.src}')"></i>${esc(a.name)}<button class="ib s t2" data-att-x="${i}">${ic('x')}</button></span>`).join('');
  el.innerHTML = `<div class="stop"><span class="name"><span style="color:#0D99FF">${ic('file-ad')}</span>${esc(tab.name)} ${ic('chev-d')}</span><span class="tag blue">AI</span><span class="grow"></span><button class="btn pri" disabled>내보내기</button></div>
    <div class="sbody"><h1>무엇을 만들까요?</h1><p class="lead">채용 광고를 말로 적거나 공고 · 브리프 파일을 붙이면 매체 규격 ${SPECS.length}종을 한 번에 그려요. 그린 뒤엔 전부 편집할 수 있어요.</p>
    <div class="prompt"><textarea rows="2" data-prompt placeholder="어떤 채용 광고인지 적어 주세요. 예) GS에너지 2025 상반기 신입 공채, 6월 20일부터 7월 2일까지 접수">${esc(tab.prompt)}</textarea><div class="att" ${tab.att.length ? '' : 'hidden'}>${att}</div>
      <div class="prow"><button class="ib t2" data-attach title="파일 붙이기">${ic('plus')}</button><input type="file" accept=".txt,.md,.pdf,.docx,.png,.jpg,.jpeg" hidden data-file><button class="ib t2" data-kv title="키비주얼 붙이기">${ic('img')}</button><input type="file" accept="image/*" hidden data-kv-file><button class="btn ghost" data-scope>${esc(tab.scope ? tab.scope.label : `전체 ${SPECS.length}종`)} ${ic('chev-d')}</button><button class="btn ghost" data-ex-pick>${esc(tab.ex ? '예시 · ' + exById(tab.ex).by : '키비주얼 자동')} ${ic('chev-d')}</button><button class="send" data-send aria-disabled="${!(tab.prompt.trim() || tab.ex || tab.att.length)}" aria-label="생성">${ic('s-arrow-up')}</button></div></div>
    <div class="examples"><div class="exh"><b>예시로 시작하기</b><a class="lnk" data-more>더 보기</a><div class="nav"><button class="ib t2" data-prev>${ic('s-arrow-left')}</button><button class="ib t2" data-next>${ic('s-arrow-right')}</button></div></div><div class="exgrid">${EXAMPLES.map(e => `<div class="card" data-ex="${e.id}" role="button" tabindex="0" aria-selected="${tab.ex === e.id}"><span class="th" style="background-image:url('${thumbImg(e)}')"></span><div class="bd"><span class="grow"><span class="ttl">${esc(e.title)}</span><span class="sub">예시 · ${esc(e.by)}</span></span></div></div>`).join('')}</div></div></div>`;
  const ta = el.querySelector('[data-prompt]'), send = el.querySelector('[data-send]');
  const sync = () => send.setAttribute('aria-disabled', String(!(tab.prompt.trim() || tab.ex || tab.att.length)));
  ta.oninput = () => { tab.prompt = ta.value; sync(); ta.style.height = 'auto'; ta.style.height = Math.min(220, ta.scrollHeight) + 'px'; };
  ta.onkeydown = e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send.click(); } };
  el.querySelector('[data-attach]').onclick = () => el.querySelector('[data-file]').click();
  el.querySelector('[data-file]').onchange = e => { const f = e.target.files[0]; if (!f) return; tab.att.push({ name: f.name, src: '' }); renderStart(tab, el); toast(`${f.name} 를 붙였어요 — 브리프 내용은 예시 값으로 읽어요(규칙 파서는 app/ 에)`); };
  el.querySelector('[data-kv]').onclick = () => el.querySelector('[data-kv-file]').click();
  el.querySelector('[data-kv-file]').onchange = async e => { const f = e.target.files[0]; if (!f) return; const src = await fileToDataUrl(f, 1600); tab.kvSrc = src; tab.att = tab.att.filter(a => !a.kv); tab.att.push({ name: '키비주얼 · ' + f.name, src, kv: true }); renderStart(tab, el); };
  el.querySelectorAll('[data-att-x]').forEach(b => b.onclick = () => { const a = tab.att.splice(+b.dataset.attX, 1)[0]; if (a?.kv) tab.kvSrc = null; renderStart(tab, el); });
  el.querySelector('[data-scope]').onclick = e => { e.stopPropagation(); menu(e.currentTarget, [[`전체 ${SPECS.length}종`, tab.scope ? '' : '✓', () => { tab.scope = null; renderStart(tab, el); }], null, ...[...new Set(SPECS.map(s => s.media))].map(m => [`${m}만 · ${SPECS.filter(s => s.media === m).length}종`, tab.scope?.media === m ? '✓' : '', () => { tab.scope = { media: m, label: `${m} ${SPECS.filter(s => s.media === m).length}종` }; renderStart(tab, el); }])]); };
  el.querySelector('[data-ex-pick]').onclick = e => { e.stopPropagation(); menu(e.currentTarget, [['키비주얼 자동(붙인 그림에 맞춤)', tab.ex ? '' : '✓', () => { tab.ex = null; renderStart(tab, el); }], null, ...EXAMPLES.map(x => [`${x.title} · ${x.by}`, tab.ex === x.id ? '✓' : '', () => { tab.ex = x.id; renderStart(tab, el); }])]); };
  el.querySelectorAll('[data-ex]').forEach(c => c.onclick = () => { const x = exById(c.dataset.ex); tab.ex = x.id; tab.prompt = x.prompt; renderStart(tab, el); el.querySelector('[data-prompt]').focus(); });
  el.querySelector('[data-more]').onclick = () => toast('예시는 다섯 개예요 · 더 많은 사례는 2차에');
  el.querySelector('[data-prev]').onclick = () => { const g = el.querySelector('.exgrid'); g.prepend(g.lastElementChild); }; el.querySelector('[data-next]').onclick = () => { const g = el.querySelector('.exgrid'); g.appendChild(g.firstElementChild); };
  send.onclick = async () => { if (send.getAttribute('aria-disabled') === 'true') { ta.focus(); toast('무엇을 만들지 적거나 예시를 골라요'); return; }
    const exId = tab.ex ?? (/마이다스|midas/i.test(tab.prompt) ? 'midas-3d' : 'gs-illust'); const specIds = tab.scope ? SPECS.filter(s => s.media === tab.scope.media).map(s => s.id) : null; const kvSrc = tab.kvSrc; const prompt = tab.prompt;
    createAndOpen({ exId, prompt, specIds, tab }); if (kvSrc) { const wait = () => tab.doc ? applyKvLater(tab, kvSrc) : setTimeout(wait, 200); wait(); } };
}
async function applyKvLater(tab, src) { const { replaceKv } = await import('./doc.js'); const pal = await replaceKv(tab.doc, src, true); tab.ed.render(); tab.commit('키비주얼'); tab.rerender('left'); tab.rerender('right'); if (pal) toast(`붙인 키비주얼에 맞춰 지면 ${pal.bg} · 글자 ${pal.fg}`); }

// ── 에디터 ──
function mountEditor(tab, el) {
  const doc = tab.doc; doc.pageId ??= doc.pages[0].id;
  el.innerHTML = `<div class="rail" data-rail></div><aside class="panel l lpanel" aria-label="왼쪽 패널"></aside><div class="cvhost"></div><aside class="panel r rpanel" aria-label="오른쪽 패널"></aside>`;
  const rails = [['file', 'r-file', '파일'], ['input', 'r-input', '입력'], ['assets', 'r-assets', '에셋'], ['tools', 'r-tools', '도구'], ['check', 'r-check', '검수']];
  const railEl = el.querySelector('[data-rail]');
  const ctx = { tab, doc, toast, menu, rt: 'design', rail: 'file', ratioLock: false, open: new Set(), specById: id => SPECS.find(s => s.id === id) };
  tab.ctx = ctx;
  const ed = new Editor(el.querySelector('.cvhost'), doc, {
    select: () => { rerender('right'); syncLeftSel(); },
    commit: label => commit(label),
    change: () => { rerender('right'); rerenderSoon('left'); },
    live: () => { liveRight(); },
    zoom: () => { const z = el.querySelector('[data-act="zoom"]'); if (z && ed.zoom) z.firstChild.textContent = Math.round(ed.zoom * 100) + '% '; },
    tool: t => setTool(t),
    rename: id => { const n = findNode(ed.page, id); const nm = prompt('프레임 이름', n.name); if (nm != null && nm.trim()) { n.name = nm.trim(); commit('이름'); ed.updateOverlay(); rerender('left'); } },
  });
  wireGlobal(ed); tab.ed = ed; ctx.ed = ed; el.querySelector('.cvhost').classList.toggle('no-rulers', !ed.showRulers);
  // 되돌리기
  tab.undo = []; tab.redo = []; tab.snap = JSON.stringify({ pages: doc.pages, styles: doc.styles, approved: doc.approved, fields: doc.fields, palette: doc.palette, font: doc.font, kvSrc: doc.kvSrc });
  const snapshot = () => JSON.stringify({ pages: doc.pages, styles: doc.styles, approved: doc.approved, fields: doc.fields, palette: doc.palette, font: doc.font, kvSrc: doc.kvSrc });
  let saveT; const saveNowT = () => { clearTimeout(saveT); saveT = setTimeout(() => saveNow(tab), 800); };
  function commit(label) { const s = snapshot(); if (s === tab.snap) return; tab.undo.push(tab.snap); if (tab.undo.length > 120) tab.undo.shift(); tab.redo = []; tab.snap = s; saveNowT(); }
  tab.commit = commit;
  function restore(s) { const o = JSON.parse(s); Object.assign(doc, o); if (!doc.pages.find(p => p.id === doc.pageId)) doc.pageId = doc.pages[0].id; tab.snap = s; const keep = ed.sel.filter(id => findNode(ed.page, id)); ed.render(); ed.select(keep, { silent: true }); rerender('left'); rerender('right'); saveNowT(); }
  tab.undoFn = () => { if (!tab.undo.length) return toast('되돌릴 게 없어요'); tab.redo.push(tab.snap); restore(tab.undo.pop()); };
  tab.redoFn = () => { if (!tab.redo.length) return; tab.undo.push(tab.snap); restore(tab.redo.pop()); };
  // 패널
  const L = el.querySelector('.lpanel'), R = el.querySelector('.rpanel');
  let leftT; function rerenderSoon(w) { clearTimeout(leftT); leftT = setTimeout(() => rerender(w), 120); }
  Object.assign(ctx, { commit, rerender, cmd, openExport, preview, pickImage, onRename: () => { tab.name = doc.name; renderTabs(); renameDocIndex(doc); } });
  function rerender(which) { if (which === 'left') { const sc = L.querySelector('.pbody')?.scrollTop ?? 0; renderLeft(Object.assign(ctx, { el: L })); const b = L.querySelector('.pbody'); if (b) b.scrollTop = sc; } else { const sc = R.querySelector('.pbody')?.scrollTop ?? 0; renderRight(Object.assign(ctx, { el: R })); const b = R.querySelector('.pbody'); if (b) b.scrollTop = sc; } }
  tab.rerender = rerender;
  function liveRight() { const ns = ed.selNodes(); if (!ns.length) return; const f = k => R.querySelector(`input[data-p="${k}"]`); const n = ns[0]; if (f('x')) f('x').value = Math.round(n.x); if (f('y')) f('y').value = Math.round(n.y); if (f('w')) f('w').value = Math.round(n.w); if (f('h')) f('h').value = Math.round(n.h); }
  function syncLeftSel() { L.querySelectorAll('[data-node]').forEach(r => r.setAttribute('aria-selected', String(ed.sel.includes(r.dataset.node)))); const first = L.querySelector('[data-node][aria-selected="true"]'); if (first) { let p = ed.sel[0] && parentOf(ed.page, ed.sel[0]); let changed = false; while (p && p !== ed.page) { if (!ctx.open.has(p.id)) { ctx.open.add(p.id); changed = true; } p = parentOf(ed.page, p.id); } if (changed) rerender('left'); L.querySelector('[data-node][aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); } else if (ed.sel[0]) { const top = frameOf(ed.page, findNode(ed.page, ed.sel[0])); if (top) { ctx.groupsOpen?.add(top.media ?? '기타'); let p = parentOf(ed.page, ed.sel[0]); while (p && p !== ed.page) { ctx.open.add(p.id); p = parentOf(ed.page, p.id); } rerender('left'); L.querySelector('[data-node][aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); } } }
  const renderRail = () => { railEl.innerHTML = rails.map(([k, i, l]) => `<button data-r="${k}" aria-pressed="${ctx.rail === k}" title="${l}">${ic(i)}<span>${l}</span></button>`).join('') + '<span class="sp"></span>'; railEl.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { if (ctx.rail === b.dataset.r && !L.classList.contains('collapsed')) { L.classList.add('collapsed'); b.setAttribute('aria-pressed', 'false'); return; } L.classList.remove('collapsed'); ctx.rail = b.dataset.r; renderRail(); rerender('left'); }); };
  renderRail(); rerender('left'); rerender('right');
  // 떠 있는 툴바
  const ft = document.createElement('div'); ft.className = 'ftool'; ft.setAttribute('role', 'toolbar'); el.querySelector('.cvhost').appendChild(ft);
  const tools = [['move', 'cursor', '선택 (V)'], ['hand', 'hand', '손 (H)'], null, ['frame', 'frame', '프레임 (F)'], ['rect', 'rect', '사각형 (R)'], ['text', 'text', '텍스트 (T)'], ['image', 'img', '이미지 (I)'], null, ['comment', 'comment', '코멘트 (C)'], ['ai', 'ai', 'AI 다시 그리기']];
  const renderTools = () => { ft.innerHTML = tools.map(t => t === null ? '<span class="vsep"></span>' : `<button class="tool${t[0] === 'ai' ? ' ai' : ''}" data-tool="${t[0]}" aria-pressed="${ed.tool === t[0]}" title="${t[2]}">${ic(t[1])}${t[0] === 'move' ? '<i class="dd"></i>' : ''}</button>`).join(''); ft.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => { const t = b.dataset.tool; if (t === 'comment') return toast('코멘트는 2차(서버 · 로그인) 뒤에'); if (t === 'ai') return cmd('regen'); if (t === 'image') return cmd('image'); setTool(t); }); };
  function setTool(t) { ed.tool = t; ed.cv.className = 'cv' + (t === 'hand' ? ' pan' : '') + (['frame', 'rect', 'text'].includes(t) ? ' tool-' + t : ''); renderTools(); }
  renderTools();
  const help = document.createElement('button'); help.className = 'help'; help.textContent = '?'; help.onclick = () => { ctx.rail = 'tools'; L.classList.remove('collapsed'); renderRail(); rerender('left'); }; el.querySelector('.cvhost').appendChild(help);
  function pickImage(cb) { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = async () => { const f = inp.files[0]; if (!f) return; cb(await fileToDataUrl(f, 2000), f); }; inp.click(); }
  // 명령
  function cmd(k) {
    const page = ed.page; const ns = ed.selNodes();
    if (k === 'delete') { const del = ns.filter(n => !n.locked); if (!del.length) return; for (const n of del) { const i = doc.approved.indexOf(n.id); if (i >= 0) doc.approved.splice(i, 1); removeNode(page, n.id); } ed.select([], { silent: true }); ed.render(); commit('삭제'); rerender('left'); rerender('right'); }
    else if (k === 'dup') { if (!ns.length) return; const ids = []; for (const n of ns) { const p = parentOf(page, n.id); const list = p === page ? page.children : p.children; const c = cloneNode(n); c.x += 20; c.y += 20; list.splice(list.indexOf(n) + 1, 0, c); ids.push(c.id); } ed.render(); ed.select(ids); commit('복제'); rerender('left'); }
    else if (k === 'group') { if (ns.length < 1) return; const p = parentOf(page, ns[0].id); if (ns.some(n => parentOf(page, n.id) !== p)) return toast('같은 부모 안의 레이어끼리만 그룹이 돼요'); if (p === page) return toast('페이지 위 프레임은 그룹 대신 섹션으로 묶어요(준비 중)'); const b = { x: Math.min(...ns.map(n => n.x)), y: Math.min(...ns.map(n => n.y)) }; b.w = Math.max(...ns.map(n => n.x + n.w)) - b.x; b.h = Math.max(...ns.map(n => n.y + n.h)) - b.y; const g = node('group', { ...b, name: '그룹' }); const list = p.children; const idx = Math.min(...ns.map(n => list.indexOf(n))); for (const n of ns) { list.splice(list.indexOf(n), 1); n.x -= b.x; n.y -= b.y; g.children.push(n); } list.splice(idx, 0, g); ed.refresh(p.id); ed.select([g.id]); commit('그룹'); rerender('left'); }
    else if (k === 'ungroup') { for (const g of ns.filter(n => n.type === 'group')) { const p = parentOf(page, g.id); const list = p === page ? page.children : p.children; const i = list.indexOf(g); const kids = g.children.map(c => ({ ...c, x: c.x + g.x, y: c.y + g.y })); list.splice(i, 1, ...kids); ed.refresh(p === page ? g.id : p.id); if (p === page) ed.render(); ed.select(kids.map(c => c.id)); } commit('그룹 풀기'); rerender('left'); }
    else if (k === 'front' || k === 'back' || k === 'forward' || k === 'backward') { for (const n of ns) { const p = parentOf(page, n.id); const list = p === page ? page.children : p.children; const i = list.indexOf(n); list.splice(i, 1); const j = k === 'front' ? list.length : k === 'back' ? 0 : k === 'forward' ? Math.min(list.length, i + 1) : Math.max(0, i - 1); list.splice(j, 0, n); if (p === page) ed.render(); else ed.refresh(p.id); } ed.select(ed.sel); commit('순서'); rerender('left'); }
    else if (k === 'lock') { for (const n of ns) n.locked = !n.locked; commit('잠금'); rerender('left'); rerender('right'); }
    else if (k === 'hide') { for (const n of ns) { n.visible = n.visible === false; ed.refresh(n.id); } commit('숨기기'); rerender('left'); rerender('right'); }
    else if (k === 'selectall') { const p = ns[0] ? parentOf(page, ns[0].id) : page; ed.select((p === page ? page.children : p.children).map(n => n.id)); }
    else if (k === 'parent') { if (!ns[0]) return; const p = parentOf(page, ns[0].id); p && p !== page ? ed.select([p.id]) : ed.select([]); }
    else if (k === 'image') { pickImage((src, f) => { const host = ns[0] ? (ns[0].type === 'frame' || ns[0].type === 'group' ? ns[0] : parentOf(page, ns[0].id)) : null; const im = new Image(); im.onload = () => { const cw = host && host !== page ? host.w : 800; const s = Math.min(1, cw * .6 / im.width); const n = node('image', { name: f.name.replace(/\.[^.]+$/, ''), x: 0, y: 0, w: Math.round(im.width * s), h: Math.round(im.height * s), fills: [imageFill(src, 'cover')] }); if (host && host !== page) { host.children.push(n); ed.refresh(host.id); } else { const b = ed.toPage(ed.cv.getBoundingClientRect().left + 100, ed.cv.getBoundingClientRect().top + 100); n.x = Math.round(b.x); n.y = Math.round(b.y); page.children.push(n); ed.render(); } ed.select([n.id]); commit('이미지'); rerender('left'); setTool('move'); }; im.src = src; }); }
    else if (k === 'copy') { if (!ns.length) return; tab.clip = ns.map(n => cloneNode(n)); toast(`${ns.length}개 복사`); }
    else if (k === 'paste') { if (!tab.clip?.length) return; const host = ns[0] ? (ns[0].type === 'frame' || ns[0].type === 'group' ? ns[0] : parentOf(page, ns[0].id)) : page; const ids = []; for (const c of tab.clip) { const n = cloneNode(c); if (host === page && n.type !== 'frame') { const f = node('frame', { name: '붙여넣기', x: 0, y: 0, w: n.w, h: n.h, fills: [solid('#FFFFFF')], media: '추가' }); n.x = 0; n.y = 0; f.children.push(n); page.children.push(f); ids.push(f.id); } else { (host === page ? page.children : host.children).push(n); ids.push(n.id); } } ed.render(); ed.select(ids); commit('붙여넣기'); rerender('left'); }
    else if (k === 'regen') { modal('규칙 레이아웃을 다시 생성할까요?', '<p>모든 규격의 레이어를 처음 상태로 다시 깔아요. 지금 편집한 내용은 되돌리기(⌘Z)로 돌아올 수 있어요.</p>', [{ label: '취소' }, { label: '다시 생성', pri: true, run: () => { const ex = exById(doc.ex); const fresh = newDoc({ exId: ex.id, fields: doc.fields, prompt: doc.prompt }); const pg = pageOf(doc); pg.children = fresh.pages[0].children; if (doc.kvSrc || doc.palette) { import('./doc.js').then(async m => { if (doc.kvSrc) await m.replaceKv(doc, doc.kvSrc, false); if (doc.palette) { const old = doc.palette; doc.palette = ex.palette; m.applyPalette(doc, old); } ed.render(); commit('다시 생성'); rerender('left'); rerender('right'); }); } else { ed.render(); commit('다시 생성'); rerender('left'); rerender('right'); } ed.select([], { silent: true }); toast('규칙 레이아웃으로 다시 그렸어요'); } }]); }
    else if (k === 'tidy') { layoutBoard(page.children); ed.render(); ed.fit(); commit('보드 정리'); }
    else if (k === 'ai-ref') { const f = ns[0] ? frameOf(page, ns[0]) : null; if (!f?.specId) return toast('규격 프레임을 먼저 고르세요'); const src = refImg(exById(doc.ex), f.specId); modal(`AI 렌더 참고 · ${f.name}`, `<img src="${src}" alt="" style="max-width:100%;border:1px solid var(--border);border-radius:6px"><p>10-22 A+AI 샘플 렌더(참고용). 「이 배치로」를 누르면 이 그림을 프레임의 참고 레이어로 깔아요.</p>`, [{ label: '닫기' }, { label: '이 배치로 깔기', pri: true, run: () => { const n = node('image', { name: 'AI 렌더 참고', x: 0, y: 0, w: f.w, h: f.h, opacity: .5, locked: true, fills: [imageFill(src, 'fill')] }); f.children.splice(1, 0, n); ed.refresh(f.id); commit('참고'); rerender('left'); } }]); }
    else if (k === 'collapse-left') { L.classList.add('collapsed'); renderRail(); }
    else if (k === 'search-layers') { const q = prompt('레이어 이름 찾기'); if (!q) return; const hit = []; walk(page.children, n => { if (n.name.toLowerCase().includes(q.toLowerCase())) hit.push(n.id); }); if (!hit.length) return toast('없어요'); ed.select(hit); ed.zoomTo(hit); toast(`${hit.length}개 찾음`); }
    else if (k === 'doc-dup') { const d = clone(doc); d.id = 'd' + uid(); d.name += ' 사본'; saveDoc(d); toast('사본을 저장했어요', { label: '열기', run: () => openDoc(d.id) }); }
    else if (k === 'doc-delete') { modal('이 작업을 지울까요?', '<p>저장본이 사라져요.</p>', [{ label: '취소' }, { label: '지우기', pri: true, run: () => { deleteDoc(doc.id); tab.doc = null; closeTab(tab.id); } }]); }
  }
  tab.cmd = cmd;
  function preview() { const f = ns0(); if (!f) return toast('규격 프레임을 먼저 고르세요'); const pv = document.createElement('div'); pv.className = 'preview'; pv.innerHTML = `<div class="bar"><span>${esc(f.name)} · ${f.w}×${f.h}</span><span class="grow"></span><button class="ib" data-dl>${ic('export')}</button><button class="ib" data-x>${ic('x')}</button></div><div class="stage"></div>`; document.body.appendChild(pv); renderFrame(f, 1).then(c => pv.querySelector('.stage').appendChild(c)); pv.querySelector('[data-x]').onclick = () => pv.remove(); pv.querySelector('[data-dl]').onclick = async () => download(await framePng(f, 1), `${safe(f.name)}_${f.w}x${f.h}.png`); const esc_ = e => { if (e.key === 'Escape') { pv.remove(); document.removeEventListener('keydown', esc_); } }; document.addEventListener('keydown', esc_); }
  function ns0() { const n = ed.selNodes()[0]; return n ? frameOf(ed.page, n) : ed.page.children[0]; }
  function openExport({ scope = 'all', scale = 1 } = {}) {
    const page = ed.page; const sel = ed.selNodes().map(n => frameOf(page, n)); const uniq = [...new Set(sel)];
    const sets = { selection: uniq, approved: page.children.filter(f => doc.approved.includes(f.id)), all: page.children };
    modal('내보내기', `<label class="opt"><input type="radio" name="fmt" value="png" checked><span><b>PNG 묶음(ZIP)</b><small>매체별 폴더 · 규격 이름_크기.png</small></span></label><label class="opt"><input type="radio" name="fmt" value="one"><span><b>PNG 한 장씩</b><small>프레임마다 바로 내려받기(3개까지)</small></span></label><hr>
      <label class="opt"><input type="radio" name="scope" value="selection" ${scope === 'selection' ? 'checked' : ''} ${uniq.length ? '' : 'disabled'}><span><b>선택한 규격</b><small>${uniq.length}개</small></span></label><label class="opt"><input type="radio" name="scope" value="approved" ${scope === 'approved' ? 'checked' : ''}><span><b>승인한 규격만</b><small>${sets.approved.length}개</small></span></label><label class="opt"><input type="radio" name="scope" value="all" ${scope === 'all' ? 'checked' : ''}><span><b>전체</b><small>${page.children.length}개</small></span></label><hr>
      <div class="r2"><label>배율 <select class="in" name="scale"><option value="1" ${scale === 1 ? 'selected' : ''}>1x</option><option value="2" ${scale === 2 ? 'selected' : ''}>2x</option><option value="3" ${scale === 3 ? 'selected' : ''}>3x</option></select></label><span></span></div><div class="t2" data-prog></div>`,
      [{ label: '취소' }, { label: '내보내기', pri: true, run: async () => { const box = $('modalBox'); const fmt = box.querySelector('[name="fmt"]:checked').value, sc = box.querySelector('[name="scope"]:checked').value, k = +box.querySelector('[name="scale"]').value; const list = sets[sc]; if (!list.length) return toast('내보낼 규격이 없어요'); toast(`${list.length}개 그리는 중…`); try { if (fmt === 'one') { for (const f of list.slice(0, 3)) download(await framePng(f, k), `${safe(f.name)}_${f.w}x${f.h}.png`); } else await exportZip(list, { scale: k, name: `${doc.name}_${sc === 'all' ? '전체' : sc === 'approved' ? '승인' : '선택'}` }); toast('내보냈어요'); } catch (e) { console.error(e); toast('내보내기 실패: ' + e.message); } } }]);
  }
  tab.openExport = openExport;
  // 캔버스 우클릭 메뉴
  ed.cv.addEventListener('contextmenu', e => { e.preventDefault(); const id = ed.pickFromEl(e.target); if (id && !ed.sel.includes(id)) ed.select([id]); const has = ed.sel.length > 0; menu({ getBoundingClientRect: () => ({ left: e.clientX, top: e.clientY, bottom: e.clientY, right: e.clientX, width: 0, height: 0 }) }, [['복사', '⌘C', has ? () => cmd('copy') : null], ['붙여넣기', '⌘V', tab.clip?.length ? () => cmd('paste') : null], ['복제', '⌘D', has ? () => cmd('dup') : null], null, ['그룹', '⌘G', has ? () => cmd('group') : null], ['그룹 풀기', '⇧⌘G', has ? () => cmd('ungroup') : null], ['맨 앞으로', '⌘]', has ? () => cmd('front') : null], ['맨 뒤로', '⌘[', has ? () => cmd('back') : null], null, ['숨기기/보이기', '⇧⌘H', has ? () => cmd('hide') : null], ['잠그기/풀기', '⇧⌘L', has ? () => cmd('lock') : null], null, ['선택에 맞춤', '⇧2', has ? () => ed.zoomTo() : null], ['화면에 맞춤', '⇧1', () => ed.fit()], null, ['삭제', '⌫', has ? () => cmd('delete') : null]]); });
  // 드롭으로 이미지 넣기
  ed.cv.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
  ed.cv.addEventListener('drop', async e => { const f = [...e.dataTransfer.files].find(x => x.type.startsWith('image/')); if (!f) return; e.preventDefault(); const src = await fileToDataUrl(f, 2000); const pg = ed.toPage(e.clientX, e.clientY); const host = ed.page.children.find(fr => pg.x >= fr.x && pg.y >= fr.y && pg.x <= fr.x + fr.w && pg.y <= fr.y + fr.h); const im = new Image(); im.onload = () => { const cw = host ? host.w : 800; const s = Math.min(1, cw * .6 / im.width); const n = node('image', { name: f.name.replace(/\.[^.]+$/, ''), x: Math.round(host ? pg.x - host.x : pg.x), y: Math.round(host ? pg.y - host.y : pg.y), w: Math.round(im.width * s), h: Math.round(im.height * s), fills: [imageFill(src, 'cover')] }); if (host) { host.children.push(n); ed.refresh(host.id); } else { ed.page.children.push(n); ed.render(); } ed.select([n.id]); commit('이미지'); rerender('left'); }; im.src = src; });
  requestAnimationFrame(() => ed.fit());
}
function saveNow(tab) { if (!tab.doc) return; const doc = tab.doc; const f = pageOf(doc).children[0]; const go = thumb => { saveDoc(doc, thumb); }; if (f) thumbnail(f, 320).then(go).catch(() => go(null)); else go(null); }

// ── 키보드 ──
document.addEventListener('keydown', e => {
  const t = tabs.find(x => x.id === active); const ed = t?.ed;
  if (e.key === 'Escape') { closeModal(); $('pop').hidden = true; $('spop').hidden = true; }
  if (/input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
  if (!ed) return;
  const meta = e.metaKey || e.ctrlKey; const k = e.key.toLowerCase();
  if (e.key === 'Alt') { ed.alt = true; ed.updateOverlay(); }
  if (e.key === ' ' && !ed.space) { ed.space = true; ed.cv.classList.add('pan'); e.preventDefault(); return; }
  if (meta && k === 'z') { e.preventDefault(); e.shiftKey ? t.redoFn() : t.undoFn(); return; }
  if (meta && k === 'y') { e.preventDefault(); t.redoFn(); return; }
  if (meta && k === 's') { e.preventDefault(); saveNow(t); toast('저장했어요'); return; }
  if (meta && k === 'e') { e.preventDefault(); t.openExport({ scope: ed.sel.length ? 'selection' : 'all' }); return; }
  if (meta && k === 'd') { e.preventDefault(); t.cmd('dup'); return; }
  if (meta && k === 'c') { t.cmd('copy'); return; } if (meta && k === 'v') { t.cmd('paste'); return; }
  if (meta && k === 'a') { e.preventDefault(); t.cmd('selectall'); return; }
  if (meta && k === 'g') { e.preventDefault(); t.cmd(e.shiftKey ? 'ungroup' : 'group'); return; }
  if (meta && e.shiftKey && k === 'h') { e.preventDefault(); t.cmd('hide'); return; }
  if (meta && e.shiftKey && k === 'l') { e.preventDefault(); t.cmd('lock'); return; }
  if (meta && (e.key === ']' || e.key === '[')) { e.preventDefault(); t.cmd(e.key === ']' ? (e.altKey ? 'front' : 'forward') : (e.altKey ? 'back' : 'backward')); return; }
  if (meta && (e.key === '=' || e.key === '+')) { e.preventDefault(); ed.setZoom(ed.zoom * 1.25); return; } if (meta && e.key === '-') { e.preventDefault(); ed.setZoom(ed.zoom / 1.25); return; }
  if (meta && e.key === '0') { e.preventDefault(); ed.setZoom(1); return; }
  if (e.shiftKey && e.key === '!') { ed.fit(); return; } if (e.shiftKey && e.key === '@') { ed.zoomTo(); return; } if (e.shiftKey && e.key === ')') { ed.setZoom(1); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); t.cmd('delete'); return; }
  if (e.key === 'Escape') { if (ed.tool !== 'move') t.ed.hooks.tool('move'); else t.cmd('parent'); return; }
  if (e.key.startsWith('Arrow')) { e.preventDefault(); const d = e.shiftKey ? 10 : 1; ed.nudge(e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0); return; }
  if (!meta && !e.altKey) { const map = { v: 'move', h: 'hand', f: 'frame', r: 'rect', t: 'text' }; if (map[k]) { t.ed.hooks.tool(map[k]); return; } if (k === 'i') { t.cmd('image'); return; } if (k === 'c') { toast('코멘트는 2차에'); return; } }
});
document.addEventListener('keyup', e => { const t = tabs.find(x => x.id === active); const ed = t?.ed; if (!ed) return; if (e.key === 'Alt') { ed.alt = false; ed.updateOverlay(); } if (e.key === ' ') { ed.space = false; if (ed.tool !== 'hand') ed.cv.classList.remove('pan'); } });
window.addEventListener('beforeunload', () => { for (const t of tabs) if (t.doc) saveDoc(t.doc); });

window.studio = { get tabs() { return tabs; }, get tab() { return tabs.find(x => x.id === active); }, openDoc, createAndOpen };
activate('home');
// 바로 보기: #start · #loading · #board=<예시 id> · #doc=<id>
const h = location.hash;
if (h === '#start' || h === '#empty') pickTool('ad', null);
else if (h === '#loading') { const t = { id: 't' + uid(), tool: 'ad', stage: 'loading', name: '새 광고 소재' }; tabs.push(t); mount(t); activate(t.id); }
else if (h.startsWith('#board')) { const m = /#board=?([\w-]*)(?:&sel=(\d+))?/.exec(h); createAndOpen({ exId: m?.[1] || 'gs-illust' }); if (m?.[2]) { const wait = () => { const t = tabs[tabs.length - 1]; if (!t?.ed) return setTimeout(wait, 200); const f = t.ed.page.children[0]; const n = f.children[+m[2]] ?? f; t.ed.zoom = .6; t.ed.applyZoom(); t.ed.select([n.id]); t.ed.zoomTo([f.id]); }; wait(); } }
else if (h.startsWith('#doc=')) openDoc(h.slice(5));
