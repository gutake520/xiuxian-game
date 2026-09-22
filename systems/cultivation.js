import {IDLE_LIMIT_MS,PRACTICE} from '../data/balance.js';
import {TECHNIQUES} from '../data/techniques.js';
import {realmProgress,addCultivation} from '../data/realms.js';
export function localDay(time){const d=new Date(time);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`}
function nextMidnight(time){const d=new Date(time);d.setHours(24,0,0,0);return d.getTime()}
export function idleRate(save){return save.techniques.mastered.includes(save.techniques.main)?TECHNIQUES[save.techniques.main]?.idlePerMinute||0:0}
export function settleIdle(save,now=Date.now()){
 const idle=save.idle;if(now<=idle.lastAt)return 0;
 const rate=idleRate(save);let start=idle.lastAt,earned=0;
 while(start<now){
  const day=localDay(start);if(idle.day!==day){idle.day=day;idle.usedMs=0}
  const end=Math.min(now,nextMidnight(start));
  if(rate>0&&realmProgress(save.player).index>=0&&!realmProgress(save.player).complete){
   const counted=Math.min(end-start,Math.max(0,IDLE_LIMIT_MS-idle.usedMs));
   idle.usedMs+=counted;earned+=counted/60000*rate;
  }
  start=end;
 }
 if(idle.day!==localDay(now)){idle.day=localDay(now);idle.usedMs=0}
 idle.lastAt=now;
 const actual=addCultivation(save,earned);idle.totalEarned=(idle.totalEarned||0)+actual;
 return actual;
}
export function paddleWidth(root){return Math.min(PRACTICE.maxPaddle,Math.max(PRACTICE.minPaddle,(Number(root)||0)*PRACTICE.paddlePerRoot))}
export function practiceReward(bricks){return Math.max(0,Math.min(PRACTICE.rows*PRACTICE.columns,Math.floor(bricks)))*PRACTICE.rewardPerBrick}
