/**
 * 数墙 (Nurikabe) — 主类
 */
const LevelLoader = require('../games/level-loader');
const LoadingOverlay = require('../games/components/loading-overlay');
const statsManager = require('../games/stats-manager.js').getInstance();
const Confetti = require('../games/confetti');
const sound = require('../games/sound-manager');
const TutorialOverlay = require('../games/tutorial-overlay');
const UndoManager = require('../games/undo-manager');
const { AchievementManager } = require('../games/achievement-manager');
const VictoryPanel = require('../games/components/victory-panel');
const HeaderBar = require('../games/components/header-bar');
const BottomBar = require('../games/components/bottom-bar');
const { getInstance: getRewardManager } = require('../games/reward-manager');

const { CELL_WHITE, CELL_BLACK, formatTime, checkCompletion, saveProgress } = require('./nurikabe-core');
const { _drawBg, drawStatus, drawBoard } = require('./nurikabe-renderer');

class Nurikabe {
  constructor(ctx, canvas, systemInfo, switchGame, level, difficulty = 'easy') {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.gameName = 'nurikabe';
    this.level = level || 1;
    this.difficulty = difficulty;
    statsManager.startGame(this.gameName, this.level);

    this.size = 5;
    this.numbers = [];
    this.board = [];
    this.solution = [];
    this._dataReady = false;
    this.loadingOverlay = new LoadingOverlay(this.ctx, this.width, this.height, {
      gameName: '数墙'
    });

    this.cellSize = 50;
    this.boardOffsetX = 0;
    this.boardOffsetY = 100 + 65;

    this.victory = false;
    this.animationTime = 0;
    this.timer = 0;
    this.timerInterval = null;

    this.confetti = new Confetti(ctx, this.width, this.height);
    this.achievement = AchievementManager.getInstance();
    this.undoMgr = new UndoManager();

    this.tutorial = new TutorialOverlay(ctx, this.width, this.height, this.gameName);

    this.headerBar = new HeaderBar(ctx, this.width, this.statusBarHeight, {
      bgColor: '#e0f7fa',
      textColor: '#00695c',
      infoColor: '#4db6ac',
      backColor: 'rgba(0, 105, 90, 0.12)',
      titleFontSize: 18,
      infoFontSize: 12,
      height: 48
    });
    this.bottomBar = new BottomBar(ctx, this.width, this.height, this.statusBarHeight, {
      bgColor: 'rgba(0, 105, 90, 0.10)',
      textColor: '#00796b',
      disabledColor: 'rgba(0, 105, 90, 0.25)',
      activeColor: '#00897b'
    });
    this.victoryPanel = new VictoryPanel(ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });

    this.loadLevel();
    this.bindEvents();
  }

  calcCellSize() {
    const maxGridPx = this.width * 0.85;
    const rawSize = Math.floor(maxGridPx / this.size);
    return Math.max(20, Math.min(rawSize, 45));
  }

  async loadLevel() {
    if (this.confetti) this.confetti.stop();
    if (this.undoMgr) this.undoMgr.clear();
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    this.timer = 0;
    this._dataReady = false;
    this.victory = false;
    this.loadingOverlay.start();

    try {
      const data = await LevelLoader.load('nurikabe', this.level, this.difficulty);
      this.loadingOverlay.stop();
      if (data && data.grid) {
        this.size = data.size || 5;
        this.numbers = data.grid;
        this.solution = data.solution || null;

        this.board = [];
        for (let r = 0; r < this.size; r++) {
          this.board[r] = [];
          for (let c = 0; c < this.size; c++) {
            this.board[r][c] = CELL_WHITE;
          }
        }

        this._updateLayout();
        this._dataReady = true;
        this.startTimer();
        return;
      }
    } catch (e) { /* CDN 失败 */ }

    // 内置 fallback
    this.size = 7;
    this.numbers = [
      [0,0,1,0,0,2,0],
      [0,0,0,0,0,0,0],
      [0,3,0,0,0,0,0],
      [0,0,0,2,0,0,0],
      [0,0,0,0,0,3,0],
      [0,1,0,0,0,0,0],
      [0,0,0,0,0,0,0]
    ];
    this.solution = null;
    this.board = [];
    for (let r = 0; r < this.size; r++) {
      this.board[r] = [];
      for (let c = 0; c < this.size; c++) {
        this.board[r][c] = CELL_WHITE;
      }
    }
    this._updateLayout();
    this._dataReady = true;
    this.startTimer();
  }

  _updateLayout() {
    this.cellSize = this.calcCellSize();
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = this.headerBar.boardStartY + 65;
  }

  startTimer() {
    if (this.timerInterval) return;
    this.timerInterval = setInterval(() => { this.timer++; }, 1000);
  }

  // ── 事件 ──

  bindEvents() {
    this.clickHandler = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX, y = touch.clientY;

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

      if (this.victory) {
        const vpAction = this.victoryPanel.handleClick(x, y);
        if (vpAction === 'back') {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
        } else if (vpAction === 'next') {
          sound.play('click');
          this.level++;
          this.loadLevel();
        }
        return;
      }

      if (!this._dataReady) return;
      const col = Math.floor((x - this.boardOffsetX) / this.cellSize);
      const row = Math.floor((y - this.boardOffsetY) / this.cellSize);
      if (row < 0 || row >= this.size || col < 0 || col >= this.size) return;

      if (this.numbers[row] && this.numbers[row][col] > 0) return;

      if (this.undoMgr) this.undoMgr.save({ board: this.board.map(r => [...r]) });

      this.board[row][col] = this.board[row][col] === CELL_WHITE ? CELL_BLACK : CELL_WHITE;
      sound.play('click');
      this._tryCheck();
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }

  _tryCheck() {
    if (checkCompletion(this.board, this.numbers, this.size)) {
      this._onVictory();
    }
  }

  _onVictory() {
    this.victory = true;
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    this.confetti.start();
    sound.play('victory');

    const rewardMgr = getRewardManager();
    const rewardResult = rewardMgr.processVictory(this.gameName, {
      difficulty: this.difficulty || 'easy',
      level: this.level,
      time: this.timer || 0
    });
    rewardMgr.showRewardToast(rewardResult);

    let winCount = 0;
    try { const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName + '_' + (this.difficulty || 'easy')) || '{}'); winCount = p.unlocked || 0; } catch(e) {}
    this._newAchievements = this.achievement.check(this.gameName, winCount);
    saveProgress(this.gameName, this.difficulty, this.level);
    statsManager.endGame(true);
  }

  // ── 绘制 ──

  update() {
    this.animationTime += 0.05;
  }

  draw() {
    if (this.loadingOverlay.active) {
      this.loadingOverlay.draw();
      return;
    }
    const ctx = this.ctx;
    const W = this.width, H = this.height;

    _drawBg(ctx, W, H);

    this.headerBar.draw({ title: '数墙' });

    drawStatus(ctx, W, this.boardOffsetY, this.level, this.size, this.timer);

    drawBoard(ctx, this.board, this.numbers, this.size, this.cellSize, this.boardOffsetX, this.boardOffsetY);

    const buttons = [];
    if (this.undoMgr && this.undoMgr.canUndo()) buttons.push({ id: 'undo', text: '撤销' });
    buttons.push({ id: 'restart', text: '重开' });
    this.bottomBar.setButtons(buttons);
    this.bottomBar.draw();

    if (this.tutorial && this.tutorial.shouldShow()) this.tutorial.draw();

    if (this.victory) {
      this.victoryPanel.setSubtitle('第 ' + this.level + ' 关');
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }
  }

  // ── 底部操作 ──

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.undoMgr && this.undoMgr.canUndo()) {
          const state = this.undoMgr.undo();
          if (state && state.board) {
            this.board = state.board;
            sound.play('click');
          }
        }
        break;
      case 'restart':
        this._resetBoard();
        this.undoMgr.clear();
        sound.play('click');
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        break;
    }
  }

  _resetBoard() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        this.board[r][c] = CELL_WHITE;
      }
    }
    this.victory = false;
    if (this.confetti) this.confetti.stop();
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    this.timer = 0;
    this.startTimer();
  }

  destroy() {
    if (this.confetti) this.confetti.stop();
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    this.loadingOverlay.destroy();
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  _drawAchievementPopup() {
    this._newAchievements = null;
  }
}

module.exports = Nurikabe;
