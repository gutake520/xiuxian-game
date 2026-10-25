import {RIVER_LEVELS} from '../data/river-crossing.js';
import {playRiver} from '../systems/river-crossing.js';
import {createSheet,escapeHTML} from './shared.js';
export function showRiver(api,onClose){
 const slot=api.getSave().slot,puzzle=api.getSave().riverCrossing;if(!puzzle){onClose();return}
 const sheet=createSheet('雾中渡舟',()=>{sheet.remove();onClose()});sheet.classList.add('xg-stroll-sheet','xg-encounter-sheet');
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');let selected=new Set(),busy=false;
 const current=()=>sheet.isConnected&&api.getSave()?.slot===slot;
 const draw=()=>{
  const p=api.getSave().riverCrossing;if(!p||p.id!==puzzle.id)return;
  const level=RIVER_LEVELS[p.level];
  if(p.phase==='won'){body.innerHTML=`<article class="xg-encounter-intro"><small>云开 · 渡成</small><h3>已抵彼岸</h3><p>${escapeHTML(p.text)}</p></article><button data-river-action="dismiss">收好行囊 · 返回</button>`}
  else body.innerHTML=`<article class="xg-encounter-intro"><small>望川岭 · ${level.name}</small><h3>一叶小舟，往返两岸</h3><p>将所有同行者送到彼岸。你负责撑船，在场便能看守整岸；每趟承重 ${level.capacity}，不计你自己，可空船返回。</p><span class="xg-encounter-chip">渡河 ${p.moves} 次</span><span class="xg-encounter-chip">成功获 7～10 灵石</span></article><details class="xg-river-rules" open><summary>渡河须知</summary>${level.rules.map(rule=>`<p>${rule}</p>`).join('')}<p>「独处」指你不在该岸，即使另有同行者也不能看守。</p></details><div class="xg-river-banks">${[0,1].map(bank=>`<section class="xg-river-bank ${p.bank===bank?'has-boat':''}"><h4>${bank?'彼岸':'此岸'} ${p.bank===bank?'· 舟在此':''}</h4><div>${level.cargo.map((c,i)=>p.positions[i]===bank?`<button type="button" data-cargo="${i}" aria-pressed="${selected.has(i)}" ${p.bank!==bank?'disabled':''} class="${selected.has(i)?'is-selected':''}"><b>${c.name}</b><small>重量 ${c.weight}</small></button>`:'').join('')||'<p class="xg-river-empty">岸边无人</p>'}</div></section>`).join('')}</div><div class="xg-river-water" aria-hidden="true">～　雾起川上　～</div><p class="xg-river-load">已选承重 ${[...selected].reduce((n,i)=>n+level.cargo[i].weight,0)} / ${level.capacity}</p><button class="xg-encounter-primary" data-river-action="cross">${selected.size?'载上同行者':'独自撑船'} · 前往${p.bank?'此岸':'彼岸'}</button><div class="xg-encounter-tools"><button data-river-action="reset">重新摆渡</button><button data-river-action="abandon">放弃本次</button></div>`;
  body.querySelectorAll('[data-cargo]').forEach(b=>b.onclick=()=>{if(busy||!current())return;const i=Number(b.dataset.cargo);selected.has(i)?selected.delete(i):selected.add(i);draw()});
  body.querySelectorAll('[data-river-action]').forEach(b=>b.onclick=()=>run(b.dataset.riverAction));
 };
 const run=async action=>{
  if(busy||!current())return;
  if(action==='abandon'&&!confirm('放弃本次渡河？不获奖励、不退奇遇次数。'))return;
  busy=true;body.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   const {result}=await api.actions.mutate(s=>playRiver(s,puzzle.id,action,[...selected]),{slot,message:r=>r.message});
   if(!current())return;
   if(result.closed){sheet.remove();onClose();return}
   selected.clear();status.textContent='';
  }catch(error){if(current())status.textContent=error.message}finally{busy=false;if(current())draw()}
 };
 draw();
}
