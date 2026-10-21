import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {expandStorageBag} from '../systems/inventory.js';
import {renderInventory} from '../ui/inventory.js';
globalThis.indexedDB=indexedDB;
const make=(stones=50)=>migrateSave({slot:'bag-expansion',player:{realm:'炼气一层',spiritStones:stones},inventory:[]});
test('expansion costs 50, adds ten slots and persists the one-time limit',()=>{
 const poor=make(49.99),before=structuredClone(poor);assert.throws(()=>expandStorageBag(poor),/灵石不足/);assert.deepEqual(poor,before);
 let s=make();expandStorageBag(s);assert.equal(s.player.spiritStones,0);assert.equal(s.bagCapacity,30);
 s=migrateSave(JSON.parse(JSON.stringify(s)));s.player.spiritStones=100;assert.throws(()=>expandStorageBag(s),/待开放/);assert.equal(s.player.spiritStones,100);assert.equal(s.bagCapacity,30);
});
test('concurrent stored requests charge and expand only once',async()=>{
 await writeSave(make(100));const results=await Promise.allSettled([1,2].map(()=>updateSave('bag-expansion',s=>{expandStorageBag(s);return s})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const s=await readSave('bag-expansion');assert.equal(s.player.spiritStones,50);assert.equal(s.bagCapacity,30);assert.equal(s.bagExpanded,true);
});
test('bag shows cost then refreshes capacity and disables further expansion',async t=>{
 const previous=globalThis.document;globalThis.document=parseHTML('<html><body><main id="xg-content"></main></body></html>').document;t.after(()=>globalThis.document=previous);
 const s=make(),api={getSave:()=>s,activate:()=>{},actions:{mutate:async f=>({result:f(s)})}};renderInventory(api);
 assert.match(document.querySelector('[data-expand]').textContent,/50 灵石/);document.querySelector('[data-expand]').click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(document.querySelectorAll('.xg-bag-empty').length,30);assert.equal(document.querySelector('[data-expand]').disabled,true);assert.match(document.body.textContent,/后续扩充待开放/);
});
