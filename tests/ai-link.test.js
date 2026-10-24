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
 const ctx={chat:[{is_user:true,send_date:'today',mes:'帮忙'}],getCurrentChatId:()=> 'chat1',isToolCallingSupported:()=>true,setExtensionPrompt(){},event_types:{GENERATION_AFTER_COMMANDS:'start',GENERATION_ENDED:'end',GENERATION_STOPPED:'stop',CHAT_CHANGED:'chat',MESSAGE_SENT:'message'},eventSource:{on:(e,f)=>handlers[e]=f},registerFunctionTool:t=>tools[t.name]=t};
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
test('registered tools execute a real purchase and report failure separately from narration',async()=>{
 const x=await setup();const registered={};x.ctx.registerFunctionTool=t=>registered[t.name]=t;
 x.link.attach();x.start();assert.equal(x.link.status().lastOperation,null);
 const state=JSON.parse(registered.wandao_state.action());
 assert.ok(state.actions.some(a=>a.id==='buy:iron-sword'));
 const r=JSON.parse(await registered.wandao_action.action({token:state.token,action:'buy:iron-sword'}));
 assert.equal(r.ok,true);assert.equal((await readSave('slot1')).player.spiritStones,95);assert.equal(x.link.status().lastOperation.state,'success');
 const latest=JSON.parse(registered.wandao_state.action());
 const invalid=JSON.parse(await registered.wandao_action.action({token:latest.token,action:'play-gomoku'}));
 assert.equal(invalid.ok,false);assert.equal(x.link.status().lastOperation.state,'failed');assert.equal((await readSave('slot1')).player.spiritStones,95);
});
test('action prompt focuses on current actions without advertising unsupported games',async()=>{
 const x=await setup();let prompt='';x.ctx.setExtensionPrompt=(_id,s)=>prompt=s;x.start();
 assert.match(prompt,/本轮可执行范围只取自最新 actions 列表/);assert.match(prompt,/先调用工具完成实际行动/);
 assert.doesNotMatch(prompt,/五子棋|打砖块|数独|抓叛徒|推箱子/);
 x.link.configure({sync:true,operate:false});assert.match(prompt,/当前仅允许读取/);assert.match(prompt,/"permission":false/);
});
test('first-message event order creates action credentials after user message is appended',async()=>{
 const x=await setup();x.ctx.chat.length=0;let prompt='';x.ctx.setExtensionPrompt=(_id,s)=>prompt=s;
 x.link.configure({sync:true,operate:true});x.handlers.start('normal');assert.match(prompt,/"token":null/);
 x.ctx.chat.push({is_user:true,mes:'买一把铁剑',send_date:'new'});x.handlers.message();
 assert.match(prompt,/玩家已开启 AI 代操作权限/);assert.doesNotMatch(prompt,/"token":null/);
 assert.equal((await x.act()).ok,true);assert.equal((await readSave('slot1')).player.spiritStones,95);
});
test('state tool repairs early event snapshots even when MESSAGE_SENT is unavailable',async()=>{
 const x=await setup();x.start();const stale=JSON.parse(x.link.read()).token;
 x.ctx.chat.push({is_user:true,mes:'这才是本条请求',send_date:'new'});
 assert.equal((await x.act('buy:iron-sword',stale)).ok,false);
 assert.equal((await x.act()).ok,true);assert.equal(x.get().aiLinkReceipts[0].turn.includes('这才是本条请求'),true);
});
test('prompt preview never grants game operation credentials',async()=>{
 const x=await setup();x.link.configure({sync:true,operate:true});x.handlers.start('normal',{},true);
 assert.equal(JSON.parse(x.link.read()).token,null);assert.equal((await x.act()).ok,false);
});

test('persistent stroll counters do not block real actions',async()=>{
 const x=await setup();
 await x.actions.mutate(s=>{s.stroll={day:'2026-10-24',count:10,encounters:5,last:{text:'已结束的游历'}};s.strollExtra={day:'2026-10-24',purchased:1}});
 x.start();const state=JSON.parse(x.link.read());
 assert.ok(state.actions.some(a=>a.id==='buy:iron-sword'));assert.equal(state.emptyActionsReason,null);
 assert.ok(x.link.status().actionCount>0);
 assert.equal((await x.act()).ok,true);assert.equal((await readSave('slot1')).player.spiritStones,95);
});
test('unfinished events still block actions with a visible reason',async()=>{
 const x=await setup();await x.actions.mutate(s=>{s.peakPuzzle={id:'pending'}});x.start();
 const state=JSON.parse(x.link.read());assert.deepEqual(state.actions,[]);assert.match(state.emptyActionsReason,/解谜事件/);
 assert.equal(x.link.status().emptyActionsReason,state.emptyActionsReason);
 assert.equal((await x.act()).ok,false);assert.equal((await readSave('slot1')).player.spiritStones,100);
 x.get().peakPuzzle=null;x.get().qiSecret={endsAt:Date.now()+60000,reward:{secret:'hidden'}};
 const waiting=JSON.parse(x.link.read());assert.deepEqual(waiting.actions,[]);assert.match(waiting.emptyActionsReason,/探索尚未结束/);assert.doesNotMatch(JSON.stringify(waiting),/hidden/);
});
