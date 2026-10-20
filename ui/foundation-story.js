import {advanceFoundationStory} from '../systems/foundation-story.js';
import {escapeHTML} from './shared.js';
export function showFoundationStory({getSave,actions,activate,onDone}){
 const line=getSave().foundationStory;
 activate('map');const content=document.getElementById('xg-content');
 const ambush=line.phase==='ambush';
 content.innerHTML=`<section class="xg-map-sheet xg-battle-sheet"><h2>${ambush?'旧仇追至':'师父援手'}</h2><div class="xg-card">${ambush?'<p>筑基十层。你刚走到归元渡，前后两条山路便同时被人封住。那一夜的衣纹又出现在眼前。</p><p>「陆仁嘉送来的消息果然没错，竟让你活到了今日。」邵厉拔剑，身后同伙结阵围拢。你迎上第一轮杀招，却发现退路已经被截断。</p>':`<p>${escapeHTML(line.master.rescue)}</p><p>${escapeHTML(line.master.name)}确认你已无碍，叮嘱你小心追兵余党，随后平安返回。你察看山道，发现${escapeHTML(line.enemy.name)}逃走时留下的血迹一路延伸到栖息崖。</p>`}</div><button type="button" data-foundation-story>${ambush?'迎战':'返回地图'}</button><p role="status"></p></section>`;
 content.querySelector('[data-foundation-story]').onclick=async event=>{
  const button=event.currentTarget;button.disabled=true;
  try{await actions.mutate(advanceFoundationStory,{allowBossStory:true,allowDebt:true,message:r=>r});if(ambush)showFoundationStory({getSave,actions,activate,onDone});else onDone()}
  catch(error){content.querySelector('[role=status]').textContent=error.message;button.disabled=false}
 };
}
