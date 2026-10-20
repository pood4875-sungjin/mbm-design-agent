// 키비주얼 「애매한 여백」 판정 — 순수 함수. scripts/kv-gap-audit.mjs(여백 전수조사)와 scripts/quality-audit.mjs(종합 점수표 ②축)가 같은 자로 잰다(10-20).
//   입력은 headless Chrome DOM 에서 읽은 규격 하나의 측정값 m = { w, h, kvUse, logoOnly, trace: { mode, rules, tImage }, objs: [{ x, y, w, h, size, pos, hasBg, visible, kvOnly, melt, meltDir, bust }] }
//   판정: 그림(누끼 contain 은 kvMeta.px 비율로 계산한 실제 그림, 사진 cover 는 칸) 오른쪽·아래 변이 캔버스 변에서 MIN_GAP px 초과 ~ 변 길이 MAX_RATIO 이하 떨어지면 ✗.
//   예외(✓, 수치는 남김): ① 매체 JSON mold.image.edgeInset(템플릿 칸 자체가 안쪽) ② 전폭 띠 안에서 그림이 좌우 대칭 가운데.
export const MIN_GAP = 2, MAX_RATIO = 0.12;   // ✗ 구간: 2px 초과 ~ 변 길이 12% 이하
const r1 = v => Math.round(v * 10) / 10;

// 배경 size/position → 칸 안 실제 그림 사각형(칸 좌표계). 누끼 contain·auto 는 kvMeta.px 비율로, cover·퍼센트 크기(주인공 자르기)는 칸 전체
export function drawnRect(obj, px) {
  const [iw, ih] = px ?? [obj.w, obj.h]; const ar = iw / ih; const bw = obj.w, bh = obj.h;
  const size = String(obj.size).trim(), pos = String(obj.pos).trim().split(/\s+/);
  const lenOf = (s, total) => s.endsWith('%') ? total * parseFloat(s) / 100 : parseFloat(s);
  let dw, dh, fit;
  if (size === 'contain') { const k = Math.min(bw / iw, bh / ih); dw = iw * k; dh = ih * k; fit = 'contain'; }
  else if (size === 'cover') { return { x: 0, y: 0, w: bw, h: bh, fit: 'cover' }; }
  else if (size === 'auto' || size === 'auto auto') { dw = iw; dh = ih; fit = 'native'; }
  else { const [sw, sh] = size.split(/\s+/); if (sw === 'auto' && sh) { dh = lenOf(sh, bh); dw = dh * ar; fit = 'autoH'; } else if (sh === 'auto' || !sh) { dw = lenOf(sw, bw); dh = dw / ar; fit = 'autoW'; } else { dw = lenOf(sw, bw); dh = lenOf(sh, bh); fit = 'size'; } }
  // CSS: 퍼센트 위치 = (칸 − 그림) × p, px 는 그대로
  const ox = pos[0] ? (pos[0].endsWith('%') ? (bw - dw) * parseFloat(pos[0]) / 100 : parseFloat(pos[0])) : 0;
  const oy = pos[1] ? (pos[1].endsWith('%') ? (bh - dh) * parseFloat(pos[1]) / 100 : parseFloat(pos[1])) : 0;
  return { x: ox, y: oy, w: dw, h: dh, fit };
}

// 규격 하나 판정 → row 에 덧붙일 필드들(skip 또는 verdict·gap·why·bad·obj·img·full·symmetric·inset·mode·kvUse·tImage·rules)
//   sp = adSpecEntries() 항목(rules.safeArea…edgeInset 을 읽는다) · px = kvMeta.px
export function judgeGap(m, sp, px) {
  const row = {};
  if (!m) { row.skip = '측정 실패'; return row; }
  if (m.logoOnly || (m.trace?.rules ?? []).includes('visualOnly') || (m.objs ?? []).some(x => x.kvOnly)) { row.skip = m.logoOnly ? '로고만 규격' : 'visualOnly'; return row; }
  const obj = (m.objs ?? []).find(x => x.visible && x.hasBg) ?? null;
  row.mode = m.trace?.mode ?? null; row.kvUse = m.kvUse; row.tImage = m.trace?.tImage ?? null; row.rules = (m.trace?.rules ?? []).filter(r => /Bleed|bleed|templateMold|Full|Col|corner|Corner|band|Band/.test(r));
  if (!obj) { row.skip = m.kvUse === 'none' ? '키비주얼 없음(kvUse none)' : '오브젝트 없음(' + m.kvUse + ')'; return row; }
  const W = m.w, H = m.h;
  row.obj = { x: r1(obj.x), y: r1(obj.y), w: r1(obj.w), h: r1(obj.h), size: obj.size, pos: obj.pos, melt: obj.melt, meltDir: obj.meltDir, bust: obj.bust };
  const full = obj.x <= 1 && obj.y <= 1 && obj.x + obj.w >= W - 1 && obj.y + obj.h >= H - 1;   // 지면 전체(photoFull·roomFull·textureFull)
  const d = drawnRect(obj, px);
  // 보이는 그림 = 그림 ∩ 칸(overflow hidden) ∩ 캔버스
  const vx0 = Math.max(obj.x, obj.x + d.x, 0), vy0 = Math.max(obj.y, obj.y + d.y, 0);
  const vx1 = Math.min(obj.x + obj.w, obj.x + d.x + d.w, W), vy1 = Math.min(obj.y + obj.h, obj.y + d.y + d.h, H);
  row.img = { x: r1(obj.x + d.x), y: r1(obj.y + d.y), w: r1(d.w), h: r1(d.h), fit: d.fit, visible: { x: r1(vx0), y: r1(vy0), r: r1(vx1), b: r1(vy1) } };
  const gapR = W - vx1, gapB = H - vy1, slotGapR = W - (obj.x + obj.w), slotGapB = H - (obj.y + obj.h);
  row.gap = { right: r1(gapR), bottom: r1(gapB), slotRight: r1(slotGapR), slotBottom: r1(slotGapB) };
  const amb = (g, len) => g > MIN_GAP && g <= len * MAX_RATIO;
  const bad = []; if (amb(gapR, W)) bad.push(`오른쪽 ${r1(gapR)}px`); if (amb(gapB, H)) bad.push(`아래 ${r1(gapB)}px`);
  row.full = full;
  // 예외 ① 템플릿 칸이 의도적으로 안쪽(매체 JSON mold.image.edgeInset — 자소설 PC팝업 샘플 상자 8/30 · 카카오 비즈보드 r10 상자 53/37): 수치는 남기고 ✓
  const inset = sp?.rules?.safeArea?.measuredFromTemplate?.mold?.image?.edgeInset ?? null;
  // 예외 ② 칸이 캔버스 왼쪽·오른쪽 변에 다 닿는 전폭 띠(또는 양쪽으로 넘치는 블리드 상자) 안에서 그림이 좌우 대칭으로 가운데: 「한쪽이 비는」 틈이 아니라 가운데 구성(NAP 320×480 사용자 수정본 「그림 (25,310) 270×170」 도 좌우 25/25)
  //   ②′ 칸 자체가 좌우 같은 여백으로 가운데 놓인 템플릿 띠(자소설 달력 328 칸 in 350 → 11/11 · 구글 300×600 하단 칸 31/32)도 「한쪽이 비는」 틈이 아니다(10-20 종합 점수표)
  const gapL = vx0; const slotGapL = obj.x;
  const sym = (obj.x <= 1 && obj.x + obj.w >= W - 1 && Math.abs(gapL - gapR) <= 1 && gapR > MIN_GAP) || (Math.abs(slotGapL - slotGapR) <= 1 && slotGapR > MIN_GAP && Math.abs(gapL - gapR) <= 1);
  row.gap.left = r1(gapL); row.symmetric = sym; row.inset = inset;
  const badEff = bad.filter(b => !(inset && ((b.startsWith('오른쪽') && inset.right != null) || (b.startsWith('아래') && inset.bottom != null)))).filter(b => !(sym && b.startsWith('오른쪽')));
  row.verdict = badEff.length ? '✗' : '✓'; row.bad = badEff;
  // 사유: 틈이 칸 자체의 틈과 같으면 「칸이 변에서 떨어짐」(데이터), 칸은 닿는데 그림이 떨어졌으면 「칸 안 그림 정렬」(렌더러)
  const slotWhy = (g, sg) => Math.abs(g - sg) < 1 ? '칸이 변에서 떨어짐' : '칸 안 그림 정렬(' + d.fit + ')';
  row.why = badEff.length ? [...new Set(badEff.map(b => b.startsWith('오른쪽') ? slotWhy(gapR, slotGapR) : slotWhy(gapB, slotGapB)))].join('·')
    : inset && bad.length ? `템플릿 칸 안쪽(의도, edgeInset ${Object.entries(inset).map(([k, v]) => k + ' ' + v).join('·')})` : sym && bad.length ? `${obj.x <= 1 ? '전폭 띠' : '가운데 칸'} 가운데 대칭(좌 ${r1(gapL)} = 우 ${r1(gapR)})` : (gapR > W * MAX_RATIO || gapB > H * MAX_RATIO ? '의도한 여백(12% 초과)' : full ? '지면 전체' : '붙음');
  return row;
}

// 브라우저 안에서 규격 루트 하나의 여백 측정 입력(m)을 만드는 코드 — 문자열로 두어 시트 <script> 에 박는다. root 는 [data-ad] 요소
export const GAP_COLLECT_JS = `
function collectGap(root) {
  const rr = root.getBoundingClientRect();
  const objs = [...root.querySelectorAll('[data-object="1"]')].map(o => { const b = o.getBoundingClientRect(), cs = getComputedStyle(o); return { x: b.left - rr.left, y: b.top - rr.top, w: b.width, h: b.height, size: cs.backgroundSize, pos: cs.backgroundPosition, hasBg: cs.backgroundImage !== 'none', kvOnly: o.dataset.kvOnly ?? null, bust: o.dataset.bust ?? null, melt: o.dataset.melt ?? null, meltDir: o.dataset.meltDir ?? null, bleed: o.dataset.bleed ?? null, visible: cs.visibility !== 'hidden' && cs.display !== 'none' && b.width > 0 && b.height > 0 }; });
  let trace = null; try { trace = JSON.parse(root.dataset.trace); } catch {}
  return { w: rr.width, h: rr.height, kvUse: root.dataset.kvUse ?? null, logoOnly: root.dataset.logoOnly ?? null, template: root.dataset.template ?? null, mold: root.dataset.mold ?? null, objs, trace: trace ? { mode: trace.mode, rules: trace.rules, tImage: trace.place?.tImage ?? null, gate: trace.gate ?? null, kv: trace.kv ?? null } : null };
}`;
