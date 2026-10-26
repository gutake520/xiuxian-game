import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {TECHNIQUES,techniqueEligible,ELEMENTAL_TECHNIQUES} from '../data/techniques.js';
import {migrateSave} from '../storage/migrations.js';
import {settleRecovery} from '../systems/recovery.js';
import {settleIdle,beginPracticeSession,practiceReward,localDay} from '../systems/cultivation.js';
import {addCultivation} from '../data/realms.js';
import {beginBattle,playRound,fleeBattle,useBattleTalisman,useBattleArray} from '../systems/combat.js';
import {equipmentStats} from '../systems/inventory.js';
import {craftSectItem} from '../systems/sect-progression.js';
import {strollPlaces} from '../systems/stroll.js';
import {startFoundationExploration} from '../systems/exploration.js';
import {createMapUI} from '../ui/map.js';
const make=()=>({slot:'transition',bagCapacity:30,player:{realm:'金丹一层',spiritRoot:'金木双灵根',sect:'太虚符宗',stats:{神识:10,悟性:10},cultivation:-150,spiritStones:100,hp:40,mp:10,combat:{hp:70,mp:20,attack:10,defense:2,speed:20,critRate:0,dodgeRate:0},goldenCoreHpBonus:0,goldenCoreBonus:{attack:0,defense:0,speed:0,mp:0,critRate:0,dodgeRate:0}},techniques:{mastered:['basic-qi-guide','fairy-painting',...ELEMENTAL_TECHNIQUES],main:'basic-qi-guide',combat:ELEMENTAL_TECHNIQUES.slice(0,4)},inventory:[],equipment:{}});
test('golden five elements remain eligible and equipped after migration',()=>{
 const s=migrateSave(make());for(const id of ELEMENTAL_TECHNIQUES)assert.ok(techniqueEligible(s.player,TECHNIQUES[id]));assert.equal(s.techniques.combat.length,4);
});
test('golden recovery works offline but not in battle and obeys caps',()=>{
 const s=make(),now=Date.now();s.recovery={hpAt:now-300000,mpAt:now-300000};settleRecovery(s,now);assert.equal(s.player.hp,50);assert.equal(s.player.mp,15);s.battle={};settleRecovery(s,now+300000);assert.equal(s.player.hp,50);delete s.battle;settleRecovery(s,now+330000);assert.equal(s.player.hp,51);
});
test('golden idle and active practice repay debt without changing realm or stats',()=>{
 const s=make(),now=new Date(2026,9,26,12).getTime(),before={...s.player.combat};s.idle={lastAt:now-3600000,day:localDay(now),usedMs:0};assert.equal(settleIdle(s,now),150);assert.equal(s.player.cultivation,0);beginPracticeSession(s,now);assert.equal(s.player.spiritStones,95);assert.equal(addCultivation(s,practiceReward(30,s.player)),100);assert.equal(s.player.realm,'金丹一层');assert.deepEqual(s.player.combat,before);
});
test('golden map retains foundation locations, foes, stroll and secret',t=>{
 const s=make(),old=globalThis.document;globalThis.document=parseHTML('<main id="xg-content"></main>').document;t.after(()=>globalThis.document=old);
 createMapUI({getSave:()=>s,actions:{},activate:()=>{}}).render();document.querySelector('[data-map="yunze"]').click();document.querySelector('[data-map="foundation"]').click();document.querySelector('[data-foundation="rock-hollow"]').click();assert.ok(document.querySelector('[data-foundation-foe]'));assert.ok(strollPlaces(s).some(x=>x.foundation));startFoundationExploration(s);assert.equal(s.qiSecret.tier,'foundation');
});
test('golden can craft and use foundation talismans and arrays against old foes',()=>{
 const s=make();s.player.cultivation=0;s.inventory=[{uid:'h',itemId:'foundation-healing-herb',quantity:1},{uid:'o',itemId:'foundation-ore',quantity:1},{uid:'a',itemId:'foundation-binding-array',quantity:1}];craftSectItem(s,'foundation-attack-talisman','foundation-healing-herb');beginBattle(s,'rock-ape');useBattleTalisman(s,'foundation-attack-talisman');useBattleArray(s,'a');assert.equal(s.battle.bindRounds.length,1);
});
test('golden penalties keep foundation standard and duster does not downgrade',t=>{
 t.mock.method(Math,'random',()=>.99);const s=make();s.inventory=[{uid:'w',itemId:'library-duster',durability:20}];s.equipment.weapon='w';assert.equal(equipmentStats(s).attack,13);s.player.cultivation=0;beginBattle(s,'rock-ape');fleeBattle(s);assert.equal(s.player.spiritStones,95);s.player.spiritStones=0;beginBattle(s,'rock-ape');fleeBattle(s);assert.equal(s.player.cultivation,-50);beginBattle(s,'rock-ape');s.player.hp=1;playRound(s,'skip');assert.equal(s.player.cultivation,-120);assert.equal(s.player.hp,7);
});
