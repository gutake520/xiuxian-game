import {chargedMultiplier,rootCount} from '../data/technique-slots.js';
import {QI_MONSTERS,FOUNDATION_MONSTERS} from '../data/locations.js';
import {ITEMS} from '../data/items.js';
import {COMBAT_REWARD_XP} from '../data/balance.js';
import {equipmentStats,awardItem,maxDurability} from './inventory.js';
import {addCultivation,realmProgress} from '../data/realms.js';
import {TECHNIQUES,hasActiveTechnique} from '../data/techniques.js';
import {HERBALIST_NAME,maybeMeetHerbalist} from './encounters.js';
import {maybeMeetDiviner} from './divination.js';
import {startSeniorChallenge} from './sect-tournament.js';
import {BOSS_NAME,bossAttributes,ensureBossLine} from './boss-line.js';
import {selectBattlePet,beastCanFight,beastName} from './pets.js';
import {FOXES} from '../data/foxes.js';

export const round2=value=>Math.round((value+Number.EPSILON)*100)/100;
const herbs=['healing-herb','spirit-herb','qi-herb'];
const foundationHerbs=['foundation-healing-herb','foundation-spirit-herb','foundation-qi-herb'];
const monsters=[...QI_MONSTERS,...FOUNDATION_MONSTERS];
const pick=array=>array[Math.floor(Math.random()*array.length)];
function grant(save,id,quantity,rewards,now,loot){const place=awardItem(save,id,quantity,now);rewards.push(`${ITEMS[id].name}×${quantity}${place==='temporary'?'（临时储物）':''}`);loot.push({itemId:id,quantity,place,uid:place==='bag'?(ITEMS[id].stackable?save.inventory.find(entry=>entry.itemId===id):save.inventory.at(-1))?.uid:save.temporaryLoot.at(-1)?.id})}
function awardVictory(save,monster,now){
 const rewards=[],loot=[];const count=Math.random()<(monster.twoDropChance??.6)?2:3;
 const foundation=monster.stage==='筑基',herbPool=foundation?foundationHerbs:herbs,ore=foundation?'foundation-ore':'ore';
 if(monster.resource==='stones'){save.player.spiritStones=round2(save.player.spiritStones+count);rewards.push(`灵石×${count}`);loot.push({itemId:'stones',quantity:count})}
 else grant(save,monster.resource==='herbs'?pick(herbPool):ore,count,rewards,now,loot);
 const other=pick(monster.resource==='stones'?['herbs','ore']:monster.resource==='herbs'?['stones','ore']:['stones','herbs']);
 if(other==='stones'){save.player.spiritStones=round2(save.player.spiritStones+1);rewards.push('灵石×1');loot.push({itemId:'stones',quantity:1})}
 else grant(save,other==='herbs'?pick(herbPool):ore,1,rewards,now,loot);
 for(const [id,chance] of [[foundation?'foundation-shoes':'wild-shoes',.08],[foundation?'foundation-wild-sword':'wild-sword',.04],[foundation?'foundation-wild-robe':'wild-robe',.04]])if(Math.random()<chance)grant(save,id,1,rewards,now,loot);
 if(Math.random()<.04)grant(save,pick(foundation?['foundation-hp-charm','foundation-mp-charm','foundation-crit-charm','foundation-dodge-charm']:['hp-charm','mp-charm','crit-charm','dodge-charm']),1,rewards,now,loot);
 if(!foundation&&monster.minLevel>=4&&Math.random()<.02)grant(save,'sting-manual',1,rewards,now,loot);
 const xp=addCultivation(save,monster.xp??COMBAT_REWARD_XP);
 return {rewards,xp,loot};
}
function wearEquipment(save){
 for(const [slot,uid] of Object.entries(save.equipment||{})){
  const entry=save.inventory.find(item=>item.uid===uid);if(!entry||ITEMS[entry.itemId]?.kind!=='equipment')continue;
  entry.durability=round2(Math.max(0,(entry.durability??maxDurability(entry))-(['weapon','armor'].includes(slot)?1:.5)));
 }
 const stats=equipmentStats(save);save.player.hp=Math.min(save.player.hp,stats.maxHp);save.player.mp=Math.min(save.player.mp,stats.maxMp);
}
function finish(save,outcome,details={}){
 wearEquipment(save);
 save.lastBattle={id:save.battle.id,monsterId:save.battle.monsterId,monster:save.battle.name,kind:save.battle.kind,outcome,round:save.battle.round,...details};save.battle=null;
 return save.lastBattle;
}
function refillTournament(save){const stats=equipmentStats(save);save.player.hp=round2(stats.maxHp);save.player.mp=round2(stats.maxMp)}
function resolveTournamentLoss(save,outcome,messages){
 const kind=save.battle.kind,result=finish(save,outcome,{log:[...messages]});
 refillTournament(save);
 if(kind==='sect-tournament'&&outcome==='defeat'&&(save.seniorRewards||0)<2&&Math.random()<.1){
  startSeniorChallenge(save);messages.push(`${save.battle.name}走下看台，向你发起挑战。`);
 }else messages.push('切磋结束，生命与法力已恢复。');
 result.log=[...messages];return result;
}
function resolveVictory(save,now,messages){
 const battle=save.battle,monster=monsters.find(entry=>entry.id===battle.monsterId);
 if(battle.kind==='fox-npc'){
  save.foxes??={};save.foxes[battle.monsterId]??={affinity:0,seen:[]};save.foxes[battle.monsterId].met=true;
  const result=finish(save,'victory',{rewards:[],xp:0});messages.push(`${battle.name}收起招式，愿与你正式结识。`);result.log=[...messages];return result;
 }
 if(battle.kind==='wounded-boss'){
  const result=finish(save,'victory',{rewards:[],xp:0,kind:'wounded-boss'});
  save.bossLine.phase='defeated';save.bossLine.insight=true;
  messages.push('仇人倒下，旧日血仇终于有了了断。你获得突破所需的感悟。');
  result.log=[...messages];return result;
 }
 if(battle.kind==='sect-tournament'){
  save.player.spiritStones=round2(save.player.spiritStones+10);
  const result=finish(save,'victory',{rewards:['灵石×10'],xp:0,kind:'sect-tournament'});
  refillTournament(save);
  messages.push('宗门大比获胜，获得 10 灵石。');
  result.log=[...messages];return result;
 }
 if(battle.kind==='sect-senior'){
  const result=finish(save,'victory',{rewards:[],xp:0,kind:'sect-senior'});
  refillTournament(save);
  save.seniorRewardPending={id:crypto.randomUUID()};
  messages.push(`战胜${battle.name}，请选择一次奖励。`);
  result.log=[...messages];return result;
 }
 const result=awardVictory(save,monster,now);
 ensureBossLine(save);
 finish(save,'victory',result);
 messages.push(`胜利！修为 +${result.xp}，${result.rewards.join('、')}。`);
 if(save.bossLine?.phase==='ambush')messages.push('你刚踏入炼气十层，故人衣纹忽然在山道尽头出现。');
 else if(monster.humanoid&&!battle.retaliation&&save.player.hp>0&&Math.random()<.3){
  beginBattle(save,monster.id,null,true);
  save.battle.log=[...messages.slice(-3),'你敢杀我兄弟？对方的同伴冲出，追战开始。'].slice(-10);
 }else{
  if(maybeMeetDiviner(save,battle.id,result.loot,now))messages.push('归途中遇见卦师，他请你抛一枚铜钱。');
  if(maybeMeetHerbalist(save,battle.id))messages.push(`归途中遇见受伤的${HERBALIST_NAME}，他向你讨一株回血草。`);
 }
 delete save.lastBattle.loot;
 save.lastBattle.log=[...messages];
 return save.lastBattle;
}
export function beginBattle(save,id,pet=null,retaliation=false){
 if(save.battle)throw new Error('尚有未结束的战斗。');
 if(save.divinationPending)throw new Error('请先回应卦师。');
 if(save.encounterPending)throw new Error(`请先回应${HERBALIST_NAME}。`);
 if(save.seniorRewardPending)throw new Error('请先领取大比奖励。');
 if(save.bossLine?.phase==='ambush'||save.bossLine?.rescuePending)throw new Error('请先走完当前剧情。');
 if(save.player.cultivation< -100)throw new Error('请先去修炼。');
 const tier=realmProgress(save.player).index;if(tier<0)throw new Error('当前境界暂未开放此处战斗。');
 if(save.player.hp<=0)throw new Error('生命不足，无法迎战。');
 if(id==='wounded-boss'){
  if(save.bossLine?.phase!=='wounded')throw new Error('这里没有可挑战的仇人。');
  const foe=bossAttributes(save,1.1),chosen=selectBattlePet(save,pet);
  save.battle={id:crypto.randomUUID(),kind:'wounded-boss',monsterId:null,name:BOSS_NAME,maxHp:foe.maxHp,hp:foe.maxHp,attack:foe.attack,defense:foe.defense,speed:foe.speed,maxMp:foe.maxMp,mp:foe.maxMp,critRate:foe.critRate,dodgeRate:foe.dodgeRate,round:0,pet:chosen,petName:chosen?(beastCanFight(save,chosen)?beastName(save,chosen):'租借灵兽'):null,guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,freeArrayUsed:false,criticalFocus:false,skillReady:{},log:['你在山中找到了负伤的仇人。旧怨未了，战斗开始。']};
  return save.battle;
 }
 if(FOXES[id]){
  const fox=FOXES[id],chosen=selectBattlePet(save,pet);
  save.battle={id:crypto.randomUUID(),kind:'fox-npc',monsterId:id,name:fox.name,stage:'炼气',maxHp:fox.hp,hp:fox.hp,attack:fox.attack,defense:.3,speed:5,maxMp:5,mp:5,round:0,pet:chosen,petName:chosen?(beastCanFight(save,chosen)?beastName(save,chosen):'租借灵兽'):null,petStage:String(save.player.realm).startsWith('筑基')?'筑基':'炼气',guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,freeArrayUsed:false,criticalFocus:false,skillReady:{},log:[`${fox.name}向你出手。`]};
  return save.battle;
 }
 const monster=monsters.find(entry=>entry.id===id);if(!monster)throw new Error('对手不存在。');
 if(monster.stage==='筑基'&&tier<10)throw new Error('需筑基一层方可前往此处。');
 if(monster.stage!=='筑基'&&tier+1<monster.minLevel)throw new Error(`需炼气${['一','二','三','四','五','六','七','八','九','十'][monster.minLevel-1]}层解锁此处。`);
 selectBattlePet(save,pet);
 const maxHp=monster.hpMin+Math.floor(Math.random()*(monster.hpMax-monster.hpMin+1));
 save.battle={id:crypto.randomUUID(),monsterId:id,name:monster.name,stage:monster.stage||'炼气',maxHp,hp:maxHp,attack:monster.attack,speed:monster.speed,mp:monster.mp||0,round:0,pet,petName:pet?(beastCanFight(save,pet)?beastName(save,pet):'租借灵兽'):null,petStage:String(save.player.realm).startsWith('筑基')?'筑基':'炼气',retaliation,guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,freeArrayUsed:false,criticalFocus:false,skillReady:{},log:['狭路相逢，战斗开始。']};
 return save.battle;
}
export function playRound(save,action='attack',now=Date.now()){
 const battle=save.battle;if(!battle)throw new Error('没有正在进行的战斗。');
 const tournament=['sect-tournament','sect-senior'].includes(battle.kind),foxFight=battle.kind==='fox-npc',armored=tournament||battle.kind==='wounded-boss'||foxFight;
 if(foxFight&&battle.foxParalyzeRound===battle.round+1)action='skip';
 const skill=TECHNIQUES[action];
 if(!['attack','skip'].includes(action)&&skill?.type!=='combat')throw new Error('请选择可用的行动。');
 if(battle.pendingStrike&&action!=='attack'&&!(foxFight&&battle.foxParalyzeRound===battle.round+1))throw new Error('蓄势攻击将在本轮自动施放。');
 const messages=[];let dealt=0,taken=0;
 if(battle.stingRound===battle.round+1){battle.stingRound=0;const dot=round2(2*(hasActiveTechnique(save,'one-sword')?1.1:1));battle.hp=round2(Math.max(0,battle.hp-dot));messages.push(`蛰一下继续生效，对手失去 ${dot.toFixed(2)} 生命。`);if(battle.hp<=0){battle.round++;const result=resolveVictory(save,now,messages);return {messages,dealt,taken,result}}}
 const mpCost=action==='spirit-burn'?save.player.mp:save.techniques.upgraded?.includes(action)?action==='only-once'?3:2:skill?.mpCost??1;
 if(skill){if(skill.passive)throw new Error('被动功法无需主动施放。');if(!hasActiveTechnique(save,action))throw new Error('尚未装备这门功法。');if(action==='cooldown-reset'&&battle.cooldownResetUsed)throw new Error('本场已经使用过重置功法。');if(action==='only-once'&&battle.criticalFocus)throw new Error('本场战斗已使用过这门功法。');if((battle.skillReady?.[action]||0)>battle.round+1)throw new Error('这门功法仍在冷却。');if(save.player.mp<mpCost||action==='spirit-burn'&&save.player.mp<=0)throw new Error('法力不足，无法施放。')}
 const stats=equipmentStats(save),playerFirst=stats.speed>=battle.speed;
 const guarded=action==='iron-wall';
 let enemyAction='attack';
 if(tournament&&!(battle.silencedTurns>0)&&(battle.mp||0)>=1){
  if(battle.round%3===1)enemyAction='iron-wall';
  else if((battle.enemySkillReady||0)<=battle.round+1)enemyAction='strengthen-attack';
 }
 const playerTurn=()=>{
  const prepared=!!battle.pendingStrike;if(prepared&&action!=='skip')battle.pendingStrike=false;
  if(action==='skip'){messages.push(foxFight&&battle.foxParalyzeRound===battle.round+1?'落英缤纷困住了你，本轮无法行动。':'你选择跳过本轮。');return}
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
   const multiplier=prepared?(rootCount(save.player)===1?2.5:rootCount(save.player)<=3?2.4:2.3):action==='self-as-self'?1.7:action==='charged-strike'||action==='silent-strike'?chargedMultiplier(save.player):action==='strengthen-attack'?1.1:action==='gamble-strike'?(Math.random()<.5?(upgraded?1.6:1.5):(upgraded?0.9:0.8)):1;
   dealt=round2(Math.max(1,stats.attack*(crit?1.5:1)*multiplier));
   damageIntro=`${prepared?'等等再来：':skill?skill.name+'：':''}你${crit?'暴击，':''}造成`;
  }
  if(action==='catch-breath'){const gained=round2(Math.min(1,stats.maxMp-save.player.mp));save.player.mp=round2(save.player.mp+gained);messages.push(`法力恢复 ${gained.toFixed(2)}。`)}
  if(armored){
   if(Math.random()<battle.dodgeRate/100){messages.push(`${battle.name}避开了这一击。`);dealt=0;return}
   if(action==='silent-strike'&&battle.hp>0&&playerFirst)enemyAction='attack';
   dealt=round2(Math.max(1,dealt-battle.defense-(enemyAction==='iron-wall'?1:0)));
  }
  if(hasActiveTechnique(save,'one-sword'))dealt=round2(dealt*1.1);
  messages.push(`${damageIntro} ${dealt.toFixed(2)} 伤害。`);
  const actual=Math.min(battle.hp,dealt);
  battle.hp=round2(Math.max(0,battle.hp-dealt));
  const weapon=save.inventory.find(entry=>entry.uid===save.equipment?.weapon);
  if(playerFirst&&battle.hp>0&&weapon?.durability>0&&ITEMS[weapon.itemId]?.stunChance&&Math.random()<ITEMS[weapon.itemId].stunChance){battle.stunnedRound=battle.round+1;messages.push('裂风剑震乱对手气息，对手本轮无法行动。')}
  if(action==='silent-strike'&&battle.hp>0){battle.silencedTurns=2;messages.push(`${battle.name}接下来两次行动无法使用技能。`)}
  if(action==='sting'&&battle.hp>0)battle.stingRound=battle.round+2;
  if(hasActiveTechnique(save,'life-steal')){const heal=round2(Math.min(stats.maxHp-save.player.hp,actual*.1));save.player.hp=round2(save.player.hp+heal);if(heal>0)messages.push(`吸取生命 ${heal.toFixed(2)}。`)}
  if(action==='empty-hands'&&battle.hp>0&&Math.random()<(save.techniques.upgraded?.includes(action)?.3:.2)){const stolen=round2(Math.min(round2((save.techniques.upgraded?.includes(action)?5:2)*(hasActiveTechnique(save,'one-sword')?1.1:1)),battle.hp)),healed=round2(Math.min(stolen,stats.maxHp-save.player.hp));battle.hp=round2(battle.hp-stolen);save.player.hp=round2(save.player.hp+healed);dealt=round2(dealt+stolen);messages.push(`妙手空空抽取 ${stolen.toFixed(2)} 生命，恢复 ${healed.toFixed(2)}。`)}
 };
 const enemyTurn=()=>{
  if(battle.bindRounds?.includes(battle.round+1)||battle.stunnedRound===battle.round+1){messages.push(battle.stunnedRound===battle.round+1?'对手被裂风剑震晕，本轮无法行动。':'对手被阵盘困住，无法行动。');return}
  const silenced=(battle.silencedTurns||0)>0;
  if(silenced){battle.silencedTurns--;messages.push(`${battle.name}被压制，只能普攻。`)}
  if(tournament){
   if(silenced)enemyAction='attack';
   else if(enemyAction!=='attack'){battle.mp=round2(battle.mp-1);if(enemyAction==='strengthen-attack')battle.enemySkillReady=battle.round+4;messages.push(`${battle.name}使出${enemyAction==='iron-wall'?'铜墙铁壁':'强化普通'}。`)}
  }
  if(foxFight&&!silenced&&battle.mp>=1){
   if((battle.foxBloomReady||0)<=battle.round+1){enemyAction='fox-bloom';battle.mp--;battle.foxBloomReady=battle.round+4;battle.foxParalyzeRound=battle.round+2;messages.push(`${battle.name}使出落英缤纷，你下一轮无法行动。`)}
   else if((battle.enemySkillReady||0)<=battle.round+1){enemyAction='strengthen-attack';battle.mp--;battle.enemySkillReady=battle.round+4;messages.push(`${battle.name}使出强化普通。`)}
  }
 const monster=monsters.find(entry=>entry.id===battle.monsterId);
  const empowered=!tournament&&!silenced&&monster?.attackBoost&&(battle.mp||0)>0&&(battle.enemySkillReady||0)<=battle.round+1;
  const enemyCrit=armored&&enemyAction!=='iron-wall'&&Math.random()<battle.critRate/100;
  const rawDamage=round2(enemyAction==='fox-bloom'?2:armored?(enemyAction==='iron-wall'?1:battle.attack*(enemyAction==='strengthen-attack'?1.1:1)*(enemyCrit?1.5:1)):battle.attack*(empowered?monster.attackBoost:1));
  if(empowered){battle.mp--;battle.enemySkillReady=battle.round+monster.boostCooldown+2;messages.push(`${battle.name}使出强化攻击。`)}
  if(enemyCrit)messages.push(`${battle.name}打出暴击。`);
  if(Math.random()<stats.dodgeRate/100){messages.push('你闪开了对手的攻击。');return}
  if(battle.guard){battle.guard=false;messages.push('护身符抵挡了这次伤害。');return}
  const afterDefense=enemyAction==='fox-bloom'?2:Math.max(1,rawDamage-stats.defense-(guarded?1:0));
  const capped=action==='only-one'&&playerFirst?Math.min(1,afterDefense):afterDefense;
  const guardAmount=battle.pet==='guard'?(battle.petStage==='筑基'?.5:.3):0;
  taken=round2(Math.max(0,capped-guardAmount));save.player.hp=round2(Math.max(0,save.player.hp-taken));
  if(battle.pet==='guard')messages.push(`${battle.petName||'灵兽'}抵挡 ${guardAmount.toFixed(2)} 伤害。`);
  messages.push(`你受到 ${taken.toFixed(2)} 伤害。`);
  if(taken>0&&save.player.hp>0&&hasActiveTechnique(save,'resentment')){const reflected=round2(rawDamage*.1);battle.hp=round2(Math.max(0,battle.hp-reflected));messages.push(`以怨报怨，反弹 ${reflected.toFixed(2)} 伤害。`)}
 };
 const playerAction=()=>{playerTurn();if(battle.pet==='attack'&&battle.hp>0){const bonus=battle.petStage==='筑基'?.8:.5;battle.hp=round2(Math.max(0,battle.hp-bonus));messages.push(`${battle.petName||'灵兽'}追加 ${bonus.toFixed(2)} 伤害。`)}};
 if(playerFirst){playerAction();if(battle.hp>0)enemyTurn()}
 else{enemyTurn();if(save.player.hp>0&&battle.hp>0)playerAction()}
 if(battle.regenRounds>0&&save.player.hp>0&&battle.hp>0){const heal=round2(Math.min(2,stats.maxHp-save.player.hp));save.player.hp=round2(save.player.hp+heal);battle.regenRounds--;messages.push(`妙手回春恢复 ${heal.toFixed(2)} 生命。`)}
 battle.round++;
 battle.bindRounds=(battle.bindRounds||[]).filter(round=>round>battle.round);
 if(battle.hp<=0)resolveVictory(save,now,messages);
 else if(save.player.hp<=0){if(tournament)resolveTournamentLoss(save,'defeat',messages);else{save.player.cultivation=round2(save.player.cultivation-50);save.player.hp=5;finish(save,'defeat');messages.push('战败：修为 −50，生命恢复至 5；无战利品。')}}
 else{battle.log=[...battle.log,...messages].slice(-10)}
 return {messages,dealt,taken,result:save.lastBattle?.id===battle.id?save.lastBattle:null};
}
function consumeItem(save,id){
 const entry=save.inventory.find(item=>item.itemId===id);
 if(!entry)throw new Error('储物中没有对应道具。');
 if(entry.quantity>1)entry.quantity--;else save.inventory=save.inventory.filter(item=>item!==entry);
}
export function useBattleArray(save,uid){
 const battle=save.battle;if(!battle)throw new Error('没有正在进行的战斗。');
 if(battle.arrayRound===battle.round+1)throw new Error('本轮已经使用过阵盘。');
 const ids=['binding-array','crafted-binding-array','foundation-binding-array','foundation-crafted-array'];
 const targetFoundation=battle.stage==='筑基'||battle.kind==='wounded-boss'||String(save.player.realm).startsWith('筑基')&&['sect-tournament','sect-senior'].includes(battle.kind);
 const entry=uid?save.inventory.find(item=>item.uid===uid):save.inventory.find(item=>ids.includes(item.itemId)&&(!item.itemId.includes('crafted')||item.usesLeft>0)&&(!targetFoundation||ITEMS[item.itemId]?.stage==='筑基'));
 if(!entry||!ids.includes(entry.itemId))throw new Error('储物中没有可用的阵盘。');
 if(targetFoundation&&ITEMS[entry.itemId].stage!=='筑基')throw new Error('此阵灵力不足，困不住筑基修士。');
 if(ITEMS[entry.itemId].stage==='筑基'&&!String(save.player.realm).startsWith('筑基'))throw new Error('灵力尚浅，无法催动这枚阵盘。');
 const crafted=entry.itemId.includes('crafted');
 if(crafted){
  if(!Number.isInteger(entry.usesLeft)||entry.usesLeft<=0)throw new Error('这枚阵盘已经损坏。');
  entry.usesLeft--;
 }else if(entry.quantity>1)entry.quantity--;else save.inventory=save.inventory.filter(item=>item!==entry);
 battle.arrayRound=battle.round+1;
 battle.bindRounds??=[];battle.bindRounds.push(battle.round+2);
 const message=`阵盘发动，对手下一轮无法行动；你仍可进行本轮行动。${crafted?entry.usesLeft?'剩余 '+entry.usesLeft+' 次。':'阵盘已损坏。':''}`;
 battle.log=[...battle.log,message].slice(-10);
 return message;
}
export function useBattleTalisman(save,id){
 const battle=save.battle;if(!battle)throw new Error('没有正在进行的战斗。');
 if(!['attack-talisman','guard-talisman','foundation-attack-talisman','foundation-guard-talisman'].includes(id))throw new Error('符箓不存在。');
 if(ITEMS[id].stage==='筑基'&&!String(save.player.realm).startsWith('筑基'))throw new Error('灵力尚浅，无法催动这张符箓。');
 if(battle.talismansUsed>=2)throw new Error('每场最多使用两张符箓。');
 if(battle.talismanRound===battle.round+1)throw new Error('本轮已经使用过符箓。');
 consumeItem(save,id);battle.talismansUsed++;battle.talismanRound=battle.round+1;
 const damage=ITEMS[id].damage||(id==='attack-talisman'?2:0),message=damage?`${ITEMS[id].name}额外造成 ${damage.toFixed(2)} 伤害。`:`${ITEMS[id].name}准备抵挡下一次伤害。`;
 if(damage)battle.hp=round2(Math.max(0,battle.hp-damage));else battle.guard=true;
 battle.log=[...battle.log,message].slice(-10);
 if(battle.hp<=0)resolveVictory(save,Date.now(),[message]);
 return message;
}
export function fleeBattle(save){
 if(!save.battle)throw new Error('没有正在进行的战斗。');
 if(['sect-tournament','sect-senior'].includes(save.battle.kind)){const result=finish(save,'fled',{log:['你结束了这场切磋。']});refillTournament(save);return result}
 const paid=save.player.spiritStones>=3;
 if(paid)save.player.spiritStones=round2(save.player.spiritStones-3);
 else save.player.cultivation=round2(save.player.cultivation-30);
 return finish(save,'fled',{cost:paid?'灵石 −3':'修为 −30',log:[paid?'你支付 3 灵石脱离战斗。':'灵石不足，脱离战斗扣除 30 修为。']});
}
