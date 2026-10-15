#!/usr/bin/env node
// 자소설 「구멍 뚫린 틀」 검수 표 — render-ours.mjs 의 measure.json(DOM 실측)을 틀 정본(core/media/jasoseol.json spec.mold · docs/jasoseol-mold.md)과 대조한다.
//
//   node scripts/jasoseol-mold-check.mjs <render-ours 출력 폴더>   → <폴더>/check.json · check.md
//
// 환산: Figma 글상자 top(자동 높이 = 1.2em) ↔ Chrome 줄 상자(line-height = pitch) — DOM top = 글상자 top − (pitch − 1.2em)/2. 표의 「렌더 y」는 Figma 글상자 기준으로 되돌린 값.
// 판정: 위치·크기 ±1px ✓, 굵기·색 정확히 ✓, 로고는 칸 안 + 정렬(가운데/오른쪽 ±2px) + 면적 상한, 그림 칸은 trace place.tImage 와 같은지.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = process.argv[2];
if (!dir) { console.error('사용법: node scripts/jasoseol-mold-check.mjs <폴더>'); process.exit(1); }
const M = JSON.parse(readFileSync(path.join(dir, 'measure.json'), 'utf8'));
const J = JSON.parse(readFileSync(path.join(ROOT, 'core/media/jasoseol.json'), 'utf8'));
const moldOf = id => J.specs.find(s => s.id === id)?.safeArea?.measuredFromTemplate?.mold ?? null;
const specOf = id => J.specs.find(x => x.id === id);
const sizeOf = id => { const s = specOf(id); return s ? [s.w, s.h] : null; };
const scaleOf = id => { const s = specOf(id); const src = `${s?.safeArea?.measuredFromTemplate?.frame ?? ''} ${s?.fontSizes?.unit ?? ''}`; const m = src.match(/(\d{2,4})\s*[×x*]\s*(\d{2,4})/); const fw = m ? Number(m[1]) : 0; return fw > 0 && fw !== s.w ? s.w / fw : 1; };   // 렌더러 templateScale 과 같은 규칙 — 틀 실측 프레임(달력 328×466 2배)과 규격 폭이 다르면 그 비율(달력 ×0.5), 나머지 1

const hex = c => { const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('').toUpperCase() : String(c).toUpperCase(); };
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const r1 = n => Math.round(n * 10) / 10;

const out = {};
for (const [id, v] of Object.entries(M.specs)) {
  const mold0 = moldOf(id); if (!mold0) continue;
  const k = scaleOf(id);
  const sc = o => o && { ...o, x: o.x != null ? r1(o.x * k) : o.x, y: o.y != null ? r1(o.y * k) : o.y, w: o.w != null ? r1(o.w * k) : o.w, h: o.h != null ? r1(o.h * k) : o.h, px: o.px != null ? r1(o.px * k) : o.px, pitch: o.pitch != null ? r1(o.pitch * k) : o.pitch, maxArea: o.maxArea != null ? Math.round(o.maxArea * k * k) : o.maxArea };
  const mold = { ...mold0, x: r1((mold0.x ?? 0) * k), logo: sc(mold0.logo), image: sc(mold0.image), field: sc(mold0.field), rows: Object.fromEntries(Object.entries(mold0.rows ?? {}).map(([r, o]) => [r, sc(o)])) };
  const tr = JSON.parse(v.ad['data-trace']);
  const rows = []; const add = (item, std, got, ok, note = '') => rows.push({ item, std: String(std), got: String(got), ok, note });
  const used = tr.mold?.rows ?? {};
  const roleName = { sub: '서브', main: '메인', detail: '상세', date: '마감일' };
  for (const role of ['sub', 'main', 'detail', 'date']) {
    const r = mold.rows?.[role]; const f = v.fields.find(x => x.role === role);
    if (!r && !f) continue;
    if (r && !f) { add(`${roleName[role]} 줄`, '있음', '없음', role === 'sub' || role === 'detail' ? null : false, '문구 없음'); continue; }
    if (!r && f) { add(`${roleName[role]} 줄`, '없음', '있음', false); continue; }
    const fs = f.fs, lh = parseFloat(f.lh) || fs * 1.2;
    const yFig = r1(f.y + (lh - fs * 1.2) / 2);   // Figma 글상자 top 으로 환산
    const stdY = used[role]?.y ?? r.y;            // 틀 y(메인 줄 수·서브 줄 수 따라 움직이는 줄은 렌더러가 쓴 값)
    add(`${roleName[role]} x`, mold.x, f.x, near(f.x, mold.x));
    add(`${roleName[role]} y`, stdY, yFig, near(yFig, stdY, 1.5), used[role] && used[role].y !== r.y ? '틀 규칙(앞 줄 수)에 따라 이동' : '');
    add(`${roleName[role]} 크기`, r.px, fs, near(fs, r.px));
    add(`${roleName[role]} 굵기`, r.weight, f.fw, +f.fw === +r.weight);
    add(`${roleName[role]} 줄 간격`, r.pitch ?? r1(r.px * 1.2), r1(lh), near(lh, r.pitch ?? r.px * 1.2, 0.3));
    const stdColor = (mold.color ?? '').toUpperCase(); const dark = tr.mold?.color && tr.mold.color.toUpperCase() === (mold.colorDark ?? '#FFFFFF').toUpperCase();
    add(`${roleName[role]} 색`, dark ? mold.colorDark : stdColor, hex(f.color), hex(f.color) === (dark ? mold.colorDark : stdColor).toUpperCase(), dark ? '어두운 지면 → 흰 글자' : '');
    if (r.lines) add(`${roleName[role]} 줄 수`, `≤${r.lines}`, (f.lines ?? []).length, (f.lines ?? []).length <= r.lines);
    if (role === 'detail' && r.labelWeight != null && f.bold?.length) { const ws = [...new Set(f.bold.map(b => +b[1]))]; add('상세 라벨 굵기', r.labelWeight, ws.join('/'), ws.length === 1 && ws[0] === +r.labelWeight); }
    if (role === 'detail' && r.items) { const miss = r.items.filter(it => !(f.text ?? '').includes({ '접수기간': '기간', '모집직무': '직무' }[it] ?? it) && !(f.text ?? '').includes({ '접수기간': '일정' }[it] ?? it)); const capN = (r.byMainLines?.[String(tr.mold?.mainN)]?.lines ?? r.lines); add('상세 항목', r.items.join('·'), miss.length ? `${r.items.filter(i => !miss.includes(i)).join('·')} (생략: ${miss.join('·')})` : r.items.join('·'), miss.length === 0 ? true : null, miss.length ? `틀 행 한도 ${capN}행(메인 ${tr.mold?.mainN}줄) 안에 못 들어가 생략 — 값이 2행` : ''); }
  }
  // 로고
  if (mold.logo) {
    const L = v.logo?.[0]; const b = mold.logo;
    if (!L) add('로고', `칸 ${b.w}×${b.h}@${b.x},${b.y}`, '없음', false);
    else {
      const [x, y, w, h] = L; const inside = x >= b.x - 2 && y >= b.y - 2 && x + w <= b.x + b.w + 2 && y + h <= b.y + b.h + 2;   // 칸 좌표가 .5 라 DOM 반올림으로 최대 2px
      add('로고 칸 안', `${b.w}×${b.h}@${b.x},${b.y}`, `${w}×${h}@${x},${y}`, inside);
      const align = b.align ?? 'center'; const ok = align === 'right' ? near(x + w, b.x + b.w, 2) : align === 'left' ? near(x, b.x, 2) : near(x + w / 2, b.x + b.w / 2, 2);
      add('로고 정렬', align === 'right' ? '오른쪽' : align === 'left' ? '왼쪽' : '가운데', align === 'right' ? `오른끝 ${x + w}` : `중심 ${r1(x + w / 2)}`, ok);
      if (b.maxArea) add('로고 면적', `≤ ${b.maxArea.toLocaleString()}px²`, `${(w * h).toLocaleString()}px²`, w * h <= b.maxArea * 1.02, '칸 꽉 채우지 않음');
      add('로고 세로 가운데', r1(b.y + b.h / 2), r1(y + h / 2), near(y + h / 2, b.y + b.h / 2, 2));
    }
  } else if (v.logo?.length) add('로고', '삽입 불가', '있음', false); else add('로고', '삽입 불가', '없음', true);
  // 그림 칸
  if (mold.image) {
    const t = tr.place?.tImage; const b = mold.image;
    add('그림 칸', `${b.w}×${b.h}@${b.x},${b.y}`, t ? `${t.w}×${t.h}@${t.x},${t.y}` : '없음', !!t && near(t.x, b.x) && near(t.y, b.y) && near(t.w, b.w) && near(t.h, b.h));
  }
  if (mold.field) { const f = tr.mold?.field; add('지면 처리 영역', `${mold.field.w}×${mold.field.h}@${mold.field.x},${mold.field.y}`, f ? `${f.w}×${f.h}@${f.x},${f.y}` : '없음', !!f && near(f.x, mold.field.x) && near(f.w, mold.field.w)); }
  add('모드', 'templateMold', tr.mode, tr.mode === 'templateMold');
  out[id] = { size: sizeOf(id), scale: k, rows, pass: rows.filter(r => r.ok === true).length, fail: rows.filter(r => r.ok === false).length, skip: rows.filter(r => r.ok === null).length };
}
writeFileSync(path.join(dir, 'check.json'), JSON.stringify(out, null, 1));
const md = ['# 자소설 틀 검수 표 — ' + M.case + ' (' + M.measuredAt.slice(0, 10) + ')', ''];
for (const [id, c] of Object.entries(out)) {
  md.push(`## ${id} — ✓ ${c.pass} · ✗ ${c.fail}${c.skip ? ` · – ${c.skip}` : ''}`, '', '| 항목 | 기준(틀) | 렌더 | 판정 | 비고 |', '|---|---|---|---|---|');
  for (const r of c.rows) md.push(`| ${r.item} | ${r.std} | ${r.got} | ${r.ok === true ? '✓' : r.ok === false ? '✗' : '–'} | ${r.note} |`);
  md.push('');
}
writeFileSync(path.join(dir, 'check.md'), md.join('\n'));
console.log(Object.entries(out).map(([id, c]) => `${id}: ✓${c.pass} ✗${c.fail}${c.skip ? ` –${c.skip}` : ''}${c.fail ? '  ← ' + c.rows.filter(r => r.ok === false).map(r => r.item).join(', ') : ''}`).join('\n'));
