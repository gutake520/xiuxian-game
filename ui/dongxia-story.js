import {XIGONG_INTRO,XIGONG_CHAPTERS} from '../data/dongxia-story.js';
import {actXigong} from '../systems/dongxia-story.js';
import {localDay} from '../systems/cultivation.js';
import {createSheet,escapeHTML} from './shared.js';
const prose=t=>t.split('\n\n').map(p=>`<p>${escapeHTML(p)}</p>`).join('');
export function showXigong(api,onClose){
 const sheet=createSheet('照川旧笺',()=>{sheet.remove();onClose()}),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]'),slot=api.getSave().slot;let busy=false;
 function draw(){const q=api.getSave().dongxiaStory;if(!q)return;const c=XIGONG_CHAPTERS[q.step],waiting=q.lastDay===localDay(Date.now());
 body.innerHTML=q.phase==='invited'?`${prose(XIGONG_INTRO)}<button data-act="join">接下客卿木牌</button>`:q.phase==='attack-pending'?`${prose(q.journal.at(-1).text)}<p>本章完 · 西宫家迎敌篇待续。调查记录已保存。</p>`:`<h3>${c.title}</h3>${waiting?`${prose(q.journal.at(-1).text)}<p>今日调查已完成，明日继续。</p>`:`${prose(c.scene)}${c.leads.map(([label,text],i)=>`<article class="xg-feature-card"><button data-act="lead" data-value="${i}">${escapeHTML(label)}</button>${q.leads.includes(i)?prose(text):''}</article>`).join('')}${q.leads.length===3?`<h4>${c.question}</h4>${c.answers.map((a,i)=>`<button data-act="answer" data-value="${i}">${escapeHTML(a)}</button>`).join('')}`:''}`}`;
 body.innerHTML+=`<details><summary>调查手札 · 已完成 ${q.journal.length} 段</summary>${prose('尸身密笺：东夏国，照川城，西宫家。背面绘有东行路线。')}${q.journal.map(j=>`<h4>${j.title}</h4>${XIGONG_CHAPTERS[j.step].leads.map(l=>prose(l[1])).join('')}${prose(j.text)}`).join('')}</details>`;
 body.querySelectorAll('[data-act]').forEach(b=>b.onclick=async()=>{if(busy)return;busy=true;try{const {result}=await api.actions.mutate(s=>actXigong(s,q.id,q.step,b.dataset.act,Number(b.dataset.value)),{slot});if(sheet.isConnected&&api.getSave().slot===slot){draw();status.textContent=result}}catch(e){if(sheet.isConnected)status.textContent=e.message}finally{busy=false}});
 }draw();
}
