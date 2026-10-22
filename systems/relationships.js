import {syncTitles} from './titles.js';
import {ITEMS} from '../data/items.js';
import {maxDurability} from './inventory.js';
import {recordDailyGift} from './sect-progression.js';

const round2=n=>Math.round((n+Number.EPSILON)*100)/100;
export function giftableEntries(save){return save.inventory.filter(entry=>{
 const item=ITEMS[entry.itemId];return item&&['gift','manual','equipment','material','pill','talisman','array','junk'].includes(item.kind)&&!Object.values(save.equipment||{}).includes(entry.uid);
})}

export function giveCompanionGift(save,state,uid,preferredIds,reactionFor){
 let item=null,entry=null,amount=0,broken=false,damaged=false;
 if(uid==='stones'){
  if(save.player.spiritStones<1)throw new Error('灵石不足。');
  save.player.spiritStones=round2(save.player.spiritStones-1);amount=1;
 }else{
  entry=giftableEntries(save).find(e=>e.uid===uid);item=ITEMS[entry?.itemId];
  if(!entry||!item)throw new Error('此物不能送出，已装备的东西不能赠礼。');
  damaged=item.kind==='equipment'&&entry.durability<maxDurability(entry);
  broken=item.kind==='array'&&entry.itemId.includes('crafted')&&entry.usesLeft===0;
  amount=damaged?-1:item.kind==='gift'?(preferredIds.includes(entry.itemId)?4:2):item.kind==='manual'?5:item.kind==='equipment'?3:item.kind==='pill'||item.kind==='talisman'||item.kind==='array'&&!broken?2:item.kind==='junk'||broken?-1:0;
 }
 const reaction=reactionFor({item,entry,broken,damaged});
 if(entry&&!damaged){if(entry.quantity>1)entry.quantity--;else save.inventory=save.inventory.filter(e=>e!==entry)}
 state.affinity=Math.max(0,Math.min(100,(state.affinity||0)+amount));
 if(!damaged)recordDailyGift(save);
 return `${reaction} 好感 ${amount>=0?'+':''}${amount} · ${state.affinity}/100。`;
}

export function addCompanion(save,name,now=Date.now()){
 if((save.companionRejoinAt||0)>now)throw new Error(`解除道侣后三天内不能再结缘，尚余 ${Math.ceil((save.companionRejoinAt-now)/3600000)} 小时。`);
 save.player.companions??=[];
 if(save.player.companions.length>=(save.player.sect==='合欢宗'?3:1))throw new Error('当前道侣名额已满，请先解除原有关系。');
 if(save.player.companions.some(c=>(typeof c==='string'?c:c?.name)===name))throw new Error('已经与此人结为道侣。');
 save.player.companions.push(name);
 syncTitles(save);
}

export function removeCompanion(save,name,fee,now=Date.now()){
 if(fee===null)throw new Error('当前境界的解除道侣费用尚未设定。');
 if(save.player.spiritStones<fee)throw new Error(`解除关系需支付 ${fee} 灵石。`);
 syncTitles(save);
 save.player.spiritStones=round2(save.player.spiritStones-fee);
 save.player.companions=(save.player.companions||[]).filter(value=>(typeof value==='string'?value:value?.name)!==name);
 save.companionRejoinAt=now+3*24*60*60*1000;
}
