import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {STALL_STORIES} from '../data/stall-sitting.js';
import {maybeFindStallSitting,playStallSitting,stallSittingProgress} from '../systems/stall-sitting.js';
import {takeStroll,strollEncounterCount} from '../systems/stroll.js';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {showStallSitting} from '../ui/stall-sitting.js';
import {showStroll} from '../ui/stroll.js';
const make=()=>migrateSave({slot:'sitting',player:{realm:'炼气一层',spiritRoot:'金灵根',spiritStones:20},inventory:[]});
const rolls=(...values)=>()=>values.shift()??.99;
test('ten authored stories each have a note, clue and three distinct deterministic choices',()=>{
 assert.equal(STALL_STORIES.length,10);assert.equal(new Set(STALL_STORIES.map(s=>s.title)).size,10);
 for(const story of STALL_STORIES){
  assert.ok(story.scene.length>70);assert.ok(story.note&&story.inspect);assert.equal(story.choices.length,3);
  assert.equal(new Set(story.choices.map(c=>c.id)).size,3);assert.equal(new Set(story.choices.map(c=>c.result)).size,3);
  assert.ok(story.choices.every(c=>c.label&&c.result.length>40&&c.bonus>=0&&c.bonus<=2));
 }
});
test('five percent boundary, market-only integration, pending state and shared quota',()=>{
 assert.ok(maybeFindStallSitting(make(),()=>.04999));assert.equal(maybeFindStallSitting(make(),()=>.05),false);
 const s=make(),now=Date.now();takeStroll(s,'market',now,rolls(0,.99,.04999));assert.ok(s.stallSitting);assert.equal(s.stallGames?.gomoku,undefined);assert.equal(strollEncounterCount(s,now),1);
 const initial=structuredClone(s.stallSitting);takeStroll(s,'market',now,()=>.99);assert.deepEqual(s.stallSitting,initial);assert.equal(strollEncounterCount(s,now),1);
 const miss=make();takeStroll(miss,'market',now,rolls(0,.99,.05,.99,.99));assert.equal(miss.stallSitting,undefined);
 const cap=make();cap.stroll={...s.stroll,encounters:7};takeStroll(cap,'market',now,()=>.99);assert.equal(cap.stallSitting,undefined);
 for(const id of ['sects','blackmarket','monsters','spirit-peak']){const other=make();takeStroll(other,id,now,()=>.99);assert.equal(other.stallSitting,undefined)}
});
test('all thirty outcomes pay exactly their authored amount without removing player inventory',()=>{
 for(let index=0;index<10;index++)for(const c of STALL_STORIES[index].choices){
  const s=make();s.stallSittingProgress=index;s.inventory=[{uid:'keepsake',itemId:'guard-talisman',quantity:1}];const inventory=structuredClone(s.inventory);
  maybeFindStallSitting(s,()=>0);const id=s.stallSitting.id;
  playStallSitting(s,id,'choose',c.id);assert.equal(s.player.spiritStones,22+c.bonus);assert.deepEqual(s.inventory,inventory);
  assert.equal(s.stallSitting.text,c.result);assert.equal(stallSittingProgress(s),index+1);assert.equal(s.stallSittingHistory.length,1);
  const done=structuredClone(s);assert.throws(()=>playStallSitting(s,id,'choose',c.id));assert.deepEqual(s,done);
 }
});
test('ten encounters are ordered, inspection and results survive reload, and completion permanently retires the encounter',()=>{
 let s=make();
 for(let i=0;i<10;i++){
  assert.ok(maybeFindStallSitting(s,()=>0));assert.equal(s.stallSitting.index,i);const id=s.stallSitting.id;
  playStallSitting(s,id,'inspect');s=migrateSave(JSON.parse(JSON.stringify(s)));assert.equal(s.stallSitting.inspected,true);
  playStallSitting(s,id,'choose',STALL_STORIES[i].choices[0].id);assert.equal(maybeFindStallSitting(s,()=>0),false);
  s=migrateSave(JSON.parse(JSON.stringify(s)));assert.equal(s.stallSitting.phase,'done');playStallSitting(s,id,'dismiss');assert.equal(s.stallSitting,null);
 }
 assert.equal(s.stallSittingHistory.length,10);s=migrateSave(JSON.parse(JSON.stringify(s)));
 assert.equal(maybeFindStallSitting(s,()=>0),false);const before=structuredClone(s);assert.equal(maybeFindStallSitting(s,()=>0),false);assert.deepEqual(s,before);
 const now=Date.now();takeStroll(s,'market',now,rolls(0,.99,.99,.99));assert.equal(s.stallSitting,null);assert.equal(strollEncounterCount(s,now),0);
});
test('invalid choice, early dismiss, stale ids and battle never advance or pay',()=>{
 const s=make();maybeFindStallSitting(s,()=>0);const id=s.stallSitting.id,before=structuredClone(s);
 for(const [action,choice] of [['choose','unknown'],['dismiss'],['reset']]){assert.throws(()=>playStallSitting(s,id,action,choice));assert.deepEqual(s,before)}
 assert.throws(()=>playStallSitting(s,'stale','choose','test'));assert.deepEqual(s,before);
 s.battle={};assert.throws(()=>playStallSitting(s,id,'inspect'));assert.equal(stallSittingProgress(s),0);
});
test('concurrent choices cannot settle twice; failed transaction preserves the pending story',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();maybeFindStallSitting(s,()=>0);const id=s.stallSitting.id;await writeSave(s);
 await assert.rejects(updateSave(s.slot,next=>{playStallSitting(next,id,'choose','test');throw Error('模拟写入失败')}));
 assert.equal((await readSave(s.slot)).stallSitting.phase,'choosing');
 const outcomes=await Promise.allSettled(['test','chip'].map(choice=>updateSave(s.slot,next=>{playStallSitting(next,id,'choose',choice);return next})));
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);const stored=await readSave(s.slot);assert.equal(stored.stallSittingHistory.length,1);assert.equal(stallSittingProgress(stored),1);assert.equal(stored.player.spiritStones,20+stored.stallSitting.reward);
});
test('UI exposes clues, preserves return/scroll, handles save errors, finishes and cannot write into another slot',async t=>{
 const previous=globalThis.document;globalThis.document=parseHTML('<main id="xg-panel"></main>').document;t.after(()=>globalThis.document=previous);
 const s=make();maybeFindStallSitting(s,()=>0);let fail=false;
 const api={getSave:()=>s,actions:{mutate:async fn=>{if(fail)throw Error('保存失败');return {result:fn(s)}}}};
 showStroll(api,()=>{});document.querySelector('[data-stall-sitting]').click();assert.equal(document.querySelectorAll('[data-sitting-choice]').length,3);
 const body=document.querySelector('[data-body]');body.scrollTop=120;await document.querySelector('[data-sitting-action="inspect"]').onclick();assert.equal(body.scrollTop,120);assert.ok(document.querySelector('.xg-sitting-clue'));
 document.querySelector('[data-close]').click();document.querySelector('[data-stall-sitting]').click();assert.ok(document.querySelector('.xg-sitting-clue'));
 fail=true;await document.querySelector('[data-sitting-choice="test"]').onclick();assert.match(document.querySelector('[role=status]').textContent,/保存失败/);assert.equal(s.stallSitting.phase,'choosing');assert.equal(document.querySelector('[data-sitting-choice="test"]').disabled,false);
 fail=false;s.slot='other';await document.querySelector('[data-sitting-choice="test"]').onclick();assert.equal(s.stallSitting.phase,'choosing');s.slot='sitting';
 await document.querySelector('[data-sitting-choice="test"]').onclick();assert.equal(document.querySelectorAll('[data-sitting-choice]').length,0);assert.equal(document.querySelector('[data-body]').scrollTop,0);assert.match(document.querySelector('.xg-sitting-pay').textContent,/4 灵石/);
 await document.querySelector('[data-sitting-action="dismiss"]').onclick();assert.equal(document.querySelector('[data-stall-sitting]'),null);
 s.stallSittingProgress=9;maybeFindStallSitting(s,()=>0);playStallSitting(s,s.stallSitting.id,'choose','finish');showStallSitting(api,()=>{});assert.match(document.querySelector('.xg-sitting-end').textContent,/不再触发/);document.querySelector('[data-close]').click();
});
