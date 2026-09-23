import {equipmentStats} from '../systems/inventory.js';
import {escapeHTML} from './shared.js';
import {TECHNIQUES} from '../data/techniques.js';

export function showBattle({getSave,actions,activate,onExit},endResult=null){
 const save=getSave(),battle=save?.battle;activate('map');
 const content=document.getElementById('xg-content');
 if(!battle){
  const result=endResult||save?.lastBattle;
  content.innerHTML=`<section class="xg-map-sheet xg-battle-sheet"><h2>战斗结束</h2><p>${result?.outcome==='victory'?'击退小妖':result?.outcome==='defeat'?'你败下阵来':'已脱离战斗'}</p><div class="xg-card">${(result?.log||[]).map(line=>`<p>${escapeHTML(line)}</p>`).join('')}</div><button type="button" data-return>返回丰原镇</button></section>`;
  content.querySelector('[data-return]').onclick=onExit;return;
 }
 const stats=equipmentStats(save);
 const hasArray=save.player.sect==='玄机门'&&!battle.freeArrayUsed||save.inventory.some(item=>item.itemId==='binding-array');
 const talismans=['attack-talisman','guard-talisman'].filter(id=>save.inventory.some(item=>item.itemId===id));
 content.innerHTML=`<section class="xg-map-sheet xg-battle-sheet"><h2>${escapeHTML(battle.name)}</h2><p>第 ${battle.round+1} 轮 · ${stats.speed>=battle.speed?'你先手':'小妖先手'}</p>
  <div class="xg-battle-bars"><div>你的生命 <strong>${save.player.hp.toFixed(2)} / ${stats.maxHp.toFixed(2)}</strong></div><div>小妖生命 <strong>${battle.hp.toFixed(2)} / ${battle.maxHp.toFixed(2)}</strong></div></div>
  <div class="xg-card xg-battle-log" aria-live="polite">${battle.log.map(line=>`<p>${escapeHTML(line)}</p>`).join('')}</div>
  <div class="xg-battle-action-panel"><h3>本轮行动</h3>${(save.techniques?.combat||[]).filter(id=>TECHNIQUES[id]?.passive).map(id=>`<small>${TECHNIQUES[id].name} · 被动生效</small>`).join('')}<div class="xg-battle-main-actions"><button type="button" data-fight="attack">普攻</button><button type="button" data-fight="skip">跳过</button></div>
  ${(save.techniques?.combat||[]).length?`<div class="xg-battle-talisman"><strong>战斗功法</strong><div class="xg-battle-talisman-actions">${save.techniques.combat.filter(id=>!TECHNIQUES[id]?.passive).map(id=>{const skill=TECHNIQUES[id],wait=Math.max(0,(battle.skillReady?.[id]||0)-battle.round-1);return skill?`<button type="button" data-fight="${id}" ${wait||save.player.mp<(skill.mpCost??1)?'disabled':''}>${skill.name}${wait?' · 冷却 '+wait+' 轮':''}</button>`:''}).join('')}</div></div>`:''}
  ${hasArray?`<div class="xg-battle-talisman"><div class="xg-battle-subheading"><strong>阵盘</strong><small>使用后仍可行动</small></div><button type="button" data-array ${battle.arrayRound===battle.round+1?'disabled':''}>定身阵盘${save.player.sect==='玄机门'&&!battle.freeArrayUsed?' · 本场免费':''}</button></div>`:''}
  ${talismans.length?`<div class="xg-battle-talisman"><div class="xg-battle-subheading"><strong>符箓</strong><small>${battle.talismansUsed||0} / 2 · 不占行动</small></div><div class="xg-battle-talisman-actions">${talismans.map(id=>`<button type="button" data-talisman="${id}" ${battle.talismansUsed>=2||battle.talismanRound===battle.round+1?'disabled':''}>${id==='attack-talisman'?'攻击符 · +2':'护身符 · 免伤'}</button>`).join('')}</div></div>`:''}
  <button class="xg-battle-flee" type="button" data-fight="flee">脱离战斗</button></div><p role="status" aria-live="polite"></p></section>`;
 const status=content.querySelector('[role=status]');
 const controls=[...content.querySelectorAll('[data-fight],[data-talisman],[data-array]')];
 const run=async task=>{const disabled=controls.map(button=>button.disabled);controls.forEach(button=>button.disabled=true);try{await task();showBattle({getSave,actions,activate,onExit})}catch(error){status.textContent=error.message;controls.forEach((button,i)=>button.disabled=disabled[i])}};
 content.querySelectorAll('[data-fight]').forEach(button=>button.onclick=()=>run(()=>button.dataset.fight==='flee'?actions.flee():actions.battleRound(button.dataset.fight)));
 content.querySelectorAll('[data-talisman]').forEach(button=>button.onclick=()=>run(()=>actions.battleTalisman(button.dataset.talisman)));
 content.querySelector('[data-array]')?.addEventListener('click',()=>run(()=>actions.battleArray()));
}
