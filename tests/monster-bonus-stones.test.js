import test from 'node:test';
import assert from 'node:assert/strict';
import {QI_MONSTERS,FOUNDATION_MONSTERS} from '../data/locations.js';
import {migrateSave} from '../storage/migrations.js';
import {beginBattle,playRound} from '../systems/combat.js';
const now=new Date(2026,9,24,12).getTime();
test('mid and late kills grant extra stones at both bounds for every resource and realm',t=>{
 let roll=0;t.mock.method(Math,'random',()=>roll);
 for(const monsters of [QI_MONSTERS,FOUNDATION_MONSTERS])for(const m of monsters.filter(m=>m.bonusStones))for(roll of [0,.999999]){
  const s=migrateSave({slot:'bonus',player:{realm:m.stage==='筑基'?'筑基九层':'炼气九层',spiritRoot:'金灵根',cultivation:0,spiritStones:100,hp:100,mp:10,combat:{hp:100,mp:10,attack:1000,defense:100,speed:1000},stats:{福缘:10}},inventory:[],bagCapacity:100,bossLine:{phase:'defeated',insight:true}},now);
  const extra=m.minLevel>=7?(roll===0?2:4):(roll===0?1:2),base=m.resource==='stones'?(roll===0?2:3):(roll===0?1:0);
  beginBattle(s,m.id);const r=playRound(s,'attack',now);assert.equal(r.result.outcome,'victory');assert.equal(s.player.spiritStones,100+base+extra,m.id);assert.ok(r.result.rewards.includes(`额外灵石×${extra}`));
 }
 assert.equal(QI_MONSTERS.filter(m=>m.bonusStones).length,6);assert.equal(FOUNDATION_MONSTERS.filter(m=>m.bonusStones).length,6);
 for(const m of [...QI_MONSTERS,...FOUNDATION_MONSTERS].filter(m=>m.minLevel===1||m.boss))assert.equal(m.bonusStones,undefined);
});
