import {ITEMS} from '../data/items.js';
import {localDay} from './cultivation.js';
import {awardItem} from './inventory.js';

const round2=value=>Math.round((value+Number.EPSILON)*100)/100;

export function maybeMeetDiviner(save,battleId,loot,now=Date.now()){
 const day=localDay(now);
 if(save.divinationDay===day||save.divinationPending)return false;
 const fortune=Number(save.player.stats?.福缘)||0;
 if(Math.random()>=Math.min(1,(30+fortune)/100))return false;
 save.divinationDay=day;
 save.divinationPending={id:crypto.randomUUID(),battleId,loot};
 return true;
}

function priority(entry){
 if(ITEMS[entry.itemId]?.kind==='equipment')return 0;
 if(entry.itemId==='stones')return 1;
 if(entry.itemId==='ore')return 2;
 if(['healing-herb','spirit-herb','qi-herb'].includes(entry.itemId))return 3;
 return 4;
}

export function flipDivination(save,id,now=Date.now()){
 if(save.battle)throw new Error('请先结束战斗。');
 const pending=save.divinationPending;
 if(!pending||pending.id!==id)throw new Error('这次问卦已经结束。');
 const front=Math.random()<.5;
 let message;
 if(front){
  for(const entry of pending.loot){
   if(entry.itemId==='stones')save.player.spiritStones=round2(save.player.spiritStones+entry.quantity);
   else awardItem(save,entry.itemId,entry.quantity,now);
  }
  message='本次战利品翻倍。';
 }else{
  const entry=[...pending.loot].sort((a,b)=>priority(a)-priority(b))[0];
  if(entry){
   if(entry.itemId==='stones')save.player.spiritStones=round2(save.player.spiritStones-1);
   else if(entry.place==='temporary'){
    const stack=save.temporaryLoot?.find(item=>item.id===entry.uid);
    if(stack){stack.quantity--;if(!stack.quantity)save.temporaryLoot=save.temporaryLoot.filter(item=>item!==stack)}
   }else{
    const stack=save.inventory.find(item=>item.uid===entry.uid);
    if(stack){stack.quantity--;if(!stack.quantity)save.inventory=save.inventory.filter(item=>item!==stack)}
   }
   message=`卦师取走一份${entry.itemId==='stones'?'灵石':ITEMS[entry.itemId].name}。`;
  }else message='这次没有可取的战利品。';
 }
 save.divinationPending=null;
 if(save.lastBattle?.id===pending.battleId){save.lastBattle.divinationResult={front,message};save.lastBattle.log=[...(save.lastBattle.log||[]),message].slice(-10)}
 return {front,message};
}
