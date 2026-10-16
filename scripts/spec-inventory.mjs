#!/usr/bin/env node
// 규격별 가이드 재고표 — 추출 목록(EXTRACT, 49)의 규격마다 「지금 실제로 적용되는 규칙」을 한 줄로 뽑는다(10-16 사용자: 「리스트별로 표로 깔끔하게 — 폰트 스타일·선택 여부·콘텐츠 범위까지」).
//   값은 매체 JSON(규정 + 틀 mold)·폰트 규정(fontRuleOf)·렌더 트레이스(사진 KV / 누끼 KV 두 경우)에서만 읽는다. 추측·새 규칙 없음.
//   node scripts/spec-inventory.mjs            → docs/spec-inventory.md (+ .json)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { MEDIA, EXTRACT, specOf } from '../core/media.js';
import { adSpecEntries } from '../core/adspecs.js';
import { fontRuleOf, DEFAULT_FONT, FONTS } from '../core/fonts.js';
import { renderAd } from '../core/renderers/ad.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
const mediumOf = id => MEDIA.find(m => m.id === id);
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const fields = { client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기', slogan: '자소서 없는 간편지원', role: '자유직무, 경영·제품·사업 분야', employType: '신입·경력', location: '서울 여의도', startDate: '2025-09-22', deadline: '2025-10-12' };
const ctx = createContext(fields, 'recruit');
const metaOf = id => { const p = `ref/learned/cases/${id}/meta.json`; if (!existsSync(p)) return null; const m = JSON.parse(readFileSync(p, 'utf8')); return m.kvMeta ?? m; };
const photoMeta = metaOf('t1014-hanssem'), cutMeta = metaOf('sep-open-recruit');
const styleWith = meta => normalizeStyle({ colors: ['#00146E'], keyVisual: PNG, kvMeta: meta, logo: PNG, logoTone: 'dark', logoMeta: { px: [1043, 304], tone: 'dark', solid: 0.56, colors: [{ hex: '#0F0F0F', share: 1 }] } });
const traceOf = html => { const m = html.match(/data-trace="([^"]*)"/); return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')) : null; };

const ROLE = { sub: '서브', main: '메인', date: '날짜', detail: '상세', chip: '칩', tags: '태그' };
const fmtRows = mold => Object.entries(mold.rows ?? {}).map(([r, v]) => {
  const bits = [`${v.px}px`, v.weight ? `w${v.weight}` : null, v.lines ? `${v.lines}줄` : null, v.items ? `(${v.items.join('·')})` : null, v.chip ? '알약' : null, v.labelRow ? '라벨줄+값줄' : null, v.labelCol ? '라벨열+값열' : null].filter(Boolean).join(' ');
  return `${ROLE[r] ?? r} ${bits}`;
}).join(' / ');
const fmtLimits = s => (s.textLimits ?? []).filter(t => !/이미지 밖|밖 텍스트/.test(t.note ?? '')).map(t => `${t.field}${t.maxChars ? ` ${t.maxChars}자` : ''}${t.lines ? ` ${t.lines}줄` : ''}`).join(' / ');
const rect = o => o ? `(${o.x},${o.y}) ${o.w}×${o.h}` : '';
const kvFrom = (tr) => {
  if (!tr) return '';
  const p = tr.place ?? {}; const z = p.zone ?? {};
  const mode = p.mode ?? '';
  if (mode === 'mold') return `${p.imgCol === 'right' ? '오른쪽 열' : p.imgCol === 'bottom' ? '아래 띠' : p.imgCol === 'left' ? '왼쪽 열' : p.imgCol === 'corner' ? '우하단 칸' : '칸'}${p.tImage ? ' ' + rect(p.tImage) : ''}`;
  if (mode === 'full') return '사진 전체 + 스크림';
  if (/^bg-/.test(mode)) return '배경 전체(' + mode.slice(3) + ')';
  if (mode === 'none') return '그림 없음';
  const side = z.side === 'right' ? '오른쪽 열' : z.side === 'bottom' ? '아래 띠' : z.side === 'template' ? '템플릿 칸' : z.side ?? '';
  return `${side}${mode ? ' · ' + mode : ''}`;
};

const rows = [];
let n = 0;
for (const mid of EXTRACT.order ?? Object.keys(EXTRACT.counts ?? {})) {
  const m = mediumOf(mid); if (!m) continue;
  for (const sid of EXTRACT.ids.filter(id => specOf(id)?.medium === mid || id.startsWith(mid + '-'))) {
    const s = specOf(sid); if (!s) continue; n++;
    const mold = s.safeArea?.measuredFromTemplate?.mold ?? null;
    const fr = fontRuleOf(m, s);
    const font = fr.fixed ? `고정 ${fr.required}` : fr.allowed?.length ? `허용 ${fr.allowed.join('/')}` : mold?.font ? `틀 ${FONTS[mold.font]?.label ?? mold.font}` : `선택(기본 ${FONTS[DEFAULT_FONT]?.label ?? DEFAULT_FONT})`;
    const SAMPLE_RE = /디자이너 샘플|사용자|세아|케피코|한미|FITI|ABL|HS화성|비씨|콜마|대원|한국앤|한샘|안랩|GC녹십자|수정본/;
    const srcShort = (mold?.source ?? '').replace(/^figma:[A-Za-z0-9]+\s*/, '').replace(/\s*\(.*$/, '').slice(0, 70);
    const basis = s.assetOnly ? '전달물(렌더 없음)' : mold ? `${SAMPLE_RE.test(mold.source ?? '') ? '디자이너 샘플' : '공식 템플릿'} — ${srcShort}` : (s.visualOnly ? '비주얼만(기준 없음)' : s.logo?.count === 0 || /logo|profile/.test(sid) ? '로고만' : '기준 없음(공통 규칙)');
    const content = s.assetOnly ? `${s.asset.item} 파일 ${s.asset.rule}` : s.visualOnly ? '키비주얼 1장(글자·로고 없음)' : /logo|profile/.test(sid) && !mold ? '로고만' : mold ? fmtRows(mold) : (fmtLimits(s) || '규정 글자수 없음 → 가이드 사다리(서브·메인·날짜·상세)');
    const textBox = mold ? `x${mold.x ?? '-'} w${mold.w ?? '-'}${mold.align ? ' ' + mold.align : ''}${mold.vCenter ? ' 세로가운데' : ''}${mold.rows?.main?.y != null ? ` 메인 y${mold.rows.main.y}` : ''}` : (['top', 'right', 'bottom', 'left'].some(k => typeof s.safeArea?.[k] === 'number') ? `여백 ${['top', 'right', 'bottom', 'left'].map(k => s.safeArea?.[k] ?? '-').join('/')}` : '규정 없음(가이드 패딩)');
    const logo = s.assetOnly ? '-' : (s.logo?.count === 0 ? '로고 삽입 금지' : mold?.logo ? `칸 ${rect(mold.logo)}${mold.logo.align ? ' ' + mold.logo.align : ''}${mold.logo.box ? ' 흰 상자' : ''}` : /logo|profile/.test(sid) ? '로고 = 소재 전체' : '규정 없음(가이드 우상단)');
    let kvPhoto = '', kvCut = '', bgNote = '';
    if (!s.assetOnly && specs[sid]) {
      try { const tp = traceOf(renderAd(ctx, styleWith(photoMeta), specs[sid])); const tc = traceOf(renderAd(ctx, styleWith(cutMeta), specs[sid])); kvPhoto = kvFrom(tp); kvCut = kvFrom(tc); bgNote = `${tp?.field?.source ?? ''} / ${tc?.field?.source ?? ''}`; } catch (e) { kvPhoto = 'render 오류: ' + e.message.slice(0, 40); }
    }
    const kvMode = s.assetOnly ? '-' : mold ? ((mold.kv === 'slot' || /^jasoseol-/.test(sid)) ? '칸 고정' : '자유(글자 피한 칸)') : (s.visualOnly ? '전체' : '가이드 배치');
    const bg = s.assetOnly ? '-' : `공통(비주얼 우선)${mold?.light ? ' · 밝은 지면 강제' : ''}${s.background && /단색|흰색|금지|권장/.test(String(s.background)) ? ' · 규정: ' + String(s.background).replace(/\s*\(.*$/, '').slice(0, 40) : ''}`;
    rows.push({ n, medium: m.name, id: sid, title: (s.title ?? s.name ?? sid).replace(/^[^·]+·\s*/, ''), size: s.w && s.h ? `${s.w}×${s.h}${s.submitW && s.submitW !== s.w ? ` (제출 ${s.submitW}×${s.submitH})` : ''}` : (s.asset ? `가로 ${s.asset.minW}px↑` : '-'), basis, font, content, textBox, logo, kvMode, kvPhoto, kvCut, bg: bg + (bgNote ? ` 〔${bgNote}〕` : '') });
  }
}
const esc = v => String(v ?? '').replace(/\|/g, '\\|');
const head = '| # | 매체 | 규격 | 크기 | 기준 | 폰트 | 콘텐츠(글자 덩어리·양) | 글자 칸 | 로고 | KV 방식 | KV 위치(사진) | KV 위치(누끼) | 배경 |';
const md = [`# 규격별 가이드 재고표 (${new Date().toISOString().slice(0, 10)}) — ${rows.length}개`, '',
  '자동 생성(`node scripts/spec-inventory.mjs`). 값은 매체 JSON 규정·틀(mold)·폰트 규정·렌더 트레이스(사진 KV = 한샘, 누끼 KV = 유리 행성)에서만. 「기준 없음」은 공통 규칙(가이드)으로만 그려지는 규격.',
  '배경은 전 규격 공통 「비주얼 우선(kvHarmony)」 — 〔사진/누끼〕 는 지금 실제로 고른 지면 출처.', '', head, '|' + '---|'.repeat(13),
  ...rows.map(r => `| ${r.n} | ${esc(r.medium)} | ${esc(r.title)} \`${r.id}\` | ${esc(r.size)} | ${esc(r.basis)} | ${esc(r.font)} | ${esc(r.content)} | ${esc(r.textBox)} | ${esc(r.logo)} | ${esc(r.kvMode)} | ${esc(r.kvPhoto)} | ${esc(r.kvCut)} | ${esc(r.bg)} |`)].join('\n') + '\n';
writeFileSync('docs/spec-inventory.md', md);
writeFileSync('docs/spec-inventory.json', JSON.stringify(rows, null, 1));
const H = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const COLS = [['n', '#'], ['title', '규격'], ['size', '크기'], ['basis', '기준'], ['font', '폰트'], ['content', '콘텐츠(글자 덩어리·양)'], ['textBox', '글자 칸'], ['logo', '로고'], ['kvMode', 'KV 방식'], ['kvPhoto', 'KV 위치(사진)'], ['kvCut', 'KV 위치(누끼)'], ['bg', '배경']];
const byMedium = rows.reduce((a, r) => ((a[r.medium] ??= []).push(r), a), {});
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>규격별 가이드 재고표</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<style>body{font-family:Pretendard,system-ui,sans-serif;margin:0;padding:28px 32px;color:#111;background:#fafafa}h1{font-size:22px;margin:0 0 6px}p.note{color:#666;font-size:13px;margin:0 0 20px;line-height:1.6}
h2{font-size:17px;margin:28px 0 8px;padding-left:10px;border-left:4px solid #111}table{border-collapse:separate;border-spacing:0;width:100%;background:#fff;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;font-size:12.5px;table-layout:fixed}
th{position:sticky;top:0;background:#f3f3f3;text-align:left;font-weight:700;padding:8px 10px;border-bottom:1px solid #e5e5e5;font-size:12px}td{padding:8px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top;line-height:1.5;word-break:keep-all;overflow-wrap:anywhere}
tr:last-child td{border-bottom:0}td.id code{display:block;color:#888;font-size:11px;margin-top:2px}td.n{color:#999;width:28px}.tag{display:inline-block;padding:1px 6px;border-radius:999px;font-size:11px;font-weight:600;margin-right:4px}.s{background:#e8f4ec;color:#1c7a3a}.t{background:#eef2fb;color:#2e4fa3}.x{background:#f5f5f5;color:#666}.fx{background:#fff2e5;color:#b25c00}</style></head><body>
<h1>규격별 가이드 재고표 — ${rows.length}개</h1><p class="note">자동 생성 <code>node scripts/spec-inventory.mjs</code>. 매체 JSON 규정·틀(mold)·폰트 규정·렌더 트레이스(사진 KV = 한샘 / 누끼 KV = 유리 행성)에서만 읽음. 「기준 없음」= 공통 규칙으로만 그려짐. 배경은 전 규격 공통 「비주얼 우선」, 〔 〕 안은 지금 실제로 고른 지면 출처.</p>
${Object.entries(byMedium).map(([m, rs]) => `<h2>${H(m)} · ${rs.length}</h2><table><colgroup><col style="width:28px"><col style="width:16%"><col style="width:8%"><col style="width:11%"><col style="width:7%"><col style="width:15%"><col style="width:8%"><col style="width:8%"><col style="width:6%"><col style="width:8%"><col style="width:8%"><col></colgroup><thead><tr>${COLS.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>
${rs.map(r => `<tr>${COLS.map(([k]) => k === 'n' ? `<td class="n">${r.n}</td>` : k === 'title' ? `<td class="id">${H(r.title)}<code>${r.id}</code></td>` : k === 'basis' ? `<td><span class="tag ${/디자이너/.test(r.basis) ? 's' : /템플릿/.test(r.basis) ? 't' : 'x'}">${/디자이너/.test(r.basis) ? '샘플' : /템플릿/.test(r.basis) ? '템플릿' : '없음'}</span>${H(r.basis.replace(/^(디자이너 샘플|공식 템플릿) — /, ''))}</td>` : k === 'font' ? `<td>${/^고정/.test(r.font) ? '<span class="tag fx">규정</span>' : ''}${H(r.font)}</td>` : `<td>${H(r[k])}</td>`).join('')}</tr>`).join('\n')}</tbody></table>`).join('\n')}
</body></html>`;
writeFileSync('docs/spec-inventory.html', html);
console.log(`docs/spec-inventory.md ← ${rows.length}개 규격`);
