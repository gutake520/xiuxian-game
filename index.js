const POS_KEY='xiuxian-game-fab-position';
const DB_NAME='xiuxian-game'; const DB_VERSION=1;
let currentSave=null;

function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('saves'))d.createObjectStore('saves',{keyPath:'slot'});if(!d.objectStoreNames.contains('assets'))d.createObjectStore('assets',{keyPath:'id'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function dbGet(slot){const d=await openDB();return new Promise((ok,no)=>{const r=d.transaction('saves').objectStore('saves').get(slot);r.onsuccess=()=>ok(r.result||null);r.onerror=()=>no(r.error)})}
async function dbPut(data){const d=await openDB();return new Promise((ok,no)=>{const r=d.transaction('saves','readwrite').objectStore('saves').put(data);r.onsuccess=()=>ok(data);r.onerror=()=>no(r.error)})}
const roots=[
 {name:'天灵根',desc:'天资近道，修行极快',weight:3,bonus:8},
 {name:'变异雷灵根',desc:'雷法凌厉，破境凶险',weight:7,bonus:6},
 {name:'变异冰灵根',desc:'灵息清寒，心境澄明',weight:8,bonus:5},
 {name:'双灵根',desc:'资质上佳，根基稳固',weight:22,bonus:3},
 {name:'三灵根',desc:'中人之资，胜在均衡',weight:30,bonus:1},
 {name:'四灵根',desc:'修行艰难，更需机缘',weight:20,bonus:0},
 {name:'五灵根',desc:'五行俱全，道阻且长',weight:10,bonus:-1}
];
function pickRoot(){let n=Math.random()*100;for(const x of roots){n-=x.weight;if(n<=0)return x}return roots.at(-1)}
function roll(){const root=pickRoot(),r=()=>Math.max(1,Math.min(10,Math.floor(Math.random()*7)+2+(root.bonus>4?1:0)));return{root,悟性:r(),根骨:r(),福缘:r(),神识:r(),魅力:r()}}
function newSave(name,rolled){return{slot:'auto',version:1,createdAt:Date.now(),updatedAt:Date.now(),player:{name,realm:'炼气一层',sect:'无门无派',cultivation:0,spirit:100,hp:100,mind:60,spiritRoot:rolled.root.name,rootDesc:rolled.root.desc,stats:{悟性:rolled.悟性,根骨:rolled.根骨,福缘:rolled.福缘,神识:rolled.神识,魅力:rolled.魅力}},story:{chapter:1,revenge:true,homeDestroyed:true},inventory:[],events:[]}}
async function saveNow(){if(!currentSave)return;currentSave.updatedAt=Date.now();await dbPut(currentSave)}
function renderHome(){
 const p=currentSave.player;
 document.getElementById('xg-content').innerHTML=`<div class="xg-card xg-player"><div><strong>${p.name}</strong><small>${p.sect}</small></div><em>${p.realm}</em></div>
 <div class="xg-card"><h3>⌖ 荒山古道</h3><p>故山已成焦土。你将旧门残玉收在怀中，自此踏上修行路。<br>仇人的名字尚未从世间消失，你也不会。</p></div>
 <div class="xg-card xg-stats"><h3>${p.spiritRoot}</h3><small>${p.rootDesc}</small><p>悟性 ${p.stats.悟性}　根骨 ${p.stats.根骨}　福缘 ${p.stats.福缘}<br>神识 ${p.stats.神识}　魅力 ${p.stats.魅力}</p></div>
 <div class="xg-actions"><button>打坐吐纳</button><button>寻找落脚处</button><button>打听仇家消息</button><button>随意走走</button></div>`;
}
function showPrologue(){
 let rolled=roll();
 const el=document.getElementById('xg-onboard');el.classList.add('open');
 const paint=()=>{document.getElementById('xg-roll').innerHTML=`<b>${rolled.root.name}</b><small>${rolled.root.desc}</small><p>悟性 ${rolled.悟性}　根骨 ${rolled.根骨}　福缘 ${rolled.福缘}<br>神识 ${rolled.神识}　魅力 ${rolled.魅力}</p>`};paint();
 document.getElementById('xg-reroll').onclick=()=>{rolled=roll();paint()};
 document.getElementById('xg-begin').onclick=async()=>{const name=document.getElementById('xg-name').value.trim();if(!name){document.getElementById('xg-name').focus();return}currentSave=newSave(name,rolled);await saveNow();el.classList.remove('open');renderHome()};
}
async function loadGame(){currentSave=await dbGet('auto');if(currentSave)renderHome();else showPrologue()}
function mount(){
 if(document.getElementById('xg-fab'))return;
 const fab=document.createElement('button');fab.id='xg-fab';fab.type='button';fab.title='问我';fab.innerHTML='<span class="xg-fab-moon"></span>';
 const panel=document.createElement('section');panel.id='xg-panel';panel.innerHTML=`
 <div class="xg-head"><div><b>问 我</b><small>一念成仙 · 一念为凡</small></div><button id="xg-close">×</button><div class="xg-head-moon"></div><div class="xg-mountain"><i></i><i></i><i></i></div></div>
 <main id="xg-content"></main>
 <nav><button class="on">⌂<small>主页</small></button><button>♙<small>人物</small></button><button>▣<small>储物</small></button><button>◆<small>地图</small></button><button id="xg-settings">⚙<small>设置</small></button></nav>
 <div id="xg-settings-sheet"><div class="xg-setting-title">设置<button id="xg-settings-close">×</button></div><button id="xg-save">保存到自动存档</button><button id="xg-update">检查更新</button><button id="xg-collapse">关闭面板</button><p>游戏存档保存在本机 IndexedDB。更新扩展不会主动删除存档。</p></div>
 <div id="xg-onboard"><div class="xg-prologue"><small>序 · 烬余</small><h2>山门已灭，故人无归。</h2><p>那一夜，火烧了整座山。师门上下无一幸免，唯有你从断崖下醒来。</p><p>你记得剑光，也记得仇人的衣纹。可如今的你连握剑的手都在发抖。</p><p>想报仇，先活下去。想活下去，便修行。</p><label>留下你的名字</label><input id="xg-name" maxlength="12" placeholder="输入姓名"><div id="xg-roll"></div><button id="xg-reroll">重测灵根</button><button id="xg-begin">此身入道</button></div></div>`;
 document.body.append(fab,panel);
 let moved=false,sx=0,sy=0,sl=0,st=0;const saved=JSON.parse(localStorage.getItem(POS_KEY)||'null');if(saved){fab.style.left=saved.left+'px';fab.style.top=saved.top+'px';fab.style.right='auto';fab.style.transform='none'}
 const start=e=>{moved=false;const p=e.touches?.[0]||e;sx=p.clientX;sy=p.clientY;const r=fab.getBoundingClientRect();sl=r.left;st=r.top},move=e=>{if(!sx&&!sy)return;const p=e.touches?.[0]||e,dx=p.clientX-sx,dy=p.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;if(!moved)return;e.preventDefault();fab.style.transform='none';fab.style.right='auto';fab.style.left=Math.max(4,Math.min(innerWidth-fab.offsetWidth-4,sl+dx))+'px';fab.style.top=Math.max(4,Math.min(innerHeight-fab.offsetHeight-4,st+dy))+'px'},end=()=>{if(moved){const r=fab.getBoundingClientRect(),left=r.left+r.width/2<innerWidth/2?8:innerWidth-r.width-8;fab.style.left=left+'px';localStorage.setItem(POS_KEY,JSON.stringify({left,top:r.top}))}sx=sy=0};
 fab.addEventListener('touchstart',start,{passive:true});fab.addEventListener('touchmove',move,{passive:false});fab.addEventListener('touchend',end);fab.addEventListener('pointerdown',start);window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);
 fab.onclick=()=>{if(!moved){panel.classList.add('open');fab.classList.add('hide');loadGame()}};
 const collapse=()=>{panel.classList.remove('open');document.getElementById('xg-settings-sheet').classList.remove('open');fab.classList.remove('hide')};document.getElementById('xg-close').onclick=collapse;document.getElementById('xg-collapse').onclick=collapse;
 document.getElementById('xg-settings').onclick=()=>document.getElementById('xg-settings-sheet').classList.add('open');document.getElementById('xg-settings-close').onclick=()=>document.getElementById('xg-settings-sheet').classList.remove('open');document.getElementById('xg-save').onclick=saveNow;document.getElementById('xg-update').onclick=()=>window.toastr?toastr.info('请在 SillyTavern「管理扩展」中执行 Git 更新。','问我'):alert('请在 SillyTavern 管理扩展中更新。');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();