import {syncAchievements} from '../systems/achievements.js';
import {dailyTasks,recordDailyProgress} from '../systems/sect-progression.js';
import {updateSave,readSave,writeSave} from '../storage/saves.js';
import {migrateSave} from '../storage/migrations.js';
import {settleIdle,practiceReward,idleRate} from '../systems/cultivation.js';
import {realmProgress,addCultivation} from '../data/realms.js';
import {appendEvent} from '../systems/events.js';
import {beginBattle,playRound,fleeBattle,useBattleTalisman,useBattleArray} from '../systems/combat.js';
import {settleRecovery} from '../systems/recovery.js';
import {finishQiExploration} from '../systems/exploration.js';
import {finishMeditation} from '../systems/sect-services.js';
import {resolveHerbalist} from '../systems/encounters.js';
import {startSectTournament} from '../systems/sect-tournament.js';
export function createActions({getSave,setSave}){
 function settleWorld(save){migrateSave(save);dailyTasks(save);const wait=save.qiSecret||save.qiMeditation;if(wait){const until=Math.min(Date.now(),wait.endsAt);save.idle.lastAt=Math.max(save.idle.lastAt,until);save.recovery??={hpAt:until,mpAt:until};save.recovery.hpAt=Math.max(save.recovery.hpAt,until);save.recovery.mpAt=Math.max(save.recovery.mpAt,until)}settleIdle(save);settleRecovery(save)}
 async function select(slot){const data=await updateSave(slot,s=>{settleWorld(s);return s});setSave(data);return data}
 async function mutate(change,{message,slot=getSave()?.slot,allowBattle=false,allowDebt=false,allowWait=false}={}){
  if(!slot)throw new Error('请先选择存档。');
  let result;
  const data=await updateSave(slot,s=>{settleWorld(s);if(change&&(s.qiSecret||s.qiMeditation)&&!allowWait)throw new Error('正在等待探索或静坐结束，请稍候。');if(change&&s.battle&&!allowBattle)throw new Error('请先结束当前战斗。');if(change&&s.player.cultivation< -100&&!allowDebt)throw new Error('请先去修炼。');const before={stones:s.player.spiritStones,battleId:s.lastBattle?.id};result=change?.(s);if(result?.then)throw new Error('操作结算不能包含异步任务。');recordDailyProgress(s,before,!allowBattle);syncAchievements(s);const entry=typeof message==='function'?message(result,s):message;if(entry)appendEvent(s,entry);s.updatedAt=Date.now();return s});
  if(getSave()?.slot===slot)setSave(data);return{save:data,result};
 }
 async function create(data){migrateSave(data);await writeSave(data);setSave(data);return data}
 return{select,mutate,create,read:readSave,refresh:()=>mutate(),
  finishExploration:()=>mutate(s=>finishQiExploration(s),{allowWait:true,allowDebt:true,message:result=>result}),
  finishMeditation:()=>mutate(s=>finishMeditation(s),{allowWait:true,allowDebt:true,message:result=>result}),
  startBattle:(id,pet)=>mutate(s=>beginBattle(s,id,pet)),
  startSectTournament:()=>mutate(s=>startSectTournament(s)),
  battleTalisman:id=>mutate(s=>useBattleTalisman(s,id),{allowBattle:true}),
  battleArray:()=>mutate(s=>useBattleArray(s),{allowBattle:true}),
  battleRound:action=>mutate(s=>playRound(s,action),{allowBattle:true,message:(result)=>result.result?`${result.result.monster}：${result.result.outcome==='victory'?'胜利': '战败'}。`:null}),
  flee:()=>mutate(s=>fleeBattle(s),{allowBattle:true,message:result=>`脱离${result.monster}的战斗，${result.cost}。`}),
  respondToHerbalist:(id,give)=>mutate(s=>resolveHerbalist(s,id,give),{message:result=>result}),
  startPractice:()=>mutate(s=>{if(realmProgress(s.player).index<0||realmProgress(s.player).complete)throw new Error('当前境界暂不开放修炼。');const id=crypto.randomUUID();s.practiceSession={id,startedAt:Date.now(),hasMain:idleRate(s)>0};return id},{allowDebt:true}),
  finishPractice:(id,bricks,slot)=>mutate(s=>{if(s.practiceSession?.id!==id)throw new Error('这一局已结算或已失效。');const amount=s.practiceSession.hasMain?practiceReward(bricks):(bricks>0?1:0);const earned=addCultivation(s,amount);s.practiceSession=null;return earned},{slot,allowDebt:true,message:earned=>`主动修炼结束，获得 ${earned} 修为。`})
 };
}
