import {realmProgress} from '../data/realms.js';
import {equipmentStats} from './inventory.js';
import {LIBRARY_ELDERS} from './sect-library.js';

const round2=value=>Math.round((value+Number.EPSILON)*100)/100;
export const BOSS_NAME='陆仁嘉';
export const bossRescuerName=save=>{
 const name=LIBRARY_ELDERS[save.player.sect]?.name;
 return name?`${name}师叔`:'藏书阁前辈';
};

export function ensureBossLine(save){
 if(!save.bossLine&&realmProgress(save.player).index===9)save.bossLine={phase:'ambush'};
 return save.bossLine;
}

export function bossAttributes(save,multiplier){
 const stats=equipmentStats(save);
 return Object.fromEntries(['maxHp','maxMp','attack','defense','speed','critRate','dodgeRate'].map(key=>[key,round2(stats[key]*multiplier)]));
}

export function resolveBossAmbush(save){
 if(save.battle)throw new Error('请先结束当前战斗。');
 if(save.bossLine?.phase!=='ambush')throw new Error('这段往事已经结束。');
 const enemy=bossAttributes(save,2),elder=bossRescuerName(save);
 save.player.hp=round2(Math.min(save.player.hp,5));
 save.bossLine={phase:'wounded',rescuePending:true,elder,firstFight:enemy};
 return `${BOSS_NAME}将你击倒。${elder}赶来救下你，重伤了${BOSS_NAME}；对方逃入丰原镇附近的山中养伤。`;
}

export function acknowledgeBossRescue(save){
 if(save.bossLine?.phase!=='wounded'||!save.bossLine.rescuePending)throw new Error('此事已经记下。');
 save.bossLine.rescuePending=false;
 return `丰原镇出现一座陌生山峰，${BOSS_NAME}正在山中养伤。`;
}
