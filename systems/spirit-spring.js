import {rootCount} from '../data/technique-slots.js';
import {addItem,ownsTechnique} from './inventory.js';
export function maybeFindSpring(save,random=Math.random){
 if(save.spiritSpring||save.springClaimed||ownsTechnique(save,'blue-buff')||![4,5].includes(rootCount(save.player))||!String(save.player.realm).startsWith('筑基')||random()>=.15)return false;
 save.spiritSpring={id:crypto.randomUUID(),phase:'ready'};return true;
}
export function springAction(save,id,action,value,now=Date.now(),random=Math.random){
 const p=save.spiritSpring;if(!p||p.id!==id||save.battle)throw new Error('当前无法听息。');
 if(action==='abandon'){delete save.spiritSpring;return {message:'你离开了灵泉。'}}
 if(action==='start'){
  if(p.phase!=='ready')throw new Error('本次已经开始。');
  p.duration=1000+Math.min(400,Math.floor(random()*401))*10;p.endsAt=now+p.duration;p.phase='running';return;
 }
 if(action==='finish'){
  if(p.phase!=='running'||now<p.endsAt)throw new Error('灵息尚未结束。');
  p.phase='guess';return;
 }
 if(action==='guess'){
  if(p.phase!=='guess')throw new Error('请先完成听息。');
  const text=String(value).trim();if(!/^\d+(\.\d{1,2})?$/.test(text)||Number(text)<1||Number(text)>5)throw new Error('请输入 1～5 秒，最多两位小数。');
  const won=Math.abs(Math.round(Number(text)*100)-p.duration/10)<=10;
  p.phase=won?'won':'lost';return {message:won?'灵泉与你的气息相合，泉底浮出一卷典籍。':'灵息错落，泉光渐渐散去。下次有缘再试。'};
 }
 if(action==='claim'){
  if(p.phase!=='won'||save.springClaimed)throw new Error('尚不能领取。');
  addItem(save,'blue-buff-manual');save.springClaimed=true;delete save.spiritSpring;return {message:'获得《你是我的蓝buff》，请在功法典籍中学习并装备。'};
 }
}
