import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {createMapUI} from '../ui/map.js';

function mount(t,realm='筑基一层'){
 const old=globalThis.document;
 globalThis.document=parseHTML('<html><body><main id="xg-content"></main></body></html>').document;
 t.after(()=>globalThis.document=old);
 const save={slot:'countries',player:{realm,sect:'无门无派',spiritStones:20},inventory:[],equipment:{}};
 const map=createMapUI({getSave:()=>save,activate:()=>{},actions:{mutate:async fn=>({result:fn(save)})}});
 map.render();return {save,map};
}
test('country overview groups old locations and returns through Yunze',t=>{
 mount(t);
 assert.equal(document.querySelector('[data-map="market"]'),null);
 assert.equal(document.querySelector('[data-map="dongxia"]'),null);
 assert.equal(document.querySelector('button').textContent,'四处走走');
 document.querySelector('[data-map="yunze"]').click();
 for(const id of ['market','blackmarket','monsters','foundation','sects','spirit-peak'])assert.ok(document.querySelector(`[data-map="${id}"]`));
 for(const id of ['market','monsters','foundation','sects']){
  document.querySelector(`[data-map="${id}"]`).click();
  assert.match(document.querySelector('.xg-map-back').textContent,/云泽国/);
  document.querySelector('.xg-map-back').click();
  assert.equal(document.querySelector('h2').textContent,'云泽国');
 }
 document.querySelector('.xg-map-back').click();
 assert.equal(document.querySelector('h2').textContent,'山河图');
});
test('Dongxia remains hidden until golden master unlock, then returns to country overview',async t=>{
 const {save,map}=mount(t,'金丹一层');
 assert.equal(document.querySelector('[data-map="dongxia"]'),null);
 save.dongxiaUnlocked=true;map.render();
 document.querySelector('[data-map="dongxia"]').click();await new Promise(r=>setImmediate(r));
 assert.equal(document.querySelector('h2').textContent,'东夏国');
 assert.ok(document.querySelector('[data-golden-shop]'));assert.ok(document.querySelector('[data-golden-wilds]'));
 document.querySelector('.xg-map-back').click();assert.ok(document.querySelector('[data-map="yunze"]'));
 save.player.realm='炼气一层';map.render();assert.equal(document.querySelector('[data-map="dongxia"]'),null);
 document.querySelector('[data-map="yunze"]').click();assert.equal(document.querySelector('[data-map="foundation"]'),null);
});
