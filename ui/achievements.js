import {ACHIEVEMENTS,claimAchievement} from '../systems/achievements.js';
import {createSheet,buttonTask} from './shared.js';
export function showAchievements(api,onClose){
 const sheet=createSheet('成就',onClose),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]'),save=api.getSave();
 body.innerHTML=ACHIEVEMENTS.map(a=>{const claimed=save.achievements?.claimed?.includes(a.id),unlocked=save.achievements?.unlocked?.includes(a.id);return `<article class="xg-feature-card"><h3>${a.name}</h3><p>${a.description}</p><p>奖励 ${a.reward} 灵石</p><button type="button" data-achievement="${a.id}" ${!unlocked||claimed?'disabled':''}>${claimed?'已领取':unlocked?'领取奖励':'尚未达成'}</button></article>`}).join('');
 body.querySelectorAll('[data-achievement]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{await api.actions.mutate(s=>claimAchievement(s,button.dataset.achievement),{message:result=>result,allowDebt:true});if(sheet.isConnected)showAchievements(api,onClose)},status));
}
