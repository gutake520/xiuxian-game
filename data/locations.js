// 地图拜访宗门的对外服务；内部事务仍由人物页进入。
export const VISITING_SECTS = [
 {id:'tiangong',name:'天工阁',service:'修补装备耐久',detail:'匠师可以修补受损装备；费用待定。',npc:'炼器师'},
 {id:'danxia',name:'丹霞谷',service:'购买丹药',detail:'小还丹 5 灵石（恢复 12 HP）、回灵丹 5 灵石（恢复 6 MP）、养元丹 3.5 灵石（恢复 7 HP、3 MP）、聚气丹 5 灵石（当天挂机上限增加半小时）。',npc:'药师'},
 {id:'qinglan',name:'青岚谷',service:'医修治疗',detail:'医修可立即疗伤；恢复量与费用待定。',npc:'医修'},
 {id:'hehuan',name:'合欢宗',service:'山门拜访',detail:'其他对外事务待定。',npc:'迎客弟子'},
 {id:'wanling',name:'万灵山',service:'租借灵兽',detail:'1 灵石一份租约，战前选择追击或守护；出战消耗一份。',npc:'御兽师'},
 {id:'lingxiao',name:'凌霄剑宗',service:'山门拜访',detail:'其他对外事务待定。',npc:'守山弟子'},
 {id:'xuanji',name:'玄机门',service:'购买阵盘',detail:'定身阵盘使对手下一轮无法行动；本宗弟子每场可免费使用一次。',npc:'阵师'},
 {id:'taixu',name:'太虚符宗',service:'购买符箓',detail:'攻击符额外造成 2 点伤害；护身符免疫下一次伤害。每场最多使用两张。',npc:'符师'},
 {id:'zhenyue',name:'镇岳宗',service:'静室打坐',detail:'花灵石等待恢复生命，期间不能进行其他行动；费用、恢复量与等待时间待定。',npc:'静室管事'}
];

export const QI_MONSTERS = [
 {id:'tough',name:'厚血型小妖',hp:'16～20',hpMin:16,hpMax:20,attack:2,speed:1,drop:'灵石 2～3',resource:'stones'},
 {id:'fierce',name:'凶攻型小妖',hp:'10～12',hpMin:10,hpMax:12,attack:4,speed:1,drop:'草药 2～3',resource:'herbs'},
 {id:'swift',name:'迅捷型小妖',hp:'12～14',hpMin:12,hpMax:14,attack:3,speed:3,drop:'矿石 2～3',resource:'ore'}
];

export const QI_PEAKS = [
 {id:'stone-ridge',name:'石脊岭',kind:'monster',monsterId:'tough',x:6,y:5,size:.77},
 {id:'thorn-slope',name:'赤荆坡',kind:'monster',monsterId:'fierce',x:57,y:4,size:.76},
 {id:'wind-cliff',name:'风鸣崖',kind:'monster',monsterId:'swift',x:27,y:29,size:.79},
 {id:'pine-summit',name:'松隐峰',kind:'npc',npc:'沈砚',description:'一位暂居山中的游方剑客。',x:68,y:37,size:.76},
 {id:'spring-hill',name:'听泉岭',kind:'npc',npc:'云枝',description:'在山间采药的年轻药师。',x:5,y:61,size:.77},
 {id:'star-realm',name:'星落秘境',kind:'secret',x:58,y:70,size:.82}
];
