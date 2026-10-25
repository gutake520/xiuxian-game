import {MEMORY_SIGILS} from '../data/talisman-memory.js';
import {playMemory} from '../systems/talisman-memory.js';
import {createSheet,escapeHTML} from './shared.js';
export function showMemory(api,onClose){
 const slot=api.getSave().slot,puzzle=api.getSave().talismanMemory;if(!puzzle){onClose();return}
 const sheet=createSheet('辨认灵符',()=>{stop();sheet.remove();onClose()});sheet.classList.add('xg-stroll-sheet','xg-encounter-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');let busy=false,timer,disposed=false,retryAt=0,signature='';
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const stop=()=>{if(disposed)return;disposed=true;clearInterval(timer);observer.disconnect()};
 const observer=new sheet.ownerDocument.defaultView.MutationObserver(()=>{if(!current())stop()});observer.observe(sheet.parentNode,{childList:true});
 const draw=()=>{
  const p=api.getSave().talismanMemory;if(!p||p.id!==puzzle.id)return;
  signature=JSON.stringify(p);
  if(['won','lost'].includes(p.phase))body.innerHTML=`<article class="xg-encounter-intro"><small>九宗山门 · ${p.name}</small><h3>${p.phase==='won'?'符纹相合':'符光散尽'}</h3><p>${escapeHTML(p.text)}</p></article><button data-memory-action="dismiss">返回山门</button>`;
  else if(p.phase==='ready')body.innerHTML=`<article class="xg-encounter-intro"><small>九宗山门 · 符师试艺</small><h3>记住符纹，寻其同契</h3><p>每次翻开两张灵符，找齐所有相同符纹。配对成功保持翻开，不同的符纹稍后收起。</p><span class="xg-encounter-chip">${p.name} · ${p.pairs} 对</span><span class="xg-encounter-chip">限时 ${p.seconds} 秒</span><p>成功获当前境界的免伤符、攻击符各一张。前五次成功为简单，随后五次为中等，之后固定困难。</p><p>点击开始才计时；离开、刷新不会暂停或重置。</p></article><button class="xg-encounter-primary" data-memory-action="start">开始辨符 · ${p.seconds} 秒</button><button data-memory-action="abandon">放弃本次</button>`;
  else body.innerHTML=`<div class="xg-memory-head"><span>${p.name} · <b>${p.matched.length/2}/${p.pairs}</b> 对</span><strong data-memory-clock role="timer"></strong></div><div class="xg-memory-track"><span data-memory-progress></span></div><div class="xg-memory-grid">${p.cards.map((value,i)=>{
   const matched=p.matched.includes(i),visible=matched||p.open.includes(i),sigil=MEMORY_SIGILS[value];
   return `<button type="button" class="xg-memory-card ${visible?'is-open':''} ${matched?'is-matched':''}" data-memory-card="${i}" aria-label="${visible?sigil.name+'符'+(matched?'，已配对':''):'未翻开的灵符 '+(i+1)}" ${matched||p.open.includes(i)||p.hideAt?'disabled':''}${visible?` style="--sigil:${sigil.color}"`:''}>${visible?`<b>${sigil.glyph}</b><small>${sigil.name}${matched?' · ✓':''}</small>`:'<b>符</b><small>点按翻开</small>'}</button>`;
  }).join('')}</div><p class="xg-memory-note">相同符纹配成一对 · 返回后计时继续</p><button data-memory-action="abandon">放弃本次</button>`;
  body.querySelectorAll('[data-memory-card]').forEach(b=>b.onclick=()=>run('flip',Number(b.dataset.memoryCard)));
  body.querySelectorAll('[data-memory-action]').forEach(b=>b.onclick=()=>run(b.dataset.memoryAction));
  updateClock();
 };
 const updateClock=()=>{
  const p=api.getSave().talismanMemory;if(p?.phase!=='playing')return;
  const left=Math.max(0,p.endsAt-Date.now()),clock=body.querySelector('[data-memory-clock]'),bar=body.querySelector('[data-memory-progress]');
  if(clock){clock.textContent=`${(left/1000).toFixed(1)} 秒`;clock.classList.toggle('is-urgent',left<=10000)}
  if(bar)bar.style.width=`${left/(p.seconds*10)}%`;
  if(left===0)body.querySelectorAll('[data-memory-card]').forEach(b=>b.disabled=true);
 };
 const run=async(action,index)=>{
  if(busy||!current())return;
  if(action==='abandon'&&!confirm('放弃本次辨符？不获奖励、不退奇遇次数，成功进度保留。'))return;
  busy=true;body.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   const {result}=await api.actions.mutate(s=>playMemory(s,puzzle.id,action,index),{slot,message:r=>r.message});
   if(!current())return;
   if(result.closed){stop();sheet.remove();onClose();return}
   status.textContent='';retryAt=0;
  }catch(error){retryAt=Date.now()+1500;if(current())status.textContent=error.message}finally{busy=false;if(current())draw()}
 };
 draw();
 timer=setInterval(()=>{
  if(!current()){stop();return}
  const p=api.getSave().talismanMemory;if(!p||p.id!==puzzle.id){stop();sheet.remove();onClose();return}
  if(!busy&&JSON.stringify(p)!==signature)draw();
  updateClock();const now=Date.now();
  if(p.phase==='playing'&&!busy&&now>=retryAt&&(now>=p.endsAt||p.hideAt&&now>=p.hideAt))run('tick');
 },100);timer.unref?.();
}
