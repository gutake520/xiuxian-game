// The nine connected tiles match the playable preview. Other tiles are dead ends.
import {realmBattleBonus} from '../data/realms.js';
export const SPIRIT_ROUTE=[10,5,6,1,2,3,8,13,12];
const directions=[[-1,0],[0,1],[1,0],[0,-1]];
const direction=(from,to)=>directions.findIndex(([r,c])=>Math.floor(to/5)-Math.floor(from/5)===r&&to%5-from%5===c);
export const breakthroughHints=player=>Number(player.stats?.悟性)>=10?2:Number(player.stats?.悟性)>=5?1:0;

export function breakthroughReady(save){return save.player.realm==='炼气十层'&&Number(save.player.cultivation)>=1000&&save.bossLine?.insight===true}

function createSession(save){
 const tiles=Array.from({length:25},(_,i)=>({ports:[(i*7+1)%4],rot:0}));
 SPIRIT_ROUTE.forEach((index,n)=>{
  const previous=n===0?3:direction(index,SPIRIT_ROUTE[n-1]);
  const next=n===SPIRIT_ROUTE.length-1?null:direction(index,SPIRIT_ROUTE[n+1]);
  tiles[index]={ports:next===null?[previous]:[previous,next],rot:2+Math.floor(Math.random()*2)};
 });
 return{id:crypto.randomUUID(),tiles,remaining:24,hintsUsed:0,hintLimit:breakthroughHints(save.player)};
}

export function startBreakthrough(save){
 if(!breakthroughReady(save))throw new Error('需要炼气十层、修为达到 1000，并击败仇人取得感悟。');
 if(save.battle||save.qiSecret||save.qiMeditation||save.divinationPending||save.encounterPending||save.seniorRewardPending)throw new Error('请先结束当前事件。');
 return save.breakthrough??(save.breakthrough=createSession(save));
}

export function tilePorts(tile){return tile.ports.map(port=>(port+tile.rot)%4)}

export function flowingTiles(session){
 const seen=new Set(),queue=[];
 if(tilePorts(session.tiles[10]).includes(3)){seen.add(10);queue.push(10)}
 for(const index of queue)for(const side of tilePorts(session.tiles[index])){
  const row=Math.floor(index/5)+directions[side][0],col=index%5+directions[side][1];
  if(row<0||row>4||col<0||col>4)continue;
  const next=row*5+col;
  if(!seen.has(next)&&tilePorts(session.tiles[next]).includes((side+2)%4)){seen.add(next);queue.push(next)}
 }
 return seen;
}

function sessionFor(save,id){
 if(!breakthroughReady(save)||!save.breakthrough||save.breakthrough.id!==id)throw new Error('本次突破已经结束。');
 if(save.breakthrough.remaining<=0)throw new Error('本次灵气已散，请重新尝试。');
 return save.breakthrough;
}

function completeIfConnected(save){
 if(!flowingTiles(save.breakthrough).has(12))return false;
 save.player.foundationBonus=realmBattleBonus(save.player);
 save.player.realm='筑基一层';
 save.player.cultivation=0;
 save.player.cultivationRequired=null;
 save.breakthrough=null;
 return true;
}

export function rotateMeridian(save,id,index){
 const session=sessionFor(save,id);
 if(!Number.isInteger(index)||index<0||index>=25)throw new Error('经脉位置无效。');
 session.tiles[index].rot=(session.tiles[index].rot+1)%4;
 session.remaining--;
 return completeIfConnected(save)?'灵脉贯通，突破至筑基一层！':session.remaining?'灵气沿经脉流转。':'灵气散去，暂未突破。';
}

export function hintMeridian(save,id){
 const session=sessionFor(save,id);
 if(session.hintsUsed>=session.hintLimit)throw new Error('悟性提示已用完。');
 const index=SPIRIT_ROUTE.find(index=>session.tiles[index].rot!==0);
 if(index===undefined)throw new Error('这条灵脉已全部归位。');
 session.tiles[index].rot=0;
 session.hintsUsed++;
 return completeIfConnected(save)?'灵脉贯通，突破至筑基一层！':`提示：第 ${Math.floor(index/5)+1} 行第 ${index%5+1} 列的经脉已归位。`;
}

export function retryBreakthrough(save,id){
 if(!breakthroughReady(save)||!save.breakthrough||save.breakthrough.id!==id||save.breakthrough.remaining>0)throw new Error('当前不能重试。');
 save.breakthrough=createSession(save);
 return save.breakthrough;
}
