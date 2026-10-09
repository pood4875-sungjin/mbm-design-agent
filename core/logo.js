// 로고 손질 — 단색 바탕 지우기(누끼) · 투명 여백 트림 · 밝기(톤) 판정. RGBA 배열만 받는 순수 함수(브라우저 캔버스·노드 둘 다).
// 앱(app/app.js prepLogo·logoToneOf)과 케이스 장부(scripts/cases.mjs add --logo)가 같은 규칙을 쓴다.
// 10-09 데스크탑 로고 테스트: 장부는 로고를 손질 없이 넣고 톤을 'dark'로 박아 두어, 흰 상자 로고가 어두운 지면에서 흰 네모(반전 필터)로 떴다.
//   앱에서만 손질하면 장부가 앱과 다른 그림을 검수한다 — 규칙을 core 한 곳에 둔다.

const LUM = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

// 단색 바탕 지우기 — 네 모서리(짧은 변 2% 안쪽) 중 셋 이상이 같은 색(차 ≤ 30)·불투명이면(또는 테두리의 60%가 한 색이면) 그 색을 바탕으로 보고, 가장자리에서 이어진 바탕 픽셀만 지운다.
// 안쪽에 갇힌 같은 색(글자 속 흰 구멍)은 남는다. 거리 0~60 투명, 60~110 부드럽게. 지운 몫이 2% 미만이면 null(바탕 없음).
// 흰 바탕만이 아니다 — 남색 상자(기아)·주황 상자(제주항공)도 바탕으로 지운다: 상자째 올리면 지면 위에 색 네모가 뜬다.
export function knockoutLogo(d, W, H) {
  if (!W || !H) return null;
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  const inset = Math.max(1, Math.round(Math.min(W, H) * 0.02));
  const corners = [px(inset, inset), px(W - 1 - inset, inset), px(inset, H - 1 - inset), px(W - 1 - inset, H - 1 - inset)];
  if (corners.filter(c => c[3] < 250).length >= 2) return null;   // 이미 투명 배경
  // 바탕색 = 네 모서리 중 서로 같은(차 ≤ 30) 셋 이상의 평균. 10-09 데스크탑: 아모레퍼시픽 JPG는 글자가 아래 두 모서리에 닿아 네 모서리가 갈렸다 —
  // 셋이 안 되면 테두리 한 바퀴의 픽셀 60% 이상이 같은 색일 때 그 색(글자가 두 모서리를 덮어도 테두리 대부분은 바탕)
  let bgc = null;
  for (const c0 of corners) { const same = corners.filter(c => c[3] >= 250 && dist(c, c0) <= 30); if (same.length >= 3) { bgc = same; break; } }
  if (!bgc) {
    const ring = []; const st = Math.max(1, Math.floor((W + H) / 400));
    for (let x = 0; x < W; x += st) { ring.push(px(x, inset), px(x, H - 1 - inset)); } for (let y = 0; y < H; y += st) { ring.push(px(inset, y), px(W - 1 - inset, y)); }
    for (const c0 of corners) { const same = ring.filter(c => c[3] >= 250 && dist(c, c0) <= 30); if (same.length >= ring.length * 0.6) { bgc = same; break; } }
  }
  if (!bgc) return null;   // 단색 배경이 아니다
  const bg = bgc.reduce((a, c) => [a[0] + c[0] / bgc.length, a[1] + c[1] / bgc.length, a[2] + c[2] / bgc.length], [0, 0, 0]);
  const seen = new Uint8Array(W * H); const stack = [];
  const push = (x, y) => { const k = y * W + x; if (!seen[k]) { seen[k] = 1; stack.push(k); } };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); } for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  let removed = 0;
  while (stack.length) {
    const k = stack.pop(); const x = k % W, y = (k - x) / W; const i = k * 4;
    const dd = Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]);
    if (dd >= 110) continue;                        // 로고 픽셀 — 여기서 멈춘다
    d[i + 3] = dd < 60 ? 0 : Math.round(255 * (dd - 60) / 50);   // 바깥은 투명, 경계는 부드럽게
    removed++;
    if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < H - 1) push(x, y + 1);
  }
  if (removed < W * H * 0.02) return null;
  return { removed: Math.round(removed / (W * H) * 100), bg: '#' + bg.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase() };
}

// 투명 여백 트림 상자 — 불투명(α>10) 상자 + 긴 변의 3% 숨. 불투명 97% 넘거나(바탕 있는 그림) 잘라낼 게 8% 미만이면 null
export function trimBox(d, W, H) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1, opaque = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] <= 10) continue;
    opaque++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0 || opaque > W * H * 0.97) return null;
  const pad = Math.max(1, Math.round(Math.max(x1 - x0, y1 - y0) * 0.03));
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w * h > W * H * 0.92) return null;
  return { x: x0, y: y0, w, h };
}

// 로고 밝기 — 불투명 픽셀(α≥128)의 평균 밝기 > 0.8이고 채도 < 0.25면 흰색 로고('light'). 흰색 로고만 있으면 지면이 어두워야 보인다.
// 바탕을 지우기 전에 재면 흰 상자가 밝기를 끌어올린다 — knockoutLogo 다음에 잰다
export function logoToneOf(d, W, H) {
  let n = 0, lum = 0, sat = 0;
  const step = Math.max(1, Math.floor(Math.sqrt(W * H / 40000)));
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const i = (y * W + x) * 4; if (d[i + 3] < 128) continue;
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    lum += 0.2126 * r + 0.7152 * g + 0.0722 * b; sat += Math.max(r, g, b) - Math.min(r, g, b); n++;
  }
  if (!n) return 'dark';
  return (lum / n > 0.8 && sat / n < 0.25) ? 'light' : 'dark';
}

// 로고 실측 — 렌더러가 지면에 맞춰 로고를 다룰 때 쓴다(core/renderers/ad.js logoFilter).
//   lum: 불투명 픽셀 평균 밝기 · sat: 평균 채도 · solid: 불투명 픽셀이 트림 상자에서 차지하는 몫(엠블럼·상자형은 0.6↑, 워드마크 0.2~0.4)
//   px: 원본 크기(작은 파비콘 경고용)
export function logoMeta(d, W, H) {
  let n = 0, lum = 0, sat = 0, vis = 0;
  const step = Math.max(1, Math.floor(Math.sqrt(W * H / 40000)));
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const i = (y * W + x) * 4; const a = d[i + 3]; if (a > 10) vis++; if (a < 128) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    lum += LUM(r, g, b); sat += (Math.max(r, g, b) - Math.min(r, g, b)) / 255; n++;
  }
  const tot = Math.ceil(W / step) * Math.ceil(H / step);
  return { px: [W, H], lum: n ? Math.round(lum / n * 100) / 100 : null, sat: n ? Math.round(sat / n * 100) / 100 : null, solid: tot ? Math.round(vis / tot * 100) / 100 : null, tone: logoToneOf(d, W, H) };
}

// 한 번에 — 바탕 지우기 → 여백 트림. 새 RGBA와 크기, 사용자에게 알릴 한 줄을 돌려준다(원본 배열은 바뀔 수 있다)
export function prepLogoRGBA(d, W, H) {
  const notes = [];
  const k = knockoutLogo(d, W, H);
  if (k) notes.push(`배경 ${k.removed}% 지움(투명 누끼)`);
  const t = trimBox(d, W, H);
  let out = d, ow = W, oh = H;
  if (t) {
    out = new Uint8ClampedArray(t.w * t.h * 4);
    for (let y = 0; y < t.h; y++) out.set(d.subarray(((t.y + y) * W + t.x) * 4, ((t.y + y) * W + t.x + t.w) * 4), y * t.w * 4);
    ow = t.w; oh = t.h; notes.push(`여백 트림 ${W}×${H}→${ow}×${oh}`);
  }
  return { rgba: out, w: ow, h: oh, changed: !!(k || t), note: notes.join(' · '), meta: logoMeta(out, ow, oh) };
}
