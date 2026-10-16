#!/usr/bin/env node
// 추출 규격 규칙표 — 추출 목록(EXTRACT, 49) 규격마다 「실제 추출 규칙」을 한 줄로(10-16 사용자: 「출처 같은 건 빼고 진짜 추출 규칙만 — 크기·추출 크기·용량·폰트·콘텐츠(덩어리·양·위치)·로고·KV 방식(규칙·위치)·배경색(지양 색). 표 높이 길어지지 않게」).
//   값은 매체 JSON(규정 + 틀 mold)·폰트 규정·렌더 트레이스(사진 KV / 누끼 KV)에서만. 추측·새 규칙 없음. 출처 괄호는 지운다.
//   node scripts/spec-inventory.mjs  → docs/spec-inventory.{html,md,json}
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { MEDIA, EXTRACT, specOf } from '../core/media.js';
import { adSpecEntries } from '../core/adspecs.js';
import { fontRuleOf, DEFAULT_FONT, FONTS } from '../core/fonts.js';
import { renderAd } from '../core/renderers/ad.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
const mediumOfSpec = sid => MEDIA.find(m => (m.specs ?? []).some(s => s.id === sid));
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const ctx = createContext({ client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기', slogan: '자소서 없는 간편지원', role: '자유직무, 경영·제품·사업 분야', employType: '신입·경력', location: '서울 여의도', startDate: '2025-09-22', deadline: '2025-10-12' }, 'recruit');
const metaOf = id => { const p = `ref/learned/cases/${id}/meta.json`; if (!existsSync(p)) return null; const m = JSON.parse(readFileSync(p, 'utf8')); return m.kvMeta ?? m; };
const photoMeta = metaOf('t1014-hanssem'), cutMeta = metaOf('sep-open-recruit');
const styleWith = meta => normalizeStyle({ colors: ['#00146E'], keyVisual: PNG, kvMeta: meta, logo: PNG, logoTone: 'dark', logoMeta: { px: [1043, 304], tone: 'dark', solid: 0.56, colors: [{ hex: '#0F0F0F', share: 1 }] } });
const traceOf = html => { const m = html.match(/data-trace="([^"]*)"/); return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')) : null; };

// 출처·괄호 지우기 — 규칙 문장만 남긴다
const clean = t => String(t ?? '')
  .replace(/\((?:figma|pdf|psd|docx|text|보드|frame|PDF|PSD)[^)]*\)/g, '')
  .replace(/\.?(?:pdf|docx|psd)\s*p\.\d+[^)]*\)/g, '').replace(/\b(?:text|docx|frame)\s*[\d:·]*\s*[^)]*\)/g, '').replace(/\s*—\s*p\.\d+[^.]*$/g, '')
  .replace(/^layoutNotes 문장을 구조화[^:]*:\s*/, '').replace(/\(\d{2}-\d{2}\)/g, '')
  .replace(/\s*[—–-]\s*(conflicts|confirmed|확인필요|confidence)[^.。]*$/g, '')
  .replace(/figma:[^\s,)]+|pdf:[^\s,)]+|psd:[^\s,)]+/g, '')
  .replace(/\b\d+:\d+\b/g, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,·])/g, '$1').trim();
const cut = (t, n = 95) => { t = clean(t); return t.length > n ? t.slice(0, n - 1).replace(/[\s,·]+\S*$/, '') + '…' : t; };
const sents = t => clean(t).split(/(?<=[.。])\s+|\s*\/\s*(?=[가-힣])/).map(x => x.trim()).filter(Boolean);
const firstMatch = (arr, re, n = 90) => { for (const t of arr) for (const s0 of sents(t)) if (re.test(s0)) return cut(s0, n); return ''; };

const ROLE = { sub: '서브', main: '메인', date: '날짜', detail: '상세', chip: '칩', tags: '태그' };
const rowsText = mold => Object.entries(mold.rows ?? {}).map(([r, v]) => `${ROLE[r] ?? r} ${v.px}${v.weight ? '/' + v.weight : ''}${v.lines ? ' ' + v.lines + '줄' : ''}${v.items ? '(' + v.items.join('·') + ')' : ''}${v.chip ? ' 알약' : ''}`).join(' · ');
const limitsText = s => (s.textLimits ?? []).filter(t => !/이미지 밖|밖 텍스트/.test(t.note ?? '')).map(t => `${t.field.replace(/\s*\(.*\)/, '')}${t.maxChars ? ' ' + t.maxChars + '자' : ''}${t.lines ? ' ' + t.lines + '줄' : ''}`).join(' · ');
const rect = o => o ? `(${o.x},${o.y}) ${o.w}×${o.h}` : '';
const kvPos = tr => {
  if (!tr) return ''; const p = tr.place ?? {}; const z = p.zone ?? {};
  if (p.mode === 'mold') return ({ right: '오른쪽 열', bottom: '아래 띠', left: '왼쪽 열', corner: '우하단' }[p.imgCol] ?? '칸') + (p.tImage ? ' ' + rect(p.tImage) : '');
  if (p.mode === 'full') return '전체 + 스크림'; if (/^bg-/.test(p.mode ?? '')) return '배경 전체'; if (p.mode === 'none') return '없음';
  return ({ right: '오른쪽 열', bottom: '아래 띠', template: '칸' }[z.side] ?? z.side ?? '') + (p.mode ? ' ' + p.mode : '');
};

const rows = [];
for (const mid of EXTRACT.order) {
  for (const sid of EXTRACT.ids) {
    const m = mediumOfSpec(sid); if (!m || m.id !== mid) continue;
    const s = specOf(sid); if (!s) continue;
    const mold = s.safeArea?.measuredFromTemplate?.mold ?? null;
    const isLogoOnly = !s.assetOnly && !s.visualOnly && !mold && /logo|profile/.test(sid);
    const fr = fontRuleOf(m, s);
    const size = s.assetOnly ? `가로 ${s.asset.minW}px↑` : `${s.w}×${s.h}`;
    const submit = s.assetOnly ? '' : (s.submitW && s.submitW !== s.w) ? `${s.submitW}×${s.submitH}` : (s.exportScale && s.exportScale !== 1) ? `${s.w * s.exportScale}×${s.h * s.exportScale} (×${s.exportScale})` : '그대로';
    const fmt = `${(s.format ?? []).map(f => f.toUpperCase()).join('/')}${s.maxKB ? ` · ${s.maxKB >= 1024 ? (s.maxKB / 1024) + 'MB' : s.maxKB + 'KB'} 이하` : ' · 용량 규정 없음'}${s.minKB ? ` (최소 ${s.minKB}KB)` : ''}`;
    const tcs = s.textColors ?? (fr.fixed ? m.textColors : null);
    const colorRule = tcs?.main ? ` · 글자색 ${[tcs.main, ...(tcs.sub ?? [])].slice(0, 2).join('/')}` : (m.textColors?.rule && /1가지|통일/.test(m.textColors.rule) ? ' · 글자 한 색' : '');
    const font = (s.assetOnly || isLogoOnly || s.visualOnly) ? '-' : (fr.fixed ? `${fr.required} 고정` : mold?.font ? `${FONTS[mold.font]?.label?.replace(/\s*\(.*\)/, '') ?? mold.font} (틀)` : fr.allowed?.length ? `${fr.allowed.join('/')} 중` : `자유 → 기본 ${FONTS[DEFAULT_FONT]?.label?.replace(/\s*\(.*\)/, '')}`) + colorRule;
    let content;
    if (s.assetOnly) content = `${s.asset.item} 파일 — ${cut(s.asset.rule, 60)}`;
    else if (s.visualOnly) content = '글자 없음(키비주얼만)';
    else if (isLogoOnly) content = '글자 없음(로고만)';
    else if (mold) content = `${rowsText(mold)} · 글자 x${mold.x ?? '-'}${mold.w ? ' w' + mold.w : ''}${mold.align && mold.align !== 'left' ? ' ' + (mold.align === 'center' ? '가운데' : mold.align) : ''}${mold.vCenter ? ' 세로가운데' : ''}`;
    else content = `${limitsText(s) || '글자수 규정 없음'} · 위치 자유(가이드)`;
    let logo;
    if (s.assetOnly) logo = '-'; else if (isLogoOnly) logo = '로고가 소재 전체'; else if (s.visualOnly) logo = '없음';
    else if (s.logo?.count === 0) logo = '삽입 금지';
    else logo = `${mold?.logo ? `${({ right: '우', left: '좌', center: '가운데' }[mold.logo.align] ?? '')}${mold.logo.y < (s.h ?? 0) * 0.4 ? '상단' : '하단'} ${rect(mold.logo)}` : '위치 자유(우상단 기본)'}${s.logo?.w ? ` · ${s.logo.w}×${s.logo.h}` : ''}${s.logo?.hRange ? ` · 높이 ${s.logo.hRange.join('~')}` : ''}${s.logo?.note && /필수|대체|금지|불가|없음/.test(s.logo.note) ? ' · ' + (firstMatch([s.logo.note], /필수|대체|금지|불가|없음/, 60) || '') : ''}`;
    const common = Array.isArray(m.common) ? m.common : [];
    const kvRuleSrc = [s.objectBox?.note, ...(s.layoutNotes ?? []), s.background, ...common].filter(Boolean);
    const kvRule = (s.assetOnly || isLogoOnly) ? '' : firstMatch(kvRuleSrc, /누끼|오브젝트.*(권장|영역|배치)|썸네일|풀이미지|이미지 영역|통이미지|전체를 채우|라이선스/, 90);
    let kvPhoto = '', kvCut = '', bgSrc = '';
    if (!s.assetOnly && specs[sid]) { try { const tp = traceOf(renderAd(ctx, styleWith(photoMeta), specs[sid])); const tc = traceOf(renderAd(ctx, styleWith(cutMeta), specs[sid])); kvPhoto = kvPos(tp); kvCut = kvPos(tc); bgSrc = `${tp?.field?.source ?? ''}·${tc?.field?.source ?? ''}`; } catch (e) { kvPhoto = '오류'; } }
    const kvMode = s.assetOnly ? '-' : s.visualOnly ? '소재 전체' : isLogoOnly ? '없음' : mold ? ((mold.kv === 'slot' || /^jasoseol-/.test(sid)) ? `고정 칸 ${rect(mold.image)}` : `자유(글자 피한 칸) — 사진 ${kvPhoto || '-'} / 누끼 ${kvCut || '-'}`) : `자유(가이드) — 사진 ${kvPhoto || '-'} / 누끼 ${kvCut || '-'}`;
    const kv = [kvRule, kvMode].filter(Boolean).join(' ‖ ');
    const bgRaw = s.background || firstMatch(common, /배경/, 100) || '규정 없음';
    const bgRule = s.assetOnly ? '' : cut(/^규정 없음/.test(bgRaw) ? '규정 없음' + (/(권장|금지|불가|지양)/.test(bgRaw) ? '. ' + (firstMatch([bgRaw], /권장|금지|불가|지양/, 80) || '') : '') : bgRaw, 100);
    const bgBan = m.backgroundColors?.banned?.length ? ` · 사용 불가 ${m.backgroundColors.banned.join(' ')}` : (/사용 불가 배경색/.test(s.background ?? '') ? ' · ' + firstMatch([s.background], /사용 불가 배경색/, 80) : '');
    const transparent = /^투명/.test(s.background ?? '');
    const bg = s.assetOnly ? '-' : `${bgRule}${bgBan}${mold?.light ? ' · 밝은 지면' : ''} ‖ 처리: ${transparent ? '투명(지면 없음)' : '비주얼 우선' + (bgSrc && !/kv-harmony|kv-edge|kv-mood|kv-colour/.test(bgSrc) ? `(지금 ${bgSrc.replace(/^·|·$/g, '')})` : '')}`;
    rows.push({ medium: m.name, id: sid, title: (s.title ?? s.name ?? sid).replace(/^[^·]+·\s*/, '').replace(/\s*\(PDF 명칭:[^)]*\)/, ''), size, submit, fmt, font, content, logo, kv, bg });
  }
}

const H = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const COLS = [['title', '규격', 15], ['size', '크기 / 제출', 8], ['fmt', '포맷 · 용량', 8], ['font', '폰트', 9], ['content', '콘텐츠 — 덩어리 · 양 · 위치', 20], ['logo', '로고', 11], ['kv', 'KV — 규칙 ‖ 위치', 16], ['bg', '배경색 — 규정 ‖ 처리', 13]];
const byMedium = rows.reduce((a, r) => ((a[r.medium] ??= []).push(r), a), {});
const cell = (r, k) => k === 'title' ? `<b>${H(r.title)}</b><code>${r.id}</code>` : k === 'size' ? `${H(r.size)}${r.submit ? `<br><span class="sub">제출 ${H(r.submit)}</span>` : ''}` : `<div class="c" title="${H(r[k])}">${H(r[k]).replace(/ ‖ /g, '<br>')}</div>`;
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>추출 규격 규칙표</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<style>body{font-family:Pretendard,system-ui,sans-serif;margin:0;padding:24px 28px;color:#111;background:#fafafa}h1{font-size:20px;margin:0 0 4px}p.note{color:#666;font-size:12.5px;margin:0 0 18px;line-height:1.5}
h2{font-size:15px;margin:22px 0 6px;padding-left:9px;border-left:4px solid #111}table{border-collapse:separate;border-spacing:0;width:100%;background:#fff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;font-size:11.5px;table-layout:fixed}
th{position:sticky;top:0;background:#f3f3f3;text-align:left;font-weight:700;padding:6px 8px;border-bottom:1px solid #e5e5e5;font-size:11px;white-space:nowrap}td{padding:5px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;line-height:1.4;word-break:keep-all;overflow-wrap:anywhere}
tr:last-child td{border-bottom:0}td b{font-weight:600}td code{display:block;color:#999;font-size:10px;font-family:ui-monospace,Menlo,monospace;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sub{color:#777}
.c{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}</style></head><body>
<h1>추출 규격 규칙표 — ${rows.length}개</h1><p class="note">규격마다 지금 적용되는 추출 규칙(매체 규정 + 틀 + 렌더 동작). 셀은 3줄에서 접히며, 마우스를 올리면 전문. 「자유(글자 피한 칸)」= 글자 상자를 피한 가장 큰 빈 칸에 KV, 「사진/누끼」= 사진 KV·누끼 KV 로 그릴 때 실제 자리. 배경 「처리: 비주얼 우선」= 키비주얼 색에서 지면을 뽑는 공통 규칙.</p>
${Object.entries(byMedium).map(([mName, rs]) => `<h2>${H(mName)} · ${rs.length}</h2><table><colgroup>${COLS.map(c => `<col style="width:${c[2]}%">`).join('')}</colgroup><thead><tr>${COLS.map(c => `<th>${c[1]}</th>`).join('')}</tr></thead><tbody>
${rs.map(r => `<tr>${COLS.map(([k]) => `<td>${cell(r, k)}</td>`).join('')}</tr>`).join('\n')}</tbody></table>`).join('\n')}
</body></html>`;
writeFileSync('docs/spec-inventory.html', html);
const esc = v => String(v ?? '').replace(/\|/g, '\\|').replace(/ ‖ /g, ' / ');
const md = [`# 추출 규격 규칙표 (${new Date().toISOString().slice(0, 10)}) — ${rows.length}개`, '', '자동 생성 `node scripts/spec-inventory.mjs`. 규격마다 지금 적용되는 추출 규칙(매체 규정 + 틀 + 렌더 동작). HTML 판: docs/spec-inventory.html', ''];
for (const [mName, rs] of Object.entries(byMedium)) { md.push(`## ${mName} · ${rs.length}`, '', '| 규격 | 크기 / 제출 | 포맷 · 용량 | 폰트 | 콘텐츠 | 로고 | KV | 배경색 |', '|---|---|---|---|---|---|---|---|'); for (const r of rs) md.push(`| ${esc(r.title)} \`${r.id}\` | ${esc(r.size)}${r.submit ? ' / ' + esc(r.submit) : ''} | ${esc(r.fmt)} | ${esc(r.font)} | ${esc(r.content)} | ${esc(r.logo)} | ${esc(r.kv)} | ${esc(r.bg)} |`); md.push(''); }
writeFileSync('docs/spec-inventory.md', md.join('\n'));
writeFileSync('docs/spec-inventory.json', JSON.stringify(rows, null, 1));
console.log(`docs/spec-inventory.{html,md,json} ← ${rows.length}개 규격`);
