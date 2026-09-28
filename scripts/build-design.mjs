#!/usr/bin/env node
// core/design/*.json (예시 소재 관찰 기록) → core/design.js (매체별 디자인 프로필)
//
// 기준은 데이터다 — 사람이 정한 취향이 아니라 실제 나간 소재 N장에서 다수인 선택이 프로필이 된다.
// 프로필의 모든 값에는 "몇 장 중 몇 장"이 붙는다. 관찰이 2장 미만인 항목은 프로필에 넣지 않는다(null) —
// 렌더러는 그때 지면 비율로 판단하는 기본 문법으로 돌아간다.
//
//   node scripts/build-design.mjs

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'core', 'design');
const out = join(root, 'core', 'design.js');

// 관찰값 → 다수결. 최소 2장 이상, 그리고 과반이어야 "기준"이라 부른다.
function majority(values, min = 2) {
  const counts = {};
  for (const v of values) if (v != null && v !== '' && v !== 'none' && v !== 'null') counts[v] = (counts[v] ?? 0) + 1;
  const total = values.filter(v => v != null && v !== '').length;
  const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  if (!top || n < min || n * 2 < total) return { value: null, n, total, counts };
  return { value: top, n, total, counts };
}
const isLight = hex => {
  const m = String(hex ?? '').match(/#?([0-9a-f]{6})/i); if (!m) return null;
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.72;
};
const median = arr => { const a = arr.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
const share = (arr, pred) => { const t = arr.filter(x => x != null); const n = t.filter(pred).length; return { n, total: t.length, value: t.length >= 2 ? n / t.length : null }; };

// 예시의 규격 문자열("GDN 300×600")에서 치수를 읽어 지면 형태를 가른다 — 같은 매체라도 가로형과 세로형은 문법이 다르다(GDN 28장)
function shapeOf(e) {
  const m = String(e.spec ?? '').match(/(\d{2,4})\s*[×x*]\s*(\d{2,4})/);
  if (!m) return null;
  const w = Number(m[1]), h = Number(m[2]);
  if (h < 120 || w / h > 3.2) return 'strip';
  if (h / w > 1.6) return 'tall';
  if (w / h >= 1.6) return 'wide';
  return 'box';
}
const dimsOf = e => { const m = String(e.spec ?? '').match(/(\d{2,4})\s*[×x*]\s*(\d{2,4})/); return m ? { w: Number(m[1]), h: Number(m[2]) } : null; };
function layoutProfile(ex) {
  const pick = fn => ex.map(e => { try { return fn(e); } catch { return null; } });
  return {
    examples: ex.length,
    objectSide: majority(pick(e => e.object?.side)),
    objectWidthRatio: median(pick(e => e.object?.widthRatio)),
    textAlign: majority(pick(e => e.text?.align)),
    mainLines: median(pick(e => e.text?.mainLines)),
    // 메인 카피 글자 높이 px = 비율 × 캔버스 높이. 규격이 달라도 절대값이 비슷하다(GDN 24~40px, 28/28)
    mainPx: median(pick(e => { const d = dimsOf(e); return d && e.text?.mainSizeRatio ? Math.round(e.text.mainSizeRatio * d.h) : null; })),
    logoPosition: majority(pick(e => e.logo?.present ? e.logo?.position : null)),
  };
}

const profiles = {};
const files = readdirSync(srcDir).filter(f => f.endsWith('.json')).sort();
for (const f of files) {
  const d = JSON.parse(readFileSync(join(srcDir, f), 'utf8'));
  const all = d.examples ?? [];
  // 카피가 있는 소재와 로고 전용 소재(프로필·썸네일)는 문법이 다르다 — 섞어서 다수결을 내면 둘 다 틀린다
  const isMark = e => !(e.text?.mainLines > 0) || e.object?.type === 'logo-only' && !(e.text?.mainLines > 0);
  const ex = all.filter(e => !isMark(e));
  const marks = all.filter(isMark);
  const pick = fn => ex.map(e => { try { return fn(e); } catch { return null; } });
  const pickM = fn => marks.map(e => { try { return fn(e); } catch { return null; } });
  profiles[d.medium] = {
    examples: ex.length,
    nodeIds: ex.map(e => e.nodeId).filter(Boolean),
    mark: {
      examples: marks.length,
      background: majority(pickM(e => e.background)),
      bgColor: majority(pickM(e => e.bgColor)),
      logoTreatment: majority(pickM(e => e.logo?.treatment)),
      logoSizeRatio: median(pickM(e => e.logo?.sizeRatio)),
      objectType: majority(pickM(e => e.object?.type)),
    },
    background: majority(pick(e => e.background)),
    // 밝은 지면(흰·아이보리·파스텔) 비중 — 자소설처럼 밝은 단색 위 검정 카피가 다수인 매체를 가른다
    bgLight: share(pick(e => e.bgColor), v => isLight(v)),
    objectSide: majority(pick(e => e.object?.side)),
    objectType: majority(pick(e => e.object?.type)),
    objectWidthRatio: median(pick(e => e.object?.widthRatio)),
    textAlign: majority(pick(e => e.text?.align)),
    textBlock: majority(pick(e => e.text?.block)),
    mainLines: median(pick(e => e.text?.mainLines)),
    mainSizeRatio: median(pick(e => e.text?.mainSizeRatio)),
    mainWeight: majority(pick(e => e.text?.mainWeight)),
    subPresent: share(pick(e => e.text?.subPresent), v => v === true),
    datePresent: share(pick(e => e.text?.datePresent), v => v === true),
    logoPresent: share(pick(e => e.logo?.present), v => v === true),
    logoPosition: majority(pick(e => e.logo?.present ? e.logo?.position : null)),
    logoTreatment: majority(pick(e => e.logo?.present ? e.logo?.treatment : null)),
    logoSizeRatio: median(pick(e => e.logo?.present ? e.logo?.sizeRatio : null)),
    badgePresent: share(pick(e => e.badge?.present), v => v === true),
    badgeStyle: majority(pick(e => e.badge?.present ? e.badge?.style : null)),
    cta: majority(pick(e => e.cta)),
    whitespace: majority(pick(e => e.whitespace)),
    mainPx: layoutProfile(ex).mainPx,
    // 서브 문구가 메인 위(아이브로)인가 아래(서브카피)인가 — 예시의 hierarchy 순서에서 읽는다
    subAbove: share(pick(e => { const hh = e.text?.hierarchy; if (!Array.isArray(hh) || !hh.includes('sub') || !hh.includes('main')) return null; return hh.indexOf('sub') < hh.indexOf('main'); }), v => v === true),
    // 지면 형태별 프로필 — 렌더러는 자기 형태의 값을 먼저 보고, 없으면 매체 전체 값을 쓴다
    byShape: Object.fromEntries(['strip', 'wide', 'tall', 'box'].map(sh => [sh, layoutProfile(ex.filter(e => shapeOf(e) === sh))])),
    typical: d.patterns?.typical ?? '',
    rules: d.rules ?? [],
  };
}

const header = `// 생성 파일 — 직접 고치지 말 것. 원본: core/design/*.json, 빌드: node scripts/build-design.mjs
// 매체 ${files.length} · 예시 소재 ${Object.values(profiles).reduce((n, p) => n + p.examples, 0)}장 관찰 (Figma "컨시어지" 보드, 2026-09-28)
// 각 값의 {value,n,total}: 예시 total장 중 n장이 value였다. value=null 이면 기준 없음(관찰 부족·과반 미만) — 렌더러 기본 문법 사용.
`;
writeFileSync(out, `${header}
export const DESIGN = ${JSON.stringify(profiles, null, 2)};

export function designOf(mediumId) { return DESIGN[mediumId] ?? null; }
`);
console.log(`core/design.js ← ${files.length} media`);
for (const [id, p] of Object.entries(profiles)) {
  console.log(`  ${id.padEnd(12)} ${String(p.examples).padStart(2)}장(+로고 ${p.mark.examples})  bg=${p.background.value ?? '-'}  obj=${p.objectSide.value ?? '-'}  align=${p.textAlign.value ?? '-'}  lines=${p.mainLines ?? '-'}  mainPx=${p.mainPx ?? '-'}  shapes=${['strip', 'wide', 'tall', 'box'].map(sh => sh[0] + p.byShape[sh].examples).join('/')}  logo=${p.logoPosition.value ?? '-'}/${p.logoTreatment.value ?? '-'}  badge=${p.badgePresent.value == null ? '-' : Math.round(p.badgePresent.value * 100) + '%'}  cta=${p.cta.value ?? '-'}`);
}
