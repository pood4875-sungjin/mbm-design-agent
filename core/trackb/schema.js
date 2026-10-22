// B 트랙 — AI 가 돌려주는 레이아웃 JSON 의 구조(스키마)와 고정 조건 검증.
//   스키마: API 의 structured output(output_config.format) 에 그대로 넣는다 — 모양이 어긋난 응답은 API 가 거른다.
//   검증(validateLayout): 모양은 맞아도 「AI 가 못 바꾸는 것」을 어겼으면 고친다(clamp) 또는 다시 요청(retry) 사유를 낸다.
//     고정 = 캔버스 크기 · 안전영역 · 필수 문구(고지·고객사) · 지정 폰트(여기선 JSON 에 폰트 자체가 없다 — 렌더러가 박는다) · 로고 원본 비율 · 글자 크기 범위(매체 규정)
//   순수 함수 — 브라우저·Node 양쪽에서 돈다.

const NUM = { type: 'number' };
const STR = { type: 'string' };
const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties });

export const TEXT_ROLES = ['season', 'main', 'sub', 'period', 'role', 'slogan', 'notice', 'cta'];
export const ROLE_LABEL = { season: '시즌', main: '메인', sub: '서브', period: '접수 기간', role: '모집 직무', slogan: '슬로건', notice: '고지', cta: 'CTA' };
export const WEIGHTS = [400, 500, 600, 700, 800, 900];

export const LAYOUT_SCHEMA = obj({
  background: obj({
    base: obj({
      kind: { type: 'string', enum: ['solid', 'linear', 'radial'] },
      colors: { type: 'array', items: STR },     // solid: 1개 · linear/radial: 2~3개(#RRGGBB)
      angle: NUM,                                 // linear 만(deg). 나머지는 0
    }),
    shapes: {
      type: 'array',
      items: obj({
        kind: { type: 'string', enum: ['rect', 'ellipse'] },
        x: NUM, y: NUM, w: NUM, h: NUM,
        color: STR, opacity: NUM, radius: NUM, blur: NUM,
      }),
    },
  }),
  images: {
    type: 'array',
    items: obj({
      id: { type: 'string', enum: ['kv', 'logo'] },
      x: NUM, y: NUM, w: NUM, h: NUM,
      crop: obj({ x: NUM, y: NUM, w: NUM, h: NUM }),   // 원본에서 보일 부분(0~1 비율). 로고는 항상 전체(0,0,1,1)
      opacity: NUM,
      fade: { type: 'string', enum: ['none', 'left', 'right', 'top', 'bottom'] },   // 그림 한 변을 지면으로 녹임
    }),
  },
  texts: {
    type: 'array',
    items: obj({
      role: { type: 'string', enum: TEXT_ROLES },
      text: STR,                                  // 줄바꿈은 \n
      x: NUM, y: NUM, w: NUM,
      size: NUM, weight: { type: 'integer' }, color: STR,
      align: { type: 'string', enum: ['left', 'center', 'right'] },
      lineHeight: NUM,                            // 배수(1.1~1.5)
      letterSpacing: NUM,                         // em(-0.05~0.05)
    }),
  },
  rationale: STR,                                 // 왜 이렇게 놓았나 — 한두 문장(한국어)
});

const HEX = /^#[0-9A-Fa-f]{6}$/;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round1 = v => Math.round(v * 10) / 10;
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v)) ? v : d;
const hex = (v, d) => (typeof v === 'string' && HEX.test(v)) ? v.toUpperCase() : d;

// 고정 조건(fixed): buildFixed(spec, inputs) 가 만든다(prompt.js) — 여기서는 그 값을 믿고 검증만 한다.
//   { w, h, safe:{top,right,bottom,left}, fontSize:{min,max}, noticeMin, maxLines, requiredTexts:[{role,text,verbatim}], logoAr, kvAr, kvPx:[w,h] }
// 돌려주는 것: { layout(고친 것), fixes:[사람이 읽을 한 줄], retry:[다시 요청해야 하는 사유] }
export function validateLayout(input, fixed) {
  const fixes = [], retry = [];
  const L = structuredClone(input ?? {});
  const W = fixed.w, H = fixed.h;
  const safe = { top: num(fixed.safe?.top, 0), right: num(fixed.safe?.right, 0), bottom: num(fixed.safe?.bottom, 0), left: num(fixed.safe?.left, 0) };
  const fix = s => fixes.push(s);

  // ── 배경 ──
  const bg = L.background ?? (L.background = { base: { kind: 'solid', colors: ['#FFFFFF'], angle: 0 }, shapes: [] });
  const base = bg.base ?? (bg.base = { kind: 'solid', colors: ['#FFFFFF'], angle: 0 });
  if (!['solid', 'linear', 'radial'].includes(base.kind)) { base.kind = 'solid'; fix('배경 종류를 단색으로'); }
  base.colors = (Array.isArray(base.colors) ? base.colors : []).map(c => hex(c, null)).filter(Boolean);
  if (!base.colors.length) { base.colors = ['#FFFFFF']; fix('배경색이 비어 흰색으로'); }
  if (base.kind === 'solid') base.colors = base.colors.slice(0, 1);
  else if (base.colors.length < 2) { base.kind = 'solid'; fix('그라데이션 색이 1개라 단색으로'); }
  base.colors = base.colors.slice(0, 3);
  base.angle = round1(clamp(num(base.angle, 180), 0, 360));
  bg.shapes = (Array.isArray(bg.shapes) ? bg.shapes : []).slice(0, 6).map(s => ({
    kind: s.kind === 'ellipse' ? 'ellipse' : 'rect',
    x: round1(clamp(num(s.x), -W, 2 * W)), y: round1(clamp(num(s.y), -H, 2 * H)),
    w: round1(clamp(num(s.w, 10), 1, 3 * W)), h: round1(clamp(num(s.h, 10), 1, 3 * H)),
    color: hex(s.color, '#000000'), opacity: clamp(num(s.opacity, 1), 0, 1), radius: round1(clamp(num(s.radius), 0, Math.max(W, H))), blur: round1(clamp(num(s.blur), 0, 200)),
  }));

  // ── 그림 ──
  const images = (Array.isArray(L.images) ? L.images : []).filter(i => i && (i.id === 'kv' || i.id === 'logo'));
  const seen = new Set(); L.images = [];
  for (const im of images) {
    if (seen.has(im.id)) { fix(`${im.id} 그림이 둘 — 하나만`); continue; }
    seen.add(im.id);
    const o = { id: im.id, x: num(im.x), y: num(im.y), w: Math.max(1, num(im.w, 100)), h: Math.max(1, num(im.h, 100)), crop: { x: 0, y: 0, w: 1, h: 1 }, opacity: clamp(num(im.opacity, 1), 0, 1), fade: ['left', 'right', 'top', 'bottom'].includes(im.fade) ? im.fade : 'none' };
    if (im.id === 'logo') {
      if (!fixed.hasLogo) { fix('로고 파일이 없는데 로고 층이 있어 지움'); continue; }
      // 원본 비율 고정 — 폭을 믿고 높이를 맞춘다
      if (fixed.logoAr) { const h = o.w / fixed.logoAr; if (Math.abs(h - o.h) > 0.5) { fix(`로고 높이 ${round1(o.h)}→${round1(h)} (원본 비율 고정)`); o.h = h; } }
      o.fade = 'none';
      // 안전영역 안으로
      const b = inSafe(o, W, H, safe); if (b.moved) fix(`로고를 안전영역 안으로 (${b.note})`); Object.assign(o, b.box);
      o.opacity = 1;
    } else {
      if (!fixed.hasKv) { fix('키비주얼 파일이 없는데 그림 층이 있어 지움'); continue; }
      const c = im.crop ?? {};
      o.crop = { x: clamp(num(c.x), 0, 0.95), y: clamp(num(c.y), 0, 0.95), w: clamp(num(c.w, 1), 0.05, 1), h: clamp(num(c.h, 1), 0.05, 1) };
      if (o.crop.x + o.crop.w > 1) o.crop.w = 1 - o.crop.x;
      if (o.crop.y + o.crop.h > 1) o.crop.h = 1 - o.crop.y;
      // 그림 왜곡 금지 — 잘라 보이는 부분의 비율을 상자 비율에 맞춘다(가운데 기준으로 한쪽만 줄임)
      if (fixed.kvAr) {
        const boxAr = o.w / o.h, cropAr = (o.crop.w * fixed.kvAr) / o.crop.h;
        if (Math.abs(boxAr / cropAr - 1) > 0.01) {
          if (cropAr > boxAr) { const nw = o.crop.h * boxAr / fixed.kvAr; o.crop.x = clamp(o.crop.x + (o.crop.w - nw) / 2, 0, 1 - nw); o.crop.w = nw; }
          else { const nh = o.crop.w * fixed.kvAr / boxAr; o.crop.y = clamp(o.crop.y + (o.crop.h - nh) / 2, 0, 1 - nh); o.crop.h = nh; }
          fix('키비주얼 잘라 보이는 부분을 상자 비율에 맞춤(왜곡 금지)');
        }
      }
      for (const k of ['x', 'y', 'w', 'h']) o.crop[k] = Math.round(o.crop[k] * 1000) / 1000;
      // 지면 밖으로 완전히 나가면 되돌린다
      if (o.x >= W || o.y >= H || o.x + o.w <= 0 || o.y + o.h <= 0) { fix('키비주얼이 지면 밖에 있어 오른쪽 반에 놓음'); o.x = W / 2; o.y = 0; o.w = W / 2; o.h = H; }
    }
    for (const k of ['x', 'y', 'w', 'h']) o[k] = round1(o[k]);
    L.images.push(o);
  }
  if (fixed.hasLogo && !seen.has('logo')) retry.push('로고 층이 없다 — 로고는 반드시 넣어야 한다');
  if (fixed.hasKv && !seen.has('kv')) retry.push('키비주얼 층이 없다 — 키비주얼은 반드시 넣어야 한다');

  // ── 글자 ──
  const texts = (Array.isArray(L.texts) ? L.texts : []).filter(t => t && typeof t.text === 'string' && t.text.trim());
  L.texts = texts.slice(0, 8).map(t => {
    const o = {
      role: TEXT_ROLES.includes(t.role) ? t.role : 'sub', text: String(t.text).replace(/\r/g, '').trim(),
      x: num(t.x), y: num(t.y), w: Math.max(40, num(t.w, W / 2)),
      size: num(t.size, 32), weight: WEIGHTS.includes(t.weight) ? t.weight : 700, color: hex(t.color, '#222222'),
      align: ['left', 'center', 'right'].includes(t.align) ? t.align : 'left',
      lineHeight: clamp(num(t.lineHeight, 1.25), 1.0, 1.8), letterSpacing: clamp(num(t.letterSpacing, 0), -0.08, 0.1),
    };
    // 글자 크기 범위(매체 규정) — 고지 문구는 따로 최소
    const lo = o.role === 'notice' ? num(fixed.noticeMin, num(fixed.fontSize?.min, 12)) : num(fixed.fontSize?.min, 12);
    const hi = num(fixed.fontSize?.max, Math.max(H, W));
    if (o.size < lo) { fix(`${ROLE_LABEL[o.role]} 글자 ${round1(o.size)}→${lo}px (규정 최소)`); o.size = lo; }
    if (o.size > hi) { fix(`${ROLE_LABEL[o.role]} 글자 ${round1(o.size)}→${hi}px (규정 최대)`); o.size = hi; }
    // 허용 굵기(묶은 폰트 굵기)
    if (Array.isArray(fixed.weights) && fixed.weights.length && !fixed.weights.includes(o.weight)) { const near = fixed.weights.reduce((a, b) => Math.abs(b - o.weight) < Math.abs(a - o.weight) ? b : a); fix(`${ROLE_LABEL[o.role]} 굵기 ${o.weight}→${near} (폰트 보유 굵기)`); o.weight = near; }
    // 안전영역 — 글자 상자(높이는 줄 수 × 행간으로 어림, 자동 줄바꿈은 글자 폭 어림으로 센다: 한글·한자 1em · 나머지 0.55em)
    const lines = estLines(o.text, o.w, o.size, o.letterSpacing);
    const est = { x: o.x, y: o.y, w: o.w, h: lines * o.size * o.lineHeight };
    const b = inSafe(est, W, H, safe); if (b.moved) { fix(`${ROLE_LABEL[o.role]} 글자를 안전영역 안으로 (${b.note})`); o.x = b.box.x; o.y = b.box.y; o.w = b.box.w; }
    for (const k of ['x', 'y', 'w', 'size']) o[k] = round1(o[k]);
    return o;
  });
  // 줄 수 상한(권장) — 고치지 않고 알려만 준다
  if (fixed.maxLines) { const n = L.texts.filter(t => t.role !== 'notice').reduce((a, t) => a + t.text.split('\n').length, 0); if (n > fixed.maxLines) fix(`이미지 내 글줄 ${n}줄 — 매체 권장 ${fixed.maxLines}줄 이하(경고)`); }
  // 필수 문구
  const all = L.texts.map(t => t.text.replace(/\s+/g, '')).join('\n');
  for (const r of fixed.requiredTexts ?? []) {
    const needle = String(r.text ?? '').replace(/\s+/g, ''); if (!needle) continue;
    if (!all.includes(needle)) {
      if (r.verbatim && r.role) { L.texts.push(defaultText(r, fixed, L.texts)); fix(`필수 문구 「${r.text}」가 빠져 아래에 추가`); }
      else retry.push(`「${r.text}」(${ROLE_LABEL[r.role] ?? r.role}) 문구가 글자 층에 없다 — 반드시 그대로 넣어야 한다`);
    }
  }
  if (!L.texts.length) retry.push('글자 층이 하나도 없다');
  L.rationale = typeof L.rationale === 'string' ? L.rationale.trim().slice(0, 400) : '';
  L.canvas = { w: W, h: H };
  return { layout: L, fixes, retry };
}

// 글줄 수 어림 — 명시 줄바꿈 + 폭을 넘치는 자동 줄바꿈
export function estLines(text, w, size, ls = 0) {
  const em = ch => (/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u3400-\u9FFF\uFF00-\uFFEF]/.test(ch) ? 1 : ch === ' ' ? 0.3 : 0.55) + ls;
  return String(text).split('\n').reduce((n, line) => n + Math.max(1, Math.ceil([...line].reduce((a, ch) => a + em(ch), 0) * size / Math.max(1, w))), 0);
}

// 상자를 안전영역 안으로 — 폭이 너무 크면 줄이고, 밖으로 나가면 민다
function inSafe(box, W, H, safe) {
  const o = { ...box }; const notes = [];
  const maxW = W - safe.left - safe.right, maxH = H - safe.top - safe.bottom;
  if (o.w > maxW) { o.w = maxW; notes.push('폭'); }
  if (o.h > maxH) { o.h = maxH; notes.push('높이'); }
  if (o.x < safe.left) { o.x = safe.left; notes.push('왼쪽'); }
  if (o.y < safe.top) { o.y = safe.top; notes.push('위'); }
  if (o.x + o.w > W - safe.right) { o.x = W - safe.right - o.w; notes.push('오른쪽'); }
  if (o.y + o.h > H - safe.bottom) { o.y = H - safe.bottom - o.h; notes.push('아래'); }
  return { box: o, moved: notes.length > 0, note: notes.join('·') };
}

// 빠진 필수 문구(고지)를 지면 아래 안전영역 안에 작게 — 글자색은 다른 글자와 같게
function defaultText(r, fixed, texts) {
  const safe = fixed.safe ?? {}, W = fixed.w, H = fixed.h;
  const size = num(fixed.noticeMin, 14);
  const color = texts[0]?.color ?? '#222222';
  return { role: r.role, text: r.text, x: num(safe.left, 0) + 16, y: H - num(safe.bottom, 0) - size * 1.4 - 8, w: W - num(safe.left, 0) - num(safe.right, 0) - 32, size, weight: 400, color, align: 'left', lineHeight: 1.3, letterSpacing: 0 };
}
