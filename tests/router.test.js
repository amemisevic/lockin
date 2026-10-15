import test from 'node:test';import assert from 'node:assert/strict';
import {parseRoute} from '../src/router.js';

// Expected values are written by hand (owner call 1/2). Anything not in the table falls back to Today.
const TODAY={name:'today',params:[],tab:'today',pushed:false};
const cases=[
 // the five tabs
 ['#today',TODAY],
 ['#tasks',{name:'tasks',params:[],tab:'tasks',pushed:false}],
 ['#challenge',{name:'challenge',params:[],tab:'challenge',pushed:false}],
 ['#analytics',{name:'analytics',params:[],tab:'analytics',pushed:false}],
 ['#settings',{name:'settings',params:[],tab:'settings',pushed:false}],
 // pushed screens
 ['#checkin/morning',{name:'checkin',params:['morning'],tab:'today',pushed:true}],
 ['#checkin/afternoon',{name:'checkin',params:['afternoon'],tab:'today',pushed:true}],
 ['#checkin/night/2026-10-13',{name:'checkin',params:['night','2026-10-13'],tab:'today',pushed:true}],
 ['#recovery/2026-10-12',{name:'recovery',params:['2026-10-12'],tab:'challenge',pushed:true}],
 ['#mission/9',{name:'mission',params:['9'],tab:'challenge',pushed:true}],
 ['#warlog',{name:'warlog',params:[],tab:'challenge',pushed:true}],
 ['#warlog/contract',{name:'warlog',params:['contract'],tab:'challenge',pushed:true}],
 // edges
 ['#nope',TODAY],
 ['',TODAY],
 ['#',TODAY],
 ['#tasks/',{name:'tasks',params:[],tab:'tasks',pushed:false}],
 ['#today/x',TODAY],
 ['#mission/abc',TODAY],
 ['#mission/9/',{name:'mission',params:['9'],tab:'challenge',pushed:true}],
 // The date regex is ^\d{4}-\d{2}-\d{2}$ only (no calendar check), so month 13 / day 45 IS accepted.
 ['#checkin/night/2026-13-45',{name:'checkin',params:['night','2026-13-45'],tab:'today',pushed:true}],
 ['#Today',TODAY],
 ['#Tasks',TODAY],
 ['#mission',TODAY],
 ['#mission/09',{name:'mission',params:['09'],tab:'challenge',pushed:true}],
 ['#checkin',TODAY],
 ['#checkin/foo',TODAY],
 ['#checkin/night',TODAY],
 ['#checkin/morning/x',TODAY],
 ['#checkin/night/2026-1-5',TODAY],
 ['#recovery',TODAY],
 ['#recovery/someday',TODAY],
 ['#warlog//',TODAY],
 ['#tasks//',TODAY],
 ['#warlog/a%20b',{name:'warlog',params:['a%20b'],tab:'challenge',pushed:true}],
];
for(const [hash,want] of cases)test(`parseRoute(${JSON.stringify(hash)})`,()=>assert.deepEqual(parseRoute(hash),want));

test('parseRoute returns a fresh params array each call',()=>{
 const a=parseRoute('#today');a.params.push('x');
 assert.deepEqual(parseRoute('#today'),TODAY)});
