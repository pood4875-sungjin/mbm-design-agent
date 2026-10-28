// 작업 화면 — 홈(도구 카드) → [왼쪽 입력 | 가운데 결과 | 오른쪽 편집]. 광고 소재 · 엘리베이터가 같은 틀.
//   문서 모델(doc.js) · 캔버스(canvas.js) · 내보내기(export.js)는 피그마식 편집기(pro.html)와 같은 파일 · 같은 저장소.
import { TOOLS } from './tools.js';
import { EXAMPLES, exById, kvImg, thumbImg, newDoc, loadIndex, loadDoc, saveDoc, deleteDoc, renameDocIndex, pageOf, findNode, parentOf, removeNode, cloneNode, node, imageFill, solid, uid, walk, SPECS, FIELDS, FONTS, clamp, paletteFromImage, applyPalette, replaceKv, replaceLogo, setFontAll, setTextColorAll, applyFieldsToText, serialize, hydrate, layoutBoard } from './doc.js';
import { Editor, wireGlobal } from './canvas.js';
import { checkFrame, fileToDataUrl } from './panel.js';
import { exportZip, framePng, download, thumbnail, safe } from './export.js';
import { esc, ago, mix, palOf, MEDIA, countOf, pickImage, I, readPrompt, fitTextHeight, fixContrast, applyTheme, PRESETS, applyPreset, cornerOf, placeCorner, syncMedia, ELEV, buildScene, previewFrame } from './lib.js';

const $ = id => document.getElementById(id);
const app = $('app'), top = $('top');
const TOOL_UI = { ad: { color: '#2F6FE6', ic: 'ad', route: 'ad' }, elevator: { color: '#14AE5C', ic: 'elev', route: 'elev' }, mbm: { color: '#9747FF', ic: 'bell', route: null }, offline: { color: '#F24822', ic: 'grid', route: null } };
const NOW = () => Date.now();

// ── 공통 ──
let toastT; function toast(msg, act) { const t = $('toast'); t.innerHTML = esc(msg) + (act ? `<button data-act>${esc(act.label)}</button>` : ''); t.hidden = false; if (act) t.querySelector('[data-act]').onclick = () => { t.hidden = true; act.run(); }; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, act ? 7000 : 2600); }
function modal(title, body, actions) {
  $('modalBox').innerHTML = `<div class="mh"><span>${esc(title)}</span><span class="grow"></span><button class="ib" data-m="x" aria-label="닫기">${I.x}</button></div><div class="mb">${body}</div><div class="mf">${actions.map((a, i) => `<button class="btn${a.pri ? ' pri' : ''}" data-m="${i}">${esc(a.label)}</button>`).join('')}</div>`;
  $('modal').hidden = false; document.body.classList.add('lock');
  $('modalBox').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const a = actions[+b.dataset.m]; closeModal(); a?.run?.(); }); $('modalBox').querySelector('.btn.pri, .btn')?.focus();
}
function closeModal() { $('modal').hidden = true; document.body.classList.remove('lock'); }
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
function menu(anchor, items) { const p = $('pop'); const r = anchor.getBoundingClientRect(); p.innerHTML = items.map((it, i) => `<button data-i="${i}">${esc(it[0])}</button>`).join(''); p.hidden = false; p.style.left = Math.min(r.left, innerWidth - p.offsetWidth - 8) + 'px'; p.style.top = (r.bottom + 4) + 'px'; p.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { p.hidden = true; items[+b.dataset.i][1](); }); }
document.addEventListener('pointerdown', e => { if (!e.target.closest('#pop')) $('pop').hidden = true; });
async function saveWithThumb(doc) { const f = pageOf(doc).children[0]; let th = null; try { if (f) th = await thumbnail(f, 320); } catch { /* 없이 */ } saveDoc(doc, th); }

// 썸네일 캐시(프레임 내용이 바뀌면 다시)
const thumbs = new Map();
const keyOf = f => JSON.stringify(f, (k, v) => typeof v === 'string' && v.length > 200 ? '@' : v);
async function thumbOf(f, px) { const k = keyOf(f) + px; const c = thumbs.get(f.id); if (c && c.k === k) return c.url; const url = await thumbnail(f, px); thumbs.set(f.id, { k, url }); return url; }

// ── 상태 ──
const S = { tool: 'ad', doc: null, sel: null, big: false, ed: null, undo: [], redo: [], snap: null, saveT: null, zipSel: new Set(), keyH: null, ro: null,
  draft: { prompt: '', att: [], kvSrc: null, logoSrc: null, exId: null, fields: {}, src: {}, media: new Set(MEDIA), scenes: '' } };
const resetDraft = () => { S.draft = { prompt: '', att: [], kvSrc: null, logoSrc: null, exId: null, fields: {}, src: {}, media: new Set(MEDIA), scenes: '' }; };

// ── 라우터 ──
function go(h) { location.hash = h; }
function route() {
  const h = location.hash || '#/'; const [, a, b] = h.split('/');
  closeModal(); document.querySelectorAll('.preview').forEach(p => p.remove()); leaveBig(); if (S.keyH) { document.removeEventListener('keydown', S.keyH); S.keyH = null; }
  if (S.doc && !(['ad', 'elev'].includes(a) && b === S.doc.id)) { saveWithThumb(S.doc); S.doc = null; S.sel = null; S.zipSel.clear(); }
  window.scrollTo(0, 0);
  if (a === 'ad' || a === 'elev') return renderWorkspace(a === 'ad' ? 'ad' : 'elevator', b);
  if (a === 'mine') return renderHome(true);
  return renderHome(false);
}
window.addEventListener('hashchange', route);

// ───────────────────────── 홈 ─────────────────────────
function topHome(cur) { top.innerHTML = `<a class="brand" href="#/"><span class="mark">M</span><span class="bt">디자인 에이전트</span></a><nav><a href="#/" aria-current="${cur === 'home' ? 'page' : 'false'}">홈</a><a href="#/mine" aria-current="${cur === 'mine' ? 'page' : 'false'}">내 작업</a></nav><span class="grow"></span><a class="btn sm ghost" href="pro.html" title="피그마식 전문가 편집기">전문가 편집기 ↗</a>`; }
function workCards(list) {
  if (!list.length) return `<div class="empty"><b>아직 만든 게 없어요</b><span>위에서 도구를 고르면 바로 시작해요.</span></div>`;
  return `<div class="grid">${list.map(r => { const t = TOOL_UI[r.tool ?? 'ad'] ?? TOOL_UI.ad; return `<div class="card wcard" data-open="${r.id}" data-tool="${r.tool ?? 'ad'}" role="button" tabindex="0"><span class="th ${r.thumb ? '' : 'contain'}" style="background-image:url('${r.thumb ? r.thumb : thumbImg(exById(r.ex))}')"></span><div class="bd"><b>${esc(r.name)}</b><small>${esc(TOOLS.find(x => x.id === (r.tool ?? 'ad'))?.name ?? '')} · 규격 ${r.frames ?? '?'}개 · ${ago(r.updatedAt)}</small></div><button class="ib more" data-more="${r.id}" aria-label="더 보기">${I.more}</button></div>`; }).join('')}</div>`;
}
function renderHome(mine) {
  topHome(mine ? 'mine' : 'home'); const idx = loadIndex();
  const tools = `<div class="tools">${TOOLS.map(t => { const u = TOOL_UI[t.id]; const on = t.enabled && u.route; return `<div class="card tcard" data-tool="${t.id}" role="button" tabindex="0" aria-disabled="${!on}"><span class="ic" style="background:${u.color}">${I[u.ic]}</span><span class="tag ${on ? 'blue' : 'grey'} st">${esc(t.status)}</span><b>${esc(t.name)}</b><p>${esc(t.desc)}</p><span class="cta">${on ? '시작하기 →' : t.cta}</span></div>`; }).join('')}</div>`;
  app.innerHTML = `<section class="page">${mine ? '' : `<span class="tag blue">MIDAS 디자인 에이전트</span><h1 class="hero" style="margin-top:12px">무엇을 만들까요?</h1><p class="lead" style="margin-top:8px">도구를 고르면 작업 화면이 열려요. 왼쪽에 적고 붙이면 가운데에 결과가 생기고, 결과를 누르면 오른쪽에서 바로 고쳐요.</p>${tools}`}
    <div class="sechead"><h2 class="sec">${mine ? '내 작업' : '최근 작업'}</h2><span class="t2 small">${idx.length}개 · 이 브라우저에 저장</span><span class="grow"></span>${!mine && idx.length > 8 ? '<a href="#/mine">전부 보기 →</a>' : ''}</div>${workCards(mine ? idx : idx.slice(0, 8))}</section>`;
  app.querySelectorAll('[data-tool]').forEach(c => c.onclick = () => { const t = TOOLS.find(x => x.id === c.dataset.tool); const u = TOOL_UI[t.id]; if (!(t.enabled && u.route)) return modal(`${t.name}은 준비 중이에요`, `<p>${esc(t.note ?? t.status)}</p>`, [{ label: '확인', pri: true }]); resetDraft(); go('#/' + u.route); });
  app.querySelectorAll('[data-open]').forEach(c => { const open = () => go(`#/${TOOL_UI[c.dataset.tool]?.route ?? 'ad'}/${c.dataset.open}`); c.onclick = e => { if (!e.target.closest('[data-more]')) open(); }; c.onkeydown = e => { if (e.key === 'Enter') open(); }; });
  app.querySelectorAll('[data-more]').forEach(b => b.onclick = e => { e.stopPropagation(); const id = b.dataset.more; const r = idx.find(x => x.id === id); menu(b, [['열기', () => go(`#/${TOOL_UI[r?.tool ?? 'ad']?.route ?? 'ad'}/${id}`)], ['전문가 편집기에서 열기', () => { location.href = `pro.html#doc=${id}`; }], ['복제', () => { const d = loadDoc(id); if (!d) return; d.id = 'd' + uid(); d.name += ' 사본'; saveDoc(d, r?.thumb); renderHome(mine); toast('사본을 만들었어요'); }], ['삭제', () => modal('이 작업을 지울까요?', '<p>저장본이 사라져요. 되돌릴 수 없어요.</p>', [{ label: '취소' }, { label: '지우기', pri: true, run: () => { deleteDoc(id); renderHome(mine); toast('지웠어요'); } }])]]); });
}

// ───────────────────────── 작업 화면 ─────────────────────────
function renderWorkspace(tool, id) {
  S.tool = tool; const T = TOOLS.find(t => t.id === tool); const u = TOOL_UI[tool];
  if (id) { if (S.doc?.id !== id) { const d = loadDoc(id); if (!d) { toast('저장본을 못 찾았어요'); return go('#/'); } S.doc = d; S.sel = null; S.undo = []; S.redo = []; S.snap = serialize(d); } }
  else S.doc = null;
  top.innerHTML = `<a class="ib" href="#/" title="홈" aria-label="홈">${I.back}</a><span class="tool"><span class="ic" style="background:${u.color}">${I[u.ic]}</span>${esc(T.name)}</span>${S.doc ? `<input class="title" data-title value="${esc(S.doc.name)}" aria-label="작업 이름"><span class="state" data-state>저장됨</span>` : '<span class="state">새 작업</span>'}<span class="grow"></span>
    <button class="ib" data-undo title="되돌리기 (⌘Z)" ${S.doc ? '' : 'disabled'}>${I.undo}</button><button class="ib" data-redo title="다시 실행 (⇧⌘Z)" ${S.doc ? '' : 'disabled'}>${I.redo}</button><a class="btn sm ghost" href="${S.doc ? `pro.html#doc=${S.doc.id}` : 'pro.html'}" title="피그마식 세부 편집">전문가 편집기 ↗</a><button class="btn sm pri" data-export ${S.doc ? '' : 'disabled'}>${I.dl} 내보내기</button>`;
  app.innerHTML = `<div class="ws${S.sel ? ' has-edit' : ''}"><aside class="lp" aria-label="입력"></aside><section class="cp" aria-label="결과"></section><aside class="rp" aria-label="편집"></aside></div>`;
  top.querySelector('[data-undo]').onclick = undo; top.querySelector('[data-redo]').onclick = redo; top.querySelector('[data-export]').onclick = () => openExport();
  const title = top.querySelector('[data-title]'); if (title) title.onchange = () => { S.doc.name = title.value.trim() || S.doc.name; title.value = S.doc.name; commit(); renameDocIndex(S.doc); };
  renderLeft(); renderCenter(); renderRight();
  S.keyH = e => { if (/input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return; const meta = e.metaKey || e.ctrlKey; const k = e.key.toLowerCase();
    if (meta && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; } if (meta && k === 'y') { e.preventDefault(); redo(); return; }
    if (meta && k === 'e') { e.preventDefault(); openExport(); return; }
    const ed = S.ed; if (!ed) { if (e.key === 'Escape' && S.sel) select(null); return; }
    if (meta && k === 'd') { e.preventDefault(); act('dup'); } else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); act('delete'); }
    else if (e.key === 'Escape') { ed.sel.length ? ed.select([]) : leaveBig(true); } else if (e.key.startsWith('Arrow')) { e.preventDefault(); const d = e.shiftKey ? 10 : 1; ed.nudge(e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0); } };
  document.addEventListener('keydown', S.keyH);
}
const L = () => app.querySelector('.lp'), C = () => app.querySelector('.cp'), R = () => app.querySelector('.rp');

// 되돌리기(문서 전체 · 올린 그림은 @kv 로 한 번만)
function commit() { const doc = S.doc; if (!doc) return; const s = serialize(doc); if (s === S.snap) return; S.undo.push(S.snap); if (S.undo.length > 60) S.undo.shift(); S.redo = []; S.snap = s; const st = top.querySelector('[data-state]'); if (st) st.textContent = '저장 중…'; clearTimeout(S.saveT); S.saveT = setTimeout(() => { saveDoc(doc); if (st) st.textContent = '저장됨'; }, 700); }
function restore(s) { const doc = S.doc; const o = hydrate(JSON.parse(s)); for (const k of Object.keys(doc)) delete doc[k]; Object.assign(doc, o); S.snap = s; saveDoc(doc); if (S.ed) { const keep = S.ed.sel.slice(); rebindBig(); S.ed.render(); S.ed.select(keep.filter(x => findNode(S.ed.page, x)), { silent: true }); } if (S.sel && !pageOf(doc).children.find(f => f.id === S.sel)) S.sel = null; renderLeft(); renderCenter(); renderRight(); }
function undo() { if (!S.doc) return; if (!S.undo.length) return toast('되돌릴 게 없어요'); S.redo.push(S.snap); restore(S.undo.pop()); }
function redo() { if (!S.doc || !S.redo.length) return; S.undo.push(S.snap); restore(S.redo.pop()); }
// 프레임 하나 · 전부 다시 그리기(카드 썸네일 + 오른쪽 미리보기 + 크게 보기 캔버스)
async function rethumb(f) { const doc = S.doc; const url = await thumbOf(f, 520); C().querySelectorAll(`[data-th="${f.id}"]`).forEach(im => { im.src = url; }); if (S.sel === f.id) { const pv = R().querySelector('[data-rpprev]'); if (pv) pv.src = await thumbOf(f, 760); } if (f === pageOf(doc).children[0]) { /* 인덱스 썸네일은 저장 때 */ } }
function rethumbAll() { for (const f of pageOf(S.doc).children) rethumb(f); }
function select(fid) { S.sel = fid; app.querySelector('.ws').classList.toggle('has-edit', !!fid); C().querySelectorAll('.fcard').forEach(c => c.setAttribute('aria-selected', String(c.dataset.f === fid))); renderRight(); }
const frameOfSel = () => S.doc && pageOf(S.doc).children.find(f => f.id === S.sel);

// ───────────── 왼쪽: 입력 ─────────────
function renderLeft() {
  const el = L(); const doc = S.doc; const d = S.draft; const f = doc ? doc.fields : d.fields; const isElev = S.tool === 'elevator'; const sc = el.scrollTop;
  const kv = doc ? (doc.kvSrc ?? kvImg(exById(doc.ex))) : (d.kvSrc ?? (d.exId ? kvImg(exById(d.exId)) : null)); const logo = (doc ? doc.logoSrc : d.logoSrc) ?? 'assets/midas-logo.png';
  const state = k => f[k] ? ((doc ? doc.src?.[k] : d.src[k]) === 'user' ? 'user' : 'read') : 'empty';
  const shown = ['client', 'hire', 'start', 'end', 'role', ...FIELDS.map(x => x[0]).filter(k => !['client', 'hire', 'start', 'end', 'role'].includes(k) && f[k])];
  const hidden = FIELDS.filter(x => !shown.includes(x[0]));
  const frow = ([k, label, t]) => `<div class="frow"><label for="f-${k}">${label}</label>${t === 'area' ? `<textarea class="in" id="f-${k}" data-f="${k}" rows="2" data-state="${state(k)}" placeholder="${label}">${esc(f[k] ?? '')}</textarea>` : `<input class="in" id="f-${k}" data-f="${k}" ${k === 'start' || k === 'end' ? 'type="date"' : ''} value="${esc(f[k] ?? '')}" data-state="${state(k)}" placeholder="${k === 'client' || k === 'hire' ? label + ' (꼭)' : label}">`}${['client', 'hire', 'start', 'end', 'role'].includes(k) ? '<span></span>' : `<button class="ib sm" data-fdel="${k}" title="칸 빼기">${I.x}</button>`}</div>`;
  const pal = doc ? palOf(doc) : null;
  el.innerHTML = `<div class="sec"><h3>${isElev ? '장면 내용' : '무엇을 만들까요'}<span class="grow"></span>${doc ? '<span class="t3 small" style="font-weight:500">고치면 바로 반영</span>' : ''}</h3>
      <div class="talk"><textarea data-prompt placeholder="${isElev ? '한 줄에 한 장면. 「제목 | 본문」 으로 적어요.\n예) 2025 하반기 신입 공채 | 9월 1일부터 21일까지' : '채용 광고를 말로 적어 주세요. 예) GS에너지 2025 상반기 신입 공채, 6월 20일부터 7월 2일까지 접수. 직무는 사업·재무'}">${esc(isElev ? (doc ? doc.scenes ?? '' : d.scenes) : (doc ? doc.prompt ?? '' : d.prompt))}</textarea>
        <div class="att" ${d.att.length ? '' : 'hidden'}>${d.att.map((a, i) => `<span class="achip">${a.src ? `<i style="background-image:url('${a.src}')"></i>` : I.clip}<span>${esc(a.name)}</span><button class="ib sm" data-att-x="${i}" aria-label="빼기">${I.x}</button></span>`).join('')}</div>
        <div class="bar"><button class="ib sm" data-attach title="파일 · 그림 붙이기">${I.clip}</button><input type="file" hidden data-file accept=".txt,.md,.pdf,.docx,.pptx,image/*" multiple><span class="t3 small">${isElev ? 'PPT 는 붙여 두면 2차에 읽어요' : '공고 · 브리프 · 키비주얼을 붙여도 돼요'}</span><span class="grow"></span><button class="btn sm ${doc ? '' : 'dark'}" data-read>${I.spark} ${doc ? (isElev ? '장면 다시 만들기' : '다시 읽기') : (isElev ? '장면 만들기' : '읽어서 만들기')}</button></div></div>
      ${!doc && !isElev ? `<div class="chips"><span class="t3 small" style="line-height:28px">예시로 채우기</span>${EXAMPLES.filter((e, i, a) => a.findIndex(x => x.fields.client === e.fields.client) === i).map(e => `<button class="chip" data-seed="${e.id}">${esc(e.fields.client)}</button>`).join('')}</div>` : ''}</div>
    ${isElev ? '' : `<div class="sec"><h3>읽은 값 <span class="t3 small" style="font-weight:500">점선 = 읽은 값, 확인해 주세요</span></h3>${FIELDS.filter(x => shown.includes(x[0])).map(frow).join('')}${hidden.length ? `<div><button class="btn sm ghost" data-fadd>${I.plus} 칸 추가</button></div>` : ''}</div>`}
    <div class="sec"><h3>키비주얼 · 로고</h3><div class="assets"><div class="asset" data-kv role="button" tabindex="0">${kv ? `<img src="${kv}" alt="">` : `<div style="aspect-ratio:16/10;display:grid;place-items:center;color:var(--tx3)">${I.img}</div>`}<span>${doc?.kvSrc || d.kvSrc ? '올린 키비주얼 · 바꾸기' : '키비주얼 올리기'}</span></div><div class="asset" data-logo role="button" tabindex="0"><img class="contain" src="${logo}" alt=""><span>${doc?.logoSrc || d.logoSrc ? '올린 로고 · 바꾸기' : '로고 · 기본(MIDAS)'}</span></div></div>
      ${!doc ? `<div class="chips">${EXAMPLES.map(e => `<button class="chip" data-exkv="${e.id}" aria-pressed="${!d.kvSrc && d.exId === e.id}">${esc(e.by)}</button>`).join('')}</div>` : `<label class="row small t2" style="gap:8px"><input type="checkbox" data-auto checked style="accent-color:var(--p);margin:0;width:16px;height:16px"> 그림을 바꾸면 지면 · 글자색도 자동으로</label>`}</div>
    ${isElev ? '' : `<div class="sec"><h3>매체<span class="grow"></span><span class="t3 small" style="font-weight:500">${SPECS.filter(s => (doc ? mediaOf(doc) : d.media).has(s.media)).length}종</span></h3><div class="chips">${MEDIA.map(m => `<button class="chip" data-m="${esc(m)}" aria-pressed="${(doc ? mediaOf(doc) : d.media).has(m)}">${esc(m)} ${countOf(m)}</button>`).join('')}</div><div class="row"><button class="btn sm ghost" data-mall="1">전부</button><button class="btn sm ghost" data-mall="0">해제</button><button class="btn sm ghost" data-mrec>자주 쓰는 3곳</button></div></div>`}
    ${doc ? `<div class="sec"><h3>스타일 <span class="t3 small" style="font-weight:500">전체 규격에</span></h3>
      <div class="theme"><span class="small t2" style="margin-right:2px">색</span>${[['auto', '그림에서 자동', `linear-gradient(135deg,${pal.accent},${pal.bg})`], ['light', '밝게', mix(pal.accent, '#FFFFFF', .85)], ['dark', '진하게', mix(pal.accent, '#000000', .72)], ['white', '흰 바탕', '#FFFFFF']].map(([k, l, c]) => `<button class="sw" data-theme="${k}" title="${l}" aria-label="${l}"><i style="background:${c}"></i></button>`).join('')}<span style="width:6px"></span><label class="row small t2" style="gap:4px" title="지면">지면<input type="color" class="sw" data-c="bg" value="${pal.bg}"></label><label class="row small t2" style="gap:4px" title="글자">글자<input type="color" class="sw" data-c="fg" value="${pal.fg}"></label><label class="row small t2" style="gap:4px" title="포인트">포인트<input type="color" class="sw" data-c="accent" value="${pal.accent}"></label></div>
      <div class="row"><span class="small t2">글꼴</span><select class="in" data-font style="height:34px;font-size:13px">${FONTS.map(([k]) => `<option value="${k}" ${(doc.font ?? 'Pretendard') === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
      ${isElev ? '' : `<div class="small t2" style="margin-top:4px">배치</div><div class="presets">${PRESETS.map(([k, l]) => `<button data-preset-all="${k}" title="${l}"><svg viewBox="0 0 64 44">${presetIcon(k)}</svg>${l}</button>`).join('')}</div>`}</div>` : ''}`;
  el.scrollTop = sc;
  // 말로 적기 · 붙이기
  const ta = el.querySelector('[data-prompt]'); ta.oninput = () => { if (isElev) { if (doc) doc.scenes = ta.value; else d.scenes = ta.value; } else { if (doc) doc.prompt = ta.value; else d.prompt = ta.value; } ta.style.height = 'auto'; ta.style.height = Math.min(200, ta.scrollHeight) + 'px'; };
  ta.onkeydown = e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); el.querySelector('[data-read]').click(); } };
  el.querySelector('[data-attach]').onclick = () => el.querySelector('[data-file]').click();
  el.querySelector('[data-file]').onchange = async e => { for (const file of e.target.files) { if (file.type.startsWith('image/')) { const src = await fileToDataUrl(file, 1600); await setKv(src); d.att.push({ name: '키비주얼 · ' + file.name, src, kv: true }); } else if (/\.(txt|md)$/i.test(file.name)) { const text = await file.text(); const cur = isElev ? (doc ? doc.scenes : d.scenes) : (doc ? doc.prompt : d.prompt); const next = (cur ? cur + '\n' : '') + text.trim(); if (isElev) { doc ? doc.scenes = next : d.scenes = next; } else { doc ? doc.prompt = next : d.prompt = next; } d.att.push({ name: file.name }); toast(`${file.name} 내용을 붙였어요 · 「${doc ? '다시 읽기' : '읽어서 만들기'}」`); } else { d.att.push({ name: file.name }); toast(`${file.name} 를 붙였어요 — PDF · 워드 · PPT 읽기는 app/ 파서 연결 뒤(2차)`); } } renderLeft(); };
  el.querySelectorAll('[data-att-x]').forEach(b => b.onclick = () => { const a = d.att.splice(+b.dataset.attX, 1)[0]; if (a?.kv && !doc) d.kvSrc = null; renderLeft(); });
  el.querySelector('[data-read]').onclick = () => { if (isElev) return doc ? rebuildScenes() : makeElev(); if (!doc) return makeAd(); const got = readPrompt(doc.prompt ?? ''); const keys = Object.keys(got).filter(k => got[k] && doc.src?.[k] !== 'user'); if (!keys.length) return toast('새로 읽어 낸 값이 없어요'); doc.src ??= {}; for (const k of keys) { doc.fields[k] = got[k]; doc.src[k] = 'read'; } afterFields(); renderLeft(); toast(`${keys.length}칸을 다시 읽었어요`); };
  el.querySelectorAll('[data-seed]').forEach(b => b.onclick = () => { const ex = exById(b.dataset.seed); d.fields = { ...ex.fields }; d.src = Object.fromEntries(Object.keys(ex.fields).map(k => [k, 'read'])); d.prompt = ex.prompt; d.exId = ex.id; renderLeft(); });
  // 읽은 값
  let ft; el.querySelectorAll('[data-f]').forEach(inp => { inp.oninput = () => { const k = inp.dataset.f; f[k] = inp.value; (doc ? (doc.src ??= {}) : d.src)[k] = 'user'; inp.dataset.state = state(k); if (!doc) return; clearTimeout(ft); ft = setTimeout(afterFields, 450); }; });
  el.querySelectorAll('[data-fdel]').forEach(b => b.onclick = () => { f[b.dataset.fdel] = ''; if (doc) afterFields(); renderLeft(); });
  const fadd = el.querySelector('[data-fadd]'); if (fadd) fadd.onclick = () => menu(fadd, hidden.map(([k, l]) => [l, () => { f[k] = f[k] || ' '; renderLeft(); const i = L().querySelector(`[data-f="${k}"]`); if (i) { i.value = ''; f[k] = ''; i.focus(); } }]));
  // 그림
  async function setKv(src) { if (doc) { const auto = el.querySelector('[data-auto]')?.checked ?? true; const p = await replaceKv(doc, src, auto); if (p) { setTextColorAll(doc, p.fg); fixContrast(doc); } refreshAll(); commit(); toast(p ? `그림에 맞춰 지면 ${p.bg} · 글자 ${p.fg}` : '키비주얼을 바꿨어요'); } else { d.kvSrc = src; d.exId = null; } }
  const kvEl = el.querySelector('[data-kv]'); kvEl.onclick = () => pickImage(async src => { await setKv(src); renderLeft(); }, 1600); kvEl.onkeydown = e => { if (e.key === 'Enter') kvEl.click(); };
  const lgEl = el.querySelector('[data-logo]'); lgEl.onclick = () => pickImage(src => { if (doc) { replaceLogo(doc, src); refreshAll(); commit(); } else d.logoSrc = src; renderLeft(); toast('로고를 바꿨어요'); }, 1200);
  el.querySelectorAll('[data-exkv]').forEach(b => b.onclick = () => { d.exId = b.dataset.exkv; d.kvSrc = null; renderLeft(); });
  // 매체
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const set = doc ? mediaOf(doc) : d.media; set.has(b.dataset.m) ? set.delete(b.dataset.m) : set.add(b.dataset.m); afterMedia(set); });
  el.querySelectorAll('[data-mall]').forEach(b => b.onclick = () => afterMedia(new Set(b.dataset.mall === '1' ? MEDIA : [])));
  const rec = el.querySelector('[data-mrec]'); if (rec) rec.onclick = () => afterMedia(new Set(MEDIA.slice(0, 3)));
  function afterMedia(set) { if (!doc) { d.media = set; renderLeft(); return; } if (!set.size) return toast('매체를 하나는 두세요'); const r = syncMedia(doc, set); if (S.sel && !pageOf(doc).children.find(x => x.id === S.sel)) S.sel = null; commit(); renderLeft(); renderCenter(); renderRight(); toast(`규격 ${r.added}개 추가 · ${r.removed}개 뺌`); }
  // 스타일
  if (doc) {
    el.querySelectorAll('[data-theme]').forEach(b => b.onclick = async () => { const ok = await applyTheme(doc, b.dataset.theme); if (!ok) return toast('그림에서 색을 못 읽었어요'); refreshAll(); commit(); renderLeft(); });
    el.querySelectorAll('[data-c]').forEach(c => c.onchange = async () => { await applyTheme(doc, 'custom', { [c.dataset.c]: c.value.toUpperCase() }); refreshAll(); commit(); renderLeft(); });
    el.querySelector('[data-font]').onchange = e => { setFontAll(doc, e.target.value); for (const fr of pageOf(doc).children) for (const n of fr.children) if (n.type === 'text') fitTextHeight(n); refreshAll(); commit(); };
    el.querySelectorAll('[data-preset-all]').forEach(b => b.onclick = () => { for (const fr of pageOf(doc).children) applyPreset(doc, fr, b.dataset.presetAll); refreshAll(); commit(); toast(`모든 규격을 「${PRESETS.find(p => p[0] === b.dataset.presetAll)[1]}」 배치로`); });
  }
}
const mediaOf = doc => new Set(pageOf(doc).children.map(f => f.media).filter(m => MEDIA.includes(m)));
function afterFields() { const doc = S.doc; applyFieldsToText(doc); for (const fr of pageOf(doc).children) for (const n of fr.children) if (n.type === 'text') fitTextHeight(n); if (S.tool === 'ad' && doc.fields.client && doc.fields.hire) { doc.name = `${doc.fields.client} ${doc.fields.hire}`; const t = top.querySelector('[data-title]'); if (t) t.value = doc.name; renameDocIndex(doc); } refreshAll(); commit(); }
function refreshAll() { if (S.ed) { rebindBig(); S.ed.render(); S.ed.select(S.ed.sel.filter(x => findNode(S.ed.page, x)), { silent: true }); } rethumbAll(); renderRight(); }
function presetIcon(k) { return { auto: '<rect x="4" y="4" width="56" height="36" rx="3" fill="#E8F0FF"/><rect x="8" y="10" width="22" height="5" rx="1" fill="#2F6FE6"/><rect x="8" y="18" width="16" height="3" rx="1" fill="#9AA1AC"/><rect x="32" y="16" width="26" height="22" rx="2" fill="#B9CCF5"/>', left: '<rect x="4" y="4" width="56" height="36" rx="3" fill="#E8F0FF"/><rect x="8" y="16" width="20" height="5" rx="1" fill="#2F6FE6"/><rect x="8" y="24" width="14" height="3" rx="1" fill="#9AA1AC"/><rect x="32" y="4" width="28" height="36" rx="2" fill="#B9CCF5"/>', top: '<rect x="4" y="4" width="56" height="36" rx="3" fill="#E8F0FF"/><rect x="8" y="9" width="28" height="5" rx="1" fill="#2F6FE6"/><rect x="8" y="17" width="18" height="3" rx="1" fill="#9AA1AC"/><rect x="4" y="24" width="56" height="16" rx="2" fill="#B9CCF5"/>', overlay: '<rect x="4" y="4" width="56" height="36" rx="3" fill="#7F9BD8"/><rect x="18" y="17" width="28" height="5" rx="1" fill="#fff"/><rect x="24" y="25" width="16" height="3" rx="1" fill="#E8F0FF"/>' }[k]; }

// 만들기
function showLoading(title) {
  C().innerHTML = `<div class="card loadbox"><img src="assets/midas-logo.png" alt="" width="80" style="opacity:.9"><h2 class="sec" style="margin-top:16px">${esc(title)}</h2><div class="bar"><i data-prog></i></div><p class="t2" data-note>준비 중…</p></div>`;
  const bar = C().querySelector('[data-prog]'), note = C().querySelector('[data-note]'); const steps = [[.15, '내용을 읽는 중…'], [.4, '그림 색을 뽑는 중…'], [.7, '규격마다 그리는 중…'], [.9, '가이드로 검수하는 중…'], [1, '거의 다 됐어요']]; let i = 0;
  return new Promise(res => { const tick = () => { if (!bar.isConnected) return res(); const [p, m] = steps[i]; bar.style.width = p * 100 + '%'; note.textContent = m; if (++i < steps.length) setTimeout(tick, 260); else setTimeout(res, 200); }; setTimeout(tick, 80); });
}
async function makeAd() {
  const d = S.draft; const got = readPrompt(d.prompt); for (const k of Object.keys(got)) if (got[k] && d.src[k] !== 'user' && !d.fields[k]) { d.fields[k] = got[k]; d.src[k] = 'read'; }
  if (!d.exId && /마이다스|midas/i.test(d.prompt + (d.fields.client ?? ''))) d.exId = 'midas-3d';
  const f = { ...Object.fromEntries(FIELDS.map(([k]) => [k, ''])), ...d.fields };
  if (!(f.client?.trim() && f.hire?.trim())) { renderLeft(); const miss = f.client?.trim() ? 'hire' : 'client'; L().querySelector(`[data-f="${miss}"]`)?.focus(); return toast(`${miss === 'client' ? '고객사' : '채용 구분'}를 적어 주세요 — 말에서 못 읽었어요`); }
  if (!d.media.size) return toast('매체를 하나는 고르세요');
  const exId = d.exId ?? 'gs-illust'; const specIds = SPECS.filter(s => d.media.has(s.media)).map(s => s.id);
  const wait = showLoading(`${f.client} ${f.hire} · ${specIds.length}종을 그리는 중`);
  const doc = newDoc({ exId, fields: f, prompt: d.prompt, specIds, name: `${f.client} ${f.hire}` }); doc.src = { ...d.src };
  if (d.kvSrc) await replaceKv(doc, d.kvSrc, true); else { const p = await paletteFromImage(kvImg(exById(exId))); if (p && !d.exId) applyPalette(doc, p); }
  if (d.logoSrc) replaceLogo(doc, d.logoSrc); setTextColorAll(doc, palOf(doc).fg); fixContrast(doc);
  await wait; await saveWithThumb(doc); resetDraft(); S.doc = doc; S.undo = []; S.redo = []; S.snap = serialize(doc); go('#/ad/' + doc.id); toast(`규격 ${pageOf(doc).children.length}개를 그렸어요 · 누르면 오른쪽에서 고쳐요`);
}
const sceneLines = s => String(s ?? '').split('\n').map(x => x.trim()).filter(Boolean);
async function makeElev() {
  const d = S.draft; const lines = sceneLines(d.scenes); if (!lines.length) { L().querySelector('[data-prompt]').focus(); return toast('장면을 한 줄 이상 적어 주세요'); }
  const wait = showLoading(`장면 ${lines.length}개를 그리는 중`);
  const exId = d.exId ?? 'midas-3d'; const doc = newDoc({ exId, specIds: [], name: lines[0].split('|')[0].trim() || '엘리베이터 콘텐츠' }); doc.tool = 'elevator'; doc.scenes = d.scenes; doc.prompt = '';
  if (d.kvSrc) { doc.kvSrc = d.kvSrc; const p = await paletteFromImage(d.kvSrc); if (p) applyPalette(doc, p); } if (d.logoSrc) doc.logoSrc = d.logoSrc;
  pageOf(doc).children = lines.map((l, i) => buildScene(l, i, doc)); layoutBoard(pageOf(doc).children); fixContrast(doc);
  await wait; await saveWithThumb(doc); resetDraft(); S.doc = doc; S.undo = []; S.redo = []; S.snap = serialize(doc); go('#/elev/' + doc.id); toast(`장면 ${lines.length}개를 그렸어요`);
}
function rebuildScenes() { const doc = S.doc; const lines = sceneLines(doc.scenes); if (!lines.length) return toast('장면을 한 줄 이상 적어 주세요'); const page = pageOf(doc); const old = page.children; page.children = lines.map((l, i) => { const prev = old[i]; const nf = buildScene(l, i, doc); if (prev) { nf.id = prev.id; const pk = prev.children.find(c => c.name === '키비주얼'), nk = nf.children.find(c => c.name === '키비주얼'); if (pk && nk) nk.fills[0].src = pk.fills[0].src; } return nf; }); layoutBoard(page.children); fixContrast(doc); if (S.sel && !page.children.find(f => f.id === S.sel)) S.sel = null; commit(); renderCenter(); renderRight(); toast(`장면 ${lines.length}개를 다시 그렸어요`); }

// ───────────── 가운데: 결과 ─────────────
function renderCenter() {
  const el = C(); const doc = S.doc; const isElev = S.tool === 'elevator';
  if (!doc) { el.innerHTML = `<div class="cempty"><div class="box"><span class="ico">${I[isElev ? 'elev' : 'ad']}</span><b>${isElev ? '왼쪽에 장면을 적으면 여기 생겨요' : '왼쪽에 적거나 붙이면 여기 생겨요'}</b><span>${isElev ? '한 줄에 한 장면. 그림을 올리면 색도 맞춰요.' : '회사 이름과 채용 구분만 있으면 고른 매체 규격을 전부 그려요. 만든 뒤 하나를 누르면 오른쪽에서 고칠 수 있어요.'}</span>${isElev ? '' : '<a class="btn sm ghost" href="#/ad/__demo" data-demo>예시로 먼저 보기</a>'}</div></div>`; const dm = el.querySelector('[data-demo]'); if (dm) dm.onclick = e => { e.preventDefault(); const ex = exById('gs-illust'); S.draft.fields = { ...ex.fields }; S.draft.src = Object.fromEntries(Object.keys(ex.fields).map(k => [k, 'read'])); S.draft.prompt = ex.prompt; S.draft.exId = ex.id; makeAd(); }; return; }
  if (S.big) return;
  const page = pageOf(doc); const frames = page.children; const issues = new Map(frames.map(f => [f.id, checkFrame(f)])); const bad = [...issues.values()].filter(x => x.length).length;
  const groups = new Map(); for (const f of frames) { const m = f.media ?? '기타'; if (!groups.has(m)) groups.set(m, []); groups.get(m).push(f); }
  const sc = el.scrollTop;
  el.innerHTML = `<div class="cphead"><h2>${isElev ? '장면' : '결과'}</h2><span class="tag grey">${frames.length}${isElev ? '장면' : '규격'}</span>${bad ? `<span class="tag warn" title="글자 겹침 · 대비 · 크기 검수">확인 필요 ${bad}</span>` : '<span class="tag ok">검수 통과</span>'}<span class="grow"></span><span class="t3 small">한 번 누르면 오른쪽에서 고치고, 두 번 누르면 크게 봐요</span></div>
    ${[...groups].map(([m, list]) => `<div class="mediasec"><h3>${esc(m)}<span class="tag grey">${list.length}</span><span class="grow"></span><button class="btn sm ghost" data-zip-media="${esc(m)}">${I.dl} ${esc(m)}만 ZIP</button></h3><div class="fgrid${isElev ? ' wide' : ''}">${list.map(f => { const iss = issues.get(f.id); return `<div class="card fcard" data-f="${f.id}" aria-selected="${S.sel === f.id}" tabindex="0"><input type="checkbox" class="chk" data-chk="${f.id}" ${S.zipSel.has(f.id) ? 'checked' : ''} aria-label="${esc(f.name)} 선택">${iss.length ? `<span class="tag warn flag" title="${esc(iss.map(i => i.msg).join('\n'))}">확인 ${iss.length}</span>` : ''}<div class="pv"><img alt="${esc(f.name)}" data-th="${f.id}" style="${f.w >= f.h ? 'width:100%' : 'height:100%'}"></div><button class="ib bigb" data-big="${f.id}" title="크게 보기 · 끌어서 편집">${I.big}</button><div class="bd"><span class="grow"><span class="nm" title="${esc(f.name)}">${esc(f.name)}</span><small>${f.w} × ${f.h}</small></span></div></div>`; }).join('')}</div></div>`).join('')}
    <div class="selbar" data-selbar ${S.zipSel.size ? '' : 'hidden'}><div><span data-selcount>${S.zipSel.size}개 선택</span><button class="btn pri sm" data-zip-sel>${I.dl} 선택 내려받기</button><button class="btn ghost sm" data-sel-clear>해제</button></div></div>`;
  el.scrollTop = sc;
  const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { const im = e.target; io.unobserve(im); const f = frames.find(x => x.id === im.dataset.th); if (f) thumbOf(f, 520).then(u => { im.src = u; }); } }, { root: el, rootMargin: '400px' });
  el.querySelectorAll('[data-th]').forEach(im => io.observe(im));
  el.querySelectorAll('.fcard').forEach(c => { c.onclick = e => { if (e.target.closest('.chk, [data-big]')) return; select(S.sel === c.dataset.f ? null : c.dataset.f); }; c.ondblclick = e => { if (e.target.closest('.chk')) return; openBig(c.dataset.f); }; c.onkeydown = e => { if (e.key === 'Enter') select(c.dataset.f); }; });
  el.querySelectorAll('[data-big]').forEach(b => b.onclick = e => { e.stopPropagation(); openBig(b.dataset.big); });
  el.querySelectorAll('[data-chk]').forEach(c => c.onchange = () => { c.checked ? S.zipSel.add(c.dataset.chk) : S.zipSel.delete(c.dataset.chk); const bar = el.querySelector('[data-selbar]'); bar.hidden = !S.zipSel.size; el.querySelector('[data-selcount]').textContent = `${S.zipSel.size}개 선택`; });
  el.querySelectorAll('[data-zip-media]').forEach(b => b.onclick = () => zip(frames.filter(f => (f.media ?? '기타') === b.dataset.zipMedia), b.dataset.zipMedia));
  el.querySelector('[data-zip-sel]').onclick = () => zip(frames.filter(f => S.zipSel.has(f.id)), '선택');
  el.querySelector('[data-sel-clear]').onclick = () => { S.zipSel.clear(); renderCenter(); };
}
async function zip(list, label) { if (!list.length) return toast('내보낼 규격이 없어요'); toast(`${list.length}개 그리는 중…`); try { await exportZip(list, { scale: 1, name: `${S.doc.name}_${label}` }); toast('내려받았어요'); } catch (e) { console.error(e); toast('내보내기 실패: ' + e.message); } }
function openExport() {
  const doc = S.doc; if (!doc) return; const frames = pageOf(doc).children; const cur = frameOfSel(); const sel = frames.filter(f => S.zipSel.has(f.id));
  modal('내보내기', `<label class="opt"><input type="radio" name="sc" value="all" checked><span><b>전체</b><small>${frames.length}개 · 매체별 폴더 ZIP</small></span></label><label class="opt"><input type="radio" name="sc" value="sel" ${sel.length ? '' : 'disabled'}><span><b>체크한 것</b><small>${sel.length}개</small></span></label><label class="opt"><input type="radio" name="sc" value="cur" ${cur ? '' : 'disabled'}><span><b>지금 고치는 규격만 PNG</b><small>${cur ? esc(cur.name) : '고르는 중인 규격 없음'}</small></span></label><div class="row small t2" style="margin-top:4px">배율 <select class="in" name="k" style="width:auto;height:32px"><option value="1">1x</option><option value="2">2x</option><option value="3">3x</option></select></div>`,
    [{ label: '취소' }, { label: '내보내기', pri: true, run: async () => { const box = $('modalBox'); const sc = box.querySelector('[name="sc"]:checked').value, k = +box.querySelector('[name="k"]').value; if (sc === 'cur') return download(await framePng(cur, k), `${safe(cur.name)}_${cur.w}x${cur.h}.png`); const list = sc === 'sel' ? sel : frames; toast(`${list.length}개 그리는 중…`); try { await exportZip(list, { scale: k, name: `${doc.name}_${sc === 'sel' ? '선택' : '전체'}` }); toast('내려받았어요'); } catch (e) { toast('내보내기 실패: ' + e.message); } } }]);
}

// ───────────── 크게 보기(한 규격 · 끌기 · 핸들) ─────────────
function openBig(fid) { if (!S.doc) return; S.sel = fid; S.big = true; app.querySelector('.ws').classList.add('has-edit'); renderBig(); renderRight(); }
function rebindBig() { if (!S.ed) return; const f = frameOfSel(); if (!f) return leaveBig(true); S.shadow.pages[0].children[0] = f; }
function leaveBig(rerender = false) { if (S.ed) { S.ro?.disconnect(); S.ed = null; S.shadow = null; } S.big = false; if (rerender && S.doc) { renderCenter(); renderRight(); } }
function renderBig() {
  const doc = S.doc; const f = frameOfSel(); if (!f) return leaveBig(true); const page = pageOf(doc); const i = page.children.indexOf(f); const prev = page.children[i - 1], next = page.children[i + 1]; const el = C();
  el.innerHTML = `<div class="bighead"><button class="btn sm ghost" data-back>${I.back} 목록으로</button><span class="nm">${esc(f.name)}</span><span class="sz">${f.w} × ${f.h}</span><span class="row" style="gap:0"><button class="ib" data-prev ${prev ? '' : 'disabled'} title="이전">${I.back}</button><button class="ib" data-next ${next ? '' : 'disabled'} title="다음">${I.fwd}</button></span><span class="grow"></span><span class="t3 small">끌어서 옮기고 모서리 점으로 크기 · 글자는 두 번 눌러 고쳐요 · <span class="kbd">Esc</span> 목록</span><button class="btn sm" data-png>${I.dl} PNG</button></div><div class="stage"><div class="cvhost"></div><div class="selbox" data-selbox hidden></div></div>`;
  el.querySelector('[data-back]').onclick = () => leaveBig(true); el.querySelector('[data-prev]').onclick = () => { leaveBig(); openBig(prev.id); }; el.querySelector('[data-next]').onclick = () => { leaveBig(); openBig(next.id); };
  el.querySelector('[data-png]').onclick = async () => download(await framePng(f, 1), `${safe(f.name)}_${f.w}x${f.h}.png`);
  const shadow = { pages: [{ id: 'sp', name: '규격', bg: 'transparent', children: [f] }], pageId: 'sp', get font() { return doc.font; } }; S.shadow = shadow;
  const ed = new Editor(el.querySelector('.cvhost'), shadow, { select: () => syncSelBox(), commit: () => { commit(); rethumb(f); }, change: () => renderRight(), live: () => {}, zoom: () => {}, tool: () => {}, rename: () => {} });
  ed.showRulers = false; ed.showCoords = false; wireGlobal(ed); S.ed = ed;
  const orig = ed.pickFromEl.bind(ed); ed.pickFromEl = t => { const r = orig(t); return r === frameOfSel()?.id ? null : r; };
  const fit = () => ed.zoomTo([frameOfSel()?.id].filter(Boolean)); requestAnimationFrame(fit); S.ro = new ResizeObserver(fit); S.ro.observe(el.querySelector('.stage'));
}
function syncSelBox() {
  const box = C().querySelector('[data-selbox]'); const ed = S.ed; if (!box || !ed) return; const ns = ed.selNodes(); const n = ns[0];
  R().querySelectorAll('.trow').forEach(r => r.setAttribute('aria-selected', String(ed.sel.includes(r.dataset.node))));
  if (!n) { box.hidden = true; return; }
  box.hidden = false; box.innerHTML = `<span>${esc(ns.length > 1 ? `${ns.length}개 선택` : n.name)}</span>${n.locked ? '<span class="tag grey" style="margin-left:6px">잠김</span>' : `<button class="ib" data-a="center" title="가운데로">${I.center}</button><button class="ib" data-a="front" title="맨 앞으로">${I.front}</button><button class="ib" data-a="back" title="맨 뒤로">${I.backw}</button><button class="ib" data-a="dup" title="복제 (⌘D)">${I.copy}</button><button class="ib" data-a="delete" title="삭제 (⌫)">${I.trash}</button>`}`;
  box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a));
  R().querySelector(`.trow[data-node="${n.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); renderFine();
}
function act(k) {
  const ed = S.ed; if (!ed) return; const f = frameOfSel(); const ns = ed.selNodes().filter(n => !n.locked); if (!ns.length) return;
  const refreshAllBig = () => { ed.render(); ed.select(ed.sel.filter(x => findNode(ed.page, x)), { silent: true }); };
  if (k === 'delete') { for (const n of ns) removeNode(ed.page, n.id); ed.select([], { silent: true }); refreshAllBig(); }
  else if (k === 'dup') { const ids = []; for (const n of ns) { const p = parentOf(ed.page, n.id); const list = p === ed.page ? f.children : p.children; const c = cloneNode(n); c.x += Math.round(f.w * .03); c.y += Math.round(f.h * .03); list.splice(list.indexOf(n) + 1, 0, c); ids.push(c.id); } refreshAllBig(); ed.select(ids); }
  else if (k === 'center') { ed.align('c'); ed.align('m'); return; }
  else if (k === 'front' || k === 'back') { for (const n of ns) { const p = parentOf(ed.page, n.id); const list = p === ed.page ? f.children : p.children; list.splice(list.indexOf(n), 1); k === 'front' ? list.push(n) : list.splice(1, 0, n); } refreshAllBig(); }
  commit(); rethumb(f); renderRight(); syncSelBox();
}

// ───────────── 오른쪽: 편집 패널(글 · 그림 · 배경 · 배치 · 세부) ─────────────
function renderRight() {
  const el = R(); const doc = S.doc; const f = frameOfSel();
  if (!doc || !f) { el.innerHTML = ''; app.querySelector('.ws')?.classList.remove('has-edit'); return; }
  const sc = el.scrollTop; const pal = palOf(doc); const ed = S.ed; const selIds = ed ? ed.sel : [];
  const texts = []; walk(f.children, n => { if (n.type === 'text' && n.visible !== false) texts.push(n); });
  const kv = f.children.find(c => c.name === '키비주얼' && c.type === 'image'); const logo = f.children.find(c => c.name === '로고'); const bgN = f.children.find(c => c.name === '배경');
  const bgColor = bgN?.fills?.[0]?.color ?? f.fills?.[0]?.color ?? '#FFFFFF';
  const sw = (cols, cur, attr) => `<div class="swatches">${[...new Set(cols)].map(c => `<button data-${attr}="${c}" aria-pressed="${c.toUpperCase() === (cur ?? '').toUpperCase()}" style="background:${c}" title="${c}"></button>`).join('')}<input type="color" class="sw" data-${attr}-pick value="${/^#[0-9a-f]{6}$/i.test(cur ?? '') ? cur : '#000000'}" title="직접 고르기"></div>`;
  const textCols = [pal.fg, pal.accent, '#FFFFFF', '#1E1E1E'];
  el.innerHTML = `<div class="rphead"><span class="grow" style="min-width:0"><span class="nm">${esc(f.name)}</span><small>${f.w} × ${f.h} · ${esc(f.media ?? '')}</small></span>${S.big ? '' : `<button class="btn sm" data-open-big title="크게 보고 끌어서 편집">${I.big} 크게</button>`}<button class="ib" data-close aria-label="닫기">${I.x}</button></div>
    <div class="rpbody">${S.big ? '' : `<div class="rpprev" data-open-big2 title="크게 보기"><img data-rpprev alt=""></div>`}
      <div class="ecard"><h4>${I.pen} 글<span class="t3">${texts.length}개</span></h4>${texts.map(t => `<div class="trow" data-node="${t.id}" aria-selected="${selIds.includes(t.id)}"><div class="nm">${esc(t.name)}<span class="t3">${t.text.size}px</span><button class="ib sm" data-del="${t.id}" title="이 글 지우기">${I.trash}</button></div><textarea data-tx="${t.id}" rows="${Math.min(4, t.text.content.split('\n').length)}" aria-label="${esc(t.name)} 내용">${esc(t.text.content)}</textarea>
        <div class="ctl"><span class="stepn"><button data-sz="${t.id}" data-d="-1" title="작게">−</button><input data-szin="${t.id}" value="${t.text.size}" aria-label="글자 크기"><button data-sz="${t.id}" data-d="1" title="크게">+</button></span><button class="tbtn" data-bold="${t.id}" aria-pressed="${t.text.weight >= 700}" title="굵게"><b>B</b></button><span class="row" style="gap:2px">${[['left', I.al], ['center', I.ac], ['right', I.ar]].map(([a, i]) => `<button class="tbtn" data-al="${t.id}" data-v="${a}" aria-pressed="${t.text.align === a}">${i}</button>`).join('')}</span></div>
        <div class="ctl">${sw(textCols, t.fills[0]?.color, `tc-${t.id}`)}</div></div>`).join('')}<button class="btn sm" data-add-text style="width:100%">${I.plus} 글 추가</button></div>
      <div class="ecard"><h4>${I.img} 그림</h4>${kv ? `<div class="kvrow"><img src="${kv.fills[0]?.src ?? ''}" alt=""><div class="acts"><b class="small">키비주얼</b><span class="row" style="gap:5px;flex-wrap:wrap"><button class="btn sm" data-kv="one">이 규격만</button><button class="btn sm" data-kv="all">전부 바꾸기</button></span></div></div>
        <div class="row" style="margin-top:9px;gap:5px;flex-wrap:wrap"><span class="t2 small">맞춤</span><button class="tbtn" data-fit="cover" aria-pressed="${(kv.fills[0]?.fit ?? 'cover') === 'cover'}">꽉 채우기</button><button class="tbtn" data-fit="contain" aria-pressed="${kv.fills[0]?.fit === 'contain'}">다 보이게</button><span class="grow"></span><button class="btn sm ghost" data-autopal>${I.spark} 그림 색으로 전체</button></div>` : '<p class="t2 small">이 규격엔 키비주얼이 없어요.</p>'}
        <div class="hr"></div>${logo ? `<div class="kvrow"><img src="${logo.fills[0]?.src ?? ''}" alt="" style="object-fit:contain;background:#fff;border:1px solid var(--ln)"><div class="acts"><b class="small">로고</b><span class="row" style="gap:5px"><button class="btn sm" data-logo>바꾸기(전체)</button></span></div><div class="corner" title="위치">${[['nw', '왼쪽 위'], ['ne', '오른쪽 위'], ['sw', '왼쪽 아래'], ['se', '오른쪽 아래']].map(([k, l]) => `<button data-corner="${k}" aria-label="${l}" aria-pressed="${cornerOf(f, logo) === k}"></button>`).join('')}</div></div><label class="row small" style="margin-top:9px;gap:8px"><span class="t2">크기</span><input type="range" data-logosz min="${Math.max(10, Math.round(Math.min(f.w, f.h) * .03))}" max="${Math.round(Math.min(f.w, f.h) * .25)}" value="${Math.round(logo.h)}"></label>` : `<button class="btn sm" data-add-logo>${I.plus} 로고 넣기</button>`}</div>
      <div class="ecard"><h4>배경</h4>${sw([pal.bg, ...(pal.brand ?? []), '#FFFFFF', '#1E1E1E'], bgColor, 'bg')}<div class="row" style="margin-top:9px;gap:6px"><button class="btn sm" data-bg-all>모든 규격에 이 배경</button><span class="t3 small">${bgColor}</span></div></div>
      ${S.tool === 'elevator' ? '' : `<div class="ecard"><h4>${I.grid} 배치<span class="t3">이 규격</span></h4><div class="presets">${PRESETS.map(([k, l]) => `<button data-preset="${k}" aria-pressed="${(f.preset ?? 'auto') === k}"><svg viewBox="0 0 64 44">${presetIcon(k)}</svg>${l}</button>`).join('')}</div></div>`}
      <details class="fine" ${S.big && selIds.length ? 'open' : ''}><summary>세부 조정<span class="t3 small" style="font-weight:500;margin-left:auto">위치 · 크기 · 불투명 · 회전</span></summary><div class="body" data-fine></div></details>
      <div class="row small t2" style="justify-content:space-between"><button class="btn sm ghost" data-png>${I.dl} 이 규격 PNG</button><a class="btn sm ghost" href="pro.html#doc=${doc.id}&f=${f.id}">전문가 편집기에서 ↗</a></div></div>`;
  el.scrollTop = sc;
  if (!S.big) thumbOf(f, 760).then(u => { const im = el.querySelector('[data-rpprev]'); if (im) im.src = u; });
  el.querySelector('[data-close]').onclick = () => { if (S.big) leaveBig(true); select(null); };
  el.querySelectorAll('[data-open-big], [data-open-big2]').forEach(b => b.onclick = () => openBig(f.id));
  el.querySelector('[data-png]').onclick = async () => download(await framePng(f, 1), `${safe(f.name)}_${f.w}x${f.h}.png`);
  const refresh = n => { if (ed) ed.refresh(n.id); commit(); rethumb(f); };
  const refreshFrame = () => { if (ed) { ed.render(); ed.select(ed.sel.filter(x => findNode(ed.page, x)), { silent: true }); } commit(); rethumb(f); };
  el.querySelectorAll('.trow').forEach(r => r.addEventListener('pointerdown', e => { if (e.target.closest('button, input, textarea') || !ed) return; ed.select([r.dataset.node]); }));
  let txT; el.querySelectorAll('[data-tx]').forEach(ta => { ta.onfocus = () => { if (ed) { ed.select([ta.dataset.tx], { silent: true }); syncSelBox(); } }; ta.oninput = () => { const n = findNode({ children: f.children }, ta.dataset.tx) ?? texts.find(t => t.id === ta.dataset.tx); n.text.content = ta.value; fitTextHeight(n); if (ed) ed.refresh(n.id); clearTimeout(txT); txT = setTimeout(() => { commit(); rethumb(f); }, 400); }; });
  const tById = id => texts.find(t => t.id === id);
  el.querySelectorAll('[data-sz]').forEach(b => b.onclick = () => { const n = tById(b.dataset.sz); const step = n.text.size >= 40 ? 4 : 2; n.text.size = clamp(n.text.size + +b.dataset.d * step, 6, 400); fitTextHeight(n); refresh(n); renderRight(); });
  el.querySelectorAll('[data-szin]').forEach(i => i.onchange = () => { const n = tById(i.dataset.szin); n.text.size = clamp(+i.value || n.text.size, 6, 400); fitTextHeight(n); refresh(n); renderRight(); });
  el.querySelectorAll('[data-bold]').forEach(b => b.onclick = () => { const n = tById(b.dataset.bold); n.text.weight = n.text.weight >= 700 ? 500 : 700; refresh(n); b.setAttribute('aria-pressed', String(n.text.weight >= 700)); });
  el.querySelectorAll('[data-al]').forEach(b => b.onclick = () => { const n = tById(b.dataset.al); n.text.align = b.dataset.v; refresh(n); renderRight(); });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { removeNode({ children: f.children }, b.dataset.del); if (ed) ed.select([], { silent: true }); refreshFrame(); renderRight(); });
  for (const t of texts) { el.querySelectorAll(`[data-tc-${t.id}]`).forEach(b => b.onclick = () => setColor(t, b.getAttribute(`data-tc-${t.id}`))); const pk = el.querySelector(`[data-tc-${t.id}-pick]`); if (pk) pk.oninput = () => setColor(t, pk.value.toUpperCase()); }
  function setColor(t, c) { if (!t.fills[0]) t.fills[0] = solid(c); t.fills[0].color = c; refresh(t); renderRight(); }
  el.querySelector('[data-add-text]').onclick = () => { const pad = clamp(Math.round(Math.min(f.w, f.h) * .08), 8, 80); const base = texts[0]?.text.size ?? Math.round(Math.min(f.w, f.h) * .08); const sz = Math.max(11, Math.round(base * .5)); const t = node('text', { name: '글 ' + (texts.length + 1), x: pad, y: Math.round(f.h * .5), w: f.w - pad * 2, h: Math.round(sz * 1.25), fills: [solid(pal.fg)], text: { content: '새 글', size: sz, weight: 600, lineHeight: 1.25, letterSpacing: -0.01, align: 'left', valign: 'top', family: doc.font ?? 'Pretendard', auto: 'height' } }); f.children.push(t); refreshFrame(); if (ed) ed.select([t.id]); renderRight(); setTimeout(() => R().querySelector(`[data-tx="${t.id}"]`)?.focus(), 0); };
  if (kv) {
    el.querySelectorAll('[data-kv]').forEach(b => b.onclick = () => pickImage(async src => { if (b.dataset.kv === 'all') { const p = await replaceKv(doc, src, true); if (p) { setTextColorAll(doc, p.fg); fixContrast(doc); } refreshAll(); commit(); renderLeft(); toast(p ? `전체 규격의 그림과 색을 바꿨어요 (지면 ${p.bg})` : '전체 규격의 그림을 바꿨어요'); } else { kv.fills[0].src = src; refresh(kv); renderRight(); toast('이 규격의 그림만 바꿨어요'); } }, 1600));
    el.querySelectorAll('[data-fit]').forEach(b => b.onclick = () => { kv.fills[0].fit = b.dataset.fit; refresh(kv); renderRight(); });
    el.querySelector('[data-autopal]').onclick = async () => { const p = await paletteFromImage(kv.fills[0].src); if (!p) return toast('그림에서 색을 못 읽었어요'); applyPalette(doc, p); setTextColorAll(doc, p.fg); fixContrast(doc); refreshAll(); commit(); renderLeft(); toast(`지면 ${p.bg} · 글자 ${p.fg} · 포인트 ${p.accent}로 전체를 맞췄어요`); };
  }
  if (logo) {
    el.querySelector('[data-logo]').onclick = () => pickImage(src => { replaceLogo(doc, src); refreshAll(); commit(); renderLeft(); toast('전체 규격의 로고를 바꿨어요'); }, 1200);
    el.querySelectorAll('[data-corner]').forEach(b => b.onclick = () => { placeCorner(f, logo, b.dataset.corner); refresh(logo); renderRight(); });
    const rg = el.querySelector('[data-logosz]'); rg.oninput = () => { const k = cornerOf(f, logo); logo.h = +rg.value; logo.w = Math.round(logo.h * 1043 / 304); placeCorner(f, logo, k); if (ed) ed.refresh(logo.id); }; rg.onchange = () => { commit(); rethumb(f); };
  } else el.querySelector('[data-add-logo]').onclick = () => { const m = Math.min(f.w, f.h); const lh = clamp(Math.round(m * .075), 10, 56); const n = node('image', { name: '로고', w: Math.round(lh * 1043 / 304), h: lh, fills: [imageFill(doc.logoSrc ?? 'assets/midas-logo.png', 'contain')], constraints: { h: 'right', v: 'top' } }); placeCorner(f, n, 'ne'); f.children.push(n); refreshFrame(); renderRight(); };
  const setBg = c => { if (bgN) { bgN.fills[0] ? bgN.fills[0].color = c : bgN.fills.push(solid(c)); } if (f.fills[0]) f.fills[0].color = c; else f.fills.push(solid(c)); refreshFrame(); renderRight(); };
  el.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => setBg(b.dataset.bg)); el.querySelector('[data-bg-pick]').oninput = e => setBg(e.target.value.toUpperCase());
  el.querySelector('[data-bg-all]').onclick = () => { const p = palOf(doc); applyPalette(doc, { ...p, bg: bgColor, brand: [p.accent, bgColor, p.fg] }); for (const fr of pageOf(doc).children) { const b = fr.children.find(c => c.name === '배경'); if (b?.fills[0]) b.fills[0].color = bgColor; if (fr.fills[0]) fr.fills[0].color = bgColor; } fixContrast(doc); refreshAll(); commit(); renderLeft(); toast('모든 규격의 배경을 바꿨어요'); };
  el.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { applyPreset(doc, f, b.dataset.preset); refreshFrame(); renderRight(); });
  renderFine();
}
// 세부 조정: 크게 보기에서 고른 레이어의 위치 · 크기 · 불투명 · 모서리 · 회전(피그마식 패널의 핵심만)
function renderFine() {
  const box = R().querySelector('[data-fine]'); if (!box) return; const ed = S.ed; const f = frameOfSel(); const n = ed?.selNodes()[0];
  if (!S.big) { box.innerHTML = `<p class="t2 small">「크게」를 눌러 레이어를 고르면 위치 · 크기 · 불투명도 · 회전을 숫자로 맞출 수 있어요. 제약 · 효과 · 선 같은 세부는 <a href="pro.html#doc=${S.doc.id}&f=${f.id}">전문가 편집기</a>에서.</p>`; return; }
  if (!n) { box.innerHTML = '<p class="t2 small">캔버스에서 글이나 그림을 누르세요.</p>'; return; }
  box.innerHTML = `<div class="g4">${[['x', 'X', Math.round(n.x)], ['y', 'Y', Math.round(n.y)], ['w', 'W', Math.round(n.w)], ['h', 'H', Math.round(n.h)]].map(([k, l, v]) => `<label>${l}<input class="in" data-p="${k}" value="${v}" ${n.locked ? 'disabled' : ''}></label>`).join('')}</div><div class="g4">${[['opacity', '불투명 %', Math.round((n.opacity ?? 1) * 100)], ['radius', '모서리', n.radius ?? 0], ['rotation', '회전°', n.rotation ?? 0]].map(([k, l, v]) => `<label>${l}<input class="in" data-p="${k}" value="${v}" ${n.locked ? 'disabled' : ''}></label>`).join('')}<label>잠금<button class="tbtn" data-lock aria-pressed="${!!n.locked}" style="height:30px">${n.locked ? '잠김' : '풀림'}</button></label></div><a class="small" href="pro.html#doc=${S.doc.id}&f=${f.id}">제약 · 효과 · 선 · 혼합은 전문가 편집기에서 ↗</a>`;
  box.querySelectorAll('[data-p]').forEach(i => i.onchange = () => { const k = i.dataset.p; const v = parseFloat(i.value); if (isNaN(v)) return; if (k === 'opacity') n.opacity = clamp(v, 0, 100) / 100; else if (k === 'w' || k === 'h') n[k] = Math.max(1, v); else n[k] = v; ed.refresh(n.id); ed.updateOverlay(); commit(); rethumb(f); });
  box.querySelector('[data-lock]').onclick = () => { n.locked = !n.locked; ed.updateOverlay(); commit(); renderFine(); };
}

window.addEventListener('beforeunload', () => { if (S.doc) saveDoc(S.doc); });
window.studio = { S, go, select, openBig };
route();
