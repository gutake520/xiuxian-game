import {PRACTICE} from '../data/balance.js';
import {TECHNIQUES,UPGRADEABLE_TECHNIQUES} from '../data/techniques.js';
import {realmProgress} from '../data/realms.js';
import {idleRate,idleLimitMs,localDay,practiceEntryFee} from '../systems/cultivation.js';
import {createPractice,launchBall,movePaddle,stepPractice} from '../systems/practice.js';
import {createSheet,format,buttonTask,escapeHTML} from './shared.js';
import {techniqueLibrary,learningPuzzle} from './techniques.js';
import {startUpgrade} from '../systems/techniques.js';
import {ownsTechnique} from '../systems/inventory.js';
export function showCultivation(api,onClose){
 const sheet=createSheet('静室修炼',onClose),body=sheet.querySelector('[data-body]'),message=sheet.querySelector('[role=status]');
 const save=api.getSave(),progress=realmProgress(save.player),main=TECHNIQUES[save.techniques.main];
 const dailyLimit=idleLimitMs(save)+(save.qiPillDay===localDay(Date.now())?30*60000:0),entryFee=practiceEntryFee(save.player);
 body.innerHTML=`<div class="xg-feature-card"><h3>${escapeHTML(save.player.realm)}</h3><p>修为 ${format(progress.current)} / ${progress.required??'圆满'}</p><p>主修：${main?.name||'未装备'}</p><p>挂机收益：${save.player.realm==='筑基一层'?'后续修炼待开放':format(idleRate(save))+' / 分钟'}</p><p>今日已挂机 ${format(save.idle.usedMs/60000)} / ${save.player.realm==='筑基一层'?'—':dailyLimit/60000} 分钟</p><small>按本机现实日期零点重置。主修装备期间自动积累，离线同样有效。</small></div><div class="xg-feature-row"><button type="button" data-main>选择主修</button><button type="button" data-refresh>结算挂机</button></div><div class="xg-practice-intro"><h3>五色灵境</h3><p>拖动接灵台，让灵珠击碎上方灵气。根骨越高，接灵台越宽。</p><small>${main?'每块灵气 +2 修为，清场最多 60；有三次失手机会。':'尚未装备主修：本局消除至少一块后，只能获得基础修为 +1。'}</small>${entryFee!==null?`<small>每次入境 ${entryFee} 灵石，失手或提前结束不退还。${save.player.spiritStones<entryFee?' 灵石不足。':''}</small>`:''}<button type="button" data-start ${progress.complete||progress.index<0||entryFee===null||save.player.spiritStones<entryFee?'disabled':''}>${entryFee===null?'暂未开放':`进入灵境 · ${entryFee} 灵石`}</button></div>${UPGRADEABLE_TECHNIQUES.some(id=>ownsTechnique(save,id))?`<div class="xg-feature-card"><h3>功法精进</h3><p>施放满 50 次，可花 20 灵石开启四阶数阵。</p>${UPGRADEABLE_TECHNIQUES.filter(id=>ownsTechnique(save,id)).map(id=>{const learned=save.techniques.mastered.includes(id),times=save.techniques.usage?.[id]||0,done=save.techniques.upgraded?.includes(id),pending=Boolean(save.techniques.puzzles?.['upgrade:'+id]);return `<div class="xg-method-row"><span>${escapeHTML(TECHNIQUES[id].name)} · ${done?'中级':learned?Math.min(50,times)+'/50 次':'待参悟'}</span>${done?'<small>已精进</small>':learned?`<button type="button" data-upgrade="${id}" ${!pending&&(times<50||save.player.spiritStones<20)?'disabled':''}>${pending?'继续参悟':'精进 · 20 灵石'}</button>`:'<button type="button" data-study>前往参悟</button>'}</div>`}).join('')}</div>`:''}${save.player.realm==='炼气圆满'?'<p>击败仇人取得感悟后，可在人物页尝试筑基。</p>':save.player.realm==='筑基一层'?'<p>筑基后续修炼暂未开放。</p>':''}`;
 body.querySelector('[data-main]').onclick=()=>techniqueLibrary(api,()=>showCultivation(api,onClose));
 body.querySelector('[data-refresh]').onclick=()=>buttonTask(body.querySelector('[data-refresh]'),async()=>{await api.actions.refresh();if(!sheet.isConnected)return;showCultivation(api,onClose)},message);
 body.querySelector('[data-start]').onclick=()=>buttonTask(body.querySelector('[data-start]'),async()=>{const response=await api.actions.startPractice();if(!sheet.isConnected)return;practiceCanvas(api,response.result,()=>showCultivation(api,onClose))},message);
 body.querySelectorAll('[data-upgrade]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{const id=button.dataset.upgrade;await api.actions.mutate(s=>startUpgrade(s,id));if(sheet.isConnected)learningPuzzle(api,'upgrade:'+id,()=>showCultivation(api,onClose))},message));
 body.querySelectorAll('[data-study]').forEach(button=>button.onclick=()=>techniqueLibrary(api,()=>showCultivation(api,onClose)));
}
function practiceCanvas(api,id,onClose){
 const slot=api.getSave().slot,game=createPractice(api.getSave().player.stats?.根骨),abort=new AbortController();
 let raf=0,previous=0,paused=false,finished=false,saving=false,cleaned=false;
 const sheet=createSheet('五色灵境',()=>finish()),body=sheet.querySelector('[data-body]'),message=sheet.querySelector('[role=status]');
 sheet.classList.add('xg-practice-sheet');sheet.querySelector('[data-close]').textContent='结束并结算';
 body.innerHTML=`<div class="xg-game-hud"><span data-count>灵气 0 / 30</span><span data-lives>灵珠 ♥♥♥</span></div><canvas width="640" height="800" tabindex="0" aria-label="修炼打砖块，拖动接灵台或用左右方向键移动"></canvas><div class="xg-feature-row"><button type="button" data-launch>发射灵珠</button><button type="button" data-pause>暂停</button></div><small>左右拖动接灵台；也可使用键盘方向键和空格。切到后台自动暂停。</small>`;
 const canvas=body.querySelector('canvas'),ctx=canvas.getContext('2d');ctx.scale(2,2);
 const palette=['#f7b454','#ef769b','#b88cff','#76b9ff','#5cdbbe','#d9e877'];
 const cleanup=()=>{if(cleaned)return;cleaned=true;cancelAnimationFrame(raf);abort.abort();api.setCleanup(null)};api.setCleanup(cleanup);
 const launch=()=>{if(!paused&&!finished)launchBall(game)};
 body.querySelector('[data-launch]').onclick=launch;
 body.querySelector('[data-pause]').onclick=()=>{if(finished)return;paused=!paused;body.querySelector('[data-pause]').textContent=paused?'继续':'暂停';previous=0};
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);move(e);launch()},{signal:abort.signal});
 canvas.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')move(e)},{signal:abort.signal});
 function move(e){const r=canvas.getBoundingClientRect();movePaddle(game,(e.clientX-r.left)/r.width*game.w);e.preventDefault()}
 canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){movePaddle(game,game.paddle.x-14);e.preventDefault()}if(e.key==='ArrowRight'){movePaddle(game,game.paddle.x+14);e.preventDefault()}if(e.code==='Space'){launch();e.preventDefault()}},{signal:abort.signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){paused=true;previous=0;body.querySelector('[data-pause]').textContent='继续'}},{signal:abort.signal});
 async function finish(){
  if(saving)return;saving=true;finished=true;cancelAnimationFrame(raf);
  sheet.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   const result=await api.actions.finishPractice(id,game.cleared,slot);cleanup();
   body.innerHTML=`<div class="xg-practice-result"><div>✦</div><h3>${game.cleared===game.bricks.length?'灵境澄明':'吐纳收功'}</h3><p>消除 ${game.cleared} 块灵气</p><strong>修为 +${format(result.result)}</strong><p>${escapeHTML(api.getSave().player.realm)}</p><button type="button" data-done>返回静室</button></div>`;
   body.querySelector('[data-done]').onclick=onClose;sheet.querySelector('[data-close]').disabled=false;sheet.querySelector('[data-close]').textContent='返回';sheet.querySelector('[data-close]').onclick=onClose;
  }catch(error){message.textContent=error.message+' 本局成绩仍保留，可重试保存。';const b=sheet.querySelector('[data-close]');b.disabled=false;b.textContent='重试保存';b.onclick=finish}
  finally{saving=false}
 }
 function draw(){
  ctx.clearRect(0,0,game.w,game.h);const bg=ctx.createLinearGradient(0,0,game.w,game.h);bg.addColorStop(0,'#182145');bg.addColorStop(.55,'#13243c');bg.addColorStop(1,'#102f2b');ctx.fillStyle=bg;ctx.fillRect(0,0,game.w,game.h);
  ctx.fillStyle='#ffffff38';for(let i=0;i<30;i++){ctx.beginPath();ctx.arc((i*73+13)%320,(i*47+7)%400,1,0,Math.PI*2);ctx.fill()}
  for(const brick of game.bricks){if(!brick.alive)continue;ctx.shadowBlur=8;ctx.shadowColor=palette[brick.color];ctx.fillStyle=palette[brick.color];ctx.beginPath();ctx.roundRect(brick.x,brick.y,brick.w,brick.h,5);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#ffffff70';ctx.fillRect(brick.x+5,brick.y+3,brick.w-10,2)}
  for(const p of game.particles){ctx.globalAlpha=p.life/.6;ctx.fillStyle=palette[p.color];ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
  const paddle=game.paddle;ctx.shadowBlur=16;ctx.shadowColor='#71ffee';ctx.fillStyle='#abfff2';ctx.beginPath();ctx.roundRect(paddle.x-paddle.width/2,paddle.y,paddle.width,8,4);ctx.fill();
  ctx.fillStyle='#fff4c4';ctx.shadowColor='#ffe9a1';ctx.beginPath();ctx.arc(game.ball.x,game.ball.y,game.ball.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  if(game.combo>1){ctx.fillStyle='#ffe5ab';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('连击 '+game.combo,160,205)}
  if(paused||!game.launched){ctx.fillStyle='#07111d99';ctx.fillRect(0,220,320,45);ctx.fillStyle='#e5f5ee';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText(paused?'灵境暂停':'点按发射 · 拖动接灵台',160,247)}
 }
 function frame(time){if(cleaned||finished)return;if(!sheet.isConnected){cleanup();return}const dt=previous?Math.min(.04,(time-previous)/1000):0;previous=time;if(!paused)stepPractice(game,dt);draw();body.querySelector('[data-count]').textContent=`灵气 ${game.cleared} / ${game.bricks.length}`;body.querySelector('[data-lives]').textContent='灵珠 '+'♥'.repeat(game.lives);if(game.done){finish();return}raf=requestAnimationFrame(frame)}
 raf=requestAnimationFrame(frame);
}
