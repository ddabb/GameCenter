using GameCenter.Game;
using GameCenter.Game.Core;
using GameCenter.Game.Data;
using GameCenter.Game.Solvers;

Console.WriteLine("========================================");
Console.WriteLine("   华容道 (Klotski) - C# Console 验证版");
Console.WriteLine("========================================");
Console.WriteLine();

// 显示所有关卡
Console.WriteLine($"共 {ClassicalLevels.Names.Length} 个经典关卡：");
for (int i = 0; i < ClassicalLevels.Names.Length; i++)
    Console.WriteLine($"  {i + 1,2}. {ClassicalLevels.Names[i]}");
Console.WriteLine();

// 选择关卡
int level = 1;
if (args.Length > 0 && int.TryParse(args[0], out int l))
    level = l;

level = Math.Clamp(level, 1, ClassicalLevels.Levels.Length);

Console.WriteLine($"载入关卡 {level}：{ClassicalLevels.Names[level - 1]}");
Console.WriteLine();

// 初始化游戏
var engine = new KlotskiGameEngine();
var grid = ClassicalLevels.GetLevel(level);
engine.LoadFromGrid(grid);

// 显示棋盘
engine.PrintBoard();

// 尝试自动求解
Console.WriteLine();
Console.WriteLine("正在求解（广度优先搜索）...");
Console.WriteLine("(按 Ctrl+C 退出)");

var finder = new BFSFinder();
var sw = System.Diagnostics.Stopwatch.StartNew();
var solution = finder.Solve(engine);
sw.Stop();

Console.WriteLine();
Console.WriteLine($"求解完成！");
Console.WriteLine($"步数：{solution.Count} 步");
Console.WriteLine($"耗时：{sw.ElapsedMilliseconds}ms");

if (solution.Count > 0 && solution[0] != "无解")
{
    Console.WriteLine();
    Console.WriteLine("最优解步骤：");
    for (int i = 0; i < solution.Count; i++)
        Console.WriteLine($"  {i + 1,3}. {solution[i]}");
}

Console.WriteLine();
Console.WriteLine("========================================");
Console.WriteLine("  游戏核心验证完毕。");
Console.WriteLine("  下一步：迁移到 Unity 项目。");
Console.WriteLine("========================================");
