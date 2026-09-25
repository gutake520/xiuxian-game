import test from 'node:test';
import assert from 'node:assert/strict';
import {beginBattle,playRound,useBattleTalisman} from '../systems/combat.js';
import {equipmentStats,sellExtra,addItem} from '../systems/inventory.js';
import {applyRealmHp} from '../data/realms.js';
import {QI_MONSTERS} from '../data/locations.js';
import {purchase} from '../systems/inventory.js';
import {startUpgrade,completeLearning,toggleCombatTechnique} from '../systems/techniques.js';
function make(speed=5){return {player:{realm:'炼气四层',sect:'镇岳宗',spiritRoot:'土灵根',stats:{根骨:8},cultivation:0,spiritStones:0,hp:20,mp:10,combat:{hp:30,mp:10,attack:3,defense:3,speed,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:['only-one','empty-hands','resentment'],combat:['only-one','empty-hands','resentment']},bagCapacity:20,realmHpBonusApplied:3}}
function battle(s,id='fierce'){beginBattle(s,id);s.battle.hp=100;s.battle.attack=5;return s}
test('first strike caps damage while reflection uses pre-defense damage',()=>{const s=battle(make());const r=playRound(s,'only-one');assert.equal(r.dealt,1);assert.equal(r.taken,1);assert.equal(s.battle.hp,98.5);const t=battle(make(0));assert.equal(playRound(t,'only-one').taken,2);assert.equal(t.battle.hp,98.5)});
test('life theft trigger boundary, remaining health cap, cooldown, and no theft after kill',()=>{
 const original=Math.random;
 try{Math.random=()=>.19;const s=battle(make());s.techniques.combat=['empty-hands'];s.battle.hp=3;playRound(s,'empty-hands');assert.equal(s.lastBattle.outcome,'victory');assert.equal(s.player.hp,21);
 const t=battle(make());t.techniques.combat=['empty-hands'];Math.random=()=>.2;const r=playRound(t,'empty-hands');assert.equal(r.dealt,2);assert.equal(t.player.hp,18);assert.throws(()=>playRound(t,'empty-hands'));
 const u=battle(make());u.techniques.combat=['empty-hands'];u.battle.hp=2;Math.random=()=>.19;playRound(u,'empty-hands');assert.equal(u.player.hp,20);
 }finally{Math.random=original}
});
test('middle-tier attack boost waits three complete rounds and survives reload',()=>{
 let s=make();s.techniques.combat=[];s.player.hp=100;s.player.combat.defense=.5;beginBattle(s,'tough-mid');s.battle.hp=100;
 assert.equal(playRound(s,'skip').taken,1.7);s=JSON.parse(JSON.stringify(s));
 for(let i=0;i<3;i++)assert.equal(playRound(s,'skip').taken,1.5);
 assert.equal(playRound(s,'skip').taken,1.7);
});
test('active techniques spend MP before action; recovery works from zero; monsters boost only twice',()=>{
 const s=battle(make());s.techniques.mastered.push('catch-breath','charged-strike');s.techniques.combat=['catch-breath','charged-strike'];s.player.mp=0;
 assert.throws(()=>playRound(s,'charged-strike'),/法力不足/);assert.equal(s.battle.round,0);
 playRound(s,'catch-breath');assert.equal(s.player.mp,1);
 playRound(s,'charged-strike');assert.equal(s.player.mp,0);
 const t=make();t.techniques.combat=[];t.player.hp=100;t.player.combat.defense=.5;beginBattle(t,'tough-mid');t.battle.hp=100;
 for(let i=0;i<10;i++)playRound(t,'skip');
 assert.equal(t.battle.mp,0);assert.equal(playRound(t,'skip').taken,1.5);
});
test('筑基双三灵根专属功法耗 2 蓝、按 1.7 倍出手并冷却四轮',()=>{
 const s=make();s.player.realm='筑基一层';s.player.spiritRoot='金木双灵根';s.player.combat.critRate=0;s.player.combat.defense=20;
 s.techniques.mastered=['self-as-self'];s.techniques.combat=['self-as-self'];
 const random=Math.random;try{
  Math.random=()=>.99;beginBattle(s,'fierce');s.battle.hp=100;
  assert.equal(playRound(s,'self-as-self').dealt,5.1);
  assert.equal(s.player.mp,8);
  assert.throws(()=>playRound(s,'self-as-self'),/冷却/);
  for(let i=0;i<4;i++)playRound(s,'skip');
  assert.equal(playRound(s,'self-as-self').dealt,5.1);
 }finally{Math.random=random}
 const single=make();single.player.realm='筑基一层';single.techniques.mastered=['self-as-self'];single.techniques.combat=['self-as-self'];beginBattle(single,'fierce');
 assert.throws(()=>playRound(single,'self-as-self'),/尚未装备/);
});
test('我即我在筑基二、三层仍能装备并施放，炼气与单灵根不能使用',()=>{
 for(const realm of ['筑基二层','筑基三层']){
  const s=make();s.player.realm=realm;s.player.spiritRoot='金木双灵根';s.player.combat.defense=20;
  s.techniques.mastered=['self-as-self'];s.techniques.combat=[];
  toggleCombatTechnique(s,'self-as-self');
  const random=Math.random;
  try{Math.random=()=>.99;beginBattle(s,'fierce');s.battle.hp=100;assert.equal(playRound(s,'self-as-self').dealt,5.1)}finally{Math.random=random}
 }
 const qi=make();qi.player.realm='炼气十层';qi.player.spiritRoot='金木双灵根';qi.techniques.mastered=['self-as-self'];
 assert.throws(()=>toggleCombatTechnique(qi,'self-as-self'),/须先学会/);
 const single=make();single.player.realm='筑基二层';single.techniques.mastered=['self-as-self'];
 assert.throws(()=>toggleCombatTechnique(single,'self-as-self'),/须先学会/);
});
test('later qi stages grant root-dependent combat stats and old saves gain one MP',()=>{
 const single=make(),many=make();single.player.spiritRoot='金灵根';many.player.spiritRoot='金木水火土五灵根';
 for(const s of [single,many]){s.player.realm='炼气十层';s.realmMpBonusApplied=0;applyRealmHp(s)}
 assert.equal(single.player.mp,11);assert.equal(equipmentStats(single).attack,5);
 assert.equal(equipmentStats(single).defense,3.4);assert.equal(equipmentStats(single).critRate,1);
 assert.equal(equipmentStats(many).attack,4);assert.equal(equipmentStats(many).defense,3.2);
 applyRealmHp(single);assert.equal(single.player.mp,11);
});
test('once per battle critical focus costs two MP and persists through reload',()=>{
 const s=battle(make());s.techniques.mastered.push('only-once');s.techniques.combat=['only-once'];s.player.combat.critRate=5;
 const first=playRound(s,'only-once');assert.equal(first.dealt,0);assert.equal(s.player.mp,8);
 const resumed=JSON.parse(JSON.stringify(s));assert.equal(resumed.battle.criticalFocus,true);
 assert.throws(()=>playRound(resumed,'only-once'),/已使用过/);assert.equal(resumed.player.mp,8);
 const random=Math.random;try{Math.random=()=>.1;const hit=playRound(resumed,'attack');assert.equal(hit.dealt,4.5)}finally{Math.random=random}
});
test('sect exclusive manuals cost 25, mastery requires fifty casts and one paid puzzle',()=>{
 const s=make();s.player.spiritStones=70;s.techniques.mastered.push('only-once');s.techniques.combat=['only-once'];
 assert.throws(()=>purchase(s,'gamble-manual'),/仅在宗门/);
 purchase(s,'gamble-manual',true);assert.equal(s.player.spiritStones,45);
 assert.throws(()=>startUpgrade(s,'only-once'),/50 次/);
 s.techniques.usage={'only-once':49};beginBattle(s,'fierce');s.battle.hp=100;
 playRound(s,'only-once');assert.equal(s.techniques.usage['only-once'],50);
 assert.throws(()=>startUpgrade(s,'only-once'),/战斗中/);
 s.battle=null;const puzzle=startUpgrade(s,'only-once');assert.equal(puzzle.size,4);assert.equal(s.player.spiritStones,25);
 assert.equal(startUpgrade(s,'only-once'),puzzle);assert.equal(s.player.spiritStones,25);
 puzzle.cells=[...puzzle.solution];completeLearning(s,'upgrade:only-once');assert.ok(s.techniques.upgraded.includes('only-once'));
 beginBattle(s,'fierce');s.battle.hp=100;playRound(s,'only-once');assert.equal(s.player.mp,5);
});
test('upgraded theft and gamble use two MP and upgraded combat values',()=>{
 const original=Math.random;
 try{
  Math.random=()=>.1;
  const s=battle(make());s.techniques.upgraded=['empty-hands','gamble-strike'];s.techniques.mastered.push('gamble-strike');
  s.techniques.combat=['empty-hands','gamble-strike'];s.player.hp=10;s.battle.hp=100;
  assert.equal(playRound(s,'empty-hands').dealt,8);assert.equal(s.player.mp,8);assert.equal(s.player.hp,13);
  const t=battle(make());t.techniques.upgraded=['gamble-strike'];t.techniques.mastered.push('gamble-strike');t.techniques.combat=['gamble-strike'];
  assert.equal(playRound(t,'gamble-strike').dealt,4.8);assert.equal(t.player.mp,8);
 }finally{Math.random=original}
});
test('repeated manuals stack, sell at ten stones, and middle manual costs thirty in sect',()=>{
 const s=make();s.player.spiritStones=100;purchase(s,'wait-manual',true);assert.equal(s.player.spiritStones,70);
 purchase(s,'wait-manual');assert.equal(s.player.spiritStones,30);
 const stack=s.inventory.find(entry=>entry.itemId==='wait-manual');assert.equal(stack.quantity,2);
 sellExtra(s,stack.uid);assert.equal(s.player.spiritStones,40);assert.equal(stack.quantity,1);
});
test('delayed sting damage and prepared strike survive save reload',()=>{
 const s=battle(make());s.techniques.mastered.push('sting','wait-then-strike');s.techniques.combat=['sting','wait-then-strike'];s.player.combat.defense=20;
 const sting=playRound(s,'sting');assert.equal(sting.dealt,2);assert.equal(s.battle.stingRound,2);
 let resumed=JSON.parse(JSON.stringify(s));playRound(resumed,'wait-then-strike');assert.equal(resumed.battle.pendingStrike,true);assert.equal(resumed.battle.hp,96);
 resumed=JSON.parse(JSON.stringify(resumed));assert.throws(()=>playRound(resumed,'skip'),/蓄势攻击/);
 const random=Math.random;try{Math.random=()=>.99;const strike=playRound(resumed,'attack');assert.equal(strike.dealt,7.5);assert.equal(resumed.battle.pendingStrike,false)}finally{Math.random=random}
});
test('prepared strike scales with spirit-root count',()=>{
 for(const [root,multiplier] of [['金灵根',2.5],['金木双灵根',2.4],['金木水火土五灵根',2.3]]){
  const s=battle(make());s.player.spiritRoot=root;s.player.combat.defense=20;s.techniques.mastered.push('wait-then-strike');s.techniques.combat=['wait-then-strike'];
  const random=Math.random;try{Math.random=()=>.99;playRound(s,'wait-then-strike');assert.equal(s.player.mp,7);assert.equal(playRound(s,'attack').dealt,Math.round(3*multiplier*100)/100);assert.equal(s.player.mp,7)}finally{Math.random=random}
 }
});
test('human opponents unlock across later qi stages and earlier foes remain available',()=>{
 assert.deepEqual(QI_MONSTERS.map(monster=>monster.minLevel),[1,1,1,4,4,4,7,8,9]);
 const early=make();early.player.realm='炼气三层';assert.throws(()=>beginBattle(early,'tough-mid'),/四层/);
 early.player.realm='炼气四层';beginBattle(early,'tough-mid');
 const s=make();assert.throws(()=>beginBattle(s,'tough-human'),/七层/);
 s.player.realm='炼气七层';beginBattle(s,'tough-human');s.battle=null;assert.throws(()=>beginBattle(s,'fierce-human'),/八层/);
 s.player.realm='炼气八层';beginBattle(s,'fierce-human');s.battle=null;assert.throws(()=>beginBattle(s,'swift-human'),/九层/);
 s.player.realm='炼气九层';beginBattle(s,'swift-human');s.battle=null;beginBattle(s,'tough');assert.equal(s.battle.monsterId,'tough');
});
test('human victory may trigger exactly one saved follow-up fight with one reward each',()=>{
 const s=make(0);s.player.realm='炼气九层';s.player.hp=30;s.player.combat.defense=0;
 const random=Math.random;try{
  Math.random=()=>.2;beginBattle(s,'swift-human');s.battle.hp=1;
  const first=playRound(s,'attack');assert.equal(first.result.outcome,'victory');assert.equal(s.battle.retaliation,true);assert.equal(s.player.cultivation,20);
  const hp=s.player.hp;const resumed=JSON.parse(JSON.stringify(s));assert.equal(resumed.player.hp,hp);
  resumed.battle.hp=1;const second=playRound(resumed,'attack');assert.equal(second.result.outcome,'victory');assert.equal(resumed.battle,null);assert.equal(resumed.player.cultivation,40);
 }finally{Math.random=random}
});
test('attack talisman victory follows the same one-time chase rule',()=>{
 const s=make();s.player.realm='炼气七层';addItem(s,'attack-talisman');
 const random=Math.random;try{Math.random=()=>.1;beginBattle(s,'tough-human');s.battle.hp=2;useBattleTalisman(s,'attack-talisman');assert.equal(s.battle.retaliation,true);assert.equal(s.player.cultivation,20)}finally{Math.random=random}
});
