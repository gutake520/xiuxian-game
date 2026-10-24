import {createSheet,escapeHTML} from './shared.js';
export function showAILink(link,onClose){
 const sheet=createSheet('角色同行',()=>{sheet.remove();onClose()});
 const body=sheet.querySelector('[data-body]'),note=sheet.querySelector('[role=status]');
 function draw(){
  const state=link.status();
  body.innerHTML=`<article class="xg-feature-card"><h3>让角色了解你的修行</h3><p>开启后，每次正常聊天会同步当前存档的可见信息。关闭后停止更新。</p><button data-sync>${state.sync?'关闭信息同步':'开启信息同步'}</button></article><article class="xg-feature-card"><h3>把小事交给同行者</h3><p>角色可自行购物、服药、换装、探索秘境、挑战普通怪物和接手战斗。每条回复最多三步；重要剧情与小游戏由你决定。</p><button data-act ${state.operate||state.sync&&state.supported?'':'disabled'}>${state.operate?'停止 AI 代操作':'允许 AI 代操作'}</button><p>${escapeHTML(state.reason||'请在酒馆启用函数调用，并使用支持它的模型与接口。')}</p><p data-actions>${escapeHTML(state.emptyActionsReason||`当前有 ${state.actionCount} 项可申请操作，具体条件由游戏校验。`)}</p><p data-state-read>${escapeHTML(state.lastStateRead?.message||'尚未收到 AI 的状态读取调用。')}</p><p data-generation>${escapeHTML(state.lastGeneration?`最近生成类型：${state.lastGeneration.type}，${state.lastGeneration.dryRun?'预览':'正式生成'}`:'尚未检测到聊天生成。')}</p><p data-last-operation role="status">${escapeHTML(state.lastOperation?.message||'尚未收到 AI 的操作调用；正文中的承诺不会改变存档。')}</p><button type="button" data-recheck>重新检测工具调用</button><p>刷新页面后，两项权限都会关闭。重新生成回复不会再次执行已完成的行动。</p></article><article class="xg-feature-card"><h3>留一份来时的命途</h3><p>每个角色首次被 AI 操作前自动保留一份原始存档。下载后可在「存档备份」中导入恢复。</p><button data-backup ${link.backup()?'':'disabled'}>下载 AI 操作前存档</button><p>备份保存在当前浏览器，清除浏览器数据也会删除备份。</p></article>`;
  body.querySelector('[data-recheck]').onclick=()=>{draw();note.textContent='已重新检测当前连接。'};
  body.querySelector('[data-sync]').onclick=()=>{link.configure({sync:!state.sync,operate:false});draw()};
  body.querySelector('[data-act]').onclick=()=>{link.configure({sync:true,operate:!state.operate});draw()};
  body.querySelector('[data-backup]').onclick=()=>{
   const text=link.backup();if(!text)return;
   const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='问道-AI操作前存档.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);note.textContent='已发起下载，请在下载列表确认文件。';
  };
 }
 draw();return sheet;
}
