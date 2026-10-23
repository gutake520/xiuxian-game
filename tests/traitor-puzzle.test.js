import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {indexedDB} from 'fake-indexeddb';
import {TRAITOR_LEVELS} from '../data/traitor-levels.js';
import {maybeFindTraitor,playTraitor,checkTraitors} from '../systems/traitor-puzzle.js';
import {takeStroll,strollEncounterCount} from '../systems/stroll.js';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {showTraitorPuzzle} from '../ui/traitor-puzzle.js';
import {showStroll} from '../ui/stroll.js';
const make=()=>migrateSave({slot:'traitor-test',player:{realm:'炼气一层',spiritRoot:'金灵根',spiritStones:20},inventory:[]});
// Independent exhaustive row-by-row solver: stop after two distinct answers.
function solutions(level){
 const result=[],n=level.size;
 function search(path,cols,groups){
  const r=path.length;if(r===n){result.push(path);return}
  for(let c=0;c<n&&result.length<2;c++){
   const g=Number(level.regions[r][c]);
   if(cols&(1<<c)||groups&(1<<g)||r&&Math.abs(c-path[r-1])<=1)continue;
   search([...path,c],cols|(1<<c),groups|(1<<g));
  }
 }
 search([],0,0);return result;
}
// Human-style logical deduction only: each group contains a target, so any cell
// conflicting with every candidate of that group can be crossed out. No guessing.
function deduction(level){
 const n=level.size,N=n*n,live=new Set(Array.from({length:N},(_,i)=>i));
 const row=p=>Math.floor(p/n),col=p=>p%n,region=p=>level.regions[row(p)][col(p)];
 const conflict=(p,q)=>p!==q&&(row(p)===row(q)||col(p)===col(q)||region(p)===region(q)||(Math.abs(row(p)-row(q))<=1&&Math.abs(col(p)-col(q))<=1));
 const groups=[];
 for(const fn of [row,col,region])for(let i=0;i<n;i++)groups.push([...live].filter(p=>String(fn(p))===String(i)));
 let steps=0,advanced=0,maxGroup=1;
 while(live.size>n){
  let changed=false;
  for(const cand of groups.map(g=>g.filter(p=>live.has(p))).sort((a,b)=>a.length-b.length)){
   assert.ok(cand.length);
   const excluded=[...live].filter(q=>cand.every(p=>conflict(p,q)));
   if(!excluded.length)continue;
   excluded.forEach(p=>live.delete(p));steps++;if(cand.length>1)advanced++;maxGroup=Math.max(maxGroup,cand.length);changed=true;break;
  }
  assert.ok(changed,'level must be solvable by deduction without guessing');
 }
 return {steps,advanced,maxGroup,score:steps+advanced*3};
}

test('twenty fixed connected boards each have exactly one answer and increasing deduction workload',()=>{
 assert.equal(TRAITOR_LEVELS.length,20);const boards=new Set();let previous=0;
 for(const l of TRAITOR_LEVELS){
  assert.equal(l.regions.length,l.size);assert.ok(l.regions.every(r=>r.length===l.size&&/^[0-9]+$/.test(r)));
  const n=l.size;const key=l.regions.join('/');assert.ok(!boards.has(key));boards.add(key);
  for(let g=0;g<n;g++){
   const cells=new Set(l.regions.flatMap((r,y)=>[...r].flatMap((v,x)=>Number(v)===g?[y*n+x]:[])));
   assert.ok(cells.size);const todo=[cells.values().next().value],seen=new Set(todo);
   while(todo.length){const p=todo.pop(),r=Math.floor(p/n),c=p%n;for(const [y,x] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]){const q=y*n+x;if(y>=0&&y<n&&x>=0&&x<n&&cells.has(q)&&!seen.has(q)){seen.add(q);todo.push(q)}}}
   assert.equal(seen.size,cells.size,'each color must form one connected region');
  }
  const answers=solutions(l);assert.equal(answers.length,1);
  const marks=Array(n*n).fill(0);answers[0].forEach((c,r)=>marks[r*n+c]=2);assert.equal(checkTraitors(l,marks),null);
  const stats=deduction(l);assert.deepEqual(stats,l.difficulty);assert.ok(stats.score>=previous);previous=stats.score;
 }
});

test('only sect strolls trigger; quota, active investigation and all twenty completions are respected',()=>{
 const now=Date.now(),s=make();takeStroll(s,'market',now,()=>.99);assert.equal(s.traitorPuzzle,undefined);
 takeStroll(s,'sects',now,()=>0);assert.equal(s.traitorPuzzle.levelIndex,0);assert.equal(strollEncounterCount(s,now),1);
 const first=structuredClone(s.traitorPuzzle);takeStroll(s,'sects',now,()=>0);assert.deepEqual(s.traitorPuzzle,first);assert.equal(strollEncounterCount(s,now),1);
 s.traitorPuzzle=null;s.stroll.encounters=7;takeStroll(s,'sects',now,()=>0);assert.equal(s.traitorPuzzle,null);
 takeStroll(s,'sects',now+86400000,()=>0);assert.ok(s.traitorPuzzle);assert.equal(strollEncounterCount(s,now+86400000),1);
 for(const roll of [.15,.99])assert.equal(maybeFindTraitor(make(),()=>roll),false);
 const done=make();done.traitorProgress=20;assert.equal(maybeFindTraitor(done,()=>0),false);
 for(let i=0;i<9;i++){const s=make();let call=0;maybeFindTraitor(s,()=>call++===0?0:(i+.1)/9);assert.ok(s.traitorPuzzle.sect)}
});

test('twenty encounters advance once each, survive reload, and never launch a next board on completion',()=>{
 let s=make(),total=20;
 for(let i=0;i<20;i++){
  assert.equal(maybeFindTraitor(s,()=>0),true);const p=s.traitorPuzzle;assert.equal(p.levelIndex,i);
  const l=TRAITOR_LEVELS[i],answer=solutions(l)[0];
  for(const [r,c] of answer.entries()){playTraitor(s,p.id,'suspect',r*l.size+c);s=migrateSave(JSON.parse(JSON.stringify(s)))}
  const result=playTraitor(s,p.id,'submit');assert.equal(result.completed,true);total+=result.reward;
  assert.equal(s.traitorProgress,i+1);assert.equal(s.traitorPuzzle,null);assert.equal(s.player.spiritStones,total);
  const before=structuredClone(s);assert.throws(()=>playTraitor(s,p.id,'submit'));assert.deepEqual(s,before);
 }
 assert.equal(maybeFindTraitor(s,()=>0),false);
});

test('marks, undo, reset, invalid submissions and stale/battle actions preserve progress and rewards',()=>{
 const s=make();maybeFindTraitor(s,()=>0);const id=s.traitorPuzzle.id;
 playTraitor(s,id,'clear',0);assert.equal(s.traitorPuzzle.marks[0],1);
 playTraitor(s,id,'suspect',0);assert.equal(s.traitorPuzzle.marks[0],2);
 playTraitor(s,id,'undo');assert.equal(s.traitorPuzzle.marks[0],1);
 playTraitor(s,id,'reset');assert.ok(s.traitorPuzzle.marks.every(x=>x===0));playTraitor(s,id,'undo');assert.equal(s.traitorPuzzle.marks[0],1);
 const before=structuredClone(s);
 for(const [action,index] of [['submit'],['clear',-1],['suspect',1.2],['suspect',999],['bad']])assert.throws(()=>playTraitor(s,id,action,index));
 assert.deepEqual(s,before);assert.throws(()=>playTraitor(s,'stale','reset'));
 s.battle={};assert.throws(()=>playTraitor(s,id,'clear',1));
 const level=TRAITOR_LEVELS[0],n=level.size;
 const mark=positions=>Array.from({length:n*n},(_,i)=>positions.includes(i)?2:0);
 assert.match(checkTraitors(level,mark(Array.from({length:n},(_,i)=>i))),/同一行/);
 assert.match(checkTraitors(level,mark(Array.from({length:n},(_,i)=>i*n))),/同一列/);
});

test('transactional completion pays only once under repeated submissions',async()=>{
 globalThis.indexedDB=indexedDB;const s=make();maybeFindTraitor(s,()=>0);const p=s.traitorPuzzle,l=TRAITOR_LEVELS[0];
 solutions(l)[0].forEach((c,r)=>playTraitor(s,p.id,'suspect',r*l.size+c));await writeSave(s);
 const results=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,next=>{playTraitor(next,p.id,'submit');return next})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const stored=await readSave(s.slot);assert.equal(stored.player.spiritStones,22);assert.equal(stored.traitorProgress,1);
});

test('UI restores marks, handles write failure, and ends with a single settlement screen',async t=>{
 const {document}=parseHTML('<html><body><main id="xg-panel"></main></body></html>');const old=globalThis.document;globalThis.document=document;t.after(()=>globalThis.document=old);
 const s=make();maybeFindTraitor(s,()=>0);let fail=false;
 const api={getSave:()=>s,actions:{mutate:async fn=>{if(fail)throw Error('写入失败');return {result:fn(s)}}}};
 const close=()=>showStroll(api,()=>{});
 showStroll(api,()=>{});document.querySelector('[data-traitor-puzzle]').click();assert.equal(document.querySelectorAll('[data-cell]').length,16);
 await document.querySelector('[data-cell="0"]').onclick();assert.equal(s.traitorPuzzle.marks[0],2);
 document.querySelector('[data-mode="clear"]').click();await document.querySelector('[data-cell="0"]').onclick();assert.equal(s.traitorPuzzle.marks[0],1);
 document.querySelector('[data-close]').click();document.querySelector('[data-traitor-puzzle]').click();assert.ok(document.querySelector('[data-cell="0"]').classList.contains('is-cleared'));
 fail=true;await document.querySelector('[data-cell="1"]').onclick();assert.match(document.querySelector('[role=status]').textContent,/写入失败/);assert.equal(document.querySelector('[data-cell="1"]').disabled,false);fail=false;
 await document.querySelector('[data-action="submit"]').onclick();assert.ok(s.traitorPuzzle);assert.equal(s.traitorProgress,undefined);
 await document.querySelector('[data-action="reset"]').onclick();const l=TRAITOR_LEVELS[0];
 for(const [r,c] of solutions(l)[0].entries())await document.querySelector(`[data-cell="${r*l.size+c}"]`).onclick();
 await document.querySelector('[data-action="submit"]').onclick();assert.equal(s.traitorPuzzle,null);assert.match(document.body.textContent,/叛徒尽数落网/);assert.equal(document.querySelectorAll('[data-cell]').length,0);
 document.querySelector('[data-finish]').click();assert.equal(document.querySelector('[data-traitor-puzzle]'),null);
 // An old open board cannot write into a different selected save slot.
 maybeFindTraitor(s,()=>0);showTraitorPuzzle(api,close);const marks=[...s.traitorPuzzle.marks];s.slot='another-slot';await document.querySelector('[data-cell="0"]').onclick();assert.deepEqual(s.traitorPuzzle.marks,marks);
});
