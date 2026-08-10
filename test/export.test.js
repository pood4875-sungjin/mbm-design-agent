import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findChrome, exportPng, exportPdf } from '../core/export.js';

const chrome = findChrome();

test('exportPng renders html to png at exact size', { skip: !chrome }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'mbm-export-'));
  const html = join(dir, 'b.html');
  writeFileSync(html, '<body style="margin:0;background:#0A3D91;width:300px;height:250px"></body>');
  const out = exportPng(html, join(dir, 'b.png'), 300, 250);
  assert.ok(statSync(out).size > 500);
  const buf = readFileSync(out);
  assert.equal(buf[1], 0x50, 'PNG signature');
});

test('exportPdf renders html to pdf', { skip: !chrome }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'mbm-export-'));
  const html = join(dir, 'p.html');
  writeFileSync(html, '<style>@page{size:426mm 600mm;margin:0}</style><body style="background:#0A3D91">X</body>');
  const out = exportPdf(html, join(dir, 'p.pdf'));
  assert.equal(readFileSync(out).subarray(0, 4).toString(), '%PDF');
});
