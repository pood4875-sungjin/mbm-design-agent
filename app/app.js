// Campaign Agent — 도구형 앞문 (챗봇 아님).
// 홈(입력 우선) → 인테이크 시트(질문지 한 장) → 아트보드 워크스페이스(줌·팬·선택·즉시 편집).
// 편집: 우측 인스펙터 — 선택 없음 = 캠페인 전체(타이핑 즉시 전 산출물 일괄 반영),
//        산출물 선택 = 그것만 즉시 반영(override, 일괄 반영에서 보존).

import { createContext, updateContext, missingFields, CORE_FIELDS, KINDS, cleanRows, mergeRows, migrateRecruitCore } from '../core/context.js';
import { MEDIA } from '../core/media.js';
import { adSpecEntries, adSpecGroups, mediumRank, specStage, specRank, STAGE_NAMES, adFileNameOf, extractSpecGroups } from '../core/adspecs.js';
import { lintArtifact } from '../core/lint.js';
import { normalizeStyle, cmykText } from '../core/style.js';
import { textColorLocked, FONTS, fontIds, registerCustomFont, customFontCss, CUSTOM_MARK, BUNDLED_MARK, DEFAULT_FONT, isBundledFont, fontGroup, fontFiles, localFaceCss, embeddedFaceCss, fontInfoLine, fontRuleOf, effectiveFontId } from '../core/fonts.js';
import { extractPalette, rolesFromKeyVisual, rolesFromSources, analyzeRegion, buildPalette, TEXT_ZONES, edgeColor, fieldFromImage, colorDistance } from '../core/palette.js';
import { objectNeedOf, needsCutout } from '../core/adfields.js';
import { resolveField } from '../core/field.js';
import { checkAdDoc } from '../core/adcheck.js';
import { kvTypeOf, kvTypeSummary, kvTypeChoices, baseKvMeta, applyKvTypeOverride } from '../core/kvtypes.js';
import { kvGuideText, logoGuideText, checkKv, checkLogo, CHECK_TONE } from '../core/inputcheck.js';   // 10-19 첨부 안내·크기 검사
import { SPECS, PURPOSES, ARROWS, SIZE_PRESETS, purposesFor, optionalSpecIds, specIdsOf, renderArtifact } from '../core/contract.js';
import { registerAll, generateArtifacts, computeVariants, ensureArtifacts, logEvent, artifactKey } from '../core/generate.js';
import { refStyle, refOf, resolveRefs } from '../core/assetref.js';   // 11-09 성능: 렌더 HTML 엔 그림 참조(blob:), 바이트는 내보내기·래스터 직전에만
import { approvalGate, STATE_LABEL } from '../core/gate.js';
import { MOLD_BLOCK_MEDIA } from '../core/guidecheck.js';   // 틀 ✗ 로 승인을 막는 매체(자소설) — 측정 전엔 게이트 pending
import { htmlHash, templateChoices, variantSubOf } from '../core/variants.js';   // 일괄 전파 전후 그림 지문(승인 해제 판정)   // 승인 게이트(10-20 운영 모델 §4·§5)
import * as LLM from './llm.js';
import { mountClaudeChip, claudeReady, judgeKvType } from './claudelink.js';   // 11-10 개인 Claude 계정 연결(로컬 앱 · CLI)
import { rasterize, rasterizeCanvas, download, downloadText, openPrintPdf } from './raster.js';
import { createFreeDesign, freeFontIds, freeHealth } from './freedesign.js';
import { createElAi, AI_ICON } from './elai.js';   // 11-10 요소 AI 편집(선택 상자 옆 AI 아이콘 → 말로 고치기)
import { createAiDesign } from './aidesign.js';   // 11-09 인스펙터 「AI 디자인」 칸 — 제안·말로 고치기·펼치기(docs/ai-design-flow.md)   // 11-05 「대화로 시안 뽑기」 — Claude 가 만든 자유 시안(배경·타이포 HTML)을 안(kind 'free')으로 쓰고 저장해 재사용
import { agentTurn, scriptedTurn, PHASES, PHASE_LABEL, TRACKS, detectKind, detectTrack, detectMedia, fieldsFor,
  ESSENTIAL, ASK, normDate, extractRecruit } from './agent.js';
import { measureArtifact } from './measure.js';
import { gradientEditorHtml, bindGradientEditor } from './gradedit.js';
import { showProgress, ProgressCancelled } from './progress.js';
import { morphDoc, createLiveScheduler } from './live.js';   // 11-02 끄는 동안 실시간 미리보기
import { asEventContext } from '../core/context.js';
import { colorRowHtml, iconBtn, numField, wireFui, ic } from './fui.js';   // 11-02 피그마 UI3 식 컨트롤(hub/panel.js 에서 옮김)
import { gradientFrom, normGradient } from '../core/gradient.js';
import { renderFit } from './adfit.js';
import { buildZip } from './zip.js';
import { htmlToSvg } from '../core/svgexport.js';
import { parseRoster } from '../core/roster.js';
import { assessForSpecs } from '../core/imagequality.js';
import { knockoutLogo as knockoutLogoRGBA, trimBox, logoToneOf as logoToneOfRGBA, logoMeta as logoMetaRGBA, whitenLogo as whitenLogoRGBA } from '../core/logo.js';
import { upscale } from './upscale.js';
import { createEditor } from './editor.js';
import { createElementSelect } from './elselect.js';   // 11-02 프레임 안 요소 고르기
import { createArtKv } from './artkv.js';   // 11-10 hub 이식 1·2단계 — 이미지 요소 패널(이 소재만 그림·로고 바꾸기 · 외관 · 정렬)
import { ART_ASSET_KEYS } from '../core/artasset.js';   // 11-10 hub 이식 — 이 소재 그림·로고 개별값
import { createRuler } from './ruler.js';
import { applyElementEdits, applyRuns, elementFontIds, elementName, parseElementId, withElementEdit, addRun, stripRuns, scaleRuns, STYLE_ROLES, WEIGHTS, WEIGHT_NAME } from '../core/elementedit.js';
import { createCharSel, rangeStyle } from './charsel.js';   // 11-09 글자 범위 색(드래그로 고른 글자만)
import { PRESET_KEYS } from '../core/editlayout.js';
import { requestAnalysis, buildGroupStyles, apiCopy, shapeOfSpec } from './hybrid.js';
import { getKey as aiGetKey } from './llm.js';
// 11-03 사용자 결정: 「AI 그림 판단」 버튼은 AI 키가 있을 때만(기본 숨김) — 시안 틀은 이 값을 안 읽어 기본안에만 효과
const aiKeyReady = () => { try { return !!aiGetKey() || claudeReady(); } catch { return false; } };   // 11-10: Claude 계정이 연결돼 있으면 「AI 그림 판단」도 그 계정으로(서버가 CLI 로 돈다)
import { createSelect, pickForExport } from './select.js';   // 11-02 선택하기(컨시어지 박진화 「선택한 소재만 추출」) — 카드·드래그·매체 머리글로 골라 그것만 ZIP
import { mountKvFocus, withManual } from './kvfocus.js';   // 11-02 주인공 확인·직접 지정(컨시어지 한희하) — 썸네일 위 네모, 클릭/드래그   // 10-22 하이브리드(A+AI): 그림 판단 1회 → 모양 묶음별 crop·프리셋
import { resolveAiStyle, aiEligible } from '../core/trackb/analyze.js';
import { FOLDERS_LS, NONE, NONE_LABEL, migrateFolders, createFolder, renameFolder, deleteFolder, reorderFolder, moveFolderBy, moveCampaign,
  toggleFolder, folderOf, filterCampaigns, groupCampaigns, nameError, cleanName, displayName, logoSig, tileToneFor, containBox } from '../core/folders.js';
import { createCampStore, isQuotaError } from '../core/campstore.js';
import { openCampBackend, legacyStore } from './campdb.js';

const CHIP_LABEL = { tint: '은은한 틴트', brand: '브랜드 채움', plain: '글자만' };
const TONE_LABEL = { auto: '기본', dark: '검정', light: '흰색' };
// 글자색 규정 매체(렌더러 regulatedText 와 같은 판정): 규격 textColors.main(카카오·NAP 비즈보드) 또는 규정 매체(fonts.required — 자소설·리멤버·카카오). 직접 글자색(textColor)은 여기선 안 먹는다(11-02)
const textColorRegulated = spec => textColorLocked(spec?.mediumRules, spec?.rules);   // 글자색 톤(style.textTone, 10-19)   // 상세 라벨 알약 톤(style.chipTone)
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

import { SAMPLES } from './samples.js';   // 10-21 샘플 입력(테스트 test/brief-samples.test.js 가 같은 파일을 읽는다)

const state = {
  intake: { kind: 'event', track: null, media: [], fields: {}, channels: [], extra: {}, kv: null, logo: null, signage: {}, sizes: {}, mode: 'light', colors: ['#0A3D91', '#11095F', '#B56705'], font: 'KakaoBigSans', mood: '', kvReadability: null, suggests: [], step: 0 },
  campaign: null,
  selected: null,          // specId | null
  zoom: 1, panX: 0, panY: 0,
};
const $ = id => document.getElementById(id);
const frames = new Map();  // artifact.key → {frame, iframe, badge, label}
// 선택하기(11-02, app/select.js) — 선택은 세션만(저장 안 함). 켜져 있으면 카드 클릭·빈 곳 드래그가 선택이 되고, 내보내기 모달에 「선택한 소재만」이 뜬다
const SEL = createSelect({ state, frames, $ });
// 글자 범위 색(11-09 사용자 「글자 하나하나 단위로 — 드래그해서」, app/charsel.js): 고른 프레임 글자 더블클릭 → 끌어 고르기 → 그 글자만 색(overrides.elements[요소].runs)
const CS = createCharSel({ frames, keyOf: a => a.key ?? a.specId, onApply: (a, id, run, text) => charApply(a, id, run, text), onText: (a, id, text, was) => charText(a, id, text, was), onBold: (a, pick) => boldToggle(a, pick), toast: t => toast(t),
  // 피그마처럼: 편집 중엔 선택 손잡이를 숨기고, 끌어 고른 범위는 오른쪽 패널(고른 글자 · 칠)로
  onPick: (p, a) => { if (p && state.selected === (a.key ?? a.specId) && state.elSel !== p.id) state.elSel = p.id; if (state.campaign) renderInspector(); },
  onState: (on, a) => { if (on) EL.hide(); else if (state.elSel && state.selected === (a?.key ?? a?.specId)) EL.show(a, state.elSel); if (state.campaign) renderInspector(); } });
function charApply(a, id, run, text) { rangeApply(a, id, run, text); }
// 11-10 범위 서식(피그마 UI3 글자 패널): run = { s, e, c?, o?, w?, px?, ls? } — 준 속성만 바꾸고 나머지는 남긴다(null = 그 속성 지우기). 매체 규정 잠금은 사유 한 줄로 막는다
const RUN_LABEL = { c: '색', o: '불투명도', w: '굵기', px: '크기', ls: '자간' };
function rangeApply(a, id, run, text) {
  const spec = SPECS[a.specId], keys = Object.keys(run).filter(k => k in RUN_LABEL);
  const why = (keys.includes('c') || keys.includes('o')) && rangeColorLockOf(spec) ? rangeColorLockOf(spec)
    : (keys.includes('w') || keys.includes('ls')) && styleLockOf(spec) ? '이 매체는 굵기·자간 같은 글꼴 스타일을 바꿀 수 없어요(규정)'
    : keys.includes('px') && sizeLockedOf(spec) ? '이 규격은 글자 크기가 규정으로 정해져 있어 바꿀 수 없어요' : null;
  if (why) { toast(why); return; }
  const runs = addRun(a.overrides.elements?.[id]?.runs ?? null, run, text);
  const label = keys.map(k => RUN_LABEL[k]).join('·');
  elCommit(a, { elements: withElementEdit(a.overrides.elements, id, { runs: runs ?? null }) }, `${elementName(id)} 고른 글자 ${label}${keys.every(k => run[k] == null) ? ' 지우기' : ''}`);
  setTimeout(() => CS.rearm(a.key ?? a.specId), 80);
}
// ⌘B(피그마): 고른 범위(없으면 문구 전체)가 모두 Bold 이상이면 Regular 쪽으로, 아니면 Bold 쪽으로 — 그 글꼴이 가진 굵기 중 가장 가까운 것
function boldToggle(a, pick) {
  const id = pick?.id ?? state.elSel; if (!id || /^(kv|logo)$/.test(id)) return;
  const it = EL.find(a, id); if (!it?.el) return;
  const cs = it.el.ownerDocument.defaultView.getComputedStyle(it.el), ws = fontWeightsOf(cs);
  const cur = pick ? pick.st?.w : rangeStyle(it.el, 0, it.el.textContent.length).w;
  const toBold = !(cur != null && cur >= 700);
  const near = t => ws.reduce((p, q) => (Math.abs(q - t) < Math.abs(p - t) ? q : p), ws[0]);
  const w = toBold ? (ws.filter(x => x >= 700)[0] ?? near(700)) : near(400);
  if (pick) rangeApply(a, id, { s: pick.s, e: pick.e, w }, pick.text);
  else {
    if (styleLockOf(SPECS[a.specId])) { toast('이 매체는 굵기·자간 같은 글꼴 스타일을 바꿀 수 없어요(규정)'); return; }
    const ed = a.overrides.elements?.[id] ?? {};
    elCommit(a, { elements: withElementEdit(a.overrides.elements, id, { weight: w, runs: stripRuns(ed.runs, ['w'], it.el.textContent) }) }, `${elementName(id)} ${toBold ? '굵게' : '굵게 풀기'}`);
  }
}
// 11-10 사용자 「피그마처럼 실시간으로」: 색 피커 끌기·숫자 칸 입력 중엔 보이는 프레임의 그 글자에 직접 입힌다(재렌더·안 후보 계산 없음).
//   처음 칠할 때의 안쪽 html 을 기억해 두고 매번 그 위에 범위 서식 하나를 얹는다(applyRuns) — 손을 떼면(change) runs 에 한 번 커밋 + 되돌리기 한 걸음, 정식 그림이 이 미리보기를 덮는다
let liveOrig = new WeakMap();   // 글자 요소 → { inner, style } — 커밋(elCommit)하면 비운다
function liveFieldEl(a, id) {
  const doc = frames.get(a.key ?? a.specId)?.iframe?.contentDocument; if (!doc) return null;
  const { role, n } = parseElementId(id);
  return doc.querySelectorAll(`[data-field="${role}"]`)[n] ?? null;
}
function livePaint(a, id, run) {   // run: { s, e, c?, o?, w?, px?, ls? } 범위 · 또는 { whole: { color?, op?, ls?, lh? } } 문구 전체
  const el = liveFieldEl(a, id); if (!el) return;
  let o = liveOrig.get(el); if (!o) { o = { inner: el.innerHTML, style: el.getAttribute('style') ?? '' }; liveOrig.set(el, o); }
  const doc = el.ownerDocument; doc.__liveHtml = null; const f = frames.get(a.key ?? a.specId); if (f) f.shown = null;   // 정식 그림이 같은 html 이어도 다시 입히게
  if (run.whole) {
    const w = run.whole; let st = o.style;
    if (w.color) st += `;color:${w.color}`;
    if (w.op != null) st += `;opacity:${w.op / 100}`;
    if (w.ls != null) st += `;letter-spacing:${w.ls / 100}em`;
    if (w.lh != null) st += `;line-height:${w.lh / 100}`;
    if (w.weight) st += `;font-weight:${w.weight}`;
    if (w.px) st += `;font-size:${w.px}px`;
    if (w.color) { if (!o.cleared) { el.innerHTML = o.inner; for (const n of el.querySelectorAll('[style]')) n.style.removeProperty('color'); o.cleared = true; } }   // 문구 전체 색은 안쪽 강조색·범위 색도 덮는다(커밋도 같다)
    el.setAttribute('style', st);
    return;
  }
  const { s, e, ...patch } = run;
  el.innerHTML = applyRuns(o.inner, [{ s, e, ...patch }]);
  if (o.style !== el.getAttribute('style')) el.setAttribute('style', o.style);
}
function liveForget(a, id) { const el = liveFieldEl(a, id); if (el) liveOrig.delete(el); }
// 입력하다 그만두면(Esc·같은 값으로 닫기) 정식 그림으로 되돌린다
function liveCancel(a, id) { const el = liveFieldEl(a, id); if (!el || !liveOrig.has(el)) return; const o = liveOrig.get(el); el.innerHTML = o.inner; el.setAttribute('style', o.style); liveOrig.delete(el); setTimeout(() => CS.rearm(a.key ?? a.specId), 0); }
// 11-09 캔버스 글자 고치기 = 그 소재만(일괄은 왼쪽 패널). 요소 → 브리프 칸: 메인 → 공고 타이틀 · 서브 → 서브 문구 · 날짜 → 날짜 문구 · 상세 줄 → 라벨로 모집 직무·근무지·고용 형태·날짜
function charText(a, id, text, was) {
  const c = state.campaign; if (!c) return;
  const role = parseElementId(id).role;
  const clean = t => t.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim();   // 줄바꿈은 지킨다
  let pairs = [];
  if (role === 'detail') {
    // 상세 칸 하나에 여러 줄(「모집일정 : …」「모집직무 : …」)이 들어 있다 — 줄마다 라벨로 칸을 찾고, 라벨 없는 줄은 앞 줄 값의 이어진 줄(사용자가 Enter 로 꺾은 줄)
    // 11-10 추가 행: 라벨이 행 라벨(근무지·전형절차…)이면 그 행 값 — 「row:라벨」로 모아 아래에서 rows 하나로 접는다
    const rowsNow = cleanRows({ ...c.context.core, ...(a.overrides.core ?? {}) }.rows), escR = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
    const RE = new RegExp(`^\\s*(접수\\s*기간|모집\\s*기간|모집\\s*일정|모집\\s*직무|모집\\s*분야|직무${rowsNow.map(r => '|' + escR(r.label)).join('')})\\s*[:：|｜ㅣ]?\\s*(.*)$`);
    const fieldOf = l => /기간|일정/.test(l) ? 'dateText' : /직무|분야/.test(l) && !rowsNow.some(r => r.label.replace(/\s+/g, '') === l.replace(/\s+/g, '')) ? 'role' : `row:${rowsNow.find(r => r.label.replace(/\s+/g, '') === l.replace(/\s+/g, ''))?.label ?? l}`;
    const rowsOf = t => { const out = []; for (const ln of String(t).split('\n')) { const m = ln.match(RE); if (m) out.push({ f: fieldOf(m[1]), v: m[2] }); else if (out.length) out[out.length - 1].v += '\n' + ln; else out.push({ f: null, v: ln }); } return out.map(r => ({ ...r, v: clean(r.v) })); };
    const now = rowsOf(text), prev = rowsOf(was);
    pairs = now.filter(r => r.f && (prev.find(p => p.f === r.f)?.v ?? null) !== r.v).map(r => [r.f, r.v]);
    if (!pairs.length && now.every(r => !r.f)) pairs = [['role', clean(text)]];   // 라벨 없는 값만 쓰는 틀(인스타 1080 값만)
    const rowEd = pairs.filter(p => p[0].startsWith('row:'));
    if (rowEd.length) pairs = [...pairs.filter(p => !p[0].startsWith('row:')), ['rows', mergeRows(rowsNow, rowEd.map(([f, v]) => ({ label: f.slice(4), value: v })))]];
  } else {
    const f = { main: 'headline', advertiser: 'headline', sub: 'subText', date: 'dateText' }[role];
    if (f) pairs = [[f, clean(text)]];
  }
  if (!pairs.length) { if (role !== 'detail') toast('이 줄은 캔버스에서 고칠 수 없어요 — 왼쪽 패널에서 고쳐 주세요'); refreshFrames(a.key ?? a.specId); return; }
  const o = { ...(a.overrides.core ?? {}) }; let changed = false;
  const same = (x, y) => Array.isArray(y) ? JSON.stringify(cleanRows(x)) === JSON.stringify(y) : x === y;   // 11-10 rows 는 목록
  for (const [f, v] of pairs) { if (same(o[f] ?? c.context.core[f] ?? '', v)) continue; changed = true; if (!same(c.context.core[f] ?? '', v)) o[f] = v; else delete o[f]; }
  if (!changed) return;
  pushHistory(`${artLabel(a)} ${pairs.map(p => FIELD_LABEL[p[0]]).join('·')} 캔버스에서 고침`, false);
  a.overrides.core = o; a.status = 'draft'; a.gateOverride = null;
  logEvent(c, 'manual_edit', { specId: a.specId, element: id });
  regen(c); autosave(); refreshFrames(a.key ?? a.specId);
  setTimeout(() => CS.rearm(a.key ?? a.specId), 80);
  toast(`이 소재만 바뀌었어요 — ${pairs.map(p => FIELD_LABEL[p[0]]).join('·')}. 모든 소재에 쓰려면 왼쪽 패널에서`);
  log(`${a.specId} 캔버스 글자 편집 (${pairs.map(p => FIELD_LABEL[p[0]]).join('·')})`);
}
function charEnter(a, pt = null) { CS.enter(a, pt); }
// 11-09 사용자 「삭제하고 싶으면 할 수 있게」 — 요소 빼기: 일괄(core.omit, 왼쪽 패널) · 개별(a.overrides.core.omit, 캔버스 Delete). 렌더 단계에서 빼서 레이아웃이 다시 맞춰진다
const OMIT_ROLE = { sub: 'sub', date: 'date', detail: 'detail', chip: 'detail', tags: 'detail', tag: 'detail' };
const OMIT_NAME = { sub: '서브', date: '날짜', detail: '상세' };
const omitList = v => String(v ?? '').split(',').map(t => t.trim()).filter(Boolean);
function omitOf(c, a = null) { return omitList(a?.overrides?.core?.omit ?? c.context.core.omit); }
function setArtOmit(a, roles) {
  const c = state.campaign, o = { ...(a.overrides.core ?? {}) }, v = [...new Set(roles)].join(',');
  if (v === (c.context.core.omit ?? '')) delete o.omit; else o.omit = v;
  pushHistory(`${artLabel(a)} 요소 ${roles.length > omitOf(c, a).length ? '빼기' : '다시 넣기'}`);
  a.overrides.core = o; a.status = 'draft'; a.gateOverride = null;
  state.elSel = null; EL.hide();
  regen(c); autosave(); refreshFrames(a.key ?? a.specId); renderInspector();
}
function omitElement(a, id) {
  const role = OMIT_ROLE[parseElementId(id).role];
  if (!role) { toast(`${elementName(id)}는 뺄 수 없어요 — 메인 문구는 글자를 고쳐 주세요`); return; }
  setArtOmit(a, [...omitOf(state.campaign, a), role]);
  toast(`이 소재에서 ${OMIT_NAME[role]}을 뺐어요 — 되돌리기 ⌘Z · 모든 소재는 왼쪽 패널에서`);
}   // 11-09 색 잠금 매체도 글자 고치기는 연다(색 적용만 charApply 에서 막는다)
// 편집 고도화·가이드 검수(10-14, app/editor.js) — 프리셋·직접 수정 손잡이·가이드 검수. 아래 함수들은 늦게 정의되는 것도 있어 화살표로 감싸 넘긴다
const ED = createEditor({
  state, SPECS, frames, logEvent,
  pushHistory: (...x) => pushHistory(...x), regen: (...x) => regen(...x), refreshFrames: (...x) => refreshFrames(...x), autosave: () => autosave(),
  renderInspector: () => renderInspector(), log: t => log(t), toast: t => toast(t), select: k => select(k), artLabel: a => artLabel(a), adEffCtx: a => adEffCtx(a),
  onGuide: a => gateBadge(a),   // 가이드 검수(틀 ✗) 결과가 승인 게이트에 바로 반영되게
});
const EL = createElementSelect({
  frames, keyOf: a => a.key ?? a.specId, specOf: a => SPECS[a.specId], zoom: () => state.zoom, partsOf: a => ED.partsOf(a),
  commit: (a, patch, label, coalesce) => elCommit(a, patch, label, coalesce),
  live: (a, x) => LIVE.push({ style: state.campaign.style, only: a.key ?? a.specId, ...x }),
  liveText: (a, id, k) => textScaleLive(a, id, k), commitTextScale: (a, id, k) => textScaleCommit(a, id, k),
  pick: (a, id) => select(a.key ?? a.specId, id), up: a => select(a.key ?? a.specId), locks: (a, id) => elLocks(a, id),
  aiOpen: (a, id, anchor) => ELAI.open(a, id, anchor), aiIcon: AI_ICON,
});
// 요소 AI 편집(11-10, app/elai.js · core/elementai.js · server/elementedit.js) — 재료(ctxOf)와 적용(applyElOps, 되돌리기 한 걸음)
// 11-10 hub 이식 1·2단계(app/artkv.js): 이미지 요소 패널 — 이 소재만 그림·로고(채움) · 외관 · 정렬 · 캔버스에 파일 끌어 놓기
const AK = createArtKv({
  state, SPECS, frames, EL, refOf, escH: v => escH(v), ic, iconBtn, numField, toast: (t, ms) => toast(t, ms),
  elCommit: (a, patch, label, coalesce) => elCommit(a, patch, label, coalesce), live: (a, x) => LIVE.push({ style: state.campaign.style, only: a.key ?? a.specId, ...x }),
  select: (k, el) => select(k, el), partsOf: a => ED.partsOf(a),
  prepKv: d => prepKv(d), analyzeKeyVisual: d => analyzeKeyVisual(d), rolesFromAssets: o => rolesFromAssets(o), paletteOf: roles => normalizeStyle({ colors: roles, mode: state.campaign.style.mode }).palette,
  prepLogo: d => prepLogo(d), logoToneOf: d => logoToneOf(d), logoMetaOfUrl: d => logoMetaOfUrl(d),
  campaignKvFile: f => { select(null); const inp = $('iKvFile'); if (!inp) { toast('오른쪽 패널에서 키비주얼을 바꿔 주세요'); return; } const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; inp.dispatchEvent(new Event('change')); },   // hub 이식: 빈 곳에 놓기 = 선택 없음 「키비주얼 바꾸기」와 같은 길
});
AK.bindDrop($('viewport'));   // 11-10 hub 이식 1단계 — 캔버스에 그림 파일 끌어 놓기(프레임 위 = 그 소재만, 빈 곳 = 확인 후 모든 소재)
const ELAI = createElAi({ ctxOf: (a, id) => elAiCtx(a, id), apply: (a, id, ops, label) => applyElOps(a, id, ops, label), undo: () => undo(), health: () => freeHealth(), toast: t => toast(t),
  // 11-10 저녁 그림 말로 고치기(/api/kv-edit) — 보낼 그림은 이 소재가 지금 쓰는 원본(손질 전), 결과는 이 소재만 새 그림
  imageOf: (a, id) => { const st = { ...state.campaign.style, ...(a.overrides?.style ?? {}) }; return id === 'logo' ? (st.logoOrig ?? st.logo ?? null) : (st.kvOrig ?? st.keyVisual ?? null); },
  applyImage: (a, id, dataUrl) => id === 'logo' ? AK.replaceLogo(a, 'logo', dataUrl) : AK.replaceKv(a, dataUrl) });
const cssHex = v => { const m = String(v ?? '').match(/[\d.]+/g); return m && m.length >= 3 ? '#' + m.slice(0, 3).map(x => Math.round(+x).toString(16).padStart(2, '0')).join('').toUpperCase() : null; };
function elAiCtx(a, id) {
  const it = EL.find(a, id); if (!it) return null;
  const spec = SPECS[a.specId], c = state.campaign, W = spec.w, H = spec.h;
  const sa = spec.rules?.safeArea ?? {}, n = v => (typeof v === 'number' ? v : 0);
  const others = EL.list(a).filter(o => o.id !== id).map(o => ({ id: o.id, box: o.box }));
  const base = { W, H, role: parseElementId(id).role, roleName: elementName(id), box: it.box, others, safe: { x: n(sa.left), y: n(sa.top), w: W - n(sa.left) - n(sa.right), h: H - n(sa.top) - n(sa.bottom) }, client: c.context.core.client ?? '', brand: c.style.palette ?? {} };
  if (it.kind !== 'text') return { ...base, locks: { size: false } };
  const win = it.el.ownerDocument.defaultView, cs = win.getComputedStyle(it.el), root = it.el.ownerDocument.querySelector('[data-ad]');
  const rcs = root ? win.getComputedStyle(root) : null;
  const bg = (rcs && cssHex(rcs.backgroundColor) && !/rgba\(.*,\s*0\)$/.test(rcs.backgroundColor) ? cssHex(rcs.backgroundColor) : null) ?? (/(#[0-9a-fA-F]{6})/.exec(rcs?.backgroundImage ?? '')?.[1]?.toUpperCase() ?? cssHex(/rgba?\([^)]*\)/.exec(rcs?.backgroundImage ?? '')?.[0])) ?? null;
  const fs = parseFloat(cs.fontSize) || 16;
  return { ...base, text: it.el.textContent, textLen: it.el.textContent.length, lines: it.el.innerText.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim(), runs: a.overrides.elements?.[id]?.runs ?? [],
    cur: { px: Math.round(fs * 10) / 10, w: +cs.fontWeight || 400, color: cssHex(cs.color), align: cs.textAlign, ls: cs.letterSpacing === 'normal' ? 0 : Math.round(parseFloat(cs.letterSpacing) / fs * 1000) / 10 },
    weights: fontWeightsOf(cs), minPx: spec.rules?.minFontPx ?? 10, bg,
    locks: { color: !!(elLocks(a, id).color || rangeColorLockOf(spec)), style: styleLockOf(spec), size: sizeLockedOf(spec) } };
}
// 연산(ops) → overrides(한 번에 커밋 = 되돌리기 한 걸음). 글자: 요소 값 먼저(그 속성의 범위 서식 걷기) → 범위. 그림·로고: 변형 층(patchBox)
function applyElOps(a, id, ops, label) {
  const it = EL.find(a, id); if (!it) return;
  if (it.kind !== 'text') {
    const b = ops.box ?? {}, e0 = a.overrides.elements?.[id] ?? {};
    const patch = { dx: (e0.dx ?? 0) + (b.dx ?? 0), dy: (e0.dy ?? 0) + (b.dy ?? 0), scale: (e0.scale ?? 1) * (b.scale ?? 1), ox: e0.ox ?? 0.5, oy: e0.oy ?? 0.5 };
    elCommit(a, { elements: withElementEdit(a.overrides.elements, id, patch) }, label);
    return;
  }
  const { role } = parseElementId(id), styled = isStyleRole(id), text = it.el.textContent, ed = a.overrides.elements?.[id] ?? {}, el = ops.el ?? {};
  let runs = ops.clearRuns ? null : (ed.runs ?? null);
  const elPatch = {};
  if (el.weight) { elPatch.weight = el.weight; runs = stripRuns(runs, ['w'], text); }
  if (el.ls != null) { elPatch.ls = el.ls || null; runs = stripRuns(runs, ['ls'], text); }
  if (el.lh != null) elPatch.lh = el.lh;
  if (el.align) elPatch.align = el.align;
  let style = null;
  if (el.color) { runs = stripRuns(runs, ['c'], text); if (styled) style = { ...(a.overrides.style ?? {}), roleColors: { ...(a.overrides.style?.roleColors ?? {}), [role]: el.color } }; else elPatch.color = el.color; }
  if (el.scale) {
    if (styled) { const cur = a.overrides.style?.roleScale?.[role] ?? 1, v = Math.round(Math.min(1.6, Math.max(0.6, cur * el.scale)) * 100) / 100; style = { ...(style ?? a.overrides.style ?? {}), roleScale: { ...(a.overrides.style?.roleScale ?? {}), [role]: v } }; if (runs?.some(r => r.px)) runs = scaleRuns(runs, v / cur); }
    else elPatch.scale = (ed.scale ?? 1) * el.scale;
  }
  for (const r of ops.runs ?? []) runs = addRun(runs, r, text);
  elPatch.runs = runs ?? null;
  if (ops.text && !ops.runs?.length && !Object.keys(el).length && !ops.clearRuns) { charText(a, id, ops.text, it.el.innerText); return; }
  elCommit(a, { elements: withElementEdit(a.overrides.elements, id, elPatch), ...(style ? { style } : {}) }, label);
  if (ops.text) setTimeout(() => charText(a, id, ops.text, it.el.innerText), 0);   // 「한 줄로」 + 서식 — 문구 바꾸기는 캔버스 글자 고치기와 같은 길
}
// 「대화로 시안 뽑기」 창(11-05, app/freedesign.js) — 검수는 보드와 같은 길(measureArtifact → lintArtifact → approvalGate)
const FREE = createFreeDesign({
  state, SPECS, $, escH: s => escH(s), previewDoc: (h, f) => previewDoc(h, f), measureArtifact, lintArtifact, approvalGate, STATE_LABEL, adEffCtx: a => adEffCtx(a), apiCopy, rasterizeCanvas,
  toast: t => toast(t), log: t => log(t), useFree: (a, f) => useFree(a, f), artLabel: a => artLabel(a), renderArtifact, checkAdDoc,
  onFreeSuggest: a => { if (a && state.selected === (a.key ?? a.specId) && !$('inspector').contains(document.activeElement)) renderInspector(); },   // AI 제안 도착(11-06) — 그 산출물을 보고 있으면 인스펙터 다시 그려 「다른 시안 보기」·배지 갱신
});
const AID = createAiDesign({ state, SPECS, $, escH: s => escH(s), previewDoc: (h, f) => previewDoc(h, f), toast: t => toast(t), log: t => log(t), artLabel: a => artLabel(a), FREE, frames });
// 자유 시안을 소재의 안(variants kind 'free')으로 넣고 고른다 — 안 style 은 { free:{ id, tpl, texts, notes, logoTone } } 하나뿐이라 안 바꾸기(이전 안 키 지우기)와 같은 길을 탄다
function useFree(a, free) {
  const c = state.campaign;
  pushHistory(`${artLabel(a)} 자유 시안`);
  const prev = a.variants?.[currentVariantIndex(a)]?.style ?? {}; const st = { ...(a.overrides.style ?? {}) }; for (const key of Object.keys(prev)) delete st[key];
  const fv = { id: free.id, tpl: free.tpl, texts: free.texts ?? null, notes: free.notes ?? '', logoTone: free.logoTone ?? 'dark' };
  st.free = fv; a.overrides.style = st;
  a.variants ??= [];
  const n = a.variants.filter(v => v.kind === 'free').length + 1;
  a.variants.push({ id: a.variants.length, kind: 'free', label: `자유 ${n}`, html: free.tpl, notes: fv.notes, style: { free: fv }, hash: '' });
  a.variantSel = a.variants.length - 1; a.status = 'draft'; a.gateOverride = null;
  logEvent(c, 'free_selected', { specId: a.specId, id: fv.id });
  regen(c); autosave(); refreshFrames(a.key ?? a.specId); select(a.key ?? a.specId); renderInspector();
  log(`${a.specId} 자유 시안 ${n}`);
}
const RULER = createRuler({ top: $('rulerT'), left: $('rulerL'), view: () => state, range: () => { const f = state.selected && frames.get(state.selected); if (!f) return null; const b = f.frame.querySelector('.fbody'); return { x: f.frame.offsetLeft, y: f.frame.offsetTop, w: b.clientWidth, h: b.clientHeight }; } });
applyRulerPref();   // 11-10 hub 이식 — 「도구 › 룰러 끄기」 기억

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
  $('approveAll').style.display = view === 'work' ? '' : 'none';
  $('exportAll').style.display = view === 'work' ? '' : 'none';
  $('selectMode').style.display = view === 'work' ? '' : 'none'; if (view !== 'work') SEL.setOn(false);   // 선택하기는 작업 화면에서만 · 나가면 해제
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

// 11-09 성능(_out/perf-1109/report.md): ① 그림은 참조(blob:)로 그린다 — a.html 에 수 MB data URL 이 없다(바이트가 필요한 곳은 resolveRefs).
//   ② 안 후보(variantCandidates)는 여기서 계산하지 않는다 — 소재를 고를 때(renderInspector)·idle(scheduleVariants)·저장·일괄 전파·전체 안 내보내기 직전에(ensureVariants)
function regen(c = state.campaign) {
  generateArtifacts(c, { ref: refStyle, variants: false });
  const ex = excludedOf(c);
  if (ex.size) c.artifacts = c.artifacts.filter(a => !ex.has(a.key ?? a.specId));
  const face = customFontCss(c.style?.fonts?.heading);
  if (face) for (const a of c.artifacts) a.html = embedFont(a.html, face);
  if (c === state.campaign) scheduleVariants();
  return c;
}
// 안 후보 지연 계산 — 결과는 generateArtifacts 즉시 계산과 같다(test/assetref-1109.test.js)
function ensureVariants(a, c = state.campaign) { if (a?.variantsStale && c) computeVariants(c, a, { ref: refStyle }); return a; }
function ensureAllVariants(c = state.campaign) { for (const a of c?.artifacts ?? []) ensureVariants(a, c); }
let variantIdle = 0;
const idleCall = (fn, timeout = 1500) => typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout }) : setTimeout(() => fn({ timeRemaining: () => 8, didTimeout: true }), 30);
function scheduleVariants() {
  if (variantIdle) return;
  variantIdle = idleCall(function step(dl) {
    variantIdle = 0;
    const c = state.campaign; if (!c) return;
    // 화면에 보이는 소재부터
    const vis = new Set(visibleKeys());
    const todo = c.artifacts.filter(a => a.variantsStale).sort((x, y) => (vis.has(y.key ?? y.specId) ? 1 : 0) - (vis.has(x.key ?? x.specId) ? 1 : 0));
    for (const a of todo) {
      if (!(dl.didTimeout || dl.timeRemaining() > 3)) { variantIdle = idleCall(step); return; }
      ensureVariants(a, c);
      if (state.selected === (a.key ?? a.specId) && !$('inspector').contains(document.activeElement)) renderInspector();
    }
  });
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
  const elFonts = html.includes('data-el-font="') ? [...new Set([...html.matchAll(/data-el-font="([^"]+)"/g)].map(m => m[1]))] : [];   // 요소 하나에 고른 글꼴(11-02)
  const freeFonts = html.includes('data-free="1"') ? freeFontIds(html) : [];   // 자유 시안(11-05)이 쓴 허용 글꼴 — 틀이 font-family 로 적은 이름 그대로
  const face = [...new Set([fontId, ...elFonts, ...freeFonts])].filter(Boolean).map(id => isBundledFont(id) ? `<style>${localFaceCss(id)}</style>` : customFontCss(id) ? `<style>${customFontCss(id)}</style>` : '').join('');
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
async function exportFaceCss(fontId, force = false) {
  if (!fontId || !isBundledFont(fontId) || (fontId === DEFAULT_FONT && !force)) return '';
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
// 요소 하나에 고른 글꼴(11-02) — 산출물 글꼴과 다르니 바이트를 따로 싣는다
// 자유 시안(11-05)이 쓴 글꼴 — 고른 안·전체 안의 틀에서 이름을 읽어 바이트째
async function freeFaceCss(a) { const tpls = [a.overrides?.style?.free?.tpl, ...(a.variants ?? []).filter(v => v.kind === 'free').map(v => v.style?.free?.tpl)].filter(Boolean); let out = ''; for (const id of new Set(tpls.flatMap(freeFontIds))) out += customFontCss(id) || await exportFaceCss(id, true); return out; }
async function elementFaceCss(a) { let out = ''; for (const id of elementFontIds(a.overrides?.elements)) out += customFontCss(id) || await exportFaceCss(id, true); return out; }
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
// 시안 고르기 창(11-03 사용자 「작아서 안 보임, 모달로」). 그림은 보이는 칸부터 그린다(시안마다 키비주얼을 통째로 담아 무겁다)
function openTplPicker({ title, choices, nw, nh, current, docOf, onPick, returnTo }) {
  const wide = nw / nh > 1.5, cardW = Math.min(window.innerWidth - 80, wide ? 640 : 400), k = Math.min(cardW / nw, Math.min(520, window.innerHeight * 0.6) / nh);   // 11-09 「크게」: 카드 폭 가로형 640 · 그 밖 400(화면 안), 높이 상한 520
  const root = document.createElement('div'); root.id = 'tplPicker';
  root.innerHTML = `<div class="tp-panel" role="dialog" aria-modal="true" aria-labelledby="tpTitle"><div class="tp-head"><h3 id="tpTitle">${escH(title)}</h3><span class="tp-n">${choices.length}개</span><button class="btn" id="tpClose">닫기</button></div><div class="tp-grid" style="--tp-w:${Math.round(nw * k)}px"></div></div>`;
  const grid = root.querySelector('.tp-grid');
  const close = () => { io.disconnect(); root.remove(); document.removeEventListener('keydown', onKey, true); returnTo?.focus?.(); };
  const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { const f = e.target; f.srcdoc = docOf(choices[+f.dataset.i]); io.unobserve(f); } }, { root: grid, rootMargin: '300px' });
  choices.forEach((ch, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tp-card'; const on = (ch.style.tpl ?? ch.style.free?.id ?? null) != null && (ch.style.tpl ?? ch.style.free?.id) === current; if (on) { b.classList.add('on'); b.setAttribute('aria-current', 'true'); }
    const bx = document.createElement('span'); bx.className = 'tp-box'; bx.style.cssText = `width:${Math.round(nw * k)}px;height:${Math.round(nh * k)}px`;
    const f = document.createElement('iframe'); f.width = nw; f.height = nh; f.dataset.i = i; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.style.transform = `scale(${k})`;
    const lb = document.createElement('span'); lb.className = 'tp-lab'; lb.textContent = on ? `${ch.label} · 지금 안` : ch.label; if (ch.sub) { lb.title = ch.sub; const sb = document.createElement('small'); sb.style.cssText = 'display:block;color:var(--sub);font-size:11px'; sb.textContent = ch.sub; lb.append(sb); }   // 라벨은 네 축(11-06), 원래 시안 이름은 툴팁
    bx.append(f); b.append(bx, lb); b.onclick = () => { close(); onPick(ch); }; grid.append(b); io.observe(f);
  });
  const onKey = e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') { const fs = [...root.querySelectorAll('button')], a0 = fs[0], z = fs[fs.length - 1]; if (e.shiftKey && document.activeElement === a0) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a0.focus(); } }
  };
  document.addEventListener('keydown', onKey, true);
  root.onclick = e => { if (e.target === root) close(); };
  document.body.append(root); root.querySelector('#tpClose').onclick = close; root.querySelector('#tpClose').focus();
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
  box.innerHTML = '<div class="cap">예시 브리프 — 누르면 입력 칸에 들어갑니다</div>';
  for (const s of SAMPLES) {   // 한 줄에 하나, 전문 그대로(10-21). 맨 앞 낱말(고객사)은 알약으로
    const b = document.createElement('button'); b.type = 'button';
    const sp = s.indexOf(' '); const head = sp > 0 ? s.slice(0, sp) : '', body = sp > 0 ? s.slice(sp + 1) : s;
    b.innerHTML = `<b></b><span></span><svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
    b.querySelector('b').textContent = head; b.querySelector('span').textContent = body; b.title = s; b.setAttribute('aria-label', s);
    b.onclick = () => { $('briefText').value = s; $('briefText').focus(); };
    box.appendChild(b);
  }
  $('briefGo').onclick = () => {
    const t = $('briefText').value.trim();
    if (!t) { toast('기획 내용을 입력하세요'); return; }
    startIntake(t);
  };
  $('fileBtn').onclick = () => $('fileIn').click();
  // 10-21 사용자 「파일 첨부했을 때 거기서 해당 데이터 확인해서 추출하는 건 있어야 돼」 — 읽자마자 규칙 파서로 고객사·채용 구분·접수 기간·모집직무를 뽑아 뭘 찾았는지 알려 준다(시작하면 같은 값이 카드에 들어간다. 못 찾은 필수 값은 대화로 묻는다)
  //   txt·md 는 그대로, PDF 는 pdf.js(cdnjs) 글자 추출, 워드(docx)는 mammoth(cdnjs) 본문 추출 — 브라우저 안에서만, 서버 없음. PPT 는 아직
  const afterFileText = (name, raw) => {
    const txt = String(raw ?? '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 8000); $('briefText').value = txt;
    if (!txt) { toast(`${name} — 글자를 못 읽었어요(스캔 PDF 면 글자가 없어요)`); return; }
    const kind = detectKind(txt), f0 = kind === 'recruit' ? extractRecruit(txt) : {};
    const KEY = ['client', 'hiringType', 'startDate', 'deadline', 'role', 'season', 'subText', 'notice'];
    const got = KEY.filter(k => f0[k]);
    const L = { client: '고객사', hiringType: '채용 구분', startDate: '접수 시작', deadline: '마감', role: '모집직무', season: '연도', subText: '추가 문구', notice: '고지' };
    const rowsTxt = (f0.rows ?? []).map(r => `${r.label} ${String(r.value).slice(0, 12)}`);   // 11-10 추가 행(근무지·전형절차…)
    toast(kind === 'recruit' ? `${name} 읽음 — 찾은 것: ${got.length || rowsTxt.length ? [...got.map(k => `${L[k]} ${String(f0[k]).slice(0, 18)}`), ...rowsTxt].join(' · ') : '없음'}${['client', 'hiringType', 'deadline', 'role'].some(k => !f0[k]) ? ' · 빈 필수 값은 시작하면 물어봐요' : ''}` : `${name} 읽음`, 6000);
  };
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs', PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
  const MAMMOTH = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js';
  const loadScript = src => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = () => no(new Error('불러오기 실패 ' + src)); document.head.appendChild(el); });
  const pdfText = async buf => {
    const pdfjs = await import(/* @vite-ignore */ PDFJS); pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const doc = await pdfjs.getDocument({ data: buf }).promise; const parts = [];
    // 한글 PDF 는 글자마다 항목이 따로 온다(「GS 에 너 지」) — 앞 항목 끝과의 간격이 글자 크기의 1/4 보다 넓을 때만 띄어쓰기, 줄은 y 가 바뀔 때
    for (let i = 1; i <= Math.min(doc.numPages, 8); i++) { const pg = await doc.getPage(i); const tc = await pg.getTextContent(); let line = '', lastY = null, lastEnd = null;
      for (const it of tc.items) { if (!('str' in it)) continue; const x = it.transform?.[4] ?? 0, y = Math.round(it.transform?.[5] ?? 0), fs = Math.abs(it.transform?.[0] ?? 10) || 10;
        if (lastY != null && Math.abs(y - lastY) > 2) { parts.push(line.trim()); line = ''; lastEnd = null; }
        if (lastEnd != null && x - lastEnd > fs * 0.25 && !line.endsWith(' ')) line += ' ';
        line += it.str; if (it.hasEOL) { parts.push(line.trim()); line = ''; lastEnd = null; } else lastEnd = x + (it.width ?? 0); lastY = y; }
      parts.push(line.trim()); }
    return parts.filter(Boolean).join('\n');
  };
  const docxText = async buf => { await loadScript(MAMMOTH); const r = await window.mammoth.extractRawText({ arrayBuffer: buf }); return r.value; };
  $('fileIn').onchange = async () => {
    const f = $('fileIn').files[0]; if (!f) return;
    const ext = (f.name.match(/\.([a-z0-9]+)$/i) ?? [])[1]?.toLowerCase();
    try {
      if (ext === 'txt' || ext === 'md') afterFileText(f.name, await f.text());
      else if (ext === 'pdf') { toast(`${f.name} 읽는 중…`); afterFileText(f.name, await pdfText(await f.arrayBuffer())); }
      else if (ext === 'docx') { toast(`${f.name} 읽는 중…`); afterFileText(f.name, await docxText(await f.arrayBuffer())); }
      else toast('txt · md · PDF · 워드(docx)만 — PPT·한글은 서버 연동 후');
    } catch (e) { toast(`${f.name} 읽기 실패 — ${e.message}`); }
    $('fileIn').value = '';
  };
  $('searchIn').oninput = () => renderSidebar($('searchIn').value.trim());
}
// 10-21 사용자 「이거도 삭제해도 되잖아」 — 입력 칸의 「AI 해석 꺼짐 — 규칙 파서」 칩 제거. 키 상태는 AI 키 모달에서만 보인다
function refreshAiChip() { const el = $('aiChip'); if (el) el.textContent = LLM.hasKey() ? `AI 해석 켜짐 · ${LLM.maskKey()}` : 'AI 해석 꺼짐 — 규칙 파서'; }

/* ═══ 자산 검색 사이드바 ═══ */
// 내 캠페인 저장 — 11-02 사용자 「데이터 5개 이상 안되던데?」: localStorage 한 키(약 5MB)에서 IndexedDB 로(core/campstore.js · app/campdb.js).
// loadStore 는 가벼운 기록(큰 그림 자리엔 참조만)을 돌려준다 — 그림이 필요하면 campStore.hydrate.
const campStore = createCampStore({
  open: () => openCampBackend(STORE_LS),
  legacy: legacyStore(STORE_LS),
  channel: typeof BroadcastChannel === 'function' ? new BroadcastChannel('mbm-campaigns') : null,
  onChange: () => renderSidebar(side.query),
});
function loadStore() { return campStore.list(); }
window.__mbmCampStore = campStore;   // index.html 작업공간 메뉴가 목록을 읽는다
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
  return migrateFolders(raw, campStore.isReady() ? list.map(c => c.id) : null);   // 목록을 읽기 전엔 폴더 배정을 솎지 않는다
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
  if (logo && t?.src) return `<div class="thumb ltile ${t.tile === 'dark' ? 'dark' : 'light'}"><img src="${t.src}" alt="${escH(who)} 로고" width="40" height="40"></div>`;
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
  const need = list.filter(c => c.style?.logo && !c.logoThumb);   // 로고가 바뀌면 저장(saveCampaignToStore)이 옛 썸네일을 버린다
  if (!need.length) return;
  side.thumbJob = true;
  try {
    for (const c of need) {
      const full = await campStore.hydrate(c.id).catch(() => null); if (!full) continue;
      const t = await makeLogoThumb(full.rec).catch(() => null); if (!t) continue;
      const cur = campStore.get(c.id); if (!cur) continue;
      const rec = { ...cur, logoThumb: t };
      campStore.put(rec);   // 참조만 든 기록이라 그림은 다시 쓰지 않는다. 실패해도 다음 목록 때 다시 만든다
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
  d.querySelector('.copen').onclick = () => openSavedCampaign(c.id);
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
  if (!campStore.isReady()) { $('campEmpty').style.display = 'none'; return; }   // 아직 못 읽었는데 「없음」을 보이지 않는다 — 읽으면 다시 그린다
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
    // briefDone: 내용(회사·직무…)이 읽은 내용 카드에서 확정됐는가
    // specOff: 고른 매체의 추출 규격 중 이번에 만들지 않기로 끈 것 · specOn: 참고 규격(extract:false) 중 일부러 켠 것 · specRefs: 「참고 규격 포함」 토글(10-14 추출 47규격)
    briefDone: false, specOff: new Set(), specOn: new Set(), specRefs: false, pickerOpen: false,
    // 로고에서 뽑은 색 · 주색을 어느 자료가 맡는가(null=자동: 로고에 색이 있으면 로고)
    logoSuggests: [], colorLead: null,
    // 지면(배경) — 기본은 키비주얼에서 읽는다. 사람이 고정하는 것은 단색/그라데이션과 직접 고른 색뿐
    bgMode: 'auto', bgColor: null, bgGradient: null, kvVariants: null, kvUse: 'auto', kvTypeOverride: null, aiSlots: null, logoTone: null, logoLightManual: false, object: null, objectMeta: null, references: [],
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
  if (st === 'brief') { afterWhere(); return; }
  it.phase = PHASE_OF[st];
  renderSteps();
  const msg = (st === 'type' || st === 'where') ? stepPrompt(it, st) : res.say;
  bub('agent', msg);
  it.history.push({ role: 'agent', text: msg });
  if (st === 'draft') { buildAndGenerate(); return; }
  renderSlot({ focus: true });
}

/* ── 단계 ── 무엇을 → 어디에 → 읽은 내용(필수 칸 채우기) → (행사 인쇄물 세트) → 스타일 → 생성 */
const TRACK_CHOICE = { online: '광고 소재', offline: '오프라인 인쇄물', both: '광고 소재와 인쇄물 둘 다' };
const wantsAd = it => it.track === 'online' || it.track === 'both';
const wantsPrint = it => it.track === 'offline' || it.track === 'both';
const PRINT_RECRUIT = ['hyunsumak', 'xbanner', 'poster'];   // 채용 캠페인의 인쇄물 — 명찰·포토부스는 행사용
const needsSignage = it => it.kind !== 'recruit' && !it.signageDone && it.channels.some(c => OFFLINE_CH.includes(c));
function stepOf(it) {
  if (!it.track) return 'type';
  if (!it.targetDone) return 'where';
  if (!it.briefDone) return 'brief';
  if (needsSignage(it)) return 'signage';
  if (!it.styleDone) return 'style';
  return 'draft';
}
const PHASE_OF = { type: 'target', where: 'target', brief: 'target', signage: 'target', style: 'style', draft: 'draft' };
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
  const pf = { ...(patch.fields ?? {}) };
  if (pf.rows) { it.fields.rows = mergeRows(it.fields.rows, pf.rows); delete pf.rows; }   // 11-10 추가 행은 라벨별로 합친다(「근무지 판교로」가 다른 행을 지우지 않게)
  Object.assign(it.fields, pf);
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

// 단계에 맞는 카드만 노출한다 — 무엇을 → 어디에 → 읽은 내용(필수 칸) → 행사 인쇄물 세트 → 스타일. 자유 입력창은 없다(10-21) — 묻는 것은 전부 카드
function renderSlot(opts = {}) {
  const st = stepOf(state.intake);
  if (st === 'type') return slotType();
  if (st === 'where') return slotWhere();
  if (st === 'brief') return slotBrief();
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

// 차수 세트(10-21 사용자 「매체를 문장에 나열하는 대신 1차 세트 칩」): 하·1차 20(자소설·리멤버·비즈보드) / 중·2차 9 / 상·3차 10 / 로고·프로필·보조 12 — core/media/_extract.json stages
//   켜기 = 그 차수 규격의 매체를 고르고 그 규격만 켠다(새로 고른 매체의 다른 차수 규격은 끈다 — 비즈보드만 골랐는데 카카오 PC·프로필까지 켜지지 않게). 끄기 = 그 차수 규격을 끄고, 켜진 규격이 하나도 안 남은 매체는 해제
const stageGroups = (it, st) => { const pickable = pickableMedia(it.kind); return visibleGroups(it).filter(g => g.entry.extract && specStage(g.id) === st && pickable.includes(g.medium)); };
const stageOn = (it, st) => { const gs = stageGroups(it, st); return gs.length > 0 && gs.every(g => it.media.includes(g.medium) && !it.specOff.has(g.id)); };
const stageSpecCount = (it, st) => stageGroups(it, st).reduce((n, g) => n + 1 + (g.twins?.length ?? 0), 0);
function toggleStage(it, st) {
  const gs = stageGroups(it, st), media = [...new Set(gs.map(g => g.medium))];
  if (stageOn(it, st)) {
    for (const g of gs) it.specOff.add(g.id);
    for (const m of media) if (!visibleGroups(it).some(g => g.medium === m && g.entry.extract && !it.specOff.has(g.id))) it.media = it.media.filter(x => x !== m);
    return;
  }
  for (const m of media) if (!it.media.includes(m)) {   // 새로 고르는 매체: 이 차수 밖의 추출 규격은 끈 채로 시작
    it.media.push(m);
    for (const g of visibleGroups(it)) if (g.medium === m && g.entry.extract && specStage(g.id) !== st) it.specOff.add(g.id);
  }
  for (const g of gs) it.specOff.delete(g.id);
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
      <button type="button" class="lnk" id="mAll" aria-pressed="${allOn}">${allOn ? '전체 해제' : '전체 선택'}</button></div>
      <div class="pspec stages"><span>차수로 고르기</span>${[1, 2, 3, 4].map(st => { const gs = stageGroups(it, st); if (!gs.length) return ''; const on = stageOn(it, st);
        return `<button type="button" class="stg ${on ? 'on' : ''}" data-stage="${st}" aria-pressed="${on}" title="${gs.map(g => mediumName(g.medium)).filter((m, i, a) => a.indexOf(m) === i).join(' · ')}">${STAGE_NAMES[st] ?? st + '차'} <small>${stageSpecCount(it, st)}종</small></button>`; }).join('')}</div>`;
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
    const offN = all.filter(x => x.entry.extract && picked.includes(x.medium) && it.specOff.has(x.id)).reduce((n, g) => n + 1 + (g.twins?.length ?? 0), 0);
    const specToggle = picked.length ? `<div class="pspec"><span>${offN ? `고른 매체 중 <b>${offN}종은 꺼져</b> 있어요(차수 칩·규격 목록에서 끈 것) — 전체 선택을 누르면 다 켜져요.` : it.specRefs ? '추출 규격 + 참고 규격까지 보여요.' : '고른 매체의 추출 규격이 전부 만들어져요.'}</span>
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
    const turningOn = !it.media.includes(id);
    it.media = turningOn ? [...it.media, id] : it.media.filter(x => x !== id);
    if (turningOn) for (const g of visibleGroups(it)) if (g.medium === id && g.entry.extract) it.specOff.delete(g.id);   // 카드로 매체를 켜면 그 매체의 추출 규격은 전부(차수 칩이 꺼 둔 것도)
    re(`.mcard[data-m="${id}"]`);
  });
  box.querySelectorAll('.mcard[data-c]').forEach(b => b.onclick = () => {
    const c = b.dataset.c;
    it.channels = it.channels.includes(c) ? it.channels.filter(x => x !== c) : [...it.channels, c];
    re(`.mcard[data-c="${c}"]`);
  });
  $('sSpecs')?.addEventListener('click', () => { it.specOpen = !it.specOpen; re('#sSpecs'); });
  $('sRefs')?.addEventListener('click', () => { it.specRefs = !it.specRefs; if (it.specRefs) it.specOpen = true; re('#sRefs'); });
  box.querySelectorAll('button[data-stage]').forEach(b => b.addEventListener('click', () => { toggleStage(it, +b.dataset.stage); re(`button[data-stage="${b.dataset.stage}"]`); }));
  $('mAll')?.addEventListener('click', () => {
    const ids = pickableMedia(it.kind);
    const allOn = ids.length > 0 && ids.every(id => it.media.includes(id));
    it.media = allOn ? it.media.filter(id => !ids.includes(id)) : [...new Set([...it.media, ...ids])];
    if (!allOn) it.specOff.clear();   // 10-21 사용자 「전체 선택했는데 1단계 산출물만」: 차수 칩이 꺼 둔 다른 차수 규격(specOff)이 남아 있었다 — 전체 선택 = 모든 추출 규격 켬
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

// 어디에까지 고르면 — 브리프에서 읽은 내용을 칸으로 보여 준다(10-21 사용자 「입력창 지우고 읽은 내용 카드를 필수 4칸 입력 카드로」).
// 따로 확인 화면·자유 입력창·「말로 고치기」는 없다. 비었거나 다르게 읽힌 값은 이 카드에서 바로 고치고, 큰 글자에 쓸 값(ESSENTIAL)이 비면 「다음」이 막힌다.
function afterWhere() {
  const it = state.intake;
  it.phase = 'target'; renderSteps();
  const miss = (ESSENTIAL[it.kind] ?? []).filter(f => !it.fields[f]);
  say(miss.length
    ? `브리프에서 이렇게 읽었어요. ${miss.map(f => FIELD_LABEL[f]).join('·')}${josa(FIELD_LABEL[miss[miss.length - 1]], '은', '는')} 못 읽었으니 채워 주세요.`
    : '브리프에서 이렇게 읽었어요. 맞으면 다음, 다르면 칸에서 바로 고치세요.');
  slotBrief();
}
// 11-10 추가 행 편집기(읽은 내용 카드·왼쪽 패널 공통) — 사용자 「모집기간, 모집분야 이외에 … 행을 추가한다는 개념으로」.
//   한 행 = 라벨 | 값(예 근무지 | 판교, 전형절차 | 서류→면접). 위·아래로 순서 바꾸기, × 로 삭제, 「+ 행 추가」. onChange(rows, { now }) — now: 추가·삭제·순서처럼 바로 반영할 변경
function rowsEditor(host, rows0, onChange, { multi = true } = {}) {
  if (!host) return;
  let rows = (rows0 ?? []).map(r => ({ label: r.label ?? '', value: r.value ?? '' }));
  const draw = (focus = null) => {
    const n = rows.length;
    host.innerHTML = rows.map((r, i) => `<div class="lrow" data-ri="${i}" style="display:grid;grid-template-columns:minmax(4.5em,32%) 1fr auto;gap:4px;align-items:start;margin:0 0 4px">
      <input type="text" data-rl value="${escH(r.label)}" placeholder="라벨" aria-label="${i + 1}번째 행 라벨" autocomplete="off" style="min-width:0">
      ${multi ? `<textarea data-rv rows="${Math.min(3, Math.max(1, String(r.value).split('\n').length))}" placeholder="값" aria-label="${i + 1}번째 행 값" style="min-width:0">${escH(r.value)}</textarea>` : `<input type="text" data-rv value="${escH(r.value)}" placeholder="값" aria-label="${i + 1}번째 행 값" autocomplete="off" style="min-width:0">`}
      <span style="display:flex;gap:2px;align-items:center">
        <button type="button" class="lnk" data-rmv="-1" aria-label="${i + 1}번째 행 위로" title="위로"${i ? '' : ' disabled'}>↑</button>
        <button type="button" class="lnk" data-rmv="1" aria-label="${i + 1}번째 행 아래로" title="아래로"${i < n - 1 ? '' : ' disabled'}>↓</button>
        <button type="button" class="lnk" data-rdel aria-label="${i + 1}번째 행 삭제" title="삭제">×</button></span></div>`).join('')
      + `<button type="button" class="lnk" data-radd>+ 행 추가</button>`;
    host.querySelectorAll('.lrow').forEach(el => {
      const i = +el.dataset.ri;
      el.querySelector('[data-rl]').oninput = e => { rows[i].label = e.target.value; onChange(rows); };
      el.querySelector('[data-rv]').oninput = e => { rows[i].value = e.target.value; onChange(rows); };
      el.querySelectorAll('[data-rmv]').forEach(b => b.onclick = () => { const j = i + +b.dataset.rmv; if (j < 0 || j >= rows.length) return; [rows[i], rows[j]] = [rows[j], rows[i]]; draw({ i: j, sel: `[data-rmv="${b.dataset.rmv}"]` }); onChange(rows, { now: true }); });
      el.querySelector('[data-rdel]').onclick = () => { rows.splice(i, 1); draw({ i: Math.min(i, rows.length - 1), sel: '[data-rdel]' }); onChange(rows, { now: true }); };
    });
    host.querySelector('[data-radd]').onclick = () => { rows.push({ label: '', value: '' }); draw({ i: rows.length - 1, sel: '[data-rl]' }); onChange(rows, { now: true }); };
    if (focus) (host.querySelector(`[data-ri="${focus.i}"] ${focus.sel}`) ?? host.querySelector('[data-radd]'))?.focus();
  };
  draw();
}
// 읽은 내용 카드 — 필수 칸(채용: 고객사·채용 구분·모집 직무·지원 마감 / 행사: 행사명) + 접힌 선택 칸.
// 「다음」을 막는 건 ESSENTIAL(고객사)뿐 — 채용 구분·직무·마감은 비워 둘 수 있고 그 줄이 소재에서 빠진다(11-02). 날짜 칸은 떠날 때 YYYY-MM-DD 로 정리한다
const BRIEF_FIELDS = {
  recruit: { must: ['client', 'hiringType', 'role', 'deadline'], more: ['startDate', 'season', 'subText', 'notice'] },   // 11-10: 고용형태·근무지 칸 폐지 → 아래 「추가 행」(공고의 「라벨: 값」), 슬로건 → 추가 문구   // 마감 시각은 칸으로 안 받는다(10-21 사용자 「마감 시각까진 필요 없을 것 같음」) — 공고에 「17시」「23:59」가 있으면 파서가 읽어 날짜 뒤에 붙인다
  event: { must: ['name'], more: ['date', 'venue', 'audience', 'cta'] },
};
const BRIEF_HINT = {
  client: '예: 한진정보통신', hiringType: '예: 신입사원 공개채용 · 경력직 채용', role: '예: 클라우드 플랫폼 엔지니어', deadline: 'YYYY-MM-DD — 없으면 비워 두세요',
  startDate: 'YYYY-MM-DD', season: '예: 2026 하반기 — 서브 없는 매체의 타이틀 앞에만(타이틀에 연도가 있으면 안 붙임)', subText: '서브 자리 있는 매체에만 — 예: 슬로건. 비우면 안 나와요', notice: '예: 공고별 상이',
  name: '예: 2026 AX 세미나', date: 'YYYY-MM-DD', venue: '예: 코엑스 그랜드볼룸', audience: '예: 재직자', cta: '예: 사전등록',
};
const DATE_FIELDS = ['deadline', 'startDate', 'date'];
const WIDE_FIELDS = ['role', 'subText', 'notice', 'name', 'season'];
function slotBrief() {
  const it = state.intake, f = it.fields;
  const { must, more } = BRIEF_FIELDS[it.kind === 'recruit' ? 'recruit' : 'event'];
  const need = ESSENTIAL[it.kind] ?? [];
  const row = (id, req) => `<div class="f ${WIDE_FIELDS.includes(id) ? 'wide' : ''}"><label for="bf-${id}">${escH(FIELD_LABEL[id] ?? id)}${req ? ' <span class="req">*</span>' : ''}</label><input type="text" id="bf-${id}" data-f="${id}" class="${need.includes(id) && !f[id] ? 'miss' : ''}" value="${escH(f[id] ?? '')}" placeholder="${escH(BRIEF_HINT[id] ?? '')}" autocomplete="off"></div>`;
  const rec = it.kind === 'recruit';
  const got = more.filter(id => f[id]).length + (rec ? cleanRows(f.rows).length : 0);
  const box = slot(`<div class="card2 bcard"><h4>브리프에서 읽은 내용</h4>
    <div class="bf">${must.map(id => row(id, need.includes(id))).join('')}</div>
    <details class="bmore" ${got ? 'open' : ''}><summary>선택 항목${got ? ` · ${got}개 읽음` : ''}</summary><div class="bf">${more.map(id => row(id, false)).join('')}</div>${rec ? `<div class="f wide" style="margin-top:6px"><label>추가 행 <span style="font-weight:400;opacity:.7">— 모집직무 아래 상세 줄(라벨 | 값)</span></label><div data-brows></div></div>` : ''}</details>
    <div class="sfoot2"><span class="smsg" id="bMsg" role="status"></span><button type="button" class="btn" id="bBack">이전</button><button type="button" class="btn pri" id="bOk">다음</button></div></div>`);
  const missing = () => need.filter(id => !f[id]);
  const foot = () => {
    const miss = missing(), el = $('bMsg');
    const opt = must.filter(id => !need.includes(id) && !f[id]);   // 비어도 된다 — 그 줄이 소재에서 빠진다
    el.textContent = miss.length ? `${miss.map(id => FIELD_LABEL[id]).join('·')} 필요` : opt.length ? `${opt.map(id => FIELD_LABEL[id]).join('·')} 없이 진행 — 그 줄은 소재에서 빠져요` : '';
    el.className = `smsg${miss.length ? ' bad' : ''}`;
  };
  box.querySelectorAll('input[data-f]').forEach(inp => {
    const id = inp.dataset.f;
    inp.oninput = () => { const v = inp.value.trim(); if (v) f[id] = v; else delete f[id]; inp.classList.toggle('miss', need.includes(id) && !v); foot(); };
    if (DATE_FIELDS.includes(id)) inp.onblur = () => { const iso = normDate(inp.value.trim()); if (iso && iso !== inp.value) { inp.value = iso; f[id] = iso; } };
    inp.onkeydown = e => { if (e.key === 'Enter') { inp.blur(); $('bOk').click(); } };
  });
  if (rec) rowsEditor(box.querySelector('[data-brows]'), cleanRows(f.rows), rows => { const r = cleanRows(rows); if (r.length) f.rows = r; else delete f.rows; }, { multi: false });
  $('bBack').onclick = () => { it.targetDone = false; clearSlot(); it.phase = 'target'; renderSteps(); slotWhere(); };
  $('bOk').onclick = () => {
    const miss = missing();
    if (miss.length) { toast(`${miss.map(id => FIELD_LABEL[id]).join('·')}${josa(FIELD_LABEL[miss[miss.length - 1]], '을', '를')} 채워 주세요`); box.querySelector(`input[data-f="${miss[0]}"]`)?.focus(); return; }
    const said = readLine(it);
    bub('user', said); it.history.push({ role: 'user', text: said });
    it.briefDone = true;
    clearSlot();
    afterBrief();
  };
  foot();
  box.querySelector('input.miss')?.focus({ preventScroll: true });
}
// 읽은 내용 한 줄 — "한진정보통신 · 클라우드 엔지니어 · 정규직 · 서울 여의도 · 10.31(토) 마감"
function readLine(it) {
  const f = it.fields;
  const day = d => { const iso = normDate(d); if (!iso) return d; const t = new Date(iso + 'T00:00'); return `${t.getMonth() + 1}.${t.getDate()}(${'일월화수목금토'[t.getDay()]})`; };
  const parts = it.kind === 'recruit'
    ? [f.client, f.hiringType, f.role, ...cleanRows(f.rows).map(r => `${r.label} ${r.value}`), f.deadline && `${f.startDate ? day(f.startDate) + ' ~ ' : ''}${day(f.deadline)} 마감`]
    : [f.name, f.date && day(f.date), f.venue, f.audience];
  return parts.filter(Boolean).join(' · ');
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
    <select id="${id}" aria-describedby="${id}Help" class="fsel" style="margin-bottom:4px">${opt('auto', `자동 (지금: ${autoName})`)}${groups}</select>
    <div id="${id}Help" style="font-size:11.5px;color:var(--sub);margin-bottom:10px">자동 판정이 틀렸을 때만 고르세요 — 놓는 법·지면·글자 규칙이 그 유형으로 바뀝니다.</div>`;
}

// 지면(배경) 조절 — 밝게/어둡게를 고르지 않는다. 키비주얼에서 읽은 색을 보여 주고, 단색·그라데이션 고정과 직접 고르기만 둔다.
const FIELD_SRC = { 'manual-gradient': '직접 설정한 그라데이션', 'kv-edge': '키비주얼 가장자리 색', 'kv-colour': '키비주얼 대표색', brand: '브랜드 색', 'brand-tint': '브랜드 색 틴트 → 흰색', 'brand-dark-logo': '흰색 로고라 어두운 브랜드 색', 'brand-photo': '사진이라 브랜드 색 — 사진은 지면으로 녹임', 'photo-full': '사진 전체 + 글자 쪽 스크림', 'kv-full': '배경형 — 그림을 통째로 깔고 빈 자리에 글자', 'kv-texture': '질감 — 그라데이션을 통째로 깔고 글자만', manual: '직접 고른 색' };
// 그라데이션 편집 시작값 — 저장한 값, 없으면 지금 자동으로 잡힌 지면색(노션 N3 「1차는 AI 자동 추출 색상」, 그다음 사람이 고침). 자동이 단색이면 같은 색상의 두 끝
const editGradientOf = (st, f) => normGradient(st.background?.gradient) ?? gradientFrom(f.stops, f.angle || 180);
// 팔레트(주색·보조)를 바꾸면 저장해 둔 직접 그라데이션도 따라간다(11-09 담당자 「주색/보조 변경 후 보조색을 통한 변화 없음」· 그라데이션 전환 시 초기 KV 색으로 되돌아가던 문제):
//   정지점 중 「그때 자동으로 잡힌 지면색」과 같던 것만 새 자동 색으로 바꾸고, 손으로 따로 고른 정지점 색·위치·각도·종류는 그대로. 저장한 그라데이션이 없으면 null(자동 = 팔레트)
function gradientFollowingPalette(g0, oldStyle, newStyle) {
  const g = normGradient(g0); if (!g) return null;
  const auto = st => { try { return resolveField({ ...st, background: { ...(st.background ?? {}), mode: 'gradient', gradient: null } }, { facing: 'left' }).stops.map(c => c.toUpperCase()); } catch { return []; } };
  const was = auto(oldStyle), now = auto(newStyle);
  if (!now.length || was.join() === now.join()) return g;
  return { ...g, stops: g.stops.map(s => { const i = was.indexOf(s.color.toUpperCase()); return i < 0 ? s : { ...s, color: now[Math.min(i, now.length - 1)] }; }) };
}
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
  const grad = mode === 'gradient' && !full;
  const reset = grad ? (styleLike.background?.gradient ? iconBtn('swap', '자동 색으로 되돌리기', `id="${id}GradReset"`) : '')
    : (styleLike.background?.color ? iconBtn('swap', '키비주얼 색으로 되돌리기', `id="${id}Reset"`) : '');
  // 피그마 채움 행처럼: 머리(이름 · 되돌리기) → 칩 + 종류 세그먼트 → 색 행 또는 그라데이션 편집기
  return `<div class="fbg"><div class="flab"><span>배경${(full ? FIELD_SRC['photo-full'] : FIELD_SRC[f.source]) ? ` <em>· ${full ? FIELD_SRC['photo-full'] : FIELD_SRC[f.source]}</em>` : ''}</span>${reset}</div>
    ${kind === 'photo' ? `<div class="flab sub"><span>사진 쓰임</span></div>
      <div class="fseg" id="${id}Use" role="group" aria-label="사진 쓰임">${[['auto', '한쪽에 넣고 녹임'], ['full', '전체에 깔고 스크림']].map(([k, v]) => `<button type="button" data-u="${k}" class="${use === k ? 'on' : ''}" aria-pressed="${use === k}">${v}</button>`).join('')}</div>` : ''}
    <div class="fline"><span class="bgprev" style="background:${prev}" role="img" aria-label="배경 미리보기 ${f.stops.join(' → ')}"></span>
      <div class="fseg" id="${id}Seg" role="group" aria-label="배경 방식">${[['auto', '자동'], ['solid', '단색'], ['gradient', '그라데이션']].map(([k, v]) => `<button type="button" data-b="${k}" class="${mode === k ? 'on' : ''}" aria-pressed="${mode === k}">${v}</button>`).join('')}</div></div>
    ${cands.length ? `<div class="fchips"><span>${full ? '스크림 색' : '지면색'}</span>${cands.map((c, i) =>
      `<button type="button" class="sugg" data-fc="${c}" aria-label="${full ? '스크림' : '지면'} 색 ${c}"><i style="background:${c}"></i>${candLabel(c, i)}</button>`).join('')}</div>` : ''}
    ${grad ? gradientEditorHtml(editGradientOf(styleLike, f), id) : colorRowHtml({ id: `${id}Color`, value: f.stops[0], label: '배경 색' })}</div>`;
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
  const tail = slots && !it.object ? ` ${slots}은 배경 없는 오브젝트가 필요한 자리라 지금 그림으론 글자만 나가요 — 누끼(투명 PNG)를 키비주얼로 올리면 거기도 그려져요.` : '';
  say(how + tail);
}
// 값을 바꿔 카드를 다시 그려도 보던 자리를 잃지 않게(카드 안 스크롤 유지)
function reslotStyle() { const t = $('slot').querySelector('.card2')?.scrollTop ?? 0; slotStyle(); const c = $('slot').querySelector('.card2'); if (c) c.scrollTop = t; }
function slotStyle() { slotStyleBody(); wireFui($('slot')); }
function slotStyleBody() {
  const it = state.intake;
  const adStyle = { palette: { primary: it.colors[0] }, keyVisual: it.kv, kvMeta: applyKvTypeOverride(it.kvMeta, it.kvTypeOverride), kvTypeOverride: it.kvTypeOverride ?? null, kvUse: it.kvUse ?? 'auto', logo: it.logo ?? null, logoLight: it.logoLight ?? null, logoTone: it.logoTone ?? null, logoMeta: it.logoMeta ?? null, background: { mode: it.bgMode, color: it.bgColor } };
  const bgStyle = { ...adStyle, palette: { primary: it.colors[0], secondary: it.colors[1] }, colorsManual: !!it.colorsManual, background: { ...adStyle.background, gradient: it.bgGradient ?? null } };
  slot(`<div class="card2 scard"><h4>그래픽 가이드</h4>
    ${inputSpecHtml(it.kvCheck, it.logoCheck).replace('margin-top:8px', 'margin:-4px 0 10px')}
    <div class="styleRow">
      <div><div class="kvthumb" id="kvThumb" title="${escH(kvGuideText())} — 누끼·사진·일러스트 어느 것이든 한 칸에. 누끼(투명 PNG)면 오브젝트형 가이드, 배경 있는 그림이면 썸네일/풀이미지형으로 자동 판정합니다. 공고문·전 시안 같은 참고 이미지는 「레퍼런스(참고용)」 칸에" style="${it.kv ? `background-image:url(${it.kv})` : ''}">${it.kv ? '' : '키비주얼<br>(필수 · 누끼도 여기)'}</div>
        <input type="file" id="kvFile" accept="image/*" style="display:none"></div>
      ${[['wide', '가로형', '폭이 긴 규격(가로 띠·배너)에 쓸 그림 — 없으면 기본 키비주얼'], ['tall', '세로형', '세로로 긴 규격(세로 배너·스토리)에 쓸 그림 — 없으면 기본 키비주얼']].map(([k, n, t]) => { const v = it.kvVariants?.[k]; return it.kv ? `<div><div class="kvthumb logo" id="kvV-${k}" title="${t}" style="${v ? `background-image:url(${refOf(v.keyVisual)})` : ''}">${v ? '' : `${n}<br>(선택)`}</div><input type="file" id="kvV-${k}File" accept="image/*" style="display:none">${v ? `<button type="button" class="lnk" data-kvvdel="${k}" style="font-size:11px">${n} 빼기</button>` : ''}</div>` : ''; }).join('')}
      <div><div class="kvthumb logo" id="logoThumb" title="${escH(logoGuideText())}" style="${it.logo ? `background-image:url(${it.logo})` : ''}">${it.logo ? '' : '로고<br>(필수)'}</div>
        <input type="file" id="logoFile" accept="image/*" style="display:none"></div>
      <div><div class="kvthumb logo dark" id="logoLightThumb" title="어두운 지면(브랜드색 배경)에 올라갈 흰색 로고. 없으면 원색 로고를 반전해서 씁니다 — 컬러 로고는 뭉개집니다" style="${it.logoLight ? `background-image:url(${it.logoLight})` : ''}">${it.logoLight ? '' : '흰색 로고<br>(다크용)'}</div>
        <input type="file" id="logoLightFile" accept="image/*" style="display:none">${it.logo ? `<button class="btn" id="logoMakeWhite" style="width:100%;margin-top:4px;font-size:11px">흰색으로 만들기</button>` : ''}</div>
      <!-- 오브젝트 누끼 칸은 숨김(11-02 사용자: 키비주얼은 한 통로, 누끼인지 풀이미지인지는 알아서 판단). 데이터(it.object)·렌더 경로는 그대로 두고 입구만 닫는다 -->
      <div hidden><div class="kvthumb logo" id="objThumb" style="${it.object ? `background-image:url(${it.object})` : ''}"></div>
        <input type="file" id="objFile" accept="image/png,image/webp" style="display:none"></div>
      <div class="f" style="flex:1;min-width:210px">
        <label>브랜드 컬러 <span id="kvHint" style="color:var(--gen1)"></span></label>
        <div class="fstack">${[['c1', '주색'], ['c2', '보조'], ['c3', '포인트']].map(([k, n], i) => colorRowHtml({ id: k, value: it.colors[i], label: n, tail: n })).join('')}</div>
        <div id="suggests" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div>
        <div style="margin-top:10px">${bgControlHtml(bgStyle, 'bg')}</div>
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
  ['c1', 'c2', 'c3'].forEach((id, i) => { $(id).oninput = () => { it.colors[i] = $(id).value.toUpperCase(); it.colorsManual = true; }; $(id).onchange = () => { it.bgGradient = gradientFollowingPalette(it.bgGradient, bgStyle, { ...bgStyle, palette: { primary: it.colors[0], secondary: it.colors[1] }, colorsManual: true }); slotStyle(); }; });   // 고르고 나면 배경 미리보기도 따라간다(11-02) · 저장한 그라데이션도 팔레트를 따라간다(11-09)
  $('bgSeg')?.querySelectorAll('button').forEach(b => b.onclick = () => { it.bgMode = b.dataset.b; reslotStyle(); });
  if ($('bgColor')) $('bgColor').onchange = () => { it.bgColor = $('bgColor').value.toUpperCase(); slotStyle(); };
  if ($('bgReset')) $('bgReset').onclick = () => { it.bgColor = null; slotStyle(); };
  if ($('bgGrad')) bindGradientEditor($('bgGrad'), editGradientOf(bgStyle, resolveField(bgStyle, { facing: 'left' })), { id: 'bg', onChange: g => { it.bgGradient = g; reslotStyle(); }, onPreview: css => { const p = $('slot').querySelector('.bgprev'); if (p) p.style.background = css; } });
  if ($('bgGradReset')) $('bgGradReset').onclick = () => { it.bgGradient = null; reslotStyle(); };
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
  // 보여 줄 영역 지정(11-02): 썸네일 위에서 끌어 지정 — it.kvMeta.manual 에 저장(캠페인으로 넘어간다)
  if (it.kv && it.kvMeta) mountKvFocus($('kvThumb'), { kvMeta: applyKvTypeOverride(it.kvMeta, it.kvTypeOverride), onChange: m => { it.kvMeta = withManual(it.kvMeta, m); reslotStyle(); $('kvThumb')?.querySelector('.kvfocus')?.focus({ preventScroll: true }); } });
  for (const k of ['wide', 'tall']) if ($(`kvV-${k}`)) bindUpload($(`kvV-${k}`), $(`kvV-${k}File`), async d => { const kd = await prepKv(d); const { meta } = await analyzeKeyVisual(kd); it.kvVariants = { ...(it.kvVariants ?? {}), [k]: { keyVisual: kd, kvMeta: meta } }; reslotStyle(); toast(`${k === 'wide' ? '가로' : '세로'}로 긴 규격에 이 그림을 써요`); });
  document.querySelectorAll('#slot [data-kvvdel]').forEach(b => b.onclick = () => { const { [b.dataset.kvvdel]: _, ...rest } = it.kvVariants ?? {}; it.kvVariants = rest; reslotStyle(); });
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
      it.aiSlots = null;         // Claude 가 고른 추가 시안 방향도 새 그림이면 다시
      it.colorsManual = false;   // 새 키비주얼이 들어왔으면 색은 그 이미지 기준으로 다시 잡는다
      applyDerived(); slotStyle();
      kvDiagnosis(it, meta);
      claudeKvType(d, meta, (ov, r, same) => {   // 11-10 Claude 그림 종류 판단 — 규칙 판정 뒤, 같은 그림이 그대로이고 사람이 유형을 안 골랐을 때만 바꾼다
        if (it.kv !== d) return;   // 그 사이 그림이 바뀜
        if (!same && !it.kvTypeOverride) it.kvTypeOverride = ov;
        it.aiSlots = r.slots ?? null;
        slotStyle();
        // 판단이 생성 뒤에 왔으면(그림 올리자마자 만들기) 만든 캠페인에도 반영
        const c = state.campaign; if (c?.style?.keyVisual === d) applyClaudeJudge(c, { ov: same || c.style.kvTypeOverride ? null : ov, slots: r.slots, name: r.name });
        bub('agent', `Claude가 그림을 보고 「${r.name}」로 판단했어요 — ${r.reason}${same ? '' : ' 유형을 이쪽으로 바꿨어요(「키비주얼 유형」에서 자동으로 되돌릴 수 있어요).'}${r.slots ? ` 추가 시안 방향도 골랐어요 — ${slotsText(r.slots)}${r.slotsWhy ? ` (${r.slotsWhy})` : ''}` : ''}`);
      });
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
  if ($('logoMakeWhite')) $('logoMakeWhite').onclick = async () => { const w = await makeWhiteLogo(it.logo, it.logoMono).catch(() => null); if (!w) { toast(WHITE_LOGO_FAIL); return; } it.logoLight = w; it.logoLightManual = true; it.logoTone = it.logoTone === 'light' ? 'light' : 'both'; slotStyle(); };
  bindUpload($('logoLightThumb'), $('logoLightFile'), async d => { d = (await prepLogo(d)).dataUrl; it.logoLight = d; it.logoLightManual = true; it.logoTone = it.logoTone === 'light' || !it.logo ? 'light' : 'both'; slotStyle(); });
  // 레퍼런스 칸(10-28)은 11-10 사용자 결정으로 뺐다 — 렌더·AI 에 안 쓰여 혼란만. 저장된 값(style.references)은 그대로 둔다
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
// 원색 로고로 흰색 로고 만들기(11-03 사용자). 글자 속까지 지운 사본이 있으면 그것을 칠한다. 상자째 로고라 흰 사각형이 되면 null
async function makeWhiteLogo(dataUrl, monoUrl) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = monoUrl ?? dataUrl; });
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, cv.width, cv.height), w = whitenLogoRGBA(id.data);
  if (!w) return null;
  id.data.set(w); g.putImageData(id, 0, 0);
  return cv.toDataURL('image/png');
}
const WHITE_LOGO_FAIL = '로고에 투명 배경이 없어 흰색으로 만들 수 없습니다. 투명 PNG 를 올려 주세요';
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
const RECRUIT_EDIT_FIELDS = ['client', 'hiringType', 'role', 'startDate', 'deadline', 'season', 'notice', 'headline', 'subText', 'dateText'];   // 11-10: 고용형태·근무지·슬로건 칸 폐지(추가 행·추가 문구)   // 마감 시각 칸은 뺐다(10-21) — 파서가 읽은 값은 그대로 쓰인다   // 10-21: 필수(고객사·채용 구분·마감·직무) 먼저, 레퍼런스에 드문 고용 형태·근무지는 뒤
const FIELD_HINT = { startDate: 'YYYY-MM-DD (비우면 마감만 「~날짜」)', deadline: 'YYYY-MM-DD', season: '예: 2026 하반기 — 서브 없는 매체 타이틀 앞에만', notice: '예: * 채용 일정은 공고별 상이합니다.', subText: '예: 2026 하반기 · 자소서 없는 간편지원 — 비우면 안 나와요', hiringType: '예: 신입사원 공개채용', headline: '예: ○○그룹 2026 하반기 신입 채용 — 비우면 고객사·시즌·채용 구분으로 자동' };
function campaignFields(c) {
  return c.kind === 'recruit' ? RECRUIT_EDIT_FIELDS : ['name', 'date', 'venue', 'cta'];
}
// 11-09 사용자 「이거 5개 이상 쌓이게 하는 건?」: id 가 캠페인 이름이라 같은 브리프로 새로 만들면 예전 캠페인을 덮어썼다 — 이미 있으면 -2, -3 …
function uniqueCampaignId(base) {
  if (!campStore.get(base)) return base;
  let n = 2; while (campStore.get(`${base}-${n}`)) n++;
  return `${base}-${n}`;
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
    kvVariants: it.kvVariants ?? null,
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
    references: it.references ?? [],   // 참고용(10-28) — 렌더 안 씀
    mode: it.mode,
    background: { mode: it.bgMode ?? 'auto', color: it.bgColor ?? null, gradient: it.bgGradient ?? null },
    kvUse: it.kvUse ?? 'auto',
    kvTypeOverride: it.kvTypeOverride ?? null,
    aiSlots: it.aiSlots ?? null,
    colors: it.colors,
    fonts: { heading: it.font, body: it.font },
    mood: it.mood.split(',').map(s => s.trim()).filter(Boolean),
  });
  const signage = {};
  for (const [ch, list] of Object.entries(it.signage)) if (it.channels.includes(ch) && list.length) signage[ch] = list;
  state.campaign = {
    id: uniqueCampaignId(slug(campaignName(ctx))), context: ctx, style, channels: it.channels, signage,
    // 문장에서 고른 소재만 — 같은 파일을 쓰는 상품은 한 장으로 묶여 있다(adSpecGroups)
    kind: it.kind, track: it.track, media: it.media ?? [], adSpecIds: chosenAdGroups(it).map(g => g.id),
    roster: it.roster ?? [], artifacts: [], log: [],
    // 첫 생성은 권장 규격만. 나머지(Google Ads 선택 규격·포토월 등)는 켜 두면 20장이 깔린다 —
    // 아트보드의 "+ 산출물 추가"에서 필요할 때 꺼내 쓴다.
    excluded: optionalSpecIds(it.channels),
  };
  logEvent(state.campaign, 'campaign_created', {});
  registerAll();
  // 산출물 칸을 먼저 세우고 크기를 얹은 뒤 한 번만 그린다(11-09 성능 — 예전엔 그린 뒤 크기를 얹고 한 번 더 그렸다)
  ensureArtifacts(state.campaign);
  for (const a of state.campaign.artifacts) {
    // 인테이크에서 고른 규격은 채널 단위다. 한 채널에 성격이 다른 규격이 섞여 있으면
    // (포토부스 2:1 ↔ 포토월) 자기 프리셋을 가진 쪽은 채널 값을 물려받지 않는다.
    const sz = it.sizes[a.specId] ?? (SIZE_PRESETS[a.specId] ? null : it.sizes[a.channel]);
    if (sz?.wmm && sz?.hmm) a.size = { wmm: sz.wmm, hmm: sz.hmm };
  }
  regen();
  saveCampaignToStore();   // 생성 즉시 남긴다 — 여기서 이탈해도 잃지 않는다
  enterWork({ staged: true });
  autoKvAi(state.campaign);   // 11-10 Claude 연결 때 「AI 그림 판단」 자동(규칙 결과는 이미 깔림 — 오면 다시 그림)
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
    f.iframe.srcdoc = f.shown = previewDoc(a.html, artifactFontId(a));
    f.label.textContent = boardLabel(a);
    log(`생성: ${id}`);
    if (i === ids.length - 1) toast(`${ids.length}종 생성 완료`);
  }, 240 + i * 260));
}

function enterWork(opts = {}) {
  show('work');
  $('campPill').textContent = campaignName(state.campaign.context);
  $('logBody').innerHTML = ''; $('logCount').textContent = '';
  state.selected = null; state.elSel = null; EL.hide();
  document.getElementById('work').classList.toggle('noL', innerWidth <= 1200);   // 좁은 창(1200 이하, 11-10 결정)은 왼쪽 입력 패널 접고 시작 — 툴바 패널 버튼으로 연다
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
  frames.clear(); framePending.clear();   // 새 프레임은 지금 그림으로 싣는다 — 미뤄 둔 문서는 버린다
  const c = state.campaign;
  // 줄 구성: 매체 광고는 차수(하 → 중 → 상 → 로고·프로필·보조, 10-21 사용자 「난이도 하를 제일 위에」) × 매체마다 한 줄 → 온라인 채널 한 줄 → 오프라인 한 줄.
  //   한 매체가 두 차수에 걸치면(카카오 비즈보드 1차·PC 2차·프로필 4차, 네이버 DA 2차·네이티브 4차) 줄이 갈린다. 차수가 바뀌는 첫 줄 위에 차수 머리글
  const ads = c.artifacts.filter(a => (a.channel === 'ad' || a.channel === 'asset') && SPECS[a.specId]);
  const adRows = [];
  for (const st of [1, 2, 3, 4, 5]) for (const m of [...(c.media ?? [])].sort((x, y) => mediumRank(x) - mediumRank(y))) {
    const arts = ads.filter(a => SPECS[a.specId].medium === m && specStage(a.specId) === st).sort((a, b) => specRank(a.specId, m) - specRank(b.specId, m));
    if (arts.length) adRows.push({ name: mediumName(m), arts, stage: st });
  }
  const rows = [...adRows, { name: '온라인', arts: [...ONLINE, ...LEGACY].flatMap(ch => c.artifacts.filter(a => a.channel === ch)) }, { name: '오프라인', arts: OFFLINE.flatMap(ch => c.artifacts.filter(a => a.channel === ch)) }];   // 10-15 밤: 매체마다 섹션(머리글 + 구분선)
  // 첫 줄 y: 라벨이 프레임 위에 붙는다(이름 2줄 + 뱃지 줄 ≈ 56px). 60이면 첫 줄 라벨이 보드 위로 잘린다
  let y = 104, lastStage = null;
  for (const { name, arts: rowArts, stage } of rows) {
    if (!rowArts.length) continue;
    let x = 60, rowH = 0;
    if (stage && stage !== lastStage) {   // 차수 머리글(하 · 1차 적용 …) — 차수가 바뀌는 줄 위에
      if (lastStage != null) y += 36;
      const sh = document.createElement('div'); sh.className = 'stagehead'; sh.style.left = '60px'; sh.style.top = (y - 126) + 'px';
      sh.textContent = `${STAGE_NAMES[stage] ?? (stage === 5 ? '참고 규격' : `${stage}차`)} · ${countText(rows.filter(r => r.stage === stage).flatMap(r => r.arts))}`; board.appendChild(sh);
      lastStage = stage;
    }
    const head = document.createElement('div'); head.className = 'rowhead'; head.style.left = '60px'; head.style.top = (y - 92) + 'px'; head.textContent = `${name} · ${countText(rowArts)}`; head.onclick = () => SEL.toggleGroup(rowArts.map(a => a.key ?? a.specId)); board.appendChild(head);   // 선택 모드에서 매체 머리글 = 그 매체 전체 토글
    {
      for (const a of rowArts) {
        const ch = a.channel;
        const spec = effSpec(a);
        const [nw, nh] = naturalSize(spec);
        // 매체 규격은 1029×258부터 1440×976까지 제각각 — 한 줄에 놓이도록 폭·높이 상한으로 맞춘다
        const ds = ch === 'ad' ? Math.min(1, 460 / nw, 300 / nh) : (DISPLAY_SCALE[ch] ?? 1);
        const w = nw * ds, h = nh * ds;
        const frame = document.createElement('div');
        frame.className = 'frame'; frame.dataset.key = a.key ?? a.specId;   // 실측·자동화가 프레임을 찾는 열쇠
        frame.style.left = x + 'px'; frame.style.top = y + 'px';
        frame.innerHTML = `
          <div class="flabel"><span class="fname"${a.channel === 'ad' && twinTitle(a.specId) ? ` title="${escH(twinTitle(a.specId))}"` : ''}>${opts.blank ? '생성 중…' : boardLabel(a)}</span><span class="badge ${a.status}">${badgeText(a.status)}</span><span class="badge gate"></span><span class="badge lint" style="display:none"></span><span class="badge design" style="display:none"></span><span class="badge sample" style="display:none"></span><span class="badge guide" style="display:none"></span><span class="badge edited" style="display:none"></span><span class="badge fit" style="display:none" title=""></span></div>
          <div class="fbody" style="width:${w}px;height:${h}px">
            <iframe width="${nw}" height="${nh}" style="transform:scale(${ds})"></iframe>
            <div class="hit"></div>
          </div>`;
        const iframe = frame.querySelector('iframe'); let shownDoc = null;
        iframe.onload = () => designCheck(a);   // 그려질 때마다 디자인 검수(core/adcheck.js) — 글자-주인공 겹침·로고 가림·뚝 끊김·빈 여백
        if (opts.blank) iframe.style.visibility = 'hidden'; else iframe.srcdoc = shownDoc = previewDoc(a.html, artifactFontId(a));
        frame.querySelector('.hit').onclick = e => { e.stopPropagation(); if (SEL.on) { SEL.toggleKey(a.key ?? a.specId); return; } const k = a.key ?? a.specId; if (a.channel !== 'ad') { select(k); return; } if (state.selected !== k && !(e.metaKey || e.ctrlKey)) { select(k); return; } textRoleFocus = textRoleAt(a, e); select(k, EL.at(a, e)); };   // 한 번 = 프레임, 고른 프레임 안에서 한 번 더(또는 ⌘/Ctrl) = 그 자리 요소
        { const hit = frame.querySelector('.hit'); let hovT = 0; hit.onpointermove = e => { if (state.selected !== (a.key ?? a.specId) || SEL.on || a.channel !== 'ad' || hovT) return; hovT = requestAnimationFrame(() => { hovT = 0; EL.hover(a, e); }); }; hit.onpointerleave = () => EL.hover(a, null); hit.ondblclick = e => { const k = a.key ?? a.specId; if (a.channel === 'ad' && !SEL.on) { const id = EL.at(a, e); if (id && !/^(kv|logo)$/.test(id)) { if (state.selected !== k || state.elSel !== id) select(k, id); charEnter(a, { x: e.clientX, y: e.clientY }); return; } } zoomToFrame(k); };
          frame.addEventListener('dblclick', e => { if (!e.target.closest?.('.eov') || SEL.on || a.channel !== 'ad') return; const id = EL.at(a, e); if (id && !/^(kv|logo)$/.test(id)) { e.stopPropagation(); if (state.elSel !== id) select(a.key ?? a.specId, id); charEnter(a, { x: e.clientX, y: e.clientY }); } }); }   // 요소를 고른 뒤에는 선택 테두리 층(.eov)이 위에 있다 — 거기서도 글자 더블클릭   // 고른 프레임의 글자 더블클릭 = 글자 범위 색(11-09), 그 밖은 확대
        board.appendChild(frame);
        frames.set(a.key ?? a.specId, { frame, iframe, badge: frame.querySelector('.badge'), gate: frame.querySelector('.badge.gate'), lint: frame.querySelector('.badge.lint'), design: frame.querySelector('.badge.design'), sample: frame.querySelector('.badge.sample'), guide: frame.querySelector('.badge.guide'), edited: frame.querySelector('.badge.edited'), fit: frame.querySelector('.badge.fit'), label: frame.querySelector('.fname'), shown: shownDoc });   // shown: 지금 iframe 이 보여 주는 문서(refreshFrames 가 같으면 다시 안 싣는다)
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
  SEL.paint();   // 프레임을 새로 깔았으니 선택 테두리도 다시
  refreshGuideOverlays();   // 프레임을 새로 깔았으니 레이아웃 가이드도 다시(10-28)
}
const PURPOSE_SHORT = { main: '', way: '방향', agenda: '프로그램', reception: '등록데스크' };
// 규격 이름 — 배너가 5종에서 14종으로 늘었고 포토부스·포토월이 채널을 공유한다.
// 채널 이름만 쓰면 아트보드에 같은 라벨이 여러 장 깔려 무엇을 고쳤는지 알 수 없다.
function specSize(spec, size = null) {
  if (size?.wmm) return `${size.wmm}×${size.hmm}mm`;
  if (spec.unit === 'mm') return `${spec.wmm}×${spec.hmm}mm`;
  return spec.w && spec.h ? `${spec.w}×${spec.h}` : '';
}
// 쌍둥이(같은 크기·틀이라 한 장만 그리고 추출 때 두 파일로 나가는 규격 — 자소설 프리미엄/표준 공고 160×600 · 채팅리스트 로고 300×180).
//   그린 장 수와 나가는 파일 수가 다르다(10-22 사용자 「자소설 11·리멤버 8·비즈보드 1 = 20인데 캔버스는 18?」) — 머리글은 「9장 → 11종」, 카드 라벨에 「+ ○○ 같이 추출」
const sharedTwins = specId => ((sharedTwins.map ??= new Map(adSpecGroups().map(g => [g.id, g.twins]))).get(specId) ?? []).filter(id => !(state.campaign?.adSpecIds ?? []).includes(id));
const outCount = arts => arts.reduce((n, a) => n + 1 + (a.channel === 'ad' ? sharedTwins(a.specId).length : 0), 0);
function countText(arts) { const n = arts.length, o = outCount(arts); return o > n ? `${n}장 → ${o}종` : `${n}종`; }
// 같은 파일을 쓰는 다른 상품이 있으면 라벨에 밝힌다 — 한 장이 두 상품에 나간다는 걸 검수자가 알아야 한다
function twinNote(specId) {
  const shared = sharedTwins(specId);
  return shared.length ? ` · 상품 ${shared.length + 1}곳 공용` : '';
}
const twinShort = id => String(SPECS[id]?.title ?? id).replace(/^[^·]*·\s*/, '').replace(/\s*\(.*\)\s*$/, '');   // 「자소설닷컴 · PC스탠다드패키지 - PC채용공고배너」 → 「PC스탠다드패키지 - PC채용공고배너」
const twinTail = specId => { const n = sharedTwins(specId).length; return n ? ` · +${n} 같이 추출` : ''; };   // 160×600 같은 좁은 카드 위에서 라벨이 네 줄로 늘지 않게 짧게 — 어느 규격인지는 라벨 툴팁(twinTitle)
const twinTitle = specId => { const shared = sharedTwins(specId); return shared.length ? `같은 파일로 같이 추출: ${shared.map(twinShort).join(' · ')}` : ''; };
// 보드 카드 라벨은 매체 · 사이즈만(10-15 밤 사용자 「좌측은 매체와 사이즈 정도만」) — 배지(DRAFT·차단·디자인·가이드)는 CSS 로 숨긴다
/* ═══ 레이아웃 가이드 오버레이(10-28 담당자 「프로그램 내 레이아웃 가이드」) ═══
   가이드가 명확한 매체(자소설·카카오·리멤버·에브리타임 …)의 틀(core/media.js spec.rules.safeArea.measuredFromTemplate.mold: 글자 칸·로고 칸·그림 칸)과
   safeArea 여백을 소재 위에 반투명 칸으로 그린다. 보기용 — 렌더·검사에는 영향 없음. 틀도 여백 수치도 없는 매체는 토글을 숨긴다 */
const GUIDE_ROLE = { sub: '서브', main: '메인', detail: '상세', date: '날짜', cta: 'CTA', extra: '부가' };
// 11-09 컨시어지 「문구별 가이드 영역으로 세분화」(자소설 PC채용공고 메인×2·상세×6 등 6유형, PC·M메인 메인 2줄이면 상세 1행 없음, M팝업 상세 위치, 달력 메인만):
//   틀의 최대 칸 대신 이 산출물이 실제로 쓴 줄 — 렌더 기록(data-trace textBox.rows: 역할·줄마다 x·y·w·h)을 역할별로 묶어 그린다. 기록이 없으면 틀 칸(예전 방식)
const traceOfHtml = html => { try { return JSON.parse(String(html ?? '').match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')); } catch { return null; } };
function usedTextBoxes(a, mold) {
  const tr = traceOfHtml(a?.html); const rows = tr?.textBox?.rows; if (!Array.isArray(rows) || !rows.length) return null;
  const out = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.role === r.role && Math.abs(r.y - (last.y + last.h)) < Math.max(4, r.h * 0.6)) { const x2 = Math.max(last.x + last.w, r.x + r.w); last.x = Math.min(last.x, r.x); last.w = x2 - last.x; last.h = r.y + r.h - last.y; last.n++; continue; }
    out.push({ role: r.role, x: r.x, y: r.y, w: r.w, h: r.h, n: 1 });
  }
  return out.map(b => { const px = tr.fonts?.[b.role]?.px ?? mold?.rows?.[b.role]?.px ?? null; const colW = mold?.rows?.[b.role]?.w ?? mold?.w ?? null;
    return { kind: 'text', label: `${GUIDE_ROLE[b.role] ?? b.role}${px ? ` ${Math.round(px)}px` : ''}${b.n > 1 ? ` ×${b.n}` : ''}`, x: b.x, y: b.y, w: Math.max(b.w, colW ?? 0), h: b.h }; });   // 폭은 틀 칸 폭(글자가 짧아도 칸 폭을 보여야 넘침을 가늠한다)
}
function guideBoxesOf(spec, a = null) {
  const sa = spec?.rules?.safeArea; if (!sa) return [];
  const mold = sa.measuredFromTemplate?.mold ?? null;
  const out = [];
  const used = a ? usedTextBoxes(a, mold) : null;
  if (used) out.push(...used);
  else if (mold?.rows) for (const [role, row] of Object.entries(mold.rows)) {
    if (!row || !Number.isFinite(row.y)) continue;
    const x = row.x ?? mold.x ?? 0, w = row.w ?? mold.w ?? spec.w - x;
    const h = (row.pitch ?? (row.px ? row.px * 1.25 : 24)) * (row.lines ?? 1);
    out.push({ kind: 'text', label: `${GUIDE_ROLE[role] ?? role}${row.px ? ` ${row.px}px` : ''}${(row.lines ?? 1) > 1 ? ` ×${row.lines}` : ''}`, x, y: row.y, w, h });
  }
  if (mold?.logo && Number.isFinite(mold.logo.x) && mold.logo.w > 0) out.push({ kind: 'logo', label: '로고 칸', x: mold.logo.x, y: mold.logo.y, w: mold.logo.w, h: mold.logo.h });
  if (mold?.image && Number.isFinite(mold.image.x) && mold.image.w > 0) out.push({ kind: 'image', label: '그림 칸', x: mold.image.x, y: mold.image.y, w: mold.image.w, h: mold.image.h });
  const ins = ['top', 'right', 'bottom', 'left'].map(k => Number.isFinite(sa[k]) ? sa[k] : null);
  if (ins.some(v => v != null) && spec.w && spec.h) { const [t, r, b, l] = ins.map(v => v ?? 0); out.push({ kind: 'safe', label: `안전 영역 ${[t, r, b, l].join('/')}`, x: l, y: t, w: spec.w - l - r, h: spec.h - t - b }); }
  return out;
}
const hasGuide = a => a?.channel === 'ad' && guideBoxesOf(SPECS[a.specId]).length > 0;
function loadGuideOv() { try { const v = JSON.parse(localStorage.getItem('mbm-guide-ov') || 'null'); if (v && typeof v === 'object') return { on: !!v.on, alpha: Math.min(1, Math.max(0.1, +v.alpha || 0.55)) }; } catch {} return { on: false, alpha: 0.55 }; }
state.guideOv = loadGuideOv();
function setGuideOv(patch) { state.guideOv = { ...state.guideOv, ...patch }; try { localStorage.setItem('mbm-guide-ov', JSON.stringify(state.guideOv)); } catch {} refreshGuideOverlays(); }
function guideOverlay(a) {
  const f = frames.get(a.key ?? a.specId); if (!f) return;
  const body = f.frame.querySelector('.fbody'); body.querySelector('.gov')?.remove();
  if (!state.guideOv.on || !hasGuide(a)) return;
  const spec = effSpec(a); const ds = body.clientWidth / spec.w;
  const el = document.createElement('div'); el.className = 'gov'; el.style.opacity = String(state.guideOv.alpha); el.setAttribute('aria-hidden', 'true');
  for (const b of guideBoxesOf(spec, a)) {
    const d = document.createElement('div'); d.className = `gb gb-${b.kind}`;
    d.style.cssText = `left:${b.x * ds}px;top:${b.y * ds}px;width:${Math.max(2, b.w * ds)}px;height:${Math.max(2, b.h * ds)}px`;
    d.innerHTML = `<i>${escH(b.label)}</i>`; el.appendChild(d);
  }
  body.appendChild(el);
}
function refreshGuideOverlays() { for (const a of state.campaign?.artifacts ?? []) if (a.channel === 'ad') guideOverlay(a); }
function guideOvHtml(a) {
  if (!hasGuide(a)) return '';
  const g = state.guideOv, spec = SPECS[a.specId], boxes = guideBoxesOf(spec);
  const kinds = [...new Set(boxes.map(b => b.kind))];
  const legend = { text: '글자 칸', logo: '로고 칸', image: '그림 칸', safe: '안전 영역' };
  return `<label>레이아웃 가이드 <span style="opacity:.55">${escH(spec.mediumName)} 틀 · 보기용</span></label>
    <div class="row" style="align-items:center;gap:8px">
      <label class="gswitch"><input type="checkbox" id="iGuideOv" ${g.on ? 'checked' : ''}> 가이드 켜기</label>
      <input type="range" id="iGuideAlpha" min="10" max="100" value="${Math.round(g.alpha * 100)}" aria-label="가이드 투명도" style="flex:1" ${g.on ? '' : 'disabled'}><span id="iGuideAlphaV" style="font-size:11px;color:var(--sub);width:34px;text-align:right">${Math.round(g.alpha * 100)}%</span>
    </div>
    <div class="glegend">${kinds.map(k => `<span class="gl gl-${k}">${legend[k]}</span>`).join('')}<span style="color:var(--sub)">전 소재에 같이 켜져요 · 내보내기에는 안 들어가요</span></div>`;
}
function bindGuideOv(insp) {
  const cb = insp.querySelector('#iGuideOv'), rg = insp.querySelector('#iGuideAlpha'), v = insp.querySelector('#iGuideAlphaV');
  if (cb) cb.onchange = () => { setGuideOv({ on: cb.checked }); if (rg) rg.disabled = !cb.checked; log(`레이아웃 가이드 ${cb.checked ? '켬' : '끔'}`); };
  if (rg) rg.oninput = () => { if (v) v.textContent = `${rg.value}%`; setGuideOv({ alpha: +rg.value / 100 }); };
}
function boardLabel(a) {
  const spec = SPECS[a.specId];
  if (spec && a.channel === 'asset') return `${spec.mediumName ?? mediumName(spec.medium)} · 전달물 ${spec.asset?.item ?? ''} 파일`;
  if (!spec || a.channel !== 'ad') return artLabel(a);
  const sz = specSize(spec, a.size) || `${spec.w}×${spec.h}`;
  return `${spec.mediumName ?? mediumName(spec.medium)} · ${sz}${twinTail(a.specId)}`;
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

/* 실시간 미리보기(11-02) — 끄는 동안(인스펙터 색·각도·정지점·영역)은 보이는 프레임의 문서에 달라진 곳만 입힌다(app/live.js).
   campaign 은 그대로라 되돌리기·저장·승인 게이트·측정 큐가 돌지 않고, 놓으면 restyleWith 가 정식으로 한 번(softly 로 깜빡임 없이) 다시 그린다.
   renderInspector 도 부르지 않는다 — 인스펙터 스크롤·포커스·끌던 손잡이가 그대로. */
function liveRender(a, style, ov, x = {}) {   // core/generate.js 의 html 줄과 같은 입력 — 안 후보(variantCandidates)만 뺀다(놓을 때 정식으로)
  const c = state.campaign;
  const o = { ...(a.overrides?.style ?? {}), ...(ov ?? {}) };
  let st = Object.keys(o).length ? resolveAiStyle({ ...c, style }, { ...style, ...o }, SPECS[a.specId]) : style;
  const layout = 'layout' in x ? x.layout : a.overrides?.layout, elements = 'elements' in x ? x.elements : a.overrides?.elements;
  if (layout && Object.keys(layout).length) st = { ...st, manualLayout: layout };
  const eff = { ...c.context, core: { ...c.context.core, ...(a.overrides?.core ?? {}) } };
  const adLike = a.channel === 'ad' || a.channel === 'gwthumb';
  const html = applyElementEdits(renderArtifact(a.specId, adLike ? eff : asEventContext(eff), refStyle(st), { variant: a.variant ?? 0, purpose: a.purpose, arrow: a.arrow, size: a.size, roster: c.roster ?? null, dest: a.dest ?? null, program: a.program ?? c.program ?? null, topics: a.topics ?? c.topics ?? null }), elements, SPECS[a.specId]);
  const face = customFontCss(style?.fonts?.heading);
  return face ? embedFont(html, face) : html;
}
function visibleKeys() {   // 화면(뷰포트)에 걸친 프레임 키
  const vp = $('viewport')?.getBoundingClientRect(); if (!vp || !vp.width) return [];
  const out = [];
  for (const [k, f] of frames) { const r = f.frame.getBoundingClientRect(); if (!(r.right < vp.left || r.left > vp.right || r.bottom < vp.top || r.top > vp.bottom)) out.push(k); }
  return out;
}
function visibleFrames(only) {
  const vp = $('viewport')?.getBoundingClientRect(); if (!vp) return [];
  const out = [];
  for (const a of state.campaign?.artifacts ?? []) {
    const k = a.key ?? a.specId; if (only && k !== only) continue;
    const f = frames.get(k); if (!f) continue;
    const r = f.frame.getBoundingClientRect();
    if (r.right < vp.left || r.left > vp.right || r.bottom < vp.top || r.top > vp.bottom) continue;
    out.push({ key: k, apply: v => { if (v.only && v.only !== k) return; performance.mark('live-a'); f.shown = null; morphDoc(f.iframe.contentDocument, previewDoc(liveRender(a, v.style, v.ov, v), artifactFontId(a))); performance.measure('live-frame', 'live-a'); } });
  }
  return out;
}
const LIVE = createLiveScheduler({ list: () => visibleFrames(null), onTick: (ms, n) => { performance.measure('live-tick', { start: performance.now() - ms, end: performance.now(), detail: { n } }); } });
// 인스펙터 입력마다 — patch 를 입힌 스타일로 다시 그려 보여 준다(campaign 은 그대로)
function liveStyle(c, patch, opts = {}) {
  const style = opts.ov ? c.style : nextStyle(c, patch, opts);
  LIVE.push({ style, only: opts.only ?? null, ov: opts.ov ?? null });
  if (!opts.ov && !opts.keepPrev) { const p = $('inspector')?.querySelector('.bgprev'); if (p) try { p.style.background = resolveField(style, { facing: 'left' }).css; } catch {} }
}
let softNext = false;   // 끌기를 놓을 때의 정식 재렌더 — srcdoc 대신 문서에 입혀 깜빡임을 없앤다
function softly(fn) { softNext = true; try { fn(); } finally { softNext = false; } }
function liveRevert() {   // 끌다 취소 — 저장된 그림으로
  LIVE.stop();
  for (const a of state.campaign?.artifacts ?? []) { const f = frames.get(a.key ?? a.specId); if (f && a.html) { const d = previewDoc(a.html, artifactFontId(a)); if (morphDoc(f.iframe.contentDocument, d)) f.shown = d; } }
}

// 11-09 성능: ① 그린 문서가 지금 보이는 것과 같으면(f.shown) srcdoc·규격 검사·디자인 검수를 건너뛴다 — 판정도 그대로(같은 그림)
//   고른 프레임은 늘 다시 싣는다(글자 고르기·직접 수정이 문서를 손댔을 수 있다). ② 화면 밖 프레임은 idle 에 싣는다(보이는 것부터)
const framePending = new Map();   // 키 → 실을 문서
let frameIdle = 0;
function loadFrame(a, f, doc, soft) {
  const ok = soft && morphDoc(f.iframe.contentDocument, doc);
  if (!ok) f.iframe.srcdoc = doc;
  else setTimeout(() => f.iframe.onload?.(), 0);   // srcdoc 가 아니라 load 가 안 온다 — 디자인·가이드 검수를 같은 길로(판정 무효화 뒤)
  f.shown = doc;
}
function flushPendingFrames() {
  if (frameIdle || !framePending.size) return;
  frameIdle = idleCall(function step(dl) {
    frameIdle = 0;
    const vis = new Set(visibleKeys());
    const keys = [...framePending.keys()].sort((x, y) => (vis.has(y) ? 1 : 0) - (vis.has(x) ? 1 : 0));
    for (const k of keys) {
      if (!(dl.didTimeout || dl.timeRemaining() > 4)) break;
      const doc = framePending.get(k); framePending.delete(k);
      const f = frames.get(k), a = state.campaign?.artifacts.find(x => (x.key ?? x.specId) === k);
      if (f && a && f.frame.isConnected) loadFrame(a, f, doc, false);
    }
    if (framePending.size) flushPendingFrames();
  }, 800);
}
function refreshFrames(only = null) {
  LIVE.stop();   // 정식 재렌더가 왔다 — 끄는 중 미리보기는 끝
  const vis = new Set(visibleKeys());
  for (const a of state.campaign.artifacts) {
    const k = a.key ?? a.specId;
    if (only && k !== only) continue;
    const f = frames.get(k);
    if (!f) continue;
    f.badge.className = 'badge ' + a.status;
    f.badge.textContent = badgeText(a.status);
    const doc = previewDoc(a.html, artifactFontId(a));
    if (doc === (framePending.get(k) ?? f.shown) && k !== state.selected && !softNext) { gateBadge(a); continue; }   // 같은 그림 — 다시 싣지도, 다시 재지도 않는다
    framePending.delete(k);
    if (vis.has(k) || k === state.selected || softNext) loadFrame(a, f, doc, softNext);
    else { framePending.set(k, doc); f.shown = null; }
    if (a.channel === 'ad') { a.lint = null; a.design = undefined; a.guide = null; a.fitNote = null; fitBadge(a); ED.guideBadge(a); }   // 다시 그렸으니 이전 판정(규격·디자인·가이드)은 무효 — 다시 잰다(design undefined = 검수 전 → 게이트 pending)
    if (a.channel === 'asset') a.lint = null;   // 전달물도 로고·이미지를 바꾸면 다시 잰다
    lintBadge(a);
  }
  flushPendingFrames();
  scheduleLint();
}

/* ═══ 규격 검사 (매체 광고) ═══
   그린 뒤 실제로 재서 판정한다(불변식 ⑥ — 위반은 조용히 넘기지 않는다). 측정은 래스터까지 하므로 비동기·순차. */
// 「용량 맞춤」 배지(10-28) — 용량 상한을 넘겨 품질 단계·재양자화·단색 배경으로 맞춘 소재. 내보내기도 같은 단계로 나간다
function fitBadge(a) {
  const f = frames.get(a.key ?? a.specId); if (!f?.fit) return;
  const on = a.channel === 'ad' && !!a.fitNote;
  f.fit.textContent = on ? '용량 맞춤' : ''; f.fit.title = on ? `용량 맞춤: ${a.fitNote} — 내보내기도 이 단계로` : ''; f.fit.style.display = on ? '' : 'none';
}
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
  leftLiveRefresh();   // 11-09 왼쪽 문구 칸의 자동값은 그려진 소재에서 읽는다 — 그려지면 다시 채운다
  if (state.selected === (a.key ?? a.specId) && state.elSel) { if (!(CS.on && CS.key === (a.key ?? a.specId))) EL.show(a, state.elSel); if (!$('inspector').contains(document.activeElement)) renderInspector(); }   // 다시 그려진 뒤 선택 테두리·패널 수치를 새 자리에
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
  // 틀 규격(자소설)은 가이드 검수 ✗ 도 차단 — Notion 컨시어지 2026-10-28 #9. 측정이 아직이면(가이드 큐는 비동기) ready 대신 pending, 측정 실패면 review — 11-02 재조사(가이드 측정 전에 「승인 가능」이 먼저 떴다)
  const needsGuide = a.channel === 'ad' && !!spec?.rules?.safeArea?.measuredFromTemplate?.mold && MOLD_BLOCK_MEDIA.has(spec?.medium);
  a.gate = approvalGate({ grade: spec?.grade ?? null, lint: a.lint ?? null, design: a.design ?? null, samples, guide: a.guide ?? null, needsGuide });
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
  const st = $('lStat'); if (st) st.textContent = campaignStat();
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
  if (LIVE.active) { scheduleLint(); return; }   // 끄는 동안은 측정하지 않는다 — 놓은 뒤 한 번
  const c = state.campaign; if (!c) return;
  const run = ++lintRun;
  // 11-09 성능: 화면에 보이는 소재부터, 한 장마다 idle 을 기다려 입력·팬 사이에 끼어들지 않게
  const vis = new Set(visibleKeys());
  const todo = c.artifacts.filter(a => (a.channel === 'ad' || a.channel === 'asset') && !a.lint).sort((x, y) => (vis.has(y.key ?? y.specId) ? 1 : 0) - (vis.has(x.key ?? x.specId) ? 1 : 0));
  for (const a of todo) {
    await new Promise(r => idleCall(r, 1000));
    if (run !== lintRun || state.campaign !== c) return;    // 그 사이 다시 그려졌으면 이 판정은 버린다
    if (a.lint) continue;
    const spec = SPECS[a.specId]; if (!spec?.rules) continue;
    if (a.channel === 'asset') {   // 전달물: 원본 파일의 가로·포맷만 본다(렌더 측정 없음)
      const isLogo = (spec.rules.asset ?? spec.asset)?.item === '로고';
      const src = isLogo ? (c.style.logoOrig ?? c.style.logo) : (c.style.kvOrig ?? c.style.keyVisual);
      const im = src ? await loadImage(src) : null; const px = im ? [im.naturalWidth, im.naturalHeight] : null;   // 실제 내보내는 원본을 직접 잰다(assetFileOf 와 같은 기준)
      if (run !== lintRun) return;
      const fmt = src ? (src.match(/^data:image\/(png|jpe?g|svg\+xml|webp|gif)/)?.[1] ?? null) : null;
      // 규정 폭의 절반 이상이면 내보낼 때 규정 폭으로 늘린다(assetFileOf) — 판정도 나가는 파일 기준, 흐려질 수 있다는 건 경고로. 그보다 작으면 차단(더 큰 원본 필요). 화면은 「늘려 씁니다」라는데 검수는 막던 것(11-02 전수)
      const assetMin = (spec.rules.asset ?? spec.asset)?.minW ?? 0, upscaled = !!(px && assetMin && px[0] < assetMin && px[0] >= assetMin * 0.5);
      a.lint = lintArtifact({ spec: { ...spec.rules, asset: spec.rules.asset ?? spec.asset, format: spec.format }, medium: spec.mediumRules, measure: { assetPx: upscaled ? [assetMin, px[1]] : (px ?? null), format: fmt === 'jpeg' ? 'jpg' : fmt === 'svg+xml' ? 'svg' : fmt } });
      if (upscaled) { a.lint.issues.push({ level: 'warn', code: 'asset-upscaled', msg: `원본 가로 ${px[0]}px → 규정 ${assetMin}px 로 늘려 내보내요. 더 선명하게 하려면 큰 원본을 올려 주세요` }); if (a.lint.level === 'pass') a.lint.level = 'warn'; }
      // 이미지 전달물의 알파(10-28 담당자 「배경 없는 오브젝트는 미승인」) — 앱 쪽 검사: 투명 몫이 크면 경고 + 내보낼 때 지면색 배경 합성(assetFileOf). 합성 포맷은 JPG 라 규정(PNG/JPG) 안
      if (!isLogo && im) { try { const r = alphaRatioOf(im); if (r != null && r > ASSET_ALPHA_MAX) { a.lint.issues.push({ level: 'warn', code: 'asset-alpha', msg: `배경 없는 이미지(투명 ${Math.round(r * 100)}%) — 매체는 배경 있는 이미지만 승인. 내보낼 때 캠페인 지면색으로 배경을 합성합니다` }); if (a.lint.level === 'pass') a.lint.level = 'warn'; } } catch {} }
      lintBadge(a);
      if (state.selected === (a.key ?? a.specId)) { const box = $('inspLint'); if (box) box.innerHTML = lintHtml(a); }
      continue;
    }
    try {
      const m = await measureArtifact(a.html, spec);
      const tcEff = textColorRegulated(spec) ? null : (a.overrides.style?.textColor ?? c.style.textColor ?? null);   // 직접 고른 글자색(11-02) — 지면 대비 검수(core/lint.js text-contrast)
      a.lint = lintArtifact({ spec: spec.rules, medium: spec.mediumRules, measure: tcEff ? { ...m, textColor: tcEff } : m, ctx: adEffCtx(a) });   // ctx: 고객사명 — 카카오 비즈보드 「메인에 광고주 노출 필수」 검사(core/lint.js main-client, 10-28)
      a.fitNote = null;
      // 용량 상한 초과(10-28 담당자 「사이트 내 용량 수정」): 내보내기와 같은 사다리(app/adfit.js)로 줄여 보고, 맞으면 그 판정으로 — 차단 대신 「용량 맞춤」 배지
      if (a.lint.issues.some(i => i.code === 'weight')) {
        const face = await exportFaceCss(artifactFontId(a));
        const fit = await renderFit(adEffCtx(a), adEffStyle(a), adSpecOf(a), h => embedFont(h, face, BUNDLED_MARK));
        if (run !== lintRun) return;
        if (fit.fitted && !fit.lint.issues.some(i => i.code === 'weight')) { a.lint = fit.lint; a.fitNote = `${fit.fitted.label} · ${(fit.fitted.bytes / 1024).toFixed(0)}KB (상한 ${spec.maxKB}KB)`; }
        else a.fitNote = null;
      }
      fitBadge(a);
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
  $('artboard').style.setProperty('--iz', String(1 / (state.zoom || 1)));   // 11-10 hub 2차: 소재 이름표는 화면 크기 고정(hub 프레임 이름)
  $('artboard').style.setProperty('--z', state.zoom);   // 선택 테두리·핸들을 화면 크기 그대로
  $('zoomPct').textContent = Math.round(state.zoom * 100) + '%';
  RULER?.draw();
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
  const z = Math.min((vp.width - 44) / (state.boardW || 1000), (vp.height - 60) / (state.boardH || 800), 1);   // 패널은 캔버스 밖이라 뺄 것이 눈금자·여백뿐
  state.zoom = Math.max(0.08, z);
  state.panX = 28; state.panY = 28 + 26 * state.zoom;   // 차수 머리글이 눈금자 밑으로 안 들어가게
  applyTransform();
}
$('zIn').onclick = () => setZoom(state.zoom * 1.25);
$('zOut').onclick = () => setZoom(state.zoom / 1.25);
$('zFit').onclick = fitZoom;
// 프레임 하나로 확대(두 번 누르기·Shift+2) — 전체 보기 25% 에선 글자 한 줄을 집기 어렵다
function zoomToFrame(k) {
  const f = frames.get(k); if (!f) return;
  const vp = $('viewport').getBoundingClientRect(), b = f.frame.querySelector('.fbody'), bw = b.clientWidth, bh = b.clientHeight;
  state.zoom = Math.min(8, Math.max(0.05, Math.min((vp.width - 120) / bw, (vp.height - 160) / bh)));
  state.panX = (vp.width - bw * state.zoom) / 2 - f.frame.offsetLeft * state.zoom;
  state.panY = (vp.height - bh * state.zoom) / 2 - f.frame.offsetTop * state.zoom;
  applyTransform();
}
// 패널 접기(피그마 ⌘\ 자리) — 캔버스를 넓게. 접어도 값은 그대로
// 11-10 hub 이식 5단계 — 하단 가운데 툴바 도구(hub 「이동 V · 손 H | 이미지 I | AI」). 프레임·사각형·글자 도구는 넣지 않는다(자유 도형 = 렌더러 밖 레이어)
const TOOL = { cur: 'move', space: false };
const typingIn = t => /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? '') || !!t?.isContentEditable;
function setTool(t) {
  if (t) TOOL.cur = t;
  $('viewport').classList.toggle('tool-hand', TOOL.cur === 'hand' || TOOL.space);
  $('tMove')?.setAttribute('aria-pressed', String(TOOL.cur === 'move')); $('tHand')?.setAttribute('aria-pressed', String(TOOL.cur === 'hand'));
}
function toolImage() {   // 고른 소재가 있으면 그 소재 그림(이 소재만), 없으면 모든 소재 키비주얼
  const a = state.selected ? state.campaign?.artifacts.find(x => (x.key ?? x.specId) === state.selected) : null;
  if (a?.channel === 'ad' && EL.find(a, 'kv')) { select(state.selected, 'kv'); $('iElKvFile')?.click(); return; }
  select(null); $('iKvFile')?.click();
}
$('tMove').onclick = () => setTool('move'); $('tHand').onclick = () => setTool('hand');
document.addEventListener('keydown', e => {
  if (!state.campaign || $('work').style.display === 'none' || $('overlay').style.display === 'flex' || typingIn(e.target) || CS.on || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'v') { setTool('move'); e.preventDefault(); } else if (k === 'h') { setTool('hand'); e.preventDefault(); } else if (k === 'i' && !e.shiftKey) { e.preventDefault(); toolImage(); }
});
// 11-10 hub 이식 6단계 — 캔버스 단축키: ⌘+ / ⌘− / ⌘0(100%) · ⇧1 전체 보기 · Space 누른 채 끌기(손) · ⌘E 내보내기. 입력 칸·글자 편집 중엔 안 먹는다
document.addEventListener('keydown', e => {
  if (!state.campaign || $('work').style.display === 'none' || $('overlay').style.display === 'flex' || typingIn(e.target) || CS.on) return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(state.zoom * 1.25); return; }
  if (mod && (e.key === '-' || e.key === '_')) { e.preventDefault(); setZoom(state.zoom / 1.25); return; }
  if (mod && e.key === '0') { e.preventDefault(); setZoom(1); return; }
  if (mod && !e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); exportAllModal(); return; }
  if (!mod && e.shiftKey && (e.key === '!' || e.code === 'Digit1')) { e.preventDefault(); fitZoom(); return; }
  if (e.code === 'Space' && !mod && !SEL.on && !e.repeat) { if (document.activeElement?.tagName === 'BUTTON') document.activeElement.blur(); e.preventDefault(); TOOL.space = true; setTool(); }
});
document.addEventListener('keyup', e => { if (e.code === 'Space' && TOOL.space) { TOOL.space = false; setTool(); } });
window.addEventListener('blur', () => { if (TOOL.space) { TOOL.space = false; setTool(); } });
for (const [id, cls] of [['lToggle', 'noL'], ['rToggle', 'noR']]) $(id).onclick = () => { const w = $('work'); w.classList.toggle(cls); $(id).setAttribute('aria-pressed', String(w.classList.contains(cls))); RULER?.draw(); };
document.addEventListener('keydown', e => {   // 11-09 Delete·Backspace: 고른 글자 요소를 이 소재에서 빼기(피그마처럼)
  if (!(e.key === 'Delete' || e.key === 'Backspace') || !state.campaign || !state.selected || !state.elSel || CS.on || SEL.on) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName ?? '') || e.target.isContentEditable || $('overlay').style.display === 'flex') return;
  const a = state.campaign.artifacts.find(x => (x.key ?? x.specId) === state.selected); if (!a || a.channel !== 'ad') return;
  e.preventDefault(); omitElement(a, state.elSel);
});
document.addEventListener('keydown', e => {   // Esc: 요소 → 소재 → 전체
  if (e.key === '@' && e.shiftKey && state.selected && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName ?? '') && $('work').style.display !== 'none') { zoomToFrame(state.selected); return; }
  if (e.key !== 'Escape' || !state.campaign || $('work').style.display === 'none' || $('overlay').style.display === 'flex') return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName ?? '') || SEL.on) return;
  if (state.elSel) select(state.selected); else if (state.selected) select(null);
});
{
  const vp = $('viewport');
  let panning = false, sx = 0, sy = 0;
  vp.addEventListener('pointerdown', e => {
    if (SEL.pointerDown(e)) return;   // 선택 모드: 빈 곳 드래그 = 선택 상자(Space 누르면 화면 이동)
    if (e.target.closest('.hit')) return;
    panning = true; sx = e.clientX - state.panX; sy = e.clientY - state.panY;
    vp.classList.add('panning'); vp.setPointerCapture(e.pointerId);
    if (!e.target.closest('.frame') && (state.selected != null || state.elSel != null)) select(null);   // 이미 해제면 인스펙터를 다시 그리지 않는다(11-09 성능 — 팬 시작마다 autoTrace 47장)
  });
  vp.addEventListener('pointermove', e => {
    if (SEL.pointerMove(e)) return;
    if (!panning) return;
    state.panX = e.clientX - sx; state.panY = e.clientY - sy;
    applyTransform();
  });
  vp.addEventListener('pointerup', () => { SEL.pointerUp(); panning = false; vp.classList.remove('panning'); });
  SEL.bind();
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
  // 그림(data URL — keyVisual·logo·logoLight·logoMono·kvOrig·object …)은 문자열이라 참조만 옮긴다(11-09: 예전엔 keyVisual·logo 만 빼고 kvOrig 수 MB 는 걸음마다 복제)
  const pics = {}, styleRest = {};
  for (const [k, v] of Object.entries(style)) (typeof v === 'string' && v.startsWith('data:') ? pics : styleRest)[k] = v;
  // 11-10 hub 이식: 이 소재만 바꾼 그림(overrides.style.keyVisual·kvOrig·logo …)도 참조만 — 소재마다 수 MB 를 걸음마다 복제하지 않게
  const isPic = v => typeof v === 'string' && v.startsWith('data:');
  const apics = artifacts.map(a => Object.entries(a.overrides?.style ?? {}).filter(([, v]) => isPic(v)));
  const out = structuredClone({
    ...rest,
    style: styleRest,
    artifacts: artifacts.map(({ html, ...a }, i) => apics[i].length ? { ...a, overrides: { ...a.overrides, style: Object.fromEntries(Object.entries(a.overrides.style).map(([k, v]) => [k, isPic(v) ? null : v])) } } : a),
  });
  out.artifacts.forEach((a, i) => { for (const [k, v] of apics[i]) a.overrides.style[k] = v; });
  out.style = Object.fromEntries(Object.keys(style).map(k => [k, k in pics ? pics[k] : out.style[k]]));   // 키 순서도 원본 그대로
  out.style.keyVisual ??= null; out.style.logo ??= null;
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
    <dt><kbd>클릭</kbd></dt><dd>소재 = 이 소재만<br>고른 소재 안 = 이 요소만<br>빈 곳 = 전체 일괄</dd>
    <dt><kbd>두 번</kbd></dt><dd>그 소재로 확대(Shift+2)</dd>
    <dt><kbd>Esc</kbd></dt><dd>요소 → 소재 → 전체</dd>
    <dt><kbd>화살표</kbd></dt><dd>고른 요소 1px · Shift 10px</dd>
    <dt><kbd>V</kbd> <kbd>H</kbd></dt><dd>이동 · 손 도구(Space 누른 채 끌기 = 손)</dd>
    <dt><kbd>I</kbd></dt><dd>그림 바꾸기 — 고른 소재만 / 없으면 모든 소재</dd>
    <dt><kbd>⌘+</kbd> <kbd>⌘−</kbd> <kbd>⌘0</kbd></dt><dd>확대 · 축소 · 100%</dd>
    <dt><kbd>⇧1</kbd> <kbd>⇧2</kbd></dt><dd>전체 보기 · 고른 소재로</dd>
    <dt><kbd>⌥</kbd></dt><dd>요소를 고른 채 누르고 다른 요소에 올리면 간격</dd>
    <dt><kbd>⌘E</kbd></dt><dd>내보내기</dd>
  </dl>
`;
$('helpBtn').onclick = e => { e.stopPropagation(); toggleHelp(); };
// 팝오버는 가볍게 — 바깥을 건드리면 닫힌다(모달처럼 확인 버튼을 요구하지 않는다)
document.addEventListener('pointerdown', e => {
  if (!$('helpPop').classList.contains('open')) return;
  // closest? — 이벤트 타깃이 항상 Element라는 보장은 없다(문서·텍스트 노드로 오는 경우)
  if (e.target.closest?.('#helpPop') || e.target.closest?.('#helpBtn')) return;
  toggleHelp(false);
});

/* ═══ 선택 · 인스펙터 ═══ */
function select(specId, elId = null) {
  if (CS.on && CS.key !== specId) CS.exit();   // 다른 프레임을 고르면 글자 고르기 끝
  state.selected = specId; state.elSel = specId ? elId : null;
  textRoleFocus = state.elSel ? parseElementId(state.elSel).role : null;
  for (const [id, f] of frames) f.frame.classList.toggle('sel', id === specId);
  renderInspector();
  // 직접 수정 손잡이 — 매체 광고 하나를 골랐을 때만(10-14)
  const sa = specId ? state.campaign?.artifacts.find(x => (x.key ?? x.specId) === specId) : null;
  if (sa?.channel === 'ad') ED.showOverlay(sa); else { state.editFocus = null; ED.hideOverlay(); }
  EL.hover(sa ?? null, null);
  if (sa?.channel === 'ad' && state.elSel) { EL.show(sa, state.elSel); EL.focus(); } else EL.hide();
  RULER?.draw();
}

// 지금 산출물이 어느 레이아웃 안에 서 있나 — variantSel 인덱스가 아니라 overrides.style 과 안 style 의 일치로 판정(10-20).
//   일괄 전파 뒤 안 목록이 새 기준선으로 재계산되면 인덱스가 어긋나므로. 키가 가장 많이 맞는 안, 아무 것도 안 맞으면 0(기본안)
function currentVariantIndex(a) {
  const st = a?.overrides?.style ?? {}; let best = 0, bestN = 0;
  (a?.variants ?? []).forEach((v, i) => {
    const keys = Object.keys(v.style ?? {}); if (!keys.length) return;
    if (keys.every(k => JSON.stringify(st[k]) === JSON.stringify(v.style[k])) && keys.length > bestN) { best = i; bestN = keys.length; }
  });
  return best;
}
// 글자별 편집(N6 「개별 폰트 색상 및 사이즈」, 11-02 사용자 「해당 프레임 선택해서 컬러 바꿀 수 있게」): 캔버스에서 글자를 누르면 그 줄이 여기서 열린다. 색이 정해진 규격은 색 잠금, 글자 크기가 규정인 규격(자소설·비즈보드)은 크기 잠금
const TEXT_ROLES = [['main', '메인'], ['sub', '서브'], ['detail', '상세']];
let textRoleFocus = null;
/* ═══ 왼쪽 내용 패널(11-02 사용자 「좌측이 내용 관련」, hub/panel.js 입력 탭) — 브리프 칸 · 프롬프트. 프레임을 고르면 같은 칸이 「이 소재만」으로 바뀐다 ═══ */
function campaignStat(c = state.campaign) {
  const list = (c?.artifacts ?? []).filter(x => x.channel === 'ad' || x.channel === 'asset'), n = list.length || (c?.artifacts?.length ?? 0);
  const done = (list.length ? list : c?.artifacts ?? []).filter(x => x.status === 'approved').length;
  return `${done && done === n ? '승인 완료' : '초안'} · 검수 완료 ${done}/${n}`;
}
// 11-09 사용자 「일괄 수정은 왼쪽 패널, 개별은 캔버스에서」 · 「타이틀은 하나로 묶어 줘야」 · 「매칭이 잘 안 돼」:
//   왼쪽 브리프는 항상 전체 일괄. 칸을 캔버스 요소 이름(메인 문구·서브·날짜·상세)으로 묶고, 메인 문구는 「타이틀」 한 칸(= 공고 타이틀 headline, 비면 고객사+채용 구분).
//   캔버스에서 요소를 고르면 같은 묶음이 강조된다. 개별 수정은 캔버스 글자 편집(app/charsel.js → charText)
const LEFT_GROUPS = [   // text: 찍히는 문구 그대로 한 칸(비면 자동) · fields: 그 문구를 자동으로 만들 때 쓰는 재료(「기본 정보」에 접어 둔다)
  { role: 'main', name: '메인 문구', text: 'headline', auto: '고객사 + 채용 구분', hint: '고치면 모든 소재의 메인 문구가 이 글이에요. 줄바꿈도 그대로 반영돼요. 고객사·채용 구분은 서브로 내려가요.' },
  // 11-10 사용자 「서브 문구가 반영되는 곳이 별로 없어서 … 2025년을 쓰면 타이틀에도 쓸 때 중복」: 서브 = 추가 문구 한 덩어리(선택, 자동 없음). 연도는 기본 정보의 「연도·시즌」 — 서브 없는 매체의 타이틀 앞에만 한 번
  { role: 'sub', name: '추가 문구', text: 'subText', auto: null, hint: '서브 자리가 있는 매체(자소설·에브리타임 홈 카드 등)에만 나가요.', empty: '비우면 안 나와요(좁은 칸은 고객사가 서브로 갈 수 있어요). 서브 자리가 있는 매체에만 나가요.' },
  { role: 'date', name: '날짜', text: 'dateText', auto: '접수 시작 + 지원 마감' },
  // 11-10 「상세 쓴 건 어디에도 안 나와서 … 행을 추가한다는 개념으로, 모집분야 모집기간 같은 수준으로」: 상세 = 접수기간(날짜 칸) · 모집직무 · 추가 행(라벨 | 값). 고용형태·근무지 고정 칸 폐지
  { role: 'detail', name: '상세', rows: true, fields: ['notice'] },
];
const BASE_FIELDS = ['client', 'hiringType', 'season', 'startDate', 'deadline'];
const ROLE_GROUP = { main: 'main', advertiser: 'main', sub: 'sub', date: 'date', detail: 'detail', chip: 'detail', tags: 'detail', tag: 'detail' };
// 캠페인 전체 칸 하나 바꾸기(일괄) — 왼쪽 패널·되돌리기 공통
// 정보 일괄 변경(core/propagate.js 와 같은 판정 — 손으로 고친 칸과 겹치면 그 산출물은 건드리지 않고 확인 목록) — 그리기는 뒤의 regen 한 번만.
//   11-09 성능: 예전엔 propagate 가 공통 스타일로 47장을 그리고 regen 이 개별값까지 얹어 또 47장을 그렸다(이중 렌더)
function propagateCore(c, corePatch) {
  c.context = updateContext(c.context, { core: corePatch });
  const impacted = [], conflicts = [];
  for (const a of c.artifacts) {
    const overridden = Object.keys(a.overrides?.core ?? {});
    const clash = Object.keys(corePatch).filter(f => overridden.includes(f));
    if (clash.length) { for (const field of clash) conflicts.push({ specId: a.key ?? a.specId, field }); a.status = 'needsReview'; continue; }
    impacted.push(a.key ?? a.specId);
  }
  logEvent(c, 'propagation_run', { patch: corePatch, impacted: impacted.length, conflicts: conflicts.length });
  return { impacted, conflicts };
}
function commitBrief(c, f, v, note = () => {}) {
  if (Array.isArray(v) ? JSON.stringify(v) === JSON.stringify(cleanRows(c.context.core[f])) : v === (c.context.core[f] ?? '')) return false;   // 11-10 추가 행(rows)은 목록
  pushHistory(`${FIELD_LABEL[f]} 일괄 변경`);
  const { impacted, conflicts } = propagateCore(c, { [f]: v });
  regen(c);   // 개별값·요소 편집까지 얹어 한 번에
  refreshFrames();
  $('lName').textContent = campaignName(c.context);
  note(conflicts.length ? `${impacted.length}종 반영 · ${conflicts.length}종은 캔버스에서 따로 고친 값 유지` : `${impacted.length}종 모두 반영됨`);
  log(`${FIELD_LABEL[f]} → ${v} (${impacted.length}종 일괄${conflicts.length ? `, 충돌 ${conflicts.length}` : ''})`);
  autosave();
  return true;
}
// 지금 찍히는 문구(칸에 보여 줄 자동값) — 고른 소재, 없으면 그 요소가 있는 첫 매체 소재의 실제 렌더 글자(줄바꿈 그대로)
function liveText(c, role) {
  const list = c.artifacts.filter(x => x.channel === 'ad' && !Object.keys(x.overrides?.core ?? {}).length);   // 캔버스에서 따로 고친 소재는 빼고
  const cnt = new Map();
  for (const a of list) {
    try { const d = frames.get(a.key ?? a.specId)?.iframe?.contentDocument; const el = d?.querySelector(`[data-field="${role}"]:not([data-sample])`); const t = el ? el.innerText.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim() : ''; if (t) cnt.set(t, (cnt.get(t) ?? 0) + 1); } catch {}
  }
  // 가장 많은 소재가 쓰는 문구 — 같으면 긴 쪽(달력 「~7/2」 같은 줄임 대신 「6.20(금) - 7.2(수) 17시」)
  return [...cnt.entries()].sort((p, q) => q[1] - p[1] || q[0].replace(/\n/g, '').length - p[0].replace(/\n/g, '').length)[0]?.[0] ?? '';
}
const leftLiveRefresh = debounce(() => { const b = $('leftBody'); if (!b || b.contains(document.activeElement)) return; if ([...b.querySelectorAll('textarea[data-auto]')].some(t => t.dataset.auto !== undefined)) { b.dataset.sig = '-'; renderLeft(); } }, 400);
/* 11-10 오후 사용자 「좌측은 입력만 — 나머지 없애고 입력 패널만」: 레일(입력·에셋·파일·검수) 걷음. 에셋은 오른쪽 「선택 없음」, 검수는 오른쪽 검수 탭에 있다 */
function renderLeft() {
  const body = $('leftBody'), c = state.campaign; if (!body || !c) return;
  $('lName').textContent = campaignName(c.context); $('lStat').textContent = campaignStat(c);
  const focusGroup = state.elSel ? ROLE_GROUP[parseElementId(state.elSel).role] ?? null : null;
  const sig = `${focusGroup ?? ''}`;
  if (body.contains(document.activeElement) && body.dataset.sig === sig) return;   // 쓰는 중에는 칸을 다시 그리지 않는다
  body.dataset.sig = sig;
  const core = c.context.core;
  const MULTI = new Set(['role', 'notice']);   // 상세 값은 줄바꿈 가능(캔버스와 같게)
  const input = f => MULTI.has(f) && c.kind === 'recruit'
    ? `<label>${FIELD_LABEL[f]}</label><textarea data-f="${f}" rows="${Math.min(3, Math.max(1, String(core[f] ?? '').split('\n').length))}" placeholder="${escH(FIELD_HINT[f] ?? '')}">${escH(core[f] ?? '')}</textarea>`
    : `<label>${FIELD_LABEL[f]}</label><input type="text" data-f="${f}" value="${escH(core[f] ?? '')}" placeholder="${escH(FIELD_HINT[f] ?? '')}">`;
  const overN = c.artifacts.filter(x => Object.keys(x.overrides?.core ?? {}).length).length;
  const textBox = g => { const own = core[g.text] ?? ''; const shown = own || (g.auto ? liveText(c, g.role) : '');
    if (!g.auto) return `<label for="lt-${g.text}">${g.name}</label>
      <textarea id="lt-${g.text}" data-f="${g.text}" rows="${Math.min(4, Math.max(1, String(own).split('\n').length))}" placeholder="${escH(FIELD_HINT[g.text] ?? '')}">${escH(own)}</textarea>
      <div class="fnote">${own ? g.hint : g.empty}</div>`;   // 11-10 추가 문구: 자동 문구 없음 — 비우면 안 나온다
    return `<label>${g.role === 'main' ? '타이틀' : `${g.name} 문구`} ${own ? iconBtn('swap', `${g.name} 자동으로(${g.auto})`, `data-ltreset="${g.text}"`) : '<span class="lauto">자동</span>'}</label>
      <textarea data-f="${g.text}" data-auto="${escH(own ? '' : shown)}" rows="${Math.min(4, Math.max(2, shown.split('\n').length))}" aria-label="${g.name} 문구">${escH(shown)}</textarea>
      <div class="fnote">${own ? (g.hint ?? '직접 쓴 문구가 모든 소재에 나가요.') : `비워 두면 ${g.auto}(으)로 만들어요. 고치면 이 글이 모든 소재에 나가요.`}</div>`; };
  // 11-10 상세: 접수기간(위 날짜 칸) · 모집직무 · 추가 행. 추가 행은 모집직무와 같은 모양으로 상세 줄 자리가 있는 규격에만, 넘치면 뒤 행부터 빠지고 검수 경고
  // 11-10 저녁 사용자 「추가 행 설명이 필요하냐 — + 행 추가만, 근무지·고용형태 나오는 곳이 없지 않아?」: 긴 설명 대신 실제로 찍힌 소재 수 한 줄
  //   (전 80규격 실측: 첫 행 11 · 둘째 행 5 · 필수 고지 2 — 상세 줄 자리가 있는 규격에만, 넘치면 뒤 행부터 빠짐)
  const adsL = c.artifacts.filter(a => a.channel === 'ad' && a.html);
  const shownIn = v => { const t = escH(String(v ?? '').trim().split('\n')[0]); return t ? adsL.filter(a => a.html.includes(t)).length : 0; };
  const rowsNow = cleanRows(core.rows);
  const reach = n => n ? `${n}개` : '안 나감';
  const rowsNote = rowsNow.length ? `<div class="fnote">나가는 소재 — ${rowsNow.map(r => `${escH(r.label)} ${reach(shownIn(r.value))}`).join(' · ')} (전체 ${adsL.length}개)</div>` : '';
  const rowsBox = () => `${input('role')}<div data-lrows style="margin-top:8px"></div>${rowsNote}`;
  const briefHtml = c.kind === 'recruit'
    ? LEFT_GROUPS.map(g => { const off = omitList(core.omit).includes(g.role);
        return `<div class="lgrp${focusGroup === g.role ? ' on' : ''}${off ? ' off' : ''}" data-lgrp="${g.role}"><div class="lsec">${g.name}${g.role !== 'main' ? iconBtn(off ? 'eye-off' : 'eye', off ? `${g.name} 다시 넣기 — 모든 소재` : `${g.name} 모든 소재에서 빼기`, `data-lomit="${g.role}" aria-pressed="${off}"`) : ''}</div><div class="lgb">${off ? '<div class="fnote">모든 소재에서 뺐어요 — 눈을 누르면 다시 넣어요</div>' : `${g.text ? textBox(g) : ''}${g.rows ? rowsBox() : ''}${(g.fields ?? []).map(f => input(f) + (f === 'notice' && core.notice ? `<div class="fnote">${shownIn(core.notice) ? `나가는 소재 ${shownIn(core.notice)}개 (전체 ${adsL.length}개)` : `고른 매체에는 안 나가요 — 고지 자리가 있는 매체(알바몬 등)에만`}</div>` : '')).join('')}`}</div></div>`; }).join('')
      + `<details class="lgrp lbase"><summary class="lsec">기본 정보<span class="lsec-t">자동 문구·파일 이름</span>${ic('chev')}</summary><div class="lgb">${BASE_FIELDS.map(input).join('')}<div class="fnote">연도·시즌: 타이틀에 연도가 없을 때 서브 자리가 없는 매체(리멤버 등)의 타이틀 앞에만 한 번 붙어요.</div></div></details>`
    : campaignFields(c).map(input).join('');
  body.innerHTML = `<section class="lbrief"><div class="lsec lsec-top">브리프<button type="button" class="btn sm" id="lApply" title="쓰는 중인 칸까지 지금 모든 소재에 반영">글자에 반영</button></div>
    <div class="fnote lgb">여기서 고치면 모든 소재에 반영돼요 · 소재 하나만은 캔버스에서 글자 더블클릭${overN ? ` · 따로 고친 소재 ${overN}종` : ''}</div>
    <div id="lNote" class="fnote lgb" role="status"></div>
    ${briefHtml}
    </section>
    <section class="lgrp lprompt"><div class="lsec">프롬프트</div><div class="lgb">
    <textarea id="lPrompt" rows="4" aria-label="변경 지시" placeholder="예: 메인 문구를 더 짧게 · 날짜를 강조"></textarea>
    <button class="btn" id="lPromptGo" style="width:100%;margin-top:8px">적용</button>
    </div></section>`;
  const note = t => { const n = $('lNote'); if (n) n.textContent = t; };
  const commit = i => {
    const f = i.dataset.f, multi = i.tagName === 'TEXTAREA';
    const v = multi ? i.value.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() : i.value.trim();   // 문구 칸은 줄바꿈을 지킨다
    if (multi && i.dataset.auto && v === i.dataset.auto) return;   // 자동 문구를 그대로 두면 고정하지 않는다
    commitBrief(c, f, v, note);
  };
  body.querySelectorAll('[data-f]').forEach(i => { i.oninput = debounce(() => commit(i), 450); });
  const rowsHost = body.querySelector('[data-lrows]');
  if (rowsHost) rowsEditor(rowsHost, [...cleanRows(core.rows), ...(state.rowDraft?.cid === c.id ? state.rowDraft.rows : [])], (rows, { now } = {}) => {
    state.rowDraft = { cid: c.id, rows: rows.filter(r => !(String(r.label ?? '').trim() && String(r.value ?? '').trim())) };   // 라벨·값 둘 다 있어야 행 — 쓰는 중인 행은 화면에만 둔다
    (now ? commitRows : commitRowsLater)(cleanRows(rows));
  });
  const commitRows = rows => { if (commitBrief(c, 'rows', rows, note)) body.dataset.sig = '-'; };
  const commitRowsLater = debounce(commitRows, 450);
  $('lApply').onclick = () => body.querySelectorAll('[data-f]').forEach(commit);
  body.querySelectorAll('[data-lomit]').forEach(b => b.addEventListener('click', () => { const r = b.dataset.lomit, cur0 = omitList(core.omit); const next = cur0.includes(r) ? cur0.filter(x => x !== r) : [...cur0, r]; if (commitBrief(c, 'omit', next.join(','), note)) { body.dataset.sig = '-'; renderLeft(); } }));
  body.querySelectorAll('[data-ltreset]').forEach(b => b.addEventListener('click', () => { if (commitBrief(c, b.dataset.ltreset, '', note)) { body.dataset.sig = '-'; setTimeout(renderLeft, 300); } }));
  if (focusGroup) body.querySelector(`[data-lgrp="${focusGroup}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  const pr = $('lPrompt'), go = () => { const t = pr.value.trim(); if (t) { pr.value = ''; onCommand(t); } };
  $('lPromptGo').onclick = go;
  pr.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); go(); } };
  wireFui(body);
}

/* ═══ 오른쪽 패널 범위(11-02 사용자 「개별과 일괄도 잘 정리」) — 전체 일괄 / 이 소재만 / 이 요소만. 지금 범위를 맨 위에 ═══ */
const OV_GROUP = { visual: ['kvPlace', 'kvSize', 'scrim'], bg: ['bgFill', 'bgGrad', 'background'], color: ['palette'], text: ['fonts', 'textTone', 'textColor', 'textAlign', 'textAnchor', 'roleColors', 'roleScale'], asset: ART_ASSET_KEYS };   // asset: 11-10 hub 이식 — 이 소재만 그림·로고
const OV_KEYS = Object.values(OV_GROUP).flat();
const ownStyleKeys = a => Object.keys(a?.overrides?.style ?? {}).filter(k => OV_KEYS.includes(k));
function ownCount(a) { return ownStyleKeys(a).length + Object.keys(a?.overrides?.layout ?? {}).length + Object.keys(a?.overrides?.elements ?? {}).length; }
// 이 묶음에 개별값이 있으면 표시 + 눌러서 일괄값으로
function ovBtn(a, group) {
  const n = OV_GROUP[group].filter(k => a.overrides?.style?.[k] != null).length; if (!n) return '';
  return `<button type="button" class="ovr" data-ovr="${group}" title="일괄값으로 되돌리기" aria-label="개별값 ${n}개 — 일괄값으로 되돌리기">개별 ${ic('swap')}</button>`;
}
function scopeHtml(a) {
  const elOn = !!(a && state.elSel && EL.find(a, state.elSel));
  const scope = !a ? 'all' : elOn ? 'el' : 'art';
  const own = a ? ownCount(a) : 0;
  const crumb = !a ? `${(state.campaign?.artifacts ?? []).length}종` : elOn ? `${escH(artLabel(a))} › ${escH(elementName(state.elSel))}` : escH(artLabel(a));
  return `<div class="scope">
    <div class="rtabs" role="tablist" aria-label="패널">${[['design', '디자인'], ['review', '검수']].map(([k, n]) => `<button type="button" role="tab" data-rtab="${k}" aria-selected="${(state.rightTab ?? 'design') === k}" class="${(state.rightTab ?? 'design') === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    <div class="fseg" id="iScope" role="group" aria-label="편집 범위">${[['all', '전체 일괄'], ['art', '이 소재만'], ['el', '이 요소만']].map(([k, n]) => `<button type="button" data-scope="${k}" class="${scope === k ? 'on' : ''}" aria-pressed="${scope === k}" ${(k === 'art' && !a) || (k === 'el' && !elOn) ? 'disabled' : ''}>${n}</button>`).join('')}</div>
    <div class="scope-crumb"><span>${crumb}</span>${a && own ? `<button type="button" class="ovr" data-ovrall="1" title="이 소재의 개별값을 모두 지우고 일괄값으로" aria-label="개별값 ${own}개 모두 일괄값으로 되돌리기">개별 ${own} ${ic('swap')}</button>` : ''}</div>
  </div>`;
}
function bindScope(insp, a, c) {
  insp.querySelectorAll('[data-rtab]').forEach(b => b.onclick = () => { state.rightTab = b.dataset.rtab; renderInspector(); insp.querySelector(`[data-rtab="${b.dataset.rtab}"]`)?.focus(); });
  insp.querySelectorAll('[data-scope]').forEach(b => b.onclick = () => { if (b.dataset.scope === 'all') select(null); else if (b.dataset.scope === 'art') select(state.selected); });
  if (!a) return;
  const resetKeys = (keys, label, also = {}) => {
    pushHistory(`${artLabel(a)} ${label}`);
    const st = { ...(a.overrides.style ?? {}) }; for (const k of keys) delete st[k]; a.overrides.style = st;
    if (also.layout) delete a.overrides.layout;
    if (also.elements) delete a.overrides.elements;
    a.status = 'draft'; a.gateOverride = null;
    logEvent(c, 'manual_edit', { specId: a.specId, style: 'reset' });
    state.elSel = null; regen(c); autosave(); softly(() => refreshFrames(a.key ?? a.specId)); EL.hide(); renderInspector();
  };
  insp.querySelectorAll('[data-ovr]').forEach(b => b.onclick = () => resetKeys(OV_GROUP[b.dataset.ovr], '일괄값으로'));
  insp.querySelector('[data-ovrall]')?.addEventListener('click', () => resetKeys(OV_KEYS, '개별값 전부 일괄값으로', { layout: true, elements: true }));
  insp.querySelectorAll('[data-elpick]').forEach(b => b.onclick = () => select(a.key ?? a.specId, b.dataset.elpick));
  insp.querySelectorAll('[data-goall]').forEach(b => b.onclick = () => { select(null); $('secVisual')?.scrollIntoView({ block: 'start' }); });
}
// 프레임 안 요소 목록(hub 레이어 패널) — 키보드로도 고를 수 있게. 개별값이 있으면 점
function layerListHtml(a) {
  const items = EL.list(a); if (!items.length) return '';
  const st = a.overrides.style ?? {}, ed = a.overrides.elements ?? {}, lay = a.overrides.layout ?? {};
  const own = it => !!(ed[it.id] || (it.kind === 'text' && (st.roleColors?.[it.id] || st.roleScale?.[it.id])) || (it.kind !== 'text' && lay[it.kind]));
  return `<section class="isec"><h3>요소</h3><div class="layers">${items.map(it => `<button type="button" class="layer" data-elpick="${escH(it.id)}"><i class="layer-k layer-${it.kind}" aria-hidden="true"></i><span>${escH(elementName(it.id))}</span>${own(it) ? '<em title="개별값 있음" aria-label="개별값 있음">●</em>' : ''}</button>`).join('')}</div></section>`;
}
const hexOfCss = v => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v ?? ''); return m ? '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase() : '#333333'; };
function elLocks(a, id) {
  const spec = SPECS[a.specId], { role } = parseElementId(id);
  if (role === 'kv' || role === 'logo') return {};
  return { color: textColorRegulated(spec), size: sizeLockedOf(spec), font: fontRuleOf(spec?.mediumRules, spec?.rules).fixed };
}
const isStyleRole = id => { const { role, n } = parseElementId(id); return !n && STYLE_ROLES.includes(role); };
// 요소 하나의 값 패널 — 위치 · 크기 · 글꼴 · 굵기 · 정렬 · 색
function elementPanelHtml(a, spec, id) {
  const it = EL.find(a, id), c = state.campaign, locks = elLocks(a, id), { role } = parseElementId(id);
  const box = it.box, r1 = v => Math.round(v * 10) / 10;
  const ed = a.overrides.elements?.[id] ?? {}, st = a.overrides.style ?? {};
  const own = !!(a.overrides.elements?.[id] || (isStyleRole(id) && (st.roleColors?.[role] || st.roleScale?.[role])) || a.overrides.layout?.[role]);
  const head = `<h3>${escH(elementName(id))} ${own ? `<button type="button" class="ovr" id="iElReset" title="일괄값으로 되돌리기" aria-label="${escH(elementName(id))} 일괄값으로 되돌리기">개별 ${ic('swap')}</button>` : ''}</h3>`;
  // 11-10 피그마 UI3 글자 패널: 글자 편집 중 끌어 고른 범위가 있으면 아래 「글자」·「칠」 칸이 그 범위의 값(섞이면 혼합)을 보이고 그 범위에 먹는다
  const pk = CS.on && CS.key === (a.key ?? a.specId) && CS.pick?.id === id ? CS.pick : null;
  const posRow = `<div class="fgrid2">${numField({ id: 'iElX', value: r1(box.x), label: 'X 위치', prefix: 'X' })}${numField({ id: 'iElY', value: r1(box.y), label: 'Y 위치', prefix: 'Y' })}</div>`;
  if (it.kind !== 'text') {   // 11-10 hub 이식: 이름 · 정렬 · 위치 · 크기(비율 고정) → 외관 → 채움(이 소재만 그림·로고) — app/artkv.js
    const P = ED.partsOf(a), why = !P?.[it.kind] ? P?.why?.[it.kind] : null;
    const sizeRow = `${numField({ id: 'iElW', value: r1(box.w), label: '너비', prefix: 'W' })}${numField({ id: 'iElH', value: r1(box.h), label: '높이', prefix: 'H' })}`;
    return AK.boxHtml(a, it, head, posRow, sizeRow, why ? '<div class="fnote">틀이 정한 칸 · 옮기면 검수에 걸릴 수 있어요</div>' : '')
      + (it.kind === 'kv' ? `<section class="isec"><h3>비주얼 ${ovBtn(a, 'visual')}</h3>${ED.presetArtifactHtml(a, ['kvPlace', 'kvSize', 'scrim'])}</section>` : '');
  }
  const cs = it.el.ownerDocument.defaultView.getComputedStyle(it.el);
  // 오토레이아웃(11-09 2b): 옮긴 글자 = 자유 위치(스택에서 빠짐). 다른 글자와 겹치면 경고 · 「자동 배치로 되돌리기」
  const freeSec = (ed.dx || ed.dy) ? (() => { const hit = EL.list(a).filter(o => o.kind === 'text' && o.id !== id && o.box.x < box.x + box.w && box.x < o.box.x + o.box.w && o.box.y < box.y + box.h && box.y < o.box.y + o.box.h); return `<div class="fnote" id="iElFree">자유 위치(옮김) — 다른 글자 줄 수가 바뀌어도 이 자리에 남아요${hit.length ? ` · <b style="color:var(--danger,#c00)">${escH(hit.map(o => elementName(o.id)).join('·'))}와 겹침</b>` : ''}</div><button type="button" class="btn" id="iElAuto" style="width:100%;margin-top:6px">자동 배치로 되돌리기</button>`; })() : '';
  return `<section class="isec">${head}
    ${posRow}${freeSec}
    <div class="fgrid2" style="margin-top:6px">${numField({ id: 'iElW', value: r1(box.w), label: '너비(글자에 맞춤)', prefix: 'W', attrs: 'disabled' })}${numField({ id: 'iElH', value: r1(box.h), label: '높이(글자에 맞춤)', prefix: 'H', attrs: 'disabled' })}</div>
    </section>
    ${typoSecHtml(a, spec, id, it, cs, ed, locks, pk)}`;
}
// 글자 패널 값 — 범위를 고르면 그 범위(pk.st), 아니면 요소 글자 전체를 잰 값(따로 서식 준 범위가 섞이면 혼합)
const MIX = '혼합';
const FONT_PX_PRESETS = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120];
const famOfCss = ff => String(ff ?? '').split(',')[0].replace(/['"]/g, '').trim();
// 그 글꼴이 가진 굵기만(묶은 글꼴 FONTS[].weights) — 모르는 글꼴(올린 글꼴·시스템)은 100~900
function fontWeightsOf(cs) { const fam = famOfCss(cs.fontFamily), f = Object.values(FONTS).find(x => x.family === fam); return f?.weights?.length ? f.weights : WEIGHTS; }
// 매체 규정으로 글꼴 스타일(굵기·자간)이 잠긴 규격 — 자소설 「폰트 스타일도 변경 불가」, 카카오·NAP 비즈보드 「기울기·왜곡·자간·장평 등 글꼴 스타일 변경 불가」
function styleLockOf(spec) { const note = String(spec?.mediumRules?.fonts?.note ?? ''); return /폰트 스타일도 변경 불가/.test(note) || (/글꼴 스타일 변경 불가/.test(note) && sizeLockedOf(spec)); }
// 범위 색 잠금 — 글자색 규정 + 「모든 문구 한 색」 매체(자소설)
const rangeColorLockOf = spec => textColorRegulated(spec) ? '이 매체는 글자색이 규정이라 글자 일부 색을 바꿀 수 없어요' : spec?.mediumRules?.textColors?.uniform ? '이 매체는 모든 문구를 한 색으로 통일하는 규정이라 글자 일부 색을 바꿀 수 없어요' : null;
function typoState(a, id, it, cs, ed, pk) {
  const st = pk ? pk.st : (() => { try { return rangeStyle(it.el, 0, it.el.textContent.length); } catch { return {}; } })();
  const fs = parseFloat(cs.fontSize) || 1;
  const lhPct = ed.lh ?? (cs.lineHeight === 'normal' ? null : Math.round(parseFloat(cs.lineHeight) / fs * 100));
  return { st, lhPct };
}
function typoSecHtml(a, spec, id, it, cs, ed, locks, pk) {
  const { st, lhPct } = typoState(a, id, it, cs, ed, pk), fontRule = fontRuleOf(spec?.mediumRules, spec?.rules), { role } = parseElementId(id);
  const styleLock = styleLockOf(spec), colorLock = pk ? rangeColorLockOf(spec) : (locks.color ? '이 매체는 글자색이 규정이라 바꿀 수 없어요' : null);
  const ws = fontWeightsOf(cs), wv = st.w ?? null;
  const wOpts = [...new Set([...ws, ...(wv != null && !ws.includes(wv) ? [wv] : [])])].sort((x, y) => x - y);
  const wSel = `<select id="iElWeight" aria-label="굵기" ${styleLock ? 'disabled' : ''}>${wv == null ? `<option value="" selected>${MIX}</option>` : ''}${wOpts.map(v => `<option value="${v}" ${v === wv ? 'selected' : ''}>${WEIGHT_NAME[v] ?? v}</option>`).join('')}</select>`;
  const sizeF = `<div class="fin pre ico"><span class="k" aria-hidden="true">${ic('fsize')}</span><input type="text" inputmode="decimal" class="fnum" id="iElSize" list="iElSizeList" value="${st.px ?? MIX}" aria-label="글자 크기(px)" ${locks.size ? 'disabled' : ''}></div><datalist id="iElSizeList">${FONT_PX_PRESETS.map(v => `<option value="${v}">`).join('')}</datalist>`;
  const lhF = numField({ id: 'iElLh', value: lhPct ?? 'Auto', label: '행간(글자 크기 대비 %) — 문구 전체', icon: 'lh', unit: '%' });
  const lsF = numField({ id: 'iElLs', value: st.ls ?? MIX, label: `자간(글자 크기 대비 %)${pk ? ' — 고른 글자' : ''}`, icon: 'ls', unit: '%', attrs: styleLock ? 'disabled' : '' });
  const al = ed.align ?? (['left', 'center', 'right'].includes(cs.textAlign) ? cs.textAlign : 'left');
  const alignSeg = `<div class="vseg" id="iElAlign" role="group" aria-label="가로 정렬">${[['left', 'ta-l', '왼쪽'], ['center', 'ta-c', '가운데'], ['right', 'ta-r', '오른쪽']].map(([k, icn, n]) => `<button type="button" data-ela="${k}" class="${al === k ? 'on' : ''}" aria-pressed="${al === k}" aria-label="${n} 정렬" title="${n} 정렬">${ic(icn)}</button>`).join('')}</div>`;
  // 세로 정렬: 글상자가 글자에 맞춤(피그마 Auto height)이라 위·가운데·아래가 같은 자리 — 모양만 두고 끈다
  const vNote = '글상자 높이가 글자에 맞춤(Auto height)이라 세로 정렬은 효과가 없어요';
  const vSeg = `<div class="vseg" role="group" aria-label="세로 정렬">${[['tv-t', '위'], ['tv-m', '가운데'], ['tv-b', '아래']].map(([icn, n], i) => `<button type="button" class="${i === 0 ? 'on' : ''}" disabled aria-label="세로 ${n} 정렬" title="${vNote}">${ic(icn)}</button>`).join('')}</div>`;
  const head = pk ? `<span class="mode">고른 글자 「${escH(pk.part.slice(0, 14))}${pk.part.length > 14 ? '…' : ''}」 ${pk.part.length}글자</span>` : '';
  // 칠(Fill): 색 칩 · 헥스 · 불투명도 % · 보이기 · 빼기
  const curColor = pk ? st.color : ((isStyleRole(id) ? a.overrides.style?.roleColors?.[role] : ed.color) ?? st.color);
  const op = pk ? (st.o ?? null) : (ed.hid ? 0 : ed.op ?? 100);
  const hidden = pk ? st.o === 0 : !!ed.hid;
  const hasOwn = pk ? (ed.runs ?? []).some(r => r.c && r.s < pk.e && r.e > pk.s) : !!((isStyleRole(id) ? a.overrides.style?.roleColors?.[role] : ed.color) || ed.op != null || ed.hid || (ed.runs ?? []).some(r => r.c));
  const fillRow = colorRowHtml({ id: 'iElColor', value: curColor ?? '#888888', label: pk ? '고른 글자 색' : `${elementName(id)} 색`, idle: !curColor, disabled: !!colorLock,
    tail: '', after: `${iconBtn(hidden ? 'eye-off' : 'eye', hidden ? '칠 보이기' : '칠 숨기기', `id="iElEye" aria-pressed="${hidden}" ${colorLock ? 'disabled' : ''}`)}${iconBtn('minus', pk ? '고른 글자 칠 지우기(문구 색으로)' : '따로 지정한 칠 지우기(자동 색으로)', `id="iElFillClear" ${hasOwn && !colorLock ? '' : 'disabled'}`)}` })
    .replace('</div><button', `<span class="fop"><input type="text" inputmode="decimal" class="fnum fopn" id="iElOp" value="${op ?? MIX}" aria-label="칠 불투명도(%)" ${colorLock ? 'disabled' : ''}><i aria-hidden="true">%</i></span></div><button`)
    .replace(/(class="fhex" value=")([^"]*)(")/, (m0, x, v, y) => curColor ? m0 : `${x}${y} placeholder="${MIX}"`);
  const notes = [styleLock ? '이 매체는 굵기·자간 같은 글꼴 스타일을 바꿀 수 없어요(규정)' : '', locks.size ? '글자 크기가 규정으로 정해진 규격' : '', colorLock ?? (spec.mediumRules?.textColors?.uniform ? '이 매체는 문구 전체가 한 색' : '')].filter(Boolean);
  const nr = (ed.runs ?? []).length, on = CS.on && CS.key === (a.key ?? a.specId);
  return `<section class="isec" id="iTypoSec"><h3>글자 ${head}</h3>
    ${locks.font ? `<div class="fnote" style="margin:0 0 6px">글꼴: 이 매체는 ${escH(fontRule.required)} 고정</div>` : `<select id="iElFont" aria-label="글꼴(문구 전체)"><option value="" ${ed.font ? '' : 'selected'}>공통 따름</option>${fontOptions(ed.font ?? '')}</select>`}
    <div class="fgrid2" style="margin-top:8px">${wSel}${sizeF}</div>
    <div class="fgrid2" style="margin-top:8px">${lhF}${lsF}</div>
    <div class="fgrid2" style="margin-top:8px">${alignSeg}${vSeg}</div>
    ${pk ? '<div class="fnote">굵기·크기·자간·칠은 고른 글자만 · 글꼴·행간·정렬은 문구 전체 · ⌘B 굵게 · Esc 끝내기</div>' : ''}
    </section>
    <section class="isec" id="iFillSec"><h3>칠 ${pk ? '<span class="mode">고른 글자</span>' : ''}</h3>
    <div class="fstack">${fillRow}</div>
    ${notes.length ? `<div class="fnote">${notes.join(' · ')}</div>` : ''}
    <button type="button" class="btn" id="iElRuns" style="width:100%;margin-top:8px">${on ? '글자 편집 끝내기 (Esc)' : '이 소재 글자 고치기 · 일부 서식'}</button>
    ${nr ? `<div class="fnote">따로 서식 준 글자 ${nr}곳 · <button type="button" class="lnk" id="iElRunsClear">모두 지우기</button></div>` : on ? '' : '<div class="fnote">미리보기 글자를 더블클릭하고 끌어 고르면 그 글자만 바꿔요. 이 소재만 바뀌어요 — 모든 소재는 왼쪽 패널에서</div>'}
    ${OMIT_ROLE[role] ? `<button type="button" class="btn" id="iElOmit" style="width:100%;margin-top:6px">이 소재에서 ${OMIT_NAME[OMIT_ROLE[role]]} 빼기 <span style="opacity:.6">Delete</span></button>` : ''}
    </section>`;
}
function elCommit(a, patch, label, coalesce = false) {
  liveOrig = new WeakMap();   // 실시간 미리보기 끝 — 정식 그림이 덮는다
  const c = state.campaign, k = a.key ?? a.specId, focusId = $('inspector').contains(document.activeElement) ? document.activeElement.id : null;
  pushHistory(`${artLabel(a)} ${label}`, coalesce);
  if ('elements' in patch) { if (patch.elements) a.overrides.elements = patch.elements; else delete a.overrides.elements; }
  if ('layout' in patch) { if (patch.layout) a.overrides.layout = patch.layout; else delete a.overrides.layout; }
  if (patch.style) a.overrides.style = patch.style;
  a.status = 'draft'; a.gateOverride = null;
  logEvent(c, 'manual_edit', { specId: a.specId, element: state.elSel ?? null });
  regen(c); autosave(); softly(() => refreshFrames(k));
  renderInspector();
  if (state.elSel && state.selected === k && !(CS.on && CS.key === k)) EL.show(a, state.elSel);   // 글자 편집 중엔 선택 손잡이를 다시 띄우지 않는다(끌기가 글자 고르기 대신 요소 옮기기가 됐다 — 11-10 실측)
  if (focusId) $(focusId)?.focus();   // 패널 칸에서 고쳤으면 그 칸에 그대로(Tab 흐름이 끊기지 않게)
  ED.editedBadge(a);
  log(`${a.specId} ${label}`);
}
// 글자 크기 배율 — 메인·서브·상세는 roleScale(렌더러가 줄바꿈까지 다시 잡는다), 그 밖은 요소 편집
function textScaleCommit(a, id, k, runsTo) {   // runsTo: 범위 서식을 이것으로(혼합 크기를 한 크기로 맞출 때 — 범위 크기를 걷은 runs)
  if (elLocks(a, id).size) return;
  const { role } = parseElementId(id);
  if (isStyleRole(id)) {
    const cur = a.overrides.style?.roleScale?.[role] ?? 1, v = Math.round(Math.min(1.6, Math.max(0.6, cur * k)) * 100) / 100;
    const rs = { ...(a.overrides.style?.roleScale ?? {}) }; if (v === 1) delete rs[role]; else rs[role] = v;
    const st = { ...(a.overrides.style ?? {}), roleScale: rs }; if (!Object.keys(rs).length) delete st.roleScale;
    const runs = a.overrides.elements?.[id]?.runs;   // 11-10 범위 크기도 같은 비율로(혼합 크기를 한 크기로 맞추면 runsTo)
    const nextRuns = runsTo !== undefined ? runsTo : runs?.some(r => r.px) ? scaleRuns(runs, v / cur) : undefined;
    elCommit(a, { style: st, ...(nextRuns !== undefined ? { elements: withElementEdit(a.overrides.elements, id, { runs: nextRuns }) } : {}) }, `${elementName(id)} 크기`);
  } else elCommit(a, { elements: withElementEdit(a.overrides.elements, id, { scale: (a.overrides.elements?.[id]?.scale ?? 1) * k, ...(runsTo !== undefined ? { runs: runsTo } : {}) }) }, `${elementName(id)} 크기`);
}
function textScaleLive(a, id, k) {
  const key = a.key ?? a.specId, { role } = parseElementId(id);
  if (isStyleRole(id)) { const cur = a.overrides.style?.roleScale?.[role] ?? 1; LIVE.push({ style: state.campaign.style, only: key, ov: { roleScale: { ...(a.overrides.style?.roleScale ?? {}), [role]: Math.round(Math.min(1.6, Math.max(0.6, cur * k)) * 100) / 100 } } }); }
  else LIVE.push({ style: state.campaign.style, only: key, elements: withElementEdit(a.overrides.elements, id, { scale: (a.overrides.elements?.[id]?.scale ?? 1) * k }) });
}
function bindElementPanel(insp, a, c, spec, id) {
  const { role } = parseElementId(id), key = a.key ?? a.specId, styled = isStyleRole(id);
  const q = s => insp.querySelector(s);
  q('#iElOmit')?.addEventListener('click', () => omitElement(a, id));
  if (role === 'kv' || role === 'logo') AK.bind(insp, a, id);   // 11-10 hub 이식 — 외관·정렬·채움
  q('#iElAuto')?.addEventListener('click', () => elCommit(a, { elements: withElementEdit(a.overrides.elements, id, { dx: null, dy: null, sdy: null, fx: null, fy: null, fw: null }) }, `${elementName(id)} 자동 배치로`));
  // 11-10 글자·칠 칸: 고른 범위(pk)가 있으면 범위에, 없으면 요소 전체에(그 속성의 범위 서식은 걷어 낸다 — 피그마처럼 전체 값이 이긴다)
  const pk = CS.on && CS.key === key && CS.pick?.id === id ? CS.pick : null;
  const it = EL.find(a, id), text = it?.el?.textContent ?? '', ed = a.overrides.elements?.[id] ?? {};
  const rng = (patch, label) => rangeApply(a, id, { s: pk.s, e: pk.e, ...patch }, pk.text);
  const edit = (patch, label) => elCommit(a, { elements: withElementEdit(a.overrides.elements, id, patch) }, `${elementName(id)} ${label}`);
  const strip = keys => (ed.runs?.length ? { runs: stripRuns(ed.runs, keys, text) } : {});
  for (const [sel, set] of [['#iElX', v => EL.setXY(a, id, v, null)], ['#iElY', v => EL.setXY(a, id, null, v)], ['#iElW', v => EL.setSize(a, id, v, null)], ['#iElH', v => EL.setSize(a, id, null, v)]]) {
    const n = q(sel); if (n && !n.disabled) n.addEventListener('change', () => { const v = parseFloat(n.value); if (Number.isFinite(v)) set(v); });
  }
  const fnt = q('#iElFont'); if (fnt) fnt.onchange = () => edit({ font: fnt.value || null }, '글꼴');
  const wgt = q('#iElWeight'); if (wgt && !wgt.disabled) wgt.onchange = () => { const v = +wgt.value; if (!v) return; if (pk) rng({ w: v }); else edit({ weight: v, ...strip(['w']) }, '굵기'); };
  const sz = q('#iElSize');
  if (sz && !sz.disabled) {
    const base = parseFloat(it?.el ? it.el.ownerDocument.defaultView.getComputedStyle(it.el).fontSize : sz.value), px0 = parseFloat(sz.value);
    sz.addEventListener('change', () => {
      const v = Math.round(parseFloat(sz.value) * 10) / 10; if (!(v > 0) || v === px0) return;
      if (pk) { rng({ px: Math.abs(v - base) < 0.05 ? null : v }); return; }
      if (Number.isFinite(px0)) textScaleCommit(a, id, v / px0);
      else { // 혼합 → 문구 전체를 그 크기로: 범위 크기를 걷고 바탕 크기를 맞춘다
        textScaleCommit(a, id, v / base, ed.runs?.length ? stripRuns(ed.runs, ['px'], text) : undefined);
      }
    });
  }
  const lh = q('#iElLh'); if (lh) lh.addEventListener('change', () => { const t = lh.value.trim(); if (/^auto$/i.test(t) || t === '') edit({ lh: null }, '행간'); else { const v = parseFloat(t); if (v > 0) edit({ lh: v }, '행간'); } });
  const ls = q('#iElLs'); if (ls && !ls.disabled) ls.addEventListener('change', () => { const v = parseFloat(ls.value); if (!Number.isFinite(v)) return; if (pk) rng({ ls: v }); else edit({ ls: v || null, ...strip(['ls']) }, '자간'); });
  insp.querySelectorAll('#iElAlign [data-ela]').forEach(b => b.onclick = () => { edit({ align: b.dataset.ela }, '정렬'); q(`#iElAlign [data-ela="${b.dataset.ela}"]`)?.focus(); });
  // 11-10 실시간: 입력(input)마다 보이는 프레임 글자에 직접(livePaint), 확정(change)에 한 번 커밋
  const pv = (num, toRun, toWhole) => { if (!num || num.disabled) return; num.addEventListener('input', () => { const v = parseFloat(num.value); if (!Number.isFinite(v)) return; if (pk) livePaint(a, id, { s: pk.s, e: pk.e, ...toRun(v) }); else if (toWhole) livePaint(a, id, { whole: toWhole(v) }); }); num.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== num) liveCancel(a, id); }, 120)); };
  pv(q('#iElSize'), v => ({ px: v }), v => ({ px: v }));
  pv(q('#iElLs'), v => ({ ls: v }), v => ({ ls: v }));
  pv(q('#iElLh'), null, v => ({ lh: v }));
  pv(q('#iElOp'), v => ({ c: pk?.st?.color ?? undefined, o: v }), v => ({ op: v }));
  const col = q('#iElColor');
  if (col && !col.disabled) {
    col.addEventListener('input', () => { const v = col.value.toUpperCase(); if (pk) livePaint(a, id, { s: pk.s, e: pk.e, c: v, ...(pk.st?.o != null && pk.st.o < 100 ? { o: pk.st.o } : {}) }); else livePaint(a, id, { whole: { color: v } }); });
    if (pk) col.onchange = () => rng({ c: col.value.toUpperCase() });   // 손을 떼면(피커 닫기·헥스 Enter) 한 걸음
    else {
      const ov = v => styled ? { roleColors: { ...(a.overrides.style?.roleColors ?? {}), [role]: v } } : null;
      col.onchange = () => { const v = col.value.toUpperCase(); if (styled) elCommit(a, { style: { ...(a.overrides.style ?? {}), ...ov(v) }, ...(ed.runs?.some(r => r.c) ? { elements: withElementEdit(a.overrides.elements, id, strip(['c'])) } : {}) }, `${elementName(id)} 색`); else edit({ color: v, ...strip(['c']) }, '색'); };
    }
  }
  const opn = q('#iElOp');
  if (opn && !opn.disabled) opn.addEventListener('change', () => {
    const v = Math.max(0, Math.min(100, Math.round(parseFloat(opn.value)))); if (!Number.isFinite(v)) return;
    if (pk) { const cc = pk.st?.color; if (!cc) { toast('고른 글자의 색이 섞여 있어요 — 색을 하나로 맞춘 뒤 불투명도를 바꿔요'); return; } rng({ c: cc, o: v >= 100 ? null : v }); }
    else edit({ op: v >= 100 ? null : v, hid: null }, '칠 불투명도');
  });
  q('#iElEye')?.addEventListener('click', () => {
    if (pk) { const cc = pk.st?.color; if (pk.st?.o === 0) rng({ o: null }); else if (cc) rng({ c: cc, o: 0 }); else toast('고른 글자의 색이 섞여 있어요 — 색을 하나로 맞춘 뒤 숨겨요'); }
    else edit({ hid: ed.hid ? null : 1 }, ed.hid ? '칠 보이기' : '칠 숨기기');
  });
  q('#iElFillClear')?.addEventListener('click', () => {
    if (pk) { rng({ c: null }); return; }
    const st = { ...(a.overrides.style ?? {}) };
    if (styled && st.roleColors?.[role]) { const o = { ...st.roleColors }; delete o[role]; if (Object.keys(o).length) st.roleColors = o; else delete st.roleColors; }
    elCommit(a, { style: st, elements: withElementEdit(a.overrides.elements, id, { color: null, op: null, hid: null, ...strip(['c']) }) }, `${elementName(id)} 칠 지우기`);
  });
  q('#iElRuns')?.addEventListener('click', () => { if (CS.on && CS.key === key) CS.exit(); else charEnter(a); });
  q('#iElRunsClear')?.addEventListener('click', () => elCommit(a, { elements: withElementEdit(a.overrides.elements, id, { runs: null }) }, `${elementName(id)} 글자 서식 모두 지우기`));
  q('#iElReset')?.addEventListener('click', () => {
    const st = { ...(a.overrides.style ?? {}) };
    for (const k of ['roleColors', 'roleScale']) if (styled && st[k]) { const o = { ...st[k] }; delete o[role]; if (Object.keys(o).length) st[k] = o; else delete st[k]; }
    const L = { ...(a.overrides.layout ?? {}) }; if (role === 'kv' || role === 'logo') delete L[role];
    const E0 = { ...(a.overrides.elements ?? {}) }; delete E0[id];
    elCommit(a, { style: st, layout: Object.keys(L).length ? L : null, elements: Object.keys(E0).length ? E0 : null }, `${elementName(id)} 일괄값으로`);
  });
}
// 이 소재만: 배경색 · 컬러(끄는 동안 이 프레임만 실시간, 놓으면 한 걸음)
function bindArtifactStyle(insp, a, c) {
  const key = a.key ?? a.specId;
  const save = (patch, label) => { const st = { ...(a.overrides.style ?? {}), ...patch }; elCommit(a, { style: st }, label); };
  const bg = insp.querySelector('#iBgOv');
  if (bg) { const pv = v => ({ bgFill: 'custom', background: { ...(c.style.background ?? {}), mode: 'solid', color: v } }); bg.oninput = () => LIVE.push({ style: c.style, only: key, ov: pv(bg.value.toUpperCase()) }); bg.onchange = () => save(pv(bg.value.toUpperCase()), '배경색'); }
  for (const k of ['primary', 'secondary', 'accent']) {
    const n = insp.querySelector(`#iPalOv-${k}`); if (!n) continue;
    const pv = v => ({ palette: { ...c.style.palette, ...(a.overrides.style?.palette ?? {}), [k]: v } });
    n.oninput = () => LIVE.push({ style: c.style, only: key, ov: pv(n.value.toUpperCase()) });
    n.onchange = () => save(pv(n.value.toUpperCase()), '컬러');
  }
}

const sizeLockedOf = spec => spec.medium === 'jasoseol' || !!(spec.rules?.mainTwoLine ?? spec.mainTwoLine);
function textRolesOf(a) { const f = frames.get(a.key ?? a.specId), doc = f?.iframe?.contentDocument; const have = doc ? new Set([...doc.querySelectorAll('[data-field]')].map(e => e.dataset.field)) : null; return TEXT_ROLES.filter(([k]) => !have || have.has(k)); }
function textRolesHtml(a, spec) {
  if (a.channel !== 'ad') return '';
  const roles = textRolesOf(a); if (!roles.length) return '';
  const reg = textColorRegulated(spec), lockSize = sizeLockedOf(spec), cs = a.overrides.style?.roleColors ?? {}, ss = a.overrides.style?.roleScale ?? {};
  return `<label>글자별 편집</label><div class="fstack" id="iRoles">${roles.map(([k, n]) => { const pct = Math.round((ss[k] ?? 1) * 100); return `<div class="frole${textRoleFocus === k ? ' on' : ''}" data-role="${k}"><div class="flab sub"><span>${n}</span>${(cs[k] || ss[k]) ? iconBtn('swap', `${n} 되돌리기`, `data-rr="${k}"`) : ''}</div>${colorRowHtml({ id: `iRC-${k}`, value: cs[k] ?? '#333333', label: `${n} 글자색`, tail: cs[k] ? '' : '자동', idle: !cs[k], disabled: reg })}${lockSize ? '' : `<div class="fline" style="margin-top:4px"><button type="button" class="btn" data-rs="${k}" data-d="-5" aria-label="${n} 작게">−</button><span style="min-width:44px;text-align:center;font-size:12px">${pct}%</span><button type="button" class="btn" data-rs="${k}" data-d="5" aria-label="${n} 크게">+</button></div>`}</div>`; }).join('')}</div><div class="fnote">${[reg ? '이 규격은 글자색이 규정으로 정해져 있어요' : spec.mediumRules?.textColors?.uniform ? '이 매체는 문구 전체가 한 색이에요' : '', lockSize ? '이 규격은 글자 크기가 규정으로 정해져 있어요' : ''].filter(Boolean).join(' · ') || '이 산출물만 바뀌어요'}</div>`;
}
function bindTextRoles(insp, a, c) {
  const box = insp.querySelector('#iRoles'); if (!box) return;
  const save = (patch, label) => { pushHistory(`${artLabel(a)} 글자별 편집`); a.overrides.style = patch; a.status = 'draft'; a.gateOverride = null; logEvent(c, 'manual_edit', { specId: a.specId, style: label }); regen(c, a.key ?? a.specId); autosave(); refreshFrames(a.key ?? a.specId); renderInspector(); };
  for (const [k] of TEXT_ROLES) {
    const inp = box.querySelector(`#iRC-${k}`); if (!inp || inp.disabled) continue;
    inp.oninput = () => liveStyle(c, null, { only: a.key ?? a.specId, ov: { roleColors: { ...(a.overrides.style?.roleColors ?? {}), [k]: inp.value.toUpperCase() } } });
    inp.onchange = () => save({ ...(a.overrides.style ?? {}), roleColors: { ...(a.overrides.style?.roleColors ?? {}), [k]: inp.value.toUpperCase() } }, 'roleColors');
  }
  box.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => { const k = b.dataset.rs, cur = a.overrides.style?.roleScale?.[k] ?? 1, v = Math.round(Math.min(1.6, Math.max(0.6, cur + +b.dataset.d / 100)) * 100) / 100; save({ ...(a.overrides.style ?? {}), roleScale: { ...(a.overrides.style?.roleScale ?? {}), [k]: v } }, 'roleScale'); });
  box.querySelectorAll('[data-rr]').forEach(b => b.onclick = () => { const k = b.dataset.rr, st = { ...(a.overrides.style ?? {}) }; for (const key of ['roleColors', 'roleScale']) if (st[key]) { const o = { ...st[key] }; delete o[k]; if (Object.keys(o).length) st[key] = o; else delete st[key]; } save(st, 'roleReset'); });
}
// 캔버스 클릭 → 누른 자리의 글자 줄(iframe 문서 좌표로 환산)
function textRoleAt(a, e) { const f = frames.get(a.key ?? a.specId), ifr = f?.iframe, doc = ifr?.contentDocument; if (!doc) return null; const r = ifr.getBoundingClientRect(), k = r.width / (ifr.offsetWidth || r.width), x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k; let hit = null; for (const el of doc.querySelectorAll('[data-field]')) { const b = el.getBoundingClientRect(); if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom && TEXT_ROLES.some(([n]) => n === el.dataset.field)) hit = el.dataset.field; } return hit; }
function renderInspector() { renderLeft(); renderInspectorBody(); wireFui($('inspector')); swatchList(); }
// 색 고르기 칸 견본(11-10) — 캠페인 3색 + 사용자 색을 datalist 로. 크롬·엣지는 색 고르기 창에 견본으로 띄운다
function swatchList() {
  const c = state.campaign; if (!c) return;
  let dl = $('mbmSwatches'); if (!dl) { dl = document.createElement('datalist'); dl.id = 'mbmSwatches'; document.body.appendChild(dl); }
  const p = c.style?.palette ?? {}, list = [...new Set([p.primary, p.secondary, p.accent, ...(c.swatches ?? [])].filter(v => /^#[0-9A-Fa-f]{6}$/.test(v ?? '')).map(v => v.toLowerCase()))];
  dl.innerHTML = list.map(v => `<option value="${v}"></option>`).join('');
  for (const el of document.querySelectorAll('#inspector input[type=color], #leftPanel input[type=color]')) el.setAttribute('list', 'mbmSwatches');
}
/* ═══ 11-10 hub 이식 3단계 — 오른쪽 「선택 없음」 hub 섹션(pagePanel): 페이지 · 키비주얼·지면 · 로고 · 스타일 · 전체 글자 · 내보내기 · 도구 ═══ */
function exportSecHtml(c) {
  const ads = c.artifacts.filter(a => a.channel === 'ad'); if (!ads.length) return '';
  const ok = ads.filter(a => a.status === 'approved').length, picked = SEL.selected(), pk = picked ? ads.filter(a => picked.has(a.key ?? a.specId)).length : 0;
  return `<section class="isec" id="secExport"><h3>내보내기 ${iconBtn('export', '내보내기', 'id="iExpGo"')}</h3>
    <div class="fgrid2"><select id="iExpRange" aria-label="내보낼 범위"><option value="ok">승인한 것 ${ok}</option><option value="all">전체 ${ads.length}(미승인 검토용 폴더)</option>${pk ? `<option value="pick" selected>고른 것 ${pk}</option>` : ''}</select>
    <select id="iExpFmt" aria-label="형식"><option value="zip">PNG · ZIP</option><option value="svg">ZIP + SVG</option></select></div>
    <div class="fnote">매체 규격 1배(용량 상한에 맞춤) · 매체별 폴더 ZIP${ok ? '' : ' · 아직 승인한 소재가 없어요'}</div>
    </section>`;
}
function toolSecHtml(c) {
  const edited = c.artifacts.filter(a => a.overrides?.layout || a.overrides?.elements).length;
  const rulerOff = (() => { try { return localStorage.getItem('mbm-ruler-off') === '1'; } catch { return false; } })();
  return `<section class="isec" id="secTools"><h3>도구</h3>
    <div class="fgrid2"><button type="button" class="btn" id="iToolRegen" ${edited ? '' : 'disabled'} title="옮기거나 크기를 바꾼 요소를 모두 지우고 규칙대로 다시 그려요(되돌리기 한 걸음)">규칙대로 다시 그리기</button>
    <button type="button" class="btn" id="iToolRuler" aria-pressed="${!rulerOff}">${rulerOff ? '룰러 켜기' : '룰러 끄기'}</button></div>
    <div class="fnote">${edited ? `직접 옮긴·고친 소재 ${edited}종` : '직접 옮긴 요소 없음'}</div>
    </section>`;
}
function applyRulerPref() { let off = false; try { off = localStorage.getItem('mbm-ruler-off') === '1'; } catch {} $('viewport')?.classList.toggle('noruler', off); if (!off) RULER?.draw(); }
function bindHubSecs(insp, c) {
  const q = s => insp.querySelector(s);
  // 페이지(캔버스) 색 — 보드 아래 색 칸(#canvasBg)과 같은 값
  const pc = q('#iPageColor');
  if (pc) { const set = v => { const i = $('canvasBg'); if (!i) return; i.value = v; i.dispatchEvent(new Event('input')); }; pc.oninput = () => set(pc.value); }
  q('#iPageReset')?.addEventListener('click', () => { $('canvasBgReset')?.click(); renderInspector(); });
  q('#iKvPick')?.addEventListener('click', () => q('#iKvFile')?.click());
  q('#iExpGo')?.addEventListener('click', () => {
    const r = q('#iExpRange').value, svg = q('#iExpFmt').value === 'svg';
    if (r === 'ok' && !c.artifacts.some(a => a.channel === 'ad' && a.status === 'approved')) { toast('승인한 소재가 없어요 — 범위를 「전체」로 바꾸거나 먼저 승인하세요'); return; }
    exportAdZip(svg, { includeUnapproved: r === 'all', only: r === 'pick' ? SEL.selected() : null });
  });
  q('#iToolRegen')?.addEventListener('click', () => {
    const list = c.artifacts.filter(a => a.overrides?.layout || a.overrides?.elements);
    if (!list.length || !confirm(`직접 옮기거나 고친 요소(위치·크기·글자 서식) — 소재 ${list.length}종을 모두 지우고 규칙대로 다시 그릴까요? 되돌리기(⌘Z)로 돌아올 수 있어요`)) return;
    pushHistory('규칙대로 다시 그리기');
    for (const a of list) { delete a.overrides.layout; delete a.overrides.elements; a.status = 'draft'; a.gateOverride = null; }
    logEvent(c, 'manual_edit', { style: 'regen-all' });
    regen(c); autosave(); refreshFrames(); renderInspector(); toast(`${list.length}종을 규칙대로 다시 그렸어요`);
  });
  q('#iToolRuler')?.addEventListener('click', () => { let off = false; try { off = localStorage.getItem('mbm-ruler-off') === '1'; localStorage.setItem('mbm-ruler-off', off ? '0' : '1'); } catch {} applyRulerPref(); renderInspector(); });
}
function renderInspectorBody() {
  const insp = $('inspector');
  const c = state.campaign;
  if (!state.selected) {
    const scopeTop = scopeHtml(null);
    const sumA = ED.approveSummary();
    const adsN = c.artifacts.filter(x => x.channel === 'ad' || x.channel === 'asset');
    insp.innerHTML = `${scopeTop}
      <div id="paneDesign" role="tabpanel" aria-label="디자인"${state.rightTab === 'review' ? ' hidden' : ''}>
      <section class="isec" id="secPage"><h3>페이지 ${iconBtn('swap', '캔버스 색 기본으로', 'id="iPageReset"')}</h3>
      <div class="fstack">${colorRowHtml({ id: 'iPageColor', value: $('canvasBg')?.value ?? '#F6F7F9', label: '캔버스 색', tail: '캔버스' })}</div>
      <div class="fnote">작업 화면 바탕색 — 내보내기에는 안 들어가요</div>
      </section>
      <section class="isec" id="secVisual"><h3>키비주얼 · 지면 <span class="mode">모든 소재</span></h3>
      <div class="kvthumb" id="iKv" style="width:100%;height:${c.style.keyVisual && c.style.kvMeta ? 170 : 76}px;${c.style.keyVisual ? `background-image:url(${refOf(c.style.keyVisual)})` : ''}">${c.style.keyVisual ? '' : '업로드 · 교체'}</div>
      <input type="file" id="iKvFile" accept="image/*" style="display:none">
      ${c.style.keyVisual ? `<div class="kvvrow">${[['wide', '가로형'], ['tall', '세로형']].map(([k, n]) => { const v = c.style.kvVariants?.[k]; return `<div class="kvthumb logo" id="iKvV-${k}" title="${k === 'wide' ? '폭이 긴' : '세로로 긴'} 규격에 쓸 그림 — 없으면 기본 키비주얼" style="${v ? `background-image:url(${refOf(v.keyVisual)})` : ''}">${v ? '' : `${n}<br>(선택)`}</div><input type="file" id="iKvV-${k}File" accept="image/*" style="display:none">${v ? `<button type="button" class="lnk" data-ikvvdel="${k}" style="font-size:11px">${n} 빼기</button>` : ''}`; }).join('')}</div>` : ''}
      ${c.style.keyVisual ? `<div class="fgrid2" style="margin-top:8px"><button type="button" class="btn" id="iKvPick">바꾸기</button><button class="btn" id="iKvColors">색 다시 맞춤</button></div>` : ''}
      <div id="iKvSpec" class="fontNote" style="font-size:11px;line-height:1.5;margin-top:4px;color:var(--sub)"></div>
      ${c.style.keyVisual ? `<div style="display:flex;justify-content:flex-end;margin-top:2px"><button type="button" class="lnk" id="iKvClear">키비주얼 제거</button></div>
      <div style="display:flex;gap:6px;margin-top:6px">
        ${(aiKeyReady() || c.ai) ? `<button class="btn" id="iKvAi" style="flex:1" title="Claude 가 그림을 한 번 보고 모양 묶음마다 그림 자리·크기·지면을 정해요. 글자·타이포·검수는 규칙 그대로예요. 기본안에만 효과가 있어요(시안 틀은 이 값을 안 읽어요). 위쪽 「Claude 연결하기」로 연결한 계정으로 돌아요">${c.ai ? 'AI 그림 판단 다시' : 'AI 그림 판단'}</button>` : ''}
        ${c.ai ? `<button class="btn" id="iKvAiClear" style="flex:1">AI 판단 해제</button>` : ''}</div>
      ${c.ai ? `<div class="fontNote" style="font-size:11px;line-height:1.5;margin-top:4px;color:var(--sub)">AI 판단(${c.ai.model ?? ''} · $${c.ai.cost ?? '?'}): ${c.ai.analysis?.rationale ?? ''}</div>` : ''}` : ''}
      <div style="margin-top:12px">${bgControlHtml(c.style, 'iBg')}</div>
      </section>
      <section class="isec" id="secLogo"><h3>로고 <span class="mode">모든 소재</span></h3>
      <div class="flab sub"><span>원색 / 다크 지면용 흰색</span></div>
      <div style="display:flex;gap:6px">
        <div class="kvthumb logo" id="iLogo" style="flex:1;height:44px;${c.style.logo ? `background-image:url(${refOf(c.style.logo)})` : ''}">${c.style.logo ? '' : '원색 로고'}</div>
        <div class="kvthumb logo dark" id="iLogoLight" style="flex:1;height:44px;${c.style.logoLight ? `background-image:url(${refOf(c.style.logoLight)})` : ''}">${c.style.logoLight ? '' : '흰색 로고'}</div>
      </div>
      <input type="file" id="iLogoFile" accept="image/*" style="display:none">
      <input type="file" id="iLogoLightFile" accept="image/*" style="display:none">
      ${c.style.logo ? `<button class="btn" id="iLogoMakeWhite" style="width:100%;margin-top:6px">원색 로고로 흰색 로고 만들기</button>` : ''}
      <div id="iLogoSpec" class="fontNote" style="font-size:11px;line-height:1.5;margin-top:4px;color:var(--sub)"></div>
      </section>
      <section class="isec" id="secStyle"><h3>스타일 ${(c.swatches?.length ?? 0) < 8 ? iconBtn('plus', '사용자 색 추가 — 색 고르기 칸에 견본으로 떠요', 'id="iSwAdd"') : ''}</h3>
      <div class="flab sub"><span>색 스타일</span></div>
      <div class="fstack">${[['iColor1', '주색', c.style.palette.primary], ['iColor2', '보조', c.style.palette.secondary], ['iColor3', '포인트', c.style.palette.accent]].map(([k, n, v]) => colorRowHtml({ id: k, value: v, label: n, tail: n })).join('')}</div>
      ${c.swatches?.length ? `<div class="flab sub"><span>사용자 색</span></div><div class="fstack">${c.swatches.map((v, i) => colorRowHtml({ id: `iSw${i}`, value: v, label: `사용자 색 ${i + 1}`, tail: '견본', after: iconBtn('minus', `사용자 색 ${i + 1} 빼기`, `data-swdel="${i}"`) })).join('')}</div>` : ''}
      </section>
      <section class="isec" id="secText"><h3>전체 글자</h3>
      <label>폰트</label>
      <select id="iFont">${fontOptions(c.style.fonts.heading)}</select>
      <button class="btn" id="iFontUp" style="width:100%;margin-top:6px">폰트 파일 첨부</button>
      <input type="file" id="iFontFile" accept=".woff2,.woff,.ttf,.otf" style="display:none">
      <label>글자색</label>
      <div class="vseg" id="iToneSeg">${[['auto', '기본'], ['light', '흰색'], ['dark', '검정']].map(([k, v]) => { const on = !c.style.textColor && (c.style.textTone ?? 'auto') === k; return `<button data-tt="${k}" class="${on ? 'on' : ''}" aria-pressed="${on}">${v}</button>`; }).join('')}</div>
      <div class="fstack" id="iTextColorRow" style="margin-top:4px">${colorRowHtml({ id: 'iTextColor', value: c.style.textColor ?? '#333333', label: '글자색 직접', tail: c.style.textColor ? '' : '직접', idle: !c.style.textColor, after: c.style.textColor ? iconBtn('swap', '글자색 직접 지정 되돌리기', 'id="iTextColorReset"') : '' })}</div>
      <div class="fnote">기본은 지면에 맞춰 흰색이나 검정입니다. 글자마다 바꾸려면 소재를 고른 뒤 글자별 편집에서 바꿉니다. 색이 정해진 매체(리멤버·카카오 비즈보드·NAP 비즈보드)는 제외</div>
      ${ED.alignCampaignHtml()}
      ${ED.presetCampaignHtml(['textAnchor'])}
      </section>
      ${exportSecHtml(c)}
      ${toolSecHtml(c)}
      ${adsN.some(x => x.channel === 'ad') ? `<section class="isec isec-free"><h3>대화로 시안 뽑기</h3>
      <div class="fontNote" style="font-size:11px;line-height:1.5;color:var(--sub);margin-bottom:6px">Claude 가 키비주얼로 새 배경·자유 타이포를 만들어요(위쪽 「Claude 연결하기」로 연결한 계정). 규칙은 검수기가 강제.</div>
      <button class="btn" id="iFreeOpenAll" style="width:100%">대화로 시안 뽑기</button></section>` : ''}
      ${c.kind !== undefined && (c.media?.length || c.adSpecIds?.length) ? mediaAddHtml(c) : ''}
      </div>
      <div id="paneReview" role="tabpanel" aria-label="검수"${state.rightTab === 'review' ? '' : ' hidden'}>
      <section class="isec"><h3>검수 <span class="mode">승인 ${adsN.filter(x => x.status === 'approved').length}/${adsN.length}</span></h3>
        <div class="fnote">가이드 ✗ ${sumA.fail}${sumA.pending ? ` · 재는 중 ${sumA.pending}` : ''}</div>
        ${sumA.top.length ? `<ul class="gok-list">${sumA.top.map(([n, k]) => `<li>${escH(n)} <span>${k}</span></li>`).join('')}</ul>` : ''}
        <button class="btn" id="iApproveAll" style="width:100%;margin-top:8px">전체 승인</button>
      </section></div>
      <div id="inspNote"></div>`;
    bindScope(insp, null, c);
    bindHubSecs(insp, c);   // 11-10 hub 이식 3단계 — 페이지 · 바꾸기 · 내보내기 · 도구
    insp.querySelector('#iApproveAll').onclick = () => $('approveAll').click();
    insp.querySelector('#iFont').value = c.style.fonts.heading;
    const restyle = (patch = {}, label = '스타일 변경', coalesce = false) => restyleWith(c, patch, label, coalesce, {
      colors: [insp.querySelector('#iColor1').value.toUpperCase(), insp.querySelector('#iColor2').value.toUpperCase(), insp.querySelector('#iColor3').value.toUpperCase()],
      fonts: { heading: insp.querySelector('#iFont').value, body: insp.querySelector('#iFont').value },
    });
    // 컬러피커는 드래그하는 내내 값이 흐른다 — 한 번의 색 고르기가 되돌리기 한 걸음이 되도록 묶는다
    const styleChange = debounce(() => restyle({}, '스타일 변경', true), 350);
    // 끄는 동안 보드가 따라오고(liveStyle), 피커를 놓을 때 한 번 정식으로 — 되돌리기도 그 한 걸음(10-19: 손으로 고른 색은 지면까지 따라간다)
    const curColors = () => ['#iColor1', '#iColor2', '#iColor3'].map(k => insp.querySelector(k).value.toUpperCase());
    // 11-09: 저장한 직접 그라데이션의 정지점도 팔레트를 따라간다(gradientFollowingPalette) — 그라데이션 편집기가 떠 있으면 정지점 UI 도 같은 값으로 다시 그린다
    const palettePatch = () => ({ colorsManual: true, background: { ...c.style.background, gradient: gradientFollowingPalette(c.style.background?.gradient, c.style, nextStyle(c, { colorsManual: true }, { colors: curColors() })) } });
    for (const k of ['#iColor1', '#iColor2', '#iColor3']) {
      insp.querySelector(k).oninput = () => liveStyle(c, palettePatch(), { colors: curColors() });
      insp.querySelector(k).onchange = () => { softly(() => restyle(palettePatch(), '색 직접 변경')); if (insp.querySelector('#iBgGrad')) renderInspector(); };
    }
    insp.querySelector('#iFont').onchange = () => styleChange();
    insp.querySelector('#iFont').value = c.style.fonts.heading;
    // 사용자 색(11-10 hub 「색 스타일 +」) — 렌더에는 안 쓰는 견본. 모든 색 고르기 칸(input[type=color])의 견본 목록에 뜬다(datalist)
    const swSave = (next, label) => { pushHistory(label); c.swatches = next; autosave(); renderInspector(); };
    insp.querySelector('#iSwAdd')?.addEventListener('click', () => swSave([...(c.swatches ?? []), c.style.palette.primary.toUpperCase()], '사용자 색 추가'));
    insp.querySelectorAll('[data-swdel]').forEach(b => b.onclick = () => swSave(c.swatches.filter((_, i) => i !== +b.dataset.swdel), '사용자 색 빼기'));
    (c.swatches ?? []).forEach((_, i) => { const el = insp.querySelector(`#iSw${i}`); if (el) el.onchange = () => { const v = el.value.toUpperCase(); if (v === c.swatches[i]) return; swSave(c.swatches.map((x, j) => j === i ? v : x), '사용자 색 바꾸기'); }; });
    const setBg = (patch, label) => { softly(() => restyle({ background: { ...c.style.background, ...patch } }, label)); renderInspector(); };
    insp.querySelectorAll('#iBgSeg button').forEach(b => b.onclick = () => setBg({ mode: b.dataset.b }, '배경 방식 변경'));
    const bgIn = insp.querySelector('#iBgColor');
    if (bgIn) { bgIn.oninput = () => liveStyle(c, { background: { ...c.style.background, color: bgIn.value.toUpperCase() } }, { colors: curColors() }); bgIn.onchange = () => setBg({ color: bgIn.value.toUpperCase() }, '배경색 직접 고르기'); }
    insp.querySelector('#iBgReset')?.addEventListener('click', () => setBg({ color: null }, '배경색 되돌리기'));
    if (insp.querySelector('#iBgGrad')) { const f0 = resolveField(c.style, { facing: 'left' }); bindGradientEditor(insp.querySelector('#iBgGrad'), editGradientOf(c.style, f0), { id: 'iBg', onChange: g => setBg({ gradient: g }, '그라데이션 직접 설정'), onLive: g => liveStyle(c, { background: { ...c.style.background, gradient: g } }, { colors: curColors(), keepPrev: true }), onPreview: css => { const p = insp.querySelector('.bgprev'); if (p) p.style.background = css; } }); }
    insp.querySelector('#iBgGradReset')?.addEventListener('click', () => setBg({ gradient: null }, '그라데이션 자동으로'));
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
    insp.querySelectorAll('#iToneSeg button').forEach(b => b.onclick = () => { if (!c.style.textColor && (c.style.textTone ?? 'auto') === b.dataset.tt) return; restyle({ textTone: b.dataset.tt, textColor: null }, `글자색 ${TONE_LABEL[b.dataset.tt]}`); renderInspector(); });
    // 글자색 직접 지정(style.textColor, 11-02 컨시어지 「브랜드컬러 외 폰트 색상」) — 일괄. 규정 매체는 렌더러가 무시(textColor.ignored). 되돌리기 = null(톤대로)
    const tcIn = insp.querySelector('#iTextColor'); if (tcIn) { tcIn.oninput = () => liveStyle(c, { textColor: tcIn.value.toUpperCase() }, { colors: curColors(), keepPrev: true }); tcIn.onchange = () => { const v = tcIn.value.toUpperCase(); if ((c.style.textColor ?? null) === v) { liveRevert(); return; } softly(() => restyle({ textColor: v, textTone: 'auto' }, `글자색 직접 ${v}`)); renderInspector(); }; }
    const tcRs = insp.querySelector('#iTextColorReset'); if (tcRs) tcRs.onclick = () => { restyle({ textColor: null }, '글자색 직접 지정 해제'); renderInspector(); };
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
    for (const k of ['wide', 'tall']) { const th = insp.querySelector(`#iKvV-${k}`), inp = insp.querySelector(`#iKvV-${k}File`); if (th && inp) bindUpload(th, inp, async d => { const kd = await prepKv(d); const { meta } = await analyzeKeyVisual(kd); restyle({ kvVariants: { ...(c.style.kvVariants ?? {}), [k]: { keyVisual: kd, kvMeta: meta } } }, `${k === 'wide' ? '가로형' : '세로형'} 키비주얼`); renderInspector(); toast('맞는 모양의 규격을 다시 그렸어요'); }); }
    insp.querySelectorAll('[data-ikvvdel]').forEach(b => b.onclick = () => { const { [b.dataset.ikvvdel]: _, ...rest } = c.style.kvVariants ?? {}; restyle({ kvVariants: rest }, '키비주얼 모양 빼기'); renderInspector(); });
    { const fb = insp.querySelector('#iFreeOpenAll'); if (fb) fb.onclick = () => FREE.open(null); }
    const kvIn = insp.querySelector('#iKvFile');
    insp.querySelector('#iKv').onclick = () => kvIn.click();
    // 보여 줄 영역 지정(11-02): 캠페인 kvMeta.manual — 바꾸면 restyle(regen) 으로 소재가 다시 그려진다
    if (c.style.keyVisual && c.style.kvMeta) mountKvFocus(insp.querySelector('#iKv'), { kvMeta: c.style.kvMeta, onLive: region => liveStyle(c, { kvMeta: withManual(c.style.kvMeta, { region }) }, { colors: curColors(), keepPrev: true }), onLiveCancel: liveRevert, onChange: m => {
      softly(() => restyle({ kvMeta: withManual(c.style.kvMeta, m) }, m ? '키비주얼 보여 줄 영역 지정' : '키비주얼 영역 자동'));
      renderInspector(); insp.querySelector('#iKv .kvfocus')?.focus();
      toast(m ? '지정한 영역으로 모든 규격을 다시 그렸어요' : '자동 판정으로 다시 그렸어요');
    } });
    kvIn.onchange = () => {
      const f = kvIn.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = async () => {
        let readability = null, suggests = [], meta = null;
        const kv = await prepKv(r.result);
        try { ({ readability, suggests, meta } = await analyzeKeyVisual(kv)); } catch {}
        // 로고가 있으면 주색은 로고가 맡고 키비주얼은 보조·포인트만 바꾼다 — 이미지를 갈았다고 브랜드 색이 바뀌면 안 된다
        const { roles, fromLogo } = await rolesFromAssets({ logo: c.style.logo, keyVisual: kv, kvMeta: meta, mode: c.style.mode, kvColors: suggests });
        // 11-09 사용자 「배경색 키비 바꾸면 변경 안 돼?」: 직접 고른 배경색·그라데이션·AI 지면은 전 그림에 맞춘 값 — 그림을 갈면 자동으로 돌려 새 그림에 맞춘다(되돌리기로 복구)
        const bgWasManual = c.style.background && (c.style.background.mode !== 'auto' || c.style.background.color || c.style.background.ai);
        restyle({ keyVisual: kv, kvOrig: r.result, kvReadability: readability, kvMeta: meta, kvTypeOverride: null, aiSlots: null, colorsManual: false, ...(roles ? { colors: roles } : {}), ...(bgWasManual ? { background: { mode: 'auto', color: null, gradient: null } } : {}) }, '키비주얼 교체');
        renderInspector();
        toast((roles ? `키비주얼 교체 — ${fromLogo ? '주색은 로고 유지, ' : ''}색 ${roles.join(', ')} 배치` : '키비주얼 교체') + (bgWasManual ? ' · 배경도 새 그림에 맞췄어요(되돌리기 ⌘Z)' : ''));
        { const ck = await kvCheckOf(r.result, meta); if (ck.level === 'weak' || ck.level === 'bad') toast(ck.text); }
        autoKvAi(c, { kv });   // 11-10 그림이 바뀌면 AI 그림 판단도 새 그림으로(Claude 연결 때)
        claudeKvType(kv, meta, (ov, res, same) => {   // 11-10 Claude 그림 종류 판단(인스펙터 그림 바꾸기)
          if (c.style.keyVisual !== kv) return;
          applyClaudeJudge(c, { ov: same || c.style.kvTypeOverride ? null : ov, slots: res.slots, name: res.name });
        });
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
      clearAiOverrides(c); renderInspector();
    });
    // 하이브리드(10-22): AI 가 그림만 판단(캠페인당 1회) → 광고 규격마다 모양 묶음의 crop 사본·프리셋을 개별값(overrides.style)으로. 글자·타이포·검수는 규칙 그대로
    insp.querySelector('#iKvAi')?.addEventListener('click', async () => {
      const btn = insp.querySelector('#iKvAi');
      if (!confirm('Claude 가 키비주얼을 한 번 봅니다. 모양 묶음마다 그림 자리·크기·지면을 정하고 광고 규격 전부에 적용합니다. 글자는 규칙 그대로. 진행할까요?')) return;
      btn.disabled = true; btn.textContent = '그림 보는 중…';
      const ok = await runKvAi(c);
      if (!ok) { btn.disabled = false; btn.textContent = 'AI 그림 판단'; }
    });
    insp.querySelector('#iKvAiClear')?.addEventListener('click', () => { pushHistory('AI 판단 해제'); clearAiOverrides(c); regen(c); autosave(); refreshFrames(); renderInspector(); toast('AI 판단 해제 — 자동 배치로'); });
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
    const mkW = insp.querySelector('#iLogoMakeWhite'); if (mkW) mkW.onclick = async () => { const w = await makeWhiteLogo(c.style.logo, c.style.logoMono).catch(() => null); if (!w) { toast(WHITE_LOGO_FAIL); return; } restyle({ logoLight: w, logoTone: c.style.logoTone === 'light' ? 'light' : 'both' }, '흰색 로고 만들기'); renderInspector(); };
    // 폰트 파일 첨부 — 카탈로그에 끼운 뒤 그 폰트로 전체 재생성
    const fontIn = insp.querySelector('#iFontFile');
    insp.querySelector('#iFontUp').onclick = () => fontIn.click();
    fontIn.onchange = () => pickFontFile(fontIn, id => {
      restyle({ fonts: { heading: id, body: id } }, '폰트 첨부');
      renderInspector();
    });
    insp.querySelector('#iAdd')?.addEventListener('click', () => addArtifactModal());   // 10-15 밤: 인스펙터 간소화로 버튼 없음(상단 메뉴·모달은 그대로)
    bindMediaAdd(insp, c);
    ED.bindPresetCampaign(insp, restyle);
    ED.bindAlignCampaign(insp, restyle);   // 글자 정렬 세그먼트(10-19)
    return;
  }

  const a = c.artifacts.find(x => (x.key ?? x.specId) === state.selected);
  ensureVariants(a);   // 안 목록은 고른 소재만 지금 계산(편집 경로는 미룬다, 11-09 성능)
  const gVars = guideVariants(a);
  const nVar = variantCount(a);
  const spec = effSpec(a);
  const isPrint = spec.unit === 'mm';
  const presets = presetsFor(a);
  // 섹션마다 .isec(흰 카드)로 묶는다 — 인스펙터는 유리 판이라 안쪽을 카드로 쌓아야 층이 읽힌다
  const scopeTop = scopeHtml(a);
  const omitA = a.channel === 'ad' ? omitOf(c, a) : [];
  const omitSec = omitA.length ? `<section class="isec"><h3>뺀 요소</h3>${omitA.map(r => `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;margin:4px 0"><span>${OMIT_NAME[r] ?? r}${omitList(a.overrides?.core?.omit).includes(r) ? '' : ' <span style="opacity:.6">(일괄)</span>'}</span>${omitList(a.overrides?.core?.omit ?? null).includes(r) || a.overrides?.core?.omit != null ? `<button type="button" class="lnk" data-unomit="${r}">다시 넣기</button>` : ''}</div>`).join('')}</section>` : '';
  const designSections = state.elSel && a.channel === 'ad' && EL.find(a, state.elSel) ? elementPanelHtml(a, spec, state.elSel) : omitSec + `
    ${(a.channel === 'ad' && ((a.variants?.length ?? 0) > 1 || FREE.templatesFor(a.specId).length || SPECS[a.specId]?.rules)) ? `<section class="isec isec-var">
      <h3>레이아웃 안 <span class="mode">${a.variants.length}안</span></h3>
      <div class="vrow vrow-big" id="iVariants">${a.variants.map((v, i) => { const sub = v.kind === 'free' ? '' : (v.sub ?? variantSubOf(v.style, SPECS[a.specId])); return `<div class="vcard"><button class="vthumb ${currentVariantIndex(a) === i ? 'on' : ''}" data-vi="${i}" title="${escH(v.label)}${sub ? ' — ' + escH(sub) : ''}"><span class="vthumb-box" data-vi="${i}"></span><span class="vthumb-lab">${i + 1} ${escH(v.label)}</span>${sub ? `<span class="vthumb-sub">${escH(sub)}</span>` : ''}</button><button type="button" class="vzoom" data-vz="${i}" aria-label="안 ${i + 1} 크게 보기" title="크게 보기">⤢</button></div>`; }).join('')}</div>
      <div class="row vbtns"><button class="btn" id="iVariantAll" ${Object.keys(a.variants[currentVariantIndex(a)]?.style ?? {}).length ? '' : 'disabled title="기본안은 전파할 값이 없음"'}>이 안으로 전부</button>${(templateChoices(a.specId, adEffCtx(a), c.style, artRenderOpts(a), { countOnly: true }) > 0 || FREE.templatesFor(a.specId).length || FREE.suggestionsFor(a, c).length) ? `<button class="btn" id="iTplMore" aria-expanded="false">다른 시안 보기</button>` : ''}${SPECS[a.specId]?.rules ? `<button class="btn" id="iAiMore" hidden title="서버가 백그라운드로 방향 3종(타이포·밝은·어두운)을 만들어요. 끝나면 알림 → 「다른 시안 보기」 맨 앞">AI 추가 제안</button>` : ''}</div>
      ${SPECS[a.specId]?.rules ? `<span id="iAiJob" data-key="${escH(a.key ?? a.specId)}">${FREE.jobBadge(a)}</span>` : ''}
    </section>` : ''}
    ${a.channel === 'ad' && SPECS[a.specId]?.rules ? AID.sectionHtml(a) : ''}
    ${a.channel === 'ad' ? `${layerListHtml(a)}
    <section class="isec"><h3>비주얼 ${ovBtn(a, 'visual')}</h3>
      ${ED.presetArtifactHtml(a, ['kvPlace', 'kvSize', 'scrim'])}
      <button class="btn" data-goall="kv" style="width:100%;margin-top:8px">키비주얼 바꾸기 · 영역 지정</button>
    </section>
    <section class="isec"><h3>배경 ${ovBtn(a, 'bg')}</h3>
      ${ED.presetArtifactHtml(a, ['bgFill', 'bgGrad'], 'inspPresetB')}
      <div class="fstack" style="margin-top:8px">${colorRowHtml({ id: 'iBgOv', value: a.overrides.style?.background?.color ?? c.style.background?.color ?? c.style.palette.primary, label: '이 소재 배경색', tail: a.overrides.style?.background?.color ? '' : '직접', idle: !a.overrides.style?.background?.color })}</div>
    </section>
    <section class="isec"><h3>컬러 ${ovBtn(a, 'color')}</h3>
      <div class="fstack">${[['primary', '주색'], ['secondary', '보조'], ['accent', '포인트']].map(([k, n]) => colorRowHtml({ id: `iPalOv-${k}`, value: a.overrides.style?.palette?.[k] ?? c.style.palette[k], label: `이 소재 ${n}`, tail: n, idle: !a.overrides.style?.palette })).join('')}</div>
    </section>
    <section class="isec"><h3>글자 ${ovBtn(a, 'text')}</h3>
      ${artifactFontHtml(a, c)}
      <label>글자색</label>
      <div class="vseg" id="iToneOv">${[['', '공통'], ['light', '흰색'], ['dark', '검정']].map(([k, v]) => { const on = !a.overrides.style?.textColor && (a.overrides.style?.textTone ?? '') === k; return `<button data-tto="${k}" class="${on ? 'on' : ''}" aria-pressed="${on}">${v}</button>`; }).join('')}</div>
      ${(() => { const reg = textColorRegulated(spec); const ov = a.overrides.style?.textColor ?? null; const cur = ov ?? c.style.textColor ?? null; return `<div class="fstack" id="iTextColorOvRow" style="margin-top:4px">${colorRowHtml({ id: 'iTextColorOv', value: cur ?? '#333333', label: '글자색 직접(이 소재만)', tail: cur ? '' : '직접', idle: !cur, disabled: reg, after: ov ? iconBtn('swap', '이 소재 글자색 되돌리기(공통 따름)', 'id="iTextColorOvReset"') : '' })}</div>${reg ? '<div class="fnote">매체 규정 색 고정 — 직접 지정 불가</div>' : ''}`; })()}
      ${ED.alignArtifactHtml(a)}
      ${ED.presetArtifactHtml(a, ['textAnchor', 'infoTag', 'tagShape'], 'inspPresetT')}
      ${textRolesHtml(a, spec)}
    </section>
    <section class="isec"><h3>가이드</h3>${guideOvHtml(a) || '<div class="fnote">이 규격은 틀 가이드가 없어요</div>'}</section>` : ''}
    ${(nVar > 1 && a.channel !== 'ad') || a.channel === 'badge' || isPrint ? `<section class="isec">
    ${(nVar > 1 && a.channel !== 'ad') ? `<label>레이아웃 시안</label><div class="vseg">${Array.from({ length: nVar }, (_, i) =>
      `<button data-v="${i}" class="${(a.variant ?? 0) === i ? 'on' : ''}" aria-pressed="${(a.variant ?? 0) === i}">${gVars ? gVars[i].name : i + 1}</button>`).join('')}</div>` : ''}
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
      <div class="fgrid2" style="margin-top:6px">${numField({ id: 'iW', value: spec.wmm, label: '가로(mm)', prefix: 'W' })}${numField({ id: 'iH', value: spec.hmm, label: '세로(mm)', prefix: 'H' })}</div>
      <div style="font-size:11px;color:var(--sub);margin-top:8px;line-height:1.6">
        용지 ${spec.wmm + spec.bleed * 2}×${spec.hmm + spec.bleed * 2}mm (블리드 ${spec.bleed}mm)<br>
        메인 ${c.style.palette.primary} ≈ ${cmykText(c.style.palette.primary)}
      </div>` : ''}</section>` : ''}`;
  insp.innerHTML = `${scopeTop}
    <div id="paneDesign" role="tabpanel" aria-label="디자인"${state.rightTab === 'review' ? ' hidden' : ''}>${designSections}</div>
    <div id="paneReview" role="tabpanel" aria-label="검수"${state.rightTab === 'review' ? '' : ' hidden'}>
      <section class="isec">
      ${a.channel === 'asset' ? `<label>전달물 검사 <span style="opacity:.55">원본 가로·포맷·배경(10-28)</span></label><div id="inspLint" style="margin-bottom:8px">${lintHtml(a)}</div>` : ''}
      ${(a.channel === 'ad' || a.channel === 'asset') ? `<label>승인</label><div id="iGate" style="margin-bottom:8px">${gateHtml(a)}</div>
      <button class="btn" id="iApprove" style="width:100%">${a.status === 'approved' ? '승인 취소' : '이 소재 승인'}</button>` : ''}
      </section>
      ${a.channel === 'ad' ? ED.guideSectionHtml(a) : ''}
    </div>
    <section class="isec isec-foot">
    <div class="row">
      <button class="btn" id="iOpen">크게</button>
      <button class="btn pri" id="iExp">내보내기</button>
      <button class="btn" id="iDesel">해제</button>
    </div>
    <button class="btn danger" id="iDel" style="width:100%;margin-top:6px">이 산출물 빼기</button>
    </section>
    <div id="inspNote"></div>`;
  bindScope(insp, a, c);
  if (a.channel === 'ad' && state.elSel) bindElementPanel(insp, a, c, spec, state.elSel);
  insp.querySelectorAll('[data-unomit]').forEach(b => b.onclick = () => setArtOmit(a, omitOf(c, a).filter(r => r !== b.dataset.unomit)));
  if (a.channel === 'ad') bindArtifactStyle(insp, a, c);
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
  // 글자색 직접 지정 — 이 산출물만(overrides.style.textColor, 11-02). 되돌리기 = 공통(c.style.textColor)대로. 규정 매체는 입력이 비활성
  const setTextColorOv = (v, label) => {
    if ((a.overrides.style?.textColor ?? null) === v) return;
    pushHistory(`${artLabel(a)} 글자색 개별 편집`);
    const st = { ...(a.overrides.style ?? {}) };
    if (v) { st.textColor = v; delete st.textTone; } else delete st.textColor;
    a.overrides.style = st; a.status = 'draft'; a.gateOverride = null;
    logEvent(c, 'manual_edit', { specId: a.specId, style: 'textColor' });
    regen(c); autosave(); softly(() => refreshFrames(a.specId)); renderInspector();
    $('inspNote').textContent = '이 산출물만 반영됨';
    log(`${a.specId} 글자색 ${label}`);
  };
  const tcOv = insp.querySelector('#iTextColorOv'); if (tcOv && !tcOv.disabled) { tcOv.oninput = () => liveStyle(c, null, { only: a.key ?? a.specId, ov: { textColor: tcOv.value.toUpperCase() } }); tcOv.onchange = () => setTextColorOv(tcOv.value.toUpperCase(), `직접 ${tcOv.value.toUpperCase()}`); }
  bindTextRoles(insp, a, c);
  const tcOvRs = insp.querySelector('#iTextColorOvReset'); if (tcOvRs) tcOvRs.onclick = () => setTextColorOv(null, '직접 지정 해제(공통 따름)');
  // 글자색 톤 — 이 산출물만(overrides.style.textTone, 10-19). 비우면 공통
  insp.querySelectorAll('#iToneOv button').forEach(b => b.onclick = () => {
    const v = b.dataset.tto || null;
    if (!a.overrides.style?.textColor && (a.overrides.style?.textTone ?? null) === v) return;
    pushHistory(`${artLabel(a)} 글자색 개별 편집`);
    const st = { ...(a.overrides.style ?? {}) };
    delete st.textColor;
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
  if (a.channel === 'ad') { ED.bindGuideSection(insp, a); ED.bindEditSection(insp, a); ED.bindPresetArtifact(insp, a); ED.bindAlignArtifact(insp, a); bindGuideOv(insp); }
  // 레이아웃 안(10-20): 썸네일은 그 안의 프리셋으로 다시 그린 html 을 작은 iframe 에 — 안은 캠페인 공통 스타일 + 안 프리셋(산출물 개별 편집값은 안 섞는다)
  if (a.channel === 'ad') AID.bind(insp, a);   // AI 디자인 칸(11-09) — 「대화 창에서 더 뽑기」(FREE.open)도 이 칸 안
  { const fb = $('iFreeOpen'); if (fb) fb.onclick = () => FREE.open(a); }
  if (a.channel === 'ad' && insp.querySelector('#iVariants')) {
    const spec = SPECS[a.specId], [nw, nh] = naturalSize(spec);
    // 11-09 사용자 「썸네일이 너무 작다」: 패널 폭에 1~2열(가로로 긴 규격은 1열), 규격 비율 그대로. 높이 상한 240
    if (!document.getElementById('vthumbStyle1109')) document.head.insertAdjacentHTML('beforeend', `<style id="vthumbStyle1109">#inspector .vrow-big{display:grid;grid-template-columns:repeat(var(--vcols,2),minmax(0,1fr));gap:8px;overflow:visible}#inspector .vrow-big .vcard{position:relative;min-width:0}#inspector .vrow-big .vthumb{width:100%;display:block}#inspector .vrow-big .vthumb-box{width:100%;height:auto}#inspector .vthumb-sub{display:block;font-size:10px;line-height:1.3;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#inspector .vzoom{position:absolute;right:6px;top:6px;width:24px;height:24px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:13px;line-height:1;cursor:pointer;opacity:.9}#inspector .vzoom:focus-visible{outline:2px solid var(--focus)}#inspector .vbtns{display:flex;flex-wrap:wrap;gap:6px}#inspector .vbtns .btn{white-space:nowrap;flex:1 1 auto}</style>`);
    const vrow = insp.querySelector('#iVariants'), cols = nw / nh > 1.5 ? 1 : 2; vrow.style.setProperty('--vcols', cols);
    const boxW = Math.max(100, Math.floor(((vrow.clientWidth || 300) - 8 * (cols - 1)) / cols) - 10), k = Math.min(boxW / nw, 240 / nh);
    for (const box of insp.querySelectorAll('.vthumb-box')) box.style.cssText = `width:${Math.round(nw * k)}px;height:${Math.round(nh * k)}px`;
    // 크게 보기(「다른 시안 보기」와 같은 큰 카드 모달) — 고르면 썸네일 클릭과 같다
    insp.querySelectorAll('#iVariants .vzoom').forEach(z => z.onclick = e => { e.stopPropagation(); const cur = currentVariantIndex(a); openTplPicker({ title: `레이아웃 안 · ${artLabel(a)}`, nw, nh, returnTo: z, current: `vi${cur}`,
      choices: a.variants.map((v, i) => ({ label: `${i + 1} ${v.label}`, sub: v.kind === 'free' ? '' : (v.sub ?? variantSubOf(v.style, spec)), style: { ...v.style, tpl: `vi${i}` }, vi: i, html: (() => { try { return renderArtifact(a.specId, adEffCtx(a), refStyle({ ...c.style, ...v.style }), artRenderOpts(a)); } catch { return ''; } })() })),   // 미리보기만 — 그림은 참조로
      docOf: ch => previewDoc(ch.html, a.variants[ch.vi]?.style?.fonts?.heading ?? artifactFontId(a)),
      onPick: ch => insp.querySelector(`#iVariants .vthumb[data-vi="${ch.vi}"]`)?.click() }); });
    for (const box of insp.querySelectorAll('.vthumb-box')) {
      const v = a.variants[+box.dataset.vi]; if (!v) continue;
      let html = ''; try { html = renderArtifact(a.specId, adEffCtx(a), refStyle({ ...c.style, ...v.style }), artRenderOpts(a)); } catch {}   // 썸네일 — 그림은 참조로(11-09 성능)   // 보드와 같은 옵션(시안 번호·용도·화살표·규격)
      if (!html) continue;
      const f = document.createElement('iframe'); f.width = nw; f.height = nh; f.style.transform = `scale(${k})`; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.srcdoc = previewDoc(html, v.style?.fonts?.heading ?? artifactFontId(a)); box.appendChild(f);
    }
    // 시안 더 보기(11-02): 자동 안 말고 이 규격·키비주얼에 맞는 시안 전부에서 고른다
    const moreBtn = $('iTplMore');
    if (moreBtn) moreBtn.onclick = () => openTplPicker({
      title: `다른 시안 · ${artLabel(a)}`, nw, nh, returnTo: moreBtn,
      current: (v => v?.tpl ?? v?.free?.id ?? null)(a.variants[currentVariantIndex(a)]?.style),
      choices: [...FREE.choicesFor(a, c, artRenderOpts(a)), ...templateChoices(a.specId, adEffCtx(a), refStyle(c.style), artRenderOpts(a))],   // 미리보기 html 은 그림 참조로(11-09)   // 내 자유 시안(같은 규격, 11-05)이 맨 앞
      docOf: ch => previewDoc(ch.html, ch.style.fonts?.heading ?? artifactFontId(a)),
      onPick: ch => {
        pushHistory(`${artLabel(a)} 시안 고르기`);
        const prev = a.variants[currentVariantIndex(a)]?.style ?? {}; const st = { ...(a.overrides.style ?? {}) }; for (const key of Object.keys(prev)) delete st[key]; Object.assign(st, ch.style);
        a.overrides.style = st;
        let i = a.variants.findIndex(v => ch.style.free ? v.style?.free?.id === ch.style.free.id : v.style?.tpl === ch.style.tpl);
        if (i < 0) { a.variants.push({ id: a.variants.length, label: ch.label, style: ch.style, hash: '', ...(ch.style.free ? { kind: 'free', html: ch.style.free.tpl, notes: ch.style.free.notes ?? '' } : {}) }); i = a.variants.length - 1; }
        a.variantSel = i; a.status = 'draft'; a.gateOverride = null;
        logEvent(c, 'template_selected', { specId: a.specId, tpl: ch.style.tpl ?? ch.style.free?.id ?? null, label: ch.label });
        if (ch.suggested) FREE.notePick(ch, c, a);   // AI 제안 채택 = 좋음(5) 기록(평가 루프와 같은 경로)
        regen(c); autosave(); refreshFrames(a.specId); renderInspector();
        log(`${a.specId} 시안 ${ch.label}`);
      },
    });
    // AI 추가 제안(11-06): 로컬 서버(큐 지원·엔진 있음)일 때만 버튼이 보인다 — health 는 비동기라 처음엔 숨기고 오면 보이게. 도착 배지 클릭 → 「다른 시안 보기」
    { const ab = $('iAiMore'); if (ab) { FREE.hasServerJobs().then(ok => { if (ok && ab.isConnected) ab.hidden = false; }); ab.onclick = () => FREE.suggest(a, c); } }
    { const jb = $('iAiJob'); if (jb) jb.onclick = e => { if (e.target.closest('.aijob.done')) { const mb = $('iTplMore'); if (mb) mb.click(); else { renderInspector(); $('iTplMore')?.click(); } } }; }
    insp.querySelectorAll('#iVariants .vthumb').forEach(b => b.onclick = () => {
      const cur = currentVariantIndex(a), i = +b.dataset.vi; if (i === cur) return;
      pushHistory(`${artLabel(a)} 레이아웃 안 ${i + 1}`);
      const prev = a.variants[cur]?.style ?? {}; const next = a.variants[i].style;
      const st = { ...(a.overrides.style ?? {}) }; for (const key of Object.keys(prev)) delete st[key]; Object.assign(st, next);   // 이전 안의 키는 지우고 새 안의 키만
      a.overrides.style = st; a.variantSel = i; a.status = 'draft'; a.gateOverride = null;
      logEvent(c, 'variant_selected', { specId: a.specId, variant: i, label: a.variants[i].label, style: next });
      regen(c); autosave(); refreshFrames(a.specId); renderInspector();
      $('inspNote').textContent = `레이아웃 안 ${i + 1} — 이 산출물만`;
      log(`${a.specId} 레이아웃 안 ${i + 1} ${a.variants[i]?.label ?? ''}`);
    });
    $('iVariantAll').onclick = () => {
      const v = a.variants[currentVariantIndex(a)]; if (!v || !Object.keys(v.style ?? {}).length) return;   // 기본안은 전파할 값이 없다(버튼도 disabled)
      const spread = { ...v.style };   // 전파할 키·값 — restyleWith 뒤 안 목록이 재계산되므로 미리 잡아 둔다
      const before = new Map(c.artifacts.map(x => [x.key ?? x.specId, htmlHash(x.html)]));   // 전파 전 그림 지문 — 승인 산출물이 바뀌는지 보려고
      // 캠페인 프리셋으로 전파 — 쓸 수 없는 규격은 렌더러가 무시하고 자동 배치 그대로. 11-09 성능: 예전엔 restyleWith(그리기) → 정리 → 또 그리기(이중 렌더) — 정리를 먼저 하고 한 번만 그린다
      pushHistory(`레이아웃 안 일괄 「${v.label}」`);
      c.style = nextStyle(c, spread);
      logEvent(c, 'style_changed', {});
      // 전파 뒤 정리: 새 기준선에선 이 안이 곧 기본안 — 전파한 키와 값이 같은 개별값은 지우고(다르게 둔 값은 유지) 선택은 다시 센다
      for (const x of c.artifacts) {
        if (x.channel !== 'ad') continue;
        if (x.overrides?.style) { const st = { ...x.overrides.style }; for (const [k, val] of Object.entries(spread)) if (st[k] === val) delete st[k]; x.overrides.style = st; }
      }
      regen(c);   // 안 목록을 새 기준선으로 먼저 다시 세우고
      ensureAllVariants(c);
      let unapproved = 0;
      for (const x of c.artifacts) {
        if (x.channel !== 'ad') continue;
        x.variantSel = currentVariantIndex(x);   // 남은 개별값과 맞는 안으로(대개 0)
        if (x.status === 'approved' && before.get(x.key ?? x.specId) !== htmlHash(x.html)) { x.status = 'draft'; x.gateOverride = null; unapproved++; logEvent(c, 'artifact_unapproved', { key: x.key ?? x.specId, why: 'variant_all' }); }   // 승인된 산출물은 조용히 바뀌지 않는다(10-20 리뷰) — 그림이 달라졌으면 승인 해제
      }
      logEvent(c, 'variant_selected', { all: true, from: a.specId, label: v.label, style: spread, unapproved });
      autosave(); refreshFrames(); renderInspector();
      toast(`「${v.label}」 을 캠페인 전체에 — 쓸 수 없는 규격은 자동 배치 그대로${unapproved ? ` · 그림이 바뀐 승인 ${unapproved}장 해제` : ''}`);
    };
  }
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
  insp.querySelector('#iOpen').onclick = () => openHtml(resolveRefs(a.html));   // 새 창·저장용 — 그림 바이트째
  insp.querySelector('#iExp').onclick = () => { if (gateOf(a)?.state === 'blocked' && a.channel !== 'ad') { toast(a.channel === 'asset' ? (a.assetNote ?? '전달물 규정 미달 — 더 큰 원본을 받아야 합니다') : '규정 차단 — 고치기 전에는 내보낼 수 없어요'); return; } exportArtifactModal(a); };   // 검토용 미승인 내보내기는 허용. 차단 매체 소재는 이미지 전달만 막고 수정용 SVG 는 연다(10-28)
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
// 캠페인 공통 스타일 다시 세우기 — 캠페인 인스펙터(restyle: 색·글꼴은 피커에서)와 산출물 인스펙터(「이 안으로 전부」: 현재 값 그대로)가 같이 쓴다(10-20)
// AI 그림 판단 값(c.ai + 산출물 aiShape·프리셋) 걷어내기
function clearAiOverrides(c) {
  if (!c) return; c.ai = null;
  for (const a of c.artifacts ?? []) {
    const st = a.overrides?.style; if (!st?.aiShape) continue;
    const next = { ...st }; delete next.aiShape; delete next.kvTypeOverride; delete next.background; delete next.textTone; delete next.aiKvBox; delete next.aiFade; delete next.aiShapes; for (const k of PRESET_KEYS) delete next[k];
    a.overrides.style = next; a.status = 'draft'; a.gateOverride = null;
  }
}
// 승인 뒤 모습이 바뀌면 승인을 푼다 — 안 그러면 사람이 본 적 없는 그림이 「승인됨」으로 ZIP 에 나간다(11-02 실제 시험: 키비주얼 교체 뒤에도 승인됨)
function regenKeepingGate(c) {
  const before = new Map(c.artifacts.map(a => [a, a.html]));
  regen(c);
  let n = 0; for (const a of c.artifacts) if (a.status === 'approved' && a.html !== before.get(a)) { a.status = 'draft'; a.gateOverride = null; n++; }
  if (n) toast(`모습이 바뀐 ${n}장은 승인을 풀었어요 — 다시 확인해 주세요`);
}
function restyleWith(c, patch = {}, label = '스타일 변경', coalesce = false, { colors, fonts } = {}) {
  pushHistory(label, coalesce);
  c.style = nextStyle(c, patch, { colors, fonts });
  logEvent(c, 'style_changed', {});
  regenKeepingGate(c);
  autosave();
  refreshFrames();
  const n = $('inspNote'); if (n) n.textContent = '스타일 전체 반영됨';
  log('스타일 변경 → 전체 재생성');
}
// 지금 스타일 + patch → 새 스타일(저장하지 않음) — 정식 재렌더와 실시간 미리보기가 같은 값을 쓴다
function nextStyle(c, patch = {}, { colors, fonts } = {}) {
  return normalizeStyle({
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
    textColor: c.style.textColor ?? null,   // 직접 고른 글자색(11-02) — 색·글꼴만 바꿔도 남는다
    logoOrig: c.style.logoOrig ?? null, kvOrig: c.style.kvOrig ?? null,   // 전달물 원본(10-16)
    object: c.style.object ?? null,
    objectMeta: c.style.objectMeta ?? null,
    references: c.style.references ?? [],   // 참고용(10-28) — 색·글꼴을 바꿔도 남는다
    mode: c.style.mode,
    background: c.style.background,
    kvUse: c.style.kvUse,
    kvTypeOverride: c.style.kvTypeOverride ?? null,
    aiSlots: c.style.aiSlots ?? null,   // 11-10 Claude 가 고른 추가 시안 방향 — 색·글꼴만 바꿔도 남는다
    chipTone: c.style.chipTone,
    ...Object.fromEntries(PRESET_KEYS.map(k => [k, c.style[k]])),   // 편집 프리셋(10-14) — 색·글꼴만 바꿔도 풀리지 않게
    colors: colors ?? [c.style.palette.primary, c.style.palette.secondary, c.style.palette.accent],
    fonts: fonts ?? c.style.fonts,
    mood: c.style.mood,
    ...patch,
  });
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
  scheduleLint();   // 새로 깔린 소재의 규격 검사 — layoutArtboard 는 검사를 돌리지 않는다(10-28 매체 추가 생성에서 「검사 중」에 머물던 것)
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

// 매체 추가 생성(10-28 담당자 한희하) — 생성 뒤 같은 캠페인에 매체를 더 고르면 그 매체의 추출 규격만 더 만든다. 기존 소재·편집값·승인은 그대로(addArtifacts → regen 은 있는 산출물을 다시 만들지 않고 overrides 를 유지)
function mediaAddHtml(c) {
  const have = new Set(c.media ?? []);
  const nOf = id => extractSpecGroups([id]).reduce((n, g) => n + 1 + (g.twins?.length ?? 0), 0);
  const cands = pickableMedia(c.kind ?? 'event').filter(id => !have.has(id) && nOf(id) > 0);   // 추출 규격이 없는 매체(참고 규격뿐)는 「+ 산출물 추가」로
  return `<section class="isec" id="inspMediaAdd">
    <h3>매체 추가 생성 <span class="mode">같은 캠페인</span></h3>
    <div class="hint">지금 캠페인에 매체를 더 고르면 그 매체의 추출 규격만 추가로 만들어요 — 이미 만든 소재·편집값·승인은 그대로입니다. 있는 매체의 규격 하나를 더하려면 「+ 산출물 추가」.</div>
    ${cands.length ? `<div class="mcards" id="iMediaCards">${cands.map(id => `<button type="button" class="mcard" data-m="${id}" aria-pressed="false"><span class="mc-ck" aria-hidden="true"></span><b>${escH(mediumName(id))}</b><small>소재 ${nOf(id)}종</small></button>`).join('')}</div>
    <div class="row"><button class="btn pri" id="iMediaAddGo" style="flex:1">추가 생성</button><button class="btn" id="iAddSpec" style="flex:1">+ 산출물 추가</button></div>` : `<div style="font-size:12px;color:var(--sub)">고를 수 있는 매체를 전부 썼어요.</div><button class="btn" id="iAddSpec" style="width:100%">+ 산출물 추가</button>`}
    </section>`;
}
function bindMediaAdd(insp, c) {
  insp.querySelectorAll('#iMediaCards .mcard').forEach(b => b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  insp.querySelector('#iAddSpec')?.addEventListener('click', () => addArtifactModal());
  insp.querySelector('#iMediaAddGo')?.addEventListener('click', () => {
    const ids = [...insp.querySelectorAll('#iMediaCards .mcard.on')].map(b => b.dataset.m);
    if (!ids.length) { toast('추가할 매체를 고르세요'); return; }
    const picks = ids.flatMap(id => extractSpecGroups([id]).map(g => ({ specId: g.id, purpose: 'main', arrow: null }))).filter(p => SPECS[p.specId]);
    if (!picks.length) { toast('그릴 수 있는 추출 규격이 없어요'); return; }
    const before = c.artifacts.length;
    pushHistory(`매체 추가 생성 ${ids.map(mediumName).join('·')}`);
    addArtifacts(picks);
    const n = c.artifacts.length - before;
    logEvent(c, 'media_added', { media: ids, count: n });
    log(`매체 추가 생성: ${ids.map(mediumName).join(', ')} — 소재 ${n}장 추가(기존 ${before}장 그대로)`);
    toast(`${ids.map(mediumName).join('·')} 소재 ${n}장 추가 — 기존 소재는 그대로`);
    renderInspector();
  });
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
// 매체 소재 파일명 — 담당자가 매체사에 그대로 넘긴다(10-28 담당자 실제 양식): 기업명_매체_상품명_배너이름_WxH.확장자 (core/adspecs.js adFileNameOf). 회차는 ZIP 폴더명(v회차)
// 전달물 파일 — 올린 원본(style.logoOrig/kvOrig, 없으면 손질본). 원본 가로가 규정 최소 폭(로고 500 · 이미지 720)보다 작으면 그 폭으로 확대해서 넘긴다(비율 유지, PNG 알파 유지 — 10-16 사용자 「저 크기에 꽉 차야」). 없으면 null
// 전달 이미지(자소설 M시작배너 ② 이미지 720px↑)의 투명 몫 — 배경 없는 누끼(알파 PNG)는 매체가 미승인(10-28 담당자). 이 비율을 넘으면 캠페인 지면색으로 배경을 합성해 보낸다
const ASSET_ALPHA_MAX = 0.02;
function alphaRatioOf(img) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height; if (!w || !h) return null;
  const k = Math.min(1, 256 / Math.max(w, h)), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0, cv.width, cv.height);
  const d = g.getImageData(0, 0, cv.width, cv.height).data; let t = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) t++;
  return t / (d.length / 4);
}
const loadImage = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
// 전달물 배경 — 캠페인 지면(core/field.js resolveField: 직접 고른 색 → 키비주얼 가장자리 → 브랜드색). 그라데이션이면 위→아래
function assetBgOf(c) { try { const f = resolveField(c.style, { facing: 'left' }); return (f?.stops?.length ? f.stops : null) ?? [c.style.palette?.primary ?? '#FFFFFF']; } catch { return [c.style.palette?.primary ?? '#FFFFFF']; } }
async function assetFileOf(a) {
  const c = state.campaign, spec = SPECS[a.specId], item = spec?.asset?.item, minW = spec?.asset?.minW ?? 0;
  a.assetNote = null;
  if (a.lint?.level === 'block') return null;   // 사유는 a.lint — 알림은 호출처가 한다   // 규정 폭 절반 미만 원본은 늘려 보내지 않는다
  const src = item === '로고' ? (c.style.logoOrig ?? c.style.logo) : (c.style.kvOrig ?? c.style.keyVisual); if (!src || !/^data:/.test(src)) return null;
  const clean = v => String(v ?? '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 40);
  const core = c.context.core; const who = [clean(c.kind === 'recruit' ? core.client : core.name)];   // 10-28 파일명 양식: 기업명_매체_상품_파일(직무·회차 없음)
  const base = [...who, clean(spec.mediumName), 'M시작배너패키지', item === '로고' ? '로고파일' : '이미지파일'].filter(Boolean).join('_');
  const toBytes = (dataUrl) => { const m = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/); if (!m) return null; const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]); const data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i); return { data, mime: m[1] }; };
  const img = await loadImage(src);
  const w0 = img?.naturalWidth || 0, h0 = img?.naturalHeight || 0;
  // 이미지 전달물: 알파가 큰 원본(누끼)은 지면색 배경을 합성한다(10-28 담당자 「배경 입힌 이미지로 만들거나 미승인 알림」). 로고는 투명 PNG 가 규정이라 그대로
  let alpha = null; if (item !== '로고' && img) { try { alpha = alphaRatioOf(img); } catch { alpha = null; } }
  const needBg = alpha != null && alpha > ASSET_ALPHA_MAX;
  if (item !== '로고' && !img) { a.assetNote = '이미지 원본을 읽지 못해 배경 합성 여부를 확인할 수 없어요 — PNG/JPG 로 다시 올려 주세요'; return null; }
  if (w0 && ((minW && w0 < minW) || needBg)) {   // 확대 · 배경 합성
    // 배경 합성은 카드 비율(720×405)에 누끼를 안쪽에 앉힌 완성 이미지 — 담당자 예시(제주항공·KT&G)는 칸을 꽉 채운 그림이다. 누끼 크기 그대로 깔면 723×274 처럼 가늘고 잘려 보인다(노션 #6)
    const AR = (spec.w && spec.h) ? spec.w / spec.h : 16 / 9;
    const cw = needBg ? Math.round(Math.max(minW || 720, Math.min(1920, Math.max(w0 / 0.8, (h0 / 0.82) * AR)))) : 0, ch = needBg ? Math.round(cw / AR) : 0;
    const k = !needBg && minW && w0 < minW ? minW / w0 : 1, cv = document.createElement('canvas'); cv.width = needBg ? cw : Math.round(w0 * k); cv.height = needBg ? ch : Math.max(1, Math.round(h0 * k));
    const g = cv.getContext('2d');
    const bg = needBg ? assetBgOf(c) : null;
    if (bg) { if (bg.length > 1) { const gr = g.createLinearGradient(0, 0, 0, cv.height); bg.forEach((col, i) => gr.addColorStop(i / (bg.length - 1), col)); g.fillStyle = gr; } else g.fillStyle = bg[0]; g.fillRect(0, 0, cv.width, cv.height); }
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (needBg) { const f = Math.min(cw * 0.8 / w0, ch * 0.82 / h0), dw = w0 * f, dh = h0 * f; g.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh); } else g.drawImage(img, 0, 0, cv.width, cv.height);
    const png = !bg && (item === '로고' || /png|svg|webp|gif/.test(src.slice(5, 20)));   // 배경을 깔았으면 알파가 없으니 JPG(규정 PNG/JPG) — 로고와 알파 가능 포맷은 PNG, 사진(JPEG)은 JPEG 0.92
    let out; try { out = png ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.92); } catch { a.assetNote = '배경을 합성할 수 없는 원본이에요(캔버스 변환 실패) — 배경 있는 PNG/JPG 를 올려 주세요'; return null; }
    const b = toBytes(out); return { name: `${base}.${png ? 'png' : 'jpg'}`, data: b.data, mime: b.mime, scaled: k > 1 ? [w0, cv.width] : null, composited: bg ? { ratio: alpha, bg } : null };
  }
  const b = toBytes(src); if (!b) return null;
  const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' })[b.mime] ?? 'png';
  return { name: `${base}.${ext}`, data: b.data, mime: b.mime, scaled: null, composited: null };
}
const assetCompositeText = f => f?.composited ? `배경 없는 누끼(투명 ${Math.round(f.composited.ratio * 100)}%)라 캠페인 지면색 ${f.composited.bg.join('→')} 배경을 합성해 넣었어요 — 배경 있는 원본을 올리면 그대로 나갑니다` : null;
function adFileName(a, fmt) {
  const c = state.campaign, core = c.context.core, spec = SPECS[a.specId];
  return adFileNameOf({ client: c.kind === 'recruit' ? core.client : core.name, mediumName: spec.mediumName, spec, ext: fmt });
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
const artRenderOpts = a => ({ variant: a.variant ?? 0, purpose: a.purpose, arrow: a.arrow, size: a.size });   // renderArtifact 옵션 — generate.js 가 보드를 그릴 때와 같은 것(10-20)
// 내보낼 때도 보드와 같은 스타일 — 산출물 개별 값(overrides.style: 알약 톤·프리셋)과 직접 수정(overrides.layout)을 얹는다(10-14 generate.js 와 같은 합성)
const adEffStyle = a => { const c = state.campaign; let s = a.overrides?.style && Object.keys(a.overrides.style).length ? resolveAiStyle(c, { ...c.style, ...a.overrides.style }, SPECS[a.specId]) : c.style; if (a.overrides?.layout && Object.keys(a.overrides.layout).length) s = { ...s, manualLayout: a.overrides.layout }; return s; };
// renderFit 은 renderAd 를 직접 부르므로 renderArtifact 가 spec 에 얹던 시안 번호·용도·화살표·규격을 여기서 같이 얹는다(보드·썸네일과 같은 출력, 10-20)
function adSpecOf(a) {
  const o = artRenderOpts(a), spec = { ...SPECS[a.specId], variant: o.variant ?? 0, purpose: o.purpose ?? 'main', arrow: o.arrow ?? null };
  if (o.size?.wmm) { spec.wmm = o.size.wmm; spec.hmm = o.size.hmm; }
  if (o.size?.w) { spec.w = o.size.w; spec.h = o.size.h; }
  return spec;
}
// opts.allVariants — 레이아웃 안이 여럿인 규격은 안마다 파일(…__안N). 선택안은 개별 편집값까지, 나머지 안은 캠페인 공통 + 안 프리셋
async function exportAdFiles(ads, opts = {}) {
  const c = state.campaign;
  const out = [];
  for (const a of ads) {
    const spec = adSpecOf(a);
    const eff = adEffCtx(a);
    const face = await exportFaceCss(artifactFontId(a)) + await elementFaceCss(a) + await freeFaceCss(a);   // 묶은 무료 폰트면 바이트째(10-14) — 래스터가 바깥 파일을 못 받는다. 자유 시안 글꼴(11-05)도
    const post0 = h => embedFont(h, face, BUNDLED_MARK), post = h => post0(applyElementEdits(h, a.overrides?.elements, spec));   // 요소 편집(11-02)은 고른 안에만
    const variants = (opts.allVariants && (a.variants?.length ?? 0) > 1) ? a.variants : null;
    if (!variants) {
      await opts.progress?.step(boardLabel(a));
      const fit = await renderFit(eff, adEffStyle(a), spec, post); opts.progress?.tick();   // 용량이 넘치면 규칙 안에서 다시 뽑는다(단색 배경 → JPG 품질)
      out.push({ a, spec, fit, name: adFileName(a, fit.measure.format === 'jpeg' ? 'jpg' : fit.measure.format) });
      continue;
    }
    const sel = currentVariantIndex(a);
    for (const [i, v] of variants.entries()) {
      const styleV = i === sel ? adEffStyle(a) : { ...c.style, ...v.style };
      await opts.progress?.step(`${boardLabel(a)} · 안 ${i + 1}`);
      const fitV = await renderFit(eff, styleV, spec, i === sel ? post : post0); opts.progress?.tick();
      const base = adFileName(a, fitV.measure.format === 'jpeg' ? 'jpg' : fitV.measure.format);
      out.push({ a, spec, fit: fitV, variant: i, variantLabel: v.label, name: base.replace(/(\.[a-z]+)$/, `__안${i + 1}$1`) });
    }
  }
  return out;
}
async function doAdExport(a, { force = false } = {}) {   // force: 차단 소재를 확인하고 내보냄(11-09 사용자 「차단된 것도 추출되게 — 확인만 하고」)
  toast('소재 생성 중…');
  try {
    const [{ fit, name }] = await exportAdFiles([a]);
    if (fit.lint.level === 'block' && !force) { toast(`규격 차단 — ${fit.lint.issues[0]?.msg ?? ''}`); return; }
    if (fit.lint.level === 'block') toast('규정 차단 소재를 내보냈어요 — 매체에서 반려될 수 있어요');
    download(fit.measure.blob, name);
    const kb = (fit.measure.bytes / 1024).toFixed(0);
    log(`내보내기: ${name} · ${kb}KB${fit.attempts.length > 1 ? ` (${fit.attempts.map(x => x.label).join('→')})` : ''}`);
    if (fit.fitted) toast(`용량 맞춤 — ${fit.fitted.label}, ${kb}KB${SPECS[a.specId]?.maxKB ? ` (상한 ${SPECS[a.specId].maxKB}KB)` : ''}`);
    closeModal();
  } catch (e) { toast(`실패: ${e.message}`); }
}
// SVG(Figma 편집용) — 용량 맞춤(단색 배경·JPG) 전의 원래 디자인을 옮긴다. Figma 에서 고친 뒤 디자이너가 다시 뽑기 때문이다.
// 글자는 살아 있는 텍스트(Pretendard), 그림·로고는 따로 레이어, 지면·그라데이션·녹임은 벡터(core/svgexport.js)
const SVG_NOTE = 'SVG(Figma 편집용): 작업 크기(1배, 캔버스 그대로)로 나가고 매체 제출 배수(2배)는 PNG/JPG 에만 적용됩니다. 글자는 텍스트, 키비주얼·로고는 따로 레이어로 들어갑니다. Figma에 같은 이름의 폰트(Pretendard, 또는 고른 무료 폰트)가 설치되어 있어야 글자가 그대로 보입니다.';
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
  const html = applyElementEdits(renderArtifact(a.specId, adEffCtx(a), adEffStyle(a), artRenderOpts(a)), a.overrides?.elements, spec);   // 보드와 같은 옵션(시안 번호·용도·화살표·규격) — renderAd 직접 호출은 variant 를 잃었다
  // SVG 파일 이름의 치수는 프레임 크기(작업 1배) — 제출 2배로 적으면 「…1100x800.svg」를 열었는데 550×400 이라 혼란(노션 SVG 프레임)
  const c0 = state.campaign, core0 = c0.context.core, svgName = adFileNameOf({ client: c0.kind === 'recruit' ? core0.client : core0.name, mediumName: spec.mediumName, spec: { ...spec, submitW: spec.w, submitH: spec.h }, ext: 'svg' });
  const r = await htmlToSvg(html, spec, { imgCache, title: svgName.replace(/\.svg$/, '') });
  return { ...r, name: svgName };
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
async function exportAdZip(withSvg = false, { allVariants = false, includeUnapproved = false, only = null, includeBlocked = null } = {}) {   // only: Set<키> — 선택한 소재만(11-02) · includeBlocked: 차단 소재 포함(null 이면 물어본다, 11-09)
  const c = state.campaign;
  // ZIP 은 승인분만(10-20 운영 모델) — 승인 게이트를 지난 것만 매체로 나간다. 검토용 낱장은 인스펙터 「내보내기」로.
  // 「미승인도 포함(검토용)」(10-21 사용자 「전체 선택했는데 1단계 산출물만 추출됨」 — 2·3단계는 게이트가 검수 필요라 승인분만 ZIP 에 들어갔다)을 켜면 차단 아닌 미승인도 「미승인_검토용/」 폴더로 함께
  let { all, approved, ads, assets } = pickForExport(c.artifacts, { only, includeUnapproved });   // app/select.js — only 가 있으면 선택한 소재(전달물 포함)만
  // 11-09 차단 소재: 확인을 받고 「규정차단_확인필요/」 폴더로 함께(매체 전달분과 섞지 않는다)
  const blockedArts = all.filter(a => gateOf(a)?.state === 'blocked');
  if (blockedArts.length && includeBlocked == null) { confirmBlockedExport(blockedArts, inc => exportAdZip(withSvg, { allVariants, includeUnapproved, only, includeBlocked: inc }), { canSkip: true }); return; }
  if (includeBlocked && blockedArts.length) { const keep = new Set([...ads, ...blockedArts]); ads = all.filter(a => keep.has(a)); }
  const blockedKey = new Set(includeBlocked ? blockedArts.map(a => a.key ?? a.specId) : []);
  if (only && !all.length) { toast('선택한 소재 중 매체 소재가 없어요'); return; }
  if (!ads.length) { toast(`승인된 매체 소재가 없어요 — 먼저 승인하거나 「미승인도 포함」을 켜세요(미승인 ${all.length}장)`); return; }
  if (!includeUnapproved && ads.length < all.length) toast(`승인분 ${ads.length}장만 ZIP 에 — 미승인 ${all.length - ads.length}장 제외(「미승인도 포함」으로 검토용 묶음 가능)`);
  if (includeUnapproved && approved.length < all.length) toast(`미승인 ${all.length - approved.length}장은 「미승인_검토용/」 폴더에 — 매체 전달은 승인분만`);
  const unapprovedKey = new Set(ads.filter(a => a.status !== 'approved').map(a => a.key ?? a.specId));
  if (allVariants) ensureAllVariants(c);   // 안 목록이 미뤄져 있으면 지금(11-09)
  const renderN = allVariants ? ads.reduce((n, a) => n + ((a.variants?.length ?? 0) > 1 ? a.variants.length : 1), 0) : ads.length;
  if (exportAdZip.running) return;   // 두 번 눌러도 한 번만
  exportAdZip.running = true;
  const modalBtns = [...document.querySelectorAll('#modalBtns button')]; modalBtns.forEach(b => { b.disabled = true; });
  const P = showProgress({ title: '소재 이미지 만드는 중', total: renderN });
  try {
    const files = await exportAdFiles(ads, { allVariants, progress: P });
    const blocked = files.filter(f => f.fit.lint.level === 'block');
    if (blocked.length && includeBlocked) toast(`규정 차단 ${blocked.length}건은 「규정차단_확인필요/」 폴더에 — 매체에서 반려될 수 있어요`);
    else if (blocked.length) { toast(`규격 차단 ${blocked.length}건 — 이미지는 ZIP 에서 제외${withSvg && includeUnapproved ? ' (수정용 SVG 는 미승인_검토용/svg/ 에)' : withSvg ? ' (「미승인도 포함」을 켜면 수정용 SVG 는 들어가요)' : ''}`); }
    const entries = [];
    for (const f of files.filter(f => includeBlocked || f.fit.lint.level !== 'block')) {
      const k0 = f.a?.key ?? f.a?.specId ?? f.spec.id;
      const pre = (f.fit.lint.level === 'block' || blockedKey.has(k0)) ? '규정차단_확인필요/' : unapprovedKey.has(k0) ? '미승인_검토용/' : '';
      entries.push({ name: pre + (f.variant != null ? `${f.spec.mediumName}/${f.spec.id}/${f.name}` : `${f.spec.mediumName}/${f.name}`), data: new Uint8Array(await f.fit.measure.blob.arrayBuffer()) });
    }
    // 전달물(자소설 M시작배너 로고·이미지 파일): 원본 바이트 그대로(10-16)
    const assetBlocked = assets.filter(a => a.lint?.level === 'block').length;
    if (assetBlocked) toast(`전달물 차단 ${assetBlocked}건 — ZIP에서 제외됨`);
    for (const a of assets.filter(a => a.lint?.level !== 'block')) { const f = await assetFileOf(a); if (f) { entries.push({ name: `${a.status !== 'approved' ? '미승인_검토용/' : ''}${SPECS[a.specId].mediumName}/${f.name}`, data: f.data }); if (f.scaled) { log(`전달물 ${f.name}: 원본 가로 ${f.scaled[0]}px → ${f.scaled[1]}px 확대`); toast(`${SPECS[a.specId].asset?.item} 원본이 가로 ${f.scaled[0]}px 로 작아 ${f.scaled[1]}px 로 늘려 넣었어요 — 더 큰 파일을 올리면 그대로 나갑니다`); } if (f.composited) { log(`전달물 ${f.name}: 투명 ${Math.round(f.composited.ratio * 100)}% → 지면색 ${f.composited.bg.join('→')} 배경 합성`); toast(assetCompositeText(f)); } } else if (a.assetNote) toast(`전달물 차단 — ${a.assetNote}`); }
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
    if (allVariants && files.some(f => f.variant != null)) {   // 규격마다 어느 번호가 승인(선택)안인지 — 받는 쪽이 __안N 중 무엇을 쓰면 되는지 알아야 한다(10-20 리뷰)
      const sel = files.filter(f => f.variant != null && f.variant === currentVariantIndex(f.a)).map(f => `■ ${artLabel(f.a)} — 선택안 안${f.variant + 1} (${f.variantLabel}) — 승인은 이 안 기준, 나머지 __안N 은 검토용`);
      entries.push({ name: '전달_안내.txt', data: new TextEncoder().encode(['「전체 안 포함」 내보내기 — 규격 폴더 안의 __안N 파일은 검토용 레이아웃 안입니다. 안이 하나뿐인 규격은 파일명에 __안이 없습니다.', '개별 편집값(라벨 알약 톤·직접 수정)은 선택안에만 반영되고, 나머지 안은 캠페인 공통 값 + 안 프리셋으로 나갑니다. SVG(Figma 편집용)는 선택안만 svg/ 폴더에 들어갑니다.', '', ...sel].join('\n')) });
    }
    if (!entries.length) { toast('내보낼 소재가 없어요'); return; }
    const rasterN = entries.length, svgFallbacks = new Set();
    let svgBlocked = 0;
    if (withSvg) {
      // 래스터와 같은 이름 규칙으로 svg/ 폴더에. 차단된 소재는 이미지(매체 전달)에서는 빠지지만, 「미승인도 포함(검토용)」이면 수정용 SVG 는 「미승인_검토용/svg/」에 넣는다(10-28 담당자 「미승인이어도 2차 수정용 추출 허용」)
      const enc = new TextEncoder(), cache = new Map();
      const svgTargets = files.filter(f => (f.fit.lint.level !== 'block' || includeUnapproved) && (f.variant == null || f.variant === currentVariantIndex(f.a)));   // SVG 는 선택안만
      P.phase('SVG(피그마 편집용) 만드는 중'); P.grow(svgTargets.length);
      for (const f of svgTargets) {
        await P.step(boardLabel(f.a));
        const r = await adSvgOf(f.a, cache); P.tick();
        r.fallbacks.forEach(x => svgFallbacks.add(x));
        const isBlocked = f.fit.lint.level === 'block'; if (isBlocked) svgBlocked++;
        const pre = (isBlocked || unapprovedKey.has(f.a?.key ?? f.a?.specId ?? f.spec.id)) ? '미승인_검토용/' : '';
        entries.push({ name: `${pre}svg/${r.name}`, data: enc.encode(r.svg) });
      }
      if (svgBlocked) toast(`차단 소재 ${svgBlocked}장은 수정용 SVG 만 「미승인_검토용/svg/」에 — 이미지 매체 전달은 막혀 있어요`);
    }
    P.phase('ZIP 으로 묶는 중'); await P.step('거의 다 됐어요');
    const vdir = `v${c.context.version}/`;   // 회차는 파일명이 아니라 폴더로(10-28 파일명 양식)
    const zip = buildZip(entries.map(e => ({ ...e, name: vdir + e.name })));
    download(new Blob([zip], { type: 'application/zip' }), `${String((c.kind === 'recruit' ? c.context.core.client : c.context.core.name) ?? c.id).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 40)}_매체소재${withSvg ? '+SVG' : ''}_v${c.context.version}.zip`);
    const fittedN = files.filter(f => f.fit.fitted).length;
    log(`내보내기: 매체 소재 ZIP ${rasterN}장${withSvg ? ` + SVG ${entries.length - rasterN}장` : ''} (${[...new Set(files.map(f => f.spec.mediumName))].join(', ')})${svgFallbacks.size ? ` · SVG 대체: ${[...svgFallbacks].join(' / ')}` : ''}${fittedN ? ` · 용량 맞춤 ${fittedN}장: ${files.filter(f => f.fit.fitted).map(f => `${f.name} ${f.fit.fitted.label} ${(f.fit.fitted.bytes / 1024).toFixed(0)}KB`).join(' / ')}` : ''}`);
    if (fittedN) toast(`용량 맞춤 ${fittedN}장 — 품질 단계·단색 배경으로 상한 아래로 (로그에 장별 용량)`);
    P.done(`완료 — ${entries.length}개 파일을 ZIP 으로 저장했어요`);
    closeModal();
  } catch (e) {
    P.close();
    if (e instanceof ProgressCancelled) toast('내보내기를 취소했어요'); else toast(`실패: ${e.message}`);
  } finally { exportAdZip.running = false; modalBtns.forEach(b => { b.disabled = false; }); }
}
// 차단 소재 내보내기 확인(11-09 사용자 「차단된 것도 추출되게 해 줘 — 확인만 하고」): 사유를 보여 주고 고르게 한다. go(true) = 포함 · go(false) = 빼고
function confirmBlockedExport(list, go, { canSkip = false } = {}) {
  const why = a => { const g = gateOf(a); const m = a.lint?.issues?.find(i => i.level === 'block')?.msg ?? g?.reasons?.[0] ?? '규정 미준수'; return `<li><b>${escH(artLabel(a))}</b> — ${escH(m)}</li>`; };
  modal({
    title: `규정 차단 소재 ${list.length}건`,
    desc: '매체 규정에 맞지 않아 반려될 수 있어요. 사유를 확인하고 내보낼지 골라 주세요.',
    body: `<ul style="font-size:12.5px;line-height:1.7;margin:0;padding-left:18px;max-height:260px;overflow:auto">${list.slice(0, 40).map(why).join('')}${list.length > 40 ? `<li>외 ${list.length - 40}건</li>` : ''}</ul>`,
    actions: [
      { label: '취소' },
      ...(canSkip ? [{ label: '차단 빼고 내보내기', fn: () => { go(false); return false; } }] : []),
      { label: list.length > 1 ? '확인했어요 — 포함해서 내보내기' : '확인했어요 — 내보내기', pri: true, fn: () => { go(true); return false; } },
    ],
  });
}
function exportAdModal(a) {
  const spec = SPECS[a.specId];
  const blocked = gateOf(a)?.state === 'blocked';   // 차단 소재: 이미지(매체 전달)는 막고 수정용 SVG 만(10-28 담당자 「미승인이어도 2차 수정용 추출」)
  modal({
    title: `${artLabel(a)} 내보내기`,
    desc: blocked ? '규정 차단 소재 — 차단 사유를 확인하면 이미지도 내보낼 수 있어요. 고치기 위한 SVG(Figma 편집용)도 뽑을 수 있어요.' : '매체 규격 그대로 — 치수·포맷·용량을 맞춰 뽑고, 규정에 안 맞으면 내보내지 않습니다.',
    body: `<div style="font-size:12.5px;color:var(--sub);line-height:1.7">${adRulesText(spec)}<br>파일명: <b>${adFileName(a, spec.format[0])}</b> · SVG 는 작업 크기 ${spec.w}×${spec.h}(1배)${a.fitNote ? `<br>용량 맞춤: ${escH(a.fitNote)}` : ''}</div>
      <div style="margin-top:10px">${lintHtml(a)}</div>
      ${blocked ? '<div style="font-size:12px;color:var(--danger);line-height:1.6;margin-top:8px">차단 사유를 고치면 그대로 내보낼 수 있어요. 지금 이미지가 필요하면 「확인하고 다운로드」 — 매체에서 반려될 수 있어요. SVG 는 수정용이에요.</div>' : ''}
      <div style="font-size:12px;color:var(--sub);line-height:1.6;margin-top:10px">${exportFontLine([a])}</div>
      <div style="font-size:12px;color:var(--sub);line-height:1.6;margin-top:6px">${SVG_NOTE}</div>`,
    actions: [
      { label: '닫기' },
      { label: blocked ? 'SVG (수정용)' : 'SVG (Figma 편집용)', pri: blocked, fn: () => { doAdSvg(a); return false; } },
      ...(blocked ? [{ label: '확인하고 다운로드', fn: () => { confirmBlockedExport([a], ok => { if (ok) doAdExport(a, { force: true }); }); return false; } }] : [{ label: '다운로드', pri: true, fn: () => { doAdExport(a); return false; } }]),
    ],
  });
}

function exportArtifactModal(a) {
  const spec = effSpec(a);
  const kk = a.key ?? a.specId;
  if (spec.channel === 'asset') { assetFileOf(a).then(f => { if (!f) { toast(a.assetNote ? `전달물 차단 — ${a.assetNote}` : a.lint?.level === 'block' ? '전달물 규정 미달 — 더 큰 원본을 받아야 합니다' : `${spec.asset?.item} 파일이 없어요 — 먼저 올려 주세요`); return; } download(new Blob([f.data], { type: f.mime }), f.name); log(`내보내기: 전달물 ${f.name}${f.scaled ? ` (가로 ${f.scaled[0]}→${f.scaled[1]}px 확대)` : ''}${f.composited ? ` (지면색 배경 합성)` : ''}`); if (f.scaled) toast(`원본이 가로 ${f.scaled[0]}px 로 작아 ${f.scaled[1]}px 로 늘려 넣었어요 — 가로 ${f.scaled[1]}px 이상 파일을 올리면 그대로 나갑니다`); if (f.composited) toast(assetCompositeText(f)); }); return; }
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
        { label: 'HTML 다운로드', pri: true, fn: () => { downloadText(resolveRefs(a.html), `${kk}.html`); log(`내보내기: ${kk}.html`); } },
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
      { label: 'HTML', fn: () => { downloadText(resolveRefs(a.html), `${kk}.html`); } },
      { label: 'PDF로 저장', pri: true, fn: () => { openPrintPdf(resolveRefs(a.html)); log(`내보내기: ${kk} PDF`); } },
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
    const blob = await rasterize(await withExportFont(resolveRefs(a.html), artifactFontId(a)), spec.w, spec.h, s, fmt);
    download(blob, `${kk}@${s}x.${fmt}`);
    log(`내보내기: ${kk}@${s}x.${fmt}`);
    closeModal();
  } catch (e) { toast(`실패: ${e.message}`); }
}

function exportAllModal() {
  const c = state.campaign;
  ensureAllVariants(c);   // 「전체 안 포함」 칸이 안 목록을 본다(편집 뒤 미뤄 둔 안, 11-09)
  const banners = c.artifacts.filter(a => a.channel === 'banner' || a.channel === 'gwthumb');
  const htmls = c.artifacts.filter(a => ['edm', 'landing'].includes(a.channel));
  const prints = (c.artifacts.filter(a => !['edm', 'landing', 'banner', 'gwthumb', 'ad'].includes(a.channel))).filter(a => a.channel !== 'asset');   // 전달물은 ZIP 으로 나간다 — 인쇄 PDF 가 아니다(11-02)
  const ads = c.artifacts.filter(a => a.channel === 'ad');
  const adsOk = ads.filter(a => a.status === 'approved');
  const picked = SEL.selected(); const pickedN = picked ? ads.filter(a => picked.has(a.key ?? a.specId)).length : 0;   // 선택하기(11-02) — 선택이 있으면 그것만이 기본
  const onlyOf = () => (pickedN && document.getElementById('expOnly')?.checked) ? picked : null;
  const zipOpts = () => ({ allVariants: !!document.getElementById('expAllVariants')?.checked, includeUnapproved: !!document.getElementById('expUnapproved')?.checked, only: onlyOf() });
  modal({
    title: pickedN ? `내보내기 — 선택 ${pickedN}장` : '전체 내보내기',
    desc: '온라인은 파일로 즉시, 인쇄물은 산출물별 PDF 저장으로 진행합니다. 매체 소재는 매체별 폴더로 묶은 ZIP.',
    body: `<div style="font-size:12.5px;color:var(--sub);line-height:1.8">
      ${ads.length ? (pickedN ? `· 매체 소재 ZIP — 선택한 ${pickedN}장(승인 ${ads.filter(a => picked.has(a.key ?? a.specId) && a.status === 'approved').length}장)<br>` : `· 매체 소재 ZIP — ${[...new Set(adsOk.map(a => SPECS[a.specId].mediumName))].join(', ') || '승인분 없음'} (<b>승인 ${adsOk.length}장</b> / 전체 ${ads.length}장${ads.length > adsOk.length ? ` · 미승인 ${ads.length - adsOk.length}장 제외` : ''})<br>`) : ''}
      · 온라인 HTML — ${htmls.map(a => a.specId).join(', ') || '없음'}<br>
      · 배너 PNG 2x — ${banners.map(a => a.specId).join(', ') || '없음'}<br>
      · 인쇄 PDF — ${prints.map(a => artLabel(a)).join(', ') || '없음'} <span style="opacity:.7">(각각 인쇄 대화상자)</span></div>
      ${ads.length ? `<div style="font-size:12px;color:var(--sub);line-height:1.6;margin-top:8px">${exportFontLine(ads)}</div>` : ''}
      ${pickedN ? `<label style="display:block;font-size:12px;margin-top:8px;font-weight:700"><input type="checkbox" id="expOnly" checked> 선택한 소재만(${pickedN}장) — 보드에서 고른 소재만 ZIP 에 (끄면 전체)</label>` : ''}
      ${ads.some(x => (x.variants?.length ?? 0) > 1) ? `<label style="display:block;font-size:12px;margin-top:6px"><input type="checkbox" id="expAllVariants"> 전체 안 포함 — 안이 여러 개인 규격은 규격 폴더에 안1·안2… (승인은 선택안 기준)</label>` : ''}
      ${ads.length > adsOk.length ? `<label style="display:block;font-size:12px;margin-top:6px"><input type="checkbox" id="expUnapproved"> 미승인도 포함(검토용) — 미승인 ${ads.length - adsOk.length}장을 「미승인_검토용/」 폴더에 같이 (매체 전달은 승인분만 · 차단 소재는 「ZIP + SVG」일 때 수정용 SVG 만)</label>` : ''}
      ${ads.length ? `<div style="font-size:12px;color:var(--sub);line-height:1.6;margin-top:8px">「ZIP + SVG」는 같은 ZIP 안 <b>svg/</b> 폴더에 소재마다 SVG를 함께 넣습니다. ${SVG_NOTE}</div>` : ''}`,
    actions: [
      { label: '닫기' },
      { label: 'HTML 일괄', fn: () => { htmls.forEach(a => downloadText(resolveRefs(a.html), `${a.specId}.html`)); log(`내보내기: HTML ${htmls.length}개`); } },
      ...(ads.length ? [{ label: 'ZIP + SVG', fn: () => { exportAdZip(true, zipOpts()); return false; } }, { label: '매체 소재 ZIP', pri: true, fn: () => { exportAdZip(false, zipOpts()); return false; } }] : []),
      { label: '배너 PNG 2x 일괄', pri: !ads.length, fn: () => { batchBanners(banners); return false; } },
    ],
  });
}
async function batchBanners(banners) {
  toast('배너 이미지 생성 중…');
  for (const a of banners) {
    const spec = effSpec(a);
    try { download(await rasterize(await withExportFont(resolveRefs(a.html), artifactFontId(a)), spec.w, spec.h, 2, 'png'), `${a.key ?? a.specId}@2x.png`); } catch {}
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
  const { impacted, conflicts } = propagateCore(c, patch);
  regen(c);   // 예전엔 propagate 가 공통 스타일로만 그려 개별값·요소 편집이 빠졌다 — 보드와 같은 정식 렌더로
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
  ensureAllVariants(c);   // 저장 기록의 안 목록은 지금 그림 기준(편집 경로는 안 계산을 미룬다, 11-09)
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
      variants: a.variants ?? null, variantSel: a.variantSel ?? 0,   // 레이아웃 안·고른 안(10-20 2단계) — 안은 다시 열 때 재계산되지만 기록으로 남긴다
    })),
    log: c.log,
  };
  const prevThumb = campStore.get(c.id)?.logoThumb;
  if (prevThumb && prevThumb.sig === logoSig(c.style?.logo)) snapshot.logoThumb = prevThumb;   // 목록 로고 썸네일(renderSidebar) — 로고가 그대로면 이어 쓴다
  // 11-02: 공간이 모자랄 때 키비주얼을 몰래 빼고 저장하던 동작을 없앴다 — 실패는 실패로 알린다
  return campStore.put(snapshot).then(r => { if (r.ok) saveFail.shown = false; else notifySaveFailed(r.error); return r; });
}

// 저장 실패 알림 — 자동 저장이 0.6초마다 돌아도 실패가 이어지는 동안 창은 한 번만, 그 뒤는 짧은 알림
const saveFail = { shown: false };
function notifySaveFailed(error) {
  console.warn('캠페인 저장 실패', error);
  log(`저장 실패: ${error?.name ?? ''} ${error?.message ?? ''}`.trim());
  if (saveFail.shown) { toast('아직 저장되지 않았어요 — JSON 으로 내려받아 두세요'); return; }
  saveFail.shown = true;
  modal({
    title: '캠페인을 저장하지 못했어요',
    desc: (isQuotaError(error) ? '이 브라우저의 저장 공간이 모자라요. 디스크 공간을 비우면 다시 저장돼요. ' : '브라우저 저장소가 쓰기를 거절했어요(사생활 보호 창이거나 저장소가 꺼져 있을 수 있어요). ')
      + '지금 화면의 작업은 그대로 있지만, 이 탭을 닫으면 마지막 저장 뒤의 변경이 사라져요.',
    body: '',
    actions: [
      { label: '닫기' },
      { label: '이 캠페인 JSON 내려받기', pri: true, fn: () => { if (state.campaign) downloadText(JSON.stringify(state.campaign), `${String(state.campaign.id).replace(/[^\w가-힣-]/g, '_')}.json`, 'application/json'); } },
    ],
  });
}
function reportStoreNotices() {
  for (const n of campStore.takeNotices()) {
    if (n.type === 'migrated') log(`저장 공간 옮김: 캠페인 ${n.moved}개를 IndexedDB 로`);
    else if (n.type === 'no-idb') { log('IndexedDB 를 쓸 수 없어 localStorage 로 저장'); toast('이 브라우저 환경에선 저장 공간이 작아요(약 5MB) — 일반 창을 권해요'); }
    else if (n.type === 'legacy-corrupt') { console.warn('옛 캠페인 저장 값이 망가져 옮기지 못했어요 — 지우지 않고 그대로 둡니다'); log('옛 캠페인 저장 값을 읽지 못해 그대로 뒀어요'); toast('예전 캠페인 저장 값을 읽지 못했어요 — 지우지 않고 그대로 뒀어요'); }
    else if (n.type === 'migrate-failed') { console.warn('캠페인 옮기기 실패', n); log(`저장 공간 옮기기 미완료(${n.moved ?? '?'}/${n.total ?? '?'}) — 원본을 지우지 않았고 다음 실행 때 다시 시도`); toast('예전 캠페인을 다 옮기지 못했어요 — 원본은 그대로 있어요'); }
  }
}
window.addEventListener('beforeunload', e => { if (campStore.hasUnsaved()) { e.preventDefault(); e.returnValue = ''; } });   // 저장 중이거나 실패한 게 있으면 닫기 전에 묻는다

// 목록에서 열기 — 가벼운 기록에 그림을 다시 끼워서 연다
async function openSavedCampaign(id) {
  let h = null;
  try { h = await campStore.hydrate(id); } catch (e) { console.warn(e); toast('캠페인을 열지 못했어요 — 저장소를 읽지 못했어요'); return; }
  if (!h) { toast('캠페인을 찾지 못했어요'); return; }
  openStored(h.rec);
  if (h.missing.length) toast(`저장된 그림 ${h.missing.length}개를 찾지 못했어요 — 다시 올려 주세요`);
}

const LOG_LABEL = {
  campaign_created: '캠페인 생성', artifact_generated: '산출물 생성', manual_edit: '개별 편집',
  propagation_run: '일괄 반영', style_changed: '스타일 변경', size_changed: '규격 변경',
  variation_cycled: '시안 변경', roster_loaded: '명단 적용', artifact_approved: '승인', artifact_unapproved: '승인 취소',
  campaign_reopened: '다시 열기', artifact_added: '산출물 추가', artifact_removed: '산출물 제거',
  variant_selected: '레이아웃 안 선택', media_added: '매체 추가 생성',
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
// 11-10 입력 개편 — 저장된 캠페인(IndexedDB 스냅샷 context.core · 산출물 overrides.core)의 고용형태·근무지(·자격·전형) 칸을 추가 행으로, 슬로건을 추가 문구로.
//   산출물별로 따로 고친 값(캔버스 편집)은 그 산출물의 행 목록(공통 행 + 그 값)으로 옮긴다. 바뀐 게 없으면 손대지 않는다
function migrateStoredRecruit(c, saved) {
  if (c.kind !== 'recruit' || !c.context?.core) return;
  const base = migrateRecruitCore(c.context.core);
  if (base !== c.context.core) { c.context = { ...c.context, core: base }; log('저장된 캠페인 이전 — 고용형태·근무지 칸 → 추가 행, 슬로건 → 추가 문구'); }
  for (const s of saved.artifacts ?? []) {
    const o = s.overrides?.core; if (!o) continue;
    const m = migrateRecruitCore({ ...o, rows: o.rows ?? (['employType', 'location', 'qualification', 'process'].some(k => o[k] != null) ? base.rows : o.rows) });
    if (m === o) continue;
    const LEG = ['employType', 'location', 'qualification', 'process', 'slogan'], next = {};
    for (const [k, v] of Object.entries(m)) if (!LEG.includes(k) && (v != null || k in o)) next[k] = v;
    s.overrides = { ...s.overrides, core: next };
  }
}
function openStored(saved) {
  state.campaign = { ...saved, log: saved.log ?? [], signage: saved.signage ?? {}, roster: saved.roster ?? [], excluded: saved.excluded ?? [], media: saved.media ?? [], adSpecIds: saved.adSpecIds ?? [] };
  migrateStoredRecruit(state.campaign, saved);   // 11-10 옛 고용형태·근무지·슬로건 → 추가 행·추가 문구(저장 데이터 이전 — 다음 자동 저장 때 새 구조로 쓰인다)
  // 저장된 대화도 되살린다 — 무엇을 어떻게 정했는지가 이력의 핵심이다
  state.intake = { ...(state.intake ?? {}), history: saved.conversation ?? [] };
  registerAll();
  // 저장된 개별 설정을 산출물 칸에 먼저 얹고 한 번만 그린다(11-09 성능 — 예전엔 그리고 → 얹고 → 다시 그렸다)
  ensureArtifacts(state.campaign);
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
    if (s.variantSel != null) a.variantSel = s.variantSel;   // 레이아웃 안 선택 — 뒤의 regen 이 범위 밖이면 0 으로 되돌린다
  }
  regen(state.campaign);   // 복원한 개별 설정을 반영해 렌더
  ensureAllVariants(state.campaign);   // 다시 열 때는 안 목록·선택을 바로 맞춘다(아래 currentVariantIndex)
  for (const a of state.campaign.artifacts) if (a.variants?.length > 1) a.variantSel = currentVariantIndex(a);   // 안 목록이 재계산돼 인덱스가 어긋나도 overrides 와 맞는 안으로
  migrateLogos(state.campaign);
  logEvent(state.campaign, 'campaign_reopened', {});
  enterWork();
  log(`저장된 캠페인 재현: ${campaignName(saved.context)}`);
  for (const e of (saved.log ?? []).slice(-8).reverse()) log(`· ${LOG_LABEL[e.type] ?? e.type}`);
}

/* ═══ 위쪽 막대 = 「Claude」 칩 하나 ═══ 11-10 사용자 「이거 하나로 합쳐져야」 — 설정 버튼(keyBtn)은 숨기고, 캠페인 JSON 내보내기·남은 API 키 지우기는 칩 창 아래로 */
function exportCampaigns() {   // 레이아웃 안 선택 집계(scripts/variant-stats.mjs)·사례 기록의 입구
  campStore.exportParts().then(({ parts, count }) => {
    if (!count) { toast('저장된 캠페인이 없어요'); return; }
    download(new Blob(parts, { type: 'application/json' }), 'mbm-campaigns.json'); log(`내보내기: mbm-campaigns.json (${count}개)`);
  }).catch(e => { console.warn(e); toast('내보내기 실패 — 저장소를 읽지 못했어요'); });
  return false;
}
const claudeExtras = () => [
  ...(LLM.getKey() ? [{ label: '남은 API 키 지우기', fn: () => { LLM.setKey(''); refreshAiChip(); toast('API 키를 지웠어요'); return false; } }] : []),
  { label: '캠페인 JSON 내보내기', fn: exportCampaigns },
];
$('keyBtn').onclick = () => $('claudeChip')?.click();

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
$('homeBtn').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show('home'); } };
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
// 11-10 Claude 그림 종류 판단 — 규칙 판정(kvTypeOf) 다음에 Claude 가 그림을 보고 다시 고른다(로컬 앱 + 연결된 계정만). apply(override|null, 결과, 같은가)
// ── 11-10 사용자 「기본안·추가 시안 3개는 규칙 + AI 가 판단만 도와서, 자유 디자인은 클릭해서」 ──
//   규칙 결과가 먼저 깔리고, Claude 판단(그림 종류 · 추가 시안 방향 · 그림 자리)이 오면 다시 그린다. 되돌리기 ⌘Z. 실패하면 규칙 결과 그대로.
const SLOT_KO = { A: { center: '가운데 정렬', mirror: '좌우 바꿈', full: '그림 가득' }, tag: { both: '라벨+날짜 태그', date: '날짜 태그', label: '라벨 태그' } };
function slotsText(sl) {
  const out = [];
  if (sl?.A) out.push(`A ${SLOT_KO.A[sl.A]}`);
  if (sl?.B) out.push(`B ${SLOT_KO.tag[sl.B.tag]}(${sl.B.shape === 'square' ? '각진' : '둥근'})`);
  if (sl?.C) out.push(`C 밝은 지면 ${sl.C.light ? '씀' : '안 씀'}`);
  return out.join(' · ');
}
function applyClaudeJudge(c, { ov = null, slots = null, name = '' } = {}) {
  const patch = {};
  if (ov) patch.kvTypeOverride = ov;
  if (slots && JSON.stringify(slots) !== JSON.stringify(c.style.aiSlots ?? null)) patch.aiSlots = slots;
  if (!Object.keys(patch).length) return;
  restyleWith(c, patch, `Claude 판단: ${name}`);
  if (state.campaign) renderInspector();
  toast(`Claude 판단을 반영했어요${patch.kvTypeOverride ? ` — 「${name}」` : ''}${patch.aiSlots ? ` · 추가 시안 ${slotsText(patch.aiSlots)}` : ''} (되돌리기 ⌘Z)`, 6000);
}
// AI 그림 판단 — 버튼(확인 받음)과 자동(Claude 연결 때 생성·그림 교체 직후) 같은 길. 자동은 사람이 이미 손댄 산출물은 건드리지 않는다
async function runKvAi(c, { auto = false, kv = c.style.keyVisual } = {}) {
  try {
    const res = await requestAnalysis({ kv: { dataUrl: await apiCopy(c.style.keyVisual), meta: c.style.kvMeta }, logo: c.style.logo ? { dataUrl: await apiCopy(c.style.logo, true), meta: c.style.logoMeta } : null, brief: c.context.core, brand: { primary: c.style.palette?.primary ?? null }, requests: '' });
    if (state.campaign !== c || c.style.keyVisual !== kv) return false;   // 그 사이 캠페인·그림이 바뀜
    const groups = await buildGroupStyles(res.analysis, { keyVisual: c.style.keyVisual, kvMeta: c.style.kvMeta, metaOf: async d => (await analyzeKeyVisual(d)).meta });
    pushHistory('AI 그림 판단');
    c.ai = { analysis: res.analysis, groups, fixes: res.fixes, usage: res.usage, cost: res.cost, model: res.model, effort: res.effort, ms: res.ms, at: new Date().toISOString(), ...(auto ? { auto: true } : {}) };
    let n = 0, kept = 0;
    for (const a of c.artifacts) {
      if (a.channel !== 'ad') continue; const spec = SPECS[a.specId]; if (!spec || !aiEligible(spec)) continue;   // 틀 고정 매체·비즈보드는 규칙 그대로
      const shape = shapeOfSpec(spec), g = groups[shape]; if (!g) continue;
      const touched = a.status === 'approved' || Object.keys(a.overrides?.style ?? {}).some(k => k !== 'aiShape' && !(k in (c.ai.groups?.[a.overrides?.style?.aiShape]?.patch ?? {}))) || Object.keys(a.overrides ?? {}).some(k => k !== 'style');
      if (auto && touched) { kept++; continue; }
      a.overrides = a.overrides ?? {}; a.overrides.style = { ...(a.overrides.style ?? {}), ...g.patch, aiShape: shape }; a.status = 'draft'; a.gateOverride = null; n++;
    }
    logEvent(c, 'ai_analysis', { model: res.model, cost: res.cost, artifacts: n, auto });
    regen(c); autosave(); refreshFrames(); renderInspector();
    log(`AI 그림 판단${auto ? '(자동)' : ''} — ${res.analysis.kv.type ?? '유형 자동'} · 규격 ${n}개에 적용${kept ? ` · 손댄 ${kept}개는 그대로` : ''} · ${Math.round(res.ms / 1000)}초`);
    toast(`Claude 그림 판단을 반영했어요 — ${n}개 규격${kept ? ` (손댄 ${kept}개는 그대로)` : ''} · 되돌리기 ⌘Z · 인스펙터 「AI 판단 해제」`, 6000);
    return true;
  } catch (e) { toast(`AI 그림 판단을 못 했어요 — 규칙 결과 그대로예요 (${e.message})`, 6000); return false; }
}
function autoKvAi(c, { kv = c?.style?.keyVisual } = {}) {
  if (!c || !kv || !claudeReady() || (c.ai && !c.ai.auto)) return;   // 사람이 직접 돌린 판단은 덮지 않는다
  if (!c.artifacts.some(a => a.channel === 'ad' && SPECS[a.specId] && aiEligible(SPECS[a.specId]))) return;
  runKvAi(c, { auto: true, kv });
}
async function claudeKvType(dataUrl, meta, apply) {
  if (!claudeReady() || !dataUrl || !meta) return;
  const T = kvTypeOf(meta);
  try {
    const r = await judgeKvType(dataUrl, meta, { id: T?.id, sub: T?.sub?.id, name: T?.sub?.name ?? T?.name });
    if (!r?.override) return;
    const same = r.override === T?.id || r.override === T?.sub?.id;
    apply(same ? null : r.override, r, same);
  } catch (e) { toast(`Claude 그림 판단을 못 했어요 — ${e.message}`, 5000); }
}
mountClaudeChip({ onChange: () => { LLM.setClaudeCli(claudeReady()); refreshAiChip(); }, extras: claudeExtras });
initHome();
show('home');
// 저장소를 다 읽으면(옛 localStorage 값 옮기기 포함) 목록을 그린다. 앱 시작은 붙들지 않는다
campStore.ready.then(() => { renderSidebar(side.query); reportStoreNotices(); }, e => { console.warn(e); toast('저장된 캠페인을 읽지 못했어요'); });
