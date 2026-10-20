import {foundationStoryPending} from './foundation-story.js';
import {TREASURE_TIERS,TREASURE_FIND_CHANCE,TREASURE_REAL_CHANCE,TREASURE_GAMES} from '../data/treasure.js';
export function maybeFindTreasure(save,random=Math.random){
 if(save.treasure)return false;
 const tier=TREASURE_TIERS.find(t=>String(save.player.realm).startsWith(t.realm));
 if(!tier||tier.peaks.length<3||random()>=TREASURE_FIND_CHANCE)return false;
 const route=tier.peaks.map(p=>({id:p.id,name:p.name,monsterId:p.monsterId}));
 for(let i=route.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[route[i],route[j]]=[route[j],route[i]]}
 save.treasure={id:crypto.randomUUID(),realm:tier.realm,reward:tier.reward,real:random()<TREASURE_REAL_CHANCE,route:route.slice(0,3),step:0};
 return true;
}
// Called only after an ordinary victory has resolved its possible retaliation.
export function advanceTreasure(save,battle){
 const map=save.treasure;
 if(!map||map.step>=map.route.length||save.battle||map.lastBattleId===battle.id)return false;
 const place=map.route[map.step],id=battle.monsterId;
 if(id!==place.monsterId&&!id.startsWith(place.monsterId+'-'))return false;
 map.lastBattleId=battle.id;map.step++;
 return true;
}
export function treasureCanDig(save){
 return Boolean(save.treasure&&save.treasure.step>=save.treasure.route.length&&!save.battle&&!save.encounterPending&&!save.divinationPending&&!save.seniorRewardPending&&!save.yanEncounterPending&&!save.yanAftermath&&save.bossLine?.phase!=='ambush'&&!save.bossLine?.rescuePending&&!foundationStoryPending(save));
}
function requireMap(save,id){
 if(!save.treasure||save.treasure.id!==id)throw new Error('这张藏宝图已经结算或失效。');
 if(!treasureCanDig(save))throw new Error('请先完成寻宝路线和当前战斗剧情。');
 return save.treasure;
}
export function startTreasureGame(save,id,now=Date.now(),random=Math.random){
 const map=requireMap(save,id);
 if(map.game)return map.game;
 const config=TREASURE_GAMES[map.real?'real':'fake'];
 map.game={...config,startedAt:now,endsAt:now+config.durationMs,holes:Array.from({length:Math.ceil(config.durationMs/config.intervalMs)},()=>Math.floor(random()*9)),hits:[]};
 return map.game;
}
export function activeTreasureMole(game,now=Date.now()){
 if(!game||now<game.startedAt||now>=game.endsAt)return null;
 const elapsed=now-game.startedAt,frame=Math.floor(elapsed/game.intervalMs);
 if(elapsed%game.intervalMs>=game.visibleMs||game.hits.includes(frame))return null;
 return {frame,hole:game.holes[frame]};
}
export function hitTreasureMole(save,id,frame,hole,now=Date.now()){
 const map=requireMap(save,id),active=activeTreasureMole(map.game,now);
 if(!active||active.frame!==frame||active.hole!==hole)return false;
 map.game.hits.push(frame);return true;
}
export function finishTreasureGame(save,id,now=Date.now()){
 const map=requireMap(save,id),game=map.game;
 if(!game||now<game.endsAt)throw new Error('地鼠还没有散去。');
 const score=game.hits.length,won=score>=game.target;
 let text,amount;
 if(map.real){amount=score;save.player.spiritStones=Math.round((save.player.spiritStones+amount)*100)/100;text=`地鼠钻回洞里，你拨开浮土，翻出一只旧钱袋。原来宝藏真在这里。获得 ${amount} 灵石。`}
 else{const stones=Math.max(0,save.player.spiritStones);amount=Math.min(3,stones);save.player.spiritStones=Math.round((stones-amount)*100)/100;text=`你忙着挥锤，地鼠忙着掏钱袋。等你回过神，藏宝图已经被咬成了碎纸，${amount>0?`还少了 ${amount} 灵石。`:'钱袋也被翻了个底朝天。'}${stones<3?'一只地鼠探出头，冲你骂道：“这么穷不许打地鼠！”':'远处传来一阵得意的吱吱声。'}`}
 const result={id:map.id,score,target:game.target,won,text,real:map.real,amount};
 save.lastTreasure=result;save.treasure=null;return result;
}
