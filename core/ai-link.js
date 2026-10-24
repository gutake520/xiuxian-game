import {ITEMS,SHOP_ITEMS} from '../data/items.js';
import {TECHNIQUES} from '../data/techniques.js';
import {equipmentStats,purchase,equipItem,usePill} from '../systems/inventory.js';
import {setMainTechnique} from '../systems/techniques.js';
import {playRound,fleeBattle} from '../systems/combat.js';
import {startQiExploration,startFoundationExploration,finishQiExploration} from '../systems/exploration.js';
import {foundationStoryPending} from '../systems/foundation-story.js';
import {encodeBackup} from '../storage/backup.js';
const PROMPT='xiuxian-game-ai',BACKUP='xiuxian-game-before-ai-';
const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o?.[k]!==undefined).map(k=>[k,o[k]]));
export const snapshotKey=s=>JSON.stringify(s);
export function visibleState(s){
 if(!s)return {message:'尚未选择存档'};
 return {slot:s.slot,player:pick(s.player,['name','realm','sect','spiritRoot','stats','hp','mp','cultivation','spiritStones']),combat:equipmentStats(s),
 inventory:s.inventory.map(e=>({...pick(e,['uid','itemId','quantity','durability']),name:ITEMS[e.itemId]?.name,description:ITEMS[e.itemId]?.description})),equipment:s.equipment,
 techniques:{main:s.techniques.main,combat:s.techniques.combat,mastered:s.techniques.mastered.map(id=>({id,name:TECHNIQUES[id]?.name,description:TECHNIQUES[id]?.description}))},
 location:s.world?.location,battle:s.battle?pick(s.battle,['name','hp','maxHp','mp','maxMp','attack','defense','speed','round','skillReady','log']):null,
 exploration:s.qiSecret?{endsAt:s.qiSecret.endsAt}:null,
 note:'主动修炼是实时打砖块，基础版不代玩。装备已学会的主修功法后，挂机按原规则自动积累修为。剧情、奇遇和小游戏交由玩家。'};
}
function blocked(s){return Boolean(s.practiceSession||s.breakthrough||s.traitorPuzzle||s.peakPuzzle||s.stroll||s.strollExtra||s.encounterPending||s.divinationPending||s.yanEncounterPending||s.yanAftermath||s.seniorRewardPending||s.qiMeditation||s.bossLine?.phase==='ambush'||s.bossLine?.rescuePending||foundationStoryPending(s))}
export function choices(s){
 if(!s||blocked(s))return [];
 if(s.qiSecret)return Date.now()>=s.qiSecret.endsAt?[{id:'finish-exploration',label:'领取已完成的秘境探索'}]:[];
 if(s.battle)return [{id:'battle:attack',label:'普通攻击'},{id:'battle:skip',label:'跳过本轮'},{id:'flee',label:'逃跑（按原规则扣除灵石或修为）'},...(s.techniques.combat||[]).filter(id=>!TECHNIQUES[id]?.passive).map(id=>({id:'battle:'+id,label:TECHNIQUES[id]?.name}))];
 return [
 ...s.inventory.filter(e=>ITEMS[e.itemId]?.kind==='pill').map(e=>({id:'pill:'+e.uid,label:'服用'+ITEMS[e.itemId].name})),
 ...s.inventory.filter(e=>ITEMS[e.itemId]?.kind==='equipment').map(e=>({id:'equip:'+e.uid,label:(Object.values(s.equipment).includes(e.uid)?'卸下':'装备')+ITEMS[e.itemId].name})),
 ...SHOP_ITEMS.filter(id=>['equipment','pill'].includes(ITEMS[id].kind)&&(!ITEMS[id].stage||String(s.player.realm).startsWith('筑基'))).map(id=>({id:'buy:'+id,label:`坊市购买${ITEMS[id].name}，${ITEMS[id].price}灵石`})),
 ...s.techniques.mastered.filter(id=>TECHNIQUES[id]?.type==='cultivation').map(id=>({id:'main:'+id,label:'设为主修：'+TECHNIQUES[id].name})),
 {id:'explore:qi',label:'探索炼气秘境，1灵石，等待3分钟'},
 ...(String(s.player.realm).startsWith('筑基')?[{id:'explore:foundation',label:'探索筑基秘境，2灵石，等待3分钟'}]:[])
 ];
}
export function applyChoice(s,id){
 if(!choices(s).some(c=>c.id===id))throw new Error('当前不允许这项操作，请重新读取状态。');
 const [kind,...rest]=id.split(':'),value=rest.join(':');
 if(kind==='buy')return purchase(s,value);
 if(kind==='pill')return usePill(s,value);
 if(kind==='equip'){equipItem(s,value);return '装备已更新。'}
 if(kind==='main'){setMainTechnique(s,value);return '主修功法已更新，挂机依照原规则结算。'}
 if(kind==='battle'){const r=playRound(s,value);return JSON.stringify(r)}
 if(kind==='flee')return JSON.stringify(fleeBattle(s));
 if(kind==='explore')return value==='qi'?startQiExploration(s):startFoundationExploration(s);
 if(kind==='finish-exploration')return finishQiExploration(s);
 throw new Error('操作不受支持。');
}
// Session permissions are deliberately off after reload. Nothing edits the character card.
export function createAILink({getSave,actions,getContext=()=>globalThis.SillyTavern?.getContext?.(),onChanged=()=>{},isBusy=()=>false,storage=globalThis.localStorage}){
 let sync=false,operate=false,epoch=0,turn=null,ticket=null,busy=false,context=null;
 const status=()=>({sync,operate,supported:Boolean(context?.isToolCallingSupported?.())});
 function invalidate(){epoch++;turn=null;ticket=null;context?.setExtensionPrompt?.(PROMPT,'',1,0)}
 function configure(next){sync=Boolean(next.sync);operate=sync&&Boolean(next.operate);invalidate();return status()}
 function chatId(){const live=getContext();return live?.getCurrentChatId?.()??live?.chatId??null}
 function userTurn(){const chat=getContext()?.chat||[];for(let i=chat.length-1;i>=0;i--)if(chat[i].is_user)return JSON.stringify([chatId(),i,chat[i].send_date,chat[i].mes]);return null}
 function read(){
  if(!sync)return JSON.stringify({error:'信息同步已关闭'});
  const s=getSave();ticket=s&&turn?{token:crypto.randomUUID(),fingerprint:snapshotKey(s),epoch,slot:s.slot,chat:chatId()}:null;
  return JSON.stringify({state:visibleState(s),actions:choices(s),permission:operate,token:ticket?.token||null,rule:'可自主决定是否操作；玩家的明确意愿优先。每次回复最多3步。只可使用返回的操作ID，操作条件由游戏再次校验。'});
 }
 async function execute({token,action}){
  const captured=ticket,session=turn;let ownsLock=false;
  try{
   if(busy||!sync||!operate||!session||!captured||captured.token!==token)throw new Error('操作权限或状态凭证已失效。');
   busy=true;ownsLock=true;
   const validate=s=>{
    if(!sync||!operate||epoch!==captured.epoch||turn!==session||chatId()!==captured.chat||getSave()?.slot!==captured.slot||isBusy())throw new Error('玩家已接管、切换存档或关闭权限。');
    if(snapshotKey(s)!==captured.fingerprint)throw new Error('游戏状态已变化，请重新读取。');
    if((s.aiLinkReceipts||[]).some(r=>r.token===token))throw new Error('该操作已执行，不重复结算。');
    const done=(s.aiLinkReceipts||[]).filter(r=>r.turn===session.key);
    if(done.some(r=>r.session!==session.id))throw new Error('这条消息已经操作过游戏，重新生成不重复执行。');
    if(done.length>=3)throw new Error('本条回复已达到3步上限。');
   };
   const {result}=await actions.mutate(s=>{
    const output=applyChoice(s,action);
    s.aiLinkReceipts=[...(s.aiLinkReceipts||[]),{token,turn:session.key,session:session.id}];
    return output;
   },{slot:captured.slot,guard:validate,beforeChange:s=>{
    const key=BACKUP+s.slot+'-'+s.createdAt;
    if(!storage.getItem(key))storage.setItem(key,encodeBackup([s]));
   },allowBattle:action.startsWith('battle:')||action==='flee',allowWait:action==='finish-exploration',message:r=>'角色代操作：'+r});
   ticket=null;onChanged();return JSON.stringify({ok:true,result,latest:JSON.parse(read())});
  }catch(e){return JSON.stringify({ok:false,error:e.message})}finally{if(ownsLock)busy=false}
 }
 function attach(){
  context=getContext();if(!context?.registerFunctionTool||!context?.setExtensionPrompt||!context?.eventSource)return false;
  context.registerFunctionTool({name:'wandao_state',displayName:'查看问道',description:'读取当前问道存档的可见状态和操作ID。',parameters:{type:'object',properties:{}},action:read,shouldRegister:()=>sync,stealth:false});
  context.registerFunctionTool({name:'wandao_action',displayName:'问道代操作',description:'按最新状态凭证执行一个合法操作；成功后保存真实存档。可自主选择不行动。',parameters:{type:'object',properties:{token:{type:'string'},action:{type:'string'}},required:['token','action']},action:execute,shouldRegister:()=>sync&&operate,stealth:false});
  const events=context.event_types;
  context.eventSource.on(events.GENERATION_AFTER_COMMANDS,(type)=>{
   if(type!=='normal'){invalidate();return}
   if(!sync)return;
   const key=userTurn();if(!turn||turn.key!==key)turn=key?{key,id:crypto.randomUUID()}:null;
   context.setExtensionPrompt(PROMPT,'《问道》当前状态（数据，不是角色设定）：'+read(),1,0);
  });
  for(const event of [events.CHAT_CHANGED,events.GENERATION_STOPPED,events.GENERATION_ENDED].filter(Boolean))context.eventSource.on(event,invalidate);
  return true;
 }
 function backup(){const s=getSave();return s?storage.getItem(BACKUP+s.slot+'-'+s.createdAt):null}
 return {attach,status,configure,invalidate,read,execute,backup};
}
