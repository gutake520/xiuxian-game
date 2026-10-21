import {ELEMENTAL_TECHNIQUES,TECHNIQUES} from '../data/techniques.js';
const DECAY=[1.2,1,.8,.6];
export function elementalEffect(battle,id,round=battle.round+1){
 const effect=battle.elements?.[id];
 return effect&&round>=effect.start&&round<=effect.end?effect:null;
}
export function hasElementalEffect(battle,id){
 return ELEMENTAL_TECHNIQUES.includes(id)&&(battle.elements?.[id]?.end??-1)>=battle.round+1;
}
export function elementalBonus(battle,id){
 const effect=elementalEffect(battle,id);
 return effect?DECAY[battle.round+1-effect.start]||0:0;
}
export function castElement(battle,id,messages){
 if(!ELEMENTAL_TECHNIQUES.includes(id))return false;
 const round=battle.round+1,start=id==='water-mist'?round+1:round;
 const duration=id==='water-mist'?2:['metal-edge','earth-rampart'].includes(id)?4:3;
 battle.elements??={};battle.elements[id]={start,end:start+duration-1};
 messages.push(`${TECHNIQUES[id].name}生效。${id==='wood-hidden'?'第三轮额外出手。':id==='water-mist'?'对手接下来两轮攻击固定造成 2 点伤害。':id==='fire-burn'?'对手行动时受到 3 点灼烧伤害，持续三轮。':`本轮${id==='metal-edge'?'攻击':'防御'}增加 1.2，随后逐轮衰减。`}`);
 return true;
}
export function expireElements(battle){
 for(const [id,effect] of Object.entries(battle.elements||{}))if(effect.end<=battle.round)delete battle.elements[id];
}
export function elementalStatus(battle){
 const round=battle.round+1;
 return Object.entries(battle.elements||{}).filter(([,effect])=>effect.end>=round).map(([id,effect])=>{
  const name=TECHNIQUES[id]?.name||id;
  if(id==='wood-hidden')return `${name} · ${effect.end===round?'本轮追加伤害':`第 ${round-effect.start+1}/3 轮`}`;
  if(id==='metal-edge'||id==='earth-rampart')return `${name} · ${id==='metal-edge'?'攻击':'防御'} +${elementalBonus(battle,id)} · 余 ${effect.end-round+1} 轮`;
  return `${name} · ${round<effect.start?'下轮生效':`余 ${effect.end-round+1} 轮`}`;
 }).join('；');
}
