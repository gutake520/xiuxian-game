import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {RIVER_LEVELS} from '../data/river-crossing.js';
import {maybeFindRiver,playRiver} from '../systems/river-crossing.js';
import {maybeFindMemory,playMemory,memoryDifficulty} from '../systems/talisman-memory.js';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {takeStroll,strollEncounterCount} from '../systems/stroll.js';
import {showMemory} from '../ui/talisman-memory.js';
import {showRiver} from '../ui/river-crossing.js';
import {showStroll} from '../ui/stroll.js';
const make=(realm='筑基一层')=>migrateSave({slot:'new-encounters',player:{realm,spiritRoot:'金灵根',spiritStones:20},inventory:[]});
// Independent bit-mask BFS proves each published river configuration is solvable.
function riverSolution(level){
 const n=level.cargo.length,all=(1<<n)-1,queue=[[0,0,[]]],seen=new Set();
 for(let k=0;k<queue.length;k++){
  const [mask,bank,path]=queue[k],key=mask+':'+bank;if(seen.has(key))continue;seen.add(key);
  if(mask===all&&bank===1)return path;
  for(let bits=0;bits<=all;bits++){
   const load=Array.from({length:n},(_,i)=>i).filter(i=>bits>>i&1);
   if(load.some(i=>(mask>>i&1)!==bank)||load.reduce((s,i)=>s+level.cargo[i].weight,0)>level.capacity)continue;
   const next=mask^bits,b=1-bank;
   if(level.conflicts.some(([a,c])=>(next>>a&1)===(next>>c&1)&&(next>>a&1)!==b))continue;
   queue.push([next,b,[...path,load]]);
  }
 }
 throw Error('unsolvable river');
}
function pairs(p){return Array.from({length:p.pairs},(_,v)=>p.cards.flatMap((c,i)=>c===v?[i]:[]))}
function finishMemory(s,now=1000){const p=s.talismanMemory;playMemory(s,p.id,'start',null,now);for(const pair of pairs(p))for(const i of pair)playMemory(s,p.id,'flip',i,++now);return p}
test('every river variant solves after reload; reward range, repeat payout and reset are safe',()=>{
 for(let level=0;level<RIVER_LEVELS.length;level++)for(const rewardRoll of [0,.3,.6,.999]){
  let s=make(),rolls=[0,(level+.1)/RIVER_LEVELS.length,rewardRoll];assert.ok(maybeFindRiver(s,()=>rolls.shift()));
  const id=s.riverCrossing.id,reward=s.riverCrossing.reward,initial=structuredClone(s.riverCrossing);
  assert.equal(maybeFindRiver(s,()=>0),false);
  playRiver(s,id,'reset');assert.deepEqual(s.riverCrossing,initial);
  for(const load of riverSolution(RIVER_LEVELS[level])){s=migrateSave(JSON.parse(JSON.stringify(s)));playRiver(s,id,'cross',load)}
  assert.equal(s.riverCrossing.phase,'won');assert.equal(s.player.spiritStones,20+reward);assert.equal(reward,7+Math.floor(rewardRoll*4));
  assert.throws(()=>playRiver(s,id,'cross',[]));assert.throws(()=>playRiver(s,id,'reset'));assert.equal(s.player.spiritStones,20+reward);
 }
 assert.equal(maybeFindRiver(make('炼气一层'),()=>0),false);assert.equal(maybeFindRiver(make(),()=>.2),false);
});
test('river rejects dangerous crossings, excess weight, duplicate passengers and stale actions without mutations',()=>{
 const s=make();maybeFindRiver(s,()=>0);const id=s.riverCrossing.id,before=structuredClone(s);
 for(const load of [[],[0],[0,1],[1,1],[-1],[.5],[99]]){assert.throws(()=>playRiver(s,id,'cross',load));assert.deepEqual(s,before)}
 assert.throws(()=>playRiver(s,'stale','reset'));playRiver(s,id,'cross',[1]);const moved=structuredClone(s);
 assert.throws(()=>playRiver(s,id,'cross',[0]));assert.deepEqual(s,moved);
 s.battle={};assert.throws(()=>playRiver(s,id,'reset'));delete s.battle;playRiver(s,id,'abandon');assert.equal(s.riverCrossing,null);assert.equal(s.player.spiritStones,20);
});
test('memory has 5 easy wins, 5 medium wins and permanent hard; exactly paired shuffled decks',()=>{
 const s=make('炼气一层');
 for(let wins=0;wins<15;wins++){
  const want=wins<5?[6,30]:wins<10?[8,35]:[10,40];assert.deepEqual([memoryDifficulty(s).pairs,memoryDifficulty(s).seconds],want);
  maybeFindMemory(s,()=>.1);const p=s.talismanMemory;assert.equal(p.cards.length,want[0]*2);assert.ok(pairs(p).every(x=>x.length===2));
  assert.equal(maybeFindMemory(s,()=>0),false);finishMemory(s);assert.equal(s.talismanMemoryWins,wins+1);
  assert.throws(()=>playMemory(s,p.id,'flip',0,2000));playMemory(s,p.id,'dismiss');
 }
 assert.equal(s.inventory.find(x=>x.itemId==='guard-talisman').quantity,15);assert.equal(s.inventory.find(x=>x.itemId==='attack-talisman').quantity,15);
});
test('memory timer survives reload, never restarts, expires before final flip and failure does not advance',()=>{
 let s=make();s.talismanMemoryWins=5;maybeFindMemory(s,()=>0);const id=s.talismanMemory.id;
 playMemory(s,id,'start',null,1000);const end=s.talismanMemory.endsAt;
 s=migrateSave(JSON.parse(JSON.stringify(s)));assert.equal(s.talismanMemory.endsAt,end);assert.throws(()=>playMemory(s,id,'start',null,2000));
 const all=pairs(s.talismanMemory).flat(),last=all.pop();for(const i of all)playMemory(s,id,'flip',i,2000);
 playMemory(s,id,'flip',last,end);assert.equal(s.talismanMemory.phase,'lost');assert.equal(s.talismanMemoryWins,5);assert.equal(s.inventory.length,0);
 playMemory(s,id,'dismiss');maybeFindMemory(s,()=>0);assert.equal(s.talismanMemory.pairs,8);
});
test('mismatches persist briefly, block a third flip and settle correctly after reopening; same card cannot match itself',()=>{
 let s=make();maybeFindMemory(s,()=>0);const p=s.talismanMemory,id=p.id;playMemory(s,id,'start',null,1000);
 const a=0,b=p.cards.findIndex(x=>x!==p.cards[a]);playMemory(s,id,'flip',a,1100);playMemory(s,id,'flip',a,1101);assert.equal(p.open.length,1);
 playMemory(s,id,'flip',b,1200);assert.equal(p.hideAt,1850);playMemory(s,id,'flip',2,1300);assert.deepEqual(p.open,[a,b]);
 s=migrateSave(JSON.parse(JSON.stringify(s)));playMemory(s,id,'tick',null,1850);assert.deepEqual(s.talismanMemory.open,[]);assert.equal(s.talismanMemory.matched.length,0);
});
test('reward uses current realm and full bag sends both correct talismans to temporary storage',()=>{
 const s=make('炼气十层');maybeFindMemory(s,()=>0);s.player.realm='筑基一层';s.bagCapacity=0;
 finishMemory(s);assert.deepEqual(s.temporaryLoot.map(x=>x.itemId).sort(),['foundation-attack-talisman','foundation-guard-talisman']);
 assert.ok(s.temporaryLoot.every(x=>x.quantity===1));assert.match(s.talismanMemory.text,/临时储物/);
});
test('encounters use correct locations, one daily quota per offer and respect pending games, priority and caps',()=>{
 const now=Date.now(),s=make();s.zhangHuaijin={unlocked:true};s.traitorProgress=30;
 let rolls=[.99,.99,0,0,0];takeStroll(s,'foundation',now,()=>rolls.shift()??.99);assert.ok(s.riverCrossing);assert.equal(strollEncounterCount(s,now),1);
 takeStroll(s,'foundation',now,()=>.99);assert.equal(strollEncounterCount(s,now),1);
 takeStroll(s,'sects',now,()=>0);assert.ok(s.talismanMemory);assert.equal(strollEncounterCount(s,now),2);
 takeStroll(s,'sects',now,()=>0);assert.equal(strollEncounterCount(s,now),2);
 const capped=make();capped.stroll={...s.stroll,encounters:7};capped.traitorProgress=30;
 takeStroll(capped,'sects',now,()=>0);assert.equal(capped.talismanMemory,undefined);
 const priority=make();takeStroll(priority,'sects',now,()=>0);assert.ok(priority.traitorPuzzle);assert.equal(priority.talismanMemory,undefined);
 const wrong=make();takeStroll(wrong,'market',now,()=>.99);assert.equal(wrong.talismanMemory,undefined);assert.equal(wrong.riverCrossing,undefined);
});
test('concurrent final flips pay only once through IndexedDB transactions',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();maybeFindMemory(s,()=>0);const id=s.talismanMemory.id;playMemory(s,id,'start',null,1000);
 const all=pairs(s.talismanMemory).flat(),last=all.pop();for(const i of all)playMemory(s,id,'flip',i,1100);await writeSave(s);
 const results=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,next=>{playMemory(next,id,'flip',last,1200);return next})));
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const loaded=await readSave(s.slot);assert.equal(loaded.talismanMemoryWins,1);assert.equal(loaded.inventory.length,2);assert.ok(loaded.inventory.every(x=>x.quantity===1));
});
test('UI hides card identities, handles write failures, returns without resetting and rejects stale slots',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<main id="xg-panel"></main>').document;t.after(()=>globalThis.document=old);
 const s=make();maybeFindMemory(s,()=>0);maybeFindRiver(s,()=>0);let fail=true,closed=0;
 const api={getSave:()=>s,actions:{mutate:async fn=>{if(fail)throw Error('保存失败');return {result:fn(s)}}}};
 showStroll(api,()=>{});document.querySelector('[data-memory]').click();assert.equal(s.talismanMemory.phase,'ready');
 await document.querySelector('[data-memory-action="start"]').onclick();assert.equal(s.talismanMemory.phase,'ready');assert.match(document.querySelector('[role=status]').textContent,/保存失败/);
 fail=false;await document.querySelector('[data-memory-action="start"]').onclick();assert.equal(document.querySelectorAll('[data-memory-card]').length,12);assert.ok([...document.querySelectorAll('[data-memory-card]')].every(b=>b.textContent==='符点按翻开'&&!b.hasAttribute('style')));
 const end=s.talismanMemory.endsAt;await document.querySelector('[data-memory-card="0"]').onclick();document.querySelector('[data-close]').click();document.querySelector('[data-memory]').click();assert.equal(s.talismanMemory.endsAt,end);assert.equal(document.querySelectorAll('.is-open').length,1);
 s.slot='other';await document.querySelector('[data-memory-card="1"]').onclick();assert.deepEqual(s.talismanMemory.open,[0]);document.querySelector('[data-close]').click();s.slot='new-encounters';
 showRiver(api,()=>closed++);assert.equal(document.querySelectorAll('[data-cargo]').length,3);document.querySelector('[data-cargo="1"]').click();await document.querySelector('[data-river-action="cross"]').onclick();assert.equal(s.riverCrossing.moves,1);
 document.querySelector('[data-close]').click();assert.equal(closed,1);assert.equal(s.riverCrossing.bank,1);
});
test('concurrent river completion only credits its fixed reward once',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();maybeFindRiver(s,()=>0);const p=s.riverCrossing,path=riverSolution(RIVER_LEVELS[p.level]),last=path.pop();
 for(const load of path)playRiver(s,p.id,'cross',load);await writeSave(s);
 const results=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,next=>{playRiver(next,p.id,'cross',last);return next})));
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const loaded=await readSave(s.slot);assert.equal(loaded.player.spiritStones,20+p.reward);
});
