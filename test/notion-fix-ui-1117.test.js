// 11-17 노션 재검수 화면 고침 — 잠긴 글자 끌기 뒤 선택 · 반영 결과 안내 · 자리 없는 칸 · 겹침 경고 · SVG 화질 안내 · 설치 안내 링크
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { releaseAction, textOverlaps, overlapNote } from '../app/elselect.js';
import { slotReach, missingSlotNote, applyNoteText } from '../app/leftnote.js';
import { svgImgScale, svgImgNote, SVG_IMG_NOTE_ALL, SVG_IMG_MAX_PX } from '../core/svgexport.js';
import { SETUP_DOC } from '../app/runtime.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('[1] 놓을 때: 안 끌고 누름 = 그 자리 요소로 · 끌었지만 안 움직임(위치 고정) = 선택 그대로 · 옮김 = 저장', () => {
  assert.equal(releaseAction({ movedAny: false, dragged: false }), 'pick');
  assert.equal(releaseAction({ movedAny: false, dragged: true }), 'stay', '위치 고정 글자를 끌어 놓아도 놓은 자리의 상세로 안 넘어감');
  assert.equal(releaseAction({ movedAny: true, dragged: true }), 'commit');
  const s = read('app/elselect.js');
  assert.match(s, /dragged = true;\s*\n\s*if \(locked\)/, '문턱(3px)을 넘으면 잠금이어도 「끌었음」');
  assert.match(s, /if \(act === 'stay'\) return;/);
});

test('[4] 겹침 판정: 패널과 캔버스가 같은 함수 · 맞닿기만 하면 안 셈', () => {
  const T = (id, x, y, w, h) => ({ id, kind: 'text', box: { x, y, w, h } });
  const items = [T('main', 10, 10, 200, 60), T('date', 10, 80, 200, 20), T('detail', 10, 100, 200, 40), { id: 'kv', kind: 'kv', box: { x: 0, y: 0, w: 500, h: 500 } }];
  assert.deepEqual(textOverlaps(items, 'main', { x: 10, y: 70, w: 200, h: 20 }).map(o => o.id), ['date'], '날짜 위로 옮김 → 날짜만(그림은 안 셈)');
  assert.deepEqual(textOverlaps(items, 'main', { x: 10, y: 10, w: 200, h: 70 }).map(o => o.id), [], '아래 변이 날짜 위 변에 맞닿기만');
  assert.equal(overlapNote([{ id: 'date' }, { id: 'detail' }], id => ({ date: '날짜', detail: '상세' })[id]), '날짜·상세와 겹침');
  assert.equal(overlapNote([]), '');
  const app = read('app/app.js');
  assert.match(app, /const hit = textOverlaps\(EL\.list\(a\), id, box\)/, '패널 「자유 위치 … 겹침」도 같은 판정');
  const es = read('app/elselect.js');
  assert.match(es, /markOverlap\(a, id, btn, q\.nb, true\)/, '끄는 동안 실시간');
  assert.match(es, /if \(it\.kind === 'text'\) markOverlap\(a, id, btn, it\.box\)/, '놓은 뒤(다시 고름)도');
  assert.match(read('app/index.html'), /\.esel\.olap\{outline-color:var\(--danger\)\}/);
});

const html = roles => `<div data-ad>${roles.map(r => `<div data-field="${r}">x</div>`).join('')}</div>`;
test('[2][3] 반영 결과 안내: 몇 종 · 자리 없는 칸 · 일부만 나오는 칸', () => {
  const htmls = [html(['main', 'date', 'detail']), html(['main', 'date']), html(['main', 'chip'])];
  assert.equal(slotReach('subText', htmls), 0);
  assert.equal(slotReach('role', htmls), 2, '상세 = detail·chip·tags');
  assert.equal(slotReach('dateText', htmls), 2);
  assert.equal(missingSlotNote('subText', htmls), '서브 문구는 이 캠페인 소재에 자리가 없어 보이지 않아요(3종 중 0종)');
  assert.equal(missingSlotNote('dateText', htmls), '');
  assert.equal(missingSlotNote('subText', []), '', '소재가 없으면 안내 안 함');
  assert.equal(applyNoteText({ impacted: 3, patch: { subText: '새 인재' }, htmls }), '3종 모두 반영됨 · 서브 문구는 이 캠페인 소재에 자리가 없어 보이지 않아요(3종 중 0종)');
  assert.equal(applyNoteText({ impacted: 2, conflicts: 1, patch: { headline: 'A', dateText: '9.28 - 10.12' }, htmls }), '2종 반영 · 1종은 캔버스에서 따로 고친 값 유지 · 날짜는 3종 중 2종에 나와요');
  assert.equal(applyNoteText({ impacted: 3, patch: { subText: '' }, htmls }), '3종 모두 반영됨', '비운 칸(자동으로)은 자리 안내 안 함');
  assert.equal(applyNoteText({ impacted: 3, patch: { client: 'X' }, htmls }), '3종 모두 반영됨', '기본 정보 칸은 자리 안내 없음');
  const app = read('app/app.js');
  assert.match(app, /state\.leftNote = \{ cid: c\.id, text: t \}/, '다시 그려도 안 지워지게 state 에');
  assert.match(app, /id="lNote" class="fnote" role="status">\$\{state\.leftNote\?\.cid === c\.id/);
  assert.match(app, /data-lnoslot=/, '칸 아래 자리 없음 안내');
});

test('[00] SVG 화질 안내 = core/svgexport.js 실제 배수', () => {
  assert.equal(svgImgScale(1200, 2400), 6);
  assert.match(svgImgNote({ w: 300, h: 250, submitW: 600, submitH: 500 }), /작업 크기의 6배\(제출 크기 600×500의 3배\)까지/);
  assert.match(svgImgNote({ w: 300, h: 250, submitW: 300, submitH: 250 }), /작업 크기의 3배까지/);
  assert.match(svgImgNote({ w: 1200, h: 280, submitW: 2400, submitH: 560 }), new RegExp(`긴 변 ${SVG_IMG_MAX_PX.toLocaleString('en-US')}px 상한 때문에 약 3배`));
  assert.match(SVG_IMG_NOTE_ALL, /3배\(제출 2배 매체는 6배 = 제출 크기의 3배\)/);
  assert.match(SVG_IMG_NOTE_ALL, /피그마에서 그보다 크게 키우면 흐려질 수 있어요/);
  const app = read('app/app.js');
  assert.match(app, /id="iExpSvgNote" hidden>\$\{SVG_IMG_NOTE_ALL\}/, '오른쪽 내보내기 — ZIP + SVG 고르면 보임');
  assert.match(app, /\$\{svgImgNote\(spec\)\}/, '소재 하나 내보내기 창 — 그 규격 배수');
});

test('[칩] 로컬 앱 켜는 방법 = GitHub 렌더 페이지 · 새 탭 · 원본 파일 있음', () => {
  assert.equal(SETUP_DOC, 'https://github.com/pood4875-sungjin/mbm-design-agent/blob/main/docs/local-ai-setup.md');
  assert.ok(read('docs/local-ai-setup.md').length > 100);
  assert.match(read('app/claudelink.js'), /href="\$\{SETUP_DOC\}" target="_blank" rel="noopener"/);
  assert.match(read('app/aidesign.js'), /import \{ SETUP_DOC \} from '\.\/runtime\.js'/, '설치 방법 링크도 한 곳');
});
