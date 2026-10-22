import {effectiveStat} from '../data/titles.js';
export const THIEF_PLACES=['monsters','market','blackmarket','foundation'];
export const THIEF_CHANCE=.05;
export const theftChance=player=>Math.max(0,Math.min(1,(10-effectiveStat(player,'福缘'))/10));
export function maybeMeetThief(save,placeId,random=Math.random){
 if(!THIEF_PLACES.includes(placeId)||random()>=THIEF_CHANCE)return null;
 const success=random()<theftChance(save.player);
 const balance=Math.max(0,Number(save.player.spiritStones)||0);
 const stolen=success?Math.min(balance,Math.round((balance*.2+Number.EPSILON)*100)/100):0;
 if(stolen>0)save.player.spiritStones=Math.round((balance-stolen+Number.EPSILON)*100)/100;
 const text=!success?'一道人影与你擦肩而过，指尖刚探向钱袋，便被你察觉。那人轻笑一声：「今日失手，改日再会。」你低头一看，袖口不知何时多了张写着「盗圣」的纸条，灵石倒是一枚未少。':stolen>0?`一道人影与你擦肩而过。等你察觉钱袋轻了，那人早已不见，只留下一张写着「盗圣借用，多谢款待」的纸条。灵石 −${stolen}。`:'一道人影悄然摸向你的钱袋，又空着手缩了回去。「盗圣也有白跑的时候。」他叹了口气，转眼消失在人群中。你的灵石没有减少。';
 return {success,stolen,text};
}
