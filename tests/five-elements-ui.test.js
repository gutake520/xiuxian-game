import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {ITEMS,ELEMENTAL_MANUALS} from '../data/items.js';
import {TECHNIQUES} from '../data/techniques.js';
import {showBattle} from '../ui/combat.js';
import {escapeHTML} from '../ui/shared.js';

test('sect shop renders all five actual purchase buttons at 29 stones for foundation only',()=>{
 const source=readFileSync(new URL('../index.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function renderSectShop('),source.indexOf('function renderSectRoom('));
 const {document}=parseHTML('<div id="shop"></div>');const sheet=document.getElementById('shop');
 const render=Function('sectOverlay','sectHeader','currentSave','SECT_MANUALS','ITEMS','TECHNIQUES','escapeHTML','game','renderSectHall',fn+';return renderSectShop;');
 for(const realm of ['炼气十层','筑基一层']){
  render(()=>sheet,()=>'<button id="xg-sect-back"></button>',{player:{realm}},ELEMENTAL_MANUALS.map(id=>[id,ITEMS[id].methodId]),ITEMS,TECHNIQUES,escapeHTML,{},()=>{})({});
  const buttons=[...sheet.querySelectorAll('[data-sect-manual]')];assert.equal(buttons.length,realm==='筑基一层'?5:0);
  for(const button of buttons)assert.match(button.textContent,/29 灵石/);
 }
});

test('battle renders compact effect status and fractional mana disables skill controls',t=>{
 const {document}=parseHTML('<div id="xg-content"></div>');const previous=globalThis.document;globalThis.document=document;t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous});
 const s={player:{realm:'筑基一层',hp:30,mp:1.49,combat:{hp:30,mp:10,attack:5,defense:1,speed:5}},inventory:[],equipment:{},techniques:{mastered:['metal-edge'],combat:['metal-edge']},battle:{name:'测试小怪',hp:100,maxHp:100,speed:2,round:1,log:[],elements:{'metal-edge':{start:1,end:4}},skillReady:{}}};
 showBattle({getSave:()=>s,actions:{},activate:()=>{}});
 const root=document.getElementById('xg-content');assert.match(root.textContent,/攻击 \+1 · 余 3 轮/);
 assert.equal(root.querySelector('[data-fight="metal-edge"]').disabled,true);
 s.player.mp=1.5;showBattle({getSave:()=>s,actions:{},activate:()=>{}});
 assert.equal(root.querySelector('[data-fight="metal-edge"]').disabled,false);
});
