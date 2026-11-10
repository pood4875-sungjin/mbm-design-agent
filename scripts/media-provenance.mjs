#!/usr/bin/env node
// 매체별 규칙 출처 구분 — 규격마다 값이 어디서 왔나: ① 규정(공식 가이드·제작 규정) ② 디자이너·예시 샘플을 실측한 틀(mold) ③ 우리 기본(틀 없음 → 공통 레이아웃·canon).
//   node scripts/media-provenance.mjs          매체별 요약 표(마크다운)
//   node scripts/media-provenance.mjs --specs  규격별 한 줄
// 읽는 곳: core/media/*.json — source(자료) · confidence · safeArea.measuredFromTemplate.mold(틀) · mold.slotOfficial(공식 그림 칸) · visualOnly.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../core/media');
const kindsOf = src => {
  const s = String(src ?? '');
  return [
    /pdf:/.test(s) && 'PDF 가이드',
    /공식|https?:\/\//.test(s) && '공식 웹 가이드',
    /figma:[^/]*01\(|규정\)/.test(s) && '피그마 01 제작 규정',
    /figma:[^/]*0[2-9]\(|제작가이드&예시/.test(s) && '피그마 02 예시',
    /psd:|ai:/.test(s) && 'PSD·AI 템플릿',
    /png:/.test(s) && '캡처',
  ].filter(Boolean);
};
const rows = [];
for (const f of readdirSync(DIR).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort()) {
  const j = JSON.parse(readFileSync(resolve(DIR, f), 'utf8'));
  for (const s of j.specs ?? []) {
    const m = s.safeArea?.measuredFromTemplate?.mold;
    rows.push({ media: f.replace('.json', ''), id: s.id, w: s.w, h: s.h, conf: s.confidence ?? '-', kinds: kindsOf(s.source), mold: !!m, official: !!m?.slotOfficial, bgRule: !!m?.bgRule, visualOnly: !!(s.visualOnly || s.rules?.visualOnly) });
  }
}
if (process.argv.includes('--specs')) {
  console.log('| 매체 | 규격 | 크기 | 규정 자료 | 확정도 | 값의 출처 |\n|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.media} | ${r.id} | ${r.w}×${r.h} | ${r.kinds.join(' · ') || '-'} | ${r.conf} | ${r.visualOnly ? '규정(비주얼만)' : r.mold ? `샘플 틀${r.official ? '(공식 그림 칸)' : ''}${r.bgRule ? ' + bgRule' : ''}` : '우리 기본'} |`);
} else {
  const by = {};
  for (const r of rows) (by[r.media] ??= []).push(r);
  console.log('| 매체 | 규격 | 규정 자료(공식) | 확인필요 | 샘플 틀(mold) | 그 중 공식 칸 | 비주얼만 | 우리 기본(틀 없음) |\n|---|---|---|---|---|---|---|---|');
  for (const [m, rs] of Object.entries(by)) {
    const kinds = [...new Set(rs.flatMap(r => r.kinds))].join(' · ');
    const n = p => rs.filter(p).length;
    console.log(`| ${m} | ${rs.length} | ${kinds || '-'} | ${n(r => r.conf !== '확정')} | ${n(r => r.mold)} | ${n(r => r.official)} | ${n(r => r.visualOnly)} | ${n(r => !r.mold && !r.visualOnly)} |`);
  }
  const n = p => rows.filter(p).length;
  console.log(`| **합계** | ${rows.length} | | ${n(r => r.conf !== '확정')} | ${n(r => r.mold)} | ${n(r => r.official)} | ${n(r => r.visualOnly)} | ${n(r => !r.mold && !r.visualOnly)} |`);
}
