namespace MiniGames.Puzzle.Nonogram;

/// <summary>
/// 数织游戏（Nonogram / Picross）
/// </summary>
public class NonogramGame : Puzzle.PuzzleGame<NonogramCell>
{
    public override string Name => "数织";
    public override int Rows { get; }
    public override int Cols { get; }
    public int[] RowHints { get; }
    public int[] ColHints { get; }

    private readonly NonogramCell[,] _cells;
    private readonly List<NonogramCell> _allCells = new();

    public NonogramGame(int rows, int cols, int[] rowHints, int[] colHints)
    {
        Rows = rows;
        Cols = cols;
        RowHints = rowHints;
        ColHints = colHints;
        _cells = new NonogramCell[rows, cols];
    }

    public override void LoadLevel(int level)
    {
        _allCells.Clear();
        State = Core.GameState.NotStarted;
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++)
            {
                var cell = new NonogramCell(r, c);
                _cells[r, c] = cell;
                _allCells.Add(cell);
            }
    }

    public override bool TryMove(object move)
    {
        if (move is ValueTuple<int, int, int> m)
        {
            _cells[m.Item1, m.Item2].State = (NonogramCellState)m.Item3;
            return true;
        }
        return false;
    }

    public override bool IsSolved() => false; // TODO

    public override NonogramCell? GetPiece(int row, int col)
        => row >= 0 && row < Rows && col >= 0 && col < Cols ? _cells[row, col] : null;

    public override bool TryPlacePiece(NonogramCell piece, int row, int col) => false;
    public override bool TryMovePiece(NonogramCell piece, Core.Direction dir) => false;
    public override int[,] BuildBoard()
    {
        var b = new int[Rows, Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++)
                b[r, c] = (int)_cells[r, c].State;
        return b;
    }

    public override IReadOnlyList<NonogramCell> Pieces => _allCells.AsReadOnly();
}

public class NonogramCell : Core.IPiece
{
    public string Name => $"({Row},{Col})";
    public object Type => "cell";
    public int Row { get; set; }
    public int Col { get; set; }
    public int Height => 1;
    public int Width => 1;
    public NonogramCellState State { get; set; }

    public NonogramCell(int row, int col, NonogramCellState state = NonogramCellState.Empty)
    {
        Row = row;
        Col = col;
        State = state;
    }

    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int boardRows, int boardCols) => false;
    public void MoveTo(int row, int col) { }
}

public enum NonogramCellState
{
    Empty = 0,    // 空白 .
    Filled = 1,   // 填黑 #
    Cross = 2     // 叉 ✗
}