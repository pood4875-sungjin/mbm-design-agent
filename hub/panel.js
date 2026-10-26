// 오른쪽 편집 패널(피그마 UI3 Design 탭 그대로) + 왼쪽 패널(파일 · 입력 · 에셋 · 도구 · 검수)
import { findNode, parentOf, walk, solid, imageFill, stroke, effect, BLENDS, BLEND_KO, FONTS, collectColors, relayout, applyConstraints, exById, kvImg, FIELDS, uid, setFontAll, setTextColorAll, applyFieldsToText, replaceKv, applyPalette, paletteFromImage, LOGO_IMG, EXAMPLES, pageOf, shortName, refImg } from './doc.js';
import { ic } from './fui/icons3.js';
import { thumbnail } from './export.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 0) => { const s = String(v).trim(); if (/^[-+]?\d*\.?\d+([-+*/]\d*\.?\d+)*$/.test(s)) { try { return Math.round(Function('"use strict";return (' + s + ')')() * 100) / 100; } catch { /* 식 아님 */ } } const n = parseFloat(s); return isNaN(n) ? d : n; };
const same = (arr, get) => { const v = get(arr[0]); return arr.every(n => JSON.stringify(get(n)) === JSON.stringify(v)) ? v : undefined; };
const MIX = '혼합';
const field = (k, v, { label = k, unit = '', cls = '', icon = '', id = '' } = {}) => `<div class="inw${unit ? ' unit' : ''}">${icon ? ic(icon, 'k') : `<span class="k">${label}</span>`}<input class="in mono ${cls}" data-p="${k}" ${id ? `data-id="${id}"` : ''} value="${v === undefined ? MIX : esc(v)}" aria-label="${esc(label)}">${unit ? `<span class="u">${unit}</span>` : ''}</div>`;
const sel = (k, v, opts, extra = '') => `<select class="in" data-p="${k}" ${extra}>${v === undefined ? `<option value="" selected>${MIX}</option>` : ''}${opts.map(([val, lb]) => `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(lb)}</option>`).join('')}</select>`;
const colorRow = (c, { kind, idx, nid, extra = '' }) => `<div class="crow${c.visible === false ? ' off' : ''}" data-kind="${kind}" data-idx="${idx}" data-nid="${nid}"><div class="cin"><span class="swatch"><i style="background:${esc(c.color)}"></i><input type="color" value="${esc(c.color)}" data-c="color"></span><input class="hex" data-c="hex" value="${esc(c.color.replace('#', ''))}" maxlength="6" spellcheck="false">${extra}</div><input class="pct" data-c="opacity" value="${Math.round((c.opacity ?? 1) * 100)}%"><button class="ib s t2" data-c="eye" aria-label="보이기">${ic(c.visible === false ? 'eye-off' : 'eye')}</button><button class="ib s t2" data-c="del" aria-label="빼기">${ic('minus')}</button></div>`;

// ─────────────────────────── 오른쪽 패널 ───────────────────────────
export function renderRight(ctx) {
  const { ed, doc, el, toast } = ctx; const page = ed.page; const nodes = ed.selNodes();
  const zoomTxt = Math.round((ed.zoom ?? 1) * 100) + '%';
  const top = `<div class="rtop"><div class="avas"><span class="ava" style="background:#9747FF" title="나">성</span><span class="ava" style="background:#14AE5C" title="수민">수</span></div><span class="grow"></span><button class="ib t2" data-act="play" title="미리보기">${ic('play')}</button><button class="btn pri" data-act="export">내보내기</button></div>
    <div class="rtabs"><button class="rtab" data-rt="design" aria-selected="${ctx.rt !== 'check'}">디자인 ${ic('chev-d')}</button><button class="rtab" data-rt="check" aria-selected="${ctx.rt === 'check'}">검수</button><span class="grow"></span><button class="tabbtn" data-act="zoom" aria-haspopup="menu">${zoomTxt} ${ic('chev-d')}</button></div>`;
  let body = '';
  if (ctx.rt === 'check') body = checkPanel(ctx);
  else if (!nodes.length) body = pagePanel(ctx);
  else body = nodePanel(ctx, nodes);
  el.innerHTML = top + `<div class="pbody">${body}</div>`;
  bindRight(ctx, nodes);
}

function pagePanel(ctx) {
  const { ed, doc } = ctx; const page = ed.page;
  return `<div class="sec">페이지<span class="grow"></span><button class="ib s t2" data-act="page-bg-reset" title="기본 색">${ic('swap')}</button></div><div class="grp">${colorRow({ color: page.bg || '#F5F5F5', opacity: 1, visible: true }, { kind: 'page', idx: 0, nid: 'page' }).replace(/<button class="ib s t2" data-c="del"[^>]*>.*?<\/button>/, '')}</div><hr>
    <div class="sec">스타일<span class="grow"></span><button class="ib s t2" data-act="style-add" title="색 스타일 추가">${ic('plus')}</button></div><div class="grp"><div class="lbl first">색 스타일</div>${doc.styles.map(s => `<div class="srow" data-style="${s.id}"><span class="swatch"><i style="background:${esc(s.color)}"></i><input type="color" value="${esc(s.color)}" data-style-c="${s.id}"></span><span class="nm" contenteditable="true" spellcheck="false" data-style-n="${s.id}">${esc(s.name)}</span><button class="ib s t2" data-style-del="${s.id}" aria-label="삭제">${ic('minus')}</button></div>`).join('') || '<div class="t3">아직 없음 · 선택 색에서 + 로 추가</div>'}</div><hr>
    <div class="sec">전체 글자</div><div class="grp"><div class="lbl first">글꼴(문서 전체)</div>${sel('font-all', doc.font ?? 'Pretendard', FONTS.map(f => [f[0], f[0]]))}<div class="lbl">글자색(문서 전체)</div>${colorRow({ color: doc.palette?.fg ?? exById(doc.ex).palette.fg, opacity: 1, visible: true }, { kind: 'text-all', idx: 0, nid: 'doc' }).replace(/<button class="ib s t2" data-c="(eye|del)"[^>]*>.*?<\/button>/g, '')}</div><hr>
    <div class="sec">키비주얼 · 지면</div><div class="grp"><div class="kvrow"><img src="${esc(doc.kvSrc ?? kvImg(exById(doc.ex)))}" alt=""><div class="grow"><div class="med">키비주얼</div><div class="t2">바꾸면 지면 · 글자색이 그림에 맞춰 자동으로</div></div></div><div class="r2" style="margin-top:8px"><button class="btn" data-act="kv-pick">바꾸기</button><button class="btn" data-act="kv-auto">색 다시 맞춤</button></div>
      <div class="lbl">지면 색(전체)</div>${colorRow({ color: doc.palette?.bg ?? exById(doc.ex).palette.bg, opacity: 1, visible: true }, { kind: 'bg-all', idx: 0, nid: 'doc' }).replace(/<button class="ib s t2" data-c="(eye|del)"[^>]*>.*?<\/button>/g, '')}<input type="file" accept="image/*" hidden data-kv-file></div><hr>
    <div class="sec">내보내기<span class="grow"></span><button class="ib s t2" data-act="export" title="내보내기">${ic('plus')}</button></div><div class="grp"><div class="r2x"><select class="in" data-exp="scale"><option value="1">1x</option><option value="2">2x</option><option value="0.5">0.5x</option></select><select class="in" data-exp="scope"><option value="all">전체 ${page.children.length}</option><option value="approved">승인한 것 ${doc.approved.length}</option></select><button class="ib t2" data-act="export">${ic('export')}</button></div><div class="t2" style="margin-top:8px">PNG · 매체별 폴더 ZIP</div></div><hr>
    <div class="sec">도구</div><div class="grp"><div class="r2"><button class="btn" data-act="regen">다시 생성</button><button class="btn" data-act="tidy">보드 정리</button></div><div class="r2" style="margin-top:8px"><button class="btn" data-act="rulers" aria-pressed="${ed.showRulers}">룰러 ${ed.showRulers ? '끄기' : '켜기'}</button><button class="btn" data-act="coords" aria-pressed="${ed.showCoords}">좌표 ${ed.showCoords ? '끄기' : '켜기'}</button></div><div class="t2" style="margin-top:8px">⌥ 누르고 다른 레이어에 올리면 간격 · 룰러는 선택 범위를 표시</div></div>`;
}

function nodePanel(ctx, nodes) {
  const { ed, doc } = ctx; const n0 = nodes[0]; const multi = nodes.length > 1;
  const types = new Set(nodes.map(n => n.type)); const typeKo = { frame: '프레임', group: '그룹', rect: '사각형', image: '이미지', text: '텍스트' };
  const head = multi ? `${nodes.length}개 선택` : typeKo[n0.type];
  const g = f => same(nodes, f);
  const isCont = [...types].every(t => t === 'frame' || t === 'group');
  const onlyFrames = [...types].every(t => t === 'frame');
  const inFrame = nodes.every(n => parentOf(ed.page, n.id) !== ed.page);
  let h = `<div class="sec">${head}${!multi ? `<span class="t2" style="font-weight:400;margin-left:6px">${esc(n0.name)}</span>` : ''}<span class="grow"></span>${onlyFrames && !multi ? `<button class="btn sm${doc.approved.includes(n0.id) ? '' : ' pri'}" data-act="approve">${doc.approved.includes(n0.id) ? '승인 취소' : '승인'}</button>` : ''}<button class="ib s t2" data-act="more" aria-haspopup="menu">${ic('more')}</button></div>`;
  // 정렬
  h += `<div class="grp"><div class="lbl first">정렬</div><div class="align"><button data-al="l" title="왼쪽 정렬">${ic('al-l')}</button><button data-al="c" title="가로 가운데">${ic('al-c')}</button><button data-al="r" title="오른쪽 정렬">${ic('al-r')}</button><span></span><button data-al="t" title="위 정렬">${ic('al-t')}</button><button data-al="m" title="세로 가운데">${ic('al-m')}</button><button data-al="b" title="아래 정렬">${ic('al-b')}</button><span></span><button data-act="dist" title="간격 고르게" ${nodes.length < 3 ? 'disabled' : ''}>${ic('dist')}</button></div>`;
  // 위치
  h += `<div class="lbl">위치</div><div class="r2x">${field('x', g(n => Math.round(n.x)), { label: 'X' })}${field('y', g(n => Math.round(n.y)), { label: 'Y' })}<button class="ib t2" data-act="abs" title="페이지 기준 좌표 보기">${ic('con-h')}</button></div>`;
  // 제약(프레임 안 레이어만)
  if (inFrame) { const ch = g(n => n.constraints?.h ?? 'left'), cv = g(n => n.constraints?.v ?? 'top');
    h += `<div class="lbl">제약</div><div class="r2"><div>${sel('con-h', ch, [['left', '왼쪽'], ['right', '오른쪽'], ['center', '가운데'], ['stretch', '좌우 늘림'], ['scale', '비율']], 'class="in icon"')}<div style="height:8px"></div>${sel('con-v', cv, [['top', '위'], ['bottom', '아래'], ['center', '가운데'], ['stretch', '상하 늘림'], ['scale', '비율']])}</div><div class="conbox" data-conbox><i class="t" data-con="v:top"></i><i class="b" data-con="v:bottom"></i><i class="l" data-con="h:left"></i><i class="r" data-con="h:right"></i><b></b></div></div>`; }
  // 회전
  h += `<div class="lbl">회전</div><div class="r2x" style="grid-template-columns:1fr 32px 32px 32px;gap:4px">${field('rotation', g(n => n.rotation ?? 0), { label: '∟', unit: '°' })}<button class="ib t2" data-act="rot90" title="90° 돌리기">${ic('rot')}</button><button class="ib t2" data-act="flip-h" title="좌우 뒤집기">${ic('flip-h')}</button><button class="ib t2" data-act="flip-v" title="상하 뒤집기">${ic('flip-v')}</button></div></div><hr>`;
  // 레이아웃
  const flow = g(n => n.layout?.flow ?? 'none');
  h += `<div class="sec">레이아웃${isCont ? `<span class="grow"></span><button class="ib s t2" data-act="layout-add" title="자동 레이아웃">${ic('flow-v')}</button>` : ''}</div><div class="grp">`;
  if (isCont) { h += `<div class="lbl first">흐름</div><div class="seg">${[['none', 'flow-none', '없음'], ['v', 'flow-v', '세로'], ['h', 'flow-h', '가로'], ['wrap', 'flow-wrap', '줄바꿈']].map(([v, i, t]) => `<button data-flow="${v}" aria-pressed="${flow === v}" title="${t}">${ic(i)}</button>`).join('')}</div>`;
    if (flow && flow !== 'none') h += `<div class="r2" style="margin-top:8px">${field('gap', g(n => n.layout?.gap ?? 8), { label: '', icon: 'gap' })}${field('pad', g(n => n.layout?.pad ?? 0), { label: '', icon: 'pad' })}</div>`; }
  h += `<div class="lbl${isCont ? '' : ' first'}">크기</div><div class="r2x">${field('w', g(n => Math.round(n.w)), { label: 'W' })}${field('h', g(n => Math.round(n.h)), { label: 'H' })}<button class="ib t2" data-act="ratio" aria-pressed="${!!ctx.ratioLock}" title="비율 고정">${ic(ctx.ratioLock ? 'ratio-on' : 'ratio')}</button></div>`;
  if (onlyFrames && n0.specId) h += `<div class="t2" style="margin-top:6px">매체 규격 ${esc(n0.media)} · 원래 크기 ${esc(String(n0.w))}×${esc(String(n0.h))} <button class="btn sm" data-act="size-reset" style="margin-left:4px">규격으로</button></div>`;
  if (types.has('text')) { h += `<div class="lbl">글자 상자</div><div class="seg">${[['width', 'auto-w', '자동 너비'], ['height', 'auto-h', '자동 높이'], ['fixed', 'fixed', '고정']].map(([v, i, t]) => `<button data-tauto="${v}" aria-pressed="${g(n => n.text?.auto) === v}" title="${t}">${ic(i)}</button>`).join('')}</div>`; }
  h += `</div><hr>`;
  // 외관
  const op = g(n => Math.round((n.opacity ?? 1) * 100)), rad = g(n => n.radius ?? 0);
  h += `<div class="sec">외관</div><div class="grp"><div class="lbl first">불투명도</div><div class="sl-row">${field('opacity', op, { label: '', icon: 'opacity', unit: '%' })}<input type="range" class="slider blue" min="0" max="100" value="${op ?? 100}" data-sl="opacity" style="--p:${op ?? 100}%"><button class="ib s t2" data-act="vis" title="숨기기/보이기">${ic(g(n => n.visible !== false) === false ? 'eye-off' : 'eye')}</button></div>
    <div class="lbl">모서리</div><div class="sl-row">${field('radius', rad, { label: '', icon: 'radius' })}<input type="range" class="slider" min="0" max="${Math.round(Math.min(...nodes.map(n => Math.min(n.w, n.h))) / 2)}" value="${rad ?? 0}" data-sl="radius"><button class="ib s t2" data-act="radius-ind" title="모서리 따로(준비 중)">${ic('radius-ind')}</button></div>
    <div class="lbl">혼합 모드</div>${sel('blend', g(n => n.blend ?? 'normal'), BLENDS.map(b => [b, BLEND_KO[b]]), 'class="in icon"')}</div><hr>`;
  // 글자
  if (types.has('text') && types.size === 1) { const t = k => g(n => n.text[k]);
    h += `<div class="sec">글자<span class="grow"></span><button class="ib s t2" data-act="font-all-apply" title="이 글꼴을 문서 전체에">${ic('styles')}</button></div><div class="grp">${sel('t-family', t('family'), FONTS.map(f => [f[0], f[0]]))}<div class="r2" style="margin-top:8px">${sel('t-weight', t('weight'), [[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold'], [800, 'ExtraBold']])}${field('t-size', t('size'), { label: '', icon: 'fsize' })}</div>
      <div class="r2" style="margin-top:8px">${field('t-lh', t('lineHeight') === undefined ? undefined : Math.round(t('lineHeight') * 100), { label: '', icon: 'lh', unit: '%' })}${field('t-ls', t('letterSpacing') === undefined ? undefined : Math.round(t('letterSpacing') * 100), { label: '', icon: 'ls', unit: '%' })}</div>
      <div class="r2" style="margin-top:8px"><div class="seg">${[['left', 'ta-l'], ['center', 'ta-c'], ['right', 'ta-r']].map(([v, i]) => `<button data-talign="${v}" aria-pressed="${t('align') === v}">${ic(i)}</button>`).join('')}</div><div class="seg">${[['top', 'tv-t'], ['middle', 'tv-m'], ['bottom', 'tv-b']].map(([v, i]) => `<button data-tvalign="${v}" aria-pressed="${t('valign') === v}">${ic(i)}</button>`).join('')}</div></div>
      ${!multi ? `<div class="lbl">내용</div><textarea class="in" data-p="t-content" rows="3">${esc(n0.text.content)}</textarea>` : ''}</div><hr>`; }
  // 채움
  const fillsSame = g(n => n.fills);
  h += `<div class="sec">채움<span class="grow"></span>${!multi ? `<button class="ib s t2" data-act="fill-style" title="스타일에서 고르기" aria-haspopup="menu">${ic('styles')}</button>` : ''}<button class="ib s t2" data-act="fill-add" title="채움 추가">${ic('plus')}</button></div><div class="grp">`;
  if (multi && fillsSame === undefined) h += `<div class="t3">+ 를 누르면 혼합 내용을 바꿔요</div>`;
  else { const fl = n0.fills ?? []; if (!fl.length) h += `<div class="t3">없음</div>`;
    fl.forEach((f, i) => { if (f.type === 'solid') h += colorRow(f, { kind: 'fill', idx: i, nid: n0.id }); else h += `<div class="crow${f.visible === false ? ' off' : ''}" data-kind="fill" data-idx="${i}" data-nid="${n0.id}"><div class="cin" style="padding-left:4px"><span class="swatch lg"><img src="${esc(f.src)}" alt=""></span><select class="in" data-c="fit" style="height:24px;background-color:transparent;padding-left:4px"><option value="cover" ${f.fit === 'cover' ? 'selected' : ''}>채움(cover)</option><option value="contain" ${f.fit === 'contain' ? 'selected' : ''}>맞춤(contain)</option><option value="fill" ${f.fit === 'fill' ? 'selected' : ''}>늘림</option></select></div><button class="ib s t2" data-c="img" title="그림 바꾸기">${ic('img')}</button><button class="ib s t2" data-c="eye">${ic(f.visible === false ? 'eye-off' : 'eye')}</button><button class="ib s t2" data-c="del">${ic('minus')}</button></div>`; }); }
  h += `</div><hr>`;
  // 선
  if (!types.has('text') || types.size > 1) { h += `<div class="sec">선<span class="grow"></span><button class="ib s t2" data-act="stroke-add" title="선 추가">${ic('plus')}</button></div><div class="grp">`;
    const st = n0.strokes ?? []; if (!st.length) h += `<div class="t3">없음</div>`;
    st.forEach((s, i) => { h += colorRow(s, { kind: 'stroke', idx: i, nid: n0.id }); });
    if (st.length) h += `<div class="r2" style="margin-top:4px">${field('stroke-w', g(n => n.strokes?.[0]?.width), { label: '', icon: 'measure' })}${sel('stroke-align', g(n => n.strokes?.[0]?.align ?? 'inside'), [['inside', '안쪽'], ['center', '가운데'], ['outside', '바깥']])}</div>`;
    h += `</div><hr>`; }
  // 효과
  h += `<div class="sec">효과<span class="grow"></span><button class="ib s t2" data-act="effect-add" title="효과 추가">${ic('plus')}</button></div><div class="grp">`;
  const ef = n0.effects ?? []; if (!ef.length) h += `<div class="t3">없음</div>`;
  ef.forEach((e, i) => { h += `<div class="erow${e.visible === false ? ' off' : ''}" data-kind="effect" data-idx="${i}" data-nid="${n0.id}"><div class="r2x" style="grid-template-columns:1fr 24px 24px;gap:4px"><select class="in" data-c="type"><option value="drop" ${e.type === 'drop' ? 'selected' : ''}>그림자</option><option value="inner" ${e.type === 'inner' ? 'selected' : ''}>안쪽 그림자</option><option value="blur" ${e.type === 'blur' ? 'selected' : ''}>레이어 흐림</option><option value="bgblur" ${e.type === 'bgblur' ? 'selected' : ''}>배경 흐림</option></select><button class="ib s t2" data-c="eye">${ic(e.visible === false ? 'eye-off' : 'eye')}</button><button class="ib s t2" data-c="del">${ic('minus')}</button></div>
    ${e.type === 'drop' || e.type === 'inner' ? `<div class="r3" style="margin-top:4px">${field('e-x', e.x, { label: 'X' })}${field('e-y', e.y, { label: 'Y' })}${field('e-blur', e.blur, { label: 'B' })}</div><div class="r2" style="margin-top:4px">${field('e-spread', e.spread ?? 0, { label: 'S' })}<div class="crow" style="grid-template-columns:1fr 56px;margin:0"><div class="cin"><span class="swatch"><i style="background:${esc(e.color)}"></i><input type="color" value="${esc(e.color)}" data-c="color"></span><input class="hex" data-c="hex" value="${esc(e.color.replace('#', ''))}" maxlength="6"></div><input class="pct" data-c="opacity" value="${Math.round(e.opacity * 100)}%"></div></div>` : `<div class="r2" style="margin-top:4px">${field('e-blur', e.blur, { label: 'B' })}<span></span></div>`}</div>`; });
  h += `</div><hr>`;
  // 선택 색
  const cols = collectColors(nodes); if (cols.size) { h += `<div class="sec">선택 색<span class="grow"></span><span class="t2" style="font-weight:400">${cols.size}</span></div><div class="grp">`; for (const [c, list] of cols) h += `<div class="crow" data-kind="selcolor" data-color="${esc(c)}" style="grid-template-columns:1fr 24px"><div class="cin"><span class="swatch"><i style="background:${esc(c)}"></i><input type="color" value="${esc(c)}" data-c="color"></span><input class="hex" data-c="hex" value="${esc(c.replace('#', ''))}" maxlength="6"><span class="t3">${list.length}</span></div><button class="ib s t2" data-c="tostyle" title="스타일로 저장">${ic('plus')}</button></div>`; h += `</div><hr>`; }
  // 내보내기
  h += `<div class="sec">내보내기<span class="grow"></span><button class="ib s t2" data-act="export-sel" title="선택 내보내기">${ic('plus')}</button></div><div class="grp"><div class="r2x"><select class="in" data-exp="scale"><option value="1">1x</option><option value="2">2x</option><option value="3">3x</option></select><select class="in"><option>PNG</option></select><button class="ib t2" data-act="export-sel">${ic('export')}</button></div></div>`;
  return h;
}

function checkPanel(ctx) {
  const { ed, doc } = ctx; const nodes = ed.selNodes(); const frames = nodes.length ? nodes.map(n => ed.page.children.find(f => f.id === n.id) ?? ed.page.children.find(f => { let hit = false; walk([f], x => { if (x.id === n.id) hit = true; }); return hit; })).filter(Boolean) : ed.page.children;
  const uniq = [...new Set(frames)]; const results = uniq.map(f => ({ f, issues: checkFrame(f) }));
  const bad = results.filter(r => r.issues.length).length;
  let h = `<div class="sec">가이드 검수<span class="grow"></span><span class="t2" style="font-weight:400">${uniq.length}개 중 지적 ${bad}</span></div><div class="grp"><div class="r2"><button class="btn" data-act="check-all">전체 다시 검사</button><button class="btn pri" data-act="approve-ok">문제 없는 것 승인</button></div></div><hr>`;
  for (const { f, issues } of results.slice(0, 60)) { h += `<div class="chkf"><button class="lrow" data-sel-id="${f.id}" aria-selected="${ed.sel.includes(f.id)}"><span class="li">${ic(issues.length ? 'warning' : 'check')}</span><span class="nm">${esc(f.name)}</span><span class="meta">${f.w}×${f.h}${doc.approved.includes(f.id) ? ' · 승인' : ''}</span></button>${issues.map(i => `<button class="issue" data-sel-id="${i.id ?? f.id}"><span class="dot ${i.level}"></span>${esc(i.msg)}</button>`).join('')}</div>`; }
  return h;
}
// 간단 검수: 글자-그림 겹침 · 프레임 밖 · 너무 작은 글자 · 로고 · 글자 대비
export function checkFrame(f) {
  const out = []; const lum = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return .5; const v = parseInt(m[1], 16); const c = [v >> 16, (v >> 8) & 255, v & 255].map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const bg = f.children.find(c => c.type === 'rect' && c.name === '배경')?.fills?.[0]?.color ?? f.fills?.[0]?.color ?? '#FFFFFF';
  const imgs = f.children.filter(c => c.type === 'image' && c.visible !== false && c.name !== '로고');
  const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  for (const c of f.children) { if (c.visible === false) continue;
    if (c.x < 0 || c.y < 0 || c.x + c.w > f.w + .5 || c.y + c.h > f.h + .5) { if (!(c.type === 'image' && c.name === '키비주얼') && c.name !== '배경') out.push({ id: c.id, level: 'warn', msg: `${c.name}이(가) 프레임 밖으로 나감` }); }
    if (c.type === 'text') { if (c.text.size < 10) out.push({ id: c.id, level: 'warn', msg: `${c.name} 글자 ${c.text.size}px — 10px 미만` });
      for (const im of imgs) { const ov = inter(c, im) / (c.w * c.h); if (ov > .15) out.push({ id: c.id, level: 'bad', msg: `${c.name}이(가) ${im.name}과 ${Math.round(ov * 100)}% 겹침` }); }
      const tc = c.fills?.[0]?.color; if (tc) { const l1 = lum(tc), l2 = lum(bg); const cr = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); if (cr < 3) out.push({ id: c.id, level: 'bad', msg: `${c.name} 글자 대비 ${cr.toFixed(1)}:1 — 3:1 미만` }); } } }
  const logo = f.children.find(c => c.name === '로고'); if (!logo) out.push({ level: 'warn', msg: '로고 없음' }); else if (logo.h < 10) out.push({ id: logo.id, level: 'warn', msg: `로고 높이 ${Math.round(logo.h)}px — 너무 작음` });
  return out;
}

function bindRight(ctx, nodes) {
  const { ed, doc, el, toast, commit, rerender, openExport, menu } = ctx; const page = ed.page;
  const apply = (fn, label) => { for (const n of nodes) fn(n); for (const n of nodes) { if (n.children) relayout(n); ed.refresh(n.id); } ed.updateOverlay(); commit(label); };
  el.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { ctx.rt = b.dataset.rt; rerender('right'); });
  el.querySelector('[data-act="export"]')?.addEventListener('click', () => openExport({ scope: el.querySelector('[data-exp="scope"]')?.value ?? 'all', scale: +(el.querySelector('[data-exp="scale"]')?.value ?? 1) }));
  el.querySelectorAll('[data-act="export-sel"]').forEach(b => b.onclick = () => openExport({ scope: 'selection', scale: +(el.querySelector('[data-exp="scale"]')?.value ?? 1) }));
  el.querySelector('[data-act="play"]')?.addEventListener('click', () => ctx.preview?.());
  el.querySelector('[data-act="zoom"]')?.addEventListener('click', e => { e.stopPropagation(); menu(e.currentTarget, [['화면에 맞춤', '⇧1', () => ed.fit()], ['선택에 맞춤', '⇧2', () => ed.zoomTo()], ['확대', '+', () => ed.setZoom(ed.zoom * 1.25)], ['축소', '−', () => ed.setZoom(ed.zoom / 1.25)], null, ['50%', '', () => ed.setZoom(.5)], ['100%', '⇧0', () => ed.setZoom(1)], ['200%', '', () => ed.setZoom(2)]]); });
  // 수치 입력(식 · 화살표)
  el.querySelectorAll('input[data-p]').forEach(inp => {
    const key = inp.dataset.p; const isNum = inp.classList.contains('mono');
    const commitVal = () => { const raw = inp.value; if (raw === MIX) return; const v = isNum ? num(raw) : raw; setProp(ctx, nodes, key, v, inp); };
    inp.onchange = commitVal; inp.onfocus = () => inp.select();
    inp.onkeydown = e => { if (e.key === 'Enter') { inp.blur(); } else if (isNum && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); const d = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1); inp.value = String(num(inp.value) + d); commitVal(); } };
  });
  el.querySelectorAll('textarea[data-p]').forEach(ta => { ta.onchange = () => setProp(ctx, nodes, ta.dataset.p, ta.value, ta); });
  el.querySelectorAll('select[data-p]').forEach(s => { s.onchange = () => { if (s.dataset.p === 'font-all') { setFontAll(doc, s.value); ed.render(); commit('전체 글꼴'); toast(`전체 글꼴 → ${s.value}`); return; } setProp(ctx, nodes, s.dataset.p, s.value, s); }; });
  el.querySelectorAll('input[data-sl]').forEach(sl => { const key = sl.dataset.sl; sl.oninput = () => { sl.style.setProperty('--p', sl.value + '%'); const v = +sl.value; for (const n of nodes) { if (key === 'opacity') n.opacity = v / 100; else n.radius = v; ed.refresh(n.id); } const f = el.querySelector(`input[data-p="${key}"]`); if (f) f.value = String(v); }; sl.onchange = () => { ed.updateOverlay(); commit(key); }; });
  el.querySelectorAll('[data-al]').forEach(b => b.onclick = () => ed.align(b.dataset.al));
  el.querySelector('[data-act="dist"]')?.addEventListener('click', e => { e.stopPropagation(); menu(e.currentTarget, [['가로 간격 고르게', '', () => ed.align('dh')], ['세로 간격 고르게', '', () => ed.align('dv')]]); });
  el.querySelector('[data-act="rot90"]')?.addEventListener('click', () => apply(n => { n.rotation = ((n.rotation ?? 0) + 90) % 360; }, '회전'));
  el.querySelector('[data-act="flip-h"]')?.addEventListener('click', () => apply(n => { n.rotation = (360 - (n.rotation ?? 0)) % 360; if (n.text) n.text.align = n.text.align === 'left' ? 'right' : n.text.align === 'right' ? 'left' : n.text.align; if (n.layout?.flow === 'h') n.children.reverse(); else if (n.children && !n.layout) for (const k of n.children) k.x = n.w - k.x - k.w; }, '좌우 뒤집기'));
  el.querySelector('[data-act="flip-v"]')?.addEventListener('click', () => apply(n => { n.rotation = (360 - (n.rotation ?? 0)) % 360; if (n.children && !n.layout) for (const k of n.children) k.y = n.h - k.y - k.h; else if (n.layout?.flow === 'v') n.children.reverse(); }, '상하 뒤집기'));
  el.querySelector('[data-act="abs"]')?.addEventListener('click', () => { const b = ed.bbox(ed.sel); toast(`페이지 기준 X ${Math.round(b.x)} · Y ${Math.round(b.y)}`); });
  el.querySelector('[data-act="ratio"]')?.addEventListener('click', () => { ctx.ratioLock = !ctx.ratioLock; rerender('right'); });
  el.querySelector('[data-act="size-reset"]')?.addEventListener('click', () => apply(n => { const sp = ctx.specById?.(n.specId); if (sp) { const ow = n.w, oh = n.h; n.w = sp.w; n.h = sp.h; applyConstraints(n, ow, oh); } }, '규격 크기'));
  el.querySelector('[data-act="vis"]')?.addEventListener('click', () => { apply(n => { n.visible = n.visible === false; }, '보이기'); rerender('right'); rerender('left'); });
  el.querySelector('[data-act="radius-ind"]')?.addEventListener('click', () => toast('모서리 따로 조절은 준비 중'));
  el.querySelector('[data-act="approve"]')?.addEventListener('click', () => { const id = nodes[0].id; const i = doc.approved.indexOf(id); i >= 0 ? doc.approved.splice(i, 1) : doc.approved.push(id); commit('승인'); rerender('right'); rerender('left'); });
  el.querySelector('[data-act="more"]')?.addEventListener('click', e => { e.stopPropagation(); menu(e.currentTarget, [['복제', '⌘D', () => ctx.cmd('dup')], ['그룹', '⌘G', () => ctx.cmd('group')], ['그룹 풀기', '⇧⌘G', () => ctx.cmd('ungroup')], null, ['맨 앞으로', '⌘]', () => ctx.cmd('front')], ['맨 뒤로', '⌘[', () => ctx.cmd('back')], null, ['잠그기/풀기', '⇧⌘L', () => ctx.cmd('lock')], ['숨기기/보이기', '⇧⌘H', () => ctx.cmd('hide')], null, ['삭제', '⌫', () => ctx.cmd('delete')]]); });
  el.querySelectorAll('[data-flow]').forEach(b => b.onclick = () => apply(n => { const v = b.dataset.flow; n.layout = v === 'none' ? null : { ...(n.layout ?? { gap: 8, pad: 0, align: 'start' }), flow: v }; }, '레이아웃') || rerender('right'));
  el.querySelector('[data-act="layout-add"]')?.addEventListener('click', () => { apply(n => { n.layout = n.layout ? null : { flow: 'v', gap: 8, pad: 0, align: 'start' }; }, '자동 레이아웃'); rerender('right'); });
  el.querySelectorAll('[data-tauto]').forEach(b => b.onclick = () => { apply(n => { n.text.auto = b.dataset.tauto; }, '글자 상자'); rerender('right'); });
  el.querySelectorAll('[data-talign]').forEach(b => b.onclick = () => { apply(n => { n.text.align = b.dataset.talign; }, '정렬'); rerender('right'); });
  el.querySelectorAll('[data-tvalign]').forEach(b => b.onclick = () => { apply(n => { n.text.valign = b.dataset.tvalign; }, '정렬'); rerender('right'); });
  el.querySelector('[data-act="font-all-apply"]')?.addEventListener('click', () => { setFontAll(doc, nodes[0].text.family); ed.render(); commit('전체 글꼴'); toast('문서 전체 글꼴을 바꿨어요'); });
  el.querySelectorAll('[data-con]').forEach(i => i.onclick = () => { const [k, v] = i.dataset.con.split(':'); apply(n => { n.constraints = { ...(n.constraints ?? { h: 'left', v: 'top' }) }; n.constraints[k] = n.constraints[k] === v ? (k === 'h' ? 'center' : 'center') : v; }, '제약'); rerender('right'); });
  // 채움 · 선 · 효과 추가
  el.querySelector('[data-act="fill-add"]')?.addEventListener('click', () => { apply(n => { n.fills = n.fills ?? []; n.fills.push(solid(n.type === 'text' ? '#1E1E1E' : '#D9D9D9')); }, '채움'); rerender('right'); });
  el.querySelector('[data-act="fill-style"]')?.addEventListener('click', e => { e.stopPropagation(); menu(e.currentTarget, doc.styles.length ? doc.styles.map(s => [s.name + '  ' + s.color, '', () => { apply(n => { n.fills = [solid(s.color)]; }, '스타일'); rerender('right'); }]) : [['색 스타일이 없어요', '', null]]); });
  el.querySelector('[data-act="stroke-add"]')?.addEventListener('click', () => { apply(n => { n.strokes = n.strokes ?? []; n.strokes.push(stroke('#000000', 1, 'inside')); }, '선'); rerender('right'); });
  el.querySelector('[data-act="effect-add"]')?.addEventListener('click', () => { apply(n => { n.effects = n.effects ?? []; n.effects.push(effect('drop')); }, '효과'); rerender('right'); });
  // 색 행
  el.querySelectorAll('.crow, .erow').forEach(row => {
    const kind = row.dataset.kind, idx = +row.dataset.idx;
    const target = n => kind === 'fill' ? n.fills[idx] : kind === 'stroke' ? n.strokes[idx] : kind === 'effect' ? n.effects[idx] : null;
    const setColor = (hex) => { if (!/^#[0-9a-f]{6}$/i.test(hex)) return; hex = hex.toUpperCase();
      if (kind === 'page') { page.bg = hex; ed.cv.style.background = hex; commit('페이지 색'); return; }
      if (kind === 'text-all') { setTextColorAll(doc, hex); doc.palette = { ...(doc.palette ?? exById(doc.ex).palette), fg: hex }; ed.render(); commit('전체 글자색'); return; }
      if (kind === 'bg-all') { const old = doc.palette ?? exById(doc.ex).palette; applyPalette(doc, { ...old, bg: hex, brand: [old.accent, hex, old.fg] }); ed.render(); commit('전체 지면'); rerender('right'); return; }
      if (kind === 'selcolor') { const from = row.dataset.color; for (const n of nodes) walk([n], x => { for (const f of x.fills ?? []) if (f.type === 'solid' && f.color.toUpperCase() === from.toUpperCase()) f.color = hex; for (const s of x.strokes ?? []) if (s.color.toUpperCase() === from.toUpperCase()) s.color = hex; for (const e of x.effects ?? []) if (e.color?.toUpperCase() === from.toUpperCase()) e.color = hex; }); row.dataset.color = hex; for (const n of nodes) ed.refresh(n.id); commit('선택 색'); return; }
      apply(n => { const t = target(n); if (t) t.color = hex; }, '색'); };
    row.querySelector('[data-c="color"]')?.addEventListener('input', e => { row.querySelector('.swatch i').style.background = e.target.value; const hx = row.querySelector('[data-c="hex"]'); if (hx) hx.value = e.target.value.slice(1).toUpperCase(); setColor(e.target.value); });
    row.querySelector('[data-c="hex"]')?.addEventListener('change', e => { let v = e.target.value.replace('#', '').trim(); if (/^[0-9a-f]{3}$/i.test(v)) v = v.split('').map(c => c + c).join(''); if (/^[0-9a-f]{6}$/i.test(v)) { setColor('#' + v); row.querySelector('.swatch i').style.background = '#' + v; const ci = row.querySelector('[data-c="color"]'); if (ci) ci.value = '#' + v; } else rerender('right'); });
    row.querySelector('[data-c="opacity"]')?.addEventListener('change', e => { const v = Math.max(0, Math.min(100, num(e.target.value.replace('%', ''), 100))) / 100; apply(n => { const t = target(n); if (t) t.opacity = v; }, '불투명도'); e.target.value = Math.round(v * 100) + '%'; });
    row.querySelector('[data-c="eye"]')?.addEventListener('click', () => { apply(n => { const t = target(n); if (t) t.visible = t.visible === false; }, '보이기'); rerender('right'); });
    row.querySelector('[data-c="del"]')?.addEventListener('click', () => { apply(n => { const list = kind === 'fill' ? n.fills : kind === 'stroke' ? n.strokes : n.effects; list?.splice(idx, 1); }, '삭제'); rerender('right'); });
    row.querySelector('[data-c="fit"]')?.addEventListener('change', e => apply(n => { const t = target(n); if (t) t.fit = e.target.value; }, '맞춤'));
    row.querySelector('[data-c="img"]')?.addEventListener('click', () => ctx.pickImage(src => { apply(n => { const t = target(n); if (t) t.src = src; }, '그림'); rerender('right'); }));
    row.querySelector('[data-c="type"]')?.addEventListener('change', e => { apply(n => { const t = target(n); if (t) t.type = e.target.value; }, '효과'); rerender('right'); });
    row.querySelectorAll('input[data-p^="e-"]').forEach(inp => { inp.onchange = () => { const k = inp.dataset.p.slice(2); apply(n => { const t = target(n); if (t) t[k] = num(inp.value); }, '효과'); }; inp.onfocus = () => inp.select(); });
    row.querySelector('[data-c="tostyle"]')?.addEventListener('click', () => { doc.styles.push({ id: uid(), name: `색 ${doc.styles.length + 1}`, color: row.dataset.color }); commit('스타일'); toast('색 스타일에 넣었어요'); });
  });
  // 페이지 패널
  el.querySelector('[data-act="page-bg-reset"]')?.addEventListener('click', () => { page.bg = '#F5F5F5'; ed.cv.style.background = page.bg; commit('페이지 색'); rerender('right'); });
  el.querySelector('[data-act="style-add"]')?.addEventListener('click', () => { doc.styles.push({ id: uid(), name: `색 ${doc.styles.length + 1}`, color: '#0D99FF' }); commit('스타일'); rerender('right'); });
  el.querySelectorAll('[data-style-c]').forEach(i => i.oninput = () => { const s = doc.styles.find(x => x.id === i.dataset.styleC); const old = s.color; s.color = i.value.toUpperCase(); i.closest('.srow').querySelector('.swatch i').style.background = s.color; walk(page.children, n => { for (const f of n.fills ?? []) if (f.type === 'solid' && f.color.toUpperCase() === old.toUpperCase()) f.color = s.color; }); ed.render(); });
  el.querySelectorAll('[data-style-c]').forEach(i => i.onchange = () => commit('스타일 색'));
  el.querySelectorAll('[data-style-n]').forEach(n => { n.onblur = () => { const s = doc.styles.find(x => x.id === n.dataset.styleN); s.name = n.textContent.trim() || s.name; commit('스타일 이름'); }; n.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); n.blur(); } }; });
  el.querySelectorAll('[data-style-del]').forEach(b => b.onclick = () => { doc.styles = doc.styles.filter(x => x.id !== b.dataset.styleDel); commit('스타일 삭제'); rerender('right'); });
  el.querySelector('[data-act="kv-pick"]')?.addEventListener('click', () => el.querySelector('[data-kv-file]').click());
  el.querySelector('[data-kv-file]')?.addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; const src = await fileToDataUrl(f, 1600); toast('키비주얼 바꾸는 중…'); const pal = await replaceKv(doc, src, true); ed.render(); commit('키비주얼'); rerender('right'); rerender('left'); toast(pal ? `키비주얼에 맞춰 지면 ${pal.bg} · 글자 ${pal.fg}` : '키비주얼을 바꿨어요'); });
  el.querySelector('[data-act="kv-auto"]')?.addEventListener('click', async () => { const pal = await paletteFromImage(doc.kvSrc ?? kvImg(exById(doc.ex))); if (!pal) return toast('그림에서 색을 못 읽었어요'); applyPalette(doc, pal); ed.render(); commit('색 맞춤'); rerender('right'); toast(`지면 ${pal.bg} · 글자 ${pal.fg} · 포인트 ${pal.accent}`); });
  el.querySelector('[data-act="regen"]')?.addEventListener('click', () => ctx.cmd('regen'));
  el.querySelector('[data-act="tidy"]')?.addEventListener('click', () => ctx.cmd('tidy'));
  el.querySelector('[data-act="rulers"]')?.addEventListener('click', () => { ed.showRulers = !ed.showRulers; ed.host.classList.toggle('no-rulers', !ed.showRulers); ed.updateOverlay(); rerender('right'); });
  el.querySelector('[data-act="coords"]')?.addEventListener('click', () => { ed.showCoords = !ed.showCoords; ed.coords.hidden = true; rerender('right'); });
  // 검수
  el.querySelectorAll('[data-sel-id]').forEach(b => b.onclick = () => { ed.select([b.dataset.selId]); ed.zoomTo([b.dataset.selId]); });
  el.querySelector('[data-act="check-all"]')?.addEventListener('click', () => { ed.select([]); ctx.rt = 'check'; rerender('right'); });
  el.querySelector('[data-act="approve-ok"]')?.addEventListener('click', () => { let n = 0; for (const f of page.children) if (!checkFrame(f).length && !doc.approved.includes(f.id)) { doc.approved.push(f.id); n++; } commit('승인'); rerender('right'); rerender('left'); toast(`${n}개 승인`); });
}
function setProp(ctx, nodes, key, v, inp) {
  const { ed, commit, rerender } = ctx;
  for (const n of nodes) {
    if (n.locked && key !== 't-content') continue;
    if (key === 'x' || key === 'y') n[key] = v;
    else if (key === 'w' || key === 'h') { const ow = n.w, oh = n.h; const r = ctx.ratioLock ? (key === 'w' ? v / ow : v / oh) : null; n[key] = Math.max(1, v); if (r) { if (key === 'w') n.h = Math.max(1, Math.round(oh * r)); else n.w = Math.max(1, Math.round(ow * r)); } applyConstraints(n, ow, oh); }
    else if (key === 'rotation') n.rotation = ((v % 360) + 360) % 360;
    else if (key === 'opacity') n.opacity = Math.max(0, Math.min(100, v)) / 100;
    else if (key === 'radius') n.radius = Math.max(0, v);
    else if (key === 'blend') n.blend = v;
    else if (key === 'con-h' || key === 'con-v') { n.constraints = { ...(n.constraints ?? { h: 'left', v: 'top' }) }; n.constraints[key === 'con-h' ? 'h' : 'v'] = v; }
    else if (key === 'gap' || key === 'pad') { if (n.layout) n.layout[key] = v; }
    else if (key === 'stroke-w') { for (const s of n.strokes ?? []) s.width = Math.max(0, v); }
    else if (key === 'stroke-align') { for (const s of n.strokes ?? []) s.align = v; }
    else if (key.startsWith('t-') && n.text) { const k = key.slice(2); if (k === 'size') n.text.size = Math.max(1, v); else if (k === 'lh') n.text.lineHeight = Math.max(.5, v / 100); else if (k === 'ls') n.text.letterSpacing = v / 100; else if (k === 'weight') n.text.weight = +v; else if (k === 'family') n.text.family = v; else if (k === 'content') n.text.content = v; }
    if (n.children) relayout(n);
  }
  for (const n of nodes) ed.refresh(n.id); ed.updateOverlay(); commit(key);
  if (['con-h', 'con-v', 'blend', 'w', 'h', 'rotation'].includes(key)) rerender('right');
  ed.emit('change', ed.sel);
}
export function fileToDataUrl(file, max = 1600) {
  return new Promise(res => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, max / Math.max(im.width, im.height)); if (s >= 1) return res(r.result); const c = document.createElement('canvas'); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', .9)); }; im.src = r.result; }; r.readAsDataURL(file); });
}

// ─────────────────────────── 왼쪽 패널 ───────────────────────────
const thumbCache = new Map();
const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
export function renderLeft(ctx) {
  const { ed, doc, el, rail } = ctx; const page = ed.page;
  const head = `<div class="phead"><div class="name" data-act="doc-menu"><span contenteditable="true" spellcheck="false" data-rename-doc>${esc(doc.name)}</span>${ic('chev-d')}</div><span class="grow"></span><button class="ib t2" data-act="collapse" title="패널 접기">${ic('sidebar')}</button></div><div class="psub"><span class="t2">초안</span><span class="t3">·</span><span class="t2">${ic('check')}</span><span>검수 완료 ${doc.approved.length}</span><span class="t3">/ ${page.children.length}</span></div>`;
  let body = '';
  if (rail === 'file') body = fileBody(ctx);
  else if (rail === 'input') body = inputBody(ctx);
  else if (rail === 'assets') body = assetsBody(ctx);
  else if (rail === 'tools') body = toolsBody(ctx);
  else if (rail === 'check') body = `<div class="pbody">${checkPanel(ctx)}</div>`;
  el.innerHTML = head + body;
  bindLeft(ctx);
}
function fileBody(ctx) {
  const { ed, doc } = ctx; const page = ed.page;
  const pages = doc.pages.map(p => `<button class="prow" data-page="${p.id}" aria-current="${p.id === page.id}"><span class="nm" contenteditable="${p.id === page.id}" spellcheck="false" data-page-n="${p.id}">${esc(p.name)}</span><span class="t3">${p.children.length}</span></button>`).join('');
  ctx.open ??= new Set(); ctx.groupsOpen ??= new Set(page.children.map(f => f.media ?? '기타'));
  const groups = new Map(); for (const f of page.children) { const k = f.media ?? '기타'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  const typeIcon = n => ({ frame: 'frame', group: 'group', rect: 'rect', image: 'img', text: 'text' }[n.type]);
  const row = (n, depth, parentHidden) => { const hid = n.visible === false || parentHidden; const open = ctx.open.has(n.id); let h = `<div class="lrow d${depth}${n.type === 'frame' && depth === 0 ? ' thumbs top' : ''}${hid ? ' hid' : ''}${n.locked ? ' lock' : ''}" data-node="${n.id}" aria-selected="${ed.sel.includes(n.id)}" ${n.children ? `aria-expanded="${open}"` : ''} draggable="true">${n.children ? `<span class="tw" data-tw="${n.id}">${ic('chev-r')}</span>` : '<span class="tw"></span>'}${n.type === 'frame' && depth === 0 ? `<span class="th" data-th="${n.id}"></span>` : `<span class="li">${ic(typeIcon(n))}</span>`}<span class="nm" data-nm="${n.id}" spellcheck="false">${esc(n.name)}</span>${n.type === 'frame' && depth === 0 ? `<span class="meta">${n.w}×${n.h}${doc.approved.includes(n.id) ? ' ✓' : ''}</span>` : ''}<span class="acts"><button class="ib s" data-lock="${n.id}" title="잠금">${ic(n.locked ? 'lock' : 'unlock')}</button><button class="ib s" data-eye="${n.id}" title="숨기기">${ic(n.visible === false ? 'eye-off' : 'eye')}</button></span></div>`;
    if (n.children && open) for (const k of [...n.children].reverse()) h += row(k, depth + 1, hid); return h; };
  let layers = '';
  for (const [m, list] of groups) { const o = ctx.groupsOpen.has(m); layers += `<div class="lrow group-h" data-grp="${esc(m)}" aria-expanded="${o}"><span class="tw">${ic('chev-r')}</span><span class="nm">${esc(m)}</span><span class="meta">${list.length}</span></div>`; if (o) for (const f of list) layers += row(f, 0, false); }
  return `<div class="pbody"><div class="sec">페이지<span class="grow"></span><button class="ib s t2" data-act="page-search" title="찾기">${ic('search')}</button><button class="ib s t2" data-act="page-add" title="페이지 추가">${ic('plus')}</button></div>${pages}<hr style="margin:8px 0"><div class="sec">레이어<span class="grow"></span><span class="t2" style="font-weight:400">${page.children.length}</span><button class="ib s t2" data-act="collapse-all" title="모두 접기">${ic('tidy')}</button></div><div class="layers">${layers}</div></div>`;
}
function inputBody(ctx) {
  const { doc } = ctx;
  const fld = ([k, l, kind]) => `<div class="lbl">${l}</div>` + (kind === 'area' ? `<textarea class="in" data-f="${k}" rows="2">${esc(doc.fields[k])}</textarea>` : `<input class="in" data-f="${k}" value="${esc(doc.fields[k])}">`);
  const rows = []; for (let i = 0; i < FIELDS.length; i++) { const f = FIELDS[i]; if (f[2] === 'half' && FIELDS[i + 1]?.[2] === 'half') { rows.push(`<div class="r2"><div>${fld(f)}</div><div>${fld(FIELDS[i + 1])}</div></div>`); i++; } else rows.push(fld(f)); }
  return `<div class="pbody"><div class="sec">브리프<span class="grow"></span><button class="btn sm" data-act="fields-apply">글자에 반영</button></div><div class="grp">${rows.join('')}</div><hr><div class="sec">프롬프트</div><div class="grp"><textarea class="in" data-f-prompt rows="4">${esc(doc.prompt ?? '')}</textarea><div class="t2" style="margin-top:8px">브리프를 바꾸고 「글자에 반영」을 누르면 메인 문구 · 날짜 · 모집 직무 레이어가 전부 바뀌어요.</div></div></div>`;
}
function assetsBody(ctx) {
  const { doc } = ctx; const ex = exById(doc.ex);
  return `<div class="pbody"><div class="sec">키비주얼</div><div class="grp"><div class="kvrow"><img src="${esc(doc.kvSrc ?? kvImg(ex))}" alt=""><div class="grow"><div class="med">${esc(doc.kvSrc ? '올린 그림' : ex.by)}</div><div class="t2">모든 프레임의 「키비주얼」 레이어</div></div></div><div class="r2" style="margin-top:8px"><button class="btn" data-act="kv-pick">바꾸기</button><button class="btn" data-act="kv-auto">색 자동 맞춤</button></div><input type="file" accept="image/*" hidden data-kv-file></div><hr>
    <div class="sec">로고</div><div class="grp"><div class="kvrow"><img src="${LOGO_IMG}" alt="" style="object-fit:contain;background:#fff"><div class="grow"><div class="med">MIDAS</div><div class="t2">모든 프레임의 「로고」 레이어</div></div></div><button class="btn full" style="margin-top:8px" data-act="logo-pick">바꾸기</button><input type="file" accept="image/*" hidden data-logo-file></div><hr>
    <div class="sec">색 스타일</div><div class="grp">${doc.styles.map(s => `<div class="srow"><span class="swatch"><i style="background:${esc(s.color)}"></i></span><span class="nm">${esc(s.name)}</span><span class="t3">${esc(s.color)}</span></div>`).join('')}</div><hr>
    <div class="sec">예시로 바꾸기</div><div class="grp"><div class="exlist">${EXAMPLES.map(e => `<button class="exitem" data-ex="${e.id}" aria-pressed="${doc.ex === e.id}"><img src="${esc(kvImg(e))}" alt=""><span>${esc(e.by)}</span></button>`).join('')}</div><div class="t2" style="margin-top:8px">누르면 키비주얼 · 지면 · 글자색이 그 예시로(레이어 배치는 유지)</div></div></div>`;
}
function toolsBody(ctx) {
  const { ed, doc } = ctx;
  return `<div class="pbody"><div class="sec">생성</div><div class="grp"><button class="btn full" data-act="regen">${ic('sparkle')} 규칙 레이아웃 다시 생성</button><div class="t2" style="margin-top:6px">레이어를 처음 상태로 다시 깔아요(되돌리기 가능)</div><button class="btn full" style="margin-top:8px" data-act="ai-ref">AI 렌더 참고 보기</button></div><hr>
    <div class="sec">보기</div><div class="grp"><div class="chk" role="checkbox" aria-checked="${ed.showRulers}" data-act="rulers"><span class="box">${ic('check')}</span>룰러</div><div class="chk" role="checkbox" aria-checked="${ed.showCoords}" data-act="coords"><span class="box">${ic('check')}</span>커서 좌표</div><div class="t2">⌥ 누르고 다른 레이어에 올리면 빨간 간격 표시</div></div><hr>
    <div class="sec">단축키</div><div class="grp keys">${[['V', '선택'], ['H', '손'], ['F', '프레임'], ['R', '사각형'], ['T', '텍스트'], ['I', '이미지'], ['⌘Z / ⇧⌘Z', '되돌리기 / 다시'], ['⌘D', '복제'], ['⌘G / ⇧⌘G', '그룹 / 풀기'], ['⌘] / ⌘[', '앞으로 / 뒤로'], ['⇧⌘H', '숨기기'], ['⇧⌘L', '잠그기'], ['⇧1 / ⇧2', '화면 맞춤 / 선택 맞춤'], ['⌘0 / ⌘+ / ⌘−', '100% / 확대 / 축소'], ['방향키', '1px 이동(⇧ 10px)'], ['⌥ + 올리기', '간격 재기'], ['Space 끌기', '화면 이동'], ['⌘E', '내보내기'], ['⌘S', '저장']].map(([k, v]) => `<div class="key"><kbd>${k}</kbd><span>${v}</span></div>`).join('')}</div></div>`;
}
function bindLeft(ctx) {
  const { ed, doc, el, toast, commit, rerender, menu } = ctx; const page = ed.page;
  const rn = el.querySelector('[data-rename-doc]'); rn.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); rn.blur(); } e.stopPropagation(); }; rn.onblur = () => { doc.name = rn.textContent.trim() || doc.name; commit('이름'); ctx.onRename?.(); };
  el.querySelector('[data-act="doc-menu"]')?.addEventListener('click', e => { if (e.target === rn) return; e.stopPropagation(); menu(e.currentTarget, [['이름 바꾸기', '', () => rn.focus()], ['복제', '', () => ctx.cmd('doc-dup')], null, ['내보내기…', '⌘E', () => ctx.openExport({ scope: 'all', scale: 1 })], null, ['삭제', '', () => ctx.cmd('doc-delete')]]); });
  el.querySelector('[data-act="collapse"]')?.addEventListener('click', () => ctx.cmd('collapse-left'));
  el.querySelectorAll('[data-page]').forEach(b => b.onclick = e => { if (e.target.dataset.pageN && b.getAttribute('aria-current') === 'true') return; doc.pageId = b.dataset.page; ed.select([], { silent: true }); ed.render(); ed.fit(); rerender('left'); rerender('right'); });
  el.querySelectorAll('[data-page-n]').forEach(n => { n.onblur = () => { const p = doc.pages.find(x => x.id === n.dataset.pageN); p.name = n.textContent.trim() || p.name; commit('페이지 이름'); }; n.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); n.blur(); } e.stopPropagation(); }; });
  el.querySelector('[data-act="page-add"]')?.addEventListener('click', () => { const p = { id: 'p' + uid(), name: `페이지 ${doc.pages.length + 1}`, bg: '#F5F5F5', children: [] }; doc.pages.push(p); doc.pageId = p.id; ed.select([], { silent: true }); ed.render(); commit('페이지'); rerender('left'); rerender('right'); });
  el.querySelector('[data-act="page-search"]')?.addEventListener('click', () => ctx.cmd('search-layers'));
  el.querySelector('[data-act="collapse-all"]')?.addEventListener('click', () => { ctx.open.clear(); rerender('left'); });
  el.querySelectorAll('[data-grp]').forEach(g => g.onclick = () => { const m = g.dataset.grp; ctx.groupsOpen.has(m) ? ctx.groupsOpen.delete(m) : ctx.groupsOpen.add(m); rerender('left'); });
  el.querySelectorAll('[data-node]').forEach(r => {
    const id = r.dataset.node;
    r.onclick = e => { if (e.target.closest('[data-tw]')) { ctx.open.has(id) ? ctx.open.delete(id) : ctx.open.add(id); rerender('left'); return; } if (e.target.closest('.acts')) return; if (e.target.dataset.nm && e.target.isContentEditable) return; e.shiftKey ? ed.toggle(id) : ed.select([id]); };
    r.ondblclick = e => { const nm = r.querySelector('.nm'); nm.contentEditable = 'true'; nm.focus(); getSelection().selectAllChildren(nm); nm.onblur = () => { nm.contentEditable = 'false'; const n = findNode(page, id); n.name = nm.textContent.trim() || n.name; commit('이름'); ed.updateOverlay(); rerender('right'); }; nm.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); nm.blur(); } ev.stopPropagation(); }; };
    r.oncontextmenu = e => { e.preventDefault(); if (!ed.sel.includes(id)) ed.select([id]); menu({ getBoundingClientRect: () => ({ left: e.clientX, bottom: e.clientY, top: e.clientY, right: e.clientX, width: 0, height: 0 }) }, [['복제', '⌘D', () => ctx.cmd('dup')], ['그룹', '⌘G', () => ctx.cmd('group')], ['그룹 풀기', '⇧⌘G', () => ctx.cmd('ungroup')], null, ['맨 앞으로', '⌘]', () => ctx.cmd('front')], ['맨 뒤로', '⌘[', () => ctx.cmd('back')], null, ['삭제', '⌫', () => ctx.cmd('delete')]]); };
    // 드래그로 순서 바꾸기(같은 부모 안)
    r.ondragstart = e => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; };
    r.ondragover = e => { e.preventDefault(); r.classList.add('drop'); };
    r.ondragleave = () => r.classList.remove('drop');
    r.ondrop = e => { e.preventDefault(); r.classList.remove('drop'); const from = e.dataTransfer.getData('text/plain'); if (!from || from === id) return; const pa = parentOf(page, from), pb = parentOf(page, id); if (pa !== pb) return toast('같은 부모 안에서만 순서를 바꿀 수 있어요'); const list = pa === page ? page.children : pa.children; const a = list.findIndex(n => n.id === from), b = list.findIndex(n => n.id === id); const [m] = list.splice(a, 1); list.splice(b, 0, m); ed.refresh(pa === page ? from : pa.id); if (pa === page) ed.render(); commit('순서'); rerender('left'); };
  });
  el.querySelectorAll('[data-eye]').forEach(b => b.onclick = e => { e.stopPropagation(); const n = findNode(page, b.dataset.eye); n.visible = n.visible === false; ed.refresh(n.id); commit('보이기'); rerender('left'); rerender('right'); });
  el.querySelectorAll('[data-lock]').forEach(b => b.onclick = e => { e.stopPropagation(); const n = findNode(page, b.dataset.lock); n.locked = !n.locked; commit('잠금'); rerender('left'); });
  // 썸네일(바뀐 것만 다시)
  const ths = [...el.querySelectorAll('[data-th]')];
  const run = async () => { for (const t of ths) { const f = findNode(page, t.dataset.th); if (!f) continue; const key = f.id, hv = hash(JSON.stringify(f)); const c = thumbCache.get(key); if (c && c.h === hv) { t.style.backgroundImage = `url(${c.url})`; continue; } try { const url = await thumbnail(f, 72); thumbCache.set(key, { h: hv, url }); if (t.isConnected) t.style.backgroundImage = `url(${url})`; } catch { /* 썸네일 실패 */ } } };
  (window.requestIdleCallback ?? setTimeout)(run);
  // 입력
  el.querySelectorAll('[data-f]').forEach(i => i.onchange = () => { doc.fields[i.dataset.f] = i.value; commit('브리프'); });
  el.querySelector('[data-f-prompt]')?.addEventListener('change', e => { doc.prompt = e.target.value; commit('프롬프트'); });
  el.querySelector('[data-act="fields-apply"]')?.addEventListener('click', () => { applyFieldsToText(doc); ed.render(); commit('브리프 반영'); toast('메인 문구 · 날짜 · 모집 직무를 다시 썼어요'); });
  // 에셋
  el.querySelector('[data-act="kv-pick"]')?.addEventListener('click', () => el.querySelector('[data-kv-file]').click());
  el.querySelector('[data-kv-file]')?.addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; const src = await fileToDataUrl(f, 1600); const pal = await replaceKv(doc, src, true); ed.render(); commit('키비주얼'); rerender('left'); rerender('right'); toast(pal ? `키비주얼에 맞춰 지면 ${pal.bg} · 글자 ${pal.fg}` : '키비주얼을 바꿨어요'); });
  el.querySelector('[data-act="kv-auto"]')?.addEventListener('click', async () => { const pal = await paletteFromImage(doc.kvSrc ?? kvImg(exById(doc.ex))); if (!pal) return toast('그림에서 색을 못 읽었어요'); applyPalette(doc, pal); ed.render(); commit('색 맞춤'); rerender('left'); rerender('right'); toast(`지면 ${pal.bg} · 글자 ${pal.fg}`); });
  el.querySelector('[data-act="logo-pick"]')?.addEventListener('click', () => el.querySelector('[data-logo-file]').click());
  el.querySelector('[data-logo-file]')?.addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; const src = await fileToDataUrl(f, 1200); for (const p of doc.pages) walk(p.children, n => { if (n.name === '로고') for (const fl of n.fills) if (fl.type === 'image') fl.src = src; }); ed.render(); commit('로고'); toast('로고를 바꿨어요'); });
  el.querySelectorAll('[data-ex]').forEach(b => b.onclick = async () => { const ex = exById(b.dataset.ex); applyPalette(doc, ex.palette); doc.ex = ex.id; await replaceKv(doc, kvImg(ex), false); doc.kvSrc = null; ed.render(); commit('예시'); rerender('left'); rerender('right'); toast(`${ex.by}로 바꿨어요`); });
  el.querySelector('[data-act="regen"]')?.addEventListener('click', () => ctx.cmd('regen'));
  el.querySelector('[data-act="ai-ref"]')?.addEventListener('click', () => ctx.cmd('ai-ref'));
  el.querySelectorAll('[data-act="rulers"]').forEach(b => b.onclick = () => { ed.showRulers = !ed.showRulers; ed.host.classList.toggle('no-rulers', !ed.showRulers); ed.updateOverlay(); rerender('left'); });
  el.querySelectorAll('[data-act="coords"]').forEach(b => b.onclick = () => { ed.showCoords = !ed.showCoords; ed.coords.hidden = true; rerender('left'); });
  el.querySelectorAll('[data-sel-id]').forEach(b => b.onclick = () => { ed.select([b.dataset.selId]); ed.zoomTo([b.dataset.selId]); });
  el.querySelector('[data-act="check-all"]')?.addEventListener('click', () => { ed.select([]); rerender('left'); });
  el.querySelector('[data-act="approve-ok"]')?.addEventListener('click', () => { let n = 0; for (const f of page.children) if (!checkFrame(f).length && !doc.approved.includes(f.id)) { doc.approved.push(f.id); n++; } commit('승인'); rerender('left'); rerender('right'); toast(`${n}개 승인`); });
}
