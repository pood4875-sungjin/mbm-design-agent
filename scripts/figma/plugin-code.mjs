#!/usr/bin/env node
// scripts/figma/plugin/<이름>.js 의 __ARGS__ 를 JSON 으로 채워 use_figma 의 code 로 넣을 문자열을 찍는다.
//   node scripts/figma/plugin-code.mjs <이름> '<ARGS JSON>'
//   예) node scripts/figma/plugin-code.mjs locate '{"nodeId":"1148:5860"}'
// 이름: locate · page-inventory · frame-boxes · kv-transforms · text-styles · export-node
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'plugin');
const [name, args = '{}'] = process.argv.slice(2);
const names = readdirSync(DIR).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
if (!name || !names.includes(name)) { console.error('사용법: node scripts/figma/plugin-code.mjs <' + names.join('|') + "> '<ARGS JSON>'"); process.exit(1); }
JSON.parse(args);   // 잘못된 JSON 이면 여기서 멈춘다
process.stdout.write(readFileSync(path.join(DIR, name + '.js'), 'utf8').replace('__ARGS__', args));
