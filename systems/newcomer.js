import {NEWCOMER_TASKS,NEWCOMER_REWARD} from '../data/newcomer.js';
import {ITEMS} from '../data/items.js';
import {TECHNIQUES} from '../data/techniques.js';
import {realmProgress} from '../data/realms.js';
import {appendEvent} from './events.js';
const ids=NEWCOMER_TASKS.map(t=>t.id);
// Only called inside the existing atomic action transaction. No rewards in renderers.
export function markNewcomer(save,id){
 if(!ids.includes(id))throw new Error('未知的新手任务。');
 save.newcomer??={version:1,done:[],paid:[]};
 save.newcomer.done=Array.isArray(save.newcomer.done)?save.newcomer.done:[];
 if(!save.newcomer.done.includes(id))save.newcomer.done.push(id);
}
export function syncNewcomer(save){
 const rank=realmProgress(save.player).index;
 if(rank<0)return 0;
 save.newcomer??={version:1,done:[],paid:[]};
 const state=save.newcomer;
 state.done=[...new Set((Array.isArray(state.done)?state.done:[]).filter(id=>ids.includes(id)))];
 state.paid=[...new Set((Array.isArray(state.paid)?state.paid:[]).filter(id=>ids.includes(id)))];
 // Paid tasks never become incomplete, including after equipment/sect changes.
 state.paid.forEach(id=>markNewcomer(save,id));
 const learned=(save.techniques?.mastered||[]).some(id=>TECHNIQUES[id]?.type==='cultivation');
 if(learned||(save.inventory||[]).some(e=>e.quantity>0&&TECHNIQUES[ITEMS[e.itemId]?.methodId]?.type==='cultivation'))markNewcomer(save,'manual');
 if(learned)markNewcomer(save,'learn');
 if(save.techniques?.main&&TECHNIQUES[save.techniques.main]?.type==='cultivation')markNewcomer(save,'main');
 if(['weapon','armor'].some(slot=>(save.inventory||[]).some(e=>e.uid===save.equipment?.[slot]&&ITEMS[e.itemId]?.slot===slot)))markNewcomer(save,'equipment');
 if(save.blackMarket?.lastDraw)markNewcomer(save,'chest');
 if(save.stroll?.encounters>0)markNewcomer(save,'encounter');
 if(Object.values(save.spiritPeak?.feeding||{}).some(n=>n>0)||Object.values(save.spiritBeasts||{}).some(b=>b.fedDay))markNewcomer(save,'feed');
 if(save.sectDaily?.practice>0)markNewcomer(save,'practice');
 // At qi three or higher, settle the remaining allowance once and retire the island.
 if(rank>=2){ids.forEach(id=>markNewcomer(save,id));state.compensated=true}
 const unpaid=state.done.filter(id=>!state.paid.includes(id));
 const amount=unpaid.length*NEWCOMER_REWARD;
 if(amount){
  save.player.spiritStones=Math.round((save.player.spiritStones+amount)*100)/100;
  state.paid.push(...unpaid);
  save.events??=[];
  appendEvent(save,state.compensated?`初入仙途：已达炼气三层或更高境界，补齐新手任务奖励 ${amount} 灵石。`:`新手任务完成：${unpaid.map(id=>NEWCOMER_TASKS.find(t=>t.id===id).title).join('、')}，获得 ${amount} 灵石。`);
 }
 state.finished=state.paid.length===ids.length;
 return amount;
}
export function newcomerBusy(s){return Boolean(s?.battle||s?.qiSecret||s?.qiMeditation||s?.encounterPending||s?.divinationPending||s?.seniorRewardPending||s?.yanEncounterPending||s?.yanAftermath||s?.bossLine?.phase==='ambush'||s?.bossLine?.rescuePending)}
