import {ITEMS,SHOP_ITEMS} from '../data/items.js';
import {purchase,equipItem,ownsTechnique,claimLoot} from '../systems/inventory.js';
import {createSheet,escapeHTML,format,buttonTask} from './shared.js';
import {techniqueLibrary} from './techniques.js';
export function renderInventory(api){
 const save=api.getSave();if(!save)return;api.activate('bag');
 const content=document.getElementById('xg-content');
 content.innerHTML=`<section class="xg-feature xg-bag"><div class="xg-feature-row"><button type="button" data-shop>坊市商店</button><button type="button" data-market>黑市</button></div><div class="xg-bag-caption"><span>灵石 <b>${format(save.player.spiritStones)}</b></span><span>储物 ${save.inventory.length}/${save.bagCapacity}</span></div><div class="xg-bag-grid">${Array.from({length:Math.max(save.bagCapacity,save.inventory.length)},(_,i)=>{const entry=save.inventory[i],item=ITEMS[entry?.itemId];return entry?`<button type="button" data-item="${escapeHTML(entry.uid)}"><b>${escapeHTML(item?.glyph||'物')}</b><small>${escapeHTML(item?.name||entry.name||'旧物')}${entry.quantity>1?' ×'+entry.quantity:''}</small>${Object.values(save.equipment).includes(entry.uid)?'<em>已装备</em>':''}</button>`:'<div class="xg-bag-empty" aria-label="空储物格">·</div>'}).join('')}</div>${save.temporaryLoot?.length?`<div class="xg-temp-loot"><h3>临时储物 · 每批保留 30 分钟</h3>${save.temporaryLoot.map(entry=>`<button type="button" data-claim="${escapeHTML(entry.id)}">领取 ${escapeHTML(ITEMS[entry.itemId]?.name||'物品')} ×${entry.quantity} · 剩余 ${Math.max(0,Math.ceil((entry.expiresAt-Date.now())/60000))} 分钟</button>`).join('')}</div>`:''}<div class="xg-feature-row"><button type="button" data-library>功法典籍</button><button type="button" data-expand>扩充储物</button></div><p class="xg-feature-message" role="status"></p></section>`;
 const message=content.querySelector('[role=status]');
 content.querySelector('[data-shop]').onclick=()=>showShop(api);
 content.querySelector('[data-market]').onclick=()=>message.textContent='黑市尚未开放。';
 content.querySelector('[data-expand]').onclick=()=>message.textContent='扩容价格尚未确定，暂不扣除灵石。';
 content.querySelector('[data-library]').onclick=()=>techniqueLibrary(api,()=>{api.closeFeature();renderInventory(api)});
 content.querySelectorAll('[data-item]').forEach(button=>button.onclick=()=>showItem(api,button.dataset.item));
 content.querySelectorAll('[data-claim]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{await api.actions.mutate(s=>claimLoot(s,button.dataset.claim));renderInventory(api)},message));
}
function showShop(api){
 const sheet=createSheet('坊市商店',()=>{api.closeFeature();renderInventory(api)}),body=sheet.querySelector('[data-body]'),message=sheet.querySelector('[role=status]');
 const save=api.getSave();body.innerHTML=`<p>随身灵石：<b>${format(save.player.spiritStones)}</b></p>${SHOP_ITEMS.map(id=>{const item=ITEMS[id],owned=item.kind==='manual'&&ownsTechnique(save,item.methodId);return `<article class="xg-feature-card"><h3>${item.name}<small>${item.price} 灵石</small></h3><p>${item.description}</p><button type="button" data-buy="${id}" ${owned?'disabled':''}>${owned?'已拥有':'购买'}</button></article>`}).join('')}`;
 body.querySelectorAll('[data-buy]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{await api.actions.mutate(s=>purchase(s,button.dataset.buy),{message:result=>result});if(!sheet.isConnected)return;showShop(api);document.querySelector('#xg-feature-sheet [role=status]').textContent='已收入储物格。'},message));
}
function showItem(api,uid){
 const save=api.getSave(),entry=save.inventory.find(e=>e.uid===uid),item=ITEMS[entry?.itemId];if(!entry)return;
 const back=()=>{api.closeFeature();renderInventory(api)},sheet=createSheet(item?.name||entry.name||'旧物',back),body=sheet.querySelector('[data-body]'),message=sheet.querySelector('[role=status]');
 body.innerHTML=`<p>${escapeHTML(item?.description||'这件旧物已保留，暂不可使用。')}</p>${item?.kind==='equipment'?`<p>耐久 ${format(entry.durability)} / 20${entry.durability<=0?' · 已损坏，暂不能生效':''}</p>`:''}${item?.kind==='manual'?'<button type="button" data-use>阅读典籍</button>':item?.kind==='equipment'?`<button type="button" data-use>${Object.values(save.equipment).includes(uid)?'卸下装备':'装备'}</button>`:''}`;
 const button=body.querySelector('[data-use]');if(button)button.onclick=()=>buttonTask(button,async()=>{if(item.kind==='manual'){techniqueLibrary(api,back);return}await api.actions.mutate(s=>equipItem(s,uid));if(sheet.isConnected)back()},message);
}
