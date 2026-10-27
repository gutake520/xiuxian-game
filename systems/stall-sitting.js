import {STALL_STORIES,STALL_SITTING_CHANCE} from '../data/stall-sitting.js';
export const stallSittingProgress=save=>Number.isInteger(save.stallSittingProgress)?Math.min(STALL_STORIES.length,Math.max(0,save.stallSittingProgress)):0;
export const availableStallChoices=p=>STALL_STORIES[p.index].choices.filter(c=>!c.requiresInspection||p.inspected===true);
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
 if(selected.requiresInspection&&p.inspected!==true)throw Error('请先仔细查看摊上物件，再按线索处理。');
 const reward=2+selected.bonus;
 save.player.spiritStones=Math.round((save.player.spiritStones+reward)*100)/100;
 save.stallSittingProgress=p.index+1;
 p.phase='done';p.choice=choice;p.reward=reward;p.text=selected.result;
 save.stallSittingHistory??=[];save.stallSittingHistory.push({index:p.index,choice,inspected:p.inspected,reward});
 if(p.index===STALL_STORIES.length-1){
  const history=save.stallSittingHistory;
  const mistakes=history.filter(h=>h.reward===2).length;
  const careful=history.filter(h=>h.reward===4).length;
  const farewell=mistakes>=3?'陶掌柜翻了翻旧账：「这几回有过差错，咱们也一笔笔补上了。往后遇事，先弄清楚再应承。」他合上账本，把工钱与你核清，推车走进暮色。':careful>=7?'临走，陶掌柜又回头招呼：「这些回托你照看，多亏你肯费心。往后路过，坐下喝口茶，不用再替我守了。」摊车的木轮响着，慢慢拐过街角。':'陶掌柜将账本收好：「拿不准时肯等一等，也好过胡乱答应。多谢你这些回搭手。」你替他扶住车把，送过门槛，才松开手。';
  p.text+='\n\n'+farewell;
 }
 return {message:`替人看摊 · ${story.title}：获得 ${reward} 灵石。${p.index===STALL_STORIES.length-1?'十次委托已完结，陶掌柜不再托你看摊。':''}`};
}
