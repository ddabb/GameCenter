namespace MiniGames.Core;

/// <summary>
/// 游戏状态枚举
/// </summary>
public enum GameState
{
    NotStarted,
    InProgress,
    Solved,
    Failed
}

/// <summary>
/// 所有游戏的通用接口
/// </summary>
public interface IGame
{
    /// <summary>
    /// 游戏名称
    /// </summary>
    string Name { get; }
    
    /// <summary>
    /// 当前游戏状态
    /// </summary>
    GameState State { get; }
    
    /// <summary>
    /// 当前关卡/难度
    /// </summary>
    int CurrentLevel { get; }
    
    /// <summary>
    /// 初始化游戏
    /// </summary>
    void Initialize();
    
    /// <summary>
    /// 加载指定关卡
    /// </summary>
    void LoadLevel(int level);
    
    /// <summary>
    /// 尝试执行一步移动
    /// </summary>
    bool TryMove(object move);
    
    /// <summary>
    /// 检查是否已通关
    /// </summary>
    bool IsSolved();
    
    /// <summary>
    /// 获取当前局面的状态字符串（用于去重/BFS）
    /// </summary>
    string GetStateKey();
    
    /// <summary>
    /// 获取游戏统计数据
    /// </summary>
    GameStatistics GetStatistics();
}

/// <summary>
/// 游戏统计数据
/// </summary>
public class GameStatistics
{
    public int Moves { get; set; }
    public TimeSpan Duration { get; set; }
    public int Score { get; set; }
    public Dictionary<string, object> CustomData { get; set; } = new();
}
