import test from 'node:test';
import {FOUNDATION_MONSTERS} from '../data/locations.js';
import {TECHNIQUES} from '../data/techniques.js';
import assert from 'node:assert/strict';
import {addCultivation,realmProgress} from '../data/realms.js';
import {beginBattle,playRound,useBattleArray,fleeBattle} from '../systems/combat.js';
import {equipmentStats,addItem,purchase,sellMaterial,brewPill,usePill} from '../systems/inventory.js';
import {repairOwnEquipment,craftSectItem} from '../systems/sect-progression.js';
import {feedBeast} from '../systems/pets.js';
import {healingService} from '../systems/sect-services.js';
import {practiceReward,practiceEntryFee} from '../systems/cultivation.js';
function save(realm='筑基一层',sect='无门无派'){
 return {player:{realm,sect,spiritRoot:'木灵根',stats:{福缘:0},cultivation:0,spiritStones:100,hp:35,mp:13,combat:{hp:35,mp:13,attack:4.5,defense:1.3,speed:3,critRate:0,dodgeRate:0}},inventory:[],equipment:{weapon:null,armor:null,shoes:null,accessoryVital:null,accessoryFate:null},techniques:{mastered:[],combat:[],main:null},bagCapacity:40};
}
test('foundation cultivation continues beyond the old third-tier cap',()=>{
 const s=save();assert.equal(practiceEntryFee(s.player),5);assert.equal(practiceReward(30,s.player),100);
 assert.equal(addCultivation(s,1200),1200);assert.equal(s.player.realm,'筑基二层');
 addCultivation(s,1500);assert.equal(s.player.realm,'筑基三层');assert.equal(realmProgress(s.player).complete,false);
 assert.equal(addCultivation(s,30),30);
});
test('foundation items stay separate from qi materials and shops',()=>{
 const s=save('炼气十层');assert.throws(()=>purchase(s,'foundation-sword'),/筑基/);
 s.player.realm='筑基一层';purchase(s,'foundation-sword');assert.equal(s.player.spiritStones,92.5);
 addItem(s,'foundation-ore',20);const ore=s.inventory.find(e=>e.itemId==='foundation-ore');sellMaterial(s,ore.uid,1);assert.equal(s.player.spiritStones,93.7);
 s.player.sect='玄机门';s.player.spiritRoot='冰灵根';s.techniques.mastered=['planting-flags'];addItem(s,'ore',30);
 assert.throws(()=>craftSectItem(s,'foundation-crafted-array'),/材料不足/);
 addItem(s,'foundation-ore');craftSectItem(s,'foundation-crafted-array');assert.equal(s.inventory.find(e=>e.itemId==='foundation-crafted-array').usesLeft,6);
});
test('qi array cannot bind foundation enemies, foundation array works in the same fight',()=>{
 const s=save();addItem(s,'binding-array');addItem(s,'foundation-binding-array');beginBattle(s,'rock-ape');
 assert.throws(()=>useBattleArray(s,s.inventory.find(e=>e.itemId==='binding-array').uid),/困不住/);
 assert.equal(s.inventory.find(e=>e.itemId==='binding-array').quantity,1);
 useBattleArray(s,s.inventory.find(e=>e.itemId==='foundation-binding-array').uid);
 assert.deepEqual(s.battle.bindRounds,[2]);
});
test('foundation pet feeding and repairs use their own tier of herbs and ore',()=>{
 const s=save('筑基一层','万灵山');s.techniques.mastered=['beast-keeper'];addItem(s,'healing-herb',3);
 assert.throws(()=>feedBeast(s,'attack','healing-herb'),/筑基期灵草/);
 addItem(s,'foundation-healing-herb',3);feedBeast(s,'attack','foundation-healing-herb');
 assert.equal(s.spiritBeasts.attack.stage,'筑基');
 s.player.sect='天工阁';s.player.spiritRoot='金灵根';s.techniques.mastered=['mending'];addItem(s,'foundation-wild-robe');
 s.inventory.find(e=>e.itemId==='foundation-wild-robe').durability=19;addItem(s,'ore',4);
 assert.throws(()=>repairOwnEquipment(s,s.inventory.find(e=>e.itemId==='foundation-wild-robe').uid),/玄纹铁/);
 addItem(s,'foundation-ore',4);repairOwnEquipment(s,s.inventory.find(e=>e.itemId==='foundation-wild-robe').uid);
 assert.equal(s.inventory.find(e=>e.itemId==='foundation-wild-robe').durability,20);
 assert.equal(healingService(s.player).amount,18);
});
test('foundation drops feed the crafting and pill loop',()=>{
 const s=save();const original=Math.random;
 try{Math.random=()=>.99;beginBattle(s,'claw-wolf');s.battle.hp=1;playRound(s,'attack')}finally{Math.random=original}
 assert.ok(s.inventory.some(e=>e.itemId==='foundation-healing-herb'||e.itemId==='foundation-spirit-herb'||e.itemId==='foundation-qi-herb'));
 assert.ok(!s.inventory.some(e=>['healing-herb','spirit-herb','qi-herb'].includes(e.itemId)));
 s.player.sect='丹霞谷';s.techniques.mastered=['divine-pharmacopoeia'];addItem(s,'foundation-healing-herb',5);
 brewPill(s,'foundation-heal-pill');s.player.hp=10;usePill(s,s.inventory.find(e=>e.itemId==='foundation-heal-pill').uid);
 assert.equal(s.player.hp,28);
});
test('drop sword stun only cancels an enemy action that has not happened yet',()=>{
 const original=Math.random;
 try{
  for(const [speed,expectedHp] of [[7,35],[1,30.91]]){
   const s=save();s.player.combat.speed=speed;addItem(s,'foundation-wild-sword');s.equipment.weapon=s.inventory[0].uid;
   Math.random=()=>.05;beginBattle(s,'rock-ape');s.battle.hp=100;
   playRound(s,'attack');assert.equal(s.player.hp,expectedHp);
   if(speed===1){assert.equal(s.battle.stunnedRound,undefined)}
  }
 }finally{Math.random=original}
});

test('combat penalties follow player realm even against old qi monsters',t=>{
 t.mock.method(Math,'random',()=>.5);
 for(const [realm,fee,loss,hp] of [['炼气一层',3,50,5],['筑基一层',5,70,7]]){
  const s=save(realm);s.player.hp=1;s.player.combat.defense=0;s.player.combat.attack=1;
  beginBattle(s,'tough');playRound(s,'attack');assert.equal(s.lastBattle.outcome,'defeat');assert.equal(s.player.cultivation,-loss);assert.equal(s.player.hp,hp);
  for(const balance of [fee,fee-.5]){
   const f=save(realm);f.player.spiritStones=balance;beginBattle(f,'tough');fleeBattle(f);
   assert.equal(f.player.spiritStones,balance>=fee?0:balance);
   assert.equal(f.player.cultivation,balance>=fee?0:realm.startsWith('筑基')?-50:-30);
  }
 }
});


test('all foundation ordinary enemies cast strengthen with four mana and player cooldown',t=>{
 t.mock.method(Math,'random',()=>.99);
 const enemies=FOUNDATION_MONSTERS.filter(m=>!m.boss);
 assert.equal(enemies.length,9);
 for(const monster of enemies){
  const s=save('筑基九层');s.player.hp=1000;s.player.combat.hp=1000;
  beginBattle(s,monster.id);assert.equal(s.battle.mp,4);
  for(let round=1;round<=13;round++){
   const result=playRound(s,'skip');
   const casts=[1,4,7,10].includes(round);
   assert.equal(result.messages.some(m=>m===`${monster.name}使出强化普通。`),casts,`${monster.id} round ${round}`);
   const raw=Math.round(monster.attack*(casts?1.1:1)*100)/100;
   assert.equal(result.taken,Math.round((raw-equipmentStats(s).defense)*100)/100);
   if(casts)assert.equal(s.battle.enemySkillReady,round+TECHNIQUES['strengthen-attack'].cooldown+1);
  }
  assert.equal(s.battle.mp,0);
 }
});

test('bound and silenced foundation enemies do not spend skill mana',t=>{
 t.mock.method(Math,'random',()=>.99);
 const s=save();beginBattle(s,'rock-ape');
 s.battle.bindRounds=[1];playRound(s,'skip');assert.equal(s.battle.mp,4);
 s.battle.silencedTurns=1;playRound(s,'skip');assert.equal(s.battle.mp,4);
 playRound(s,'skip');assert.equal(s.battle.mp,3);
});
