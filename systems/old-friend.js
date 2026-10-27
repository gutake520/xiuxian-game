import {OLD_FRIEND_CHAPTERS,OLD_FRIEND_REACTIONS,OLD_FRIEND_REPORTS} from '../data/old-friend.js';
import {SECT_MASTERS} from '../data/masters.js';
import {realmProgress} from '../data/realms.js';
import {addItem,equipmentStats} from './inventory.js';
export const OLD_FRIEND_CHANCE=.2;
export const oldFriendState=save=>save.oldFriend?.sect===save.player.sect&&SECT_MASTERS[save.player.sect]?save.oldFriend:null;
export const oldFriendEligible=save=>Boolean(SECT_MASTERS[save.player.sect]&&(save.masterTeaching?.qiCompleted||0)>=3&&(realmProgress(save.player).index>=10||/金丹|元婴/.test(save.player.realm)));
export function startOldFriend(save,now=Date.now()){
 if(!oldFriendEligible(save)||save.masterTeaching?.task||save.battle)throw new Error('须完成三次炼气授业，并达到筑基期。');
 if(oldFriendState(save))return '师父的嘱托仍记在手札中。';
 save.oldFriend={id:crypto.randomUUID(),version:1,sect:save.player.sect,master:SECT_MASTERS[save.player.sect].name,step:0,phase:'ready',choices:[],flags:{},journal:[],startedAt:now};
 return '师父取出一封旧信，与你谈起故人之子。';
}
export function oldFriendGoal(save){const q=oldFriendState(save);if(!q)return '';if(q.phase==='done')return q.reportedAt!=null?'此间旧事已了，重逢留待来日。':'回宗门「师尊授业」复命，将江既白的去向告诉师父。';if(q.phase==='after')return '阅读方才发生的事，继续查访。';if(q.phase==='duel')return '前往望川岭·照夜台，继续与江既白交手。';const place=OLD_FRIEND_CHAPTERS[q.step].place;return q.phase==='search'?`前往${place==='monsters'?'丰原镇':'望川岭'}「四处走走」，打听消息。`:place==='master'?'回宗门「师尊授业」，与师父交谈。':place==='ruins'?'前往望川岭·照夜台，赴这一场相见。':'消息已有眉目，打开手札继续。'}
export function maybeFindOldFriend(save,place,random=Math.random){
 const q=oldFriendState(save);if(!q||q.phase!=='search'||OLD_FRIEND_CHAPTERS[q.step].place!==place||random()>=OLD_FRIEND_CHANCE)return null;
 q.phase='ready';return {kind:'old-friend',text:`故人之子 · ${OLD_FRIEND_CHAPTERS[q.step].title}：你寻得了新的线索。打开手札，听完这一段往事。`};
}
function nextPhase(q){if(q.step>=8){q.phase='done';return}q.phase=['monsters','foundation'].includes(OLD_FRIEND_CHAPTERS[q.step].place)?'search':'ready'}
function requireQuest(save,id){const q=oldFriendState(save);if(!q||q.id!==id)throw new Error('这段师门旧事已经结束或失效。');if(save.battle||save.qiSecret||save.qiMeditation)throw new Error('请先结束当前行动。');return q}
export function oldFriendChoiceReason(save,choice){const q=oldFriendState(save),f=q?.flags||{};
 if(choice==='private'&&!f.token)return '需要师父的信物';
 if(choice==='broker'&&save.player.spiritStones<3)return '需要 3 灵石';
 if(choice==='pay'&&save.player.spiritStones<5)return '需要 5 灵石';
 if(choice==='talisman'&&!save.inventory.some(e=>['old-friend-ward','guard-talisman'].includes(e.itemId)))return '需要一张护身符';
 if(choice==='custody'&&!f.guarantee)return '需要师父出具担保';
 return '';
}
function ending(q,choice,now){
 const f=q.flags,truth=f.truth&&!f.reported,canReach=f.trust>=1&&truth&&(f.testimony||f.notes);
 const early=choice==='mend'?canReach&&(f.repair||f.letter||f.guarantee):choice==='protect'?canReach:choice==='custody'?truth&&f.guarantee&&(f.testimony||f.notes):false;
 const reason=early?'reconciliation':choice==='destroy'?'forced-farewell':f.hidden?'concealed-truth':f.reported?'public-pursuit':!f.testimony&&!f.notes?'missing-evidence':'unresolved-distance';
 q.followup={version:1,characterId:'jiang-jibai',route:early?'golden-core':'nascent-soul',reunionRealm:early?'金丹':'元婴',locationId:early?'dongxia':null,status:'reserved',reason,master:q.master,sect:q.sect,choices:q.choices.map(x=>({...x})),flags:{...f},completedAt:now};
 const resolution=choice==='destroy'?'你击碎了阵眼。那声乳名断在半途，江既白伸出的手停在空中。他没有再与你争，只一点点收拢五指。':choice==='custody'?'你举起师父的担保，站到江既白与追捕者之间。印信拦住了刀剑，却不能替他撤销罪责。他看了你许久，终于自己放下了旧玉。':early?'江既白将手从旧玉上移开，接住你递来的阵线。最后一道缺口合拢时，那身影仍温柔地喊他回家。他低下头，很轻地答了一声：「知道了，爹。」':f.hidden?'江既白抱住旧玉，仍说父亲没有做错过什么。你藏起的那一页，如今成了你无法越过的距离。你护住山道，他却借着暮色走远。':'江既白终于撤去了牵引残影的魔气，却没有接过你伸来的手。阵光慢慢熄灭，你们站得很近，中间却隔着一路走来未能说清的话。';
 const aftermath=f.witness?'山下，获救的采药人愿意讲出自己见过的事。那份证词没有替江既白赦罪，只让追问不再从「弑父」开始。':f.wounded?'山下的采药人仍需拄杖走路。江既白路过时停了一会儿，没得到原谅，也没有资格催人原谅。':'旧阵的伤亡被重新记下。死去的人没有因为真相浮现便回来，活着的人也仍有自己的账要算。';
 const debt=f.debtPaid?'药铺的欠账上，留下了你代付的记号。':f.debtPromised?'药师仍留着欠账，等一个人亲自走进门来。':'药铺关了半扇门，药师没有为这件旧事再作证。';
 const goodbye=early?'数日后，你在山口见到江既白。他换了干净衣裳，腕间的魔纹仍在，手里却不再抱着那枚会说话的玉。\n\n「该还的，我会还。」他说父亲留下的禁法抄自东夏国，他要去问清来历，也要学会如何带着这身魔气活下去。\n\n风吹开他的袖口，露出一截系旧玉的红绳。他没有藏。\n\n「这回不躲了。」江既白望向你，第一次把告别说成一个约定。\n\n「东夏国见。」':'后来，你在离山的小路上又见过江既白一次。他站在树影里，像等你，又像只是累了，在那里歇脚。\n\n你问他往哪里去。他看了一眼天色，没有回答。你们各自有一句话停在嘴边，谁也没能先说出口。\n\n临走时，他替你拨开了挡路的枯枝。那动作太平常，反而让你一时忘了，此后或许很久都不会再相见。\n\n「山水长远。」他轻声道。\n\n「有缘再见。」';
 return resolution+'\n\n'+aftermath+'\n\n'+debt+'\n\n'+goodbye;
}
export function oldFriendScene(save){const q=oldFriendState(save);if(!q)return '';if(q.phase==='after'||q.phase==='done')return q.lastText||'';const chapter=OLD_FRIEND_CHAPTERS[q.step];let text=chapter.scene.replaceAll('{master}',q.master);if(q.step===6){text+='\n\n'+(q.flags.pursuit?'山道下火光晃动。你先前放出去的消息，已经把追捕者带到了这里。':'山道上暂时无人追来。你们还有一点不必提高声音说话的时间。');if(q.flags.letter)text+='\n\n师父的信递到他手里。他翻到署名处，指尖停了很久。';if(q.flags.hidden)text+='\n\n你递出的旧录少了一页。江既白没有察觉。'}return text}
export function chooseOldFriend(save,id,step,choice,context,now=Date.now()){
 const q=requireQuest(save,id);if(q.phase!=='ready'||q.step!==step)throw new Error('这一段选择已经改变，请重新打开手札。');
 const chapter=OLD_FRIEND_CHAPTERS[step];if(chapter.place!==context)throw new Error('请前往手札指引的地点。');
 if(!chapter.choices.some(([key])=>key===choice))throw new Error('没有这个选择。');const reason=oldFriendChoiceReason(save,choice);if(reason)throw new Error(reason);
 const f=q.flags;f.trust??=0;
 if(choice==='broker')save.player.spiritStones=Math.round((save.player.spiritStones-3)*100)/100;
 if(choice==='pay')save.player.spiritStones=Math.round((save.player.spiritStones-5)*100)/100;
 if(choice==='bring')addItem(save,'old-friend-ward');
 if(choice==='talisman'){const e=save.inventory.find(e=>e.itemId==='old-friend-ward')||save.inventory.find(e=>e.itemId==='guard-talisman');if(e.quantity>1)e.quantity--;else save.inventory=save.inventory.filter(x=>x!==e)}
 if(choice==='listen'){f.token=true;f.trust++}if(choice==='judge')f.repair=true;
 if(['public','broker'].includes(choice))f.pursuit=true;
 if(choice==='private')f.trust++;
 if(['pay','promise'].includes(choice)){f.testimony=true;f.trust++;f.debtPaid=choice==='pay';f.debtPromised=choice==='promise'}
 if(choice==='force')f.trust--;
 if(['rescue','talisman'].includes(choice)){f.witness=true;f.testimony=true;f.trust++}
 if(['pursue','talisman'].includes(choice)){f.notes=true;f.repair=true}if(choice==='pursue')f.wounded=true;
 if(choice==='truth')f.truth=true;if(choice==='hide'){f.hidden=true;f.trust++}if(choice==='report'){f.reported=true;f.pursuit=true;f.trust--}
 if(choice==='letter'){f.letter=true;f.trust++}if(choice==='guarantee')f.guarantee=true;
 if(choice==='talk')f.trust++;if(choice==='subdue')f.trust--;if(choice==='soul'){f.promisedSoul=true;f.trust++}
 q.choices.push({step,choice});q.lastText=step===7?ending(q,choice,now):OLD_FRIEND_REACTIONS[choice];q.journal.push({title:chapter.title,choice:chapter.choices.find(x=>x[0]===choice)[1],text:q.lastText});
 if(choice==='subdue'){q.phase='duel';return '江既白拔剑护住旧玉。前往照夜台，完成这场交锋。'}
 q.step++;q.phase='after';return '你的选择已经记入手札。';
}
export function continueOldFriend(save,id){const q=requireQuest(save,id);if(q.phase!=='after')throw new Error('当前没有待继续的片段。');nextPhase(q);return oldFriendGoal(save)}
export function startOldFriendDuel(save,id){
 const q=requireQuest(save,id);if(q.phase!=='duel'||q.step!==6)throw new Error('此处没有待进行的交锋。');if(save.player.hp<=0)throw new Error('请先恢复生命。');
 save.battle={id:crypto.randomUUID(),kind:'old-friend-duel',questId:q.id,monsterId:null,name:'江既白',stage:'筑基',foundationBalanceVersion:1,maxHp:32,hp:32,attack:5.5,defense:.5,speed:4,mp:0,maxMp:0,critRate:0,dodgeRate:0,round:0,pet:null,guard:false,bindRounds:[],arrayRound:0,talismansUsed:0,talismanRound:0,skillReady:{},entryHp:save.player.hp,entryMp:save.player.mp,log:['江既白只守着旧玉，并未追击要害。此战不取性命，无战利品；败退后可再来。']};return save.battle;
}
export function finishOldFriendDuel(save,outcome){
 const b=save.battle,q=oldFriendState(save);if(b?.kind!=='old-friend-duel')throw new Error('不在这场交锋中。');
 const stats=equipmentStats(save);save.player.hp=Math.min(b.entryHp,stats.maxHp);save.player.mp=Math.min(b.entryMp,stats.maxMp);
 if(outcome==='victory'&&q?.id===b.questId&&q.phase==='duel'){q.lastText+='\n\n你压住他的剑，先松开了束缚。「现在可以听你说了。」他护住旧玉，许久才低声说起那场没有救回父亲的夜。';q.journal.at(-1).text=q.lastText;q.step=7;q.phase='after'}
 save.lastBattle={id:b.id,kind:b.kind,monster:b.name,monsterId:null,outcome,round:b.round,rewards:[],xp:0,cost:'交锋未取性命，恢复入场生命与法力',log:[outcome==='victory'?'交锋止息，返回照夜台继续交谈。':'江既白收剑退回旧阵。你可以调息后再来。']};save.battle=null;return save.lastBattle;
}
// Future chapters consume this reservation; they must not recreate or overwrite it.
export function oldFriendReunion(save,realm){const q=oldFriendState(save);return q?.phase==='done'&&q.followup?.reunionRealm===realm?structuredClone(q.followup):null}

export function reportOldFriend(save,id,context,now=Date.now()){
 const q=requireQuest(save,id);
 if(context!=='master')throw new Error('请回宗门「师尊授业」向师父复命。');
 if(q.phase!=='done'||!q.followup)throw new Error('请先走完望川岭的旧事。');
 if(q.reportedAt!=null)throw new Error('已经向师父复命，可在手札重读。');
 const scene=OLD_FRIEND_REPORTS[q.followup.route];
 if(!scene)throw new Error('这段旧事尚无可复命的结局。');
 q.reportedAt=now;q.reportTitle=scene.title;q.lastText=scene.text.replaceAll('{master}',q.master);
 q.journal.push({title:scene.title,choice:'回宗门，向师父复命',text:q.lastText});
 return '师父听完了你的复命。这一卷旧事，至此暂告一段落。';
}
