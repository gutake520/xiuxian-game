import {addItem} from './inventory.js';

const MAX_FRAGMENTS=3;
export function maybeMeetHerbalist(save,battleId){
 if(save.encounterPending||save.herbalistFragments>=MAX_FRAGMENTS||save.techniques?.mastered?.includes('spirit-burn'))return false;
 const fortune=Number(save.player.stats?.福缘)||0;
 if(Math.random()>=Math.min(1,.02*Math.max(1,fortune)))return false;
 save.encounterPending={id:crypto.randomUUID(),battleId};
 return true;
}
export function resolveHerbalist(save,id,give){
 if(save.battle)throw new Error('请先结束战斗。');
 if(!save.encounterPending||save.encounterPending.id!==id)throw new Error('这次相遇已经结束。');
 if(!give){save.encounterPending=null;return '你与那人暂别，继续赶路。'}
 const herb=save.inventory.find(entry=>entry.itemId==='healing-herb');
 if(!herb)throw new Error('储物中没有回血草。');
 if((save.herbalistFragments||0)===MAX_FRAGMENTS-1&&save.inventory.length>=save.bagCapacity&&(herb.quantity||1)>1)throw new Error('请先腾出一个储物格，再接过完整典籍。');
 if((herb.quantity||1)>1)herb.quantity--;else save.inventory=save.inventory.filter(entry=>entry!==herb);
 save.encounterPending=null;
 save.herbalistFragments=Math.min(MAX_FRAGMENTS,(save.herbalistFragments||0)+1);
 if(save.herbalistFragments<MAX_FRAGMENTS)return `对方收下回血草，赠你一片残缺玉简（${save.herbalistFragments}/${MAX_FRAGMENTS}）。`;
 addItem(save,'spirit-burn-manual');
 return '三片玉简合为《灵息尽燃》，典籍已收入储物。';
}
