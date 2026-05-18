# SolvePuzzle 抖音小游戏 PRD

**版本：** v1.3.5
**作者：** 泽楠思维实验室
**日期：** 2026-05-18
**状态：** 开发完成，等待上线材料（AppID/封面图/真机测试）

---

## 1. 产品概述

**产品名称：** SolvePuzzle（拼图解谜）
**平台：** 抖音小游戏
**一句话描述：** 聚合10款经典益智谜题游戏，支持选关、进度保存、成就系统

**核心用户价值：** 随时随地挑战趣味谜题，锻炼思维，获得成就感

---

## 2. 功能范围

### 2.1 已完成功能

| 功能 | 说明 | 状态 |
|------|------|------|
| 主菜单 | 10个游戏图标网格 + 通关进度显示 | ✅ |
| 选关页面 | 通用选关页，支持100关 + 触摸滚动 | ✅ |
| 用户中心 | 显示各游戏进度 | ✅ |
| 进度保存 | tt.setStorageSync，通关解锁下一关+记录星星 | ✅ |
| 关卡数据 | 7个游戏本地数据（akari/battleship/nonogram/nurikabe/slither-link/sokoban/tents） | ✅ |
| 获胜判断 | 10个游戏全部有胜利/结束检测 | ✅ |
| 胜利面板 | 通关后显示遮罩 + "下一关"/"返回"按钮 | ✅ |
| 游戏内返回 | 胜利面板含返回选关按钮 | ✅ |
| 菜单进度显示 | 每个游戏卡片显示"已通关 X/Y" + 进度条 | ✅ |
| 数据容错 | 数据加载失败自动返回选关页 | ✅ |

### 2.2 待开发功能（按优先级）

| 优先级 | 功能 | 说明 | 状态 |
|--------|------|------|------|
| ~~P0~~ | ~~通关庆祝动画~~ | ~~粒子效果/弹窗~~ | ✅ |
| ~~P1~~ | ~~音效系统~~ | ~~振动反馈+开关~~ | ✅ |
| ~~P1~~ | ~~新手引导~~ | ~~首次进入操作提示~~ | ✅ |
| ~~P2~~ | ~~提示系统~~ | ~~显示1个正确位置，有次数限制~~ | ✅ |
| ~~P2~~ | ~~撤销功能~~ | ~~回退上一步操作~~ | ✅ |
| ~~P2~~ | ~~成就系统~~ | ~~收集类/连续通关类成就~~ | ✅ |
| ~~P3~~ | ~~每日挑战~~ | ~~每天限定关卡，激励回访~~ | ✅ |
| ~~P3~~ | ~~分享功能~~ | ~~通关后一键生成分享图~~ | ✅ |
| P3 | 难度分级 | easy/medium/hard 扩展（akari/tents/slither-link已有数据） | ✅ 已完成 |
| P4 | 数据统计页面 | 通关时长/正确率等统计 | 📋 |

---

## 3. 游戏列表（10款）

| 游戏 | 类型 | 数据来源 | 特殊说明 |
|------|------|---------|---------|
| othello（黑白棋） | 棋类 | 程序生成 | AI对战，gameOver面板 |
| akari（数灯） | 逻辑 | 本地数据(3000关) | loadLevel + initLevel fallback |
| sokoban（推箱子） | 益智 | 本地数据(3003关) | 扁平数据结构 |
| nurikabe（数墙） | 逻辑 | 本地数据(3001关) | 简化胜利条件 |
| tents（帐篷） | 逻辑 | 本地数据(3000关) | checkVictory |
| 24point（24点） | 算术 | 程序生成 | drawVictory面板 |
| slither-link（数回） | 逻辑 | 本地数据(3000关) | 3难度子目录 |
| nonogram（数织） | 逻辑 | 本地数据(3001关) | 扁平数据结构 |
| battleship（海战） | 逻辑 | 本地数据(3000关) | 暂无特殊 |
| merge-abc（ABC合成） | 2048风格 | 程序生成 | gameOver面板 |

---

## 4. 交互设计规范

### 4.1 通用交互
- 所有按钮点击有视觉反馈（缩放+高亮）
- 触摸滑动需有流畅响应
- 加载状态显示loading动画

### 4.2 游戏内交互
- 顶部显示：当前关卡、返回按钮
- 底部显示：重置按钮、（可选）提示/撤销按钮
- 通关后：显示庆祝动画 + "下一关"按钮

### 4.3 音效清单
| 场景 | 音效 |
|------|------|
| 触摸按钮 | 点击音（短促） |
| 放置正确 | 成功音（轻快） |
| 放置错误 | 失败音（低沉） |
| 通关 | 庆祝音（欢快） |
| 游戏失败 | 失败音（沮丧） |

---

## 5. 性能与数据

### 5.1 包体限制
- 抖音小游戏总包 ≤ 20MB
- 游戏数据通过 require 本地加载（data/ 目录），≤2MB 可打包在包内

### 5.2 本地存储
- 进度数据：`tt.setStorageSync` / `tt.getStorageSync`
- 存储格式：`progress_${gameName}` → `{unlocked: N, stars: {levelNum: 1}}`
- 与 level-select.js / profile.js 兼容

### 5.3 数据更新
- 关卡数据打包在 data/ 目录，通过 require 加载
- 数据源：F:\SelfJob\FreeToolsPuzzle\data\（去答案版本）

---

## 6. 上线前检查清单

- [x] 游戏内返回按钮（胜利面板"返回"按钮）
- [x] 胜利面板（10个游戏全部完成）
- [x] 通关庆祝动画（五彩纸屑粒子效果）
- [x] 音效系统（振动反馈+音乐开关）
- [x] 新手引导（10个游戏首次进入操作提示）
- [x] 撤销功能（9个游戏支持，最多20步）
- [x] 成就系统（32个成就，通关自动检测）
- [x] 提示系统（nonogram/battleship/akari支持，每关3次）
- [x] 每日挑战（菜单横幅+连续打卡）
- [x] 分享功能（胜利面板分享按钮）
- [x] 数据统计页面（v1.4）✅ 新增
- [ ] 抖音开发者工具真机测试
- [ ] AppID 申请与配置
- [ ] icon/封面图制作
- [x] 应用说明文案（docs/app-description.md）
- [x] 隐私政策页面（games/privacy.js，从"我的"页面进入）

---

## 8. 代码质量修复记录

### v1.3 修复（2026-05-17）
- **Patch注入Bug**：patch-share/progress/tutorial等脚本将require注入到loadLevel()函数体，导致代码粘合、双分号、Confetti require丢失
- 已修复：所有require移回文件顶部，21个JS文件语法全通过
- 已补齐数据：nurikabe 3001关 + sokoban 3003关（从data-no-answer复制）
- 已清理：patch脚本不再需要重复运行

### v1.3.1 Bug修复（2026-05-17 11:47）
- **撤销系统修复**：7个游戏（akari/battleship/nonogram/nurikabe/slither-link/tents/othello）添加了undoMgr.save()，撤销按钮现在真正可用
  - sokoban/merge-abc 有自己的历史记录撤销机制（this.history / this._history），无需undoMgr
  - 24point 无需撤销
- **$1; 残留清理**：10个游戏文件中的30行 `$1;` 垃圾代码已删除
- **draw()方法清理**：9个游戏的draw()方法中误入的按钮检测代码（引用未定义x/y，每帧报错）已移除
- 21个JS文件语法全部通过

### v1.3.2 clickHandler + level-loader 修复（2026-05-17 12:00）
- **x/y 声明顺序修复**：8个游戏（akari/battleship/nonogram/nurikabe/slither-link/sokoban/tents/othello）clickHandler中touch/x/y统一提取到函数开头，删除重复声明
- **level-loader.js 路径修复**：
  - akari：修正为 `./akari/{dir}/{prefix}-XXXX.json`（原路径 `akari-XXXX` 不存在）
  - battleship：修正为 `./battleship/easy-XXXX.json`（原路径 `battleship-XXXX` 不存在）
  - tents：重写为正确的子目录+文件名格式（原逻辑 `require('./tents/easy')` 完全错误）
- 清理残留修复脚本：fix-all.js, fix-clickhandler.js, fix-merge.js

### 数据文件统计
| 目录 | 文件数 |
|------|--------|
| akari | 3000 |
| battleship | 3000 |
| nonogram | 3001 |
| number-one | 191 |
| nurikabe | 3001 |
| slither-link | 3000 |
| sokoban | 3003 |
| tents | 3000 |
| **总计** | **27201** |

---

### v1.3.3 难度分级完成（2026-05-18）
- **难度分级功能完成**：akari/tents/slither-link 三款游戏支持 easy/medium/hard 三档难度
  - `games/tents.js`：添加 `difficulty` 参数到构造函数，loadLevel() 使用 this.difficulty 加载对应难度数据
  - `games/slither-link.js`：同上
  - `game.js`：loadGame() 和 switchGame() 添加 difficulty 参数，传递给所有游戏构造函数
  - `games/level-select.js`：已支持难度Tab（之前完成）
- 数据文件路径：`../data/{gameName}/{difficulty}/{difficulty}-{level}.json`
- Git提交：✅ `feat: add difficulty support for tents and slither-link games` (a4c4c93)

## 7. 版本规划

| 版本 | 主要内容 | 目标 |
|------|---------|------|
| v1.0 | 基础功能：菜单+选关+10游戏+数据 | ✅ 已完成 |
| v1.1 | UX完善：胜利面板+进度保存+返回按钮 | ✅ 已完成 |
| v1.2 | 体验完善：撤销+成就+新手引导+音效 | ✅ 已完成 |
| v1.3 | 社交+扩展：每日挑战+分享+难度分级 | ✅ 已完成 |
| **v1.4** | **上线版本：修复+提审+发布** | **当前目标** |

### v1.4 上线前待办
- [ ] 替换抖音正式 AppID（game.json）
- [ ] 制作 icon（1024×1024 png）和封面图
- [ ] 真机测试（扫码预览，验证10款游戏）
- [ ] 填写应用说明文案（模板见 docs/app-description.md）
- [x] 隐私政策页面（games/privacy.js）
- [ ] 提审抖音平台

### v1.3.5 数据统计页面（2026-05-18）
- **stats-manager.js**：统计数据管理器，记录游玩次数/通关时长/胜率/最佳记录
- **stats.js**：数据统计页面，Canvas渲染可滚动列表，展示10游戏详细数据
- **profile.js**：统计卡片下方新增「查看详细统计」按钮
- **game.js**：新增 `stats` 路由
- **patch-stats.js**：统计注入脚本（待运行）
- 语法验证通过

### v1.3.4 隐私政策+应用说明（2026-05-18）
- **隐私政策页面**：`games/privacy.js`，Canvas渲染可滚动文本，从"我的"页面底部进入
- **应用说明文案**：`docs/app-description.md`，含应用名称/简介/详细描述/关键词
- **game.js**：新增 `privacy` 路由
- **profile.js**：底部栏新增🔒隐私政策按钮
- 语法验证通过

---

*文档最后更新：2026-05-18 v1.3.5（数据统计页面）*