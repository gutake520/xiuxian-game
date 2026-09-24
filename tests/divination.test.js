import test from 'node:test';
import assert from 'node:assert/strict';
import {beginBattle,playRound} from '../systems/combat.js';
import {flipDivination} from '../systems/divination.js';
import {migrateSave} from '../storage/migrations.js';
import {localDay} from '../systems/cultivation.js';
import {resolveHerbalist} from '../systems/encounters.js';

function save(){return {player:{realm:'炼气七层',sect:'无门无派',spiritRoot:'金灵根',stats:{福缘:5},cultivation:0,spiritStones:20,hp:30,mp:11,combat:{hp:30,mp:11,attack:3,defense:10,speed:5,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[],puzzles:{}},bagCapacity:20}}
function fixed(value,action){const previous=Math.random;try{Math.random=()=>value;return action()}finally{Math.random=previous}}
function win(s,now=Date.now()){beginBattle(s,'tough');s.battle.hp=1;fixed(0,()=>playRound(s,'attack',now))}

test('one divination per day; front doubles loot but not cultivation; resolving twice cannot duplicate',()=>{
 const s=save(),day=Date.now();win(s,day);
 const pending=s.divinationPending;assert.ok(pending);assert.equal(s.divinationDay,localDay(day));
 assert.throws(()=>beginBattle(s,'tough'),/卦师/);
 const before=s.player.cultivation,stones=s.player.spiritStones;
 const copy=structuredClone(s);migrateSave(copy);
 fixed(0,()=>flipDivination(copy,pending.id,day));
 assert.equal(copy.player.cultivation,before);
 assert.equal(copy.player.spiritStones,stones+pending.loot.filter(item=>item.itemId==='stones').reduce((n,item)=>n+item.quantity,0));
 assert.throws(()=>flipDivination(copy,pending.id,day),/结束/);
 if(copy.encounterPending)resolveHerbalist(copy,copy.encounterPending.id,false);
 win(copy,day);assert.equal(copy.divinationPending,null);
});

test('reverse removes exactly one current drop, preferring equipment then stones',()=>{
 const s=save(),now=Date.now();win(s,now);
 s.inventory.push({uid:'dropped-sword',itemId:'wild-sword',quantity:1,durability:20});
 s.divinationPending.loot=[{itemId:'wild-sword',quantity:1,place:'bag',uid:'dropped-sword'},{itemId:'stones',quantity:1}];
 const stones=s.player.spiritStones;
 fixed(.9,()=>flipDivination(s,s.divinationPending.id,now));
 assert.equal(s.inventory.some(item=>item.uid==='dropped-sword'),false);
 assert.equal(s.player.spiritStones,stones);
 assert.equal(s.lastBattle.divinationResult.front,false);
});
