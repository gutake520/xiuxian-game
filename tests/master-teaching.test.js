import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {SECT_MASTERS} from '../data/masters.js';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {visitTeachingMaster,collectTeachingMaterial,submitTeachingTask,teachingStatus,TEACHING_MATERIALS} from '../systems/master-teaching.js';
import {beginBattle,playRound,fleeBattle} from '../systems/combat.js';
import {showMasterTeaching} from '../ui/master-teaching.js';
const now=new Date(2026,9,23,12).getTime();
const make=(realm='炼气四层')=>migrateSave({slot:'teaching-test',player:{name:'言一',sect:'青岚谷',realm,spiritRoot:'金灵根',cultivation:0,spiritStones:100,hp:100,mp:20,combat:{hp:100,mp:20,attack:100,defense:0,speed:100,critRate:0,dodgeRate:0},stats:{福缘:10}},inventory:[]},now);
test('one daily attempt has a strict 40 percent boundary; pending tasks never expire or reroll',()=>{
 const s=make();visitTeachingMaster(s,now,()=>.4);assert.equal(s.masterTeaching.task,undefined);assert.throws(()=>visitTeachingMaster(s,now,()=>0),/今日/);
 visitTeachingMaster(s,now+86400000,()=>.399999);const task=structuredClone(s.masterTeaching.task);assert.ok(task);assert.throws(()=>visitTeachingMaster(s,now+5*86400000,()=>0),/手中/);assert.deepEqual(s.masterTeaching.task,task);
 const loaded=migrateSave(JSON.parse(JSON.stringify(s)),now+10*86400000);assert.deepEqual(loaded.masterTeaching.task,task);
});
test('six beasts, unlocked targets only, nine existing masters and foundation catch-up',()=>{
 assert.equal(Object.keys(TEACHING_MATERIALS).length,6);
 for(const sect of Object.keys(SECT_MASTERS)){const s=make();s.player.sect=sect;assert.match(visitTeachingMaster(s,now,()=>0),new RegExp(SECT_MASTERS[sect].name))}
 for(let i=0;i<6;i++){const s=make('筑基一层');let n=0;visitTeachingMaster(s,now,()=>n++?i/6:0);assert.equal(s.masterTeaching.task.monsterId,Object.keys(TEACHING_MATERIALS)[i]);assert.equal(s.masterTeaching.qiCompleted,0)}
 const low=make('炼气一层');let n=0;visitTeachingMaster(low,now,()=>n++?.99:0);assert.equal(low.masterTeaching.task.monsterId,'swift');
});
test('ten matching victories yield exactly ten materials; other fights, fleeing and post-cap kills yield none',t=>{
 t.mock.method(Math,'random',()=>.99);const s=make('筑基一层');visitTeachingMaster(s,now,()=>0);
 beginBattle(s,'fierce');playRound(s,'attack',now);assert.equal(s.masterTeaching.task.collected,0);
 beginBattle(s,'tough');fleeBattle(s);assert.equal(s.masterTeaching.task.collected,0);
 for(let i=0;i<11;i++){beginBattle(s,'tough');const result=playRound(s,'attack',now);assert.equal(s.masterTeaching.task.collected,Math.min(10,i+1));assert.equal(result.result.rewards.some(x=>x.includes('师门委托')),i<10)}
 assert.ok(!s.inventory.some(i=>i.itemId==='獠牙'));
 assert.throws(()=>playRound(s,'attack',now));assert.equal(s.masterTeaching.task.collected,10);
});
test('three submissions award 60 to 90 cultivation once each, then open the foundation story after the qi prerequisite',()=>{
 const s=make('筑基一层');
 for(let i=0;i<3;i++){
  visitTeachingMaster(s,now+i*86400000,()=>0);const id=s.masterTeaching.task.id;assert.throws(()=>submitTeachingTask(s,id,now),/还需/);
  for(let j=0;j<10;j++)collectTeachingMaterial(s,'tough');
  s.player.sect='丹霞谷';const reward=submitTeachingTask(s,id,now,()=>i===0?0:.999);assert.equal(reward.earned,i===0?60:90);assert.match(reward.text,/温照蘅/);assert.throws(()=>submitTeachingTask(s,id,now),/已经交付/);
 }
 assert.equal(s.player.cultivation,240);assert.equal(teachingStatus(s).foundationReady,true);assert.match(visitTeachingMaster(s,now+10*86400000,()=>0),/故人之子/);assert.equal(s.oldFriend.step,0);
 s.player.realm='炼气四层';assert.throws(()=>visitTeachingMaster(s,now+10*86400000,()=>0),/待筑基/);
});
test('simultaneous submissions persist only one reward',async()=>{
 globalThis.indexedDB=indexedDB;const s=make('筑基一层');visitTeachingMaster(s,now,()=>0);for(let i=0;i<10;i++)collectTeachingMaterial(s,'tough');const id=s.masterTeaching.task.id;await writeSave(s);
 const results=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,next=>{submitTeachingTask(next,id,now,()=>0);return next})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const loaded=await readSave(s.slot);assert.equal(loaded.masterTeaching.qiCompleted,1);assert.equal(loaded.player.cultivation,60);
});
test('master screen shows named teacher, persists visits, and permits retry after storage failure',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><section id="xg-panel"></section></body></html>').document;t.after(()=>globalThis.document=old);t.mock.method(Date,'now',()=>now);t.mock.method(Math,'random',()=>0);
 const s=make();let fail=true;const api={getSave:()=>s,actions:{mutate:async fn=>{if(fail)throw Error('写入失败');return {result:fn(s)}}}};
 showMasterTeaching(api,()=>{});assert.match(document.body.textContent,/谢疏岚/);document.querySelector('[data-visit]').click();await new Promise(r=>setImmediate(r));assert.match(document.body.textContent,/写入失败/);
 fail=false;document.querySelector('[data-visit]').click();await new Promise(r=>setImmediate(r));assert.ok(s.masterTeaching.task);assert.equal(document.querySelector('[data-submit]').disabled,true);assert.match(document.body.textContent,/0 \/ 10/);
});

test('teaching trigger boundary is forty percent',()=>{
 const s=make();visitTeachingMaster(s,now,()=>.3999);assert.ok(s.masterTeaching.task);
 const missed=make();visitTeachingMaster(missed,now,()=>.4);assert.equal(missed.masterTeaching.task,undefined);
});
