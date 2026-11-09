// 캠페인 디자인 언어(11-09 AI 디자인 트랙 — docs/ai-design-flow.md 「다른 규격으로 펼치기」).
//   고른 AI 안 하나에서 「지면 색·그라데이션·그래픽 모티프(SVG 조각)·강조 방식·글꼴·글자색」을 뽑아 language 객체로 만들고,
//   다른 규격은 이 언어를 지키며 레이아웃만 새로 짠다(server/freedesign.js spread).
//   두 경로: ① 모델이 HTML 뒤에 낸 `LANGUAGE: {...}` JSON(parseLanguageBlock) ② HTML 에서 직접 뽑기(languageFromHtml). mergeLanguage 가 ①을 우선하고 빈 칸은 ②로 채운다.
//   순수 함수만(브라우저·Node 공용). 그림 dataURL 은 언어에 넣지 않는다.
//
// language = {
//   v: 1, source: 'model'|'html'|'mixed', composition: { id, name } | null,
//   ground: { css: '<지면 background 값>', colors: ['#hex'…] },
//   palette: ['#hex'…](지면 색 먼저, 그다음 많이 쓴 순 최대 6),
//   motifs: [{ kind: 'svg'|'shape', css?, svg? , note? }](최대 3, svg 는 1500자까지),
//   emphasis: { kind: 'tag'|'color'|'weight'|'none', color?, note? },
//   fonts: { families: [..], mainWeight, align: 'left'|'center'|'right' },
//   textColors: { main, sub, date, detail, notice },
//   kvTreatment: { area: 0~1 근사, fit: 'cover'|'contain'|…, bleed: bool } | null,
//   note: '' }

const HEX_RE = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi;
const RGB_RE = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/gi;
const hex6 = h => { const s = String(h).replace('#', ''); return '#' + (s.length === 3 ? s.split('').map(c => c + c).join('') : s).toUpperCase(); };
const rgbHex = (r, g, b) => '#' + [r, g, b].map(n => Math.max(0, Math.min(255, +n)).toString(16).padStart(2, '0')).join('').toUpperCase();
export function colorsIn(css) {
  const out = []; const s = String(css ?? '');
  for (const m of s.matchAll(HEX_RE)) out.push(hex6(m[0]));
  for (const m of s.matchAll(RGB_RE)) if (m[4] == null || +m[4] > 0.2) out.push(rgbHex(m[1], m[2], m[3]));
  return out;
}
const styleOf = tag => /\bstyle="([^"]*)"/i.exec(tag)?.[1] ?? '';
const decl = (st, prop) => { const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i').exec(st); return m ? m[1].trim() : null; };
const bgOf = st => decl(st, 'background') ?? decl(st, 'background-image') ?? decl(st, 'background-color');

// 루트 여는 태그 + 그 안 요소 순회(간이 토크나이저 — 데이터 표식·깊이·필드 안 여부)
export function walk(html) {
  const s = String(html ?? ''); const out = []; const stack = [];
  const re = /<\/?([a-z][a-z0-9]*)\b[^>]*?>/gi; let m;
  const VOID = /^(img|br|hr|input|meta|link|source|wbr|path|circle|rect|ellipse|line|polyline|polygon|stop|use)$/i;
  while ((m = re.exec(s))) {
    const tag = m[0], name = m[1].toLowerCase();
    if (tag[1] === '/') { const i = stack.map(x => x.name).lastIndexOf(name); if (i >= 0) stack.length = i; continue; }
    const field = /\bdata-field="([a-z]+)"/.exec(tag)?.[1] ?? null;
    const inField = stack.some(x => x.field) ? stack.find(x => x.field).field : null;
    const inSvg = stack.some(x => x.name === 'svg');
    const node = { name, tag, index: m.index, depth: stack.length, field, inField, inSvg, kv: /\bdata-(object|kv)="1"/.test(tag), logo: /\bdata-logo="1"/.test(tag), root: /\bdata-ad="1"/.test(tag) };
    out.push(node);
    if (!VOID.test(name) && !/\/>$/.test(tag)) stack.push({ name, field: field ?? null });
  }
  return out;
}
// 짝 닫는 태그까지의 바깥 HTML(같은 이름 중첩 고려)
export function outerAt(html, index) {
  const s = String(html); const open = /^<([a-z][a-z0-9]*)\b[^>]*>/i.exec(s.slice(index)); if (!open) return null;
  const name = open[1]; if (/\/>$/.test(open[0]) || /^(img|br|hr|input)$/i.test(name)) return s.slice(index, index + open[0].length);
  const re = new RegExp(`<${name}\\b[^>]*>|</${name}\\s*>`, 'gi'); re.lastIndex = index; let depth = 0, m;
  while ((m = re.exec(s))) { if (m[0][1] === '/') depth--; else if (!/\/>$/.test(m[0])) depth++; if (depth === 0) return s.slice(index, m.index + m[0].length); }
  return s.slice(index);
}

// HTML → 언어(근사). 모델 JSON 이 없을 때 · 모자랄 때
export function languageFromHtml(html, { composition = null } = {}) {
  const s = String(html ?? ''); const nodes = walk(s);
  const root = nodes.find(n => n.root); const rst = root ? styleOf(root.tag) : '';
  const groundCss = bgOf(rst);
  const freq = new Map(); const add = (c, w = 1) => freq.set(c, (freq.get(c) ?? 0) + w);
  for (const c of colorsIn(groundCss)) add(c, 3);
  // 장식(데이터 표식 없는 요소·필드 밖) — 모티프 후보
  const motifs = [];
  for (const n of nodes) {
    if (n.root || n.kv || n.logo || n.field || n.inField) continue;
    if (n.name === 'svg' && !n.inSvg) {
      const svg = outerAt(s, n.index) ?? ''; for (const c of colorsIn(svg)) add(c, 1);
      if (motifs.length < 3) motifs.push({ kind: 'svg', svg: svg.length > 1500 ? svg.slice(0, 1500) : svg, note: svg.length > 1500 ? '1500자에서 자름' : '' });
      continue;
    }
    if (n.inSvg || n.name !== 'div') continue;
    const st = styleOf(n.tag); const bg = bgOf(st); if (!bg && !/border(?:-[a-z]+)?\s*:/i.test(st)) continue;
    for (const c of colorsIn(st)) add(c, 1);
    if (motifs.length < 3 && (/radius|clip-path|gradient|rotate|border/i.test(st))) motifs.push({ kind: 'shape', css: st.replace(/(?:^|;)\s*(left|top|right|bottom)\s*:[^;]*/gi, '').replace(/^;+/, '').slice(0, 400) });
  }
  // 글자 — 역할별 색·글꼴·강조
  const textColors = {}, families = new Set(); let mainWeight = null, align = 'left'; let emphasis = { kind: 'none' }; let labels = null;
  const rootFam = decl(rst, 'font-family'); if (rootFam) families.add(rootFam.split(',')[0].replace(/['"]/g, '').trim());
  for (const n of nodes.filter(x => x.field)) {
    const st = styleOf(n.tag); const col = decl(st, 'color'); if (col && !textColors[n.field]) textColors[n.field] = colorsIn(col)[0] ?? col;
    const fam = decl(st, 'font-family'); if (fam) families.add(fam.split(',')[0].replace(/['"]/g, '').trim());
    if (n.field === 'main') { const w = decl(st, 'font-weight'); mainWeight = w ? (parseInt(w) || (/bold/i.test(w) ? 700 : 400)) : null; align = decl(st, 'text-align') ?? 'left'; }
    const inner = outerAt(s, n.index) ?? '';
    // 정보 블록 라벨(접수기간·모집직무 앞말) — 첫 자식 span/b 의 칩 모양(11-09 통합: 펼친 규격에서 칩이 사라지던 것)
    if (!labels && /^(date|detail|notice)$/.test(n.field)) { const fm = /^<[a-z]+\b[^>]*>\s*<(span|b|strong|em|i)\b([^>]*)>/i.exec(inner); if (fm) { const ls = styleOf(fm[0].slice(fm[0].lastIndexOf('<'))); const lbg = bgOf(ls); labels = { chip: !!(lbg && !/transparent|none/i.test(lbg)), bg: lbg ? colorsIn(lbg)[0] ?? null : null, color: colorsIn(decl(ls, 'color') ?? '')[0] ?? null, radius: decl(ls, 'border-radius'), weight: parseInt(decl(ls, 'font-weight') ?? '') || null }; } }
    // 강조: 필드 안 span 중 배경 있는 것(태그) > 다른 색 > 굵기
    for (const sm of inner.matchAll(/<(span|b|strong|em|mark)\b([^>]*)>/gi)) {
      const ist = styleOf(sm[0]); const ibg = bgOf(ist); const icol = decl(ist, 'color');
      if (ibg && !/transparent|none/i.test(ibg) && emphasis.kind !== 'tag') { emphasis = { kind: 'tag', color: colorsIn(ibg)[0] ?? null, role: n.field, note: `${n.field} 안 배경 있는 칩` }; continue; }
      if (emphasis.kind === 'none' && icol && col && colorsIn(icol)[0] && colorsIn(icol)[0] !== (colorsIn(col)[0] ?? null)) emphasis = { kind: 'color', color: colorsIn(icol)[0], role: n.field, note: `${n.field} 안 다른 색 한 단어` };
      else if (emphasis.kind === 'none' && (/^(b|strong)$/i.test(sm[1]) || parseInt(decl(ist, 'font-weight') ?? '0') >= 700) && (n.field === 'main' || n.field === 'sub')) emphasis = { kind: 'weight', role: n.field, note: `${n.field} 안 굵기 대비` };
    }
    for (const sm of inner.matchAll(/<[a-z]+\b[^>]*>/gi)) { const f2 = decl(styleOf(sm[0]), 'font-family'); if (f2) families.add(f2.split(',')[0].replace(/['"]/g, '').trim()); }
  }
  for (const c of Object.values(textColors)) if (/^#/.test(c)) add(c, 2);
  // 키비주얼 처리(근사): 첫 그림 요소의 크기·맞춤
  let kvTreatment = null;
  const kvNode = nodes.find(n => n.kv);
  if (kvNode && root) {
    const st = styleOf(kvNode.tag); const W = parseFloat(decl(rst, 'width')), H = parseFloat(decl(rst, 'height'));
    const w = parseFloat(decl(st, 'width')), h = parseFloat(decl(st, 'height'));
    const fit = /\bcover\b/.test(st) ? 'cover' : /\bcontain\b/.test(st) ? 'contain' : (decl(st, 'object-fit') ?? decl(st, 'background-size') ?? null);
    const area = W && H && w && h ? Math.min(1, Math.round((w * h) / (W * H) * 100) / 100) : null;
    const neg = /(?:^|;)\s*(left|top|right|bottom)\s*:\s*-/.test(st);
    kvTreatment = { area, fit, bleed: neg || (area != null && area >= 0.95) };
  }
  const g0 = colorsIn(groundCss);   // 지면 색이 먼저, 그다음 많이 쓴 순
  const palette = [...new Set([...g0, ...[...freq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)])].slice(0, 6);
  return { v: 1, source: 'html', composition, labels, ground: { css: groundCss ?? null, colors: colorsIn(groundCss) }, palette, motifs, emphasis, fonts: { families: [...families].filter(Boolean), mainWeight, align }, textColors, kvTreatment, note: '' };
}

// 모델 응답의 `LANGUAGE: {...}` — 여러 줄 JSON 도 받는다(괄호 짝). 실패면 null
export function parseLanguageBlock(text) {
  const s = String(text ?? ''); const i = s.search(/LANGUAGE\s*[:：]\s*\{/i); if (i < 0) return null;
  const start = s.indexOf('{', i); let depth = 0, inStr = false, esc = false;
  for (let k = start; k < s.length; k++) {
    const c = s[k];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { try { const o = JSON.parse(s.slice(start, k + 1)); return o && typeof o === 'object' ? o : null; } catch { return null; } } }
  }
  return null;
}

// 모델 JSON(자유 모양) → 언어 칸으로 맞추기. 아는 키만 가져온다
function normalizeModel(o) {
  if (!o || typeof o !== 'object') return null;
  const arr = v => Array.isArray(v) ? v : v == null ? [] : [v];
  const hexes = v => arr(v).flatMap(x => colorsIn(typeof x === 'string' ? x : JSON.stringify(x)));
  const out = {};
  const g = o.ground ?? o.background ?? o.bg; if (g) out.ground = typeof g === 'string' ? { css: g, colors: colorsIn(g) } : { css: g.css ?? g.value ?? null, colors: hexes(g.colors ?? g.css ?? []) };
  if (o.palette ?? o.colors) out.palette = hexes(o.palette ?? o.colors).slice(0, 6);
  const mo = o.motifs ?? o.motif ?? o.graphics; if (mo) out.motifs = arr(mo).slice(0, 3).map(m => typeof m === 'string' ? (/<svg/i.test(m) ? { kind: 'svg', svg: m.slice(0, 1500) } : { kind: 'shape', note: m.slice(0, 300) }) : { kind: m.svg ? 'svg' : 'shape', svg: m.svg ? String(m.svg).slice(0, 1500) : undefined, css: m.css ? String(m.css).slice(0, 400) : undefined, note: m.note ?? m.desc ?? m.description ?? '' });
  const em = o.emphasis ?? o.highlight; if (em) out.emphasis = typeof em === 'string' ? { kind: /tag|태그|칩|뱃지/.test(em) ? 'tag' : /color|색/.test(em) ? 'color' : /weight|굵/.test(em) ? 'weight' : 'none', note: em } : { kind: em.kind ?? em.type ?? 'none', color: hexes(em.color)[0] ?? null, note: em.note ?? em.desc ?? '' };
  const fo = o.fonts ?? o.font; if (fo) out.fonts = typeof fo === 'string' ? { families: [fo] } : Array.isArray(fo) ? { families: fo.map(String) } : { families: arr(fo.families ?? fo.family).map(String), mainWeight: fo.mainWeight ?? fo.weight ?? null, align: fo.align ?? null };
  const tc = o.textColors ?? o.textColor; if (tc && typeof tc === 'object') { out.textColors = {}; for (const [k, v] of Object.entries(tc)) { const c = hexes(v)[0]; if (c) out.textColors[k] = c; } }
  if (o.note ?? o.notes) out.note = String(o.note ?? o.notes).slice(0, 400);
  return out;
}

// 모델 우선, 빈 칸은 HTML 추출로
export function mergeLanguage(model, fromHtml) {
  const m = normalizeModel(model); if (!m) return { ...fromHtml, source: 'html' };
  const out = { ...fromHtml };
  let used = 0;
  for (const [k, v] of Object.entries(m)) {
    const empty = v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.values(v).some(x => x != null && x !== '' && !(Array.isArray(x) && !x.length)));
    if (empty) continue;
    out[k] = typeof v === 'object' && !Array.isArray(v) && typeof fromHtml[k] === 'object' && fromHtml[k] && !Array.isArray(fromHtml[k]) ? { ...fromHtml[k], ...Object.fromEntries(Object.entries(v).filter(([, x]) => x != null && x !== '')) } : v;
    used++;
  }
  // 모티프는 합친다(모델 먼저, HTML 에만 있는 svg — 고친 안에 더해진 물결 등 — 도 잇는다, 최대 3)
  if (m.motifs?.length && fromHtml.motifs?.length) { const key = x => String(x.svg ?? x.css ?? x.note ?? '').replace(/\s+/g, '').slice(0, 120); const seen = new Set(m.motifs.map(key)); out.motifs = [...m.motifs, ...fromHtml.motifs.filter(x => x.kind === 'svg' && !seen.has(key(x)))].slice(0, 3); }
  out.source = used ? 'mixed' : 'html';
  return out;
}

// 응답 텍스트 + HTML → 언어(한 번에)
export function languageOf(text, html, { composition = null } = {}) {
  return mergeLanguage(parseLanguageBlock(text), languageFromHtml(html, { composition }));
}

// spread 프롬프트용 — 언어를 지킬 것들(문장)
export function languageLines(lang) {
  if (!lang) return [];
  const L = [`## 캠페인 디자인 언어 (반드시 지킨다 — 같은 캠페인의 다른 규격이다. 바꾸는 건 레이아웃(자리·크기·줄바꿈)뿐)`];
  if (lang.composition?.name) L.push(`- 구성: ${lang.composition.name}${lang.composition.hint ? ` — ${lang.composition.hint}` : ''} (규격 비율에 맞게 같은 구성 감각으로)`);
  if (lang.ground?.css) L.push(`- 지면: background: ${String(lang.ground.css).slice(0, 300)}`);
  if (lang.palette?.length) L.push(`- 색 팔레트(이 색들만): ${lang.palette.join(' ')}`);
  for (const [i, m] of (lang.motifs ?? []).entries()) {
    if (m.svg) { L.push(`- 그래픽 모티프 ${i + 1}(SVG 조각 — 같은 모양·색으로 이 규격에 다시 배치·반복):`); L.push('```html'); L.push(m.svg); L.push('```'); }
    else if (m.css || m.note) L.push(`- 그래픽 모티프 ${i + 1}: ${m.note ? m.note + ' ' : ''}${m.css ? `(CSS ${m.css})` : ''}`);
  }
  if (lang.emphasis?.kind && lang.emphasis.kind !== 'none') L.push(`- 강조 방식: ${({ tag: '태그(배경 칩)', color: '색 한 단어', weight: '굵기 대비' })[lang.emphasis.kind] ?? lang.emphasis.kind}${lang.emphasis.color ? ` ${lang.emphasis.color}` : ''}${lang.emphasis.note ? ` — ${lang.emphasis.note}` : ''}`);
  if (lang.labels) L.push(lang.labels.chip ? `- 정보 라벨(접수기간·모집직무 같은 앞말): 배경 ${lang.labels.bg ?? ''} 칩${lang.labels.color ? ` · 글자 ${lang.labels.color}` : ''}${lang.labels.radius ? ` · 모서리 ${lang.labels.radius}` : ''} — 모든 규격에서 같은 칩 모양으로` : `- 정보 라벨: 칩 없이${lang.labels.color ? ` 글자색 ${lang.labels.color}` : ''}${lang.labels.weight ? ` · 굵기 ${lang.labels.weight}` : ''}`);
  if (lang.fonts?.families?.length) L.push(`- 글꼴: ${lang.fonts.families.join(', ')}${lang.fonts.mainWeight ? ` · 메인 굵기 ${lang.fonts.mainWeight}` : ''}${lang.fonts.align ? ` · 정렬 ${lang.fonts.align}` : ''} (규격 글꼴 규정이 있으면 규정이 우선)`);
  const tc = Object.entries(lang.textColors ?? {}); if (tc.length) L.push(`- 글자색: ${tc.map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  if (lang.kvTreatment) L.push(`- 키비주얼 처리: ${lang.kvTreatment.fit ?? ''}${lang.kvTreatment.bleed ? ' · 지면 밖으로 흘림(블리드)' : ''}${lang.kvTreatment.area != null ? ` · 원안 면적 ${Math.round(lang.kvTreatment.area * 100)}%` : ''}`);
  if (lang.note) L.push(`- 메모: ${lang.note}`);
  return L;
}
