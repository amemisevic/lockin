import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Task 18 (rulings R5): contrast of the Analytics chart and text colours in src/analytics.css, on both .plate stops
// (--plate-top, --plate-bot): graphics >= 3, text >= 4.5 (CLAUDE.md). Rules use the compact one-line format `sel{...}`.
// Chart classes (the view must put them on the SVG marks, see tests/analytics-view.test.js), colour token per R5:
//   .an-held{fill:var(--accent)}   held segment          .an-med{fill:var(--bronze-lt)}  MED segment
//   .an-miss{fill:var(--crimson)}  missed segment / missed-protocols Reset segment
//   .an-red{fill:var(--crimson)}   red-line Reset segment .an-bar{fill:var(--accent)}     tactic bar, weekday column
//   .hm-all{fill:var(--accent)}    .hm-part{fill:var(--bronze-lt)}    .hm-none{fill:var(--text-3)}
//   .hm-missed{fill:none;stroke:var(--crimson)} (ring)
// Text: every `color:` in src/analytics.css (token or #hex) >= 4.5 on both plate stops and on every solid `background:`
// declared in src/analytics.css (e.g. a board .tile surface). The strip reuses screens.css .dy cells and .lg legend,
// here on .plate instead of .rim: reset fill, redo ring and legend text are re-checked on the plate stops.
// Not asserted (background, like the .plate hairline): the --line-soft track. Helpers copied from tests/contrast-challenge.test.js.
const tokensCss=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const screens=readFileSync(new URL('../screens.css',import.meta.url),'utf8');
let cached;const an=()=>(cached??=readFileSync(new URL('../src/analytics.css',import.meta.url),'utf8'));
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
const check=(t,name,fg,bg,min)=>{const x=ratio(rgb(fg),rgb(bg));t.diagnostic(`${name}: ${fg} on ${bg} = ${x.toFixed(3)}`);assert.ok(x>=min,`${name}: ${x.toFixed(3)} < ${min}`)};
const stops=v=>v.match(/#[0-9a-fA-F]{6}|var\(--[\w-]+\)/g).map(colour);
const lc=a=>a.map(s=>s.toLowerCase());
const plate=()=>{const b=stops(decl(tokensCss,'.plate','background'));assert.deepEqual(lc(b),lc([dark['--plate-top'],dark['--plate-bot']]));return b};
const isToken=(v,token)=>assert.equal(v,`var(${token})`,`expected var(${token}), got ${v}`);

const FILLS=[['.an-held','--accent'],['.an-med','--bronze-lt'],['.an-miss','--crimson'],['.an-red','--crimson'],['.an-bar','--accent'],
 ['.hm-all','--accent'],['.hm-part','--bronze-lt'],['.hm-none','--text-3']];

test('chart fills use the R5 tokens and are >= 3 on both plate stops',t=>{
 for(const [sel,token] of FILLS){
  const v=decl(an(),sel,'fill');isToken(v,token);
  for(const bg of plate())check(t,sel,colour(v),bg,3);
 }
});
test('heatmap missed ring: no fill, crimson stroke >= 3 on both plate stops',t=>{
 assert.equal(decl(an(),'.hm-missed','fill'),'none');
 const v=decl(an(),'.hm-missed','stroke');isToken(v,'--crimson');
 for(const bg of plate())check(t,'.hm-missed stroke',colour(v),bg,3);
});
test('every text colour in analytics.css >= 4.5 on the plate stops and its own solid surfaces',t=>{
 const css=an();
 const colours=[...css.matchAll(/(?:^|[;{])color:([^;}]+)/g)].map(m=>m[1].trim());
 assert.ok(colours.length>=1,'analytics.css declares no text colour');
 const surfaces=[...plate(),...[...css.matchAll(/(?:^|[;{])background:([^;}]+)/g)].map(m=>m[1].trim())
  .filter(v=>/^(#[0-9a-fA-F]{6}|var\(--[\w-]+\))$/.test(v)).map(colour)];
 for(const c of colours)for(const bg of surfaces)check(t,`color:${c}`,colour(c),bg,4.5);
});
test('reused strip on .plate: reset fill and redo ring >= 3, legend text >= 4.5',t=>{
 const ring=stops(decl(screens,'.dy.r','border'))[0];
 for(const bg of plate()){
  check(t,'.dy.x fill',colour(decl(screens,'.dy.x','background')),bg,3);
  check(t,'.dy.r ring',ring,bg,3);
  check(t,'.lg',colour(decl(screens,'.lg','color')),bg,4.5);
 }
});
