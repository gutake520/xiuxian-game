import {canEnterDongxia} from './foundation-story.js';
import {awardItem} from './inventory.js';
import {ITEMS} from '../data/items.js';
const manuals=['one-manual','reset-manual'];
const manualDropRate=.005;
const junk=['broken-jade-slip','burnt-talisman','leaky-pill-bottle','broken-whisk'];
const herbs=['healing-herb','spirit-herb','qi-herb'];
const gifts=['calming-jade','fox-wine','bamboo-chess','camellia-seeds'];
const pick=values=>values[Math.floor(Math.random()*values.length)];
export function drawBlackMarket(save,count,requestId,now=Date.now(),dongxia=false){
 if(dongxia&&!canEnterDongxia(save))throw new Error('请先开放东夏国。');
 const key=dongxia?'dongxiaMarket':'blackMarket';
 if(![1,10].includes(count)||typeof requestId!=='string'||!requestId)throw new Error('抽取参数无效。');
 if(save[key]?.lastDraw?.id===requestId)return save[key].lastDraw.results;
 if(save.battle)throw new Error('请先结束战斗。');
 const price=dongxia?(count===10?36:4):(count===10?18:2);
 if(save.player.spiritStones<price)throw new Error('灵石不足。');
 save[key]??={pity:0};
 const state=save[key];
 state.pity=Number.isSafeInteger(state.pity)?Math.max(0,Math.min(65,state.pity)):0;
 save.player.spiritStones=Math.round((save.player.spiritStones-price)*100)/100;
 const foundation=String(save.player.realm).startsWith('筑基');
 const orePool=dongxia?['foundation-ore','golden-ore']:foundation?['ore','foundation-ore']:['ore'];
 const herbPool=dongxia?[...herbs.map(id=>'foundation-'+id),...herbs.map(id=>'golden-'+id)]:foundation?[...herbs,...herbs.map(id=>'foundation-'+id)]:herbs;
 const results=[];
 const revealedManuals=[];
 for(let i=0;i<count;i++){
  const roll=Math.random();let id=null;
  if(state.pity>=65||roll<manualDropRate){id=dongxia?'cogito-manual':pick(manuals);state.pity=0}
  else{
   state.pity++;
   if(roll<.305){results.push('摊主掀开空匣：你被骗了，什么也没得到。');continue}
   if(roll<.505)id=pick(junk);
   else if(roll<.555)id=pick(gifts);
   else if(roll<.7775)id=pick(orePool);
   else id=pick(herbPool);
  }
  const place=awardItem(save,id,1,now);
  if(ITEMS[id].kind==='manual')revealedManuals.push(ITEMS[id].name);
  results.push(`获得${ITEMS[id].name} ×1${ITEMS[id].kind==='junk'?'，灵气尽失，只能丢弃':''}${place==='temporary'?'（已放入临时储物）':''}。`);
 }
 state.lastDraw={id:requestId,results,manuals:revealedManuals};
 return results;
}
