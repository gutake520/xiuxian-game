import {BACKUP_SLOTS,BACKUP_MAX_BYTES,readBackupSlots,encodeBackup,decodeBackup,restoreBackupSave} from '../storage/backup.js';
import {createSheet,escapeHTML} from './shared.js';
export function showBackup({onRestored=()=>{}},onClose){
 const sheet=createSheet('存档备份',()=>{sheet.remove();onClose()});
 sheet.classList.add('xg-backup-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 body.innerHTML=`<article class="xg-feature-card"><h3>带走你的修行进度</h3><p>一次导出五世中所有已建立的角色，保留物品、剧情和进行中的小游戏。下载后请妥善保存 JSON 文件。</p><button type="button" data-export>导出全部存档</button></article><article class="xg-feature-card"><h3>从备份恢复</h3><p>选择备份中的一个角色，恢复到指定命途。其他存档不变。</p><label>选择备份文件<input type="file" accept=".json,application/json" data-backup-file></label><div data-preview></div></article>`;
 const fileInput=body.querySelector('[data-backup-file]'),exportButton=body.querySelector('[data-export]'),preview=body.querySelector('[data-preview]');
 let busy=false,sources=[],targets=[];
 const current=()=>sheet.isConnected;
 const lock=value=>{busy=value;body.querySelectorAll('button,input,select').forEach(el=>el.disabled=value)};
 exportButton.onclick=async()=>{
  if(busy)return;lock(true);status.textContent='';
  try{
   const text=encodeBackup(await readBackupSlots());if(!current())return;
   const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'})),link=document.createElement('a');
   link.href=url;link.download=`问我-存档备份-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;document.body.append(link);
   try{link.click()}finally{link.remove();const timer=setTimeout(()=>URL.revokeObjectURL(url),60000);timer.unref?.()}
   status.textContent='已发起下载，请在浏览器下载列表确认备份文件已保存。';
  }catch(error){if(current())status.textContent=error.message}finally{if(current())lock(false)}
 };
 const drawPreview=()=>{
  preview.innerHTML=`<p><label>备份角色 <select data-source>${sources.map((s,i)=>`<option value="${i}">${escapeHTML(s.player.name)} · ${escapeHTML(s.player.realm)}（原存档 ${BACKUP_SLOTS.indexOf(s.slot)+1}）</option>`).join('')}</select></label></p><p><label>恢复位置 <select data-target>${targets.map((s,i)=>`<option value="${i}">存档 ${i+1} · ${s?escapeHTML(s.player.name)+'（将覆盖）':'空白命途'}</option>`).join('')}</select></label></p><p data-restore-note></p><button type="button" data-restore>恢复所选角色</button>`;
  const target=preview.querySelector('[data-target]'),source=preview.querySelector('[data-source]');
  source.options[0].selected=true;
  target.options[Math.max(0,targets.findIndex(s=>!s))].selected=true;
  const note=()=>{const s=targets[Number(target.value)];preview.querySelector('[data-restore-note]').textContent=s?`将替换「${s.player.name}」的全部进度，建议先导出当前存档。`:'将写入空白存档位。'};
  target.onchange=note;note();
  preview.querySelector('[data-restore]').onclick=async()=>{
   if(busy)return;
   const index=Number(target.value),chosen=sources[Number(source.value)],old=targets[index],slot=BACKUP_SLOTS[index];
   if(!confirm(`将「${chosen.player.name}」恢复到存档 ${index+1}${old?`，覆盖「${old.player.name}」的全部进度`:''}，确认继续？`))return;
   lock(true);status.textContent='';
   try{
    await restoreBackupSave(chosen,slot,old);onRestored(slot);
    if(!current())return;
    status.textContent=`已恢复「${chosen.player.name}」至存档 ${index+1}，可从五世存档进入。`;
    targets=await readBackupSlots();if(current())drawPreview();
   }catch(error){if(current()){status.textContent=error.message;try{targets=await readBackupSlots();if(current())drawPreview()}catch{preview.innerHTML='';status.textContent+=' 请重新打开备份页面。'}}}
   finally{if(current())lock(false)}
  };
 };
 fileInput.onchange=async()=>{
  if(busy)return;const file=fileInput.files?.[0];if(!file)return;
  lock(true);preview.innerHTML='';sources=[];status.textContent='';
  try{
   if(file.size>BACKUP_MAX_BYTES)throw new Error('备份文件过大（最多 5 MB）。');
   sources=decodeBackup(await file.text());targets=await readBackupSlots();if(current())drawPreview();
  }catch(error){if(current())status.textContent=error.message}
  finally{fileInput.value='';if(current())lock(false)}
 };
 return sheet;
}
