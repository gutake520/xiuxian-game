export const ACHIEVEMENTS=[
 {id:'immortal-path',name:'踏上仙途',description:'达到筑基境界。',reward:5},
 {id:'first-sect',name:'拜师学艺',description:'第一次加入宗门。',reward:5}
];
export function syncAchievements(save){
 save.achievements??={unlocked:[],claimed:[]};
 save.achievements.unlocked??=[];save.achievements.claimed??=[];
 const unlock=id=>{if(!save.achievements.unlocked.includes(id))save.achievements.unlocked.push(id)};
 if(save.player.sect&&save.player.sect!=='无门无派')unlock('first-sect');
 if(/筑基|金丹|元婴|化神|炼虚|合体|大乘|渡劫|人仙|地仙|天仙|真仙|金仙/.test(String(save.player.realm||'')))unlock('immortal-path');
 return save.achievements;
}
export function claimAchievement(save,id){
 const state=syncAchievements(save),item=ACHIEVEMENTS.find(a=>a.id===id);
 if(!item||!state.unlocked.includes(id))throw new Error('尚未达成此成就。');
 if(state.claimed.includes(id))throw new Error('此奖励已领取。');
 state.claimed.push(id);save.player.spiritStones=Math.round((save.player.spiritStones+item.reward)*100)/100;
 return `成就「${item.name}」：灵石 +${item.reward}。`;
}
