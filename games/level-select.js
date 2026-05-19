/**
 * level-select.js - 选关页面（Canvas版，支持难度分级）
 */
const LevelLoader = require('./level-loader');

const GAME_NAMES = {
  'othello': '黑白棋', 'akari': '数灯', 'sokoban': '推箱子',
  'nurikabe': '数墙', 'tents': '帐篷', '24point': '24点',
  'slither-link': '数回', 'nonogram': '数织', 'battleship': '海战',
  'merge-abc': 'ABC合成'
};

const SUPPORT_DIFFICULTY = ['akari', 'tents', 'slither-link'];

const LEVEL_COUNTS = {
  'akari': { easy: 1000, medium: 1000, hard: 1000 },
  'tents': { easy: 1000, medium: 1000, hard: 1000 },
  'slither-link': { easy: 1000, medium: 1000, hard: 1000 }
};

class LevelSelect {
  constructor(ctx, canvas, systemInfo, switchGame, gameName) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.gameName = gameName || 'akari';

    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    
    // 安全区域适配
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    // 状态
    this.difficulty = 'easy';
    this.unlocked = 1;
    this.stars = {};
    this.currentPage = 0;
    this.pageSize = 50;
    this.showDifficultyTabs = SUPPORT_DIFFICULTY.includes(this.gameName);
    this.difficulties = this.showDifficultyTabs ? [
      { key: 'easy', label: '简单' },
      { key: 'medium', label: '普通' },
      { key: 'hard', label: '困难' }
    ] : [];

    // 关卡总数
    this.totalLevels = LEVEL_COUNTS[this.gameName]
      ? LEVEL_COUNTS[this.gameName][this.difficulty]
      : 30;

    // 布局
    this.padding = 15;
    this.backBtn = { x: 10, y: this.statusBarHeight + 10, w: 50, h: 35 };
    this.titleY = this.statusBarHeight + 55;
    this.tabY = this.statusBarHeight + 75;
    this.tabH = 32;
    this.gridStartY = this.tabY + (this.showDifficultyTabs ? this.tabH + 10 : 10);
    this.cols = 5;
    this.cellSize = Math.min(
      (this.width - this.padding * 2) / this.cols - 6,
      60
    );
    this.cellGap = 6;
    this.rowsPerPage = Math.floor((this.height - this.gridStartY - 20) / (this.cellSize + this.cellGap));
    this.cellRadius = 8;

    // 加载进度
    this._loadProgress();
    this._loadStars();

    this._clickHandler = this._onClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
  }

  _storageKey() {
    return `progress_${this.gameName}_${this.difficulty}`;
  }

  _loadProgress() {
    try {
      const data = wx.getStorageSync(this._storageKey());
      this.unlocked = (data && data.unlocked) ? data.unlocked : 1;
    } catch (e) {
      this.unlocked = 1;
    }
  }

  _loadStars() {
    try {
      const data = wx.getStorageSync(this._storageKey());
      this.stars = (data && data.stars) ? data.stars : {};
    } catch (e) {
      this.stars = {};
    }
  }

  _saveProgress(level) {
    if (level >= this.unlocked) {
      this.unlocked = level + 1;
      try {
        wx.setStorageSync(this._storageKey(), { unlocked: this.unlocked, stars: this.stars });
      } catch (e) { /* ignore */ }
    }
  }

  _onClick(e) {
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX;
    const y = touch.clientY;

    // 返回按钮
    if (x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.w &&
        y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.h) {
      this.switchGame('menu');
      return;
    }

    // 难度 Tab
    if (this.showDifficultyTabs) {
      const tabW = (this.width - this.padding * 2) / this.difficulties.length;
      for (let i = 0; i < this.difficulties.length; i++) {
        const tabX = this.padding + i * tabW;
        if (x >= tabX && x <= tabX + tabW && y >= this.tabY && y <= this.tabY + this.tabH) {
          const diff = this.difficulties[i].key;
          if (diff !== this.difficulty) {
            this.difficulty = diff;
            this.totalLevels = LEVEL_COUNTS[this.gameName][diff];
            this._loadProgress();
            this._loadStars();
            this.currentPage = 0;
            this.draw();
          }
          return;
        }
      }
    }

    // 关卡按钮
    const startIdx = this.currentPage * this.rowsPerPage * this.cols;
    const endIdx = Math.min(startIdx + this.rowsPerPage * this.cols, this.totalLevels);
    const gridW = this.cols * this.cellSize + (this.cols - 1) * this.cellGap;
    const startX = (this.width - gridW) / 2;

    for (let idx = startIdx; idx < endIdx; idx++) {
      const localIdx = idx - startIdx;
      const col = localIdx % this.cols;
      const row = Math.floor(localIdx / this.cols);
      const cx = startX + col * (this.cellSize + this.cellGap);
      const cy = this.gridStartY + row * (this.cellSize + this.cellGap);

      if (x >= cx && x <= cx + this.cellSize && y >= cy && y <= cy + this.cellSize) {
        if (idx + 1 <= this.unlocked) {
          this.switchGame(this.gameName, idx + 1);
        } else {
          wx.showToast({ title: '请先通关前一关', icon: 'none' });
        }
        return;
      }
    }

    // 上/下一页
    const pageBtnW = 60;
    if (this.currentPage > 0 &&
        x >= this.padding && x <= this.padding + pageBtnW &&
        y >= this.height - 50 && y <= this.height - 10) {
      this.currentPage--;
      this.draw();
    }
    const maxPage = Math.ceil(this.totalLevels / (this.rowsPerPage * this.cols)) - 1;
    if (this.currentPage < maxPage &&
        x >= this.width - this.padding - pageBtnW && x <= this.width - this.padding &&
        y >= this.height - 50 && y <= this.height - 10) {
      this.currentPage++;
      this.draw();
    }
  }

  update() { /* 无动画 */ }

  draw() {
    const ctx = this.ctx;
    const W = this.width, H = this.height;

    // 背景
    const grad = this.ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, W, H);

    // 返回按钮
    this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.backBtn.x, this.backBtn.y, this.backBtn.w, this.backBtn.h, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('← 返回', this.backBtn.x + this.backBtn.w / 2, this.backBtn.y + this.backBtn.h / 2 + 5);

    // 标题
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(GAME_NAMES[this.gameName] || this.gameName, W / 2, this.titleY);

    // 难度 Tabs
    if (this.showDifficultyTabs) {
      const tabW = (W - this.padding * 2) / this.difficulties.length;
      this.difficulties.forEach((d, i) => {
        const tx = this.padding + i * tabW;
        const active = d.key === this.difficulty;
        this.ctx.fillStyle = active ? '#2196F3' : 'rgba(255,255,255,0.1)';
        this.ctx.beginPath();
        roundRect(this.ctx,tx + 2, this.tabY, tabW - 4, this.tabH, 6);
        this.ctx.fill();
        this.ctx.fillStyle = active ? '#fff' : 'rgba(255,255,255,0.6)';
        this.ctx.font = '13px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(d.label, tx + tabW / 2, this.tabY + this.tabH / 2 + 5);
      });
    }

    // 关卡网格
    const gridW = this.cols * this.cellSize + (this.cols - 1) * this.cellGap;
    const startX = (W - gridW) / 2;
    const startIdx = this.currentPage * this.rowsPerPage * this.cols;
    const endIdx = Math.min(startIdx + this.rowsPerPage * this.cols, this.totalLevels);

    for (let idx = startIdx; idx < endIdx; idx++) {
      const localIdx = idx - startIdx;
      const col = localIdx % this.cols;
      const row = Math.floor(localIdx / this.cols);
      const cx = startX + col * (this.cellSize + this.cellGap);
      const cy = this.gridStartY + row * (this.cellSize + this.cellGap);
      const locked = idx + 1 > this.unlocked;
      const star = this.stars[idx + 1] || 0;

      // 格子背景
      this.ctx.fillStyle = locked ? '#333' : '#2196F3';
      this.ctx.beginPath();
      roundRect(this.ctx,cx, cy, this.cellSize, this.cellSize, this.cellRadius);
      this.ctx.fill();

      // 锁或数字
      this.ctx.fillStyle = locked ? '#888' : '#fff';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(locked ? '🔒' : (idx + 1), cx + this.cellSize / 2, cy + this.cellSize / 2 + 6);

      // 星星
      if (star > 0 && !locked) {
        const starY = cy + this.cellSize - 10;
        const starStr = star >= 3 ? '⭐⭐⭐' : star >= 2 ? '⭐⭐' : '⭐';
        this.ctx.font = '8px Arial';
        this.ctx.fillText(starStr, cx + this.cellSize / 2, starY);
      }
    }

    // 分页按钮
    const maxPage = Math.ceil(this.totalLevels / (this.rowsPerPage * this.cols)) - 1;
    this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this.ctx.font = '13px Arial';

    if (this.currentPage > 0) {
      this.ctx.beginPath();
      roundRect(this.ctx,this.padding, H - 50, 60, 36, 8);
      this.ctx.fill();
      this.ctx.fillStyle = '#fff';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('← 上一页', this.padding + 30, H - 27);
    }

    if (this.currentPage < maxPage) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this.ctx.beginPath();
      roundRect(this.ctx,W - this.padding - 60, H - 50, 60, 36, 8);
      this.ctx.fill();
      this.ctx.fillStyle = '#fff';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('下一页 →', W - this.padding - 30, H - 27);
    }

    // 页码
    this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`第 ${this.currentPage + 1} / ${maxPage + 1} 页`, W / 2, H - 27);
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = LevelSelect;
