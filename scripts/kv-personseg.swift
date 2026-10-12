// Apple Vision 인물 분리 → 흑백 마스크 PNG(흰 = 사람). macOS 12+ · scripts/kv-cutout.py --person 이 부른다.
//   swift scripts/kv-personseg.swift <입력 그림> <출력 마스크.png>
import Foundation
import Vision
import CoreImage
import AppKit
let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: kv-personseg.swift in out.png"); exit(64) }
let url = URL(fileURLWithPath: args[1]); let out = URL(fileURLWithPath: args[2])
guard let ci = CIImage(contentsOf: url) else { print("load fail"); exit(1) }
let req = VNGeneratePersonSegmentationRequest()
req.qualityLevel = .accurate
req.outputPixelFormat = kCVPixelFormatType_OneComponent8
let h = VNImageRequestHandler(ciImage: ci, options: [:])
try h.perform([req])
guard let res = req.results?.first else { print("no person"); exit(2) }
let mask = CIImage(cvPixelBuffer: res.pixelBuffer)
let sx = ci.extent.width / mask.extent.width, sy = ci.extent.height / mask.extent.height
let scaled = mask.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
let ctx = CIContext()
guard let cg = ctx.createCGImage(scaled, from: ci.extent, format: .L8, colorSpace: CGColorSpaceCreateDeviceGray()) else { exit(3) }
try NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!.write(to: out)
print("ok", Int(ci.extent.width), Int(ci.extent.height))
