import {SECT_MASTERS,WANDERING_MASTER,FOUNDATION_PURSUER} from '../data/masters.js';
import {awardItem} from './inventory.js';
export const foundationStoryPending=save=>['ambush','rescue'].includes(save.foundationStory?.phase);
export function ensureFoundationStory(save){
 if(save.player.realm==='筑基十层'&&!save.foundationStory){
  save.foundationStory={phase:'ambush',sect:save.player.sect,enemy:{...FOUNDATION_PURSUER},master:{...(SECT_MASTERS[save.player.sect]||WANDERING_MASTER)}};
 }
 return save.foundationStory;
}
export function advanceFoundationStory(save){
 if(save.battle)throw new Error('请先结束当前战斗。');
 const line=save.foundationStory;
 if(line?.phase==='ambush'){
  line.phase='rescue';
  return `${line.master.name}救下了你，将${line.enemy.name}打成重伤。仇人逃入望川岭。`;
 }
 if(line?.phase==='rescue'){
  line.phase='wounded';
  return `你循着血迹得知，${line.enemy.name}躲在望川岭·栖息崖养伤。师父已平安返回。`;
 }
 throw new Error('这段剧情已经结束。');
}
export function searchPursuerBody(save,now=Date.now()){
 if(save.battle)throw new Error('请先结束当前战斗。');
 const line=save.foundationStory;
 if(line?.phase!=='dead')throw new Error('此处没有尚未搜查的尸身。');
 line.phase='searched';line.dongxiaClue=true;
 // 旧版归元渡奖励不重复发放，满袋仍走临时储物。
 const place=save.foundationEnding?.defeated?null:awardItem(save,'foundation-completion-charm',1,now);
 save.foundationEnding={...save.foundationEnding,defeated:true,defeatedAt:now};
 return `你从${line.enemy.name}的尸身衣襟内翻出一封沾血的密信。信中记着灭你满门的那伙人的行踪：「主使仍在东夏国，余众奉命追索幸存者。」信纸背面另绘有东行路线。你收好密信，决定待突破金丹后前往东夏国。${place?'另得归元佩 ×1'+(place==='temporary'?'（临时储物）':'')+'。':''}`;
}
export const canEnterDongxia=save=>Boolean(save.foundationStory?.dongxiaClue&&String(save.player.realm).startsWith('金丹'));
export function enterDongxia(save){
 if(save.battle||foundationStoryPending(save))throw new Error('请先结束当前战斗或剧情。');
 if(!canEnterDongxia(save))throw new Error('需先取得东夏国线索，并突破金丹。');
 save.dongxiaVisited=true;
 return '你循着密信中的路线越过边关。东夏国到了，灭门旧怨尚待清算。';
}
