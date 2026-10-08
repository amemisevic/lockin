import test from 'node:test';import assert from 'node:assert/strict';
import * as L from '../src/logic.js';import {S,B} from './fixtures.js';
const wk=(o={})=>B({id:'w',date:'2026-10-05',start:'09:00',end:'10:00',repeat:{type:'weekdays',days:[]},...o});
test('validateBlock',()=>{
 assert.equal(L.validateBlock(B({title:'  '})),'title-required');
 assert.equal(L.validateBlock(B({start:'23:00',end:'01:00'})),'ends-before-start');
 assert.equal(L.validateBlock(B({start:'09:00',end:'09:00'})),'ends-before-start');
 assert.equal(L.validateBlock(B({start:'25:00'})),'bad-time');
 assert.equal(L.validateBlock(B()),null)});
test('occurrencesOn repeat rules',()=>{
 const s=S({blocks:[wk()]});
 assert.equal(L.occurrencesOn(s,'2026-10-09').length,1);
 assert.equal(L.occurrencesOn(s,'2026-10-10').length,0);
 assert.equal(L.occurrencesOn(s,'2026-10-01').length,0);
 const c=S({blocks:[B({repeat:{type:'custom',days:[0,2]},date:'2026-10-05'})]});
 assert.equal(L.occurrencesOn(c,'2026-10-05').length,1);assert.equal(L.occurrencesOn(c,'2026-10-07').length,1);assert.equal(L.occurrencesOn(c,'2026-10-06').length,0);
 const one=S({blocks:[B()]});assert.equal(L.occurrencesOn(one,'2026-10-08').length,1);assert.equal(L.occurrencesOn(one,'2026-10-09').length,0);
 const d=S({blocks:[B({repeat:{type:'daily',days:[]},until:'2026-10-09',skip:['2026-10-07']})]});
 assert.equal(L.occurrencesOn(d,'2026-10-07').length,0);assert.equal(L.occurrencesOn(d,'2026-10-08').length,1);
 assert.equal(L.occurrencesOn(d,'2026-10-09').length,1);assert.equal(L.occurrencesOn(d,'2026-10-12').length,0)});
test('occurrences sorted by start',()=>{
 const s=S({blocks:[B({id:'late',start:'18:00',end:'19:00'}),B({id:'early',start:'07:00',end:'08:00'})]});
 assert.deepEqual(L.occurrencesOn(s,'2026-10-08').map(o=>o.blockId),['early','late'])});
test('repeat isolation: done on Friday does not touch Monday',()=>{
 let s=S({blocks:[wk()]});const fri=L.occurrencesOn(s,'2026-10-09')[0];
 s=L.completeOcc(s,fri);
 assert.equal(L.occurrencesOn(s,'2026-10-09')[0].done,true);
 assert.equal(L.occurrencesOn(s,'2026-10-12')[0].done,false)});
test('history is frozen when completed (edit block later)',()=>{
 let s=S({blocks:[wk({title:'A',tag:'biz'})]});
 s=L.completeOcc(s,L.occurrencesOn(s,'2026-10-06')[0]);
 s=L.upsertBlock(s,wk({title:'B',tag:'uni',end:'12:00'}));
 const past=L.occurrencesOn(s,'2026-10-06')[0];
 assert.deepEqual([past.title,past.tag,L.minutesFor(past)],['A','biz',60]);
 const fut=L.occurrencesOn(s,'2026-10-07')[0];assert.deepEqual([fut.title,fut.tag,fut.plannedMin],['B','uni',180])});
test('done day survives the series no longer covering it (orphan)',()=>{
 let s=S({blocks:[wk()]});s=L.completeOcc(s,L.occurrencesOn(s,'2026-10-06')[0]);
 s=L.upsertBlock(s,wk({repeat:{type:'custom',days:[0]}}));
 const o=L.occurrencesOn(s,'2026-10-06');assert.equal(o.length,1);assert.equal(L.minutesFor(o[0]),60)});
test('minutesFor',()=>{
 const o={plannedMin:80,done:true,actualMin:undefined};
 assert.equal(L.minutesFor(o),80);assert.equal(L.minutesFor({...o,actualMin:0}),0);assert.equal(L.minutesFor({...o,actualMin:55}),55);
 assert.equal(L.minutesFor({plannedMin:80,done:false,actualMin:undefined}),0)});
test('completeOcc / uncompleteOcc are pure',()=>{
 const s=S({blocks:[B()]});const snap=JSON.stringify(s);const o=L.occurrencesOn(s,'2026-10-08')[0];
 const d=L.completeOcc(s,o,55);assert.equal(JSON.stringify(s),snap);
 assert.equal(d.occ['b1:2026-10-08'].actualMin,55);assert.equal(d.occ['b1:2026-10-08'].snap.plannedMin,80);
 assert.equal(L.completeOcc(s,o,0).occ['b1:2026-10-08'].actualMin,0);
 assert.equal(L.completeOcc(s,o).occ['b1:2026-10-08'].actualMin,undefined);
 const u=L.uncompleteOcc(d,'b1:2026-10-08');assert.deepEqual(u.occ,{});assert.equal(L.occurrencesOn(u,'2026-10-08')[0].done,false)});
test('nowNext',()=>{
 const s=S({blocks:[B({id:'a',start:'09:00',end:'10:00'}),B({id:'b',start:'10:30',end:'11:00'})]});
 const occ=L.occurrencesOn(s,'2026-10-08');
 let r=L.nowNext(occ,570);assert.equal(r.current.blockId,'a');assert.equal(r.minsLeft,30);assert.equal(r.next.blockId,'b');
 r=L.nowNext(occ,610);assert.equal(r.current,null);assert.equal(r.minsToNext,20);
 assert.equal(L.nowNext(occ,600).current,null);
 r=L.nowNext(occ,690);assert.deepEqual(r.missed.map(o=>o.blockId),['a','b']);
 assert.equal(L.nowNext(occ,1440).missed.length,2);
 const d=L.completeOcc(s,occ[0]);const m=L.moveOccurrence(d,'b:2026-10-08',B({id:'nb',date:'2026-10-09'}));
 r=L.nowNext(L.occurrencesOn(m,'2026-10-08'),690);assert.equal(r.missed.length,0);assert.equal(r.current,null)});
test('rescheduleDraft keeps title, desc, tag, duration; date tomorrow; empty start',()=>{
 const o={title:'T',desc:'D',tag:'uni',plannedMin:80};
 assert.deepEqual(L.rescheduleDraft(o,'2026-10-08'),{title:'T',desc:'D',tag:'uni',date:'2026-10-09',start:'',durationMin:80})});
test('moveOccurrence is pure and links original',()=>{
 const s=S({blocks:[B()]});const snap=JSON.stringify(s);const nb=B({id:'n1',date:'2026-10-09'});
 const m=L.moveOccurrence(s,'b1:2026-10-08',nb);assert.equal(JSON.stringify(s),snap);
 assert.equal(m.occ['b1:2026-10-08'].movedTo,'n1');assert.equal(m.blocks.length,2)});
test('removeBlock drops its logs',()=>{
 let s=S({blocks:[B()]});s=L.completeOcc(s,L.occurrencesOn(s,'2026-10-08')[0]);
 s=L.removeBlock(s,'b1');assert.equal(s.blocks.length,0);assert.deepEqual(s.occ,{})});
test('deleteOccurrence: repeating skips one day only',()=>{
 let s=S({blocks:[wk()]});s=L.completeOcc(s,L.occurrencesOn(s,'2026-10-07')[0]);
 s=L.deleteOccurrence(s,'w','2026-10-07');
 assert.equal(L.occurrencesOn(s,'2026-10-07').length,0);assert.equal(L.occurrencesOn(s,'2026-10-08').length,1);
 assert.deepEqual(s.occ,{});
 const one=L.deleteOccurrence(S({blocks:[B()]}),'b1','2026-10-08');assert.equal(one.blocks.length,0)});
test('deleteFuture keeps past days and their logs',()=>{
 let s=S({blocks:[wk()]});
 s=L.completeOcc(s,L.occurrencesOn(s,'2026-10-06')[0]);s=L.completeOcc(s,L.occurrencesOn(s,'2026-10-12')[0]);
 s=L.deleteFuture(s,'w','2026-10-08');
 assert.equal(s.blocks[0].until,'2026-10-07');
 assert.equal(L.minutesFor(L.occurrencesOn(s,'2026-10-06')[0]),60);
 assert.equal(L.occurrencesOn(s,'2026-10-12').length,0);assert.equal(s.occ['w:2026-10-12'],undefined);
 assert.equal(L.deleteFuture(s,'w','2026-10-05').blocks.length,0)});
test('elapsedMin',()=>{
 const t=1_700_000_000_000;
 assert.equal(L.elapsedMin(t,t+90*60000),90);assert.equal(L.elapsedMin(t+5000,t),0);assert.equal(L.elapsedMin(NaN,t),0);
 assert.equal(L.elapsedMin(t,t+800*60000),720)});
test('sanitizeTimer clears stale or garbage timers',()=>{
 const ok=S({blocks:[B()],timer:{occId:'b1:2026-10-08',startedAt:1}});assert.deepEqual(L.sanitizeTimer(ok).timer,ok.timer);
 assert.equal(L.sanitizeTimer(S({timer:{occId:'gone:2026-10-08',startedAt:1}})).timer,null);
 assert.equal(L.sanitizeTimer(S({blocks:[B()],timer:{occId:'b1:2026-10-08',startedAt:NaN}})).timer,null);
 assert.equal(L.sanitizeTimer(S()).timer,null)});
test('copyDay copies blocks as one-off, not-done, skipping moved ones',()=>{
 let s=S({blocks:[B({id:'a',start:'09:00',end:'10:00'}),B({id:'b',start:'11:00',end:'12:00',repeat:{type:'daily',days:[]}})]});
 s=L.moveOccurrence(s,'a:2026-10-08',B({id:'m',date:'2026-10-09'}));
 let n=0;const c=L.copyDay(s,'2026-10-08','2026-10-20',()=>'c'+(++n));
 const added=c.blocks.slice(s.blocks.length);assert.equal(added.length,1);
 assert.deepEqual([added[0].id,added[0].date,added[0].start,added[0].end,added[0].repeat.type],['c1','2026-10-20','11:00','12:00','none']);
 assert.equal(L.occurrencesOn(c,'2026-10-20').filter(o=>o.blockId==='c1')[0].done,false)});
