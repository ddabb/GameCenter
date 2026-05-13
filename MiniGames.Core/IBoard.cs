namespace MiniGames.Core;

/// <summary>
/// 方向枚举（所有棋盘游戏通用）
/// </summary>
public enum Direction
{
    Up,
    Down,
    Left,
    Right
}

/// <summary>
/// 棋子接口（所有棋子需实现）
/// </summary>
public interface IPiece
{
    /// <summary>
    /// 棋子名称/标识
    /// </summary>
    string Name { get; }
    
    /// <summary>
    /// 棋子类型
    /// </summary>
    object Type { get; }
    
    /// <summary>
    /// 所在行（左上角）
    /// </summary>
    int Row { get; set; }
    
    /// <summary>
    /// 所在列（左上角）
    /// </summary>
    int Col { get; set; }
    
    /// <summary>
    /// 高度（占几行）
    /// </summary>
    int Height { get; }
    
    /// <summary>
    /// 宽度（占几列）
    /// </summary>
    int Width { get; }
    
    /// <summary>
    /// 获取棋子占用的所有格子
    /// </summary>
    IEnumerable<(int r, int c)> GetOccupiedCells();
    
    /// <summary>
    /// 检查能否朝指定方向移动
    /// </summary>
    bool CanMove(Direction dir, int boardRows, int boardCols);
    
    /// <summary>
    /// 移动到指定位置
    /// </summary>
    void MoveTo(int row, int col);
}

/// <summary>
/// 棋盘接口（泛型，约束棋子类型）
/// </summary>
public interface IBoard<TPiece> where TPiece : IPiece
{
    /// <summary>
    /// 棋盘行数
    /// </summary>
    int Rows { get; }
    
    /// <summary>
    /// 棋盘列数
    /// </summary>
    int Cols { get; }
    
    /// <summary>
    /// 获取指定位置的棋子
    /// </summary>
    TPiece? GetPiece(int row, int col);
    
    /// <summary>
    /// 尝试放置棋子
    /// </summary>
    bool TryPlacePiece(TPiece piece, int row, int col);
    
    /// <summary>
    /// 尝试移动棋子
    /// </summary>
    bool TryMovePiece(TPiece piece, Direction dir);
    
    /// <summary>
    /// 获取所有棋子
    /// </summary>
    IReadOnlyList<TPiece> Pieces { get; }
    
    /// <summary>
    /// 构建棋盘状态（用于去重/BFS）
    /// </summary>
    int[,] BuildBoard();
    
    /// <summary>
    /// 获取状态字符串（用于去重）
    /// </summary>
    string GetStateKey();
}
