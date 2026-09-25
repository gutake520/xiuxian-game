import {IDLE_LIMIT_MS,PRACTICE,PRACTICE_ENTRY_FEES} from '../data/balance.js';
import {TECHNIQUES} from '../data/techniques.js';
import {realmProgress,addCultivation} from '../data/realms.js';
export function localDay(time){const d=new Date(time);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`}
function nextMidnight(time){const d=new Date(time);d.setHours(24,0,0,0);return d.getTime()}
export function idleRate(save){return save.techniques.mastered.includes(save.techniques.main)?TECHNIQUES[save.techniques.main]?.idlePerMinute||0:0}
// 新的大境界只需在对应功法的 idleHoursByRealm 中追加上限。
export function idleLimitMs(save){
 const method=TECHNIQUES[save.techniques.main],hours=method?.idleHoursByRealm;
 const companionBonus=(save.player.companions?.length||0)>0?30*60*1000:0;
 if(!hours)return IDLE_LIMIT_MS+companionBonus;
 const major=String(save.player.realm||'').match(/^[^一二三四五六七八九十圆满]+/)?.[0];
 return (hours[major]??hours.筑基)*60*60*1000+companionBonus;
}
export function settleIdle(save,now=Date.now()){
 const idle=save.idle;if(now<=idle.lastAt)return 0;
 const rate=idleRate(save);let start=idle.lastAt,earned=0;
 while(start<now){
  const day=localDay(start);if(idle.day!==day){idle.day=day;idle.usedMs=0}
  const end=Math.min(now,nextMidnight(start));
  if(rate>0&&realmProgress(save.player).index>=0&&!realmProgress(save.player).complete){
   const dailyLimit=idleLimitMs(save)+(save.qiPillDay===day?(save.foundationPillDay===day?45:30)*60*1000:save.foundationPillDay===day?45*60*1000:0);
   const counted=Math.min(end-start,Math.max(0,dailyLimit-idle.usedMs));
   idle.usedMs+=counted;earned+=counted/60000*rate;
  }
  start=end;
 }
 if(idle.day!==localDay(now)){idle.day=localDay(now);idle.usedMs=0}
 idle.lastAt=now;
 const actual=addCultivation(save,earned);idle.totalEarned=Math.round(((idle.totalEarned||0)+actual)*100)/100;
 return actual;
}
export function paddleWidth(root){return Math.min(PRACTICE.maxPaddle,Math.max(PRACTICE.minPaddle,(Number(root)||0)*PRACTICE.paddlePerRoot))}
export function practiceReward(bricks,player){return Math.round(Math.max(0,Math.min(PRACTICE.rows*PRACTICE.columns,Math.floor(bricks)))*(String(player?.realm||'').startsWith('筑基')?100/30:PRACTICE.rewardPerBrick)*100)/100}
export function practiceEntryFee(player){return PRACTICE_ENTRY_FEES[String(player.realm||'').slice(0,2)]??null}
export function beginPracticeSession(save,now=Date.now()){
 const progress=realmProgress(save.player),fee=practiceEntryFee(save.player);
 if(progress.index<0||progress.complete||fee===null)throw new Error('当前境界暂不开放灵境修炼。');
 if(save.player.spiritStones<fee)throw new Error(`进入灵境需要 ${fee} 灵石。`);
 const id=crypto.randomUUID();
 save.player.spiritStones=Math.round((save.player.spiritStones-fee)*100)/100;
 save.practiceSession={id,startedAt:now,hasMain:idleRate(save)>0};
 return id;
}
