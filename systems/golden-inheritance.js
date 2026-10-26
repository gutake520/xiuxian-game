import {createPuzzle} from './techniques.js';
import {ITEMS} from '../data/items.js';
import {isGoldenRealm} from './golden-core.js';
import {TECHNIQUES,techniqueEligible} from '../data/techniques.js';
export const GOLDEN_INHERITANCES={
 'planting-flags':'困杀阵盘：赤金矿×20，可用六次；困住对手下一轮并造成5点固定伤害，每场最多发动两次。',
 'one-sword':'自身伤害提高13%。','life-steal':'实际伤害的13%转为生命。','resentment':'反弹原始伤害的15%。','healing-hands':'每轮恢复3.5生命，持续三轮；耗蓝2，冷却4轮。','beast-keeper':'追击和守护在筑基基础上各增加1。','divine-pharmacopoeia':'解锁固元丹：一小时生命上限+13、法力上限+4，两小时可服一枚。','fairy-painting':'解锁金丹攻击符和每日一张的攻守复合符。','mending':'武器附魔：赤金矿×5，每把最多三次，结果可叠加。'
};
export function goldenInheritance(save,id){return Boolean(isGoldenRealm(save.player)&&save.techniques?.goldenInheritances?.includes(id)&&save.techniques?.mastered?.includes(id)&&techniqueEligible(save.player,TECHNIQUES[id]))}
export function upgradeGoldenInheritance(save,id){
 if(save.battle)throw new Error('战斗中不能参悟传承。');
 if(!GOLDEN_INHERITANCES[id]||!isGoldenRealm(save.player)||!save.techniques?.mastered?.includes(id)||!techniqueEligible(save.player,TECHNIQUES[id]))throw new Error('金丹后须先学会本宗传承。');
 if(save.techniques.goldenInheritances?.includes(id))throw new Error('已经升级过这部传承。');
 const key='golden:'+id;save.techniques.puzzles??={};
 if(save.techniques.goldenPaid?.includes(id))return save.techniques.puzzles[key]??=createPuzzle(4,save.player.stats?.神识);
 if((save.sectPoints||0)<99)throw new Error('需要99宗门积分。');
 const puzzle=createPuzzle(4,save.player.stats?.神识);save.sectPoints-=99;(save.techniques.goldenPaid??=[]).push(id);save.techniques.puzzles[key]=puzzle;return puzzle;
}
export function enchantWeapon(save,uid,rng=Math.random){
 if(save.battle||!goldenInheritance(save,'mending'))throw new Error('请先升级本宗金丹传承，并离开战斗。');
 const e=save.inventory.find(x=>x.uid===uid);
 if(!e||ITEMS[e.itemId]?.slot!=='weapon')throw new Error('仅能为武器附魔。');
 if((e.enchantCount||0)>=3)throw new Error('这把武器已附魔三次。');
 const ore=save.inventory.find(x=>x.itemId==='golden-ore');if((ore?.quantity||0)<5)throw new Error('需要赤金矿×5。');
 const roll=rng(),delta=roll<.5?1:roll<.8?0:-1;
 ore.quantity-=5;if(!ore.quantity)save.inventory=save.inventory.filter(x=>x!==ore);
 e.enchantCount=(e.enchantCount||0)+1;e.enchantAttack=(e.enchantAttack||0)+delta;
 return `附魔完成：攻击${delta>0?'+1':delta<0?'−1':'无变化'}，已用${e.enchantCount}/3次。`;
}
