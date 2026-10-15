import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const D0=css.indexOf('/* tokens:dark */');
const tokens=s=>Object.fromEntries([...s.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(m=>[m[1],m[2]]));
const dark=tokens(css.slice(D0,css.indexOf('}',D0)));
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*r+0.7152*g+0.0722*b};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05)};
const r=(fg,bg)=>{assert.ok(dark[fg]&&dark[bg],`missing ${fg} or ${bg}`);return ratio(rgb(dark[fg]),rgb(dark[bg]))};

// DESIGN-SPEC §4, measured on #141317 (--plate-bot), rounded to one decimal.
test('v2 background is #141317',()=>{assert.equal(dark['--plate-bot']?.toUpperCase(),'#141317')});
for(const [fg,want] of [['--text',16.0],['--text-2',8.9],['--text-3',6.9],['--accent',10.8],['--eyebrow',8.4],['--crimson-lt',7.8],['--crimson',5.2]])
 test(`contrast ${fg} on #141317 = ${want}`,()=>{assert.equal(Math.round(r(fg,'--plate-bot')*10)/10,want)});
// Gold button: ink on every stop of the gradient; the dark end (#B08539) is the minimum (spec: 5.5).
test('button ink on the gold gradient >= 5.5',()=>{for(const stop of ['--gold-hi','--accent','--gold-mid','--gold-lo']){const x=r('--gold-ink',stop);assert.ok(x>=5.5,`--gold-ink on ${stop}: ${x.toFixed(3)}`)}});
test('shield outline >= 3 (graphic)',()=>{const x=r('--outline','--plate-bot');assert.ok(x>=3,`--outline: ${x.toFixed(3)}`)});
// Dark only (owner decision 2026-10-09): one token set, no appearance branches, native controls dark.
test('dark only',()=>{assert.ok(D0>=0,'missing tokens:dark marker');assert.ok(!css.includes('prefers-color-scheme'),'appearance branch found');assert.match(css,/color-scheme:\s*dark\s*;/)});
