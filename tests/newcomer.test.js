import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {NEWCOMER_TASKS} from '../data/newcomer.js';
import {markNewcomer,syncNewcomer} from '../systems/newcomer.js';
import {migrateSave} from '../storage/migrations.js';
import {createActions} from '../core/actions.js';
import {readSave,writeSave} from '../storage/saves.js';
import {encodeBackup,decodeBackup} from '../storage/backup.js';
import {addItem,purchase,equipItem} from '../systems/inventory.js';
import {startLearning,completeLearning,setMainTechnique} from '../systems/techniques.js';
import {repairEquipment} from '../systems/sect-services.js';
import {repairOwnEquipment,temperEquipment} from '../systems/sect-progression.js';
import {feedPeakBeast} from '../systems/spirit-peak.js';
import {SPIRIT_PEAK_BEASTS} from '../data/spirit-peak.js';
import {drawBlackMarket} from '../systems/black-market.js';
import {takeStroll} from '../systems/stroll.js';
import {createNewcomerUI,showGameGuide} from '../ui/newcomer.js';
import {createMapUI} from '../ui/map.js';
globalThis.indexedDB=indexedDB;
function make(slot='newcomer',realm='炼气一层'){
 const s=migrateSave({slot,version:7,createdAt:Date.now(),player:{name:'初入仙途',sect:'无门无派',realm,spiritRoot:'火灵根',stats:{悟性:6,神识:6,根骨:6,魅力:6,福缘:6},cultivation:0,spiritStones:20},inventory:[],events:[]});
 s.idle.lastAt=Date.now()+60000;return s;
}
function apiFor(initial){let current=initial;return {get:()=>current,api:createActions({getSave:()=>current,setSave:s=>current=s})}}
function dom(t){const before=globalThis.document;const {document}=parseHTML('<html><body><section id="xg-panel"><div id="island"></div><main id="xg-content"></main></section></body></html>');globalThis.document=document;t.after(()=>globalThis.document=before);return document}

test('retroactive manual, learning, main and equipment rewards are retained and each pays once',()=>{
 const s=make();addItem(s,'qi-manual');assert.equal(syncNewcomer(s),2);
 const p=startLearning(s,'basic-qi-guide');p.cells=[...p.solution];completeLearning(s,'basic-qi-guide');assert.equal(syncNewcomer(s),2);
 setMainTechnique(s,'basic-qi-guide');addItem(s,'cloth-robe');equipItem(s,s.inventory.at(-1).uid);assert.equal(syncNewcomer(s),4);
 s.techniques.main=null;s.equipment.armor=null;assert.equal(syncNewcomer(s),0);assert.equal(s.newcomer.paid.length,4);
 assert.equal(s.player.spiritStones,28);
 const existing=make();existing.techniques.mastered=['basic-qi-guide'];assert.equal(syncNewcomer(existing),4);assert.ok(existing.newcomer.done.includes('manual'));
});
test('qi three, later qi, foundation and golden saves receive precisely 22 once; qi two remains active',()=>{
 for(const realm of ['炼气三层','炼气十层','筑基一层','金丹一层']){
  const s=make('veteran',realm);assert.equal(syncNewcomer(s),22);assert.equal(s.newcomer.finished,true);assert.equal(syncNewcomer(s),0);assert.equal(s.player.spiritStones,42);
 }
 const s=make('rising','炼气二层');assert.equal(syncNewcomer(s),0);assert.equal(s.newcomer.finished,false);
 markNewcomer(s,'feed');assert.equal(syncNewcomer(s),2);s.player.realm='炼气三层';assert.equal(syncNewcomer(s),20);assert.equal(s.player.spiritStones,42);assert.equal(syncNewcomer(s),0);
});
test('completing all eleven in arbitrary order pays a total of 22 and persists through serialization',()=>{
 const s=make('slot1');for(const task of [...NEWCOMER_TASKS].reverse()){markNewcomer(s,task.id);assert.equal(syncNewcomer(s),2);markNewcomer(s,task.id);assert.equal(syncNewcomer(s),0)}
 assert.equal(s.newcomer.finished,true);const [loaded]=decodeBackup(encodeBackup([s]));assert.equal(syncNewcomer(loaded),0);assert.equal(loaded.player.spiritStones,42);
});
test('atomic concurrent completion and reload cannot duplicate rewards, failures roll back progress and money',async()=>{
 const {api,get}=apiFor(make('atomic-newcomer'));await api.create(get());
 await Promise.all(Array.from({length:8},()=>api.mutate(s=>markNewcomer(s,'feed'))));
 assert.equal((await readSave('atomic-newcomer')).player.spiritStones,22);
 await assert.rejects(api.mutate(s=>{markNewcomer(s,'pill');throw new Error('failed purchase')}));
 assert.ok(!(await readSave('atomic-newcomer')).newcomer.done.includes('pill'));
 await api.select('atomic-newcomer');await api.refresh();assert.equal(get().player.spiritStones,22);
 const other=make('other-newcomer','筑基一层');await writeSave(other);await api.select(other.slot);await Promise.all([api.refresh(),api.refresh()]);assert.equal(get().player.spiritStones,42);await api.select('atomic-newcomer');assert.equal(get().player.spiritStones,22);
});
test('practice pays after settlement, including zero bricks, never merely for entry',async()=>{
 const {api,get}=apiFor(make('newcomer-practice'));await api.create(get());const start=await api.startPractice();assert.equal(get().player.spiritStones,17);assert.ok(!get().newcomer.done.includes('practice'));
 await api.finishPractice(start.result,0,get().slot);assert.equal(get().player.spiritStones,19);assert.ok(get().newcomer.done.includes('practice'));await assert.rejects(api.finishPractice(start.result,0,get().slot));
});
test('only successful weapon repair counts; armour, full durability, unaffordable repair and tempering do not',()=>{
 const s=make();addItem(s,'iron-sword');addItem(s,'cloth-robe');const [sword,robe]=s.inventory;
 assert.throws(()=>repairEquipment(s,sword.uid));sword.durability=18;s.player.spiritStones=0;assert.throws(()=>repairEquipment(s,sword.uid));assert.ok(!s.newcomer?.done.includes('repair'));
 s.player.spiritStones=20;robe.durability=18;repairEquipment(s,robe.uid);assert.ok(!s.newcomer?.done.includes('repair'));repairEquipment(s,sword.uid);assert.ok(s.newcomer.done.includes('repair'));
 const own=make();own.player.sect='天工阁';own.techniques.mastered=['mending'];addItem(own,'iron-sword');addItem(own,'ore',20);const weapon=own.inventory[0];weapon.durability=19;temperEquipment(own,weapon.uid);assert.ok(!own.newcomer?.done.includes('repair'));weapon.durability=19;repairOwnEquipment(own,weapon.uid);assert.ok(own.newcomer.done.includes('repair'));
});
test('feeding works for a non-Wanling player, empty chests count, ordinary strolls do not',()=>{
 const s=make();addItem(s,'healing-herb');feedPeakBeast(s,SPIRIT_PEAK_BEASTS[0].id,s.inventory[0].uid);assert.equal(syncNewcomer(s),2);
 drawBlackMarket(s,1,'newcomer-chest');assert.equal(syncNewcomer(s),2);drawBlackMarket(s,1,'newcomer-chest');assert.equal(syncNewcomer(s),0);
 takeStroll(s,'market',Date.now(),()=>.99);assert.ok(!s.newcomer.done.includes('encounter'));
 takeStroll(s,'sects',Date.now(),()=>0);assert.ok(s.newcomer.done.includes('encounter'));assert.equal(syncNewcomer(s),2);
});
test('map task records viewing a real opponent, Danxia purchase records success only and guide links work',async t=>{
 const document=dom(t);const {api,get}=apiFor(make('newcomer-map'));await api.create(get());const map=createMapUI({getSave:get,actions:api,activate:()=>{}});
 map.openGuide('monsters');assert.ok(!get().newcomer.done.includes('travel'));
 await document.querySelector('[data-encounter]').onclick();
 assert.ok(get().newcomer.done.includes('travel'));assert.ok(document.querySelector('[data-foe]'));assert.equal(get().battle,undefined);
 map.openGuide('danxia');const pillButton=document.querySelector('[data-sect-buy]'),pillId=pillButton.dataset.sectBuy;
 await api.mutate(s=>{s.player.spiritStones=0});await pillButton.onclick();assert.ok(!get().newcomer.done.includes('pill'));
 await api.mutate(s=>{s.player.spiritStones=20;purchase(s,pillId)});assert.ok(!get().newcomer.done.includes('pill'));
 await pillButton.onclick();assert.ok(get().newcomer.done.includes('pill'));
 for(const target of ['market','blackmarket','tiangong','stroll','spirit-peak']){document.getElementById('xg-feature-sheet')?.remove();map.openGuide(target);assert.ok(document.querySelector('#xg-content').textContent||document.querySelector('#xg-feature-sheet'))}
});
test('island expands, supports future tasks, collapses on navigation, survives refresh and vanishes on completion',async t=>{
 const document=dom(t);let s=make('island');syncNewcomer(s);const calls=[];const root=document.getElementById('island');const ui=createNewcomerUI({root,getSave:()=>s,navigate:async target=>calls.push(target)});ui.render();assert.equal(root.hidden,false);assert.equal(root.querySelector('.xg-newcomer-toggle').getAttribute('aria-expanded'),'false');
 root.querySelector('.xg-newcomer-toggle').click();root.querySelector('[data-task="feed"]').click();assert.match(root.querySelector('.xg-newcomer-current').textContent,/灵兽峰/);ui.render();assert.equal(root.querySelector('.xg-newcomer-toggle').getAttribute('aria-expanded'),'true');
 await root.querySelector('[data-go]').onclick();assert.deepEqual(calls,['spirit-peak']);assert.equal(root.querySelector('.xg-newcomer-toggle').getAttribute('aria-expanded'),'false');
 s.player.realm='炼气三层';syncNewcomer(s);ui.render();assert.equal(root.hidden,true);
 s=make('fresh-slot');syncNewcomer(s);ui.render();assert.equal(root.hidden,false);assert.match(root.querySelector('.xg-newcomer-current').textContent,/求取法门/);
 let closed=false;const sheet=showGameGuide(()=>closed=true);assert.equal(sheet.querySelectorAll('details').length,12);assert.match(sheet.textContent,/三十分钟/);sheet.querySelector('[data-close]').click();assert.equal(closed,true);assert.equal(sheet.isConnected,false);
});
