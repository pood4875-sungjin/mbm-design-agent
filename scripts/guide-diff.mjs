// 트래커가 모은 공식 가이드 규격과 앱 매체 데이터를 비교한다. 감지·제안까지만, 자동 반영 금지(ref/learned/media-watch.json).
//   npm run guide-diff   → 터미널 요약 + out/guide-diff.md
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COLLECTOR = join(ROOT, 'tools/guide-collector');

// 트래커 소스 → 앱 매체. null = 앱에 없는 매체라 비교 안 함
export const SOURCE_TO_MEDIUM = {
  jasoseol: 'jasoseol',
  remember: 'remember', 'remember-ads': 'remember',
  jobda: 'jobda',
  catch: 'catch', 'catch-faq': 'catch',
  'meta-ig-feed': 'instagram', 'meta-ig-story': 'instagram',
  'google-display': 'google-gdn', 'google-responsive': 'google-gdn',
  'kakao-moment': 'kakao', 'kakao-dsp': 'kakao',
  'naver-gfa': 'naver-gfa', 'naver-gfa-ampm': 'naver-gfa',
  'nap-dsp': 'nap-dsp', 'nap-platform': 'nap-dsp',
  everytime: 'everytime', 'everytime-ampm': 'everytime',
  'blind-kr': 'blind', 'blind-notion': 'blind', 'blind-kit': 'blind', 'blind-spec-ampm': 'blind',
  daangn: 'daangn',
  'linkedin-image': null, ninehire: null, greeting: null, saramin: null, wanted: null,
};

const OLD_VALUE = /변경\s*전|이전\s*(규격|사이즈|가이드)|기존\s*(규격|사이즈)/;

export function parseSize(value) {
  const m = /(\d{2,5})\s*[x×*]\s*(\d{2,5})/i.exec(String(value));
  return m ? `${+m[1]}×${+m[2]}` : null;
}

export function parseKB(value) {
  const m = /([\d.]+)\s*(KB|MB)/i.exec(String(value));
  if (!m) return null;
  return Math.round(+m[1] * (/mb/i.test(m[2]) ? 1024 : 1));
}

function appSizes(medium) {
  const sizes = new Set();
  for (const s of medium.specs || []) {
    if (!s.w || !s.h) continue;
    sizes.add(`${s.w}×${s.h}`);
    if (s.exportScale > 1) sizes.add(`${s.w * s.exportScale}×${s.h * s.exportScale}`);
  }
  return sizes;
}

function appKBs(medium) {
  return new Set((medium.specs || []).map(s => s.maxKB).filter(Boolean));
}

// 매체 하나 비교. 공식 출처에만 있는 값이 「확인 필요」, 대행사 정리(2차)는 참고로 나눈다.
export function compareMedium(medium, specs) {
  const app = appSizes(medium);
  const kbs = appKBs(medium);
  const seen = new Set();
  const sizes = new Map();
  const files = new Map();
  for (const sp of specs) {
    if (OLD_VALUE.test(sp.context || '')) continue;
    if (sp.kind === 'size') {
      const v = parseSize(sp.value);
      if (!v) continue;
      seen.add(v);
      if (!app.has(v) && (!sizes.has(v) || sp.official)) sizes.set(v, sp);
    } else if (sp.kind === 'filesize') {
      const v = parseKB(sp.value);
      if (v && kbs.size && !kbs.has(v) && (!files.has(v) || sp.official)) files.set(v, sp);
    }
  }
  const row = (v, sp) => ({ value: v, official: !!sp.official, source: sp.source, doc: sp.doc, url: sp.url, context: sp.context });
  return {
    id: medium.id,
    name: medium.name,
    trackerOnly: [...sizes].map(([v, sp]) => row(v, sp)),
    fileSizes: [...files].map(([v, sp]) => row(`${v}KB`, sp)),
    appOnly: [...app].filter(v => !seen.has(v)),
    sourceCount: new Set(specs.map(s => s.source)).size,
  };
}

function readSpecs() {
  const dir = mkdtempSync(join(tmpdir(), 'guide-diff-'));
  try {
    const out = join(dir, 'specs.json');
    execFileSync('node', ['cli.js', 'specs', '--json', out], { cwd: COLLECTOR, stdio: 'pipe' });
    return JSON.parse(readFileSync(out, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function toMarkdown(results, broken) {
  const cell = v => String(v ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 70);
  const lines = ['# 트래커 ↔ 앱 규격 비교', '', '값이 다르다고 앱이 틀린 건 아니다. 다른 광고 상품 규격일 수 있어 사람이 원문을 보고 판단한다.', ''];
  if (broken.length) lines.push(`수집 이상 소스: ${broken.join(', ')}`, '');
  for (const r of results) {
    lines.push(`## ${r.name} (\`${r.id}\`)`, '');
    if (!r.sourceCount) { lines.push('수집된 규격 없음. 비교 못 함.', ''); continue; }
    if (r.trackerOnly.length + r.fileSizes.length) {
      lines.push('| 트래커 값 | 출처 | 문맥 | 원문 |', '|---|---|---|---|');
      for (const x of [...r.trackerOnly, ...r.fileSizes]) {
        lines.push(`| ${x.value} | ${x.official ? '공식' : '2차'} ${x.source} | ${cell(x.context)} | [보기](${x.url}) |`);
      }
      lines.push('');
    } else lines.push('가이드에만 있는 값 없음.', '');
    if (r.appOnly.length) lines.push(`앱에만 있음: ${r.appOnly.join(', ')}`, '');
  }
  return lines.join('\n');
}

function main() {
  const specs = readSpecs();
  const bySource = new Map();
  for (const s of specs) bySource.set(s.source, [...(bySource.get(s.source) || []), s]);
  const ids = [...new Set(Object.values(SOURCE_TO_MEDIUM).filter(Boolean))];
  const results = ids.map(id => {
    const medium = JSON.parse(readFileSync(join(ROOT, 'core/media', `${id}.json`), 'utf8'));
    const sources = Object.entries(SOURCE_TO_MEDIUM).filter(([, m]) => m === id).map(([s]) => s);
    return compareMedium(medium, sources.flatMap(s => bySource.get(s) || []));
  });
  const broken = [...new Set(specs.filter(s => !['ok', 'manual'].includes(s.status)).map(s => s.source))];
  mkdirSync(join(ROOT, 'out'), { recursive: true });
  writeFileSync(join(ROOT, 'out/guide-diff.md'), toMarkdown(results, broken));
  for (const r of results) {
    const off = r.trackerOnly.filter(x => x.official).length;
    console.log(`${r.name}: 가이드에만 ${r.trackerOnly.length}(공식 ${off}) · 용량 ${r.fileSizes.length} · 앱에만 ${r.appOnly.length}${r.sourceCount ? '' : ' · 수집 규격 없음'}`);
  }
  console.log('→ out/guide-diff.md');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
