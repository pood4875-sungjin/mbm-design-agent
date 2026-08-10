// 이미지 해상도 판정 — 인쇄물은 "픽셀 수"가 아니라 "실물 크기 대비 밀도(DPI)"가 품질을 정한다.
//
// 솔직한 경계:
//   · 없는 디테일을 만들어내는 건 여기서 못 한다(초해상 AI 모델이 필요하다).
//   · 여기서 하는 일은 두 가지다 —
//       (1) 지금 이미지가 이 규격에 충분한지 판정해서 미리 알린다
//       (2) 부족하면 얼마나 키워야 하는지, 어디까지가 현실적인지 알려준다
//   · 실제 확대는 app/upscale.js가 단계적 리샘플링으로 처리한다(품질 보정이지 창작이 아니다).

export const DPI = {
  press: 300,     // 인쇄소 표준 (근거리에서 보는 인쇄물)
  large: 150,     // 대형 출력 (포스터·X배너 — 보는 거리가 멀어 기준이 낮다)
  huge: 72,       // 초대형 (현수막·포토부스 — 수 미터 밖에서 본다)
  screen: 72,
};

// 매체별 요구 밀도 — 보는 거리가 멀수록 낮아도 된다.
export function requiredDpi(spec) {
  if (spec.unit !== 'mm') return DPI.screen;
  const longest = Math.max(spec.wmm, spec.hmm);
  if (longest >= 2000) return DPI.huge;    // 현수막·포토부스
  if (longest >= 500) return DPI.large;    // X배너·대형 포스터
  return DPI.press;                        // 명찰·A3 이하 지류
}

// 이 이미지를 이 규격에 꽉 채워 썼을 때의 실효 DPI
export function effectiveDpi(imgW, imgH, spec) {
  if (spec.unit !== 'mm') return null;
  const inchW = (spec.wmm + spec.bleed * 2) / 25.4;
  const inchH = (spec.hmm + spec.bleed * 2) / 25.4;
  // cover로 채우므로 부족한 쪽 축이 품질을 결정한다
  return Math.floor(Math.min(imgW / inchW, imgH / inchH));
}

// 판정 + 사람이 읽을 설명. 확대해도 소용없는 구간을 분명히 말한다.
export function assessImage(imgW, imgH, spec) {
  const need = requiredDpi(spec);
  const dpi = effectiveDpi(imgW, imgH, spec);
  if (dpi == null) return { level: 'na', dpi: null, need: null, text: '' };

  const ratio = need / dpi;
  const targetW = Math.ceil(imgW * ratio);
  const targetH = Math.ceil(imgH * ratio);

  if (dpi >= need) {
    return { level: 'ok', dpi, need, text: `${dpi}dpi — 이 규격에 충분합니다(권장 ${need})` };
  }
  // 2배 이내면 리샘플링으로 실질적인 개선이 된다
  if (ratio <= 2) {
    return {
      level: 'fixable', dpi, need, targetW, targetH,
      text: `${dpi}dpi — 권장 ${need}에 못 미칩니다. ${targetW}×${targetH}px로 키우면 기준을 채웁니다.`,
    };
  }
  // 4배를 넘으면 확대해도 흐려질 뿐이다 — 원본을 다시 받는 게 맞다
  if (ratio > 4) {
    return {
      level: 'hopeless', dpi, need, targetW, targetH,
      text: `${dpi}dpi — 권장 ${need}의 ${Math.round(ratio)}분의 1입니다. 확대해도 흐려지기만 하니 원본 이미지를 받는 편이 낫습니다.`,
    };
  }
  return {
    level: 'weak', dpi, need, targetW, targetH,
    text: `${dpi}dpi — 권장 ${need}에 크게 못 미칩니다. ${targetW}×${targetH}px로 키울 수 있지만 선명해지지는 않습니다.`,
  };
}

// 캠페인 전체에서 가장 빡빡한 규격을 찾아 그 기준으로 판정한다.
export function assessForSpecs(imgW, imgH, specs) {
  const printSpecs = specs.filter(s => s.unit === 'mm');
  if (!printSpecs.length) return { level: 'na', dpi: null, need: null, text: '' };
  let worst = null;
  for (const spec of printSpecs) {
    const a = assessImage(imgW, imgH, spec);
    if (!worst || a.dpi / a.need < worst.a.dpi / worst.a.need) worst = { a, spec };
  }
  return { ...worst.a, spec: worst.spec };
}
