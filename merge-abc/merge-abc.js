/**
 * merge-abc.js — ABC合成记（Merge ABC）主类
 *
 * 游戏规则：
 *   1. 4×4棋盘，滑动合并同字母→升级到下一个字母（A→B→C→...→Z）
 *   2. 每次操作后随机出现新字母（A~D，A出现概率最高）
 *   3. 无法继续移动时游戏结束
 *   4. 支持撤销（最多5步历史）、进度存档
 *
 * 模块拆分（均为纯函数）：
 *   - merge-abc-core.js   — 核心逻辑：移动/合并/检测
 *   - merge-abc-renderer.js — 画面渲染：状态栏、棋盘
 *
 * 所属分包：merge-abc（独立分包）
 */

const statsManager = require('../games/stats-manager.js').getInstance();
const Confetti = require('../games/confetti');
const sound = require('../games/sound-manager');
const TutorialOverlay = require('../games/tutorial-overlay');
const UndoManager = require('../games/undo-manager');
const { AchievementManager } = require('../games/achievement-manager');
const { ShareCard } = require('../games/share-card');
const VictoryPanel = require('../games/components/victory-panel');
const HeaderBar = require('../games/components/header-bar');
const BottomBar = require('../games/components/bottom-bar');
const { getInstance: getRewardManager } = require('../games/reward-manager');

const {
  isInButton, addNewTile, getScore, moveLeft, moveRight, moveUp, moveDown,
  checkGameOver, saveBestScore, saveGameData, saveGameProgress,
} = require('./merge-abc-core');

const {
  drawStatus, drawBoard,
} = require('./merge-abc-renderer');

class MergeABC {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;

    this.level = level;
    this.gameName = 'merge-abc';
    statsManager.startGame(this.gameName, level) || 1;

    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    this.padding = 15;
    this.boardPadding = 12;
    this.gridGap = 10;

    this.boardWidth = this.width - this.padding * 2;
    this.cellSize = Math.floor((this.boardWidth - this.boardPadding * 2 - this.gridGap * 3) / 4);

    this.btnWidth = Math.floor((this.boardWidth - 15) / 2);
    this.btnHeight = 44;

    // 恢复存档
    let saved = null;
    try {
      const raw = wx.getStorageSync('merge_abc_saved');
      saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) { /* ignore */ }
    if (saved && saved.board && saved.board.length === 16) {
      this._board = saved.board;
      this._score = saved.score || 0;
      this._bestScore = saved.bestScore || 0;
      this._gameOver = saved.gameOver || false;
      this._history = saved.history || [];
    } else {
      this._board = new Array(16).fill('');
      this._score = 0;
      this._bestScore = 0;
      this._gameOver = false;
      this._history = [];
      addNewTile(this._board);
      addNewTile(this._board);
    }
    this._showModal = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.undoMgr = new UndoManager();
    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    this._animationTime = 0;

    const storedBest = wx.getStorageSync('merge_abc_best');
    if (storedBest) this._bestScore = storedBest;

    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);

    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      showNext: false,
      backText: '返回菜单'
    });

    this.boardOffsetY = this.headerBar.boardStartY + 46;
    this.btnY = this.boardOffsetY + this.cellSize * 4 + this.gridGap * 3 + this.boardPadding * 2 + 30;

    this.bindEvents();
  }

  bindEvents() {
    this.touchStartHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;

      if (this._showModal) {
        if (this._backBtn && isInButton(x, y, this._backBtn.x, this._backBtn.y, this._backBtn.w, this._backBtn.h)) {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        return;
      }

      const action = this.bottomBar.handleClick(x, y);
      if (action) { this._handleBottomAction(action); return; }

      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }
      this._startX = x;
      this._startY = y;
    };

    this.touchEndHandler = (e) => {
      let touch = e.changedTouches ? e.changedTouches[0] : e;
      let endX = touch.clientX;
      let endY = touch.clientY;

      if (this._showModal) {
        if (this._backBtn && isInButton(endX, endY, this._backBtn.x, this._backBtn.y, this._backBtn.w, this._backBtn.h)) {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        return;
      }
      let dx = endX - this._startX;
      let dy = endY - this._startY;
      let absDx = Math.abs(dx);
      let absDy = Math.abs(dy);

      if (this.headerBar.isBackButton(endX, endY)) {
        sound.play('click');
        this.saveGame();
        this.switchGame('menu');
        return;
      }

      if (Math.max(absDx, absDy) < 30) return;

      if (isInButton(this._startX, this._startY, this.padding, this.btnY, this.btnWidth, this.btnHeight)) {
        this.restart();
        return;
      }
      if (isInButton(this._startX, this._startY, this.padding + this.btnWidth + 15, this.btnY, this.btnWidth, this.btnHeight)) {
        this.undo();
        return;
      }

      if (absDx > absDy) {
        this.handleMove(dx > 0 ? 'right' : 'left');
      } else {
        this.handleMove(dy > 0 ? 'down' : 'up');
      }
    };

    this.canvas.addEventListener('touchstart', this.touchStartHandler);
    this.canvas.addEventListener('touchend', this.touchEndHandler);
  }

  destroy() {
    this.saveGame();
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchend', this.touchEndHandler);
  }

  handleMove(direction) {
    if (this._gameOver) return;
    let moved = false;
    switch (direction) {
      case 'left': moved = moveLeft(this._board); break;
      case 'right': moved = moveRight(this._board); break;
      case 'up': moved = moveUp(this._board); break;
      case 'down': moved = moveDown(this._board); break;
    }
    if (moved) {
      this.saveState();
      addNewTile(this._board);
      this._score = getScore(this._board);
      this._bestScore = saveBestScore(this._score, this._bestScore);
      this.checkGameOver();
      this.saveGame();
    }
  }

  saveState() {
    this._history.push(this._board.slice());
    if (this._history.length > 5) this._history.shift();
  }

  undo() {
    if (this._history.length > 0) {
      this._board = this._history.pop();
      this._score = getScore(this._board);
      this.saveGame();
    }
  }

  checkGameOver() {
    if (!checkGameOver(this._board)) return;
    this._gameOver = true;
    this.victory = true;

    const rewardMgr = getRewardManager();
    const rewardResult = rewardMgr.processVictory(this.gameName, {
      difficulty: 'easy', level: 1, time: 0
    });
    rewardMgr.showRewardToast(rewardResult);

    saveGameProgress(this.gameName, 1);
    statsManager.endGame(true);
    this._showModal = true;
    this._bestScore = saveBestScore(this._score, this._bestScore);
  }

  saveGame() {
    saveGameData(this._board, this._score, this._bestScore, this._gameOver, this._history);
  }

  restart() {
    this._board = new Array(16).fill('');
    this._history = [];
    this._gameOver = false;
    this._showModal = false;
    this._score = 0;
    addNewTile(this._board);
    addNewTile(this._board);
    this.saveGame();
  }

  update() {
    this._animationTime += 16;
  }

  draw() {
    this.ctx.fillStyle = '#0a1628';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.headerBar.draw({ title: '合成ABC' });
    drawStatus(this.ctx, this.width, this.padding, this.headerBar.boardStartY, this._score, this._bestScore);
    drawBoard(this.ctx, this.width, this.padding, this.boardOffsetY, this._board);

    const buttons = [];
    if (this.undoMgr && this.undoMgr.canUndo()) {
      buttons.push({ id: 'undo', text: '撤销' });
    }
    buttons.push({ id: 'restart', text: '重开' });
    this.bottomBar.setButtons(buttons);
    this.bottomBar.draw();

    if (this.victory) {
      this.victoryPanel.setSubtitle(`最高分: ${this._bestScore}`);
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }

    if (this.tutorial && this.tutorial.shouldShow()) this.tutorial.draw();
  }

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.undoMgr && this.undoMgr.canUndo()) {
          const state = this.undoMgr.undo();
          if (state) {
            this._board = state.board;
            sound.playClick();
            this.saveGame();
            this.draw();
          }
        }
        break;
      case 'restart':
        this.restart();
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
}

module.exports = MergeABC;
