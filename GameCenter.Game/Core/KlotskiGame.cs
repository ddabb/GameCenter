using GameCenter.Game.Core;
using GameCenter.Game.Data;
using MiniGames.Core;
using Direction = GameCenter.Game.Core.Direction;

namespace GameCenter.Game;

/// <summary>
/// 华容道游戏核心
/// </summary>
public class KlotskiGameEngine : IGame
{
    public const int Rows = 5;
    public const int Cols = 4;
    
    public List<Piece> Pieces { get; set; } = new();
    public Piece? CaoCao { get; set; }
    
    // 出口位置（底部中央，0-indexed）
    // 曹操2×2棋子，到达row=3时占据3-4行、1-2列，正好从底部中央脱出
    public static readonly (int exitRow, int exitCol) Exit = (3, 1);

    /// <summary>
    /// 从布局数组初始化游戏
    /// 编码约定（唯一ID编码）：
    ///   0=空, 1=曹操(2×2), 2=关羽(1×2), 3-6=竖将(2×1), 7-10=卒(1×1), 11+=额外横将
    ///   每个棋子有唯一ID，通过连通分量找同ID的格子确定形状
    /// </summary>
    public void LoadFromGrid(int[,] grid)
    {
        Pieces.Clear();
        CaoCao = null;
        
        var visited = new bool[Rows, Cols];
        
        for (int r = 0; r < Rows; r++)
        {
            for (int c = 0; c < Cols; c++)
            {
                if (visited[r, c]) continue;
                int val = grid[r, c];
                if (val == 0) continue;
                
                // 用连通分量找出属于同一棋子的所有格子
                var cells = new List<(int r, int c)>();
                var queue = new Queue<(int, int)>();
                queue.Enqueue((r, c));
                visited[r, c] = true;
                
                while (queue.Count > 0)
                {
                    var (cr, cc) = queue.Dequeue();
                    cells.Add((cr, cc));
                    
                    foreach (var (dr, dc) in new[] { (-1, 0), (1, 0), (0, -1), (0, 1) })
                    {
                        int nr = cr + dr, nc = cc + dc;
                        if (nr >= 0 && nr < Rows && nc >= 0 && nc < Cols 
                            && !visited[nr, nc] && grid[nr, nc] == val)
                        {
                            visited[nr, nc] = true;
                            queue.Enqueue((nr, nc));
                        }
                    }
                }
                
                int minRow = cells.Min(c => c.r);
                int minCol = cells.Min(c => c.c);
                int h = cells.Max(c => c.r) - minRow + 1;
                int w = cells.Max(c => c.c) - minCol + 1;
                
                var pieceType = (h, w) switch
                {
                    (2, 2) => PieceType.CaoCao,
                    (1, 2) => PieceType.Horizontal,
                    (2, 1) => PieceType.Vertical,
                    (1, 1) => PieceType.Pawn,
                    _ => PieceType.Pawn
                };
                
                string name = Data.ClassicalLevels.GetPieceName(val);
                
                var piece = new Piece(name, pieceType, minRow, minCol);
                Pieces.Add(piece);
                
                if (pieceType == PieceType.CaoCao) CaoCao = piece;
            }
        }
    }

    // IGame 接口实现
    public string Name => "华容道";
    
    public GameState State
    {
        get
        {
            if (Pieces.Count == 0) return GameState.NotStarted;
            if (IsSolved()) return GameState.Solved;
            return GameState.InProgress;
        }
    }
    
    public int CurrentLevel { get; private set; } = 0;
    
    public void Initialize()
    {
        LoadLevel(1);
    }
    
    public void LoadLevel(int level)
    {
        var grid = ClassicalLevels.GetLevel(level);
        LoadFromGrid(grid);
        CurrentLevel = level;
    }
    
    public bool TryMove(object move)
    {
        if (move is string s)
        {
            // 格式: "棋子名,方向"，如 "曹操,Down"
            var parts = s.Split(',');
            if (parts.Length == 2)
            {
                var piece = Pieces.FirstOrDefault(p => p.Name == parts[0]);
                if (piece != null && Enum.TryParse<Direction>(parts[1], out var dir))
                    return TryMove(piece, dir);
            }
        }
        else if (move is ValueTuple<Piece, Direction> t)
        {
            return TryMove(t.Item1, t.Item2);
        }
        return false;
    }
    
    public GameStatistics GetStatistics()
    {
        return new GameStatistics();
    }
    
    /// <summary>
    /// 尝试移动棋子
    /// </summary>
    public bool TryMove(Piece piece, Direction dir)
    {
        var (dr, dc) = Dir.Offset(dir);
        int newRow = piece.Row + dr;
        int newCol = piece.Col + dc;
        
        // 边界检查
        if (newRow < 0 || newCol < 0 || 
            newRow + piece.Height > Rows || newCol + piece.Width > Cols)
            return false;
        
        // 检测碰撞
        var board = BuildBoard();
        foreach (var (r, c) in piece.GetOccupiedCells())
            board[r, c] = 0;
        
        for (int r = newRow; r < newRow + piece.Height; r++)
            for (int c = newCol; c < newCol + piece.Width; c++)
                if (board[r, c] != 0) return false;
        
        piece.MoveTo(newRow, newCol);
        return true;
    }

    /// <summary>
    /// 构建棋盘状态
    /// </summary>
    public int[,] BuildBoard()
    {
        var board = new int[Rows, Cols];
        for (int i = 0; i < Pieces.Count; i++)
        {
            foreach (var (r, c) in Pieces[i].GetOccupiedCells())
                board[r, c] = i + 1;
        }
        return board;
    }

    /// <summary>
    /// 检查是否通关（曹操到出口）
    /// </summary>
    public bool IsSolved()
    {
        if (CaoCao == null) return false;
        return CaoCao.Row == Exit.exitRow && CaoCao.Col == Exit.exitCol;
    }

    /// <summary>
    /// 获取当前局面的状态字符串（用于去重）
    /// 使用类型编码：同类型棋子等价（减少状态空间）
    /// </summary>
    public string GetStateKey()
    {
        var board = new char[Rows, Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++)
                board[r, c] = '.';
        
        foreach (var piece in Pieces)
        {
            char ch = piece.Type switch
            {
                PieceType.CaoCao => 'C',
                PieceType.Horizontal => 'H',
                PieceType.Vertical => 'V',
                PieceType.Pawn => 'P',
                _ => '?'
            };
            foreach (var (r, c) in piece.GetOccupiedCells())
                board[r, c] = ch;
        }
        
        var key = new char[Rows * Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++)
                key[r * Cols + c] = board[r, c];
        return new string(key);
    }

    /// <summary>
    /// 可视化棋盘
    /// </summary>
    public void PrintBoard()
    {
        var board = new string[Rows, Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++)
                board[r, c] = "·";
        
        foreach (var piece in Pieces)
        {
            string sym = piece.Type switch
            {
                PieceType.CaoCao => "操",
                PieceType.Horizontal => "关",
                PieceType.Vertical => piece.Name[..1], // 张/赵/马/黄
                PieceType.Pawn => piece.Name,          // 甲/乙/丙/丁
                _ => "?"
            };
            foreach (var (r, c) in piece.GetOccupiedCells())
                board[r, c] = sym;
        }
        
        Console.WriteLine("┌───┬───┬───┬───┐");
        for (int r = 0; r < Rows; r++)
        {
            for (int c = 0; c < Cols; c++)
                Console.Write($"│ {board[r, c],2} ");
            Console.WriteLine("│");
            if (r < Rows - 1) Console.WriteLine("├───┼───┼───┼───┤");
        }
        Console.WriteLine("└───┴───┴───┴───┘");
        Console.WriteLine($"  ↑ 出口位置：行{Exit.exitRow + 1} 列{Exit.exitCol + 1}-{Exit.exitCol + 2}");
        Console.WriteLine(IsSolved() ? "  ✅ 已通关！" : "  ⬜ 继续努力");
    }
}