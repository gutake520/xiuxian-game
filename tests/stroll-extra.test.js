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
test('open stroll sheet refreshes at midnight and on resume without writes, and stops after closing',async t=>{
 const old=globalThis.document;const {document,window}=parseHTML('<html><body><section id="xg-panel"></section></body></html>');globalThis.document=document;
 t.after(()=>{globalThis.document=old});
 let clock=now,timer,delay,writes=0;
 t.mock.method(Date,'now',()=>clock);
 t.mock.method(globalThis,'setTimeout',(fn,ms)=>{timer=fn;delay=ms;return 123});
 const clear=t.mock.method(globalThis,'clearTimeout',()=>{});
 const s=make();buyStrollEncounter(s);buyStrollEncounter(s);takeStroll(s,'spirit-peak',clock,()=>0);const puzzle=structuredClone(s.peakPuzzle);
 const api={getSave:()=>s,actions:{mutate:async fn=>{writes++;return {result:fn(s)}}}};
 showStroll(api,()=>{});const sheet=document.querySelector('#xg-feature-sheet');
 assert.equal(document.querySelector('[data-buy-encounter]').disabled,true);assert.ok(delay>=60000&&delay<=60100);
 clock=new Date(2026,9,24).getTime();timer();
 assert.equal(document.querySelector('#xg-feature-sheet'),sheet);assert.match(sheet.textContent,/今日奇遇 0 \/ 7/);assert.match(sheet.textContent,/今日已购 0 \/ 2/);assert.equal(document.querySelector('[data-buy-encounter]').disabled,false);assert.equal(writes,0);assert.deepEqual(s.peakPuzzle,puzzle);
 await document.querySelector('[data-buy-encounter]').onclick();assert.equal(s.player.spiritStones,40);assert.equal(writes,1);assert.match(document.body.textContent,/今日奇遇 0 \/ 8/);
 clock=new Date(2026,9,25,8).getTime();document.dispatchEvent(new window.Event('visibilitychange'));
 assert.match(document.body.textContent,/今日奇遇 0 \/ 7/);assert.equal(writes,1);
 const queued=timer;document.querySelector('[data-close]').click();await Promise.resolve();queued();window.dispatchEvent(new window.Event('focus'));
 assert.equal(document.querySelector('#xg-feature-sheet'),null);assert.ok(clear.mock.calls.length>0);assert.equal(writes,1);
});
