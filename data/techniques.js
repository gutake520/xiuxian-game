export const TECHNIQUES={
 'basic-qi-guide':{id:'basic-qi-guide',name:'引气诀',rank:'初级',size:3,type:'cultivation',idlePerMinute:0.5,description:'凝神引气，主修后每分钟积累 0.5 修为。'},
 'strengthen-attack':{id:'strengthen-attack',name:'强化普通',rank:'普通',type:'combat',cooldown:2,description:'本次攻击造成攻击力 1.1 倍的伤害，再结算防御；冷却两轮。'},
 'iron-wall':{id:'iron-wall',name:'铜墙铁壁',rank:'普通',type:'combat',description:'本轮防御额外增加 1 点，同时造成 1 点伤害。'},
 'gamble-strike':{id:'gamble-strike',name:'我赌一把',rank:'普通',type:'combat',cooldown:5,description:'本次攻击各有 50% 概率造成 1.5 倍或 0.8 倍伤害；冷却五轮。'},
 'cooldown-reset':{id:'cooldown-reset',name:'滴，重置卡',rank:'高级',type:'combat',mpCost:5,description:'占一次行动，重置其他已装备功法的冷却；每场限用一次，不恢复每场限用次数。'},
 'only-one':{id:'only-one',name:'这里有一',rank:'高级',type:'combat',mpCost:5,description:'造成固定 1 点伤害；本轮先手时，敌人的攻击最多造成 1 点伤害，后手时无此效果。'},
 'empty-hands':{id:'empty-hands',name:'妙手空空',rank:'普通',type:'combat',cooldown:2,description:'造成固定 2 点伤害；敌人存活时，有 20% 概率额外抽取最多 2 点生命并回复自身。冷却两轮。'},
 'catch-breath':{id:'catch-breath',name:'回一口气',rank:'普通',type:'combat',mpCost:0,description:'不耗法力，占一次行动，造成固定 1 点伤害并恢复 1 点法力。'},
 'charged-strike':{id:'charged-strike',name:'蓄势一击',rank:'普通',type:'combat',mpCost:1,cooldown:4,description:'消耗 1 点法力，单灵根攻击倍率 1.3，双／三灵根 1.2，四／五灵根 1.1；冷却四轮。'},
 'sting':{id:'sting',name:'蛰一下',rank:'普通',type:'combat',mpCost:2,cooldown:3,description:'造成固定 2 点伤害，下一轮敌人再失去 2 点生命；冷却三轮。'},
 'wait-then-strike':{id:'wait-then-strike',name:'等等再来',rank:'中级',type:'combat',mpCost:3,cooldown:3,description:'本轮蓄势，下一轮自动攻击并占用行动。单灵根伤害倍率 2.5，双／三灵根 2.4，四／五灵根 2.3；冷却三轮。'},
 'spirit-burn':{id:'spirit-burn',name:'灵息尽燃',rank:'中级',type:'combat',description:'耗尽当前全部法力，造成消耗量的 0.9／0.8／0.7 倍固定伤害，依次对应单灵根、双／三灵根、四／五灵根；无法暴击，无冷却。'},
 'only-once':{id:'only-once',name:'只此一次！',rank:'普通',type:'combat',mpCost:2,description:'每场战斗限用一次，占一次行动；本场战斗暴击率增加 15 个百分点。'},
 'divine-pharmacopoeia':{id:'divine-pharmacopoeia',name:'神药谱',rank:'特殊',type:'craft',sect:'丹霞谷',roots:['火','木'],description:'丹霞谷炼丹传承。参悟五阶数阵后，便可用药草炼制丹药。'},
 'mending':{id:'mending',name:'缝缝补补又三年',rank:'特殊',type:'craft',sect:'天工阁',roots:['金','火'],description:'学会后解锁自行修补装备；修补材料规则待定。'},
 'beast-keeper':{id:'beast-keeper',name:'铲屎官手册',rank:'特殊',type:'craft',sect:'万灵山',roots:['木','土','风'],description:'学会后赠送一只炼气灵兽，可选择追击或守护出战；喂养细则待定。'},
 'fairy-painting':{id:'fairy-painting',name:'画中仙',rank:'特殊',type:'craft',sect:'太虚符宗',allStats:[['神识',6],['悟性',7]],description:'解锁制符：一份药草、一份矿石制成一张攻击符或护身符。'},
 'planting-flags':{id:'planting-flags',name:'我在插旗，勿扰',rank:'特殊',type:'craft',sect:'玄机门',roots:['冰'],stat:['神识',8],description:'解锁阵盘制作：18 份矿石制成定身阵盘；第二种阵盘待定。'},
 'life-steal':{id:'life-steal',name:'你的就是我的',rank:'特殊',type:'combat',passive:true,sect:'合欢宗',stat:['魅力',8],description:'装备后，角色攻击造成的实际伤害有 10% 转为生命。不计算溢出伤害、灵兽和道具。'},
 'resentment':{id:'resentment',name:'以怨报怨',rank:'特殊',type:'combat',passive:true,sect:'镇岳宗',roots:['雷','土'],stat:['根骨',8],description:'装备后，每次受伤且存活时，反弹敌方本次攻击原始伤害的 10%，不受防御或限伤影响；闪避与完全免伤不触发。'},
 'one-sword':{id:'one-sword',name:'锋锐',rank:'特殊',type:'combat',passive:true,sect:'凌霄剑宗',roots:['金','雷','冰'],description:'装备后，人物自身造成的最终伤害提高 10%。普攻与战斗功法生效；灵兽、符箓与反伤不计。'},
 'healing-hands':{id:'healing-hands',name:'妙手回春',rank:'特殊',type:'combat',mpCost:2,cooldown:5,sect:'青岚谷',roots:['木','水'],description:'占一次行动，当轮结束起每轮恢复 2 点生命，持续三轮，冷却五轮；战斗结束即停止。'}
};
for(const method of Object.values(TECHNIQUES))if(method.type==='combat'&&!method.passive&&method.mpCost===undefined)method.mpCost=1;
export const PUZZLE_SIZES={初级:3,普通:3,中级:4,高级:5,特殊:5};
export const UPGRADEABLE_TECHNIQUES=['only-once','empty-hands','gamble-strike'];
export function hintAllowance(spirit){return Number(spirit)>=10?2:Number(spirit)>=5?1:0}

export function techniqueEligible(player,method){
 if(!method)return false;
 if(!method.sect)return true;
 if(player.sect!==method.sect)return false;
 const enough=([key,min])=>Number(player.stats?.[key])>=min;
 return method.allStats?method.allStats.every(enough):Boolean(method.roots?.some(root=>String(player.spiritRoot||'').includes(root))||(method.stat&&enough(method.stat)));
}
export function hasActiveTechnique(save,id){return Boolean(save.techniques?.mastered?.includes(id)&&techniqueEligible(save.player,TECHNIQUES[id])&&(TECHNIQUES[id].type==='craft'||save.techniques?.combat?.includes(id)))}
