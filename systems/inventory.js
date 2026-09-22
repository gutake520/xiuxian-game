import {ITEMS} from '../data/items.js';
export function hasManual(save,id='basic-qi-guide'){return save.inventory.some(entry=>ITEMS[entry.itemId]?.methodId===id)}
export function ownsTechnique(save,id){return save.techniques.mastered.includes(id)||hasManual(save,id)}
export function addItem(save,id){
 const item=ITEMS[id];if(!item)throw new Error('物品不存在。');
 if(item.kind==='manual'&&ownsTechnique(save,item.methodId))return false;
 if(save.inventory.length>=save.bagCapacity)throw new Error('储物格已满，暂时无法收下物品。');
 save.itemSerial=(save.itemSerial||0)+1;save.inventory.push({uid:'item-'+save.itemSerial,itemId:id,quantity:1});return true;
}
export function purchase(save,id){
 const item=ITEMS[id];if(!item)throw new Error('商品不存在。');
 if(item.kind==='manual'&&ownsTechnique(save,item.methodId))throw new Error('已经拥有这部功法，无需重复购买。');
 if(save.player.spiritStones<item.price)throw new Error('灵石不足。');
 addItem(save,id);save.player.spiritStones-=item.price;
 return `购得${item.name}，花费 ${item.price} 灵石。`;
}
export function equipItem(save,uid){
 const entry=save.inventory.find(entry=>entry.uid===uid),item=ITEMS[entry?.itemId];
 if(!item||item.kind!=='equipment')throw new Error('无法装备这件物品。');
 save.equipment[item.slot]=save.equipment[item.slot]===uid?null:uid;
}
export function equipmentName(save,slot){const entry=save.inventory.find(e=>e.uid===save.equipment?.[slot]);return ITEMS[entry?.itemId]?.name||'未装备'}
