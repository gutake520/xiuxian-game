export function rootCount(player){
 const root=String(player.spiritRoot||'');
 return root.includes('五灵根')?5:root.includes('四灵根')?4:root.includes('三灵根')?3:root.includes('双灵根')?2:1;
}
export function combatSlots(player){
 const count=rootCount(player),base=count===1?3:count<=3?4:5;
 const advanced=/金丹|元婴|化神|炼虚|合体|大乘|渡劫|人仙|地仙|天仙|真仙|金仙/.test(String(player.realm||''));
 return base+(advanced?1:0);
}
export function chargedMultiplier(player){const count=rootCount(player);return count===1?1.3:count<=3?1.2:1.1}
