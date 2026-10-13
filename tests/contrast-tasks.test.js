import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Plan Task 11: contrast of the Tasks tab colours in screens.css (text >= 4.5, graphics >= 3; CLAUDE.md).
// Tokens from styles.css; helpers copied from tests/contrast-graphics.test.js, reading screens.css instead.
const tokensCss=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const css=readFileSync(new URL('../screens.css',import.meta.url),'utf8');
const D0=tokensCss.indexOf('/* tokens:dark */');
const dark=Object.fromEntries([...tokensCss.slice(D0,tokensCss.indexOf('}',D0)).matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(m=>[m[1],m[2]]));
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*r+0.7152*g+0.0722*b};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05)};
const decl=(sel,prop)=>{
 const m=css.match(new RegExp(`(?:^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\{([^}]*)\\}`));
 assert.ok(m,`rule ${sel} not found`);
 const v=m[1].match(new RegExp(`(?:^|;)${prop}:([^;]+)`))?.[1].trim();
 assert.ok(v,`${sel} has no ${prop}`);return v;
};
const colour=v=>{const t=v.match(/^var\((--[\w-]+)\)$/)?.[1];const hex=t?dark[t]:v;assert.match(hex??'',/^#[0-9a-fA-F]{6}$/,`unresolved colour ${v}`);return hex};
const over=(fg,bg,a)=>fg.map((c,i)=>Math.round(a*c+(1-a)*bg[i]));
// fg/bg: '#rrggbb'; a: fg opacity over bg.
const check=(t,name,fg,bg,min,a=1)=>{const x=ratio(over(rgb(fg),rgb(bg),a),rgb(bg));t.diagnostic(`${name}: ${fg}${a<1?` @${a}`:''} on ${bg} = ${x.toFixed(3)}`);assert.ok(x>=min,`${name}: ${x.toFixed(3)} < ${min}`)};
const gradStops=v=>{const s=v.match(/#[0-9a-fA-F]{6}/g);assert.ok(s?.length>=2,`no gradient stops in ${v}`);return s};

test('week day: weekday and number text on --plate-alt >= 4.5',t=>{
 const bg=colour(decl('.wk','background'));
 assert.equal(bg,dark['--plate-alt']);
 check(t,'.wk weekday',colour(decl('.wk','color')),bg,4.5);
 check(t,'.wk span number',colour(decl('.wk span','color')),bg,4.5);
});
test('selected week day: weekday and number text on both gradient stops >= 4.5',t=>{
 const stops=gradStops(decl('.wk.sel','background'));
 assert.deepEqual(stops.map(s=>s.toLowerCase()),['#2a2214','#17140f']);
 for(const bg of stops){
  check(t,'.wk.sel weekday',colour(decl('.wk','color')),bg,4.5);
  check(t,'.wk.sel span number',colour(decl('.wk.sel span','color')),bg,4.5);
 }
});
test('selected week day border on --bg >= 3 (graphic)',t=>check(t,'.wk.sel border',colour(decl('.wk.sel','border-color')),dark['--bg'],3));
test('meander stroke on --bg >= 3 (graphic)',t=>{
 const hex=decl('.mk','background').match(/stroke='%23([0-9a-fA-F]{6})'/)?.[1];
 assert.ok(hex,'no meander stroke in .mk');
 check(t,'.mk meander stroke',`#${hex}`,dark['--bg'],3);
});
test('form fields: text on --field >= 4.5',t=>{
 for(const sel of ['.in','.ta']){
  const bg=colour(decl(sel,'background'));
  check(t,`${sel} text`,colour(decl(sel,'color')),bg,4.5);
 }
});
test('sheet text (labels, actions, destructive, error) on both plate stops >= 4.5',t=>{
 for(const bg of [dark['--plate-top'],dark['--plate-bot']]){
  check(t,'.fld-l',colour(decl('.fld-l','color')),bg,4.5);
  check(t,'.btn-text',colour(decl('.btn-text','color')),bg,4.5);
  check(t,'.action-row',colour(decl('.action-row','color')),bg,4.5);
  check(t,'.action-row.destructive',colour(decl('.action-row.destructive','color')),bg,4.5);
  check(t,'.form-error',colour(decl('.form-error','color')),bg,4.5);
 }
});
// Fix round 2: today marker on a week day, and the Today button text on the .more ghost background (styles.css).
test('today week day: dot >= 3 (graphic) and number >= 4.5 on --plate-alt',t=>{
 const bg=dark['--plate-alt'];
 check(t,'.wk.today i dot',colour(decl('.wk.today i','background')),bg,3);
 check(t,'.wk.today span number',colour(decl('.wk.today span','color')),bg,4.5);
});
test('Today button text on the .more background >= 4.5',t=>{
 const more=tokensCss.match(/\n\.more\{[^}]*background:(#[0-9a-fA-F]{6})/)?.[1];
 assert.ok(more,'no .more background in styles.css');
 check(t,'.more.tdy text',colour(decl('.more.tdy','color')),more,4.5);
});
