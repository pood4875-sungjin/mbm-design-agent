// 로고 손질 — 단색 바탕 지우기(누끼) · 투명 여백 트림 · 밝기(톤) 판정. RGBA 배열만 받는 순수 함수(브라우저 캔버스·노드 둘 다).
// 앱(app/app.js prepLogo·logoToneOf)과 케이스 장부(scripts/cases.mjs add --logo)가 같은 규칙을 쓴다.
// 10-09 데스크탑 로고 테스트: 장부는 로고를 손질 없이 넣고 톤을 'dark'로 박아 두어, 흰 상자 로고가 어두운 지면에서 흰 네모(반전 필터)로 떴다.
//   앱에서만 손질하면 장부가 앱과 다른 그림을 검수한다 — 규칙을 core 한 곳에 둔다.

const LUM = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

// 단색 바탕 지우기 — 네 모서리(짧은 변 2% 안쪽) 중 셋 이상이 같은 색(차 ≤ 30)·불투명이면(또는 테두리의 60%가 한 색이면) 그 색을 바탕으로 보고, 가장자리에서 이어진 바탕 픽셀만 지운다.
// 안쪽에 갇힌 바탕색 구멍(글자 속): opts.holes=true 면 지우고(단색 변환용), false 면 남기고, 기본은 바탕이 어두운 상자(검정·남색 — 상자 찌꺼기)일 때만 지운다.
// 흰·밝은 바탕의 속(엠블럼 안 흰 원판·흰 글자)은 원색 그대로 쓸 때 남긴다(10-12 결정 12). 거리 0~60 투명, 60~110 부드럽게. 지운 몫이 2% 미만이면 null(바탕 없음).
// 흰 바탕만이 아니다 — 남색 상자(기아)·주황 상자(제주항공)도 바탕으로 지운다: 상자째 올리면 지면 위에 색 네모가 뜬다.
export function knockoutLogo(d, W, H, opts = {}) {
  if (!W || !H) return null;
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  const inset = Math.max(1, Math.round(Math.min(W, H) * 0.02));
  const corners = [px(inset, inset), px(W - 1 - inset, inset), px(inset, H - 1 - inset), px(W - 1 - inset, H - 1 - inset)];
  if (corners.filter(c => c[3] < 250).length >= 2) return null;   // 이미 투명 배경
  // 테두리 한 바퀴의 10% 이상이 투명이어도 이미 투명 배경이다 — 글자가 꽉 차 세 모서리에 닿은 투명 PNG(10-12 desk-08 KMA 검정 글자)를
  // 「검정 바탕」으로 보고 로고를 통째로 지웠다(앱에서 올려도 같다)
  { let t = 0, n = 0; const st = Math.max(1, Math.floor((W + H) / 400));
    for (let x = 0; x < W; x += st) { n += 2; t += (px(x, inset)[3] < 250) + (px(x, H - 1 - inset)[3] < 250); }
    for (let y = 0; y < H; y += st) { n += 2; t += (px(inset, y)[3] < 250) + (px(W - 1 - inset, y)[3] < 250); }
    if (t >= n * 0.1) return null; }
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
  const ddOf = i => Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]);
  const spread = () => {
    let n = 0;
    while (stack.length) {
      const k = stack.pop(); const x = k % W, y = (k - x) / W; const i = k * 4;
      const dd = ddOf(i);
      if (dd >= 110) continue;                        // 로고 픽셀 — 여기서 멈춘다
      d[i + 3] = dd < 60 ? 0 : Math.round(255 * (dd - 60) / 50);   // 바깥은 투명, 경계는 부드럽게
      n++;
      if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < H - 1) push(x, y + 1);
    }
    return n;
  };
  const removed = spread();
  if (removed < W * H * 0.02) return null;
  if (removed > W * H * 0.98) return null;   // 다 지워졌다 — 바탕이 아니라 로고를 바탕으로 잘못 본 것(원본은 이미 바뀌었으니 부르는 쪽이 복사본을 넘긴다)
  // 글자 속 구멍(O·A·P 속, 검정 상자 로고의 글자 속)도 지운다 — 남기면 단색 변환(어두운 지면 흰색 · 밝은 지면 검정 · 색 겹침 검정) 때 속이 메워져
  // 글자가 덩어리가 된다(10-12 desk-10 아모레퍼시픽 「AM●RE」·P 속, desk-34 도루코). 투명 PNG 로고는 원래 속이 비어 있다 — 바탕을 지운 JPG/PNG도 같게.
  // 바탕색과 아주 가까운(거리 < 40) 픽셀에서 다시 번진다(경계는 바깥과 같은 규칙으로 부드럽게). 10-09까지는 「안쪽 흰 구멍은 남긴다」였다
  // 10-12 결정 12: 원색 로고를 그대로 보일 때는 속을 남긴다 — 색 엠블럼 안의 흰 글자가 투명해지면 밝은 지면에서 지면색이 비친다.
  //   그래서 흰·밝은 바탕(밝기 ≥ 0.6)의 속은 기본으로 남기고, 단색(흰/검정) 변환에 쓰는 사본만 holes:true(prepLogoRGBA mono · 렌더러 style.logoMono).
  //   어두운 상자(도루코 검정 상자 속 O)의 속은 상자 찌꺼기라 원색에서도 지운다 — 남기면 어두운 지면에 검은 점이 뜬다
  let holes = 0;
  const holesOn = opts.holes === true || (opts.holes !== false && LUM(bg[0], bg[1], bg[2]) < 0.6);
  if (holesOn) for (let k = 0; k < W * H; k++) { if (seen[k] || ddOf(k * 4) >= 40) continue; seen[k] = 1; stack.push(k); holes += spread(); }
  return { removed: Math.round(removed / (W * H) * 100), holes: Math.round(holes / (W * H) * 1000) / 10, bg: '#' + bg.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase() };
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
  return { px: [W, H], lum: n ? Math.round(lum / n * 100) / 100 : null, sat: n ? Math.round(sat / n * 100) / 100 : null, solid: tot ? Math.round(vis / tot * 100) / 100 : null, tone: logoToneOf(d, W, H), colors: logoColors(d, W, H) };
}

// 로고 대표색 — 불투명 픽셀(α≥128)을 채널당 8단계로 묶어 넓은 순 3색 + 면적 몫(share). 무채색(검정 글자·흰 글자)도 센다.
// 렌더러가 「로고 색 = 지면 색」(주황 로고 × 주황 지면)을 알아채 단색으로 바꿀 때 쓴다(core/canon.js logoClash · 10-12 desk-37)
export function logoColors(d, W, H, count = 3) {
  const step = Math.max(1, Math.floor(Math.sqrt(W * H / 40000)));
  const B = new Map(); let n = 0;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const i = (y * W + x) * 4; if (d[i + 3] < 128) continue;
    const k = (d[i] >> 5) * 64 + (d[i + 1] >> 5) * 8 + (d[i + 2] >> 5);
    const b = B.get(k) ?? { n: 0, r: 0, g: 0, b: 0 }; b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; B.set(k, b); n++;
  }
  if (!n) return [];
  const hex = v => Math.round(v).toString(16).padStart(2, '0');
  return [...B.values()].sort((a, b) => b.n - a.n).slice(0, count)
    .map(b => ({ hex: ('#' + hex(b.r / b.n) + hex(b.g / b.n) + hex(b.b / b.n)).toUpperCase(), share: Math.round(b.n / n * 100) / 100 }));
}

// 한 번에 — 바탕 지우기 → 여백 트림. 새 RGBA와 크기, 사용자에게 알릴 한 줄을 돌려준다(원본 배열은 바뀔 수 있다)
//   rgba: 원색 그대로 쓸 로고(글자 속 흰색은 남김) · mono: 단색 변환용 사본(글자 속까지 지움, 같은 트림) — 지울 속이 없으면 null(10-12 결정 12)
export function prepLogoRGBA(d, W, H) {
  const notes = [];
  const kd = new Uint8ClampedArray(d);   // 지우기는 복사본에서 — 실패(null)면 원본 그대로 트림한다
  const md = new Uint8ClampedArray(d);
  const k = knockoutLogo(kd, W, H); if (k) d = kd;
  const km = k ? knockoutLogo(md, W, H, { holes: true }) : null;
  const mono0 = km?.holes > (k?.holes ?? 0) ? md : null;   // 원색에 남긴 속이 있을 때만 사본
  if (k) notes.push(`배경 ${k.removed}% 지움(투명 누끼)${mono0 ? ` · 단색용은 글자 속 ${km.holes}%도` : ''}`);
  const t = trimBox(d, W, H);
  const crop = a => { if (!t) return a; const o = new Uint8ClampedArray(t.w * t.h * 4); for (let y = 0; y < t.h; y++) o.set(a.subarray(((t.y + y) * W + t.x) * 4, ((t.y + y) * W + t.x + t.w) * 4), y * t.w * 4); return o; };
  const out = crop(d), ow = t ? t.w : W, oh = t ? t.h : H;
  if (t) notes.push(`여백 트림 ${W}×${H}→${ow}×${oh}`);
  const mono = mono0 ? crop(mono0) : null;
  // 실측(톤·대표색·채움)은 잉크만 — 남긴 흰 속을 세면 흰 원판 엠블럼(볼보)이 「흰색 로고」로 잡혀 지면이 어두워진다. 속을 지운 사본으로 잰다
  return { rgba: out, mono, w: ow, h: oh, changed: !!(k || t), note: notes.join(' · '), meta: logoMeta(mono ?? out, ow, oh) };
}
