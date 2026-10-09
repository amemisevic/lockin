import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {VERSION} from '../src/version.js';
import {join,relative,sep} from 'node:path';import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),rootDir=fileURLToPath(root);
const sw=readFileSync(new URL('sw.js',root),'utf8');
const assets=[...(sw.match(/const ASSETS = \[([\s\S]*?)\];/)?.[1]??'').matchAll(/'([^']+)'/g)].map(m=>m[1]);
const files=dir=>readdirSync(new URL(dir,root),{recursive:true,withFileTypes:true}).filter(e=>e.isFile())
 .map(e=>relative(rootDir,join(e.parentPath??e.path,e.name)).split(sep).join('/'));
const shipped=['./','index.html','styles.css','screens.css','manifest.webmanifest',...files('src/'),...files('icons/')];
test('ASSETS lists every shipped file and nothing else',()=>{
 assert.ok(assets.length,'no ASSETS array');
 assert.deepEqual([...assets].sort(),[...shipped].sort());
 assert.equal(new Set(assets).size,assets.length,'duplicate path')});
test('every ASSETS path exists on disk',()=>{
 for(const p of assets)assert.ok(p==='./'||existsSync(new URL(p,root)),p)});
test('ASSETS paths are relative',()=>{for(const p of assets)assert.ok(!p.startsWith('/'),p)});
test('sw.js VERSION equals src/version.js',()=>{assert.equal(sw.match(/const VERSION = '([^']+)'/)?.[1],VERSION)});
