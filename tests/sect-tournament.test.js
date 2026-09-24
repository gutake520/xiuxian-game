import test from 'node:test';
import assert from 'node:assert/strict';
import {startSectTournament,SECT_TOURNAMENT_INTERVAL,SECT_TOURNAMENT_NAMES} from '../systems/sect-tournament.js';
import {playRound} from '../systems/combat.js';
import {equipmentStats} from '../systems/inventory.js';

function make(){return {player:{realm:'炼气一层',sect:'天工阁',spiritRoot:'金灵根',stats:{福缘:0},cultivation:0,spiritStones:0,hp:20,mp:10,combat:{hp:20,mp:10,attack:3,defense:.5,speed:2,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[]},bagCapacity:20}}

test('rival snapshots player attributes with tied speed, and the name pool has ten of each',()=>{
 const s=make(),stats=equipmentStats(s);startSectTournament(s,1000);
 assert.equal(SECT_TOURNAMENT_NAMES.male.length,10);assert.equal(SECT_TOURNAMENT_NAMES.female.length,10);
 assert.equal(new Set([...SECT_TOURNAMENT_NAMES.male,...SECT_TOURNAMENT_NAMES.female]).size,20);
 assert.ok([...SECT_TOURNAMENT_NAMES.male,...SECT_TOURNAMENT_NAMES.female].includes(s.battle.name));
 assert.equal(s.battle.speed,stats.speed);assert.equal(s.battle.maxHp,22);assert.equal(s.battle.maxMp,11);
 assert.equal(s.battle.attack,3.3);assert.equal(s.battle.defense,.55);
 assert.equal(s.sectTournamentNextAt,1000+SECT_TOURNAMENT_INTERVAL);
 assert.throws(()=>startSectTournament(s,1001),/结束当前战斗/);
});

test('rival armor and wall reduce hits, rival skills spend mana and respect cooldown',()=>{
 const s=make();startSectTournament(s,0);s.battle.hp=100;
 assert.equal(playRound(s,'attack').dealt,2.45);assert.equal(s.battle.mp,10);
 const second=playRound(s,'attack');assert.equal(second.dealt,1.45);assert.equal(s.battle.mp,9);
 assert.equal(second.taken,1);assert.equal(playRound(s,'attack').dealt,2.45);
 assert.equal(s.battle.mp,9);
 playRound(s,'attack');assert.equal(s.battle.mp,8);
});

test('victory pays ten stones once without ordinary loot or cultivation',()=>{
 const s=make();startSectTournament(s,1000);s.battle.hp=1;
 const result=playRound(s,'attack',1001).result;
 assert.equal(result.outcome,'victory');assert.deepEqual(result.rewards,['灵石×10']);
 assert.equal(s.player.spiritStones,10);assert.equal(s.player.cultivation,0);
 assert.equal(s.encounterPending,undefined);assert.equal(s.inventory.length,0);
 assert.throws(()=>startSectTournament(s,1000+SECT_TOURNAMENT_INTERVAL-1),/三日之期未到/);
 startSectTournament(s,1000+SECT_TOURNAMENT_INTERVAL);
 assert.equal(s.player.spiritStones,10);
});
