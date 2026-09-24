import {TECHNIQUES} from '../data/techniques.js';
import {syncAchievements} from './achievements.js';
export const SECT_REJOIN_DELAY=3*24*60*60*1000;
export function sectExitPrice(player){
 const realm=String(player.realm||'');
 if(realm.startsWith('炼气'))return 100;
 if(realm.startsWith('筑基'))return 300;
 return null;
}
export function assertCanJoinSect(save,now=Date.now()){
 if(save.player.sect&&save.player.sect!=='无门无派')throw new Error('已经归属宗门。');
 if((save.sectRejoinAt||0)>now)throw new Error(`离宗后尚需等待 ${Math.ceil((save.sectRejoinAt-now)/3600000)} 小时，才能再次入宗。`);
}
export function leaveSect(save,now=Date.now()){
 const sect=save.player.sect,price=sectExitPrice(save.player);
 if(!sect||sect==='无门无派')throw new Error('当前没有宗门。');
 if(save.battle)throw new Error('请先结束战斗。');
 if(save.seniorRewardPending)throw new Error('请先领取大比奖励。');
 if(price===null)throw new Error('当前境界的离宗规则尚未开放。');
 if((save.player.companions?.length||0)>1)throw new Error('须先处理多余的道侣关系；相关功能尚未开放。');
 if(save.player.spiritStones<price)throw new Error('灵石不足，无法离宗。');
 syncAchievements(save);
 save.player.spiritStones=Math.round((save.player.spiritStones-price)*100)/100;
 save.player.sect='无门无派';save.sectRejoinAt=now+SECT_REJOIN_DELAY;
 save.libraryExam=null;
 save.techniques.combat=(save.techniques.combat||[]).filter(id=>!TECHNIQUES[id]?.sect);
 if(TECHNIQUES[save.techniques.main]?.sect)save.techniques.main=null;
 save.sectProgress=null;
 return `离开${sect}，支付 ${price} 灵石；三天后可再次拜入宗门。`;
}
