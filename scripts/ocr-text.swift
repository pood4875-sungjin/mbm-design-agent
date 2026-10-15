// 그림 속 글자 줄 찾기(Apple Vision, 한국어+영어) — 디자이너 산출물(이미지)과 우리 렌더를 같은 자로 재서 구조를 견준다(scripts/design-score.py).
//   swift scripts/ocr-text.swift <그림> [그림 …]  → 줄마다 JSON {file, w, h, lines:[{text, conf, x, y, w, h}]} (좌표는 픽셀, 왼쪽 위 기준)
import Foundation
import Vision
import AppKit

var out: [[String: Any]] = []
for path in CommandLine.arguments.dropFirst() {
  guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { out.append(["file": path, "error": "load"]); continue }
  let W = Double(cg.width), H = Double(cg.height)
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  req.recognitionLanguages = ["ko-KR", "en-US"]
  req.usesLanguageCorrection = false
  req.minimumTextHeight = 0.008
  let h = VNImageRequestHandler(cgImage: cg, options: [:])
  try? h.perform([req])
  var lines: [[String: Any]] = []
  for o in (req.results ?? []) {
    guard let c = o.topCandidates(1).first else { continue }
    let b = o.boundingBox
    lines.append(["text": c.string, "conf": Double(c.confidence), "x": b.minX * W, "y": (1 - b.maxY) * H, "w": b.width * W, "h": b.height * H])
  }
  out.append(["file": path, "w": W, "h": H, "lines": lines])
}
let data = try! JSONSerialization.data(withJSONObject: out, options: [])
print(String(data: data, encoding: .utf8)!)
