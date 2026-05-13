namespace MiniGames.Puzzle.Sudoku;

/// <summary>
/// 数独游戏
/// </summary>
public class SudokuGame : Puzzle.PuzzleGame<SudokuCell>
{
    public override string Name => "数独";

    private const int SIZE = 9;
    private const int BOX = 3;
    public override int Rows => SIZE;
    public override int Cols => SIZE;

    private readonly SudokuCell[,] _board = new SudokuCell[SIZE, SIZE];
    private readonly List<SudokuCell> _cells = new();

    public override void LoadLevel(int level)
    {
        _cells.Clear();
        State = Core.GameState.NotStarted;
        for (int r = 0; r < SIZE; r++)
            for (int c = 0; c < SIZE; c++)
            {
                var cell = new SudokuCell(r, c, 0);
                _board[r, c] = cell;
                _cells.Add(cell);
            }
        // TODO: 加载关卡数据
    }

    public override bool TryMove(object move)
    {
        // move = (row, col, value)
        if (move is ValueTuple<int, int, int> m)
        {
            var cell = _board[m.Item1, m.Item2];
            if (!cell.IsFixed)
            {
                cell.Value = m.Item3;
                return true;
            }
        }
        return false;
    }

    public override bool IsSolved()
    {
        for (int r = 0; r < SIZE; r++)
            for (int c = 0; c < SIZE; c++)
                if (_board[r, c].Value == 0) return false;
        return ValidateBoard();
    }

    private bool ValidateBoard()
    {
        // 检查行、列、宫是否有效
        for (int i = 0; i < SIZE; i++)
        {
            var rowSet = new HashSet<int>();
            var colSet = new HashSet<int>();
            for (int j = 0; j < SIZE; j++)
            {
                int rv = _board[i, j].Value;
                int cv = _board[j, i].Value;
                if (rv > 0 && !rowSet.Add(rv)) return false;
                if (cv > 0 && !colSet.Add(cv)) return false;
            }
        }
        // 检查九宫格
        for (int br = 0; br < BOX; br++)
            for (int bc = 0; bc < BOX; bc++)
            {
                var boxSet = new HashSet<int>();
                for (int r = br * BOX; r < br * BOX + BOX; r++)
                    for (int c = bc * BOX; c < bc * BOX + BOX; c++)
                    {
                        int v = _board[r, c].Value;
                        if (v > 0 && !boxSet.Add(v)) return false;
                    }
            }
        return true;
    }

    public override SudokuCell? GetPiece(int row, int col)
        => row >= 0 && row < SIZE && col >= 0 && col < SIZE ? _board[row, col] : null;

    public override bool TryPlacePiece(SudokuCell piece, int row, int col) => false;
    public override bool TryMovePiece(SudokuCell piece, Core.Direction dir) => false;

    public override int[,] BuildBoard()
    {
        var b = new int[SIZE, SIZE];
        for (int r = 0; r < SIZE; r++)
            for (int c = 0; c < SIZE; c++)
                b[r, c] = _board[r, c].Value;
        return b;
    }

    public override IReadOnlyList<SudokuCell> Pieces => _cells.AsReadOnly();
}

/// <summary>
/// 数独单元格
/// </summary>
public class SudokuCell : Core.IPiece
{
    public string Name => $"({Row},{Col})";
    public object Type => "cell";
    public int Row { get; set; }
    public int Col { get; set; }
    public int Height => 1;
    public int Width => 1;
    public int Value { get; set; }
    public bool IsFixed { get; }

    public SudokuCell(int row, int col, int value, bool fixed_ = false)
    {
        Row = row;
        Col = col;
        Value = value;
        IsFixed = fixed_;
    }

    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int boardRows, int boardCols) => false;
    public void MoveTo(int row, int col) { }
}