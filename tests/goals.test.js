import test from 'node:test';import assert from 'node:assert/strict';
import * as L from '../src/logic.js';import {S,goals,logged} from './fixtures.js';
const THU='2026-10-08',SAT='2026-10-10';
const G=id=>goals().find(g=>g.id===id);
test('goalMinutes counts only its tag; unsorted never feeds a goal',()=>{
 let s=logged(S(),THU,'biz',45);s=logged(s,THU,'unsorted',60);
 assert.equal(L.goalMinutes(s,THU,'biz'),45);assert.equal(L.unsortedMinutes(s,THU),60);assert.equal(L.goalMinutes(s,THU,'uni'),0)});
test('goalMet Business weekday and weekend thresholds',()=>{
 assert.equal(L.goalMet(logged(S(),THU,'biz',59),THU,G('biz')),false);
 assert.equal(L.goalMet(logged(S(),THU,'biz',60),THU,G('biz')),true);
 assert.equal(L.goalMet(logged(S(),SAT,'biz',239),SAT,G('biz')),false);
 assert.equal(L.goalMet(logged(S(),SAT,'biz',240),SAT,G('biz')),true);
 assert.equal(L.goalMet(S({manualMet:{[THU]:{biz:true}}}),THU,G('biz')),true)});
test('goalMet actual minutes override planned',()=>{
 assert.equal(L.goalMet(logged(S(),THU,'biz',90,30),THU,G('biz')),false);
 assert.equal(L.goalMet(logged(S(),THU,'biz',30,75),THU,G('biz')),true)});
test('goalMet Body needs the Calories check; Socializing has no daily rule',()=>{
 assert.equal(L.goalMet(S({checks:{[THU]:{cal:true}}}),THU,G('body')),true);
 assert.equal(L.goalMet(S({checks:{[THU]:{cal:false}}}),THU,G('body')),false);
 assert.equal(L.goalMet(S(),THU,G('social')),null)});
test('dayWon = Business + Uni minimums + Calories; weekly goals and red lines never decide it',()=>{
 const base=()=>S({checks:{[THU]:{cal:true}},counts:{[THU]:{body:0}},redLines:[{id:'r1',name:'x'}],red:{[THU]:{r1:'slipped'}}});
 let s=logged(logged(base(),THU,'biz',60),THU,'uni',120);assert.equal(L.dayWon(s,THU),true);
 assert.equal(L.dayWon(logged(logged(base(),THU,'biz',59),THU,'uni',120),THU),false);
 assert.equal(L.dayWon(logged(logged(base(),THU,'biz',60),THU,'uni',119),THU),false);
 const noCal=logged(logged(S(),THU,'biz',60),THU,'uni',120);assert.equal(L.dayWon(noCal,THU),false);
 const uns=logged(logged(base(),THU,'unsorted',60),THU,'uni',120);assert.equal(L.dayWon(uns,THU),false);
 const wkend=logged(logged(S({checks:{[SAT]:{cal:true}}}),SAT,'biz',240),SAT,'uni',240);assert.equal(L.dayWon(wkend,SAT),true)});
test('dayStatus won / partial / empty',()=>{
 assert.equal(L.dayStatus(S(),THU),'empty');
 assert.equal(L.dayStatus(logged(S(),THU,'biz',30),THU),'partial');
 assert.equal(L.dayStatus(logged(S(),THU,'unsorted',90),THU),'empty');
 assert.equal(L.dayStatus(S({redLines:[{id:'r',name:'x'}],red:{[THU]:{r:'slipped'}}}),THU),'empty');
 assert.equal(L.dayStatus(S({checks:{[THU]:{cal:true}}}),THU),'partial');
 assert.equal(L.dayStatus(S({counts:{[THU]:{body:1}}}),THU),'partial');
 assert.equal(L.dayStatus(S({manualMet:{[THU]:{biz:true}}}),THU),'partial');
 const won=logged(logged(S({checks:{[THU]:{cal:true}}}),THU,'biz',60),THU,'uni',120);assert.equal(L.dayStatus(won,THU),'won')});
test('weekSummary targets and Monday-Sunday window',()=>{
 let s=S({counts:{'2026-10-04':{body:1},'2026-10-05':{body:1},'2026-10-11':{body:1},'2026-10-12':{body:1}}});
 s=logged(s,'2026-10-04','biz',100);s=logged(s,'2026-10-05','biz',60);s=logged(s,'2026-10-11','biz',240);s=logged(s,'2026-10-12','biz',70);
 const w=L.weekSummary(s,THU);
 assert.deepEqual(w.biz,{done:300,target:780,unit:'min'});assert.equal(w.uni.target,1080);
 assert.deepEqual(w.body,{done:2,target:4,unit:'count'});assert.deepEqual(w.social,{done:0,target:3,unit:'count'})});
test('windowTotals is inclusive of both ends (7 days ending 2026-10-08 starts 2026-10-02)',()=>{
 let s=S({counts:{'2026-10-01':{body:1},'2026-10-02':{body:1}}});
 s=logged(s,'2026-10-01','biz',500);s=logged(s,'2026-10-02','biz',30);s=logged(s,THU,'biz',60);
 const t=L.windowTotals(s,THU,7);
 assert.equal(t.minutes.biz,90);assert.equal(t.counts.body,1);assert.equal(t.partial,2);assert.equal(t.won,0)});
test('windowTotals counts won days',()=>{
 let s=S({checks:{[THU]:{cal:true}}});s=logged(logged(s,THU,'biz',60),THU,'uni',120);
 const t=L.windowTotals(s,THU,30);assert.equal(t.won,1);assert.equal(t.partial,0)});
test('redLineSummary counts only existing lines, only inside the window',()=>{
 const s=S({redLines:[{id:'a',name:'A'}],red:{[THU]:{a:'held',gone:'slipped'},'2026-10-07':{a:'slipped'},'2026-08-01':{a:'held'}}});
 assert.deepEqual(L.redLineSummary(s,THU,30),{held:1,slipped:1})});
test('lifetime sums from the earliest entry to today',()=>{
 let s=S({counts:{'2026-10-01':{body:1},[THU]:{body:1,social:2}}});s=logged(s,'2026-10-02','biz',60);s=logged(s,THU,'unsorted',20);
 const l=L.lifetime(s,THU);assert.equal(l.minutes.biz,60);assert.equal(l.counts.body,2);assert.equal(l.counts.social,2);assert.equal(l.unsorted,20);
 assert.equal(L.lifetime(S(),THU).minutes.biz,0)});
test('needsCommitConfirm',()=>{
 const g={committedUntil:'2026-11-07'};assert.equal(L.needsCommitConfirm(g,'2026-10-20'),true);
 assert.equal(L.needsCommitConfirm(g,'2026-11-07'),false);assert.equal(L.needsCommitConfirm(g,'2026-11-08'),false)});
