// Apple Vision 인물 상자 — 인물 분리 마스크의 상자·면적 + 얼굴 상자를 JSON 으로 낸다(좌표 0~1, 왼쪽 위 기준). macOS 12+.
// 색으로 사람을 못 가르는 사진(흰 가운 × 흰 흐린 배경 hr-doctor, 꽉 찬 간호사 사진)의 주인공 상자(focus)를 잡는 데만 쓴다 — 마스크로 오려 내지 않는다.
// scripts/cases.mjs measure 가 부른다(10-12 결정 반영·남은 문제).
//   swift scripts/kv-person.swift <그림>   →  {"person":{x0,y0,x1,y1,area,fill}|null,"faces":[{x0,y0,x1,y1,conf}]}
import Foundation
import Vision
import CoreImage
let args = CommandLine.arguments
guard args.count >= 2 else { print("usage: kv-person.swift in"); exit(64) }
guard let ci = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else { print("{\"error\":\"load\"}"); exit(1) }
let h = VNImageRequestHandler(ciImage: ci, options: [:])
let seg = VNGeneratePersonSegmentationRequest(); seg.qualityLevel = .balanced; seg.outputPixelFormat = kCVPixelFormatType_OneComponent8
let face = VNDetectFaceRectanglesRequest()
try? h.perform([seg, face])
func r(_ v: Double) -> Double { (v * 1000).rounded() / 1000 }
var out: [String: Any] = ["person": NSNull(), "faces": [[String: Double]]()]
if let pb = seg.results?.first?.pixelBuffer {
  CVPixelBufferLockBaseAddress(pb, .readOnly)
  let w = CVPixelBufferGetWidth(pb), hh = CVPixelBufferGetHeight(pb), bpr = CVPixelBufferGetBytesPerRow(pb)
  let p = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
  var x0 = w, y0 = hh, x1 = -1, y1 = -1, n = 0
  for y in 0..<hh { for x in 0..<w where p[y * bpr + x] > 127 { n += 1; if x < x0 { x0 = x }; if x > x1 { x1 = x }; if y < y0 { y0 = y }; if y > y1 { y1 = y } } }
  CVPixelBufferUnlockBaseAddress(pb, .readOnly)
  if n > 0 {
    let bx = Double(x1 - x0 + 1) / Double(w), by = Double(y1 - y0 + 1) / Double(hh)
    out["person"] = ["x0": r(Double(x0) / Double(w)), "y0": r(Double(y0) / Double(hh)), "x1": r(Double(x1 + 1) / Double(w)), "y1": r(Double(y1 + 1) / Double(hh)),
                     "area": r(Double(n) / Double(w * hh)), "fill": r(Double(n) / (bx * by * Double(w * hh)))]
  }
}
out["faces"] = (face.results ?? []).map { f -> [String: Double] in
  let b = f.boundingBox   // Vision: 왼쪽 아래 기준
  return ["x0": r(Double(b.minX)), "y0": r(Double(1 - b.maxY)), "x1": r(Double(b.maxX)), "y1": r(Double(1 - b.minY)), "conf": r(Double(f.confidence))]
}
let d = try JSONSerialization.data(withJSONObject: out, options: [.sortedKeys])
print(String(data: d, encoding: .utf8)!)
