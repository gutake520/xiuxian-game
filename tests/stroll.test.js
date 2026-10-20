import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {STROLL_PLACES} from '../data/stroll.js';
import {strollPlaces,strollCount,strollEncounterCount,takeStroll} from '../systems/stroll.js';
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
test('unlimited ordinary visits survive reload and daily count resets',()=>{
 const s=make(),player=structuredClone(s.player);
 for(let i=0;i<100;i++)takeStroll(s,'market',now,()=>.99);
 const loaded=migrateSave(JSON.parse(JSON.stringify(s)),now);
 assert.equal(strollCount(loaded,now),100);assert.equal(strollEncounterCount(loaded,now),0);
 takeStroll(loaded,'market',now,()=>0);assert.equal(strollCount(loaded,now),101);
 assert.deepEqual(s.player,player);
 takeStroll(loaded,'market',now+86400000);assert.equal(strollCount(loaded,now+86400000),1);
});
test('treasure, sokoban and maze share seven daily encounters; gossip and pending games do not consume them',()=>{
 const s=make();
 takeStroll(s,'blackmarket',now,()=>0);assert.equal(strollEncounterCount(s,now),1);
 takeStroll(s,'blackmarket',now,()=>.99);assert.equal(strollEncounterCount(s,now),1);
 takeStroll(s,'spirit-peak',now,()=>0);assert.equal(s.peakPuzzle.kind,'sokoban');assert.equal(strollEncounterCount(s,now),2);
 takeStroll(s,'spirit-peak',now,()=>0);assert.equal(strollEncounterCount(s,now),2);
 s.peakPuzzle=null;takeStroll(s,'spirit-peak',now,()=>.1);assert.equal(s.peakPuzzle.kind,'maze');assert.equal(strollEncounterCount(s,now),3);
 takeStroll(s,'market',now,()=>0);assert.equal(strollEncounterCount(s,now),4);
 takeStroll(s,'blackmarket',now,()=>0);assert.equal(strollEncounterCount(s,now),5);
 s.peakPuzzle=null;takeStroll(s,'spirit-peak',now,()=>0);s.treasure=null;takeStroll(s,'blackmarket',now,()=>0);
 const loaded=migrateSave(JSON.parse(JSON.stringify(s)),now);loaded.peakPuzzle=null;loaded.treasure=null;
 for(let i=0;i<20;i++)takeStroll(loaded,i%2?'blackmarket':'spirit-peak',now,()=>0);
 assert.equal(loaded.peakPuzzle,null);assert.equal(loaded.treasure,null);assert.equal(strollEncounterCount(loaded,now),7);
 takeStroll(loaded,'blackmarket',now+86400000,()=>0);assert.ok(loaded.treasure);assert.equal(strollEncounterCount(loaded,now+86400000),1);
 const old=make();old.stroll={day:s.stroll.day,count:10};takeStroll(old,'blackmarket',now,()=>0);assert.equal(strollEncounterCount(old,now),1);
});
test('all thirty approved stories can be drawn, battle visits do not consume quota',()=>{
 for(const p of STROLL_PLACES){assert.equal(p.stories.length,5);const s=make();s.player.realm='筑基一层';for(let i=0;i<5;i++){let roll=0;assert.equal(takeStroll(s,p.id,now,()=>roll++===0?i/5+.1:.99).text,p.stories[i])}}
 const s=make();s.battle={};const before=structuredClone(s);assert.throws(()=>takeStroll(s,'market',now));assert.deepEqual(s,before);
});
test('concurrent visits cannot exceed seven encounters',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();takeStroll(s,'market',now,()=>.99);s.stroll.encounters=6;await writeSave(s);
 await Promise.all([ 'blackmarket','spirit-peak' ].map(id=>updateSave(s.slot,next=>{takeStroll(next,id,now,()=>0);return next})));
 const stored=await readSave(s.slot);assert.equal(strollEncounterCount(stored,now),7);assert.equal(Number(!!stored.treasure)+Number(!!stored.peakPuzzle),1);
});
test('map entry opens without consuming, persists result, returns and restores buttons after errors',async t=>{
 const {document}=parseHTML('<html><body><main id="xg-panel"><div id="xg-content"></div></main></body></html>');const previous=globalThis.document;globalThis.document=document;t.after(()=>{globalThis.document=previous});
 const s=make();let fail=false;const api={getSave:()=>s,activate:()=>{},actions:{mutate:async fn=>{if(fail)throw new Error('写入失败');return{result:fn(s)}}}};
 const map=createMapUI(api);map.render();document.querySelector('[data-stroll]').click();assert.equal(s.stroll,undefined);assert.equal(document.querySelectorAll('[data-stroll-place]').length,5);
 fail=true;await document.querySelector('[data-stroll-place]').onclick();assert.equal(s.stroll,undefined);assert.equal(document.querySelector('[data-stroll-place]').disabled,false);
 fail=false;await document.querySelector('[data-stroll-place]').onclick();assert.equal(strollCount(s),1);assert.match(document.body.textContent,new RegExp(s.stroll.last.text.slice(0,8)));
 document.querySelector('[data-close]').click();assert.equal(document.querySelector('#xg-feature-sheet'),null);document.querySelector('[data-stroll]').click();assert.equal(strollCount(s),1);
 s.player.realm='筑基一层';showStroll(api,()=>{});assert.equal(document.querySelectorAll('[data-stroll-place]').length,6);
 s.stroll.encounters=5;for(let i=1;i<20;i++)takeStroll(s,'market');showStroll(api,()=>{});assert.ok([...document.querySelectorAll('[data-stroll-place]')].every(b=>!b.disabled));
});
