import {showOldFriend} from './old-friend.js';
import {oldFriendState,oldFriendGoal} from '../systems/old-friend.js';
import {teachingMaster,teachingStatus,visitTeachingMaster,submitTeachingTask} from '../systems/master-teaching.js';
import {QI_MONSTERS} from '../data/locations.js';
import {createSheet,escapeHTML} from './shared.js';
export function showMasterTeaching(api,onClose){
 const slot=api.getSave().slot,sheet=createSheet('师尊授业',()=>{sheet.remove();onClose()});
 const body=sheet.querySelector('[data-body]'),message=sheet.querySelector('[role=status]');let busy=false;
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const draw=()=>{
  const save=api.getSave(),master=teachingMaster(save),state=teachingStatus(save);
  if(!master){body.textContent='请先拜入宗门。';return}
  const task=state.task,monster=QI_MONSTERS.find(m=>m.id===task?.monsterId);
  body.innerHTML=`<article class="xg-feature-card"><h3>${escapeHTML(master.name)}</h3><p>${escapeHTML(save.player.sect)} · 炼气授业 ${state.completed} / 3</p>${state.completed>=3?`<p>「炼气根基已稳，待筑基后，再来问道。」</p>${state.foundationReady?`<p>${escapeHTML(oldFriendState(save)?oldFriendGoal(save):'师父有一桩关于故人的旧事，想托付于你。')}</p><button type="button" data-old-friend>${oldFriendState(save)?'故人之子 · 继续':'筑基授业 · 故人之子'}</button>`:''}`:task?`<p>委托：击败${escapeHTML(monster?.name)}，收集${escapeHTML(task.material)}。</p><p>已收集 ${task.collected} / ${task.target} 份</p><p>接取后每击败一只目标，获得一份任务材料；不限完成时间，材料不占储物格。</p><button type="button" data-submit ${task.collected<task.target?'disabled':''}>交付材料 · 请教师父</button>`:`<p>每日可拜访一次，师父有时会交付历练委托。炼气授业共三次，筑基后也需先补完。</p><button type="button" data-visit ${state.tried?'disabled':''}>${state.tried?'今日已拜访，明日再来':'拜访师父'}</button>`}</article>${save.masterTeaching?.lastText?`<article class="xg-feature-card"><p>${escapeHTML(save.masterTeaching.lastText)}</p></article>`:''}`;
  body.querySelector('[data-old-friend]')?.addEventListener('click',()=>{if(oldFriendState(api.getSave()))showOldFriend(api,()=>showMasterTeaching(api,onClose),'master');else run(s=>visitTeachingMaster(s),true)});
  body.querySelector('[data-visit]')?.addEventListener('click',()=>run(s=>visitTeachingMaster(s)));
  body.querySelector('[data-submit]')?.addEventListener('click',()=>run(s=>submitTeachingTask(s,task.id)));
 };
 const run=async (fn,openStory=false)=>{if(busy||!current())return;busy=true;body.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{await api.actions.mutate(fn,{slot,message:r=>typeof r==='string'?r:r.text});if(current()){message.textContent='';const top=sheet.scrollTop;draw();sheet.scrollTop=top;if(openStory)showOldFriend(api,()=>showMasterTeaching(api,onClose),'master')}}
  catch(error){if(current()){draw();message.textContent=error.message}}finally{busy=false}
 };
 draw();
}
