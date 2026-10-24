import {maybeFindOldFriend} from './old-friend.js';
import {maybeFindSpring} from './spirit-spring.js';
import {maybeFindTraitor} from './traitor-puzzle.js';
import {maybeMeetThief} from './thief.js';
import {maybeMeetZhang} from './zhang-huaijin.js';
import {offerStallGame} from './stall-games.js';
import {STALL_CHANCES} from '../data/stall-games.js';
import {TREASURE_FIND_CHANCE} from '../data/treasure.js';
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
export const STROLL_EXTRA_PRICE=20;
export const STROLL_EXTRA_DAILY_LIMIT=2;
export const strollExtraCount=(save,now=Date.now())=>save.strollExtra?.day===localDay(now)?Math.min(STROLL_EXTRA_DAILY_LIMIT,Math.max(0,Math.floor(Number(save.strollExtra.purchased)||0))):0;
export const strollEncounterLimit=(save,now=Date.now())=>STROLL_ENCOUNTER_LIMIT+strollExtraCount(save,now);
export function buyStrollEncounter(save,now=Date.now()){
 if(save.battle)throw new Error('请先结束战斗。');
 const purchased=strollExtraCount(save,now);
 if(purchased>=STROLL_EXTRA_DAILY_LIMIT)throw new Error('今日已购买两次额外奇遇。');
 if(!Number.isFinite(save.player.spiritStones)||save.player.spiritStones<STROLL_EXTRA_PRICE)throw new Error('灵石不足，需要 20 灵石。');
 save.player.spiritStones-=STROLL_EXTRA_PRICE;
 save.strollExtra={day:localDay(now),purchased:purchased+1};
 return {message:'购买成功：今日奇遇上限 +1，仅当天有效。'};
}
export function takeStroll(save,id,now=Date.now(),random=Math.random){
 if(save.battle)throw new Error('请先结束战斗。');
 const place=strollPlaces(save).find(p=>p.id===id);
 if(!place)throw new Error('此处尚不能闲逛。');
 const count=strollCount(save,now);
 const encounters=strollEncounterCount(save,now),canEncounter=encounters<strollEncounterLimit(save,now);
 const lead=maybeFindOldFriend(save,id,random);
 if(lead){const result={placeId:id,...lead};save.stroll={day:localDay(now),count:count+1,encounters,last:result};return {...result,message:result.text}}
 const index=Math.min(place.stories.length-1,Math.max(0,Math.floor(random()*place.stories.length)));
 const thief=maybeMeetThief(save,id,random);
 if(thief){
  const result={placeId:id,kind:'thief',text:thief.text,stolen:thief.stolen,theftSucceeded:thief.success};
  save.stroll={day:localDay(now),count:count+1,encounters,last:result};
  return {...result,message:`${place.name}闲逛：${result.text}`};
 }
 const traitor=canEncounter&&id==='sects'&&maybeFindTraitor(save,random);
 const hadTreasure=Boolean(save.treasure);
 const found=canEncounter&&id==='blackmarket'&&maybeFindTreasure(save,random);
 const puzzle=canEncounter&&id==='spirit-peak'&&maybeFindPeakPuzzle(save,random);
 const stallKind=id==='market'?'gomoku':id==='blackmarket'?'dice':null;
 // After the thief misses, treasure takes priority; dice keeps its original conditional chance.
 const stallChance=stallKind==='dice'&&!hadTreasure?STALL_CHANCES.dice/(1-TREASURE_FIND_CHANCE):STALL_CHANCES[stallKind];
 const stall=canEncounter&&!found&&stallKind&&(!save.stallGames?.[stallKind]||save.stallGames[stallKind].phase==='done')&&random()<stallChance&&offerStallGame(save,stallKind);
 const spring=canEncounter&&id==='foundation'&&maybeFindSpring(save,random);
 const ghost=!spring&&canEncounter&&id==='foundation'&&maybeMeetZhang(save,random);
 let text=spring?'望川岭山隙间灵泉浮现，泉光仿佛随你的呼吸明灭。或可静心听息，得一卷机缘。':traitor?`${save.traitorPuzzle.sect}的执事请你协助抓叛徒，一份可疑的值守名册已经交到你手中。`:ghost?'望川岭上金铃骤响，一名红衣鬼修拦住去路。':stall?(stallKind==='gomoku'?'坊市树荫下摆着一张棋盘，摊主捻着白子，向你让出对面的座位。':'黑市深处传来骰子的脆响。庄家扣住骰盅，笑道：「来一局？买定离手。」'):puzzle==='sokoban'?'一只小兽拦住去路，将你引到一座错乱的石阵前。它指了指石箱，又指了指地上的阵纹。':puzzle==='maze'?'林间忽起薄雾，一串小小的兽爪印蜿蜒向前，似乎在邀你穿过这片迷林。':place.stories[index];
 if(!spring&&!traitor&&!ghost&&!found&&!puzzle&&!stall&&random()<RUMOR_CHANCE){const rumors=availableRumors(save);text=rumors[Math.min(rumors.length-1,Math.floor(random()*rumors.length))]}
 const result={placeId:id,text:found?'你经过一处撤摊的角落，拾到一张泛黄的残图。图上依次圈着三处山地，末尾画着一只小小的木匣。':text};
 save.stroll={day:localDay(now),count:count+1,encounters:encounters+(spring||traitor||ghost||found||puzzle||stall?1:0),last:result};
 return {...result,message:`${place.name}闲逛：${result.text}`};
}
