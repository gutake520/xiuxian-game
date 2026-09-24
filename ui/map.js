import {showBlackMarket} from './black-market.js';
import {hasActiveTechnique} from '../data/techniques.js';
import {VISITING_SECTS,QI_MONSTERS,QI_PEAKS} from '../data/locations.js';
import {realmProgress} from '../data/realms.js';
import {showBattle} from './combat.js';
import {ITEMS,SECT_PILLS,SECT_TALISMANS} from '../data/items.js';
import {purchase} from '../systems/inventory.js';
import {showShop,showSell} from './inventory.js';
import {startQiExploration,QI_EXPLORATION_MS,QI_SCENES} from '../systems/exploration.js';
import {localDay} from '../systems/cultivation.js';
import {equipmentStats} from '../systems/inventory.js';
import {repairPrice,repairEquipment,healAtSect,startMeditation,HEAL_PRICE,MEDITATION_PRICE,MEDITATION_MS} from '../systems/sect-services.js';
import {escapeHTML,format} from './shared.js';

export function createMapUI({getSave,activate,actions}){
 const content=()=>document.getElementById('xg-content');
 const battle=outcome=>showBattle({getSave,activate,actions,onExit:renderMonsters},outcome);
 function heading(title,subtitle){return `<div class="xg-map-heading"><h2>${title}</h2><p>${subtitle}</p></div>`}
 const peaks=(locations,kind)=>`<div class="xg-map-landscape xg-map-${kind}">${locations.map((place,i)=>`<button type="button" class="xg-map-hill${place.locked?' xg-map-locked':''}" style="--hill-x:${place.x}%;--hill-y:${place.y}%;--hill-size:${place.size||1}" ${place.locked?'disabled':''} ${place.id?`data-${kind}="${place.id}"`:''}><span class="xg-map-label">${place.name}</span><span class="xg-map-summit" aria-hidden="true"></span></button>`).join('')}</div>`;
 function render(){
  if(!getSave())return;
  if(getSave().battle)return battle();
  if(getSave().qiSecret)return renderSecret();
  if(getSave().qiMeditation)return renderMeditation();
  activate('map');
  content().innerHTML=`<section class="xg-map-sheet">${heading('山河图','点一座山，走一段路。')}${peaks([
   {name:'坊市',id:'market',x:12,y:6,size:.8},{name:'黑市',id:'blackmarket',x:68,y:17,size:.76},
   {name:'远山 · 待定',x:36,y:37,locked:true,size:.85},{name:'九宗山门',id:'sects',x:8,y:69,size:1.08},
   {name:'丰原镇',id:'monsters',x:64,y:62,size:1.04}
  ],'map')}</section>`;
  content().querySelector('[data-map="sects"]').onclick=renderSects;
  content().querySelector('[data-map="monsters"]').onclick=renderMonsters;
  content().querySelector('[data-map="market"]').onclick=renderMarket;
  content().querySelector('[data-map="blackmarket"]').onclick=renderBlackMarket;
 }
 function back(fn){content().querySelector('.xg-map-back').onclick=fn}
 function renderMarket(){
  activate('map');
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回地图</button>${heading('坊市','买卖货物，整顿行囊。')}
   <div class="xg-map-place xg-map-scene"><span class="xg-map-peak" aria-hidden="true"></span><strong>坊市商贩</strong><p>铁剑、布衣与通用典籍都在这里出售，也收购装备和材料。</p></div>
   <div class="xg-feature-row xg-map-trade-actions"><button type="button" data-market-shop>购买商品</button><button type="button" data-market-gear>只看装备</button><button type="button" data-market-sell>出售物品</button></div></section>`;
  back(render);
  const api={getSave,actions,closeFeature:()=>document.getElementById('xg-feature-sheet')?.remove()};
  const close=()=>{api.closeFeature();renderMarket()};
  content().querySelector('[data-market-shop]').onclick=()=>showShop(api,false,close);
  content().querySelector('[data-market-gear]').onclick=()=>showShop(api,true,close);
  content().querySelector('[data-market-sell]').onclick=()=>showSell(api,close);
 }
 function renderBlackMarket(){showBlackMarket({getSave,actions,activate},render)}
 function renderSects(){
  activate('map');
  const spots=[[3,3],[58,5],[30,18],[70,30],[8,36],[42,49],[2,65],[63,67],[28,78]];
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回地图</button>${heading('九宗山门','拜访各宗；本宗内部事务在人物页。')}
   ${peaks(VISITING_SECTS.map((sect,i)=>({name:sect.name,id:sect.id,x:spots[i][0],y:spots[i][1],size:.79})), 'visit')}</section>`;
  back(render);
  content().querySelectorAll('[data-visit]').forEach(button=>button.onclick=()=>renderVisit(button.dataset.visit));
 }
 function renderVisit(id){
  if(getSave()?.qiMeditation)return renderMeditation();
  const sect=VISITING_SECTS.find(item=>item.id===id);if(!sect)return renderSects();
  const own=getSave()?.player?.sect===sect.name;
  const gear=getSave().inventory.filter(entry=>ITEMS[entry.itemId]?.kind==='equipment'&&repairPrice(entry)>0);
  const damaged=getSave().player.hp<equipmentStats(getSave()).maxHp;
  const serviceActions=id==='tiangong'?(own?'<small class="xg-map-pending">你是天工阁弟子，匠师不会替你修补。</small>':gear.length?gear.map(entry=>`<button type="button" data-repair="${escapeHTML(entry.uid)}">修补 ${escapeHTML(ITEMS[entry.itemId].name)} · ${format(entry.durability)} / 20 · ${format(repairPrice(entry))} 灵石</button>`).join(''):'<small class="xg-map-pending">没有需要修补的装备。</small>'):id==='qinglan'?`<button type="button" data-heal ${damaged?'':'disabled'}>立即疗伤 · ${HEAL_PRICE} 灵石${damaged?'':'（生命已满）'}</button>`:id==='zhenyue'?`<button type="button" data-meditate ${damaged?'':'disabled'}>进入静室 · ${MEDITATION_PRICE} 灵石${damaged?'':'（生命已满）'}</button>`:'';
  activate('map');
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回九宗</button>${heading(sect.name,sect.service)}
   <div class="xg-map-place xg-map-scene"><span class="xg-map-peak" aria-hidden="true"></span><strong>${sect.npc}</strong><p>${sect.id==='tiangong'&&own?'“你也是天工阁的人？自己的装备，自己去修。”':`“来者是客，欢迎到${sect.name}坐坐。”`}</p></div>
   <div class="xg-card"><h3>${sect.service}</h3><p>${sect.detail}</p>${serviceActions}${(id==='danxia'?SECT_PILLS:id==='taixu'?SECT_TALISMANS:id==='xuanji'?['binding-array']:[]).map(itemId=>`<button type="button" data-sect-buy="${itemId}">购买${ITEMS[itemId].name} · ${ITEMS[itemId].price} 灵石</button>`).join('')}${id==='wanling'?`<button type="button" data-rent>租借灵兽 · 1 灵石（已有 ${getSave().petRentals||0} 份）</button>`:''}${['danxia','taixu','xuanji','wanling','tiangong','qinglan','zhenyue'].includes(id)?'':'<small class="xg-map-pending">具体效果或费用待定，暂不扣除灵石。</small>'}</div><p role="status" aria-live="polite"></p>
  </section>`;
  back(renderSects);
  const status=content().querySelector('[role=status]');
  content().querySelectorAll('[data-repair]').forEach(button=>button.onclick=async()=>{
   button.disabled=true;
   try{const {result}=await actions.mutate(s=>repairEquipment(s,button.dataset.repair),{message:result=>result});renderVisit(id);content().querySelector('[role=status]').textContent=result}
   catch(error){status.textContent=error.message;button.disabled=false}
  });
  const heal=content().querySelector('[data-heal]');if(heal)heal.onclick=async()=>{
   heal.disabled=true;
   try{const {result}=await actions.mutate(s=>healAtSect(s),{message:result=>result});renderVisit(id);content().querySelector('[role=status]').textContent=result}
   catch(error){status.textContent=error.message;heal.disabled=false}
  };
  const meditate=content().querySelector('[data-meditate]');if(meditate)meditate.onclick=async()=>{
   meditate.disabled=true;
   try{await actions.mutate(s=>startMeditation(s),{message:result=>result});renderMeditation()}
   catch(error){status.textContent=error.message;meditate.disabled=false}
  };
  content().querySelectorAll('[data-sect-buy]').forEach(button=>button.onclick=async()=>{
   button.disabled=true;
   try{await actions.mutate(s=>purchase(s,button.dataset.sectBuy),{message:result=>result});status.textContent='物品已收入储物。'}
   catch(error){status.textContent=error.message}finally{if(button.isConnected)button.disabled=false}
  });
  const rent=content().querySelector('[data-rent]');if(rent)rent.onclick=async()=>{
   rent.disabled=true;
   try{await actions.mutate(s=>{if(s.player.spiritStones<1)throw new Error('灵石不足。');s.player.spiritStones=Math.round((s.player.spiritStones-1)*100)/100;s.petRentals=(s.petRentals||0)+1;return '租下一次灵兽出战。'},{message:result=>result});renderVisit(id)}
   catch(error){status.textContent=error.message;rent.disabled=false}
  };
 }
 function renderMeditation(){
  activate('map');
  const pending=getSave().qiMeditation;
  if(!pending)return renderVisit('zhenyue');
  content().innerHTML=`<section class="xg-map-sheet"><div class="xg-card xg-secret-wait"><h3>镇岳宗 · 静室</h3><p>你盘膝静坐，缓缓调匀气息。三分钟结束后恢复至多 12 点生命。</p><div class="xg-progress"><i data-meditation-progress></i></div><strong data-meditation-clock>03:00</strong><p>静坐期间无法进行其他游戏操作。关闭面板后，进度仍会保留。</p><button type="button" data-finish-meditation hidden>结束静坐</button></div><p role="status" aria-live="polite"></p></section>`;
  const slot=getSave().slot,clock=content().querySelector('[data-meditation-clock]'),progress=content().querySelector('[data-meditation-progress]'),status=content().querySelector('[role=status]'),button=content().querySelector('[data-finish-meditation]');
  let finishing=false,failed=false;
  const finish=async()=>{if(finishing||!getSave()?.qiMeditation)return;finishing=true;button.disabled=true;try{const {result}=await actions.finishMeditation();clearInterval(timer);renderVisit('zhenyue');content().querySelector('[role=status]').textContent=result}catch(error){failed=true;status.textContent=error.message;button.hidden=false;button.disabled=false;finishing=false}};
  button.onclick=finish;
  const tick=()=>{
   if(!clock.isConnected||getSave()?.slot!==slot){clearInterval(timer);return}
   const elapsed=Math.max(0,Date.now()-pending.startedAt),remaining=Math.max(0,Math.ceil((pending.endsAt-Date.now())/1000));
   clock.textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
   progress.style.width=`${Math.min(100,elapsed/MEDITATION_MS*100)}%`;
   if(!remaining&&!failed)finish();
   if(!remaining&&failed)button.hidden=false;
  };
  const timer=setInterval(tick,1000);tick();
 }
 function renderMonsters(){
  activate('map');
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回地图</button>${heading('丰原镇','妖影、故人和秘境，都藏在山中。')}
   ${peaks(QI_PEAKS, 'encounter')}</section>`;
  content().querySelectorAll('[data-encounter]').forEach(button=>button.onclick=()=>renderEncounter(button.dataset.encounter));
  back(render);
 }
 function renderEncounter(id){
  if(getSave().battle)return battle();
  const peak=QI_PEAKS.find(item=>item.id===id);if(!peak)return renderMonsters();
  if(peak.kind==='npc')return renderNpc(peak);
  if(peak.kind==='secret')return renderSecret();
  const tier=realmProgress(getSave().player).index;
  const monsters=QI_MONSTERS.filter(item=>item.id===peak.monsterId||item.id===peak.monsterId+'-mid');if(!monsters.length)return renderMonsters();
  activate('map');
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回丰原镇</button>${heading(peak.name,'选择挑战的小妖 · 已解锁的对手始终保留')}
   ${getSave().petRentals>0||getSave().spiritBeast&&hasActiveTechnique(getSave(),'beast-keeper')?`<fieldset class="xg-card"><legend>灵兽出战（${getSave().spiritBeast&&hasActiveTechnique(getSave(),'beast-keeper')?'自养灵兽 · 无需租约':'租约余 '+getSave().petRentals+' 次'}）</legend><label><input type="radio" name="xg-pet" value="" checked> 不出战</label><label><input type="radio" name="xg-pet" value="attack"> 追击：每次 +0.50 伤害</label><label><input type="radio" name="xg-pet" value="guard"> 守护：每次挡 0.30 伤害</label></fieldset>`:''}
   ${monsters.map(monster=>`<div class="xg-card xg-map-monster"><h3>${monster.name}</h3><p>生命 ${monster.hp} · 攻击 ${monster.attack} · 速度 ${monster.speed}</p><small>主要掉落：${monster.drop}</small><button type="button" data-foe="${monster.id}" data-min-tier="${monster.minTier??0}" ${tier<(monster.minTier??0)?'disabled':''}>${tier<(monster.minTier??0)?'炼气四层解锁':'迎战'}</button></div>`).join('')}
   <p class="xg-map-pending">胜利可获修为和战利品；退出战斗须支付代价。</p><p role="status" aria-live="polite"></p></section>`;
  back(renderMonsters);
  const status=content().querySelector('[role=status]');
  content().querySelectorAll('[data-foe]').forEach(button=>button.onclick=async()=>{
   content().querySelectorAll('[data-foe]').forEach(item=>item.disabled=true);
   try{const pet=content().querySelector('[name="xg-pet"]:checked')?.value||null;await actions.startBattle(button.dataset.foe,pet);battle()}
   catch(error){status.textContent=error.message;content().querySelectorAll('[data-foe]').forEach(item=>item.disabled=realmProgress(getSave().player).index<Number(item.dataset.minTier))}
 });
 }
 function renderNpc(peak){
  activate('map');const met=!!getSave().flags?.metQiNpcs?.[peak.id];
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回丰原镇</button>${heading(peak.name,'山中来客')}
   <div class="xg-map-place xg-map-scene"><span class="xg-map-peak" aria-hidden="true"></span><strong>${peak.npc}</strong><p>${peak.description}</p></div>
   <div class="xg-card xg-map-monster"><p>${met?'对方已经记得你。':'你们尚未正式结识。'}</p><button type="button" data-meet>${met?'交谈':'上前结识'}</button><small>赠礼、好感与结缘方式待后续设定。</small></div><p role="status" aria-live="polite"></p></section>`;
  back(renderMonsters);const button=content().querySelector('[data-meet]'),status=content().querySelector('[role=status]');
  button.onclick=async()=>{
   if(met){status.textContent=`${peak.npc}与你聊了几句，稍后再来。`;return}
   button.disabled=true;
   try{await actions.mutate(save=>{save.flags??={};save.flags.metQiNpcs??={};save.flags.metQiNpcs[peak.id]=true},{message:`在${peak.name}结识了${peak.npc}。`});renderNpc(peak)}
   catch(error){status.textContent=error.message;button.disabled=false}
  };
 }
 function renderSecret(){
  activate('map');
  const save=getSave(),pending=save.qiSecret,visited=save.qiSecretDay===localDay(Date.now());
  content().innerHTML=`<section class="xg-map-sheet">${pending?'':'<button class="xg-map-back" type="button">← 返回丰原镇</button>'}${heading('星落秘境',pending?'探索中 · 请在此等候三分钟':'每天可探索一次 · 门票 1 灵石')}
   ${pending?`<div class="xg-card xg-secret-wait"><h3>秘境深处</h3><p data-secret-scene></p><div class="xg-progress"><i data-secret-progress></i></div><strong data-secret-clock>03:00</strong><p>探索中无法进行其他游戏操作。关闭面板后，进度仍会保留。</p><button type="button" data-finish hidden>领取探索所得</button></div>`:`<div class="xg-card xg-map-monster"><p>探索秘境有机会获得灵石、矿石和药草，偶尔还会有额外收获。</p><button type="button" data-explore ${visited?'disabled':''}>${visited?'今日已探索':'探索秘境'}</button></div>${visited&&save.lastQiExploration?.result?`<div class="xg-card"><p>${save.lastQiExploration.result}</p></div>`:''}`}
   <p role="status" aria-live="polite"></p></section>`;
  if(!pending){
   back(renderMonsters);const button=content().querySelector('[data-explore]'),status=content().querySelector('[role=status]');
   button.onclick=async()=>{button.disabled=true;try{await actions.mutate(s=>startQiExploration(s),{message:result=>result});renderSecret()}catch(error){status.textContent=error.message;button.disabled=false}};
   return;
  }
  const slot=save.slot,scene=content().querySelector('[data-secret-scene]'),clock=content().querySelector('[data-secret-clock]'),progress=content().querySelector('[data-secret-progress]'),status=content().querySelector('[role=status]'),finishButton=content().querySelector('[data-finish]');
  let finishing=false,failed=false;
  const finish=async()=>{if(finishing||!getSave()?.qiSecret)return;finishing=true;finishButton.disabled=true;try{await actions.finishExploration();clearInterval(timer);renderSecret()}catch(error){failed=true;status.textContent=error.message;finishButton.hidden=false;finishButton.disabled=false;finishing=false}};
  finishButton.onclick=finish;
  const tick=()=>{
   if(!scene.isConnected||getSave()?.slot!==slot){clearInterval(timer);return}
   const elapsed=Math.max(0,Date.now()-pending.startedAt),remaining=Math.max(0,Math.ceil((pending.endsAt-Date.now())/1000)),index=Math.min(2,Math.floor(elapsed/60000));
   scene.textContent=QI_SCENES[pending.scenes[index]]||'你继续在秘境中前行。';
   clock.textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
   progress.style.width=`${Math.min(100,elapsed/QI_EXPLORATION_MS*100)}%`;
   if(!remaining&&!failed)finish();
   if(!remaining&&failed)finishButton.hidden=false;
  };
  const timer=setInterval(tick,1000);tick();
 }
 return {render};
}
