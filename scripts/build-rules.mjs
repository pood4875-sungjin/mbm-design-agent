#!/usr/bin/env node
// 규칙 장부(ref/learned/rules.json) → 앱이 읽는 작은 모듈(core/rules-data.js). 생성 파일은 손으로 고치지 않는다 — 장부를 고치고 다시 돌린다.
//   node scripts/build-rules.mjs
// 가이드 검수(core/guidecheck.js RULES_JSON_MAP)가 짝지은 장부 항목만, 문장·값·위치·상태만 담는다(브라우저가 70KB 장부 전체를 받지 않게)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RULES_JSON_MAP } from '../core/guidecheck.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = path.join(ROOT, 'ref/learned/rules.json');
const out = path.join(ROOT, 'core/rules-data.js');
const json = JSON.parse(readFileSync(src, 'utf8'));
const list = Array.isArray(json) ? json : json.rules ?? [];
const want = new Set(Object.values(RULES_JSON_MAP).flat());
const rules = list.filter(r => r?.id && want.has(r.id)).map(r => ({ id: r.id, rule: r.rule ?? null, value: r.value ?? null, where: r.where ?? null, status: r.status ?? 'active' }));
const missing = [...want].filter(id => !rules.some(r => r.id === id));
const body = `// 생성 파일 — 직접 고치지 말 것. 원본: ref/learned/rules.json, 빌드: node scripts/build-rules.mjs
// 장부 갱신 ${json.updated ?? '—'} · 가이드 검수 짝 ${rules.length}건${missing.length ? ` · 장부에 없는 짝 ${missing.length}(${missing.join(', ')})` : ''}
export const RULES_DATA = ${JSON.stringify({ updated: json.updated ?? null, rules }, null, 1)};
`;
writeFileSync(out, body);
console.log(`core/rules-data.js ← rules.json ${list.length}건 중 ${rules.length}건${missing.length ? ` · 없는 짝 ${missing.length}: ${missing.join(', ')}` : ''}`);
