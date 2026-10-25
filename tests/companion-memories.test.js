import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {companionMemories} from '../systems/companion-memories.js';
import {showCompanionMemories} from '../ui/companion-memories.js';
const make=()=>({slot:'memories',player:{companions:[]},inventory:[]});
test('unseen affection milestones are not revealed and reading does not change an old save',()=>{
 const s=make();s.foxes={'pine-summit':{met:true,affinity:100,seen:[30]}};s.yanTingyun={unlocked:true,affinity:100,seen:[]};
 const before=structuredClone(s),people=companionMemories(s);assert.deepEqual(people.map(p=>p.name),['沈砚']);assert.deepEqual(people[0].scenes.map(x=>x.id),['intro','at30']);assert.deepEqual(s,before);
 s.foxes['pine-summit'].affinity=0;assert.ok(companionMemories(s)[0].scenes.some(x=>x.id==='at30'));
});
test('all five companions expose recorded intro/milestones and historical bonding survives breakup',()=>{
 const s=make();s.foxes={'pine-summit':{met:true,seen:[30,60,90],romanceEnded:true},'spring-hill':{met:true,seen:[30],bonded:true}};
 s.yanTingyun={introSeen:true,seen:[30,60],bonded:true};s.peiZhaoheng={met:true,seen:[30,60,90]};s.zhangHuaijin={unlocked:true,seen:[30,60,90],bonded:true};
 s.titles={companionHistory:['裴照衡']};const before=structuredClone(s),people=companionMemories(s);assert.equal(people.length,5);
 for(const p of people){assert.ok(p.scenes.some(x=>x.id==='intro'));assert.ok(p.scenes.some(x=>x.id==='accept'));assert.ok(p.scenes.every(x=>typeof x.text==='string'&&x.text.length>0))}
 assert.ok(people.find(p=>p.id==='zhang-huaijin').scenes.some(x=>x.id==='arrival'));assert.deepEqual(s,before);
});
test('current legacy companion objects and recorded rejection are supported without inventing unseen scenes',()=>{
 const s=make();s.player.companions=[{name:'裴照衡'}];s.yanTingyun={introSeen:true,rejected:true,seen:[30]};
 const people=companionMemories(s);assert.deepEqual(people.find(x=>x.id==='pei-zhaoheng').scenes.map(x=>x.id),['proposal','accept']);
 const yan=people.find(x=>x.id==='yan-tingyun');assert.ok(yan.scenes.some(x=>x.id==='reject'));assert.ok(!yan.scenes.some(x=>x.id==='accept'||x.id==='at60'));
});
test('archive reads and returns without invoking actions; stale-slot clicks cannot open another character memories',()=>{
 const old=globalThis.document,{document}=parseHTML('<main id="xg-panel"></main>');globalThis.document=document;
 try{
  const s=make();s.foxes={'pine-summit':{met:true,seen:[30]}};let writes=0,closed=0;
  const before=JSON.stringify(s),api={getSave:()=>s,actions:{mutate:()=>{writes++;throw Error('should never mutate')}}};
  showCompanionMemories(api,()=>closed++);document.querySelector('[data-body]').scrollTop=100;
  document.querySelector('[data-memory-scene="at30"]').click();assert.ok(document.querySelector('.xg-memory-reading'));assert.equal(document.querySelector('[data-body]').scrollTop,0);
  assert.equal(document.querySelector('[data-answer]'),null);document.querySelector('[data-memory-back]').click();assert.equal(document.querySelector('[data-body]').scrollTop,100);
  assert.equal(writes,0);assert.equal(JSON.stringify(s),before);s.slot='other';document.querySelector('[data-memory-scene="intro"]').click();assert.equal(document.querySelector('.xg-memory-reading'),null);
  document.querySelector('[data-close]').click();assert.equal(closed,1);
 }finally{globalThis.document=old}
});
