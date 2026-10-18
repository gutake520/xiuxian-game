import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {indexedDB} from 'fake-indexeddb';
import {SPIRIT_PEAK_BEASTS,SPIRIT_PEAK_ACHIEVEMENT} from '../data/spirit-peak.js';
import {feedPeakBeast,peakFeedCount} from '../systems/spirit-peak.js';
import {sectEligibility} from '../systems/sect-eligibility.js';
import {showSpiritPeak} from '../ui/spirit-peak.js';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
const now=new Date(2026,9,18,12).getTime(),day=86400000;
const make=()=>migrateSave({slot:'peak-test',player:{realm:'炼气一层',spiritRoot:'金灵根',spiritStones:0},inventory:[{uid:'grass',itemId:'spirit-herb',quantity:200},{uid:'high',itemId:'foundation-qi-herb',quantity:4},{uid:'ore',itemId:'ore',quantity:5}]},now);
const sect={id:'wanling',roots:['木','土','风']};
test('peak uses herbs of either realm, rejects ore and continues after completion',()=>{
 const s=make();feedPeakBeast(s,'jiuwei','high',now);assert.equal(s.inventory[1].quantity,3);
 const before=structuredClone(s);assert.throws(()=>feedPeakBeast(s,'jiuwei','ore',now));assert.deepEqual(s,before);
 for(let i=1;i<20;i++)feedPeakBeast(s,'jiuwei','grass',now);
 feedPeakBeast(s,'jiuwei','grass',now+day);assert.equal(s.spiritPeak.feeding.jiuwei,21);const full=structuredClone(s);
 assert.throws(()=>feedPeakBeast(s,'missing','grass',now+day));assert.deepEqual(s,full);
});
test('daily cap is shared by all beasts and persists across reload, resetting on new day',()=>{
 const s=make();for(let i=0;i<20;i++)feedPeakBeast(s,SPIRIT_PEAK_BEASTS[i%12].id,'grass',now);
 const copy=JSON.parse(JSON.stringify(s));assert.throws(()=>feedPeakBeast(copy,'jingwei','grass',now));assert.equal(peakFeedCount(copy,now),20);
 feedPeakBeast(copy,'jingwei','grass',now+day);assert.equal(peakFeedCount(copy,now+day),1);assert.equal(copy.spiritPeak.feeding.jingwei,3);
});
test('fifth distinct completed beast unlocks permanent achievement and mandatory admission',()=>{
 const s=make();for(let b=0;b<5;b++){
  for(let i=0;i<20;i++)feedPeakBeast(s,SPIRIT_PEAK_BEASTS[b].id,'grass',now+b*day);
  assert.equal(sectEligibility(s,sect).join,b===4);
 }
 assert.ok(s.achievements.unlocked.includes(SPIRIT_PEAK_ACHIEVEMENT));assert.equal(s.achievements.claimed.includes(SPIRIT_PEAK_ACHIEVEMENT),false);
 const copy=migrateSave(JSON.parse(JSON.stringify(s)),now+6*day);assert.equal(sectEligibility(copy,sect).join,true);
 for(const root of ['木灵根','风灵根','雷灵根']){const fresh=make();fresh.player.spiritRoot=root;assert.equal(sectEligibility(fresh,sect).join,false)}
 assert.equal(sectEligibility(make(),{id:'tiangong',roots:['金','火']}).join,true);
});
test('concurrent final feeds commit only once',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();s.spiritPeak={feeding:{jiuwei:19},day:'2026-10-18',used:19};await writeSave(s);
 const outcomes=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,next=>{feedPeakBeast(next,'jiuwei','grass',now);return next})));
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);const saved=await readSave(s.slot);assert.equal(saved.inventory[0].quantity,199);assert.equal(saved.spiritPeak.feeding.jiuwei,20);
});
test('UI completes into CG, can replay, and restores controls after failed persistence',async t=>{
 const {document}=parseHTML('<html><body><main id="xg-panel"></main></body></html>');const previous=globalThis.document;globalThis.document=document;t.after(()=>{globalThis.document=previous});
 const save=make();save.spiritPeak={feeding:{jiuwei:19}};let fail=true;
 const api={getSave:()=>save,actions:{mutate:async fn=>{if(fail)throw new Error('写入失败');return{result:fn(save)}}}};
 showSpiritPeak(api,()=>{},'jiuwei');await document.querySelector('[data-feed]').onclick();assert.match(document.querySelector('[role=status]').textContent,/写入失败/);assert.equal(document.querySelector('[data-feed]').disabled,false);
 fail=false;await document.querySelector('[data-feed]').onclick();assert.match(document.body.textContent,/九尾藏月/);
 document.querySelector('[data-return]').onclick();assert.ok(document.querySelector('[data-feed]'));
 document.querySelector('[data-scene]').click();assert.match(document.body.textContent,/九尾藏月/);
});
