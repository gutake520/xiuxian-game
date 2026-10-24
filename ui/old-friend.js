import {OLD_FRIEND_CHAPTERS} from '../data/old-friend.js';
import {oldFriendState,oldFriendGoal,oldFriendScene,chooseOldFriend,continueOldFriend,oldFriendChoiceReason,startOldFriendDuel,reportOldFriend} from '../systems/old-friend.js';
import {showBattle} from './combat.js';
import {createSheet,escapeHTML} from './shared.js';
const prose=t=>String(t).split('\n\n').map(p=>`<p>${escapeHTML(p)}</p>`).join('');
export function showOldFriend(api,onClose,context='journal'){
 const slot=api.getSave().slot,id=oldFriendState(api.getSave())?.id;
 const sheet=createSheet('故人之子',()=>{sheet.remove();onClose()});sheet.classList.add('xg-old-friend');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');let busy=false;
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 async function run(change,duel=false){if(busy||!current())return;busy=true;body.querySelectorAll('button').forEach(b=>b.disabled=true);try{await api.actions.mutate(change,{slot});if(current()){if(duel){sheet.remove();showBattle({getSave:api.getSave,actions:api.actions,activate:()=>{},onExit:()=>showOldFriend(api,onClose,'ruins')})}else draw()}}catch(e){if(current()){draw();status.textContent=e.message}}finally{busy=false}}
 function draw(){
  const save=api.getSave(),q=oldFriendState(save);status.textContent='';
  if(!q||q.id!==id){body.innerHTML='<p>师门已改，这一段嘱托也随之归还。请回当前宗门重新请教师父。</p>';return}
  const step=q.step,displayStep=Math.min(q.phase==='after'?step-1:step,7),displayChapter=OLD_FRIEND_CHAPTERS[displayStep],chapter=OLD_FRIEND_CHAPTERS[Math.min(step,7)],canChoose=q.phase==='ready'&&chapter.place===context;
  const visible=['after','done'].includes(q.phase)||canChoose||q.phase==='duel';
  body.innerHTML=`<div class="xg-old-friend-mast"><span>师门旧事 · ${escapeHTML(q.master)}</span><h3>${q.phase==='done'?escapeHTML(q.reportTitle||'归山复命'):escapeHTML(displayChapter.title)}</h3><small>${q.phase==='done'?(q.reportedAt!=null?'此卷终':'尾声 · 待复命'):`第 ${displayStep+1} / 8 折`}</small></div><p class="xg-old-friend-goal">${escapeHTML(oldFriendGoal(save))}</p>${visible?`<article class="xg-old-friend-prose">${prose(oldFriendScene(save))}</article>`:'<article class="xg-old-friend-prose"><p>有些话，要走到那个人面前，才能听见。</p><p>已得的线索记在下方手札中。消息调查不占每日奇遇次数。</p></article>'}<div class="xg-old-friend-choices"></div><details class="xg-old-friend-journal"><summary>翻看手札 · ${q.journal.length} 段往事</summary>${q.journal.map(e=>`<article><h4>${escapeHTML(e.title)}</h4><small>你选择了：${escapeHTML(e.choice)}</small>${prose(e.text)}</article>`).join('')||'<p>旧信刚刚打开，来路尚待你亲自走过。</p>'}</details>`;
  const choices=body.querySelector('.xg-old-friend-choices');
  if(canChoose)for(const [key,label] of chapter.choices){const reason=oldFriendChoiceReason(save,key),b=document.createElement('button');b.type='button';b.dataset.oldFriendChoice=key;b.disabled=Boolean(reason);b.innerHTML=`<span>${escapeHTML(label)}</span>${reason?`<small>${escapeHTML(reason)}</small>`:''}`;b.onclick=()=>run(s=>chooseOldFriend(s,id,step,key,context));choices.append(b)}
  if(q.phase==='after'){const b=document.createElement('button');b.type='button';b.textContent=q.step>=8?'记下约定，回宗门复命':'继续';b.dataset.oldFriendContinue='';b.onclick=()=>run(s=>continueOldFriend(s,id));choices.append(b)}
  if(q.phase==='done'&&q.reportedAt==null&&context==='master'){const b=document.createElement('button');b.type='button';b.textContent='向师父复命';b.dataset.oldFriendReport='';b.onclick=()=>run(s=>reportOldFriend(s,id,context));choices.append(b)}
  if(q.phase==='duel'&&context==='ruins'){const b=document.createElement('button');b.type='button';b.textContent='与江既白交锋';b.dataset.oldFriendDuel='';b.onclick=()=>run(s=>startOldFriendDuel(s,id),true);choices.append(b)}
  body.scrollTop=0;
 }
 draw();
}
