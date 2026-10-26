import {XIGONG_DEFENSE,XIGONG_SCENES} from '../data/xigong-defense.js';
import {showBattle} from './combat.js';
import {XIGONG_INTRO,XIGONG_CHAPTERS} from '../data/dongxia-story.js';
import {actXigong} from '../systems/dongxia-story.js';
import {localDay} from '../systems/cultivation.js';
import {createSheet,escapeHTML} from './shared.js';
const prose=t=>t.split('\n\n').map(p=>`<p>${escapeHTML(p)}</p>`).join('');
const button=(action,label,value='')=>`<button data-act="${action}" data-value="${value}">${label}</button>`;
function defenseMarkup(save){
 const q=save.dongxiaStory,s=save.xigongXuan;
 if(q.phase==='attack-pending')return prose(XIGONG_DEFENSE.attack)+button('leave','事不关己 · 从后巷离开')+button('defend','留下抗敌 · 掩护伤员');
 if(q.phase==='left')return prose(XIGONG_DEFENSE.left)+(localDay(Date.now())!==q.leftDay&&Date.now()>q.leftAt?button('search','返回西宫家 · 搜查废墟'):'<p>现实中的次日可返回搜查。</p>');
 if(q.phase==='ruins')return prose(XIGONG_DEFENSE.ruins)+prose(q.mainClue.text)+'<p>线索已记下 · 元婴后续待续。</p>';
 if(q.phase==='unconscious')return prose(q.forced?XIGONG_DEFENSE.forced:XIGONG_DEFENSE.faint)+button('wake','在药香中醒来');
 if(q.phase==='defending')return '<p>你正在掩护伤员，请继续迎战。</p>';
 if(q.phase==='recovery')return `<h3>西宫玄 · 临时药庐</h3>${prose(s.lastText||XIGONG_DEFENSE.awake)}${button('ask','问起黑衣人与押运簿')}${q.mainClue?`<details><summary>已获线索 · 押运簿</summary>${prose(XIGONG_DEFENSE.ask)+prose(q.mainClue.text)}</details>`:''}<p>好感 ${s.affinity}/100${s.bonded?' · 已结为道侣 · 金丹生命上限＋10':''}</p><p>每日交赤髓芝×3，好感＋5。上锁药草不会被消耗。</p>${s.herbDay===localDay(Date.now())?'<p>今日已交药，明日再来。</p>':button('herbs','交付今日草药')}${[30,60,90].filter(n=>s.affinity>=n).map(n=>button('scene',`${s.seen.includes(n)?'重温':'阅读'} · 好感${n}往事`,n)).join('')}${s.affinity>=100&&!s.bonded?prose(XIGONG_SCENES.proposal)+button('bond','回应心意 · 结为道侣'):''}`;
 return '';
}
export function showXigong(api,onClose){
 const sheet=createSheet('照川旧笺',()=>{sheet.remove();onClose()}),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]'),slot=api.getSave().slot;let busy=false;
 sheet.classList.add('xg-old-friend','xg-xigong');status.setAttribute('aria-live','polite');
 function draw(){const q=api.getSave().dongxiaStory;if(!q)return;const c=XIGONG_CHAPTERS[q.step],waiting=q.lastDay===localDay(Date.now());
 body.innerHTML=q.phase==='invited'?`${prose(XIGONG_INTRO)}<button data-act="join">接下客卿木牌</button>`:!['invited','investigating'].includes(q.phase)?defenseMarkup(api.getSave()):`<h3>${waiting?q.journal.at(-1).title:c.title}</h3>${waiting?`${prose(q.journal.at(-1).text)}<p>今日调查已完成，明日继续。</p>`:`${prose(c.scene)}${c.leads.map(([label,text],i)=>`<article class="xg-feature-card"><button data-act="lead" data-value="${i}">${escapeHTML(label)}</button>${q.leads.includes(i)?prose(text):''}</article>`).join('')}${q.leads.length===3?`<h4>${c.question}</h4>${c.answers.map((a,i)=>`<button data-act="answer" data-value="${i}">${escapeHTML(a)}</button>`).join('')}`:''}`}`;
 body.innerHTML+=`<details class="xg-old-friend-journal"><summary>调查手札 · 已完成 ${q.journal.length} 段</summary>${prose('尸身密笺：东夏国，照川城，西宫家。背面绘有东行路线。')}${q.journal.map(j=>`<h4>${j.title}</h4>${XIGONG_CHAPTERS[j.step].leads.map(l=>prose(l[1])).join('')}${prose(j.text)}`).join('')}</details>`;
 body.querySelectorAll('[data-act]').forEach(b=>b.onclick=async()=>{
  if(busy||!sheet.isConnected||api.getSave()?.slot!==slot)return;
  busy=true;const step=q.step,phase=q.phase,scroll=body.scrollTop,journalOpen=body.querySelector('.xg-old-friend-journal').open,action=b.dataset.act,value=Number(b.dataset.value);
  body.querySelectorAll('[data-act]').forEach(button=>button.disabled=true);status.textContent='正在记录…';
  try{
   const {result}=await api.actions.mutate(s=>actXigong(s,q.id,step,action,value),{slot});
   if(sheet.isConnected&&api.getSave()?.slot===slot){
    if(api.getSave().battle?.kind==='xigong-defense'){sheet.remove();showBattle({...api,activate:()=>{},onExit:onClose});return}
    const next=api.getSave().dongxiaStory,same=next.step===step&&next.phase===phase;draw();body.querySelector('.xg-old-friend-journal').open=journalOpen;
    body.scrollTop=same&&!['scene','herbs','bond'].includes(action)?scroll:0;
    status.textContent=action==='answer'&&same?result:action==='lead'?'线索已记入本页。':action==='join'?'客卿身份已记录，可以开始调查。':['answer','join'].includes(action)?'今日调查已整理。':action==='ask'?'线索已记入手札。':action==='wake'?'你已醒来，可以与西宫玄交谈。':result;
   }
  }catch(e){if(sheet.isConnected&&api.getSave()?.slot===slot){status.textContent=e.message;body.querySelectorAll('[data-act]').forEach(button=>button.disabled=false)}}
  finally{busy=false}
 });
 }draw();
}
