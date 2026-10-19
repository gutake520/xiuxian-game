import {GOMOKU_SIZE as N} from '../data/stall-games.js';
const axes=[[1,0],[0,1],[1,1],[1,-1]];
export function fiveInRow(board,pos,side){
 const x=pos%N,y=Math.floor(pos/N);
 return axes.some(([dx,dy])=>{let count=1;for(const sign of [-1,1])for(let i=1;i<5;i++){const a=x+dx*i*sign,b=y+dy*i*sign;if(a<0||a>=N||b<0||b>=N||board[b*N+a]!==side)break;count++}return count>=5});
}
function nearby(board){
 const set=new Set();board.forEach((v,pos)=>{if(!v)return;const x=pos%N,y=Math.floor(pos/N);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const a=x+dx,b=y+dy;if(a>=0&&a<N&&b>=0&&b<N&&!board[b*N+a])set.add(b*N+a)}});
 return set.size?[...set]:[Math.floor(N*N/2)];
}
function threat(board,pos,side){
 const x=pos%N,y=Math.floor(pos/N);let score=0;
 for(const [dx,dy] of axes){
  for(let offset=-4;offset<=0;offset++){
   let count=0,valid=true;
   for(let i=0;i<5;i++){const a=x+(offset+i)*dx,b=y+(offset+i)*dy;if(a<0||a>=N||b<0||b>=N){valid=false;break}const v=board[b*N+a];if(v&&v!==side){valid=false;break}if(v===side||b*N+a===pos)count++}
   if(valid)score+=[0,1,12,180,5000,1000000][count];
  }
 }
 return score;
}
function ranked(board,side){return nearby(board).map(pos=>({pos,value:threat(board,pos,side)+threat(board,pos,3-side)*1.05})).sort((a,b)=>b.value-a.value||a.pos-b.pos)}
function winningMoves(board,side){return nearby(board).filter(pos=>{board[pos]=side;const won=fiveInRow(board,pos,side);board[pos]=0;return won})}
export function chooseGomokuMove(board,difficulty,random=Math.random){
 const empty=board.flatMap((v,i)=>v?[]:[i]);if(!empty.length)return null;
 const pick=list=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
 if(difficulty==='easy'){
  // A casual opponent generally overlooks threats and avoids completing its own five.
  const safe=empty.filter(pos=>{board[pos]=2;const won=fiveInRow(board,pos,2);board[pos]=0;return !won});
  return pick(safe.length?safe:empty);
 }
 const wins=winningMoves(board,2);if(wins.length)return wins[0];
 const blocks=winningMoves(board,1);if(blocks.length)return blocks[0];
 const candidates=ranked(board,2);
 if(difficulty==='medium')return random()<.2?pick(candidates.slice(0,4)).pos:candidates[0].pos;
 // Two-ply threat search: force forks where possible and avoid the opponent's double threats.
 let best=candidates[0].pos,bestValue=-Infinity;
 for(const {pos,value} of candidates.slice(0,10)){
  board[pos]=2;
  const forks=winningMoves(board,2).length;
  let worst=Infinity;
  if(forks>=2)worst=100000000;
  else{
   const responses=ranked(board,1).slice(0,7);
   for(const response of responses){
    board[response.pos]=1;
    const enemyWins=winningMoves(board,1).length,ownWins=winningMoves(board,2).length;
    const evaluation=ownWins?1000000:enemyWins>=2?-10000000:((ranked(board,2)[0]?.value||0)-(ranked(board,1)[0]?.value||0)*1.15);
    worst=Math.min(worst,evaluation);board[response.pos]=0;
   }
   if(!responses.length)worst=0;
  }
  board[pos]=0;const score=worst+value*.05;if(score>bestValue){bestValue=score;best=pos}
 }
 return best;
}
