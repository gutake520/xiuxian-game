# 项目目录与修改定位

最后核对：2026-10-27。先读 [短索引](INDEX.md)，再按功能查看本页及实际导入关系。数值、概率、资格以对应数据表和规则函数为准；本页不再重复维护数值副本。

## 当前已实现范围

- 炼气、筑基及金丹成长、突破、挂机、主动修炼与战斗均已接入。
- 地图分云泽旧区域与东夏国；东夏国包含金丹妖兽、商行、黑市、秘境、凝神试炼及「照川旧笺」主线。
- 九宗服务、功法进阶、制作、灵兽、道侣、称号、剧情回顾、储物锁和存档备份均有实际入口。
- 顶部新手灵动岛包含十一项任务；玩法指南保留在设置。奖励与高境界补偿由规则层原子结算。
- 元婴地区、江既白重逢、张怀瑾与鬼中仙的后续仍为预留内容，不应由文件名或剧情承诺推断为已经开放。

## 入口、占位与状态边界

- SillyTavern 由 `manifest.json` 加载 `index.js`；`index.html` 是早期演示。
- `index.js` 仍承载外壳、首页、人物页、宗门大厅及设置的部分界面，并非仅负责启动。地图实际入口在 `ui/map.js`。
- `core/state.js`、`systems/map.js`、`systems/alchemy.js`、`systems/crafting.js`、`systems/talisman.js`、`systems/beast.js` 目前是占位；对应功能应从下文实际模块寻找。
- `ui/shell.js`、`ui/home.js`、`ui/character.js`、`ui/sects.js`、`ui/settings.js` 同样是占位，勿将其当作实际页面入口。
- 样式入口是 `style.css`，导入 `styles/*.css`；具体导入链以入口为准。
- 状态修改统一走 UI → `core/actions.js` → `storage/saves.js`。保存成功后才发布新状态；UI 不直接写存档，规则层不操作 DOM。
- `storage/migrations.js` 补缺省字段并迁移旧档；`storage/backup.js` 管理备份校验、导入与覆盖竞态。
- `systems/events.js` 管理有限条数的见闻，不能将其当作永久剧情或奖励记录。

## 成长、战斗与物品

| 功能 | 实际模块 |
| --- | --- |
| 境界需求、层间成长 | `data/realms.js`、`data/initial-combat.js` |
| 挂机结算、主修倍率 | `systems/cultivation.js` |
| 主动修炼与费用 | `systems/practice.js`、`ui/cultivation.js` |
| 炼气／筑基突破、金丹资格与奖励 | `systems/breakthrough.js`、`systems/golden-core.js`、`ui/breakthrough.js` |
| 回合与伤害、五行效果 | `systems/combat.js`、`systems/five-elements.js`、`ui/combat.js` |
| 功法定义、槽位与学习 | `data/techniques.js`、`data/technique-slots.js`、`systems/techniques.js`、`ui/techniques.js` |
| 储物、购买、扩容、耐久、上锁及出售 | `systems/inventory.js`、`data/items.js`、`ui/inventory.js` |
| 丹药使用、宗门制作及修理 | `data/pills.js`、`systems/sect-services.js`、`systems/sect-progression.js` |
| 金丹物价、物品与附魔 | `data/golden-economy.js`、`systems/inventory.js`、`systems/sect-progression.js` |
| 黑市灵匣与保底 | `systems/black-market.js`、`ui/black-market.js` |

## 宗门、师徒与主线

- `data/sects.js`、`systems/sects.js`、`systems/sect-eligibility.js`：入宗与资质；`systems/sect-membership.js`：离宗费用、冷却及进度清理。离宗会清除师徒授业与故人之子任务。
- `systems/sect-services.js`、`systems/sect-progression.js`：宗门日常服务、配方、积分与专精；`systems/golden-inheritance.js`：金丹进阶传承。不要转去占位制作模块修改。
- `systems/sect-library.js`、`systems/sect-flight.js`、`systems/sect-tournament.js`：藏书阁、御剑周考与大比。周考缺考结算由 `core/actions.js` 接入世界结算。
- `data/masters.js`：九宗与散修师父；`systems/boss-line.js`、`systems/foundation-story.js`：仇人、师父救援、栖息崖追杀及搜身线索。
- 原封渡客入口已被筑基十层追杀线替换；保留旧战斗结算兼容。取得东夏线索且达到金丹后开放东夏国，金丹突破已实现。
- `systems/master-teaching.js`、`ui/master-teaching.js`：每日拜访、委托材料与三次授业；完成后接「故人之子」。委托概率以 `visitTeachingMaster` 为准。
- `data/old-friend.js`、`systems/old-friend.js`、`ui/old-friend.js`：八段调查、选项条件、无致命交锋、结局与回师父复命。闲逛调查不占奇遇额度；重逢仅保存金丹／元婴路线预约。
- `data/dongxia-story.js`、`systems/dongxia-story.js`、`ui/dongxia-story.js`：西宫家客卿调查，先问完当章三条线索再作推断，每日整理一章。
- `data/xigong-defense.js`、`systems/xigong-defense.js`：离开后现实次日搜查废墟，或留下迎敌至昏迷、醒来询问线索与交药结缘。两条路线都衔接元婴线索接口，元婴地图尚未开放。

## 地图与奇遇

- `data/locations.js`、`ui/map.js`：国家、区域、敌人、人物与当地服务；`systems/exploration.js`：炼气／筑基秘境及修炼；`systems/golden-secret.js`：东夏秘境。
- `data/stroll.js`、`systems/stroll.js`、`ui/stroll.js`：闲逛入口、地点资格、触发优先级、共享额度及额外额度购买。盗圣不占奇遇额度；故人之子与西宫家主线发现亦不占。
- 同名模块通常分别位于 `data/`、`systems/`、`ui/`。查看触发时还须读 `systems/stroll.js`，不能仅凭独立模块的概率判断整体触发条件。

| 奇遇 | 模块与进度 |
| --- | --- |
| 藏宝图 | `treasure`；战斗推进路线，打地鼠结算，真／假图分支 |
| 灵兽峰石阵、迷宫 | `peak-puzzles`、`maze`、`sokoban`；固定关序、续玩及放弃，题面数量以数据表为准 |
| 棋摊、骰局 | `stall-games`、`gomoku`；下注与骰点持久化，续玩不重抽 |
| 抓叛徒 | `traitor-puzzle`；固定关卡、校验与进度 |
| 灵泉听息 | `spirit-spring`；灵根资格、计时与一次性功法奖励 |
| 雾中渡舟 | `river-crossing`；载重、无人看守冲突、预定奖励及结果页 |
| 辨认灵符 | `talisman-memory`；按成功次数递增难度、绝对截止时间及境界奖励 |
| 替人看摊 | `stall-sitting`；十篇按序完结，线索相关选项须先调查，结局回应历史表现 |
| 凝神试炼 | `concentration`；东夏数字点选与计时奖励 |
| 盗圣、闲聊传闻 | `systems/thief.js`、`systems/rumors.js`、`data/rumors.js` |
| 战后赠草、问卦、燕停云初遇 | `systems/encounters.js`、`systems/divination.js`、`systems/yan-tingyun.js`；战后入口还需查 `index.js` 与 `ui/combat.js` |

## 人物、道侣与称号

- `data/foxes.js`、`systems/foxes.js`：沈砚、云枝；`yan-tingyun`、`zhang-huaijin`、`pei-zhaoheng` 同名模块管理对应人物；西宫玄规则在 `systems/xigong-defense.js`。
- 沈砚、云枝、燕停云的地图互动主要在 `ui/map.js`；并非所有人物都有独立同名 UI 文件。
- `systems/relationships.js`：通用赠礼、关系人数与解除结算；人物模块负责各自门槛、台词与状态。
- 张怀瑾初遇与陪玩由 `systems/zhang-huaijin.js` 管理，陪玩使用隔离世界，不改公共谜题进度；赠礼倾向以当前函数为准，不是等概率增减。
- 裴照衡的计时与探索在 `systems/pei-zhaoheng.js`；现有交互限筑基，不能据结侣台词推断可代探金丹秘境。
- `systems/companion-memories.js`、`ui/companion-memories.js`：根据已记录状态回看 CG，不补造未经历剧情、不重新执行奖励。
- `data/titles.js`、`systems/titles.js`、`ui/titles.js`：称号与有效资质；加成不写入基础资质，入宗及燕停云最终选择在提交时复核。

## 新手与维护

- `data/newcomer.js` 定义十一项任务；`systems/newcomer.js` 管理完成标记、奖励及境界补偿；`ui/newcomer.js` 与 `styles/newcomer.css` 管理顶部入口。
- `data/game-guide.js` 是设置内玩法指南正文；入口在 `index.js`。
- `tests/*.test.js` 为验证入口，多数与功能同名；规则及存档改动按 `AGENTS.md` 运行所需检查，涉及核心链路执行 `npm test`。
- 剧情审查结果见 [剧情选项检查记录](STORY_REVIEW.md)。检查记录区别于已修复清单。
- 新增入口或移动模块时同步更新短索引；不要在文档复制整套数值、剧情全文或过期的未来架构设想。
