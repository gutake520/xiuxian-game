import test from 'node:test';
import assert from 'node:assert/strict';
import {maybeFindSpring,springAction} from '../systems/spirit-spring.js';
import {startLearning,completeLearning,toggleCombatTechnique} from '../systems/techniques.js';
import {beginBattle,playRound} from '../systems/combat.js';
import {equipmentStats} from '../systems/inventory.js';
const make=(root='四灵根')=>({player:{realm:'筑基四层',spiritRoot:root,sect:'无门无派',stats:{},hp:60,mp:0,combat:{hp:60,mp:10,attack:10,defense:3,speed:30}},inventory:[],bagCapacity:20,techniques:{mastered:[],combat:[],puzzles:{}},equipment:{}});
test('spring restricts roots, timing bounds, tolerance, claim and intermediate learning',()=>{
 for(const root of ['金灵根','双灵根','三灵根'])assert.equal(maybeFindSpring(make(root),()=>0),false);
 const s=make();assert.equal(maybeFindSpring(s,()=>0),true);const id=s.spiritSpring.id;
 springAction(s,id,'start',null,1000,()=>0);assert.equal(s.spiritSpring.duration,1000);
 assert.throws(()=>springAction(s,id,'finish',null,1999));springAction(s,id,'finish',null,2000);
 assert.throws(()=>springAction(s,id,'guess',''));springAction(s,id,'guess','1.10');assert.equal(s.spiritSpring.phase,'won');
 s.bagCapacity=0;assert.throws(()=>springAction(s,id,'claim'));assert.equal(s.spiritSpring.phase,'won');s.bagCapacity=20;
 springAction(s,id,'claim');assert.equal(maybeFindSpring(s,()=>0),false);
 const p=startLearning(s,'blue-buff');assert.equal(p.size,4);p.cells=[...p.solution];completeLearning(s,'blue-buff');assert.deepEqual(s.techniques.combat,[]);
 toggleCombatTechnique(s,'blue-buff');assert.deepEqual(s.techniques.combat,['blue-buff']);
 const five=make('五灵根');maybeFindSpring(five,()=>0);springAction(five,five.spiritSpring.id,'start',null,0,()=>.99999);assert.equal(five.spiritSpring.duration,5000);springAction(five,five.spiritSpring.id,'finish',null,5000);springAction(five,five.spiritSpring.id,'guess','4.89');assert.equal(five.spiritSpring.phase,'lost');
});
test('blue buff requires equipment, restores on damage and caps at max MP',t=>{
 t.mock.method(Math,'random',()=>.99);
 for(const equipped of [false,true]){const s=make();s.techniques.mastered=['blue-buff'];s.techniques.combat=equipped?['blue-buff']:[];beginBattle(s,'rock-ape');playRound(s,'attack');assert.equal(s.player.mp,equipped?.5:0)}
 const s=make();s.techniques.mastered=['blue-buff'];s.techniques.combat=['blue-buff'];s.player.mp=equipmentStats(s).maxMp-.2;beginBattle(s,'rock-ape');playRound(s,'attack');assert.equal(s.player.mp,equipmentStats(s).maxMp);
 const miss=make();miss.techniques.mastered=['blue-buff'];miss.techniques.combat=['blue-buff'];beginBattle(miss,'rock-ape');miss.battle.kind='wounded-pursuer';miss.battle.dodgeRate=100;playRound(miss,'attack');assert.equal(miss.player.mp,0);
});

test('spring UI hides duration, accepts guess and delivers manual',async()=>{
 const {parseHTML}=await import('linkedom');const {showSpiritSpring}=await import('../ui/spirit-spring.js');
 const {document}=parseHTML('<html><body><div id="xg-panel"></div></body></html>');const old=globalThis.document;globalThis.document=document;
 try{
  const s=make();s.slot='spring';maybeFindSpring(s,()=>0);let closed=false;
  const api={getSave:()=>s,actions:{mutate:async fn=>fn(s)}};showSpiritSpring(api,()=>{closed=true});
  assert.ok(document.querySelector('[data-start]'));
  s.spiritSpring={...s.spiritSpring,phase:'running',duration:1990,endsAt:Date.now()-1};showSpiritSpring(api,()=>{closed=true});
  assert.equal(document.body.textContent.includes('1.99'),false);
  await new Promise(r=>setTimeout(r,15));assert.ok(document.querySelector('[data-submit]'));
  document.querySelector('[data-guess]').value='1.99';document.querySelector('[data-submit]').click();await new Promise(r=>setTimeout(r,0));
  document.querySelector('[data-claim]').click();await new Promise(r=>setTimeout(r,0));assert.equal(closed,true);assert.equal(s.springClaimed,true);
 }finally{globalThis.document=old}
});
