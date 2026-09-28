import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildZip, crc32 } from '../app/zip.js';

test('crc32 matches the reference value for "123456789"', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
});

test('a zip with folders and Korean names round-trips through a standard unzipper', () => {
  const enc = new TextEncoder();
  const files = [
    { name: '카카오톡/한진정보통신_클라우드_카카오톡_1029x258_v1.txt', data: enc.encode('hello') },
    { name: '리멤버/a.txt', data: enc.encode('world') },
  ];
  const zip = buildZip(files, new Date(2026, 8, 28, 10, 0, 0));
  assert.equal(zip[0], 0x50); assert.equal(zip[1], 0x4b);
  const dir = mkdtempSync(join(tmpdir(), 'zip-'));
  const p = join(dir, 't.zip');
  writeFileSync(p, zip);
  // 맥의 Info-ZIP unzip은 UTF-8 이름 플래그를 무시해 한글 경로를 못 만든다(zip 문제가 아니다) — 파이썬 zipfile로 푼다
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', p, dir]);
  assert.equal(readFileSync(join(dir, files[0].name), 'utf8'), 'hello');
  assert.equal(readFileSync(join(dir, files[1].name), 'utf8'), 'world');
});
