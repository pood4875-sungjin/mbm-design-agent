// 광고 소재 렌더러 — 계약: (context, style, spec) → 자기완결 HTML.
//
// 세 층의 데이터가 그림을 정한다:
//   ① 매체 규격(spec.rules · spec.mediumRules) — 치수·안전영역·글자 슬롯·글자색·글꼴·폰트 크기·배경(투명)·로고 허용 : 지켜야 하는 것
//   ② 매체 템플릿 실측(rules.safeArea.measuredFromTemplate) — 로고 칸·문구 칸·이미지 영역의 좌표 : 자소설처럼 칸이 고정된 매체
//   ③ 매체 디자인 프로필(core/design.js) — 실제 나간 소재 N장에서 다수인 선택 : 그렇게 생겨야 하는 것
//      배경·오브젝트 위치와 폭·정렬·카피 줄 수·메인 글자 px·로고 자리·날짜 알약·서브가 메인 위인지
//   프로필이 비어 있으면(관찰 부족) 지면 비율로 판단하는 기본 문법(구글 GDN 28장)을 쓴다.
//
// 자소설 실제 소재(현대케피코·한독·세아제강)의 위계가 기준이다:
//   [로고 칸] → 서브(시즌 문구, 굵게·작게) → 메인(굵게 2~4줄) → 상세("라벨 : 값" 정보 줄, 가늘게) → [이미지 띠 전폭]
//
// 꾸밈은 최소로 둔다:
//   지면색은 키비주얼에서 읽는다(core/field.js) — 밝게/어둡게를 사람이 고르지 않는다. 그라데이션은 이미지에 있을 때만 생긴다.
//   이미지는 상자에 가두지 않고 지면 가장자리까지 붙인 뒤 글자 쪽 변만 지면으로 녹인다.
//   자간은 메인(28px 이상)만 −2.5%(CANON tracking — Figma 9월 공채 디자이너 17/27, 템플릿 매체는 0). 알약·구분선·빛 번짐 같은 장식을 넣지 않는다. 굵기는 400·700.
//
// 문구는 "사다리"에서 고른다(긴 표현 → 짧은 표현, 한도에 들어가는 가장 긴 것) — 지어내지 않는다.
// 모든 글자 요소에 data-field="<role>"을 심어 measure.js가 재고 lint.js가 판정한다. 렌더러는 검사하지 않는다.
// 절대배치는 템플릿이 좌표를 정한 로고 칸·이미지 영역에만 쓴다 — 글자는 그 영역을 피한 흐름 배치다.

import { esc, WRAP, fitFontSize, textWidth } from './banner.js';
import { fontStack } from '../fonts.js';
import { limitsByRole, roleOf, countChars, estimateLines, inImage, objectNeedOf } from '../adfields.js';
import { designOf } from '../design.js';
import { aiEligible } from '../trackb/analyze.js';
import { resolveField, brandDeep, kvLayer, kvPlacement, kvFull, coverPos, meltMask, meltMask2, meltMaskList, meltGradient, meltGradientFrom, meltLength, seamHexes, meltNeed, cutFadePct, profileFocus, subjectCrop, joinColour, joinField, objectBleedPlace, bleedLayer, cutoutCapW, meltMaskSides } from '../field.js';
import { layoutFor } from '../layouts.js';
import { guideFor, weightOf, CANON } from '../canon.js';
import { contrast, mix, hexToRgb, colorDistance, shiftHue, WHITE, BLACK } from '../palette.js';
import { editOf, transformCss, KV_SIZE_K, SCRIM_A, GRAD_ANGLE, placeAvail } from '../editlayout.js';
import { kvTypeOf } from '../kvtypes.js';
import { textAlignOf, alignLockOf, ALIGN_KV_PLACE, ALIGN_JUSTIFY, alignMoldSlots, alignObjectHtml, flipLR } from '../alignrule.js';   // 글자 정렬 프리셋(10-19) — 잠금·거울 계산은 저쪽, 여기는 훅만

const mmdd = d => String(d ?? '').replace(/^\d{4}-(\d{2})-(\d{2})$/, '$1.$2');
// 레퍼런스는 날짜에 요일을 붙인다 — "3.13(금)", "~7/26(일)" (안랩·삼진제약·한미글로벌·세아제강). 날짜로 읽히지 않으면 붙이지 않는다.
const dow = d => { const m = String(d ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return ''; const t = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(t) ? '' : '일월화수목금토'[t.getDay()]; };
const md = d => { const s = mmdd(d).replace(/^0/, '').replace(/\.0/, '.'); const w = dow(d); return w ? `${s}(${w})` : s; };

// 채용 구분 → 메인에 붙는 말. "신입" → "신입 채용", "신입사원 공개채용"처럼 이미 채용·공채·모집이 들어 있으면 그대로.
const hireOf = t => { const s = String(t ?? '').trim(); return !s ? '채용' : /채용|공채|모집/.test(s) ? s : `${s} 채용`; };
// 시즌이 없으면 마감일에서 — 레퍼런스 13장 중 12장이 "2024 상반기"·"2026년" 같은 시즌을 서브나 메인에 둔다
const seasonOf = d => { const m = String(d ?? '').match(/^(\d{4})-(\d{2})/); return m ? `${m[1]} ${+m[2] <= 6 ? '상반기' : '하반기'}` : null; };

// 일정을 말하는 고지 문구(「채용 일정은 공고별 상이」「상시 채용」「채용 시 마감」) — 마감일이 없을 때 날짜 자리를 대신한다
const SCHEDULE_NOTE = /일정|상이|상시|수시|채용\s?시\s?마감|마감\s?시/;
// 좁은 칸용 줄임 — 「* 채용 일정은 공고별 상이합니다.」 → 「채용 일정 공고별 상이」(한진 디자이너 잡다 PC 그대로)
const shortNote = t => String(t).replace(/^[*※]\s*/, '').replace(/(\S)[은는]\s/, '$1 ').replace(/\s*(합니다|입니다|됩니다)\.?$/, '').replace(/\.$/, '').trim();
// 맥락 → 역할별 문구 사다리(긴 것 → 짧은 것) + 상세 정보 줄. 채용이 기본, 행사 맥락도 같은 슬롯으로 흘린다.
// 채용 헤드라인 문법은 보드 레퍼런스(한미글로벌·세아제강·안랩·삼진제약·신한캐피탈)에서: 서브 = 시즌, 메인 = 회사 + 채용구분, 직무는 상세 줄.
// 좁은 세로 띠(도레이·PT코리아)는 회사가 서브로 올라가고 메인은 채용구분만 — *Narrow 사다리를 렌더러가 형태를 보고 고른다.
export function copyLadder(ctx) {
  const c = ctx.core ?? {};
  const uniq = arr => [...new Set(arr.filter(s => s != null && String(s).trim() !== ''))];
  if (ctx.kind === 'recruit') {
    // 마감 시각(deadlineTime 'HH:MM') — 정시는 「17시」, 아니면 「23:59」(10-14 t1014: GS에너지 「7.2(수) 17시」·LT소재·제일약품 「23:59」 디자이너 3곳). 날짜가 없으면 붙이지 않는다
    const tm = (() => { const m = String(c.deadlineTime ?? '').trim().match(/^(\d{1,2}):(\d{2})$/); return m ? (m[2] === '00' ? ` ${+m[1]}시` : ` ${m[1].padStart(2, '0')}:${m[2]}`) : ''; })();
    const d = c.deadline ? md(c.deadline) + tm : '', s0 = c.startDate ? md(c.startDate) : '';
    const period = d ? (s0 ? `${s0} - ${d}` : `~${d}`) : '';
    const qual = c.qualification ? String(c.qualification) : '';
    const scheduleNote = (!period && c.notice && SCHEDULE_NOTE.test(String(c.notice))) ? String(c.notice).trim() : null;
    const season = c.season || seasonOf(c.deadline);   // 적지 않았으면 마감일에서 유추(10월 마감 → 2026 하반기) — 정보가 없다고 비워 두지 않는다(10-06 사용자 "정보 없는 건 임의로 넣어야지")
    // 슬로건이 없으면 회사명을 넣은 기본 아이브로 — 세로형·정사각에서 글자가 얇아 비어 보이지 않게. 지어낸 사실이 아니라 채용 안내의 상투구
    const slogan0 = c.slogan || (c.client ? `${c.client}에서 함께할 인재를 찾습니다` : null);   // 좁은 띠(narrowMain 분기)와 구글 아이브로가 쓴다
    const slogan = c.slogan ?? null;
    const hire = hireOf(c.hiringType || c.employType);   // 채용구분이 없으면 고용형태로("정규직 채용")
    const named = hire !== '채용';
    // 메인을 직접 적어 준 경우(한독 "전문의약품 의료기기 영업∙마케팅 공채 모집") 회사·구분은 서브로 간다
    const subFull = [season, c.client, named ? hire : null].filter(Boolean).join(' ');
    const clientHire = c.client ? `${c.client} ${hire}` : null;
    // 세로 띠: 서브가 회사를 품으면 메인은 채용구분만(도레이·한독). 슬로건이 서브를 차지하면 회사·기수가 메인으로(PT코리아 "PTKOREA / 2026 8기 / 신입공개채용")
    const narrowMain = slogan0
      ? [c.headline, [c.client, c.season, hire].filter(Boolean).join(' '), clientHire, named ? hire : null]
      : [c.headline, named ? hire : null, clientHire];
    return {
      main: uniq([c.headline, clientHire, named ? hire : null, c.role ? `${c.role} 채용` : null, c.client ? `${c.client} 채용` : null, '채용 공고']),
      sub: uniq([c.headline ? subFull : null, slogan, season, slogan0, c.client ? `${c.client} 채용` : null, c.employType, '채용 공고']),
      // 가로형은 메인 한 줄에 시즌까지(삼진제약 "2026년 삼진제약 부문별 채용") — 적어 준 시즌만. 마감일로 유추한 시즌은 넣지 않는다
      mainWide: uniq([c.headline, season ? [season, c.client, hire].filter(Boolean).join(' ') : null, clientHire, named ? hire : null, c.client ? `${c.client} 채용` : null, '채용 공고']),
      mainNarrow: uniq([...narrowMain, c.role ? `${c.role} 채용` : null, '채용 공고']),
      subNarrow: uniq([c.headline ? subFull : null, slogan, [season, c.client].filter(Boolean).join(' '), season, c.client, slogan0]),
      // 날짜가 혼자 한 줄에 설 때(서브·날짜 줄)는 라벨을 붙이지 않는다 — Figma 9월 공채 디자이너 12/12 무라벨(10-08 typo A7). 상세 목록 안에서는 「접수기간」 라벨 유지(details)
      // 마감일이 없고 고지 문구가 일정을 말하면(「* 채용 일정은 공고별 상이합니다.」) 그 문구가 날짜 자리를 쓴다 — 자리표시 「0/00(월) ~ 0/00(일)」 대신(10-14 t1014 한진정보통신 디자이너 9/9 날짜 없음, 3/9 이 문구)
      date: uniq(period ? [period, d ? `~${d}` : null] : scheduleNote ? [scheduleNote, shortNote(scheduleNote), shortNote(scheduleNote).split(/\s+/).slice(-2).join(' ')] : []),   // 칸이 좁으면 마감일만(자소설 달력 「~02/01」 3/3, 블라인드·NAP 「~9/16(수)」) — byWidth 가 들어가는 쪽을 고른다
      extra: uniq([qual, qual.split(/[·,/]/)[0]?.trim()]),
      advertiser: uniq([c.client]),
      cta: uniq([c.ctaText, '지원하기', '지원']),
      notice: uniq([scheduleNote ? null : c.notice]),
      // 라벨 칩은 날짜 앞의 「접수기간」이 먼저(잡다 PC 5/5 「모집기간」 칩 + 날짜, NAP 320×480 「모집기간」 칩 — 10-12 매체별 규격정리). 날짜가 없으면 직무·고용형태
      label: uniq([period ? '접수기간' : null, c.role ? `모집직무 : ${c.role}` : null, c.employType]),
      url: uniq([c.applyUrl ? String(c.applyUrl).replace(/^https?:\/\//, '') : null]),
      // 상세 정보 줄 — 우선순위 순. 자리(줄 수)가 모자라면 뒤에서부터 뺀다.
      details: [
        period ? { label: '접수기간', value: period } : null,
        c.role ? { label: '모집직무', value: c.role } : null,
        c.location ? { label: '근무지', value: c.location } : null,
        c.employType ? { label: '고용형태', value: c.employType } : null,
        qual ? { label: '지원자격', value: qual } : null,
      ].filter(Boolean),
    };
  }
  // 행사(세미나) — 아이브로 = 슬로건·주최, 메인 = 적어 준 헤드라인 또는 "연도 행사명", 상세 = 일시·장소·대상·사전등록 마감·주최 (2026-10-06 행사 트랙 통합)
  const day = s => { const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return String(s ?? ''); const t = new Date(+m[1], +m[2] - 1, +m[3]); return `${+m[2]}.${+m[3]}(${'일월화수목금토'[t.getDay()]})`; };
  const d = c.date ? day(c.date) : '', dl = c.deadline ? day(c.deadline) : '';
  const year = String(c.date ?? '').match(/^(\d{4})/)?.[1] ?? '';
  const nameYear = c.name && year && !String(c.name).includes(year) ? `${year} ${c.name}` : c.name;
  // 좁은 칸(카카오 비즈보드 메인 글자수)에서는 행사명에서 연도·장소 꼬리를 떼고, 그래도 안 들어가면 슬로건이 메인이 된다 — "행사 안내"는 맨 끝
  const nameShort = c.name ? String(c.name).replace(/(^|\s)(19|20)\d{2}(년)?(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim() : null;
  const nameCore = nameShort && nameShort.split(' ').length > 2 ? nameShort.split(' ').slice(0, -1).join(' ') : null;
  const mainLadder = uniq([c.headline, nameYear, c.name, nameShort, nameCore, c.slogan, '행사 안내']);
  return {
    main: mainLadder,
    sub: uniq([c.slogan, c.host, c.audience ? `${c.audience} 대상` : null, d]),
    mainWide: mainLadder,
    mainNarrow: uniq([c.headline, c.name, nameShort, nameCore, c.slogan, '행사 안내']),
    subNarrow: uniq([c.slogan, c.host, year]),
    date: uniq([d ? `일시 : ${d}` : null, d, dl ? `사전등록 ~${dl}` : null]),
    extra: uniq([c.audience, c.venue]),
    advertiser: uniq([c.host]),
    cta: uniq([c.cta, '사전등록']),
    notice: [],
    label: uniq([c.audience ? `대상 : ${c.audience}` : null, c.venue]),
    url: uniq([c.applyUrl ? String(c.applyUrl).replace(/^https?:\/\//, '') : null]),
    details: [
      d ? { label: '일시', value: d } : null,
      c.venue ? { label: '장소', value: c.venue } : null,
      c.audience ? { label: '대상', value: c.audience } : null,
      dl ? { label: '사전등록', value: `~${dl}` } : null,
      c.host ? { label: '주최', value: c.host } : null,
    ].filter(Boolean),
  };
}
export function copyFor(ctx) {
  const l = copyLadder(ctx);
  return Object.fromEntries(Object.entries(l).filter(([k]) => k !== 'details').map(([k, v]) => [k, v[0] ?? '']));
}

// 매체 템플릿 실측이 캔버스와 다른 프레임 기준일 때(자소설 PC달력배너: 328×466 = 2배) 그 비율로 환산한다.
export function templateScale(rules, w) {
  const src = `${rules?.safeArea?.measuredFromTemplate?.frame ?? ''} ${rules?.fontSizes?.unit ?? ''}`;
  const m = src.match(/(\d{2,4})\s*[×x*]\s*(\d{2,4})/);
  if (!m) return 1;
  const fw = Number(m[1]);
  return fw > 0 && fw !== w ? w / fw : 1;
}
function statedFontSizes(rules, scale = 1) {
  const out = {};
  for (const [k, v] of Object.entries(rules?.fontSizes ?? {})) {
    if (typeof v !== 'number') continue;
    const role = roleOf(k);
    if (role !== 'other' && out[role] == null) out[role] = Math.round(v * scale);
  }
  return out;
}
function safePad(rules, fallback) {
  const sa = rules?.safeArea;
  const n = k => (sa && typeof sa[k] === 'number') ? sa[k] : null;
  const any = sa && ['top', 'right', 'bottom', 'left'].some(k => typeof sa[k] === 'number');
  if (!any) return { top: fallback, right: fallback, bottom: fallback, left: fallback, stated: false };
  return { top: n('top') ?? fallback, right: n('right') ?? fallback, bottom: n('bottom') ?? fallback, left: n('left') ?? fallback, stated: true };
}
const val = (m, fallback = null) => (m && m.value != null ? m.value : fallback);
const rect = (r, k) => r ? { x: Math.round(r.x * k), y: Math.round(r.y * k), w: Math.round(r.w * k), h: Math.round(r.h * k), ...(r.radius != null ? { radius: Math.round(r.radius * k) } : {}) } : null;   // radius: 틀 그림 칸 모서리(카카오 비즈보드 템플릿 64:3325 오브젝트 상자 r10, 10-16)

// 버튼(CTA)은 그리지 않는다 — 2026-10-02 사용자 결정("버튼 빼줘 그냥, 우선"). 실제 소재 141장에도 버튼은 없었다. 되살릴 때는 이것만 켠다.
const SHOW_CTA = false;


// 누끼 떼의 '틈 창' — 열 투명 프로필(cols, 투명 비율)에서 캐릭터 사이 틈(≥75%) 두 곳을 골라 그 사이만 보여 준다(배율 k = 1/창 폭). 자르기 선이 얼굴·몸통을 가르지 않는다(ABL 떼).
// kTarget에 가장 가까운 창을 고른다. 틈이 없으면(건물 장면) null → 가운데 맞춤 배율 규칙으로
function cutWindow(cols, kTarget, kMax = 2.4) {
  if (!cols?.length) return null;
  const n = cols.length, gaps = [];
  for (let i = 0; i < n; i++) if ((cols[i]?.bg ?? 0) >= 0.75) gaps.push((i + 0.5) / n);
  if (gaps.length < 2) return null;
  let best = null;
  for (const a of gaps) for (const b of gaps) { const wf = b - a; if (wf <= 0) continue; const k = 1 / wf; if (k < 1.15 || k > kMax) continue; const d = Math.abs(k - kTarget); if (!best || d < best.d) best = { k: Math.round(k * 100) / 100, left: Math.round(a * 1000) / 1000, d }; }
  return best;
}
let LAST_TR = null;   // renderAdBase 가 만든 추적 객체(겹침 교정이 글자 상자·그림 칸을 읽는다)
function renderOnce(ctx, style, spec) {
  const bust = bustOf(style, spec);
  const html = !bust ? renderAdBase(ctx, style, spec) : bustCrop(renderAdBase(ctx, { ...style, kvMeta: bust.meta }, spec), style, bust, spec);
  const used = bust ? { ...style, kvMeta: bust.meta } : style;
  return { html: cutFade(meltFix(fieldAlign(html, used, spec, LAST_TR), used, spec, LAST_TR), used, spec, LAST_TR), tr: LAST_TR, styleUsed: used };
}
// 지면 그라데이션을 그림 자리에 맞춘다(10-20 사용자 「배경색 일관되지 않게 나오는 것도 문제」 + 이음 전수 감사 bg-box·seam-far kv-edge 367변):
//   캠페인 공통 지면(core/field.js edgeField·moodStops — 그림 네 변에서 한 번 정한 그라데이션, field.align { axis v|h, at [두 끝 색이 그림 길이의 어느 몫인가] })을
//   규격마다 실제 그림 사각형에 px 로 건다 — `linear-gradient(180deg, 위색 (그림 위+3%)px, 아래색 (그림 아래−3%)px)`. 그림 밖은 CSS 가 양 끝 색으로 늘인다.
//   전에는 지면 그라데이션이 캔버스 전체(0~100%)에 걸려 그림(캔버스 일부)의 가장자리 색과 어긋났다(desk-21 세로 그라데이션 일러스트: 자리 변에서 색 차 0.33). 틀 지면 영역(data-mold-field)도 같은 px 로(그 상자 기준으로 뺀다)
function fieldAlign(html, style, spec, tr) {
  const F = tr?.field; if (!F?.align || !(F.stops?.length === 2) || !F.css) return html;
  if ((style.kvMeta?.field?.opaque ?? 1) < 0.5) return html;
  const W = spec.w, H = spec.h; if (!(W > 0 && H > 0)) return html;
  const px = style.kvMeta?.px, ar0 = style.kvMeta?.ar;
  const num = (s, k) => { const m = s.match(new RegExp('(?:^|;)' + k + ':(-?[\\d.]+)(?:px)?(?=;|$)')); return m ? parseFloat(m[1]) : null; };
  let best = null;
  for (const m of html.matchAll(/<div data-object="1"((?:\s+data-[a-z0-9-]+="[^"]*")*) style="([^"]*)"/g)) {
    const attrs = m[1], st = m[2]; if (/data-kv-only/.test(attrs) || /inset:0/.test(st)) continue;
    const bw = num(st, 'width'), bh = num(st, 'height'); if (!(bw > 0 && bh > 0)) continue;
    const bx = num(st, 'left') ?? (num(st, 'right') != null ? W - num(st, 'right') - bw : null), by = num(st, 'top') ?? (num(st, 'bottom') != null ? H - num(st, 'bottom') - bh : null);
    if (bx == null || by == null) continue;
    const pic = picOf(st, bw, bh, px, ar0); if (!pic) continue;
    if (!best || bw * bh > best.area) best = { area: bw * bh, P: { l: bx + pic.ox, t: by + pic.oy, w: pic.dw, h: pic.dh } };
  }
  if (!best) return html;
  const { P } = best, [t0, t1] = F.align.at, v = F.align.axis === 'v';
  const a = Math.round((v ? P.t + P.h * t0 : P.l + P.w * t0) * 10) / 10, b = Math.round((v ? P.t + P.h * t1 : P.l + P.w * t1) * 10) / 10;
  if (!(b > a)) return html;
  const css = (dx, dy) => `linear-gradient(${v ? 180 : 90}deg,${F.stops[0]} ${Math.round((a - (v ? dy : dx)) * 10) / 10}px,${F.stops[1]} ${Math.round((b - (v ? dy : dx)) * 10) / 10}px)`;
  let hit = false;
  let out = html.replace(/(<div data-ad="1"[^>]*? style=")([^"]*)"/, (m0, head, st) => { if (!st.includes(`background:${F.css};`)) return m0; hit = true; return head + st.replace(`background:${F.css};`, `background:${css(0, 0)};`) + '"'; });
  out = out.replace(/(<div data-mold-field="1" style=")([^"]*)"/, (m0, head, st) => { const x = num(st, 'left') ?? 0, y = num(st, 'top') ?? 0; if (!st.includes(`background:${F.css}`)) return m0; hit = true; return head + st.replace(`background:${F.css}`, `background:${css(x, y)}`) + '"'; });
  if (!hit) return html;
  F.css = css(0, 0); F.aligned = { axis: F.align.axis, a, b }; if (!tr.rules.includes('fieldAlign')) tr.rules.unshift('fieldAlign');
  return out.replace(/data-trace="[^"]*"/, `data-trace="${esc(JSON.stringify(tr))}"`);
}
// AI 배경 도형(10-22) — 뿌리 바로 안 맨 앞(그림·글자 뒤)에 넣는다. 캔버스 몫 → px, blur 는 짧은 변 몫. 틀 고정 매체·비즈보드는 넣지 않는다
export function withAiShapes(html, style, spec) {
  const S = style?.aiShapes; if (!S?.length || !aiEligible(spec)) return html;
  const W = spec.w, H = spec.h, m = Math.min(W, H), r1 = v => Math.round(v * 10) / 10;
  const divs = S.map((sh, i) => `<div data-ai-shape="${i}" aria-hidden="true" style="position:absolute;left:${r1(sh.x * W)}px;top:${r1(sh.y * H)}px;width:${r1(sh.w * W)}px;height:${r1(sh.h * H)}px;background:${sh.color};opacity:${sh.opacity};border-radius:${sh.kind === 'rect' ? '0' : sh.kind === 'pill' ? '9999px' : '50%'};${sh.blur ? `filter:blur(${r1(sh.blur * m)}px);` : ''}pointer-events:none"></div>`).join('');
  return html.replace(/(<div data-ad="1"[^>]*>)/, `$1${divs}`);
}
export function renderAd(ctx, style, spec) {
  return withAiShapes(renderAdInner(ctx, style, spec), style, spec);
}
function renderAdInner(ctx, style, spec) {
  if (style?.aiKvBox && !style.__fix) {
    const ai = aiBoxRender(ctx, style, spec); if (ai) return ai;
    // AI 상자가 가이드 검사를 못 넘으면 규칙 자리 — 그림은 AI 가 그 모양용으로 자른 조각이 아니라 원본(규칙 칸에 조각이 들어가면 확성기만 크게, 10-22 GS 카카오)
    if (style.aiKvOrig) { const { aiKvBox, aiFade, aiKvOrig, aiKvMetaOrig, ...rest } = style; style = { ...rest, keyVisual: aiKvOrig, kvMeta: aiKvMetaOrig ?? rest.kvMeta }; }
  }
  const first = renderOnce(ctx, style, spec);
  const fixed = overlapFix(ctx, style, spec, first);
  return fixed !== first.html ? fixed : emptyFix(ctx, style, spec, first);   // 겹침 교정이 손댄 그림은 이미 꽉 찬 그림 — 빈 지면 보정은 건너뛴다
}
// AI 그림 상자(10-22 하이브리드, 사용자 「비중 정해 놓고 규칙대로 하는 느낌 — AI 가 직접, 가이드는 지킨다는 근거하에」):
//   규칙으로 한 번 그린 뒤(글자·로고·지면은 규칙 그대로) 그림 층(data-object) 하나만 AI 가 정한 상자(캔버스 몫)·녹일 변으로 바꾼다.
//   가이드 검사: 글자 행 × 주인공 겹침(overlapRatio — 문턱은 overlapFix 와 같게 캐릭터·누끼 2% · 그 외 15%) + 주인공의 로고 칸 가림 ≤ 5%.
//   넘으면 그림 상자를 글자 반대쪽 변을 붙잡고 0.85·0.7 로 줄여 다시 재고, 그래도 넘으면 null → 기존 규칙 파이프라인(겹침 교정·빈 지면 보정).
//   틀 그림 칸이 고정인 매체(자소설·리멤버·잡다·에브리타임·캐치)·비즈보드·로고 전용·그림 층 없음은 건너뛴다(null).
const AI_INNER_FADE = 0.22;   // 떠 있는 변의 최소 녹임(그림 상자 몫)
function aiBoxRender(ctx, style, spec) {
  if (!aiEligible(spec)) return null;
  const first = renderOnce(ctx, style, spec);
  const T = first.tr, g = T?.gate; if (!g?.hasKv || g.logoOnly || g.transparent) return null;
  const W = spec.w, H = spec.h, B = style.aiKvBox, Fd = style.aiFade ?? {};
  const objs = [...first.html.matchAll(/<div data-object="1"((?:\s+data-[a-z0-9-]+="[^"]*")*) style="([^"]*)"([^>]*)>/g)].filter(m => !/data-kv-only/.test(m[1]) && !/inset:0/.test(m[2]));
  if (!objs.length) return null;
  const numOf = (st, k) => { const m = st.match(new RegExp('(?:^|;)' + k + ':(-?[\\d.]+)px')); return m ? parseFloat(m[1]) : 0; };
  const main = objs.reduce((a, m) => (numOf(m[2], 'width') * numOf(m[2], 'height') > numOf(a[2], 'width') * numOf(a[2], 'height') ? m : a));
  const f = first.styleUsed.kvMeta?.field ?? null, fo = f?.focus ?? profileFocus(f) ?? null;
  const transparent = (f?.opaque ?? 1) < 0.5;
  const rows = T.textBox?.rows ?? [];
  const tc = rows.length ? { x: rows.reduce((a, r) => a + r.x + r.w / 2, 0) / rows.length, y: rows.reduce((a, r) => a + r.y + r.h / 2, 0) / rows.length } : { x: W / 2, y: H / 2 };
  const logoM = first.html.match(/<div data-logo-slot="1" style="position:absolute;left:(-?[\d.]+)px;top:(-?[\d.]+)px;width:([\d.]+)px;height:([\d.]+)px/);
  const logoR = logoM ? { x: +logoM[1], y: +logoM[2], w: +logoM[3], h: +logoM[4] } : null;
  const OV = CANON.overlapFix, thr = OV.character;   // AI 상자는 엄하게(2%) — 규칙 자리보다 크게 쓰는 만큼 글자가 주인공에 닿으면 안 된다(10-22 네이버 1250 제목이 신호등 기둥에)
  const r1 = v => Math.round(v * 10) / 10;
  const pos = fo ? `${Math.round(Math.min(100, Math.max(0, fo.x * 100)))}% ${Math.round(Math.min(100, Math.max(0, fo.y * 100)))}%` : '50% 50%';
  // px 상자 하나로 그림 층을 바꾼 HTML — 지면 안쪽에 떠 있는 변은 늘 녹인다(누끼 제외, 10-22 r0 「밝은 사각 패널 경계」)
  const buildBox = (bx, tag, fade = Fd) => {
    const { x, y, w: bw, h: bh } = bx;
    const inner = { left: x > 2, right: x + bw < W - 2, top: y > 2, bottom: y + bh < H - 2 };
    const fadeOf = s0 => Math.max(fade[s0] ?? 0, inner[s0] ? AI_INNER_FADE : 0);
    const sides = transparent ? [] : [['left', 'to right'], ['right', 'to left'], ['top', 'to bottom'], ['bottom', 'to top']].filter(([s0]) => fadeOf(s0) >= 0.03).map(([s0, dir]) => meltGradient(dir, Math.round(fadeOf(s0) * 1000) / 10));
    let st = main[2].replace(/(^|;)left:-?[\d.]+px/, `$1left:${r1(x)}px`).replace(/(^|;)top:-?[\d.]+px/, `$1top:${r1(y)}px`).replace(/(^|;)width:[\d.]+px/, `$1width:${r1(bw)}px`).replace(/(^|;)height:[\d.]+px/, `$1height:${r1(bh)}px`)
      .replace(/background:url\('([^']*)'\) [^;]*? no-repeat;/, (m0, u) => `background:url('${u}') ${pos}/${transparent ? 'contain' : 'cover'} no-repeat;`)
      .replace(/-webkit-mask-image:[^;]*;/g, '').replace(/(^|;)mask-image:[^;]*;/g, '$1').replace(/-webkit-mask-composite:[^;]*;/g, '').replace(/(^|;)mask-composite:[^;]*;/g, '$1').replace(/(^|;)transform:[^;]*;/g, '$1');
    if (!st.endsWith(';')) st += ';';
    st += sides.length ? meltMaskList(sides) : '';
    const rest = main[3].replace(/\sdata-melt(-[a-z]+)?="[^"]*"/g, '') + ` data-ai-box="${tag}"`;
    return first.html.replace(main[0], `<div data-object="1"${main[1]} style="${st}"${rest}>`);
  };
  // ── 후보 ──
  const cands = [];
  const horizOf = bx => Math.abs(bx.x + bx.w / 2 - tc.x) / W >= Math.abs(bx.y + bx.h / 2 - tc.y) / H;
  if (B) {
    const A0 = { x: B.x * W, y: B.y * H, w: B.w * W, h: B.h * H }, hz = horizOf(A0), right = A0.x + A0.w / 2 >= tc.x, below = A0.y + A0.h / 2 >= tc.y;
    const inside = bx => ({ ...bx, x: bx.w <= W ? Math.min(Math.max(bx.x, 0), W - bx.w) : bx.x, y: bx.h <= H ? Math.min(Math.max(bx.y, 0), H - bx.h) : bx.y });
    // ① AI 상자 줄이기 — 글자 쪽 축만, 글자 반대쪽 변 고정
    const shrink = k => hz ? { ...A0, w: A0.w * k, x: right ? A0.x + A0.w - A0.w * k : A0.x } : { ...A0, h: A0.h * k, y: below ? A0.y + A0.h - A0.h * k : A0.y };
    const ks = [1, 0.85, 0.7];
    if (rows.length) {   // 글자 덩어리 끝선(+2%)까지 깎기
      const R = { x0: Math.min(...rows.map(r => r.x)), x1: Math.max(...rows.map(r => r.x + r.w)), y0: Math.min(...rows.map(r => r.y)), y1: Math.max(...rows.map(r => r.y + r.h)) };
      const len = hz ? Math.abs((right ? A0.x + A0.w : A0.x) - (right ? R.x1 + W * 0.02 : R.x0 - W * 0.02)) : Math.abs((below ? A0.y + A0.h : A0.y) - (below ? R.y1 + H * 0.02 : R.y0 - H * 0.02));
      const k = len / (hz ? A0.w : A0.h); if (k > 0.2 && k < 1) ks.push(k);
    }
    for (const k of ks) { const bx = shrink(k); cands.push({ bx, tag: k === 1 ? 'ai' : `ai${Math.round(k * 100)}`, ai: true }); cands.push({ bx: inside(bx), tag: `ai${Math.round(k * 100)}in`, ai: true }); }
    // ③ AI 상자 키우기 — 두 축, 글자 반대쪽 변 고정
    for (const gr of [1.2, 1.45]) { const w = A0.w * gr, h = A0.h * gr; const bx = { w, h, x: hz ? (right ? A0.x + A0.w - w : A0.x) : A0.x + A0.w / 2 - w / 2, y: hz ? A0.y + A0.h / 2 - h / 2 : (below ? A0.y + A0.h - h : A0.y) }; cands.push({ bx, tag: `ai${Math.round(gr * 100)}`, ai: true }); cands.push({ bx: inside(bx), tag: `ai${Math.round(gr * 100)}in`, ai: true }); }
  }
  // ② 빈 공간 — 글자 덩어리(+3%)를 피한 오른쪽·아래·왼쪽·위 띠를 그림으로 채운다(지면 가장자리까지)
  if (rows.length) {
    const px = W * 0.03, py = H * 0.03;
    const R = { x0: Math.min(...rows.map(r => r.x)) - px, x1: Math.max(...rows.map(r => r.x + r.w)) + px, y0: Math.min(...rows.map(r => r.y)) - py, y1: Math.max(...rows.map(r => r.y + r.h)) + py };
    const regs = [{ x: R.x1, y: 0, w: W - R.x1, h: H, tag: 'free-r' }, { x: 0, y: R.y1, w: W, h: H - R.y1, tag: 'free-b' }, { x: 0, y: 0, w: R.x0, h: H, tag: 'free-l' }, { x: 0, y: 0, w: W, h: R.y0, tag: 'free-t' }];
    for (const r of regs) if (r.w >= W * 0.22 && r.h >= H * 0.22) { cands.push({ bx: r, tag: r.tag, ai: false }); }
  }
  // ── 검사 ──
  const projS = o => { const p = o.pic; return fo ? { x: p.x + (fo.x - fo.w / 2) * p.w, y: p.y + (fo.y - fo.h / 2) * p.h, w: fo.w * p.w, h: fo.h * p.h } : p; };
  const visOf = (S0, o) => Math.max(0, Math.min(S0.x + S0.w, W, o.clip.x + o.clip.w) - Math.max(S0.x, 0, o.clip.x)) * Math.max(0, Math.min(S0.y + S0.h, H, o.clip.y + o.clip.h) - Math.max(S0.y, 0, o.clip.y));
  const faces = first.styleUsed.kvMeta?.ai?.faces ?? [];
  const judge = html => {
    const ov = overlapRatio(html, T, first.styleUsed, spec) ?? 0; if (ov > thr) return null;
    let subj = 0, cut = 0, lh = 0;
    for (const o of objectRects(html, first.styleUsed, spec)) {
      const S0 = projS(o), a = S0.w * S0.h; if (!(a > 0)) continue; const v = visOf(S0, o); subj = Math.max(subj, v); cut = Math.max(cut, 1 - v / a);
      if (logoR && logoR.w > 0 && logoR.h > 0) { const x0 = Math.max(S0.x, o.clip.x, logoR.x), y0 = Math.max(S0.y, o.clip.y, logoR.y), x1 = Math.min(S0.x + S0.w, o.clip.x + o.clip.w, logoR.x + logoR.w), y1 = Math.min(S0.y + S0.h, o.clip.y + o.clip.h, logoR.y + logoR.h); if (x1 > x0 && y1 > y0) lh = Math.max(lh, (x1 - x0) * (y1 - y0) / (logoR.w * logoR.h)); }
      for (const fc of faces) { const p = o.pic, Fb = { x: p.x + fc.x * p.w, y: p.y + fc.y * p.h, w: fc.w * p.w, h: fc.h * p.h }, fa = Fb.w * Fb.h; if (!(fa > 0)) continue; const r = visOf(Fb, o) / fa; if (r > 0.03 && r < 0.97) return null; }
    }
    if (lh > 0.05 || cut > 0.12) return null;
    return { ov, subj };
  };
  let best = null;
  for (const c of cands) {
    const html = buildBox(c.bx, c.tag); const j = judge(html); if (!j) continue;
    const score = j.subj / (W * H) * (c.ai ? 1.12 : 1);   // 주인공이 보이는 면적 — AI 상자에 가산점(같은 크기면 AI 판단)
    if (!best || score > best.score) best = { html, score, c, ov: j.ov };
  }
  if (!best) return null;   // 규칙 자리로(호출자가 기존 파이프라인 — 원본 그림)
  const mark = best.c.ai ? (best.c.tag === 'ai' ? 'aiBox.ok' : /^ai1[2-9]/.test(best.c.tag) ? 'aiBox.grow' : 'aiBox.shrink') : 'aiBox.free';
  return best.html.replace('&quot;rules&quot;:[', `&quot;rules&quot;:[&quot;${mark}&quot;,`).replace('<div data-ad="1"', `<div data-ad="1" data-ai-box="${best.c.tag}:${Math.round(best.ov * 100)}"`);
}
// 빈 지면 보정 사다리(10-21 사용자 「이런 경우 키비주얼이 꽤 크게 들어가야 비어 보이지 않고 임팩트」):
//   글자 행 ∪ 그림 주인공이 지면을 덮는 몫(coverageOf)이 CANON.emptyFix.min 미만이면 키비주얼 배율 steps 순으로 다시 그려(__fix.kvK — 편집 「키비주얼 크기」와 같은 자리, 틀 칸은 emptyFix.slot)
//   처음 min 에 닿는 것을 쓴다. 겹침이 overlapFix 문턱을 넘는 단계, 더 커지지 않는 단계(상한에 닿음)에서 멈추고 그 전 단계를 쓴다. 그림이 지면 전체(질감·배경형·사진 전체)·로고만·투명·편집으로 크기를 정한 것·규정 매체 틀(emptyFix.regulated)은 제외
function emptyFix(ctx, style, spec, first) {
  const C = CANON.emptyFix; if (!C || !style?.keyVisual || style.__fix) return first.html;
  if (editOf(style)?.kvSize) return first.html;
  const T = first.tr, g = T?.gate; if (!g?.hasKv || g.logoOnly || g.transparent || g.textureFull || g.frameFull || g.photoFull || g.roomFull) return first.html;
  if (!(spec.h >= C.minH)) return first.html;
  const regulated = !!spec.mediumRules?.fonts?.required; if (regulated && !C.regulated) return first.html;
  const c0 = coverageOf(first.html, T, first.styleUsed, spec); if (c0 == null || c0.all >= C.min) return first.html;
  const f0 = style.kvMeta?.field, profiled = (f0?.opaque ?? 1) < 0.5 && Array.isArray(f0?.cols) && Array.isArray(f0?.rows);
  const OV = CANON.overlapFix, thr = OV ? ((kvTypeOf(style.kvMeta)?.flags?.character || profiled) ? OV.character : OV.other) : 0.15;
  const bo0 = overlapRatio(first.html, T, first.styleUsed, spec, { box: true }) ?? 0;   // 그림 상자 기준 겹침(녹임 무시) — 키워서 이보다 나빠지고 문턱도 넘으면 안 쓴다
  let best = { ...first, cov: c0.all, k: null };
  for (const k of C.steps) {
    const out = renderOnce(ctx, { ...style, __fix: { kvK: k } }, spec);
    const ov = overlapRatio(out.html, out.tr, out.styleUsed, spec) ?? 0; if (ov > thr) break;
    const bo = overlapRatio(out.html, out.tr, out.styleUsed, spec, { box: true }) ?? 0; if (bo > thr && bo > bo0 + 0.01) break;
    const c = coverageOf(out.html, out.tr, out.styleUsed, spec); if (!c || c.all <= best.cov + 0.005) break;
    best = { ...out, cov: c.all, k }; if (c.all >= C.min) break;
  }
  if (best.k == null) return first.html;
  const mark = best.cov >= C.min ? 'emptyFix.ok' : 'emptyFix.max';
  return best.html
    .replace('&quot;rules&quot;:[', `&quot;rules&quot;:[&quot;${mark}&quot;,`)
    .replace('<div data-ad="1"', `<div data-ad="1" data-empty="${Math.round(c0.all * 100)}>${Math.round(best.cov * 100)}:${best.k}"`);
}
// 덮는 몫(0~1): 글자 행(TR.textBox.rows) ∪ 그림 주인공(focus, 없으면 열·행 프로필 상자 profileFocus, 그것도 없으면 그림 전체 — 실제 그림 사각형에 투영 ∩ 상자 ∩ 지면) ÷ 지면. 격자 48×48 근사. 글자 행이 없으면 null
export function coverageOf(html, tr, style, spec) {
  const rows = tr?.textBox?.rows; if (!rows?.length) return null;
  const W = spec.w, H = spec.h; if (!(W > 0 && H > 0)) return null;
  const f = style.kvMeta?.field ?? null, focus = f?.focus ?? profileFocus(f) ?? null;
  const kv = [];
  for (const o of objectRects(html, style, spec)) {
    const pic = o.pic, b = o.box; const vis = { x: Math.max(0, b.x), y: Math.max(0, b.y), w: Math.min(W, b.x + b.w) - Math.max(0, b.x), h: Math.min(H, b.y + b.h) - Math.max(0, b.y) };
    const full = focus ? { x: pic.x + (focus.x - focus.w / 2) * pic.w, y: pic.y + (focus.y - focus.h / 2) * pic.h, w: focus.w * pic.w, h: focus.h * pic.h } : pic;
    const x0 = Math.max(full.x, vis.x), y0 = Math.max(full.y, vis.y), x1 = Math.min(full.x + full.w, vis.x + vis.w), y1 = Math.min(full.y + full.h, vis.y + vis.h);
    if (x1 > x0 && y1 > y0) kv.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  const N = 48, hit = rects => { let n = 0; for (let i = 0; i < N; i++) { const x = (i + 0.5) / N * W; for (let j = 0; j < N; j++) { const y = (j + 0.5) / N * H; if (rects.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)) n++; } } return n / (N * N); };
  return { text: hit(rows), kv: hit(kv), all: hit([...rows, ...kv]) };
}
// 겹침 교정 사다리(10-19 사용자 「키비주얼과 텍스트가 겹쳐서 텍스트가 안 보일 땐 텍스트를 줄이던지 띄어쓰던지 키비주얼 위치를 조정해야」):
//   그린 뒤 글자 어림 상자(TR.textBox 행)와 그림 주인공 상자(kvMeta.field.focus 를 실제 그림 사각형에 투영, 없으면 그림 전체)의 겹침 = 교집합 ÷ 글자 행 면적, 행 중 최대.
//   문턱은 검수(core/guidecheck.js check.textOverSubject)와 같게 캐릭터·인물 2%, 그 외 15%. 넘으면 ① 글자 줄이기(0.92·0.84·0.75 — 규정 매체 틀은 0.85 바닥) ② 메인 두 줄 ③ 키비주얼 축소(0.85·0.7, 틀은 칸 안 축소만)
//   순서대로 다시 그려 처음 문턱 아래로 내려오는 것을 쓴다. 끝까지 안 되면 가장 덜 겹치는 것 + overlapFix.fail(검수가 그대로 보고).
function overlapFix(ctx, style, spec, first) {
  const C = CANON.overlapFix; if (!C || !style?.keyVisual || style.__fix) return first.html;
  const f0 = style.kvMeta?.field, profiled = (f0?.opaque ?? 1) < 0.5 && Array.isArray(f0?.cols) && Array.isArray(f0?.rows);   // 열·행 프로필이 있는 누끼는 불투명 칸만 세므로 정확 — 캐릭터가 아니어도 엄한 문턱(네이버 DA ABL 떼: 첫 사람 팔에 글자 4.5%)
  const thr = (kvTypeOf(style.kvMeta)?.flags?.character || profiled) ? C.character : C.other;
  const r0 = overlapRatio(first.html, first.tr, first.styleUsed, spec);
  if (r0 == null || r0 <= thr) return first.html;
  const regulated = !!spec.mediumRules?.fonts?.required;
  const floor = regulated ? C.textFloorRegulated : C.textFloor;
  const textSteps = C.textSteps.filter(k => k >= floor - 1e-9), tk = textSteps.length ? textSteps[textSteps.length - 1] : 1;
  const steps = [];
  if (first.tr?.mold) {   // 틀: 글자 크기는 템플릿 규정, 그림 크기는 자유(샘플 「크기·블리드 자유」) — 칸 안 그림 축소부터, 그다음 글자(규정 매체는 0.85 바닥)
    for (const k of C.kvSteps) steps.push({ kvK: k });
    const kk = C.kvSteps[C.kvSteps.length - 1];
    for (const k of textSteps) steps.push({ kvK: kk, textK: k });
  } else {   // 자유 배치: 사용자가 말한 순서 — 글자 줄이기 → 띄어쓰기(두 줄) → 키비주얼 자리·크기
    for (const k of textSteps) steps.push({ textK: k });
    steps.push({ textK: tk, wrap: true });
    for (const k of C.kvSteps) steps.push({ textK: tk, wrap: true, kvK: k });
  }
  let best = { ...first, ratio: r0, step: null };
  for (const fx of steps) {
    const out = renderOnce(ctx, { ...style, __fix: fx }, spec);
    const r = overlapRatio(out.html, out.tr, out.styleUsed, spec) ?? r0;
    if (r < best.ratio) best = { ...out, ratio: r, step: fx };
    if (r <= thr) break;
  }
  const ok = best.ratio <= thr;
  const stepName = best.step ? (best.step.kvK ? 'kv' : best.step.wrap ? 'wrap' : 'text') : null;
  const mark = ok ? 'overlapFix.ok' : 'overlapFix.fail';
  return best.html
    .replace('&quot;rules&quot;:[', `&quot;rules&quot;:[&quot;${mark}&quot;,`)
    .replace('<div data-ad="1"', `<div data-ad="1" data-overlap="${Math.round(r0 * 100)}>${Math.round(best.ratio * 100)}${stepName ? ':' + stepName : ''}"`);
}
// 글자 행 × 주인공 상자 겹침 비율(0~1) — 그림이 없거나 글자 상자를 못 세면 null
export function overlapRatio(html, tr, style, spec, opt = null) {
  const rows = tr?.textBox?.rows; if (!rows?.length) return null;
  const objs = objectRects(html, style, spec); if (!objs.length) return null;
  const inter0 = (A, B) => Math.max(0, Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x)) * Math.max(0, Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y));
  // opt.box: 녹임·주인공을 따지지 않고 그림 상자(∩ 지면) 자체와의 겹침 — 빈 지면 보정이 칸을 키울 때 글자가 녹인 구간으로라도 들어가면 안 된다(10-21 네이버 DA 상세 값 vs 키운 사진 칸: 녹임 기준 0% 인데 검수는 30%)
  if (opt?.box) { const W = spec.w, H = spec.h; let worst = 0;
    for (const o of objs) { const b = o.box, B = { x: Math.max(0, b.x), y: Math.max(0, b.y) }; B.w = Math.min(W, b.x + b.w) - B.x; B.h = Math.min(H, b.y + b.h) - B.y; if (!(B.w > 0 && B.h > 0)) continue;
      for (const r of rows) { const A = r.w * r.h; if (A > 0) worst = Math.max(worst, inter0(r, B) / A); } }
    return worst; }
  const f = style.kvMeta?.field ?? null, focus = f?.focus ?? profileFocus(f) ?? null;
  const cutout = (f?.opaque ?? 1) < 0.5, cols = f?.cols, rws = f?.rows;
  const prof = cutout && Array.isArray(cols) && cols.length > 1 && Array.isArray(rws) && rws.length > 1;   // 누끼 열·행 투명 프로필이 있으면 칸마다 불투명도로 가중(머리 위 빈 자리·발 옆 빈 자리는 겹침이 아니다)
  const inter = (A, B) => Math.max(0, Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x)) * Math.max(0, Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y));
  let worst = 0;
  for (const o of objs) {
    const pic = o.pic; if (!(o.clip.w > 0 && o.clip.h > 0)) continue;   // 보이는 창이 없는 그림(녹임이 전부)은 주인공이 아니다
    if (prof) {
      const nx = cols.length, ny = rws.length, cw = pic.w / nx, ch = pic.h / ny;
      for (const r of rows) { const A = r.w * r.h; if (!(A > 0)) continue; let s = 0;
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const cell = { x: pic.x + i * cw, y: pic.y + j * ch, w: cw, h: ch }; const op0 = Math.min(1 - (cols[i]?.bg ?? 1), 1 - (rws[j]?.bg ?? 1)); const op = op0 >= (CANON.overlapFix?.cellOpaque ?? 0.3) ? 1 : 0; if (op <= 0) continue;   /* 칸 불투명도는 이진화 — 팔·다리처럼 가는 부분도 글자가 닿으면 가려진다(네이버 DA ABL 첫 사람 팔) */ const vis = inter(cell, o.clip); if (vis <= 0) continue; s += inter(r, { x: Math.max(cell.x, o.clip.x), y: Math.max(cell.y, o.clip.y), w: Math.min(cell.x + cell.w, o.clip.x + o.clip.w) - Math.max(cell.x, o.clip.x), h: Math.min(cell.y + cell.h, o.clip.y + o.clip.h) - Math.max(cell.y, o.clip.y) }) * op; }
        worst = Math.max(worst, s / A); }
      continue;
    }
    const full = focus ? { x: pic.x + (focus.x - focus.w / 2) * pic.w, y: pic.y + (focus.y - focus.h / 2) * pic.h, w: focus.w * pic.w, h: focus.h * pic.h } : pic;
    const x0 = Math.max(full.x, o.clip.x), y0 = Math.max(full.y, o.clip.y), x1 = Math.min(full.x + full.w, o.clip.x + o.clip.w), y1 = Math.min(full.y + full.h, o.clip.y + o.clip.h);
    const S = { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) }; if (!(S.w > 0 && S.h > 0)) continue;
    for (const r of rows) { const A = r.w * r.h; if (!(A > 0)) continue; worst = Math.max(worst, inter(r, S) / A); }
  }
  return worst;
}
// 오브젝트 상자(data-object="1")마다 실제 그림 사각형(pic)·보이는 창(clip = 상자 ∩ 지면) — cutFade 와 같은 계산(contain/cover/auto/px)
export function objectRects(html, style, spec) {
  const W = spec.w, H = spec.h; const px = style.kvMeta?.px, ar0 = style.kvMeta?.ar; const out = [];
  const num = (s, k) => { const m = s.match(new RegExp('(?:^|;)' + k + ':(-?[\\d.]+)(?:px)?(?=;|$)')); return m ? parseFloat(m[1]) : null; };
  for (const m of html.matchAll(/<div data-object="1"((?:\s+data-[a-z0-9-]+="[^"]*")*) style="([^"]*)"([^>]*)>/g)) {
    const attrs = m[1], st = m[2], rest = m[3]; if (/data-kv-only/.test(attrs) || /inset:0/.test(st)) continue;
    const bw = num(st, 'width'), bh = num(st, 'height'), bx = num(st, 'left'), by = num(st, 'top'); if (!(bw > 0 && bh > 0) || bx == null || by == null) continue;
    const bg = st.match(/background:url\('[^']*'\) ([^;]*?)\/([^;]*?) no-repeat;/); if (!bg) continue;
    const pos = bg[1].trim().split(/\s+/), size = bg[2].trim();
    const iw = px?.[0] ?? (ar0 ? ar0 * 1000 : bw), ih = px?.[1] ?? (ar0 ? 1000 : bh), ar = iw / ih;
    const lenOf = (s, total) => s.endsWith('%') ? total * parseFloat(s) / 100 : parseFloat(s);
    let dw, dh;
    if (size === 'contain') { const k = Math.min(bw / iw, bh / ih); dw = iw * k; dh = ih * k; }
    else if (size === 'cover') { const k = Math.max(bw / iw, bh / ih); dw = iw * k; dh = ih * k; }
    else if (size === 'auto' || size === 'auto auto') { dw = iw; dh = ih; }
    else { const [sw, sh] = size.split(/\s+/); if (sw === 'auto' && sh) { dh = lenOf(sh, bh); dw = dh * ar; } else if (!sh || sh === 'auto') { dw = lenOf(sw, bw); dh = dw / ar; } else { dw = lenOf(sw, bw); dh = lenOf(sh, bh); } }
    if (!(dw > 0 && dh > 0)) continue;
    const word = { left: '0%', right: '100%', center: '50%', top: '0%', bottom: '100%' };
    const px0 = word[pos[0] ?? 'center'] ?? pos[0], py0 = word[pos[1] ?? 'center'] ?? pos[1];
    const ox = px0.endsWith('%') ? (bw - dw) * parseFloat(px0) / 100 : parseFloat(px0), oy = py0.endsWith('%') ? (bh - dh) * parseFloat(py0) / 100 : parseFloat(py0);
    const clip = { x: Math.max(bx, 0), y: Math.max(by, 0) }; clip.w = Math.min(bx + bw, W) - clip.x; clip.h = Math.min(by + bh, H) - clip.y;
    // 글자 쪽 변의 녹임(data-melt %·방향)은 지면으로 읽힌다 — 그 구간은 주인공에서 뺀다(틀 사진 칸 왼쪽 35%·아래 띠 윗변·양옆 녹임)
    const melt = parseFloat((rest.match(/data-melt="(\d+(?:\.\d+)?)"/) ?? [])[1] ?? '0'), mdir = (rest.match(/data-melt-dir="([^"]*)"/) ?? [])[1] ?? '', meltR = parseFloat((rest.match(/data-melt-right="(\d+(?:\.\d+)?)"/) ?? [])[1] ?? '0'), meltT = parseFloat((rest.match(/data-melt-top="(\d+(?:\.\d+)?)"/) ?? [])[1] ?? '0');
    // sides 의 오른쪽 길이는 data-melt-right 그대로(0 이면 0 — containEdge 로 오른쪽 변에 붙인 그림은 오른쪽을 안 녹인다. 10-21 전엔 0 을 「없음」으로 읽어 왼쪽 길이를 또 빼 상자가 사라졌다 → desk-11 구글 580 그림 상자 미검출)
    if (melt > 0) { const cutL = (mdir === 'to right' || mdir === 'sides') ? bw * melt / 100 : 0, cutR = mdir === 'to left' ? bw * melt / 100 : mdir === 'sides' ? bw * (/data-melt-right=/.test(rest) ? meltR : melt) / 100 : 0, cutT = mdir === 'to bottom' ? bh * melt / 100 : 0, cutB = mdir === 'to top' ? bh * melt / 100 : 0;
      const nx = Math.max(clip.x, bx + cutL), ny = Math.max(clip.y, by + cutT); clip.w = Math.min(clip.x + clip.w, bx + bw - cutR) - nx; clip.h = Math.min(clip.y + clip.h, by + bh - cutB) - ny; clip.x = nx; clip.y = ny;
      if (meltT > 0) { const ny2 = Math.max(clip.y, by + bh * meltT / 100); clip.h = clip.y + clip.h - ny2; clip.y = ny2; } }
    if (!(clip.w > 0 && clip.h > 0)) { clip.w = 0; clip.h = 0; }   // 양옆 녹임이 폭을 다 덮는 그림(desk-11 네이버 DA 55%+50%)도 상자는 돌려준다 — 보이는 창만 0(겹침·끊김은 건너뛰고, 덮는 몫 coverageOf 는 상자로 센다)
    out.push({ box: { x: bx, y: by, w: bw, h: bh }, pic: { x: bx + ox, y: by + oy, w: dw, h: dh }, clip });
  }
  return out;
}

// 그림 사각형(배경 size/position 환산, 상자 좌표계) — cutFade·meltFix·objectRects 가 같은 계산을 쓴다
function picOf(st, bw, bh, px, ar0) {
  const bg = st.match(/background:url\('[^']*'\) ([^;]*?)\/([^;]*?) no-repeat;/); if (!bg) return null;
  const pos = bg[1].trim().split(/\s+/), size = bg[2].trim();
  const iw = px?.[0] ?? (ar0 ? ar0 * 1000 : bw), ih = px?.[1] ?? (ar0 ? 1000 : bh), ar = iw / ih;
  const lenOf = (s, total) => s.endsWith('%') ? total * parseFloat(s) / 100 : parseFloat(s);
  let dw, dh;
  if (size === 'contain') { const k = Math.min(bw / iw, bh / ih); dw = iw * k; dh = ih * k; }
  else if (size === 'cover') { const k = Math.max(bw / iw, bh / ih); dw = iw * k; dh = ih * k; }
  else if (size === 'auto' || size === 'auto auto') { dw = iw; dh = ih; }
  else { const [sw, sh] = size.split(/\s+/); if (sw === 'auto' && sh) { dh = lenOf(sh, bh); dw = dh * ar; } else if (!sh || sh === 'auto') { dw = lenOf(sw, bw); dh = dw / ar; } else { dw = lenOf(sw, bw); dh = lenOf(sh, bh); } }
  if (!(dw > 0 && dh > 0)) return null;
  const word = { left: '0%', right: '100%', center: '50%', top: '0%', bottom: '100%' };
  const p0 = pos[0] ?? 'center', p1 = pos[1] ?? 'center';
  const px0 = word[p0] ?? p0, py0 = word[p1] ?? p1;
  const ox = px0.endsWith('%') ? (bw - dw) * parseFloat(px0) / 100 : parseFloat(px0);
  const oy = py0.endsWith('%') ? (bh - dh) * parseFloat(py0) / 100 : parseFloat(py0);
  return { ox, oy, dw, dh, size };
}
// 녹임 길이 교정(10-20 사용자 「어떤 키비주얼을 넣어도 끊김이나 배경 컬러와 이질감 … 계속 틀어져서」 — 107케이스 × 49규격 전수 감사 scripts/kv-seam-audit.mjs):
//   그린 뒤 바탕 있는 그림의 % 녹임 마스크마다, 실제 그림 사각형에서 그 변이 그림의 어디를 지나는지(frac) 보고 이음매 색을 다시 잰다(core/field.js seamHexes —
//   그림 변이면 변 색, 바탕 줄이면 그 줄 색, 주인공을 가르는 줄이면 그림 속 색 중 지면과 가장 먼 색). CANON.melt 길이가 지금 마스크보다 길면 늘인다(짧아지는 쪽은 없음).
//   한샘 사진 cover 칸: 변 색(갈색) 기준 35% → 속 색(크림·하늘색) 기준 55%. data-melt·data-melt-top·data-melt-right·seam·far 도 같은 값으로(가이드 대조표·겹침 계산이 읽는다) + data-melt-fix="L35>55"
function meltFix(html, style, spec, tr) {
  const S = CANON.melt?.seamInside; if (!S || !style?.keyVisual) return html;
  const stops = tr?.field?.stops; if (!stops?.length) return html;
  if ((style.kvMeta?.field?.opaque ?? 1) < 0.5) return html;   // 누끼는 녹이지 않는다(cutFade·상반신 녹임만)
  const W = spec.w, H = spec.h; if (!(W > 0 && H > 0)) return html;
  const px = style.kvMeta?.px, ar0 = style.kvMeta?.ar;
  const sideOf = { 'to right': 'left', 'to left': 'right', 'to bottom': 'top', 'to top': 'bottom' };
  const grads = s => { const out = []; let i = 0; while ((i = s.indexOf('linear-gradient(', i)) >= 0) { let d = 0, j = i; for (; j < s.length; j++) { if (s[j] === '(') d++; else if (s[j] === ')' && --d === 0) break; } out.push(s.slice(i, j + 1)); i = j + 1; } return out; };
  const num = (s, k) => { const m = s.match(new RegExp('(?:^|;)' + k + ':(-?[\\d.]+)(?:px)?(?=;|$)')); return m ? parseFloat(m[1]) : null; };
  let hit = false;
  const out = html.replace(/<div data-object="1"((?:\s+data-[a-z0-9-]+="[^"]*")*) style="([^"]*)"([^>]*)>/g, (m, attrs, st, rest) => {
    if (/data-kv-only/.test(attrs) || /inset:0/.test(st)) return m;
    const seg = /-webkit-mask-image:[^;]*;(?:-webkit-mask-composite:[^;]*;)?mask-image:[^;]*;(?:mask-composite:[^;]*;)?/;
    const mk = st.match(seg); if (!mk) return m;
    const own = grads((st.match(/-webkit-mask-image:[^;]*;/) ?? [''])[0]); if (!own.length) return m;
    const bw = num(st, 'width'), bh = num(st, 'height'); if (!(bw > 0 && bh > 0)) return m;
    const bx = num(st, 'left') ?? (num(st, 'right') != null ? W - num(st, 'right') - bw : null), by = num(st, 'top') ?? (num(st, 'bottom') != null ? H - num(st, 'bottom') - bh : null);
    if (bx == null || by == null) return m;
    const pic = picOf(st, bw, bh, px, ar0); if (!pic) return m;
    const P = { l: bx + pic.ox, r: bx + pic.ox + pic.dw, t: by + pic.oy, b: by + pic.oy + pic.dh };
    const clip = { l: Math.max(bx, 0), r: Math.min(bx + bw, W), t: Math.max(by, 0), b: Math.min(by + bh, H) };
    const fixes = []; let restOut = rest;
    const meltDir = (rest.match(/data-melt-dir="([^"]*)"/) ?? [])[1] ?? null;
    const next = own.map(g => {
      const dm = g.match(/^linear-gradient\((to [a-z]+),transparent 0%,[\s\S]*#000 ([\d.]+)%\)$/); if (!dm) return g;   // % 녹임만(px 는 cutFade)
      const dir = dm[1], cur = parseFloat(dm[2]), side = sideOf[dir]; if (!side) return g;
      const edge = side === 'left' ? clip.l : side === 'right' ? clip.r : side === 'top' ? clip.t : clip.b;
      const frac = side === 'left' ? (edge - P.l) / pic.dw : side === 'right' ? (P.r - edge) / pic.dw : side === 'top' ? (edge - P.t) / pic.dh : (P.b - edge) / pic.dh;   // 그림 변에서 보이는 변까지(그림 길이 몫)
      const idxFrac = side === 'left' ? (edge - P.l) / pic.dw : side === 'right' ? (edge - P.l) / pic.dw : side === 'top' ? (edge - P.t) / pic.dh : (edge - P.t) / pic.dh;   // 열·행 색인(왼→오·위→아래)
      const hexes = seamHexes(style, side, Math.max(0, frac));
      const seamFrac = Math.max(0, frac) <= (S.edgeTol ?? 0.02) ? 0 : Math.min(1, Math.max(0, idxFrac));
      const hx = Math.max(0, frac) <= (S.edgeTol ?? 0.02) ? hexes : seamHexes(style, side, seamFrac);
      // 그림 자리에 맞춘 지면 그라데이션(fieldAlign)이면 변이 닿는 자리의 지면 색과 비교한다(변에 수직인 축이면 변 위치의 색, 평행이면 보이는 구간 가운데 색) — 캔버스 전체 두 끝 색과 비교하면 이어진 변도 멀다고 읽는다
      const AL = tr.field.aligned;
      const perp = AL ? ((AL.axis === 'v') === (side === 'top' || side === 'bottom')) : false;   // 변이 그라데이션 축에 수직인가(윗변 × 세로 축)
      const posAlong = AL ? (perp ? edge : (AL.axis === 'v' ? (Math.max(clip.t, P.t) + Math.min(clip.b, P.b)) / 2 : (Math.max(clip.l, P.l) + Math.min(clip.r, P.r)) / 2)) : 0;
      const t = AL ? Math.min(1, Math.max(0, (posAlong - AL.a) / Math.max(1, AL.b - AL.a))) : null;
      // 축에 평행한 그림 변(세로 그라데이션의 왼·오른쪽 변)은 변 안에서도 색이 흐른다(hex·from·to) — 지면의 같은 높이 색과 짝지어 잰다(from ↔ 위 1/4 · hex ↔ 가운데 · to ↔ 아래 3/4). 뭉뚱그려 재면 변의 아래 반 색이 지면 가운데 색과 멀다고 읽어 55% 로 늘인다
      const span = AL && !perp ? (AL.axis === 'v' ? [Math.max(clip.t, P.t), Math.min(clip.b, P.b)] : [Math.max(clip.l, P.l), Math.min(clip.r, P.r)]) : null;
      const fieldAt = pos => mix(stops[0], stops[1], Math.min(1, Math.max(0, (pos - AL.a) / Math.max(1, AL.b - AL.a))));
      const E0 = style.kvMeta?.field?.edges?.[side];
      const need = (AL && span && Math.max(0, frac) <= (S.edgeTol ?? 0.02) && E0?.hex && E0.from && E0.to)
        ? [[E0.from, fieldAt(span[0] + (span[1] - span[0]) * 0.25)], [E0.hex, fieldAt((span[0] + span[1]) / 2)], [E0.to, fieldAt(span[0] + (span[1] - span[0]) * 0.75)]].map(([h0, f0]) => meltNeed([h0], [f0], cur)).sort((p0, q0) => q0.pct - p0.pct)[0]
        : meltNeed(hx, AL ? [mix(stops[0], stops[1], t)] : stops, cur);
      // 그림 변이 상자 변보다 안쪽이면(contain·제 크기 그림이 칸보다 작음) 마스크를 그림 변에서 시작시킨다 — 상자 변에서 잰 길이의 상당수가 빈 칸에 쓰여 그림 변에선 짧았다(NAP 320×50 틀 칸 84 안 그림 37: 46% 가 그림 변에선 15px)
      const boxEdge = side === 'left' ? bx : side === 'right' ? bx + bw : side === 'top' ? by : by + bh;
      const picEdgeIn = side === 'left' ? P.l : side === 'right' ? P.r : side === 'top' ? P.t : P.b;
      const off = (side === 'left' || side === 'top') ? picEdgeIn - boxEdge : boxEdge - picEdgeIn;   // 상자 변 → 그림 변(px, 안쪽이면 +)
      const boxLen = (side === 'left' || side === 'right') ? bw : bh, picLen = Math.min(boxLen, (side === 'left' || side === 'right') ? pic.dw : pic.dh);
      if (off > 1) {
        const fromPct = Math.round(off / boxLen * 1000) / 10, lenPct = Math.round(Math.max(need.pct, cur) * picLen / boxLen * 10) / 10, endPct = Math.round((fromPct + lenPct) * 10) / 10;   // 길이(%)는 그림 길이 기준을 상자 % 로 환산
        if (endPct <= cur + 0.5) return g;
        fixes.push({ dir, side, cur, pct: endPct, seam: need.seam, far: need.far });
        if (meltDir === dir || (meltDir === 'sides' && dir === 'to right')) restOut = restOut.replace(/data-melt="[^"]*"/, `data-melt="${endPct}"`).replace(/data-melt-seam="[^"]*"/, `data-melt-seam="${need.seam ?? ''}"`).replace(/data-melt-far="[^"]*"/, `data-melt-far="${need.far ?? ''}"`);
        else if (dir === 'to bottom' && /data-melt-top=/.test(restOut)) restOut = restOut.replace(/data-melt-top="[^"]*"/, `data-melt-top="${endPct}"`);
        else if (dir === 'to left' && meltDir === 'sides') restOut = restOut.replace(/data-melt-right="[^"]*"/, `data-melt-right="${endPct}"`);
        return meltGradientFrom(dir, fromPct, lenPct);
      }
      if (!(need.pct > cur + 0.5)) return g;
      fixes.push({ dir, side, cur, pct: need.pct, seam: need.seam, far: need.far });
      // 추적 속성 갱신 — 같은 방향의 data-melt / 두 번째 변 data-melt-top(to bottom) / 양옆 data-melt-right(to left)
      if (meltDir === dir || (meltDir === 'sides' && dir === 'to right')) restOut = restOut.replace(/data-melt="[^"]*"/, `data-melt="${need.pct}"`).replace(/data-melt-seam="[^"]*"/, `data-melt-seam="${need.seam ?? ''}"`).replace(/data-melt-far="[^"]*"/, `data-melt-far="${need.far ?? ''}"`);
      else if (dir === 'to bottom' && /data-melt-top=/.test(restOut)) restOut = restOut.replace(/data-melt-top="[^"]*"/, `data-melt-top="${need.pct}"`);
      else if (dir === 'to left' && meltDir === 'sides') restOut = restOut.replace(/data-melt-right="[^"]*"/, `data-melt-right="${need.pct}"`);
      return meltGradient(dir, need.pct);
    });
    if (!fixes.length) return m;
    hit = true;
    const st2 = st.replace(seg, meltMaskList(next));
    return `<div data-object="1"${attrs} style="${st2}"${restOut} data-melt-fix="${fixes.map(f => f.side[0].toUpperCase() + f.cur + '→' + f.pct).join(',')}">`;
  });
  return hit ? out.replace('&quot;rules&quot;:[', '&quot;rules&quot;:[&quot;meltFix&quot;,') : out;
}

// 끊김 녹임(10-19 사용자 「그라데이션으로 옅게 처리하던지 해 줘. 끊기는 건. 네이버도 마찬가지」) — 그린 뒤 오브젝트 상자마다 실제 그림 사각형을 계산해, 뚝 잘린 변을 지면으로 녹이는 마스크를 더한다(기존 녹임과 교집합).
//   누끼: 그림이 상자 밖으로 넘친 변(지면 변에서 잘리든 상자 변에서 잘리든) · 사진·바탕 있는 그림: 상자 변이 지면 안쪽에 있는 변(지면 변에 붙은 변은 자연스러운 끝)
//   제외: 지면 전체 그림(data-kv-only·inset:0) · 둥근 상자(카카오 썸네일·비즈보드 r10) · 템플릿이 여백을 적어 둔 변(mold.image.edgeInset — 자소설 PC팝업 8/30)은 누끼만(사진·바탕 그림은 10-21부터 녹인다) · 이미 그 변을 녹인 마스크
function cutFade(html, style, spec, tr = null) {
  const C = CANON.cutFade; if (!C || !style?.keyVisual) return html;
  const fStops = tr?.field?.stops ?? null, AL = tr?.field?.aligned ?? null;
  const W = spec.w, H = spec.h; if (!(W > 0 && H > 0)) return html;
  const px = style.kvMeta?.px, ar0 = style.kvMeta?.ar;
  const cutout = (style.kvMeta?.field?.opaque ?? 1) < 0.5;
  const inset = (spec.rules ?? spec)?.safeArea?.measuredFromTemplate?.mold?.image?.edgeInset ?? null;
  const dirOf = { left: 'to right', right: 'to left', top: 'to bottom', bottom: 'to top' };
  const grads = s => { const out = []; let i = 0; while ((i = s.indexOf('linear-gradient(', i)) >= 0) { let d = 0, j = i; for (; j < s.length; j++) { if (s[j] === '(') d++; else if (s[j] === ')' && --d === 0) break; } out.push(s.slice(i, j + 1)); i = j + 1; } return out; };
  const num = (s, k) => { const m = s.match(new RegExp('(?:^|;)' + k + ':(-?[\\d.]+)(?:px)?(?=;|$)')); return m ? parseFloat(m[1]) : null; };
  let hit = false;
  const out = html.replace(/<div data-object="1"((?:\s+data-[a-z0-9-]+="[^"]*")*) style="([^"]*)"([^>]*)>/g, (m, attrs, st, rest) => {
    if (/data-kv-only/.test(attrs) || /inset:0/.test(st) || /border-radius:(?!0px)/.test(st)) return m;
    const bw = num(st, 'width'), bh = num(st, 'height'), bx = num(st, 'left'), by = num(st, 'top');
    if (!(bw > 0 && bh > 0) || bx == null || by == null) return m;
    const bg = st.match(/background:url\('[^']*'\) ([^;]*?)\/([^;]*?) no-repeat;/); if (!bg) return m;
    const pos = bg[1].trim().split(/\s+/), size = bg[2].trim();
    const iw = px?.[0] ?? (ar0 ? ar0 * 1000 : bw), ih = px?.[1] ?? (ar0 ? 1000 : bh), ar = iw / ih;
    const lenOf = (s, total) => s.endsWith('%') ? total * parseFloat(s) / 100 : parseFloat(s);
    let dw, dh;
    if (size === 'contain') { const k = Math.min(bw / iw, bh / ih); dw = iw * k; dh = ih * k; }
    else if (size === 'cover') { const k = Math.max(bw / iw, bh / ih); dw = iw * k; dh = ih * k; }
    else if (size === 'auto' || size === 'auto auto') { dw = iw; dh = ih; }
    else { const [sw, sh] = size.split(/\s+/); if (sw === 'auto' && sh) { dh = lenOf(sh, bh); dw = dh * ar; } else if (!sh || sh === 'auto') { dw = lenOf(sw, bw); dh = dw / ar; } else { dw = lenOf(sw, bw); dh = lenOf(sh, bh); } }
    if (!(dw > 0 && dh > 0)) return m;
    const word = { left: '0%', right: '100%', center: '50%', top: '0%', bottom: '100%' };
    const p0 = pos[0] ?? 'center', p1 = pos[1] ?? 'center';
    const px0 = word[p0] ?? p0, py0 = word[p1] ?? p1;
    const ox = px0.endsWith('%') ? (bw - dw) * parseFloat(px0) / 100 : parseFloat(px0);
    const oy = py0.endsWith('%') ? (bh - dh) * parseFloat(py0) / 100 : parseFloat(py0);
    // 그림 사각형(지면 좌표)과 실제로 보이는 창(상자 ∩ 지면) — 상자 자체가 지면 밖으로 나간 경우(구글 300×600 상자 -49~348)도 잘리는 선은 지면 변이다
    const P = { l: bx + ox, r: bx + ox + dw, t: by + oy, b: by + oy + dh };
    const clip = { l: Math.max(bx, 0), r: Math.min(bx + bw, W), t: Math.max(by, 0), b: Math.min(by + bh, H) };
    const over = { left: clip.l - P.l, right: P.r - clip.r, top: clip.t - P.t, bottom: P.b - clip.b };   // 그림이 보이는 창 밖으로 넘친 px(잘린 몫)
    const gapC = { left: bx, right: W - (bx + bw), top: by, bottom: H - (by + bh) };   // 상자 변과 지면 변 사이(사진 상자의 안쪽 변 판정)
    const visLen = s => (s === 'left' || s === 'right') ? (clip.r - clip.l) : (clip.b - clip.t);
    const startPx = s => s === 'left' ? clip.l - bx : s === 'right' ? (bx + bw) - clip.r : s === 'top' ? clip.t - by : (by + bh) - clip.b;   // 상자 변에서 잘리는 선까지(상자가 지면 밖이면 > 0)
    const gradPx = (dir, from, len) => { const n = Math.max(3, CANON.melt?.stops ?? 7); const st = []; for (let i = 0; i < n; i++) { const t = i / (n - 1), al = t * t * (3 - 2 * t); const at = Math.round((from + len * t) * 10) / 10; st.push(i === 0 ? `transparent ${at}px` : i === n - 1 ? `#000 ${at}px` : `rgba(0,0,0,${al.toFixed(2)}) ${at}px`); } return `linear-gradient(${dir},${st.join(',')})`; };
    const own = grads((st.match(/-webkit-mask-image:[^;]*;/) ?? [''])[0]);   // 기존 녹임(접두사 사본 한 벌만 — mask-image 쪽은 같은 목록)
    const had = new Set(own.map(g => (g.match(/^linear-gradient\((to [a-z]+)/) ?? [])[1]).filter(Boolean));
    const add = [], sides = [];
    for (const s of ['left', 'right', 'top', 'bottom']) {
      // 템플릿 여백 변(edgeInset)은 누끼(칸 안 contain, 안 잘림)에서만 건너뛴다 — 사진·바탕 있는 그림은 cover 로 칸 변에서 뚝 잘리므로 여백 변이어도 녹인다(10-21 사용자 「또 끊김」: 자소설 PC 팝업 오른쪽 8·아래 30 안쪽 칸의 3D 캐릭터 그림이 칸 변에서 끊김. 칸 자체는 10-15 결정대로 지면 안쪽 그대로)
      if (inset && inset[s] != null && cutout) continue;
      if (had.has(dirOf[s])) continue;
      const len = visLen(s); if (!(len > 0)) continue;
      let pct = null;
      if (cutout) { if (over[s] > C.minGap) pct = cutFadePct(over[s] / len); }
      else if (gapC[s] > C.minGap && over[s] > -C.minGap) {
        // 사진·바탕 그림의 안쪽 변: 28% 는 바닥, 그 변에서 드러나는 색과 지면이 멀면 CANON.melt 길이까지(meltFix 와 같은 자 — 네이버 DA 사진 칸 오른쪽·아래가 28% 로는 색 차 .3~.5 를 못 덮었다, 10-20 전수 감사 49건)
        pct = C.photo;
        // 템플릿 여백 변(edgeInset)은 photo 고정(CANON.cutFade.insetFixed, 10-21 「너무 조금 보여」) — 그 너머는 8·30px 지면색 띠뿐, 색 차로 55% 까지 늘리면 칸의 아래 반이 사라진다
        const fixedInset = !!(C.insetFixed && inset && inset[s] != null);
        if (fStops?.length && !fixedInset) {
          const picLen = (s === 'left' || s === 'right') ? dw : dh;
          const frac = s === 'left' ? (clip.l - P.l) / picLen : s === 'right' ? (P.r - clip.r) / picLen : s === 'top' ? (clip.t - P.t) / picLen : (P.b - clip.b) / picLen;
          const edgePos = s === 'left' ? clip.l : s === 'right' ? clip.r : s === 'top' ? clip.t : clip.b;
          const perp = AL ? ((AL.axis === 'v') === (s === 'top' || s === 'bottom')) : false;
          const posAlong = AL ? (perp ? edgePos : (AL.axis === 'v' ? (clip.t + clip.b) / 2 : (clip.l + clip.r) / 2)) : 0;
          const stopsAt = AL ? [mix(fStops[0], fStops[1], Math.min(1, Math.max(0, (posAlong - AL.a) / Math.max(1, AL.b - AL.a))))] : fStops;
          pct = Math.max(C.photo, meltNeed(seamHexes(style, s, Math.max(0, frac)), stopsAt, C.photo).pct);
        }
      }
      if (pct == null) continue;
      add.push(gradPx(dirOf[s], startPx(s), Math.round(len * pct / 100))); sides.push(s[0].toUpperCase() + pct);
    }
    if (!add.length) return m;
    hit = true;
    // 축별 녹임 예산(CANON.cutFade.keep, 10-21 「너무 조금 보여」): 한 축의 양쪽 녹임 합이 (1−keep) 를 넘으면 글자 쪽 % 녹임을 melt.min 까지, 그래도 넘치면 이번 잘린 변 녹임을 cutFade.min 까지 줄인다
    let ownOut = own, restOut = rest, budgetNote = '';
    if (C.keep > 0) {
      const ownPct = {}; const ownIdx = {};
      own.forEach((g, i) => { const dm = g.match(/^linear-gradient\((to [a-z]+),transparent 0%,(?:transparent ([\d.]+)%,)?[\s\S]*#000 ([\d.]+)%\)$/); if (!dm) return; const side = { 'to right': 'left', 'to left': 'right', 'to bottom': 'top', 'to top': 'bottom' }[dm[1]]; if (!side) return; ownPct[side] = { end: parseFloat(dm[3]), from: dm[2] != null ? parseFloat(dm[2]) : 0, dir: dm[1] }; ownIdx[side] = i; });
      const newPct = {}; sides.forEach((tag, i) => { newPct[{ L: 'left', R: 'right', T: 'top', B: 'bottom' }[tag[0]]] = { pct: parseFloat(tag.slice(1)), i }; });
      const minOwn = Math.round((CANON.melt?.min ?? 0.3) * 100), minNew = C.min ?? 10, limit = Math.round((1 - C.keep) * 100);
      const trims = [];
      for (const [a, b] of [['left', 'right'], ['top', 'bottom']]) {
        const o = ownPct[a] ? a : ownPct[b] ? b : null, n = newPct[a] ? a : newPct[b] ? b : null;
        if (!o || !n || o === n) continue;   // 양쪽이 각각 기존 녹임·이번 녹임일 때만(같은 변이면 교집합이라 더 짧은 쪽이 보인다)
        let oP = ownPct[o].end, nP = newPct[n].pct; const total = oP + nP; if (total <= limit) continue;
        let over = total - limit; const cutO = Math.min(over, Math.max(0, oP - minOwn)); oP -= cutO; over -= cutO;
        const cutN = Math.min(over, Math.max(0, nP - minNew)); nP -= cutN;
        if (cutO > 0) { const { from, dir } = ownPct[o]; const len = Math.round((oP - from) * 10) / 10; ownOut = ownOut.map((g, i) => i === ownIdx[o] ? (from > 0 ? meltGradientFrom(dir, from, len) : meltGradient(dir, Math.round(oP))) : g);
          const oPct = from > 0 ? Math.round(oP * 10) / 10 : Math.round(oP);
          const md = (rest.match(/data-melt-dir="([^"]*)"/) ?? [])[1];
          if (md === dir || (md === 'sides' && dir === 'to right')) restOut = restOut.replace(/data-melt="[^"]*"/, `data-melt="${oPct}"`);
          else if (dir === 'to bottom' && /data-melt-top=/.test(restOut)) restOut = restOut.replace(/data-melt-top="[^"]*"/, `data-melt-top="${oPct}"`);
          else if (dir === 'to left' && md === 'sides') restOut = restOut.replace(/data-melt-right="[^"]*"/, `data-melt-right="${oPct}"`);
          trims.push(`${o[0].toUpperCase()}${ownPct[o].end}→${oPct}`); }
        if (cutN > 0) { const i = newPct[n].i; add[i] = gradPx(dirOf[n], startPx(n), Math.round(visLen(n) * nP / 100)); sides[i] = n[0].toUpperCase() + Math.round(nP); trims.push(`${n[0].toUpperCase()}${newPct[n].pct}→${Math.round(nP)}`); }
      }
      if (trims.length) budgetNote = ` data-fade-budget="${trims.join(',')}"`;
    }
    const seg = /-webkit-mask-image:[^;]*;(?:-webkit-mask-composite:[^;]*;)?mask-image:[^;]*;(?:mask-composite:[^;]*;)?/;
    // 기존 녹임 자리에 합쳐 넣는다(마스크 순서·다른 속성 위치 그대로 — 테스트·svg 내보내기가 읽는 문자열). 마스크가 없던 상자는 뒤에 붙이되 `;` 를 보장한다 —
    //   10-20 전수 감사: 틀 모서리 칸(`…overflow:hidden"`)·블리드 층 뒤에 `;` 없이 붙어 `overflow:hidden-webkit-mask-image:…` 가 되면 Chrome 이 overflow 와 마스크를 둘 다 버린다(인스타 1080 비씨월드 L28/T28 이 적용되지 않았다)
    const st2 = seg.test(st) ? st.replace(seg, meltMaskList([...ownOut, ...add])) : st + (/;\s*$/.test(st) || !st ? '' : ';') + meltMaskList(add);
    return `<div data-object="1"${attrs} style="${st2}"${restOut} data-cut-fade="${sides.join(',')}"${budgetNote}>`;   // 녹인 변 표시는 태그 끝에(앞 속성 순서를 읽는 테스트·대조표 그대로)
  });
  return hit ? out.replace('&quot;rules&quot;:[', '&quot;rules&quot;:[&quot;cutFade&quot;,') : out;
}

// 서 있는 인물·캐릭터 누끼(전신 — 그림 비율 < CANON bust.maxAr)는 상반신으로(10-14 t1014 동서식품 인물 누끼 디자이너 9/9 머리~허리 · 바이오노트 개 누끼 인스타 V1 머리~가슴).
//   상자에 통째로 맞추면(contain) 키에 맞춰 작아져 얼굴이 점만 해진다. 배치는 「위 vis 몫만 있는 그림」으로 잡고(비율·주인공 상자·행 프로필을 그 몫으로),
//   그린 뒤 그림 상자마다 머리를 위(숨 top)에 붙이고 아래는 상자 밖으로 흘린다. 원본 확대 상한(CANON maxUpscale)은 그대로
function bustOf(style, spec) {
  const B = CANON.bust; const m = style?.kvMeta;
  if (!B || !style?.keyVisual || !m?.field || objectNeedOf(spec.rules ?? {}, m.field ?? null)) return null;
  const t = kvTypeOf(m), ar = m.ar;
  if (!t || t.id !== 'cutout' || !t.flags.character || t.flags.group || !(ar > 0) || ar >= B.maxAr) return null;
  if (spec.w / spec.h < (B.minCanvasAr ?? 0)) return null;   // 세로로 긴 지면(300×1050·스토리·세로 띠·320×480 — 폭/높이 < 0.7)은 전신이 자리를 채운다. 상반신이면 빈 띠(10-14 desk-03-cut·hdot-speaker-b 300×1050, 동서식품 NAP 320×480 29%)
  const v = B.vis, f = m.field, fo = f.focus;
  const focus = fo ? (() => { const top = Math.max(0, fo.y - fo.h / 2), bot = Math.min(v, fo.y + fo.h / 2); return { ...fo, y: Math.round((top + bot) / 2 / v * 100) / 100, h: Math.round((bot - top) / v * 100) / 100 }; })() : fo;
  const rows = f.rows?.length ? f.rows.slice(0, Math.max(1, Math.round(f.rows.length * v))) : f.rows;
  return { ar, v, meta: { ...m, ar: ar / v, px: m.px ? [m.px[0], Math.round(m.px[1] * v)] : m.px, field: { ...f, focus, rows }, bust: v } };
}
function bustCrop(html, style, bust, spec) {
  const B = CANON.bust, ar = bust.ar;
  const capW = cutoutCapW(style);
  let hit = false;
  const out = html.replace(/<div data-object="1" style="([^"]*?)width:(\d+)px;height:(\d+)px;([^"]*?)background:url\('([^']*)'\) ([a-z ]*?)\/contain no-repeat;/g, (m, a, bw, bh, b, url, pos) => {
    bw = +bw; bh = +bh;
    const Hd = Math.round(Math.min(bh / bust.v, bw * B.widen / ar, Number.isFinite(capW) ? capW / ar : Infinity));
    if (Hd <= bh * 1.02) return m;
    hit = true;
    const x = /right/.test(pos) ? 'right' : /left/.test(pos) ? 'left' : 'center';
    // 상자 아랫변이 지면 안쪽이면(카카오·에브리타임 오브젝트 상자) 허리 아래를 녹인다 — 지면 밖으로 흘리지 못하면 몸통이 상자 변에서 뚝 끊긴다(10-14 desk-03-cut·hdot-speaker-b 회귀)
    const top = +((`${a}${b}`.match(/(?:^|;)top:(-?\d+)px/) ?? [])[1] ?? NaN), atBottom = /(?:^|;)bottom:0/.test(`${a}${b}`) || (Number.isFinite(top) && top + bh >= spec.h - 2);
    const fade = atBottom ? '' : meltMask('to top', 100 - B.fadeFrom);   // 아래에서 위로 녹임(같은 smoothstep 곡선)
    return `<div data-object="1" data-bust="${bust.v}"${fade ? ` data-melt="${100 - B.fadeFrom}" data-melt-dir="to top"` : ''} style="${a}width:${bw}px;height:${bh}px;${b}${fade}background:url('${url}') ${x} ${Math.round(bh * B.top)}px/auto ${Hd}px no-repeat;`;
  });
  return hit ? out.replace('&quot;rules&quot;:[', '&quot;rules&quot;:[&quot;kv.bust&quot;,') : out;
}

function renderAdBase(ctx, style, spec) {
  const rules = spec.rules ?? {};
  // 오브젝트 누끼 — 투명 PNG 필수 자리와 그라데이션을 넣을 수 없는 상자 자리는 배경 노릇을 하는 키비주얼 대신 따로 올린 누끼를 쓴다(core/adfields.js objectNeedOf).
  // 없으면 그 자리는 글자만(hasKv 게이트). 누끼가 아닌 그림을 올렸어도 같은 게이트에 걸려 글자만 — 앱이 올릴 때 알려 준다
  const objectNeed = objectNeedOf(rules, style.kvMeta?.field ?? null);
  if (objectNeed && style.object) style = { ...style, keyVisual: style.object, kvMeta: style.objectMeta ?? null, kvUse: 'auto', visual: 'object' };
  const mr = spec.mediumRules ?? {};
  const D = designOf(spec.medium) ?? null;
  const p = style.palette;
  const { w, h } = spec;
  // 가이드 대조표용 추적(10-12 scripts/guide-trace.mjs): 이 렌더가 내린 결정을 루트 data-trace(JSON)에 적는다 — 그림엔 영향 없음. rules = 걸린 CANON·유형 규칙 이름
  const TR = { v: 1, rules: [] }; LAST_TR = TR;
  // 편집(10-14 core/editlayout.js) — 프리셋·직접 수정이 하나도 없으면 null 이고 아래 모든 분기가 꺼진다(기본 그림 바이트 동일)
  const ED = editOf(style);
  // 겹침 교정 사다리(10-19 overlapFix, renderAd 가 재렌더 때 넘기는 내부 힌트 — 저장 안 함): textK 글자 배율 · wrap 메인 두 줄 · kvK 키비주얼 배율(편집 「키비주얼 크기」와 같은 자리)
  const FIX = style.__fix ?? null;
  const kvK = FIX?.kvK ?? (ED?.kvSize ? KV_SIZE_K[ED.kvSize] : 1);
  const TA = textAlignOf(style, spec);   // 정렬 프리셋(10-19 core/alignrule.js): 'left'|'center'|'right' — 잠긴 규격(규정 매체 틀·글자 없음)은 null
  const fired = n => { if (!TR.rules.includes(n)) TR.rules.push(n); };
  const ladder = copyLadder(ctx);
  const counting = mr.textCounting ?? 'all-1';

  /* ── 슬롯 ── 매체 글자수 표에 있는 역할만. 표가 없으면 메인·서브·날짜가 기본(구글: 날짜 28/28 유지). */
  const inLimits = (rules.textLimits ?? []).filter(inImage);
  const by = limitsByRole(inLimits);
  // 규정이 없는 매체(구글 GDN)는 보드의 디자인 가이드가 슬롯·칩·글자 px·오브젝트 폭·시안 2종을 정한다(core/media/google-gdn.json guide)
  // 매체 가이드(구글) 위에 배너 공통 조형 기준(core/canon.js)을 깐다 — 가이드가 정한 키가 이긴다
  const guide = guideFor(mr);
  const slots = Object.keys(by).length ? by
    : guide?.slots ? Object.fromEntries(guide.slots.map(r => [r, { lines: r === 'date' ? 1 : null, maxChars: null }]))
    : { main: { lines: null, maxChars: null }, sub: { lines: null, maxChars: null }, date: { lines: 1, maxChars: null } };
  const logoOnly = /로고|프로필/.test(rules.name ?? spec.name ?? '') && !inLimits.filter(t => /메인|서브|상세|제목|헤드|문구|카피/.test(String(t.field ?? ''))).length;   // 프로필·로고 이미지(160×160·300×300)는 로고만 — 광고주명 같은 밖 글자 한도가 있어도
  if (!logoOnly && !slots.main) slots.main = { lines: null, maxChars: null };
  // 한 덩어리 글자 규정(에브리타임 홈 카드 '이미지 내 텍스트(메인/서브 구분 없음) 최대 5줄'): 역할을 안 나누면 메인만 5줄로 읽어 서브·상세가 사라진다.
  // 보드 1-884 코엑스 예시는 아이브로 1 + 메인 2 + 알약 1 + 값 1 = 5줄 — 총 줄 수를 서브 1 · 상세 2 · 메인 나머지로 나눈다
  const combined = inLimits.find(t => /구분\s?없음|전체/.test(String(t.field ?? '')) && (t.lines ?? 0) >= 4);
  if (combined && !logoOnly && !by.detail) {
    const total = combined.lines;
    slots.sub = { lines: 1, maxChars: combined.maxChars ?? null }; slots.detail = { lines: 2, maxChars: null }; slots.main = { lines: Math.max(1, total - 3), maxChars: combined.maxChars ?? null };
    delete slots.date;   // 날짜는 상세 줄로 간다
  }
  // 채용 소재는 날짜를 버리지 않는다(CANON required.recruit — Figma 9월 공채 디자이너 12/13). 매체 글자 규정이 역할을 나누지 않은 「이미지 내 텍스트」 한 줄 수뿐이면
  // (블라인드 게시글 4줄·카카오 홍보이미지 3줄) 그 줄 수를 메인 + 슬로건 1 + 날짜 1로 나눈다 — 카카오 3줄 = 메인 1 + 슬로건 1 + 날짜 1. 메인/서브를 따로 정한 매체 규정은 건드리지 않는다
  const guide0 = guideFor(mr);
  let reqDate = false;
  if (!logoOnly && ctx.kind === 'recruit' && (guide0.required?.recruit ?? []).includes('date') && ladder.date?.length && !slots.date && !slots.detail) {
    // 네이버 모바일 DA '광고 문구(메인문구+서브문구) 4줄'도 같은 한 덩어리 규정(roleOf 는 sub 로 읽는다) — 10-12 매체별 규격정리
    const WHOLE_RE = /^이미지 내 텍스트$|메인문구\s*\+\s*서브문구|^광고 문구/;
    const whole = inLimits.filter(t => WHOLE_RE.test(String(t.field ?? '').trim()));
    const wholeSub = whole.length > 0 && by.sub && inLimits.filter(t => roleOf(t.field) === 'sub').every(t => WHOLE_RE.test(String(t.field ?? '').trim()));
    if (whole.length && Object.keys(by).every(r => r === 'main' || r === 'notice' || (r === 'sub' && wholeSub))) {
      if (wholeSub) delete slots.sub;   // 「메인문구+서브문구」 한 덩어리 — 서브 칸이 아니라 전체 줄 수
      const total = whole.reduce((n, t) => n + (t.lines ?? 0), 0) || null;
      const slogan = !!(ctx.core?.slogan);
      slots.date = { lines: 1, maxChars: null };
      // 4줄이면 디자이너는 메인 2 + 날짜 1 + 모집직무 1(블라인드 대원제약·HS화성 2/2, 네이버 3/3 — 10-12 매체별 규격정리). 슬로건은 그 다음(5줄부터)
      const hasDetail = (ladder.details ?? []).some(d => d.label !== '접수기간');
      if (hasDetail && (total == null || total >= 4)) slots.detail = { lines: Math.max(1, (total ?? 4) - 3), maxChars: null };
      if (slogan && (total == null || total >= (slots.detail ? 5 : 3))) slots.sub = { lines: 1, maxChars: null };
      if (total != null) slots.main = { ...slots.main, lines: Math.max(1, total - 1 - (slots.sub ? 1 : 0) - (slots.detail?.lines ?? 0)) };
      reqDate = true;
    }
    // 「기타 문구」 칸이 모집 일정을 허용하면(에브리타임 '모집 일정·앱설치…만') 그 칸에 날짜
    else if (slots.extra && inLimits.some(t => roleOf(t.field) === 'extra' && /모집 일정|일정/.test(String(t.note ?? '')))) ladder.extra = [...ladder.date.map(d => d.replace(/^접수기간 : /, '')), ...(ladder.extra ?? [])];
  }
  // 샘플 실측(매체 JSON spec.sampleText — 디자이너 샘플이 보여 주는 역할·줄·px): 규정 표에 없는 역할을 더한다(NAP 띠배너 날짜 2/4·전면 상세 3/4, 잡다 PC 라벨).
  //   같은 역할을 규정이 정했으면 규정이 이긴다. 역할이 있는 프레임이 절반 이상일 때만. 글자 크기는 statedFontSizes 뒤에서 같은 우선순위로 쓴다 (10-12 매체별 규격정리 86프레임·29규격)
  const sampleRoles = rules.sampleText?.measuredFromSamples?.roles ?? null;
  // 실제 정보가 비어 있으면(마감일·직무 없음) 자리는 두고 「샘플 문구」를 넣어 샘플 밀도를 맞춘다 — 지어낸 사실이 아니라 자리표시(data-sample="1", 앱이 배지로 알려 디자이너가 승인 전에 바꾼다)
  const SAMPLE_COPY = { date: '0/00(월) ~ 0/00(일)', detail: { label: '모집직무', value: '모집 직무를 입력하세요' } };
  const sampleText = new Set();
  // 매체가 총 줄 수를 정한 규격(combined·reqDate — 에브리타임 홈 카드 5줄·블라인드 4줄)은 그 예산이 규칙이라 더하지 않는다. 라벨 칩은 매체 규정으로만(샘플의 라벨 줄은 상세 블록 안의 라벨 줄이다).
  // 아이브로(sub)는 과반(> 0.5)일 때만, 얇은 띠(strip)엔 넣지 않는다 — NAP 320×100 아이브로 2/4 가 띠를 넘쳐 잘렸다
  // 매체 가이드가 슬롯을 정한 매체(구글 — 날짜는 상세 칩 안)도 더하지 않는다. 얇은 띠(h < 120)는 과반(> 0.5)일 때만 — NAP 320×50 날짜 2/4 를 넣으면 메인이 11px 로 내려앉는다
  if (sampleRoles && !logoOnly && ctx.kind === 'recruit' && !combined && !reqDate && !mr.guide?.slots) {
    // 누끼 떼(사람·사물 여럿 — 키가 고르게 높아 위가 비지 않는다)는 샘플이 보여 준 상세 줄(규정 아님)을 더하지 않는다 — 상세가 머리 위로 올라갔다(10-14 t1014 ABL·바이오노트 고양이 NAP 300×250 77%, ABL 디자이너 300×250 상세 없음)
    const groupCut = !!(style.keyVisual && (style.kvMeta?.field?.opaque ?? 1) < 0.5 && kvTypeOf(style.kvMeta)?.flags.group);
    for (const r of ['sub', 'date', 'detail']) {
      const sr = sampleRoles[r];
      if (slots[r] || !sr || sr.share < 0.5) continue;
      if (r === 'detail' && groupCut) { fired('sample.detail.groupSkip'); continue; }
      if (r === 'date' && slots.extra && (ladder.extra ?? []).some(x => (ladder.date ?? []).includes(x))) continue;   // 날짜가 이미 「기타 문구」 칸(에브리타임 커뮤니티보드 모집 일정)에 갔으면 또 세우지 않는다 — 10-13 전수 검사: 두 줄이 되며 메인이 안전영역 위로 1px 밀렸다(17케이스)
      if ((r === 'sub' || h < 120) && sr.share <= 0.5) continue;
      if (r === 'sub' && h < 120) continue;
      const has = ladder[r]?.length || (r === 'detail' && ladder.details?.length);
      if (!has) {
        if (r === 'date') { ladder.date = [SAMPLE_COPY.date]; sampleText.add(SAMPLE_COPY.date); }
        else if (r === 'detail') { ladder.details = [...(ladder.details ?? []), { ...SAMPLE_COPY.detail }]; sampleText.add(SAMPLE_COPY.detail.value); }
        else continue;
      }
      // 상세는 라벨 줄 몫을 하나 더 둔다(NAP 320×480 안랩: 「모집부문」 칩 줄 + 값 2줄 — 값 줄 수만 세면 긴 직무 목록이 통째로 빠진다)
      slots[r] = { lines: Math.max(1, Math.round(sr.lines)) + (r === 'detail' && sampleRoles.label ? 1 : 0), maxChars: null, sample: true };
    }
  }
  // 레퍼런스(core/layouts.js)가 형태별 문법을 정한다. 레퍼런스가 없는 120px 미만 띠만 예전 띠 문법을 쓴다.
  const L = layoutFor(w, h);
  const useRef = !logoOnly && L.shape !== 'strip';
  // 가이드 시안(구글 '좌측상단 정렬' / '좌측중앙 정렬') — 중앙 버전은 글자 덩어리를 세로 가운데에 두고 바닥에 브랜드색 띠를 깐다
  const gv = guide?.variants?.[spec.variant ?? 0] ?? null;
  let vCenter = gv ? gv.vAlign === 'center' : L.vAlign === 'center';   // 질감 배경이면 글자 덩어리를 세로 가운데에(마이다스 파랑 그라데이션 예시) — 아래가 비어 보이지 않게
  const band = rules.safeArea?.measuredFromTemplate?.mold?.band != null ? Math.round(rules.safeArea.measuredFromTemplate.mold.band) : (gv?.band ? Math.round(gv.band) : 0);   // 틀이 띠를 정하면(구글 930 템플릿 하단 42px) 그 값(10-15)
  let logoPlace = (guide?.logo && L.logo === 'none') ? 'top-right' : L.logo;   // 가이드 매체는 가로형에도 로고 우상단(구글 970 7/7). 배경형에서 그 모서리가 주인공이면 좌상단으로
  // 가로형 기본 우상단 로고(CANON wideLogo)는 매체가 오브젝트 상자를 정한 규격(카카오 비즈보드·에브리타임 커뮤니티보드 — 오른쪽이 오브젝트 자리, 광고주 표기는 카피·오브젝트로)엔 두지 않는다
  if (L.shape === 'wide' && !guide?.logo && rules.objectBox && !((rules.logo?.count ?? 0) >= 1)) logoPlace = 'none';
  // 구글 예시의 헤드라인 문법: 시즌은 메인 첫머리("2026년 동부건설 신입사원 공개채용"), 아이브로는 슬로건만(없으면 서브 없음 — 비씨월드)
  if (guide?.seasonInMain && ctx.kind === 'recruit') {
    const c0 = ctx.core ?? {};
    const hire0 = hireOf(c0.hiringType || c0.employType);
    // 시즌 자리는 둘 다 예시에 있다 — 앞("2026년 동부건설 …" 동부·ABL) 또는 회사 뒤("비씨월드제약/헬스케어 2026년 3차 정기 채용"). 앞이 안 들어가면 뒤
    const season0 = c0.season || seasonOf(c0.deadline);   // 적지 않은 시즌은 마감일에서 유추
    const sc = season0 && c0.client ? `${season0} ${c0.client} ${hire0}` : null;
    const sc2 = season0 && c0.client ? `${c0.client} ${season0} ${hire0}` : null;
    const first = [c0.headline, sc, sc2].filter(Boolean);
    ladder.main = [...new Set([...first, ...(ladder.main ?? [])])];
    // 세로 띠도 회사가 메인에 남는다(일화 300×1050 "㈜일화 / 신입/경력 / 사원 모집") — 서브가 슬로건뿐이라 회사를 서브로 올릴 수 없다
    ladder.mainNarrow = ladder.main;
    const subOnly = [c0.headline ? [season0, c0.client, hire0 !== '채용' ? hire0 : null].filter(Boolean).join(' ') : null, c0.slogan || (c0.client ? `${c0.client}에서 함께할 인재를 찾습니다` : null)].filter(Boolean);
    ladder.sub = subOnly; ladder.subNarrow = subOnly;
  }

  const tScale = templateScale(rules, w);
  // 템플릿 틀(10-15 templateMold, 사용자 「구멍 뚫린 틀」): 매체 샘플을 그대로 틀로 쓰는 규격(자소설 — rules.safeArea.measuredFromTemplate.mold).
  //   글자 칸(x·줄 y·크기·굵기·색)·로고 칸·그림 칸·지면 처리가 고정이고 캠페인마다 배경색·키비주얼·문구만 바뀐다. 일반 배치(CANON 행간·블리드·로고 상한·유리/채도 지면·스크림·프리셋)는 돌리지 않는다
  const tpl0 = rules.safeArea?.measuredFromTemplate ?? null;
  const mold = tpl0?.mold ?? null;
  if (mold?.rows) for (const r of ['sub', 'main', 'detail']) { const ln = mold.rows[r]?.lines; if (slots[r] && ln) slots[r] = { ...slots[r], lines: Math.min(slots[r].lines ?? ln, ln) }; }   // 틀의 줄 수가 규정보다 적으면(채용공고 서브 1줄) 틀대로
  if (mold) { if (!mold.rows?.date) delete slots.date; delete slots.label; }   // 틀에는 날짜 줄·라벨 칩이 따로 없다(달력은 마감일 줄이 틀) — 날짜는 상세 첫 항목(「모집일정」)으로(세아제강 28:124·28:333)
  // 틀의 서브는 시즌이 먼저(mold.subPrefer 'season' — 자소설 샘플 4/4 「2026년 하반기」·「2026 상반기」), 시즌이 없으면 기존 사다리(슬로건·회사)
  if (mold?.subPrefer === 'season' && ctx.kind === 'recruit' && ctx.core?.season) {
    const s0 = String(ctx.core.season); ladder.sub = [s0, ...(ladder.sub ?? []).filter(x => x !== s0)]; ladder.subNarrow = [s0, ...(ladder.subNarrow ?? []).filter(x => x !== s0)];
    // 시즌이 서브에 섰으니 메인에서는 뺀다(세아 「세아제강 / 신입/경력사원 채용」 — 메인에 시즌 없음 4/4). 후보가 하나도 안 남으면 그대로
    for (const k0 of ['main', 'mainNarrow', 'mainWide']) { const kept = (ladder[k0] ?? []).filter(c => !String(c).includes(s0)); if (kept.length) ladder[k0] = kept; }
  }
  // 틀 메인은 회사 / 채용구분 두 줄이 먼저(세아 「세아제강 / 신입/경력사원 채용」· 현대케피코 「현대케피코 / 신입채용 (채용연계형 인턴)」 4/4) — 줄 수가 2 이상인 틀에서 회사로 시작하는 후보를 회사 뒤에서 나눈 것을 앞에 둔다
  if (mold && (mold.rows?.main?.lines ?? 1) >= 2 && ctx.core?.client) {
    const cl = String(ctx.core.client);
    for (const k0 of ['main', 'mainNarrow']) {
      const two = (ladder[k0] ?? []).filter(c => !String(c).includes('\n') && String(c).startsWith(cl + ' ') && String(c).length > cl.length + 1).map(c => `${cl}\n${String(c).slice(cl.length + 1)}`);
      /* mold.seasonMain(인스타 1080·구글 300×1050 수정본 10-16): 「시즌 회사명 / 채용구분」 두 줄을 회사명 두 줄보다 먼저 — 구글 가이드(seasonInMain) 사다리의 「회사명 시즌 채용구분」이 「ABL생명 / 2024 신입사원 공개채용」 3줄로 접히던 것 */
      const sn = ctx.core?.season ? String(ctx.core.season) : null; const head = sn ? `${sn} ${cl}` : null;
      const seasonTwo = (mold.seasonMain && head) ? (ladder[k0] ?? []).filter(c => !String(c).includes('\n') && String(c).startsWith(head + ' ') && String(c).length > head.length + 1).map(c => `${head}\n${String(c).slice(head.length + 1)}`) : [];
      if (two.length || seasonTwo.length) ladder[k0] = [...seasonTwo, ...two, ...(ladder[k0] ?? [])];
    }
  }
  // 매체가 밝힌 글자 크기 띠(블라인드 게시글 textLimits fontSizeRange 32~56 — 이미지 안 글자 전부)
  const fsRange0 = inLimits.find(t => t.fontSizeRange)?.fontSizeRange ?? null;
  const fsRange = fsRange0 ? { min: fsRange0.min != null ? Math.round(fsRange0.min * tScale) : null, max: fsRange0.max != null ? Math.round(fsRange0.max * tScale) : null } : null;
  const statedEarly = statedFontSizes(rules, tScale);
  const pickInfo = (role, widthPx, fsHint = null, linesHint = null, only = null) => {
    const cands = ladder[role] ?? [];
    if (!cands.length) return { text: '', fits: true };
    const slot = slots[role];
    let perLine = (role === 'main' && mold?.rows?.main?.px != null) ? null : (slot?.maxCharsPerLine ?? null);   /* 틀이 메인 크기·폭을 정했으면 매체 자리표시 글자수(NAP 320×480 「최대 6글자」×3줄)로 줄을 세지 않고 폭으로 센다 — 사용자 수정본(10-16)은 34px 2줄 「신입사원 공개채용」 */
    const fs = statedEarly[role] ?? fsHint;
    // 줄당 글자수 = 매체 값(자소설 메인 6자)과 실제 폭 어림 중 작은 쪽. 폭 어림은 0.9em/자 — 0.98로 재면 "영업∙마케팅"(5.5자)이 두 줄로 세어지고,
    // 매체 값만 믿으면 넓은 글자 칸을 전제한 값(캐치 17자)이 좁은 지면(515×315)에서 넘친다
    if (fs && widthPx) perLine = Math.min(perLine ?? Infinity, Math.max(1, Math.floor(widthPx / (fs * 0.9))));
    const linesCap = Math.min(slot?.lines ?? Infinity, linesHint ?? Infinity);
    // 한 낱말이 한 줄보다 길면 낱말 중간에서 끊긴다("도레이첨단소재" 7자 > 달력배너 행당 6자) — 그 문구는 안 맞는 것으로 본다
    // 빗금·가운뎃점으로 이어진 긴 낱말("비씨월드제약/헬스케어" 11자)은 그 뒤에서 끊을 수 있다(예시 "비씨월드제약 / 헬스케어") — 8자 넘는 덩어리는 조각으로 센다
    const pieces = w => (countChars(w, counting) > 8 || (perLine != null && Number.isFinite(perLine) && countChars(w, counting) > perLine)) ? w.split(/(?<=[\/∙·])/) : [w];
    // 글자수로는 들어가도 폭으로 안 들어가는 낱말(「GC녹십자그룹」 — half-latin 셈 6자지만 라틴 2자가 1.24em)은 글꼴 폭(0.9em/자 어림과 같은 자)으로 한 번 더 거른다 — 10-13 전수 검사 desk-36 자소설 160×600 메인 잘림
    const wordOk = c => perLine == null || !Number.isFinite(perLine) || !String(c).split(/\s+/).flatMap(pieces).some(w => countChars(w, counting) > perLine || (fs && widthPx && textWidth(w) * fs * 0.9 > widthPx));
    // 줄 수 추정: 매체가 줄당 글자수를 정했으면 글자수로, 아니면 글꼴 폭(textWidth)으로 — 글자수 0.9em 어림은 띄어쓰기·빗금까지 한 글자로 세어
    // "㈜일화 신입/경력 사원 모집"(575px)을 582px 칸에서 두 줄로 보고 회사를 떨어뜨린다(카카오). fitFontSize와 같은 자로 재야 둘이 어긋나지 않는다
    const linesOf = c => (slot?.maxCharsPerLine != null || !(fs && widthPx)) ? estimateLines(c, perLine, counting) : Math.max(1, Math.ceil(textWidth(c) * fs * 1.04 / widthPx));
    // 틀(mold)의 글자수는 줄당 값(자소설 「행당 최대 15자」) — 적어 둔 줄바꿈이 있으면 가장 긴 줄로 센다(「현대케피코 / 신입채용 (채용연계형 인턴)」 28:1002)
    const charsOf = c => mold ? Math.max(...String(c).split('\n').map(t => countChars(t, counting))) : countChars(c, counting);
    const fits = c => (slot?.maxChars == null || charsOf(c) <= slot.maxChars) && wordOk(c)
      && (!Number.isFinite(linesCap) || perLine == null || !Number.isFinite(perLine) || linesOf(c) <= linesCap);
    if (only != null) return { text: only, fits: fits(only), last: false };   // 특정 문구 하나가 이 크기에 들어가는지만
    const hit = cands.find(fits);
    // last: 사다리 맨 끝("채용 공고")까지 내려갔다 — 들어가긴 하지만 정보가 없는 문구라, 글자를 줄여서라도 위 문구를 살릴 수 있는지 본다
    return { text: hit ?? cands[cands.length - 1], fits: !!hit, last: cands.length > 1 && (hit ?? cands[cands.length - 1]) === cands[cands.length - 1] };
  };
  const pickIn = (...a) => pickInfo(...a).text;
  const core = ctx.core ?? {};
  // 세로 띠(160×600)는 회사가 서브로 올라가고 메인은 채용구분만(도레이·한독) — 메인 폭이 6자라 회사+구분이 안 들어간다
  if (useRef && L.shape === 'tower' && ctx.kind === 'recruit') {
    ladder.sub = [...(ladder.subNarrow ?? []), ...(ladder.sub ?? [])];
    ladder.main = [...(ladder.mainNarrow ?? []), ...(ladder.main ?? [])];
  }
  // 가로형은 시즌이 메인 앞에 붙는다(삼진제약) — 서브 줄은 접수기간이 쓴다
  // 가이드가 상세 슬롯을 둔 매체(구글)는 접수기간이 상세 칩으로 가므로 서브는 시즌·슬로건 그대로(일화 970: 슬로건 → 메인 → 라벨 2개)
  // 규정이 서브·상세 칸을 둘 다 정한 매체(자소설 PC메인배너 1200×280)는 가로형이어도 템플릿 구조 그대로 — 서브 = 시즌, 메인 = 회사 + 채용구분, 상세 = 채용일정·모집직무(현대케피코 샘플 408:37780, 10-12 매체별 규격정리)
  const tplCopy = !!(by.sub && by.detail && rules.fontSizes && ctx.kind === 'recruit');   // 글자 크기까지 템플릿이 정한 매체(자소설)만 — 카카오 비즈보드(메인·서브·부가정보)는 예전 문법
  if (((useRef && L.shape === 'wide') || mold?.seasonMain) && ctx.kind === 'recruit' && ladder.mainWide?.length && !guide?.seasonInMain && !tplCopy) ladder.main = [...ladder.mainWide, ...(ladder.main ?? [])];   /* mold.seasonMain: 정사각 틀도 시즌 포함 메인(인스타 1080 수정본 10-16 「2024 ABL생명 / 신입사원 공개채용」) */
  if (useRef && L.shape === 'wide' && slots.sub && ctx.kind === 'recruit' && ladder.date?.length && !guide?.seasonInMain && !reqDate && !tplCopy && !mold) {   // reqDate: 날짜 줄이 따로 있다 — 서브는 슬로건 · 틀(mold)은 서브 = 시즌/슬로건, 날짜는 상세·날짜 줄(캐치 이미지형 1:5765)
    ladder.sub = [...ladder.date, ...(ladder.sub ?? [])];
  }
  let copy = Object.fromEntries(Object.keys(ladder).filter(k => !['details', 'mainNarrow', 'subNarrow', 'mainWide'].includes(k)).map(r => [r, pickIn(r, null)]));

  /* ── 지면 성격 ── */
  const S = Math.sqrt(w * h);
  const strip = !logoOnly && !useRef;
  const tall = h / w > 1.6;
  const shape = strip ? 'strip' : tall ? 'tall' : (w / h >= 1.6 ? 'wide' : 'box');
  const Ds = D?.byShape?.[shape];
  const prof = key => val(Ds?.[key]) ?? val(D?.[key]);
  const profNum = key => (Ds?.[key] ?? D?.[key]) ?? null;

  /* ── 규격이 정한 배경 제약 ── */
  const bgText = String(rules.background ?? '');
  const transparent = /투명/.test(bgText) && !/투명.{0,12}?(불가|금지)/.test(bgText);
  const solidOnly = !!spec.flat || /동일한 단색 배경만|단색 사용 권장|그라데이션\s?권장하지/.test(bgText);
  // 좌우 끝이 단색이어야 하는 지면(NAP 띠·알바몬 가변영역) — 이미지를 가장자리까지 붙이지 않는다
  const edgeSolid = /좌우\s?(1px|16px|여백)|가변영역/.test(bgText);
  // 반사·유리 누끼(kvtypes flags.glass)는 매체의 밝은 지면보다 어두운 브랜드 지면이 먼저 — 밝은 틴트 위에선 회색으로 탁해진다(Figma 9월 공채 13/13 다크, 10-08 사용자 결정)
  const glassKv = !!(style.keyVisual && (kvTypeOf(style.kvMeta)?.flags.glass || kvTypeOf(style.kvMeta)?.flags.frame));   // 장식 프레임(유리 슬랩)도 어두운 지면(10-09 figma-dg 9/9)
  // 10-15 오후 사용자: 「키비주얼과 배경은 이전 가이드로」 — 틀(mold)은 글자·로고·그림 칸 위치만 고정하고 지면 밝기는 강제하지 않는다(배경색 자유: 채용공고 샘플 6개 중 어두운 3).
  //   한때 틀 매체의 밝은 샘플 지면을 유리 누끼 어두운 지면 규칙보다 앞세웠더니(templateLight) 유리 행성이 밝은 틴트 위에서 회색으로 탁해지고 KV 와 안 어울렸다(보드 41:44 1차).
  //   mold.light 를 데이터로 명시한 틀만 밝게 고정. 그 밖엔 CANON(유리·프레임 → 어두운 브랜드 지면, 나머지 → 매체 bgLight)
  const templateLight = !!mold && mold.light === true;
  const lightProfile = templateLight || (!glassKv && (!!guide?.lightField || (D?.bgLight?.value ?? 0) >= 0.6));      // 자소설: 밝은 지면 위 검정 카피(9/13) · 구글: 가이드가 밝은 지면(흰색·브랜드 틴트 20/28)

  /* ── 글꼴 ── */
  const required = mr.fonts?.required;
  const family = required ? `'${required}', ${fontStack(style.fonts.heading)}` : fontStack(style.fonts.heading);

  /* ── 템플릿 실측 칸 (자소설) ── */
  const tpl = tpl0;
  let tLogo = rect(mold?.logo ?? tpl?.logo ?? tpl?.logoHorizontal ?? null, tScale);   // 틀의 로고 칸이 먼저(10-15) · let: 정렬 프리셋(10-19)이 틀 로고 칸을 거울에 비춘다
  // 틀 매체의 KV·배경은 이전 자유 배치(열·띠·블리드·cover+녹임)로, 글자·로고만 틀 — 자소설만 샘플 그림 칸 유지(사용자 결정 10-15 밤: 「KV·배경 추출은 이전 버전이 더 견고」). mold.kv 'slot' 으로 칸을 강제할 수 있다
  const moldFreeKv = !!mold && mold.kv !== 'slot' && !/^jasoseol-/.test(String(spec.id ?? ''));
  // 자유 배치의 그림 칸 = 틀 글자 상자(행마다 x·폭·y·줄 수 최대)를 피한, 오른쪽 아래에 붙는 가장 큰 빈 네모(오른쪽 열 · 아래 띠 · 모서리 상자 중 면적 최대).
  //   그 칸에는 템플릿 칸 문법 그대로(사진·바탕 일러스트 cover + 글자 쪽 녹임, 누끼 contain·우하단 블리드, 아래 띠는 윗변 녹임) — 글자와 겹치지 않는다
  const moldFreeRect = (() => {
    if (!moldFreeKv) return null;
    const k = tScale, MR0 = mold.rows ?? {}, gap = Math.round(Math.min(w, h) * 0.03);
    const boxes = [];
    for (const [role, r] of Object.entries(MR0)) {
      if (!r || r.y == null) continue;
      const lines = r.lines ?? (role === 'main' ? 2 : 1), pitch = r.chip ? (r.chip.h ?? r.pitch ?? r.px * 1.2) : (r.pitch ?? r.px * 1.2);
      const y0 = r.afterMain != null && MR0.main ? MR0.main.y + ((MR0.main.lines ?? 2) - 1) * (MR0.main.pitch ?? MR0.main.px * 1.2) + r.afterMain : r.y;
      const extra = r.labelRow ? 1 : 0;
      boxes.push({ x: Math.round((r.x ?? mold.x ?? 0) * k), r: Math.round(((r.x ?? mold.x ?? 0) + (r.w ?? mold.w ?? (w / k - (mold.x ?? 0)))) * k), t: Math.round(y0 * k), b: Math.round((y0 + pitch * (lines + extra)) * k) });
    }
    if (!boxes.length) return null;
    const xs = [0, ...boxes.map(b => b.r + gap)], ys = [0, ...boxes.map(b => b.b + gap)];
    let best = null;
    for (const x0 of xs) for (const y0 of ys) {
      if (w - x0 < w * 0.2 || h - y0 < h * 0.2) continue;
      if (boxes.some(b => b.r > x0 && b.b > y0)) continue;   // 글자 상자와 겹침
      const area = (w - x0) * (h - y0); if (!best || area > best.area) best = { x: x0, y: y0, w: w - x0, h: h - y0, area };
    }
    return best ? { x: best.x, y: best.y, w: best.w, h: best.h } : null;
  })();
  let tImage = moldFreeKv ? moldFreeRect : rect(mold?.image ?? tpl?.image ?? tpl?.imageMain ?? null, tScale);
  // 정렬 프리셋(10-19) — 틀 규격: 글자 칸은 그대로, 그림 칸·로고 칸만 거울(오른쪽: w−x−폭 · 가운데: 가로 가운데). 틀 좌표 데이터는 손대지 않고 렌더 값만(core/alignrule.js alignMoldSlots)
  const AM = (TA && mold) ? alignMoldSlots({ mold, w, h, k: tScale, tImage, tLogo, align: TA, free: moldFreeKv }) : null;
  if (AM) { tImage = AM.tImage; tLogo = AM.tLogo; }
  const tText = mold?.x != null ? { x: Math.round(mold.x * tScale), w: Math.round((mold.w ?? (w - mold.x)) * tScale) } : tpl?.textColumn ? { x: Math.round(tpl.textColumn.x * tScale), w: Math.round(tpl.textColumn.w * tScale) } : null;
  const allowLogo = !(rules.logo && rules.logo.count === 0);   // M스탠다드·PC달력배너: 로고 삽입 불가
  // 투명 배경 필수 규격(알바몬 스플래시)에 바탕을 품은 그림을 넣으면 네모가 뜬다 — 누끼만 그린다. 바탕 있는 그림은 이 규격에선 생략(로고·글자만)
  const kvKind = style.kvMeta?.field?.kind ?? null;
  const hasKv = !!style.keyVisual && !spec.flat
    && !(transparent && (style.kvMeta?.field?.opaque ?? 1) >= 0.5 && !rules.objectBox?.thumbnail)   // 매체가 썸네일 상자를 정한 규격(카카오 썸네일형)은 상자 안에 사진이 들어간다
    && !(rules.objectBox && kvKind === 'texture');                                        // 상자에 그라데이션 조각은 무의미 — 글자만
  // 질감 그림(블러 그라데이션, kind texture): 주인공도 바탕도 없다 — 지면 전체에 깔고 글자만 올린다. 자르면 뜻 없는 색 조각이 된다(10-06 사용자 "이런 그라데이션이라면?").
  // 템플릿 이미지 칸(자소설)도 무시하고 통째로 깐다 — 글자 칸은 템플릿대로. 투명 규격은 hasKv에서 이미 빠진다
  // 장식 프레임 누끼(kvtypes flags.frame — 가운데 빈 유리 슬랩): 질감처럼 지면 전체에 깐다. 단 그림이 아니라 어두운 브랜드 지면이 바탕이고, 오른쪽(세로형은 아래)을 크게 잘라 보인다(10-09 figma-dg)
  // 편집 프리셋 「키비주얼 위치」(10-14): 사람이 고른 자리가 자동 배치 대신 — 매체 템플릿 칸·오브젝트 상자·투명 지면·로고 전용·얇은 띠는 고를 수 없다(매체 규정이 이긴다, 이유를 trace 에)
  // 정렬 프리셋(10-19)이 데려가는 자리: 왼쪽→오른쪽 열 · 오른쪽→왼쪽 열(거울) · 가운데→아래 띠 — 사람이 위치 프리셋을 따로 골랐으면 그게 먼저. 질감·프레임(지면 전체 그림)·사진 전체(kvUse full)는 자리를 안 바꾼다
  const wantPlace = ED?.kvPlace ?? ((TA && !mold && kvKind !== 'texture' && !kvTypeOf(style.kvMeta)?.flags.frame && style.kvUse !== 'full') ? ALIGN_KV_PLACE[TA] : null);
  const EP = wantPlace ? (() => { const av = placeAvail(spec, wantPlace, { gate: { logoOnly, hasKv, template: !!tImage, transparent }, objectBox: !!rules.objectBox, cutout: (style.kvMeta?.field?.opaque ?? 1) < 0.5 && !kvTypeOf(style.kvMeta)?.flags.frame }); return { want: wantPlace, by: ED?.kvPlace ? 'kvPlace' : 'textAlign', ok: !!(av.ok && useRef), why: av.why ?? (useRef ? null : '얇은 띠') }; })() : null;
  const forcedSide = (EP?.ok && EP.want !== 'bg') ? EP.want : null;   // right · bottom · left
  const mirrorX = forcedSide === 'left' || (TA === 'right' && !mold && useRef && !tImage && !rules.objectBox);   // 왼쪽 = 오른쪽 열을 좌우로 뒤집어 그린다(그림 자체는 뒤집지 않는다) · 오른쪽 정렬(10-19)은 열이 안 서는 규격도 글자 열·로고를 거울
  if (forcedSide) style = { ...style, kvUse: 'part' };
  else if (EP?.ok && EP.want === 'bg') { const t0 = kvTypeOf(style.kvMeta); const keep = kvKind === 'texture' || !!t0?.flags.frame || !!(t0?.flags.room && kvFull(style, w, h)); if (!keep) style = { ...style, kvUse: 'full' }; }
  const frameFull = hasKv && !mold && !!kvTypeOf(style.kvMeta)?.flags.frame && !logoOnly && !transparent && style.kvUse !== 'part';   // 틀 규격은 그림 칸에 담는다(10-15)
  const textureFull = hasKv && !mold && (kvKind === 'texture' || frameFull) && !logoOnly && style.kvUse !== 'part';
  if (textureFull) { tImage = null; vCenter = true; }
  const hasLogo = !!(style.logo || style.logoLight);
  // 사진 전체형(보드 예시 9/136: 코엑스·원광대병원·호반) — 담당자가 고른 때만. 사진이 지면 전체를 채우고 글자 쪽에서 시작하는 브랜드색 스크림 위에 흰 글자
  // 현장·군중 사진(kvtypes flags.crowd — 어둡고 주인공 없음)은 자동으로 사진 전체형(10-09 figma-dg 디자이너 10/10). '한쪽에 넣기'(part)를 고르면 예전대로
  const crowdKv = !!kvTypeOf(style.kvMeta)?.flags.crowd && style.kvUse !== 'part';
  const photoFull = hasKv && (style.kvUse === 'full' || crowdKv) && !transparent && !tImage && !textureFull;
  // 배경형 그림(core/field.js kvFull): 주인공이 한쪽을 감싸고 다른 쪽이 비어 있으면(삼성 3D 호) 그림이 곧 지면이다 — 통째로 깔고 빈 자리(room)에 글자.
  // 자리에 잘라 붙이고 녹이면 뿌연 번짐이 AI 티로 보인다(10-06 사용자). 템플릿 칸(자소설)·매체 상자(카카오)·투명 지면·사진 전체형·'한쪽에 넣기'를 고른 경우는 제외
  const roomFull = (hasKv && !logoOnly && !photoFull && !textureFull && !transparent && !tImage && !rules.objectBox && style.kvUse !== 'part') ? kvFull(style, w, h) : null;
  if (roomFull && logoPlace === 'top-right' && (roomFull.cornersBg?.tr ?? 1) < 0.8) logoPlace = 'top-left';   // 우상단이 주인공이면 로고는 글자 자리 쪽
  // 사진이 오른쪽 열을 채우는 가로형: 우상단 로고는 사진 위에 얹히고, 로고 색(반전 흰색)은 지면 기준이라 밝은 사진(흰 벽·하늘) 위에서 사라진다(10-09 데스크탑: 사진 10건 × 가로 규격 7~20 「로고 가림」).
  // 로고는 글자 쪽 지면(좌상단)으로 — 배경형 우상단 주인공과 같은 원칙. 사진 전체형(군중)은 스크림 쪽이 이미 지면이라 그대로
  const photoCol = hasKv && kvKind === 'photo' && !photoFull && !roomFull && !textureFull && !tImage && !rules.objectBox && (L.shape === 'wide' || L.object === 'right');
  if (photoCol && logoPlace === 'top-right') logoPlace = 'top-left';
  // 가이드 매체의 정사각형 지면(구글 580×400): 템플릿 '이미지 영역'은 오른쪽 열이 아니라 우하단 모서리 상자(297×239, y163~) —
  // 서브·메인은 그 위를 전폭으로 쓰고 상세만 상자 왼쪽 열에 선다(일화·비씨월드·동부). 오른쪽 열로 두면 글자 칸이 반으로 줄어 메인이 세 줄로 접힌다
  // 가로로 긴 누끼(ABL 캐릭터 AR 2.9)는 모서리 상자에 가두면 작아진다 — 하단 띠(전폭)로
  const kvWideBand = !forcedSide && !!(guide?.objectRatio?.squareBand && L.shape === 'square' && hasKv && !photoFull && !roomFull && !tImage && (style.kvMeta?.ar ?? 1) >= 1.8);
  // 질감·장식 프레임(textureFull)은 지면 전체가 그림이다 — 모서리 상자에 같은 그림을 또 넣지 않는다(10-09 데스크탑: GDN 580×400에서 질감이 바탕 + 우하단 상자로 두 번 그려져 상자가 「주인공」으로 잡혔다. 예전 질감 4건도 같았다)
  const gCorner = !forcedSide && !!(guide?.objectRatio?.square && L.shape === 'square' && hasKv && !photoFull && !roomFull && !textureFull && !tImage && !kvWideBand);
  // 단일 사물 누끼(kvtypes flags.single — 캐릭터·떼 아님): 크게, 우하단으로 블리드(CANON objectBleed — 70% 이상 보임, 오른쪽·아래로만 30%까지 잘림, 목표 면적).
  // 형태 문법·가이드가 정한 그림 자리(오른쪽 열·모서리 상자·아래 띠)의 왼쪽·위 경계는 지키고, 그 안에서 맞춰 넣기 대신 키워서 오른쪽·아래 변 밖으로 흘린다. 템플릿 칸(자소설)은 템플릿대로
  const moldSlotEdge = !!(mold && tImage && tImage.x + tImage.w >= w - 2 && tImage.y + tImage.h >= h - 2 && tImage.y > 0 && !(tImage.w >= w - 1));   // 틀 그림 칸이 오른쪽·아래 모서리에 닿는 상자(NAP 300×250·블라인드 피드·네이버 DA) — 여백 있는 칸(자소설 팝업 8/30·구글 ABL)은 아님
  // mold.image.bleed === false(인스타 1080, 10-19): 칸이 모서리에 닿아도 블리드 없이 contain 우하단 맞춤 — 사용자 수정본 「누끼 contain 바닥 맞춤」 그대로, 칸만 오른쪽 가장자리까지(우측 여백 0)
  const singleObj = !mirrorX && (!mold || (moldSlotEdge && mold.image?.bleed !== false)) && !!(hasKv && !logoOnly && guide?.objectBleed && (style.kvMeta?.field?.opaque ?? 1) < 0.5 && kvTypeOf(style.kvMeta)?.flags.single);   // 틀 그림 칸: 여백 있는 칸 안에서는 블리드 없음(10-15 세아제강 팝업: 오른쪽 8·아래 30 여백 안에 통째로) · 모서리에 닿는 칸은 이전 가이드대로 우하단 블리드(10-15 밤 「KV·배경은 이전 버전이 더 견고」)
  { const t = kvTypeOf(style.kvMeta); TR.kv = t ? { type: t.id, sub: t.sub?.id ?? null, subs: t.subs.map(s => s.id), flags: Object.keys(t.flags).filter(k => t.flags[k] === true), override: t.override, ar: t.ar, subjectArea: t.subjectArea } : null;
    TR.gate = { hasKv, textureFull, frameFull, photoFull, crowdKv, roomFull: !!roomFull, photoCol, gCorner, kvWideBand, singleObj, logoOnly, transparent, template: !!tImage, kvUse: style.kvUse ?? 'auto' };
    if (singleObj) fired('objectBleed'); if (frameFull) fired('frameFull'); else if (textureFull) fired('textureFull'); if (photoFull) fired(crowdKv ? 'photoCrowdFull' : 'photoFull'); if (roomFull) fired('roomFull'); if (photoCol && logoPlace === 'top-left') fired('photoColLogoLeft'); if (reqDate) fired('required.date'); if (glassKv && !templateLight) fired('glassDark'); if (mold) fired('templateMold'); }
  let bleedP = null;
  // 편집 「키비주얼 크기」: 블리드는 목표 면적을 배율²로(잘림 상한 maxCut 은 그대로)
  const bleedCfg = b => { const k = kvK; return k === 1 ? b : { ...b, targetArea: Object.fromEntries(Object.entries(b.targetArea ?? {}).map(([s0, v]) => [s0, [v[0] * k * k, v[1] * k * k]])) }; };
  const bleedAt = (x0, y0, sym = false) => objectBleedPlace(style, { w, h, x0, y0, shape: L.shape, bleed: bleedCfg(sym ? { ...guide.objectBleed, ...guide.objectBleed.narrow, ...(guide.objectBleed.tower && w <= guide.objectBleed.tower.maxW ? guide.objectBleed.tower : {}) } : guide.objectBleed), sym });
  if (gCorner) {
    const cw = Math.round(w * guide.objectRatio.square), ch = Math.round(h * (guide.objectRatio.squareH ?? 0.6));
    tImage = { x: w - cw, y: h - ch, w: cw, h: ch };
    if (singleObj && (bleedP = bleedAt(w - cw, h - ch))) tImage = { x: bleedP.left, y: bleedP.top, w: w - bleedP.left, h: h - bleedP.top };
  }
  // 틀 그림 칸(모서리에 닿는 상자)의 단일 누끼: 칸의 왼쪽·위 경계를 지키고 그 안에서 키워 우하단으로 흘린다 — 이전 가이드(objectBleed) 그대로(10-15 밤)
  if (moldSlotEdge && singleObj && !bleedP && (bleedP = bleedAt(tImage.x, tImage.y))) { tImage = { x: bleedP.left, y: bleedP.top, w: w - bleedP.left, h: h - bleedP.top }; fired('templateMold.slotBleed'); }
  // 가이드 없는 정사각형 지면에 누끼: 오른쪽 열 대신 우하단 모서리 상자(폭 58%·높이 55%) — 글자는 전폭으로 크게, 상세는 상자 옆 열에.
  // 보드 1-884 코엑스 에브리타임 홈 카드: 건물 누끼가 오른쪽 아래를 차지하고 '모집분야' 알약·값이 그 옆에 선다. 오른쪽 열로 두면 글자 칸이 반으로 줄어 메인이 작아진다
  const cutCorner = !forcedSide && !!(hasKv && !logoOnly && !photoFull && !roomFull && !textureFull && !tImage && !transparent && !rules.objectBox && !guide?.objectRatio && L.shape === 'square' && (style.kvMeta?.field?.opaque ?? 1) < 0.5);
  // 가로로 긴 누끼(캐릭터 떼·건물, 비율 > 1.3)는 모서리 상자(폭 58%)에 넣으면 키가 작아 위가 빈다(에브리타임 288 ABL 떼: 빈 띠 54~65%) — 폭 전체 아래 띠(폭 130%까지 넘쳐도 되는 높이, 30~55%)
  const cutAr = style.kvMeta?.ar ?? 1;
  // 띠 높이 = 폭을 넘쳐도 되는 최대 배율(자르기 선이 투명 60% 이상인 열에 떨어지는 1.3~2.2)까지 — 떼가 작게 한 줄로 서는 것보다 두세 명이 크게
  const cutWin = (cutCorner && cutAr > 1.3) ? cutWindow(style.kvMeta?.field?.cols, Math.min(2.4, (h * 0.55) * cutAr / w)) : null;   // 띠 55% 높이를 채우는 배율에 가장 가까운 틈 창
  const cutKmax = cutWin ? cutWin.k : (() => { const cols = style.kvMeta?.field?.cols; const at = t => cols?.[Math.min(cols.length - 1, Math.max(0, Math.round(t * (cols.length - 1))))]?.bg ?? 1; let k = 1; for (const kk of [1.3, 1.5, 1.8, 2.2]) { const f = (1 - 1 / kk) / 2; if (!cols?.length || (at(f) >= 0.75 && at(1 - f) >= 0.75)) k = kk; } return k; })();
  let cutBand = false;   // 정사각 규격의 가로 긴 누끼 띠 — 띠 높이에 맞추고 좌우를 지면 밖으로(틈 창 또는 허용 배율)
  // 정사각 단일 사물: 모서리 상자(58%×55%)·아래 띠 대신 왼쪽 30%·위 48% 경계 안에서 우하단 블리드(Figma 인스타 1080: KV 29·49–100·100, 보임 86%, 면적 25%)
  if (cutCorner && singleObj && (bleedP = bleedAt(Math.round(w * 0.3), Math.round(h * 0.48)))) tImage = { x: bleedP.left, y: bleedP.top, w: w - bleedP.left, h: h - bleedP.top };
  else if (cutCorner && cutAr > 1.3) { const bandH = Math.min(Math.round(h * 0.55), Math.max(Math.round(h * 0.3), Math.round(w * cutKmax / cutAr))); tImage = { x: 0, y: h - bandH, w, h: bandH }; cutBand = bandH * cutAr > w + 1; }
  // 캐릭터 하나(세로로 선 누끼)는 58%×55% 상자에선 키가 지면의 45% 남짓 — 위가 빈다(에브리타임 288 여우 빈 띠 37%, 캐치 700 30%). 키 72%까지, 폭 64%
  else if (cutCorner) { const solo = (() => { const t = kvTypeOf(style.kvMeta); return !!(t?.flags.character && !t.flags.group); })(); const bw = Math.round(w * (solo ? 0.64 : 0.58)), bh = Math.round(h * (solo ? 0.72 : 0.55)); tImage = { x: w - bw, y: h - bh, w: bw, h: bh }; }
  // 편집 「키비주얼 크기」: 모서리 상자(구글 580·누끼 정사각)·아래 띠 상자를 배율만큼(지면의 75%까지), 우하단에 붙인 채
  if (kvK !== 1 && tImage && (gCorner || cutCorner) && !bleedP) {
    const k = kvK;
    const nh = Math.max(Math.round(h * 0.15), Math.min(Math.round(h * 0.75), Math.round(tImage.h * k)));
    if (tImage.x <= 1) tImage = { x: 0, y: h - nh, w, h: nh };
    else { const nw = Math.max(Math.round(w * 0.15), Math.min(Math.round(w * 0.75), Math.round(tImage.w * k))); tImage = { x: w - nw, y: h - nh, w: nw, h: nh }; }
  }
  // 겹침 교정(kvK<1) — 틀의 사진·바탕 그림 칸: 칸 자체를 배율만큼 줄여 우하단(글자 반대쪽)에 붙인다. 누끼는 칸은 두고 그림만 줄인다(containSz)
  if (FIX?.kvK && FIX.kvK < 1 && mold && tImage && (style.kvMeta?.field?.opaque ?? 1) >= 0.5) { const nw = Math.max(8, Math.round(tImage.w * FIX.kvK)), nh = Math.max(8, Math.round(tImage.h * FIX.kvK)); tImage = { ...tImage, x: tImage.x + tImage.w - nw, y: tImage.y + tImage.h - nh, w: nw, h: nh }; }
  // 빈 지면 보정(kvK>1, emptyFix — 10-21): 틀 그림 칸은 지면 변에 닿은 변을 그대로 두고 글자 쪽으로 키운다. 오른쪽·왼쪽 열은 폭만, 아래 띠는 높이만(열·띠 판정이 바뀌지 않게), 모서리 칸은 둘 다 — 상한 CANON.emptyFix.slotCap(아래 띠는 fill.maxObject).
  //   둥근 칸(비즈보드 r10)·bleed:false 칸(인스타 1080)·자유 자리(moldFreeKv)는 안 키운다. 글자 칸과의 충돌은 emptyFix 가 overlapRatio 로 거른다
  if (FIX?.kvK > 1 && mold && tImage && tImage.radius == null && mold.image?.bleed !== false && !moldFreeKv) {
    const k = FIX.kvK, cap = CANON.emptyFix?.slotCap ?? 0.8;
    const fullW = tImage.w >= w - 1, fullH = tImage.h >= h - 1;
    const capH = fullW ? Math.round(h * (guide?.fill?.maxObject ?? 0.55)) : Math.round(h * cap), capW = Math.round(w * cap);
    const nw = fullW ? tImage.w : fullH ? Math.min(capW, Math.round(tImage.w * k)) : Math.min(capW, Math.round(tImage.w * k));
    const nh = fullH ? tImage.h : Math.min(capH, Math.round(tImage.h * k));
    // 글자 반대쪽 변(칸 중심이 지면 중심보다 오른쪽이면 오른쪽 변, 아래면 아랫변)은 원래 좌표 그대로 두고 글자 쪽으로만 — 지면에 닿았든(구글 580 아랫변 407, 밖 7px 블리드) 여백이 있든(자소설 PC 팝업 오른쪽 8px 템플릿 여백 · 네이버 DA 바닥 20px) 그 변은 안 움직인다
    //   가운데 정렬 프리셋으로 칸이 지면 가운데에 온 경우(NAP 300×250 「가운데」)는 양쪽으로 고르게
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const cx = tImage.x + tImage.w / 2, cy = tImage.y + tImage.h / 2, midX = Math.abs(cx - w / 2) <= w * 0.02, midY = Math.abs(cy - h / 2) <= h * 0.02;
    const nx = fullW ? tImage.x : midX ? clamp(Math.round(tImage.x - (nw - tImage.w) / 2), 0, Math.max(0, w - nw)) : Math.max(0, cx > w / 2 ? tImage.x + tImage.w - nw : tImage.x);
    const ny = fullH ? tImage.y : midY ? clamp(Math.round(tImage.y - (nh - tImage.h) / 2), 0, Math.max(0, h - nh)) : Math.max(0, cy > h / 2 ? tImage.y + tImage.h - nh : tImage.y);
    if (nw !== tImage.w || nh !== tImage.h) { tImage = { ...tImage, x: nx, y: ny, w: nw, h: nh }; fired('emptyFix.slot'); }
  }
  const kvKindPhoto = style.kvMeta?.field?.kind === 'photo';
  // 그림이 없고 로고만 있으면 로고가 오브젝트 자리를 차지한다(보드 예시 14/136: 셀트리온·LX·CMTX·제일약품·SPC…) — 작은 상단 로고는 그때 생략
  // 매체가 로고 칸을 따로 정해 둔 템플릿(자소설)에서는 로고를 그 칸에 두고 이미지 칸은 비운다 — 로고가 두 번 나오면 안 된다
  const logoAsObject = !hasKv && !logoOnly && allowLogo && hasLogo && !tLogo && (!!tImage || (useRef && L.object !== 'none') || (!useRef && !strip));

  /* ── 안전영역 → 패딩 ── */
  const basePad = strip ? Math.min(16, Math.round(h * 0.15)) : (S >= 280 ? 24 : 16);
  const pad = safePad(rules, basePad);
  if (useRef) {
    const floor = k => pad.stated ? pad[k] : 0;
    const gPadX = guide?.padX?.[L.shape] ?? L.padX;   // 구글 예시 왼쪽 여백: 580 44 · 970 45 · 300×600 32 · 300×1050 36
    pad.left = Math.max(floor('left'), gPadX); pad.right = Math.max(floor('right'), gPadX);
    // 레이아웃의 top(세로형 17.8%·세로 띠 13.2%)은 로고 줄을 위해 비운 값 — 로고가 없거나 매체가 로고를 금하면(자소설 달력배너 164×233) 옆 여백만큼만
    pad.top = Math.max(floor('top'), (vCenter || !(allowLogo && hasLogo) && !tLogo) ? L.padY : L.top);
    pad.bottom = Math.max(floor('bottom'), guide?.padBottom?.[L.shape] ?? L.padBottom ?? L.padY);
  }
  if (!pad.stated && tText) { pad.left = tText.x; pad.right = Math.max(0, w - tText.x - tText.w); }
  if (band) pad.bottom = Math.max(pad.bottom, band + Math.round(h * 0.03));   // 하단 띠 위로 글자가 올라간다
  // 템플릿 이미지 영역: 하단 띠(전폭)면 글자는 그 위에서 끝나고, 우하단 상자면 그 윗선까지
  const imgBottomBand = tImage && tImage.y + tImage.h >= h - 1 && tImage.w >= w - 1;
  const imgCorner = tImage && !imgBottomBand && tImage.y > 0;
  const imgLeftCol = tImage && !imgBottomBand && tImage.x <= 1 && tImage.h >= h - 1;   // 자소설 PC메인: 왼쪽 이미지 열
  const imgRightCol = tImage && !imgBottomBand && !imgLeftCol && tImage.x > 1 && tImage.x + tImage.w >= w - 1 && tImage.h >= h - 1;   // 리멤버 썸네일형·잡다·캐치 이미지형·에브리타임 커뮤니티보드: 오른쪽 이미지 열(10-15 틀 확장) — 글자 쪽(왼쪽 변)으로 녹인다
  // 하단 이미지 칸에 그림을 놓는 법 — 레퍼런스 5장(한미글로벌·세아제강·도레이·한독·PT코리아)에서:
  //   칸보다 작은 그림(세아제강 373×274·PT코리아 154×154)은 키우지 않고 제 크기로 바닥 가운데에
  //   칸보다 납작한 그림은 폭에 맞춰 바닥에 통째로(자르지 않는다)
  //   칸보다 길쭉한 그림(한미글로벌 600×735·도레이 160×324)은 칸을 채우고 위가 잘린다 — 주인공은 아래쪽에 있다
  // 그림 위가 비면 글자가 거기까지 내려간다(PT코리아 글자 y390 > 칸 y370).
  const kvAR = hasKv ? style.kvMeta?.ar : null, kvPx = hasKv ? style.kvMeta?.px : null;
  // 우하단 모서리 상자(자소설 팝업·M메인, 구글 580)에서 그림이 실제로 차지하는 네모 — 우하단 맞춤, 자르지 않음. 상세 칸 폭과 녹임 마스크가 상자가 아니라 이 네모를 기준으로 한다
  const isCutout = (style.kvMeta?.field?.opaque ?? 1) < 0.5;
  // 매체가 오브젝트 상자를 정한 규격(카카오 비즈보드: 썸네일 313×185 둥근 상자 / 누끼 315×222) — 배경 있는 그림이 상하 여백 없이 영역을 채우면 심사보류
  // 폭 범위·영역으로 적힌 상자(에브리타임 커뮤니티보드: 너비 220~320px, 오른쪽 기준 40~360px 영역 가운데) — 누끼를 영역 안 높이(안전영역 안)에 맞춰 넣되 폭이 범위를 지키게 상자를 잡는다
  const zoneBox = ob => {
    if (!isCutout || !ob?.zone || !kvAR) return null;
    const [z0, z1] = ob.zone, zw = z1 - z0;
    const top = pad.top, hh = Math.max(20, h - pad.top - pad.bottom);
    const bw = Math.max(ob.wMin ?? 0, Math.min(ob.wMax ?? zw, zw, Math.round(hh * kvAR)));
    const x = ob.side === 'left' ? z0 + Math.round((zw - bw) / 2) : w - z1 + Math.round((zw - bw) / 2);
    return { x, y: top, w: bw, h: hh, gap: ob.gap ?? 19, zone: true };
  };
  const oBox = (!tImage && hasKv && !photoFull && rules.objectBox) ? (rules.objectBox.zone ? zoneBox(rules.objectBox) : ((isCutout ? rules.objectBox.cutout : rules.objectBox.thumbnail) ?? null)) : null;
  // 10-12 desk-15: 바탕 있는 세로 그림을 모서리 상자(구글 580 297×239)에 통째로 맞춰 넣으면 상자의 60%도 못 채워 신호등이 가는 띠가 된다(지면의 15%) —
  //   그때는 상자를 덮고(cover, 주인공 위치) 글자 쪽 두 변을 녹인다(사진과 같은 문법). 누끼는 그대로 맞춰 넣는다
  const cornerFill = !!(tImage && imgCorner && hasKv && !bleedP && !isCutout && !transparent && kvAR && (() => { const fw = kvAR >= tImage.w / tImage.h; const dw = fw ? tImage.w : tImage.h * kvAR, dh = fw ? tImage.w / kvAR : tImage.h; return dw * dh / (tImage.w * tImage.h) < 0.6; })());
  const cornerRect = (tImage && imgCorner && hasKv && (bleedP || cornerFill)) ? { ...tImage } : (tImage && imgCorner && hasKv) ? (() => {
    const ar = kvAR || (tImage.w / tImage.h); const fillW = ar >= tImage.w / tImage.h;
    const dw = fillW ? tImage.w : Math.round(tImage.h * ar), dh = fillW ? Math.round(tImage.w / ar) : tImage.h;
    // 거울 칸(정렬 프리셋 10-19 AM.kv): 오른쪽 아래 맞춤도 거울 — 왼쪽 아래(mirror)·아래 가운데(center)
    const x = AM?.kv === 'mirror' ? tImage.x : AM?.kv === 'center' ? tImage.x + Math.round((tImage.w - dw) / 2) : tImage.x + tImage.w - dw;
    return { x, y: tImage.y + tImage.h - dh, w: dw, h: dh };
  })() : null;
  // 단, 그림이 칸 높이의 60%도 못 채우면(가로형 샘플 600×400 → 160×600 띠에 폭 맞춤 = 107px 조각) 레퍼런스처럼 보이지 않는다 — 비어 보인다.
  // 그때는 잘라서 칸을 채우고 윗변을 녹인다(누끼는 cover 가지에서도 contain으로 그린다)
  let bandMode = 'cover';
  // 주인공이 그림의 일부(바탕 넓은 3D·일러스트)면 칸을 주인공으로 채운다 — 제 크기·폭 맞춤으로 통째로 놓으면 바탕만 보인다(core/field.js subjectCrop)
  const bandCrop = (tImage && imgBottomBand && hasKv && !isCutout && !transparent) ? subjectCrop(style, tImage.w, tImage.h) : null;
  const cornerCrop = (cornerRect && !isCutout && !transparent) ? subjectCrop(style, tImage.w, tImage.h) : null;
  if (tImage && imgBottomBand && kvAR && !bandCrop && !cutBand) {
    const minH = tImage.h * 0.6;
    if (kvPx && kvPx[0] <= tImage.w && kvPx[1] <= tImage.h && kvPx[1] >= minH) bandMode = 'native';
    else if (kvAR >= tImage.w / tImage.h && tImage.w / kvAR >= minH) bandMode = 'contain';
  }
  const bandObjH = !tImage ? 0 : bandMode === 'native' ? kvPx[1] : bandMode === 'contain' ? Math.round(tImage.w / kvAR) : tImage.h;
  const bandObjTop = tImage ? tImage.y + tImage.h - bandObjH : 0;
  if (tImage && imgBottomBand) pad.bottom = Math.max(pad.bottom, h - bandObjTop + Math.round(h * 0.02));
  if (imgLeftCol && !tText) pad.left = Math.max(pad.left, tImage.x + tImage.w + 16);
  // 템플릿 로고 칸이 상단에 있으면 글자는 그 아래에서 시작 (자소설: 로고 23~53 → 서브 82)
  if (allowLogo && tLogo && hasLogo && tLogo.y < h * 0.3) pad.top = Math.max(pad.top, tLogo.y + tLogo.h + Math.round(h * 0.045));
  const sa = rules.safeArea ?? {};
  const saN = k => (typeof sa[k] === 'number' ? sa[k] : 0);
  // 가이드가 로고 크기를 정하면(구글: 높이 ≈ 짧은 변의 7.5%, 폭 ≤ 20% — '로고 크기는 꼭 잘 보이게') 그 값이 레퍼런스 값보다 우선
  const gLogoH = guide?.logo?.hRatio ? Math.round(Math.min(w, h) * guide.logo.hRatio) : null;
  // 세로로 긴 로고(폭 ÷ 높이 < 0.8 — 세로 워드마크·세로 엠블럼)는 높이 칸에 맞추면 폭이 몇 px로 쪼그라든다(10-09 데스크탑: 실리콘투 0.21 → 30px 칸에 폭 6px).
  // 눈에 보이는 면적을 맞추는 쪽으로 높이를 √(0.8 ÷ 비율)배, 최대 1.8배까지 키운다(코스맥스 0.6 → 1.15배)
  const logoAr = style.logoMeta?.px ? style.logoMeta.px[0] / Math.max(1, style.logoMeta.px[1]) : null;
  const logoTallK = (logoAr && logoAr < 0.8) ? Math.min(1.8, Math.sqrt(0.8 / logoAr)) : 1;
  const logoBox = (useRef && logoPlace !== 'none' && allowLogo && hasLogo && !tLogo && !logoAsObject) ? (() => {
    const top = Math.max(L.logoTop || (gLogoH ? Math.round(h * 0.06) : 0), saN('top'));
    const left = logoPlace === 'top-center' ? saN('left') : logoPlace === 'top-left' ? Math.max(pad.left, saN('left')) : null;
    const right = logoPlace === 'top-center' ? saN('right') : logoPlace === 'top-left' ? null : Math.max(Math.round(L.padX * 0.8), saN('right'));
    const maxW = logoPlace === 'top-center' ? Math.round((w - saN('left') - saN('right')) * 0.62) : Math.round(w * (guide?.logo?.maxWRatio ?? 0.4));
    return { top, left, right, h: Math.round((gLogoH ?? L.logoH) * logoTallK), maxW };
  })() : null;
  // 배경형에서 로고가 주인공 쪽 모서리(우상단)에 있고 글자 자리가 왼쪽 절반쯤이면 글자는 로고를 기다리지 않는다 — 자리 높이의 30%를 로고에 내주면 글자가 구겨진다
  const logoAside = !!(roomFull && logoPlace === 'top-right' && roomFull.room.w <= w * 0.6);
  // 가로형 우상단 로고(CANON wideLogo)는 오른쪽 그림 열 위에 선다 — 왼쪽 글자 열은 로고 줄을 기다리지 않는다. 오른쪽 그림이 없으면(글자가 전폭) 예전처럼 로고 아래에서
  const wideRightObj = useRef && L.shape === 'wide' && (hasKv || logoAsObject) && !photoFull && !roomFull && !textureFull && !tImage;
  const logoBeside = !!(logoBox && L.shape === 'wide' && logoPlace === 'top-right' && !guide?.logo && wideRightObj);
  if (logoBox && !logoAside && !logoBeside) pad.top = Math.max(pad.top, logoBox.top + logoBox.h + Math.round(logoBox.h * (guide?.logoGap ?? 0.6)));   // 구글 예시: 로고 바닥과 아이브로 사이 로고 높이의 0.25
  if (logoAside) pad.top = Math.max(saN('top'), Math.min(pad.top, guide?.padX?.[L.shape] ?? L.padX ?? 24));   // 로고 줄을 기다리지 않으니 위 여백은 좌우 여백만큼
  // 배경형: 글자 영역 = 그림의 빈 자리(room). 자리 바깥(주인공 쪽)은 패딩으로 비워 둔다 — 글자가 주인공 위로 흐르지 않게
  if (roomFull) {
    const r = roomFull.room;
    pad.left = Math.max(pad.left, r.x + (r.x > 0 ? Math.round(w * 0.02) : 0));
    pad.right = Math.max(pad.right, w - (r.x + r.w) + Math.round(w * 0.03));
    pad.bottom = Math.max(pad.bottom, h - (r.y + r.h) + Math.round(h * 0.03));
  }
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  /* ── 정렬·오브젝트 자리 (템플릿 > 같은 형태의 관찰 > 매체 전체 > 지면 비율) ── */
  const align = TA ?? ((strip || useRef) ? 'left' : (prof('textAlign') ?? (tall ? 'center' : 'left')));   // 정렬 프리셋(10-19)이 먼저
  let objectSide = 'none';
  if ((hasKv || logoAsObject) && !logoOnly && !photoFull && !roomFull && !textureFull) {
    if (tImage) objectSide = 'template';
    else if (forcedSide) objectSide = forcedSide === 'left' ? 'right' : forcedSide;
    else if (kvWideBand) objectSide = 'bottom';
    else if (useRef) objectSide = L.object;
    else {
      objectSide = prof('objectSide') ?? (tall ? 'bottom' : 'right');
      if (objectSide === 'full-bleed' || objectSide === 'center') objectSide = tall ? 'bottom' : 'right';
      if (strip && objectSide === 'bottom') objectSide = 'right';
      if (objectSide === 'right' && !strip && innerW < 400 && h / w > 0.8) objectSide = 'bottom';
      if (objectSide === 'left') objectSide = 'right';
    }
  }

  /* ── 지면 ── 키비주얼에서 읽는다. 이미지가 글자 쪽으로 맞닿는 변(facing)의 색이 지면이 된다. */
  const facing = mirrorX ? 'right' : objectSide === 'bottom' ? 'top'
    : objectSide === 'template' ? (imgBottomBand ? 'top' : (imgLeftCol || AM?.kv === 'mirror') ? 'right' : 'left')   // 거울 칸(10-19)은 글자가 오른쪽에서 맞닿는다
    : 'left';
  // 우하단에 맞춰 넣는 이미지(자소설 팝업)는 지면 전체 높이에 걸치지 않는다 — 세로 그라데이션을 맞출 수 없으니 단색
  // 사진 전체형: 스크림 색은 브랜드색 — 흰 글자가 안 읽히는 밝은 브랜드색이면 어둡게 섞는다
  // 편집 「배경」: 브랜드색 · 키비주얼 배경 이어 칠하기(글자 쪽 변의 색) — 직접 고른 색과 같은 길(background.color)로. 그라데이션 방향은 단색/그라데이션 고정으로 바꿔 넣고 각도는 아래에서
  const aiField = style.background?.ai?.stops?.length ? style.background.ai : null;   // 10-22 AI 지면 — 프리셋 bgFill/bgGrad 보다 앞
  if (aiField) { /* 지면은 field.js 가 background.ai 를 먼저 본다 */ }
  else if (ED?.bgFill === 'brand' && p.primary) style = { ...style, background: { ...(style.background ?? {}), color: String(p.primary).toUpperCase() } };
  else if (ED?.bgFill === 'kv' && style.keyVisual) { const hx = style.kvMeta?.field?.edges?.[facing]?.hex ?? style.kvMeta?.colors?.[0] ?? null; if (hx) style = { ...style, background: { ...(style.background ?? {}), color: String(hx).toUpperCase() } }; }
  if (ED?.bgGrad && !aiField) style = { ...style, background: { ...(style.background ?? {}), mode: ED.bgGrad === 'none' ? 'solid' : 'gradient' } };
  const scrimBase = (() => { const b = style.background?.color ?? p.primary ?? '#2456D6'; return contrast(b, WHITE) >= 3 ? b : mix(b, BLACK, 0.55); })();
  // 로고 전용 규격(프로필·브랜드 로고 96~300px): 흰 바탕 + 원색 로고 — 「매체별 규격정리」 샘플 5/5(대원제약·코엑스·제일약품·LX인터내셔널·PTKOREA)와 10-14 t1014 제일약품 네이버 프로필 3/3(시안 1·2·최종).
  //   브랜드 지면 + 흰 단색 로고는 엠블럼 속 글자(JEIL)를 지워 흰 덩어리로 만들었다. 흰 로고만 있거나(톤 light) 배경색을 직접 골랐으면 예전대로
  const logoWhite = logoOnly && !transparent && !!style.logo && style.logoTone !== 'light' && !style.background?.color && (style.logoMeta?.solid ?? 0) < 0.85;
  let field = transparent ? null
    : logoWhite ? { stops: ['#FFFFFF'], angle: 0, css: '#FFFFFF', text: BLACK, source: 'logo-only-white', seamless: false, gradient: false, contrast: 21 }
    : photoFull ? { stops: [scrimBase], angle: 0, css: scrimBase, text: WHITE, source: 'photo-full', seamless: false, gradient: false, contrast: Math.round(contrast(scrimBase, WHITE) * 100) / 100 }
    // 질감: 지면 = 그림 전체. 글자색은 글자가 앉는 왼쪽 위 사분면 색으로 — 색 있는 지면은 흰색이 먼저(큰 글자 3:1, resolveField와 같은 관례 · 10-09 마이다스 파란 유리 면에 검정 글자), 못 넘으면 검정(4.5:1), 둘 다 아니면 흰색(3:1 미만이면 스크림을 깐다 — textureScrim)
    : frameFull ? (() => { const st = brandDeep(p.primary ?? '#2456D6'); return { stops: st, angle: 135, css: `linear-gradient(135deg,${st[0]} 0%,${st[1]} 100%)`, text: WHITE, source: 'kv-frame', seamless: true, gradient: true, contrast: Math.round(Math.min(...st.map(c => contrast(c, WHITE))) * 100) / 100 }; })()
    : textureFull ? (() => { const hx = style.kvMeta?.field?.quadrants?.tl ?? style.kvMeta?.colors?.[0] ?? '#808080'; const tx = contrast(hx, WHITE) >= 3 ? WHITE : contrast(hx, BLACK) >= 4.5 ? BLACK : WHITE; return { stops: [hx], angle: 0, css: hx, text: tx, source: 'kv-texture', seamless: true, gradient: false, contrast: Math.round(contrast(hx, tx) * 100) / 100 }; })()
    // 배경형: 지면색 = 글자 자리의 바탕색(그림 그대로), 글자는 그 밝기로 — 밝으면 검정(브랜드색이 4.5:1이면 brandMain이 이어받는다), 어두우면 흰색
    : roomFull ? (() => { const hx = roomFull.hex ?? '#FFFFFF', tx = (roomFull.lum ?? 1) >= 0.6 ? BLACK : WHITE; return { stops: [hx], angle: 0, css: hx, text: tx, source: 'kv-full', seamless: true, gradient: false, contrast: Math.round(contrast(hx, tx) * 100) / 100 }; })()
    : resolveField(style, { facing, solidOnly, light: lightProfile, lightPhoto: !!guide?.lightField });   // 10-20: 모서리 칸이라고 그라데이션을 단색으로 접지 않는다(캠페인 공통 지면) — 그림 자리에 px 로 맞춰 건다(fieldAlign)
  // 틀 지면(10-15, 채용공고 샘플 6개 전수 실측): 배경색은 자유(브랜드색 — 도레이·모비스·한독 어두운 바탕). 밝으면 샘플 글자색, 어두우면 흰 글자·흰 로고 — 흰/검 전환은 CANON 그대로(moldFg·logoSrc0)
  // 템플릿 하단 띠를 주인공으로 당겨 채웠으면 띠의 윗변은 그림 한가운데 — 그 줄의 바탕색으로 지면을 잇는다
  if (field && bandCrop) { const j = joinField(field, joinColour(style, bandCrop.top), 'bottom'); if (j !== field) field = { ...j, deviation: 'join-colour' }; }   // 이음매 줄 색으로 잇는 지면은 그 규격만의 것 — 캠페인 공통 지면에서 벗어남을 기록(10-20)
  if (field && objectNeed && style.visual === 'object') field = { ...field, deviation: field.deviation ?? 'object-slot' };   // 오브젝트 누끼 자리(투명·상자 규격)는 다른 그림이라 지면도 다를 수 있다
  // 스크림은 글자 쪽에서 시작해 글자 칸 폭의 60~70%에서 사라진다(보드 사진 전체형 9장) — 세로형은 위에서 아래로, 가로형은 왼쪽에서 오른쪽으로
  const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  const kvFocus = style.kvMeta?.field?.focus;
  const kvPos = kvFocus ? `${Math.round(kvFocus.x * 100)}% ${Math.round(kvFocus.y * 100)}%` : 'center';
  const scrimDir = (L.shape === 'tall' || L.shape === 'tower') ? 'to bottom' : 'to right';
  const scrimEnd = scrimDir === 'to bottom' ? 78 : 70;
  // 모서리 상자의 그림이 지면과 같은 색으로 이어지지 않으면(하늘 그라데이션 vs 단색 지면) 글자 쪽 두 변을 녹인다 — 글자 칸도 그 녹인 구간(28%)까지 넓어진다
  // 모서리 상자는 글자 쪽 두 변(위·왼쪽)이 모두 지면과 같은 색이어야 이음매가 없다 — facing 한 변만 보고 seamless로 두면 윗변이 상자 선으로 드러난다
  // (10-06 사용자 "비주얼 바꾸니까 또 끊겨 보이네": 연파랑 바탕 + 흰 글로우 3D). 두 변이 평평하고(std) 변 안에서 색이 흐르지 않고 지면색과 같을 때만 녹이지 않는다
  const cornerEdges = style.kvMeta?.field?.edges;
  const edgeMatches = e => !!(e && e.flat && e.hex && field && colorDistance(e.hex, field.stops[0]) < 0.02 && (!e.from || !e.to || colorDistance(e.from, e.to) < 0.02));
  const cornerSeamless = !!(field?.seamless && !field.gradient && edgeMatches(cornerEdges?.top) && edgeMatches(cornerEdges?.left));
  const meltCorner = !!(cornerRect && !isCutout && !transparent && (!cornerSeamless || cornerCrop));
  // 질감 진정(CANON textureCalm, 10-12 desk-23·desk-02): 글자 아래 질감이 어지러우면 글자 쪽에서 지면 자기 색 스크림 — 어지러울수록 진하게(기본은 아주 살짝)
  const calm = (() => {
    const C = CANON.textureCalm, t = style.kvMeta?.field?.texture;
    if (!C || !textureFull || frameFull || !field || field.contrast < 4.5 || !t) return null;
    const busy = Math.max(0, Math.min(1, Math.max(((t.spread ?? 0) - C.spreadMin) / (C.spreadFull - C.spreadMin), (t.sharp ?? 0) / C.sharpFull)));
    if (busy < C.busyMin) return null;   // 거의 매끈한 질감(hdot-wave·hdot-purple3d)은 건드리지 않는다
    const base = field.stops[0], dark = field.text === WHITE;
    return { tint: mix(base, dark ? BLACK : WHITE, C.tintMix), a: Math.round((C.scrimMin + (C.scrimMax - C.scrimMin) * busy) * 100) / 100, reach: C.reach, busy: Math.round(busy * 100) / 100 };
  })();
  // 지면 CSS는 그릴 때 읽는다 — 띠 높이가 정해진 뒤 이음매 줄 색으로 지면을 잇는다(joinField)
  // 편집 「스크림 세기」(사진 전체형): 없음 = 스크림 층을 빼고, 약·중·강 = 불투명도 띠
  const PH_A = { low: [0.5, 0.35], mid: [0.75, 0.55], high: [0.96, 0.88] };
  const phA = ED?.scrim ? PH_A[ED.scrim] ?? null : [0.94, 0.82];
  const bgCss = () => (mold?.field && mold.bg) ? `background:${mold.bg};`   // 틀의 지면 처리가 영역이면(자소설 PC메인 왼쪽 350×280) 바탕은 템플릿 고정색, 브랜드 지면은 그 영역에만(아래 moldField)
    : photoFull
    ? `background:${phA ? `linear-gradient(${scrimDir},${rgba(scrimBase, phA[0])} 0%,${rgba(scrimBase, phA[1])} ${Math.round(scrimEnd * 0.5)}%,${rgba(scrimBase, 0)} ${scrimEnd}%),` : ''}${crowdKv && style.kvUse !== 'full' ? `linear-gradient(${rgba(mix(scrimBase, BLACK, 0.35), 0.55)},${rgba(mix(scrimBase, BLACK, 0.35), 0.55)}),` : ''}url('${esc(style.keyVisual)}') ${kvPos}/cover no-repeat;`   // 현장·군중 사진은 전체에 한 단계 어둡힌 브랜드색 55%를 한 겹 더(디자이너: 사진을 어둡게 톤다운 + 브랜드색 덮기) — 사람 머리가 글자 뒤에서 덜 시끄럽다
    // 질감: 통째로 깐다(가운데 맞춤 cover). 글자 대비가 4.5:1에 못 미치면(10-09: 3:1 → 4.5:1 — 파란 유리 면 위 흰 상세 글자) 글자 쪽에서 시작하는 브랜드색 스크림(사진 전체형과 같은 문법)
    : frameFull ? (() => { const tallF = L.shape === 'tall' || L.shape === 'tower'; const dw = Math.round(Math.max(w * 1.7, tallF ? h * 0.45 * (style.kvMeta?.ar ?? 1.8) : 0)); return `background:linear-gradient(${scrimDir},${rgba(field.stops[0], 0.85)} 0%,${rgba(field.stops[0], 0.55)} ${Math.round(scrimEnd * 0.45)}%,${rgba(field.stops[0], 0)} ${Math.round(scrimEnd * 0.8)}%),url('${esc(style.keyVisual)}') ${tallF ? 'right bottom' : 'right center'}/${dw}px auto no-repeat,${field.css};`; })()
    : textureFull ? `background:${ED?.scrim ? '' : field && field.contrast < 4.5 ? `linear-gradient(${scrimDir},${rgba(scrimBase, 0.9)} 0%,${rgba(scrimBase, 0.75)} ${Math.round(scrimEnd * 0.5)}%,${rgba(scrimBase, 0)} ${scrimEnd}%),` : calm ? `linear-gradient(${scrimDir},${rgba(calm.tint, calm.a)} 0%,${rgba(calm.tint, Math.round(calm.a * 0.7 * 100) / 100)} ${Math.round(calm.reach * 45)}%,${rgba(calm.tint, 0)} ${Math.round(calm.reach * 100)}%),` : ''}url('${esc(style.keyVisual)}') center/cover no-repeat;`
    // 10-12 midas-cards-orange 「위에 뚝 끊기는 느낌」: 그림을 아래로 민(oy>0) 위쪽을 자리 바탕 단색(room.hex)으로 채웠더니, 그림 윗변이 그라데이션(노랑→주황)이라 단색 띠 + 가로 직선이 생겼다.
    //   위 띠는 그림의 맨 윗줄을 세로로 늘인 층으로 채운다 — 윗변 색이 가로로 흐르는 그대로 이어져 이음매가 없다(data-kv-fill="row")
    : roomFull ? `background:url('${esc(style.keyVisual)}') ${roomFull.pos}/${roomFull.size} no-repeat${roomFull.oy > 0 && style.kvMeta?.px?.[1] ? `,url('${esc(style.keyVisual)}') ${roomFull.ox}px 0px/${Number.parseFloat(roomFull.size)}px ${Math.round(style.kvMeta.px[1] * roomFull.oy)}px no-repeat` : ''} ${roomFull.hex ?? 'transparent'};`
    : field ? `background:${field.css};` : '';

  /* ── 글자색 ── 규격이 정하면 그대로(비즈보드), 아니면 지면이 정한다(순흑/순백) */
  const tc = rules.textColors ?? {};
  // 틀의 지면 처리가 영역이면(자소설 PC메인 왼쪽 350×280 만 브랜드 지면, 바탕 mold.bg 흰색) 글자·로고는 영역 밖 바탕(mold.bg) 위에 선다 — 글자색·로고 흰/검은 지면(field)이 아니라 바탕 밝기로(10-15 오후: 지면이 어두워져도 흰 바탕 위 글자가 희어지면 안 된다)
  const moldOnBg = !!(mold?.field && mold.bg);
  const regulatedText = !!tc.main || !!mr.fonts?.required;   // 글자색 규정(textColors.main) 또는 규정 매체(자소설·리멤버·카카오)
  // 사람이 고른 글자색 톤(style.textTone 'dark'|'light', 10-19 「폰트 컬러 다크/라이트 선택」) — 규정 없는 매체에서만. 로고 흰/원색 판정(fgIsDark)도 같이 따라간다
  //   10-20 사용자 「일괄 바꿀 수 있어야 하는데 일부만 바뀐다」: 규정 매체라도 글자색이 고정(tc.main)되지 않았으면(자소설 「밝으면 #555, 어두우면 흰색」 둘 다 허용) 톤을 따른다 — 틀 색(mold.color/colorDark) 사이에서만 고른다. 고정색 매체(카카오 #4C4C4C)만 잠김
  const toneOv = (!tc.main && (style.textTone === 'dark' || style.textTone === 'light')) ? style.textTone : null;
  const mainFg0 = toneOv ? (toneOv === 'dark' ? '#000000' : '#FFFFFF') : (tc.main ?? (moldOnBg ? (contrast(mold.bg, '#000000') >= contrast(mold.bg, '#FFFFFF') ? '#000000' : '#FFFFFF') : field ? field.text : '#000000'));
  const fgIsDark = mainFg0 !== '#FFFFFF';
  if (toneOv) fired('textTone.' + toneOv);
  // 가이드 매체의 밝은 지면: 메인은 브랜드색(일화 레드·동부 네이비·비씨 네이비 3/3) — 지면 어디서나 4.5:1이 나올 때만. 어두운 지면은 흰색 그대로(ABL)
  const brandMain = !!(guide?.textColour === 'brand' && field && fgIsDark && !tc.main && !!mr.fonts?.required && p.primary && Math.min(...field.stops.map(s => contrast(s, p.primary))) >= 4.5);   /* 10-19: 글자색 규정 없는 매체는 타이틀 #333 — 밝은 지면 브랜드색 메인(구글 가이드)은 규정 매체에서만(사실상 꺼짐) */
  // 틀 글자색(10-15): 밝은 지면이면 샘플 글자색(세아제강 #555555 · 현대케피코 #000000), 어두운 지면이면 흰색(현대모비스 28:382) — 서브·상세도 흐리게 하지 않고 같은 색(「모든 문구 1가지 색상」)
  // 틀 글자색이 'brand' 면 브랜드 주색(NAP HS화성 샘플 네이비 #01193D = HS 브랜드색, 10-15 밤) — 밝은 지면(#F3F3F3 기준) 대비 4.5 미만이면 진회색
  const moldBrandFg = (mold?.color === 'brand') ? ((p.primary && contrast(p.primary, '#F3F3F3') >= 4.5) ? p.primary : '#1A1A1A') : null;
  // 글자색 규정이 있는 곳만 틀·규정 색을 쓴다(10-19 사용자 「규칙 있는 애들 제외하고 타이틀 #333/#fff, 서브텍스트 오퍼시티 0.7」): 규정 = textColors.main(카카오·캐치·리멤버·NAP 비즈보드) 또는 규정 매체(fonts.required — 자소설·리멤버·카카오, 틀 색 「모든 문구 1가지 색」 유지).
  //   그 밖(구글·NAP 띠/전면·네이버·블라인드·인스타·에브리타임·잡다·당근)은 CANON.textDefault: 밝은 지면 #333 / 어두운 지면 #fff, 서브·날짜·상세는 같은 색 70%
  const TD = CANON.textDefault ?? { light: '#333333', dark: '#FFFFFF', subOpacity: 0.7 };
  const moldFg = (mold && regulatedText) ? (fgIsDark ? (moldBrandFg ?? mold.color ?? mainFg0) : (mold.colorDark ?? '#FFFFFF')) : null;
  const defMain = fgIsDark ? TD.light : TD.dark;
  const defSub = fgIsDark ? `rgba(${hexToRgb(TD.light).join(',')},${TD.subOpacity})` : `rgba(${hexToRgb(TD.dark).join(',')},${TD.subOpacity})`;
  const mainFg = moldFg ?? (brandMain ? p.primary : (tc.main ?? defMain));
  if (!regulatedText) fired('textDefault');
  // 보조 글자는 한 단계 흐리게 쓰지만, 지면 대비가 빠듯하면(4.5 미만) 흐리게 하지 않는다 — 작은 글자가 먼저 안 읽힌다
  const tight = !!field && (field.contrast < 4.5 || field.source === 'ai');   // AI 지면(10-22 루프 r1 「회색 보조 문구 대비 약함」 19건)은 보조 글자도 흐리게 안 함
  const subFg = moldFg ?? tc.sub?.[0] ?? (tc.main ? tc.main : tight ? mainFg : defSub);
  const detailFg = moldFg ?? tc.sub?.[0] ?? (tc.main ? tc.main : tight ? mainFg : defSub);
  // 어두운 지면에는 흰색 로고. 없으면 원색 로고를 반전한다(워드마크는 괜찮고 컬러 로고는 뭉개진다 — 흰색 로고를 받는 게 맞다)
  const logoSrc0 = (!fgIsDark && style.logoLight) ? style.logoLight : style.logo;
  // 어두운 지면에 원색 로고만 있으면 반전(컬러 로고가 뭉개진다) 대신 흰 판 위에 올린다 — 동부건설 300×600 예시가 네이비 위 흰 카드에 로고를 둔 것처럼
  // 로고는 지면에 맞춰 단색으로 변환한다(10-06 사용자 결정): 어두운 지면에 원색 로고만 있으면 흰색으로, 밝은 지면(그림이 정한 흰 바탕)에 흰색 로고만 있으면 검정으로.
  // brightness(0)는 모든 불투명 픽셀을 검정으로, invert(1)는 그걸 흰색으로 — 투명 배경 로고라면 실루엣이 그대로 살아 디자이너가 쓰는 단색 변환과 같다
  // 타일 로고(불투명이 트림 상자의 85% 이상 — 둥근 모서리 앱 아이콘처럼 바탕 지우기가 못 지우는 색 타일)는 단색으로 바꾸지 않는다: 반전하면 흰 네모가 된다(10-09 데스크탑 코스알엑스 보라 타일).
  // 타일 자체가 로고의 판이라 어느 지면에서도 원색 그대로 읽힌다
  const logoTile = (style.logoMeta?.solid ?? 0) >= 0.85;
  // 로고 색 = 지면 색(CANON logoClash): 밝은 지면에 원색 그대로 둘 로고인데, 대표색 중 지면과 대비가 낮은 색이 로고 면적의 절반 이상이면 글자색(검정) 단색으로.
  //   10-12 desk-37: 동부건설 주황 로고 × 주황 지면(카카오 1200×600 — 글자는 검정) → 로고가 지면에 녹아 사라졌다. 지면색은 글자가 앉는 첫 색(stops[0])과 끝 색 중 대비가 낮은 쪽
  const clash = guide?.logoClash ?? CANON.logoClash;
  const logoClash = !!(clash && fgIsDark && !logoTile && field?.stops?.length && style.logoMeta?.colors?.length && style.logoTone !== 'light'
    && style.logoMeta.colors.filter(c => Math.min(...field.stops.map(st => contrast(c.hex, st))) < clash.minContrast).reduce((a, c) => a + c.share, 0) >= clash.share);
  const logoFilter = logoTile ? ''
    : (!fgIsDark && !style.logoLight) ? 'filter:brightness(0) invert(1)'
    : (fgIsDark && (style.logoTone === 'light' || logoClash)) ? 'filter:brightness(0)'
    : '';
  // 단색으로 바꿀 때만 글자 속까지 지운 사본(style.logoMono, core/logo.js prepLogoRGBA mono) — 속이 메워져 「●」가 되지 않게.
  // 원색 그대로면 속의 흰색을 남긴 로고(색 엠블럼 안 흰 글자가 지면색으로 비치지 않게) — 10-12 결정 12
  const logoSrc = (logoFilter && style.logoMono && logoSrc0 === style.logo) ? style.logoMono : logoSrc0;
  // 심볼 원색 유지(10-14 t1014 제일약품·LT소재): 단색으로 바꿀 때 로고 실측이 왼쪽 심볼(logoMeta.emblem — 속에 흰 무늬가 있는 색 엠블럼)을 찾았으면
  //   심볼은 원색 그대로, 글자만 단색. 같은 상자에 두 장을 겹치고 마스크로 가른다(svg 내보내기가 읽는 mask-image 그라데이션). data-logo 는 단색 쪽(톤 실측이 그 장을 본다)
  const emblemX = (logoFilter && !logoTile && logoSrc0 === style.logo && style.logoMeta?.emblem?.x1) ? Math.round(style.logoMeta.emblem.x1 * 1000) / 10 : null;
  const logoTag = (css, fill = false) => {
    if (emblemX == null) return `<img data-logo="1" src="${esc(logoSrc)}" alt="" style="${css};${logoFilter}"/>`;
    const mk = (a, b) => `-webkit-mask-image:linear-gradient(to right,${a} ${emblemX}%,${b} ${emblemX}%);mask-image:linear-gradient(to right,${a} ${emblemX}%,${b} ${emblemX}%)`;
    return `<span data-logo-keep="${emblemX}" style="position:relative;display:block;width:fit-content;${fill ? 'height:100%;' : ''}line-height:0"><img data-logo-emblem="1" src="${esc(style.logo)}" alt="" style="${css};${mk('#000', 'transparent')}"/><img data-logo="1" src="${esc(logoSrc)}" alt="" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;${logoFilter};${mk('transparent', '#000')}"/></span>`;
  };
  if (emblemX != null) fired('logo.emblemKeep');
  TR.field = field ? { source: field.source, stops: field.stops, angle: field.angle, css: field.css, text: field.text, contrast: field.contrast, seamless: field.seamless, gradient: field.gradient, vivid: field.vivid ?? null, dim: field.dim ?? null, joined: !!field.joined, align: field.align ?? null, deviation: field.deviation ?? null } : null;
  TR.text = { mainFg, brandMain, subFg, detailFg, tight, lightProfile, glassKv };
  TR.scrim = photoFull ? { kind: 'photo-full', base: scrimBase, a: [0.94, 0.82], end: scrimEnd, dir: scrimDir, crowd: crowdKv } : (textureFull && field && field.contrast < 4.5) ? { kind: 'texture-contrast', base: scrimBase, a: [0.9, 0.75], end: scrimEnd, dir: scrimDir } : calm ? { kind: 'calm', ...calm, dir: scrimDir } : frameFull ? { kind: 'frame', a: [0.85, 0.55], dir: scrimDir } : null;
  TR.logo = { emblem: emblemX, place: logoPlace, tone: logoFilter.includes('invert') ? 'white' : logoFilter ? 'black' : 'original', srcTone: style.logoTone ?? null, clash: logoClash, tile: logoTile, mono: !!(style.logoMono && logoSrc === style.logoMono), box: logoBox, allow: allowLogo, has: hasLogo, asObject: logoAsObject, template: !!tLogo,
    // 가이드 배치 규칙(10-14 place.logoSlot): 자동 로고 자리 — 모서리(왼쪽 배치면 좌우 뒤집음)·칸 종류(abs 모서리 칸 · flex 글자 열 안 · template 매체 로고 칸 · object 그림 자리)
    corner: (mirrorX && /-(left|right)$/.test(logoPlace)) ? logoPlace.replace(/(left|right)$/, x => (x === 'left' ? 'right' : 'left')) : logoPlace, slot: logoAsObject ? 'object' : tLogo ? 'template' : logoBox ? 'abs' : 'flex', tplRect: tLogo ?? null };
  if (logoWhite) fired('logoOnly.white'); if (brandMain) fired('textColour.brand'); if (field?.vivid != null) fired('vividWhite'); if (/kv-harmony|kv-vivid/.test(field?.source ?? '')) fired('kvHarmony'); if (/kv-mood/.test(field?.source ?? '')) fired('kvMood'); if (calm) fired('textureCalm'); if (logoClash) fired('logoClash'); if (/-bridge$/.test(field?.source ?? '')) fired('melt.bridge'); if (field?.joined) fired('joinField'); if (field?.dim) fired('vividWhite.dimKv');

  const shellCss = () => `position:relative;width:${w}px;height:${h}px;${bgCss()}overflow:hidden;font-family:${family};color:${mainFg};box-sizing:border-box;display:flex;padding:${pad.top}px ${mirrorX ? pad.left : pad.right}px ${pad.bottom}px ${mirrorX ? pad.right : pad.left}px`;
  const open = (extra = '') => `<div data-ad="1" data-spec="${esc(spec.id ?? '')}" data-transparent="${transparent ? 1 : 0}" data-field-source="${field?.source ?? 'none'}"${field?.joined ? ' data-field-joined="1"' : ''}${roomFull?.oy > 0 ? ' data-kv-fill="row"' : ''}${calm ? ` data-calm="${calm.a}"` : ''}${style.visual === 'object' ? ' data-visual="object"' : ''} data-kv-use="${photoFull ? 'full' : (roomFull || textureFull) ? 'bg' : hasKv ? 'part' : 'none'}"${logoOnly ? ' data-logo-only="1"' : ''}${(tImage && !cutCorner) ? ' data-template="1"' : ''}${mold ? ' data-mold="1"' : ''}${gv ? ` data-variant="${esc(gv.id)}"` : ''} data-trace="${esc(JSON.stringify(TR))}" style="${shellCss()};${extra}"${field?.dim ? ` data-dim="${field.dim}"` : ''}>${field?.dim ? `<style>[data-dim="${field.dim}"] [data-object="1"]{filter:brightness(${field.dim})}</style>` : ''}`;

  /* ── 로고 전용 규격 ── */
  if (logoOnly) {
    const side = Math.min(innerW, innerH);
    // 투명 배경 로고 파일(자소설 M채팅목록 300×180 — 파일 자체가 로고): 화면을 거의 채운다(높이 86%·폭 90%, 10-16 사용자 「저 크기에 꽉 차야」). 흰 바탕 프로필(300×300 등)은 샘플대로 60%
    if (transparent && style.logo) fired('logoOnly.fill');
    const mark = style.logo
      ? `<img data-logo="1" src="${esc(logoSrc)}" alt="" style="display:block;height:${transparent ? Math.round(h * 0.86) : Math.round(side * 0.6)}px;width:auto;max-width:${transparent ? Math.round(w * 0.9) : Math.round(innerW * 0.86)}px;object-fit:contain;${logoFilter}"/>`
      : (() => { const t = copy.advertiser || copy.main; const fs = Math.max(8, Math.floor(Math.min(side * 0.22, (innerW * 0.86) / Math.max(1, textWidth(t)))));
          return `<div data-field="advertiser" style="font-size:${fs}px;line-height:1.25;font-weight:700;color:${mainFg};text-align:center;white-space:nowrap">${esc(t)}</div>`; })();
    return `${open('align-items:center;justify-content:center')}${mark}</div>`;
  }

  // 비주얼만 규격(10-16 네이버 네이티브 썸네일 342×228 — 보드 31:4268 「배너/비주얼만/로고만」): 이미지 = 키비주얼 하나. 글자·로고는 광고 플랫폼 입력칸(이미지 밖)이라 안 그린다.
  //   사진은 칸을 꽉 채우고(cover), 누끼·오브젝트는 브랜드 지면 위에 가운데 contain(높이 78%). 키비주얼이 없으면 로고를 오브젝트로 가운데(기존 「그림 없으면 로고가 오브젝트」 규칙).
  if (rules.visualOnly || spec.visualOnly) {
    fired('visualOnly');
    TR.copy = { main: copy.main ?? null, sub: copy.sub ?? null, date: copy.date ?? null, details: [] };   // 글자는 매체가 올린다 — 전달 시트(앱 ZIP txt)가 이 문구를 쓴다(10-16 캐치 중앙배너)
    if (hasKv) {
      const photo = kvKind ? kvKind !== 'cutout' : (style.kvMeta?.field?.opaque ?? 1) >= 0.5;   // 누끼는 종류가 정해졌으면 무조건 contain(10-16 오후 사용자: 로켓 누끼가 cover 로 잘림)
      const img = photo
        ? `<div data-object="1" data-kv-only="1" style="position:absolute;inset:0;background:url('${esc(style.keyVisual)}') center/cover no-repeat"></div>`
        : `<div data-object="1" data-kv-only="1" style="position:absolute;left:${Math.round(w * 0.07)}px;top:${Math.round(h * 0.08)}px;width:${Math.round(w * 0.86)}px;height:${Math.round(h * 0.84)}px;background:url('${esc(style.keyVisual)}') center/contain no-repeat"></div>`;
      return `${open('padding:0')}${img}</div>`;
    }
    const side = Math.min(innerW, innerH);
    const mark = style.logo
      ? `<div data-object="logo" style="display:flex;align-items:center;justify-content:center"><img data-logo="1" src="${esc(logoSrc)}" alt="" style="display:block;height:${Math.round(side * 0.5)}px;width:auto;max-width:${Math.round(innerW * 0.7)}px;object-fit:contain;${logoFilter}"/></div>`
      : `<div data-field="advertiser" style="font-size:${Math.max(8, Math.floor(side * 0.18))}px;line-height:1.25;font-weight:700;color:${mainFg};text-align:center;white-space:nowrap">${esc(copy.advertiser || copy.main)}</div>`;
    return `${open('align-items:center;justify-content:center')}${mark}</div>`;
  }

  const objRatio = profNum('objectWidthRatio');
  // 가이드 템플릿의 '이미지 영역' 상자 비율(구글: 580×400 폭 51% · 970 44% · 300×600 높이 32% · 300×1050 30%)이 레퍼런스 값보다 우선
  const gObj = guide?.objectRatio?.[L.shape] ?? null;
  const gObjH = kvWideBand ? guide.objectRatio.squareBand : gObj;
  const refObjW = gObj != null ? Math.round(w * gObj) : (L.objectW ?? Math.round(w * 0.42)), refObjH = gObjH != null ? Math.round(h * gObjH) : (L.objectH ?? Math.round(h * 0.4));   // ?? : 편집 프리셋이 형태 문법에 없는 자리(세로형 오른쪽 열)를 고를 때만 쓰인다
  let objW = objectSide !== 'right' ? 0
    : logoAsObject ? Math.round(innerW * 0.34)
    // 매체가 정한 상자: 글자 칸은 상자 왼쪽 선에서 간격(카카오 33px)만큼 떨어져 끝난다
    : oBox ? Math.max(0, Math.round(w - pad.right - innerW * 0.04 - (oBox.x - (oBox.gap ?? 33))))
    : useRef ? Math.max(0, refObjW - pad.right)
    : Math.round(innerW * Math.min(0.5, Math.max(0.24, objRatio ?? (strip ? 0.32 : 0.38))));
  // 가로로 긴 누끼(캐릭터 떼·건물)는 오른쪽 열에 맞춰 넣으면 키가 열의 절반도 안 돼 위아래가 빈다(ABL 떼 1005×360: 빈 띠 30%) — 열을 넓혀 키를 열 높이의 70%까지, 글자 칸은 안쪽 폭의 42%는 남긴다
  if (objectSide === 'right' && isCutout && !oBox && !logoAsObject && !strip && style.kvMeta?.ar > 1.3) {
    const arW = style.kvMeta.ar, colH = innerH;
    const want = Math.round(colH * 0.7 * arW) - pad.right;
    const maxW = Math.round(innerW * 0.58);
    if (want > objW) objW = Math.min(maxW, want);
  }
  // 단일 사물 누끼 + 오른쪽 열(가로형): 글자 칸 42%·로고 띠 아래를 경계로 우하단 블리드. 글자 칸은 주인공 상자 왼쪽 선에서 끝난다(Figma 블라인드 KV 38·22–100·100, 카카오 50·36–100·100)
  // 메인 한 줄짜리 「이미지 내 텍스트 N줄」 규격(카카오 홍보이미지 3줄 = 메인 1 + 슬로건 1 + 날짜 1): 메인 줄은 그림 열 위까지 가로로 길게 쓴다 — 디자이너 카카오 「마이다스 대규모 공개채용」 77px 한 줄이
  // 그림(위 36%부터) 위를 지난다. 그림은 메인 줄 아래에서 시작하고, 글자 덩어리는 위에 붙인다(10-08 밤 B3). 좁은 글자 열(446px)에 가두면 회사가 메인에서 떨어지고 서브로 밀려 슬로건이 빠졌다
  const mainSpan = !!(useRef && L.shape === 'wide' && reqDate && slots.main?.lines === 1 && singleObj && objectSide === 'right' && !oBox && !logoAsObject && !strip && !bleedP);
  if (singleObj && objectSide === 'right' && !oBox && !logoAsObject && !strip && !bleedP) {
    const gapX = Math.round(innerW * 0.04), minCol = guide.objectBleed.minTextCol ?? 0.42;
    const col = minCol;
    let x0 = pad.left + Math.round(innerW * col) + gapX;
    if (gObj != null) x0 = Math.max(x0, w - Math.round(w * gObj));   // 가이드 그림 자리(구글 970 44%)의 왼쪽 선
    let y0 = (logoBox && logoPlace === 'top-right' && allowLogo && logoSrc) ? logoBox.top + logoBox.h + Math.round(logoBox.h * 0.5) : 0;
    if (mainSpan) y0 = Math.max(y0, pad.top + Math.round(Math.min(L.main, fsRange?.max ?? Infinity) * L.mainLine) + Math.round(h * 0.04));
    bleedP = bleedAt(x0, y0);
    if (bleedP) {
      const fo = style.kvMeta.field.focus;
      const subjL = bleedP.left + Math.round(Math.max(0, fo.x - fo.w / 2) * bleedP.dw);
      const tw = Math.max(Math.round(innerW * col), subjL - pad.left - gapX);
      objW = Math.max(0, innerW - gapX - tw);
    }
  }
  // 편집 「키비주얼 크기」(오른쪽 열): 열 폭 × 배율 — 글자 칸은 안쪽 폭의 42%(CANON objectBleed.minTextCol) 아래로 내려가지 않는다
  if (kvK !== 1 && objectSide === 'right' && !oBox && !logoAsObject && !bleedP && !strip) objW = Math.round(Math.max(innerW * 0.15, Math.min(innerW * (1 - (guide?.objectBleed?.minTextCol ?? 0.42)), objW * kvK)));
  let objH = objectSide !== 'bottom' ? 0 : logoAsObject ? Math.round(innerH * 0.3) : useRef ? Math.max(0, refObjH - pad.bottom) : Math.round(innerH * 0.33);
  const stripLogoCol = (strip && allowLogo && logoSrc && !tLogo && innerH >= 70) ? Math.round(innerW * 0.16) + 20 : 0;   // 로고 + 간격
  // 띠형의 CTA 버튼도 같은 줄에 선다 — 글자 칸에서 그 폭을 빼지 않으면 메인이 잘린다(버튼 글자는 띠 높이의 1/4을 넘지 않는다)
  const stripCtaCol = (SHOW_CTA && strip && slots.cta && copy.cta) ? Math.round((textWidth(copy.cta) + 2.2) * innerH * 0.25) + 20 : 0;
  const textW = (objectSide === 'right' ? innerW - objW - Math.round(innerW * 0.04) : innerW) - stripLogoCol - stripCtaCol;
  // 메인이 쓸 폭 — 보통은 글자 열. mainSpan이면 그림 열 위까지(우상단 로고 자리만 비운다)
  let mainW = textW;
  if (mainSpan && bleedP) {
    const logoW = logoBeside ? Math.min(logoBox.maxW, Math.round(w * (guide.logoCap?.wRatio ?? 0.12))) + Math.round(innerW * 0.04) : 0;
    mainW = Math.max(textW, innerW - logoW); vCenter = false;
  }
  // 예시는 글자가 그림 자리의 위쪽(녹인 구간)으로 겹친다 — 가이드가 정한 만큼(세로형 40%·세로 띠 20%·정사각 모서리 26%) 그림 자리를 글자에 내준다
  // 띠 윗줄이 바탕이 아니라 주인공(머리)이면 글자를 그림 위로 겹치지 않는다 — 겹침 규칙은 녹인 바탕 위를 전제한다(여우 560×700: '정규직 채용'이 귀 위로)
  const P0 = (objectSide === 'bottom' && hasKv && !isCutout && !photoFull && !tImage && field) ? kvPlacement(style, field, { side: 'bottom', w, h, size: objH, edgePad: pad.bottom }) : null;
  const rowsP = style.kvMeta?.field?.rows;
  // 겹침 구간(띠 윗변부터 overlap×objH)의 줄이 하나라도 바탕 95% 아래면 겹치지 않는다 — 윗줄만 보면 비스듬히 올라오는 주인공(기하 3D 부채꼴 300×600: 상세가 부채 위로 51%)을 놓친다
  const rowsBetween = (p0, frac0, frac1) => { if (!rowsP?.length) return 1; const n = rowsP.length; let m = 1; for (let i = Math.max(0, Math.floor(frac0 * (n - 1))); i <= Math.min(n - 1, Math.ceil(frac1 * (n - 1))); i++) m = Math.min(m, rowsP[i]?.bg ?? 1); return m; };
  const overlap0 = guide?.objectOverlap?.[L.shape] ?? 0;
  const zoneFrac = (() => { if (!P0 || !overlap0) return 0; const ar0 = style.kvMeta?.ar ?? 1; const drawnH = P0.crop ? P0.crop.ih * P0.crop.scale : Math.max(w / ar0, objH + pad.bottom); return (overlap0 * objH) / Math.max(1, drawnH); })();
  const joinCuts = !!(P0 && rowsP?.length && rowsBetween(P0, P0.joinFrac, P0.joinFrac + zoneFrac) < 0.95);
  // 누끼는 녹인 바탕 구간이 없다 — 겹칠 수 있는 건 띠 안에서 누끼 위로 비는 부분뿐(가로 긴 떼는 띠 아래쪽에 낮게 선다: ABL 300×600 메인이 잘리지 않게). 캐릭터 하나가 띠를 다 채우면 0(여우 누끼 머리 위 글자 금지)
  // 사진은 '바탕'이 없다(어두운 사진은 줄 전체가 가장자리 색과 비슷해 조용하다고 오인 — 일화 어둡게 400×340 상세가 건물 위로 31%) → 0
  const cutFree = (isCutout && style.kvMeta?.ar && objectSide === 'bottom') ? Math.max(0, 1 - Math.min(objH + pad.bottom, w / style.kvMeta.ar) / Math.max(1, objH + pad.bottom)) : 0;
  const overlap = (joinCuts || kvKind === 'photo') ? 0 : isCutout ? Math.min(overlap0, Math.round(cutFree * 100) / 100) : overlap0;
  let objReserve = objectSide === 'bottom' ? Math.round(objH * (1 - overlap)) : objH;
  const cornerTop = (tImage && !(tImage.y + tImage.h >= h - 1 && tImage.w >= w - 1) && tImage.y > 0) ? tImage.y + Math.round(tImage.h * (gCorner ? Math.max(0.22, overlap) : 0.22)) : null;
  const textH = objectSide === 'bottom' ? innerH - objReserve - 12 : (cornerTop != null && hasKv ? Math.max(40, cornerTop - pad.top) : innerH);

  /* ── 슬롯 유무 ── 정보는 규격이 작아져도 빼지 않는다(구글 28/28). */
  const subAbove = guide?.subAbove ? true : tplCopy ? true : useRef ? L.subAbove : (D?.subAbove?.value ?? 0) >= 0.5;   // 템플릿 구조 매체(자소설)는 가로형에서도 서브(시즌)가 메인 위 — PC메인배너 샘플 서브 y42 → 메인 y81      // 레퍼런스: 세로형은 서브(회사)가 메인 위 · 구글: 슬로건 아이브로는 가로형에서도 위(12/12)
  const useDetail = !!slots.detail && (!strip || innerH >= 200) && (ladder.details?.length > 0);
  const want = {
    sub: !!slots.sub && !!copy.sub, date: !!slots.date && !!copy.date && (!useDetail || reqDate || !!slots.date?.sample), extra: !!slots.extra && !!copy.extra,   // reqDate: 날짜 줄이 따로 선다(블라인드 4줄 = 메인 2 + 날짜 + 모집직무)
    label: !!slots.label && !!copy.label, cta: SHOW_CTA && !!slots.cta && !!copy.cta, notice: !!slots.notice && !!copy.notice,
    detail: useDetail,
    advertiser: !!slots.advertiser && !!copy.advertiser && !(logoSrc && allowLogo),
  };
  // 가로형은 메인 + 정보 한 줄(안랩·삼진제약). 서브 칸이 있으면 서브가 그 줄이고(접수기간이 들어 있다), 없으면 날짜·상세가 그 줄이다.
  // 가이드가 슬롯을 정한 매체(구글)는 가로형에도 서브 + 메인 + 상세 한 행을 다 둔다(일화 970: 접수기간·모집부문 라벨 2개 한 줄)
  if (useRef && L.shape === 'wide' && !guide?.seasonInMain) {
    if (tplCopy) want.date = false;     // 템플릿 구조: 서브(시즌) + 메인 + 상세(날짜는 상세 줄 안에)
    else if (reqDate) { if (!slots.detail) want.detail = false; }   // 메인 + 슬로건 + 날짜(카카오 3줄) · 4줄이면 모집직무 한 줄 더(블라인드)
    else if (want.sub && ctx.kind === 'recruit') { want.date = false; want.detail = false; }
    else if (want.date || want.detail) want.sub = false;
  }

  /* ── 타이포 ── 메인은 절대 px에 가깝다(프로필 관찰 px) */
  const stated = statedFontSizes(rules, tScale);
  let sampleMainPx = null;   // 메인은 고정값이 아니라 「원하는 크기」(titleMax) — 안 들어가면 줄인다(카카오 홍보이미지 1줄 「마이다스 대규모 공개채용」이 72px 고정이면 회사가 떨어진다)
  const sampleSoft = new Set();   // 샘플에서 온 서브·상세 크기 — 매체 규정(fontSizes)과 달리 메인을 살리려 줄일 수 있다(NAP 320×480 행성 누끼: 글자 자리 194px 에 샘플 크기 그대로면 메인이 「채용 공고」로 떨어진다)
  if (sampleRoles && !logoOnly) {
    for (const [r, sr] of Object.entries(sampleRoles)) {
      if (!['main', 'sub', 'date', 'detail', 'label'].includes(r) || stated[r] != null || !sr?.px || sr.share < 0.5) continue;
      if (r === 'main') { if (!(guide?.mainPx || guide?.mainScale) && sr.share >= 1 && !rules.fontSizes) sampleMainPx = Math.round(sr.px * tScale); continue; }
      let px = Math.round(sr.px * tScale);
      // 가이드가 상세·서브 글자 띠를 정한 매체(구글)는 그 띠 안으로 — 샘플 24px 상세가 300×1050 글자 예산을 넘겨 잘렸다
      if (r === 'detail' && guide?.detailPx) px = Math.max(guide.detailPx.min ?? px, Math.min(guide.detailPx.max ?? px, px));
      if (r === 'sub' && guide?.subPx?.max) px = Math.min(guide.subPx.max, px);
      stated[r] = px; sampleSoft.add(r);
    }
  }
  const th = rules.textHeightPx ?? null;
  const line = 1.3;
  const mainLine = useRef ? (guide?.mainLineHeight ?? L.mainLine) : line;
  const observedPx = profNum('mainPx');
  const scaleBase = L.shape === 'wide' ? Math.sqrt(w * h) : L.shape === 'square' ? Math.min(w, h) : w;   // 가로형 √(w·h) · 정사각 짧은 변 · 세로형 폭
  let titleMax = useRef ? (guide?.mainScale?.[L.shape] ? Math.round(scaleBase * guide.mainScale[L.shape]) : L.main) : Math.min(72, Math.max(22, observedPx ? Math.round(observedPx * 1.15) : Math.round(S * 0.085)));
  const thMax = th?.max ?? ((combined?.lineHeightsPx && !Array.isArray(combined.lineHeightsPx)) ? combined.lineHeightsPx.max : null);   // 결합 규정의 글자 높이 띠(에브리타임 25~60)도 같은 뜻
  if (useRef && thMax && !guide?.mainScale) titleMax = Math.max(titleMax, Math.min(thMax, Math.round(S * 0.11)));   // 매체가 밝힌 글자 높이 상한(에브리타임 60px)은 디자이너가 그만큼 쓴다는 뜻(보드 1-884 메인 57px)
  if (strip) titleMax = Math.min(titleMax, Math.round(innerH * 0.5));
  // 가이드의 메인 글자 px 띠(구글 24~40: 규격이 작아져도 글자를 비례로 줄이지 않는다 — '글자 크고 굵게')
  if (guide?.mainPx?.max) titleMax = Math.min(titleMax, guide.mainPx.max);
  if (sampleMainPx) titleMax = sampleMainPx;   // 디자이너 샘플의 메인 크기(규격마다 중앙값 — 잡다 28·NAP 320×480 38·블라인드 66→띠 56) — 10-12 매체별 규격정리
  titleMax = Math.max(14, Math.min(titleMax, Math.floor(textW / (useRef ? 3 : 5))));
  // 매체가 밝힌 글자 크기 띠(블라인드 게시글 textLimits fontSizeRange 32~56 — 이미지 안 글자 전부): 메인 상한·하한, 보조 글자도 그 띠 안으로(sizesAt)
  if (fsRange?.max != null) titleMax = Math.min(titleMax, fsRange.max);
  const capMain = th?.max != null ? Math.min(titleMax, th.max) : titleMax;
  // 정사각 규격 메인 하한 = 짧은 변 × 0.067(CANON mainFloor — 인스타 보드 관찰 0.067~0.09, 디자이너 1080에 91px). 가이드가 메인 px 띠를 정한 매체(구글)는 가이드
  const sqFloor = (useRef && L.shape === 'square' && guide?.mainFloor?.square && !guide?.mainPx) ? Math.round(Math.min(w, h) * guide.mainFloor.square) : 0;
  const floorMain = th?.min != null ? Math.max(11, th.min)
    : fsRange?.min != null ? Math.min(capMain, Math.max(11, fsRange.min))
    : Math.min(capMain, Math.max(guide?.mainPx?.min ?? 11, sqFloor));
  const obsLines = profNum('mainLines');
  const mainLinesCap = slots.main.lines ?? (useRef ? (guide?.mainLines?.[L.shape] ?? L.mainLines) : (obsLines ? Math.max(2, Math.round(obsLines) + (tall ? 2 : 1)) : null));
  const noticeLines = slots.notice?.lines ?? 2;
  // 메인: 원하는 크기에서 사다리 전부가 안 맞으면(한 낱말이 한 줄보다 긴 300×1050 "신입/경력사원") 문구를 버리기 전에 글자를 한 단계씩 줄여 본다
  let mainCap = (mold?.rows?.main?.px != null ? Math.round(mold.rows.main.px * tScale) : null) ?? stated.main ?? capMain;   /* 틀이 메인 크기를 정했으면 그 크기로 문구를 고른다(NAP 320×480 수정본 34px: 일반 상한 38 로 재면 「신입사원 공개채용」이 접혀 「ABL생명 / 채용」으로 줄었다, 10-16) */
  {
    let info = pickInfo('main', mainW, mainCap, mainLinesCap);
    // 가이드 매체(구글): 사다리 위쪽 문구(시즌+회사+구분 "2026년 비씨월드제약/헬스케어 3차 정기 채용")가 글자를 keepInfo(80%)까지 줄여서 들어가면 그쪽 — 예시는 글자보다 정보를 먼저 지켰다
    if (guide?.keepInfo && stated.main == null && info.fits) {
      const cands = ladder.main ?? []; const idx = cands.indexOf(info.text);
      const minFs = Math.max(floorMain, Math.round(capMain * guide.keepInfo));
      for (let i = 0; i < idx; i++) {
        let fs = mainCap, ok = null;
        while (fs >= minFs) { if (pickInfo('main', mainW, fs, mainLinesCap, cands[i]).fits) { ok = fs; break; } fs = Math.round(fs * 0.92); }
        if (ok) { info = { text: cands[i], fits: true, last: false }; mainCap = ok; break; }
      }
    }
    while ((!info.fits || info.last) && stated.main == null && mainCap > floorMain) {
      mainCap = Math.max(floorMain, Math.round(mainCap * 0.9));
      info = pickInfo('main', mainW, mainCap, mainLinesCap);
    }
    // 줄여도 결국 맨 끝 문구면 원래 크기로 — 정보 없는 문구를 작게까지 쓸 이유가 없다
    if (info.last) { mainCap = stated.main ?? capMain; info = pickInfo('main', mainW, mainCap, mainLinesCap); }
    copy.main = info.text;
  }
  const preferMain = copy.main;   // 세로 예산 때문에 한 줄로 몰리면서 이 문구가 떨어지면(일화 970 "㈜일화 …" → "신입/경력 …") 두 줄로 줄여서라도 되살린다
  for (const r of ['sub', 'date', 'extra', 'label']) copy[r] = pickIn(r, textW);
  // 라벨 칩은 사다리가 짧아(고용형태 하나) 한도를 넘으면 그대로 그려졌다(잡다 PC 라벨 4자에 "신입·경력" 5자 — 10-12 매체 규정 전수 검사, sep-open-recruit).
  //   정보 줄이 아니라 장식 칩이므로 한도 안에 드는 문구가 없으면 비운다 — 지어내지 않는다
  if (copy.label && slots.label?.maxChars != null && countChars(copy.label, counting) > slots.label.maxChars) copy.label = '';

  // 상세 줄 — "라벨 : 값". 줄당 글자수가 좁으면(자소설 세로형 11자) 라벨 줄 + 값 줄로 쌓는다.
  const detailSlot = slots.detail ?? null;
  const detailFs = stated.detail ?? null;
  const detailLines = [];
  // 이미지 옆으로 흐르는 구간의 폭 — 가이드 모서리 상자(구글 580)는 상자 왼쪽 선보다 넓게(일화 목록 폭 78%): 그림의 녹인 구간 위로 글자가 가도 된다
  // 오른쪽 그림이 지면으로 녹는 경우(누끼·상자 아님) 상세는 그 녹인 구간의 30%까지 흘러도 된다 — 레퍼런스(일화 970 칩이 사진 위까지)처럼. "모집직무 : 클라우드 플랫폼 / 엔지니어"가 칸 경계에서 접히지 않게
  const rightMelt = objectSide === 'right' && hasKv && !isCutout && !transparent && !oBox && !logoAsObject;
  const detailW = mold ? (tText?.w ?? textW)   // 틀: 상세도 글자 칸 전체 폭(세아 팝업 「모집직무 : 인사, 연구개발, 전기,」가 그림 칸 위까지 — 10-15)
    : (imgCorner && hasKv)
    // 누끼 떼(키가 고른 사람 여럿)는 상자 왼쪽 위가 비지 않는다 — 상세는 상자 왼쪽 선까지만(10-14 t1014 ABL 580×400 상세가 머리 위 39%)
    ? (gCorner && guide?.detailColumn ? ((isCutout && kvTypeOf(style.kvMeta)?.flags.group && cornerRect) ? Math.max(60, Math.min(Math.round(textW * guide.detailColumn), cornerRect.x - pad.left - 10)) : Math.round(textW * guide.detailColumn))
      // 자소설 모서리 상자: 그림이 실제로 그려지는 네모의 왼쪽 선까지 + 녹인 구간의 28% — "클라우드 플랫폼 / 엔지니어"처럼 상자 선에서 접히지 않게
      : bleedP ? Math.max(60, Math.round(bleedP.left + Math.max(0, style.kvMeta.field.focus.x - style.kvMeta.field.focus.w / 2) * bleedP.dw) - pad.left - Math.round(w * 0.02))   // 블리드: 주인공 상자 왼쪽 선까지
      : Math.max(60, (cornerRect ? cornerRect.x + ((meltCorner || isCutout) ? Math.round(cornerRect.w * 0.28) : 0) : tImage.x) - pad.left - 10))   // 누끼 상자의 왼쪽 위는 비어 있다 — 값 줄이 그 위로 28%까지 흘러도 된다(코엑스 '전시/컨벤션ㅣ베뉴마케팅ㅣDX'가 건물 위로)
    : rightMelt ? textW + Math.round(objW * 0.3) : textW;
  let detailFsFit = null;   // 가이드 매체에서 상세가 안 들어가 글자를 줄인 결과(없으면 null)
  // 태그 쌓기 — 가이드가 칩 문법을 정하지 않은 매체에서 지면이 넉넉하고(S≥420) 상세가 둘 이하면 '알약 라벨 한 줄 + 값 한 줄'(보드 1-884 코엑스 에브리타임 홈 카드).
  // 값이 목록이면 ' ㅣ '로 잇는다("전시/컨벤션 ㅣ 베뉴마케팅 ㅣ DX"). 띠·가로 한 행 흐름·템플릿 칸은 제외
  let stackTags = false;
  if (want.detail) {
    // 메인·서브에 이미 들어 있는 말은 상세로 되풀이하지 않는다("신입/경력" 고용형태는 메인 "신입/경력사원 채용"에 있다 — 보드 예시에 고용형태 줄은 없다)
    const saidIn = v => [copy.main, copy.sub].some(t => String(t ?? '').replace(/\n/g, ' ').includes(String(v)));
    const cands0 = ladder.details.filter(d => !saidIn(d.value) && !(want.date && d.label === '접수기간') && !(want.date && sampleText.has(d.value) && d.label === '접수기간'));   // 날짜 줄이 따로 서면(블라인드 4줄) 상세엔 모집직무만
    stackTags = !guide?.detailLabels && !strip && !(tImage && !cutCorner) && !(useRef && (L.shape === 'wide' || gv?.detailFlow === 'row')) && S >= 420 && cands0.length > 0 && cands0.length <= 3;   // 자소설 템플릿 칸은 제외, 누끼 모서리 상자(합성)는 포함
    const cap = detailSlot.lines ?? guide?.detailRows?.[L.shape] ?? 3;
    // 쌓으면 한도를 넘는데 하나는 들어가면 하나만 쌓는다(코엑스 홈 카드: 상세 2줄에 '모집분야' 하나) — 그때 직무가 먼저. 하나도 못 쌓으면 인라인
    if (stackTags && cands0.length * 2 > cap) {
      // 단, 줄이 넉넉하고(4줄 이상) 채용 날짜가 필수면(CANON required.recruit) 날짜가 먼저 — 인스타 1080이 직무를 먼저 쌓다 날짜를 버렸다(10-08 밤 A5 회귀)
      const dateFirst = cap >= 4 && ctx.kind === 'recruit' && (guide?.required?.recruit ?? []).includes('date');
      const lead = l => cands0.filter(d => d.label === l);
      if (cap >= 2) { const head0 = dateFirst ? [...lead('접수기간'), ...lead('모집직무')] : lead('모집직무'); cands0.splice(0, cands0.length, ...head0, ...cands0.filter(d => !head0.includes(d))); }
      else stackTags = false;
    }   // 알약 줄 + 값 줄이 상세 줄 한도를 넘으면 인라인으로(에브리타임 홈 카드 상세 2줄 → 상세 1개만 쌓을 수 있다)   // 구글 템플릿 상세 줄 수: 580 3(+1) · 970 2(+1) · 300×600 5 · 300×1050 7
    const fit = fs => {
      // 매체의 줄당 글자수(자소설 상세 11자)와 실제 칸 폭 중 작은 쪽. 폭 어림은 0.9em/자 — 숫자·괄호가 섞인 줄을 0.98로 세면 한 줄짜리 날짜가 두 줄로 세어지고,
      // 매체 값만 믿으면 이미지 옆 좁은 열(PC팝업 550×400)에서 실제로는 더 많이 접혀 상세 3줄 규정을 넘긴다
      const perLine = Math.min(detailSlot.maxCharsPerLine ?? Infinity, Math.max(6, Math.floor(detailW / (fs * 0.9))));
      const narrow = perLine <= 12;
      const lines = []; let used = 0, skipped = 0;
      for (const d of cands0) {
        const inline = `${d.label} : ${d.value}`;
        // 넓은 지면은 라벨 뒤에 값이 이어지고 길면 다음 줄로 흐른다(세아제강 "모집직무 : 인사, 연구개발, 전기, / 에너지…"). 좁은 띠는 라벨 줄 + 값 줄(도레이·PT코리아)
        // 틀(mold)은 칸 폭이 정확하므로 글자수 어림 대신 글꼴 폭으로 센다 — 「접수기간 ㅣ 9.22(월) - 10.12(일)」(M메인 24px·칸 457)은 한 줄인데 글자수(27자 > 21)로는 두 줄로 세어 모집직무가 떨어졌다(10-15)
        const widthRows = t => Math.max(1, Math.ceil(textWidth(t) * fs * 1.02 / Math.max(1, detailW)));
        const inlineRows = mold ? widthRows(`${d.label}${mold.rows?.detail?.labelSep ?? ' :'} ${d.value}`) : estimateLines(inline, perLine, counting);
        const useInline = (stackTags || mold?.rows?.detail?.labelRow) ? false : (inlineRows <= 1 || !narrow);   // 틀이 라벨 줄 + 값 줄이면(자소설 채용공고 세아 「모집일정」/날짜) 항상 쌓는다
        const valTxt = stackTags ? String(d.value).split(/\s*,\s*/).filter(Boolean).join('ㅣ') : d.value;   // 쉼표로만 나눈다 — 「경영·제품·사업 분야」 가운뎃점 묶음은 한 항목(A5)
        const valRows = mold ? widthRows(String(d.value)) : (stackTags && detailSlot.maxCharsPerLine == null) ? Math.max(1, Math.ceil(textWidth(valTxt) * fs * 1.02 / Math.max(1, detailW))) : estimateLines(d.value, perLine, counting);
        const needed = useInline ? inlineRows : 1 + valRows;
        if (used + needed > cap) { skipped++; continue; }
        lines.push({ label: d.label, value: d.value, inline: useInline, rows: needed });
        used += needed;
      }
      return { lines, skipped };
    };
    const gMax = guide?.detailPx?.max ?? Infinity, gMin = guide?.detailPx?.min ?? null;
    let fs = Math.min(gMax, detailFs ?? Math.round((useRef ? L.detail : capMain * 0.5)));
    let r = fit(fs);
    // 가이드 매체(구글)는 접수기간·모집부문 둘 다 템플릿 칩이다 — 줄이 모자라면 줄을 빼기 전에 글자를 하한까지 줄여 본다
    if (gMin != null && detailFs == null) {
      let best = { fs, r };
      while (r.skipped && fs > gMin) { fs = Math.max(gMin, Math.round(fs * 0.9)); r = fit(fs); if (r.skipped < best.r.skipped) best = { fs, r }; }
      ({ fs, r } = r.skipped <= best.r.skipped ? { fs, r } : best);
      detailFsFit = fs;
    }
    detailLines.push(...r.lines);
  }

  // 매체 글자 크기 띠가 레이아웃 메인보다 작으면(블라인드 56 < 75) 서브·상세도 같은 비율로 — 메인만 줄면 서브가 메인만 해진다
  const kRange = (useRef && fsRange?.max != null && L.main) ? Math.min(1, fsRange.max / L.main) : 1;
  const sizesAt = k => {
    const cap = Math.max(floorMain, Math.round(capMain * k));
    // 가이드가 서브·상세 글자 상한을 정하면(구글 서브 ≤20 · 상세 13~16) 레퍼런스 비례값(리멤버 가로형 상세 = 메인의 62%)보다 우선 — 메인만 크고 나머지는 작게
    const subFs = Math.min(guide?.subPx ? Math.min(guide.subPx.max, Math.max(12, Math.round(w * 0.055))) : Infinity, stated.sub ?? Math.max(9, Math.round((useRef ? L.sub * kRange : capMain * (subAbove ? 0.62 : 0.5)) * k)));
    const smallFs = stated.date ?? (useRef && L.shape === 'wide' ? subFs : Math.max(8, Math.round(subFs * 0.88)));   // 매체가 날짜 줄 크기를 밝혔으면(자소설 달력 마감일 32/2배 → 16) 그대로 — 예전엔 9px 로 떨어졌다
    const dFs = detailFs ?? Math.min(guide?.detailPx?.max ?? Infinity, Math.max(8, Math.round((detailFsFit ?? (useRef ? L.detail * kRange : cap * 0.5)) * k)));
    const noticeFs = Math.max(8, Math.round(subFs * 0.7));
    const ctaFs = Math.max(10, Math.round(cap * 0.5));
    if (fsRange) {   // 매체 글자 크기 띠(블라인드 32~56)도 모든 글자에 걸린다
      const c = v => Math.min(fsRange.max ?? v, Math.max(fsRange.min ?? 0, v));
      return { cap, subFs: c(subFs), smallFs: c(smallFs), dFs: c(dFs), noticeFs, ctaFs: c(ctaFs), logoH: strip ? Math.min(22, Math.round(innerH * 0.5)) : Math.round(Math.min(40, Math.max(14, S * 0.07)) * k) };
    }
    if (th && useRef) {   // 매체 글자 높이 규정은 메인만이 아니라 모든 글자에 걸린다
      const c = v => Math.min(th.max ?? v, Math.max(th.min ?? 0, v));
      return { cap, subFs: c(subFs), smallFs: c(smallFs), dFs: c(dFs), noticeFs: c(noticeFs), ctaFs: c(ctaFs), logoH: strip ? Math.min(22, Math.round(innerH * 0.5)) : Math.round(Math.min(40, Math.max(14, S * 0.07)) * k) };
    }
    const logoH = strip ? Math.min(22, Math.round(innerH * 0.5)) : Math.round(Math.min(40, Math.max(14, S * 0.07)) * k);
    return { cap, subFs, smallFs, dFs, noticeFs, ctaFs, logoH };
  };
  const dLine = useRef ? (guide?.detailLineHeight ?? L.detailLine) : 1.65;
  const detailGap = z => useRef ? Math.round(z.cap * (guide?.gapDetail ?? L.gapDetail)) : Math.round(z.cap * 0.9);
  const subGap = z => useRef ? Math.round(z.subFs * L.gapSub) : Math.round(z.subFs * (subAbove ? 0.55 : 0.5));
  // 가로형은 상세 항목들이 한 행에 이어 흐르므로(일화 970 접수기간·모집부문 한 줄) 항목별 줄 수를 더하지 않고 전체 글자수로 센다
  const detailRows = z => {
    const rows = detailLines.reduce((n, d) => n + d.rows, 0);
    if (!(useRef && (L.shape === 'wide' || gv?.detailFlow === 'row') && detailLines.every(d => d.inline))) return rows;
    const perLine = Math.max(6, Math.floor(detailW / (z.dFs * 0.9)));
    return Math.max(1, Math.min(rows, Math.ceil(detailLines.reduce((n, d) => n + countChars(`${d.label} : ${d.value}`, counting) + 3, 0) / perLine)));
  };
  // 칩 줄 사이 숨 — 칩(알약) 높이가 글줄 높이와 거의 같아 줄 간격 1.45로는 알약끼리 붙는다(10-06 사용자 "태그들이 너무 붙어 있어"). 예시(일화 580·비씨 300×600)는 칩 줄 사이가 글자 높이의 절반쯤
  const chipRowGap = z => (guide?.detailLabels === 'chip' ? Math.round(z.dFs * 0.5) : 0);
  // 한 행 흐름(구글 970 칩 2개가 한 줄)이면 줄 사이 숨은 높이에 안 들어간다 — 더하면 메인 예산이 줄어 두 줄 시즌이 떨어진다(동부 970 회귀)
  const rowFlowNow = () => useRef && (L.shape === 'wide' || gv?.detailFlow === 'row') && detailLines.every(d => d.inline);
  const detailBlockH = z => {
    const lineH = Math.round(z.dFs * dLine);
    // 태그 쌓기: 항목마다 알약 한 줄(알약 글자 .86 × 줄높이 1.5 + 아래 숨 .5) + 값 줄 — 글줄 수로만 세면 15%쯤 모자라 글자가 눌려 잘린다(인스타 스토리 1080×1920 여우)
    if (stackTags) {
      const chipH = Math.round(z.dFs * 0.86 * 1.5) + Math.round(z.dFs * 0.5);
      return detailLines.reduce((n, d) => n + chipH + Math.max(1, d.rows - 1) * lineH, 0) + Math.max(0, detailLines.length - 1) * chipRowGap(z) + (detailLines.length ? detailGap(z) : 0);
    }
    return detailRows(z) * lineH + (rowFlowNow() ? 0 : Math.max(0, detailLines.length - 1) * chipRowGap(z)) + (detailLines.length ? detailGap(z) : 0);
  };
  // 로고: 레퍼런스 세로형은 우상단, 세로 띠는 위 가운데에 따로 놓는다(글자 흐름 밖). 가로형 레퍼런스에는 로고가 없다 — 매체가 요구할 때만.
  const logoRequired = (rules.logo?.count ?? 0) >= 1;
  const absLogo = useRef && allowLogo && logoSrc && !tLogo && logoPlace !== 'none' && !logoAsObject;
  const flexLogo = allowLogo && logoSrc && !tLogo && !logoAsObject && (strip ? innerH >= 70 : useRef ? (logoPlace === 'none' && logoRequired) : true);   // 50px 띠에는 로고 자리가 없다
  const blocksOf = z => (flexLogo && !strip ? z.logoH + Math.round(z.logoH * 0.7) : 0)
    + (want.advertiser ? Math.round(z.smallFs * 1.3) + 4 : 0)
    + (want.sub ? Math.round(z.subFs * (useRef ? L.subLine : line)) + subGap(z) : 0)
    + ((want.date || want.label) ? Math.round(z.smallFs * line) + Math.max(8, Math.round(z.smallFs * 0.5)) : 0)   // metaRow의 margin-top과 같은 값
    + ((imgCorner && hasKv) ? 0 : detailBlockH(z))
    + (want.extra ? Math.round(z.smallFs * line) + 4 : 0)
    + (want.notice ? Math.round(z.noticeFs * line * noticeLines) + 6 : 0)
    + (want.cta && !strip ? Math.round(z.ctaFs * 1.3) + Math.round(z.ctaFs * 0.6) * 2 + 8 : 0);

  let z = sizesAt(1);
  const slackPx = Math.round(h * 0.01);   // 추정과 실제 렌더의 어긋남 여유(1%h) — 예산을 꽉 채우면 몇 px 넘쳐 잘린다
  let titleBudget = textH - blocksOf(z) - slackPx;
  if (titleBudget < z.cap * line) {
    const k = Math.max(0.35, (textH - z.cap * line) / Math.max(1, blocksOf(z)));
    z = sizesAt(k);
    titleBudget = textH - blocksOf(z);
  }
  titleBudget = Math.max(floorMain * line, titleBudget);
  // 위계: 메인은 상세의 1.8배·서브의 1.6배는 돼야 한다(레퍼런스 메인 44 / 상세 13~16 / 서브 ≤20). 상세·서브가 세로 예산을 먹어 메인이 작아지면(1080 메인 45·상세 41 — 납작한 템플릿 티)
  // 상세·서브를 먼저 줄이고 메인을 다시 잰다. 매체가 글자 크기·높이를 정한 경우(stated·textHeightPx)는 건드리지 않는다
  // 가이드가 상세·서브 px를 정한 매체(구글)는 위계도 가이드가 책임진다 — 여기서 상세를 줄이면 970 메인이 커져 시즌이 떨어진다(동부 회귀)
  if (stated.main == null && (!detailFs || sampleSoft.has('detail')) && (!stated.sub || sampleSoft.has('sub')) && !th && !fsRange && !guide?.detailPx) {
    const dMin = 11, sMin = 11, target = Math.min(z.cap, mainCap);
    for (let i = 0; i < 2; i++) {
      const probe = Math.floor(fitFontSize(copy.main, mainW, titleBudget, target, floorMain, mainLine));
      if (probe >= z.dFs * 1.8 && probe >= z.subFs * 1.6) break;
      const want = Math.min(target, Math.round(probe * 1.25));
      z = { ...z, dFs: Math.max(dMin, Math.min(z.dFs, Math.floor(want / 1.9))), subFs: Math.max(sMin, Math.min(z.subFs, Math.floor(want / 1.7))), smallFs: Math.max(sMin, Math.min(z.smallFs, Math.floor(want / 1.9))) };
      titleBudget = Math.max(floorMain * line, textH - blocksOf(z));
    }
  }
  // 블리드 그림 옆 좁은 상세 열(인스타 1080: 폭 253px): 상세 글자가 커서(51px) 날짜가 「9.22(월) - / 10.12(일)」 두 줄로 접힌다(10-08 밤 B4).
  // 항목 값(쌓기면 값 줄, 아니면 「라벨 : 값」)이 한 줄에 들어가는 크기까지 상세를 줄인다 — 하한 짧은 변의 2.6%(1080 → 28px). 하한에서도 안 들어가는 값은 어절에서 접힌다. 매체가 상세 크기를 정하면(자소설) 그대로
  if (bleedP && imgCorner && hasKv && detailLines.length && !detailFs) {
    const txt = d => stackTags ? String(d.value).split(/\s*,\s*/).filter(Boolean).join('ㅣ') : `${d.label} : ${d.value}`;
    const need = Math.max(...detailLines.map(d => textWidth(txt(d)) * 1.04));
    const fsFit = Math.floor(detailW / Math.max(1, need));
    const floorD = Math.max(12, Math.round(Math.min(w, h) * 0.026));
    if (fsFit < z.dFs) z = { ...z, dFs: Math.max(floorD, fsFit) };
  }
  let mainFs = stated.main ?? Math.floor(fitFontSize(copy.main, mainW, titleBudget, Math.min(z.cap, mainCap), floorMain, mainLine));
  // 틀(mold)은 세로 예산이 아니라 틀의 줄 수(PC메인 2줄·채용공고 4줄)가 메인 줄 수 — 일반 예산으로 재면 280px 지면에서 1줄로 깎여 「현대케피코 / 신입채용 (…)」이 떨어진다(10-15)
  let mainLines = mold ? Math.max(1, mainLinesCap ?? 2) : Math.max(1, Math.min(mainLinesCap ?? 99, Math.floor(titleBudget / (mainFs * mainLine))));
  // 가로형에서 글자 블록이 글자 칸 높이의 72%에 못 미치면 세로 가운데 — 위에 붙여 두면 아래가 비어 보인다(970 여우: 메인 1줄 + 칩 1행)
  if (useRef && L.shape === 'wide' && !vCenter && !mainSpan && (blocksOf(z) + Math.round(mainLines * mainFs * mainLine)) < innerH * 0.72) vCenter = true;
  const rePick = pickIn('main', mainW, mainFs, mainLines);
  if (rePick !== copy.main) {
    copy.main = rePick;
    mainFs = stated.main ?? Math.floor(fitFontSize(copy.main, mainW, titleBudget, Math.min(z.cap, mainCap), floorMain, mainLine));
    mainLines = mold ? Math.max(1, mainLinesCap ?? 2) : Math.max(1, Math.min(mainLinesCap ?? 99, Math.floor(titleBudget / (mainFs * mainLine))));
  }
  let towerCopyOnly = false;   // 아래 조립에서 문구 덩어리를 남는 높이의 가운데에(위아래 빈 띠를 반씩)
  // 문구 하나만 허용된 세로 띠(알바몬 스카이 120×600 '카피 한 줄 5자'): 서브·상세가 없어 글자가 한 줄 16px로 남고 띠의 40%가 빈다 —
  // 낱말마다 줄을 나눠 폭을 채우는 크기로(가장 긴 낱말이 한 줄). 줄 수·줄당 글자수 규정 안에서만
  if (L.shape === 'tower' && stated.main == null && !want.sub && !want.date && !want.detail && !detailLines.length) {
    const words = String(copy.main).split(/\s+/).filter(Boolean);
    const longest = Math.max(...words.map(x => countChars(x, counting)));
    const per = slots.main?.maxCharsPerLine ?? Infinity;
    if (words.length > 1 && words.length <= (mainLinesCap ?? 3) && longest <= per) {
      const fs2 = Math.floor(Math.min(textW / (longest * 1.04), titleBudget / (words.length * mainLine), textW / 2.6));
      if (fs2 > mainFs * 1.15) { copy.main = words.join('\n'); mainFs = fs2; mainLines = words.length; towerCopyOnly = true; }
    }
  }
  // 가이드 매체: 폭 기준으론 한 줄에 들어간다고 보고 줄 수를 1로 잡았다가 글자수 기준으론 안 들어가 회사가 떨어진 경우 — 두 줄로 줄여서 정보를 지킨다(일화 970 2줄 37px)
  if (guide?.keepInfo && String(copy.main).replace(/\n/g, ' ') !== preferMain && stated.main == null) {   // 낱말마다 줄을 나눈 같은 문구(세로 띠)는 떨어진 게 아니다
    // 바닥은 지금 실제로 쓸 수 있는 메인 상한(mainCap — 좁은 글자 자리에서 줄어든 값) 기준. 레이아웃 상한(capMain) 기준이면 배경형 1080(자리 폭 430)에서 65px가 필요한 회사명을 71px 바닥이 막는다
    const minFs = Math.max(floorMain, Math.round(Math.min(capMain, mainCap) * guide.keepInfo));
    // 지금 줄 수로 글자만 줄여 보고(카카오 1줄 46→44), 안 되면 두 줄로
    // 세로형·세로 띠는 3·4줄까지 — 샘플 크기(NAP 320×480 38px)를 목표로 잡자 「마이다스 대규모 공개채용」(줄당 6자)이 2줄엔 못 들어가 「채용 공고」로 떨어졌다(10-12 매체별 규격정리)
    const tryLines = [...new Set([mainLines, 2, 3, 4].filter(n => n >= 1 && n <= (mainLinesCap ?? 2)))];
    for (const ln of tryLines) {
      let fs = Math.min(mainCap, Math.floor(titleBudget / (ln * mainLine)));
      while (fs >= minFs && !pickInfo('main', mainW, fs, ln, preferMain).fits) fs = Math.round(fs * 0.94);
      if (fs >= minFs) { copy.main = preferMain; mainFs = fs; mainLines = ln; break; }
    }
  }
  // 채움: 글자 블록 아래가 비면(남는 높이가 지면의 12% 넘음) 그림 자리가 자라서 메운다(최대 55%) — 보드 예시 141장에 비어 보이는 소재는 없다(균형 90·여유 31·빽빽 20)
  let distribute = false;   // 세로 규격: 상세 블록을 글자 영역 바닥(그림 바로 위)으로 내린다
  let splitGap = false;     // 그래도 빈 높이가 지면의 35%를 넘으면 메인 위에도 공간을 나눠 한 덩어리 빈 띠를 둘로(세로 띠 + 가로 긴 누끼 떼)
  let cutBleed = 1.3;       // 아래 띠 누끼가 지면 폭을 넘쳐도 되는 배율(가로 긴 장면 누끼)
  let cutLeft = null;       // 틈 창의 왼쪽 끝(그림 폭 비율) — 있으면 가운데가 아니라 이 위치부터 보여 준다
  if (guide?.fill && objectSide === 'bottom' && !tImage && hasKv && !logoAsObject) {
    // 메인 줄 수는 실제로 접히는 줄로 센다 — 매체 줄 수 상한(NAP 320×480 4줄)을 그대로 세면 한 줄짜리 메인에 세 줄 높이가 비어 그림이 작아지고 글자 아래가 빈다(10-09 figma-dg 단일 사물·연사 빈 띠 28~36%)
    const mainRealLines = copy.main ? Math.max(1, Math.min(mainLines, String(copy.main).split('\n').reduce((n, t) => n + Math.ceil(textWidth(t) * mainFs / Math.max(1, mainW * 0.96)), 0))) : mainLines;
    const used = blocksOf(z) + Math.round(mainRealLines * mainFs * mainLine);
    const slack = textH - used;
    // 세로형·세로 띠는 남는 높이의 90%를 그림에(가로형은 70%) — 글자가 얇은 세로 띠에서 가운데가 비지 않게(300×1050 여우)
    let grow = slack > h * guide.fill.slack ? Math.round(slack * ((L.shape === 'tall' || L.shape === 'tower') ? 0.9 : 0.7)) : 0;
    // 주인공이 폭에 맞춰도 띠보다 키가 크면(두 모서리에 선 3D: 폭 기준 148px, 띠 122px) 남는 높이 안에서 띠를 주인공 키까지 키운다 — 잘린 주인공은 비어 보인다
    const fo = style.kvMeta?.field?.focus, ar = style.kvMeta?.ar;
    if (!isCutout && fo && ar) {
      const subjH = Math.round(w / ar * Math.min(1, fo.h * 1.16));
      const need = subjH - (objH + pad.bottom);
      if (need > 0) grow = Math.max(grow, Math.min(need, Math.max(0, slack - Math.round(h * 0.04))));
    }
    const maxObj = (L.shape === 'tall' || L.shape === 'tower') ? (guide.fill.maxObjectTall ?? guide.fill.maxObject) : guide.fill.maxObject;   // 세로형은 64%까지(캐논) — 가운데가 비는 것보다 그림이 큰 쪽
    const soloChar = isCutout && (() => { const t = kvTypeOf(style.kvMeta); return !!(t?.flags.character && !t.flags.group); })();
    const maxObjEff = soloChar && (L.shape === 'tall' || L.shape === 'tower') ? Math.max(maxObj, 0.72) : maxObj;   // 캐릭터 하나는 세로형에서 72%까지 — 글자 블록 사이가 비는 것보다 캐릭터가 큰 쪽(NAP 320×480 여우 빈 띠 30%)
    grow = Math.min(grow, Math.round(h * maxObjEff) - objH);
    if (grow > 0) { objH += grow; objReserve = Math.round(objH * (1 - overlap)); fired('fill'); }
    TR.fill = { slack: Math.round(slack), grow, maxObj: maxObjEff, used };
    // 세로형·세로 띠에서 그림을 다 키워도 글자 블록 아래가 남으면(6%h 넘게) 상세를 그림 바로 위로 내린다 — 레퍼런스(동부 300×1050 모집분야가 그림 위에 붙음). 가운데가 비어 보이지 않게
    if ((L.shape === 'tall' || L.shape === 'tower') && slack - Math.max(0, grow) > h * 0.06) distribute = true;
    if (distribute && slack - Math.max(0, grow) > h * 0.35) splitGap = true;
    // 가로로 긴 누끼(건물)는 세로 띠를 못 채운다 — 폭 130%까지 키워(좌우가 지면 밖으로) 닿는 높이만 그림에 주고 나머지는 글자 영역으로, 상세는 그림 바로 위로(케이스 장부 동부 300×1050: 빈 띠 49%)
    // 단일 사물 누끼: 아래 띠도 우하단 블리드 — 글자 블록 아래·그림 상한(64%·72%) 위를 경계로, 오른쪽·아래로만 잘린다(왼쪽은 지면 안). 캐릭터·떼는 아래 기존 문법(soloOk·틈 창)
    const yText = pad.top + used + 12;
    // 좁은 세로 띠(폭 ≤ 320, CANON objectBleed.narrow)는 좌우 양쪽 + 아래로(디자이너 GDN 300×600·300×1050 LRB)
    // 가로로 아주 긴 단일 사물(비율 ≥ 1.8 — 돔 와이어프레임 2.14)은 폭이 넓은 세로형에서도 좌우 양쪽으로 — 오른쪽·아래만이면 폭에 막혀 작게 바닥에 깔리고 위가 빈다(10-09 figma-dg: NAP 320×480·인스타 스토리·알바몬 보드 빈 띠 28~31% → 0).
    // 정사각은 되돌림 — 성긴 와이어프레임(밀도 0.27)은 면적 목표를 채우려 지나치게 커져 인스타 1080 상세 글자와 22% 겹쳤고, 에브리타임 288 빈 띠는 그대로였다
    const symB = !!(guide.objectBleed?.narrow && (L.shape === 'tall' || L.shape === 'tower') && (w <= guide.objectBleed.narrow.maxW || (style.kvMeta?.ar ?? 1) >= 1.8));
    if (singleObj && isCutout && ar && (L.shape === 'tall' || L.shape === 'tower' || L.shape === 'square') && (bleedP = bleedAt(0, Math.max(Math.round(h * (1 - maxObjEff)), yText), symB))) {
      objH = Math.max(Math.round(h * 0.1), h - bleedP.top - pad.bottom); objReserve = objH; distribute = true;
      // 오른쪽·아래로만 흘리면 좁은 세로 띠(300×1050)에선 그림이 목표 면적에 못 닿는다 — 남는 높이가 20%를 넘으면 메인 위에도 나눠 한 덩어리 빈 띠를 둘로
      if ((innerH - objReserve - 12) - used > h * 0.2) splitGap = true;
    }
    else if (isCutout && ar && (L.shape === 'tall' || L.shape === 'tower' || L.shape === 'square')) {
      // 폭 배율 후보 1.0 → 1.3 → 1.5 → 1.8 → 2.2. 좌우 자르기 선이 캐릭터 얼굴·몸통을 가르면 안 되므로(ABL 떼) 그 선의 열이 투명 75% 이상(캐릭터 사이 틈)인 배율만 허용 —
      // 장면 누끼(건물)는 cols가 성글어 대개 통과. 허용된 것 중 글자 영역의 빈 띠가 지면의 28% 아래로 떨어지는 가장 작은 값, 없으면 허용된 최대값. 정사각 규격(에브리타임 288·인스타 1080)도 같은 문법
      const colsC = style.kvMeta?.field?.cols;
      const cutOk = kk => { if (kk <= 1.001) return true; if (!colsC?.length) return true; const f = (1 - 1 / kk) / 2; const at = t => colsC[Math.min(colsC.length - 1, Math.max(0, Math.round(t * (colsC.length - 1))))]?.bg ?? 1; return at(f) >= 0.75 && at(1 - f) >= 0.75; };   // 75%: 캐릭터 사이 틈(ABL 79~87%)은 통과, 몸통 가장자리(59~61%)는 막는다
      // 캐릭터 하나(떼 아님)는 틈이 없어 위 규칙으론 늘 1배 — 세로 띠에서 발밑만 차지하고 위가 빈다(여우·동서 모델 120×600 빈 띠 36~44%).
      // 디자이너는 한 캐릭터를 지면 좌우 밖으로 흘린다(bleed). 얼굴·몸통 중심을 지키는 선: 주인공 상자 가운데 70%는 보이게 — 꼬리·팔 끝·반짝이만 잘린다
      const kvT = kvTypeOf(style.kvMeta), foC = style.kvMeta?.field?.focus;
      const soloOk = kk => { if (!(kvT?.flags.character && !kvT.flags.group && foC)) return false; const f = (1 - 1 / kk) / 2; return f <= foC.x - foC.w * 0.35 + 1e-6 && 1 - f >= foC.x + foC.w * 0.35 - 1e-6; };
      const cutOk2 = kk => cutOk(kk) || soloOk(kk);
      // 띠가 28% 아래로 떨어지려면 배율이 얼마나 필요한가 → 틈 창(cutWindow)이 있으면 그 창, 없으면 가운데 맞춤 배율 목록
      const kNeed = (() => { for (const kk of [1, 1.3, 1.5, 1.8, 2.2]) if ((innerH - (Math.round(w * kk / ar) - pad.bottom) - 12) - used <= h * 0.28) return kk; return 2.2; })();
      // 틈 창 배율은 그림이 지면 높이의 45%는 되게 — 글자 예산(used)은 나중에 빠지는 상세 줄까지 세서 크게 잡힌다(NAP 320×480 ABL 떼: 1.33배 → 띠 49%)
      const kWin = Math.min(2.4, Math.max(kNeed, (h * 0.45 + pad.bottom) * ar / w));
      const win = kWin > 1.05 ? cutWindow(colsC, kWin) : null;
      let k, fitH;
      if (win) { k = win.k; fitH = Math.round(w * k / ar) - pad.bottom; cutLeft = win.left; }
      else {
        const allowed = [1, 1.3, 1.5, 1.8, 2.2].filter(cutOk2);
        k = allowed[0]; fitH = Math.round(w * k / ar) - pad.bottom;
        for (const kk of allowed) { const fh = Math.round(w * kk / ar) - pad.bottom; k = kk; fitH = fh; if ((innerH - fh - 12) - used <= h * 0.28) break; }
      }
      // 캐릭터 하나: 틈 창(투명 가장자리만 걷어 낸 1.2배 남짓)보다 얼굴을 지키는 흘림 배율이 크면 그쪽 — 가운데 맞춤
      const solo = [1.3, 1.5, 1.8, 2.2].filter(soloOk);
      if (solo.length && solo[solo.length - 1] > k) {
        for (const kk of solo) { k = kk; fitH = Math.round(w * kk / ar) - pad.bottom; if ((innerH - fitH - 12) - used <= h * 0.28) break; }
        cutLeft = null;
      }
      if (fitH < objH) { objH = Math.max(Math.round(h * 0.1), fitH); objReserve = objH; distribute = true; cutBleed = k; }   // 띠 = 누끼 키 → 겹칠 빈 부분이 없다
      if (distribute && (innerH - objReserve - 12) - used > h * 0.35) splitGap = true;
    }
  }
  // 편집 「키비주얼 크기」(아래 띠): 자동 크기(빈 곳 채우기까지 한 뒤) × 배율 — 그림 높이 상한(CANON fill.maxObject 55%·세로형 64%, 캐릭터 72%) 안. 블리드는 위 bleedCfg 가 맡는다
  if (kvK !== 1 && objectSide === 'bottom' && !logoAsObject && !tImage && !bleedP) {
    const maxO = (L.shape === 'tall' || L.shape === 'tower') ? Math.max(guide?.fill?.maxObjectTall ?? guide?.fill?.maxObject ?? 0.64, isCutout ? 0.72 : 0) : (guide?.fill?.maxObject ?? 0.55);
    const full = objReserve === objH;
    objH = Math.round(Math.max(h * 0.12, Math.min(h * maxO, objH * kvK)));
    objReserve = full ? objH : Math.round(objH * (1 - overlap));
  }
  // 자리의 글자 쪽 변이 그림 한가운데 걸리면(주인공으로 당겼거나 그림이 자리보다 길어서) 그 줄의 바탕색으로 지면을 잇는다 — 흰 글로우 바탕이 연파랑 지면 위에 네모로 뜨지 않게
  if (field && hasKv && !isCutout && !photoFull && !tImage && !oBox && (objectSide === 'bottom' || objectSide === 'right')) {
    const P = objectSide === 'bottom'
      ? kvPlacement(style, field, { side: 'bottom', w, h, size: objH, edgePad: pad.bottom })
      : kvPlacement(style, field, { side: 'right', w, h, size: objW, edgePad: pad.right, inset: edgeSolid ? pad.right : 0 });
    // 그림의 변 그대로 닿아도(joinFrac 0) 그 변의 바탕색이 지면과 다르면 잇는다 — 같으면 joinField가 그대로 둔다
    field = joinField(field, joinColour(style, P.joinFrac, objectSide === 'bottom' ? 'rows' : 'cols'), objectSide);
  }
  // 메인 칸으로 셀 것은 이름이 메인·타이틀인 행뿐이다 — "혜택 강조카피"·"카피 전체 줄 수"는 메인 두 줄이 아니다(카카오 비즈보드)
  const mainRows = inLimits.filter(t => roleOf(t.field) === 'main' && /메인|타이틀|제목|대문구/.test(String(t.field)) && !/전체/.test(String(t.field)));
  const mainRowLines = mainRows.length ? mainRows.reduce((n, t) => n + (t.lines ?? 1), 0) : L.mainLines;
  // 가이드 매체(구글)는 keepInfo·twoLines가 줄 나눔을 맡는다 — 이 짝 규칙(리멤버 안랩·삼진)은 시즌을 떨어뜨린다
  if (useRef && !mold && L.shape === 'wide' && L.mainLines >= 2 && mainRowLines >= 2 && (mainLinesCap ?? 2) >= 2 && ctx.kind === 'recruit' && core.client && !guide?.seasonInMain) {   // 틀(mold)은 사다리의 「회사 / 채용구분」 후보가 이미 앞에 있다(10-15) — 세로 예산 짝 규칙이 「현대케피코 / 채용」으로 깎지 않게
    const per = slots.main?.maxCharsPerLine ?? null, total = slots.main?.maxChars ?? null;
    // 안랩 "AhnLab / 신입/경력 채용" · 삼진제약 "2026년 / 삼진제약 부문별 채용" — 시즌을 적어 줬으면 시즌이 첫 줄
    const hireTxt = hireOf(core.hiringType || core.employType);
    const pairs = [core.season ? [core.season, `${core.client} ${hireTxt}`] : null, [core.client, hireTxt], [core.client, core.role && `${core.role} 채용`], [core.client, '채용']]
      .filter(p => p && p[1]);
    const fsFor = pr => Math.min(z.cap, Math.floor(textW / Math.max(...pr.map(t => textWidth(t) * 1.02))), Math.floor(titleBudget / (2 * mainLine)));
    const ok = pr => pr.every(t => per == null || countChars(t, counting) <= per)
      && (total == null || countChars(pr.join(''), counting) <= total) && fsFor(pr) >= Math.max(floorMain, Math.round(z.cap * 0.8));
    const pr = pairs.find(ok);
    if (pr) { copy.main = pr.join('\n'); mainFs = stated.main ?? fsFor(pr); mainLines = 2; }
  }
  // 세로형 메인이 "회사 + 채용구분"으로 두 줄이 되면 회사 뒤에서 줄을 바꾼다(세아제강 "세아제강 / 신입/경력사원 채용") — 균형 줄바꿈이 "신입/"에서 끊는 것을 막는다
  if (useRef && (L.shape === 'tall' || L.shape === 'square') && ctx.kind === 'recruit' && core.client && mainLines >= 2 && !copy.main.includes('\n')) {
    const hireTxt = hireOf(core.hiringType || core.employType);
    // 채용구분이 한 줄에 안 들어가면 나누지 않는다 — 「한샘 / 리모델링 디자이너 영업직 / 채용」 세 줄이 두 줄 칸에서 말줄임(…)으로 잘렸다(10-14 t1014 한샘 2/2, 디자이너 「한샘 리모델링 디자이너 / 영업직 채용」)
    if (copy.main === `${core.client} ${hireTxt}` && textWidth(copy.main) * mainFs > textW && (textWidth(hireTxt) * mainFs * 1.02 <= textW || mainLines >= 3)) copy.main = `${core.client}\n${hireTxt}`;
  }
  // 가이드 매체(구글): 한 줄에 넣느라 글자가 작아졌으면(일화 580 35px) 예시처럼 회사 뒤에서 두 줄로 나눠 크게 쓴다(10/10 두 줄)
  // 모서리 상자 레이아웃(구글 580·누끼 정사각)에선 한 줄이 글자 칸의 70%를 넘으면 두 줄로 — 코엑스 카드 '코엑스 / 신입사원 채용'처럼 덩어리가 크고 오브젝트와 겹치지 않는다
  const longLine = (gCorner || cutCorner) && textWidth(copy.main) * mainFs > textW * 0.7;
  if (guide?.twoLines && !copy.main.includes('\n') && (mainLinesCap ?? 2) >= 2 && stated.main == null && (mainFs < capMain || longLine)) {
    const txt = copy.main; let at = -1;
    if (core.client && txt.includes(core.client)) at = txt.indexOf(core.client) + core.client.length;
    // 회사 뒤에서 못 나누면 가운데 띄어쓰기에서 — 단 짧은 문구(9자 이하 "정규직 채용")는 나누지 않는다. "정규직 / 채용" 두 줄은 덩어리가 아니라 부자연스러운 줄바꿈이다
    if ((at <= 0 || at >= txt.length - 1) && txt.length > 9) {
      const sp = [...txt].map((ch, i) => (ch === ' ' ? i : -1)).filter(i => i > 0);
      at = sp.length ? sp.reduce((b, i) => (Math.abs(i - txt.length / 2) < Math.abs(b - txt.length / 2) ? i : b), sp[0]) : -1;
    } else if (at <= 0 || at >= txt.length - 1) at = -1;
    if (at > 0) {
      const pr = [txt.slice(0, at).trim(), txt.slice(at).trim()].filter(Boolean);
      if (pr.length === 2) {
        const fs2 = Math.min(capMain, Math.floor(textW / Math.max(...pr.map(t => textWidth(t) * 1.02))), Math.floor(titleBudget / (2 * mainLine)));
        if (fs2 >= Math.round(mainFs * 0.92)) { copy.main = pr.join('\n'); mainFs = fs2; mainLines = 2; }   // 두 줄이 조금 작아도 덩어리가 커 보인다(일화 580: 한 줄 39 vs 두 줄 37)
      }
    }
  }
  // 정사각 단일 사물 블리드의 위 경계(48%)는 글자가 길 때(인스타 1080) 값이다 — 메인 한 줄뿐인 작은 카드(에브리타임 288 「정규직 채용」)는 글자와 그림 사이가 34% 빈다.
  // 글자 덩어리가 짧으면(그 아래 그림까지 지면 12% 넘게 빔) 경계를 글자 바로 아래(+4%)로 올려 다시 놓는다 — 그림이 위로 자라 빈 띠를 메운다(10-08 밤 B1, dongbu_illust).
  // 그림 옆 열로 가는 꼬리(상세·부가·고지)가 있으면 그 열 폭이 지금 그림에 맞춰져 있으므로 건드리지 않는다
  if (cutCorner && singleObj && bleedP && !detailLines.length && !want.extra && !want.notice && !want.cta) {
    const flat = String(copy.main).split('\n');
    const lnUsed = Math.min(mainLines, flat.reduce((n, t) => n + Math.max(1, Math.ceil(textWidth(t) * mainFs * 1.04 / Math.max(1, textW))), 0));
    const textBottom = pad.top + blocksOf(z) + Math.round(lnUsed * mainFs * mainLine);
    const gap = Math.max(12, Math.round(h * 0.04));
    if (bleedP.top - (textBottom + gap) > h * 0.12) {
      const p2 = bleedAt(Math.round(w * 0.3), textBottom + gap);
      if (p2 && p2.top < bleedP.top) { bleedP = p2; tImage = { x: p2.left, y: p2.top, w: w - p2.left, h: h - p2.top }; }
    }
  }
  // 개발용 들여다보기(Node에서만: globalThis.__adDebug = info => …)
  // 메인 줄 넘침 막기(10-09 데스크탑): 「2026 하반기 한국산업단지공단 정규직 채용」처럼 회사명이 길면(8자) 두 줄 나누기가 글자를 8% 넘게 줄여 버려지고,
  // 균형 줄바꿈이 세 줄을 만들어 두 줄 상한(line-clamp)에 「정규직…」으로 잘렸다(GDN 580×400 3건 · 자동 검수는 못 봄). 어절 단위로 줄을 어림해 상한을 넘으면
  // 정보 우선(CANON keepInfo 75%)까지 글자를 줄인다 — 그래도 넘으면 회사 뒤에서 두 줄로 나눈 쪽을 쓴다
  if (copy.main && mainLines >= 1 && stated.main == null) {
    const spW = textWidth(' ');
    const linesOf = (t, fs) => { let n = 1, cur = 0; for (const wd of String(t).split(' ')) { const ww = textWidth(wd) * fs * 1.04; if (cur > 0 && cur + spW * fs + ww > mainW) { n++; cur = ww; } else cur += (cur > 0 ? spW * fs : 0) + ww; } return n; };
    const need = (txt, fs) => String(txt).split('\n').reduce((n, t) => n + linesOf(t, fs), 0);
    if (need(copy.main, mainFs) > mainLines) {
      const floorFs = Math.round(mainFs * (guide?.keepInfo ?? 0.75));
      let fs = mainFs; while (fs > floorFs && need(copy.main, fs) > mainLines) fs--;
      if (need(copy.main, fs) <= mainLines) mainFs = fs;
      else if (core.client && !copy.main.includes('\n') && copy.main.includes(core.client) && mainLines >= 2) {
        const at = copy.main.indexOf(core.client) + core.client.length; const pr = [copy.main.slice(0, at).trim(), copy.main.slice(at).trim()].filter(Boolean);
        if (pr.length === 2) { let f2 = mainFs; while (f2 > floorFs && need(pr.join('\n'), f2) > mainLines) f2--; copy.main = pr.join('\n'); mainFs = f2; }
      }
    }
  }
  // 겹침 교정 사다리 ② 줄바꿈: 메인을 회사명 뒤(없으면 폭이 비슷한 어절)에서 두 줄로 — 줄 수 상한 안에서, 글자 바닥(floorMain) 위에서만
  if (FIX?.wrap && !mold && stated.main == null && !String(copy.main).includes('\n') && (mainLinesCap ?? 2) >= 2) {
    const words = String(copy.main).split(' ').filter(Boolean);
    if (words.length >= 2) {
      let cutAt = -1;
      if (core.client && String(copy.main).startsWith(core.client + ' ')) cutAt = core.client.split(' ').length;
      else { let bd = Infinity; for (let i = 1; i < words.length; i++) { const d = Math.abs(textWidth(words.slice(0, i).join(' ')) - textWidth(words.slice(i).join(' '))); if (d < bd) { bd = d; cutAt = i; } } }
      const pr = cutAt > 0 ? [words.slice(0, cutAt).join(' '), words.slice(cutAt).join(' ')].filter(Boolean) : [];
      if (pr.length === 2) { const fs2 = Math.min(mainFs, Math.floor(mainW / (Math.max(...pr.map(t => textWidth(t))) * 1.04)), Math.floor(titleBudget / (2 * mainLine))); if (fs2 >= floorMain) { copy.main = pr.join('\n'); mainFs = fs2; mainLines = 2; fired('overlapFix.wrap'); } }
    }
  }
  // 겹침 교정 사다리 ① 글자 줄이기: 메인·서브·상세를 배율만큼(바닥 floorMain·10px) — 틀은 아래 mold 블록의 pxOf 가 같은 배율을 쓴다
  if (FIX?.textK && FIX.textK < 1 && !mold) {
    if (stated.main == null) mainFs = Math.max(floorMain, Math.round(mainFs * FIX.textK));
    z = { ...z, dFs: Math.max(10, Math.round(z.dFs * FIX.textK)), subFs: Math.max(10, Math.round(z.subFs * FIX.textK)), smallFs: Math.max(10, Math.round(z.smallFs * FIX.textK)) };
    fired('overlapFix.text');
  }
  if (globalThis.__adDebug) globalThis.__adDebug({ spec: spec.id, shape: L.shape, textW, textH, titleBudget, capMain, mainCap, mainFs, mainLines, mainLinesCap, preferMain, main: copy.main, sub: copy.sub, pad: { ...pad }, detailW, details: detailLines.map(d => `${d.label}:${d.rows}`), dFs: z.dFs, subFs: z.subFs, objW, objH, objectSide, tImage });
  TR.place = { shape: L.shape, objectSide, mode: photoFull ? 'full' : frameFull ? 'bg-frame' : textureFull ? 'bg-texture' : roomFull ? 'bg-room' : !hasKv ? 'none' : bleedP ? (bleedP.sym ? 'bleed-sym' : 'bleed') : oBox ? 'box' : (tImage && imgCorner) ? (cutCorner ? 'corner-contain' : cornerFill ? 'corner-cover' : 'corner') : (tImage && imgBottomBand) ? `template-band-${bandMode}` : tImage ? 'template' : objectSide === 'right' ? 'column' : objectSide === 'bottom' ? 'band' : 'none',
    tImage, bleed: bleedP, objW, objH, objReserve, overlap, cutBand, cutBleed, cutLeft, cutWin, distribute, splitGap, pad: { ...pad }, innerW, innerH, textW, mainW, textH, detailW, vCenter, mainSpan, cornerFill, meltCorner, bandMode, edgeSolid, kvCapW: Number.isFinite(cutoutCapW(style)) ? cutoutCapW(style) : null };
  if (bleedP) fired(bleedP.sym ? 'objectBleed.narrow' : 'objectBleed'); if (overlap > 0) fired('objectOverlap'); if (distribute) fired('fill.distribute'); if (cutWin || cutLeft != null) fired('cutWindow'); if (TR.place.kvCapW && bleedP && bleedP.dw >= TR.place.kvCapW - 1) fired('maxUpscale');
  const byWidth = (role, fs, width, measure = textWidth) => {
    const cands = ladder[role] ?? []; if (cands.length < 2) return;
    const slot = slots[role]; if (slot?.lines != null && slot.lines > 1) return;
    const charsOk = c => slot?.maxChars == null || countChars(c, counting) <= slot.maxChars;
    copy[role] = cands.find(c => charsOk(c) && measure(c) * fs <= width) ?? cands.find(charsOk) ?? (role === 'label' ? '' : cands[cands.length - 1]);   // 라벨 칩은 한도를 넘는 문구를 그리지 않는다(잡다 4자, 10-12 전수 검사)
  };
  byWidth('label', z.smallFs, textW * 0.45);
  // 세로 띠의 서브는 두 줄까지 쓴다(도레이 "2025년 하반기 / 도레이첨단소재") — 한 줄 폭으로 자르면 회사가 떨어져 나간다
  const subRows = mold?.rows?.sub?.lines ?? ((useRef && L.shape === 'tower') ? 1.9 : 1);   // 틀은 틀의 서브 줄 수(자소설 채용공고 1줄 — 세아·현대모비스 2/2)
  // mainSpan(카카오 3줄): 슬로건 줄도 글자 열 밖, 블리드 그림 상자의 왼쪽 선까지 쓸 수 있다 — 매체 하한 48px에서 「자소서 없는 간편지원」(456px)이 446px 열에 막혀 시즌으로 바뀌지 않게
  //   폭 = 주인공 상자 왼쪽 선까지(블리드 상자의 왼쪽 위는 비어 있다). 폭 어림(textWidth)이 실제보다 15~20% 넉넉하므로 여기선 0.96 여유를 두지 않는다
  const subW = (mainSpan && bleedP) ? Math.max(textW, Math.round((bleedP.left + Math.max(0, style.kvMeta.field.focus.x - style.kvMeta.field.focus.w / 2) * bleedP.dw - pad.left - Math.round(w * 0.01)) / 0.96)) : textW;
  byWidth('sub', z.subFs, subW * 0.96 * subRows);
  // 날짜 줄은 전체 기간(시작 - 마감)이 샘플 문법이다(10-12 매체별 규격정리: 카카오 한국앤컴퍼니 52px 「9/23(수) ~ 10/5(월)」· NAP 320×480 HS화성 20px 「08.14(금) ~ 08.27(목)」· 블라인드 HS화성 45px · 9월 공채 카카오 48px).
  //   폭은 날짜 전용 자(dateWidth)로 잰다 — textWidth 는 점·괄호·빗금을 0.5em 으로 세어 날짜 문구를 20% 넘게 어림한다(「9.22(월) - 10.12(일)」 10.5em → 실제 8.5em). mainSpan(카카오 3줄)이면 서브처럼 주인공 상자 왼쪽 선까지.
  //   칸이 좁으면 ① 라벨 칩(접수기간)과 한 줄에 못 서면 칩 아래 줄로 내려가 전체 폭을 쓰고(NAP 안랩 2818: 「모집기간」 줄 위, 날짜 줄 아래 — metaRow 가 flex-wrap 으로 받는다),
  //   ② 글자를 줄인다 — 하한은 매체 크기 띠(fsRange·textHeightPx)·샘플 크기의 70%·11px. 매체가 날짜 크기를 숫자로 정한 규격(자소설 달력 16)은 안 줄인다.
  //   ③ 그래도 안 들어가면 byWidth 가 「~마감일」(NAP 320×50 GC녹십자 「~07.01(수)」·자소설 달력 「~02/01」)을 고른다. 9월 공채 규칙 9(날짜를 버리지 않는다)·B3(카카오 3줄)을 지키는 순서.
  const dateWidth = t => [...String(t ?? '')].reduce((acc, ch) => acc + (/[.,:;'|!()\[\]{}\/\-~]/.test(ch) ? 0.3 : textWidth(ch)), 0);
  let dateW = ((mainSpan && bleedP) ? subW : textW) * (want.label ? 0.5 : 1) * 0.9;
  { const full = ladder.date?.[0], wide = ((mainSpan && bleedP) ? subW : textW) * 0.9;
    if (full && want.date && (ladder.date?.length ?? 0) >= 2 && !(slots.date?.lines > 1) && dateWidth(full) * z.smallFs > dateW) {
      if (want.label && dateWidth(full) * z.smallFs <= wide) { dateW = wide; fired('dateWrap'); }
      else if (statedEarly.date == null || sampleSoft.has('date')) {
        const floor = Math.max(11, fsRange?.min ?? 0, th?.min ?? 0, Math.round(z.smallFs * 0.7));
        const need = Math.floor(wide / dateWidth(full));
        if (need >= floor) { z = { ...z, smallFs: need }; dateW = wide; fired('dateShrink'); if (want.label) fired('dateWrap'); }
      }
    } }
  byWidth('date', z.smallFs, dateW, dateWidth);
  byWidth('extra', z.smallFs, textW * 0.96);
  // 서브가 메인에 이미 다 들어 있는 말이면(고객사명 + 채용) 되풀이하지 않는다 — 다른 말이 있으면 그것을, 없으면 비운다
  // 시즌 낱말("2026"·"2026년 하반기")만 빼고 전부 메인에 있으면 되풀이다 — "2026 ㈜한독 신입/경력 공채" 서브 vs "㈜한독 신입/경력 공채" 메인(구글 970). 그러면 서브는 시즌만 남긴다(동서식품 "2026년" 아이브로)
  const seasonWord = wd => /^(?:19|20)\d{2}년?$|^(?:상반기|하반기|\d{1,2}기)$/.test(wd);
  const said = t => { const ws = String(t).split(/\s+/).filter(Boolean); const mainTxt = copy.main.replace(/\n/g, ' '); const rest = ws.filter(wd => !seasonWord(wd)); return rest.length > 0 && rest.every(wd => mainTxt.includes(wd)); };
  if (copy.sub && said(copy.sub)) {
    copy.sub = (ladder.sub ?? []).find(c => !said(c) && (slots.sub?.maxChars == null || countChars(c, counting) <= slots.sub.maxChars) && textWidth(c) * z.subFs <= subW * 0.96 * subRows) ?? '';
  }
  // 메인이 회사를 못 품었으면(글자수 제한 16자·좁은 글자 자리 → "정규직 채용") 서브가 회사를 품는다 — 회사 없는 소재는 없다(세로 띠 도레이·한독 문법과 같다)
  // 단, 「이미지 내 텍스트 N줄」을 메인 + 슬로건 + 날짜로 나눈 규격(reqDate)에 슬로건이 있고 로고가 회사를 보여 주면 둘째 줄은 슬로건이다 — 디자이너 카카오 3줄(10-08 밤 B3)
  const sloganLine = reqDate && !!core.slogan && !!(logoBox && logoSrc && allowLogo);
  if (core.client && slots.sub && !sloganLine && !copy.main.includes(core.client) && !String(copy.sub ?? '').includes(core.client)) {
    const withClient = [...(ladder.subNarrow ?? []), ...(ladder.sub ?? [])].filter(c => String(c).includes(core.client));
    const pick = withClient.find(c => !said(c) && (slots.sub?.maxChars == null || countChars(c, counting) <= slots.sub.maxChars) && textWidth(c) * z.subFs <= textW * 0.96 * subRows);
    if (pick) copy.sub = pick;
  }
  const showSub = want.sub && !!copy.sub;
  const noticeFs = want.notice ? Math.max(8, Math.floor(fitFontSize(copy.notice, textW * 0.92, z.noticeFs * line * noticeLines, Math.min(z.noticeFs, Math.floor(innerW / 14)), 8, line))) : 0;

  // 편집 「그라데이션」 방향(세로·가로·대각) — 지면이 그라데이션이면 각도만 바꾼다(단색이면 resolveField 가 명도 ±5% 두 끝을 만들어 둔다)
  if (ED?.bgGrad && GRAD_ANGLE[ED.bgGrad] && field?.gradient && !photoFull && !roomFull && !textureFull && field.stops.length > 1) { const ang = GRAD_ANGLE[ED.bgGrad]; field = { ...field, angle: ang, css: `linear-gradient(${ang}deg,${field.stops[0]} 0%,${field.stops[field.stops.length - 1]} 100%)` }; if (TR.field) TR.field = { ...TR.field, angle: ang, stops: field.stops }; }
  // 편집 「스크림 세기」(사진 전체형 밖): 글자 쪽에서 시작해 사라지는 지면색 막 — 글자 아래 그림을 진정시킨다
  const scrimEl = (ED?.scrim && ED.scrim !== 'none' && SCRIM_A[ED.scrim] && !photoFull && field && !transparent) ? (() => {
    const a = SCRIM_A[ED.scrim], base = field.stops[0];
    const dir = (roomFull || textureFull) ? scrimDir : objectSide === 'bottom' ? 'to bottom' : mirrorX ? 'to left' : 'to right';
    return `<div data-scrim="${ED.scrim}" style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;background:linear-gradient(${dir},${rgba(base, a)} 0%,${rgba(base, Math.round(a * 0.6 * 100) / 100)} 40%,${rgba(base, 0)} 80%);pointer-events:none"></div>`;
  })() : '';
  // 직접 수정(overrides.layout → style.manualLayout) — 자동 배치가 끝난 뒤 마지막 변형. 그림이 지면 전체(배경형·질감·사진 전체)면 키비주얼은 못 옮긴다
  const MAN = ED?.manual ?? null;
  const kvBg = photoFull || roomFull || textureFull;
  const kvFixed = !!(TR.gate?.template || oBox);   // 매체 템플릿 그림 칸·오브젝트 상자는 매체 규정 — 직접 수정으로도 안 옮긴다
  const manKv = MAN?.kv && !kvBg && !kvFixed ? MAN.kv : null;
  const manLogo = MAN?.logo ?? null;
  // 로고 직접 수정 — 캔버스 크기 투명 층으로 감싸 변형 원점을 캔버스 좌표로(로고 칸 자신의 원점이면 오른쪽 붙임 칸에서 어긋난다)
  const logoWrap = html => (manLogo && html) ? `<div data-edit="logo" style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;${transformCss(manLogo, w, h)}pointer-events:none">${html}</div>` : html;
  const kvWrap = html => (manKv && html) ? `<div data-edit="kv" style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;${transformCss(manKv, w, h)}pointer-events:none">${html}</div>` : html;
  // 왼쪽(mirrorX): 오른쪽 열 그림 층을 좌우로 옮긴다 — 붙는 변(right→left)·녹임 방향(to right→to left)·누끼 붙이는 쪽 낱말만 바꾼다. 보이는 그림 창(크기·위치 %·px)은 그대로
  const mirrorLayer = html => !mirrorX || !html ? html : html.replace(/(<div data-object="[^"]*"[^>]*?style=")([^"]*)"/, (m0, a0, st) => a0 + st.replace(/(^|;)right:/, '$1left:').replace(/to right/g, 'to left').replace(/(background:url\('[^']*'\)\s*)([^\/;]*)\//, (m1, b0, pos) => b0 + pos.replace(/\b(left|right)\b/g, x => (x === 'left' ? 'right' : 'left')) + '/') + '"').replace(/data-melt-dir="to right"/g, 'data-melt-dir="to left"');
  const textOff = MAN?.text ? `left:${Math.round(MAN.text.dx * w * 10) / 10}px;top:${Math.round(MAN.text.dy * h * 10) / 10}px;` : '';
  const anchorJ = ED?.textAnchor ? { top: 'flex-start', center: 'center', bottom: 'flex-end' }[ED.textAnchor] : null;
  // 가이드 배치 규칙(10-14 place.*): 자동 배치가 글자에 비워 둔 칸·시작선·로고 자리를 추적에 남긴다 — 프리셋(위치·정렬)이 다 걸린 뒤, 직접 수정(manual) 전 값. 그림엔 영향 없음.
  //   col = 글자 열(flex 자식) 네모(캔버스 px, 렌더러 어림 — 실측은 core/guidemeasure.js 가 [data-text-col] 에서 잰다) · cut = 우하단 그림 상자(그 안은 상세 열 detailW 만 글자 칸)
  //   align = 가로 정렬(left·center) · v = 세로 정렬(top·center·bottom·distribute) · margin = 시작선(왼쪽·위 여백)
  {
    const gapX = Math.round(innerW * 0.04);
    const colW = objectSide === 'right' ? innerW - objW - gapX : innerW;
    const col = strip ? null : objectSide === 'bottom'
      ? { x: pad.left, y: pad.top, w: innerW, h: Math.max(0, innerH - objReserve - 12) }
      : { x: mirrorX ? w - pad.left - colW : pad.left, y: pad.top, w: colW, h: innerH };
    const v = anchorJ ? ED.textAnchor : distribute ? 'distribute' : (useRef ? vCenter : tall && objectSide === 'none') ? 'center' : strip ? 'center' : 'top';
    // 글자 덩어리 어림 상자(겹침 교정 overlapFix 가 읽는다): 메인 줄마다 폭(textWidth×크기×1.04)·높이(줄 피치), 나머지 블록(서브·날짜·상세·칩)은 한 덩어리. 세로 자리는 v, 가로 자리는 align
    if (col && copy.main) {
      const lh = Math.round(mainFs * mainLine), mains = String(copy.main).split('\n').map(t => ({ w: Math.min(col.w, Math.round(textWidth(t) * mainFs * 1.04)), h: lh }));
      const rest = { w: Math.min(col.w, Math.round(Math.max(detailW ?? col.w, textW * 0.5))), h: Math.max(0, Math.round(blocksOf(z))) };
      const H = mains.reduce((s, r) => s + r.h, 0) + rest.h;
      const y0 = v === 'center' ? col.y + Math.max(0, (col.h - H) / 2) : v === 'bottom' ? col.y + Math.max(0, col.h - H) : col.y;
      const xOf = rw => align === 'center' ? col.x + (col.w - rw) / 2 : align === 'right' ? col.x + col.w - rw : col.x;
      let yy = y0; const rows = [];
      for (const r of mains) { rows.push({ role: 'main', x: Math.round(xOf(r.w)), y: Math.round(yy), w: r.w, h: r.h }); yy += r.h; }
      if (rest.h > 0) rows.push({ role: 'rest', x: Math.round(xOf(rest.w)), y: Math.round(v === 'distribute' ? col.y + col.h - rest.h : yy), w: rest.w, h: rest.h });
      TR.textBox = { v, align, rows };
    }
    TR.place.zone = { col, cut: (imgCorner && hasKv && tImage) ? { ...tImage } : null, detailW: (imgCorner && hasKv) ? detailW : null, spanW: Math.max(textW, mainW ?? 0, subW ?? 0), room: roomFull?.room ? { ...roomFull.room } : null, objTop: objectSide === 'bottom' ? h - pad.bottom - objReserve : null, side: objectSide === 'right' ? (mirrorX ? 'left' : 'right') : objectSide, align, v, margin: { left: mirrorX ? w - pad.left - colW : pad.left, top: pad.top, right: pad.right, bottom: pad.bottom } };
  }
  if (ED) {
    const presets = Object.fromEntries(Object.entries(ED).filter(([k]) => k !== 'manual'));
    TR.edit = { presets, place: EP, mirror: mirrorX || undefined, align: TA ? { want: TA, mold: AM ? { kv: AM.kv, logo: AM.logo } : undefined } : undefined, manual: MAN, ignored: [(ED.textAlign && !TA) ? `textAlign(${alignLockOf(spec).why})` : null, ...(AM?.notes ?? []).map(n => `textAlign.${n}`), MAN?.kv && kvBg ? 'kv(그림이 지면 전체)' : null, MAN?.kv && kvFixed ? 'kv(매체 템플릿 칸·오브젝트 상자)' : null, MAN?.logo && tLogo ? 'logo(템플릿 로고 칸)' : null, (ED.bgFill && ED.bgFill !== 'custom' && (roomFull || textureFull)) ? 'bgFill(그림이 곧 지면)' : null, (ED.kvSize && (kvBg || oBox || (tImage && !gCorner && !cutCorner))) ? 'kvSize(매체 칸·지면 전체)' : null].filter(Boolean) };
    if (MAN) fired('edit.manual'); if (Object.keys(presets).length) fired('edit.preset');
  }

  /* ── 조각 ── */
  const clamp = n => `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${n};overflow:hidden`;
  // "신입/경력"·"영업∙마케팅"은 한 덩어리다 — 빗금·가운뎃점 뒤에서 줄이 바뀌지 않게 단어 결합자(U+2060)를 끼운다(레퍼런스는 그 자리에서 끊지 않는다)
  // 가운뎃점은 앞에서도 끊긴다(「경영 / ·제품」) — 양쪽에 끼운다
  // 단, 8자 넘는 덩어리("비씨월드제약/헬스케어")는 빗금 뒤에서 끊어도 된다 — 예시도 거기서 줄을 바꾼다
  // 메인 두 톤 강조(옵션, B1) — 스타일이 강조색(style.accent)을 직접 줬을 때만. 색을 짐작하지 않는다(palette.accent는 자동 생성이라 쓰지 않는다).
  // 지면 모든 정지점에서 4.5:1 이상이어야 켜고, 매체 guide가 끄면(자소설 단색 3/3) 끈다. 칠하는 말 = 채용구분(「대규모 공개채용」) — 메인이 그 말뿐이면 두 톤이 아니므로 안 칠한다
  const accentHex = /^#[0-9A-Fa-f]{6}$/.test(style.accent ?? '') ? style.accent : null;
  const accentPhrase = (() => {
    if (!accentHex || guide?.mainAccent === false || !field || ctx.kind !== 'recruit' || tc.main) return null;
    if (Math.min(...field.stops.map(st => contrast(st, accentHex))) < 4.5) return null;
    const ph = hireOf(core.hiringType || core.employType);
    const flat = String(copy.main).replace(/\n/g, ' ');
    return ph !== '채용' && flat.includes(ph) && flat.trim() !== ph ? ph : null;
  })();
  const accentMain = html => {
    if (!accentPhrase) return html;
    const ph = esc(accentPhrase);
    if (html.includes(ph)) return html.replace(ph, `<span data-accent="1" style="color:${accentHex}">${ph}</span>`);
    // 채용구분이 줄을 넘어 나뉘었으면(「대규모 / 공개채용」) 그 조각인 줄만 칠한다
    return html.trim() && ph.split(' ').length > 1 && ph.includes(html.trim()) ? `<span data-accent="1" style="color:${accentHex}">${html}</span>` : html;
  };
  // 끝 어절이 2자 이하면(「분야」·「채용」) 앞 어절과 줄바꿈 없는 띄어쓰기(NBSP)로 붙인다 — 혼자 다음 줄로 떨어지는 고아 줄을 막는다(10-08 typo A4: GDN 300×1050·자소설 채용공고 「…사업 / 분야」).
  // 메인은 text-wrap:balance와 줄 수 어림(pickInfo)이 줄 나눔을 맡으므로 붙이지 않는다(orphan=false)
  const glue = t => t.replace(/ (\S{1,2})$/u, (m0, wd) => ([...wd].length <= 2 ? '\u00A0' + wd : m0));
  // 짧은 회사명(12자 이하, 띄어쓰기 있음 — 「MIDAS IT」)은 한 덩어리로 — 줄이 회사명 속에서 바뀌면(MIDAS / IT) 이름이 갈려 읽힌다(10-12 남은 문제: 유리 슬랩 580×400)
  const clientKeep = (() => { const cl = String(core.client ?? '').trim(); return cl && /\s/.test(cl) && [...cl].length <= 12 ? cl : null; })();
  const keepClient = t => clientKeep ? String(t ?? '').split(clientKeep).join(clientKeep.replace(/\s+/g, '\u00A0')) : String(t ?? '');
  // 빗금 뒤를 붙이는 건 6자까지 — 「신입/경력사원」(7자)을 붙이면 좁은 칸(자소설 160×600 줄당 6자)에서 브라우저가 낱말 속 「경력사|원」을 끊었다(10-14 t1014 동서식품). 사다리(pickInfo pieces)는 빗금 뒤에서 끊는다고 본다
  //   줄바꿈 자리는 줄이 좁을 때만(한 줄 7.5자 미만 — 메인 칸 폭 ÷ 메인 px) — 넓은 칸에서 열면 균형 줄바꿈이 「대졸 신입/ / 경력사원 채용」처럼 빗금 뒤에서 끊었다(구글 300×600)
  const narrowLine = (textW / Math.max(1, mainFs)) < 7.5;
  const nb = (t, orphan = true) => { const s0 = keepClient(t).replace(/[^\s\u200B]+/g, w => [...w].length > 8 ? w : w.replace(/(?<=\S)([∙·])(?=\S)/g, '\u2060$1\u2060').replace(/([\/])(?=\S)/g, ([...w].length > 6 && narrowLine) ? '$1\u200B' : '$1\u2060')); return orphan && /\S \S/.test(s0) ? glue(s0) : s0; };
  // 메인 자간(CANON tracking): 메인 글자 28px 이상이면 −2.5%em. 매체 guide가 0으로 끄면(자소설·에브리타임 템플릿 실측 0%) 없음
  const trackMain = fs => { const tk = guide?.tracking ?? {}; const v = tk.main ?? 0; return v && fs >= (tk.mainMinPx ?? 28) ? `letter-spacing:${v}em;` : ''; };
  // 역할별 굵기(core/canon.js weights · 매체 guide.weights가 이김) — 메인 700 > 아이브로 600 > 슬로건·날짜 500 > 값 400. 어두운 지면 14px 미만은 500 하한(weightOf)
  const fwOf = (role, fs = null) => weightOf(role, { medium: mr, fs, darkField: !fgIsDark });
  const sampleAttr = t => (sampleText.size && [...sampleText].some(x => String(t ?? '').includes(x))) ? ' data-sample="1"' : '';
  const T = (role, text, fs, weight, color, extraCss = '', lines = 1, lh = line) =>
    `<div data-field="${role}"${sampleAttr(text)} style="flex:none;font-size:${fs}px;line-height:${lh};font-weight:${weight};${role === 'main' ? trackMain(fs) : ''}color:${color};text-align:${align};${WRAP};${clamp(lines)};${extraCss}">${String(text).split('\n').map(t => role === 'main' ? accentMain(esc(nb(t, false))) : esc(nb(t))).join('<br/>')}</div>`;   // flex:none — 세로 예산이 몇 px 모자라도 글줄이 눌려 잘리지 않는다(인스타 스토리 '잘림' 차단)
  // 날짜·라벨은 꾸미지 않은 한 줄 글자다 — 테두리 알약을 두르지 않는다
  const plain = (role, text, fs) =>
    `<span data-field="${role}"${sampleAttr(text)} style="display:inline-block;font-size:${fs}px;line-height:${line};font-weight:${fwOf(role === 'date' ? 'date' : 'tag', fs)};color:${subFg};white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis">${esc(text)}</span>`;
  const ctaChip = () => `<span data-field="cta" style="display:inline-block;background:${mainFg};color:${fgIsDark ? '#FFFFFF' : p.primary};font-size:${z.ctaFs}px;line-height:${line};font-weight:${fwOf('cta', z.ctaFs)};padding:${Math.round(z.ctaFs * 0.6)}px ${Math.round(z.ctaFs * 1.1)}px;border-radius:6px;white-space:nowrap">${esc(copy.cta)}</span>`;
  // 상세 블록 — 한 요소로 묶어 검사기가 총 글자수·총 줄 수를 본다. 라벨은 굵게, 값은 가늘게(세아제강·한독).
  const lw = fwOf('detailLabel', z.dFs);   // 라벨 700 + 값 400(자소설 3/3) — 예전엔 가로형 레퍼런스(detailLabelBold:false)에서 라벨도 400이라 강약이 없었다
  // 라벨 칩(구글 템플릿 '문구입력', 예시 24/28: 일화 레드 pill·비씨월드 네이비 pill·ABL 흰 pill) — 밝은 지면엔 브랜드색 칩에 흰 글자, 어두운 지면엔 흰 칩에 지면색 글자
  const chipTone = style.chipTone ?? 'tint';
  const chip = (guide?.detailLabels === 'chip' || stackTags) && chipTone !== 'plain';   // 'plain'은 알약 없이 굵은 라벨만
  // 알약 톤(style.chipTone, 캠페인 일괄·산출물 개별 모두 가능)
  //   tint(기본): 밝은 지면엔 검정 7% — 지면이 한 톤 짙어진 알약(노랑 지면이면 '진한 노랑') + 지면 위에서 4.5:1이 되게 어둡힌 브랜드색 글자.
  //               어두운 지면엔 흰 20% + 흰 글자(보드 1-884 코엑스 카드 '모집분야'). 10-06 사용자 "찐한 노랑 말고… 블랙 오퍼시티 7%"
  //   brand: 밝은 지면 브랜드색 채움 + 흰 글자(구글 예시 일화 레드·비씨 네이비), 어두운 지면 흰 88% 알약 + 지면색 글자
  const chipStyleOf = () => {
    if (chipTone === 'brand') {
      const bg = fgIsDark ? (p.primary ?? '#000000') : '#FFFFFF';
      const fg0 = fgIsDark ? '#FFFFFF' : (field?.stops?.[0] ?? p.primary ?? '#000000');
      const fg = contrast(bg, fg0) >= 3 ? fg0 : (contrast(bg, WHITE) >= contrast(bg, BLACK) ? WHITE : BLACK);
      return { bg: fgIsDark ? bg : 'rgba(255,255,255,.88)', fg };
    }
    if (!fgIsDark) return { bg: 'rgba(255,255,255,.2)', fg: '#FFFFFF' };
    const stops = field?.stops?.length ? field.stops : ['#FFFFFF'];
    const worst = c => Math.min(...stops.map(st => contrast(mix(st, '#000000', 0.07), c)));
    let fg = p.primary ?? '#000000', k = 0;
    while (worst(fg) < 4.5 && k < 8) { fg = mix(fg, '#000000', 0.15); k++; }   // 브랜드색을 15%씩 어둡혀 4.5:1까지
    return { bg: 'rgba(0,0,0,.07)', fg: worst(fg) >= 4.5 ? fg : mainFg };
  };
  const { bg: chipBgCss, fg: chipFg } = chipStyleOf();
  const chipCss = `display:inline-block;font-weight:${fwOf('chip', Math.max(8, Math.round(z.dFs * 0.86)))};font-size:${Math.max(8, Math.round(z.dFs * 0.86))}px;line-height:1.5;padding:0 ${Math.round(z.dFs * 0.55)}px;border-radius:999px;background:${chipBgCss};color:${chipFg};vertical-align:baseline;white-space:nowrap`;
  // 접수기간 라벨 이름은 매체·틀이 정한다(10-15): 자소설 「모집일정」(PC팝업 28:124·채용공고 28:333), PC메인 「채용일정」(28:1002). 기본 「접수기간」. 내부 키는 그대로 '접수기간'
  const labelOf = l => l === '접수기간' ? (mold?.labels?.period ?? guide?.labels?.period ?? l) : l === '모집직무' ? (mold?.labels?.role ?? l) : l;   // 틀이 라벨 이름을 정하면(NAP HS화성 샘플 「모집분야」 — mold.labels.role, 10-15 밤)
  const label = d => chip
    ? `<b data-chip="1" style="${chipCss};margin-right:${Math.round(z.dFs * 0.5)}px${d.inline ? '' : ';margin-bottom:' + Math.round(z.dFs * (stackTags ? 0.5 : 0.25)) + 'px'}">${esc(d.label)}</b>${d.inline ? '' : '<br/>'}`
    : d.inline ? `<b style="font-weight:${lw}">${esc(labelOf(d.label))}</b> : ` : `<b style="font-weight:${lw};display:block">${esc(labelOf(d.label))}</b>`;
  // 가로형은 상세를 한 행에 가로로 푼다(일화 970: 접수기간·모집부문 라벨 2개 한 줄 / 중앙 템플릿 상세 4칸 한 행)
  const detailRow = useRef && (L.shape === 'wide' || gv?.detailFlow === 'row') && detailLines.every(d => d.inline);
  // 쌓기 값: 항목은 ㅣ로 잇고(참고 예시처럼 띄어쓰기 없이) 줄은 ㅣ 뒤에서만 끊는다 — 항목 안의 '/'(전시/컨벤션)에서 끊기면 "전시/ / 컨벤션"이 된다
  const fmtVal = v => stackTags ? String(v).split(/\s*,\s*/).filter(Boolean).map(it => it.replace(/\//g, '\u2060/\u2060')).join('ㅣ\u200B') : String(v);
  const detailBlock = () => detailLines.length
    ? `<div data-field="detail"${detailLines.some(d => sampleText.has(d.value)) ? ' data-sample="1"' : ''} style="font-size:${z.dFs}px;font-weight:${fwOf('detailValue', z.dFs)};line-height:${dLine};color:${detailFg};text-align:${align};margin-top:${detailGap(z)}px;${WRAP};text-wrap:pretty${detailW > textW ? `;width:${detailW}px;max-width:none` : ''}${detailRow ? `;display:flex;flex-wrap:wrap;gap:${chipRowGap(z)}px ${Math.round(z.dFs * 1.2)}px` : ''}">${detailLines.map((d, i) =>
        `<div${!detailRow && i > 0 && chipRowGap(z) ? ` style="margin-top:${chipRowGap(z)}px"` : ''}>${label(d)}${esc(nb(fmtVal(d.value)))}</div>`).join('')}</div>` : '';
  // 로고 폭 상한(CANON logoCap): 메인 글자 크기 × 2.4, 그리고 캔버스 폭의 12%(폭 320 이하 세로 띠는 25%) — 높이 기준(logoH)만 두면 가로로 긴 워드마크(3.4:1)가 메인보다 커 보인다
  // (Figma 9월 공채: 디자이너 로고 폭 ÷ 메인 px 1.3~2.4, 우리 인스타 4.5·자소설 팝업 3.8). 템플릿 로고 칸 안에서도 이 폭을 넘지 않는다
  const LC = guide?.logoCap ?? null;
  // 10-15 템플릿 우선: 틀 로고 칸(자소설 150×31)은 칸이 크기다 — 상한을 걸지 않는다(세아제강 로고 143×23 이 칸을 채운다). 템플릿 없는 매체만 상한
  const logoCapW = (LC && !mold) ? Math.max(24, Math.round(Math.min(mainFs * LC.perMainPx, w * (w <= 320 ? LC.wRatioTower : LC.wRatio)))) : Infinity;
  const capW = mw => Math.min(mw, logoCapW);
  { const subRole = showSub ? (subAbove ? 'eyebrow' : ((ladder.date ?? []).includes(copy.sub) ? 'date' : 'slogan')) : null;
    const tk = guide?.tracking ?? {}; const trk = (tk.main ?? 0) && mainFs >= (tk.mainMinPx ?? 28) ? tk.main : 0;
    TR.fonts = { main: { px: mainFs, weight: fwOf('main', mainFs), lh: mainLine, tracking: trk, lines: mainLines, cap: capMain, floor: floorMain, sqFloor }, sub: showSub ? { px: z.subFs, weight: fwOf(subRole, z.subFs), role: subRole, lh: useRef ? L.subLine : line } : null,
      date: want.date ? { px: z.smallFs, weight: fwOf('date', z.smallFs) } : null, detail: detailLines.length ? { px: z.dFs, label: lw, value: fwOf('detailValue', z.dFs), lh: dLine, chip, chipPx: Math.max(8, Math.round(z.dFs * 0.86)), chipWeight: fwOf('chip', Math.max(8, Math.round(z.dFs * 0.86))), stack: stackTags } : null,
      extra: want.extra ? { px: z.smallFs, weight: fwOf('extra', z.smallFs) } : null, notice: want.notice ? { px: noticeFs, weight: fwOf('notice', noticeFs) } : null, logoCapW: Number.isFinite(logoCapW) ? logoCapW : null, mediumWeights: mr.guide?.weights ?? null, stated: Object.keys(stated).length ? stated : null, fsRange, accent: accentPhrase };
    TR.copy = { main: copy.main, sub: showSub ? copy.sub : null, date: want.date ? copy.date : null, details: detailLines.map(d => d.label) };
    fired('weights'); if (trk) fired('tracking'); if (sqFloor && mainFs <= sqFloor + 1 && mainFs >= sqFloor) fired('mainFloor'); if (Number.isFinite(logoCapW)) fired('logoCap'); if (copy.main.includes('\n') && guide?.twoLines && stated.main == null) fired('twoLines'); if (guide?.keepInfo && mainFs < capMain) fired('keepInfo'); if (accentPhrase) fired('mainAccent'); }
  const logoImg = (hPx, maxW) => (allowLogo && logoSrc)
    ? logoTag(`display:block;height:${hPx}px;width:auto;max-width:${capW(maxW)}px;object-fit:contain`)
    : '';
  // 오브젝트 — 상자에 가두지 않는다. 지면 가장자리까지 붙이고, 글자 쪽 변만 지면으로 녹인다(마스크라 그라데이션 지면에도 맞는다).
  // 이미지의 그 변이 이미 지면색과 같으면(field.seamless) 녹이는 폭을 줄인다. 배경을 딴 이미지는 자르지 않고 맞춰 넣는다.
  const cutout = (style.kvMeta?.field?.opaque ?? 1) < 0.5;
  // 녹이는 폭: 지면과 같은 색으로 이어지면 18%, 아니면 32% — 짧고 직선적인 10%는 "급하게 끊긴" 느낌(10-06 사용자, 자소설 PC메인 왼쪽 열)
  const fadePct = (style.background?.ai?.melt >= 0.3) ? Math.round(style.background.ai.melt * 100) : (field?.seamless ? 18 : 32);   // 10-22 AI 녹임 길이(0.3~0.75) — 규칙 최소값 자리에 들어가 색 거리로 더 길어질 수는 있어도 짧아지진 않는다
  // 10-12 CANON melt: 그림 변 색과 지면색(가장 먼 끝)이 멀수록 길게 — 밝은 그림 × 어두운 지면은 45~55%
  const edgeOf = k => style.kvMeta?.field?.edges?.[k]?.hex ?? null;
  const farFrom = hx => (hx && field?.stops?.length) ? field.stops.reduce((m, x) => colorDistance(hx, x) > colorDistance(hx, m) ? x : m) : null;
  const fadeFor = dir => { const hx = edgeOf(dir === 'to left' ? 'right' : dir === 'to right' ? 'left' : 'top'); return meltLength(hx, farFrom(hx), fadePct); };
  const melt = dir => (transparent || cutout) ? '' : meltMask(dir, fadeFor(dir));
  const meltAttr = dir => (transparent || cutout) ? '' : ` data-melt="${fadeFor(dir)}" data-melt-dir="${dir}"`;   // 가이드 대조표(guide-trace)가 읽는 녹임 길이 — 마스크와 같은 값
  // 이미지의 그 변이 지면과 같은 색이면 그 변을 기준으로 붙인다(join) — 이음매에서 그림이 잘리지 않고, 넘치는 쪽은 지면 바깥으로 나간다.
  // 겹침 교정(kvK<1)으로 틀 칸·아래 띠의 누끼를 줄일 때: contain 대신 그 배율의 높이(우하단·바닥 가운데 정렬은 그대로)
  const containSz = (bw, bh) => (FIX?.kvK && FIX.kvK < 1 && kvAR) ? `auto ${Math.max(8, Math.round(Math.min(bh, bw / kvAR) * FIX.kvK))}px` : 'contain';
  const kvFill = (pos, join) => { const c = (cutout || !tImage) ? null : subjectCrop(style, tImage.w, tImage.h);
    // 10-20 종합 점수표 ① character.head: 가운데 cover 가 주인공 윗변을 5~16% 잘랐다(리멤버·잡다 오른쪽 열, 자소설 PC메인 왼쪽 열) — 자유 배치·M팝업과 같은 coverPos(머리 지킴, 숨 4%)
    return `background:url('${esc(style.keyVisual)}') ${cutout ? `${pos}/${containSz(tImage.w, tImage.h)}` : c ? `${c.pos}/${c.size}` : `${field?.seamless ? join : coverPos(style, tImage.w, tImage.h, { fallback: 'center', headroom: 0.04 }).pos}/cover`} no-repeat;`; };
  // 로고가 오브젝트일 때 — 칸 가운데에 크게(칸 폭의 2/3, 높이의 절반 안). 셀트리온·LX 예시처럼 로고 하나가 그림 노릇을 한다
  const logoZone = (x, y, zw, zh) => `<div data-object="logo" style="position:absolute;left:${mirrorX ? w - x - zw : x}px;top:${y}px;width:${zw}px;height:${zh}px;display:flex;align-items:center;justify-content:center"><img data-logo="1" src="${esc(logoSrc)}" alt="" style="width:66%;max-height:56%;height:auto;object-fit:contain;${logoFilter}"/></div>`;
  // 매체 오브젝트 상자(카카오 썸네일형): 둥근 상자 안에 그림을 채운다(누끼는 맞춰 넣기). 상하 여백이 남는다 — 가이드 Good Case
  const boxLayer = b => { const c = isCutout ? null : subjectCrop(style, b.w, b.h);
    return `<div data-object="1" style="position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;border-radius:${b.radius ?? 0}px;background:url('${esc(style.keyVisual)}') ${isCutout ? 'center/contain' : c ? `${c.pos}/${c.size}` : `${kvPos}/cover`} no-repeat;overflow:hidden"></div>`; };
  // 오른쪽 열 오브젝트가 로고 자리(우상단)까지 올라오면 로고를 가린다(970 여우) — 누끼·일러스트는 로고 띠 아래부터. 사진은 하늘 위에 로고가 얹혀도 된다(일화 970)
  const objTop = (absLogo && logoBox && logoPlace === 'top-right' && kvKind !== 'photo') ? logoBox.top + logoBox.h + Math.round(logoBox.h * 0.5) : 0;
  const bleedRight = bw => hasKv ? (bleedP ? bleedLayer(style, bleedP, w, h) : oBox ? boxLayer(oBox) : kvLayer(style, field, { side: 'right', w, h, size: bw, edgePad: pad.right, inset: edgeSolid ? pad.right : 0, melt: !transparent, top: objTop }))
    : logoAsObject ? logoZone(w - bw - pad.right, pad.top, bw, h - pad.top - pad.bottom) : '';
  const bleedBottom = bh => hasKv ? (bleedP ? bleedLayer(style, bleedP, w, h) : null) ?? kvLayer(style, field, { side: 'bottom', w, h, size: bh, edgePad: pad.bottom, melt: !transparent, bleedMax: cutBleed, cutLeft })
    : logoAsObject ? logoZone(pad.left, h - bh - pad.bottom, w - pad.left - pad.right, bh) : '';

  /* ── 로고 자리 ── 템플릿 칸이 있으면 그 칸에 정확히(contain, 가운데). 없으면 프로필 위치. */
  let logoPos = prof('logoPosition') ?? 'top-left';
  if (['right', 'inline-with-copy', 'left'].includes(logoPos)) logoPos = 'top-right';
  if (align === 'center' && logoPos.startsWith('top')) logoPos = 'top-center';
  const logoRowJustify = TA ? ALIGN_JUSTIFY[TA] : logoPos.endsWith('right') ? 'flex-end' : logoPos.endsWith('center') ? 'center' : 'flex-start';   // 글자 열 안 로고 줄은 글자 정렬을 따른다(10-19)
  const logoAtBottom = logoPos.startsWith('bottom');
  // 틀 로고 칸(10-15 사용자): 칸 안에 두되 꽉 채우지 않는다 — 샘플 면적 상한(mold.logo.maxArea, 채용공고 2,200px²·PC메인 3,600·M팝업 8,500). 칸에 맞춘 크기가 상한을 넘으면 √(상한/면적)배로 줄인다(비율 유지, 칸 가운데/우측 정렬 그대로)
  const moldLogoH = (() => { const mx = mold?.logo?.maxArea; const ar0 = style.logoMeta?.px ? style.logoMeta.px[0] / Math.max(1, style.logoMeta.px[1]) : null; if (!(mx && tLogo && ar0)) return null; const area = (mx * tScale * tScale); let hh = Math.min(tLogo.h, tLogo.w / ar0); if (hh * hh * ar0 > area) hh = Math.sqrt(area / ar0); return Math.max(8, Math.floor(hh)); })();   // 내림 — 반올림이면 상한을 1px 넘는다(ABL PC메인 3,699 > 3,600)
  if (moldLogoH) fired('templateMold.logoArea');
  // 틀 로고 흰 상자(mold.logo.box — 구글 ABL: 둥근 흰 상자 안에 원색 심볼, 10-15 저녁): 상자가 있으면 로고는 원색 그대로(흰 변환 안 함), 안쪽 여백 box.pad. 반대쪽 끝 작은 보조 로고(mold.logo2)는 지면 규칙대로(어두우면 흰색)
  const LB = mold?.logo?.box ?? null;
  const boxCss = LB ? `background:${LB.bg ?? '#FFFFFF'};border-radius:${Math.round((LB.radius ?? 6) * tScale)}px;padding:${Math.round((LB.pad ?? 6) * tScale)}px;box-sizing:border-box;` : '';
  const tplLogo = (allowLogo && logoSrc && tLogo && !logoAsObject)
    ? `<div data-logo-slot="1"${LB ? ' data-logo-box="1"' : ''} style="position:absolute;left:${tLogo.x}px;top:${tLogo.y}px;width:${tLogo.w}px;height:${tLogo.h}px;display:flex;align-items:${({ bottom: 'flex-end', top: 'flex-start' }[mold?.logo?.valign ?? ''] ?? 'center')};justify-content:${AM?.logo === 'center' ? 'center' : mold?.logo?.align ? ({ right: 'flex-end', left: 'flex-start' }[AM?.logo === 'mirror' ? flipLR(mold.logo.align) : mold.logo.align] ?? 'center') : (tpl?.logoHorizontal && !tpl?.logo) ? 'flex-end' : 'center'};${boxCss}${mold ? 'z-index:2;' : ''}"><img data-logo="1" src="${esc(LB ? style.logo : logoSrc)}" alt="" style="display:block;max-width:${Number.isFinite(logoCapW) ? `min(100%,${logoCapW}px)` : '100%'};max-height:100%;width:auto;height:${moldLogoH ? `${moldLogoH}px` : mold?.logo?.fitH ? `${Math.round(mold.logo.fitH * tScale)}px` : 'auto'};object-fit:contain;${LB ? '' : logoFilter}"/></div>${(() => { const L2 = (mold?.logo2 && style.logo2) ? rect(mold.logo2, tScale) : null; if (!L2) return ''; /* 보조 로고 칸(ABL 샘플의 그룹 로고)은 보조 자산(style.logo2)이 있을 때만 — 같은 로고를 두 번 넣지 않는다(10-15 밤) */ fired('templateMold.logo2'); return `<div data-logo-slot="2" style="position:absolute;left:${L2.x}px;top:${L2.y}px;width:${L2.w}px;height:${L2.h}px;display:flex;align-items:center;justify-content:${mold.logo2.align === 'left' ? 'flex-start' : 'flex-end'}"><img data-logo="2" src="${esc(style.logo2)}" alt="" style="display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;${logoFilter}"/></div>`; })()}`
    : '';
  if (LB && tplLogo) fired('templateMold.logoBox');
  // 사진은 윗변이 평평하지 않다 — 하단 칸에 제 크기로 놓아도 윗변을 지면으로 녹인다(한독 사옥 → 파랑 지면으로 번짐)
  // 하단 칸의 윗변도 지면과 같은 색이 아니면(사진, 또는 그라데이션 변을 단색으로 접은 지면) 녹인다 — 상자째 붙인 직선 이음매를 없앤다
  // 틀 하단 칸의 누끼(채용공고 160×200·달력 328×160): 10-15 에는 폭 맞춤이 작다고 tower 잘림 ≤ 42% 만큼 키워 좌우로 흘렸으나(bandBleed), 10-19 사용자 「비주얼 끊기지 않게 하라고 했음」(자소설 160×600 캐릭터 좌우·아래 잘림) → 기본은 칸 안 contain(바닥 가운데, 잘림 없음). 틀이 mold.image.bleed:true 로 명시할 때만 예전 블리드
  const moldBandH = (() => { if (!(mold && mold.image?.bleed === true && tImage && imgBottomBand && hasKv && cutout && kvAR)) return null; const maxCut = guide?.objectBleed?.tower?.maxCut ?? guide?.objectBleed?.narrow?.maxCut ?? 0.42; const hh = Math.round(Math.min(tImage.h, tImage.w / (1 - maxCut) / kvAR)); return hh > Math.round(tImage.w / kvAR) + 2 ? hh : null; })();
  if (moldBandH) fired('templateMold.bandBleed');
  const bandMelt = !!(tImage && imgBottomBand && hasKv && !cutout && !transparent && (style.kvMeta?.field?.edges?.top?.flat === false || !field?.seamless));
  // 틀 그림 칸의 그라데이션 바탕 일러스트(kvtypes gradEdge — 가장자리가 지면으로 녹는 그림): cover 로 주인공을 당겨 채우면 캔버스 아래로 몸통이 잘린다(여우 M팝업·PC메인).
  //   몸 전체가 보이게 contain(바닥 맞춤) + 양옆 녹임 — 지면은 이미 그림 가장자리 색(kv-edge)이라 녹인 변이 이어진다(10-15 저녁 사용자 결정)
  // 둥근 그림 칸(mold.image.radius — 카카오 비즈보드 템플릿 64:3325 오브젝트 상자 r10, 10-16 사용자 「우측 비주얼 라운드 넣거나, 누끼면 그냥 툭」): 사진·바탕 있는 그림은 칸을 채우고(cover) 모서리를 둥글게 자른다(녹임 없음 — 안랩 샘플), 누끼는 칸 안에 contain 그대로
  const roundSlot = !!(mold && tImage && tImage.radius != null && hasKv && !cutout && !isCutout && !logoAsObject);
  if (roundSlot) fired('templateMold.slotRound');
  const moldContain = !!(mold && tImage && hasKv && !cutout && !transparent && !logoAsObject && kvKind !== 'photo' && kvTypeOf(style.kvMeta)?.flags.gradEdge) && !roundSlot;
  if (moldContain) fired('templateMold.containGrad');
  const tplObject = (logoAsObject && tImage) ? logoZone(tImage.x + Math.round(tImage.w * 0.1), tImage.y + Math.round(tImage.h * 0.1), Math.round(tImage.w * 0.8), Math.round(tImage.h * 0.8))
    : moldContain
    ? (() => { const mL0 = fadeFor('to right'), mR0 = fadeFor('to left');
        // 윗변(그림 변)이 지면색과 0.15 넘게 다르면 윗변도 녹인다(10-20 전수 감사 desk-11 네 변 평평한 일러스트 — 왼·오른쪽만 녹여 윗변이 네모 선). 길이는 CANON.melt, 같은 색이면 0
        const tHex = edgeOf('top'), tFar = farFrom(tHex); const mT = (tHex && tFar && colorDistance(tHex, tFar) >= 0.15) ? meltLength(tHex, tFar, 0) : 0;
        // 상자 = contain 으로 실제 그려지는 그림 사각형(10-20 종합 점수표 ② 여백 1위 원인: 칸 가운데 contain 이 오른쪽 열·모서리 칸에서 지면 오른쪽 변까지 13~130px 틈 — 장부 mold-contain-edge-align).
        //   칸이 지면 변에 닿는 쪽으로 그림을 붙이고(오른쪽 열·우하단 칸 → 오른쪽, 왼쪽 열 → 왼쪽, 어디에도 안 닿으면 가운데) 닿은 변은 지면 끝이라 녹이지 않는다. 녹임 마스크도 그림 변에서 시작한다(칸 변이 아니라)
        const ar0 = kvAR || (tImage.w / Math.max(1, tImage.h)); const picW = Math.min(tImage.w, Math.round(tImage.h * ar0)), picH = Math.min(tImage.h, Math.round(tImage.w / ar0));
        const atR = tImage.x + tImage.w >= w - 1, atL = tImage.x <= 1; const hPos = atR && !atL ? 'right' : atL && !atR ? 'left' : 'center';
        const bx = hPos === 'right' ? tImage.x + tImage.w - picW : hPos === 'left' ? tImage.x : tImage.x + Math.round((tImage.w - picW) / 2), by = tImage.y + tImage.h - picH;
        const mL = hPos === 'left' ? 0 : mL0, mR = hPos === 'right' ? 0 : mR0;
        const mk = meltMaskList([mL > 0 ? meltGradient('to right', mL) : null, mR > 0 ? meltGradient('to left', mR) : null, mT > 0 ? meltGradient('to bottom', mT) : null].filter(Boolean));
        if (hPos !== 'center') fired('templateMold.containEdge');
        return `<div data-object="1" style="position:absolute;left:${bx}px;top:${by}px;width:${picW}px;height:${picH}px;background:url('${esc(style.keyVisual)}') center bottom/contain no-repeat;${mk}overflow:hidden" data-melt="${mL}" data-melt-dir="sides" data-melt-right="${mR}"${mT > 0 ? ` data-melt-top="${mT}"` : ''}></div>`; })()
    : (hasKv && tImage)
    ? ((imgCorner || bleedP?.sym) && bleedP ? bleedLayer(style, bleedP, w, h)   // 좌우 양쪽 블리드(sym)는 상자가 지면 폭 전체라 아래 띠로 잡힌다 — 그래도 블리드로 그린다
      : imgCorner
      // 우하단 상자는 일러스트를 담는 자리 — 잘라 채우지 않고 우하단에 맞춰 넣는다(위에 여백이 남아 메인이 그 위를 쓴다).
      // 사진이면(일화 사옥) 상자를 채우고 글자 쪽 두 변(왼쪽·위)을 지면으로 녹인다 — 사진 네모가 지면 위에 떠 보이지 않게
      ? (() => {
          // 그림이 실제로 차지하는 네모(cornerRect, 우하단 맞춤·자르지 않음)에 그린다 — 녹임 마스크가 상자 변이 아니라 그림의 변에서 시작한다.
          // 지면이 그림 가장자리 색과 같지 않으면 글자 쪽 두 변(왼쪽·위)을 녹인다 — "뚝 끊긴" 직선 이음매가 사라진다. 누끼는 그대로. 사진(구글 580)은 상자를 채우고 녹인다
          const photoCover = roundSlot || (gCorner && kvKindPhoto && !cutout) || (!!mold && !cutout && !isCutout && !transparent && !cornerCrop && !cornerFill);   // 틀 모서리 칸(10-15 밤): 사진·바탕 있는 일러스트는 칸을 채우고 글자 쪽 두 변을 녹인다 — 작은 네모로 contain 하면 「뚝 끊긴」 상자(사용자 「이전 버전이 더 견고」)
          if (!!mold && photoCover && !(gCorner && kvKindPhoto)) fired('templateMold.slotCover');
          // 주인공이 그림의 일부면 상자를 주인공으로 채운다(cornerCrop) — 통째로 맞춰 넣으면 상자에 바탕만 보인다
          const rect = (photoCover || cornerCrop || cornerFill) ? tImage : (cornerRect ?? tImage);
          const mL = meltLength(edgeOf('left'), farFrom(edgeOf('left')), 34), mT = meltLength(edgeOf('top'), farFrom(edgeOf('top')), 34);
          // 칸을 덮어 자른(photoCover) 그림은 바탕이 평평해도 글자 쪽 변이 그림 한가운데를 지난다 — cornerSeamless(그림 변 = 지면색) 는 contain 전제라 cover 에선 녹인다(10-20 전수 감사: 인스타 1080 비씨월드 흰 바탕 × 흰 지면이 녹임 없이 남색 주인공을 가로질렀다). 길이는 meltFix 가 속 색으로 다시 잰다
          const meltC = (meltCorner || photoCover) && !roundSlot;
          return `<div data-object="1"${roundSlot ? ' data-slot-round="1"' : ''} style="position:absolute;left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px;${roundSlot ? `border-radius:${tImage.radius}px;` : ''}background:url('${esc(style.keyVisual)}') ${cornerCrop ? `${cornerCrop.pos}/${cornerCrop.size}` : photoCover ? `${coverPos(style, rect.w, rect.h, { fallback: kvPos, headroom: 0.04 }).pos}/cover` : cornerFill ? `${coverPos(style, tImage.w, tImage.h, { fallback: 'center', headroom: 0.3 }).pos}/cover` : `right bottom/${containSz(rect.w, rect.h)}`} no-repeat;${meltC ? meltMask2(mL, mT) : ''}overflow:hidden"${meltC ? ` data-melt="${mL}" data-melt-dir="to right" data-melt-top="${mT}"` : ''}></div>`;
        })()
      : imgBottomBand && bandMode !== 'cover'
      // 상자를 그림 크기에 맞춘다 — 녹이는 마스크가 그림의 윗변에서 시작하게
      ? (() => {
          // 제 크기(native)로 놓은 그림이 띠보다 좁으면 왼·오른쪽 그림 변이 지면 한가운데 네모 변으로 선다(10-20 전수 감사 desk-08 자소설 M팝업·구글 300×600·300×1050 seam-far, 녹임 없음) — 변 색이 지면과 다르면 양옆도 녹인다(길이는 CANON.melt, 같은 색이면 0). 길이 보정은 meltFix 가 잇는다
          const narrow = bandMode === 'native' && kvPx && kvPx[0] < tImage.w - 2 && !transparent;
          const mL = narrow ? meltLength(edgeOf('left'), farFrom(edgeOf('left')), 0) : 0, mR = narrow ? meltLength(edgeOf('right'), farFrom(edgeOf('right')), 0) : 0, mT = bandMelt ? fadeFor('to bottom') : 0;
          const gr = [mT > 0 ? meltGradient('to bottom', mT) : null, mL > 0 ? meltGradient('to right', mL) : null, mR > 0 ? meltGradient('to left', mR) : null].filter(Boolean);
          const attrs = (mL > 0 || mR > 0) ? ` data-melt="${mL}" data-melt-dir="sides" data-melt-right="${mR}"${mT > 0 ? ` data-melt-top="${mT}"` : ''}` : (bandMelt ? meltAttr('to bottom') : '');
          return `<div data-object="1" style="position:absolute;left:${tImage.x}px;top:${bandObjTop}px;width:${tImage.w}px;height:${bandObjH}px;background:url('${esc(style.keyVisual)}') center bottom/${bandMode === 'native' ? 'auto' : 'contain'} no-repeat;${meltMaskList(gr)}overflow:hidden"${attrs}></div>`;
        })()
      : imgBottomBand
      // 길쭉한 그림은 바닥에 맞춰 붙인다 — 위를 맞추면 주인공(아래쪽)이 칸 밖으로 나간다. 윗변은 지면으로 녹인다
      ? `<div data-object="1" style="position:absolute;left:${tImage.x}px;top:${tImage.y}px;width:${tImage.w}px;height:${tImage.h}px;background:url('${esc(style.keyVisual)}') ${cutout ? (cutBand ? `${cutWin ? -Math.round(cutWin.left * tImage.h * cutAr) + 'px' : 'center'} bottom/auto ${tImage.h}px` : moldBandH ? `center bottom/auto ${moldBandH}px` : `center bottom/${containSz(tImage.w, tImage.h)}`) : bandCrop ? `${bandCrop.pos}/${bandCrop.size}` : `${coverPos(style, tImage.w, tImage.h, { fallback: 'center bottom' }).pos}/cover`} no-repeat;${melt('to bottom')}overflow:hidden"${meltAttr('to bottom')}></div>`   // 통째로 덮을 땐 머리를 지키는 위치(자소설 M팝업 600×880 여우), 주인공을 모르면 바닥 맞춤
      // 오른쪽 열의 누끼는 열 바닥·오른쪽 변에 붙인다(10-19 사용자 「배경과 키비주얼 쪽 여백 애매하게 생기지 않도록 전수조사」 — kv-gap-audit: 열 안 가운데 정렬이면 오른쪽에 그림 폭 남은 몫의 절반(리멤버 22~92px·에브리타임 7px·NAP 띠 2~8px)이 애매하게 비었다. 10-15 저녁 「열 안 누끼 center bottom」 은 이 결정으로 바뀜. 왼쪽 열(자소설 PC메인)은 그대로)
      : `<div data-object="1" style="position:absolute;left:${tImage.x}px;top:${tImage.y}px;width:${tImage.w}px;height:${tImage.h}px;${kvFill(imgLeftCol ? (cutout ? 'center bottom' : 'left center') : imgRightCol ? (cutout ? 'right bottom' : 'right center') : 'center bottom', imgLeftCol ? 'right center' : imgRightCol ? 'left center' : 'center top')}${melt(imgLeftCol ? 'to left' : imgRightCol ? 'to right' : 'to bottom')}overflow:hidden"${meltAttr(imgLeftCol ? 'to left' : imgRightCol ? 'to right' : 'to bottom')}></div>`)
    : '';

  // 하단 띠(구글 '좌측중앙 정렬' 템플릿 42px: 비씨월드 네이비 띠) — 밝은 지면엔 브랜드색, 어두운 지면엔 흰색
  const bandEl = band ? `<div data-band="1" style="position:absolute;left:0;right:0;bottom:0;height:${band}px;background:${fgIsDark ? (p.primary ?? '#000000') : '#FFFFFF'}"></div>` : '';
  const lb = (mirrorX && logoBox) ? { ...logoBox, left: logoBox.right, right: logoBox.left } : logoBox;   // 왼쪽 배치면 로고 자리도 좌우로
  const absLogoEl = (absLogo && lb)
    ? `<div data-logo-slot="1" style="position:absolute;top:${lb.top}px;${lb.left != null && lb.right != null ? `left:${lb.left}px;right:${lb.right}px;justify-content:center` : lb.left != null ? `left:${lb.left}px;justify-content:flex-start` : `right:${lb.right}px;justify-content:flex-end`};height:${lb.h}px;display:flex;align-items:center">${logoTag(`display:block;height:100%;width:auto;max-width:${capW(logoBox.maxW)}px;object-fit:contain`, true)}</div>`
    : '';

  const metaRow = () => {
    const parts = [];
    // 라벨이 「모집직무 : …」(접수기간이 없을 때의 대체)인데 상세 줄에 모집직무가 또 있으면 빼다 — 같은 줄이 두 번 나왔다(10-14 t1014 한진정보통신 NAP 320×480)
    const dupLabel = /^모집직무/.test(String(copy.label ?? '')) && detailLines.some(d => d.label === '모집직무');
    if (want.label && copy.label && !dupLabel) parts.push(plain('label', copy.label, z.smallFs));   // 라벨 칩이 날짜 앞(「접수기간 9/4(금) ~ 9/13(일)」) — 샘플 잡다·NAP·구글 모두 라벨 → 값
    if (want.date) parts.push(plain('date', copy.date, z.smallFs));
    if (!parts.length) return '';
    return `<div style="display:flex;flex-wrap:wrap;gap:2px 12px;justify-content:${align === 'center' ? 'center' : 'flex-start'};margin-top:${Math.max(8, Math.round(z.smallFs * 0.5))}px">${parts.join('')}</div>`;
  };

  if (strip && !mold) {   // 틀(mold)이 있는 얇은 띠(NAP 320×50·320×100·PC 970/728, 10-15 저녁)는 띠 문법 대신 틀로
    const meta = [showSub ? copy.sub : null, want.date ? copy.date : null].filter(Boolean).join('  ·  ');
    const lg = flexLogo ? logoImg(z.logoH, Math.round(innerW * 0.16)) : '';
    return `${open('flex-direction:row;align-items:center;gap:20px')}
${objectSide === 'right' ? kvWrap(bleedRight(objW)) : ''}${scrimEl}
${lg ? `<div style="position:relative;flex:none;display:flex;align-items:center">${lg}</div>` : ''}
<div data-text-col="1" style="position:relative;flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:${anchorJ ?? 'center'}${textOff ? ';' + textOff.replace(/;$/, '') : ''}">
${(showSub && subAbove) ? T('sub', copy.sub, z.subFs, fwOf('eyebrow', z.subFs), subFg, `margin-bottom:${Math.round(z.subFs * 0.4)}px`) : ''}
${T('main', copy.main, mainFs, fwOf('main', mainFs), mainFg, '', mainLines)}
${(meta && !(showSub && subAbove)) ? T(showSub ? 'sub' : 'date', meta, z.subFs, fwOf('date', z.subFs), subFg, 'margin-top:3px') : (want.date && subAbove ? T('date', copy.date, z.smallFs, fwOf('date', z.smallFs), subFg, 'margin-top:3px') : '')}
${want.detail ? detailBlock() : ''}
${want.notice ? T('notice', copy.notice, noticeFs, fwOf('notice', noticeFs), subFg, 'margin-top:3px;opacity:.9') : ''}
</div>
${objectSide === 'right' ? `<div style="flex:none;width:${objW}px"></div>` : ''}
${want.cta ? `<div style="position:relative;flex:none">${ctaChip()}</div>` : ''}
${tplLogo}${kvWrap(tplObject)}
</div>`;
  }

  /* ── 템플릿 틀(templateMold, 10-15) ── 매체 샘플이 곧 틀(사용자 「구멍 뚫린 틀」): 글자 칸(x·줄 y·크기·굵기·색·줄 간격)·로고 칸·그림 칸·지면 처리가 고정이고
     캠페인마다 바뀌는 건 배경색(브랜드색을 틀의 지면 처리에)·키비주얼(그림 칸에 맞춰 넣기)·문구(정해진 줄에 붓기)뿐이다.
     일반 배치(CANON 행간·블리드·로고 상한·유리/채도 지면·스크림·질감·글자 앵커 프리셋)는 돌리지 않는다. 문구가 칸을 넘으면 매체 글자수·줄 수로 자른다(lint 가 잡는다) — 줄을 옮기지 않는다.
     줄 위치: Figma 글자 상자 y(높이 = 1.2em, Pretendard 올림·내림) → Chrome 줄 상자(line-height = 줄 간격 pitch) 안에서 글자 상자가 가운데이므로 top = y − (pitch − 1.2em)/2 */
  if (mold) {
    const MR = mold.rows ?? {}, k = tScale;
    const sx = Math.round((mold.x ?? tText?.x ?? pad.left) * k);
    let colW = Math.round((mold.w ?? (w / k - (mold.x ?? pad.left) - pad.right)) * k);
    // 틀 글자 칸이 오른쪽 그림 열 밑으로 들어가면(잡다 MO 글자 20+260 > 그림 칸 226 — 10-20 종합 점수표 ④ text-over-subject 16~18% × 11케이스) 글자 줄은 그림 칸 앞 8px 에서 접는다 — 칸의 x·y·px 는 템플릿 그대로, 폭만 그림 앞에서 멈춤(장부 mold-text-stop-at-image)
    if (tImage && imgRightCol && hasKv && sx + colW > tImage.x && tImage.x - 8 - sx >= Math.round(colW * 0.6)) { colW = tImage.x - 8 - sx; fired('templateMold.textStopAtImage'); }   // 실제로 겹칠 때만(잡다 PC 는 글자 530 < 그림 537 — 그대로)
    const pxOf = r => Math.round(r.px * k * ((FIX?.textK && FIX.textK < 1) ? FIX.textK : 1)), pitchOf = r => Math.round((r.pitch ?? r.px * 1.2) * k * 100) / 100;
    const topOf = r => r.chip ? Math.round(r.y * k * 10) / 10 : Math.round((r.y * k - (pitchOf(r) - pxOf(r) * 1.2) / 2) * 10) / 10;   // 알약 행(날짜 칩)은 칩 상자 top 이 곧 y
    const blocks = []; const used = {};
    // 행마다 글상자가 다르면(구글 ABL: 970 날짜가 메인 오른쪽 (434,80) · 300 세로형 메인 상자 178 안 가운데) r.x·r.w 로, 정렬은 r.align ?? mold.align(「center」 — 구글 300×600·300×1050, 10-15 저녁)
    const rowX = r => r.x != null ? Math.round(r.x * k) - sx : 0, rowW = r => r.w != null ? Math.round(r.w * k) : colW, rowAlign = r => TA ?? r.align ?? mold.align ?? 'left';   /* TA: 정렬 프리셋(10-19) — 칸은 그대로, 칸 안 text-align 만 */
    const put = (role, r, lines, weight, color, inner, text) => { const t = topOf(r), px = pxOf(r), pitch = pitchOf(r); used[role] = { y: Math.round(r.y * k * 10) / 10, px, pitch, lines, weight, top: t, x: r.x != null ? Math.round(r.x * k) : sx, w: rowW(r), align: rowAlign(r), text }; blocks.push({ t, h: pitch * lines, html: `<div data-field="${role}"${sampleAttr(text)} style="position:absolute;left:${rowX(r)}px;top:@@px;width:${rowW(r)}px;font-size:${px}px;line-height:${pitch}px;font-weight:${weight};color:${(fgIsDark && r.color) ? r.color : color};${r.ls != null ? `letter-spacing:${Math.round(r.ls * 10) / 1000}em;` : ''}text-align:${rowAlign(r)};${WRAP};max-height:${Math.round(pitch * lines * 100) / 100}px;overflow:hidden">${inner}</div>` }); };
    const mainPx = pxOf(MR.main ?? { px: mainFs });
    // 틀 메인은 회사 / 채용구분 두 줄(세아제강 「세아제강 / 신입/경력사원 채용」· 현대케피코 「현대케피코 / 신입채용 (…)」) — 한 줄에 다 들어가도 둘로 나눈다(줄 수가 2 이상인 틀만)
    if ((MR.main?.lines ?? 2) >= 2 && !copy.main.includes('\n') && ctx.core?.client && copy.main.startsWith(ctx.core.client + ' ') && copy.main.length > ctx.core.client.length + 1) copy.main = `${ctx.core.client}\n${copy.main.slice(ctx.core.client.length + 1)}`;
    else if ((MR.main?.lines ?? 2) >= 2 && !copy.main.includes('\n') && ctx.core?.client && ctx.core?.season && copy.main.startsWith(`${ctx.core.season} ${ctx.core.client} `)) { const head = `${ctx.core.season} ${ctx.core.client}`; copy.main = `${head}\n${copy.main.slice(head.length + 1)}`; }   /* 시즌 포함 메인도 회사명 뒤에서 줄을 나눈다(인스타 수정본 「2024 ABL생명 / 신입사원 공개채용」, 10-16) */
    // 틀의 메인 줄 수 한도(에브리타임 커뮤니티보드·홈배너 1줄)를 넘기면 사다리에서 들어가는 첫 후보로 바꾼다 — 칸은 max-height 로 잘리므로 「2025 하반기 마이다스 대규모 공개채용」(600px·45px 두 줄)이 반 토막 나지 않게(10-15 검수 표 ✗ 메인 줄 수)
    // 줄 수 어림은 어절 단위 그리디(word-break:keep-all 과 같은 식 — 10-20: 전체 폭 ÷ 칸 폭(ceil)은 「2026 하반기 한국산업단지공단 정규직 채용」을 513px 에 2줄로 봤지만 어절이 안 끊기는 실제는 3줄이라 셋째 줄이 잘렸다). 칸보다 긴 어절은 anywhere 로 쪼개지는 만큼 더한다
    const wrapRows = (t, px, width) => String(t).split('\n').reduce((n, line) => { let rows = 1, cur = 0; for (const wd of line.split(/\s+/).filter(Boolean)) { const ww = textWidth(wd) * px; if (cur > 0 && cur + 0.35 * px + ww > width) { rows++; cur = ww; } else cur = cur > 0 ? cur + 0.35 * px + ww : ww; if (ww > width) rows += Math.ceil(ww / width) - 1; } return n + rows; }, 0);
    const rowsOfMain = t => wrapRows(t, mainPx, Math.max(1, colW));
    let mainShrink = 1;   // 틀 메인 글자 배율(1 = 템플릿 px 그대로)
    if (MR.main?.lines && rowsOfMain(copy.main) > MR.main.lines) {
      const cands = [...(ladder.main ?? []), ...(ladder.mainNarrow ?? [])];
      const alt = cands.find(c => rowsOfMain(c) <= MR.main.lines); if (alt) copy.main = alt;   // 좁은 칸(구글 300×600 178px)은 좁은 사다리(「한샘 / 채용」)까지 — 반 토막 글자 대신(10-15 밤)
      else {
        // 어떤 후보도 틀 줄 수에 안 들어가면(긴 회사명 「한국산업단지공단」 — 10-20 종합 점수표 ④ text-clipped 리멤버·카카오·네이버 DA 셋째 줄 잘림) 글자를 규정 매체 바닥(CANON.overlapFix.textFloorRegulated .85)까지 줄여 가며 들어가는 첫 후보로,
        //   그래도 안 되면 줄 수가 가장 적은 후보 — 잘린 채로는 그리지 않는다(장부 mold-main-fit)
        const floor = CANON.overlapFix?.textFloorRegulated ?? 0.85;
        const rowsAt = (t, kk) => wrapRows(t, Math.round(MR.main.px * k * kk), Math.max(1, colW));
        let hit = null;
        for (const kk of [0.95, 0.9, floor]) { const c = [copy.main, ...cands].find(c => rowsAt(c, kk) <= MR.main.lines); if (c) { hit = { c, kk }; break; } }
        if (!hit) { const best = [copy.main, ...cands].map(c => ({ c, n: rowsAt(c, floor) })).sort((x, y) => x.n - y.n)[0]; hit = { c: best.c, kk: floor }; }
        copy.main = hit.c; mainShrink = hit.kk; fired('templateMold.mainShrink');
      }
    }
    const mainPxUsed = mainShrink < 1 ? Math.round(MR.main.px * k * mainShrink * ((FIX?.textK && FIX.textK < 1) ? FIX.textK : 1)) : mainPx;
    // 실제 줄 수 어림: 적어 둔 줄바꿈 + 칸 폭(colW)에서 접히는 줄(채용공고 130px: 「대규모 공개채용」이 두 줄)
    const mainN = Math.max(1, Math.min(MR.main?.lines ?? 2, wrapRows(copy.main, mainPxUsed, Math.max(1, colW))));
    const subN = (showSub && MR.sub) ? Math.max(1, Math.min(MR.sub.lines ?? 1, Math.ceil(textWidth(copy.sub) * pxOf(MR.sub) / Math.max(1, colW)))) : 0;
    // 틀의 서브 줄이 접수기간이면(mold.rows.sub.content 'period' — 잡다 PC 템플릿 1:6026 「서브문구」 자리에 샘플 8/8 「모집기간 날짜」) 시즌·슬로건 대신 「라벨 날짜」 한 줄(라벨·날짜 같은 굵기, 셀트리온 1:6223)
    if (MR.sub?.content === 'period') copy.sub = (copy.date || ctx.core?.deadline) ? `${labelOf('접수기간')}${MR.sub.sep ?? ' '}${copy.date || ''}`.trim() : '';   // 날짜가 없으면 서브 줄 없음(틀의 서브 = 접수기간). 구분자는 틀이 정한다(네이버 한국콜마 64:4793 「모집 기간 | …」)
    const showSubM = MR.sub?.content === 'period' ? !!copy.sub : showSub;
    // 틀 서브 줄 수 한도(구글 ABL 580 서브 1줄 297px): 넘기면 사다리의 들어가는 첫 후보(시즌 등)로 — 칸은 max-height 로 잘리므로 반 토막 대신 짧은 말(10-15 저녁)
    const rowsIn = (t, r) => wrapRows(t, pxOf(r), Math.max(1, rowW(r)));
    if (showSubM && MR.sub && MR.sub.lines && MR.sub.content !== 'period' && rowsIn(copy.sub, MR.sub) > MR.sub.lines) { const alt = (ladder.sub ?? []).find(c => c && rowsIn(c, MR.sub) <= MR.sub.lines); if (alt) copy.sub = alt; else if (mold.subOptional) { copy.sub = ''; fired('templateMold.subDropped'); } }   // 틀 서브 칸(1줄)에 들어가는 후보가 없으면 비운다(mold.subOptional — 구글 템플릿 서브문구, 10-16: 잘린 채 그리지 않는다)
    if (showSubM && MR.sub) put('sub', MR.sub, MR.sub.lines ?? 1, MR.sub.weight ?? fwOf('eyebrow', pxOf(MR.sub)), subFg, esc(nb(copy.sub)), copy.sub);
    const mR = MR.main ? { ...MR.main, ...(MR.main.bySubLines?.[String(subN)] ?? {}), ...(mainShrink < 1 ? { px: MR.main.px * mainShrink } : {}) } : null;   // 줄인 배율은 px 에만(줄 간격 pitch 는 템플릿 그대로)   // 채용공고: 서브 2줄이면 메인 첫 줄 y141(템플릿 28:190)
    // 회사명 강조색(mold.rows.main.accentClient — NAP HS화성 샘플 「HS화성」 빨강 #D6061C = 브랜드 보조색, 나머지 네이비, 10-15 밤): 밝은 지면에서만, 강조색(style.accent·팔레트 accent)이 없으면 그대로
    const accentFg = (mR?.accentClient && fgIsDark && ctx.core?.client && (!!tc.main || !!mr.fonts?.required)) ? (accentHex ?? p.accent ?? null) : null;   /* 10-19: 규정 없는 매체(NAP)는 타이틀 한 색(#333) — 회사명 강조색 끔 */
    const mainLines = String(copy.main ?? '').split('\n').map((t, i) => { const cl = String(ctx.core?.client ?? ''); if (accentFg && i === 0 && cl && t.startsWith(cl)) { fired('templateMold.accentClient'); return `<span data-accent="1" style="color:${accentFg}">${esc(nb(cl, false))}</span>${esc(nb(t.slice(cl.length), false))}`; } return esc(nb(t, false)); });
    if (copy.main && mR) put('main', mR, mR.lines ?? 2, mR.weight ?? fwOf('main', mainPx), mainFg, mainLines.join('<br/>'), copy.main);
    // 틀 상세의 글감: 틀이 항목(items)을 정했으면 사다리의 상세 후보(ladder.details)에서 그 항목을 그대로 — 일반 배치의 「서브에 이미 든 말·날짜 줄 분리」 추림을 타지 않는다
    //   (에브리타임 홈배너 1:1309 「모집기간: …」 둘째 줄 · 캐치 이미지형 기타문구 — 10-15 틀 확장). 행 수는 틀 칸 폭·글꼴 폭으로
    const moldDetailSrc = (() => {
      if (!MR.detail?.items) return detailLines;
      const dpx = pxOf(MR.detail), wr = t => Math.max(1, Math.ceil(textWidth(t) * dpx * 1.02 / Math.max(1, rowW(MR.detail)))), sep0 = MR.detail.labelSep ?? ' :';   // 행 수는 상세 행 자체의 폭으로(열 폭이 아니라 — 블라인드 게시글 열 498 vs 상세 행 600, 네이버 479 vs 714; 10-15 저녁)
      const seen = new Set();
      const cap0 = MR.detail.lines ?? 3;
      // 라벨 열 + 값 열(mold.rows.detail.labelCol — 네이버 DA 107:657 「모집 기간 | 값」「모집 직무 | 값」, 10-16 오후): 행 수는 값 열 폭으로. 날짜(접수기간)는 한 줄(줄바꿈 금지 — 107:657 「2.28(수) - 3.10(일)」, 값 열 밖으로 나가도 칸 위쪽이라 그림과 안 겹침)
      const wrc = t => Math.max(1, Math.ceil(textWidth(t) * dpx * 1.02 / Math.max(1, MR.detail.valueW ? Math.round(MR.detail.valueW * k) : rowW(MR.detail) - Math.round((MR.detail.labelCol ?? 0) * k))));   // 값 열 폭 = valueW(107:657 직무 값 상자 240) 또는 칸 폭 − 라벨 열
      const rowOf = (label, value) => MR.detail.labelCol ? { label, value, inline: true, col: true, rows: label === '접수기간' ? 1 : wrc(String(value)) } : MR.detail.labelRow ? { label, value, inline: false, rows: 1 + wr(String(value)) } : { label, value, inline: true, rows: wr(`${label}${sep0} ${value}`) };
      const rows0 = (ladder.details ?? []).filter(d => MR.detail.items.includes(d.label) && d.value && !seen.has(d.label) && seen.add(d.label))
        .map(d => {   // 접수기간이 칸에 안 들어가면 짧은 날짜 후보(「~10.12(일)」 — ladder.date)로 — 에브리타임 홈배너 1줄 칸 344px(케이뱅크 「모집기간: 10/27(월) 17시까지」)
          // 그 밖의 항목(모집직무 등)도 칸에 안 들어가면 짧은 후보 — 괄호 속 설명을 빼고(「일반(사업, 재무 등), 보훈(사업/경영지원)」 → 「일반, 보훈」), 그래도 넘치면 앞 항목만(10-22 루프 r1: 네이버 1250 직무 줄 잘림 A·C 공통)
          const shortOf = v => { const s0 = String(v), s1 = s0.replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim(), items = s1.split(/\s*[,·/]\s*/).filter(Boolean); return [s0, s1, ...items.slice(0, -1).map((_, i) => items.slice(0, items.length - 1 - i).join(', ') + ' 외')].filter((x, i, a) => x && a.indexOf(x) === i); };
          const cands = d.label === '접수기간' ? [...new Set([d.value, ...(ladder.date ?? [])])] : shortOf(d.value);
          const opts = cands.map(v => rowOf(d.label, v));
          return { ...(opts.find(r => r.rows <= cap0) ?? opts[0]), _opts: opts };
        });
      // 합계도 칸 안에(줄 사이 간격 몫 0.25줄씩) — 넘치면 가장 긴 행부터 다음 짧은 후보로(10-22 네이버 1250: 접수기간 1 + 직무 3 + 간격 > 4줄 칸)
      { const gapRows = MR.detail.labelCol ? 0.25 : 0;   // 라벨 열 틀(네이버 DA)만 행 사이 간격(8px ≈ 0.25줄)이 있다 — 자소설·캐치는 간격 0
        const total = () => rows0.reduce((a, r) => a + r.rows, 0) + Math.max(0, rows0.length - 1) * gapRows;
        for (let guard = 0; guard < 8 && rows0.length && total() > cap0; guard++) {
          const i = rows0.reduce((bi, r, j) => (r._opts.findIndex(o => o.value === r.value) < r._opts.length - 1 && (bi < 0 || r.rows > rows0[bi].rows) ? j : bi), -1); if (i < 0) break;
          const r = rows0[i], k0 = r._opts.findIndex(o => o.value === r.value); rows0[i] = { ...r._opts[k0 + 1], _opts: r._opts };
        } }
      for (const r of rows0) delete r._opts;
      // 틀 상세 자리에 정보가 없으면 샘플 문구 자리표시(data-sample — 지어내지 않고 승인 전에 바꾼다, 10-15 저녁: 블라인드 게시글 「모집 직무를 입력하세요」)
      if (!rows0.length && ctx.kind === 'recruit' && SAMPLE_COPY?.detail && MR.detail.items.includes(SAMPLE_COPY.detail.label)) { sampleText.add(SAMPLE_COPY.detail.value); return [rowOf(SAMPLE_COPY.detail.label, SAMPLE_COPY.detail.value)]; }
      return rows0;
    })();
    if (MR.detail && moldDetailSrc.length) {
      const dR0 = { ...MR.detail, ...(MR.detail.byMainLines?.[String(mainN)] ?? {}) };   // PC메인: 메인 2줄이면 상세는 둘째 줄부터 2행(「메인 문구가 두 줄인 경우 상세 1행 입력 불가」)
      // 채용공고(160×600): 상세 블록은 마지막 메인 줄 y + 57.5 — 메인 줄 수 따라 내려간다(샘플 6개 전수 실측, 세아 메인 3줄 185.7 → 242.8)
      const dR = (dR0.afterMain != null && mR) ? { ...dR0, y: mR.y + (mainN - 1) * (mR.pitch ?? mR.px * 1.2) + dR0.afterMain } : dR0;
      const dLw = dR.labelWeight ?? 700; const cap = dR.lines ?? 3;
      const rows = []; let n = 0;
      for (const d of moldDetailSrc.filter(d => !dR.items || dR.items.includes(d.label))) { if (n + d.rows > cap) break; n += d.rows; rows.push(d); }   // 틀이 정한 항목만(세아: 모집일정·모집직무 — 고용형태 줄 없음)
      const sep = dR.labelSep ?? ' :';   // M메인 샘플 「접수기간 ㅣ 값」(FITI 1:10459) — 라벨 뒤 구분자
      // 알약 칩 라벨(mold.rows.detail.chip — 구글 ABL 「모집분야」 흰 칩 Bold #0074E5 + 값 SemiBold/Medium, 세로형은 칩 아래 가운데 여러 줄, 10-15 저녁): 라벨은 칩에, 상세 행은 값만
      const CH = dR.chip ?? null;
      if (CH && rows.length) {
        const cx = Math.round(CH.x * k), cy = Math.round(CH.y * k), cw = Math.round(CH.w * k), chh = Math.round(CH.h * k), cpx = Math.round(CH.px * k), crad = Math.round((CH.radius ?? chh / 2) * k);
        const plain = CH.bg === 'none';   /* 10-16 사용자 「라운드 없애 줘」(에브리타임 홈카드·구글 300×1050 「모집분야」 알약) — 상자 없이 라벨 글자만, 같은 자리·크기, 왼쪽 맞춤, 상세 글자색 */
        const cfg = plain ? detailFg : CH.color === 'brand' ? (p.primary ?? field?.stops?.[0] ?? '#000000') : (CH.color ?? '#000000'), cbg = plain ? 'transparent' : (CH.bg ?? '#FFFFFF');
        const ctext = CH.text ?? labelOf(rows[0].label);
        used.chip = { y: Math.round(CH.y * k * 10) / 10, px: cpx, pitch: chh, lines: 1, weight: CH.weight ?? 700, top: cy, x: cx, w: cw, align: plain ? 'left' : 'center', text: ctext, plain };
        blocks.push({ t: cy, h: chh, html: `<div data-field="chip"${plain ? '' : ' data-chip="1"'} style="position:absolute;left:${cx - sx}px;top:@@px;width:${cw}px;height:${chh}px;display:flex;align-items:center;justify-content:${plain ? 'flex-start' : 'center'};border-radius:${plain ? 0 : crad}px;background:${cbg};color:${cfg};font-size:${cpx}px;line-height:${chh}px;font-weight:${CH.weight ?? 700};white-space:nowrap">${esc(ctext)}</div>` });
        fired(plain ? 'templateMold.plainLabel' : 'templateMold.chipLabel');
      }
      // 라벨 열 + 값 열(labelCol): 항목마다 flex 행 — 라벨은 고정 폭 열(Bold), 값은 나머지. 값이 2줄이면 행간 valueLh(130%), 1줄이면 1.2. 항목 사이 gap
      const dpx2 = pxOf(dR), colW = Math.round((dR.labelCol ?? 0) * k), gapPx = Math.round((dR.gap ?? 8) * k);
      const lhOf = d => Math.round(dpx2 * (d.rows > 1 ? (dR.valueLh ?? 1.3) : 1.2) * 10) / 10;
      const colH = dR.labelCol ? rows.reduce((a, d, i) => a + d.rows * lhOf(d) + (i < rows.length - 1 ? gapPx : 0), 0) : 0;
      if (dR.labelCol && rows.length) fired('templateMold.labelCol');
      const inner = (CH || dR.valuesOnly)   /* valuesOnly: 라벨 없이 값만(인스타 1080 수정본 10-16 — 직무 값 가운데 2줄). 쉼표 항목 안에서는 안 끊는다(「상품/계리/리스크」가 / 에서 갈라지지 않게) */
        ? rows.map(d => `<div>${dR.valuesOnly ? String(d.value).split(/,\s*/).map(it => `<span style="white-space:nowrap">${esc(nb(it))}</span>`).join(', ') : esc(nb(d.value))}</div>`).join('')
        : dR.labelCol
        ? rows.map((d, i) => `<div style="display:flex;align-items:flex-start;line-height:${lhOf(d)}px;${i < rows.length - 1 ? `margin-bottom:${gapPx}px;` : ''}"><b style="flex:0 0 ${colW}px;font-weight:${dLw}">${esc(labelOf(d.label))}</b><span style="flex:1 1 auto;min-width:0${d.label === '접수기간' ? ';white-space:nowrap' : dR.valueW ? `;max-width:${Math.round(dR.valueW * k)}px` : ''}">${esc(nb(d.value))}</span></div>`).join('')
        : rows.map(d => d.inline
        ? `<div><b style="font-weight:${dLw}">${esc(labelOf(d.label))}${esc(sep)}</b> ${esc(nb(d.value))}</div>`
        : `<div><b style="font-weight:${dLw}">${esc(labelOf(d.label))}</b></div><div${align === 'center' ? ' style="text-wrap:balance;word-break:keep-all;overflow-wrap:normal"' : ''}>${align === 'center' ? String(d.value).split(/,\s*/).map(it => `<span style="white-space:nowrap">${esc(nb(it))}</span>`).join(', ') : esc(nb(d.value))}</div>`).join('');   /* 가운데 정렬 틀(NAP 320×480 수정본 10-16)은 값 줄을 쉼표 항목 단위로 고르게 */
      // 「상세 입력 시 하단부터」(M메인 템플릿 1:8625): 쓰는 줄이 적으면 아래 줄부터 채운다 — 블록 y 를 빈 줄만큼 내린다
      const dRow = dR.fillFromBottom ? { ...dR, y: dR.y + Math.max(0, cap - n) * (dR.pitch ?? dR.px * 1.2) } : dR;
      if (rows.length) put('detail', dRow, dR.labelCol ? Math.min(cap, Math.max(1, Math.ceil(colH / pitchOf(dR)))) : Math.min(cap, Math.max(1, n)), dR.weight ?? fwOf('detailValue', pxOf(dR)), detailFg, `<div style="text-wrap:${dR.valuesOnly ? 'balance' : 'pretty'}${dR.valuesOnly ? ';word-break:keep-all;overflow-wrap:normal' : ''}">${inner}</div>`, rows.map(d => d.value).join(' '));   /* valuesOnly(인스타 가운데 2줄)는 두 줄 길이를 고르게 */
      if (used.detail) Object.assign(used.detail, { items: rows.map(d => ({ label: labelOf(d.label), value: String(d.value ?? ''), rows: d.rows ?? 1, col: !!d.col, inline: !!d.inline })), labelCol: Math.round((dR.labelCol ?? 0) * k), valueW: MR.detail.valueW ? Math.round(MR.detail.valueW * k) : null, gap: dR.labelCol ? Math.round((dR.gap ?? 0) * k) : 0 });   /* 겹침 교정(overlapFix)이 행마다 실제 글자 폭을 어림하려고 — 라벨 열·값 열 폭·줄 수 */
    }
    if (MR.date && mR && (copy.date || ctx.core?.deadline || ctx.kind === 'recruit')) {   // 달력 마감일 줄(1:8706~8776): 마지막 메인 줄 y + 59.3, Regular 32(2배), 「~5/26」(0 없이). 이 줄만 색이 달라도 된다 — 지금은 같은 색
      const dl = String(ctx.core?.deadline ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      let txt = (MR.date.format === '~M/D' && dl) ? `~${+dl[2]}/${+dl[3]}` : (copy.date || '');
      if (!txt && !ctx.core?.deadline && SAMPLE_COPY?.date) { txt = SAMPLE_COPY.date; sampleText.add(txt); }   // 틀 날짜 자리 샘플 문구 자리표시(data-sample)
      // 틀 날짜 칸이 좁으면(구글 ABL 580 날짜 158px 1줄) 짧은 날짜 후보(「~10.31(토)」 — ladder.date)로(10-15 저녁)
      if (txt && MR.date.lines && rowsIn(txt, MR.date) > MR.date.lines) { const alt = [...new Set([txt, ...(ladder.date ?? [])])].find(c => rowsIn(c, MR.date) <= MR.date.lines); if (alt) txt = alt; }
      // 날짜 알약(mold.rows.date.chip — NAP HS화성 샘플: 브랜드색 바탕 radius 200 · 흰 글자 Bold 10/12 · 안쪽 8 · 높이 24/26, 10-15 밤): 폭은 글자대로(hug), 어두운 지면이면 흰 바탕 + 브랜드색 글자
      const DC = MR.date.chip ?? null;
      const dateRow = { ...MR.date, y: MR.date.afterMain != null ? mR.y + (mainN - 1) * (mR.pitch ?? mR.px * 1.2) + MR.date.afterMain : MR.date.y, ...(DC ? { chip: true, pitch: DC.h } : {}) };
      const dateInner = (DC && txt) ? (() => { const ch = Math.round(DC.h * k), padX = Math.round((DC.padX ?? 8) * k), rad = Math.round((DC.radius ?? 200) * k); const brand = p.primary ?? field?.stops?.[0] ?? '#000000'; const bg = DC.bg === 'brand' ? (fgIsDark ? brand : '#FFFFFF') : (DC.bg ?? brand), fg = DC.bg === 'brand' ? (fgIsDark ? (DC.color ?? '#FFFFFF') : brand) : (DC.color ?? '#FFFFFF'); fired('templateMold.dateChip'); const cw = DC.w != null ? Math.round(DC.w * k) : null; return `<span data-chip="1" style="display:inline-flex;align-items:center;${cw ? `width:${cw}px;justify-content:${DC.align === 'left' ? 'flex-start' : 'center'};box-sizing:border-box;` : ''}height:${ch}px;padding:0 ${padX}px;border-radius:${rad}px;background:${bg};color:${fg};white-space:nowrap">${esc(txt)}</span>`; })() : esc(txt);   // DC.w: 고정 폭 상자(비씨월드 구글 날짜 상자 271×38 — 글자 가운데/왼쪽, 10-16)
      if (txt) put('date', dateRow, MR.date.lines ?? 1, MR.date.weight ?? fwOf('date', pxOf(MR.date)), subFg, dateInner, txt);
    }
    // 태그 칩 행(mold.rows.tags — 잡다 PC 1:6026 「태그문구」 칸: y174 칩 h24 글자 12 SemiBold, 모서리 4, 안쪽 8, 칩 간격 8 · 샘플 5/8). 글감은 고용형태·직무 조각, 칸 폭에 들어가는 만큼. 칩 색은 기존 가이드(chipStyleOf)
    if (MR.tags && (ctx.core?.employType || ctx.core?.role)) {
      const tg = MR.tags, tpx = pxOf(tg), th = Math.round((tg.h ?? tg.px * 2) * k), padX = Math.round((tg.padX ?? 8) * k), gap = Math.round((tg.gap ?? 8) * k), rad = Math.round((tg.radius ?? 4) * k);
      const toks = [...new Set([...String(ctx.core.employType ?? '').split(/\s*[,·\/]\s*/), ...String(ctx.core.role ?? '').split(/\s*,\s*/)].map(t => t.trim()).filter(t => t && t.length <= 14))];   // 고용형태는 「신입·경력」을 둘로(호남대 「정규직원」「경력」), 직무는 쉼표로만(A5: 「경영·제품·사업 분야」 한 항목)
      // 여러 줄(tg.rows — 구글 템플릿 580·300 「상세 문구」 칩 2×2, 10-16)·평문(tg.plain — 한국앤컴퍼니 샘플 「Sales · Business · R&D」 점 구분, 칩 바탕 없음)
      const tRows = Math.max(1, tg.rows ?? 1), rowGap = Math.round((tg.rowGap ?? 2) * k), tagW = tg.w != null ? Math.round(tg.w * k) : colW, plain = !!tg.plain, dotW = plain ? Math.round(tpx * 0.22) : 0, dotGap = plain ? Math.round(tpx * 0.55) : 0;
      const items = []; let used0 = 0, rowN = 1;
      for (const t of toks) { const cw = Math.round(textWidth(t) * tpx) + (plain ? 0 : padX * 2); const sep = items.length ? (plain ? dotW + dotGap * 2 : gap) : 0;
        if (used0 + cw + sep > tagW) { if (rowN >= tRows) break; rowN++; used0 = cw; } else used0 += cw + sep;
        items.push(t); if (items.length >= (tg.max ?? 6)) break; }
      if (items.length) {
        const tw = tg.weight ?? fwOf('chip', tpx);
        const totalH = th * tRows + rowGap * (tRows - 1);
        const tagsX = tg.x != null ? Math.round(tg.x * k) - sx : 0;
        const justify = ALIGN_JUSTIFY[TA ?? tg.align ?? mold.align] ?? 'flex-start';   // TA: 정렬 프리셋(10-19)
        if (plain) fired('templateMold.tagsPlain');
        used.tags = { y: Math.round(tg.y * k * 10) / 10, px: tpx, pitch: th, lines: tRows, weight: tw, top: Math.round(tg.y * k * 10) / 10, items, plain };
        const dot = `<i data-dot="1" style="display:inline-block;width:${dotW}px;height:${dotW}px;border-radius:50%;background:${p.primary ?? chipFg};margin:0 ${dotGap}px;vertical-align:middle"></i>`;
        if (plain) {
          // 평문: 글 덩어리 하나(점으로 구분) — 긴 직무는 칸 안에서 자연 줄바꿈, 행간 = 칩 높이 + rowGap(템플릿 칩 간격 28/26), 최대 rows 줄
          const lhp = th + rowGap;
          const innerP = items.map((t, i) => `${i ? dot : ''}<span data-tag="1">${esc(nb(t))}</span>`).join('');
          blocks.push({ t: Math.round(tg.y * k * 10) / 10, h: totalH, html: `<div data-field="tags" data-tags-plain="1" style="position:absolute;left:${tagsX}px;top:@@px;width:${tagW}px;height:${lhp * tRows}px;font-size:${tpx}px;line-height:${lhp}px;font-weight:${tw};color:${(fgIsDark && tg.color) ? tg.color : mainFg};text-align:${TA ?? (justify === 'center' ? 'center' : 'left')};${WRAP};overflow:hidden">${innerP}</div>` });
        } else {
          const inner = items.map(t => `<b data-chip="1" style="display:inline-flex;align-items:center;height:${th}px;padding:0 ${padX}px;border-radius:${rad}px;font-size:${tpx}px;line-height:${th}px;font-weight:${tw};background:${chipBgCss};color:${chipFg};white-space:nowrap">${esc(t)}</b>`).join('');
          blocks.push({ t: Math.round(tg.y * k * 10) / 10, h: totalH, html: `<div data-field="tags" style="position:absolute;left:${tagsX}px;top:@@px;width:${tagW}px;height:${totalH}px;display:flex;${tRows > 1 ? `flex-wrap:wrap;gap:${rowGap}px ${gap}px;` : `gap:${gap}px;`}align-items:center;align-content:flex-start;justify-content:${justify};overflow:hidden">${inner}</div>` });
        }
      }
    }
    const top00 = blocks.length ? Math.min(...blocks.map(b => b.t)) : 0, bot0 = blocks.length ? Math.max(...blocks.map(b => b.t + b.h)) : 0;
    // 세로 가운데(mold.vCenter — NAP 띠배너 HS화성 샘플 77:497·77:518: 글 덩어리(메인 + 날짜 알약)가 지면 세로 가운데. 줄 수·알약 유무에 따라 덩어리째 움직인다, 10-15 밤 사용자 「텍스트 위아래 미들로」)
    const vOff = (mold.vCenter && blocks.length) ? Math.round((h / 2 - (top00 + bot0) / 2) * 10) / 10 : 0;
    if (vOff) { for (const b of blocks) b.t = Math.round((b.t + vOff) * 10) / 10; for (const u of Object.values(used)) { u.top = Math.round((u.top + vOff) * 10) / 10; u.y = Math.round((u.y + vOff) * 10) / 10; } fired('templateMold.vCenter'); }
    const top0 = top00 + vOff, bot = bot0 + vOff;
    if (mold.font) fired('templateMold.font');   // 틀 글꼴(mold.font — NAP HS화성 샘플 A2Z 7 Bold = 에이투지체, 10-15 밤): 틀 글 덩어리에만
    const textCol = `<div data-text-col="1" style="position:absolute;left:${sx}px;top:${top0}px;width:${colW}px;height:${Math.round((bot - top0) * 10) / 10}px${mold.font ? `;font-family:${fontStack(mold.font)}` : ''}">${blocks.map(b => b.html.replace('top:@@px', `top:${Math.round((b.t - top0) * 10) / 10}px`)).join('\n')}</div>`;
    // 지면 처리가 영역이면(PC메인 왼쪽 350×280) 브랜드 지면은 그 영역에만 — 나머지는 템플릿 고정 바탕(bgCss)
    const fz = mold.field ? rect(mold.field, k) : null;
    const moldField = (fz && field) ? `<div data-mold-field="1" style="position:absolute;left:${fz.x}px;top:${fz.y}px;width:${fz.w}px;height:${fz.h}px;background:${field.css}"></div>` : '';
    // 그림: 칸(mold.image)의 위치·범위만 틀이 정하고, 처리는 기존 디자인 가이드 그대로(10-15 사용자 정정) — 모서리 상자(contain / 바탕 있는 그림은 cover + 글자 쪽 두 변 녹임),
    //   하단 띠(native/contain/cover + 윗변 녹임), 왼쪽 열(cover + 오른변 녹임). 사각형으로 뚝 잘라 넣지 않는다 — tplObject(위 템플릿 칸 문법)를 그대로 쓴다
    // KV: 자유 배치면 일반 경로와 같은 그림(오른쪽 열 bleedRight · 아래 띠 bleedBottom · 가이드 모서리/누끼 상자는 tplObject), 자소설은 샘플 그림 칸(tplObject)
    if (moldFreeKv) fired('templateMold.freeKv');
    const moldKv = kvWrap((AM && AM.kv !== 'keep' && AM.kv && imgCorner) ? alignObjectHtml(tplObject, TA) : tplObject);   // 정렬 프리셋(10-19): 거울 모서리 칸은 녹임 방향·배경 위치 낱말도 뒤집는다(왼쪽 열·아래 띠는 기존 분기가 그대로 맞다)
    TR.mode = 'templateMold';
    TR.place = { ...TR.place, mode: 'mold', tImage, imgCol: imgLeftCol ? 'left' : imgRightCol ? 'right' : imgBottomBand ? 'bottom' : imgCorner ? 'corner' : null, zone: { ...(TR.place?.zone ?? {}), col: { x: sx, y: top0, w: colW, h: Math.round(bot - top0) }, cut: null, side: 'template', align: TA ?? mold.align ?? 'left', v: 'top', margin: { left: sx, top: top0, right: w - sx - colW, bottom: h - bot } } };
    TR.copy = { ...(TR.copy ?? {}), sub: used.sub ? copy.sub : null, date: used.date ? copy.date : (TR.copy?.date ?? null), details: used.detail ? moldDetailSrc.map(d => d.label) : [] };
    TR.mold = { source: mold.source ?? null, rows: used, mainN, field: fz, logo: tLogo, image: tImage, labels: { period: labelOf('접수기간') }, color: moldFg };
    if (FIX?.textK && FIX.textK < 1) fired('overlapFix.text');
    // 글자 덩어리 어림 상자(겹침 교정 overlapFix): 틀 행마다 top·피치·줄 수, 폭은 글자 폭(textWidth×px×1.04, 행 폭 안) — 정렬대로 x
    { const rows = [];
      for (const [role, u] of Object.entries(used)) {
        if (role === 'detail' && u.items?.length) {   // 상세: 항목마다 「라벨 열 + 값 열(valueW 안에서 접힘)」 또는 「라벨 : 값」 한 줄 — 실제 글자 폭으로(칸 폭 740 전체로 잡으면 네이버 DA 그림 칸까지 닿아 거짓 겹침·반대로 값이 그림 밑으로 길게 흐르는 건 잡아야 한다)
          let yy = u.top;
          for (const it of u.items) { const valW = Math.round(textWidth(it.value) * u.px * 1.04), colW2 = u.valueW ?? Math.max(1, u.w - u.labelCol);
            const n = Math.max(1, it.rows ?? 1);
            for (let i = 0; i < n; i++) { const rw = it.col ? Math.min(u.w, u.labelCol + Math.min(colW2, n > 1 && i < n - 1 ? colW2 : valW)) : Math.min(u.w, it.inline ? Math.round(textWidth(`${it.label} : ${it.value}`) * u.px * 1.04) : Math.max(Math.round(textWidth(it.label) * u.px * 1.04), Math.min(valW, u.w)));
              rows.push({ role, x: u.x, y: Math.round(yy * 10) / 10, w: rw, h: u.pitch }); yy += u.pitch; }
            yy += u.gap ?? 0; }
          continue; }
        const lines = role === 'main' ? String(u.text ?? '').split('\n') : [String(u.text ?? '')]; const n = Math.max(1, Math.min(u.lines ?? 1, role === 'main' ? lines.length : (u.lines ?? 1)));
        for (let i = 0; i < n; i++) { const t = role === 'main' ? lines[i] ?? '' : (lines[0] ?? ''); const rw = role === 'tags' ? u.w : role === 'detail' ? Math.min(u.w, Math.round(Math.max(0, ...(detailLines ?? []).map(d => textWidth(`${labelOf(d.label)} : ${d.value ?? ''}`))) * u.px * 1.04) || u.w) : Math.min(u.w, Math.round(textWidth(t) * u.px * 1.04) || u.w);   /* 상세 행 폭 = 가장 긴 「라벨 : 값」 글자 폭(행 폭 전체로 잡으면 그림 칸까지 닿아 거짓 겹침 — 자소설 팝업) */ const x = u.align === 'center' ? u.x + (u.w - rw) / 2 : u.align === 'right' ? u.x + u.w - rw : u.x; rows.push({ role, x: Math.round(x), y: Math.round((u.top + i * u.pitch) * 10) / 10, w: rw, h: u.pitch }); } }
      TR.textBox = { v: 'mold', align: mold.align ?? 'left', rows }; }
    TR.fonts = { ...TR.fonts, main: used.main ? { ...(TR.fonts?.main ?? {}), px: used.main.px, weight: used.main.weight, lh: Math.round(used.main.pitch / used.main.px * 100) / 100, lines: mainN } : TR.fonts?.main, sub: used.sub ? { ...(TR.fonts?.sub ?? {}), px: used.sub.px, weight: used.sub.weight, lh: Math.round(used.sub.pitch / used.sub.px * 100) / 100 } : null, detail: used.detail ? { ...(TR.fonts?.detail ?? {}), px: used.detail.px, value: used.detail.weight, lh: Math.round(used.detail.pitch / used.detail.px * 100) / 100 } : null, logoCapW: null };
    return `${open('')}
${moldField}${moldKv}${scrimEl}${bandEl}
${textCol}
${tplLogo}
</div>`;
  }

  /* ── 세로 스택 ── [로고] / (서브 위) / 메인 / (서브 아래) / [날짜·라벨 알약] / 상세 / 부가 / CTA / 고지 */
  const parts = [];
  const head = parts;                 // 로고·서브·메인·알약
  const tail = [];                    // 상세·부가·CTA·고지 (우하단 이미지 옆 열로 갈 수 있는 것들)
  const lg = flexLogo ? logoImg(Math.round(z.logoH * logoTallK), Math.round(innerW * Math.min(0.42, Math.max(0.16, D?.logoSizeRatio ?? 0.3)))) : '';
  const logoRow = lg ? `<div style="flex:none;display:flex;justify-content:${logoRowJustify};height:${Math.round(z.logoH * logoTallK)}px;${logoAtBottom ? 'margin-top:auto;padding-top:8px' : `margin-bottom:${Math.round(z.logoH * 0.7)}px`}">${lg}</div>` : '';
  if (lg && !logoAtBottom) parts.push(logoRow);
  else if (want.advertiser) parts.push(T('advertiser', copy.advertiser, z.smallFs, fwOf('eyebrow', z.smallFs), subFg, `margin-bottom:${Math.round(z.smallFs * 0.5)}px`));
  const subLh = useRef ? L.subLine : line;
  if (showSub && subAbove) parts.push(T('sub', copy.sub, z.subFs, fwOf('eyebrow', z.subFs), subFg, `margin-bottom:${subGap(z)}px`, Math.min(slots.sub.lines ?? 2, 2), subLh));
  if (guide?.dateAbove) parts.push(metaRow().replace(/margin-top:\d+px/, `margin-bottom:${Math.max(8, Math.round(z.smallFs * 0.5))}px`));   // 잡다: 라벨 칩 + 날짜가 메인 위(샘플 PC 5/5 · MO 4/5, 10-12 매체별 규격정리)
  parts.push(T('main', copy.main, mainFs, fwOf('main', mainFs), mainFg, (useRef ? 'text-wrap:balance' : '') + (mainW > textW ? `;width:${mainW}px;max-width:none` : ''), mainLines, mainLine));
  if (showSub && !subAbove) parts.push(T('sub', copy.sub, z.subFs, fwOf((ladder.date ?? []).includes(copy.sub) ? 'date' : 'slogan', z.subFs), subFg, `margin-top:${useRef ? subGap(z) : 6}px${subW > textW ? `;width:${subW}px;max-width:none` : ''}`, Math.min(slots.sub.lines ?? 2, 2), subLh));
  if (!guide?.dateAbove) parts.push(metaRow());
  tail.push(detailBlock());
  if (want.extra) tail.push(T('extra', copy.extra, z.smallFs, fwOf('extra', z.smallFs), subFg, 'margin-top:6px', Math.min(slots.extra.lines ?? 1, 2)));
  if (want.cta) tail.push(`<div style="flex:none;margin-top:${Math.round(z.ctaFs * 0.6)}px;text-align:${align}">${ctaChip()}</div>`);
  if (want.notice) tail.push(T('notice', copy.notice, noticeFs, fwOf('notice', noticeFs), subFg, `${logoAtBottom ? '' : 'margin-top:auto;'}padding-top:6px;opacity:.9`, noticeLines));
  if (lg && logoAtBottom) tail.push(logoRow);
  if (!(imgCorner && hasKv)) {
    if (distribute && !anchorJ && (splitGap || towerCopyOnly)) { const at = (lg && !logoAtBottom) ? 1 : 0; parts.splice(at, 0, `<div style="flex:${towerCopyOnly ? 1 : 0.8} 1 auto;min-height:0"></div>`); }
    if (distribute && !anchorJ) parts.push('<div style="flex:1 1 auto;min-height:0"></div>');
    parts.push(...tail);
  }

  // 우하단 이미지 상자 옆으로 글자가 흐르게: 텍스트 열을 블록으로 두고 이미지 자리에 float 스페이서를 세운다(세아제강 팝업 — 메인은 전폭, 상세는 이미지 왼쪽).
  // 우하단 이미지(자소설 팝업·M메인): 메인·서브는 일러스트 위를 전폭으로, 상세·부가는 일러스트 왼쪽 고정 폭 열에 (세아제강)
  const textCol = (imgCorner && hasKv)
    ? `<div data-text-col="1" style="position:relative;flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;${anchorJ ? `justify-content:${anchorJ};` : ''}${textOff}align-items:${align === 'center' ? 'center' : 'stretch'}">${head.filter(Boolean).join('\n')}<div style="width:${detailW}px;max-width:100%">${tail.filter(Boolean).join('\n')}</div></div>`
    : `<div data-text-col="1" style="position:relative;flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;justify-content:${anchorJ ?? ((useRef ? vCenter : tall && objectSide === 'none') ? 'center' : 'flex-start')};${textOff}align-items:${align === 'center' ? 'center' : 'stretch'}">${parts.filter(Boolean).join('\n')}</div>`;

  // 이미지는 글자보다 먼저 그린다(아래에 깔린다). 글자 열 옆·아래에는 같은 크기의 빈 자리만 남긴다.
  if (objectSide === 'bottom') {
    return `${open('flex-direction:column;gap:12px')}
${kvWrap(bleedBottom(objH))}${scrimEl}
${textCol}
<div style="flex:none;height:${objReserve}px"></div>
${bandEl}${logoWrap(absLogoEl)}
</div>`;
  }
  return `${open(`flex-direction:${mirrorX ? 'row-reverse' : 'row'};gap:` + Math.round(innerW * 0.04) + 'px;align-items:stretch')}
${objectSide === 'right' ? kvWrap(mirrorLayer(bleedRight(objW))) : ''}${kvWrap(tplObject)}${scrimEl}
${textCol}${objectSide === 'right' ? `<div style="flex:none;width:${objW}px"></div>` : ''}
${tplLogo}${bandEl}${logoWrap(absLogoEl)}
</div>`;
}
