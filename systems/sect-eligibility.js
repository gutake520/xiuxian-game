import {SPIRIT_PEAK_ACHIEVEMENT} from '../data/spirit-peak.js';
export function sectEligibility(save,sect){
 const player=save.player;
 const name=player.spiritRoot||'';
 const variant=['雷','冰','风'].some(element=>name.includes(element));
 const enough=([key,min])=>Number.isFinite(player.stats?.[key])&&player.stats[key]>=min;
 const specialty=sect.allStats?sect.allStats.every(enough):Boolean(sect.roots?.some(element=>name.includes(element))||(sect.stat&&enough(sect.stat)));
 return{join:sect.id==='wanling'?Boolean(save.achievements?.unlocked?.includes(SPIRIT_PEAK_ACHIEVEMENT)):variant||specialty,specialty};
}
