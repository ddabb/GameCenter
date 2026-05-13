namespace MiniGames.Puzzle;

/// <summary>
/// 解谜游戏抽象基类（继承自 GridGame）
/// </summary>
public abstract class PuzzleGame<TPiece> : Core.GridGame<TPiece> where TPiece : Core.IPiece
{
    // 解谜游戏通用特性可在此扩展
    public int HintUsed { get; protected set; }
    public int BestScore { get; protected set; }

    protected void UseHint()
    {
        HintUsed++;
    }
}