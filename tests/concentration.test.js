import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {canEnterDongxia,askGoldenCoreMaster} from '../systems/foundation-story.js';
import {maybeFindConcentration,playConcentration,concentrationReward} from '../systems/concentration.js';
import {takeStroll,strollPlaces,strollEncounterCount} from '../systems/stroll.js';
import {showConcentration} from '../ui/concentration.js';
import {showMasterTeaching} from '../ui/master-teaching.js';
import {createMapUI} from '../ui/map.js';
const make=()=>migrateSave({slot:'concentration-test',player:{realm:'金丹一层',sect:'青岚谷',spiritRoot:'木灵根',spiritStones:20},inventory:[]});
const ready=()=>{const s=make();askGoldenCoreMaster(s);maybeFindConcentration(s,()=>.1);return s};
test('realm alone, clue and legacy visit do not unlock; master conversation persists independently of old quests',()=>{
 let s=make();s.dongxiaVisited=true;s.foundationStory={phase:'searched',dongxiaClue:true};assert.equal(canEnterDongxia(s),false);assert.ok(!strollPlaces(s).some(p=>p.id==='dongxia'));assert.throws(()=>takeStroll(s,'dongxia'));
 s.player.realm='筑基十层';assert.throws(()=>askGoldenCoreMaster(s));s.player.realm='金丹一层';assert.match(askGoldenCoreMaster(s),/出去闯天下/);s=migrateSave(structuredClone(s));assert.equal(canEnterDongxia(s),true);s.player.realm='元婴一层';assert.equal(canEnterDongxia(s),true);
});
test('20 percent boundary, quota, pending puzzle and shuffled permutation',()=>{
 const s=make();askGoldenCoreMaster(s);assert.equal(maybeFindConcentration(s,()=>.2),false);takeStroll(s,'dongxia',Date.now(),()=>.1999);assert.equal(strollEncounterCount(s),1);assert.deepEqual([...s.concentration.numbers].sort((a,b)=>a-b),Array.from({length:36},(_,i)=>i+1));const id=s.concentration.id;takeStroll(s,'dongxia',Date.now(),()=>0);assert.equal(s.concentration.id,id);assert.equal(strollEncounterCount(s),1);
 s.concentration=null;s.stroll.encounters=7;takeStroll(s,'dongxia',Date.now(),()=>0);assert.equal(s.concentration,null);
});
test('reward thresholds, unlimited completion, wrong clicks, abandon and no duplicate rewards',()=>{
 for(const [ms,reward] of [[40000,20],[40001,15],[60000,15],[60001,10],[90000,10],[90001,5],[120000,5],[120001,2],[86400000,2]]){
  assert.equal(concentrationReward(ms),reward);let s=ready(),id=s.concentration.id;playConcentration(s,id,'start',null,1000);for(let n=1;n<=35;n++)playConcentration(s,id,'pick',n,1000);s=migrateSave(structuredClone(s));playConcentration(s,id,'pick',36,1000+ms);assert.equal(s.player.spiritStones,20+reward);assert.throws(()=>playConcentration(s,id,'pick',36));assert.equal(s.player.spiritStones,20+reward);
 }
 const s=ready(),id=s.concentration.id;assert.throws(()=>playConcentration(s,id,'pick',1));playConcentration(s,id,'start');playConcentration(s,id,'pick',2);assert.equal(s.concentration.phase,'lost');assert.equal(s.player.spiritStones,20);playConcentration(s,id,'dismiss');assert.equal(s.concentration,null);
 const a=ready();playConcentration(a,a.concentration.id,'abandon');assert.equal(a.player.spiritStones,20);
});
test('concurrent last clicks award only once and survive saved reload',async t=>{
 const old=globalThis.indexedDB;globalThis.indexedDB=indexedDB;t.after(()=>globalThis.indexedDB=old);
 const s=ready(),id=s.concentration.id;playConcentration(s,id,'start',null,0);for(let n=1;n<36;n++)playConcentration(s,id,'pick',n,1);await writeSave(s);
 const outcomes=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,s=>{playConcentration(s,id,'pick',36,40000);return s})));assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal((await readSave(s.slot)).player.spiritStones,40);
});
test('UI hides before master dialogue, unlocks map, conceals ready board, resumes and recovers failed writes',async t=>{
 const {document}=parseHTML('<html><body><div id="xg-panel"><main id="xg-content"></main></div></body></html>');const old=globalThis.document;globalThis.document=document;t.after(()=>globalThis.document=old);
 let s=make(),fail=false;const api={getSave:()=>s,actions:{mutate:async(fn)=>{if(fail)throw Error('保存失败');const next=structuredClone(s),result=fn(next);s=next;return {result}}}};
 const map=createMapUI({...api,activate:()=>{}});map.render();assert.equal(document.querySelector('[data-map="dongxia"]'),null);
 showMasterTeaching(api,()=>{});document.querySelector('[data-golden-core]').click();await new Promise(r=>setImmediate(r));assert.match(document.body.textContent,/出去闯天下/);map.render();assert.ok(document.querySelector('[data-map="dongxia"]'));document.querySelector('#xg-feature-sheet')?.remove();
 maybeFindConcentration(s,()=>0);showConcentration(api,()=>{});assert.equal(document.querySelectorAll('[data-number]').length,0);await document.querySelector('[data-action="start"]').onclick();assert.equal(document.querySelectorAll('[data-number]').length,36);
 fail=true;await document.querySelector('[data-number="1"]').onclick();assert.equal(s.concentration.next,1);assert.equal(document.querySelector('[data-number="1"]').disabled,false);fail=false;await document.querySelector('[data-number="1"]').onclick();assert.equal(s.concentration.next,2);const started=s.concentration.startedAt;
 showConcentration(api,()=>{});assert.equal(s.concentration.startedAt,started);assert.equal(document.querySelector('[data-number="1"]').disabled,true);await document.querySelector('[data-number="3"]').onclick();assert.match(document.body.textContent,/未扣除/);document.querySelector('#xg-feature-sheet')?.remove();
});
