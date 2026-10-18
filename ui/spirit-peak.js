import {SPIRIT_PEAK_BEASTS,SPIRIT_PEAK_GOAL,SPIRIT_PEAK_LIMIT,SPIRIT_PEAK_ACHIEVEMENT,spiritPeakCompleted} from '../data/spirit-peak.js';
import {feedPeakBeast,isPeakHerb,peakFeedCount} from '../systems/spirit-peak.js';
import {ITEMS} from '../data/items.js';
import {createSheet,escapeHTML} from './shared.js';
export function showSpiritPeak(api,onClose,selected=null,scene=false){
 const save=api.getSave(),slot=save.slot,sheet=createSheet('灵兽峰',()=>{sheet.remove();onClose()}),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 const beast=SPIRIT_PEAK_BEASTS.find(b=>b.id===selected),value=save.spiritPeak?.feeding?.[selected]||0;
 if(beast&&scene&&value>=SPIRIT_PEAK_GOAL){
  body.innerHTML=`<article class="xg-peak-cg"><small>灵兽相知 · ${beast.name}</small><div class="xg-peak-moon" aria-hidden="true">☾</div><h2>${beast.title}</h2>${beast.scene.map(p=>`<p>${p}</p>`).join('')}${save.achievements?.unlocked?.includes(SPIRIT_PEAK_ACHIEVEMENT)?'<p class="xg-peak-achievement">成就 · 万物有灵</p>':''}<button type="button" data-return>留在山中</button></article>`;
  body.querySelector('[data-return]').onclick=()=>showSpiritPeak(api,onClose,selected);return;
 }
 body.innerHTML=`<p>今日喂养 ${peakFeedCount(save)} / ${SPIRIT_PEAK_LIMIT} · 圆满 ${spiritPeakCompleted(save)} / ${SPIRIT_PEAK_BEASTS.length}</p>${!beast?`<p>任意药草一株，喂养值一点。</p>${SPIRIT_PEAK_BEASTS.map(b=>`<article class="xg-feature-card"><h3>${b.name}</h3><p>${b.intro}</p><button type="button" data-beast="${b.id}">${b.name} · ${save.spiritPeak?.feeding?.[b.id]||0} / ${SPIRIT_PEAK_GOAL}</button></article>`).join('')}`:`<button type="button" data-list>← 山中异兽</button><article class="xg-feature-card"><h3>${beast.name} · ${value} / ${SPIRIT_PEAK_GOAL}</h3><p>${beast.intro}</p>${value>=SPIRIT_PEAK_GOAL?'<button type="button" data-scene>重温相知</button>':peakFeedCount(save)>=SPIRIT_PEAK_LIMIT?'<p>今日已喂养二十次，明日再来。</p>':save.inventory.filter(e=>isPeakHerb(e.itemId)&&e.quantity>0).map(e=>`<button type="button" data-feed="${escapeHTML(e.uid)}">喂${ITEMS[e.itemId].name} ×1 · 持有 ${e.quantity}</button>`).join('')||'<p>储物袋里没有药草。</p>'}</article>`}`;
 body.querySelectorAll('[data-beast]').forEach(b=>b.onclick=()=>showSpiritPeak(api,onClose,b.dataset.beast));
 body.querySelector('[data-list]')?.addEventListener('click',()=>showSpiritPeak(api,onClose));
 body.querySelector('[data-scene]')?.addEventListener('click',()=>showSpiritPeak(api,onClose,selected,true));
 let busy=false;
 body.querySelectorAll('[data-feed]').forEach(button=>button.onclick=async()=>{
  if(busy)return;busy=true;const buttons=[...body.querySelectorAll('[data-feed]')];buttons.forEach(b=>b.disabled=true);
  try{
   const {result}=await api.actions.mutate(s=>feedPeakBeast(s,selected,button.dataset.feed),{slot,message:r=>r.message});
   if(sheet.isConnected&&api.getSave()?.slot===slot)showSpiritPeak(api,onClose,selected,result.completed);
  }catch(error){status.textContent=error.message}finally{busy=false;buttons.forEach(b=>b.disabled=false)}
 });
}
