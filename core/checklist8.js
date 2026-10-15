// 8항목 체크리스트 — 규격 하나를 사용자 「컨시어지」 보드의 8칸(배너 사이즈 규격 / 폰트 스타일 / 폰트 웨이트 / 폰트 크기 / 텍스트 갯수 / 폰트 영역 / 비주얼 영역 / 배경 컬러 / 추출 포맷과 규격·용량)으로 읽는다.
//
// 칸마다 「보드 값」(사용자가 매체 칸에 적은 자유·있음·권장…, core/media/_extract.json board)과 「우리 값」(매체 JSON)을 나란히 놓고
// 일치 / 불일치 / 확인 필요 로 판정한다. 값을 바꾸지 않는다 — 어느 칸이 고정이고 어느 칸이 자유인지 한눈에 보이게 하는 게 목적이다.
// 가이드 페이지(docs/media-rules.html)가 규격마다 이 8칸을 맨 위에 두고(고정 → 자유 순), scripts/spec-matrix.mjs 가 전 규격 표를 만든다.
//
// 판정 규칙(보드 값 → 우리 값):
//   사이즈·추출: 보드 프레임/메모 숫자와 우리 w·h·exportScale·format·maxKB 를 실제로 견준다 — 같으면 일치, 다르면 불일치, 보드에 없으면 확인 필요
//   나머지 6칸: 보드 「자유」면 일치(우리 값은 템플릿·예시에서 잰 참고값) · 보드 「있음/권장/어느정도만」이면 우리 값이 있어야 일치, 없으면 확인 필요 ·
//              보드 미기입(null)이면 확인 필요(우리 값은 함께 보여 준다) · 보드 「시스템에서 반영」은 우리가 그리는 규격과 전제가 달라 확인 필요

import { MEDIA, EXTRACT } from './media.js';

export const ITEMS = EXTRACT.board?.items ?? ['배너 사이즈 규격', '폰트 스타일', '폰트 웨이트', '폰트 크기', '텍스트 갯수', '폰트 영역', '비주얼 영역', '배경 컬러', '추출 포맷과 규격·용량'];

const px = (w, h) => (w && h) ? `${w}×${h}` : null;
const isFree = v => typeof v === 'string' && /자유/.test(v) && !/시스템/.test(v);
const isFixed = v => typeof v === 'string' && /있음|권장|어느정도|굵어야|중요/.test(v) && !/시스템/.test(v);

// 우리 값 — 매체 JSON 에서 칸별로 읽는다(문장 그대로, 바꾸지 않는다)
export function oursOf(spec, medium) {
  const s = spec, m = medium;
  const fontsNote = m.fonts ? (m.fonts.required ?? m.fonts.recommended ?? null) : null;
  const weights = m.weights ?? s.weights ?? null;
  const weightTxt = weights ? Object.entries(weights).filter(([k]) => !['source', 'note', 'unit'].includes(k)).map(([k, v]) => `${k} ${typeof v === 'object' ? (v.weight ?? JSON.stringify(v)) : v}`).join(' · ') : null;
  const weightFromNotes = [s.fontSizes?.note, ...(s.layoutNotes ?? []), m.fonts?.note, ...(s.textLimits ?? []).map(t => t.note)].filter(Boolean).find(t => /Bold|볼드|굵기|Medium|Regular|SemiBold/.test(t)) ?? null;
  const sizes = s.fontSizes ? Object.entries(s.fontSizes).filter(([k]) => !['unit', 'source', 'note'].includes(k)).map(([k, v]) => `${k} ${v}`).join(' · ') : null;
  const noteWith = re => (s.textLimits ?? []).map(t => t.note).filter(Boolean).find(t => re.test(t)) ?? null;
  const sizeRange = s.fontSizeRange ? JSON.stringify(s.fontSizeRange) : (s.minFontPx ? `최소 ${s.minFontPx}px` : (noteWith(/\d+\s*(pt|px)/) ? `글자수 메모에: ${noteWith(/\d+\s*(pt|px)/).slice(0, 90)}` : null));
  const limits = (s.textLimits ?? []);
  const inImage = limits.filter(t => t.inImage !== false && !/이미지 밖/.test(String(t.field ?? '')));
  const countTxt = limits.length ? `${inImage.length}칸${limits.length !== inImage.length ? ` (+이미지 밖 ${limits.length - inImage.length})` : ''}: ${inImage.map(t => `${t.field}${t.maxChars != null ? ' ' + t.maxChars + '자' : ''}${t.lines ? '/' + t.lines + '줄' : ''}`).join(', ')}` : null;
  const sa = s.safeArea ?? null;
  const areaTxt = sa?.copyArea ? `카피 영역 ${px(sa.copyArea.w, sa.copyArea.h)}` : sa?.measuredFromTemplate?.textColumn ? `문구 열 x${sa.measuredFromTemplate.textColumn.x} 폭 ${sa.measuredFromTemplate.textColumn.w} (템플릿 실측)` : (sa && [sa.top, sa.right, sa.bottom, sa.left].some(v => v != null)) ? `안전영역 상${sa.top ?? '-'} 우${sa.right ?? '-'} 하${sa.bottom ?? '-'} 좌${sa.left ?? '-'}` : (sa?.note ?? null);
  const visualTxt = s.objectBox ? `오브젝트 상자 ${JSON.stringify(s.objectBox).slice(0, 80)}` : sa?.measuredFromTemplate?.image ? `이미지 영역 ${px(sa.measuredFromTemplate.image.w, sa.measuredFromTemplate.image.h)} @${sa.measuredFromTemplate.image.x},${sa.measuredFromTemplate.image.y} (템플릿 실측)` : ((s.layoutNotes ?? []).find(t => /이미지 영역|오브젝트|비주얼/.test(t)) ?? null);
  const submit = s.exportScale && s.exportScale !== 1 ? `${s.w * s.exportScale}×${s.h * s.exportScale} (×${s.exportScale})` : px(s.w, s.h);
  return {
    '배너 사이즈 규격': px(s.w, s.h),
    '폰트 스타일': fontsNote ?? (m.fonts?.note ? `지정 없음 — ${m.fonts.note.slice(0, 60)}` : null),
    '폰트 웨이트': weightTxt ?? weightFromNotes,
    '폰트 크기': sizes ?? sizeRange,
    '텍스트 갯수': countTxt,
    '폰트 영역': areaTxt,
    '비주얼 영역': visualTxt,
    '배경 컬러': s.background || null,
    '추출 포맷과 규격·용량': [submit, (s.format ?? []).join('/').toUpperCase() || null, s.maxKB != null ? `${s.maxKB}KB` : '용량 제한 없음'].filter(Boolean).join(' · '),
  };
}

// 보드 값 — 매체 칸 체크리스트(없으면 null = 미기입). 사이즈·추출은 보드 프레임·메모에서 따로 온다(opts.boardSize, opts.boardExport)
export function boardOf(mediumId) {
  const c = EXTRACT.board?.checklist?.[mediumId] ?? null;
  const memo = EXTRACT.board?.exportMemo?.[mediumId] ?? null;
  return { checklist: c, exportMemo: memo };
}
// 규격별로 쪼갠 추출 메모가 있으면 그것을(매체 메모가 규격 여럿을 한 글에 적은 경우), 없으면 매체 메모를
export function exportMemoOf(specId, mediumId) {
  const by = EXTRACT.board?.exportMemoBySpec ?? {};
  return specId in by ? by[specId] : (EXTRACT.board?.exportMemo?.[mediumId] ?? null);
}

// 추출 메모와 우리 포맷·용량이 맞는가 — 메모 글에 우리 KB 숫자와 포맷이 들어 있으면 일치
function exportVerdict(spec, memo) {
  if (!memo?.text) return { verdict: '확인 필요', why: '보드에 추출 메모 없음' };
  const t = memo.text.toUpperCase();
  const fmtsOk = (spec.format ?? []).every(f => t.includes(f.toUpperCase()) || (f === 'jpeg' && /JP\(E\)G|JPEG/.test(t)) || (f === 'jpg' && /JP\(E\)G/.test(t)));
  const kbOk = spec.maxKB == null ? !/\d+\s*KB/i.test(memo.text) || /제한 없음|용량 X|용량 메모 없음/.test(memo.text) || /PNG 2배|로고 제외/.test(memo.text) : new RegExp(`${spec.maxKB}\\s*KB`, 'i').test(memo.text);
  const scaleOk = spec.exportScale === 2 ? /2배|\(\d+\*\d+\)|×2/.test(memo.text) || !/2배/.test(memo.text) : true;
  if (fmtsOk && kbOk && scaleOk) return { verdict: '일치', why: `보드 ${memo.node}` };
  if (!kbOk && spec.maxKB == null) return { verdict: '확인 필요', why: `보드 메모에 용량이 있는데 우리 값은 없음 (${memo.node})` };
  return { verdict: '불일치', why: `보드 ${memo.node} 「${memo.text.slice(0, 60)}」 vs 우리 ${(spec.format ?? []).join('/')} ${spec.maxKB ?? '-'}KB` };
}

// 규격 하나의 8칸 — [{ item, board, ours, verdict, why, fixed }]
//   opts.boardSize: 보드에서 찾은 프레임 치수 문자열(예: "580×400")과 프레임 수 — { size, frames } 또는 null
export function checklist8(spec, medium, opts = {}) {
  const ours = oursOf(spec, medium);
  const { checklist: c } = boardOf(medium.id);
  const exportMemo = exportMemoOf(spec.id, medium.id);
  const rows = [];
  for (const item of ITEMS) {
    let board = null, verdict, why = '', fixed = false;
    if (item === '배너 사이즈 규격') {
      board = opts.boardSize ? `${opts.boardSize.size} (프레임 ${opts.boardSize.frames})` : null;
      fixed = true;
      if (!opts.boardSize) { verdict = '확인 필요'; why = '보드에 이 치수의 프레임 없음'; }
      else verdict = opts.boardSize.size === ours[item] ? '일치' : '불일치';
    } else if (item === '추출 포맷과 규격·용량') {
      board = exportMemo ? `${exportMemo.text} (${exportMemo.node})` : (c?.[item] ?? null);
      fixed = true;
      ({ verdict, why } = exportVerdict(spec, exportMemo));
      if (spec.confidence === '보드') { verdict = '확인 필요'; why = '보드에 치수만 있고 포맷·용량은 공식 가이드로 채움(confidence 보드)'; }
    } else {
      board = c?.[item] ?? null;
      if (board == null) { verdict = '확인 필요'; why = c ? '보드 칸 비어 있음' : '보드 체크리스트 미기입'; }
      else if (isFree(board)) { verdict = '일치'; why = ours[item] ? '보드 자유 — 우리 값은 템플릿·예시 참고값' : '보드 자유 — 우리도 규정 없음'; }
      else if (/시스템/.test(board)) { verdict = '확인 필요'; why = '보드 「시스템에서 반영」은 중앙배너(오브젝트형) 기준'; fixed = true; }
      else if (isFixed(board)) { fixed = true; verdict = ours[item] ? '일치' : '확인 필요'; why = ours[item] ? '' : '보드는 정해져 있다는데 우리 JSON 에 값 없음'; }
      else { verdict = '확인 필요'; why = `보드 값 「${board}」 해석 필요`; }
    }
    rows.push({ item, board, ours: ours[item], verdict, why, fixed });
  }
  return rows;
}

// 가이드 표시 순서 — 고정(정해진 값)이 위, 자유가 아래
export function orderedChecklist8(spec, medium, opts) {
  const rows = checklist8(spec, medium, opts);
  return [...rows.filter(r => r.fixed), ...rows.filter(r => !r.fixed)];
}

export function mediumOf(specId) { return MEDIA.find(m => (m.specs ?? []).some(s => s.id === specId)) ?? null; }
