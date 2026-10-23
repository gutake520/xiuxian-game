import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {buyStrollEncounter,strollExtraCount,strollEncounterLimit,strollEncounterCount} from '../systems/stroll.js';
import {takeStroll} from './helpers/stroll.js';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {showStroll} from '../ui/stroll.js';
const now=new Date(2026,9,23,23,59).getTime();
const make=()=>migrateSave({slot:'extra-test',player:{realm:'炼气一层',spiritStones:100},inventory:[]},now);
test('two purchases charge 40, raise limit to nine and persist through visits and reload',()=>{
 let s=make();assert.equal(strollEncounterLimit(s,now),7);
 buyStrollEncounter(s,now);assert.equal(strollEncounterLimit(s,now),8);
 buyStrollEncounter(s,now);assert.equal(s.player.spiritStones,60);
 for(let i=0;i<9;i++){s.peakPuzzle=null;takeStroll(s,'spirit-peak',now,()=>0)}
 assert.equal(strollEncounterCount(s,now),9);
 s=migrateSave(JSON.parse(JSON.stringify(s)),now);assert.equal(strollExtraCount(s,now),2);
 s.peakPuzzle=null;takeStroll(s,'spirit-peak',now,()=>0);assert.equal(s.peakPuzzle,null);
 const before=structuredClone(s);assert.throws(()=>buyStrollEncounter(s,now),/两次/);assert.deepEqual(s,before);
});
test('midnight expires unused purchases and restores two purchases without changing pending games',()=>{
 const s=make();buyStrollEncounter(s,now);takeStroll(s,'spirit-peak',now,()=>0);const pending=structuredClone(s.peakPuzzle);
 const midnight=new Date(2026,9,24,0,0).getTime();
 assert.equal(strollEncounterLimit(s,midnight),7);assert.equal(strollExtraCount(s,midnight),0);assert.equal(strollEncounterCount(s,midnight),0);
 buyStrollEncounter(s,midnight);assert.equal(strollEncounterLimit(s,midnight),8);assert.equal(s.player.spiritStones,60);assert.deepEqual(s.peakPuzzle,pending);
});
test('insufficient funds and battle reject without mutations; exactly 20 succeeds',()=>{
 for(const funds of [19.9,NaN]){const s=make();s.player.spiritStones=funds;const before=structuredClone(s);assert.throws(()=>buyStrollEncounter(s,now),/灵石不足/);assert.deepEqual(s,before)}
 const s=make();s.battle={};const before=structuredClone(s);assert.throws(()=>buyStrollEncounter(s,now),/战斗/);assert.deepEqual(s,before);
 s.battle=null;s.player.spiritStones=20;buyStrollEncounter(s,now);assert.equal(s.player.spiritStones,0);
});
test('serialized concurrent purchases never charge beyond two and survive storage reload',async()=>{
 globalThis.indexedDB=indexedDB;await writeSave(make());
 const results=await Promise.allSettled(Array.from({length:4},()=>updateSave('extra-test',s=>{buyStrollEncounter(s,now);return s})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,2);
 const s=await readSave('extra-test');assert.equal(s.player.spiritStones,60);assert.equal(strollEncounterLimit(s,now),9);
});
test('purchase UI guards double clicks, shows errors and refreshes quota until capped',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><section id="xg-panel"></section></body></html>').document;t.after(()=>{globalThis.document=old});
 const s=make();let calls=0,release;
 const api={getSave:()=>s,actions:{mutate:async fn=>{calls++;await new Promise(r=>release=r);return {result:fn(s)}}}};
 showStroll(api,()=>{});
 let b=document.querySelector('[data-buy-encounter]');let pending=b.onclick();await b.onclick();assert.equal(calls,1);release();await pending;
 assert.equal(s.player.spiritStones,80);assert.match(document.body.textContent,/今日奇遇 0 \/ 8/);
 s.player.spiritStones=0;b=document.querySelector('[data-buy-encounter]');pending=b.onclick();release();await pending;assert.match(document.querySelector('[role=status]').textContent,/灵石不足/);assert.equal(b.disabled,false);
 s.player.spiritStones=20;pending=b.onclick();release();await pending;
 assert.equal(document.querySelector('[data-buy-encounter]').disabled,true);assert.match(document.body.textContent,/今日奇遇 0 \/ 9/);
});
