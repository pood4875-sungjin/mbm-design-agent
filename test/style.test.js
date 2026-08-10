import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStyle } from '../core/style.js';

test('normalizeStyle produces the standard structure from designer input', () => {
  const s = normalizeStyle({
    keyVisual: 'assets/kv.png',
    colors: ['#0A3D91', '#F5F7FA'],
    fonts: { heading: 'Pretendard', body: 'Pretendard' },
    logo: 'assets/logo.svg',
    mood: ['테크', '신뢰'],
  });
  assert.equal(s.keyVisual, 'assets/kv.png');
  assert.deepEqual(s.palette, { primary: '#0A3D91', bg: '#F5F7FA', ink: '#1A1A1A' });
  assert.equal(s.fonts.heading, 'Pretendard');
  assert.deepEqual(s.mood, ['테크', '신뢰']);
});

test('normalizeStyle applies defaults for omitted fields', () => {
  const s = normalizeStyle({ colors: ['#FF5500'] });
  assert.equal(s.keyVisual, null);
  assert.equal(s.palette.primary, '#FF5500');
  assert.equal(s.palette.bg, '#FFFFFF');
  assert.equal(s.fonts.heading, 'Pretendard');
});

test('normalizeStyle rejects invalid hex colors', () => {
  assert.throws(() => normalizeStyle({ colors: ['blue'] }), /hex/i);
});
