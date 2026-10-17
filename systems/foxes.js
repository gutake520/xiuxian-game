import {FOXES} from '../data/foxes.js';
import {giveCompanionGift,addCompanion,removeCompanion} from './relationships.js';
export {giftableEntries} from './relationships.js';

export const COMPANION_COOLDOWN_MS=3*24*60*60*1000;
export function companionBreakupFee(player){
 const realm=String(player.realm||'');
 if(realm.startsWith('炼气'))return 100;
 if(realm.startsWith('筑基'))return 200;
 return null;
}
export function foxState(save,id){return save.foxes?.[id]||{affinity:0,seen:[]}}
function ensureFox(save,id){if(!FOXES[id])throw new Error('山中无人。');save.foxes??={};return save.foxes[id]??={affinity:0,seen:[]}}
export function giveFoxGift(save,id,uid){
 const fox=FOXES[id],state=ensureFox(save,id);if(!state.met||state.rejected)throw new Error('此时无法赠礼。');
 const preferred=['calming-jade',...(id==='pine-summit'?['fox-wine','bamboo-chess']:['camellia-seeds'])];
 return giveCompanionGift(save,state,uid,preferred,({item,entry,broken,damaged})=>{
  if(!item)return id==='pine-summit'?'沈砚收下灵石，轻声道：「路远，留些在身上。」':'云枝把灵石收入药篓：「下次不必破费。」';
  if(damaged)return id==='pine-summit'?'沈砚把磨损的装备还回来：「先修好，再送人吧。」':'云枝把磨损的装备退回来：「破了的东西，还是先补好。」';
  return fox.gifts[entry.itemId]|| (broken?id==='pine-summit'?'沈砚接过损坏的阵盘，摇了摇头：「这枚阵已经散了。」':'云枝收起损坏的阵盘，皱眉道：「它早就不能用了。」':
    item.kind==='talisman'?id==='pine-summit'?'沈砚把符箓夹在指间：「下山时用得上。」':'云枝将符箓叠好：「我收下了。」':
    item.kind==='array'?id==='pine-summit'?'沈砚试了试阵盘的阵纹：「布阵倒是仔细。」':'云枝端详阵盘：「这阵盘可用来护着药田。」':
    item.kind==='material'?id==='pine-summit'?'沈砚收下材料：「多谢，不过这东西不必特意送来。」':'云枝把材料放进药篓：「山里常见，不用特意送我。」':
    item.kind==='junk'?id==='pine-summit'?'沈砚看着这件破烂：「这也算礼物？」':'云枝把破烂收走：「下次别拿这个来。」':
    item.kind==='manual'?id==='pine-summit'?'沈砚翻开功法：「这份心意，我记下了。」':'云枝翻过功法：「我会仔细读。」':
    item.kind==='equipment'?id==='pine-summit'?'沈砚试着握了握装备：「用得着。」':'云枝收下装备：「挑得用心。」':
    item.kind==='pill'?id==='pine-summit'?'沈砚收好丹药：「多谢。」':'云枝闻了闻药香：「炼得不错。」':'对方收下了礼物。');
 });
}
export function seenFoxScene(save,id,level){const state=ensureFox(save,id);if(![30,60,90].includes(level)||state.affinity<level)throw new Error('尚未到这一步。');state.seen??=[];if(!state.seen.includes(level))state.seen.push(level)}
export function answerFox(save,id,answer,now=Date.now()){
 const fox=FOXES[id],state=ensureFox(save,id);
 if(!fox||!state.met||state.affinity<100||state.rejected||state.bonded)throw new Error('缘分尚未走到这一步。');
 if(answer==='later')return '你决定再考虑一阵。';
 if(answer==='reject'){state.rejected=true;return fox.reject}
 if(answer!=='accept')throw new Error('请选择回应。');
 addCompanion(save,fox.name,now);state.bonded=true;return fox.accept;
}
export function leaveFox(save,id,now=Date.now()){
 const fox=FOXES[id],state=ensureFox(save,id);if(!fox||!state.bonded)throw new Error('当前并无道侣关系。');
 const fee=companionBreakupFee(save.player);
 removeCompanion(save,fox.name,fee,now);state.bonded=false;
 return `与${fox.name}解除道侣关系，支付 ${fee} 灵石；三天内不能再结缘。`;
}
