import test from 'node:test';
import assert from 'node:assert/strict';
import {startBreakthrough,rotateMeridian,hintMeridian,retryBreakthrough,breakthroughHints,SPIRIT_ROUTE,chooseFoundationAptitude} from '../systems/breakthrough.js';
import {realmProgress,addCultivation} from '../data/realms.js';
import {migrateSave} from '../storage/migrations.js';
import {equipmentStats} from '../systems/inventory.js';

const save=(wisdom=5)=>({slot:'breakthrough',version:7,player:{name:'测试',realm:'炼气十层',cultivation:1000,sect:'无门无派',stats:{悟性:wisdom}},bossLine:{phase:'defeated',insight:true},inventory:[],events:[],flags:{}});
const day=new Date(2026,8,25,12).getTime();

test('击败仇人且炼气十层满 1000 才可入场；悟性 5/10 分别给一次/两次提示',()=>{
 for(const [wisdom,hints] of [[4,0],[5,1],[9,1],[10,2]])assert.equal(breakthroughHints(save(wisdom).player),hints);
 const s=save();s.bossLine.insight=false;assert.throws(()=>startBreakthrough(s),/感悟/);
 s.bossLine.insight=true;s.player.cultivation=999;assert.throws(()=>startBreakthrough(s),/1000/);
 s.player.cultivation=1000;const session=startBreakthrough(s,day);assert.equal(startBreakthrough(s,day).id,session.id);
 assert.equal(session.tiles.length,25);assert.equal(session.remaining,24);
});

test('提示摆正一格、每次旋转写入进度，失败后才可重试',()=>{
 const s=save(10),session=startBreakthrough(s,day),index=SPIRIT_ROUTE[0];
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
 assert.equal(s.player.realm,'炼气十层');
 assert.throws(()=>retryBreakthrough(s,session.id,day),/明天/);
 const next=retryBreakthrough(s,session.id,day+86400000);assert.notEqual(next.id,session.id);assert.equal(next.remaining,24);
 assert.equal(startBreakthrough(s,day+86400000).id,next.id);
 assert.notEqual(initial,0);
});

test('退出不会判失败；当天回来继续原盘，次数耗尽才能在次日重开',()=>{
 const s=save(),old=startBreakthrough(s,day);
 rotateMeridian(s,old.id,24);
 const loaded=structuredClone(s);
 assert.equal(startBreakthrough(loaded,day).id,old.id);
 assert.equal(loaded.breakthrough.remaining,23);
 assert.equal(startBreakthrough(loaded,day+86400000).id,old.id);
 while(loaded.breakthrough.remaining)rotateMeridian(loaded,old.id,24);
 assert.throws(()=>retryBreakthrough(loaded,old.id,day),/明天/);
 assert.equal(retryBreakthrough(loaded,old.id,day+86400000).remaining,24);
});

test('每一盘都能在 24 步内接通，成功原子写入筑基并禁止重复领奖',()=>{
 for(let round=0;round<12;round++){
  const s=save(4),session=startBreakthrough(s);
  for(const index of SPIRIT_ROUTE){
   while(s.breakthrough&&s.breakthrough.tiles[index].rot!==0)rotateMeridian(s,session.id,index);
  }
  assert.equal(s.player.realm,'筑基一层');
  assert.equal(s.player.cultivation,0);
  assert.equal(s.breakthrough,null);
  assert.equal(s.player.cultivationRequired,null);
  assert.throws(()=>rotateMeridian(s,session.id,10),/结束/);
  assert.throws(()=>startBreakthrough(s),/1000/);
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
 const after=equipmentStats(loaded);
 assert.equal(after.maxHp,before.maxHp+10);
 assert.equal(after.maxMp,before.maxMp+2);
 assert.equal(after.attack,before.attack+1.5);
 assert.equal(after.defense,before.defense+1);
 assert.equal(after.speed,before.speed+2);
 assert.equal(after.critRate,before.critRate+3);
 assert.equal(after.dodgeRate,before.dodgeRate+2);
 assert.equal(loaded.foundationAptitudePending,true);
 assert.equal(loaded.achievements.unlocked.includes('immortal-path'),true);
});

test('单根、双三根、四五根获得对应筑基奖励，选点可超过 10 且重载后不会重复领取',()=>{
 for(const [spiritRoot,hp,attack,defense,critRate,exclusive] of [
  ['雷灵根',10,1.5,1,3,false],['金木双灵根',9,1.2,.9,2,true],
  ['金木水三灵根',9,1.2,.9,2,true],['金木水火四灵根',8,1,.8,1,false],['五灵根',8,1,.8,1,false]
 ]){
  const s=save(10);s.player.spiritRoot=spiritRoot;s.player.stats.悟性=10;
  s.player.combat={hp:20,mp:10,attack:3,defense:.5,speed:2,critRate:5,dodgeRate:5};s.player.hp=24;s.player.mp=11;
  s.realmHpBonusApplied=4;s.realmMpBonusApplied=1;
  const before=equipmentStats(s),session=startBreakthrough(s);
  for(const index of SPIRIT_ROUTE)while(s.breakthrough&&s.breakthrough.tiles[index].rot!==0)rotateMeridian(s,session.id,index);
  const loaded=migrateSave(structuredClone(s)),after=equipmentStats(loaded);
  assert.equal(after.maxHp,before.maxHp+hp,spiritRoot);
  assert.equal(after.maxMp,before.maxMp+2,spiritRoot);
  assert.ok(Math.abs(after.attack-before.attack-attack)<1e-9,spiritRoot);
  assert.ok(Math.abs(after.defense-before.defense-defense)<1e-9,spiritRoot);
  assert.equal(after.speed,before.speed+2,spiritRoot);
  assert.equal(after.critRate,before.critRate+critRate,spiritRoot);
  assert.equal(after.dodgeRate,before.dodgeRate+2,spiritRoot);
  assert.equal(loaded.player.hp,24+hp);
  assert.equal(loaded.player.mp,13);
  assert.equal(loaded.techniques.mastered.includes('self-as-self'),exclusive,spiritRoot);
  assert.equal(loaded.techniques.combat.includes('self-as-self'),false,spiritRoot);
  assert.throws(()=>chooseFoundationAptitude(loaded,'攻击'),/资质/);
  assert.match(chooseFoundationAptitude(loaded,'悟性'),/悟性 \+1/);
  assert.equal(loaded.player.stats.悟性,11);
  assert.throws(()=>chooseFoundationAptitude(loaded,'悟性'),/待分配/);
  assert.deepEqual(equipmentStats(migrateSave(loaded)),after);
 }
});

test('旧圆满档迁到炼气十层满 1000；扣修为后可以修炼补回，但不会溢出',()=>{
 const s=save();s.player.realm='炼气圆满';s.player.cultivation=0;
 migrateSave(s);
 assert.equal(s.player.realm,'炼气十层');assert.equal(s.player.cultivation,1000);
 assert.equal(s.player.cultivationRequired,1000);
 s.player.cultivation=950;
 assert.equal(addCultivation(s,80),50);
 assert.equal(s.player.cultivation,1000);
 assert.equal(addCultivation(s,50),0);
 s.player.cultivation=-50;
 assert.equal(addCultivation(s,50),50);
 assert.equal(s.player.cultivation,0);
});
