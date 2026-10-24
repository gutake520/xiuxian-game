import {PEI_NAME,PEI_SCENES} from '../data/pei-zhaoheng.js';
import {giveCompanionGift,giftableEntries,addCompanion,removeCompanion} from './relationships.js';
import {recordDailyGift} from './sect-progression.js';
import {companionBreakupFee} from './foxes.js';
import {startQiExploration,startFoundationExploration,finishQiExploration} from './exploration.js';
import {ITEMS} from '../data/items.js';
export function peiState(save){
 if(!String(save.player.realm).startsWith('筑基'))throw new Error('听隙庐位于望川岭。');
 if(save.battle||save.qiSecret||save.qiMeditation)throw new Error('请先结束当前行动。');
 return save.peiZhaoheng??={met:false,affinity:0,seen:[],giftReady:false};
}
const bonded=save=>(save.player.companions||[]).some(c=>(typeof c==='string'?c:c?.name)===PEI_NAME);
export function peiAction(save,action,value,now=Date.now(),random=Math.random){
 const s=peiState(save);
 if(action==='meet'){s.met=true;return PEI_SCENES.intro}
 if(!s.met)throw new Error('请先与他相识。');
 if(action==='collect'){
  const pending=save.peiExploration;if(!pending)throw new Error('没有待领取的探索。');if(now<pending.endsAt)throw new Error('他还在秘境里。');
  save.qiSecret=pending;let result;try{result=finishQiExploration(save,now)}finally{save.qiSecret=null}
  delete save.peiExploration;return PEI_SCENES.return+'\n\n'+result;
 }
 if(action==='dispatch'){
  if(!bonded(save))throw new Error('结为道侣后才能委托。');
  if(save.peiExploration)throw new Error('请等他回来并领取所得，再委托下一处。');
  if(!['qi','foundation'].includes(value))throw new Error('秘境不存在。');
  (value==='qi'?startQiExploration:startFoundationExploration)(save,now);save.peiExploration=save.qiSecret;save.qiSecret=null;
  return '「知道了。你忙你的……回来再与你说。」他拢了拢衣襟，揣着阵盘出了门。';
 }
 if(save.peiExploration)throw new Error('请先等他回来并领取探索所得。');
 if(action==='new-game'){
  if(s.game?.phase==='running')throw new Error('请先结束当前计时。');
  s.game={id:crypto.randomUUID(),phase:'ready',target:100+Math.min(400,Math.floor(random()*401))};return '「记住这个数。开始以后，自己掐时。」';
 }
 if(action==='start'){
  if(s.game?.id!==value||s.game.phase!=='ready')throw new Error('这次计时已经开始或已失效。');
  s.game.phase='running';s.game.startedAt=now;return '';
 }
 if(action==='stop'){
  if(s.game?.id!==value||s.game.phase!=='running')throw new Error('这次计时已经结束或已失效。');
  const elapsed=Math.max(0,now-s.game.startedAt);s.game.elapsed=elapsed;s.game.phase='done';s.game.won=Math.abs(elapsed-s.game.target*10)<=100;
  if(s.game.won)s.giftReady=true;
  return s.game.won?'「准。手挺稳的……这回你赢了。」可以赠送一份礼物。':'「急什么……再来？我又没赶你。」';
 }
 if(action==='gift'){
  if(!s.giftReady)throw new Error('先赢一次计时，才能送出一份礼物。');
  const entry=giftableEntries(save).find(e=>e.uid===value),item=ITEMS[entry?.itemId];let result;
  if(item?.kind==='array'&&entry.usesLeft===0){
   if(entry.quantity>1)entry.quantity--;else save.inventory=save.inventory.filter(e=>e!==entry);
   s.affinity=Math.min(100,s.affinity+5);recordDailyGift(save);result=`他忽然坐直，接过破损阵盘翻看。「这处断得有意思……你等等，坐下陪我拆。」 好感 +5 · ${s.affinity}/100。`;
  }else result=giveCompanionGift(save,s,value,['calming-jade'],({item,damaged})=>damaged?'「衣甲破了先修，别拿自己的安危省事。」他把装备推回来。':item?.kind==='array'?'「阵纹不错。我拆开瞧瞧……不介意吧？」':'「嗯，收到了。」他把礼物安稳放进柜里，又替你挪出一块干净桌面。');
  s.giftReady=false;return result;
 }
 if(action==='story'){
  const next=[30,60,90].find(n=>s.affinity>=n&&!s.seen.includes(n));if(!next)throw new Error('暂时没有新的话。');s.seen.push(next);return PEI_SCENES[next];
 }
 if(action==='proposal'||action==='accept'||action==='later'||action==='reject'){
  if(bonded(save)||s.affinity<100||![30,60,90].every(n=>s.seen.includes(n)))throw new Error('你们尚未走到这一步。');
  if(action==='accept'){addCompanion(save,PEI_NAME,now);return PEI_SCENES.accept}
  return PEI_SCENES[action];
 }
 if(action==='breakup'){
  if(!bonded(save))throw new Error('你们尚未结为道侣。');removeCompanion(save,PEI_NAME,companionBreakupFee(save.player),now);s.affinity=60;s.giftReady=false;return PEI_SCENES.breakup;
 }
 throw new Error('未知的互动。');
}
export {bonded as peiBonded};
