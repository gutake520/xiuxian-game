import {SPIRIT_DENS,SPIRIT_DEN_GOAL,SPIRIT_PLAY_MP_RATE} from '../data/spirit-dens.js';
import {equipmentStats} from './inventory.js';
import {ITEMS} from '../data/items.js';
import {SPIRIT_PEAK_BEASTS,SPIRIT_PEAK_LIMIT,SPIRIT_PEAK_GOAL} from '../data/spirit-peak.js';
import {localDay} from './cultivation.js';
import {syncAchievements} from './achievements.js';
export const isPeakHerb=id=>ITEMS[id]?.kind==='material'&&id.endsWith('-herb');
export const peakFeedCount=(save,now=Date.now())=>save.spiritPeak?.day===localDay(now)?save.spiritPeak.used||0:0;
export function feedPeakBeast(save,id,uid,now=Date.now()){
 const beast=SPIRIT_PEAK_BEASTS.find(b=>b.id===id),value=save.spiritPeak?.feeding?.[id]||0,count=peakFeedCount(save,now);
 if(save.battle)throw new Error('请先结束战斗。');
 if(!beast)throw new Error('山中没有这只异兽。');
 if(count>=SPIRIT_PEAK_LIMIT)throw new Error('今日已喂养二十次，明日再来。');
 const entry=save.inventory.find(e=>e.uid===uid);
 if(!entry||!isPeakHerb(entry.itemId)||!(entry.quantity>0))throw new Error('请选择储物袋里的药草。');
 entry.quantity--;if(!entry.quantity)save.inventory=save.inventory.filter(e=>e!==entry);
 save.spiritPeak??={};save.spiritPeak.feeding??={};
 save.spiritPeak.day=localDay(now);save.spiritPeak.used=count+1;save.spiritPeak.feeding[id]=value+1;
 syncAchievements(save);
 return {completed:value+1===SPIRIT_PEAK_GOAL,denUnlocked:value+1===SPIRIT_DEN_GOAL,message:value+1>=SPIRIT_PEAK_GOAL?`${peakBeastName(save,id)}吃下了你递来的药草。`:`喂养${beast.name}，喂养值 ${value+1} / ${SPIRIT_PEAK_GOAL}。`};
}

export const peakDenUnlocked=(save,id)=>Boolean(SPIRIT_DENS[id]&&(save.spiritPeak?.feeding?.[id]||0)>=SPIRIT_DEN_GOAL);
export const peakBeastName=(save,id)=>save.spiritPeak?.names?.[id]||SPIRIT_PEAK_BEASTS.find(b=>b.id===id)?.name||'';
export const peakRecoveryUsed=(save,id,now=Date.now())=>save.spiritPeak?.playedDay?.[id]===localDay(now);
function assertDen(save,id){
 if(save.battle)throw new Error('请先结束战斗。');
 if(!peakDenUnlocked(save,id))throw new Error('它还没有邀请你进入住处。');
}
export function namePeakBeast(save,id,value){
 assertDen(save,id);
 const name=typeof value==='string'?value.trim():'';
 if(!name||[...name].length>12||/[\x00-\x1f\x7f<>]/.test(name))throw new Error('名字需为一至十二个字，不可包含尖括号或控制字符。');
 save.spiritPeak.names??={};save.spiritPeak.names[id]=name;
 return `你为它取名「${name}」。`;
}
export function playWithPeakBeast(save,id,now=Date.now(),random=Math.random){
 assertDen(save,id);
 const scenes=SPIRIT_DENS[id].scenes,index=Math.min(scenes.length-1,Math.max(0,Math.floor(random()*scenes.length)));
 const maxMp=equipmentStats(save).maxMp;
 const restored=peakRecoveryUsed(save,id,now)?0:Math.max(0,Math.round(Math.min(maxMp-save.player.mp,maxMp*SPIRIT_PLAY_MP_RATE)*100)/100);
 if(restored>0){save.player.mp=Math.min(maxMp,Math.round((save.player.mp+restored)*100)/100);save.spiritPeak.playedDay??={};save.spiritPeak.playedDay[id]=localDay(now)}
 const result={index,restored};
 save.spiritPeak.lastPlay??={};save.spiritPeak.lastPlay[id]=result;
 return {...result,message:`你与${peakBeastName(save,id)}玩耍片刻。${restored>0?`法力恢复 ${restored}。`:''}`};
}
