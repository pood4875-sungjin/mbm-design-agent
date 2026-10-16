// 매체 규격(core/media) → 렌더러 계약(SPECS) 진입.
//
// 매체 규정은 데이터에 산다(불변식 ⑤). 여기서는 그중 "우리가 이미지로 그리는 것"만 SPECS에 올린다.
//   제외: deliverable:false(매체가 직접 제작, 자료만 전달) · 텍스트 상품 · HTML 이메일 · 치수 없는 규격
// 렌더러는 채널 'ad' 하나다 — 매체가 달라도 그리는 문법은 같고, 규칙(rules)만 다르게 받는다.

import { MEDIA, EXTRACT } from './media.js';
import { SPECS } from './contract.js';
import { submitSize } from './lint.js';

// 매체 순서 — 사용자 「컨시어지」 보드 순서(core/media/_extract.json order: 자소설 → 리멤버 → 잡다 → 캐치 → 구글 GDN → NAP DSP → 인스타 → 카카오 → 네이버 → 에브리타임 → 블라인드 → 당근).
// 목록에 없는 매체(참고 규격만 있는 매체)는 그 뒤에 매체 JSON 순서대로.
export function mediumRank(id) { const i = EXTRACT.order.indexOf(id); return i >= 0 ? i : EXTRACT.order.length + Math.max(0, MEDIA.findIndex(m => m.id === id)); }

export function adSpecEntries() {
  const out = {};
  for (const m of MEDIA) {
    for (const s of m.specs) {
      // 전달물(assetOnly — 자소설 M시작배너패키지 로고 파일·이미지 파일, 10-16): 완성 배너가 아니라 파일 그대로 넘긴다. 보드 카드 + ZIP 파일을 위해 'asset' 채널 항목으로 올린다
      if (s.assetOnly && s.asset) {
        const isLogo = s.asset.item === '로고';
        out[s.id] = {
          id: s.id, channel: 'asset', track: 'online', unit: 'px', output: 'file',
          medium: m.id, mediumName: m.name, group: m.group,
          title: `${m.name} · ${s.name}`, label: s.platform ?? null, platform: s.platform ?? null,
          w: isLogo ? 600 : 720, h: isLogo ? 300 : 405, exportScale: 1, submitW: null, submitH: null,
          format: (s.asset.format ?? ['png']).map(f => String(f).toLowerCase()), maxKB: null, confidence: s.confidence,
          extract: s.extract === true, asset: s.asset, outsideTexts: [], rules: s, mediumRules: m,
        };
        continue;
      }
      if (s.deliverable === false) continue;
      const fmts = (s.format ?? []).map(f => String(f).toLowerCase());
      if (!fmts.length || fmts.every(f => f === 'text') || fmts.includes('html')) continue;
      if (!Number.isInteger(s.w) || !Number.isInteger(s.h)) continue;
      const submit = submitSize(s);
      out[s.id] = {
        id: s.id,
        channel: 'ad', track: 'online', unit: 'px', output: 'image',
        medium: m.id, mediumName: m.name, group: m.group,
        title: `${m.name} · ${s.name}`, label: s.platform ?? null, platform: s.platform ?? null,
        w: s.w, h: s.h, exportScale: s.exportScale ?? 1, submitW: submit.w, submitH: submit.h,
        format: fmts.filter(f => f !== 'text'), maxKB: s.maxKB ?? null,
        confidence: s.confidence,
        // 추출 규격인가 — 사용자 「컨시어지」 보드 목록 47(core/media/_extract.json). false 면 참고 규격: 기본 선택·전체 내보내기·케이스 라운드에서 빠지고, 「참고 규격 포함」을 켜야 보인다
        extract: s.extract === true,
        // 이미지 밖 텍스트 — 소재에 그리지 않고 매체 시스템에 따로 넘기는 글자 (검수 체크리스트·전달 세트에 쓴다)
        outsideTexts: (s.textLimits ?? []).filter(t => t.inImage === false || /이미지 밖/.test(String(t.field ?? ''))).map(t => ({ field: t.field, maxChars: t.maxChars ?? null, lines: t.lines ?? null })),
        rules: s,            // 검사기가 쓰는 규칙 원본 (참조)
        mediumRules: m,      // 글자색·글꼴·글자수 계산법 등 매체 공통 규칙
      };
    }
  }
  return out;
}

export function registerAdSpecs() {
  for (const [id, e] of Object.entries(adSpecEntries())) SPECS[id] = e;
}

// 같은 소재 묶기 — 상품(패키지)이 달라도 규정이 글자 하나 다르지 않으면 파일은 한 장이면 된다.
// (자소설 프리미엄·스탠다드의 채용공고배너 160×600처럼.) 출처·메모·예시처럼 "어디서 읽었나"만 다른 값은 비교에서 뺀다.
// 크기만 같고 규정이 다른 지면(네이버 네이티브 PC/MO 342×228)은 묶지 않는다 — 글자수·여백이 달라 다른 소재다.
const NOT_RULES = new Set(['id', 'name', 'source', 'note', 'examples', 'textLimitsSource', 'layoutNotes', 'original']);
function rulesOnly(v) {
  if (Array.isArray(v)) {
    const a = v.map(rulesOnly);
    return a.every(x => typeof x === 'string') ? [...a].sort() : a;
  }
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).filter(k => !NOT_RULES.has(k)).sort().map(k => [k, rulesOnly(v[k])]));
  }
  return v;
}
export function adSpecSignature(entry) { return JSON.stringify([entry.medium, rulesOnly(entry.rules)]); }

// 고른 매체에서 실제로 만들 소재 목록 — [{ id, medium, entry, twins:[같은 파일을 쓰는 다른 규격 id] }]
// extractOnly: 추출 규격(47)만 — 참고 규격은 뺀다. 같은 파일을 쓰는 쌍은 둘 다 추출이어야 묶이고, 쌍 중 하나만 추출이면 그 하나만 남는다.
export function adSpecGroups(media = null, { extractOnly = false } = {}) {
  const seen = new Map();
  for (const e of Object.values(adSpecEntries())) {
    if (media && !media.includes(e.medium)) continue;
    if (extractOnly && !e.extract) continue;
    const sig = adSpecSignature(e);
    const g = seen.get(sig);
    if (g) g.twins.push(e.id);
    else seen.set(sig, { id: e.id, medium: e.medium, entry: e, twins: [] });
  }
  // 매체는 보드 순서, 같은 매체 안에서는 매체 JSON 순서(안정 정렬)
  return [...seen.values()].sort((a, b) => mediumRank(a.medium) - mediumRank(b.medium));
}

// 추출 규격만 — 앱 기본 선택·전체 내보내기·케이스 라운드의 기본 범위
export function extractSpecGroups(media = null) { return adSpecGroups(media, { extractOnly: true }); }
