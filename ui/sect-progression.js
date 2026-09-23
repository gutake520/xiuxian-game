import {TECHNIQUES,techniqueEligible,hasActiveTechnique} from '../data/techniques.js';
import {ITEMS} from '../data/items.js';
import {DAILY_TASKS,dailyTasks,claimDailyTask,redeemInheritance,craftSectItem} from '../systems/sect-progression.js';
import {startLearning} from '../systems/techniques.js';
import {PILL_RECIPES,brewPill,equipmentName} from '../systems/inventory.js';
import {learningPuzzle} from './techniques.js';
import {createSheet,escapeHTML,buttonTask} from './shared.js';
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
 if(!method||!hasActiveTechnique(save,method.id)){body.innerHTML='<p>请先到宗门传承兑换并学会本宗制作功法。</p>';return}
 if(sectId==='danxia')body.innerHTML=Object.entries(PILL_RECIPES).map(([id,recipe])=>`<article class="xg-feature-card"><h3>${ITEMS[id].name}</h3><p>${Object.entries(recipe).map(([material,count])=>`${ITEMS[material].name} ×${count}`).join('、')}</p><button type="button" data-brew="${id}">炼制一枚</button></article>`).join('');
 if(sectId==='taixu')body.innerHTML=`<p>每张消耗一份药草、一份矿石。</p><label>选择药草 <select data-herb>${['healing-herb','spirit-herb','qi-herb'].map(id=>`<option value="${id}">${ITEMS[id].name}</option>`).join('')}</select></label>${['attack-talisman','guard-talisman'].map(id=>`<button type="button" data-craft="${id}">制作${ITEMS[id].name}</button>`).join('')}`;
 if(sectId==='xuanji')body.innerHTML='<p>定身阵盘：消耗 18 份矿石，使敌人下一轮不能行动。</p><button type="button" data-craft="binding-array">制作定身阵盘</button><p>第二种阵盘效果待定。</p>';
 if(sectId==='wanling')body.innerHTML=`<p>${escapeHTML(save.spiritBeast?.name||'伴生灵兽')}已随你修行。</p><p>迎战时可选择追击（每次追加 0.5 伤害）或守护（每次抵挡 0.3 伤害），无需租约。</p><p>喂养需要药草，食量和效果待定，暂不扣除材料。</p>`;
 if(sectId==='tiangong')body.innerHTML=`<p>已解锁自行修补。具体材料用量待定，暂不扣除材料。</p>${['weapon','armor','shoes','accessoryVital','accessoryFate'].map(slot=>`<p>${escapeHTML(equipmentName(save,slot))}</p>`).join('')}`;
 body.querySelectorAll('[data-brew],[data-craft]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{const herb=body.querySelector('[data-herb]')?.value;const {result}=await api.actions.mutate(s=>button.dataset.brew?brewPill(s,button.dataset.brew):craftSectItem(s,button.dataset.craft,herb),{message:r=>r});showSectWorkshop(api,sectId,onClose);document.querySelector('#xg-feature-sheet [role=status]').textContent=result},status));
}
