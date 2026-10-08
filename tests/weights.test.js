import test from 'node:test';import assert from 'node:assert/strict';
import {setWeight} from '../src/logic.js';import {S} from './fixtures.js';
test('setWeight keeps one entry per date, sorted, and is pure',()=>{
 const s=S({weights:[{date:'2026-10-05',kg:80}]});const snap=JSON.stringify(s);
 let t=setWeight(s,'2026-10-03',81.2);t=setWeight(t,'2026-10-05',79.6);
 assert.equal(JSON.stringify(s),snap);
 assert.deepEqual(t.weights,[{date:'2026-10-03',kg:81.2},{date:'2026-10-05',kg:79.6}])});
