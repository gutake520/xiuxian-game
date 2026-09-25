import {equipmentStats,awardItem} from './inventory.js';
import {UPGRADEABLE_TECHNIQUES,TECHNIQUES} from '../data/techniques.js';
import {selectBattlePet,beastCanFight,beastName} from './pets.js';

export const SECT_TOURNAMENT_INTERVAL=3*24*60*60*1000;
export const SECT_TOURNAMENT_NAMES={
 天工阁:{male:['顾砚锋','韩铸山','齐承钧'],female:['叶霜锷','沈砺秋','裴青钧']},
 丹霞谷:{male:['徐知蘅','程药川','柳云岫'],female:['霍照棠','姜焰青','谢南枝']},
 青岚谷:{male:['温时雨','宋归蘅','陆清衡'],female:['许照雪','林知微','楚霁岚']},
 合欢宗:{male:['谢临渊','沈闻歌','顾流景'],female:['秦绯月','祝惊鸿','裴映雪']},
 万灵山:{male:['方驭川','秦野舟','霍逐林'],female:['苏凌野','洛听风','陆惊羽']},
 凌霄剑宗:{male:['叶孤锋','楚剑寒','裴逐星'],female:['沈照霜','江横秋','谢问剑']},
 玄机门:{male:['闻星衍','姜玄度','顾知机'],female:['许凝枢','叶凌棋','秦照微']},
 太虚符宗:{male:['白清符','杜云篆','陆修文'],female:['柳知篆','裴云书','霍映岚']},
 镇岳宗:{male:['石镇川','韩承岳','褚撼山'],female:['方铁衣','陆凌岳','谢沉锋']}
};
const round2=value=>Math.round((value+Number.EPSILON)*100)/100;
export const SECT_SENIORS={天工阁:'大师姐',丹霞谷:'大师兄',青岚谷:'大师姐',合欢宗:'大师姐',万灵山:'大师姐',凌霄剑宗:'大师兄',玄机门:'大师兄',太虚符宗:'大师姐',镇岳宗:'大师兄'};
export const seniorUpgradeChoices=save=>UPGRADEABLE_TECHNIQUES.filter(id=>save.techniques.mastered.includes(id)&&!save.techniques.upgraded?.includes(id));

export function startSeniorChallenge(save){
 const stats=equipmentStats(save),name=SECT_SENIORS[save.player.sect];
 if(!name||save.battle||(save.seniorRewards||0)>=2)throw new Error('本次无法挑战宗门前辈。');
 const scaled=value=>round2(value*1.3);
 save.player.hp=round2(stats.maxHp);save.player.mp=round2(stats.maxMp);
 save.battle={id:crypto.randomUUID(),kind:'sect-senior',monsterId:null,name,maxHp:scaled(stats.maxHp),hp:scaled(stats.maxHp),attack:scaled(stats.attack),defense:scaled(stats.defense),speed:Math.max(scaled(stats.speed),round2(stats.speed+.01)),maxMp:scaled(stats.maxMp),mp:scaled(stats.maxMp),critRate:scaled(stats.critRate),dodgeRate:scaled(stats.dodgeRate),round:0,pet:null,retaliation:false,guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,freeArrayUsed:false,criticalFocus:false,skillReady:{},log:[`${name}亲自下场与你切磋。`]};
 return save.battle;
}

export function claimSeniorReward(save,id,choice,now=Date.now()){
 if(!save.seniorRewardPending||save.seniorRewardPending.id!==id)throw new Error('这次大比奖励已经领取。');
 if(choice==='manual'){
  const place=awardItem(save,'silence-manual',1,now);
  save.seniorRewardPending=null;save.seniorRewards=(save.seniorRewards||0)+1;
  return `${SECT_SENIORS[save.player.sect]}赠你《你怎么什么都没有》，${place==='temporary'?'暂存临时储物区。':'已收入储物。'}`;
 }
 if(!seniorUpgradeChoices(save).includes(choice))throw new Error('请选择已有且尚未精进的功法。');
 save.techniques.upgraded??=[];save.techniques.upgraded.push(choice);
 delete save.techniques.puzzles?.['upgrade:'+choice];
 save.seniorRewardPending=null;save.seniorRewards=(save.seniorRewards||0)+1;
 return `${TECHNIQUES[choice].name}直接精进成功。`;
}

export function startSectTournament(save,now=Date.now(),pet=null){
 if(!save.player.sect||save.player.sect==='无门无派')throw new Error('须先加入宗门。');
 if(save.battle)throw new Error('请先结束当前战斗。');
 if(save.seniorRewardPending)throw new Error('请先领取大比奖励。');
 if(save.encounterPending)throw new Error('请先回应途中遇见的人。');
 if(save.divinationPending||save.bossLine?.phase==='ambush'||save.bossLine?.rescuePending)throw new Error('请先走完当前事件。');
 if(save.player.hp<=0)throw new Error('生命不足，无法参赛。');
 if((save.sectTournamentNextAt||0)>now)throw new Error('三日之期未到，暂不能再次参赛。');
 const roster=SECT_TOURNAMENT_NAMES[save.player.sect];
 if(!roster)throw new Error('当前宗门尚未安排大比对手。');
 const stats=equipmentStats(save),gender=Math.random()<.5?'male':'female';
 const names=roster[gender],name=names[Math.floor(Math.random()*names.length)];
 const scaled=value=>round2(value*1.1);
 const chosen=selectBattlePet(save,pet);
 save.battle={id:crypto.randomUUID(),kind:'sect-tournament',monsterId:null,name,maxHp:scaled(stats.maxHp),hp:scaled(stats.maxHp),attack:scaled(stats.attack),defense:scaled(stats.defense),speed:stats.speed,maxMp:scaled(stats.maxMp),mp:scaled(stats.maxMp),critRate:scaled(stats.critRate),dodgeRate:scaled(stats.dodgeRate),round:0,pet:chosen,petStage:String(save.player.realm).startsWith('筑基')?'筑基':'炼气',petName:chosen?(beastCanFight(save,chosen)?beastName(save,chosen):'租借灵兽'):null,retaliation:false,guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,freeArrayUsed:false,criticalFocus:false,skillReady:{},log:[`${name}上场与你切磋，你先出手。`]};
 save.sectTournamentNextAt=now+SECT_TOURNAMENT_INTERVAL;
 return save.battle;
}
