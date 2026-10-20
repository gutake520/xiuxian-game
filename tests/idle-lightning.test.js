import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {settleIdle,localDay} from '../systems/cultivation.js';

globalThis.indexedDB=indexedDB;
const start=new Date(2026,9,18).getTime(),minute=60000;
const tomorrow=new Date(2026,9,19).getTime();
function make(fortune=3){
 return migrateSave({slot:'lightning',player:{name:'测试',realm:'炼气一层',cultivation:0,stats:{福缘:fortune}},inventory:[],events:[],techniques:{mastered:['basic-qi-guide'],main:'basic-qi-guide',puzzles:{}}},start);
}
function random(t,values){
 let calls=0;t.mock.method(Math,'random',()=>{assert.ok(calls<values.length,'unexpected random roll');return values[calls++]});
 return()=>calls;
}

test('lightning waits for full daily allowance and survives reload without another roll',t=>{
 const calls=random(t,[.049,.999]),s=make();
 assert.equal(settleIdle(s,start+119*minute),59.5);assert.equal(calls(),0);
 settleIdle(s,start+120*minute);assert.equal(s.player.cultivation,30);assert.equal(calls(),2);
 assert.match(s.events[0].messages[0],/惊雷.*修为 −30/);assert.doesNotMatch(s.events[0].messages[0],/5%/);
 const loaded=migrateSave(JSON.parse(JSON.stringify(s)),start+121*minute);
 settleIdle(loaded,start+180*minute);settleIdle(loaded,start+120*minute);
 assert.equal(loaded.player.cultivation,30);assert.equal(loaded.events.length,1);assert.equal(calls(),2);
});

test('five-percent boundary, fortune cutoff and missing fortune are respected',t=>{
 const calls=random(t,[.05,0,0]);const miss=make();settleIdle(miss,start+120*minute);
 assert.equal(miss.player.cultivation,60);assert.equal(miss.events.length,0);
 miss.qiPillDay=localDay(start);settleIdle(miss,start+150*minute);assert.equal(calls(),1);
 for(const fortune of [4,10,undefined]){
  const s=make();s.player.stats.福缘=fortune;settleIdle(s,start+120*minute);assert.equal(s.events.length,0);
 }
 const hit=make(3.99);settleIdle(hit,start+120*minute);assert.equal(hit.player.cultivation,40);assert.equal(calls(),3);
});

test('pills, companions and cultivation manuals extend the allowance before the roll',t=>{
 const calls=random(t,[0,0,0,0,0,0]);
 for(const kind of ['pill','companion','manual']){
  const s=make();let limit=150;
  if(kind==='pill')s.qiPillDay=localDay(start);
  if(kind==='companion')s.player.companions=['燕停云'];
  if(kind==='manual'){s.techniques.mastered=['archive-meditation'];s.techniques.main='archive-meditation';limit=180}
  settleIdle(s,start+(limit-1)*minute);assert.equal(s.events.length,0);
  settleIdle(s,start+limit*minute);assert.equal(s.events.length,1);
  s.foundationPillDay=localDay(start);settleIdle(s,start+(limit+45)*minute);assert.equal(s.events.length,1);
 }
 assert.equal(calls(),6);
});

test('multi-day offline settlement matches daily visits and records one mishap per full day',t=>{
 random(t,Array(12).fill(0));const offline=make(),daily=make();
 const third=new Date(2026,9,20).getTime(),fourth=new Date(2026,9,21).getTime();
 settleIdle(offline,fourth);
 for(const end of [tomorrow,third,fourth])settleIdle(daily,end);
 assert.equal(offline.player.cultivation,120);assert.equal(offline.events.length,3);
 assert.deepEqual(offline.player,daily.player);assert.deepEqual(offline.idle,daily.idle);
 assert.equal(offline.idle.usedMs,0);
});

test('partial days, absent main technique and already completed realms do not roll',t=>{
 random(t,[]);const partial=make();partial.idle.lastAt=tomorrow-30*minute;
 settleIdle(partial,tomorrow+30*minute);assert.equal(partial.player.cultivation,30);assert.equal(partial.events.length,0);
 const noMain=make();noMain.techniques.main=null;settleIdle(noMain,tomorrow);assert.equal(noMain.idle.usedMs,0);
 const capped=make();capped.player.realm='筑基三层';settleIdle(capped,tomorrow);assert.equal(capped.events.length,0);
 const reachesCap=make();reachesCap.player.realm='筑基二层';reachesCap.player.cultivation=1499;
 settleIdle(reachesCap,tomorrow);assert.equal(reachesCap.player.realm,'筑基三层');assert.equal(reachesCap.player.cultivation,0);
});

test('a level-up keeps its realm and lightning deducts the full loss using existing cultivation debt',t=>{
 random(t,[0,0]);const s=make();s.player.cultivation=100;
 settleIdle(s,start+120*minute);assert.equal(s.player.realm,'炼气二层');assert.equal(s.player.cultivation,-10);
 settleIdle(s,tomorrow+30*minute);assert.equal(s.player.cultivation,5);
});

test('concurrent stored settlements apply the lightning loss exactly once',async t=>{
 const calls=random(t,[0,0]);await writeSave(make());
 await Promise.all(Array.from({length:3},()=>updateSave('lightning',s=>{settleIdle(s,start+120*minute);return s})));
 const saved=await readSave('lightning');assert.equal(saved.player.cultivation,40);assert.equal(saved.events.length,1);
 assert.equal(saved.idle.lightningCheckedDay,localDay(start));assert.equal(calls(),2);
});

test('foundation lightning deducts 30 through 40 cultivation',t=>{
 random(t,[0,0,0,.999]);
 for(const loss of [30,40]){const s=make();s.player.realm='筑基一层';settleIdle(s,start+120*minute);assert.equal(s.player.cultivation,60-loss)}
});
