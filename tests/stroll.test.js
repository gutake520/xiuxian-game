import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {STROLL_PLACES} from '../data/stroll.js';
import {strollPlaces,strollCount,takeStroll} from '../systems/stroll.js';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {createMapUI} from '../ui/map.js';
import {showStroll} from '../ui/stroll.js';
const now=new Date(2026,9,18,12).getTime();
const make=()=>migrateSave({slot:'stroll-test',player:{realm:'炼气一层',spiritRoot:'金灵根',spiritStones:20},inventory:[]},now);
test('stroll locations follow realm access and exclude encounter residences',()=>{
 const s=make();s.yanTingyun={unlocked:true};assert.equal(strollPlaces(s).length,5);
 const before=structuredClone(s);for(const id of ['foundation','yan-hill','unknown'])assert.throws(()=>takeStroll(s,id,now));assert.deepEqual(s,before);
 s.player.realm='筑基一层';assert.equal(strollPlaces(s).length,6);assert.doesNotThrow(()=>takeStroll(s,'foundation',now));
});
test('ten visits shared across locations persist on reload and reset the following day; no rewards',()=>{
 const s=make(),player=structuredClone(s.player),inventory=structuredClone(s.inventory);
 for(let i=0;i<10;i++)takeStroll(s,strollPlaces(s)[i%5].id,now);
 const loaded=migrateSave(JSON.parse(JSON.stringify(s)),now),before=structuredClone(loaded);
 assert.equal(strollCount(loaded,now),10);assert.throws(()=>takeStroll(loaded,'market',now));assert.deepEqual(loaded,before);
 assert.deepEqual(s.player,player);assert.deepEqual(s.inventory,inventory);
 takeStroll(loaded,'market',now+86400000);assert.equal(strollCount(loaded,now+86400000),1);assert.ok(loaded.stroll.last.text);
});
test('all thirty approved stories can be drawn, battle visits do not consume quota',()=>{
 for(const p of STROLL_PLACES){assert.equal(p.stories.length,5);const s=make();s.player.realm='筑基一层';for(let i=0;i<5;i++)assert.equal(takeStroll(s,p.id,now,()=>i/5).text,p.stories[i])}
 const s=make();s.battle={};const before=structuredClone(s);assert.throws(()=>takeStroll(s,'market',now));assert.deepEqual(s,before);
});
test('concurrent last visits cannot exceed the daily allowance',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();for(let i=0;i<9;i++)takeStroll(s,'market',now);await writeSave(s);
 const results=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,next=>{takeStroll(next,'market',now);return next})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(strollCount(await readSave(s.slot),now),10);
});
test('map entry opens without consuming, persists result, returns and restores buttons after errors',async t=>{
 const {document}=parseHTML('<html><body><main id="xg-panel"><div id="xg-content"></div></main></body></html>');const previous=globalThis.document;globalThis.document=document;t.after(()=>{globalThis.document=previous});
 const s=make();let fail=false;const api={getSave:()=>s,activate:()=>{},actions:{mutate:async fn=>{if(fail)throw new Error('写入失败');return{result:fn(s)}}}};
 const map=createMapUI(api);map.render();document.querySelector('[data-stroll]').click();assert.equal(s.stroll,undefined);assert.equal(document.querySelectorAll('[data-stroll-place]').length,5);
 fail=true;await document.querySelector('[data-stroll-place]').onclick();assert.equal(s.stroll,undefined);assert.equal(document.querySelector('[data-stroll-place]').disabled,false);
 fail=false;await document.querySelector('[data-stroll-place]').onclick();assert.equal(strollCount(s),1);assert.match(document.body.textContent,new RegExp(s.stroll.last.text.slice(0,8)));
 document.querySelector('[data-close]').click();assert.equal(document.querySelector('#xg-feature-sheet'),null);document.querySelector('[data-stroll]').click();assert.equal(strollCount(s),1);
 s.player.realm='筑基一层';showStroll(api,()=>{});assert.equal(document.querySelectorAll('[data-stroll-place]').length,6);
 for(let i=1;i<10;i++)takeStroll(s,'market');showStroll(api,()=>{});assert.ok([...document.querySelectorAll('[data-stroll-place]')].every(b=>b.disabled));
});
