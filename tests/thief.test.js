import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {THIEF_PLACES,maybeMeetThief,theftChance} from '../systems/thief.js';
import {takeStroll,strollEncounterCount} from '../systems/stroll.js';
import {migrateSave} from '../storage/migrations.js';
import {readSave,writeSave,updateSave} from '../storage/saves.js';
const now=new Date(2026,9,22,12).getTime();
const make=(luck=1,stones=100)=>migrateSave({slot:'thief',player:{realm:'筑基一层',spiritRoot:'金灵根',stats:{福缘:luck},spiritStones:stones},inventory:[]},now);
const rolls=(...values)=>()=>values.shift()??.99;
test('all four locations have a five percent encounter boundary, including ten luck',()=>{
 for(const id of THIEF_PLACES)for(const luck of [1,10]){
  const s=make(luck);assert.equal(takeStroll(s,id,now,rolls(.5,.049999,.99)).kind,'thief');
  assert.equal(strollEncounterCount(s,now),0);
  const miss=make(luck);assert.notEqual(takeStroll(miss,id,now,rolls(.5,.05)).kind,'thief');
 }
 for(const id of ['sects','spirit-peak'])assert.equal(maybeMeetThief(make(),id,()=>0),null);
});
test('theft success is 90 percent at one luck and zero at ten, with exact intermediate boundaries',()=>{
 for(let luck=1;luck<=10;luck++){
  const chance=theftChance(make(luck).player);assert.ok(Math.abs(chance-(10-luck)/10)<1e-12);
  const s=make(luck);const failed=maybeMeetThief(s,'market',rolls(0,chance));assert.equal(failed.success,false);assert.equal(s.player.spiritStones,100);
  if(chance>0){const hit=maybeMeetThief(s,'market',rolls(0,chance-1e-6));assert.equal(hit.stolen,20);assert.equal(s.player.spiritStones,80)}
 }
 assert.equal(maybeMeetThief(make(10),'market',()=>0).success,false);
 assert.equal(maybeMeetThief(make(7),'market',rolls(0,.3)).success,false);
});
test('steals twenty percent of current balance with normal two-decimal rounding, never below zero',()=>{
 for(const [stones,stolen,left] of [[100,20,80],[12.34,2.47,9.87],[0,0,0],[.01,0,.01]]){
  const s=make(1,stones);const hit=takeStroll(s,'monsters',now,()=>0);
  assert.equal(hit.stolen,stolen);assert.equal(s.player.spiritStones,left);
  const loaded=migrateSave(JSON.parse(JSON.stringify(s)),now);assert.equal(loaded.player.spiritStones,left);assert.deepEqual(loaded.stroll.last,s.stroll.last);
 }
 const s=make();takeStroll(s,'monsters',now,()=>0);takeStroll(s,'monsters',now,()=>0);assert.equal(s.player.spiritStones,64);
});
test('thief never consumes encounter quota and can appear after the daily cap',()=>{
 for(const id of THIEF_PLACES){const s=make();takeStroll(s,id,now,()=>0);assert.equal(s.stroll.encounters,0);assert.equal(s.treasure,undefined);assert.equal(s.stallGames,undefined);assert.equal(s.battle,undefined)}
 const s=make();takeStroll(s,'monsters',now,()=>0);s.stroll.encounters=7;
 takeStroll(s,'monsters',now,()=>0);assert.equal(s.player.spiritStones,64);assert.equal(s.stroll.encounters,7);
 takeStroll(s,'monsters',now+86400000,()=>0);assert.equal(s.player.spiritStones,51.2);assert.equal(s.stroll.encounters,0);
 const blocked=make();blocked.battle={};assert.throws(()=>takeStroll(blocked,'monsters',now,()=>0));assert.equal(blocked.player.spiritStones,100);
});
test('atomic thief visits each deduct stones without consuming encounter quota',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();takeStroll(s,'monsters',now,()=>.99);s.stroll.encounters=6;await writeSave(s);
 await Promise.all([1,2].map(()=>updateSave(s.slot,next=>{takeStroll(next,'monsters',now,()=>0);return next})));
 const saved=await readSave(s.slot);assert.equal(saved.player.spiritStones,64);assert.equal(saved.stroll.encounters,6);
});
test('real action pipeline excludes stolen stones but still counts subsequent purchases',async t=>{
 const {createActions}=await import('../core/actions.js');
 const {buyStrollEncounter}=await import('../systems/stroll.js');
 const {localDay}=await import('../systems/cultivation.js');
 globalThis.indexedDB=indexedDB;t.mock.method(Date,'now',()=>now);
 let current=make();current.player.sect='青岚谷';current.player.cultivation=0;
 current.sectDaily={day:localDay(now),kills:0,spent:1,explored:0,practice:0,gift:0,repair:0,claimed:[],selected:['kills','spent','explored']};
 await writeSave(current);
 const api=createActions({getSave:()=>current,setSave:s=>{current=s}});
 await api.mutate(s=>takeStroll(s,'market',now,()=>0));
 assert.equal(current.player.spiritStones,80);assert.equal(current.sectDaily.spent,1);assert.equal((await readSave(current.slot)).sectDaily.spent,1);
 await api.mutate(s=>takeStroll(s,'market',now,rolls(0,0,.99)));assert.equal(current.sectDaily.spent,1);
 await api.mutate(s=>buyStrollEncounter(s,now));assert.equal(current.player.spiritStones,60);assert.equal(current.sectDaily.spent,3);
});
