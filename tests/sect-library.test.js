import test from 'node:test';
import assert from 'node:assert/strict';
import {LIBRARY_IDIOMS} from '../data/idioms.js';
import {LIBRARY_MANUAL,LIBRARY_ELDERS,libraryElderName,makeLibraryQuestions,libraryVisits,visitSectLibrary,answerLibraryExam,claimLibraryManual} from '../systems/sect-library.js';
import {idleLimitMs,settleIdle,localDay} from '../systems/cultivation.js';
import {startLearning,completeLearning,setMainTechnique} from '../systems/techniques.js';
import {equipmentStats,equipItem} from '../systems/inventory.js';
import {repairPrice} from '../systems/sect-services.js';

const minute=60000,day=new Date(2026,8,24).getTime();
function make(fortune=5){return {player:{realm:'炼气一层',sect:'天工阁',stats:{福缘:fortune,神识:5},spiritStones:3,cultivation:0,hp:20},inventory:[],bagCapacity:20,techniques:{mastered:[],main:null,puzzles:{},combat:[]},idle:{day:localDay(day),lastAt:day,usedMs:0,totalEarned:0}}}
function answerAll(save){let result;while(save.libraryExam){const q=save.libraryExam.questions[save.libraryExam.index];result=answerLibraryExam(save,save.libraryExam.id,q.positions.map(i=>q.idiom[i]).join(''))}return result}

test('nine sects have distinct male and female library elders and exams retain their elder',()=>{
 const elders=Object.values(LIBRARY_ELDERS);
 assert.equal(elders.length,9);assert.equal(new Set(elders.map(e=>e.name)).size,9);
 assert.ok(elders.some(e=>e.gender==='男'));assert.ok(elders.some(e=>e.gender==='女'));
 const original=Math.random;
 try{Math.random=()=>0;
  for(const [sect,elder] of Object.entries(LIBRARY_ELDERS)){
   const save=make();save.player.sect=sect;
   assert.match(visitSectLibrary(save,day),new RegExp(elder.name));
   assert.equal(libraryElderName(JSON.parse(JSON.stringify(save))),elder.name);
  }
 }finally{Math.random=original}
});

test('one hundred unique common idioms make distinct three-question rounds and eight choices',()=>{
 assert.equal(LIBRARY_IDIOMS.length,100);assert.equal(new Set(LIBRARY_IDIOMS).size,100);
 assert.ok(LIBRARY_IDIOMS.every(word=>[...word].length===4&&new Set(word).size===4));
 for(let i=0;i<12;i++){
  const questions=makeLibraryQuestions();assert.equal(new Set(questions.map(q=>q.idiom)).size,3);
  for(const q of questions){assert.equal(q.choices.length,8);assert.equal(new Set(q.choices).size,8);assert.ok(q.positions.every(index=>q.choices.includes(q.idiom[index])))}
 }
});

test('three daily visits reset next day and chance uses twenty plus fortune',()=>{
 const s=make(),original=Math.random;
 try{
  Math.random=()=>.249;assert.match(visitSectLibrary(s,day),/考校/);assert.equal(libraryVisits(s,day),1);
  answerAll(s);Math.random=()=>.25;assert.match(visitSectLibrary(s,day),/无事发生/);
  visitSectLibrary(s,day);assert.throws(()=>visitSectLibrary(s,day),/三次/);
  visitSectLibrary(s,day+24*60*minute);assert.equal(libraryVisits(s,day+24*60*minute),1);
 }finally{Math.random=original}
});

test('one wrong answer ends the exam and charges stone, or ten cultivation if short',()=>{
 const s=make(),original=Math.random;
 try{Math.random=()=>0;visitSectLibrary(s,day);const exam=s.libraryExam;
  const first=exam.questions[0];answerLibraryExam(s,exam.id,first.positions.map(i=>first.idiom[i]).join(''));
  const second=exam.questions[1],wrong=second.choices.filter(c=>!second.idiom.includes(c))[0].repeat(2);
  assert.match(answerLibraryExam(s,exam.id,wrong),/灵石 −1/);assert.equal(s.player.spiritStones,2);
  assert.equal(s.libraryExam,null);assert.equal(s.libraryFragments,undefined);assert.throws(()=>answerLibraryExam(s,exam.id,wrong));
  s.player.spiritStones=.5;visitSectLibrary(s,day);assert.match(answerLibraryExam(s,s.libraryExam.id,wrong),/修为 −10/);
  assert.equal(s.player.cultivation,-10);assert.equal(s.player.spiritStones,.5);
 }finally{Math.random=original}
});

test('the same examination resumes after a save reload without another visit',()=>{
 const s=make(),original=Math.random;
 try{Math.random=()=>0;visitSectLibrary(s,day);
  const first=s.libraryExam.questions[0];answerLibraryExam(s,s.libraryExam.id,first.positions.map(i=>first.idiom[i]).join(''));
  const restored=JSON.parse(JSON.stringify(s));assert.equal(libraryVisits(restored,day),1);assert.equal(restored.libraryExam.index,1);
  answerAll(restored);assert.equal(restored.libraryFragments,1);
 }finally{Math.random=original}
});

test('three completed exams yield a nontradeable middle manual and only one main slot',()=>{
 const s=make(),original=Math.random;
 try{Math.random=()=>0;for(let i=0;i<3;i++){visitSectLibrary(s,day);answerAll(s)}
  assert.equal(s.libraryFragments,3);assert.equal(s.inventory.length,1);assert.equal(s.inventory[0].itemId,LIBRARY_MANUAL);
  assert.throws(()=>claimLibraryManual(s));const puzzle=startLearning(s,'archive-meditation');assert.equal(puzzle.size,4);
  puzzle.cells=[...puzzle.solution];completeLearning(s,'archive-meditation');assert.equal(s.inventory.length,0);
  s.techniques.mastered.push('basic-qi-guide');setMainTechnique(s,'basic-qi-guide');setMainTechnique(s,'archive-meditation');
  assert.equal(s.techniques.main,'archive-meditation');assert.equal(idleLimitMs(s),3*60*minute);
  assert.equal(settleIdle(s,day+4*60*minute),90);assert.equal(s.idle.usedMs,3*60*minute);
  s.player.realm='筑基一层';assert.equal(idleLimitMs(s),5*60*minute);
  s.player.realm='金丹一层';assert.equal(idleLimitMs(s),5*60*minute);
  setMainTechnique(s,'basic-qi-guide');assert.equal(idleLimitMs(s),2*60*minute);
 }finally{Math.random=original}
});

test('full bag keeps the synthesized manual claimable after freeing space',()=>{
 const s=make(),original=Math.random;s.bagCapacity=1;s.inventory.push({uid:'occupied',itemId:'ore',quantity:1});
 try{Math.random=()=>0;for(let i=0;i<3;i++){visitSectLibrary(s,day);answerAll(s)}
  assert.equal(s.libraryFragments,3);assert.equal(s.inventory.length,1);
  assert.throws(()=>claimLibraryManual(s),/储物格已满/);
  s.inventory=[];claimLibraryManual(s);assert.equal(s.inventory[0].itemId,LIBRARY_MANUAL);
 }finally{Math.random=original}
});
test('high aptitude earns one duster on returning after obtaining the manual; bonus grows at foundation',()=>{
 const s=make();s.player.stats.悟性=7;s.player.combat={hp:20,mp:10,attack:3,defense:0,speed:2};s.equipment={weapon:null};
 s.inventory.push({uid:'manual',itemId:LIBRARY_MANUAL,quantity:1});
 const message=visitSectLibrary(s,day);assert.match(message,/学海无涯/);
 const duster=s.inventory.find(e=>e.itemId==='library-duster');assert.equal(duster.durability,15);
 equipItem(s,duster.uid);assert.equal(equipmentStats(s).attack,4.5);
 s.player.realm='筑基一层';assert.equal(equipmentStats(s).attack,6);
 duster.durability=13;assert.equal(repairPrice(duster),.4);
 visitSectLibrary(s,day);assert.equal(s.inventory.filter(e=>e.itemId==='library-duster').length,1);
 assert.equal(s.libraryDusterReceived,true);
});
