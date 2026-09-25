import {hasActiveTechnique} from '../data/techniques.js';

export function selectBattlePet(save,pet){
 if(pet===null)return null;
 if(!['attack','guard'].includes(pet))throw new Error('灵兽类型无效。');
 if(!(save.spiritBeast&&hasActiveTechnique(save,'beast-keeper'))){
  if((save.petRentals||0)<1)throw new Error('尚未租借灵兽。');
  save.petRentals--;
 }
 return pet;
}
