import test from 'node:test';
import assert from 'node:assert/strict';
import {beginBattle,playRound,useBattleTalisman} from '../systems/combat.js';
import {resolveHerbalist} from '../systems/encounters.js';
import {flipDivination} from '../systems/divination.js';
import {addItem} from '../systems/inventory.js';
import {startLearning,completeLearning,toggleCombatTechnique} from '../systems/techniques.js';

function save(root='金灵根',sect='无门无派',fortune=0){return {player:{realm:'炼气七层',sect,spiritRoot:root,stats:{福缘:fortune},cultivation:0,spiritStones:20,hp:30,mp:11,combat:{hp:30,mp:11,attack:3,defense:10,speed:5,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[],puzzles:{}},bagCapacity:20}}
function fixed(value,action){const before=Math.random;try{Math.random=()=>value;return action()}finally{Math.random=before}}
function win(s,id='tough'){beginBattle(s,id);s.battle.hp=1;playRound(s,'attack');return s.encounterPending}

test('fortune chance has a two percent floor and increases per fortune point',()=>{
 const low=save(),high=save('金灵根','无门无派',2);
 fixed(.03,()=>{assert.equal(win(low),undefined);assert.ok(win(high))});
});
test('three separate gifts assemble a learnable middle manual exactly once',()=>{
 const s=save();addItem(s,'healing-herb',3);
 for(let i=1;i<=3;i++){
  fixed(0,()=>win(s));if(s.divinationPending)fixed(0,()=>flipDivination(s,s.divinationPending.id));const pending=JSON.parse(JSON.stringify(s)).encounterPending;
  const before=s.inventory.find(entry=>entry.itemId==='healing-herb')?.quantity||0;
  resolveHerbalist(s,pending.id,true);assert.equal(s.herbalistFragments,i);
  assert.equal(s.inventory.find(entry=>entry.itemId==='healing-herb')?.quantity||0,before-1);
  assert.throws(()=>resolveHerbalist(s,pending.id,true),/结束/);
 }
 assert.equal(s.inventory.find(entry=>entry.itemId==='spirit-burn-manual').quantity,1);
 const puzzle=startLearning(s,'spirit-burn');assert.equal(puzzle.size,4);puzzle.cells=[...puzzle.solution];completeLearning(s,'spirit-burn');
 toggleCombatTechnique(s,'spirit-burn');assert.ok(s.techniques.combat.includes('spirit-burn'));
 fixed(0,()=>win(s));assert.equal(s.encounterPending,null);
});
test('refusal does not spend herb; a follow-up fight rolls only on final victory',()=>{
 const s=save();addItem(s,'healing-herb');
 fixed(0,()=>{beginBattle(s,'tough-human');s.battle.hp=1;playRound(s,'attack')});
 assert.equal(s.encounterPending,undefined);assert.equal(s.battle.retaliation,true);
 const continued=JSON.parse(JSON.stringify(s));continued.battle.hp=1;
 fixed(0,()=>playRound(continued,'attack'));assert.ok(continued.encounterPending);
 const uid=continued.encounterPending.id,herbs=continued.inventory.find(entry=>entry.itemId==='healing-herb').quantity;resolveHerbalist(continued,uid,false);
 assert.equal(continued.inventory.find(entry=>entry.itemId==='healing-herb').quantity,herbs);
 assert.equal(continued.herbalistFragments,undefined);
});
test('final manual waits for a free bag slot without consuming the last gift',()=>{
 const s=save();s.bagCapacity=1;s.herbalistFragments=2;addItem(s,'healing-herb',2);s.encounterPending={id:'waiting',battleId:'fight'};
 assert.throws(()=>resolveHerbalist(s,'waiting',true),/储物格/);
 assert.equal(s.herbalistFragments,2);assert.equal(s.inventory[0].quantity,2);
 s.bagCapacity=2;resolveHerbalist(s,'waiting',true);
 assert.equal(s.herbalistFragments,3);assert.equal(s.inventory.find(entry=>entry.itemId==='spirit-burn-manual').quantity,1);
});
test('mana burst spends all current MP, never crits, and scales by root count',()=>{
 for(const [root,expected] of [['金灵根',9.9],['金水双灵根',8.8],['金木水火土五灵根',7.7]]){
  const s=save(root);s.techniques.mastered=['spirit-burn'];s.techniques.combat=['spirit-burn'];s.player.combat.critRate=100;
  beginBattle(s,'tough');s.battle.hp=100;
  assert.equal(playRound(s,'spirit-burn').dealt,expected);assert.equal(s.player.mp,0);
  assert.throws(()=>playRound(s,'spirit-burn'),/法力不足/);
 }
});
test('sword passive boosts personal attacks and fixed techniques, not talismans',()=>{
 const s=save('金灵根','凌霄剑宗');s.techniques.mastered=['one-sword','sting'];s.techniques.combat=['one-sword','sting'];
 addItem(s,'attack-talisman');beginBattle(s,'tough');s.battle.hp=100;
 fixed(.9,()=>{assert.equal(playRound(s,'attack').dealt,3.3);assert.equal(playRound(s,'sting').dealt,2.2)});
 const before=s.battle.hp;useBattleTalisman(s,'attack-talisman');assert.equal(s.battle.hp,Number((before-2).toFixed(2)));
 fixed(.9,()=>{const tick=playRound(s,'skip');assert.ok(tick.messages.some(line=>line.includes('2.20 生命')))})
});
