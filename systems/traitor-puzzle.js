import {TRAITOR_LEVELS} from '../data/traitor-levels.js';
import {VISITING_SECTS} from '../data/locations.js';

export const TRAITOR_CHANCE=.15;
export const traitorProgress=save=>Number.isInteger(save.traitorProgress)?Math.max(0,Math.min(TRAITOR_LEVELS.length,save.traitorProgress)):0;
export function maybeFindTraitor(save,random=Math.random){
 const levelIndex=traitorProgress(save);
 if(save.battle||save.traitorPuzzle||levelIndex>=TRAITOR_LEVELS.length||random()>=TRAITOR_CHANCE)return false;
 const level=TRAITOR_LEVELS[levelIndex];
 const sect=VISITING_SECTS[Math.min(VISITING_SECTS.length-1,Math.max(0,Math.floor(random()*VISITING_SECTS.length)))].name;
 save.traitorPuzzle={id:crypto.randomUUID(),levelIndex,sect,marks:Array(level.size**2).fill(0),history:[]};
 return true;
}
// 0: undecided, 1: cleared, 2: suspected. Only a submitted valid board advances progress.
export function checkTraitors(level,marks){
 const n=level.size;
 if(!Array.isArray(marks)||marks.length!==n*n||marks.some(m=>![0,1,2].includes(m)))return '弟子名册有误，请重新排查。';
 const selected=marks.flatMap((m,p)=>m===2?[p]:[]);
 if(selected.length!==n)return `请标出 ${n} 名叛徒，再提交名册。`;
 const rows=new Set(),cols=new Set(),regions=new Set();
 for(const p of selected){
  const r=Math.floor(p/n),c=p%n,region=level.regions[r][c];
  if(rows.has(r))return '同一行不能有两名叛徒。';
  if(cols.has(c))return '同一列不能有两名叛徒。';
  if(regions.has(region))return '同一分组不能有两名叛徒。';
  rows.add(r);cols.add(c);regions.add(region);
 }
 for(let i=0;i<selected.length;i++)for(let j=0;j<i;j++){
  if(Math.abs(Math.floor(selected[i]/n)-Math.floor(selected[j]/n))<=1&&Math.abs(selected[i]%n-selected[j]%n)<=1)return '叛徒不能相邻，斜角也不行。';
 }
 return null;
}
export function playTraitor(save,id,action,index){
 const p=save.traitorPuzzle;
 if(!p||p.id!==id)throw new Error('这次抓叛徒奇遇已经结束。');
 if(save.battle)throw new Error('请先结束战斗。');
 const level=TRAITOR_LEVELS[p.levelIndex];
 if(!level)throw new Error('这份名册已经失效。');
 if(action==='submit'){
  const error=checkTraitors(level,p.marks);if(error)throw new Error(error);
  const reward=2+Math.floor(p.levelIndex/4);
  save.player.spiritStones+=reward;
  save.traitorProgress=p.levelIndex+1;
  const text=`你从${p.sect}的名册中找出了全部 ${level.size} 名叛徒。执事将他们带走，赠你 ${reward} 灵石作为谢礼。${save.traitorProgress===TRAITOR_LEVELS.length?'二十份名册悉数查清，九宗的这场调查终于告一段落。':'本次奇遇已结束，日后再赴山门，或有新的线索。'}`;
  save.lastTraitorPuzzle={levelIndex:p.levelIndex,sect:p.sect,text};save.traitorPuzzle=null;
  return {completed:true,text,reward};
 }
 if(action==='undo'){const previous=p.history.pop();if(previous)p.marks=previous;return {}}
 if(!['clear','suspect','reset'].includes(action))throw new Error('无效的排查操作。');
 if(action!=='reset'&&(!Number.isInteger(index)||index<0||index>=level.size**2))throw new Error('请选择名册中的弟子。');
 if(action==='reset'&&p.marks.every(m=>m===0))return {};
 p.history.push([...p.marks]);if(p.history.length>200)p.history.shift();
 if(action==='reset')p.marks.fill(0);
 else{const mark=action==='clear'?1:2;p.marks[index]=p.marks[index]===mark?0:mark}
 return {};
}
