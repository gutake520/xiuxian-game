// Capacity is cargo weight; the player rows and does not count toward it.
export const RIVER_LEVELS=[
 {name:'山客渡',capacity:2,cargo:[{name:'灵狼',weight:2},{name:'青羊',weight:2},{name:'灵草',weight:2}],conflicts:[[0,1],[1,2]],rules:['灵狼与青羊不能独处。','青羊与灵草不能独处。']},
 {name:'镇灵渡',capacity:2,cargo:[{name:'剑修',weight:1},{name:'赤狐',weight:1},{name:'灵鸡',weight:1},{name:'灵谷',weight:1}],conflicts:[[0,1],[1,2],[2,3]],rules:['剑修与赤狐不能独处。','赤狐与灵鸡不能独处。','灵鸡与灵谷不能独处。']},
 {name:'五灵渡',capacity:2,cargo:[{name:'赤狐',weight:1},{name:'灵鸡',weight:1},{name:'灵谷',weight:1},{name:'山鼠',weight:1},{name:'灵蛇',weight:1}],conflicts:[[0,1],[1,2],[2,3],[3,4]],rules:['赤狐与灵鸡不能独处。','灵鸡与灵谷不能独处。','山鼠与灵谷不能独处。','灵蛇与山鼠不能独处。']}
];
