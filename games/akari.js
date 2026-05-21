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
const roundRect = require('../utils/round-rect.js');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');
const VictoryPanel = require('./components/victory-panel');
const HeaderBar = require('./components/header-bar');
const BottomBar = require('./components/bottom-bar');

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
    
    // 共享 UI 组件
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });
    
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
        const result = this.victoryPanel.handleClick(x, y);
        if (result === 'next') {
          this.victory = false;
          this.level++;
          this.loadLevel();
          this.victoryPanel.reset();
        } else if (result === 'back') {
          this.switchGame('level-select', this.gameName);
        }
        return;
      }

      // 返回按钮
      if (this.headerBar.isBackButton(x, y)) {
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
    if (this.victory) {
      this.victoryPanel.setSubtitle(`第 ${this.level} 关`);
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
      return;
    }
    const ctx = this.ctx;
    const { cellSize, offsetX, offsetY } = this.getLayout();

    // 背景
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 顶部栏（使用共享组件）
    this.headerBar.draw({ title: '💡 数灯', info: `第${this.level}关` });

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

    // 底部工具栏
    this.bottomBar.setButtons([{ id: 'undo', text: '↩️ 撤销', enabled: this.undoMgr.canUndo() }]);
    this.bottomBar.draw();

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





  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = Akari;
