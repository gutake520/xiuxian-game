import {PEAK_PUZZLE_CHANCES,SOKOBAN_LEVELS} from '../data/peak-puzzles.js';
import {ITEMS} from '../data/items.js';
import {awardItem} from './inventory.js';
const directions={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const pick=(list,random)=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
export function makeMaze(random=Math.random){
 const grid=Array.from({length:11},()=>Array(11).fill('#')),stack=[[1,1]];grid[1][1]=' ';
 while(stack.length){
  const [x,y]=stack.at(-1),choices=Object.values(directions).filter(([dx,dy])=>grid[y+dy*2]?.[x+dx*2]==='#'&&x+dx*2>0&&x+dx*2<10&&y+dy*2>0&&y+dy*2<10);
  if(!choices.length){stack.pop();continue}
  const [dx,dy]=pick(choices,random);grid[y+dy][x+dx]=' ';grid[y+dy*2][x+dx*2]=' ';stack.push([x+dx*2,y+dy*2]);
 }
 return grid.map(row=>row.join(''));
}
export function maybeFindPeakPuzzle(save,random=Math.random){
 if(save.peakPuzzle)return null;
 const roll=random(),kind=roll<PEAK_PUZZLE_CHANCES.sokoban?'sokoban':roll<PEAK_PUZZLE_CHANCES.sokoban+PEAK_PUZZLE_CHANCES.maze?'maze':null;
 if(!kind)return null;
 let rows,player,boxes=[],goals=[],reward,levelIndex;
 if(kind==='sokoban'){
  levelIndex=Number.isInteger(save.nextSokobanLevel)&&save.nextSokobanLevel>=0?save.nextSokobanLevel%SOKOBAN_LEVELS.length:0;
  rows=SOKOBAN_LEVELS[levelIndex].rows;
  rows.forEach((row,y)=>[...row].forEach((c,x)=>{const pos=y*row.length+x;if(c==='@')player=pos;if(c==='$')boxes.push(pos);if(c==='.')goals.push(pos)}));
  reward={itemId:pick(Object.values(ITEMS).filter(i=>i.kind==='gift'),random).id};
  rows=rows.map(r=>r.replace(/[@$.]/g,' '));
 }else{rows=makeMaze(random);player=12;goals=[108];reward={stones:random()<.5?1:2}}
 save.peakPuzzle={id:crypto.randomUUID(),kind,rows,player,boxes,goals,reward,...(kind==='sokoban'?{levelIndex}:{}),initial:{player,boxes:[...boxes]},history:[],moves:0};
 return kind;
}
export function playPeakPuzzle(save,id,action,now=Date.now()){
 const p=save.peakPuzzle;
 if(!p||p.id!==id)throw new Error('这场奇遇已经结束。');
 if(save.battle)throw new Error('请先结束战斗。');
 if(action==='reset'){p.player=p.initial.player;p.boxes=[...p.initial.boxes];p.history=[];p.moves=0;return {}}
 if(action==='undo'){
  const last=p.history.pop();if(last){p.player=last.player;p.boxes=last.boxes;p.moves=last.moves}return {};
 }
 const delta=directions[action];if(!delta)throw new Error('无效方向。');
 const width=p.rows[0].length,[dx,dy]=delta;
 const next=(pos)=>{const x=pos%width+dx,y=Math.floor(pos/width)+dy;return x>=0&&x<width&&y>=0&&y<p.rows.length?y*width+x:-1};
 const free=pos=>pos>=0&&p.rows[Math.floor(pos/width)]?.[pos%width]===' ';
 const target=next(p.player),box=p.boxes.indexOf(target),beyond=next(target);
 if(!free(target)||(box>=0&&(!free(beyond)||p.boxes.includes(beyond))))return {};
 p.history.push({player:p.player,boxes:[...p.boxes],moves:p.moves});if(p.history.length>200)p.history.shift();
 p.player=target;p.moves++;if(box>=0)p.boxes[box]=beyond;
 const won=p.kind==='maze'?p.player===p.goals[0]:p.goals.every(g=>p.boxes.includes(g));
 if(!won)return {};
 let text;
 if(p.kind==='sokoban'){
  // Older active puzzles have no level index; identify their original board without resetting play.
  const levelIndex=Number.isInteger(p.levelIndex)?p.levelIndex:SOKOBAN_LEVELS.findIndex(level=>level.rows.every((row,y)=>[...row].every((c,x)=>{
   const pos=y*row.length+x;
   return (c==='#')===(p.rows[y]?.[x]==='#')&&(c==='@')===(p.initial.player===pos)&&(c==='$')===p.initial.boxes.includes(pos)&&(c==='.')===p.goals.includes(pos);
  })));
  const where=awardItem(save,p.reward.itemId,1,now);
  save.nextSokobanLevel=(levelIndex+1)%SOKOBAN_LEVELS.length;
  text=`石阵归位，小兽衔来一份谢礼：${ITEMS[p.reward.itemId].name} ×1。${where==='temporary'?'储物袋已满，已放入临时储物。':''}`;
 }else{save.player.spiritStones+=p.reward.stones;text=`你循着兽爪印走出迷林，在树根旁拾得${p.reward.stones}灵石。`}
 save.lastPeakPuzzle={kind:p.kind,text,moves:p.moves};save.peakPuzzle=null;
 return {completed:true,text};
}
