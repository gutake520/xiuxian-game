# 项目短索引

先按下表定位，再查对应函数与调用点。最后核对：2026-10-25。

## 入口与存档

- 扩展入口：`manifest.json` → `index.js`；`index.html` 是早期演示，不是酒馆扩展入口。
- 首页、人物页、宗门大厅及存档选择目前仍在 `index.js`。
- 写入链：UI → `core/actions.js` → `storage/saves.js`；迁移：`storage/migrations.js`。
- 样式入口：`style.css`，按模块导入 `styles/*.css`；共用弹层：`ui/shared.js`。
- 注意：`core/state.js`、`ui/home.js`、`ui/character.js`、`systems/map.js` 目前只是占位。

## 按功能定位

| 功能 | 数据／规则 | 界面／入口 |
| --- | --- | --- |
| 境界与成长 | `data/realms.js`、`data/initial-combat.js` | `index.js` 人物页 |
| 挂机、主动修炼 | `systems/cultivation.js`、`systems/practice.js` | `ui/cultivation.js` |
| 筑基／金丹突破、自由资质 | `systems/breakthrough.js`、`systems/golden-core.js` | `ui/breakthrough.js`、`index.js` |
| 战斗、技能结算 | `systems/combat.js`、`systems/five-elements.js` | `ui/combat.js` |
| 功法学习、装备与资格 | `data/techniques.js`、`data/technique-slots.js`、`systems/techniques.js` | `ui/techniques.js` |
| 装备、储物锁、买卖 | `data/items.js`、`data/golden-economy.js`、`systems/inventory.js` | `ui/inventory.js` |
| 国家地图、怪物与秘境（云泽／东夏） | `data/locations.js`、`systems/exploration.js` | `ui/map.js`（山河图 → 国家 → 地点） |
| 主线、仇人、东夏国解锁 | `systems/boss-line.js`、`systems/foundation-story.js`、`data/masters.js` | `ui/boss-line.js`、`ui/foundation-story.js`、`ui/map.js`、`ui/master-teaching.js` |
| 四处走走、每日奇遇额度 | `data/stroll.js`、`systems/stroll.js` | `ui/stroll.js` |
| 宗门、服务与资格 | `data/sects.js`、`systems/sects.js`、`systems/sect-services.js`、`systems/sect-eligibility.js` | `index.js` 宗门页、`ui/map.js` 拜访 |
| 师父授业、故人支线 | `systems/master-teaching.js`、`systems/old-friend.js`、`data/old-friend.js` | `ui/master-teaching.js`、`ui/old-friend.js` |
| 道侣与CG回顾 | `systems/foxes.js`、各人物同名模块、`systems/companion-memories.js` | `ui/map.js`、各人物UI、`ui/companion-memories.js` |
| 称号与有效资质 | `data/titles.js`、`systems/titles.js` | `ui/titles.js` |
| 存档导入导出 | `storage/backup.js` | `ui/backup.js` |

## 奇遇与独立模块名

通常规则在 `systems/<模块>.js`，界面在 `ui/<模块>.js`；有独立配置时再查 `data/`。

- 凝神试炼：`concentration`；辨认灵符：`talisman-memory`；雾中渡舟：`river-crossing`。
- 替人看摊：`stall-sitting`；棋摊／骰局：`stall-games`；抓叛徒：`traitor-puzzle`。
- 藏宝图：`treasure`；迷宫／推箱子：`peak-puzzles`；灵泉：`spirit-spring`。
- 盗圣：`systems/thief.js`；闲聊传闻：`systems/rumors.js`；两者由闲逛接入。
- 人物模块：`yan-tingyun`、`zhang-huaijin`、`pei-zhaoheng`。
- 宗门模块：`sect-progression`、`sect-library`、`sect-flight`、`sect-tournament`。

## 验证与维护

- 测试：`tests/*.test.js`，多数与模块同名；全量命令 `npm test`。
- 金丹突破与成长领取、典籍学习：`tests/golden-core.test.js`；东夏国试炼：`tests/concentration.test.js`；金丹物价与补给：`tests/golden-economy.test.js`。
- 索引只保留位置、职责、关键调用关系；详细规则按需查 `docs/STRUCTURE.md`，数值以代码为准。
