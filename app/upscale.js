// 이미지 확대 — 브라우저 안에서 의존성 없이.
//
// 무엇을 하는가: 단계적 리샘플링(한 번에 크게 늘리지 않고 배씩 나눠 늘림).
//   브라우저 기본 확대는 한 번에 늘려서 계단·뭉개짐이 생긴다. 배씩 나눠 늘리면
//   중간 단계마다 보간이 누적돼 훨씬 매끈하다. 인쇄물에서 차이가 눈에 띈다.
//
// 무엇을 못 하는가: 없는 디테일을 만들어내지 못한다.
//   흐린 사진은 커진 흐린 사진이 될 뿐이다. 그건 초해상(super-resolution) 모델의 일이고
//   외부 API가 필요하다 — 붙일 자리는 upscaleWithApi()에 비워 뒀다.

const STEP = 2;          // 한 단계에 최대 2배
const MAX_PIXELS = 40e6; // 브라우저 캔버스 한계를 넘지 않도록 (약 40MP)

export async function loadImage(src) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('이미지를 읽지 못했습니다')); img.src = src; });
  return img;
}

function draw(source, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(source, 0, 0, w, h);
  return cv;
}

// 목표 픽셀 크기까지 단계적으로 확대. 결과는 dataURL.
export async function upscale(dataUrl, targetW, targetH, type = 'image/png') {
  const img = await loadImage(dataUrl);
  if (targetW * targetH > MAX_PIXELS) {
    const k = Math.sqrt(MAX_PIXELS / (targetW * targetH));
    targetW = Math.floor(targetW * k); targetH = Math.floor(targetH * k);
  }
  const askedW = targetW;
  let cur = img, w = img.width, h = img.height;
  if (targetW <= w) return { dataUrl, w, h, steps: 0, capped: false, askedW };

  let steps = 0;
  while (w < targetW) {
    w = Math.min(targetW, Math.round(w * STEP));
    h = Math.min(targetH, Math.round(h * STEP));
    cur = draw(cur, w, h);
    steps++;
  }
  return {
    dataUrl: cur.toDataURL(type, type === 'image/jpeg' ? 0.94 : undefined),
    w, h, steps,
    capped: w < askedW,   // 캔버스 한계로 목표에 못 미쳤다면 알려야 한다
    askedW,
  };
}

// 외부 초해상 API를 붙일 자리.
// 지금은 쓰지 않는다 — 붙이려면 키·엔드포인트·요금 정책이 먼저 정해져야 한다.
// (Replicate의 Real-ESRGAN, Stability의 upscale 등이 후보)
export async function upscaleWithApi() {
  throw new Error('초해상 API가 아직 연결되지 않았습니다 — 지금은 리샘플링만 지원합니다');
}
