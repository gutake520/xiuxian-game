import {INITIAL_STONES,INITIAL_BAG_SIZE} from '../data/balance.js';
import {QI_REQUIREMENTS,realmProgress,addCultivation,applyRealmHp} from '../data/realms.js';
import {localDay} from '../systems/cultivation.js';
import {initialCombat} from '../data/initial-combat.js';
import {ITEMS} from '../data/items.js';
import {DURABILITY_MAX} from '../data/balance.js';
import {expireLoot} from '../systems/inventory.js';
export function migrateSave(save,now=Date.now()){
 if(!save?.player)throw new Error('存档缺少人物信息。');
 const p=save.player;
 let initial=null;
 if(p.spiritRoot){
  // Some older saves included the category prefix in the root's display name.
  const rootName=String(p.spiritRoot).trim().replace(/^变异/,'');
  try{initial=initialCombat(rootName)}catch{console.warn('[xiuxian-game] 未识别旧灵根，保留原始人物数值：',p.spiritRoot)}
 }
 // Early saves used 100 HP/MP as placeholders; convert once from the original root.
 if(!p.combat&&initial){
  p.combat=initial;
  p.hp=initial.hp;p.mp=initial.mp;p.spirit=initial.mp;
 }else if(p.combat&&initial){
  for(const [key,value] of Object.entries(initial))if(!Number.isFinite(p.combat[key]))p.combat[key]=value;
  if(!Number.isFinite(p.hp))p.hp=p.combat.hp;
  if(!Number.isFinite(p.mp))p.mp=p.combat.mp;
 }
 if(!Number.isFinite(p.spiritStones))p.spiritStones=INITIAL_STONES;
 save.inventory=Array.isArray(save.inventory)?save.inventory:[];
 save.bagCapacity=Number.isSafeInteger(save.bagCapacity)?Math.max(INITIAL_BAG_SIZE,save.bagCapacity):INITIAL_BAG_SIZE;
 save.equipment??={weapon:null,armor:null};
 for(const slot of ['weapon','armor','shoes','accessoryVital','accessoryFate'])save.equipment[slot]??=null;
 for(const entry of save.inventory)if(ITEMS[entry.itemId]?.kind==='equipment'&&!Number.isFinite(entry.durability))entry.durability=DURABILITY_MAX;
 expireLoot(save,now);
 save.petRentals=Number.isSafeInteger(save.petRentals)?Math.max(0,save.petRentals):0;
 if(save.battle){save.battle.talismansUsed??=0;save.battle.talismanRound??=0;save.battle.bindRound??=0;save.battle.freeArrayUsed??=false;save.battle.guard??=false;save.battle.pet??=null}
 save.techniques??={mastered:[],main:null,puzzles:{}};
 save.techniques.mastered??=[];save.techniques.puzzles??={};
 save.itemSerial=Math.max(save.itemSerial||0,save.inventory.length);
 for(const item of save.inventory){if(!item.uid)item.uid='legacy-'+(++save.itemSerial)}
 // Earlier "learnedMethods" only recorded the gift; no learning challenge existed.
 if((save.version||0)<4&&save.learnedMethods?.some(method=>method.id==='basic-qi-guide')&&!save.techniques.mastered.includes('basic-qi-guide')&&!save.inventory.some(item=>item.itemId==='qi-manual')){
  save.inventory.push({uid:'item-'+(++save.itemSerial),itemId:'qi-manual',quantity:1});
 }
 save.events=Array.isArray(save.events)?save.events:[];save.events=save.events.slice(-10);
 save.actionRound=Math.max(save.actionRound||0,...save.events.map(e=>e.round||0));
 save.idle??={lastAt:now,day:localDay(now),usedMs:0,totalEarned:0};
 if(!Number.isFinite(save.idle.lastAt))save.idle.lastAt=now;
 if(!Number.isFinite(save.idle.usedMs))save.idle.usedMs=0;
 if(!save.idle.day)save.idle.day=localDay(now);
 const progress=realmProgress(p);if(progress.index>=0){p.cultivationRequired=QI_REQUIREMENTS[progress.index]??null;if(progress.required&&p.cultivation>=progress.required){const xp=p.cultivation;p.cultivation=0;addCultivation(save,xp)}}
 applyRealmHp(save);
 save.version=6;return save;
}
