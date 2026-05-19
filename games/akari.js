/**
 * akari.js - 数灯 (Akari) 微信小游戏 Canvas 版
 * 规则：点击放置灯泡(💡)/标记(X)，所有白格都要被照亮，灯泡不能互照
 *       数字格周围必须有恰好该数量的灯泡
 */
const statsManager = require('./stats-manager.js').getInstance();
const LevelLoader = require('./level-loader');
const TutorialOverlay = require('./tutorial-overlay');
const Confetti = require('./confetti');
const sound = require('./sound-manager');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');

class Akari {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;

    // 安全区域适配
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.gameName = 'akari';
    this.level = level || 1;
    this.difficulty = 'easy';

    this.grid = [];         // 0=空 1=灯泡 2=标记
    this.clues = [];        // 数字线索，-1=黑格，无值=白格
    this.size = { rows: 10, cols: 10 };
    this.victory = false;
    this.undoMgr = new UndoManager();
    this.animationTime = 0;

    this.statsKey = `progress_${this.gameName}_${this.difficulty}`;
    statsManager.startGame(this.gameName, this.level);

    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
    this.loadLevel();
  }

  async loadLevel() {
    try {
      const data = await LevelLoader.load('akari', this.level, this.difficulty);
      if (!data) { this.drawError('关卡加载失败'); return; }
      this.grid = data.grid;
      this.clues = data.clues;
      this.size = data.size || { rows: this.grid.length, cols: this.grid[0] ? this.grid[0].length : 0 };
      this.victory = false;
      this.undoMgr.clear();
      this.draw();
    } catch (e) {
      this.drawError('加载出错: ' + e.message);
    }
  }

  drawError(msg) {
    const ctx = this.ctx;
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(msg, this.width / 2, this.height / 2);
  }

  // 计算格子尺寸和偏移
  getLayout() {
    const maxW = this.width - 20;
    const maxH = this.height - 200;
    const cellSize = Math.min(maxW / this.size.cols, maxH / this.size.rows);
    const gridW = cellSize * this.size.cols;
    const gridH = cellSize * this.size.rows;
    return {
      cellSize,
      gridW,
      gridH,
      offsetX: (this.width - gridW) / 2,
      offsetY: 130
    };
  }

  bindEvents() {
    this._clickHandler = (e) => {
      this.animationTime = 0;
      
      // 规则弹窗点击
      if (this.tutorial && this.tutorial.shouldShow()) {
        const touch = e.touches ? e.touches[0] : e;
        const x = touch.clientX;
        const y = touch.clientY;
        if (this.tutorial.hitTest(x, y)) {
          this.tutorial.dismiss();
          this.draw();
        }
        return; // 弹窗显示时阻止其他点击
      }
      
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;
      
      // 规则按钮
      if (this._ruleBtn && x >= this._ruleBtn.x && x <= this._ruleBtn.x + this._ruleBtn.w && y >= this._ruleBtn.y && y <= this._ruleBtn.y + this._ruleBtn.h) {
        this.tutorial.show();
        this.draw();
        return;
      }
      
      if (this.victory) {
        this._handleVictoryClick(e);
        return;
      }

      // 返回按钮
      if (y < 70 && x < 100) {
        this.switchGame('level-select', this.gameName);
        return;
      }

      // 重开按钮
      if (y < 70 && x > this.width - 100) {
        this.undoMgr.clear();
        this.loadLevel();
        return;
      }

      const { cellSize, offsetX, offsetY } = this.getLayout();
      const col = Math.floor((x - offsetX) / cellSize);
      const row = Math.floor((y - offsetY) / cellSize);

      if (row < 0 || row >= this.size.rows || col < 0 || col >= this.size.cols) return;
      if (this.clues[row] && this.clues[row][col] >= 0) return; // 数字格不可操作

      this.undoMgr.save(this.grid.map(r => [...r]));
      sound.playClick();

      // 0→1→2→0 循环
      this.grid[row][col] = (this.grid[row][col] + 1) % 3;

      if (this.checkVictory()) {
        this.victory = true;
        this._onVictory();
      }
      this.draw();
    };
    this.canvas.addEventListener('click', this._clickHandler);
  }

  update() {
    this.animationTime += 0.05;
  }

  draw() {
    if (this.victory) { this._drawVictory(); return; }
    const ctx = this.ctx;
    const { cellSize, offsetX, offsetY } = this.getLayout();

    // 背景
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 顶栏
    this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this.ctx.beginPath();
    roundRect(this.ctx,10, 10, 80, 40, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '13px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('← 返回', 50, this.statusBarHeight + 36);

    this.ctx.beginPath();
    roundRect(this.ctx,this.width - 90, 10, 80, 40, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('🔄 重开', this.width - 50, 36);

    // 关卡标题
    this.ctx.fillStyle = '#FFB800';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`💡 数灯  第${this.level}关`, this.width / 2, 38);

    // 规则按钮（右上角）
    this._ruleBtn = { x: this.width - 50, y: 20, w: 40, h: 40 };
    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.ctx.beginPath();
    roundRect(this.ctx, this._ruleBtn.x, this._ruleBtn.y, this._ruleBtn.w, this._ruleBtn.h, 20);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 22px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('?', this._ruleBtn.x + 20, this._ruleBtn.y + 28);

    this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(20, 60);
    this.ctx.lineTo(this.width - 20, 60);
    this.ctx.stroke();

    // 网格
    for (let r = 0; r < this.size.rows; r++) {
      for (let c = 0; c < this.size.cols; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const isClue = this.clues[r] && this.clues[r][c] >= 0;
        const isBlack = this.clues[r] && this.clues[r][c] === -1;
        const cellVal = this.grid[r][c];

        if (isBlack) {
          this.ctx.fillStyle = '#222';
          this.ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          // 白格背景
          this.ctx.fillStyle = cellVal === 1 ? '#FFFBE0' : '#f5f5f5';
          this.ctx.fillRect(x, y, cellSize, cellSize);

          // 灯泡
          if (cellVal === 1) {
            const glow = Math.sin(this.animationTime * 2) * 0.1 + 0.9;
            this.ctx.globalAlpha = glow;
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
          }

          // 标记X
          if (cellVal === 2) {
            this.ctx.strokeStyle = '#888';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x + cellSize * 0.2, y + cellSize * 0.2);
            this.ctx.lineTo(x + cellSize * 0.8, y + cellSize * 0.8);
            this.ctx.moveTo(x + cellSize * 0.8, y + cellSize * 0.2);
            this.ctx.lineTo(x + cellSize * 0.2, y + cellSize * 0.8);
            this.ctx.stroke();
          }

          // 照亮效果
          if (cellVal === 1) {
            this._drawLightRays(ctx, r, c, cellSize, offsetX, offsetY);
          }
        }

        // 数字线索
        if (isClue) {
          this.ctx.fillStyle = '#333';
          this.ctx.fillRect(x, y, cellSize, cellSize);
          this.ctx.fillStyle = '#fff';
          this.ctx.font = `bold ${Math.max(14, cellSize * 0.5)}px Arial`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(this.clues[r][c], x + cellSize / 2, y + cellSize / 2);
          this.ctx.textBaseline = 'alphabetic';
        }

        // 格子边框
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 0.5;
        this.ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }

    // 撤销按钮
    if (this.undoMgr.canUndo()) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.12)';
      this.ctx.beginPath();
      roundRect(this.ctx,this.width / 2 - 50, this.height - 70, 100, 42, 8);
      this.ctx.fill();
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('↩️ 撤销', this.width / 2, this.height - 42);
    }

    // 底部操作提示
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('点击切换：空格→灯泡→标记', this.width / 2, this.height - 10);
    
    // 规则弹窗
    if (this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
  }

  _drawLightRays(ctx, row, col, cellSize, offsetX, offsetY) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
    this.ctx.lineWidth = Math.max(3, cellSize * 0.15);
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc;
      while (r >= 0 && r < this.size.rows && c >= 0 && c < this.size.cols) {
        const isBlack = this.clues[r] && this.clues[r][c] === -1;
        if (isBlack) break;
        const bx = offsetX + c * cellSize + cellSize / 2;
        const by = offsetY + r * cellSize + cellSize / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(offsetX + col * cellSize + cellSize / 2, offsetY + row * cellSize + cellSize / 2);
        this.ctx.lineTo(bx, by);
        this.ctx.stroke();
        if (this.grid[r][c] === 1) break;
        r += dr; c += dc;
      }
    }
  }

  checkVictory() {
    // 检查所有灯泡不互照
    for (let r = 0; r < this.size.rows; r++) {
      for (let c = 0; c < this.size.cols; c++) {
        if (this.grid[r][c] === 1) {
          if (this._isIlluminatedByOther(r, c)) return false;
        }
      }
    }
    // 检查所有白格被照亮
    for (let r = 0; r < this.size.rows; r++) {
      for (let c = 0; c < this.size.cols; c++) {
        const isBlack = this.clues[r] && (this.clues[r][c] === -1 || this.clues[r][c] >= 0);
        if (!isBlack && this.grid[r][c] !== 1 && !this._isLit(r, c)) return false;
      }
    }
    // 检查数字格
    for (let r = 0; r < this.size.rows; r++) {
      for (let c = 0; c < this.size.cols; c++) {
        if (this.clues[r] && this.clues[r][c] >= 0) {
          let count = 0;
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.size.rows && nc >= 0 && nc < this.size.cols) {
              if (this.grid[nr][nc] === 1) count++;
            }
          }
          if (count !== this.clues[r][c]) return false;
        }
      }
    }
    return true;
  }

  _isIlluminatedByOther(row, col) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc;
      while (r >= 0 && r < this.size.rows && c >= 0 && c < this.size.cols) {
        const isBlack = this.clues[r] && this.clues[r][c] === -1;
        if (isBlack || this.grid[r][c] === 2) break;
        if (this.grid[r][c] === 1) return true;
        r += dr; c += dc;
      }
    }
    return false;
  }

  _isLit(row, col) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc;
      while (r >= 0 && r < this.size.rows && c >= 0 && c < this.size.cols) {
        const isBlack = this.clues[r] && this.clues[r][c] === -1;
        if (isBlack || this.grid[r][c] === 2) break;
        if (this.grid[r][c] === 1) return true;
        r += dr; c += dc;
      }
    }
    return false;
  }

  _onVictory() {
    Confetti.trigger();
    sound.playVictory();
    statsManager.endGame(this.gameName, this.level, true);
    this._saveProgress();
    const am = AchievementManager.getInstance();
    am.unlock('first_win');
    if (this.level >= 10) am.unlock('akari_10');
  }

  _saveProgress() {
    try {
      const key = this.statsKey;
      const data = wx.getStorageSync(key) || { unlocked: 1, stars: {} };
      data.unlocked = Math.max(data.unlocked || 1, this.level + 1);
      wx.setStorageSync(key, data);
    } catch (e) { /* ignore */ }
  }

  _drawVictory() {
    const ctx = this.ctx;
    const W = this.width, H = this.height;

    // 背景
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, W, H);

    // 胜利卡片
    this.ctx.fillStyle = 'rgba(255,255,255,0.12)';
    this.ctx.beginPath();
    roundRect(this.ctx,W / 2 - 130, H / 2 - 120, 260, 240, 16);
    this.ctx.fill();

    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 28px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎉 通关成功！', W / 2, H / 2 - 70);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`第 ${this.level} 关`, W / 2, H / 2 - 30);

    // 下一关按钮
    const btnY = H / 2 + 10;
    const btnW = 180, btnH = 42, btnX = (W - btnW) / 2;
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.beginPath();
    roundRect(this.ctx, btnX, btnY, btnW, btnH, 21);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 17px Arial';
    this.ctx.fillText('➡️ 下一关', W / 2, btnY + 26);
    this._nextBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    // 返回选关按钮
    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.ctx.beginPath();
    roundRect(this.ctx, btnX, btnY + 52, btnW, btnH, 21);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '15px Arial';
    this.ctx.fillText('返回选关', W / 2, btnY + 78);
    this._backBtn = { x: btnX, y: btnY + 52, w: btnW, h: btnH };
  }

  _handleVictoryClick(e) {
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX, y = touch.clientY;
    const W = this.width, H = this.height;
    
    // 下一关按钮
    if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w && y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {
      this.victory = false;
      this.level++;
      this.loadLevel();
      return;
    }
    
    // 返回选关按钮
    if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w && y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
      this.switchGame('level-select', this.gameName);
      return;
    }
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = Akari;
