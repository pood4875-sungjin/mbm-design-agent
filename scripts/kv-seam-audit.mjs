#!/usr/bin/env node
// 키비주얼 「이음」 전수 감사 (10-20 사용자: 「어떤 키비주얼을 넣어도 끊김이나 배경 컬러와 이질감이 들게, 배경이 들어가는 이슈를 여러 테스트 돌려서 해결하고 검수해 줘」)
//   모든 케이스(ref/learned/cases/cases.json) × 추출 규격(core/media/_extract.json, 전달물 asset 제외)을 renderArtifact 로 그려
//   headless Chrome 한 번에 DOM(그림 상자·마스크·글자 상자) + 스크린샷(PNG) 을 받아 node 에서 픽셀을 읽는다(scripts/lib/png.mjs, 의존성 0).
//   키비주얼은 data URI 대신 file:// 로 넣는다(한 페이지에 49장 — base64 를 49번 반복하면 100MB 가 넘는다).
//   페이지 오른쪽에 규격마다 「탐침(probe)」 — 그림 상자를 마스크·필터 없이 자홍(#FF00FF) 바탕 위에 복제해 둔다. 녹임에 가려진 그림 본색과 누끼의 투명/불투명을 거기서 읽는다.
//
// 측정(그림 상자 data-object="1" 의 네 변마다):
//   · 보이는 변 = 그림 사각형(배경 size/position 환산) ∩ 상자 ∩ 지면 의 변. 그림이 그 변 너머로 이어지면 「잘린 변(cut)」, 거기서 끝나면 「그림 변(nat)」. 지면 변에 붙은 변은 안 잰다(자연스러운 끝 — 단 누끼 잘림은 잰다, cutFade 의 자리).
//   · 마스크: 계산된 mask-image 의 linear-gradient 방향(to right = 왼변 녹임 …)과 마지막 stop(%·px) → 그 변의 녹임 길이 meltPx.
//   · 픽셀(변을 따라 n ≥ 9 점, 양 끝 6% 제외, 글자·로고·칩 위는 건너뜀):
//       field = 지면 쪽 10px 렌더 픽셀 · dNear = 렌더 변 ±2px 색 차(선이 보이나)
//       imgEdge = 탐침(마스크 없는 그림) 변 안쪽 3px 색 · imgSeam = 탐침의 녹임 구간 끝 쪽(0.5·0.8·1.0×녹임+4px, 녹임 없으면 4·10px) 평균색 — 녹임이 걷히며 실제로 드러나는 색
//       dEdge = imgEdge vs field · dSeam = imgSeam vs field · 누끼: 탐침이 자홍이면 투명
//     색 차 = RGB 거리 ÷ 441.67(core/palette.js colorDistance 와 같은 자).
// 판정(문턱은 CANON 과 같은 자 — 「다른 색」 0.15 = 검수 short-melt, 필요 녹임의 70% 미만 = 검수 short-melt):
//   이음매가 보이는 변 = max(dNear, dEdge) ≥ 0.15 (그림 변 색 = 지면색이면 속이 뭐든 이어진 것 — melt-length 「그림 변 색과 지면색의 거리」 그대로). 필요 길이 = CANON.melt((min+(max−min)·min(1,d/fullAt)) × 상자 변 길이), d = max(dEdge, dSeam)
//   끊김  cut-nomask: 바탕 있는 그림의 잘린 변(지면 안쪽)이 보이는데 마스크 없음 · cut-short: 녹임이 필요 길이의 70% 미만
//         cutout-cut: 누끼의 잘린 변(숨은 열·행 불투명 ≥ 5%)에 마스크가 CANON.cutFade 길이(잘린 몫%×k+base, min~max)의 70% 미만(지면 변·상자 변 모두)
//   이질감 seam-far: 바탕 있는 그림의 그림 변(contain·native 로 상자 안에서 끝남) — 마스크 없이 dEdge ≥ 0.15 & dNear ≥ 0.15(네모 변이 보임) 또는 녹임이 짧음(cut-short 와 같은 식) · bg-box: 그런 변이 3개 이상(바탕 네모가 뜸)
//   배경 들어감 bg-in-cutout: 누끼(opaque < 0.5)인데 그림 변 3개 이상에서 탐침 변 안쪽 3px 가 60% 넘게 불투명(바탕이 들어 있음)
//   수치는 ✓ 에도 남긴다.
// 사용: node scripts/kv-seam-audit.mjs [--cases all|a,b] [--specs a,b] [--tag before|after] [--jobs 4] [--core <dir>] [--out docs/kv-seam-audit.md] [--json …] [--sheet …/kv_seam_sheet.png] [--no-sheet]
//   --core: 다른 판의 core/ 로 그린다(전/후 비교 — `git archive HEAD core | tar -x -C /tmp/before` 뒤 --core /tmp/before/core). --tag before 결과(json·페이지 스크린샷)가 있으면 --tag after 시트가 전/후를 나란히 놓는다.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, encodePng, cropPng, pixelAt } from './lib/png.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const TAG = opt('--tag') ?? 'after';
const JOBS = Math.max(1, +(opt('--jobs') ?? 4));
const ONLY = opt('--specs') ? opt('--specs').split(',') : null;
const CORE_DIR = path.resolve(opt('--core') ?? path.join(ROOT, 'core'));
const OUT_DIR = path.join(ROOT, 'ref/learned/cases/_out/cmp-1016');
const OUT_MD = path.resolve(opt('--out') ?? path.join(ROOT, 'docs/kv-seam-audit.md'));
const OUT_JSON = path.resolve(opt('--json') ?? path.join(OUT_DIR, TAG === 'before' ? 'kv_seam_audit_before.json' : 'kv_seam_audit.json'));
const OUT_SHEET = path.resolve(opt('--sheet') ?? path.join(OUT_DIR, 'kv_seam_sheet.png'));
const NO_SHEET = argv.includes('--no-sheet');
const FIELDS_ONLY = argv.includes('--fields-only');   // Chrome 없이 렌더 trace 만 모아 지면색 일관성 표·시트(전/후 비교용)
const OUT_FIELD_JSON = path.join(OUT_DIR, TAG === 'before' ? 'kv_field_consistency_before.json' : 'kv_field_consistency.json');
const OUT_FIELD_SHEET = path.join(OUT_DIR, 'kv_field_sheet.png');
const TMP = path.join(OUT_DIR, '_kv_seam_tmp', TAG); mkdirSync(TMP, { recursive: true });
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };
const PAGE_MAX_H = 6500;   // 페이지 하나에 쌓는 규격 높이 상한(스크린샷 크기)
const PROBE_GAP = 40;      // 탐침 열까지 띄우는 폭

const core = f => import(pathToFileURL(path.join(CORE_DIR, f)).href);
const F = await core('fonts.js');
const FACES = F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, pathToFileURL(path.join(ROOT, 'app')).href + '/')).join('');
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js');
const { adSpecEntries } = await core('adspecs.js'); const { applyKvTypeOverride, kvTypeOf } = await core('kvtypes.js');
const { CANON } = await core('canon.js');
registerAll();
const ENTRIES = adSpecEntries();
const EXTRACT = JSON.parse(readFileSync(path.join(CORE_DIR, 'media/_extract.json'), 'utf8'));
const IDS = (EXTRACT.extract ?? []).filter(id => ENTRIES[id] && ENTRIES[id].channel !== 'asset' && (!ONLY || ONLY.includes(id)));
const MEDIA = {}; const mediaName = m => { if (!MEDIA[m]) MEDIA[m] = JSON.parse(readFileSync(path.join(CORE_DIR, 'media', m + '.json'), 'utf8')); return MEDIA[m].name ?? m; };
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const CASES = path.join(ROOT, 'ref/learned/cases');
const LEDGER = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const CASE_IDS = (() => { const v = opt('--cases') ?? 'all'; return v === 'all' ? LEDGER.cases.map(c => c.id).filter(id => existsSync(path.join(CASES, id, 'meta.json'))) : v.split(','); })();
const mime = f => f.endsWith('.png') ? 'image/png' : f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
const dataUri = f => `data:${mime(f)};base64,${readFileSync(f).toString('base64')}`;
function caseOf(id) {
  const c = LEDGER.cases.find(x => x.id === id); if (!c) throw new Error('케이스 없음: ' + id);
  const dir = path.join(CASES, c.id);
  const meta = applyKvTypeOverride(JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')), c.typeOverride ?? null);
  const style = normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo: c.logo && existsSync(path.join(dir, c.logo)) ? dataUri(path.join(dir, c.logo)) : null, logoMeta: c.logoMeta ?? { tone: 'dark' } });
  const t = kvTypeOf(meta);
  return { c, meta, style, ctx: createContext(c.fields ?? DEFAULT_FIELDS, 'recruit'), kind: meta.field?.kind ?? (meta.field?.opaque < 0.5 ? 'cutout' : 'illust'), cutout: (meta.field?.opaque ?? 1) < 0.5, type: t ? `${t.id}${t.sub ? '/' + t.sub.id : ''}` : '' };
}

// 브라우저 안: 루트마다 상자·마스크·글자/로고/칩 상자 → <pre id="out"> JSON (페이지 좌표). 탐침: 그림 상자를 마스크 없이 자홍 바탕 위에 복제(오른쪽 열)
const MEASURE = (probeDX) => `<script>
const settle = async () => { try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 4000))]); } catch {} const urls = new Set(); for (const e of document.querySelectorAll('*')) { for (const m of getComputedStyle(e).backgroundImage.matchAll(/url\\("?([^")]+)"?\\)/g)) urls.add(m[1]); } const imgs = {}; await Promise.race([Promise.all([...urls].map(u => new Promise(r => { const i = new Image(); i.onload = () => { imgs[u] = i.naturalWidth > 0; r(); }; i.onerror = () => { imgs[u] = false; r(); }; i.src = u; }))), new Promise(r => setTimeout(r, 8000))]); await new Promise(r => setTimeout(r, 200)); return imgs; };
(async () => { const out = {}; try { out.__imgs = await settle();
  const R = el => { const b = el.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }; };
  const ink = el => { try { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const rs = []; for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const b of rg.getClientRects()) if (b.width > 0.5 && b.height > 0.5) rs.push({ x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }); } return rs.length ? rs : [R(el)]; } catch { return [R(el)]; } };
  for (const root of document.querySelectorAll('[data-ad]')) {
    const sid = root.dataset.spec, rr = R(root), rcs = getComputedStyle(root);
    const els = [...root.querySelectorAll('[data-object="1"]')];
    const objs = els.map(o => { const b = R(o), cs = getComputedStyle(o); return { x: b.x, y: b.y, w: b.w, h: b.h, size: cs.backgroundSize, pos: cs.backgroundPosition, hasBg: cs.backgroundImage !== 'none', mask: (cs.webkitMaskImage && cs.webkitMaskImage !== 'none') ? cs.webkitMaskImage : (cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : ''), radius: parseFloat(cs.borderTopLeftRadius || '0'), kvOnly: o.dataset.kvOnly ?? null, bust: o.dataset.bust ?? null, melt: o.dataset.melt ?? null, meltDir: o.dataset.meltDir ?? null, meltTop: o.dataset.meltTop ?? null, meltRight: o.dataset.meltRight ?? null, meltFix: o.dataset.meltFix ?? null, cutFade: o.dataset.cutFade ?? null, bleed: o.dataset.bleed ?? null, visible: cs.visibility !== 'hidden' && cs.display !== 'none' && b.w > 0 && b.h > 0 && parseFloat(cs.opacity || '1') > 0 }; });
    // 탐침: 루트 크기의 자홍 상자(오른쪽 열)에 그림 상자를 마스크·필터·둥근 모서리 없이 같은 자리에 복제
    const pr = document.createElement('div'); pr.setAttribute('data-probe', sid); pr.style.cssText = 'position:absolute;left:' + (rr.x + ${probeDX}) + 'px;top:' + rr.y + 'px;width:' + rr.w + 'px;height:' + rr.h + 'px;background:#FF00FF;overflow:hidden';
    els.forEach((o, i) => { const b = objs[i]; const c = document.createElement('div'); c.style.cssText = 'position:absolute;left:' + (b.x - rr.x) + 'px;top:' + (b.y - rr.y) + 'px;width:' + b.w + 'px;height:' + b.h + 'px;background-image:' + getComputedStyle(o).backgroundImage + ';background-size:' + b.size + ';background-position:' + b.pos + ';background-repeat:no-repeat;overflow:hidden'; pr.appendChild(c); });
    document.body.appendChild(pr);
    const avoid = []; for (const e of root.querySelectorAll('[data-field],[data-chip]')) for (const r of ink(e)) avoid.push(r); for (const e of root.querySelectorAll('[data-logo],[data-logo-slot],[data-band],[data-object="logo"]')) avoid.push(R(e));
    let trace = null; try { trace = JSON.parse(root.dataset.trace); } catch {}
    out[sid] = { x: rr.x, y: rr.y, w: rr.w, h: rr.h, kvUse: root.dataset.kvUse ?? null, logoOnly: root.dataset.logoOnly ?? null, template: root.dataset.template ?? null, mold: root.dataset.mold ?? null, fieldSource: root.dataset.fieldSource ?? null, bg: rcs.backgroundColor, objs, avoid, trace: trace ? { mode: trace.mode, rules: trace.rules, tImage: trace.place?.tImage ?? null, gate: trace.gate ?? null, kv: trace.kv ?? null, field: trace.field ?? null } : null };
  } } catch (e) { out.__error = String(e && e.stack || e); }
  const p = document.createElement('pre'); p.id = 'out'; p.style.display = 'none'; p.textContent = JSON.stringify(out); document.body.appendChild(p); })();
</script>`;

const chromeAsync = (args) => new Promise((res, rej) => execFile(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', ...args], { maxBuffer: 512 << 20 }, (err, stdout) => err ? rej(err) : res(stdout.toString())));

// 케이스 하나의 규격들을 높이 상한으로 묶어 페이지로
function pagesOf(sids) {
  const pages = []; let cur = null;
  for (const sid of sids) {
    const sp = ENTRIES[sid];
    if (!cur || cur.h + sp.h + 20 > PAGE_MAX_H) { cur = { cells: [], h: 0, w: 0 }; pages.push(cur); }
    cur.cells.push({ sid, y: cur.h }); cur.h += sp.h + 20; cur.w = Math.max(cur.w, sp.w);
  }
  return pages;
}
async function renderPage(K, page, tag) {
  const cells = page.cells.map(({ sid, y }) => { const sp = ENTRIES[sid]; let html = ''; try { html = renderArtifact(sid, K.ctx, K.style, {}); } catch (e) { html = `<div data-ad="1" data-spec="${sid}" data-render-error="1" style="width:${sp.w}px;height:${sp.h}px;background:#f0f"></div>`; } return `<div style="position:absolute;left:0;top:${y}px;width:${sp.w}px;height:${sp.h}px">${html}</div>`; });
  const probeDX = Math.max(page.w, 400) + PROBE_GAP;
  const W = probeDX + Math.max(page.w, 400), H = Math.max(page.h, 400);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>${FACES}</style><style>html,body{margin:0;background:#fff}body{position:relative;width:${W}px;height:${H}px}</style></head><body>${cells.join('')}${MEASURE(probeDX)}</body></html>`;
  const f = path.join(TMP, `${tag}.html`), png = path.join(TMP, `${tag}.png`); writeFileSync(f, doc);
  let o = null, img = null;
  for (let t = 0; t < 3 && !o; t++) {
    try {
      const dom = await chromeAsync([`--virtual-time-budget=${25000 + t * 25000}`, `--window-size=${W},${H}`, `--screenshot=${png}`, '--dump-dom', pathToFileURL(f).href]);
      const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/); if (m) o = JSON.parse(unesc(m[1]));
      if (o && Object.values(o.__imgs ?? {}).some(v => v === false)) { console.warn(tag, '그림 로드 실패 — 재시도'); o = null; continue; }
      img = decodePng(readFileSync(png));
    } catch (e) { console.warn(tag, 'chrome 실패', String(e.message).slice(0, 120)); o = null; }
  }
  return { o: o ?? {}, img, probeDX };
}

// 배경 size/position → 상자 안 그림 사각형(상자 좌표계)
function drawnRect(obj, px) {
  const [iw, ih] = px ?? [obj.w, obj.h]; const ar = iw / ih; const bw = obj.w, bh = obj.h;
  const size = String(obj.size).trim(), pos = String(obj.pos).trim().split(/\s+/);
  const lenOf = (s, total) => s.endsWith('%') ? total * parseFloat(s) / 100 : parseFloat(s);
  let dw, dh, fit;
  if (size === 'contain') { const k = Math.min(bw / iw, bh / ih); dw = iw * k; dh = ih * k; fit = 'contain'; }
  else if (size === 'cover') { const k = Math.max(bw / iw, bh / ih); dw = iw * k; dh = ih * k; fit = 'cover'; }
  else if (size === 'auto' || size === 'auto auto') { dw = iw; dh = ih; fit = 'native'; }
  else { const [sw, sh] = size.split(/\s+/); if (sw === 'auto' && sh) { dh = lenOf(sh, bh); dw = dh * ar; fit = 'autoH'; } else if (sh === 'auto' || !sh) { dw = lenOf(sw, bw); dh = dw / ar; fit = 'autoW'; } else { dw = lenOf(sw, bw); dh = lenOf(sh, bh); fit = 'size'; } }
  const word = { left: '0%', right: '100%', center: '50%', top: '0%', bottom: '100%' };
  const p0 = word[pos[0] ?? 'center'] ?? pos[0], p1 = word[pos[1] ?? 'center'] ?? pos[1] ?? '50%';
  const ox = p0.endsWith('%') ? (bw - dw) * parseFloat(p0) / 100 : parseFloat(p0);
  const oy = p1.endsWith('%') ? (bh - dh) * parseFloat(p1) / 100 : parseFloat(p1);
  return { x: ox, y: oy, w: dw, h: dh, fit };
}
// 계산된 mask-image → 변마다 녹임 끝(상자 변에서의 px). 방향 없는 linear-gradient 는 to bottom
function maskEnds(mask, bw, bh) {
  const ends = { left: 0, right: 0, top: 0, bottom: 0 };
  if (!mask) return ends;
  const grads = []; let i = 0; while ((i = mask.indexOf('linear-gradient(', i)) >= 0) { let d = 0, j = i; for (; j < mask.length; j++) { if (mask[j] === '(') d++; else if (mask[j] === ')' && --d === 0) break; } grads.push(mask.slice(i, j + 1)); i = j + 1; }
  for (const g of grads) {
    const dir = (g.match(/^linear-gradient\(\s*to (right|left|bottom|top)/) ?? [])[1] ?? 'bottom';
    const side = { right: 'left', left: 'right', bottom: 'top', top: 'bottom' }[dir];
    const len = (side === 'left' || side === 'right') ? bw : bh;
    const stops = [...g.matchAll(/(-?[\d.]+)(px|%)/g)].map(m => m[2] === '%' ? len * parseFloat(m[1]) / 100 : parseFloat(m[1]));
    const end = stops.length ? Math.max(...stops) : 0;
    ends[side] = Math.max(ends[side], end);
  }
  return ends;
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 441.673;
const MAGENTA = [255, 0, 255];
const isMagenta = c => dist(c, MAGENTA) < 0.06;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const avgC = cs => cs.length ? cs.reduce((a, c) => [a[0] + c[0] / cs.length, a[1] + c[1] / cs.length, a[2] + c[2] / cs.length], [0, 0, 0]) : null;
const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const r1 = v => v == null ? null : Math.round(v * 10) / 10, r2 = v => v == null ? null : Math.round(v * 100) / 100;
const M = CANON.melt, CF = CANON.cutFade;
const needMelt = (d, len) => (M.min + (M.max - M.min) * Math.min(1, d / M.fullAt)) * len;
const needCutFade = (overFrac, len) => Math.min(CF.max, Math.max(CF.min, Math.round(overFrac * 100) * CF.k + CF.base)) / 100 * len;
const D_SEAM = 0.15;   // adcheck short-melt 와 같은 「다른 색」 문턱
const TOL = 0.7;        // 필요 길이의 70% 미만이면 짧다(adcheck short-melt)
const SIDE_KO = { left: '왼', right: '오른', top: '윗', bottom: '아랫' };

// 숨은(잘린) 열·행에 불투명 픽셀이 있나 — 누끼의 투명 여백만 잘린 것은 잘림이 아니다
function cutOpaque(meta, side, P, edge) {
  const f = meta.field; const prof = (side === 'left' || side === 'right') ? f?.cols : f?.rows; if (!prof?.length) return 1;
  const len = (side === 'left' || side === 'right') ? P.w : P.h, start = (side === 'left' || side === 'right') ? P.x : P.y;
  const a = side === 'left' || side === 'top' ? 0 : (edge - start) / len, b = side === 'left' || side === 'top' ? (edge - start) / len : 1;   // 그림 안 숨은 구간(0~1)
  let mx = 0; for (let i = 0; i < prof.length; i++) { const t0 = i / prof.length, t1 = (i + 1) / prof.length; if (t1 <= a || t0 >= b) continue; mx = Math.max(mx, 1 - (prof[i]?.bg ?? 1)); }
  return mx;
}

function measureSpec(K, sid, m, img, probeDX) {
  const sp = ENTRIES[sid];
  const row = { case: K.c.id, kind: K.kind, type: K.type, spec: sid, medium: sp.medium, mediumName: mediaName(sp.medium), W: sp.w, H: sp.h, sides: [], bad: [], cats: [] };
  if (!m) { row.skip = '측정 실패'; return row; }
  row.field = fieldOf(m.trace?.field, m);
  if (m.logoOnly) { row.skip = '로고만 규격'; return row; }
  row.fieldSource = m.fieldSource; row.kvUse = m.kvUse; row.mode = m.trace?.mode ?? null; row.rules = (m.trace?.rules ?? []).filter(r => /Bleed|bleed|templateMold|Full|Col|corner|Corner|band|Band|cutFade|meltFix|overlapFix|visualOnly|objectBleed/.test(r));
  const objs = m.objs.filter(o => o.visible && o.hasBg);
  if (!objs.length) { row.skip = m.kvUse === 'none' ? '키비주얼 없음' : m.kvUse === 'bg' || m.kvUse === 'full' ? '지면 전체 그림(상자 없음)' : '오브젝트 없음'; return row; }
  const root = { x: m.x, y: m.y, w: m.w, h: m.h };
  const px = K.meta.px;
  const inset = sp.rules?.safeArea?.measuredFromTemplate?.mold?.image?.edgeInset ?? null;
  const probe = (x, y) => pixelAt(img, x + probeDX, y);
  for (const [oi, o] of objs.entries()) {
    const d = drawnRect(o, px);
    const P = { x: o.x + d.x, y: o.y + d.y, w: d.w, h: d.h };
    const clip = { x: Math.max(o.x, root.x), y: Math.max(o.y, root.y) }; clip.r = Math.min(o.x + o.w, root.x + root.w); clip.b = Math.min(o.y + o.h, root.y + root.h);
    const full = clip.x <= root.x + 1 && clip.y <= root.y + 1 && clip.r >= root.x + root.w - 1 && clip.b >= root.y + root.h - 1 && d.fit === 'cover';
    const ends = maskEnds(o.mask, o.w, o.h);
    const objInfo = { i: oi, box: { x: r1(o.x - root.x), y: r1(o.y - root.y), w: r1(o.w), h: r1(o.h) }, pic: { x: r1(P.x - root.x), y: r1(P.y - root.y), w: r1(P.w), h: r1(P.h), fit: d.fit }, mask: ends, cutFade: o.cutFade, meltFix: o.meltFix, melt: o.melt, meltDir: o.meltDir, bust: o.bust, bleed: o.bleed, radius: o.radius, full };
    row.objs = [...(row.objs ?? []), objInfo];
    if (full || o.radius > 4) continue;   // 지면 전체 그림 · 둥근 상자(카카오)는 상자가 의도
    const others = objs.filter(x => x !== o);
    const sidesOfObj = [];
    for (const side of ['left', 'right', 'top', 'bottom']) {
      const horiz = side === 'left' || side === 'right';
      const picEdge = side === 'left' ? P.x : side === 'right' ? P.x + P.w : side === 'top' ? P.y : P.y + P.h;
      const clipEdge = side === 'left' ? clip.x : side === 'right' ? clip.r : side === 'top' ? clip.y : clip.b;
      const rootEdge = side === 'left' ? root.x : side === 'right' ? root.x + root.w : side === 'top' ? root.y : root.y + root.h;
      const sign = (side === 'left' || side === 'top') ? 1 : -1;        // 안쪽 방향
      const over = sign * (clipEdge - picEdge);                          // 그림이 보이는 변 너머로 넘친 px(+) / 안쪽에서 끝남(−)
      const type = over > 2 ? 'cut' : 'natural';
      const edge = type === 'cut' ? clipEdge : picEdge;
      const atCanvas = Math.abs(edge - rootEdge) <= 1.5 || sign * (rootEdge - edge) > 0;   // 지면 변에 붙었거나 지면 밖
      const span0 = horiz ? [Math.max(clip.y, P.y), Math.min(clip.b, P.y + P.h)] : [Math.max(clip.x, P.x), Math.min(clip.r, P.x + P.w)];
      const spanLen = span0[1] - span0[0];
      const boxLen = horiz ? o.w : o.h;
      const boxEdge = side === 'left' ? o.x : side === 'right' ? o.x + o.w : side === 'top' ? o.y : o.y + o.h;
      const meltPx = Math.max(0, (ends[side] ?? 0) - sign * (edge - boxEdge));   // 보이는 변에서 잰 녹임 길이
      const S = { side, type, atCanvas, over: r1(over), meltPx: r1(meltPx), spanLen: r1(spanLen), boxLen: r1(boxLen) };
      if (spanLen < 8) { S.note = '변이 짧음'; sidesOfObj.push(S); continue; }
      if (inset && inset[side] != null && !atCanvas) { S.note = `템플릿 여백 ${inset[side]}(의도)`; S.inset = true; }   // 자소설 PC팝업 샘플 상자 8/30(10-15 결정)
      if (K.cutout && type === 'cut') { S.cutOpaque = r2(cutOpaque(K.meta, side, P, edge)); if (S.cutOpaque < 0.05) { S.note = '투명 여백만 잘림'; sidesOfObj.push(S); continue; } }
      // 픽셀 샘플(지면 안쪽 변만)
      if (!atCanvas && img) {
        const n = Math.max(9, Math.floor(spanLen / 40));
        const near = [], dEdge = [], dSeam = [], opaqueEdge = [];
        const inMax = sign > 0 ? (horiz ? Math.min(clip.r, P.x + P.w) - edge : Math.min(clip.b, P.y + P.h) - edge) : (horiz ? edge - Math.max(clip.x, P.x) : edge - Math.max(clip.y, P.y));
        const seamOffs = meltPx > 0 ? [meltPx * 0.5, meltPx * 0.8, meltPx + 4] : [4, 10];
        S.seamAt = r1(seamOffs[seamOffs.length - 1]);
        if (seamOffs[0] + 2 >= inMax) { S.note = '녹임이 그림을 다 덮음'; sidesOfObj.push(S); continue; }
        for (let k = 0; k < n; k++) {
          const t = 0.06 + 0.88 * (n === 1 ? 0.5 : k / (n - 1)); const u = span0[0] + spanLen * t;
          const pt = (off) => horiz ? [edge + sign * off, u] : [u, edge + sign * off];
          const [ox, oy] = pt(-10), [nx, ny] = pt(2), [mx, my] = pt(-2), [ex, ey] = pt(3);
          if (!inRect(ox, oy, root)) continue;
          if (m.avoid.some(r => inRect(ox, oy, r) || inRect(mx, my, r) || inRect(nx, ny, r))) continue;
          if (others.some(x => inRect(ox, oy, x) || inRect(mx, my, x))) continue;
          const field = pixelAt(img, ox, oy);
          near.push(dist(pixelAt(img, nx, ny), pixelAt(img, mx, my)));
          const pe = probe(ex, ey); const tEdge = isMagenta(pe); opaqueEdge.push(tEdge ? 0 : 1);
          if (!tEdge) dEdge.push(dist(pe, field));
          const seamCols = seamOffs.map(off => { const [sx, sy] = pt(Math.min(off, inMax - 1)); return probe(sx, sy); }).filter(c => !isMagenta(c));
          if (seamCols.length) dSeam.push(dist(avgC(seamCols), field));
        }
        S.n = near.length;
        if (near.length >= 5) { S.dNear = r2(median(near)); S.dEdge = dEdge.length ? r2(median(dEdge)) : null; S.dSeam = dSeam.length ? r2(median(dSeam)) : null; S.opaqueFrac = r2(opaqueEdge.reduce((a, b) => a + b, 0) / opaqueEdge.length); }
        else S.note = '표본 부족(글자·로고 위)';
      }
      // 판정
      let cat = null, why = null;
      if (S.inset) { S.verdict = '✓'; sidesOfObj.push(S); continue; }
      if (K.cutout) {
        if (type === 'cut') {
          const need = needCutFade(over / Math.max(1, horiz ? P.w : P.h), boxLen); S.needPx = r1(need);
          if (meltPx < need * TOL && (atCanvas || S.dNear == null || S.dNear >= D_SEAM * 0.5)) { cat = 'cutout-cut'; why = `누끼 ${SIDE_KO[side]}변 ${atCanvas ? '지면' : '상자'} 밖으로 ${Math.round(over)}px 잘림 · 녹임 ${Math.round(meltPx)}px < 필요 ${Math.round(need)}px(cutFade)`; }
        } else if (!atCanvas && S.opaqueFrac != null && S.opaqueFrac >= 0.6 && Math.min(P.w, P.h) >= 80) S.bgEdge = true;   // 모아서 bg-in-cutout(그림이 80px 보다 작으면 3px 안쪽이 곧 주인공이라 못 가른다 — 달력 164×80 칸)
      } else if (!atCanvas && S.dNear != null) {
        // 이음매가 보이나 = 보이는 변에서 그림 본색(탐침 3px 안)과 지면의 차(dEdge) 또는 렌더에 선이 남았나(dNear). 그림 변 색 = 지면색이면(검은 바탕 일러스트 × 검은 지면, 흰 바탕 × 흰 지면) 속 그림이 뭐든 이어진 것 — CANON melt-length 의 「그림 변 색과 지면색의 거리」 그대로.
        //   보이면 필요 길이는 그 변에서 드러나는 색 차(dEdge·dSeam 중 큰 쪽)로
        const dLine = Math.max(S.dNear ?? 0, S.dEdge ?? 0);
        const dRef = Math.max(S.dEdge ?? 0, S.dSeam ?? 0);
        const need = needMelt(dRef, boxLen); S.needPx = r1(need); S.dLine = r2(dLine);
        if (dLine >= D_SEAM) {
          if (type === 'cut') {
            if (meltPx <= 0) { cat = 'cut-nomask'; why = `${SIDE_KO[side]}변에서 뚝 잘림(녹임 없음, 변 색 차 ${S.dLine})`; }
            else if (meltPx < need * TOL) { cat = 'cut-short'; why = `${SIDE_KO[side]}변 녹임 ${Math.round(meltPx)}px < 필요 ${Math.round(need)}px(변 색 차 ${S.dEdge} · 드러나는 색 차 ${S.dSeam})`; }
          } else {
            if (meltPx <= 0) { cat = 'seam-far'; why = `${SIDE_KO[side]}변 그림 끝 네모(그림 변 색 차 ${S.dLine}, 녹임 없음)`; }
            else if (meltPx < need * TOL) { cat = 'seam-far'; why = `${SIDE_KO[side]}변 그림 끝 녹임 ${Math.round(meltPx)}px < 필요 ${Math.round(need)}px(변 색 차 ${S.dEdge} · 드러나는 색 차 ${S.dSeam})`; }
          }
        }
      }
      if (cat) { S.cat = cat; S.why = why; S.verdict = '✗'; } else S.verdict = '✓';
      sidesOfObj.push(S);
    }
    // 묶음 판정 — 배경 들어감
    const nat = sidesOfObj.filter(s => s.type === 'natural' && !s.atCanvas && s.n >= 5);
    if (K.cutout) { const bgE = nat.filter(s => s.bgEdge); if (bgE.length >= 3) for (const s of bgE) { s.cat = 'bg-in-cutout'; s.verdict = '✗'; s.why = `누끼 ${SIDE_KO[s.side]}변 가장자리 ${Math.round(s.opaqueFrac * 100)}%가 불투명(바탕이 들어 있음)`; } }
    else { const sf = nat.filter(s => s.cat === 'seam-far'); if (sf.length >= 3 && sf.length === nat.length) for (const s of sf) s.cat = 'bg-box'; }
    row.sides.push(...sidesOfObj);
  }
  for (const s of row.sides) if (s.verdict === '✗') { row.bad.push(`${s.cat}:${s.why}`); if (!row.cats.includes(s.cat)) row.cats.push(s.cat); }
  row.verdict = row.bad.length ? '✗' : '✓';
  row.dSeamMax = Math.max(0, ...row.sides.map(s => s.dSeam ?? 0));
  return row;
}

// 지면 기록(일관성 표용): 출처·첫 색·편차 이유. 그림이 곧 지면인 경우(사진 전체·질감·프레임·배경형)·로고만 흰 카드·투명은 「예외」로 따로 센다
const KV_AS_FIELD = new Set(['photo-full', 'kv-texture', 'kv-frame', 'kv-full', 'logo-only-white']);
function fieldOf(F, m) {
  if (!F) return { source: m?.fieldSource ?? 'none', color: null, exception: m?.logoOnly ? 'logo-only' : 'no-field' };
  const color = String(F.stops?.[0] ?? '').toUpperCase() || null;
  const exception = m?.logoOnly ? 'logo-only' : F.deviation ? F.deviation : KV_AS_FIELD.has(F.source) ? 'kv-as-field' : null;
  return { source: F.source, color, color2: String(F.stops?.[1] ?? '').toUpperCase() || null, angle: F.angle ?? null, css: F.css ?? null, exception, aligned: !!F.aligned };
}
// 케이스(캠페인) 안에서 지면 출처·색이 몇 가지로 갈리나 — 예외(규정·그림이 지면·로고만·투명) 뺀 규격만 센다
function consistencyOf(rowsOfCase) {
  const all = rowsOfCase.filter(r => r.field);
  const core = all.filter(r => !r.field.exception && r.field.color);
  const cnt = (arr, f) => { const m = {}; for (const x of arr) { const k = f(x); m[k] = (m[k] ?? 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const src = cnt(core, r => r.field.source), col = cnt(core, r => r.field.color);
  const majSrc = src[0]?.[0] ?? null, majCol = col[0]?.[0] ?? null;
  const minority = core.filter(r => r.field.source !== majSrc || r.field.color !== majCol).map(r => ({ spec: r.spec, source: r.field.source, color: r.field.color }));
  const exceptions = all.filter(r => r.field.exception).map(r => ({ spec: r.spec, why: r.field.exception, source: r.field.source, color: r.field.color }));
  return { n: all.length, core: core.length, sources: src, colors: col, nSources: src.length, nColors: col.length, majSrc, majCol, minority, exceptions };
}

// ---- 실행 ----
const rows = []; const byCase = {}; const layout = {};   // layout: 페이지 스크린샷에서 규격 위치(전/후 시트가 쓴다)
const queue = CASE_IDS.slice(); let done = 0;
if (FIELDS_ONLY) {   // Chrome 없이: renderArtifact → data-trace 의 field 만
  for (const cid of CASE_IDS) {
    let K; try { K = caseOf(cid); } catch (e) { console.warn(cid, e.message); continue; }
    byCase[cid] = K;
    for (const sid of IDS) {
      const sp = ENTRIES[sid]; const row = { case: cid, kind: K.kind, type: K.type, spec: sid, medium: sp.medium, mediumName: mediaName(sp.medium), W: sp.w, H: sp.h, sides: [], bad: [], cats: [], skip: 'fields-only' };
      try { const html = renderArtifact(sid, K.ctx, K.style, {}); const root = html.match(/<div data-ad="1"[^>]*>/)?.[0] ?? ''; const tr = JSON.parse(unesc((root.match(/data-trace="([^"]*)"/) ?? [])[1] ?? 'null')); const m = { fieldSource: (root.match(/data-field-source="([^"]*)"/) ?? [])[1] ?? null, logoOnly: /data-logo-only="1"/.test(root) ? '1' : null }; row.field = fieldOf(tr?.field, m); row.fieldSource = m.fieldSource; } catch (e) { row.skip = '렌더 실패 ' + String(e.message).slice(0, 60); }
      rows.push(row);
    }
    process.stdout.write(`[fields] ${cid}\n`);
  }
}
async function worker() {
  while (queue.length) {
    const cid = queue.shift(); let K;
    try { K = caseOf(cid); } catch (e) { console.warn(cid, e.message); continue; }
    byCase[cid] = K;
    const pages = pagesOf(IDS);
    for (const [pi, page] of pages.entries()) {
      const tag = `${cid}_${pi}`;
      const { o, img, probeDX } = await renderPage(K, page, tag);
      for (const { sid } of page.cells) {
        const m = o[sid] ?? null;
        rows.push(measureSpec(K, sid, m, img, probeDX));
        if (m) layout[`${cid}__${sid}`] = { page: tag, x: m.x, y: m.y, w: m.w, h: m.h };
      }
    }
    done++;
    const bad = rows.filter(r => r.case === cid && r.verdict === '✗');
    process.stdout.write(`[${done}/${CASE_IDS.length}] ${cid} (${K.kind}): ✗ ${bad.length} / 측정 ${rows.filter(r => r.case === cid && !r.skip).length}${bad.length ? ' — ' + [...new Set(bad.flatMap(r => r.cats))].join(',') : ''}\n`);
  }
}
if (!FIELDS_ONLY) await Promise.all(Array.from({ length: JOBS }, worker));
const order = new Map(CASE_IDS.map((c, i) => [c, i])); const sorder = new Map(IDS.map((s, i) => [s, i]));
rows.sort((a, b) => (sorder.get(a.spec) - sorder.get(b.spec)) || (order.get(a.case) - order.get(b.case)));
if (!FIELDS_ONLY) { writeFileSync(path.join(TMP, 'layout.json'), JSON.stringify(layout)); writeFileSync(OUT_JSON, JSON.stringify({ at: new Date().toISOString(), tag: TAG, core: CORE_DIR, cases: CASE_IDS, specs: IDS, thresholds: { D_SEAM, TOL, melt: M, cutFade: CF }, rows }, null, 1)); }
// 지면색 일관성(케이스마다) — 이 실행의 결과를 JSON 으로(전/후 비교는 before 파일과)
const CONS = Object.fromEntries(CASE_IDS.map(cid => [cid, consistencyOf(rows.filter(r => r.case === cid))]));
writeFileSync(OUT_FIELD_JSON, JSON.stringify({ at: new Date().toISOString(), tag: TAG, core: CORE_DIR, specs: IDS, cases: CONS, rows: rows.map(r => ({ case: r.case, spec: r.spec, kind: r.kind, field: r.field ?? null })) }, null, 1));
const BEFORE_FIELD = (TAG !== 'before' && existsSync(path.join(OUT_DIR, 'kv_field_consistency_before.json'))) ? JSON.parse(readFileSync(path.join(OUT_DIR, 'kv_field_consistency_before.json'), 'utf8')) : null;

// ---- 집계 ----
const CAT_KO = { 'cut-nomask': '끊김 · 잘린 변 녹임 없음', 'cut-short': '끊김 · 녹임 짧음', 'cutout-cut': '끊김 · 누끼 잘림 녹임 없음/짧음', 'seam-far': '이질감 · 그림 변 네모(녹임 없음/짧음)', 'bg-box': '배경 들어감 · 바탕 그림 네모 뜸', 'bg-in-cutout': '배경 들어감 · 누끼에 바탕 네모' };
const badRows = rows.filter(r => r.verdict === '✗');
const measured = rows.filter(r => !r.skip);
const catCount = {}; for (const r of badRows) for (const c of r.cats) catCount[c] = (catCount[c] ?? 0) + 1;
const sideCount = {}; for (const r of badRows) for (const s of r.sides) if (s.verdict === '✗') sideCount[s.cat] = (sideCount[s.cat] ?? 0) + 1;
const bySpec = {}; for (const r of badRows) bySpec[r.spec] = (bySpec[r.spec] ?? 0) + 1;
const byKind = {}; for (const r of badRows) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
const measuredByKind = {}; for (const r of measured) measuredByKind[r.kind] = (measuredByKind[r.kind] ?? 0) + 1;
const byCaseBad = {}; for (const r of badRows) byCaseBad[r.case] = (byCaseBad[r.case] ?? 0) + 1;

// 전 결과(--tag before)가 있으면 전/후 표
const BEFORE_JSON = path.join(OUT_DIR, 'kv_seam_audit_before.json');
const before = (TAG !== 'before' && existsSync(BEFORE_JSON)) ? JSON.parse(readFileSync(BEFORE_JSON, 'utf8')) : null;
const bBad = before ? before.rows.filter(r => r.verdict === '✗') : [];
const bCat = {}; for (const r of bBad) for (const c of r.cats) bCat[c] = (bCat[c] ?? 0) + 1;
const bSide = {}; for (const r of bBad) for (const s of r.sides) if (s.verdict === '✗') bSide[s.cat] = (bSide[s.cat] ?? 0) + 1;
const bByKind = {}; for (const r of bBad) bByKind[r.kind] = (bByKind[r.kind] ?? 0) + 1;

const md = [];
md.push('# 키비주얼 이음 전수 감사 (kv-seam-audit)', '');
md.push(`- 생성: \`node scripts/kv-seam-audit.mjs --tag ${TAG}\` · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · 케이스 ${CASE_IDS.length}(장부 전체) × 규격 ${IDS.length}(추출 규격 중 전달물 제외) = ${rows.length} · 측정 ${measured.length} · 제외 ${rows.length - measured.length}(${Object.entries(rows.filter(r => r.skip).reduce((a, r) => (a[r.skip] = (a[r.skip] ?? 0) + 1, a), {})).map(([k, v]) => `${k} ${v}`).join(' · ')})`);
md.push('- 무엇을 재나: 그림 상자(`data-object="1"`)의 네 변마다 **보이는 변**(그림 사각형 ∩ 상자 ∩ 지면)을 잡고, 그 변이 그림이 **잘린 변**(cut — 그림이 변 너머로 이어짐)인지 **그림 변**(nat — 그림이 거기서 끝남)인지 가른다. 지면 변에 붙은 변은 자연스러운 끝이라 재지 않는다(단 누끼가 지면 변에서 잘리는 것은 잰다 — cutFade 의 자리). 페이지 오른쪽에 그림 상자를 **마스크 없이 자홍 바탕 위에 복제한 탐침**을 두어 녹임에 가려진 그림 본색과 누끼의 투명/불투명을 읽는다.');
md.push('- 픽셀: 변을 따라 n ≥ 9 점(양 끝 6% 제외, 글자·로고·칩 위는 건너뜀). **dNear** = 렌더 변 ±2px 색 차(선이 보이나) · **dEdge** = 탐침 그림 변 안쪽 3px vs 지면 쪽 10px · **dSeam** = 탐침의 녹임 끝 쪽(0.5·0.8·1.0×녹임+4px, 녹임 없으면 4·10px) 평균색 vs 지면(녹임이 걷히며 드러나는 색 — 이질감). 색 차 = RGB 거리 ÷ 441.67(`core/palette.js colorDistance` 와 같은 자).');
md.push(`- 문턱(CANON 과 같은 자): 「다른 색」 = ${D_SEAM}(검수 \`short-melt\` 와 같음) · 필요 녹임 = CANON.melt (${M.min}~${M.max} × 상자 변 길이, 색 차 ${M.fullAt} 에서 최대) 의 ${TOL * 100}% 미만이면 짧음(검수 \`short-melt\` 와 같음) · 누끼 잘린 변은 CANON.cutFade (잘린 몫%×${CF.k}+${CF.base}, ${CF.min}~${CF.max}%) 의 ${TOL * 100}%. 누끼는 숨은 열·행에 불투명 ≥ 5% 일 때만 「잘림」(투명 여백만 잘린 것은 아님). 템플릿이 여백을 정한 변(\`mold.image.edgeInset\` 자소설 PC팝업 8/30)은 의도(✓, 수치만).`);
md.push('- 이음매가 「보이는」 변 = max(dNear, dEdge) ≥ 0.15 — 그림 변 색이 지면색과 같으면(검은 바탕 × 검은 지면) 속 그림이 뭐든 이어진 것(melt-length 「그림 변 색과 지면색의 거리」 그대로). 필요 길이는 max(dEdge, dSeam) 로.', '- 판정 분류: `cut-nomask` 바탕 있는 그림이 상자 변에서 뚝 잘림(마스크 없음) · `cut-short` 잘린 변 녹임이 드러나는 색 차에 비해 짧음 · `cutout-cut` 누끼가 지면/상자 밖으로 잘렸는데 녹임 없음/짧음 · `seam-far` 바탕 있는 그림이 상자 안에서 끝나 네모 변이 보임(또는 그 변 녹임이 짧음) · `bg-box` 그런 변이 3개 이상(바탕 그림 네모가 뜸) · `bg-in-cutout` 누끼 판정인데 그림 변 3개 이상에서 가장자리가 불투명(바탕이 들어 있음).', '');
md.push(`## 결과: **✗ ${badRows.length}건** / 측정 ${measured.length}${before ? ` (전 ✗ ${bBad.length} / ${before.rows.filter(r => !r.skip).length})` : ''}`, '');
md.push('| 원인 분류 | ' + (before ? '전(before) 규격 | 후(after) 규격 | 전 변 | 후 변 |' : '규격 수 | 변 수 |'), '|---|' + (before ? '---|---|---|---|' : '---|---|'));
for (const c of Object.keys(CAT_KO)) md.push(`| \`${c}\` ${CAT_KO[c]} | ${before ? `${bCat[c] ?? 0} | ${catCount[c] ?? 0} | ${bSide[c] ?? 0} | ${sideCount[c] ?? 0} |` : `${catCount[c] ?? 0} | ${sideCount[c] ?? 0} |`}`);
md.push(`| **합계(규격, 중복 제외)** | ${before ? `**${bBad.length}** | **${badRows.length}** | ${Object.values(bSide).reduce((a, b) => a + b, 0)} | ${Object.values(sideCount).reduce((a, b) => a + b, 0)} |` : `**${badRows.length}** | ${Object.values(sideCount).reduce((a, b) => a + b, 0)} |`}`, '');
md.push('유형별 ✗/측정: ' + Object.keys(measuredByKind).map(k => `${k} ${before ? `${bByKind[k] ?? 0} → ` : ''}${byKind[k] ?? 0} / ${measuredByKind[k]}`).join(' · '), '');
if (Object.keys(bySpec).length) md.push('규격별 ✗(많은 순): ' + Object.entries(bySpec).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([s, n]) => `\`${s}\` ${n}`).join(' · '), '');
if (Object.keys(byCaseBad).length) md.push('케이스별 ✗(많은 순): ' + Object.entries(byCaseBad).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([s, n]) => `\`${s}\` ${n}`).join(' · '), '');
if (badRows.length) {
  md.push('## ✗ 목록', '', '| 규격 | 케이스(유형) | 배치 | 지면 | 변 | 사유 |', '|---|---|---|---|---|---|');
  for (const r of badRows) md.push(`| ${r.spec} ${r.W}×${r.H} | ${r.case} (${r.type}) | ${r.mode ?? ''}${r.rules?.length ? ' ' + r.rules.join(',') : ''} | ${r.fieldSource ?? ''} | ${r.sides.filter(s => s.verdict === '✗').map(s => SIDE_KO[s.side]).join('·')} | ${r.bad.map(b => b.replace(/^[a-z-]+:/, '')).join(' / ')} |`);
  md.push('');
}
md.push('## 규격 × 케이스 전체(✓ 포함, 수치)', '', '변 = 종류(cut 잘린 변 / nat 그림 변)·녹임 px·dNear/dSeam · 지면 변에 붙은 변·둥근 상자·지면 전체 그림은 생략. 「잇는 중」 = 드러나는 색 차 ≥ 0.15 이지만 녹임이 필요 길이를 채운 변.', '');
let cur = null;
for (const r of rows) {
  if (r.spec !== cur) { cur = r.spec; md.push('', `### ${r.mediumName} · ${ENTRIES[r.spec].rules?.name ?? r.spec} \`${r.spec}\` ${r.W}×${r.H}`, '', '| 케이스 | 배치 | 지면 | 변(종류·녹임·dNear/dSeam) | 판정 |', '|---|---|---|---|---|'); }
  if (r.skip) { md.push(`| ${r.case} | — | — | — | 제외: ${r.skip} |`); continue; }
  const sides = r.sides.filter(s => !s.atCanvas || s.cat).map(s => `${SIDE_KO[s.side]}:${s.type === 'cut' ? 'cut' : 'nat'} ${Math.round(s.meltPx)}px${s.dNear != null ? ` ${s.dNear}/${s.dSeam ?? '–'}` : s.note ? ` (${s.note})` : ''}${s.verdict === '✗' ? ' ✗' : (s.dSeam ?? 0) >= D_SEAM ? ' 잇는 중' : ''}`).join(' · ');
  md.push(`| ${r.case} | ${r.mode ?? ''}${r.rules?.length ? ' ' + r.rules.join(',') : ''} | ${r.fieldSource ?? ''} | ${sides || '—'} | ${r.verdict}${r.cats.length ? ' ' + r.cats.join(',') : ''} |`);
}
// ---- 지면색 일관성 ----
const consLine = (c) => `${c.nSources}/${c.nColors}`;
const okCases = Object.values(CONS).filter(c => c.core > 0 && c.nSources <= 1 && c.nColors <= 1).length, withCore = Object.values(CONS).filter(c => c.core > 0).length;
const bOk = BEFORE_FIELD ? Object.values(BEFORE_FIELD.cases).filter(c => c.core > 0 && c.nSources <= 1 && c.nColors <= 1).length : null;
md.push('', '## 지면색 일관성 (캠페인 = 케이스 단위)', '');
md.push('- 사용자 10-20: 「배경색 일관되지 않게 나오는 것도 문제」(한진정보통신 × ABL 떼 누끼: 자소설 550·1200·750·네이버 DA 는 벽돌 빨강, 자소설 160×600·카카오 1200×600·네이버 300 은 청록 — 한 캠페인이 두 색). 규칙: **지면색은 캠페인 단위로 한 번** — 키비주얼·로고·손 지정으로 사다리를 한 번 타서 나온 지면(색·그라데이션)을 모든 규격이 공유하고, 규격별로는 규정이 강제할 때만 벗어난다(trace `field.deviation`).');
md.push('- 셈법: 규격마다 루트 `data-trace` 의 `field.source`·`stops[0]`. **예외**(세지 않음) = `deviation`(solid-only 단색 규정 · mode-solid 사람이 단색 고정 · join-colour 이음매 줄 색 · object-slot 오브젝트 누끼 자리 · medium-light 매체 밝은 프로필), 그림이 곧 지면(photo-full·kv-texture·kv-frame·kv-full), 로고만 흰 카드, 투명. 나머지에서 source 종류 수 / 색 종류 수 — 목표 1/1.');
md.push(`- 결과: **1/1 인 케이스 ${okCases} / ${withCore}**${bOk != null ? ` (전 ${bOk} / ${Object.values(BEFORE_FIELD.cases).filter(c => c.core > 0).length})` : ''}`, '');
md.push('| 케이스 | 유형 | 규격 | source/색 종류' + (BEFORE_FIELD ? '(전 → 후)' : '') + ' | 다수파 | 소수파 규격(후) | 예외(후) |', '|---|---|---|---|---|---|---|');
for (const cid of CASE_IDS) { const c = CONS[cid]; if (!c || !c.core) continue; const b = BEFORE_FIELD?.cases?.[cid]; md.push(`| ${cid} | ${byCase[cid]?.kind ?? ''} | ${c.core}+${c.exceptions.length} | ${b ? consLine(b) + ' → ' : ''}${consLine(c)} | ${c.majSrc} ${c.majCol} | ${c.minority.slice(0, 6).map(x => `${x.spec}(${x.source} ${x.color})`).join(' · ')}${c.minority.length > 6 ? ` 외 ${c.minority.length - 6}` : ''} | ${Object.entries(c.exceptions.reduce((a, x) => (a[x.why] = (a[x.why] ?? 0) + 1, a), {})).map(([k, v]) => `${k} ${v}`).join(' · ')} |`); }
md.push('');
writeFileSync(OUT_MD, md.join('\n') + '\n');

// ---- 지면 일관성 시트: 케이스마다 한 줄(전/후) — 규격 순서대로 지면 색 칸, 다수파와 다른 색은 빨간 테두리, 예외는 점선 ----
if (!NO_SHEET) {
  const SW = 22, SH = 18, LBL = 190, GAP = 2;
  const rowHtml = (cid, c, tag, y) => { const rs = (tag === '전' ? BEFORE_FIELD?.rows : rows).filter(r => r.case === cid); const cells = IDS.map((sid, i) => { const r = rs.find(x => x.spec === sid); const f = r?.field; const bg = f?.css ?? f?.color ?? '#fff'; const diff = f && !f.exception && f.color && (f.color !== c.majCol || f.source !== c.majSrc); const ex = f?.exception; return `<div title="${sid} ${f?.source ?? ''} ${f?.color ?? ''} ${ex ?? ''}" style="position:absolute;left:${LBL + i * (SW + GAP)}px;top:${y}px;width:${SW}px;height:${SH}px;background:${f?.color ? bg : 'repeating-linear-gradient(45deg,#ddd 0 3px,#fff 3px 6px)'};box-sizing:border-box;border:${diff ? '2px solid #e00' : ex ? '1px dashed #888' : '1px solid rgba(0,0,0,.15)'}"></div>`; }); return `<div style="position:absolute;left:0;top:${y}px;width:${LBL - 6}px;height:${SH}px;font:11px/${SH}px sans-serif;color:#222;white-space:nowrap;overflow:hidden">${cid} <span style="color:#888">${tag}</span> ${c ? `<b style="color:${c.nColors <= 1 && c.nSources <= 1 ? '#080' : '#c00'}">${c.nSources}/${c.nColors}</b>` : ''}</div>${cells.join('')}`; };
  const parts = []; let y = 30;
  parts.push(`<div style="position:absolute;left:0;top:4px;font:12px sans-serif;color:#333">지면 일관성 시트(kv-seam-audit ${TAG}) · 칸 = 규격(${IDS.length}, 추출 순서) · 빨간 테두리 = 다수파와 다른 출처/색 · 점선 = 예외(규정·그림이 지면·로고만) · 빗금 = 지면 없음(투명)</div>`);
  for (const cid of CASE_IDS) { const c = CONS[cid]; if (!c?.n) continue; if (BEFORE_FIELD?.cases?.[cid]) { parts.push(rowHtml(cid, BEFORE_FIELD.cases[cid], '전', y)); y += SH + 2; } parts.push(rowHtml(cid, c, '후', y)); y += SH + (BEFORE_FIELD ? 8 : 2); }
  const totW = LBL + IDS.length * (SW + GAP) + 20, totH = y + 20;
  const f = path.join(TMP, 'field_sheet.html'); writeFileSync(f, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}body{position:relative;width:${totW}px;height:${totH}px}</style></head><body>${parts.join('')}</body></html>`);
  try { await chromeAsync(['--virtual-time-budget=5000', `--window-size=${totW},${Math.min(totH, 16000)}`, `--screenshot=${OUT_FIELD_SHEET}`, pathToFileURL(f).href]); console.log('지면 일관성 시트:', OUT_FIELD_SHEET); } catch (e) { console.warn('지면 시트 실패', e.message.slice(0, 100)); }
}
console.log(`지면 일관성 1/1: ${okCases} / ${withCore}${bOk != null ? ` (전 ${bOk})` : ''} → ${OUT_FIELD_JSON}`);

// ---- ✗ 시트: 전(before 스크린샷 조각) | 후(지금 렌더 조각) ----
if (!NO_SHEET && !FIELDS_ONLY) {
  const keys = [...new Set([...bBad.map(r => `${r.case}__${r.spec}`), ...badRows.map(r => `${r.case}__${r.spec}`)])];
  const bLayoutPath = path.join(OUT_DIR, '_kv_seam_tmp/before/layout.json');
  const bLayout = (before && existsSync(bLayoutPath)) ? JSON.parse(readFileSync(bLayoutPath, 'utf8')) : {};
  const cropDir = path.join(TMP, 'crops'); mkdirSync(cropDir, { recursive: true });
  const pageCache = new Map(); const loadPage = p => { if (!pageCache.has(p)) { try { pageCache.set(p, decodePng(readFileSync(p))); } catch { pageCache.set(p, null); } } return pageCache.get(p); };
  const cropOf = (lay, dir, key) => { if (!lay) return null; const im = loadPage(path.join(dir, lay.page + '.png')); if (!im) return null; const f = path.join(cropDir, key + '.png'); writeFileSync(f, encodePng(cropPng(im, Math.round(lay.x), Math.round(lay.y), Math.round(lay.w), Math.round(lay.h)))); return pathToFileURL(f).href; };
  const CELL = 300, PAIR = CELL * 2 + 16, cols = 2, perSheet = 36;
  const sheets = []; for (let i = 0; i < keys.length; i += perSheet) sheets.push(keys.slice(i, i + perSheet));
  if (!sheets.length) sheets.push([]);
  for (const [si, ks] of sheets.entries()) {
    const cells = [];
    ks.forEach((key, i) => {
      const [cid, sid] = key.split('__'); const sp = ENTRIES[sid]; const k = Math.min(1, CELL / sp.w, CELL / sp.h);
      const x = (i % cols) * (PAIR + 40), y = Math.floor(i / cols) * (CELL + 90);
      const bR = bBad.find(r => r.case === cid && r.spec === sid) ?? (before ? before.rows.find(r => r.case === cid && r.spec === sid) : null), aR = rows.find(r => r.case === cid && r.spec === sid);
      const bImg = before ? cropOf(bLayout[key], path.join(OUT_DIR, '_kv_seam_tmp/before'), 'b_' + key) : null;
      const aImg = cropOf(layout[key], TMP, 'a_' + key);
      const lab = (r, t) => `<div style="font:12px/1.3 sans-serif;color:#222;width:${CELL}px;height:48px;overflow:hidden"><b>${t}</b> ${r ? (r.verdict === '✗' ? `<span style="color:#c00">✗ ${r.cats.join(',')}</span>` : '✓') : '—'}${r && r.verdict === '✗' ? `<br><span style="color:#555">${r.bad.map(b => b.replace(/^[a-z-]+:/, '')).join(' / ').slice(0, 110)}</span>` : ''}</div>`;
      cells.push(`<div style="position:absolute;left:${x}px;top:${y}px;width:${PAIR}px;font:13px/1.3 sans-serif;color:#000;white-space:nowrap;overflow:hidden"><b>${sid}</b> ${sp.w}×${sp.h} · ${cid}</div>`);
      cells.push(`<div style="position:absolute;left:${x}px;top:${y + 18}px">${lab(bR, before ? '전' : '')}</div><div style="position:absolute;left:${x + CELL + 16}px;top:${y + 18}px">${lab(aR, '후')}</div>`);
      if (bImg) cells.push(`<img src="${bImg}" style="position:absolute;left:${x}px;top:${y + 68}px;width:${Math.round(sp.w * k)}px;height:${Math.round(sp.h * k)}px;outline:1px dashed #f0f">`);
      if (aImg) cells.push(`<img src="${aImg}" style="position:absolute;left:${x + CELL + 16}px;top:${y + 68}px;width:${Math.round(sp.w * k)}px;height:${Math.round(sp.h * k)}px;outline:1px dashed #0a0">`);
    });
    const rowsN = Math.max(1, Math.ceil(ks.length / cols)); const totW = cols * (PAIR + 40), totH = rowsN * (CELL + 90) + 40;
    const head = `<div style="position:absolute;left:0;top:${totH - 36}px;font:12px sans-serif;color:#333">kv-seam-audit ${TAG} · 왼쪽 = 전(before) · 오른쪽 = 후(after) · ✗ ${badRows.length}${before ? ` (전 ${bBad.length})` : ''} · 시트 ${si + 1}/${sheets.length}</div>`;
    const doc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#e9e9e9}body{position:relative;width:${totW}px;height:${totH}px}</style></head><body>${cells.join('')}${head}</body></html>`;
    const f = path.join(TMP, `sheet_${si}.html`); writeFileSync(f, doc);
    const out = si === 0 ? OUT_SHEET : OUT_SHEET.replace(/\.png$/, `_${si + 1}.png`);
    try { await chromeAsync(['--virtual-time-budget=15000', `--window-size=${totW},${Math.min(totH, 16000)}`, `--screenshot=${out}`, pathToFileURL(f).href]); } catch (e) { console.warn('시트 실패', e.message.slice(0, 100)); }
  }
  console.log(`시트: ${OUT_SHEET}${sheets.length > 1 ? ` (+${sheets.length - 1})` : ''}`);
}
console.log(`✗ ${badRows.length} / 측정 ${measured.length} → ${OUT_MD} · ${OUT_JSON}`);
console.log('원인별: ' + Object.entries(catCount).map(([k, v]) => `${k} ${v}`).join(' · '));
