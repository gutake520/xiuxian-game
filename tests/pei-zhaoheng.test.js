import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {indexedDB} from 'fake-indexeddb';
import {peiAction,peiBonded} from '../systems/pei-zhaoheng.js';
import {migrateSave} from '../storage/migrations.js';
import {startQiExploration,startFoundationExploration,finishQiExploration} from '../systems/exploration.js';
import {addItem} from '../systems/inventory.js';
import {showPei} from '../ui/pei-zhaoheng.js';
import {createActions} from '../core/actions.js';
import {writeSave} from '../storage/saves.js';
const now=new Date(2026,9,24,12).getTime();
const make=()=>migrateSave({slot:'pei-test',player:{realm:'筑基二层',spiritRoot:'金灵根',spiritStones:1000,cultivation:0},inventory:[],bossLine:{phase:'defeated',insight:true}},now);
function meet(s){peiAction(s,'meet',null,now)}
function win(s,error=0){peiAction(s,'new-game',null,now,()=>.5);const id=s.peiZhaoheng.game.id;peiAction(s,'start',id,now);peiAction(s,'stop',id,now+3000+error)}
function marry(s){meet(s);s.peiZhaoheng.affinity=100;for(let i=0;i<3;i++)peiAction(s,'story',null,now);peiAction(s,'accept',null,now)}
test('timing uses 0.10-second inclusive boundary, stale tokens fail and a win grants one gift',()=>{
 const s=make();meet(s);assert.throws(()=>peiAction(s,'gift','stones',now));win(s,100);assert.equal(s.peiZhaoheng.game.won,true);peiAction(s,'gift','stones',now);assert.equal(s.peiZhaoheng.giftReady,false);assert.throws(()=>peiAction(s,'gift','stones',now));win(s,101);assert.equal(s.peiZhaoheng.game.won,false);assert.throws(()=>peiAction(s,'stop',s.peiZhaoheng.game.id,now+3000));
 win(s,-100);addItem(s,'crafted-binding-array');const e=s.inventory.find(e=>e.itemId==='crafted-binding-array');e.usesLeft=0;const before=s.peiZhaoheng.affinity;peiAction(s,'gift',e.uid,now);assert.equal(s.peiZhaoheng.affinity,before+5);assert.equal(s.inventory.some(i=>i.uid===e.uid),false);
});
test('all relationship scenes, decline, companion slots and breakup are integrated',()=>{
 const s=make();meet(s);s.peiZhaoheng.affinity=100;assert.throws(()=>peiAction(s,'accept',null,now));for(let i=0;i<3;i++)assert.ok(peiAction(s,'story',null,now).length>100);assert.ok(peiAction(s,'reject',null,now));assert.equal(peiBonded(s),false);peiAction(s,'accept',null,now);assert.equal(peiBonded(s),true);assert.throws(()=>peiAction(s,'accept',null,now));peiAction(s,'breakup',null,now);assert.equal(peiBonded(s),false);assert.ok(s.companionRejoinAt>now);
});
test('delegated exploration reserves shared quota, survives reload, and permits the other personal exploration',()=>{
 const s=make();marry(s);peiAction(s,'dispatch','qi',now);assert.equal(s.qiSecret,null);assert.equal(s.player.spiritStones,999);assert.throws(()=>peiAction(s,'dispatch','foundation',now));assert.throws(()=>startQiExploration(s,now+86400000));
 const loaded=migrateSave(JSON.parse(JSON.stringify(s)),now);assert.equal(loaded.peiExploration.endsAt,now+180000);startFoundationExploration(loaded,now);assert.equal(loaded.qiSecret.tier,'foundation');assert.equal(loaded.peiExploration.tier,'qi');assert.throws(()=>peiAction(loaded,'collect',null,now+180000));finishQiExploration(loaded,now+180000);peiAction(loaded,'collect',null,now+180000);assert.equal(loaded.peiExploration,undefined);assert.throws(()=>peiAction(loaded,'collect',null,now+180000));assert.throws(()=>startQiExploration(loaded,now+180000));
 const both=make();marry(both);peiAction(both,'dispatch','foundation',now);assert.throws(()=>peiAction(both,'collect',null,now));peiAction(both,'collect',null,now+180000);peiAction(both,'dispatch','qi',now+180000);assert.equal(both.peiExploration.tier,'qi');
});
test('actual action pipeline remains usable during delegation and locks during personal exploration',async t=>{
 globalThis.indexedDB=indexedDB;t.mock.method(Date,'now',()=>now);let s=make();marry(s);await writeSave(s);const api=createActions({getSave:()=>s,setSave:x=>{s=x}});
 await api.mutate(x=>peiAction(x,'dispatch','qi',now));await api.mutate(x=>{x.testAction=true});assert.equal(s.testAction,true);
 await api.mutate(x=>startFoundationExploration(x,now));await assert.rejects(api.mutate(x=>{x.testAction=false}),/等待/);assert.equal(s.testAction,true);
});
test('UI hides target and live time until stop, and exposes story and gift controls',async()=>{
 const {document}=parseHTML('<html><body><div id="xg-panel"></div></body></html>');const old=globalThis.document;globalThis.document=document;
 try{const s=make();meet(s);peiAction(s,'new-game',null,now,()=>.5);const api={getSave:()=>s,actions:{mutate:async f=>({result:f(s)})}};showPei(api,()=>{});assert.match(document.body.textContent,/3.00 秒/);peiAction(s,'start',s.peiZhaoheng.game.id,now);showPei(api,()=>{});assert.doesNotMatch(document.body.textContent,/3.00/);assert.ok(document.querySelector('[data-stop]'));peiAction(s,'stop',s.peiZhaoheng.game.id,now+3000);showPei(api,()=>{});assert.ok(document.querySelector('[data-gift]'));assert.match(document.body.textContent,/实际 3.00/);}finally{globalThis.document=old}
});
