# 项目目录与修改定位

## 当前状态

已接入炼气成长、挂机、主动修炼、储物商店和功法学习模块。SillyTavern 由 `manifest.json` 加载 `index.js`，再通过 ES modules 导入功能；`style.css` 导入 `styles/progression.css`。存档读写已移至 `storage/saves.js`，新操作统一经 `core/actions.js` 原子结算。`index.html` 是早期独立演示，不是扩展入口。

以后先查下表定位目标文件；目标仍为空时，到现有入口中找对应实现，再进行迁移。不要因文件存在就认定功能已完成。最终 `index.js` 只负责启动和组装。

## 文件职责

### core/

| 文件 | 用途 |
| --- | --- |
| [state.js](../core/state.js) | 角色与世界的当前状态；提供统一读取和更新入口，不直接操作界面。 |
| [actions.js](../core/actions.js) | 协调一次完整行动的结算、事件记录与保存，避免重复执行。 |

### data/

| 文件 | 用途 |
| --- | --- |
| [realms.js](../data/realms.js) | 境界顺序、小境界门槛与成长表的唯一数据来源。 |
| [roots.js](../data/roots.js) | 灵根类型、资质修正与属性倾向。 |
| [sects.js](../data/sects.js) | 宗门名称、入宗条件、专精条件与介绍。 |
| [techniques.js](../data/techniques.js) | 功法定义、学习条件、槽位需求与效果描述。 |
| [items.js](../data/items.js) | 通用物品与材料定义。 |
| [pills.js](../data/pills.js) | 丹药、配方与效果配置。 |
| [equipment.js](../data/equipment.js) | 装备、耐久与强化配置。 |
| [monsters.js](../data/monsters.js) | 怪物属性、掉落与奖励配置。 |
| [locations.js](../data/locations.js) | 地点、连接关系及当地行动配置。 |
| [balance.js](../data/balance.js) | 挂机、打怪、主动修炼等跨系统基础参数；专属参数留在对应数据表。 |

### systems/

| 文件 | 用途 |
| --- | --- |
| [cultivation.js](../systems/cultivation.js) | 修炼收益、小游戏结算与突破规则。 |
| [combat.js](../systems/combat.js) | 行动顺序、伤害、控制与战斗结算。 |
| [techniques.js](../systems/techniques.js) | 学习、主辅修装配、战斗功法槽及效果生效条件。 |
| [sects.js](../systems/sects.js) | 入宗、拜师、专精资格、宗门任务及以后开放的退宗规则。 |
| [inventory.js](../systems/inventory.js) | 物品获得、堆叠、使用与消耗。 |
| [map.js](../systems/map.js) | 移动条件、地点变更与地点行动。 |
| [relationships.js](../systems/relationships.js) | 道侣关系、数量限制及以后开放的解除关系结算。 |
| [alchemy.js](../systems/alchemy.js) | 炼丹资格、材料消耗与产物。 |
| [crafting.js](../systems/crafting.js) | 装备修复、淬炼与精炼。 |
| [talisman.js](../systems/talisman.js) | 制符、携带限制与战斗用符。 |
| [beast.js](../systems/beast.js) | 灵兽培养、召唤、收回与战斗协作。 |
| [events.js](../systems/events.js) | 按有效行动分组的见闻，最多保留十轮；不删除永久进度。 |

### storage/

| 文件 | 用途 |
| --- | --- |
| [saves.js](../storage/saves.js) | IndexedDB 读写、事务完成与异常处理，统一负责持久化。 |
| [migrations.js](../storage/migrations.js) | 旧存档校验与版本迁移，补缺省字段并保留已有进度。 |

### ui/

| 文件 | 用途 |
| --- | --- |
| [shell.js](../ui/shell.js) | 月亮入口、拖动、主面板、底栏及二级页面切换。 |
| [creation.js](../ui/creation.js) | 角色创建、灵根展示和自由加点。 |
| [home.js](../ui/home.js) | 人物概况、地点日期、任务、当地行动与见闻。 |
| [character.js](../ui/character.js) | 人物资料、资质、战斗属性、装备功法和道侣栏。 |
| [inventory.js](../ui/inventory.js) | 储物列表、物品详情和使用入口。 |
| [map.js](../ui/map.js) | 地点展示与移动入口。 |
| [sects.js](../ui/sects.js) | 宗门选择、拜师剧情、宗门内页。 |
| [cultivation.js](../ui/cultivation.js) | 修炼小游戏、修炼结果与突破界面。 |
| [combat.js](../ui/combat.js) | 战斗信息、功法操作和结果展示。 |
| [settings.js](../ui/settings.js) | 设置、存档选择及重新载入。 |

### styles/

页面样式的未来归档位置，具体拆分见 [样式说明](../styles/README.md)。

## 协作边界

- `data/` 只存定义与数值，不访问 DOM 或数据库。境界信息只从 `data/realms.js` 读取。
- `systems/` 负责规则计算与校验，不直接渲染页面或各自写数据库。
- `ui/` 展示数据并发起操作；不另存背包、地点或一份角色状态。
- `core/actions.js` 协调规则结算，交由 `storage/saves.js` 保存成功后再发布新状态并更新界面；失败不留下半次操作。
- `storage/` 统一读写和迁移。旧记录的清理只作用于见闻，不能抹掉已获得物品、任务状态与关系。
- `styles/` 只负责样式。尚未接入的新文件不会自动生效，需要在迁移时明确导入链。

## 渐进迁移

一次搬一个职责明确的模块，同时接入入口并删除旧实现，避免双份规则。先移纯数据和独立函数，再处理存档、状态、系统与界面。首次拆分保持现有行为、数据库名称、存档键与数据兼容；不要顺便加入未确认的数值或机制。

## 常见改动去哪找

| 改动 | 目标位置 |
| --- | --- |
| 调整升级需求 | `data/realms.js` |
| 调整入宗资格 | `data/sects.js`、`systems/sects.js` |
| 调整功法槽或效果 | `data/techniques.js`、`systems/techniques.js` |
| 背包操作有问题 | `systems/inventory.js`、`ui/inventory.js` |
| 地点或移动有问题 | `data/locations.js`、`systems/map.js`、`ui/map.js` |
| 旧档读取异常 | `storage/migrations.js`、`storage/saves.js` |
| 页面布局问题 | 对应 `ui/` 文件与 `styles/` 样式 |
 

## 已接入的第一阶段功能

- `data/realms.js`：炼气升级需求，满条自动提升小境界，炼气圆满后等待后续筑基规则。
- `data/balance.js`：开局灵石、背包容量、每日挂机时长与首版小游戏参数。
- `systems/cultivation.js`：按本机日期分段的挂机结算；更换主修前结算旧收益。
- `systems/practice.js`、`ui/cultivation.js`：彩色打砖块，根骨影响板长。首版三条命、每块两点、最多六十；无主修时有效练习只得基础一点。
- `systems/techniques.js`、`ui/techniques.js`：唯一解行列数阵，三至五阶，学习进度与提示次数保存。
- `systems/inventory.js`、`ui/inventory.js`：购买、格子、装备和典籍入口。黑市与扩容定价尚未开放。
- `ui/progression.js`、`ui/shared.js`：功能组装、人物修为条及共用界面。
- `storage/migrations.js`：旧档只补发一次二十灵石；旧版赠送典籍转为待参悟的实体典籍。
- `tests/progression.test.js`：核心规则及 IndexedDB 事务测试；运行 `npm install` 后执行 `npm test`。

人物、宗门、创建与旧界面仍部分保留在根入口；其它注释占位文件暂未启用。新增战斗等玩法时再逐步迁移。

## 灵兽峰闲逛小游戏

- `data/peak-puzzles.js`：互斥的推箱子（5%）与迷宫（20%）概率、二十个推箱子关卡。
- `systems/peak-puzzles.js`：迷宫生成、移动／撤销／重来、通关奖励。`save.peakPuzzle` 保存未完成进度和预定奖励；未完成时不重复生成，通关原子清除后才可再次遇见。
- `ui/peak-puzzles.js`：手机方向键、棋盘、固定返回栏；从四处走走进入或续玩，不额外消耗闲逛次数。
- `tests/peak-puzzles.test.js`：关卡可解性、随机迷宫、概率边界、存档续玩、满袋奖励与并发结算。

推箱子按关卡顺序触发，通关后将 `save.nextSokobanLevel` 更新为下一关，第二十关后循环。新存档从第一关开始；旧版进行中的随机关卡保留，完成后衔接对应的下一关。迷宫、重来与撤销不改变关序。

## 闲逛棋摊与骰局

- 闲逛不限次数，每个本地日期共可触发五次奇遇；藏宝图、灵兽峰小游戏、坊市棋摊、黑市骰局共享计数。未结算的摊位可从闲逛页续玩，每次遇见只开一局。
- `systems/stall-games.js` 保存开局、下注、棋局与骰点，通过统一事务结算。低难度棋局不下注，中高可押 0～5 整数灵石，骰子须押 1～5。先扣本金，赢返两倍，棋局和棋退本，认输不退。
- `systems/gomoku.js`：13×13无禁手、玩家先手、五连及以上获胜。低档随机且避开自身成五，中档处理成五与防守，高档在候选落点上预判对方回应与双威胁。
- `data/stall-games.js`：坊市棋摊与黑市骰局各30%发现率，骰局押中率20%。黑市优先判藏宝图，骰局使用条件概率保持总发现率30%。具体概率不在游戏界面展示。
- `ui/stall-games.js`：确认落子、难度与下注选择、续局、揭盅和结算。骰点在下注时保存，退出、刷新不会重投。

## 宗门御剑周考

- `systems/sect-flight.js`：本机周一至周日计周；新入宗和旧档首次更新当周免罚。每周完成一次中等免罚，上等每角色每周奖励1积分，换宗不重复发奖。
- 缺考跨周在 `core/actions.js` 世界结算时原子扣款：最近一个完整周最多扣10灵石，不足每1灵石折5修为，扣至0为止，已有负修为不再减少，不积累欠款或多年罚款。
- `ui/sect-flight.js`：宗门大厅「御剑考核」。三条路线，20组剑环／山石，碰撞3次结束。完成全程穿10环中等、16环上等。返回暂停；重载继续；长时间后台不累计飞行时间；跨周清理旧考场。
- 每次移动／推进通过存档事务计算碰撞和成绩，页面租约防止多页同时操控，动画计时器随页面销毁清理。


### 张怀瑾 · 照夜洞
- `data/zhang-huaijin.js`：外貌、初遇、30/60/90 好感剧情、结侣及赠礼台词；鬼中仙的金丹复仇线尚未开放。
- `systems/zhang-huaijin.js`：望川岭闲逛初遇默认 10%，计入每日 5 次奇遇。一次剧情战（60% 闪避，最多三轮）后解锁独立地图洞府；恢复入场血蓝，不扣修为、不磨装备。
- `save.zhangHuaijin.game.world`：隔离的陪玩存档，复用骰子、五子棋、推箱子、迷宫引擎。无赌注和奖励，不改公共小游戏进度；推箱子与迷宫允许投降。
- 连续本地自然日完成陪玩三天后永久解锁赠礼。未解锁时漏一天即重计；退出游戏可续玩，重复完成不重复计天。
- 每份礼物独立等概率 +3 / −3 好感，范围 0～100，已装备物品不可送。满 100 可结侣，沿用道侣人数、解除费用及三天再结缘限制。
- 结侣后普通战斗致命伤自动恢复最大生命 15%，继续原战斗，四小时冷却持久化；宗门切磋与初遇剧情战除外。复仇状态保留 `awaiting-golden-core`，不开放金丹地图。
- `ui/zhang-huaijin.js`：固定返回栏的洞府、赠礼、剧情和小游戏适配；`tests/zhang-huaijin.test.js` 验证日历连续性、存档/并发、奖励隔离及复活。
