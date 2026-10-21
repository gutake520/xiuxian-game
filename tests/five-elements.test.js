import test from 'node:test';
import assert from 'node:assert/strict';
import {ELEMENTAL_TECHNIQUES,TECHNIQUES} from '../data/techniques.js';
import {ELEMENTAL_MANUALS,ITEMS,SHOP_ITEMS} from '../data/items.js';
import {beginBattle,playRound,fleeBattle} from '../systems/combat.js';
import {purchase} from '../systems/inventory.js';
import {startLearning,completeLearning,toggleCombatTechnique} from '../systems/techniques.js';
import {elementalBonus,elementalStatus} from '../systems/five-elements.js';
function make(speed=20){return {player:{realm:'筑基一层',sect:'镇岳宗',spiritRoot:'土灵根',stats:{根骨:8},cultivation:0,spiritStones:200,hp:200,mp:20,combat:{hp:200,mp:20,attack:10,defense:1,speed,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[...ELEMENTAL_TECHNIQUES],combat:[...ELEMENTAL_TECHNIQUES],puzzles:{}},bagCapacity:20}}
function fight(speed=20){const s=make(speed);beginBattle(s,'rock-ape');s.battle.hp=200;s.battle.maxHp=200;s.battle.mp=0;s.battle.attack=10;return s}
function steady(t){t.mock.method(Math,'random',()=>.99)}
test('five middle manuals cost 35/29 and learn with the existing four-tier puzzle',()=>{
 for(const id of ELEMENTAL_MANUALS){
  assert.ok(SHOP_ITEMS.includes(id));const method=ITEMS[id].methodId;
  for(const sect of [false,true]){
   const s=make();s.techniques.mastered=[];s.techniques.combat=[];
   purchase(s,id,sect);assert.equal(s.player.spiritStones,200-(sect?29:35));
   const puzzle=startLearning(s,method);assert.equal(puzzle.size,4);assert.equal(TECHNIQUES[method].rank,'中级');
   puzzle.cells=[...puzzle.solution];completeLearning(s,method);toggleCombatTechnique(s,method);
   assert.ok(s.techniques.combat.includes(method));assert.equal(s.inventory.length,0);
  }
  const qi=make();qi.player.realm='炼气十层';assert.throws(()=>purchase(qi,id),/境界不足/);
  const outsider=make();outsider.player.sect='无门无派';assert.throws(()=>purchase(outsider,id,true),/宗门弟子/);
 }
});
test('all five casts spend exactly 1.5 MP, no immediate direct attack, and reject insufficient MP',t=>{
 steady(t);
 for(const id of ELEMENTAL_TECHNIQUES){
  const s=fight();const r=playRound(s,id);assert.equal(s.player.mp,18.5);assert.equal(r.dealt,0);
  const low=fight();low.player.mp=1.49;const before=JSON.stringify(low);assert.throws(()=>playRound(low,id),/法力不足/);assert.equal(JSON.stringify(low),before);
 }
});
test('wood releases with third-round normal action and survives reload, without a forced attack',t=>{
 steady(t);let s=fight();playRound(s,'wood-hidden');assert.equal(s.battle.hp,200);
 s=JSON.parse(JSON.stringify(s));assert.equal(playRound(s,'attack').dealt,10);
 assert.match(elementalStatus(s.battle),/本轮追加/);
 assert.equal(playRound(s,'attack').dealt,24);assert.equal(s.battle.hp,166);
 assert.equal(playRound(s,'attack').dealt,10);
 const skip=fight();playRound(skip,'wood-hidden');playRound(skip,'skip');assert.equal(playRound(skip,'skip').dealt,14);
});
test('wood settles before a slower lethal counterattack and can win with its extra hit',t=>{
 steady(t);const s=fight();playRound(s,'wood-hidden');playRound(s,'skip');s.player.hp=1;s.battle.hp=20;
 const result=playRound(s,'attack');assert.equal(s.lastBattle.outcome,'victory');assert.equal(result.taken,0);
});
test('wood third-round extra hit coexists with casting another skill',t=>{
 steady(t);const s=fight();playRound(s,'wood-hidden');playRound(s,'skip');
 assert.equal(playRound(s,'metal-edge').dealt,15.68);assert.equal(s.player.mp,17);
});
test('mist fixes the following two calendar rounds to two damage, strong or weak',t=>{
 steady(t);
 for(const speed of [20,0])for(const attack of [1,20]){
  const s=fight(speed);s.battle.attack=attack;
  assert.equal(playRound(s,'water-mist').taken,Math.max(1,attack-1));
  assert.equal(playRound(s,'skip').taken,2);assert.equal(playRound(s,'skip').taken,2);
  assert.equal(playRound(s,'skip').taken,Math.max(1,attack-1));
 }
 const s=fight();playRound(s,'water-mist');s.battle.bindRounds=[2,3];playRound(s,'skip');playRound(s,'skip');assert.equal(playRound(s,'skip').taken,9);
});
test('mist applies to empowered attacks, keeps immunity, and ignores defense and pet reduction',t=>{
 steady(t);const s=fight();playRound(s,'water-mist');s.battle.mp=4;s.player.combat.defense=100;s.battle.pet='guard';
 assert.equal(playRound(s,'skip').taken,2);s.battle.guard=true;assert.equal(playRound(s,'skip').taken,0);
});
test('burn has three calendar rounds, triggers on actions, and never waits through skips or binds',t=>{
 steady(t);
 const s=fight();playRound(s,'fire-burn');assert.equal(s.battle.hp,197);
 playRound(s,'skip');playRound(s,'skip');assert.equal(s.battle.hp,191);
 playRound(s,'skip');assert.equal(s.battle.hp,191);
 for(const reason of ['bindRounds','skipRounds']){
  const x=fight();x.battle[reason]=[1,2,3];playRound(x,'fire-burn');playRound(x,'skip');playRound(x,'skip');playRound(x,'skip');assert.equal(x.battle.hp,200);
 }
 const x=fight();x.battle.stunnedRound=1;playRound(x,'fire-burn');playRound(x,'skip');playRound(x,'skip');assert.equal(x.battle.hp,194);
});
test('a slower burn caster cannot burn an action already taken; lethal burn cancels enemy damage',t=>{
 steady(t);const slow=fight(0);playRound(slow,'fire-burn');assert.equal(slow.battle.hp,200);
 playRound(slow,'skip');playRound(slow,'skip');playRound(slow,'skip');assert.equal(slow.battle.hp,194);
 const s=fight();s.battle.hp=3;const r=playRound(s,'fire-burn');assert.equal(r.taken,0);assert.equal(s.lastBattle.outcome,'victory');
});
test('metal and earth decay by round, cannot refresh while active, and leave base stats untouched',t=>{
 steady(t);
 const earth=fight();assert.equal(playRound(earth,'earth-rampart').taken,7.8);
 for(const expected of [8,8.2,8.4,9])assert.equal(playRound(earth,'skip').taken,expected);
 const metal=fight();playRound(metal,'metal-edge');
 for(const expected of [11,10.8,10.6,10])assert.equal(playRound(metal,'attack').dealt,expected);
 const s=fight();playRound(s,'metal-edge');assert.throws(()=>playRound(s,'metal-edge'),/效果尚未结束/);assert.equal(elementalBonus(s.battle,'metal-edge'),1);
 assert.equal(s.player.combat.attack,10);assert.equal(s.player.combat.defense,1);
 fleeBattle(s);beginBattle(s,'rock-ape');assert.equal(elementalBonus(s.battle,'metal-edge'),0);assert.equal(elementalStatus(s.battle),'');
});
test('slower earth caster only gains protection after their action and effects survive a save',t=>{
 steady(t);let s=fight(0);assert.equal(playRound(s,'earth-rampart').taken,9);
 s=JSON.parse(JSON.stringify(s));assert.equal(playRound(s,'skip').taken,8);
 assert.match(elementalStatus(s.battle),/防御 \+0.8/);
});

test('wood resolves while paralyzed and respects armor on its independent hit',t=>{
 steady(t);const s=fight();playRound(s,'wood-hidden');playRound(s,'skip');
 Object.assign(s.battle,{kind:'fox-npc',foxParalyzeRound:3,defense:2,dodgeRate:0,critRate:0});
 const r=playRound(s,'attack');assert.equal(r.dealt,12);assert.ok(r.messages.some(m=>m.includes('无法行动')));
});

test('five elements require full five/four round cooldowns even after effects end and reload',t=>{
 steady(t);
 for(const id of ELEMENTAL_TECHNIQUES){
  let s=fight();const cooldown=['metal-edge','earth-rampart'].includes(id)?5:4;
  assert.equal(TECHNIQUES[id].cooldown,cooldown);playRound(s,id);
  s=JSON.parse(JSON.stringify(s));
  for(let n=0;n<cooldown;n++){
   const before=JSON.stringify(s);assert.throws(()=>playRound(s,id),/效果尚未结束|冷却/);assert.equal(JSON.stringify(s),before);
   playRound(s,'skip');
  }
  const mp=s.player.mp;playRound(s,id);assert.equal(s.player.mp,mp-1.5);
 }
});

test('cooldown reset cannot refresh elemental effects that are still present',t=>{
 steady(t);
 for(const id of ELEMENTAL_TECHNIQUES){
  const s=fight();s.techniques.mastered.push('cooldown-reset');s.techniques.combat.push('cooldown-reset');
  playRound(s,id);playRound(s,'cooldown-reset');
  assert.equal(s.battle.skillReady[id],undefined);
  const before=JSON.stringify(s);assert.throws(()=>playRound(s,id),/效果尚未结束/);assert.equal(JSON.stringify(s),before);
 }
});
