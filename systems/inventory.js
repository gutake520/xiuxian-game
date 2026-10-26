import {goldenInheritance} from './golden-inheritance.js';
import {isGoldenRealm} from './golden-core.js';
import {GOLDEN_RECIPES} from '../data/golden-economy.js';
import {ITEMS,ELEMENTAL_MANUALS} from '../data/items.js';
import {DURABILITY_MAX,TEMP_LOOT_MS} from '../data/balance.js';
import {localDay} from './cultivation.js';
import {realmHpBonus,realmBattleBonus,realmProgress} from '../data/realms.js';
export const itemStageAllowed=(player,item)=>!item?.stage||(item.stage==='金丹'?isGoldenRealm(player):item.stage==='筑基'?(String(player.realm).startsWith('筑基')||isGoldenRealm(player)):true);
export function setItemLocked(save,uid,locked){
 if(save.battle)throw new Error('请先结束战斗。');
 const entry=save.inventory.find(e=>e.uid===uid);
 if(!entry||typeof locked!=='boolean')throw new Error('物品不存在或锁定状态无效。');
 entry.locked=locked;
 return locked?'物品已上锁，不能出售、丢弃或赠礼。':'物品已解锁。';
}
function assertItemUnlocked(save,uid){
 if(save.inventory.find(e=>e.uid===uid)?.locked)throw new Error('物品已上锁，请先在储物详情中解锁。');
}
export function hasManual(save,id='basic-qi-guide'){return Boolean(save.techniques?.awakenedManuals?.includes(id)||save.inventory.some(entry=>ITEMS[entry.itemId]?.methodId===id))}
export const DURABILITY_UPGRADE_COST=10;
export const DURABILITY_UPGRADE_LIMIT=2;
export const durabilityUpgrades=entry=>Number.isInteger(entry?.durabilityUpgrades)?Math.max(0,Math.min(DURABILITY_UPGRADE_LIMIT,entry.durabilityUpgrades)):0;
export const maxDurability=entry=>(ITEMS[entry?.itemId]?.maxDurability??DURABILITY_MAX)+durabilityUpgrades(entry)*5;
export function ownsTechnique(save,id){return save.techniques.mastered.includes(id)||hasManual(save,id)}
export function addItem(save,id,quantity=1){
 const item=ITEMS[id];if(!item)throw new Error('物品不存在。');
 if(!Number.isSafeInteger(quantity)||quantity<1)throw new Error('物品数量无效。');
 if(item.kind==='manual'&&!item.repeatable&&ownsTechnique(save,item.methodId))return false;
 if(item.stackable){const stack=save.inventory.find(entry=>entry.itemId===id);if(stack){stack.quantity=(stack.quantity||1)+quantity;return true}}
 if(save.inventory.length>=save.bagCapacity)throw new Error('储物格已满，暂时无法收下物品。');
 save.itemSerial=(save.itemSerial||0)+1;save.inventory.push({uid:'item-'+save.itemSerial,itemId:id,quantity,...(item.kind==='equipment'?{durability:item.maxDurability??DURABILITY_MAX}:['crafted-binding-array','foundation-crafted-array'].includes(id)?{usesLeft:6}:{})});return true;
}
export function purchase(save,id,sectDiscount=false){
 const item=ITEMS[id];if(!item)throw new Error('商品不存在。');
 if(item.minFoundationLevel&&!isGoldenRealm(save.player)&&realmProgress(save.player).index-9<item.minFoundationLevel)throw new Error('境界不足，尚不能购买这件法器。');
 if(item.blackMarketOnly)throw new Error('这部典籍只能从黑市抽取。');
 if(!Number.isFinite(item.price))throw new Error('此物品不供出售。');
 if(!itemStageAllowed(save.player,item))throw new Error(`灵力尚浅，尚不能购买${item.stage}货品。`);
 const sectOnly=['gamble-manual','steal-manual','only-once-manual'];
 if(sectOnly.includes(id)&&!sectDiscount)throw new Error('这部功法仅在宗门商店出售。');
 if(id==='one-manual'&&sectDiscount)throw new Error('这部功法只在黑市出售。');
 if(sectDiscount&&(![...ELEMENTAL_MANUALS,'strengthen-manual','wall-manual','gamble-manual','steal-manual','breath-manual','charged-manual','only-once-manual','wait-manual'].includes(id)||!save.player.sect||save.player.sect==='无门无派'))throw new Error('仅宗门弟子可购买这部典籍。');
 if(item.kind==='manual'&&!item.repeatable&&ownsTechnique(save,item.methodId))throw new Error('已经拥有这部功法，无需重复购买。');
 const price=sectDiscount?(item.sectPrice??(id==='wait-manual'?30:sectOnly.includes(id)?25:15)):item.price;
 if(save.player.spiritStones<price)throw new Error('灵石不足。');
 addItem(save,id);save.player.spiritStones=Math.round((save.player.spiritStones-price)*100)/100;
 return `购得${item.name}，花费 ${price} 灵石。`;
}
export function equipItem(save,uid){
 const entry=save.inventory.find(entry=>entry.uid===uid),item=ITEMS[entry?.itemId];
 if(!item||item.kind!=='equipment')throw new Error('无法装备这件物品。');
 if(!itemStageAllowed(save.player,item))throw new Error('灵力尚浅，无法驾驭这件法器。');
 if(item.minFoundationLevel&&!isGoldenRealm(save.player)&&realmProgress(save.player).index-9<item.minFoundationLevel)throw new Error('境界不足，尚不能装备这件法器。');
 if(save.battle)throw new Error('战斗中不能换装。');
 if(save.equipment[item.slot]!==uid&&entry.durability<=0)throw new Error('装备已损坏，需修补后使用。');
 const before=equipmentStats(save);
 save.equipment[item.slot]=save.equipment[item.slot]===uid?null:uid;
 const {maxHp,maxMp}=equipmentStats(save);
 save.player.hp=Math.round(Math.max(1,Math.min(maxHp,save.player.hp+maxHp-before.maxHp))*100)/100;
 save.player.mp=Math.round(Math.max(0,Math.min(maxMp,save.player.mp+maxMp-before.maxMp))*100)/100;
}
export function equipmentName(save,slot){const entry=save.inventory.find(e=>e.uid===save.equipment?.[slot]),item=ITEMS[entry?.itemId];return item?`${item.name} ${entry.durability??maxDurability(entry)}/${maxDurability(entry)}${entry.durability<=0?'（损坏）':''}`:'未装备'}
export function equipmentStats(save,now=Date.now()){
 const bonus=realmBattleBonus(save.player);
 const stats={attack:(save.player.combat?.attack||0)+bonus.attack,defense:(save.player.combat?.defense||0)+bonus.defense,speed:(save.player.combat?.speed||0)+(bonus.speed||0),critRate:(save.player.combat?.critRate||0)+bonus.critRate,dodgeRate:(save.player.combat?.dodgeRate||0)+bonus.dodgeRate,maxHp:(save.player.combat?.hp||save.player.hp||20)+realmHpBonus(save.player),maxMp:(save.player.combat?.mp||save.player.mp||10)+bonus.mp};
 for(const uid of Object.values(save.equipment||{})){
  const entry=save.inventory.find(entry=>entry.uid===uid),item=ITEMS[entry?.itemId];if(!item||item.kind!=='equipment'||(entry.durability??DURABILITY_MAX)<=0)continue;
  stats.attack+=entry.enchantAttack||0;
  for(const key of ['attack','defense','speed','critRate','dodgeRate'])stats[key]+=key==='attack'&&entry.itemId==='library-duster'?(String(save.player.realm).startsWith('筑基')?3:1.5):item[key]||0;
  stats.maxHp+=item.hp||0;stats.maxMp+=item.mp||0;
 }
 if(save.vitalBuff?.until>now){stats.maxHp+=13;stats.maxMp+=4}
 return stats;
}
export function expireLoot(save,now=Date.now()){save.temporaryLoot=(save.temporaryLoot||[]).filter(entry=>entry.expiresAt>now)}
export function awardItem(save,id,quantity=1,now=Date.now()){
 const item=ITEMS[id];if(!item)throw new Error('物品不存在。');
 const stack=item.stackable&&save.inventory.some(entry=>entry.itemId===id);
 if(stack||save.inventory.length<save.bagCapacity){addItem(save,id,quantity);return 'bag'}
 save.temporaryLoot??=[];save.temporaryLoot.push({id:'loot-'+crypto.randomUUID(),itemId:id,quantity,expiresAt:now+TEMP_LOOT_MS});return 'temporary';
}
export function claimLoot(save,id,now=Date.now()){
 expireLoot(save,now);const index=save.temporaryLoot.findIndex(entry=>entry.id===id);if(index<0)throw new Error('战利品已过期或已领取。');
 const entry=save.temporaryLoot[index];addItem(save,entry.itemId,entry.quantity);save.temporaryLoot.splice(index,1);
}
export function equipmentSalePrice(item){if(Number.isFinite(item?.resaleValue))return item.resaleValue;if(item?.stage==='筑基')return ['foundation-sword','foundation-robe'].includes(item.id)?3:['foundation-wild-sword','foundation-wild-robe'].includes(item.id)?3.75:4.5;return ['iron-sword','cloth-robe'].includes(item?.id)?2:['wild-sword','wild-robe'].includes(item?.id)?2.5:3}
export const MATERIAL_SALE_PRICE=.8;
export const materialSalePrice=item=>item?.stage==='金丹'?1.8:item?.stage==='筑基'?1.2:MATERIAL_SALE_PRICE;
export function sellExtra(save,uid,quantity=1){
 assertItemUnlocked(save,uid);
 const entry=save.inventory.find(e=>e.uid===uid),item=ITEMS[entry?.itemId];
 if(!entry||!['gift','manual'].includes(item?.kind)||!Number.isFinite(item.sellPrice))throw new Error('此物品不能出售。');
 if(save.battle)throw new Error('战斗中不能出售物品。');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>(entry.quantity||1))throw new Error('出售数量无效。');
 if(quantity===(entry.quantity||1))save.inventory=save.inventory.filter(e=>e!==entry);else entry.quantity-=quantity;
 const total=Math.round(item.sellPrice*quantity*100)/100;
 save.player.spiritStones=Math.round((save.player.spiritStones+total)*100)/100;
 return `出售${item.name}×${quantity}，获得 ${total} 灵石。`;
}
export function discardJunk(save,uid){
 assertItemUnlocked(save,uid);
 const entry=save.inventory.find(e=>e.uid===uid);
 if(ITEMS[entry?.itemId]?.kind!=='junk'&&!(['crafted-binding-array','foundation-crafted-array'].includes(entry?.itemId)&&entry.usesLeft===0))throw new Error('这不是可丢弃的杂物。');
 if(save.battle)throw new Error('请先结束战斗。');
 save.inventory=save.inventory.filter(e=>e!==entry);
}
export function pillSalePrice(item){return Math.round((item?.price||0)*50)/100}
export function sellPill(save,uid,quantity){
 assertItemUnlocked(save,uid);
 const entry=save.inventory.find(item=>item.uid===uid),item=ITEMS[entry?.itemId];
 if(!entry||item?.kind!=='pill'||!Number.isFinite(item.price))throw new Error('只能出售丹药。');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>(entry.quantity||1))throw new Error('出售数量无效。');
 if(save.battle)throw new Error('战斗中不能出售物品。');
 const total=Math.round(quantity*pillSalePrice(item)*100)/100;
 if(quantity===(entry.quantity||1))save.inventory=save.inventory.filter(candidate=>candidate!==entry);
 else entry.quantity-=quantity;
 save.player.spiritStones=Math.round((save.player.spiritStones+total)*100)/100;
 return `出售${item.name}×${quantity}，获得 ${total} 灵石。`;
}
export function sellMaterial(save,uid,quantity){
 assertItemUnlocked(save,uid);
 const entry=save.inventory.find(item=>item.uid===uid),item=ITEMS[entry?.itemId];
 if(!entry||item?.kind!=='material')throw new Error('只能出售矿石或药草。');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>(entry.quantity||1))throw new Error('出售数量无效。');
 if(save.battle)throw new Error('战斗中不能出售物品。');
 const price=Math.round(quantity*materialSalePrice(item)*100)/100;
 if(quantity===entry.quantity)save.inventory=save.inventory.filter(candidate=>candidate!==entry);
 else entry.quantity-=quantity;
 save.player.spiritStones=Math.round((save.player.spiritStones+price)*100)/100;
 return `出售${item.name}×${quantity}，获得 ${price} 灵石。`;
}
export function sellEquipment(save,uid){
 assertItemUnlocked(save,uid);
 const entry=save.inventory.find(entry=>entry.uid===uid),item=ITEMS[entry?.itemId];
 if(!entry||item?.kind!=='equipment')throw new Error('只能出售装备。');
 if(entry.durability!==maxDurability(entry))throw new Error('耐久未满，不能出售；可以丢弃或以后修补。');
 if(save.battle)throw new Error('战斗中不能出售。');
 if(Object.values(save.equipment||{}).includes(uid))throw new Error('请先卸下装备，再出售。');
 const price=equipmentSalePrice(item);
 save.inventory=save.inventory.filter(item=>item.uid!==uid);
 save.player.spiritStones=Math.round((save.player.spiritStones+price)*100)/100;
 return `出售${item.name}，获得 ${price} 灵石。`;
}
export function saleUnitPrice(save,entry){
 const item=ITEMS[entry?.itemId];
 if(!entry||entry.locked||!item||Object.values(save.equipment||{}).includes(entry.uid))return null;
 if(item.kind==='equipment')return entry.durability===maxDurability(entry)?equipmentSalePrice(item):null;
 if(item.kind==='material')return materialSalePrice(item);
 if(item.kind==='pill'&&Number.isFinite(item.price))return pillSalePrice(item);
 if(['manual','gift'].includes(item.kind)&&Number.isFinite(item.sellPrice))return item.sellPrice;
 return null;
}
export function sellInventoryBatch(save,selections){
 if(save.battle)throw new Error('战斗中不能出售物品。');
 if(!Array.isArray(selections)||!selections.length)throw new Error('请先选择物品。');
 const seen=new Set();
 // Validate the entire selection before removing anything or crediting stones.
 const quotes=selections.map(({uid,quantity})=>{
  const entry=save.inventory.find(e=>e.uid===uid),price=saleUnitPrice(save,entry);
  if(seen.has(uid))throw new Error('同一物品不能重复选择。');
  seen.add(uid);
  if(price===null)throw new Error('所选物品已变化，请重新选择；上锁、已装备或耐久未满的物品不能出售。');
  const available=ITEMS[entry.itemId].kind==='equipment'?1:entry.quantity||1;
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>available)throw new Error('所选物品数量已变化，请重新选择。');
  return {entry,quantity,available,total:Math.round(price*quantity*100)/100};
 });
 const total=Math.round(quotes.reduce((sum,q)=>sum+q.total,0)*100)/100;
 for(const {entry,quantity,available} of quotes){
  if(quantity===available)save.inventory=save.inventory.filter(e=>e!==entry);
  else entry.quantity-=quantity;
 }
 save.player.spiritStones=Math.round((save.player.spiritStones+total)*100)/100;
 return `出售 ${quotes.length} 组物品，获得 ${total} 灵石。`;
}
export function discardEquipment(save,uid){
 assertItemUnlocked(save,uid);
 const entry=save.inventory.find(entry=>entry.uid===uid),item=ITEMS[entry?.itemId];
 if(!entry||item?.kind!=='equipment')throw new Error('只能丢弃装备。');
 if(save.battle)throw new Error('战斗中不能丢弃。');
 if(save.equipment[item.slot]===uid)equipItem(save,uid);
 save.inventory=save.inventory.filter(item=>item.uid!==uid);
 return `丢弃${item.name}。`;
}
export function usePill(save,uid,now=Date.now()){
 const entry=save.inventory.find(entry=>entry.uid===uid),item=ITEMS[entry?.itemId];
 if(!entry||item?.kind!=='pill')throw new Error('丹药不存在。');
 if(!itemStageAllowed(save.player,item))throw new Error('此丹药力太盛，暂不能服用。');
 save.pillCooldowns??={};
 if((save.pillCooldowns[item.id]||0)>now)throw new Error(`此丹药仍在冷却，还需 ${Math.ceil((save.pillCooldowns[item.id]-now)/1000)} 秒。`);
 const p=save.player,stats=equipmentStats(save,now);
 if(['qi-pill','foundation-qi-pill','golden-qi-pill'].includes(item.id)){
  if(save.goldenPillDay===localDay(now)||save.qiPillDay===localDay(now)||save.foundationPillDay===localDay(now))throw new Error('今天已经服用过增益打坐的丹药。');
  save[item.id==='golden-qi-pill'?'goldenPillDay':item.id==='qi-pill'?'qiPillDay':'foundationPillDay']=localDay(now);
 }else if(item.id==='golden-vital-pill'){
  if(!goldenInheritance(save,'divine-pharmacopoeia'))throw new Error('须升级本宗金丹传承后自用。');
  save.vitalBuff={until:now+3600000};p.hp=Math.min(p.hp,stats.maxHp)+13;p.mp=Math.min(p.mp,stats.maxMp)+4;
 }else{
  const hp=Math.min(stats.maxHp,Math.round((p.hp+(item.hp||0))*100)/100),mp=Math.min(stats.maxMp,Math.round((p.mp+(item.mp||0))*100)/100);
  if(hp===p.hp&&mp===p.mp)throw new Error('生命与法力已满，无需服药。');
  p.hp=hp;p.mp=mp;
 }
 if(entry.quantity>1)entry.quantity--;else save.inventory=save.inventory.filter(e=>e.uid!==uid);
 save.pillCooldowns[item.id]=now+(item.id==='golden-vital-pill'?120:3)*60*1000;
 return `服用${item.name}。`;
}
export const PILL_RECIPES={
 ...GOLDEN_RECIPES,
 'small-heal-pill':{'healing-herb':5},
 'spirit-pill':{'spirit-herb':5},
 'mixed-pill':{'healing-herb':2,'spirit-herb':1},
 'qi-pill':{'qi-herb':5}
 ,'foundation-heal-pill':{'foundation-healing-herb':5}
 ,'foundation-spirit-pill':{'foundation-spirit-herb':5}
 ,'foundation-mixed-pill':{'foundation-healing-herb':2,'foundation-spirit-herb':1}
 ,'foundation-qi-pill':{'foundation-qi-herb':5}
};
export function brewPill(save,id){
 if(save.player.sect!=='丹霞谷'||!save.techniques?.mastered?.includes('divine-pharmacopoeia'))throw new Error('须先学会丹霞谷《神药谱》。');
 if(id==='golden-vital-pill'&&!goldenInheritance(save,'divine-pharmacopoeia'))throw new Error('请先升级金丹神药谱。');
 const recipe=PILL_RECIPES[id];if(!recipe)throw new Error('丹方不存在。');
 if(!itemStageAllowed(save.player,ITEMS[id]))throw new Error(`灵力尚浅，无法炼制${ITEMS[id].stage}丹药。`);
 for(const [material,amount] of Object.entries(recipe))if((save.inventory.find(item=>item.itemId===material)?.quantity||0)<amount)throw new Error('药草不足。');
 const stack=save.inventory.some(entry=>entry.itemId===id);
 const freed=Object.entries(recipe).filter(([material,amount])=>save.inventory.find(entry=>entry.itemId===material)?.quantity===amount).length;
 if(!stack&&save.inventory.length-freed>=save.bagCapacity)throw new Error('储物格已满。');
 for(const [material,amount] of Object.entries(recipe)){
  const entry=save.inventory.find(item=>item.itemId===material);entry.quantity-=amount;
  if(!entry.quantity)save.inventory=save.inventory.filter(item=>item!==entry);
 }
 addItem(save,id);return `炼成一枚${ITEMS[id].name}。`;
}

export function expandStorageBag(save){
 if(save.bagExpanded)throw new Error('已完成首次扩充，后续扩充待开放。');
 if(!Number.isFinite(save.player.spiritStones)||save.player.spiritStones<50)throw new Error('灵石不足，扩充储物袋需要 50 灵石。');
 if(!Number.isSafeInteger(save.bagCapacity))throw new Error('储物袋容量异常，请重新读取存档。');
 save.player.spiritStones=Math.round((save.player.spiritStones-50)*100)/100;
 save.bagCapacity+=10;
 save.bagExpanded=true;
 return `储物袋增加 10 格，现有 ${save.bagCapacity} 格。后续扩充待开放。`;
}
