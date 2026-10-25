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
 s.player.realm='金丹一层';assert.equal(awakenGoldenCoreTechnique(s),true);assert.equal(awakenGoldenCoreTechnique(s),false);assert.equal(s.techniques.mastered.length,0);assert.deepEqual(s.techniques.awakenedManuals,['same-destination']);assert.equal(techniqueEligible(s.player,TECHNIQUES['same-destination']),true);
 s.player.spiritRoot='雷灵根';assert.equal(techniqueEligible(s.player,TECHNIQUES['same-destination']),false);
});
test('each strike applies its own defense and minimum; crit precedes defense',()=>{assert.deepEqual(convergingDamage(10,4),[8,6]);assert.deepEqual(convergingDamage(10,4,true),[14,10]);assert.deepEqual(convergingDamage(1,100),[1,1])});
test('combat spends four MP and one turn, blocks cooling and unavailable skill',async t=>{
 const {playRound}=await import('../systems/combat.js');t.mock.method(Math,'random',()=>.99);
 const s={player:{realm:'金丹一层',spiritRoot:'金木双灵根',hp:100,mp:20,combat:{hp:100,mp:20,attack:10,defense:0,speed:10,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:['same-destination'],combat:['same-destination']},battle:{id:'trial',name:'试炼',hp:100,maxHp:100,attack:1,defense:4,speed:0,round:0,log:[],skillReady:{}}};
 const r=playRound(s,'same-destination');assert.equal(r.dealt,14);assert.equal(s.player.mp,16);assert.equal(s.battle.round,1);assert.throws(()=>playRound(s,'same-destination'),/冷却/);
 for(let i=0;i<5;i++)playRound(s,'skip');assert.doesNotThrow(()=>playRound(s,'same-destination'));
});
test('golden breakthrough preserves foundation stats, grants exact rewards once, then learns via middle puzzle',async()=>{
 const {startBreakthrough,rotateMeridian,GOLDEN_ROUTE,chooseFoundationAptitude}=await import('../systems/breakthrough.js');
 const {equipmentStats}=await import('../systems/inventory.js');const {migrateSave}=await import('../storage/migrations.js');
 const {startLearning,completeLearning}=await import('../systems/techniques.js');
 for(const root of ['雷灵根','金木双灵根','金木水三灵根','金木水火土五灵根']){
 let s=migrateSave({slot:'gold',player:{realm:'筑基十层',spiritRoot:root,cultivation:4000,hp:50,mp:10,stats:{悟性:5},combat:{hp:30,mp:12,attack:8,defense:2,speed:6,critRate:8,dodgeRate:8},foundationBonus:{attack:1.4,defense:.3,mp:1,critRate:1,dodgeRate:1,speed:0}},foundationStory:{phase:'searched',dongxiaClue:true},inventory:[]});
 const before=equipmentStats(s),reward=goldenCoreReward(s.player),p=startBreakthrough(s);assert.equal(p.tiles.length,49);assert.equal(p.remaining,56);
 s=structuredClone(s);for(const i of GOLDEN_ROUTE){while(s.breakthrough&&s.breakthrough.tiles[i].rot!==0)rotateMeridian(s,p.id,i)}
 assert.equal(s.player.realm,'金丹一层');assert.equal(s.goldenAptitudePending,true);const after=equipmentStats(s);
 for(const key of ['attack','defense','speed','critRate','dodgeRate'])assert.equal(Math.round((after[key]-before[key])*100)/100,reward[key]);
 assert.equal(after.maxHp-before.maxHp,reward.hp);assert.equal(after.maxMp-before.maxMp,reward.mp);
 s=migrateSave(s);assert.deepEqual(equipmentStats(s),after);chooseFoundationAptitude(s,'悟性');assert.equal(s.player.stats.悟性,6);assert.throws(()=>chooseFoundationAptitude(s,'悟性'));
 if(root.includes('双')||root.includes('三')){assert.ok(!s.techniques.mastered.includes('same-destination'));const puzzle=startLearning(s,'same-destination');assert.equal(puzzle.size,4);puzzle.cells=[...puzzle.solution];completeLearning(s,'same-destination');assert.ok(s.techniques.mastered.includes('same-destination'));migrateSave(s);assert.ok(s.techniques.mastered.includes('same-destination'))}
 assert.throws(()=>rotateMeridian(s,p.id,0));assert.equal(s.dongxiaUnlocked,undefined);
 }
});
test('golden board and reward choice render, ready manual requires study',async t=>{
 const {parseHTML}=await import('linkedom');const {showBreakthrough}=await import('../ui/breakthrough.js');
 const {startBreakthrough,chooseFoundationAptitude}=await import('../systems/breakthrough.js');
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><div id="xg-panel"></div></body></html>').document;t.after(()=>globalThis.document=old);
 const s={player:{realm:'筑基十层',cultivation:4000,stats:{悟性:5},spiritRoot:'金木双灵根'},foundationStory:{phase:'searched'},techniques:{mastered:[],combat:[]}};startBreakthrough(s);
 const api={getSave:()=>s,actions:{chooseFoundationAptitude:async key=>({result:chooseFoundationAptitude(s,key)})}};
 showBreakthrough(api,()=>{});assert.equal(document.querySelectorAll('[data-tile]').length,49);assert.match(document.querySelector('.xg-breakthrough-grid').getAttribute('style'),/repeat\(7/);
 s.player.realm='金丹一层';s.breakthrough=null;s.goldenAptitudePending=true;awakenGoldenCoreTechnique(s);showBreakthrough(api,()=>{});assert.equal(document.querySelectorAll('[data-aptitude]').length,5);assert.match(document.body.textContent,/中级典籍/);await document.querySelector('[data-aptitude="悟性"]').onclick();assert.equal(s.player.stats.悟性,6);assert.match(document.body.textContent,/金丹已成/);
});
