import {GENERAL_RUMORS,ROMANCE_RUMORS} from '../data/rumors.js';
export function rumorTier(state,met){
 if(!state||!met||state.rejected||state.closed||state.romanceEnded)return null;
 if(state.bonded)return 'bonded';
 const affinity=Number(state.affinity)||0;
 return affinity>=90?'devoted':affinity>=60?'close':affinity>=30?'warm':'initial';
}
export function availableRumors(save){
 const name=String(save.player.name||'那位修士');
 const lines=[...GENERAL_RUMORS];
 for(const [id,bands] of Object.entries(ROMANCE_RUMORS)){
  const state=id==='yan-tingyun'?save.yanTingyun:save.foxes?.[id];
  const met=id==='yan-tingyun'?state?.unlocked:state?.met;
  const tier=rumorTier(state,met);
  if(tier)lines.push(...bands[tier].map(line=>line.split('{player}').join(name)));
 }
 return lines;
}
