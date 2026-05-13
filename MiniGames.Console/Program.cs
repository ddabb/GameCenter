using GameCenter.Game;
using GameCenter.Game.Core;
using GameCenter.Game.Data;
using Direction = GameCenter.Game.Core.Direction;
using MiniGames.Core;

var game = new KlotskiGameEngine();
int moveCount = 0;

void ShowMenu()
{
    Console.WriteLine("\n\n╔══════════════════════════╗");
    Console.WriteLine("║    MiniGames Console      ║");
    Console.WriteLine("╚══════════════════════════╝");
    Console.WriteLine();
    Console.WriteLine("1. 华容道 - 开始游戏");
    Console.WriteLine("2. 华容道 - 选择关卡 (1-30)");
    Console.WriteLine("0. 退出");
    Console.WriteLine();
    Console.Write("请选择: ");
}

void ShowHelp()
{
    Console.WriteLine("操作说明:");
    Console.WriteLine("  输入棋子名+方向，如: 曹操,Down  关羽,Right  张飞,Up");
    Console.WriteLine("  方向: Up/Down/Left/Right (或简写 U/D/L/R)");
    Console.WriteLine("  b=返回菜单  q=退出  r=重置本关  h=帮助");
    Console.WriteLine();
}

void PlayGame(int startLevel)
{
    game.LoadLevel(startLevel);
    moveCount = 0;
    Console.WriteLine($"\n=== 第 {game.CurrentLevel} 关: {ClassicalLevels.Names[game.CurrentLevel - 1]} ===");
    ShowHelp();
    
    while (true)
    {
        game.PrintBoard();
        Console.Write($"[步数:{moveCount}] > ");
        var input = Console.ReadLine()?.Trim();
        if (string.IsNullOrEmpty(input)) continue;
        
        if (input.Equals("q", StringComparison.OrdinalIgnoreCase)) return;
        if (input.Equals("b", StringComparison.OrdinalIgnoreCase)) break;
        if (input.Equals("r", StringComparison.OrdinalIgnoreCase))
        {
            game.LoadLevel(game.CurrentLevel);
            moveCount = 0;
            Console.WriteLine("已重置本关。\n");
            continue;
        }
        if (input.Equals("h", StringComparison.OrdinalIgnoreCase))
        {
            ShowHelp();
            continue;
        }
        
        // 解析输入
        var parts = input.Split(',');
        if (parts.Length != 2) { Console.WriteLine("格式错误，如: 曹操,Down"); continue; }
        
        var pieceName = parts[0].Trim();
        var dirStr = parts[1].Trim().ToUpperInvariant() switch
        {
            "U" => "Up",
            "D" => "Down",
            "L" => "Left",
            "R" => "Right",
            var s => s
        };
        
        var piece = game.Pieces.FirstOrDefault(p => p.Name == pieceName);
        if (piece == null)
        {
            Console.WriteLine($"未找到棋子: {pieceName}");
            var names = game.Pieces.Select(p => p.Name).Distinct().ToList();
            Console.WriteLine($"可用棋子: {string.Join(", ", names)}");
            continue;
        }
        
        if (!Enum.TryParse<Direction>(dirStr, true, out var dir))
        {
            Console.WriteLine($"方向无效: {dirStr}，可用: Up/Down/Left/Right");
            continue;
        }
        
        if (game.TryMove(piece, dir))
        {
            moveCount++;
            if (game.IsSolved())
            {
                game.PrintBoard();
                Console.WriteLine($"\n🎉 恭喜通关！共 {moveCount} 步！\n");
                Console.Write("下一关？(Y/N): ");
                if (Console.ReadLine()?.Trim().Equals("Y", StringComparison.OrdinalIgnoreCase) == true)
                {
                    int next = game.CurrentLevel + 1;
                    if (next > 30) { Console.WriteLine("已是最后一关！"); return; }
                    game.LoadLevel(next);
                    moveCount = 0;
                    Console.WriteLine($"\n=== 第 {game.CurrentLevel} 关: {ClassicalLevels.Names[game.CurrentLevel - 1]} ===");
                }
                else return;
            }
        }
        else
        {
            Console.WriteLine("❌ 无法移动（碰壁或被挡住）");
        }
    }
}

// Main loop
while (true)
{
    ShowMenu();
    var choice = Console.ReadLine()?.Trim();
    switch (choice)
    {
        case "1":
            PlayGame(1);
            break;
        case "2":
            Console.Write("输入关卡号 (1-30): ");
            var lvl = Console.ReadLine()?.Trim();
            if (int.TryParse(lvl, out int n) && n >= 1 && n <= 30)
                PlayGame(n);
            else Console.WriteLine("无效关卡号");
            break;
        case "0":
            Console.WriteLine("再见！");
            return;
        default:
            Console.WriteLine("无效选择");
            break;
    }
}
