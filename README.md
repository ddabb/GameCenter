# SolvePuzzle

经典益智游戏合集微信小游戏，包含 10 款游戏、27000+ 关卡。

## 功能特性

- 🧩 10 款经典益智游戏（点灯、战舰、数织、数邻、一笔画、数回、推箱子、帐篷、24点、黑白棋、青蛙逃生、ABC合成记）
- 📊 难度分级（简单/普通/困难，部分游戏支持）
- 💾 进度自动保存，随时继续
- 🏆 成就系统 + 统计面板
- ↩️ 撤销、提示等辅助功能
- 📱 鸿蒙 / iOS / Android / 微信PC端 全兼容

## 项目结构

```
SolvePuzzle/
├── game.js              # 主入口，Canvas 初始化
├── game.json            # 小游戏配置
├── project.config.json  # 微信开发者工具配置
├── games/               # 分包：所有游戏 JS
│   ├── menu.js          # 主菜单
│   ├── level-select.js  # 关卡选择
│   ├── othello.js       # 黑白棋
│   └── ...
├── utils/               # 工具类（统计、进度、广告等）
├── docs/                # 产品文档（发版时忽略）
└── test-reports/        # 测试报告（发版时忽略）
```

## 开发指南

### 环境要求

- 微信开发者工具（≥ 3.16.0）
- AppID：`wx61e4167ee1a9afaa`（测试号，上线前需替换）

### 本地运行

1. 用微信开发者工具打开 `F:\SelfJob\Puzzle\SolvePuzzle`
2. 编译运行
3. 真机扫码预览：`node gen-qr.js`

### 发版打包说明

`project.config.json` 已配置 `packOptions.ignore`，以下文件/目录**不会**被打包上传：
- `README.md`
- `docs/` 目录
- `test-reports/` 目录

## 版本记录

### v1.0.0（首次发版）
- 10 款游戏完整接入
- 胜利面板统一
- 难度分级（akari / tents / slither-link）
- 进度保存 + 统计系统
- 隐私政策页
- PC 端兼容修复

## 许可证

MIT
