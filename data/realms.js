import {isGoldenRealm} from '../systems/golden-core.js';
export const QI_REALMS = ['炼气一层','炼气二层','炼气三层','炼气四层','炼气五层','炼气六层','炼气七层','炼气八层','炼气九层','炼气十层'];
export const QI_REQUIREMENTS = [150,200,250,300,350,400,500,600,750,1000];
export const FOUNDATION_REALMS=['筑基一层','筑基二层','筑基三层','筑基四层','筑基五层','筑基六层','筑基七层','筑基八层','筑基九层','筑基十层'];
export const FOUNDATION_REQUIREMENTS=[1200,1500,1800,2100,2400,2700,3000,3300,3600,4000];
export const GOLDEN_REALMS=QI_REALMS.map(r=>r.replace('炼气','金丹'));
export const GOLDEN_REQUIREMENTS=[5000,6000,7000,8000,9000,10000,11000,12000,13000,15000];
export function realmProgress(player) {
 const gold=GOLDEN_REALMS.indexOf(player.realm);if(gold>=0)return {index:20+gold,required:GOLDEN_REQUIREMENTS[gold],next:GOLDEN_REALMS[gold+1]??null,complete:gold===9&&Number(player.cultivation)>=15000,current:Number(player.cultivation)||0};
 const qi=QI_REALMS.indexOf(player.realm),foundation=FOUNDATION_REALMS.indexOf(player.realm);
 const index=qi>=0?qi:foundation>=0?10+foundation:-1;
 const required=qi>=0?QI_REQUIREMENTS[qi]:FOUNDATION_REQUIREMENTS[foundation]??null;
 return {index,required,next:qi>=0?QI_REALMS[qi+1]??null:FOUNDATION_REALMS[foundation+1]??null,complete:(index===19&&Number(player.cultivation)>=4000)||(index===9&&Number(player.cultivation)>=1000),current:Number(player.cultivation)||0};
}
// 炼气一至五层：每升一层增加 1 点生命上限。五层之后暂不继续增加。
function foundationMilestones(step){return Number(step>=3)+Number(step>=6)}
export function realmHpBonus(player){if(isGoldenRealm(player))return player.goldenCoreHpBonus||0;const step=Math.max(0,FOUNDATION_REALMS.indexOf(player.realm));return Math.max(0,Math.min(4,realmProgress(player).index))+step*2+foundationMilestones(step)*3}
export function realmBattleBonus(player){
 if(player.goldenCoreBonus)return {...player.goldenCoreBonus};
 if(String(player.realm).startsWith('筑基')){const step=Math.max(0,FOUNDATION_REALMS.indexOf(player.realm)),base={defense:0,mp:0,attack:0,critRate:0,dodgeRate:0,speed:0,...player.foundationBonus};return {...base,attack:Math.round((base.attack+step*.3+foundationMilestones(step)*.2)*100)/100,defense:Math.round((base.defense+step*.08)*100)/100,mp:base.mp+Math.floor(step/2),speed:Math.round((base.speed+step*.3)*100)/100}}
 const tier=isGoldenRealm(player)?-1:realmProgress(player).index;
 const root=String(player.spiritRoot||'');
 const count=root.includes('五灵根')?5:root.includes('四灵根')?4:root.includes('三灵根')?3:root.includes('双灵根')?2:1;
 const defense=count===1?.4:count<=3?.3:.2;
 const attack=count===1?1:count<=3?.7:.5;
 return {defense:tier>=5?defense:0,mp:tier>=6?1:0,attack:(tier>=7?attack:0)+(tier>=9?attack:0),critRate:tier>=8?1:0,dodgeRate:tier>=8?1:0};
}
export function applyRealmHp(save){
 const bonus=realmHpBonus(save.player),applied=Number.isSafeInteger(save.realmHpBonusApplied)?save.realmHpBonusApplied:0;
 if(bonus>applied&&Number.isFinite(save.player.hp))save.player.hp=Math.round((save.player.hp+bonus-applied)*100)/100;
 save.realmHpBonusApplied=bonus;
 const mpBonus=realmBattleBonus(save.player).mp,mpApplied=Number.isFinite(save.realmMpBonusApplied)?save.realmMpBonusApplied:0;
 if(mpBonus>mpApplied&&Number.isFinite(save.player.mp))save.player.mp=Math.round((save.player.mp+mpBonus-mpApplied)*100)/100;
 save.realmMpBonusApplied=mpBonus;
}
export function addCultivation(save,amount) {
 if(isGoldenRealm(save.player)){
  if(!Number.isFinite(amount)||amount<0)return 0;
  let step=GOLDEN_REALMS.indexOf(save.player.realm);if(step<0)return 0;
  let value=Math.round(((Number(save.player.cultivation)||0)+amount)*100)/100,used=amount;
  while(step<9&&value>=GOLDEN_REQUIREMENTS[step]){value-=GOLDEN_REQUIREMENTS[step];step++}
  if(value>15000){used-=value-15000;value=15000}
  save.player.realm=GOLDEN_REALMS[step];save.player.cultivation=Math.round(value*100)/100;
  save.player.cultivationRequired=GOLDEN_REQUIREMENTS[step];
  // Golden breakthrough bonuses are frozen; per-layer attribute growth is deferred.
  return Math.max(0,Math.round(used*100)/100);
 }
 let {index}=realmProgress(save.player);if(index<0||realmProgress(save.player).complete||!Number.isFinite(amount)||amount<=0)return 0;
 let value=Math.round(((Number(save.player.cultivation)||0)+amount)*100)/100,used=amount;
 if(index>=10){
  while(index<19&&value>=FOUNDATION_REQUIREMENTS[index-10]){value-=FOUNDATION_REQUIREMENTS[index-10];index++}
  if(index===19&&value>4000){used-=value-4000;value=4000}
  save.player.realm=FOUNDATION_REALMS[index-10];save.player.cultivation=Math.round(value*100)/100;
  save.player.cultivationRequired=FOUNDATION_REQUIREMENTS[index-10]??null;
  applyRealmHp(save);
  return Math.max(0,Math.round(used*100)/100);
 }
 while(index<9&&value>=QI_REQUIREMENTS[index]){value-=QI_REQUIREMENTS[index];index++}
 if(index===9&&value>QI_REQUIREMENTS[9]){used-=value-QI_REQUIREMENTS[9];value=QI_REQUIREMENTS[9]}
 save.player.realm=QI_REALMS[index];save.player.cultivation=Math.round(value*100)/100;
 save.player.cultivationRequired=QI_REQUIREMENTS[index]??null;
 applyRealmHp(save);
 return Math.max(0,Math.round(used*100)/100);
}
