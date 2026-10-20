#!/usr/bin/env node
// 레이아웃 안 선택 집계(10-20 2단계): 어떤 규격에서 어떤 안이 자주 선택되나 → 다음 기본안·템플릿 후보의 근거(현황 보고 「디자인 케이스 수집 → 템플릿 추가」)
//   node scripts/variant-stats.mjs [campaigns.json]  → docs/variant-stats.md   (입력 = 앱 「캠페인 JSON 내보내기」 파일 = localStorage mbm-campaigns)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function variantStats(campaigns) {
  const bySpec = {}, campaignWide = {}; let total = 0;
  for (const c of campaigns) for (const e of c?.log ?? []) {
    if (e.type !== 'variant_selected') continue; total++;
    const m = e.meta ?? {};
    const label = m.label ?? '(라벨 없음)', specId = m.specId ?? '(규격 없음)';   // 구버전·손편집 로그 방어 — 'undefined' 행이 생기지 않게
    if (m.all) { campaignWide[label] = (campaignWide[label] ?? 0) + 1; continue; }
    (bySpec[specId] ??= {})[label] = (bySpec[specId][label] ?? 0) + 1;
  }
  return { bySpec, campaignWide, total };
}
export function statsMarkdown(s) {
  const out = ['# 레이아웃 안 선택 집계\n', `> 선택 ${s.total}건 · 생성: \`node scripts/variant-stats.mjs [campaigns.json]\` · 입력은 앱 「캠페인 JSON 내보내기」`, ''];
  for (const [spec, m] of Object.entries(s.bySpec)) { const n = Object.values(m).reduce((a, b) => a + b, 0); const base = m['기본안'] ?? 0; out.push(`## ${spec} — ${n}건 · 기본안 외 ${Math.round((1 - base / n) * 100)}%`, '| 안 | 횟수 |', '|---|---|', ...Object.entries(m).sort((a, b) => b[1] - a[1]).map(([l, k]) => `| ${l} | ${k} |`), ''); }
  if (Object.keys(s.campaignWide).length) out.push('## 캠페인 일괄', '| 안 | 횟수 |', '|---|---|', ...Object.entries(s.campaignWide).map(([l, k]) => `| ${l} | ${k} |`), '');
  if (!s.total) out.push('_아직 선택 기록이 없다 — 앱에서 레이아웃 안을 고르면 로그(variant_selected)가 쌓인다._', '');
  return out.join('\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const src = process.argv[2] ?? path.join(ROOT, 'ref/learned/cases/_out/campaigns.json');
  const campaigns = existsSync(src) ? JSON.parse(readFileSync(src, 'utf8')) : [];
  const s = variantStats(Array.isArray(campaigns) ? campaigns : []); writeFileSync(path.join(ROOT, 'docs/variant-stats.md'), statsMarkdown(s)); console.log(`docs/variant-stats.md — 선택 ${s.total}건 · 규격 ${Object.keys(s.bySpec).length}`);
}
