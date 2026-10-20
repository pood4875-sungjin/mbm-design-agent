// 매체 규정 전수 검사의 Node 쪽 보조 규칙 — core/lint.js(lintArtifact)가 보지 않는 항목을 같은 측정값으로 더 본다.
//   · 로고: 삽입 불가 규격에 로고가 있나 / 템플릿 로고 영역(w·h)보다 큰가 / 높이 범위(hRange, 로고가 메인 카피를 대신할 때만)
//   · 글자 크기: 매체가 역할별로 px를 박아 둔 규격(자소설 fontSizes)과 실측 차이
//   · 오브젝트 상자(에브리타임 objectBox zone): 누끼 상자 너비·구역
// 그리고 규격마다 "무엇을 검사할 데이터가 있나"(coverageOf)를 센다 — 「통과」가 무엇을 보장하지 않는지 밝히기 위해.
//
// 순수 함수. 측정값 형식은 core/lint.js 머리말과 같고, objects:[{bbox}] 가 더 있다.
import { limitsByRole, inImage } from '../../core/adfields.js';

const FONT_ROLE = { '서브문구': 'sub', '메인문구': 'main', '상세문구': 'detail' };

export function extraChecks(entry, measure) {
  const rules = entry.rules ?? {}, issues = [];
  const push = (level, code, msg, role = null) => issues.push({ level, code, msg, role });
  const texts = measure.texts ?? [];

  // ── 로고
  const lg = rules.logo;
  if (lg && measure.logo?.bbox) {
    const b = measure.logo.bbox;
    if (lg.count === 0) push('block', 'logo-forbidden', `로고 삽입 불가 규격에 로고 ${Math.round(b.w)}×${Math.round(b.h)}`, 'logo');
    if (lg.count !== 0 && typeof lg.w === 'number' && typeof lg.h === 'number' && lg.w < (rules.w ?? Infinity) && !/별도/.test(String(lg.note ?? ''))) {   // 로고 파일 자체가 제출물(w=캔버스)·별도 파일로 내는 규격(블라인드 96×96·캐치 160×160)은 이미지 속 로고 영역이 아니다
      if (b.w > lg.w + 0.5 || b.h > lg.h + 0.5) push('warn', 'logo-size', `로고 ${Math.round(b.w)}×${Math.round(b.h)} — 템플릿 로고 영역 ${lg.w}×${lg.h}`, 'logo');
    }
    if (Array.isArray(lg.hRange) && !texts.some(t => t.role === 'main')) {
      const [a, z] = lg.hRange, lo = Math.min(a, z), hi = Math.max(a, z);
      if (b.h < lo - 0.5 || b.h > hi + 0.5) push('warn', 'logo-hrange', `메인 카피 대신 쓴 로고 높이 ${Math.round(b.h)}px — 규정 ${lo}~${hi}px`, 'logo');
    }
  }

  // ── 매체가 박아 둔 역할별 글자 px(자소설) — 캔버스 기준 px 라 그대로 비교
  const fs = rules.fontSizes;
  if (fs && /px/.test(String(fs.unit ?? 'px')) && !/배 프레임/.test(String(fs.unit ?? ''))) {
    for (const [k, role] of Object.entries(FONT_ROLE)) {
      if (typeof fs[k] !== 'number') continue;
      for (const t of texts.filter(t => t.role === role && t.fontPx != null)) {
        if (Math.abs(t.fontPx - fs[k]) > 0.5) push('warn', 'font-template', `${role} 글자 ${t.fontPx}px — 매체 템플릿 ${fs[k]}px`, role);
      }
    }
  }

  // ── 오브젝트 상자(에브리타임): 누끼일 때만 상자 규정이 선다(렌더러 zoneBox 와 같은 조건)
  const ob = rules.objectBox;
  if (ob?.zone && measure.cutout && measure.objects?.length) {
    const o = measure.objects[0].bbox, W = rules.w;
    if (ob.wMin != null && o.w < ob.wMin - 0.5) push('warn', 'object-width', `오브젝트 너비 ${Math.round(o.w)}px — 최소 ${ob.wMin}px`, 'object');
    if (ob.wMax != null && o.w > ob.wMax + 0.5) push('warn', 'object-width', `오브젝트 너비 ${Math.round(o.w)}px — 최대 ${ob.wMax}px`, 'object');
    const [z0, z1] = ob.zone;
    const x0 = ob.side === 'left' ? z0 : W - z1, x1 = ob.side === 'left' ? z1 : W - z0;
    if (o.x < x0 - 0.5 || o.x + o.w > x1 + 0.5) push('warn', 'object-zone', `오브젝트 x ${Math.round(o.x)}~${Math.round(o.x + o.w)} — 구역 ${x0}~${x1}`, 'object');
  }

  return issues;
}

// 규격마다 어떤 항목을 검사할 "규정 데이터"가 있는지. 없으면 그 항목은 검사하지 않은 것이다(통과가 아니다).
export function coverageOf(entry) {
  const r = entry.rules ?? {};
  const by = limitsByRole((r.textLimits ?? []).filter(inImage));
  const roles = Object.entries(by);
  const sa = r.safeArea;
  return {
    size: Number.isInteger(r.w) && Number.isInteger(r.h),
    format: (r.format ?? []).length > 0,
    weight: r.maxKB != null,
    chars: roles.filter(([, v]) => v.maxChars != null).map(([k]) => k),
    lines: roles.filter(([, v]) => v.lines != null).map(([k]) => k),
    safeArea: !!(sa && ['top', 'right', 'bottom', 'left'].some(k => typeof sa[k] === 'number')),
    safeAreaMemoOnly: !!(sa && !['top', 'right', 'bottom', 'left'].some(k => typeof sa[k] === 'number')),
    fontRange: !!(r.textHeightPx && (r.textHeightPx.min != null || r.textHeightPx.max != null)),
    fontTemplate: !!(r.fontSizes && Object.values(r.fontSizes).some(v => typeof v === 'number')),
    logoCount: r.logo?.count != null,
    logoSize: typeof r.logo?.w === 'number' && typeof r.logo?.h === 'number',
    logoPosition: false,   // 어느 매체 JSON 도 로고 위치를 숫자로 적지 않았다(메모뿐) — 검사 불가
    objectBox: !!r.objectBox,
    textColor: !!(r.textColors && (r.textColors.main || r.textColors.sub?.length)),
    background: /투명/.test(String(r.background ?? '')),
  };
}

// --dump-dom 이 <pre> 글자를 HTML 로 직렬화한 것을 되돌린다. U+00A0 은 &nbsp; 로 나오므로 그것도 풀어야 글자수가 맞는다
// (안 풀면 "MIDAS&nbsp;IT" 가 글자 5개 더 세어져 가짜 chars 위반이 난다 — 10-12 전수 검사에서 확인)
export function decodeDump(s) {
  return String(s).replace(/&(quot|lt|gt|nbsp|#(\d+)|#x([0-9a-f]+)|amp);/gi, (m, k, dec, hex) =>
    k === 'quot' ? '"' : k === 'lt' ? '<' : k === 'gt' ? '>' : k === 'nbsp' ? '\u00A0' : k === 'amp' ? '&' : dec ? String.fromCodePoint(Number(dec)) : String.fromCodePoint(parseInt(hex, 16)));
}

// 브라우저 측정 코드 — 앱(app/measure.js measureDom)과 같은 식으로 잰다. iframe 문서(d)를 받아 측정값을 돌려준다.
// 문자열로 두는 이유: 시트 HTML 의 <script> 에 그대로 박아 headless Chrome 에서 돌린다.
export const MEASURE_JS = `
const toHex = rgb => { const m = String(rgb).match(/rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/); return m ? '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase() : null; };
function measureDoc(d) {
  const root = d.querySelector('[data-ad]') ?? d.body.firstElementChild;
  if (!root) return { error: 'no root' };
  const rr = root.getBoundingClientRect();
  const box = r => ({ x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height });
  const texts = [...root.querySelectorAll('[data-field]')].map(el => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const fontPx = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || fontPx * 1.2;
    const padV = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    return { role: el.dataset.field, text: el.textContent, lines: Math.max(1, Math.round((r.height - padV) / lh)), fontPx, color: toHex(cs.color), bbox: box(r), truncated: el.scrollHeight > el.clientHeight + 2 };
  });
  const logoEl = root.querySelector('[data-logo]');
  const logo = logoEl ? { bbox: box(logoEl.getBoundingClientRect()), natural: { w: logoEl.naturalWidth, h: logoEl.naturalHeight } } : null;
  const objects = [...root.querySelectorAll('[data-object="1"]')].map(el => ({ bbox: box(el.getBoundingClientRect()) }));
  const fontFamily = getComputedStyle(root).fontFamily.split(',')[0].replace(/["']/g, '').trim();
  return { w: Math.round(rr.width), h: Math.round(rr.height), texts, logo, objects, fontFamily, logoCount: [...root.querySelectorAll('[data-logo]')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; }).length,   // app/measure.js 와 같은 기준. bgColors 는 재지 않는다(null) — 헤드리스 DOM 엔 캔버스 픽셀이 없다
    transparent: root.dataset.transparent === '1', kvUse: root.dataset.kvUse ?? null };
}`;
