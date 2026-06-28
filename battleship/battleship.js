/**
 * battleship.js — 战舰谜题（Battleship）主类
 *
 * 游戏规则：
 *   1. 边缘数字表示该行/列的战舰格子总数
 *   2. 战舰必须为直线（水平或垂直）
 *   3. 不同战舰之间不能相邻（8方向）
 *   4. 点击格子切换状态：空白 ↔ 战舰
 *
 * 模块拆分（均为纯函数）：
 *   - battleship-core.js   — 棋盘逻辑：常量、布局计算、通关检查
 *   - battleship-renderer.js — 画面渲染：背景、棋盘、提示、错误提示
 *
 * 所属分包：battleship（独立分包）
 */

const LevelLoader = require('../games/level-loader');
const statsManager = require('../games/stats-manager.js').getInstance();
const sound = require('../games/sound-manager');
const TutorialOverlay = require('../games/tutorial-overlay');
const UndoManager = require('../games/undo-manager');
const { AchievementManager } = require('../games/achievement-manager');
const { ShareCard } = require('../games/share-card');
const { HintManager } = require('../games/hint-manager');
const { getInstance: getPropMgr } = require('../games/prop-manager');
const Confetti = require('../games/confetti');
const VictoryPanel = require('../games/components/victory-panel');
const LoadingOverlay = require('../games/components/loading-overlay');
const HeaderBar = require('../games/components/header-bar');
const BottomBar = require('../games/components/bottom-bar');
const { getInstance: getRewardManager } = require('../games/reward-manager');

const {
  CELL_EMPTY, CELL_SHIP, CDN_BASE,
  getSizeByDifficulty, computeAll, applyPuzzleData, generateFallback,
  checkCompletion, saveProgress, formatTime,
} = require('./battleship-core');

const {
  drawBackground, drawStatus, drawHints,
  drawGrid, drawErrorHint, drawBottomBar,
} = require('./battleship-renderer');

class Battleship {
  constructor(ctx, canvas, systemInfo, switchGame, level, difficulty = 'easy') {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.gameName = 'battleship';
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.level = level;
    this.difficulty = difficulty;
    this.size = getSizeByDifficulty(difficulty);

    statsManager.startGame(this.gameName, level);

    const dim = computeAll(this.width, this.height, this.statusBarHeight, this.size);
    this.cellSize = dim.cellSize;
    this.hintAreaSize = dim.hintAreaSize;
    this.boardOffsetX = dim.boardOffsetX;
    this.boardOffsetY = dim.boardOffsetY;

    this.grid = [];
    this.solution = [];
    this.rowHints = [];
    this.colHints = [];
    this.shipCount = 0;
    this.totalShips = 0;
    this.animationTime = 0;
    this.victory = false;
    this.timer = 0;
    this.timerInterval = null;

    this.undoMgr = new UndoManager();
    this.hintMgr = new HintManager();
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = AchievementManager.getInstance();

    // ---- 成就跟踪变量 ----
    this._usedHint = false;
    this._firstHit = false;  // 首次点击是否命中
    this._totalShots = 0;
    this._totalHits = 0;
    this._perfectStreak = 0;
    this._noHintStreak = 0;

    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight, { extraTopOffset: 0 });
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      title: '🎉 恭喜通关！',
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => { this._newAchievements = null; }
    });

    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.loadingOverlay = new LoadingOverlay(this.ctx, this.width, this.height, {
      gameName: '战舰'
    });
    this.bindEvents();
    this.loadPuzzle();
  }

  async loadPuzzle() {
    if (this.confetti) this.confetti.stop();
    if (this.undoMgr) this.undoMgr.clear();
    if (this.hintMgr) this.hintMgr.reset();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.loadingOverlay.start();

    try {
      const data = await LevelLoader.load('battleship', this.level, this.difficulty);
      this.loadingOverlay.stop();
      if (data && data.grid) {
        this._applyPuzzle(data);
        return;
      }
    } catch (e) {
      console.log('[Battleship] CDN加载失败，使用内置题目');
    }

    const fallback = generateFallback(this.size, this.difficulty);
    this._applyPuzzle(fallback);
  }

  _applyPuzzle(puzzleData) {
    const result = applyPuzzleData(puzzleData, this.width, this.height, this.statusBarHeight);
    this.size = result.size;
    this.solution = result.grid;
    this.rowHints = result.rowHints;
    this.colHints = result.colHints;
    this.totalShips = result.totalShips;

    const dim = computeAll(this.width, this.height, this.statusBarHeight, this.size);
    this.cellSize = dim.cellSize;
    this.hintAreaSize = dim.hintAreaSize;
    this.boardOffsetX = dim.boardOffsetX;
    this.boardOffsetY = dim.boardOffsetY;

    this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(CELL_EMPTY));
    this.shipCount = 0;
    this.victory = false;
    this.timer = 0;
    this.startTimer();
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

  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;

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
        sound.play('click');
        this.stopTimer();
        this.switchGame('level-select', this.gameName);
        return;
      }

      if (this.victory) {
        const result = this.victoryPanel.handleClick(x, y);
        if (result === 'next') {
          this.level++;
          this.loadPuzzle();
          sound.play('click');
          this.victoryPanel.reset();
          return;
        }
        if (result === 'back') {
          sound.play('click');
          this.stopTimer();
          this.switchGame('level-select', this.gameName);
          return;
        }
        this.victoryPanel.setSubtitle('关卡 ' + this.level);
        this.victoryPanel.setAchievements(this._newAchievements);
        this.victoryPanel.draw();
        return;
      }

      const col = Math.floor((x - this.boardOffsetX - this.hintAreaSize) / this.cellSize);
      const row = Math.floor((y - this.boardOffsetY - this.hintAreaSize) / this.cellSize);

      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        const prevState = this.grid[row][col];
        this.grid[row][col] = this.grid[row][col] === CELL_EMPTY ? CELL_SHIP : CELL_EMPTY;

        if (prevState === CELL_EMPTY) {
          this.shipCount++;
        } else {
          this.shipCount--;
        }

        sound.play('click');
        this._checkCompletion();
      }

      this.draw();
    };

    this.canvas.addEventListener('click', this.clickHandler);
  }

  _handleBottomAction(action) {
    switch (action) {
      case 'reset':
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(CELL_EMPTY));
        this.shipCount = 0;
        this.victory = false;
        this.undoMgr.clear();
        sound.play('click');
        this.draw();
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
        break;
      case 'hint':
        this._usedHint = true;  // 标记使用了提示
        this._useHint();
        break;
      case 'undo':
        this._usedUndo = true;  // 标记使用了撤销
        const state = this.undoMgr.undo();
        if (state) {
          this.grid = state.grid;
          this.shipCount = state.shipCount;
          this.draw();
        }
        break;
    }
  }

  _useHint() {
    const propMgr = getPropMgr();
    if (!propMgr.useProp('hint', this.gameName, this.level, this.difficulty)) {
      wx.showToast({ title: '提示道具不足', icon: 'none' });
      return;
    }
    const hint = this.hintMgr.getHint('battleship', this.solution, this.grid);
    if (hint) {
      this.undoMgr.save({ grid: this.grid.map(r => [...r]), shipCount: this.shipCount });
      this.grid[hint.row][hint.col] = hint.value;
      if (hint.value === CELL_SHIP) this.shipCount++;
      sound.play('click');
      wx.showToast({ title: '消耗1个提示道具', icon: 'none' });
      this._checkCompletion();
      this.draw();
    }
  }

  _checkCompletion() {
    this._errorHint = null;
    const result = checkCompletion(this.grid, this.size, this.rowHints, this.colHints, this.totalShips, this.shipCount);
    if (result && result.error) {
      this._errorHint = result.error;
      this._errorHintTime = Date.now();
    } else if (result && result.success) {
      this._onVictory();
    }
  }

  _onVictory() {
    this.victory = true;
    this.confetti.start();
    sound.play('victory');

    const rewardMgr = getRewardManager();
    const rewardResult = rewardMgr.processVictory(this.gameName, {
      difficulty: this.difficulty,
      level: this.level,
      time: this.timer
    });
    rewardMgr.showRewardToast(rewardResult);

    let winCount = 0;
    try {
      const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName + '_' + this.difficulty) || '{}');
      winCount = p.unlocked || 0;
    } catch (e) {}

    const newlyAchieved = this.achievement.check(this.gameName, winCount);
    this._newAchievements = newlyAchieved;

    // ========== 独有成就解锁判断 ==========
    // 1. 一击必杀：首发射中战舰
    if (this._firstHit) {
      const a = this.achievement.unlock('battleship_first_hit');
      if (a) this._newAchievements = [...(this._newAchievements || []), a];
    }
    // 2. 鹰眼射手：通关10局不使用提示
    if (!this._usedHint) {
      this._noHintStreak = (this._noHintStreak || 0) + 1;
      if (this._noHintStreak >= 10) {
        const a = this.achievement.unlock('battleship_no_hint');
        if (a) this._newAchievements = [...(this._newAchievements || []), a];
      }
    } else {
      this._noHintStreak = 0;
    }
    // 3. 完美胜利：不击沉任何无关格（全中）通关10局
    // 需要记录 totalShots 和 hits，暂时用命中率100%判断
    if (this._totalShots === this._totalHits) {
      this._perfectStreak = (this._perfectStreak || 0) + 1;
      if (this._perfectStreak >= 10) {
        const a = this.achievement.unlock('battleship_perfect');
        if (a) this._newAchievements = [...(this._newAchievements || []), a];
      }
    } else {
      this._perfectStreak = 0;
    }

    saveProgress(this.gameName, this.difficulty, this.level);
    statsManager.endGame(true);
    this.stopTimer();
  }

  update() {
    this.animationTime += 0.05;
  }

  draw() {
    if (this.loadingOverlay.active) {
      this.loadingOverlay.draw();
      return;
    }
    if (this.grid.length === 0) return;
    drawBackground(this.ctx, this.width, this.height);
    this.headerBar.draw({ title: '战舰' });
    drawStatus(this.ctx, this.width, this.boardOffsetY, this.difficulty, this.level, this.timer, this.shipCount, this.totalShips);
    drawHints(this.ctx, this.boardOffsetX, this.boardOffsetY, this.hintAreaSize, this.cellSize, this.size, this.rowHints, this.colHints);
    drawGrid(this.ctx, this.boardOffsetX, this.boardOffsetY, this.hintAreaSize, this.cellSize, this.size, this.grid, this.animationTime);
    drawBottomBar(this.bottomBar);

    if (this.victory) {
      this.victoryPanel.setSubtitle('用时 ' + formatTime(this.timer));
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }

    if (this._errorHint && this._errorHintTime && Date.now() - this._errorHintTime < 3000) {
      drawErrorHint(this.ctx, this.width, this.boardOffsetY, this.hintAreaSize, this.cellSize, this.size, this._errorHint, this._errorHintTime);
    } else {
      this._errorHint = null;
    }

    if (this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
  }

  destroy() {
    this.stopTimer();
    if (this.confetti) this.confetti.stop();
    this.loadingOverlay.destroy();
    this.canvas.removeEventListener('click', this.clickHandler);
  }
}

module.exports = Battleship;
