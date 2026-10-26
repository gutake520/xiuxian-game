import {NEWCOMER_TASKS,NEWCOMER_REWARD} from '../data/newcomer.js';
import {GAME_GUIDE} from '../data/game-guide.js';
import {createSheet,escapeHTML} from './shared.js';
export function showGameGuide(onClose){
 const sheet=createSheet('玩法指南',()=>{sheet.remove();onClose?.()});
 sheet.classList.add('xg-game-guide');
 sheet.querySelector('[data-body]').innerHTML=`<p class="xg-guide-intro">行路有疑，翻卷一看。这里的说明随时可以查阅。</p>${GAME_GUIDE.map(([title,...paragraphs],i)=>`<details class="xg-guide-chapter"><summary><span>${String(i+1).padStart(2,'0')}</span>${escapeHTML(title)}</summary>${paragraphs.map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</details>`).join('')}`;
 return sheet;
}
export function createNewcomerUI({root,getSave,navigate}){
 let expanded=false,selected=null,slot=null,busy=false;
 function render(){
  const save=getSave(),state=save?.newcomer;
  if(slot!==save?.slot){slot=save?.slot;expanded=false;selected=null}
  root.hidden=!state||state.finished||state.compensated;
  if(root.hidden){root.replaceChildren();expanded=false;selected=null;return}
  const done=state.paid||[],next=NEWCOMER_TASKS.find(t=>!done.includes(t.id));
  if(!next)return;
  if(!selected||done.includes(selected))selected=next.id;
  const task=NEWCOMER_TASKS.find(t=>t.id===selected)||next;
  const scroll=root.querySelector('.xg-newcomer-body')?.scrollTop||0;
  const focus=root.contains(root.ownerDocument.activeElement)?root.ownerDocument.activeElement?.getAttribute('data-task'):null;
  root.classList.toggle('is-expanded',expanded);
  root.innerHTML=`<button type="button" class="xg-newcomer-toggle" aria-expanded="${expanded}" aria-controls="xg-newcomer-body"><span class="xg-newcomer-spark" aria-hidden="true">✦</span><span class="xg-newcomer-caption"><strong>初入仙途</strong><span>${escapeHTML(next.goal)}</span></span><span class="xg-newcomer-count">${done.length} / ${NEWCOMER_TASKS.length}</span><span aria-hidden="true">${expanded?'⌃':'⌄'}</span></button><div id="xg-newcomer-body" class="xg-newcomer-body" ${expanded?'':'hidden'}><div class="xg-newcomer-current"><span class="xg-newcomer-kicker">当前指引 · 每项奖励 ${NEWCOMER_REWARD} 灵石</span><h3>${escapeHTML(task.title)}</h3><p>${escapeHTML(task.hint)}</p><div class="xg-newcomer-actions"><button type="button" data-go="${task.target}" ${busy?'disabled':''}>${escapeHTML(task.action)} <span aria-hidden="true">→</span></button>${task.alternate?`<button type="button" data-go="${task.alternate}" ${busy?'disabled':''}>${escapeHTML(task.alternateLabel)}</button>`:''}</div></div><div class="xg-newcomer-list" aria-label="新手任务清单">${NEWCOMER_TASKS.map((t,i)=>`<button type="button" data-task="${t.id}" ${done.includes(t.id)?'disabled':''} aria-pressed="${selected===t.id}"><span class="xg-newcomer-index">${done.includes(t.id)?'✓':String(i+1).padStart(2,'0')}</span><span>${escapeHTML(t.title)}<small>${escapeHTML(t.goal)}</small></span><span class="xg-newcomer-reward">${done.includes(t.id)?'已到账':'+2 灵石'}</span></button>`).join('')}</div><p class="xg-newcomer-note">可以提前完成，奖励自动到账。全部完成后，这份指引将收起。</p><p role="status" aria-live="polite"></p></div>`;
  root.querySelector('.xg-newcomer-toggle').onclick=()=>{expanded=!expanded;render()};
  root.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{selected=b.dataset.task;render();root.querySelector('.xg-newcomer-body').scrollTop=0});
  root.querySelectorAll('[data-go]').forEach(b=>b.onclick=async()=>{
   if(busy)return;busy=true;const origin=slot;
   root.querySelectorAll('[data-go]').forEach(button=>button.disabled=true);
   try{await navigate(b.dataset.go,origin);if(getSave()?.slot===origin)expanded=false}
   catch(error){const status=root.querySelector('[role=status]');if(status)status.textContent=error.message;busy=false;root.querySelectorAll('[data-go]').forEach(button=>button.disabled=false);return}
   finally{busy=false}
   render();
  });
  root.querySelector('.xg-newcomer-body').scrollTop=scroll;
  if(focus)root.querySelector(`[data-task="${focus}"]`)?.focus();
 }
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded){expanded=false;render();root.querySelector('.xg-newcomer-toggle')?.focus()}});
 return {render};
}
