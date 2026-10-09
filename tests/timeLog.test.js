import test from 'node:test';import assert from 'node:assert/strict';
import {parseDuration,logTime,canSave} from '../src/timeLog.js';
import {finishTimer} from '../src/views/today.js';
import {occurrencesOn} from '../src/logic.js';import {S,B} from './fixtures.js';
const D='2026-10-08',OCC='b1:2026-10-08';
const occ=s=>occurrencesOn(s,D)[0];
const fakeApp=state=>({state,set(f){this.state=f(this.state)}});
test('parseDuration: hours + minutes, blank = 0, minutes over 59 normalized',()=>{
 assert.equal(parseDuration('',''),0);assert.equal(parseDuration('','25'),25);assert.equal(parseDuration('1','90'),150);
 assert.equal(parseDuration(' 2 ',''),120);assert.equal(parseDuration('0','0'),0)});
test('parseDuration rejects anything but non-negative whole numbers',()=>{
 for(const [h,m] of [['-1',''],['','1.5'],['abc',''],['','1,5'],['1e2',''],['','+3']])assert.equal(parseDuration(h,m),null,`${h}|${m}`)});
test('canSave: Add needs more than 0; Replace allows 0; invalid never saves',()=>{
 assert.equal(canSave(0,'add'),false);assert.equal(canSave(25,'add'),true);
 assert.equal(canSave(0,'replace'),true);assert.equal(canSave(null,'replace'),false);assert.equal(canSave(null,'add'),false)});
test('add 25, add 90, replace with 0 (marks done, stored as actualMin)',()=>{
 let s=S({blocks:[B()]});
 s=logTime(s,occ(s),25,'add');assert.equal(occ(s).actualMin,25);assert.equal(occ(s).done,true);
 s=logTime(s,occ(s),90,'add');assert.equal(occ(s).actualMin,115);
 s=logTime(s,occ(s),0,'replace');assert.equal(occ(s).actualMin,0);assert.equal(occ(s).done,true)});
test('add on a block ticked done without logged minutes starts from 0',()=>{
 let s=S({blocks:[B()],occ:{[OCC]:{done:true}}});
 s=logTime(s,occ(s),20,'add');assert.equal(occ(s).actualMin,20)});
test('logTime is pure',()=>{
 const s=S({blocks:[B()]});const snap=JSON.stringify(s);logTime(s,occ(s),5,'add');assert.equal(JSON.stringify(s),snap)});
test('running timer: Add keeps it running and Finish adds elapsed to the total',()=>{
 const timer={occId:OCC,startedAt:Date.now()-10*60000};
 const app=fakeApp(S({blocks:[B()],timer}));
 app.set(s=>logTime(s,occ(s),25,'add'));
 assert.equal(app.state.timer,timer);assert.equal(occ(app.state).actualMin,25);
 finishTimer(app);assert.equal(app.state.timer,null);assert.equal(occ(app.state).actualMin,35)});
test('running timer: Replace sets the base and the timer continues from there',()=>{
 const timer={occId:OCC,startedAt:Date.now()-10*60000};
 let app=fakeApp(S({blocks:[B()],occ:{[OCC]:{done:true,actualMin:50}},timer}));
 app.set(s=>logTime(s,occ(s),0,'replace'));assert.equal(app.state.timer,timer);
 finishTimer(app);assert.equal(occ(app.state).actualMin,10);
 app=fakeApp(S({blocks:[B()],occ:{[OCC]:{done:true,actualMin:50}},timer}));
 app.set(s=>logTime(s,occ(s),30,'replace'));finishTimer(app);assert.equal(occ(app.state).actualMin,40)});
