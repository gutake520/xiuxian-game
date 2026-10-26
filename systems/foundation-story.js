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
 return `你从${line.enemy.name}的尸身衣襟内翻出一封沾血的密信。纸上只有一行地址：「东夏国，照川城，西宫家。」既无落款，也未说明这户人家与持信者是什么关系。这个陌生的姓氏，是你眼下仅有的线索。信纸背面另绘有东行路线。你收好密信，决定待突破金丹后前往东夏国。${place?'另得归元佩 ×1'+(place==='temporary'?'（临时储物）':'')+'。':''}`;
}
export const isGoldenCore=save=>/^(金丹|元婴|化神|炼虚|合体|大乘|渡劫)/.test(String(save.player.realm));
export const canEnterDongxia=save=>Boolean(save.dongxiaUnlocked&&isGoldenCore(save));
export function askGoldenCoreMaster(save){
 if(save.battle||foundationStoryPending(save))throw new Error('请先结束当前战斗或剧情。');
 if(!isGoldenCore(save))throw new Error('突破金丹后，再来请教师父。');
 if(!SECT_MASTERS[save.player.sect])throw new Error('请先拜入宗门，再来请教师父。');
 save.dongxiaUnlocked=true;
 return '师父放下手中茶盏，望了你片刻。「金丹既成，往后的修行，便不能只困在这一座山里。去吧，出去闯天下。东夏国山河辽阔，有你未见过的人，也有你尚未走过的路。」他将一卷舆图推到你面前。「记得，走得再远，也可以回来。」';
}
export function enterDongxia(save){
 if(save.battle||foundationStoryPending(save))throw new Error('请先结束当前战斗或剧情。');
 if(!canEnterDongxia(save))throw new Error('需先突破金丹，再向师父请教往后的修炼。');
 save.dongxiaVisited=true;
 return '你循着师父所赠舆图越过边关，东夏国的山河在眼前铺展。';
}
