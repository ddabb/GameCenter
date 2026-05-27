/**
 * reward-manager.js - 统一奖励系统
 * 
 * 功能：
 *   - 通关奖励（金币/钻石）
 *   - 每日首胜奖励
 *   - 连胜奖励
 *   - 成就奖励
 *   - 商业系统核心
 */

const CheckInManager = require('./check-in');

const REWARD_CONFIG = {
  // 有难度分级的游戏
  withDifficulty: {
    easy: { baseCoins: 5, baseGems: 0 },
    medium: { baseCoins: 10, baseGems: 1 },
    hard: { baseCoins: 20, baseGems: 2 }
  },
  // 无难度但有关卡的游戏的每关基础奖励
  withLevel: { baseCoins: 3, baseGems: 0 },
  // 无关卡游戏的每次胜利奖励
  endless: { baseCoins: 2, baseGems: 0 }
};

const FIRST_WIN_BONUS = { coins: 20, gems: 2 };
const STREAK_BONUS = {
  3: { coins: 10, gems: 0, label: '3连胜' },
  5: { coins: 25, gems: 2, label: '5连胜' },
  10: { coins: 50, gems: 5, label: '10连胜' },
  20: { coins: 100, gems: 10, label: '20连胜' }
};

const DAILY_WIN_THRESHOLD = 10;
const DAILY_WIN_BONUS = { coins: 30, gems: 3 };

class RewardManager {
  constructor() {
    this.storageKey = 'reward_data';
    this.data = this._load();
  }

  _load() {
    try {
      const today = this._getToday();
      const data = wx.getStorageSync(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.date !== today) {
          return { date: today, dailyWins: 0, dailyCoins: 0, dailyGems: 0, claimHistory: {} };
        }
        if (!parsed.claimHistory) parsed.claimHistory = {};
        return parsed;
      }
    } catch (e) {}
    return { date: this._getToday(), dailyWins: 0, dailyCoins: 0, dailyGems: 0, claimHistory: {} };
  }

  _save() {
    try {
      wx.setStorageSync(this.storageKey, JSON.stringify(this.data));
    } catch (e) {}
  }

  _getToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  _addCurrency(coins, gems) {
    if (coins > 0 || gems > 0) {
      try {
        const cur = JSON.parse(wx.getStorageSync('currency') || '{"coins":0,"gems":0}');
        cur.coins = (cur.coins || 0) + coins;
        cur.gems = (cur.gems || 0) + gems;
        wx.setStorageSync('currency', JSON.stringify(cur));
      } catch (e) { /* ignore */ }
    }
  }

  _getGameType(gameName) {
    const withDifficulty = ['akari', 'tents', 'slither-link', 'one-stroke', 'nonogram', 'nurikabe', 'sokoban', 'battleship'];
    const withLevel = ['24point', 'othello', 'sweep-frog', 'merge-abc'];
    
    if (withDifficulty.includes(gameName)) return 'withDifficulty';
    if (withLevel.includes(gameName)) return 'endless';
    return 'endless';
  }

  _getLevelProgress(gameName, difficulty) {
    try {
      const key = difficulty 
        ? `progress_${gameName}_${difficulty}`
        : `progress_${gameName}`;
      const data = wx.getStorageSync(key);
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return parsed.unlocked || 1;
      }
    } catch (e) {}
    return 1;
  }

  /**
   * 核心方法：处理通关奖励
   * @param {string} gameName 游戏名称
   * @param {object} options 配置选项
   * @returns {object} 奖励详情
   */
  processVictory(gameName, options = {}) {
    const { difficulty = 'easy', level = 1, time = 0 } = options;
    
    const gameType = this._getGameType(gameName);
    const rewards = [];
    let totalCoins = 0;
    let totalGems = 0;
    let messages = [];

    // 生成关卡唯一标识，用于防重复领取
    let claimKey = null;
    if (gameType === 'withDifficulty') {
      claimKey = `${gameName}_${difficulty}_${level}`;
    } else {
      claimKey = `${gameName}_${level}`;
    }

    // 检查该关卡是否已领取过奖励（仅关卡游戏需要检查）
    const isLevelGame = ['akari', 'tents', 'slither-link', 'one-stroke', 'nonogram', 'nurikabe', 'sokoban', 'battleship'].includes(gameName);
    if (isLevelGame) {
      if (this.data.claimHistory[claimKey]) {
        // 已领取过奖励，返回空
        return {
          coins: 0,
          gems: 0,
          rewards: [],
          messages: ['📌 该关卡已领取过奖励'],
          dailyWins: this.data.dailyWins,
          dailyCoins: this.data.dailyCoins,
          dailyGems: this.data.dailyGems
        };
      }
    }

    // 1. 基础奖励
    if (gameType === 'withDifficulty') {
      const cfg = REWARD_CONFIG.withDifficulty[difficulty] || REWARD_CONFIG.withDifficulty.easy;
      totalCoins += cfg.baseCoins;
      totalGems += cfg.baseGems;
      rewards.push({ type: 'base', ...cfg });
    } else {
      totalCoins += REWARD_CONFIG.endless.baseCoins;
      rewards.push({ type: 'base', ...REWARD_CONFIG.endless });
    }

    // 2. 每日首胜奖励
    if (this.data.dailyWins === 0) {
      totalCoins += FIRST_WIN_BONUS.coins;
      totalGems += FIRST_WIN_BONUS.gems;
      rewards.push({ type: 'firstWin', ...FIRST_WIN_BONUS });
      messages.push('🎁 今日首胜!');
    }

    // 3. 每日N胜奖励
    this.data.dailyWins++;
    if (this.data.dailyWins >= DAILY_WIN_THRESHOLD && !this.data.dailyWinBonusClaimed) {
      totalCoins += DAILY_WIN_BONUS.coins;
      totalGems += DAILY_WIN_BONUS.gems;
      rewards.push({ type: 'dailyWins', ...DAILY_WIN_BONUS });
      messages.push(`🏆 今日${DAILY_WIN_THRESHOLD}胜!`);
      this.data.dailyWinBonusClaimed = true;
    }

    // 4. 连胜奖励（仅对有难度的游戏）
    if (gameType === 'withDifficulty') {
      const streakKey = difficulty ? `streak_${difficulty}` : 'streak';
      const yesterday = this._getYesterday();
      
      if (this.data.lastPlayDate === yesterday) {
        this.data[streakKey] = (this.data[streakKey] || 0) + 1;
      } else {
        this.data[streakKey] = 1;
      }
      this.data.lastPlayDate = this._getToday();

      const streak = this.data[streakKey] || 1;
      for (const [threshold, bonus] of Object.entries(STREAK_BONUS)) {
        if (streak >= parseInt(threshold)) {
          totalCoins += bonus.coins;
          totalGems += bonus.gems;
          if (!this.data[`streak_${threshold}_claimed_${this._getToday()}`]) {
            rewards.push({ type: 'streak', streak: threshold, ...bonus });
            messages.push(`🔥 ${bonus.label}!`);
            this.data[`streak_${threshold}_claimed_${this._getToday()}`] = true;
          }
        }
      }
    }

    // 5. 限时奖励（基于通关时间）
    if (time > 0 && time < 60) {
      const timeBonus = Math.max(0, Math.floor((60 - time) / 10));
      if (timeBonus > 0) {
        totalCoins += timeBonus;
        rewards.push({ type: 'timeBonus', coins: timeBonus, gems: 0 });
        messages.push(`⚡ 快速通关+${timeBonus}`);
      }
    }

    // 6. 记录并发放奖励
    this.data.dailyCoins += totalCoins;
    this.data.dailyGems += totalGems;
    
    // 标记该关卡已领取过奖励（仅关卡游戏需要标记）
    if (isLevelGame) {
      this.data.claimHistory[claimKey] = true;
    }
    
    this._save();

    if (totalCoins > 0 || totalGems > 0) {
      this._addCurrency(totalCoins, totalGems);
    }

    return {
      coins: totalCoins,
      gems: totalGems,
      rewards,
      messages,
      dailyWins: this.data.dailyWins,
      dailyCoins: this.data.dailyCoins,
      dailyGems: this.data.dailyGems
    };
  }

  _getYesterday() {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * 获取每日统计
   */
  getDailyStats() {
    return {
      dailyWins: this.data.dailyWins,
      dailyCoins: this.data.dailyCoins,
      dailyGems: this.data.dailyGems,
      dailyWinBonusClaimed: this.data.dailyWinBonusClaimed || false
    };
  }

  /**
   * 获取连胜状态
   */
  getStreak(gameName, difficulty) {
    const key = difficulty ? `streak_${difficulty}` : 'streak';
    return this.data[key] || 0;
  }

  /**
   * 显示奖励提示
   */
  showRewardToast(result) {
    if (result.coins > 0 || result.gems > 0) {
      const parts = [];
      if (result.coins > 0) parts.push(`💰+${result.coins}`);
      if (result.gems > 0) parts.push(`💎+${result.gems}`);
      
      if (parts.length > 0) {
        wx.showToast({
          title: parts.join(' ') + (result.messages.length > 0 ? ' ' + result.messages[0] : ''),
          icon: 'none',
          duration: 2000
        });
      }
    } else if (result.messages && result.messages.length > 0) {
      // 显示提示信息（如已领取过奖励）
      wx.showToast({
        title: result.messages[0],
        icon: 'none',
        duration: 2000
      });
    }
  }

  /**
   * 计算预计奖励（用于UI展示）
   */
  estimateReward(gameName, options = {}) {
    const { difficulty = 'easy' } = options;
    const gameType = this._getGameType(gameName);
    
    let base = 0;
    if (gameType === 'withDifficulty') {
      const cfg = REWARD_CONFIG.withDifficulty[difficulty] || REWARD_CONFIG.withDifficulty.easy;
      base = cfg.baseCoins;
    } else {
      base = REWARD_CONFIG.endless.baseCoins;
    }

    const isFirstWin = this.data.dailyWins === 0;
    const bonus = isFirstWin ? FIRST_WIN_BONUS.coins : 0;

    return {
      baseCoins: base,
      firstWinBonus: isFirstWin ? FIRST_WIN_BONUS.coins : 0,
      totalEstimate: base + bonus,
      dailyWins: this.data.dailyWins,
      dailyWinProgress: `${Math.min(this.data.dailyWins, DAILY_WIN_THRESHOLD)}/${DAILY_WIN_THRESHOLD}`
    };
  }

  /**
   * 重置（用于测试）
   */
  reset() {
    this.data = { date: this._getToday(), dailyWins: 0, dailyCoins: 0, dailyGems: 0 };
    this._save();
  }
}

let _instance = null;

function getInstance() {
  if (!_instance) {
    _instance = new RewardManager();
  }
  return _instance;
}

module.exports = { RewardManager, getInstance, REWARD_CONFIG };
