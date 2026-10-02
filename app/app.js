// Campaign Agent — 도구형 앞문 (챗봇 아님).
// 홈(입력 우선) → 인테이크 시트(질문지 한 장) → 아트보드 워크스페이스(줌·팬·선택·즉시 편집).
// 편집: 우측 인스펙터 — 선택 없음 = 캠페인 전체(타이핑 즉시 전 산출물 일괄 반영),
//        산출물 선택 = 그것만 즉시 반영(override, 일괄 반영에서 보존).

import { createContext, updateContext, missingFields, CORE_FIELDS, KINDS } from '../core/context.js';
import { MEDIA } from '../core/media.js';
import { adSpecEntries, adSpecGroups } from '../core/adspecs.js';
import { lintArtifact } from '../core/lint.js';
import { normalizeStyle, cmykText } from '../core/style.js';
import { FONTS, fontIds, registerCustomFont, customFontCss, CUSTOM_MARK } from '../core/fonts.js';
import { extractPalette, rolesFromKeyVisual, rolesFromSources, analyzeRegion, buildPalette, TEXT_ZONES, edgeColor, fieldFromImage } from '../core/palette.js';
import { resolveField } from '../core/field.js';
import { LAYOUT_REFS, SHAPE_LABEL, shapeOf } from '../core/layouts.js';
import { SPECS, PURPOSES, ARROWS, SIZE_PRESETS, purposesFor, optionalSpecIds, specIdsOf } from '../core/contract.js';
import { registerAll, generateArtifacts, logEvent, artifactKey } from '../core/generate.js';
import { propagate } from '../core/propagate.js';
import * as LLM from './llm.js';
import { rasterize, download, downloadText, openPrintPdf } from './raster.js';
import { agentTurn, scriptedTurn, PHASES, PHASE_LABEL, TRACKS, detectKind, detectTrack, detectMedia, fieldsFor,
  SENTENCES, SENTENCES_OPTIONAL, DATE_FIELDS, sentenceText, normDate, extractRecruit } from './agent.js';
import { measureArtifact } from './measure.js';
import { renderFit } from './adfit.js';
import { buildZip } from './zip.js';
import { parseRoster } from '../core/roster.js';
import { assessForSpecs } from '../core/imagequality.js';
import { upscale } from './upscale.js';

const FIELD_LABEL = {
  name: '행사명', date: '일시', venue: '장소', audience: '대상', cta: 'CTA',
  senderName: '발신자명', subject: '메일 제목', formFields: '등록 폼 항목', printSize: '인쇄 규격',
  ...KINDS.recruit.labels,
};
const CHANNEL_LABEL = {
  banner: '홍보 배너', edm: 'eDM', landing: '랜딩페이지', gwthumb: '그룹웨어 썸네일',
  poster: '포스터', xbanner: 'X배너', hyunsumak: '현수막', badge: '참석자 명찰', photobooth: '포토부스', ad: '매체 광고',
};
const CHANNEL_DESC = {
  banner: 'Google Ads 실적 상위 5규격', edm: '이메일 HTML', landing: '등록 폼 포함', gwthumb: '374×271 · PNG',
  poster: 'A2 · 인쇄 PDF', xbanner: '600×1800 · PDF', hyunsumak: '인쇄 PDF', badge: '110×140 · 명단 일괄',
  photobooth: '4000×2000 · 백드롭 PDF',
};
// eDM·랜딩페이지는 만들지 않는다(2026-10-02 제외). 예전에 저장한 캠페인을 열 수 있게 렌더러와 LEGACY 목록만 남긴다.
const ONLINE = ['banner', 'gwthumb'];
const LEGACY = ['edm', 'landing'];
const OFFLINE = ['poster', 'xbanner', 'hyunsumak', 'badge', 'photobooth'];
const VARIANTS = { ad: 1, banner: 3, gwthumb: 3, badge: 2, landing: 2, poster: 2, xbanner: 2, hyunsumak: 2, edm: 1, photobooth: 4 };
const DISPLAY_SCALE = { banner: 1, gwthumb: 1, badge: 0.42, edm: 0.62, landing: 0.42, poster: 0.28, xbanner: 0.1, hyunsumak: 0.05, photobooth: 0.05 };
const STORE_LS = 'mbm-campaigns';

const SAMPLES = [
  '한진정보통신 클라우드 플랫폼 엔지니어 채용 광고. 카카오 비즈보드, 자소설닷컴, 네이버에 나가요. 정규직, 서울 여의도, 10월 31일 마감.',
  '10월 15일 코엑스에서 2026 ONSITE MBM 서울 진행. 대상은 건설 구조 엔지니어, 사전등록 받아야 함. 배너, 포스터, X배너 필요해.',
  '내년 3월 킨텍스 MBM 신제품 발표회. 교량 설계 실무자 대상, 현장 데모 신청 유도. 현수막이랑 배너만.',
  '2026 ONSITE MBM 도쿄, 6월 20일, 대상 일본 파트너사. 배너와 포스터.',
];

const state = {
  intake: { kind: 'event', track: null, media: [], fields: {}, channels: [], extra: {}, kv: null, logo: null, signage: {}, sizes: {}, mode: 'light', colors: ['#0A3D91', '#11095F', '#B56705'], font: 'Pretendard', mood: '', kvReadability: null, suggests: [], step: 0 },
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
function openHtml(html) {
  const w = window.open('', '_blank');
  if (!w) { toast('팝업이 차단됐어요 — 브라우저에서 허용해 주세요'); return; }
  w.document.write(html); w.document.close();
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ═══ 생성 래퍼 — 제외 목록 · 커스텀 폰트 ═══
   generate.js는 "채널 → 그 채널의 모든 규격"으로 전개한다. 그래서 규격 하나만 켜거나 끄는 일을
   표현할 자리가 계약에 없다. 캠페인이 실제로 만드는 목록은 = 전개 결과 − campaign.excluded(키 배열)로 본다.
   왜 뺄셈인가: 더하기(포함 목록)로 두면 채널을 새로 켤 때마다 목록을 다시 채워야 하고,
   generate.js가 나중에 규격을 추가해도 캠페인이 그걸 받지 못한다. */
function excludedOf(c = state.campaign) { return new Set(c?.excluded ?? []); }
function setExcluded(set, c = state.campaign) { c.excluded = [...set]; }

function regen(c = state.campaign) {
  generateArtifacts(c);
  const ex = excludedOf(c);
  if (ex.size) c.artifacts = c.artifacts.filter(a => !ex.has(a.key ?? a.specId));
  const face = customFontCss(c.style?.fonts?.heading);
  if (face) for (const a of c.artifacts) a.html = embedFont(a.html, face);
  return c;
}

// 커스텀 폰트 @font-face 주입. 배너·eDM 렌더러는 fontLink를 부르지 않으므로(외부 CSS 정책)
// 그쪽에는 여기서 넣어 준다. 이미 들어 있으면 건드리지 않는다 — 폰트 바이트를 두 번 실을 이유가 없다.
function embedFont(html, face) {
  if (!html || html.includes(CUSTOM_MARK)) return html;
  const style = `<style>${face}</style>`;
  const i = html.indexOf('</head>');
  // 완전한 문서면 head 안에, 조각(배너)이면 맨 앞에. doctype 앞에 붙이면 쿼크 모드로 떨어진다.
  return i < 0 ? style + html : html.slice(0, i) + style + html.slice(i);
}

/* ═══ 폰트 파일 업로드 ═══
   카탈로그 4종은 CDN 웹폰트다. 행사 전용 서체는 거기 없으므로 파일을 직접 받아 끼운다.
   용량 정책 — 폰트는 산출물 HTML 한 장마다 통째로 복사된다(자기완결 대가):
     · ~1MB 초과   경고만. 한글 woff2가 보통 이 언저리라 막으면 쓸 수 있는 폰트가 없어진다.
     · 8MB 초과    거절. 서브셋 없는 ttf/otf는 20~30장이면 브라우저가 버티지 못한다.
   저장은 캠페인과 분리한다 — 캠페인 스냅샷에 폰트 바이트가 섞이면 localStorage가 한 번에 터진다. */
const FONT_FORMAT = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };
const FONT_WARN = 1_000_000, FONT_MAX = 8_000_000, FONT_STORE_MAX = 2_400_000;
const FONTS_LS = 'mbm-custom-fonts';

function readCustomFont(file) {
  return new Promise((res, rej) => {
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    const format = FONT_FORMAT[ext];
    if (!format) return rej(new Error('.woff2 · .woff · .ttf · .otf 만 받습니다'));
    if (file.size > FONT_MAX) return rej(new Error(`${(file.size / 1e6).toFixed(1)}MB — 8MB를 넘습니다. woff2로 서브셋해 올려 주세요`));
    const r = new FileReader();
    r.onerror = () => rej(new Error('파일을 읽지 못했습니다'));
    r.onload = () => {
      // 파일명에서 확장자를 떼고 id로 쓴다. 같은 폰트를 두 번 올려도 카탈로그가 늘지 않는다.
      const id = 'custom-' + file.name.replace(/\.[^.]+$/, '').replace(/[^\w가-힣-]+/g, '-').slice(0, 40);
      const rec = { id, label: `${file.name.replace(/\.[^.]+$/, '')} (첨부)`, dataUrl: r.result, format, bytes: file.size };
      registerCustomFont(rec);
      res(rec);
    };
    r.readAsDataURL(file);
  });
}

function rememberCustomFont(rec) {
  if (rec.dataUrl.length > FONT_STORE_MAX) return false;   // 캠페인 저장 공간을 폰트가 잡아먹지 않게
  try {
    const list = JSON.parse(localStorage.getItem(FONTS_LS) || '[]').filter(f => f.id !== rec.id);
    list.push(rec);
    localStorage.setItem(FONTS_LS, JSON.stringify(list));
    return true;
  } catch { return false; }
}
function restoreCustomFonts() {
  try { for (const f of JSON.parse(localStorage.getItem(FONTS_LS) || '[]')) registerCustomFont(f); } catch {}
}

// 업로드 공통 흐름 — 성공하면 등록된 id를 넘긴다. 경고·안내는 여기서 한 번만 낸다.
function pickFontFile(input, onDone) {
  const f = input.files[0];
  if (!f) return;
  readCustomFont(f).then(rec => {
    const kept = rememberCustomFont(rec);
    onDone(rec.id);
    if (rec.bytes > FONT_WARN) toast(`${rec.label} 적용 — ${(rec.bytes / 1e6).toFixed(1)}MB라 산출물 파일이 그만큼 무거워집니다`);
    else toast(`${rec.label} 적용됨`);
    if (!kept) toast('폰트가 커서 브라우저에 보관하지 못했습니다 — 캠페인을 다시 열면 다시 첨부해 주세요');
    log(`폰트 첨부: ${rec.label} (${(rec.bytes / 1e3).toFixed(0)}KB)`);
  }).catch(e => toast(e.message)).finally(() => { input.value = ''; });
}

function fontOptions(selected) {
  return fontIds().map(id => `<option value="${id}" ${id === selected ? 'selected' : ''}>${FONTS[id].label}</option>`).join('');
}

/* ═══ modal ═══ */
function modal({ title, desc, body, actions, wide = false }) {
  $('modalTitle').textContent = title;
  $('modalDesc').textContent = desc ?? '';
  $('modal').classList.toggle('wide', wide);   // 규격 목록은 420px 안에서 두 열이 나오지 않는다
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
  if (/(?<![Xx스])배너/.test(text)) channels.push('banner');
  if (/X\s?배너|엑스배너/i.test(text)) channels.push('xbanner');
  if (/포스터/.test(text)) channels.push('poster');
  if (/현수막/.test(text)) channels.push('hyunsumak');
  const kind = detectKind(text);
  if (kind === 'recruit') {
    // 브리프에 적힌 값은 읽어서 빈칸에 채워 보여 준다 — 말한 것을 다시 묻지 않는다. 적히지 않은 값은 비워 둔다.
    return { fields: extractRecruit(text), channels: [], kind, track: detectTrack(text), media: detectMedia(text) };
  }
  return { fields: out, channels: [...new Set(channels)], kind, track: detectTrack(text), media: detectMedia(text) };
}

/* ═══ 학습한 레퍼런스 ═══
   생성 규칙의 출처를 화면에 둔다 — 무엇을 보고 만들었는지 알아야 결과를 믿고 고칠 수 있다.
   user  = 사용자가 "이렇게"라고 준 소재. 형태별 레이아웃·글자 크기·여백이 여기서 나왔다(core/layouts.js)
   board = 피그마 보드에서 관찰한 매체별 실제 소재(core/design.js의 근거)
   그림은 ref/learned/ (로컬 전용, git·공개 배포 제외 — 실제 고객사 소재). 없으면 이름만 보인다. */
let refsP = null;
function loadRefs() {
  return refsP ??= fetch('../ref/learned/index.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null).then(j => j ?? {
    user: Object.entries(LAYOUT_REFS).flatMap(([shape, list]) => list.map(x => ({ ...x, shape, src: null, have: false }))), board: [],
  });
}
const REF_ORDER = ['wide', 'tall', 'tower', 'square'];
// 받침이 있으면 앞의 조사, 없으면 뒤의 조사 — "가로형은", "세로 띠는"
const josa = (word, withB, without) => { const c = String(word).trim().slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? withB : without; };
const refName = r => r.client || (r.backgroundOnly ? '배경·사진' : '');
function refThumb(r, h = 64) {
  const label = `${refName(r)} ${r.w}×${r.h}`;
  return r.have && r.src
    ? `<button type="button" class="rthumb" data-ref="${r.node}" title="${label}" aria-label="${label}"><img src="../ref/learned/${r.src}" alt="" loading="lazy" style="height:${h}px"></button>`
    : `<button type="button" class="rthumb none" data-ref="${r.node}" title="${label}" style="height:${h}px">${refName(r) || r.node}</button>`;
}
function refsFor(refs, shape) { return refs.user.filter(r => r.shape === shape && !r.backgroundOnly); }
async function openRefGallery(focusShape = null) {
  const refs = await loadRefs();
  const byShape = REF_ORDER.map(sh => [sh, refs.user.filter(r => r.shape === sh)]).filter(([, l]) => l.length);
  const media = [...new Set(refs.board.map(b => b.mediumName))];
  modal({
    title: '학습한 레퍼런스',
    desc: '위쪽 소재의 여백·글자 크기·줄 간격·이미지 자리를 재서 형태별 생성 규칙으로 씁니다. 아래쪽은 매체별 경향을 본 실제 소재입니다.',
    wide: true,
    body: `<div class="rgal">${byShape.map(([sh, l]) => `<section class="rsec ${sh === focusShape ? 'focus' : ''}" data-shape="${sh}">
        <h5>${SHAPE_LABEL[sh]} <small>${l.length}장 · 이 형태의 소재를 만들 때 따릅니다</small></h5>
        <div class="rrow">${l.map(r => `<figure>${refThumb(r, sh === 'wide' ? 74 : 150)}<figcaption>${refName(r)}<span>${r.w}×${r.h}</span></figcaption></figure>`).join('')}</div></section>`).join('')}
      ${refs.board.length ? `<section class="rsec"><h5>매체별 실제 소재 <small>${refs.board.length}장 · 그림 ${refs.board.filter(b => b.have).length}장</small></h5>
        ${media.map(mn => { const l = refs.board.filter(b => b.mediumName === mn); return `<div class="rmed"><b>${mn}</b><div class="rrow">${l.map(r => `<figure>${refThumb(r, 56)}<figcaption>${r.client}<span>${r.spec.replace(/^\S+\s/, '')}</span></figcaption></figure>`).join('')}</div></div>`; }).join('')}</section>` : ''}
      <p class="rnote">새 레퍼런스는 피그마 링크로 보내 주면 재서 규칙에 넣습니다. 앱 안에서 바로 학습하는 기능은 아직 없습니다.</p></div>`,
    actions: [{ label: '닫기', pri: true }],
  });
  const f = $('modalBody').querySelector('.rsec.focus');
  if (f) f.scrollIntoView({ block: 'start' });
}
async function renderRefSide() {
  const box = $('refSide'); if (!box) return;
  const refs = await loadRefs();
  box.innerHTML = REF_ORDER.map(sh => { const l = refsFor(refs, sh); return l.length
    ? `<button type="button" class="rside" data-shape="${sh}"><span class="rs-thumbs">${l.slice(0, 3).map(r => r.have ? `<img src="../ref/learned/${r.src}" alt="" loading="lazy">` : '').join('')}</span><b>${SHAPE_LABEL[sh]}</b><small>${[...new Set(l.map(refName))].join(' · ')}</small></button>` : ''; }).join('')
    + (refs.board.length ? `<button type="button" class="rside" data-shape=""><span class="rs-thumbs"></span><b>매체별 실제 소재</b><small>${refs.board.length}장 관찰</small></button>` : '');
  box.querySelectorAll('.rside').forEach(b => b.onclick = () => openRefGallery(b.dataset.shape || null));
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
  renderRefSide();
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
    const edits = (c.log ?? []).filter(e => e.type === 'manual_edit' || e.type === 'propagation_run').length;
    d.innerHTML = `<div class="thumb" style="background:${c.style.palette.primary}">${initial}</div>
      <div class="m"><b>${c.context.core.name ?? c.id}</b>
        <span>${c.context.core.date ?? ''} · ${c.artifacts?.length ?? 0}종${edits ? ` · 수정 ${edits}회` : ''}</span></div>
      <span class="badge ${c.status === 'approved' ? 'approved' : 'draft'}">${c.status === 'approved' ? '승인' : '작업 중'}</span>`;
    d.onclick = () => openStored(c);
    box.appendChild(d);
  }
}

/* ═══ intake — 대화 ═══ */
const CH_LIST = [...ONLINE, ...OFFLINE];

function bub(role, text) {
  const d = document.createElement('div');
  d.className = 'bub ' + role;
  if (role === 'think') {
    // 생각 중 버블만 구조를 갖는다 — 문구(시머)와 경과 초를 따로 갱신해야 하기 때문
    d.append(el('span', 'tlabel', text), el('span', 'tsec', ''));
  } else {
    d.textContent = text;
  }
  $('thread').appendChild(d);
  $('thread').scrollTop = 1e9;
  return d;
}
function el(tag, cls, text) {
  const n = document.createElement(tag);
  n.className = cls;
  n.textContent = text;
  return n;
}

// 왜: AI 응답이 수 초 걸린다. 정적 "생각하는 중…"은 멈춘 화면으로 읽혀 사용자가 답답해한다.
// 초를 세어 보여주면 "돌고 있다"는 증거가 되고, 오래 걸릴 땐 문구로 안심시킨다.
const THINK_SAY = [
  [0, '생각하는 중…'],
  [10, '조금 더 걸리고 있어요…'],   // 10초 = 사용자가 "실패했나?" 의심하기 시작하는 지점
  [25, '아직 기다리는 중이에요…'],  // 과장 없이, 살아 있다는 사실만 반복해 알린다
];
function thinkBubble() {
  const d = bub('think', THINK_SAY[0][1]);
  const label = d.querySelector('.tlabel'), sec = d.querySelector('.tsec');
  const t0 = Date.now();
  // 250ms 간격 — 1초 간격이면 초 경계가 최대 1초 늦게 넘어가 "끊긴 것처럼" 보인다
  const timer = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    // 3초 미만에서 숫자를 띄우면 오히려 기다림을 의식하게 만든다 — 늦어질 때만 노출
    sec.textContent = s >= 3 ? `${s}초` : '';
    const say = THINK_SAY.filter(([at]) => s >= at).pop()[1];
    if (label.textContent !== say) label.textContent = say;
  }, 250);
  // 제거와 타이머 정리는 항상 한 쌍 — 따로 부르면 인터벌이 남아 샌다
  return { el: d, stop() { clearInterval(timer); d.remove(); } };
}
function slot(html) {
  $('slot').innerHTML = html;
  return $('slot');
}
function clearSlot() { $('slot').innerHTML = ''; }

function renderSteps() {
  const it = state.intake;
  $('steps').innerHTML = PHASES.map(p =>
    `<span class="${p === it.phase ? 'on' : PHASES.indexOf(p) < PHASES.indexOf(it.phase) ? 'done' : ''}">${PHASE_LABEL[p]}</span>`).join('');
}

async function startIntake(text) {
  state.intake = {
    kind: 'event', track: null, media: [], fields: {}, channels: [], extra: {}, kv: null, logo: null, signage: {}, sizes: {},
    mode: 'light', colors: ['#0A3D91', '#11095F', '#B56705'], font: 'Pretendard', mood: '',
    kvReadability: null, kvMeta: null, suggests: [], roster: [], phase: 'brief', styleDone: false, signageDone: false, history: [],
    // briefDone: 빈칸 채우기 문장을 사용자가 확인했는가 · readFields: 브리프에서 읽어 채운 값(점선 밑줄로 구분)
    // specOff: 고른 매체의 소재 중 이번에 만들지 않기로 끈 것
    briefDone: false, readFields: new Set(), specOff: new Set(), pickerOpen: false, showOptional: false,
    // 로고에서 뽑은 색 · 주색을 어느 자료가 맡는가(null=자동: 로고에 색이 있으면 로고)
    logoSuggests: [], colorLead: null,
    // 지면(배경) — 기본은 키비주얼에서 읽는다. 사람이 고정하는 것은 단색/그라데이션과 직접 고른 색뿐
    bgMode: 'auto', bgColor: null,
  };
  const seed = parseBriefRegex(text);
  Object.assign(state.intake.fields, seed.fields);
  for (const k of Object.keys(seed.fields)) state.intake.readFields.add(k);
  state.intake.channels = seed.channels;
  state.intake.kind = seed.kind; state.intake.track = seed.track; state.intake.media = seed.media ?? [];
  $('thread').innerHTML = '';
  clearSlot();
  show('intake');
  renderSteps();
  bub('user', text);
  await turn(text);
}

function agentState() {
  const it = state.intake;
  return {
    phase: it.phase, kind: it.kind, track: it.track, media: it.media, fields: it.fields, channels: it.channels, kv: it.kv,
    briefDone: it.briefDone, styleDone: it.styleDone, signageDone: it.signageDone, signage: it.signage, roster: it.roster,
    style: { mode: it.mode, colors: it.colors, font: it.font },
  };
}

async function turn(userText) {
  const it = state.intake;
  it.history.push({ role: 'user', text: userText });
  const think = LLM.hasKey() ? thinkBubble() : null;
  let res;
  try {
    res = await agentTurn({ state: agentState(), history: it.history, userText });
  } catch (e) {
    // AI가 실패해도 대화는 멈추면 안 된다 — 규칙 진행자가 같은 계약으로 이어받는다
    res = scriptedTurn({ state: agentState(), userText });
    res.say = `AI 호출에 실패해 규칙 진행으로 이어갑니다.\n(${e.message})\n\n${res.say}`;
  } finally {
    // finally인 이유: 폴백까지 실패해 예외가 튀어도 인터벌은 반드시 멈춰야 한다
    think?.stop();
  }
  applyPatch(res.patch);
  // 단계는 화면의 확인이 넘긴다 — 진행자가 앞서 나가도 문장을 확인하기 전에는 '내용 확인'에 머문다.
  // 문장 확인 뒤 "알아서 해"처럼 진행자가 준비됐다고 하면 스타일은 기본값으로 확정한다.
  if (res.ready && it.briefDone) it.styleDone = true;
  it.phase = !it.briefDone ? 'brief' : !it.styleDone ? 'style' : 'draft';
  renderSteps();
  bub('agent', res.say);
  it.history.push({ role: 'agent', text: res.say });
  if (it.phase === 'draft') { buildAndGenerate(); return; }
  renderSlot({ focus: true });
}

function applyPatch(patch = {}) {
  const it = state.intake;
  if (patch.kind && KINDS[patch.kind]) it.kind = patch.kind;
  if (patch.track && TRACKS[patch.track]) it.track = patch.track;
  if (patch.media?.length) it.media = [...new Set([...(it.media ?? []), ...patch.media])];
  Object.assign(it.fields, patch.fields ?? {});
  for (const k of Object.keys(patch.fields ?? {})) it.readFields?.add(k);
  if (patch.channels?.length) it.channels = [...new Set([...it.channels, ...patch.channels])];
  if (patch.drop?.media?.length) it.media = it.media.filter(id => !patch.drop.media.includes(id));
  if (patch.drop?.channels?.length) it.channels = it.channels.filter(c => !patch.drop.channels.includes(c));
  if (patch.signage) for (const [ch, list] of Object.entries(patch.signage)) if (Array.isArray(list)) it.signage[ch] = list;
  const st = patch.style ?? {};
  if (st.mode) it.mode = st.mode;
  if (st.colors?.length) { it.colors = [st.colors[0], st.colors[1] ?? it.colors[1], st.colors[2] ?? it.colors[2]]; applyDerived(); }
  if (st.font) it.font = st.font;
  if (typeof st.mood === 'string') it.mood = st.mood;
}

// 단계에 맞는 카드만 노출한다 — 내용 확인(빈칸 채우기 문장) → 오프라인 세트 → 스타일
function renderSlot(opts = {}) {
  const it = state.intake;
  if (!it.briefDone) return slotSentence(opts);
  if (!it.signageDone && it.channels.some(c => OFFLINE_CH.includes(c))) return slotSignage();
  if (!it.styleDone) return slotStyle();
  clearSlot();
}

/* ── 빈칸 채우기 문장 ─────────────────────────────────────────────
   대화의 첫 답은 질문 목록이 아니라 "이렇게 읽었어요"라는 문단이다.
   읽은 값은 채워져 있고(점선 밑줄 = 브리프에서 읽음), 빈 곳만 눈에 띈다.
   무엇을 몇 장 만드는지도 같은 문단에서 정한다 — 누르고 나서야 장수를 아는 일이 없게. */
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mediumName = id => MEDIA.find(m => m.id === id)?.name ?? id;

// 이번에 만들 소재 — 고른 매체의 소재 묶음에서 사용자가 끈 것만 뺀다
function chosenAdGroups(it = state.intake) {
  return adSpecGroups(it.media ?? []).filter(g => !it.specOff?.has(g.id));
}
// 문장의 "무엇을" 자리
function targetOf(it) {
  if (it.kind === 'recruit' && !it.track) return { kind: 'none', n: 0, names: [] };
  if (it.kind === 'recruit' && it.track === 'online') return { kind: 'media', n: chosenAdGroups(it).length, names: it.media.map(mediumName) };
  return { kind: 'channels', n: it.channels.length, names: it.channels.map(c => CHANNEL_LABEL[c]) };
}
function briefBlanks(it) {
  const miss = fieldsFor(it.kind).filter(f => !it.fields[f]);
  const target = targetOf(it);
  return { miss, target, count: miss.length + (target.n ? 0 : 1) };
}
function whatText(it) {
  const t = targetOf(it);
  if (t.kind === 'media') return `${TRACKS.online}로 나가요. 매체는 ${t.names.join(' · ')}, 소재는 ${t.n}종이에요.`;
  return `${it.kind === 'recruit' ? TRACKS.offline + '로 만들어요. ' : ''}만들 것은 ${t.names.join(' · ')}, 모두 ${t.n}가지예요.`;
}

// 빈칸 너비는 든 글자만큼 — 문장처럼 읽히려면 칸이 글자를 따라가야 한다
function fitBlank(i) {
  const g = fitBlank.g ??= document.createElement('canvas').getContext('2d');
  const cs = getComputedStyle(i);
  g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const max = (i.closest('.sent')?.clientWidth ?? 600) - 48;
  i.style.width = Math.ceil(Math.min(max, g.measureText(i.value || i.placeholder).width + 14)) + 'px';
}

function specRow(g, it, AD) {
  const e = g.entry;
  // "PC프리미엄패키지 - PC채용공고배너" → 상품 / 지면. 같은 파일을 쓰는 상품은 한 줄에 같이 적는다.
  const split = n => { const i = n.indexOf(' - '); return i > 0 ? [n.slice(0, i), n.slice(i + 3)] : [null, n]; };
  const names = [e.rules.name ?? e.title, ...g.twins.map(id => AD[id]?.rules?.name ?? id)];
  const place = split(names[0])[1];
  const prods = names.map(n => split(n)[0]).filter(Boolean);
  const tag = prods.length ? `${prods.join(' · ')}${g.twins.length ? ' 공용' : ''}` : (g.twins.length ? `${g.twins.length + 1}곳 공용` : '');
  return `<label class="prow2"><input type="checkbox" data-s="${g.id}" ${it.specOff.has(g.id) ? '' : 'checked'}>
    <span class="pn" title="${escH(names.join(' / '))}">${escH(place)}</span>
    <span class="pd">${e.w}×${e.h}</span>
    <span class="pt">${escH(tag)}</span>
    <span class="pw">${e.confidence !== '확정' ? '확인 필요' : ''}</span></label>`;
}

function pickerHtml(it) {
  if (it.kind === 'recruit' && it.track === 'online') {
    const all = adSpecGroups(), AD = adSpecEntries();
    const chips = ['채용포털', '디지털', '커뮤니티', '기타'].map(g => {
      const ms = MEDIA.filter(m => m.group === g);
      if (!ms.length) return '';
      return `<div class="pgrp"><h5>${g}</h5><div class="chips">${ms.map(m => {
        const n = all.filter(x => x.medium === m.id).length, on = it.media.includes(m.id);
        return n
          ? `<button type="button" class="mchip ${on ? 'on' : ''}" data-m="${m.id}" aria-pressed="${on}">${escH(m.name)}<small>${n}</small></button>`
          : `<button type="button" class="mchip" disabled title="그릴 수 있는 규격이 없어요 — 매체에 자료만 전달하는 상품입니다">${escH(m.name)}<small>0</small></button>`;
      }).join('')}</div></div>`;
    }).join('');
    const lists = it.media.map(id => {
      const gs = all.filter(x => x.medium === id);
      if (!gs.length) return '';
      return `<div class="plist" data-m="${id}">
        <div class="phead"><b>${escH(mediumName(id))}</b><span data-n>${gs.length}종 중 ${gs.filter(g => !it.specOff.has(g.id)).length}종</span>
          <button type="button" class="lnk" data-all="${id}">전체</button><button type="button" class="lnk" data-none="${id}">해제</button></div>
        ${gs.map(g => specRow(g, it, AD)).join('')}</div>`;
    }).join('');
    return chips + lists;
  }
  const list = it.kind === 'recruit' ? OFFLINE : CH_LIST;
  return `<div class="chgrid">${list.map(c =>
    `<label class="chcard ${it.channels.includes(c) ? 'on' : ''}"><input type="checkbox" data-c="${c}" ${it.channels.includes(c) ? 'checked' : ''}>
      <span>${CHANNEL_LABEL[c]}<small>${CHANNEL_DESC[c]}</small></span></label>`).join('')}</div>`;
}

function slotSentence(opts = {}) {
  const it = state.intake;
  const kind = it.kind;
  const lab = f => KINDS[kind].labels[f] ?? f;
  const blank = (f, optional) => {
    const v = it.fields[f] ?? '';
    const st = v ? (it.readFields.has(f) ? 'read' : 'ok') : (optional ? 'opt' : 'empty');
    return `<input class="blank ${st}" data-f="${f}" value="${escH(v)}" placeholder="${escH(lab(f))}" aria-label="${escH(lab(f))}"${optional ? '' : ' aria-required="true"'}${st === 'read' ? ' title="브리프에서 읽은 값 — 눌러서 고칠 수 있어요"' : ''} autocomplete="off" spellcheck="false">`;
  };
  // 빈칸 바로 뒤의 조사·쉼표는 빈칸과 한 덩어리다 — 줄이 바뀌어도 "의"만 다음 줄에 떨어지지 않게 묶는다
  const para = (parts, optional) => {
    // 고정 문구도 구절째로 움직인다("채용 광고예요."가 "채용"과 "광고예요."로 갈리지 않게)
    const fixed = t => t.replace(/\S(?:.*\S)?/, m => `<span class="nb">${escH(m)}</span>`);
    let html = '';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (typeof p === 'string') { html += fixed(p); continue; }
      const next = typeof parts[i + 1] === 'string' ? parts[i + 1] : '';
      const tail = next.match(/^\S+/)?.[0] ?? '';
      html += `<span class="nb">${blank(p.f, optional)}${escH(tail)}</span>`;
      if (tail) { html += fixed(next.slice(tail.length)); i++; }
    }
    return `<p>${html}</p>`;
  };

  const tg = targetOf(it);
  const online = tg.kind === 'media';
  // 고를 것이 아직 없으면 목록을 펼쳐 둔다 — 빈칸이 막다른 길이 되지 않게
  const open = tg.kind !== 'none' && (it.pickerOpen || !tg.names.length);
  const pick = `<button type="button" class="blank pick ${tg.names.length ? 'ok' : 'empty'}" id="sPick" aria-expanded="${open}" aria-controls="sPicker">${tg.names.length ? escH(tg.names.join(' · ')) : (online ? '매체 고르기' : '만들 것 고르기')}</button>`;
  const trk = kind === 'recruit'
    ? `<select class="blank sel ${it.track ? 'ok' : 'empty'}" id="sTrack" aria-label="어디에 나가나요" aria-required="true">${it.track ? '' : '<option value="" selected disabled>어디에</option>'}${Object.entries(TRACKS).map(([k, v]) => `<option value="${k}" ${it.track === k ? 'selected' : ''}>${v}</option>`).join('')}</select>로 `
    : '';
  const what = tg.kind === 'none' ? `<p><span class="nb">${trk.trim()}</span> 나가요.</p>`
    : online ? `<p><span class="nb">${trk.trim()}</span> 나가요. 매체는 ${pick}, 소재는 <b id="sCount">${tg.n}종</b>이에요.</p>`
    : `<p>${trk ? `<span class="nb">${trk.trim()}</span> 만들어요. ` : ''}만들 것은 ${pick}, 모두 <b id="sCount">${tg.n}가지</b>예요.</p>`;
  const optional = SENTENCES_OPTIONAL[kind] ?? [];
  const keepScroll = $('slot').querySelector('.sent')?.scrollTop ?? 0;   // 다시 그려도 보던 자리 그대로

  const box = slot(`<div class="card2 sent">
    <div class="shead"><h4>읽은 내용</h4>
      <div class="kseg" role="group" aria-label="캠페인 종류">${Object.entries(KINDS).map(([k, v]) =>
        `<button type="button" data-k="${k}" class="${k === kind ? 'on' : ''}" aria-pressed="${k === kind}">${v.label}</button>`).join('')}</div></div>
    ${SENTENCES[kind].map(p => para(p, false)).join('')}
    ${it.showOptional ? optional.map(p => para(p, true)).join('') : ''}
    ${what}
    ${open ? `<div class="picker" id="sPicker">${pickerHtml(it)}</div>` : ''}
    <div class="sfoot"><span class="smsg" id="sMsg" role="status"></span>
      ${optional.length && !it.showOptional ? '<button type="button" class="btn" id="sMore">선택 항목 더하기</button>' : ''}
      <button type="button" class="btn pri" id="sOk">이대로 진행</button></div></div>`);

  const foot = () => {
    const b = briefBlanks(it);
    const bad = box.querySelector('.blank[aria-invalid="true"]');
    $('sMsg').textContent = bad ? `${lab(bad.dataset.f)}: 날짜로 읽지 못했어요 — 예: 2026-10-31, 10월 31일`
      : b.count ? `빈칸 ${b.count}곳 남았어요` : `다 채워졌어요 · ${b.target.kind === 'media' ? `소재 ${b.target.n}종` : `${b.target.n}가지`}`;
    $('sMsg').className = `smsg ${bad ? 'bad' : b.count ? '' : 'good'}`;
  };
  const rerender = focusSel => { slotSentence(); if (focusSel) $('slot').querySelector(focusSel)?.focus(); };

  const inputs = [...box.querySelectorAll('input.blank')];
  inputs.forEach(i => {
    fitBlank(i);
    i.oninput = () => {
      const f = i.dataset.f, v = i.value.trim();
      if (v) it.fields[f] = v; else delete it.fields[f];
      it.readFields.delete(f);           // 손댄 값은 더 이상 "읽은 값"이 아니다
      i.removeAttribute('aria-invalid'); i.removeAttribute('title');
      i.className = `blank ${v ? 'ok' : (i.hasAttribute('aria-required') ? 'empty' : 'opt')}`;
      fitBlank(i); foot();
    };
    // 날짜는 칸을 떠날 때 읽는다 — 치는 도중에 빨갛게 하지 않는다
    i.onblur = () => {
      const f = i.dataset.f, v = i.value.trim();
      if (!DATE_FIELDS.includes(f) || !v) return;
      const iso = normDate(v);
      if (iso) { i.value = iso; it.fields[f] = iso; fitBlank(i); }
      else i.setAttribute('aria-invalid', 'true');
      foot();
    };
    i.onkeydown = e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const rest = inputs.slice(inputs.indexOf(i) + 1).find(x => !x.value.trim() && x.hasAttribute('aria-required'));
      (rest ?? $('sOk')).focus();
    };
  });

  box.querySelectorAll('.kseg button').forEach(b => b.onclick = () => { it.kind = b.dataset.k; rerender(`.kseg [data-k="${it.kind}"]`); });
  if ($('sTrack')) $('sTrack').onchange = () => { it.track = $('sTrack').value; it.pickerOpen = true; rerender('#sPick'); };
  if ($('sPick')) $('sPick').onclick = () => { it.pickerOpen = !open; rerender('#sPick'); };
  if ($('sMore')) $('sMore').onclick = () => { it.showOptional = true; rerender('input.blank.opt'); };

  box.querySelector('.sent').scrollTop = keepScroll;
  const picker = $('sPicker');
  if (picker) {
    picker.querySelectorAll('.mchip[data-m]').forEach(b => b.onclick = () => {
      const id = b.dataset.m;
      it.media = it.media.includes(id) ? it.media.filter(x => x !== id) : [...it.media, id];
      it.pickerOpen = true;
      rerender(`.mchip[data-m="${id}"]`);
    });
    picker.querySelectorAll('input[data-s]').forEach(cb => cb.onchange = () => {
      if (cb.checked) it.specOff.delete(cb.dataset.s); else it.specOff.add(cb.dataset.s);
      // 목록은 다시 그리지 않는다 — 스크롤과 초점이 그대로여야 연달아 끌 수 있다
      const list = cb.closest('.plist'), all = list.querySelectorAll('input[data-s]');
      list.querySelector('[data-n]').textContent = `${all.length}종 중 ${[...all].filter(x => x.checked).length}종`;
      $('sCount').textContent = `${targetOf(it).n}종`;
      foot();
    });
    picker.querySelectorAll('[data-all],[data-none]').forEach(b => b.onclick = () => {
      const id = b.dataset.all ?? b.dataset.none;
      for (const g of adSpecGroups([id])) { if (b.dataset.all) it.specOff.delete(g.id); else it.specOff.add(g.id); }
      it.pickerOpen = true;
      rerender(`.plist[data-m="${id}"] [${b.dataset.all ? 'data-all' : 'data-none'}]`);
    });
    picker.querySelectorAll('input[data-c]').forEach(cb => cb.onchange = () => {
      it.channels = [...picker.querySelectorAll('input[data-c]:checked')].map(x => x.dataset.c);
      it.pickerOpen = true;
      rerender(`input[data-c="${cb.dataset.c}"]`);
    });
  }

  $('sOk').onclick = () => {
    const b = briefBlanks(it);
    const bad = box.querySelector('.blank[aria-invalid="true"]');
    if (bad) { bad.focus(); return; }
    if (b.miss.length) { box.querySelector(`input.blank[data-f="${b.miss[0]}"]`)?.focus(); toast(`${lab(b.miss[0])} 칸이 비어 있어요`); return; }
    if (!b.target.n) {
      if (b.target.kind === 'none') { $('sTrack').focus(); toast('어디에 나가는지 골라 주세요'); return; }
      it.pickerOpen = true; rerender('#sPick');
      toast(online ? '매체를 하나 이상 고르세요' : '만들 것을 하나 이상 고르세요');
      return;
    }
    // 트랙이 정한 쪽만 남긴다 — 온라인 광고로 확정했는데 전에 고른 인쇄물이 같이 만들어지면 안 된다
    if (kind === 'recruit') { if (it.track === 'online') it.channels = []; else it.media = []; }
    it.briefDone = true;
    const said = `${sentenceText(kind, it.fields)} ${whatText(it)}`;
    bub('user', said); it.history.push({ role: 'user', text: said });
    clearSlot();
    afterBrief();
  };

  foot();
  if (opts.focus) (inputs.find(x => !x.value.trim() && x.hasAttribute('aria-required')) ?? $('sOk')).focus({ preventScroll: true });
}

// 문장 확인 뒤 — 진행자를 다시 부르지 않는다(기다릴 이유가 없다). 오프라인이 있으면 세트 구성, 아니면 스타일.
function afterBrief() {
  const it = state.intake;
  if (it.channels.some(c => OFFLINE_CH.includes(c)) && !it.signageDone) {
    say('오프라인은 현장에서 여러 장이 세트로 나갑니다. 용도와 규격을 아래에서 정해 주세요 — 방향 안내는 고른 화살표마다 한 장씩 만들어집니다.');
    slotSignage();
    return;
  }
  goStyle();
}
function say(text) {
  bub('agent', text);
  state.intake.history.push({ role: 'agent', text });
}
function goStyle() {
  const it = state.intake;
  it.phase = 'style';
  renderSteps();
  say('이제 스타일이에요. 키비주얼과 로고가 있으면 올려 주세요 — 대표 컬러를 뽑아 드립니다. 없으면 컬러만 골라도 됩니다.');
  slotStyle();
}

function slotSignage() {
  const it = state.intake;
  const chans = it.channels.filter(c => OFFLINE_CH.includes(c));
  const groups = chans.map(ch => {
    const ps = purposesFor(ch);
    const cur = it.signage[ch] ?? (it.signage[ch] = [{ purpose: 'main' }]);
    const presets = SIZE_PRESETS[ch] ?? [];
    const sz = it.sizes[ch];
    return `<div class="sgroup" data-ch="${ch}">
      <div class="sh">${CHANNEL_LABEL[ch]}
        <select data-size="${ch}">${presets.map((pr, i) =>
          `<option value="${i}" ${sz ? (sz.wmm === pr.wmm && sz.hmm === pr.hmm ? 'selected' : '') : (i === 0 ? 'selected' : '')}>${pr.label}mm</option>`).join('')}</select>
      </div>
      ${ps.length ? ps.map(p => {
        const sel = cur.filter(x => x.purpose === p.id);
        const on = sel.length > 0;
        return `<div class="prow" data-p="${p.id}">
          <input type="checkbox" ${on ? 'checked' : ''}>
          <span>${p.label}</span>
          ${p.needsArrow ? `<span class="arrows">${Object.entries(ARROWS).map(([k, g]) =>
            `<button data-arrow="${k}" title="${k === 'none' ? '화살표 없이 정보만' : '방향 ' + g}" class="${sel.some(x => x.arrow === k) ? 'on' : ''}" ${on ? '' : 'disabled'}>${g || '—'}</button>`).join('')}</span>` : ''}
        </div>`;
      }).join('') : '<div class="prow"><span style="color:var(--sub);font-size:12px">규격만 정하면 됩니다</span></div>'}
    </div>`;
  }).join('');
  slot(`<div class="card2"><h4>오프라인 세트 구성</h4>${groups}
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn pri" id="sgOk">이 구성으로 진행</button></div></div>`);

  const box = $('slot');
  box.querySelectorAll('.prow input').forEach(cb => cb.onchange = () => {
    const ch = cb.closest('.sgroup').dataset.ch, pid = cb.closest('.prow').dataset.p;
    const list = it.signage[ch] ?? [];
    if (cb.checked) list.push({ purpose: pid, arrow: PURPOSES.find(p => p.id === pid)?.needsArrow ? 'right' : null });
    else it.signage[ch] = list.filter(x => x.purpose !== pid);
    slotSignage();
  });
  box.querySelectorAll('.arrows button').forEach(b => b.onclick = () => {
    const ch = b.closest('.sgroup').dataset.ch, pid = b.closest('.prow').dataset.p, ar = b.dataset.arrow;
    const list = it.signage[ch];
    const has = list.some(x => x.purpose === pid && x.arrow === ar);
    if (has) it.signage[ch] = list.filter(x => !(x.purpose === pid && x.arrow === ar));
    else list.push({ purpose: pid, arrow: ar });
    if (!it.signage[ch].some(x => x.purpose === pid)) it.signage[ch].push({ purpose: pid, arrow: 'right' });
    slotSignage();
  });
  box.querySelectorAll('select[data-size]').forEach(sel => sel.onchange = () => {
    const ch = sel.dataset.size, pr = SIZE_PRESETS[ch][+sel.value];
    it.sizes[ch] = { wmm: pr.wmm, hmm: pr.hmm };
  });
  $('sgOk').onclick = () => {
    it.signageDone = true;
    const said = chans.map(ch => {
      const n = (it.signage[ch] ?? []).length || 1;
      const sz = it.sizes[ch];
      return `${CHANNEL_LABEL[ch]} ${n}종${sz ? ` ${sz.wmm}×${sz.hmm}` : ''}`;
    }).join(', ');
    bub('user', said); it.history.push({ role: 'user', text: said });
    clearSlot(); goStyle();
  };
}

// 지면(배경) 조절 — 밝게/어둡게를 고르지 않는다. 키비주얼에서 읽은 색을 보여 주고, 단색·그라데이션 고정과 직접 고르기만 둔다.
const FIELD_SRC = { 'kv-edge': '키비주얼 가장자리 색', 'kv-colour': '키비주얼 대표색', brand: '키비주얼이 없어 브랜드 색', manual: '직접 고른 색' };
function bgControlHtml(styleLike, id) {
  const f = resolveField(styleLike, { facing: 'left' });
  const mode = styleLike.background?.mode ?? 'auto';
  return `<label>배경 <span style="color:var(--sub)">· ${FIELD_SRC[f.source] ?? ''}</span></label>
    <div class="bgrow"><span class="bgprev" style="background:${f.css}" role="img" aria-label="배경 미리보기 ${f.stops.join(' → ')}"></span>
      <div class="vseg" id="${id}Seg">${[['auto', '자동'], ['solid', '단색'], ['gradient', '그라데이션']].map(([k, v]) => `<button data-b="${k}" class="${mode === k ? 'on' : ''}" aria-pressed="${mode === k}">${v}</button>`).join('')}</div></div>
    <div class="bgrow"><label class="bgpick"><input type="color" id="${id}Color" value="${f.stops[0]}">직접 고르기</label>
      ${styleLike.background?.color ? `<button class="lnk" id="${id}Reset">키비주얼 색으로 되돌리기</button>` : ''}</div>`;
}

// 이번 캠페인에서 만들 소재들의 형태 — 형태마다 따를 레퍼런스가 다르다
function plannedShapes(it) {
  const sizes = it.kind === 'recruit' && it.track === 'online'
    ? chosenAdGroups(it).map(g => [g.entry.w, g.entry.h])
    : specIdsFor(it.channels).map(id => SPECS[id]).filter(sp => sp?.unit === 'px' && sp.w && sp.h).map(sp => [sp.w, sp.h]);
  const n = {};
  for (const [w, h] of sizes) { const sh = shapeOf(w, h); n[sh] = (n[sh] ?? 0) + 1; }
  return n;
}
async function renderRefPlan(it) {
  const box = $('refPlan'); if (!box) return;
  const refs = await loadRefs(), n = plannedShapes(it);
  const rows = REF_ORDER.filter(sh => n[sh]).map(sh => {
    const l = refsFor(refs, sh);
    return `<div class="rplan"><div class="rp-h"><b>${SHAPE_LABEL[sh]}</b><span>${n[sh]}종</span></div>${l.length
      ? `<div class="rrow">${l.slice(0, 3).map(r => refThumb(r, sh === 'wide' ? 40 : 84)).join('')}</div><small>${[...new Set(l.map(refName))].join(' · ')}의 레이아웃을 따릅니다</small>`
      : `<small>이 형태의 레퍼런스가 아직 없어요 — 세로형 규칙을 줄여서 씁니다</small>`}</div>`;
  });
  if (n.strip) rows.push(`<div class="rplan"><div class="rp-h"><b>${SHAPE_LABEL.strip}</b><span>${n.strip}종</span></div><small>높이 120px 미만 — 레퍼런스가 없어 한 줄 띠 문법을 씁니다</small></div>`);
  box.innerHTML = rows.length ? `<label>따라 만들 레퍼런스 <button type="button" class="lnk" id="refAll">전체 보기</button></label><div class="rplans">${rows.join('')}</div>` : '';
  box.querySelectorAll('.rthumb').forEach(b => b.onclick = () => openRefGallery(refs.user.find(r => r.node === b.dataset.ref)?.shape));
  $('refAll')?.addEventListener('click', () => openRefGallery());
}

function slotStyle() {
  const it = state.intake;
  const adStyle = { palette: { primary: it.colors[0] }, keyVisual: it.kv, kvMeta: it.kvMeta, background: { mode: it.bgMode, color: it.bgColor } };
  slot(`<div class="card2"><h4>그래픽 가이드</h4>
    <div class="styleRow">
      <div><div class="kvthumb" id="kvThumb" style="${it.kv ? `background-image:url(${it.kv})` : ''}">${it.kv ? '' : '키비주얼<br>(선택)'}</div>
        <input type="file" id="kvFile" accept="image/*" style="display:none"></div>
      <div><div class="kvthumb logo" id="logoThumb" style="${it.logo ? `background-image:url(${it.logo})` : ''}">${it.logo ? '' : '로고<br>(선택)'}</div>
        <input type="file" id="logoFile" accept="image/*" style="display:none"></div>
      <div><div class="kvthumb logo dark" id="logoLightThumb" title="어두운 지면(브랜드색 배경)에 올라갈 흰색 로고. 없으면 원색 로고를 반전해서 씁니다 — 컬러 로고는 뭉개집니다" style="${it.logoLight ? `background-image:url(${it.logoLight})` : ''}">${it.logoLight ? '' : '흰색 로고<br>(다크용)'}</div>
        <input type="file" id="logoLightFile" accept="image/*" style="display:none"></div>
      <div class="f" style="flex:1;min-width:210px">
        ${bgControlHtml(adStyle, 'bg')}
        <label style="margin-top:10px">브랜드 컬러 <span id="kvHint" style="color:var(--gen1)"></span></label>
        <div class="palette">
          <span class="sw"><input type="color" class="swatch" id="c1" value="${it.colors[0]}"><small>주색</small></span>
          <span class="sw"><input type="color" class="swatch" id="c2" value="${it.colors[1]}"><small>보조</small></span>
          <span class="sw"><input type="color" class="swatch" id="c3" value="${it.colors[2]}"><small>포인트</small></span>
        </div>
        <div id="suggests" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div>
        <div id="dpiBox" style="margin-top:8px"></div>
        <label style="margin-top:10px">폰트</label>
        <select id="fontSel" style="width:100%;padding:8px;border:1px solid var(--line);border-radius:8px">${fontOptions(it.font)}</select>
        <button class="btn" id="fontUp" style="width:100%;margin-top:6px">폰트 파일 첨부 (woff2 · ttf · otf)</button>
        <input type="file" id="fontFile" accept=".woff2,.woff,.ttf,.otf" style="display:none">
      </div>
    </div>
    <div id="refPlan" class="refPlan"></div>
    <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn pri" id="stOk">이 스타일로 진행</button></div></div>`);
  renderRefPlan(it);
  $('fontSel').value = it.font;
  $('fontSel').onchange = () => { it.font = $('fontSel').value; };
  $('fontUp').onclick = () => $('fontFile').click();
  $('fontFile').onchange = () => pickFontFile($('fontFile'), id => { it.font = id; slotStyle(); });
  // 손으로 고른 색은 다시 덮지 않는다 — 모드를 바꿨다고 방금 고른 색이 사라지면 신뢰를 잃는다
  ['c1', 'c2', 'c3'].forEach((id, i) => { $(id).oninput = () => { it.colors[i] = $(id).value.toUpperCase(); it.colorsManual = true; }; });
  $('bgSeg')?.querySelectorAll('button').forEach(b => b.onclick = () => { it.bgMode = b.dataset.b; slotStyle(); });
  if ($('bgColor')) $('bgColor').onchange = () => { it.bgColor = $('bgColor').value.toUpperCase(); slotStyle(); };
  if ($('bgReset')) $('bgReset').onclick = () => { it.bgColor = null; slotStyle(); };
  renderSuggests();
  renderDpi();
  bindUpload($('kvThumb'), $('kvFile'), async d => {
    it.kv = d;
    $('kvHint').textContent = '분석 중…';
    try {
      const { suggests, readability, meta } = await analyzeKeyVisual(d);
      it.suggests = suggests; it.kvReadability = readability; it.kvMeta = meta;
      it.colorsManual = false;   // 새 키비주얼이 들어왔으면 색은 그 이미지 기준으로 다시 잡는다
      applyDerived(); slotStyle();
      announceDpi();
      bub('agent', (leadOf(it) === 'logo'
        ? `주색은 로고 색(${it.colors[0]}) 그대로 두고, 보조·포인트를 키비주얼에서 뽑았어요 — ${it.colors.slice(1).join(', ')}.`
        : `키비주얼에서 뽑은 색을 주색·보조·포인트에 배치했어요 — ${it.colors.join(', ')}.`)
        + '\n배경은 키비주얼에서 읽은 색으로 깔고, 글자색은 그 배경에 맞춰 정했어요. 배경색은 아래에서 바꿀 수 있어요.');
    } catch { $('kvHint').textContent = ''; }
  });
  bindUpload($('logoThumb'), $('logoFile'), async d => {
    it.logo = d;
    try { it.logoSuggests = await analyzeLogo(d); } catch { it.logoSuggests = []; }
    it.colorsManual = false;   // 새 로고가 들어왔으면 색은 그 로고 기준으로 다시 잡는다
    it.colorLead = null;
    applyDerived(); slotStyle();
    say(it.logoSuggests.length
      ? `로고에서 ${it.logoSuggests[0]}를 뽑아 주색으로 잡았어요.${it.suggests.length ? ' 보조·포인트는 키비주얼 색을 그대로 씁니다.' : ''}`
      : it.suggests.length ? '로고가 검정·흰색 계열이라 뽑을 색이 없어요 — 색은 키비주얼에서 가져왔습니다.'
        : '로고가 검정·흰색 계열이라 뽑을 색이 없어요 — 키비주얼을 올리거나 컬러를 직접 골라 주세요.');
  });
  bindUpload($('logoLightThumb'), $('logoLightFile'), d => { it.logoLight = d; });
  $('stOk').onclick = () => {
    it.styleDone = true;
    const said = `배경 ${FIELD_SRC[resolveField(adStyle, { facing: 'left' }).source]} · ${FONTS[it.font].label}${it.kv ? ' · 키비주얼 첨부' : ''}`;
    bub('user', said); it.history.push({ role: 'user', text: said });
    clearSlot();
    it.phase = 'draft';
    renderSteps();
    const n = it.track === 'online' && it.kind === 'recruit' ? chosenAdGroups(it).length : 0;
    const ns = plannedShapes(it);
    const follow = REF_ORDER.filter(sh => ns[sh] && LAYOUT_REFS[sh]?.some(r => !r.backgroundOnly))
      .map(sh => `${SHAPE_LABEL[sh]}${josa(SHAPE_LABEL[sh], '은', '는')} ${[...new Set(LAYOUT_REFS[sh].filter(r => !r.backgroundOnly).map(r => r.client))].join('·')}`).join(', ');
    say((n ? `준비가 끝났어요. 소재 ${n}종을 만들고, 만드는 대로 매체 규정에 맞는지 검사할게요.` : '준비가 끝났어요. 초안을 생성할게요.')
      + (follow ? `\n레이아웃과 글자 크기는 학습한 레퍼런스를 따릅니다 — ${follow}.` : ''));
    buildAndGenerate();
  };
}

// 선택한 산출물 중 가장 빡빡한 규격을 기준으로 키비주얼 해상도를 판정한다.
function currentAssessment() {
  const it = state.intake;
  if (!it.kvMeta?.px) return null;
  const specs = specIdsFor(it.channels).map(id => {
    const s = { ...SPECS[id] };
    const sz = it.sizes[s.channel];
    if (sz?.wmm) { s.wmm = sz.wmm; s.hmm = sz.hmm; }
    return s;
  });
  const a = assessForSpecs(it.kvMeta.px[0], it.kvMeta.px[1], specs);
  return a.level === 'na' ? null : a;
}

const DPI_TONE = { ok: 'var(--good)', fixable: 'var(--amber)', weak: 'var(--amber)', hopeless: 'var(--danger)' };

function renderDpi() {
  const box = $('dpiBox');
  if (!box) return;
  const a = currentAssessment();
  if (!a) { box.innerHTML = ''; return; }
  const canFix = a.level === 'fixable' || a.level === 'weak';
  box.innerHTML = `<div style="font-size:11.5px;line-height:1.55;color:${DPI_TONE[a.level]}">${a.text}</div>` +
    (canFix ? `<button class="btn" id="upBtn" style="margin-top:6px">해상도 올리기 (${a.targetW}×${a.targetH})</button>` : '');
  box.querySelector('#upBtn')?.addEventListener('click', () => doUpscale(a));
}

function announceDpi() {
  const a = currentAssessment();
  if (!a || a.level === 'ok') return;
  bub('agent', `키비주얼 해상도를 확인했어요. ${a.text}`);
}

async function doUpscale(a) {
  const it = state.intake;
  const btn = $('upBtn');
  if (btn) { btn.disabled = true; btn.textContent = '확대 중…'; }
  try {
    const r = await upscale(it.kv, a.targetW, a.targetH);
    it.kv = r.dataUrl;
    it.kvMeta = { ...it.kvMeta, px: [r.w, r.h] };
    slotStyle();
    bub('agent', r.capped
      ? `${r.w}×${r.h}px까지만 키웠어요 — 목표 ${r.askedW}px는 브라우저 캔버스 한계를 넘습니다(${r.steps}단계 리샘플링).\n이 규격을 제대로 채우려면 더 큰 원본이 필요합니다.`
      : `${r.w}×${r.h}px로 키웠어요(${r.steps}단계 리샘플링). 인쇄 규격은 채우지만, 없던 디테일이 생기지는 않습니다 — 원본이 있으면 그쪽이 항상 낫습니다.`);
    log(`키비주얼 확대 ${r.w}×${r.h}`);
  } catch (e) {
    toast(`확대 실패: ${e.message}`);
    if (btn) { btn.disabled = false; btn.textContent = '해상도 올리기'; }
  }
}

// 색 세 자리를 다시 배치한다.
// 키비주얼이 있으면 세 자리 모두 그 이미지에서 뽑은 색으로 채운다 —
// 한 색만 쓰고 나머지를 색상환에서 돌려 만들면 보조·포인트가 키비주얼에 없던 색이 되어 겉돈다.
function applyDerived() {
  const it = state.intake;
  if (it.colorsManual) return;                       // 손으로 고른 색이 있으면 건드리지 않는다
  const roles = rolesFromSources({ logo: it.logoSuggests, kv: it.suggests, lead: leadOf(it) }, it.mode);
  if (roles) { it.colors = roles; return; }
  const auto = buildPalette({ primary: it.colors[0], mode: it.mode });
  it.colors[1] = auto.secondary;
  it.colors[2] = auto.accent;
}

// 주색을 맡는 자료 — 사용자가 고르지 않았으면 로고(색이 뽑혔을 때), 아니면 키비주얼
function leadOf(it) {
  if (it.colorLead === 'kv' && it.suggests?.length) return 'kv';
  return it.logoSuggests?.length ? 'logo' : 'kv';
}

function renderSuggests() {
  const it = state.intake;
  const box = $('suggests');
  if (!box) return;
  const L = it.logoSuggests ?? [], K = it.suggests ?? [];
  const lead = leadOf(it);
  if ($('kvHint')) {
    $('kvHint').textContent = L.length && K.length ? (lead === 'logo' ? '· 주색은 로고, 나머지는 키비주얼에서' : '· 키비주얼에서 추출해 배치')
      : L.length ? '· 로고에서 추출해 배치' : K.length ? '· 키비주얼에서 추출해 배치' : '';
  }
  const chips = (list, src, label) => list.length
    ? `<span class="sgrp"><small>${label}</small>${list.map(c =>
      `<button class="sugg" data-c="${c}" data-src="${src}" aria-label="${label} 색 ${c}을 주색으로"><i style="background:${c}"></i>${c}</button>`).join('')}</span>` : '';
  box.innerHTML = chips(L, 'logo', '로고') + chips(K, 'kv', '키비주얼');
  // 후보를 누르면 그 색이 주색으로 올라오고 나머지 자리가 다시 배치된다.
  // (주색만 바꾸고 나머지를 그대로 두면 세 색이 서로 맞지 않는 조합이 남는다)
  box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    const c = b.dataset.c;
    if (b.dataset.src === 'logo') { it.logoSuggests = [c, ...L.filter(x => x !== c)]; it.colorLead = 'logo'; }
    else { it.suggests = [c, ...K.filter(x => x !== c)]; it.colorLead = 'kv'; }
    it.colorsManual = false;
    applyDerived(); slotStyle();
  });
}

// 대화 입력
$('cvGo').onclick = () => {
  const t = $('cvIn').value.trim();
  if (!t) return;
  $('cvIn').value = '';
  bub('user', t);
  clearSlot();
  turn(t);
};
$('cvIn').onkeydown = e => { if (e.key === 'Enter') $('cvGo').click(); };
$('cvFile').onclick = () => $('cvFileIn').click();
$('cvFileIn').onchange = () => {
  const f = $('cvFileIn').files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    state.intake.kv = r.result;
    bub('user', `키비주얼 첨부: ${f.name}`);
    analyzeKeyVisual(r.result).then(({ suggests, readability, meta }) => {
      state.intake.suggests = suggests; state.intake.kvReadability = readability; state.intake.kvMeta = meta;
      state.intake.colorsManual = false;
      applyDerived();
      bub('agent', `색을 배치했어요 — 주색 ${state.intake.colors[0]} · 보조 ${state.intake.colors[1]} · 포인트 ${state.intake.colors[2]}.${leadOf(state.intake) === 'logo' ? ' 주색은 로고 색입니다.' : ''}`);
      if (state.intake.phase === 'style') slotStyle();
    }).catch(() => {});
  };
  r.readAsDataURL(f);
};

const EXTRA_FIELDS = { edm: ['senderName', 'subject'], landing: ['formFields'], poster: ['printSize'], xbanner: ['printSize'], hyunsumak: ['printSize'], photobooth: ['printSize'] };
const OFFLINE_CH = ['poster', 'xbanner', 'hyunsumak', 'badge', 'photobooth'];

function bindUpload(thumb, file, set) {
  thumb.onclick = () => file.click();
  file.onchange = () => {
    const f = file.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { set(r.result); thumb.style.backgroundImage = `url(${r.result})`; thumb.innerHTML = ''; };
    r.readAsDataURL(f);
  };
}

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
  const suggests = extractPalette(data, 3);
  // field·colors: 소재의 지면색을 이 이미지에서 읽기 위한 실측(core/field.js) — 가장자리 색과 대표색
  const meta = { ar: img.width / img.height, edge: edgeColor(data, W, H), px: [img.width, img.height], field: fieldFromImage(data, W, H), colors: suggests };
  return { suggests, readability, meta };
}

// 로고의 대표색 — 투명·흰 바탕·검정 글자는 extractPalette가 건너뛴다. 무채색 로고면 빈 배열.
async function analyzeLogo(dataUrl) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const W = 240, H = Math.max(1, Math.round(W * (img.height || 1) / (img.width || 1)));
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  return extractPalette(g.getImageData(0, 0, W, H).data, 3);
}
// 작업 화면에서 자료를 갈아 끼울 때 — 지금 걸려 있는 로고·키비주얼에서 세 자리를 다시 읽는다
async function rolesFromAssets({ logo, keyVisual, mode, kvColors = null }) {
  let L = [], K = kvColors ?? [];
  try { if (logo) L = await analyzeLogo(logo); } catch {}
  try { if (!kvColors && keyVisual) K = (await analyzeKeyVisual(keyVisual)).suggests; } catch {}
  return { roles: rolesFromSources({ logo: L, kv: K }, mode), fromLogo: L.length > 0, fromKv: K.length > 0 };
}

function specIdsFor(channels) {
  return Object.entries(SPECS).filter(([, s]) => channels.includes(s.channel)).map(([id]) => id);
}

/* ═══ 생성 → 아트보드 ═══ */
// 캠페인 이름 — 행사는 행사명, 채용은 고객사+직무
function campaignName(ctx) {
  const c = ctx?.core ?? {};
  return ctx?.kind === 'recruit' ? [c.client, c.role].filter(Boolean).join(' ') || '채용 캠페인' : (c.name || '캠페인');
}
function campaignFields(c) {
  return c.kind === 'recruit' ? KINDS.recruit.required : ['name', 'date', 'venue', 'cta'];
}
function slug(name) {
  return (name || 'campaign').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
}
function buildAndGenerate() {
  const it = state.intake;
  let ctx = createContext(it.fields, it.kind);
  const extraPatch = {};
  for (const ch of it.channels) for (const f of EXTRA_FIELDS[ch] ?? []) (extraPatch[ch] ??= {})[f] = it.extra[ch]?.[f] || '기본';
  ctx = updateContext(ctx, { channelFields: extraPatch });
  const style = normalizeStyle({
    keyVisual: it.kv,
    kvReadability: it.kvReadability,
    kvMeta: it.kvMeta,
    logo: it.logo,
    logoLight: it.logoLight ?? null,
    mode: it.mode,
    background: { mode: it.bgMode ?? 'auto', color: it.bgColor ?? null },
    colors: it.colors,
    fonts: { heading: it.font, body: it.font },
    mood: it.mood.split(',').map(s => s.trim()).filter(Boolean),
  });
  const signage = {};
  for (const [ch, list] of Object.entries(it.signage)) if (it.channels.includes(ch) && list.length) signage[ch] = list;
  state.campaign = {
    id: slug(campaignName(ctx)), context: ctx, style, channels: it.channels, signage,
    // 문장에서 고른 소재만 — 같은 파일을 쓰는 상품은 한 장으로 묶여 있다(adSpecGroups)
    kind: it.kind, track: it.track, media: it.media ?? [], adSpecIds: chosenAdGroups(it).map(g => g.id),
    roster: it.roster ?? [], artifacts: [], log: [],
    // 첫 생성은 권장 규격만. 나머지(Google Ads 선택 규격·포토월 등)는 켜 두면 20장이 깔린다 —
    // 아트보드의 "+ 산출물 추가"에서 필요할 때 꺼내 쓴다.
    excluded: optionalSpecIds(it.channels),
  };
  logEvent(state.campaign, 'campaign_created', {});
  registerAll();
  regen();
  for (const a of state.campaign.artifacts) {
    // 인테이크에서 고른 규격은 채널 단위다. 한 채널에 성격이 다른 규격이 섞여 있으면
    // (포토부스 2:1 ↔ 포토월) 자기 프리셋을 가진 쪽은 채널 값을 물려받지 않는다.
    const sz = it.sizes[a.specId] ?? (SIZE_PRESETS[a.specId] ? null : it.sizes[a.channel]);
    if (sz?.wmm && sz?.hmm) a.size = { wmm: sz.wmm, hmm: sz.hmm };
  }
  regen();
  saveCampaignToStore();   // 생성 즉시 남긴다 — 여기서 이탈해도 잃지 않는다
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
  $('campPill').textContent = campaignName(state.campaign.context);
  $('logBody').innerHTML = ''; $('logCount').textContent = '';
  state.selected = null;
  resetHistory();       // 캠페인이 바뀌면 이전 캠페인의 되돌리기 이력은 의미가 없다
  toggleHelp(false);
  layoutArtboard({ blank: !!opts.staged });
  renderInspector();
  fitZoom();
  if (opts.staged) revealStaged();
  scheduleLint();
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
  if (spec.channel === 'banner' || spec.channel === 'ad') return [spec.w, spec.h];
  if (spec.channel === 'edm') return [600, 900];
  return [1000, 1400];
}

function layoutArtboard(opts = {}) {
  const board = $('artboard');
  board.innerHTML = '';
  frames.clear();
  const c = state.campaign;
  // 줄 구성: 매체 광고는 매체마다 한 줄 → 온라인 채널 한 줄 → 오프라인 한 줄
  const adRows = (c.media ?? []).map(m => c.artifacts.filter(a => a.channel === 'ad' && SPECS[a.specId]?.medium === m)).filter(r => r.length);
  const rows = [...adRows, [...ONLINE, ...LEGACY].flatMap(ch => c.artifacts.filter(a => a.channel === ch)), OFFLINE.flatMap(ch => c.artifacts.filter(a => a.channel === ch))];
  let y = 60;
  for (const rowArts of rows) {
    if (!rowArts.length) continue;
    let x = 60, rowH = 0;
    {
      for (const a of rowArts) {
        const ch = a.channel;
        const spec = effSpec(a);
        const [nw, nh] = naturalSize(spec);
        // 매체 규격은 1029×258부터 1440×976까지 제각각 — 한 줄에 놓이도록 폭·높이 상한으로 맞춘다
        const ds = ch === 'ad' ? Math.min(1, 460 / nw, 300 / nh) : (DISPLAY_SCALE[ch] ?? 1);
        const w = nw * ds, h = nh * ds;
        const frame = document.createElement('div');
        frame.className = 'frame';
        frame.style.left = x + 'px'; frame.style.top = y + 'px';
        frame.innerHTML = `
          <div class="flabel"><span class="fname">${opts.blank ? '생성 중…' : artLabel(a)}</span><span class="badge ${a.status}">${badgeText(a.status)}</span><span class="badge lint" style="display:none"></span></div>
          <div class="fbody" style="width:${w}px;height:${h}px">
            <iframe width="${nw}" height="${nh}" style="transform:scale(${ds})"></iframe>
            <div class="hit"></div>
          </div>`;
        const iframe = frame.querySelector('iframe');
        if (opts.blank) iframe.style.visibility = 'hidden'; else iframe.srcdoc = a.html;
        frame.querySelector('.hit').onclick = e => { e.stopPropagation(); select(a.key ?? a.specId); };
        board.appendChild(frame);
        frames.set(a.key ?? a.specId, { frame, iframe, badge: frame.querySelector('.badge'), lint: frame.querySelector('.badge.lint'), label: frame.querySelector('.fname') });
        lintBadge(a);
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
// 규격 이름 — 배너가 5종에서 14종으로 늘었고 포토부스·포토월이 채널을 공유한다.
// 채널 이름만 쓰면 아트보드에 같은 라벨이 여러 장 깔려 무엇을 고쳤는지 알 수 없다.
function specSize(spec, size = null) {
  if (size?.wmm) return `${size.wmm}×${size.hmm}mm`;
  if (spec.unit === 'mm') return `${spec.wmm}×${spec.hmm}mm`;
  return spec.w && spec.h ? `${spec.w}×${spec.h}` : '';
}
// 같은 파일을 쓰는 다른 상품이 있으면 라벨에 밝힌다 — 한 장이 두 상품에 나간다는 걸 검수자가 알아야 한다
function twinNote(specId) {
  const twins = (twinNote.map ??= new Map(adSpecGroups().map(g => [g.id, g.twins]))).get(specId) ?? [];
  const shared = twins.filter(id => !(state.campaign?.adSpecIds ?? []).includes(id));
  return shared.length ? ` · 상품 ${shared.length + 1}곳 공용` : '';
}
function artLabel(a) {
  const spec = SPECS[a.specId];
  if (!spec) return a.specId;
  const sz = specSize(spec, a.size);
  const pur = a.purpose && a.purpose !== 'main'
    ? ` · ${PURPOSE_SHORT[a.purpose]}${a.arrow ? ' ' + (ARROWS[a.arrow] ?? '') : ''}` : '';
  return `${spec.title ?? CHANNEL_LABEL[a.channel] ?? a.specId}${pur}${sz ? ` · ${sz}` : ''}${a.channel === 'ad' ? twinNote(a.specId) : ''}`;
}
// 규격 프리셋은 채널 단위가 기본이지만, 자기 프리셋을 가진 규격은 그쪽이 우선한다
function presetsFor(a) { return SIZE_PRESETS[a.specId] ?? SIZE_PRESETS[a.channel] ?? []; }
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
    if (a.channel === 'ad') a.lint = null;   // 다시 그렸으니 이전 판정은 무효 — 다시 잰다
    lintBadge(a);
  }
  scheduleLint();
}

/* ═══ 규격 검사 (매체 광고) ═══
   그린 뒤 실제로 재서 판정한다(불변식 ⑥ — 위반은 조용히 넘기지 않는다). 측정은 래스터까지 하므로 비동기·순차. */
function lintBadge(a) {
  const f = frames.get(a.key ?? a.specId);
  if (!f?.lint) return;
  if (a.channel !== 'ad') { f.lint.style.display = 'none'; return; }
  const L = a.lint;
  f.lint.style.display = '';
  if (!L) { f.lint.className = 'badge lint'; f.lint.textContent = '검사 중…'; return; }
  f.lint.className = 'badge lint ' + L.level;
  f.lint.textContent = L.level === 'pass' ? '규격 통과' : `${L.level === 'block' ? '차단' : '경고'} ${L.issues.length}`;
}
function lintHtml(a) {
  const L = a.lint;
  if (!L) return '<div style="font-size:11.5px;color:var(--sub)">규격 검사 중…</div>';
  if (!L.issues.length) return '<div style="font-size:11.5px;color:var(--good);font-weight:600">규격 통과 — 치수·포맷·용량·글자수·색 모두 규정 안</div>';
  return `<ul style="margin:4px 0 0;padding-left:16px;font-size:11.5px;line-height:1.5">${L.issues.map(i =>
    `<li style="color:${i.level === 'block' ? 'var(--danger)' : 'var(--amber)'}">${i.msg}</li>`).join('')}</ul>`;
}
let lintRun = 0;
async function lintAds() {
  const c = state.campaign; if (!c) return;
  const run = ++lintRun;
  for (const a of c.artifacts.filter(a => a.channel === 'ad' && !a.lint)) {
    if (run !== lintRun) return;    // 그 사이 다시 그려졌으면 이 판정은 버린다
    const spec = SPECS[a.specId]; if (!spec?.rules) continue;
    try {
      const m = await measureArtifact(a.html, spec);
      a.lint = lintArtifact({ spec: spec.rules, medium: spec.mediumRules, measure: m });
    } catch (e) {
      a.lint = { level: 'warn', issues: [{ level: 'warn', code: 'measure', msg: `측정 실패: ${e.message}` }] };
    }
    lintBadge(a);
    if (state.selected === (a.key ?? a.specId)) { const box = $('inspLint'); if (box) box.innerHTML = lintHtml(a); }
  }
  const blocked = c.artifacts.filter(a => a.lint?.level === 'block').length;
  if (blocked) log(`규격 검사: 차단 ${blocked}건 — 승인 전에 해결 필요`);
}
const scheduleLint = debounce(() => lintAds(), 400);

/* zoom · pan */
function applyTransform() {
  $('artboard').style.transform = `translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
  $('zoomPct').textContent = Math.round(state.zoom * 100) + '%';
}
function setZoom(z, cx, cy) {
  z = Math.min(8, Math.max(0.05, z));   // 인쇄물 실측 확인엔 800%까지 필요하다
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

/* ═══ 되돌리기 · 다시하기 ═══
   왜 역연산이 아니라 스냅샷인가: 되돌릴 편집이 제각각(전파·개별 override·스타일·규격·시안·명단)이라
   종류마다 반대 동작을 따로 짜면 편집이 하나 늘 때마다 반드시 빠뜨린다. 캠페인 상태를 통째로 되감는 쪽이 안전하다.
   무엇을 빼고 저장하나:
   · artifacts[].html — 렌더 결과(파생물). 스냅샷 하나가 수 MB가 되므로 빼고, 복원 후 generateArtifacts로 다시 만든다.
   · keyVisual·logo(data URL) — 문자열은 불변이라 복제하지 않고 참조만 옮겨도 안전하다. 30장을 복제하면 메모리가 터진다.
   · campaign.log — 감사 기록이라 되돌리지 않는다. "했다가 되돌렸다"는 사실도 이력이다. */
const HIST_MAX = 30;
const hist = { undo: [], redo: [] };

function cloneCampaign(c) {
  const { style, artifacts, log, ...rest } = c;
  const { keyVisual = null, logo = null, ...styleRest } = style;
  const out = structuredClone({
    ...rest,
    style: styleRest,
    artifacts: artifacts.map(({ html, ...a }) => a),
  });
  out.style.keyVisual = keyVisual;
  out.style.logo = logo;
  return out;
}
// 지금 상태를 한 장 뜬다. selected까지 담는 이유: 되돌린 뒤 인스펙터가 엉뚱한 산출물을 보고 있으면 혼란스럽다
function takeSnapshot(label) {
  return { label, campaign: cloneCampaign(state.campaign), selected: state.selected };
}
// 편집 "직전"에 부른다 — 되돌리기가 돌아갈 지점이 곧 이 시점이다.
// coalesce: 연속 조작(타이핑·컬러피커 드래그)은 한 걸음으로 묶는다.
// 그렇지 않으면 색 하나 고르는 동안 스택 30칸이 미세 단계로 차 버리고, 되돌리기를 열 번 눌러야 원래 색으로 간다.
let lastPush = { label: null, at: 0 };
function pushHistory(label, coalesce = false) {
  if (!state.campaign) return;
  const now = Date.now();
  if (coalesce && hist.undo.length && lastPush.label === label && now - lastPush.at < 1200) { lastPush.at = now; return; }
  lastPush = { label, at: now };
  hist.undo.push(takeSnapshot(label));
  if (hist.undo.length > HIST_MAX) hist.undo.shift();
  hist.redo.length = 0;   // 새 편집이 들어오면 다시하기 갈래는 버린다 — 갈라진 미래는 되살릴 수 없다
  renderHistBtns();
}
function resetHistory() { hist.undo.length = 0; hist.redo.length = 0; lastPush = { label: null, at: 0 }; renderHistBtns(); }

function applySnapshot(entry) {
  lastPush = { label: null, at: 0 };   // 되돌린 직후의 편집은 되돌리기 전 걸음과 묶으면 안 된다
  // 같은 스냅샷이 여러 번 되살아날 수 있다(되돌리기↔다시하기 왕복) — 매번 새로 복제해야
  // generateArtifacts가 html·log를 얹으면서 원본을 오염시키지 않는다
  const c = cloneCampaign(entry.campaign);
  c.log = state.campaign.log;    // 로그는 현재 것을 그대로 이어 쓴다
  state.campaign = c;
  regen(c);          // html은 파생물 — 여기서 다시 만들어진다
  layoutArtboard();              // 규격·명단이 바뀌었으면 프레임 크기·개수 자체가 달라진다
  const alive = c.artifacts.some(a => (a.key ?? a.specId) === entry.selected);
  select(alive ? entry.selected : null);
  autosave();
}

function undo() {
  if (!hist.undo.length) return;
  const entry = hist.undo.pop();
  hist.redo.push(takeSnapshot(entry.label));   // 되돌리기 직전 상태 = 다시하기의 목적지
  applySnapshot(entry);
  renderHistBtns();
  log(`되돌리기: ${entry.label}`);
  toast(`되돌림 — ${entry.label}`);
}
function redo() {
  if (!hist.redo.length) return;
  const entry = hist.redo.pop();
  hist.undo.push(takeSnapshot(entry.label));
  applySnapshot(entry);
  renderHistBtns();
  log(`다시하기: ${entry.label}`);
  toast(`다시 적용 — ${entry.label}`);
}

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const KEYS = { undo: IS_MAC ? '⌘Z' : 'Ctrl+Z', redo: IS_MAC ? '⇧⌘Z' : 'Ctrl+Shift+Z' };

// 무엇이 되돌려질지 버튼에 미리 적어 둔다 — "눌러 봐야 아는" 되돌리기는 무섭다
function renderHistBtns() {
  const u = $('hUndo'), r = $('hRedo');
  if (!u || !r) return;
  u.disabled = !hist.undo.length;
  r.disabled = !hist.redo.length;
  u.title = hist.undo.length ? `되돌리기 — ${hist.undo.at(-1).label} (${KEYS.undo})` : `되돌릴 작업 없음 (${KEYS.undo})`;
  r.title = hist.redo.length ? `다시하기 — ${hist.redo.at(-1).label} (${KEYS.redo})` : `다시할 작업 없음 (${KEYS.redo})`;
}
$('hUndo').onclick = undo;
$('hRedo').onclick = redo;

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') toggleHelp(false);
  if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
  if (!state.campaign || $('work').style.display === 'none') return;
  // 명단 textarea만 브라우저 기본 실행취소에 맡긴다 — "적용" 전까지는 아직 상태가 아니라 작성 중인 글이라,
  // 여기서 앱 되돌리기가 돌면 쓰던 명단이 통째로 날아간다.
  // 반대로 인스펙터의 단문 입력(장소·CTA 등)은 값이 곧바로 state로 흘러가므로 앱 되돌리기가 곧 필드 되돌리기다 —
  // 같은 ⌘Z가 포커스 위치에 따라 다르게 동작하면 그게 더 혼란스럽다.
  if (e.target instanceof HTMLTextAreaElement) return;
  e.preventDefault();
  if (e.shiftKey) redo(); else undo();
});

/* ═══ 도움말 팝오버 ═══ */
function toggleHelp(open) {
  const p = $('helpPop');
  const on = open ?? !p.classList.contains('open');
  p.classList.toggle('open', on);
  $('helpBtn').setAttribute('aria-expanded', String(on));
}
$('helpPop').innerHTML = `
  <h4>단축키 · 조작법</h4>
  <dl>
    <dt><kbd>${KEYS.undo}</kbd></dt><dd>되돌리기</dd>
    <dt><kbd>${KEYS.redo}</kbd></dt><dd>다시하기</dd>
    <dt><kbd>휠</kbd></dt><dd>확대 · 축소 (5~800%)</dd>
    <dt><kbd>드래그</kbd></dt><dd>화면 이동</dd>
    <dt><kbd>⤢</kbd></dt><dd>전체 보기로 맞춤</dd>
    <dt><kbd>클릭</kbd></dt><dd>산출물 = 개별 편집<br>빈 곳 = 전체 일괄</dd>
  </dl>
  <div class="hnote">아래 입력창에 "장소 킨텍스로 변경"처럼 적으면 전 산출물에 한 번에 반영됩니다.</div>`;
$('helpBtn').onclick = e => { e.stopPropagation(); toggleHelp(); };
// 팝오버는 가볍게 — 바깥을 건드리면 닫힌다(모달처럼 확인 버튼을 요구하지 않는다)
document.addEventListener('pointerdown', e => {
  if (!$('helpPop').classList.contains('open')) return;
  // closest? — 이벤트 타깃이 항상 Element라는 보장은 없다(문서·텍스트 노드로 오는 경우)
  if (e.target.closest?.('#helpPop') || e.target.closest?.('#helpBtn')) return;
  toggleHelp(false);
});

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
      ${campaignFields(c).map(f => `<label>${FIELD_LABEL[f]}</label><input type="text" data-f="${f}" value="${c.context.core[f] ?? ''}">`).join('')}
      <h3 style="margin-top:18px">STYLE</h3>
      ${bgControlHtml(c.style, 'iBg')}
      <label>브랜드 컬러 ${c.style.keyVisual ? '<span style="opacity:.6">· 키비주얼에서 배치</span>' : ''}</label>
      <div style="display:flex;gap:10px">
        <span style="display:flex;flex-direction:column;align-items:center;gap:3px"><input type="color" class="swatch" id="iColor1" value="${c.style.palette.primary}"><small style="font-size:10px;color:var(--sub)">주색</small></span>
        <span style="display:flex;flex-direction:column;align-items:center;gap:3px"><input type="color" class="swatch" id="iColor2" value="${c.style.palette.secondary}"><small style="font-size:10px;color:var(--sub)">보조</small></span>
        <span style="display:flex;flex-direction:column;align-items:center;gap:3px"><input type="color" class="swatch" id="iColor3" value="${c.style.palette.accent}"><small style="font-size:10px;color:var(--sub)">포인트</small></span>
      </div>
      <label>키비주얼</label>
      <div id="iDpi" style="font-size:11px;line-height:1.5;margin-bottom:6px"></div>
      <div class="kvthumb" id="iKv" style="width:100%;height:76px;${c.style.keyVisual ? `background-image:url(${c.style.keyVisual})` : ''}">${c.style.keyVisual ? '' : '업로드 · 교체'}</div>
      <input type="file" id="iKvFile" accept="image/*" style="display:none">
      ${c.style.keyVisual ? `<div style="display:flex;gap:6px;margin-top:6px">
        <button class="btn" id="iKvColors" style="flex:1">색 다시 뽑기</button>
        <button class="btn" id="iKvClear" style="flex:1">제거</button></div>` : ''}
      <label>로고 <span style="opacity:.6">· 원색 / 다크 지면용 흰색</span></label>
      <div style="display:flex;gap:6px">
        <div class="kvthumb logo" id="iLogo" style="flex:1;height:44px;${c.style.logo ? `background-image:url(${c.style.logo})` : ''}">${c.style.logo ? '' : '원색 로고'}</div>
        <div class="kvthumb logo dark" id="iLogoLight" style="flex:1;height:44px;${c.style.logoLight ? `background-image:url(${c.style.logoLight})` : ''}">${c.style.logoLight ? '' : '흰색 로고'}</div>
      </div>
      <input type="file" id="iLogoFile" accept="image/*" style="display:none">
      <input type="file" id="iLogoLightFile" accept="image/*" style="display:none">
      <label>폰트</label>
      <select id="iFont">${fontOptions(c.style.fonts.heading)}</select>
      <button class="btn" id="iFontUp" style="width:100%;margin-top:6px">폰트 파일 첨부</button>
      <input type="file" id="iFontFile" accept=".woff2,.woff,.ttf,.otf" style="display:none">
      <h3 style="margin-top:18px">산출물 <span class="mode">${c.artifacts.length}종</span></h3>
      <button class="btn pri" id="iAdd" style="width:100%">＋ 산출물 추가</button>
      <div id="inspNote"></div>`;
    insp.querySelector('#iFont').value = c.style.fonts.heading;
    insp.querySelectorAll('input[data-f]').forEach(i => i.oninput = debounce(() => {
      const f = i.dataset.f, v = i.value.trim();
      if (v === (c.context.core[f] ?? '')) return;
      pushHistory(`${FIELD_LABEL[f]} 일괄 변경`);
      const { impacted, conflicts } = propagate(c, { [f]: v });
      refreshFrames();
      $('inspNote').textContent = conflicts.length
        ? `${impacted.length}종 반영 · ${conflicts.length}건은 개별 편집값 유지(확인 필요)`
        : `${impacted.length}종 즉시 반영됨`;
      log(`${FIELD_LABEL[f]} → ${v} (${impacted.length}종 일괄${conflicts.length ? `, 충돌 ${conflicts.length}` : ''})`);
      autosave();
    }, 450));
    const restyle = (patch = {}, label = '스타일 변경', coalesce = false) => {
      pushHistory(label, coalesce);
      c.style = normalizeStyle({
        keyVisual: c.style.keyVisual,
        kvReadability: c.style.kvReadability,
        kvMeta: c.style.kvMeta,
        logo: c.style.logo,
        logoLight: c.style.logoLight ?? null,
        mode: c.style.mode,
        background: c.style.background,
        colors: [insp.querySelector('#iColor1').value.toUpperCase(), insp.querySelector('#iColor2').value.toUpperCase(), insp.querySelector('#iColor3').value.toUpperCase()],
        fonts: { heading: insp.querySelector('#iFont').value, body: insp.querySelector('#iFont').value },
        mood: c.style.mood,
        ...patch,
      });
      logEvent(c, 'style_changed', {});
      regen(c);
      autosave();
      refreshFrames();
      $('inspNote').textContent = '스타일 전체 반영됨';
      log('스타일 변경 → 전체 재생성');
    };
    // 컬러피커는 드래그하는 내내 값이 흐른다 — 한 번의 색 고르기가 되돌리기 한 걸음이 되도록 묶는다
    const styleChange = debounce(() => restyle({}, '스타일 변경', true), 350);
    insp.querySelector('#iColor1').oninput = styleChange;
    insp.querySelector('#iColor2').oninput = styleChange;
    insp.querySelector('#iColor3').oninput = styleChange;
    insp.querySelector('#iFont').onchange = styleChange;
    insp.querySelector('#iFont').value = c.style.fonts.heading;
    const setBg = (patch, label) => { restyle({ background: { ...c.style.background, ...patch } }, label); renderInspector(); };
    insp.querySelectorAll('#iBgSeg button').forEach(b => b.onclick = () => setBg({ mode: b.dataset.b }, '배경 방식 변경'));
    const bgIn = insp.querySelector('#iBgColor');
    if (bgIn) bgIn.onchange = () => setBg({ color: bgIn.value.toUpperCase() }, '배경색 직접 고르기');
    insp.querySelector('#iBgReset')?.addEventListener('click', () => setBg({ color: null }, '배경색 되돌리기'));
    // 캠페인에 실제로 들어간 규격 기준으로 해상도를 판정한다
    const dpiBox = insp.querySelector('#iDpi');
    if (dpiBox && c.style.keyVisual && c.style.kvMeta?.px) {
      const specs = c.artifacts.map(x => effSpec(x));
      const as = assessForSpecs(c.style.kvMeta.px[0], c.style.kvMeta.px[1], specs);
      if (as.level !== 'na') {
        dpiBox.style.color = DPI_TONE[as.level];
        dpiBox.textContent = as.text;
        if (as.level === 'fixable' || as.level === 'weak') {
          const b = document.createElement('button');
          b.className = 'btn'; b.style.cssText = 'width:100%;margin-top:6px';
          b.textContent = `해상도 올리기 (${as.targetW}×${as.targetH})`;
          b.onclick = async () => {
            b.disabled = true; b.textContent = '확대 중…';
            try {
              const r = await upscale(c.style.keyVisual, as.targetW, as.targetH);
              restyle({ keyVisual: r.dataUrl, kvMeta: { ...c.style.kvMeta, px: [r.w, r.h] } }, '키비주얼 확대');
              renderInspector();
              toast(r.capped
                ? `${r.w}×${r.h}px까지만 확대 — 목표는 캔버스 한계를 넘습니다`
                : `${r.w}×${r.h}px로 확대 — 규격은 채우지만 디테일이 생기진 않습니다`);
              log(`키비주얼 확대 ${r.w}×${r.h}`);
            } catch (e) { toast(`확대 실패: ${e.message}`); b.disabled = false; }
          };
          dpiBox.appendChild(b);
        }
      }
    }
    // 키비주얼 교체 — 새 이미지의 대표색·가독성을 다시 재고 반영.
    // 색까지 함께 바꾸는 이유: 이미지를 갈아 끼웠는데 팔레트가 전 이미지 색으로 남아 있으면
    // 산출물이 키비주얼과 따로 논다(사용자 지적). 손으로 고친 색은 교체할 때만 덮는다.
    const kvIn = insp.querySelector('#iKvFile');
    insp.querySelector('#iKv').onclick = () => kvIn.click();
    kvIn.onchange = () => {
      const f = kvIn.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = async () => {
        let readability = null, suggests = [], meta = null;
        try { ({ readability, suggests, meta } = await analyzeKeyVisual(r.result)); } catch {}
        // 로고가 있으면 주색은 로고가 맡고 키비주얼은 보조·포인트만 바꾼다 — 이미지를 갈았다고 브랜드 색이 바뀌면 안 된다
        const { roles, fromLogo } = await rolesFromAssets({ logo: c.style.logo, mode: c.style.mode, kvColors: suggests });
        restyle({ keyVisual: r.result, kvReadability: readability, kvMeta: meta, ...(roles ? { colors: roles } : {}) }, '키비주얼 교체');
        renderInspector();
        toast(roles ? `키비주얼 교체 — ${fromLogo ? '주색은 로고 유지, ' : ''}색 ${roles.join(', ')} 배치` : '키비주얼 교체');
      };
      r.readAsDataURL(f);
    };
    // 색을 손으로 만지다 길을 잃었을 때 되돌아올 지점 — 지금 키비주얼에서 세 자리를 다시 뽑는다
    insp.querySelector('#iKvColors')?.addEventListener('click', async () => {
      try {
        const { suggests } = await analyzeKeyVisual(c.style.keyVisual);
        const roles = rolesFromKeyVisual(suggests, c.style.mode);
        if (!roles) { toast('이미지에서 쓸 만한 색을 찾지 못했어요'); return; }
        restyle({ colors: roles }, '키비주얼 색 재추출');
        renderInspector();
        toast(`주색 ${roles[0]} · 보조 ${roles[1]} · 포인트 ${roles[2]}`);
      } catch { toast('색 추출 실패'); }
    });
    insp.querySelector('#iKvClear')?.addEventListener('click', () => {
      restyle({ keyVisual: null, kvReadability: null, kvMeta: null }, '키비주얼 제거');
      renderInspector();
    });
    // 로고 두 벌 — 원색은 밝은 지면·투명 지면에, 흰색은 브랜드색 지면에 (자소설 한독·도레이는 흰색 로고)
    for (const [thumbId, fileId, key, label] of [['iLogo', 'iLogoFile', 'logo', '로고 교체'], ['iLogoLight', 'iLogoLightFile', 'logoLight', '흰색 로고 교체']]) {
      const inEl = insp.querySelector(`#${fileId}`);
      insp.querySelector(`#${thumbId}`).onclick = () => inEl.click();
      inEl.onchange = () => {
        const f = inEl.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = async () => {
          // 원색 로고를 갈면 색도 그 로고에서 다시 읽는다 — 고객사가 바뀐 것이다. 흰색 로고는 색이 없으니 그대로.
          let roles = null;
          if (key === 'logo') ({ roles } = await rolesFromAssets({ logo: r.result, keyVisual: c.style.keyVisual, mode: c.style.mode }));
          restyle({ [key]: r.result, ...(roles ? { colors: roles } : {}) }, label);
          renderInspector();
          toast(roles ? `${label} — 주색 ${roles[0]}` : label);
        };
        r.readAsDataURL(f);
      };
    }
    // 폰트 파일 첨부 — 카탈로그에 끼운 뒤 그 폰트로 전체 재생성
    const fontIn = insp.querySelector('#iFontFile');
    insp.querySelector('#iFontUp').onclick = () => fontIn.click();
    fontIn.onchange = () => pickFontFile(fontIn, id => {
      restyle({ fonts: { heading: id, body: id } }, '폰트 첨부');
      renderInspector();
    });
    insp.querySelector('#iAdd').onclick = () => addArtifactModal();
    return;
  }

  const a = c.artifacts.find(x => (x.key ?? x.specId) === state.selected);
  const nVar = VARIANTS[a.channel] ?? 1;
  const spec = effSpec(a);
  const isPrint = spec.unit === 'mm';
  const presets = presetsFor(a);
  insp.innerHTML = `
    <h3>${artLabel(a)} <span class="mode">개별 편집</span></h3>
    <div class="hint">이 산출물에서만 다르게 표기할 값. 비우면 공통값. 개별 값은 일괄 반영에서 보존됩니다.</div>
    ${campaignFields(c).map(f => `
      <label>${FIELD_LABEL[f]} <span style="opacity:.55">공통: ${c.context.core[f] ?? '—'}</span></label>
      <input type="text" data-f="${f}" value="${a.overrides.core?.[f] ?? ''}" placeholder="${c.context.core[f] ?? ''}">`).join('')}
    ${nVar > 1 ? `<label>레이아웃 시안</label><div class="vseg">${Array.from({ length: nVar }, (_, i) =>
      `<button data-v="${i}" class="${(a.variant ?? 0) === i ? 'on' : ''}">${i + 1}</button>`).join('')}</div>` : ''}
    ${a.channel === 'badge' ? `
      <label>참석자 명단 <span style="opacity:.6">${(c.roster ?? []).length}명</span></label>
      <textarea id="iRoster" placeholder="엑셀에서 복사해 붙여넣기\n이름\t소속\t직급" style="width:100%;min-height:76px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:12px;font-family:inherit;resize:vertical"></textarea>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="btn" id="iRosterFileBtn" style="flex:1">CSV 열기</button>
        <button class="btn pri" id="iRosterApply" style="flex:1">명단 적용</button>
      </div>
      <input type="file" id="iRosterFile" accept=".csv,.tsv,.txt" style="display:none">` : ''}
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
    ${spec.unit === 'px' && spec.w && spec.h ? `
      <label>참고 레퍼런스 <span style="opacity:.6">${SHAPE_LABEL[shapeOf(spec.w, spec.h)]}</span></label>
      <div id="iRefs" class="rrow" data-shape="${shapeOf(spec.w, spec.h)}"></div>` : ''}
    ${a.channel === 'ad' ? `
      <label>매체 규격</label>
      <div style="font-size:11.5px;color:var(--sub);line-height:1.6">${adRulesText(spec)}</div>
      <label>규격 검사</label>
      <div id="inspLint">${lintHtml(a)}</div>` : ''}
    <div class="row">
      <button class="btn" id="iOpen">크게</button>
      <button class="btn pri" id="iExp">내보내기</button>
      <button class="btn" id="iDesel">해제</button>
    </div>
    <button class="btn danger" id="iDel" style="width:100%;margin-top:6px">이 산출물 빼기</button>
    <div id="inspNote"></div>`;
  insp.querySelectorAll('input[data-f]').forEach(i => i.oninput = debounce(() => {
    const f = i.dataset.f, v = i.value.trim();
    const o = { ...(a.overrides.core ?? {}) };
    if (v && v !== (c.context.core[f] ?? '')) o[f] = v; else delete o[f];
    pushHistory(`${artLabel(a)} ${FIELD_LABEL[f]} 개별 편집`, true);
    a.overrides.core = o;
    a.status = 'draft';
    logEvent(c, 'manual_edit', { specId: a.specId });
    regen(c);
    autosave();
    refreshFrames(a.specId);
    $('inspNote').textContent = '이 산출물만 반영됨';
    log(`${a.specId} 개별 편집 (${FIELD_LABEL[f]})`);
  }, 450));
  insp.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
    if ((a.variant ?? 0) === Number(b.dataset.v)) return;   // 같은 시안 다시 누르면 되돌릴 것도 없다
    pushHistory(`${artLabel(a)} 시안 ${Number(b.dataset.v) + 1}`);
    a.variant = Number(b.dataset.v);
    a.status = 'draft';
    logEvent(c, 'variation_cycled', { specId: a.specId, variant: a.variant });
    regen(c);
    autosave();
    refreshFrames(a.specId);
    renderInspector();
    log(`${a.specId} 시안 ${a.variant + 1}`);
  });
  const applySize = (w, h) => {
    pushHistory(`${artLabel(a)} 규격 ${w}×${h}mm`);
    a.size = { wmm: w, hmm: h };
    logEvent(c, 'size_changed', { key: a.key, wmm: w, hmm: h });
    regen(c);
    autosave();
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
  const rosterTa = insp.querySelector('#iRoster');
  if (rosterTa) {
    rosterTa.value = (c.roster ?? []).map(p => [p.name, p.org, p.role].filter(Boolean).join('\t')).join('\n');
    const apply = text => {
      const list = parseRoster(text);
      if (!list.length) { toast('명단을 읽지 못했어요 — 이름 한 줄씩 또는 이름/소속/직급 열'); return; }
      pushHistory(`명단 ${list.length}명 적용`);
      c.roster = list;
      logEvent(c, 'roster_loaded', { count: list.length });
      autosave();
      regen(c);
      refreshFrames();
      renderInspector();
      toast(`${list.length}명 적용 — 명찰이 ${list.length}장으로 생성됐어요`);
      log(`명단 ${list.length}명 적용`);
    };
    insp.querySelector('#iRosterApply').onclick = () => apply(rosterTa.value);
    insp.querySelector('#iRosterFileBtn').onclick = () => insp.querySelector('#iRosterFile').click();
    insp.querySelector('#iRosterFile').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { rosterTa.value = r.result; apply(r.result); };
      r.readAsText(f);
    };
  }
  insp.querySelector('#iOpen').onclick = () => openHtml(a.html);
  insp.querySelector('#iExp').onclick = () => exportArtifactModal(a);
  insp.querySelector('#iDesel').onclick = () => select(null);
  const iRefs = insp.querySelector('#iRefs');
  if (iRefs) loadRefs().then(refs => {
    const sh = iRefs.dataset.shape, l = refsFor(refs, sh);
    iRefs.innerHTML = l.length ? l.slice(0, 3).map(r => refThumb(r, sh === 'wide' ? 34 : 96)).join('')
      : `<span style="font-size:11.5px;color:var(--sub)">${sh === 'strip' ? '120px 미만 띠 — 레퍼런스 없음' : '이 형태의 레퍼런스가 아직 없어요'}</span>`;
    iRefs.querySelectorAll('.rthumb').forEach(b => b.onclick = () => openRefGallery(sh));
  });
  insp.querySelector('#iDel').onclick = () => removeArtifact(a);
}

/* ═══ 산출물 추가 · 제거 ═══
   인테이크에서 고른 채널이 끝이면, 아트보드에 들어온 뒤 "배너 하나 더" 같은 요구를 처리할 방법이 없다.
   여기서는 규격 단위로 켜고 끈다 — 채널은 규격을 담는 통이지 사용자가 세는 단위가 아니다. */
function removeArtifact(a) {
  const c = state.campaign;
  const key = a.key ?? a.specId;
  pushHistory(`${artLabel(a)} 제거`);
  const ex = excludedOf(c); ex.add(key); setExcluded(ex, c);
  regen(c);
  // 채널에 남은 산출물이 없으면 채널 자체를 뺀다 — 캠페인이 "무엇을 만드는가"의 목록이기 때문
  if (!c.artifacts.some(x => x.channel === a.channel)) c.channels = c.channels.filter(ch => ch !== a.channel);
  logEvent(c, 'artifact_removed', { key });
  autosave();
  layoutArtboard();
  select(null);
  log(`산출물 제거: ${artLabel(a)}`);
  toast(`${artLabel(a)} 제거 — 되돌리기(${KEYS.undo})로 복구`);
}

// 지금 이 채널이 만들고 있는 용도 조합. signage를 처음 건드릴 때 여기서 시작해야
// 이미 있던 메인 한 장이 조용히 사라지지 않는다(generate.js는 signage 목록이 있으면 그것만 만든다).
function currentSignage(ch) {
  const list = state.campaign.artifacts.filter(a => a.channel === ch)
    .map(a => ({ purpose: a.purpose ?? 'main', arrow: a.arrow ?? null }));
  return list.length ? list : [{ purpose: 'main', arrow: null }];
}

function addArtifacts(picks) {
  const c = state.campaign;
  const ex = excludedOf(c);
  const fresh = new Set(picks.map(p => SPECS[p.specId]?.channel).filter(ch => ch && ch !== 'ad' && !c.channels.includes(ch)));
  for (const ch of fresh) {
    c.channels.push(ch);
    // 채널을 켜면 그 채널의 규격이 통째로 딸려 온다(generate.js는 채널→전규격 전개).
    // 일단 전부 막고 아래에서 고른 것만 연다 — 배너 한 장 켜자고 14장이 깔리면 못 쓴다.
    for (const id of specIdsOf([ch])) ex.add(id);
  }
  for (const pick of picks) {
    const spec = SPECS[pick.specId];
    if (!spec) continue;
    const ch = spec.channel;
    if (ch === 'ad') {
      // 매체 규격은 채널이 아니라 목록으로 산다 — 매체도 함께 켠다(아트보드 줄이 매체 단위다)
      c.adSpecIds = [...new Set([...(c.adSpecIds ?? []), spec.id])];
      if (!(c.media ?? []).includes(spec.medium)) c.media = [...(c.media ?? []), spec.medium];
      ex.delete(spec.id);
      continue;
    }
    if (pick.purpose && pick.purpose !== 'main') {
      // 새로 켠 채널은 빈 목록에서 시작한다 — 고르지도 않은 메인 한 장이 딸려 오면 안 된다
      const set = c.signage[ch] ?? (c.signage[ch] = fresh.has(ch) ? [] : currentSignage(ch));
      if (!set.some(x => x.purpose === pick.purpose && (x.arrow ?? null) === (pick.arrow ?? null))) {
        set.push({ purpose: pick.purpose, arrow: pick.arrow ?? null });
      }
    }
    ex.delete(artifactKey(pick.specId, pick.purpose ?? 'main', pick.arrow ?? null));
  }
  setExcluded(ex, c);
  regen(c);
  logEvent(c, 'artifact_added', { count: picks.length });
  autosave();
  layoutArtboard();
  select(null);
  fitZoom();
}

// 고를 수 있는 것 = 모든 규격 × (사이니지면 용도). 이미 있는 것은 체크·잠금으로 보여 준다 —
// 목록에서 빼 버리면 "왜 없지?" 하고 다시 찾게 된다.
// 매체 광고 — 매체별로 묶어 보여 준다. 확인 필요 규격은 표시하되 고를 수 있다(규격 자체는 자료에 있다).
function adGroups(have) {
  const entries = Object.values(adSpecEntries());
  return MEDIA.map(m => {
    const rows = entries.filter(e => e.medium === m.id).map(s => {
      const on = have.has(s.id);
      return `<label class="pickrow ${on ? 'had' : ''}">
        <input type="checkbox" value="${s.id}" ${on ? 'checked disabled' : ''}>
        <b>${s.rules.name} · ${s.submitW}×${s.submitH}</b>
        <span>${s.format.join('/').toUpperCase()}${s.maxKB != null ? ` ≤${s.maxKB}KB` : ''}</span>
        ${s.confidence !== '확정' ? '<i class="tag mob">확인 필요</i>' : ''}${on ? '<i class="tag had">있음</i>' : ''}
      </label>`;
    });
    return rows.length ? `<h5>매체 · ${m.name}</h5><div class="pickgrid">${rows.join('')}</div>` : '';
  }).join('');
}

function addArtifactModal() {
  const c = state.campaign;
  const have = new Set(c.artifacts.map(a => a.key ?? a.specId));
  const group = (title, channels) => {
    const rows = channels.flatMap(ch => Object.entries(SPECS).filter(([, s]) => s.channel === ch).map(([id, s]) => {
      const on = have.has(id);
      const size = specSize(s);
      const name = s.title ?? CHANNEL_LABEL[ch] ?? id;
      return `<label class="pickrow ${on ? 'had' : ''}">
        <input type="checkbox" value="${id}" ${on ? 'checked disabled' : ''}>
        <b>${name}${size ? ` · ${size}` : ''}</b>
        <span>${s.label ?? ''}</span>
        ${s.recommended ? '<i class="tag">권장</i>' : ''}${s.device === 'mobile' ? '<i class="tag mob">모바일</i>' : ''}
        ${on ? '<i class="tag had">있음</i>' : ''}
      </label>`;
    }));
    return `<h5>${title}</h5><div class="pickgrid">${rows.join('')}</div>`;
  };
  // 오프라인은 같은 규격이라도 용도가 다르면 다른 장이다 — 용도·화살표를 함께 고르게 한다
  const purposeRows = OFFLINE.filter(ch => purposesFor(ch).length).map(ch => `
    <label class="pickrow">
      <input type="checkbox" data-sign="${ch}">
      <b>${CHANNEL_LABEL[ch]}</b>
      <select data-purpose="${ch}">${purposesFor(ch).map(p => `<option value="${p.id}">${p.label}</option>`).join('')}</select>
      <select data-arrow="${ch}">${Object.entries(ARROWS).map(([k, g]) => `<option value="${k}">${g || '화살표 없음'}</option>`).join('')}</select>
    </label>`).join('');

  modal({
    title: '산출물 추가',
    desc: '규격을 골라 이 캠페인에 더합니다. 권장 = Google이 실적 상위로 안내하는 규격.',
    wide: true,
    body: `${adGroups(have)}${group('온라인', ONLINE)}${group('오프라인', OFFLINE)}
      <h5>오프라인 · 용도별 추가</h5>
      <div class="pickgrid">${purposeRows}</div>
      <div class="pickNote">방향 안내는 고른 화살표마다 한 장씩 만들어집니다.</div>`,
    actions: [
      { label: '닫기' },
      { label: '추가', pri: true, fn: () => {
        const box = $('modalBody');
        const picks = [...box.querySelectorAll('.pickgrid input[type=checkbox]:checked:not(:disabled)')].map(i => {
          if (i.dataset.sign) {
            const ch = i.dataset.sign;
            const purpose = box.querySelector(`select[data-purpose="${ch}"]`).value;
            const arrow = box.querySelector(`select[data-arrow="${ch}"]`).value;
            const specId = Object.keys(SPECS).find(id => SPECS[id].channel === ch);
            const needsArrow = PURPOSES.find(p => p.id === purpose)?.needsArrow;
            return { specId, purpose, arrow: needsArrow ? arrow : null };
          }
          return { specId: i.value, purpose: 'main', arrow: null };
        }).filter(p => p.specId);
        if (!picks.length) { toast('추가할 규격을 고르세요'); return false; }
        pushHistory(`산출물 ${picks.length}종 추가`);
        addArtifacts(picks);
        log(`산출물 추가: ${picks.map(p => SPECS[p.specId].title ?? p.specId).join(', ')}`);
        toast(`${picks.length}종 추가됨`);
      } },
    ],
  });
}

/* ═══ 내보내기 ═══ */
// 매체 소재 파일명 — 담당자가 매체사에 그대로 넘긴다: 고객사_직무_매체_치수_v회차.확장자
function adFileName(a, fmt) {
  const c = state.campaign, core = c.context.core, spec = SPECS[a.specId];
  const clean = v => String(v ?? '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 24);
  const who = c.kind === 'recruit' ? [clean(core.client), clean(core.role)] : [clean(core.name)];
  return `${[...who, clean(spec.mediumName), `${spec.submitW}x${spec.submitH}`, `v${c.context.version}`].filter(Boolean).join('_')}.${fmt}`;
}
function adRulesText(spec) {
  const r = spec.rules ?? {};
  return [
    `제출 ${spec.submitW}×${spec.submitH}px${spec.exportScale > 1 ? ` (캔버스 ${spec.w}×${spec.h} ×${spec.exportScale})` : ''}`,
    `${spec.format.map(f => f.toUpperCase()).join('/')}${spec.maxKB != null ? ` · ≤${spec.maxKB}KB` : ''}`,
    r.textLimits?.length ? `글자수 ${r.textLimits.length}항목` : '글자수 규정 없음',
    spec.confidence !== '확정' ? '⚠ 자료 확인 필요 규격' : null,
  ].filter(Boolean).join('<br>');
}
async function exportAdFiles(ads) {
  const c = state.campaign;
  const out = [];
  for (const a of ads) {
    const spec = SPECS[a.specId];
    const eff = { ...c.context, core: { ...c.context.core, ...(a.overrides?.core ?? {}) } };
    const fit = await renderFit(eff, c.style, spec);   // 용량이 넘치면 규칙 안에서 다시 뽑는다(단색 배경 → JPG 품질)
    out.push({ a, spec, fit, name: adFileName(a, fit.measure.format === 'jpeg' ? 'jpg' : fit.measure.format) });
  }
  return out;
}
async function doAdExport(a) {
  toast('소재 생성 중…');
  try {
    const [{ fit, name }] = await exportAdFiles([a]);
    if (fit.lint.level === 'block') { toast(`규격 차단 — ${fit.lint.issues[0]?.msg ?? ''}`); return; }
    download(fit.measure.blob, name);
    log(`내보내기: ${name}${fit.attempts.length > 1 ? ` (${fit.attempts.map(x => x.label).join('→')})` : ''}`);
    closeModal();
  } catch (e) { toast(`실패: ${e.message}`); }
}
async function exportAdZip() {
  const c = state.campaign;
  const ads = c.artifacts.filter(a => a.channel === 'ad');
  toast(`매체 소재 ${ads.length}장 생성 중…`);
  try {
    const files = await exportAdFiles(ads);
    const blocked = files.filter(f => f.fit.lint.level === 'block');
    if (blocked.length) { toast(`규격 차단 ${blocked.length}건 — ZIP에서 제외됨`); }
    const entries = [];
    for (const f of files.filter(f => f.fit.lint.level !== 'block')) {
      entries.push({ name: `${f.spec.mediumName}/${f.name}`, data: new Uint8Array(await f.fit.measure.blob.arrayBuffer()) });
    }
    if (!entries.length) { toast('내보낼 소재가 없어요'); return; }
    const zip = buildZip(entries);
    download(new Blob([zip], { type: 'application/zip' }), `${c.id}_매체소재_v${c.context.version}.zip`);
    log(`내보내기: 매체 소재 ZIP ${entries.length}장 (${[...new Set(files.map(f => f.spec.mediumName))].join(', ')})`);
    closeModal();
  } catch (e) { toast(`실패: ${e.message}`); }
}
function exportAdModal(a) {
  const spec = SPECS[a.specId];
  modal({
    title: `${artLabel(a)} 내보내기`,
    desc: '매체 규격 그대로 — 치수·포맷·용량을 맞춰 뽑고, 규정에 안 맞으면 내보내지 않습니다.',
    body: `<div style="font-size:12.5px;color:var(--sub);line-height:1.7">${adRulesText(spec)}<br>파일명: <b>${adFileName(a, spec.format[0])}</b></div>
      <div style="margin-top:10px">${lintHtml(a)}</div>`,
    actions: [
      { label: '닫기' },
      { label: '다운로드', pri: true, fn: () => { doAdExport(a); return false; } },
    ],
  });
}

function exportArtifactModal(a) {
  const spec = effSpec(a);
  const kk = a.key ?? a.specId;
  if (spec.channel === 'ad') return exportAdModal(a);
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
  const prints = c.artifacts.filter(a => !['edm', 'landing', 'banner', 'ad'].includes(a.channel));
  const ads = c.artifacts.filter(a => a.channel === 'ad');
  modal({
    title: '전체 내보내기',
    desc: '온라인은 파일로 즉시, 인쇄물은 산출물별 PDF 저장으로 진행합니다. 매체 소재는 매체별 폴더로 묶은 ZIP.',
    body: `<div style="font-size:12.5px;color:var(--sub);line-height:1.8">
      ${ads.length ? `· 매체 소재 ZIP — ${[...new Set(ads.map(a => SPECS[a.specId].mediumName))].join(', ')} (${ads.length}장${ads.some(a => a.lint?.level === 'block') ? `, 차단 ${ads.filter(a => a.lint?.level === 'block').length}건 제외` : ''})<br>` : ''}
      · 온라인 HTML — ${htmls.map(a => a.specId).join(', ') || '없음'}<br>
      · 배너 PNG 2x — ${banners.map(a => a.specId).join(', ') || '없음'}<br>
      · 인쇄 PDF — ${prints.map(a => artLabel(a)).join(', ') || '없음'} <span style="opacity:.7">(각각 인쇄 대화상자)</span></div>`,
    actions: [
      { label: '닫기' },
      { label: 'HTML 일괄', fn: () => { htmls.forEach(a => downloadText(a.html, `${a.specId}.html`)); log(`내보내기: HTML ${htmls.length}개`); } },
      ...(ads.length ? [{ label: '매체 소재 ZIP', pri: true, fn: () => { exportAdZip(); return false; } }] : []),
      { label: '배너 PNG 2x 일괄', pri: !ads.length, fn: () => { batchBanners(banners); return false; } },
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
    pushHistory('전체 시안 변경');
    for (const a of c.artifacts) if ((VARIANTS[a.channel] ?? 1) > 1) a.variant = ((a.variant ?? 0) + 1) % VARIANTS[a.channel];
    regen(c);
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
  pushHistory(`지시: ${Object.entries(patch).map(([f, v]) => `${FIELD_LABEL[f] ?? f}→${v}`).join(', ')}`);
  const { impacted, conflicts } = propagate(c, patch);
  refreshFrames();
  renderInspector();
  log(`지시: ${Object.entries(patch).map(([f, v]) => `${FIELD_LABEL[f]}→${v}`).join(', ')} (${impacted.length}종${conflicts.length ? `, 충돌 ${conflicts.length}` : ''})`);
  toast(`${impacted.length}종 일괄 반영${conflicts.length ? ` · ${conflicts.length}건 확인 필요` : ''}`);
  autosave();
}
$('cmdGo').onclick = () => { const t = $('cmdIn').value.trim(); if (t) { $('cmdIn').value = ''; onCommand(t); } };
$('cmdIn').onkeydown = e => { if (e.key === 'Enter') $('cmdGo').click(); };

/* ═══ 승인 · 저장 · 재열기 ═══ */
function approveAll() {
  const c = state.campaign;
  const blocked = c.artifacts.filter(a => a.lint?.level === 'block');
  if (blocked.length) { toast(`규격 차단 ${blocked.length}건 — 먼저 해결해야 승인할 수 있어요`); return; }
  if (c.artifacts.some(a => a.channel === 'ad' && !a.lint)) { toast('규격 검사가 아직 끝나지 않았어요 — 잠시 후 다시'); return; }
  for (const a of c.artifacts) a.status = 'approved';
  logEvent(c, 'artifact_approved', { all: true });
  refreshFrames();
  const kpi = c.log.reduce((m, e) => (m[e.type] = (m[e.type] ?? 0) + 1, m), {});
  log(`전체 승인 — 생성 ${kpi.artifact_generated ?? 0} · 편집 ${kpi.manual_edit ?? 0} · 전파 ${kpi.propagation_run ?? 0}`);
  saveCampaignToStore();
  toast('전체 승인 — 홈 "내 캠페인"에 저장됨');
}
$('approveAll').onclick = approveAll;

// 자동 저장 — 승인해야만 남으면 작업 중 이탈한 것이 전부 사라진다.
// 캠페인이 만들어진 순간부터, 바뀔 때마다 스냅샷을 갱신한다.
const autosave = debounce(() => { if (state.campaign) saveCampaignToStore(); }, 600);

function saveCampaignToStore() {
  const c = state.campaign;
  const done = c.artifacts.length && c.artifacts.every(a => a.status === 'approved');
  const snapshot = {
    id: c.id, savedAt: Date.now(),
    status: done ? 'approved' : 'draft',
    context: c.context, style: c.style, channels: c.channels,
    kind: c.kind ?? 'event', track: c.track ?? null, media: c.media ?? [], adSpecIds: c.adSpecIds ?? [],
    signage: c.signage ?? {}, roster: c.roster ?? [], excluded: c.excluded ?? [],
    conversation: (state.intake?.history ?? []).slice(-40),
    artifacts: c.artifacts.map(a => ({
      key: a.key ?? a.specId, specId: a.specId, channel: a.channel,
      purpose: a.purpose, arrow: a.arrow, overrides: a.overrides,
      variant: a.variant ?? 0, size: a.size ?? null, status: a.status,
    })),
    log: c.log,
  };
  const list = loadStore().filter(x => x.id !== c.id);
  list.push(snapshot);
  try { saveStore(list); } catch {
    snapshot.style = { ...snapshot.style, keyVisual: null };
    try { saveStore(list); } catch { toast('저장 공간 부족 — 저장 실패'); }
  }
}

const LOG_LABEL = {
  campaign_created: '캠페인 생성', artifact_generated: '산출물 생성', manual_edit: '개별 편집',
  propagation_run: '일괄 반영', style_changed: '스타일 변경', size_changed: '규격 변경',
  variation_cycled: '시안 변경', roster_loaded: '명단 적용', artifact_approved: '전체 승인',
  campaign_reopened: '다시 열기', artifact_added: '산출물 추가', artifact_removed: '산출물 제거',
};

function openStored(saved) {
  state.campaign = { ...saved, log: saved.log ?? [], signage: saved.signage ?? {}, roster: saved.roster ?? [], excluded: saved.excluded ?? [], media: saved.media ?? [], adSpecIds: saved.adSpecIds ?? [] };
  // 저장된 대화도 되살린다 — 무엇을 어떻게 정했는지가 이력의 핵심이다
  state.intake = { ...(state.intake ?? {}), history: saved.conversation ?? [] };
  registerAll();
  regen(state.campaign);
  for (const a of state.campaign.artifacts) {
    const s = (saved.artifacts ?? []).find(x => (x.key ?? x.specId) === (a.key ?? a.specId));
    if (!s) continue;
    if (s.status) a.status = s.status;
    if (s.size) a.size = s.size;
    if (s.overrides) a.overrides = s.overrides;
    if (s.variant != null) a.variant = s.variant;
  }
  regen(state.campaign);   // 복원한 개별 설정을 반영해 다시 렌더
  logEvent(state.campaign, 'campaign_reopened', {});
  enterWork();
  log(`저장된 캠페인 재현: ${campaignName(saved.context)}`);
  for (const e of (saved.log ?? []).slice(-8).reverse()) log(`· ${LOG_LABEL[e.type] ?? e.type}`);
}

/* ═══ AI 키 ═══ */
$('keyBtn').onclick = () => {
  modal({
    title: 'AI 해석 설정 (BYOK)',
    desc: '개인 Anthropic API 키를 이 브라우저에만 저장합니다. 키가 있으면 기획·지시를 AI가 해석하고, 없으면 규칙 파서로 동작합니다.',
    body: `<label>API 키</label><input type="password" id="keyIn" value="${LLM.getKey()}" placeholder="sk-ant-...">
      <div id="keyMsg" style="font-size:12px;margin-top:10px;line-height:1.55;color:var(--sub);word-break:break-all">모델: ${LLM.currentModel()}</div>`,
    actions: [
      { label: '지우기', fn: () => { LLM.setKey(''); refreshAiChip(); toast('키 삭제됨'); } },
      { label: '연결 테스트', fn: () => { runKeyTest(); return false; } },
      { label: '저장', pri: true, fn: () => { LLM.setKey($('modalBody').querySelector('#keyIn').value); refreshAiChip(); toast('키 저장됨'); } },
    ],
  });
};

async function runKeyTest() {
  const box = $('modalBody');
  LLM.setKey(box.querySelector('#keyIn').value);
  const msg = box.querySelector('#keyMsg');
  msg.style.color = 'var(--sub)';
  msg.textContent = '확인 중…';
  try {
    const reply = await LLM.testKey();
    msg.style.color = 'var(--good)';
    msg.textContent = `연결 성공 · 모델 ${LLM.currentModel()} · 응답 "${reply}"`;
    refreshAiChip();
  } catch (e) {
    msg.style.color = 'var(--danger)';
    msg.textContent = e.message;
  }
}

/* ═══ boot ═══ */
restoreCustomFonts();   // 지난 세션에 첨부한 폰트를 카탈로그에 되돌려 놓아야 저장된 캠페인이 같은 글자로 열린다
$('homeBtn').onclick = () => show('home');
$('logHead').onclick = () => $('logCard').classList.toggle('open');
renderHistBtns();   // 아직 캠페인이 없어도 툴팁은 붙여 둔다 — 단축키를 여기서 처음 알게 되는 사용자가 있다
initHome();
show('home');
