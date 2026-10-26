import {GOLDEN_INHERITANCES,goldenInheritance,upgradeGoldenInheritance,enchantWeapon} from '../systems/golden-inheritance.js';
import {isGoldenRealm} from '../systems/golden-core.js';
import {beastPower} from '../data/titles.js';
import {TECHNIQUES,techniqueEligible,hasActiveTechnique} from '../data/techniques.js';
import {ITEMS} from '../data/items.js';
import {DAILY_TASKS,dailyTasks,claimDailyTask,redeemInheritance,craftSectItem,repairOwnEquipment,temperEquipment} from '../systems/sect-progression.js';
import {startLearning} from '../systems/techniques.js';
import {PILL_RECIPES,brewPill,maxDurability,durabilityUpgrades,DURABILITY_UPGRADE_COST,DURABILITY_UPGRADE_LIMIT} from '../systems/inventory.js';
import {learningPuzzle} from './techniques.js';
import {createSheet,escapeHTML,buttonTask} from './shared.js';
import {BEAST_TYPES,ensureSpiritBeasts,beastCanFight,renameBeast,feedBeast} from '../systems/pets.js';
export function showSectTasks(api,onClose){
 const save=api.getSave(),daily=dailyTasks(save),sheet=createSheet('宗门日课',onClose),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 body.innerHTML=`<p>当前积分 ${save.sectPoints||0}</p>${DAILY_TASKS.filter(task=>daily.selected?.includes(task.id)).map(task=>`<article class="xg-feature-card"><h3>${task.name}</h3><p>${daily[task.id]||0} / ${task.target}</p><button type="button" data-claim="${task.id}" ${daily.claimed.includes(task.id)||(daily[task.id]||0)<task.target?'disabled':''}>${daily.claimed.includes(task.id)?'已领取':'领取 1 积分'}</button></article>`).join('')}<small>按本地日期更新。逃跑扣款不计入消费；五色灵境任务只计算小游戏结算的修为。</small>`;
 body.querySelectorAll('[data-claim]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{await api.actions.mutate(s=>claimDailyTask(s,button.dataset.claim,daily.day),{message:r=>r});showSectTasks(api,onClose)},status));
}
export function showSectInheritance(api,onClose){
 const save=api.getSave(),method=Object.values(TECHNIQUES).find(m=>m.sect===save.player.sect),sheet=createSheet('宗门传承',onClose),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 if(!method){body.textContent='请先加入宗门。';return}
 const learned=save.techniques.mastered.includes(method.id),owned=learned||save.techniques.sectManuals.includes(method.id),eligible=techniqueEligible(save.player,method);
 body.innerHTML=`<article class="xg-feature-card"><h3>${escapeHTML(method.name)}</h3><p>${escapeHTML(method.description)}</p><p>炼气核心传承 · 9 积分兑换 · 五阶数阵</p><p>当前积分 ${save.sectPoints||0}</p>${eligible?`<button type="button" data-inherit ${learned||!owned&&(save.sectPoints||0)<9?'disabled':''}>${learned?'已学会':owned?'参悟传承':'兑换典籍'}</button>`:'<p>当前不满足本宗专精条件，只能学习通用功法。</p>'}${learned?`<small>${method.type==='combat'?'请在人物页功法典籍中装备。':'请前往宗门专属房间使用。'}</small>`:''}</article>`;
 if(learned&&isGoldenRealm(save.player)&&GOLDEN_INHERITANCES[method.id]){
  body.insertAdjacentHTML('beforeend',`<article class="xg-feature-card"><h3>金丹传承</h3><p>${GOLDEN_INHERITANCES[method.id]}</p><button type="button" data-golden-upgrade ${goldenInheritance(save,method.id)?'disabled':''}>${goldenInheritance(save,method.id)?'已升级':save.techniques.goldenPaid?.includes(method.id)?'继续参悟 · 已付积分':'参悟金丹传承 · 99 宗门积分'}</button></article>`);
  body.querySelector('[data-golden-upgrade]').onclick=event=>buttonTask(event.currentTarget,async()=>{await api.actions.mutate(s=>upgradeGoldenInheritance(s,method.id));learningPuzzle(api,'golden:'+method.id,()=>showSectInheritance(api,onClose))},status);
 }
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
 if(sectId==='danxia')body.innerHTML=Object.entries(PILL_RECIPES).filter(([id])=>id!=='golden-vital-pill'||goldenInheritance(save,'divine-pharmacopoeia')).map(([id,recipe])=>`<article class="xg-feature-card"><h3>${ITEMS[id].name}</h3><p>${ITEMS[id].description}</p><p>${Object.entries(recipe).map(([material,count])=>`${ITEMS[material].name} ×${count}`).join('、')}</p><button type="button" data-brew="${id}">炼制一枚</button></article>`).join('');
 if(sectId==='taixu')body.innerHTML=`<p>每张消耗一份药草、一份矿石。</p><label>选择药草 <select data-herb>${((isGoldenRealm(save.player)||String(save.player.realm).startsWith('筑基'))?['healing-herb','spirit-herb','qi-herb','foundation-healing-herb','foundation-spirit-herb','foundation-qi-herb']:['healing-herb','spirit-herb','qi-herb']).map(id=>`<option value="${id}">${ITEMS[id].name}</option>`).join('')}</select></label>${((isGoldenRealm(save.player)||String(save.player.realm).startsWith('筑基'))?['attack-talisman','guard-talisman','foundation-attack-talisman','foundation-guard-talisman']:['attack-talisman','guard-talisman']).map(id=>`<button type="button" data-craft="${id}">制作${ITEMS[id].name}</button>`).join('')}`;
 if(sectId==='taixu'&&goldenInheritance(save,'fairy-painting')){
  body.querySelector('[data-herb]').insertAdjacentHTML('beforeend',['golden-healing-herb','golden-spirit-herb','golden-qi-herb'].map(id=>`<option value="${id}">${ITEMS[id].name}</option>`).join(''));
  body.insertAdjacentHTML('beforeend','<article class="xg-feature-card"><h3>金丹制符</h3><p>裂金符：金丹药草×1、赤金矿×1；伤害8。</p><button data-craft="golden-attack-talisman">制作裂金符</button><p>金罡符：赤髓芝、玉露花、凝元叶各1，赤金矿×2；伤害8并免疫下一次伤害，每日限制作一张。</p><button data-craft="golden-dual-talisman">制作金罡符</button></article>');
 }
 if(sectId==='xuanji')body.innerHTML=`<p>自制阵盘每枚消耗 20 份对应境界的矿石，可使用六次。</p><button type="button" data-craft="crafted-binding-array">制作自制定身阵盘</button>${(isGoldenRealm(save.player)||String(save.player.realm).startsWith('筑基'))?'<button type="button" data-craft="foundation-crafted-array">制作自制锁灵阵盘 · 玄纹铁×20</button>':''}`;
 if(sectId==='xuanji'&&goldenInheritance(save,'planting-flags'))body.insertAdjacentHTML('beforeend','<p>困杀阵盘：赤金矿×20，可用六次；困一轮并造成5点固定伤害，每场最多两次。</p><button data-craft="golden-crafted-array">制作困杀阵盘</button>');
 if(sectId==='wanling'){
  const beasts=ensureSpiritBeasts(save),herbs=isGoldenRealm(save.player)?['golden-healing-herb','golden-spirit-herb','golden-qi-herb']:(isGoldenRealm(save.player)||String(save.player.realm).startsWith('筑基'))?['foundation-healing-herb','foundation-spirit-herb','foundation-qi-herb']:['healing-herb','spirit-herb','qi-herb'];
  body.innerHTML=`<p>每只灵兽每日喂养一次，需使用对应境界的药草。</p>${BEAST_TYPES.map(type=>{const beast=beasts[type],fed=beastCanFight(save,type);return `<article class="xg-feature-card"><h3>${escapeHTML(beast.name)} · ${type==='attack'?'追击':'守护'}</h3><p>${escapeHTML(beast.stage)} · ${fed?'今日已喂养，可出战':'今日尚未喂养'} · ${type==='attack'?'每轮追加':'每轮抵挡'} ${beastPower(save,type,beast.stage).toFixed(2)} 伤害</p><label>取名 <input type="text" data-beast-name="${type}" maxlength="12" value="${escapeHTML(beast.name)}"></label><button type="button" data-rename="${type}">保存名字</button>${fed?'':hasActiveTechnique(save,'beast-keeper')?`<label>选择药草 <select data-feed-herb="${type}">${herbs.map(id=>`<option value="${id}">${ITEMS[id].name}</option>`).join('')}</select></label><button type="button" data-feed="${type}">喂养 · 3 株</button>`:'<p>学会《铲屎官手册》后可喂养。</p>'}</article>`}).join('')}`;
 }
 if(sectId==='tiangong'){
  const gear=save.inventory.filter(entry=>ITEMS[entry.itemId]?.kind==='equipment');
  body.innerHTML=`${gear.length?gear.map(entry=>{const limit=maxDurability(entry),cost=Math.ceil(limit/5);return `<article class="xg-feature-card xg-temper-card"><h3>${escapeHTML(ITEMS[entry.itemId].name)}</h3><p>耐久 ${entry.durability??limit}/${limit}</p><button type="button" data-repair="${escapeHTML(entry.uid)}" ${entry.durability>=limit?'disabled':''}>${entry.durability>=limit?'已修满':'修补至满耐久 · '+ITEMS[ITEMS[entry.itemId].stage==='金丹'?'golden-ore':ITEMS[entry.itemId].stage==='筑基'?'foundation-ore':'ore'].name+'×'+cost}</button><button type="button" data-temper="${escapeHTML(entry.uid)}" ${durabilityUpgrades(entry)>=DURABILITY_UPGRADE_LIMIT?'disabled':''}>${durabilityUpgrades(entry)>=DURABILITY_UPGRADE_LIMIT?'淬炼已满':'淬炼 · 耐久上限＋5 · '+ITEMS[ITEMS[entry.itemId].stage==='金丹'?'golden-ore':ITEMS[entry.itemId].stage==='筑基'?'foundation-ore':'ore'].name+'×'+DURABILITY_UPGRADE_COST+' · '+durabilityUpgrades(entry)+'/'+DURABILITY_UPGRADE_LIMIT}</button></article>`}).join(''):'<p>储物中没有装备。</p>'}`;
 }
 if(sectId==='tiangong'&&goldenInheritance(save,'mending')){
  body.insertAdjacentHTML('beforeend',`<h3>武器附魔</h3><p>每次赤金矿×5；50%攻击+1，30%无变化，20%攻击−1。每把最多三次。</p>${save.inventory.filter(e=>ITEMS[e.itemId]?.slot==='weapon').map(e=>`<article class="xg-feature-card"><h3>${ITEMS[e.itemId].name}</h3><p>附魔攻击 ${e.enchantAttack||0} · 次数 ${e.enchantCount||0}/3</p><button data-enchant="${escapeHTML(e.uid)}" ${(e.enchantCount||0)>=3?'disabled':''}>附魔 · 赤金矿×5</button></article>`).join('')}`);
  body.querySelectorAll('[data-enchant]').forEach(b=>b.onclick=()=>buttonTask(b,async()=>{const {result}=await api.actions.mutate(s=>enchantWeapon(s,b.dataset.enchant),{message:r=>r});showSectWorkshop(api,sectId,onClose);document.querySelector('#xg-feature-sheet [role=status]').textContent=result},status));
 }
 body.querySelectorAll('[data-brew],[data-craft]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{const herb=body.querySelector('[data-herb]')?.value;const {result}=await api.actions.mutate(s=>button.dataset.brew?brewPill(s,button.dataset.brew):craftSectItem(s,button.dataset.craft,herb),{message:r=>r});showSectWorkshop(api,sectId,onClose);document.querySelector('#xg-feature-sheet [role=status]').textContent=result},status));
 body.querySelectorAll('[data-repair],[data-temper],[data-feed],[data-rename]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{
  const type=button.dataset.feed||button.dataset.rename;
  const name=body.querySelector(`[data-beast-name="${type}"]`)?.value;
  const herb=body.querySelector(`[data-feed-herb="${type}"]`)?.value;
  const {result}=await api.actions.mutate(s=>button.dataset.temper?temperEquipment(s,button.dataset.temper):button.dataset.repair?repairOwnEquipment(s,button.dataset.repair):button.dataset.feed?feedBeast(s,type,herb):renameBeast(s,type,name),{message:r=>r});
  showSectWorkshop(api,sectId,onClose);document.querySelector('#xg-feature-sheet [role=status]').textContent=result;
 },status));
}
