import {showXigong} from './dongxia-story.js';
import {showConcentration} from './concentration.js';
import {showStallSitting} from './stall-sitting.js';
import {showRiver} from './river-crossing.js';
import {showMemory} from './talisman-memory.js';
import {showOldFriend} from './old-friend.js';
import {oldFriendState,oldFriendGoal} from '../systems/old-friend.js';
import {OLD_FRIEND_CHAPTERS} from '../data/old-friend.js';
import {showSpiritSpring} from './spirit-spring.js';
import {showTraitorPuzzle} from './traitor-puzzle.js';
import {showStallGame} from './stall-games.js';
import {showPeakPuzzle} from './peak-puzzles.js';
import {showTreasure} from './treasure.js';
import {STROLL_PLACES} from '../data/stroll.js';
import {strollPlaces,strollEncounterCount,strollEncounterLimit,strollExtraCount,buyStrollEncounter,strollExtraPrice,strollExtraDailyLimit,takeStroll} from '../systems/stroll.js';
import {createSheet,escapeHTML} from './shared.js';
export function showStroll(api,onClose,scrollTop=0,placeId=null){
 const save=api.getSave(),slot=save.slot,sheet=createSheet('四处走走',()=>{sheet.remove();onClose()});
 sheet.classList.add('xg-stroll-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]'),count=strollEncounterCount(save),last=save.stroll?.last;
 body.innerHTML=`${oldFriendState(save)?`<article class="xg-feature-card"><h3>故人之子</h3><p>${escapeHTML(oldFriendGoal(save))}</p><button type="button" data-old-friend>查看手札</button></article>`:''}<p data-encounter-quota>今日奇遇 ${count} / ${strollEncounterLimit(save)}</p><div class="xg-feature-card"><p data-encounter-purchases>额外奇遇 · 今日已购 ${strollExtraCount(save)} / ${strollExtraDailyLimit(api.getSave())} 次</p><button type="button" data-buy-encounter ${strollExtraCount(save)>=strollExtraDailyLimit(api.getSave())?'disabled':''}>${strollExtraCount(save)>=strollExtraDailyLimit(api.getSave())?'今日已购满':`增加一次奇遇 · ${strollExtraPrice(api.getSave())} 灵石`}</button><p>仅当天有效，零点清空未用次数。</p></div><div class="xg-stroll-places">${strollPlaces(save).filter(p=>placeId?p.id===placeId:!p.dongxia).map(p=>`<button type="button" data-stroll-place="${p.id}">去${p.name}逛逛</button>`).join('')}</div>${['gomoku','dice'].filter(k=>save.stallGames?.[k]&&save.stallGames[k].phase!=='done').map(k=>`<button type="button" data-stall="${k}">${k==='gomoku'?'坊市棋摊':'黑市骰局'}</button>`).join('')}${save.concentration?'<button type="button" data-concentration>凝神试炼 · 继续</button>':''}${save.stallSitting?'<button type="button" data-stall-sitting>替人看摊 · 继续</button>':''}${save.riverCrossing?'<button type="button" data-river>雾中渡舟 · 继续</button>':''}${save.talismanMemory?'<button type="button" data-memory>辨认灵符 · 继续</button>':''}${save.spiritSpring?'<button type="button" data-spirit-spring>灵泉听息</button>':''}${save.traitorPuzzle?'<button type="button" data-traitor-puzzle>抓叛徒 · 继续排查</button>':''}${save.peakPuzzle?`<button type="button" data-peak-puzzle>${save.peakPuzzle.kind==='sokoban'?'搬石归阵':'林间迷踪'}</button>`:''}${save.treasure?'<button type="button" data-treasure>查看藏宝图</button>':''}${last?`<article class="xg-feature-card"><h3>${escapeHTML(STROLL_PLACES.find(p=>p.id===last.placeId)?.name||'途中见闻')}</h3><p>${escapeHTML(last.text)}</p></article>`:''}`;
 if(save.dongxiaStory){const b=document.createElement('button');b.textContent='照川旧笺 · 西宫家';body.prepend(b);b.onclick=()=>showXigong(api,()=>showStroll(api,onClose,0,placeId))}
 const reopen=()=>showStroll(api,onClose,body.scrollTop,placeId);
 const openEncounter=open=>{const top=body.scrollTop;open(()=>showStroll(api,onClose,top,placeId))};
 body.querySelector('[data-old-friend]')?.addEventListener('click',()=>{const q=oldFriendState(api.getSave()),place=OLD_FRIEND_CHAPTERS[q?.step]?.place;openEncounter(back=>showOldFriend(api,back,['monsters','foundation'].includes(place)?place:'journal'))});
 body.querySelector('[data-concentration]')?.addEventListener('click',()=>openEncounter(back=>showConcentration(api,back)));
 body.querySelector('[data-stall-sitting]')?.addEventListener('click',()=>openEncounter(back=>showStallSitting(api,back)));
 body.querySelector('[data-river]')?.addEventListener('click',()=>openEncounter(back=>showRiver(api,back)));
 body.querySelector('[data-memory]')?.addEventListener('click',()=>openEncounter(back=>showMemory(api,back)));
 body.querySelector('[data-spirit-spring]')?.addEventListener('click',()=>openEncounter(back=>showSpiritSpring(api,back)));
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
  body.querySelector('[data-encounter-purchases]').textContent=`额外奇遇 · 今日已购 ${purchased} / ${strollExtraDailyLimit(api.getSave())} 次`;
  buyButton.disabled=busy||purchased>=strollExtraDailyLimit(api.getSave());
  buyButton.textContent=purchased>=strollExtraDailyLimit(api.getSave())?'今日已购满':`增加一次奇遇 · ${strollExtraPrice(api.getSave())} 灵石`;
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
