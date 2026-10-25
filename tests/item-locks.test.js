import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {addItem,setItemLocked,saleUnitPrice,sellInventoryBatch,sellEquipment,sellMaterial,sellPill,sellExtra,discardEquipment,discardJunk,equipItem,usePill} from '../systems/inventory.js';
import {giftableEntries,giveCompanionGift} from '../systems/relationships.js';
import {renderInventory,showSell} from '../ui/inventory.js';
function make(){
 const s=migrateSave({slot:'locked-items',player:{realm:'炼气一层',spiritRoot:'金灵根',spiritStones:20},inventory:[]});
 const entries={};for(const id of ['iron-sword','ore','small-heal-pill','calming-jade','burnt-talisman']){addItem(s,id,id==='iron-sword'?1:3);entries[id]=s.inventory.at(-1)}
 return {s,entries};
}
test('every sale and discard route rejects a locked entry without mutation; unlock restores selling',()=>{
 const methods=[['iron-sword',sellEquipment],['iron-sword',discardEquipment],['ore',sellMaterial],['small-heal-pill',sellPill],['calming-jade',sellExtra],['burnt-talisman',discardJunk]];
 for(const [id,fn] of methods){const {s,entries}=make(),uid=entries[id].uid;setItemLocked(s,uid,true);const before=structuredClone(s);assert.throws(()=>fn(s,uid,1),/上锁/);assert.deepEqual(s,before);assert.equal(saleUnitPrice(s,entries[id]),null);setItemLocked(s,uid,false);assert.doesNotThrow(()=>fn(s,uid,1))}
});
test('a stale mixed batch fails atomically if one selected item was subsequently locked',async()=>{
 globalThis.indexedDB=indexedDB;const {s,entries}=make(),picks=[{uid:entries.ore.uid,quantity:2},{uid:entries['calming-jade'].uid,quantity:1}];
 await writeSave(s);await updateSave(s.slot,next=>{setItemLocked(next,entries['calming-jade'].uid,true);return next});
 const before=await readSave(s.slot);await assert.rejects(updateSave(s.slot,next=>{sellInventoryBatch(next,picks);return next}),/上锁/);assert.deepEqual(await readSave(s.slot),before);
});
test('lock survives serialization and migration, applies to new stack additions, and blocks gifts',()=>{
 let {s,entries}=make();const uid=entries['calming-jade'].uid;setItemLocked(s,uid,true);s=migrateSave(JSON.parse(JSON.stringify(s)));addItem(s,'calming-jade',2);
 assert.equal(s.inventory.find(e=>e.uid===uid).quantity,5);assert.equal(s.inventory.find(e=>e.uid===uid).locked,true);assert.ok(!giftableEntries(s).some(e=>e.uid===uid));
 const before=structuredClone(s);assert.throws(()=>giveCompanionGift(s,{affinity:0},uid,[],()=>''),/上锁/);assert.deepEqual(s,before);
 setItemLocked(s,uid,false);assert.ok(giftableEntries(s).some(e=>e.uid===uid));
});
test('locking is per unique item, permits equipment and normal use, and validates stale ids',()=>{
 const {s,entries}=make();addItem(s,'iron-sword');const second=s.inventory.at(-1);setItemLocked(s,entries['iron-sword'].uid,true);
 assert.equal(second.locked,undefined);assert.notEqual(saleUnitPrice(s,second),null);equipItem(s,entries['iron-sword'].uid);assert.equal(s.equipment.weapon,entries['iron-sword'].uid);
 const pill=entries['small-heal-pill'];setItemLocked(s,pill.uid,true);s.player.hp=1;usePill(s,pill.uid);assert.equal(pill.quantity,2);assert.equal(pill.locked,true);
 const before=structuredClone(s);assert.throws(()=>setItemLocked(s,'missing',true));assert.throws(()=>setItemLocked(s,second.uid,'yes'));assert.deepEqual(s,before);
});
test('item detail locks/unlocks, restores buttons on failure, excludes locks from select-all and market',async t=>{
 const previous=globalThis.document,{document,Event}=parseHTML('<main id="xg-panel"><div id="xg-content"></div></main>');globalThis.document=document;t.after(()=>globalThis.document=previous);
 const {s,entries}=make();let fail=false;
 const api={getSave:()=>s,activate:()=>{},closeFeature:()=>document.querySelector('#xg-feature-sheet')?.remove(),actions:{mutate:async(fn)=>{if(fail)throw Error('写入失败');return {result:fn(s)}}}};
 const click=async selector=>{const el=document.querySelector(selector);assert.ok(el,selector);el.dispatchEvent(new Event('click'));await new Promise(resolve=>setImmediate(resolve))};
 renderInventory(api);await click(`[data-item="${entries.ore.uid}"]`);fail=true;await click('[data-item-lock]');assert.equal(entries.ore.locked,undefined);assert.equal(document.querySelector('[data-item-lock]').disabled,false);assert.match(document.querySelector('#xg-feature-sheet [role=status]').textContent,/写入失败/);
 fail=false;await click('[data-item-lock]');assert.equal(entries.ore.locked,true);assert.equal(document.querySelector('[data-stack-sale]'),null);assert.equal(document.querySelector('[data-item-lock]').getAttribute('aria-pressed'),'true');assert.match(document.querySelector(`[data-item="${entries.ore.uid}"]`).textContent,/已上锁/);
 api.closeFeature();await click('[data-batch-sale]');assert.equal(document.querySelector(`[data-item="${entries.ore.uid}"]`).disabled,true);await click('[data-select-all]');assert.equal(document.querySelector(`[data-item="${entries.ore.uid}"]`).getAttribute('aria-pressed'),'false');
 await click('[data-cancel-sale]');showSell(api);assert.equal(document.querySelector(`[data-material="${entries.ore.uid}"]`),null);
 api.closeFeature();renderInventory(api);await click(`[data-item="${entries.ore.uid}"]`);await click('[data-item-lock]');assert.equal(entries.ore.locked,false);assert.ok(document.querySelector('[data-stack-sale]'));
});
