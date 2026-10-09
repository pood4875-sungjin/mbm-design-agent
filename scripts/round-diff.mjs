#!/usr/bin/env node
// 라운드 비교 — ref/learned/cases/rounds.json 의 두 라운드를 케이스별로 견준다(규칙을 바꾼 뒤 회귀 찾기).
//
//   node scripts/round-diff.mjs                      마지막 라운드 vs 바로 앞 라운드
//   node scripts/round-diff.mjs --from 25 --to 29    지정 라운드끼리
//   node scripts/round-diff.mjs --list [N]           라운드 목록(마지막 N개, 기본 12)
//   node scripts/round-diff.mjs --checks <백업 폴더>   규격 단위 비교: 백업해 둔 <id>.checks.json vs 지금 _out/<id>.checks.json
//   node scripts/round-diff.mjs --md                 표를 마크다운으로(히스토리·보고서에 붙일 때)
//
// 주의
// - `cases.mjs run <id…>`(일부만 돌림)로 남은 라운드의 total 은 그 케이스들만의 합이다. 합계는 「두 라운드에 다 있는 케이스」끼리만 견준다.
// - rounds.json 의 at 은 UTC 다(toISOString). 한국 시각은 +9시간.
// - note 에 「(중간)」이 붙은 라운드는 중간 실행이다 — 비교 기준으로는 그 앞의 정식 라운드를 쓴다(--from 으로 지정).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CASES = path.join(ROOT, 'ref/learned/cases');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const R = JSON.parse(readFileSync(path.join(CASES, 'rounds.json'), 'utf8'));
const md = flag('--md');
const kst = at => { const d = new Date(at.replace(' ', 'T') + ':00Z'); return new Date(d.getTime() + 9 * 3600e3).toISOString().slice(5, 16).replace('T', ' '); };

if (flag('--list')) {
  const n = Number(opt('--list', 12));
  for (const r of R.slice(-n)) console.log(`${String(r.n).padStart(3)}  ${kst(r.at)} KST  케이스 ${String(Object.keys(r.cases).length).padStart(2)}  경고 ${String(r.total).padStart(3)}  ${r.note}`);
  process.exit(0);
}

const byN = n => R.find(r => r.n === Number(n));
const to = opt('--to') ? byN(opt('--to')) : R[R.length - 1];
const from = opt('--from') ? byN(opt('--from')) : R[R.indexOf(to) - 1];
if (!to || !from) { console.error('라운드를 못 찾음', opt('--from'), opt('--to')); process.exit(1); }

const ids = [...new Set([...Object.keys(from.cases), ...Object.keys(to.cases)])];
const rows = []; let sa = 0, sb = 0;
for (const id of ids) {
  const a = from.cases[id], b = to.cases[id];
  if (a && b) { sa += a.flagged; sb += b.flagged; }
  const codes = [...new Set([...Object.keys(a?.byCode ?? {}), ...Object.keys(b?.byCode ?? {})])]
    .map(k => [k, a?.byCode?.[k] ?? 0, b?.byCode?.[k] ?? 0]).filter(([, x, y]) => x !== y).map(([k, x, y]) => `${k} ${x}→${y}`).join(' · ');
  const d = a && b ? b.flagged - a.flagged : null;
  const tag = !a ? '새 케이스' : !b ? '이번 실행 제외' : d > 0 ? '회귀' : d < 0 ? '개선' : codes ? '종류 바뀜' : '';
  rows.push({ id, a: a?.flagged ?? '–', b: b?.flagged ?? '–', d, tag, codes, infoA: a?.info, infoB: b?.info });
}
rows.sort((x, y) => (y.tag === '회귀') - (x.tag === '회귀') || Math.abs(y.d ?? 0) - Math.abs(x.d ?? 0));
const head = `라운드 ${from.n} → ${to.n}  (${kst(from.at)} → ${kst(to.at)} KST)\n  ${from.n}: ${from.note}\n  ${to.n}: ${to.note}\n  공통 케이스 ${ids.filter(i => from.cases[i] && to.cases[i]).length}건 경고 ${sa} → ${sb}   (라운드 total ${from.total} → ${to.total})`;
console.log(head);
const changed = rows.filter(r => r.tag);
if (md) {
  console.log(`\n| 케이스 | r${from.n} | r${to.n} | 바뀐 것 |\n|---|---|---|---|`);
  for (const r of changed) console.log(`| ${r.id} | ${r.a} | **${r.b}** | ${r.tag}${r.codes ? ' — ' + r.codes : ''} |`);
  const same = rows.length - changed.length; if (same) console.log(`| 나머지 ${same}건 | | | 변화 없음 |`);
} else {
  for (const r of changed) console.log(`  ${r.tag.padEnd(8)} ${r.id.padEnd(22)} ${String(r.a).padStart(3)} → ${String(r.b).padEnd(3)} ${r.codes}${r.infoA !== r.infoB && r.infoA != null && r.infoB != null ? `  (참고 ${r.infoA}→${r.infoB})` : ''}`);
  console.log(`  변화 없음 ${rows.length - changed.length}건`);
}

// 규격 단위 — 규칙 바꾸기 전에 `cp ref/learned/cases/_out/*.checks.json <백업>/` 해 둔 것과 지금을 견준다
const bk = opt('--checks');
if (bk) {
  const OUT = path.join(CASES, '_out');
  const warnOf = f => { if (!existsSync(f)) return null; const j = JSON.parse(readFileSync(f, 'utf8')); return Object.fromEntries(Object.entries(j).map(([s, r]) => [s, (r?.warnings ?? []).filter(w => w.level !== 'info').map(w => w.code + ' ' + w.msg)]).filter(([, w]) => w.length)); };
  console.log(`\n규격 단위 (백업 ${bk} → 지금 _out)`);
  for (const f of readdirSync(bk).filter(f => f.endsWith('.checks.json'))) {
    const id = f.replace('.checks.json', ''); const A = warnOf(path.join(bk, f)), B = warnOf(path.join(OUT, f));
    if (!A || !B) continue;
    const specs = [...new Set([...Object.keys(A), ...Object.keys(B)])];
    const lines = [];
    for (const s of specs) {
      const a = A[s] ?? [], b = B[s] ?? [];
      if (!a.length && b.length) lines.push(`    + ${s}: ${b.join(' · ')}`);
      else if (a.length && !b.length) lines.push(`    − ${s}: ${a.join(' · ')}`);
      else if (a.join() !== b.join()) lines.push(`    ~ ${s}: ${a.join(' · ')}  →  ${b.join(' · ')}`);
    }
    if (lines.length) console.log(`  ${id}\n${lines.join('\n')}`);
  }
  console.log('  (+ 새 경고 · − 사라진 경고 · ~ 문장/수치 바뀜)');
}
