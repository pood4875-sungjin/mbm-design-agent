#!/usr/bin/env node
// 입력 자료(키비주얼·로고) 권장 스펙 집계 — 추출 51규격마다 키비주얼 칸·로고 칸이 실제로 몇 px 로 그려지는지(틀 칸 × 내보내기 배율) 모아
// 「이 정도는 올려야 흐리지 않다」를 숫자로 만든다. 10-19 사용자: 「키비주얼과 로고 몇 사이즈로 어떤 스펙을 넣어야 잘 나오는지 확인 + 첨부할 때 안내」.
//   node scripts/input-spec.mjs  → docs/input-spec.md + core/input-spec.json + core/input-spec.js(앱 안내·검사가 읽는 숫자, core/inputcheck.js)
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { adSpecEntries } = await core('adspecs.js'); const { registerAll } = await core('generate.js'); const { renderArtifact } = await core('contract.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js');
registerAll();
const E = adSpecEntries();
const X = JSON.parse(readFileSync(path.join(ROOT, 'core/media/_extract.json'), 'utf8'));
const IDS = X.extract;
const nameOf = {}; for (const m of new Set(IDS.map(i => E[i]?.medium).filter(Boolean))) nameOf[m] = JSON.parse(readFileSync(path.join(ROOT, 'core/media', m + '.json'), 'utf8')).name ?? m;
// 자유 배치 규격의 칸은 누끼 케이스 렌더 트레이스(place.tImage · logo.tplRect/box)에서 읽는다
const CASES = path.join(ROOT, 'ref/learned/cases'); const L = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const c = L.cases.find(x => x.id === 't1014-abl'); const dir = path.join(CASES, c.id);
const du = f => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
const style = normalizeStyle({ colors: [c.primary], keyVisual: du(path.join(dir, c.kv)), kvMeta: JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')), logo: du(path.join(dir, c.logo)), logoMeta: { tone: 'dark' } });
const ctx = createContext(c.fields, 'recruit');
const unesc = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const rows = [];
for (const id of IDS) {
  const sp = E[id]; if (!sp) continue;
  const scale = sp.exportScale ?? (sp.submitW && sp.w ? sp.submitW / sp.w : 1);
  const out = { id, medium: sp.medium, name: sp.rules?.name ?? sp.title ?? id, w: sp.w, h: sp.h, scale, outW: Math.round(sp.w * scale), outH: Math.round(sp.h * scale), kind: sp.channel === 'asset' ? 'asset' : (sp.rules?.visualOnly ? 'visualOnly' : 'ad') };
  if (sp.channel === 'asset') { out.asset = sp.asset ?? sp.rules?.asset ?? null; rows.push(out); continue; }
  const mold = sp.rules?.safeArea?.measuredFromTemplate?.mold ?? null;
  let kv = null, logo = null, logoOnly = false, transparent = false;
  try {
    const html = renderArtifact(id, ctx, style, {}); const m = html.match(/data-trace="([^"]*)"/); const tr = m ? JSON.parse(unesc(m[1])) : null;
    logoOnly = /data-logo-only="1"/.test(html); transparent = /data-transparent="1"/.test(html);
    if (tr) { kv = tr.place?.tImage ?? null; logo = tr.logo?.tplRect ?? tr.logo?.box ?? null;
      if (!logo) { const lm = html.match(/data-logo-slot="1"[^>]*width:(\d+)px;height:(\d+)px/); if (lm) logo = { w: +lm[1], h: +lm[2] }; }
      if (!logo) { const li = html.match(/data-logo="1"[^>]*height:(\d+)px/); if (li) logo = { w: null, h: +li[1] }; }
      if (!kv && logoOnly) { const lo = html.match(/data-logo="1"[^>]*height:(\d+)px;max-width:(\d+)px/); if (lo) logo = { w: +lo[2], h: +lo[1] }; }
    }
  } catch (e) { out.err = String(e.message).slice(0, 80); }
  if (mold?.image && !kv) kv = mold.image;
  out.kv = kv ? { w: Math.round(kv.w * scale), h: Math.round(kv.h * scale) } : null;
  out.logo = logo ? { w: logo.w != null ? Math.round(logo.w * scale) : null, h: logo.h != null ? Math.round(logo.h * scale) : null } : null;
  out.logoOnly = logoOnly; out.transparent = transparent; out.kvMode = mold?.kv === 'slot' ? '칸 고정' : (out.kind === 'visualOnly' ? '비주얼만' : '자유 배치');
  rows.push(out);
}
const kvMax = rows.filter(r => r.kv).reduce((a, r) => ({ w: Math.max(a.w, r.kv.w), h: Math.max(a.h, r.kv.h), id: r.kv.w * r.kv.h > a.area ? r.id : a.id, area: Math.max(a.area, r.kv.w * r.kv.h) }), { w: 0, h: 0, area: 0, id: '' });
const logoMax = rows.filter(r => r.logo?.w).reduce((a, r) => (r.logo.w > a.w ? { w: r.logo.w, h: r.logo.h, id: r.id } : a), { w: 0, h: 0, id: '' });
const logoHMax = rows.filter(r => r.logo?.h).reduce((a, r) => (r.logo.h > a.h ? { w: r.logo.w, h: r.logo.h, id: r.id } : a), { w: 0, h: 0, id: '' });
const assetMin = rows.filter(r => r.kind === 'asset').map(r => ({ id: r.id, item: r.asset?.item, minW: r.asset?.minW }));
const summary = { generatedAt: new Date().toISOString().slice(0, 10), kvMax, logoMax, logoHMax, assetMin,
  // 권장: 가장 큰 칸의 1.5배(cover 로 잘라 쓰는 사진·2배 추출 규격 여유) — 올림
  recommend: { kvLongEdge: Math.ceil(Math.max(kvMax.w, kvMax.h) * 1.5 / 100) * 100, kvMinLongEdge: Math.ceil(Math.max(kvMax.w, kvMax.h) / 100) * 100, logoW: Math.ceil(Math.max(logoMax.w, ...assetMin.filter(a => a.item === '로고').map(a => a.minW ?? 0)) * 1.5 / 100) * 100, logoMinW: Math.max(logoMax.w, ...assetMin.filter(a => a.item === '로고').map(a => a.minW ?? 0)), kvFileMinW: Math.max(...assetMin.filter(a => a.item === '이미지').map(a => a.minW ?? 0)) } };
const specOut = { summary, rows: rows.map(r => ({ id: r.id, medium: r.medium, outW: r.outW, outH: r.outH, kv: r.kv, logo: r.logo, kind: r.kind, kvMode: r.kvMode })) };
writeFileSync(path.join(ROOT, 'core/input-spec.json'), JSON.stringify(specOut, null, 1));
writeFileSync(path.join(ROOT, 'core/input-spec.js'), `// 생성 파일 — 직접 고치지 말 것. 원본: scripts/input-spec.mjs (추출 51규격의 키비주얼·로고 칸 px 집계, ${summary.generatedAt})\nexport const INPUT_SPEC = ${JSON.stringify(specOut)};\n`);
const md = [`# 입력 자료 권장 스펙 — 키비주얼·로고 (생성 ${summary.generatedAt}, \`node scripts/input-spec.mjs\`)`, '',
  `추출 51규격을 ABL 누끼 케이스로 렌더해 **키비주얼 칸·로고 칸이 몇 px 로 그려지는지**(틀 칸 또는 자유 배치 결과 × 내보내기 배율)를 모았다. 숫자는 핸드오프 시점 코드 기준이며 다시 돌리면 갱신된다.`, '',
  `## 결론`, '',
  `| 자료 | 가장 크게 쓰이는 곳 | 최소 | 권장 |`, `|---|---|---|---|`,
  `| 키비주얼 | ${kvMax.id} 칸 ${kvMax.w}×${kvMax.h}px | 긴 변 ${summary.recommend.kvMinLongEdge}px | **긴 변 ${summary.recommend.kvLongEdge}px 이상** (사진은 cover 로 잘려 쓰이고 2배 추출 규격이 있어 여유) · 자소설 M시작배너 이미지 파일은 가로 ${summary.recommend.kvFileMinW}px 이상 |`,
  `| 로고 | ${logoMax.id} 칸 가로 ${logoMax.w}px (세로 최대 ${logoHMax.h}px ${logoHMax.id}) | 가로 ${summary.recommend.logoMinW}px | **가로 ${summary.recommend.logoW}px 이상 투명 PNG(또는 SVG)** · 자소설 M시작배너 로고 파일 규정 가로 500px 이상 |`, '',
  `- 키비주얼 형식: **누끼(배경 투명 PNG) 권장** — 틀 칸 고정 규격(네이버 DA·블라인드·인스타·NAP·구글·잡다 MO)은 칸에 contain 바닥 맞춤이라 누끼가 깔끔. 사진(JPG)도 되지만 칸을 cover 로 잘라 쓰고 글자 쪽을 녹인다. 캐치 중앙배너 PC 515×315 는 투명 누끼만.`,
  `- 로고 형식: 원색 투명 PNG. 흰 바탕 JPG 는 지면 색 위에 흰 상자로 뜬다. 어두운 지면에선 자동으로 흰 단색 로고로 바꾸므로 원색 1장이면 된다. 블라인드 96×96·캐치 160·에브리타임 120/160 프로필은 정사각 칸이라 가로로 긴 워드마크는 작게 들어간다 — 심볼 있는 로고면 심볼판도 같이 주면 좋다.`,
  `- 용량: 매체 상한(구글 150KB·네이버 300KB 등)은 내보낼 때 앱이 맞추므로 원본은 커도 된다.`, '',
  `## 규격별 칸 크기 (내보내기 px)`, '',
  `| 매체 | 규격 | 출력 | 키비주얼 칸 | 로고 칸 | 방식 |`, `|---|---|---|---|---|---|`,
  ...rows.map(r => `| ${nameOf[r.medium] ?? r.medium} | ${r.name} | ${r.outW}×${r.outH}${r.scale !== 1 ? ` (${r.scale}배)` : ''} | ${r.kind === 'asset' ? `파일 그대로 — ${r.asset?.item} 가로 ${r.asset?.minW}px↑` : r.kv ? `${r.kv.w}×${r.kv.h}` : (r.logoOnly ? '— (로고만)' : '—')} | ${r.logo ? `${r.logo.w ?? '?'}×${r.logo.h ?? '?'}` : '—'} | ${r.kind === 'asset' ? '전달물' : r.logoOnly ? '로고만' : r.kvMode} |`)];
writeFileSync(path.join(ROOT, 'docs/input-spec.md'), md.join('\n') + '\n');
console.log(JSON.stringify(summary, null, 1));
