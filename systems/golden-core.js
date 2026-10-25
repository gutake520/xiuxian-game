import {rootCount} from '../data/technique-slots.js';
export const isGoldenRealm=player=>/^(金丹|元婴|化神|炼虚|合体|大乘|渡劫)/.test(String(player.realm));
// Breakthrough settlement uses this table when the golden-core trial is introduced.
export function goldenCoreReward(player){
 const n=rootCount(player);
 return {hp:n===1?20:n<=3?16:12,mp:n===1?4:3,attack:n===1?4:n<=3?3.4:2.8,defense:n===1?2:n<=3?1.6:1.2,speed:5,critRate:n===1?3:n<=3?2:1,dodgeRate:2};
}
export function awakenGoldenCoreTechnique(save){
 if(!isGoldenRealm(save.player)||![2,3].includes(rootCount(save.player)))return false;
 save.techniques??={};save.techniques.mastered??=[];
 if(save.techniques.mastered.includes('same-destination'))return false;
 save.techniques.mastered.push('same-destination');return true;
}
export function convergingDamage(attack,defense,crit=false){
 const power=attack*(crit?1.5:1),round=v=>Math.round(v*100)/100;
 return [round(Math.max(1,power*1.2-defense)),round(Math.max(1,power*.8-defense*.5))];
}
