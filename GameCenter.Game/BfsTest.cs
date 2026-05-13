// 临时测试脚本：验证 BFS 求解器
using GameCenter.Game.Core;
using GameCenter.Game.Solvers;

namespace GameCenter.Game;

public static class BfsTest
{
    public static void Run()
    {
        var engine = new KlotskiGameEngine();
        engine.LoadLevel(1);

        Console.WriteLine("=== 关卡1: 横刀立马 ===");
        engine.PrintBoard();
        Console.WriteLine($"\n棋子列表:");
        foreach (var p in engine.Pieces)
            Console.WriteLine($"  {p.Name} ({p.Type}) [{p.Row},{p.Col}] {p.Height}×{p.Width}");

        Console.WriteLine($"\nIsSolved: {engine.IsSolved()}");
        Console.WriteLine($"CaoCao: {(engine.CaoCao != null ? $"{engine.CaoCao.Row},{engine.CaoCao.Col}" : "null")}");
        Console.WriteLine($"Exit: {KlotskiGameEngine.Exit}");

        Console.WriteLine("\n开始 BFS 求解...");
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var solver = new BFSFinder();
        var moves = solver.Solve(engine);
        sw.Stop();

        Console.WriteLine($"求解用时: {sw.ElapsedMilliseconds}ms");
        Console.WriteLine($"步数: {moves.Count}");
        if (moves.Count > 0 && moves.Count < 200)
        {
            Console.WriteLine("解法:");
            for (int i = 0; i < moves.Count; i++)
                Console.WriteLine($"  {i + 1}. {moves[i]}");
        }
    }
}
