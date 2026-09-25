import {BOSS_NAME,bossAttributes} from '../systems/boss-line.js';
import {escapeHTML} from './shared.js';

export function showBossStory({getSave,actions,activate,onDone}){
 const save=getSave(),line=save.bossLine;
 if(line?.phase!=='ambush'&&!line?.rescuePending)return onDone();
 activate('map');
 const content=document.getElementById('xg-content');
 if(line.phase==='ambush'){
  const foe=bossAttributes(save,2);
  content.innerHTML=`<section class="xg-map-sheet xg-battle-sheet"><h2>故人衣纹</h2><div class="xg-card"><p>炼气十层。山道尽头有人拦路，袖口的暗纹与全家遇害那夜一模一样。</p><p>${BOSS_NAME}转过身，认出你后，手已按在剑柄上。他的气息远胜于你。</p><p>对手生命 ${foe.maxHp.toFixed(2)} · 攻击 ${foe.attack.toFixed(2)} · 防御 ${foe.defense.toFixed(2)} · 速度 ${foe.speed.toFixed(2)}</p></div><button type="button" data-boss-story>迎战</button><p role="status"></p></section>`;
 }else{
  content.innerHTML=`<section class="xg-map-sheet xg-battle-sheet"><h2>山道余生</h2><div class="xg-card"><p>你被${BOSS_NAME}打倒，连握剑的力气也快没了。</p><p>${escapeHTML(line.elder||'藏书阁前辈')}${line.elder&&!line.elder.endsWith('师叔')&&!line.elder.endsWith('前辈')?'师叔':''}赶来救下你，将${BOSS_NAME}打成重伤。陆仁嘉逃入丰原镇附近的山中养伤。</p></div><button type="button" data-boss-story>前往丰原镇</button><p role="status"></p></section>`;
 }
 content.querySelector('[data-boss-story]').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{if(line.phase==='ambush'){await actions.resolveBossAmbush();showBossStory({getSave,actions,activate,onDone})}else{await actions.acknowledgeBossRescue();onDone()}}catch(error){content.querySelector('[role=status]').textContent=error.message;button.disabled=false}};
}
