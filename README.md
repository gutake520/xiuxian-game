# xiuxian-game

手机优先的文字修真游戏 / SillyTavern 扩展。

## 安装

在酒馆的扩展安装窗口填入 `https://github.com/gutake520/xiuxian-game.git`，分支使用 `main`。

## 目录速查

| 位置 | 用途 |
| --- | --- |
| `index.js`、`style.css` | 当前实际运行的逻辑与样式 |
| `core/` | 状态与行动协调 |
| `data/` | 境界、灵根、宗门、功法、物品等数据 |
| `systems/` | 修炼、战斗、储物、地图、宗门及各流派规则 |
| `storage/` | 存档与旧版本迁移 |
| `ui/` | 各页面及操作入口 |
| `styles/` | 后续拆分的界面样式 |
| `docs/STRUCTURE.md` | 文件职责、修改定位与迁移约定 |

**新目录目前仅为骨架，尚未接入运行，现有功能仍在根目录文件中。** 以后逐个迁移或填充，详细位置见 [目录说明](docs/STRUCTURE.md)。

`index.html` 保留为早期演示页面；酒馆扩展的入口以 `manifest.json` 为准。
