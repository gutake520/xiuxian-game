import {GOMOKU_SIZE,GOMOKU_DIFFICULTIES,STALL_MAX_BET,DICE_WIN_CHANCE} from '../data/stall-games.js';
import {fiveInRow,chooseGomokuMove} from './gomoku.js';
const round=n=>Math.round(n*100)/100;
export function offerStallGame(save,kind){
 if(!['gomoku','dice'].includes(kind))throw new Error('摊位不存在。');
 save.stallGames??={};if(save.stallGames[kind]&&save.stallGames[kind].phase!=='done')return false;
 save.stallGames[kind]={id:crypto.randomUUID(),kind,phase:'offer'};return true;
}
function requireGame(save,kind,id,phase){
 if(save.battle)throw new Error('请先结束战斗。');
 const game=save.stallGames?.[kind];if(!game||game.id!==id||game.phase!==phase)throw new Error('这局已有变化，请重新打开。');return game;
}
function checkBet(save,bet,min=0){
 if(!Number.isInteger(bet)||bet<min||bet>STALL_MAX_BET)throw new Error(`下注须为 ${min}～${STALL_MAX_BET} 整数灵石。`);
 if(save.player.spiritStones<bet)throw new Error('灵石不足。');
}
export function startGomoku(save,id,difficulty,bet){
 const game=requireGame(save,'gomoku',id,'offer');
 if(!Object.hasOwn(GOMOKU_DIFFICULTIES,difficulty))throw new Error('请选择难度。');
 checkBet(save,bet);if(difficulty==='easy'&&bet!==0)throw new Error('低难度只切磋，不下注。');
 save.player.spiritStones=round(save.player.spiritStones-bet);
 Object.assign(game,{phase:'playing',difficulty,bet,board:Array(GOMOKU_SIZE**2).fill(0),ply:0,lastMove:null});
 return {text:bet?`棋局开盘，已押 ${bet} 灵石。`:'摆好棋盘，执黑先行。'};
}
function settle(save,game,outcome,text){
 const payout=outcome==='win'?game.bet*2:outcome==='draw'?game.bet:0;
 save.player.spiritStones=round(save.player.spiritStones+payout);game.phase='done';game.outcome=outcome;game.payout=payout;
 game.text=text+(game.bet?outcome==='win'?` 返还 ${payout} 灵石。`:outcome==='draw'?` 退回 ${payout} 灵石。`:` 押下的 ${game.bet} 灵石归了摊主。`:'');
 return {completed:true,text:game.text};
}
export function moveGomoku(save,id,pos,expectedPly,random=Math.random){
 const game=requireGame(save,'gomoku',id,'playing');
 if(expectedPly!==game.ply)throw new Error('棋局已更新，请重新打开。');
 if(!Number.isInteger(pos)||pos<0||pos>=game.board.length||game.board[pos])throw new Error('这里不能落子。');
 game.board[pos]=1;game.ply++;game.lastMove=pos;
 if(fiveInRow(game.board,pos,1))return settle(save,game,'win','你连成五子，棋摊主人拱手认输。');
 if(game.board.every(Boolean))return settle(save,game,'draw','棋盘落满，此局和棋。');
 const ai=chooseGomokuMove(game.board,game.difficulty,random);game.board[ai]=2;game.lastMove=ai;game.ply++;
 if(fiveInRow(game.board,ai,2))return settle(save,game,'loss','白子连成一线，棋摊主人笑着收棋。');
 if(game.board.every(Boolean))return settle(save,game,'draw','棋盘落满，此局和棋。');
 return {};
}
export function startDice(save,id,guess,bet,random=Math.random){
 const game=requireGame(save,'dice',id,'offer');
 if(!['small','big'].includes(guess))throw new Error('请先猜大小。');checkBet(save,bet,1);
 const won=random()<DICE_WIN_CHANCE,big=won?guess==='big':guess!=='big';
 const face=(big?4:1)+Math.min(2,Math.floor(random()*3));
 save.player.spiritStones=round(save.player.spiritStones-bet);
 Object.assign(game,{phase:'rolling',guess,bet,face,won,suspicious:!won&&random()<.3});
 return {text:`押${guess==='big'?'大':'小'}，${bet} 灵石已放上赌桌。`};
}
export function revealDice(save,id){
 const game=requireGame(save,'dice',id,'rolling');
 return settle(save,game,game.won?'win':'loss',`骰盅揭开：${game.face}点，${game.face>=4?'大':'小'}。${game.won?'你猜中了。':'你猜错了。'}${game.suspicious?'庄家收起骰盅，袖口轻轻一动。':''}`);
}
export function leaveStallGame(save,kind,id){
 const game=save.stallGames?.[kind];if(!game||game.id!==id)throw new Error('这局已经结束。');
 if(game.phase==='offer'){game.phase='done';game.text='你摆摆手，离开了摊位。';return {completed:true,text:game.text}}
 if(kind==='gomoku'&&game.phase==='playing')return settle(save,game,'loss','你收回棋子，认输离席。');
 throw new Error('请先揭盅结算。');
}
