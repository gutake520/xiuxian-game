import {showPeakPuzzle} from './peak-puzzles.js';
import {showTreasure} from './treasure.js';
import {STROLL_PLACES,STROLL_DAILY_LIMIT} from '../data/stroll.js';
import {strollPlaces,strollCount,takeStroll} from '../systems/stroll.js';
import {createSheet,escapeHTML} from './shared.js';
export function showStroll(api,onClose){
 const save=api.getSave(),slot=save.slot,sheet=createSheet('四处走走',()=>{sheet.remove();onClose()});
 sheet.classList.add('xg-stroll-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]'),count=strollCount(save),last=save.stroll?.last;
 body.innerHTML=`<p>今日闲逛 ${count} / ${STROLL_DAILY_LIMIT}</p><div class="xg-stroll-places">${strollPlaces(save).map(p=>`<button type="button" data-stroll-place="${p.id}" ${count>=STROLL_DAILY_LIMIT?'disabled':''}>去${p.name}逛逛</button>`).join('')}</div>${save.peakPuzzle?`<button type="button" data-peak-puzzle>${save.peakPuzzle.kind==='sokoban'?'搬石归阵':'林间迷踪'}</button>`:''}${save.treasure?'<button type="button" data-treasure>查看藏宝图</button>':''}${last?`<article class="xg-feature-card"><h3>${escapeHTML(STROLL_PLACES.find(p=>p.id===last.placeId)?.name||'途中见闻')}</h3><p>${escapeHTML(last.text)}</p></article>`:''}`;
 body.querySelector('[data-treasure]')?.addEventListener('click',()=>showTreasure(api,()=>showStroll(api,onClose)));
 body.querySelector('[data-peak-puzzle]')?.addEventListener('click',()=>showPeakPuzzle(api,()=>showStroll(api,onClose)));
 let busy=false;
 body.querySelectorAll('[data-stroll-place]').forEach(button=>button.onclick=async()=>{
  if(busy||button.disabled)return;busy=true;
  const buttons=[...body.querySelectorAll('[data-stroll-place]')];buttons.forEach(b=>b.disabled=true);
  try{
   await api.actions.mutate(s=>takeStroll(s,button.dataset.strollPlace),{slot,message:r=>r.message});
   if(sheet.isConnected&&api.getSave()?.slot===slot)showStroll(api,onClose);
  }catch(error){status.textContent=error.message}finally{busy=false;buttons.forEach(b=>b.disabled=count>=STROLL_DAILY_LIMIT)}
 });
}
