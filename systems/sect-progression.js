import {localDay} from './cultivation.js';
import {TECHNIQUES,techniqueEligible,hasActiveTechnique} from '../data/techniques.js';
import {ITEMS} from '../data/items.js';
import {addItem,maxDurability,equipmentStats} from './inventory.js';
export const DAILY_TASKS=[{id:'kills',name:'击败小怪',target:3},{id:'spent',name:'消费灵石',target:3},{id:'explored',name:'完成秘境探索',target:1}];
export function dailyTasks(save,now=Date.now()){
 const day=localDay(now);
 if(save.sectDaily?.day!==day)save.sectDaily={day,kills:0,spent:0,explored:0,claimed:[]};
 if(save.lastQiExploration?.completedAt&&localDay(save.lastQiExploration.completedAt)===day)save.sectDaily.explored=1;
 return save.sectDaily;
}
export function recordDailyProgress(save,before,countSpend=true,now=Date.now()){
 const daily=dailyTasks(save,now);
 if(save.lastBattle?.id!==before.battleId&&save.lastBattle?.outcome==='victory'&&!save.lastBattle.kind)daily.kills=Math.min(3,daily.kills+1);
 if(countSpend)daily.spent=Math.min(3,Math.round((daily.spent+Math.max(0,before.stones-save.player.spiritStones))*100)/100);
}
export function claimDailyTask(save,id,day,now=Date.now()){
 if(!save.player.sect||save.player.sect==='无门无派')throw new Error('请先加入宗门。');
 const daily=dailyTasks(save,now),task=DAILY_TASKS.find(task=>task.id===id);
 if(day!==daily.day)throw new Error('日课已更新，请重新打开。');
 if(!task||daily[id]<task.target)throw new Error('尚未完成日课。');
 if(daily.claimed.includes(id))throw new Error('这项奖励已领取。');
 daily.claimed.push(id);save.sectPoints=(save.sectPoints||0)+3;
 return `${task.name}完成，宗门积分 +3。`;
}
export function redeemInheritance(save,id){
 const method=TECHNIQUES[id];
 if(!method?.sect||!techniqueEligible(save.player,method))throw new Error('不满足本宗传承条件。');
 save.techniques.sectManuals??=[];
 if(save.techniques.mastered.includes(id)||save.techniques.sectManuals.includes(id))throw new Error('已经拥有这部传承。');
 if((save.sectPoints||0)<9)throw new Error('需要 9 宗门积分。');
 save.sectPoints-=9;save.techniques.sectManuals.push(id);
 return `兑换《${method.name}》，宗门积分 −9。`;
}
export function craftSectItem(save,id,herb='healing-herb'){
 const talisman=['attack-talisman','guard-talisman','foundation-attack-talisman','foundation-guard-talisman'].includes(id);
 if(!talisman&&!['crafted-binding-array','foundation-crafted-array'].includes(id))throw new Error('制作配方尚未开放。');
 if(!hasActiveTechnique(save,talisman?'fairy-painting':'planting-flags'))throw new Error('请先学会本宗制作传承。');
 if(!['healing-herb','spirit-herb','qi-herb'].includes(herb))throw new Error('药草类型无效。');
 const stage=ITEMS[id]?.stage==='筑基'?'筑基':'炼气';
 if(stage==='筑基'&&!String(save.player.realm).startsWith('筑基'))throw new Error('灵力尚浅，无法炼制筑基法器。');
 const permitted=stage==='筑基'?['foundation-healing-herb','foundation-spirit-herb','foundation-qi-herb']:['healing-herb','spirit-herb','qi-herb'];
 if(talisman&&!permitted.includes(herb))throw new Error('此草灵气不合，需用相应境界的药草。');
 const oreId=stage==='筑基'?'foundation-ore':'ore';
 const recipe=talisman?{[herb]:1,[oreId]:1}:{[oreId]:20};
 for(const [material,count] of Object.entries(recipe))if((save.inventory.find(e=>e.itemId===material)?.quantity||0)<count)throw new Error('材料不足。');
 const freed=Object.entries(recipe).filter(([material,count])=>save.inventory.find(e=>e.itemId===material)?.quantity===count).length;
 if(!save.inventory.some(e=>e.itemId===id)&&save.inventory.length-freed>=save.bagCapacity)throw new Error('储物格已满。');
 for(const [material,count] of Object.entries(recipe)){const entry=save.inventory.find(e=>e.itemId===material);entry.quantity-=count;if(!entry.quantity)save.inventory=save.inventory.filter(e=>e!==entry)}
 addItem(save,id);return '制作完成，物品已收入储物。';
}
export function repairOwnEquipment(save,uid){
 if(!hasActiveTechnique(save,'mending'))throw new Error('请先学会天工阁修补传承。');
 if(save.battle)throw new Error('战斗中不能修补装备。');
 const entry=save.inventory.find(item=>item.uid===uid),item=ITEMS[entry?.itemId];
 if(item?.kind!=='equipment')throw new Error('找不到这件装备。');
 const limit=maxDurability(entry),cost=Math.ceil(limit/5);
 if(entry.durability>=limit)throw new Error('装备耐久已满。');
 const oreId=item.stage==='筑基'?'foundation-ore':'ore',ore=save.inventory.find(item=>item.itemId===oreId);
 if((ore?.quantity||0)<cost)throw new Error(`此石灵性不足，修补${item.name}需 ${cost} 个${ITEMS[oreId].name}。`);
 const before=equipmentStats(save);
 ore.quantity-=cost;if(!ore.quantity)save.inventory=save.inventory.filter(item=>item!==ore);
 entry.durability=limit;
 const after=equipmentStats(save);
 save.player.hp=Math.round(Math.min(after.maxHp,save.player.hp+after.maxHp-before.maxHp)*100)/100;
 save.player.mp=Math.round(Math.min(after.maxMp,save.player.mp+after.maxMp-before.maxMp)*100)/100;
 return `修好${item.name}，消耗 ${cost} 个${ITEMS[oreId].name}。`;
}
