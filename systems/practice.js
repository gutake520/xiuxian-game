import {PRACTICE} from '../data/balance.js';
import {paddleWidth} from './cultivation.js';
// Canvas-independent simulation; rewards are settled by core/actions.js.
export function createPractice(root){
 const w=PRACTICE.width,h=PRACTICE.height;
 return {w,h,paddle:{x:w/2,width:paddleWidth(root),y:h-32},ball:{x:w/2,y:h-46,vx:0,vy:0,r:5},bricks:Array.from({length:PRACTICE.rows*PRACTICE.columns},(_,i)=>({x:12+(i%PRACTICE.columns)*50,y:42+Math.floor(i/PRACTICE.columns)*23,w:46,h:17,alive:true,color:i%6})),lives:PRACTICE.lives,cleared:0,launched:false,done:false,particles:[],combo:0};
}
export function launchBall(game){if(game.done||game.launched)return;game.launched=true;game.ball.vx=PRACTICE.speed*.35;game.ball.vy=-Math.sqrt(PRACTICE.speed**2-game.ball.vx**2)}
export function movePaddle(game,x){game.paddle.x=Math.max(game.paddle.width/2,Math.min(game.w-game.paddle.width/2,x))}
export function stepPractice(game,dt){
 if(game.done)return;
 const b=game.ball,p=game.paddle;
 game.particles=game.particles.filter(spark=>{spark.life-=dt;spark.x+=spark.vx*dt;spark.y+=spark.vy*dt;return spark.life>0});
 if(!game.launched){b.x=p.x;b.y=p.y-b.r-3;return}
 // Small fixed substeps prevent tunnelling through thin bricks on mobile.
 const steps=Math.max(1,Math.ceil(dt/.008));for(let n=0;n<steps;n++){
  const step=dt/steps,oldX=b.x,oldY=b.y;b.x+=b.vx*step;b.y+=b.vy*step;
  if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)}if(b.x>game.w-b.r){b.x=game.w-b.r;b.vx=-Math.abs(b.vx)}if(b.y<b.r){b.y=b.r;b.vy=Math.abs(b.vy)}
  if(b.vy>0&&oldY+b.r<=p.y&&b.y+b.r>=p.y&&b.x>=p.x-p.width/2-b.r&&b.x<=p.x+p.width/2+b.r){
   const hit=Math.max(-1,Math.min(1,(b.x-p.x)/(p.width/2)));b.y=p.y-b.r;b.vx=hit*PRACTICE.speed*.85;b.vy=-Math.sqrt(PRACTICE.speed**2-b.vx**2);game.combo=0;
  }
  const brick=game.bricks.find(k=>k.alive&&b.x+b.r>=k.x&&b.x-b.r<=k.x+k.w&&b.y+b.r>=k.y&&b.y-b.r<=k.y+k.h);
  if(brick){brick.alive=false;game.cleared++;game.combo++;if(oldX+b.r<=brick.x||oldX-b.r>=brick.x+brick.w)b.vx*=-1;else b.vy*=-1;
   for(let j=0;j<9;j++)game.particles.push({x:brick.x+brick.w/2,y:brick.y+brick.h/2,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,life:.6,color:brick.color});
   if(game.cleared===game.bricks.length){game.done=true;return}
  }
  if(b.y>game.h+b.r){game.lives--;game.combo=0;game.launched=false;if(game.lives<=0)game.done=true;return}
 }
}
