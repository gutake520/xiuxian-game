import {RIVER_LEVELS} from '../data/river-crossing.js';
export function maybeFindRiver(save,random=Math.random){
 if(save.riverCrossing||!String(save.player.realm).startsWith('筑基')||random()>=.2)return false;
 const level=Math.min(RIVER_LEVELS.length-1,Math.floor(random()*RIVER_LEVELS.length));
 save.riverCrossing={id:crypto.randomUUID(),level,bank:0,positions:RIVER_LEVELS[level].cargo.map(()=>0),moves:0,reward:7+Math.min(3,Math.floor(random()*4)),phase:'playing'};
 return true;
}
export function playRiver(save,id,action,cargo=[]){
 const p=save.riverCrossing;
 if(save.battle||!p||p.id!==id)throw Error('当前无法渡河。');
 if(action==='abandon'||action==='dismiss'){
  if(action==='dismiss'&&p.phase!=='won')throw Error('尚未完成渡河。');
  save.riverCrossing=null;return {closed:true};
 }
 if(p.phase!=='playing')throw Error('本次渡河已经结算。');
 const level=RIVER_LEVELS[p.level];
 if(action==='reset'){p.bank=0;p.positions=level.cargo.map(()=>0);p.moves=0;return {}}
 if(action!=='cross'||!Array.isArray(cargo)||new Set(cargo).size!==cargo.length||cargo.some(i=>!Number.isInteger(i)||!level.cargo[i]||p.positions[i]!==p.bank))throw Error('请从船所在的岸边选择同行者。');
 if(cargo.reduce((n,i)=>n+level.cargo[i].weight,0)>level.capacity)throw Error('小舟承重不足，请减少同行者。');
 const next=p.positions.map((bank,i)=>cargo.includes(i)?1-bank:bank),bank=1-p.bank;
 const conflict=level.conflicts.find(([a,b])=>next[a]===next[b]&&next[a]!==bank);
 if(conflict)throw Error(`无人看守时，${level.cargo[conflict[0]].name}与${level.cargo[conflict[1]].name}不能留在同一岸。`);
 p.positions=next;p.bank=bank;p.moves++;
 if(bank===1&&next.every(x=>x===1)){
  p.phase='won';save.player.spiritStones=Math.round((save.player.spiritStones+p.reward)*100)/100;
  p.text=`最后一位同行者踏上对岸，雾中小舟悄然远去。获得 ${p.reward} 灵石。`;
  return {message:p.text};
 }
 return {};
}
