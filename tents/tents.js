/**
 * tents.js — 帐篷谜题（Tents）主类
 *
 * 游戏规则：
 *   1. 每个单元格旁都有一棵树（🌲），需要给每棵树分配一顶帐篷（⛺）
 *   2. 帐篷必须紧邻一棵树（上下左右四方向），且每棵树只能有一顶帐篷
 *   3. 帐篷之间不能相邻（包括斜对角共8方向）
 *   4. 行/列提示数字表示该行/列应放置的帐篷总数
 *   5. 正确放置所有帐篷即通关
 *
 * 操作方式：点击空地放置/移除帐篷
 *
 * 模块结构：
 *   - 本文件（tents.js）：主类 Tents，负责交互、状态管理、UI 集成
 *   - tents-core.js：核心逻辑（布局计算、行/列提示、通关验证）
 *   - tents-renderer.js：Canvas 绘制（草地、树木、帐篷、行/列计数）
 *
 * @subpackage tents
 */

const statsManager = require('../games/stats-manager.js').getInstance();
const LevelLoader = require('../games/level-loader');
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

const { calcLayout, calcRowHints, calcColHints, checkVictory, saveProgress } = require('./tents-core');
const { drawBackground, drawStatus, drawBoard } = require('./tents-renderer');

class Tents {
  constructor(ctx, canvas, systemInfo, switchGame, level, difficulty = 'easy') {
    console.log(`[Tents] 初始化游戏, 关卡: ${level}`);
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    this.level = level || 1;
    this.difficulty = difficulty;
    this.gameName = 'tents';

    this._calcLayout(7);
    this.boardOffsetY = this.statusBarHeight + 110;

    this.tents = [];
    this.animationTime = 0;
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = AchievementManager.getInstance();
    this.undoMgr = new UndoManager();
    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    this._ruleBtn = { x: this.width - 50, y: this.statusBarHeight + 14, w: 40, h: 40 };

    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });

    statsManager.startGame(this.gameName, this.level);
    this.loadLevel();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
  }

  _calcLayout(size) {
    const layout = calcLayout(size, this.width, this.height, this.headerBar, this.statusBarHeight);
    this.cellSize = layout.cellSize;
    this.boardOffsetX = layout.boardOffsetX;
    this.boardOffsetY = layout.boardOffsetY;
  }

  async loadLevel() {
    console.log(`[Tents] 加载关卡: ${this.level}`);
    this.confetti.stop();
    if (this.undoMgr) this.undoMgr.clear();
    this.victory = false;
    this._nextBtn = null;
    this._backBtn = null;

    try {
      const data = await LevelLoader.load('tents', this.level, this.difficulty || 'easy');
      if (data && data.grid) {
        this.size = data.size || 7;
        this._calcLayout(this.size);

        this.board = [];
        for (let r = 0; r < this.size; r++) {
          this.board[r] = [];
          for (let c = 0; c < this.size; c++) {
            this.board[r][c] = (data.grid[r] && data.grid[r][c] === 1) ? 1 : 0;
          }
        }

        this.tents = [];
        for (let r = 0; r < this.size; r++) {
          this.tents[r] = [];
          for (let c = 0; c < this.size; c++) {
            this.tents[r][c] = 0;
          }
        }

        this._rowHints = data.rowCounts || calcRowHints(this.board, this.size);
        this._colHints = data.colCounts || calcColHints(this.board, this.size);
        return;
      }
    } catch (e) { /* 使用内置题 */ }

    this.size = 7;
    this._calcLayout(this.size);

    this.board = [
      [0,0,1,0,0,1,0],
      [0,1,0,0,0,0,0],
      [0,0,0,1,0,0,1],
      [0,0,0,0,1,0,0],
      [1,0,0,0,0,0,0],
      [0,0,0,0,0,1,0],
      [0,1,0,0,0,0,1]
    ];

    this.tents = [];
    for (let r = 0; r < this.size; r++) {
      this.tents[r] = [];
      for (let c = 0; c < this.size; c++) {
        this.tents[r][c] = 0;
      }
    }

    this._rowHints = [2, 1, 2, 1, 1, 1, 2];
    this._colHints = [1, 2, 1, 1, 1, 1, 2];
    this.victory = false;
  }

  getRowHints() { return this._rowHints || [2, 1, 2, 1, 1, 1, 2]; }
  getColHints() { return this._colHints || [1, 2, 1, 1, 1, 1, 2]; }

  bindEvents() {
    this.clickHandler = (e) => {
      const t = e.touches ? e.touches[0] : e;
      const x = t.clientX, y = t.clientY;

      if (this._undoBtn && x >= this._undoBtn.x && x <= this._undoBtn.x + this._undoBtn.w &&
          y >= this._undoBtn.y && y <= this._undoBtn.y + this._undoBtn.h) {
        const state = this.undoMgr.undo();
        if (state && state.tents) {
          this.tents = state.tents;
          this.draw();
        }
        return;
      }

      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }

      if (this.headerBar.isBackButton(x, y)) {
        sound.play('click');
        this.switchGame('level-select', this.gameName);
        return;
      }

      const action = this.bottomBar.handleClick(x, y);
      if (action) {
        this._handleBottomAction(action);
        return;
      }

      if (this.victory) {
        const result = this.victoryPanel.handleClick(x, y);
        if (result === 'next') {
          this.level++;
          this.loadLevel();
          sound.play('click');
          this.victoryPanel.reset();
          return;
        }
        if (result === 'back') {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        this.victoryPanel.setSubtitle('关卡 ' + this.level);
        this.victoryPanel.setAchievements(this._newAchievements);
        this.victoryPanel.draw();
        return;
      }

      const col = Math.floor((x - this.boardOffsetX) / this.cellSize);
      const row = Math.floor((y - this.boardOffsetY) / this.cellSize);

      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        if (this.board[row][col] !== 1) {
          this.undoMgr.save({ tents: this.tents.map(r => [...r]) });
          this.tents[row][col] = this.tents[row][col] === 1 ? 0 : 1;
          this.draw();
          this._tryCheck();
        }
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }

  _tryCheck() {
    if (checkVictory(this.tents, this.board, this.size, this.getRowHints(), this.getColHints())) {
      this._onVictory();
    }
  }

  _onVictory() {
    console.log(`[Tents] 通关！关卡: ${this.level}`);
    this.victory = true;
    this.confetti.start();

    const rewardMgr = getRewardManager();
    const rewardResult = rewardMgr.processVictory(this.gameName, {
      difficulty: this.difficulty || 'easy',
      level: this.level,
      time: this.timer || 0
    });
    rewardMgr.showRewardToast(rewardResult);

    let winCount = 0;
    try { const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName + '_' + (this.difficulty || 'easy')) || '{}'); winCount = p.unlocked || 0; } catch (e) {}
    const newly = this.achievement.check(this.gameName, winCount);
    this._newAchievements = newly;
    sound.play('victory');
    saveProgress(this.gameName, this.difficulty, this.level);
    statsManager.endGame(true);
  }

  update() { this.animationTime += 0.08; }

  draw() {
    drawBackground(this.ctx, this.width, this.height, this.animationTime);
    this.headerBar.draw({ title: '帐篷' });
    drawStatus(this.ctx, this.width, this.headerBar, this.statusBarHeight, this.level, this.size);
    drawBoard(this.ctx, this.board, this.tents, this.size, this.cellSize, this.boardOffsetX, this.boardOffsetY, this.getRowHints(), this.getColHints(), this.animationTime);
    this.bottomBar.setButtons([
      { id: 'undo', text: '↩️ 撤销', enabled: this.undoMgr && this.undoMgr.canUndo() },
      { id: 'reset', text: '🔄 重置' }
    ]);
    this.bottomBar.draw();

    if (this.victory) {
      this.victoryPanel.setSubtitle('关卡 ' + this.level);
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }

    if (this.tutorial && this.tutorial.shouldShow()) this.tutorial.draw();
  }

  _handleBottomAction(action) {
    switch (action) {
      case 'reset':
        for (let r = 0; r < this.size; r++)
          for (let c = 0; c < this.size; c++)
            this.tents[r][c] = 0;
        this.victory = false;
        this.confetti.stop();
        if (this.undoMgr) this.undoMgr.clear();
        if (this.victoryPanel) this.victoryPanel.reset();
        sound.play('click');
        this.draw();
        break;
      case 'undo':
        if (this.undoMgr && this.undoMgr.canUndo()) {
          const state = this.undoMgr.undo();
          if (state) { this.tents = state.tents; sound.playClick(); this.draw(); }
        }
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
        break;
    }
  }

  _drawAchievementPopup() { this._newAchievements = null; }

  destroy() {
    if (this.confetti) this.confetti.stop();
    if (this.clickHandler) this.canvas.removeEventListener('click', this.clickHandler);
  }
}

module.exports = Tents;
