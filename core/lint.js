// 매체 규칙 검사기 — 순수 함수. (불변식 ⑥ 위반은 조용히 넘기지 않는다)
//
// 입력은 "측정값"이다. 픽셀·바이트·줄 수·색은 앱(브라우저)이 재고, 여기서는 규칙과 비교만 한다.
// 그래서 Node 테스트로 규칙 하나하나를 고정할 수 있고, 측정 방법이 바뀌어도 규칙은 그대로다.
//
// measure = {
//   w, h,                 제출 파일 픽셀
//   bytes, format,        제출 파일 크기(byte)·확장자
//   transparent,          알파 채널 사용 여부 (true/false/null=측정 못 함)
//   fontFamily,           본문에 실제 적용된 글꼴
//   texts: [{ role, text, lines, fontPx, color, bbox:{x,y,w,h} }],   bbox는 캔버스(1배) 좌표
//   logo: { bbox } | null,
//   logoCount,            화면에 실제로 그려진 로고 수 (null=측정 못 함)
//   bgColors,             바탕 샘플색 hex 목록 — 글자·로고·그림 상자를 피한 점 (null=측정 못 함)
//   assetPx: [w,h],       전달물(spec.asset) 원본 파일 픽셀 (null=측정 못 함)
//   client,               캠페인 고객사명(광고주) — 메인카피 광고주 노출 검사(spec.mainMustIncludeClient)에 쓴다. 없으면 ctx.core.client, 둘 다 없으면 측정 못 한 것
// }
// 측정 못 한 값(null)은 위반이 아니다 — "모름"과 "틀림"을 섞으면 검사기를 못 믿게 된다.
//
// level: block = 승인·추출을 막는다 / warn = 표시만, 사람이 넘길 수 있다.

import { limitsByRole, countChars, inImage } from './adfields.js';
import { CANON } from './canon.js';
import { fontRuleOf } from './fonts.js';

const norm = c => String(c ?? '').trim().toLowerCase().replace(/^#?/, '#');
const fmtNorm = f => ({ jpeg: 'jpg' })[String(f ?? '').toLowerCase()] ?? String(f ?? '').toLowerCase();

export function submitSize(spec) {
  const scale = spec.exportScale ?? 1;
  return {
    w: spec.submitW ?? spec.exportW ?? (spec.w != null ? spec.w * scale : null),
    h: spec.submitH ?? spec.exportH ?? (spec.h != null ? spec.h * scale : null),
  };
}

// 색 차 — CIE76 ΔE(Lab). 배경 금지색이 「같은 색」인지(ΔE ≤ 1, 사람 눈에 구분 안 됨) 가르는 데만 쓴다
const rgbOfHex = hx => {
  let h = norm(hx); if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + [...h.slice(1)].map(c => c + c).join('');
  return /^#[0-9a-f]{6}$/i.test(h) ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : null;
};
const labOf = ([r, g, b]) => {
  const lin = c => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
  const R = lin(r), G = lin(g), B = lin(b);
  const f = v => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047), y = f(R * 0.2126 + G * 0.7152 + B * 0.0722), z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
export function deltaE(a, b) {
  const A = rgbOfHex(a), B = rgbOfHex(b); if (!A || !B) return null;
  const la = labOf(A), lb = labOf(B);
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}
// 고객사명 비교용 — 띄어쓰기·보이지 않는 줄바꿈 문자·법인 표기(주식회사·(주)·㈜)를 지우고 소문자로
const squashName = s => String(s ?? '').replace(/[\u2060\u200B\u00AD]/g, '').replace(/주식회사|\(주\)|㈜/g, '').replace(/\s+/g, '').toLowerCase();

export function lintArtifact({ spec, medium, measure, ctx = null }) {
  const issues = [];
  const block = (code, msg, role) => issues.push({ level: 'block', code, msg, role });
  const warn = (code, msg, role) => issues.push({ level: 'warn', code, msg, role });
  const verdict = () => ({ level: issues.some(i => i.level === 'block') ? 'block' : issues.some(i => i.level === 'warn') ? 'warn' : 'pass', issues });

  // 전달물 규격(spec.asset — 자소설 M시작배너 로고·이미지 파일): 완성 소재가 아니라 원본 파일을 넘기므로 치수·글자 검사 대신 원본 최소 폭·포맷만 본다
  if (spec.asset) {
    const px = measure.assetPx;
    if (spec.asset.minW != null && Array.isArray(px) && px[0] != null && px[0] < spec.asset.minW) block('asset-min', `${spec.asset.item ?? '파일'} 원본 가로 ${px[0]}px — 규정 최소 ${spec.asset.minW}px (더 큰 원본을 받아야 함)`);
    const allowedA = (spec.format ?? []).map(fmtNorm);
    if (allowedA.length && measure.format != null && !allowedA.includes(fmtNorm(measure.format))) block('format', `${String(measure.format).toUpperCase()} — 허용 포맷 ${allowedA.map(f => f.toUpperCase()).join('/')}`);
    return verdict();
  }

  // ── 치수: 1px 차이도 반려된 실제 사례가 있다(구글 GDN 뷰웍스)
  const want = submitSize(spec);
  if (want.w != null && measure.w != null && (measure.w !== want.w || measure.h !== want.h)) {
    block('size', `치수 ${measure.w}×${measure.h} — 규격은 ${want.w}×${want.h}`);
  }

  // ── 포맷
  const allowed = (spec.format ?? []).map(fmtNorm);
  if (allowed.length && measure.format != null && !allowed.includes(fmtNorm(measure.format))) {
    block('format', `${String(measure.format).toUpperCase()} — 허용 포맷 ${allowed.map(f => f.toUpperCase()).join('/')}`);
  }

  // ── 용량
  if (spec.maxKB != null && measure.bytes != null && measure.bytes > spec.maxKB * 1024) {
    block('weight', `${(measure.bytes / 1024).toFixed(0)}KB — 상한 ${spec.maxKB}KB`);
  }
  if (spec.minKB != null && measure.bytes != null && measure.bytes < spec.minKB * 1024) {
    warn('weight-min', `${(measure.bytes / 1024).toFixed(0)}KB — 하한 ${spec.minKB}KB`);
  }

  // ── 글자수·줄 수 (역할별 슬롯)
  const by = limitsByRole((spec.textLimits ?? []).filter(inImage));   // 이미지 밖 글자는 소재 검사 대상이 아니다
  const counting = medium?.textCounting ?? 'all-1';
  for (const t of measure.texts ?? []) {
    const slot = by[t.role];
    if (!slot) continue;
    if (slot.maxChars != null && t.text != null) {
      const n = countChars(t.text, counting);
      if (n > slot.maxChars) block('chars', `${t.role} ${n}자 — 최대 ${slot.maxChars}자`, t.role);
    }
    if (slot.lines != null && t.lines != null && t.lines > slot.lines) {
      block('lines', `${t.role} ${t.lines}줄 — 최대 ${slot.lines}줄`, t.role);
    }
  }
  // 메인카피 광고주 노출(카카오 비즈보드 — spec.mainMustIncludeClient, 10-28 컨시어지 #5): 메인 텍스트에 고객사명이 없으면 차단.
  //   고객사명은 measure.client → ctx.core.client 순. 둘 다 없으면 측정 못 한 것(위반 아님). 메인 글자 자체가 없으면 그것도 여기서는 안 본다(줄 수·잘림 검사 몫)
  const client = measure.client ?? ctx?.core?.client ?? null;
  if (spec.mainMustIncludeClient && client) {
    const mains = (measure.texts ?? []).filter(t => t.role === 'main' && t.text != null);
    const c = squashName(client);
    if (mains.length && c && !mains.some(t => squashName(t.text).includes(c))) {
      block('main-client', `메인카피에 광고주 「${client}」 없음 — 이 규격은 메인문구에 광고주(고객사명) 노출 필수`, 'main');
    }
  }
  // 잘림: 렌더러가 줄 수 제한으로 문구를 말줄임했다 — 규격보다 문구가 길다는 뜻이라 그대로 내보내면 안 된다
  for (const t of measure.texts ?? []) {
    if (t.truncated) block('overflow', `${t.role} 문구가 지면에 다 들어가지 않아 잘림`, t.role);
  }

  // ── 글자색 — 규격 단위 값만 강제한다(카카오·NAP 비즈보드). 매체 단위 textColors는 "비즈보드 전용"·"흑/백 택1" 같은
  //    메모가 붙은 참고값이라 모든 규격에 걸면 디스플레이 광고까지 잘못 막는다. (NAP 비즈보드가 서브 색으로 나가 반려된 사례)
  const tc = spec.textColors;
  if (tc && (tc.main || tc.sub?.length)) {
    for (const t of measure.texts ?? []) {
      if (t.color == null) continue;
      if (t.role === 'main' && tc.main && norm(t.color) !== norm(tc.main)) {
        block('color', `메인 글자색 ${t.color} — 규정 ${tc.main}`, t.role);
      } else if (t.role === 'sub' && tc.sub?.length && !tc.sub.map(norm).includes(norm(t.color))) {
        block('color', `서브 글자색 ${t.color} — 규정 ${tc.sub.join('/')}`, t.role);
      }
    }
  }

  // 「모든 문구 1가지 색」(자소설 PDF p.5~11) — 매체 textColors.uniform. 규격이 풀어 준 역할(spec.textColors.freeRoles — PC달력 마감일)은 뺀다
  if (medium?.textColors?.uniform) {
    const free = new Set(spec.textColors?.freeRoles ?? []);
    const cols = [...new Set((measure.texts ?? []).filter(t => t.color != null && !free.has(t.role) && t.role !== 'notice').map(t => norm(t.color)))];
    if (cols.length > 1) block('text-colors-uniform', `글자색 ${cols.length}가지(${cols.map(c => c.toUpperCase()).join(' · ')}) — 이 매체는 모든 문구 한 색`);
  }

  // ── 글꼴 — 규격 fonts 가 매체 fonts 를 덮는다(core/fonts.js fontRuleOf: 카카오 비즈보드 Pretendard 고정 · PC디스플레이 spec.fonts.required:false = 자유, 10-28)
  const fontRule = fontRuleOf(medium, spec);
  if (fontRule.fixed && measure.fontFamily != null
      && !measure.fontFamily.toLowerCase().includes(String(fontRule.required).toLowerCase())) {
    warn('font', `글꼴 ${measure.fontFamily} — 규정 ${fontRule.required}`);
  }

  // ── 안전영역 (숫자로 적힌 경우만; 메모만 있으면 검사 안 함 — 추측 금지)
  const sa = spec.safeArea;
  if (sa && ['top', 'right', 'bottom', 'left'].some(k => typeof sa[k] === 'number') && spec.w && spec.h) {
    const box = { x0: sa.left ?? 0, y0: sa.top ?? 0, x1: spec.w - (sa.right ?? 0), y1: spec.h - (sa.bottom ?? 0) };
    const items = [...(measure.texts ?? []).map(t => ({ role: t.role, bbox: t.bbox })), ...(measure.logo ? [{ role: 'logo', bbox: measure.logo.bbox }] : [])];
    for (const it of items) {
      const b = it.bbox; if (!b) continue;
      if (b.x < box.x0 - 0.5 || b.y < box.y0 - 0.5 || b.x + b.w > box.x1 + 0.5 || b.y + b.h > box.y1 + 0.5) {
        block('safe-area', `${it.role} 상자가 안전영역(상${sa.top ?? 0}·하${sa.bottom ?? 0}·좌${sa.left ?? 0}·우${sa.right ?? 0}px)을 벗어남`, it.role);
      }
    }
  }

  // ── 글자 높이 범위 (에브리타임·네이버가 px로 정한다 — 글자가 작아 반려된 사례)
  const th = spec.textHeightPx;
  if (th && (th.min != null || th.max != null)) {
    for (const t of measure.texts ?? []) {
      if (t.fontPx == null || t.role === 'notice') continue;
      if ((th.min != null && t.fontPx < th.min) || (th.max != null && t.fontPx > th.max)) {
        block('text-height', `${t.role} 글자 ${t.fontPx}px — 규정 ${th.min ?? '?'}~${th.max ?? '?'}px`, t.role);
      }
    }
  }

  // 배경 금지색(리멤버 PDF p.8: 흰·검·브랜드 주황·근접 흰 2색) — 측정한 바탕 샘플색을 금지색과 견준다.
  //   「같은 색」(CIE76 ΔE ≤ medium.backgroundColors.blockDeltaE, 기본 1 — 사람 눈에 구분 안 됨)만 차단(bg-banned).
  //   그 밖의 근접색(채널당 ±CANON.bgBanned.tol 안)은 경고(bg-banned-near) — 10-28 컨시어지 #4(박진화): 리멤버 측 「#FFFFFF 가 아닌 흰색 근접색은 사용 가능하나 지양」,
  //   브랜드색이면 허용, #FAFAFA(ΔE 1.7) 통과 사례. 전엔 ±12 전부 차단이라 브랜드색·근접 흰색이 미승인으로 막혔다.
  //   bgColors 는 앱이 글자·로고·그림 상자를 피한 지점에서 뽑은 hex 목록. null 이면 측정 못 한 것(위반 아님). 6자리(3자리는 확장) hex 가 아니면 「측정 못 함」처럼 무시.
  const banned = (medium?.backgroundColors?.banned ?? []).map(b => ({ hex: norm(b), rgb: rgbOfHex(b) })).filter(b => b.rgb);
  if (banned.length && Array.isArray(measure.bgColors)) {
    const sameTol = medium?.backgroundColors?.blockDeltaE ?? 1;
    let near = null;
    for (const c of measure.bgColors) {
      const cv = rgbOfHex(c); if (!cv) continue;
      const same = banned.find(b => deltaE(c, b.hex) <= sameTol);
      if (same) { block('bg-banned', `배경색 ${norm(c).toUpperCase()} — 매체 금지색 ${same.hex.toUpperCase()}(같은 색, ΔE ${deltaE(c, same.hex).toFixed(1)})`); near = null; break; }
      const hit = banned.find(b => b.rgb.every((v, i) => Math.abs(v - cv[i]) <= CANON.bgBanned.tol));
      if (hit && !near) near = { c, hit };
    }
    if (near) warn('bg-banned-near', `배경색 ${norm(near.c).toUpperCase()} — 매체 금지색 ${near.hit.hex.toUpperCase()}에 가까움(지양). 브랜드색이면 허용 · 그라데이션/썸네일형으로 바꾸면 통과 가능`);
  }

  // 로고 개수(자소설 PDF: 1개 / 보드: 필요시 2개 · M스탠다드 메인·PC달력·리멤버 전 규격: 로고 불가)
  if (spec.logo && typeof spec.logo.count === 'number' && measure.logoCount != null) {
    const max = spec.logo.count === 0 ? 0 : Math.max(spec.logo.count, medium?.logoMaxCount ?? 0);   // 매체 값은 완화 전용 — 규격이 0(자소설 M메인·PC달력)이면 매체가 2여도 불가
    if (measure.logoCount > max) {
      if (max === 0) block('logo-forbidden', `로고 ${measure.logoCount}개 — 이 규격은 로고 삽입 불가`);
      else block('logo-count', `로고 ${measure.logoCount}개 — 최대 ${max}개`);
    }
  }

  // ── 투명 배경
  const bg = String(spec.background ?? '');
  if (measure.transparent != null && /투명/.test(bg)) {
    const mustBeOpaque = /투명.{0,12}?(불가|금지)/.test(bg);   // '투명 배경 불가' · '투명도 있는 이미지 사용 불가'
    if (mustBeOpaque && measure.transparent) block('transparent', '투명 배경 — 이 규격은 투명 배경 불가');
    if (!mustBeOpaque && !measure.transparent) block('transparent', '불투명 배경 — 이 규격은 투명 PNG');
  }

  return verdict();
}
