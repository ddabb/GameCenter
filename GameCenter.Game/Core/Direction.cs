namespace GameCenter.Game.Core;

/// <summary>
/// 棋子方向枚举
/// </summary>
public enum Direction
{
    Up,
    Down,
    Left,
    Right
}

/// <summary>
/// 方向工具类
/// </summary>
public static class Dir
{

    public static (int dx, int dy) Offset(Direction d) => d switch
    {
        Direction.Up => (-1, 0),
        Direction.Down => (1, 0),
        Direction.Left => (0, -1),
        Direction.Right => (0, 1),
        _ => (0, 0)
    };
    
    public static Direction Opposite(Direction d) => d switch
    {
        Direction.Up => Direction.Down,
        Direction.Down => Direction.Up,
        Direction.Left => Direction.Right,
        Direction.Right => Direction.Left,
        _ => d
    };
}