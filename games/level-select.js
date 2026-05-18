// level-select.js - 选关页面（支持难度分级）
const LevelLoader = require('./level-loader');
const UndoManager = require('./undo-manager');

// 支持难度分级的游戏列表
const SUPPORT_DIFFICULTY = ['akari', 'tents', 'slither-link'];

Page({
  data: {
    gameName: '',
    displayName: '',
    difficulty: 'easy',
    difficulties: [],
    showDifficultyTabs: false,
    levels: [],
    unlocked: 1,
    currentPage: 0,
    pageSize: 20
  },

  onLoad(options) {
    const gameName = options.game || 'akari';
    const difficulty = options.difficulty || 'easy';
    const gameNames = {
      'akari': '数灯', 'battleship': '海战', 'nonogram': '数织',
      'nurikabe': '数墙', 'one-stroke': '一笔画', 'slither-link': '数回',
      'sokoban': '推箱子', 'tents': '帐篷', '24point': '24点',
      'othello': '黑白棋', 'sudoku-solver': '数独求解',
      'sudoku-generator': '数独生成', 'number-one': '数字其一'
    };

    const showDifficultyTabs = SUPPORT_DIFFICULTY.includes(gameName);
    const difficulties = showDifficultyTabs ? [
      { key: 'easy', label: '简单' },
      { key: 'medium', label: '普通' },
      { key: 'hard', label: '困难' }
    ] : [];

    this.setData({
      gameName,
      displayName: gameNames[gameName] || gameName,
      difficulty,
      difficulties,
      showDifficultyTabs
    });

    this.loadProgress();
    this.loadLevels();
  },

  // 加载进度（按难度独立存储）
  loadProgress() {
    const key = `progress_${this.data.gameName}_${this.data.difficulty}`;
    try {
      const data = tt.getStorageSync(key);
      if (data && data.unlocked) {
        this.setData({ unlocked: data.unlocked });
      } else {
        this.setData({ unlocked: 1 });
      }
    } catch (e) {
      this.setData({ unlocked: 1 });
    }
  },

  // 保存进度
  saveProgress(level) {
    const key = `progress_${this.data.gameName}_${this.data.difficulty}`;
    const unlocked = Math.max(this.data.unlocked, level + 1);
    this.setData({ unlocked });
    try {
      tt.setStorageSync(key, { unlocked, stars: {} });
    } catch (e) {
      console.error('保存进度失败', e);
    }
  },

  // 加载关卡列表（按难度过滤）
  loadLevels() {
    const { gameName, difficulty } = this.data;
    const levels = [];

    // 通过 level-loader 获取总关卡数
    // 简单做法：尝试加载直到失败
    let maxLevel = this.getMaxLevel(gameName, difficulty);
    
    for (let i = 1; i <= maxLevel; i++) {
      levels.push({
        level: i,
        locked: i > this.data.unlocked,
        stars: 0
      });
    }

    // 读取星星数据
    try {
      const key = `progress_${gameName}_${difficulty}`;
      const data = tt.getStorageSync(key);
      if (data && data.stars) {
        levels.forEach(l => {
          if (data.stars[l.level]) {
            l.stars = data.stars[l.level];
          }
        });
      }
    } catch (e) { /* ignore */ }

    this.setData({ levels, currentPage: 0 });
  },

  // 获取某难度最大关卡数
  getMaxLevel(gameName, difficulty) {
    // 各游戏各难度关卡数（从数据源已知）
    const levelCounts = {
      'akari': { easy: 1000, medium: 1000, hard: 1000 },
      'tents': { easy: 1000, medium: 1000, hard: 1000 },
      'slither-link': { easy: 1000, medium: 1000, hard: 1000 }
    };
    if (levelCounts[gameName]) {
      return levelCounts[gameName][difficulty] || 1000;
    }
    // 默认尝试直到失败（保守做法）
    return 100;
  },

  // 难度 Tab 点击
  onTabTap(e) {
    const difficulty = e.currentTarget.dataset.diff;
    if (difficulty === this.data.difficulty) return;
    
    this.setData({ difficulty });
    this.loadProgress();
    this.loadLevels();
  },

  // 点击关卡
  onLevelTap(e) {
    const level = e.currentTarget.dataset.level;
    if (level > this.data.unlocked) {
      tt.showToast({ title: '请先通关前一关', icon: 'none' });
      return;
    }
    tt.navigateTo({
      url: `./game.js?game=${this.data.gameName}&level=${level}&difficulty=${this.data.difficulty}`
    });
  },

  // 返回菜单
  onBack() {
    tt.navigateBack();
  },

  // 分页加载（上拉刷新）
  onReachBottom() {
    const { levels, currentPage, pageSize } = this.data;
    const totalPages = Math.ceil(levels.length / pageSize);
    if (currentPage >= totalPages - 1) return;
    this.setData({ currentPage: currentPage + 1 });
  }
});
