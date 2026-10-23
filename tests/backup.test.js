import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {encodeBackup,decodeBackup,restoreBackupSave,readBackupSlots,BACKUP_MAX_BYTES} from '../storage/backup.js';
import {writeSave,readSave,deleteSave} from '../storage/saves.js';
import {migrateSave} from '../storage/migrations.js';
import {maybeFindPeakPuzzle} from '../systems/peak-puzzles.js';
import {maybeFindTraitor} from '../systems/traitor-puzzle.js';
import {showBackup} from '../ui/backup.js';
const make=(slot='slot1',name='言一')=>migrateSave({slot,version:7,player:{name,realm:'炼气一层',spiritRoot:'金灵根',cultivation:12,spiritStones:100},inventory:[]});
const reset=async()=>{globalThis.indexedDB=indexedDB;for(let i=1;i<=5;i++)await deleteSave('slot'+i)};
test('backup includes all established slots and round-trips puzzle, purchases and story progress',async()=>{
 await reset();const s=make();maybeFindPeakPuzzle(s,()=>0);maybeFindTraitor(s,()=>0);s.strollExtra={day:'2026-10-23',purchased:2};s.foundationStory={phase:'searched',dongxiaClue:true};
 const second=make('slot3','另一世');await writeSave(s);await writeSave(second);
 const slots=await readBackupSlots();assert.equal(slots.length,5);assert.equal(slots[1],null);
 const text=encodeBackup(slots),decoded=decodeBackup(text);assert.deepEqual(decoded,[s,second]);
 await restoreBackupSave(decoded[0],'slot2',null);
 assert.deepEqual(await readSave('slot2'),{...s,slot:'slot2'});assert.deepEqual(await readSave('slot1'),s);assert.deepEqual(await readSave('slot3'),second);
});
test('invalid backup files and newer versions reject before replacing anything',async()=>{
 await reset();const s=make();await writeSave(s);
 for(const text of ['not json','{}',JSON.stringify({format:'xiuxian-game-backup',version:99,saves:[s]}),' '.repeat(BACKUP_MAX_BYTES+1),'{"__proto__":{}}'])assert.throws(()=>decodeBackup(text));
 for(const change of [s=>s.player=null,s=>s.player.hp='bad',s=>s.inventory={},s=>s.version=999,s=>s.techniques.puzzles=[],s=>s.slot='bad']){
  const bad=structuredClone(s);change(bad);assert.throws(()=>decodeBackup(encodeBackup([bad])));await assert.rejects(restoreBackupSave(bad,'slot1',s));assert.deepEqual(await readSave('slot1'),s);
 }
 assert.throws(()=>decodeBackup(encodeBackup([s,s])));assert.throws(()=>encodeBackup([]));
});
test('restore requires unchanged preview and serializes competing replacements',async()=>{
 await reset();const old=make(),source=make('slot2','恢复角色');await writeSave(old);
 const updated={...old,updatedAt:123};await writeSave(updated);
 await assert.rejects(restoreBackupSave(source,'slot1',old),/发生变化/);assert.deepEqual(await readSave('slot1'),updated);
 const results=await Promise.allSettled([restoreBackupSave(source,'slot1',updated),restoreBackupSave(source,'slot1',updated)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await readSave('slot1')).player.name,'恢复角色');
});
test('backup UI rejects bad files, confirms overwrite, supports cancel and downloads all slots',async t=>{
 await reset();const old=make();await writeSave(old);const source=make('slot2','备份人物');
 const {document}=parseHTML('<html><body><section id="xg-panel"></section></body></html>');const previousConfirm=globalThis.confirm;globalThis.confirm=()=>false;t.after(()=>{globalThis.confirm=previousConfirm});
 const previous=globalThis.document;globalThis.document=document;t.after(()=>globalThis.document=previous);
 let restored=null,download=null;
 t.mock.method(URL,'createObjectURL',blob=>{download=blob;return 'blob:test'});
 const sheet=showBackup({onRestored:slot=>restored=slot},()=>{});
 await sheet.querySelector('[data-export]').onclick();assert.equal(decodeBackup(await download.text())[0].player.name,old.player.name);
 const input=sheet.querySelector('[data-backup-file]');
 Object.defineProperty(input,'files',{configurable:true,value:[{size:3,text:async()=>'{x}'}]});await input.onchange();assert.match(sheet.querySelector('[role=status]').textContent,/JSON/);assert.equal(sheet.querySelector('[data-restore]'),null);
 Object.defineProperty(input,'files',{configurable:true,value:[{size:100,text:async()=>encodeBackup([source])}]});await input.onchange();
 const target=sheet.querySelector('[data-target]');target.options[0].selected=true;target.onchange();assert.match(sheet.textContent,/将替换/);
 await sheet.querySelector('[data-restore]').onclick();assert.equal(restored,null);assert.deepEqual(await readSave('slot1'),old);
 globalThis.confirm=()=>true;await sheet.querySelector('[data-restore]').onclick();assert.equal(restored,'slot1');assert.equal((await readSave('slot1')).player.name,'备份人物');assert.match(sheet.querySelector('[role=status]').textContent,/已恢复/);
});
test('storage failure aborts a restore and retains the old slot',async t=>{
 await reset();const old=make();await writeSave(old);
 const {IDBObjectStore}=await import('fake-indexeddb');
 const mock=t.mock.method(IDBObjectStore.prototype,'put',()=>{throw new Error('写入失败')});
 await assert.rejects(restoreBackupSave(make('slot2','新角色'),'slot1',old),/写入失败/);
 mock.mock.restore();assert.deepEqual(await readSave('slot1'),old);
});
