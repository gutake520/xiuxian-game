import test from 'node:test';
import assert from 'node:assert/strict';
import {startSectTournament,SECT_TOURNAMENT_INTERVAL,SECT_TOURNAMENT_NAMES,SECT_SENIORS,claimSeniorReward} from '../systems/sect-tournament.js';
import {playRound} from '../systems/combat.js';
import {equipmentStats} from '../systems/inventory.js';

function make(){return {player:{realm:'炼气一层',sect:'天工阁',spiritRoot:'金灵根',stats:{福缘:0},cultivation:0,spiritStones:0,hp:20,mp:10,combat:{hp:20,mp:10,attack:3,defense:.5,speed:2,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[]},bagCapacity:20}}

test('nine sect rosters have three men and three women each, with no repeated names',()=>{
 const rosters=Object.values(SECT_TOURNAMENT_NAMES),all=[];
 assert.equal(rosters.length,9);
 for(const roster of rosters){assert.equal(roster.male.length,3);assert.equal(roster.female.length,3);all.push(...roster.male,...roster.female)}
 assert.equal(new Set(all).size,54);
 const random=Math.random;
 try{
  for(const [sect,roster] of Object.entries(SECT_TOURNAMENT_NAMES))for(const [chance,gender] of [[0,'male'],[.9,'female']]){
   Math.random=()=>chance;const s=make();s.player.sect=sect;startSectTournament(s,1000);
   assert.ok(roster[gender].includes(s.battle.name),`${sect} 抽到了其他宗门的对手`);
  }
 }finally{Math.random=random}
});

test('rival snapshots player attributes with tied speed',()=>{
 const s=make(),stats=equipmentStats(s);startSectTournament(s,1000);
 assert.ok([...SECT_TOURNAMENT_NAMES.天工阁.male,...SECT_TOURNAMENT_NAMES.天工阁.female].includes(s.battle.name));
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
test('five senior sisters and four senior brothers rotate by sect without names',()=>{
 assert.equal(Object.keys(SECT_SENIORS).length,9);
 assert.equal(Object.values(SECT_SENIORS).filter(name=>name==='大师姐').length,5);
 assert.equal(Object.values(SECT_SENIORS).filter(name=>name==='大师兄').length,4);
});
test('ordinary defeat can start senior challenge without cultivation loss, and a senior win grants one choice',()=>{
 const s=make(),random=Math.random;
 try{
  Math.random=()=>0;startSectTournament(s,1000);s.player.hp=1;
  const loss=playRound(s,'skip',1001);
  assert.equal(loss.result.outcome,'defeat');assert.equal(s.player.cultivation,0);
  assert.equal(s.battle.kind,'sect-senior');assert.equal(s.battle.name,SECT_SENIORS.天工阁);
  assert.equal(s.player.hp,equipmentStats(s).maxHp);assert.equal(s.player.mp,equipmentStats(s).maxMp);
  assert.ok(s.battle.speed>equipmentStats(s).speed);
  s.battle.hp=1;
  const win=playRound(s,'attack',1002);
  assert.equal(win.result.outcome,'victory');assert.equal(s.player.hp,equipmentStats(s).maxHp);
  const restored=JSON.parse(JSON.stringify(s)),id=restored.seniorRewardPending.id;
  assert.match(claimSeniorReward(restored,id,'manual',1002),/你怎么什么都没有/);
  assert.equal(restored.inventory[0].itemId,'silence-manual');assert.equal(restored.seniorRewards,1);
  assert.throws(()=>claimSeniorReward(restored,id,'manual',1002));
 }finally{Math.random=random}
});
test('senior upgrade is immediate, only two prizes can be claimed, and senior defeat heals',()=>{
 const s=make();s.seniorRewardPending={id:'first'};s.techniques.mastered.push('empty-hands');
 claimSeniorReward(s,'first','empty-hands');assert.deepEqual(s.techniques.upgraded,['empty-hands']);assert.equal(s.seniorRewards,1);
 s.seniorRewardPending={id:'second'};claimSeniorReward(s,'second','manual');assert.equal(s.seniorRewards,2);
 startSectTournament(s,0);s.player.hp=1;const random=Math.random;try{Math.random=()=>0;playRound(s,'skip');assert.equal(s.battle,null);assert.equal(s.player.hp,20)}finally{Math.random=random}
});
test('silencing strike spends two mana and blocks two enemy skill actions only after a hit',()=>{
 const s=make();s.techniques.mastered.push('silent-strike');s.techniques.combat.push('silent-strike');startSectTournament(s,0);
 s.battle.kind='sect-senior';s.battle.speed=3;s.battle.hp=100;s.battle.dodgeRate=0;
 const first=playRound(s,'silent-strike');assert.equal(s.player.mp,8);assert.equal(s.battle.silencedTurns,2);
 assert.equal(s.battle.mp,10); // Faster opponent used a skill before the strike landed.
 playRound(s,'attack');assert.equal(s.battle.silencedTurns,1);assert.equal(s.battle.mp,10);
 playRound(s,'attack');assert.equal(s.battle.silencedTurns,0);assert.equal(s.battle.mp,10);
});
test('a dodged silencing strike does not silence, and a full bag preserves the reward temporarily',()=>{
 const s=make();s.techniques.mastered.push('silent-strike');s.techniques.combat.push('silent-strike');startSectTournament(s,0);
 s.battle.hp=100;s.battle.dodgeRate=100;
 const random=Math.random;try{Math.random=()=>.5;playRound(s,'silent-strike');assert.equal(s.battle.silencedTurns,undefined)}finally{Math.random=random}
 s.seniorRewardPending={id:'full'};s.bagCapacity=0;
 assert.match(claimSeniorReward(s,'full','manual',1000),/临时储物区/);
 assert.equal(s.temporaryLoot[0].itemId,'silence-manual');assert.equal(s.seniorRewards,1);
});
