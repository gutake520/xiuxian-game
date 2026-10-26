import test from 'node:test';
import {indexedDB} from 'fake-indexeddb';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {GOLDEN_REQUIREMENTS,addCultivation,realmProgress} from '../data/realms.js';
import {migrateSave} from '../storage/migrations.js';
import {equipmentStats,addItem,sellExtra,purchase} from '../systems/inventory.js';
import {drawBlackMarket} from '../systems/black-market.js';
import {startLearning,completeLearning,toggleCombatTechnique} from '../systems/techniques.js';
import {beginBattle,playRound} from '../systems/combat.js';
import {buyStrollEncounter,strollEncounterLimit,strollExtraCount} from '../systems/stroll.js';
import {leaveSect,SECT_REJOIN_DELAY} from '../systems/sect-membership.js';
import {generateHex,solveHex,advanceBug,startGoldenSecret,moveGoldenSecret,secretEntries,HEX_CELLS} from '../systems/golden-secret.js';
import {showGoldenSecret} from '../ui/golden-secret.js';
import {createMapUI} from '../ui/map.js';
const now=new Date(2026,9,26,12).getTime();
const make=()=>migrateSave({slot:'golden',dongxiaUnlocked:true,player:{name:'试验',realm:'金丹一层',sect:'青岚谷',spiritRoot:'金水双灵根',cultivation:0,spiritStones:1000,hp:50,mp:20,combat:{hp:50,mp:20,attack:5,defense:0,speed:8,critRate:0,dodgeRate:0},goldenCoreHpBonus:0,goldenCoreBonus:{attack:0,defense:0,speed:0,mp:0,critRate:0,dodgeRate:0}},inventory:[],techniques:{mastered:[],combat:[],puzzles:{}},bagCapacity:20},now);
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
test('golden thresholds carry surplus and old accumulated saves; per-layer stats stay fixed',()=>{
 const s=make(),stats=equipmentStats(s);s.player.cultivation=4999;assert.equal(addCultivation(s,2),2);assert.equal(s.player.realm,'金丹二层');assert.equal(s.player.cultivation,1);assert.deepEqual(equipmentStats(s),stats);
 s.player.realm='金丹一层';s.player.cultivation=12000;migrateSave(s,now);assert.equal(s.player.realm,'金丹三层');assert.equal(s.player.cultivation,1000);assert.deepEqual(equipmentStats(s),stats);
 const t=make();assert.equal(addCultivation(t,1e6),GOLDEN_REQUIREMENTS.reduce((a,b)=>a+b));assert.equal(t.player.realm,'金丹十层');assert.equal(t.player.cultivation,15000);assert.ok(realmProgress(t.player).complete);assert.equal(addCultivation(t,100),0);migrateSave(t,now);assert.equal(t.player.cultivation,15000);
});
test('golden buys a third daily chance for thirty; leaving costs six hundred with same delay',()=>{
 const s=make();for(let i=0;i<3;i++)buyStrollEncounter(s,now);assert.equal(s.player.spiritStones,930);assert.equal(strollEncounterLimit(s,now),10);assert.throws(()=>buyStrollEncounter(s,now));assert.equal(strollExtraCount(s,now+86400000),0);buyStrollEncounter(s,now+86400000);assert.equal(s.player.spiritStones,910);leaveSect(s,now);assert.equal(s.player.spiritStones,310);assert.equal(s.sectRejoinAt,now+SECT_REJOIN_DELAY);
});
test('Wudeng prices, independent pity, reset and duplicate sell value; advanced study required',t=>{
 t.mock.method(Math,'random',()=>.4);const s=make();s.blackMarket={pity:27};s.dongxiaMarket={pity:65};drawBlackMarket(s,10,'ten',now,true);assert.equal(s.player.spiritStones,964);assert.equal(s.dongxiaMarket.pity,9);assert.equal(s.blackMarket.pity,27);drawBlackMarket(s,10,'ten',now,true);assert.equal(s.player.spiritStones,964);
 const p=startLearning(s,'cogito');assert.equal(p.size,5);assert.throws(()=>completeLearning(s,'cogito'));p.cells=[...p.solution];completeLearning(s,'cogito');toggleCombatTechnique(s,'cogito');assert.ok(s.techniques.combat.includes('cogito'));
 s.dongxiaMarket.pity=65;drawBlackMarket(s,1,'single',now,true);const stones=s.player.spiritStones;sellExtra(s,s.inventory.find(e=>e.itemId==='cogito-manual').uid);assert.equal(s.player.spiritStones,stones+35);assert.throws(()=>purchase(s,'cogito-manual'),/黑市/);
});
test('Wudeng contains exactly foundation/golden materials and existing gifts/junk; overflow kept',t=>{
 for(const [roll,ids] of [[.6,['foundation-ore','golden-ore']],[.9,['foundation-healing-herb','foundation-spirit-herb','foundation-qi-herb','golden-healing-herb','golden-spirit-herb','golden-qi-herb']]])for(let i=0;i<ids.length;i++){
  const s=make();const rolls=[roll,(i+.1)/ids.length];const mock=t.mock.method(Math,'random',()=>rolls.shift()??.9);drawBlackMarket(s,1,'x',now,true);assert.equal(s.inventory[0].itemId,ids[i]);mock.mock.restore();
 }
 const s=make();s.bagCapacity=0;t.mock.method(Math,'random',()=>.6);drawBlackMarket(s,1,'overflow',now,true);assert.equal(s.temporaryLoot.length,1);s.dongxiaUnlocked=false;assert.throws(()=>drawBlackMarket(s,1,'locked',now,true));
});
test('cogito preserves five HP on lethal damage, persists usage through reload, resets next battle',t=>{
 t.mock.method(Math,'random',()=>.99);let s=make();s.techniques.mastered=['cogito'];s.techniques.combat=['cogito'];s.player.hp=5;beginBattle(s,'golden-flame-mastiff');const result=playRound(s,'skip');assert.equal(result.taken,0);assert.equal(s.player.hp,5);assert.ok(s.battle.cogitoUsed);
 s=migrateSave(structuredClone(s),now);playRound(s,'skip');assert.equal(s.lastBattle.outcome,'defeat');s.player.hp=5;beginBattle(s,'golden-flame-mastiff');playRound(s,'skip');assert.equal(s.player.hp,5);
 const unequipped=make();unequipped.player.hp=5;unequipped.techniques.mastered=['cogito'];beginBattle(unequipped,'golden-flame-mastiff');playRound(unequipped,'skip');assert.equal(unequipped.lastBattle.outcome,'defeat');
});
test('random hex boards have multi-step solutions and legal bug movement; bad cells reject',()=>{
 const layouts=new Set();for(let seed=1;seed<=30;seed++){
  let b=generateHex(seeded(seed));layouts.add(b.stones.join(','));const path=solveHex(b);assert.ok(path.length>=5);assert.throws(()=>advanceBug(b,b.bug));assert.throws(()=>advanceBug(b,b.stones[0]));
  for(const cell of path){const prev=b.bug;b=advanceBug(b,cell);if(b.outcome!=='win'){const a=HEX_CELLS[prev],n=HEX_CELLS[b.bug];assert.equal(Math.max(Math.abs(a.q-n.q),Math.abs(a.r-n.r),Math.abs(a.q+a.r-n.q-n.r)),1)}}assert.equal(b.outcome,'win');
 }assert.ok(layouts.size>20);assert.ok(solveHex(generateHex(()=>0)).length>=5);
});
test('secret charges entry only, persists puzzle, rewards once, counts loss and resets daily',()=>{
 let s=make();startGoldenSecret(s,now);assert.equal(s.player.spiritStones,995);const id=s.goldenSecret.id;startGoldenSecret(s,now);assert.equal(s.player.spiritStones,995);const path=solveHex(s.goldenSecret);
 for(const cell of path){s=structuredClone(s);moveGoldenSecret(s,id,s.goldenSecret.turn,cell,now)}assert.equal(s.goldenSecret,null);assert.equal(s.player.spiritStones,1002);assert.equal(s.inventory.length,2);assert.ok(s.inventory.every(e=>e.quantity>=1&&e.quantity<=2));assert.throws(()=>moveGoldenSecret(s,id,0,path[0],now));assert.equal(s.player.spiritStones,1002);
 startGoldenSecret(s,now);const before=structuredClone(s);assert.throws(()=>moveGoldenSecret(s,s.goldenSecret.id,5,0,now));assert.deepEqual(s,before);moveGoldenSecret(s,s.goldenSecret.id,0,'abandon',now);assert.equal(s.player.spiritStones,997);assert.throws(()=>startGoldenSecret(s,now));assert.equal(secretEntries(s,now),2);startGoldenSecret(s,now+86400000);assert.equal(secretEntries(s,now+86400000),1);
 const active=s.goldenSecret.id;startGoldenSecret(s,now+2*86400000);assert.equal(s.goldenSecret.id,active);assert.equal(secretEntries(s,now+2*86400000),0);
});
test('bug reaching an edge loses without rewards; a full bag uses temporary storage',()=>{
 const s=make();s.goldenSecret={id:'loss',turn:0,bug:30,stones:[]};while(s.goldenSecret){const b=s.goldenSecret;const safe=HEX_CELLS.findIndex((c,i)=>i!==b.bug&&!b.stones.includes(i)&&c.q<0);moveGoldenSecret(s,'loss',b.turn,safe,now)}assert.equal(s.lastGoldenSecret.outcome,'loss');assert.equal(s.player.spiritStones,1000);assert.equal(s.inventory.length,0);
 s.bagCapacity=0;startGoldenSecret(s,now);for(const cell of solveHex(s.goldenSecret))moveGoldenSecret(s,s.goldenSecret.id,s.goldenSecret.turn,cell,now);assert.equal(s.temporaryLoot.length,2);
});
test('map exposes both entrances and secret UI supports playable cells and resume',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><main id="xg-content"></main></body></html>').document;t.after(()=>globalThis.document=old);const s=make(),api={getSave:()=>s,activate:()=>{},actions:{mutate:async fn=>({result:fn(s)})}};
 createMapUI(api).render();document.querySelector('[data-map="dongxia"]').click();await new Promise(r=>setImmediate(r));document.querySelector('[data-dongxia-market]').click();assert.match(document.body.textContent,/无灯集/);assert.match(document.querySelector('[data-draw="10"]').textContent,/36/);
 showGoldenSecret(api,()=>{});document.querySelector('[data-enter]').click();await new Promise(r=>setImmediate(r));assert.equal(document.querySelectorAll('[data-cell]').length,61);const path=solveHex(s.goldenSecret);document.querySelector(`[data-cell="${path[0]}"]`).onclick();await new Promise(r=>setImmediate(r));assert.equal(s.goldenSecret.turn,1);showGoldenSecret(api,()=>{});assert.match(document.body.textContent,/第 2 手/);
});

test('atomic duplicate entry and final moves cannot double-charge or double-reward',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();s.slot='golden-atomic';await writeSave(s);
 await Promise.all([1,2].map(()=>updateSave(s.slot,x=>{startGoldenSecret(x,now);return x})));
 let current=await readSave(s.slot);assert.equal(current.player.spiritStones,995);assert.equal(current.goldenSecretEntries,1);
 const path=solveHex(current.goldenSecret);for(const cell of path.slice(0,-1))await updateSave(s.slot,x=>{moveGoldenSecret(x,x.goldenSecret.id,x.goldenSecret.turn,cell,now);return x});
 current=await readSave(s.slot);const {id,turn}=current.goldenSecret;
 const results=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,x=>{moveGoldenSecret(x,id,turn,path.at(-1),now);return x})));
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);current=await readSave(s.slot);assert.equal(current.player.spiritStones,1002);assert.equal(current.inventory.length,2);
});
