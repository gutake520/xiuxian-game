import {isGoldenRealm} from '../systems/golden-core.js';
import {realmProgress} from '../data/realms.js';
import {ITEMS,SHOP_ITEMS} from '../data/items.js';
import {itemStageAllowed,setItemLocked,expandStorageBag,saleUnitPrice,sellInventoryBatch,sellExtra,discardJunk,purchase,equipItem,ownsTechnique,claimLoot,sellEquipment,discardEquipment,usePill,equipmentSalePrice,maxDurability,sellMaterial,materialSalePrice,sellPill,pillSalePrice} from '../systems/inventory.js';
import {createSheet,escapeHTML,format,buttonTask} from './shared.js';
import {techniqueLibrary} from './techniques.js';
export function renderInventory(api,selection=null){
 const save=api.getSave();if(!save)return;api.activate('bag');
 const content=document.getElementById('xg-content');
 if(selection&&selection.slot!==save.slot)selection=null;
 const selected=selection?.items;
 if(selected)for(const [uid,quantity] of selected){const entry=save.inventory.find(e=>e.uid===uid);if(saleUnitPrice(save,entry)===null||quantity>(entry.quantity||1))selected.delete(uid)}
 content.innerHTML=`<section class="xg-feature xg-bag"><div class="xg-section-heading"><div><small class="xg-eyebrow">行囊 · 随身之物</small><h2>方寸乾坤</h2></div></div><div class="xg-bag-caption"><span>灵石 <b>${format(save.player.spiritStones)}</b></span><span>储物 ${save.inventory.length}/${save.bagCapacity}</span></div><div class="xg-bag-grid">${Array.from({length:Math.max(save.bagCapacity,save.inventory.length)},(_,i)=>{const entry=save.inventory[i],item=ITEMS[entry?.itemId];return entry?`<button type="button" data-item="${escapeHTML(entry.uid)}" ${selected?`aria-pressed="${selected.has(entry.uid)}" ${saleUnitPrice(save,entry)===null?'disabled':''}`:''}><b>${escapeHTML(item?.glyph||'物')}</b><small>${escapeHTML(item?.name||entry.name||'旧物')}${entry.quantity>1?' ×'+entry.quantity:''}${['crafted-binding-array','foundation-crafted-array'].includes(entry.itemId)?(entry.usesLeft>0?' · '+entry.usesLeft+'/6':' · 损坏'):''}</small>${entry.locked?'<em class="xg-item-locked">已上锁</em>':''}${Object.values(save.equipment).includes(entry.uid)?'<em>已装备</em>':''}</button>`:'<div class="xg-bag-empty" aria-label="空储物格">·</div>'}).join('')}</div>${save.temporaryLoot?.length?`<div class="xg-temp-loot"><h3>临时储物 · 每批保留 30 分钟</h3>${save.temporaryLoot.map(entry=>`<button type="button" data-claim="${escapeHTML(entry.id)}">领取 ${escapeHTML(ITEMS[entry.itemId]?.name||'物品')} ×${entry.quantity} · 剩余 ${Math.max(0,Math.ceil((entry.expiresAt-Date.now())/60000))} 分钟</button>`).join('')}</div>`:''}<div class="xg-feature-row">${selected?`<button type="button" data-select-all>全选可售</button><button type="button" data-sell-selected ${selected.size?'':'disabled'}>出售所选 · ${selected.size} 组 · ${format([...selected].reduce((sum,[uid,quantity])=>sum+saleUnitPrice(save,save.inventory.find(e=>e.uid===uid))*quantity,0))} 灵石</button><button type="button" data-cancel-sale>取消</button>`:'<button type="button" data-batch-sale>多选出售</button><button type="button" data-expand>扩充储物</button>'}</div><p class="xg-feature-message" role="status"></p></section>`;
 const message=content.querySelector('[role=status]');
 const expand=content.querySelector('[data-expand]');
 if(expand){
  expand.textContent=save.bagExpanded?'后续扩充待开放':'扩充 10 格 · 50 灵石';
  expand.disabled=Boolean(save.bagExpanded);
  expand.addEventListener('click',()=>buttonTask(expand,async()=>{
   const {result}=await api.actions.mutate(expandStorageBag,{slot:save.slot,message:r=>r});
   if(expand.isConnected&&api.getSave()?.slot===save.slot){renderInventory(api);content.querySelector('[role=status]').textContent=result}
  },message));
 }
 content.querySelector('[data-batch-sale]')?.addEventListener('click',()=>renderInventory(api,{slot:save.slot,items:new Map()}));
 content.querySelector('[data-cancel-sale]')?.addEventListener('click',()=>renderInventory(api));
 content.querySelector('[data-select-all]')?.addEventListener('click',()=>{for(const entry of save.inventory)if(saleUnitPrice(save,entry)!==null)selected.set(entry.uid,ITEMS[entry.itemId].kind==='equipment'?1:entry.quantity||1);renderInventory(api,selection)});
 content.querySelector('[data-sell-selected]')?.addEventListener('click',async()=>{
  const panel=content.querySelector('.xg-bag'),controls=[...panel.querySelectorAll('button')],disabled=controls.map(button=>button.disabled);
  controls.forEach(button=>button.disabled=true);
  const entries=[...selected].map(([uid,quantity])=>({uid,quantity}));
  try{const {result}=await api.actions.mutate(s=>sellInventoryBatch(s,entries),{slot:save.slot,message:r=>r});if(panel.isConnected&&api.getSave()?.slot===save.slot){renderInventory(api);content.querySelector('[role=status]').textContent=result}}
  catch(error){if(panel.isConnected){message.textContent=error.message;controls.forEach((button,i)=>button.disabled=disabled[i])}}
 });
 content.querySelectorAll('[data-item]').forEach(button=>button.onclick=()=>{if(button.disabled)return;if(!selected)return showItem(api,button.dataset.item);const uid=button.dataset.item,entry=save.inventory.find(e=>e.uid===uid);if(selected.has(uid))selected.delete(uid);else if(saleUnitPrice(save,entry)!==null)selected.set(uid,ITEMS[entry.itemId].kind==='equipment'?1:entry.quantity||1);renderInventory(api,selection)});
 content.querySelectorAll('[data-claim]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{await api.actions.mutate(s=>claimLoot(s,button.dataset.claim));renderInventory(api)},message));
}
export function showShop(api,gearOnly=false,onClose=()=>{api.closeFeature();renderInventory(api)}){
 const sheet=createSheet(gearOnly?'购买装备':'坊市商店',onClose),body=sheet.querySelector('[data-body]');
 const save=api.getSave();body.innerHTML=`<p>随身灵石：<b data-shop-stones>${format(save.player.spiritStones)}</b></p>${SHOP_ITEMS.filter(id=>(!gearOnly||ITEMS[id].kind==='equipment')&&(!ITEMS[id].minFoundationLevel||isGoldenRealm(save.player)||realmProgress(save.player).index-9>=ITEMS[id].minFoundationLevel)&&itemStageAllowed(save.player,ITEMS[id])).map(id=>{const item=ITEMS[id],owned=item.kind==='manual'&&!item.repeatable&&ownsTechnique(save,item.methodId);return `<article class="xg-feature-card"><h3>${item.name}<small>${item.price} 灵石</small></h3><p>${item.description}</p><button type="button" data-buy="${id}" ${owned?'disabled':''}>${owned?'已拥有':'购买'}</button><p class="xg-feature-message" data-purchase-status role="status" aria-live="polite"></p></article>`}).join('')}`;
 body.querySelectorAll('[data-buy]').forEach(button=>button.onclick=async()=>{
  if(button.disabled)return;
  const id=button.dataset.buy,item=ITEMS[id],status=button.parentElement.querySelector('[data-purchase-status]');
  button.disabled=true;status.textContent='';
  try{
   await api.actions.mutate(s=>purchase(s,id),{message:result=>result});
   if(!sheet.isConnected)return;
   body.querySelector('[data-shop-stones]').textContent=format(api.getSave().player.spiritStones);
   status.textContent=`购买成功：${item.name}已收入储物格。`;
  }catch(error){if(sheet.isConnected)status.textContent=error.message}
  finally{
   if(sheet.isConnected){const owned=item.kind==='manual'&&!item.repeatable&&ownsTechnique(api.getSave(),item.methodId);button.disabled=owned;button.textContent=owned?'已拥有':'购买'}
  }
 });
}
export function showSell(api,onClose=()=>{api.closeFeature();renderInventory(api)}){
 const sheet=createSheet('出售物品',onClose),body=sheet.querySelector('[data-body]'),message=sheet.querySelector('[role=status]');
 const save=api.getSave(),entries=save.inventory.filter(entry=>!entry.locked&&!Object.values(save.equipment||{}).includes(entry.uid));
 const gear=entries.filter(entry=>ITEMS[entry.itemId]?.kind==='equipment');
 const materials=entries.filter(entry=>ITEMS[entry.itemId]?.kind==='material');
 const pills=entries.filter(entry=>ITEMS[entry.itemId]?.kind==='pill');
 const extras=entries.filter(entry=>['gift','manual'].includes(ITEMS[entry.itemId]?.kind)&&Number.isFinite(ITEMS[entry.itemId]?.sellPrice));
 body.innerHTML=(gear.length?gear.map(entry=>{const item=ITEMS[entry.itemId],full=entry.durability===maxDurability(entry);return `<article class="xg-feature-card xg-sell-card"><h3>${escapeHTML(item.name)}<small>耐久 ${format(entry.durability)} / ${maxDurability(entry)}</small></h3>${full?'':'<p>耐久未满，无法出售。</p>'}${full?`<button type="button" data-sale="${escapeHTML(entry.uid)}">出售 · ${format(equipmentSalePrice(item))} 灵石</button>`:''}<button type="button" data-discard="${escapeHTML(entry.uid)}">丢弃</button></article>`}).join(''):'')+materials.map(entry=>`<article class="xg-feature-card xg-sell-card"><h3>${escapeHTML(ITEMS[entry.itemId].name)}<small>持有 ${entry.quantity}</small></h3><button type="button" data-material="${escapeHTML(entry.uid)}">出售一份 · ${format(materialSalePrice(ITEMS[entry.itemId]))} 灵石</button><button type="button" data-material-all="${escapeHTML(entry.uid)}">全部出售 · ${format(entry.quantity*materialSalePrice(ITEMS[entry.itemId]))} 灵石</button></article>`).join('')+pills.map(entry=>`<article class="xg-feature-card xg-sell-card"><h3>${escapeHTML(ITEMS[entry.itemId].name)}<small>持有 ${entry.quantity||1}</small></h3><button type="button" data-pill="${escapeHTML(entry.uid)}">出售一枚 · ${format(pillSalePrice(ITEMS[entry.itemId]))} 灵石</button><button type="button" data-pill-all="${escapeHTML(entry.uid)}">全部出售 · ${format((entry.quantity||1)*pillSalePrice(ITEMS[entry.itemId]))} 灵石</button></article>`).join('')+extras.map(entry=>`<article class="xg-feature-card xg-sell-card"><h3>${escapeHTML(ITEMS[entry.itemId].name)}<small>持有 ${entry.quantity||1}</small></h3><button type="button" data-extra="${escapeHTML(entry.uid)}">出售一份 · ${format(ITEMS[entry.itemId].sellPrice)} 灵石</button></article>`).join('')||'<p>暂无可以出售的物品。</p>';
 body.querySelectorAll('[data-extra]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{await api.actions.mutate(s=>sellExtra(s,button.dataset.extra),{message:result=>result});if(sheet.isConnected)showSell(api,onClose)},message));
 body.querySelectorAll('[data-sale]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{await api.actions.mutate(s=>sellEquipment(s,button.dataset.sale),{message:result=>result});if(sheet.isConnected)showSell(api,onClose)},message));
 body.querySelectorAll('[data-discard]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{if(!confirm('丢弃这件装备？丢弃后无法找回。'))return;await api.actions.mutate(s=>discardEquipment(s,button.dataset.discard));if(sheet.isConnected)showSell(api,onClose)},message));
 body.querySelectorAll('[data-material],[data-material-all]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{const uid=button.dataset.material||button.dataset.materialAll,all=button.hasAttribute('data-material-all');await api.actions.mutate(s=>sellMaterial(s,uid,all?s.inventory.find(e=>e.uid===uid)?.quantity:1),{message:result=>result});if(sheet.isConnected)showSell(api,onClose)},message));
 body.querySelectorAll('[data-pill],[data-pill-all]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{const uid=button.dataset.pill||button.dataset.pillAll,all=button.hasAttribute('data-pill-all');await api.actions.mutate(s=>sellPill(s,uid,all?(s.inventory.find(e=>e.uid===uid)?.quantity||1):1),{message:result=>result});if(sheet.isConnected)showSell(api,onClose)},message));
}
function showItem(api,uid){
 const save=api.getSave(),entry=save.inventory.find(e=>e.uid===uid),item=ITEMS[entry?.itemId];if(!entry)return;
 const back=()=>{api.closeFeature();renderInventory(api)},sheet=createSheet(item?.name||entry.name||'旧物',back),body=sheet.querySelector('[data-body]'),message=sheet.querySelector('[role=status]');
 const stackPrice=item?.kind==='material'?materialSalePrice(item):item?.kind==='pill'?pillSalePrice(item):item?.sellPrice||0;
 const stackActions=!entry.locked&&stackPrice?`<button type="button" data-stack-sale>出售一份 · ${format(stackPrice)} 灵石</button>${(entry.quantity||1)>1?`<button type="button" data-stack-all>全部出售 · ${format((entry.quantity||1)*stackPrice)} 灵石</button>`:''}`:'';
 body.innerHTML=`<p>${escapeHTML(item?.description||'这件旧物已保留，暂不可使用。')}</p>${item?.kind==='equipment'?`<p>耐久 ${format(entry.durability)} / ${maxDurability(entry)}${entry.durability<=0?' · 已损坏，暂不能生效':''}</p>`:''}${['crafted-binding-array','foundation-crafted-array'].includes(entry.itemId)?`<p>${entry.usesLeft>0?`剩余 ${entry.usesLeft} / 6 次`:'损坏 · 无法在战斗中使用'}</p>`:''}${item?.kind==='manual'?'<button type="button" data-use>阅读典籍</button>':item?.kind==='pill'?'<button type="button" data-use>服用</button>':item?.kind==='equipment'?`<button type="button" data-use>${Object.values(save.equipment).includes(uid)?'卸下装备':'装备'}</button>${saleUnitPrice(save,entry)!==null?`<button type="button" data-sale>出售 · ${format(equipmentSalePrice(item))} 灵石</button>`:''}${!entry.locked?'<button type="button" data-discard>丢弃</button>':''}`:''}${stackActions}${!entry.locked&&(item?.kind==='junk'||['crafted-binding-array','foundation-crafted-array'].includes(entry.itemId)&&entry.usesLeft===0)?'<button type="button" data-junk-discard>丢弃</button>':''}`;
 body.insertAdjacentHTML('afterbegin',item?.storyOnly?'<p class="xg-item-lock-row">剧情物品 · 自动上锁，仅在对应剧情中消耗。</p>':`<div class="xg-item-lock-row"><button type="button" data-item-lock aria-pressed="${!!entry.locked}">${entry.locked?'已上锁 · 点击解锁':'给此物品上锁'}</button><small>防止出售、丢弃和赠礼；仍可正常使用。堆叠物品整格上锁。</small></div>`);
 if(body.querySelector('[data-item-lock]'))body.querySelector('[data-item-lock]').onclick=e=>buttonTask(e.currentTarget,async()=>{
  if(!sheet.isConnected||api.getSave()?.slot!==save.slot)return;
  const {result}=await api.actions.mutate(s=>setItemLocked(s,uid,!entry.locked),{slot:save.slot,message:r=>r});
  if(sheet.isConnected&&api.getSave()?.slot===save.slot){renderInventory(api);showItem(api,uid);document.querySelector('#xg-feature-sheet [role=status]').textContent=result}
 },message);
 body.querySelector('[data-junk-discard]')?.addEventListener('click',e=>buttonTask(e.currentTarget,async()=>{await api.actions.mutate(s=>discardJunk(s,uid));if(sheet.isConnected)back()},message));
 const button=body.querySelector('[data-use]');if(button)button.onclick=()=>buttonTask(button,async()=>{if(item.kind==='manual'){techniqueLibrary(api,back);return}if(item.kind==='pill')await api.actions.mutate(s=>usePill(s,uid),{message:result=>result});else await api.actions.mutate(s=>equipItem(s,uid));if(sheet.isConnected)back()},message);
 body.querySelectorAll('[data-stack-sale],[data-stack-all]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{
  const all=button.hasAttribute('data-stack-all'),quantity=all?(api.getSave().inventory.find(e=>e.uid===uid)?.quantity||1):1;
  const {result}=await api.actions.mutate(s=>item.kind==='material'?sellMaterial(s,uid,quantity):item.kind==='pill'?sellPill(s,uid,quantity):sellExtra(s,uid,quantity),{message:result=>result});
  if(sheet.isConnected){back();document.querySelector('#xg-content [role=status]').textContent=result}
 },message));
 body.querySelector('[data-sale]')?.addEventListener('click',e=>buttonTask(e.currentTarget,async()=>{const {result}=await api.actions.mutate(s=>sellEquipment(s,uid),{message:result=>result});if(sheet.isConnected){back();document.querySelector('#xg-content [role=status]').textContent=result}},message));
 body.querySelector('[data-discard]')?.addEventListener('click',e=>buttonTask(e.currentTarget,async()=>{if(!confirm('丢弃这件装备？丢弃后无法找回。'))return;await api.actions.mutate(s=>discardEquipment(s,uid));if(sheet.isConnected)back()},message));
}
