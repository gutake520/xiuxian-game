import {addCultivation,realmProgress} from '../data/realms.js';
import {SECT_TOURNAMENT_NAMES} from './sect-tournament.js';

const lunar=new Intl.DateTimeFormat('en-u-ca-chinese',{month:'numeric',day:'numeric'});

export function midAutumnYear(now=Date.now()){
 const date=new Date(now),parts=lunar.formatToParts(date);
 if(parts.find(part=>part.type==='month')?.value!=='8'||parts.find(part=>part.type==='day')?.value!=='15'||date.getHours()<20)return null;
 return date.getFullYear();
}

export function queueMidAutumn(save,now=Date.now()){
 const year=midAutumnYear(now);
 if(year===null||save.midAutumnYear===year||save.midAutumnPending?.year===year)return false;
 const sect=save.player.sect,roster=SECT_TOURNAMENT_NAMES[sect];
 const names=roster?[...roster.male,...roster.female]:null;
 save.midAutumnPending={year,visitor:names?names[Math.floor(Math.random()*names.length)]:'闻照',sect:!!names};
 return true;
}

export function eatMooncake(save,year){
 const pending=save.midAutumnPending;
 if(!pending||pending.year!==year||save.midAutumnYear===year)throw new Error('这次赏月已经结束。');
 save.midAutumnPending=null;
 save.midAutumnYear=year;
 if(realmProgress(save.player).index>=10)save.player.cultivation=Math.round(((save.player.cultivation||0)+50)*100)/100;
 else addCultivation(save,50);
 return `${pending.visitor}与你分吃月饼，你获得 50 点灵气值。`;
}
