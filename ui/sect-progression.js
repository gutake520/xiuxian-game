import {TECHNIQUES,techniqueEligible,hasActiveTechnique} from '../data/techniques.js';
import {ITEMS} from '../data/items.js';
import {DAILY_TASKS,dailyTasks,claimDailyTask,redeemInheritance,craftSectItem,repairOwnEquipment} from '../systems/sect-progression.js';
import {startLearning} from '../systems/techniques.js';
import {PILL_RECIPES,brewPill,maxDurability} from '../systems/inventory.js';
import {learningPuzzle} from './techniques.js';
import {createSheet,escapeHTML,buttonTask} from './shared.js';
import {BEAST_TYPES,ensureSpiritBeasts,beastCanFight,renameBeast,feedBeast} from '../systems/pets.js';
export function showSectTasks(api,onClose){
 const save=api.getSave(),daily=dailyTasks(save),sheet=createSheet('宗门日课',onClose),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 body.innerHTML=`<p>每日三项，每项奖励 3 积分 · 当前积分 ${save.sectPoints||0}</p>${DAILY_TASKS.map(task=>`<article class="xg-feature-card"><h3>${task.name}</h3><p>${daily[task.id]} / ${task.target}</p><button type="button" data-claim="${task.id}" ${daily.claimed.includes(task.id)||daily[task.id]<task.target?'disabled':''}>${daily.claimed.includes(task.id)?'已领取':'领取 3 积分'}</button></article>`).join('')}<small>按本地日期更新。逃跑扣款不计入消费；奇遇、赠礼任务待对应功能开放。</small>`;
 body.querySelectorAll('[data-claim]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{await api.actions.mutate(s=>claimDailyTask(s,button.dataset.claim,daily.day),{message:r=>r});showSectTasks(api,onClose)},status));
}
export function showSectInheritance(api,onClose){
 const save=api.getSave(),method=Object.values(TECHNIQUES).find(m=>m.sect===save.player.sect),sheet=createSheet('宗门传承',onClose),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 if(!method){body.textContent='请先加入宗门。';return}
 const learned=save.techniques.mastered.includes(method.id),owned=learned||save.techniques.sectManuals.includes(method.id),eligible=techniqueEligible(save.player,method);
 body.innerHTML=`<article class="xg-feature-card"><h3>${escapeHTML(method.name)}</h3><p>${escapeHTML(method.description)}</p><p>炼气核心传承 · 9 积分兑换 · 五阶数阵</p><p>当前积分 ${save.sectPoints||0}</p>${eligible?`<button type="button" data-inherit ${learned||!owned&&(save.sectPoints||0)<9?'disabled':''}>${learned?'已学会':owned?'参悟传承':'兑换典籍'}</button>`:'<p>当前不满足本宗专精条件，只能学习通用功法。</p>'}${learned?`<small>${method.type==='combat'?'请在人物页功法典籍中装备。':'请前往宗门专属房间使用。'}</small>`:''}</article>`;
 body.querySelector('[data-inherit]')?.addEventListener('click',event=>buttonTask(event.currentTarget,async()=>{
  if(!owned){await api.actions.mutate(s=>redeemInheritance(s,method.id),{message:r=>r});showSectInheritance(api,onClose)}
  else{await api.actions.mutate(s=>startLearning(s,method.id));learningPuzzle(api,method.id,()=>showSectInheritance(api,onClose))}
 },status));
}
export function showSectWorkshop(api,sectId,onClose){
 const titles={danxia:'炼丹房',tiangong:'锻兵室',wanling:'灵兽苑',taixu:'符箓室',xuanji:'阵盘室'},save=api.getSave();
 const sheet=createSheet(titles[sectId],onClose),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 const method=Object.values(TECHNIQUES).find(m=>m.sect===save.player.sect);
 if(!method||sectId!=='wanling'&&!hasActiveTechnique(save,method.id)){body.innerHTML='<p>请先到宗门传承兑换并学会本宗制作功法。</p>';return}
 if(sectId==='danxia')body.innerHTML=Object.entries(PILL_RECIPES).map(([id,recipe])=>`<article class="xg-feature-card"><h3>${ITEMS[id].name}</h3><p>${Object.entries(recipe).map(([material,count])=>`${ITEMS[material].name} ×${count}`).join('、')}</p><button type="button" data-brew="${id}">炼制一枚</button></article>`).join('');
 if(sectId==='taixu')body.innerHTML=`<p>每张消耗一份药草、一份矿石。</p><label>选择药草 <select data-herb>${(String(save.player.realm).startsWith('筑基')?['healing-herb','spirit-herb','qi-herb','foundation-healing-herb','foundation-spirit-herb','foundation-qi-herb']:['healing-herb','spirit-herb','qi-herb']).map(id=>`<option value="${id}">${ITEMS[id].name}</option>`).join('')}</select></label>${(String(save.player.realm).startsWith('筑基')?['attack-talisman','guard-talisman','foundation-attack-talisman','foundation-guard-talisman']:['attack-talisman','guard-talisman']).map(id=>`<button type="button" data-craft="${id}">制作${ITEMS[id].name}</button>`).join('')}`;
 if(sectId==='xuanji')body.innerHTML=`<p>自制阵盘每枚消耗 20 份对应境界的矿石，可使用六次。</p><button type="button" data-craft="crafted-binding-array">制作自制定身阵盘</button>${String(save.player.realm).startsWith('筑基')?'<button type="button" data-craft="foundation-crafted-array">制作自制锁灵阵盘 · 玄纹铁×20</button>':''}`;
 if(sectId==='wanling'){
  const beasts=ensureSpiritBeasts(save),herbs=String(save.player.realm).startsWith('筑基')?['foundation-healing-herb','foundation-spirit-herb','foundation-qi-herb']:['healing-herb','spirit-herb','qi-herb'];
  body.innerHTML=`<p>入门获赠两只灵兽，可分别取名。学会《铲屎官手册》后，每只每日消耗 3 株对应境界的药草，喂过的灵兽当天可以出战。</p>${BEAST_TYPES.map(type=>{const beast=beasts[type],fed=beastCanFight(save,type);return `<article class="xg-feature-card"><h3>${escapeHTML(beast.name)} · ${type==='attack'?'追击':'守护'}</h3><p>${escapeHTML(beast.stage)} · ${fed?'今日已喂养，可出战':'今日尚未喂养'} · ${type==='attack'?(beast.stage==='筑基'?'每轮追加 0.80 伤害':'每轮追加 0.50 伤害'):(beast.stage==='筑基'?'每轮抵挡 0.50 伤害':'每轮抵挡 0.30 伤害')}</p><label>取名 <input type="text" data-beast-name="${type}" maxlength="12" value="${escapeHTML(beast.name)}"></label><button type="button" data-rename="${type}">保存名字</button>${fed?'':hasActiveTechnique(save,'beast-keeper')?`<label>选择药草 <select data-feed-herb="${type}">${herbs.map(id=>`<option value="${id}">${ITEMS[id].name}</option>`).join('')}</select></label><button type="button" data-feed="${type}">喂养 · 3 株</button>`:'<p>学会《铲屎官手册》后可喂养。</p>'}</article>`}).join('')}`;
 }
 if(sectId==='tiangong'){
  const gear=save.inventory.filter(entry=>ITEMS[entry.itemId]?.kind==='equipment');
  body.innerHTML=`<p>修补费用按耐久上限每 5 点收 1 个矿石，不论掉了多少耐久，直接修满。</p>${gear.length?gear.map(entry=>{const limit=maxDurability(entry),cost=Math.ceil(limit/5);return `<article class="xg-feature-card"><h3>${escapeHTML(ITEMS[entry.itemId].name)}</h3><p>耐久 ${entry.durability??limit}/${limit} · 消耗${ITEMS[ITEMS[entry.itemId].stage==='筑基'?'foundation-ore':'ore'].name} ${cost}</p><button type="button" data-repair="${escapeHTML(entry.uid)}" ${entry.durability>=limit?'disabled':''}>${entry.durability>=limit?'已修满':'修补至满耐久'}</button></article>`}).join(''):'<p>储物中没有装备。</p>'}`;
 }
 body.querySelectorAll('[data-brew],[data-craft]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{const herb=body.querySelector('[data-herb]')?.value;const {result}=await api.actions.mutate(s=>button.dataset.brew?brewPill(s,button.dataset.brew):craftSectItem(s,button.dataset.craft,herb),{message:r=>r});showSectWorkshop(api,sectId,onClose);document.querySelector('#xg-feature-sheet [role=status]').textContent=result},status));
 body.querySelectorAll('[data-repair],[data-feed],[data-rename]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{
  const type=button.dataset.feed||button.dataset.rename;
  const name=body.querySelector(`[data-beast-name="${type}"]`)?.value;
  const herb=body.querySelector(`[data-feed-herb="${type}"]`)?.value;
  const {result}=await api.actions.mutate(s=>button.dataset.repair?repairOwnEquipment(s,button.dataset.repair):button.dataset.feed?feedBeast(s,type,herb):renameBeast(s,type,name),{message:r=>r});
  showSectWorkshop(api,sectId,onClose);document.querySelector('#xg-feature-sheet [role=status]').textContent=result;
 },status));
}
