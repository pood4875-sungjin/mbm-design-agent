// Campaign Agent — 도구형 앞문 (챗봇 아님).
// 홈(입력 우선) → 인테이크 시트(질문지 한 장) → 아트보드 워크스페이스(줌·팬·선택·즉시 편집).
// 편집: 우측 인스펙터 — 선택 없음 = 캠페인 전체(타이핑 즉시 전 산출물 일괄 반영),
//        산출물 선택 = 그것만 즉시 반영(override, 일괄 반영에서 보존).

import { createContext, updateContext, missingFields, CORE_FIELDS, KINDS } from '../core/context.js';
import { MEDIA } from '../core/media.js';
import { adSpecEntries, adSpecGroups, mediumRank } from '../core/adspecs.js';
import { lintArtifact } from '../core/lint.js';
import { normalizeStyle, cmykText } from '../core/style.js';
import { FONTS, fontIds, registerCustomFont, customFontCss, CUSTOM_MARK, BUNDLED_MARK, DEFAULT_FONT, isBundledFont, fontGroup, fontFiles, localFaceCss, embeddedFaceCss, fontInfoLine, fontRuleOf, effectiveFontId } from '../core/fonts.js';
import { extractPalette, rolesFromKeyVisual, rolesFromSources, analyzeRegion, buildPalette, TEXT_ZONES, edgeColor, fieldFromImage, colorDistance } from '../core/palette.js';
import { objectNeedOf, needsCutout } from '../core/adfields.js';
import { resolveField } from '../core/field.js';
import { checkAdDoc } from '../core/adcheck.js';
import { kvTypeOf, kvTypeSummary, kvTypeChoices, baseKvMeta, applyKvTypeOverride } from '../core/kvtypes.js';
import { kvGuideText, logoGuideText, checkKv, checkLogo, CHECK_TONE } from '../core/inputcheck.js';   // 10-19 첨부 안내·크기 검사
import { SPECS, PURPOSES, ARROWS, SIZE_PRESETS, purposesFor, optionalSpecIds, specIdsOf } from '../core/contract.js';
import { registerAll, generateArtifacts, logEvent, artifactKey } from '../core/generate.js';
import { propagate } from '../core/propagate.js';
import { approvalGate, STATE_LABEL } from '../core/gate.js';   // 승인 게이트(10-20 운영 모델 §4·§5)
import * as LLM from './llm.js';
import { rasterize, download, downloadText, openPrintPdf } from './raster.js';
import { agentTurn, scriptedTurn, PHASES, PHASE_LABEL, TRACKS, detectKind, detectTrack, detectMedia, fieldsFor,
  ESSENTIAL, ASK, normDate, extractRecruit } from './agent.js';
import { measureArtifact } from './measure.js';
import { renderFit } from './adfit.js';
import { buildZip } from './zip.js';
import { htmlToSvg } from '../core/svgexport.js';
import { renderAd } from '../core/renderers/ad.js';
import { parseRoster } from '../core/roster.js';
import { assessForSpecs } from '../core/imagequality.js';
import { knockoutLogo as knockoutLogoRGBA, trimBox, logoToneOf as logoToneOfRGBA, logoMeta as logoMetaRGBA } from '../core/logo.js';
import { upscale } from './upscale.js';
import { createEditor } from './editor.js';
import { PRESET_KEYS } from '../core/editlayout.js';
import { FOLDERS_LS, NONE, NONE_LABEL, migrateFolders, createFolder, renameFolder, deleteFolder, reorderFolder, moveFolderBy, moveCampaign,
  toggleFolder, folderOf, filterCampaigns, groupCampaigns, nameError, cleanName, displayName, logoSig, tileToneFor, containBox } from '../core/folders.js';

const CHIP_LABEL = { tint: '은은한 틴트', brand: '브랜드 채움', plain: '글자만' };
const TONE_LABEL = { auto: '자동', dark: '다크', light: '라이트' };   // 글자색 톤(style.textTone, 10-19)   // 상세 라벨 알약 톤(style.chipTone)
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
// 온라인 = 매체 광고(media → adSpecIds) + 사내 그룹웨어 썸네일. 옛 '홍보 배너'(banner) 채널은 새 캠페인에서 쓰지 않는다(2026-10-06 행사 트랙 통합 — 행사도 구글·카카오·네이버 매체 규격으로)
const ONLINE = ['gwthumb'];
const LEGACY = ['edm', 'landing', 'banner'];   // 저장된 옛 캠페인에만 있는 채널 — 보드에는 그린다
const OFFLINE = ['poster', 'xbanner', 'hyunsumak', 'badge', 'photobooth'];
const VARIANTS = { ad: 1, banner: 3, gwthumb: 1, badge: 2, landing: 2, poster: 2, xbanner: 2, hyunsumak: 2, edm: 1, photobooth: 4 };
// 규정 없는 매체의 가이드 시안(구글 GDN: 보드 템플릿 '좌측상단 정렬'·'좌측중앙 정렬') — 매체 데이터가 정하고, 담당자가 고른다
const guideVariants = a => (a.channel === 'ad' ? SPECS[a.specId]?.mediumRules?.guide?.variants ?? null : null);
const variantCount = a => guideVariants(a)?.length ?? VARIANTS[a.channel] ?? 1;
const DISPLAY_SCALE = { banner: 1, gwthumb: 1, badge: 0.42, edm: 0.62, landing: 0.42, poster: 0.28, xbanner: 0.1, hyunsumak: 0.05, photobooth: 0.05 };
const STORE_LS = 'mbm-campaigns';

const SAMPLES = [
  '한진정보통신 클라우드 플랫폼 엔지니어 채용 광고. 카카오 비즈보드, 자소설닷컴, 네이버에 나가요. 정규직, 서울 여의도, 10월 31일 마감.',
  '10월 15일 코엑스에서 2026 ONSITE MBM 서울 진행. 대상은 건설 구조 엔지니어, 사전등록 받아야 함. 배너, 포스터, X배너 필요해.',
  '내년 3월 킨텍스 MBM 신제품 발표회. 교량 설계 실무자 대상, 현장 데모 신청 유도. 현수막이랑 배너만.',
  '2026 ONSITE MBM 도쿄, 6월 20일, 대상 일본 파트너사. 배너와 포스터.',
];

const state = {
  intake: { kind: 'event', track: null, media: [], fields: {}, channels: [], extra: {}, kv: null, logo: null, signage: {}, sizes: {}, mode: 'light', colors: ['#0A3D91', '#11095F', '#B56705'], font: 'KakaoBigSans', mood: '', kvReadability: null, suggests: [], step: 0 },
  campaign: null,
  selected: null,          // specId | null
  zoom: 1, panX: 0, panY: 0,
};
const $ = id => document.getElementById(id);
const frames = new Map();  // artifact.key → {frame, iframe, badge, label}
// 편집 고도화·가이드 검수(10-14, app/editor.js) — 프리셋·직접 수정 손잡이·가이드 검수. 아래 함수들은 늦게 정의되는 것도 있어 화살표로 감싸 넘긴다
const ED = createEditor({
  state, SPECS, frames, logEvent,
  pushHistory: (...x) => pushHistory(...x), regen: (...x) => regen(...x), refreshFrames: (...x) => refreshFrames(...x), autosave: () => autosave(),
  renderInspector: () => renderInspector(), log: t => log(t), toast: t => toast(t), select: k => select(k), artLabel: a => artLabel(a), adEffCtx: a => adEffCtx(a),
});

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
function embedFont(html, face, mark = CUSTOM_MARK) {
  if (!html || !face || html.includes(mark)) return html;
  const style = `<style>${face}</style>`;
  const i = html.indexOf('</head>');
  // 완전한 문서면 head 안에, 조각(배너)이면 맨 앞에. doctype 앞에 붙이면 쿼크 모드로 떨어진다.
  return i < 0 ? style + html : html.slice(0, i) + style + html.slice(i);
}
// 보드 미리보기 문서 — 렌더러가 주는 조각(<div data-ad …>)을 그대로 srcdoc에 넣으면 브라우저 기본 body 여백 8px 때문에
// 소재가 (8,8)에서 시작해 위·왼쪽은 흰 띠, 오른쪽·아래는 8px 잘렸다(10-06 사용자: "왜 자꾸 여백 있어 보이냐"). 내보내기(raster.js)는
// foreignObject에 0,0으로 그리므로 미리보기만 달랐다. 완전한 문서(eDM·랜딩)는 그대로 둔다.
// fontId(10-14): 묶은 무료 폰트는 상대 경로 @font-face 를 같이 넣는다 — srcdoc 문서는 부모의 base URL 을 물려받아 app/fonts/… 가 그대로 열린다.
function previewDoc(html, fontId = null) {
  if (!html || /^\s*(<!doctype|<html)/i.test(html)) return html;
  const face = fontId && isBundledFont(fontId) ? `<style>${localFaceCss(fontId)}</style>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style>${face}</head><body>${html}</body></html>`;
}
// 산출물이 실제로 쓰는 폰트 id — 매체가 고정하면(자소설·카카오·리멤버 Pretendard) 그 폰트, 아니면 캠페인(또는 산출물 개별) 폰트
function artifactFontId(a, c = state.campaign) {
  const spec = SPECS[a.specId];
  const sel = (a.overrides?.style?.fonts?.heading) ?? c?.style?.fonts?.heading ?? DEFAULT_FONT;
  if (!spec || a.channel !== 'ad') return sel;
  return effectiveFontId(spec.mediumRules, sel, spec.rules);
}
/* 내보내기용 폰트 바이트 — SVG foreignObject(raster.js)는 바깥 파일을 못 받으니 묶은 폰트는 dataURL 로 넣는다(커스텀 폰트와 같은 길).
   기본 Pretendard 는 예전처럼 설치된 폰트에 맡긴다(산출물마다 1.1MB 를 더 싣지 않게). 한 번 읽은 폰트는 세션 동안 캐시. */
const fontBytesCache = new Map();
async function exportFaceCss(fontId) {
  if (!fontId || !isBundledFont(fontId) || fontId === DEFAULT_FONT) return '';
  if (!fontBytesCache.has(fontId)) {
    fontBytesCache.set(fontId, (async () => {
      const urls = {};
      for (const { weight, path } of fontFiles(fontId)) {
        const r = await fetch(path); if (!r.ok) continue;
        const buf = new Uint8Array(await r.arrayBuffer());
        let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        urls[weight] = `data:font/woff2;base64,${btoa(s)}`;
      }
      return embeddedFaceCss(fontId, urls);
    })());
  }
  return fontBytesCache.get(fontId);
}
async function withExportFont(html, fontId) { return embedFont(html, await exportFaceCss(fontId), BUNDLED_MARK); }

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

/* ═══ 폰트 고르기 · 매체 폰트 규정 안내 (10-14) ═══
   목록은 「기본」 Pretendard · 「무료 폰트」(앱에 묶은 OFL 폰트, core/fonts.js) · 「첨부」(사용자 파일) 세 묶음.
   매체 JSON fonts.required 가 있는 매체(자소설·카카오·리멤버 = Pretendard)는 여기서 뭘 골라도 그 폰트 — 렌더러가 강제한다. 안내 문구로 알린다. */
const FONT_GROUP_LABEL = { default: '기본', free: '무료 폰트', custom: '첨부' };
function fontOptions(selected) {
  const groups = { default: [], free: [], custom: [] };
  for (const id of fontIds()) (groups[fontGroup(id)] ?? groups.free).push(id);
  return Object.entries(groups).filter(([, ids]) => ids.length).map(([g, ids]) =>
    `<optgroup label="${FONT_GROUP_LABEL[g]}">${ids.map(id => `<option value="${id}" ${id === selected ? 'selected' : ''} title="${escH(fontInfoLine(id))}">${escH(FONTS[id].label)}</option>`).join('')}</optgroup>`).join('');
}
const FONT_NOTICE = '자소설닷컴·카카오·리멤버는 매체 규정상 Pretendard로 고정됩니다. 여기서 고른 폰트는 폰트 규정이 없는 매체에만 적용됩니다.';
// 매체 id 목록 → 고정 / 자유 매체로 가른다(매체 JSON fonts 블록만 읽는다)
function fontMediaSplit(mediumIds) {
  const fixed = [], free = [];
  for (const id of [...new Set(mediumIds ?? [])]) {
    const m = MEDIA.find(x => x.id === id); if (!m) continue;
    const r = fontRuleOf(m);
    if (r.fixed) fixed.push({ id, name: m.name, font: r.required });
    else free.push({ id, name: m.name, recommended: r.recommended ?? null });
  }
  return { fixed, free };
}
// 고른 폰트 아래 안내 — 공통 문구 + 이 캠페인에서 고정/자유 매체 + 라이선스 한 줄
function fontNoticeHtml(mediumIds, selectedId) {
  const { fixed, free } = fontMediaSplit(mediumIds);
  const sel = FONTS[selectedId]?.label ?? selectedId;
  const lines = [FONT_NOTICE];
  if (fixed.length) lines.push(`고정: ${fixed.map(m => `${m.name}(${m.font})`).join(' · ')}`);
  if (free.length) lines.push(`고른 폰트 적용(${escH(sel)}): ${free.map(m => m.name + (m.recommended ? ` <span style="opacity:.75">— 권장 ${escH(m.recommended)}</span>` : '')).join(' · ')}`);
  const info = fontInfoLine(selectedId);
  if (info) lines.push(`<span style="opacity:.75">${escH(sel)} — ${escH(info)}</span>`);
  return `<div class="fontNote" style="font-size:11px;color:var(--sub);line-height:1.55;margin-top:6px">${lines.join('<br>')}</div>`;
}
const campaignMediumIds = (c = state.campaign) => (c?.artifacts ?? []).filter(a => a.channel === 'ad' || a.channel === 'asset').map(a => SPECS[a.specId]?.medium).filter(Boolean);

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
/* ═══ 내 캠페인 — 폴더 · 로고 썸네일 (순수 연산은 core/folders.js) ═══
   폴더는 'mbm-folders' 에 따로 둔다 — 캠페인 스냅샷은 저장할 때마다 새로 쓰여 폴더 정보를 거기 두면 사라진다.
   폴더 저장소가 없는 옛 데이터는 migrateFolders 가 빈 폴더로 읽어, 모든 캠페인이 「폴더 없음」에 그대로 놓인다. */
const side = { query: '', thumbJob: false };
const IC = {
  chev: '<svg class="ic cf-chev" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  folder: '<svg class="ic cf-fic" aria-hidden="true" viewBox="0 0 24 24"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.2h7.5A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/></svg>',
  more: '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/></svg>',
  move: '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.2h7.5A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><path d="M9 13.5h6M12.5 11l2.5 2.5-2.5 2.5"/></svg>',
  plus: '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
};
function loadFolders(list = loadStore()) {
  let raw = null; try { raw = JSON.parse(localStorage.getItem(FOLDERS_LS) || 'null'); } catch {}
  return migrateFolders(raw, list.map(c => c.id));
}
function saveFolders(st) { try { localStorage.setItem(FOLDERS_LS, JSON.stringify(st)); return true; } catch { toast('저장 공간 부족 — 폴더 저장 실패'); return false; } }
// 폴더 연산 한 번 = 저장 + 다시 그리기 + (선택) 알림 + 포커스 되돌리기(다시 그리면 눌렀던 버튼이 새 노드가 된다)
function applyFolders(fn, { msg, focus } = {}) {
  const st = fn(loadFolders());
  if (!saveFolders(st)) return null;
  renderSidebar(side.query);
  if (msg) toast(msg);
  if (focus) $('campList').querySelector(focus)?.focus();
  return st;
}
const fsel = id => `.cf-fold[data-fid="${CSS.escape(id)}"] .cf-tog`;
const csel = id => `.citem[data-id="${CSS.escape(id)}"] .copen`;

// 로고 썸네일 — 96px PNG 를 한 번 만들어 캠페인 기록(logoThumb)에 둔다. 목록은 이 작은 그림만 읽는다
function thumbHtml(c) {
  const t = c.logoThumb, logo = c.style?.logo;
  const who = c.context?.core?.client || displayName(c);
  if (logo && t?.src && t.sig === logoSig(logo)) return `<div class="thumb ltile ${t.tile === 'dark' ? 'dark' : 'light'}"><img src="${t.src}" alt="${escH(who)} 로고" width="40" height="40"></div>`;
  const initial = displayName(c).replace(/[^A-Za-z가-힣0-9]/g, '').slice(0, 2) || 'MB';
  return `<div class="thumb" style="background:${escH(c.style?.palette?.primary ?? '#5f6368')}" aria-hidden="true">${escH(initial)}</div>`;
}
async function makeLogoThumb(c) {
  const src = c.style?.logo; if (!src) return null;
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
  const S = 96, b = containBox(img.naturalWidth || img.width, img.naturalHeight || img.height, S);
  if (!b.w) return null;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, b.x, b.y, b.w, b.h);
  // 톤: 로고 실측(logoMeta.tone) → 사용자가 고른 로고 톤 → 썸네일에서 직접 잰 값
  const tone = c.style.logoMeta?.tone ?? (c.style.logoTone === 'light' ? 'light' : null) ?? logoToneOfRGBA(g.getImageData(0, 0, S, S).data, S, S);
  return { sig: logoSig(src), src: cv.toDataURL('image/png'), tile: tileToneFor(tone) };
}
async function fillLogoThumbs(list) {
  if (side.thumbJob) return;
  const need = list.filter(c => c.style?.logo && c.logoThumb?.sig !== logoSig(c.style.logo));
  if (!need.length) return;
  side.thumbJob = true;
  try {
    for (const c of need) {
      const t = await makeLogoThumb(c).catch(() => null); if (!t) continue;
      const store = loadStore(), rec = store.find(x => x.id === c.id); if (!rec) continue;
      rec.logoThumb = t;
      try { saveStore(store); } catch { continue; }
      for (const n of document.querySelectorAll(`.citem[data-id="${CSS.escape(c.id)}"] .thumb`)) n.outerHTML = thumbHtml(rec);
    }
  } finally { side.thumbJob = false; }
}

function campRow(c, st, { showFolder = false, draggable = true } = {}) {
  const d = document.createElement('div');
  d.className = 'citem'; d.dataset.id = c.id;
  const name = displayName(c);
  const edits = (c.log ?? []).filter(e => e.type === 'manual_edit' || e.type === 'propagation_run').length;
  const fname = showFolder ? folderOf(st, c.id)?.name ?? NONE_LABEL : null;
  d.innerHTML = `<button type="button" class="copen">${thumbHtml(c)}
      <span class="m"><b>${escH(name)}</b>
        <span>${fname ? `<em class="cf-info">${IC.folder}${escH(fname)}</em>` : ''}${escH(c.context?.core?.date ?? '')} · ${c.artifacts?.length ?? 0}종${edits ? ` · 수정 ${edits}회` : ''}</span></span></button>
      <span class="badge ${c.status === 'approved' ? 'approved' : 'draft'}">${c.status === 'approved' ? '승인' : '작업 중'}</span>
      <button type="button" class="cmove" aria-label="${escH(name)} — 폴더로 이동" title="폴더로 이동">${IC.move}</button>`;
  d.querySelector('.copen').onclick = () => openStored(c);
  d.querySelector('.cmove').onclick = e => openMoveModal(c, e.currentTarget);
  if (draggable) {
    d.draggable = true;
    d.ondragstart = e => { e.dataTransfer.setData('text/x-mbm-campaign', c.id); e.dataTransfer.effectAllowed = 'move'; d.classList.add('dragging'); $('campList').classList.add('dragging'); };
    d.ondragend = () => { d.classList.remove('dragging'); $('campList').classList.remove('dragging'); };
  }
  return d;
}

function folderSection(g, st, idx) {
  const s = document.createElement('section');
  s.className = 'cf-fold' + (g.folder ? '' : ' none'); s.dataset.fid = g.id;
  const bodyId = `fb-${g.id}`;
  s.innerHTML = `<div class="cf-head">
      <button type="button" class="cf-tog" aria-expanded="${g.open}" aria-controls="${escH(bodyId)}"${g.folder ? ' title="Alt+↑/↓ 로 순서 바꾸기"' : ''}>${IC.chev}${IC.folder}<span class="cf-name">${escH(g.name)}</span><span class="cf-count"><span aria-hidden="true">${g.items.length}</span><span class="cf-sr">, 캠페인 ${g.items.length}개</span></span></button>
      ${g.folder ? `<button type="button" class="cf-more" aria-label="${escH(g.name)} 폴더 관리" title="이름 바꾸기 · 순서 · 삭제">${IC.more}</button>` : ''}
    </div>
    <div class="cf-body" id="${escH(bodyId)}" role="group" aria-label="${escH(g.name)}"${g.open ? '' : ' hidden'}></div>`;
  const body = s.querySelector('.cf-body');
  for (const c of g.items) body.appendChild(campRow(c, st));
  if (!g.items.length) body.innerHTML = `<p class="cf-empty">${g.folder ? '비어 있어요 — 캠페인을 여기로 끌어 놓거나 행의 폴더 버튼으로 옮기세요.' : '모든 캠페인이 폴더에 들어가 있어요.'}</p>`;
  const tog = s.querySelector('.cf-tog');
  tog.onclick = () => applyFolders(x => toggleFolder(x, g.id), { focus: fsel(g.id) });
  tog.onkeydown = e => {
    if (!g.folder || !e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    applyFolders(x => moveFolderBy(x, g.id, e.key === 'ArrowUp' ? -1 : 1), { focus: fsel(g.id) });
  };
  s.querySelector('.cf-more')?.addEventListener('click', () => openFolderModal(g.id));
  if (g.folder) {
    const head = s.querySelector('.cf-head');
    head.draggable = true;
    head.ondragstart = e => { e.dataTransfer.setData('text/x-mbm-folder', g.id); e.dataTransfer.effectAllowed = 'move'; s.classList.add('dragging'); };
    head.ondragend = () => s.classList.remove('dragging');
  }
  // 놓기 — 캠페인은 이 폴더로, 폴더는 이 자리로(「폴더 없음」에 놓으면 맨 끝)
  const accepts = e => [...e.dataTransfer.types].some(t => t === 'text/x-mbm-campaign' || t === 'text/x-mbm-folder');
  s.ondragover = e => { if (!accepts(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; s.classList.add('drop'); };
  s.ondragleave = e => { if (!s.contains(e.relatedTarget)) s.classList.remove('drop'); };
  s.ondrop = e => {
    s.classList.remove('drop');
    const cid = e.dataTransfer.getData('text/x-mbm-campaign'), fid = e.dataTransfer.getData('text/x-mbm-folder');
    if (!cid && !fid) return;
    e.preventDefault();
    if (cid) moveCampaignTo(cid, g.id);
    else if (fid && fid !== g.id) applyFolders(x => reorderFolder(x, fid, g.folder ? idx : x.folders.length), { msg: '폴더 순서를 바꿨어요' });
  };
  return s;
}

function moveCampaignTo(cid, fid) {
  const st = loadFolders();
  if ((st.assign[cid] ?? NONE) === (fid ?? NONE)) return;
  const c = loadStore().find(x => x.id === cid);
  const to = fid === NONE ? NONE_LABEL : st.folders.find(f => f.id === fid)?.name;
  applyFolders(x => moveCampaign(x, cid, fid), { msg: `${c ? displayName(c) : '캠페인'} → ${to ?? NONE_LABEL}`, focus: csel(cid) });
}

function renderSidebar(query = '') {
  side.query = query;
  const cond = query ? parseQuery(query) : {};
  const chips = $('qchips'); chips.innerHTML = '';
  if (query) for (const [k, v] of Object.entries(cond)) {
    const s = document.createElement('span');
    s.textContent = { year: `연도 ${v}`, channel: CHANNEL_LABEL[v] ?? v, q: `"${v}"` }[k];
    chips.appendChild(s);
  }
  const all = loadStore(), st = loadFolders(all);
  const box = $('campList'); box.innerHTML = '';
  const empty = $('campEmpty');
  if (query) {
    // 검색은 폴더를 가로질러 — 결과마다 어느 폴더에 있는지 같이 보인다
    const list = filterCampaigns(all, cond, st).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
    for (const c of list) box.appendChild(campRow(c, st, { showFolder: st.folders.length > 0, draggable: false }));
    empty.style.display = list.length ? 'none' : 'block';
    if (!list.length) empty.textContent = '조건에 맞는 캠페인이 없습니다 — 조건을 바꿔 다시 검색해 보세요.';
  } else if (!st.folders.length) {
    // 폴더를 아직 안 만들었으면 예전처럼 한 줄 목록 — 쓰지 않는 사람에게 묶음 머리를 보이지 않는다
    for (const c of [...all].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))) box.appendChild(campRow(c, st, { draggable: false }));
    empty.style.display = all.length ? 'none' : 'block';
    empty.innerHTML = '승인 완료한 캠페인이 여기에 쌓입니다.<br>과거 자산 재사용의 진입점입니다.';
  } else {
    groupCampaigns(all, st).forEach((g, i) => box.appendChild(folderSection(g, st, i)));
    empty.style.display = 'none';
  }
  fillLogoThumbs(all);
}

// 모달 공용 — 닫힐 때 포커스를 연 버튼(다시 그려졌으면 같은 자리의 새 버튼)으로 돌려준다
function afterModalClose(fn) {
  const ov = $('overlay');
  const mo = new MutationObserver(() => { if (ov.style.display === 'none') { mo.disconnect(); fn(); } });
  mo.observe(ov, { attributes: true, attributeFilter: ['style'] });
}
const focusLost = () => !document.activeElement || document.activeElement === document.body || $('overlay').contains(document.activeElement);
function modalFocus(sel) { setTimeout(() => { const n = $('modalBody').querySelector(sel); n?.focus(); if (n?.tagName === 'INPUT' && !/radio|checkbox/.test(n.type)) n.select(); }, 0); }
function enterSubmits(input) { input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); $('modalBtns').querySelector('.pri')?.click(); } }); }
function showFieldError(box, msg, input) {
  box.textContent = msg ?? '';
  input?.setAttribute('aria-invalid', msg ? 'true' : 'false');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('overlay').style.display === 'flex') closeModal(); });

function openNewFolderModal() {
  modal({
    title: '새 폴더',
    desc: '캠페인을 고객사·연도·행사별로 묶어 두세요.',
    body: `<label for="fNew">폴더 이름</label><input id="fNew" maxlength="40" placeholder="예: 2026 하반기 채용" aria-describedby="fNewErr"><div class="cf-err" id="fNewErr" role="alert"></div>`,
    actions: [
      { label: '취소' },
      { label: '만들기', pri: true, fn: () => {
        const box = $('modalBody'), input = box.querySelector('#fNew');
        const err = nameError(loadFolders(), input.value);
        if (err) { showFieldError(box.querySelector('#fNewErr'), err, input); input.focus(); return false; }
        let id = null;
        applyFolders(x => { const r = createFolder(x, input.value); id = r.id; return r.st; }, { msg: `「${cleanName(input.value)}」 폴더를 만들었어요` });
        afterModalClose(() => $('campList').querySelector(fsel(id))?.focus());
      } },
    ],
  });
  const input = $('modalBody').querySelector('#fNew');
  input.addEventListener('blur', () => { if (input.value.trim()) showFieldError($('modalBody').querySelector('#fNewErr'), nameError(loadFolders(), input.value), input); });
  enterSubmits(input);
  modalFocus('#fNew');
  afterModalClose(() => { if (focusLost()) $('newFolderBtn')?.focus(); });
}
$('newFolderBtn').onclick = () => openNewFolderModal();

function openMoveModal(c, opener) {
  const st = loadFolders(), cur = st.assign[c.id] ?? NONE, name = displayName(c);
  const opts = [...st.folders.map(f => [f.id, f.name]), [NONE, NONE_LABEL]];
  modal({
    title: '폴더로 이동',
    desc: `「${name}」 — 옮길 폴더를 고르세요.`,
    body: `<div class="cf-pick" role="radiogroup" aria-label="폴더">${opts.map(([id, n]) => `<label class="pickrow"><input type="radio" name="cf-pick" value="${escH(id)}"${id === cur ? ' checked' : ''}><b>${escH(n)}</b>${id === cur ? '<span>지금 여기</span>' : ''}</label>`).join('')}</div>
      <label for="fpNew">또는 새 폴더를 만들어 옮기기</label><input id="fpNew" maxlength="40" placeholder="새 폴더 이름 (비워 두면 위에서 고른 폴더)" aria-describedby="fpErr"><div class="cf-err" id="fpErr" role="alert"></div>`,
    actions: [
      { label: '취소' },
      { label: '이동', pri: true, fn: () => {
        const box = $('modalBody'), input = box.querySelector('#fpNew');
        let fid = box.querySelector('input[name="cf-pick"]:checked')?.value ?? NONE;
        if (input.value.trim()) {
          const err = nameError(loadFolders(), input.value);
          if (err) { showFieldError(box.querySelector('#fpErr'), err, input); input.focus(); return false; }
          let nid = null;
          if (!applyFolders(x => { const r = createFolder(x, input.value); nid = r.id; return r.st; })) return false;
          fid = nid;
        }
        moveCampaignTo(c.id, fid);
        afterModalClose(() => $('campList').querySelector(csel(c.id))?.focus());
      } },
    ],
  });
  enterSubmits($('modalBody').querySelector('#fpNew'));
  enterSubmits($('modalBody').querySelector('.cf-pick'));   // 라디오에서 Enter 로 바로 옮기기
  modalFocus('input[name="cf-pick"]:checked');
  afterModalClose(() => { if (focusLost()) ($('campList').querySelector(`.citem[data-id="${CSS.escape(c.id)}"] .cmove`) ?? opener)?.focus(); });
}

function openFolderModal(fid) {
  const st = loadFolders(), f = st.folders.find(x => x.id === fid); if (!f) return;
  const count = Object.values(st.assign).filter(v => v === fid).length;
  const i = st.folders.indexOf(f);
  modal({
    title: '폴더 관리',
    desc: `캠페인 ${count}개가 들어 있어요.`,
    body: `<label for="fRen">폴더 이름</label><input id="fRen" maxlength="40" value="${escH(f.name)}" aria-describedby="fRenErr"><div class="cf-err" id="fRenErr" role="alert"></div>
      <label>순서</label><div class="cf-order"><button type="button" class="btn" id="fUp"${i === 0 ? ' disabled' : ''}>위로</button><button type="button" class="btn" id="fDown"${i === st.folders.length - 1 ? ' disabled' : ''}>아래로</button><span>목록에서 Alt+↑/↓ · 머리를 끌어 놓아도 돼요</span></div>`,
    actions: [
      { label: '폴더 삭제', fn: () => { openDeleteModal(fid); return false; } },
      { label: '취소' },
      { label: '저장', pri: true, fn: () => {
        const box = $('modalBody'), input = box.querySelector('#fRen');
        const err = nameError(loadFolders(), input.value, fid);
        if (err) { showFieldError(box.querySelector('#fRenErr'), err, input); input.focus(); return false; }
        if (cleanName(input.value) !== f.name) applyFolders(x => renameFolder(x, fid, input.value), { msg: `폴더 이름 → 「${cleanName(input.value)}」` });
      } },
    ],
  });
  const box = $('modalBody');
  const move = d => {
    const s2 = applyFolders(x => moveFolderBy(x, fid, d)); if (!s2) return;
    const j = s2.folders.findIndex(x => x.id === fid);
    box.querySelector('#fUp').disabled = j === 0; box.querySelector('#fDown').disabled = j === s2.folders.length - 1;
    toast(`순서 ${j + 1} / ${s2.folders.length}`);
  };
  box.querySelector('#fUp').onclick = () => move(-1);
  box.querySelector('#fDown').onclick = () => move(1);
  enterSubmits(box.querySelector('#fRen'));
  modalFocus('#fRen');
  afterModalClose(() => { if (focusLost()) ($('campList').querySelector(`.cf-fold[data-fid="${CSS.escape(fid)}"] .cf-more`) ?? $('newFolderBtn'))?.focus(); });
}

function openDeleteModal(fid) {
  const st = loadFolders(), f = st.folders.find(x => x.id === fid); if (!f) return;
  const count = Object.values(st.assign).filter(v => v === fid).length;
  modal({
    title: `「${f.name}」 폴더 삭제`,
    desc: count ? `안의 캠페인 ${count}개는 「${NONE_LABEL}」으로 옮겨집니다. 캠페인은 지워지지 않아요.` : '빈 폴더입니다. 캠페인은 지워지지 않아요.',
    body: '',
    actions: [
      { label: '취소', fn: () => { openFolderModal(fid); return false; } },
      { label: '삭제', pri: true, fn: () => { applyFolders(x => deleteFolder(x, fid), { msg: `폴더 「${f.name}」 삭제 — 캠페인 ${count}개는 ${NONE_LABEL}` }); } },
    ],
  });
  setTimeout(() => $('modalBtns').querySelector('.btn:not(.pri)')?.focus(), 0);   // 지우는 쪽이 기본 포커스가 되지 않게
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
    mode: 'light', colors: ['#0A3D91', '#11095F', '#B56705'], font: 'KakaoBigSans', mood: '',
    kvReadability: null, kvMeta: null, suggests: [], roster: [], phase: 'target', styleDone: false, signageDone: false, history: [],
    // 무엇을(track: online·offline·both) → 어디에(targetDone) 를 대화에서 고른다. suggestTrack = 브리프에서 읽은 제안(고르기 전까지 확정 아님)
    targetDone: false, suggestTrack: null,
    // briefDone: 내용(회사·직무…)이 정해졌는가 · asking: 꼭 필요한 값이 없어 대화로 묻는 중인 항목
    // specOff: 고른 매체의 추출 규격 중 이번에 만들지 않기로 끈 것 · specOn: 참고 규격(extract:false) 중 일부러 켠 것 · specRefs: 「참고 규격 포함」 토글(10-14 추출 47규격)
    briefDone: false, asking: null, specOff: new Set(), specOn: new Set(), specRefs: false, pickerOpen: false,
    // 로고에서 뽑은 색 · 주색을 어느 자료가 맡는가(null=자동: 로고에 색이 있으면 로고)
    logoSuggests: [], colorLead: null,
    // 지면(배경) — 기본은 키비주얼에서 읽는다. 사람이 고정하는 것은 단색/그라데이션과 직접 고른 색뿐
    bgMode: 'auto', bgColor: null, kvUse: 'auto', kvTypeOverride: null, logoTone: null, logoLightManual: false, object: null, objectMeta: null,
  };
  const seed = parseBriefRegex(text);
  Object.assign(state.intake.fields, seed.fields);
  state.intake.channels = seed.channels;
  state.intake.kind = seed.kind; state.intake.suggestTrack = seed.track; state.intake.media = seed.media ?? [];
  $('thread').innerHTML = '';
  clearSlot();
  show('intake');
  renderSteps();
  bub('user', text);
  await turn(text, { initial: true });
}

function agentState() {
  const it = state.intake;
  return {
    phase: it.phase, kind: it.kind, track: it.track === 'both' ? 'online' : it.track, media: it.media, fields: it.fields, channels: it.channels, kv: it.kv,
    briefDone: it.briefDone, styleDone: it.styleDone, signageDone: it.signageDone, signage: it.signage, roster: it.roster,
    style: { mode: it.mode, colors: it.colors, font: it.font },
  };
}

async function turn(userText, { initial = false } = {}) {
  const it = state.intake;
  it.history.push({ role: 'user', text: userText });
  if (it.asking) { answerAsk(userText); return; }
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
  // 첫 브리프에서 읽은 트랙은 제안일 뿐이다 — "무엇을 만들까요"는 사용자가 고른다
  if (initial && res.patch?.track) { it.suggestTrack = res.patch.track; res.patch.track = null; }
  applyPatch(res.patch);
  // 단계는 화면의 카드가 넘긴다 — 진행자가 앞서 나가도 무엇을·어디에를 고르기 전에는 그 단계에 머문다.
  // 내용이 정해진 뒤 "알아서 해"처럼 진행자가 준비됐다고 하면 스타일은 기본값으로 확정한다.
  if (res.ready && it.briefDone) it.styleDone = true;
  const st = stepOf(it);
  if (st === 'ask') { afterWhere(); return; }
  it.phase = PHASE_OF[st];
  renderSteps();
  const msg = (st === 'type' || st === 'where') ? stepPrompt(it, st) : res.say;
  bub('agent', msg);
  it.history.push({ role: 'agent', text: msg });
  if (st === 'draft') { buildAndGenerate(); return; }
  renderSlot({ focus: true });
}

/* ── 단계 ── 무엇을 → 어디에 → (꼭 필요한 값이 없으면 묻기) → (행사 인쇄물 세트) → 스타일 → 생성 */
const TRACK_CHOICE = { online: '광고 소재', offline: '오프라인 인쇄물', both: '광고 소재와 인쇄물 둘 다' };
const wantsAd = it => it.track === 'online' || it.track === 'both';
const wantsPrint = it => it.track === 'offline' || it.track === 'both';
const PRINT_RECRUIT = ['hyunsumak', 'xbanner', 'poster'];   // 채용 캠페인의 인쇄물 — 명찰·포토부스는 행사용
const needsSignage = it => it.kind !== 'recruit' && !it.signageDone && it.channels.some(c => OFFLINE_CH.includes(c));
function stepOf(it) {
  if (!it.track) return 'type';
  if (!it.targetDone) return 'where';
  if (!it.briefDone) return 'ask';
  if (needsSignage(it)) return 'signage';
  if (!it.styleDone) return 'style';
  return 'draft';
}
const PHASE_OF = { type: 'target', where: 'target', ask: 'target', signage: 'target', style: 'style', draft: 'draft' };
// 받침이 있으면 앞의 조사, 없으면 뒤의 조사 — "자소설닷컴을", "리멤버를"
const josa = (word, withB, without) => { const c = String(word).trim().slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? withB : without; };
function stepPrompt(it, st) {
  if (st === 'type') {
    const hint = it.suggestTrack ? ` 브리프를 보면 ${TRACK_CHOICE[it.suggestTrack]}인 것 같아요.` : '';
    return `무엇을 만들까요?${hint} 아래에서 골라 주세요.`;
  }
  const ask = [];
  if (wantsAd(it)) ask.push(it.kind === 'recruit' ? '어느 매체에 홍보하나요? 매체를 고르면 그 매체의 소재가 전부 만들어져요.' : '어느 매체에 홍보하나요? 매체를 고르면 그 매체의 소재가 전부 만들어지고, 사내 그룹웨어 썸네일도 같이 고를 수 있어요.');
  if (wantsPrint(it)) ask.push('인쇄물은 무엇을 만들까요?');
  const names = wantsAd(it) ? it.media.map(mediumName) : [];
  const pre = names.length ? ` 브리프에 있던 ${names.join('·')}${josa(names[names.length - 1], '을', '를')} 골라 뒀어요.` : '';
  return ask.join(' ') + pre;
}
function goStep(st) {
  const it = state.intake;
  it.phase = PHASE_OF[st];
  renderSteps();
  if (st === 'type' || st === 'where') say(stepPrompt(it, st));
  renderSlot({ focus: true });
}

function applyPatch(patch = {}) {
  const it = state.intake;
  if (patch.kind && KINDS[patch.kind]) it.kind = patch.kind;
  if (patch.track && TRACKS[patch.track]) it.track = patch.track;
  if (patch.media?.length) it.media = [...new Set([...(it.media ?? []), ...patch.media])];
  Object.assign(it.fields, patch.fields ?? {});
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

// 단계에 맞는 카드만 노출한다 — 무엇을 → 어디에 → 행사 인쇄물 세트 → 스타일. 묻는 중에는 카드 없이 입력창으로 답한다
function renderSlot(opts = {}) {
  const st = stepOf(state.intake);
  if (st === 'type') return slotType();
  if (st === 'where') return slotWhere();
  if (st === 'ask') { clearSlot(); $('cvIn').focus(); return; }
  if (st === 'signage') return slotSignage();
  if (st === 'style') return slotStyle();
  clearSlot();
}

const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mediumName = id => MEDIA.find(m => m.id === id)?.name ?? id;
// 이 종류의 캠페인에 내는 매체(core/media/*.json campaigns) — 행사에는 채용포털·취준생 커뮤니티가 안 보인다
// 매체 순서는 사용자 「컨시어지」 보드 순서(core/adspecs.js mediumRank — 자소설 → 리멤버 → 잡다 → 캐치 → 구글 → NAP → 인스타 → 카카오 → 네이버 → 에브리타임 → 블라인드 → 당근, 나머지는 뒤)
const mediaForKind = kind => MEDIA.filter(m => (m.campaigns ?? ['recruit', 'event']).includes(kind ?? 'event')).sort((x, y) => mediumRank(x.id) - mediumRank(y.id));
// 그릴 규격이 있는 매체 id — "전체 선택"이 고르는 범위
const pickableMedia = kind => { const all = adSpecGroups(); return mediaForKind(kind).filter(m => all.some(x => x.medium === m.id)).map(m => m.id); };

// 소재 묶음이 켜져 있나 — 추출 규격(47, core/media/_extract.json)은 기본 켬(끈 것만 specOff), 참고 규격은 기본 끔(켠 것만 specOn)
const groupOn = (g, it) => g.entry.extract ? !it.specOff?.has(g.id) : !!it.specOn?.has(g.id);
// 목록에 보이는 묶음 — 추출 규격 + 「참고 규격 포함」을 켰을 때만 참고 규격
const visibleGroups = (it, media = null) => adSpecGroups(media).filter(g => g.entry.extract || it.specRefs);
const refGroupCount = () => adSpecGroups().filter(g => !g.entry.extract).length;
// 이번에 만들 소재 — 고른 매체의 추출 규격에서 사용자가 끈 것을 빼고, 일부러 켠 참고 규격을 더한다
function chosenAdGroups(it = state.intake) {
  return adSpecGroups(it.media ?? []).filter(g => groupOn(g, it));
}
function specRow(g, it, AD) {
  const e = g.entry;
  // "PC프리미엄패키지 - PC채용공고배너" → 상품 / 지면. 같은 파일을 쓰는 상품은 한 줄에 같이 적는다.
  const split = n => { const i = n.indexOf(' - '); return i > 0 ? [n.slice(0, i), n.slice(i + 3)] : [null, n]; };
  const names = [e.rules.name ?? e.title, ...g.twins.map(id => AD[id]?.rules?.name ?? id)];
  const place = split(names[0])[1];
  const prods = names.map(n => split(n)[0]).filter(Boolean);
  const tag = [prods.length ? `${prods.join(' · ')}${g.twins.length ? ' 공용' : ''}` : (g.twins.length ? `${g.twins.length + 1}곳 공용` : ''), e.extract ? '' : '참고'].filter(Boolean).join(' · ');
  return `<label class="prow2 ${e.extract ? '' : 'ref'}"><input type="checkbox" data-s="${g.id}" ${groupOn(g, it) ? 'checked' : ''}>
    <span class="pn" title="${escH(names.join(' / '))}">${escH(place)}</span>
    <span class="pd">${e.w}×${e.h}</span>
    <span class="pt">${escH(tag)}</span>
    <span class="pw">${e.confidence !== '확정' ? '확인 필요' : ''}</span></label>`;
}

function mediaPickerHtml(it) {
  {
    const all = visibleGroups(it), AD = adSpecEntries();
    // 행사 캠페인에는 행사 홍보에 쓰는 매체(디지털·직장인/지역 커뮤니티)만 — 채용포털·취준생 커뮤니티는 숨긴다(core/media/*.json campaigns)
    const kindMedia = mediaForKind(it.kind);
    // 전체 선택 — 그릴 규격이 있는 매체를 한 번에(10-06 사용자 "소재 전체 선택도 있었으면"). 다 골라져 있으면 전체 해제
    const pickable = pickableMedia(it.kind);
    const allOn = pickable.length > 0 && pickable.every(id => it.media.includes(id));
    const pickAll = `<div class="pspec"><span>매체 ${pickable.length}곳 · 소재 ${all.filter(x => pickable.includes(x.medium)).length}종</span>
      <button type="button" class="lnk" id="mAll" aria-pressed="${allOn}">${allOn ? '전체 해제' : '전체 선택'}</button></div>`;
    const cards = pickAll + ['채용포털', '디지털', '커뮤니티', '기타'].map(g => {
      const ms = kindMedia.filter(m => m.group === g);
      if (!ms.length) return '';
      return `<div class="pgrp"><h5>${g}</h5><div class="mcards">${ms.map(m => {
        const gs = all.filter(x => x.medium === m.id), n = gs.length, on = it.media.includes(m.id);
        const k = on ? gs.filter(x => groupOn(x, it)).length : gs.filter(x => x.entry.extract).length;
        // 투명 PNG 필수 자리 수 — 배경 있는 키비주얼로는 글자만 나가는 자리라 고르기 전에 보여 준다(오브젝트 누끼를 올리면 거기에 쓴다)
        const nCut = gs.filter(x => needsCutout(AD[x.id]?.rules)).length;
        return n
          ? `<button type="button" class="mcard ${on ? 'on' : ''}" data-m="${m.id}" aria-pressed="${on}" title="${nCut ? `누끼(투명 PNG)가 필요한 자리 ${nCut}곳` : ''}"><span class="mc-ck" aria-hidden="true"></span><b>${escH(m.name)}</b><small>소재 ${k}종${nCut ? ` · 누끼 ${nCut}` : ''}</small></button>`
          : `<button type="button" class="mcard" disabled title="그릴 수 있는 규격이 없어요 — 매체에 자료만 전달하는 상품입니다"><span class="mc-ck" aria-hidden="true"></span><b>${escH(m.name)}</b><small>자료만 전달</small></button>`;
      }).join('')}</div></div>`;
    }).join('');
    const picked = it.media.filter(id => all.some(x => x.medium === id));
    // 추출 규격(47)만 기본으로 만든다. 「참고 규격 포함」을 켜면 나머지 규격도 목록에 보이고 하나씩 켤 수 있다(10-14 사용자 컨시어지 보드 목록)
    const specToggle = picked.length ? `<div class="pspec"><span>${it.specRefs ? '추출 규격 + 참고 규격까지 보여요.' : '고른 매체의 추출 규격이 전부 만들어져요.'}</span>
      <button type="button" class="lnk" id="sRefs" aria-pressed="${!!it.specRefs}">${it.specRefs ? '참고 규격 숨기기' : `참고 규격 포함 (${refGroupCount()})`}</button>
      <button type="button" class="lnk" id="sSpecs" aria-expanded="${!!it.specOpen}">${it.specOpen ? '규격 목록 닫기' : '규격 하나씩 고르기'}</button></div>` : '';
    if (!it.specOpen) return cards + specToggle;
    const lists = it.media.map(id => {
      const gs = all.filter(x => x.medium === id);
      if (!gs.length) return '';
      return `<div class="plist" data-m="${id}">
        <div class="phead"><b>${escH(mediumName(id))}</b><span data-n>${gs.length}종 중 ${gs.filter(g => groupOn(g, it)).length}종</span>
          <button type="button" class="lnk" data-all="${id}">전체</button><button type="button" class="lnk" data-none="${id}">해제</button></div>
        ${gs.map(g => specRow(g, it, AD)).join('')}</div>`;
    }).join('');
    return cards + specToggle + lists;
  }
}
function channelCardsHtml(list, it) {
  return `<div class="mcards">${list.map(c => { const on = it.channels.includes(c);
    return `<button type="button" class="mcard ${on ? 'on' : ''}" data-c="${c}" aria-pressed="${on}"><span class="mc-ck" aria-hidden="true"></span><b>${CHANNEL_LABEL[c]}</b><small>${CHANNEL_DESC[c]}</small></button>`; }).join('')}</div>`;
}

/* ── 1단계: 무엇을 만들까요 ── 광고 소재 / 오프라인 인쇄물 / 둘 다. 캠페인 종류(채용·행사)도 여기서 바로잡는다 */
function slotType() {
  const it = state.intake;
  const desc = it.kind === 'recruit'
    ? { online: '채용포털·디지털·커뮤니티 매체에 나가는 광고', offline: '현수막 · X배너 · 포스터', both: '매체 광고 + 인쇄물' }
    : { online: '구글·카카오·네이버 등 매체 광고 + 그룹웨어 썸네일', offline: '포스터 · X배너 · 현수막 · 명찰 · 포토부스', both: '매체 광고 + 인쇄물' };
  slot(`<div class="card2"><div class="shead"><h4>무엇을 만들까요</h4>
      <div class="kseg" role="group" aria-label="캠페인 종류">${Object.entries(KINDS).map(([k, v]) =>
        `<button type="button" data-k="${k}" class="${k === it.kind ? 'on' : ''}" aria-pressed="${k === it.kind}">${v.label}</button>`).join('')}</div></div>
    <div class="tchoices">${Object.keys(TRACK_CHOICE).map(t =>
      `<button type="button" class="tchoice ${it.suggestTrack === t ? 'sug' : ''}" data-t="${t}"><b>${TRACK_CHOICE[t]}</b><small>${desc[t]}</small>${it.suggestTrack === t ? '<em>브리프에서 읽음</em>' : ''}</button>`).join('')}</div></div>`);
  $('slot').querySelectorAll('.kseg button').forEach(b => b.onclick = () => { it.kind = b.dataset.k; slotType(); $('slot').querySelector(`.kseg [data-k="${it.kind}"]`)?.focus(); });
  $('slot').querySelectorAll('.tchoice').forEach(b => b.onclick = () => {
    it.track = b.dataset.t;
    bub('user', TRACK_CHOICE[it.track]); it.history.push({ role: 'user', text: TRACK_CHOICE[it.track] });
    clearSlot();
    goStep('where');
  });
}

/* ── 2단계: 어디에 홍보하나요 ── 매체(광고) · 인쇄물. 고른 매체의 소재는 전부 만든다 */
function slotWhere() {
  const it = state.intake;
  const ad = wantsAd(it), print = wantsPrint(it), recruit = it.kind === 'recruit';
  const printList = recruit ? PRINT_RECRUIT : OFFLINE;
  const keepScroll = $('slot').querySelector('.wcard')?.scrollTop ?? 0;
  const secs = [];
  // 매체 광고는 종류 가리지 않고 매체 고르기(행사는 디지털·커뮤니티 매체만 보인다) · 행사는 사내 그룹웨어 썸네일도 같이 고른다
  if (ad) secs.push(`<section class="wsec">${mediaPickerHtml(it)}</section>`);
  if (ad && !recruit) secs.push(`<section class="wsec"><h5>사내</h5>${channelCardsHtml(ONLINE, it)}</section>`);
  if (print) secs.push(`<section class="wsec"><h5>인쇄물</h5>${channelCardsHtml(printList, it)}</section>`);
  const box = slot(`<div class="card2 wcard"><h4>${ad ? '어디에 홍보하나요' : '무엇을 만들까요'}</h4>${secs.join('')}
    <div class="sfoot2"><span class="smsg" id="wMsg" role="status"></span><button type="button" class="btn" id="wBack">이전</button><button type="button" class="btn pri" id="wOk">다음</button></div></div>`);
  box.querySelector('.wcard').scrollTop = keepScroll;
  const count = () => {
    const nAd = ad ? chosenAdGroups(it).length + (recruit ? 0 : it.channels.filter(c => ONLINE.includes(c)).length) : 0;
    const nPr = print ? it.channels.filter(c => printList.includes(c)).length : 0;
    return { nAd, nPr };
  };
  const foot = () => {
    const { nAd, nPr } = count();
    const parts = [ad && `소재 ${nAd}종`, print && `인쇄물 ${nPr}가지`].filter(Boolean);
    $('wMsg').textContent = parts.join(' · ');
  };
  const re = sel => { slotWhere(); if (sel) $('slot').querySelector(sel)?.focus({ preventScroll: true }); };
  box.querySelectorAll('.mcard[data-m]').forEach(b => b.onclick = () => {
    const id = b.dataset.m;
    it.media = it.media.includes(id) ? it.media.filter(x => x !== id) : [...it.media, id];
    re(`.mcard[data-m="${id}"]`);
  });
  box.querySelectorAll('.mcard[data-c]').forEach(b => b.onclick = () => {
    const c = b.dataset.c;
    it.channels = it.channels.includes(c) ? it.channels.filter(x => x !== c) : [...it.channels, c];
    re(`.mcard[data-c="${c}"]`);
  });
  $('sSpecs')?.addEventListener('click', () => { it.specOpen = !it.specOpen; re('#sSpecs'); });
  $('sRefs')?.addEventListener('click', () => { it.specRefs = !it.specRefs; if (it.specRefs) it.specOpen = true; re('#sRefs'); });
  $('mAll')?.addEventListener('click', () => {
    const ids = pickableMedia(it.kind);
    const allOn = ids.length > 0 && ids.every(id => it.media.includes(id));
    it.media = allOn ? it.media.filter(id => !ids.includes(id)) : [...new Set([...it.media, ...ids])];
    re('#mAll');
  });
  box.querySelectorAll('input[data-s]').forEach(cb => cb.onchange = () => {
    const g = adSpecGroups().find(x => x.id === cb.dataset.s);
    if (g && !g.entry.extract) { it.specOn ??= new Set(); if (cb.checked) it.specOn.add(g.id); else it.specOn.delete(g.id); }
    else if (cb.checked) it.specOff.delete(cb.dataset.s); else it.specOff.add(cb.dataset.s);
    const list = cb.closest('.plist'), all = list.querySelectorAll('input[data-s]');
    list.querySelector('[data-n]').textContent = `${all.length}종 중 ${[...all].filter(x => x.checked).length}종`;
    foot();
  });
  box.querySelectorAll('[data-all],[data-none]').forEach(b => b.onclick = () => {
    const id = b.dataset.all ?? b.dataset.none;
    // 「전체」는 보이는 묶음만 켠다 — 참고 규격은 「참고 규격 포함」을 켰을 때만. 「해제」는 참고 규격까지 다 끈다
    it.specOn ??= new Set();
    for (const g of adSpecGroups([id])) {
      if (g.entry.extract) { if (b.dataset.all) it.specOff.delete(g.id); else it.specOff.add(g.id); }
      else if (b.dataset.all) { if (it.specRefs) it.specOn.add(g.id); } else it.specOn.delete(g.id);
    }
    re(`.plist[data-m="${id}"] [${b.dataset.all ? 'data-all' : 'data-none'}]`);
  });
  $('wBack').onclick = () => { it.track = null; clearSlot(); it.phase = 'target'; renderSteps(); slotType(); };
  $('wOk').onclick = () => {
    const { nAd, nPr } = count();
    if (ad && !nAd) { toast(recruit ? '매체를 하나 이상 고르세요' : '매체나 그룹웨어 썸네일을 하나 이상 고르세요'); return; }
    if (print && !nPr) { toast('인쇄물을 하나 이상 고르세요'); return; }
    // 고른 쪽만 남긴다 — 광고 소재만 골랐는데 전에 읽은 인쇄물이 같이 만들어지면 안 된다
    if (!ad) it.media = [];
    it.channels = it.channels.filter(c => (ad && !recruit && ONLINE.includes(c)) || (print && printList.includes(c)));
    const said = [
      ad && [...it.media.map(mediumName), ...(recruit ? [] : it.channels.filter(c => ONLINE.includes(c)).map(c => CHANNEL_LABEL[c]))].join(' · ') + ` (소재 ${nAd}종)`,
      print && it.channels.filter(c => printList.includes(c)).map(c => CHANNEL_LABEL[c]).join(' · '),
    ].filter(Boolean).join(' / ');
    bub('user', said); it.history.push({ role: 'user', text: said });
    it.targetDone = true;
    if (recruit) it.signageDone = true;   // 채용 인쇄물은 본 안내 한 장씩 — 행사용 세트(방향 안내·접수) 구성은 묻지 않는다
    clearSlot();
    afterWhere();
  };
  foot();
}

// 어디에까지 고르면 — 내용은 브리프에서 읽은 그대로 간다. 따로 확인 화면을 두지 않는다.
// 큰 글자에 쓸 값(ESSENTIAL)이 없을 때만 한 가지씩 묻고, 나머지는 읽은 것을 한 줄로 알려 준다(고칠 건 말로).
function afterWhere() {
  const it = state.intake;
  const miss = (ESSENTIAL[it.kind] ?? []).filter(f => !it.fields[f]);
  if (miss.length) {
    it.asking = miss[0];
    it.phase = 'target'; renderSteps();
    say(ASK[miss[0]]);
    clearSlot(); $('cvIn').focus();
    return;
  }
  it.asking = null;
  it.briefDone = true;
  afterBrief(readSummary(it));
}
// 묻던 값의 답 — 말에서 읽히는 값이 있으면 그것을, 없으면 답 전체를 그 값으로 쓴다("한진정보통신이에요" → 한진정보통신)
function answerAsk(text) {
  const it = state.intake;
  const got = it.kind === 'recruit' ? extractRecruit(text) : {};
  for (const [k, v] of Object.entries(got)) if (v && !it.fields[k]) it.fields[k] = v;
  if (!it.fields[it.asking]) {
    const v = text.trim().replace(/[.!?。]+$/, '').replace(/\s*(이에요|예요|입니다|이요|요)$/, '').trim();
    if (v) it.fields[it.asking] = v;
  }
  // 회사를 몰라서 직무에 회사까지 붙어 읽혔으면("한미글로벌 건설사업관리 PM") 회사를 떼어 낸다
  if (it.asking === 'client' && it.fields.client && it.fields.role?.startsWith(it.fields.client)) {
    it.fields.role = it.fields.role.slice(it.fields.client.length).trim() || undefined;
    if (!it.fields.role) delete it.fields.role;
  }
  afterWhere();
}
// 읽은 내용 한 줄 — "한진정보통신 · 클라우드 엔지니어 · 정규직 · 서울 여의도 · 10.31(토) 마감"
function readSummary(it) {
  const f = it.fields;
  const day = d => { const iso = normDate(d); if (!iso) return d; const t = new Date(iso + 'T00:00'); return `${t.getMonth() + 1}.${t.getDate()}(${'일월화수목금토'[t.getDay()]})`; };
  const parts = it.kind === 'recruit'
    ? [f.season, f.client, f.hiringType, f.role, f.employType, f.location, f.deadline && `${f.startDate ? day(f.startDate) + ' ~ ' : ''}${day(f.deadline)} 마감`]
    : [f.name, f.date && day(f.date), f.venue, f.audience];
  const lacks = it.kind === 'recruit'
    ? [!f.deadline && '마감일', !f.location && '근무지'].filter(Boolean)
    : [!f.date && '일시', !f.venue && '장소'].filter(Boolean);
  const note = lacks.length ? ` ${lacks.join('·')}${josa(lacks[lacks.length - 1], '은', '는')} 브리프에 없어서 뺐어요.` : '';
  // 채용은 말로 고친 값을 규칙 진행자도 읽는다. 행사는 AI 키가 없으면 말로는 못 고치니 결과 화면의 일괄 편집을 알려 준다
  const fix = it.kind === 'recruit' ? '고칠 게 있으면 아래 입력창에 말로 알려 주세요(예: 마감 11월 5일로).' : '고칠 게 있으면 초안이 나온 뒤 오른쪽 패널에서 바로 고칠 수 있어요.';
  return `브리프에서 이렇게 읽었어요. ${parts.filter(Boolean).join(' · ')}.${note} ${fix}`;
}

// 내용이 정해진 뒤 — 진행자를 다시 부르지 않는다(기다릴 이유가 없다). 행사 인쇄물이 있으면 세트 구성, 아니면 스타일.
function afterBrief(lead = '') {
  const it = state.intake;
  if (needsSignage(it)) {
    say(`${lead ? lead + '\n\n' : ''}오프라인은 현장에서 여러 장이 세트로 나갑니다. 용도와 규격을 아래에서 정해 주세요. 방향 안내는 고른 화살표마다 한 장씩 만들어집니다.`);
    slotSignage();
    return;
  }
  goStyle(lead);
}
function say(text) {
  bub('agent', text);
  state.intake.history.push({ role: 'agent', text });
}
function goStyle(lead = '') {
  const it = state.intake;
  it.phase = 'style';
  renderSteps();
  say(`${lead ? lead + '\n\n' : ''}이제 스타일이에요. 키비주얼과 로고가 있으면 올려 주세요. 대표 컬러를 뽑아 드립니다. 없으면 컬러만 골라도 됩니다.`);
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

// 키비주얼 유형 직접 지정(10-12 결정 5) — 측정으로 판정이 안 되는 그림(흰 가운 × 흰 배경 의사 사진)을 디자이너가 고친다. 기본 「자동」.
// 네이티브 select(라벨 연결·키보드·포커스 링은 브라우저 기본 + 공통 :focus-visible). 값은 style.kvTypeOverride → normalizeStyle 이 kvMeta 에 입힌다
function kvTypeControlHtml(meta, override, id) {
  if (!meta?.field) return '';
  const auto = kvTypeOf(baseKvMeta(meta));
  const autoName = auto?.sub?.name ?? auto?.name ?? '';
  const opt = (v, label) => `<option value="${v}"${(override ?? 'auto') === v ? ' selected' : ''}>${label}</option>`;
  const groups = kvTypeChoices().map(t => `<optgroup label="${t.name}">${opt(t.id, `${t.name} — 세분 자동`)}${t.subs.map(st => opt(st.id, st.name)).join('')}</optgroup>`).join('');
  return `<label for="${id}">키비주얼 유형 <span style="color:var(--sub);font-weight:400">· ${override ? '직접 지정' : `자동: ${autoName}`}</span></label>
    <select id="${id}" aria-describedby="${id}Help" style="width:100%;padding:8px;border:1px solid var(--line);border-radius:8px;margin-bottom:4px">${opt('auto', `자동 (지금: ${autoName})`)}${groups}</select>
    <div id="${id}Help" style="font-size:11.5px;color:var(--sub);margin-bottom:10px">자동 판정이 틀렸을 때만 고르세요 — 놓는 법·지면·글자 규칙이 그 유형으로 바뀝니다.</div>`;
}

// 지면(배경) 조절 — 밝게/어둡게를 고르지 않는다. 키비주얼에서 읽은 색을 보여 주고, 단색·그라데이션 고정과 직접 고르기만 둔다.
const FIELD_SRC = { 'kv-edge': '키비주얼 가장자리 색', 'kv-colour': '키비주얼 대표색', brand: '브랜드 색', 'brand-tint': '브랜드 색 틴트 → 흰색', 'brand-dark-logo': '흰색 로고라 어두운 브랜드 색', 'brand-photo': '사진이라 브랜드 색 — 사진은 지면으로 녹임', 'photo-full': '사진 전체 + 글자 쪽 스크림', 'kv-full': '배경형 — 그림을 통째로 깔고 빈 자리에 글자', 'kv-texture': '질감 — 그라데이션을 통째로 깔고 글자만', manual: '직접 고른 색' };
function bgControlHtml(styleLike, id) {
  const f = resolveField(styleLike, { facing: 'left' });
  const mode = styleLike.background?.mode ?? 'auto';
  // 사진 키비주얼이면 쓰임을 고른다(보드 예시: 한쪽+녹임 6장 · 전체+스크림 9장) — 자동으로 정하면 다른 유형과 충돌해서 담당자 선택
  const kind = styleLike.keyVisual ? styleLike.kvMeta?.field?.kind ?? null : null;
  const use = styleLike.kvUse ?? 'auto';
  const full = kind === 'photo' && use === 'full';
  // 사진의 지면색은 로고 색을 따라간다 — 한독처럼 맞는 파랑이 나오지 않을 수 있어 로고색·사진 대표색·흰색을 한 번 눌러 바꾼다
  // 전체형의 스크림은 어두워야 흰 글자가 읽힌다 — 흰색 후보는 한쪽형(일화: 흰 지면에 사옥 사진)에서만
  const cands = kind === 'photo' ? [...new Set([styleLike.palette?.primary, ...(styleLike.kvMeta?.colors ?? []).slice(0, 3), ...(full ? [] : ['#FFFFFF'])].filter(Boolean).map(c => c.toUpperCase()))] : [];
  const candLabel = (c, i) => i === 0 ? '로고색' : c === '#FFFFFF' ? '흰색' : '사진색';
  const prev = full ? (styleLike.background?.color ?? styleLike.palette?.primary ?? f.css) : f.css;
  return `<label>배경 <span style="color:var(--sub)">· ${full ? FIELD_SRC['photo-full'] : FIELD_SRC[f.source] ?? ''}</span></label>
    ${kind === 'photo' ? `<div class="bgrow"><span style="font-size:12px;color:var(--sub);white-space:nowrap">사진 쓰임</span>
      <div class="vseg" id="${id}Use">${[['auto', '한쪽에 넣고 녹임'], ['full', '전체에 깔고 스크림']].map(([k, v]) => `<button data-u="${k}" class="${use === k ? 'on' : ''}" aria-pressed="${use === k}">${v}</button>`).join('')}</div></div>` : ''}
    <div class="bgrow"><span class="bgprev" style="background:${prev}" role="img" aria-label="배경 미리보기 ${f.stops.join(' → ')}"></span>
      <div class="vseg" id="${id}Seg">${[['auto', '자동'], ['solid', '단색'], ['gradient', '그라데이션']].map(([k, v]) => `<button data-b="${k}" class="${mode === k ? 'on' : ''}" aria-pressed="${mode === k}">${v}</button>`).join('')}</div></div>
    ${cands.length ? `<div class="bgrow" style="flex-wrap:wrap;gap:6px"><span style="font-size:12px;color:var(--sub);white-space:nowrap">${full ? '스크림 색' : '지면색'}</span>${cands.map((c, i) =>
      `<button class="sugg" data-fc="${c}" aria-label="${full ? '스크림' : '지면'} 색 ${c}"><i style="background:${c}"></i>${candLabel(c, i)}</button>`).join('')}</div>` : ''}
    <div class="bgrow"><label class="bgpick"><input type="color" id="${id}Color" value="${f.stops[0]}">직접 고르기</label>
      ${styleLike.background?.color ? `<button class="lnk" id="${id}Reset">키비주얼 색으로 되돌리기</button>` : ''}</div>`;
}

// 고른 소재 중 지금 키비주얼로는 그림이 빠지고 오브젝트 누끼가 필요한 자리 — "알바몬·에브리타임 3곳"
function objectSlots(it, field = it.kvMeta?.field ?? null) {
  return chosenAdGroups(it).filter(g => objectNeedOf(g.entry.rules, field));
}
function objectSlotsText(it, field) {
  const need = objectSlots(it, field);
  if (!need.length) return '';
  return `${[...new Set(need.map(g => g.entry.mediumName))].join('·')} ${need.length}곳`;
}
// 키비주얼을 올리면 어떻게 읽었는지, 어디에 어떻게 쓰이는지 한 번에 말한다 — 사용자가 결과를 보고 놀라지 않게(10-06)
function kvDiagnosis(it, meta) {
  const f = meta?.field, kind = f?.kind;
  const T = kvTypeOf(meta);
  if (T) say(`유형: ${kvTypeSummary(meta)}${T.sub ? ` — ${T.sub.name}` : ''}. ${T.sub?.guide?.[0] ?? T.type.place[0]}`);
  const how = kind === 'texture' ? '그라데이션 질감으로 읽었어요 — 지면 전체에 깔고 글자만 올려요.'
    : kind === 'cutout' ? '배경 없는 누끼로 읽었어요 — 자리에 맞춰 넣고 지면은 브랜드색이에요.'
    : kind === 'photo' ? '사진으로 읽었어요 — 브랜드색 지면에 녹여 넣어요.'
    : f?.room ? '배경을 품은 그림이에요 — 비율이 비슷한 규격엔 통째로 깔고 빈 자리에 글자, 띠에는 주인공만 당겨 넣어요.'
    : '배경을 품은 그림이에요 — 주인공을 당겨 자리를 채우고 가장자리 색을 지면으로 써요.';
  const slots = objectSlotsText(it, f);
  const tail = slots && !it.object ? ` ${slots}은 배경 없는 오브젝트가 필요한 자리라 지금 그림으론 글자만 나가요 — 옆의 '오브젝트 누끼'를 올리면 거기에만 씁니다.` : '';
  say(how + tail);
}
function slotStyle() {
  const it = state.intake;
  const adStyle = { palette: { primary: it.colors[0] }, keyVisual: it.kv, kvMeta: applyKvTypeOverride(it.kvMeta, it.kvTypeOverride), kvTypeOverride: it.kvTypeOverride ?? null, kvUse: it.kvUse ?? 'auto', logo: it.logo ?? null, logoLight: it.logoLight ?? null, logoTone: it.logoTone ?? null, logoMeta: it.logoMeta ?? null, background: { mode: it.bgMode, color: it.bgColor } };
  slot(`<div class="card2 scard"><h4>그래픽 가이드</h4>
    ${inputSpecHtml(it.kvCheck, it.logoCheck).replace('margin-top:8px', 'margin:-4px 0 10px')}
    <div class="styleRow">
      <div><div class="kvthumb" id="kvThumb" title="${escH(kvGuideText())}" style="${it.kv ? `background-image:url(${it.kv})` : ''}">${it.kv ? '' : '키비주얼<br>(필수)'}</div>
        <input type="file" id="kvFile" accept="image/*" style="display:none"></div>
      <div><div class="kvthumb logo" id="logoThumb" title="${escH(logoGuideText())}" style="${it.logo ? `background-image:url(${it.logo})` : ''}">${it.logo ? '' : '로고<br>(필수)'}</div>
        <input type="file" id="logoFile" accept="image/*" style="display:none"></div>
      <div><div class="kvthumb logo dark" id="logoLightThumb" title="어두운 지면(브랜드색 배경)에 올라갈 흰색 로고. 없으면 원색 로고를 반전해서 씁니다 — 컬러 로고는 뭉개집니다" style="${it.logoLight ? `background-image:url(${it.logoLight})` : ''}">${it.logoLight ? '' : '흰색 로고<br>(다크용)'}</div>
        <input type="file" id="logoLightFile" accept="image/*" style="display:none"></div>
      <div><div class="kvthumb logo" id="objThumb" title="배경 없는 오브젝트(투명 PNG). 알바몬 스플래시·에브리타임 보드·NAP 비즈보드·캐치 센터처럼 누끼가 필요한 자리에만 씁니다 — 키비주얼은 배경으로 그대로" style="${it.object ? `background-image:url(${it.object})` : ''}">${it.object ? '' : '오브젝트 누끼<br>(선택)'}</div>
        <input type="file" id="objFile" accept="image/png,image/webp" style="display:none"></div>
      <div class="f" style="flex:1;min-width:210px">
        <label>브랜드 컬러 <span id="kvHint" style="color:var(--gen1)"></span></label>
        <div class="palette">
          <span class="sw"><input type="color" class="swatch" id="c1" value="${it.colors[0]}"><small>주색</small></span>
          <span class="sw"><input type="color" class="swatch" id="c2" value="${it.colors[1]}"><small>보조</small></span>
          <span class="sw"><input type="color" class="swatch" id="c3" value="${it.colors[2]}"><small>포인트</small></span>
        </div>
        <div id="suggests" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div>
        <label style="margin-top:10px">폰트</label>
        <select id="fontSel" style="width:100%;padding:8px;border:1px solid var(--line);border-radius:8px">${fontOptions(it.font)}</select>
        <button class="lnk" id="fontUp" style="margin-top:4px">폰트 파일 첨부 (woff2 · ttf · otf)</button>
        <input type="file" id="fontFile" accept=".woff2,.woff,.ttf,.otf" style="display:none">
      </div>
    </div>
    <div class="sfoot2"><span class="smsg" id="stMsg" role="status"></span><button class="btn pri" id="stOk" ${(it.kv && it.logo) ? '' : 'disabled aria-disabled="true"'}>이 스타일로 진행</button></div></div>`);
  $('fontSel').value = it.font;
  $('fontSel').onchange = () => { it.font = $('fontSel').value; };
  $('fontUp').onclick = () => $('fontFile').click();
  $('fontFile').onchange = () => pickFontFile($('fontFile'), id => { it.font = id; slotStyle(); });
  // 손으로 고른 색은 다시 덮지 않는다 — 모드를 바꿨다고 방금 고른 색이 사라지면 신뢰를 잃는다
  ['c1', 'c2', 'c3'].forEach((id, i) => { $(id).oninput = () => { it.colors[i] = $(id).value.toUpperCase(); it.colorsManual = true; }; });
  $('bgSeg')?.querySelectorAll('button').forEach(b => b.onclick = () => { it.bgMode = b.dataset.b; slotStyle(); });
  if ($('bgColor')) $('bgColor').onchange = () => { it.bgColor = $('bgColor').value.toUpperCase(); slotStyle(); };
  if ($('bgReset')) $('bgReset').onclick = () => { it.bgColor = null; slotStyle(); };
  $('bgUse')?.querySelectorAll('button').forEach(b => b.onclick = () => { it.kvUse = b.dataset.u; slotStyle(); });
  if ($('kvTypeSel')) $('kvTypeSel').onchange = () => {
    const v = $('kvTypeSel').value; it.kvTypeOverride = v === 'auto' ? null : v;
    slotStyle(); $('kvTypeSel')?.focus();   // 다시 그린 뒤에도 포커스를 선택 상자에 둔다(키보드 사용자)
    const T = kvTypeOf(applyKvTypeOverride(it.kvMeta, it.kvTypeOverride));
    say(it.kvTypeOverride ? `유형을 「${T?.sub?.name ?? T?.name}」로 지정했어요 — ${T?.sub?.guide?.[0] ?? T?.type.place[0]}` : `유형을 자동 판정(${T?.sub?.name ?? T?.name})으로 되돌렸어요.`);
  };
  document.querySelectorAll('#slot [data-fc]').forEach(b => b.onclick = () => { it.bgColor = b.dataset.fc; slotStyle(); });
  renderSuggests();
  renderDpi();
  bindUpload($('kvThumb'), $('kvFile'), async d => {
    it.kvOrig = d;   // 원본(전달물용, 10-16)
    d = await prepKv(d);
    it.kv = d;
    $('kvHint').textContent = '분석 중…';
    try {
      const { suggests, readability, meta } = await analyzeKeyVisual(d);
      it.suggests = suggests; it.kvReadability = readability; it.kvMeta = meta;
      it.kvCheck = await kvCheckOf(it.kvOrig ?? d, meta); if (it.kvCheck.level === 'weak' || it.kvCheck.level === 'bad') toast(it.kvCheck.text);
      it.kvUse = 'auto';         // 새 그림이면 쓰임도 처음부터
      it.kvTypeOverride = null;  // 유형 지정도 새 그림이면 자동부터 — 사진이 아니면 '전체' 선택지가 사라진다
      it.colorsManual = false;   // 새 키비주얼이 들어왔으면 색은 그 이미지 기준으로 다시 잡는다
      applyDerived(); slotStyle();
      kvDiagnosis(it, meta);
      announceDpi();
      bub('agent', (leadOf(it) === 'logo'
        ? `주색은 로고 색(${it.colors[0]}) 그대로 두고, 보조·포인트를 키비주얼에서 뽑았어요 — ${it.colors.slice(1).join(', ')}.`
        : `키비주얼에서 뽑은 색을 주색·보조·포인트에 배치했어요 — ${it.colors.join(', ')}.`)
        );
    } catch { $('kvHint').textContent = ''; }
  });
  bindUpload($('logoThumb'), $('logoFile'), async d => {
    // 흰 배경 위 로고면 누끼를 따서 쓴다 — 배경 네모가 소재에 뜨지 않게. 밝기(logoTone) 판정도 따낸 뒤에 해야 맞다
    it.logoOrig = d;   // 원본(전달물용, 10-16)
    const prepped = await prepLogo(d);
    d = prepped.dataUrl;
    it.logo = d;
    it.logoMono = prepped.monoDataUrl ?? null;
    it.logoNote = prepped.note || null;
    try { it.logoSuggests = await analyzeLogo(d); } catch { it.logoSuggests = []; }
    // 흰색 로고만 올렸으면 그게 다크용 로고이기도 하다 — 지면은 어두운 브랜드색으로 간다
    // 톤·실측은 잉크만(글자 속을 지운 사본이 있으면 그것으로) — 남긴 흰 속을 세면 흰 원판 엠블럼이 「흰색 로고」가 된다(10-12 결정 12)
    try { it.logoTone = await logoToneOf(it.logoMono ?? d); } catch { it.logoTone = 'dark'; }
    try { it.logoMeta = await logoMetaOfUrl(it.logoMono ?? d); } catch { it.logoMeta = null; }
    it.logoCheck = await logoCheckOf(it.logoOrig ?? d, { changed: !!prepped.changed, tone: it.logoTone }); if (it.logoCheck.level === 'weak' || it.logoCheck.level === 'bad') toast(it.logoCheck.text);   // 세로 로고 크기·타일 로고 반전 여부(core/logo.js logoMeta → 렌더러)
    if (it.logoLightManual) it.logoTone = it.logoTone === 'light' ? 'light' : 'both';
    else if (it.logoTone === 'light') it.logoLight = d;
    else it.logoLight = null;
    it.colorsManual = false;   // 새 로고가 들어왔으면 색은 그 로고 기준으로 다시 잡는다
    it.colorLead = null;
    applyDerived(); slotStyle();
    say(it.logoSuggests.length
      ? `로고에서 ${it.logoSuggests[0]}를 뽑아 주색으로 잡았어요.${it.suggests.length ? ' 보조·포인트는 키비주얼 색을 그대로 씁니다.' : ''}`
      : it.suggests.length ? '로고가 검정·흰색 계열이라 뽑을 색이 없어요 — 색은 키비주얼에서 가져왔습니다.'
        : '로고가 검정·흰색 계열이라 뽑을 색이 없어요 — 키비주얼을 올리거나 컬러를 직접 골라 주세요.');
    if (it.logoTone === 'light' && !it.logoLightManual) say('흰색 로고네요 — 지면을 어두운 브랜드색으로 갑니다. 원색 로고도 올리면 밝은 지면도 쓸 수 있어요.');
    if (it.logoNote) say(`로고를 손질했어요 — ${it.logoNote}. 투명 여백을 잘라내야 칸 높이만큼 크게 보입니다.`);
  });
  bindUpload($('logoLightThumb'), $('logoLightFile'), async d => { d = (await prepLogo(d)).dataUrl; it.logoLight = d; it.logoLightManual = true; it.logoTone = it.logoTone === 'light' || !it.logo ? 'light' : 'both'; slotStyle(); });
  // 오브젝트 누끼 — 누끼가 필요한 자리에만 쓴다. 배경이 있는 그림이면 그 자리에 못 쓰니 바로 알려 준다
  bindUpload($('objThumb'), $('objFile'), async d => {
    d = await prepKv(d);
    it.object = d;
    try {
      const { meta } = await analyzeKeyVisual(d);
      it.objectMeta = meta;
      say((meta.field?.opaque ?? 1) >= 0.5
        ? '배경이 있는 그림이에요 — 누끼(투명 PNG)여야 투명 자리에 쓸 수 있어요. 이대로면 그 자리는 글자만 나가요.'
        : `오브젝트 누끼 올렸어요 — ${objectSlotsText(it) || '누끼가 필요한 자리'}에만 쓰고, 다른 매체는 키비주얼을 배경으로 그대로 써요.`);
    } catch { it.objectMeta = null; }
    slotStyle();
  });
  $('stOk').onclick = () => {
    // 키비주얼·로고는 필수(10-06 사용자 결정) — 그림 없는 소재는 예시에 없다. 되묻지 않고 막는다
    if (!it.kv || !it.logo) { say(!it.kv && !it.logo ? '키비주얼과 로고를 올려 주세요. 둘 다 있어야 소재를 만들 수 있어요.' : !it.kv ? '키비주얼을 올려 주세요.' : '로고를 올려 주세요.'); return; }
    it.styleDone = true;
    const said = `배경 ${FIELD_SRC[resolveField(adStyle, { facing: 'left' }).source]} · ${FONTS[it.font].label}${it.kv ? ' · 키비주얼 첨부' : ''}`;
    bub('user', said); it.history.push({ role: 'user', text: said });
    clearSlot();
    it.phase = 'draft';
    renderSteps();
    const n = wantsAd(it) ? chosenAdGroups(it).length + it.channels.filter(c => ONLINE.includes(c)).length : 0;
    say(n ? `준비가 끝났어요. 소재 ${n}종을 만들고, 만드는 대로 매체 규정에 맞는지 검사할게요.` : '준비가 끝났어요. 초안을 생성할게요.');
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
  const roles = alignPrimaryToField(rolesFromSources({ logo: it.logoSuggests, kv: it.suggests, lead: leadOf(it) }, it.mode), { keyVisual: it.kv, kvMeta: it.kvMeta, logoLeads: leadOf(it) === 'logo' });
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
  r.onload = async () => {
    const kv = await prepKv(r.result);
    state.intake.kv = kv;
    bub('user', `키비주얼 첨부: ${f.name}`);
    state.intake.kvOrig = r.result;   // 원본(전달물·크기 검사용)
    analyzeKeyVisual(kv).then(async ({ suggests, readability, meta }) => {
      state.intake.suggests = suggests; state.intake.kvReadability = readability; state.intake.kvMeta = meta;
      state.intake.kvCheck = await kvCheckOf(state.intake.kvOrig ?? state.intake.kv, meta); if (state.intake.kvCheck.level === 'weak' || state.intake.kvCheck.level === 'bad') bub('agent', state.intake.kvCheck.text);
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

// 입력 자료 안내·검사 표시(10-19 사용자 「몇 사이즈로 어떤 스펙을 넣어야 잘 나오는지 — 첨부할 때 안내」). 첨부 전엔 권장 스펙, 첨부 뒤엔 판정(core/inputcheck.js)
const imgSize = u => new Promise(res => { if (!u) return res(null); const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res(null); i.src = u; });
function specLine(label, check, guide) {
  const ok = check && check.level !== 'na';
  return `<div><b style="font-weight:600">${label}</b> <span style="color:${ok ? CHECK_TONE[check.level] : 'var(--sub)'}">${escH(ok ? check.text : guide)}</span></div>`;
}
function inputSpecHtml(kvCheck, logoCheck) {
  return `<div class="fontNote" id="inputSpec" style="font-size:11px;color:var(--sub);line-height:1.55;margin-top:8px">${specLine('키비주얼', kvCheck, kvGuideText())}${specLine('로고', logoCheck, logoGuideText())}</div>`;
}
async function kvCheckOf(orig, meta) { const T = kvTypeOf(meta); return checkKv((await imgSize(orig)) ?? meta?.px ?? null, T?.type?.id ?? meta?.field?.kind ?? null); }
async function logoCheckOf(orig, { changed = null, tone = null } = {}) { return checkLogo(await imgSize(orig), { transparent: changed == null ? null : !changed, tone }); }
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
  // 브랜드 색 후보에서 그림의 바탕색(평평한 변·빈 자리 색)은 뺀다 — 크림 바탕 위 여우 캐릭터에서 크림이 주색이 되면 알약·메인이 바탕과 같은 색이 된다(10-06)
  const field = fieldFromImage(data, W, H);
  const bgHexes = [...Object.values(field.edges ?? {}).filter(e => e.flat && e.hex).map(e => e.hex), field.room?.hex].filter(Boolean);
  const isBg = c => bgHexes.some(b => colorDistance(c, b) < 0.08);
  const raw = extractPalette(data, 6);
  const suggests = (raw.filter(c => !isBg(c)).length ? raw.filter(c => !isBg(c)) : raw).slice(0, 3);
  // field·colors: 소재의 지면색을 이 이미지에서 읽기 위한 실측(core/field.js) — 가장자리 색과 대표색
  const meta = { ar: img.width / img.height, edge: edgeColor(data, W, H), px: [img.width, img.height], field, colors: suggests };
  return { suggests, readability, meta };
}

// 로고의 대표색 — 투명·흰 바탕·검정 글자는 extractPalette가 건너뛴다. 무채색 로고면 빈 배열.
// 로고 밝기 — 불투명 픽셀의 평균 밝기가 높고 채도가 낮으면 흰색 로고. 흰색 로고만 있으면 지면이 어두워야 로고가 보인다(로고가 지면을 정한다)
// 로고 누끼 — 흰(단색) 배경 위에 박힌 로고 PNG/JPG를 투명 배경으로 바꾼다(10-06 사용자 "로고 누끼도 따 주나?").
// 네 모서리 색이 서로 같고 불투명하면 그 색을 배경으로 보고, 가장자리에서 이어진 배경 픽셀만 지운다(안쪽에 갇힌 흰 글자·여백은 남는다).
// 배경과의 거리 0~60은 투명, 60~110은 부드럽게 — 안티에일리어싱 가장자리가 톱니가 되지 않게. 배경이 없으면(지운 픽셀 2% 미만) 원본 그대로
async function knockoutLogo(dataUrl) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const W = img.width, H = img.height; if (!W || !H || W * H > 4_000_000) return null;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, W, H);
  const idm = new ImageData(new Uint8ClampedArray(id.data), W, H);
  const k = knockoutLogoRGBA(id.data, W, H);   // 규칙은 core/logo.js 한 곳(케이스 장부와 같은 규칙) — 원색 로고는 글자 속 흰색을 남긴다
  if (!k) return null;
  // 단색(흰/검정) 변환용 사본은 글자 속까지 지운다 — 속이 메워져 「●」가 되지 않게(10-12 결정 12). 지울 속이 없으면 사본 없음
  const km = knockoutLogoRGBA(idm.data, W, H, { holes: true });
  g.putImageData(id, 0, 0);
  const outUrl = cv.toDataURL('image/png');
  let monoUrl = null;
  if (km?.holes > 0) { g.putImageData(idm, 0, 0); monoUrl = cv.toDataURL('image/png'); }
  return { dataUrl: outUrl, monoUrl, removed: k.removed };
}
// 로고 여백 트림 — 투명 여백이 큰 로고 PNG는 칸 높이에 맞춰도 글자가 작다(10-06 사용자 "로고가 너무 작은데": 276×91 중 글자 높이 21px = 23%).
// 불투명 픽셀(α>10)의 상자를 찾아 그 상자(+긴 변의 3% 숨)로 잘라낸다. 불투명 그림(배경 있는 로고)이거나 잘라낼 게 8% 미만이면 원본 그대로.
async function trimLogo(dataUrl) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const W = img.width, H = img.height; if (!W || !H || W * H > 4_000_000) return null;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const t = trimBox(g.getImageData(0, 0, W, H).data, W, H);   // core/logo.js
  if (!t) return null;
  const out = document.createElement('canvas'); out.width = t.w; out.height = t.h;
  out.getContext('2d').drawImage(cv, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h);
  return { dataUrl: out.toDataURL('image/png'), from: [W, H], to: [t.w, t.h] };
}
// 키비주얼 누끼도 같은 트림 — 투명 여백이 큰 누끼 PNG(여우 위아래·좌우 12%)는 자리에 맞춰 넣어도 실제 캐릭터가 작게 떠서 띠가 빈다(10-08 케이스 장부 NAP 320×480 빈 띠 30%).
// 배경 있는 그림·사진은 불투명 97% 넘어서 trimLogo가 그대로 돌려준다
async function prepKv(dataUrl) {
  try { const t = await trimLogo(dataUrl); if (t) return t.dataUrl; } catch {}
  return dataUrl;
}
// 로고 손질 한 번에 — 누끼(단색 배경 제거) → 여백 트림. 돌려주는 note는 사용자에게 알릴 한 줄
//   monoDataUrl: 단색 변환용 사본(글자 속까지 지움, 같은 트림) — 렌더러가 흰/검정으로 바꿀 때만 쓴다(style.logoMono). 없으면 null
async function prepLogo(dataUrl) {
  let src = dataUrl, mono = null; const notes = [];
  try { const k = await knockoutLogo(src); if (k) { src = k.dataUrl; mono = k.monoUrl; notes.push(`배경 ${k.removed}% 지움(투명 누끼)`); } } catch {}
  try { const t = await trimLogo(src); if (t) { src = t.dataUrl; notes.push(`여백 트림 ${t.from[0]}×${t.from[1]}→${t.to[0]}×${t.to[1]}`); } } catch {}
  try { if (mono) { const t = await trimLogo(mono); if (t) mono = t.dataUrl; } } catch { mono = null; }
  return { dataUrl: src, monoDataUrl: mono, note: notes.join(' · '), changed: src !== dataUrl };
}
async function logoToneOf(dataUrl) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const W = 160, H = Math.max(1, Math.round(W * (img.height || 1) / (img.width || 1)));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
  return logoToneOfRGBA(g.getImageData(0, 0, W, H).data, W, H);   // core/logo.js
}
async function logoMetaOfUrl(dataUrl) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const W = img.width, H = img.height; if (!W || !H) return null;
  const s = Math.min(1, 400 / Math.max(W, H)), w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  return { ...logoMetaRGBA(g.getImageData(0, 0, w, h).data, w, h), px: [W, H] };   // px는 원본 크기
}
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
// 주색 = 지면색(10-19 사용자 「컬러는 어디서 뽑는 거야? 조금 더 밝아야」): 키비주얼이 지면을 정하는(kv-vivid) 캠페인은 색 자리의 주색을 실제 지면 색으로 맞춘다 —
//   전엔 추출 대표색(음영 섞인 탁한 색)이 주색 칸에 보이고 지면은 따로 계산돼 어긋났다. 로고가 주색을 맡으면(브랜드색) 그대로 둔다.
function alignPrimaryToField(roles, { keyVisual, kvMeta, logoLeads = false } = {}) {
  if (!roles || !keyVisual || logoLeads) return roles;
  try { const f = resolveField(normalizeStyle({ colors: roles, keyVisual, kvMeta })); if (f && /^kv-vivid/.test(f.source ?? '') && f.stops?.[0]) return [f.stops[0], roles[1], roles[2]]; } catch {}
  return roles;
}
async function rolesFromAssets({ logo, keyVisual, mode, kvColors = null, kvMeta = null }) {
  let L = [], K = kvColors ?? [];
  try { if (logo) L = await analyzeLogo(logo); } catch {}
  try { if (!kvColors && keyVisual) K = (await analyzeKeyVisual(keyVisual)).suggests; } catch {}
  const roles = alignPrimaryToField(rolesFromSources({ logo: L, kv: K }, mode), { keyVisual, kvMeta, logoLeads: L.length > 0 });
  return { roles, fromLogo: L.length > 0, fromKv: K.length > 0 };
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
// 편집 칸(인스펙터 캠페인 공통 + 산출물별). 10-19 사용자: 「모집기간은 언제부터 언제까지로 · 텍스트는 수정 가능하게」 → 접수 시작(startDate)과 글자 자리(시즌·채용 구분·메인 문구)를 칸으로 연다.
//   날짜 둘 다 있으면 렌더러가 「2.28(수) - 3.10(일)」, 마감만 있으면 「~3.10(일)」. 메인 문구를 적으면 그 문장이 메인(회사·구분은 서브·상세로).
const RECRUIT_EDIT_FIELDS = ['client', 'role', 'employType', 'location', 'startDate', 'deadline', 'season', 'hiringType', 'headline'];
const FIELD_HINT = { startDate: 'YYYY-MM-DD (비우면 마감만 「~날짜」)', deadline: 'YYYY-MM-DD', season: '예: 2026 하반기', hiringType: '예: 신입사원 공개채용', headline: '예: ○○그룹 2026 하반기 신입 채용 — 비우면 고객사·시즌·채용 구분으로 자동' };
function campaignFields(c) {
  return c.kind === 'recruit' ? RECRUIT_EDIT_FIELDS : ['name', 'date', 'venue', 'cta'];
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
    colorsManual: !!it.colorsManual,   // 손으로 고른 색 → 지면도 그 색(10-19)
    kvOrig: it.kvOrig ?? null, logoOrig: it.logoOrig ?? null,   // 전달물은 원본 파일 그대로(10-16)
    kvReadability: it.kvReadability,
    kvMeta: it.kvMeta,
    logo: it.logo,
    logoMono: it.logoMono ?? null,
    logoLight: it.logoLight ?? null,
    logoTone: it.logoTone ?? null,
    logoMeta: it.logoMeta ?? null,
    object: it.object ?? null,
    objectMeta: it.objectMeta ?? null,
    mode: it.mode,
    background: { mode: it.bgMode ?? 'auto', color: it.bgColor ?? null },
    kvUse: it.kvUse ?? 'auto',
    kvTypeOverride: it.kvTypeOverride ?? null,
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
    f.iframe.srcdoc = previewDoc(a.html, artifactFontId(a));
    f.label.textContent = boardLabel(a);
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
  if (spec.channel === 'banner' || spec.channel === 'ad' || spec.channel === 'gwthumb' || spec.channel === 'asset') return [spec.w, spec.h];
  if (spec.channel === 'edm') return [600, 900];
  return [1000, 1400];
}

function layoutArtboard(opts = {}) {
  const board = $('artboard');
  board.innerHTML = '';
  frames.clear();
  const c = state.campaign;
  // 줄 구성: 매체 광고는 매체마다 한 줄 → 온라인 채널 한 줄 → 오프라인 한 줄
  const adRows = (c.media ?? []).map(m => ({ name: mediumName(m), arts: c.artifacts.filter(a => (a.channel === 'ad' || a.channel === 'asset') && SPECS[a.specId]?.medium === m) })).filter(r => r.arts.length);
  const rows = [...adRows, { name: '온라인', arts: [...ONLINE, ...LEGACY].flatMap(ch => c.artifacts.filter(a => a.channel === ch)) }, { name: '오프라인', arts: OFFLINE.flatMap(ch => c.artifacts.filter(a => a.channel === ch)) }];   // 10-15 밤: 매체마다 섹션(머리글 + 구분선)
  // 첫 줄 y: 라벨이 프레임 위에 붙는다(이름 2줄 + 뱃지 줄 ≈ 56px). 60이면 첫 줄 라벨이 보드 위로 잘린다
  let y = 104;
  for (const { name, arts: rowArts } of rows) {
    if (!rowArts.length) continue;
    let x = 60, rowH = 0;
    const head = document.createElement('div'); head.className = 'rowhead'; head.style.left = '60px'; head.style.top = (y - 92) + 'px'; head.textContent = `${name} · ${rowArts.length}종`; board.appendChild(head);
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
          <div class="flabel"><span class="fname">${opts.blank ? '생성 중…' : boardLabel(a)}</span><span class="badge ${a.status}">${badgeText(a.status)}</span><span class="badge gate"></span><span class="badge lint" style="display:none"></span><span class="badge design" style="display:none"></span><span class="badge sample" style="display:none"></span><span class="badge guide" style="display:none"></span><span class="badge edited" style="display:none"></span></div>
          <div class="fbody" style="width:${w}px;height:${h}px">
            <iframe width="${nw}" height="${nh}" style="transform:scale(${ds})"></iframe>
            <div class="hit"></div>
          </div>`;
        const iframe = frame.querySelector('iframe');
        iframe.onload = () => designCheck(a);   // 그려질 때마다 디자인 검수(core/adcheck.js) — 글자-주인공 겹침·로고 가림·뚝 끊김·빈 여백
        if (opts.blank) iframe.style.visibility = 'hidden'; else iframe.srcdoc = previewDoc(a.html, artifactFontId(a));
        frame.querySelector('.hit').onclick = e => { e.stopPropagation(); select(a.key ?? a.specId); };
        board.appendChild(frame);
        frames.set(a.key ?? a.specId, { frame, iframe, badge: frame.querySelector('.badge'), gate: frame.querySelector('.badge.gate'), lint: frame.querySelector('.badge.lint'), design: frame.querySelector('.badge.design'), sample: frame.querySelector('.badge.sample'), guide: frame.querySelector('.badge.guide'), edited: frame.querySelector('.badge.edited'), label: frame.querySelector('.fname') });
        ED.guideBadge(a); ED.editedBadge(a);
        lintBadge(a);
        x += w + 70;
        rowH = Math.max(rowH, h);
      }
    }
    head.style.width = Math.max(320, x - 60 - 70) + 'px';
    y += rowH + 170;
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
// 보드 카드 라벨은 매체 · 사이즈만(10-15 밤 사용자 「좌측은 매체와 사이즈 정도만」) — 배지(DRAFT·차단·디자인·가이드)는 CSS 로 숨긴다
function boardLabel(a) {
  const spec = SPECS[a.specId];
  if (spec && a.channel === 'asset') return `${spec.mediumName ?? mediumName(spec.medium)} · 전달물 ${spec.asset?.item ?? ''} 파일`;
  if (!spec || a.channel !== 'ad') return artLabel(a);
  const sz = specSize(spec, a.size) || `${spec.w}×${spec.h}`;
  return `${spec.mediumName ?? mediumName(spec.medium)} · ${sz}`;
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
    f.iframe.srcdoc = previewDoc(a.html, artifactFontId(a));
    f.badge.className = 'badge ' + a.status;
    f.badge.textContent = badgeText(a.status);
    if (a.channel === 'ad') { a.lint = null; a.design = undefined; a.guide = null; ED.guideBadge(a); }   // 다시 그렸으니 이전 판정(규격·디자인·가이드)은 무효 — 다시 잰다(design undefined = 검수 전 → 게이트 pending)
    if (a.channel === 'asset') a.lint = null;   // 전달물도 로고·이미지를 바꾸면 다시 잰다
    lintBadge(a);
  }
  scheduleLint();
}

/* ═══ 규격 검사 (매체 광고) ═══
   그린 뒤 실제로 재서 판정한다(불변식 ⑥ — 위반은 조용히 넘기지 않는다). 측정은 래스터까지 하므로 비동기·순차. */
function lintBadge(a) {
  const f = frames.get(a.key ?? a.specId);
  if (!f?.lint) return;
  if (a.channel !== 'ad' && a.channel !== 'asset') { f.lint.style.display = 'none'; return; }
  const L = a.lint;
  f.lint.style.display = '';
  if (!L) { f.lint.className = 'badge lint'; f.lint.textContent = '검사 중…'; gateBadge(a); return; }
  f.lint.className = 'badge lint ' + L.level;
  f.lint.textContent = L.level === 'pass' ? '규격 통과' : `${L.level === 'block' ? '차단' : '경고'} ${L.issues.length}`;
  gateBadge(a);
}
// 디자인 검수 — 규격 검사(치수·용량·글자수)와 별개로, 그려진 프레임을 재서 디자이너 눈에 걸리는 것(글자-주인공 겹침·로고 가림·뚝 끊긴 변·빈 여백·글자 잘림)을 경고로
function designCheck(a) {
  if (a.channel !== 'ad' || !state.campaign) return;
  const f = frames.get(a.key ?? a.specId); if (!f?.iframe?.contentDocument) return;
  try { a.design = checkAdDoc(f.iframe.contentDocument, { kvMeta: state.campaign.style.kvMeta }); } catch (e) { a.design = { warnings: [{ code: 'design-failed', level: 'warn', msg: '디자인 검수 실패 — 사람이 확인' }] }; }   // 실패도 조용히 통과시키지 않는다 → 게이트 review
  designBadge(a);
  // 샘플 문구(data-sample — 마감일·직무가 비어 있어 샘플 밀도를 맞추려 넣은 자리표시) 배지: 승인 전에 디자이너가 실제 정보로 바꾼다(10-12 매체별 규격정리)
  try { const n = f.iframe.contentDocument.querySelectorAll('[data-sample]').length; if (f.sample) { f.sample.style.display = n ? '' : 'none'; f.sample.textContent = n ? `샘플 문구 ${n}` : ''; f.sample.title = n ? '비어 있는 정보 자리에 넣은 샘플 문구 — 승인 전에 실제 정보로 바꾸세요' : ''; } } catch {}
  if (state.selected === (a.key ?? a.specId)) { const box = $('inspLint'); if (box) box.innerHTML = lintHtml(a); }
  ED.afterRender(a);   // 같은 모양 옮기기 경계 맞춤 → 직접 수정 손잡이 → 가이드 검수(10-14)
}
const designWarnings = a => (a.design?.warnings ?? []).filter(w => w.level !== 'info');
function designBadge(a) {
  const f = frames.get(a.key ?? a.specId); if (!f?.design) return;
  const n = designWarnings(a).length;
  f.design.style.display = n ? '' : 'none';
  f.design.textContent = n ? `디자인 ${n}` : '';
  f.design.title = designWarnings(a).map(w => w.msg).join('\n');
  gateBadge(a);
}
// 승인 게이트(core/gate.js) — 규격 검사·디자인 검수·샘플 문구가 바뀔 때마다 다시 계산해 프레임 배지·인스펙터에 쓴다
function gateOf(a) {
  if (a.channel !== 'ad' && a.channel !== 'asset') return null;
  const spec = SPECS[a.specId];
  const f = frames.get(a.key ?? a.specId);
  if (a.channel === 'ad' && a.design === undefined) { a.gate = { state: 'pending', reasons: ['디자인 검수 전'] }; return a.gate; }   // iframe onload 전엔 「승인 가능」이 잠깐 뜨지 않게
  const samples = (() => { try { return f?.iframe?.contentDocument?.querySelectorAll('[data-sample]').length ?? 0; } catch { return 0; } })();
  // design 은 adcheck 의 warnings 전체(level info 인 low-res·low-res-logo 포함) — 프레임 「디자인 n」 배지는 info 를 세지 않지만 게이트는 흐린 키비주얼도 「검수 필요」로 둔다(출고 불가 사유)
  a.gate = approvalGate({ grade: spec?.grade ?? null, lint: a.lint ?? null, design: a.design ?? null, samples });
  return a.gate;
}
function gateBadge(a) {
  const g = gateOf(a); const f = frames.get(a.key ?? a.specId); if (!g || !f?.gate) return;
  const ok = a.status === 'approved';
  f.gate.className = 'badge gate ' + (ok ? 'approved' : g.state);
  f.gate.textContent = ok ? '승인됨' : STATE_LABEL[g.state];
  f.gate.title = (ok && a.gateOverride ? [`사유: ${a.gateOverride.reason}`, ...a.gateOverride.reasons] : g.reasons).join('\n');
  if (state.selected === (a.key ?? a.specId)) { const box = $('iGate'); if (box) box.innerHTML = gateHtml(a); }
}
// 인스펙터 「승인」 줄 — 상태 한 단어 + 사유 목록(검수 필요·초안은 여기 적힌 사유를 보고 사유를 적어 승인한다)
function gateHtml(a) {
  const g = a.gate ?? gateOf(a); if (!g) return '';
  const ok = a.status === 'approved';
  const rs = ok && a.gateOverride ? [`승인 사유: ${a.gateOverride.reason}`, ...a.gateOverride.reasons] : g.reasons;
  return `<span class="badge gate ${ok ? 'approved' : g.state}">${ok ? '승인됨' : STATE_LABEL[g.state]}</span>${rs.length ? `<ul style="margin:4px 0 0;padding-left:16px;font-size:11.5px;line-height:1.5;color:var(--sub)">${rs.map(r => `<li>${escH(r)}</li>`).join('')}</ul>` : ''}`;
}
// 승인 상태만 바뀐 경우 — iframe 을 다시 그리지 않고(다시 그리면 규격 검사가 처음부터) 상태 배지·게이트 배지만 갱신한다
function statusBadges(only = null) {
  for (const a of state.campaign.artifacts) {
    const k = a.key ?? a.specId; if (only && k !== only) continue;
    const f = frames.get(k); if (!f) continue;
    f.badge.className = 'badge ' + a.status; f.badge.textContent = badgeText(a.status);
    gateBadge(a);
  }
}
function lintHtml(a) {
  const L = a.lint;
  const D = designWarnings(a);
  const dHtml = D.length ? `<ul style="margin:4px 0 0;padding-left:16px;font-size:11.5px;line-height:1.5">${D.map(w => `<li style="color:var(--amber)">디자인 · ${w.msg}</li>`).join('')}</ul>` : '';
  if (!L) return '<div style="font-size:11.5px;color:var(--sub)">규격 검사 중…</div>' + dHtml;
  if (!L.issues.length) return `<div style="font-size:11.5px;color:var(--good);font-weight:600">규격 통과 — 치수·포맷·용량·글자수·색 모두 규정 안</div>${dHtml || '<div style="font-size:11.5px;color:var(--good)">디자인 검수 통과 — 겹침·가림·끊김·빈 여백 없음</div>'}`;
  return `<ul style="margin:4px 0 0;padding-left:16px;font-size:11.5px;line-height:1.5">${L.issues.map(i =>
    `<li style="color:${i.level === 'block' ? 'var(--danger)' : 'var(--amber)'}">${i.msg}</li>`).join('')}</ul>${dHtml}`;
}
let lintRun = 0;
async function lintAds() {
  const c = state.campaign; if (!c) return;
  const run = ++lintRun;
  for (const a of c.artifacts.filter(a => (a.channel === 'ad' || a.channel === 'asset') && !a.lint)) {
    if (run !== lintRun) return;    // 그 사이 다시 그려졌으면 이 판정은 버린다
    const spec = SPECS[a.specId]; if (!spec?.rules) continue;
    if (a.channel === 'asset') {   // 전달물: 원본 파일의 가로·포맷만 본다(렌더 측정 없음)
      const isLogo = (spec.rules.asset ?? spec.asset)?.item === '로고';
      const src = isLogo ? (c.style.logoOrig ?? c.style.logo) : (c.style.kvOrig ?? c.style.keyVisual);
      const px = src ? await new Promise(r => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.onerror = () => r(null); i.src = src; }) : null;   // 실제 내보내는 원본을 직접 잰다(assetFileOf 와 같은 기준)
      if (run !== lintRun) return;
      const fmt = src ? (src.match(/^data:image\/(png|jpe?g|svg\+xml|webp|gif)/)?.[1] ?? null) : null;
      a.lint = lintArtifact({ spec: { ...spec.rules, asset: spec.rules.asset ?? spec.asset, format: spec.format }, medium: spec.mediumRules, measure: { assetPx: px ?? null, format: fmt === 'jpeg' ? 'jpg' : fmt === 'svg+xml' ? 'svg' : fmt } });
      lintBadge(a);
      if (state.selected === (a.key ?? a.specId)) { const box = $('inspLint'); if (box) box.innerHTML = lintHtml(a); }
      continue;
    }
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
  // 직접 수정 손잡이 — 매체 광고 하나를 골랐을 때만(10-14)
  const sa = specId ? state.campaign?.artifacts.find(x => (x.key ?? x.specId) === specId) : null;
  if (sa?.channel === 'ad') ED.showOverlay(sa); else { state.editFocus = null; ED.hideOverlay(); }
}

function renderInspector() {
  const insp = $('inspector');
  const c = state.campaign;
  if (!state.selected) {
    insp.innerHTML = `
      <section class="isec">
      <h3>캠페인 <span class="mode">전체 일괄</span></h3>
      ${campaignFields(c).map(f => `<label>${FIELD_LABEL[f]}</label><input type="text" data-f="${f}" value="${c.context.core[f] ?? ''}" placeholder="${escH(FIELD_HINT[f] ?? '')}">`).join('')}
      </section>
      <section class="isec">
      <h3>스타일</h3>
      <label>브랜드 컬러 ${c.style.keyVisual ? '<span style="opacity:.6">· 키비주얼에서 배치</span>' : ''}</label>
      <div style="display:flex;gap:10px">
        <span style="display:flex;flex-direction:column;align-items:center;gap:3px"><input type="color" class="swatch" id="iColor1" value="${c.style.palette.primary}"><small style="font-size:10px;color:var(--sub)">주색</small></span>
        <span style="display:flex;flex-direction:column;align-items:center;gap:3px"><input type="color" class="swatch" id="iColor2" value="${c.style.palette.secondary}"><small style="font-size:10px;color:var(--sub)">보조</small></span>
        <span style="display:flex;flex-direction:column;align-items:center;gap:3px"><input type="color" class="swatch" id="iColor3" value="${c.style.palette.accent}"><small style="font-size:10px;color:var(--sub)">포인트</small></span>
      </div>
      <label>키비주얼</label>
      <div class="kvthumb" id="iKv" style="width:100%;height:76px;${c.style.keyVisual ? `background-image:url(${c.style.keyVisual})` : ''}">${c.style.keyVisual ? '' : '업로드 · 교체'}</div>
      <input type="file" id="iKvFile" accept="image/*" style="display:none">
      <div id="iKvSpec" class="fontNote" style="font-size:11px;line-height:1.5;margin-top:4px;color:var(--sub)"></div>
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
      <div id="iLogoSpec" class="fontNote" style="font-size:11px;line-height:1.5;margin-top:4px;color:var(--sub)"></div>
      <label>글자색 <span style="opacity:.6">· 규정 매체(자소설·리멤버·카카오)는 규정대로</span></label>
      <div class="vseg" id="iToneSeg">${[['auto', '자동'], ['dark', '다크'], ['light', '라이트']].map(([k, v]) => `<button data-tt="${k}" class="${(c.style.textTone ?? 'auto') === k ? 'on' : ''}" aria-pressed="${(c.style.textTone ?? 'auto') === k}">${v}</button>`).join('')}</div>
      <label>폰트</label>
      <select id="iFont">${fontOptions(c.style.fonts.heading)}</select>
      <button class="btn" id="iFontUp" style="width:100%;margin-top:6px">폰트 파일 첨부</button>
      <input type="file" id="iFontFile" accept=".woff2,.woff,.ttf,.otf" style="display:none">
      ${ED.alignCampaignHtml()}
      </section>
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
        logoMono: c.style.logoMono ?? null,
        logoLight: c.style.logoLight ?? null,
        logoTone: c.style.logoTone ?? null,
        logoMeta: c.style.logoMeta ?? null,   // 10-12: 빠져 있어 색·글꼴만 바꿔도 세로 로고 크기·타일 로고 반전 규칙이 풀렸다
        colorsManual: !!c.style.colorsManual,   // 손으로 고친 색(10-19) — 지면이 주색을 따라간다
        textTone: c.style.textTone ?? 'auto',   // 글자색 톤(10-19)
        logoOrig: c.style.logoOrig ?? null, kvOrig: c.style.kvOrig ?? null,   // 전달물 원본(10-16)
        object: c.style.object ?? null,
        objectMeta: c.style.objectMeta ?? null,
        mode: c.style.mode,
        background: c.style.background,
        kvUse: c.style.kvUse,
        kvTypeOverride: c.style.kvTypeOverride ?? null,
        chipTone: c.style.chipTone,
        ...Object.fromEntries(PRESET_KEYS.map(k => [k, c.style[k]])),   // 편집 프리셋(10-14) — 색·글꼴만 바꿔도 풀리지 않게
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
    const colorEdit = debounce(() => restyle({ colorsManual: true }, '색 직접 변경', true), 350);   // 10-19: 손으로 고른 색은 지면(그라데이션)까지 따라간다
    insp.querySelector('#iColor1').oninput = colorEdit;
    insp.querySelector('#iColor2').oninput = colorEdit;
    insp.querySelector('#iColor3').oninput = colorEdit;
    insp.querySelector('#iFont').onchange = () => styleChange();
    insp.querySelector('#iFont').value = c.style.fonts.heading;
    const setBg = (patch, label) => { restyle({ background: { ...c.style.background, ...patch } }, label); renderInspector(); };
    insp.querySelectorAll('#iBgSeg button').forEach(b => b.onclick = () => setBg({ mode: b.dataset.b }, '배경 방식 변경'));
    const bgIn = insp.querySelector('#iBgColor');
    if (bgIn) bgIn.onchange = () => setBg({ color: bgIn.value.toUpperCase() }, '배경색 직접 고르기');
    insp.querySelector('#iBgReset')?.addEventListener('click', () => setBg({ color: null }, '배경색 되돌리기'));
    insp.querySelector('#iKvType')?.addEventListener('change', e => {
      const v = e.target.value === 'auto' ? null : e.target.value;
      restyle({ kvTypeOverride: v }, v ? '키비주얼 유형 지정' : '키비주얼 유형 자동');
      renderInspector(); insp.querySelector('#iKvType')?.focus();
      const T = kvTypeOf(c.style.kvMeta);
      toast(v ? `유형 지정: ${T?.sub?.name ?? T?.name}` : `유형 자동: ${T?.sub?.name ?? T?.name}`);
    });
    insp.querySelectorAll('#iBgUse button').forEach(b => b.onclick = () => { restyle({ kvUse: b.dataset.u }, b.dataset.u === 'full' ? '사진 전체 + 스크림' : '사진 한쪽 + 녹임'); renderInspector(); });
    // 라벨 알약 톤 — 일괄. 산출물에 개별 값이 있으면 그 산출물은 그대로(overrides.style)
    insp.querySelectorAll('#iChipSeg button').forEach(b => b.onclick = () => { if ((c.style.chipTone ?? 'tint') === b.dataset.ct) return; restyle({ chipTone: b.dataset.ct }, `라벨 알약 ${CHIP_LABEL[b.dataset.ct]}`); renderInspector(); });
    // 글자색 톤 — 일괄(10-19). 'auto' 지면 밝기 / 'dark' #333 / 'light' 흰. 규정 매체·산출물 개별값은 그대로
    insp.querySelectorAll('#iToneSeg button').forEach(b => b.onclick = () => { if ((c.style.textTone ?? 'auto') === b.dataset.tt) return; restyle({ textTone: b.dataset.tt }, `글자색 ${TONE_LABEL[b.dataset.tt]}`); renderInspector(); });
    insp.querySelectorAll('[data-fc]').forEach(b => b.onclick = () => setBg({ color: b.dataset.fc }, '지면색 선택'));
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
    // 첨부 안내·검사(10-19): 첨부 전엔 권장 스펙, 첨부 뒤엔 원본 크기 판정(원본이 없으면 손질본 크기)
    { const kb = insp.querySelector('#iKvSpec'), lb = insp.querySelector('#iLogoSpec');
      if (kb) { kb.textContent = kvGuideText(); if (c.style.keyVisual) kvCheckOf(c.style.kvOrig ?? c.style.keyVisual, c.style.kvMeta).then(ck => { if (ck.level !== 'na') { kb.textContent = ck.text; kb.style.color = CHECK_TONE[ck.level]; } }); }
      if (lb) { lb.textContent = logoGuideText(); if (c.style.logo) logoCheckOf(c.style.logoOrig ?? c.style.logo, { tone: c.style.logoTone }).then(ck => { if (ck.level !== 'na') { lb.textContent = ck.text; lb.style.color = CHECK_TONE[ck.level]; } }); } }
    const kvIn = insp.querySelector('#iKvFile');
    insp.querySelector('#iKv').onclick = () => kvIn.click();
    kvIn.onchange = () => {
      const f = kvIn.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = async () => {
        let readability = null, suggests = [], meta = null;
        const kv = await prepKv(r.result);
        try { ({ readability, suggests, meta } = await analyzeKeyVisual(kv)); } catch {}
        // 로고가 있으면 주색은 로고가 맡고 키비주얼은 보조·포인트만 바꾼다 — 이미지를 갈았다고 브랜드 색이 바뀌면 안 된다
        const { roles, fromLogo } = await rolesFromAssets({ logo: c.style.logo, keyVisual: kv, kvMeta: meta, mode: c.style.mode, kvColors: suggests });
        restyle({ keyVisual: kv, kvOrig: r.result, kvReadability: readability, kvMeta: meta, kvTypeOverride: null, colorsManual: false, ...(roles ? { colors: roles } : {}) }, '키비주얼 교체');
        renderInspector();
        toast(roles ? `키비주얼 교체 — ${fromLogo ? '주색은 로고 유지, ' : ''}색 ${roles.join(', ')} 배치` : '키비주얼 교체');
        { const ck = await kvCheckOf(r.result, meta); if (ck.level === 'weak' || ck.level === 'bad') toast(ck.text); }
      };
      r.readAsDataURL(f);
    };
    // 색을 손으로 만지다 길을 잃었을 때 되돌아올 지점 — 지금 키비주얼에서 세 자리를 다시 뽑는다
    insp.querySelector('#iKvColors')?.addEventListener('click', async () => {
      try {
        const { suggests } = await analyzeKeyVisual(c.style.keyVisual);
        const roles = rolesFromKeyVisual(suggests, c.style.mode);
        if (!roles) { toast('이미지에서 쓸 만한 색을 찾지 못했어요'); return; }
        restyle({ colors: alignPrimaryToField(roles, { keyVisual: c.style.keyVisual, kvMeta: c.style.kvMeta }), colorsManual: false }, '키비주얼 색 재추출');
        renderInspector();
        toast(`주색 ${roles[0]} · 보조 ${roles[1]} · 포인트 ${roles[2]}`);
      } catch { toast('색 추출 실패'); }
    });
    insp.querySelector('#iKvClear')?.addEventListener('click', () => {
      restyle({ keyVisual: null, kvReadability: null, kvMeta: null, kvTypeOverride: null }, '키비주얼 제거');
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
          let roles = null, tonePatch = {};
          let src = r.result;
          let monoPatch = {};
          { const p = await prepLogo(src); if (p.changed) { src = p.dataUrl; toast(`로고 손질 — ${p.note}`); } if (key === 'logo') monoPatch = { logoMono: p.monoDataUrl ?? null }; }
          if (key === 'logo') {
            ({ roles } = await rolesFromAssets({ logo: src, keyVisual: c.style.keyVisual, mode: c.style.mode }));
            const ink = monoPatch.logoMono ?? src;   // 잉크만 잰다(글자 속을 지운 사본)
            const tone = await logoToneOf(ink).catch(() => 'dark');
            const logoMeta = await logoMetaOfUrl(ink).catch(() => null);   // 10-12: 로고를 갈면 실측도 새로(전 로고의 세로·타일 판정이 남지 않게)
            // 흰색 로고만이면 지면이 어두워진다(brand-dark-logo). 원색이면 흰색 로고가 있을 때 both
            tonePatch = { logoMeta, ...(tone === 'light' ? { logoTone: 'light', ...(c.style.logoLight ? {} : { logoLight: src }) } : { logoTone: c.style.logoLight ? 'both' : 'dark' }) };
          } else tonePatch = { logoTone: c.style.logoTone === 'light' ? 'light' : 'both' };
          restyle({ [key]: src, ...(key === 'logo' ? { logoOrig: r.result } : {}), ...monoPatch, ...(roles ? { colors: roles } : {}), ...tonePatch }, label);
          renderInspector();
          toast(roles ? `${label} — 주색 ${roles[0]}` : label);
          if (key === 'logo') { const ck = await logoCheckOf(r.result, { changed: src !== r.result }); if (ck.level === 'weak' || ck.level === 'bad') toast(ck.text); }
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
    insp.querySelector('#iAdd')?.addEventListener('click', () => addArtifactModal());   // 10-15 밤: 인스펙터 간소화로 버튼 없음(상단 메뉴·모달은 그대로)
    ED.bindPresetCampaign(insp, restyle);
    ED.bindAlignCampaign(insp, restyle);   // 글자 정렬 세그먼트(10-19)
    return;
  }

  const a = c.artifacts.find(x => (x.key ?? x.specId) === state.selected);
  const gVars = guideVariants(a);
  const nVar = variantCount(a);
  const spec = effSpec(a);
  const isPrint = spec.unit === 'mm';
  const presets = presetsFor(a);
  // 섹션마다 .isec(흰 카드)로 묶는다 — 인스펙터는 유리 판이라 안쪽을 카드로 쌓아야 층이 읽힌다
  insp.innerHTML = `
    <section class="isec">
    <h3>${artLabel(a)} <span class="mode">개별 편집</span></h3>
    ${campaignFields(c).map(f => `
      <label>${FIELD_LABEL[f]} <span style="opacity:.55">공통: ${c.context.core[f] ?? '—'}</span></label>
      <input type="text" data-f="${f}" value="${a.overrides.core?.[f] ?? ''}" placeholder="${escH(c.context.core[f] ?? FIELD_HINT[f] ?? '')}">`).join('')}
    </section>
    ${(nVar > 1 || a.channel === 'badge' || isPrint || a.channel === 'ad') ? '<section class="isec">' : ''}
    ${(nVar > 1 && a.channel !== 'ad') ? `<label>레이아웃 시안</label><div class="vseg">${Array.from({ length: nVar }, (_, i) =>
      `<button data-v="${i}" class="${(a.variant ?? 0) === i ? 'on' : ''}">${gVars ? gVars[i].name : i + 1}</button>`).join('')}</div>` : ''}
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
    ${a.channel === 'ad' ? `
      ${artifactFontHtml(a, c)}
      ${a.channel === 'ad' ? `<label>글자색 <span style="opacity:.55">이 산출물만 · 비우면 공통(${TONE_LABEL[c.style.textTone ?? 'auto']})</span></label>
      <div class="vseg" id="iToneOv">${[['', '공통'], ['dark', '다크'], ['light', '라이트']].map(([k, v]) => `<button data-tto="${k}" class="${(a.overrides.style?.textTone ?? '') === k ? 'on' : ''}">${v}</button>`).join('')}</div>` : ''}
      ${ED.alignArtifactHtml(a)}
` : ''}
    ${(nVar > 1 || a.channel === 'badge' || isPrint || a.channel === 'ad') ? '</section>' : ''}
    <section class="isec">
    ${(a.channel === 'ad' || a.channel === 'asset') ? `<label>승인</label><div id="iGate" style="margin-bottom:8px">${gateHtml(a)}</div>
    <button class="btn" id="iApprove" style="width:100%;margin-bottom:8px">${a.status === 'approved' ? '승인 취소' : '이 소재 승인'}</button>` : ''}
    <div class="row">
      <button class="btn" id="iOpen">크게</button>
      <button class="btn pri" id="iExp">내보내기</button>
      <button class="btn" id="iDesel">해제</button>
    </div>
    <button class="btn danger" id="iDel" style="width:100%;margin-top:6px">이 산출물 빼기</button>
    </section>
    <div id="inspNote"></div>`;
  insp.querySelectorAll('input[data-f]').forEach(i => i.oninput = debounce(() => {
    const f = i.dataset.f, v = i.value.trim();
    const o = { ...(a.overrides.core ?? {}) };
    if (v && v !== (c.context.core[f] ?? '')) o[f] = v; else delete o[f];
    pushHistory(`${artLabel(a)} ${FIELD_LABEL[f]} 개별 편집`, true);
    a.overrides.core = o;
    a.status = 'draft'; a.gateOverride = null;
    logEvent(c, 'manual_edit', { specId: a.specId });
    regen(c);
    autosave();
    refreshFrames(a.specId);
    $('inspNote').textContent = '이 산출물만 반영됨';
    log(`${a.specId} 개별 편집 (${FIELD_LABEL[f]})`);
  }, 450));
  // 폰트 — 이 산출물만(overrides.style.fonts). 매체가 고정한 규격엔 선택 칸이 없다(artifactFontHtml)
  const fontOv = insp.querySelector('#iFontOv');
  if (fontOv) fontOv.onchange = () => {
    const v = fontOv.value || null;
    if ((a.overrides.style?.fonts?.heading ?? null) === v) return;
    pushHistory(`${artLabel(a)} 폰트 개별 편집`);
    const st = { ...(a.overrides.style ?? {}) };
    if (v) st.fonts = { heading: v, body: v }; else delete st.fonts;
    a.overrides.style = st;
    a.status = 'draft'; a.gateOverride = null;
    logEvent(c, 'manual_edit', { specId: a.specId, style: 'fonts' });
    regen(c);
    autosave();
    refreshFrames(a.specId);
    renderInspector();
    $('inspNote').textContent = '이 산출물만 반영됨';
    log(`${a.specId} 폰트 ${v ? FONTS[v]?.label ?? v : '공통 따름'}`);
  };
  // 글자색 톤 — 이 산출물만(overrides.style.textTone, 10-19). 비우면 공통
  insp.querySelectorAll('#iToneOv button').forEach(b => b.onclick = () => {
    const v = b.dataset.tto || null;
    if ((a.overrides.style?.textTone ?? null) === v) return;
    pushHistory(`${artLabel(a)} 글자색 개별 편집`);
    const st = { ...(a.overrides.style ?? {}) };
    if (v) st.textTone = v; else delete st.textTone;
    a.overrides.style = st; a.status = 'draft'; a.gateOverride = null;
    logEvent(c, 'manual_edit', { specId: a.specId, style: 'textTone' });
    regen(c); autosave(); refreshFrames(a.specId); renderInspector();
    $('inspNote').textContent = '이 산출물만 반영됨';
    log(`${a.specId} 글자색 ${v ? TONE_LABEL[v] : '공통 따름'}`);
  });
  // 라벨 알약 톤 — 이 산출물만(overrides.style). 비우면 공통값을 따른다. 일괄 변경이 와도 개별 값은 남는다
  insp.querySelectorAll('#iChipOv button').forEach(b => b.onclick = () => {
    const v = b.dataset.cto || null;
    if ((a.overrides.style?.chipTone ?? null) === v) return;
    pushHistory(`${artLabel(a)} 라벨 알약 개별 편집`);
    const st = { ...(a.overrides.style ?? {}) };
    if (v) st.chipTone = v; else delete st.chipTone;
    a.overrides.style = st;
    a.status = 'draft'; a.gateOverride = null;
    logEvent(c, 'manual_edit', { specId: a.specId, style: 'chipTone' });
    regen(c);
    autosave();
    refreshFrames(a.specId);
    renderInspector();
    $('inspNote').textContent = '이 산출물만 반영됨';
    log(`${a.specId} 라벨 알약 ${v ? CHIP_LABEL[v] : '공통 따름'}`);
  });
  if (a.channel === 'ad') { ED.bindGuideSection(insp, a); ED.bindEditSection(insp, a); ED.bindPresetArtifact(insp, a); ED.bindAlignArtifact(insp, a); }
  insp.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
    if ((a.variant ?? 0) === Number(b.dataset.v)) return;   // 같은 시안 다시 누르면 되돌릴 것도 없다
    pushHistory(`${artLabel(a)} 시안 ${Number(b.dataset.v) + 1}`);
    a.variant = Number(b.dataset.v);
    a.status = 'draft'; a.gateOverride = null;
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
  insp.querySelector('#iExp').onclick = () => { if (gateOf(a)?.state === 'blocked') { toast(a.channel === 'asset' ? '전달물 규정 미달 — 더 큰 원본을 받아야 합니다' : '규정 차단 — 고치기 전에는 내보낼 수 없어요'); return; } exportArtifactModal(a); };   // 검토용 미승인 내보내기는 허용, 차단만 막는다
  // 산출물 하나 승인 — ready 는 바로, review·draft 는 사유를 적어야(사례 기록의 입력), blocked 는 불가
  const approveBtn = insp.querySelector('#iApprove');
  if (approveBtn) approveBtn.onclick = () => {
    const k = a.key ?? a.specId;
    const after = () => { statusBadges(k); renderInspector(); saveCampaignToStore(); };
    if (a.status === 'approved') { a.status = 'draft'; a.gateOverride = null; logEvent(c, 'artifact_unapproved', { key: k }); after(); return; }
    const g = gateOf(a);
    if (g?.state === 'blocked') { toast('규정 차단 — 고치기 전에는 승인할 수 없어요'); return; }
    if (g?.state === 'pending') { toast('규격 검사 중 — 잠시 후 다시'); return; }
    if (g?.state === 'ready') { a.status = 'approved'; a.gateOverride = null; logEvent(c, 'artifact_approved', { key: k, gate: 'ready' }); after(); toast(`${artLabel(a)} 승인`); return; }
    modal({
      title: `${STATE_LABEL[g.state]} — 사유를 적고 승인`,
      desc: g.reasons.join(' · '),
      body: `<textarea id="gateReason" rows="3" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;font-family:inherit;resize:vertical" placeholder="예: 겹침은 빈 하늘 부분이라 읽힘 / 디자이너가 피그마에서 손봄"></textarea>`,
      actions: [{ label: '돌아가기' }, { label: '사유 적고 승인', pri: true, fn: () => {
        const reason = $('gateReason').value.trim(); if (!reason) { toast('사유를 적어 주세요'); return false; }
        a.status = 'approved'; a.gateOverride = { state: g.state, reasons: g.reasons, reason, at: Date.now() };
        logEvent(c, 'artifact_approved', { key: k, gate: g.state, override: reason });
        after(); toast(`${artLabel(a)} 승인 — 사유 기록됨`);
      } }],
    });
    modalFocus('#gateReason');
  };
  insp.querySelector('#iDesel').onclick = () => select(null);
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
// 전달물 파일 — 올린 원본(style.logoOrig/kvOrig, 없으면 손질본). 원본 가로가 규정 최소 폭(로고 500 · 이미지 720)보다 작으면 그 폭으로 확대해서 넘긴다(비율 유지, PNG 알파 유지 — 10-16 사용자 「저 크기에 꽉 차야」). 없으면 null
async function assetFileOf(a) {
  const c = state.campaign, spec = SPECS[a.specId], item = spec?.asset?.item, minW = spec?.asset?.minW ?? 0;
  if (a.lint?.level === 'block') return null;   // 사유는 a.lint — 알림은 호출처가 한다   // 규정 폭 미달 원본은 늘려 보내지 않는다(10-20 출고규정)
  const src = item === '로고' ? (c.style.logoOrig ?? c.style.logo) : (c.style.kvOrig ?? c.style.keyVisual); if (!src || !/^data:/.test(src)) return null;
  const clean = v => String(v ?? '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 24);
  const core = c.context.core; const who = c.kind === 'recruit' ? [clean(core.client), clean(core.role)] : [clean(core.name)];
  const base = [...who, clean(spec.mediumName), 'M시작배너', item === '로고' ? '로고' : '이미지', `v${c.context.version}`].filter(Boolean).join('_');
  const toBytes = (dataUrl) => { const m = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/); if (!m) return null; const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]); const data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i); return { data, mime: m[1] }; };
  const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; }).catch(() => null);
  const w0 = img.naturalWidth || 0, h0 = img.naturalHeight || 0;
  if (w0 && minW && w0 < minW) {   // 확대
    const k = minW / w0, cv = document.createElement('canvas'); cv.width = minW; cv.height = Math.max(1, Math.round(h0 * k));
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, cv.width, cv.height);
    const png = item === '로고' || /png|svg|webp|gif/.test(src.slice(5, 20));   // 로고와 알파 가능 포맷은 PNG, 사진(JPEG)은 JPEG 0.92
    const out = png ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.92);
    const b = toBytes(out); return { name: `${base}.${png ? 'png' : 'jpg'}`, data: b.data, mime: b.mime, scaled: [w0, cv.width] };
  }
  const b = toBytes(src); if (!b) return null;
  const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' })[b.mime] ?? 'png';
  return { name: `${base}.${ext}`, data: b.data, mime: b.mime, scaled: null };
}
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
const adEffCtx = a => { const c = state.campaign; return { ...c.context, core: { ...c.context.core, ...(a.overrides?.core ?? {}) } }; };
// 내보낼 때도 보드와 같은 스타일 — 산출물 개별 값(overrides.style: 알약 톤·프리셋)과 직접 수정(overrides.layout)을 얹는다(10-14 generate.js 와 같은 합성)
const adEffStyle = a => { const c = state.campaign; let s = a.overrides?.style && Object.keys(a.overrides.style).length ? { ...c.style, ...a.overrides.style } : c.style; if (a.overrides?.layout && Object.keys(a.overrides.layout).length) s = { ...s, manualLayout: a.overrides.layout }; return s; };
async function exportAdFiles(ads) {
  const c = state.campaign;
  const out = [];
  for (const a of ads) {
    const spec = SPECS[a.specId];
    const eff = adEffCtx(a);
    const face = await exportFaceCss(artifactFontId(a));   // 묶은 무료 폰트면 바이트째(10-14) — 래스터가 바깥 파일을 못 받는다
    const fit = await renderFit(eff, adEffStyle(a), spec, h => embedFont(h, face, BUNDLED_MARK));   // 용량이 넘치면 규칙 안에서 다시 뽑는다(단색 배경 → JPG 품질)
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
// SVG(Figma 편집용) — 용량 맞춤(단색 배경·JPG) 전의 원래 디자인을 옮긴다. Figma 에서 고친 뒤 디자이너가 다시 뽑기 때문이다.
// 글자는 살아 있는 텍스트(Pretendard), 그림·로고는 따로 레이어, 지면·그라데이션·녹임은 벡터(core/svgexport.js)
const SVG_NOTE = 'SVG(Figma 편집용): 글자는 텍스트, 키비주얼·로고는 따로 레이어로 들어갑니다. Figma에 같은 이름의 폰트(Pretendard, 또는 고른 무료 폰트)가 설치되어 있어야 글자가 그대로 보입니다.';
// 내보내기 창 폰트 줄 — 「폰트 고정 매체: 자소설닷컴·카카오톡 (Pretendard) · 나머지: 나눔스퀘어」
function exportFontLine(ads) {
  const c = state.campaign;
  const { fixed, free } = fontMediaSplit(ads.map(a => SPECS[a.specId]?.medium).filter(Boolean));
  const picked = [...new Set(ads.filter(a => free.some(m => m.id === SPECS[a.specId]?.medium)).map(a => FONTS[artifactFontId(a, c)]?.label ?? artifactFontId(a, c)))];
  const parts = [];
  if (fixed.length) parts.push(`폰트 고정 매체: ${fixed.map(m => m.name).join('·')} (${[...new Set(fixed.map(m => m.font))].join('/')})`);
  if (free.length) parts.push(`${fixed.length ? '나머지' : '폰트'}: ${picked.join(', ') || FONTS[c.style.fonts.heading]?.label}${picked.some(l => l !== FONTS[DEFAULT_FONT].label) ? ' — 파일에 폰트를 함께 넣어 내보냅니다' : ''}`);
  return parts.join(' · ');
}
// 산출물 인스펙터 폰트 칸 — 고정 매체면 문구만, 자유 매체면 개별 선택(공통 따름 + 카탈로그)
function artifactFontHtml(a, c) {
  const spec = SPECS[a.specId];
  const r = fontRuleOf(spec?.mediumRules, spec?.rules);
  if (r.fixed) return `<label>폰트</label><div style="font-size:11.5px;color:var(--sub);line-height:1.5">이 매체는 ${escH(r.required)} 고정 — 매체 규정(${escH(spec.mediumName)})</div>`;
  const ov = a.overrides?.style?.fonts?.heading ?? '';
  return `<label>폰트 <span style="opacity:.6">공통: ${escH(FONTS[c.style.fonts.heading]?.label ?? c.style.fonts.heading)}</span></label>
      <select id="iFontOv"><option value="" ${ov ? '' : 'selected'}>공통 따름</option>${fontOptions(ov)}</select>${r.recommended ? `<div style="font-size:11px;color:var(--sub);margin-top:4px">매체 권장: ${escH(r.recommended)}</div>` : ''}`;
}
async function adSvgOf(a, imgCache) {
  const spec = SPECS[a.specId];
  const html = renderAd(adEffCtx(a), adEffStyle(a), spec);
  const r = await htmlToSvg(html, spec, { imgCache, title: adFileName(a, 'svg').replace(/\.svg$/, '') });
  return { ...r, name: adFileName(a, 'svg') };
}
async function doAdSvg(a) {
  toast('SVG 만드는 중…');
  try {
    const r = await adSvgOf(a, new Map());
    downloadText(r.svg, r.name, 'image/svg+xml');
    log(`내보내기: ${r.name} (SVG · 글자 ${r.stats.texts} · 그림 ${r.stats.images}${r.fallbacks.length ? ` · 대체: ${r.fallbacks.join(' / ')}` : ''})`);
    closeModal();
  } catch (e) { toast(`실패: ${e.message}`); }
}
async function exportAdZip(withSvg = false) {
  const c = state.campaign;
  // ZIP 은 승인분만(10-20 운영 모델) — 승인 게이트를 지난 것만 매체로 나간다. 검토용 낱장은 인스펙터 「내보내기」로
  const all = c.artifacts.filter(a => a.channel === 'ad');
  const ads = all.filter(a => a.status === 'approved');
  if (!ads.length) { toast(`승인된 매체 소재가 없어요 — 먼저 승인하세요(미승인 ${all.length}장)`); return; }
  if (ads.length < all.length) toast(`승인분 ${ads.length}장만 ZIP 에 — 미승인 ${all.length - ads.length}장 제외`);
  const assets = c.artifacts.filter(a => a.channel === 'asset' && a.status === 'approved');   // 전달물도 승인분만
  toast(`매체 소재 ${ads.length}장 생성 중…${withSvg ? ' (+ SVG)' : ''}`);
  try {
    const files = await exportAdFiles(ads);
    const blocked = files.filter(f => f.fit.lint.level === 'block');
    if (blocked.length) { toast(`규격 차단 ${blocked.length}건 — ZIP에서 제외됨`); }
    const entries = [];
    for (const f of files.filter(f => f.fit.lint.level !== 'block')) {
      entries.push({ name: `${f.spec.mediumName}/${f.name}`, data: new Uint8Array(await f.fit.measure.blob.arrayBuffer()) });
    }
    // 전달물(자소설 M시작배너 로고·이미지 파일): 원본 바이트 그대로(10-16)
    const assetBlocked = assets.filter(a => a.lint?.level === 'block').length;
    if (assetBlocked) toast(`전달물 차단 ${assetBlocked}건 — ZIP에서 제외됨`);
    for (const a of assets.filter(a => a.lint?.level !== 'block')) { const f = await assetFileOf(a); if (f) { entries.push({ name: `${SPECS[a.specId].mediumName}/${f.name}`, data: f.data }); if (f.scaled) { log(`전달물 ${f.name}: 원본 가로 ${f.scaled[0]}px → ${f.scaled[1]}px 확대`); toast(`${SPECS[a.specId].asset?.item} 원본이 가로 ${f.scaled[0]}px 로 작아 ${f.scaled[1]}px 로 늘려 넣었어요 — 더 큰 파일을 올리면 그대로 나갑니다`); } } }
    // 전달 시트(10-16 캐치 중앙배너·네이버 썸네일·에브리타임 288): 글자를 매체가 웹폰트로 올리는 규격은 문구·배경 Hex 를 txt 로 — 이미지에는 글자가 없다
    const sheet = {}; const hexOf = {};
    const traceOf = a => { try { return JSON.parse(a.html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')); } catch { return null; } };
    for (const a of ads) { const tr = traceOf(a); const hx = tr?.field?.stops?.[0]; if (hx) hexOf[SPECS[a.specId].mediumName] ??= hx; }
    for (const a of ads) {
      const spec = SPECS[a.specId]; const vo = spec.rules?.visualOnly || spec.visualOnly; const outs = spec.outsideTexts ?? [];
      if (!vo && !outs.length) continue;
      const tr = traceOf(a); const cp = tr?.copy ?? {}; const hex = tr?.field?.stops?.[0] ?? hexOf[spec.mediumName] ?? c.style.palette?.primary ?? '';
      const lines = [`■ ${artLabel(a)}`, cp.sub ? `서브: ${cp.sub}` : null, cp.main ? `메인: ${String(cp.main).replace(/\n/g, ' ')}` : null, cp.date ? `날짜·키워드: ${cp.date}` : null, hex ? `배경 Hex: ${hex}` : null, outs.length ? `글자수 한도: ${outs.map(t => `${t.field}${t.maxChars ? ' ' + t.maxChars + '자' : ''}`).join(' · ')}` : null, ''].filter(x => x !== null);
      (sheet[spec.mediumName] ??= []).push(...lines);
    }
    for (const [mName, lines] of Object.entries(sheet)) entries.push({ name: `${mName}/전달_문구_배경색.txt`, data: new TextEncoder().encode(['이 매체는 글자를 매체가 직접 올립니다 — 이미지에는 글자가 없고, 아래 문구와 배경 Hex 를 신청서·입력란에 적어 주세요.', '', ...lines].join('\n')) });
    if (!entries.length) { toast('내보낼 소재가 없어요'); return; }
    const rasterN = entries.length, svgFallbacks = new Set();
    if (withSvg) {
      // 래스터와 같은 이름 규칙으로 svg/ 폴더에 — 차단된 소재는 래스터처럼 뺀다
      const enc = new TextEncoder(), cache = new Map();
      for (const f of files.filter(f => f.fit.lint.level !== 'block')) {
        const r = await adSvgOf(f.a, cache);
        r.fallbacks.forEach(x => svgFallbacks.add(x));
        entries.push({ name: `svg/${r.name}`, data: enc.encode(r.svg) });
      }
    }
    const zip = buildZip(entries);
    download(new Blob([zip], { type: 'application/zip' }), `${c.id}_매체소재${withSvg ? '+SVG' : ''}_v${c.context.version}.zip`);
    log(`내보내기: 매체 소재 ZIP ${rasterN}장${withSvg ? ` + SVG ${entries.length - rasterN}장` : ''} (${[...new Set(files.map(f => f.spec.mediumName))].join(', ')})${svgFallbacks.size ? ` · SVG 대체: ${[...svgFallbacks].join(' / ')}` : ''}`);
    closeModal();
  } catch (e) { toast(`실패: ${e.message}`); }
}
function exportAdModal(a) {
  const spec = SPECS[a.specId];
  modal({
    title: `${artLabel(a)} 내보내기`,
    desc: '매체 규격 그대로 — 치수·포맷·용량을 맞춰 뽑고, 규정에 안 맞으면 내보내지 않습니다.',
    body: `<div style="font-size:12.5px;color:var(--sub);line-height:1.7">${adRulesText(spec)}<br>파일명: <b>${adFileName(a, spec.format[0])}</b></div>
      <div style="margin-top:10px">${lintHtml(a)}</div>
      <div style="font-size:12px;color:var(--sub);line-height:1.6;margin-top:10px">${exportFontLine([a])}</div>
      <div style="font-size:12px;color:var(--sub);line-height:1.6;margin-top:6px">${SVG_NOTE}</div>`,
    actions: [
      { label: '닫기' },
      { label: 'SVG (Figma 편집용)', fn: () => { doAdSvg(a); return false; } },
      { label: '다운로드', pri: true, fn: () => { doAdExport(a); return false; } },
    ],
  });
}

function exportArtifactModal(a) {
  const spec = effSpec(a);
  const kk = a.key ?? a.specId;
  if (spec.channel === 'asset') { assetFileOf(a).then(f => { if (!f) { toast(a.lint?.level === 'block' ? '전달물 규정 미달 — 더 큰 원본을 받아야 합니다' : `${spec.asset?.item} 파일이 없어요 — 먼저 올려 주세요`); return; } download(new Blob([f.data], { type: f.mime }), f.name); log(`내보내기: 전달물 ${f.name}${f.scaled ? ` (가로 ${f.scaled[0]}→${f.scaled[1]}px 확대)` : ''}`); if (f.scaled) toast(`원본이 가로 ${f.scaled[0]}px 로 작아 ${f.scaled[1]}px 로 늘려 넣었어요 — 가로 ${f.scaled[1]}px 이상 파일을 올리면 그대로 나갑니다`); }); return; }
  if (spec.channel === 'ad') return exportAdModal(a);
  if (spec.channel === 'banner' || spec.channel === 'gwthumb') {
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
    const blob = await rasterize(await withExportFont(a.html, artifactFontId(a)), spec.w, spec.h, s, fmt);
    download(blob, `${kk}@${s}x.${fmt}`);
    log(`내보내기: ${kk}@${s}x.${fmt}`);
    closeModal();
  } catch (e) { toast(`실패: ${e.message}`); }
}

function exportAllModal() {
  const c = state.campaign;
  const banners = c.artifacts.filter(a => a.channel === 'banner' || a.channel === 'gwthumb');
  const htmls = c.artifacts.filter(a => ['edm', 'landing'].includes(a.channel));
  const prints = c.artifacts.filter(a => !['edm', 'landing', 'banner', 'gwthumb', 'ad'].includes(a.channel));
  const ads = c.artifacts.filter(a => a.channel === 'ad');
  const adsOk = ads.filter(a => a.status === 'approved');
  modal({
    title: '전체 내보내기',
    desc: '온라인은 파일로 즉시, 인쇄물은 산출물별 PDF 저장으로 진행합니다. 매체 소재는 매체별 폴더로 묶은 ZIP.',
    body: `<div style="font-size:12.5px;color:var(--sub);line-height:1.8">
      ${ads.length ? `· 매체 소재 ZIP — ${[...new Set(adsOk.map(a => SPECS[a.specId].mediumName))].join(', ') || '승인분 없음'} (<b>승인 ${adsOk.length}장</b> / 전체 ${ads.length}장${ads.length > adsOk.length ? ` · 미승인 ${ads.length - adsOk.length}장 제외` : ''})<br>` : ''}
      · 온라인 HTML — ${htmls.map(a => a.specId).join(', ') || '없음'}<br>
      · 배너 PNG 2x — ${banners.map(a => a.specId).join(', ') || '없음'}<br>
      · 인쇄 PDF — ${prints.map(a => artLabel(a)).join(', ') || '없음'} <span style="opacity:.7">(각각 인쇄 대화상자)</span></div>
      ${ads.length ? `<div style="font-size:12px;color:var(--sub);line-height:1.6;margin-top:8px">${exportFontLine(ads)}</div>` : ''}
      ${ads.length ? `<div style="font-size:12px;color:var(--sub);line-height:1.6;margin-top:8px">「ZIP + SVG」는 같은 ZIP 안 <b>svg/</b> 폴더에 소재마다 SVG를 함께 넣습니다. ${SVG_NOTE}</div>` : ''}`,
    actions: [
      { label: '닫기' },
      { label: 'HTML 일괄', fn: () => { htmls.forEach(a => downloadText(a.html, `${a.specId}.html`)); log(`내보내기: HTML ${htmls.length}개`); } },
      ...(ads.length ? [{ label: 'ZIP + SVG', fn: () => { exportAdZip(true); return false; } }, { label: '매체 소재 ZIP', pri: true, fn: () => { exportAdZip(); return false; } }] : []),
      { label: '배너 PNG 2x 일괄', pri: !ads.length, fn: () => { batchBanners(banners); return false; } },
    ],
  });
}
async function batchBanners(banners) {
  toast('배너 이미지 생성 중…');
  for (const a of banners) {
    const spec = effSpec(a);
    try { download(await rasterize(await withExportFont(a.html, artifactFontId(a)), spec.w, spec.h, 2, 'png'), `${a.key ?? a.specId}@2x.png`); } catch {}
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
    for (const a of c.artifacts) if (variantCount(a) > 1) a.variant = ((a.variant ?? 0) + 1) % variantCount(a);
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
  // 「통과분 승인」(10-20 운영 모델 §4·§5) — 게이트 ready(등급 A·B · 규격 통과 · 검수 경고 없음)만 묶어 승인한다.
  // review·draft 는 산출물을 열어 사유를 적고 하나씩, blocked 는 절대. 인쇄·eDM 등 게이트 밖 채널은 기존대로 함께 승인.
  const c = state.campaign; if (!c) return;
  const ads = c.artifacts.filter(a => a.channel === 'ad' || a.channel === 'asset');
  for (const a of ads) gateOf(a);
  const by = st => ads.filter(a => a.gate?.state === st && a.status !== 'approved');
  const ready = by('ready'), review = by('review'), blocked = by('blocked'), draft = by('draft'), pending = by('pending');
  if (pending.length) { toast(`규격 검사가 아직 끝나지 않았어요(${pending.length}장) — 잠시 후 다시`); return; }
  const others = c.artifacts.filter(a => a.channel !== 'ad' && a.channel !== 'asset' && a.status !== 'approved');
  const n = ready.length + others.length;
  if (!n && !review.length && !draft.length && !blocked.length) { toast('승인할 것이 없어요 — 전부 승인됨'); return; }
  const li = (arr, label) => arr.length ? `<li><b>${label} ${arr.length}장</b> — ${arr.slice(0, 6).map(a => escH(artLabel(a))).join(' · ')}${arr.length > 6 ? ' …' : ''}</li>` : '';
  modal({
    title: '승인 — 검사 통과분만',
    desc: '규정 차단은 승인할 수 없습니다. 검수 필요·초안은 산출물을 열어 사유를 적고 하나씩 승인합니다.',
    body: `<ul style="margin:0;padding-left:18px;font-size:12.5px;line-height:1.8">${li(ready, '승인 가능')}${li(others, '게이트 밖(인쇄·온라인)')}${li(review, '검수 필요')}${li(draft, '초안(자유 배치)')}${li(blocked, '차단')}</ul>`,
    actions: [
      { label: '돌아가기' },
      { label: `${n}장 승인`, pri: n > 0, fn: () => {
        if (!n) { toast('승인 가능한 소재가 없어요'); return false; }
        for (const a of [...ready, ...others]) { a.status = 'approved'; a.gateOverride = null; }
        logEvent(c, 'artifact_approved', { count: n, gate: 'ready', skipped: { review: review.length, draft: draft.length, blocked: blocked.length } });
        statusBadges(); renderInspector(); saveCampaignToStore();
        const kpi = c.log.reduce((m, e) => (m[e.type] = (m[e.type] ?? 0) + 1, m), {});
        log(`통과분 승인 ${n}장 — 검수 필요 ${review.length} · 초안 ${draft.length} · 차단 ${blocked.length} (생성 ${kpi.artifact_generated ?? 0} · 편집 ${kpi.manual_edit ?? 0} · 전파 ${kpi.propagation_run ?? 0})`);
        toast(`${n}장 승인 — 남은 검수 필요 ${review.length} · 초안 ${draft.length} · 차단 ${blocked.length}`);
      } },
    ],
  });
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
      guideSkips: a.guideSkips ?? null, guideHuman: a.guideHuman ?? null,   // 가이드 검수 넘김 이유·눈으로 확인(10-14)
      variant: a.variant ?? 0, size: a.size ?? null, status: a.status,
      gateOverride: a.gateOverride ?? null,   // 검수 필요·초안을 사유 적고 승인한 기록(10-20 승인 게이트)
    })),
    log: c.log,
  };
  const all = loadStore(), prevThumb = all.find(x => x.id === c.id)?.logoThumb;
  if (prevThumb && prevThumb.sig === logoSig(c.style?.logo)) snapshot.logoThumb = prevThumb;   // 목록 로고 썸네일(renderSidebar) — 로고가 그대로면 이어 쓴다
  const list = all.filter(x => x.id !== c.id);
  list.push(snapshot);
  try { saveStore(list); } catch {
    snapshot.style = { ...snapshot.style, keyVisual: null };
    try { saveStore(list); } catch { toast('저장 공간 부족 — 저장 실패'); }
  }
}

const LOG_LABEL = {
  campaign_created: '캠페인 생성', artifact_generated: '산출물 생성', manual_edit: '개별 편집',
  propagation_run: '일괄 반영', style_changed: '스타일 변경', size_changed: '규격 변경',
  variation_cycled: '시안 변경', roster_loaded: '명단 적용', artifact_approved: '승인', artifact_unapproved: '승인 취소',
  campaign_reopened: '다시 열기', artifact_added: '산출물 추가', artifact_removed: '산출물 제거',
};

// 저장된 캠페인의 로고를 한 번 손질한다(누끼·여백 트림) — 트림 기능 전에 올린 로고가 작게 보이는 것을 고친다. 바뀐 게 없으면 표시만 남긴다
async function migrateLogos(c) {
  if (!c?.style || c.style.logoPrepped) return;
  let changed = false;
  for (const key of ['logo', 'logoLight']) {
    if (!c.style[key]) continue;
    try { const p = await prepLogo(c.style[key]); if (p.changed) { c.style[key] = p.dataUrl; changed = true; } if (key === 'logo' && p.monoDataUrl) c.style.logoMono = p.monoDataUrl; } catch {}
  }
  c.style.logoPrepped = true;
  if (state.campaign !== c) return;
  if (changed) { regen(c); layoutArtboard(); log('로고 손질 — 투명 여백을 잘라 크게 보이게'); }
  autosave();
}
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
    if (s.guideSkips) a.guideSkips = s.guideSkips;
    if (s.guideHuman) a.guideHuman = s.guideHuman;
    if (s.gateOverride) a.gateOverride = s.gateOverride;
    if (s.variant != null) a.variant = s.variant;
  }
  regen(state.campaign);   // 복원한 개별 설정을 반영해 다시 렌더
  migrateLogos(state.campaign);
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
// 묶은 무료 폰트의 @font-face 를 앱 문서에도 — SVG 내보내기(core/svgexport.js)는 앱 문서 안 상자에서 글자를 재므로 여기 있어야 같은 서체로 잰다. 브라우저는 쓰이는 굵기만 받는다
document.head.insertAdjacentHTML('beforeend', `<style id="bundledFonts">${fontIds().filter(isBundledFont).map(id => localFaceCss(id)).join('')}</style>`);
$('homeBtn').onclick = () => show('home');
$('logHead').onclick = () => $('logCard').classList.toggle('open');
// 캔버스 배경색(10-20 사용자 「배경 색 조정 가능하게 피그마처럼」) — 이 브라우저에만 저장(localStorage), 산출물·내보내기와 무관한 보기용
{
  const KEY = 'mbm-canvas-bg';
  const apply = v => { if (v) document.getElementById('work').style.setProperty('--canvas-bg', v); else document.getElementById('work').style.removeProperty('--canvas-bg'); const i = $('canvasBg'); if (i && v) i.value = v; };
  try { apply(localStorage.getItem(KEY) || null); } catch {}
  $('canvasBg').oninput = e => { apply(e.target.value); try { localStorage.setItem(KEY, e.target.value); } catch {} };
  $('canvasBgReset').onclick = () => { apply(null); try { localStorage.removeItem(KEY); } catch {} };
}
renderHistBtns();   // 아직 캠페인이 없어도 툴팁은 붙여 둔다 — 단축키를 여기서 처음 알게 되는 사용자가 있다
initHome();
show('home');
