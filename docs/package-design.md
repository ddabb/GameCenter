# 分包设计 (Package Design) - klotski-unity

## 设计目标

将 freetools 中的小游戏迁移到 C# 项目，为后续 Unity 导出微信小游戏做准备。

## 分包原则

1. **按游戏类型分包**：逻辑相似的游戏放在同一个子包
2. **共享核心库**：所有游戏共享 `MiniGames.Core`
3. **独立数据**：每个游戏有独立的 Data 项目
4. **可独立加载**：每个包可以独立编译和测试

## 包结构设计

```
klotski-unity.sln
│
├── MiniGames.Core/              # 核心库（所有游戏共享）
│   ├── IGame.cs                # 游戏接口
│   ├── IBoard.cs               # 棋盘接口
│   ├── Piece.cs                # 通用棋子定义
│   ├── Position.cs             # 位置结构
│   ├── Direction.cs            # 方向枚举
│   └── Solver/                # 通用求解器基础
│
├── MiniGames.Klotski/           # 华容道（已完成框架）
│   ├── Core/KlotskiGame.cs
│   ├── Data/ClassicalLevels.cs
│   └── Solvers/BFSFinder.cs
│
├── MiniGames.Puzzle/            # 益智解谜游戏包
│   ├── MiniGames.Puzzle.Core/  # 共享逻辑
│   │   ├── GridGame.cs        # 网格游戏基类
│   │   ├── GridSolver.cs      # 网格求解器
│   │   └── LevelLoader.cs    # 关卡加载器
│   │
│   ├── MiniGames.Puzzle.Sokoban/    # 推箱子
│   ├── MiniGames.Puzzle.Sudoku/      # 数独
│   ├── MiniGames.Puzzle.Nonogram/    # 数织
│   ├── MiniGames.Puzzle.SlitherLink/ # 数回
│   ├── MiniGames.Puzzle.Akari/       # 点亮
│   ├── MiniGames.Puzzle.Nurikabe/    # 努里卡贝
│   └── MiniGames.Puzzle.Tents/       # 帐篷
│
├── MiniGames.Board/             # 棋盘游戏包
│   ├── MiniGames.Board.Core/   # 共享逻辑
│   │   ├── BoardGame.cs       # 棋盘游戏基类
│   │   ├── Player.cs          # 玩家定义
│   │   └── AI/               # AI 对手
│   │
│   ├── MiniGames.Board.Othello/     # 黑白棋
│   └── MiniGames.Board.Battleship/ # 战舰
│
├── MiniGames.Math/              # 数学游戏包
│   ├── MiniGames.Math.Core/
│   │   ├── MathGame.cs        # 数学游戏基类
│   │   └── Calculator.cs      # 计算器
│   │
│   ├── MiniGames.Math.TwentyFour/  # 24点
│   └── MiniGames.Math.OneStroke/   # 一笔画
│
└── MiniGames.Console/           # Console 测试前端
    ├── Program.cs
    ├── Menu.cs
    └── UI/                    # Console UI 组件
```

## 核心接口设计

### IGame.cs

```csharp
namespace MiniGames.Core;

public interface IGame
{
    string Name { get; }
    GameState State { get; }
    
    void Initialize();
    void LoadLevel(int level);
    bool TryMove(object move);
    bool IsSolved();
    string GetStateKey();
}
```

### IBoard.cs

```csharp
public interface IBoard<T> where T : IPiece
{
    int Rows { get; }
    int Cols { get; }
    
    T? GetPiece(int row, int col);
    bool TryPlacePiece(T piece, int row, int col);
    bool TryMovePiece(T piece, Direction dir);
}
```

## 游戏列表与优先级

| 游戏 | 包 | 优先级 | 数据来源 | 状态 |
|------|-----|--------|----------|------|
| 华容道 | Puzzle | P0 | our-mini-games | 框架完成 |
| 推箱子 | Puzzle | P0 | FreeToolsPuzzle | 待迁移 |
| 数独 | Puzzle | P1 | FreeToolsPuzzle | 待迁移 |
| 数织 | Puzzle | P1 | 需生成 | 待迁移 |
| 数回 | Puzzle | P2 | FreeToolsPuzzle | 待迁移 |
| 点亮 | Puzzle | P2 | 需生成 | 待迁移 |
| 黑白棋 | Board | P1 | 需实现AI | 待迁移 |
| 24点 | Math | P2 | 需生成 | 待迁移 |

## 下一步计划

1. ✅ 创建 Core 项目并定义接口
2. ✅ 重构 Klotski 项目使用 Core 接口
3. ⬜ 创建 Puzzle 包并迁移 Sokoban
4. ⬜ 创建 Puzzle 包并迁移 Sudoku
5. ⬜ 创建 Board 包并迁移 Othello
6. ⬜ 为每款游戏编写 Console 测试
7. ⬜ 整体编译验证
8. ⬜ 准备 Unity 项目迁移

---

**创建时间**：2026-05-12  
**设计者**：玉芬
