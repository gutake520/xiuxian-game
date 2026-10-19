import {FLIGHT_RULES,flightWeek,settleFlightWeek,startFlight,resumeFlight,tickFlight,abandonFlight} from '../systems/sect-flight.js';
import {createSheet,escapeHTML} from './shared.js';
export function showSectFlight(api,onClose){
 const slot=api.getSave().slot,sheet=createSheet('御剑考核',()=>close());sheet.classList.add('xg-stroll-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 let busy=false,closing=false,timer=null,frame=null,token=null,runId=null,targetLane=null,observer=null;
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const stop=()=>{if(timer!==null)clearInterval(timer);timer=null;if(frame!==null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(frame);frame=null};
 const dismiss=()=>{stop();observer?.disconnect();sheet.remove();onClose()};
 const mutate=async(fn)=>{
  if(busy||!current())return;busy=true;
  try{const response=await api.actions.mutate(fn,{slot,message:r=>r?.text});return response.result}
  catch(error){if(current()){stop();token=null;status.textContent=error.message;drawMenu()}}
  finally{busy=false;if(closing&&current())queueMicrotask(()=>close())}
 };
 const close=async()=>{
  if(busy){closing=true;return}closing=false;stop();
  if(token&&api.getSave().sectFlight?.run?.id===runId){const lease=token;await mutate(s=>tickFlight(s,runId,lease,null,Date.now(),true))}
  dismiss();
 };
 const choose=lane=>{if(token){targetLane=lane;step()}};
 const paint=()=>{
  if(!current()){stop();return}
  const run=api.getSave().sectFlight?.run;if(!run||run.id!==runId||run.token!==token){stop();return}
  const elapsed=run.elapsed+Math.min(200,Math.max(0,Date.now()-run.lastAt));
  body.querySelector('[data-flight-hud]').textContent=`穿环 ${run.score}/20 · 碰撞 ${run.hits}/3`;
  body.querySelector('[data-sword]').style.left=`${(run.lane+.5)/3*100}%`;
  body.querySelectorAll('[data-lane]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.lane)===run.lane)));
  body.querySelectorAll('[data-gate]').forEach(node=>{const i=Number(node.dataset.gate),gate=run.gates[i],remaining=gate.at-elapsed,travel=gate.travel??FLIGHT_RULES.lead;node.hidden=i<run.next||remaining>travel;node.style.top=`${82-remaining/travel*90}%`});
  if(typeof requestAnimationFrame==='function')frame=requestAnimationFrame(paint);
 };
 const step=async()=>{
  if(busy||!token||!current())return;const lane=targetLane;targetLane=null;const lease=token;
  const pause=Boolean(document.hidden);const result=await mutate(s=>tickFlight(s,runId,lease,lane,Date.now(),pause));if(!current())return;
  if(pause&&token){stop();token=null;drawMenu();return}
  if(result?.completed){stop();token=null;drawMenu()}else if(token&&typeof requestAnimationFrame!=='function')paint();
 };
 const fly=async()=>{
  if(busy)return;
  const result=await mutate(s=>{
   settleFlightWeek(s);const id=s.sectFlight?.run?.id||startFlight(s);return {id,token:resumeFlight(s,id)};
  });
  if(!result||!current())return;runId=result.id;token=result.token;targetLane=null;status.textContent='';
  const run=api.getSave().sectFlight.run;
  body.innerHTML=`<p data-flight-hud></p><div class="xg-flight-sky" role="img" aria-label="御剑航道：金环可穿越，山石须避让"><div class="xg-flight-track"></div>${run.gates.map((g,i)=>`<span class="xg-flight-ring" data-gate="${i}" style="left:${(g.ring+.5)/3*100}%" aria-label="剑环">○</span><span class="xg-flight-rock" data-gate="${i}" style="left:${(g.rock+.5)/3*100}%" aria-label="山石">◆</span>`).join('')}<span class="xg-flight-sword" data-sword>剑</span></div><div class="xg-flight-controls">${['左','中','右'].map((name,i)=>`<button data-lane="${i}" aria-label="飞向${name}路">${name}</button>`).join('')}</div><p>穿金环，避山石。返回可暂停。</p>`;
  body.querySelectorAll('[data-lane]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.lane)));
  timer=setInterval(step,200);paint();sheet.focus();
 };
 const drawMenu=()=>{
  if(!current())return;const state=api.getSave().sectFlight,week=flightWeek(),fresh=!state||state.week!==week;
  const passed=!fresh&&state.best>=FLIGHT_RULES.medium,grace=!state||state.graceWeek===week;
  body.innerHTML=`<p>${passed?'本周考核已达标':grace?'本周免考核处罚':'本周尚未达标'}${!fresh&&state.rewarded?' · 上等奖励已领':''}</p>${!fresh&&state.lastResult?`<article class="xg-feature-card"><p>${escapeHTML(state.lastResult.text)}</p></article>`:''}<p>完成全程，穿环10个为中等，16个为上等；碰撞三次结束。</p><p>每周首次上等奖励1宗门积分。</p><div class="xg-flight-menu"><button data-fly>${state?.run?'继续考核':'开始考核'}</button>${state?.run?'<button data-restart>结束本次，重新准备</button>':''}</div><details><summary>周考规则</summary><p>每周一更新。每周至少一次中等；入宗当周免罚，久未上线只结算最近一周。未达标扣10灵石，不足部分每1灵石折5修为，最多扣至0，不追欠款。</p></details>`;
  body.querySelector('[data-fly]').onclick=fly;
  body.querySelector('[data-restart]')?.addEventListener('click',async()=>{const id=api.getSave().sectFlight?.run?.id;await mutate(s=>abandonFlight(s,id));if(current())drawMenu()});
 };
 sheet.tabIndex=-1;sheet.addEventListener('keydown',e=>{if(!token||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const lane=targetLane??api.getSave().sectFlight?.run?.lane??1;choose(Math.max(0,Math.min(2,lane+(e.key==='ArrowLeft'?-1:1))))});
 if(typeof MutationObserver==='function'){observer=new MutationObserver(()=>{if(!current()){stop();observer.disconnect()}});observer.observe(sheet.parentNode,{childList:true})}
 drawMenu();
}
