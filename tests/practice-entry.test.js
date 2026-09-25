import test from 'node:test';
import assert from 'node:assert/strict';
import {beginPracticeSession,practiceEntryFee} from '../systems/cultivation.js';

function save(stones){return {player:{realm:'炼气一层',spiritStones:stones},techniques:{mastered:[],main:null}}}

test('each qi practice entry costs three stones, including a new attempt after a loss',()=>{
 const s=save(7);assert.equal(practiceEntryFee(s.player),3);
 const first=beginPracticeSession(s,100);assert.equal(s.player.spiritStones,4);assert.equal(s.practiceSession.startedAt,100);
 const second=beginPracticeSession(s,200);assert.notEqual(first,second);assert.equal(s.player.spiritStones,1);
});

test('insufficient stones or unopened realms cannot start or charge practice',()=>{
 const s=save(2);assert.throws(()=>beginPracticeSession(s),/3 灵石/);assert.equal(s.player.spiritStones,2);assert.equal(s.practiceSession,undefined);
 s.player.spiritStones=10;s.player.realm='炼气十层';s.player.cultivation=1000;assert.throws(()=>beginPracticeSession(s),/暂不开放/);assert.equal(s.player.spiritStones,10);
 s.player.realm='筑基一层';assert.equal(practiceEntryFee(s.player),null);assert.throws(()=>beginPracticeSession(s),/暂不开放/);assert.equal(s.player.spiritStones,10);
});
