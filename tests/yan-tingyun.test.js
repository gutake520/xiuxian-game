import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave} from '../storage/saves.js';
import {createActions} from '../core/actions.js';
import {addItem} from '../systems/inventory.js';
import {giveYanGift,yanState,queueYanAfterVictory,maybeMeetYan,resolveYanEncounter,acknowledgeYanAftermath,seenYanScene,answerYan,leaveYan} from '../systems/yan-tingyun.js';
import {beginBattle,playRound} from '../systems/combat.js';

globalThis.indexedDB=indexedDB;
function make(charm=8,slot='yan'){
 return migrateSave({slot,player:{name:'测试',realm:'炼气七层',sect:'无门无派',spiritRoot:'金灵根',stats:{魅力:charm,福缘:0},cultivation:0,spiritStones:100,hp:30,mp:10,combat:{hp:30,mp:10,attack:4,defense:10,speed:5,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[],puzzles:{},main:null},bagCapacity:20});
}
function fixed(value,fn){const before=Math.random;try{Math.random=()=>value;return fn()}finally{Math.random=before}}
function meet(save,id){queueYanAfterVictory(save,id);assert.equal(fixed(.049,()=>maybeMeetYan(save)),true);return save.yanEncounterPending.id}
function reachThird(save){for(let i=1;i<=2;i++){const id=meet(save,'battle-'+i);assert.equal(save.yanEncounterPending.step,i);resolveYanEncounter(save,id,'continue')}return meet(save,'battle-3')}

test('five-percent roll happens once after other post-battle events, and three rescues stop future rolls',()=>{
 const s=make();queueYanAfterVictory(s,'fight');s.divinationPending={id:'coin'};assert.equal(maybeMeetYan(s),false);s.divinationPending=null;
 s.encounterPending={id:'herb'};assert.equal(maybeMeetYan(s),false);s.encounterPending=null;
 assert.equal(fixed(.05,()=>maybeMeetYan(s)),false);assert.equal(s.yanEncounterBattleId,undefined);
 reachThird(s);assert.equal(s.yanEncounterPending.step,3);
 resolveYanEncounter(s,s.yanEncounterPending.id,'together');acknowledgeYanAftermath(s,s.yanAftermath.id);
 queueYanAfterVictory(s,'later');assert.equal(fixed(0,()=>maybeMeetYan(s)),false);assert.equal(s.yanEncounterPending,null);
});

test('third choice follows current charisma and applies each stone outcome exactly once',()=>{
 for(const [charm,choice,stones,unlocked] of [[7,'stones',130,false],[7,'together',70,false],[8,'stones',130,false],[8,'together',100,true]]){
  const s=make(charm);const id=reachThird(s);assert.equal(s.yanEncounterPending.highCharm,charm>=8);
  assert.throws(()=>resolveYanEncounter(s,id,'continue'),/请选择回应/);
  const text=resolveYanEncounter(s,id,choice);assert.ok(text.includes('燕停云')||text.includes('山'));
  assert.equal(s.player.spiritStones,stones);assert.equal(Boolean(yanState(s).unlocked),unlocked);
  assert.throws(()=>resolveYanEncounter(s,id,choice),/结束/);
  const after=s.yanAftermath.id;acknowledgeYanAftermath(s,after);assert.throws(()=>acknowledgeYanAftermath(s,after),/结束/);
  queueYanAfterVictory(s,'later');assert.equal(maybeMeetYan(s),false);
 }
});

test('monster victory queues the encounter, while a chase waits for its final fight',()=>{
 const s=make();fixed(0,()=>{beginBattle(s,'tough-human');s.battle.hp=1;playRound(s,'attack')});
 assert.equal(s.yanEncounterBattleId,undefined);assert.equal(s.battle.retaliation,true);
 s.battle.hp=1;fixed(.99,()=>playRound(s,'attack'));
 assert.ok(s.yanEncounterBattleId);assert.equal(s.battle,null);
});

test('the unlocked residence shares gift, scene, partner cap and breakup rules',()=>{
 const s=make();reachThird(s);resolveYanEncounter(s,s.yanEncounterPending.id,'together');acknowledgeYanAftermath(s,s.yanAftermath.id);
 addItem(s,'calming-jade');const jade=s.inventory.at(-1);giveYanGift(s,jade.uid);assert.equal(yanState(s).affinity,4);assert.equal(s.inventory.includes(jade),false);
 addItem(s,'iron-sword');const sword=s.inventory.at(-1);sword.durability=19;giveYanGift(s,sword.uid);assert.equal(yanState(s).affinity,3);assert.equal(s.inventory.includes(sword),true);
 s.yanTingyun.affinity=100;seenYanScene(s,30);seenYanScene(s,60);seenYanScene(s,90);
 assert.equal(answerYan(s,'later').includes('想清楚'),true);assert.equal(s.player.companions,undefined);
 answerYan(s,'accept');assert.deepEqual(s.player.companions,['燕停云']);
 assert.throws(()=>answerYan(s,'accept'),/缘分/);
 leaveYan(s);assert.deepEqual(s.player.companions,[]);assert.equal(s.player.spiritStones,0);
});

test('pending third choice and its aftermath survive reload through atomic actions',async()=>{
 let current=make(8,'yan-persist');current.yanTingyun={rescues:2,affinity:0,seen:[]};current.yanEncounterPending={id:'last-meeting',step:3,highCharm:true};
 await writeSave(current);const actions=createActions({getSave:()=>current,setSave:s=>current=s});
 await actions.select('yan-persist');
 assert.ok((await readSave('yan-persist')).yanEncounterPending);
 const id=current.yanEncounterPending.id;await actions.respondToYan(id,'together');
 assert.equal((await readSave('yan-persist')).yanTingyun.unlocked,true);
 await actions.acknowledgeYan(current.yanAftermath.id);
 assert.equal((await readSave('yan-persist')).yanAftermath,null);
});

for(const stage of ['first','third','aftermath'])test(`offline qi-ten ambush cannot deadlock Yan ${stage}`,async()=>{
 let current=make(8,'yan-ambush-'+stage);
 current.player.realm='炼气九层';current.player.cultivation=749;
 current.techniques.mastered=['basic-qi-guide'];current.techniques.main='basic-qi-guide';
 current.idle.lastAt=Date.now()-3*60000;current.idle.usedMs=0;
 if(stage==='aftermath'){
  current.yanTingyun={rescues:3,affinity:0,seen:[],unlocked:true};
  current.yanAftermath={id:'ending',text:'山路相逢'};
 }else{
  current.yanTingyun={rescues:stage==='first'?0:2,affinity:0,seen:[]};
  current.yanEncounterPending={id:'meeting',step:stage==='first'?1:3,highCharm:true};
 }
 await writeSave(current);const actions=createActions({getSave:()=>current,setSave:s=>current=s});
 await actions.select(current.slot);assert.equal(current.player.realm,'炼气十层');assert.equal(current.bossLine.phase,'ambush');
 await assert.rejects(actions.resolveBossAmbush(),/请先回应燕停云/);
 if(stage!=='aftermath')await actions.respondToYan('meeting',stage==='first'?'continue':'together');
 if(current.yanAftermath)await actions.acknowledgeYan(current.yanAftermath.id);
 await actions.resolveBossAmbush();await actions.acknowledgeBossRescue();
 assert.equal(current.bossLine.phase,'wounded');assert.equal(current.bossLine.rescuePending,false);
});
