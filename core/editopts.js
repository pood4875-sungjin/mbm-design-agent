// core/editopts.js — 소재 패널 「키비주얼 위치·크기·스크림」에 그 소재(규격·경로·키비주얼 유형)에서 실제로 먹는 선택지만(11-03).
//   11-03 전수(추출 48규격 × 누끼·인물·사진·일러스트·질감 × 기본안/시안 틀): 기본안은 대부분 매체 틀(templateMold)이라 위치가 한 번도 안 먹고,
//   크기는 틀 칸 일부에서만, 스크림은 거의 전부 먹는다. 시안 틀은 전면 시안이면 옆·아래 + 스크림, 칸 시안이면 다른 쪽·전체 배경 + 크기(누끼만).
//   판정 두 겹: ① 렌더러와 같은 가름(시안 틀 templateKvMode · 자유 배치 placeAvail/sizeAvail · 틀 trace) ② render 를 주면 실제로 그려 비교(probe) — 안 바뀌는 선택지는 뺀다.
//   순수 함수(render 는 주입) — test/editopts.test.js
import { PRESETS, placeAvail, sizeAvail, traceOfHtml } from './editlayout.js';
import { recipeActive, familyById, frameFor } from './recipes.js';
import { templateKvMode, TEMPLATE_SIDES } from './renderers/ad-template.js';
import { kvTypeOf } from './kvtypes.js';

export const KV_PLACES = Object.keys(PRESETS.kvPlace.choices).filter(v => v !== 'auto');   // right · bottom · bg · left
const SIZES = Object.keys(PRESETS.kvSize.choices).filter(v => v !== 'auto');
const SCRIMS = Object.keys(PRESETS.scrim.choices).filter(v => v !== 'auto');
const KV_KEYS = ['kvPlace', 'kvSize', 'scrim'];

const noTrace = h => String(h ?? '').replace(/data-trace="[^"]*"/, '');
const strip = st => { const s = { ...st }; for (const k of KV_KEYS) delete s[k]; return s; };
const kindOf = st => kvTypeOf(st?.kvMeta)?.id ?? null;

// { place: [가능 값], scale, scrim, mode: 'none'|'mold'|'template'|'free', why: 한 줄, whyOf: { kvPlace, kvSize, scrim } }
//   spec: 규격 · style: 소재의 실제 스타일(프리셋 포함돼 있어도 됨 — 위치는 뺀 상태에서, 크기·스크림은 지금 위치 기준으로 본다)
//   render(style) → html: 주면 실제로 그려 안 바뀌는 선택지를 뺀다 · trace: 자동 렌더의 data-trace(없고 render 가 있으면 거기서 읽는다)
export function kvOptionsFor({ spec, style, render = null, trace = null }) {
  const base = strip(style ?? {});
  const kind = kindOf(base);
  const out = { place: [], scale: false, scrim: false, mode: 'none', why: '', whyOf: {} };
  if (!spec) return { ...out, why: '규격 없음' };
  if (!base.keyVisual) return { ...out, why: '키비주얼이 없는 소재' };
  if (spec.channel === 'asset') return { ...out, why: '파일 그대로 전달하는 규격 — 편집 없음' };

  let html0 = null; if (render) { try { html0 = render(base); } catch { html0 = null; } }
  const tr = trace ?? (html0 ? traceOfHtml(html0) : null);
  const g = tr?.gate ?? {};
  if (g.logoOnly || (tr && tr.gate && !g.hasKv)) return { ...out, why: g.logoOnly ? '로고만 넣는 규격' : '이 규격엔 키비주얼이 들어가지 않음(매체 규정·투명 지면)' };

  if (recipeActive(spec, base)) {
    const fr = frameFor(familyById(base.tpl), spec);
    const now = templateKvMode(style, fr);   // 지금 위치(프리셋 포함)
    const cutout = kind === 'cutout';
    out.mode = 'template';
    const cand = fr.full ? TEMPLATE_SIDES : [...TEMPLATE_SIDES.filter(s => s !== fr.visual), 'bg'];
    out.place = KV_PLACES.filter(v => cand.includes(v));
    out.scale = !now.full && cutout;
    out.scrim = now.full;
    out.why = fr.full ? '전면 시안 — 옆·아래로 옮기면 칸 시안이 되고, 스크림 세기를 조절' : `칸 시안(${PRESETS.kvPlace.choices[fr.visual] ?? fr.visual}) — 다른 쪽이나 전체 배경으로`;
    out.whyOf = { kvSize: out.scale ? '' : now.full ? '전면 시안은 그림이 지면 전체 — 크기 대신 위치' : '시안 칸의 크기는 누끼만 바꿈(사진·일러스트는 칸을 채움)', scrim: out.scrim ? '' : '칸 시안엔 스크림이 없음 — 전체 배경으로 바꾸면 생김' };
  } else if (tr?.mode === 'templateMold' || g.template) {
    out.mode = 'mold';
    out.scale = true; out.scrim = !g.transparent;
    // 11-09 비즈보드 좌측/우측형(틀 mold.sideSwap): 그림 칸 좌우만 고를 수 있다
    const swap = !!(spec.rules ?? spec)?.safeArea?.measuredFromTemplate?.mold?.sideSwap;
    if (swap) out.place = ['right', 'left'].filter(v => KV_PLACES.includes(v));
    out.why = swap ? '매체 틀 — 그림 칸은 왼쪽·오른쪽만' : '매체 틀이 그림 칸을 고정 — 위치는 못 바꿉니다';
    out.whyOf = { kvPlace: swap ? '아래·전체 배경 — 매체 틀(좌측형·우측형만)' : out.why, scrim: g.transparent ? '투명 배경 규격' : '' };
  } else {
    out.mode = 'free';
    const ctx = { gate: g, mode: tr?.place?.mode, objectBox: !!spec.rules?.objectBox, cutout: kind === 'cutout' && !(kvTypeOf(base.kvMeta)?.flags?.frame) };
    const whyP = new Map();
    for (const v of KV_PLACES) { const r = placeAvail(spec, v, ctx); if (r.ok) out.place.push(v); else whyP.set(r.why, [...(whyP.get(r.why) ?? []), v]); }
    const sz = sizeAvail(spec, 'md', ctx);
    out.scale = sz.ok; out.scrim = !g.transparent;
    out.whyOf = { kvPlace: [...whyP].map(([w, vs]) => `${vs.map(v => PRESETS.kvPlace.choices[v]).join('·')} — ${w}`).join(' / '), kvSize: sz.ok ? '' : sz.why, scrim: g.transparent ? '투명 배경 규격' : '' };
    out.why = out.place.length ? '' : (whyP.size ? [...whyP.keys()][0] : '');
  }

  // ② 실제로 그려 비교 — 안 바뀌는 선택지는 뺀다(표와 코드가 어긋나지 않게)
  if (render && html0 != null) {
    const t0 = noTrace(html0);
    const changes = st => { try { return noTrace(render(st)) !== t0; } catch { return false; } };
    const dropped = [];
    out.place = out.place.filter(v => changes({ ...base, kvPlace: v }) || (dropped.push(v), false));
    const cur = TEMPLATE_SIDES.includes(style?.kvPlace) || style?.kvPlace === 'bg' ? { ...base, kvPlace: style.kvPlace } : base;
    const t1 = cur === base ? t0 : noTrace(render(cur));
    const changesFrom = st => { try { return noTrace(render(st)) !== t1; } catch { return false; } };
    if (out.scale && !SIZES.some(v => changesFrom({ ...cur, kvSize: v }))) { out.scale = false; out.whyOf.kvSize = out.whyOf.kvSize || '이 그림·칸에선 크기가 결과를 안 바꿈'; }
    if (out.scrim && !SCRIMS.some(v => changesFrom({ ...cur, scrim: v }))) { out.scrim = false; out.whyOf.scrim = out.whyOf.scrim || '이 그림에선 스크림이 결과를 안 바꿈'; }
    if (dropped.length) out.whyOf.kvPlace = [out.whyOf.kvPlace, `${dropped.map(v => PRESETS.kvPlace.choices[v]).join('·')} — 이 그림 유형에선 결과가 안 바뀜`].filter(Boolean).join(' / ');
  }
  if (!out.place.length && !out.why) out.why = out.whyOf.kvPlace || '이 소재에선 위치를 못 바꿈';
  return out;
}

// 세 컨트롤 다 안 먹을 때 패널에 한 줄
export const kvOptionsNote = o => (o.place.length || o.scale || o.scrim) ? '' : (o.why || '이 소재에선 키비주얼 위치·크기·스크림을 못 바꿉니다');
