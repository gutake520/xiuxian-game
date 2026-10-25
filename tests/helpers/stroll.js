import {TRAITOR_LEVELS} from '../../data/traitor-levels.js';
import {takeStroll as stroll} from '../../systems/stroll.js';
import {THIEF_PLACES} from '../../systems/thief.js';
import {strollEncounterCount,strollEncounterLimit} from '../../systems/stroll.js';
// Existing encounter tests miss newly added thief/traitor/stall-sitting rolls so their
// supplied sequence continues to exercise the original encounter under test.
export function takeStroll(save,id,now=Date.now(),random=Math.random){
 const hasThiefRoll=THIEF_PLACES.includes(id)&&strollEncounterCount(save,now)<strollEncounterLimit(save,now);
 const hasTraitorRoll=id==='sects'&&!save.traitorPuzzle&&(save.traitorProgress||0)<TRAITOR_LEVELS.length&&strollEncounterCount(save,now)<strollEncounterLimit(save,now);
 const hasSittingRoll=id==='market'&&!save.stallSitting&&(save.stallSittingProgress||0)<10&&strollEncounterCount(save,now)<strollEncounterLimit(save,now);
 let calls=0;
 return stroll(save,id,now,()=>{const call=calls++;if((hasThiefRoll||hasTraitorRoll)&&call===1||hasSittingRoll&&call===2)return .99;return random()});
}
