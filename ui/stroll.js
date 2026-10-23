import {showTraitorPuzzle} from './traitor-puzzle.js';
import {showStallGame} from './stall-games.js';
import {showPeakPuzzle} from './peak-puzzles.js';
import {showTreasure} from './treasure.js';
import {STROLL_PLACES,STROLL_ENCOUNTER_LIMIT} from '../data/stroll.js';
import {strollPlaces,strollEncounterCount,takeStroll} from '../systems/stroll.js';
import {createSheet,escapeHTML} from './shared.js';
export function showStroll(api,onClose){
 const save=api.getSave(),slot=save.slot,sheet=createSheet('四处走走',()=>{sheet.remove();onClose()});
 sheet.classList.add('xg-stroll-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]'),count=strollEncounterCount(save),last=save.stroll?.last;
 body.innerHTML=`<p>今日奇遇 ${count} / ${STROLL_ENCOUNTER_LIMIT}</p><div class="xg-stroll-places">${strollPlaces(save).map(p=>`<button type="button" data-stroll-place="${p.id}">去${p.name}逛逛</button>`).join('')}</div>${['gomoku','dice'].filter(k=>save.stallGames?.[k]&&save.stallGames[k].phase!=='done').map(k=>`<button type="button" data-stall="${k}">${k==='gomoku'?'坊市棋摊':'黑市骰局'}</button>`).join('')}${save.traitorPuzzle?'<button type="button" data-traitor-puzzle>抓叛徒 · 继续排查</button>':''}${save.peakPuzzle?`<button type="button" data-peak-puzzle>${save.peakPuzzle.kind==='sokoban'?'搬石归阵':'林间迷踪'}</button>`:''}${save.treasure?'<button type="button" data-treasure>查看藏宝图</button>':''}${last?`<article class="xg-feature-card"><h3>${escapeHTML(STROLL_PLACES.find(p=>p.id===last.placeId)?.name||'途中见闻')}</h3><p>${escapeHTML(last.text)}</p></article>`:''}`;
 body.querySelector('[data-traitor-puzzle]')?.addEventListener('click',()=>showTraitorPuzzle(api,()=>showStroll(api,onClose)));
 body.querySelector('[data-treasure]')?.addEventListener('click',()=>showTreasure(api,()=>showStroll(api,onClose)));
 body.querySelector('[data-peak-puzzle]')?.addEventListener('click',()=>showPeakPuzzle(api,()=>showStroll(api,onClose)));
 body.querySelectorAll('[data-stall]').forEach(b=>b.onclick=()=>showStallGame(api,b.dataset.stall,()=>showStroll(api,onClose)));
 let busy=false;
 body.querySelectorAll('[data-stroll-place]').forEach(button=>button.onclick=async()=>{
  if(busy||button.disabled)return;busy=true;
  const buttons=[...body.querySelectorAll('[data-stroll-place]')];buttons.forEach(b=>b.disabled=true);
  try{
   await api.actions.mutate(s=>takeStroll(s,button.dataset.strollPlace),{slot,message:r=>r.message});
   if(sheet.isConnected&&api.getSave()?.slot===slot){if(api.getSave().battle){sheet.remove();onClose()}else showStroll(api,onClose)}
  }catch(error){status.textContent=error.message}finally{busy=false;buttons.forEach(b=>b.disabled=false)}
 });
}
