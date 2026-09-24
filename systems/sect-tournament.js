import {equipmentStats} from './inventory.js';

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

export function startSectTournament(save,now=Date.now()){
 if(!save.player.sect||save.player.sect==='无门无派')throw new Error('须先加入宗门。');
 if(save.battle)throw new Error('请先结束当前战斗。');
 if(save.encounterPending)throw new Error('请先回应途中遇见的人。');
 if(save.player.hp<=0)throw new Error('生命不足，无法参赛。');
 if((save.sectTournamentNextAt||0)>now)throw new Error('三日之期未到，暂不能再次参赛。');
 const roster=SECT_TOURNAMENT_NAMES[save.player.sect];
 if(!roster)throw new Error('当前宗门尚未安排大比对手。');
 const stats=equipmentStats(save),gender=Math.random()<.5?'male':'female';
 const names=roster[gender],name=names[Math.floor(Math.random()*names.length)];
 const scaled=value=>round2(value*1.1);
 save.battle={id:crypto.randomUUID(),kind:'sect-tournament',monsterId:null,name,maxHp:scaled(stats.maxHp),hp:scaled(stats.maxHp),attack:scaled(stats.attack),defense:scaled(stats.defense),speed:stats.speed,maxMp:scaled(stats.maxMp),mp:scaled(stats.maxMp),critRate:scaled(stats.critRate),dodgeRate:scaled(stats.dodgeRate),round:0,pet:null,retaliation:false,guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,freeArrayUsed:false,criticalFocus:false,skillReady:{},log:[`${name}上场与你切磋，你先出手。`]};
 save.sectTournamentNextAt=now+SECT_TOURNAMENT_INTERVAL;
 return save.battle;
}
