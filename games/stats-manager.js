/**
 * 统计数据管理器
 * 负责记录和读取游戏统计数据
 * 
 * 数据结构:
 * stats_${gameName} = {
 *   totalPlays: 0,        // 总游玩次数
 *   totalWins: 0,         // 总通关次数
 *   totalTime: 0,         // 总游玩时长(秒)
 *   bestTimes: {},        // 最佳通关时间 { levelNum: seconds }
 *   bestMoves: {},        // 最少步数 { levelNum: moves }
 *   levelStats: {}        // 每关详细统计 { levelNum: { plays, wins, avgTime } }
 * }
 */

class StatsManager {
  constructor() {
    this.currentGame = null;
    this.currentLevel = null;
    this.startTime = null;
    this.moveCount = 0;
  }

  // 开始一局游戏
  startGame(gameName, level) {
    this.currentGame = gameName;
    this.currentLevel = level;
    this.startTime = Date.now();
    this.moveCount = 0;
  }

  // 记录一步操作
  recordMove() {
    this.moveCount++;
  }

  // 结束一局游戏（通关时调用）
  endGame(won) {
    if (!this.currentGame || !this.currentLevel) return;

    const duration = Math.floor((Date.now() - this.startTime) / 1000);
    
    try {
      const key = `stats_${this.currentGame}`;
      let stats = this.getStats(this.currentGame);

      // 更新总计
      stats.totalPlays++;
      if (won) {
        stats.totalWins++;
        stats.totalTime += duration;

        // 更新最佳时间
        if (!stats.bestTimes[this.currentLevel] || duration < stats.bestTimes[this.currentLevel]) {
          stats.bestTimes[this.currentLevel] = duration;
        }

        // 更新最少步数
        if (!stats.bestMoves[this.currentLevel] || this.moveCount < stats.bestMoves[this.currentLevel]) {
          stats.bestMoves[this.currentLevel] = this.moveCount;
        }
      }

      // 更新关卡统计
      if (!stats.levelStats[this.currentLevel]) {
        stats.levelStats[this.currentLevel] = { plays: 0, wins: 0, totalTime: 0 };
      }
      stats.levelStats[this.currentLevel].plays++;
      if (won) {
        stats.levelStats[this.currentLevel].wins++;
        stats.levelStats[this.currentLevel].totalTime += duration;
      }

      wx.setStorageSync(key, JSON.stringify(stats));
    } catch (e) {
      console.log('保存统计失败', e);
    }

    // 重置当前游戏状态
    this.currentGame = null;
    this.currentLevel = null;
    this.startTime = null;
    this.moveCount = 0;
  }

  // 获取某游戏的统计数据
  getStats(gameName) {
    try {
      const saved = wx.getStorageSync(`stats_${gameName}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    
    // 返回默认结构
    return {
      totalPlays: 0,
      totalWins: 0,
      totalTime: 0,
      bestTimes: {},
      bestMoves: {},
      levelStats: {}
    };
  }

  // 获取所有游戏的汇总统计
  getAllStats() {
    const games = ['othello', 'akari', 'sokoban', 'nurikabe', 'tents', '24point', 'slither-link', 'nonogram', 'battleship', 'merge-abc'];
    
    let totalPlays = 0;
    let totalWins = 0;
    let totalTime = 0;
    let gameStats = {};

    for (const game of games) {
      const stats = this.getStats(game);
      gameStats[game] = stats;
      totalPlays += stats.totalPlays;
      totalWins += stats.totalWins;
      totalTime += stats.totalTime;
    }

    return {
      totalPlays,
      totalWins,
      totalTime,
      gameStats
    };
  }

  // 格式化时间
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}分${s}秒`;
    } else {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}时${m}分`;
    }
  }

  // 计算胜率
  getWinRate(stats) {
    if (stats.totalPlays === 0) return 0;
    return Math.round((stats.totalWins / stats.totalPlays) * 100);
  }
}

// 单例导出
let instance = null;
module.exports = {
  getInstance() {
    if (!instance) {
      instance = new StatsManager();
    }
    return instance;
  }
};
