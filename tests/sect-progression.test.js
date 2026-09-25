import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyTasks,recordDailyProgress,claimDailyTask,redeemInheritance,craftSectItem,repairOwnEquipment} from '../systems/sect-progression.js';
import {TECHNIQUES} from '../data/techniques.js';
import {migrateSave} from '../storage/migrations.js';
import {startLearning,completeLearning,toggleCombatTechnique} from '../systems/techniques.js';
import {beginBattle,playRound,useBattleArray} from '../systems/combat.js';
import {addItem,discardJunk} from '../systems/inventory.js';
import {ensureSpiritBeasts,feedBeast,beastCanFight,renameBeast,selectBattlePet} from '../systems/pets.js';
const now=new Date(2026,8,23,12).getTime();
function save(sect='丹霞谷',root='火灵根'){
 return migrateSave({player:{name:'测试',sect,realm:'炼气四层',spiritRoot:root,stats:{魅力:10,神识:10,悟性:10,根骨:10},cultivation:0,spiritStones:20,hp:23,mp:10,combat:{hp:20,mp:10,attack:3,defense:.5,speed:5,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[],sectManuals:[],puzzles:{},main:null},realmHpBonusApplied:3,bagCapacity:20},now);
}
function learn(s,id){s.sectPoints=9;redeemInheritance(s,id);const p=startLearning(s,id);assert.equal(p.size,5);p.cells=[...p.solution];completeLearning(s,id)}
test('daily rewards persist, exclude escape charges, reset next day, backfill exploration',()=>{
 const s=save();s.lastQiExploration={completedAt:now};const d=dailyTasks(s,now);assert.equal(d.explored,1);
 for(let i=0;i<3;i++){const before={battleId:s.lastBattle?.id,stones:20};s.lastBattle={id:String(i),outcome:'victory'};recordDailyProgress(s,before,false,now)}
 s.player.spiritStones=17;recordDailyProgress(s,{battleId:s.lastBattle.id,stones:20},false,now);assert.equal(d.spent,0);
 recordDailyProgress(s,{battleId:s.lastBattle.id,stones:20},true,now);assert.equal(d.spent,3);
 for(const id of ['kills','spent','explored'])claimDailyTask(s,id,d.day,now);
 assert.equal(s.sectPoints,9);assert.throws(()=>claimDailyTask(JSON.parse(JSON.stringify(s)),'kills',d.day,now));
 assert.equal(dailyTasks(s,now+86400000).kills,0);
});
test('all nine inheritances have five-by-five learning and cost nine points',()=>{
 const methods=Object.values(TECHNIQUES).filter(m=>m.sect);assert.equal(methods.length,9);
 for(const m of methods){const s=save(m.sect,(m.roots?.[0]||'火')+'灵根');learn(s,m.id);assert.equal(s.sectPoints,0);assert.ok(s.techniques.mastered.includes(m.id));assert.throws(()=>redeemInheritance(s,m.id))}
 const s=save('丹霞谷','雷灵根');s.sectPoints=9;assert.throws(()=>redeemInheritance(s,'divine-pharmacopoeia'));
});
test('passives and healing use equipment slots; lifesteal ignores overkill',()=>{
 const s=save('合欢宗');learn(s,'life-steal');toggleCombatTechnique(s,'life-steal');s.player.hp=10;beginBattle(s,'tough');s.battle.hp=1;playRound(s);assert.equal(s.player.hp,10.1);
 const t=save('镇岳宗');learn(t,'resentment');toggleCombatTechnique(t,'resentment');beginBattle(t,'tough');t.battle.hp=20;playRound(t,'skip');assert.equal(t.battle.hp,19.8);
 const h=save('青岚谷','木灵根');learn(h,'healing-hands');toggleCombatTechnique(h,'healing-hands');h.player.hp=10;beginBattle(h,'tough');h.battle.hp=100;
 playRound(h,'healing-hands');assert.equal(h.player.hp,10.5);assert.equal(h.battle.regenRounds,2);assert.throws(()=>playRound(h,'healing-hands'));
 playRound(h,'skip');playRound(h,'skip');assert.equal(h.battle.regenRounds,0);assert.equal(h.player.hp,11.5);
 migrateSave(h,now);assert.ok(h.techniques.combat.includes('healing-hands'));
});
test('两只灵兽分别取名、喂养、出战；筑基后不能吃炼气草',()=>{
 const s=save('万灵山','木灵根');const pets=ensureSpiritBeasts(s);assert.ok(pets.attack&&pets.guard);
 renameBeast(s,'attack','大黄');assert.equal(s.spiritBeasts.attack.name,'大黄');
 assert.throws(()=>feedBeast(s,'attack','healing-herb'),/铲屎官/);
 learn(s,'beast-keeper');addItem(s,'healing-herb',3);addItem(s,'qi-herb',3);
 feedBeast(s,'attack','healing-herb');assert.equal(beastCanFight(s,'attack'),true);assert.equal(beastCanFight(s,'guard'),false);
 assert.throws(()=>selectBattlePet(s,'guard'),/未喂养/);
 beginBattle(s,'tough','attack');assert.equal(s.battle.petName,'大黄');assert.equal(s.petRentals,0);
 s.battle=null;feedBeast(s,'guard','qi-herb');assert.equal(beastCanFight(s,'guard'),true);
 s.player.realm='筑基一层';const loaded=migrateSave(structuredClone(s));
 assert.equal(loaded.spiritBeasts.attack.name,'大黄');assert.equal(loaded.spiritBeasts.guard.stage,'筑基');
 assert.equal(beastCanFight(loaded,'attack'),false);assert.throws(()=>feedBeast(loaded,'attack','qi-herb'),/筑基期灵草/);
});
test('crafting consumes ingredients',()=>{
 const t=save('太虚符宗');learn(t,'fairy-painting');addItem(t,'healing-herb');addItem(t,'ore');craftSectItem(t,'attack-talisman');assert.equal(t.inventory.length,1);assert.equal(t.inventory[0].itemId,'attack-talisman');assert.throws(()=>craftSectItem(t,'attack-talisman'));
});
test('天工自修按耐久上限收费，满耐久不扣料，损坏饰品重新生效',()=>{
 const s=save('天工阁','金灵根');learn(s,'mending');
 addItem(s,'library-duster');addItem(s,'crit-charm');addItem(s,'ore',7);
 const duster=s.inventory.find(item=>item.itemId==='library-duster'),charm=s.inventory.find(item=>item.itemId==='crit-charm');
 duster.durability=14.5;charm.durability=0;s.equipment.accessoryFate=charm.uid;
 assert.match(repairOwnEquipment(s,duster.uid),/3 个矿石/);assert.equal(duster.durability,15);
 assert.equal(s.inventory.find(item=>item.itemId==='ore').quantity,4);
 assert.throws(()=>repairOwnEquipment(s,duster.uid),/已满/);
 assert.match(repairOwnEquipment(s,charm.uid),/4 个矿石/);assert.equal(charm.durability,20);
 assert.equal(s.inventory.some(item=>item.itemId==='ore'),false);
});
test('自制定身阵盘六次后保留损坏状态，不可上阵或重复获赠免费次数',()=>{
 const s=save('玄机门','冰灵根');learn(s,'planting-flags');addItem(s,'ore',20);
 craftSectItem(s,'crafted-binding-array');const plate=s.inventory.find(item=>item.itemId==='crafted-binding-array');
 assert.equal(plate.usesLeft,6);assert.equal(s.inventory.some(item=>item.itemId==='ore'),false);
 for(let i=0;i<6;i++){
  beginBattle(s,'tough');assert.match(useBattleArray(s,plate.uid),/阵盘发动/);assert.equal(plate.usesLeft,5-i);
  assert.throws(()=>useBattleArray(s,plate.uid),/本轮/);s.battle=null;
 }
 assert.equal(s.inventory.includes(plate),true);assert.equal(plate.usesLeft,0);
 beginBattle(s,'tough');assert.throws(()=>useBattleArray(s,plate.uid),/损坏/);s.battle=null;
 discardJunk(s,plate.uid);assert.equal(s.inventory.includes(plate),false);
 beginBattle(s,'tough');assert.throws(()=>useBattleArray(s),/没有可用的阵盘/);
 addItem(s,'binding-array');assert.match(useBattleArray(s),/阵盘发动/);
 assert.equal(s.inventory.some(item=>item.itemId==='binding-array'),false);
});
