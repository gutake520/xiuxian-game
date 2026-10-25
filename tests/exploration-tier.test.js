import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {startQiExploration,startFoundationExploration,finishQiExploration,QI_EXPLORATION_MS,explorationFee} from '../systems/exploration.js';
import {migrateSave} from '../storage/migrations.js';
import {createMapUI} from '../ui/map.js';
const make=realm=>({player:{realm,spiritStones:20},inventory:[],bagCapacity:20});
const now=new Date(2026,9,21,12).getTime();
test('both secrets can be explored once per day in either order, with fixed regional rewards',t=>{
 t.mock.method(Math,'random',()=>0);
 for(const starts of [[startQiExploration,startFoundationExploration],[startFoundationExploration,startQiExploration]]){
  let s=make('筑基一层');
  for(const start of starts){
   const foundation=start===startFoundationExploration,fee=foundation?2:1,prefix=foundation?'foundation-':'';
   const before=s.player.spiritStones;assert.equal(explorationFee(foundation?'foundation':'qi'),fee);
   start(s,now);assert.equal(s.player.spiritStones,before-fee);
   assert.throws(()=>starts.find(f=>f!==start)(s,now),/尚未结束/);
   s=JSON.parse(JSON.stringify(s));assert.throws(()=>finishQiExploration(s,now),/尚未结束/);
   finishQiExploration(s,now+QI_EXPLORATION_MS);
   assert.ok(s.inventory.some(i=>i.itemId===prefix+'ore'));assert.ok(s.inventory.some(i=>i.itemId===prefix+'healing-herb'));
   assert.ok(s[foundation?'lastFoundationExploration':'lastQiExploration']);
   assert.throws(()=>start(s,now+QI_EXPLORATION_MS),/今天已经/);
   assert.throws(()=>finishQiExploration(s,now+QI_EXPLORATION_MS));
  }
  assert.equal(s.player.spiritStones,19);
  for(const start of starts){start(s,now+86400000);finishQiExploration(s,now+86400000+QI_EXPLORATION_MS)}
 }
});
test('foundation requires realm and fee; qi keeps its fee and rewards after advancement',t=>{
 t.mock.method(Math,'random',()=>0);
 const low=make('炼气十层');assert.throws(()=>startFoundationExploration(low,now),/筑基期/);assert.equal(low.player.spiritStones,20);assert.equal(low.foundationSecretDay,undefined);
 const poor=make('筑基一层');poor.player.spiritStones=1.5;
 assert.throws(()=>startFoundationExploration(poor,now),/灵石不足/);assert.equal(poor.player.spiritStones,1.5);assert.equal(poor.qiSecret,undefined);assert.equal(poor.foundationSecretDay,undefined);
 startQiExploration(poor,now);assert.equal(poor.player.spiritStones,.5);finishQiExploration(poor,now+QI_EXPLORATION_MS);assert.equal(poor.inventory[0].itemId,'ore');
 startQiExploration(low,now);low.player.realm='筑基一层';finishQiExploration(low,now+QI_EXPLORATION_MS);assert.equal(low.inventory[0].itemId,'ore');
});
test('legacy pending reward and used town quota survive; foundation quota remains available',t=>{
 t.mock.method(Math,'random',()=>0);
 for(const upgraded of [false,true]){
  const s=make('筑基一层');startQiExploration(s,now);delete s.qiSecret.tier;
  if(upgraded){s.qiSecret.reward.oreId='foundation-ore';s.qiSecret.reward.herb='foundation-healing-herb'}else delete s.qiSecret.reward.oreId;
  finishQiExploration(s,now+QI_EXPLORATION_MS);assert.equal(s.inventory[0].itemId,upgraded?'foundation-ore':'ore');
  assert.throws(()=>startQiExploration(s,now),/今天已经/);startFoundationExploration(s,now+QI_EXPLORATION_MS);
 }
});
test('map offers independent town and foundation entrances, costs and return destinations',t=>{
 const previous=globalThis.document;const {document}=parseHTML('<html><body><section id="xg-panel"><main id="xg-content"></main></section></body></html>');globalThis.document=document;t.after(()=>globalThis.document=previous);
 const s=migrateSave({...make('筑基一层'),slot:'secrets',bossLine:{phase:'defeated',insight:true}});
 const map=createMapUI({getSave:()=>s,activate:()=>{},actions:{}});
 map.render();document.querySelector('[data-map="yunze"]').click();document.querySelector('[data-map="foundation"]').click();document.querySelector('[data-foundation="foundation-secret"]').click();
 assert.match(document.body.textContent,/云岫秘境/);assert.match(document.body.textContent,/2 灵石/);assert.match(document.body.textContent,/返回望川岭/);
 document.querySelector('.xg-map-back').click();assert.ok(document.querySelector('[data-foundation="rock-hollow"]'));
 // Use the town entrance after a completed foundation exploration today.
 startFoundationExploration(s);finishQiExploration(s,Date.now()+QI_EXPLORATION_MS);
 map.render();document.querySelector('[data-map="yunze"]').click();document.querySelector('[data-map="monsters"]').click();document.querySelector('[data-encounter="star-realm"]').click();
 assert.match(document.body.textContent,/星落秘境/);assert.match(document.body.textContent,/1 灵石/);assert.equal(document.querySelector('[data-explore]').disabled,false);
 document.querySelector('.xg-map-back').click();assert.ok(document.querySelector('[data-encounter="stone-ridge"]'));
 map.render();document.querySelector('[data-map="yunze"]').click();document.querySelector('[data-map="foundation"]').click();document.querySelector('[data-foundation="foundation-secret"]').click();assert.equal(document.querySelector('[data-explore]').disabled,true);
});
