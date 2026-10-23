#!/usr/bin/env node
// A+AI 샘플 갤러리 — 키비주얼 유형별 케이스 × 규격 몇 종을 A+AI(그림 판단 1회 → 규칙 렌더)로 그리고, 참고로 A(규칙만)도 작게. 한 장짜리 HTML.
//   node scripts/ai-samples.mjs [--cases a,b,c] [--specs x,y | --stages] [--out history/img/<날짜>_ai-samples] [--no-a]
//   --stages: 추출 규격 전부를 차수(하·중·상·로고 — core/media/_extract.json stages)별로 · --reuse: 같은 out 폴더의 판단 JSON 재사용(API 호출 0)   (A PNG 는 참고용 파일로만 남고 갤러리엔 안 보인다)
//   키: server/.env(ANTHROPIC_API_KEY). 케이스마다 판단 1회(Sonnet ≈ $0.025). PNG 는 macOS Chrome headless.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const today = new Date().toISOString().slice(0, 10);
const OUT = path.resolve(ROOT, opt('--out', `history/img/${today}_ai-samples`)); mkdirSync(OUT, { recursive: true });

// 유형별 2케이스 — 장부(ref/learned/cases) id
const GROUPS = [
  { label: '사진형', ids: ['t1014-hanssem', 'hr-doctor'] },
  { label: '오브젝트형(누끼)', ids: ['t1014-jeil', 't1014-dongsuh'] },
  { label: '비주얼형(일러스트·3D)', ids: ['t1014-gs2025', 't1014-lt-v2'] },
];
const CASES_ALL = GROUPS.flatMap(g => g.ids);
const CASES = opt('--cases') ? opt('--cases').split(',') : CASES_ALL;
const { EXTRACT } = await import(pathToFileURL(path.join(ROOT, 'core/media.js')).href);
const { STAGE_NAMES } = await import(pathToFileURL(path.join(ROOT, 'core/adspecs.js')).href);
const STAGES = flag('--stages');
const STAGE_OF = {}; for (const [k, ids] of Object.entries(EXTRACT.stages ?? {})) for (const id of ids) STAGE_OF[id] = k;
const SPECS_SEL = STAGES ? Object.values(EXTRACT.stages).flat() : (opt('--specs') ?? 'kakao-display-pc-promo,google-gdn-580x400,instagram-feed-1080,google-gdn-300x600,google-gdn-300x1050').split(',');
const TYPE_LABEL = { photo: '사진형', cutout: '오브젝트형(누끼)', illust: '비주얼형(일러스트·3D)', texture: '비주얼형(질감)' };

const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { registerAll } = await core('generate.js'); registerAll();
const { SPECS, renderArtifact } = await core('contract.js');
const { createContext } = await core('context.js');
const { normalizeStyle } = await core('style.js');
const F = await core('fonts.js');
const { shapeOfSpec, presetPatch, kvMetaWithAi, SHAPE_LABEL, validateAnalysis, aiEligible } = await core('trackb/analyze.js');
const { fieldFromImage, extractPalette, edgeColor } = await core('palette.js');
const { exportPng } = await core('export.js');
const FACES = F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, pathToFileURL(path.join(ROOT, 'app')).href + '/')).join('');
const doc = (inner, w, h) => `<!doctype html><html><head><meta charset="utf-8"><style>${FACES}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}</style></head><body>${inner}</body></html>`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dataUrlOf = file => { const ext = path.extname(file).slice(1).toLowerCase(); return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${readFileSync(file).toString('base64')}`; };
// API 로 보낼 사본 — 긴 변 1600px(앱 apiCopy 와 같은 규칙). 4.5MB 넘는 원본(hr-doctor 7.6MB)이 거절되던 것
function apiCopyFile(file) {
  const dst = path.join(OUT, `_api_${path.basename(file, path.extname(file))}${/\.png$/i.test(file) ? '.png' : '.jpg'}`);
  execFileSync('python3', ['-c', `import sys; from PIL import Image; im=Image.open(sys.argv[1]); im.thumbnail((1600,1600)); (im if sys.argv[2].endswith('.png') else im.convert('RGB')).save(sys.argv[2], quality=90)`, file, dst]);
  return dst;
}
const ledger = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/cases/cases.json'), 'utf8'));
const DEFAULT_BRIEF = { client: '한진정보통신', hiringType: '경력직 채용', role: 'SW개발, 보안', deadline: '2026-10-31' };

function loadKey() {
  if (process.env.ANTHROPIC_API_KEY?.trim()) return process.env.ANTHROPIC_API_KEY.trim();
  const env = path.join(ROOT, 'server/.env'); if (existsSync(env)) { const m = /^\s*ANTHROPIC_API_KEY\s*=\s*["']?([^"'\s#]+)/m.exec(readFileSync(env, 'utf8')); if (m) return m[1]; }
  return '';
}
const KEY = loadKey(); if (!KEY) { console.error('API 키가 없습니다(server/.env)'); process.exit(1); }
const D = await import(pathToFileURL(path.join(ROOT, 'server/design.js')).href);
const client = D.makeClient(KEY);

function measureFile(file) {
  const j = JSON.parse(execFileSync('python3', [path.join(ROOT, 'scripts/case-rgba.py'), file], { maxBuffer: 64 * 1024 * 1024 }).toString());
  const rgba = new Uint8ClampedArray(Buffer.from(j.rgba, 'base64'));
  return { ar: j.ar, px: j.px, edge: edgeColor(rgba, j.w, j.h), field: fieldFromImage(rgba, j.w, j.h), colors: extractPalette(rgba, 3) };
}
function cropFile(src, dst, crop) {
  execFileSync('python3', ['-c', `import sys; from PIL import Image; im=Image.open(sys.argv[1]); W,H=im.size; x,y,w,h=[float(v) for v in sys.argv[3:7]]; im.crop((round(x*W),round(y*H),round((x+w)*W),round((y+h)*H))).save(sys.argv[2])`, src, dst, String(crop.x), String(crop.y), String(crop.w), String(crop.h)]);
}
const isFull = c => c.x <= 0.001 && c.y <= 0.001 && c.w >= 0.999 && c.h >= 0.999;

const prevFile = path.join(OUT, 'results.json');
const prev = existsSync(prevFile) ? JSON.parse(readFileSync(prevFile, 'utf8')) : null;
const results = [];
let totalCost = prev?.totalCost ?? 0;
for (const id of CASES) {
  const c = ledger.cases.find(x => x.id === id); if (!c) { console.log(`[${id}] 장부에 없음`); continue; }
  const dir = path.join(ROOT, 'ref/learned/cases', id);
  const kvFile = path.join(dir, c.kv ?? 'kv.jpg'); if (!existsSync(kvFile)) { console.log(`[${id}] 키비주얼 없음`); continue; }
  const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const logoCase = opt('--logo-from') ? ledger.cases.find(x => x.id === opt('--logo-from')) : null;   // 다른 케이스의 로고를 빌려 쓰기(사용자 캠페인과 같은 조건)
  const logoDir = logoCase ? path.join(ROOT, 'ref/learned/cases', logoCase.id) : dir;
  const logoFile = (logoCase ?? c).logo && existsSync(path.join(logoDir, (logoCase ?? c).logo)) ? path.join(logoDir, (logoCase ?? c).logo) : null;
  if (logoCase) { c.logoMeta = logoCase.logoMeta; c.logoMono = null; }
  const logoMono = c.logoMono && existsSync(path.join(dir, c.logoMono)) ? path.join(dir, c.logoMono) : null;
  const tone = c.logoMeta?.tone ?? 'dark';
  const brief = opt('--brief') ? JSON.parse(opt('--brief')) : (c.fields ?? DEFAULT_BRIEF);
  const primary = opt('--primary') ?? c.primary ?? meta.colors?.[0] ?? '#2456D6';
  const ctx = createContext(brief, 'recruit');
  const logoStyle = { logo: logoFile ? pathToFileURL(logoFile).href : null, logoMono: logoMono ? pathToFileURL(logoMono).href : null, logoLight: tone === 'light' && logoFile ? pathToFileURL(logoFile).href : null, logoTone: tone, logoMeta: c.logoMeta ?? null };
  copyFileSync(kvFile, path.join(OUT, `${id}_kv${path.extname(kvFile)}`));
  const row = { id, group: GROUPS.find(g => g.ids.includes(id))?.label ?? TYPE_LABEL[c.type] ?? '기타', type: c.type, summary: c.summary, client: brief.client, kv: `${id}_kv${path.extname(kvFile)}`, specs: [] };

  // 판단 1회 — --reuse 면 OUT 의 <id>_analysis.json 을 다시 써서 API 를 안 부른다(로고·브리프만 바꿔 다시 그릴 때)
  let out;
  const prevA = path.join(OUT, `${id}_analysis.json`);
  try {
    if (flag('--reuse') && existsSync(prevA)) { const j = JSON.parse(readFileSync(prevA, 'utf8')); const v = validateAnalysis(j.raw ?? j.analysis, { kvMeta: j.sentPx ? { ...meta, px: j.sentPx } : meta, hasLogo: !!logoFile }); out = { analysis: v.analysis, fixes: v.fixes, usage: j.usage ?? {}, cost: 0, ms: j.ms ?? 0, model: j.model, raw: j.raw ?? j.analysis, sentPx: j.sentPx ?? null }; }   // 검증 규칙이 바뀌었으면 원 응답(raw)으로 다시 검증
    else out = await D.analyzeKv(client, { kv: { dataUrl: dataUrlOf(apiCopyFile(kvFile)), meta }, logo: logoFile ? { dataUrl: dataUrlOf(apiCopyFile(logoFile)), meta: c.logoMeta ?? null } : null, brief, brand: { primary }, requests: '' });
  } catch (e) { console.log(`[${id}] 판단 실패: ${e.message}`); row.error = e.message; results.push(row); continue; }
  totalCost += out.cost;
  row.ai = { type: out.analysis.kv.type, rationale: out.analysis.rationale, ms: out.ms, cost: out.cost, usage: out.usage, fixes: out.fixes, groups: out.analysis.groups };
  writeFileSync(path.join(OUT, `${id}_analysis.json`), JSON.stringify({ analysis: out.analysis, fixes: out.fixes, usage: out.usage, cost: out.cost, ms: out.ms, model: out.model, raw: out.raw ?? null, sentPx: out.sentPx ?? null }, null, 1));
  console.log(`[${id}] 판단 ${out.ms}ms · $${out.cost} · ${out.analysis.kv.type} · 고침 ${out.fixes.length}\n   ${out.analysis.rationale}`);

  const cropCache = new Map();
  for (const sid of SPECS_SEL) {
    const spec = SPECS[sid]; if (!spec) { console.log(`  규격 없음 ${sid}`); continue; }
    const shape = shapeOfSpec(spec), g = out.analysis.groups[shape];
    // C: 모양 묶음 crop 사본 + AI 주인공 + 프리셋·지면
    let kvC = kvFile, metaC = meta;
    if (g && !isFull(g.crop)) {
      const key = JSON.stringify(g.crop);
      if (!cropCache.has(key)) { const f = path.join(OUT, `${id}_${shape}_crop${path.extname(kvFile)}`); cropFile(kvFile, f, g.crop); cropCache.set(key, { file: f, meta: measureFile(f) }); }
      ({ file: kvC, meta: metaC } = cropCache.get(key));
    }
    const elig = aiEligible(spec);   // 틀 고정 매체·비즈보드는 규칙 그대로(앱과 같게)
    const styleC = elig ? normalizeStyle({ colors: [primary], keyVisual: pathToFileURL(kvC).href, kvMeta: kvMetaWithAi(metaC, out.analysis, g?.crop ?? { x: 0, y: 0, w: 1, h: 1 }, g), ...logoStyle, ...presetPatch(g, out.analysis), aiKvOrig: pathToFileURL(kvFile).href, aiKvMetaOrig: meta }) : normalizeStyle({ colors: [primary], keyVisual: pathToFileURL(kvFile).href, kvMeta: meta, ...logoStyle });
    const styleA = normalizeStyle({ colors: [primary], keyVisual: pathToFileURL(kvFile).href, kvMeta: meta, ...logoStyle });
    const cell = { spec: sid, title: spec.title, w: spec.w, h: spec.h, shape, group: g, stage: STAGE_OF[sid] ?? null };
    for (const [tr, st] of [['C', styleC], ...(flag('--no-a') ? [] : [['A', styleA]])]) {
      let html; try { html = renderArtifact(sid, ctx, st, {}); } catch (e) { cell[tr] = { error: e.message }; continue; }
      const f = path.join(OUT, `${id}_${sid}_${tr}.html`); writeFileSync(f, doc(html, spec.w, spec.h));
      const png = exportPng(f, path.join(OUT, `${id}_${sid}_${tr}.png`), spec.w, spec.h);
      cell[tr] = { png: png ? path.basename(png) : null, html: path.basename(f) };
      if (tr === 'C') { const m = html.match(/data-ad="1" data-ai-box="([\w@-]+):/); cell.aiBox = !g?.kvBox?.w ? null : (['jasoseol', 'remember', 'jobda', 'everytime', 'catch'].includes(spec.medium) || /bizboard/.test(sid)) ? '틀 고정 매체 — 규칙 자리' : /logoOnly&quot;:true/.test(html) ? '로고 전용 — 규칙' : !m ? '규칙 자리(겹침)' : m[1].startsWith('free') ? '빈 공간에 맞춤' : html.includes('aiBox.grow') ? '키움(빈 지면)' : m[1] === 'ai' ? '그대로' : '줄임·당김'; }
    }
    row.specs.push(cell);
    console.log(`  ${sid} ${shape} → C ${cell.C?.png ?? cell.C?.error} ${cell.A ? '· A ' + (cell.A.png ?? cell.A.error) : ''}`);
  }
  results.push(row);
}

// 이전 결과 중 이번에 안 돌린 케이스는 그대로 둔다(묶음 판단 표시용 groups 는 analysis.json 에서 다시 읽음)
if (prev?.results) for (const r of prev.results) if (!results.some(x => x.id === r.id)) { const aj = path.join(OUT, `${r.id}_analysis.json`); if (r.ai && existsSync(aj)) r.ai.groups = JSON.parse(readFileSync(aj, 'utf8')).analysis.groups; results.push(r); }
results.sort((a, b) => (CASES_ALL.indexOf(a.id) + 1 || 999) - (CASES_ALL.indexOf(b.id) + 1 || 999));

// ── 갤러리 HTML ──
const labels = [...new Set([...GROUPS.map(g => g.label), ...results.map(r => r.group)])];
const groups = labels.map(label => ({ label, rows: results.filter(r => r.group === label) })).filter(g => g.rows.length);
const BOX = 420;   // 칸의 긴 변
const cellHtml = (r, s) => {
  const k = Math.min(1, BOX / Math.max(s.w, s.h)); const cw = Math.round(s.w * k), ch = Math.round(s.h * k);
  const g = s.group;
  const pc = v => Math.round(v * 100);
  const line = g ? `그림 ${g.kvBox?.w > 0 ? `AI 상자 x${pc(g.kvBox.x)} y${pc(g.kvBox.y)} w${pc(g.kvBox.w)} h${pc(g.kvBox.h)}%${s.aiBox ? ` → ${s.aiBox}` : ''}` : `${g.kvPlace}·${g.kvSize}(규칙 자리)`} / 배경 ${g.field?.colors?.length ? `AI ${g.field.colors.join('→')}` : g.bgFill} / 글자 규칙` : '';
  return `<div class="cell"><div class="t">${esc(s.title)} <span>${s.w}×${s.h} · ${esc(SHAPE_LABEL[s.shape]?.split('(')[0] ?? s.shape)}</span></div>
  <div class="pic" style="width:${cw}px;height:${ch}px">${s.C?.png ? `<img class="c" src="${s.C.png}" width="${cw}" height="${ch}" alt="">` : `<div class="err">${esc(s.C?.error ?? '없음')}</div>`}</div>
  <div class="why">${esc(line)}${g?.why ? `<br><em>${esc(g.why)}</em>` : ''}</div></div>`;
};
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>A+AI 샘플 — 키비주얼 유형별</title>
<style>
body{margin:0;background:#f4f5f7;color:#1c1f26;font:14px/1.5 'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif;padding:24px}
h1{font-size:20px;margin:0 0 6px} .sub{color:#6b7280;font-size:13px;margin-bottom:18px}
h2{font-size:16px;margin:28px 0 10px;padding-top:18px;border-top:1px solid #e3e5ea}
.case{background:#fff;border:1px solid #e3e5ea;border-radius:12px;padding:16px;margin-bottom:16px}
.head{display:flex;gap:14px;align-items:flex-start;margin-bottom:12px}
.head img{max-width:160px;max-height:120px;border-radius:8px;background:#eceef2;object-fit:contain}
.head .meta{font-size:13px;color:#4b5563} .head b{font-size:15px;color:#1c1f26}
.grid{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}
.cell .t{font-size:12px;color:#374151;margin-bottom:4px} .cell .t span{color:#9ca3af}
.pic{position:relative;background:#eceef2;border-radius:6px;overflow:hidden}
.pic img{display:block;position:absolute;left:0;top:0}
.err{padding:10px;color:#d93025;font-size:12px}
h3{font-size:13px;margin:16px 0 8px;color:#374151} h3 span{color:#9ca3af;font-weight:400}
.why{font-size:11px;color:#6b7280;margin-top:4px;max-width:${BOX}px} .why em{font-style:normal;color:#9ca3af}
</style></head><body>
<h1>A+AI 샘플 — 키비주얼 유형별 ${results.length}케이스 × 규격 ${SPECS_SEL.length}종${STAGES ? '(차수별 전체)' : ''}</h1>
<div class="sub">${today} · AI 는 그림 판단만(케이스당 1회, Sonnet 5.5) · 그리기·타이포·로고·검수는 규칙 · 판단 비용 합계 $${totalCost.toFixed(3)}</div>
${groups.map(g => `<h2>${esc(g.label)}</h2>${g.rows.map(r => `<div class="case"><div class="head"><img src="${r.kv}" alt=""><div class="meta"><b>${esc(r.id)}${r.client ? ' · ' + esc(r.client) : ''}</b><br>장부 유형: ${esc(r.summary ?? r.type ?? '')}<br>${r.ai ? `AI 판단: ${esc(r.ai.type ?? '자동')} · ${Math.round(r.ai.ms / 1000)}초 · $${r.ai.cost}${r.ai.fixes?.length ? ` · 고침 ${r.ai.fixes.length}` : ''}<br><span style="color:#1c1f26">${esc(r.ai.rationale)}</span>` : `<span style="color:#d93025">${esc(r.error)}</span>`}</div></div>${STAGES ? Object.keys(STAGE_NAMES).map(k => { const cells = r.specs.filter(s => s.stage === k); return cells.length ? `<h3>${esc(STAGE_NAMES[k])} <span>${cells.length}종</span></h3><div class="grid">${cells.map(s => cellHtml(r, s)).join('')}</div>` : ''; }).join('') : `<div class="grid">${r.specs.map(s => cellHtml(r, s)).join('')}</div>`}</div>`).join('')}`).join('')}
</body></html>`;
writeFileSync(path.join(OUT, 'index.html'), html);
writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ at: new Date().toISOString(), specs: SPECS_SEL, totalCost, results: results.map(r => ({ ...r, ai: r.ai ? { ...r.ai, groups: undefined } : undefined })) }, null, 1));
console.log(`갤러리: ${path.relative(ROOT, OUT)}/index.html · 판단 비용 합계 $${totalCost.toFixed(3)}`);
