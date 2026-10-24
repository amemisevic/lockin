import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkVague } from '../src/core/recovery.js';

// Backlog T5-1 (Task 21): the keyword list is pinned both ways. tests/recovery.test.js proves every listed word passes;
// this proves the regex holds no extra word (a core edit that adds one fails here).
const PLAN = 'block delete move remove uninstall unplug charge lock leave turn put set install change cancel'.split(' ');
const src = readFileSync(new URL('../src/core/recovery.js', import.meta.url), 'utf8');
const inRegex = src.match(/const KEYWORD = \/\\b\(([^)]*)\)\\b\/i;/)?.[1].split('|');

test('the KEYWORD regex lists exactly the plan words', () => {
  assert.ok(inRegex, 'KEYWORD line not found');
  assert.deepEqual([...inRegex].sort(), [...PLAN].sort());
});

test('a word outside the list does not pass, any case', () => {
  for (const w of ['stop', 'quit', 'hide', 'ban', 'Throw', 'DISABLE']) assert.notEqual(checkVague(`${w} the thing tonight`), null, w);
});
