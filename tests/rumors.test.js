import test from 'node:test';
import assert from 'node:assert/strict';
import {GENERAL_RUMORS,ROMANCE_RUMORS} from '../data/rumors.js';
import {availableRumors,rumorTier} from '../systems/rumors.js';
import {strollPlaces,takeStroll} from '../systems/stroll.js';
import {maybeFindTreasure} from '../systems/treasure.js';
import {leaveFox,answerFox} from '../systems/foxes.js';
import {leaveYan,answerYan} from '../systems/yan-tingyun.js';
import {migrateSave} from '../storage/migrations.js';
const make=()=>migrateSave({slot:'rumors',player:{name:'言一',realm:'炼气七层',spiritRoot:'金灵根',sect:'无门无派',spiritStones:300},inventory:[]});
test('unmet, rejected, closed and separated characters have no romance rumors',()=>{
 const s=make();assert.deepEqual(availableRumors(s),GENERAL_RUMORS);
 for(const state of [{affinity:100},{met:true,rejected:true,affinity:100},{met:true,romanceEnded:true,affinity:100}]){s.foxes={'pine-summit':state};assert.deepEqual(availableRumors(s),GENERAL_RUMORS)}
 s.yanTingyun={rescues:2,affinity:90};assert.deepEqual(availableRumors(s),GENERAL_RUMORS);
 s.yanTingyun={unlocked:true,closed:true,affinity:90};assert.deepEqual(availableRumors(s),GENERAL_RUMORS);
});
test('each exact affinity band exposes only its own two lines and bonded status overrides affinity',()=>{
 for(const id of Object.keys(ROMANCE_RUMORS))for(const [affinity,tier] of [[0,'initial'],[29,'initial'],[30,'warm'],[59,'warm'],[60,'close'],[89,'close'],[90,'devoted'],[100,'devoted']]){
  const s=make(),state={met:true,unlocked:true,affinity};if(id==='yan-tingyun')s.yanTingyun=state;else s.foxes={[id]:state};
  const expected=ROMANCE_RUMORS[id][tier].map(line=>line.replaceAll('{player}','言一'));assert.deepEqual(availableRumors(s).slice(GENERAL_RUMORS.length),expected);
  state.bonded=true;state.affinity=0;assert.equal(rumorTier(state,true),'bonded');assert.deepEqual(availableRumors(s).slice(GENERAL_RUMORS.length),ROMANCE_RUMORS[id].bonded.map(line=>line.replaceAll('{player}','言一')));
 }
});
test('player names are inserted literally including replacement tokens and follow name changes',()=>{
 const s=make();s.foxes={'pine-summit':{met:true,affinity:30}};s.player.name='$&<小雨>';
 assert.ok(availableRumors(s).slice(10).every(line=>line.includes('$&<小雨>')));s.player.name='新名字';assert.ok(availableRumors(s).slice(10).every(line=>line.includes('新名字')));
});
test('romance rumors disappear after real breakup and return only on reunion, including reload',()=>{
 for(const yan of [true,false]){
  const s=make(),state={met:true,unlocked:true,affinity:100,bonded:true};
  if(yan)s.yanTingyun=state;else s.foxes={'pine-summit':state};s.player.companions=[yan?'燕停云':'沈砚'];
  if(yan)leaveYan(s,1000);else leaveFox(s,'pine-summit',1000);
  const loaded=migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(availableRumors(loaded),GENERAL_RUMORS);
  if(yan)answerYan(loaded,'accept',1000+3*86400000);else answerFox(loaded,'pine-summit','accept',1000+3*86400000);
  assert.equal(availableRumors(loaded).length,12);
 }
});
test('every destination can draw shared romance gossip; treasure keeps priority',()=>{
 const s=make();s.player.realm='筑基一层';s.foxes={'pine-summit':{met:true,affinity:90}};
 for(const place of strollPlaces(s)){
  const rolls=place.id==='blackmarket'?[0,.99,.99,0,.99]:['spirit-peak','market','foundation'].includes(place.id)?[0,.99,0,.99]:[0,0,.99];
  const result=takeStroll(s,place.id,Date.now(),()=>rolls.shift());assert.ok(result.text.includes('言一'));assert.ok(result.text.includes('沈砚'));
 }
 const result=takeStroll(s,'blackmarket',Date.now(),()=>0);assert.ok(s.treasure);assert.match(result.text,/残图/);
});
test('treasure discovery probability uses the new ten-percent boundary',()=>{
 assert.equal(maybeFindTreasure(make(),()=>.099),true);assert.equal(maybeFindTreasure(make(),()=>.1),false);
});
