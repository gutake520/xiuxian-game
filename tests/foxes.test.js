import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateSave} from '../storage/migrations.js';
import {addItem,equipItem} from '../systems/inventory.js';
import {beginBattle,playRound} from '../systems/combat.js';
import {giveFoxGift,foxState,giftableEntries,answerFox,leaveFox,seenFoxScene,companionBreakupFee,COMPANION_COOLDOWN_MS} from '../systems/foxes.js';
import {idleLimitMs} from '../systems/cultivation.js';
import {drawBlackMarket} from '../systems/black-market.js';
function save(){return migrateSave({player:{name:'测试',realm:'炼气七层',sect:'无门无派',spiritRoot:'金灵根',spiritStones:120,cultivation:0,hp:25,mp:10,combat:{hp:25,mp:10,attack:4,defense:.5,speed:5,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[],puzzles:{},main:null},bagCapacity:20})}
test('first fox victory unlocks the NPC without monster rewards; bloom stops next turn',()=>{
 const s=save();const fight=beginBattle(s,'pine-summit');assert.equal(fight.speed,5);assert.equal(fight.defense,.3);assert.equal(fight.mp,5);
 const first=playRound(s,'skip');assert.match(first.messages.join(' '),/落英缤纷/);assert.equal(s.battle.foxParalyzeRound,2);
 const hp=s.battle.hp;const second=playRound(s,'attack');assert.equal(s.battle.hp,hp);assert.match(second.messages.join(' '),/无法行动/);
 s.battle.hp=1;playRound(s,'attack');assert.equal(foxState(s,'pine-summit').met,true);assert.equal(s.lastBattle.xp,0);assert.deepEqual(s.lastBattle.rewards,[]);
});
test('fox bloom waits three full turns before reuse, and defeat keeps its battle log',()=>{
 const s=save();s.player.combat.hp=100;s.player.hp=100;beginBattle(s,'spring-hill');
 const actions=Array.from({length:5},()=>playRound(s,'skip').messages.join(' '));
 assert.match(actions[0],/落英缤纷/);
 for(const line of actions.slice(1,4))assert.doesNotMatch(line,/使出落英缤纷/);
 assert.match(actions[4],/使出落英缤纷/);
 const lost=save();lost.player.hp=1;lost.player.combat.speed=0;beginBattle(lost,'pine-summit');
 const defeat=playRound(lost,'skip');assert.equal(defeat.result.outcome,'defeat');
 assert.match(defeat.result.log.join(' '),/战败：修为/);
 assert.match(defeat.result.log.join(' '),/落英缤纷/);
});
test('gifts consume one unit, damaged equipment returns, broken array costs affinity; equipped gear hidden',()=>{
 const s=save();s.foxes={'pine-summit':{met:true,affinity:3,seen:[]}};
 addItem(s,'iron-sword');const sword=s.inventory.at(-1);equipItem(s,sword.uid);assert.ok(!giftableEntries(s).includes(sword));
 addItem(s,'cloth-robe');const armor=s.inventory.at(-1);armor.durability=19;giveFoxGift(s,'pine-summit',armor.uid);assert.equal(s.inventory.includes(armor),true);assert.equal(foxState(s,'pine-summit').affinity,2);
 addItem(s,'crafted-binding-array');const broken=s.inventory.at(-1);broken.usesLeft=0;giveFoxGift(s,'pine-summit',broken.uid);assert.equal(s.inventory.includes(broken),false);assert.equal(foxState(s,'pine-summit').affinity,1);
 addItem(s,'fox-wine',2);giveFoxGift(s,'pine-summit',s.inventory.at(-1).uid);assert.equal(foxState(s,'pine-summit').affinity,5);assert.equal(s.inventory.at(-1).quantity,1);
});
test('partner cap extends idle by thirty minutes; separation costs stones and locks new bonds for three days',()=>{
 const s=save(),base=idleLimitMs(s);s.foxes={'spring-hill':{met:true,affinity:100,seen:[]},'pine-summit':{met:true,affinity:100,seen:[]}};
 seenFoxScene(s,'spring-hill',30);const time=Date.now();answerFox(s,'spring-hill','accept',time);assert.equal(idleLimitMs(s),base+1800000);
 assert.throws(()=>answerFox(s,'pine-summit','accept',time),/名额/);
 const stones=s.player.spiritStones;leaveFox(s,'spring-hill',time);assert.equal(s.player.spiritStones,stones-100);assert.equal(idleLimitMs(s),base);
 assert.throws(()=>answerFox(s,'pine-summit','accept',time+COMPANION_COOLDOWN_MS-1),/三天/);
 answerFox(s,'pine-summit','accept',time+COMPANION_COOLDOWN_MS);assert.deepEqual(s.player.companions,['沈砚']);
 s.player.realm='筑基一层';s.player.spiritStones=199;assert.equal(companionBreakupFee(s.player),200);
 assert.throws(()=>leaveFox(s,'pine-summit',time+COMPANION_COOLDOWN_MS),/200/);
 s.player.spiritStones=200;leaveFox(s,'pine-summit',time+COMPANION_COOLDOWN_MS);assert.equal(s.player.spiritStones,0);
});
test('black market gift pool stays at its previous aggregate chance',()=>{
 const original=Math.random;try{for(const [selection,id] of [[0,'calming-jade'],[.3,'fox-wine'],[.6,'bamboo-chess'],[.99,'camellia-seeds']]){const s=save();let n=0;Math.random=()=>++n===1?.52:selection;drawBlackMarket(s,1,'gift');assert.equal(s.inventory[0].itemId,id)}}finally{Math.random=original}
});
