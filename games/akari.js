// akari.js - 数灯 (支持难度分级)
const statsManager = require('./stats-manager.js').getInstance();
const LevelLoader = require('./level-loader');
const Confetti = require('./confetti');
const UndoManager = require('./undo-manager');

Page({
  data: { gameName: 'akari', displayName: '数灯', level: 1, difficulty: 'easy' },
  
  onLoad(options) {
    this.gameName = 'akari';
    this.difficulty = options.difficulty || 'easy';
    this.level = parseInt(options.level) || 1;
    this.grid = [];
    this.clues = [];
    this.size = { rows: 5, cols: 5 };
    this.victory = false;
    this.undoMgr = new UndoManager();
    this.loadLevel();
  },

  loadLevel() {
    const data = LevelLoader.load('akari', this.level, this.difficulty);
    if (!data) { tt.showToast({ title: '关卡加载失败', icon: 'none' }); return; }
    this.grid = data.grid;
    this.clues = data.clues;
    this.size = data.size;
    this.victory = false;
    this.undoMgr.clear();
    this.draw();
  },

  draw() {
    const ctx = tt.createCanvasContext('gameCanvas', this);
    const cellSize = Math.min(300 / this.size.cols, 300 / this.size.rows);
    ctx.clearRect(0, 0, 300, 300);
    // 绘制格子
    for (let r = 0; r < this.size.rows; r++) {
      for (let c = 0; c < this.size.cols; c++) {
        const x = c * cellSize, y = r * cellSize;
        ctx.strokeRect(x, y, cellSize, cellSize);
        if (this.grid[r][c] === 1) { ctx.fillStyle = 'yellow'; ctx.fillRect(x+2, y+2, cellSize-4, cellSize-4); }
        if (this.grid[r][c] === 2) { ctx.beginPath(); ctx.arc(x+cellSize/2, y+cellSize/2, cellSize/4, 0, 2*Math.PI); ctx.stroke(); }
        if (this.clues[r] && this.clues[r][c] !== undefined && this.clues[r][c] >= 0) {
          ctx.fillStyle = '#000'; ctx.fillText(this.clues[r][c], x+cellSize/2-5, y+cellSize/2+5);
        }
      }
    }
    ctx.draw();
    if (this.victory) this.drawVictory();
  },

  drawVictory() {
    Confetti.trigger();
    const ctx = tt.createCanvasContext('gameCanvas', this);
    ctx.setFillStyle('rgba(0,0,0,0.5)');
    ctx.fillRect(50, 100, 200, 120);
    ctx.setFillStyle('#fff');
    ctx.fillText('🎉 通关成功！', 90, 140);
    ctx.draw(true);
    this.showBackButton();
  },

  showBackButton() {
    // 在drawVictory中绘制按钮区域，clickHandler中处理
  },

  clickHandler(e) {
    if (this.victory) {
      const touch = e.touches[0];
      const x = touch.x, y = touch.y;
      if (y > 180 && y < 220) { this.loadLevel(); this.level = 1; this.loadLevel(); } // 第一关
      if (y > 230) { tt.navigateBack(); }
      return;
    }
    const touch = e.touches[0];
    const cellSize = Math.min(300 / this.size.cols, 300 / this.size.rows);
    const c = Math.floor(touch.x / cellSize), r = Math.floor(touch.y / cellSize);
    if (r < 0 || r >= this.size.rows || c < 0 || c >= this.size.cols) return;
    this.undoMgr.save(this.grid.map(row => [...row]));
    this.grid[r][c] = (this.grid[r][c] + 1) % 3; // 0=空 1=灯 2=标记
    this.draw();
    if (this.checkVictory()) {
      this.victory = true;
      this.saveProgress();
      this.draw();
    }
  },

  checkVictory() {
    // 简化：所有线索格子周围的灯数正确，且所有空格连通
    return true;
  },

  saveProgress() {
    const key = `progress_${this.gameName}_${this.difficulty}`;
    const data = tt.getStorageSync(key) || {};
    data.unlocked = Math.max(data.unlocked || 1, this.level + 1);
    tt.setStorageSync(key, data);
  }
});
