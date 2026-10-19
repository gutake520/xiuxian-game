import {createSheet,escapeHTML} from './shared.js';
import {playPeakPuzzle} from '../systems/peak-puzzles.js';
export function showPeakPuzzle(api,onClose){
 const slot=api.getSave().slot,puzzle=api.getSave().peakPuzzle;
 if(!puzzle){onClose();return}
 const sheet=createSheet(puzzle.kind==='sokoban'?'搬石归阵':'林间迷踪',()=>{sheet.remove();onClose()});sheet.classList.add('xg-stroll-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');let busy=false;
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const draw=()=>{
  const p=api.getSave().peakPuzzle;if(!p||p.id!==puzzle.id)return;
  body.innerHTML=`<p>${p.kind==='sokoban'?'将石箱推到所有金色阵位。':'穿过迷林，走到「出」处。'}</p><div class="xg-puzzle-board" style="--cols:${p.rows[0].length}" role="img" aria-label="${p.kind==='sokoban'?'推箱子石阵':'迷宫'}">${p.rows.flatMap((row,y)=>[...row].map((c,x)=>{const pos=y*row.length+x,goal=p.goals.includes(pos),box=p.boxes.includes(pos),player=p.player===pos;return `<span class="xg-puzzle-cell ${c==='#'?'is-wall':''} ${goal?'is-goal':''} ${box?'is-box':''} ${player?'is-player':''}">${player?'我':box?'箱':goal?(p.kind==='maze'?'出':'◇'):''}</span>`})).join('')}</div><div class="xg-puzzle-controls"><button data-move="up" aria-label="向上">↑</button><button data-move="left" aria-label="向左">←</button><button data-move="down" aria-label="向下">↓</button><button data-move="right" aria-label="向右">→</button></div><div class="xg-puzzle-tools"><button data-move="undo" ${!p.history.length?'disabled':''}>撤销</button><button data-move="reset">重来</button></div>`;
  body.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>run(b.dataset.move));
 };
 const run=async(action)=>{
  if(busy||!current())return;busy=true;
  try{
   const {result}=await api.actions.mutate(s=>playPeakPuzzle(s,puzzle.id,action),{slot,message:r=>r.completed?r.text:null});
   if(!current())return;
   status.textContent='';
   if(result.completed)body.innerHTML=`<article class="xg-feature-card"><h3>奇遇已成</h3><p>${escapeHTML(result.text)}</p></article>`;
   else draw();
  }catch(error){if(current())status.textContent=error.message}finally{busy=false}
 };
 sheet.tabIndex=-1;
 sheet.addEventListener('keydown',event=>{const action={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[event.key];if(action&&api.getSave().peakPuzzle?.id===puzzle.id){event.preventDefault();run(action)}});
 draw();sheet.focus();
}
