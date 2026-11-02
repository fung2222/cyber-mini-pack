import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const src = readFileSync(new URL('../js/audio.js', import.meta.url), 'utf8');

test('mini-pack BGM has no ambient noise bed', () => {
  assert.match(src, /startAmbient\(\) \{\}/, 'startAmbient must be a no-op');
  assert.doesNotMatch(src, /createBuffer/, 'BGM must not allocate a noise buffer');
});

test('mini-pack BGM keeps only tonal instruments', () => {
  assert.match(src, /hats: false/, 'chill preset noise hats must be disabled');
  assert.match(src, /playStep\(step, time, s16\)/, 'playStep override must exist');
  assert.match(src, /this\.noiseHit = \(\) => \{\}/, 'BGM noise hits must be suppressed');
});
