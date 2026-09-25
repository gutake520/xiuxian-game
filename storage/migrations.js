import {syncAchievements} from '../systems/achievements.js';
import {combatSlots} from '../data/technique-slots.js';
import {TECHNIQUES,techniqueEligible} from '../data/techniques.js';
import {INITIAL_STONES,INITIAL_BAG_SIZE} from '../data/balance.js';
import {QI_REQUIREMENTS,realmProgress,addCultivation,applyRealmHp} from '../data/realms.js';
import {localDay} from '../systems/cultivation.js';
import {initialCombat} from '../data/initial-combat.js';
import {ITEMS} from '../data/items.js';
import {QI_MONSTERS} from '../data/locations.js';
import {DURABILITY_MAX} from '../data/balance.js';
import {expireLoot} from '../systems/inventory.js';
import {ensureBossLine} from '../systems/boss-line.js';
import {ensureSpiritBeasts} from '../systems/pets.js';
export function migrateSave(save,now=Date.now()){
 if(!save?.player)throw new Error('存档缺少人物信息。');
 if(!(Number.isFinite(save.createdAt)&&save.createdAt>0)){
  save.world??={};
  if(!(Number.isFinite(save.world.dayAnchorAt)&&save.world.dayAnchorAt>0))save.world.dayAnchorAt=Number.isFinite(save.updatedAt)&&save.updatedAt>0?save.updatedAt:now;
 }
 const p=save.player;
 // Earlier builds used an extra “炼气圆满” realm with zero cultivation.
 // Preserve any cultivation debt while converting that cleared tier to 1000 / 1000.
 if(p.realm==='炼气圆满'){
  p.realm='炼气十层';
  p.cultivation=Math.min(1000,Math.max(0,1000+Math.min(0,Number(p.cultivation)||0)));
 }
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
 for(const entry of save.inventory)if(ITEMS[entry.itemId]?.kind==='equipment'&&!Number.isFinite(entry.durability))entry.durability=ITEMS[entry.itemId].maxDurability??DURABILITY_MAX;
 expireLoot(save,now);
 save.petRentals=Number.isSafeInteger(save.petRentals)?Math.max(0,save.petRentals):0;
 save.foundationPetRentals=Number.isSafeInteger(save.foundationPetRentals)?Math.max(0,save.foundationPetRentals):0;
 if(save.battle){save.battle.talismansUsed??=0;save.battle.talismanRound??=0;save.battle.bindRounds??=save.battle.bindRound?[save.battle.bindRound]:[];save.battle.arrayRound??=0;save.battle.freeArrayUsed??=false;save.battle.guard??=false;save.battle.pet??=null;save.battle.mp??=Math.max(0,(QI_MONSTERS.find(monster=>monster.id===save.battle.monsterId)?.mp||0)-(save.battle.enemySkillReady?1:0))}
 save.techniques??={mastered:[],main:null,puzzles:{}};
 save.techniques.mastered??=[];save.techniques.puzzles??={};
 save.techniques.combat=Array.isArray(save.techniques.combat)?save.techniques.combat.filter(id=>TECHNIQUES[id]?.type==='combat'&&techniqueEligible(p,TECHNIQUES[id])&&save.techniques.mastered.includes(id)).slice(0,combatSlots(p)):[];
 save.techniques.sectManuals??=[];
 if(p.sect==='万灵山'||save.spiritBeast||save.spiritBeasts)ensureSpiritBeasts(save);
 save.sectPoints=Number.isFinite(save.sectPoints)?Math.max(0,save.sectPoints):0;
 save.pillCooldowns??={};
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
 const progress=realmProgress(p);if(progress.index>=0){p.cultivationRequired=progress.required;if(progress.required&&p.cultivation>=progress.required){const xp=p.cultivation;p.cultivation=0;addCultivation(save,xp)}}
 applyRealmHp(save);
 if(String(p.realm).startsWith('筑基')&&save.bossLine?.phase==='ambush')save.bossLine={phase:'defeated',insight:true};
 ensureBossLine(save);
 syncAchievements(save);
 save.version=7;return save;
}
