/**
 * akari.js - 数灯 (Akari) 微信小游戏 Canvas 版
 * 规则：点击放置灯泡(💡)/标记(X)，所有白格都要被照亮，灯泡不能互照
 *       数字格周围必须有恰好该数量的灯泡
 */
const LevelLoader = require('./level-loader');
const statsManager = require('./stats-manager.js').getInstance();
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const Confetti = require('./confetti');
const roundRect = require('../utils/round-rect.js');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { HintManager } = require('./hint-manager');
const { ShareCard } = require('./share-card');
const VictoryPanel = require('./components/victory-panel');
const HeaderBar = require('./components/header-bar');
const BottomBar = require('./components/bottom-bar');
const { getInstance: getRewardManager } = require('./reward-manager');

const CELL_WHITE = 0;
const CELL_BLACK = 1;
const CELL_BLACK_0 = 2;
const CELL_BLACK_1 = 3;
const CELL_BLACK_2 = 4;
const CELL_BLACK_3 = 5;
const CELL_BLACK_4 = 6;

const CELL_EMPTY = 0;
const CELL_LIGHT = 1;
const CELL_MARK = 2;

const DIFFICULTY_CONFIG = {
  easy: { text: '简单', size: 7 },
  medium: { text: '中等', size: 10 },
  hard: { text: '困难', size: 12 }
};

const LEVEL_COUNTS = { easy: 1000, medium: 1000, hard: 1000 };

function mapCell(cell) {
  if (typeof cell === 'number') return cell;
  if (cell === " " || cell === "." || cell === 0) return CELL_WHITE;
  if (cell === "#" || cell === -1) return CELL_BLACK;
  const num = parseInt(cell, 10);
  if (isNaN(num) || num < 0 || num > 4) return CELL_BLACK;
  return CELL_BLACK_0 + num;
}

class Akari {
  constructor(ctx, canvas, systemInfo, switchGame, level, difficulty = 'easy') {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.gameName = 'akari';
    this.level = level || 1;
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
    
    this.grid = [];
    this.lights = [];
    this.lit = [];
    this.size = this.config.size;
    this.victory = false;
    this.showAnswer = false;
    this.showVerify = false;
    this.animationTime = 0;
    this.timer = 0;
    this.timerInterval = null;
    this.jumpInputValue = '';
    this._currentPuzzle = null;
    
    this.undoMgr = new UndoManager();
    this.hintMgr = new HintManager(3);
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = new AchievementManager();
    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight, {
      bgColor: '#fef0f5',
      textColor: '#333',
      infoColor: '#888',
      backColor: 'rgba(0,0,0,0.5)',
      titleFontSize: 18,
      infoFontSize: 12,
      height: 48
    });
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });

    this._calcLayout();
    this.bindEvents();
    this.loadLevel();
  }

  _calcLayout() {
    const statsBarH = 36;
    const headerH = this.statusBarHeight + 54 + statsBarH + 10;
    const maxW = this.width - 20;
    const maxH = this.height - (headerH + 180);
    this.cellSize = Math.min(maxW / this.size, maxH / this.size, 45);
    this.gridW = this.cellSize * this.size;
    this.gridH = this.cellSize * this.size;
    this.offsetX = (this.width - this.gridW) / 2;
    this.offsetY = headerH + (maxH - this.gridH) / 2;
  }

  async loadLevel() {
    this.confetti.stop();
    this.undoMgr.clear();
    this.hintMgr.reset();
    this.stopTimer();
    this.victory = false;
    this.showAnswer = false;
    this.timer = 0;

    try {
      const data = await LevelLoader.load('akari', this.level, this.difficulty);
      if (data && data.grid) {
        this._applyPuzzle(data);
        return;
      }
    } catch (e) {
      console.log('[Akari] CDN加载失败');
    }

    this._loadFallback();
  }

  _applyPuzzle(puzzleData) {
    const declaredSize = puzzleData.size || this.config.size;

    this.grid = puzzleData.grid.map(row => {
      if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
        if (row.value) return (Array.isArray(row.value) ? row.value : String(row.value).split('')).map(mapCell);
        if (row.grid) return (Array.isArray(row.grid) ? row.grid : String(row.grid).split('')).map(mapCell);
      }
      if (!Array.isArray(row)) return String(row).split('').map(mapCell);
      return row.map(cell => {
        if (typeof cell === 'object' && cell !== null) {
          return cell.value !== undefined ? mapCell(cell.value) : (cell.val !== undefined ? mapCell(cell.val) : mapCell(cell));
        }
        return mapCell(cell);
      });
    });

    // 以实际grid行数为准，防止size与数据不匹配导致越界
    const actualSize = Math.max(this.grid.length, this.grid[0] ? this.grid[0].length : 0);
    const size = actualSize || declaredSize;
    this.size = size;
    this._calcLayout();

    this.lights = Array(size).fill(null).map(() => Array(size).fill(false));
    this.lit = Array(size).fill(null).map(() => Array(size).fill(false));
    this._currentPuzzle = { grid: this.grid, answer: puzzleData.answer || null };
    this.maxLights = puzzleData.maxLights || 0;
    this.lightsCount = 0;
    
    this.updateLit();
    this.startTimer();
    this.draw();
  }

  _loadFallback() {
    const size = this.config.size;
    this.size = size;
    this._calcLayout();
    
    const gridData = [];
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        if (r === 0 || r === size - 1 || c === 0 || c === size - 1) {
          row.push(CELL_BLACK_0);
        } else {
          row.push(CELL_WHITE);
        }
      }
      gridData.push(row);
    }
    
    this._applyPuzzle({ size, grid: gridData });
  }

  startTimer() {
    this.stopTimer();
    this.timer = 0;
    this.timerInterval = setInterval(() => {
      this.timer++;
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  updateLit() {
    const size = this.size;
    this.lit = Array(size).fill(null).map(() => Array(size).fill(false));
    const rows = Math.min(size, this.grid.length);

    for (let r = 0; r < rows; r++) {
      const cols = Math.min(size, this.grid[r] ? this.grid[r].length : 0);
      for (let c = 0; c < cols; c++) {
        if (!this.lights[r] || !this.lights[r][c]) continue;
        this.lit[r][c] = true;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (this.grid[nr][nc] >= CELL_BLACK) break;
            this.lit[nr][nc] = true;
            nr += dr;
            nc += dc;
          }
        }
      }
    }
  }

  bindEvents() {
    this._clickHandler = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;

      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }

      const action = this.bottomBar.handleClick(x, y);
      if (action) {
        this._handleBottomAction(action);
        return;
      }

      if (this.headerBar.isBackButton(x, y)) {
        this.stopTimer();
        this.switchGame('level-select', this.gameName, this.level, this.difficulty);
        return;
      }

      if (this.victory) {
        const result = this.victoryPanel.handleClick(x, y);
        if (result === 'next') {
          this.level++;
          this.loadLevel();
          this.victoryPanel.reset();
          return;
        }
        if (result === 'back') {
          this.stopTimer();
          this.switchGame('level-select', this.gameName, this.level, this.difficulty);
          return;
        }
        this.victoryPanel.draw();
        return;
      }

      const col = Math.floor((x - this.offsetX) / this.cellSize);
      const row = Math.floor((y - this.offsetY) / this.cellSize);

      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        if (this.grid[row][col] >= CELL_BLACK) return;

        this.undoMgr.save({ lights: this.lights.map(r => [...r]), lit: this.lit.map(r => [...r]) });

        if (this.lights[row][col]) {
          this.lights[row][col] = false;
          this.lightsCount--;
        } else {
          if (this.maxLights > 0 && this.lightsCount >= this.maxLights) {
            wx.showToast({ title: '已达最大灯塔数', icon: 'none' });
            return;
          }
          this.lights[row][col] = true;
          this.lightsCount++;
        }

        sound.play('click');
        this.updateLit();
        this.checkCompletion();
      }

      this.draw();
    };

    this.canvas.addEventListener('click', this._clickHandler);
  }

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.undoMgr.canUndo()) {
          const state = this.undoMgr.undo();
          if (state) {
            this.lights = state.lights;
            this.lit = state.lit;
            this.lightsCount = 0;
            for (let r = 0; r < this.size; r++) {
              for (let c = 0; c < this.size; c++) {
                if (this.lights[r][c]) this.lightsCount++;
              }
            }
            sound.play('click');
            this.draw();
          }
        }
        break;
      case 'hint':
        this._useHint();
        break;
      case 'answer':
        this._toggleAnswer();
        break;
      case 'verify':
        this._verify();
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
        break;
    }
  }

  _useHint() {
    if (this.showAnswer) {
      wx.showToast({ title: '查看答案时无法使用提示', icon: 'none' });
      return;
    }
    
    const hint = this.hintMgr.getHint(this.gameName, this._currentPuzzle, this.lights);
    if (hint) {
      const { row, col } = hint;
      this.undoMgr.save({ lights: this.lights.map(r => [...r]) });
      this.lights[row][col] = true;
      this.lightsCount++;
      this.updateLit();
      sound.play('click');
      this.checkCompletion();
      this.draw();
    } else if (!this.hintMgr.canHint()) {
      wx.showToast({ title: '本关提示次数已用完', icon: 'none' });
    }
  }

  _toggleAnswer() {
    this.showAnswer = !this.showAnswer;
    if (this.showAnswer) {
      if (this._currentPuzzle && this._currentPuzzle.answer) {
        const answerLights = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
        for (const [r, c] of this._currentPuzzle.answer) {
          if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
            answerLights[r][c] = true;
          }
        }
        this.lights = answerLights;
        this.updateLit();
      } else {
        wx.showToast({ title: '暂无答案数据', icon: 'none' });
        this.showAnswer = false;
      }
    } else {
      this.lights = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
      this.lightsCount = 0;
      this.updateLit();
    }
    sound.play('click');
    this.draw();
  }

  _verify() {
    const errors = [];
    let lightConflict = 0;
    
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.lights[r][c]) {
          const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
          for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
              if (this.grid[nr][nc] >= CELL_BLACK) break;
              if (this.lights[nr][nc]) { lightConflict++; break; }
              nr += dr; nc += dc;
            }
          }
        }
      }
    }
    if (lightConflict > 0) errors.push(`${lightConflict} 对灯塔互相照亮`);

    let numErrors = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = this.grid[r][c];
        if (cell >= CELL_BLACK_0) {
          const required = cell - CELL_BLACK_0;
          let count = 0;
          if (r > 0 && this.lights[r - 1][c]) count++;
          if (r < this.size - 1 && this.lights[r + 1][c]) count++;
          if (c > 0 && this.lights[r][c - 1]) count++;
          if (c < this.size - 1 && this.lights[r][c + 1]) count++;
          if (count !== required) numErrors++;
        }
      }
    }
    if (numErrors > 0) errors.push(`${numErrors} 个数字黑格不满足`);

    let unlitCount = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] < CELL_BLACK && !this.lit[r][c]) unlitCount++;
      }
    }
    if (unlitCount > 0) errors.push(`${unlitCount} 个白格未被照亮`);

    if (errors.length === 0) {
      wx.showToast({ title: '✅ 验证通过', icon: 'success' });
    } else {
      wx.showToast({ title: '❌ ' + errors[0], icon: 'none' });
    }
    sound.play('click');
  }

  checkCompletion() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.lights[r][c]) {
          const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
          for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
              if (this.grid[nr][nc] >= CELL_BLACK) break;
              if (this.lights[nr][nc]) return;
              nr += dr; nc += dc;
            }
          }
        }
      }
    }

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = this.grid[r][c];
        if (cell >= CELL_BLACK_0) {
          const required = cell - CELL_BLACK_0;
          let count = 0;
          if (r > 0 && this.lights[r - 1][c]) count++;
          if (r < this.size - 1 && this.lights[r + 1][c]) count++;
          if (c > 0 && this.lights[r][c - 1]) count++;
          if (c < this.size - 1 && this.lights[r][c + 1]) count++;
          if (count !== required) return;
        }
      }
    }

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] < CELL_BLACK && !this.lit[r][c]) return;
      }
    }

    this._onVictory();
  }

  _onVictory() {
    this.victory = true;
    this.confetti.start();
    sound.play('victory');
    this.stopTimer();

    const rewardMgr = getRewardManager();
    const rewardResult = rewardMgr.processVictory(this.gameName, {
      difficulty: this.difficulty,
      level: this.level,
      time: this.timer
    });
    rewardMgr.showRewardToast(rewardResult);

    let winCount = 0;
    try {
      const p = JSON.parse(wx.getStorageSync(`progress_${this.gameName}_${this.difficulty}`) || '{}');
      winCount = p.unlocked || 0;
    } catch (e) {}

    const newlyAchieved = this.achievement.check(this.gameName, winCount);
    this._newAchievements = newlyAchieved;
    this._saveProgress();
    statsManager.endGame(true);
    this.draw();
  }

  _saveProgress() {
    try {
      const key = `progress_${this.gameName}_${this.difficulty}`;
      const saved = wx.getStorageSync(key);
      let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
      if (this.level >= progress.unlocked) {
        progress.unlocked = this.level + 1;
      }
      if (!progress.stars[this.level]) {
        progress.stars[this.level] = 1;
      }
      wx.setStorageSync(key, JSON.stringify(progress));
    } catch (e) {}
  }

  _drawAchievementPopup() {
    this._newAchievements = null;
  }

  update() {
    this.animationTime += 0.05;
  }

  draw() {
    const ctx = this.ctx;

    ctx.fillStyle = '#fef0f5';
    ctx.fillRect(0, 0, this.width, this.height);

    this._drawHeader();
    this._drawStatsBar();
    this._drawGrid();
    this._drawBottomBar();

    if (this.victory) {
      this.victoryPanel.setSubtitle('用时 ' + this._formatTime(this.timer));
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }

    if (this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
  }

  _drawHeader() {
    this.headerBar.draw({
      title: '💡 数灯',
      info: `${DIFFICULTY_CONFIG[this.difficulty].text} · ${this.size}×${this.size}`
    });
  }

  _drawStatsBar() {
    const ctx = this.ctx;
    const timeStr = this._formatTime(this.timer);
    const hintText = this.hintMgr.canHint() ? `${this.hintMgr.maxHints - this.hintMgr.usedHints}次` : '0次';
    const y = this.statusBarHeight + 58;
    const tw = this.width;

    // 半透明背景条
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(ctx, 12, y, tw - 24, 36, 10);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 13px Arial, -apple-system';
    ctx.textAlign = 'left';
    ctx.fillText(`第${this.level}关`, 24, y + 24);

    ctx.fillStyle = '#f5576c';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px Arial, -apple-system';
    ctx.fillText(`⏱ ${timeStr}`, tw / 2 - 10, y + 24);

    ctx.fillStyle = '#f5576c';
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px Arial, -apple-system';
    ctx.fillText(`💡 ${this.lightsCount}/${this.maxLights || '?'} · 提示${hintText}`, tw - 24, y + 24);

    ctx.textAlign = 'left';
  }

  _drawGrid() {
    const ctx = this.ctx;
    const size = this.size;
    const rows = Math.min(size, this.grid.length);

    for (let r = 0; r < rows; r++) {
      const cols = Math.min(size, this.grid[r] ? this.grid[r].length : 0);
      for (let c = 0; c < cols; c++) {
        const x = this.offsetX + c * this.cellSize;
        const y = this.offsetY + r * this.cellSize;
        const cell = this.grid[r][c];
        const isLight = this.lights[r][c];
        const isLit = this.lit[r][c];
        const isWhite = cell < CELL_BLACK;

        if (cell >= CELL_BLACK) {
          ctx.fillStyle = '#333';
          ctx.fillRect(x, y, this.cellSize, this.cellSize);
          
          if (cell >= CELL_BLACK_0) {
            const num = cell - CELL_BLACK_0;
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.max(14, this.cellSize * 0.45)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(num, x + this.cellSize / 2, y + this.cellSize / 2);
          }
        } else {
          ctx.fillStyle = isLight ? '#ffe066' : (isLit ? '#fff3cd' : '#ffffff');
          ctx.fillRect(x, y, this.cellSize, this.cellSize);

          if (isLight) {
            const glow = Math.sin(this.animationTime * 2) * 0.08 + 0.92;
            ctx.globalAlpha = glow;
            ctx.fillStyle = '#ffb300';
            ctx.beginPath();
            ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            
            this._drawLightRays(ctx, r, c);
          }
        }

        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, this.cellSize, this.cellSize);
      }
    }
  }

  _drawLightRays(ctx, row, col) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    ctx.strokeStyle = 'rgba(255, 179, 0, 0.3)';
    ctx.lineWidth = Math.max(3, this.cellSize * 0.12);
    
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc;
      while (r >= 0 && r < this.size && c >= 0 && c < this.size) {
        if (!this.grid[r] || this.grid[r][c] >= CELL_BLACK) break;
        const bx = this.offsetX + c * this.cellSize + this.cellSize / 2;
        const by = this.offsetY + r * this.cellSize + this.cellSize / 2;
        ctx.beginPath();
        ctx.moveTo(this.offsetX + col * this.cellSize + this.cellSize / 2, this.offsetY + row * this.cellSize + this.cellSize / 2);
        ctx.lineTo(bx, by);
        ctx.stroke();
        if (this.lights[r] && this.lights[r][c]) break;
        r += dr; c += dc;
      }
    }
  }

  _drawBottomBar() {
    const hintEnabled = this.hintMgr.canHint() && !this.showAnswer;
    const hintText = hintEnabled ? `💡 提示(${this.hintMgr.maxHints - this.hintMgr.usedHints})` : '💡 提示(0)';
    
    this.bottomBar.setButtons([
      { id: 'undo', text: '↩️ 撤销', enabled: this.undoMgr.canUndo() },
      { id: 'verify', text: '🔍 验证' },
      { id: 'hint', text: hintText, enabled: hintEnabled },
      { id: 'answer', text: this.showAnswer ? '🙈 隐藏' : '💡 答案' },
      { id: 'rule', text: '📖 规则' }
    ]);
    this.bottomBar.draw();

    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('点击放置/取消灯塔 💡', this.width / 2, this.height - 15);
  }

  destroy() {
    this.stopTimer();
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = Akari;
