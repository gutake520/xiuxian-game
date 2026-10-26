import {canEnterDongxia} from './foundation-story.js';
import {localDay} from './cultivation.js';
import {awardItem} from './inventory.js';
import {ITEMS} from '../data/items.js';
export const HEX_CELLS=[];
for(let r=-4;r<=4;r++)for(let q=-4;q<=4;q++)if(Math.abs(q+r)<=4)HEX_CELLS.push({q,r,edge:Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))===4});
const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const neighbors=HEX_CELLS.map(c=>directions.map(([q,r])=>HEX_CELLS.findIndex(n=>n.q===c.q+q&&n.r===c.r+r)).filter(i=>i>=0));
const center=HEX_CELLS.findIndex(c=>c.q===0&&c.r===0);
function distances(blocked){
 const d=new Int16Array(61).fill(-1),queue=[];
 HEX_CELLS.forEach((c,i)=>{if(c.edge&&!blocked.has(i)){d[i]=0;queue.push(i)}});
 for(let k=0;k<queue.length;k++)for(const n of neighbors[queue[k]])if(d[n]<0&&!blocked.has(n)){d[n]=d[queue[k]]+1;queue.push(n)}
 return d;
}
export function advanceBug(board,cell){
 if(!Number.isInteger(cell)||!HEX_CELLS[cell]||cell===board.bug||board.stones.includes(cell))throw new Error('请在空地落石。');
 const stones=[...board.stones,cell],blocked=new Set(stones),d=distances(blocked);
 if(d[board.bug]<0)return {...board,stones,outcome:'win'};
 const options=neighbors[board.bug].filter(n=>!blocked.has(n)&&d[n]===d[board.bug]-1);
 // Fixed direction priority makes a saved layout reproducible, including after reload.
 const bug=options[0];
 return {...board,stones,bug,outcome:HEX_CELLS[bug].edge?'loss':null};
}
// Bounded beam search certifies at least one escape-blocking strategy before entry.
export function solveHex(board,width=24,maxDepth=12){
 let beam=[{...board,path:[]}];
 for(let depth=0;depth<maxDepth;depth++){
  const next=[],seen=new Set();
  for(const b of beam)for(let i=0;i<61;i++){
   if(i===b.bug||b.stones.includes(i))continue;
   const n=advanceBug(b,i),path=[...b.path,i];
   if(n.outcome==='win')return path;
   if(n.outcome==='loss')continue;
   const key=n.bug+':'+[...n.stones].sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);
   const d=distances(new Set(n.stones));
   const exits=neighbors[n.bug].filter(j=>d[j]>=0&&d[j]<d[n.bug]).length;
   next.push({...n,path,score:d[n.bug]*10-exits});
  }
  next.sort((a,b)=>b.score-a.score);beam=next.slice(0,width);if(!beam.length)return null;
 }
 return null;
}
export function generateHex(random=Math.random){
 for(let attempt=0;attempt<60;attempt++){
  const pool=HEX_CELLS.map((_,i)=>i).filter(i=>i!==center);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  const board={bug:center,stones:pool.slice(0,14+Math.floor(random()*5)),outcome:null};
  const d=distances(new Set(board.stones));if(d[center]<4||d[center]>6)continue;
  const solution=solveHex(board);
  if(solution&&solution.length>=5)return board;
 }
 // Verified fallback; rotations below keep it varied even with unlucky candidates.
 return fallbackHex(random);
}
const fallback=[51,5,12,23,26,53,20,59,13,3,22,41,9,24,52,33];
function fallbackHex(random){
 if(!fallback)throw new Error('阵图暂未生成，请重试（不会扣费）。');
 const turns=Math.floor(random()*6);
 const rotate=index=>{let {q,r}=HEX_CELLS[index];for(let n=0;n<turns;n++)[q,r]=[-r,q+r];return HEX_CELLS.findIndex(c=>c.q===q&&c.r===r)};
 const b={bug:center,stones:fallback.map(rotate),outcome:null};
 return solveHex(b)?.length>=5?b:{bug:center,stones:[...fallback],outcome:null};
}
export function secretEntries(save,now=Date.now()){return save.goldenSecretDay===localDay(now)?Math.max(0,save.goldenSecretEntries||0):0}
export function startGoldenSecret(save,now=Date.now()){
 if(!canEnterDongxia(save))throw new Error('请先开放东夏国。');
 if(save.goldenSecret)return '继续未完的回星古阵。';
 if(save.battle)throw new Error('请先结束战斗。');
 const used=secretEntries(save,now);if(used>=2)throw new Error('今日已探索两次。');
 if(save.player.spiritStones<5)throw new Error('入阵需要 5 灵石。');
 const board=generateHex();
 save.player.spiritStones=Math.round((save.player.spiritStones-5)*100)/100;
 save.goldenSecretDay=localDay(now);save.goldenSecretEntries=used+1;
 save.goldenSecret={...board,id:crypto.randomUUID(),turn:0,startedAt:now};
 return '花费 5 灵石，进入回星古阵。';
}
export function moveGoldenSecret(save,id,turn,cell,now=Date.now()){
 const b=save.goldenSecret;if(!b||b.id!==id||b.turn!==turn)throw new Error('棋局已更新，请刷新后继续。');
 const next=cell==='abandon'?{...b,outcome:'loss'}:advanceBug(b,cell);next.turn++;
 if(!next.outcome){save.goldenSecret=next;return '灵虫挪动了一步。'}
 let message='灵虫逃离古阵，未获奖励。';
 if(next.outcome==='win'){
  const herbs=['golden-healing-herb','golden-spirit-herb','golden-qi-herb'],herb=herbs[Math.floor(Math.random()*3)],herbCount=1+Math.floor(Math.random()*2),oreCount=1+Math.floor(Math.random()*2);
  save.player.spiritStones=Math.round((save.player.spiritStones+7)*100)/100;
  const a=awardItem(save,herb,herbCount,now),b=awardItem(save,'golden-ore',oreCount,now);
  message=`围住灵虫！获得 7 灵石、${ITEMS[herb].name} ×${herbCount}、赤金矿 ×${oreCount}。${a==='temporary'||b==='temporary'?'储物袋已满，物品已放入临时储物。':''}`;
 }
 save.lastGoldenSecret={...next,message,completedAt:cell==='abandon'?null:now};save.goldenSecret=null;return message;
}
