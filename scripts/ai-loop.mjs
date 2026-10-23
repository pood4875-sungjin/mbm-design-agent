#!/usr/bin/env node
// A+AI 검증 루프 한 라운드 — 케이스 × 대표 규격을 A(규칙)·C(AI 판단 + 규칙)로 그리고, 자동 수치 + Claude 비전 채점 → 라운드 보고서.
//   node scripts/ai-loop.mjs --round 1 [--rejudge] [--cases a,b] [--no-critic]
//   판단은 history/img/loop/analysis/<id>.json 에 캐시(--rejudge 면 새로 부름). 결과: history/img/loop/r<N>/(index.html · report.json · summary.md · 시트 PNG)
//   키: server/.env. 비용은 보고서에 합산.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const ROUND = opt('--round', '1');
const LOOP = path.join(ROOT, 'history/img/loop');
const OUT = path.join(LOOP, `r${ROUND}`), CACHE = path.join(LOOP, 'analysis'), TMP = path.join(OUT, '_tmp');
mkdirSync(TMP, { recursive: true }); mkdirSync(CACHE, { recursive: true });

export const SET = [
  { type: '사진', ids: ['t1014-hanssem', 'hr-doctor', 'midas-team-photo', 't1014-asan-photo', 'midas-cablebridge'] },
  { type: '누끼', ids: ['t1014-dongsuh', 't1014-jeil', 't1014-bionote-dog', 'abl-group', 'midas-folder-blue'] },
  { type: '오브젝트·일러스트', ids: ['t1014-gs2025', 't1014-lt-v2', 'midas-faces-3d', 'pin-15', 't1014-asan-illust'] },
];
const SPECS = ['kakao-display-pc-promo', 'naver-gfa-mobile-da-1250x560', 'google-gdn-970x250', 'google-gdn-580x400', 'instagram-feed-1080', 'google-gdn-300x600', 'google-gdn-300x1050', 'nap-dsp-band-320x100'];
const IDS = opt('--cases') ? opt('--cases').split(',') : SET.flatMap(g => g.ids);
const GS = { client: 'GS에너지', season: '2025년', hiringType: '신입 공채', startDate: '2025-06-20', deadline: '2025-07-02', deadlineTime: '17:00', role: '일반(사업, 재무 등), 보훈(사업/경영지원)' };
const LOGO_FALLBACK = 'sep-open-recruit';   // MIDAS 워드마크

const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { registerAll } = await core('generate.js'); registerAll();
const { SPECS: ALL, renderArtifact } = await core('contract.js');
const { createContext } = await core('context.js');
const { normalizeStyle } = await core('style.js');
const F = await core('fonts.js');
const { shapeOfSpec, presetPatch, kvMetaWithAi, validateAnalysis, aiEligible } = await core('trackb/analyze.js');
const { coverageOf, overlapRatio, objectRects } = await core('renderers/ad.js');
const { fieldFromImage, extractPalette, edgeColor } = await core('palette.js');
const { exportPng } = await core('export.js');
const FACES = F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, pathToFileURL(path.join(ROOT, 'app')).href + '/')).join('');
const doc = (inner, w, h) => `<!doctype html><html><head><meta charset="utf-8"><style>${FACES}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}</style></head><body>${inner}</body></html>`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dataUrlOf = file => { const ext = path.extname(file).slice(1).toLowerCase(); return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${readFileSync(file).toString('base64')}`; };
const ledger = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/cases/cases.json'), 'utf8'));
const KEY = (() => { const env = path.join(ROOT, 'server/.env'); const m = existsSync(env) && /^\s*ANTHROPIC_API_KEY\s*=\s*["']?([^"'\s#]+)/m.exec(readFileSync(env, 'utf8')); return process.env.ANTHROPIC_API_KEY?.trim() || (m ? m[1] : ''); })();
if (!KEY) { console.error('키 없음(server/.env)'); process.exit(1); }
const D = await import(pathToFileURL(path.join(ROOT, 'server/design.js')).href);
const C = await import(pathToFileURL(path.join(ROOT, 'server/critic.js')).href);
const client = D.makeClient(KEY);
let NO_API = flag('--no-api');   // 크레딧이 떨어지면 true — 판단은 캐시, 채점은 끄고 자동 수치만

const py = (code, args) => execFileSync('python3', ['-c', code, ...args], { maxBuffer: 64 * 1024 * 1024 }).toString();
const apiCopy = (file, dst) => { py(`import sys; from PIL import Image; im=Image.open(sys.argv[1]); im.thumbnail((1600,1600)); (im if sys.argv[2].endswith('.png') else im.convert('RGB')).save(sys.argv[2], quality=90)`, [file, dst]); return dst; };
const measure = file => { const j = JSON.parse(execFileSync('python3', [path.join(ROOT, 'scripts/case-rgba.py'), file], { maxBuffer: 64 * 1024 * 1024 }).toString()); const rgba = new Uint8ClampedArray(Buffer.from(j.rgba, 'base64')); return { ar: j.ar, px: j.px, edge: edgeColor(rgba, j.w, j.h), field: fieldFromImage(rgba, j.w, j.h), colors: extractPalette(rgba, 3) }; };
const isFull = c => c.x <= 0.001 && c.y <= 0.001 && c.w >= 0.999 && c.h >= 0.999;
const traceOf = html => { const m = html.match(/data-trace="([^"]*)"/); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')); } catch { return null; } };

// 자동 수치 — 그린 HTML 에서(렌더러와 같은 계산)
function metrics(html, style0, spec) {
  // 규칙 자리로 돌아간 렌더(data-ai-box 없음)는 원본 그림으로 그렸다 — 원본 측정값으로 재야 한다(r4 얼굴 잘림 오탐)
  const style = (!/data-ai-box="/.test(html) && style0.aiKvMetaOrig) ? { ...style0, kvMeta: style0.aiKvMetaOrig } : style0;
  const tr = traceOf(html); const W = spec.w, H = spec.h;
  const cov = tr ? coverageOf(html, tr, style, spec) : null;
  const ov = tr ? overlapRatio(html, tr, style, spec) : null;
  let kvVis = 0; for (const o of objectRects(html, style, spec)) kvVis = Math.max(kvVis, Math.max(0, o.clip.w) * Math.max(0, o.clip.h) / (W * H));
  const faces = style.kvMeta?.ai?.faces ?? []; let faceCut = 0;
  for (const o of objectRects(html, style, spec)) for (const f of faces) { const p = o.pic; const Fb = { x: p.x + f.x * p.w, y: p.y + f.y * p.h, w: f.w * p.w, h: f.h * p.h }; const a = Fb.w * Fb.h; if (!(a > 0)) continue; const vis = Math.max(0, Math.min(Fb.x + Fb.w, W, o.clip.x + o.clip.w) - Math.max(Fb.x, 0, o.clip.x)) * Math.max(0, Math.min(Fb.y + Fb.h, H, o.clip.y + o.clip.h) - Math.max(Fb.y, 0, o.clip.y)); const r = vis / a; if (r > 0.03 && r < 0.97) faceCut++; }
  const ai = (html.match(/data-ad="1" data-ai-box="([\w@-]+):/) ?? [])[1] ?? null;
  const rules = tr?.rules ?? [];
  return { kvArea: Math.round(kvVis * 100), subject: cov ? Math.round(cov.kv * 100) : null, filled: cov ? Math.round(cov.all * 100) : null, overlap: ov != null ? Math.round(ov * 1000) / 10 : null, faceCut, aiBox: ai ? (ai.startsWith('free') ? 'free' : rules.includes('aiBox.grow') ? 'grow' : ai === 'ai' ? 'ok' : 'shrink') : 'rule', contrast: tr?.field?.contrast ?? null, fieldSrc: tr?.field?.source ?? null };
}

const report = { round: ROUND, at: new Date().toISOString(), cases: [], cost: { judge: 0, critic: 0 } };
for (const id of IDS) {
  const c = ledger.cases.find(x => x.id === id); if (!c) { console.log(`[${id}] 장부에 없음`); continue; }
  const dir = path.join(ROOT, 'ref/learned/cases', id);
  const kvFile = path.join(dir, c.kv ?? 'kv.jpg'); const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const lc = c.logo ? c : ledger.cases.find(x => x.id === LOGO_FALLBACK); const ldir = path.join(ROOT, 'ref/learned/cases', lc.id);
  const logoFile = path.join(ldir, lc.logo); const logoMeta = lc.logoMeta ?? null; const tone = logoMeta?.tone ?? 'dark';
  const brief = c.fields ?? GS; const primary = c.primary ?? meta.colors?.[0] ?? '#2456D6';
  const ctx = createContext(brief, 'recruit');
  const logoStyle = { logo: pathToFileURL(logoFile).href, logoLight: tone === 'light' ? pathToFileURL(logoFile).href : null, logoTone: tone, logoMeta };
  const group = SET.find(g => g.ids.includes(id))?.type ?? '기타';
  // 판단(캐시)
  const cacheFile = path.join(CACHE, `${id}.json`);
  let analysis, fixes, judgeCost = 0;
  if ((!flag('--rejudge') || NO_API) && existsSync(cacheFile)) { const j = JSON.parse(readFileSync(cacheFile, 'utf8')); ({ analysis, fixes } = validateAnalysis(j.raw, { kvMeta: j.sentPx ? { ...meta, px: j.sentPx } : meta, hasLogo: true })); }
  else if (NO_API) { console.log(`[${id}] 판단 캐시 없음 — API 꺼짐, 건너뜀`); continue; }
  else {
    let out; try { out = await D.analyzeKv(client, { kv: { dataUrl: dataUrlOf(apiCopy(kvFile, path.join(TMP, `${id}_api${/\.png$/i.test(kvFile) ? '.png' : '.jpg'}`))), meta }, logo: { dataUrl: dataUrlOf(apiCopy(logoFile, path.join(TMP, `${id}_logo.png`))), meta: logoMeta }, brief, brand: { primary }, requests: '' }); } catch (e) { if (/credit balance|billing/i.test(e.message)) { NO_API = true; console.log('API 크레딧 없음 — 이후 판단·채점은 캐시·자동 수치로'); } else console.log(`[${id}] 판단 실패: ${e.message}`); if (existsSync(cacheFile)) { const j = JSON.parse(readFileSync(cacheFile, 'utf8')); ({ analysis, fixes } = validateAnalysis(j.raw, { kvMeta: j.sentPx ? { ...meta, px: j.sentPx } : meta, hasLogo: true })); } else continue; }
    if (out) writeFileSync(cacheFile, JSON.stringify({ raw: out.raw, sentPx: out.sentPx ?? null, usage: out.usage, cost: out.cost, at: new Date().toISOString() }, null, 1));
    if (out) { analysis = out.analysis; fixes = out.fixes; judgeCost = out.cost; report.cost.judge += out.cost; }
  }
  const row = { id, group, kvType: c.type, summary: c.summary, aiType: analysis.kv.type, rationale: analysis.rationale, fixes, judgeCost, specs: [] };
  const crops = new Map();
  for (const sid of SPECS) {
    const spec = ALL[sid]; const shape = shapeOfSpec(spec), g = analysis.groups[shape];
    let kvC = kvFile, metaC = meta;
    if (g && !isFull(g.crop)) { const key = JSON.stringify(g.crop); if (!crops.has(key)) { const f = path.join(TMP, `${id}_${shape}_crop${path.extname(kvFile)}`); py(`import sys; from PIL import Image; im=Image.open(sys.argv[1]); W,H=im.size; x,y,w,h=[float(v) for v in sys.argv[3:7]]; im.crop((round(x*W),round(y*H),round((x+w)*W),round((y+h)*H))).save(sys.argv[2])`, [kvFile, f, String(g.crop.x), String(g.crop.y), String(g.crop.w), String(g.crop.h)]); crops.set(key, { file: f, meta: measure(f) }); } ({ file: kvC, meta: metaC } = crops.get(key)); }
    const styleA = normalizeStyle({ colors: [primary], keyVisual: pathToFileURL(kvFile).href, kvMeta: meta, ...logoStyle });
    const styleC = aiEligible(spec) ? normalizeStyle({ colors: [primary], keyVisual: pathToFileURL(kvC).href, kvMeta: kvMetaWithAi(metaC, analysis, g?.crop ?? { x: 0, y: 0, w: 1, h: 1 }, g), ...logoStyle, ...presetPatch(g, analysis), aiKvOrig: pathToFileURL(kvFile).href, aiKvMetaOrig: meta }) : styleA;
    const cell = { spec: sid, label: `${spec.w}×${spec.h}`, title: spec.title, shape };
    for (const [tr, st] of [['A', styleA], ['C', styleC]]) {
      const html = renderArtifact(sid, ctx, st, {});
      const f = path.join(TMP, `${id}_${sid}_${tr}.html`); writeFileSync(f, doc(html, spec.w, spec.h));
      const png = path.join(OUT, `${id}_${sid}_${tr}.png`); exportPng(f, png, spec.w, spec.h);
      cell[tr] = { png: path.basename(png), m: metrics(html, st, spec) };
    }
    row.specs.push(cell);
  }
  // 접촉 시트(원본 썸네일 + A 줄 + C 줄, 규격 이름) → 비전 채점
  const sheet = path.join(OUT, `${id}_sheet.jpg`);
  py(`
import sys, json
from PIL import Image, ImageDraw, ImageFont
cells=json.loads(sys.argv[1]); out=sys.argv[2]; base=sys.argv[3]
H=230; pad=12; lab=22
try: font=ImageFont.truetype('/System/Library/Fonts/AppleSDGothicNeo.ttc', 15)
except Exception: font=None
rows=[]
for tr in ['A','C']:
    tiles=[]
    for c in cells:
        im=Image.open(base+'/'+c[tr]).convert('RGB'); im.thumbnail((10000,H)); t=Image.new('RGB',(im.width, H+lab),(255,255,255)); t.paste(im,(0,lab)); d=ImageDraw.Draw(t); d.text((2,2), tr+' · '+c['label'], fill=(20,20,20), font=font); tiles.append(t)
    W=sum(t.width for t in tiles)+pad*(len(tiles)+1); r=Image.new('RGB',(W,H+lab+pad),(235,235,238)); x=pad
    for t in tiles: r.paste(t,(x,pad//2)); x+=t.width+pad
    rows.append(r)
W=max(r.width for r in rows); sh=Image.new('RGB',(W,sum(r.height for r in rows)),(235,235,238)); y=0
for r in rows: sh.paste(r,(0,y)); y+=r.height
if sh.width>2400: sh=sh.resize((2400, int(sh.height*2400/sh.width)))
sh.save(out, quality=85)
`, [JSON.stringify(row.specs.map(s => ({ A: s.A.png, C: s.C.png, label: s.label }))), sheet, OUT]);
  row.sheet = path.basename(sheet);
  if (!flag('--no-critic') && !NO_API) {
    try {
      const kvThumb = path.join(TMP, `${id}_thumb.jpg`); py(`import sys; from PIL import Image; im=Image.open(sys.argv[1]).convert('RGB'); im.thumbnail((600,600)); im.save(sys.argv[2], quality=85)`, [kvFile, kvThumb]);
      const cr = await C.critiqueSheet(client, { sheetDataUrl: dataUrlOf(sheet), kvDataUrl: dataUrlOf(kvThumb), caseId: id, kvType: c.summary ?? c.type, specs: row.specs.map(s => s.label) });
      row.critic = cr; report.cost.critic += cr.cost ?? 0;
    } catch (e) { row.critic = { error: e.message }; if (/credit balance|billing/i.test(e.message)) { NO_API = true; console.log('API 크레딧 없음 — 채점 끔'); } }
  }
  const sc = (row.critic?.specs ?? []).map(s => s.score).filter(Number.isFinite);
  console.log(`[${id}] ${group} · AI ${analysis.kv.type} · 채점 ${sc.length ? (sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(2) : '–'} · better ${row.critic?.better ?? '–'} · ${row.specs.map(s => `${s.label}:${s.C.m.aiBox}`).join(' ')}`);
  report.cases.push(row);
}

// ── 요약 ──
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const tally = {}; const byGroup = {};
for (const r of report.cases) {
  const sc = (r.critic?.specs ?? []); byGroup[r.group] = byGroup[r.group] ?? { scores: [], better: { A: 0, C: 0, same: 0 } };
  for (const s of sc) { if (Number.isFinite(s.score)) byGroup[r.group].scores.push(s.score); for (const k of ['kvWeight', 'crop', 'bg', 'text']) if (s[k] && s[k] !== 'ok') tally[`${k}:${s[k]}`] = (tally[`${k}:${s[k]}`] ?? 0) + 1; }
  if (r.critic?.better) byGroup[r.group].better[r.critic.better] = (byGroup[r.group].better[r.critic.better] ?? 0) + 1;
}
const allScores = report.cases.flatMap(r => (r.critic?.specs ?? []).map(s => s.score).filter(Number.isFinite));
const autoOf = m => { let s = 3; if (m.aiBox === 'rule') s -= 1; if (m.kvArea < 20) s -= 0.5; if (m.kvArea >= 35) s += 0.5; if ((m.filled ?? 0) >= 45) s += 0.5; if (m.faceCut) s -= 1.5; if ((m.overlap ?? 0) > 2) s -= 1; return Math.max(1, Math.min(5, s)); };
const autoScores = report.cases.flatMap(r => r.specs.map(s => autoOf(s.C.m)));
const aiBox = {}; for (const r of report.cases) for (const s of r.specs) aiBox[s.C.m.aiBox] = (aiBox[s.C.m.aiBox] ?? 0) + 1;
report.summary = { autoScore: avg(autoScores), kvAreaAvg: avg(report.cases.flatMap(r => r.specs.map(s => s.C.m.kvArea))), avgScore: avg(allScores), byGroup: Object.fromEntries(Object.entries(byGroup).map(([k, v]) => [k, { avg: avg(v.scores), better: v.better }])), issues: Object.entries(tally).sort((a, b) => b[1] - a[1]), aiBox, faceCut: report.cases.reduce((n, r) => n + r.specs.reduce((m, s) => m + s.C.m.faceCut, 0), 0), cost: Math.round((report.cost.judge + report.cost.critic) * 1000) / 1000 };
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const md = [`# 라운드 ${ROUND} — ${report.at.slice(0, 16).replace('T', ' ')}`, '', `평균 점수(C, 1~5, Claude 채점): **${report.summary.avgScore?.toFixed(2) ?? '– (채점 없음)'}** · 자동 점수 ${report.summary.autoScore?.toFixed(2)} · 그림 면적 평균 ${report.summary.kvAreaAvg?.toFixed(0)}% · 비용 $${report.summary.cost} · 얼굴 잘림 ${report.summary.faceCut}`, '', '| 유형 | 평균 | A 나음 | C 나음 | 같음 |', '|---|---|---|---|---|',
  ...Object.entries(report.summary.byGroup).map(([k, v]) => `| ${k} | ${v.avg?.toFixed(2) ?? '–'} | ${v.better.A ?? 0} | ${v.better.C ?? 0} | ${v.better.same ?? 0} |`), '',
  `AI 상자 결과: ${Object.entries(aiBox).map(([k, v]) => `${k} ${v}`).join(' · ')}`, '', '## 문제 집계', ...report.summary.issues.map(([k, v]) => `- ${k} ${v}`), '', '## 케이스별 큰 문제',
  ...report.cases.map(r => `- **${r.id}**(${r.group}) ${r.critic?.better ? `· ${r.critic.better} 나음` : ''}: ${(r.critic?.top_issues ?? [r.critic?.error ?? '']).join(' / ')}`)].join('\n');
writeFileSync(path.join(OUT, 'summary.md'), md);
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>검증 루프 r${ROUND}</title><style>body{margin:0;padding:24px;background:#f4f5f7;color:#1c1f26;font:14px/1.5 'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif}h1{font-size:20px;margin:0 0 6px}.case{background:#fff;border:1px solid #e3e5ea;border-radius:12px;padding:16px;margin:16px 0}.case img.sheet{max-width:100%;border-radius:8px}table{border-collapse:collapse;font-size:12px;margin-top:8px}td,th{border:1px solid #e3e5ea;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f7f8fa}.bad{color:#d93025}.mini{color:#6b7280;font-size:12px}pre{white-space:pre-wrap;font:inherit}</style></head><body>
<h1>A+AI 검증 루프 — 라운드 ${ROUND}</h1><div class="mini">${esc(report.at)} · 케이스 ${report.cases.length} × 규격 ${SPECS.length} · 위 줄 A(규칙) / 아래 줄 C(AI 판단 + 규칙) · 채점 Claude ${C.CRITIC_MODEL}</div><pre>${esc(md)}</pre>
${report.cases.map(r => `<div class="case"><b>${esc(r.id)}</b> · ${esc(r.group)} · AI 유형 ${esc(r.aiType ?? '자동')} · ${r.critic?.better ? `<b>${esc(r.critic.better)} 나음</b>` : ''}<div class="mini">${esc(r.rationale)}</div><img class="sheet" src="${esc(r.sheet)}" alt=""><table><tr><th>규격</th><th>점수</th><th>비중</th><th>크롭</th><th>배경</th><th>글자</th><th>메모</th><th>AI 상자</th><th>그림 면적·주인공·채움·겹침</th></tr>${r.specs.map(s => { const k = (r.critic?.specs ?? []).find(x => x.spec === s.label) ?? {}; const bad = v => v && v !== 'ok' ? ` class="bad"` : ''; return `<tr><td>${esc(s.label)}</td><td${k.score <= 2 ? ' class="bad"' : ''}>${k.score ?? '–'}</td><td${bad(k.kvWeight)}>${esc(k.kvWeight ?? '')}</td><td${bad(k.crop)}>${esc(k.crop ?? '')}</td><td${bad(k.bg)}>${esc(k.bg ?? '')}</td><td${bad(k.text)}>${esc(k.text ?? '')}</td><td>${esc(k.notes ?? '')}</td><td>${esc(s.C.m.aiBox)}</td><td>${s.C.m.kvArea}% · ${s.C.m.subject ?? '–'}% · ${s.C.m.filled ?? '–'}% · ${s.C.m.overlap ?? '–'}%${s.C.m.faceCut ? ` · <b class="bad">얼굴 잘림 ${s.C.m.faceCut}</b>` : ''}</td></tr>`; }).join('')}</table></div>`).join('')}</body></html>`;
writeFileSync(path.join(OUT, 'index.html'), html);
// 무거운 개별 PNG 는 시트만 남기고 지운다(저장소 크기) — 시트에 다 들어 있다
for (const r of report.cases) for (const s of r.specs) for (const t of ['A', 'C']) { try { rmSync(path.join(OUT, s[t].png)); } catch {} }
rmSync(TMP, { recursive: true, force: true });
console.log(`\n${md}\n\n→ ${path.relative(ROOT, OUT)}/index.html`);
