import test from 'node:test';
import assert from 'node:assert/strict';
import {startQiExploration,finishQiExploration,QI_EXPLORATION_MS,explorationFee} from '../systems/exploration.js';
const make=realm=>({player:{realm,spiritStones:5},inventory:[],bagCapacity:20});
test('secret charges tier fee and snapshots tier materials across reload and realm change',t=>{
 t.mock.method(Math,'random',()=>0);
 for(const [realm,fee,prefix] of [['炼气十层',1,''],['筑基一层',2,'foundation-']]){
  let s=make(realm);assert.equal(explorationFee(s.player),fee);startQiExploration(s,1000);assert.equal(s.player.spiritStones,5-fee);
  s=JSON.parse(JSON.stringify(s));s.player.realm=prefix?'炼气十层':'筑基一层';finishQiExploration(s,1000+QI_EXPLORATION_MS);
  assert.equal(s.player.spiritStones,6-fee);assert.deepEqual(s.inventory.map(i=>i.itemId),[prefix+'ore',prefix+'healing-herb']);
  assert.throws(()=>finishQiExploration(s,1000+QI_EXPLORATION_MS));
 }
});
test('insufficient foundation entry fee does not start or charge; legacy exploration keeps qi ore',t=>{
 t.mock.method(Math,'random',()=>0);const poor=make('筑基一层');poor.player.spiritStones=1.5;
 assert.throws(()=>startQiExploration(poor,1000),/灵石不足/);assert.equal(poor.player.spiritStones,1.5);assert.equal(poor.qiSecret,undefined);
 const legacy=make('炼气十层');startQiExploration(legacy,1000);delete legacy.qiSecret.reward.oreId;legacy.player.realm='筑基一层';
 finishQiExploration(legacy,1000+QI_EXPLORATION_MS);assert.equal(legacy.inventory[0].itemId,'ore');
});
