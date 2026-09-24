import test from 'node:test';
import assert from 'node:assert/strict';
import {syncAchievements,claimAchievement} from '../systems/achievements.js';
import {leaveSect,assertCanJoinSect,sectExitPrice,SECT_REJOIN_DELAY} from '../systems/sect-membership.js';
import {hasActiveTechnique} from '../data/techniques.js';
const make=()=>({player:{sect:'凌霄剑宗',realm:'炼气四层',spiritRoot:'金灵根',spiritStones:400},techniques:{main:'basic-qi-guide',mastered:['one-sword','strengthen-attack'],combat:['one-sword','strengthen-attack']} });
test('achievement rewards are once per save and reached realms backfill',()=>{
 const s=make();syncAchievements(s);claimAchievement(s,'first-sect');assert.equal(s.player.spiritStones,405);assert.throws(()=>claimAchievement(s,'first-sect'));
 assert.throws(()=>claimAchievement(s,'immortal-path'));s.player.realm='筑基一层';claimAchievement(s,'immortal-path');assert.equal(s.player.spiritStones,410);
 const reloaded=JSON.parse(JSON.stringify(s));syncAchievements(reloaded);assert.throws(()=>claimAchievement(reloaded,'immortal-path'));
});
test('leaving pays exact tier fee, disables inheritance and blocks reentry for 72 hours',()=>{
 const s=make();assert.equal(hasActiveTechnique(s,'one-sword'),true);leaveSect(s,1000);
 assert.equal(s.player.spiritStones,300);assert.equal(s.player.sect,'无门无派');assert.equal(hasActiveTechnique(s,'one-sword'),false);
 assert.deepEqual(s.techniques.combat,['strengthen-attack']);assert.ok(s.techniques.mastered.includes('one-sword'));assert.equal(s.techniques.main,'basic-qi-guide');
 const reloaded=JSON.parse(JSON.stringify(s));assert.throws(()=>assertCanJoinSect(reloaded,1000+SECT_REJOIN_DELAY-1));assert.doesNotThrow(()=>assertCanJoinSect(reloaded,1000+SECT_REJOIN_DELAY));
 const b=make();b.player.realm='筑基一层';leaveSect(b,0);assert.equal(b.player.spiritStones,100);
});
test('insufficient funds and undefined future exit fees leave state untouched',()=>{
 const s=make();s.player.spiritStones=99;const before=JSON.stringify(s);assert.throws(()=>leaveSect(s));assert.equal(JSON.stringify(s),before);
 s.player.realm='金丹一层';assert.equal(sectExitPrice(s.player),null);assert.throws(()=>leaveSect(s),/尚未开放/);
});
