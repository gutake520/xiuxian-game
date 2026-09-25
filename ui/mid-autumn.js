import {escapeHTML} from './shared.js';

export function showMidAutumn({getSave,actions}){
 const pending=getSave()?.midAutumnPending,panel=document.getElementById('xg-panel');
 let sheet=document.getElementById('xg-mid-autumn-sheet');
 if(!pending||!panel?.classList.contains('open')){sheet?.remove();return}
 if(getSave().battle||getSave().divinationPending||getSave().encounterPending||getSave().seniorRewardPending||getSave().bossLine?.phase==='ambush'||getSave().bossLine?.rescuePending||getSave().qiSecret||getSave().qiMeditation)return;
 if(sheet?.dataset.year===String(pending.year)&&sheet.dataset.slot===getSave().slot)return;
 sheet?.remove();sheet=document.createElement('section');sheet.id='xg-mid-autumn-sheet';sheet.dataset.year=String(pending.year);sheet.dataset.slot=getSave().slot;
 sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','中秋奇遇 · 赏月');
 sheet.innerHTML=`<div class="xg-card"><small>中秋 · 赏月</small><h2>月色正好</h2><p>${pending.sect?`${escapeHTML(pending.visitor)}来寻你赏月，带来两块月饼。`:`${escapeHTML(pending.visitor)}做了些月饼，沿路随意分给行人，也递给你一块。`}</p><button type="button" data-eat-mooncake>吃月饼</button><p role="status" aria-live="polite"></p></div>`;
 panel.append(sheet);
 sheet.querySelector('[data-eat-mooncake]').onclick=async event=>{
  const button=event.currentTarget;button.disabled=true;
  try{await actions.eatMooncake(pending.year);sheet.remove()}
  catch(error){sheet.querySelector('[role=status]').textContent=error.message;button.disabled=false}
 };
}
