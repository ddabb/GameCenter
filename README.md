# 华容道 (Klotski) - Unity 目标版

> 用 C# 从零实现经典华容道游戏，目标是导出为微信小游戏。

## 项目背景

- **目标平台**：微信小游戏（最终通过 Unity WebGL 发布）
- **开发者**：彪哥（10年 C# 经验）
- **技术路线**：C# + Unity → WebGL → 微信小游戏
- **参考数据**：来自 `F:\SelfJob\our-mini-games`（30 个经典关卡）

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 游戏逻辑 | C# (.NET 10) | 跨平台，先跑 Console 验证 |
| 渲染 | Unity 2022.3 LTS | Canvas / UGUI / WebGL Build |
| 目标平台 | 微信小游戏 | 通过 Unity WebGL 导出 |
| 版本控制 | Git | 仓库：`F:\SelfJob\klotski-unity` |

## 项目结构

```
klotski-unity/
├── NuGet.config                 # NuGet 镜像配置
├── README.md                    # 本文件
└── KlotskiGame/
    ├── KlotskiGame.csproj      # 项目文件
    ├── Program.cs               # 入口（Console 验证用）
    ├── Core/
    │   ├── KlotskiGame.cs       # 游戏核心逻辑
    │   ├── Piece.cs             # 棋子定义
    │   ├── Position.cs          # 位置结构
    │   └── Direction.cs          # 移动方向
    ├── Data/
    │   └── ClassicalLevels.cs   # 30 个经典关卡数据
    └── Solvers/
        └── BFSFinder.cs         # BFS 求最优解
```

## 游戏规则

华容道是一个滑块拼图游戏：

- **棋盘**：5 行 × 4 列（5×4）
- **目标**：将最大的棋子（曹操）移动到出口（底部中央）
- **棋子类型**：
  - 曹操（2×2）- 最大，需移出
  - 大将（2×1 或 1×2）- 4 个
  - 小兵（1×1）- 4 个
- **胜利条件**：曹操从初始位置移动到棋盘底部中央的出口

## 棋子编码（内部定义）

```
EMPTY = 0    // 空位
CAOCAO = 1   // 曹操 (2×2)
HORIZONTAL = 2  // 横将 (2×1)
VERTICAL = 3    // 竖将 (1×2)
PAWN = 4        // 小兵 (1×1)
```

## 编译 & 运行（Console 验证）

```bash
cd KlotskiGame
dotnet restore --configfile ..\NuGet.config
dotnet build
dotnet run
```

## 下一步计划

- [ ] 完成 Console 版华容道逻辑验证
- [ ] 迁移到 Unity 项目（添加 Canvas 渲染）
- [ ] 实现触摸拖拽交互
- [ ] 添加计时器和步数统计
- [ ] 移植 our-mini-games 的 30 关关卡数据
- [ ] Unity WebGL 导出配置
- [ ] 接入微信开发者工具

## 相关资源

- 华容道参考数据：`F:\SelfJob\our-mini-games\klotski\`
- 微信小游戏分析：`F:\SelfJob\freetools\docs\weixin-minigame-reference-analysis.md`
- 游戏矩阵规划：见 MEMORY.md

---

**创建时间**：2026-05-12  
**最后更新**：2026-05-12