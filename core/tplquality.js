// core/tplquality.js — 시안 틀 품질 검수. 렌더한 그림을 청사진(피그마 시안)과 타이포·패딩·여백으로 잰다.
//   규칙을 지키느라 디자인이 틀어지면 통과가 아니다(11-02 사용자). 기준값은 시안 프레임에서 온다.

// rects: [{ role, x, y, w, h, fs, inkX, inkR }], fr: 시안 프레임(규격 크기로 환산한 값 scale 포함)
export function templateQuality(rects, { W, H, frame, sx, sy, sf, logo = null, kvBox = null, align = 'left', safeL = 0, norm = null }) {
  const fails = [], m = {};
  const short = Math.min(W, H);
  const main = rects.find(r => r.role === 'main');
  if (!main) return { ok: false, fails: ['메인 없음'], m };
  const fail = (code, msg) => fails.push({ code, msg });

  // 타이포: 메인 크기가 청사진의 70% 아래로 작아지면 위계가 무너진다. 메인은 나머지보다 커야 한다
  const bpMain = frame.rows.find(r => r.role === 'main');
  m.mainRatio = +(main.fs / (bpMain.fs * sf)).toFixed(2);
  if (m.mainRatio < 0.7) fail('type-small', `메인 ${main.fs}px — 청사진의 ${Math.round(m.mainRatio * 100)}%`);
  const others = rects.filter(r => r !== main && r.role !== 'label');
  m.hierarchy = others.length ? +(main.fs / Math.max(...others.map(r => r.fs))).toFixed(2) : null;
  if (m.hierarchy != null && m.hierarchy < 1.15) fail('type-hierarchy', `메인과 다음 글자 크기 비 ${m.hierarchy}`);

  // 과거 통과 소재 분포와 비교(core/template-norms.js)
  if (norm) {
    const v = main.fs / Math.sqrt(W * H); m.mainNorm = +v.toFixed(3);
    if (v < norm.main[0] * 0.82) fail('norm-main', `메인 ${main.fs}px — 통과 소재 하위선보다 작음`);
    if (m.hierarchy != null && 1 / m.hierarchy > norm.r2[2] * 1.05) fail('norm-r2', `둘째 글자가 메인의 ${Math.round(100 / m.hierarchy)}%`);
    const smallest = Math.min(...rects.map(r => r.fs)) / main.fs; m.rMin = +smallest.toFixed(2);
    if (smallest < norm.rMin[0] * 0.7) fail('norm-small', `가장 작은 글자가 메인의 ${Math.round(smallest * 100)}%`);
  }
  // 정렬: 같은 열의 글자는 기준선 하나
  const col = rects.filter(r => r.role !== 'label');
  const edge = r => (align === 'center' ? r.x + r.w / 2 : align === 'right' ? r.x + r.w : r.x);
  m.alignSpread = Math.round(Math.max(...col.map(edge)) - Math.min(...col.map(edge)));
  if (m.alignSpread > Math.max(2, W * 0.006) && !col.some(r => r.sideBy)) fail('align', `정렬선 차이 ${m.alignSpread}px`);

  // 패딩: 지면 끝까지 글자 여유. 짧은 변 4% 아래면 답답하다
  const minPad = short * 0.04;
  const L = Math.min(...rects.map(r => r.x)), R = W - Math.max(...rects.map(r => r.x + r.w)), T = Math.min(...rects.map(r => r.y)), B = H - Math.max(...rects.map(r => r.y + r.h));
  m.pad = { L: Math.round(L), R: Math.round(R), T: Math.round(T), B: Math.round(B) };
  if (L < minPad) fail('pad-left', `왼쪽 여백 ${Math.round(L)}px`);
  if (R < minPad) fail('pad-right', `오른쪽 여백 ${Math.round(R)}px`);
  if (T < minPad) fail('pad-top', `위 여백 ${Math.round(T)}px`);
  if (B < minPad) fail('pad-bottom', `아래 여백 ${Math.round(B)}px`);
  // 청사진 패딩과 비교: 왼쪽 정렬 시안의 왼쪽 패딩
  const bpL = Math.max(safeL, Math.min(...frame.rows.filter(r => r.role !== 'label').map(r => r.x)) * sx);
  if (align === 'left') { m.padVsBlueprint = +(L / Math.max(1, bpL)).toFixed(2); if (bpL >= minPad && (m.padVsBlueprint < 0.7 || m.padVsBlueprint > 1.5)) fail('pad-blueprint', `왼쪽 패딩 ${Math.round(L)}px, 청사진 ${Math.round(bpL)}px`); }

  // 여백: 줄 사이 간격. 겹치거나, 글자보다 훨씬 벌어지면 덩어리가 깨진다
  const stack = [...rects].filter(r => !r.sideBy && r.role !== 'label').sort((a, b) => a.y - b.y);
  m.gaps = [];
  for (let i = 1; i < stack.length; i++) {
    const a = stack[i - 1], b = stack[i], g = b.y - (a.y + a.h);
    m.gaps.push(Math.round(g));
    if (g < -1) fail('overlap', `${a.role}·${b.role} 겹침 ${Math.round(-g)}px`);
    else if (g < Math.min(a.fs, b.fs) * 0.12) fail('gap-tight', `${a.role}·${b.role} 간격 ${Math.round(g)}px`);
    else if (g > Math.max(main.fs * 2.2, H * 0.22)) fail('gap-loose', `${a.role}·${b.role} 간격 ${Math.round(g)}px`);
  }

  // 글자 덩어리와 그림·로고 사이 여유
  const box = { x0: L, x1: W - R, y0: T, y1: H - B };
  const hit = (o, pad = 0) => box.x0 < o.x + o.w + pad && box.x1 > o.x - pad && box.y0 < o.y + o.h + pad && box.y1 > o.y - pad;
  if (logo) {
    for (const r of rects) if (r.x < logo.x + logo.w + 4 && r.x + r.w > logo.x - 4 && r.y < logo.y + logo.h + 4 && r.y + r.h > logo.y - 4) { fail('logo-touch', `로고와 ${r.role} 맞닿음`); break; }
    const lp = { L: logo.x, R: W - logo.x - logo.w, T: logo.y, B: H - logo.y - logo.h };
    if (Math.min(lp.R, lp.L, lp.T, lp.B) < short * 0.03) fail('logo-pad', '로고 여백 부족');
  }
  m.textBlock = { w: Math.round(box.x1 - box.x0), h: Math.round(box.y1 - box.y0) };
  // 지면이 비어 보이는지: 글자 덩어리가 지면의 8% 미만이면 텅 빈다
  m.textArea = +((box.x1 - box.x0) * (box.y1 - box.y0) / (W * H)).toFixed(3);
  if (m.textArea < 0.03 && !kvBox) fail('empty', `글자 덩어리 ${Math.round(m.textArea * 100)}%`);
  void hit;
  return { ok: fails.length === 0, fails, m };
}

// iframe 문서에서 글자 상자를 잰다(시안 렌더 전용: data-field 는 글자 칸)
export function measureTemplateDoc(doc) {
  const root = doc.querySelector('[data-ad]'); if (!root) return null;
  const base = root.getBoundingClientRect();
  const rects = [...root.querySelectorAll('[data-field]')].map(el => {
    const range = doc.createRange(); range.selectNodeContents(el);
    const rs = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
    if (!rs.length) return null;
    const hasBox = doc.defaultView.getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)' || doc.defaultView.getComputedStyle(el).borderTopWidth !== '0px';
    const b = hasBox ? el.getBoundingClientRect() : { left: Math.min(...rs.map(r => r.left)), right: Math.max(...rs.map(r => r.right)), top: Math.min(...rs.map(r => r.top)), bottom: Math.max(...rs.map(r => r.bottom)) };
    const lbl = el.previousElementSibling?.dataset?.field === 'label' ? el.previousElementSibling.getBoundingClientRect() : null;
    return { role: el.dataset.field, sideBy: !!lbl && lbl.bottom > b.top, x: b.left - base.left, y: b.top - base.top, w: b.right - b.left, h: b.bottom - b.top, fs: parseFloat(doc.defaultView.getComputedStyle(el).fontSize) };
  }).filter(Boolean);
  const lg = root.querySelector('[data-logo]');
  const lr = lg?.getBoundingClientRect();
  return { rects, logo: lr ? { x: lr.left - base.left, y: lr.top - base.top, w: lr.width, h: lr.height } : null, W: base.width, H: base.height };
}
