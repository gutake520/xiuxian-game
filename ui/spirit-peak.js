import {SPIRIT_PEAK_BEASTS,SPIRIT_PEAK_GOAL,SPIRIT_PEAK_LIMIT,SPIRIT_PEAK_ACHIEVEMENT,spiritPeakCompleted} from '../data/spirit-peak.js';
import {SPIRIT_DENS,SPIRIT_PLAY_MP_RATE} from '../data/spirit-dens.js';
import {feedPeakBeast,isPeakHerb,peakFeedCount,peakDenUnlocked,peakBeastName,peakRecoveryUsed,namePeakBeast,playWithPeakBeast} from '../systems/spirit-peak.js';
import {ITEMS} from '../data/items.js';
import {createSheet,escapeHTML} from './shared.js';
export function showSpiritPeak(api,onClose,selected=null,scene=false){
 const save=api.getSave(),slot=save.slot,sheet=createSheet('灵兽峰',()=>{sheet.remove();onClose()}),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 const beast=SPIRIT_PEAK_BEASTS.find(b=>b.id===selected),value=save.spiritPeak?.feeding?.[selected]||0,den=SPIRIT_DENS[selected];
 const name=id=>escapeHTML(peakBeastName(save,id));
 const progress=id=>(save.spiritPeak?.feeding?.[id]||0)>=SPIRIT_PEAK_GOAL?'圆满':`${save.spiritPeak?.feeding?.[id]||0} / ${SPIRIT_PEAK_GOAL}`;
 const denButton=id=>peakDenUnlocked(save,id)?`<button type="button" data-den="${id}">${SPIRIT_DENS[id].name}</button>`:'';
 // Change handlers bind to this save slot and never replace a page the player has left.
 let busy=false;
 const bindTask=(button,change,after)=>{button.onclick=async()=>{
  if(busy)return;busy=true;const controls=[...sheet.querySelectorAll('button,input')],disabled=controls.map(c=>c.disabled);controls.forEach(c=>c.disabled=true);
  try{const {result}=await api.actions.mutate(change,{slot,message:r=>typeof r==='string'?r:r.message});if(sheet.isConnected&&api.getSave()?.slot===slot)after(result)}
  catch(error){status.textContent=error.message}finally{busy=false;controls.forEach((c,i)=>c.disabled=disabled[i])}
 }};
 const cg=(title,paragraphs,back,extra='')=>{
  body.innerHTML=`<article class="xg-peak-cg"><small>灵兽相知 · ${name(selected)}</small><div class="xg-peak-moon" aria-hidden="true">☾</div><h2>${escapeHTML(title)}</h2>${paragraphs.map(p=>`<p>${escapeHTML(p)}</p>`).join('')}${extra}<button type="button" data-return>留在山中</button></article>`;
  body.querySelector('[data-return]').onclick=back;
 };
 if(beast&&scene===true&&value>=SPIRIT_PEAK_GOAL){
  cg(beast.title,beast.scene,()=>showSpiritPeak(api,onClose,selected),save.achievements?.unlocked?.includes(SPIRIT_PEAK_ACHIEVEMENT)?'<p class="xg-peak-achievement">成就 · 万物有灵</p>':'');return;
 }
 if(beast&&peakDenUnlocked(save,selected)&&scene==='invitation'){
  cg(den.name,den.intro,()=>showSpiritPeak(api,onClose,selected,'den'));return;
 }
 if(beast&&peakDenUnlocked(save,selected)&&scene==='play'){
  const last=save.spiritPeak.lastPlay?.[selected];
  if(last&&den.scenes[last.index]){const [title,...paragraphs]=den.scenes[last.index];cg(title,paragraphs.map(p=>p.replaceAll(beast.name,peakBeastName(save,selected))),()=>showSpiritPeak(api,onClose,selected,'den'),last.restored>0?`<p>${escapeHTML(den.recovery.replaceAll(beast.name,peakBeastName(save,selected)))}</p><p>法力恢复 ${last.restored}。</p>`:'');return}
 }
 if(beast&&peakDenUnlocked(save,selected)&&scene==='den'){
  body.innerHTML=`<button type="button" data-list>← 山中异兽</button><article class="xg-feature-card"><h3>${den.name}</h3><p>${name(selected)}${peakBeastName(save,selected)!==beast.name?` · ${beast.name}`:''}</p><div class="xg-peak-actions"><button type="button" data-play>玩耍${peakRecoveryUsed(save,selected)?' · 今日已回灵':` · 回灵 ${SPIRIT_PLAY_MP_RATE*100}%`}</button><button type="button" data-invitation>重温初访</button></div><label>名字<input data-name maxlength="24" value="${name(selected)}" autocomplete="off"></label><button type="button" data-name-save>取名</button></article>`;
  body.querySelector('[data-list]').onclick=()=>showSpiritPeak(api,onClose);
  body.querySelector('[data-invitation]').onclick=()=>showSpiritPeak(api,onClose,selected,'invitation');
  bindTask(body.querySelector('[data-play]'),s=>playWithPeakBeast(s,selected),()=>showSpiritPeak(api,onClose,selected,'play'));
  bindTask(body.querySelector('[data-name-save]'),s=>namePeakBeast(s,selected,body.querySelector('[data-name]').value),()=>{
   showSpiritPeak(api,onClose,selected,'den');document.querySelector('#xg-feature-sheet [role=status]').textContent=den.named.replaceAll(beast.name,peakBeastName(api.getSave(),selected));
  });return;
 }
 const feeds=peakFeedCount(save)>=SPIRIT_PEAK_LIMIT?'<p>今日已喂养二十次，明日再来。</p>':save.inventory.filter(e=>isPeakHerb(e.itemId)&&e.quantity>0).map(e=>`<button type="button" data-feed="${escapeHTML(e.uid)}">喂${ITEMS[e.itemId].name} ×1 · 持有 ${e.quantity}</button>`).join('')||'<p>储物袋里没有药草。</p>';
 body.innerHTML=`<p>今日喂养 ${peakFeedCount(save)} / ${SPIRIT_PEAK_LIMIT} · 圆满 ${spiritPeakCompleted(save)} / ${SPIRIT_PEAK_BEASTS.length}</p>${!beast?`<p>任意药草一株，喂养值一点。</p>${SPIRIT_PEAK_BEASTS.map(b=>`<article class="xg-feature-card"><h3>${name(b.id)}</h3><p>${b.intro}</p><div class="xg-peak-actions"><button type="button" data-beast="${b.id}">${name(b.id)} · ${progress(b.id)}</button>${denButton(b.id)}</div></article>`).join('')}`:`<button type="button" data-list>← 山中异兽</button><article class="xg-feature-card"><h3>${name(selected)} · ${progress(selected)}</h3><p>${beast.intro}</p>${feeds}<div class="xg-peak-actions">${denButton(selected)}${value>=SPIRIT_PEAK_GOAL?'<button type="button" data-scene>重温相知</button>':''}</div></article>`}`;
 body.querySelectorAll('[data-beast]').forEach(b=>b.onclick=()=>showSpiritPeak(api,onClose,b.dataset.beast));
 body.querySelectorAll('[data-den]').forEach(b=>b.onclick=()=>showSpiritPeak(api,onClose,b.dataset.den,'den'));
 body.querySelector('[data-list]')?.addEventListener('click',()=>showSpiritPeak(api,onClose));
 body.querySelector('[data-scene]')?.addEventListener('click',()=>showSpiritPeak(api,onClose,selected,true));
 body.querySelectorAll('[data-feed]').forEach(button=>bindTask(button,s=>feedPeakBeast(s,selected,button.dataset.feed),result=>showSpiritPeak(api,onClose,selected,result.denUnlocked?'invitation':result.completed)));
}
