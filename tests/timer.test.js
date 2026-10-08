import test from 'node:test';import assert from 'node:assert/strict';
import {startTimer,finishTimer,cancelTimer} from '../src/views/today.js';
import {occurrencesOn} from '../src/logic.js';import {S,B} from './fixtures.js';
const fakeApp=state=>({state,set(f){this.state=f(this.state)}});
const OCC='b1:2026-10-08';
test('startTimer stores one running timer at a time',()=>{
 const app=fakeApp(S({blocks:[B(),B({id:'b2'})]}));const before=Date.now();
 startTimer(app,OCC);assert.equal(app.state.timer.occId,OCC);assert.ok(app.state.timer.startedAt>=before);
 startTimer(app,'b2:2026-10-08');assert.equal(app.state.timer.occId,'b2:2026-10-08')});
test('finishTimer logs elapsed minutes, marks done and clears the timer',()=>{
 const app=fakeApp(S({blocks:[B()],timer:{occId:OCC,startedAt:Date.now()-37*60000}}));
 finishTimer(app);
 const o=occurrencesOn(app.state,'2026-10-08')[0];
 assert.equal(app.state.timer,null);assert.equal(o.done,true);assert.equal(o.actualMin,37)});
test('cancelTimer clears without logging',()=>{
 const app=fakeApp(S({blocks:[B()],timer:{occId:OCC,startedAt:Date.now()-5*60000}}));
 cancelTimer(app);assert.equal(app.state.timer,null);assert.deepEqual(app.state.occ,{})});
test('finishTimer without a timer changes nothing',()=>{
 const s=S({blocks:[B()]});const app=fakeApp(s);finishTimer(app);assert.equal(app.state,s)});
