#!/usr/bin/env node
// svg-page.mjs 로 올린 SVG 의 글자에 의도한 폰트를 다시 입히는 use_figma 코드를 만든다.
//   Figma 는 SVG 를 들여올 때 기기에 없는 폰트는 Inter 로, 600→Bold·자간 0 으로 읽는다(10-14 figma-frames-build 와 같은 문제).
//   node scripts/figma/svg-page-fonts.mjs [--case t1014-abl]  → <out>/fontplan.json + <out>/_code/fonts.use_figma.js (Claude 가 use_figma 에 그대로 붙여 넣는다)
//   Figma 에 그 폰트가 없으면(listAvailableFontsAsync) 건너뛰고 missing 으로 보고 — 카카오 큰글씨는 맥에 설치돼 있어도 Figma 데스크톱을 다시 켜야 보인다(10-16).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const argv = process.argv.slice(2); const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const CASE = opt('--case', 't1014-abl'); const D = path.join(ROOT, 'ref/learned/cases/_out/figma-svg', CASE);
const up = JSON.parse(readFileSync(path.join(D, 'uploaded.json'), 'utf8'));
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const plan = {};
for (const u of up) {
  if (!u.nodeId) continue;
  const svg = readFileSync(u.file, 'utf8');
  const attrs = a => Object.fromEntries([...a.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
  const texts = [];
  for (const tm of svg.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)) {
    const ta = attrs(tm[1]); const fam = (ta['font-family'] ?? '').split(',')[0].trim();
    const spans = [...tm[2].matchAll(/<tspan([^>]*)>([\s\S]*?)<\/tspan>/g)];
    const parts = spans.length ? spans.map(sm => ({ ...ta, ...attrs(sm[1]), c: unesc(sm[2].replace(/<[^>]+>/g, '')) })) : [{ ...ta, c: unesc(tm[2].replace(/<[^>]+>/g, '')) }];
    for (const p of parts) { if (!p.c.trim()) continue; texts.push({ c: p.c.trim(), fam, w: +p['font-weight'] || 400, ls: p['letter-spacing'] ? +p['letter-spacing'] : 0 }); }
  }
  if (texts.length) plan[u.nodeId] = { texts };
}
writeFileSync(path.join(D, 'fontplan.json'), JSON.stringify(plan));
const code = `const page = await figma.getNodeByIdAsync('${opt('--page', '133:44')}'); await figma.setCurrentPageAsync(page);
const plan = ${JSON.stringify(plan)};
const PRE = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const KAKAO = w => w >= 800 ? 'ExtraBold' : w >= 600 ? 'Bold' : 'Regular';
const styleOf = (fam, w) => fam === 'Pretendard' ? PRE[Math.round(w / 100) * 100] ?? 'Regular' : KAKAO(w);
const avail = await figma.listAvailableFontsAsync(); const has = (fam, st) => avail.some(f => f.fontName.family === fam && f.fontName.style === st);
const loaded = new Set(), missing = new Set();
async function font(fam, st) { const k = fam + '/' + st; if (missing.has(k)) return null; if (!has(fam, st)) { missing.add(k); return null; } if (!loaded.has(k)) { try { await figma.loadFontAsync({ family: fam, style: st }); loaded.add(k); } catch { missing.add(k); return null; } } return { family: fam, style: st }; }
const norm = s => s.replace(/\\s+/g, ' ').trim(); let done = 0, skipped = 0; const unmatched = [], touched = [];
for (const [id, p] of Object.entries(plan)) { const n = await figma.getNodeByIdAsync(id); if (!n) continue;
  for (const t of n.findAll(x => x.type === 'TEXT')) { const ch = norm(t.characters); const e = p.texts.find(x => norm(x.c) === ch) ?? p.texts.find(x => ch.startsWith(norm(x.c)) || norm(x.c).startsWith(ch)); if (!e) { unmatched.push(id + ':' + ch.slice(0, 12)); continue; }
    const fn = await font(e.fam, styleOf(e.fam, e.w)); if (!fn) { skipped++; continue; }
    if (t.fontName.family === fn.family && t.fontName.style === fn.style) continue;
    try { await figma.loadFontAsync(t.fontName); } catch {} t.fontName = fn; t.letterSpacing = { unit: 'PIXELS', value: e.ls || 0 }; done++; touched.push(t.id); } }
return { done, skipped, missing: [...missing], unmatched: unmatched.slice(0, 20), mutatedNodeIds: touched.length };`;
mkdirSync(path.join(D, '_code'), { recursive: true }); writeFileSync(path.join(D, '_code', 'fonts.use_figma.js'), code);
console.log(`글자 ${Object.values(plan).reduce((a, p) => a + p.texts.length, 0)} · 노드 ${Object.keys(plan).length} → ${path.join(D, '_code/fonts.use_figma.js')} (${code.length}자)`);
