import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {addItem,equipItem,saleUnitPrice,sellInventoryBatch,sellEquipment} from '../systems/inventory.js';
import {renderInventory,showSell} from '../ui/inventory.js';

globalThis.indexedDB=indexedDB;
function make(){
 const save=migrateSave({slot:'batch-sale',player:{realm:'炼气一层',spiritRoot:'金灵根',spiritStones:0},inventory:[]});
 const entries={};for(const [id,quantity] of [['iron-sword',1],['cloth-robe',1],['wild-shoes',1],['ore',3],['small-heal-pill',2],['calming-jade',2],['reset-manual',1],['binding-array',1]]){addItem(save,id,quantity);entries[id]=save.inventory.at(-1)}
 equipItem(save,entries['iron-sword'].uid);entries['cloth-robe'].durability=19;
 return {save,entries};
}
test('mixed batches sell whole selected stacks at the existing prices',()=>{
 const {save,entries}=make();const ids=['wild-shoes','ore','small-heal-pill','calming-jade','reset-manual'];
 const message=sellInventoryBatch(save,ids.map(id=>({uid:entries[id].uid,quantity:entries[id].quantity||1})));
 assert.equal(save.player.spiritStones,37.9);assert.match(message,/5 组/);
 assert.deepEqual(save.inventory.map(e=>e.itemId),['iron-sword','cloth-robe','binding-array']);
 assert.equal(save.equipment.weapon,entries['iron-sword'].uid);
});
test('equipped, damaged, unsellable, duplicate and stale selections leave the whole batch untouched',()=>{
 for(const bad of ['iron-sword','cloth-robe','binding-array','missing','quantity','duplicate']){
  const {save,entries}=make(),ore={uid:entries.ore.uid,quantity:3};
  const second=bad==='missing'?{uid:'gone',quantity:1}:bad==='quantity'?{uid:entries['small-heal-pill'].uid,quantity:3}:bad==='duplicate'?ore:{uid:entries[bad].uid,quantity:1};
  const before=structuredClone(save);assert.throws(()=>sellInventoryBatch(save,[ore,second]));assert.deepEqual(save,before);
 }
 const {save,entries}=make(),before=structuredClone(save);
 assert.throws(()=>sellEquipment(save,entries['iron-sword'].uid),/卸下/);assert.deepEqual(save,before);
 save.battle={id:'fight'};assert.throws(()=>sellInventoryBatch(save,[{uid:entries.ore.uid,quantity:1}]),/战斗/);
});
test('concurrent stored batch sales cannot duplicate proceeds',async()=>{
 const {save,entries}=make();await writeSave(save);const picks=[{uid:entries.ore.uid,quantity:3}];
 const results=await Promise.allSettled([1,2].map(()=>updateSave(save.slot,s=>{sellInventoryBatch(s,picks);return s})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await readSave(save.slot)).player.spiritStones,2.4);
});
function mount(t){
 const {document,Event}=parseHTML('<html><body><section id="xg-panel"><main id="xg-content"></main></section></body></html>');
 const previous=globalThis.document;globalThis.document=document;t.after(()=>{globalThis.document=previous});
 const {save,entries}=make();
 const api={getSave:()=>save,activate:()=>{},closeFeature:()=>document.getElementById('xg-feature-sheet')?.remove(),actions:{mutate:async fn=>({result:fn(save)})}};
 const find=selector=>{const element=document.querySelector(selector);assert.ok(element,selector);return element};
 const click=async selector=>{const element=find(selector);if(!element.disabled)element.dispatchEvent(new Event('click'));await new Promise(resolve=>setImmediate(resolve))};
 return{save,entries,api,document,find,click};
}
test('market hides equipped gear and uses aligned sale cards; equipped item detail has no sale action',async t=>{
 const {api,entries,document,find,click}=mount(t);showSell(api);
 assert.equal(document.querySelector(`[data-sale="${entries['iron-sword'].uid}"]`),null);
 assert.equal(document.querySelector(`[data-discard="${entries['iron-sword'].uid}"]`),null);
 assert.equal(find(`[data-material="${entries.ore.uid}"]`).parentElement.classList.contains('xg-sell-card'),true);
 assert.equal(document.querySelector(`[data-sale="${entries['cloth-robe'].uid}"]`),null);
 api.closeFeature();renderInventory(api);await click(`[data-item="${entries['iron-sword'].uid}"]`);
 assert.equal(document.querySelector('#xg-feature-sheet [data-sale]'),null);assert.equal(find('[data-use]').textContent,'卸下装备');
});
test('bag selection excludes forbidden items, toggles picks, cancels and completes a priced batch',async t=>{
 const {api,entries,save,find,click}=mount(t);renderInventory(api);await click('[data-batch-sale]');
 for(const id of ['iron-sword','cloth-robe','binding-array'])assert.equal(find(`[data-item="${entries[id].uid}"]`).disabled,true);
 await click(`[data-item="${entries.ore.uid}"]`);assert.match(find('[data-sell-selected]').textContent,/1 组 · 2.4 灵石/);
 await click(`[data-item="${entries.ore.uid}"]`);assert.equal(find('[data-sell-selected]').disabled,true);
 await click('[data-select-all]');assert.match(find('[data-sell-selected]').textContent,/5 组 · 37.9 灵石/);
 await click('[data-cancel-sale]');assert.equal(save.inventory.length,8);assert.equal(save.player.spiritStones,0);
 await click('[data-batch-sale]');await click('[data-select-all]');await click('[data-sell-selected]');
 assert.equal(save.player.spiritStones,37.9);assert.equal(save.inventory.length,3);find('[data-batch-sale]');
 assert.match(find('#xg-content [role=status]').textContent,/37.9/);
});
test('newly equipped gear is rejected even if selected earlier; sale failure keeps controls usable',async t=>{
 const {api,entries,save,find,click}=mount(t);renderInventory(api);await click('[data-batch-sale]');await click('[data-select-all]');
 equipItem(save,entries['wild-shoes'].uid);await click('[data-sell-selected]');
 assert.equal(save.player.spiritStones,0);assert.equal(save.inventory.length,8);
 assert.match(find('[role=status]').textContent,/已变化/);assert.equal(find('[data-cancel-sale]').disabled,false);
 assert.equal(saleUnitPrice(save,entries['wild-shoes']),null);
});
