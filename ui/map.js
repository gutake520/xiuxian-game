import {VISITING_SECTS,QI_MONSTERS} from '../data/locations.js';

export function createMapUI({getSave,activate}){
 const content=()=>document.getElementById('xg-content');
 function heading(title,subtitle){return `<div class="xg-map-heading"><h2>${title}</h2><p>${subtitle}</p></div>`}
 function render(){
  if(!getSave())return;
  activate('map');
  content().innerHTML=`<section class="xg-map-sheet">${heading('山河图','炼气期 · 山门与荒野')}
   <div class="xg-map-path" aria-hidden="true"><span></span><span></span><span></span></div>
   <button type="button" class="xg-map-place" data-map="sects"><span class="xg-map-peak" aria-hidden="true"></span><strong>九宗山门</strong><small>走访各宗，寻找对外的师傅与商铺</small></button>
   <button type="button" class="xg-map-place" data-map="monsters"><span class="xg-map-peak" aria-hidden="true"></span><strong>山麓妖踪</strong><small>炼气期小妖出没 · 战斗待开放</small></button>
   <div class="xg-map-place xg-map-locked"><span class="xg-map-peak" aria-hidden="true"></span><strong>云外群峰</strong><small>更高境界的地图 · 待定</small></div>
  </section>`;
  content().querySelector('[data-map="sects"]').onclick=renderSects;
  content().querySelector('[data-map="monsters"]').onclick=renderMonsters;
 }
 function back(fn){content().querySelector('.xg-map-back').onclick=fn}
 function renderSects(){
  activate('map');
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回地图</button>${heading('九宗山门','所有人都可拜访。宗门内部事务在人物页。')}
   <div class="xg-map-list">${VISITING_SECTS.map(sect=>`<button type="button" class="xg-map-visit" data-visit="${sect.id}"><span class="xg-map-peak" aria-hidden="true"></span><span><strong>${sect.name}</strong><small>${sect.service}</small></span></button>`).join('')}</div></section>`;
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
  content().innerHTML=`<section class="xg-map-sheet"><button class="xg-map-back" type="button">← 返回地图</button>${heading('山麓妖踪','炼气一至三层 · 暂不能进入战斗')}
   ${QI_MONSTERS.map(monster=>`<div class="xg-card xg-map-monster"><h3>${monster.name}</h3><p>生命 ${monster.hp} · 攻击 ${monster.attack} · 速度 ${monster.speed}</p><small>主要掉落：${monster.drop}</small></div>`).join('')}
   <p class="xg-map-pending">战斗、修为奖励与附带掉落的概率待定。</p></section>`;
  back(render);
 }
 return {render};
}
