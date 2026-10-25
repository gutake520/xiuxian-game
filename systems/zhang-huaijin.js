import {SOKOBAN_LEVELS} from '../data/peak-puzzles.js';
import {ZHANG_NAME,ZHANG_ENCOUNTER_CHANCE,ZHANG_RESCUE_MS,ZHANG_INTRO,ZHANG_ARRIVAL,ZHANG_SCENES,ZHANG_GIFTS,ZHANG_PLAY_END} from '../data/zhang-huaijin.js';
import {equipmentStats} from './inventory.js';
import {giftableEntries,addCompanion,removeCompanion} from './relationships.js';
import {companionBreakupFee} from './foxes.js';
import {recordDailyGift} from './sect-progression.js';
import {offerStallGame} from './stall-games.js';
import {maybeFindPeakPuzzle} from './peak-puzzles.js';
const round=n=>Math.round(n*100)/100;
const day=now=>{const d=new Date(now);return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000};
const pick=(list,random)=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
export const zhangState=save=>save.zhangHuaijin;
function requireZhang(save){const s=zhangState(save);if(!s?.unlocked)throw new Error('尚未结识张怀瑾。');if(save.battle)throw new Error('请先结束战斗。');return s}
export function maybeMeetZhang(save,random=Math.random){
 if(save.zhangHuaijin||save.battle||!String(save.player.realm).startsWith('筑基')||random()>=ZHANG_ENCOUNTER_CHANCE)return false;
 const stats=equipmentStats(save);
 save.zhangHuaijin={unlocked:false,affinity:0,seen:[],streak:0,master:'鬼中仙',revenge:{phase:'awaiting-golden-core'}};
 save.battle={id:crypto.randomUUID(),kind:'zhang-intro',name:ZHANG_NAME,monsterId:null,stage:'筑基',maxHp:Math.max(300,stats.maxHp*10),hp:Math.max(300,stats.maxHp*10),attack:Math.max(30,stats.maxHp*.8+stats.defense),defense:.1,speed:stats.speed+1,maxMp:20,mp:20,dodgeRate:60,critRate:0,round:0,pet:null,guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,skillReady:{},entryHp:save.player.hp,entryMp:save.player.mp,log:[ZHANG_INTRO]};
 return true;
}
export function finishZhangEncounter(save){
 const b=save.battle;if(b?.kind!=='zhang-intro')throw new Error('此处没有这场相遇。');
 save.player.hp=b.entryHp;save.player.mp=b.entryMp;
 save.zhangHuaijin.unlocked=true;
 save.lastBattle={id:b.id,kind:b.kind,monster:ZHANG_NAME,outcome:'defeat',round:b.round,cost:'未损失灵石或修为',log:[ZHANG_ARRIVAL]};save.battle=null;
 return save.lastBattle;
}
export function zhangPlayStatus(save,now=Date.now()){
 const s=zhangState(save),today=day(now),missed=!s?.giftsUnlocked&&s?.lastPlayDay!==undefined&&today>s.lastPlayDay+1;
 return {streak:missed?0:s?.streak||0,today:s?.lastPlayDay===today,missed};
}
export function startZhangPlay(save,now=Date.now(),random=Math.random){
 const s=requireZhang(save);if(s.rejected)throw new Error('她今日不愿见客。');
 if(s.game&&!s.game.done)return s.game;
 if(zhangPlayStatus(save,now).today)throw new Error('今天已经陪她玩过了，明日再来。');
 if(s.lastPlayDay!==undefined&&day(now)<s.lastPlayDay)throw new Error('请等到下一日再来。');
 const kind=pick(['dice','gomoku','sokoban','maze'],random);
 // An isolated game save reuses the engines without touching public encounters or their rewards.
 const world={player:{spiritStones:0},inventory:[],equipment:{},bagCapacity:20};
 if(['dice','gomoku'].includes(kind)){offerStallGame(world,kind);world.stallGames[kind].leisure=true}
 else{
  world.nextSokobanLevel=Math.min(SOKOBAN_LEVELS.length-1,Math.floor(random()*SOKOBAN_LEVELS.length));let first=true;
  maybeFindPeakPuzzle(world,()=>{if(first){first=false;return kind==='sokoban'?0:.1}return random()});
  world.peakPuzzle.leisure=true;delete world.peakPuzzle.reward;
 }
 s.game={id:crypto.randomUUID(),kind,world,done:false};return s.game;
}
export function finishZhangPlay(save,id,outcome='win',now=Date.now()){
 const s=requireZhang(save),game=s.game;
 if(!game||game.id!==id||game.done)throw new Error('这次陪玩已经结束。');
 const finished=['dice','gomoku'].includes(game.kind)?game.world.stallGames?.[game.kind]?.phase==='done':!game.world.peakPuzzle;
 if(!finished)throw new Error('请先完成游戏或投降。');
 const today=day(now);if(s.lastPlayDay!==undefined&&today<s.lastPlayDay)throw new Error('日期尚未到来。');
 const missed=zhangPlayStatus(save,now).missed;
 if(s.lastPlayDay!==today){s.streak=s.lastPlayDay===today-1?(s.streak||0)+1:1;s.lastPlayDay=today}
 const newly=!s.giftsUnlocked&&s.streak>=3;if(newly)s.giftsUnlocked=true;
 game.done=true;game.text=(missed?'「哟，大忙人。山路终于肯给你让道了？」她数落了你好一阵，才让你坐下。\n\n':'')+(ZHANG_PLAY_END[outcome]||ZHANG_PLAY_END.win)+(newly?'\n\n你起身时，她忽然扯住你的衣袖，瞥了眼你带来的东西：「给我的？……先前怎么不拿出来。」从此可以向她赠礼。':'');
 return {completed:true,text:game.text};
}
export function giveZhangGift(save,uid,random=Math.random){
 const s=requireZhang(save);if(!s.giftsUnlocked||s.rejected)throw new Error('她还不肯收你的礼物。');
 if(uid==='stones'){if(save.player.spiritStones<1)throw new Error('灵石不足。');save.player.spiritStones=round(save.player.spiritStones-1)}
 else{const entry=giftableEntries(save).find(e=>e.uid===uid);if(!entry)throw new Error('此物不能送出，上锁或已装备的东西不能赠礼。');if(entry.quantity>1)entry.quantity--;else save.inventory=save.inventory.filter(e=>e!==entry)}
 const amount=random()<.65?3:-3;s.affinity=Math.max(0,Math.min(100,(s.affinity||0)+amount));recordDailyGift(save);
 return `${pick(ZHANG_GIFTS[amount>0?'good':'bad'],random)} 好感 ${amount>0?'+':''}${amount} · ${s.affinity}/100。`;
}
export function seenZhangScene(save,level){const s=requireZhang(save);if(![30,60,90].includes(level)||s.affinity<level)throw new Error('尚未到这一步。');s.seen??=[];if(!s.seen.includes(level))s.seen.push(level);return ZHANG_SCENES[level]}
export function answerZhang(save,answer,now=Date.now()){
 const s=requireZhang(save);if(!s.giftsUnlocked||s.affinity<100||s.bonded||s.rejected)throw new Error('缘分尚未到这一步。');
 if(answer==='later')return ZHANG_SCENES.later;
 if(answer==='reject'){s.rejected=true;return ZHANG_SCENES.reject}
 if(answer!=='accept')throw new Error('请选择回应。');
 addCompanion(save,ZHANG_NAME,now);s.bonded=true;s.romanceEnded=false;return ZHANG_SCENES.accept;
}
export function leaveZhang(save,now=Date.now()){
 const s=requireZhang(save);if(!s.bonded)throw new Error('当前并无道侣关系。');
 removeCompanion(save,ZHANG_NAME,companionBreakupFee(save.player),now);s.bonded=false;s.romanceEnded=true;return ZHANG_SCENES.breakup;
}
export function tryZhangRescue(save,now=Date.now()){
 const s=zhangState(save),b=save.battle;
 if(!b||['zhang-intro','sect-tournament','sect-senior'].includes(b.kind)||save.player.hp>0||!s?.bonded||!(save.player.companions||[]).some(c=>(typeof c==='string'?c:c?.name)===ZHANG_NAME)||now<(s.rescueReadyAt||0))return null;
 save.player.hp=round(equipmentStats(save).maxHp*.15);s.rescueReadyAt=now+ZHANG_RESCUE_MS;
 return `${ZHANG_SCENES.rescue} 生命恢复至 ${save.player.hp}。`;
}
