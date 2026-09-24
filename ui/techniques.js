import {TECHNIQUES} from '../data/techniques.js';
import {startLearning,writePuzzleCell,useHint,completeLearning,setMainTechnique,toggleCombatTechnique} from '../systems/techniques.js';
import {hasManual} from '../systems/inventory.js';
import {createSheet,escapeHTML,buttonTask} from './shared.js';
export function techniqueLibrary(api,onClose){
 const sheet=createSheet('功法典籍',onClose),body=sheet.querySelector('[data-body]'),message=sheet.querySelector('[role=status]');
 const save=api.getSave();const methods=Object.values(TECHNIQUES).filter(m=>hasManual(save,m.id)||save.techniques.mastered.includes(m.id)||m.sect&&save.player.sect===m.sect&&save.techniques.sectManuals?.includes(m.id));
 const fragments=save.herbalistFragments||0;
 body.innerHTML=(fragments>0&&fragments<3?`<p>残缺玉简 ${fragments}/3</p>`:'')+(save.libraryFragments>0&&!save.techniques.mastered.includes('archive-meditation')?`<p>藏书阁玉简 ${save.libraryFragments}/3${save.libraryFragments>=3?' · 请前往藏书阁领取典籍':''}</p>`:'')+(methods.length?methods.map(m=>{const learned=save.techniques.mastered.includes(m.id),main=save.techniques.main===m.id,equipped=save.techniques.combat?.includes(m.id);return `<article class="xg-feature-card"><h3>${m.name}<small>${learned?'已学会':'待参悟'}${main?' · 主修':''}${equipped?' · 已装备':''}</small></h3><p>${m.description}</p><button type="button" data-method="${m.id}" data-learned="${learned}">${learned?m.type==='combat'?(equipped?'卸下战斗功法':'装备战斗功法'):m.type==='craft'?'已学会':main?'卸下主修':'设为主修':'参悟数阵'}</button></article>`}).join(''):'<p>尚无典籍。可在坊市购买，或拜入宗门领取。</p>');
 body.querySelectorAll('[data-method]').forEach(button=>button.onclick=()=>buttonTask(button,async()=>{
  const id=button.dataset.method;
  if(button.dataset.learned==='true'){if(TECHNIQUES[id].type==='craft')return;await api.actions.mutate(s=>TECHNIQUES[id].type==='combat'?toggleCombatTechnique(s,id):setMainTechnique(s,s.techniques.main===id?null:id));if(!sheet.isConnected)return;techniqueLibrary(api,onClose)}
  else{await api.actions.mutate(s=>startLearning(s,id));if(!sheet.isConnected)return;learningPuzzle(api,id,()=>techniqueLibrary(api,onClose))}
 },message));
}
export function learningPuzzle(api,id,onClose,selected=-1){
 const puzzle=api.getSave().techniques.puzzles[id];if(!puzzle){onClose();return}
 const upgrade=id.startsWith('upgrade:'),method=TECHNIQUES[upgrade?id.slice(8):id];
 const sheet=createSheet((upgrade?'精进':'参悟')+' · '+method.name,onClose),body=sheet.querySelector('[data-body]'),message=sheet.querySelector('[role=status]');
 body.innerHTML=`<p>每行、每列填入 1～${puzzle.size}，数字不可重复。亮色格可填写。</p><div class="xg-number-grid" style="--size:${puzzle.size}" role="group" aria-label="学习数阵">${puzzle.cells.map((v,i)=>`<button type="button" data-cell="${i}" class="${puzzle.givens[i]?'xg-puzzle-given':''} ${i===selected?'xg-puzzle-selected':''}" ${puzzle.givens[i]?'disabled':''} aria-label="第 ${Math.floor(i/puzzle.size)+1} 行第 ${i%puzzle.size+1} 列，${v||'空'}">${v||'·'}</button>`).join('')}</div><div class="xg-number-pad">${Array.from({length:puzzle.size},(_,i)=>`<button type="button" data-number="${i+1}">${i+1}</button>`).join('')}<button type="button" data-number="0">清除</button></div><div class="xg-feature-row"><button type="button" data-hint ${puzzle.hintsUsed>=puzzle.hintLimit?'disabled':''}>灵光提示 ${puzzle.hintLimit-puzzle.hintsUsed}/${puzzle.hintLimit}</button><button type="button" data-submit>完成参悟</button></div><small>学习进度与已用提示自动保存，返回后可继续。</small>`;
 body.querySelectorAll('[data-cell]').forEach(button=>button.onclick=()=>{selected=Number(button.dataset.cell);body.querySelectorAll('[data-cell]').forEach(b=>b.classList.toggle('xg-puzzle-selected',Number(b.dataset.cell)===selected))});
 let busy=false;
 const edit=async(task)=>{if(busy)return;busy=true;sheet.querySelectorAll('button').forEach(b=>b.disabled=true);try{await task()}catch(e){message.textContent=e.message}finally{busy=false;if(sheet.isConnected){const text=message.textContent;learningPuzzle(api,id,onClose,selected);document.querySelector('#xg-feature-sheet [role=status]').textContent=text}}};
 body.querySelectorAll('[data-number]').forEach(button=>button.onclick=()=>{if(selected<0){message.textContent='先点选一个空格。';return}edit(()=>api.actions.mutate(s=>writePuzzleCell(s,id,selected,Number(button.dataset.number))))});
 body.querySelector('[data-hint]').onclick=()=>edit(async()=>{const response=await api.actions.mutate(s=>useHint(s,id));selected=response.result});
 body.querySelector('[data-submit]').onclick=()=>edit(async()=>{
  await api.actions.mutate(s=>completeLearning(s,id),{message:'解开数阵，'+(upgrade?'精进':'学会')+'《'+method.name+'》。'});
  if(!sheet.isConnected)return;onClose();document.querySelector('#xg-feature-sheet [role=status]').textContent=upgrade?'功法已精进至中级。':method.type==='craft'?'已学会，可前往宗门专属房间使用。':method.type==='combat'?'已学会，可以在典籍中装备。':'已学会！设为主修后开始挂机积累。';
 });
}
