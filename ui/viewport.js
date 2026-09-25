// Keep the shell outside the host body's transforms and align it to the visible viewport.
export function attachViewportPanel(panel,win=window,doc=document){
 doc.documentElement.append(panel);
 const place=()=>{
  const viewport=win.visualViewport;
  const width=viewport?.width||win.innerWidth,height=viewport?.height||win.innerHeight;
  const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
  const styles={position:'fixed',left:`${left+width/2}px`,top:`${top+height/2}px`,
   width:`${Math.max(1,Math.min(width-24,Math.max(280,width*.86),580))}px`,
   height:`${Math.max(1,Math.min(height-20,height*.88,820))}px`,
   transform:'translate(-50%, -50%)',margin:'0',bottom:'auto',right:'auto'};
  for(const [key,value] of Object.entries(styles))panel.style.setProperty(key,value,'important');
 };
 let frame=0;
 const schedule=()=>{if(frame)return;frame=win.requestAnimationFrame(()=>{frame=0;place()})};
 win.addEventListener('resize',schedule);
 win.visualViewport?.addEventListener('resize',schedule);
 win.visualViewport?.addEventListener('scroll',schedule);
 place();
 return place;
}
