import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// G13: tests/gym-g13-week.test.js (weekly target on and off around week edges and clock changes) in three time zones.
// EXPECT_OFFSET makes each child prove the zone really applied; the exact pass count proves every test ran.
const TESTS = 5; // number of tests in tests/gym-g13-week.test.js
const RUNS = [
  { TZ: 'Europe/Sarajevo', EXPECT_OFFSET: '-60' },
  { TZ: 'America/Los_Angeles', EXPECT_OFFSET: '480' },
  { TZ: 'Pacific/Auckland', EXPECT_OFFSET: '-780' },
];

for (const vars of RUNS) {
  test(`${vars.TZ}: tests/gym-g13-week.test.js passes (${TESTS} tests)`, () => {
    const { NODE_TEST_CONTEXT, FLOW_START, EXPECT_OFFSET, ...env } = process.env;
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/gym-g13-week.test.js'],
      { env: { ...env, ...vars }, encoding: 'utf8' });
    const out = `${r.stdout}${r.stderr}`;
    assert.equal(r.status, 0, out);
    assert.equal(Number(out.match(/^# pass (\d+)$/m)?.[1]), TESTS, out);
    assert.match(out, /^# fail 0$/m, out);
  });
}
