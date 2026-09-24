import {ITEMS} from '../data/items.js';
import {DURABILITY_MAX,TEMP_LOOT_MS} from '../data/balance.js';
import {localDay} from './cultivation.js';
import {realmHpBonus,realmBattleBonus} from '../data/realms.js';
export function hasManual(save,id='basic-qi-guide'){return save.inventory.some(entry=>ITEMS[entry.itemId]?.methodId===id)}
export const maxDurability=entry=>ITEMS[entry?.itemId]?.maxDurability??DURABILITY_MAX;
export function ownsTechnique(save,id){return save.techniques.mastered.includes(id)||hasManual(save,id)}
export function addItem(save,id,quantity=1){
 const item=ITEMS[id];if(!item)throw new Error('物品不存在。');
 if(!Number.isSafeInteger(quantity)||quantity<1)throw new Error('物品数量无效。');
 if(item.kind==='manual'&&!item.repeatable&&ownsTechnique(save,item.methodId))return false;
 if(item.stackable){const stack=save.inventory.find(entry=>entry.itemId===id);if(stack){stack.quantity=(stack.quantity||1)+quantity;return true}}
 if(save.inventory.length>=save.bagCapacity)throw new Error('储物格已满，暂时无法收下物品。');
 save.itemSerial=(save.itemSerial||0)+1;save.inventory.push({uid:'item-'+save.itemSerial,itemId:id,quantity,...(item.kind==='equipment'?{durability:item.maxDurability??DURABILITY_MAX}:{})});return true;
}
export function purchase(save,id,sectDiscount=false){
 const item=ITEMS[id];if(!item)throw new Error('商品不存在。');
 if(item.blackMarketOnly)throw new Error('这部典籍只能从黑市抽取。');
 if(!Number.isFinite(item.price))throw new Error('此物品不供出售。');
 const sectOnly=['gamble-manual','steal-manual','only-once-manual'];
 if(sectOnly.includes(id)&&!sectDiscount)throw new Error('这部功法仅在宗门商店出售。');
 if(id==='one-manual'&&sectDiscount)throw new Error('这部功法只在黑市出售。');
 if(sectDiscount&&(!['strengthen-manual','wall-manual','gamble-manual','steal-manual','breath-manual','charged-manual','only-once-manual','wait-manual'].includes(id)||!save.player.sect||save.player.sect==='无门无派'))throw new Error('仅宗门弟子可购买这部典籍。');
 if(item.kind==='manual'&&!item.repeatable&&ownsTechnique(save,item.methodId))throw new Error('已经拥有这部功法，无需重复购买。');
 const price=sectDiscount?(id==='wait-manual'?30:sectOnly.includes(id)?25:15):item.price;
 if(save.player.spiritStones<price)throw new Error('灵石不足。');
 addItem(save,id);save.player.spiritStones=Math.round((save.player.spiritStones-price)*100)/100;
 return `购得${item.name}，花费 ${price} 灵石。`;
}
export function equipItem(save,uid){
 const entry=save.inventory.find(entry=>entry.uid===uid),item=ITEMS[entry?.itemId];
 if(!item||item.kind!=='equipment')throw new Error('无法装备这件物品。');
 if(save.battle)throw new Error('战斗中不能换装。');
 if(save.equipment[item.slot]!==uid&&entry.durability<=0)throw new Error('装备已损坏，需修补后使用。');
 const before=equipmentStats(save);
 save.equipment[item.slot]=save.equipment[item.slot]===uid?null:uid;
 const {maxHp,maxMp}=equipmentStats(save);
 save.player.hp=Math.round(Math.max(1,Math.min(maxHp,save.player.hp+maxHp-before.maxHp))*100)/100;
 save.player.mp=Math.round(Math.max(0,Math.min(maxMp,save.player.mp+maxMp-before.maxMp))*100)/100;
}
export function equipmentName(save,slot){const entry=save.inventory.find(e=>e.uid===save.equipment?.[slot]),item=ITEMS[entry?.itemId];return item?`${item.name} ${entry.durability??maxDurability(entry)}/${maxDurability(entry)}${entry.durability<=0?'（损坏）':''}`:'未装备'}
export function equipmentStats(save){
 const bonus=realmBattleBonus(save.player);
 const stats={attack:(save.player.combat?.attack||0)+bonus.attack,defense:(save.player.combat?.defense||0)+bonus.defense,speed:save.player.combat?.speed||0,critRate:(save.player.combat?.critRate||0)+bonus.critRate,dodgeRate:(save.player.combat?.dodgeRate||0)+bonus.dodgeRate,maxHp:(save.player.combat?.hp||save.player.hp||20)+realmHpBonus(save.player),maxMp:(save.player.combat?.mp||save.player.mp||10)+bonus.mp};
 for(const uid of Object.values(save.equipment||{})){
  const entry=save.inventory.find(entry=>entry.uid===uid),item=ITEMS[entry?.itemId];if(!item||item.kind!=='equipment'||(entry.durability??DURABILITY_MAX)<=0)continue;
  for(const key of ['attack','defense','speed','critRate','dodgeRate'])stats[key]+=key==='attack'&&entry.itemId==='library-duster'?(String(save.player.realm).startsWith('筑基')?3:1.5):item[key]||0;
  stats.maxHp+=item.hp||0;stats.maxMp+=item.mp||0;
 }
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
export function equipmentSalePrice(item){return ['iron-sword','cloth-robe'].includes(item?.id)?2:['wild-sword','wild-robe'].includes(item?.id)?2.5:3}
export const MATERIAL_SALE_PRICE=.8;
export function sellExtra(save,uid,quantity=1){
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
 const entry=save.inventory.find(e=>e.uid===uid);
 if(ITEMS[entry?.itemId]?.kind!=='junk')throw new Error('这不是杂物。');
 if(save.battle)throw new Error('请先结束战斗。');
 save.inventory=save.inventory.filter(e=>e!==entry);
}
export function pillSalePrice(item){return Math.round((item?.price||0)*50)/100}
export function sellPill(save,uid,quantity){
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
 const entry=save.inventory.find(item=>item.uid===uid),item=ITEMS[entry?.itemId];
 if(!entry||item?.kind!=='material')throw new Error('只能出售矿石或药草。');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>(entry.quantity||1))throw new Error('出售数量无效。');
 if(save.battle)throw new Error('战斗中不能出售物品。');
 const price=Math.round(quantity*MATERIAL_SALE_PRICE*100)/100;
 if(quantity===entry.quantity)save.inventory=save.inventory.filter(candidate=>candidate!==entry);
 else entry.quantity-=quantity;
 save.player.spiritStones=Math.round((save.player.spiritStones+price)*100)/100;
 return `出售${item.name}×${quantity}，获得 ${price} 灵石。`;
}
export function sellEquipment(save,uid){
 const entry=save.inventory.find(entry=>entry.uid===uid),item=ITEMS[entry?.itemId];
 if(!entry||item?.kind!=='equipment')throw new Error('只能出售装备。');
 if(entry.durability!==maxDurability(entry))throw new Error('耐久未满，不能出售；可以丢弃或以后修补。');
 if(save.battle)throw new Error('战斗中不能出售。');
 if(save.equipment[item.slot]===uid)equipItem(save,uid);
 const price=equipmentSalePrice(item);
 save.inventory=save.inventory.filter(item=>item.uid!==uid);
 save.player.spiritStones=Math.round((save.player.spiritStones+price)*100)/100;
 return `出售${item.name}，获得 ${price} 灵石。`;
}
export function discardEquipment(save,uid){
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
 save.pillCooldowns??={};
 if((save.pillCooldowns[item.id]||0)>now)throw new Error(`此丹药仍在冷却，还需 ${Math.ceil((save.pillCooldowns[item.id]-now)/1000)} 秒。`);
 const p=save.player,stats=equipmentStats(save);
 if(item.id==='qi-pill'){
  if(save.qiPillDay===localDay(now))throw new Error('今天已经服用过聚气丹。');
  save.qiPillDay=localDay(now);
 }else{
  const hp=Math.min(stats.maxHp,Math.round((p.hp+(item.hp||0))*100)/100),mp=Math.min(stats.maxMp,Math.round((p.mp+(item.mp||0))*100)/100);
  if(hp===p.hp&&mp===p.mp)throw new Error('生命与法力已满，无需服药。');
  p.hp=hp;p.mp=mp;
 }
 if(entry.quantity>1)entry.quantity--;else save.inventory=save.inventory.filter(e=>e.uid!==uid);
 save.pillCooldowns[item.id]=now+3*60*1000;
 return `服用${item.name}。`;
}
export const PILL_RECIPES={
 'small-heal-pill':{'healing-herb':5},
 'spirit-pill':{'spirit-herb':5},
 'mixed-pill':{'healing-herb':2,'spirit-herb':1},
 'qi-pill':{'qi-herb':5}
};
export function brewPill(save,id){
 if(save.player.sect!=='丹霞谷'||!save.techniques?.mastered?.includes('divine-pharmacopoeia'))throw new Error('须先学会丹霞谷《神药谱》。');
 const recipe=PILL_RECIPES[id];if(!recipe)throw new Error('丹方不存在。');
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
