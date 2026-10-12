// 디자인 검수 — 그려진 소재(DOM)를 재서 "디자이너가 보면 걸리는 것"을 경고로 낸다. 규격 검사(core/lint.js: 치수·용량·글자수)와 별개의 눈.
// 브라우저에서 돈다(앱의 프레임 iframe · scripts/cases.mjs 의 케이스 시트). 측정은 실제 레이아웃(getBoundingClientRect)이라 추정이 아니다.
//   글자-주인공 겹침: 글자 상자가 주인공 상자(kvMeta.focus를 그린 위치로 환산) 위에 15% 넘게 올라가면 경고(여우 귀 위 글자)
//   로고 가림: 주인공이 로고 상자를 5% 넘게 덮으면 경고(970 여우)
//   뚝 끊긴 변: 주인공이 오브젝트 상자 변에서 잘리는데 그 변이 지면 안쪽이고 녹임(mask)이 없으면 경고
//   빈 여백: 글자도 그림도 로고도 없는 가로 띠가 지면 높이의 28%를 넘으면 경고(300×1050 아래 여백)
//   글자 잘림: 글자 요소가 스크롤되거나 지면 밖으로 나가면 경고
//   알약 넘침: 라벨 알약이 지면 오른쪽 밖으로
//   해상도(참고): 키비주얼을 원본의 2배(누끼 1.5배) 넘게 키우거나 로고를 원본보다 크게 그리면 info(그림 탓 — 경고 수에 안 셈)
//   10-12 이음매: 짧은 녹임(short-melt — 그림 변과 지면색이 먼데 녹임이 CANON melt 길이의 70%에 못 미침) · 띠 이음매(band-seam — 지면 전체 그림을 밀어 둔 빈 띠를 단색으로 채움)
//   10-12 질감: 글자 아래가 어지러운 질감인데 진정 스크림이 없음(busy-under-text, CANON textureCalm)

import { CANON } from './canon.js';
import { profileFocus } from './field.js';

const inter = (a, b) => { const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h); return Math.max(0, x1 - x0) * Math.max(0, y1 - y0); };
const area = r => Math.max(1, r.w * r.h);

// 오브젝트 상자 안에 그림이 실제로 그려진 네모(배경 size/position 환산) → 주인공 네모
function drawnImage(el, r, ar) {
  const cs = getComputedStyle(el);
  const size = cs.backgroundSize || 'auto', pos = cs.backgroundPosition || '0% 0%';
  let iw, ih;
  if (/contain/.test(size)) { if (r.w / r.h > ar) { ih = r.h; iw = ih * ar; } else { iw = r.w; ih = iw / ar; } }
  else if (/cover/.test(size)) { if (r.w / r.h > ar) { iw = r.w; ih = iw / ar; } else { ih = r.h; iw = ih * ar; } }
  else {
    const parts = size.split(/\s+/);
    const px = v => (v && v.endsWith('px')) ? parseFloat(v) : null;
    const pw = px(parts[0]), ph = px(parts[1]);
    if (pw != null && ph != null) { iw = pw; ih = ph; } else if (pw != null) { iw = pw; ih = pw / ar; } else if (ph != null) { ih = ph; iw = ph * ar; } else { iw = r.w; ih = r.h; }
  }
  const [sx, sy] = pos.split(/\s+/);
  const off = (v, box, img) => (v && v.endsWith('%')) ? (box - img) * parseFloat(v) / 100 : parseFloat(v || '0');
  return { x: r.x + off(sx, r.w, iw), y: r.y + off(sy, r.h, ih), w: iw, h: ih };
}

export function checkAdDoc(doc, { kvMeta = null, debug = false } = {}) {
  const root = doc.querySelector('[data-ad]'); if (!root) return null;
  const base = root.getBoundingClientRect();
  const R = el => { const b = el.getBoundingClientRect(); return { x: b.left - base.left, y: b.top - base.top, w: b.width, h: b.height }; };
  const frame = { x: 0, y: 0, w: base.width, h: base.height };
  const warnings = [], metrics = {};
  const push = (code, msg, level = 'warn') => warnings.push({ code, msg, level });

  // 글자는 요소 상자가 아니라 실제 글줄(Range client rects)로 잰다 — 열이 넓어도 글자가 짧으면 겹침이 아니다
  const ink = el => {
    try {
      // 블록 자식의 줄상자는 열 폭 전체라 글자 잉크가 아니다 — 텍스트 노드 하나씩 Range로 잰다
      const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const rects = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.nodeValue.trim()) continue;
        const rg = doc.createRange(); rg.selectNodeContents(n);
        for (const b of rg.getClientRects()) if (b.width > 0.5 && b.height > 0.5) rects.push(b);
      }
      if (!rects.length) return R(el);
      const x0 = Math.min(...rects.map(b => b.left)), y0 = Math.min(...rects.map(b => b.top)), x1 = Math.max(...rects.map(b => b.right)), y1 = Math.max(...rects.map(b => b.bottom));
      return { x: x0 - base.left, y: y0 - base.top, w: x1 - x0, h: y1 - y0 };
    } catch { return R(el); }
  };
  const texts = [...root.querySelectorAll('[data-field]')].filter(e => e.dataset.field !== 'cta' && e.getClientRects().length).map(e => ({ role: e.dataset.field, el: e, r: ink(e), box: R(e) }));
  const kvUse = root.getAttribute('data-kv-use') || 'none';
  const cutoutKv = (kvMeta?.field?.opaque ?? 1) < 0.5;
  const objs = [...root.querySelectorAll('[data-object]')].filter(e => e.getAttribute('data-object') !== 'logo').map(e => ({ el: e, r: R(e) }));
  const logoEl = root.querySelector('[data-logo]'); const logoR = logoEl ? R(logoEl) : null;
  // 주인공 상자가 없는 바탕 있는 그림은 줄·열 프로필로 어림한 상자(렌더러 coverPos 와 같은 것) — 없으면 그림 상자 전체가 주인공으로 잡혀 녹인 가장자리까지 겹침으로 셌다(10-12 desk-15)
  const focus = profileFocus(kvMeta?.field) ?? null, ar = kvMeta?.ar;

  // 주인공 네모(상자 안으로 자른 것)와 잘린 변
  const subjects = objs.map(o => {
    if (!focus || !ar) return { ...o, s: o.r, cut: {} };
    const img = drawnImage(o.el, o.r, ar);
    const full = { x: img.x + (focus.x - focus.w / 2) * img.w, y: img.y + (focus.y - focus.h / 2) * img.h, w: focus.w * img.w, h: focus.h * img.h };
    const x0 = Math.max(full.x, o.r.x), y0 = Math.max(full.y, o.r.y), x1 = Math.min(full.x + full.w, o.r.x + o.r.w), y1 = Math.min(full.y + full.h, o.r.y + o.r.h);
    const tol = cutoutKv ? 0.12 : 0.03;              // 누끼는 부드러운 그림자·낮은 알파 가장자리가 상자에 들어 12%(동부 건물 왼쪽 7%), 바탕 있는 그림은 3%
    const tx = full.w * tol, ty = full.h * tol;
    const cut = { top: full.y < o.r.y - ty, bottom: full.y + full.h > o.r.y + o.r.h + ty, left: full.x < o.r.x - tx, right: full.x + full.w > o.r.x + o.r.w + tx };
    return { ...o, s: { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) }, cut };
  });

  // 1. 글자-주인공 겹침
  let worst = { pct: 0, role: null };
  for (const t of texts) for (const o of subjects) {
    const pct = inter(t.r, o.s) / area(t.r);
    if (pct > worst.pct) worst = { pct, role: t.role };
  }
  metrics.textOverSubject = Math.round(worst.pct * 100);
  if (worst.pct >= 0.15) push('text-over-subject', `${worst.role} 글자가 주인공 위로 ${Math.round(worst.pct * 100)}% 겹침`);

  // 2. 로고 가림
  if (logoR) {
    const pct = Math.max(0, ...subjects.map(o => inter(logoR, o.s) / area(logoR)));
    metrics.logoCovered = Math.round(pct * 100);
    if (pct > 0.05) push('logo-covered', `주인공이 로고를 ${Math.round(pct * 100)}% 가림`);
  }

  // 3. 뚝 끊긴 변 — 주인공이 상자 변에서 잘리는데 그 변이 지면 안쪽이고 녹임이 없다
  for (const o of subjects) {
    const cs = getComputedStyle(o.el);
    const masked = (cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none');
    const inside = { top: o.r.y > 1, bottom: o.r.y + o.r.h < frame.h - 1, left: o.r.x > 1, right: o.r.x + o.r.w < frame.w - 1 };
    const hard = ['top', 'bottom', 'left', 'right'].filter(k => o.cut[k] && inside[k] && !masked);
    const rounded = parseFloat(cs.borderTopLeftRadius || '0') > 4;   // 둥근 상자(카카오 썸네일)는 상자가 의도
    if (hard.length && !rounded) push('hard-cut', `주인공이 상자 ${hard.map(k => ({ top: '윗변', bottom: '아랫변', left: '왼변', right: '오른변' }[k])).join('·')}에서 뚝 끊김(녹임 없음)`);
  }

  // 4. 빈 여백 — 아무것도 없는 가로 띠
  const bands = [...texts.map(t => t.r), ...subjects.map(o => (cutoutKv && o.s.w > 0) ? o.s : o.r), ...(logoR ? [logoR] : [])].map(r => [Math.max(0, r.y), Math.min(frame.h, r.y + r.h)]).sort((a, b) => a[0] - b[0]);
  // 가운데 구멍(내용 사이의 빈 띠)과 가장자리 여백(위·아래)을 구분한다 — 가로로 긴 그림을 세로 가운데에 두면 위아래가 비는 건 구성이지 구멍이 아니다(ABL 떼 1200×600). 가장자리는 36%, 가운데는 28%
  let cursor = 0, gapMid = 0, gapTop = 0;
  for (const [y0, y1] of bands) { if (y0 > cursor) { if (cursor === 0) gapTop = Math.max(gapTop, y0); else gapMid = Math.max(gapMid, y0 - cursor); } cursor = Math.max(cursor, y1); }
  const gapBottom = Math.max(0, frame.h - cursor);
  const edgeGap = Math.max(gapTop, gapBottom);
  const gap = Math.max(gapMid, edgeGap > frame.h * 0.36 ? edgeGap : 0);
  metrics.emptyBand = Math.round(Math.max(gapMid, edgeGap) / frame.h * 100); metrics.emptyMid = Math.round(gapMid / frame.h * 100);
  const bgKv = kvUse === 'bg' || kvUse === 'full';   // 그림이 지면 전체(질감·배경형·사진 전체) — 빈 띠가 그림이다
  const logoOnly = root.hasAttribute('data-logo-only');   // 프로필·로고 규격은 로고 하나가 가운데 — 빈 띠가 정상
  const templated = root.hasAttribute('data-template');   // 매체 템플릿이 글자 칸·그림 칸을 고정한 규격(자소설 달력·채용공고배너) — 빈 띠는 틀의 문제라 참고로만
  // 작은 누끼를 원본 1.5배에서 멈춰(CANON maxUpscale, --kv-capped) 생긴 빈 띠는 그림 탓(원본이 작다) — 참고로만(10-12 dongbu_illust 285px · dongsuh-model 174px)
  const capped = objs.some(o => /--kv-capped:\s*1/.test(o.el.getAttribute('style') || ''));
  if (frame.h >= 150 && !bgKv && !logoOnly && texts.length && gap / frame.h > 0.28) push('empty-band', `아무것도 없는 띠가 지면 높이의 ${Math.round(gap / frame.h * 100)}%${capped ? ' (작은 누끼를 1.5배에서 멈춤 — 큰 원본 필요)' : ''}`, (kvUse === 'none' || templated || capped) ? 'info' : 'warn');

  // 5. 글자 잘림
  for (const t of texts) {
    const el = t.el;
    // 줄 수 상한(line-clamp)에 걸려 「…」로 잘린 글자도 잘림이다(10-09 데스크탑: 긴 회사명 메인 「정규직…」을 못 봤다) — 세로로 넘친 높이가 반 줄 넘으면
    const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3 || 16;
    const clipped = (el.scrollWidth > el.clientWidth + 1 && cs.overflow !== 'visible') || (cs.overflow !== 'visible' && el.scrollHeight > el.clientHeight + lh * 0.5) || t.r.y + t.r.h > frame.h + 1 || t.r.x + t.r.w > frame.w + 1;
    if (clipped) { push('text-clipped', `${t.role} 글자가 잘리거나 지면 밖`); break; }
  }

  // 6. 알약 넘침
  for (const ch of root.querySelectorAll('[data-chip]')) { const r = R(ch); if (r.x + r.w > frame.w - 2) { push('chip-overflow', '라벨 알약이 오른쪽 밖으로'); break; } }

  // 7. 해상도(참고, 10-09 데스크탑: 236~600px 핀터레스트 그림) — 그림을 원본의 2배 넘게 키워 그리면 흐리다. 로고는 원본보다 크게 그리면(파비콘 16~48px) 뭉갠다.
  //    규칙 탓이 아니라 그림 탓이라 경고(warn) 대신 참고(info) — 디자이너에게 원본을 다시 받으라는 신호
  const kpx = kvMeta?.px;
  if (kpx?.[0] > 0) {
    let up = 0;
    for (const o of objs) { const img = drawnImage(o.el, o.r, ar ?? (kpx[0] / kpx[1])); up = Math.max(up, img.w / kpx[0]); }
    if (kvUse === 'bg' || kvUse === 'full') up = Math.max(up, Math.max(frame.w / kpx[0], frame.h / kpx[1]));
    metrics.kvUpscale = Math.round(up * 10) / 10;
    // 누끼는 1.5배(CANON maxUpscale.cutout, 10-12 desk-37-cut 계단) — 가장자리가 계단져 바탕 있는 그림보다 먼저 티가 난다
    if (up > (cutoutKv ? 1.55 : 2)) push('low-res', `키비주얼을 원본(${kpx[0]}×${kpx[1]})의 ${metrics.kvUpscale}배로 키움 — 흐림`, 'info');
  }
  if (logoEl?.naturalHeight > 0 && logoR?.h > logoEl.naturalHeight * 1.05) push('low-res-logo', `로고를 원본 높이(${logoEl.naturalHeight}px)보다 크게 그림(${Math.round(logoR.h)}px)`, 'info');

  // 8. 이음매(10-12 desk-15·GC녹십자·midas-cards-orange 「뚝 끊기는 느낌」)
  const rgbHex = str => { const m = String(str).match(/rgba?\(([^)]+)\)/g) ?? []; return m.map(x => x.match(/[\d.]+/g).slice(0, 4).map(Number)).filter(v => v.length < 4 || v[3] > 0.5).map(v => v.slice(0, 3)); };
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 441.673;
  const rcs = getComputedStyle(root);
  const fieldCols = [...rgbHex(rcs.backgroundColor), ...rgbHex(rcs.backgroundImage.replace(/url\([^)]*\)/g, ''))];
  const M = CANON.melt;
  if (M && !cutoutKv && fieldCols.length && kvMeta?.field?.edges) {
    for (const o of objs) {
      const cs = getComputedStyle(o.el); const mk = cs.webkitMaskImage && cs.webkitMaskImage !== 'none' ? cs.webkitMaskImage : cs.maskImage;
      if (!mk || mk === 'none') continue;
      for (const g of mk.split(/(?=linear-gradient)/)) {
        const dir = (g.match(/to (right|left|bottom|top)/) ?? [])[1]; if (!dir) continue;
        const stops = [...g.matchAll(/([\d.]+)%/g)].map(x => parseFloat(x[1])); const pct = stops.length ? Math.max(...stops) : 0;
        const side = { right: 'left', left: 'right', bottom: 'top', top: 'bottom' }[dir];
        const inside = side === 'left' ? o.r.x > 1 : side === 'right' ? o.r.x + o.r.w < frame.w - 1 : side === 'top' ? o.r.y > 1 : o.r.y + o.r.h < frame.h - 1;
        const kh = kvMeta.field.edges[side]?.hex; if (!inside || !kh) continue;
        const d = Math.max(...fieldCols.map(c => dist(c, hexRgb(kh))));
        if (d < 0.15) continue;
        const need = Math.round((M.min + (M.max - M.min) * Math.min(1, d / M.fullAt)) * 100);
        metrics.meltPct = Math.min(metrics.meltPct ?? 100, Math.round(pct)); metrics.meltNeed = Math.max(metrics.meltNeed ?? 0, need);
        if (pct < need * 0.7) { push('short-melt', `그림 ${({ left: '왼', right: '오른', top: '윗', bottom: '아랫' })[side]}변 녹임 ${Math.round(pct)}% — 지면과 색 거리 ${d.toFixed(2)}라 ${need}%는 돼야 이음매가 안 보임`); break; }
      }
    }
  }
  // 지면 전체 그림(배경형)을 아래·옆으로 밀어 둔 빈 띠를 단색으로 채우면 띠와 그림 사이가 가로 직선이 된다(midas-cards-orange 위 띠) — 그림 줄을 늘인 채움(data-kv-fill)이 없으면 경고
  if (kvUse === 'bg' && !root.hasAttribute('data-kv-fill')) {
    const pos = (rcs.backgroundPosition || '').split(',').pop().trim().split(/\s+/);
    const oy = pos[1]?.endsWith('px') ? parseFloat(pos[1]) : 0, ox = pos[0]?.endsWith('px') ? parseFloat(pos[0]) : 0;
    if (oy > 2 || ox > 2) push('band-seam', `지면 그림을 ${oy > 2 ? `아래로 ${Math.round(oy)}px` : `옆으로 ${Math.round(ox)}px`} 밀고 빈 띠를 단색으로 채움 — 띠와 그림 사이 직선`);
  }
  // 9. 질감 위 글자(CANON textureCalm) — 질감 전체 깔기에서 글자 아래가 어지러운데(busy > 0) 진정 스크림(data-calm)도 대비 스크림도 없으면 경고
  const TC = CANON.textureCalm, tx = kvMeta?.field?.texture;
  if (TC && tx && kvUse === 'bg' && root.getAttribute('data-field-source') === 'kv-texture' && !root.hasAttribute('data-calm') && !/linear-gradient/.test(rcs.backgroundImage)) {
    const busy = Math.max(((tx.spread ?? 0) - TC.spreadMin) / (TC.spreadFull - TC.spreadMin), (tx.sharp ?? 0) / TC.sharpFull);
    if (busy >= TC.busyMin && texts.length) push('busy-under-text', `글자 아래 질감이 어지러움(${Math.round(Math.min(1, busy) * 100)}%) — 글자 쪽 스크림 없음`);
  }

  const out = { warnings, metrics, counts: { texts: texts.length, objects: objs.length, logo: !!logoR } };
  if (debug) out.rects = { frame, texts: texts.map(t => ({ role: t.role, ink: t.r, box: t.box })), objects: subjects.map(o => ({ box: o.r, subject: o.s, cut: o.cut, img: (focus && ar) ? drawnImage(o.el, o.r, ar) : null })), logo: logoR, focus, ar, kvUse };
  return out;
}
