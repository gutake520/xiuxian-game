import {awardItem} from './inventory.js';
import {localDay} from './cultivation.js';

export const QI_EXPLORATION_MS=3*60*1000;
export const QI_SCENES=[
 '山雾散开，你踩着潮湿的石阶继续前行。',
 '一只白鹤掠过林梢，落下半片羽毛。',
 '你在断崖边发现旧剑痕，剑主早已不知去向。',
 '小路被藤蔓遮住，你绕过山石找到出口。',
 '远处传来兽吼，走近却只见摇晃的树影。',
 '你遇到一条河，蛇妖从水里扑来；你将它击退，继续赶路。',
 '溪水清凉，你洗去手上的泥，继续向山深处走。',
 '一块石碑只剩半句刻文，你记下残存的字。',
 '山风吹灭了你手里的灯，前方却浮起点点萤光。',
 '一只灵鼠偷看你，见你靠近便钻进石缝。',
 '你听见有人唱歌，绕过山坳，声音又消失了。',
 '古桥摇摇欲坠，你放轻脚步走到了对岸。',
 '落叶下藏着浅坑，你及时收脚，没有摔下去。',
 '洞口有新鲜的爪印，你没有惊扰里面的住客。',
 '你跟着一串发光的足迹走了片刻，足迹在石壁前中断。',
 '薄雾里闪过一盏青灯，你追过去，只见一截枯枝。',
 '山泉突然转急，你攀住岸边的树根站稳。',
 '一群小妖正在争吵，你趁它们没发现悄悄绕开。',
 '你从倒下的树干上跨过，树下长着细小的灵草。',
 '有人在石洞里留下火堆，余烬尚有一点温度。',
 '地面忽然轻震，你退到安全的石台上等它平息。',
 '一缕药香从风里飘过，你循着香气走入密林。',
 '你遇到一只受伤的小鹿，它看了你一眼，钻回林中。',
 '枯井里传来回声，你探头看去，只见一轮倒映的月。',
 '崖壁上有前人系下的绳索，你借它越过陡坡。',
 '两条小径在此分叉，你选了有流水声的一条。',
 '一场骤雨浸透衣袖，你躲进山洞等云散开。',
 '石缝中透出微光，你拨开草丛，发现一条窄路。',
 '夜色将近，远处的萤火引你避开了泥潭。',
 '你走到秘境尽头，身后的山路渐渐隐入雾中。'
];
const HERBS=['healing-herb','spirit-herb','qi-herb'];
const herb=()=>HERBS[Math.floor(Math.random()*HERBS.length)];
function pickScenes(){const pool=QI_SCENES.map((_,i)=>i),selected=[];for(let i=0;i<3;i++)selected.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);return selected}

export function startQiExploration(save,now=Date.now()){
 if(save.qiSecret)throw new Error('秘境探索尚未结束。');
 if(save.qiSecretDay===localDay(now))throw new Error('今天已经探索过秘境，明天再来。');
 if(save.player.spiritStones<1)throw new Error('灵石不足，无法探索秘境。');
 const chance=Math.random(),reward=chance<.9?{stones:1,ore:1,herb:herb(),herbCount:1}:chance<.99?(Math.random()<.5?{stones:1,ore:1}:{stones:1,herb:herb(),herbCount:1}):{stones:2,ore:2,herb:herb(),herbCount:2};
 save.player.spiritStones=Math.round((save.player.spiritStones-1)*100)/100;
 save.qiSecretDay=localDay(now);
 save.qiSecret={startedAt:now,endsAt:now+QI_EXPLORATION_MS,scenes:pickScenes(),reward};
 return '你付出 1 灵石，踏入秘境。接下来三分钟只能继续探索。';
}
export function finishQiExploration(save,now=Date.now()){
 const pending=save.qiSecret;if(!pending)throw new Error('没有正在进行的秘境探索。');
 if(now<pending.endsAt)throw new Error('探索尚未结束。');
 const {reward}=pending,rewards=[`灵石×${reward.stones}`];
 save.player.spiritStones=Math.round((save.player.spiritStones+reward.stones)*100)/100;
 for(const [id,quantity] of [['ore',reward.ore],[reward.herb,reward.herbCount]]){
  if(!id||!quantity)continue;
  const place=awardItem(save,id,quantity,now),name=id==='ore'?'矿石':({'healing-herb':'回血草','spirit-herb':'回灵草','qi-herb':'聚气草'})[id];
  rewards.push(`${name}×${quantity}${place==='temporary'?'（临时储物）':''}`);
 }
 const result=`秘境所得：${rewards.join('、')}。`;
 save.lastQiExploration={completedAt:now,result,scenes:pending.scenes};
 save.qiSecret=null;
 return result;
}
