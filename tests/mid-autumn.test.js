import test from 'node:test';
import assert from 'node:assert/strict';
import {midAutumnYear,queueMidAutumn,eatMooncake} from '../systems/mid-autumn.js';

const at=(year,month,day,hour,minute=0)=>new Date(year,month-1,day,hour,minute).getTime();
const save=(sect='无门无派')=>({player:{sect,realm:'炼气一层',cultivation:-30,hp:20,mp:10}});

test('农历八月十五的本地 20:00 到午夜开放，每年重新开放',()=>{
 assert.equal(midAutumnYear(at(2026,9,25,19,59)),null);
 assert.equal(midAutumnYear(at(2026,9,25,20)),2026);
 assert.equal(midAutumnYear(at(2026,9,25,23,59)),2026);
 assert.equal(midAutumnYear(at(2026,9,26,0)),null);
 assert.equal(midAutumnYear(at(2025,10,6,20)),2025);
});

test('宗门同伴赏月，单年只领取一次；下一年能再次领取',()=>{
 const s=save('凌霄剑宗'),now=at(2026,9,25,20);
 assert.equal(queueMidAutumn(s,now),true);
 assert.equal(s.midAutumnPending.sect,true);
 assert.equal(['叶孤锋','楚剑寒','裴逐星','沈照霜','江横秋','谢问剑'].includes(s.midAutumnPending.visitor),true);
 assert.equal(queueMidAutumn(s,now),false);
 eatMooncake(s,2026);
 assert.equal(s.player.cultivation,20);
 assert.throws(()=>eatMooncake(s,2026));
 assert.equal(queueMidAutumn(s,now),false);
 assert.equal(queueMidAutumn(s,at(2025,10,6,20)),true);
});

test('散修由闻照送月饼，奇遇在存档中等候领取',()=>{
 const s=save();
 queueMidAutumn(s,at(2026,9,25,20));
 assert.deepEqual(s.midAutumnPending,{year:2026,visitor:'闻照',sect:false});
 eatMooncake(s,2026);
 assert.equal(s.player.cultivation,20);
});

test('炼气十层也记下完整 50 点，旧年未领的邀请由新年取代',()=>{
 const s=save();s.player.realm='炼气十层';s.player.cultivation=100;
 queueMidAutumn(s,at(2025,10,6,20));
 queueMidAutumn(s,at(2026,9,25,20));
 assert.equal(s.midAutumnPending.year,2026);
 eatMooncake(s,2026);
 assert.equal(s.player.cultivation,150);
});
