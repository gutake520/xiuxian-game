import {GOLDEN_MONSTERS} from '../data/locations.js';
import {XIGONG_CLUE,XIGONG_DEFENSE,XIGONG_SCENES} from '../data/xigong-defense.js';
import {localDay} from './cultivation.js';
import {addCompanion} from './relationships.js';

export function nextXigongEnemy(save,random=Math.random){
 const pool=GOLDEN_MONSTERS.filter(m=>m.minLevel===4),m=pool[Math.floor(random()*pool.length)];
 const hp=m.hpMin+Math.floor(random()*(m.hpMax-m.hpMin+1));
 save.battle={id:crypto.randomUUID(),kind:'xigong-defense',monsterId:m.id,name:'黑衣人',stage:'金丹',maxHp:hp,hp,attack:m.attack,defense:m.defense,speed:m.speed,mp:m.mp,maxMp:m.mp,round:0,pet:null,guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,skillReady:{},log:[`第 ${(save.dongxiaStory.defeated||0)+1} 名黑衣人越过断墙，堵住药房外的通道。`]};
 return save.battle;
}
export function finishXigongFight(save){
 const b=save.battle,q=save.dongxiaStory;
 if(!b||b.kind!=='xigong-defense'||q?.phase!=='defending')throw Error('迎敌已结束。');
 if(b.hp<=0)q.defeated=(q.defeated||0)+1;
 if(save.player.hp>0&&q.defeated<6){nextXigongEnemy(save);return null}
 q.phase='unconscious';q.forced=save.player.hp>0;q.nextChapter='xigong-recovery';
 save.lastBattle={id:b.id,kind:b.kind,monsterId:b.monsterId,monster:b.name,outcome:'story',rewards:[],xp:0,log:['你为掩护伤员力竭昏迷，无战败惩罚。']};
 save.battle=null;save.player.hp=Math.max(1,save.player.hp);
 return save.lastBattle;
}
export function actXigongDefense(save,action,value,now=Date.now()){
 const q=save.dongxiaStory;if(!q||save.battle)throw Error('请先完成当前战斗。');
 if(q.phase==='attack-pending'&&['leave','defend'].includes(action)){
  if(action==='leave'){q.phase='left';q.leftDay=localDay(now);q.leftAt=now;return XIGONG_DEFENSE.left}
  if(save.player.hp<=0)throw Error('请先恢复生命。');
  q.phase='defending';q.defeated=0;nextXigongEnemy(save);return '你转身挡在药房门前。';
 }
 if(action==='search'&&q.phase==='left'){
  if(localDay(now)===q.leftDay||now<q.leftAt)throw Error('等现实中的次日再回来查看。');
  q.phase='ruins';q.mainClue={...XIGONG_CLUE};q.nextChapter=XIGONG_CLUE.target;return XIGONG_DEFENSE.ruins;
 }
 if(action==='wake'&&q.phase==='unconscious'){
  q.phase='recovery';save.xigongXuan??={unlocked:true,affinity:0,seen:[]};return XIGONG_DEFENSE.awake;
 }
 const s=save.xigongXuan;
 if(q.phase!=='recovery'||!s?.unlocked)throw Error('此时无法探望西宫玄。');
 if(action==='ask'){q.mainClue={...XIGONG_CLUE};q.nextChapter=XIGONG_CLUE.target;return XIGONG_DEFENSE.ask+'\n\n'+XIGONG_CLUE.text}
 if(action==='herbs'){
  if(s.herbDay===localDay(now))throw Error('今日已经交过药草，明日再来。');
  const herbs=save.inventory.filter(e=>e.itemId==='golden-healing-herb'&&!e.locked);
  if(herbs.reduce((n,e)=>n+e.quantity,0)<3)throw Error('需要3株未上锁的赤髓芝。');
  let left=3;for(const e of herbs){const n=Math.min(left,e.quantity);e.quantity-=n;left-=n}
  save.inventory=save.inventory.filter(e=>e.quantity!==0);s.herbDay=localDay(now);s.affinity=Math.min(100,s.affinity+5);s.lastText=XIGONG_DEFENSE.herb;return `交付赤髓芝×3，好感＋5 · ${s.affinity}/100。`;
 }
 if(action==='scene'&&[30,60,90].includes(value)&&s.affinity>=value){if(!s.seen.includes(value))s.seen.push(value);s.lastText=XIGONG_SCENES['at'+value];return '往事已记录，可在CG回顾中重温。'}
 if(action==='bond'&&s.affinity>=100&&!s.bonded){addCompanion(save,'西宫玄',now);s.bonded=true;s.lastText=XIGONG_SCENES.accept;return '与西宫玄结为道侣，金丹期生命上限＋10。'}
 throw Error('尚未到这一步。');
}
