import {drawBlackMarket} from '../systems/black-market.js';
import {showManualReveal} from './black-market-reveal.js';
import {escapeHTML,format} from './shared.js';
export function showBlackMarket({getSave,actions,activate},onClose,dongxia=false){
 activate('map');const key=dongxia?'dongxiaMarket':'blackMarket',single=dongxia?4:2,ten=dongxia?36:18;
 const content=document.getElementById('xg-content'),save=getSave();
 content.innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回地图</button><div class="xg-map-heading"><h2>${dongxia?'无灯集':'黑市奇匣'}</h2><p>匣中真假难辨，全凭一试。</p></div><div class="xg-card"><p>灵石 ${format(save.player.spiritStones)}</p><p>最多 66 抽必得典籍 · 当前累计 ${save[key]?.pity||0} / 66</p><div class="xg-feature-row"><button type="button" data-draw="1" ${save.player.spiritStones<single?'disabled':''}>开一匣 · ${single} 灵石</button><button type="button" data-draw="10" ${save.player.spiritStones<ten?'disabled':''}>开十匣 · ${ten} 灵石</button></div><small class="xg-black-market-hint">匣中藏有高级功法。</small></div>${save[key]?.lastDraw?.results?.length?`<div class="xg-card"><h3>本次所得</h3>${save[key].lastDraw.results.map(line=>`<p>${escapeHTML(line)}</p>`).join('')}</div>`:''}<p role="status"></p></section>`;
 content.querySelector('.xg-map-back').onclick=onClose;
 let busy=false;
 content.querySelectorAll('[data-draw]').forEach(button=>button.onclick=async()=>{
  if(busy)return;busy=true;
  const status=content.querySelector('[role=status]'),count=Number(button.dataset.draw),id=crypto.randomUUID();
  content.querySelectorAll('[data-draw]').forEach(b=>b.disabled=true);
  try{await actions.mutate(s=>drawBlackMarket(s,count,id,Date.now(),dongxia),{message:`在黑市开启 ${count} 只奇匣。`});showBlackMarket({getSave,actions,activate},onClose,dongxia);const name=getSave()[key]?.lastDraw?.manuals?.[0];if(name)showManualReveal(document.getElementById('xg-content'),name)}
  catch(error){status.textContent=error.message;content.querySelectorAll('[data-draw]').forEach(b=>b.disabled=getSave().player.spiritStones<(Number(b.dataset.draw)===10?ten:single));busy=false}
 });
}
