import {chargedMultiplier,rootCount} from '../data/technique-slots.js';
import {QI_MONSTERS} from '../data/locations.js';
import {ITEMS} from '../data/items.js';
import {DURABILITY_MAX,COMBAT_REWARD_XP} from '../data/balance.js';
import {equipmentStats,awardItem} from './inventory.js';
import {addCultivation,realmProgress} from '../data/realms.js';
import {TECHNIQUES,hasActiveTechnique} from '../data/techniques.js';
import {HERBALIST_NAME,maybeMeetHerbalist} from './encounters.js';

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
 if((monster.minTier??0)>=3&&Math.random()<.02)grant(save,'sting-manual',1,rewards,now);
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
 save.lastBattle={id:save.battle.id,monster:save.battle.name,kind:save.battle.kind,outcome,round:save.battle.round,...details};save.battle=null;
 return save.lastBattle;
}
function resolveVictory(save,now,messages){
 const battle=save.battle,monster=QI_MONSTERS.find(entry=>entry.id===battle.monsterId);
 if(battle.kind==='sect-tournament'){
  save.player.spiritStones=round2(save.player.spiritStones+10);
  const result=finish(save,'victory',{rewards:['灵石×10'],xp:0,kind:'sect-tournament'});
  messages.push('宗门大比获胜，获得 10 灵石。');
  result.log=[...messages];return result;
 }
 const result=awardVictory(save,monster,now);
 finish(save,'victory',result);
 messages.push(`胜利！修为 +${result.xp}，${result.rewards.join('、')}。`);
 if(monster.humanoid&&!battle.retaliation&&save.player.hp>0&&Math.random()<.3){
  beginBattle(save,monster.id,null,true);
  save.battle.log=[...messages.slice(-3),'你敢杀我兄弟？对方的同伴冲出，追战开始。'].slice(-10);
 }else if(maybeMeetHerbalist(save,battle.id))messages.push(`归途中遇见受伤的${HERBALIST_NAME}，他向你讨一株回血草。`);
 save.lastBattle.log=[...messages];
 return save.lastBattle;
}
export function beginBattle(save,id,pet=null,retaliation=false){
 if(save.battle)throw new Error('尚有未结束的战斗。');
 if(save.encounterPending)throw new Error(`请先回应${HERBALIST_NAME}。`);
 if(save.player.cultivation< -100)throw new Error('请先去修炼。');
 const tier=realmProgress(save.player).index;if(tier<0)throw new Error('当前境界暂未开放此处战斗。');
 if(save.player.hp<=0)throw new Error('生命不足，无法迎战。');
 const monster=QI_MONSTERS.find(entry=>entry.id===id);if(!monster)throw new Error('对手不存在。');
 if(tier<(monster.minTier??0))throw new Error(`需炼气${['一','二','三','四','五','六','七','八','九'][monster.minTier]||'后期'}层解锁此处。`);
 if(pet!==null){if(!['attack','guard'].includes(pet))throw new Error('灵兽类型无效。');if(!(save.spiritBeast&&hasActiveTechnique(save,'beast-keeper'))){if((save.petRentals||0)<1)throw new Error('尚未租借灵兽。');save.petRentals--}}
 const maxHp=monster.hpMin+Math.floor(Math.random()*(monster.hpMax-monster.hpMin+1));
 save.battle={id:crypto.randomUUID(),monsterId:id,name:monster.name,maxHp,hp:maxHp,attack:monster.attack,speed:monster.speed,mp:monster.mp||0,round:0,pet,retaliation,guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,freeArrayUsed:false,criticalFocus:false,skillReady:{},log:['狭路相逢，战斗开始。']};
 return save.battle;
}
export function playRound(save,action='attack',now=Date.now()){
 const battle=save.battle;if(!battle)throw new Error('没有正在进行的战斗。');
 const tournament=battle.kind==='sect-tournament';
 const skill=TECHNIQUES[action];
 if(!['attack','skip'].includes(action)&&skill?.type!=='combat')throw new Error('请选择可用的行动。');
 if(battle.pendingStrike&&action!=='attack')throw new Error('蓄势攻击将在本轮自动施放。');
 const messages=[];let dealt=0,taken=0;
 if(battle.stingRound===battle.round+1){battle.stingRound=0;const dot=round2(2*(hasActiveTechnique(save,'one-sword')?1.1:1));battle.hp=round2(Math.max(0,battle.hp-dot));messages.push(`蛰一下继续生效，对手失去 ${dot.toFixed(2)} 生命。`);if(battle.hp<=0){battle.round++;const result=resolveVictory(save,now,messages);return {messages,dealt,taken,result}}}
 const mpCost=action==='spirit-burn'?save.player.mp:save.techniques.upgraded?.includes(action)?action==='only-once'?3:2:skill?.mpCost??1;
 if(skill){if(skill.passive)throw new Error('被动功法无需主动施放。');if(!hasActiveTechnique(save,action))throw new Error('尚未装备这门功法。');if(action==='cooldown-reset'&&battle.cooldownResetUsed)throw new Error('本场已经使用过重置功法。');if(action==='only-once'&&battle.criticalFocus)throw new Error('本场战斗已使用过这门功法。');if((battle.skillReady?.[action]||0)>battle.round+1)throw new Error('这门功法仍在冷却。');if(save.player.mp<mpCost||action==='spirit-burn'&&save.player.mp<=0)throw new Error('法力不足，无法施放。')}
 const stats=equipmentStats(save),playerFirst=stats.speed>=battle.speed;
 const guarded=action==='iron-wall';
 let enemyAction='attack';
 if(tournament&&(battle.mp||0)>=1){
  if(battle.round%3===1)enemyAction='iron-wall';
  else if((battle.enemySkillReady||0)<=battle.round+1)enemyAction='strengthen-attack';
  if(enemyAction!=='attack'){
   battle.mp=round2(battle.mp-1);
   if(enemyAction==='strengthen-attack')battle.enemySkillReady=battle.round+4;
   messages.push(`${battle.name}准备施展${enemyAction==='iron-wall'?'铜墙铁壁':'强化普通'}。`);
  }
 }
 const playerTurn=()=>{
  const prepared=!!battle.pendingStrike;if(prepared)battle.pendingStrike=false;
  if(action==='skip'){messages.push('你选择跳过本轮。');return}
  if(skill&&!prepared){save.player.mp=round2(save.player.mp-mpCost);if(skill.cooldown){battle.skillReady??={};battle.skillReady[action]=battle.round+skill.cooldown+2}if(['only-once','empty-hands','gamble-strike'].includes(action)){save.techniques.usage??={};save.techniques.usage[action]=(save.techniques.usage[action]||0)+1}}
  if(action==='wait-then-strike'){battle.pendingStrike=true;messages.push('凝聚攻势，下轮自动出手。');return}
  if(action==='cooldown-reset'){battle.cooldownResetUsed=true;for(const id of save.techniques.combat||[])if(id!==action&&battle.skillReady)delete battle.skillReady[id];messages.push('其他已装备功法的冷却已重置。');return}
  if(action==='only-once'){battle.criticalFocus=true;messages.push(`凝聚心神，本场战斗暴击率提高 ${save.techniques.upgraded?.includes(action)?20:15} 个百分点。`);return}
  if(action==='healing-hands'){battle.regenRounds=3;messages.push('妙手回春生效，连续三轮恢复生命。');return}
  let damageIntro='';
  if(action==='spirit-burn'){const count=rootCount(save.player),ratio=count===1?.9:count<=3?.8:.7;dealt=round2(mpCost*ratio);damageIntro=skill.name+'造成'}
  else if(action==='only-one'||action==='empty-hands'||action==='catch-breath'||action==='sting'){dealt=action==='empty-hands'?(save.techniques.upgraded?.includes(action)?3:2):action==='sting'?2:1;damageIntro=skill.name+'造成'}
  else if(guarded){dealt=1;damageIntro='铜墙铁壁护住周身，同时造成'}
  else{
   const crit=Math.random()<Math.min(1,(stats.critRate+(battle.criticalFocus?(save.techniques.upgraded?.includes('only-once')?20:15):0))/100);
   const upgraded=save.techniques.upgraded?.includes(action);
   const multiplier=prepared?(rootCount(save.player)===1?2.5:rootCount(save.player)<=3?2.4:2.3):action==='charged-strike'?chargedMultiplier(save.player):action==='strengthen-attack'?1.1:action==='gamble-strike'?(Math.random()<.5?(upgraded?1.6:1.5):(upgraded?0.9:0.8)):1;
   dealt=round2(Math.max(1,stats.attack*(crit?1.5:1)*multiplier));
   damageIntro=`${prepared?'等等再来：':skill?skill.name+'：':''}你${crit?'暴击，':''}造成`;
  }
  if(action==='catch-breath'){const gained=round2(Math.min(1,stats.maxMp-save.player.mp));save.player.mp=round2(save.player.mp+gained);messages.push(`法力恢复 ${gained.toFixed(2)}。`)}
  if(tournament){
   if(Math.random()<battle.dodgeRate/100){messages.push(`${battle.name}避开了这一击。`);dealt=0;return}
   dealt=round2(Math.max(1,dealt-battle.defense-(enemyAction==='iron-wall'?1:0)));
  }
  if(hasActiveTechnique(save,'one-sword'))dealt=round2(dealt*1.1);
  messages.push(`${damageIntro} ${dealt.toFixed(2)} 伤害。`);
  const actual=Math.min(battle.hp,dealt);
  battle.hp=round2(Math.max(0,battle.hp-dealt));
  if(action==='sting'&&battle.hp>0)battle.stingRound=battle.round+2;
  if(hasActiveTechnique(save,'life-steal')){const heal=round2(Math.min(stats.maxHp-save.player.hp,actual*.1));save.player.hp=round2(save.player.hp+heal);if(heal>0)messages.push(`吸取生命 ${heal.toFixed(2)}。`)}
  if(action==='empty-hands'&&battle.hp>0&&Math.random()<(save.techniques.upgraded?.includes(action)?.3:.2)){const stolen=round2(Math.min(round2((save.techniques.upgraded?.includes(action)?5:2)*(hasActiveTechnique(save,'one-sword')?1.1:1)),battle.hp)),healed=round2(Math.min(stolen,stats.maxHp-save.player.hp));battle.hp=round2(battle.hp-stolen);save.player.hp=round2(save.player.hp+healed);dealt=round2(dealt+stolen);messages.push(`妙手空空抽取 ${stolen.toFixed(2)} 生命，恢复 ${healed.toFixed(2)}。`)}
 };
 const enemyTurn=()=>{
  if(battle.bindRounds?.includes(battle.round+1)){messages.push('对手被阵盘困住，无法行动。');return}
  const monster=QI_MONSTERS.find(entry=>entry.id===battle.monsterId);
  const empowered=!tournament&&monster?.attackBoost&&(battle.mp||0)>0&&(battle.enemySkillReady||0)<=battle.round+1;
  const enemyCrit=tournament&&enemyAction!=='iron-wall'&&Math.random()<battle.critRate/100;
  const rawDamage=round2(tournament?(enemyAction==='iron-wall'?1:battle.attack*(enemyAction==='strengthen-attack'?1.1:1)*(enemyCrit?1.5:1)):battle.attack*(empowered?monster.attackBoost:1));
  if(empowered){battle.mp--;battle.enemySkillReady=battle.round+monster.boostCooldown+2;messages.push(`${battle.name}使出强化攻击。`)}
  if(enemyCrit)messages.push(`${battle.name}打出暴击。`);
  if(Math.random()<stats.dodgeRate/100){messages.push('你闪开了对手的攻击。');return}
  if(battle.guard){battle.guard=false;messages.push('护身符抵挡了这次伤害。');return}
  const afterDefense=Math.max(1,rawDamage-stats.defense-(guarded?1:0));
  const capped=action==='only-one'&&playerFirst?Math.min(1,afterDefense):afterDefense;
  taken=round2(Math.max(0,capped-(battle.pet==='guard'?.3:0)));save.player.hp=round2(Math.max(0,save.player.hp-taken));
  messages.push(`你受到 ${taken.toFixed(2)} 伤害。`);
  if(taken>0&&save.player.hp>0&&hasActiveTechnique(save,'resentment')){const reflected=round2(rawDamage*.1);battle.hp=round2(Math.max(0,battle.hp-reflected));messages.push(`以怨报怨，反弹 ${reflected.toFixed(2)} 伤害。`)}
 };
 const playerAction=()=>{playerTurn();if(battle.pet==='attack'&&battle.hp>0){battle.hp=round2(Math.max(0,battle.hp-.5));messages.push('灵兽追加 0.50 伤害。')}};
 if(playerFirst){playerAction();if(battle.hp>0)enemyTurn()}
 else{enemyTurn();if(save.player.hp>0&&battle.hp>0)playerAction()}
 if(battle.regenRounds>0&&save.player.hp>0&&battle.hp>0){const heal=round2(Math.min(2,stats.maxHp-save.player.hp));save.player.hp=round2(save.player.hp+heal);battle.regenRounds--;messages.push(`妙手回春恢复 ${heal.toFixed(2)} 生命。`)}
 battle.round++;
 battle.bindRounds=(battle.bindRounds||[]).filter(round=>round>battle.round);
 if(battle.hp<=0)resolveVictory(save,now,messages);
 else if(save.player.hp<=0){save.player.cultivation=round2(save.player.cultivation-50);save.player.hp=5;finish(save,'defeat');messages.push('战败：修为 −50，生命恢复至 5；无战利品。')}
 else{battle.log=[...battle.log,...messages].slice(-10)}
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
 const message='阵盘发动，对手下一轮无法行动；你仍可进行本轮行动。';
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
 if(battle.hp<=0)resolveVictory(save,Date.now(),[message]);
 return message;
}
export function fleeBattle(save){
 if(!save.battle)throw new Error('没有正在进行的战斗。');
 const paid=save.player.spiritStones>=3;
 if(paid)save.player.spiritStones=round2(save.player.spiritStones-3);
 else save.player.cultivation=round2(save.player.cultivation-30);
 return finish(save,'fled',{cost:paid?'灵石 −3':'修为 −30',log:[paid?'你支付 3 灵石脱离战斗。':'灵石不足，脱离战斗扣除 30 修为。']});
}
