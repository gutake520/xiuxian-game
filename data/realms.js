// 炼气阶段唯一数值来源；大境界突破尚未开放。
export const QI_REALMS = ['炼气一层','炼气二层','炼气三层','炼气四层','炼气五层','炼气六层','炼气七层','炼气八层','炼气九层','炼气十层','炼气圆满'];
export const QI_REQUIREMENTS = [150,200,250,300,350,400,500,600,750,1000];
export function realmProgress(player) {
 const index=QI_REALMS.indexOf(player.realm);
 const required=QI_REQUIREMENTS[index]??null;
 return {index,required,next:QI_REALMS[index+1]??null,complete:index===10,current:Math.max(0,Number(player.cultivation)||0)};
}
export function addCultivation(save,amount) {
 let {index}=realmProgress(save.player);if(index<0||index>=10||!Number.isFinite(amount)||amount<=0)return 0;
 let value=Math.max(0,Number(save.player.cultivation)||0)+amount,used=amount;
 while(index<10&&value>=QI_REQUIREMENTS[index]){value-=QI_REQUIREMENTS[index];index++}
 if(index===10){used-=value;value=0}
 save.player.realm=QI_REALMS[index];save.player.cultivation=Math.round(value*1e6)/1e6;
 save.player.cultivationRequired=QI_REQUIREMENTS[index]??null;
 return Math.max(0,Math.round(used*1e6)/1e6);
}
