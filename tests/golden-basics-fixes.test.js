import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {moveGoldenSecret} from '../systems/golden-secret.js';
import {dailyTasks,claimDailyTask} from '../systems/sect-progression.js';
import {startSectTournament} from '../systems/sect-tournament.js';
import {createMapUI} from '../ui/map.js';
const now=new Date(2026,9,26,12).getTime();
const make=()=>({slot:'s',player:{realm:'金丹一层',sect:'青岚谷',cultivation:0,spiritStones:100,hp:30,mp:10,combat:{hp:30,mp:10,attack:5,defense:1,speed:10}},inventory:[],equipment:{},techniques:{mastered:[]},sectDaily:{day:'2026-10-26',selected:['explored'],claimed:[]},goldenSecret:{id:'g',turn:0,bug:30,stones:[21,22,29,31,38],outcome:null}});
test('finished golden secret counts daily exploration once, including reload; abandoning does not',()=>{
 const s=make();moveGoldenSecret(s,'g',0,39,now);assert.equal(s.lastGoldenSecret.outcome,'win');assert.equal(dailyTasks(s,now).explored,1);claimDailyTask(s,'explored','2026-10-26',now);assert.throws(()=>claimDailyTask(s,'explored','2026-10-26',now));assert.equal(s.sectPoints,1);assert.equal(dailyTasks(structuredClone(s),now).explored,1);assert.equal(dailyTasks(s,now+86400000).explored,0);
 const a=make();moveGoldenSecret(a,'g',0,'abandon',now);assert.equal(dailyTasks(a,now).explored,undefined);
});
test('tournament uses the golden pet stage',()=>{
 const s=make();startSectTournament(s,now);assert.equal(s.battle.petStage,'金丹');
});
test('searched pursuer scene directs foundation players to breakthrough and golden players to master',t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><main id="xg-content"></main></body></html>').document;t.after(()=>globalThis.document=old);
 for(const realm of ['筑基十层','金丹一层']){
  const s=make();s.player.realm=realm;s.player.cultivation=4000;s.foundationStory={phase:'searched',enemy:{name:'故敌'}};const map=createMapUI({getSave:()=>s,activate:()=>{},actions:{}});map.render();document.querySelector('[data-map="yunze"]').click();document.querySelector('[data-map="foundation"]').click();document.querySelector('[data-foundation="foundation-ending"]').click();assert.doesNotMatch(document.body.textContent,/待开放/);assert.match(document.body.textContent,realm.startsWith('筑基')?/人物页点击「突破」/:/你已结成金丹/);
 }
});
