import {foundationStoryPending} from './foundation-story.js';
import {YAN_NAME,YAN_ENCOUNTERS,YAN_ENDINGS,YAN_GIFTS,YAN_OTHER_GIFTS,YAN_SCENES} from '../data/yan-tingyun.js';
import {giveCompanionGift,addCompanion,removeCompanion} from './relationships.js';
import {companionBreakupFee} from './foxes.js';

const round2=value=>Math.round((value+Number.EPSILON)*100)/100;
const pick=lines=>lines[Math.floor(Math.random()*lines.length)];
export function yanState(save){return save.yanTingyun||{rescues:0,affinity:0,seen:[]}}

// Only ordinary monster victories can queue this encounter. Resolve the other
// post-battle stories first, then roll exactly once for this victory.
export function queueYanAfterVictory(save,battleId){
 if(!yanState(save).closed&&!yanState(save).unlocked)save.yanEncounterBattleId=battleId;
}
export function maybeMeetYan(save){
 if(!save.yanEncounterBattleId||save.battle||save.encounterPending||save.divinationPending||save.seniorRewardPending||save.bossLine?.phase==='ambush'||save.bossLine?.rescuePending||foundationStoryPending(save)||save.yanEncounterPending||save.yanAftermath)return false;
 delete save.yanEncounterBattleId;
 const state=yanState(save);
 if(state.closed||state.unlocked||state.rescues>=3||Math.random()>=.05)return false;
 save.yanEncounterPending={id:crypto.randomUUID(),step:state.rescues+1,highCharm:Number(save.player.stats?.魅力)>=8};
 return true;
}
export function resolveYanEncounter(save,id,choice){
 const pending=save.yanEncounterPending;
 if(save.battle||save.encounterPending||save.divinationPending||!pending||pending.id!==id)throw new Error('这次相遇已经结束。');
 const state=save.yanTingyun??={rescues:0,affinity:0,seen:[]};
 if(pending.step!==state.rescues+1||pending.step>3)throw new Error('相遇进度无效。');
 if(pending.step<3){if(choice!=='continue')throw new Error('请先听他说完。');state.rescues++;save.yanEncounterPending=null;return `第 ${state.rescues} 次救下${YAN_NAME}。`}
 if(!['stones','together'].includes(choice))throw new Error('请选择回应。');
 state.rescues=3;save.yanEncounterPending=null;
 if(choice==='stones'){
  save.player.spiritStones=round2(save.player.spiritStones+30);
  state.closed=true;
 }else if(pending.highCharm)state.unlocked=true;
 else{
  save.player.spiritStones=round2(Math.max(0,save.player.spiritStones-round2(save.player.spiritStones*.3)));
  state.closed=true;
 }
 const text=YAN_ENDINGS[`${pending.highCharm?'high':'low'}${choice==='stones'?'Stones':'Together'}`];
 save.yanAftermath={id:crypto.randomUUID(),text};
 return text;
}
export function acknowledgeYanAftermath(save,id){
 if(!save.yanAftermath||save.yanAftermath.id!==id)throw new Error('这段相遇已经结束。');
 save.yanAftermath=null;
}
export function yanEncounterText(pending){return YAN_ENCOUNTERS[pending.step][pending.highCharm?'high':'low']}

export function giveYanGift(save,uid){
 const state=save.yanTingyun;
 if(!state?.unlocked||state.rejected||state.bonded)throw new Error('此时无法赠礼。');
 const preferred=['calming-jade','camellia-seeds'];
 return giveCompanionGift(save,state,uid,preferred,({item,entry,broken,damaged})=>{
  if(!item)return pick(YAN_OTHER_GIFTS.stones);
  if(damaged)return pick(YAN_OTHER_GIFTS.damaged);
  if(broken)return pick(YAN_OTHER_GIFTS.broken);
  return pick(YAN_GIFTS[entry.itemId]||YAN_OTHER_GIFTS[item.kind]||YAN_OTHER_GIFTS.material);
 });
}
export function seenYanScene(save,level){
 const state=save.yanTingyun;
 if(!state?.unlocked||![30,60,90].includes(level)||state.affinity<level)throw new Error('尚未到这一步。');
 state.seen??=[];if(!state.seen.includes(level))state.seen.push(level);
}
export function seenYanIntro(save){
 if(!save.yanTingyun?.unlocked)throw new Error('尚未找到他的山居。');
 save.yanTingyun.introSeen=true;
}
export function answerYan(save,answer,now=Date.now()){
 const state=save.yanTingyun;
 if(!state?.unlocked||state.affinity<100||state.rejected||state.bonded)throw new Error('缘分尚未走到这一步。');
 if(answer==='later')return YAN_SCENES.later;
 if(answer==='reject'){state.rejected=true;return YAN_SCENES.reject}
 if(answer!=='accept')throw new Error('请选择回应。');
 addCompanion(save,YAN_NAME,now);state.bonded=true;state.romanceEnded=false;return YAN_SCENES.accept;
}
export function leaveYan(save,now=Date.now()){
 const state=save.yanTingyun;if(!state?.bonded)throw new Error('当前并无道侣关系。');
 const fee=companionBreakupFee(save.player);
 removeCompanion(save,YAN_NAME,fee,now);state.bonded=false;state.romanceEnded=true;
 return `与${YAN_NAME}解除道侣关系，支付 ${fee} 灵石；三天内不能再结缘。`;
}
