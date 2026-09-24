import {ITEMS} from '../data/items.js';
import {equipmentStats,maxDurability} from './inventory.js';

const round2=value=>Math.round((value+Number.EPSILON)*100)/100;
export const REPAIR_PER_POINT=.2;
export const HEAL_PRICE=5;
export const HEAL_AMOUNT=12;
export const MEDITATION_PRICE=2;
export const MEDITATION_MS=3*60*1000;

export function repairPrice(entry){return round2(Math.max(0,maxDurability(entry)-(entry.durability??maxDurability(entry)))*REPAIR_PER_POINT)}
export function repairEquipment(save,uid){
 if(save.player.sect==='天工阁')throw new Error('炼器师请你自行修补，本处暂不提供自修功能。');
 const entry=save.inventory.find(item=>item.uid===uid),item=ITEMS[entry?.itemId];
 if(item?.kind!=='equipment')throw new Error('这件物品无法修补。');
 const price=repairPrice(entry);if(price<=0)throw new Error('这件装备的耐久已满。');
 if(save.player.spiritStones<price)throw new Error('灵石不足。');
 const before=equipmentStats(save);
 entry.durability=maxDurability(entry);
 const after=equipmentStats(save);
 save.player.hp=round2(Math.min(after.maxHp,save.player.hp+after.maxHp-before.maxHp));
 save.player.mp=round2(Math.min(after.maxMp,save.player.mp+after.maxMp-before.maxMp));
 save.player.spiritStones=round2(save.player.spiritStones-price);
 return `修好${item.name}，花费 ${price} 灵石。`;
}
export function healAtSect(save){
 const {maxHp}=equipmentStats(save);
 if(save.player.hp>=maxHp)throw new Error('生命已满，无需治疗。');
 if(save.player.spiritStones<HEAL_PRICE)throw new Error('灵石不足。');
 const recovered=round2(Math.min(HEAL_AMOUNT,maxHp-save.player.hp));
 save.player.hp=round2(Math.min(maxHp,save.player.hp+recovered));
 save.player.spiritStones=round2(save.player.spiritStones-HEAL_PRICE);
 return `医修为你恢复 ${recovered} 点生命，花费 ${HEAL_PRICE} 灵石。`;
}
export function startMeditation(save,now=Date.now()){
 if(save.qiMeditation||save.qiSecret)throw new Error('请先结束当前等待。');
 if(save.player.hp>=equipmentStats(save).maxHp)throw new Error('生命已满，无需静坐。');
 if(save.player.spiritStones<MEDITATION_PRICE)throw new Error('灵石不足。');
 save.player.spiritStones=round2(save.player.spiritStones-MEDITATION_PRICE);
 save.qiMeditation={startedAt:now,endsAt:now+MEDITATION_MS};
 return `花费 ${MEDITATION_PRICE} 灵石进入静室，三分钟后恢复至多 ${HEAL_AMOUNT} 点生命。`;
}
export function finishMeditation(save,now=Date.now()){
 const pending=save.qiMeditation;if(!pending)throw new Error('没有正在进行的静坐。');
 if(now<pending.endsAt)throw new Error('静坐尚未结束。');
 const maxHp=equipmentStats(save).maxHp,recovered=round2(Math.min(HEAL_AMOUNT,maxHp-save.player.hp));
 save.player.hp=round2(Math.min(maxHp,save.player.hp+HEAL_AMOUNT));
 save.qiMeditation=null;
 return `静坐结束，恢复 ${recovered} 点生命。`;
}
