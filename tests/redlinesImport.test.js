import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateImport} from '../src/store.js';
const v107=readFileSync(new URL('./export-1.0.7.json',import.meta.url),'utf8');
const with_=(f)=>{const o=JSON.parse(v107);f(o);return JSON.stringify(o)};
test('a 1.0.7 export (no amount, limit or unit) still imports unchanged',()=>{
 const r=validateImport(v107);assert.equal(r.ok,true,r.error);assert.deepEqual(r.state.red,JSON.parse(v107).red);assert.deepEqual(r.state.redLines,JSON.parse(v107).redLines)});
test('measured lines and entries import',()=>{
 const t=with_(o=>{o.redLines[0]={...o.redLines[0],limit:30,unit:'min'};o.red['2026-10-08']={r1:{amount:0,limit:30,unit:'min',name:'Example line'}}});
 assert.equal(validateImport(t).ok,true,validateImport(t).error)});
test('bad red-line numbers and shapes are rejected',()=>{
 const bad=[
  o=>{o.redLines[0].limit=-5;o.redLines[0].unit='min'},
  o=>{o.redLines[0].limit=30},
  o=>{o.redLines[0].unit='min'},
  o=>{o.redLines[0].limit=30;o.redLines[0].unit='a very long unit'},
  o=>{o.red['2026-10-08']={r1:{amount:-1,limit:30,unit:'min',name:'x'}}},
  o=>{o.red['2026-10-08']={r1:{amount:'5',limit:30,unit:'min',name:'x'}}},
  o=>{o.red['2026-10-08']={r1:{amount:5,limit:null,unit:'min',name:'x'}}},
  o=>{o.red['2026-10-08']={r1:'maybe'}},
  o=>{o.red['2026-10-08']=[]}];
 for(const f of bad){const r=validateImport(with_(f));assert.equal(r.ok,false,f.toString());assert.ok(r.error.length>0)}
 const inf=v107.replace('"targetWeightKg": 70','"targetWeightKg": 70').replace('"r1": "slipped"','"r1": {"amount": 1e999, "limit": 30, "unit": "min", "name": "x"}');
 assert.equal(validateImport(inf).ok,false,'Infinity amount')});
