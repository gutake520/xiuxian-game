import {ZHANG_NAME,ZHANG_CAVE,ZHANG_DESCRIPTION,ZHANG_GAME_NAMES,ZHANG_REQUESTS,ZHANG_SCENES} from '../data/zhang-huaijin.js';
import {zhangState,zhangPlayStatus,startZhangPlay,finishZhangPlay,giveZhangGift,seenZhangScene,answerZhang,leaveZhang} from '../systems/zhang-huaijin.js';
import {giftableEntries} from '../systems/relationships.js';
import {companionBreakupFee} from '../systems/foxes.js';
import {ITEMS} from '../data/items.js';
import {showStallGame} from './stall-games.js';
import {showPeakPuzzle} from './peak-puzzles.js';
import {createSheet,escapeHTML} from './shared.js';
const paragraphs=text=>String(text).split('\n\n').map(p=>`<p>${escapeHTML(p)}</p>`).join('');
export function zhangGameAPI(api,slot,id){
 return {getSave:()=>{const save=api.getSave(),game=save?.zhangHuaijin?.game;return {...(game?.world||{}),slot:save?.slot}},actions:{mutate:(change)=>api.actions.mutate(save=>{
  const state=zhangState(save),game=state?.game;if(!state?.unlocked||!game||game.id!==id||game.done)throw new Error('这次陪玩已经结束，请返回山洞。');
  const result=change(game.world);
  if(result?.completed){
   const inner=game.world.stallGames?.[game.kind];
   const outcome=result.outcome||inner?.outcome||'surrender';
   const ended=finishZhangPlay(save,id,outcome);if(inner)inner.text=ended.text;return ended;
  }
  return result;
 },{slot,message:r=>r?.completed?`与张怀瑾的今日陪伴已完成。`:null})}};
}
export function showZhang(api,onClose){
 const slot=api.getSave().slot;
 const sheet=createSheet(ZHANG_CAVE,()=>{sheet.remove();onClose()});sheet.classList.add('xg-stroll-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');let busy=false;
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const run=async(change,after)=>{
  if(busy||!current())return;busy=true;body.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{const {result}=await api.actions.mutate(change,{slot});if(current()){if(after)after(result);else{draw();status.textContent=typeof result==='string'?result:''}}}
  catch(e){if(current()){draw();status.textContent=e.message}}finally{busy=false}
 };
 const scene=text=>{body.innerHTML=`<article class="xg-feature-card">${paragraphs(text)}</article><div class="xg-feature-row"><button data-continue>继续</button></div>`;body.querySelector('[data-continue]').onclick=()=>{draw();body.scrollTop=0};status.textContent='';body.scrollTop=0};
 const play=()=>{
  const game=zhangState(api.getSave())?.game;if(!game||game.done)return draw();
  const adapter=zhangGameAPI(api,slot,game.id),back=()=>showZhang(api,onClose);
  if(['dice','gomoku'].includes(game.kind))showStallGame(adapter,game.kind,back);else showPeakPuzzle(adapter,back);
 };
 const draw=()=>{
  const save=api.getSave(),s=zhangState(save);if(!s?.unlocked){body.textContent='洞中无人。';return}
  if(s.rejected){body.textContent='洞门闭着，她今日不愿见客。';return}
  const progress=zhangPlayStatus(save),game=s.game,active=game&&!game.done;
  const pending=[30,60,90].find(n=>s.affinity>=n&&!s.seen?.includes(n));
  const ready=Math.max(0,(s.rescueReadyAt||0)-Date.now());
  body.innerHTML=`<article class="xg-feature-card"><h3>${ZHANG_NAME}${s.bonded?' · 道侣':''}</h3><p>${ZHANG_DESCRIPTION}</p><p>好感 ${s.affinity||0} / 100</p>${s.bonded?`<p>牵魂：${ready?`调息中 · 约 ${Math.ceil(ready/60000)} 分钟`:'可护你一次'}<br>致命伤时恢复 15% 生命，调息四小时。</p>`:''}</article>${progress.missed?'<p>「哟，大忙人。今日怎么想起我来了？」</p>':''}<article class="xg-feature-card"><h3>陪她玩</h3><p>${s.giftsUnlocked?'她给你留了座。':`连续陪伴 ${progress.streak} / 3 天`}</p>${active?`<p>${ZHANG_REQUESTS[game.kind]}</p>`:''}<div class="xg-zhang-actions"><button data-play ${progress.today&&!active?'disabled':''}>${active?'继续 · '+ZHANG_GAME_NAMES[game.kind]:progress.today?'今日已陪伴':'听听她今日想玩什么'}</button></div>${game?.done?paragraphs(game.text):''}</article>${pending?`<div class="xg-feature-row"><button data-story>她似乎有话要说</button></div>`:''}${s.giftsUnlocked?`<article class="xg-feature-card"><h3>赠礼</h3><div class="xg-zhang-actions"><button data-gift="stones" ${save.player.spiritStones<1?'disabled':''}>灵石 ×1</button>${giftableEntries(save).map(e=>`<button data-gift="${escapeHTML(e.uid)}">${escapeHTML(ITEMS[e.itemId].name)} ×1 · 持有 ${e.quantity||1}</button>`).join('')}</div></article>`:''}${s.bonded?'<div class="xg-feature-row"><button data-breakup>解除道侣</button></div>':s.affinity>=100&&s.giftsUnlocked?'<div class="xg-feature-row"><button data-proposal>结为道侣</button></div>':''}`;
  body.querySelector('[data-play]').onclick=()=>active?play():run(s=>startZhangPlay(s),()=>draw());
  body.querySelector('[data-story]')?.addEventListener('click',()=>run(s=>seenZhangScene(s,pending),scene));
  body.querySelectorAll('[data-gift]').forEach(b=>b.onclick=()=>run(s=>giveZhangGift(s,b.dataset.gift)));
  body.querySelector('[data-proposal]')?.addEventListener('click',()=>{
   body.innerHTML=`<article class="xg-feature-card">${paragraphs(ZHANG_SCENES.proposal)}</article><div class="xg-zhang-actions"><button data-answer="accept">答应</button><button data-answer="later">再想想</button><button data-answer="reject">婉拒</button></div>`;
   body.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>run(s=>answerZhang(s,b.dataset.answer),scene));
  });
  body.querySelector('[data-breakup]')?.addEventListener('click',()=>{
   body.innerHTML=`<p>解除道侣需 ${companionBreakupFee(save.player)??'未定'} 灵石，此后三天不能再结缘。</p><div class="xg-zhang-actions"><button data-confirm>确认解除</button><button data-cancel>返回</button></div>`;
   body.querySelector('[data-confirm]').onclick=()=>run(s=>leaveZhang(s),scene);body.querySelector('[data-cancel]').onclick=draw;
  });
 };
 draw();
}
