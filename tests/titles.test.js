import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {syncTitles,equipTitle} from '../systems/titles.js';
import {effectiveStat,beastPower} from '../data/titles.js';
import {SPIRIT_PEAK_BEASTS} from '../data/spirit-peak.js';
import {feedPeakBeast} from '../systems/spirit-peak.js';
import {addCompanion,removeCompanion} from '../systems/relationships.js';
import {sectEligibility} from '../systems/sect-eligibility.js';
import {migrateSave} from '../storage/migrations.js';
import {resolveYanEncounter} from '../systems/yan-tingyun.js';
import {beginBattle,playRound} from '../systems/combat.js';
import {createActions} from '../core/actions.js';
import {writeSave,readSave} from '../storage/saves.js';
import {createMapUI} from '../ui/map.js';
import {showTitles} from '../ui/titles.js';
globalThis.indexedDB=indexedDB;
const now=Date.now();
function make(){return migrateSave({slot:'titles',createdAt:now,player:{name:'测试',realm:'炼气七层',sect:'无门无派',spiritRoot:'金灵根',stats:{魅力:6,福缘:0},cultivation:0,spiritStones:1000,hp:100,mp:20,combat:{hp:100,mp:20,attack:4,defense:1,speed:30,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[],puzzles:{}},bagCapacity:30},now)}
function animals(s,n=10){s.spiritPeak={feeding:Object.fromEntries(SPIRIT_PEAK_BEASTS.slice(0,n).map(b=>[b.id,20]))};syncTitles(s)}
function romances(s){s.foxes={'pine-summit':{romanceEnded:true},'spring-hill':{romanceEnded:true}};s.zhangHuaijin={romanceEnded:true};syncTitles(s)}
test('animal friend requires ten distinct completed animals and unlocks on the final feed',()=>{
 const s=make();animals(s,9);assert.throws(()=>equipTitle(s,'animal-friend'),/尚未/);
 const id=SPIRIT_PEAK_BEASTS[9].id;s.spiritPeak.feeding[id]=19;s.spiritPeak.feeding[SPIRIT_PEAK_BEASTS[0].id]=200;
 syncTitles(s);assert.equal(s.titles.unlocked.includes('animal-friend'),false);
 s.inventory.push({uid:'herb',itemId:'healing-herb',quantity:1});feedPeakBeast(s,id,'herb',now);
 assert.ok(s.titles.unlocked.includes('animal-friend'));equipTitle(s,'animal-friend');
 assert.equal(migrateSave(JSON.parse(JSON.stringify(s)),now).player.equippedTitle,'animal-friend');
});
test('partner history survives separation and reload, and counts people rather than weddings',()=>{
 let s=make();addCompanion(s,'沈砚',now);removeCompanion(s,'沈砚',100,now);
 addCompanion(s,'沈砚',now+4*86400000);removeCompanion(s,'沈砚',100,now+4*86400000);
 assert.deepEqual(s.titles.companionHistory,['沈砚']);
 addCompanion(s,'云枝',now+8*86400000);removeCompanion(s,'云枝',100,now+8*86400000);
 s=migrateSave(JSON.parse(JSON.stringify(s)),now);assert.equal(s.titles.unlocked.includes('sea-king'),false);
 addCompanion(s,'张怀瑾',now+12*86400000);assert.ok(s.titles.unlocked.includes('sea-king'));
 const before=JSON.stringify(s);assert.throws(()=>addCompanion(s,'燕停云',now+12*86400000),/名额/);assert.equal(JSON.stringify(s),before);
});
test('legacy partners and separated NPC states backfill once, while friendship alone does not',()=>{
 const s=make();romances(s);s.player.companions=[{name:'沈砚'}];s.yanTingyun={unlocked:true,affinity:100};
 for(let i=0;i<3;i++)migrateSave(s,now);
 assert.deepEqual(s.titles.companionHistory,['沈砚','云枝','张怀瑾']);assert.ok(s.titles.unlocked.includes('sea-king'));
});
test('only one title can be worn; charm is derived and admission persists after removal',()=>{
 const s=make();animals(s);romances(s);const sect={id:'hehuan',stat:['魅力',8]};
 assert.equal(sectEligibility(s,sect).join,false);equipTitle(s,'sea-king');
 assert.equal(effectiveStat(s.player,'魅力'),8);assert.equal(s.player.stats.魅力,6);assert.equal(sectEligibility(s,sect).join,true);
 s.player.sect='合欢宗';equipTitle(s,'animal-friend');assert.equal(effectiveStat(s.player,'魅力'),6);assert.equal(s.player.sect,'合欢宗');
 equipTitle(s,null);assert.equal(beastPower(s,'attack','筑基'),.8);
 for(let i=0;i<3;i++){equipTitle(s,'sea-king');migrateSave(s,now);equipTitle(s,null)}
 assert.equal(s.player.stats.魅力,6);
});
test('animal title multiplies actual chase and guard effects for both stages, including rental beasts',t=>{
 t.mock.method(Math,'random',()=>.99);
 for(const stage of ['炼气','筑基'])for(const type of ['attack','guard']){
  const s=make();s.player.realm=stage+'一层';animals(s);equipTitle(s,'animal-friend');
  s[stage==='筑基'?'foundationPetRentals':'petRentals']=1;
  beginBattle(s,stage==='筑基'?'rock-ape':'tough',type);s.battle.hp=100;s.battle.attack=10;s.battle.mp=0;
  const power=type==='attack'?(stage==='筑基'?.96:.6):(stage==='筑基'?.6:.36);
  const r=playRound(s,'skip');assert.equal(s.battle.hp,type==='attack'?100-power:100);
  assert.equal(r.taken,type==='guard'?9-power:9);
  assert.throws(()=>equipTitle(s,null),/战斗中/);
 }
});
test('Yan final choice checks current charm, and successful unlock survives removing title',()=>{
 for(const worn of [true,false]){
  const s=make();romances(s);s.yanTingyun={rescues:2,affinity:0,seen:[]};
  s.yanEncounterPending={id:'final',step:3,highCharm:!worn};
  equipTitle(s,'sea-king');if(!worn)equipTitle(s,null);
  resolveYanEncounter(s,'final','together');assert.equal(Boolean(s.yanTingyun.unlocked),worn);
  equipTitle(s,null);migrateSave(s,now);assert.equal(Boolean(s.yanTingyun.unlocked),worn);
 }
});
test('Yan choice page permits equipping through saved actions and updates the outcome',async t=>{
 const previous=globalThis.document;const {document}=parseHTML('<section id="xg-panel"><main id="xg-content"></main></section>');globalThis.document=document;t.after(()=>{globalThis.document=previous});
 let s=make();romances(s);s.yanTingyun={rescues:2,affinity:0,seen:[]};s.yanEncounterPending={id:'ui-final',step:3,highCharm:false};
 await writeSave(s);const api={getSave:()=>s,actions:createActions({getSave:()=>s,setSave:value=>s=value}),activate:()=>{}};
 const map=createMapUI(api);map.render();document.querySelector('[data-yan-titles]').click();
 await document.querySelector('[data-title="sea-king"]').onclick();
 assert.equal((await readSave('titles')).player.equippedTitle,'sea-king');
 document.querySelector('#xg-feature-sheet [data-close]').click();
 await document.querySelector('[data-yan-answer="together"]').onclick();
 assert.equal(s.yanTingyun.unlocked,true);assert.equal((await readSave('titles')).yanTingyun.unlocked,true);
});
test('title controls expose locked, worn, and switched state with only one bonus',async t=>{
 const previous=globalThis.document;const {document}=parseHTML('<section id="xg-panel"></section>');globalThis.document=document;t.after(()=>{globalThis.document=previous});
 const s=make();const api={getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})}};
 showTitles(api);assert.equal(document.querySelector('[data-title="animal-friend"]').disabled,true);
 animals(s);romances(s);showTitles(api);
 await document.querySelector('[data-title="sea-king"]').onclick();assert.match(document.querySelector('#xg-feature-sheet').textContent,/魅力 8/);
 await document.querySelector('[data-title="animal-friend"]').onclick();assert.match(document.querySelector('#xg-feature-sheet').textContent,/魅力 6/);
 assert.equal(document.querySelector('[data-title="sea-king"]').textContent,'佩戴');assert.equal(document.querySelector('[data-title="animal-friend"]').textContent,'摘下');
});
