import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// 매체 규정은 데이터다(불변식 ⑤). 이 테스트는 데이터 자체의 약속을 지킨다:
// 규칙이 되는 값에는 출처가 있고, 출처 없는 값은 "확인필요"로 격리되어 있어야 한다(불변식 ⑦).

const dir = join(import.meta.dirname, '..', 'core', 'media');
const files = readdirSync(dir).filter(f => f.endsWith('.json'));
const media = files.map(f => ({ file: f, ...JSON.parse(readFileSync(join(dir, f), 'utf8')) }));

test('there is at least one medium and every file parses to the schema shape', () => {
  assert.ok(media.length > 0, 'core/media/ 에 JSON이 없다 — 추출이 안 됐다');
  for (const m of media) {
    for (const k of ['id', 'name', 'group', 'sources', 'common', 'specs', 'rejections', 'conflicts', 'needsReview']) {
      assert.ok(k in m, `${m.file}: 필드 "${k}" 누락`);
    }
    assert.equal(m.id, m.file.replace(/\.json$/, ''), `${m.file}: id가 파일명과 다르다`);
    assert.ok(['채용포털', '디지털', '커뮤니티', '기타'].includes(m.group), `${m.file}: 모르는 그룹 "${m.group}"`);
  }
});

test('spec ids are globally unique — they become artifact keys', () => {
  const seen = new Map();
  for (const m of media) for (const s of m.specs) {
    assert.ok(!seen.has(s.id), `규격 id 중복: ${s.id} (${seen.get(s.id)} / ${m.id})`);
    seen.set(s.id, m.id);
    assert.ok(s.id.startsWith(m.id + '-'), `${s.id}: 규격 id는 매체 id로 시작해야 한다`);
  }
});

test('a spec marked 확정 has the numbers a checker needs, and every number has a source', () => {
  for (const m of media) for (const s of m.specs) {
    assert.ok(s.source, `${s.id}: 출처 없음`);
    assert.ok(['확정', '확인필요'].includes(s.confidence), `${s.id}: confidence는 확정/확인필요 중 하나`);
    // deliverable:false = 매체가 직접 만들고 우리는 자료만 넘기는 상품. 우리 산출물이 아니므로 치수를 요구하지 않는다.
    if (s.confidence === '확정' && s.deliverable !== false) {
      assert.ok(Array.isArray(s.format) && s.format.length, `${s.id}: 확정인데 포맷이 없다`);
      const textOnly = s.format.every(f => f === 'text');   // 텍스트 상품 — 치수가 없는 게 정상
      const flowing = s.format.includes('html');             // 이메일 HTML — 폭만 고정, 세로는 maxH
      if (!textOnly) {
        // 확정이라면 치수는 반드시 있어야 한다 — 없으면 확정이 아니라 확인필요다
        assert.ok(Number.isFinite(s.w), `${s.id}: 확정인데 가로 치수가 없다`);
        if (flowing) assert.ok(Number.isFinite(s.h) || Number.isFinite(s.maxH), `${s.id}: HTML인데 h도 maxH도 없다`);
        else assert.ok(Number.isFinite(s.h), `${s.id}: 확정인데 세로 치수가 없다`);
      }
    }
    if (s.w != null) assert.ok(Number.isInteger(s.w) && s.w > 0, `${s.id}: w는 양의 정수`);
    if (s.h != null) assert.ok(Number.isInteger(s.h) && s.h > 0, `${s.id}: h는 양의 정수`);
    if (s.maxKB != null) assert.ok(Number.isFinite(s.maxKB) && s.maxKB > 0, `${s.id}: maxKB는 양수`);
    if (s.exportScale != null) assert.ok([1, 2, 3].includes(s.exportScale), `${s.id}: exportScale은 1·2·3`);
    for (const f of s.format ?? []) assert.match(f, /^[a-z]+$/, `${s.id}: 포맷은 소문자 확장자 ("${f}")`);
  }
});

test('rejection cases say whether a machine can catch them', () => {
  for (const m of media) for (const r of m.rejections) {
    assert.ok(r.reason, `${m.id}: 반려 사유 없음`);
    assert.ok(r.ruleHint, `${m.id}: 반려 사례 "${r.reason}"에 ruleHint 없음 — 자동 검사 가능 여부를 밝혀야 한다`);
    if (r.date) assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/, `${m.id}: 날짜는 YYYY-MM-DD ("${r.date}")`);
  }
});

test('text colors are hex so a checker can compare them', () => {
  for (const m of media) {
    const t = m.textColors;
    if (!t) continue;
    if (t.main) assert.match(t.main, /^#[0-9A-Fa-f]{6}$/, `${m.id}: 메인 글자색 형식`);
    for (const c of t.sub ?? []) assert.match(c, /^#[0-9A-Fa-f]{6}$/, `${m.id}: 서브 글자색 형식`);
  }
});
