import {companionMemories} from '../systems/companion-memories.js';
import {createSheet,escapeHTML} from './shared.js';
export function showCompanionMemories(api,onClose,personId=null){
 const slot=api.getSave()?.slot;
 const sheet=createSheet('往昔CG',()=>{sheet.remove();onClose()});sheet.classList.add('xg-stroll-sheet','xg-memories-sheet');
 const body=sheet.querySelector('[data-body]');
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const draw=()=>{
  if(!current())return;
  const people=companionMemories(api.getSave()).filter(p=>!personId||p.id===personId);
  body.innerHTML='<p class="xg-memory-caption">旧事可重温。这里只收录已记录的剧情，不改变好感、关系或奖励。</p>'+(people.map(p=>`<section class="xg-memory-person"><h3>${escapeHTML(p.name)}<small>${p.scenes.length} 段往事</small></h3><div>${p.scenes.map(s=>`<button type="button" data-memory-person="${p.id}" data-memory-scene="${s.id}">${escapeHTML(s.title)}<span aria-hidden="true">›</span></button>`).join('')}</div></section>`).join('')||'<p>尚无可以回看的剧情。与山中故人相识后，已看过的往事会留在这里。</p>');
  body.querySelectorAll('[data-memory-scene]').forEach(b=>b.onclick=()=>{
   if(!current())return;
   const p=companionMemories(api.getSave()).find(p=>p.id===b.dataset.memoryPerson),s=p?.scenes.find(s=>s.id===b.dataset.memoryScene);if(!s)return draw();
   const top=body.scrollTop;
   body.innerHTML=`<article class="xg-memory-reading"><small>${escapeHTML(p.name)} · 往昔</small><h3>${escapeHTML(s.title)}</h3>${s.text.split('\n\n').map(t=>`<p>${escapeHTML(t)}</p>`).join('')}</article><button type="button" data-memory-back>返回往事目录</button>`;
   body.scrollTop=0;body.querySelector('[data-memory-back]').onclick=()=>{if(current()){draw();body.scrollTop=top}};
  });
 };
 draw();
}
