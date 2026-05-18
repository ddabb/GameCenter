/**
 * daily-challenge.js — 每日挑战系统
 * 
 * 基于日期生成当日挑战关卡（所有玩家同一天相同关卡）
 * 挑战完成记录存储在 storage
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
      const d = tt.getStorageSync(this.storageKey);
      return d ? JSON.parse(d) : { completed: {} };
    } catch (e) {
      return { completed: {} };
    }
  }

  _save() {
    try {
      tt.setStorageSync(this.storageKey, JSON.stringify(this.data));
    } catch (e) {}
  }

  /**
   * 获取今日日期字符串 YYYY-MM-DD
   */
  _today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * 简单哈希（用于根据日期生成关卡号）
   */
  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * 获取今日挑战
   * @returns {{ date, game, gameTitle, level }}
   */
  getToday() {
    const date = this._today();
    const hash = this._hash(date + 'solvepuzzle');
    const gameIndex = hash % GAMES.length;
    const game = GAMES[gameIndex];
    const level = (hash % 1000) + 1; // 1-1000关

    return {
      date,
      game,
      gameTitle: GAME_TITLES[game],
      level,
      completed: !!this.data.completed[date]
    };
  }

  /**
   * 标记今日挑战完成
   */
  complete() {
    this.data.completed[this._today()] = true;
    this._save();
  }

  /**
   * 获取连续打卡天数
   */
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

  /**
   * 获取总完成天数
   */
  getTotalCompleted() {
    return Object.keys(this.data.completed).length;
  }
}

module.exports = { DailyChallenge };
