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
 if(value>=SPIRIT_PEAK_GOAL)throw new Error('这只异兽已经喂养圆满。');
 if(count>=SPIRIT_PEAK_LIMIT)throw new Error('今日已喂养二十次，明日再来。');
 const entry=save.inventory.find(e=>e.uid===uid);
 if(!entry||!isPeakHerb(entry.itemId)||!(entry.quantity>0))throw new Error('请选择储物袋里的药草。');
 entry.quantity--;if(!entry.quantity)save.inventory=save.inventory.filter(e=>e!==entry);
 save.spiritPeak??={};save.spiritPeak.feeding??={};
 save.spiritPeak.day=localDay(now);save.spiritPeak.used=count+1;save.spiritPeak.feeding[id]=value+1;
 syncAchievements(save);
 return {completed:value+1===SPIRIT_PEAK_GOAL,message:`喂养${beast.name}，喂养值 ${value+1} / ${SPIRIT_PEAK_GOAL}。`};
}
