// 자유 시안(11-05 「대화로 시안 뽑기」) — Claude 가 만든 배경·타이포 HTML 을 틀로 바꾸고(자리표시), 다시 채우고, 모양을 검사하는 순수 함수.
//
// 서버 계약(server POST /api/freedesign)이 주는 HTML:
//   루트 <div data-ad="1" data-spec="…" data-free="1" style="width:{w}px;height:{h}px">
//   글자 [data-field="main|sub|date|detail|notice"], 키비주얼 [data-object="1"] / img[data-kv], 로고 img[data-logo], 글꼴은 허용 목록 이름만.
// 틀(template) = 글자 → {main} 같은 자리표시, 키비주얼·로고 data URL → {kv}·{logo}. 캠페인 저장·「내 자유 시안」 재사용은 틀로만 한다(그림은 캠페인이 갖고 있다).
//
// 검수는 여기서 하지 않는다 — 채워진 HTML 을 앱이 measureArtifact → lintArtifact → approvalGate 로 돌린다(규칙은 검수기가 강제).

export const FREE_FIELDS = ['main', 'sub', 'date', 'detail', 'notice'];
const PH = { kv: '{kv}', logo: '{logo}' };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FIELD_RE = /(<([a-z][a-z0-9]*)\b[^>]*\bdata-field="(main|sub|date|detail|notice)"[^>]*>)([\s\S]*?)(<\/\2>)/gi;
const strip = s => String(s ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/ /g, ' ').trim();

// 채워진 HTML 의 글자 — { main, sub, … } (같은 역할이 여럿이면 첫 것). 줄바꿈은 \n
export function textsOf(html) {
  const out = {};
  for (const m of String(html ?? '').matchAll(FIELD_RE)) { const role = m[3]; if (!(role in out)) out[role] = strip(m[4]); }
  return out;
}

// 채워진 HTML → 틀. 글자는 {role}, kv/logo data URL(문자열 전체)은 {kv}/{logo}. 같은 글자가 바깥(예: aria-label)에 있어도 건드리지 않는다 — data-field 안만
export function toTemplate(html, { kv = null, logo = null } = {}) {
  let tpl = String(html ?? '');
  const texts = textsOf(tpl);
  tpl = tpl.replace(FIELD_RE, (_, open, _tag, role, _inner, close) => `${open}{${role}}${close}`);
  // 그림: img src 가 자리표시가 아닐 때 data-kv/data-logo 표식으로도 치환 — data URL 이 조금 달라도(서버가 재인코딩) 틀이 된다
  if (kv) tpl = tpl.split(kv).join(PH.kv);
  if (logo) tpl = tpl.split(logo).join(PH.logo);
  tpl = tpl.replace(/(<img\b[^>]*\bdata-kv\b[^>]*\bsrc=")(?!\{kv\})[^"]*(")/gi, `$1${PH.kv}$2`).replace(/(<img\b[^>]*\bdata-logo\b[^>]*\bsrc=")(?!\{logo\})[^"]*(")/gi, `$1${PH.logo}$2`);
  // 자리표시 밖에 남은 data URL(서버가 다른 그림을 넣었거나 배경 이미지로 썼을 때)은 틀에 두면 저장이 무거워진다 — 그대로 두되 알린다
  const leftover = (tpl.match(/data:image\/[a-z+]+;base64,/g) ?? []).length;
  return { tpl, texts, leftover };
}

// 틀 → 채워진 HTML. texts 가 없는 역할은 빈 글자(data-field 는 남아 검수기가 「없음」으로 본다). kv/logo 가 없으면 그 img 를 뺀다(깨진 그림 아이콘이 뜨지 않게)
export function fillTemplate(tpl, { texts = {}, kv = null, logo = null } = {}) {
  let html = String(tpl ?? '');
  for (const role of FREE_FIELDS) html = html.split(`{${role}}`).join(esc(texts[role] ?? '').replace(/\n/g, '<br/>'));
  html = kv ? html.split(PH.kv).join(kv) : html.replace(/<img\b[^>]*\bsrc="\{kv\}"[^>]*>/gi, '').split(PH.kv).join('');
  html = logo ? html.split(PH.logo).join(logo) : html.replace(/<img\b[^>]*\bsrc="\{logo\}"[^>]*>/gi, '').split(PH.logo).join('');
  return html;
}

// 틀 왕복이 맞는지(치환 → 복원이 원본과 같은가) — 테스트·저장 전 확인용
export function roundTrips(html, { kv = null, logo = null } = {}) {
  const { tpl, texts } = toTemplate(html, { kv, logo });
  return fillTemplate(tpl, { texts, kv, logo }) === String(html ?? '');
}

// HTML 안에 쓰인 font-family 이름 목록(따옴표 벗김, 스택 첫 이름들 전부)
export function fontNamesIn(html) {
  const out = new Set();
  for (const m of String(html ?? '').matchAll(/font-family\s*:\s*([^;"}]+)/gi)) for (const n of m[1].split(',')) { const v = n.trim().replace(/^['"]|['"]$/g, '').trim(); if (v && !/^(inherit|initial|unset|sans-serif|serif|monospace|system-ui)$/i.test(v)) out.add(v); }
  return [...out];
}

// 모양 검사 — 서버 계약대로 왔는가. errors 가 있으면 쓰지 않는다(앱이 「다시」로 돌린다), warnings 는 표시만.
//   allowedFonts: 허용 글꼴 이름(family·label·id 섞여도 됨, 대소문자 무시). 비어 있으면 글꼴은 안 본다
export function validateFreeHtml(html, { w, h, allowedFonts = [] } = {}) {
  const errors = [], warnings = [];
  const s = String(html ?? '').trim();
  if (!s) return { ok: false, errors: ['빈 HTML'], warnings };
  const root = s.match(/<div\b[^>]*\bdata-ad="1"[^>]*>/i);
  if (!root) errors.push('루트 <div data-ad="1"> 없음');
  else {
    if (!/\bdata-free="1"/.test(root[0])) warnings.push('루트에 data-free="1" 없음(앱이 붙임)');
    const st = root[0].match(/\bstyle="([^"]*)"/i)?.[1] ?? '';
    const rw = +(st.match(/(?:^|;)\s*width\s*:\s*([\d.]+)px/i)?.[1] ?? NaN), rh = +(st.match(/(?:^|;)\s*height\s*:\s*([\d.]+)px/i)?.[1] ?? NaN);
    if (w != null && h != null && (rw !== w || rh !== h)) errors.push(`루트 크기 ${isNaN(rw) ? '?' : rw}×${isNaN(rh) ? '?' : rh} — 규격 ${w}×${h}`);
  }
  if (/<script\b/i.test(s)) errors.push('<script> 금지');
  if (/<(iframe|object|embed)\b/i.test(s)) errors.push('iframe/object/embed 금지');
  if (/\bon[a-z]+\s*=/i.test(s)) errors.push('인라인 이벤트(on*=) 금지');
  if (/\b(?:src|href)\s*=\s*"https?:\/\//i.test(s) || /url\(\s*['"]?https?:\/\//i.test(s)) errors.push('바깥 주소(http) 참조 금지 — 내보내기(래스터)가 받지 못함');
  if (/@import\b/i.test(s)) errors.push('@import 금지');
  if (!/\bdata-field="main"/.test(s)) errors.push('메인 글자(data-field="main") 없음');
  const roles = [...new Set([...s.matchAll(/\bdata-field="([a-z]+)"/g)].map(m => m[1]))];
  for (const r of roles) if (!FREE_FIELDS.includes(r)) warnings.push(`모르는 글자 역할 data-field="${r}" — 검수기가 세지 않음`);
  if (allowedFonts.length) {
    const ok = new Set(allowedFonts.map(x => String(x).toLowerCase()));
    const bad = fontNamesIn(s).filter(n => !ok.has(n.toLowerCase()) && !/apple sd gothic|malgun|noto sans kr|helvetica|arial/i.test(n));
    if (bad.length) errors.push(`허용 밖 글꼴: ${bad.join(', ')}`);
  }
  return { ok: errors.length === 0, errors, warnings, roles };
}

// XML 안전하게 — 내보내기(app/raster.js)는 HTML 을 SVG foreignObject 에 넣어 그리므로 빈 태그는 닫혀야 하고 &nbsp; 같은 HTML 전용 엔티티는 못 읽는다(Claude 가 쓴 HTML 은 보통 <img …>·<br>)
export function xmlSafe(html) {
  return String(html ?? '')
    .replace(/<(img|br|hr|input|source|wbr|meta|link)\b([^>]*?)\s*\/?>/gi, (_, t, a) => `<${t}${a}/>`)
    .replace(/&nbsp;/g, '&#160;').replace(/&ensp;/g, '&#8194;').replace(/&emsp;/g, '&#8195;').replace(/&thinsp;/g, '&#8201;').replace(/&hellip;/g, '&#8230;').replace(/&middot;/g, '&#183;').replace(/&copy;/g, '&#169;')
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, '&amp;');
}
// 루트 속성 정리 — data-free="1"·data-spec·크기 보장, 코드펜스·바깥 공백 제거, XML 안전화. 검증을 통과한 HTML 에만
export function normalizeFreeHtml(html, { specId, w, h } = {}) {
  let s = xmlSafe(String(html ?? '').trim().replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim());
  s = s.replace(/<div\b([^>]*)\bdata-ad="1"([^>]*)>/i, (m, a, b) => {
    let attrs = `${a}data-ad="1"${b}`;
    if (!/\bdata-free=/.test(attrs)) attrs += ' data-free="1"';
    if (specId && !/\bdata-spec=/.test(attrs)) attrs += ` data-spec="${esc(specId)}"`;
    if (w != null && h != null) {
      if (/\bstyle="/.test(attrs)) attrs = attrs.replace(/\bstyle="([^"]*)"/, (_, st) => { let t = st.replace(/(?:^|;)\s*(width|height)\s*:[^;]*/gi, ''); t = `width:${w}px;height:${h}px;position:relative;overflow:hidden;${t.replace(/^;+/, '')}`; return `style="${t}"`; });
      else attrs += ` style="width:${w}px;height:${h}px;position:relative;overflow:hidden"`;
    }
    return `<div${attrs}>`;
  });
  return s;
}

// 저장 항목(「자유 시안으로 저장」) 모양 — localStorage mbm-free-templates 의 원소. id 는 호출자가 준다
export function freeTemplateRecord({ id, specId, tpl, notes = '', thumb = null, createdAt = Date.now(), label = null }) {
  return { id, specId, html: tpl, notes: String(notes ?? ''), createdAt, thumb, label };
}
