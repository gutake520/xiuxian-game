import {XIGONG_SCENES} from '../data/xigong-defense.js';
import {FOXES} from '../data/foxes.js';
import {YAN_NAME,YAN_SCENES} from '../data/yan-tingyun.js';
import {PEI_NAME,PEI_SCENES} from '../data/pei-zhaoheng.js';
import {ZHANG_NAME,ZHANG_SCENES,ZHANG_INTRO,ZHANG_ARRIVAL} from '../data/zhang-huaijin.js';
// Read-only: use recorded milestones, never current affinity or story actions.
export function companionMemories(save){
 const nameOf=c=>typeof c==='string'?c:c?.name;
 const bonds=new Set([...(save.player?.companions||[]),...(save.titles?.companionHistory||[])].map(nameOf));
 const people=[
  {id:'xigong-xuan',name:'西宫玄',state:save.xigongXuan,data:XIGONG_SCENES,intro:!!save.xigongXuan?.unlocked},
  ...Object.entries(FOXES).map(([id,data])=>({id,name:data.name,state:save.foxes?.[id],data,intro:!!save.foxes?.[id]?.met})),
  {id:'yan-tingyun',name:YAN_NAME,state:save.yanTingyun,data:YAN_SCENES,intro:!!save.yanTingyun?.introSeen},
  {id:'pei-zhaoheng',name:PEI_NAME,state:save.peiZhaoheng,data:PEI_SCENES,intro:!!save.peiZhaoheng?.met},
  {id:'zhang-huaijin',name:ZHANG_NAME,state:save.zhangHuaijin,data:ZHANG_SCENES,intro:!!save.zhangHuaijin?.unlocked}
 ];
 return people.map(p=>{
  const scenes=[],add=(id,title,text)=>{if(typeof text==='string'&&text)scenes.push({id,title,text})};
  if(p.intro){add('intro','初遇',p.id==='zhang-huaijin'?ZHANG_INTRO:p.data.intro);if(p.id==='zhang-huaijin')add('arrival','照夜洞 · 相识',ZHANG_ARRIVAL)}
  for(const level of [30,60,90])if(p.state?.seen?.includes(level))add('at'+level,`好感 ${level} · 往事`,p.data['at'+level]||p.data[level]);
  if(bonds.has(p.name)||p.state?.bonded||p.state?.romanceEnded){add('proposal','结侣 · 心意',p.data.proposal);add('accept','结侣 · 相许',p.data.accept)}
  if(p.state?.rejected)add('reject','当时的回应',p.data.reject);
  return {id:p.id,name:p.name,scenes};
 }).filter(p=>p.scenes.length);
}
