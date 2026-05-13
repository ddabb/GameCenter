namespace MiniGames.Puzzle.Sokoban;

/// <summary>
/// 推箱子游戏
/// </summary>
public class SokobanGame : Puzzle.PuzzleGame<SokobanPiece>
{
    public override string Name => "推箱子";

    private const int ROWS = 10;
    private const int COLS = 10;
    public override int Rows => ROWS;
    public override int Cols => COLS;

    private readonly List<SokobanPiece> _pieces = new();
    public override IReadOnlyList<SokobanPiece> Pieces => _pieces.AsReadOnly();

    // 0=空 . =墙 #=目标 $ =箱子 @ =人 * =目标上的箱子 + =目标上的人
    // 简化版：只用这些字符
    public override void LoadLevel(int level)
    {
        _pieces.Clear();
        State = Core.GameState.NotStarted;
        // TODO: 从数据源加载关卡
    }

    public override bool TryMove(object move)
    {
        // TODO: 实现推箱子移动逻辑
        return false;
    }

    public override bool IsSolved()
    {
        // TODO: 检查所有箱子都在目标点上
        return false;
    }

    public override SokobanPiece? GetPiece(int row, int col)
    {
        return _pieces.FirstOrDefault(p => p.Row == row && p.Col == col);
    }

    public override bool TryPlacePiece(SokobanPiece piece, int row, int col)
    {
        return false;
    }

    public override bool TryMovePiece(SokobanPiece piece, Core.Direction dir)
    {
        return false;
    }

    public override int[,] BuildBoard()
    {
        int[,] board = new int[ROWS, COLS];
        foreach (var p in _pieces)
            board[p.Row, p.Col] = p.Width + p.Height; // 占位
        return board;
    }
}

/// <summary>
/// 推箱子棋子
/// </summary>
public class SokobanPiece : Core.IPiece
{
    public string Name { get; set; } = "";
    public object Type => "box"; // box / player / wall / target
    public int Row { get; set; }
    public int Col { get; set; }
    public int Height { get; }
    public int Width { get; }
    public bool OnTarget { get; set; }

    public SokobanPiece(string name, int row, int col, int height, int width)
    {
        Name = name;
        Row = row;
        Col = col;
        Height = height;
        Width = width;
    }

    public IEnumerable<(int r, int c)> GetOccupiedCells()
    {
        for (int r = Row; r < Row + Height; r++)
            for (int c = Col; c < Col + Width; c++)
                yield return (r, c);
    }

    public bool CanMove(Core.Direction dir, int boardRows, int boardCols)
    {
        var (dr, dc) = dir switch
        {
            Core.Direction.Up => (-1, 0),
            Core.Direction.Down => (1, 0),
            Core.Direction.Left => (0, -1),
            Core.Direction.Right => (0, 1),
            _ => (0, 0)
        };
        int nr = Row + dr, nc = Col + dc;
        return nr >= 0 && nr < boardRows && nc >= 0 && nc < boardCols;
    }

    public void MoveTo(int row, int col)
    {
        Row = row;
        Col = col;
    }
}