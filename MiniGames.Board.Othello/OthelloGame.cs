namespace MiniGames.Board.Othello;

/// <summary>
/// 黑白棋（Othello / Reversi）
/// </summary>
public class OthelloGame : Core.GridGame<OthelloDisc>
{
    public override string Name => "黑白棋";
    public override int Rows => 8;
    public override int Cols => 8;

    private readonly OthelloDisc[,] _board = new OthelloDisc[8, 8];
    private readonly List<OthelloDisc> _allDiscs = new();
    private int _currentPlayer = 1; // 1=黑 -1=白

    public override void LoadLevel(int level)
    {
        _allDiscs.Clear();
        State = Core.GameState.NotStarted;
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++)
            {
                var d = new OthelloDisc(r, c, 0, this);
                _board[r, c] = d;
                _allDiscs.Add(d);
            }
        // 初始布局
        _board[3, 3].Color = 1; _board[3, 4].Color = -1;
        _board[4, 3].Color = -1; _board[4, 4].Color = 1;
    }

    public override bool TryMove(object move)
    {
        if (move is ValueTuple<int, int> m)
            return TryPlaceDisc(m.Item1, m.Item2);
        return false;
    }

    private bool TryPlaceDisc(int row, int col)
    {
        if (row < 0 || row >= 8 || col < 0 || col >= 8) return false;
        if (_board[row, col].Color != 0) return false;

        var dirs = new (int dr, int dc)[] { (-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1) };
        bool flipped = false;

        foreach (var (dr, dc) in dirs)
        {
            int r = row + dr, c = col + dc;
            var toFlip = new List<OthelloDisc>();
            while (r >= 0 && r < 8 && c >= 0 && c < 8)
            {
                var d = _board[r, c];
                if (d.Color == -_currentPlayer) toFlip.Add(d);
                else if (d.Color == _currentPlayer) { flipped = true; break; }
                else break;
                r += dr; c += dc;
            }
            if (flipped)
            {
                foreach (var f in toFlip) f.Color = _currentPlayer;
                _board[row, col].Color = _currentPlayer;
                _currentPlayer = -_currentPlayer;
                return true;
            }
        }
        return false;
    }

    public override bool IsSolved()
    {
        int count = _allDiscs.Sum(d => d.Color != 0 ? 1 : 0);
        if (count == 64) { State = Core.GameState.Solved; return true; }
        return false;
    }

    public override OthelloDisc? GetPiece(int row, int col)
        => row >= 0 && row < 8 && col >= 0 && col < 8 ? _board[row, col] : null;

    public override bool TryPlacePiece(OthelloDisc piece, int row, int col) => false;
    public override bool TryMovePiece(OthelloDisc piece, Core.Direction dir) => false;

    public override int[,] BuildBoard()
    {
        var b = new int[8, 8];
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++)
                b[r, c] = _board[r, c].Color;
        return b;
    }

    public override IReadOnlyList<OthelloDisc> Pieces => _allDiscs.AsReadOnly();
}

public class OthelloDisc : Core.IPiece
{
    public string Name => $"({Row},{Col})";
    public object Type => "disc";
    public int Row { get; set; }
    public int Col { get; set; }
    public int Height => 1;
    public int Width => 1;
    public int Color { get; set; } // 1=黑 -1=白 0=空
    private readonly OthelloGame _game;

    public OthelloDisc(int row, int col, int color, OthelloGame game)
    {
        Row = row; Col = col; Color = color; _game = game;
    }

    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int boardRows, int boardCols) => false;
    public void MoveTo(int row, int col) { Row = row; Col = col; }
}