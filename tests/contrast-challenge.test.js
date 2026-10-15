import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Plan Task 13 (rulings R2, R4, R6-R8, R11, R13, R14): contrast of the new Challenge / Day 0 colours, read by selector from
// the new block at the end of screens.css (text >= 4.5, graphics >= 3; CLAUDE.md). Backgrounds: hero, Day 0 hero and
// graduation sit on .rim (#201d1a -> --plate-bot); oath list and Declared Redo on .plate (--plate-top -> --plate-bot).
// Board colours that fail and are replaced (nearest same hue that passes, deviation): Day 0 numeral #6b5a3a -> #9a8253,
// Day 0 outline laurel #6b4d1e -> #876126. Not asserted (edges, like the .plate hairline): .dy border, .dy.t glow, pill border.
// Helpers copied from tests/contrast-today.test.js.
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
const lc=a=>a.map(s=>s.toLowerCase());
const rim=()=>{const b=stops(decl(css,'.rim','background'));assert.deepEqual(lc(b),['#201d1a',dark['--plate-bot'].toLowerCase()]);return b};
const plate=()=>{const b=stops(decl(tokensCss,'.plate','background'));assert.deepEqual(lc(b),lc([dark['--plate-top'],dark['--plate-bot']]));return b};

test('strip: upcoming number, passed glyph on the gold stops, today number (board .dy / .dy.p / .dy.t)',t=>{
 const dy=colour(decl(css,'.dy','background'));
 assert.equal(dy.toLowerCase(),'#17161a');
 check(t,'.dy number',colour(decl(css,'.dy','color')),dy,4.5);
 const p=stops(decl(css,'.dy.p','background'));
 assert.deepEqual(lc(p),['#fce29a','#e3a949','#c99139']);
 for(const bg of p)check(t,'.dy.p glyph',colour(decl(css,'.dy.p','color')),bg,3);
 const td=colour(decl(css,'.dy.t','background'));
 assert.equal(td.toLowerCase(),'#241d10');
 check(t,'.dy.t number',colour(decl(css,'.dy.t','color')),td,4.5);
});
test('strip: redo cell (transparent, 1.5px ring) and reset cell (crimson fill), graphics >= 3',t=>{
 assert.equal(decl(css,'.dy.r','background'),'transparent');
 const border=decl(css,'.dy.r','border');
 assert.match(border,/^1\.5px solid /);
 const ring=stops(border)[0];
 const fill=colour(decl(css,'.dy.x','background'));
 for(const bg of rim()){
  check(t,'.dy.r ring',ring,bg,3);
  check(t,'.dy.r glyph',colour(decl(css,'.dy.r','color')),bg,3);
  check(t,'.dy.x fill',fill,bg,3);
 }
 check(t,'.dy.x glyph',colour(decl(css,'.dy.x','color')),fill,3);
});
test('.rim text: legend, DAY label, gold numeral stops, graduation title and stats >= 4.5',t=>{
 const gold=stops(decl(css,'.goldtxt','background'));
 for(const bg of rim()){
  check(t,'.lg',colour(decl(css,'.lg','color')),bg,4.5);
  check(t,'.ch-day',colour(decl(css,'.ch-day','color')),bg,4.5);
  for(const g of gold)check(t,'.goldtxt stop',g,bg,4.5);
  check(t,'.ch-gt',colour(decl(css,'.ch-gt','color')),bg,4.5);
  check(t,'.ch-gs',colour(decl(css,'.ch-gs','color')),bg,4.5);
  check(t,'.ch-gs b',colour(decl(css,'.ch-gs b','color')),bg,4.5);
 }
});
test('Day 0 hero: numeral #9a8253 >= 4.5 and outline laurel #876126 >= 3 on both .rim stops',t=>{
 const num=colour(decl(css,'.ch-d0n','color'));
 assert.equal(num.toLowerCase(),'#9a8253');
 assert.equal(decl(css,'.ch-d0l *','fill'),'none');
 const line=colour(decl(css,'.ch-d0l *','stroke'));
 assert.equal(line.toLowerCase(),'#876126');
 for(const bg of rim()){
  check(t,'.ch-d0n',num,bg,4.5);
  check(t,'.ch-d0l stroke',line,bg,3);
 }
});
test('.plate: oath shields (outline / gold + lambda), row subtitle, Declare and "Used on Day n"',t=>{
 const done=colour(decl(css,'.ch-sh.on .b','fill'));
 for(const bg of plate()){
  check(t,'.ch-sh empty outline',colour(decl(css,'.ch-sh .b','stroke')),bg,3);
  check(t,'.ch-sh.on fill',done,bg,3);
  check(t,'.st span',colour(decl(css,'.st span','color')),bg,4.5);
  check(t,'.ch-rd-btn',colour(decl(css,'.ch-rd-btn','color')),bg,4.5);
  check(t,'.ch-rd-used',colour(decl(css,'.ch-rd-used','color')),bg,4.5);
 }
 check(t,'.ch-sh.on lambda',colour(decl(css,'.ch-sh.on .lam','stroke')),done,3);
});
test('streak pill: text on accent @.08 over the page >= 4.5',t=>{
 assert.equal(decl(css,'.ch-pill','background'),'rgba(242,190,92,.08)');
 const bg='#'+over(rgb(dark['--accent']),rgb(dark['--bg']),.08).map(v=>v.toString(16).padStart(2,'0')).join('');
 check(t,'.ch-pill',colour(decl(css,'.ch-pill','color')),bg,4.5);
});
