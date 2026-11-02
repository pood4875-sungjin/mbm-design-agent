#!/usr/bin/env node
// 가이드 수집기 CLI
//   node cli.js run [--only id,id]          한 번 수집하고 요약을 보여준다
//   node cli.js status                      소스별 상태
//   node cli.js specs [--json f] [--csv f]  수집된 규격 내보내기 (파일을 안 주면 표로 출력)
//   node cli.js serve                       대시보드 서버 (http://localhost:4173)
// 공통 옵션: --data <폴더> (기본 ./data) · --sources <json> (기본 ./sources.json)
//
// 대시보드 서버가 같은 데이터 폴더로 이미 떠 있으면, 같은 파일을 두 곳에서 쓰지 않도록 서버 API로 대신 돌린다.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const cmd = args[0] || 'help';
const opt = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
const PORT = +process.env.PORT || 4173;
const API = `http://localhost:${PORT}/api`;

const KIND = { size: '사이즈', width: '가로·세로', ratio: '비율', filesize: '용량', format: '포맷', limit: '최소·최대' };

async function serverUp() {
  if (opt('data') || opt('sources')) return false;
  try { return (await fetch(API + '/state', { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}

async function getStateAny() {
  if (await serverUp()) return (await fetch(API + '/state')).json();
  const c = await import('./lib/index.js');
  await c.init({ dataDir: opt('data'), sources: opt('sources') && path.resolve(opt('sources')) });
  return c.getState();
}

function printStatus(st) {
  const pad = (s, n) => String(s).padEnd(n);
  for (const s of st.sources) {
    const specs = s.docs.filter(d => !d.missing).reduce((n, d) => n + d.specs.length, 0);
    console.log(`${s.status === 'ok' ? '✓' : '✗'} ${pad(s.id, 22)} ${pad(s.label, 26)} 규격 ${pad(specs, 4)} ${s.name}`);
  }
}

async function run() {
  const only = opt('only')?.split(',');
  let st;
  if (await serverUp()) {
    console.log(`대시보드 서버(${PORT})로 수집을 돌립니다…`);
    const r = await (await fetch(API + '/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: only }) })).json();
    if (!r.started) throw new Error('이미 수집 중입니다');
    do { await new Promise(r => setTimeout(r, 2000)); st = await (await fetch(API + '/state')).json(); process.stdout.write(`\r${st.job.done}/${st.job.total} ${st.job.current}`.padEnd(70)); } while (st.job.running);
    process.stdout.write('\n');
  } else {
    const c = await import('./lib/index.js');
    await c.init({ dataDir: opt('data'), sources: opt('sources') && path.resolve(opt('sources')) });
    const t = setInterval(() => process.stdout.write(`\r${c.job.done}/${c.job.total} ${c.job.current}`.padEnd(70)), 1000);
    await c.runCheckAndWait(only);
    clearInterval(t);
    process.stdout.write('\n');
    st = await c.getState();
  }
  const r = st.runs[0];
  printStatus(only ? { sources: st.sources.filter(s => only.includes(s.id)) } : st);
  console.log(`\n${Math.round(r.ms / 1000)}초 · 소스 ${r.sources} · 변경 ${r.changed} · 수집 불가 ${r.broken}`);
  for (const e of st.events.filter(e => e.at >= r.at)) console.log(`  [${e.type}${e.level ? '/' + e.level : ''}] ${e.sourceName} · ${e.reason || e.title}`);
}

async function specs() {
  let rows;
  if (await serverUp()) {
    const st = await (await fetch(API + '/state')).json();
    rows = st.sources.flatMap(s => s.docs.filter(d => !d.missing).flatMap(d => d.specs.map(sp => ({
      source: s.id, sourceName: s.name, group: s.group, official: !s.secondary, status: s.status,
      doc: d.title, url: d.url + (sp.page ? '#page=' + sp.page : ''), kind: sp.kind, value: sp.value, context: sp.context,
    }))));
  } else {
    const c = await import('./lib/index.js');
    await c.init({ dataDir: opt('data'), sources: opt('sources') && path.resolve(opt('sources')) });
    rows = await c.exportSpecs();
  }
  if (opt('json')) { await writeFile(opt('json'), JSON.stringify(rows, null, 2)); console.log(`${rows.length}개 → ${opt('json')}`); }
  if (opt('csv')) {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['source', 'sourceName', 'group', 'official', 'doc', 'url', 'kind', 'value', 'context'];
    await writeFile(opt('csv'), '﻿' + [head.join(','), ...rows.map(r => head.map(h => q(r[h])).join(','))].join('\n'));
    console.log(`${rows.length}개 → ${opt('csv')}`);
  }
  if (!opt('json') && !opt('csv')) for (const r of rows) console.log(`${r.sourceName} | ${KIND[r.kind] || r.kind} ${r.value} | ${r.doc}`);
}

const commands = {
  run, specs,
  status: async () => printStatus(await getStateAny()),
  serve: () => import('./server.js'),
  help: async () => console.log((await import('node:fs')).readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 9).map(l => l.replace(/^\/\/ ?/, '')).join('\n')),
};

(commands[cmd] || commands.help)().catch(err => { console.error('오류:', err.message); process.exit(1); });
