// CAMERA.md's `camera-rules` block and src/core/rules.ts must be the same data.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { RULES } from '../../src/core/rules.ts';

const doc = readFileSync(new URL('../../CAMERA.md', import.meta.url), 'utf8');

test('CAMERA.md camera-rules block equals RULES', () => {
  const m = /```json camera-rules\n([\s\S]*?)\n```/.exec(doc);
  assert.ok(m, 'CAMERA.md has a ```json camera-rules block');
  assert.deepEqual(JSON.parse(m[1]!), JSON.parse(JSON.stringify(RULES)));
});

test('CAMERA.md spring table matches the spring maths', async () => {
  const { springProgress } = await import('../../src/core/spring.ts');
  const row = /\| progress \|(.*)\|/.exec(doc);
  assert.ok(row);
  const want = row[1]!.split('|').map((c) => Number.parseFloat(c));
  const taus = [0.1, 0.211, 0.25, 0.5, 0.75, 1, 1.25, 1.5];
  assert.equal(want.length, taus.length);
  taus.forEach((tau, i) => assert.equal((springProgress(tau, 1) * 100).toFixed(1), want[i]!.toFixed(1)));
});
