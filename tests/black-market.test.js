import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBlackMarket} from '../systems/black-market.js';
import {addItem,sellExtra,discardJunk,purchase} from '../systems/inventory.js';
import {startLearning,completeLearning,toggleCombatTechnique} from '../systems/techniques.js';
import {combatSlots,chargedMultiplier} from '../data/technique-slots.js';
import {beginBattle,playRound} from '../systems/combat.js';
import {migrateSave} from '../storage/migrations.js';
function save(){return migrateSave({player:{name:'测试',realm:'炼气四层',sect:'无门无派',spiritRoot:'金水双灵根',cultivation:0,spiritStones:100,hp:23,mp:20,combat:{hp:20,mp:20,attack:3,defense:3,speed:5,critRate:0,dodgeRate:0}},inventory:[],techniques:{mastered:[],combat:[],puzzles:{}},bagCapacity:20,realmHpBonusApplied:3})}
function random(value,fn){const old=Math.random;try{Math.random=()=>value;return fn()}finally{Math.random=old}}
test('test-rate ten draws grant manuals, reset pity and replay does not charge',()=>{
 let s=save();s.blackMarket={pity:65};
 random(.4,()=>drawBlackMarket(s,10,'ten'));
 assert.equal(s.player.spiritStones,82);assert.equal(s.blackMarket.pity,0);assert.equal(s.inventory.find(e=>e.itemId==='one-manual').quantity,10);assert.equal(s.blackMarket.lastDraw.manuals.length,10);
 s=JSON.parse(JSON.stringify(s));drawBlackMarket(s,10,'ten');assert.equal(s.player.spiritStones,82);
 random(.1,()=>drawBlackMarket(s,1,'next'));assert.equal(s.blackMarket.pity,0);assert.equal(s.player.spiritStones,80);
});
test('test-rate single draw grants a manual, repeated copies stack, and full bags use temporary storage',()=>{
 for(const roll of [0,.305,.505,.555,.7775]){const s=save();random(roll,()=>drawBlackMarket(s,1,'a'));assert.ok(['one-manual','reset-manual'].includes(s.inventory[0].itemId))}
 const s=save();s.techniques.mastered.push('only-one');random(0,()=>{drawBlackMarket(s,1,'a');drawBlackMarket(s,1,'b')});
 assert.equal(s.inventory[0].quantity,2);sellExtra(s,s.inventory[0].uid);assert.equal(s.player.spiritStones,116);
 s.bagCapacity=0;random(.6,()=>drawBlackMarket(s,1,'c',1000));assert.equal(s.temporaryLoot[0].expiresAt,1801000);
});
test('gift trades and junk disposal; learning consumes one copy of a black-market manual',()=>{
 const s=save();purchase(s,'calming-jade');assert.equal(s.player.spiritStones,95);sellExtra(s,s.inventory[0].uid);assert.equal(s.player.spiritStones,99);
 addItem(s,'broken-jade-slip');assert.throws(()=>sellExtra(s,s.inventory[0].uid));discardJunk(s,s.inventory[0].uid);assert.equal(s.inventory.length,0);
 addItem(s,'reset-manual',2);const p=startLearning(s,'cooldown-reset');p.cells=[...p.solution];completeLearning(s,'cooldown-reset');assert.equal(s.inventory[0].quantity,1);
 assert.throws(()=>purchase(s,'one-manual'),/只能从黑市/);
});
test('slot counts and multipliers follow roots; migration preserves four equipped techniques',()=>{
 for(const [root,slots,mult] of [['风灵根',3,1.3],['金水双灵根',4,1.2],['金木水火土五灵根',5,1.1]]){
  const p={spiritRoot:root,realm:'筑基一层'};assert.equal(combatSlots(p),slots);assert.equal(chargedMultiplier(p),mult);p.realm='金丹一层';assert.equal(combatSlots(p),slots+1);
 }
 const s=save();s.techniques.mastered=['strengthen-attack','iron-wall','gamble-strike','empty-hands','only-one'];
 for(const id of s.techniques.mastered.slice(0,4))toggleCombatTechnique(s,id);
 assert.throws(()=>toggleCombatTechnique(s,'only-one'));assert.equal(migrateSave(s).techniques.combat.length,4);
});
test('reset uses an action and five MP, clears cooldowns, keeps per-battle limits after reload',()=>{
 let s=save();s.techniques.mastered=['cooldown-reset','only-once','charged-strike'];s.techniques.combat=[...s.techniques.mastered];beginBattle(s,'tough');s.battle.hp=100;
 playRound(s,'only-once');random(.9,()=>playRound(s,'charged-strike'));const result=playRound(s,'cooldown-reset');
 assert.equal(result.dealt,0);assert.equal(s.player.mp,12);assert.equal(s.battle.skillReady['charged-strike'],undefined);
 s=JSON.parse(JSON.stringify(s));assert.throws(()=>playRound(s,'cooldown-reset'));assert.throws(()=>playRound(s,'only-once'));
 assert.equal(random(.9,()=>playRound(s,'charged-strike')).dealt,3.6);
});
