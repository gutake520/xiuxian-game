import {indexedDB} from 'fake-indexeddb';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {SOKOBAN_LEVELS} from '../data/peak-puzzles.js';
import {maybeFindPeakPuzzle,makeMaze,playPeakPuzzle} from '../systems/peak-puzzles.js';
import {takeStroll} from '../systems/stroll.js';
import {migrateSave} from '../storage/migrations.js';
import {showPeakPuzzle} from '../ui/peak-puzzles.js';
const make=()=>migrateSave({slot:'puzzle',player:{realm:'炼气一层',spiritStones:0},inventory:[]});
function solution(p){
 const width=p.rows[0].length,deltas={up:-width,down:width,left:-1,right:1},queue=[[p.player,p.boxes,[]]],seen=new Set();
 for(let i=0;i<queue.length;i++){
  const [pos,boxes,path]=queue[i],key=pos+':'+[...boxes].sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);
  if(p.kind==='maze'?pos===p.goals[0]:p.goals.every(g=>boxes.includes(g)))return path;
  for(const [dir,d] of Object.entries(deltas)){
   const n=pos+d,b=n+d,free=v=>p.rows[Math.floor(v/width)]?.[v%width]===' ';
   if(!free(n)||boxes.includes(n)&&(!free(b)||boxes.includes(b)))continue;
   queue.push([n,boxes.map(v=>v===n?b:v),[...path,dir]]);
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
test('all twenty sokoban levels solve through game rules and award exactly one gift, even after reload',()=>{
 for(let i=0;i<SOKOBAN_LEVELS.length;i++){
  let s=make();s.nextSokobanLevel=i;maybeFindPeakPuzzle(s,()=>0);assert.equal(s.peakPuzzle.levelIndex,i);
  const p=s.peakPuzzle,path=solution(p);assert.ok(path.length>0);
  for(const direction of path){s=migrateSave(JSON.parse(JSON.stringify(s)));playPeakPuzzle(s,p.id,direction)}
  assert.equal(s.peakPuzzle,null);assert.equal(s.nextSokobanLevel,(i+1)%20);assert.equal(s.inventory.length,1);assert.equal(s.inventory[0].quantity,1);
  const before=structuredClone(s);assert.throws(()=>playPeakPuzzle(s,p.id,'up'));assert.deepEqual(s,before);
 }
});
test('maze generation stays solvable across seeds and pays both reward amounts',()=>{
 for(let seed=1;seed<=40;seed++){
  let state=seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
  const rows=makeMaze(random);assert.equal(rows.length,11);assert.ok(solution({kind:'maze',rows,player:12,boxes:[],goals:[108]}).length);
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
 assert.equal(document.querySelectorAll('.xg-puzzle-cell').length,42);assert.equal(document.querySelectorAll('[data-move]').length,6);
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

test('twenty levels appear in order, wrap, and survive reload/reset and intervening mazes',()=>{
 assert.equal(SOKOBAN_LEVELS.length,20);let s=make();
 for(let i=0;i<21;i++){
  maybeFindPeakPuzzle(s,()=>0);const p=s.peakPuzzle;assert.equal(p.levelIndex,i%20);
  playPeakPuzzle(s,p.id,'reset');assert.equal(p.levelIndex,i%20);
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
