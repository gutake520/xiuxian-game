import {takeStroll as stroll} from '../../systems/stroll.js';
import {THIEF_PLACES} from '../../systems/thief.js';
import {strollEncounterCount} from '../../systems/stroll.js';
import {STROLL_ENCOUNTER_LIMIT} from '../../data/stroll.js';
// Existing encounter tests explicitly miss the new thief roll so their supplied
// random sequence continues to exercise the original encounter under test.
export function takeStroll(save,id,now=Date.now(),random=Math.random){
 const hasThiefRoll=THIEF_PLACES.includes(id)&&strollEncounterCount(save,now)<STROLL_ENCOUNTER_LIMIT;
 let calls=0;
 return stroll(save,id,now,()=>hasThiefRoll&&calls++===1?.99:random());
}
