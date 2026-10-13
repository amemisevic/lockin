import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Plan Task 12: contrast of the Today tab colours in screens.css (text >= 4.5, graphics >= 3; CLAUDE.md).
// New colours: .rim #201d1a (text sits on it), .td-med #2a2316 (text). Not asserted (edges, decorative like the .plate
// hairline): .rim border #6e4f1f, .td-tile border #5d4521, .td-med border #7a5a24 (existing colour).
// Helpers copied from tests/contrast-tasks.test.js.
const tokensCss=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const css=readFileSync(new URL('../screens.css',import.meta.url),'utf8');
const D0=tokensCss.indexOf('/* tokens:dark */');
const dark=Object.fromEntries([...tokensCss.slice(D0,tokensCss.indexOf('}',D0)).matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(m=>[m[1],m[2]]));
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*r+0.7152*g+0.0722*b};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05)};
const decl=(src,sel,prop)=>{
 const m=src.match(new RegExp(`(?:^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\{([^}]*)\\}`));
 assert.ok(m,`rule ${sel} not found`);
 const v=m[1].match(new RegExp(`(?:^|;)${prop}:([^;]+)`))?.[1].trim();
 assert.ok(v,`${sel} has no ${prop}`);return v;
};
const colour=v=>{const t=v.match(/^var\((--[\w-]+)\)$/)?.[1];const hex=t?dark[t]:v;assert.match(hex??'',/^#[0-9a-fA-F]{6}$/,`unresolved colour ${v}`);return hex};
const over=(fg,bg,a)=>fg.map((c,i)=>Math.round(a*c+(1-a)*bg[i]));
const check=(t,name,fg,bg,min,a=1)=>{const x=ratio(over(rgb(fg),rgb(bg),a),rgb(bg));t.diagnostic(`${name}: ${fg}${a<1?` @${a}`:''} on ${bg} = ${x.toFixed(3)}`);assert.ok(x>=min,`${name}: ${x.toFixed(3)} < ${min}`)};
const stops=v=>v.match(/#[0-9a-fA-F]{6}|var\(--[\w-]+\)/g).map(colour);

test('action card (.rim): text, line and ghost button text on both stops >= 4.5',t=>{
 const bgs=stops(decl(css,'.rim','background'));
 assert.deepEqual(bgs.map(s=>s.toLowerCase()),['#201d1a',dark['--plate-bot'].toLowerCase()]);
 for(const bg of bgs){
  check(t,'card title',dark['--text'],bg,4.5);
  check(t,'card line .t2',colour(decl(css,'.t2','color')),bg,4.5);
  check(t,'.btn-ghost',colour(decl(css,'.btn-ghost','color')),bg,4.5);
 }
});
test('day medallion: number and "of n" on both stops >= 4.5',t=>{
 const bgs=stops(decl(css,'.td-med','background').replace(/^radial-gradient\(circle at 50% 30%,/,''));
 assert.deepEqual(bgs.map(s=>s.toLowerCase()),['#2a2316',dark['--plate-bot'].toLowerCase()]);
 for(const bg of bgs){
  check(t,'.td-med b',colour(decl(css,'.td-med b','color')),bg,4.5);
  check(t,'.td-med span',colour(decl(css,'.td-med span','color')),bg,4.5);
 }
});
test('challenge plate: icon on its tile, torches and chevron >= 3 (graphics)',t=>{
 const top=dark['--plate-top'];
 const tile=over(rgb(dark['--accent']),rgb(top),.10).map(v=>v.toString(16).padStart(2,'0')).join('');
 check(t,'.td-tile icon',colour(decl(css,'.td-tile','color')),`#${tile}`,3);
 for(const bg of [top,dark['--plate-bot']]){
  check(t,'lit torch flame',colour(decl(css,'.td-torch path:first-child','fill')),bg,3);
  check(t,'lit torch stand',colour(decl(css,'.td-torch path:last-child','stroke')),bg,3);
  check(t,'unlit torch',colour(decl(css,'.td-torch.off path:last-child','stroke')),bg,3);
  check(t,'.td-chev',colour(decl(css,'.td-chev','color')),bg,3);
 }
});
test('recovery card: crimson title and time line on the .warn stops >= 4.5',t=>{
 const bgs=stops(decl(tokensCss,'.warn','background'));
 assert.deepEqual(bgs.map(s=>s.toLowerCase()),['#26161a',dark['--plate-bot'].toLowerCase()]);
 for(const bg of bgs){
  check(t,'.td-link.warn .td-ct',colour(decl(css,'.td-link.warn .td-ct','color')),bg,4.5);
  check(t,'time line .t2',colour(decl(css,'.t2','color')),bg,4.5);
  check(t,'.td-chev on .warn',colour(decl(css,'.td-chev','color')),bg,3);
 }
});
