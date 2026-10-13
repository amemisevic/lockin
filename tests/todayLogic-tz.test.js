import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Plan Task 12: the Today cards and the 20:00 night start in three time zones, DST days included (pattern of tests/tz.test.js).
// EXPECT_OFFSET makes each child prove the zone really applied; the exact pass count proves every test ran.
const TESTS = 20; // number of tests in tests/todayLogic.test.js
const RUNS = [
  { TZ: 'Europe/Sarajevo', EXPECT_OFFSET: '-60' },
  { TZ: 'America/Los_Angeles', EXPECT_OFFSET: '480' },
  { TZ: 'Pacific/Auckland', EXPECT_OFFSET: '-780' },
];

for (const vars of RUNS) {
  test(`${vars.TZ}: tests/todayLogic.test.js passes (${TESTS} tests)`, () => {
    const { NODE_TEST_CONTEXT, FLOW_START, EXPECT_OFFSET, ...env } = process.env;
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/todayLogic.test.js'],
      { env: { ...env, ...vars }, encoding: 'utf8' });
    const out = `${r.stdout}${r.stderr}`;
    assert.equal(r.status, 0, out);
    assert.equal(Number(out.match(/^# pass (\d+)$/m)?.[1]), TESTS, out);
    assert.match(out, /^# fail 0$/m, out);
  });
}
