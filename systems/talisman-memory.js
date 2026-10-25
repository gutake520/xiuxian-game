import {MEMORY_DIFFICULTIES} from '../data/talisman-memory.js';
import {awardItem} from './inventory.js';
import {ITEMS} from '../data/items.js';
export const memoryDifficulty=save=>MEMORY_DIFFICULTIES[(save.talismanMemoryWins||0)<5?0:(save.talismanMemoryWins||0)<10?1:2];
export function maybeFindMemory(save,random=Math.random){
 if(save.talismanMemory||save.traitorPuzzle||random()>=.2)return false;
 const difficulty=memoryDifficulty(save),cards=Array.from({length:difficulty.pairs*2},(_,i)=>i%difficulty.pairs);
 for(let i=cards.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[cards[i],cards[j]]=[cards[j],cards[i]]}
 save.talismanMemory={id:crypto.randomUUID(),...difficulty,cards,matched:[],open:[],phase:'ready',hideAt:0};
 return true;
}
export function playMemory(save,id,action,index,now=Date.now()){
 const p=save.talismanMemory;
 if(save.battle||!p||p.id!==id)throw Error('当前无法辨认灵符。');
 if(action==='abandon'||action==='dismiss'){
  if(action==='dismiss'&&!['won','lost'].includes(p.phase))throw Error('本局尚未结束。');
  save.talismanMemory=null;return {closed:true};
 }
 if(action==='start'){
  if(p.phase!=='ready')throw Error('本局已经开始。');
  p.phase='playing';p.endsAt=now+p.seconds*1000;return {};
 }
 if(p.phase!=='playing')throw Error('本局尚未开始或已经结算。');
 // Absolute deadline survives closing, refresh and background tabs. Check before a flip.
 if(now>=p.endsAt){p.phase='lost';p.open=[];p.text='符光已散，本次未能辨齐。没有扣除物品，下次有缘再试。';return {message:p.text}}
 if(p.hideAt&&now>=p.hideAt){p.open=[];p.hideAt=0}
 if(action==='tick')return {};
 if(action!=='flip'||!Number.isInteger(index)||index<0||index>=p.cards.length)throw Error('请选择一张灵符。');
 if(p.hideAt||p.matched.includes(index)||p.open.includes(index))return {};
 p.open.push(index);
 if(p.open.length===2){
  const [a,b]=p.open;
  if(p.cards[a]===p.cards[b]){p.matched.push(a,b);p.open=[]}
  else p.hideAt=now+650;
 }
 if(p.matched.length===p.cards.length){
  const prefix=String(save.player.realm).startsWith('筑基')?'foundation-':'';
  const gifts=['guard-talisman','attack-talisman'].map(suffix=>{const item=prefix+suffix,where=awardItem(save,item,1,now);return `${ITEMS[item].name}×1${where==='temporary'?'（临时储物）':''}`});
  p.phase='won';save.talismanMemoryWins=(save.talismanMemoryWins||0)+1;
  p.text=`灵符尽数归位。获得${gifts.join('、')}。`;return {message:p.text};
 }
 return {};
}
