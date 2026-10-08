import {completeOcc,upsertBlock,occurrencesOn,toMin,fromMin} from '../src/logic.js';
export const goals=()=>[
 {id:'biz',name:'Business',icon:'briefcase',minutes:{weekday:60,weekend:240},weeklyCount:null,checks:[],committedUntil:'2026-11-07'},
 {id:'uni',name:'Uni',icon:'book',minutes:{weekday:120,weekend:240},weeklyCount:null,checks:[],committedUntil:'2026-11-07'},
 {id:'body',name:'Body & Health',icon:'heart',minutes:null,weeklyCount:{label:'Gym sessions',target:4},checks:[{id:'cal',label:'Calories on target'}],committedUntil:'2026-11-07'},
 {id:'social',name:'Socializing',icon:'people',minutes:null,weeklyCount:{label:'Social reps',target:3},checks:[],committedUntil:'2026-11-07'}];
export const S=(o={})=>({v:1,goals:goals(),redLines:[],blocks:[],occ:{},checks:{},manualMet:{},counts:{},red:{},weights:[],targetWeightKg:null,timer:null,lastBackup:null,...o});
export const B=(o={})=>({id:'b1',title:'Deep work',desc:'',date:'2026-10-08',start:'20:30',end:'21:50',tag:'biz',repeat:{type:'none',days:[]},until:null,skip:[],...o});
let n=0;
/** Add a one-off block on `date` starting 09:00 that lasts `min` minutes and complete it (optionally with actual minutes). */
export function logged(s,date,tag,min,actual){const id='f'+(++n);s=upsertBlock(s,B({id,date,tag,start:'09:00',end:fromMin(540+min)}));
 return completeOcc(s,occurrencesOn(s,date).find(o=>o.blockId===id),actual)}
