import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARCHETYPES } from '../src/views/checkinNightLogic.js';

// Backlog T16-6 (Task 21): the Night view keeps its own copy of the five archetype ids (core does not export them).
// Read the core source instead of adding an export, and fail if the two lists ever differ.
const pack = readFileSync(new URL('../src/core/pack.js', import.meta.url), 'utf8');
const core = pack.match(/const ARCHETYPES = \[([^\]]*)\];/)?.[1].split(',').map(s => s.trim().replace(/^'|'$/g, ''));

test('the view ARCHETYPES equal the core list, same ids in the same order', () => {
  assert.ok(core, 'core ARCHETYPES not found in src/core/pack.js');
  assert.equal(core.length, 5);
  assert.deepEqual([...ARCHETYPES], core);
});

test('every view archetype is accepted by the pack validator', async () => {
  const { validatePack } = await import('../src/core/pack.js');
  for (const a of ARCHETYPES) {
    const r = validatePack(JSON.stringify({ v: 1, missions: [], tactics: [{ archetype: a, name: 'Name A' }] }));
    assert.equal(r.ok, true, a);
  }
});
