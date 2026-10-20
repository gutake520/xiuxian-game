import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {migrateSave} from '../storage/migrations.js';
import {addCultivation,FOUNDATION_REALMS,FOUNDATION_REQUIREMENTS,realmProgress,applyRealmHp} from '../data/realms.js';
import {equipmentStats,purchase,equipItem} from '../systems/inventory.js';
import {beginBattle,playRound} from '../systems/combat.js';
import {idleRate,settleIdle} from '../systems/cultivation.js';
import {advanceTreasure} from '../systems/treasure.js';
import {createMapUI} from '../ui/map.js';
import {showShop} from '../ui/inventory.js';
const now=new Date(2026,9,20).getTime();
function make(realm='筑基一层'){
 return migrateSave({slot:'foundation-complete',player:{name:'测试',realm,spiritRoot:'金灵根',stats:{福缘:5},cultivation:0,spiritStones:500,hp:34,mp:13,foundationBonus:{attack:2,defense:.4,mp:1,critRate:1,dodgeRate:1},combat:{hp:30,mp:12,attack:4.5,defense:1,speed:3,critRate:0,dodgeRate:0}},realmHpBonusApplied:4,realmMpBonusApplied:1,inventory:[],equipment:{},techniques:{mastered:['basic-qi-guide'],main:'basic-qi-guide',combat:[]},bossLine:{phase:'defeated',insight:true}},now);
}
test('all ten levels grow, cap only at full tenth level, and losses can be recovered',()=>{
 const s=make(),base=equipmentStats(s);
 for(let i=0;i<9;i++){addCultivation(s,FOUNDATION_REQUIREMENTS[i]);assert.equal(s.player.realm,FOUNDATION_REALMS[i+1]);assert.equal(realmProgress(s.player).complete,false)}
 const end=equipmentStats(s);assert.equal(end.maxHp-base.maxHp,18);assert.equal(end.maxMp-base.maxMp,4);assert.equal(end.speed-base.speed,2.7);assert.equal(Math.round((end.attack-base.attack)*100),270);
 assert.equal(addCultivation(s,9000),4000);assert.equal(s.player.cultivation,4000);assert.equal(addCultivation(s,30),0);
 s.player.cultivation-=70;assert.equal(addCultivation(s,70),70);assert.equal(s.player.cultivation,4000);
});
test('old third level loads and continues without repeat healing or lost equipment',()=>{
 const s=make('筑基三层');s.player.cultivationRequired=null;const loaded=migrateSave(structuredClone(s),now);assert.equal(loaded.player.cultivationRequired,1800);
 const hp=loaded.player.hp,mp=loaded.player.mp;for(let i=0;i<3;i++)migrateSave(loaded,now);assert.equal(loaded.player.hp,hp);assert.equal(loaded.player.mp,mp);
 addCultivation(loaded,1800);assert.equal(loaded.player.realm,'筑基四层');assert.equal(loaded.player.hp,hp+2);
});
test('offline settlement matches daily settlement across the fourth-layer rate change',()=>{
 const a=make('筑基三层');a.player.cultivation=1790;const b=structuredClone(a);
 const end=new Date(2026,9,23).getTime();settleIdle(a,end);
 for(let day=21;day<=23;day++)settleIdle(b,new Date(2026,9,day).getTime());
 assert.deepEqual(a.player,b.player);assert.equal(a.player.realm,'筑基四层');assert.equal(idleRate(a),1.5);
});
test('combat and shop enforce unlocks; bought gear contributes speed and can be equipped',()=>{
 const s=make('筑基三层');assert.throws(()=>beginBattle(s,'rock-ape-mid'),/筑基四层/);assert.throws(()=>purchase(s,'foundation-mid-shoes'),/境界不足/);
 s.player.realm='筑基四层';purchase(s,'foundation-mid-shoes');const before=equipmentStats(s).speed;equipItem(s,s.inventory[0].uid);assert.equal(equipmentStats(s).speed,before+3.6);
 beginBattle(s,'rock-ape-mid');assert.equal(s.battle.mp,3);s.battle=null;assert.throws(()=>beginBattle(s,'claw-wolf-human'),/筑基八层/);
});
test('foundation human retaliation ends before treasure advances and late equipment drops',t=>{
 t.mock.method(Math,'random',()=>0);
 const s=make('筑基九层');s.player.combat.attack=100;s.player.combat.speed=100;
 s.treasure={route:[{monsterId:'cloud-falcon',name:'穿云涧'}],step:0};
 beginBattle(s,'cloud-falcon-human');playRound(s);assert.ok(s.battle?.retaliation);assert.equal(s.treasure.step,0);playRound(s);assert.equal(s.battle,null);assert.equal(s.treasure.step,1);
 assert.ok(s.inventory.some(e=>e.itemId==='foundation-late-sword'));assert.equal(advanceTreasure(s,{id:s.lastBattle.id,monsterId:'cloud-falcon-human'}),false);
});
test('warden defeat can be retried, victory grants one charm, overflow is preserved and rematch is blocked',t=>{
 t.mock.method(Math,'random',()=>.99);
 const s=make('筑基十层');s.player.hp=1;beginBattle(s,'foundation-warden');playRound(s,'skip');assert.equal(s.lastBattle.outcome,'defeat');assert.equal(s.foundationEnding,undefined);
 s.player.hp=50;s.player.combat.attack=100;s.player.combat.speed=100;s.inventory=Array.from({length:20},(_,i)=>({uid:'full'+i,itemId:'ore',quantity:1}));
 beginBattle(s,'foundation-warden');playRound(s);assert.equal(s.foundationEnding.defeated,true);assert.equal(s.temporaryLoot.filter(e=>e.itemId==='foundation-completion-charm').length,1);assert.equal(s.battle,null);assert.throws(()=>beginBattle(s,'foundation-warden'),/罢战/);
 const loaded=migrateSave(structuredClone(s),now);assert.equal(loaded.foundationEnding.defeated,true);
});
test('map hides locked opponents, unlocks ending at tenth level and shop filters equipment',t=>{
 const previous=globalThis.document;const {document}=parseHTML('<html><body><section id="xg-panel"><main id="xg-content"></main></section></body></html>');globalThis.document=document;t.after(()=>globalThis.document=previous);
 let s=make('筑基三层');const api={getSave:()=>s,activate:()=>{},actions:{}};const map=createMapUI(api);
 const open=()=>{map.render();document.querySelector('[data-map="foundation"]').click()};open();assert.equal(document.querySelector('[data-foundation="foundation-ending"]'),null);document.querySelector('[data-foundation="rock-hollow"]').click();assert.equal(document.querySelectorAll('[data-foundation-foe]').length,1);
 s.player.realm='筑基七层';open();document.querySelector('[data-foundation="rock-hollow"]').click();assert.equal(document.querySelectorAll('[data-foundation-foe]').length,3);
 s.player.realm='筑基十层';open();assert.ok(document.querySelector('[data-foundation="foundation-ending"]'));s.foundationEnding={defeated:true};s.player.cultivation=4000;document.querySelector('[data-foundation="foundation-ending"]').click();assert.match(document.body.textContent,/筑基圆满/);assert.match(document.body.textContent,/金丹篇 · 待开放/);
 s.player.realm='筑基三层';showShop(api);assert.equal(document.querySelector('[data-buy="foundation-mid-shoes"]'),null);s.player.realm='筑基七层';showShop(api);assert.ok(document.querySelector('[data-buy="foundation-late-shoes"]'));
});
