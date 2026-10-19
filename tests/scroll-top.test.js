import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
test('the browser never restores a scroll position on its own',()=>{
 assert.match(app,/history\.scrollRestoration\s*=\s*'manual'/)});
test('a route change scrolls to the top again after layout, not only before it',()=>{
 assert.match(app,/requestAnimationFrame\(\(\)\s*=>\s*window\.scrollTo\(0,\s*0\)\)/)});
