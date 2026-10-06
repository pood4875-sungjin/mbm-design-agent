// 디자인 검수 — 그려진 소재(DOM)를 재서 "디자이너가 보면 걸리는 것"을 경고로 낸다. 규격 검사(core/lint.js: 치수·용량·글자수)와 별개의 눈.
// 브라우저에서 돈다(앱의 프레임 iframe · scripts/cases.mjs 의 케이스 시트). 측정은 실제 레이아웃(getBoundingClientRect)이라 추정이 아니다.
//   글자-주인공 겹침: 글자 상자가 주인공 상자(kvMeta.focus를 그린 위치로 환산) 위에 15% 넘게 올라가면 경고(여우 귀 위 글자)
//   로고 가림: 주인공이 로고 상자를 5% 넘게 덮으면 경고(970 여우)
//   뚝 끊긴 변: 주인공이 오브젝트 상자 변에서 잘리는데 그 변이 지면 안쪽이고 녹임(mask)이 없으면 경고
//   빈 여백: 글자도 그림도 로고도 없는 가로 띠가 지면 높이의 28%를 넘으면 경고(300×1050 아래 여백)
//   글자 잘림: 글자 요소가 스크롤되거나 지면 밖으로 나가면 경고
//   알약 넘침: 라벨 알약이 지면 오른쪽 밖으로

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
  const focus = kvMeta?.field?.focus, ar = kvMeta?.ar;

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
  let cursor = 0, gap = 0;
  for (const [y0, y1] of bands) { if (y0 > cursor) gap = Math.max(gap, y0 - cursor); cursor = Math.max(cursor, y1); }
  gap = Math.max(gap, frame.h - cursor);
  metrics.emptyBand = Math.round(gap / frame.h * 100);
  const bgKv = kvUse === 'bg' || kvUse === 'full';   // 그림이 지면 전체(질감·배경형·사진 전체) — 빈 띠가 그림이다
  const logoOnly = root.hasAttribute('data-logo-only');   // 프로필·로고 규격은 로고 하나가 가운데 — 빈 띠가 정상
  if (frame.h >= 150 && !bgKv && !logoOnly && texts.length && gap / frame.h > 0.28) push('empty-band', `아무것도 없는 띠가 지면 높이의 ${Math.round(gap / frame.h * 100)}%`, kvUse === 'none' ? 'info' : 'warn');

  // 5. 글자 잘림
  for (const t of texts) {
    const el = t.el;
    const clipped = (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') || t.r.y + t.r.h > frame.h + 1 || t.r.x + t.r.w > frame.w + 1;
    if (clipped) { push('text-clipped', `${t.role} 글자가 잘리거나 지면 밖`); break; }
  }

  // 6. 알약 넘침
  for (const ch of root.querySelectorAll('[data-chip]')) { const r = R(ch); if (r.x + r.w > frame.w - 2) { push('chip-overflow', '라벨 알약이 오른쪽 밖으로'); break; } }

  const out = { warnings, metrics, counts: { texts: texts.length, objects: objs.length, logo: !!logoR } };
  if (debug) out.rects = { frame, texts: texts.map(t => ({ role: t.role, ink: t.r, box: t.box })), objects: subjects.map(o => ({ box: o.r, subject: o.s, cut: o.cut, img: (focus && ar) ? drawnImage(o.el, o.r, ar) : null })), logo: logoR, focus, ar, kvUse };
  return out;
}
