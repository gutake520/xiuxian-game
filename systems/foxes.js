import {FOXES} from '../data/foxes.js';
import {ITEMS} from '../data/items.js';
import {maxDurability} from './inventory.js';
import {recordDailyGift} from './sect-progression.js';

export const COMPANION_COOLDOWN_MS=3*24*60*60*1000;
export function companionBreakupFee(player){
 const realm=String(player.realm||'');
 if(realm.startsWith('炼气'))return 100;
 if(realm.startsWith('筑基'))return 200;
 return null;
}
const round2=n=>Math.round((n+Number.EPSILON)*100)/100;
export function foxState(save,id){return save.foxes?.[id]||{affinity:0,seen:[]}}
function ensureFox(save,id){if(!FOXES[id])throw new Error('山中无人。');save.foxes??={};return save.foxes[id]??={affinity:0,seen:[]}}
export function giftableEntries(save){return save.inventory.filter(entry=>{
 const item=ITEMS[entry.itemId];return item&&['gift','manual','equipment','material','pill','talisman','array','junk'].includes(item.kind)&&!Object.values(save.equipment||{}).includes(entry.uid);
 })}
export function giveFoxGift(save,id,uid){
 const fox=FOXES[id],state=ensureFox(save,id);if(!state.met||state.rejected)throw new Error('此时无法赠礼。');
 let item,entry,amount=0,reaction='';
 if(uid==='stones'){
  if(save.player.spiritStones<1)throw new Error('灵石不足。');save.player.spiritStones=round2(save.player.spiritStones-1);amount=1;
  reaction=id==='pine-summit'?'沈砚收下灵石，轻声道：「路远，留些在身上。」':'云枝把灵石收入药篓：「下次不必破费。」';
 }else{
  entry=giftableEntries(save).find(e=>e.uid===uid);item=ITEMS[entry?.itemId];if(!entry||!item)throw new Error('此物不能送出，已装备的东西不能赠礼。');
  if(item.kind==='equipment'&&entry.durability<maxDurability(entry)){
   amount=-1;reaction=id==='pine-summit'?'沈砚把磨损的装备还回来：「先修好，再送人吧。」':'云枝把磨损的装备退回来：「破了的东西，还是先补好。」';
  }else{
   const broken=item.kind==='array'&&entry.itemId.includes('crafted')&&entry.usesLeft===0;
   amount=item.kind==='gift'?(entry.itemId==='calming-jade'||id==='pine-summit'&&['fox-wine','bamboo-chess'].includes(entry.itemId)||id==='spring-hill'&&entry.itemId==='camellia-seeds'?4:2):item.kind==='manual'?5:item.kind==='equipment'?3:item.kind==='pill'||item.kind==='talisman'||item.kind==='array'&&!broken?2:item.kind==='junk'||broken?-1:0;
   reaction=fox.gifts[entry.itemId]|| (broken?id==='pine-summit'?'沈砚接过损坏的阵盘，摇了摇头：「这枚阵已经散了。」':'云枝收起损坏的阵盘，皱眉道：「它早就不能用了。」':
    item.kind==='talisman'?id==='pine-summit'?'沈砚把符箓夹在指间：「下山时用得上。」':'云枝将符箓叠好：「我收下了。」':
    item.kind==='array'?id==='pine-summit'?'沈砚试了试阵盘的阵纹：「布阵倒是仔细。」':'云枝端详阵盘：「这阵盘可用来护着药田。」':
    item.kind==='material'?id==='pine-summit'?'沈砚收下材料：「多谢，不过这东西不必特意送来。」':'云枝把材料放进药篓：「山里常见，不用特意送我。」':
    item.kind==='junk'?id==='pine-summit'?'沈砚看着这件破烂：「这也算礼物？」':'云枝把破烂收走：「下次别拿这个来。」':
    item.kind==='manual'?id==='pine-summit'?'沈砚翻开功法：「这份心意，我记下了。」':'云枝翻过功法：「我会仔细读。」':
    item.kind==='equipment'?id==='pine-summit'?'沈砚试着握了握装备：「用得着。」':'云枝收下装备：「挑得用心。」':
    item.kind==='pill'?id==='pine-summit'?'沈砚收好丹药：「多谢。」':'云枝闻了闻药香：「炼得不错。」':'对方收下了礼物。');
   if(entry.quantity>1)entry.quantity--;else save.inventory=save.inventory.filter(e=>e!==entry);
  }
 }
 state.affinity=Math.max(0,Math.min(100,(state.affinity||0)+amount));
 if(!item||item.kind!=='equipment'||entry.durability>=maxDurability(entry))recordDailyGift(save);
 return `${reaction} 好感 ${amount>=0?'+':''}${amount} · ${state.affinity}/100。`;
}
export function seenFoxScene(save,id,level){const state=ensureFox(save,id);if(![30,60,90].includes(level)||state.affinity<level)throw new Error('尚未到这一步。');state.seen??=[];if(!state.seen.includes(level))state.seen.push(level)}
export function answerFox(save,id,answer,now=Date.now()){
 const fox=FOXES[id],state=ensureFox(save,id);
 if(!fox||!state.met||state.affinity<100||state.rejected||state.bonded)throw new Error('缘分尚未走到这一步。');
 if(answer==='later')return '你决定再考虑一阵。';
 if(answer==='reject'){state.rejected=true;return fox.reject}
 if(answer!=='accept')throw new Error('请选择回应。');
 if((save.companionRejoinAt||0)>now)throw new Error(`解除道侣后三天内不能再结缘，尚余 ${Math.ceil((save.companionRejoinAt-now)/3600000)} 小时。`);
 save.player.companions??=[];
 if(save.player.companions.length>=(save.player.sect==='合欢宗'?3:1))throw new Error('当前道侣名额已满，请先解除原有关系。');
 state.bonded=true;save.player.companions.push(fox.name);return fox.accept;
}
export function leaveFox(save,id,now=Date.now()){
 const fox=FOXES[id],state=ensureFox(save,id);if(!fox||!state.bonded)throw new Error('当前并无道侣关系。');
 const fee=companionBreakupFee(save.player);
 if(fee===null)throw new Error('当前境界的解除道侣费用尚未设定。');
 if(save.player.spiritStones<fee)throw new Error(`解除关系需支付 ${fee} 灵石。`);
 save.player.spiritStones=round2(save.player.spiritStones-fee);
 save.player.companions=(save.player.companions||[]).filter(name=>(typeof name==='string'?name:name?.name)!==fox.name);
 save.companionRejoinAt=now+COMPANION_COOLDOWN_MS;state.bonded=false;
 return `与${fox.name}解除道侣关系，支付 ${fee} 灵石；三天内不能再结缘。`;
}
