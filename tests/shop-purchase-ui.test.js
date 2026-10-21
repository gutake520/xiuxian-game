import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {showShop} from '../ui/inventory.js';

test('purchase keeps the shop and scroll position, updates balance, and reports beside the item',async t=>{
 const old=globalThis.document;
 const {document}=parseHTML('<section id="xg-panel"></section>');globalThis.document=document;
 t.after(()=>{if(old===undefined)delete globalThis.document;else globalThis.document=old});
 const s={player:{realm:'筑基一层',spiritStones:100},inventory:[],equipment:{},bagCapacity:20,techniques:{mastered:[]}};
 let calls=0,release;
 const api={getSave:()=>s,actions:{mutate:async fn=>{calls++;await new Promise(resolve=>release=resolve);return {result:fn(s)}}}};
 showShop(api);
 const sheet=document.getElementById('xg-feature-sheet');sheet.scrollTop=450;
 const button=sheet.querySelector('[data-buy="metal-edge-manual"]');
 const pending=button.onclick();await button.onclick();assert.equal(calls,1);release();await pending;
 assert.equal(document.getElementById('xg-feature-sheet'),sheet);assert.equal(sheet.scrollTop,450);
 assert.equal(sheet.querySelector('[data-shop-stones]').textContent,'65');
 assert.match(button.parentElement.querySelector('[data-purchase-status]').textContent,/购买成功：金·锋利/);
 assert.equal(button.disabled,false);
 s.player.spiritStones=0;const failed=button.onclick();release();await failed;
 assert.match(button.parentElement.querySelector('[data-purchase-status]').textContent,/灵石不足/);
 assert.equal(sheet.scrollTop,450);assert.equal(button.disabled,false);assert.equal(s.inventory[0].quantity,1);
});
