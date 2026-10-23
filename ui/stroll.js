import {showTraitorPuzzle} from './traitor-puzzle.js';
import {showStallGame} from './stall-games.js';
import {showPeakPuzzle} from './peak-puzzles.js';
import {showTreasure} from './treasure.js';
import {STROLL_PLACES} from '../data/stroll.js';
import {strollPlaces,strollEncounterCount,strollEncounterLimit,strollExtraCount,buyStrollEncounter,STROLL_EXTRA_PRICE,STROLL_EXTRA_DAILY_LIMIT,takeStroll} from '../systems/stroll.js';
import {createSheet,escapeHTML} from './shared.js';
export function showStroll(api,onClose,scrollTop=0){
 const save=api.getSave(),slot=save.slot,sheet=createSheet('四处走走',()=>{sheet.remove();onClose()});
 sheet.classList.add('xg-stroll-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]'),count=strollEncounterCount(save),last=save.stroll?.last;
 body.innerHTML=`<p data-encounter-quota>今日奇遇 ${count} / ${strollEncounterLimit(save)}</p><div class="xg-feature-card"><p data-encounter-purchases>额外奇遇 · 今日已购 ${strollExtraCount(save)} / ${STROLL_EXTRA_DAILY_LIMIT} 次</p><button type="button" data-buy-encounter ${strollExtraCount(save)>=STROLL_EXTRA_DAILY_LIMIT?'disabled':''}>${strollExtraCount(save)>=STROLL_EXTRA_DAILY_LIMIT?'今日已购满':`增加一次奇遇 · ${STROLL_EXTRA_PRICE} 灵石`}</button><p>仅当天有效，零点清空未用次数。</p></div><div class="xg-stroll-places">${strollPlaces(save).map(p=>`<button type="button" data-stroll-place="${p.id}">去${p.name}逛逛</button>`).join('')}</div>${['gomoku','dice'].filter(k=>save.stallGames?.[k]&&save.stallGames[k].phase!=='done').map(k=>`<button type="button" data-stall="${k}">${k==='gomoku'?'坊市棋摊':'黑市骰局'}</button>`).join('')}${save.traitorPuzzle?'<button type="button" data-traitor-puzzle>抓叛徒 · 继续排查</button>':''}${save.peakPuzzle?`<button type="button" data-peak-puzzle>${save.peakPuzzle.kind==='sokoban'?'搬石归阵':'林间迷踪'}</button>`:''}${save.treasure?'<button type="button" data-treasure>查看藏宝图</button>':''}${last?`<article class="xg-feature-card"><h3>${escapeHTML(STROLL_PLACES.find(p=>p.id===last.placeId)?.name||'途中见闻')}</h3><p>${escapeHTML(last.text)}</p></article>`:''}`;
 const reopen=()=>showStroll(api,onClose,body.scrollTop);
 const openEncounter=open=>{const top=body.scrollTop;open(()=>showStroll(api,onClose,top))};
 body.querySelector('[data-traitor-puzzle]')?.addEventListener('click',()=>openEncounter(back=>showTraitorPuzzle(api,back)));
 body.querySelector('[data-treasure]')?.addEventListener('click',()=>openEncounter(back=>showTreasure(api,back)));
 body.querySelector('[data-peak-puzzle]')?.addEventListener('click',()=>openEncounter(back=>showPeakPuzzle(api,back)));
 body.querySelectorAll('[data-stall]').forEach(b=>b.onclick=()=>openEncounter(back=>showStallGame(api,b.dataset.stall,back)));
 let busy=false;
 const buyButton=body.querySelector('[data-buy-encounter]');
 // Refresh the quota in place, including when a background tab resumes after midnight.
 const doc=sheet.ownerDocument,view=doc.defaultView;
 let dayTimer,disposed=false;
 const stopClock=()=>{if(disposed)return;disposed=true;clearTimeout(dayTimer);doc.removeEventListener('visibilitychange',refreshQuota);view?.removeEventListener('focus',refreshQuota);observer.disconnect()};
 const refreshQuota=()=>{
  if(!sheet.isConnected||api.getSave()?.slot!==slot){stopClock();return}
  const current=api.getSave(),now=Date.now(),purchased=strollExtraCount(current,now);
  body.querySelector('[data-encounter-quota]').textContent=`今日奇遇 ${strollEncounterCount(current,now)} / ${strollEncounterLimit(current,now)}`;
  body.querySelector('[data-encounter-purchases]').textContent=`额外奇遇 · 今日已购 ${purchased} / ${STROLL_EXTRA_DAILY_LIMIT} 次`;
  buyButton.disabled=busy||purchased>=STROLL_EXTRA_DAILY_LIMIT;
  buyButton.textContent=purchased>=STROLL_EXTRA_DAILY_LIMIT?'今日已购满':`增加一次奇遇 · ${STROLL_EXTRA_PRICE} 灵石`;
  clearTimeout(dayTimer);const midnight=new Date(now);midnight.setHours(24,0,0,0);
  dayTimer=setTimeout(refreshQuota,midnight.getTime()-now+20);dayTimer.unref?.();
 };
 const observer=new view.MutationObserver(()=>{if(!sheet.isConnected)stopClock()});
 observer.observe(sheet.parentNode,{childList:true});
 doc.addEventListener('visibilitychange',refreshQuota);view.addEventListener('focus',refreshQuota);
 refreshQuota();
 buyButton.onclick=async()=>{
  if(busy||buyButton.disabled)return;busy=true;buyButton.disabled=true;
  try{
   await api.actions.mutate(s=>buyStrollEncounter(s),{slot,message:r=>r.message});
   if(sheet.isConnected&&api.getSave()?.slot===slot){reopen();document.querySelector('#xg-feature-sheet [role=status]').textContent='购买成功：今日奇遇上限 +1。'}
  }catch(error){status.textContent=error.message}finally{busy=false;if(sheet.isConnected)refreshQuota()}
 };
 body.querySelectorAll('[data-stroll-place]').forEach(button=>button.onclick=async()=>{
  if(busy||button.disabled)return;busy=true;
  const buttons=[...body.querySelectorAll('[data-stroll-place]')];buttons.forEach(b=>b.disabled=true);
  try{
   await api.actions.mutate(s=>takeStroll(s,button.dataset.strollPlace),{slot,message:r=>r.message});
   if(sheet.isConnected&&api.getSave()?.slot===slot){if(api.getSave().battle){sheet.remove();onClose()}else reopen()}
  }catch(error){status.textContent=error.message}finally{busy=false;buttons.forEach(b=>b.disabled=false);if(sheet.isConnected)refreshQuota()}
 });
 body.scrollTop=scrollTop;
}
