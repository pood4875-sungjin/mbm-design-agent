#!/usr/bin/env node
// A/B 비교를 헤드리스로 — 케이스(ref/learned/cases/<id>) × 규격마다 A(renderArtifact)·B(server/design.js → Claude) 를 그려 HTML·PNG·기록 JSON 을 남긴다.
//   node scripts/ab-run.mjs [pin-28 pin-32 …] [--spec kakao-display-pc-promo] [--model claude-opus-5-5] [--effort high] [--cmodel claude-sonnet-5-5] [--ceffort medium] [--no-b] [--no-c] [--out history/img/<날짜>_ab]
//   C = A+AI(그림 판단 1회 → 규칙 렌더). --no-b 로 B 만 끄고 C 는 돌릴 수 있다
//   B 는 유료 호출이다 — 키가 없으면(--no-b 와 같게) A 만 그린다. 키: ANTHROPIC_API_KEY / server/.env / app/config.local.js (server/server.mjs 와 같은 순서)
//   브리프는 app/ab.js 의 샘플과 같다(없는 케이스는 cases.json fields 또는 기본값). PNG 는 macOS Chrome headless(core/export.js).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const ids = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && !['--no-b', '--no-c'].includes(argv[i - 1])));
const CASES = ids.length ? ids : ['pin-28', 'pin-32'];
const SPEC = opt('--spec', 'kakao-display-pc-promo');
const today = new Date().toISOString().slice(0, 10);
const OUT = path.resolve(ROOT, opt('--out', `history/img/${today}_ab`));
mkdirSync(OUT, { recursive: true });

const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { registerAll } = await core('generate.js'); registerAll();
const { SPECS, renderArtifact } = await core('contract.js');
const { createContext } = await core('context.js');
const { normalizeStyle } = await core('style.js');
const F = await core('fonts.js');
const { renderLayout } = await core('trackb/render.js');
const { SHAPES, shapeOfSpec, presetPatch, kvMetaWithAi } = await core('trackb/analyze.js');
const { fieldFromImage, extractPalette, edgeColor } = await core('palette.js');
import { execFileSync } from 'node:child_process';
const { exportPng } = await core('export.js');
const FACES = F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, pathToFileURL(path.join(ROOT, 'app')).href + '/')).join('');
const doc = (inner, w, h) => `<!doctype html><html><head><meta charset="utf-8"><style>${FACES}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}</style></head><body>${inner}</body></html>`;

// 샘플 브리프 — app/ab.js SAMPLES 와 같은 값
const BRIEFS = {
  'pin-28': { brief: { client: 'GS에너지', hiringType: '신입 공채', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', startDate: '2025-06-20', deadline: '2025-07-02', deadlineTime: '17:00', season: '2025년' }, primary: '#326CD1' },
  'pin-32': { brief: { client: '동서식품', hiringType: '대졸 신입/경력사원 채용', role: '(신입) 영업, 일반관리, 제조, 연구, 물류, 전산 / (경력) 연구(QA), 디자인', startDate: '2026-09-28', deadline: '2026-10-12', season: '2026년', slogan: '동서식품의 새로운 인재를 찾습니다!' }, primary: '#C75420' },
};
const DEFAULT_BRIEF = { client: '한진정보통신', hiringType: '경력직 채용', role: 'SW개발, 보안', deadline: '2026-10-31' };
const ledger = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/cases/cases.json'), 'utf8'));

function loadKey() {
  if (process.env.ANTHROPIC_API_KEY?.trim()) return process.env.ANTHROPIC_API_KEY.trim();
  const env = path.join(ROOT, 'server/.env'); if (existsSync(env)) { const m = /^\s*ANTHROPIC_API_KEY\s*=\s*["']?([^"'\s#]+)/m.exec(readFileSync(env, 'utf8')); if (m) return m[1]; }
  const local = path.join(ROOT, 'app/config.local.js'); if (existsSync(local)) { const m = /MBM_API_KEY\s*=\s*['"](sk-ant-[A-Za-z0-9_-]{20,})['"]/.exec(readFileSync(local, 'utf8')); if (m) return m[1]; }
  return '';
}
const dataUrlOf = file => { const ext = path.extname(file).slice(1).toLowerCase(); const mt = ext === 'jpg' ? 'jpeg' : ext; return `data:image/${mt};base64,${readFileSync(file).toString('base64')}`; };

const KEY = (flag('--no-b') && flag('--no-c')) ? '' : loadKey();
let design = null, analyze = null, client = null;
if (KEY) { const D = await import(pathToFileURL(path.join(ROOT, 'server/design.js')).href); client = D.makeClient(KEY); design = D.designLayout; analyze = D.analyzeKv; }
else console.log('API 키가 없어 A 만 그린다 (server/.env 에 ANTHROPIC_API_KEY=… 를 넣으면 A+AI·B 도)');

const spec = SPECS[SPEC]; if (!spec) throw new Error('규격 없음: ' + SPEC);
const records = [];
for (const id of CASES) {
  const dir = path.join(ROOT, 'ref/learned/cases', id);
  const c = ledger.cases.find(x => x.id === id) ?? { id, kv: 'kv.jpg', logo: null };
  const kvFile = path.join(dir, c.kv ?? 'kv.jpg'); if (!existsSync(kvFile)) { console.log(`[${id}] 키비주얼 없음: ${kvFile}`); continue; }
  const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const logoFile = c.logo && existsSync(path.join(dir, c.logo)) ? path.join(dir, c.logo) : null;
  const S = BRIEFS[id] ?? { brief: c.fields ?? DEFAULT_BRIEF, primary: c.primary ?? meta.colors?.[0] ?? '#2456D6' };
  const ctx = createContext(S.brief, 'recruit');
  const rec = { case: id, spec: SPEC, brief: S.brief, primary: S.primary, a: null, b: null };

  // ── A ──
  const style = normalizeStyle({ colors: [S.primary], keyVisual: pathToFileURL(kvFile).href, kvMeta: meta, logo: logoFile ? pathToFileURL(logoFile).href : null, logoMeta: c.logoMeta ?? null, logoTone: c.logoMeta?.tone ?? null });
  const tA = Date.now(); const htmlA = renderArtifact(SPEC, ctx, style, {}); rec.a = { ms: Date.now() - tA };
  const fa = path.join(OUT, `${id}_${SPEC}_A.html`); writeFileSync(fa, doc(htmlA, spec.w, spec.h));
  rec.a.png = exportPng(fa, path.join(OUT, `${id}_${SPEC}_A.png`), spec.w, spec.h) ? `${id}_${SPEC}_A.png` : null;
  console.log(`[${id}] A ${rec.a.ms}ms → ${rec.a.png ?? fa}`);

  // ── C (A+AI): 그림 판단 1회 → 이 규격의 모양 묶음 crop 사본(PIL) + 측정 → 규칙 렌더 ──
  if (analyze && !flag('--no-c')) {
    try {
      const out = await analyze(client, { kv: { dataUrl: dataUrlOf(kvFile), meta }, logo: logoFile ? { dataUrl: dataUrlOf(logoFile), meta: c.logoMeta ?? null } : null, brief: S.brief, brand: { primary: S.primary }, requests: '', model: opt('--cmodel', undefined), effort: opt('--ceffort', 'medium') });
      const shape = shapeOfSpec(spec), g = out.analysis.groups[shape];
      let kvC = kvFile, metaC = meta;
      if (g && !(g.crop.x <= 0.001 && g.crop.y <= 0.001 && g.crop.w >= 0.999 && g.crop.h >= 0.999)) {
        kvC = path.join(OUT, `${id}_${shape}_crop${path.extname(kvFile)}`);
        execFileSync('python3', ['-c', `import sys; from PIL import Image; im=Image.open(sys.argv[1]); W,H=im.size; x,y,w,h=[float(v) for v in sys.argv[3:7]]; im.crop((round(x*W),round(y*H),round((x+w)*W),round((y+h)*H))).save(sys.argv[2])`, kvFile, kvC, String(g.crop.x), String(g.crop.y), String(g.crop.w), String(g.crop.h)]);
        const j = JSON.parse(execFileSync('python3', [path.join(ROOT, 'scripts/case-rgba.py'), kvC], { maxBuffer: 64 * 1024 * 1024 }).toString());
        const rgba = new Uint8ClampedArray(Buffer.from(j.rgba, 'base64'));
        metaC = { ar: j.ar, px: j.px, edge: edgeColor(rgba, j.w, j.h), field: fieldFromImage(rgba, j.w, j.h), colors: extractPalette(rgba, 3) };
      }
      const styleC = normalizeStyle({ colors: [S.primary], keyVisual: pathToFileURL(kvC).href, kvMeta: kvMetaWithAi(metaC, out.analysis, g?.crop ?? { x: 0, y: 0, w: 1, h: 1 }, g), logo: logoFile ? pathToFileURL(logoFile).href : null, logoMeta: c.logoMeta ?? null, logoTone: c.logoMeta?.tone ?? null, ...presetPatch(g, out.analysis) });
      const tC = Date.now(); const htmlC = renderArtifact(SPEC, ctx, styleC, {}); const renderMs = Date.now() - tC;
      const fc = path.join(OUT, `${id}_${SPEC}_C.html`); writeFileSync(fc, doc(htmlC, spec.w, spec.h));
      const png = exportPng(fc, path.join(OUT, `${id}_${SPEC}_C.png`), spec.w, spec.h) ? `${id}_${SPEC}_C.png` : null;
      writeFileSync(path.join(OUT, `${id}_analysis.json`), JSON.stringify({ analysis: out.analysis, fixes: out.fixes, usage: out.usage, cost: out.cost, ms: out.ms, model: out.model, effort: out.effort, raw: out.raw }, null, 1));
      rec.c = { ms: out.ms, renderMs, usage: out.usage, cost: out.cost, model: out.model, effort: out.effort, fixes: out.fixes, shape, group: g, type: out.analysis.kv.type, rationale: out.analysis.rationale, png };
      console.log(`[${id}] A+AI 판단 ${out.ms}ms + 렌더 ${renderMs}ms · 입 ${out.usage.input_tokens} 출 ${out.usage.output_tokens} · $${out.cost} · 유형 ${out.analysis.kv.type} · ${shape}: ${g ? `${g.kvPlace}/${g.kvSize}/${g.textAlign}/${g.textAnchor} 배경 ${g.bgFill}/${g.bgGrad}/${g.scrim} crop ${Math.round(g.crop.w * 100)}×${Math.round(g.crop.h * 100)}%` : '-'} · 고침 ${out.fixes.length} → ${png ?? fc}\n   근거: ${out.analysis.rationale}${g?.why ? `\n   ${shape}: ${g.why}` : ''}`);
    } catch (e) { rec.c = { error: e.message }; console.log(`[${id}] A+AI 실패: ${e.message}`); }
  }

  // ── B ──
  if (design && !flag('--no-b')) {
    try {
      const fid = F.effectiveFontId(spec.mediumRules, F.DEFAULT_FONT, spec.rules);
      const out = await design(client, { specId: SPEC, brief: S.brief, brand: { primary: S.primary }, requests: '', fontId: F.DEFAULT_FONT, model: opt('--model', undefined), effort: opt('--effort', 'high'), kv: { dataUrl: dataUrlOf(kvFile), meta }, logo: logoFile ? { dataUrl: dataUrlOf(logoFile), meta: c.logoMeta ? { ...c.logoMeta, ar: c.logoMeta.ar } : null } : null });
      const htmlB = renderLayout(out.layout, { kv: pathToFileURL(kvFile).href, logo: logoFile ? pathToFileURL(logoFile).href : null, fontStack: F.FONTS[fid]?.stack, specId: SPEC });
      const fb = path.join(OUT, `${id}_${SPEC}_B.html`); writeFileSync(fb, doc(htmlB, spec.w, spec.h));
      const png = exportPng(fb, path.join(OUT, `${id}_${SPEC}_B.png`), spec.w, spec.h) ? `${id}_${SPEC}_B.png` : null;
      writeFileSync(path.join(OUT, `${id}_${SPEC}_B.json`), JSON.stringify({ layout: out.layout, fixed: out.fixed, fixes: out.fixes, unresolved: out.unresolved, usage: out.usage, cost: out.cost, calls: out.calls, ms: out.ms, model: out.model, effort: out.effort, rationale: out.rationale, raw: out.raw }, null, 1));
      rec.b = { ms: out.ms, calls: out.calls, usage: out.usage, cost: out.cost, model: out.model, effort: out.effort, fixes: out.fixes, unresolved: out.unresolved, rationale: out.rationale, png };
      console.log(`[${id}] B ${out.ms}ms · ${out.calls}회 · 입 ${out.usage.input_tokens} 출 ${out.usage.output_tokens} · $${out.cost} · 고침 ${out.fixes.length} 미해결 ${out.unresolved.length} → ${png ?? fb}\n   근거: ${out.rationale}`);
    } catch (e) { rec.b = { error: e.message }; console.log(`[${id}] B 실패: ${e.message}`); }
  }
  records.push(rec);
}
writeFileSync(path.join(OUT, 'records.json'), JSON.stringify({ at: new Date().toISOString(), spec: SPEC, records }, null, 1));
console.log(`기록: ${path.relative(ROOT, OUT)}/records.json`);
