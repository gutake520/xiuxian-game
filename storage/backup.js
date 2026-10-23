import {openDB} from './saves.js';
import {migrateSave} from './migrations.js';
import {realmProgress} from '../data/realms.js';
export const BACKUP_SLOTS=['slot1','slot2','slot3','slot4','slot5'];
export const BACKUP_MAX_BYTES=5*1024*1024;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function inspect(value,depth=0){
 if(depth>80)throw new Error('备份内容层级异常。');
 if(typeof value==='number'&&!Number.isFinite(value))throw new Error('备份包含无效数值。');
 if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){
  if(['__proto__','constructor','prototype'].includes(key))throw new Error('备份包含无效字段。');
  inspect(child,depth+1);
 }
}
function validateSave(save){
 if(!object(save)||!BACKUP_SLOTS.includes(save.slot)||!object(save.player))throw new Error('备份缺少有效存档或人物信息。');
 const p=save.player;
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>100||realmProgress(p).index<0||typeof p.spiritRoot!=='string'||!p.spiritRoot)throw new Error('备份中的人物姓名、境界或灵根无效。');
 if(!Number.isInteger(save.version)||save.version<1||save.version>7)throw new Error('存档版本不受支持，请先更新游戏。');
 for(const key of ['spiritStones','cultivation','hp','mp'])if(!Number.isFinite(p[key]))throw new Error('人物数值不完整，无法恢复。');
 for(const key of ['inventory','events'])if(!Array.isArray(save[key]))throw new Error('备份中的物品或记录格式无效。');
 for(const key of ['equipment','techniques','idle'])if(!object(save[key]))throw new Error('备份缺少必要的游戏进度。');
 if(!Array.isArray(save.techniques.mastered)||!object(save.techniques.puzzles))throw new Error('功法数据格式无效。');
 for(const item of save.inventory)if(!object(item)||typeof item.itemId!=='string'||typeof item.uid!=='string'||!Number.isFinite(item.quantity)||item.quantity<=0)throw new Error('储物数据格式无效。');
 for(const key of ['battle','stroll','strollExtra','traitorPuzzle','peakPuzzle'])if(save[key]!=null&&!object(save[key]))throw new Error('备份中的进行中事件格式无效。');
 // Run existing compatibility checks on a disposable copy; preserve the exported snapshot.
 try{migrateSave(structuredClone(save))}catch{throw new Error('存档内容损坏，无法恢复。')}
 return save;
}
export async function readBackupSlots(){
 const db=await openDB();return new Promise((resolve,reject)=>{
  const tx=db.transaction('saves'),request=tx.objectStore('saves').getAll();
  tx.oncomplete=()=>{db.close();resolve(BACKUP_SLOTS.map(slot=>request.result.find(s=>s.slot===slot)||null))};
  tx.onabort=()=>{db.close();reject(tx.error||new Error('读取存档失败。'))};
 });
}
export function encodeBackup(saves,now=Date.now()){
 const entries=saves.filter(Boolean);if(!entries.length)throw new Error('还没有可导出的角色存档。');
 return JSON.stringify({format:'xiuxian-game-backup',version:1,exportedAt:now,saves:entries},null,2);
}
export function decodeBackup(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>BACKUP_MAX_BYTES)throw new Error('备份文件过大（最多 5 MB）。');
 let payload;try{payload=JSON.parse(text)}catch{throw new Error('无法读取，请选择游戏导出的 JSON 备份。')}
 inspect(payload);
 if(!object(payload)||payload.format!=='xiuxian-game-backup'||payload.version!==1||!Array.isArray(payload.saves)||payload.saves.length<1||payload.saves.length>5)throw new Error('这不是受支持的游戏备份。');
 const ids=new Set();for(const save of payload.saves){validateSave(save);if(ids.has(save.slot))throw new Error('备份含有重复存档位。');ids.add(save.slot)}
 return payload.saves;
}
// Compare against the exact preview inside the same transaction, so another tab
// cannot change a target between confirmation and replacement.
export async function restoreBackupSave(source,slot,expected){
 if(!BACKUP_SLOTS.includes(slot))throw new Error('请选择有效的目标存档位。');
 inspect(source);validateSave(source);
 const restored=migrateSave(structuredClone(source));restored.slot=slot;
 const db=await openDB();return new Promise((resolve,reject)=>{
  const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves');let error;
  const request=store.get(slot);request.onsuccess=()=>{try{
   if(JSON.stringify(request.result||null)!==JSON.stringify(expected||null))throw new Error('目标存档刚刚发生变化，请重新选择目标后再试。');
   store.put(restored);
  }catch(e){error=e;tx.abort()}};
  tx.oncomplete=()=>{db.close();resolve(restored)};
  tx.onabort=()=>{db.close();reject(error||tx.error||new Error('恢复失败，原存档未被替换。'))};
 });
}
