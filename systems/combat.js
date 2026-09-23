import {QI_MONSTERS} from '../data/locations.js';
import {ITEMS} from '../data/items.js';
import {DURABILITY_MAX,COMBAT_REWARD_XP} from '../data/balance.js';
import {equipmentStats,awardItem} from './inventory.js';
import {addCultivation,realmProgress} from '../data/realms.js';

export const round2=value=>Math.round((value+Number.EPSILON)*100)/100;
const herbs=['healing-herb','spirit-herb','qi-herb'];
const pick=array=>array[Math.floor(Math.random()*array.length)];
function grant(save,id,quantity,rewards,now){const place=awardItem(save,id,quantity,now);rewards.push(`${ITEMS[id].name}×${quantity}${place==='temporary'?'（临时储物）':''}`)}
function awardVictory(save,monster,now){
 const rewards=[];const count=Math.random()<.6?2:3;
 if(monster.resource==='stones'){save.player.spiritStones=round2(save.player.spiritStones+count);rewards.push(`灵石×${count}`)}
 else grant(save,monster.resource==='herbs'?pick(herbs):'ore',count,rewards,now);
 const other=pick(monster.resource==='stones'?['herbs','ore']:monster.resource==='herbs'?['stones','ore']:['stones','herbs']);
 if(other==='stones'){save.player.spiritStones=round2(save.player.spiritStones+1);rewards.push('灵石×1')}
 else grant(save,other==='herbs'?pick(herbs):'ore',1,rewards,now);
 for(const [id,chance] of [['wild-shoes',.1],['wild-sword',.05],['wild-robe',.05]])if(Math.random()<chance)grant(save,id,1,rewards,now);
 if(Math.random()<.05)grant(save,pick(['hp-charm','mp-charm','crit-charm','dodge-charm']),1,rewards,now);
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
export function beginBattle(save,id){
 if(save.battle)throw new Error('尚有未结束的战斗。');
 if(save.player.cultivation< -100)throw new Error('请先去修炼。');
 const tier=realmProgress(save.player).index;if(tier<0||tier>2)throw new Error('此处只开放炼气一至三层的小妖。');
 if(save.player.hp<=0)throw new Error('生命不足，无法迎战。');
 const monster=QI_MONSTERS.find(entry=>entry.id===id);if(!monster)throw new Error('小妖不存在。');
 const maxHp=monster.hpMin+Math.floor(Math.random()*(monster.hpMax-monster.hpMin+1));
 save.battle={id:crypto.randomUUID(),monsterId:id,name:monster.name,maxHp,hp:maxHp,attack:monster.attack,speed:monster.speed,round:0,log:['狭路相逢，战斗开始。']};
 return save.battle;
}
export function playRound(save,action='attack',now=Date.now()){
 const battle=save.battle;if(!battle)throw new Error('没有正在进行的战斗。');
 if(!['attack','skip'].includes(action))throw new Error('当前只能普攻或跳过回合。');
 const stats=equipmentStats(save),messages=[],playerFirst=stats.speed>=battle.speed;
 let dealt=0,taken=0;
 const playerTurn=()=>{
  if(action==='skip'){messages.push('你选择跳过本轮。');return}
  const crit=Math.random()<stats.critRate/100;
  dealt=round2(Math.max(1,stats.attack*(crit?1.5:1)));
  battle.hp=round2(Math.max(0,battle.hp-dealt));messages.push(`你${crit?'暴击，':''}造成 ${dealt.toFixed(2)} 伤害。`);
 };
 const enemyTurn=()=>{
  if(Math.random()<stats.dodgeRate/100){messages.push('你闪开了小妖的攻击。');return}
  taken=round2(Math.max(1,battle.attack-stats.defense));save.player.hp=round2(Math.max(0,save.player.hp-taken));
  messages.push(`你受到 ${taken.toFixed(2)} 伤害。`);
 };
 if(playerFirst){playerTurn();if(battle.hp>0)enemyTurn()}
 else{enemyTurn();if(save.player.hp>0)playerTurn()}
 battle.round++;
 if(battle.hp<=0){const result=awardVictory(save,QI_MONSTERS.find(entry=>entry.id===battle.monsterId),now);finish(save,'victory',result);messages.push(`胜利！修为 +${result.xp}，${result.rewards.join('、')}。`)}
 else if(save.player.hp<=0){save.player.cultivation=round2(save.player.cultivation-50);save.player.hp=5;finish(save,'defeat');messages.push('战败：修为 −50，生命恢复至 5；无战利品。')}
 else{battle.log=[...battle.log,...messages].slice(-10)}
 if(save.lastBattle?.outcome&& !save.battle)save.lastBattle.log=messages;
 return {messages,dealt,taken,result:save.lastBattle?.id===battle.id?save.lastBattle:null};
}
export function fleeBattle(save){
 if(!save.battle)throw new Error('没有正在进行的战斗。');
 const paid=save.player.spiritStones>=3;
 if(paid)save.player.spiritStones=round2(save.player.spiritStones-3);
 else save.player.cultivation=round2(save.player.cultivation-30);
 return finish(save,'fled',{cost:paid?'灵石 −3':'修为 −30',log:[paid?'你支付 3 灵石脱离战斗。':'灵石不足，脱离战斗扣除 30 修为。']});
}
