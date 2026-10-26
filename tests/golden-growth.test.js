import test from 'node:test';
import assert from 'node:assert/strict';
import {goldenGrowth,addCultivation} from '../data/realms.js';
import {migrateSave} from '../storage/migrations.js';
import {GOLDEN_MONSTERS} from '../data/locations.js';
import {beginBattle,playRound} from '../systems/combat.js';
import {equipmentStats} from '../systems/inventory.js';
const make=realm=>({player:{realm,spiritRoot:'金木双灵根',cultivation:0,spiritStones:100,hp:73,mp:20,combat:{hp:73,mp:20,attack:11.1,defense:3.52,speed:10.7,critRate:10,dodgeRate:10},goldenCoreHpBonus:0,goldenCoreBonus:{}},inventory:[{uid:'s',itemId:'golden-sword',durability:20}],equipment:{weapon:'s'},techniques:{mastered:['strengthen-attack'],combat:['strengthen-attack']},dongxiaUnlocked:true,bagCapacity:20});
test('golden growth totals and fractional HP migrate exactly once',()=>{
 const s=make('金丹十层');assert.deepEqual(goldenGrowth(s.player),{hp:31.5,attack:4.5,defense:1.44,speed:2.7,mp:4,critRate:3,dodgeRate:3});migrateSave(s);const hp=s.player.hp,mp=s.player.mp;migrateSave(s);assert.equal(s.player.hp,hp);assert.equal(s.player.mp,mp);
 for(const [root,hp,attack,defense] of [['风灵根',36,5.4,1.8],['金木水火土五灵根',27,3.6,1.08]]){s.player.spiritRoot=root;const g=goldenGrowth(s.player);assert.equal(g.hp,hp);assert.equal(g.attack,attack);assert.equal(g.defense,defense)}
 const a=make('金丹一层');migrateSave(a);a.player.hp=20;addCultivation(a,11000);assert.equal(a.player.realm,'金丹三层');assert.equal(a.player.hp,27);assert.equal(a.player.mp,21);
});
test('mid and late gates and two consecutive fights match growth with golden sword and basic skill',t=>{
 t.mock.method(Math,'random',()=>.99);
 for(const m of GOLDEN_MONSTERS.slice(3)){
  assert.throws(()=>beginBattle(make('金丹一层'),m.id),/层/);
  const s=make(m.minLevel===4?'金丹四层':'金丹七层');s.player.hp=equipmentStats(s).maxHp;
  for(let j=0;j<2;j++){beginBattle(s,m.id);let turns=0;while(s.battle&&turns++<40){const ready=(s.battle.skillReady['strengthen-attack']||0)<=s.battle.round+1;playRound(s,ready&&s.player.mp>=1?'strengthen-attack':'attack')}assert.equal(s.lastBattle.outcome,'victory');assert.equal(s.lastBattle.xp,m.xp)}
  assert.ok(s.player.hp>0&&s.player.hp<equipmentStats(s).maxHp*.3);
 }
});
