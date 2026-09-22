import {updateSave,readSave,writeSave} from '../storage/saves.js';
import {migrateSave} from '../storage/migrations.js';
import {settleIdle,practiceReward,idleRate} from '../systems/cultivation.js';
import {realmProgress,addCultivation} from '../data/realms.js';
import {appendEvent} from '../systems/events.js';
export function createActions({getSave,setSave}){
 async function select(slot){const data=await updateSave(slot,s=>{migrateSave(s);settleIdle(s);return s});setSave(data);return data}
 async function mutate(change,{message,slot=getSave()?.slot}={}){
  if(!slot)throw new Error('请先选择存档。');
  let result;
  const data=await updateSave(slot,s=>{migrateSave(s);settleIdle(s);result=change?.(s);if(result?.then)throw new Error('操作结算不能包含异步任务。');if(message)appendEvent(s,typeof message==='function'?message(result,s):message);s.updatedAt=Date.now();return s});
  if(getSave()?.slot===slot)setSave(data);return{save:data,result};
 }
 async function create(data){migrateSave(data);await writeSave(data);setSave(data);return data}
 return{select,mutate,create,read:readSave,refresh:()=>mutate(),
  startPractice:()=>mutate(s=>{if(realmProgress(s.player).index<0||realmProgress(s.player).complete)throw new Error('当前境界暂不开放修炼。');const id=crypto.randomUUID();s.practiceSession={id,startedAt:Date.now(),hasMain:idleRate(s)>0};return id}),
  finishPractice:(id,bricks,slot)=>mutate(s=>{if(s.practiceSession?.id!==id)throw new Error('这一局已结算或已失效。');const amount=s.practiceSession.hasMain?practiceReward(bricks):(bricks>0?1:0);const earned=addCultivation(s,amount);s.practiceSession=null;return earned},{slot,message:earned=>`主动修炼结束，获得 ${earned} 修为。`})
 };
}
