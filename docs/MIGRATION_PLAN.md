# FreeTools 游戏迁移计划

**项目源**: F:\SelfJob\freetools\packages\math\pages
**目标项目**: F:\SelfJob\Puzzle\SolvePuzzle（抖音小游戏）

---

## 已迁移游戏 (5个) ✅

| 游戏名 | FreeTools路径 | 状态 | 备注 |
|--------|--------------|------|------|
| othello | math/pages/othello | ✅ 已完成 | 黑白棋，含AI对弈 |
| akari | math/pages/akari | ✅ 已完成 | 数灯游戏，带光效 |
| sokoban | math/pages/sokoban | ✅ 已完成 | 推箱子，支持撤销 |
| nurikabe | math/pages/nurikabe | ✅ 已完成 | 数墙游戏 |
| tents | math/pages/tents | ✅ 已完成 | 帐篷游戏 |

---

## 已基本实现 (5个) ⚠️

以下游戏已完成Canvas版实现，但使用简化/内置数据，**未接入CDN题库**：

| 游戏名 | 状态 | 数据来源 | 待完善 |
|--------|------|----------|--------|
| slither-link | ⚠️ 简化版 | 随机生成 | 接入CDN题库 |
| nonogram | ⚠️ 简化版 | 内置图案 | 接入CDN题库 |
| 24point | ⚠️ 简化版 | 内置10题 | 接入CDN题库 |
| battleship | ⚠️ 简化版 | 随机生成 | 接入CDN题库，文件名拼写错误 |
| merge-abc | ⚠️ 简化版 | 随机生成 | 接入CDN题库，ABC合成记 |

> ⚠️ 注意：这5个游戏已有可运行的Canvas版本，但需要：
> 1. 接入CDN题库（或本地data/目录）
> 2. 修复battleship.js文件名拼写错误
> 3. 完善游戏逻辑和UI

---

## 待迁移游戏 (2个) 📋

以下游戏尚未开始实现：

| 游戏名 | 显示名称 | 复杂度 | 迁移要点 |
|--------|----------|--------|----------|
| number-one | 数字游戏 | ⭐⭐ | 数字逻辑推理 |
| one-stroke | 一笔画 | ⭐⭐ | 路径求解，欧拉路径 |

---

## 不适合迁移（纯工具类）❌

| 名称 | 原因 |
|------|------|
| divisor-finder | 数学工具，非游戏 |
| gcd-lcm | 数学工具 |
| oddEven | 数学工具 |
| permutation-combination | 数学工具 |
| prime-checker | 数学工具 |
| prime-factorization | 数学工具 |
| random-selector | 工具，非游戏 |

---

## 数据目录状态 ⚠️

- **目标路径**: `F:\SelfJob\Puzzle\SolvePuzzle\data\`
- **当前状态**: ❌ 不存在（之前的复制操作失败）
- **待处理**: 需要从 `F:\SelfJob\FreeToolsPuzzle\data-no-answer\` 复制7个小游戏数据
- **预计大小**: ~6.62 MB（在20MB限制内）

---

## 文件名问题 ⚠️

- `battleship.js` 拼写为 `battleship.js`（缺少一个't'）
- 需要重命名文件并更新引用

---

## 下一步优先级

### 第一批（完善现有游戏）
1. **创建data/目录** - 从FreeToolsPuzzle复制7个小游戏数据
2. **接入CDN题库** - slither-link, nonogram, 24point, battleship
3. **修复battleship.js文件名**
4. **完善merge-abc** - 接入CDN或本地数据

### 第二批（新增游戏）
5. **number-one** - 数字游戏
6. **one-stroke** - 一笔画

---

## 迁移步骤（每个游戏）

1. **读取源码**: `F:\SelfJob\freetools\packages\math\pages\{game}\{game}.js`
2. **理解逻辑**: 提取游戏核心算法（无WXML依赖）
3. **适配Canvas**: 改为纯Canvas绘制
4. **统一UI**: 使用统一的深色主题 + 动画效果
5. **事件处理**: 使用 `tt.onTouchStart` 或 `canvas.addEventListener`
6. **胜利检测**: 添加自动检测 + 弹窗

---

## 迁移优先级排序

### 第一批（快速扩展）
1. **slither-link** - CDN题库现成，用户粘性高
2. **nonogram** - CDN题库现成，经典耐玩
3. **24point** - 实现简单，普及度高

### 第二批（增加多样性）
4. **battleship** - AI对战有趣
5. **number-one** - 独特玩法
6. **one-stroke-solver** - 解谜类补充

### 第三批（生成器类）
7. **sudoku-solver** - 经典求解器
8. **sudoku-generator** - 需要生成算法
9. **guessnumber** - 最简单

---

## 技术约束

- ❌ 不能使用 WXML/WXSS（抖音小游戏用Canvas）
- ❌ 不能使用 `wx.*` API（需用 `tt.*`）
- ✅ 可以复用核心算法逻辑
- ✅ CDN题库可直接加载（jsdelivr.net）

---

## 进度追踪

- [x] othello - 黑白棋 ✅
- [x] akari - 数灯 ✅
- [x] sokoban - 推箱子 ✅
- [x] nurikabe - 数墙 ✅
- [x] tents - 帐篷 ✅
- [x] slither-link - 数回 ⚠️ 简化版
- [x] nonogram - 数织 ⚠️ 简化版
- [x] 24point - 24点 ⚠️ 简化版
- [x] battleship - 战舰 ⚠️ 简化版，文件名拼写错误
- [x] merge-abc - ABC合成记 ⚠️ 简化版
- [ ] number-one - 数字游戏
- [ ] one-stroke - 一笔画
- [ ] sudoku-solver - 数独求解
- [ ] sudoku-generator - 数独生成
- [ ] guessnumber - 猜数字

---

**最后更新**: 2026-05-16 16:00
