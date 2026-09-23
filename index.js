import {readSave,writeSave,updateSave,deleteSave} from './storage/saves.js';
import {migrateSave} from './storage/migrations.js';
import {createActions} from './core/actions.js';
import {createFeatureUI,progressMarkup} from './ui/progression.js';
import {equipmentName,equipmentStats,addItem,ownsTechnique,purchase,brewPill,PILL_RECIPES} from './systems/inventory.js';
import {TECHNIQUES} from './data/techniques.js';
import {initialCombat} from './data/initial-combat.js';
import {createMapUI} from './ui/map.js';
const POS_KEY='xiuxian-game-fab-position', LAST_SLOT_KEY='xiuxian-game-last-slot';
const rollKey=slot=>`xiuxian-game-pending-roots-${slot}`;
const DB_NAME='xiuxian-game'; const DB_VERSION=1; const SLOTS=['slot1','slot2','slot3','slot4','slot5'];
let currentSave=null,currentSlot=null;
async function dbGet(slot){if(!await readSave(slot))return null;return updateSave(slot,s=>{trimEventHistory(s);return migrateSave(s)})}
async function dbPut(data){trimEventHistory(data);migrateSave(data);return writeSave(data)}
async function dbDelete(slot){await deleteSave(slot);localStorage.removeItem(rollKey(slot))}
const game=createActions({getSave:()=>currentSave,setSave:save=>{currentSave=save;currentSlot=save.slot}});
const featureUI=createFeatureUI({getSave:()=>currentSave,actions:game,activate:activatePage,character:renderCharacter});
const mapUI=createMapUI({getSave:()=>currentSave,activate:activatePage,actions:game});
async function runAction(action){try{return await action()}catch(error){console.error('[xiuxian-game]',error);alert('操作未完成，请重试。存档读取或写入失败。')}}
function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function clampFabPosition(left,top,width,height,viewportWidth,viewportHeight){return{left:Math.max(4,Math.min(viewportWidth-width-4,Number.isFinite(left)?left:viewportWidth-width-8)),top:Math.max(4,Math.min(viewportHeight-height-4,Number.isFinite(top)?top:viewportHeight/2-height/2))}}
const NAV_ICONS={
 home:'<path d="M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7"/>',
 person:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 bag:'<path d="M8 3h8l-2 5c5 3 7 6 7 9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4c0-3 2-6 7-9L8 3ZM9 8h6M9 12h6"/>',
 map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5ZM9 3v16M15 5v16"/>',
 settings:'<path d="M5 3v18M12 3v18M19 3v18M2 8h6M9 16h6M16 8h6"/>'
};
function navButton(icon,label,id='',active=false){return `<button type="button"${id?` id="${id}"`:''}${active?' class="on"':''} aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${NAV_ICONS[icon]}</svg><small>${label}</small></button>`}
const elements=['金','木','水','火','土'];
const roots=[];
const rootBonus={
  variant:{悟性:0,根骨:1,福缘:2,神识:0,魅力:1},
  single:{悟性:0,根骨:1,福缘:1,神识:0,魅力:1},
  double:{悟性:1,根骨:1,福缘:0,神识:1,魅力:0},
  triple:{悟性:2,根骨:1,福缘:0,神识:0,魅力:0},
  quad:{悟性:1,根骨:2,福缘:0,神识:0,魅力:0},
  five:{悟性:1,根骨:1,福缘:0,神识:1,魅力:-1}
};
function addRoot(name,type){roots.push({name,type,bonus:rootBonus[type]})}
['雷灵根','冰灵根','风灵根'].forEach(n=>addRoot(n,'variant'));
elements.forEach(e=>addRoot(e+'灵根','single'));
for(let i=0;i<elements.length;i++)for(let k=i+1;k<elements.length;k++)addRoot(elements[i]+elements[k]+'双灵根','double');
for(let i=0;i<elements.length;i++)for(let k=i+1;k<elements.length;k++)for(let m=k+1;m<elements.length;m++)addRoot(elements[i]+elements[k]+elements[m]+'三灵根','triple');
for(let omit=0;omit<elements.length;omit++)addRoot(elements.filter((_,i)=>i!==omit).join('')+'四灵根','quad');
addRoot('金木水火土五灵根','five');
function pickRoot(){return roots[Math.floor(Math.random()*roots.length)]}
const STAT_NAMES=['悟性','根骨','福缘','神识','魅力'], FREE_POINTS=30, STAT_CAP=10;
function emptyAllocation(){return{悟性:0,根骨:0,福缘:0,神识:0,魅力:0}}
function finalStats(root,alloc){const out={};for(const k of STAT_NAMES)out[k]=(alloc[k]||0)+(root.bonus[k]||0);return out}
function rootDesc(root){const b=STAT_NAMES.filter(k=>root.bonus[k]).map(k=>k+(root.bonus[k]>0?'+':'')+root.bonus[k]).join(' · ');return root.name+'｜'+b}
function newSave(name,gender,root,alloc){const stats=finalStats(root,alloc),combat=initialCombat(root.name);return{slot:currentSlot,version:6,createdAt:Date.now(),updatedAt:Date.now(),player:{name,gender,realm:'炼气一层',sect:'无门无派',cultivation:0,spirit:combat.mp,hp:combat.hp,mp:combat.mp,mind:60,combat,spiritRoot:root.name,rootType:root.type,rootDesc:rootDesc(root),aptitude:root.bonus,stats},story:{chapter:1,revenge:true,homeDestroyed:true},inventory:[],events:[],actionRound:0,world:{location:'荒山古道',day:1},flags:{}}}
async function saveNow(){if(currentSave)await game.refresh()}
// Only narrative history is capped. Inventory, quests and flags remain untouched.
const EVENT_ROUND_LIMIT=10;
function trimEventHistory(save){
 const before=JSON.stringify(save.events),source=Array.isArray(save.events)?save.events:[];
 let serial=0;const groups=[];
 for(const item of source){
  const event=typeof item==='string'?{text:item}:item;
  if(!event||typeof event!=='object')continue;
  const explicit=Number.isSafeInteger(event.round)&&event.round>=0;
  const round=explicit?event.round:serial+1;serial=Math.max(serial,round);
  let group=groups.find(entry=>entry.round===round);
  if(!group){group={round,location:event.location||'',messages:[]};groups.push(group)}
  const messages=Array.isArray(event.messages)?event.messages:[event.text??event.message??event.description];
  group.messages.push(...messages.filter(text=>typeof text==='string'&&text.trim()));
 }
 const latest=Math.max(Number.isSafeInteger(save.actionRound)?save.actionRound:0,serial);
 save.actionRound=latest;
 save.events=groups.filter(group=>group.round>latest-EVENT_ROUND_LIMIT).sort((a,b)=>a.round-b.round).slice(-EVENT_ROUND_LIMIT);
 return before!==JSON.stringify(save.events);
}
async function recordAction(messages,applyResult){return game.mutate(applyResult,{message:messages})}
let actionPending=false;
function renderHome(){
 if((currentSave?.qiSecret||currentSave?.qiMeditation))return mapUI.render();
 activatePage('home');const p=currentSave.player,world=currentSave.world||{};
 const location=world.location||'荒山古道',day=Number.isSafeInteger(world.day)&&world.day>0?world.day:1;
 const requirement=p.cultivationRequired,known=Number.isFinite(requirement)&&requirement>0;
 const progress=known?Math.max(0,Math.min(100,(p.cultivation||0)/requirement*100)):0;
 const inSect=p.sect&&p.sect!=='无门无派';
 const atSect=inSect&&location===p.sect;
 const actions=atSect?['宗门走访','同门交谈','离开山门']:['四下探索','寻人交谈','前往别处'];
 const history=Array.isArray(currentSave.events)?currentSave.events:[];
 document.getElementById('xg-content').innerHTML=`<section class="xg-home-sheet">
 <div class="xg-card"><div class="xg-player"><div><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.gender||'未设')} · ${escapeHTML(p.sect||'无门无派')}</small></div><em>${escapeHTML(p.realm)}</em></div>
 <div class="xg-home-cultivation"><span>修为</span><span>${sheetValue(p.cultivation)} / ${sheetValue(requirement)}</span></div>
 <div class="xg-progress" ${known?`role="progressbar" aria-label="修为" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"`:'aria-label="突破所需修为尚未设定"'}><i style="width:${progress}%"></i></div>
 </div>
 <div class="xg-world-line"><span>⌖ ${escapeHTML(location)}</span><span>第 ${day} 日</span></div>
 <div class="xg-card xg-daily"><h3>宗门日课</h3><p>${inSect?'暂无可领取的日课。':'尚未入宗，暂无宗门日课。'}</p></div>
 <div class="xg-location-actions">${actions.map(label=>`<button type="button" data-home-action>${label}</button>`).join('')}</div>
 <p id="xg-home-feedback" role="status" aria-live="polite"></p>
 <div class="xg-card xg-history"><div class="xg-history-heading"><h3>近日见闻</h3><small>最近十轮</small></div>
 ${history.length?[...history].reverse().map(event=>`<article><div class="xg-event-meta"><span>第 ${escapeHTML(event.round)} 轮</span><span>${escapeHTML(event.location||'')}</span></div>${event.messages.map(text=>`<p>${escapeHTML(text)}</p>`).join('')}</article>`).join(''):'<p class="xg-history-empty">行路伊始，尚无新的见闻。</p>'}
 </div></section>`;
 document.querySelectorAll('[data-home-action]').forEach(button=>button.onclick=()=>{document.getElementById('xg-home-feedback').textContent='此处行动尚未开放。'});
}
function activatePage(page){
 document.querySelectorAll('#xg-panel nav button').forEach(button=>{
  const active=button.id==='xg-'+page;
  button.classList.toggle('on',active);
  if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 });
 const content=document.getElementById('xg-content');content.scrollTop=0;
}
function sheetValue(value,suffix=''){return Number.isFinite(value)?escapeHTML(value)+suffix:'—'}
function combatValue(value,suffix=''){return Number.isFinite(value)?Number(value).toFixed(2)+suffix:'—'}
function renderCharacter(){
 if(!currentSave){runAction(showSlots);return}
 activatePage('person');
 const p=currentSave.player,stats=p.stats||{},combat=equipmentStats(currentSave);
 const root=roots.find(root=>root.name===p.spiritRoot);
 const type={variant:'变异灵根',single:'单灵根',double:'双灵根',triple:'三灵根',quad:'四灵根',five:'五灵根'}[p.rootType||root?.type]||'未详';
 const cell=(label,value)=>`<div class="xg-value-cell"><span>${label}</span><strong>${value}</strong></div>`;
 document.getElementById('xg-content').innerHTML=`<section class="xg-character" aria-label="人物面板">
 <div class="xg-card"><div class="xg-character-title"><small>人物 · 道途</small><h2>${escapeHTML(p.name||'未命名')}</h2></div>
 <div class="xg-info-grid">${cell('性别',escapeHTML(p.gender||'未设'))}${cell('境界',escapeHTML(p.realm||'未详'))}${cell('门派',escapeHTML(p.sect||'无门无派'))}${cell('灵根类型',escapeHTML(type))}</div>
 <div class="xg-root-detail"><strong>${escapeHTML(p.spiritRoot||'未详')}</strong><small>${escapeHTML(p.rootDesc||'')}</small></div>
 ${progressMarkup(p)}
 </div>
 ${companionMarkup(p)}
 <div class="xg-card"><h3>资质</h3><div class="xg-aptitude-grid">${['悟性','根骨','神识','魅力','福缘'].map(k=>`<div><span>${k}</span><strong>${sheetValue(stats[k])}</strong></div>`).join('')}</div></div>
 <div class="xg-card"><h3>战斗属性</h3><div class="xg-combat-grid">${[
 ['生命 HP',`${combatValue(p.hp)} / ${combatValue(combat.maxHp)}`],['法力 MP',`${combatValue(p.mp)} / ${combatValue(combat.maxMp)}`],['攻击',combatValue(combat.attack)],['防御',combatValue(combat.defense)],['速度',combatValue(combat.speed)],['暴击率',combatValue(combat.critRate,'%')],['闪避率',combatValue(combat.dodgeRate,'%')]
 ].map(([label,value])=>cell(label,value)).join('')}</div>
 </div>
 <div class="xg-card"><h3>装备</h3><div class="xg-equipment-grid">${[['武器','weapon'],['防具','armor'],['鞋子','shoes'],['生命／法力饰品','accessoryVital'],['暴击／闪避饰品','accessoryFate']].map(([label,slot])=>cell(label,escapeHTML(equipmentName(currentSave,slot)))).join('')}</div>
 <h4>修炼功法</h4><div class="xg-method-row"><span>主修</span><span>${escapeHTML(TECHNIQUES[currentSave.techniques?.main]?.name||'未装备')}</span></div><div class="xg-method-row"><span>辅修</span><span>未装备</span></div>
 <button type="button" id="xg-methods" class="xg-methods-button">查看功法典籍</button><h4>战斗功法</h4><p class="xg-empty-note">${(currentSave.techniques?.combat||[]).map(id=>escapeHTML(TECHNIQUES[id]?.name||'')).join(' · ')||'尚未装备战斗功法'} · 最多两门</p></div>
 <div class="xg-character-actions"><button type="button" id="xg-sect">门派</button><button type="button" id="xg-cultivate">修炼</button><button type="button" disabled>突破<small>尚未开放</small></button></div>
 <p id="xg-character-message" role="status" aria-live="polite"></p></section>`;
 document.getElementById('xg-sect').onclick=showSect;document.getElementById('xg-cultivate').onclick=()=>runAction(async()=>{await game.refresh();featureUI.cultivation()});document.getElementById('xg-methods').onclick=featureUI.library;
}
const SECTS=[
 {id:'tiangong',name:'天工阁',roots:['金','火'],condition:'金或火灵根',feature:'炼器与装备打造，提升装备耐久。'},
 {id:'danxia',name:'丹霞谷',roots:['火','木'],condition:'火或木灵根',feature:'炼丹制药，辅助修行。'},
 {id:'qinglan',name:'青岚谷',roots:['木','水'],condition:'木或水灵根',feature:'医修传承，擅长治疗与恢复。'},
 {id:'hehuan',name:'合欢宗',stat:['魅力',8],condition:'魅力 ≥ 8',feature:'人际与情缘，可结三位正式道侣。'},
 {id:'wanling',name:'万灵山',roots:['木','土','风'],condition:'木、土或风灵根',feature:'御兽之道，培养灵兽并肩作战。'},
 {id:'lingxiao',name:'凌霄剑宗',roots:['金','雷','冰'],condition:'金、雷或冰灵根',feature:'以剑求道，专精攻击与高伤害。'},
 {id:'xuanji',name:'玄机门',roots:['冰'],stat:['神识',8],condition:'冰灵根或神识 ≥ 8',feature:'阵法与控制，限制敌人行动。'},
 {id:'taixu',name:'太虚符宗',allStats:[['神识',6],['悟性',7]],condition:'神识 ≥ 6，且悟性 ≥ 7',feature:'符箓传承与功能型术法。'},
 {id:'zhenyue',name:'镇岳宗',roots:['雷','土'],stat:['根骨',8],condition:'雷、土灵根或根骨 ≥ 8',feature:'锤炼肉身，擅长近战与生存。'}
];
function sectEligibility(player,sect){
 const name=player.spiritRoot||'';
 const variant=['雷','冰','风'].some(element=>name.includes(element));
 const enough=([key,min])=>Number.isFinite(player.stats?.[key])&&player.stats[key]>=min;
 const specialty=sect.allStats?sect.allStats.every(enough):Boolean(sect.roots?.some(element=>name.includes(element))||(sect.stat&&enough(sect.stat)));
 return{join:variant||specialty,specialty};
}
function playerSect(player){return SECTS.find(sect=>sect.name===player.sect)||null}
function companionLimit(player){return player.sect==='合欢宗'?3:1}
function companionMarkup(player){
 const list=Array.isArray(player.companions)?player.companions:[],limit=companionLimit(player);
 return `<div class="xg-card xg-companions"><h3>道侣 <small>${list.length} / ${limit}</small></h3><div class="xg-companion-list">${Array.from({length:Math.max(limit,list.length)},(_,i)=>`<span>${escapeHTML(typeof list[i]==='string'?list[i]:list[i]?.name||'缘分未至')}</span>`).join('')}</div></div>`;
}
function sectOverlay(){
 let sheet=document.getElementById('xg-sect-sheet');
 if(!sheet){sheet=document.createElement('div');sheet.id='xg-sect-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','宗门');document.getElementById('xg-panel').append(sheet)}
 sheet.classList.add('open');return sheet;
}
function closeSect(){document.getElementById('xg-sect-sheet')?.classList.remove('open');if(currentSave)renderCharacter()}
function showSect(){
 if(!currentSave)return;
 const sect=playerSect(currentSave.player);
 if(sect){if(currentSave.sectProgress?.introPending)renderSectIntro(sect);else renderSectHall(sect);return}
 const sheet=sectOverlay();
 sheet.innerHTML=`<div class="xg-sect-heading"><h2>择宗入道</h2><button type="button" id="xg-sect-back">返回人物</button></div><p class="xg-sect-hint">择一山门，寻一条修行路。变异灵根可入各宗，特色传承仍需满足专精条件。</p><div class="xg-sect-list">${SECTS.map(sect=>{const eligible=sectEligibility(currentSave.player,sect);return `<button type="button" data-sect="${sect.id}" ${eligible.join?'':'disabled'}><strong>${sect.name}</strong><small>${sect.condition}</small><span>${sect.feature}</span><em>${eligible.join?(eligible.specialty?'可入宗 · 可学特色传承':'可入宗 · 仅通用功法'):'暂不符合条件'}</em></button>`}).join('')}</div>`;
 document.getElementById('xg-sect-back').onclick=closeSect;
 sheet.querySelectorAll('[data-sect]').forEach(button=>button.onclick=()=>previewSect(SECTS.find(sect=>sect.id===button.dataset.sect)));
 sheet.scrollTop=0;
}
function previewSect(sect){
 if(!sect||!currentSave||!sectEligibility(currentSave.player,sect).join)return;
 const sheet=sectOverlay(),eligible=sectEligibility(currentSave.player,sect);
 sheet.innerHTML=`<div class="xg-sect-heading"><h2>${sect.name}</h2><button type="button" id="xg-sect-back">返回选择</button></div><div class="xg-card"><p>${sect.feature}</p><p class="xg-sect-hint">${eligible.specialty?'你已满足本宗专精条件。':'你可凭变异灵根入宗，但暂不能学习本宗特色传承。'}</p></div><p class="xg-sect-hint">拜师后获赠通用功法《引气诀》。解开数阵学会后，设为主修即可挂机积累修为。</p><button type="button" id="xg-sect-join">拜入山门</button><p id="xg-sect-error" role="status"></p>`;
 document.getElementById('xg-sect-back').onclick=showSect;
 document.getElementById('xg-sect-join').onclick=async()=>{
  const button=document.getElementById('xg-sect-join'),back=document.getElementById('xg-sect-back');button.disabled=back.disabled=true;
  try{await joinSect(sect.id);renderSectIntro(sect)}catch(error){console.error('[xiuxian-game]',error);document.getElementById('xg-sect-error').textContent='拜师未完成，请重试。';button.disabled=back.disabled=false}
 };
 sheet.scrollTop=0;
}
let sectBusy=false;
async function joinSect(id){
 if(sectBusy||actionPending)throw new Error('操作进行中');
 const sect=SECTS.find(sect=>sect.id===id);
 if(!currentSave||!sect||!sectEligibility(currentSave.player,sect).join)throw new Error('入宗资格不足');
 if(currentSave.player.sect&&currentSave.player.sect!=='无门无派')throw new Error('已归属宗门');
 sectBusy=true;
 try{
  await game.mutate(next=>{
   if(next.player.sect&&next.player.sect!=='无门无派')throw new Error('已归属宗门');
   if(!sectEligibility(next.player,sect).join)throw new Error('入宗资格不足');
   if(!ownsTechnique(next,'basic-qi-guide'))addItem(next,'qi-manual');
   next.player.sect=sect.name;next.world={...(next.world||{}),location:sect.name,day:next.world?.day||1};
   next.sectProgress={id:sect.id,introPending:true};
  },{message:`拜入${sect.name}，受赐入门典籍《引气诀》。`});
 }finally{sectBusy=false}
}
function renderSectIntro(sect){
 const sheet=sectOverlay();
 sheet.innerHTML=`<div class="xg-sect-cg"><small>入门 · ${sect.name}</small><div class="xg-cg-moon" aria-hidden="true">☾</div><h2>山门已开</h2><p>你沿石阶走入山门，在堂前停步，向授业长老行了拜师礼。</p><p>长老将一册薄薄的典籍交到你手中。</p><blockquote>“修行先须定心。此后勤学慎行，莫负今日之志。”</blockquote><div class="xg-sect-gift"><strong>引气诀</strong><small>普通 · 通用修炼功法 · 待参悟</small></div><button type="button" id="xg-sect-enter">收下典籍，进入宗门</button><p id="xg-sect-error" role="status"></p></div>`;
 document.getElementById('xg-sect-enter').onclick=async()=>{
  const button=document.getElementById('xg-sect-enter');button.disabled=true;
  try{await game.mutate(next=>{next.sectProgress.introPending=false});renderSectHall(sect)}catch(error){console.error('[xiuxian-game]',error);document.getElementById('xg-sect-error').textContent='保存未完成，请重试。';button.disabled=false}
 };sheet.scrollTop=0;
}
const SECT_MANUALS=[['strengthen-manual','strengthen-attack'],['wall-manual','iron-wall'],['gamble-manual','gamble-strike']];
const SECT_ROOMS={danxia:'炼丹房',tiangong:'锻兵室',wanling:'灵兽苑',taixu:'符箓室',xuanji:'阵盘室'};
function sectHeader(sect,back){return `<div class="xg-sect-heading"><h2>${sect.name}</h2><button type="button" id="xg-sect-back">${back}</button></div>`}
function renderSectHall(sect){
 const sheet=sectOverlay(),eligible=sectEligibility(currentSave.player,sect);
 sheet.innerHTML=`${sectHeader(sect,'返回人物')}<p class="xg-sect-hint">${sect.feature}</p><div class="xg-card"><strong>${eligible.specialty?'特色传承资格已满足':'当前仅可学习通用功法'}</strong><p class="xg-sect-hint">宗门积分 ${currentSave.sectPoints||0} · 《引气诀》可在人物页参悟</p></div><div class="xg-sect-facilities"><button type="button" data-sect-shop>门派商店<small>通用战斗功法</small></button>${SECT_ROOMS[sect.id]?`<button type="button" data-sect-room>${SECT_ROOMS[sect.id]}<small>${eligible.specialty?'进入':'专精条件未满足'}</small></button>`:''}${['日课堂','藏书阁','宗门大比','师尊授业'].map(name=>`<button type="button" disabled>${name}<small>尚未开放</small></button>`).join('')}</div><details class="xg-sect-rules"><summary>离宗与情缘须知</summary><p>离宗后，本宗专属功法与物品停止生效，专属功法自动卸下；已学记录保留，通用物品不受影响。</p><p>主动解除道侣关系须支付灵石。离开合欢宗时，至多保留一位道侣，其余关系须先结清费用。灵石不足时不能办理。</p><p>费用及重返宗门规则待定，退出、更换道侣暂未开放。</p></details>`;
 sheet.querySelector('#xg-sect-back').onclick=closeSect;
 sheet.querySelector('[data-sect-shop]').onclick=()=>renderSectShop(sect);
 sheet.querySelector('[data-sect-room]')?.addEventListener('click',()=>renderSectRoom(sect));
 sheet.scrollTop=0;
}
function renderSectShop(sect){
 const sheet=sectOverlay();
 sheet.innerHTML=`${sectHeader(sect,'返回宗门')}<div class="xg-card"><h3>门派商店</h3><p>通用战斗功法典籍，每部 15 灵石。参悟后可在人物页装备。</p>${SECT_MANUALS.map(([itemId,methodId])=>{const owned=ownsTechnique(currentSave,methodId);return `<button type="button" data-sect-manual="${itemId}" ${owned?'disabled':''}>${escapeHTML(TECHNIQUES[methodId].name)} · ${owned?'已拥有':'15 灵石'}</button>`}).join('')}</div><p id="xg-sect-status" role="status"></p>`;
 sheet.querySelector('#xg-sect-back').onclick=()=>renderSectHall(sect);
 sheet.querySelectorAll('[data-sect-manual]').forEach(button=>button.onclick=async()=>{
  button.disabled=true;
  try{const {result}=await game.mutate(s=>purchase(s,button.dataset.sectManual,true),{message:result=>result});renderSectShop(sect);sheet.querySelector('#xg-sect-status').textContent=result}
  catch(error){sheet.querySelector('#xg-sect-status').textContent=error.message;button.disabled=false}
 });
 sheet.scrollTop=0;
}
function renderSectRoom(sect){
 const sheet=sectOverlay(),eligible=sectEligibility(currentSave.player,sect),learned=currentSave.techniques?.mastered?.includes('divine-pharmacopoeia');
 let body='<p>具体制作方式尚未确定，暂不消耗材料。</p>';
 if(sect.id==='danxia'){
  body=`<p>在此参悟《神药谱》，学会后才能炼制丹药。</p>${eligible.specialty?learned?`<p>已学会炼丹</p>${Object.entries(PILL_RECIPES).map(([id,recipe])=>`<button type="button" data-brew="${id}">炼制${escapeHTML({'small-heal-pill':'小还丹','spirit-pill':'回灵丹','mixed-pill':'养元丹','qi-pill':'聚气丹'}[id])} · ${Object.entries(recipe).map(([herb,count])=>`${escapeHTML({'healing-herb':'回血草','spirit-herb':'回灵草','qi-herb':'聚气草'}[herb])}×${count}`).join('、')}</button>`).join('')}`:currentSave.techniques?.sectManuals?.includes('divine-pharmacopoeia')?'<button type="button" id="xg-study-pharmacopoeia">参悟神药谱 · 五阶数阵</button>':`<p>特殊传承需宗门积分；宗门任务暂未开放。</p><button type="button" id="xg-buy-pharmacopoeia" ${(currentSave.sectPoints||0)<1?'disabled':''}>兑换典籍 · 1 积分（暂定）</button>`:'<p>不满足本宗专精条件，暂不能学习炼丹传承。</p>'}`;
 }else if(sect.id==='tiangong')body='<p>锻造与自行修补装备的配方尚未确定，暂不消耗矿石和灵石。</p>';
 else if(sect.id==='wanling')body='<p>这里可以照料自己的灵兽。喂养会使用药草，灵兽获取方式、每次食量及效果尚待确定。</p>';
 else if(sect.id==='taixu')body='<p>攻击符与护身符计划各用一份药草、一份矿石制作；制符传承尚未开放。</p>';
 else if(sect.id==='xuanji')body='<p>阵盘用于需要提前准备的战斗。两种阵盘的具体效果和制作费用尚待确定，矿石需求暂定 18 份。</p>';
 sheet.innerHTML=`${sectHeader(sect,'返回宗门')}<div class="xg-card"><h3>${SECT_ROOMS[sect.id]}</h3>${body}</div><p id="xg-sect-status" role="status"></p>`;
 sheet.querySelector('#xg-sect-back').onclick=()=>renderSectHall(sect);
 sheet.querySelectorAll('[data-brew]').forEach(button=>button.onclick=async()=>{
  button.disabled=true;
  try{const {result}=await game.mutate(s=>brewPill(s,button.dataset.brew),{message:result=>result});renderSectRoom(sect);sheet.querySelector('#xg-sect-status').textContent=result}
  catch(error){sheet.querySelector('#xg-sect-status').textContent=error.message;button.disabled=false}
 });
 sheet.querySelector('#xg-buy-pharmacopoeia')?.addEventListener('click',async event=>{
  event.currentTarget.disabled=true;
  try{await game.mutate(s=>{if(s.player.sect!=='丹霞谷'||!sectEligibility(s.player,sect).specialty||s.sectPoints<1)throw new Error('宗门积分不足或不符合传承条件。');s.sectPoints--;s.techniques.sectManuals.push('divine-pharmacopoeia')},{message:'兑换《神药谱》。'});renderSectRoom(sect)}
  catch(error){sheet.querySelector('#xg-sect-status').textContent=error.message;event.currentTarget.disabled=false}
 });
 sheet.querySelector('#xg-study-pharmacopoeia')?.addEventListener('click',()=>{sheet.classList.remove('open');featureUI.library()});
 sheet.scrollTop=0;
}

function showPrologue(){let pending;try{pending=JSON.parse(localStorage.getItem(rollKey(currentSlot))||'null')}catch{}
 let root=roots.find(candidate=>candidate.name===pending?.root),rolls=Number.isSafeInteger(pending?.rolls)&&pending.rolls>=1&&pending.rolls<=3?pending.rolls:1,alloc=emptyAllocation();
 if(!root){root=pickRoot();rolls=1;localStorage.setItem(rollKey(currentSlot),JSON.stringify({root:root.name,rolls}))}
 const el=document.getElementById('xg-onboard');el.classList.add('open');
 const paint=()=>{const used=STAT_NAMES.reduce((n,k)=>n+alloc[k],0),left=FREE_POINTS-used;document.getElementById('xg-roll').innerHTML=`<b>${root.name}</b><small>${rootDesc(root)}</small><div class="xg-points">剩余自由点 <strong>${left}</strong> / ${FREE_POINTS}</div><div class="xg-alloc">${STAT_NAMES.map(k=>`<div><span>${k}<small>最终 ${alloc[k]+(root.bonus[k]||0)}</small></span><button data-stat="${k}" data-d="-">−</button><b>${alloc[k]}</b><button data-stat="${k}" data-d="+">＋</button></div>`).join('')}</div><small>单项最多自由投入 ${STAT_CAP} 点；显示的最终值已包含灵根修正。</small>`;document.querySelectorAll('#xg-roll [data-stat]').forEach(btn=>btn.onclick=()=>{const k=btn.dataset.stat,usedNow=STAT_NAMES.reduce((n,x)=>n+alloc[x],0);if(btn.dataset.d==='+'&&alloc[k]<STAT_CAP&&usedNow<FREE_POINTS)alloc[k]++;if(btn.dataset.d==='-'&&alloc[k]>0)alloc[k]--;paint()})};paint();
 const reroll=document.getElementById('xg-reroll');const updateRoll=()=>{reroll.disabled=rolls>=3;reroll.textContent=rolls>=3?'灵根已定 · 3 / 3':`重测灵根 · ${rolls} / 3`};updateRoll();
 reroll.onclick=()=>{if(rolls>=3)return;root=pickRoot();rolls++;localStorage.setItem(rollKey(currentSlot),JSON.stringify({root:root.name,rolls}));paint();updateRoll()};
 document.getElementById('xg-onboard-cancel').onclick=()=>{el.classList.remove('open');runAction(showSlots)};
 document.getElementById('xg-begin').onclick=()=>runAction(async()=>{const name=document.getElementById('xg-name').value.trim(),gender=document.getElementById('xg-gender').value,used=STAT_NAMES.reduce((n,k)=>n+alloc[k],0);if(!name)return document.getElementById('xg-name').focus();if(used!==FREE_POINTS)return alert('还有 '+(FREE_POINTS-used)+' 点属性没有分配。');const button=document.getElementById('xg-begin');if(button.disabled)return;button.disabled=true;document.getElementById('xg-onboard-cancel').disabled=true;try{const next=newSave(name,gender,root,alloc);await game.create(next);localStorage.removeItem(rollKey(currentSlot));localStorage.setItem(LAST_SLOT_KEY,currentSlot);el.classList.remove('open');renderHome()}finally{button.disabled=false;document.getElementById('xg-onboard-cancel').disabled=false}})}
async function showSlots(){const sheet=document.getElementById('xg-slots');sheet.classList.add('open');const list=document.getElementById('xg-slot-list');list.innerHTML='';for(let i=0;i<5;i++){const slot=SLOTS[i];let s,failed=false;try{s=await dbGet(slot)}catch(error){failed=true;console.error('[xiuxian-game] 存档读取失败',slot,error)}const row=document.createElement('div');row.className='xg-slot';row.innerHTML=failed?`<div><b>存档 ${i+1}</b><small>读取失败，原存档仍在本机</small></div><button data-retry>重试</button>`:s?`<div><b>存档 ${i+1} · ${escapeHTML(s.player.name)}</b><small>${escapeHTML(s.player.gender||'')}　${escapeHTML(s.player.spiritRoot)}　${escapeHTML(s.player.realm)}</small></div><div><button data-load>进入</button><button data-del>删除</button></div>`:`<div><b>存档 ${i+1}</b><small>空白命途</small></div><button data-new>新建</button>`;row.querySelector('[data-retry]')?.addEventListener('click',()=>runAction(showSlots));row.querySelector('[data-load]')?.addEventListener('click',()=>runAction(async()=>{await game.select(slot);localStorage.setItem(LAST_SLOT_KEY,slot);sheet.classList.remove('open');(currentSave?.qiSecret||currentSave?.qiMeditation)?mapUI.render():renderHome()}));row.querySelector('[data-new]')?.addEventListener('click',()=>{currentSlot=slot;currentSave=null;sheet.classList.remove('open');showPrologue()});row.querySelector('[data-del]')?.addEventListener('click',()=>runAction(async()=>{if(confirm('删除这个存档？此操作无法撤销。')){await dbDelete(slot);if(currentSlot===slot){currentSlot=null;currentSave=null;document.getElementById('xg-content').textContent='';localStorage.removeItem(LAST_SLOT_KEY)}await showSlots()}}));list.append(row)}}
async function loadGame(){const last=localStorage.getItem(LAST_SLOT_KEY);if(last){try{const s=await dbGet(last);if(s){await game.select(last);(currentSave?.qiSecret||currentSave?.qiMeditation)?mapUI.render():renderHome();return}}catch(error){console.error('[xiuxian-game] 当前存档读取失败',error)}}await showSlots()}
function mount(){if(document.getElementById('xg-fab'))return;const fab=document.createElement('button');fab.id='xg-fab';fab.type='button';fab.title='问我';fab.setAttribute('aria-label','打开问我');fab.innerHTML='<span class="xg-moon-emoji" aria-hidden="true">🌙</span>';const panel=document.createElement('section');panel.id='xg-panel';panel.innerHTML=`<div class="xg-head"><div><b>问 我</b><small>一念成仙 · 一念为凡</small></div><button id="xg-head-moon" class="xg-head-moon" type="button" aria-label="关闭面板"><span aria-hidden="true">🌙</span></button><div class="xg-mountain"><i></i><i></i><i></i></div></div><main id="xg-content"></main><nav aria-label="游戏导航">${navButton('home','主页','xg-home',true)}${navButton('person','人物','xg-person')}${navButton('bag','储物','xg-bag')}${navButton('map','地图','xg-map')}${navButton('settings','设置','xg-settings')}</nav><div id="xg-settings-sheet"><div class="xg-setting-title">设置<button id="xg-settings-close">×</button></div><button id="xg-slots-btn">五世存档</button><button id="xg-save">保存当前存档</button><button id="xg-update">重新载入游戏<small>应用已经下载好的扩展更新</small></button><p>五个独立存档均保存在本机 IndexedDB。角色资质、灵根、性别、门派与事件标记会随档保存，供后续奇遇系统判定。</p></div><div id="xg-slots"><div class="xg-setting-title">选择命途<button id="xg-slots-close">×</button></div><div id="xg-slot-list"></div></div><div id="xg-onboard"><button id="xg-onboard-cancel" type="button">← 返回存档</button><div class="xg-prologue"><small>序 · 烬余</small><h2>山门已灭，故人无归。</h2><p>那一夜，火烧了整座山。师门上下无一幸免，唯有你从断崖下醒来。</p><p>你记得剑光，也记得仇人的衣纹。可如今的你连握剑的手都在发抖。</p><p>想报仇，先活下去。想活下去，便修行。</p><label>留下你的名字</label><input id="xg-name" maxlength="12" placeholder="输入姓名"><label>性别</label><select id="xg-gender"><option value="女" selected>女</option><option value="男">男</option><option value="不详">不详</option></select><div id="xg-roll"></div><button id="xg-reroll">重测灵根</button><button id="xg-begin">此身入道</button></div></div>`;document.body.append(fab,panel);
let moved=false,sx=0,sy=0,sl=0,st=0;const restorePosition=()=>{let saved;try{saved=JSON.parse(localStorage.getItem(POS_KEY)||'null')}catch{localStorage.removeItem(POS_KEY)}if(!saved)return;const pos=clampFabPosition(saved.left,saved.top,52,52,innerWidth,innerHeight);fab.style.left=pos.left+'px';fab.style.top=pos.top+'px';fab.style.right='auto';fab.style.transform='none'};restorePosition();window.addEventListener('resize',restorePosition);const start=e=>{moved=false;const p=e.touches?.[0]||e;sx=p.clientX;sy=p.clientY;const r=fab.getBoundingClientRect();sl=r.left;st=r.top},move=e=>{if(!sx&&!sy)return;const p=e.touches?.[0]||e,dx=p.clientX-sx,dy=p.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;if(!moved)return;e.preventDefault();fab.style.transform='none';fab.style.right='auto';fab.style.left=Math.max(4,Math.min(innerWidth-fab.offsetWidth-4,sl+dx))+'px';fab.style.top=Math.max(4,Math.min(innerHeight-fab.offsetHeight-4,st+dy))+'px'},end=()=>{if(moved){const r=fab.getBoundingClientRect(),left=r.left+r.width/2<innerWidth/2?8:innerWidth-r.width-8;fab.style.left=left+'px';localStorage.setItem(POS_KEY,JSON.stringify({left,top:r.top}))}sx=sy=0};fab.addEventListener('touchstart',start,{passive:true});fab.addEventListener('touchmove',move,{passive:false});fab.addEventListener('touchend',end);fab.addEventListener('pointerdown',start);window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);fab.onclick=()=>{if(!moved){panel.classList.add('open');fab.classList.add('hide');runAction(loadGame)}};
document.getElementById('xg-home').onclick=()=>{if(currentSave)renderHome();else runAction(showSlots)};document.getElementById('xg-person').onclick=()=>(currentSave?.qiSecret||currentSave?.qiMeditation)?mapUI.render():renderCharacter();
document.getElementById('xg-bag').onclick=()=>runAction(async()=>{if(!currentSave)return showSlots();if((currentSave?.qiSecret||currentSave?.qiMeditation))return mapUI.render();await game.refresh();featureUI.inventory()});
document.getElementById('xg-map').onclick=()=>{if(currentSave)mapUI.render();else runAction(showSlots)};
const collapse=()=>{featureUI.close();document.getElementById('xg-sect-sheet')?.classList.remove('open');panel.classList.remove('open');document.getElementById('xg-settings-sheet').classList.remove('open');document.getElementById('xg-slots').classList.remove('open');document.getElementById('xg-onboard').classList.remove('open');fab.classList.remove('hide')};document.getElementById('xg-head-moon').onclick=collapse;document.getElementById('xg-settings').onclick=()=>(currentSave?.qiSecret||currentSave?.qiMeditation)?mapUI.render():document.getElementById('xg-settings-sheet').classList.add('open');document.getElementById('xg-settings-close').onclick=()=>document.getElementById('xg-settings-sheet').classList.remove('open');document.getElementById('xg-slots-btn').onclick=()=>{document.getElementById('xg-settings-sheet').classList.remove('open');runAction(showSlots)};document.getElementById('xg-slots-close').onclick=()=>document.getElementById('xg-slots').classList.remove('open');document.getElementById('xg-save').onclick=()=>runAction(saveNow);document.getElementById('xg-update').onclick=()=>runAction(async()=>{await saveNow();location.reload()})}
setInterval(()=>{if(!currentSave||document.hidden||featureUI.isPlaying()||sectBusy||actionPending)return;runAction(async()=>{await game.refresh();if(!document.getElementById('xg-panel')?.classList.contains('open')||document.getElementById('xg-feature-sheet')||document.querySelector('#xg-panel>div.open'))return;const id=document.querySelector('#xg-panel nav button.on')?.id;const content=document.getElementById('xg-content'),top=content.scrollTop;if(id==='xg-home')renderHome();if(id==='xg-person')renderCharacter();content.scrollTop=top})},30000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
