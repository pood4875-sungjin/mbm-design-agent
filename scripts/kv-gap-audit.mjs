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
import { judgeGap, MIN_GAP, MAX_RATIO } from './lib/kv-gap.mjs';   // 판정은 공용 모듈(quality-audit ②축과 같은 자, 10-20)

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

const rows = []; const byCase = {};
for (const cid of CASE_IDS) {
  const K = caseOf(cid); byCase[cid] = K;
  for (let i = 0; i < IDS.length; i += 8) {
    const batch = IDS.slice(i, i + 8); const o = measureBatch(K, batch, `${cid}_${i}`);
    for (const sid of batch) {
      const sp = ENTRIES[sid]; const m = o[sid];
      const row = { spec: sid, medium: sp.medium, mediumName: mediaName(sp.medium), name: sp.rules?.name ?? sp.title ?? sid, W: sp.w, H: sp.h, case: cid, kvKind: K.meta.field?.kind ?? null, ...judgeGap(m, sp, K.meta.px) };
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
