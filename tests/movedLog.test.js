import test from 'node:test';import assert from 'node:assert/strict';
import {logTime} from '../src/timeLog.js';
import {occurrencesOn,moveOccurrence,goalMinutes} from '../src/logic.js';import {S,B} from './fixtures.js';
// Spec §1.6: a moved original "counts as neither missed nor done", so logging time on it must not count.
test('logTime on a moved original changes nothing (no double count on the old day)',()=>{
 const s=moveOccurrence(S({blocks:[B()]}),'b1:2026-10-08',B({id:'nb',date:'2026-10-09'}));
 const orig=occurrencesOn(s,'2026-10-08').find(o=>o.blockId==='b1');
 assert.ok(orig.movedTo);
 const after=logTime(s,orig,30,'add');
 assert.equal(after,s);
 assert.equal(goalMinutes(after,'2026-10-08','biz'),0)});
