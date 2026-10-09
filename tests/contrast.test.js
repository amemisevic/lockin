import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const D0=css.indexOf('/* tokens:dark */');
const tokens=s=>Object.fromEntries([...s.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(m=>[m[1],m[2]]));
const dark=tokens(css.slice(D0,css.indexOf('}',D0)));
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*r+0.7152*g+0.0722*b};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05)};
// color-mix(in srgb, g 14%, surface): per-channel mix of the encoded sRGB values.
const tint=(g,s)=>g.map((v,i)=>0.14*v+0.86*s[i]);
const GOALS=['--g-biz','--g-uni','--g-body','--g-social','--g-unsorted'];
const check=(t,fg,bg,min)=>{assert.ok(t[fg]&&t[bg],`missing ${fg} or ${bg}`);const r=ratio(rgb(t[fg]),rgb(t[bg]));assert.ok(r>=min,`${fg} on ${bg}: ${r.toFixed(2)} < ${min}`)};
for(const [name,t] of [['dark',dark]]){
 test(`contrast ${name}`,()=>{
  for(const fg of ['--text','--text-2','--text-3','--accent','--red'])for(const bg of ['--bg','--surface'])check(t,fg,bg,4.5);
  check(t,'--on-accent','--accent',4.5);check(t,'--outline','--surface',3);
  for(const g of GOALS){
   check(t,g,'--surface',3);
   const tn=tint(rgb(t[g]),rgb(t['--surface']));
   const r1=ratio(rgb(t[g]),tn);assert.ok(r1>=3,`${g} on its tint: ${r1.toFixed(2)}`);
   const r2=ratio(rgb(t['--text-2']),tn);assert.ok(r2>=4.5,`--text-2 on ${g} tint: ${r2.toFixed(2)}`)}})}
test('contrast dark elevated surface',()=>{for(const fg of ['--text-2','--text-3','--accent','--red'])check(dark,fg,'--surface-2',4.5)});
// Dark only (owner decision 2026-10-09): one token set, no appearance branches, native controls dark.
test('dark only',()=>{assert.ok(D0>=0,'missing tokens:dark marker');assert.ok(!css.includes('prefers-color-scheme'),'appearance branch found');assert.match(css,/color-scheme:\s*dark\s*;/)});
