#!/usr/bin/env node
// 케이스 장부 — 사용자가 보낸 키비주얼·로고를 한 곳에 쌓고(ref/learned/cases, 로컬 전용·배포 안 함), 명령 하나로 전 케이스 × 전 광고 규격을 다시 그려 디자인 검수(core/adcheck.js)까지 돌린다.
// 규칙 숫자를 바꿀 때 "예전 케이스가 깨지지 않는가"를 한 장(index.html)에서 본다. 10-06 사용자: "케이스 자산화 — 뭘 넣어도 데이터가 있고 그걸로 분기".
//
//   node scripts/cases.mjs add <그림> --id <id> [--logo <파일>] [--note "..."] [--primary #HEX] [--fields '{"client":…}']
//   node scripts/cases.mjs run [id …] [--shots]        전 케이스(또는 지정) 재렌더 + 검수 → ref/learned/cases/_out/index.html
//   node scripts/cases.mjs verdict <id> <specId|*> ok|issue "메모"     사람 판정 기록(데이터)
//   node scripts/cases.mjs list
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CASES = path.join(ROOT, 'ref/learned/cases');
const OUT = path.join(CASES, '_out');
const LEDGER = path.join(CASES, 'cases.json');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(OUT, { recursive: true });

const core = async f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { fieldFromImage, extractPalette, edgeColor } = await core('palette.js');
const { kvTypeOf, kvTypeSummary } = await core('kvtypes.js');

const ledger = () => existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { cases: [] };
const save = l => writeFileSync(LEDGER, JSON.stringify(l, null, 2));
const argv = process.argv.slice(2);
const cmd = argv.shift();
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };

function measure(file) {
  const j = JSON.parse(execFileSync('python3', [path.join(ROOT, 'scripts/case-rgba.py'), file], { maxBuffer: 64 * 1024 * 1024 }).toString());
  const rgba = new Uint8ClampedArray(Buffer.from(j.rgba, 'base64'));
  return { ar: j.ar, px: j.px, edge: edgeColor(rgba, j.w, j.h), field: fieldFromImage(rgba, j.w, j.h), colors: extractPalette(rgba, 3) };
}

if (cmd === 'add') {
  const src = positional[0]; if (!src) throw new Error('그림 파일이 필요합니다');
  const id = opt('--id') ?? path.basename(src).replace(/\.[^.]+$/, '').replace(/[^\w가-힣-]+/g, '-');
  const dir = path.join(CASES, id); mkdirSync(dir, { recursive: true });
  const kv = 'kv' + path.extname(src).toLowerCase(); copyFileSync(src, path.join(dir, kv));
  let logo = null; if (opt('--logo')) { logo = 'logo' + path.extname(opt('--logo')).toLowerCase(); copyFileSync(opt('--logo'), path.join(dir, logo)); }
  const meta = measure(path.join(dir, kv));
  writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 1));
  const l = ledger();
  const entry = { id, kv, logo, note: opt('--note') ?? '', primary: opt('--primary') ?? null, fields: opt('--fields') ? JSON.parse(opt('--fields')) : null, addedAt: new Date().toISOString().slice(0, 10), type: kvTypeOf(meta)?.id ?? null, summary: kvTypeSummary(meta), verdicts: [] };
  l.cases = l.cases.filter(c => c.id !== id).concat(entry); save(l);
  console.log(`+ ${id}: ${entry.summary}`);
}

if (cmd === 'list') {
  for (const c of ledger().cases) console.log(`${c.id.padEnd(16)} ${c.summary}  ${c.note ? '— ' + c.note : ''}  판정 ${c.verdicts.length}`);
}

if (cmd === 'verdict') {
  const [id, specId, result, ...rest] = positional;
  const l = ledger(); const c = l.cases.find(x => x.id === id); if (!c) throw new Error('없는 케이스 ' + id);
  c.verdicts.push({ specId, result, note: rest.join(' '), at: new Date().toISOString().slice(0, 10) });
  save(l); console.log(`기록: ${id} ${specId} ${result} ${rest.join(' ')}`);
}

if (cmd === 'run') {
  const { renderArtifact } = await core('contract.js');
  const { registerAll } = await core('generate.js');
  const { createContext } = await core('context.js');
  const { normalizeStyle } = await core('style.js');
  const { specOf } = await core('media.js');
  const { adSpecGroups } = await core('adspecs.js');
  registerAll();
  const l = ledger();
  const ids = positional.length ? positional : l.cases.map(c => c.id);
  const specIds = adSpecGroups().map(g => g.id);
  const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
  const doc = inner => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0;background:transparent}</style></head><body>${inner}</body></html>`;
  const results = {};
  for (const id of ids) {
    const c = l.cases.find(x => x.id === id); if (!c) { console.warn('없는 케이스', id); continue; }
    const dir = path.join(CASES, id);
    const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    c.type = kvTypeOf(meta)?.id ?? null; c.summary = kvTypeSummary(meta);
    const style = normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta, logo: c.logo ? pathToFileURL(path.join(dir, c.logo)).href : null, logoTone: 'dark' });
    const ctx = createContext(c.fields ?? DEFAULT_FIELDS, 'recruit');
    const sc = 0.5;
    const cells = specIds.map(sid => {
      const spec = specOf(sid);
      let html; try { html = renderArtifact(sid, ctx, style, {}); } catch (e) { html = `<div style="padding:8px;color:red">${esc(e.message)}</div>`; }
      const use = html.match(/data-kv-use="([^"]+)"/)?.[1] ?? '';
      return `<div class="cell" data-spec="${sid}"><div class="cap">${sid} ${spec.w}×${spec.h} <span>${use}</span></div><div class="box" style="width:${spec.w * sc}px;height:${spec.h * sc}px"><iframe data-spec="${sid}" style="width:${spec.w}px;height:${spec.h}px;transform:scale(${sc})" srcdoc="${esc(doc(html))}"></iframe></div><div class="warn" id="w-${sid}"></div></div>`;
    });
    const sheet = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(id)}</title><style>
body{margin:0;padding:20px;background:#f3f3f1;font-family:Pretendard,sans-serif;color:#1a1a1a;width:2200px;box-sizing:border-box}
h1{font-size:18px;margin:0 0 4px}.sub{font-size:12px;color:#666;margin-bottom:14px}.row{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
.cap{font-size:11px;color:#666;margin-bottom:4px}.cap span{color:#999}.box{position:relative;outline:1px solid #cfcfcf;background:#fff;overflow:hidden}.box iframe{border:0;position:absolute;left:0;top:0;transform-origin:0 0}
.warn{font-size:11px;color:#b3261e;margin-top:3px;max-width:360px}.warn:empty{display:none}.cell.bad .box{outline:2px solid #b3261e}
#checks{display:none}</style></head><body>
<h1>${esc(id)} <span style="font-weight:400;font-size:13px;color:#666">${esc(c.summary)}</span></h1><div class="sub">${esc(c.note)}</div><div class="row">${cells.join('')}</div>
<pre id="checks"></pre>
<script type="module">
import { checkAdDoc } from '${pathToFileURL(path.join(ROOT, 'core/adcheck.js')).href}';
const kvMeta = ${JSON.stringify(meta)};
await new Promise(r => setTimeout(r, 1500));
const out = {};
for (const f of document.querySelectorAll('iframe[data-spec]')) {
  try { const r = checkAdDoc(f.contentDocument, { kvMeta }); out[f.dataset.spec] = r; const w = document.getElementById('w-' + f.dataset.spec); if (r?.warnings.length) { w.textContent = r.warnings.map(x => x.msg).join(' · '); f.closest('.cell').classList.add('bad'); } }
  catch (e) { out[f.dataset.spec] = { error: String(e) }; }
}
document.getElementById('checks').textContent = JSON.stringify(out);
document.documentElement.dataset.done = '1';
</script></body></html>`;
    const sheetPath = path.join(OUT, `${id}.html`); writeFileSync(sheetPath, sheet);
    let dom = '';
    try { dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=12000', '--window-size=2200,1200', '--dump-dom', pathToFileURL(sheetPath).href], { maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); }
    catch (e) { console.warn(id, 'chrome 실패', e.message.slice(0, 120)); }
    const m = dom.match(/<pre id="checks">([\s\S]*?)<\/pre>/);
    let checks = {};
    try { checks = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : {}; } catch (e) { console.warn(id, 'checks 파싱 실패'); }
    writeFileSync(path.join(OUT, `${id}.checks.json`), JSON.stringify(checks, null, 1));
    if (flag('--shots')) { try { execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=12000', '--window-size=2200,6000', `--screenshot=${path.join(OUT, id + '.png')}`, pathToFileURL(sheetPath).href], { stdio: 'ignore' }); } catch {} }
    // 경고(warn)만 센다 — 템플릿 고정 칸의 빈 여백(info)은 따로(그림 탓이 아니다)
    const real = Object.entries(checks).filter(([, r]) => r?.warnings?.some(w => w.level !== 'info'));
    const info = Object.entries(checks).filter(([, r]) => r?.warnings?.length && !r.warnings.some(w => w.level !== 'info')).length;
    const flagged = real;
    results[id] = { specs: specIds.length, flagged: flagged.length, info, byCode: flagged.flatMap(([, r]) => r.warnings.filter(w => w.level !== 'info').map(w => w.code)).reduce((a, k) => (a[k] = (a[k] ?? 0) + 1, a), {}), list: flagged.map(([sid, r]) => `${sid}: ${r.warnings.filter(w => w.level !== 'info').map(w => w.msg).join(' · ')}`) };
    console.log(`${id.padEnd(14)} ${c.summary}\n   검수 경고 ${flagged.length}/${specIds.length} (참고 ${info})  ${JSON.stringify(results[id].byCode)}`);
    for (const line of results[id].list) console.log('   - ' + line);
  }
  save(l);
  // 라운드 기록 — 규칙을 바꿀 때마다 run --round "무엇을 바꿨나" 로 남긴다. 케이스별 경고 수의 추이가 곧 규칙 조정의 데이터
  const roundsPath = path.join(CASES, 'rounds.json');
  const rounds = existsSync(roundsPath) ? JSON.parse(readFileSync(roundsPath, 'utf8')) : [];
  rounds.push({ n: rounds.length + 1, at: new Date().toISOString().slice(0, 16).replace('T', ' '), note: opt('--round') ?? '', cases: Object.fromEntries(Object.entries(results).map(([k, r]) => [k, { flagged: r.flagged, info: r.info, byCode: r.byCode }])), total: Object.values(results).reduce((a, r) => a + r.flagged, 0) });
  writeFileSync(roundsPath, JSON.stringify(rounds, null, 1));
  console.log(`라운드 ${rounds.length}: 경고 합계 ${rounds[rounds.length - 1].total}${opt('--round') ? ' — ' + opt('--round') : ''}`);
  // 색인 페이지
  const rows = l.cases.map(c => { const r = results[c.id]; const th = pathToFileURL(path.join(CASES, c.id, c.kv)).href; return `<tr><td><img src="${th}" style="width:96px;height:72px;object-fit:contain;background:#eee;border-radius:6px"></td><td><b>${esc(c.id)}</b><br><span class="s">${esc(c.summary)}</span><br><span class="s">${esc(c.note)}</span></td><td>${r ? `<b>${r.flagged}</b> / ${r.specs}<br><span class="s">${esc(Object.entries(r.byCode).map(([k, v]) => `${k} ${v}`).join(' · '))}</span>` : '<span class="s">이번 실행 제외</span>'}</td><td class="s">${(c.verdicts ?? []).slice(-3).map(v => `${v.specId} ${v.result} ${esc(v.note)}`).join('<br>') || '—'}</td><td><a href="${c.id}.html">시트</a> · <a href="${c.id}.checks.json">검수 JSON</a></td></tr>`; }).join('');
  writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>케이스 장부</title><style>body{font-family:Pretendard,sans-serif;padding:24px;color:#1a1a1a;background:#fafaf8}h1{font-size:20px}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #e3e3e0;vertical-align:top;font-size:13px;text-align:left}.s{color:#666;font-size:12px}</style></head><body><h1>키비주얼 케이스 장부 <span class="s">${l.cases.length}건 · ${new Date().toISOString().slice(0, 10)} · 전 광고 규격 ${specIds.length}종 재렌더 + 디자인 검수</span></h1><table><tr><th>그림</th><th>케이스 · 유형</th><th>검수 경고(규격 수)</th><th>사람 판정</th><th>열기</th></tr>${rows}</table><p class="s">경고 종류: text-over-subject 글자-주인공 겹침 · logo-covered 로고 가림 · hard-cut 뚝 끊긴 변 · empty-band 빈 여백 · text-clipped 글자 잘림 · chip-overflow 알약 넘침. 규칙(core/kvtypes.js·canon.js·field.js) 숫자를 바꾸면 이 페이지로 전 케이스를 다시 본다.</p></body></html>`);
  const roundRows = rounds.map(r => `<tr><td>${r.n}</td><td class="s">${r.at}</td><td>${esc(r.note)}</td><td><b>${r.total}</b></td><td class="s">${l.cases.map(c => `${c.id} ${r.cases[c.id]?.flagged ?? '–'}`).join(' · ')}</td></tr>`).join('');
  const idx = readFileSync(path.join(OUT, 'index.html'), 'utf8').replace('</table><p class="s">', `</table><h2 style="font-size:16px;margin-top:28px">라운드 기록 <span class="s">규칙을 바꿀 때마다 전 케이스를 다시 돌린 결과</span></h2><table><tr><th>#</th><th>시각</th><th>바꾼 것</th><th>경고 합계</th><th>케이스별</th></tr>${roundRows}</table><p class="s">`);
  writeFileSync(path.join(OUT, 'index.html'), idx);
  console.log('index →', path.join(OUT, 'index.html'));
}
