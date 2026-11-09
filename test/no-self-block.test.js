// 「생성 직후 차단 0건」(11-02 사용자 「우리 규칙으로 만든 소재가 우리 검수에 걸리면 안 된다」) — 전 규격 측정 전수는 scripts/self-block.mjs(Chrome). 여기는 Chrome 없이 고정할 수 있는 원인별 회귀.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintArtifact } from '../core/lint.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries, adSpecGroups } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { limitsByRole, inImage, countChars } from '../core/adfields.js';
import { readFileSync } from 'node:fs';

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const BRIEFS = [
  { client: 'GS에너지', hiringType: '신입 공채', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', season: '2025 상반기', startDate: '2025-06-20', deadline: '2025-07-02', deadlineTime: '17:00' },
  { client: '한국산업단지공단기술연구원', hiringType: '대졸 신입/경력사원 채용', role: 'SW개발, 보안', season: '2026 하반기', startDate: '2026-09-28', deadline: '2026-10-12' },
  { client: '한진정보통신', hiringType: '경력직 채용', role: 'SW개발, 보안', notice: '* 채용 일정은 공고별 상이합니다.' },
];
const fieldText = (h, role) => { const m = h.match(new RegExp(`data-field="${role}"[^>]*>([\\s\\S]*?)</div>`)); return m ? m[1].replace(/<br\s*\/?>/g, '').replace(/<[^>]+>/g, '').replace(/​/g, '').replace(/&amp;/g, '&') : null; };

test('글자수: 어떤 브리프에서도 메인·서브가 규격 글자수를 넘지 않는다(잡다 24·NAP 20·비즈보드 15·16 — 두줄형은 줄마다)', () => {
  const style = normalizeStyle({ colors: ['#0A3D91'] });
  for (const g of adSpecGroups().filter(x => x.entry.extract && !(x.entry.asset || x.entry.rules?.asset))) for (const b of BRIEFS) {
    const e = g.entry, by = limitsByRole((e.rules.textLimits ?? []).filter(inImage)), counting = e.mediumRules?.textCounting ?? 'all-1';
    const h = renderAd(createContext(b, 'recruit'), style, e);
    for (const role of ['main', 'sub']) { const mx = by[role]?.maxChars, t = fieldText(h, role); if (mx == null || !t) continue; const two = role === 'main' && e.rules.mainTwoLine && /<br/.test(h.match(/data-field="main"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? ''); assert.ok(countChars(t, counting) <= mx * (two ? 2 : 1), `${g.id} ${role} 「${t}」 ${countChars(t, counting)} > ${mx}`); }
  }
});
test('글자 높이 규정은 글꼴 크기가 아니라 글자 높이로 잰다 — 네이버 DA 틀 56px(글자 51.5)은 통과, 60px 은 차단', () => {
  const e = specs['naver-gfa-mobile-da-1250x560'], lint = px => lintArtifact({ spec: e.rules, medium: e.mediumRules, measure: { texts: [{ role: 'main', text: '가', fontPx: px, lines: 1 }] } }).issues.filter(i => i.code === 'text-height');
  assert.equal(lint(56).length, 0); assert.equal(lint(60).length, 1); assert.equal(lint(22).length, 1, '글자 높이 20.2 < 22');
});
test('에브리타임 홈카드: 로고는 로고 여백(30)으로 — 틀 칸 우 30 은 통과, 지면 밖은 차단', () => {
  const e = specs['everytime-home-card-image'], lint = x => lintArtifact({ spec: e.rules, medium: e.mediumRules, measure: { logo: { bbox: { x, y: 30, w: 100, h: 30 } } } }).issues.filter(i => i.code === 'safe-area');
  assert.equal(lint(590).length, 0, '오른쪽 끝 690 = 720 − 30'); assert.equal(lint(615).length, 1);
});
test('잘림 판정: 글꼴 위아래 여백으로 넘치는 건 잘림이 아니다 — 측정 코드(앱·전수)에 줄 절반 문턱', () => {
  for (const f of ['app/measure.js', 'scripts/lib/lint-extra.mjs']) assert.match(readFileSync(f, 'utf8'), /scrollHeight[^;\n]*Math\.max\(2, lh \* 0\.5\)/, f);
});
test('캐치 PC 중앙배너(로고 불가): 바탕 있는 그림이어도 로고로 대신하지 않고 그림을 그대로 — 단독 이미지는 녹임(그라) 없이 지면 전체(11-09 사용자)', () => {
  const meta = { ar: 1.5, px: [1500, 1000], colors: ['#123456'], field: { kind: 'photo', opaque: 1, lum: 0.5, sat: 0.3 } };
  const h = renderAd(createContext(BRIEFS[0], 'recruit'), normalizeStyle({ colors: ['#0A3D91'], keyVisual: PNG, kvMeta: meta, logo: PNG }), specs['catch-center-object-pc']);
  assert.ok(!/data-logo=/.test(h), '로고 없음'); assert.match(h, /data-object="1" data-kv-only="1" style="position:absolute;inset:0;/); assert.doesNotMatch(h, /mask-image:/);
});
