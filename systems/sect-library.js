import {LIBRARY_IDIOMS} from '../data/idioms.js';
import {localDay} from './cultivation.js';
import {addItem,awardItem,ownsTechnique} from './inventory.js';

export const LIBRARY_DAILY_VISITS=3;
export const LIBRARY_MANUAL='archive-manual';
export const LIBRARY_ELDERS={
 天工阁:{name:'程守拙',gender:'男'},丹霞谷:{name:'祝岚青',gender:'女'},青岚谷:{name:'沈听溪',gender:'女'},
 合欢宗:{name:'楚绛衣',gender:'女'},万灵山:{name:'陆归林',gender:'男'},凌霄剑宗:{name:'裴寒声',gender:'男'},
 玄机门:{name:'闻观棋',gender:'男'},太虚符宗:{name:'叶书遥',gender:'女'},镇岳宗:{name:'韩听岳',gender:'男'}
};
export const libraryElderName=save=>save.libraryExam?.elder||LIBRARY_ELDERS[save.player.sect]?.name||'藏书阁前辈';
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
 if(!LIBRARY_ELDERS[save.player.sect])throw new Error('当前宗门尚未开放藏书阁。');
 if(save.libraryExam)throw new Error('请先完成当前考校。');
 const count=libraryVisits(save,now);
 if(count>=LIBRARY_DAILY_VISITS)throw new Error('今日已逛过三次藏书阁。');
 save.libraryVisits={day:localDay(now),count:count+1};
 if(!save.libraryDusterReceived&&Number(save.player.stats?.悟性)>=7&&ownsTechnique(save,METHOD_ID)){
  const elder=libraryElderName(save),place=awardItem(save,'library-duster',1,now);
  save.libraryDusterReceived=true;
  return `学海无涯。${elder}见你勤于求学，赠你一把鸡毛掸子，请你帮忙打扫藏书阁。${place==='temporary'?'储物已满，掸子暂存于临时储物区。':'鸡毛掸子已收入储物。'}`;
 }
 if(ownsTechnique(save,METHOD_ID)||(save.libraryFragments||0)>=3)return '你翻看架上旧书，今日无事发生。';
 const fortune=Math.max(0,Number(save.player.stats?.福缘)||0);
 if(Math.random()>=Math.min(1,(20+fortune)/100))return '你翻看架上旧书，今日无事发生。';
 const elder=libraryElderName(save);
 save.libraryExam={id:crypto.randomUUID(),elder,index:0,questions:makeLibraryQuestions()};
 return `${elder}放下扫帚，邀你完成三道成语考校。`;
}
export function answerLibraryExam(save,id,answer){
 const exam=save.libraryExam;
 if(!exam||exam.id!==id)throw new Error('这场考校已经结束。');
 const elder=libraryElderName(save);
 const question=exam.questions[exam.index];
 if(!question||typeof answer!=='string'||answer.length!==2||[...answer].some(letter=>!question.choices.includes(letter)))throw new Error('请从下方选两个字填入空格。');
 if(answer!==question.positions.map(index=>question.idiom[index]).join('')){
  save.libraryExam=null;
  if(save.player.spiritStones>=1){save.player.spiritStones=Math.round((save.player.spiritStones-1)*100)/100;return `答错了，${elder}收起题册；灵石 −1。`}
  save.player.cultivation=Math.round((save.player.cultivation-10)*100)/100;
  return `答错了，${elder}收起题册；灵石不足，修为 −10。`;
 }
 exam.index++;
 if(exam.index<3)return `答对了，${elder}递来下一题（${exam.index+1}/3）。`;
 save.libraryExam=null;
 save.libraryFragments=Math.min(3,(save.libraryFragments||0)+1);
 if(save.libraryFragments<3)return `${elder}赠你一片玉简（${save.libraryFragments}/3）。`;
 if(save.inventory.length>=save.bagCapacity)return '三枚玉简已经合一，请腾出一格储物空间领取《藏元诀》。';
 addItem(save,LIBRARY_MANUAL);
 return `${elder}将三枚玉简合为中级功法《藏元诀》，典籍已收入储物。`;
}
export function claimLibraryManual(save){
 if((save.libraryFragments||0)<3||ownsTechnique(save,METHOD_ID))throw new Error('没有待领取的典籍。');
 addItem(save,LIBRARY_MANUAL);
 return '《藏元诀》已收入储物。';
}
