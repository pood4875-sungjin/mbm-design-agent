#!/usr/bin/env node
// 케이스 한 건의 규격 몇 개를 규격 크기 그대로 PNG로 찍는다(나란히 비교 이미지용, 개발 전용).
//   node scripts/case-shot.mjs <id> <spec,spec,…> <출력폴더> [--legacy-logo]
//   --legacy-logo: 10-09 이전 장부처럼 로고 손질·톤 판정 없이(로고 원본 logo-orig* · 톤 dark) — 「전」 그림을 다시 찍을 때
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js'); const { specOf } = await core('media.js');
registerAll();
const [id, specArg, out] = process.argv.slice(2); const legacy = process.argv.includes('--legacy-logo');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };
const c = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/cases/cases.json'), 'utf8')).cases.find(x => x.id === id);
const dir = path.join(ROOT, 'ref/learned/cases', id); const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
let logoFile = c.logo; if (legacy && c.logo) logoFile = readdirSync(dir).find(f => f.startsWith('logo-orig')) ?? c.logo;
const logo = logoFile ? pathToFileURL(path.join(dir, logoFile)).href : null;
const tone = legacy ? 'dark' : (c.logoMeta?.tone ?? 'dark');
const style = normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo, logoMono: (!legacy && c.logoMono && existsSync(path.join(dir, c.logoMono))) ? pathToFileURL(path.join(dir, c.logoMono)).href : null, logoLight: (!legacy && tone === 'light') ? logo : null, logoTone: tone, logoMeta: legacy ? null : (c.logoMeta ?? null) });
const ctx = createContext(c.fields ?? DEFAULT_FIELDS, 'recruit');
mkdirSync(out, { recursive: true });
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
for (const sid of specArg.split(',')) {
  const sp = specOf(sid); const html = renderArtifact(sid, ctx, style, {});
  const f = path.join(out, `${id}__${sid}.html`);
  writeFileSync(f, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0;background:#fff}</style></head><body>${html}</body></html>`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=6000', `--window-size=${sp.w},${sp.h}`, `--screenshot=${f.replace(/\.html$/, '.png')}`, pathToFileURL(f).href], { stdio: 'ignore' });
}
