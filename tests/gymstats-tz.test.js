import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// G5: tests/gymstats-edge.test.js (weeks and visits at clock changes and midnight) in three time zones.
// EXPECT_OFFSET makes each child prove the zone really applied; the exact pass count proves every test ran.
const TESTS = 5; // number of tests in tests/gymstats-edge.test.js
const RUNS = [
  { TZ: 'Europe/Sarajevo', EXPECT_OFFSET: '-60' },
  { TZ: 'America/Los_Angeles', EXPECT_OFFSET: '480' },
  { TZ: 'Pacific/Auckland', EXPECT_OFFSET: '-780' },
];

for (const vars of RUNS) {
  test(`${vars.TZ}: tests/gymstats-edge.test.js passes (${TESTS} tests)`, () => {
    const { NODE_TEST_CONTEXT, FLOW_START, EXPECT_OFFSET, ...env } = process.env;
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/gymstats-edge.test.js'],
      { env: { ...env, ...vars }, encoding: 'utf8' });
    const out = `${r.stdout}${r.stderr}`;
    assert.equal(r.status, 0, out);
    assert.equal(Number(out.match(/^# pass (\d+)$/m)?.[1]), TESTS, out);
    assert.match(out, /^# fail 0$/m, out);
  });
}
