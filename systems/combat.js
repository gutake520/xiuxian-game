import {QI_MONSTERS} from '../data/locations.js';
import {ITEMS} from '../data/items.js';
import {DURABILITY_MAX,COMBAT_REWARD_XP} from '../data/balance.js';
import {equipmentStats,awardItem} from './inventory.js';
import {addCultivation,realmProgress} from '../data/realms.js';
import {TECHNIQUES} from '../data/techniques.js';

export const round2=value=>Math.round((value+Number.EPSILON)*100)/100;
const herbs=['healing-herb','spirit-herb','qi-herb'];
const pick=array=>array[Math.floor(Math.random()*array.length)];
function grant(save,id,quantity,rewards,now){const place=awardItem(save,id,quantity,now);rewards.push(`${ITEMS[id].name}×${quantity}${place==='temporary'?'（临时储物）':''}`)}
function awardVictory(save,monster,now){
 const rewards=[];const count=Math.random()<(monster.twoDropChance??.6)?2:3;
 if(monster.resource==='stones'){save.player.spiritStones=round2(save.player.spiritStones+count);rewards.push(`灵石×${count}`)}
 else grant(save,monster.resource==='herbs'?pick(herbs):'ore',count,rewards,now);
 const other=pick(monster.resource==='stones'?['herbs','ore']:monster.resource==='herbs'?['stones','ore']:['stones','herbs']);
 if(other==='stones'){save.player.spiritStones=round2(save.player.spiritStones+1);rewards.push('灵石×1')}
 else grant(save,other==='herbs'?pick(herbs):'ore',1,rewards,now);
 for(const [id,chance] of [['wild-shoes',.08],['wild-sword',.04],['wild-robe',.04]])if(Math.random()<chance)grant(save,id,1,rewards,now);
 if(Math.random()<.04)grant(save,pick(['hp-charm','mp-charm','crit-charm','dodge-charm']),1,rewards,now);
 const xp=addCultivation(save,COMBAT_REWARD_XP);
 return {rewards,xp};
}
function wearEquipment(save){
 for(const [slot,uid] of Object.entries(save.equipment||{})){
  const entry=save.inventory.find(item=>item.uid===uid);if(!entry||ITEMS[entry.itemId]?.kind!=='equipment')continue;
  entry.durability=round2(Math.max(0,(entry.durability??DURABILITY_MAX)-(['weapon','armor'].includes(slot)?1:.5)));
 }
 const stats=equipmentStats(save);save.player.hp=Math.min(save.player.hp,stats.maxHp);save.player.mp=Math.min(save.player.mp,stats.maxMp);
}
function finish(save,outcome,details={}){
 wearEquipment(save);
 save.lastBattle={id:save.battle.id,monster:save.battle.name,outcome,round:save.battle.round,...details};save.battle=null;
 return save.lastBattle;
}
export function beginBattle(save,id,pet=null){
 if(save.battle)throw new Error('尚有未结束的战斗。');
 if(save.player.cultivation< -100)throw new Error('请先去修炼。');
 const tier=realmProgress(save.player).index;if(tier<0)throw new Error('当前境界暂未开放此处战斗。');
 if(save.player.hp<=0)throw new Error('生命不足，无法迎战。');
 const monster=QI_MONSTERS.find(entry=>entry.id===id);if(!monster)throw new Error('小妖不存在。');
 if(tier<(monster.minTier??0))throw new Error('此小妖需炼气四层解锁。');
 if(pet!==null){if(!['attack','guard'].includes(pet))throw new Error('灵兽类型无效。');if((save.petRentals||0)<1)throw new Error('尚未租借灵兽。');save.petRentals--}
 const maxHp=monster.hpMin+Math.floor(Math.random()*(monster.hpMax-monster.hpMin+1));
 save.battle={id:crypto.randomUUID(),monsterId:id,name:monster.name,maxHp,hp:maxHp,attack:monster.attack,speed:monster.speed,round:0,pet,guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,freeArrayUsed:false,skillReady:{},log:['狭路相逢，战斗开始。']};
 return save.battle;
}
export function playRound(save,action='attack',now=Date.now()){
 const battle=save.battle;if(!battle)throw new Error('没有正在进行的战斗。');
 const skill=TECHNIQUES[action];
 if(!['attack','skip'].includes(action)&&skill?.type!=='combat')throw new Error('请选择可用的行动。');
 if(skill){if(!save.techniques?.mastered?.includes(action)||!save.techniques.combat?.includes(action))throw new Error('尚未装备这门功法。');if((battle.skillReady?.[action]||0)>battle.round+1)throw new Error('这门功法仍在冷却。')}
 const stats=equipmentStats(save),messages=[],playerFirst=stats.speed>=battle.speed;
 const guarded=action==='iron-wall';
 if(skill?.cooldown){battle.skillReady??={};battle.skillReady[action]=battle.round+skill.cooldown+2}
 let dealt=0,taken=0;
 const playerTurn=()=>{
  if(action==='skip'){messages.push('你选择跳过本轮。');return}
  if(guarded){dealt=1;messages.push('铜墙铁壁护住周身，同时造成 1.00 伤害。')}
  else{
   const crit=Math.random()<stats.critRate/100;
   const multiplier=action==='strengthen-attack'?1.1:action==='gamble-strike'?(Math.random()<.5?1.5:.8):1;
   dealt=round2(Math.max(1,stats.attack*(crit?1.5:1)*multiplier));
   messages.push(`${skill?skill.name+'：':''}你${crit?'暴击，':''}造成 ${dealt.toFixed(2)} 伤害。`);
  }
  battle.hp=round2(Math.max(0,battle.hp-dealt));
 };
 const enemyTurn=()=>{
  if(battle.bindRounds?.includes(battle.round+1)){messages.push('小妖被阵盘困住，无法行动。');return}
  if(Math.random()<stats.dodgeRate/100){messages.push('你闪开了小妖的攻击。');return}
  if(battle.guard){battle.guard=false;messages.push('护身符抵挡了这次伤害。');return}
  taken=round2(Math.max(0,Math.max(1,battle.attack-stats.defense*(guarded?1.5:1))-(battle.pet==='guard'?.3:0)));save.player.hp=round2(Math.max(0,save.player.hp-taken));
  messages.push(`你受到 ${taken.toFixed(2)} 伤害。`);
 };
 const playerAction=()=>{playerTurn();if(battle.pet==='attack'&&battle.hp>0){battle.hp=round2(Math.max(0,battle.hp-.5));messages.push('灵兽追加 0.50 伤害。')}};
 if(playerFirst){playerAction();if(battle.hp>0)enemyTurn()}
 else{enemyTurn();if(save.player.hp>0)playerAction()}
 battle.round++;
 battle.bindRounds=(battle.bindRounds||[]).filter(round=>round>battle.round);
 if(battle.hp<=0){const result=awardVictory(save,QI_MONSTERS.find(entry=>entry.id===battle.monsterId),now);finish(save,'victory',result);messages.push(`胜利！修为 +${result.xp}，${result.rewards.join('、')}。`)}
 else if(save.player.hp<=0){save.player.cultivation=round2(save.player.cultivation-50);save.player.hp=5;finish(save,'defeat');messages.push('战败：修为 −50，生命恢复至 5；无战利品。')}
 else{battle.log=[...battle.log,...messages].slice(-10)}
 if(save.lastBattle?.outcome&& !save.battle)save.lastBattle.log=messages;
 return {messages,dealt,taken,result:save.lastBattle?.id===battle.id?save.lastBattle:null};
}
function consumeItem(save,id){
 const entry=save.inventory.find(item=>item.itemId===id);
 if(!entry)throw new Error('储物中没有对应道具。');
 if(entry.quantity>1)entry.quantity--;else save.inventory=save.inventory.filter(item=>item!==entry);
}
export function useBattleArray(save){
 const battle=save.battle;if(!battle)throw new Error('没有正在进行的战斗。');
 if(battle.arrayRound===battle.round+1)throw new Error('本轮已经使用过阵盘。');
 const own=save.player.sect==='玄机门'&&!battle.freeArrayUsed;
 if(own)battle.freeArrayUsed=true;
 else consumeItem(save,'binding-array');
 battle.arrayRound=battle.round+1;
 battle.bindRounds??=[];battle.bindRounds.push(battle.round+2);
 const message='阵盘发动，小妖下一轮无法行动；你仍可进行本轮行动。';
 battle.log=[...battle.log,message].slice(-10);
 return message;
}
export function useBattleTalisman(save,id){
 const battle=save.battle;if(!battle)throw new Error('没有正在进行的战斗。');
 if(!['attack-talisman','guard-talisman'].includes(id))throw new Error('符箓不存在。');
 if(battle.talismansUsed>=2)throw new Error('每场最多使用两张符箓。');
 if(battle.talismanRound===battle.round+1)throw new Error('本轮已经使用过符箓。');
 consumeItem(save,id);battle.talismansUsed++;battle.talismanRound=battle.round+1;
 const message=id==='attack-talisman'?'攻击符额外造成 2.00 伤害。':'护身符准备抵挡下一次伤害。';
 if(id==='attack-talisman')battle.hp=round2(Math.max(0,battle.hp-2));else battle.guard=true;
 battle.log=[...battle.log,message].slice(-10);
 if(battle.hp<=0){const reward=awardVictory(save,QI_MONSTERS.find(monster=>monster.id===battle.monsterId),Date.now());finish(save,'victory',reward);save.lastBattle.log=[message,`胜利！修为 +${reward.xp}，${reward.rewards.join('、')}。`]}
 return message;
}
export function fleeBattle(save){
 if(!save.battle)throw new Error('没有正在进行的战斗。');
 const paid=save.player.spiritStones>=3;
 if(paid)save.player.spiritStones=round2(save.player.spiritStones-3);
 else save.player.cultivation=round2(save.player.cultivation-30);
 return finish(save,'fled',{cost:paid?'灵石 −3':'修为 −30',log:[paid?'你支付 3 灵石脱离战斗。':'灵石不足，脱离战斗扣除 30 修为。']});
}
