import test from 'node:test';import assert from 'node:assert/strict';
import {logAmount,clearAmount,redLineStats,parseAmount} from '../src/redlines.js';
import {redLineSummary} from '../src/logic.js';import {S} from './fixtures.js';
const line={id:'r',name:'Screen time',limit:30,unit:'min'};
const log=(s,entries,l=line)=>entries.reduce((t,[d,a])=>logAmount(t,d,l,a),s);
const END='2026-10-08';
test('hand-checked: limit 30 min, amounts 10, 45, 30',()=>{
 const st=redLineStats(log(S({redLines:[line]}),[['2026-10-06',10],['2026-10-07',45],['2026-10-08',30]]),'r',END);
 assert.deepEqual([st.logged,st.held,st.slipped,st.unlogged],[3,2,1,27]);
 assert.deepEqual([st.totalOver,st.avgOver,st.avgMargin,st.used,st.allowed],[15,15,10,85,90]);
 assert.deepEqual(st.worst,{date:'2026-10-07',amount:45,over:15});
 assert.equal(st.last7Avg,85/3);assert.equal(st.prev7Avg,null)});
test('hand-checked: limit 0, amounts 0, 20, 0 (exactly at the limit is held)',()=>{
 const zero={...line,limit:0,unit:'drinks'};
 const st=redLineStats(log(S({redLines:[zero]}),[['2026-10-06',0],['2026-10-07',20],['2026-10-08',0]],zero),'r',END);
 assert.deepEqual([st.held,st.slipped,st.totalOver,st.worst.over],[2,1,20,20])});
test('empty window',()=>{
 const st=redLineStats(S({redLines:[line]}),'r',END);
 assert.deepEqual([st.logged,st.held,st.slipped,st.unlogged,st.totalOver,st.used,st.allowed],[0,0,0,30,0,0,0]);
 assert.deepEqual([st.avgOver,st.avgMargin,st.worst,st.last7Avg,st.prev7Avg],[null,null,null,null,null])});
test('a deleted line keeps its history and saved name; summaries skip it',()=>{
 let s=log(S({redLines:[line]}),[['2026-10-07',45]]);s={...s,redLines:[]};
 const st=redLineStats(s,'r',END);assert.equal(st.name,'Screen time');assert.equal(st.slipped,1);
 assert.deepEqual(redLineSummary(s,END,30),{held:0,slipped:0})});
test('parseAmount accepts comma or point, rejects the rest',()=>{
 assert.equal(parseAmount('1,5'),1.5);assert.equal(parseAmount('1.5'),1.5);assert.equal(parseAmount(' 2 '),2);assert.equal(parseAmount('0'),0);
 for(const bad of['','-1','abc','1,2,3','1e3',Infinity,-2,NaN,undefined])assert.equal(parseAmount(bad),null,String(bad));
 assert.equal(logAmount(S({redLines:[line]}),END,line,parseAmount('1,5')).red[END].r.amount,1.5)});
test('each entry is judged by its own frozen limit',()=>{
 let s=log(S({redLines:[line]}),[['2026-10-07',40]]);const wider={...line,limit:60};
 s=log({...s,redLines:[wider]},[['2026-10-08',40]],wider);
 const st=redLineStats(s,'r',END);assert.deepEqual([st.held,st.slipped,st.allowed],[1,1,90]);
 assert.deepEqual(redLineSummary(s,END,30),{held:1,slipped:1});
 assert.deepEqual(s.red['2026-10-07'].r,{amount:40,limit:30,unit:'min',name:'Screen time'})});
test('last 7 vs the 7 before: average per logged day',()=>{
 const st=redLineStats(log(S({redLines:[line]}),[['2026-09-25',20],['2026-10-01',40],['2026-10-02',10],['2026-10-08',20]]),'r',END);
 assert.equal(st.last7Avg,15);assert.equal(st.prev7Avg,30)});
test('logAmount is pure',()=>{
 const s=S({redLines:[line]});const snap=JSON.stringify(s);logAmount(s,END,line,5);assert.equal(JSON.stringify(s),snap)});
test('log then clear equals never logged (a past day; not-logged is not held)',()=>{
 const base=log(S({redLines:[line]}),[['2026-10-06',10]]);
 const cleared=clearAmount(log(base,[['2026-10-02',0]]),'2026-10-02','r');
 assert.deepEqual(cleared,base);assert.equal('2026-10-02' in cleared.red,false);
 assert.deepEqual(redLineStats(cleared,'r',END),redLineStats(base,'r',END));
 assert.deepEqual(redLineSummary(cleared,END,30),redLineSummary(base,END,30));
 assert.deepEqual(redLineSummary(cleared,END,30),{held:1,slipped:0})});
test('clearing works after the limit changed and keeps other entries on that day',()=>{
 const other={id:'o',name:'Sugar',limit:2,unit:'g'};
 let s=log(log(S({redLines:[line,other]}),[['2026-10-07',45]]),[['2026-10-07',1]],other);
 s={...s,redLines:[{...line,limit:60},other]};
 const c=clearAmount(s,'2026-10-07','r');
 assert.deepEqual(c.red['2026-10-07'],{o:{amount:1,limit:2,unit:'g',name:'Sugar'}});
 const st=redLineStats(c,'r',END);assert.deepEqual([st.logged,st.held,st.slipped,st.unlogged],[0,0,0,30]);
 assert.deepEqual(redLineSummary(c,END,30),{held:1,slipped:0})});
test('clearAmount is pure and a no-op when nothing is logged',()=>{
 const s=log(S({redLines:[line]}),[[END,5]]);const snap=JSON.stringify(s);clearAmount(s,END,'r');assert.equal(JSON.stringify(s),snap);
 const e=S({redLines:[line]});assert.deepEqual(clearAmount(e,END,'r'),e)});
