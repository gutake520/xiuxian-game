import {HEX_CELLS,secretEntries,startGoldenSecret,moveGoldenSecret} from '../systems/golden-secret.js';
import {escapeHTML} from './shared.js';
export function showGoldenSecret(api,onClose,notice=''){
 const {getSave,actions}=api,content=document.getElementById('xg-content'),s=getSave(),b=s.goldenSecret;
 const cell=(c,i)=>{
  const x=170+Math.sqrt(3)*19*(c.q+c.r/2),y=151+28.5*c.r,stone=b.stones.includes(i),bug=i===b.bug;
  const points=Array.from({length:6},(_,j)=>{const a=(60*j-30)*Math.PI/180;return `${x+18*Math.cos(a)},${y+18*Math.sin(a)}`}).join(' ');
  return `<g data-cell="${i}" role="button" tabindex="${stone||bug?-1:0}" aria-disabled="${stone||bug}" aria-label="${stone?'石子':bug?'灵虫':'空地'} ${c.q},${c.r}" class="${stone?'stone':bug?'bug':'open'}${c.edge?' edge':''}"><polygon points="${points}"/>${stone?`<circle cx="${x}" cy="${y}" r="10"/>`:bug?`<text x="${x}" y="${y+6}" text-anchor="middle">虫</text>`:`<circle cx="${x}" cy="${y}" r="2"/>`}</g>`;
 };
 content.innerHTML=`<section class="xg-map-sheet"><button type="button" class="xg-map-back">← 返回东夏国</button><div class="xg-map-heading"><h2>回星古阵</h2><p>围住灵虫 · 中上难度</p></div><div class="xg-card"><p>每天两次，入场 5 灵石；胜利获得 7 灵石、随机金丹草药 1～2 株、赤金矿 1～2 块。失败不返还入场费。</p><p>今日已入场 ${secretEntries(s)} / 2</p>${b?`<p>每次点击空地放一颗石子，灵虫随即沿最短出路走一步。堵住所有出路即胜；灵虫走到外圈即败。</p><p>第 ${b.turn+1} 手 · 暂时离开会保留棋局</p><svg class="xg-hex-board" viewBox="0 0 340 302" aria-label="回星古阵棋盘">${HEX_CELLS.map(cell).join('')}</svg><button type="button" data-abandon>放弃本局（无奖励）</button>`:`<button type="button" data-enter ${secretEntries(s)>=2?'disabled':''}>入阵 · 5 灵石</button>`}</div><p role="status" aria-live="polite">${escapeHTML(notice||(!b?s.lastGoldenSecret?.message||'':''))}</p></section>`;
 content.querySelector('.xg-map-back').onclick=onClose;
 const section=content.firstElementChild;
 let busy=false;
 const run=async fn=>{if(busy)return;busy=true;try{const {result}=await actions.mutate(fn,{message:r=>r});if(section.isConnected)showGoldenSecret(api,onClose,result)}catch(error){if(section.isConnected)section.querySelector('[role=status]').textContent=error.message;busy=false}};
 content.querySelector('[data-enter]')?.addEventListener('click',()=>run(startGoldenSecret));
 content.querySelector('[data-abandon]')?.addEventListener('click',()=>run(s=>moveGoldenSecret(s,b.id,b.turn,'abandon')));
 content.querySelectorAll('[data-cell][aria-disabled="false"]').forEach(g=>{const move=()=>run(s=>moveGoldenSecret(s,b.id,b.turn,Number(g.dataset.cell)));g.onclick=move;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();move()}}});
}
