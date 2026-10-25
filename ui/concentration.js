import {playConcentration} from '../systems/concentration.js';
import {createSheet,escapeHTML} from './shared.js';
export function showConcentration(api,onClose){
 const slot=api.getSave().slot,id=api.getSave().concentration?.id;if(!id)return onClose();
 let timer,busy=false;
 const sheet=createSheet('凝神试炼',()=>{clearInterval(timer);sheet.remove();onClose()});
 sheet.classList.add('xg-stroll-sheet','xg-encounter-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const clock=()=>{const p=api.getSave()?.concentration,node=body.querySelector('[data-concentration-clock]');if(node&&p?.phase==='playing')node.textContent=`${(Math.max(0,Date.now()-p.startedAt)/1000).toFixed(1)} 秒`};
 const draw=()=>{
  const p=api.getSave().concentration;if(!p||p.id!==id)return;
  if(p.phase==='ready')body.innerHTML=`<article class="xg-encounter-intro"><small>东夏国 · 凝神辨序</small><h3>心无旁骛，循序而行</h3><p>老者拂袖，三十六枚玉牌悬在案上。「不必抢快，先把眼前的每一步看清。」</p><p>开始后显示随机排列的 1—36，按顺序点完。点错立即结束，无奖励、不扣资源。</p><p>40秒内：20灵石 · 60秒内：15灵石<br>90秒内：10灵石 · 120秒内：5灵石<br>超过120秒完成：保底2灵石</p><p>点击开始才计时，无时间上限。返回或刷新可续玩，计时继续；放弃无奖励，不退本次奇遇次数。</p></article><button data-action="start">开始试炼</button><button data-action="abandon">放弃本次</button>`;
  else if(p.phase==='playing')body.innerHTML=`<div class="xg-memory-head"><span>下一个：<b>${p.next}</b></span><strong data-concentration-clock role="timer"></strong></div><div class="xg-concentration-grid">${p.numbers.map(n=>`<button type="button" data-number="${n}" ${n<p.next?'disabled class="is-done"':''}>${n}</button>`).join('')}</div><p>依次点选 1 → 36 · 已完成 ${p.next-1}/36</p><button data-action="abandon">放弃本次</button>`;
  else body.innerHTML=`<article class="xg-encounter-intro"><h3>${p.phase==='won'?'凝神有成':'暂歇片刻'}</h3><p>${escapeHTML(p.text)}</p></article><button data-action="dismiss">结束试炼</button>`;
  body.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>run(b.dataset.action));
  body.querySelectorAll('[data-number]').forEach(b=>b.onclick=()=>run('pick',Number(b.dataset.number)));
  clock();
 };
 const run=async(action,value)=>{
  if(busy||!current())return;
  if(action==='abandon'&&!confirm('放弃本次试炼？无奖励，不扣资源，也不退奇遇次数。'))return;
  const clickedAt=Date.now();busy=true;body.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{const {result}=await api.actions.mutate(s=>playConcentration(s,id,action,value,clickedAt),{slot,message:r=>r.message});if(!current())return;if(result.closed){clearInterval(timer);sheet.remove();onClose();return}status.textContent=''}catch(error){if(current())status.textContent=error.message}finally{busy=false;if(current())draw()}
 };
 draw();timer=setInterval(()=>{if(!current()){clearInterval(timer);return}if(api.getSave().concentration?.id!==id){clearInterval(timer);sheet.remove();onClose();return}clock()},100);timer.unref?.();
}
