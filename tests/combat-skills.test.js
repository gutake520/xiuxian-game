import test from 'node:test';
import assert from 'node:assert/strict';
import {beginBattle,playRound} from '../systems/combat.js';
import {equipmentStats} from '../systems/inventory.js';
import {applyRealmHp} from '../data/realms.js';
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
