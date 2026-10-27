// 쉬운 모드 — 웹사이트형 입구. 홈 → 만들기 3단계(내용 · 그림 · 매체) → 결과 갤러리 → 간단 편집.
//   문서 모델 · 캔버스 · 내보내기는 피그마 편집기(app.js)와 같은 파일을 쓴다. 저장소도 같다(localStorage studio.*).
import { EXAMPLES, exById, kvImg, thumbImg, newDoc, loadIndex, loadDoc, saveDoc, deleteDoc, renameDocIndex, pageOf, findNode, parentOf, removeNode, cloneNode, node, imageFill, solid, uid, walk, SPECS, FIELDS, FONTS, clamp, paletteFromImage, applyPalette, replaceKv, replaceLogo, setFontAll, setTextColorAll, applyFieldsToText, buildFrame, shortName } from './doc.js';
import { Editor, wireGlobal } from './canvas.js';
import { checkFrame, fileToDataUrl } from './panel.js';
import { exportZip, framePng, download, renderFrame, thumbnail, safe, wrapText } from './export.js';

// 글 내용 · 크기를 바꾸면 줄 수에 맞춰 상자 높이를 늘린다(넘침 방지). 글꼴 측정은 내보내기와 같은 canvas2d
const mctx = document.createElement('canvas').getContext('2d');
function fitTextHeight(n) { const t = n.text; mctx.font = `${t.weight} ${t.size}px ${t.family}, Pretendard, sans-serif`; mctx.letterSpacing = `${(t.letterSpacing ?? 0) * t.size}px`; const lines = wrapText(mctx, t.content, t.auto === 'width' ? 1e9 : n.w); n.h = Math.max(Math.round(t.size * t.lineHeight), Math.round(lines.length * t.size * t.lineHeight)); }

const $ = id => document.getElementById(id);
const app = $('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`; };
const MEDIA = [...new Set(SPECS.map(s => s.media))];
const countOf = m => SPECS.filter(s => s.media === m).length;
const mix = (h, t, p) => { const v = parseInt(h.slice(1), 16), tv = parseInt(t.slice(1), 16); const ch = s => Math.round(((v >> s) & 255) * (1 - p) + ((tv >> s) & 255) * p); return '#' + [ch(16), ch(8), ch(0)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase(); };
const palOf = doc => doc.palette ?? exById(doc.ex).palette;
// 색을 한 번에 바꾼 뒤: 규격마다 배경과 글자 대비가 3:1 아래면 글자색을 팔레트 글자색 · 검정 · 흰색 중 가장 잘 보이는 것으로(따로 칠한 배경이 있는 규격 보호)
const lum = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return .5; const v = parseInt(m[1], 16); const c = [v >> 16, (v >> 8) & 255, v & 255].map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
function fixContrast(doc) {
  const pal = palOf(doc); let fixed = 0;
  for (const f of pageOf(doc).children) {
    if (f.preset === 'overlay') continue;
    const bg = f.children.find(c => c.name === '배경')?.fills?.[0]?.color ?? f.fills?.[0]?.color ?? '#FFFFFF';
    for (const t of f.children) { if (t.type !== 'text' || !t.fills[0]) continue; if (contrast(t.fills[0].color, bg) >= 3) continue; const best = [pal.fg, '#1E1E1E', '#FFFFFF'].sort((a, b) => contrast(b, bg) - contrast(a, bg))[0]; t.fills[0].color = best; fixed++; }
  }
  return fixed;
}
const S = (p, c = '') => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${c}">${p}</svg>`;
const I = {
  plus: S('<path d="M12 5v14M5 12h14"/>'), x: S('<path d="M6 6l12 12M18 6L6 18"/>'), back: S('<path d="M15 6l-6 6 6 6"/>'), fwd: S('<path d="M9 6l6 6-6 6"/>'),
  dl: S('<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>'), undo: S('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'), redo: S('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  trash: S('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'), check: S('<path d="M5 12l5 5L20 7"/>'), img: S('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/>'),
  up: S('<path d="M12 19V5M5 12l7-7 7 7"/>'), copy: S('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'), front: S('<path d="M12 4l6 6M12 4L6 10M12 4v16"/>'), backw: S('<path d="M12 20l6-6M12 20l-6-6M12 20V4"/>'),
  center: S('<path d="M12 3v18M5 8h14M7 16h10"/>'), edit: S('<path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4"/>'), pen: S('<path d="M12 20h9M16.5 3.5a2 2 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  al: S('<path d="M4 6h16M4 12h10M4 18h14"/>'), ac: S('<path d="M4 6h16M7 12h10M5 18h14"/>'), ar: S('<path d="M4 6h16M10 12h10M6 18h14"/>'), spark: S('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
  grid: S('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
};

// ── 공통 ──
let toastT; function toast(msg, act) { const t = $('toast'); t.innerHTML = esc(msg) + (act ? `<button data-act>${esc(act.label)}</button>` : ''); t.hidden = false; if (act) t.querySelector('[data-act]').onclick = () => { t.hidden = true; act.run(); }; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, act ? 7000 : 2800); }
function modal(title, body, actions) {
  $('modalBox').innerHTML = `<div class="mh"><span>${esc(title)}</span><span class="grow"></span><button class="ib" data-m="x" aria-label="닫기">${I.x}</button></div><div class="mb">${body}</div><div class="mf">${actions.map((a, i) => `<button class="btn${a.pri ? ' pri' : ''}" data-m="${i}">${esc(a.label)}</button>`).join('')}</div>`;
  $('modal').hidden = false; document.body.classList.add('lock');
  $('modalBox').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const a = actions[+b.dataset.m]; closeModal(); a?.run?.(); });
  $('modalBox').querySelector('.btn.pri, .btn')?.focus();
}
function closeModal() { $('modal').hidden = true; document.body.classList.remove('lock'); }
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
function pickImage(cb, max = 2000) { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = async () => { const f = inp.files[0]; if (!f) return; cb(await fileToDataUrl(f, max), f); }; inp.click(); }
function previewFrame(f) {
  const pv = document.createElement('div'); pv.className = 'preview'; pv.innerHTML = `<div class="bar"><b>${esc(f.name)}</b><span style="opacity:.7">${f.w}×${f.h}</span><span class="grow"></span><button class="ib" data-dl title="PNG 내려받기">${I.dl}</button><button class="ib" data-x aria-label="닫기">${I.x}</button></div><div class="st"></div>`;
  document.body.appendChild(pv); renderFrame(f, 1).then(c => pv.querySelector('.st').appendChild(c));
  pv.querySelector('[data-x]').onclick = () => pv.remove(); pv.querySelector('[data-dl]').onclick = async () => download(await framePng(f, 1), `${safe(f.name)}_${f.w}x${f.h}.png`);
  const k = e => { if (e.key === 'Escape') { pv.remove(); document.removeEventListener('keydown', k); } }; document.addEventListener('keydown', k);
}
async function saveWithThumb(doc) { const f = pageOf(doc).children[0]; let th = null; try { if (f) th = await thumbnail(f, 320); } catch { /* 없이 저장 */ } saveDoc(doc, th); }

// ── 라우터 ──
function go(h) { location.hash = h; }
function route() {
  const h = location.hash || '#/'; const [, a, b, c] = h.split('/');
  closeModal(); document.querySelectorAll('.preview').forEach(p => p.remove()); leaveEdit();
  document.querySelectorAll('#nav a').forEach(x => x.setAttribute('aria-current', x.dataset.r === (a === '' ? 'home' : a) ? 'page' : 'false'));
  $('proLink').href = a === 'doc' && b ? `./#doc=${b}` : a === 'edit' && b ? `./#doc=${b}&f=${c}` : './';
  window.scrollTo(0, 0);
  if (a === 'new') return renderWizard(b);
  if (a === 'make') return makeFromExample(b);
  if (a === 'doc' && b) return renderDoc(b);
  if (a === 'edit' && b && c) return renderEdit(b, c);
  if (a === 'mine') return renderHome(true);
  return renderHome(false);
}
window.addEventListener('hashchange', route);

// ───────────────────────── 홈 ─────────────────────────
function workCards(list) {
  return list.length ? `<div class="grid">${list.map(r => `<div class="card wcard" data-open="${r.id}" role="button" tabindex="0"><span class="th ${r.thumb ? '' : 'contain'}" style="background-image:url('${r.thumb ? r.thumb : thumbImg(exById(r.ex))}')"></span><div class="bd"><b>${esc(r.name)}</b><small>규격 ${r.frames ?? '?'}개 · ${ago(r.updatedAt)} 수정</small></div><button class="ib more" data-more="${r.id}" aria-label="더 보기">⋯</button></div>`).join('')}</div>`
    : `<div class="empty"><b>아직 만든 광고가 없어요</b><span>회사 이름과 접수 기간만 적으면 3분이면 돼요.</span><a class="btn pri" href="#/new">새로 만들기</a></div>`;
}
function renderHome(mine) {
  const idx = loadIndex();
  const hero = mine ? '' : `<div class="hero-box"><div><span class="tag blue">채용 광고 소재</span><h1 class="hero" style="margin-top:14px">채용 광고,<br>적고 올리면 바로 나와요</h1><p class="lead" style="margin-top:14px">회사 이름과 접수 기간만 적으면 매체 규격 ${SPECS.length}종을 한 번에 그려요.<br>디자인 도구를 몰라도 괜찮아요. 글과 그림은 나중에 바로 고칠 수 있어요.</p><div class="cta"><a class="btn pri big" href="#/new">새로 만들기</a><a class="btn big" href="#/make/gs-illust">예시로 먼저 보기</a></div></div>
    <div class="hero-art">${[['gs-illust', 'left:0;top:8%;width:62%;aspect-ratio:3/2'], ['midas-3d', 'right:0;top:0;width:44%;aspect-ratio:1'], ['midas-iso', 'right:6%;bottom:0;width:58%;aspect-ratio:16/9']].map(([id, st]) => `<img src="${thumbImg(exById(id))}" alt="" style="${st}">`).join('')}</div></div>
    <div class="steps3">${[['내용 적기', '회사 · 채용 구분 · 접수 기간을 빈칸에 넣어요. 말로 적어도 읽어서 채워요.'], ['그림 올리기', '키비주얼 한 장이면 지면 색과 글자색을 알아서 맞춰요. 없으면 예시 그림으로.'], ['받기 · 고치기', '매체별로 묶어 ZIP 으로 받아요. 마음에 안 드는 건 눌러서 바로 고쳐요.']].map(([t, d], i) => `<div class="card step3"><span class="n">${i + 1}</span><div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}</div>`;
  app.innerHTML = `<section class="page">${hero}
    <div class="sechead"><h2 class="sec">내 작업</h2><span class="t2">${idx.length}개 · 이 브라우저에 저장</span><span class="grow"></span>${mine ? '' : (idx.length > 6 ? '<a href="#/mine">전부 보기 →</a>' : '')}</div>${workCards(mine ? idx : idx.slice(0, 6))}
    <div class="sechead"><h2 class="sec">예시로 시작</h2><span class="t2">고르면 내용과 그림이 채워진 채로 시작해요</span></div>
    <div class="grid">${EXAMPLES.map(e => `<a class="card wcard" href="#/new/${e.id}"><span class="th" style="background-image:url('${thumbImg(e)}')"></span><div class="bd"><b>${esc(e.title)}</b><small>${esc(e.by)}</small></div></a>`).join('')}</div>
    <footer class="foot"><span>MIDAS 디자인 에이전트 · 광고 소재</span><a href="./">전문가 편집기(피그마식)로 열기</a></footer></section>`;
  app.querySelectorAll('[data-open]').forEach(c => { c.onclick = e => { if (e.target.closest('[data-more]')) return; go('#/doc/' + c.dataset.open); }; c.onkeydown = e => { if (e.key === 'Enter') go('#/doc/' + c.dataset.open); }; });
  app.querySelectorAll('[data-more]').forEach(b => b.onclick = e => { e.stopPropagation(); const id = b.dataset.more; const r = idx.find(x => x.id === id); modal(r?.name ?? '작업', `<div class="row" style="flex-wrap:wrap"><a class="btn" href="#/doc/${id}">열기</a><a class="btn" href="./#doc=${id}">전문가 편집기</a><button class="btn" data-dup>복제</button><button class="btn danger" data-del>삭제</button></div>`, [{ label: '닫기' }]); $('modalBox').querySelector('[data-dup]').onclick = () => { const d = loadDoc(id); if (!d) return; d.id = 'd' + uid(); d.name += ' 사본'; saveDoc(d, r?.thumb); closeModal(); renderHome(mine); toast('사본을 만들었어요'); }; $('modalBox').querySelector('[data-del]').onclick = () => { closeModal(); modal('이 작업을 지울까요?', '<p>저장본이 사라져요. 되돌릴 수 없어요.</p>', [{ label: '취소' }, { label: '지우기', pri: true, run: () => { deleteDoc(id); renderHome(mine); toast('지웠어요'); } }]); }; });
}

// ───────────────────────── 만들기(3단계) ─────────────────────────
const W = { step: 1, fields: {}, src: {}, prompt: '', exId: null, kvSrc: null, logoSrc: null, pal: null, auto: true, media: new Set(MEDIA), seeded: null };
const EMPTY = Object.fromEntries(FIELDS.map(([k]) => [k, '']));
function seedWizard(exId) {
  W.step = 1; W.prompt = ''; W.kvSrc = null; W.logoSrc = null; W.pal = null; W.auto = true; W.media = new Set(MEDIA); W.seeded = exId ?? null;
  if (exId) { const ex = exById(exId); W.exId = ex.id; W.fields = { ...ex.fields }; W.src = Object.fromEntries(Object.keys(ex.fields).map(k => [k, ex.fields[k] ? 'read' : ''])); W.prompt = ex.prompt; }
  else { W.exId = null; W.fields = { ...EMPTY }; W.src = {}; }
}
const stateOf = k => W.fields[k] ? (W.src[k] === 'user' ? 'user' : 'read') : 'empty';
function readPrompt(v) {   // 말로 적은 걸 읽어 빈칸 채우기(읽은 값은 점선 — 틀릴 수 있으니 보이게)
  const out = {};
  const co = /([가-힣A-Za-z0-9&·]+(?:에너지|아이티|전자|건설|그룹|은행|증권|화재|생명|카드|식품|제약|물산|중공업|항공|통신|테크|소프트|시스템|바이오|홀딩스|주식회사|㈜))/.exec(v); if (co) out.client = co[1].replace(/^주식회사|㈜/, '');
  const hi = /(신입|경력|인턴|수시|상시|전환형|체험형)\s*(공채|채용|모집)?/.exec(v); if (hi) out.hire = hi[1] + ' ' + (hi[2] ?? '채용');
  const yr = (/(20\d{2})/.exec(v) ?? [])[1] ?? String(new Date().getFullYear());
  const ds = [...v.matchAll(/(?:(20\d{2})[.\-/년\s]*)?(\d{1,2})\s*(?:월|\.|-|\/)\s*(\d{1,2})\s*일?/g)].map(m => `${m[1] ?? yr}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`).filter(d => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d));
  if (ds[0]) out.start = ds[0]; if (ds[1]) out.end = ds[1];
  const ro = /(?:직무|직군|부문|분야)\s*[:은는]?\s*([^.。\n]+?)(?:\s*(?:을|를|로|으로|이며|이고|,|$))/.exec(v); if (ro) out.role = ro[1].trim();
  const pl = /(서울|판교|부산|대전|대구|광주|인천|세종|수원|성남|용인|울산|창원|제주)[가-힣]*/.exec(v); if (pl) out.place = pl[0];
  const se = /(20\d{2})\s*년?\s*(상반기|하반기)?/.exec(v); if (se) out.season = se[1] + (se[2] ? ' ' + se[2] : '년');
  const ty = /(정규직|계약직|인턴십|파견직)/.exec(v); if (ty) out.type = ty[1];
  return out;
}
function renderWizard(exId) {
  if (exId !== undefined && (W.seeded !== (exId ?? null) || !Object.keys(W.fields).length)) seedWizard(exId);
  if (!Object.keys(W.fields).length) seedWizard(null);
  const f = W.fields; const ex = W.exId ? exById(W.exId) : null; const kvPreview = W.kvSrc ?? (ex ? kvImg(ex) : null);
  const specCount = SPECS.filter(s => W.media.has(s.media)).length; const ready = f.client?.trim() && f.hire?.trim() && specCount > 0;
  const bl = (k, label, extra = '') => `<input class="bl" data-f="${k}" placeholder="${label}" aria-label="${label}" value="${esc(f[k] ?? '')}" data-state="${stateOf(k)}" style="width:${Math.max(k === 'role' ? 260 : 130, ((f[k] ?? '').length * 21) + 28)}px" ${extra}>`;
  const dt = k => `<input type="date" class="bl" data-f="${k}" aria-label="${k === 'start' ? '접수 시작' : '지원 마감'}" value="${esc(f[k] ?? '')}" data-state="${stateOf(k)}">`;
  const step1 = `<h2 class="sec" style="margin-bottom:6px">어떤 채용 광고인가요?</h2><p class="t2" style="margin-bottom:20px">빈칸만 채우면 돼요. 주황 칸은 꼭 필요한 곳이에요.</p>
    <div class="madlib"><span class="nowrap">${bl('client', '고객사')}의</span> ${bl('hire', '채용 구분')} 광고를 만들어요.<br>접수는 <span class="nowrap">${dt('start')}부터</span> <span class="nowrap">${dt('end')}까지,</span><br>모집 직무는 ${bl('role', '모집 직무(쉼표로 여러 개)')}</div>
    <details class="more-fields"><summary>${I.plus} 더 적을 게 있어요 (시즌 · 고용 형태 · 근무지 · 슬로건 · 고지 문구)</summary><div class="fgrid">${[['season', '시즌'], ['type', '고용 형태'], ['place', '근무지'], ['slogan', '슬로건']].map(([k, l]) => `<label class="fld">${l}<input class="in" data-f="${k}" value="${esc(f[k] ?? '')}"></label>`).join('')}<label class="fld" style="grid-column:1/-1">필수 고지 문구<textarea class="in" data-f="notice" rows="2" style="min-height:64px">${esc(f.notice ?? '')}</textarea></label></div></details>
    <div class="talk"><b>말로 적어도 돼요</b><p class="t2 small">한 줄로 적으면 읽어서 위 빈칸에 채워요. 읽은 값은 점선으로 표시하니 꼭 확인해 주세요.</p><textarea class="in" data-prompt placeholder="예) GS에너지 2025 상반기 신입 공채, 6월 20일부터 7월 2일까지 접수. 직무는 사업·재무" style="min-height:72px;margin-top:10px">${esc(W.prompt)}</textarea><div class="row" style="flex-wrap:wrap"><button class="btn sm dark" data-read>${I.spark} 읽어서 채우기</button><span class="t2 small">예시로 채우기:</span>${EXAMPLES.filter((e, i, a) => a.findIndex(x => x.fields.client === e.fields.client) === i).map(e => `<button class="chip" data-seed="${e.id}">${esc(e.fields.client)}</button>`).join('')}</div></div>`;
  const step2 = `<h2 class="sec" style="margin-bottom:6px">그림을 올려 주세요</h2><p class="t2" style="margin-bottom:20px">키비주얼 한 장이면 지면 색과 글자색을 알아서 맞춰요. 없으면 아래 예시 그림을 골라요.</p>
    <div class="drop" data-drop tabindex="0" role="button" aria-label="키비주얼 올리기">${kvPreview ? `<img src="${kvPreview}" alt="키비주얼">` : `<span class="ico">${I.img}</span>`}<b>${W.kvSrc ? '다른 그림으로 바꾸기' : '여기에 그림을 끌어다 놓거나 눌러서 고르기'}</b><span class="t2 small">JPG · PNG · 가로 1600px 안팎이면 충분해요</span></div>
    <div class="exrow">${EXAMPLES.map(e => `<button data-exkv="${e.id}" aria-pressed="${!W.kvSrc && W.exId === e.id}" title="${esc(e.by)}"><img src="${kvImg(e)}" alt=""><span>${esc(e.by)}</span></button>`).join('')}</div>
    <div class="palprev" data-pal>${W.pal ? palChips(W.pal) : '<span class="t2 small">그림을 올리면 색을 뽑아 보여 드려요</span>'}</div>
    <label class="row" style="margin-top:12px;gap:10px;font-weight:500"><input type="checkbox" data-auto ${W.auto ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--e-primary);margin:0"> 그림 색에 맞춰 지면 · 글자색 자동으로 바꾸기</label>
    <div class="hr" style="margin:20px 0"></div><div class="kvrow"><img src="${W.logoSrc ?? 'assets/midas-logo.png'}" alt="" style="object-fit:contain;background:#fff;border:1px solid var(--e-border)"><div class="acts"><b>로고</b><span class="t2 small">${W.logoSrc ? '올린 로고를 써요' : '기본 로고(MIDAS)를 써요. 고객사 로고가 있으면 바꿔 주세요.'}</span></div><button class="btn sm" data-logo>로고 올리기</button>${W.logoSrc ? '<button class="btn sm ghost" data-logo-x>기본으로</button>' : ''}</div>`;
  const step3 = `<h2 class="sec" style="margin-bottom:6px">어느 매체에 내나요?</h2><p class="t2" style="margin-bottom:16px">고른 매체의 규격을 전부 그려요. 나중에 추가로 받을 수도 있어요.</p>
    <div class="row" style="margin-bottom:14px;flex-wrap:wrap"><button class="chip" data-mall="1">전부 (${SPECS.length}종)</button><button class="chip" data-mall="0">전부 해제</button><button class="chip" data-mrec>자주 쓰는 3곳</button><span class="grow"></span><b>${specCount}종 선택</b></div>
    <div class="medialist">${MEDIA.map(m => `<label><input type="checkbox" data-m="${esc(m)}" ${W.media.has(m) ? 'checked' : ''}><span><b>${esc(m)}</b><small>${countOf(m)}종</small></span></label>`).join('')}</div>`;
  app.innerHTML = `<section class="page"><div class="stepper">${[['내용', '회사 · 기간 · 직무'], ['그림', '키비주얼 · 로고'], ['매체', '어디에 낼지']].map(([t, d], i) => `<button data-step="${i + 1}" aria-current="${W.step === i + 1 ? 'step' : 'false'}" data-done="${W.step > i + 1}"><span class="n">${W.step > i + 1 ? '✓' : i + 1}</span><span><b>${t}</b><small>${d}</small></span></button>`).join('')}</div>
    <div class="wiz"><div class="card pad" data-body>${[step1, step2, step3][W.step - 1]}
      <div class="wizfoot">${W.step > 1 ? `<button class="btn" data-prev>${I.back} 이전</button>` : '<a class="btn ghost" href="#/">취소</a>'}<span class="grow"></span>${W.step < 3 ? `<button class="btn pri" data-next>다음 ${I.fwd}</button>` : `<button class="btn pri big" data-make ${ready ? '' : 'disabled'}>${I.spark} ${specCount}종 만들기</button>`}</div></div>
      <aside class="card pad summary"><img class="mini" src="${kvPreview ?? thumbImg(EXAMPLES[0])}" alt=""><h3 style="margin-bottom:8px">이렇게 만들어요</h3>
        <div class="line"><span class="t2">고객사</span><b data-sum="client">${esc(f.client || '—')}</b></div><div class="line"><span class="t2">채용 구분</span><b data-sum="hire">${esc(f.hire || '—')}</b></div><div class="line"><span class="t2">접수 기간</span><b data-sum="period">${f.start || f.end ? esc(`${f.start || '?'} ~ ${f.end || '?'}`) : '—'}</b></div><div class="line"><span class="t2">그림</span><b>${W.kvSrc ? '올린 키비주얼' : ex ? esc(ex.by) : '예시 그림'}</b></div><div class="line"><span class="t2">매체</span><b>${W.media.size}곳 · ${specCount}종</b></div>
        ${W.step === 3 ? `<button class="btn pri" style="width:100%;margin-top:14px" data-make ${ready ? '' : 'disabled'}>${specCount}종 만들기</button>${ready ? '' : '<p class="t2 small" style="margin-top:8px">고객사와 채용 구분은 꼭 적어 주세요.</p>'}` : `<p class="t2 small" style="margin-top:14px">만든 뒤에도 글 · 그림 · 색을 바로 고칠 수 있어요.</p>`}</aside></div></section>`;
  const body = app.querySelector('[data-body]');
  app.querySelectorAll('[data-step]').forEach(b => b.onclick = () => { W.step = +b.dataset.step; renderWizard(); });
  app.querySelector('[data-next]') && (app.querySelector('[data-next]').onclick = () => { if (W.step === 1 && !(f.client?.trim() && f.hire?.trim())) { toast('고객사와 채용 구분은 꼭 적어 주세요'); body.querySelector(`[data-f="${f.client?.trim() ? 'hire' : 'client'}"]`)?.focus(); return; } W.step++; renderWizard(); });
  app.querySelector('[data-prev]') && (app.querySelector('[data-prev]').onclick = () => { W.step--; renderWizard(); });
  app.querySelectorAll('[data-make]').forEach(b => b.onclick = () => makeDoc());
  // 1단계
  body.querySelectorAll('[data-f]').forEach(inp => { inp.oninput = () => { f[inp.dataset.f] = inp.value; W.src[inp.dataset.f] = 'user'; inp.dataset.state = stateOf(inp.dataset.f); if (inp.classList.contains('bl') && inp.type !== 'date') inp.style.width = Math.max(inp.dataset.f === 'role' ? 260 : 130, inp.value.length * 21 + 28) + 'px'; const s = app.querySelector(`[data-sum="${inp.dataset.f}"]`); if (s) s.textContent = inp.value || '—'; if (inp.dataset.f === 'start' || inp.dataset.f === 'end') { const p = app.querySelector('[data-sum="period"]'); if (p) p.textContent = f.start || f.end ? `${f.start || '?'} ~ ${f.end || '?'}` : '—'; } }; });
  const pr = body.querySelector('[data-prompt]'); if (pr) { pr.oninput = () => { W.prompt = pr.value; }; body.querySelector('[data-read]').onclick = () => { const got = readPrompt(pr.value); const keys = Object.keys(got).filter(k => got[k] && W.src[k] !== 'user'); if (!keys.length) return toast('읽어 낸 값이 없어요. 회사 이름 · 날짜를 적어 주세요'); for (const k of keys) { f[k] = got[k]; W.src[k] = 'read'; } if (/마이다스|midas/i.test(pr.value)) W.exId = W.exId ?? 'midas-3d'; renderWizard(); toast(`${keys.length}칸을 읽어서 채웠어요 · 점선 칸을 확인해 주세요`); }; body.querySelectorAll('[data-seed]').forEach(b => b.onclick = () => { const ex = exById(b.dataset.seed); W.fields = { ...ex.fields }; W.src = Object.fromEntries(Object.keys(ex.fields).map(k => [k, 'read'])); W.prompt = ex.prompt; W.exId = ex.id; renderWizard(); }); }
  // 2단계
  const drop = body.querySelector('[data-drop]'); if (drop) {
    const setKv = async src => { W.kvSrc = src; W.pal = await paletteFromImage(src); renderWizard(); };
    drop.onclick = () => pickImage(src => setKv(src), 1600); drop.onkeydown = e => { if (e.key === 'Enter') drop.click(); };
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = async e => { e.preventDefault(); drop.classList.remove('over'); const file = [...e.dataTransfer.files].find(x => x.type.startsWith('image/')); if (file) setKv(await fileToDataUrl(file, 1600)); };
    body.querySelectorAll('[data-exkv]').forEach(b => b.onclick = async () => { W.exId = b.dataset.exkv; W.kvSrc = null; W.pal = await paletteFromImage(kvImg(exById(W.exId))); renderWizard(); });
    body.querySelector('[data-auto]').onchange = e => { W.auto = e.target.checked; };
    body.querySelector('[data-logo]').onclick = () => pickImage(src => { W.logoSrc = src; renderWizard(); }, 1200);
    body.querySelector('[data-logo-x]') && (body.querySelector('[data-logo-x]').onclick = () => { W.logoSrc = null; renderWizard(); });
    if (!W.pal && kvPreview) paletteFromImage(kvPreview).then(p => { W.pal = p; const el = body.querySelector('[data-pal]'); if (el && p) el.innerHTML = palChips(p); });
  }
  // 3단계
  body.querySelectorAll('[data-m]').forEach(c => c.onchange = () => { c.checked ? W.media.add(c.dataset.m) : W.media.delete(c.dataset.m); renderWizard(); });
  body.querySelectorAll('[data-mall]').forEach(b => b.onclick = () => { W.media = new Set(b.dataset.mall === '1' ? MEDIA : []); renderWizard(); });
  body.querySelector('[data-mrec]') && (body.querySelector('[data-mrec]').onclick = () => { W.media = new Set(MEDIA.slice(0, 3)); renderWizard(); });
}
const palChips = p => `<span class="t2 small">뽑은 색</span>${[['지면', p.bg], ['글자', p.fg], ['포인트', p.accent]].map(([l, c]) => `<span class="row" style="gap:6px"><i class="sw" style="background:${c}"></i><span class="small">${l}</span></span>`).join('')}<span class="t2 small">· ${p.dark ? '어두운 그림이라 진한 지면 + 흰 글자' : '밝은 그림이라 연한 지면 + 진한 글자'}</span>`;

function showLoading(title) {
  app.innerHTML = `<section class="page"><div class="card loadbox"><img src="assets/midas-logo.png" alt="" width="88" style="opacity:.9"><h2 class="sec" style="margin-top:20px">${esc(title)}</h2><div class="bar"><i data-prog></i></div><p class="t2" data-note>준비 중…</p></div></section>`;
  const bar = app.querySelector('[data-prog]'), note = app.querySelector('[data-note]');
  const steps = [[.15, '내용을 읽는 중…'], [.4, '그림 색을 뽑는 중…'], [.7, '규격마다 그리는 중…'], [.9, '가이드로 검수하는 중…'], [1, '거의 다 됐어요']]; let i = 0;
  return new Promise(res => { const tick = () => { const [p, m] = steps[i]; bar.style.width = p * 100 + '%'; note.textContent = m; if (++i < steps.length) setTimeout(tick, 300); else setTimeout(res, 250); }; setTimeout(tick, 100); });
}
async function makeDoc() {
  const f = { ...EMPTY, ...W.fields }; if (!(f.client?.trim() && f.hire?.trim())) return toast('고객사와 채용 구분은 꼭 적어 주세요');
  const exId = W.exId ?? (/마이다스|midas/i.test(f.client) ? 'midas-3d' : 'gs-illust'); const specIds = SPECS.filter(s => W.media.has(s.media)).map(s => s.id);
  const wait = showLoading(`${f.client} ${f.hire} · ${specIds.length}종을 그리는 중`);
  const doc = newDoc({ exId, fields: f, prompt: W.prompt, specIds, name: `${f.client} ${f.hire}` });
  if (W.kvSrc) await replaceKv(doc, W.kvSrc, W.auto); else if (W.auto && W.pal) applyPalette(doc, W.pal);
  if (W.logoSrc) replaceLogo(doc, W.logoSrc);
  await wait; await saveWithThumb(doc); W.seeded = undefined; W.fields = {};
  go('#/doc/' + doc.id); toast(`규격 ${pageOf(doc).children.length}개를 그렸어요`);
}
async function makeFromExample(exId) { const ex = exById(exId); const wait = showLoading(`${ex.title} · 예시 ${SPECS.length}종`); const doc = newDoc({ exId: ex.id }); await wait; await saveWithThumb(doc); go('#/doc/' + doc.id); }

// ───────────────────────── 결과 갤러리 ─────────────────────────
const D = { doc: null, sel: new Set(), filter: '전체', only: false };
function themeOf(doc) { const p = palOf(doc); const dark = (hex => { const v = parseInt(hex.slice(1), 16); return ((v >> 16) * .299 + ((v >> 8) & 255) * .587 + (v & 255) * .114) < 128; })(p.bg); return dark ? 'dark' : 'light'; }
async function applyTheme(doc, kind, custom) {
  const p = palOf(doc); let np;
  if (kind === 'auto') { np = await paletteFromImage(doc.kvSrc ?? kvImg(exById(doc.ex))); if (!np) return toast('그림에서 색을 못 읽었어요'); }
  else if (kind === 'light') np = { accent: p.accent, bg: mix(p.accent, '#FFFFFF', .85), fg: mix(p.accent, '#000000', .72) };
  else if (kind === 'dark') np = { accent: p.accent, bg: mix(p.accent, '#000000', .72), fg: '#FFFFFF' };
  else if (kind === 'white') np = { accent: p.accent, bg: '#FFFFFF', fg: '#1E1E1E' };
  else np = { ...p, ...custom };
  np.brand = [np.accent, np.bg, np.fg]; applyPalette(doc, np); setTextColorAll(doc, np.fg); fixContrast(doc);
}
function renderDoc(id) {
  const doc = D.doc?.id === id ? D.doc : loadDoc(id); if (!doc) { app.innerHTML = '<section class="page"><div class="empty"><b>저장본을 못 찾았어요</b><a class="btn pri" href="#/">홈으로</a></div></section>'; return; }
  D.doc = doc; const page = pageOf(doc); const frames = page.children; const pal = palOf(doc);
  const issues = new Map(frames.map(f => [f.id, checkFrame(f)])); const bad = [...issues.values()].filter(x => x.length).length;
  const groups = new Map(); for (const f of frames) { const m = f.media ?? '기타'; if (!groups.has(m)) groups.set(m, []); groups.get(m).push(f); }
  const vis = f => (D.filter === '전체' || (f.media ?? '기타') === D.filter) && (!D.only || issues.get(f.id).length);
  app.innerHTML = `<section class="page wide"><div class="dochead"><a class="ib" href="#/" aria-label="홈">${I.back}</a><input class="title" data-title value="${esc(doc.name)}" aria-label="작업 이름"><span class="tag grey">규격 ${frames.length}개</span>${bad ? `<button class="tag warn" data-only aria-pressed="${D.only}">확인 필요 ${bad}</button>` : '<span class="tag ok">검수 통과</span>'}<span class="grow"></span><a class="btn" href="./#doc=${doc.id}">전문가 편집기 ↗</a><button class="btn pri" data-zip-all>${I.dl} 전체 내려받기 (ZIP)</button></div>
    <div class="card quick"><span class="lab">한 번에 바꾸기</span><span class="sep"></span>
      <span class="lab">글꼴</span><select class="in" data-font>${FONTS.map(([k]) => `<option value="${k}" ${(doc.font ?? 'Pretendard') === k ? 'selected' : ''}>${k}</option>`).join('')}</select><span class="sep"></span>
      <span class="lab">색</span><div class="theme">${[['auto', '그림에서 자동', `linear-gradient(135deg,${pal.accent},${pal.bg})`], ['light', '밝게', mix(pal.accent, '#FFFFFF', .85)], ['dark', '진하게', mix(pal.accent, '#000000', .72)], ['white', '흰 바탕', '#FFFFFF']].map(([k, l, c]) => `<button data-theme="${k}" title="${l}" aria-label="${l}"><i style="background:${c};border:1px solid rgba(0,0,0,.1)"></i></button>`).join('')}</div>
      <label class="row small" style="gap:6px">지면 <input type="color" class="sw" data-c="bg" value="${pal.bg}"></label><label class="row small" style="gap:6px">글자 <input type="color" class="sw" data-c="fg" value="${pal.fg}"></label><label class="row small" style="gap:6px">포인트 <input type="color" class="sw" data-c="accent" value="${pal.accent}"></label><span class="sep"></span>
      <button class="btn sm" data-kv>${I.img} 키비주얼 바꾸기</button><button class="btn sm" data-logo>로고 바꾸기</button><button class="btn sm" data-fields>${I.pen} 내용 바꾸기</button><button class="btn sm ghost" data-regen>처음 배치로</button></div>
    <div class="filters"><button class="chip" data-filter="전체" aria-pressed="${D.filter === '전체'}">전체 ${frames.length}</button>${[...groups].map(([m, l]) => `<button class="chip" data-filter="${esc(m)}" aria-pressed="${D.filter === m}">${esc(m)} ${l.length}</button>`).join('')}<span class="grow"></span><span class="t2 small">카드를 누르면 크게 보고, 「고치기」로 글 · 그림 · 색을 바꿔요</span></div>
    ${[...groups].map(([m, list]) => { const L = list.filter(vis); if (!L.length) return ''; return `<div class="mediasec"><h2>${esc(m)}<span class="tag grey">${L.length}</span><span class="grow"></span><button class="btn sm ghost" data-zip-media="${esc(m)}">${I.dl} ${esc(m)}만 ZIP</button></h2><div class="fgrid">${L.map(f => { const iss = issues.get(f.id); return `<div class="card fcard" data-f="${f.id}"><input type="checkbox" class="chk" data-chk="${f.id}" ${D.sel.has(f.id) ? 'checked' : ''} aria-label="${esc(f.name)} 선택">${iss.length ? `<span class="tag warn flag" title="${esc(iss.map(i => i.msg).join('\n'))}">확인 ${iss.length}</span>` : ''}<div class="pv" data-pv="${f.id}"><img alt="${esc(f.name)}" data-th="${f.id}" style="${f.w >= f.h ? 'width:100%' : 'height:100%'}"></div><div class="bd"><span class="grow"><span class="nm" title="${esc(f.name)}">${esc(f.name)}</span><small>${f.w} × ${f.h}</small></span></div><div class="acts"><a class="btn sm pri" href="#/edit/${doc.id}/${f.id}">${I.edit} 고치기</a><button class="btn sm" data-png="${f.id}">PNG</button></div></div>`; }).join('')}</div></div>`; }).join('')}
    ${frames.filter(vis).length ? '' : '<div class="empty"><b>보여 줄 규격이 없어요</b><span>필터를 바꿔 보세요.</span></div>'}
    <div class="selbar" data-selbar hidden><span data-selcount></span><button class="btn pri sm" data-zip-sel>${I.dl} 선택 내려받기</button><button class="btn ghost sm" data-sel-clear>해제</button></div></section>`;
  // 썸네일(보이는 것부터)
  const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { const im = e.target; io.unobserve(im); const f = frames.find(x => x.id === im.dataset.th); if (f) thumbnail(f, 520).then(u => { im.src = u; }); } }, { rootMargin: '400px' });
  app.querySelectorAll('[data-th]').forEach(im => io.observe(im));
  const rerender = async () => { await saveWithThumb(doc); renderDoc(doc.id); };
  const title = app.querySelector('[data-title]'); title.onchange = () => { doc.name = title.value.trim() || doc.name; title.value = doc.name; saveDoc(doc); renameDocIndex(doc); toast('이름을 바꿨어요'); };
  app.querySelector('[data-only]') && (app.querySelector('[data-only]').onclick = () => { D.only = !D.only; renderDoc(id); });
  app.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { D.filter = b.dataset.filter; renderDoc(id); });
  app.querySelectorAll('[data-pv]').forEach(p => p.onclick = () => previewFrame(frames.find(f => f.id === p.dataset.pv)));
  app.querySelectorAll('[data-png]').forEach(b => b.onclick = async () => { const f = frames.find(x => x.id === b.dataset.png); download(await framePng(f, 1), `${safe(f.name)}_${f.w}x${f.h}.png`); });
  const zip = async (list, label) => { if (!list.length) return toast('내보낼 규격이 없어요'); toast(`${list.length}개 그리는 중…`); try { await exportZip(list, { scale: 1, name: `${doc.name}_${label}` }); toast('내려받았어요'); } catch (e) { console.error(e); toast('내보내기 실패: ' + e.message); } };
  app.querySelector('[data-zip-all]').onclick = () => zip(frames, '전체');
  app.querySelectorAll('[data-zip-media]').forEach(b => b.onclick = () => zip(frames.filter(f => (f.media ?? '기타') === b.dataset.zipMedia), b.dataset.zipMedia));
  const syncSel = () => { const bar = app.querySelector('[data-selbar]'); bar.hidden = !D.sel.size; app.querySelector('[data-selcount]').textContent = `${D.sel.size}개 선택`; };
  app.querySelectorAll('[data-chk]').forEach(c => c.onchange = () => { c.checked ? D.sel.add(c.dataset.chk) : D.sel.delete(c.dataset.chk); syncSel(); }); syncSel();
  app.querySelector('[data-zip-sel]').onclick = () => zip(frames.filter(f => D.sel.has(f.id)), '선택');
  app.querySelector('[data-sel-clear]').onclick = () => { D.sel.clear(); renderDoc(id); };
  // 한 번에 바꾸기
  app.querySelector('[data-font]').onchange = e => { setFontAll(doc, e.target.value); rerender(); toast(`글꼴을 ${e.target.value}로 바꿨어요`); };
  app.querySelectorAll('[data-theme]').forEach(b => b.onclick = async () => { await applyTheme(doc, b.dataset.theme); rerender(); toast('색을 바꿨어요'); });
  app.querySelectorAll('[data-c]').forEach(c => c.onchange = async () => { await applyTheme(doc, 'custom', { [c.dataset.c]: c.value.toUpperCase() }); rerender(); });
  app.querySelector('[data-kv]').onclick = () => pickImage(async src => { const p = await replaceKv(doc, src, true); if (p) setTextColorAll(doc, p.fg); fixContrast(doc); rerender(); toast(p ? `그림에 맞춰 지면 ${p.bg} · 글자 ${p.fg}로 바꿨어요` : '키비주얼을 바꿨어요'); }, 1600);
  app.querySelector('[data-logo]').onclick = () => pickImage(src => { replaceLogo(doc, src); rerender(); toast('로고를 바꿨어요'); }, 1200);
  app.querySelector('[data-fields]').onclick = () => { const f = doc.fields; modal('내용 바꾸기', `<div class="fgrid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${FIELDS.map(([k, l, t]) => `<label class="fld" ${t === 'area' ? 'style="grid-column:1/-1"' : ''}>${l}${t === 'area' ? `<textarea class="in" data-fk="${k}" rows="2" style="min-height:56px">${esc(f[k] ?? '')}</textarea>` : `<input class="in" ${k === 'start' || k === 'end' ? 'type="date"' : ''} data-fk="${k}" value="${esc(f[k] ?? '')}">`}</label>`).join('')}</div><p class="small">메인 문구 · 날짜 · 모집 직무 글자에 바로 반영돼요.</p>`, [{ label: '취소' }, { label: '반영하기', pri: true, run: () => { $('modalBox').querySelectorAll('[data-fk]').forEach(i => { f[i.dataset.fk] = i.value; }); applyFieldsToText(doc); doc.name = `${f.client} ${f.hire}`; renameDocIndex(doc); rerender(); toast('글자에 반영했어요'); } }]); };
  app.querySelector('[data-regen]').onclick = () => modal('처음 배치로 되돌릴까요?', '<p>모든 규격의 글과 그림 자리를 처음 규칙대로 다시 깔아요. 바꾼 색 · 글꼴 · 그림은 그대로예요.</p>', [{ label: '취소' }, { label: '되돌리기', pri: true, run: () => { for (const f of frames) applyPreset(doc, f, 'auto'); rerender(); toast('처음 배치로 돌렸어요'); } }]);
}

// ───────────────────────── 배치 프리셋(간단 편집 · 결과) ─────────────────────────
//   auto: 생성 규칙(buildFrame) 그대로 · left: 글 왼쪽/그림 오른쪽 · top: 글 위/그림 아래 · overlay: 그림 전체 + 스크림 32% + 글 가운데(흰 글자)
function applyPreset(doc, f, preset) {
  const by = nm => f.children.find(c => c.name === nm); const kv = by('키비주얼'), logo = by('로고'), main = by('메인 문구'), date = by('날짜'), role = by('모집 직무');
  const si = f.children.findIndex(c => c.name === '스크림'); if (si >= 0 && preset !== 'overlay') f.children.splice(si, 1);
  const { w, h } = f; const m = Math.min(w, h); const pad = clamp(Math.round(m * .08), 8, 80); const pal = palOf(doc); const texts = [main, date, role].filter(Boolean);
  f.preset = preset;
  if (preset === 'auto') {
    const fresh = buildFrame({ id: f.specId ?? f.id, name: f.name, media: f.media, w, h }, { palette: pal }, doc.fields);
    for (const c of f.children) { const s = fresh.children.find(x => x.name === c.name); if (!s) continue; Object.assign(c, { x: s.x, y: s.y, w: s.w, h: s.h }); if (c.type === 'text') { c.text.size = s.text.size; c.text.align = 'left'; c.text.valign = 'top'; c.fills[0] && (c.fills[0].color = pal.fg); } }
    return;
  }
  if (logo) { const lh = clamp(Math.round(m * .075), 10, 56); logo.w = Math.round(lh * 1043 / 304); logo.h = lh; logo.x = w - pad - logo.w; logo.y = pad; }
  const longest = Math.max(doc.fields.client.length, doc.fields.hire.length, 4);
  const stack = (x, tw, align, yMode, color) => {
    const size = clamp(Math.min(Math.round(m * .12), Math.floor(tw / (longest * 1.02))), 11, 140);
    const specs = { '메인 문구': [size, 2], '날짜': [Math.round(size * .42), 1], '모집 직무': [Math.round(size * .34), 1] }; const gap = { '메인 문구': Math.round(size * .25), '날짜': Math.round(size * .12), '모집 직무': 0 };
    for (const t of texts) { const [sz, ln] = specs[t.name]; t.text.size = sz; t.w = tw; t.h = Math.round(sz * 1.25 * ln); t.x = x; t.text.align = align; t.text.valign = 'top'; if (color && t.fills[0]) t.fills[0].color = color; }
    const total = texts.reduce((a, t) => a + t.h + gap[t.name], 0);
    let y = yMode === 'center' ? Math.round((h - total) / 2) : yMode === 'top' ? pad + (logo ? logo.h + Math.round(size * .3) : 0) : yMode;
    for (const t of texts) { t.y = y; y += t.h + gap[t.name]; }
  };
  if (preset === 'left') { if (kv) Object.assign(kv, { x: Math.round(w * .5), y: 0, w: Math.round(w * .5), h }); if (logo) { logo.x = pad; } stack(pad, Math.round(w * .5) - pad * 2, 'left', 'center', pal.fg); }
  else if (preset === 'top') { if (kv) Object.assign(kv, { x: 0, y: Math.round(h * .5), w, h: Math.round(h * .5) }); stack(pad, w - pad * 2, 'left', 'top', pal.fg); }
  else if (preset === 'overlay') {
    if (kv) Object.assign(kv, { x: 0, y: 0, w, h });
    let sc = by('스크림'); if (!sc) { sc = node('rect', { name: '스크림', x: 0, y: 0, w, h, fills: [solid('#000000', .32)], locked: true, constraints: { h: 'stretch', v: 'stretch' } }); const ki = f.children.indexOf(kv); f.children.splice(ki >= 0 ? ki + 1 : 1, 0, sc); } else Object.assign(sc, { x: 0, y: 0, w, h });
    stack(pad, w - pad * 2, 'center', 'center', '#FFFFFF');
  }
}

// ───────────────────────── 간단 편집 ─────────────────────────
const E = { doc: null, frame: null, ed: null, undo: [], redo: [], snap: null, keyH: null, ro: null, saveT: null };
function leaveEdit() { if (!E.ed) return; document.removeEventListener('keydown', E.keyH); E.ro?.disconnect(); clearTimeout(E.saveT); if (E.doc) saveWithThumb(E.doc); E.ed = null; E.frame = null; }
function renderEdit(id, fid) {
  const doc = D.doc?.id === id ? D.doc : loadDoc(id); if (!doc) return renderDoc(id);
  D.doc = doc; const page = pageOf(doc); const idx = page.children.findIndex(f => f.id === fid); if (idx < 0) return go('#/doc/' + id);
  E.doc = doc; E.frame = page.children[idx]; E.undo = []; E.redo = [];
  const prev = page.children[idx - 1], next = page.children[idx + 1];
  app.innerHTML = `<section class="page wide" style="padding-top:0"><div class="edhead"><a class="btn ghost" href="#/doc/${id}">${I.back} 결과로</a><span class="nm" data-nm></span><span class="sz" data-sz></span><span class="nav"><a class="ib" ${prev ? `href="#/edit/${id}/${prev.id}"` : 'aria-disabled="true" style="opacity:.3"'} title="이전 규격">${I.back}</a><a class="ib" ${next ? `href="#/edit/${id}/${next.id}"` : 'aria-disabled="true" style="opacity:.3"'} title="다음 규격">${I.fwd}</a></span><span class="grow"></span>
      <button class="ib" data-undo title="되돌리기 (⌘Z)">${I.undo}</button><button class="ib" data-redo title="다시 실행 (⇧⌘Z)">${I.redo}</button><button class="btn sm" data-big>크게 보기</button><button class="btn sm" data-png>${I.dl} PNG</button><a class="btn sm" href="./#doc=${id}&f=${fid}">전문가 편집기에서 열기 ↗</a></div>
    <div class="edit"><div class="stage"><div class="cvhost"></div><div class="selbox" data-selbox hidden></div><div class="hint">끌어서 옮기고, 모서리 점을 끌어 크기를 바꿔요 · 글자는 두 번 누르면 바로 고쳐요</div></div><aside class="sidep" data-side></aside></div></section>`;
  const host = app.querySelector('.cvhost'); const stage = app.querySelector('.stage');
  const shadow = { pages: [{ id: 'sp', name: '규격', bg: 'transparent', children: [E.frame] }], pageId: 'sp', get font() { return doc.font; } };
  const ed = new Editor(host, shadow, { select: () => syncSel(), commit: label => commit(label), change: () => renderSide(), live: () => {}, zoom: () => {}, tool: () => {}, rename: () => {} });
  ed.showRulers = false; ed.showCoords = false; wireGlobal(ed); E.ed = ed;
  const orig = ed.pickFromEl.bind(ed); ed.pickFromEl = t => { const r = orig(t); return r === E.frame.id ? null : r; };
  const fitAll = () => ed.zoomTo([E.frame.id]); requestAnimationFrame(fitAll);
  E.ro = new ResizeObserver(() => fitAll()); E.ro.observe(stage);
  // 되돌리기(이 규격만)
  const snapshot = () => JSON.stringify(E.frame); E.snap = snapshot();
  function commit() { const s = snapshot(); if (s === E.snap) return; E.undo.push(E.snap); if (E.undo.length > 80) E.undo.shift(); E.redo = []; E.snap = s; clearTimeout(E.saveT); E.saveT = setTimeout(() => saveDoc(doc), 800); }
  function restore(s) { const nf = JSON.parse(s); const i = page.children.indexOf(E.frame); page.children[i] = nf; shadow.pages[0].children[0] = nf; E.frame = nf; E.snap = s; const keep = ed.sel.slice(); ed.render(); ed.select(keep, { silent: true }); renderSide(); syncSel(); saveDoc(doc); }
  const undo = () => { if (!E.undo.length) return toast('되돌릴 게 없어요'); E.redo.push(E.snap); restore(E.undo.pop()); };
  const redo = () => { if (!E.redo.length) return; E.undo.push(E.snap); restore(E.redo.pop()); };
  app.querySelector('[data-undo]').onclick = undo; app.querySelector('[data-redo]').onclick = redo;
  app.querySelector('[data-png]').onclick = async () => download(await framePng(E.frame, 1), `${safe(E.frame.name)}_${E.frame.w}x${E.frame.h}.png`);
  app.querySelector('[data-big]').onclick = () => previewFrame(E.frame);
  E.keyH = e => { if (/input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return; const meta = e.metaKey || e.ctrlKey; const k = e.key.toLowerCase();
    if (meta && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); } else if (meta && k === 'y') { e.preventDefault(); redo(); }
    else if (meta && k === 'd') { e.preventDefault(); act('dup'); } else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); act('delete'); }
    else if (e.key === 'Escape') ed.select([]); else if (e.key.startsWith('Arrow')) { e.preventDefault(); const d = e.shiftKey ? 10 : 1; ed.nudge(e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0); } };
  document.addEventListener('keydown', E.keyH);
  const refreshAll = () => { ed.render(); ed.select(ed.sel.filter(x => findNode(ed.page, x)), { silent: true }); };
  // 선택한 것에 대한 작은 도구
  function act(k) {
    const f = E.frame; const ns = ed.selNodes().filter(n => !n.locked); if (!ns.length && k !== 'none') return;
    if (k === 'delete') { for (const n of ns) removeNode(ed.page, n.id); ed.select([], { silent: true }); refreshAll(); commit(); renderSide(); syncSel(); }
    else if (k === 'dup') { const ids = []; for (const n of ns) { const p = parentOf(ed.page, n.id); const list = p === ed.page ? f.children : p.children; const c = cloneNode(n); c.x += Math.round(f.w * .03); c.y += Math.round(f.h * .03); list.splice(list.indexOf(n) + 1, 0, c); ids.push(c.id); } refreshAll(); ed.select(ids); commit(); renderSide(); }
    else if (k === 'center') { ed.align('c'); ed.align('m'); }
    else if (k === 'front' || k === 'back') { for (const n of ns) { const p = parentOf(ed.page, n.id); const list = p === ed.page ? f.children : p.children; list.splice(list.indexOf(n), 1); k === 'front' ? list.push(n) : list.splice(1, 0, n); } refreshAll(); commit(); renderSide(); }
  }
  function syncSel() {
    const box = app.querySelector('[data-selbox]'); const ns = ed.selNodes(); const n = ns[0];
    app.querySelectorAll('.trow').forEach(r => r.setAttribute('aria-selected', String(ed.sel.includes(r.dataset.node))));
    if (!n) { box.hidden = true; return; }
    box.hidden = false; box.innerHTML = `<span>${esc(ns.length > 1 ? `${ns.length}개 선택` : n.name)}</span>${n.locked ? '<span class="tag grey">잠김</span>' : `<button class="ib" data-a="center" title="가운데로">${I.center}</button><button class="ib" data-a="front" title="맨 앞으로">${I.front}</button><button class="ib" data-a="back" title="맨 뒤로">${I.backw}</button><button class="ib" data-a="dup" title="복제 (⌘D)">${I.copy}</button><button class="ib" data-a="delete" title="삭제 (⌫)">${I.trash}</button>`}`;
    box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a));
    const row = app.querySelector(`.trow[data-node="${n.id}"]`); if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  // 오른쪽 카드(글 · 그림 · 배경 · 배치)
  function renderSide() {
    const f = E.frame; const pal = palOf(doc); const side = app.querySelector('[data-side]'); const sc = side.scrollTop;
    app.querySelector('[data-nm]').textContent = f.name; app.querySelector('[data-sz]').textContent = `${f.w} × ${f.h}`;
    const texts = []; walk(f.children, n => { if (n.type === 'text' && n.visible !== false) texts.push(n); });
    const kv = f.children.find(c => c.name === '키비주얼' && c.type === 'image'); const logo = f.children.find(c => c.name === '로고'); const bgN = f.children.find(c => c.name === '배경');
    const bgColor = bgN?.fills?.[0]?.color ?? f.fills?.[0]?.color ?? '#FFFFFF';
    const sw = (cols, cur, attr) => `<div class="swatches">${[...new Set(cols)].map(c => `<button data-${attr}="${c}" aria-pressed="${c.toUpperCase() === (cur ?? '').toUpperCase()}" style="background:${c}" title="${c}"></button>`).join('')}<input type="color" class="sw" data-${attr}-pick value="${/^#[0-9a-f]{6}$/i.test(cur ?? '') ? cur : '#000000'}" title="직접 고르기"></div>`;
    const textCols = [pal.fg, pal.accent, '#FFFFFF', '#1E1E1E'];
    side.innerHTML = `<div class="card"><h3>${I.pen} 글<span class="t3">${texts.length}개</span></h3>${texts.map(t => `<div class="trow" data-node="${t.id}" aria-selected="${ed.sel.includes(t.id)}"><div class="nm">${esc(t.name)}<span class="t3">${t.text.size}px</span><button class="ib" data-del="${t.id}" title="이 글 지우기">${I.trash}</button></div><textarea data-tx="${t.id}" rows="${Math.min(4, t.text.content.split('\n').length)}" aria-label="${esc(t.name)} 내용">${esc(t.text.content)}</textarea>
        <div class="ctl"><span class="stepn"><button data-sz="${t.id}" data-d="-1" title="작게">−</button><input data-szin="${t.id}" value="${t.text.size}" aria-label="글자 크기"><button data-sz="${t.id}" data-d="1" title="크게">+</button></span><button class="tbtn" data-bold="${t.id}" aria-pressed="${t.text.weight >= 700}" title="굵게"><b>B</b></button><span class="row" style="gap:2px">${[['left', I.al], ['center', I.ac], ['right', I.ar]].map(([a, i]) => `<button class="tbtn" data-al="${t.id}" data-v="${a}" aria-pressed="${t.text.align === a}">${i}</button>`).join('')}</span></div>
        <div class="ctl">${sw(textCols, t.fills[0]?.color, `tc-${t.id}`)}</div></div>`).join('')}<button class="btn sm" data-add-text style="width:100%">${I.plus} 글 추가</button></div>
      <div class="card"><h3>${I.img} 그림</h3>${kv ? `<div class="kvrow"><img src="${kv.fills[0]?.src ?? ''}" alt=""><div class="acts"><b>키비주얼</b><span class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-kv="one">이 규격만 바꾸기</button><button class="btn sm" data-kv="all">전부 바꾸기</button></span></div></div>
        <div class="ctl row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><span class="t2 small">맞춤</span><button class="tbtn" data-fit="cover" aria-pressed="${(kv.fills[0]?.fit ?? 'cover') === 'cover'}">꽉 채우기</button><button class="tbtn" data-fit="contain" aria-pressed="${kv.fills[0]?.fit === 'contain'}">다 보이게</button><span class="grow"></span><button class="btn sm ghost" data-autopal>${I.spark} 그림 색으로 전체 맞추기</button></div>` : '<p class="t2 small">이 규격엔 키비주얼이 없어요.</p>'}
        <div class="hr"></div>${logo ? `<div class="kvrow"><img src="${logo.fills[0]?.src ?? ''}" alt="" style="object-fit:contain;background:#fff;border:1px solid var(--e-border)"><div class="acts"><b>로고</b><span class="row" style="gap:6px"><button class="btn sm" data-logo>바꾸기(전체)</button></span></div><div class="corner" title="위치">${[['nw', '왼쪽 위'], ['ne', '오른쪽 위'], ['sw', '왼쪽 아래'], ['se', '오른쪽 아래']].map(([k, l]) => `<button data-corner="${k}" aria-label="${l}" aria-pressed="${cornerOf(f, logo) === k}"></button>`).join('')}</div></div><label class="row small" style="margin-top:10px;gap:10px"><span class="t2">크기</span><input type="range" data-logosz min="${Math.max(10, Math.round(Math.min(f.w, f.h) * .03))}" max="${Math.round(Math.min(f.w, f.h) * .25)}" value="${Math.round(logo.h)}"></label>` : `<button class="btn sm" data-add-logo>${I.plus} 로고 넣기</button>`}</div>
      <div class="card"><h3>배경</h3>${sw([pal.bg, ...pal.brand ?? [], '#FFFFFF', '#1E1E1E'], bgColor, 'bg')}<div class="row" style="margin-top:10px;gap:6px"><button class="btn sm" data-bg-all>모든 규격에 이 배경</button><span class="t2 small">지금 색: ${bgColor}</span></div></div>
      <div class="card"><h3>${I.grid} 배치<span class="t3">누르면 바로 바뀌어요</span></h3><div class="presets">${[['auto', '자동(규칙)', '<rect x="4" y="4" width="56" height="36" rx="3" fill="#E8F0FF"/><rect x="8" y="10" width="22" height="5" rx="1" fill="#2F6FE6"/><rect x="8" y="18" width="16" height="3" rx="1" fill="#9AA1AC"/><rect x="32" y="16" width="26" height="22" rx="2" fill="#B9CCF5"/>'], ['left', '글 왼쪽 · 그림 오른쪽', '<rect x="4" y="4" width="56" height="36" rx="3" fill="#E8F0FF"/><rect x="8" y="16" width="20" height="5" rx="1" fill="#2F6FE6"/><rect x="8" y="24" width="14" height="3" rx="1" fill="#9AA1AC"/><rect x="32" y="4" width="28" height="36" rx="2" fill="#B9CCF5"/>'], ['top', '글 위 · 그림 아래', '<rect x="4" y="4" width="56" height="36" rx="3" fill="#E8F0FF"/><rect x="8" y="9" width="28" height="5" rx="1" fill="#2F6FE6"/><rect x="8" y="17" width="18" height="3" rx="1" fill="#9AA1AC"/><rect x="4" y="24" width="56" height="16" rx="2" fill="#B9CCF5"/>'], ['overlay', '그림 전체 · 글 가운데', '<rect x="4" y="4" width="56" height="36" rx="3" fill="#7F9BD8"/><rect x="18" y="17" width="28" height="5" rx="1" fill="#fff"/><rect x="24" y="25" width="16" height="3" rx="1" fill="#E8F0FF"/>']].map(([k, l, s]) => `<button data-preset="${k}" aria-pressed="${(f.preset ?? 'auto') === k}"><svg viewBox="0 0 64 44">${s}</svg>${l}</button>`).join('')}</div><button class="btn sm ghost" data-preset-all style="width:100%;margin-top:8px">모든 규격에 같은 배치</button></div>
      <div class="card"><h3>도움말</h3><p class="t2 small">그림 위에서 <b>끌면</b> 옮겨지고, 모서리 <b>점</b>을 끌면 크기가 바뀌어요. 글자는 <b>두 번 누르면</b> 바로 고칠 수 있어요. <span class="kbd">⌘Z</span> 되돌리기 · <span class="kbd">⌫</span> 삭제 · <span class="kbd">방향키</span> 1px 이동. 더 세밀한 건 <a href="./#doc=${id}&f=${fid}">전문가 편집기</a>에서.</p></div>`;
    side.scrollTop = sc;
    const refresh = (n, label) => { ed.refresh(n.id); commit(label); };
    side.querySelectorAll('.trow').forEach(r => r.addEventListener('pointerdown', e => { if (e.target.closest('button, input, textarea')) return; ed.select([r.dataset.node]); }));
    let txT; side.querySelectorAll('[data-tx]').forEach(ta => { ta.onfocus = () => ed.select([ta.dataset.tx], { silent: true }) || syncSel(); ta.oninput = () => { const n = findNode(ed.page, ta.dataset.tx); n.text.content = ta.value; fitTextHeight(n); ed.refresh(n.id); clearTimeout(txT); txT = setTimeout(() => commit('글자'), 400); }; });
    side.querySelectorAll('[data-sz]').forEach(b => b.onclick = () => { const n = findNode(ed.page, b.dataset.sz); const d = +b.dataset.d; const step = n.text.size >= 40 ? 4 : 2; const ns = clamp(n.text.size + d * step, 6, 400); n.text.size = ns; fitTextHeight(n); refresh(n, '크기'); renderSide(); });
    side.querySelectorAll('[data-szin]').forEach(i => i.onchange = () => { const n = findNode(ed.page, i.dataset.szin); const ns = clamp(+i.value || n.text.size, 6, 400); n.text.size = ns; fitTextHeight(n); refresh(n, '크기'); renderSide(); });
    side.querySelectorAll('[data-bold]').forEach(b => b.onclick = () => { const n = findNode(ed.page, b.dataset.bold); n.text.weight = n.text.weight >= 700 ? 500 : 700; refresh(n, '굵게'); b.setAttribute('aria-pressed', String(n.text.weight >= 700)); });
    side.querySelectorAll('[data-al]').forEach(b => b.onclick = () => { const n = findNode(ed.page, b.dataset.al); n.text.align = b.dataset.v; refresh(n, '정렬'); renderSide(); });
    side.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { removeNode(ed.page, b.dataset.del); ed.select([], { silent: true }); refreshAll(); commit('삭제'); renderSide(); syncSel(); });
    for (const t of texts) { side.querySelectorAll(`[data-tc-${t.id}]`).forEach(b => b.onclick = () => { setColor(t, b.getAttribute(`data-tc-${t.id}`)); }); const pk = side.querySelector(`[data-tc-${t.id}-pick]`); if (pk) pk.oninput = () => setColor(t, pk.value.toUpperCase()); }
    function setColor(t, c) { if (!t.fills[0]) t.fills[0] = solid(c); t.fills[0].color = c; refresh(t, '색'); renderSide(); }
    side.querySelector('[data-add-text]').onclick = () => { const pad = clamp(Math.round(Math.min(f.w, f.h) * .08), 8, 80); const base = texts[0]?.text.size ?? Math.round(Math.min(f.w, f.h) * .08); const sz = Math.max(11, Math.round(base * .5)); const t = node('text', { name: '글 ' + (texts.length + 1), x: pad, y: Math.round(f.h * .5), w: f.w - pad * 2, h: Math.round(sz * 1.25), fills: [solid(pal.fg)], text: { content: '새 글', size: sz, weight: 600, lineHeight: 1.25, letterSpacing: -0.01, align: 'left', valign: 'top', family: doc.font ?? 'Pretendard', auto: 'height' } }); f.children.push(t); refreshAll(); ed.select([t.id]); commit('글 추가'); renderSide(); setTimeout(() => side.querySelector(`[data-tx="${t.id}"]`)?.focus(), 0); };
    if (kv) {
      side.querySelectorAll('[data-kv]').forEach(b => b.onclick = () => pickImage(async src => { if (b.dataset.kv === 'all') { const p = await replaceKv(doc, src, true); if (p) setTextColorAll(doc, p.fg); fixContrast(doc); refreshAll(); commit('키비주얼'); saveDoc(doc); renderSide(); toast(p ? `전체 규격의 그림과 색을 바꿨어요 (지면 ${p.bg})` : '전체 규격의 그림을 바꿨어요'); } else { kv.fills[0].src = src; refresh(kv, '키비주얼'); renderSide(); toast('이 규격의 그림만 바꿨어요'); } }, 1600));
      side.querySelectorAll('[data-fit]').forEach(b => b.onclick = () => { kv.fills[0].fit = b.dataset.fit; refresh(kv, '맞춤'); renderSide(); });
      side.querySelector('[data-autopal]').onclick = async () => { const p = await paletteFromImage(kv.fills[0].src); if (!p) return toast('그림에서 색을 못 읽었어요'); applyPalette(doc, p); setTextColorAll(doc, p.fg); fixContrast(doc); refreshAll(); commit('색'); saveDoc(doc); renderSide(); toast(`지면 ${p.bg} · 글자 ${p.fg} · 포인트 ${p.accent}로 전체를 맞췄어요`); };
    }
    if (logo) {
      side.querySelector('[data-logo]').onclick = () => pickImage(src => { replaceLogo(doc, src); refreshAll(); commit('로고'); saveDoc(doc); renderSide(); toast('전체 규격의 로고를 바꿨어요'); }, 1200);
      side.querySelectorAll('[data-corner]').forEach(b => b.onclick = () => { placeCorner(f, logo, b.dataset.corner); refresh(logo, '로고 위치'); renderSide(); });
      const rg = side.querySelector('[data-logosz]'); rg.oninput = () => { const k = cornerOf(f, logo); logo.h = +rg.value; logo.w = Math.round(logo.h * 1043 / 304); placeCorner(f, logo, k); ed.refresh(logo.id); }; rg.onchange = () => commit('로고 크기');
    } else side.querySelector('[data-add-logo]').onclick = () => { const m = Math.min(f.w, f.h); const lh = clamp(Math.round(m * .075), 10, 56); const n = node('image', { name: '로고', w: Math.round(lh * 1043 / 304), h: lh, fills: [imageFill(doc.logoSrc ?? 'assets/midas-logo.png', 'contain')], constraints: { h: 'right', v: 'top' } }); placeCorner(f, n, 'ne'); f.children.push(n); refreshAll(); ed.select([n.id]); commit('로고'); renderSide(); };
    const setBg = c => { if (bgN) { bgN.fills[0] ? bgN.fills[0].color = c : bgN.fills.push(solid(c)); } if (f.fills[0]) f.fills[0].color = c; else f.fills.push(solid(c)); refreshAll(); commit('배경'); renderSide(); };
    side.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => setBg(b.dataset.bg)); side.querySelector('[data-bg-pick]').oninput = e => setBg(e.target.value.toUpperCase());
    side.querySelector('[data-bg-all]').onclick = () => { const p = palOf(doc); applyPalette(doc, { ...p, bg: bgColor, brand: [p.accent, bgColor, p.fg] }); for (const fr of page.children) { const b = fr.children.find(c => c.name === '배경'); if (b?.fills[0]) b.fills[0].color = bgColor; if (fr.fills[0]) fr.fills[0].color = bgColor; } refreshAll(); commit('배경 전체'); saveDoc(doc); renderSide(); toast('모든 규격의 배경을 바꿨어요'); };
    side.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { applyPreset(doc, f, b.dataset.preset); refreshAll(); commit('배치'); renderSide(); });
    side.querySelector('[data-preset-all]').onclick = () => { const k = f.preset ?? 'auto'; for (const fr of page.children) applyPreset(doc, fr, k); refreshAll(); commit('배치 전체'); saveDoc(doc); renderSide(); toast(`모든 규격을 「${{ auto: '자동', left: '글 왼쪽', top: '글 위', overlay: '그림 전체' }[k]}」 배치로 바꿨어요`); };
  }
  renderSide(); syncSel();
}
function cornerOf(f, n) { const l = n.x + n.w / 2 < f.w / 2, t = n.y + n.h / 2 < f.h / 2; return (t ? 'n' : 's') + (l ? 'w' : 'e'); }
function placeCorner(f, n, k) { const pad = clamp(Math.round(Math.min(f.w, f.h) * .08), 8, 80); n.x = k.endsWith('w') ? pad : f.w - pad - n.w; n.y = k.startsWith('n') ? pad : f.h - pad - n.h; n.constraints = { h: k.endsWith('w') ? 'left' : 'right', v: k.startsWith('n') ? 'top' : 'bottom' }; }

window.addEventListener('beforeunload', () => { if (E.doc) saveDoc(E.doc); });
window.easy = { W, D, E, go };
route();
