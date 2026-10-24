import {springAction} from '../systems/spirit-spring.js';
import {createSheet} from './shared.js';
export function showSpiritSpring(api,onClose){
 const save=api.getSave(),slot=save.slot,id=save.spiritSpring?.id;if(!id){onClose();return}
 let timer,busy=false;
 const sheet=createSheet('灵泉听息',()=>{clearTimeout(timer);sheet.remove();onClose()}),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot&&api.getSave()?.spiritSpring?.id===id;
 async function run(action,value){if(busy||!current())return;busy=true;try{await api.actions.mutate(s=>springAction(s,id,action,value),{slot,message:r=>r?.message||''});if(!sheet.isConnected||api.getSave()?.slot!==slot)return;if(!api.getSave().spiritSpring){sheet.remove();onClose();return}draw()}catch(e){status.textContent=e.message}finally{busy=false}}
 function draw(){
  clearTimeout(timer);if(!current())return;const p=api.getSave().spiritSpring;
  body.innerHTML='<p>山隙灵泉忽明忽暗。屏息凝神，试着听清这一缕灵息的长短。</p>';
  if(p.phase==='ready')body.innerHTML+='<p>按下开始后，灵息将在 1～5 秒内自行结束。期间不会显示时间。结束后输入秒数，误差不超过 0.10 秒即可获得典籍。</p><button data-start>开始</button>';
  if(p.phase==='running'){body.innerHTML+='<p role="status">静心听息……</p>';timer=setTimeout(()=>{if(current())run('finish')},Math.max(0,p.endsAt-Date.now()));}
  if(p.phase==='guess')body.innerHTML+='<p>结束。刚才经过了多少秒？</p><input data-guess type="number" inputmode="decimal" min="1" max="5" step="0.01" placeholder="例如 1.99" aria-label="猜测秒数"><button data-submit>提交</button>';
  if(p.phase==='won')body.innerHTML+='<p>泉光凝成一卷《你是我的蓝buff》。中级数独学会后，需要装备，占一个战斗功法栏；自身每次攻击造成伤害恢复 0.5 法力。</p><button data-claim>领取典籍</button>';
  if(p.phase==='lost')body.innerHTML+='<p>灵息错落，泉光散去。下次有缘再试。</p>';
  body.innerHTML+='<button data-abandon>离开本次奇遇</button>';
  body.querySelector('[data-start]')?.addEventListener('click',()=>run('start'));
  body.querySelector('[data-submit]')?.addEventListener('click',()=>run('guess',body.querySelector('[data-guess]').value));
  body.querySelector('[data-claim]')?.addEventListener('click',()=>run('claim'));
  body.querySelector('[data-abandon]').onclick=()=>run('abandon');
 }
 draw();
}
