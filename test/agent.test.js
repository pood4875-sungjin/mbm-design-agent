import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scriptedTurn, detectKind, detectTrack, detectMedia, fieldsFor } from '../app/agent.js';

// 규칙 진행자는 AI 없이도 같은 계약으로 대화를 끌고 간다. 채용 캠페인은 종류→트랙→매체→정보→스타일 순.

test('kind, track and media are detected from plain Korean', () => {
  assert.equal(detectKind('한진정보통신 백엔드 개발자 채용 광고 만들어줘'), 'recruit');
  assert.equal(detectKind('10월 코엑스 MBM 사전등록 배너'), 'event');
  assert.ok(detectMedia('카카오랑 자소설닷컴, 네이버에 나가요').includes('kakao'));
  assert.ok(detectMedia('카카오랑 자소설닷컴, 네이버에 나가요').includes('jasoseol'));
  assert.ok(detectMedia('카카오랑 자소설닷컴, 네이버에 나가요').includes('naver-gfa'));
  assert.equal(detectTrack('구글 GDN이랑 인스타 광고'), 'online');
  assert.equal(detectTrack('포스터랑 현수막'), 'offline');
  assert.equal(detectTrack('그냥 뭔가 만들어줘'), null);
});

test('required fields follow the campaign kind', () => {
  assert.deepEqual(fieldsFor('recruit'), ['client', 'role', 'employType', 'location', 'deadline', 'applyUrl']);
  assert.deepEqual(fieldsFor('event'), ['name', 'date', 'venue', 'audience', 'cta']);
});

test('a recruit brief without a track is asked for the track first', () => {
  const r = scriptedTurn({ state: { phase: 'brief', kind: null, fields: {}, channels: [], media: [], track: null }, userText: '백엔드 개발자 채용' });
  assert.equal(r.phase, 'brief');
  assert.equal(r.patch.kind, 'recruit', '종류를 아직 모르면 문장에서 알아내 patch로 알린다');
  assert.match(r.say, /온라인|오프라인/);
});

test('an online recruit brief without media is asked for media; naming media moves on to fields', () => {
  const ask = scriptedTurn({ state: { phase: 'brief', kind: 'recruit', fields: {}, channels: [], media: [], track: 'online' }, userText: '온라인 광고로' });
  assert.equal(ask.phase, 'brief');
  assert.match(ask.say, /매체/);
  const next = scriptedTurn({ state: { phase: 'brief', kind: 'recruit', fields: {}, channels: [], media: [], track: 'online' }, userText: '카카오랑 리멤버' });
  assert.deepEqual(next.patch.media.sort(), ['kakao', 'remember']);
  assert.equal(next.phase, 'info');
  assert.match(next.say, /고객사|모집 직무/);
});

test('info answers fill recruit fields in order, then style, then draft', () => {
  const st = { phase: 'info', kind: 'recruit', fields: { client: 'A' }, channels: [], media: ['kakao'], track: 'online', styleDone: false };
  const r = scriptedTurn({ state: st, userText: '백엔드 개발자, 정규직, 서울, 2026-10-31, https://x.y/apply' });
  assert.equal(r.patch.fields.role, '백엔드 개발자');
  assert.equal(r.patch.fields.applyUrl, 'https://x.y/apply');
  assert.equal(r.phase, 'style');
  const done = scriptedTurn({ state: { ...st, fields: { ...st.fields, ...r.patch.fields }, styleDone: true }, userText: '라이트' });
  assert.equal(done.phase, 'draft');
  assert.equal(done.ready, true);
});

test('event campaigns keep the original channel flow', () => {
  const r = scriptedTurn({ state: { phase: 'brief', kind: 'event', fields: {}, channels: [], media: [], track: null }, userText: '포스터랑 현수막' });
  assert.equal(r.patch.track, 'offline');
  assert.ok(r.patch.channels.includes('poster'));
});
