import {awardItem} from './inventory.js';
import {ITEMS} from '../data/items.js';
const manuals=['one-manual','reset-manual'];
const manualDropRate=1; // 临时用于实测动画，测试后恢复原概率。
const junk=['broken-jade-slip','burnt-talisman','leaky-pill-bottle','broken-whisk'];
const herbs=['healing-herb','spirit-herb','qi-herb'];
const pick=values=>values[Math.floor(Math.random()*values.length)];
export function drawBlackMarket(save,count,requestId,now=Date.now()){
 if(![1,10].includes(count)||typeof requestId!=='string'||!requestId)throw new Error('抽取参数无效。');
 if(save.blackMarket?.lastDraw?.id===requestId)return save.blackMarket.lastDraw.results;
 if(save.battle)throw new Error('请先结束战斗。');
 const price=count===10?18:2;
 if(save.player.spiritStones<price)throw new Error('灵石不足。');
 save.blackMarket??={pity:0};
 const state=save.blackMarket;
 state.pity=Number.isSafeInteger(state.pity)?Math.max(0,Math.min(65,state.pity)):0;
 save.player.spiritStones=Math.round((save.player.spiritStones-price)*100)/100;
 const results=[];
 const revealedManuals=[];
 for(let i=0;i<count;i++){
  const roll=Math.random();let id=null;
  if(state.pity>=65||roll<manualDropRate){id=pick(manuals);state.pity=0}
  else{
   state.pity++;
   if(roll<.305){results.push('摊主掀开空匣：你被骗了，什么也没得到。');continue}
   if(roll<.505)id=pick(junk);
   else if(roll<.555)id='calming-jade';
   else if(roll<.7775)id='ore';
   else id=pick(herbs);
  }
  const place=awardItem(save,id,1,now);
  if(ITEMS[id].kind==='manual')revealedManuals.push(ITEMS[id].name);
  results.push(`获得${ITEMS[id].name} ×1${ITEMS[id].kind==='junk'?'，灵气尽失，只能丢弃':''}${place==='temporary'?'（已放入临时储物）':''}。`);
 }
 state.lastDraw={id:requestId,results,manuals:revealedManuals};
 return results;
}
