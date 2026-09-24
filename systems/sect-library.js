import {LIBRARY_IDIOMS} from '../data/idioms.js';
import {localDay} from './cultivation.js';
import {addItem,ownsTechnique} from './inventory.js';

export const LIBRARY_DAILY_VISITS=3;
export const LIBRARY_MANUAL='archive-manual';
const METHOD_ID='archive-meditation';
const shuffle=values=>{for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]]}return values};

export function libraryVisits(save,now=Date.now()){
 return save.libraryVisits?.day===localDay(now)?save.libraryVisits.count:0;
}
export function makeLibraryQuestions(){
 const idioms=shuffle([...LIBRARY_IDIOMS]).slice(0,3);
 const letters=[...new Set(LIBRARY_IDIOMS.join(''))];
 return idioms.map(idiom=>{
  const start=Math.floor(Math.random()*3),positions=[start,start+1];
  const correct=positions.map(index=>idiom[index]);
  const distractors=shuffle(letters.filter(letter=>!idiom.includes(letter))).slice(0,6);
  return {idiom,positions,choices:shuffle([...correct,...distractors])};
 });
}
export function visitSectLibrary(save,now=Date.now()){
 if(!save.player.sect||save.player.sect==='无门无派')throw new Error('请先加入宗门。');
 if(save.libraryExam)throw new Error('请先完成当前考校。');
 const count=libraryVisits(save,now);
 if(count>=LIBRARY_DAILY_VISITS)throw new Error('今日已逛过三次藏书阁。');
 save.libraryVisits={day:localDay(now),count:count+1};
 if(ownsTechnique(save,METHOD_ID)||(save.libraryFragments||0)>=3)return '你翻看架上旧书，今日无事发生。';
 const fortune=Math.max(0,Number(save.player.stats?.福缘)||0);
 if(Math.random()>=Math.min(1,(20+fortune)/100))return '你翻看架上旧书，今日无事发生。';
 save.libraryExam={id:crypto.randomUUID(),index:0,questions:makeLibraryQuestions()};
 return '扫地长者拦住你，邀你完成三道成语考校。';
}
export function answerLibraryExam(save,id,answer){
 const exam=save.libraryExam;
 if(!exam||exam.id!==id)throw new Error('这场考校已经结束。');
 const question=exam.questions[exam.index];
 if(!question||typeof answer!=='string'||answer.length!==2||[...answer].some(letter=>!question.choices.includes(letter)))throw new Error('请从下方选两个字填入空格。');
 if(answer!==question.positions.map(index=>question.idiom[index]).join('')){
  save.libraryExam=null;
  if(save.player.spiritStones>=1){save.player.spiritStones=Math.round((save.player.spiritStones-1)*100)/100;return '答错了，考校结束，灵石 −1。'}
  save.player.cultivation=Math.round((save.player.cultivation-10)*100)/100;
  return '答错了，考校结束；灵石不足，修为 −10。';
 }
 exam.index++;
 if(exam.index<3)return `答对了，继续下一题（${exam.index+1}/3）。`;
 save.libraryExam=null;
 save.libraryFragments=Math.min(3,(save.libraryFragments||0)+1);
 if(save.libraryFragments<3)return `考校通过，获得玉简一片（${save.libraryFragments}/3）。`;
 if(save.inventory.length>=save.bagCapacity)return '三枚玉简已经合一，请腾出一格储物空间领取《藏元诀》。';
 addItem(save,LIBRARY_MANUAL);
 return '三枚玉简合为中级功法《藏元诀》，典籍已收入储物。';
}
export function claimLibraryManual(save){
 if((save.libraryFragments||0)<3||ownsTechnique(save,METHOD_ID))throw new Error('没有待领取的典籍。');
 addItem(save,LIBRARY_MANUAL);
 return '《藏元诀》已收入储物。';
}
