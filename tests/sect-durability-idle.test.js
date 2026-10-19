import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {migrateSave} from '../storage/migrations.js';
import {addItem,maxDurability,saleUnitPrice,equipmentName} from '../systems/inventory.js';
import {temperEquipment,repairOwnEquipment} from '../systems/sect-progression.js';
import {idleLimitMs,settleIdle} from '../systems/cultivation.js';
import {showSectWorkshop} from '../ui/sect-progression.js';
const start=new Date(2026,9,19).getTime(),hour=3600000;
const make=()=>migrateSave({slot:'temper',player:{sect:'天工阁',realm:'炼气一层',spiritRoot:'金灵根',stats:{福缘:5},cultivation:0,companions:[]},inventory:[],techniques:{mastered:['mending','basic-qi-guide'],main:'basic-qi-guide',combat:[],puzzles:{}}},start);
test('each companion adds half an hour; real idle earnings, pills, archive and reload stack',()=>{
 for(let n=0;n<=3;n++){
  const s=make();s.player.companions=['沈砚','云枝','燕停云'].slice(0,n);
  assert.equal(idleLimitMs(s),(2+n*.5)*hour);
  assert.equal(settleIdle(s,start+8*hour),(2+n*.5)*30);
  const loaded=migrateSave(JSON.parse(JSON.stringify(s)),start+8*hour);assert.equal(settleIdle(loaded,start+9*hour),0);
 }
 const s=make();s.player.companions=['沈砚','云枝','燕停云'];s.techniques.main='archive-meditation';s.techniques.mastered.push('archive-meditation');
 assert.equal(idleLimitMs(s),4.5*hour);s.player.realm='筑基一层';assert.equal(idleLimitMs(s),6.5*hour);
 s.player.companions.pop();assert.equal(idleLimitMs(s),6*hour);
 const p=make();p.player.companions=['沈砚','云枝','燕停云'];p.qiPillDay=p.idle.day;assert.equal(settleIdle(p,start+8*hour),120);
});
test('tempering twice persists per item, changes repairs and sale eligibility, preserves special base durability',()=>{
 const s=make();addItem(s,'iron-sword');addItem(s,'iron-sword');addItem(s,'ore',40);const sword=s.inventory[0],other=s.inventory[1];sword.durability=12;
 temperEquipment(s,sword.uid);assert.equal(sword.durability,17);assert.equal(maxDurability(sword),25);assert.equal(maxDurability(other),20);assert.equal(saleUnitPrice(s,sword),null);
 temperEquipment(s,sword.uid);assert.equal(sword.durability,22);assert.equal(maxDurability(sword),30);
 const before=JSON.stringify(s);assert.throws(()=>temperEquipment(s,sword.uid),/两次/);assert.equal(JSON.stringify(s),before);
 const loaded=migrateSave(JSON.parse(before));const item=loaded.inventory[0];assert.equal(item.durability,22);assert.equal(maxDurability(item),30);
 repairOwnEquipment(loaded,item.uid);assert.equal(item.durability,30);assert.equal(loaded.inventory.find(e=>e.itemId==='ore').quantity,14);assert.equal(saleUnitPrice(loaded,item),2);
 loaded.equipment.weapon=item.uid;assert.match(equipmentName(loaded,'weapon'),/30\/30/);
 addItem(loaded,'library-duster');const duster=loaded.inventory.at(-1);temperEquipment(loaded,duster.uid);assert.equal(maxDurability(duster),20);
});
test('tempering requires inheritance, no battle, correct ore, and leaves failures unchanged',()=>{
 const s=make();addItem(s,'foundation-wild-sword');addItem(s,'ore',20);const item=s.inventory[0];
 for(const change of [()=>{},()=>{s.techniques.mastered=[]},()=>{s.techniques.mastered=['mending'];s.battle={}}]){
  change();const before=JSON.stringify(s);assert.throws(()=>temperEquipment(s,item.uid));assert.equal(JSON.stringify(s),before);
 }
 s.battle=null;addItem(s,'foundation-ore',10);temperEquipment(s,item.uid);assert.equal(item.durability,25);assert.equal(s.inventory.find(e=>e.itemId==='ore').quantity,20);
});
test('concurrent last upgrade is applied once',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();addItem(s,'iron-sword');addItem(s,'ore',30);const id=s.inventory[0].uid;temperEquipment(s,id);await writeSave(s);
 const results=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,next=>{temperEquipment(next,id);return next})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const loaded=await readSave(s.slot);assert.equal(maxDurability(loaded.inventory[0]),30);assert.equal(loaded.inventory.find(e=>e.itemId==='ore').quantity,10);
});
test('workshop button performs upgrade and disables at limit',async t=>{
 const previous=globalThis.document;globalThis.document=parseHTML('<div id="xg-panel"></div>').document;t.after(()=>{globalThis.document=previous});
 const s=make();addItem(s,'iron-sword');addItem(s,'ore',20);const api={getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})}};
 showSectWorkshop(api,'tiangong',()=>{});await document.querySelector('[data-temper]').onclick();assert.equal(s.inventory[0].durability,25);
 await document.querySelector('[data-temper]').onclick();assert.equal(s.inventory[0].durability,30);assert.equal(document.querySelector('[data-temper]').disabled,true);
});
