import {availableRumors} from './rumors.js';
import {RUMOR_CHANCE} from '../data/rumors.js';
import {maybeFindTreasure} from './treasure.js';
import {STROLL_PLACES,STROLL_DAILY_LIMIT} from '../data/stroll.js';
import {localDay} from './cultivation.js';
// Matches the main map's current foundation-region gate. Encounter residences are excluded.
export const strollPlaces=save=>STROLL_PLACES.filter(p=>!p.foundation||String(save.player.realm).startsWith('筑基'));
export const strollCount=(save,now=Date.now())=>save.stroll?.day===localDay(now)?save.stroll.count||0:0;
export function takeStroll(save,id,now=Date.now(),random=Math.random){
 if(save.battle)throw new Error('请先结束战斗。');
 const place=strollPlaces(save).find(p=>p.id===id);
 if(!place)throw new Error('此处尚不能闲逛。');
 const count=strollCount(save,now);
 if(count>=STROLL_DAILY_LIMIT)throw new Error('今日已走过十回，明日再逛。');
 const index=Math.min(place.stories.length-1,Math.max(0,Math.floor(random()*place.stories.length)));
 const found=id==='blackmarket'&&maybeFindTreasure(save,random);
 let text=place.stories[index];
 if(!found&&random()<RUMOR_CHANCE){const rumors=availableRumors(save);text=rumors[Math.min(rumors.length-1,Math.floor(random()*rumors.length))]}
 const result={placeId:id,text:found?'你经过一处撤摊的角落，拾到一张泛黄的残图。图上依次圈着三处山地，末尾画着一只小小的木匣。':text};
 save.stroll={day:localDay(now),count:count+1,last:result};
 return {...result,message:`${place.name}闲逛：${result.text}`};
}
