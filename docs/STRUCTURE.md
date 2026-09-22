# 项目目录与修改定位

## 当前状态

本次只建立目录、说明和无执行逻辑的 JS 占位文件，尚未拆迁现有代码。SillyTavern 仍由 `manifest.json` 加载根目录 `index.js` 与 `style.css`。`index.html` 是早期独立演示，不是扩展入口。

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
