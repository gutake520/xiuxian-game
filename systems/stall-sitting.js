import {STALL_STORIES,STALL_SITTING_CHANCE} from '../data/stall-sitting.js';
export const stallSittingProgress=save=>Number.isInteger(save.stallSittingProgress)?Math.min(STALL_STORIES.length,Math.max(0,save.stallSittingProgress)):0;
export function maybeFindStallSitting(save,random=Math.random){
 const index=stallSittingProgress(save);
 if(save.stallSitting||index>=STALL_STORIES.length||random()>=STALL_SITTING_CHANCE)return false;
 save.stallSitting={id:crypto.randomUUID(),index,phase:'choosing',inspected:false};return true;
}
export function playStallSitting(save,id,action,choice){
 const p=save.stallSitting;
 if(save.battle||!p||p.id!==id)throw Error('这次看摊已经结束或暂时无法处理。');
 if(action==='dismiss'){
  if(p.phase!=='done')throw Error('请先处理这次委托。');
  save.stallSitting=null;return {closed:true};
 }
 if(p.phase!=='choosing'||p.index!==stallSittingProgress(save))throw Error('这次看摊已经结算。');
 const story=STALL_STORIES[p.index];
 if(action==='inspect'){p.inspected=true;return {}}
 if(action!=='choose')throw Error('请选择如何处理。');
 const selected=story.choices.find(c=>c.id===choice);
 if(!selected)throw Error('这个选择不存在。');
 const reward=2+selected.bonus;
 save.player.spiritStones=Math.round((save.player.spiritStones+reward)*100)/100;
 save.stallSittingProgress=p.index+1;
 p.phase='done';p.choice=choice;p.reward=reward;p.text=selected.result;
 save.stallSittingHistory??=[];save.stallSittingHistory.push({index:p.index,choice,inspected:p.inspected,reward});
 return {message:`替人看摊 · ${story.title}：获得 ${reward} 灵石。${p.index===STALL_STORIES.length-1?'十次委托已完结，陶掌柜不再托你看摊。':''}`};
}
