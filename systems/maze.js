// A small increase in board size, plus real route/branch checks instead of size alone.
export const MAZE_SIZE=13;
export const MAZE_REQUIREMENTS={steps:40,choices:4,turns:10,deadEnds:6};
const deltas=[[-1,0],[1,0],[0,-1],[0,1]];
const pick=(items,random)=>items[Math.max(0,Math.min(items.length-1,Math.floor(random()*items.length)))];
export function carveMaze(random=Math.random){
 const n=MAZE_SIZE,grid=Array.from({length:n},()=>Array(n).fill('#')),active=[[1,1]];grid[1][1]=' ';
 while(active.length){
  // Sometimes grow an earlier branch, leaving convincing side routes along the main path.
  const index=random()<.7?active.length-1:Math.max(0,Math.min(active.length-1,Math.floor(random()*active.length)));
  const [x,y]=active[index],options=deltas.filter(([dx,dy])=>x+dx*2>0&&x+dx*2<n-1&&y+dy*2>0&&y+dy*2<n-1&&grid[y+dy*2][x+dx*2]==='#');
  if(!options.length){active.splice(index,1);continue}
  const [dx,dy]=pick(options,random);grid[y+dy][x+dx]=' ';grid[y+dy*2][x+dx*2]=' ';active.push([x+dx*2,y+dy*2]);
 }
 return grid.map(row=>row.join(''));
}
export function mazeDetails(rows){
 const width=rows[0].length,start=width+1;
 const neighbors=p=>deltas.map(([dx,dy])=>[p%width+dx,Math.floor(p/width)+dy]).filter(([x,y])=>x>=0&&x<width&&y>=0&&y<rows.length&&rows[y][x]===' ').map(([x,y])=>y*width+x);
 const queue=[start],parent=new Map([[start,null]]),distance=new Map([[start,0]]);
 let goal=start;
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(distance.get(p)>distance.get(goal))goal=p;
  for(const q of neighbors(p))if(!parent.has(q)){parent.set(q,p);distance.set(q,distance.get(p)+1);queue.push(q)}
 }
 const path=[];for(let p=goal;p!==null;p=parent.get(p))path.unshift(p);
 const choices=path.slice(1,-1).filter(p=>neighbors(p).length>=3).length;
 const turns=path.slice(2).filter((p,i)=>p-path[i+1]!==path[i+1]-path[i]).length;
 const deadEnds=queue.filter(p=>p!==start&&p!==goal&&neighbors(p).length===1).length;
 return {start,goal,path,steps:path.length-1,choices,turns,deadEnds};
}
export function challengingMaze(rows){const m=mazeDetails(rows);return Object.entries(MAZE_REQUIREMENTS).every(([key,min])=>m[key]>=min)}
// Verified fallback bounds generation time even with a constant/random source that repeats.
const FALLBACK=[
 "#############",
 "#           #",
 "# ##### ### #",
 "#   # #   # #",
 "# # # #######",
 "# #         #",
 "########### #",
 "# #       # #",
 "# ### ### # #",
 "#   #   # # #",
 "# # ### # # #",
 "# #     #   #",
 "#############"
];
export function makeMaze(random=Math.random){
 for(let attempt=0;attempt<24;attempt++){const rows=carveMaze(random);if(challengingMaze(rows))return rows}
 return [...FALLBACK];
}
