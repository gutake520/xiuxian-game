import {GOMOKU_SIZE as N,GOMOKU_DIFFICULTIES,STALL_MAX_BET} from '../data/stall-games.js';
import {startGomoku,moveGomoku,startDice,revealDice,leaveStallGame} from '../systems/stall-games.js';
import {createSheet,escapeHTML,format} from './shared.js';
export function showStallGame(api,kind,onClose){
 const save=api.getSave(),slot=save.slot,id=save.stallGames?.[kind]?.id;
 if(!id){onClose();return}
 const sheet=createSheet(kind==='gomoku'?'坊市棋摊':'黑市骰局',()=>{sheet.remove();onClose()});sheet.classList.add('xg-stroll-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');let busy=false,selected=null;
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const run=async(fn)=>{
  if(busy||!current())return;busy=true;body.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{const {result}=await api.actions.mutate(fn,{slot,message:r=>r.text});if(current()){selected=null;draw();status.textContent=result.completed?'':result.text||''}}
  catch(error){if(current()){draw();status.textContent=error.message}}
  finally{busy=false}
 };
 const draw=()=>{
  const s=api.getSave(),g=s.stallGames?.[kind];if(!g||g.id!==id){body.textContent='这局已有变化，请返回重新打开。';return}
  if(g.phase==='done'){body.innerHTML=`<article class="xg-feature-card"><h3>${g.outcome==='win'?'赢了':g.outcome==='draw'?'和棋':'此局已散'}</h3><p>${escapeHTML(g.text)}</p></article>`;return}
  if(g.phase==='offer'){
   body.innerHTML=`<p>灵石 ${format(s.player.spiritStones)}</p><div class="xg-stall-form">${kind==='gomoku'?`<label>棋力 <select data-difficulty>${Object.entries(GOMOKU_DIFFICULTIES).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><p>执黑先行，连五即胜，无禁手。</p>`:'<label>猜大小 <select data-guess><option value="big">大（4～6点）</option><option value="small">小（1～3点）</option></select></label>'}<label>下注 <select data-bet>${Array.from({length:kind==='gomoku'?6:5},(_,i)=>i+(kind==='gomoku'?0:1)).map(n=>`<option value="${n}">${n} 灵石</option>`).join('')}</select></label><p>${kind==='gomoku'?'低难度不下注；中高难度赢返双倍，和棋退本。':'赢返双倍，输不退。'}</p><button data-start>开局</button><button data-leave>改日再来</button></div>`;
   const bet=body.querySelector('[data-bet]'),difficulty=body.querySelector('[data-difficulty]');
   if(difficulty){const update=()=>{bet.disabled=difficulty.value==='easy';if(bet.disabled)bet.value='0'};difficulty.onchange=update;update()}
   body.querySelector('[data-start]').onclick=()=>{const amount=Number(bet.value),level=difficulty?.value,guess=body.querySelector('[data-guess]')?.value;if(amount>STALL_MAX_BET)return;return run(next=>kind==='gomoku'?startGomoku(next,id,level,amount):startDice(next,id,guess,amount))};
   body.querySelector('[data-leave]').onclick=()=>run(next=>leaveStallGame(next,kind,id));return;
  }
  if(kind==='dice'){
   body.innerHTML=`<article class="xg-feature-card"><h3>买定离手</h3><p>你押了${g.guess==='big'?'大':'小'} · ${g.bet} 灵石</p><div class="xg-dice-cup" aria-label="骰盅未揭开">盅</div><button data-reveal>揭盅</button></article>`;
   body.querySelector('[data-reveal]').onclick=()=>run(next=>revealDice(next,id));return;
  }
  body.innerHTML=`<p>棋力${GOMOKU_DIFFICULTIES[g.difficulty]} · ${g.bet?'已押 '+g.bet+' 灵石':'切磋'} · 你执黑</p><div class="xg-gomoku-board" role="group" aria-label="五子棋盘">${g.board.map((stone,pos)=>`<button type="button" data-cell="${pos}" class="${stone===1?'is-black':stone===2?'is-white':''} ${g.lastMove===pos?'is-last':''}" aria-label="第${Math.floor(pos/N)+1}行第${pos%N+1}列，${stone===1?'黑子':stone===2?'白子':'空位'}" ${stone?'disabled':''}></button>`).join('')}</div><div class="xg-stall-form"><p data-selection>点选空位，再确认落子。</p><button data-confirm disabled>确认落子</button><button data-resign>认输${g.bet?'（不退下注）':''}</button></div>`;
  body.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>{
   if(busy||b.disabled)return;selected=Number(b.dataset.cell);body.querySelectorAll('[data-cell]').forEach(cell=>cell.classList.toggle('is-selected',cell===b));
   body.querySelector('[data-selection]').textContent=`第${Math.floor(selected/N)+1}行，第${selected%N+1}列`;body.querySelector('[data-confirm]').disabled=false;
  });
  body.querySelector('[data-confirm]').onclick=()=>{if(selected===null)return;const pos=selected;return run(next=>moveGomoku(next,id,pos,g.ply))};
  body.querySelector('[data-resign]').onclick=()=>run(next=>leaveStallGame(next,kind,id));
 };
 draw();
}
