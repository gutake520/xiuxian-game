import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {indexedDB} from 'fake-indexeddb';
import {OLD_FRIEND_CHAPTERS} from '../data/old-friend.js';
import {SECT_MASTERS} from '../data/masters.js';
import {startOldFriend,oldFriendState,oldFriendEligible,maybeFindOldFriend,chooseOldFriend,continueOldFriend,startOldFriendDuel,finishOldFriendDuel,oldFriendReunion,oldFriendChoiceReason,reportOldFriend,oldFriendGoal} from '../systems/old-friend.js';
import {takeStroll,strollEncounterCount} from '../systems/stroll.js';
import {migrateSave} from '../storage/migrations.js';
import {leaveSect,assertCanJoinSect,SECT_REJOIN_DELAY} from '../systems/sect-membership.js';
import {visitTeachingMaster} from '../systems/master-teaching.js';
import {playRound,fleeBattle} from '../systems/combat.js';
import {showOldFriend} from '../ui/old-friend.js';
import {showMasterTeaching} from '../ui/master-teaching.js';
import {showStroll} from '../ui/stroll.js';
import {createMapUI} from '../ui/map.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
const now=new Date(2026,9,24,12).getTime();
const make=()=>migrateSave({slot:'old-friend-test',player:{realm:'筑基一层',sect:'青岚谷',spiritRoot:'金灵根',cultivation:0,spiritStones:1000,stats:{福缘:10}},masterTeaching:{qiCompleted:3},bossLine:{phase:'defeated',insight:true},inventory:[{uid:'guard',itemId:'guard-talisman',quantity:5}]},now);
function advance(s,choice){const q=s.oldFriend,step=q.step;if(q.phase==='search')assert.ok(maybeFindOldFriend(s,OLD_FRIEND_CHAPTERS[step].place,()=>0));chooseOldFriend(s,q.id,step,choice,OLD_FRIEND_CHAPTERS[step].place,now);if(q.phase==='duel'){startOldFriendDuel(s,q.id);finishOldFriendDuel(s,'victory')}continueOldFriend(s,q.id)}
function route(choices){const s=make();startOldFriend(s,now);for(const choice of choices)advance(s,choice);return s}
const early=['listen','private','promise','rescue','truth','letter','talk','mend'];
test('three qi lessons and foundation unlock directly for every named master',()=>{
 const s=make();s.masterTeaching.qiCompleted=2;assert.equal(oldFriendEligible(s),false);assert.throws(()=>startOldFriend(s));s.masterTeaching.qiCompleted=3;s.player.realm='炼气十层';assert.throws(()=>startOldFriend(s));
 for(const sect of Object.keys(SECT_MASTERS)){const x=make();x.player.sect=sect;visitTeachingMaster(x,now);assert.equal(x.oldFriend.master,SECT_MASTERS[sect].name);const id=x.oldFriend.id;visitTeachingMaster(x,now);assert.equal(x.oldFriend.id,id)}
});
test('stroll clue probability is exactly 20 percent, independent of quota, and cannot repeat while awaiting choice',()=>{
 const s=make();startOldFriend(s);advance(s,'listen');takeStroll(s,'market',now,()=>.99);s.stroll.encounters=7;
 assert.equal(maybeFindOldFriend(s,'foundation',()=>0),null);assert.equal(maybeFindOldFriend(s,'monsters',()=>.2),null);assert.equal(s.oldFriend.phase,'search');
 const hit=takeStroll(s,'monsters',now,()=>.199999);assert.equal(hit.kind,'old-friend');assert.equal(strollEncounterCount(s,now),7);assert.equal(s.oldFriend.phase,'ready');assert.equal(maybeFindOldFriend(s,'monsters',()=>0),null);assert.equal(s.player.spiritStones,1000);
});
test('payments, missing resources, correct locations and duplicate choices are guarded',()=>{
 const s=make();startOldFriend(s);const id=s.oldFriend.id;assert.throws(()=>chooseOldFriend(s,id,0,'listen','ruins'));advance(s,'judge');maybeFindOldFriend(s,'monsters',()=>0);assert.throws(()=>chooseOldFriend(s,id,1,'private','monsters'));
 s.player.spiritStones=2;assert.throws(()=>chooseOldFriend(s,id,1,'broker','monsters'));assert.equal(s.oldFriend.step,1);s.player.spiritStones=10;chooseOldFriend(s,id,1,'broker','monsters');assert.equal(s.player.spiritStones,7);assert.throws(()=>chooseOldFriend(s,id,1,'broker','monsters'));assert.equal(s.player.spiritStones,7);continueOldFriend(s,id);advance(s,'pay');assert.equal(s.player.spiritStones,2);advance(s,'talisman');assert.equal(s.inventory[0].quantity,4);
});
test('both reunion routes retain all eight choices and distinct followup hooks after reload',()=>{
 const a=route(early);assert.equal(a.oldFriend.phase,'done');assert.match(a.oldFriend.lastText,/东夏国见/);assert.equal(oldFriendReunion(a,'金丹').locationId,'dongxia');assert.equal(oldFriendReunion(a,'元婴'),null);
 const b=route(['listen','public','pay','pursue','hide','alone','soul','protect']);assert.match(b.oldFriend.lastText,/有缘再见/);assert.equal(oldFriendReunion(b,'元婴').reason,'concealed-truth');
 const loaded=migrateSave(JSON.parse(JSON.stringify(b)),now);assert.deepEqual(loaded.oldFriend,b.oldFriend);assert.equal(loaded.oldFriend.followup.choices.length,8);
 const custody=route(['judge','public','promise','pursue','truth','guarantee','talk','custody']);assert.equal(custody.oldFriend.followup.reunionRealm,'金丹');
 const forced=route([...early.slice(0,7),'destroy']);assert.equal(forced.oldFriend.followup.reunionRealm,'元婴');
});
test('duel victory, defeat and retreat do not reward loot or softlock the story',t=>{
 t.mock.method(Math,'random',()=>.99);const s=make();startOldFriend(s);for(const c of early.slice(0,6))advance(s,c);chooseOldFriend(s,s.oldFriend.id,6,'subdue','ruins');const original=s.player.spiritStones;
 startOldFriendDuel(s,s.oldFriend.id);fleeBattle(s);assert.equal(s.oldFriend.phase,'duel');assert.equal(s.player.spiritStones,original);
 startOldFriendDuel(s,s.oldFriend.id);s.battle.attack=1000;s.battle.speed=1000;playRound(s,'attack');assert.equal(s.oldFriend.phase,'duel');assert.equal(s.lastBattle.outcome,'defeat');
 startOldFriendDuel(s,s.oldFriend.id);s.battle.hp=.1;s.battle.speed=0;playRound(s,'attack');assert.equal(s.oldFriend.phase,'after');assert.equal(s.oldFriend.step,7);assert.deepEqual(s.lastBattle.rewards,[]);continueOldFriend(s,s.oldFriend.id);assert.equal(s.oldFriend.phase,'ready');
});
test('leaving sect erases qi tasks, story, location and future hooks; rejoin starts from scratch',()=>{
 const s=route(early),id=s.oldFriend.id;leaveSect(s,now);assert.equal(s.masterTeaching,undefined);assert.equal(s.oldFriend,undefined);assert.equal(oldFriendReunion(s,'金丹'),null);assert.throws(()=>chooseOldFriend(s,id,0,'listen','master'));
 assertCanJoinSect(s,now+SECT_REJOIN_DELAY);s.player.sect='青岚谷';assert.equal(oldFriendEligible(s),false);visitTeachingMaster(s,now+SECT_REJOIN_DELAY,()=>0);assert.equal(s.masterTeaching.qiCompleted,0);assert.ok(s.masterTeaching.task);
});
test('simultaneous story submissions persist one choice and one payment',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();startOldFriend(s);advance(s,'listen');maybeFindOldFriend(s,'monsters',()=>0);await writeSave(s);
 const results=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,x=>{chooseOldFriend(x,s.oldFriend.id,1,'broker','monsters');return x})));assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const stored=await readSave(s.slot);assert.equal(stored.player.spiritStones,997);assert.equal(stored.oldFriend.choices.length,2);
});
test('all offered branch combinations can reach one of the two endings',()=>{
 let gold=0,yuan=0;function walk(s){if(s.oldFriend.phase==='done'){assert.equal(s.oldFriend.choices.length,8);if(s.oldFriend.followup.reunionRealm==='金丹')gold++;else yuan++;return}const chapter=OLD_FRIEND_CHAPTERS[s.oldFriend.step];for(const [choice] of chapter.choices){if(oldFriendChoiceReason(s,choice))continue;const next=structuredClone(s);advance(next,choice);walk(next)}}
 const s=make();startOldFriend(s);walk(s);assert.ok(gold>10);assert.ok(yuan>10);
});
test('UI can start, preserve pending choices, resume stroll clues and hide future locations until unlocked',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><div id="xg-panel"><div id="xg-content"></div></div></body></html>').document;t.after(()=>{document.querySelector('#xg-feature-sheet')?.remove();globalThis.document=old});const s=make(),api={getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})}};
 showMasterTeaching(api,()=>{});document.querySelector('[data-old-friend]').click();await new Promise(r=>setImmediate(r));assert.ok(document.querySelector('[data-old-friend-choice="listen"]'));document.querySelector('[data-old-friend-choice="listen"]').click();await new Promise(r=>setImmediate(r));assert.ok(document.querySelector('[data-old-friend-continue]'));continueOldFriend(s,s.oldFriend.id);
 maybeFindOldFriend(s,'monsters',()=>0);showStroll(api,()=>{});document.querySelector('[data-old-friend]').click();assert.ok(document.querySelector('[data-old-friend-choice="public"]'));showOldFriend(api,()=>{},'journal');assert.equal(document.querySelector('[data-old-friend-choice]'),null);
 const map=createMapUI({...api,activate:()=>{}});map.render();document.querySelector('[data-map="yunze"]').click();document.querySelector('[data-map="foundation"]').click();assert.equal(document.querySelector('[data-foundation="old-friend-ruins"]'),null);
 for(const choice of early.slice(1,6))advance(s,choice);map.render();document.querySelector('[data-map="yunze"]').click();document.querySelector('[data-map="foundation"]').click();assert.ok(document.querySelector('[data-foundation="old-friend-ruins"]'));document.querySelector('[data-foundation="old-friend-ruins"]').click();assert.ok(document.querySelector('[data-old-friend-choice="talk"]'));
});

test('both endings can report to the master after reload without changing reunion hooks',()=>{
 const texts=[];
 for(const choices of [early,[...early.slice(0,7),'destroy']]){
  const s=migrateSave(JSON.parse(JSON.stringify(route(choices))),now),q=s.oldFriend,hook=structuredClone(q.followup);
  assert.match(oldFriendGoal(s),/复命/);assert.throws(()=>reportOldFriend(s,q.id,'journal'));
  reportOldFriend(s,q.id,'master',now);assert.equal(q.reportedAt,now);assert.deepEqual(q.followup,hook);assert.equal(q.journal.length,9);assert.match(q.lastText,new RegExp(q.master));
  assert.throws(()=>reportOldFriend(s,q.id,'master',now+1));texts.push(q.lastText);
  const loaded=migrateSave(JSON.parse(JSON.stringify(s)),now);assert.equal(loaded.oldFriend.lastText,q.lastText);assert.doesNotMatch(oldFriendGoal(loaded),/复命/);
  leaveSect(loaded,now);assert.equal(loaded.oldFriend,undefined);
 }
 assert.notEqual(texts[0],texts[1]);assert.match(texts[0],/东夏国/);assert.match(texts[1],/有缘再见/);
 const unfinished=make();startOldFriend(unfinished);assert.throws(()=>reportOldFriend(unfinished,unfinished.oldFriend.id,'master'));
});
test('report CG is available only at master and becomes readable after submission',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><div id="xg-panel"></div></body></html>').document;
 t.after(()=>{document.querySelector('#xg-feature-sheet')?.remove();globalThis.document=old});
 const s=route(early),api={getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})}};
 showOldFriend(api,()=>{},'journal');assert.equal(document.querySelector('[data-old-friend-report]'),null);
 showMasterTeaching(api,()=>{});assert.match(document.querySelector('[data-old-friend]').textContent,/复命/);document.querySelector('[data-old-friend]').click();
 document.querySelector('[data-old-friend-report]').click();await new Promise(r=>setImmediate(r));assert.match(document.body.textContent,/灯下有人/);assert.equal(document.querySelector('[data-old-friend-report]'),null);
 showMasterTeaching(api,()=>{});assert.match(document.querySelector('[data-old-friend]').textContent,/重读/);
});
test('master quest ward is locked and consumed by story before ordinary locked talismans',()=>{
 const s=make();startOldFriend(s);const q=s.oldFriend;chooseOldFriend(s,q.id,0,'bring','master');
 const ward=s.inventory.find(e=>e.itemId==='old-friend-ward');assert.equal(ward.locked,true);
 const guard=s.inventory.find(e=>e.itemId==='guard-talisman');guard.locked=true;const count=guard.quantity;
 q.step=3;q.phase='ready';chooseOldFriend(s,q.id,3,'talisman','foundation');
 assert.ok(!s.inventory.some(e=>e.itemId==='old-friend-ward'));assert.equal(guard.quantity,count);
 q.step=3;q.phase='ready';chooseOldFriend(s,q.id,3,'talisman','foundation');assert.equal(guard.quantity,count-1);
});
