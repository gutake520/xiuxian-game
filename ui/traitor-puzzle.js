import {TRAITOR_LEVELS} from '../data/traitor-levels.js';
import {playTraitor} from '../systems/traitor-puzzle.js';
import {createSheet,escapeHTML} from './shared.js';
const colors=['#f3dda0','#b8d8bf','#c5c9e8','#efc2ad','#b4dce4','#e3bfda','#d7df9e','#b6dcd2','#e9c3c5','#cbd5e2'];
const disciple='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M6 20v-3a6 6 0 0 1 12 0v3M4 20h16"/></svg>';
export function showTraitorPuzzle(api,onClose){
 const save=api.getSave(),slot=save.slot,puzzle=save.traitorPuzzle;
 if(!puzzle){onClose();return}
 const level=TRAITOR_LEVELS[puzzle.levelIndex];
 const sheet=createSheet('抓叛徒',()=>{sheet.remove();onClose()});sheet.classList.add('xg-traitor-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 let busy=false,mode='suspect';
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const draw=()=>{
  const p=api.getSave().traitorPuzzle;if(!p||p.id!==puzzle.id)return;
  const n=level.size,marked=p.marks.filter(m=>m===2).length;
  body.innerHTML=`<div class="xg-traitor-meta"><span>${escapeHTML(p.sect)} · 第 ${p.levelIndex+1} / ${TRAITOR_LEVELS.length} 关</span><strong>已标 ${marked} / ${n}</strong></div><p class="xg-traitor-intro">执事递来一份值守名册：叛徒混在弟子之中，请你协助查明。</p><div class="xg-traitor-rules"><span>每行、每列各一人</span><span>每色分组各一人</span><span>不能相邻，包括斜角</span></div><div class="xg-traitor-mode" role="group" aria-label="标记方式"><button type="button" data-mode="suspect" aria-pressed="${mode==='suspect'}">圈定叛徒</button><button type="button" data-mode="clear" aria-pressed="${mode==='clear'}">排除嫌疑 ×</button></div><div class="xg-traitor-scroll"><div class="xg-traitor-board" style="--cols:${n}" role="group" aria-label="弟子名册，${n}行${n}列">${p.marks.map((mark,i)=>{
   const r=Math.floor(i/n),c=i%n,g=Number(level.regions[r][c]);
   const edges=`${r===0||level.regions[r-1][c]!==String(g)?' edge-top':''}${c===0||level.regions[r][c-1]!==String(g)?' edge-left':''}${r===n-1||level.regions[r+1][c]!==String(g)?' edge-bottom':''}${c===n-1||level.regions[r][c+1]!==String(g)?' edge-right':''}`;
   return `<button type="button" class="xg-traitor-cell ${mark===1?'is-cleared':mark===2?'is-suspect':''}${edges}" data-cell="${i}" style="--group-color:${colors[g]}" aria-label="第${r+1}行第${c+1}列，第${g+1}组，${mark===1?'已排除':mark===2?'疑似叛徒':'未判断'}" aria-pressed="${mark===2}"><small aria-hidden="true">${g+1}</small>${mark===1?'<span aria-hidden="true">×</span>':disciple}</button>`;
  }).join('')}</div></div><p class="xg-traitor-help">选好标记方式后点弟子，再点可取消。返回会保留排查进度。</p><div class="xg-traitor-tools"><button type="button" data-action="undo" ${!p.history.length?'disabled':''}>撤销</button><button type="button" data-action="reset">清空标记</button><button type="button" data-action="submit">提交名册</button></div><div class="xg-feature-row"><button type="button" data-action="abandon">放弃本次</button></div>`;
  body.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(busy)return;mode=b.dataset.mode;draw()});
  body.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>run(mode,Number(b.dataset.cell)));
  body.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>run(b.dataset.action));
 };
 const run=async(action,index)=>{
  if(busy||!current())return;
  if(action==='abandon'&&!confirm('放弃本次奇遇？不获奖励、不退次数，关卡进度不前进。'))return;
  busy=true;
  body.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   const {result}=await api.actions.mutate(s=>playTraitor(s,puzzle.id,action,index),{slot,message:r=>r.completed?r.text:null});
   if(!current())return;
   status.textContent='';
   if(result.completed){
    body.innerHTML=`<article class="xg-traitor-result"><small>${result.outcome==='abandoned'?'名册已交还':'名册已核实'}</small><h3>${result.outcome==='abandoned'?'已放弃本次':'叛徒尽数落网'}</h3><p>${escapeHTML(result.text)}</p>${result.outcome==='abandoned'?'':`<strong>灵石 +${result.reward}</strong>`}<button type="button" data-finish>结束本次奇遇</button></article>`;
    body.querySelector('[data-finish]').onclick=()=>{sheet.remove();onClose()};
   }else draw();
  }catch(error){if(current()){draw();status.textContent=error.message}}
  finally{busy=false}
 };
 draw();
}
