import test from 'node:test';import assert from 'node:assert/strict';
import {goalRulesChanged,saveGoal} from '../src/logic.js';import {S,goals} from './fixtures.js';
const G=id=>goals().find(g=>g.id===id);
test('goalRulesChanged: minimums, weekly target and checks are rules; the name is not',()=>{
 const b=G('biz');assert.equal(goalRulesChanged(b,{...b,name:'Startup'}),false);
 assert.equal(goalRulesChanged(b,{...b,minutes:{weekday:45,weekend:240}}),true);
 const body=G('body');assert.equal(goalRulesChanged(body,{...body,weeklyCount:{...body.weeklyCount,target:3}}),true);
 assert.equal(goalRulesChanged(body,{...body,checks:[{id:'cal',label:'Calories in range'}]}),true);
 assert.equal(goalRulesChanged(body,{...body,checks:[]}),true)});
test('saveGoal: a rule change starts a new 30-day commitment; a rename keeps it; pure',()=>{
 const s=S();const snap=JSON.stringify(s);
 const renamed=saveGoal(s,{...G('biz'),name:'Startup'},'2026-10-20');
 assert.equal(renamed.goals[0].name,'Startup');assert.equal(renamed.goals[0].committedUntil,'2026-11-07');
 const changed=saveGoal(s,{...G('uni'),minutes:{weekday:90,weekend:240}},'2026-10-20');
 assert.equal(changed.goals[1].committedUntil,'2026-11-19');assert.equal(changed.goals[1].minutes.weekday,90);
 assert.deepEqual(changed.goals.map(g=>g.id),['biz','uni','body','social']);assert.equal(JSON.stringify(s),snap)});
