// PDF·이미지 OCR. macOS 기본 Vision 프레임워크를 쓰는 tools/pdf-ocr.swift를 처음 한 번 컴파일해서 쓴다.
// 같은 파일(내용 해시)은 다시 읽지 않도록 결과를 캐시한다.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

let dirs = null;
let compiling = null;

export function setOcrDirs(root, data) {
  dirs = {
    src: path.join(root, 'tools', 'pdf-ocr.swift'),
    bin: path.join(data, 'bin', 'pdf-ocr'),
    files: path.join(data, 'files'), // 내려받은 파일은 여기에만 둔다
    cache: path.join(data, 'ocr-cache'),
  };
}

export const ocrAvailable = () => process.platform === 'darwin';

const run = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  execFile(cmd, args, { maxBuffer: 50 * 1024 * 1024, ...opts }, (err, stdout, stderr) => err ? reject(new Error(stderr || err.message)) : resolve(stdout));
});

async function ensureBinary() {
  if (existsSync(dirs.bin)) return;
  compiling ||= (async () => {
    await mkdir(path.dirname(dirs.bin), { recursive: true });
    await run('swiftc', ['-O', dirs.src, '-o', dirs.bin], { timeout: 300000 });
  })();
  await compiling;
}

// 내려받기 전에 알 수 있는 키(노션 블록 id + 수정 시각 등)로 캐시를 먼저 본다
export async function ocrByKey(key, getBuffer, ext) {
  const safe = key.replace(/[^\w.-]/g, '_').slice(0, 120);
  const cacheFile = path.join(dirs.cache, 'k-' + safe + '.json');
  if (existsSync(cacheFile)) return JSON.parse(await readFile(cacheFile, 'utf8'));
  const out = await ocrBuffer(await getBuffer(), ext);
  await writeFile(cacheFile, JSON.stringify(out));
  return out;
}

// 반환: [{ page, source: 'text'|'ocr'|'text+ocr', lines: [...] }]
export async function ocrBuffer(buf, ext, maxPages = 60) {
  if (!ocrAvailable()) throw new Error('OCR은 macOS에서만 됩니다');
  const key = createHash('sha256').update(buf).digest('hex').slice(0, 24);
  const cacheFile = path.join(dirs.cache, key + '.json');
  if (existsSync(cacheFile)) return JSON.parse(await readFile(cacheFile, 'utf8'));
  await ensureBinary();
  await mkdir(dirs.files, { recursive: true });
  await mkdir(dirs.cache, { recursive: true });
  const file = path.join(dirs.files, key + '.' + ext);
  if (!existsSync(file)) await writeFile(file, buf);
  const out = JSON.parse(await run(dirs.bin, [file, String(maxPages)], { timeout: 300000 }));
  await writeFile(cacheFile, JSON.stringify(out));
  return out;
}
