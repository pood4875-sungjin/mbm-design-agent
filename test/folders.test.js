import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyFolders, migrateFolders, createFolder, renameFolder, deleteFolder, reorderFolder, moveFolderBy,
  moveCampaign, toggleFolder, folderOf, filterCampaigns, groupCampaigns, nameError, displayName,
  logoSig, tileToneFor, containBox, NONE, FOLDER_SCHEMA,
} from '../core/folders.js';

const camp = (id, name, extra = {}) => ({ id, savedAt: extra.savedAt ?? 0, channels: extra.channels ?? ['banner'], context: { core: { name, date: extra.date ?? '2026-10-15', ...(extra.core ?? {}) } } });

test('migration: 저장소가 없거나 망가졌으면 빈 폴더 — 모든 캠페인은 폴더 없음', () => {
  for (const raw of [null, undefined, 'x', 42, {}]) {
    const st = migrateFolders(raw);
    assert.equal(st.v, FOLDER_SCHEMA);
    assert.deepEqual(st.folders, []);
    assert.deepEqual(st.assign, {});
  }
  const g = groupCampaigns([camp('a', 'A'), camp('b', 'B')], migrateFolders(null));
  assert.equal(g.length, 1);
  assert.equal(g[0].id, NONE);
  assert.deepEqual(g[0].items.map(c => c.id).sort(), ['a', 'b']);
});

test('migration: 중복 id·지워진 폴더 배정·없어진 캠페인 배정을 버린다', () => {
  const st = migrateFolders({
    v: 1,
    folders: [{ id: 'f1', name: ' 서울  행사 ' }, { id: 'f1', name: '중복' }, { id: NONE, name: 'x' }, { id: 'f2', name: '', open: false }],
    assign: { a: 'f1', b: 'gone', c: 'f2' },
  }, ['a', 'b']);
  assert.deepEqual(st.folders.map(f => f.id), ['f1', 'f2']);
  assert.equal(st.folders[0].name, '서울 행사');
  assert.equal(st.folders[1].name, '이름 없는 폴더');
  assert.equal(st.folders[1].open, false);
  assert.deepEqual(st.assign, { a: 'f1' });
});

test('폴더 만들기·이름 검사·이름 바꾸기', () => {
  let { st, id } = createFolder(emptyFolders(), '  2026 채용 ', 'f1');
  assert.equal(id, 'f1');
  assert.equal(st.folders[0].name, '2026 채용');
  assert.equal(nameError(st, ''), '폴더 이름을 적어 주세요');
  assert.match(nameError(st, '2026 채용'), /이미/);
  assert.match(nameError(st, '폴더 없음'), /쓸 수 없는/);
  assert.equal(nameError(st, '2026 채용', 'f1'), null);    // 자기 이름은 통과
  assert.equal(createFolder(st, '2026 채용').id, null);      // 중복은 만들지 않는다
  st = renameFolder(st, 'f1', '채용');
  assert.equal(st.folders[0].name, '채용');
  assert.equal(renameFolder(st, 'f1', ' '), st);             // 빈 이름은 그대로
});

test('폴더 지우기 — 캠페인은 폴더 없음으로, 지우지 않는다', () => {
  let st = createFolder(emptyFolders(), 'A', 'f1').st;
  st = moveCampaign(st, 'c1', 'f1');
  st = moveCampaign(st, 'c2', 'f1');
  st = deleteFolder(st, 'f1');
  assert.deepEqual(st.folders, []);
  assert.deepEqual(st.assign, {});
  const g = groupCampaigns([camp('c1', 'x'), camp('c2', 'y')], st);
  assert.equal(g[0].items.length, 2);
});

test('폴더 순서 바꾸기 — 범위를 넘으면 끝에 붙인다', () => {
  let st = emptyFolders();
  for (const n of ['A', 'B', 'C']) st = createFolder(st, n, n).st;
  assert.deepEqual(reorderFolder(st, 'C', 0).folders.map(f => f.id), ['C', 'A', 'B']);
  assert.deepEqual(moveFolderBy(st, 'A', 1).folders.map(f => f.id), ['B', 'A', 'C']);
  assert.deepEqual(moveFolderBy(st, 'A', -1).folders.map(f => f.id), ['A', 'B', 'C']);
  assert.deepEqual(reorderFolder(st, 'A', 99).folders.map(f => f.id), ['B', 'C', 'A']);
  assert.deepEqual(st.folders.map(f => f.id), ['A', 'B', 'C']);   // 원본 불변
});

test('캠페인 옮기기·접기 상태·묶기 순서', () => {
  let st = createFolder(emptyFolders(), 'A', 'f1').st;
  st = moveCampaign(st, 'c1', 'f1');
  assert.equal(folderOf(st, 'c1').name, 'A');
  assert.equal(moveCampaign(st, 'c1', 'nope').assign.c1, undefined);   // 없는 폴더 → 폴더 없음
  assert.equal(moveCampaign(st, 'c1', NONE).assign.c1, undefined);
  st = toggleFolder(st, 'f1');
  assert.equal(st.folders[0].open, false);
  st = toggleFolder(st, NONE, false);
  assert.equal(st.noneOpen, false);
  const g = groupCampaigns([camp('c2', 'b', { savedAt: 1 }), camp('c1', 'a'), camp('c3', 'c', { savedAt: 5 })], st);
  assert.deepEqual(g.map(x => x.id), ['f1', NONE]);
  assert.deepEqual(g[1].items.map(c => c.id), ['c3', 'c2']);       // 최근 저장 순
  assert.equal(g[0].open, false);
});

test('검색 — 폴더를 가로질러 거르고, 폴더 이름으로도 찾는다', () => {
  let st = createFolder(emptyFolders(), '서울 행사', 'f1').st;
  st = moveCampaign(st, 'm', 'f1');
  const list = [
    camp('m', '2026 ONSITE MBM 서울', { date: '2026-10-15' }),
    camp('t', '', { date: '2025-03-01', channels: ['poster'], core: { client: '한진정보통신', role: '클라우드 엔지니어' } }),
  ];
  assert.deepEqual(filterCampaigns(list, { q: 'mbm' }, st).map(c => c.id), ['m']);
  assert.deepEqual(filterCampaigns(list, { q: '서울 행사' }, st).map(c => c.id), ['m']);   // 폴더 이름
  assert.deepEqual(filterCampaigns(list, { q: '한진' }, st).map(c => c.id), ['t']);         // 채용: 고객사
  assert.deepEqual(filterCampaigns(list, { year: '2025' }, st).map(c => c.id), ['t']);
  assert.deepEqual(filterCampaigns(list, { channel: 'poster' }, st).map(c => c.id), ['t']);
  assert.equal(displayName(list[1]), '한진정보통신 클라우드 엔지니어');
});

test('로고 썸네일 도우미 — 서명·타일 톤·contain 상자', () => {
  assert.equal(logoSig(null), null);
  assert.notEqual(logoSig('data:image/png;base64,AAAA'), logoSig('data:image/png;base64,AAAB'));
  assert.equal(tileToneFor('light'), 'dark');
  assert.equal(tileToneFor('dark'), 'light');
  assert.equal(tileToneFor(undefined), 'light');
  const b = containBox(400, 100, 96);          // 가로로 긴 로고 → 폭에 맞춤
  assert.ok(b.w <= 96 * 0.8 + 1 && b.w >= 96 * 0.8 - 1);
  assert.ok(Math.abs(b.x * 2 + b.w - 96) <= 1);   // 가운데
  const t = containBox(50, 200, 96);           // 세로 로고 → 높이에 맞춤
  assert.ok(Math.abs(t.h - 96 * 0.8) <= 1);
});
