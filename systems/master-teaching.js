import {startOldFriend} from './old-friend.js';
import {SECT_MASTERS} from '../data/masters.js';
import {QI_MONSTERS} from '../data/locations.js';
import {realmProgress,addCultivation} from '../data/realms.js';
import {localDay} from './cultivation.js';
export const TEACHING_MATERIALS={tough:'獠牙',fierce:'尾豹尾骨',swift:'风影皮毛','tough-mid':'磐牙兽硬牙','fierce-mid':'赤爪豹利爪','swift-mid':'疾风貂尾毛'};
const guidance=['替你纠正行气时的几处偏差','指点你调息凝神，将战中所得化入修行','与你拆解招式，再引你运转一个周天'];
const pick=(a,r)=>a[Math.max(0,Math.min(a.length-1,Math.floor(r()*a.length)))];
export function teachingMaster(save){return SECT_MASTERS[save.player.sect]}
export function teachingStatus(save,now=Date.now()){
 const state=save.masterTeaching||{};
 return {completed:state.qiCompleted||0,task:state.task||null,tried:state.attemptDay===localDay(now),foundationReady:(state.qiCompleted||0)>=3&&realmProgress(save.player).index>=10};
}
function requireMaster(save){if(save.battle)throw new Error('请先结束战斗。');const master=teachingMaster(save);if(!master)throw new Error('请先拜入宗门，再来请教师父。');return master}
export function visitTeachingMaster(save,now=Date.now(),random=Math.random){
 const master=requireMaster(save),status=teachingStatus(save,now);
 if(status.task)throw new Error('先完成手中的委托，再来请教师父。');
 if(status.completed>=3){if(status.foundationReady)return startOldFriend(save,now);throw new Error('炼气授业已经完成，待筑基后再来。')}
 if(status.tried)throw new Error('今日已拜访过师父，明日再来。');
 const eligible=QI_MONSTERS.filter(m=>TEACHING_MATERIALS[m.id]&&m.minLevel<=realmProgress(save.player).index+1);
 if(!eligible.length)throw new Error('当前境界暂不能领取委托。');
 const state=save.masterTeaching??={qiCompleted:0};state.attemptDay=localDay(now);
 if(random()>=.4){state.lastText=`${master.name}正在闭关参悟，今日未布置委托。明日再来拜访。`;return state.lastText}
 const monster=pick(eligible,random);
 state.task={id:crypto.randomUUID(),monsterId:monster.id,material:TEACHING_MATERIALS[monster.id],collected:0,target:10,acceptedAt:now,assignedBy:master.name};
 state.lastText=`${master.name}吩咐你击败${monster.name}，带回${state.task.material}十份，再来领受指点。`;
 return state.lastText;
}
export function collectTeachingMaterial(save,monsterId){
 const task=save.masterTeaching?.task;
 if(!task||task.monsterId!==monsterId||task.collected>=task.target||!TEACHING_MATERIALS[monsterId])return null;
 task.collected++;
 return `${task.material}×1（师门委托 ${task.collected}/${task.target}）`;
}
export function submitTeachingTask(save,id,now=Date.now(),random=Math.random){
 const master=requireMaster(save),state=save.masterTeaching,task=state?.task;
 if(!task||task.id!==id)throw new Error('这份委托已经交付或不存在。');
 if(task.collected<task.target)throw new Error(`还需收集 ${task.target-task.collected} 份${task.material}。`);
 if((state.qiCompleted||0)>=3)throw new Error('炼气授业已完成。');
 const reward=60+Math.min(30,Math.max(0,Math.floor(random()*31))),lesson=pick(guidance,random),earned=addCultivation(save,reward);
 state.qiCompleted=(state.qiCompleted||0)+1;state.task=null;
 state.lastText=`你交上十份${task.material}，${master.name}${lesson}。修为 +${earned}。${state.qiCompleted===3?'三次炼气授业已毕。师父道：「待筑基后，再来问道。」':''}`;
 return {text:state.lastText,reward,earned};
}
