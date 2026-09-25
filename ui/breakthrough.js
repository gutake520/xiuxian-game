import {createSheet} from './shared.js';
import {tilePorts,flowingTiles,breakthroughReady,foundationReward,FOUNDATION_APTITUDES} from '../systems/breakthrough.js';
import {localDay} from '../systems/cultivation.js';

export function showBreakthrough(api,onClose){
 const sheet=document.getElementById('xg-feature-sheet')||createSheet('筑基 · 灵脉凝结',onClose);
 const body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 const save=api.getSave(),session=save.breakthrough;
 if(save.foundationAptitudePending){
  const reward=foundationReward(save.player);
  body.innerHTML=`<div class="xg-feature-card xg-foundation-reward"><h3>筑基成功</h3><p>生命 +${reward.hp} · 法力 +${reward.mp} · 攻击 +${reward.attack} · 防御 +${reward.defense}<br>速度 +${reward.speed} · 暴击率 +${reward.critRate}% · 闪避率 +${reward.dodgeRate}%${save.techniques?.mastered?.includes('self-as-self')?'<br>领悟《我即我》，可在功法典籍中装备。':''}</p><p>选择一项资质 +1：</p><div class="xg-foundation-aptitudes">${FOUNDATION_APTITUDES.map(key=>`<button type="button" data-aptitude="${key}">${key} · ${save.player.stats?.[key]??0} → ${(Number(save.player.stats?.[key])||0)+1}</button>`).join('')}</div></div>`;
  body.querySelectorAll('[data-aptitude]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const {result}=await api.actions.chooseFoundationAptitude(button.dataset.aptitude);if(!sheet.isConnected)return;showBreakthrough(api,onClose);sheet.querySelector('[role=status]').textContent=result}catch(error){status.textContent=error.message;button.disabled=false}});
  return;
 }
 if(!breakthroughReady(save)||!session){
  body.innerHTML=save.player.realm==='筑基一层'?'<div class="xg-feature-card"><h3>灵脉贯通</h3><p>你已突破至筑基一层。</p><button type="button" data-finish>返回人物</button></div>':'<div class="xg-feature-card"><h3>灵气不足</h3><p>修为恢复至 1000 后，可继续这次突破。</p><button type="button" data-finish>返回人物</button></div>';
  body.querySelector('[data-finish]').onclick=onClose;
  return;
 }
 const flowing=flowingTiles(session);
 const ends=[[50,0],[100,50],[50,100],[0,50]];
 const exhausted=session.remaining===0;
 body.innerHTML=`<div class="xg-breakthrough"><small>炼气十层 · 灵气充盈</small><p>点经脉旋转，让灵气从左侧进入丹田。</p>
 <div class="xg-breakthrough-meta"><span>入口 → 丹田</span><span>剩余旋转 ${session.remaining} 次</span></div>
 <div class="xg-breakthrough-grid" role="group" aria-label="五行五列灵脉格">${session.tiles.map((tile,index)=>{
  const paths=tilePorts(tile).map(side=>`<path d="M50 50 L${ends[side][0]} ${ends[side][1]}"></path>`).join('');
  const label=index===10?'入口':index===12?'丹田':'';
  return `<button class="xg-breakthrough-tile" type="button" data-tile="${index}" data-lit="${flowing.has(index)}" data-end="${Boolean(label)}" aria-label="第${Math.floor(index/5)+1}行第${index%5+1}列${label?'，'+label:''}，点击旋转" ${exhausted?'disabled':''}><svg viewBox="0 0 100 100" aria-hidden="true">${paths}<circle cx="50" cy="50" r="6"></circle></svg>${label?`<span>${label}</span>`:''}</button>`
 }).join('')}</div>
 <div class="xg-breakthrough-footer"><span>${exhausted?save.breakthroughDay===localDay(Date.now())?'灵气散去，明天再试。':'灵气散去，可以再试。':'灵气尚未贯通。'}</span>${exhausted?`<button type="button" data-retry ${save.breakthroughDay===localDay(Date.now())?'disabled':''}>重试</button>`:session.hintLimit>session.hintsUsed?`<button type="button" data-hint>悟性提示 ${session.hintLimit-session.hintsUsed}/${session.hintLimit}</button>`:''}</div></div>`;
 const act=async(button,run)=>{
  button.disabled=true;
  try{const {result}=await run();if(!sheet.isConnected)return;showBreakthrough(api,onClose);sheet.querySelector('[role=status]').textContent=typeof result==='string'?result:''}
  catch(error){status.textContent=error.message;button.disabled=false}
 };
 body.querySelectorAll('[data-tile]').forEach(button=>button.onclick=()=>act(button,()=>api.actions.rotateMeridian(session.id,Number(button.dataset.tile))));
 body.querySelector('[data-hint]')?.addEventListener('click',event=>act(event.currentTarget,()=>api.actions.hintMeridian(session.id)));
 body.querySelector('[data-retry]')?.addEventListener('click',event=>act(event.currentTarget,()=>api.actions.retryBreakthrough(session.id)));
}
