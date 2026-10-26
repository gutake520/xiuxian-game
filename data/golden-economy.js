// 金丹初期物价；出售价值按对应筑基品×1.5，保留两位小数。
const r=v=>Math.round((v+Number.EPSILON)*100)/100;
export const GOLDEN_VALUE_SCALE=1.5;
export const GOLDEN_PILLS=['golden-heal-pill','golden-spirit-pill','golden-mixed-pill','golden-qi-pill'];
export const GOLDEN_SHOP=['golden-sword','golden-robe','golden-shoes',...GOLDEN_PILLS];
export const GOLDEN_ITEMS={};
function item(id,name,rest){GOLDEN_ITEMS[id]={id,name,stage:'金丹',...rest}}
for(const [id,name] of [['healing-herb','赤髓芝'],['spirit-herb','玉露花'],['qi-herb','凝元叶'],['ore','赤金矿']])item('golden-'+id,name,{kind:'material',stackable:true,glyph:id==='ore'?'矿':'草',description:'金丹炼丹、炼器材料。'});
for(const [suffix,name,hp,mp,price] of [['heal-pill','赤髓丹',27,0,6.75],['spirit-pill','玉露丹',0,13.5,6.75],['mixed-pill','和元丹',15.75,6.75,5.25]])item('golden-'+suffix,name,{kind:'pill',stackable:true,glyph:'丹',hp,mp,price:r(price*1.5),description:`恢复${hp?` ${hp} 点生命`:''}${hp&&mp?'与':''}${mp?` ${mp} 点法力`:''}。`});
for(const [suffix,name,slot,stats] of [['sword','赤霄剑','weapon',{attack:4}],['robe','凝霞衣','armor',{defense:2}],['shoes','踏云履','shoes',{speed:5}]])item('golden-'+suffix,name,{kind:'equipment',slot,...stats,price:27,resaleValue:6.75,glyph:slot==='weapon'?'剑':slot==='armor'?'衣':'履',description:slot==='weapon'?'攻击 +4。':slot==='armor'?'防御 +2。':'速度 +5。'});
item('golden-wild-sword','裂霄剑',{kind:'equipment',slot:'weapon',attack:4,stunChance:.1,resaleValue:r(3.75*1.5),glyph:'剑',description:'攻击 +4；先手命中时可能震慑敌人。'});
item('golden-wild-robe','护丹甲',{kind:'equipment',slot:'armor',defense:2,dodgeRate:3,resaleValue:r(3.75*1.5),glyph:'甲',description:'防御 +2，闪避率 +3个百分点。'});
for(const [suffix,name,slot,stats] of [['hp-charm','养命佩','accessoryVital',{hp:8}],['mp-charm','蓄元佩','accessoryVital',{mp:4.5}],['crit-charm','锐意佩','accessoryFate',{critRate:15}],['dodge-charm','游云佩','accessoryFate',{dodgeRate:15}]])item('golden-'+suffix,name,{kind:'equipment',slot,...stats,resaleValue:6.75,glyph:'佩',description:Object.entries(stats).map(([key,value])=>`${{hp:'生命上限',mp:'法力上限',critRate:'暴击率',dodgeRate:'闪避率'}[key]} +${value}${key.endsWith('Rate')?'个百分点':''}`).join('，')+'。'});
export const GOLDEN_RECIPES={
 'golden-heal-pill':{'golden-healing-herb':5},
 'golden-spirit-pill':{'golden-spirit-herb':5},
 'golden-mixed-pill':{'golden-healing-herb':2,'golden-spirit-herb':1}
};

item('golden-qi-pill','凝元丹',{kind:'pill',stackable:true,glyph:'丹',price:11.25,description:'当天挂机上限增加67.5分钟；与其他挂机丹每日共用一次机会。金丹后续修炼尚未开放。'});
item('golden-vital-pill','固元丹',{kind:'pill',stackable:true,glyph:'丹',description:'一小时生命上限+13、法力上限+4，服用时当前值同步增加；两小时可服一枚，仅本宗金丹传承自炼自用。'});
item('golden-attack-talisman','裂金符',{kind:'talisman',stackable:true,glyph:'符',damage:8,description:'额外造成8点伤害。'});
item('golden-dual-talisman','金罡符',{kind:'talisman',stackable:true,glyph:'符',damage:8,guard:true,description:'造成8点伤害并免疫下一次伤害；每日限制作一张。'});
GOLDEN_RECIPES['golden-qi-pill']={'golden-qi-herb':5};
GOLDEN_RECIPES['golden-vital-pill']={'golden-healing-herb':2,'golden-spirit-herb':1,'golden-qi-herb':1};
