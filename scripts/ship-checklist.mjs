#!/usr/bin/env node
// 출고 체크리스트 — 등급 A 규격(11월 100% 대체 대상)마다 「규정 항목 × 값 × 자동검사 코드(core/lint.js) × 근거 × 상태」 한 표.
//   규정은 바꾸지 않는다. 값이 없으면 「확인 필요」로 남겨 컨시어지·매체에 물을 목록이 되게 한다.
//   node scripts/ship-checklist.mjs            → docs/ship-checklist.md
//   import { shipRows } from './ship-checklist.mjs'  (테스트)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA_DIR = path.join(ROOT, 'core/media');
const EX = JSON.parse(readFileSync(path.join(MEDIA_DIR, '_extract.json'), 'utf8'));
const ONLY = (process.env.SHIP_MEDIA ?? 'jasoseol,remember').split(',');

const submit = s => { const k = s.exportScale ?? 1; return { w: s.submitW ?? s.exportW ?? (s.w != null ? s.w * k : null), h: s.submitH ?? s.exportH ?? (s.h != null ? s.h * k : null) }; };
const srcOf = (s, m) => s.source ?? m.sources?.[0] ?? null;

export function shipRows() {
  const rows = [];
  for (const mid of ONLY) {
    const m = JSON.parse(readFileSync(path.join(MEDIA_DIR, mid + '.json'), 'utf8'));
    for (const s of m.specs) {
      if (!EX.extract.includes(s.id) || EX.grades?.[s.id] !== 'A') continue;
      const row = (item, value, check, source, status = value == null ? '확인 필요' : '확정') => rows.push({ medium: m.name, spec: s.id, name: s.name, item, value: value ?? '—', check, source: source ?? '', status });
      if (s.asset) {
        row('전달물 최소 폭', s.asset.minW != null ? `${s.asset.minW}px` : null, 'asset-min', s.asset.source ?? s.logo?.source ?? srcOf(s, m));
        row('포맷', (s.format ?? []).join('/') || null, 'format', s.asset.source ?? srcOf(s, m));
        row('내용 대조(공고 원문)', '필수', '수동', 'rejections: 도화엔지니어링 모집대상 미수정 반려(2026-09-10)');
        continue;
      }
      const sz = submit(s);
      row('제출 치수', sz.w ? `${sz.w}×${sz.h}px (캔버스 ${s.w}×${s.h} × ${s.exportScale ?? 1})` : null, 'size', srcOf(s, m));
      row('포맷', (s.format ?? []).join('/') || null, 'format', srcOf(s, m));
      row('용량', s.maxKB != null ? `≤ ${s.maxKB}KB` : null, s.maxKB != null ? 'weight' : '수동', s.maxKB != null ? (m.common?.find(c => /KB/.test(c.rule))?.source ?? srcOf(s, m)) : null);
      row('글자수', (s.textLimits ?? []).map(t => t.maxChars == null ? `${t.field} 글자수 없음(형식 ~M/D)` : `${t.field} ${t.maxChars}자×${t.lines ?? 1}줄`).join(' · ') || null, 'chars,lines,overflow', s.textLimitsSource ?? srcOf(s, m), (s.textLimits ?? []).some(t => t.maxChars == null) ? '확정(마감일 글자수 없음)' : (s.textLimits ?? []).length ? '확정' : '확인 필요');
      row('글자수 세는 법', m.textCounting ?? 'all-1', 'chars', m.textCountingSource ?? srcOf(s, m), m.textCounting ? '확정' : '확정(기본값)');
      row('글자색', m.textColors?.uniform ? '모든 문구 한 색' + (s.textColors?.freeRoles ? ` (예외 ${s.textColors.freeRoles.join(',')})` : '') : (s.textColors?.main || m.textColors?.main) ? `검정 #000000 또는 흰색 #FFFFFF 택1 — lint 는 메인 ${s.textColors?.main ?? m.textColors?.main}·서브 ${(s.textColors?.sub ?? m.textColors?.sub ?? []).join('/')} 로 검사` : null, m.textColors?.uniform ? 'text-colors-uniform' : 'color', m.textColors?.source);
      row('폰트', m.fonts?.required ?? null, 'font', m.fonts?.source, m.fonts?.required ? '확정(경고)' : '확인 필요');
      row('로고', s.logo ? (s.logo.count === 0 ? '삽입 불가' : `${s.logo.count}개(최대 ${m.logoMaxCount ?? s.logo.count})${s.logo.w ? ` · 칸 ${s.logo.w}×${s.logo.h}` : ''}`) : null, s.logo?.count === 0 ? 'logo-forbidden' : 'logo-count', s.logo?.source ?? srcOf(s, m));
      row('배경', m.backgroundColors?.banned ? `금지색 ${m.backgroundColors.banned.join(' ')}` : (s.background ? String(s.background).slice(0, 60) + '…' : null), m.backgroundColors?.banned ? 'bg-banned' : '수동', m.backgroundColors?.source ?? srcOf(s, m), m.backgroundColors?.banned ? '확정' : (s.background ? '확정(수동)' : '확인 필요'));
      row('투명 배경', /투명/.test(String(s.background ?? '')) ? String(s.background).match(/투명[^.,·]*/)?.[0] : '규정 없음', /투명/.test(String(s.background ?? '')) ? 'transparent' : '수동', srcOf(s, m), '확정');
      row('내용 대조(공고 원문·날짜·요일)', '필수', '수동', (m.rejections ?? []).map(r => `${r.client} ${r.reason}`).join(' / ') || '반려 사례 없음');
    }
  }
  return rows;
}

const cell = v => String(v ?? '').replace(/\|/g, '｜').replace(/\s*\n\s*/g, ' ');

export function shipMarkdown(rows = shipRows()) {
  const by = {}; for (const r of rows) (by[r.spec] ??= []).push(r);
  const out = [`# 출고 체크리스트 — 등급 A(자소설닷컴·리멤버) ${Object.keys(by).length}규격\n`, `> 생성: \`node scripts/ship-checklist.mjs\` · 데이터 \`core/media/*.json\` · 자동검사 코드 = \`core/lint.js\` issue code. 「수동」은 승인 전 사람이 보는 항목. 「확인 필요」는 자료에 값이 없어 매체·컨시어지에 물을 것.\n`];
  const todo = rows.filter(r => r.status === '확인 필요');
  out.push(`## 물을 것 (${todo.length})\n`, ...todo.map(r => `- ${r.spec} · ${r.item}`), '');
  for (const [id, rs] of Object.entries(by)) {
    out.push(`## ${cell(rs[0].medium)} · ${cell(rs[0].name)} \`${id}\`\n`, '| 항목 | 값 | 자동검사 | 상태 | 근거 |', '|---|---|---|---|---|', ...rs.map(r => `| ${cell(r.item)} | ${cell(r.value)} | ${r.check === '수동' ? '수동' : '`' + r.check + '`'} | ${cell(r.status)} | ${cell(String(r.source).slice(0, 90))} |`), '');
  }
  return out.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = shipRows(); const md = shipMarkdown(rows); const outPath = path.join(ROOT, 'docs/ship-checklist.md'); writeFileSync(outPath, md);
  console.log(`${outPath} — 규격 ${new Set(rows.map(r => r.spec)).size} · 행 ${rows.length} · 확인 필요 ${rows.filter(r => r.status === '확인 필요').length}`);
}
