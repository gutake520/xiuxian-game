import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {createMapUI} from '../ui/map.js';
import {acknowledgeYanAftermath} from '../systems/yan-tingyun.js';

function mount(t,overrides={}){
 const {document,Event}=parseHTML('<html><body><main id="xg-content"></main></body></html>');
 const previous=globalThis.document;globalThis.document=document;
 t.after(()=>{globalThis.document=previous});
 const save={player:{realm:'炼气七层',spiritStones:100,sect:'无门无派'},inventory:[],equipment:{},yanTingyun:{unlocked:true,introSeen:true,affinity:100,seen:[30,60,90]},...overrides};
 const actions={mutate:async change=>({result:change(save)}),acknowledgeYan:async id=>acknowledgeYanAftermath(save,id)};
 const ui=createMapUI({getSave:()=>save,actions,activate:()=>{}});ui.render();
 const find=selector=>{const node=document.querySelector(selector);assert.ok(node,selector);return node};
 const click=async selector=>{const node=find(selector);node.dispatchEvent(new Event('click'));await new Promise(resolve=>setImmediate(resolve));};
 const visit=async()=>{await click('[data-map="yan-hill"]');await click('[data-yan-visit]')};
 return{save,actions,find,click,visit};
}

for(const choice of ['accept','later','reject'])test(`Yan proposal ${choice} result has a working return button`,async t=>{
 const {save,find,click,visit}=mount(t);await visit();await click('[data-yan-proposal]');await click(`[data-yan-choice="${choice}"]`);
 await click('.xg-map-back');
 if(choice==='accept'){find('[data-yan-leave]');assert.deepEqual(save.player.companions,['燕停云'])}
 else if(choice==='later')find('[data-yan-proposal]');
 else{find('[data-yan-visit]');await click('[data-yan-visit]');assert.match(globalThis.document.body.textContent,/已不在这里/)}
});

test('failed Yan breakup restores the confirmation button after browser event cleanup',async t=>{
 const {save,find,click,visit}=mount(t);save.yanTingyun.bonded=true;save.player.companions=['燕停云'];save.player.spiritStones=0;
 await visit();await click('.xg-map-back');await click('[data-yan-leave]');
 const button=find('[data-yan-leave-confirm]'),event={currentTarget:button};
 const pending=button.onclick(event);event.currentTarget=null;
 await pending;assert.equal(button.disabled,false);assert.match(find('[role=status]').textContent,/100 灵石/);
 save.player.spiritStones=100;await click('[data-yan-leave-confirm]');assert.equal(save.yanTingyun.bonded,false);
});

test('failed Yan aftermath save restores its button and permits retry',async t=>{
 const {save,actions,find}=mount(t,{yanAftermath:{id:'ending',text:'山路相逢'}});
 actions.acknowledgeYan=async()=>{throw new Error('存档未写入')};
 const button=find('[data-yan-finish]');
 // Emulate browsers clearing currentTarget
 // when dispatch ends, before the awaited storage operation settles.
 const event=new globalThis.document.defaultView.Event('click');
 button.dispatchEvent(event);event.currentTarget=null;
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(button.disabled,false);assert.match(find('[role=status]').textContent,/存档未写入/);assert.ok(save.yanAftermath);
 actions.acknowledgeYan=async id=>acknowledgeYanAftermath(save,id);
 button.dispatchEvent(new globalThis.document.defaultView.Event('click'));
 await new Promise(resolve=>setImmediate(resolve));assert.equal(save.yanAftermath,null);find('[data-map="yan-hill"]');
});
