import test from 'node:test';
import assert from 'node:assert/strict';
import {goldenCoreReward,awakenGoldenCoreTechnique,convergingDamage} from '../systems/golden-core.js';
import {TECHNIQUES,techniqueEligible} from '../data/techniques.js';
test('golden rewards match all three root groups',()=>{
 for(const [root,hp,mp,attack,defense,critRate] of [['雷灵根',20,4,4,2,3],['金木双灵根',16,3,3.4,1.6,2],['金木水三灵根',16,3,3.4,1.6,2],['金木水火四灵根',12,3,2.8,1.2,1],['金木水火土五灵根',12,3,2.8,1.2,1]])assert.deepEqual(goldenCoreReward({spiritRoot:root}),{hp,mp,attack,defense,critRate,speed:5,dodgeRate:2});
});
test('awakening only at golden core for dual/triple roots, never duplicates',()=>{
 const s={player:{realm:'筑基十层',spiritRoot:'金木双灵根'}};
 assert.equal(awakenGoldenCoreTechnique(s),false);assert.equal(techniqueEligible(s.player,TECHNIQUES['same-destination']),false);
 s.player.realm='金丹一层';assert.equal(awakenGoldenCoreTechnique(s),true);assert.equal(awakenGoldenCoreTechnique(s),false);assert.equal(s.techniques.mastered.length,1);assert.equal(techniqueEligible(s.player,TECHNIQUES['same-destination']),true);
 s.player.spiritRoot='雷灵根';assert.equal(techniqueEligible(s.player,TECHNIQUES['same-destination']),false);
});
test('each strike applies its own defense and minimum; crit precedes defense',()=>{assert.deepEqual(convergingDamage(10,4),[8,6]);assert.deepEqual(convergingDamage(10,4,true),[14,10]);assert.deepEqual(convergingDamage(1,100),[1,1])});
test('combat spends four MP and one turn, blocks cooling and unavailable skill',async t=>{
 const {playRound}=await import('../systems/combat.js');t.mock.method(Math,'random',()=>.99);
 const s={player:{realm:'金丹一层',spiritRoot:'金木双灵根',hp:100,mp:20,combat:{hp:100,mp:20,attack:10,defense:0,speed:10,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:['same-destination'],combat:['same-destination']},battle:{id:'trial',name:'试炼',hp:100,maxHp:100,attack:1,defense:4,speed:0,round:0,log:[],skillReady:{}}};
 const r=playRound(s,'same-destination');assert.equal(r.dealt,14);assert.equal(s.player.mp,16);assert.equal(s.battle.round,1);assert.throws(()=>playRound(s,'same-destination'),/冷却/);
 for(let i=0;i<5;i++)playRound(s,'skip');assert.doesNotThrow(()=>playRound(s,'same-destination'));
});
