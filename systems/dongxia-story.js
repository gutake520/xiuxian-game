import {actXigongDefense} from './xigong-defense.js';
import {canEnterDongxia} from './foundation-story.js';
import {localDay} from './cultivation.js';
import {XIGONG_CHAPTERS} from '../data/dongxia-story.js';
export function findXigong(save,now=Date.now(),random=Math.random){
 if(save.dongxiaStory||!canEnterDongxia(save)||save.foundationStory?.phase!=='searched')return false;
 const day=localDay(now);if(save.xigongSearchDay===day)return false;save.xigongSearchDay=day;
 if(random()>=.2)return false;
 save.dongxiaStory={id:crypto.randomUUID(),phase:'invited',step:0,leads:[],journal:[],lastDay:null};return true;
}
export function actXigong(save,id,step,action,value,now=Date.now()){
 const q=save.dongxiaStory;if(!q||q.id!==id||q.step!==step||!canEnterDongxia(save))throw Error('手札已更新，请重新打开。');
 if(!['invited','investigating'].includes(q.phase))return actXigongDefense(save,action,value,now);
 if(action==='join'&&q.phase==='invited'){q.phase='investigating';return '你接下木牌，成为西宫家的新客卿。'}
 if(q.phase!=='investigating')throw Error('这段调查已结束。');
 if(q.lastDay===localDay(now))throw Error('今日所得已经整理，明日再来调查。');
 const chapter=XIGONG_CHAPTERS[q.step];
 if(action==='lead'){
  if(!Number.isInteger(value)||!chapter.leads[value])throw Error('请选择要追问的话。');
  if(!q.leads.includes(value))q.leads.push(value);return chapter.leads[value][1];
 }
 if(action!=='answer'||!Number.isInteger(value)||!chapter.answers[value])throw Error('请选择推断。');
 if(q.leads.length<chapter.leads.length)throw Error('还有话没有问清，先补全手头的线索。');
 if(value!==chapter.correct)return '这条推断仍有漏洞。'+chapter.reason;
 q.journal.push({step:q.step,title:chapter.title,text:chapter.after});q.lastDay=localDay(now);q.leads=[];q.step++;
 if(q.step===XIGONG_CHAPTERS.length){q.phase='attack-pending';q.nextChapter='xigong-defense';q.truthKnown=true}
 return chapter.after;
}
