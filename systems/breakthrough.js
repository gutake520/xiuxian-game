import {goldenCoreReward,awakenGoldenCoreTechnique} from './golden-core.js';
// The nine connected tiles match the playable preview. Other tiles are dead ends.
import {realmBattleBonus,realmHpBonus} from '../data/realms.js';
import {rootCount} from '../data/technique-slots.js';
import {localDay} from './cultivation.js';
export const SPIRIT_ROUTE=[10,5,6,1,2,3,8,13,12];
export const FOUNDATION_APTITUDES=['悟性','根骨','神识','魅力','福缘'];
const round2=value=>Math.round((value+Number.EPSILON)*100)/100;
export function foundationReward(player){
 const count=rootCount(player);
 return count===1?{hp:10,mp:2,attack:1.5,defense:1,speed:2,critRate:3,dodgeRate:2}:count<=3?{hp:9,mp:2,attack:1.2,defense:.9,speed:2,critRate:2,dodgeRate:2}:{hp:8,mp:2,attack:1,defense:.8,speed:2,critRate:1,dodgeRate:2};
}
const directions=[[-1,0],[0,1],[1,0],[0,-1]];
const direction=(from,to,size=5)=>directions.findIndex(([r,c])=>Math.floor(to/size)-Math.floor(from/size)===r&&to%size-from%size===c);
export const breakthroughHints=player=>Number(player.stats?.悟性)>=10?2:Number(player.stats?.悟性)>=5?1:0;

export const goldenBreakthroughReady=save=>save.player.realm==='筑基十层'&&Number(save.player.cultivation)>=4000&&save.foundationStory?.phase==='searched';
export function breakthroughReady(save){return goldenBreakthroughReady(save)||save.player.realm==='炼气十层'&&Number(save.player.cultivation)>=1000&&save.bossLine?.insight===true}

export const GOLDEN_ROUTE=[21,14,7,0,1,2,9,16,15,22,29,36,37,38,31,32,25,18,19,12,11,10,17,24];
function createSession(save){
 if(goldenBreakthroughReady(save)){
  const size=7,route=GOLDEN_ROUTE;
  const tiles=Array.from({length:49},(_,i)=>({ports:i%3===0?[0,1]:[0,2],rot:Math.floor(Math.random()*4)}));
  route.forEach((index,n)=>{const previous=n===0?3:direction(index,route[n-1],size),next=n===route.length-1?null:direction(index,route[n+1],size);tiles[index]={ports:next===null?[previous]:[previous,next],rot:2+Math.floor(Math.random()*2)}});
  return {id:crypto.randomUUID(),tier:'golden',size,entry:21,target:24,route:[...route],tiles,remaining:56,hintsUsed:0,hintLimit:breakthroughHints(save.player)};
 }

 const tiles=Array.from({length:25},(_,i)=>({ports:[(i*7+1)%4],rot:0}));
 SPIRIT_ROUTE.forEach((index,n)=>{
  const previous=n===0?3:direction(index,SPIRIT_ROUTE[n-1]);
  const next=n===SPIRIT_ROUTE.length-1?null:direction(index,SPIRIT_ROUTE[n+1]);
  tiles[index]={ports:next===null?[previous]:[previous,next],rot:2+Math.floor(Math.random()*2)};
 });
 return{id:crypto.randomUUID(),tiles,remaining:24,hintsUsed:0,hintLimit:breakthroughHints(save.player)};
}

export function startBreakthrough(save,now=Date.now()){
 if(!breakthroughReady(save))throw new Error(save.player.realm==='筑基十层'?'需要筑基十层、修为达到4000，并击败追杀者、搜查密信。':'需要炼气十层、修为达到 1000，并击败仇人取得感悟。');
 if(save.foundationAptitudePending||save.goldenAptitudePending)throw new Error('请先领取上次突破的自由资质点。');
 if(save.battle||save.qiSecret||save.qiMeditation||save.divinationPending||save.encounterPending||save.seniorRewardPending)throw new Error('请先结束当前事件。');
 if(save.breakthrough)return save.breakthrough;
 if(save.breakthroughDay===localDay(now))throw new Error('今天已经尝试过突破，明天再来。');
 save.breakthroughDay=localDay(now);
 return save.breakthrough=createSession(save);
}

export function tilePorts(tile){return tile.ports.map(port=>(port+tile.rot)%4)}

export function flowingTiles(session){
 const size=session.size||5,entry=session.entry??10;
 const seen=new Set(),queue=[];
 if(tilePorts(session.tiles[entry]).includes(3)){seen.add(entry);queue.push(entry)}
 for(const index of queue)for(const side of tilePorts(session.tiles[index])){
  const row=Math.floor(index/size)+directions[side][0],col=index%size+directions[side][1];
  if(row<0||row>=size||col<0||col>=size)continue;
  const next=row*size+col;
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
 if(!flowingTiles(save.breakthrough).has(save.breakthrough.target??12))return false;
 if(save.breakthrough.tier==='golden'){
  const player=save.player,reward=goldenCoreReward(player);
  player.goldenCoreHpBonus=realmHpBonus(player);player.goldenCoreBonus=realmBattleBonus(player);
  player.combat??={hp:player.hp??20,mp:player.mp??10};
  for(const [key,value] of Object.entries(reward))player.combat[key]=round2((Number(player.combat[key])||0)+value);
  if(Number.isFinite(player.hp))player.hp=round2(player.hp+reward.hp);
  if(Number.isFinite(player.mp))player.mp=round2(player.mp+reward.mp);
  player.realm='金丹一层';player.cultivation=0;player.cultivationRequired=null;
  awakenGoldenCoreTechnique(save);save.goldenAptitudePending=true;save.breakthrough=null;return true;
 }
 const player=save.player,reward=foundationReward(player),count=rootCount(player);
 player.foundationBonus=realmBattleBonus(player);
 player.combat??={hp:player.hp??20,mp:player.mp??10};
 for(const [key,value] of Object.entries(reward))player.combat[key]=round2((Number(player.combat[key])||0)+value);
 if(Number.isFinite(player.hp))player.hp=round2(player.hp+reward.hp);
 if(Number.isFinite(player.mp))player.mp=round2(player.mp+reward.mp);
 if(count===2||count===3){save.techniques??={mastered:[],combat:[]};save.techniques.mastered??=[];if(!save.techniques.mastered.includes('self-as-self'))save.techniques.mastered.push('self-as-self')}
 player.realm='筑基一层';
 player.cultivation=0;
 player.cultivationRequired=1200;
 save.foundationAptitudePending=true;
 save.breakthrough=null;
 return true;
}

export function chooseFoundationAptitude(save,key){
 if(save.foundationAptitudePending!==true&&save.goldenAptitudePending!==true)throw new Error('没有待分配的筑基资质。');
 if(!FOUNDATION_APTITUDES.includes(key))throw new Error('请选择一项资质。');
 save.player.stats??={};save.player.stats[key]=(Number(save.player.stats[key])||0)+1;
 const golden=save.goldenAptitudePending===true;
 save.foundationAptitudePending=false;save.goldenAptitudePending=false;
 return `${key} +1，${golden?'金丹':'筑基'}奖励已领取。`;
}

export function rotateMeridian(save,id,index){
 const session=sessionFor(save,id);
 if(!Number.isInteger(index)||index<0||index>=session.tiles.length)throw new Error('经脉位置无效。');
 session.tiles[index].rot=(session.tiles[index].rot+1)%4;
 session.remaining--;
 return completeIfConnected(save)?`灵脉贯通，突破至${save.player.realm}！`:session.remaining?'灵气沿经脉流转。':'灵气散去，暂未突破。';
}

export function hintMeridian(save,id){
 const session=sessionFor(save,id);
 if(session.hintsUsed>=session.hintLimit)throw new Error('悟性提示已用完。');
 const index=(session.route||SPIRIT_ROUTE).find(index=>session.tiles[index].rot!==0);
 if(index===undefined)throw new Error('这条灵脉已全部归位。');
 session.tiles[index].rot=0;
 session.hintsUsed++;
 return completeIfConnected(save)?`灵脉贯通，突破至${save.player.realm}！`:`提示：第 ${Math.floor(index/(session.size||5))+1} 行第 ${index%(session.size||5)+1} 列的经脉已归位。`;
}

export function retryBreakthrough(save,id,now=Date.now()){
 if(!breakthroughReady(save)||!save.breakthrough||save.breakthrough.id!==id||save.breakthrough.remaining>0)throw new Error('当前不能重试。');
 if(save.breakthroughDay===localDay(now))throw new Error('今天已经尝试过突破，明天再来。');
 save.breakthroughDay=localDay(now);
 save.breakthrough=createSession(save);
 return save.breakthrough;
}
