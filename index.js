const ID='xiuxian-game';
const POS_KEY='xiuxian-game-fab-position';

function mount(){
 if(document.getElementById('xg-fab')) return;
 const fab=document.createElement('button'); fab.id='xg-fab'; fab.type='button'; fab.innerHTML='<span>道</span>'; fab.title='问道';
 const panel=document.createElement('section'); panel.id='xg-panel'; panel.innerHTML=`
 <div class="xg-head"><div><b>问 道</b><small>一念成仙 · 一念为凡</small></div><button id="xg-close" aria-label="收起">×</button></div>
 <div class="xg-moon"></div><div class="xg-mountain"><i></i><i></i><i></i></div>
 <div class="xg-card xg-player"><div><strong>秦无尘</strong><small>太清宗 · 内门弟子</small></div><em>金丹中期</em></div>
 <div class="xg-card"><h3>⌖ 太清宗</h3><p>山门寂静，暮钟三响。<br>今日天色清朗，似乎并无大事。</p></div>
 <div class="xg-actions"><button>闭关修炼</button><button>前往坊市</button><button>拜访师尊</button><button>随意走走</button></div>
 <nav><button class="on">⌂<small>主页</small></button><button>♙<small>人物</small></button><button>▣<small>储物</small></button><button>◆<small>地图</small></button><button id="xg-settings">⚙<small>设置</small></button></nav>
 <div id="xg-settings-sheet"><div class="xg-setting-title">设置 <button id="xg-settings-close">×</button></div>
 <button id="xg-update">检查更新</button><button id="xg-collapse">关闭面板</button>
 <p>更新由 SillyTavern 的 Git 扩展管理机制负责；此处先保留入口。</p></div>`;
 document.body.append(fab,panel);

 let moved=false,sx=0,sy=0,sl=0,st=0;
 const saved=JSON.parse(localStorage.getItem(POS_KEY)||'null');
 if(saved){fab.style.left=saved.left+'px';fab.style.top=saved.top+'px';fab.style.right='auto'}
 const start=e=>{moved=false;const p=e.touches?.[0]||e;sx=p.clientX;sy=p.clientY;const r=fab.getBoundingClientRect();sl=r.left;st=r.top};
 const move=e=>{if(!sx&&!sy)return;const p=e.touches?.[0]||e;let dx=p.clientX-sx,dy=p.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;if(!moved)return;e.preventDefault();fab.style.right='auto';fab.style.left=Math.max(4,Math.min(innerWidth-fab.offsetWidth-4,sl+dx))+'px';fab.style.top=Math.max(4,Math.min(innerHeight-fab.offsetHeight-4,st+dy))+'px'};
 const end=()=>{if(moved){const r=fab.getBoundingClientRect();const left=r.left+r.width/2<innerWidth/2?8:innerWidth-r.width-8;fab.style.left=left+'px';localStorage.setItem(POS_KEY,JSON.stringify({left,top:r.top}));}sx=sy=0};
 fab.addEventListener('touchstart',start,{passive:true});fab.addEventListener('touchmove',move,{passive:false});fab.addEventListener('touchend',end);
 fab.addEventListener('pointerdown',start);window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);
 fab.addEventListener('click',()=>{if(!moved){panel.classList.add('open');fab.classList.add('hide')}});
 const collapse=()=>{panel.classList.remove('open');document.getElementById('xg-settings-sheet').classList.remove('open');fab.classList.remove('hide')};
 document.getElementById('xg-close').onclick=collapse;document.getElementById('xg-collapse').onclick=collapse;
 document.getElementById('xg-settings').onclick=()=>document.getElementById('xg-settings-sheet').classList.add('open');
 document.getElementById('xg-settings-close').onclick=()=>document.getElementById('xg-settings-sheet').classList.remove('open');
 document.getElementById('xg-update').onclick=()=>{ if(window.toastr) toastr.info('请在 SillyTavern「管理扩展」中执行 Git 更新。这里之后接原生更新接口。','问道'); else alert('请在 SillyTavern 的“管理扩展”中更新此扩展。'); };
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount); else mount();
