// 브라우저 내 래스터화 — 자기완결 HTML(인라인 스타일)을 SVG foreignObject로 감싸
// canvas에 그려 PNG/JPG로 뽑는다. 외부 라이브러리 0. 배수(1~4x) 지원.
// 전제: 우리 렌더러 산출물은 태그가 정형(XML-safe)이고 리소스가 인라인(dataURL)이다.

// quantize: PNG 색 단계(채널당 레벨 수, 예 32) — 용량 상한을 넘는 PNG 를 재양자화해 가볍게(10-28 용량 다운그레이드). null 이면 그대로
export async function rasterizeCanvas(html, w, h, scale = 1, type = 'png', quality = 0.92, quantize = null) {
  const canvas = await drawCanvas(html, w, h, scale, type);
  if (quantize && type !== 'jpg') posterize(canvas, quantize);
  const blob = await new Promise(res => canvas.toBlob(res, type === 'jpg' ? 'image/jpeg' : 'image/png', quality));
  return { canvas, blob };
}

async function drawCanvas(html, w, h, scale, type) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}">
<foreignObject width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml">${html}</div></foreignObject></svg>`;
  const img = new Image();
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('SVG 렌더 실패')); img.src = url; });
  const canvas = document.createElement('canvas');
  canvas.width = w * scale; canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  if (type === 'jpg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// 채널당 levels 단계로 색을 뭉친다(알파는 그대로) — deflate 가 잘 먹어 PNG 가 가벼워진다. 글자·로고 경계는 그대로(픽셀 위치 불변)
export function posterize(canvas, levels = 32) {
  const ctx = canvas.getContext('2d'); const im = ctx.getImageData(0, 0, canvas.width, canvas.height); const d = im.data;
  const step = 255 / (Math.max(2, levels) - 1);
  for (let i = 0; i < d.length; i += 4) { d[i] = Math.round(d[i] / step) * step; d[i + 1] = Math.round(d[i + 1] / step) * step; d[i + 2] = Math.round(d[i + 2] / step) * step; }
  ctx.putImageData(im, 0, 0);
}

export async function rasterize(html, w, h, scale = 1, type = 'png') {
  const canvas = await drawCanvas(html, w, h, scale, type);
  return new Promise(res => canvas.toBlob(res, type === 'jpg' ? 'image/jpeg' : 'image/png', 0.92));
}

export function download(blob, filename) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function downloadText(text, filename, mime = 'text/html') {
  download(new Blob([text], { type: mime }), filename);
}

// 인쇄물: @page 규격이 박힌 HTML을 새 창에서 열고 인쇄 대화상자 → "PDF로 저장".
// Chrome이 @page size를 용지 크기로 사용 — 블리드 포함 실측 mm 그대로 나온다.
export function openPrintPdf(html) {
  const w = window.open('', '_blank');
  if (!w) throw new Error('팝업이 차단됐습니다 — 브라우저에서 허용해 주세요');
  w.document.write(html + '<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>');
  w.document.close();
}
