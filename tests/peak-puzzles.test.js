import {indexedDB} from 'fake-indexeddb';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {MAZE_SIZE,MAZE_REQUIREMENTS,mazeDetails} from '../systems/maze.js';
import {SOKOBAN_LEVELS} from '../data/peak-puzzles.js';
import {maybeFindPeakPuzzle,makeMaze,playPeakPuzzle} from '../systems/peak-puzzles.js';
import {takeStroll} from './helpers/stroll.js';
import {migrateSave} from '../storage/migrations.js';
import {showPeakPuzzle} from '../ui/peak-puzzles.js';
const make=()=>migrateSave({slot:'puzzle',player:{realm:'炼气一层',spiritStones:0},inventory:[]});
// Push-state BFS avoids enumerating every walking permutation in the three-box levels.
function solution(p){
 const width=p.rows[0].length,deltas={up:-width,down:width,left:-1,right:1};
 const free=v=>v>=0&&p.rows[Math.floor(v/width)]?.[v%width]===' ';
 const walk=(start,boxes)=>{
  const paths=new Map([[start,[]]]),queue=[start];
  for(let i=0;i<queue.length;i++)for(const [dir,d] of Object.entries(deltas)){
   const q=queue[i]+d;if(!free(q)||boxes.includes(q)||paths.has(q))continue;
   paths.set(q,[...paths.get(queue[i]),dir]);queue.push(q);
  }
  return paths;
 };
 if(p.kind==='maze'){const path=walk(p.player,[]).get(p.goals[0]);if(!path)throw Error('unsolvable maze');return path}
 const queue=[[p.player,p.boxes,[]]],seen=new Set();
 for(let i=0;i<queue.length;i++){
  const [pos,boxes,path]=queue[i],paths=walk(pos,boxes),key=Math.min(...paths.keys())+':'+[...boxes].sort((a,b)=>a-b).join(',');
  if(seen.has(key))continue;seen.add(key);
  if(p.goals.every(g=>boxes.includes(g)))return path;
  for(const b of boxes)for(const [dir,d] of Object.entries(deltas)){
   if(!paths.has(b-d)||!free(b+d)||boxes.includes(b+d))continue;
   queue.push([b,boxes.map(v=>v===b?b+d:v),[...path,...paths.get(b-d),dir]]);
  }
 }
 throw Error('unsolvable');
}
test('encounter boundaries are 5% sokoban, 20% maze, 75% none; unfinished encounter persists',()=>{
 for(const [roll,kind] of [[0,'sokoban'],[.04999,'sokoban'],[.05,'maze'],[.24999,'maze'],[.25,null],[.999,null]]){
  const s=make();assert.equal(maybeFindPeakPuzzle(s,()=>roll),kind);
  if(kind){const before=structuredClone(s.peakPuzzle);assert.equal(maybeFindPeakPuzzle(s,()=>0),null);assert.deepEqual(s.peakPuzzle,before)}
 }
 const s=make();takeStroll(s,'market',Date.now(),()=>0);assert.equal(s.peakPuzzle,undefined);
 takeStroll(s,'spirit-peak',Date.now(),()=>0);assert.equal(s.peakPuzzle.kind,'sokoban');assert.equal(s.stroll.count,2);
});
test('all thirty sokoban levels solve through game rules and award exactly one gift, even after reload',()=>{
 for(let i=0;i<SOKOBAN_LEVELS.length;i++){
  let s=make();s.nextSokobanLevel=i;maybeFindPeakPuzzle(s,()=>0);assert.equal(s.peakPuzzle.levelIndex,i);
  const p=s.peakPuzzle,path=solution(p);assert.ok(path.length>0);if(i>=20)assert.equal(p.boxes.length,3);
  for(const direction of path){s=migrateSave(JSON.parse(JSON.stringify(s)));playPeakPuzzle(s,p.id,direction)}
  assert.equal(s.peakPuzzle,null);assert.equal(s.nextSokobanLevel,(i+1)%SOKOBAN_LEVELS.length);assert.equal(s.inventory.length,1);assert.equal(s.inventory[0].quantity,1);
  const before=structuredClone(s);assert.throws(()=>playPeakPuzzle(s,p.id,'up'));assert.deepEqual(s,before);
 }
});
test('maze generation stays solvable across seeds and pays both reward amounts',()=>{
 for(let seed=1;seed<=40;seed++){
  let state=seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
  const rows=makeMaze(random),m=mazeDetails(rows);assert.equal(rows.length,MAZE_SIZE);assert.ok(solution({kind:'maze',rows,player:m.start,boxes:[],goals:[m.goal]}).length>=MAZE_REQUIREMENTS.steps);
 }
 for(const roll of [.1,.8]){const s=make();let first=true;maybeFindPeakPuzzle(s,()=>{if(first){first=false;return .1}return roll});const p=s.peakPuzzle;for(const d of solution(p))playPeakPuzzle(s,p.id,d);assert.equal(s.player.spiritStones,roll<.5?1:2)}
});
test('walls block movement; undo/reset restore state without rerolling rewards; full bag uses temporary storage',()=>{
 const s=make();maybeFindPeakPuzzle(s,()=>0);const p=s.peakPuzzle,initial=structuredClone(p);
 playPeakPuzzle(s,p.id,'left');assert.deepEqual(p,initial);
 const path=solution(p);playPeakPuzzle(s,p.id,path[0]);playPeakPuzzle(s,p.id,'undo');assert.deepEqual(p,initial);
 playPeakPuzzle(s,p.id,path[0]);playPeakPuzzle(s,p.id,'reset');assert.deepEqual(p,initial);
 s.bagCapacity=0;for(const d of path)playPeakPuzzle(s,p.id,d);assert.equal(s.inventory.length,0);assert.equal(s.temporaryLoot.length,1);
});
test('mobile puzzle controls render and return keeps unfinished game; write errors permit retry',async()=>{
 const {document,window}=parseHTML('<div id="xg-panel"></div>');globalThis.document=document;globalThis.window=window;
 const s=make();maybeFindPeakPuzzle(s,()=>0);let failed=true,closed=false;
 showPeakPuzzle({getSave:()=>s,actions:{mutate:async(fn)=>{if(failed){failed=false;throw Error('保存失败')}return {result:fn(s)}}}},()=>{closed=true});
 assert.equal(document.querySelectorAll('.xg-puzzle-cell').length,42);assert.equal(document.querySelectorAll('[data-move]').length,7);
 const d=solution(s.peakPuzzle)[0];await document.querySelector(`[data-move="${d}"]`).onclick();assert.equal(document.querySelector('[role=status]').textContent,'保存失败');
 await document.querySelector(`[data-move="${d}"]`).onclick();assert.equal(s.peakPuzzle.moves,1);
 document.querySelector('[data-close]').onclick();assert.equal(closed,true);assert.ok(s.peakPuzzle);
});

test('concurrent completion cannot award a second reward',async()=>{
 globalThis.indexedDB=indexedDB;
 const s=make();maybeFindPeakPuzzle(s,()=>0);const id=s.peakPuzzle.id,path=solution(s.peakPuzzle),last=path.pop();
 for(const d of path)playPeakPuzzle(s,id,d);
 await writeSave(s);
 const complete=()=>updateSave(s.slot,stored=>{playPeakPuzzle(stored,id,last);return stored});
 const results=await Promise.allSettled([complete(),complete()]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const stored=await readSave(s.slot);assert.equal(stored.inventory[0].quantity,1);assert.equal(stored.peakPuzzle,null);
});

test('thirty levels appear in order, wrap, and survive reload/reset and intervening mazes',()=>{
 assert.equal(SOKOBAN_LEVELS.length,30);let s=make();
 for(let i=0;i<=SOKOBAN_LEVELS.length;i++){
  maybeFindPeakPuzzle(s,()=>0);const p=s.peakPuzzle;assert.equal(p.levelIndex,i%SOKOBAN_LEVELS.length);
  playPeakPuzzle(s,p.id,'reset');assert.equal(p.levelIndex,i%SOKOBAN_LEVELS.length);
  s=migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(maybeFindPeakPuzzle(s,()=>0),null);
  for(const d of solution(s.peakPuzzle))playPeakPuzzle(s,p.id,d);
  const next=s.nextSokobanLevel;
  maybeFindPeakPuzzle(s,()=>.1);const maze=s.peakPuzzle;
  for(const d of solution(maze))playPeakPuzzle(s,maze.id,d);
  assert.equal(s.nextSokobanLevel,next);
 }
});
test('legacy active boards finish unchanged and continue with their following level',()=>{
 for(const index of [0,4,9]){
  const s=make();s.nextSokobanLevel=index;maybeFindPeakPuzzle(s,()=>0);
  delete s.nextSokobanLevel;delete s.peakPuzzle.levelIndex;
  const p=s.peakPuzzle,path=solution(p);playPeakPuzzle(s,p.id,path.shift());
  const restored=migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored.peakPuzzle,s.peakPuzzle);
  for(const d of path)playPeakPuzzle(restored,p.id,d);
  maybeFindPeakPuzzle(restored,()=>0);assert.equal(restored.peakPuzzle.levelIndex,index+1);
 }
});

test('mazes have meaningful route choices, turns and dead ends, even with constant RNG; layouts vary',()=>{
 const unique=new Set();
 for(let seed=0;seed<100;seed++){
  let state=seed+1;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
  const rows=makeMaze(seed<3?()=>[0,.5,.999][seed]:random),{start,goal}=mazeDetails(rows),width=rows[0].length;
  unique.add(rows.join(''));
  const path=solution({kind:'maze',rows,player:start,boxes:[],goals:[goal]});
  const deltas={up:-width,down:width,left:-1,right:1};let p=start,choices=0,turns=0;
  const degree=p=>Object.values(deltas).filter(d=>rows[Math.floor((p+d)/width)]?.[(p+d)%width]===' ').length;
  path.forEach((dir,i)=>{if(i>0&&degree(p)>=3)choices++;if(i>0&&dir!==path[i-1])turns++;p+=deltas[dir]});
  const dead=rows.flatMap((row,y)=>[...row].flatMap((c,x)=>c===' '&&y*width+x!==start&&y*width+x!==goal&&degree(y*width+x)===1?[1]:[])).length;
  assert.equal(p,goal);assert.ok(path.length>=40);assert.ok(choices>=4);assert.ok(turns>=10);assert.ok(dead>=6);
  assert.ok(rows[0].split('').every(c=>c==='#')&&rows.at(-1).split('').every(c=>c==='#'));
  assert.ok(rows.every(row=>row[0]==='#'&&row.at(-1)==='#'));
 }
 assert.ok(unique.size>75);
});

test('existing 11-square maze survives reload/reset and awards its original reward',()=>{
 let s=make();
 const rows=['###########','#         #',...Array(7).fill('######### #'),'#         #','###########'];
 s.peakPuzzle={id:'legacy-maze',kind:'maze',rows,player:12,boxes:[],goals:[108],reward:{stones:2},initial:{player:12,boxes:[]},history:[],moves:0};
 const original=structuredClone(s.peakPuzzle);assert.equal(maybeFindPeakPuzzle(s,()=>.1),null);
 playPeakPuzzle(s,'legacy-maze','right');s=migrateSave(JSON.parse(JSON.stringify(s)));playPeakPuzzle(s,'legacy-maze','reset');assert.deepEqual(s.peakPuzzle,original);
 for(const d of solution(s.peakPuzzle))playPeakPuzzle(s,'legacy-maze',d);
 assert.equal(s.player.spiritStones,2);assert.equal(s.peakPuzzle,null);
});

test('level twenty finishes without auto-launching and the next encounter starts level twenty-one',()=>{
 const s=make();s.nextSokobanLevel=19;maybeFindPeakPuzzle(s,()=>0);const p=s.peakPuzzle;
 for(const d of solution(p))playPeakPuzzle(s,p.id,d);
 assert.equal(s.peakPuzzle,null);assert.equal(s.nextSokobanLevel,20);
 maybeFindPeakPuzzle(s,()=>0);assert.equal(s.peakPuzzle.levelIndex,20);
});
