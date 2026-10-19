import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {parseHTML} from 'linkedom';
import {migrateSave} from '../storage/migrations.js';
import {writeSave,readSave,updateSave} from '../storage/saves.js';
import {flightWeek,settleFlightWeek,startFlight,resumeFlight,tickFlight,abandonFlight} from '../systems/sect-flight.js';
import {showSectFlight} from '../ui/sect-flight.js';
import {createActions} from '../core/actions.js';
const monday=new Date(2026,9,19,12).getTime(),day=86400000,week=7*day;
const make=(now=monday)=>migrateSave({slot:'flight',player:{sect:'天工阁',spiritRoot:'金灵根',realm:'炼气一层',spiritStones:30,cultivation:50,stats:{福缘:5}},inventory:[]},now);
function fly(save,score,now=monday){
 const id=startFlight(save,now,()=>.1),token=resumeFlight(save,id,now);let t=now,result;
 for(let i=0;i<20;i++){
  const run=save.sectFlight.run,g=run.gates[i],lane=i<score?g.ring:[0,1,2].find(l=>l!==g.ring&&l!==g.rock);
  tickFlight(save,id,token,lane,t);
  while(save.sectFlight.run&&save.sectFlight.run.next<=i){t+=Math.min(700,g.at-save.sectFlight.run.elapsed);result=tickFlight(save,id,token,null,t)}
 }
 return result;
}
test('Monday boundary, join grace and existing-save grace, exact penalty and no duplicate settlement',()=>{
 assert.equal(flightWeek(new Date(2026,9,25,23,59).getTime()),flightWeek(monday));assert.notEqual(flightWeek(monday+week),flightWeek(monday));
 const s=make();settleFlightWeek(s,monday);assert.equal(s.sectFlight.graceWeek,flightWeek(monday));
 settleFlightWeek(s,monday+week);assert.equal(s.player.spiritStones,30);
 settleFlightWeek(s,monday+2*week);assert.equal(s.player.spiritStones,20);
 settleFlightWeek(s,monday+2*week+day);assert.equal(s.player.spiritStones,20);
});
test('long absence fines only last week; shortfalls use five xp per stone, never create debt or lower existing negative xp',()=>{
 for(const [stones,xp,wantStones,wantXp] of [[30,50,20,50],[3,50,0,15],[3.5,50,0,17.5],[0,20,0,0],[0,-110,0,-110]]){
  const s=make();settleFlightWeek(s,monday);s.player.spiritStones=stones;s.player.cultivation=xp;
  settleFlightWeek(s,monday+10*week);assert.equal(s.player.spiritStones,wantStones);assert.equal(s.player.cultivation,wantXp);assert.equal(s.player.realm,'炼气一层');
  settleFlightWeek(s,monday+10*week);assert.equal(s.player.cultivation,wantXp);
 }
});
test('medium clears weekly requirement; high rewards once; repeat failure does not erase passed record',()=>{
 const s=make();settleFlightWeek(s,monday);settleFlightWeek(s,monday+week);
 assert.match(fly(s,10,monday+week).text,/中等/);assert.equal(s.sectPoints,0);
 assert.match(fly(s,16,monday+week+60000).text,/上等/);assert.equal(s.sectPoints,1);
 fly(s,20,monday+week+120000);assert.equal(s.sectPoints,1);
 fly(s,0,monday+week+180000);assert.equal(s.sectFlight.best,20);
 settleFlightWeek(s,monday+2*week);assert.equal(s.player.spiritStones,30);assert.equal(s.sectFlight.rewarded,false);
 fly(s,20,monday+2*week);assert.equal(s.sectPoints,2);
});
test('rocks end at three hits, paused reload preserves course, sessions reject stale tokens and no offline progress',()=>{
 const s=make(),id=startFlight(s,monday,()=>0),token=resumeFlight(s,id,monday);
 tickFlight(s,id,token,1,monday+200);tickFlight(s,id,token,null,monday+500,true);
 const loaded=migrateSave(JSON.parse(JSON.stringify(s)),monday+100000);assert.equal(loaded.sectFlight.run.elapsed,500);
 assert.throws(()=>tickFlight(loaded,id,token,0,monday+100000));const lease=resumeFlight(loaded,id,monday+100000);assert.throws(()=>tickFlight(loaded,id,token,0,monday+100000));
 tickFlight(loaded,id,lease,1,monday+200000);assert.equal(loaded.sectFlight.run.elapsed,500);
 let t=monday+200000;while(loaded.sectFlight.run){t+=500;tickFlight(loaded,id,lease,1,t)}
 assert.equal(loaded.sectFlight.lastResult.hits,3);assert.equal(loaded.sectFlight.lastResult.grade,'未通过');
 assert.throws(()=>tickFlight(loaded,id,lease,1,t));
});
test('week rollover expires unfinished flight; sect changes grant grace and clear old progress',()=>{
 const s=make(),id=startFlight(s,monday),token=resumeFlight(s,id,monday);
 assert.throws(()=>tickFlight(s,id,token,0,monday+week));assert.equal(s.sectFlight.run,null);
 s.player.sect='无门无派';settleFlightWeek(s,monday+week);assert.equal(s.sectFlight,null);assert.throws(()=>startFlight(s,monday+week));
 s.player.sect='青岚谷';settleFlightWeek(s,monday+2*week);assert.equal(s.sectFlight.graceWeek,flightWeek(monday+2*week));
 const next=startFlight(s,monday+2*week);abandonFlight(s,next,monday+2*week);assert.equal(s.sectFlight.run,null);
});
test('weekly charge persists atomically and core actions settle it before spending',async t=>{
 globalThis.indexedDB=indexedDB;const s=make();settleFlightWeek(s,monday);await writeSave(s);
 await Promise.all([1,2].map(()=>updateSave(s.slot,next=>{settleFlightWeek(next,monday+2*week);return next})));
 assert.equal((await readSave(s.slot)).player.spiritStones,20);
 t.mock.method(Date,'now',()=>monday+3*week);let current=await readSave(s.slot);const actions=createActions({getSave:()=>current,setSave:s=>{current=s}});
 await actions.refresh();assert.equal(current.player.spiritStones,10);
});
test('UI starts flight, has mobile lanes, and returning pauses and clears timers',async t=>{
 const prev=globalThis.document;globalThis.document=parseHTML('<html><body><div id="xg-panel"></div></body></html>').document;t.after(()=>{globalThis.document=prev});
 const s=make(Date.now());settleFlightWeek(s);let closed=false;
 showSectFlight({getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})}},()=>{closed=true});
 await document.querySelector('[data-fly]').onclick();assert.equal(document.querySelectorAll('[data-lane]').length,3);assert.ok(s.sectFlight.run);
 await document.querySelector('[data-close]').onclick();assert.equal(closed,true);assert.equal(s.sectFlight.run.paused,true);
});

test('changing sect cannot claim another high-grade reward in the same week',()=>{
 const s=make();fly(s,20);assert.equal(s.sectPoints,1);
 s.player.sect='无门无派';settleFlightWeek(s,monday+day);
 s.player.sect='青岚谷';fly(s,20,monday+4*day);assert.equal(s.sectPoints,1);
});

test('flight accelerates continuously with shorter travel and gaps; saved courses retain their timing',()=>{
 const s=make();startFlight(s,monday);const gates=s.sectFlight.run.gates;
 assert.equal(gates[0].travel,3200);assert.equal(gates.at(-1).travel,900);
 assert.equal(gates.at(-1).at-gates.at(-2).at,600);
 for(let i=1;i<gates.length;i++){
  assert.ok(gates[i].travel<gates[i-1].travel);assert.ok(gates[i].at>gates[i-1].at);
  assert.ok(gates[i].at-gates[i].travel>gates[i-1].at-gates[i-1].travel);
  if(i>1)assert.ok(gates[i].at-gates[i-1].at<gates[i-1].at-gates[i-2].at);
 }
 const loaded=migrateSave(JSON.parse(JSON.stringify(s)),monday);assert.deepEqual(loaded.sectFlight.run.gates,gates);
});
