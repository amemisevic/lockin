import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../src/store.js';import {goals,S,B} from './fixtures.js';
const mem=()=>{const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),m}};
test('defaultState matches the locked rules and ships no personal data',()=>{
 const d=T.defaultState('2026-10-08');
 assert.deepEqual(d.goals,goals());
 assert.deepEqual(d.goals.map(g=>g.id),['biz','uni','body','social']);
 assert.deepEqual(d.redLines,[]);assert.deepEqual(d.weights,[]);assert.equal(d.targetWeightKg,null);
 assert.deepEqual(d.blocks,[]);assert.equal(d.lastBackup,null);assert.equal(d.timer,null);
 assert.ok(d.goals.every(g=>g.committedUntil==='2026-11-07'))});
test('load on empty storage returns defaults; save/load round-trips',()=>{
 const st=mem();assert.deepEqual(T.load(st,'2026-10-08'),T.defaultState('2026-10-08'));
 const s=S({blocks:[B()]});assert.equal(T.save(st,s),true);
 assert.deepEqual(T.load(st,'2026-10-08'),{...s,blocks:[B()]})});
test('corrupt storage returns defaults and keeps the raw text',()=>{
 for(const raw of['{not json','{"v":1}','{"v":2,"goals":[]}','null']){
  const st=mem();st.setItem(T.KEY,raw);
  assert.deepEqual(T.load(st,'2026-10-08'),T.defaultState('2026-10-08'));assert.equal(st.getItem(T.CORRUPT),raw)}});
test('save reports failure instead of throwing (quota, blocked storage)',()=>{
 const st={getItem:()=>null,setItem:()=>{throw new Error('QuotaExceededError')}};
 assert.equal(T.save(st,S()),false)});
test('validateImport rejects bad files with a message',()=>{
 for(const t of['','   ','nope','{"v":2}','{"v":1,"goals":[]}',JSON.stringify({...S(),goals:[{name:'x'}]}),
  JSON.stringify({...S(),blocks:[{id:'1'}]}),JSON.stringify({...S(),timer:{occId:5}}),JSON.stringify({...S(),occ:[]})]){
  const r=T.validateImport(t);assert.equal(r.ok,false,t);assert.ok(r.error.length>0);assert.equal(r.state,undefined)}});
test('validateImport accepts an export and fills new optional fields',()=>{
 const r=T.validateImport(T.exportJson(T.defaultState('2026-10-08')));assert.equal(r.ok,true);
 const old={...S()};delete old.lastBackup;delete old.timer;
 const r2=T.validateImport(JSON.stringify(old));assert.equal(r2.ok,true);assert.equal(r2.state.lastBackup,null);assert.equal(r2.state.timer,null)});
test('backup status',()=>{
 assert.deepEqual(T.backupStatus(S(),'2026-10-08'),{days:null,overdue:true});
 assert.deepEqual(T.backupStatus(T.markBackup(S(),'2026-10-01'),'2026-10-08'),{days:7,overdue:false});
 assert.deepEqual(T.backupStatus(T.markBackup(S(),'2026-10-01'),'2026-10-09'),{days:8,overdue:true})});
