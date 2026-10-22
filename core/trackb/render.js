// B 트랙 — 레이아웃 JSON → HTML 조각. A 트랙 렌더러(core/renderers/ad.js)와 같은 표식을 단다:
//   <div data-ad="1"> 뿌리 · 글자 [data-field=역할] · 키비주얼 [data-object] · 로고 [data-logo]
//   → 기존 검수기(core/adcheck.js · app/measure.js + core/lint.js · core/gate.js)가 B 결과도 그대로 잰다.
// 폰트는 JSON 에 없다 — opts.fontStack 으로 박는다(규정 매체는 호출자가 Pretendard 를 넘긴다). 순수 함수.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const px = v => `${Math.round(v * 100) / 100}px`;

export function backgroundCss(base) {
  const cs = base?.colors ?? ['#FFFFFF'];
  if (!base || base.kind === 'solid' || cs.length < 2) return cs[0] ?? '#FFFFFF';
  const stops = cs.map((c, i) => `${c} ${Math.round(100 * i / (cs.length - 1))}%`).join(',');
  return base.kind === 'radial' ? `radial-gradient(circle at 50% 50%,${stops})` : `linear-gradient(${Math.round(base.angle ?? 180)}deg,${stops})`;
}

const FADE = { left: 'to right', right: 'to left', top: 'to bottom', bottom: 'to top' };
function maskCss(fade) {
  const dir = FADE[fade]; if (!dir) return '';
  const g = `linear-gradient(${dir},transparent 0%,rgba(0,0,0,.35) 18%,rgba(0,0,0,.8) 36%,#000 52%)`;
  return `-webkit-mask-image:${g};mask-image:${g};`;
}

// layout: validateLayout 이 돌려준 것 · opts: { kv:(URL/dataURL), logo, fontStack, specId, kvPx:[w,h] }
export function renderLayout(layout, opts = {}) {
  const W = layout.canvas?.w ?? 0, H = layout.canvas?.h ?? 0;
  const font = opts.fontStack ?? `'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif`;
  const parts = [];
  for (const [i, s] of (layout.background?.shapes ?? []).entries()) {
    parts.push(`<div data-shape="${i}" data-layer="shape:${i}" style="position:absolute;left:${px(s.x)};top:${px(s.y)};width:${px(s.w)};height:${px(s.h)};background:${s.color};opacity:${s.opacity};${s.kind === 'ellipse' ? 'border-radius:50%;' : s.radius ? `border-radius:${px(s.radius)};` : ''}${s.blur ? `filter:blur(${px(s.blur)});` : ''}"></div>`);
  }
  for (const im of layout.images ?? []) {
    if (im.id === 'kv' && opts.kv) {
      const c = im.crop ?? { x: 0, y: 0, w: 1, h: 1 };
      const bw = im.w / c.w, bh = im.h / c.h;   // 원본 전체를 이 크기로 그리면 잘라 보일 부분이 상자를 꽉 채운다
      parts.push(`<div data-object="1" data-layer="kv" style="position:absolute;left:${px(im.x)};top:${px(im.y)};width:${px(im.w)};height:${px(im.h)};background:url('${esc(opts.kv)}') ${px(-c.x * bw)} ${px(-c.y * bh)}/${px(bw)} ${px(bh)} no-repeat;opacity:${im.opacity};overflow:hidden;${maskCss(im.fade)}"></div>`);
    } else if (im.id === 'logo' && opts.logo) {
      parts.push(`<img data-logo="1" data-layer="logo" src="${esc(opts.logo)}" alt="" style="position:absolute;left:${px(im.x)};top:${px(im.y)};width:${px(im.w)};height:${px(im.h)};object-fit:contain;object-position:left top" />`);
    }
  }
  for (const [i, t] of (layout.texts ?? []).entries()) {
    parts.push(`<div data-field="${esc(t.role)}" data-layer="text:${i}" style="position:absolute;left:${px(t.x)};top:${px(t.y)};width:${px(t.w)};font-size:${px(t.size)};font-weight:${t.weight};line-height:${t.lineHeight};letter-spacing:${t.letterSpacing}em;color:${t.color};text-align:${t.align};white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere">${esc(t.text)}</div>`);
  }
  return `<div data-ad="1" data-track="b" data-spec="${esc(opts.specId ?? '')}" data-transparent="0" style="position:relative;width:${px(W)};height:${px(H)};overflow:hidden;background:${backgroundCss(layout.background?.base)};font-family:${font};box-sizing:border-box">\n${parts.join('\n')}\n</div>`;
}

// 층 목록(편집 패널용) — 사람이 읽을 이름과 JSON 안의 자리
export function layerList(layout) {
  const out = [{ key: 'background', label: '배경', kind: 'background' }];
  (layout.background?.shapes ?? []).forEach((s, i) => out.push({ key: `shape:${i}`, label: `도형 ${i + 1} (${s.kind === 'ellipse' ? '원' : '사각'})`, kind: 'shape', index: i }));
  (layout.images ?? []).forEach((im, i) => out.push({ key: `image:${i}`, label: im.id === 'kv' ? '키비주얼' : '로고', kind: 'image', index: i }));
  (layout.texts ?? []).forEach((t, i) => out.push({ key: `text:${i}`, label: `글자 · ${t.role}`, kind: 'text', index: i }));
  return out;
}
