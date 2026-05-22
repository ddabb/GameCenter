/**
 * daily-challenge.js — 每日挑战系统
 * 
 * 基于日期生成当日挑战关卡（所有玩家同一天相同关卡）
 * 挑战完成记录存储在 storage
 * 
 * 核心逻辑：如果推荐关卡未解锁，自动选择已解锁的关卡
 */

const GAMES = ['akari', 'battleship', 'nonogram', 'nurikabe', 'tents', 'slither-link', 'sokoban'];
const GAME_TITLES = {
  'akari': '数灯', 'battleship': '海战', 'nonogram': '数织', 'nurikabe': '数墙',
  'tents': '帐篷', 'slither-link': '数回', 'sokoban': '推箱子'
};

class DailyChallenge {
  constructor() {
    this.storageKey = 'daily_challenge';
    this.data = this._load();
  }

  _load() {
    try {
      const d = wx.getStorageSync(this.storageKey);
      return d ? JSON.parse(d) : { completed: {} };
    } catch (e) {
      return { completed: {} };
    }
  }

  _save() {
    try {
      wx.setStorageSync(this.storageKey, JSON.stringify(this.data));
    } catch (e) {}
  }

  _today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  _getUnlockedLevel(gameName) {
    try {
      const key = `progress_${gameName}`;
      const saved = wx.getStorageSync(key);
      if (saved) {
        const progress = JSON.parse(saved);
        return progress.unlocked || 1;
      }
    } catch (e) {
      console.warn('[DailyChallenge] 获取解锁进度失败:', e);
    }
    return 1;
  }

  _getBaseLevel(date, game) {
    const hash = this._hash(date + 'solvepuzzle' + game);
    return (hash % 1000) + 1;
  }

  getToday() {
    const date = this._today();
    const hash = this._hash(date + 'solvepuzzle');
    const gameIndex = hash % GAMES.length;
    const game = GAMES[gameIndex];
    const baseLevel = this._getBaseLevel(date, game);
    const unlockedLevel = this._getUnlockedLevel(game);

    let level = baseLevel;

    if (baseLevel > unlockedLevel) {
      level = unlockedLevel;
    }

    return {
      date,
      game,
      gameTitle: GAME_TITLES[game],
      level,
      completed: !!this.data.completed[date],
      maxUnlocked: unlockedLevel
    };
  }

  complete() {
    this.data.completed[this._today()] = true;
    this._save();
  }

  getStreak() {
    let streak = 0;
    const d = new Date();
    while (true) {
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (this.data.completed[date]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  getTotalCompleted() {
    return Object.keys(this.data.completed).length;
  }

  getGameProgress(gameName) {
    try {
      const key = `progress_${gameName}`;
      const saved = wx.getStorageSync(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return { unlocked: 1, stars: {} };
  }
}

module.exports = { DailyChallenge };
