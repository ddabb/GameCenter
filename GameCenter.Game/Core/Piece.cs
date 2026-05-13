namespace GameCenter.Game.Core;

/// <summary>
/// 棋子类型枚举
/// </summary>
public enum PieceType
{
    Empty = 0,
    CaoCao = 1,      // 曹操 2×2
    Horizontal = 2,  // 横将 2×1
    Vertical = 3,    // 竖将 1×2
    Pawn = 4         // 小兵 1×1
}

/// <summary>
/// 棋子
/// </summary>
public class Piece
{
    public string Name { get; }
    public PieceType Type { get; }
    public int Row { get; set; }
    public int Col { get; set; }
    public int Height { get; }
    public int Width { get; }

    public Piece(string name, PieceType type, int row, int col)
    {
        Name = name;
        Type = type;
        Row = row;
        Col = col;
        (Height, Width) = Type switch
        {
            PieceType.CaoCao => (2, 2),
            PieceType.Horizontal => (1, 2),
            PieceType.Vertical => (2, 1),
            PieceType.Pawn => (1, 1),
            _ => (1, 1)
        };
    }

    /// <summary>
    /// 获取棋子占用的所有格子
    /// </summary>
    public IEnumerable<(int r, int c)> GetOccupiedCells()
    {
        for (int r = Row; r < Row + Height; r++)
            for (int c = Col; c < Col + Width; c++)
                yield return (r, c);
    }

    /// <summary>
    /// 能否朝指定方向移动
    /// </summary>
    public bool CanMove(Direction dir, int boardRows, int boardCols)
    {
        var (dr, dc) = Dir.Offset(dir);
        int newRow = Row + dr;
        int newCol = Col + dc;
        
        if (newRow < 0 || newCol < 0 || newRow + Height > boardRows || newCol + Width > boardCols)
            return false;
        
        return true;
    }

    /// <summary>
    /// 移动到新位置
    /// </summary>
    public void MoveTo(int row, int col)
    {
        Row = row;
        Col = col;
    }

    public override string ToString() => $"{Name}[{Row},{Col} {Height}×{Width}]";
}