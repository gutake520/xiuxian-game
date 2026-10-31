import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {createMapUI} from '../ui/map.js';
import {repairPrice} from '../systems/sect-services.js';
test('Dongxia market buys, sells and repairs with duplicate-click protection and return links',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><section id="xg-panel"><main id="xg-content"></main></section></body></html>').document;t.after(()=>globalThis.document=old);
 const s={slot:'repair',dongxiaUnlocked:true,player:{realm:'金丹一层',sect:'青岚谷',spiritStones:100,hp:20,mp:10,combat:{hp:30,mp:10}},inventory:[{uid:'sword',itemId:'golden-sword',durability:15}],equipment:{},techniques:{mastered:[]}};
 let release,calls=0;const api={getSave:()=>s,activate:()=>{},actions:{mutate:async fn=>{calls++;if(release===null)await new Promise(r=>release=r);return {result:fn(s)}}}};const map=createMapUI(api);map.render();document.querySelector('[data-map="dongxia"]').click();await new Promise(r=>setImmediate(r));document.querySelector('[data-golden-shop]').click();
 document.querySelector('[data-golden-buy]').click();assert.ok(document.querySelector('[data-buy]'));document.querySelector('[data-close]').click();document.querySelector('[data-golden-sell]').click();assert.ok(document.querySelector('[data-discard]'));document.querySelector('[data-close]').click();document.querySelector('[data-golden-repair]').click();
 const price=repairPrice(s.inventory[0]);release=null;calls=0;const button=document.querySelector('[data-golden-mend]'),pending=button.onclick();await button.onclick();assert.equal(calls,1);release();await pending;assert.equal(s.player.spiritStones,100-price);assert.equal(s.inventory[0].durability,20);assert.match(document.body.textContent,/没有需要修理/);document.querySelector('.xg-map-back').click();assert.ok(document.querySelector('[data-golden-repair]'));document.querySelector('.xg-map-back').click();assert.ok(document.querySelector('[data-golden-shop]'));
});

test('purchase return removes its own sheet before navigation and does not bubble to the host',async t=>{
 const {showShop}=await import('../ui/inventory.js');
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><section id="xg-panel"><main id="xg-content"></main></section></body></html>').document;t.after(()=>globalThis.document=old);
 const s={player:{realm:'金丹一层',spiritStones:100},inventory:[],equipment:{},techniques:{mastered:[]}};
 let closed=0,hostClicks=0;document.body.addEventListener('click',()=>hostClicks++);
 showShop({getSave:()=>s},false,()=>{assert.equal(document.querySelector('#xg-feature-sheet'),null);closed++});
 document.querySelector('[data-close]').click();assert.equal(closed,1);assert.equal(hostClicks,0);assert.equal(document.querySelector('[data-buy]'),null);
});
