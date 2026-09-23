import {ITEMS} from '../data/items.js';
import {TECHNIQUES,PUZZLE_SIZES,hintAllowance,techniqueEligible} from '../data/techniques.js';
import {hasManual} from './inventory.js';
const canStudy=(save,id)=>techniqueEligible(save.player,TECHNIQUES[id])&&(hasManual(save,id)||save.techniques.sectManuals?.includes(id));
const shuffle=values=>{for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]]}return values};
export function countSolutions(input,size,limit=2){
 const cells=[...input];let count=0;
 function search(){if(count>=limit)return;let best=-1,options=[];
  for(let i=0;i<cells.length;i++){if(cells[i])continue;const row=Math.floor(i/size),col=i%size;
   const choices=Array.from({length:size},(_,n)=>n+1).filter(v=>!cells.slice(row*size,(row+1)*size).includes(v)&&!Array.from({length:size},(_,r)=>cells[r*size+col]).includes(v));
   if(!choices.length)return;if(best<0||choices.length<options.length){best=i;options=choices}if(choices.length===1)break;
  }
  if(best<0){count++;return}
  for(const v of options){cells[best]=v;search();cells[best]=0;if(count>=limit)return}
 }
 if(input.some((v,i)=>v&&input.some((w,j)=>i!==j&&v===w&&(Math.floor(i/size)===Math.floor(j/size)||i%size===j%size))))return 0;
 search();return count;
}
export function createPuzzle(size,spirit){
 if(![3,4,5].includes(size))throw new Error('数阵阶数不支持。');
 const rows=shuffle(Array.from({length:size},(_,i)=>i)),cols=shuffle(Array.from({length:size},(_,i)=>i)),symbols=shuffle(Array.from({length:size},(_,i)=>i+1));
 const solution=rows.flatMap(r=>cols.map(c=>symbols[(r+c)%size])),givens=[...solution];
 for(const i of shuffle(Array.from({length:size*size},(_,i)=>i))){const old=givens[i];givens[i]=0;if(countSolutions(givens,size)!==1)givens[i]=old}
 return{size,givens,solution,cells:[...givens],hintsUsed:0,hintLimit:hintAllowance(spirit)};
}
export function startLearning(save,id){
 const method=TECHNIQUES[id];if(!method||!canStudy(save,id))throw new Error('请先取得对应典籍。');
 if(save.techniques.mastered.includes(id))throw new Error('已经学会这部功法。');
 return save.techniques.puzzles[id]??=createPuzzle(PUZZLE_SIZES[method.rank]||method.size,save.player.stats?.神识);
}
export function writePuzzleCell(save,id,index,value){
 const puzzle=save.techniques.puzzles[id];if(!puzzle||!canStudy(save,id))throw new Error('学习记录不存在。');
 if(!Number.isInteger(index)||index<0||index>=puzzle.cells.length||puzzle.givens[index])throw new Error('这一格不可修改。');
 if(!Number.isInteger(value)||value<0||value>puzzle.size)throw new Error('数字超出范围。');puzzle.cells[index]=value;
}
export function useHint(save,id){
 const puzzle=save.techniques.puzzles[id];if(!puzzle||!canStudy(save,id))throw new Error('请先开启学习。');
 if(puzzle.hintsUsed>=puzzle.hintLimit)throw new Error('本次学习的提示已用尽。');
 const index=puzzle.cells.findIndex((n,i)=>n!==puzzle.solution[i]);if(index<0)throw new Error('数阵已填满，请提交。');
 puzzle.cells[index]=puzzle.solution[index];puzzle.givens[index]=puzzle.solution[index];puzzle.hintsUsed++;return index;
}
export function completeLearning(save,id){
 const puzzle=save.techniques.puzzles[id];if(!puzzle||save.techniques.mastered.includes(id)||!canStudy(save,id))throw new Error('当前无法结算学习。');
 if(puzzle.cells.some((v,i)=>v!==puzzle.solution[i]))throw new Error('数阵尚未解开，请检查每一行、每一列。');
 save.techniques.mastered.push(id);
 if(id==='beast-keeper')save.spiritBeast??={name:'伴生灵兽',stage:'炼气'};
 const at=save.inventory.findIndex(entry=>ITEMS[entry.itemId]?.methodId===id);if(at>=0)save.inventory.splice(at,1);
 delete save.techniques.puzzles[id];
}
export function setMainTechnique(save,id){
 if(id!==null&&(!TECHNIQUES[id]||TECHNIQUES[id].type!=='cultivation'||!save.techniques.mastered.includes(id)))throw new Error('须先学会修炼功法，再设为主修。');
 save.techniques.main=id;
}
export function toggleCombatTechnique(save,id){
 const technique=TECHNIQUES[id];if(technique?.type!=='combat'||!techniqueEligible(save.player,technique)||!save.techniques.mastered.includes(id))throw new Error('须先学会战斗功法。');
 if(save.battle)throw new Error('战斗中不能更换功法。');
 save.techniques.combat??=[];
 if(save.techniques.combat.includes(id))save.techniques.combat=save.techniques.combat.filter(value=>value!==id);
 else{if(save.techniques.combat.length>=2)throw new Error('当前最多装备两门战斗功法。');save.techniques.combat.push(id)}
}
