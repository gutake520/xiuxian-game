import test from 'node:test';
import assert from 'node:assert/strict';
import {worldDay} from '../systems/cultivation.js';
import {migrateSave} from '../storage/migrations.js';

test('world day advances at local midnight and does not depend on action count',()=>{
 const createdAt=new Date(2026,8,24,23,55).getTime();
 const save={createdAt,world:{day:1}};
 assert.equal(worldDay(save,new Date(2026,8,24,23,59).getTime()),1);
 assert.equal(worldDay(save,new Date(2026,8,25,0,1).getTime()),2);
 assert.equal(worldDay(save,new Date(2026,8,26,12).getTime()),3);
 assert.equal(worldDay({...save,world:{day:5}},new Date(2026,8,25).getTime()),5);
});

test('old saves without a creation timestamp keep a stable calendar anchor',()=>{
 const yesterday=new Date(2026,8,24,10).getTime(),today=new Date(2026,8,25,10).getTime();
 const save={player:{name:'旧档',realm:'炼气一层'},world:{day:1},updatedAt:yesterday};
 migrateSave(save,today);
 assert.equal(save.world.dayAnchorAt,yesterday);
 assert.equal(worldDay(save,today),2);
 save.updatedAt=today;migrateSave(save,today);
 assert.equal(save.world.dayAnchorAt,yesterday);
 assert.equal(worldDay(save,today),2);
});
