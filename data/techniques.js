export const TECHNIQUES={
 'basic-qi-guide':{id:'basic-qi-guide',name:'引气诀',rank:'初级',size:3,idlePerMinute:0.5,description:'凝神引气，主修后每分钟积累 0.5 修为。'}
};
export const PUZZLE_SIZES={初级:3,普通:3,中级:4,高级:5,特殊:5};
export function hintAllowance(spirit){return Number(spirit)>=10?2:Number(spirit)>=5?1:0}
