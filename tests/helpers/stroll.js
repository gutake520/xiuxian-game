import {TRAITOR_LEVELS} from '../../data/traitor-levels.js';
import {takeStroll as stroll} from '../../systems/stroll.js';
import {THIEF_PLACES} from '../../systems/thief.js';
import {strollEncounterCount,strollEncounterLimit} from '../../systems/stroll.js';
// Existing encounter tests miss newly added thief/traitor rolls so their
// supplied sequence continues to exercise the original encounter under test.
export function takeStroll(save,id,now=Date.now(),random=Math.random){
 const hasThiefRoll=THIEF_PLACES.includes(id)&&strollEncounterCount(save,now)<strollEncounterLimit(save,now);
 const hasTraitorRoll=id==='sects'&&!save.traitorPuzzle&&(save.traitorProgress||0)<TRAITOR_LEVELS.length&&strollEncounterCount(save,now)<strollEncounterLimit(save,now);
 let calls=0;
 return stroll(save,id,now,()=>((hasThiefRoll||hasTraitorRoll)&&calls++===1)?.99:random());
}
