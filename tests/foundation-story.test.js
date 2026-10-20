import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {indexedDB} from 'fake-indexeddb';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave} from '../storage/saves.js';
import {createActions} from '../core/actions.js';
import {createMapUI} from '../ui/map.js';
import {SECT_MASTERS} from '../data/masters.js';
import {ensureFoundationStory,advanceFoundationStory,searchPursuerBody,canEnterDongxia,enterDongxia} from '../systems/foundation-story.js';
import {beginBattle,playRound,useBattleArray,fleeBattle} from '../systems/combat.js';
import {ensureBossLine} from '../systems/boss-line.js';
const make=(realm='筑基十层',sect='青岚谷')=>migrateSave({slot:'story-test',player:{realm,sect,spiritRoot:'木灵根',stats:{福缘:0},cultivation:0,spiritStones:20,hp:50,mp:20,combat:{hp:50,mp:20,attack:10,defense:2,speed:10,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[]},bossLine:{phase:'defeated',insight:true}});
function rescue(s){advanceFoundationStory(s);advanceFoundationStory(s)}
test('nine distinct masters, plus sectless fallback, snapshot identities and persist story phases',()=>{
 assert.equal(new Set(Object.values(SECT_MASTERS).map(m=>m.name)).size,9);
 for(const sect of [...Object.keys(SECT_MASTERS),'无门无派']){
  let s=make('筑基十层',sect);const name=s.foundationStory.master.name;
  assert.equal(s.foundationStory.phase,'ambush');assert.throws(()=>beginBattle(s,'rock-ape'),/剧情/);
  advanceFoundationStory(s);s=migrateSave(structuredClone(s));assert.equal(s.foundationStory.phase,'rescue');
  s.player.sect='凌霄剑宗';ensureFoundationStory(s);assert.equal(s.foundationStory.master.name,name);
  advanceFoundationStory(s);assert.equal(s.foundationStory.phase,'wounded');assert.equal(s.foundationStory.enemy.name,'邵厉');assert.notEqual(s.foundationStory.enemy.name,name);assert.throws(()=>advanceFoundationStory(s),/结束/);
 }
});
test('reaching foundation ten during a human fight queues rescue without starting retaliation',t=>{
 t.mock.method(Math,'random',()=>0);
 const s=make('筑基九层');s.player.cultivation=3599;s.player.combat.attack=200;s.player.combat.speed=100;
 beginBattle(s,'cloud-falcon-human');playRound(s);assert.equal(s.player.realm,'筑基十层');assert.equal(s.battle,null);assert.equal(s.foundationStory.phase,'ambush');
});
test('Lu Renjia accepts qi arrays, including an already-saved battle without stage; bind skips next round',t=>{
 t.mock.method(Math,'random',()=>.99);
 for(const legacy of [false,true]){
  const s=make('炼气十层');s.bossLine={phase:'wounded'};s.inventory=[{uid:'array',itemId:'binding-array',quantity:1}];
  beginBattle(s,'wounded-boss');if(legacy)delete s.battle.stage;
  useBattleArray(s,'array');assert.equal(s.inventory.length,0);assert.deepEqual(s.battle.bindRounds,[2]);
  playRound(s,'skip');const hp=s.player.hp;const result=playRound(s,'skip');assert.equal(s.player.hp,hp);assert.match(result.messages.join(''),/无法行动/);
 }
 const s=make();rescue(s);s.inventory=[{uid:'qi',itemId:'binding-array',quantity:1},{uid:'foundation',itemId:'foundation-binding-array',quantity:1}];
 beginBattle(s,'wounded-pursuer');assert.throws(()=>useBattleArray(s,'qi'),/困不住/);useBattleArray(s,'foundation');assert.equal(s.inventory.length,1);
});
test('pursuer defeat and escape can retry; kill survives reload, body search awards once and preserves overflow',t=>{
 t.mock.method(Math,'random',()=>.99);
 let s=make();rescue(s);s.player.hp=1;beginBattle(s,'wounded-pursuer');playRound(s,'skip');assert.equal(s.lastBattle.outcome,'defeat');assert.equal(s.foundationStory.phase,'wounded');
 s.player.hp=50;beginBattle(s,'wounded-pursuer');fleeBattle(s);assert.equal(s.foundationStory.phase,'wounded');
 beginBattle(s,'wounded-pursuer');assert.equal(s.battle.name,'邵厉');assert.notEqual(s.battle.name,s.foundationStory.master.name);s.battle.hp=1;playRound(s);assert.equal(s.foundationStory.phase,'dead');assert.equal(s.foundationStory.dongxiaClue,undefined);
 s=migrateSave(structuredClone(s));s.inventory=Array.from({length:20},(_,i)=>({uid:'bag'+i,itemId:'ore',quantity:1}));
 const loot=searchPursuerBody(s);assert.match(loot,/邵厉的尸身/);assert.match(loot,/东夏国/);assert.doesNotMatch(loot,new RegExp(s.foundationStory.master.name));assert.equal(s.temporaryLoot.filter(i=>i.itemId==='foundation-completion-charm').length,1);assert.throws(()=>searchPursuerBody(s),/没有/);assert.throws(()=>beginBattle(s,'wounded-pursuer'),/没有/);
 assert.equal(canEnterDongxia(s),false);assert.throws(()=>enterDongxia(s),/突破金丹/);s.player.realm='金丹一层';assert.equal(canEnterDongxia(s),true);enterDongxia(s);assert.equal(s.dongxiaVisited,true);
});
test('old final encounter rewards remain intact and are not given twice by the new story',()=>{
 const s=make();s.foundationEnding={defeated:true};rescue(s);s.foundationStory.phase='dead';searchPursuerBody(s);assert.equal(s.inventory.length,0);assert.equal(s.foundationStory.dongxiaClue,true);
});
test('saved UI completes rescue, fight and body search, then exposes a locked Dongxia entry',async t=>{
 const {document}=parseHTML('<html><body><main id="xg-content"></main></body></html>');const old={document:globalThis.document,indexedDB:globalThis.indexedDB};Object.assign(globalThis,{document,indexedDB});t.after(()=>Object.assign(globalThis,old));
 let s=make();await writeSave(s);const actions=createActions({getSave:()=>s,setSave:n=>s=n}),map=createMapUI({getSave:()=>s,actions,activate:()=>{}});
 map.render();assert.match(document.body.textContent,/旧仇追至/);await document.querySelector('[data-foundation-story]').onclick({currentTarget:document.querySelector('[data-foundation-story]')});assert.match(document.body.textContent,/谢疏岚/);
 await document.querySelector('[data-foundation-story]').onclick({currentTarget:document.querySelector('[data-foundation-story]')});assert.equal(s.foundationStory.phase,'wounded');
 document.querySelector('[data-map="foundation"]').click();document.querySelector('[data-foundation="foundation-ending"]').click();assert.ok(document.querySelector('[data-pursuer-fight]'));
 await actions.startBattle('wounded-pursuer');await actions.mutate(next=>{next.battle.hp=1;next.battle.dodgeRate=0},{allowBattle:true});await actions.battleRound('attack');
 s=await readSave(s.slot);assert.equal(s.foundationStory.phase,'dead');map.render();document.querySelector('[data-map="foundation"]').click();document.querySelector('[data-foundation="foundation-ending"]').click();assert.ok(document.querySelector('[data-pursuer-search]'));
 await Promise.allSettled([actions.mutate(searchPursuerBody),actions.mutate(searchPursuerBody)]);assert.equal(s.inventory.filter(i=>i.itemId==='foundation-completion-charm').length,1);map.render();assert.equal(document.querySelector('[data-map="dongxia"]').disabled,true);
});
