import {equipmentStats} from './inventory.js';
import {realmProgress} from '../data/realms.js';

// Only the Qi stage has a settled recovery rate so far.
export function settleRecovery(save,now=Date.now()){
 const p=save.player;save.recovery??={hpAt:now,mpAt:now};
 const r=save.recovery;
 if(save.battle||realmProgress(p).index<0){r.hpAt=now;r.mpAt=now;return}
 const {maxHp,maxMp}=equipmentStats(save);
 if(now>r.hpAt){const ticks=Math.floor((now-r.hpAt)/30000);p.hp=Math.min(maxHp,Math.round((p.hp+ticks)*100)/100);r.hpAt=p.hp>=maxHp?now:r.hpAt+ticks*30000}
 if(now>r.mpAt){const ticks=Math.floor((now-r.mpAt)/60000);p.mp=Math.min(maxMp,Math.round((p.mp+ticks)*100)/100);r.mpAt=p.mp>=maxMp?now:r.mpAt+ticks*60000}
}
