import {appendEvent} from './events.js';
export const FLIGHT_RULES={gates:20,interval:1400,lead:2200,medium:10,high:16,maxHits:3,fine:10,xpPerStone:5};
export function flightWeek(now=Date.now()){
 const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d.getTime();
}
const round=n=>Math.round(n*100)/100;
export function settleFlightWeek(save,now=Date.now()){
 const sect=save.player.sect;if(!sect||sect==='无门无派'){save.sectFlight=null;return null}
 const week=flightWeek(now);let state=save.sectFlight;
 if(!state||state.sect!==sect){save.sectFlight={sect,week,graceWeek:week,best:0,rewarded:save.flightRewardWeek===week,run:null,lastResult:null};return null}
 if(week<=state.week)return null;
 const previous=new Date(week);previous.setDate(previous.getDate()-7);const prev=previous.getTime();
 let text=null;
 if(state.graceWeek!==prev&&!(state.week===prev&&state.best>=FLIGHT_RULES.medium)){
  const stones=round(Math.min(FLIGHT_RULES.fine,Math.max(0,save.player.spiritStones||0)));
  const xp=round(Math.min(Math.max(0,save.player.cultivation||0),(FLIGHT_RULES.fine-stones)*FLIGHT_RULES.xpPerStone));
  save.player.spiritStones=round(save.player.spiritStones-stones);save.player.cultivation=round(save.player.cultivation-xp);
  text=`上周御剑考核未达中等，扣除 ${stones} 灵石${xp?`、${xp} 修为`:''}。${stones<10&&xp<(10-stones)*5?'修为不足部分免除。':''}`;
  state.lastPenalty={week:prev,stones,xp,text};appendEvent(save,text);
 }
 state.week=week;state.best=0;state.rewarded=save.flightRewardWeek===week;state.run=null;state.lastResult=null;
 return text;
}
function stateFor(save,now){
 settleFlightWeek(save,now);if(!save.sectFlight)throw new Error('请先加入宗门。');if(save.battle)throw new Error('请先结束战斗。');return save.sectFlight;
}
export function startFlight(save,now=Date.now(),random=Math.random){
 const state=stateFor(save,now);if(state.run)throw new Error('请先完成当前考核。');
 const gates=Array.from({length:FLIGHT_RULES.gates},(_,i)=>{const ring=Math.min(2,Math.floor(random()*3));return {at:FLIGHT_RULES.lead+i*FLIGHT_RULES.interval,ring,rock:(ring+1+(random()<.5?0:1))%3}});
 state.run={id:crypto.randomUUID(),token:null,paused:true,elapsed:0,lastAt:now,lane:1,next:0,score:0,hits:0,gates};
 return state.run.id;
}
export function resumeFlight(save,id,now=Date.now()){
 const state=stateFor(save,now),run=state.run;if(!run||run.id!==id)throw new Error('本次考核已结束。');
 run.token=crypto.randomUUID();run.paused=false;run.lastAt=now;return run.token;
}
function finish(save,state,run){
 const passed=run.next===run.gates.length&&run.hits<FLIGHT_RULES.maxHits&&run.score>=FLIGHT_RULES.medium;
 const grade=passed?(run.score>=FLIGHT_RULES.high?'上等':'中等'):'未通过';
 if(passed)state.best=Math.max(state.best,run.score);
 const bonus=grade==='上等'&&!state.rewarded;if(bonus){state.rewarded=true;save.flightRewardWeek=state.week;save.sectPoints=(save.sectPoints||0)+1}
 const text=`御剑考核：${grade}。穿环 ${run.score}/${FLIGHT_RULES.gates}，碰撞 ${run.hits} 次。${bonus?'本周首次上等，宗门积分 +1。':''}`;
 state.lastResult={grade,score:run.score,hits:run.hits,text};state.run=null;
 return {completed:true,text};
}
export function tickFlight(save,id,token,lane=null,now=Date.now(),pause=false){
 const state=stateFor(save,now),run=state.run;
 if(!run||run.id!==id||run.token!==token||run.paused)throw new Error('考核已暂停或在其他页面打开，请重新进入。');
 if(lane!==null&&(!Number.isInteger(lane)||lane<0||lane>2))throw new Error('御剑方向无效。');
 const delta=Math.max(0,now-run.lastAt);
 // Background tabs and closed pages pause rather than charging offline flight time.
 if(delta<=1000)run.elapsed+=delta;
 run.lastAt=Math.max(now,run.lastAt);
 while(run.next<run.gates.length&&run.gates[run.next].at<=run.elapsed){
  const gate=run.gates[run.next++];if(run.lane===gate.ring)run.score++;if(run.lane===gate.rock)run.hits++;
  if(run.hits>=FLIGHT_RULES.maxHits)return finish(save,state,run);
 }
 if(run.next===run.gates.length)return finish(save,state,run);
 if(lane!==null)run.lane=lane;
 if(pause)run.paused=true;
 return {};
}
export function abandonFlight(save,id,now=Date.now()){
 const state=stateFor(save,now);if(!state.run||state.run.id!==id)throw new Error('本次考核已结束。');
 state.run=null;return {text:'本次御剑考核已结束，可重新应试。'};
}
