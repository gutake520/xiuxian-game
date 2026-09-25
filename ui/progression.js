import {renderInventory} from './inventory.js';
import {showCultivation} from './cultivation.js';
import {techniqueLibrary} from './techniques.js';
import {realmProgress} from '../data/realms.js';
import {format} from './shared.js';
export function progressMarkup(player){const p=realmProgress(player),value=p.required?Math.max(0,Math.min(100,p.current/p.required*100)):p.complete?100:0;return `<div class="xg-cultivation"><span>修为</span><strong>${player.realm==='筑基一层'?player.realm:`${format(p.current)} / ${p.required??'—'}`}</strong></div><div class="xg-progress" role="progressbar" aria-label="修为进度" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100"><i style="width:${value}%"></i></div><div class="xg-cultivation"><span>灵石</span><strong>${format(player.spiritStones)}</strong></div>`}
export function createFeatureUI(base){
 let cleanup=null;
 const api={...base,setCleanup(fn){cleanup=fn},closeFeature(){cleanup?.();cleanup=null;document.getElementById('xg-feature-sheet')?.remove()}};
 return{close:api.closeFeature,isPlaying:()=>Boolean(cleanup),inventory:()=>renderInventory(api),cultivation:()=>showCultivation(api,()=>{api.closeFeature();base.character()}),library:()=>techniqueLibrary(api,()=>{api.closeFeature();base.character()})};
}
