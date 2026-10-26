import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {actXigongDefense,nextXigongEnemy} from '../systems/xigong-defense.js';
import {playRound,fleeBattle,useBattleTalisman} from '../systems/combat.js';
import {GOLDEN_MONSTERS} from '../data/locations.js';
import {equipmentStats} from '../systems/inventory.js';
import {companionMemories} from '../systems/companion-memories.js';
import {showXigong} from '../ui/dongxia-story.js';
const now=new Date(2026,9,31,23,59).getTime();
const make=()=>({slot:'xigong',player:{realm:'金丹一层',spiritRoot:'金木双灵根',cultivation:123,spiritStones:99,hp:73,mp:20,combat:{hp:73,mp:20,attack:11.1,defense:3.52,speed:10.7,critRate:0,dodgeRate:0}},inventory:[],equipment:{},techniques:{mastered:[],combat:[]},dongxiaUnlocked:true,dongxiaStory:{id:'q',step:5,phase:'attack-pending',journal:[]}});
test('leaving is irreversible, waits for next calendar day including month boundary, grants only main clue',()=>{
 const s=make();actXigongDefense(s,'leave',null,now);assert.throws(()=>actXigongDefense(s,'search',null,now+1000));assert.throws(()=>actXigongDefense(s,'defend',null,now));actXigongDefense(s,'search',null,now+60000);assert.equal(s.dongxiaStory.phase,'ruins');assert.equal(s.dongxiaStory.mainClue.target,'nascent-soul-mainline');assert.equal(s.xigongXuan,undefined);assert.throws(()=>actXigongDefense(s,'herbs',null,now+60000));
});
test('all three mid golden profiles are reused and six victories trigger CG without loot or wear',t=>{
 t.mock.method(Math,'random',()=>.99);const s=make();actXigongDefense(s,'defend');
 for(const [i,m] of GOLDEN_MONSTERS.filter(m=>m.minLevel===4).entries()){nextXigongEnemy(s,()=>i/3+.01);assert.equal(s.battle.name,'黑衣人');assert.equal(s.battle.attack,m.attack);assert.equal(s.battle.defense,m.defense)}
 s.inventory=[{uid:'s',itemId:'golden-sword',quantity:1,durability:20}];s.equipment.weapon='s';s.player.combat.attack=10000;s.player.combat.speed=100;
 assert.throws(()=>fleeBattle(s),/继续迎战/);
 for(let i=1;i<=6;i++){playRound(s);assert.equal(s.dongxiaStory.defeated,i);if(i<6){assert.ok(s.battle);assert.equal(s.dongxiaStory.phase,'defending')}}
 assert.equal(s.battle,null);assert.equal(s.dongxiaStory.phase,'unconscious');assert.equal(s.dongxiaStory.forced,true);assert.equal(s.inventory[0].durability,20);assert.equal(s.player.cultivation,123);assert.equal(s.player.spiritStones,99);assert.equal(s.player.hp,73);
});
test('ordinary loss and talisman victory reach story safely, reload preserves battle, clue has no affinity gate',t=>{
 t.mock.method(Math,'random',()=>.99);let s=make();actXigongDefense(s,'defend');s=structuredClone(s);s.player.hp=1;playRound(s,'skip');assert.equal(s.dongxiaStory.phase,'unconscious');assert.equal(s.player.cultivation,123);assert.equal(s.player.hp,1);actXigongDefense(s,'wake');actXigongDefense(s,'ask');assert.equal(s.xigongXuan.affinity,0);assert.ok(s.dongxiaStory.mainClue);assert.throws(()=>actXigongDefense(s,'wake'));
 const a=make();actXigongDefense(a,'defend');a.battle.hp=1;a.inventory=[{uid:'t',itemId:'golden-attack-talisman',quantity:1}];useBattleTalisman(a,'golden-attack-talisman');assert.equal(a.dongxiaStory.defeated,1);assert.ok(a.battle);assert.equal(a.inventory.length,0);
});
test('daily herbs respect locks and quantities; romance uses capacity, no duplicate bonus, archive only read scenes',()=>{
 const s=make();s.dongxiaStory.phase='unconscious';actXigongDefense(s,'wake');s.inventory=[{uid:'locked',itemId:'golden-healing-herb',quantity:20,locked:true},{uid:'a',itemId:'golden-healing-herb',quantity:2}];assert.throws(()=>actXigongDefense(s,'herbs',null,now));assert.equal(s.inventory[1].quantity,2);s.inventory.push({uid:'b',itemId:'golden-healing-herb',quantity:58});
 for(let i=0;i<20;i++){actXigongDefense(s,'herbs',null,now+i*86400000);assert.throws(()=>actXigongDefense(s,'herbs',null,now+i*86400000))}
 assert.equal(s.inventory.length,1);assert.equal(s.inventory[0].quantity,20);assert.equal(s.xigongXuan.affinity,100);assert.throws(()=>actXigongDefense(s,'gift'));assert.equal(companionMemories(s)[0].scenes.length,1);
 for(const n of [30,60,90])actXigongDefense(s,'scene',n);assert.equal(companionMemories(s)[0].scenes.length,4);
 s.player.companions=['沈砚'];assert.throws(()=>actXigongDefense(s,'bond'));s.player.companions=[];const hp=equipmentStats(s).maxHp;actXigongDefense(s,'bond');assert.equal(equipmentStats(s).maxHp,hp+10);assert.equal(s.player.hp,73);assert.throws(()=>actXigongDefense(s,'bond'));assert.equal(companionMemories(s)[0].scenes.length,6);s.player.companions=[];assert.equal(equipmentStats(s).maxHp,hp);
});
test('story UI exposes branches, wake, free clue and daily herbs without gift controls',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><div id="xg-panel"><div id="xg-content"></div></div></body></html>').document;t.after(()=>globalThis.document=old);const s=make();const api={getSave:()=>s,actions:{mutate:async f=>({result:f(s)})}};showXigong(api,()=>{});assert.ok(document.querySelector('[data-act="defend"]'));assert.ok(document.querySelector('[data-act="leave"]'));s.dongxiaStory.phase='unconscious';showXigong(api,()=>{});await document.querySelector('[data-act="wake"]').onclick();assert.ok(document.querySelector('[data-act="ask"]'));await document.querySelector('[data-act="ask"]').onclick();assert.match(document.querySelector('[data-body]').textContent,/元婴/);assert.ok(document.querySelector('[data-act="herbs"]'));assert.equal(document.querySelector('[data-act="gift"]'),null);
});
test('UI enters combat, hides flee, shows collapse automatically and closes back to map once',async t=>{
 t.mock.method(Math,'random',()=>.99);const old=globalThis.document;globalThis.document=parseHTML('<html><body><div id="xg-panel"><div id="xg-content"></div></div></body></html>').document;t.after(()=>globalThis.document=old);const s=make();s.player.hp=1;let closed=0;const api={getSave:()=>s,actions:{mutate:async f=>({result:f(s)}),battleRound:async a=>playRound(s,a)}};
 showXigong(api,()=>closed++);await document.querySelector('[data-act="defend"]').onclick();assert.equal(document.querySelector('[data-fight="flee"]'),null);assert.ok(document.querySelector('[data-fight="skip"]'));await document.querySelector('[data-fight="skip"]').onclick();assert.ok(document.querySelector('[data-act="wake"]'));await document.querySelector('[data-act="wake"]').onclick();assert.ok(document.querySelector('[data-act="ask"]'));const close=document.querySelector('.xg-feature-header button');assert.ok(close);close.click();assert.equal(closed,1);assert.equal(document.querySelector('.xg-xigong'),null);
});
