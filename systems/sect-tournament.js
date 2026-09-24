import {equipmentStats} from './inventory.js';

export const SECT_TOURNAMENT_INTERVAL=3*24*60*60*1000;
export const SECT_TOURNAMENT_NAMES={
 male:['顾长风','沈孤鸿','陆惊寒','裴照野','萧承岳','谢临川','闻行舟','秦逐月','楚砚青','江望山'],
 female:['叶凌霜','谢听雪','沈照夜','顾横秋','楚惊鸿','陆饮月','裴折枝','秦拂剑','江逐星','萧寒衣']
};
const round2=value=>Math.round((value+Number.EPSILON)*100)/100;

export function startSectTournament(save,now=Date.now()){
 if(!save.player.sect||save.player.sect==='无门无派')throw new Error('须先加入宗门。');
 if(save.battle)throw new Error('请先结束当前战斗。');
 if(save.encounterPending)throw new Error('请先回应途中遇见的人。');
 if(save.player.hp<=0)throw new Error('生命不足，无法参赛。');
 if((save.sectTournamentNextAt||0)>now)throw new Error('三日之期未到，暂不能再次参赛。');
 const stats=equipmentStats(save),gender=Math.random()<.5?'male':'female';
 const names=SECT_TOURNAMENT_NAMES[gender],name=names[Math.floor(Math.random()*names.length)];
 const scaled=value=>round2(value*1.1);
 save.battle={id:crypto.randomUUID(),kind:'sect-tournament',monsterId:null,name,maxHp:scaled(stats.maxHp),hp:scaled(stats.maxHp),attack:scaled(stats.attack),defense:scaled(stats.defense),speed:stats.speed,maxMp:scaled(stats.maxMp),mp:scaled(stats.maxMp),critRate:scaled(stats.critRate),dodgeRate:scaled(stats.dodgeRate),round:0,pet:null,retaliation:false,guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,freeArrayUsed:false,criticalFocus:false,skillReady:{},log:[`${name}上场与你切磋，你先出手。`]};
 save.sectTournamentNextAt=now+SECT_TOURNAMENT_INTERVAL;
 return save.battle;
}
