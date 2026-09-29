// 매체 규격(core/media) → 렌더러 계약(SPECS) 진입.
//
// 매체 규정은 데이터에 산다(불변식 ⑤). 여기서는 그중 "우리가 이미지로 그리는 것"만 SPECS에 올린다.
//   제외: deliverable:false(매체가 직접 제작, 자료만 전달) · 텍스트 상품 · HTML 이메일 · 치수 없는 규격
// 렌더러는 채널 'ad' 하나다 — 매체가 달라도 그리는 문법은 같고, 규칙(rules)만 다르게 받는다.

import { MEDIA } from './media.js';
import { SPECS } from './contract.js';
import { submitSize } from './lint.js';

export function adSpecEntries() {
  const out = {};
  for (const m of MEDIA) {
    for (const s of m.specs) {
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
        // 이미지 밖 텍스트 — 소재에 그리지 않고 매체 시스템에 따로 넘기는 글자 (검수 체크리스트·전달 세트에 쓴다)
        outsideTexts: (s.textLimits ?? []).filter(t => /이미지 밖/.test(String(t.field ?? ''))).map(t => ({ field: t.field, maxChars: t.maxChars ?? null, lines: t.lines ?? null })),
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
export function adSpecGroups(media = null) {
  const seen = new Map();
  for (const e of Object.values(adSpecEntries())) {
    if (media && !media.includes(e.medium)) continue;
    const sig = adSpecSignature(e);
    const g = seen.get(sig);
    if (g) g.twins.push(e.id);
    else seen.set(sig, { id: e.id, medium: e.medium, entry: e, twins: [] });
  }
  return [...seen.values()];
}
