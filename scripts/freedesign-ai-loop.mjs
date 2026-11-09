#!/usr/bin/env node
// AI 디자인 트랙 6단계 검증 루프(11-09) — 피그마 staging KV × 규격으로 suggest(병렬 3안)를 서버 큐(server/freejobs.js)로 실제로 돌려
//   ① 3안 다 나왔는지 ② 반려 수·사유 ③ 첫 카드·3안 시간 + 첫 카드 때 앱이 본 예상 시간(etaMs) ④ 각 안 PNG + 같은 KV 피그마 시안 나란히 시트
//   ⑤ (--edits) 자연어 수정 6개(즉시 3 · AI 3) 시간·성공(수정본을 같은 게이트로 다시 잰다)를 남긴다. 점수(눈 검수)는 사람이 시트를 보고 loop-r<N>.md 에 적는다.
//   node scripts/freedesign-ai-loop.mjs --round 1 [--cases a,b] [--specs google-gdn-580x400,instagram-feed-1080] [--edits] [--sheets-only] [--out _out/ai-track]
//   결과: <out>/loop-r<N>/{runs.json, <kv>__<spec>__<style>.png, sheet-<kv>.html/.png, edits.json}
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { ROOT, CHROME, dataUrlOf } from './lib/freedesign-case.mjs';
import { renderFree } from './lib/freedesign-renderer.mjs';
import { rulesForSpec, stripAssets, gateIssues } from '../server/freedesign.js';
import { enqueue, waitJob, publicJob, quickFix } from '../server/freejobs.js';
import { stagingInput as stagingInputOf, MAN, ST } from './lib/freedesign-staging.mjs';

const argv = process.argv.slice(2); const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const ROUND = opt('--round', '1');
const CASES = (opt('--cases') ?? 'fg-hanlim-building,fg-dn-park,fg-kg-car,fg-hanlim-planet,fg-dn-machine,fg-samkoo-iso,fg-hanlim-pills,fg-dn-phone').split(',');
const SPECS = (opt('--specs') ?? 'google-gdn-580x400,instagram-feed-1080').split(',');
const OUT = path.resolve(ROOT, opt('--out', '_out/ai-track'), `loop-r${ROUND}`); mkdirSync(OUT, { recursive: true });
const sec = ms => ms == null ? '-' : `${(ms / 1000).toFixed(0)}s`;

const stagingInput = (id, spec) => stagingInputOf(id, spec, { campaignId: `loop-r${ROUND}-${id}-${spec}` });
const fileHtml = (html, inp) => { let h = html.split('{{KV}}').join(pathToFileURL(inp._files.kv).href); if (inp._files.logo) h = h.split('{{LOGO}}').join(pathToFileURL(inp._files.logo).href); return h; };
const gateOf = (html, inp, name) => { const a = renderFree({ specId: inp.specId, html: fileHtml(html, inp), rules: inp.rules, brief: inp.brief, name }, OUT, { kvMeta: inp._meta, kvKind: inp._meta.field?.kind, kvFocus: inp._meta.focus }); return { png: a.png, issues: gateIssues(a), subject: a.subject?.m ?? null }; };
const strip = (h, inp) => h ? stripAssets(h, { kv: inp.kv.dataUrl, logo: inp.logo?.dataUrl ?? null }) : null;

const runsFile = path.join(OUT, 'runs.json');
const runs = existsSync(runsFile) ? JSON.parse(readFileSync(runsFile, 'utf8')) : [];
const save = () => writeFileSync(runsFile, JSON.stringify(runs, null, 1));

// ── 생성
if (!argv.includes('--sheets-only') && !argv.includes('--edits-only')) {
  for (const kv of CASES) for (const spec of SPECS) {
    if (runs.some(r => r.kv === kv && r.spec === spec && r.status === 'done')) { console.log('있음', kv, spec); continue; }
    const inp = stagingInput(kv, spec);
    const { _files, _meta, ...body } = inp;
    const { job } = enqueue({ ...body, mode: 'suggest' });
    const t0 = Date.now(); let etaAtFirst = null, etaAtStart = null, firstEtaAtStart = null;
    const tick = setInterval(() => { const p = publicJob(job); if (etaAtStart == null && p.status === 'running') { etaAtStart = p.etaMs; firstEtaAtStart = p.firstEtaMs; } if (etaAtFirst == null && job.partial.length) etaAtFirst = { at: Date.now() - t0, etaMs: p.etaMs }; }, 500);
    console.log(`[${new Date().toLocaleTimeString()}] suggest ${kv} × ${spec}`);
    const j = await waitJob(job.id); clearInterval(tick);
    const vmap = v => ({ id: v.style?.id, name: v.style?.name, ok: !!v.ok, rejected: !!v.rejected, attempts: v.attempts, at: v.at, tries: (v.tries ?? []).map(t => ({ attempt: t.attempt, autofix: !!t.autofix, errors: t.errors })), errors: v.errors, html: strip(v.html, inp), notes: v.notes, language: v.language ?? null });
    const vs = (j.result?.variants ?? j.partial ?? []).map(vmap), spares = (j.result?.spares ?? []).map(v => ({ ...vmap(v), spare: true }));   // 7단계: 예비(숨김) 안도 기록
    const row = { kv, spec, kind: inp._meta.kind, status: j.status, error: j.error ?? null, totalMs: j.stats?.totalMs ?? null, firstMs: j.stats?.firstMs ?? null, retries: j.stats?.retries ?? 0, rejected: vs.filter(v => v.rejected).length, passed: vs.filter(v => v.ok).length, etaAtStart, firstEtaAtStart, etaAtFirst, calls: j.stats?.calls ?? [], variants: vs, spares, cut: j.result?.cut ?? [], planned: j.result?.planned ?? vs.length, callN: (j.stats?.calls ?? []).length, cancelledN: (j.stats?.calls ?? []).filter(c => c.cancelled).length };
    // 렌더(시트용) + 같은 게이트로 다시 재기(앱이 보는 것과 같은지)
    for (const v of [...row.variants, ...row.spares]) if (v.html) { try { const g = gateOf(v.html, inp, `${kv}__${spec}__${v.id}`); v.png = g.png; v.regate = g.issues; v.subject = g.subject; } catch (e) { v.regate = ['렌더 실패: ' + e.message]; } }
    const i = runs.findIndex(r => r.kv === kv && r.spec === spec); if (i >= 0) runs[i] = row; else runs.push(row); save();
    console.log(`  ${j.status} 첫 ${sec(row.firstMs)} 전체 ${sec(row.totalMs)} 통과 ${row.passed}/3 반려 ${row.rejected} 재요청 ${row.retries} · 첫 카드 때 예상 남은 ${sec(etaAtFirst?.etaMs)}(실제 ${sec(row.totalMs != null && etaAtFirst ? row.totalMs - etaAtFirst.at : null)})`);
    console.log(`    호출 ${row.callN}(끊음 ${row.cancelledN}) · 계획 ${row.planned}안 · 예비 ${row.spares.length} · 끊은 안 ${row.cut.length}`);
    for (const v of row.variants) console.log(`    ${v.id} ${v.ok ? '통과' : '반려'} ${sec(v.at)} 시도${v.attempts}${v.ok ? '' : ' — ' + (v.errors ?? []).slice(0, 2).join(' / ').slice(0, 200)}${v.ok && v.regate?.length ? ' ⚠ 재측정 위반: ' + v.regate.join(' / ').slice(0, 200) : ''}`);
  }
}

// ── 자연어 수정 6개(즉시 3 · AI 3) — 통과한 안에서
const EDITS = [
  { kind: 'quick', instr: '메인 글자 크게' }, { kind: 'quick', instr: '일정을 태그로' }, { kind: 'quick', instr: '배경 어둡게' },
  { kind: 'ai', instr: '배경 더 차분하게' }, { kind: 'ai', instr: '일정을 더 눈에 띄게' }, { kind: 'ai', instr: '키비주얼을 더 크게 왼쪽으로' },
];
if (argv.includes('--edits') || argv.includes('--edits-only')) {
  const pool = runs.flatMap(r => r.variants.filter(v => v.ok && v.html).map(v => ({ r, v })));
  const edits = [];
  for (const [k, e] of EDITS.entries()) {
    const pick = pool[(k * 5 + 1) % pool.length]; if (!pick) break;
    const inp = stagingInput(pick.r.kv, pick.r.spec);
    const full = pick.v.html.split('{{KV}}').join(inp.kv.dataUrl).split('{{LOGO}}').join(inp.logo?.dataUrl ?? '{{LOGO}}');
    const rec = { ...e, kv: pick.r.kv, spec: pick.r.spec, from: pick.v.id };
    if (e.kind === 'quick') {
      const t0 = process.hrtime.bigint(); const r = quickFix({ html: full, instruction: e.instr, specId: inp.specId, brand: inp.brand }); rec.ms = Math.round(Number(process.hrtime.bigint() - t0) / 1e5) / 10;
      rec.ok = !!r.ok; rec.applied = r.applied?.map(a => a.label) ?? null; rec.reason = r.reason ?? null;
      if (r.ok) { const g = gateOf(strip(r.html, inp), inp, `edit-${k}`); rec.png = g.png; rec.gate = g.issues; }
    } else {
      const { _files, _meta, ...body } = inp;
      const { job } = enqueue({ ...body, mode: 'revise', prev: { html: full }, prompt: e.instr, parallel: false, model: 'sonnet', campaignId: `loop-r${ROUND}-edit-${k}` });
      const j = await waitJob(job.id); rec.ms = j.stats?.totalMs ?? null; rec.status = j.status;
      const v = j.result?.variants?.[0]; rec.ok = !!v?.ok; rec.errors = v?.errors ?? [j.error];
      if (v?.html) { const g = gateOf(strip(v.html, inp), inp, `edit-${k}`); rec.png = g.png; rec.gate = g.issues; rec.html = strip(v.html, inp); }
    }
    const b = gateOf(pick.v.html, inp, `edit-${k}-before`); rec.before = b.png;
    console.log(`수정 ${e.kind} 「${e.instr}」 ${pick.r.kv}/${pick.r.spec}/${pick.v.id} → ${rec.ok ? '성공' : '실패'} ${rec.ms}ms 게이트 ${rec.gate?.length ? '✗ ' + rec.gate.join(' / ').slice(0, 160) : '✓'}`);
    edits.push(rec);
  }
  writeFileSync(path.join(OUT, 'edits.json'), JSON.stringify(edits, null, 1));
}

// ── 시트: KV 마다 피그마 시안(있는 것 전부) + 규격별 3안
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
for (const kv of CASES) {
  const man = MAN.find(c => c.id === kv); const frames = Object.entries(man?.frames ?? {}).flatMap(([spec, ids]) => ids.map(id => ({ spec, id, png: path.join(ROOT, '_out/figma-1109/figma-frames', `${id}.png`) }))).filter(f => existsSync(f.png));
  const rs = runs.filter(r => r.kv === kv); if (!rs.length) continue;
  const card = (png, label, cls = '') => `<div class="c ${cls}">${png ? `<img src="${pathToFileURL(png).href}">` : '<div class="empty">없음</div>'}<p>${label}</p></div>`;
  const html = `<!doctype html><meta charset="utf-8"><style>body{font:13px -apple-system,'Apple SD Gothic Neo',sans-serif;margin:20px;background:#eceef0;color:#111;width:1860px}h1{font-size:17px;margin:0 0 8px}h2{font-size:14px;margin:14px 0 6px}.row{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}.c{background:#fff;padding:8px;border-radius:6px;max-width:600px}.c img{max-width:584px;max-height:520px;display:block;border:1px solid #ddd}.c p{margin:5px 0 0;font-size:12px;max-width:584px}.fig{background:#fff7e0}.bad{color:#b00}.empty{width:200px;height:120px;background:#f4f4f4}</style>
<h1>루프 r${ROUND} — ${esc(kv)} (${esc(man?.kind)} · ${esc(man?.summary ?? '')})</h1>
<h2>피그마 시안(기준 4점)</h2><div class="row">${frames.map(f => card(f.png, `피그마 ${f.id} · ${esc(f.spec)}`, 'fig')).join('') || '<p>시안 없음</p>'}</div>
${rs.map(r => `<h2>${esc(r.spec)} — 첫 카드 ${sec(r.firstMs)} · 3안 ${sec(r.totalMs)} · 통과 ${r.passed}/3 · 재요청 ${r.retries}</h2><div class="row">${[...r.variants, ...(r.spares ?? [])].map((v, i) => card(v.png, `안 ${i + 1} ${esc(v.name)} · ${v.spare ? '<i>예비(안 보임)</i> ' : ''}${v.ok ? (v.spare ? '통과' : '추천') : '<span class="bad">반려(숨김)</span>'} · ${sec(v.at)} · 시도 ${v.attempts}${!v.ok ? `<br><span class="bad">${esc((v.errors ?? []).slice(0, 2).join(' / ').slice(0, 220))}</span>` : ''}${v.ok && v.regate?.length ? `<br><span class="bad">재측정: ${esc(v.regate.join(' / ').slice(0, 220))}</span>` : ''}`)).join('')}</div>`).join('')}`;
  const f = path.join(OUT, `sheet-${kv}.html`); writeFileSync(f, html);
  const png = path.join(path.dirname(OUT), `loop-r${ROUND}`, `sheet-${kv}.png`);
  try { execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--window-size=1900,1900', '--virtual-time-budget=5000', `--screenshot=${png}`, pathToFileURL(f).href], { stdio: 'ignore' }); } catch (e) { console.error('시트 실패', kv, e.message); }
}

// ── 요약 지표
const done = runs.filter(r => r.status === 'done'); const allV = done.flatMap(r => r.variants);
const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
const summary = { round: ROUND, jobs: runs.length, done: done.length, full3: done.filter(r => r.passed >= 3).length, variants: allV.length, passed: allV.filter(v => v.ok).length, rejected: allV.filter(v => v.rejected).length, retries: done.reduce((a, r) => a + r.retries, 0), avgFirstMs: avg(done.map(r => r.firstMs).filter(Boolean)), avgTotalMs: avg(done.map(r => r.totalMs).filter(Boolean)), maxTotalMs: Math.max(0, ...done.map(r => r.totalMs ?? 0)), etaErrAtFirst: avg(done.filter(r => r.etaAtFirst && r.totalMs).map(r => Math.abs(r.totalMs - r.etaAtFirst.at - r.etaAtFirst.etaMs))), passedButRegate: allV.filter(v => v.ok && v.regate?.length).length, calls: done.reduce((a, r) => a + (r.callN ?? r.calls.length), 0), cancelledCalls: done.reduce((a, r) => a + (r.cancelledN ?? 0), 0), genCalls: done.reduce((a, r) => a + r.calls.filter(c => c.kind !== 'retry' && !c.cancelled).length, 0), spares: done.reduce((a, r) => a + (r.spares?.length ?? 0), 0), cut: done.reduce((a, r) => a + (r.cut?.length ?? 0), 0), timeouts: done.reduce((a, r) => a + [...r.variants, ...(r.spares ?? [])].filter(v => (v.errors ?? []).some(e => /시간 초과/.test(e))).length, 0),
  rejectReasons: Object.entries(allV.filter(v => v.rejected).flatMap(v => (v.errors ?? []).map(e => (/^(\S+ \S+)/.exec(e)?.[1] ?? e).slice(0, 30))).reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {})).sort((a, b) => b[1] - a[1]) };
writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
process.exit(0);
