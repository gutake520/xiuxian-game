import {syncNewcomer} from '../systems/newcomer.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {indexedDB} from 'fake-indexeddb';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave} from '../storage/saves.js';
import {createActions} from '../core/actions.js';
import {takeStroll} from './helpers/stroll.js';
import {maybeMeetZhang,finishZhangEncounter,startZhangPlay,finishZhangPlay,zhangPlayStatus,giveZhangGift,answerZhang,leaveZhang,tryZhangRescue,seenZhangScene} from '../systems/zhang-huaijin.js';
import {beginBattle,playRound,fleeBattle,useBattleTalisman} from '../systems/combat.js';
import {equipmentStats,addItem} from '../systems/inventory.js';
import {startDice,revealDice,startGomoku,leaveStallGame} from '../systems/stall-games.js';
import {playPeakPuzzle} from '../systems/peak-puzzles.js';
import {ZHANG_RESCUE_MS,ZHANG_NAME} from '../data/zhang-huaijin.js';
import {showZhang,zhangGameAPI} from '../ui/zhang-huaijin.js';
import {createMapUI} from '../ui/map.js';
globalThis.indexedDB=indexedDB;
const at=new Date(2026,9,21,12).getTime(),day=n=>new Date(2026,9,21+n,12).getTime();
function make(slot='zhang-test'){
 const s=migrateSave({slot,player:{name:'小言',realm:'筑基一层',spiritRoot:'金灵根',sect:'无门无派',cultivation:200,spiritStones:500,stats:{福缘:5}},inventory:[],events:[]},at);
 s.player.hp=equipmentStats(s).maxHp;s.player.mp=equipmentStats(s).maxMp;s.idle.lastAt=at+100*86400000;
 return s;
}
function met(){const s=make();assert.equal(maybeMeetZhang(s,()=>0),true);finishZhangEncounter(s);return s}
function complete(s,n,kind=0){const g=startZhangPlay(s,day(n),()=>kind);if(g.kind==='dice'){const id=g.world.stallGames.dice.id;startDice(g.world,id,'big',0,()=>0);revealDice(g.world,id)}else if(g.kind==='gomoku'){const id=g.world.stallGames.gomoku.id;startGomoku(g.world,id,'medium',0);leaveStallGame(g.world,'gomoku',id)}else playPeakPuzzle(g.world,g.world.peakPuzzle.id,'surrender');return finishZhangPlay(s,g.id,'surrender',day(n))}
function bonded(){const s=met();s.zhangHuaijin.giftsUnlocked=true;s.zhangHuaijin.affinity=100;answerZhang(s,'accept',at);return s}

test('foundation stroll alone triggers once, honors the seven-encounter cap and probability boundary',()=>{
 const low=make();low.player.realm='炼气十层';assert.throws(()=>takeStroll(low,'foundation',at,()=>0));assert.equal(maybeMeetZhang(low,()=>0),false);
 const miss=make();assert.equal(maybeMeetZhang(miss,()=>.1),false);
 const s=make();takeStroll(s,'foundation',at,()=>0);assert.equal(s.battle.kind,'zhang-intro');assert.equal(s.battle.dodgeRate,60);assert.equal(s.stroll.encounters,1);finishZhangEncounter(s);takeStroll(s,'foundation',at,()=>.99);assert.equal(s.battle,null);assert.equal(s.stroll.encounters,1);
 const cap=make();cap.stroll={day:`2026-10-21`,count:7,encounters:7};takeStroll(cap,'foundation',at,()=>0);assert.equal(cap.zhangHuaijin,undefined);
});
test('scripted battle defeats without costs, wear or consuming rescue; escape also unlocks cave',t=>{
 t.mock.method(Math,'random',()=>.9);
 const s=make();addItem(s,'iron-sword');const weapon=s.inventory.at(-1);weapon.durability=17;s.equipment.weapon=weapon.uid;
 const before={hp:s.player.hp,mp:s.player.mp,xp:s.player.cultivation,stones:s.player.spiritStones};maybeMeetZhang(s,()=>0);
 assert.throws(()=>useBattleTalisman(s,'attack-talisman'),/来不及/);
 for(let i=0;s.battle&&i<3;i++)playRound(s,'attack',at);
 assert.equal(s.battle,null);assert.equal(s.lastBattle.outcome,'defeat');assert.equal(s.zhangHuaijin.unlocked,true);assert.equal(weapon.durability,17);
 assert.deepEqual({hp:s.player.hp,mp:s.player.mp,xp:s.player.cultivation,stones:s.player.spiritStones},before);
 const f=make();maybeMeetZhang(f,()=>0);fleeBattle(f);assert.equal(f.zhangHuaijin.unlocked,true);
});
test('three consecutive local dates unlock gifts permanently; duplicate days, gaps and reload are handled',()=>{
 let s=met();complete(s,0);assert.equal(s.zhangHuaijin.streak,1);assert.throws(()=>startZhangPlay(s,day(0)),/今天/);
 complete(s,1);s=JSON.parse(JSON.stringify(s));assert.equal(zhangPlayStatus(s,day(3)).missed,true);
 const text=complete(s,3).text;assert.match(text,/大忙人/);assert.equal(s.zhangHuaijin.streak,1);assert.equal(s.zhangHuaijin.giftsUnlocked,undefined);
 complete(s,4);complete(s,5);assert.equal(s.zhangHuaijin.giftsUnlocked,true);assert.equal(zhangPlayStatus(s,day(20)).missed,false);
 assert.throws(()=>finishZhangPlay(s,s.zhangHuaijin.game.id,'win',day(5)),/已.*结束/);
});
test('all four games use isolated saves, award nothing and allow completing losses or surrender',()=>{
 for(const random of [0,.3,.6,.9]){const s=met();s.peakPuzzle={id:'public-puzzle'};s.stallGames={dice:{id:'public-dice',phase:'rolling'}};s.nextSokobanLevel=8;
  const before=JSON.stringify([s.player,s.inventory,s.peakPuzzle,s.stallGames]);complete(s,0,random);
  assert.equal(JSON.stringify([s.player,s.inventory,s.peakPuzzle,s.stallGames]),before);assert.equal(s.nextSokobanLevel,8);assert.equal(s.zhangHuaijin.streak,1);
 }
 const s=met(),g=startZhangPlay(s,at,()=>0);assert.throws(()=>finishZhangPlay(s,g.id,'win',at),/先完成/);assert.throws(()=>startDice(g.world,g.world.stallGames.dice.id,'big',1),/不下注/);
});
test('gifts consume one item with 65 percent positive and 35 percent negative rolls, ignore type, protect equipped gear',()=>{
 const s=met();assert.throws(()=>giveZhangGift(s,'stones'),/不肯/);s.zhangHuaijin.giftsUnlocked=true;s.zhangHuaijin.affinity=30;
 for(const id of ['healing-herb','iron-sword']){addItem(s,id);const e=s.inventory.at(-1);if(id==='iron-sword')e.durability=1;
  giveZhangGift(s,e.uid,()=>.649999);assert.equal(s.zhangHuaijin.affinity,id==='iron-sword'?36:33);assert.ok(!s.inventory.includes(e));}
 giveZhangGift(s,'stones',()=>.65);assert.equal(s.zhangHuaijin.affinity,33);assert.equal(s.player.spiritStones,499);
 addItem(s,'iron-sword');s.equipment.weapon=s.inventory.at(-1).uid;assert.throws(()=>giveZhangGift(s,s.equipment.weapon),/不能/);
 s.zhangHuaijin.affinity=99;giveZhangGift(s,'stones',()=>0);assert.equal(s.zhangHuaijin.affinity,100);
 s.zhangHuaijin.affinity=1;giveZhangGift(s,'stones',()=>.9);assert.equal(s.zhangHuaijin.affinity,0);
});
test('affinity scenes, companion limits, breakup and rescue eligibility share existing rules',()=>{
 const s=met();assert.throws(()=>seenZhangScene(s,30));s.zhangHuaijin.affinity=100;s.zhangHuaijin.giftsUnlocked=true;
 for(const n of [30,60,90])seenZhangScene(s,n);assert.deepEqual(s.zhangHuaijin.seen,[30,60,90]);
 s.player.companions=['燕停云'];assert.throws(()=>answerZhang(s,'accept',at),/名额/);s.player.sect='合欢宗';answerZhang(s,'accept',at);assert.ok(s.player.companions.includes(ZHANG_NAME));
 s.zhangHuaijin.rescueReadyAt=at+ZHANG_RESCUE_MS;leaveZhang(s,at);assert.equal(s.player.spiritStones,300);assert.equal(s.zhangHuaijin.bonded,false);assert.equal(s.zhangHuaijin.rescueReadyAt,at+ZHANG_RESCUE_MS);assert.throws(()=>answerZhang(s,'accept',at+1),/三天/);
});
test('rescue continues combat at 15 percent, persists cooldown and excludes sect sparring',t=>{
 t.mock.method(Math,'random',()=>.9);let s=bonded();beginBattle(s,'rock-ape');s.player.hp=1;s.battle.attack=100;s.battle.speed=999;
 const xp=s.player.cultivation;playRound(s,'skip',at);assert.ok(s.battle);assert.equal(s.player.cultivation,xp);assert.equal(s.player.hp,Math.round(equipmentStats(s).maxHp*15)/100);assert.equal(s.zhangHuaijin.rescueReadyAt,at+ZHANG_RESCUE_MS);
 s=JSON.parse(JSON.stringify(s));playRound(s,'skip',at+1);assert.equal(s.battle,null);assert.equal(s.player.cultivation,xp-70);
 beginBattle(s,'rock-ape');s.player.hp=0;assert.equal(tryZhangRescue(s,at+ZHANG_RESCUE_MS-1),null);assert.ok(tryZhangRescue(s,at+ZHANG_RESCUE_MS));
 s.player.hp=0;s.battle.kind='sect-tournament';assert.equal(tryZhangRescue(s,at+2*ZHANG_RESCUE_MS),null);
 s.battle.kind='rock';s.player.companions=[];assert.equal(tryZhangRescue(s,at+2*ZHANG_RESCUE_MS),null);
});
test('saved adapter completes a game exactly once and never touches public games or money',async()=>{
 // Settle the one-time newcomer allowance before isolating this feature's money flow.
 let s=met();syncNewcomer(s);s.player.spiritStones=500;s.slot='zhang-atomic';s.stallGames={dice:{id:'public',phase:'offer'}};const g=startZhangPlay(s,Date.now(),()=>0);await writeSave(s);
 const api={getSave:()=>s};api.actions=createActions({getSave:api.getSave,setSave:value=>s=value});const adapter=zhangGameAPI(api,s.slot,g.id),inner=g.world.stallGames.dice.id;
 await adapter.actions.mutate(world=>startDice(world,inner,'big',0,()=>0));
 const settled=await Promise.allSettled([adapter.actions.mutate(w=>revealDice(w,inner)),adapter.actions.mutate(w=>revealDice(w,inner))]);assert.equal(settled.filter(r=>r.status==='fulfilled').length,1);
 const saved=await readSave(s.slot);assert.equal(saved.zhangHuaijin.streak,1);assert.equal(saved.player.spiritStones,500);assert.equal(saved.stallGames.dice.id,'public');
});
test('cave UI has fixed-header sheet, free dice and playable surrender; residence appears only after encounter',async t=>{
 const {document,Event}=parseHTML('<html><body><section id="xg-panel"><main id="xg-content"></main></section></body></html>');const prev=globalThis.document;globalThis.document=document;t.after(()=>globalThis.document=prev);
 let s=met();const api={getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})}};
 const click=async selector=>{const b=document.querySelector(selector);assert.ok(b,selector);b.dispatchEvent(new Event('click'));await new Promise(r=>setImmediate(r))};
 const map=createMapUI({...api,activate:()=>{}});map.render();document.querySelector('[data-map="yunze"]').click();assert.ok(document.querySelector('[data-map="zhang-cave"]'));
 startZhangPlay(s,Date.now(),()=>0);showZhang(api,()=>{});assert.ok(document.querySelector('.xg-stroll-sheet>.xg-feature-header'));await click('[data-play]');assert.equal(document.querySelector('[data-bet]'),null);document.querySelector('[data-guess] option[value=big]').selected=true;await click('[data-start]');await click('[data-reveal]');assert.equal(s.zhangHuaijin.streak,1);
 s=met();startZhangPlay(s,Date.now(),()=>.6);showZhang(api,()=>{});await click('[data-play]');await click('[data-move="surrender"]');assert.equal(s.zhangHuaijin.streak,1);assert.match(document.body.textContent,/投降/);
});
