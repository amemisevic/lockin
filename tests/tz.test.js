import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Plan Task 8: flow.test.js and boundary.test.js in three time zones, plus two DST-day scenario runs.
// EXPECT_OFFSET makes each child prove the zone really applied (Windows may ignore an unknown TZ).
// The exact pass count proves the child ran every test (an empty or skipped run cannot pass).
const FLOW = 13, BOUNDARY = 7;
const RUNS = [
  { TZ: 'Europe/Sarajevo', EXPECT_OFFSET: '-60', files: ['tests/flow.test.js', 'tests/boundary.test.js'], pass: FLOW + BOUNDARY },
  { TZ: 'America/Los_Angeles', EXPECT_OFFSET: '480', files: ['tests/flow.test.js', 'tests/boundary.test.js'], pass: FLOW + BOUNDARY },
  { TZ: 'Pacific/Auckland', EXPECT_OFFSET: '-780', files: ['tests/flow.test.js', 'tests/boundary.test.js'], pass: FLOW + BOUNDARY },
  // Day 4 = 2026-10-25 (EU fall back, 25 hours).
  { TZ: 'Europe/Sarajevo', EXPECT_OFFSET: '-60', FLOW_START: '2026-10-22', files: ['tests/flow.test.js'], pass: FLOW },
  // Day 4 = 2026-11-01 (US fall back, 25 hours).
  { TZ: 'America/Los_Angeles', EXPECT_OFFSET: '480', FLOW_START: '2026-10-29', files: ['tests/flow.test.js'], pass: FLOW },
];

for (const { files, pass, ...vars } of RUNS) {
  test(`${Object.values(vars).join(' ')}: ${files.join(' + ')} pass (${pass} tests)`, () => {
    // Drop the parent runner's NODE_TEST_CONTEXT and any inherited FLOW_START / EXPECT_OFFSET: each run sets its own.
    const { NODE_TEST_CONTEXT, FLOW_START, EXPECT_OFFSET, ...env } = process.env;
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files],
      { env: { ...env, ...vars }, encoding: 'utf8' });
    const out = `${r.stdout}${r.stderr}`;
    assert.equal(r.status, 0, out);
    assert.equal(Number(out.match(/^# pass (\d+)$/m)?.[1]), pass, out);
    assert.match(out, /^# fail 0$/m, out);
  });
}
