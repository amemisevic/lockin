import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Graphic contrast >= 3 (CLAUDE.md) for the shield and habit-dot outlines in styles.css, on both plate stops.
// Helpers copied from tests/contrast.test.js.
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const D0=css.indexOf('/* tokens:dark */');
const dark=Object.fromEntries([...css.slice(D0,css.indexOf('}',D0)).matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(m=>[m[1],m[2]]));
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*r+0.7152*g+0.0722*b};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05)};
// Declaration `prop` of the rule whose selector is exactly `sel` (compact board format: `sel{...}` on one line).
const decl=(sel,prop)=>{
 const m=css.match(new RegExp(`(?:^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\{([^}]*)\\}`));
 assert.ok(m,`rule ${sel} not found`);
 const v=m[1].match(new RegExp(`(?:^|;)${prop}:([^;]+)`))?.[1].trim();
 assert.ok(v,`${sel} has no ${prop}`);return v;
};
const colour=v=>{const t=v.match(/^var\((--[\w-]+)\)$/)?.[1];const hex=t?dark[t]:v;assert.match(hex??'',/^#[0-9a-fA-F]{6}$/,`unresolved colour ${v}`);return rgb(hex)};
// Opacity over the surface: the browser composites the stroke onto it.
const over=(fg,bg,a)=>fg.map((c,i)=>Math.round(a*c+(1-a)*bg[i]));
const surfaces=['--plate-top','--plate-bot'];
const check=(t,name,fg,a=1)=>{for(const s of surfaces){const bg=rgb(dark[s]);const x=ratio(over(fg,bg,a),bg);t.diagnostic(`${name} on ${s} ${dark[s]}: ${x.toFixed(3)}`);assert.ok(x>=3,`${name} on ${s}: ${x.toFixed(3)} < 3`)}};

test('outline token >= 3 on both plate stops',t=>check(t,'--outline',colour('var(--outline)')));
test('open shield outline >= 3',t=>check(t,'.shield svg .b',colour(decl('.shield svg .b','stroke'))));
test('done shield outline >= 3',t=>check(t,'.shield.on svg .b',colour(decl('.shield.on svg .b','stroke'))));
test('failed shield outline >= 3',t=>check(t,'.shield.failed svg .b',colour(decl('.shield.failed svg .b','stroke'))));
test('stalled shield outline (with its opacity) >= 3',t=>
 check(t,'.shield.stalled',colour(decl('.shield svg .b','stroke')),Number(decl('.shield.stalled','opacity'))));
test('open habit dot outline >= 3',t=>check(t,'.mini svg .b',colour(decl('.mini svg .b','stroke'))));
test('done habit dot outline >= 3',t=>check(t,'.mini.on svg .b',colour(decl('.mini.on svg .b','stroke'))));
