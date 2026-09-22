export function appendEvent(save,messages){
 save.actionRound=(save.actionRound||0)+1;
 save.events.push({round:save.actionRound,location:save.world?.location||'荒山古道',messages:Array.isArray(messages)?messages:[messages]});
 save.events=save.events.filter(event=>event.round>save.actionRound-10).slice(-10);
}
