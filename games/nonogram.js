const LevelLoader = require('./level-loader');
const statsManager = require('./stats-manager.js').getInstance();
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');
const { HintManager } = require('./hint-manager');
const Confetti = require('./confetti');
const VictoryPanel = require('./components/victory-panel');
const HeaderBar = require('./components/header-bar');
const BottomBar = require('./components/bottom-bar');
const { getInstance: getRewardManager } = require('./reward-manager');

class Nonogram {
  constructor(ctx, canvas, systemInfo, switchGame, level, difficulty = 'easy') {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.level = level;
    this.difficulty = difficulty;
    this.gameName = 'nonogram';
    statsManager.startGame(this.gameName, level) || 1;

    this.size = 6;
    this.cellSize = 0;
    this.boardOffsetX = 0;
    this.boardOffsetY = 0;

    this.grid = [];
    this.rowHints = [];
    this.colHints = [];
    this.answer = [];

    this.mode = 'fill';
    this.victory = false;
    this.animationTime = 0;
    this._touchStartCell = null;
    this._lastFilledCell = null;

    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = AchievementManager.getInstance();
    this.undoMgr = new UndoManager();
    this.hintMgr = new HintManager();

    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup(),
      showNext: false,
      backText: '返回选关'
    });

    this.loadLevel();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
  }

  _calcLayout() {
    const headerBottom = this.headerBar ? this.headerBar.boardStartY : (this.statusBarHeight + 77);
    const footerTop = this.bottomBar ? this.bottomBar.topY : (this.height - 76);

    const maxRowLen = Math.max(...this.rowHints.map(h => h.length || 0), 0);
    const maxColLen = Math.max(...this.colHints.map(h => h.length || 0), 0);

    // 垂直固定区域（自上而下紧凑排列）
    const modeBtnH = 32;
    const topGap = 6;
    const btnToStatus = 4;
    const statusToHints = 6;
    const bottomGap = 12;

    const availH = footerTop - headerBottom - topGap - modeBtnH - btnToStatus - 14 - statusToHints - bottomGap;
    const availW = this.width - 12;

    // 先估算 cellSize
    const roughCellSize = Math.min(
      Math.floor(availW / this.size),
      Math.floor(availH / this.size),
      36
    );

    this._hintFontSize = Math.max(9, Math.floor(roughCellSize * 0.32));
    this._rowHintW = Math.max(30, maxRowLen * (this._hintFontSize + 3) + 6);
    this._colHintH = Math.max(16, maxColLen * (this._hintFontSize + 2) + 4);

    // 根据 hint 区域反推最终 cellSize
    const maxCellW = Math.floor((availW - this._rowHintW) / this.size);
    const maxCellH = Math.floor((availH - this._colHintH) / this.size);
    this.cellSize = Math.max(16, Math.min(maxCellW, maxCellH, 36));

    // 重新校准 hint 尺寸
    this._hintFontSize = Math.max(9, Math.floor(this.cellSize * 0.32));
    this._rowHintW = Math.max(30, maxRowLen * (this._hintFontSize + 3) + 6);
    this._colHintH = Math.max(16, maxColLen * (this._hintFontSize + 2) + 4);

    // 水平居中
    const totalW = this._rowHintW + this.cellSize * this.size;
    this.boardOffsetX = (this.width - totalW) / 2 + this._rowHintW;

    // 垂直位置（自上而下紧凑排列，不再居中）
    this._modeBtnY = headerBottom + topGap;
    this._statusY = this._modeBtnY + modeBtnH + btnToStatus + 12;
    this.boardOffsetY = this._statusY + statusToHints + this._colHintH;
  }

  async loadLevel() {
    if (this.confetti) this.confetti.stop();
    if (this.undoMgr) this.undoMgr.clear();
    if (this.hintMgr) this.hintMgr.reset();
    this.victory = false;
    this.mode = 'fill';

    try {
      const data = await LevelLoader.load('nonogram', this.level, this.difficulty || 'easy');
      if (data && data.answer) {
        this.size = data.size || 6;
        this.rowHints = data.rowHints || [];
        this.colHints = data.colHints || [];
        this.answer = data.answer || [];
        this._calcLayout();
        this._initGrid();
        this.draw();
        return;
      }
    } catch (e) {}

    this.answer = [
      [0,1,0,0,1,0],
      [1,1,1,1,1,1],
      [1,1,1,1,1,1],
      [1,1,1,1,1,1],
      [0,1,1,1,1,0],
      [0,0,1,1,0,0]
    ];
    this.size = 6;
    this.rowHints = [[1,1],[6],[6],[6],[4],[2]];
    this.colHints = [[3,1],[3],[4],[4],[4],[1,1]];
    this._calcLayout();
    this._initGrid();
    this.draw();
  }

  _initGrid() {
    this.grid = [];
    for (let r = 0; r < this.size; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.size; c++) {
        this.grid[r][c] = 0;
      }
    }
  }

  _checkLineMatch(line, hints) {
    const enc = [], runLen = 0, inRun = false;
    let result = [];
    for (let i = 0; i < line.length; i++) {
      if (line[i] === 1) {
        result.push(result.pop() + 1 || 1);
      } else if (result.length) {
        enc.push(result.pop());
      }
    }
    if (line[line.length - 1] === 1 && result.length) enc.push(result.pop());
    if (enc.length !== hints.length) return false;
    for (let i = 0; i < enc.length; i++) {
      if (enc[i] !== hints[i]) return false;
    }
    return true;
  }

  _checkAndMarkEmpty(r, c) {
    const size = this.size;
    let changed = false;

    const rowHints = this.rowHints[r];
    if (rowHints && rowHints.length) {
      const rowSum = rowHints.reduce((a, b) => a + b, 0);
      let rowFilled = 0, rowEmpty = 0;
      for (let cc = 0; cc < size; cc++) {
        if (this.grid[r][cc] === 1) rowFilled++;
        else if (this.grid[r][cc] === 2) rowEmpty++;
      }

      if (rowFilled === rowSum && rowFilled + rowEmpty < size) {
        if (this._checkLineMatch(this.grid[r], rowHints)) {
          for (let cc = 0; cc < size; cc++) {
            if (this.grid[r][cc] === 0) {
              this.grid[r][cc] = 2;
              changed = true;
            }
          }
        }
      }
    }

    const colHints = this.colHints[c];
    if (colHints && colHints.length) {
      const colSum = colHints.reduce((a, b) => a + b, 0);
      let colFilled = 0, colEmpty = 0;
      for (let rr = 0; rr < size; rr++) {
        if (this.grid[rr][c] === 1) colFilled++;
        else if (this.grid[rr][c] === 2) colEmpty++;
      }

      if (colFilled === colSum && colFilled + colEmpty < size) {
        if (this._checkLineMatch(this.grid.map(g => g[c]), colHints)) {
          for (let rr = 0; rr < size; rr++) {
            if (this.grid[rr][c] === 0) {
              this.grid[rr][c] = 2;
              changed = true;
            }
          }
        }
      }
    }

    return changed;
  }

  _fillCell(r, c) {
    console.log(`[Nonogram] _fillCell enter r=${r} c=${c} size=${this.size} victory=${this.victory} grid=${!!this.grid}`);
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return false;
    if (this.victory) return false;

    const key = r + '_' + c;
    if (this._lastFilledCell === key) return false;
    this._lastFilledCell = key;

    const old = this.grid[r][c];
    let newVal;

    if (this.mode === 'fill') {
      newVal = old === 1 ? 0 : 1;
    } else {
      newVal = old === 2 ? 0 : 2;
    }

    if (old === newVal) { console.log(`[Nonogram] _fillCell skip: old===newVal=${old}`); return false; }

    if (!this.undoMgr || !this.undoMgr._stack || !this.undoMgr._stack.length || this.undoMgr._stack[this.undoMgr._stack.length - 1] !== this.undoMgr._lastState) {
      this.undoMgr.save({ grid: this.grid.map(row => [...row]) });
    }

    this.grid[r][c] = newVal;
    console.log(`[Nonogram] _fillCell r=${r} c=${c} old=${old} newVal=${newVal} mode=${this.mode}`);
    this._checkAndMarkEmpty(r, c);
    sound.playClick();
    this.draw();
    this._checkVictory();
    return true;
  }

  _checkVictory() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.answer[r][c] === 1 && this.grid[r][c] !== 1) return;
        if (this.answer[r][c] === 0 && this.grid[r][c] === 1) return;
      }
    }
    this._onVictory();
  }

  _onVictory() {
    this.victory = true;
    this.confetti.start();
    sound.play('victory');

    const rewardMgr = getRewardManager();
    const rewardResult = rewardMgr.processVictory(this.gameName, {
      difficulty: this.difficulty || 'easy',
      level: this.level,
      time: this.timer
    });
    rewardMgr.showRewardToast(rewardResult);

    try {
      const baseKey = 'progress_' + this.gameName;
      let saved = wx.getStorageSync(baseKey);
      let progress = saved ? JSON.parse(saved) : { unlocked: 1 };
      if (this.level >= (progress.unlocked || 1)) {
        progress.unlocked = this.level + 1;
        wx.setStorageSync(baseKey, JSON.stringify(progress));
      }
      const diffKey = `progress_${this.gameName}_${this.difficulty || 'easy'}`;
      let diffSaved = wx.getStorageSync(diffKey);
      let diffProgress = diffSaved ? JSON.parse(diffSaved) : { unlocked: 1 };
      if (this.level >= (diffProgress.unlocked || 1)) {
        diffProgress.unlocked = this.level + 1;
        wx.setStorageSync(diffKey, JSON.stringify(diffProgress));
      }
    } catch (e) {}

    let winCount = 0;
    try { const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName) || '{}'); winCount = p.unlocked || 0; } catch(e) {}
    const newlyAchieved = this.achievement.check(this.gameName, winCount);
    this._newAchievements = newlyAchieved;
    statsManager.endGame(true);

    this.draw();
  }

  bindEvents() {
    this._clickHandler = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;
      console.log(`[Nonogram] click x=${x} y=${y} victory=${this.victory} size=${this.size} cellSize=${this.cellSize} boardOffset=(${this.boardOffsetX},${this.boardOffsetY})`);

      if (this.victory) {
        const action = this.victoryPanel.handleClick(x, y);
        console.log(`[Nonogram] victory panel action=${action}`);
        if (action === 'back') {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
        } else if (action === 'next') {
          this.level++;
          this.loadLevel();
        }
        return;
      }

      if (this.tutorial && this.tutorial.shouldShow()) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }

      const action = this.bottomBar.handleClick(x, y);
      if (action) {
        console.log(`[Nonogram] bottomBar action=${action}`);
        this._handleBottomAction(action);
        return;
      }

      if (this.headerBar.isBackButton(x, y)) {
        sound.play('click');
        this.switchGame('level-select', this.gameName);
        return;
      }

      if (this._fillBtn && x >= this._fillBtn.x && x <= this._fillBtn.x + this._fillBtn.w &&
          y >= this._fillBtn.y && y <= this._fillBtn.y + this._fillBtn.h) {
        this.mode = 'fill';
        sound.playClick();
        this.draw();
        return;
      }

      if (this._markBtn && x >= this._markBtn.x && x <= this._markBtn.x + this._markBtn.w &&
          y >= this._markBtn.y && y <= this._markBtn.y + this._markBtn.h) {
        this.mode = 'mark';
        sound.playClick();
        this.draw();
        return;
      }

      const col = Math.floor((x - this.boardOffsetX) / this.cellSize);
      const row = Math.floor((y - this.boardOffsetY) / this.cellSize);
      console.log(`[Nonogram] board hit row=${row} col=${col} inRange=${row >= 0 && row < this.size && col >= 0 && col < this.size}`);

      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        this._touchStartCell = { r: row, c: col };
        this._lastFilledCell = null;
        this._fillCell(row, col);
      }
    };
    this.canvas.addEventListener('click', this._clickHandler);

    this._touchMoveHandler = (e) => {
      if (!this._touchStartCell || this.victory) return;
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;
      const col = Math.floor((x - this.boardOffsetX) / this.cellSize);
      const row = Math.floor((y - this.boardOffsetY) / this.cellSize);
      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        this._fillCell(row, col);
      }
    };
    this.canvas.addEventListener('touchmove', this._touchMoveHandler, { passive: true });

    this._touchEndHandler = () => {
      this._touchStartCell = null;
      this._lastFilledCell = null;
    };
    this.canvas.addEventListener('touchend', this._touchEndHandler);
    this.canvas.addEventListener('touchcancel', this._touchEndHandler);
  }

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.undoMgr && this.undoMgr.canUndo()) {
          const prev = this.undoMgr.undo();
          if (prev) {
            this.grid = prev.grid;
            sound.playClick();
            this.draw();
          }
        }
        break;
      case 'restart':
        this._initGrid();
        this.undoMgr.clear();
        sound.playClick();
        this.draw();
        break;
      case 'hint':
        if (this.hintMgr) {
          this.hintMgr.showHint();
          sound.playSuccess();
        }
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
        break;
    }
  }

  _drawStatus() {
    const ctx = this.ctx;
    const modeText = this.mode === 'fill' ? '填充模式' : '标记模式';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '13px Arial, -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(`第${this.level}关 · ${modeText}`, this.width / 2, this._statusY);
    ctx.textAlign = 'left';
  }

  draw() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.headerBar.draw({
      title: '🎨 数织'
    });
    
    // 状态信息在棋盘上方
    this._drawStatus();
    
    this._drawModeButtons();
    this.drawHints();
    this.drawBoard();
    this.bottomBar.setButtons([
      { id: 'undo', text: '↩️ 撤销', enabled: this.undoMgr.canUndo() },
      { id: 'restart', text: '🔄 重开' },
      { id: 'hint', text: '💡 提示' }
    ]);
    this.bottomBar.draw();

    if (this.victory) {
      this.victoryPanel.setSubtitle('🎉 恭喜通关！');
      this.victoryPanel.setAchievements(this._newAchievements || []);
      this.victoryPanel.draw();
    }
  }

  _drawModeButtons() {
    const btnW = 80, btnH = 32;
    const gap = 10;
    const totalW = btnW * 2 + gap;
    const startX = (this.width - totalW) / 2;
    const y = this._modeBtnY || (this.statusBarHeight + 45);

    const modes = [
      { id: 'fill', text: '🖊️ 填充', color: '#6BCB77' },
      { id: 'mark', text: '❌ 标记', color: '#FF6B6B' }
    ];

    modes.forEach((mode, i) => {
      const x = startX + i * (btnW + gap);
      const isActive = this.mode === mode.id;

      this.ctx.fillStyle = isActive ? mode.color : 'rgba(255,255,255,0.1)';
      this.ctx.beginPath();
      this._roundRect(x, y, btnW, btnH, 16);
      this.ctx.fill();

      this.ctx.fillStyle = '#fff';
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(mode.text, x + btnW / 2, y + 21);
    });
    this.ctx.textAlign = 'left';

    this._fillBtn = { x: startX, y, w: btnW, h: btnH };
    this._markBtn = { x: startX + btnW + gap, y, w: btnW, h: btnH };
  }

  _roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
  }

  drawHints() {
    if (!this.colHints || !this.rowHints || !this.size) return;

    const fontSize = this._hintFontSize || Math.max(10, Math.floor(this.cellSize * 0.32));
    this.ctx.font = fontSize + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

    for (let c = 0; c < this.size; c++) {
      const hints = this.colHints[c] || [];
      const x = this.boardOffsetX + c * this.cellSize + this.cellSize / 2;
      for (let i = 0; i < hints.length; i++) {
        const y = this.boardOffsetY - (hints.length - i) * (fontSize + 2);
        this.ctx.fillText(hints[i], x, y);
      }
    }

    this.ctx.textAlign = 'right';
    for (let r = 0; r < this.size; r++) {
      const hints = this.rowHints[r] || [];
      const y = this.boardOffsetY + r * this.cellSize + this.cellSize / 2 + fontSize / 3;
      const x = this.boardOffsetX - 5;
      this.ctx.fillText(hints.join(' '), x, y);
    }
    this.ctx.textAlign = 'left';
  }

  drawBoard() {
    if (!this.grid || !this.size) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const bx = this.boardOffsetX;
    const by = this.boardOffsetY;
    const n = this.size;

    // 1. Board background
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(bx, by, cs * n, cs * n);

    // 2. Filled cells
    if (!this._fillGradient || this._fillGradient._cs !== cs) {
      this._fillGradient = ctx.createLinearGradient(0, 0, cs, cs);
      this._fillGradient.addColorStop(0, '#6BCB77');
      this._fillGradient.addColorStop(1, '#4CAF50');
      this._fillGradient._cs = cs;
    }
    for (let r = 0; r < n; r++) {
      if (!this.grid[r]) continue;
      for (let c = 0; c < n; c++) {
        if (this.grid[r][c] === 1) {
          const x = bx + c * cs;
          const y = by + r * cs;
          ctx.fillStyle = this._fillGradient;
          ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
        }
      }
    }

    // 3. Mark X
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let r = 0; r < n; r++) {
      if (!this.grid[r]) continue;
      for (let c = 0; c < n; c++) {
        if (this.grid[r][c] === 2) {
          const x = bx + c * cs;
          const y = by + r * cs;
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + cs - 4, y + cs - 4);
          ctx.moveTo(x + cs - 4, y + 4);
          ctx.lineTo(x + 4, y + cs - 4);
        }
      }
    }
    ctx.stroke();

    // 4. Grid lines (batch)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      ctx.moveTo(bx, by + i * cs);
      ctx.lineTo(bx + n * cs, by + i * cs);
      ctx.moveTo(bx + i * cs, by);
      ctx.lineTo(bx + i * cs, by + n * cs);
    }
    ctx.stroke();

    // 5. Outer border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, n * cs, n * cs);
  }

  _drawAchievementPopup() {
    if (!this._newAchievements || this._newAchievements.length === 0) return;
    this._newAchievements.forEach(a => {
      const text = a.title || a.name;
      const cx = this.width / 2, cy = this.height * 0.6;
      this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
      this.ctx.fillRect(cx - 120, cy - 30, 240, 60);
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('🏆 成就解锁!', cx, cy - 8);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '14px Arial';
      this.ctx.fillText(text, cx, cy + 14);
    });
    this.ctx.textAlign = 'left';
  }

  destroy() {
    if (this.confetti) this.confetti.stop();
    if (this._clickHandler) this.canvas.removeEventListener('click', this._clickHandler);
    if (this._touchMoveHandler) this.canvas.removeEventListener('touchmove', this._touchMoveHandler);
    if (this._touchEndHandler) {
      this.canvas.removeEventListener('touchend', this._touchEndHandler);
      this.canvas.removeEventListener('touchcancel', this._touchEndHandler);
    }
  }
}

module.exports = Nonogram;
