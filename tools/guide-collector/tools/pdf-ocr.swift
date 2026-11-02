// PDF·이미지 → 페이지별 텍스트 줄(JSON). PDF에 텍스트 레이어가 있으면 그걸 쓰고, 없으면(이미지 PDF) Vision OCR로 읽는다.
// 사용법: pdf-ocr <file.pdf|file.png|file.jpg> [maxPages]
import Foundation
import PDFKit
import Vision

struct PageText: Codable { let page: Int; let source: String; let lines: [String] }

let args = CommandLine.arguments
guard args.count >= 2 else {
  FileHandle.standardError.write("usage: pdf-ocr <file> [maxPages]\n".data(using: .utf8)!)
  exit(1)
}
let fileURL = URL(fileURLWithPath: args[1])
let maxPages = args.count >= 3 ? Int(args[2]) ?? 40 : 40

func ocr(_ page: PDFPage) -> [String] {
  let box = page.bounds(for: .mediaBox)
  let scale = min(2.5, 2400 / max(box.width, box.height))
  let size = CGSize(width: box.width * scale, height: box.height * scale)
  let image = page.thumbnail(of: size, for: .mediaBox)
  guard let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return [] }
  return ocrImage(cg)
}

func ocrImage(_ cg: CGImage) -> [String] {
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.recognitionLanguages = ["ko-KR", "en-US"]
  request.usesLanguageCorrection = false // 1200x628 같은 숫자를 단어로 고치지 않게
  try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([request])
  // 위에서 아래, 왼쪽에서 오른쪽 순서로 정렬
  let obs = (request.results ?? []).sorted {
    abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.01 ? $0.boundingBox.midY > $1.boundingBox.midY : $0.boundingBox.minX < $1.boundingBox.minX
  }
  return obs.compactMap { $0.topCandidates(1).first?.string }
}

var out: [PageText] = []
guard let doc = PDFDocument(url: fileURL) else {
  // PDF가 아니면 이미지로 읽는다
  guard let src = CGImageSourceCreateWithURL(fileURL as CFURL, nil), let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
    FileHandle.standardError.write("cannot open file\n".data(using: .utf8)!)
    exit(1)
  }
  out.append(PageText(page: 1, source: "ocr", lines: ocrImage(cg)))
  FileHandle.standardOutput.write(try JSONEncoder().encode(out))
  exit(0)
}
for i in 0..<min(doc.pageCount, maxPages) {
  guard let page = doc.page(at: i) else { continue }
  let text = (page.string ?? "").split(whereSeparator: \.isNewline).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
  // 소개서 PDF는 제목만 글자고 규격표는 이미지인 경우가 많아서, 글자가 적은 페이지는 OCR도 같이 한다
  if text.count >= 40 {
    out.append(PageText(page: i + 1, source: "text", lines: text))
  } else {
    var seen = Set(text)
    let merged = text + ocr(page).filter { seen.insert($0).inserted }
    out.append(PageText(page: i + 1, source: text.isEmpty ? "ocr" : "text+ocr", lines: merged))
  }
}
let data = try JSONEncoder().encode(out)
FileHandle.standardOutput.write(data)
