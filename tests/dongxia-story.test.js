import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {findXigong,actXigong} from '../systems/dongxia-story.js';
import {XIGONG_CHAPTERS} from '../data/dongxia-story.js';
import {showXigong} from '../ui/dongxia-story.js';
import {takeStroll} from '../systems/stroll.js';
const now=new Date(2026,9,26,12).getTime();
const make=()=>({slot:'story',player:{realm:'金丹一层',spiritStones:100},dongxiaUnlocked:true,foundationStory:{phase:'searched'},inventory:[]});
test('recruitment is once daily at twenty percent, requires clue and does not use encounter quota',()=>{
 const s=make();assert.equal(findXigong(s,now,()=>.2),false);assert.equal(findXigong(s,now,()=>0),false);assert.equal(findXigong(s,now+86400000,()=>.199),true);
 const a=make();takeStroll(a,'dongxia',now,()=>0);assert.ok(a.dongxiaStory);assert.equal(a.stroll.encounters,0);assert.equal(a.player.spiritStones,100);
 const b=make();b.dongxiaUnlocked=false;assert.equal(findXigong(b,now,()=>0),false);
});
test('all investigations preserve evidence across reload, reject stale submissions, retry free and stop at attack hook',()=>{
 let s=make();findXigong(s,now,()=>0);const id=s.dongxiaStory.id;actXigong(s,id,0,'join',0,now);
 for(let step=0;step<XIGONG_CHAPTERS.length;step++){
 const at=now+step*86400000,c=XIGONG_CHAPTERS[step];assert.throws(()=>actXigong(s,id,step,'answer',c.correct,at));
 for(let i=0;i<3;i++)actXigong(s,id,step,'lead',i,at);
 s=structuredClone(s);actXigong(s,id,step,'answer',(c.correct+1)%3,at);assert.equal(s.dongxiaStory.step,step);assert.equal(s.player.spiritStones,100);
 actXigong(s,id,step,'answer',c.correct,at);assert.throws(()=>actXigong(s,id,step,'answer',c.correct,at));if(step<4)assert.throws(()=>actXigong(s,id,step+1,'lead',0,at));
 }
 assert.equal(s.dongxiaStory.phase,'attack-pending');assert.equal(s.dongxiaStory.nextChapter,'xigong-defense');assert.equal(s.dongxiaStory.journal.length,5);
});
test('story UI exposes polite choices and evidence only after inquiry, then renders deduction',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><div id="xg-panel"></div></body></html>').document;t.after(()=>globalThis.document=old);const s=make();findXigong(s,now,()=>0);const api={getSave:()=>s,actions:{mutate:async fn=>({result:fn(s)})}};showXigong(api,()=>{});await document.querySelector('[data-act="join"]').onclick();assert.equal(document.querySelectorAll('[data-act="lead"]').length,3);assert.equal(document.querySelector('[data-act="answer"]'),null);for(let i=0;i<3;i++)await document.querySelector(`[data-act="lead"][data-value="${i}"]`).onclick();assert.equal(document.querySelectorAll('[data-act="answer"]').length,3);
});
test('UI retains reading position, avoids duplicated prose, shows completed chapter and recovers failed saves',async t=>{
 const old=globalThis.document;globalThis.document=parseHTML('<html><body><div id="xg-panel"></div></body></html>').document;t.after(()=>globalThis.document=old);const s=make();findXigong(s,now,()=>0);actXigong(s,s.dongxiaStory.id,0,'join',0,now);let fail=false;const api={getSave:()=>s,actions:{mutate:async fn=>{if(fail)throw Error('保存失败');return {result:fn(s)}}}};
 showXigong(api,()=>{});const body=document.querySelector('[data-body]');body.scrollTop=120;body.querySelector('details').open=true;
 await body.querySelector('[data-act="lead"]').onclick();assert.equal(body.scrollTop,120);assert.ok(body.querySelector('details').open);assert.equal(document.querySelector('[role=status]').textContent,'线索已记入本页。');assert.ok(document.querySelector('.xg-xigong'));
 fail=true;await body.querySelector('[data-value="1"]').onclick();assert.match(document.querySelector('[role=status]').textContent,/保存失败/);assert.ok([...body.querySelectorAll('button')].every(b=>!b.disabled));fail=false;
 for(let i=1;i<3;i++)await body.querySelector(`[data-act="lead"][data-value="${i}"]`).onclick();await body.querySelector('[data-act="answer"][data-value="1"]').onclick();assert.equal(body.querySelector('h3').textContent,XIGONG_CHAPTERS[0].title);assert.equal(body.scrollTop,0);assert.equal(document.querySelector('[role=status]').textContent,'今日调查已整理。');
});
