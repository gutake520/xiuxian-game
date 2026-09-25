import test from 'node:test';
import assert from 'node:assert/strict';
import {beginBattle,playRound} from '../systems/combat.js';
import {startSectTournament} from '../systems/sect-tournament.js';
import {ensureBossLine,resolveBossAmbush,acknowledgeBossRescue,bossAttributes} from '../systems/boss-line.js';
import {migrateSave} from '../storage/migrations.js';

function save(realm='炼气九层'){
 return {player:{realm,sect:'青岚谷',spiritRoot:'木灵根',stats:{福缘:0},cultivation:749,spiritStones:10,hp:20,mp:10,combat:{hp:20,mp:10,attack:4,defense:1,speed:3,critRate:5,dodgeRate:5}},inventory:[],equipment:{},techniques:{mastered:[],combat:[]},bagCapacity:20};
}

test('reaching qi ten queues one forced ambush and saves the elder rescue',()=>{
 const s=save(),random=Math.random;
 try{Math.random=()=>0;beginBattle(s,'tough');s.battle.hp=1;playRound(s,'attack');}finally{Math.random=random}
 assert.equal(s.player.realm,'炼气十层');assert.equal(s.bossLine.phase,'ambush');assert.equal(s.encounterPending,undefined);assert.equal(s.divinationPending,undefined);
 assert.throws(()=>beginBattle(s,'tough'),/剧情/);
 const expected=bossAttributes(s,2),before=s.player.cultivation;
 const scene=resolveBossAmbush(s);
 assert.match(scene,/沈听溪/);assert.deepEqual(s.bossLine.firstFight,expected);
 assert.equal(s.player.hp,5);assert.equal(s.player.cultivation,before);
 assert.throws(()=>resolveBossAmbush(s),/结束/);
 assert.equal(s.bossLine.rescuePending,true);
 acknowledgeBossRescue(s);assert.equal(s.bossLine.rescuePending,false);
 ensureBossLine(s);assert.equal(s.bossLine.phase,'wounded');
});

test('injured enemy snapshots equipment stats, can be challenged with a beast and grants insight once',()=>{
 const s=save('炼气十层');s.player.cultivation=0;ensureBossLine(s);resolveBossAmbush(s);acknowledgeBossRescue(s);
 s.petRentals=1;s.player.hp=20;
 const stats=bossAttributes(s,1.1);beginBattle(s,'wounded-boss','attack');
 assert.equal(s.petRentals,0);assert.equal(s.battle.attack,stats.attack);assert.equal(s.battle.defense,stats.defense);assert.equal(s.battle.speed,stats.speed);
 s.battle.hp=1;const random=Math.random;let outcome;
 try{Math.random=()=>.99;outcome=playRound(s,'attack').result}finally{Math.random=random}
 assert.equal(outcome.kind,'wounded-boss');assert.equal(s.bossLine.insight,true);assert.equal(s.bossLine.phase,'defeated');
 assert.throws(()=>beginBattle(s,'wounded-boss'),/没有可挑战/);
});

test('old qi-ten saves receive the story; tournament pets use one rental',()=>{
 const old=save('炼气十层');migrateSave(old);assert.equal(old.bossLine.phase,'ambush');
 const s=save('炼气一层');s.player.cultivation=0;s.petRentals=1;
 startSectTournament(s,0,'guard');assert.equal(s.battle.pet,'guard');assert.equal(s.petRentals,0);
 s.battle.hp=100;playRound(s,'skip');assert.ok(s.player.hp>0);
});
