const LevelLoader = require('../games/level-loader');
const statsManager = require('../games/stats-manager.js').getInstance();
const sound = require('../games/sound-manager');
const TutorialOverlay = require('../games/tutorial-overlay');
const UndoManager = require('../games/undo-manager');
const { AchievementManager } = require('../games/achievement-manager');
const { HintManager } = require('../games/hint-manager');
const Confetti = require('../games/confetti');
const VictoryPanel = require('../games/components/victory-panel');
const HeaderBar = require('../games/components/header-bar');
const BottomBar = require('../games/components/bottom-bar');

const {
  initGrid, checkLineMatch, checkAndMarkEmpty, checkVictory,
  saveProgress, processVictoryReward,
} = require('./nonogram-core');

const {
  drawStatus, drawModeButtons, drawHints, drawBoard, drawAchievementPopup,
} = require('./nonogram-renderer');

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

    const modeBtnH = 32;
    const topGap = 6;
    const btnToStatus = 4;
    const statusToHints = 6;
    const bottomGap = 12;

    const availH = footerTop - headerBottom - topGap - modeBtnH - btnToStatus - 14 - statusToHints - bottomGap;
    const availW = this.width - 12;

    const roughCellSize = Math.min(
      Math.floor(availW / this.size),
      Math.floor(availH / this.size),
      36
    );

    this._hintFontSize = Math.max(9, Math.floor(roughCellSize * 0.32));
    this._rowHintW = Math.max(30, maxRowLen * (this._hintFontSize + 3) + 6);
    this._colHintH = Math.max(16, maxColLen * (this._hintFontSize + 2) + 4);

    const maxCellW = Math.floor((availW - this._rowHintW) / this.size);
    const maxCellH = Math.floor((availH - this._colHintH) / this.size);
    this.cellSize = Math.max(16, Math.min(maxCellW, maxCellH, 36));

    this._hintFontSize = Math.max(9, Math.floor(this.cellSize * 0.32));
    this._rowHintW = Math.max(30, maxRowLen * (this._hintFontSize + 3) + 6);
    this._colHintH = Math.max(16, maxColLen * (this._hintFontSize + 2) + 4);

    const totalW = this._rowHintW + this.cellSize * this.size;
    this.boardOffsetX = (this.width - totalW) / 2 + this._rowHintW;

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
        this.grid = initGrid(this.size);
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
    this.grid = initGrid(this.size);
    this.draw();
  }

  _fillCell(r, c) {
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

    if (old === newVal) return false;

    if (!this.undoMgr || !this.undoMgr._stack || !this.undoMgr._stack.length || this.undoMgr._stack[this.undoMgr._stack.length - 1] !== this.undoMgr._lastState) {
      this.undoMgr.save({ grid: this.grid.map(row => [...row]) });
    }

    this.grid[r][c] = newVal;
    checkAndMarkEmpty(this.grid, this.size, this.rowHints, this.colHints, r, c);
    sound.playClick();
    this.draw();
    if (checkVictory(this.grid, this.answer, this.size)) this._onVictory();
    return true;
  }

  _onVictory() {
    this.victory = true;
    this.confetti.start();
    sound.play('victory');

    processVictoryReward(this.gameName, this.difficulty, this.level, this.timer);
    saveProgress(this.gameName, this.level, this.difficulty);

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

      if (this.victory) {
        const action = this.victoryPanel.handleClick(x, y);
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
      if (action) { this._handleBottomAction(action); return; }

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
          if (prev) { this.grid = prev.grid; sound.playClick(); this.draw(); }
        }
        break;
      case 'restart':
        this.grid = initGrid(this.size);
        this.undoMgr.clear();
        sound.playClick();
        this.draw();
        break;
      case 'hint':
        if (this.hintMgr) { this.hintMgr.showHint(); sound.playSuccess(); }
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
        break;
    }
  }

  draw() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.headerBar.draw({ title: '🎨 数织' });
    drawStatus(this.ctx, this.width, this.level, this.mode, this._statusY);

    const btns = drawModeButtons(this.ctx, this.width, this.mode, this.statusBarHeight, this._modeBtnY);
    this._fillBtn = btns.fillBtn;
    this._markBtn = btns.markBtn;

    drawHints(this.ctx, this.colHints, this.rowHints, this.size, this.cellSize, this.boardOffsetX, this.boardOffsetY, this._hintFontSize);
    drawBoard(this.ctx, this.grid, this.size, this.cellSize, this.boardOffsetX, this.boardOffsetY);

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

  _drawAchievementPopup() {
    if (!this._newAchievements || this._newAchievements.length === 0) return;
    drawAchievementPopup(this.ctx, this.width, this.height, this._newAchievements);
    this._newAchievements = null;
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
