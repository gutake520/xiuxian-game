export const TITLES=[
 {id:'animal-friend',name:'动物之友',condition:'灵兽峰喂养圆满 10 只不同动物。',description:'出战灵兽的追击伤害、守护减伤变为 1.2 倍。'},
 {id:'sea-king',name:'海王',condition:'曾与至少 3 位不同人物结为道侣，已解除的也计入。',description:'佩戴时魅力 +2。'}
];
export const titleName=player=>TITLES.find(t=>t.id===player?.equippedTitle)?.name||'未佩戴';
export function effectiveStat(player,key){
 const base=Number(player?.stats?.[key])||0;
 return base+(key==='魅力'&&player?.equippedTitle==='sea-king'?2:0);
}
export function beastPower(save,type,stage){
 const base=type==='attack'?(stage==='筑基'?.8:.5):(stage==='筑基'?.5:.3);
 return Math.round(base*(save.player?.equippedTitle==='animal-friend'?1.2:1)*100)/100;
}
