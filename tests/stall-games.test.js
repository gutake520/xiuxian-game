import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {offerStallGame,startGomoku,moveGomoku,startDice,revealDice,leaveStallGame} from '../systems/stall-games.js';
import {fiveInRow,chooseGomokuMove} from '../systems/gomoku.js';
import {takeStroll,strollEncounterCount} from '../systems/stroll.js';
import {showStallGame} from '../ui/stall-games.js';
const make=()=>migrateSave({slot:'stall',player:{realm:'炼气一层',spiritRoot:'金灵根',spiritStones:20,stats:{福缘:5}},inventory:[]});
function offer(s,kind){offerStallGame(s,kind);return s.stallGames[kind].id}
function line(board,side,positions){for(const p of positions)board[p]=side;return board}
test('gomoku and dice encounter boundaries and one offer per encounter',()=>{
 for(const [roll,found] of [[.2999,true],[.3,false]]){const s=make();let i=0;takeStroll(s,'market',Date.now(),()=>i++===0?0:roll);assert.equal(!!s.stallGames?.gomoku,found);assert.equal(strollEncounterCount(s),found?1:0)}
 for(const [roll,found] of [[.3/ .9-1e-6,true],[.3/.9,false]]){const s=make();const r=[0,.99,roll,.99];takeStroll(s,'blackmarket',Date.now(),()=>r.shift()??.99);assert.equal(!!s.stallGames?.dice,found);assert.equal(strollEncounterCount(s),found?1:0)}
 const s=make();takeStroll(s,'market',Date.now(),()=>0);const id=s.stallGames.gomoku.id;
 takeStroll(s,'market',Date.now(),()=>0);assert.equal(s.stallGames.gomoku.id,id);assert.equal(strollEncounterCount(s),1);
 leaveStallGame(s,'gomoku',id);takeStroll(s,'market',Date.now(),()=>0);assert.notEqual(s.stallGames.gomoku.id,id);assert.equal(strollEncounterCount(s),2);
});
test('five detection respects edges and all four axes; AI takes wins, blocks and leaves low difficulty forgiving',()=>{
 for(const positions of [[80,81,82,83,84],[6,19,32,45,58],[0,14,28,42,56],[12,24,36,48,60]]){const b=line(Array(169).fill(0),1,positions);assert.equal(fiveInRow(b,positions[2],1),true)}
 assert.equal(fiveInRow(line(Array(169).fill(0),1,[11,12,13,14,15]),13,1),false);
 for(const difficulty of ['medium','hard']){
  const b=line(Array(169).fill(0),2,[80,81,82,83]),before=[...b];assert.ok([79,84].includes(chooseGomokuMove(b,difficulty,()=>.9)));assert.deepEqual(b,before);
  const blocked=line(Array(169).fill(0),1,[80,81,82,83]);blocked[79]=2;assert.equal(chooseGomokuMove(blocked,difficulty,()=>.9),84);
 }
 const easy=line(Array(169).fill(0),2,[80,81,82,83]);assert.ok(![79,84].includes(chooseGomokuMove(easy,'easy',()=>.5)));
 const b=Array(169).fill(0);b[84]=1;const before=[...b];const move=chooseGomokuMove(b,'hard');assert.equal(b[move],0);assert.deepEqual(b,before);
});
test('bets validate before debit, starting is idempotent, saved turns survive reload and stale clicks fail',()=>{
 const s=make(),id=offer(s,'gomoku');
 for(const [level,bet] of [['easy',1],['medium',6],['medium',-1],['medium',1.5],['bogus',1],['medium',NaN]]){const before=JSON.stringify(s);assert.throws(()=>startGomoku(s,id,level,bet));assert.equal(JSON.stringify(s),before)}
 s.player.spiritStones=4;assert.throws(()=>startGomoku(s,id,'hard',5));s.player.spiritStones=20;
 startGomoku(s,id,'hard',5);assert.equal(s.player.spiritStones,15);assert.throws(()=>startGomoku(s,id,'hard',5));
 moveGomoku(s,id,84,0);const loaded=migrateSave(JSON.parse(JSON.stringify(s)));assert.equal(loaded.stallGames.gomoku.ply,2);assert.equal(loaded.player.spiritStones,15);
 const before=JSON.stringify(loaded);assert.throws(()=>moveGomoku(loaded,id,85,0));assert.equal(JSON.stringify(loaded),before);
});
test('wins pay twice the stake, AI victories and resignations keep the prepaid stake',()=>{
 for(const outcome of ['win','loss','resign']){
  const s=make(),id=offer(s,'gomoku');startGomoku(s,id,'medium',5);const g=s.stallGames.gomoku;
  if(outcome==='resign')leaveStallGame(s,'gomoku',id);
  else{line(g.board,outcome==='win'?1:2,[80,81,82,83]);moveGomoku(s,id,outcome==='win'?84:0,0)}
  assert.equal(g.phase,'done');assert.equal(s.player.spiritStones,outcome==='win'?25:15);
  assert.throws(()=>moveGomoku(s,id,1,g.ply));assert.throws(()=>leaveStallGame(s,'gomoku',id));
 }
});
test('a full board without five refunds the stake',()=>{
 const s=make(),id=offer(s,'gomoku');startGomoku(s,id,'hard',5);const g=s.stallGames.gomoku;
 // Alternating pairs prevent runs of five horizontally, vertically and diagonally.
 g.board=Array.from({length:169},(_,i)=>(Math.floor((i%13)/2)+Math.floor(i/13))%2+1);
 for(let i=0;i<169;i++)assert.equal(fiveInRow(g.board,i,g.board[i]),false);
 const last=g.board.findIndex(v=>v===1);g.board[last]=0;moveGomoku(s,id,last,0);assert.equal(g.outcome,'draw');assert.equal(s.player.spiritStones,20);
});
test('dice favors the house for either guess; stored result cannot reroll or pay twice',()=>{
 for(const guess of ['big','small'])for(const [roll,won] of [[0,true],[.19999,true],[.2,false],[.99,false]]){
  const s=make(),id=offer(s,'dice');const values=[roll,.9,0];startDice(s,id,guess,5,()=>values.shift());
  assert.equal(s.player.spiritStones,15);const g=s.stallGames.dice;assert.equal(g.won,won);assert.equal(g.face>=4,won?guess==='big':guess!=='big');
  assert.throws(()=>startDice(s,id,guess,5));const loaded=migrateSave(JSON.parse(JSON.stringify(s)));assert.equal(loaded.stallGames.dice.face,g.face);
  revealDice(loaded,id);assert.equal(loaded.player.spiritStones,won?25:15);assert.throws(()=>revealDice(loaded,id));
 }
 const s=make(),id=offer(s,'dice');for(const bet of [0,-1,6,1.1,Infinity])assert.throws(()=>startDice(s,id,'big',bet));assert.equal(s.player.spiritStones,20);
});
test('atomic simultaneous start and reveal charge and pay exactly once; transaction abort preserves offer',async()=>{
 globalThis.indexedDB=indexedDB;const s=make(),id=offer(s,'dice');await writeSave(s);
 await assert.rejects(updateSave(s.slot,next=>{startDice(next,id,'big',5,()=>0);throw Error('write failed')}));assert.equal((await readSave(s.slot)).player.spiritStones,20);
 const starts=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,next=>{startDice(next,id,'big',5,()=>0);return next})));assert.equal(starts.filter(r=>r.status==='fulfilled').length,1);
 const ends=await Promise.allSettled([1,2].map(()=>updateSave(s.slot,next=>{revealDice(next,id);return next})));assert.equal(ends.filter(r=>r.status==='fulfilled').length,1);assert.equal((await readSave(s.slot)).player.spiritStones,25);
});
test('mobile UI requires selecting then confirming; errors retry, return resumes, dice hides the saved face',async t=>{
 const previous=globalThis.document;globalThis.document=parseHTML('<html><body><div id="xg-panel"></div></body></html>').document;t.after(()=>{globalThis.document=previous});
 const s=make(),id=offer(s,'gomoku');startGomoku(s,id,'easy',0);let fail=true,returned=false;
 const api={getSave:()=>s,actions:{mutate:async fn=>{if(fail){fail=false;throw Error('写入失败')}return {result:fn(s)}}}};
 showStallGame(api,'gomoku',()=>{returned=true});assert.equal(document.querySelectorAll('[data-cell]').length,169);
 document.querySelector('[data-cell="84"]').onclick();assert.equal(s.stallGames.gomoku.ply,0);await document.querySelector('[data-confirm]').onclick();assert.match(document.querySelector('[role=status]').textContent,/写入失败/);
 document.querySelector('[data-cell="84"]').onclick();await document.querySelector('[data-confirm]').onclick();assert.equal(s.stallGames.gomoku.ply,2);
 document.querySelector('[data-close]').onclick();assert.equal(returned,true);showStallGame(api,'gomoku',()=>{});assert.equal(document.querySelectorAll('.is-black').length,1);
 const dice=offer(s,'dice');startDice(s,dice,'big',5,()=>0);showStallGame(api,'dice',()=>{});assert.doesNotMatch(document.body.textContent,/4点|20%|80%/);await document.querySelector('[data-reveal]').onclick();assert.match(document.body.textContent,/4点/);
});
