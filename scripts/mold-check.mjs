#!/usr/bin/env node
// 「구멍 뚫린 틀」(templateMold) 검수 표 — render-ours.mjs 의 measure.json(DOM 실측)을 매체 JSON 의 틀 정본(spec.safeArea.measuredFromTemplate.mold · docs/<매체>-mold.md)과 대조한다.
// 10-15 자소설 전용(jasoseol-mold-check.mjs)을 매체 공용으로 — 규격 id 로 core/media/*.json 을 찾는다(--media 로 고정 가능).
//
//   node scripts/mold-check.mjs <render-ours 출력 폴더> [--media <id>]   → <폴더>/check.json · check.md
//
// 환산: Figma 글상자 top(자동 높이 = 1.2em) ↔ Chrome 줄 상자(line-height = pitch) — DOM top = 글상자 top − (pitch − 1.2em)/2. 표의 「렌더 y」는 Figma 글상자 기준으로 되돌린 값.
// 판정: 위치·크기 ±1px ✓, 굵기·색 정확히 ✓(틀이 값을 안 정했으면 – : 기존 가이드가 정한다), 자간 ±0.05% ✓, 로고는 칸 안 + 정렬(가운데/오른쪽 ±2px) + 면적 상한, 그림 칸은 trace place.tImage 와 같은지, 태그 칩 행은 y·높이·글자 크기.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const dir = argv.find(a => !a.startsWith('--'));
const mediaOpt = argv.includes('--media') ? argv[argv.indexOf('--media') + 1] : null;
if (!dir) { console.error('사용법: node scripts/mold-check.mjs <폴더> [--media <id>]'); process.exit(1); }
const M = JSON.parse(readFileSync(path.join(dir, 'measure.json'), 'utf8'));
const MEDIA = Object.fromEntries(readdirSync(path.join(ROOT, 'core/media')).filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => { const j = JSON.parse(readFileSync(path.join(ROOT, 'core/media', f), 'utf8')); return [j.id, j]; }));
const mediumOf = id => mediaOpt ? MEDIA[mediaOpt] : Object.values(MEDIA).find(m => (m.specs ?? []).some(s => s.id === id));
export const specOf = id => mediumOf(id)?.specs?.find(x => x.id === id) ?? null;
export const moldOf = id => specOf(id)?.safeArea?.measuredFromTemplate?.mold ?? null;
const sizeOf = id => { const s = specOf(id); return s ? [s.w, s.h] : null; };
const scaleOf = id => { const s = specOf(id); const src = `${s?.safeArea?.measuredFromTemplate?.frame ?? ''} ${s?.fontSizes?.unit ?? ''}`; const m = src.match(/(\d{2,4})\s*[×x*]\s*(\d{2,4})/); const fw = m ? Number(m[1]) : 0; return fw > 0 && fw !== s.w ? s.w / fw : 1; };   // 렌더러 templateScale 과 같은 규칙 — 틀 실측 프레임(달력 328×466 2배)과 규격 폭이 다르면 그 비율(달력 ×0.5), 나머지 1

const hex = c => { const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('').toUpperCase() : String(c).toUpperCase(); };
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const r1 = n => Math.round(n * 10) / 10;
const lsPct = v => { const m = String(v ?? '').match(/(-?[\d.]+)px/); return m ? null : null; };

const out = {};
for (const [id, v] of Object.entries(M.specs)) {
  const mold0 = moldOf(id); if (!mold0 || !v) continue;
  const k = scaleOf(id);
  const sc = o => o && { ...o, x: o.x != null ? r1(o.x * k) : o.x, y: o.y != null ? r1(o.y * k) : o.y, w: o.w != null ? r1(o.w * k) : o.w, h: o.h != null ? r1(o.h * k) : o.h, px: o.px != null ? r1(o.px * k) : o.px, pitch: o.pitch != null ? r1(o.pitch * k) : o.pitch, maxArea: o.maxArea != null ? Math.round(o.maxArea * k * k) : o.maxArea };
  const mold = { ...mold0, x: r1((mold0.x ?? 0) * k), logo: sc(mold0.logo), image: sc(mold0.image), field: sc(mold0.field), rows: Object.fromEntries(Object.entries(mold0.rows ?? {}).map(([r, o]) => [r, sc(o)])) };
  const tr = JSON.parse(v.ad['data-trace']);
  const rows = []; const add = (item, std, got, ok, note = '') => rows.push({ item, std: String(std), got: String(got), ok, note });
  const used = tr.mold?.rows ?? {};
  const roleName = { sub: '서브', main: '메인', detail: '상세', date: '마감일', tags: '태그' };
  if (mold.rows?.date && !mold.rows.date.afterMain) roleName.date = '날짜';
  for (const role of ['sub', 'main', 'detail', 'date']) {
    const r = mold.rows?.[role]; const f = v.fields.find(x => x.role === role);
    if (!r && !f) continue;
    if (r && !f) { add(`${roleName[role]} 줄`, '있음', '없음', (role === 'sub' || role === 'detail' || role === 'date') ? null : false, '문구 없음'); continue; }
    if (!r && f) { add(`${roleName[role]} 줄`, '없음', '있음', false); continue; }
    const fs = f.fs, lh = parseFloat(f.lh) || fs * 1.2;
    const yFig = r.chip ? r1(f.y) : r1(f.y + (lh - fs * 1.2) / 2);   // Figma 글상자 top 으로 환산(날짜 알약 행은 칩 상자 top 이 곧 y)
    const stdY = used[role]?.y ?? r.y;            // 틀 y(메인 줄 수·서브 줄 수 따라 움직이는 줄은 렌더러가 쓴 값)
    const stdX = r.x != null ? r.x : mold.x;   // 행별 글상자 x(구글 ABL: 날짜 47·상세 127·세로형 메인 61 — 10-15 저녁)
    add(`${roleName[role]} x`, stdX, f.x, near(f.x, stdX));
    add(`${roleName[role]} y`, stdY, yFig, near(yFig, stdY, 1.5), used[role] && used[role].y !== r.y ? '틀 규칙(앞 줄 수)에 따라 이동' : '');
    add(`${roleName[role]} 크기`, r.px, fs, near(fs, r.px));
    if (r.weight != null) add(`${roleName[role]} 굵기`, r.weight, f.fw, +f.fw === +r.weight); else add(`${roleName[role]} 굵기`, '틀 없음', f.fw, null, '샘플 굵기 갈림 → 기존 가이드');
    const pitchStd = r.chip ? r.chip.h : (r.pitch ?? r1(r.px * 1.2)); add(`${roleName[role]} 줄 간격`, pitchStd, r1(lh), near(lh, pitchStd, 0.3), r.chip ? '날짜 알약 높이' : '');
    if (r.ls != null) { const got = f.ls && f.ls !== 'normal' ? r1(parseFloat(f.ls) / fs * 1000) / 10 : 0; add(`${roleName[role]} 자간`, `${r.ls}%`, `${got}%`, near(got, r.ls, 0.06)); }
    const dark = tr.mold?.color && tr.mold.color.toUpperCase() === (mold.colorDark ?? '#FFFFFF').toUpperCase();
    if (r.color) { const stdColor = r.color.toUpperCase(); add(`${roleName[role]} 색`, dark ? mold.colorDark : stdColor, hex(f.color), hex(f.color) === (dark ? (mold.colorDark ?? '#FFFFFF') : stdColor).toUpperCase(), dark ? '어두운 지면 → 흰 글자' : '행별 색(rows.*.color)'); }   // 행별 색이 틀 공통색(brand 포함)보다 우선(10-16 구글 서브 #787878)
    else if (mold.color === 'brand') { const stdColor = String(tr.mold?.color ?? '').toUpperCase(); add(`${roleName[role]} 색`, dark ? mold.colorDark : `브랜드 주색(${stdColor})`, hex(f.color), hex(f.color) === (dark ? (mold.colorDark ?? '#FFFFFF') : stdColor).toUpperCase(), dark ? '어두운 지면 → 흰 글자' : (stdColor === '#1A1A1A' ? '브랜드 주색이 밝은 지면 대비 4.5 미만 → 진회색' : '')); }   // NAP HS화성: 글자색 = 브랜드 주색(10-15 밤)
    else if (mold.color) { const stdColor = mold.color.toUpperCase(); add(`${roleName[role]} 색`, dark ? mold.colorDark : stdColor, hex(f.color), hex(f.color) === (dark ? mold.colorDark : stdColor).toUpperCase(), dark ? '어두운 지면 → 흰 글자' : (r.color ? '행별 색(rows.*.color)' : '')); }   // 행별 색(10-16 카카오 비즈보드: 메인 #4C4C4C · 서브 #555555)
    else add(`${roleName[role]} 색`, '틀 없음(자유)', hex(f.color), null, dark ? '어두운 지면 → 흰 글자(기존 가이드)' : '밝은 지면 → 검정(기존 가이드)');
    if (r.lines) add(`${roleName[role]} 줄 수`, `≤${r.lines}`, (f.lines ?? []).length, (f.lines ?? []).length <= r.lines);
    if (role === 'sub' && r.content === 'period') { const lb = mold.labels?.period ?? '접수기간'; add('서브 내용', lb ? `${lb} 라벨 + 날짜` : '날짜만(라벨 없음)', (f.text ?? '').slice(0, 30), lb ? new RegExp(`^${lb}${r.sep ?? ' '}`).test(f.text ?? '') : /\d/.test(f.text ?? '') && !/접수기간|모집 ?기간/.test(f.text ?? '')); }   // 라벨 없는 날짜 줄(카카오 비즈보드 10-16)
    if (role === 'detail' && r.labelWeight != null && f.bold?.length) { const ws = [...new Set(f.bold.map(b => +b[1]))]; add('상세 라벨 굵기', r.labelWeight, ws.join('/'), ws.length === 1 && ws[0] === +r.labelWeight); }
    if (role === 'detail' && r.items) { const miss = r.items.filter(it => !(f.text ?? '').includes({ '접수기간': '기간', '모집직무': '직무' }[it] ?? it) && !(f.text ?? '').includes({ '접수기간': '일정' }[it] ?? it) && !(mold.labels?.role && it === '모집직무' && (f.text ?? '').includes(mold.labels.role)) && !(mold.labels?.period && it === '접수기간' && (f.text ?? '').includes(mold.labels.period))); const capN = (r.byMainLines?.[String(tr.mold?.mainN)]?.lines ?? r.lines); add('상세 항목', r.items.join('·'), miss.length ? `${r.items.filter(i => !miss.includes(i)).join('·')} (생략: ${miss.join('·')})` : r.items.join('·'), miss.length === 0 ? true : null, miss.length ? `틀 행 한도 ${capN}행(메인 ${tr.mold?.mainN}줄) 안에 못 들어가 생략 — 값이 2행` : ''); }
  }
  // 태그 칩 행(잡다 PC)
  if (mold.rows?.tags) {
    const t = mold.rows.tags, f = v.fields.find(x => x.role === 'tags'), u = used.tags;
    if (!f) add('태그 줄', '있음', '없음', null, '글감 없음');
    else {
      add('태그 x', t.x ?? mold.x, f.x, near(f.x, t.x ?? mold.x));
      add('태그 y', t.y, f.y, near(f.y, t.y, 1.5));
      { const th0 = t.h ?? t.px * 2, rows0 = t.rows ?? 1, hStd = t.plain ? (th0 + (t.rowGap ?? 2)) * rows0 : th0 * rows0 + (t.rowGap ?? 2) * (rows0 - 1); add(rows0 > 1 || t.plain ? '태그 칸 높이' : '태그 칩 높이', hStd, f.h, near(f.h, hStd, 1.5), rows0 > 1 ? `${rows0}줄` : ''); }
      add('태그 글자 크기', t.px, u?.px ?? '?', u ? near(u.px, t.px) : null);
      add('태그 굵기', t.weight ?? '틀 없음', u?.weight ?? '?', t.weight != null ? +u?.weight === +t.weight : null);
      add('태그 칩 수', `≤${t.max ?? 6}`, (u?.items ?? []).length, (u?.items ?? []).length <= (t.max ?? 6), (u?.items ?? []).join('·'));
    }
  }
  // 로고
  if (mold.logo) {
    const L = v.logo?.[0]; const b = mold.logo;
    if (!L) add('로고', `칸 ${b.w}×${b.h}@${b.x},${b.y}`, '없음', tr.logo?.has === false ? null : false, tr.logo?.has === false ? '케이스에 로고 없음(글감 없음)' : '');
    else {
      const [x, y, w, h] = L; const inside = x >= b.x - 1 && y >= b.y - 1 && x + w <= b.x + b.w + 1 && y + h <= b.y + b.h + 1;
      add('로고 칸 안', `${b.w}×${b.h}@${b.x},${b.y}`, `${w}×${h}@${x},${y}`, inside);
      const align = b.align ?? 'center'; const ok = align === 'right' ? near(x + w, b.x + b.w, 2) : align === 'left' ? near(x, b.x, 2) : near(x + w / 2, b.x + b.w / 2, 2);
      add('로고 정렬', align === 'right' ? '오른쪽' : align === 'left' ? '왼쪽' : '가운데', align === 'right' ? `오른끝 ${x + w}` : `중심 ${r1(x + w / 2)}`, ok);
      if (b.maxArea) add('로고 면적', `≤ ${b.maxArea.toLocaleString()}px²`, `${(w * h).toLocaleString()}px²`, w * h <= b.maxArea * 1.02, '칸 꽉 채우지 않음');
      const va = b.valign ?? 'center';   // 10-16 네이버: 로고 칸 바닥 맞춤(valign bottom)
      if (va === 'bottom') add('로고 세로 바닥', r1(b.y + b.h), r1(y + h), near(y + h, b.y + b.h, 2));
      else if (va === 'top') add('로고 세로 위', r1(b.y), r1(y), near(y, b.y, 2));
      else add('로고 세로 가운데', r1(b.y + b.h / 2), r1(y + h / 2), near(y + h / 2, b.y + b.h / 2, 2));
    }
  } else if (v.logo?.length) add('로고', '칸 없음', tr.logo?.asObject ? '그림 칸 안 오브젝트' : '있음', tr.logo?.asObject ? null : false, tr.logo?.asObject ? '키비주얼 대신 로고가 오브젝트(기존 가이드 logoAsObject) — 틀 로고 칸 없음' : ''); else add('로고', '칸 없음', '없음', true);
  // 그림 칸
  if (mold.image) {
    const t = tr.place?.tImage; const b = mold.image;
    const slotMode = mold.kv === 'slot' || /^jasoseol-/.test(id);   // 10-15 밤: 그림 칸은 자소설만 샘플 칸, 나머지 틀 매체는 글자 상자를 피한 자유 배치(templateMold.freeKv)
    add('그림 칸', slotMode ? `${b.w}×${b.h}@${b.x},${b.y}` : `자유(참고 ${b.w}×${b.h}@${b.x},${b.y})`, t ? `${t.w}×${t.h}@${t.x},${t.y}` : '없음', slotMode ? (!!t && near(t.x, b.x) && near(t.y, b.y) && near(t.w, b.w) && near(t.h, b.h)) : null, slotMode ? '' : 'KV·배경은 이전 가이드(글자 상자를 피한 칸)');
  }
  if (mold.field) { const f = tr.mold?.field; add('지면 처리 영역', `${mold.field.w}×${mold.field.h}@${mold.field.x},${mold.field.y}`, f ? `${f.w}×${f.h}@${f.x},${f.y}` : '없음', !!f && near(f.x, mold.field.x) && near(f.w, mold.field.w)); }
  add('모드', 'templateMold', tr.mode, tr.mode === 'templateMold');
  out[id] = { size: sizeOf(id), scale: k, rows, pass: rows.filter(r => r.ok === true).length, fail: rows.filter(r => r.ok === false).length, skip: rows.filter(r => r.ok === null).length };
}
writeFileSync(path.join(dir, 'check.json'), JSON.stringify(out, null, 1));
const mediumName = [...new Set(Object.keys(out).map(id => mediumOf(id)?.name).filter(Boolean))].join('·') || '틀';
const md = [`# ${mediumName} 틀 검수 표 — ` + M.case + ' (' + M.measuredAt.slice(0, 10) + ')', ''];
for (const [id, c] of Object.entries(out)) {
  md.push(`## ${id} — ✓ ${c.pass} · ✗ ${c.fail}${c.skip ? ` · – ${c.skip}` : ''}`, '', '| 항목 | 기준(틀) | 렌더 | 판정 | 비고 |', '|---|---|---|---|---|');
  for (const r of c.rows) md.push(`| ${r.item} | ${r.std} | ${r.got} | ${r.ok === true ? '✓' : r.ok === false ? '✗' : '–'} | ${r.note} |`);
  md.push('');
}
writeFileSync(path.join(dir, 'check.md'), md.join('\n'));
console.log(Object.entries(out).map(([id, c]) => `${id}: ✓${c.pass} ✗${c.fail}${c.skip ? ` –${c.skip}` : ''}${c.fail ? '  ← ' + c.rows.filter(r => r.ok === false).map(r => r.item).join(', ') : ''}`).join('\n'));
