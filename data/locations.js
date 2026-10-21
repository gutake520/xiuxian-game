// 地图拜访宗门的对外服务；内部事务仍由人物页进入。
export const VISITING_SECTS = [
 {id:'tiangong',name:'天工阁',service:'修补装备耐久',detail:'',npc:'炼器师'},
 {id:'danxia',name:'丹霞谷',service:'购买丹药',detail:'',npc:'药师'},
 {id:'qinglan',name:'青岚谷',service:'医修治疗',detail:'',npc:'医修'},
 {id:'hehuan',name:'合欢宗',service:'山门拜访',detail:'其他对外事务待定。',npc:'迎客弟子'},
 {id:'wanling',name:'万灵山',service:'租借灵兽',detail:'战前选择追击或守护，出战消耗一份租约。',npc:'御兽师'},
 {id:'lingxiao',name:'凌霄剑宗',service:'山门拜访',detail:'其他对外事务待定。',npc:'守山弟子'},
 {id:'xuanji',name:'玄机门',service:'购买阵盘',detail:'定身阵盘使对手下一轮无法行动；本宗弟子可习得制作六次使用的阵盘。',npc:'阵师'},
 {id:'taixu',name:'太虚符宗',service:'购买符箓',detail:'攻击符额外造成 2 点伤害；护身符免疫下一次伤害。每场最多使用两张。',npc:'符师'},
 {id:'zhenyue',name:'镇岳宗',service:'静室打坐',detail:'',npc:'静室管事'}
];

export const QI_MONSTERS = [
 // minLevel 填玩家看到的层数（炼气一层=1），达到后一直可挑战。
 {id:'tough',name:'獠牙',hp:'16～20',hpMin:16,hpMax:20,attack:2,speed:1,drop:'灵石 2～3',resource:'stones',minLevel:1},
 {id:'fierce',name:'尾豹',hp:'10～12',hpMin:10,hpMax:12,attack:4,speed:1,drop:'草药 2～3',resource:'herbs',minLevel:1},
 {id:'swift',name:'风影',hp:'12～14',hpMin:12,hpMax:14,attack:3,speed:3,drop:'矿石 2～3',resource:'ore',minLevel:1},
 {id:'tough-mid',name:'磐牙兽',hp:'22～26',hpMin:22,hpMax:26,attack:2,speed:1,drop:'灵石 2～3',resource:'stones',minLevel:4,twoDropChance:.5,attackBoost:1.1,boostCooldown:3,mp:2},
 {id:'fierce-mid',name:'赤爪豹',hp:'10～12',hpMin:10,hpMax:12,attack:4.5,speed:1,drop:'草药 2～3',resource:'herbs',minLevel:4,twoDropChance:.5,attackBoost:1.1,boostCooldown:3,mp:2},
 {id:'swift-mid',name:'疾风貂',hp:'14～16',hpMin:14,hpMax:16,attack:3.3,speed:3,drop:'矿石 2～3',resource:'ore',minLevel:4,twoDropChance:.5,attackBoost:1.1,boostCooldown:3,mp:2},
 {id:'tough-human',name:'石岭散修',hp:'28～32',hpMin:28,hpMax:32,attack:2.8,speed:1,drop:'灵石 2～3',resource:'stones',minLevel:7,twoDropChance:.5,attackBoost:1.1,boostCooldown:3,mp:2,humanoid:true},
 {id:'fierce-human',name:'赤刃散修',hp:'18～22',hpMin:18,hpMax:22,attack:5,speed:2,drop:'草药 2～3',resource:'herbs',minLevel:8,twoDropChance:.5,attackBoost:1.1,boostCooldown:3,mp:2,humanoid:true},
 {id:'swift-human',name:'逐风散修',hp:'20～24',hpMin:20,hpMax:24,attack:3.8,speed:4,drop:'矿石 2～3',resource:'ore',minLevel:9,twoDropChance:.5,attackBoost:1.1,boostCooldown:3,mp:2,humanoid:true}
];

export const QI_PEAKS = [
 {id:'stone-ridge',name:'石脊岭',kind:'monster',monsterId:'tough',x:6,y:5,size:.77},
 {id:'thorn-slope',name:'赤荆坡',kind:'monster',monsterId:'fierce',x:57,y:4,size:.76},
 {id:'wind-cliff',name:'风鸣崖',kind:'monster',monsterId:'swift',x:27,y:29,size:.79},
 {id:'pine-summit',name:'松隐峰',kind:'npc',npc:'沈砚',description:'一位暂居山中的游方剑客。',x:68,y:37,size:.76},
 {id:'spring-hill',name:'听泉岭',kind:'npc',npc:'云枝',description:'在山间采药的年轻药师。',x:5,y:61,size:.77},
 {id:'star-realm',name:'星落秘境',kind:'secret',x:58,y:70,size:.82}
];
export const FOUNDATION_MONSTERS=[
 {id:'rock-ape',name:'岩背猿',hp:'24～28',hpMin:24,hpMax:28,attack:2.8,speed:3,drop:'灵石 2～3',resource:'stones',minLevel:1,stage:'筑基',xp:30},
 {id:'claw-wolf',name:'裂爪狼',hp:'13～16',hpMin:13,hpMax:16,attack:4.2,speed:4,drop:'草药 2～3',resource:'herbs',minLevel:1,stage:'筑基',xp:30},
 {id:'cloud-falcon',name:'掠云隼',hp:'16～19',hpMin:16,hpMax:19,attack:3.5,speed:6,drop:'矿石 2～3',resource:'ore',minLevel:1,stage:'筑基',xp:30},
 {id:'rock-ape-mid',name:'玄甲猿',hp:'40～44',hpMin:40,hpMax:44,attack:4,speed:4,drop:'灵石 2～3',resource:'stones',minLevel:4,stage:'筑基',xp:45,attackBoost:1.2,boostCooldown:3,mp:3,humanoid:false},
 {id:'claw-wolf-mid',name:'赤牙狼王',hp:'29～33',hpMin:29,hpMax:33,attack:5.8,speed:5,drop:'草药 2～3',resource:'herbs',minLevel:4,stage:'筑基',xp:45,attackBoost:1.2,boostCooldown:3,mp:3,humanoid:false},
 {id:'cloud-falcon-mid',name:'惊雷隼',hp:'32～36',hpMin:32,hpMax:36,attack:4.8,speed:8,drop:'矿石 2～3',resource:'ore',minLevel:4,stage:'筑基',xp:45,attackBoost:1.2,boostCooldown:3,mp:3,humanoid:false},
 {id:'rock-ape-human',name:'磐石散修',hp:'52～56',hpMin:52,hpMax:56,attack:4.8,speed:5,drop:'灵石 2～3',resource:'stones',minLevel:7,stage:'筑基',xp:65,attackBoost:1.2,boostCooldown:3,mp:3,humanoid:true},
 {id:'claw-wolf-human',name:'断刃刀客',hp:'40～44',hpMin:40,hpMax:44,attack:7,speed:7,drop:'草药 2～3',resource:'herbs',minLevel:8,stage:'筑基',xp:75,attackBoost:1.2,boostCooldown:3,mp:3,humanoid:true},
 {id:'cloud-falcon-human',name:'穿云剑客',hp:'44～48',hpMin:44,hpMax:48,attack:6.2,speed:10,drop:'矿石 2～3',resource:'ore',minLevel:9,stage:'筑基',xp:85,attackBoost:1.2,boostCooldown:3,mp:3,humanoid:true},
 {id:'foundation-warden',name:'封渡客',hp:'70',hpMin:70,hpMax:70,attack:7.5,speed:9,drop:'首次获赠归元佩与结丹线索',resource:'stones',minLevel:10,stage:'筑基',xp:0,attackBoost:1.25,boostCooldown:3,mp:4,boss:true}
];
export const FOUNDATION_PEAKS=[
 {id:'rock-hollow',name:'磐石坳',kind:'monster',monsterId:'rock-ape',x:7,y:12,size:.83},
 {id:'cloud-gorge',name:'穿云涧',kind:'monster',monsterId:'cloud-falcon',x:61,y:8,size:.78},
 {id:'blade-slope',name:'断刃坡',kind:'monster',monsterId:'claw-wolf',x:33,y:55,size:.84},
 {id:'foundation-secret',name:'筑基秘境',kind:'secret',x:7,y:72,size:.8}
];
