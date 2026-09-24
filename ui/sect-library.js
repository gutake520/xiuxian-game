import {libraryVisits,LIBRARY_DAILY_VISITS,libraryElderName,visitSectLibrary,answerLibraryExam,claimLibraryManual} from '../systems/sect-library.js';
import {ownsTechnique} from '../systems/inventory.js';
import {createSheet,escapeHTML,buttonTask} from './shared.js';

export function showSectLibrary(api,onClose){
 const save=api.getSave();
 if(save.libraryExam)return showLibraryExam(api,onClose);
 const sheet=createSheet('藏书阁',onClose),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 const count=libraryVisits(save),fragments=save.libraryFragments||0;
 body.innerHTML=`<article class="xg-feature-card"><h3>翻阅古籍</h3><p>今天还可入阁 ${LIBRARY_DAILY_VISITS-count} 次。${escapeHTML(libraryElderName(save))}常在书架间打扫，偶尔会考校来访弟子。</p><p>玉简 ${fragments}/3${ownsTechnique(save,'archive-meditation')?' · 《藏元诀》已取得':''}</p><button type="button" data-visit ${count>=LIBRARY_DAILY_VISITS?'disabled':''}>入阁翻阅</button>${fragments>=3&&!ownsTechnique(save,'archive-meditation')?'<button type="button" data-claim>领取合成典籍</button>':''}</article>`;
 body.querySelector('[data-visit]')?.addEventListener('click',event=>buttonTask(event.currentTarget,async()=>{
  const {result}=await api.actions.mutate(s=>visitSectLibrary(s),{message:r=>r});
  showSectLibrary(api,onClose);
  document.querySelector('#xg-feature-sheet [role=status]').textContent=result;
 },status));
 body.querySelector('[data-claim]')?.addEventListener('click',event=>buttonTask(event.currentTarget,async()=>{
  const {result}=await api.actions.mutate(s=>claimLibraryManual(s),{message:r=>r});
  showSectLibrary(api,onClose);
  document.querySelector('#xg-feature-sheet [role=status]').textContent=result;
 },status));
}

function showLibraryExam(api,onClose){
 const exam=api.getSave().libraryExam;if(!exam)return showSectLibrary(api,onClose);
 const question=exam.questions[exam.index],sheet=createSheet(`${libraryElderName(api.getSave())}的考校`,onClose),body=sheet.querySelector('[data-body]'),status=sheet.querySelector('[role=status]');
 let selected=[];
 body.innerHTML=`<p>第 ${exam.index+1} / 3 题。依次选两个字填入空格；提交错误，本次考校立即结束。</p><div class="xg-idiom-question">${[...question.idiom].map((char,index)=>{const blank=question.positions.indexOf(index);return blank<0?`<span>${escapeHTML(char)}</span>`:`<span class="xg-idiom-blank" data-blank="${blank}">？</span>`}).join('')}</div><div class="xg-idiom-choices">${question.choices.map((char,index)=>`<button type="button" data-choice="${index}">${escapeHTML(char)}</button>`).join('')}</div><div class="xg-feature-row"><button type="button" data-clear>清除</button><button type="button" data-submit>提交答案</button></div>`;
 const refresh=()=>{
  body.querySelectorAll('[data-blank]').forEach((slot,index)=>slot.textContent=selected[index]===undefined?'？':question.choices[selected[index]]);
  body.querySelectorAll('[data-choice]').forEach(button=>button.classList.toggle('xg-idiom-selected',selected.includes(Number(button.dataset.choice))));
  body.querySelector('[data-submit]').disabled=selected.length!==2;
 };
 body.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>{
  const index=Number(button.dataset.choice);
  if(selected.includes(index))selected=selected.filter(value=>value!==index);
  else if(selected.length<2)selected.push(index);
  refresh();
 });
 body.querySelector('[data-clear]').onclick=()=>{selected=[];refresh()};refresh();
 body.querySelector('[data-submit]').onclick=event=>buttonTask(event.currentTarget,async()=>{
  const answer=selected.map(index=>question.choices[index]).join('');
  const {result}=await api.actions.mutate(s=>answerLibraryExam(s,exam.id,answer),{message:r=>r.startsWith('答对了')?null:r});
  showSectLibrary(api,onClose);
  document.querySelector('#xg-feature-sheet [role=status]').textContent=result;
 },status);
}
