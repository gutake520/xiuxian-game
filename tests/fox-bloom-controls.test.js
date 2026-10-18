import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {migrateSave} from '../storage/migrations.js';
import {beginBattle,playRound} from '../systems/combat.js';
import {showBattle} from '../ui/combat.js';
import {TECHNIQUES} from '../data/techniques.js';

function make(){return migrateSave({player:{realm:'炼气七层',spiritRoot:'金灵根',sect:'无门无派',cultivation:0,hp:100,mp:20,combat:{hp:100,mp:20,attack:4,defense:1,speed:5,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[],puzzles:{},main:null}})}
test('bloom disables every active technique, then waiting restores available skills',async t=>{
 const {document,Event}=parseHTML('<html><body><main id="xg-content"></main></body></html>');
 const previous=globalThis.document;globalThis.document=document;t.after(()=>{globalThis.document=previous});
 const s=make(),ids=['strengthen-attack','spirit-burn','only-once','catch-breath'];
 s.techniques.mastered=[...ids];s.techniques.combat=[...ids];
 beginBattle(s,'pine-summit');playRound(s,'skip');
 const loaded=JSON.parse(JSON.stringify(s));
 const mp=loaded.player.mp,hp=loaded.battle.hp;
 showBattle({getSave:()=>loaded,activate:()=>{},actions:{battleRound:async action=>playRound(loaded,action)},onExit:()=>{}});
 for(const id of ids)assert.equal(document.querySelector(`[data-fight="${id}"]`).disabled,true,id);
 const wait=document.querySelector('[data-fight="attack"]');assert.equal(wait.textContent,'等待');assert.equal(wait.disabled,false);
 assert.equal(document.querySelector('[data-fight="skip"]').disabled,true);
 wait.dispatchEvent(new Event('click'));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(loaded.player.mp,mp);assert.equal(loaded.battle.hp,hp);
 for(const id of ids)assert.equal(document.querySelector(`[data-fight="${id}"]`).disabled,false,id);
});

test('bloom suppresses all active skill effects without mana, cooldown or usage costs',()=>{
 for(const skill of Object.values(TECHNIQUES).filter(s=>s.type==='combat'&&!s.passive)){
  const s=make();s.techniques.mastered=[skill.id];s.techniques.combat=[skill.id];
  beginBattle(s,'pine-summit');playRound(s,'skip');
  const mp=s.player.mp,hp=s.battle.hp,ready=structuredClone(s.battle.skillReady),usage=structuredClone(s.techniques.usage);
  const result=playRound(s,skill.id);
  assert.match(result.messages.join(' '),/本轮无法行动/,skill.id);
  assert.equal(s.player.mp,mp,skill.id);assert.equal(s.battle.hp,hp,skill.id);
  assert.deepEqual(s.battle.skillReady,ready);assert.deepEqual(s.techniques.usage,usage);
  for(const flag of ['criticalFocus','regenRounds','pendingStrike','cooldownResetUsed'])assert.ok(!s.battle[flag],skill.id+': '+flag);
 }
});

test('bloom delays a prepared strike until the following unsealed turn',()=>{
 const s=make();s.techniques.mastered=['wait-then-strike'];s.techniques.combat=['wait-then-strike'];
 beginBattle(s,'pine-summit');playRound(s,'wait-then-strike');const mp=s.player.mp,hp=s.battle.hp;
 playRound(s,'attack');assert.equal(s.battle.hp,hp);assert.equal(s.battle.pendingStrike,true);
 const result=playRound(s,'attack');assert.ok(result.dealt>0);assert.equal(s.player.mp,mp);assert.equal(s.battle.pendingStrike,false);
});
