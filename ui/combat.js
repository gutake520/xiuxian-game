import {equipmentStats} from '../systems/inventory.js';
import {escapeHTML} from './shared.js';
import {TECHNIQUES} from '../data/techniques.js';
import {HERBALIST_NAME} from '../systems/encounters.js';
import {seniorUpgradeChoices,SECT_SENIORS} from '../systems/sect-tournament.js';

export function showBattle({getSave,actions,activate,onExit},endResult=null){
 const save=getSave(),battle=save?.battle;activate('map');
 const content=document.getElementById('xg-content');
 if(!battle){
  const result=endResult||save?.lastBattle;
  const encounter=save.encounterPending,hasHerb=save.inventory.some(entry=>entry.itemId==='healing-herb'),senior=save.seniorRewardPending;
  const reward=senior?`<div class="xg-card"><h3>${escapeHTML(SECT_SENIORS[save.player.sect]||'同门前辈')}的奖励</h3><p>选择一项，领取后不可更改。累计 ${(save.seniorRewards||0)+1} / 2 次。</p><button type="button" data-senior-reward="manual">领取《你怎么什么都没有》</button>${seniorUpgradeChoices(save).map(id=>`<button type="button" data-senior-reward="${id}">直接精进《${escapeHTML(TECHNIQUES[id].name)}》</button>`).join('')}</div>`:'';
  content.innerHTML=`<section class="xg-map-sheet xg-battle-sheet"><h2>战斗结束</h2><p>${result?.outcome==='victory'?'击败对手':result?.outcome==='defeat'?'你败下阵来':'已脱离战斗'}</p><div class="xg-card">${(result?.log||[]).map(line=>`<p>${escapeHTML(line)}</p>`).join('')}</div>${reward}${encounter?`<div class="xg-card"><h3>${escapeHTML(HERBALIST_NAME)}</h3><p>他身上带伤，想向你讨一株回血草。</p><p>已获玉简 ${save.herbalistFragments||0}/3</p><div class="xg-feature-row"><button type="button" data-encounter-give ${hasHerb?'':'disabled'}>交出一株回血草</button><button type="button" data-encounter-leave>离开</button></div></div>`:senior?'':'<button type="button" data-return>返回丰原镇'}<p role="status" aria-live="polite"></p></section>`;
  content.querySelector('[data-return]')?.addEventListener('click',onExit);
  content.querySelectorAll('[data-senior-reward]').forEach(button=>button.onclick=async()=>{content.querySelectorAll('[data-senior-reward]').forEach(item=>item.disabled=true);try{const {result:message}=await actions.claimSeniorReward(senior.id,button.dataset.seniorReward);showBattle({getSave,actions,activate,onExit});content.querySelector('[role=status]').textContent=message}catch(error){content.querySelector('[role=status]').textContent=error.message;content.querySelectorAll('[data-senior-reward]').forEach(item=>item.disabled=false)}});
  content.querySelectorAll('[data-encounter-give],[data-encounter-leave]').forEach(button=>button.onclick=async()=>{const pending=save.encounterPending?.id;content.querySelectorAll('[data-encounter-give],[data-encounter-leave]').forEach(item=>item.disabled=true);try{const {result:message}=await actions.respondToHerbalist(pending,button.hasAttribute('data-encounter-give'));showBattle({getSave,actions,activate,onExit});content.querySelector('[role=status]').textContent=message}catch(error){content.querySelector('[role=status]').textContent=error.message;content.querySelector('[data-encounter-leave]').disabled=false;if(hasHerb)content.querySelector('[data-encounter-give]').disabled=false}});
  return;
 }
 const stats=equipmentStats(save);
 const hasArray=save.player.sect==='玄机门'&&!battle.freeArrayUsed||save.inventory.some(item=>item.itemId==='binding-array');
 const talismans=['attack-talisman','guard-talisman'].filter(id=>save.inventory.some(item=>item.itemId===id));
 content.innerHTML=`<section class="xg-map-sheet xg-battle-sheet"><h2>${escapeHTML(battle.name)}</h2><p>第 ${battle.round+1} 轮 · ${stats.speed>=battle.speed?'你先手':'对手先手'}</p>
  <div class="xg-battle-bars"><div>你的生命 <strong>${save.player.hp.toFixed(2)} / ${stats.maxHp.toFixed(2)}</strong></div><div>对手生命 <strong>${battle.hp.toFixed(2)} / ${battle.maxHp.toFixed(2)}</strong></div></div>
  ${['sect-tournament','sect-senior'].includes(battle.kind)?`<p>对手法力 ${battle.mp.toFixed(2)} / ${battle.maxMp.toFixed(2)} · 防御 ${battle.defense.toFixed(2)}${battle.silencedTurns?' · 沉默 '+battle.silencedTurns+' 次行动':''}</p>`:''}
  <div class="xg-card xg-battle-log" aria-live="polite">${battle.log.map(line=>`<p>${escapeHTML(line)}</p>`).join('')}</div>
  <div class="xg-battle-action-panel"><h3>本轮行动</h3>${battle.pendingStrike?'<p>攻势已成，本轮自动攻击。</p>':''}${(save.techniques?.combat||[]).filter(id=>TECHNIQUES[id]?.passive).map(id=>`<small>${TECHNIQUES[id].name} · 被动生效</small>`).join('')}<div class="xg-battle-main-actions"><button type="button" data-fight="attack">${battle.pendingStrike?'释放蓄势攻击':'普攻'}</button><button type="button" data-fight="skip" ${battle.pendingStrike?'disabled':''}>跳过</button></div>
  ${(save.techniques?.combat||[]).length?`<div class="xg-battle-talisman"><strong>战斗功法</strong>${battle.criticalFocus?`<small>凝神中 · 本场暴击率 +${save.techniques.upgraded?.includes('only-once')?20:15}%</small>`:''}<div class="xg-battle-talisman-actions">${save.techniques.combat.filter(id=>!TECHNIQUES[id]?.passive).map(id=>{const skill=TECHNIQUES[id],wait=Math.max(0,(battle.skillReady?.[id]||0)-battle.round-1),used=id==='only-once'&&battle.criticalFocus||id==='cooldown-reset'&&battle.cooldownResetUsed,cost=id==='spirit-burn'?save.player.mp:save.techniques.upgraded?.includes(id)?id==='only-once'?3:2:skill?.mpCost??1;return skill?`<button type="button" data-fight="${id}" ${battle.pendingStrike||used||wait||save.player.mp<cost||id==='spirit-burn'&&save.player.mp<=0?'disabled':''}>${skill.name}${used?' · 本场已用':wait?' · 冷却 '+wait+' 轮':''}</button>`:''}).join('')}</div></div>`:''}
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
