import test from 'node:test';
import assert from 'node:assert/strict';
import {startBreakthrough,rotateMeridian,hintMeridian,retryBreakthrough,breakthroughHints,SPIRIT_ROUTE} from '../systems/breakthrough.js';
import {realmProgress} from '../data/realms.js';
import {migrateSave} from '../storage/migrations.js';
import {equipmentStats} from '../systems/inventory.js';

const save=(wisdom=5)=>({slot:'breakthrough',version:6,player:{name:'测试',realm:'炼气圆满',cultivation:0,sect:'无门无派',stats:{悟性:wisdom}},bossLine:{phase:'defeated',insight:true},inventory:[],events:[],flags:{}});

test('击败仇人且修为圆满才可入场；悟性 5/10 分别给一次/两次提示',()=>{
 for(const [wisdom,hints] of [[4,0],[5,1],[9,1],[10,2]])assert.equal(breakthroughHints(save(wisdom).player),hints);
 const s=save();s.bossLine.insight=false;assert.throws(()=>startBreakthrough(s),/感悟/);
 s.bossLine.insight=true;s.player.realm='炼气十层';assert.throws(()=>startBreakthrough(s),/圆满/);
 s.player.realm='炼气圆满';const session=startBreakthrough(s);assert.equal(startBreakthrough(s).id,session.id);
 assert.equal(session.tiles.length,25);assert.equal(session.remaining,24);
});

test('提示摆正一格、每次旋转写入进度，失败后才可重试',()=>{
 const s=save(10),session=startBreakthrough(s),index=SPIRIT_ROUTE[0];
 assert.throws(()=>retryBreakthrough(s,session.id),/不能重试/);
 const initial=session.tiles[index].rot;
 hintMeridian(s,session.id);
 assert.equal(session.tiles[index].rot,0);assert.equal(session.hintsUsed,1);assert.equal(session.remaining,24);
 hintMeridian(s,session.id);assert.equal(session.hintsUsed,2);
 assert.throws(()=>hintMeridian(s,session.id),/用完/);
 rotateMeridian(s,session.id,24);assert.equal(session.remaining,23);
 assert.equal(session.tiles[24].rot,1);
 assert.throws(()=>rotateMeridian(s,'other',24),/结束/);
 while(session.remaining)rotateMeridian(s,session.id,24);
 assert.equal(s.player.realm,'炼气圆满');
 const next=retryBreakthrough(s,session.id);assert.notEqual(next.id,session.id);assert.equal(next.remaining,24);
 assert.notEqual(initial,0);
});

test('每一盘都能在 24 步内接通，成功原子写入筑基并禁止重复领奖',()=>{
 for(let round=0;round<12;round++){
  const s=save(4),session=startBreakthrough(s);
  for(const index of SPIRIT_ROUTE){
   while(s.breakthrough&&s.breakthrough.tiles[index].rot!==0)rotateMeridian(s,session.id,index);
  }
  assert.equal(s.player.realm,'筑基一层');
  assert.equal(s.breakthrough,null);
  assert.equal(s.player.cultivationRequired,null);
  assert.throws(()=>rotateMeridian(s,session.id,10),/结束/);
  assert.throws(()=>startBreakthrough(s),/圆满/);
  assert.equal(realmProgress(s.player).index,10);
 }
});

test('未完的数阵经旧档迁移仍能继续，筑基存档不退回炼气',()=>{
 const s=save(5),session=startBreakthrough(s);
 s.player.spiritRoot='金灵根';s.player.combat={hp:20,mp:10,attack:3,defense:.5,speed:2,critRate:5,dodgeRate:5};
 const before=equipmentStats(s);
 rotateMeridian(s,session.id,24);
 const loaded=migrateSave(structuredClone(s));
 assert.equal(loaded.breakthrough.id,session.id);
 assert.equal(loaded.breakthrough.remaining,23);
 for(const index of SPIRIT_ROUTE)while(loaded.breakthrough&&loaded.breakthrough.tiles[index].rot!==0)rotateMeridian(loaded,session.id,index);
 migrateSave(loaded);
 assert.equal(loaded.player.realm,'筑基一层');
 assert.deepEqual(equipmentStats(loaded),before);
 assert.equal(loaded.achievements.unlocked.includes('immortal-path'),true);
});
