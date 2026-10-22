import {TITLES} from '../data/titles.js';
import {spiritPeakCompleted} from '../data/spirit-peak.js';
import {FOXES} from '../data/foxes.js';
import {YAN_NAME} from '../data/yan-tingyun.js';
import {ZHANG_NAME} from '../data/zhang-huaijin.js';
const companionName=value=>typeof value==='string'?value:value?.name;
export function syncTitles(save){
 const state=save.titles??={unlocked:[],companionHistory:[]};
 state.unlocked=[...new Set((state.unlocked||[]).filter(id=>TITLES.some(t=>t.id===id)))];
 const history=new Set((state.companionHistory||[]).map(companionName).filter(Boolean));
 for(const person of save.player.companions||[]){const name=companionName(person);if(name)history.add(name)}
 for(const [id,fox] of Object.entries(save.foxes||{}))if((fox.bonded||fox.romanceEnded)&&FOXES[id])history.add(FOXES[id].name);
 if(save.yanTingyun?.bonded||save.yanTingyun?.romanceEnded)history.add(YAN_NAME);
 if(save.zhangHuaijin?.bonded||save.zhangHuaijin?.romanceEnded)history.add(ZHANG_NAME);
 state.companionHistory=[...history];
 const unlock=id=>{if(!state.unlocked.includes(id))state.unlocked.push(id)};
 if(spiritPeakCompleted(save)>=10)unlock('animal-friend');
 if(history.size>=3)unlock('sea-king');
 if(!state.unlocked.includes(save.player.equippedTitle))save.player.equippedTitle=null;
 return state;
}
export function equipTitle(save,id){
 if(save.battle)throw new Error('战斗中不能更换称号。');
 const state=syncTitles(save);
 if(id!==null&&!state.unlocked.includes(id))throw new Error('尚未获得这个称号。');
 save.player.equippedTitle=id;
 return id===null?'已摘下称号。':`已佩戴「${TITLES.find(t=>t.id===id).name}」。`;
}
