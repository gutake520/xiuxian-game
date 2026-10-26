import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {upgradeGoldenInheritance,enchantWeapon} from '../systems/golden-inheritance.js';
import {brewPill,usePill,equipmentStats,saleUnitPrice} from '../systems/inventory.js';
import {settleRecovery} from '../systems/recovery.js';
import {craftSectItem} from '../systems/sect-progression.js';
import {feedBeast,beastCanFight} from '../systems/pets.js';
import {beastPower} from '../data/titles.js';
import {beginBattle,playRound,useBattleTalisman} from '../systems/combat.js';
import {showSectInheritance,showSectWorkshop} from '../ui/sect-progression.js';
const make=(sect,id)=>({slot:'upgrade',bagCapacity:30,sectPoints:198,dongxiaUnlocked:true,player:{realm:'金丹一层',sect,spiritRoot:'金木双灵根',stats:{魅力:10,根骨:10,悟性:10,神识:10},hp:15,mp:10,spiritStones:20,cultivation:0,combat:{hp:15,mp:10,attack:10,defense:1,speed:30,critRate:0,dodgeRate:0},goldenCoreBonus:{attack:0,defense:0,speed:0,mp:0,critRate:0,dodgeRate:0}},inventory:['golden-healing-herb','golden-spirit-herb','golden-qi-herb','golden-ore'].map((itemId,i)=>({uid:'m'+i,itemId,quantity:30})),equipment:{},techniques:{mastered:[id],combat:[id],sectManuals:[]}});
test('99 points gate and duplicate protection, inheritance UI upgrades',async t=>{
 const s=make('凌霄剑宗','one-sword');s.sectPoints=98;assert.throws(()=>upgradeGoldenInheritance(s,'one-sword'));s.sectPoints=99;
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><section id="xg-panel"></section></body></html>').document;t.after(()=>globalThis.document=old);
 const api={getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})}};showSectInheritance(api,()=>{});await document.querySelector('[data-golden-upgrade]').onclick({currentTarget:document.querySelector('[data-golden-upgrade]')});assert.equal(s.sectPoints,0);assert.throws(()=>upgradeGoldenInheritance(s,'one-sword'));assert.ok(document.querySelector('[data-golden-upgrade]').disabled);
});
test('vital pill adds current values, cannot sell, expires without subtracting damage, two hour cooldown',()=>{
 const s=make('丹霞谷','divine-pharmacopoeia'),now=Date.now();upgradeGoldenInheritance(s,'divine-pharmacopoeia');brewPill(s,'golden-vital-pill');brewPill(s,'golden-vital-pill');const e=s.inventory.find(x=>x.itemId==='golden-vital-pill');assert.equal(saleUnitPrice(s,e),null);usePill(s,e.uid,now);assert.equal(s.player.hp,28);assert.equal(s.player.mp,14);assert.equal(equipmentStats(s,now).maxHp,28);s.player.hp=8;assert.throws(()=>usePill(s,e.uid,now+3600000));settleRecovery(s,now+3600000);assert.equal(s.player.hp,8);assert.equal(equipmentStats(s,now+3600000).maxHp,15);usePill(s,e.uid,now+7200000);assert.equal(s.player.hp,21);
});
test('enchant results stack, consume gold ore even when unchanged, capped per weapon',()=>{
 const s=make('天工阁','mending');upgradeGoldenInheritance(s,'mending');s.inventory.push({uid:'weapon',itemId:'golden-sword',durability:20});s.equipment.weapon='weapon';const before=equipmentStats(s).attack;
 for(const rng of [()=>0,()=>.6,()=>.9])enchantWeapon(s,'weapon',rng);
 assert.equal(s.inventory.find(e=>e.uid==='weapon').enchantCount,3);assert.equal(equipmentStats(s).attack,before);assert.equal(s.inventory.find(e=>e.itemId==='golden-ore').quantity,15);assert.throws(()=>enchantWeapon(s,'weapon'));
});
test('golden dual talisman consumes distinct herbs, daily quota survives reload, damages and guards',()=>{
 const s=make('太虚符宗','fairy-painting');upgradeGoldenInheritance(s,'fairy-painting');craftSectItem(s,'golden-dual-talisman');assert.equal(s.inventory[0].quantity,29);assert.equal(s.inventory[3].quantity,28);assert.throws(()=>craftSectItem(structuredClone(s),'golden-dual-talisman'));beginBattle(s,'golden-rock-rhino');const hp=s.battle.hp;useBattleTalisman(s,'golden-dual-talisman');assert.equal(s.battle.hp,hp-8);assert.equal(s.battle.guard,true);
});
test('golden pets require upgrade and gold herbs, join battle with upgraded power',()=>{
 const s=make('万灵山','beast-keeper');assert.throws(()=>feedBeast(s,'attack','golden-healing-herb'));upgradeGoldenInheritance(s,'beast-keeper');assert.throws(()=>feedBeast(s,'attack','healing-herb'));feedBeast(s,'attack','golden-healing-herb');assert.ok(beastCanFight(s,'attack'));assert.equal(beastPower(s,'attack','金丹'),1.8);assert.equal(beastPower(s,'guard','金丹'),1.5);beginBattle(s,'golden-rock-rhino','attack');assert.equal(s.battle.petStage,'金丹');
});
test('golden idle pill shares daily quota and has matching recipe',()=>{
 const s=make('丹霞谷','divine-pharmacopoeia');brewPill(s,'golden-qi-pill');const e=s.inventory.find(e=>e.itemId==='golden-qi-pill');usePill(s,e.uid);assert.ok(s.goldenPillDay);brewPill(s,'golden-qi-pill');assert.throws(()=>usePill(s,s.inventory.find(e=>e.itemId==='golden-qi-pill').uid,Date.now()+180001));
});
test('upgraded heal restores 3.5 and uses four cooldown rounds',t=>{
 t.mock.method(Math,'random',()=>.99);const s=make('青岚谷','healing-hands');upgradeGoldenInheritance(s,'healing-hands');s.player.hp=2;beginBattle(s,'golden-rock-rhino');s.battle.bindRounds=[1,2,3];playRound(s,'healing-hands');assert.equal(s.player.hp,5.5);assert.equal(s.player.mp,8);assert.equal(s.battle.skillReady['healing-hands'],6);
});
test('workshops expose golden recipes and enchant buttons',t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><section id="xg-panel"></section></body></html>').document;t.after(()=>globalThis.document=old);
 for(const [sect,id,room,selector] of [['丹霞谷','divine-pharmacopoeia','danxia','[data-brew="golden-vital-pill"]'],['太虚符宗','fairy-painting','taixu','[data-craft="golden-dual-talisman"]'],['天工阁','mending','tiangong','[data-enchant]']]){const s=make(sect,id);upgradeGoldenInheritance(s,id);s.inventory.push({uid:'weapon',itemId:'golden-sword',durability:20});showSectWorkshop({getSave:()=>s,actions:{}},room,()=>{});assert.ok(document.querySelector(selector))}
});

test('golden passive rates change actual combat results',t=>{
 t.mock.method(Math,'random',()=>.99);
 for(const [sect,id] of [['凌霄剑宗','one-sword'],['合欢宗','life-steal'],['镇岳宗','resentment']]){
  const base=make(sect,id);base.player.combat.hp=100;base.player.hp=50;beginBattle(base,'golden-rock-rhino');base.battle.hp=100;base.battle.maxHp=100;
  const upgraded=structuredClone(base);upgradeGoldenInheritance(upgraded,id);
  const a=playRound(base,'attack'),b=playRound(upgraded,'attack');
  if(id==='one-sword')assert.ok(b.dealt>a.dealt);
  if(id==='life-steal')assert.ok(upgraded.player.hp>base.player.hp);
  if(id==='resentment')assert.ok(upgraded.battle.hp<base.battle.hp);
 }
});
