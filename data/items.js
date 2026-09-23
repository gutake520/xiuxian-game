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
 'small-heal-pill':{id:'small-heal-pill',name:'小还丹',price:5,kind:'pill',stackable:true,hp:12,glyph:'丹',description:'恢复 12 点生命。'},
 'spirit-pill':{id:'spirit-pill',name:'回灵丹',price:5,kind:'pill',stackable:true,mp:6,glyph:'丹',description:'恢复 6 点法力。'},
 'mixed-pill':{id:'mixed-pill',name:'养元丹',price:3.5,kind:'pill',stackable:true,hp:7,mp:3,glyph:'丹',description:'恢复 7 点生命与 3 点法力。'},
 'qi-pill':{id:'qi-pill',name:'聚气丹',price:5,kind:'pill',stackable:true,glyph:'丹',description:'服用当天的挂机上限增加半小时；当天不可叠加。'},
 'qi-manual':{id:'qi-manual',name:'引气诀',price:10,kind:'manual',methodId:'basic-qi-guide',glyph:'诀',description:'解开三阶数阵后学会，可设为主修。'}
};
export const SHOP_ITEMS=['iron-sword','cloth-robe','qi-manual'];
export const SECT_PILLS=['small-heal-pill','spirit-pill','mixed-pill','qi-pill'];
