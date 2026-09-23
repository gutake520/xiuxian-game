import {updateSave,readSave,writeSave} from '../storage/saves.js';
import {migrateSave} from '../storage/migrations.js';
import {settleIdle,practiceReward,idleRate} from '../systems/cultivation.js';
import {realmProgress,addCultivation} from '../data/realms.js';
import {appendEvent} from '../systems/events.js';
import {beginBattle,playRound,fleeBattle,useBattleTalisman} from '../systems/combat.js';
import {settleRecovery} from '../systems/recovery.js';
import {finishQiExploration} from '../systems/exploration.js';
export function createActions({getSave,setSave}){
 function settleWorld(save){migrateSave(save);if(save.qiSecret){const until=Math.min(Date.now(),save.qiSecret.endsAt);save.idle.lastAt=Math.max(save.idle.lastAt,until);save.recovery??={hpAt:until,mpAt:until};save.recovery.hpAt=Math.max(save.recovery.hpAt,until);save.recovery.mpAt=Math.max(save.recovery.mpAt,until)}settleIdle(save);settleRecovery(save)}
 async function select(slot){const data=await updateSave(slot,s=>{settleWorld(s);return s});setSave(data);return data}
 async function mutate(change,{message,slot=getSave()?.slot,allowBattle=false,allowDebt=false,allowExploration=false}={}){
  if(!slot)throw new Error('请先选择存档。');
  let result;
  const data=await updateSave(slot,s=>{settleWorld(s);if(change&&s.qiSecret&&!allowExploration)throw new Error('秘境探索中，请先等待探索结束。');if(change&&s.battle&&!allowBattle)throw new Error('请先结束当前战斗。');if(change&&s.player.cultivation< -100&&!allowDebt)throw new Error('请先去修炼。');result=change?.(s);if(result?.then)throw new Error('操作结算不能包含异步任务。');const entry=typeof message==='function'?message(result,s):message;if(entry)appendEvent(s,entry);s.updatedAt=Date.now();return s});
  if(getSave()?.slot===slot)setSave(data);return{save:data,result};
 }
 async function create(data){migrateSave(data);await writeSave(data);setSave(data);return data}
 return{select,mutate,create,read:readSave,refresh:()=>mutate(),
  finishExploration:()=>mutate(s=>finishQiExploration(s),{allowExploration:true,allowDebt:true,message:result=>result}),
  startBattle:(id,pet)=>mutate(s=>beginBattle(s,id,pet)),
  battleTalisman:id=>mutate(s=>useBattleTalisman(s,id),{allowBattle:true}),
  battleRound:action=>mutate(s=>playRound(s,action),{allowBattle:true,message:(result)=>result.result?`${result.result.monster}：${result.result.outcome==='victory'?'胜利': '战败'}。`:null}),
  flee:()=>mutate(s=>fleeBattle(s),{allowBattle:true,message:result=>`脱离${result.monster}的战斗，${result.cost}。`}),
  startPractice:()=>mutate(s=>{if(realmProgress(s.player).index<0||realmProgress(s.player).complete)throw new Error('当前境界暂不开放修炼。');const id=crypto.randomUUID();s.practiceSession={id,startedAt:Date.now(),hasMain:idleRate(s)>0};return id},{allowDebt:true}),
  finishPractice:(id,bricks,slot)=>mutate(s=>{if(s.practiceSession?.id!==id)throw new Error('这一局已结算或已失效。');const amount=s.practiceSession.hasMain?practiceReward(bricks):(bricks>0?1:0);const earned=addCultivation(s,amount);s.practiceSession=null;return earned},{slot,allowDebt:true,message:earned=>`主动修炼结束，获得 ${earned} 修为。`})
 };
}
