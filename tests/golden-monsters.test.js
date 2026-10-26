import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {GOLDEN_MONSTERS} from '../data/locations.js';
import {beginBattle,playRound,fleeBattle} from '../systems/combat.js';
import {createMapUI} from '../ui/map.js';
import {migrateSave} from '../storage/migrations.js';
const make=()=>({bagCapacity:20,slot:'gold-monsters',player:{realm:'金丹一层',cultivation:0,spiritStones:20,hp:73,mp:20,spiritRoot:'金木双灵根',combat:{hp:73,mp:20,attack:11.1,defense:3.52,speed:10.7,critRate:10,dodgeRate:10},goldenCoreHpBonus:0,goldenCoreBonus:{attack:0,defense:0,speed:0,mp:0,critRate:0,dodgeRate:0}},inventory:[{uid:'sword',itemId:'foundation-late-sword',durability:20}],equipment:{weapon:'sword'},techniques:{mastered:['strengthen-attack'],combat:['strengthen-attack']},dongxiaUnlocked:true});
function fight(s,id){beginBattle(s,id);let rounds=0;while(s.battle&&rounds++<25){const ready=(s.battle.skillReady['strengthen-attack']||0)<=s.battle.round+1;playRound(s,ready&&s.player.mp>=1?'strengthen-attack':'attack');if(rounds===1&&s.battle)assert.equal(s.battle.mp,5)}assert.ok(rounds<25);return s.lastBattle}
test('only unlocked golden characters can challenge; no premature pet support',()=>{
 const s=make();s.dongxiaUnlocked=false;assert.throws(()=>beginBattle(s,GOLDEN_MONSTERS[0].id));s.dongxiaUnlocked=true;s.player.realm='筑基一层';assert.throws(()=>beginBattle(s,GOLDEN_MONSTERS[0].id));s.player.realm='金丹一层';assert.throws(()=>beginBattle(s,GOLDEN_MONSTERS[0].id,'attack'),/尚未升级或喂养/);
});
test('two consecutive fights match agreed balance, consume MP and durability, grant golden loot',t=>{
 t.mock.method(Math,'random',()=>.99);
 for(const [i,left] of [[0,9.84],[1,4.56],[2,12.96]]){
  const s=make(),m=GOLDEN_MONSTERS[i];for(let n=0;n<2;n++){const result=fight(s,m.id);assert.equal(result.outcome,'victory');assert.ok(result.rewards.length>0);assert.equal(result.xp,0)}
  assert.equal(s.player.hp,left);assert.equal(s.player.cultivation,0);assert.ok(s.player.spiritStones>=20);assert.ok(s.inventory.length>1);assert.equal(s.inventory[0].durability,18);assert.ok(s.player.mp<20);assert.equal(s.encounterPending,undefined);assert.equal(s.divinationPending,undefined);
 }
});
test('battle survives migration and can flee or lose',t=>{
 t.mock.method(Math,'random',()=>.99);let s=make();beginBattle(s,GOLDEN_MONSTERS[2].id);s=migrateSave(structuredClone(s));assert.equal(s.battle.stage,'金丹');assert.doesNotThrow(()=>playRound(s));assert.doesNotThrow(()=>fleeBattle(s));assert.equal(s.lastBattle.outcome,'fled');
 s=make();s.player.hp=1;beginBattle(s,GOLDEN_MONSTERS[2].id);playRound(s,'skip');assert.equal(s.lastBattle.outcome,'defeat');assert.equal(s.battle,null);
});
test('map opens wilds, monster sheet and battle; victory returns to Dongxia',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><main id="xg-content"></main></body></html>').document;t.after(()=>globalThis.document=old);t.mock.method(Math,'random',()=>.99);
 const s=make(),actions={mutate:async fn=>({result:fn(s)}),startBattle:async id=>beginBattle(s,id),battleRound:async action=>({result:playRound(s,action)})};const map=createMapUI({getSave:()=>s,actions,activate:()=>{}});
 map.render();document.querySelector('[data-map="dongxia"]').click();await new Promise(r=>setImmediate(r));document.querySelector('[data-golden-wilds]').click();assert.equal(document.querySelectorAll('[data-golden]').length,3);document.querySelector('[data-golden]').click();assert.match(document.body.textContent,/灵石/);await document.querySelector('[data-golden-fight]').onclick({currentTarget:document.querySelector('[data-golden-fight]')});assert.ok(s.battle);
 while(s.battle)await document.querySelector('[data-fight="attack"]').onclick();assert.match(document.querySelector('[data-return]').textContent,/东夏国/);document.querySelector('[data-return]').click();assert.ok(document.querySelector('[data-golden-wilds]'));
});
