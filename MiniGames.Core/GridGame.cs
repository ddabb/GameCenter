namespace MiniGames.Core;

/// <summary>
/// 网格类解谜游戏基类（实现 IGame + IBoard 接口）
/// </summary>
public abstract class GridGame<TPiece> : IGame, IBoard<TPiece> 
    where TPiece : IPiece
{
    public abstract string Name { get; }
    public GameState State { get; protected set; }
    public int CurrentLevel { get; protected set; }
    public int Moves { get; protected set; }
    public DateTime StartTime { get; protected set; }

    // IBoard
    public abstract int Rows { get; }
    public abstract int Cols { get; }
    public abstract IReadOnlyList<TPiece> Pieces { get; }

    public virtual void Initialize()
    {
        State = GameState.NotStarted;
        Moves = 0;
        CurrentLevel = 1;
    }

    public abstract void LoadLevel(int level);
    public abstract bool TryMove(object move);
    public abstract bool IsSolved();
    
    public virtual string GetStateKey()
    {
        var board = BuildBoard();
        var key = new char[Rows * Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++)
                key[r * Cols + c] = (char)('0' + board[r, c]);
        return new string(key);
    }

    public virtual GameStatistics GetStatistics() => new()
    {
        Moves = Moves,
        Duration = DateTime.Now - StartTime,
        Score = CalculateScore()
    };

    // IBoard methods
    public abstract TPiece? GetPiece(int row, int col);
    public abstract bool TryPlacePiece(TPiece piece, int row, int col);
    public abstract bool TryMovePiece(TPiece piece, Direction dir);
    public abstract int[,] BuildBoard();

    protected virtual int CalculateScore()
        => IsSolved() ? Math.Max(1000 - Moves * 10, 0) : 0;

    protected void StartGame()
    {
        State = GameState.InProgress;
        StartTime = DateTime.Now;
        Moves = 0;
    }

    protected void CheckWin()
    {
        if (IsSolved()) State = GameState.Solved;
    }
}