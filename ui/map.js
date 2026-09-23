import {VISITING_SECTS,QI_MONSTERS} from '../data/locations.js';
import {showBattle} from './combat.js';

export function createMapUI({getSave,activate,actions}){
 const content=()=>document.getElementById('xg-content');
 const battle=outcome=>showBattle({getSave,activate,actions,onExit:renderMonsters},outcome);
 function heading(title,subtitle){return `<div class="xg-map-heading"><h2>${title}</h2><p>${subtitle}</p></div>`}
 const peaks=(locations,kind)=>`<div class="xg-map-landscape xg-map-${kind}">${locations.map((place,i)=>`<button type="button" class="xg-map-hill${place.locked?' xg-map-locked':''}" style="--hill-x:${place.x}%;--hill-y:${place.y}%;--hill-size:${place.size||1}" ${place.locked?'disabled':''} ${place.id?`data-${kind}="${place.id}"`:''}><span class="xg-map-label">${place.name}</span><span class="xg-map-summit" aria-hidden="true"></span></button>`).join('')}</div>`;
 function render(){
  if(!getSave())return;
  if(getSave().battle)return battle();
  activate('map');
  content().innerHTML=`<section class="xg-map-sheet">${heading('山河图','点一座山，走一段路。')}${peaks([
   {name:'远山 · 待定',x:12,y:6,locked:true,size:.8},{name:'远山 · 待定',x:68,y:17,locked:true,size:.76},
   {name:'远山 · 待定',x:36,y:37,locked:true,size:.85},{name:'九宗山门',id:'sects',x:8,y:69,size:1.08},
   {name:'炼气山',id:'monsters',x:64,y:62,size:1.04}
  ],'map')}</section>`;
  content().querySelector('[data-map="sects"]').onclick=renderSects;
  content().querySelector('[data-map="monsters"]').onclick=renderMonsters;
 }
 function back(fn){content().querySelector('.xg-map-back').onclick=fn}
 function renderSects(){
  activate('map');
  const spots=[[3,3],[58,5],[30,18],[70,30],[8,36],[42,49],[2,65],[63,67],[28,78]];
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回地图</button>${heading('九宗山门','拜访各宗；本宗内部事务在人物页。')}
   ${peaks(VISITING_SECTS.map((sect,i)=>({name:sect.name,id:sect.id,x:spots[i][0],y:spots[i][1],size:.79})), 'visit')}</section>`;
  back(render);
  content().querySelectorAll('[data-visit]').forEach(button=>button.onclick=()=>renderVisit(button.dataset.visit));
 }
 function renderVisit(id){
  const sect=VISITING_SECTS.find(item=>item.id===id);if(!sect)return renderSects();
  const own=getSave()?.player?.sect===sect.name;
  activate('map');
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回九宗</button>${heading(sect.name,sect.service)}
   <div class="xg-map-place xg-map-scene"><span class="xg-map-peak" aria-hidden="true"></span><strong>${sect.npc}</strong><p>${sect.id==='tiangong'&&own?'“你也是天工阁的人？自己的装备，自己去修。”':`“来者是客，欢迎到${sect.name}坐坐。”`}</p></div>
   <div class="xg-card"><h3>${sect.service}</h3><p>${sect.detail}</p><small class="xg-map-pending">具体操作将在对应物品与战斗功能开放后接入。</small></div>
  </section>`;
  back(renderSects);
 }
 function renderMonsters(){
  activate('map');
  const spots=[[9,4],[58,2],[31,19],[75,29],[4,38],[44,47],[15,68],[66,72]];
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回地图</button>${heading('炼气山','山头各异，遭遇分布待定。')}
   ${peaks(spots.map(([x,y],i)=>({name:`山头 ${i+1}`,id:String(i+1),x,y,size:.77})), 'encounter')}</section>`;
  content().querySelectorAll('[data-encounter]').forEach(button=>button.onclick=()=>renderEncounter(button.dataset.encounter));
  back(render);
 }
 function renderEncounter(number){
  if(getSave().battle)return battle();
  activate('map');
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回炼气山</button>${heading(`山头 ${number}`,'炼气一至三层 · 小妖出没')}
   ${QI_MONSTERS.map(monster=>`<div class="xg-card xg-map-monster"><h3>${monster.name}</h3><p>生命 ${monster.hp} · 攻击 ${monster.attack} · 速度 ${monster.speed}</p><small>主要掉落：${monster.drop}</small><button type="button" data-foe="${monster.id}">迎战</button></div>`).join('')}
   <p class="xg-map-pending">胜利可获修为和战利品；退出战斗须支付代价。</p><p role="status" aria-live="polite"></p></section>`;
  back(renderMonsters);
  const status=content().querySelector('[role=status]');
  content().querySelectorAll('[data-foe]').forEach(button=>button.onclick=async()=>{
   content().querySelectorAll('[data-foe]').forEach(item=>item.disabled=true);
   try{await actions.startBattle(button.dataset.foe);battle()}
   catch(error){status.textContent=error.message;content().querySelectorAll('[data-foe]').forEach(item=>item.disabled=false)}
  });
 }
 return {render};
}
