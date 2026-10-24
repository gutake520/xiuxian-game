import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {createAILink,visibleState} from '../core/ai-link.js';
import {createActions} from '../core/actions.js';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave} from '../storage/saves.js';
import {decodeBackup} from '../storage/backup.js';
globalThis.indexedDB=indexedDB;
async function setup(){
 let save=migrateSave({slot:'slot1',version:7,createdAt:123,player:{name:'测试',realm:'炼气一层',spiritRoot:'金灵根',cultivation:12,spiritStones:100},inventory:[]});
 await writeSave(save);
 const handlers={},tools={},memory=new Map();
 const ctx={chat:[{is_user:true,send_date:'today',mes:'帮忙'}],getCurrentChatId:()=> 'chat1',isToolCallingSupported:()=>true,setExtensionPrompt(){},event_types:{GENERATION_AFTER_COMMANDS:'start',GENERATION_ENDED:'end',GENERATION_STOPPED:'stop',CHAT_CHANGED:'chat'},eventSource:{on:(e,f)=>handlers[e]=f},registerFunctionTool:t=>tools[t.name]=t};
 const actions=createActions({getSave:()=>save,setSave:s=>save=s});
 const link=createAILink({getSave:()=>save,actions,getContext:()=>ctx,storage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)}});link.attach();
 const start=()=>{link.configure({sync:true,operate:true});handlers.start('normal')};
 const act=async(id='buy:iron-sword',token=JSON.parse(link.read()).token)=>JSON.parse(await link.execute({token,action:id}));
 return {link,handlers,start,act,get:()=>save,ctx,actions};
}
test('defaults off; purchase follows rules and keeps restorable before-AI backup',async()=>{
 const x=await setup();assert.equal(x.link.status().operate,false);assert.equal((await x.act()).ok,false);
 x.start();assert.equal((await x.act()).ok,true);assert.equal(x.get().player.spiritStones,95);
 const backup=decodeBackup(x.link.backup())[0];assert.equal(backup.player.spiritStones,100);assert.equal(backup.inventory.length,0);
 assert.equal((await readSave('slot1')).player.spiritStones,95);
});
test('duplicate token, regeneration, limit and changed game state cannot spend again',async()=>{
 const x=await setup();x.start();const token=JSON.parse(x.link.read()).token;
 assert.equal((await x.act('buy:iron-sword',token)).ok,true);assert.equal((await x.act('buy:iron-sword',token)).ok,false);
 assert.equal((await x.act()).ok,true);assert.equal((await x.act()).ok,true);assert.equal((await x.act()).ok,false);
 x.handlers.end();x.handlers.start('normal');assert.equal((await x.act()).ok,false);
 x.ctx.chat.push({is_user:true,send_date:'tomorrow',mes:'再买'});x.handlers.end();x.handlers.start('normal');
 const stale=JSON.parse(x.link.read()).token;await x.actions.mutate(s=>s.player.spiritStones--);
 assert.equal((await x.act('buy:iron-sword',stale)).ok,false);
});
test('revocation and non-normal generations deny actions; hidden outcomes stay out',async()=>{
 const x=await setup();x.start();let token=JSON.parse(x.link.read()).token;x.link.configure({sync:true,operate:false});assert.equal((await x.act('buy:iron-sword',token)).ok,false);
 x.start();x.handlers.start('quiet');assert.equal((await x.act()).ok,false);
 x.get().qiSecret={endsAt:9999999999999,reward:{secret:'hidden-answer'},scenes:['hidden-scene']};
 const data=JSON.stringify(visibleState(x.get()));assert.ok(!data.includes('hidden-answer'));assert.ok(!data.includes('hidden-scene'));
});
test('switching slots rejects pending actions and backup failure prevents mutation',async()=>{
 const x=await setup();x.start();const token=JSON.parse(x.link.read()).token;
 const other=structuredClone(x.get());other.slot='slot2';await writeSave(other);await x.actions.select('slot2');
 assert.equal((await x.act('buy:iron-sword',token)).ok,false);assert.equal((await readSave('slot1')).player.spiritStones,100);
 const h={};const ctx={chat:[{is_user:true,mes:'go'}],getCurrentChatId:()=> 'chat',registerFunctionTool(){},setExtensionPrompt(){},event_types:{GENERATION_AFTER_COMMANDS:'start'},eventSource:{on:(e,f)=>h[e]=f}};
 const link=createAILink({getSave:x.get,actions:x.actions,getContext:()=>ctx,storage:{getItem(){return null},setItem(){throw new Error('备份空间不足')}}});
 link.attach();link.configure({sync:true,operate:true});h.start('normal');
 const r=JSON.parse(await link.execute({token:JSON.parse(link.read()).token,action:'buy:iron-sword'}));
 assert.equal(r.ok,false);assert.match(r.error,/备份空间不足/);assert.equal((await readSave('slot2')).player.spiritStones,100);
});
test('state injection survives generation end and read-only background generation',async()=>{
 const x=await setup();let prompt='';x.ctx.setExtensionPrompt=(_id,text)=>{prompt=text};
 x.link.configure({sync:true,operate:false});assert.match(prompt,/测试/);
 x.handlers.start('normal');assert.match(prompt,/当前仅允许读取/);
 x.handlers.end();assert.match(prompt,/测试/);
 x.handlers.start('quiet');assert.match(prompt,/测试/);assert.match(prompt,/"permission":false/);assert.match(prompt,/"token":null/);
 x.link.configure({sync:false,operate:false});assert.equal(prompt,'');
});
test('ordinary generation without explicit type injects; chat change clears it',async()=>{
 const x=await setup();let prompt='';x.ctx.setExtensionPrompt=(_id,text)=>{prompt=text};
 x.link.configure({sync:true,operate:true});x.handlers.start();assert.match(prompt,/玩家已开启 AI 代操作权限/);assert.match(prompt,/测试/);
 x.handlers.chat();assert.equal(prompt,'');assert.equal((await x.act()).ok,false);
});
test('read-only injection works without a function-tool registration API',()=>{
 const handlers={};let prompt='';
 const ctx={chat:[],setExtensionPrompt:(_id,s)=>{prompt=s},event_types:{GENERATION_AFTER_COMMANDS:'start'},eventSource:{on:(e,f)=>handlers[e]=f}};
 const link=createAILink({getSave:()=>null,actions:{},getContext:()=>ctx,storage:{}});
 assert.equal(link.attach(),true);link.configure({sync:true,operate:false});handlers.start('normal');assert.match(prompt,/尚未选择存档/);
});
