import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {ITEMS} from '../data/items.js';
import {GOLDEN_ITEMS} from '../data/golden-economy.js';
import {addItem,purchase,materialSalePrice,equipmentSalePrice,pillSalePrice,usePill,brewPill,equipItem,sellMaterial} from '../systems/inventory.js';
import {beginBattle,playRound} from '../systems/combat.js';
import {GOLDEN_MONSTERS} from '../data/locations.js';
import {showShop} from '../ui/inventory.js';
const make=()=>({slot:'gold-economy',player:{realm:'金丹一层',spiritRoot:'金木双灵根',sect:'丹霞谷',cultivation:0,hp:1,mp:1,spiritStones:100,combat:{hp:73,mp:20,attack:20,defense:10,speed:20,critRate:0,dodgeRate:0},goldenCoreBonus:{attack:0,defense:0,speed:0,critRate:0,dodgeRate:0,mp:0},goldenCoreHpBonus:0},inventory:[],equipment:{},bagCapacity:20,techniques:{mastered:['divine-pharmacopoeia'],combat:[]},dongxiaUnlocked:true});
test('golden resale and prices scale from foundation without profitable buy/sell loop',()=>{
 assert.equal(materialSalePrice(ITEMS['golden-ore']),1.8);assert.equal(materialSalePrice(ITEMS['foundation-ore']),1.2);
 assert.equal(equipmentSalePrice(ITEMS['golden-wild-sword']),5.63);assert.equal(equipmentSalePrice(ITEMS['golden-shoes']),6.75);
 assert.equal(ITEMS['golden-heal-pill'].price,10.13);assert.equal(ITEMS['golden-mixed-pill'].price,7.88);
 for(const item of Object.values(GOLDEN_ITEMS))if(item.price)assert.ok((item.kind==='pill'?pillSalePrice(item):equipmentSalePrice(item))<item.price);
 const s=make();addItem(s,'golden-ore',3);sellMaterial(s,s.inventory[0].uid,3);assert.equal(s.player.spiritStones,105.4);
});
test('purchase, stage gates, healing cap, cooldown and lower-tier reuse',()=>{
 const s=make();s.player.realm='筑基一层';assert.throws(()=>purchase(s,'golden-heal-pill'));s.player.realm='金丹一层';purchase(s,'golden-heal-pill');assert.equal(s.player.spiritStones,89.87);addItem(s,'golden-heal-pill');usePill(s,s.inventory[0].uid,1000);assert.equal(s.player.hp,28);assert.throws(()=>usePill(s,s.inventory[0].uid,1001),/冷却/);s.player.hp=72;usePill(s,s.inventory[0].uid,181000);assert.equal(s.player.hp,73);
 purchase(s,'foundation-late-sword');equipItem(s,s.inventory.at(-1).uid);assert.ok(s.equipment.weapon);purchase(s,'foundation-heal-pill');s.player.hp=1;usePill(s,s.inventory.at(-1).uid);assert.equal(s.player.hp,19);
});
test('golden alchemy consumes only matching herbs and has correct recoveries',()=>{
 const s=make();addItem(s,'golden-healing-herb',2);addItem(s,'golden-spirit-herb',1);brewPill(s,'golden-mixed-pill');assert.equal(s.inventory.length,1);usePill(s,s.inventory[0].uid);assert.equal(s.player.hp,16.75);assert.equal(s.player.mp,7.75);
 addItem(s,'foundation-healing-herb',5);assert.throws(()=>brewPill(s,'golden-heal-pill'),/药草/);
});
test('all golden beasts roll only golden drops, including gear and overflow; no duplicate reward',t=>{
 t.mock.method(Math,'random',()=>0);
 for(const monster of GOLDEN_MONSTERS){const s=make();s.player.realm=monster.minLevel===7?'金丹七层':monster.minLevel===4?'金丹四层':'金丹一层';s.player.hp=73;beginBattle(s,monster.id);s.battle.hp=1;playRound(s);assert.ok(s.inventory.length>=5);assert.ok(s.inventory.every(e=>ITEMS[e.itemId].stage==='金丹'));const before=structuredClone(s);assert.throws(()=>playRound(s));assert.deepEqual(s,before)}
 const s=make();s.bagCapacity=0;beginBattle(s,GOLDEN_MONSTERS[1].id);s.battle.hp=1;playRound(s);assert.ok(s.temporaryLoot.length>0);assert.ok(s.temporaryLoot.every(e=>ITEMS[e.itemId].stage==='金丹'));
});
test('golden shop items are hidden from foundation, buyable in golden realm',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><div id="xg-panel"></div></body></html>').document;t.after(()=>globalThis.document=old);const s=make(),api={getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})}};
 s.player.realm='筑基一层';showShop(api,false,()=>{});assert.equal(document.querySelector('[data-buy="golden-heal-pill"]'),null);s.player.realm='金丹一层';showShop(api,false,()=>{});await document.querySelector('[data-buy="golden-heal-pill"]').onclick();assert.equal(s.inventory[0].itemId,'golden-heal-pill');assert.match(document.body.textContent,/购买成功/);
});
test('golden healing service and repairs scale, golden gear uses matching ore',async()=>{
 const {healingService,repairPrice}=await import('../systems/sect-services.js');const {repairOwnEquipment}=await import('../systems/sect-progression.js');
 assert.deepEqual(healingService({realm:'金丹一层'}),{price:11.25,amount:27,meditationPrice:4.5});
 const s=make();s.player.sect='天工阁';s.techniques.mastered.push('mending');purchase(s,'golden-sword');const weapon=s.inventory[0];weapon.durability=19;assert.equal(repairPrice(weapon),.45);
 addItem(s,'foundation-ore',4);assert.throws(()=>repairOwnEquipment(s,weapon.uid),/赤金矿/);addItem(s,'golden-ore',4);repairOwnEquipment(s,weapon.uid);assert.equal(weapon.durability,20);assert.equal(s.inventory.find(e=>e.itemId==='foundation-ore').quantity,4);
});
