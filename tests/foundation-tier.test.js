import test from 'node:test';
import assert from 'node:assert/strict';
import {addCultivation,realmProgress} from '../data/realms.js';
import {beginBattle,playRound,useBattleArray} from '../systems/combat.js';
import {addItem,purchase,sellMaterial,brewPill,usePill} from '../systems/inventory.js';
import {repairOwnEquipment,craftSectItem} from '../systems/sect-progression.js';
import {feedBeast} from '../systems/pets.js';
import {healingService} from '../systems/sect-services.js';
import {practiceReward,practiceEntryFee} from '../systems/cultivation.js';
function save(realm='筑基一层',sect='无门无派'){
 return {player:{realm,sect,spiritRoot:'木灵根',stats:{福缘:0},cultivation:0,spiritStones:100,hp:35,mp:13,combat:{hp:35,mp:13,attack:4.5,defense:1.3,speed:3,critRate:0,dodgeRate:0}},inventory:[],equipment:{weapon:null,armor:null,shoes:null,accessoryVital:null,accessoryFate:null},techniques:{mastered:[],combat:[],main:null},bagCapacity:40};
}
test('foundation cultivation opens and stops at the agreed third tier',()=>{
 const s=save();assert.equal(practiceEntryFee(s.player),5);assert.equal(practiceReward(30,s.player),100);
 assert.equal(addCultivation(s,1200),1200);assert.equal(s.player.realm,'筑基二层');
 addCultivation(s,1500);assert.equal(s.player.realm,'筑基三层');assert.equal(realmProgress(s.player).complete,true);
 assert.equal(addCultivation(s,30),0);
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
  for(const [speed,expectedHp] of [[7,35],[1,35-(2.8-1.3)]]){
   const s=save();s.player.combat.speed=speed;addItem(s,'foundation-wild-sword');s.equipment.weapon=s.inventory[0].uid;
   Math.random=()=>.05;beginBattle(s,'rock-ape');s.battle.hp=100;
   playRound(s,'attack');assert.equal(s.player.hp,expectedHp);
   if(speed===1){assert.equal(s.battle.stunnedRound,undefined)}
  }
 }finally{Math.random=original}
});
