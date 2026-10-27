import {STALL_STORIES} from '../data/stall-sitting.js';
import {playStallSitting,availableStallChoices} from '../systems/stall-sitting.js';
import {createSheet,escapeHTML} from './shared.js';
const paragraphs=text=>text.split('\n\n').map(p=>`<p>${escapeHTML(p)}</p>`).join('');
export function showStallSitting(api,onClose){
 const slot=api.getSave().slot,initial=api.getSave().stallSitting;if(!initial){onClose();return}
 const sheet=createSheet('替人看摊',()=>{sheet.remove();onClose()});sheet.classList.add('xg-stroll-sheet','xg-stall-sitting');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');let busy=false;
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const draw=()=>{
  const p=api.getSave().stallSitting;if(!p||p.id!==initial.id)return;
  const story=STALL_STORIES[p.index],done=p.phase==='done';
  body.innerHTML=`<div class="xg-sitting-heading"><small>坊市 · 陶记杂货</small><span>${p.index+1} / ${STALL_STORIES.length}</span></div><h3>${escapeHTML(story.title)}</h3>${done?`<article class="xg-sitting-story">${paragraphs(p.text)}</article><div class="xg-sitting-pay">工钱与谢礼 · ${p.reward} 灵石</div>${p.index===STALL_STORIES.length-1?'<p class="xg-sitting-end">十次看摊已完结。此后闲逛不再触发这份委托。</p>':''}<button data-sitting-action="dismiss">${p.index===STALL_STORIES.length-1?'道别 · 返回坊市':'交还摊位 · 返回'}</button>`:`<aside class="xg-sitting-note"><small>掌柜留下的便笺</small><p>${escapeHTML(story.note)}</p></aside><article class="xg-sitting-story">${paragraphs(story.scene)}</article><button data-sitting-action="inspect" ${p.inspected?'disabled':''}>${p.inspected?'已经查看细节':'仔细查看摊上物件'}</button>${p.inspected?`<aside class="xg-sitting-clue">${paragraphs(story.inspect)}</aside>`:''}<div class="xg-sitting-choices">${availableStallChoices(p).map((c,i)=>`<button data-sitting-choice="${c.id}"><span>${'一二三'[i]}</span><b>${escapeHTML(c.label)}</b></button>`).join('')}</div><p class="xg-sitting-hint">货物与货款均属掌柜，不扣你的物品或灵石。完成获 2 灵石工钱，另有依处理结果给予的谢礼。查看细节后可能发现新的处理办法。选定后不能重选；返回可稍后继续。</p>`}`;
  body.querySelectorAll('[data-sitting-choice]').forEach(b=>b.onclick=()=>run('choose',b.dataset.sittingChoice));
  body.querySelectorAll('[data-sitting-action]').forEach(b=>b.onclick=()=>run(b.dataset.sittingAction));
 };
 const run=async(action,choice)=>{
  if(busy||!current())return;busy=true;body.querySelectorAll('button').forEach(b=>b.disabled=true);
  const top=body.scrollTop;
  try{
   const {result}=await api.actions.mutate(s=>playStallSitting(s,initial.id,action,choice),{slot,message:r=>r.message});
   if(!current())return;
   if(result.closed){sheet.remove();onClose();return}
   status.textContent='';draw();body.scrollTop=action==='choose'?0:top;
  }catch(error){if(current()){status.textContent=error.message;draw();body.scrollTop=top}}finally{busy=false}
 };
 draw();
}
