import test from 'node:test';import assert from 'node:assert/strict';
import * as L from '../src/logic.js';import {S,B} from './fixtures.js';
// The row menu hides Edit for orphans, so the UI must be able to tell them apart.
test('occurrencesOn flags orphans and only orphans',()=>{
 const wk=B({id:'w',date:'2026-10-05',start:'09:00',end:'10:00',repeat:{type:'weekdays',days:[]}});
 let s=S({blocks:[wk]});s=L.completeOcc(s,L.occurrencesOn(s,'2026-10-06')[0]);
 assert.equal(L.occurrencesOn(s,'2026-10-06')[0].orphan,false);
 s=L.upsertBlock(s,{...wk,repeat:{type:'custom',days:[0]}});
 assert.equal(L.occurrencesOn(s,'2026-10-06')[0].orphan,true);
 assert.equal(L.occurrencesOn(s,'2026-10-12')[0].orphan,false)});
