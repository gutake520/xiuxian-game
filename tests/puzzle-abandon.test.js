import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {migrateSave} from '../storage/migrations.js';
import {maybeFindPeakPuzzle,playPeakPuzzle} from '../systems/peak-puzzles.js';
import {maybeFindTraitor,playTraitor} from '../systems/traitor-puzzle.js';
import {showPeakPuzzle} from '../ui/peak-puzzles.js';
import {showTraitorPuzzle} from '../ui/traitor-puzzle.js';
const make=()=>migrateSave({slot:'slot1',player:{realm:'炼气一层',spiritStones:20},inventory:[],nextSokobanLevel:21,traitorProgress:23,stroll:{day:'2026-10-23',encounters:7},strollExtra:{day:'2026-10-23',purchased:2}});
test('abandon frees both peak types and traitor without rewards, quota refunds or progression',()=>{
 for(const kind of ['sokoban','maze','traitor']){
  const s=make(),key=kind==='traitor'?'traitorPuzzle':'peakPuzzle',play=kind==='traitor'?playTraitor:playPeakPuzzle;
  if(kind==='traitor')maybeFindTraitor(s,()=>0);else maybeFindPeakPuzzle(s,()=>kind==='maze'?.1:0);
  const id=s[key].id,before=structuredClone(s);assert.equal(play(s,id,'abandon').outcome,'abandoned');assert.deepEqual(s,{...before,[key]:null});
  assert.throws(()=>play(s,id,'abandon'));assert.throws(()=>play(s,id,'submit'));
  if(kind==='traitor'){maybeFindTraitor(s,()=>0);assert.equal(s[key].levelIndex,23)}else{maybeFindPeakPuzzle(s,()=>0);assert.equal(s[key].levelIndex,21)}
 }
});
test('abandon is rejected in battle and stale IDs cannot discard a different puzzle',()=>{
 const s=make();maybeFindPeakPuzzle(s,()=>0);maybeFindTraitor(s,()=>0);s.battle={};const before=structuredClone(s);
 assert.throws(()=>playPeakPuzzle(s,s.peakPuzzle.id,'abandon'));assert.throws(()=>playTraitor(s,s.traitorPuzzle.id,'abandon'));assert.deepEqual(s,before);
 s.battle=null;assert.throws(()=>playPeakPuzzle(s,'stale','abandon'));assert.throws(()=>playTraitor(s,'stale','abandon'));assert.ok(s.peakPuzzle&&s.traitorPuzzle);
});
test('abandon buttons require confirmation and present abandonment instead of victory',async t=>{
 const previous=globalThis.document;globalThis.document=parseHTML('<html><body><section id="xg-panel"></section></body></html>').document;t.after(()=>globalThis.document=previous);
 const previousConfirm=globalThis.confirm;globalThis.confirm=()=>false;t.after(()=>{globalThis.confirm=previousConfirm});
 for(const kind of ['peak','traitor']){
  const s=make();if(kind==='peak')maybeFindPeakPuzzle(s,()=>0);else maybeFindTraitor(s,()=>0);
  const api={getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})}};
  (kind==='peak'?showPeakPuzzle:showTraitorPuzzle)(api,()=>{});
  const button=document.querySelector(kind==='peak'?'[data-move="abandon"]':'[data-action="abandon"]');
  globalThis.confirm=()=>false;await button.onclick();assert.ok(kind==='peak'?s.peakPuzzle:s.traitorPuzzle);
  globalThis.confirm=()=>true;await button.onclick();assert.equal(kind==='peak'?s.peakPuzzle:s.traitorPuzzle,null);assert.match(document.body.textContent,/已放弃本次/);assert.doesNotMatch(document.body.textContent,/灵石 \+undefined|叛徒尽数落网|奇遇已成/);
 }
});
