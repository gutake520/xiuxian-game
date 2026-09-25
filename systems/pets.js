import {hasActiveTechnique} from '../data/techniques.js';
import {localDay} from './cultivation.js';

export const BEAST_TYPES=['attack','guard'];
const DEFAULT_NAMES={attack:'追击灵兽',guard:'守护灵兽'};
const stageFor=player=>String(player.realm||'').startsWith('炼气')?'炼气':String(player.realm||'').startsWith('筑基')?'筑基':null;

export function ensureSpiritBeasts(save){
 if(save.player.sect!=='万灵山'&&!save.spiritBeasts&&!save.spiritBeast)return null;
 save.spiritBeasts??={attack:{name:save.spiritBeast?.name||DEFAULT_NAMES.attack,stage:'炼气',fedDay:null},guard:{name:DEFAULT_NAMES.guard,stage:'炼气',fedDay:null}};
 for(const type of BEAST_TYPES){
  save.spiritBeasts[type]??={name:DEFAULT_NAMES[type],stage:'炼气',fedDay:null};
  const beast=save.spiritBeasts[type],stage=stageFor(save.player);
  if(stage&&beast.stage!==stage){beast.stage=stage;beast.fedDay=null}
 }
 return save.spiritBeasts;
}

export function beastCanFight(save,type,now=Date.now()){
 if(!BEAST_TYPES.includes(type)||!hasActiveTechnique(save,'beast-keeper'))return false;
 const beast=ensureSpiritBeasts(save)?.[type];
 return Boolean(beast&&beast.stage===stageFor(save.player)&&beast.fedDay===localDay(now));
}

export function beastName(save,type){return ensureSpiritBeasts(save)?.[type]?.name||DEFAULT_NAMES[type]}

export function renameBeast(save,type,name){
 if(save.player.sect!=='万灵山'||!BEAST_TYPES.includes(type))throw new Error('只能为自己的灵兽取名。');
 const value=String(name||'').trim();if(!value||Array.from(value).length>12||/[<>\r\n]/.test(value))throw new Error('名字请控制在 1～12 字，不能含特殊符号。');
 ensureSpiritBeasts(save)[type].name=value;
 return `${DEFAULT_NAMES[type]}改名为${value}。`;
}

export function feedBeast(save,type,herbId,now=Date.now()){
 if(save.player.sect!=='万灵山'||!BEAST_TYPES.includes(type))throw new Error('只能喂养本宗灵兽。');
 if(!hasActiveTechnique(save,'beast-keeper'))throw new Error('请先学会《铲屎官手册》。');
 const beast=ensureSpiritBeasts(save)[type],stage=stageFor(save.player);
 if(!stage)throw new Error('这个境界的灵兽喂养尚未开放。');
 if(beast.fedDay===localDay(now))throw new Error('这只灵兽今天已经喂过。');
 if(stage==='筑基')throw new Error('需要筑基期灵草；筑基草药尚未开放。');
 if(!['healing-herb','spirit-herb','qi-herb'].includes(herbId))throw new Error('需使用对应境界的药草。');
 const entry=save.inventory.find(item=>item.itemId===herbId);
 if((entry?.quantity||0)<3)throw new Error('每只灵兽需要三株药草。');
 entry.quantity-=3;if(!entry.quantity)save.inventory=save.inventory.filter(item=>item!==entry);
 beast.fedDay=localDay(now);
 return `${beast.name}吃饱了，今日可以出战。`;
}

export function selectBattlePet(save,pet,now=Date.now()){
 if(pet===null)return null;
 if(!BEAST_TYPES.includes(pet))throw new Error('灵兽类型无效。');
 if(!beastCanFight(save,pet,now)){
  if((save.petRentals||0)<1)throw new Error('灵兽今天尚未喂养，也没有租借灵兽。');
  save.petRentals--;
 }
 return pet;
}
