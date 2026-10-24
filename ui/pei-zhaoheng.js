import {PEI_NAME,PEI_HOME,PEI_DESCRIPTION,PEI_CHAT} from '../data/pei-zhaoheng.js';
import {peiAction,peiBonded} from '../systems/pei-zhaoheng.js';
import {giftableEntries} from '../systems/relationships.js';
import {companionBreakupFee} from '../systems/foxes.js';
import {ITEMS} from '../data/items.js';
import {createSheet,escapeHTML} from './shared.js';
const paragraphs=text=>String(text).split('\n\n').map(p=>`<p>${escapeHTML(p)}</p>`).join('');
export function showPei(api,onClose){
 const slot=api.getSave().slot;let busy=false,timer;
 const sheet=createSheet(PEI_HOME,()=>{clearInterval(timer);sheet.remove();onClose()}),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const scene=(text,proposal=false)=>{body.innerHTML=`<article class="xg-feature-card">${paragraphs(text)}</article>${proposal?'<button data-answer="accept">与他结为道侣</button><button data-answer="later">再想一想</button><button data-answer="reject">婉拒</button>':'<button data-continue>继续</button>'}`;body.scrollTop=0;body.querySelector('[data-continue]')?.addEventListener('click',draw);body.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>run(b.dataset.answer,null,true))};
 async function run(action,value,story=false){
  if(busy||!current())return;busy=true;const pressedAt=Date.now();body.querySelectorAll('button').forEach(b=>b.disabled=true);
  if(action==='start')body.innerHTML='<article class="xg-feature-card"><p>计时中……凭心中读秒，按下结束。</p><button disabled>结束</button></article>';
  try{const {result}=await api.actions.mutate(s=>peiAction(s,action,value,pressedAt),{slot});if(current()){if(story)scene(result,action==='proposal');else{draw();status.textContent=result||''}}}
  catch(e){if(current()){draw();status.textContent=e.message}}finally{busy=false}
 }
 function draw(){
  clearInterval(timer);if(!current())return;const save=api.getSave(),s=save.peiZhaoheng;
  if(!s?.met){body.innerHTML=`<article class="xg-feature-card"><h3>${PEI_NAME}</h3><p>${PEI_DESCRIPTION}</p></article><button data-meet>叩门拜访</button>`;body.querySelector('[data-meet]').onclick=()=>run('meet',null,true);return}
  const pending=save.peiExploration,g=s.game,bond=peiBonded(save),next=[30,60,90].find(n=>s.affinity>=n&&!s.seen.includes(n));
  body.innerHTML=`<article class="xg-feature-card"><h3>${PEI_NAME}${bond?' · 道侣':''}</h3><p>${PEI_DESCRIPTION}</p><p>好感 ${s.affinity} / 100</p></article>`;
  if(pending){
   body.innerHTML+='<article class="xg-feature-card"><p>他留了一张字条：「出门一趟。刻刀别动，茶自己倒。」</p><p data-away></p><button data-collect>领取探索所得</button></article>';
   const tick=()=>{if(!current()){clearInterval(timer);return}const remaining=Math.max(0,Math.ceil((pending.endsAt-Date.now())/1000));body.querySelector('[data-away]').textContent=`${pending.tier==='qi'?'星落秘境':'云岫秘境'} · ${remaining?`还需 ${remaining} 秒`:'他已回到听隙庐'}`;body.querySelector('[data-collect]').disabled=remaining>0||busy};
   body.querySelector('[data-collect]').onclick=()=>run('collect',null,true);tick();timer=setInterval(tick,1000);timer.unref?.();return;
  }
  if(g?.phase==='running'){
   body.innerHTML+='<article class="xg-feature-card"><p>计时中……凭心中读秒，按下结束。</p><button data-stop>结束</button></article>';
   body.querySelector('[data-stop]').onclick=()=>run('stop',g.id);return;
  }
  body.innerHTML+=`<article class="xg-feature-card"><h3>掐时布阵</h3><p>${escapeHTML(PEI_CHAT[(s.seen?.length||0)%PEI_CHAT.length])}</p><p>先记住目标秒数，再按开始与结束。计时中不显示数字，误差不超过 0.10 秒即成功；赢一次可送一份礼物，机会不叠加。</p>${g?.phase==='ready'?`<p>目标：<strong>${(g.target/100).toFixed(2)} 秒</strong></p><button data-start>开始</button>`:`${g?.phase==='done'?`<p>目标 ${(g.target/100).toFixed(2)} 秒 · 实际 ${(g.elapsed/1000).toFixed(2)} 秒 · 误差 ${(Math.abs(g.elapsed-g.target*10)/1000).toFixed(3)} 秒</p><p>${g.won?'成功':'未成功'}，随时可以再玩。</p>`:''}<button data-new>请他出题</button>`}</article>`;
  if(next)body.innerHTML+='<button data-story>他似乎有话想说</button>';
  if(s.giftReady)body.innerHTML+=`<article class="xg-feature-card"><h3>赠礼 · 可送一份</h3><button data-gift="stones">灵石 ×1</button>${giftableEntries(save).map(e=>`<button data-gift="${escapeHTML(e.uid)}">${escapeHTML(ITEMS[e.itemId].name)}${e.usesLeft===0?'（破损）':''} ×1</button>`).join('')}</article>`;
  if(bond)body.innerHTML+='<article class="xg-feature-card"><h3>委托探索</h3><p>共用秘境每日次数与费用。一次只能委托一处；三分钟后回来领取，再委托另一处。期间你可以自由行动。</p><button data-dispatch="qi">星落秘境 · 1 灵石</button><button data-dispatch="foundation">云岫秘境 · 2 灵石</button></article><button data-breakup>解除道侣</button>';
  else if(s.affinity>=100&&!next)body.innerHTML+='<button data-proposal>与他谈谈往后</button>';
  body.querySelector('[data-start]')?.addEventListener('click',()=>run('start',g.id));body.querySelector('[data-new]')?.addEventListener('click',()=>run('new-game'));
  body.querySelector('[data-story]')?.addEventListener('click',()=>run('story',null,true));body.querySelector('[data-proposal]')?.addEventListener('click',()=>run('proposal',null,true));
  body.querySelectorAll('[data-gift]').forEach(b=>b.onclick=()=>run('gift',b.dataset.gift));body.querySelectorAll('[data-dispatch]').forEach(b=>b.onclick=()=>run('dispatch',b.dataset.dispatch));
  body.querySelector('[data-breakup]')?.addEventListener('click',()=>{body.innerHTML=`<p>解除道侣需 ${companionBreakupFee(save.player)??'未定'} 灵石，此后三天不能再结缘。</p><button data-confirm>确认解除</button><button data-cancel>返回</button>`;body.querySelector('[data-confirm]').onclick=()=>run('breakup',null,true);body.querySelector('[data-cancel]').onclick=draw});
 }
 draw();
}
