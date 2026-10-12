#!/usr/bin/env node
// 규칙 장부 검사 — ref/learned/rules.json 의 형식·id 중복·코드 위치 파일 존재를 확인하고 묶음별 개수를 찍는다.
//   node scripts/rules-ledger.mjs             검사 + 개수
//   node scripts/rules-ledger.mjs --md        history/규칙장부.md 의 표(「<!-- 표 시작 -->」 아래)를 rules.json 에서 다시 만든다
// 규칙을 넣거나 바꾸면 rules.json 에 한 줄 추가·수정하고 이 스크립트를 돌린다(rule-iterate 스킬 2단계).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = resolve(ROOT, 'ref/learned/rules.json');
const MD_PATH = resolve(ROOT, 'history/규칙장부.md');
const MARK = '<!-- 표 시작 — 아래는 scripts/rules-ledger.mjs --md 가 rules.json 에서 만든다. 손으로 고치지 말 것 -->';

export const CATEGORIES = ['유형 판정', '배치·비중', '자르기·블리드', '지면 색', '글자 색·스크림', '이음·녹임', '타이포', '로고', '매체 규정', '자동 검사', '누끼·로고 손질'];
// 묶음마다 「흐름의 어느 때 걸리나」 한 문장 — 장부 표 앞에 찍는다
export const CATEGORY_WHEN = {
  '유형 판정': '그림을 올려 측정한 직후, 「누끼·일러스트·사진·질감 중 무엇인가」와 세부 유형·주인공 상자를 정할 때 적용.',
  '배치·비중': '유형이 정해진 뒤, 그림을 어디에 얼마나 크게 놓고 글자 자리를 얼마나 남길지 정할 때 적용.',
  '자르기·블리드': '그림을 자리에 넣을 때, 어느 변을 얼마나 잘라도 되고 지면 밖으로 얼마나 흘려도 되는지 정할 때 적용.',
  '지면 색': '그림 자리가 정해진 뒤, 그림이 아닌 나머지 지면의 색을 브랜드색·그림 변 색·그림 자체 중 무엇으로 할지 정할 때 적용.',
  '글자 색·스크림': '지면색이 정해진 뒤, 그 위 글자를 검정·흰색·브랜드색 중 무엇으로 하고 읽히지 않으면 어떤 가림막을 깔지 정할 때 적용.',
  '이음·녹임': '그림을 지면에 붙일 때, 그림 가장자리와 지면 색 차이를 보고 얼마나 길게 어떻게 녹일지 정할 때 적용.',
  '타이포': '문구를 글자로 앉힐 때, 크기·굵기·행간·자간·줄바꿈·어느 정보를 남기고 뺄지 정할 때 적용.',
  '로고': '로고를 어디에 얼마나 크게 어떤 색으로 둘지 정할 때 적용.',
  '매체 규정': '맨 처음 틀을 잡을 때 매체가 정한 규정·실측값으로 공통 규칙을 덮는 자리. 여기 값이 다른 모든 규칙보다 세다.',
  '자동 검사': '다 그린 뒤, 디자이너가 보면 걸릴 것을 재서 경고·참고로 내는 단계에서 적용.',
  '누끼·로고 손질': '그림·로고를 올리는 순간, 렌더에 들어가기 전에 바탕을 지우고 여백을 자르고 실측하는 단계에서 적용.',
};
const STATUS = ['active', 'reverted', 'single-evidence'];
const REQUIRED = ['id', 'category', 'scope', 'rule', 'value', 'evidence', 'since', 'round', 'where', 'source', 'status'];

export function loadRules() { return JSON.parse(readFileSync(JSON_PATH, 'utf8')); }

export function validate(doc) {
  const errs = [];
  const rules = doc?.rules;
  if (!Array.isArray(rules)) return ['rules 배열이 없다'];
  const seen = new Set();
  const fileOf = w => String(w).replace(/:\d+.*$/, '').replace(/\s.*$/, '');
  rules.forEach((r, i) => {
    const tag = `#${i} ${r?.id ?? '(id 없음)'}`;
    for (const k of REQUIRED) if (!(k in r)) errs.push(`${tag}: ${k} 없음`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.id ?? '')) errs.push(`${tag}: id 는 kebab-case`);
    if (seen.has(r.id)) errs.push(`${tag}: id 중복`); seen.add(r.id);
    if (!CATEGORIES.includes(r.category)) errs.push(`${tag}: 모르는 category「${r.category}」`);
    if (!STATUS.includes(r.status)) errs.push(`${tag}: 모르는 status「${r.status}」`);
    if (typeof r.rule !== 'string' || r.rule.length < 8) errs.push(`${tag}: rule 이 비었다`);
    if (!Array.isArray(r.evidence)) errs.push(`${tag}: evidence 는 배열`);
    if (!(r.since === '10-06 이전' || /^\d{4}-\d{2}-\d{2}$/.test(r.since ?? ''))) errs.push(`${tag}: since 는 YYYY-MM-DD 또는 「10-06 이전」`);
    if (!(r.round === null || Number.isInteger(r.round))) errs.push(`${tag}: round 는 정수 또는 null`);
    if (r.where_also && !Array.isArray(r.where_also)) errs.push(`${tag}: where_also 는 배열`);
    for (const w of [r.where, ...(r.where_also ?? [])]) { const f = fileOf(w); if (!existsSync(resolve(ROOT, f))) errs.push(`${tag}: 파일 없음 ${f}`); }
    if (r.source && !existsSync(resolve(ROOT, r.source))) errs.push(`${tag}: source 파일 없음 ${r.source}`);
  });
  return errs;
}

export function counts(rules) {
  const by = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
  for (const r of rules) by[r.category]++;
  return { total: rules.length, by, single: rules.filter(r => r.status === 'single-evidence').length, reverted: rules.filter(r => r.status === 'reverted').length };
}

const esc = s => String(s ?? '').replace(/\|/g, '｜').replace(/\n/g, ' ');
const whereCell = r => [r.where, ...(r.where_also ?? [])].map(w => '`' + w + '`').join('<br>');
const sinceCell = r => r.since === '10-06 이전' ? '10-06 이전' : `${r.since.slice(5)}${r.round != null ? ` (r${r.round})` : ''}`;
const statusMark = r => r.status === 'reverted' ? ' **(되돌림)**' : r.status === 'single-evidence' ? ' *(근거 1건)*' : '';

export function renderTables(rules) {
  const out = [];
  for (const c of CATEGORIES) {
    const rows = rules.filter(r => r.category === c);
    if (!rows.length) continue;
    out.push(`### ${c} (${rows.length})`, `> ${CATEGORY_WHEN[c]}`, '', '| 규칙 | 수치 | 언제·어디에 적용 | 근거 | 들어온 날 (라운드) | 코드 위치 |', '|---|---|---|---|---|---|');
    for (const r of rows) out.push(`| **${r.id}**${statusMark(r)}<br>${esc(r.rule)}${r.note ? `<br><small>${esc(r.note)}</small>` : ''} | ${esc(r.value)} | ${esc(r.scope)} | ${r.evidence.length ? r.evidence.map(esc).join('<br>') : '—'}<br><small>${esc(r.source)}</small> | ${sinceCell(r)} | ${whereCell(r)} |`);
    out.push('');
  }
  const single = rules.filter(r => r.status === 'single-evidence');
  out.push('## 근거가 1건뿐인 규칙', '채택 정책(「근거 1건이어도 일단 넣고 부딪히면 조정」)으로 들어온 것들이다. 반대 사례가 나오면 먼저 의심할 곳.', '', '| 규칙 | 수치 | 근거 | 들어온 날 |', '|---|---|---|---|');
  for (const r of single) out.push(`| **${r.id}** ${esc(r.rule)} | ${esc(r.value)} | ${r.evidence.map(esc).join('<br>')} | ${sinceCell(r)} |`);
  const rev = rules.filter(r => r.status === 'reverted');
  if (rev.length) { out.push('', '## 되돌린 규칙', '', '| 규칙 | 왜 | 들어온 날 |', '|---|---|---|'); for (const r of rev) out.push(`| **${r.id}** ${esc(r.rule)} | ${r.evidence.map(esc).join('<br>')} | ${sinceCell(r)} |`); }
  return out.join('\n') + '\n';
}

function main() {
  const doc = loadRules();
  const errs = validate(doc);
  if (errs.length) { console.error('규칙 장부 오류 ' + errs.length + '건'); for (const e of errs) console.error(' - ' + e); process.exit(1); }
  const c = counts(doc.rules);
  console.log(`규칙 ${c.total}건 · 근거 1건 ${c.single} · 되돌림 ${c.reverted}`);
  for (const [k, v] of Object.entries(c.by)) console.log(`  ${k.padEnd(10, ' ')} ${v}`);
  if (process.argv.includes('--md')) {
    const md = readFileSync(MD_PATH, 'utf8');
    const i = md.indexOf(MARK);
    if (i < 0) { console.error(`${MD_PATH} 에 표 시작 표시가 없다`); process.exit(1); }
    writeFileSync(MD_PATH, md.slice(0, i + MARK.length) + '\n\n' + renderTables(doc.rules));
    console.log(`표 갱신: history/규칙장부.md`);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
