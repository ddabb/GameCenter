namespace MiniGames.Puzzle.SlitherLink;

/// <summary>
/// 数回游戏（Slither Link）
/// </summary>
public class SlitherLinkGame : Puzzle.PuzzleGame<SlitherLinkCell>
{
    public override string Name => "数回";
    public override int Rows { get; }
    public override int Cols { get; }
    public int[,] Hints { get; } // 提示数 0-3，-1 表示无提示

    private readonly SlitherLinkCell[,] _cells;
    private readonly List<SlitherLinkCell> _allCells = new();
    // 边：0=无线 1=有线
    private readonly int[,] _hEdges; // 水平边 [r, c+1]
    private readonly int[,] _vEdges; // 垂直边 [r+1, c]

    public SlitherLinkGame(int rows, int cols, int[,] hints)
    {
        Rows = rows;
        Cols = cols;
        Hints = hints;
        _cells = new SlitherLinkCell[rows, cols];
        _hEdges = new int[rows, cols + 1];
        _vEdges = new int[rows + 1, cols];
    }

    public override void LoadLevel(int level)
    {
        _allCells.Clear();
        Array.Clear(_hEdges, 0, _hEdges.Length);
        Array.Clear(_vEdges, 0, _vEdges.Length);
        State = Core.GameState.NotStarted;
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++)
            {
                var cell = new SlitherLinkCell(r, c, this);
                _cells[r, c] = cell;
                _allCells.Add(cell);
            }
    }

    public override bool TryMove(object move)
    {
        if (move is ValueTuple<string, int, int, int> m)
        {
            // (边类型, 行, 列, 0/1)
            string type = m.Item1;
            int r = m.Item2, c = m.Item3, v = m.Item4;
            if (type == "h") { if (c < Cols + 1) _hEdges[r, c] = v; }
            else if (type == "v") { if (r < Rows + 1) _vEdges[r, c] = v; }
            return true;
        }
        return false;
    }

    public override bool IsSolved() => false; // TODO

    public override SlitherLinkCell? GetPiece(int row, int col)
        => row >= 0 && row < Rows && col >= 0 && col < Cols ? _cells[row, col] : null;

    public override bool TryPlacePiece(SlitherLinkCell piece, int row, int col) => false;
    public override bool TryMovePiece(SlitherLinkCell piece, Core.Direction dir) => false;

    public override int[,] BuildBoard()
    {
        var b = new int[Rows, Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++)
                b[r, c] = Hints[r, c];
        return b;
    }

    public override IReadOnlyList<SlitherLinkCell> Pieces => _allCells.AsReadOnly();

    public int GetHEdge(int r, int c) => r >= 0 && r < Rows && c >= 0 && c <= Cols ? _hEdges[r, c] : 0;
    public int GetVEdge(int r, int c) => r >= 0 && r <= Rows && c >= 0 && c < Cols ? _vEdges[r, c] : 0;
}

public class SlitherLinkCell : Core.IPiece
{
    public string Name => $"({Row},{Col})";
    public object Type => "cell";
    public int Row { get; set; }
    public int Col { get; set; }
    public int Height => 1;
    public int Width => 1;
    public int Hint => _game.Hints[Row, Col];
    private readonly SlitherLinkGame _game;

    public SlitherLinkCell(int row, int col, SlitherLinkGame game)
    {
        Row = row;
        Col = col;
        _game = game;
    }

    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int boardRows, int boardCols) => false;
    public void MoveTo(int row, int col) { }
}