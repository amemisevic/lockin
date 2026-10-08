import test from 'node:test';import assert from 'node:assert/strict';
import {formatClock} from '../src/logic.js';
test('formatClock m:ss under an hour',()=>{
 assert.equal(formatClock(0),'0:00');assert.equal(formatClock(59000),'0:59');assert.equal(formatClock(61000),'1:01');
 assert.equal(formatClock(59*60000+59999),'59:59')});
test('formatClock h:mm:ss from an hour',()=>{assert.equal(formatClock(3600000),'1:00:00');assert.equal(formatClock(3600000+61000),'1:01:01')});
test('formatClock: negative or non-finite is 0:00',()=>{for(const v of[-1,-60000,NaN,Infinity,-Infinity,undefined])assert.equal(formatClock(v),'0:00',String(v))});
test('formatClock caps at 12:00:00 like elapsedMin',()=>{assert.equal(formatClock(720*60000),'12:00:00');assert.equal(formatClock(800*60000),'12:00:00')});
