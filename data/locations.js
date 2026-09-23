// 地图拜访宗门的对外服务；内部事务仍由人物页进入。
export const VISITING_SECTS = [
 {id:'tiangong',name:'天工阁',service:'修补装备耐久',detail:'匠师可以修补受损装备；费用待定。',npc:'炼器师'},
 {id:'danxia',name:'丹霞谷',service:'购买丹药',detail:'小还丹 5 灵石（恢复 12 HP）、回灵丹 5 灵石（恢复 6 MP）、养元丹 3.5 灵石（恢复 7 HP、3 MP）、聚气丹 5 灵石（当天挂机上限增加半小时）。',npc:'药师'},
 {id:'qinglan',name:'青岚谷',service:'医修治疗',detail:'医修可立即疗伤；恢复量与费用待定。',npc:'医修'},
 {id:'hehuan',name:'合欢宗',service:'山门拜访',detail:'其他对外事务待定。',npc:'迎客弟子'},
 {id:'wanling',name:'万灵山',service:'租借灵兽',detail:'每次出战消耗一份租约，1 灵石一份；可预租多份，战斗前选择是否出战。战斗开放后可使用。',npc:'御兽师'},
 {id:'lingxiao',name:'凌霄剑宗',service:'山门拜访',detail:'其他对外事务待定。',npc:'守山弟子'},
 {id:'xuanji',name:'玄机门',service:'购买阵盘',detail:'阵盘可在战斗中用于控制；效果、售价待定。本宗弟子每场可使用一枚自制阵盘。',npc:'阵师'},
 {id:'taixu',name:'太虚符宗',service:'购买符箓',detail:'符箓效果与售价待定。',npc:'符师'},
 {id:'zhenyue',name:'镇岳宗',service:'静室打坐',detail:'花灵石等待恢复生命，期间不能进行其他行动；费用、恢复量与等待时间待定。',npc:'静室管事'}
];

export const QI_MONSTERS = [
 {id:'tough',name:'厚血型小妖',hp:'16～20',hpMin:16,hpMax:20,attack:2,speed:1,drop:'灵石 2～3',resource:'stones'},
 {id:'fierce',name:'凶攻型小妖',hp:'10～12',hpMin:10,hpMax:12,attack:4,speed:1,drop:'草药 2～3',resource:'herbs'},
 {id:'swift',name:'迅捷型小妖',hp:'12～14',hpMin:12,hpMax:14,attack:3,speed:3,drop:'矿石 2～3',resource:'ore'}
];
