export const NEWCOMER_REWARD=2;
export const NEWCOMER_TASKS=[
 {id:'manual',title:'求取法门',goal:'获得一部修炼功法',hint:'拜入宗门可领取《引气诀》，也可在坊市购买，散修同样可以完成。',target:'sect',action:'前往宗门',alternate:'market',alternateLabel:'去坊市购买'},
 {id:'learn',title:'初窥门径',goal:'学会一部修炼功法',hint:'人物 → 功法典籍，选择待参悟的修炼功法，完成数阵即可学会。',target:'library',action:'前往参悟'},
 {id:'main',title:'引气入体',goal:'将修炼功法设为主修',hint:'学会后还需点击「设为主修」。装备期间会自动积累修为，离线同样有效。',target:'library',action:'选择主修'},
 {id:'practice',title:'静心修行',goal:'体验五色灵境并结算一次',hint:'静室 → 五色灵境，拖动接灵台接住灵珠。不要求通关；入境消耗灵石，建议先装备主修。',target:'cultivation',action:'前往静室'},
 {id:'equipment',title:'整装待发',goal:'穿戴一件武器或防具',hint:'先在坊市购买武器或防具，再到储物中点击装备。仅买进背包不会生效。',target:'equipment',action:'准备装备',alternate:'inventory',alternateLabel:'打开储物'},
 {id:'travel',title:'初涉山河',goal:'进入妖兽山，查看一次对手',hint:'地图 → 云泽国 → 丰原镇，选择一座妖兽山查看对手属性，不要求战斗。',target:'monsters',action:'前往丰原镇'},
 {id:'chest',title:'黑市寻宝',goal:'在黑市购买一次灵匣',hint:'地图 → 云泽国 → 黑市，点击「开一匣」。无论开出什么都算完成，记得留些灵石补给。',target:'blackmarket',action:'前往黑市'},
 {id:'encounter',title:'偶逢奇缘',goal:'四处走走，触发一次奇遇',hint:'地图 → 四处走走，可到坊市、黑市或九宗山门闲逛。普通见闻不算奇遇，不要求完成奇遇小游戏。',target:'stroll',action:'四处走走'},
 {id:'pill',title:'备药傍身',goal:'在丹霞谷购买一次丹药',hint:'地图 → 云泽国 → 九宗山门 → 丹霞谷，购买任意一枚丹药即可，无需加入丹霞谷。',target:'danxia',action:'拜访丹霞谷'},
 {id:'repair',title:'修补兵刃',goal:'修复一次武器',hint:'武器经战斗损耗后，可去天工阁付费修补；天工阁弟子须学会修补传承，在宗门内自行修复。满耐久武器无需修理。',target:'repair',action:'前往修理'},
 {id:'feed',title:'照料灵兽',goal:'喂养一次灵兽',hint:'地图 → 云泽国 → 灵兽峰，选择一只异兽，用一株药草喂养。所有宗门都能参与；喂养万灵山本宗灵兽也算完成。',target:'spirit-peak',action:'前往灵兽峰'}
];
