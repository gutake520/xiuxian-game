import {canEnterDongxia} from './foundation-story.js';
export const concentrationReward=ms=>ms<=40000?20:ms<=60000?15:ms<=90000?10:ms<=120000?5:2;
export function maybeFindConcentration(save,random=Math.random){
 if(!canEnterDongxia(save)||save.concentration||random()>=.2)return false;
 const numbers=Array.from({length:36},(_,i)=>i+1);
 for(let i=35;i>0;i--){const j=Math.floor(random()*(i+1));[numbers[i],numbers[j]]=[numbers[j],numbers[i]]}
 save.concentration={id:crypto.randomUUID(),numbers,next:1,phase:'ready'};
 return true;
}
export function playConcentration(save,id,action,value,now=Date.now()){
 const p=save.concentration;
 if(save.battle||!p||p.id!==id)throw Error('当前试炼已经结束或无法操作。');
 if(action==='abandon'||action==='dismiss'){
  if(action==='dismiss'&&!['won','lost'].includes(p.phase))throw Error('试炼尚未结束。');
  save.concentration=null;return {closed:true};
 }
 if(action==='start'){
  if(p.phase!=='ready')throw Error('本次试炼已经开始。');
  p.phase='playing';p.startedAt=now;return {};
 }
 if(action!=='pick'||p.phase!=='playing'||!Number.isInteger(value)||value<1||value>36)throw Error('请按顺序选择数字。');
 if(value!==p.next){p.phase='lost';p.text='心神稍乱，玉牌光芒散去。本次无奖励，也未扣除任何资源。';return {message:p.text}}
 p.next++;
 if(p.next===37){
  p.phase='won';p.elapsed=Math.max(0,now-p.startedAt);p.reward=concentrationReward(p.elapsed);
  save.player.spiritStones+=p.reward;
  p.text=`三十六枚玉牌依次亮起。用时 ${(p.elapsed/1000).toFixed(2)} 秒，获得 ${p.reward} 灵石。`;
  return {message:p.text};
 }
 return {};
}
