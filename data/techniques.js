export const TECHNIQUES={
 'basic-qi-guide':{id:'basic-qi-guide',name:'引气诀',rank:'初级',size:3,type:'cultivation',idlePerMinute:0.5,description:'凝神引气，主修后每分钟积累 0.5 修为。'},
 'strengthen-attack':{id:'strengthen-attack',name:'强化普通',rank:'普通',type:'combat',cooldown:2,description:'本次攻击造成攻击力 1.1 倍的伤害，再结算防御；冷却两轮。'},
 'iron-wall':{id:'iron-wall',name:'铜墙铁壁',rank:'普通',type:'combat',description:'本轮防御变为 1.5 倍，同时造成 1 点伤害。'},
 'gamble-strike':{id:'gamble-strike',name:'我赌一把',rank:'普通',type:'combat',cooldown:5,description:'本次攻击各有 50% 概率造成 1.5 倍或 0.8 倍伤害；冷却五轮。'},
 'divine-pharmacopoeia':{id:'divine-pharmacopoeia',name:'神药谱',rank:'特殊',type:'craft',sect:'丹霞谷',description:'丹霞谷炼丹传承。参悟五阶数阵后，便可用药草炼制丹药。'}
};
export const PUZZLE_SIZES={初级:3,普通:3,中级:4,高级:5,特殊:5};
export function hintAllowance(spirit){return Number(spirit)>=10?2:Number(spirit)>=5?1:0}
