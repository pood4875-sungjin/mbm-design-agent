// 브라우저 내 래스터화 — 자기완결 HTML(인라인 스타일)을 SVG foreignObject로 감싸
// canvas에 그려 PNG/JPG로 뽑는다. 외부 라이브러리 0. 배수(1~4x) 지원.
// 전제: 우리 렌더러 산출물은 태그가 정형(XML-safe)이고 리소스가 인라인(dataURL)이다.

export async function rasterizeCanvas(html, w, h, scale = 1, type = 'png', quality = 0.92) {
  const canvas = await drawCanvas(html, w, h, scale, type);
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
