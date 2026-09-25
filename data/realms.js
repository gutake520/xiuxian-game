export const QI_REALMS = ['炼气一层','炼气二层','炼气三层','炼气四层','炼气五层','炼气六层','炼气七层','炼气八层','炼气九层','炼气十层'];
export const QI_REQUIREMENTS = [150,200,250,300,350,400,500,600,750,1000];
export const FOUNDATION_REALMS=['筑基一层','筑基二层','筑基三层'];
export const FOUNDATION_REQUIREMENTS=[1200,1500,null];
export function realmProgress(player) {
 const qi=QI_REALMS.indexOf(player.realm),foundation=FOUNDATION_REALMS.indexOf(player.realm);
 const index=qi>=0?qi:foundation>=0?10+foundation:-1;
 const required=qi>=0?QI_REQUIREMENTS[qi]:FOUNDATION_REQUIREMENTS[foundation]??null;
 return {index,required,next:qi>=0?QI_REALMS[qi+1]??null:FOUNDATION_REALMS[foundation+1]??null,complete:index===12||index===9&&(Number(player.cultivation)||0)>=1000,current:Number(player.cultivation)||0};
}
// 炼气一至五层：每升一层增加 1 点生命上限。五层之后暂不继续增加。
export function realmHpBonus(player){return Math.max(0,Math.min(4,realmProgress(player).index))}
export function realmBattleBonus(player){
 if(String(player.realm).startsWith('筑基'))return{defense:0,mp:0,attack:0,critRate:0,dodgeRate:0,...player.foundationBonus};
 const tier=realmProgress(player).index;
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
 let {index}=realmProgress(save.player);if(index<0||index>=12||!Number.isFinite(amount)||amount<=0)return 0;
 let value=(Number(save.player.cultivation)||0)+amount,used=amount;
 if(index>=10){
  while(index<12&&value>=FOUNDATION_REQUIREMENTS[index-10]){value-=FOUNDATION_REQUIREMENTS[index-10];index++}
  if(index===12){used-=value;value=0}
  save.player.realm=FOUNDATION_REALMS[index-10];save.player.cultivation=Math.round(value*100)/100;
  save.player.cultivationRequired=FOUNDATION_REQUIREMENTS[index-10]??null;
  return Math.max(0,Math.round(used*100)/100);
 }
 while(index<9&&value>=QI_REQUIREMENTS[index]){value-=QI_REQUIREMENTS[index];index++}
 if(index===9&&value>QI_REQUIREMENTS[9]){used-=value-QI_REQUIREMENTS[9];value=QI_REQUIREMENTS[9]}
 save.player.realm=QI_REALMS[index];save.player.cultivation=Math.round(value*100)/100;
 save.player.cultivationRequired=QI_REQUIREMENTS[index]??null;
 applyRealmHp(save);
 return Math.max(0,Math.round(used*100)/100);
}
