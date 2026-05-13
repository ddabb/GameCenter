namespace MiniGames.Math.TwentyFour;

/// <summary>
/// 24点游戏
/// </summary>
public class TwentyFourGame : Core.IGame
{
    public string Name => "24点";
    public Core.GameState State { get; private set; }
    public int CurrentLevel => 0;
    public int Moves { get; private set; }
    public int[] Numbers { get; private set; } = Array.Empty<int>();

    public void Initialize() { State = Core.GameState.NotStarted; }

    public void LoadLevel(int level)
    {
        // 生成4个1-13的随机数
        var rnd = new Random();
        Numbers = Enumerable.Range(0, 4).Select(_ => rnd.Next(1, 14)).ToArray();
        State = Core.GameState.InProgress;
    }

    public bool TryMove(object move)
    {
        if (move is string expr && State == Core.GameState.InProgress)
        {
            if (Evaluate(expr) == 24)
            {
                State = Core.GameState.Solved;
                return true;
            }
        }
        return false;
    }

    public bool IsSolved() => State == Core.GameState.Solved;

    public string GetStateKey() => string.Join(",", Numbers);

    public Core.GameStatistics GetStatistics() => new() { Moves = this.Moves };

    private double Evaluate(string expr)
    {
        try { return Convert.ToDouble(expr.Replace("÷", "/").Replace("×", "*")); }
        catch { return double.NaN; }
    }
}