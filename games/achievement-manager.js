/**
 * achievement-manager.js — 成就系统
 * 
 * 成就类型：
 *   first_win_{game} — 某游戏首次通关
 *   win_10_{game} — 某游戏通关10关
 *   win_50_{game} — 某游戏通关50关
 *   all_game_first — 所有游戏至少通关1关
 *   total_100 — 总计通关100关
 */

const ACHIEVEMENTS = [
  { id: 'all_game_first', title: '全面发展', desc: '所有游戏至少通关1关', icon: '🏆' },
  { id: 'total_100', title: '百关斩将', desc: '总计通关100关', icon: '💯' },
];

// 动态成就：每个游戏的里程碑
const GAMES = ['othello', 'akari', 'sokoban', 'nurikabe', 'tents', '24point', 'slither-link', 'nonogram', 'battleship', 'merge-abc'];
const GAME_TITLES = {
  'othello': '黑白棋', 'akari': '数灯', 'sokoban': '推箱子', 'nurikabe': '数墙',
  'tents': '帐篷', '24point': '24点', 'slither-link': '数回', 'nonogram': '数织',
  'battleship': '海战', 'merge-abc': 'ABC合成'
};

GAMES.forEach(g => {
  ACHIEVEMENTS.push({ id: `first_win_${g}`, title: `${GAME_TITLES[g]}入门`, desc: `首次通关${GAME_TITLES[g]}`, icon: '🌟' });
  ACHIEVEMENTS.push({ id: `win_10_${g}`, title: `${GAME_TITLES[g]}能手`, desc: `通关${GAME_TITLES[g]} 10关`, icon: '⭐' });
  ACHIEVEMENTS.push({ id: `win_50_${g}`, title: `${GAME_TITLES[g]}达人`, desc: `通关${GAME_TITLES[g]} 50关`, icon: '🏅' });
});

class AchievementManager {
  constructor() {
    this.storageKey = 'achievements';
    this.data = this._load();
  }

  _load() {
    try {
      const d = wx.getStorageSync(this.storageKey);
      return d ? JSON.parse(d) : { unlocked: {}, newlyUnlocked: [] };
    } catch (e) {
      return { unlocked: {}, newlyUnlocked: [] };
    }
  }

  _save() {
    try {
      wx.setStorageSync(this.storageKey, JSON.stringify(this.data));
    } catch (e) {}
  }

  /**
   * 检查并解锁成就（每次通关后调用）
   * @param {string} gameName 游戏名
   * @param {number} winCount 该游戏通关数
   * @returns {Array} 新解锁的成就列表
   */
  check(gameName, winCount) {
    const newly = [];
    const milestones = [
      { count: 1, suffix: 'first_win' },
      { count: 10, suffix: 'win_10' },
      { count: 50, suffix: 'win_50' }
    ];

    milestones.forEach(m => {
      if (winCount >= m.count) {
        const id = `${m.suffix}_${gameName}`;
        if (!this.data.unlocked[id]) {
          this.data.unlocked[id] = Date.now();
          newly.push(ACHIEVEMENTS.find(a => a.id === id));
        }
      }
    });

    // 检查"所有游戏首次通关"
    const gameKeys = GAMES.map(g => `first_win_${g}`);
    if (gameKeys.every(k => this.data.unlocked[k]) && !this.data.unlocked['all_game_first']) {
      this.data.unlocked['all_game_first'] = Date.now();
      newly.push(ACHIEVEMENTS.find(a => a.id === 'all_game_first'));
    }

    // 检查"总计100关"
    let totalWins = 0;
    GAMES.forEach(g => {
      try {
        const p = JSON.parse(wx.getStorageSync(`progress_${g}`) || '{}');
        totalWins += p.unlocked || 0;
      } catch (e) {}
    });
    if (totalWins >= 100 && !this.data.unlocked['total_100']) {
      this.data.unlocked['total_100'] = Date.now();
      newly.push(ACHIEVEMENTS.find(a => a.id === 'total_100'));
    }

    if (newly.length > 0) {
      this.data.newlyUnlocked = newly.map(a => a.id);
      this._save();
    }

    return newly;
  }

  /**
   * 获取新解锁的成就（弹窗用），获取后清空
   */
  getNewlyUnlocked() {
    const ids = this.data.newlyUnlocked || [];
    if (ids.length === 0) return null;
    this.data.newlyUnlocked = [];
    this._save();
    return ids.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
  }

  /**
   * 获取所有成就状态（成就页面用）
   */
  getAll() {
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: !!this.data.unlocked[a.id],
      unlockedAt: this.data.unlocked[a.id] || null
    }));
  }

  /**
   * 获取已解锁数量
   */
  getUnlockedCount() {
    return Object.keys(this.data.unlocked).length;
  }

  /**
   * 获取总数
   */
  getTotalCount() {
    return ACHIEVEMENTS.length;
  }
}

module.exports = { AchievementManager, ACHIEVEMENTS };
