import {TITLES,titleName,effectiveStat} from '../data/titles.js';
import {spiritPeakCompleted} from '../data/spirit-peak.js';
import {equipTitle} from '../systems/titles.js';
import {createSheet,buttonTask} from './shared.js';
export function showTitles(api,onClose){
 const close=()=>{document.getElementById('xg-feature-sheet')?.remove();onClose?.()};
 const sheet=createSheet('称号',close),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]'),save=api.getSave();
 body.innerHTML=`<p>当前：${titleName(save.player)} · 只能佩戴一个</p><p>魅力 ${effectiveStat(save.player,'魅力')}</p>`+TITLES.map(title=>{
  const unlocked=save.titles?.unlocked?.includes(title.id),equipped=save.player.equippedTitle===title.id;
  const count=title.id==='animal-friend'?spiritPeakCompleted(save):save.titles?.companionHistory?.length||0,goal=title.id==='animal-friend'?10:3;
  return `<article class="xg-feature-card"><h3>${title.name}<small>${unlocked?'已获得':`${Math.min(count,goal)} / ${goal}`}</small></h3><p>${title.condition}</p><p>${title.description}</p><button type="button" data-title="${title.id}" ${!unlocked||save.battle?'disabled':''}>${equipped?'摘下':unlocked?'佩戴':'尚未获得'}</button></article>`;
 }).join('');
 body.querySelectorAll('[data-title]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{
  const id=button.dataset.title;
  const {result}=await api.actions.mutate(s=>equipTitle(s,s.player.equippedTitle===id?null:id),{allowYan:true,allowDebt:true,message:r=>r});
  if(!sheet.isConnected)return;
  showTitles(api,onClose);document.querySelector('#xg-feature-sheet [role=status]').textContent=result;
 },status));
}
