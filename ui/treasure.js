import {createSheet,escapeHTML} from './shared.js';
import {treasureCanDig,startTreasureGame,activeTreasureMole,hitTreasureMole,finishTreasureGame} from '../systems/treasure.js';
export function showTreasure(api,onClose){
 const save=api.getSave(),slot=save.slot,map=save.treasure;
 let timer=null,observer=null;
 const stop=()=>{if(timer!==null)clearInterval(timer);observer?.disconnect()};
 const sheet=createSheet('藏宝图',()=>{stop();sheet.remove();onClose()});sheet.classList.add('xg-stroll-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 let busy=false;
 const run=async(change,after,message)=>{
  if(busy)return;busy=true;
  try{const {result}=await api.actions.mutate(change,{slot,message});if(current())after(result)}
  catch(error){if(current()){status.textContent=error.message;const retry=body.querySelector('[data-finish]');if(retry)retry.hidden=false}}
  finally{busy=false}
 };
 const resultView=result=>{
  stop();body.innerHTML=`<article class="xg-feature-card"><h3>${result.won?'身手不错':'地鼠跑得真快'}</h3><p>击中 ${result.score} / ${result.target}</p><p>${escapeHTML(result.text)}</p></article>`;
 };
 if(!map){if(save.lastTreasure)resultView(save.lastTreasure);else body.innerHTML='<p>尚未拾得藏宝图。</p>';return}
 const id=map.id;
 if(!map.game){
  body.innerHTML=`<p>沿着图上的标记，依次清理山路。</p><ol class="xg-treasure-route">${map.route.map((p,i)=>`<li${i===map.step?' aria-current="step"':''}>${escapeHTML(p.name)} · ${i<map.step?'已探明':i===map.step?'下一处':'待寻'}</li>`).join('')}</ol>${map.step>=map.route.length?`<button type="button" data-dig ${treasureCanDig(save)?'':'disabled'}>摸宝藏</button>`:''}`;
  const button=body.querySelector('[data-dig]');if(button)button.onclick=()=>run(s=>startTreasureGame(s,id),()=>{stop();showTreasure(api,onClose)});
  return;
 }
 body.innerHTML='<div class="xg-mole-score"><span data-score></span><span data-time></span></div><p>点中探头的地鼠。</p><div class="xg-mole-grid">'+Array.from({length:9},(_,i)=>`<button type="button" data-hole="${i}" aria-label="地洞 ${i+1}"><span aria-hidden="true">·</span></button>`).join('')+'</div><button type="button" data-finish hidden>摸一摸洞底</button>';
 const holes=[...body.querySelectorAll('[data-hole]')];
 const finish=()=>run(s=>finishTreasureGame(s,id),resultView,r=>r.text);
 body.querySelector('[data-finish]').onclick=finish;
 const draw=()=>{
  if(!current()){stop();return}
  const activeMap=api.getSave().treasure;
  if(!activeMap||activeMap.id!==id){stop();if(api.getSave().lastTreasure?.id===id)resultView(api.getSave().lastTreasure);return}
  const game=activeMap.game,now=Date.now(),mole=activeTreasureMole(game,now);
  body.querySelector('[data-score]').textContent=`击中 ${game.hits.length} / ${game.target}`;
  body.querySelector('[data-time]').textContent=`剩余 ${Math.max(0,Math.ceil((game.endsAt-now)/1000))} 秒`;
  holes.forEach((button,i)=>{const up=mole?.hole===i;button.classList.toggle('is-up',up);button.disabled=!up;button.firstElementChild.textContent=up?'🐹':'·';button.setAttribute('aria-label',up?'敲地鼠':`地洞 ${i+1}`)});
  if(now>=game.endsAt&&!busy){stop();finish()}
 };
 holes.forEach((button,hole)=>button.onclick=()=>{
  const active=activeTreasureMole(api.getSave().treasure?.game);
  if(!active||active.hole!==hole)return;
  run(s=>hitTreasureMole(s,id,active.frame,hole),()=>draw());
 });
 observer=new MutationObserver(()=>{if(!current())stop()});observer.observe(sheet.parentNode,{childList:true});
 timer=setInterval(draw,80);draw();
}
