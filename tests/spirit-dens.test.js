import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {indexedDB} from 'fake-indexeddb';
import {SPIRIT_PEAK_BEASTS} from '../data/spirit-peak.js';
import {SPIRIT_DENS} from '../data/spirit-dens.js';
import {feedPeakBeast,peakDenUnlocked,namePeakBeast,playWithPeakBeast,peakRecoveryUsed} from '../systems/spirit-peak.js';
import {showSpiritPeak} from '../ui/spirit-peak.js';
import {migrateSave} from '../storage/migrations.js';
import {equipmentStats} from '../systems/inventory.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
const now=new Date(2026,9,18,12).getTime();
const make=()=>migrateSave({slot:'den-test',player:{realm:'炼气一层',spiritRoot:'金灵根',spiritStones:0},inventory:[{uid:'grass',itemId:'spirit-herb',quantity:200}],spiritPeak:{feeding:{jiuwei:49}}},now);
test('50th cumulative feed unlocks home once without leaking hidden counts',()=>{
 const s=make();assert.equal(peakDenUnlocked(s,'jiuwei'),false);
 const first=feedPeakBeast(s,'jiuwei','grass',now);assert.equal(first.denUnlocked,true);assert.doesNotMatch(first.message,/49|50|20|喂养值/);
 const second=feedPeakBeast(s,'jiuwei','grass',now);assert.equal(second.denUnlocked,false);assert.equal(peakDenUnlocked(s,'jiuwei'),true);
 const copy=migrateSave(JSON.parse(JSON.stringify(s)),now);assert.equal(copy.spiritPeak.feeding.jiuwei,51);
 assert.equal(copy.spiritPeak.used,2);
});
test('locked homes reject naming and playing without changing save; names validate and persist',()=>{
 const s=make(),before=structuredClone(s);
 assert.throws(()=>namePeakBeast(s,'jiuwei','白白'));assert.throws(()=>playWithPeakBeast(s,'jiuwei',now));assert.deepEqual(s,before);
 s.spiritPeak.feeding.jiuwei=50;
 for(const value of ['', '   ', '<b>猫</b>', '一'.repeat(13),'猫\n猫'])assert.throws(()=>namePeakBeast(s,'jiuwei',value));
 namePeakBeast(s,'jiuwei','  白白  ');assert.equal(migrateSave(JSON.parse(JSON.stringify(s)),now).spiritPeak.names.jiuwei,'白白');
});
test('each beast restores mana once per day, full mana preserves opportunity and replay never restores',()=>{
 const s=make(),max=equipmentStats(s).maxMp;s.spiritPeak.feeding.jiuwei=50;s.player.mp=max;
 assert.equal(playWithPeakBeast(s,'jiuwei',now).restored,0);assert.equal(peakRecoveryUsed(s,'jiuwei',now),false);
 s.player.mp=max-1;assert.equal(playWithPeakBeast(s,'jiuwei',now).restored,1);assert.equal(s.player.mp,max);
 s.player.mp=0;assert.equal(playWithPeakBeast(s,'jiuwei',now).restored,0);assert.equal(s.player.mp,0);
 assert.equal(playWithPeakBeast(s,'jiuwei',now+86400000).restored,Math.round(max*.2*100)/100);
 const copy=migrateSave(JSON.parse(JSON.stringify(s)),now+86400000);assert.equal(peakRecoveryUsed(copy,'jiuwei',now+86400000),true);
});
test('all twelve beasts have independent daily rewards and three distinct scenes',()=>{
 const s=make();const titles=new Set();
 for(const beast of SPIRIT_PEAK_BEASTS){
  assert.equal(SPIRIT_DENS[beast.id].scenes.length,3);s.spiritPeak.feeding[beast.id]=50;s.player.mp=0;
  for(let i=0;i<3;i++){const result=playWithPeakBeast(s,beast.id,now,()=>i/3);assert.equal(result.index,i);assert.equal(result.restored>0,i===0);titles.add(SPIRIT_DENS[beast.id].scenes[i][0])}
 }
 assert.equal(Object.keys(s.spiritPeak.playedDay).length,12);assert.equal(titles.size,36);
});
test('concurrent play requests cannot double restore mana',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();s.spiritPeak.feeding.jiuwei=50;s.player.mp=0;await writeSave(s);
 await Promise.all([1,2].map(()=>updateSave(s.slot,next=>{playWithPeakBeast(next,'jiuwei',now);return next})));
 const stored=await readSave(s.slot);assert.equal(stored.player.mp,Math.round(equipmentStats(s).maxMp*.2*100)/100);
});
function mount(t,s){
 const {document}=parseHTML('<html><body><main id="xg-panel"></main></body></html>');const previous=globalThis.document;globalThis.document=document;t.after(()=>{globalThis.document=previous});
 const api={getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})}};return{document,api};
}
test('UI hides cumulative progress, places unlocked home immediately after feed button, names and plays',async t=>{
 const s=make(),{document,api}=mount(t,s);showSpiritPeak(api,()=>{});
 assert.equal(document.querySelector('[data-den]'),null);assert.doesNotMatch(document.body.textContent,/49|50/);
 showSpiritPeak(api,()=>{},'jiuwei');await document.querySelector('[data-feed]').onclick();assert.match(document.body.textContent,/藏月窟/);assert.match(document.body.textContent,/遗失的衣扣/);
 document.querySelector('[data-return]').onclick();assert.ok(document.querySelector('[data-play]'));
 document.querySelector('[data-name]').value='小狐狸';await document.querySelector('[data-name-save]').onclick();assert.equal(s.spiritPeak.names.jiuwei,'小狐狸');assert.match(document.body.textContent,/小狐狸/);
 s.player.mp=0;await document.querySelector('[data-play]').onclick();assert.ok(s.player.mp>0);document.querySelector('[data-return]').onclick();assert.match(document.querySelector('[data-play]').textContent,/今日已回灵/);
 document.querySelector('[data-list]').onclick();const button=document.querySelector('[data-beast="jiuwei"]');assert.equal(button.nextElementSibling.dataset.den,'jiuwei');assert.doesNotMatch(document.body.textContent,/50/);
});
test('failed writes restore UI controls and no stale page is reopened after navigating away',async t=>{
 const s=make(),{document,api}=mount(t,s);s.spiritPeak.feeding.jiuwei=50;
 api.actions.mutate=async()=>{throw new Error('写入失败')};showSpiritPeak(api,()=>{},'jiuwei','den');await document.querySelector('[data-play]').onclick();assert.equal(document.querySelector('[data-play]').disabled,false);assert.match(document.querySelector('[role=status]').textContent,/写入失败/);
 let finish;api.actions.mutate=()=>new Promise(resolve=>{finish=resolve});const pending=document.querySelector('[data-play]').onclick();document.querySelector('#xg-feature-sheet').remove();finish({result:{index:0,restored:0}});await pending;assert.equal(document.querySelector('#xg-feature-sheet'),null);
});
