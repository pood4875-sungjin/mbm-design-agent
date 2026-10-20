#!/usr/bin/env node
// 키비주얼 「애매한 여백」 전수조사 (10-19 사용자: 「배경과 키비주얼 쪽 여백 애매하게 생기지 않도록 전수조사해 줘」)
//   추출 규격(core/media/_extract.json extract, 전달물 asset 채널·visualOnly·로고만 규격 제외) × 대표 키비주얼 5케이스를 renderArtifact 로 그려
//   headless Chrome DOM 에서 루트 data-trace 의 place.tImage(칸)와 data-object="1" 의 실제 상자(getBoundingClientRect)·배경 size/position 을 읽는다.
//   누끼 contain 은 키비주얼 원본 비율(kvMeta.px)로 칸 안 실제 그림 사각형(정렬 반영)을 계산, 사진 cover 는 칸 기준.
//   판정: 그림(또는 칸) 오른쪽·아래 변이 캔버스 변에서 2px 초과 ~ 변 길이 12% 이하 떨어지면 ✗(붙지도 않고 여백이라 부르기도 애매한 틈). 12% 넘으면 의도한 여백 ✓(수치는 남김). 글자 쪽(왼쪽/위)은 안 잰다.
//   node scripts/kv-gap-audit.mjs [--cases a,b] [--specs a,b] [--out docs/kv-gap-audit.md] [--sheet ref/learned/cases/_out/cmp-1016/kv_gap_sheet.png] [--json ref/learned/cases/_out/cmp-1016/kv_gap_audit.json]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const CASE_IDS = (opt('--cases') ?? 't1014-abl,midas-glass-mint,dongbu_illust,bc-illust,t1014-hanssem').split(',');
const ONLY = opt('--specs') ? opt('--specs').split(',') : null;
const OUT_MD = path.resolve(opt('--out') ?? path.join(ROOT, 'docs/kv-gap-audit.md'));
const OUT_SHEET = path.resolve(opt('--sheet') ?? path.join(ROOT, 'ref/learned/cases/_out/cmp-1016/kv_gap_sheet.png'));
const OUT_JSON = path.resolve(opt('--json') ?? path.join(ROOT, 'ref/learned/cases/_out/cmp-1016/kv_gap_audit.json'));
const TMP = path.join(ROOT, 'ref/learned/cases/_out/cmp-1016/_kv_gap_tmp'); mkdirSync(TMP, { recursive: true }); mkdirSync(path.dirname(OUT_SHEET), { recursive: true });
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };
const MIN_GAP = 2, MAX_RATIO = 0.12;   // ✗ 구간: 2px 초과 ~ 변 길이 12% 이하

const CORE_DIR = path.resolve(opt('--core') ?? path.join(ROOT, 'core'));   // 다른 판의 core 로 그린다(전/후 회귀 비교, 10-20)
const core = f => import(pathToFileURL(path.join(CORE_DIR, f)).href);
const F = await core('fonts.js');
const FACES = F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, pathToFileURL(path.join(ROOT, 'app')).href + '/')).join('');
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js');
const { adSpecEntries } = await core('adspecs.js'); const { applyKvTypeOverride } = await core('kvtypes.js');
registerAll();
const ENTRIES = adSpecEntries();
const EXTRACT = JSON.parse(readFileSync(path.join(CORE_DIR, 'media/_extract.json'), 'utf8'));
const IDS = (EXTRACT.extract ?? EXTRACT.ids ?? []).filter(id => ENTRIES[id] && ENTRIES[id].channel !== 'asset' && (!ONLY || ONLY.includes(id)));
const MEDIA = {}; const mediaName = m => { if (!MEDIA[m]) MEDIA[m] = JSON.parse(readFileSync(path.join(CORE_DIR, 'media', m + '.json'), 'utf8')); return MEDIA[m].name ?? m; };
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const CASES = path.join(ROOT, 'ref/learned/cases');
const L = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const mime = f => f.endsWith('.png') ? 'image/png' : f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
const dataUri = f => `data:${mime(f)};base64,${readFileSync(f).toString('base64')}`;
const caseOf = id => {
  const c = L.cases.find(x => x.id === id); if (!c) throw new Error('케이스 없음: ' + id);
  const dir = path.join(CASES, c.id);
  const meta = applyKvTypeOverride(JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')), c.typeOverride ?? null);
  const style = normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: dataUri(path.join(dir, c.kv)), kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo: c.logo ? dataUri(path.join(dir, c.logo)) : null, logoMeta: c.logoMeta ?? { tone: 'dark' } });
  return { c, meta, style, ctx: createContext(c.fields ?? DEFAULT_FIELDS, 'recruit'), label: `${c.id} (${c.summary ?? c.type ?? ''})` };
};

// 브라우저 안: 루트마다 trace·오브젝트 상자·배경 size/position 을 읽어 <pre id="out"> 에 JSON
const MEASURE = `<script>
const settle = async () => { await document.fonts.ready; const urls = new Set(); for (const e of document.querySelectorAll('*')) { for (const m of getComputedStyle(e).backgroundImage.matchAll(/url\\("?([^")]+)"?\\)/g)) urls.add(m[1]); } await Promise.all([...urls].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; }))); };
(async () => { const out = {}; try { await settle();
  for (const root of document.querySelectorAll('[data-ad]')) {
    const sid = root.dataset.spec, rr = root.getBoundingClientRect();
    const objs = [...root.querySelectorAll('[data-object="1"]')].map(o => { const b = o.getBoundingClientRect(), cs = getComputedStyle(o); return { x: b.left - rr.left, y: b.top - rr.top, w: b.width, h: b.height, size: cs.backgroundSize, pos: cs.backgroundPosition, hasBg: cs.backgroundImage !== 'none', kvOnly: o.dataset.kvOnly ?? null, bust: o.dataset.bust ?? null, melt: o.dataset.melt ?? null, meltDir: o.dataset.meltDir ?? null, bleed: o.dataset.bleed ?? null, overflow: cs.overflow, display: cs.display, visible: cs.visibility !== 'hidden' && cs.display !== 'none' && b.width > 0 && b.height > 0 }; });
    let trace = null; try { trace = JSON.parse(root.dataset.trace); } catch {}
    out[sid] = { w: rr.width, h: rr.height, kvUse: root.dataset.kvUse ?? null, logoOnly: root.dataset.logoOnly ?? null, template: root.dataset.template ?? null, mold: root.dataset.mold ?? null, objs, trace: trace ? { mode: trace.mode, rules: trace.rules, tImage: trace.place?.tImage ?? null, gate: trace.gate ?? null, kv: trace.kv ?? null } : null };
  } } catch (e) { out.__error = String(e && e.stack || e); }
  const p = document.createElement('pre'); p.id = 'out'; p.style.display = 'none'; p.textContent = JSON.stringify(out); document.body.appendChild(p); })();
</script>`;
const chrome = (args, pipe = false) => execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', ...args], { maxBuffer: 512 << 20, stdio: ['ignore', pipe ? 'pipe' : 'ignore', 'ignore'] });

function measureBatch(K, sids, tag) {
  let y = 0; const cells = [];
  for (const sid of sids) { const sp = ENTRIES[sid]; cells.push(`<div style="position:absolute;left:0;top:${y}px;width:${sp.w}px;height:${sp.h}px">${renderArtifact(sid, K.ctx, K.style, {})}</div>`); y += sp.h + 20; }
  const maxW = Math.max(...sids.map(s => ENTRIES[s].w));
  const doc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>${FACES}</style><style>html,body{margin:0;background:#fff}body{position:relative;width:${maxW}px;height:${y}px}</style></head><body>${cells.join('')}${MEASURE}</body></html>`;
  const f = path.join(TMP, `${tag}.html`); writeFileSync(f, doc);
  let o = null;
  for (let t = 0; t < 2 && !o; t++) {
    try { const dom = chrome([`--virtual-time-budget=${30000 + t * 20000}`, `--window-size=${Math.max(maxW, 400)},${Math.min(Math.max(y, 400), 8000)}`, '--dump-dom', pathToFileURL(f).href], true).toString(); const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/); if (m) o = JSON.parse(unesc(m[1])); } catch (e) { console.warn(tag, 'chrome 실패', e.message.slice(0, 100)); }
  }
  return o ?? {};
}

// 배경 size/position → 칸 안 실제 그림 사각형(칸 좌표계). 누끼 contain·auto 는 kvMeta.px 비율로, cover·퍼센트 크기(주인공 자르기)는 칸 전체
function drawnRect(obj, px) {
  const [iw, ih] = px ?? [obj.w, obj.h]; const ar = iw / ih; const bw = obj.w, bh = obj.h;
  const size = obj.size.trim(), pos = obj.pos.trim().split(/\s+/);
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
const r1 = v => Math.round(v * 10) / 10;

const rows = []; const byCase = {};
for (const cid of CASE_IDS) {
  const K = caseOf(cid); byCase[cid] = K;
  for (let i = 0; i < IDS.length; i += 8) {
    const batch = IDS.slice(i, i + 8); const o = measureBatch(K, batch, `${cid}_${i}`);
    for (const sid of batch) {
      const sp = ENTRIES[sid]; const m = o[sid];
      const row = { spec: sid, medium: sp.medium, mediumName: mediaName(sp.medium), name: sp.rules?.name ?? sp.title ?? sid, W: sp.w, H: sp.h, case: cid, kvKind: K.meta.field?.kind ?? null };
      if (!m) { row.skip = '측정 실패'; rows.push(row); continue; }
      if (m.logoOnly || (m.trace?.rules ?? []).includes('visualOnly') || m.objs.some(x => x.kvOnly)) { row.skip = m.logoOnly ? '로고만 규격' : 'visualOnly'; rows.push(row); continue; }
      const obj = m.objs.find(x => x.visible && x.hasBg) ?? null;
      row.mode = m.trace?.mode ?? null; row.kvUse = m.kvUse; row.tImage = m.trace?.tImage ?? null; row.rules = (m.trace?.rules ?? []).filter(r => /Bleed|bleed|templateMold|Full|Col|corner|Corner|band|Band/.test(r));
      if (!obj) { row.skip = m.kvUse === 'none' ? '키비주얼 없음(kvUse none)' : '오브젝트 없음(' + m.kvUse + ')'; rows.push(row); continue; }
      const W = m.w, H = m.h;
      row.obj = { x: r1(obj.x), y: r1(obj.y), w: r1(obj.w), h: r1(obj.h), size: obj.size, pos: obj.pos, melt: obj.melt, meltDir: obj.meltDir, bust: obj.bust };
      const full = obj.x <= 1 && obj.y <= 1 && obj.x + obj.w >= W - 1 && obj.y + obj.h >= H - 1;   // 지면 전체(photoFull·roomFull·textureFull)
      const d = drawnRect(obj, K.meta.px);
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
      const inset = sp.rules?.safeArea?.measuredFromTemplate?.mold?.image?.edgeInset ?? null;
      // 예외 ② 칸이 캔버스 왼쪽·오른쪽 변에 다 닿는 전폭 띠(또는 양쪽으로 넘치는 블리드 상자) 안에서 그림이 좌우 대칭으로 가운데: 「한쪽이 비는」 틈이 아니라 가운데 구성(NAP 320×480 사용자 수정본 「그림 (25,310) 270×170」 도 좌우 25/25)
      const gapL = vx0; const sym = obj.x <= 1 && obj.x + obj.w >= W - 1 && Math.abs(gapL - gapR) <= 1 && gapR > MIN_GAP;
      row.gap.left = r1(gapL); row.symmetric = sym; row.inset = inset;
      const badEff = bad.filter(b => !(inset && ((b.startsWith('오른쪽') && inset.right != null) || (b.startsWith('아래') && inset.bottom != null)))).filter(b => !(sym && b.startsWith('오른쪽')));
      row.verdict = badEff.length ? '✗' : '✓'; row.bad = badEff;
      // 사유: 틈이 칸 자체의 틈과 같으면 「칸이 변에서 떨어짐」(데이터), 칸은 닿는데 그림이 떨어졌으면 「칸 안 그림 정렬」(렌더러)
      const slotWhy = (g, sg) => Math.abs(g - sg) < 1 ? '칸이 변에서 떨어짐' : '칸 안 그림 정렬(' + d.fit + ')';
      row.why = badEff.length ? [...new Set(badEff.map(b => b.startsWith('오른쪽') ? slotWhy(gapR, slotGapR) : slotWhy(gapB, slotGapB)))].join('·')
        : inset && bad.length ? `템플릿 칸 안쪽(의도, edgeInset ${Object.entries(inset).map(([k, v]) => k + ' ' + v).join('·')})` : sym && bad.length ? `전폭 띠 가운데 대칭(좌 ${r1(gapL)} = 우 ${r1(gapR)})` : (gapR > W * MAX_RATIO || gapB > H * MAX_RATIO ? '의도한 여백(12% 초과)' : full ? '지면 전체' : '붙음');
      rows.push(row);
    }
  }
  process.stdout.write(`${cid}: ${rows.filter(r => r.case === cid && r.verdict === '✗').length} ✗ / ${rows.filter(r => r.case === cid && !r.skip).length} 측정\n`);
}
writeFileSync(OUT_JSON, JSON.stringify({ at: new Date().toISOString(), cases: CASE_IDS, specs: IDS, rows }, null, 1));

// ---- 문서 ----
const badRows = rows.filter(r => r.verdict === '✗');
const fmtBox = b => b ? `(${b.x},${b.y}) ${b.w}×${b.h}` : '—';
const md = [];
md.push('# 키비주얼 여백 전수조사 (kv-gap-audit)', '');
md.push(`- 생성: \`node scripts/kv-gap-audit.mjs\` · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · 규격 ${IDS.length}(추출 규격 중 전달물 제외) × 케이스 ${CASE_IDS.length}`);
md.push(`- 케이스: ${CASE_IDS.map(c => `\`${c}\` ${byCase[c].c.summary ?? byCase[c].c.type ?? ''}`).join(' · ')}`);
md.push(`- 판정: 그림(누끼 contain 은 kvMeta.px 비율로 계산한 실제 그림, 사진 cover 는 칸) 오른쪽·아래 변이 캔버스 변에서 **${MIN_GAP}px 초과 ~ 변 길이 ${MAX_RATIO * 100}% 이하** 떨어지면 ✗. ${MAX_RATIO * 100}% 넘으면 의도한 여백 ✓(수치 남김). 왼쪽/위(글자 쪽)는 안 잰다. 누끼 PNG 안의 투명 여백은 그림 사각형에 포함(원본 자산의 여백은 따로).`);
md.push('- 예외(✓, 수치는 남김): ① 매체 JSON `mold.image.edgeInset` — 템플릿 칸 자체가 안쪽(자소설 PC팝업 샘플 상자 오른 8·아래 30, 카카오 비즈보드 r10 상자 오른 53·아래 37) ② 캔버스 좌우 변에 다 닿는 전폭 띠 안에서 그림이 좌우 대칭 가운데(NAP 320×480 사용자 수정본도 좌우 25/25) — 「한쪽이 비는」 틈이 아님.');
md.push(`- 결과: **✗ ${badRows.length}건** / 측정 ${rows.filter(r => !r.skip).length} · 제외 ${rows.filter(r => r.skip).length}(${Object.entries(rows.filter(r => r.skip).reduce((a, r) => (a[r.skip] = (a[r.skip] ?? 0) + 1, a), {})).map(([k, v]) => `${k} ${v}`).join(' · ')})`, '');
if (badRows.length) {
  md.push('## ✗ 목록', '', '| 규격 | 케이스 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 사유 |', '|---|---|---|---|---|---|---|');
  for (const r of badRows) md.push(`| ${r.spec} ${r.W}×${r.H} | ${r.case} | ${fmtBox(r.obj)} | ${fmtBox(r.img)} ${r.img.fit} | ${r.gap.right} | ${r.gap.bottom} | ${r.why} |`);
  md.push('');
}
md.push('## 규격 × 케이스 전체', '');
md.push('칸 = `data-object` 실제 상자 · 그림 = 배경 size/position 으로 계산한 그림 사각형(fit) · 틈 = 캔버스 변까지(오른쪽/아래, 보이는 그림 기준) · 괄호는 칸 기준 틈.', '');
let cur = null;
for (const r of rows) {
  if (r.spec !== cur) { cur = r.spec; md.push('', `### ${r.mediumName} · ${r.name} \`${r.spec}\` ${r.W}×${r.H}`, '', '| 케이스 | 배치 | 칸 | 그림 | 오른쪽 틈 | 아래 틈 | 판정 |', '|---|---|---|---|---|---|---|'); }
  if (r.skip) { md.push(`| ${r.case} | — | — | — | — | — | 제외: ${r.skip} |`); continue; }
  md.push(`| ${r.case} | ${r.mode ?? ''}${r.rules.length ? ' ' + r.rules.join(',') : ''} | ${fmtBox(r.obj)} | ${fmtBox(r.img)} ${r.img.fit} | ${r.gap.right} (${r.gap.slotRight}) | ${r.gap.bottom} (${r.gap.slotBottom}) | ${r.verdict} ${r.why} |`);
}
writeFileSync(OUT_MD, md.join('\n') + '\n');

// ---- ✗ 시트 PNG ----
if (badRows.length) {
  const CELL = 420, cols = 4; const cells = [];
  badRows.forEach((r, i) => {
    const K = byCase[r.case]; const sp = ENTRIES[r.spec]; const k = Math.min(1, CELL / sp.w, CELL / sp.h);
    const x = (i % cols) * (CELL + 24), y = Math.floor(i / cols) * (CELL + 70);
    cells.push(`<div style="position:absolute;left:${x}px;top:${y}px;width:${CELL}px;font:13px/1.3 sans-serif;color:#222">${r.spec} ${sp.w}×${sp.h} · ${r.case}<br><span style="color:#c00">${r.bad.join(' · ')} — ${r.why}</span></div><div style="position:absolute;left:${x}px;top:${y + 40}px;width:${sp.w}px;height:${sp.h}px;transform:scale(${k});transform-origin:0 0;outline:${1 / k}px dashed #f0f">${renderArtifact(r.spec, K.ctx, K.style, {})}</div>`);
  });
  const rowsN = Math.ceil(badRows.length / cols); const totW = cols * (CELL + 24), totH = rowsN * (CELL + 70);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>${FACES}</style><style>html,body{margin:0;background:#e9e9e9}body{position:relative;width:${totW}px;height:${totH}px}</style></head><body>${cells.join('')}</body></html>`;
  const f = path.join(TMP, 'sheet.html'); writeFileSync(f, doc);
  try { chrome(['--virtual-time-budget=20000', `--window-size=${totW},${Math.min(totH, 16000)}`, `--screenshot=${OUT_SHEET}`, pathToFileURL(f).href]); } catch (e) { console.warn('시트 실패', e.message.slice(0, 100)); }
}
console.log(`✗ ${badRows.length} / 측정 ${rows.filter(r => !r.skip).length} → ${OUT_MD}${badRows.length ? ' · ' + OUT_SHEET : ''}`);
