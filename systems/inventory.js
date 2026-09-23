import {ITEMS} from '../data/items.js';
import {DURABILITY_MAX,TEMP_LOOT_MS} from '../data/balance.js';
import {localDay} from './cultivation.js';
export function hasManual(save,id='basic-qi-guide'){return save.inventory.some(entry=>ITEMS[entry.itemId]?.methodId===id)}
export function ownsTechnique(save,id){return save.techniques.mastered.includes(id)||hasManual(save,id)}
export function addItem(save,id,quantity=1){
 const item=ITEMS[id];if(!item)throw new Error('物品不存在。');
 if(!Number.isSafeInteger(quantity)||quantity<1)throw new Error('物品数量无效。');
 if(item.kind==='manual'&&ownsTechnique(save,item.methodId))return false;
 if(item.stackable){const stack=save.inventory.find(entry=>entry.itemId===id);if(stack){stack.quantity=(stack.quantity||1)+quantity;return true}}
 if(save.inventory.length>=save.bagCapacity)throw new Error('储物格已满，暂时无法收下物品。');
 save.itemSerial=(save.itemSerial||0)+1;save.inventory.push({uid:'item-'+save.itemSerial,itemId:id,quantity,...(item.kind==='equipment'?{durability:DURABILITY_MAX}:{})});return true;
}
export function purchase(save,id){
 const item=ITEMS[id];if(!item)throw new Error('商品不存在。');
 if(item.kind==='manual'&&ownsTechnique(save,item.methodId))throw new Error('已经拥有这部功法，无需重复购买。');
 if(save.player.spiritStones<item.price)throw new Error('灵石不足。');
 addItem(save,id);save.player.spiritStones=Math.round((save.player.spiritStones-item.price)*100)/100;
 return `购得${item.name}，花费 ${item.price} 灵石。`;
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
export function equipmentName(save,slot){const entry=save.inventory.find(e=>e.uid===save.equipment?.[slot]),item=ITEMS[entry?.itemId];return item?`${item.name} ${entry.durability??DURABILITY_MAX}/${DURABILITY_MAX}${entry.durability<=0?'（损坏）':''}`:'未装备'}
export function equipmentStats(save){
 const stats={attack:save.player.combat?.attack||0,defense:save.player.combat?.defense||0,speed:save.player.combat?.speed||0,critRate:save.player.combat?.critRate||0,dodgeRate:save.player.combat?.dodgeRate||0,maxHp:save.player.combat?.hp||save.player.hp||20,maxMp:save.player.combat?.mp||save.player.mp||10};
 for(const uid of Object.values(save.equipment||{})){
  const entry=save.inventory.find(entry=>entry.uid===uid),item=ITEMS[entry?.itemId];if(!item||item.kind!=='equipment'||(entry.durability??DURABILITY_MAX)<=0)continue;
  for(const key of ['attack','defense','speed','critRate','dodgeRate'])stats[key]+=item[key]||0;
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
export function sellEquipment(save,uid){
 const entry=save.inventory.find(entry=>entry.uid===uid),item=ITEMS[entry?.itemId];
 if(!entry||item?.kind!=='equipment')throw new Error('只能出售装备。');
 if(entry.durability!==DURABILITY_MAX)throw new Error('耐久未满，不能出售；可以丢弃或以后修补。');
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
 return `服用${item.name}。`;
}
