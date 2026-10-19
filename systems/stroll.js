import {maybeFindPeakPuzzle} from './peak-puzzles.js';
import {availableRumors} from './rumors.js';
import {RUMOR_CHANCE} from '../data/rumors.js';
import {maybeFindTreasure} from './treasure.js';
import {STROLL_PLACES,STROLL_ENCOUNTER_LIMIT} from '../data/stroll.js';
import {localDay} from './cultivation.js';
// Matches the main map's current foundation-region gate. Encounter residences are excluded.
export const strollPlaces=save=>STROLL_PLACES.filter(p=>!p.foundation||String(save.player.realm).startsWith('筑基'));
export const strollCount=(save,now=Date.now())=>save.stroll?.day===localDay(now)?save.stroll.count||0:0;
export const strollEncounterCount=(save,now=Date.now())=>save.stroll?.day===localDay(now)?save.stroll.encounters||0:0;
export function takeStroll(save,id,now=Date.now(),random=Math.random){
 if(save.battle)throw new Error('请先结束战斗。');
 const place=strollPlaces(save).find(p=>p.id===id);
 if(!place)throw new Error('此处尚不能闲逛。');
 const count=strollCount(save,now);
 const encounters=strollEncounterCount(save,now),canEncounter=encounters<STROLL_ENCOUNTER_LIMIT;
 const index=Math.min(place.stories.length-1,Math.max(0,Math.floor(random()*place.stories.length)));
 const found=canEncounter&&id==='blackmarket'&&maybeFindTreasure(save,random);
 const puzzle=canEncounter&&id==='spirit-peak'&&maybeFindPeakPuzzle(save,random);
 let text=puzzle==='sokoban'?'一只小兽拦住去路，将你引到一座错乱的石阵前。它指了指石箱，又指了指地上的阵纹。':puzzle==='maze'?'林间忽起薄雾，一串小小的兽爪印蜿蜒向前，似乎在邀你穿过这片迷林。':place.stories[index];
 if(!found&&!puzzle&&random()<RUMOR_CHANCE){const rumors=availableRumors(save);text=rumors[Math.min(rumors.length-1,Math.floor(random()*rumors.length))]}
 const result={placeId:id,text:found?'你经过一处撤摊的角落，拾到一张泛黄的残图。图上依次圈着三处山地，末尾画着一只小小的木匣。':text};
 save.stroll={day:localDay(now),count:count+1,encounters:encounters+(found||puzzle?1:0),last:result};
 return {...result,message:`${place.name}闲逛：${result.text}`};
}
