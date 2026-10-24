import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// T21-6: Recovery board: .in is 140 wide (app was 350, 210 px off), .ta min-height 84 (app 76).
const css = readFileSync(new URL('../src/recovery.css', import.meta.url), 'utf8');
test('Recovery time field is 140 px wide', () => assert.match(css, /\.in\.rc-time\{width:140px\}/));
test('Recovery long answers have min-height 84px', () => assert.match(css, /#rc-decision,#rc-change\{min-height:84px\}/));
