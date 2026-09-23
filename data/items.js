export const ITEMS={
 'iron-sword':{id:'iron-sword',name:'铁剑',price:5,kind:'equipment',slot:'weapon',attack:1,glyph:'剑',description:'坊市铁剑，攻击 +1。'},
 'cloth-robe':{id:'cloth-robe',name:'布衣',price:5,kind:'equipment',slot:'armor',defense:.5,glyph:'衣',description:'坊市布衣，防御 +0.50。'},
 'wild-sword':{id:'wild-sword',name:'小妖铁剑',kind:'equipment',slot:'weapon',attack:1.2,glyph:'剑',description:'小妖掉落，攻击 +1.20。'},
 'wild-robe':{id:'wild-robe',name:'小妖布甲',kind:'equipment',slot:'armor',defense:.6,glyph:'甲',description:'小妖掉落，防御 +0.60。'},
 'wild-shoes':{id:'wild-shoes',name:'轻行靴',kind:'equipment',slot:'shoes',speed:2,glyph:'履',description:'小妖掉落，速度 +2。'},
 'hp-charm':{id:'hp-charm',name:'护命佩',kind:'equipment',slot:'accessoryVital',hp:3,glyph:'佩',description:'小妖掉落，生命上限 +3。'},
 'mp-charm':{id:'mp-charm',name:'聚灵佩',kind:'equipment',slot:'accessoryVital',mp:2,glyph:'佩',description:'小妖掉落，法力上限 +2。'},
 'crit-charm':{id:'crit-charm',name:'锐锋佩',kind:'equipment',slot:'accessoryFate',critRate:10,glyph:'佩',description:'小妖掉落，暴击率 +10%。'},
 'dodge-charm':{id:'dodge-charm',name:'轻身佩',kind:'equipment',slot:'accessoryFate',dodgeRate:10,glyph:'佩',description:'小妖掉落，闪避率 +10%。'},
 'healing-herb':{id:'healing-herb',name:'回血草',kind:'material',stackable:true,glyph:'草',description:'炼丹材料。'},
 'spirit-herb':{id:'spirit-herb',name:'回灵草',kind:'material',stackable:true,glyph:'草',description:'炼丹材料。'},
 'qi-herb':{id:'qi-herb',name:'聚气草',kind:'material',stackable:true,glyph:'草',description:'炼丹材料。'},
 'ore':{id:'ore',name:'矿石',kind:'material',stackable:true,glyph:'矿',description:'炼器材料。'},
 'small-heal-pill':{id:'small-heal-pill',name:'小还丹',price:4.5,kind:'pill',stackable:true,hp:12,glyph:'丹',description:'恢复 12 点生命。'},
 'spirit-pill':{id:'spirit-pill',name:'回灵丹',price:4.5,kind:'pill',stackable:true,mp:6,glyph:'丹',description:'恢复 6 点法力。'},
 'mixed-pill':{id:'mixed-pill',name:'养元丹',price:3.5,kind:'pill',stackable:true,hp:7,mp:3,glyph:'丹',description:'恢复 7 点生命与 3 点法力。'},
 'qi-pill':{id:'qi-pill',name:'聚气丹',price:5,kind:'pill',stackable:true,glyph:'丹',description:'服用当天的挂机上限增加半小时；当天不可叠加。'},
 'attack-talisman':{id:'attack-talisman',name:'攻击符',price:2.5,kind:'talisman',stackable:true,glyph:'符',description:'战斗中额外造成 2 点伤害，每轮限一张。'},
 'guard-talisman':{id:'guard-talisman',name:'护身符',price:2.5,kind:'talisman',stackable:true,glyph:'符',description:'免疫下一次受到的伤害，每轮限一张。'},
 'binding-array':{id:'binding-array',name:'定身阵盘',price:3,kind:'array',stackable:true,glyph:'阵',description:'使小妖下一轮无法行动。'},
 'qi-manual':{id:'qi-manual',name:'引气诀',price:10,kind:'manual',methodId:'basic-qi-guide',glyph:'诀',description:'解开三阶数阵后学会，可设为主修。'},
 'strengthen-manual':{id:'strengthen-manual',name:'强化普通',price:20,kind:'manual',methodId:'strengthen-attack',glyph:'诀',description:'普通战斗功法，参悟后可以装备。'},
 'wall-manual':{id:'wall-manual',name:'铜墙铁壁',price:20,kind:'manual',methodId:'iron-wall',glyph:'诀',description:'普通战斗功法，参悟后可以装备。'},
 'one-manual':{id:'one-manual',name:'这里有一',price:66,kind:'manual',methodId:'only-one',glyph:'诀',description:'高级通用战斗功法，参悟五阶数阵后可装备。'},
 'steal-manual':{id:'steal-manual',name:'妙手空空',price:20,kind:'manual',methodId:'empty-hands',glyph:'诀',description:'普通战斗功法，参悟后可装备。'},
 'breath-manual':{id:'breath-manual',name:'回一口气',price:20,kind:'manual',methodId:'catch-breath',glyph:'诀',description:'不耗法力，造成固定 1 点伤害并恢复 1 点法力。'},
 'charged-manual':{id:'charged-manual',name:'蓄势一击',price:20,kind:'manual',methodId:'charged-strike',glyph:'诀',description:'耗 1 点法力，本次攻击造成 1.3 倍伤害，冷却四轮。'},
 'only-once-manual':{id:'only-once-manual',name:'只此一次！',price:20,kind:'manual',methodId:'only-once',glyph:'诀',description:'普通战斗功法，参悟后可装备；每场施展一次，暴击率增加 15 个百分点。'},
 'gamble-manual':{id:'gamble-manual',name:'我赌一把',price:20,kind:'manual',methodId:'gamble-strike',glyph:'诀',description:'普通战斗功法，参悟后可以装备。'}
};
export const SHOP_ITEMS=['iron-sword','cloth-robe','qi-manual','strengthen-manual','wall-manual','gamble-manual','steal-manual','breath-manual','charged-manual','only-once-manual'];
export const SECT_PILLS=['small-heal-pill','spirit-pill','mixed-pill','qi-pill'];
export const SECT_TALISMANS=['attack-talisman','guard-talisman'];
