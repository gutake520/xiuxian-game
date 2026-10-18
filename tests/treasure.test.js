import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {takeStroll} from '../systems/stroll.js';
import {maybeFindTreasure,advanceTreasure,treasureCanDig,startTreasureGame,activeTreasureMole,hitTreasureMole,finishTreasureGame} from '../systems/treasure.js';
import {beginBattle,playRound,fleeBattle} from '../systems/combat.js';
import {showTreasure} from '../ui/treasure.js';
import {showBattle} from '../ui/combat.js';
const now=new Date(2026,9,18,12).getTime();
const make=(realm='炼气七层')=>migrateSave({slot:'treasure-test',player:{realm,spiritRoot:'金灵根',sect:'无门无派',stats:{福缘:0},cultivation:0,spiritStones:20,hp:30,mp:10,combat:{hp:30,mp:10,attack:10,defense:10,speed:10,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[],main:null,puzzles:{}},bagCapacity:20},now);
function found(s,real=true){const rolls=[0,.9,.9,real?.299:.3];assert.equal(maybeFindTreasure(s,()=>rolls.shift()),true);return s.treasure}
function ready(s,real=true){const map=found(s,real);map.step=3;return map}
function fixed(value,fn){const prev=Math.random;try{Math.random=()=>value;return fn()}finally{Math.random=prev}}
test('black market finds a map at five percent, fixes truth and route, and prevents duplicates',()=>{
 const s=make();assert.equal(maybeFindTreasure(s,()=>.05),false);const map=found(s);assert.equal(map.real,true);assert.equal(new Set(map.route.map(p=>p.id)).size,3);const before=structuredClone(map);
 assert.equal(maybeFindTreasure(s,()=>0),false);assert.deepEqual(s.treasure,before);
 const copy=migrateSave(JSON.parse(JSON.stringify(s)),now);assert.deepEqual(copy.treasure,before);
 const other=make();takeStroll(other,'market',now,()=>0);assert.equal(other.treasure,undefined);takeStroll(other,'blackmarket',now,()=>0);assert.ok(other.treasure);assert.equal(other.stroll.count,2);
 assert.equal(found(make(),false).real,false);
});
test('tiers use their own locations and snapshot rewards; unsupported future realms wait for configuration',()=>{
 const qi=make(),foundation=make('筑基一层');assert.equal(found(qi).reward,10);const map=found(foundation);assert.equal(map.reward,15);assert.ok(map.route.every(p=>['rock-hollow','cloud-gorge','blade-slope'].includes(p.id)));
 qi.player.realm='筑基一层';assert.equal(qi.treasure.reward,10);assert.equal(qi.treasure.realm,'炼气');assert.equal(maybeFindTreasure(make('金丹一层'),()=>0),false);
});
test('ordered victories count once; ordinary monsters and variants are accepted',()=>{
 const s=make(),map=found(s),[a,b,c]=map.route;
 assert.equal(advanceTreasure(s,{id:'wrong',monsterId:b.monsterId}),false);
 assert.equal(advanceTreasure(s,{id:'one',monsterId:a.monsterId+'-mid'}),true);assert.equal(map.step,1);
 assert.equal(advanceTreasure(s,{id:'one',monsterId:b.monsterId}),false);
 assert.equal(advanceTreasure(s,{id:'two',monsterId:b.monsterId}),true);assert.equal(advanceTreasure(s,{id:'three',monsterId:c.monsterId+'-human'}),true);assert.equal(treasureCanDig(s),true);
});
test('human retaliation must finish before advancing and fleeing never advances',()=>{
 const s=make(),map=found(s);map.route=[map.route.find(p=>p.monsterId==='tough'),...map.route.filter(p=>p.monsterId!=='tough')];
 fixed(0,()=>{beginBattle(s,'tough-human');s.battle.hp=1;playRound(s,'attack')});assert.ok(s.battle?.retaliation);assert.equal(map.step,0);assert.equal(treasureCanDig(s),false);
 fixed(.99,()=>{s.battle.hp=1;playRound(s,'attack')});assert.equal(map.step,1);
 const flee=make();found(flee);fixed(0,()=>{beginBattle(flee,'tough-human');flee.battle.hp=1;playRound(flee,'attack')});fleeBattle(flee);assert.equal(flee.treasure.step,0);
});
test('minigame waits for post-battle stories and rejects premature or stale settlement',()=>{
 const s=make(),map=ready(s);for(const key of ['battle','encounterPending','divinationPending','seniorRewardPending','yanEncounterPending','yanAftermath']){s[key]={};assert.equal(treasureCanDig(s),false);assert.throws(()=>startTreasureGame(s,map.id,now));delete s[key]}
 startTreasureGame(s,map.id,now);assert.throws(()=>finishTreasureGame(s,map.id,now+17999));assert.throws(()=>finishTreasureGame(s,'old',now+18000));
});
test('mole windows and hits persist across reload; duplicate and wrong-hole taps cannot score',()=>{
 const s=make(),map=ready(s),game=startTreasureGame(s,map.id,now,()=>0);
 assert.equal(startTreasureGame(s,map.id,now+10000),game);assert.deepEqual(activeTreasureMole(game,now),{frame:0,hole:0});
 assert.equal(hitTreasureMole(s,map.id,0,1,now),false);assert.equal(hitTreasureMole(s,map.id,0,0,now),true);assert.equal(hitTreasureMole(s,map.id,0,0,now),false);
 assert.equal(activeTreasureMole(game,now+1100),null);assert.equal(activeTreasureMole(game,now+18000),null);
 const copy=migrateSave(JSON.parse(JSON.stringify(s)),now);assert.deepEqual(copy.treasure.game.hits,[0]);assert.equal(startTreasureGame(copy,map.id,now+10000).endsAt,now+18000);
});
test('truth alone decides payout on wins and losses; poor players lose no more than their balance',()=>{
 for(const real of [true,false])for(const win of [true,false])for(const stones of [0,1.25,3,20]){
  const s=make(),map=ready(s,real);s.player.spiritStones=stones;const game=startTreasureGame(s,map.id,now,()=>0);
  if(win)for(let frame=0;frame<game.target;frame++)hitTreasureMole(s,map.id,frame,0,now+frame*game.intervalMs);
  const result=finishTreasureGame(s,map.id,game.endsAt);assert.equal(result.won,win);assert.equal(s.player.spiritStones,real?stones+10:Math.max(0,stones-3));assert.equal(result.text.includes('这么穷不许打地鼠'),!real&&stones<3);
  const before=structuredClone(s);assert.throws(()=>finishTreasureGame(s,map.id,game.endsAt));assert.deepEqual(s,before);
 }
 const s=make('筑基一层'),map=ready(s);startTreasureGame(s,map.id,now);finishTreasureGame(s,map.id,now+18000);assert.equal(s.player.spiritStones,35);
});
test('concurrent settlements write exactly once',async()=>{
 globalThis.indexedDB=indexedDB;const s=make(),map=ready(s);startTreasureGame(s,map.id,now);await writeSave(s);
 const results=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,next=>{finishTreasureGame(next,map.id,now+18000);return next})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await readSave(s.slot)).player.spiritStones,30);
});
test('UI hides truth, supports tapping and resuming expired games, and shows dig only after chain',async t=>{
 const {document,MutationObserver}=parseHTML('<html><body><main id="xg-panel"><div id="xg-content"></div></main></body></html>');const old={document:globalThis.document,MutationObserver:globalThis.MutationObserver};Object.assign(globalThis,{document,MutationObserver});t.after(()=>Object.assign(globalThis,old));
 const s=make(),map=ready(s);const api={getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})},activate:()=>{},onExit:()=>{},onYanEncounter:()=>{}};
 showTreasure(api,()=>{});assert.doesNotMatch(document.body.textContent,/真假|30%|70%|真图|假图/);await document.querySelector('[data-dig]').onclick();assert.equal(document.querySelectorAll('[data-hole]').length,9);
 const mole=activeTreasureMole(map.game);await document.querySelector(`[data-hole="${mole.hole}"]`).onclick();assert.equal(map.game.hits.length,1);
 document.querySelector('[data-close]').click();map.game.endsAt=Date.now()-1;showTreasure(api,()=>{});await new Promise(r=>setImmediate(r));assert.equal(s.treasure,null);assert.match(document.body.textContent,/获得 10 灵石/);document.querySelector('[data-close]').click();
 ready(s);s.lastBattle={outcome:'victory',log:[]};showBattle(api);assert.ok(document.querySelector('[data-treasure-dig]'));
 s.battle={kind:'normal',round:0,skillReady:{},log:[],name:'追兵',hp:1,maxHp:1};showBattle(api);assert.equal(document.querySelector('[data-treasure-dig]'),null);
});
