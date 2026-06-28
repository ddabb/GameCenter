/**
 * 数回 (Slither Link) - 小游戏版
 * 规则：在格点间画线，形成一条闭合回路，数字表示该格周围的线段数
 */

const LevelLoader = require('../games/level-loader');
const statsManager = require('../games/stats-manager.js').getInstance();
const Confetti = require('../games/confetti');
const sound = require('../games/sound-manager');
const TutorialOverlay = require('../games/tutorial-overlay');
const UndoManager = require('../games/undo-manager');
const { AchievementManager } = require('../games/achievement-manager');
const { ShareCard } = require('../games/share-card');
const VictoryPanel = require('../games/components/victory-panel');
const LoadingOverlay = require('../games/components/loading-overlay');
const HeaderBar = require('../games/components/header-bar');
const BottomBar = require('../games/components/bottom-bar');
const { getInstance: getRewardManager } = require('../games/reward-manager');

const { isSingleLoop, saveGameProgress } = require('./slither-link-core');
const { _drawStatus, drawBackground, drawBoard } = require('./slither-link-renderer');

class SlitherLink {
  constructor(ctx, canvas, systemInfo, switchGame, level, difficulty = 'easy') {
    console.log(`[SlitherLink] 初始化游戏, 关卡: ${level}`);
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;

    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    this.level = level;
    this.difficulty = difficulty;
    this.gameName = 'slither-link';

    statsManager.startGame(this.gameName, level) || 1;

    this.hEdges = [];
    this.vEdges = [];
    this.hints = [];
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = AchievementManager.getInstance();
    this.undoMgr = new UndoManager();

    // ---- 成就跟踪变量 ----
    this._usedHint = false;
    this._usedUndo = false;
    this._noHintStreak = 0;

    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    this.animationTime = 0;

    this.loadingOverlay = new LoadingOverlay(this.ctx, this.width, this.height, {
      gameName: '数回'
    });
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);

    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight, { extraTopOffset: 0 });
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => { this._newAchievements = null; }
    });
    this.bindEvents();
    this.loadLevel();
  }

  async loadLevel() {
    console.log(`[SlitherLink] 加载关卡: ${this.level}`);
    if (this.confetti) this.confetti.stop();
    if (this.undoMgr) this.undoMgr.clear();
    this.loadingOverlay.start();
    try {
      const url = LevelLoader.getCDNUrl('slither-link', this.level, this.difficulty);
      console.log(`[SlitherLink] CDN URL: ${url}`);
      const data = await LevelLoader.load('slither-link', this.level, this.difficulty);
      this.loadingOverlay.stop();
      if (data && data.grid) {
        this._applyPuzzleData(data);
        return;
      }
    } catch (e) { console.log(`[SlitherLink] CDN失败: ${e.message}`); }

    // 内置题目（保底）
    this._applyPuzzleData({
      size: 5,
      grid: [
        [3, 2, 1, 1, 2],
        [1, 2, 1, 1, 2],
        [1, 2, 2, 2, 1],
        [2, 1, 1, 2, 1],
        [2, 2, 1, 2, 3]
      ],
      answer: null
    });
  }

  _applyPuzzleData(data) {
    this.size = data.size || 5;
    this.hints = data.grid;
    this.rows = this.size;
    this.cols = this.size;
    this.cellSize = Math.min(this.width * 0.85 / this.size, 50);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = this.statusBarHeight + 175;
    this.victory = false;
    this.undoMgr.clear();
    this.hEdges = [];
    this.vEdges = [];
    for (let r = 0; r <= this.size; r++) {
      this.hEdges[r] = [];
      this.vEdges[r] = [];
      for (let c = 0; c <= this.size; c++) {
        this.hEdges[r][c] = 0;
        this.vEdges[r][c] = 0;
      }
    }
    this._answer = data.answer || null;
    this.draw();
  }

  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;

      const action = this.bottomBar.handleClick(x, y);
      if (action) { this._handleBottomAction(action); return; }

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

      if (this._ruleBtn && x >= this._ruleBtn.x && x <= this._ruleBtn.x + this._ruleBtn.w &&
          y >= this._ruleBtn.y && y <= this._ruleBtn.y + this._ruleBtn.h) {
        this.tutorial.show();
        this.draw();
        return;
      }

      if (this.victory) {
        const result = this.victoryPanel.handleClick(x, y);
        if (result === 'next') { sound.play('click'); this.level++; this.loadLevel(); return; }
        if (result === 'back') { sound.play('click'); this.switchGame('level-select', this.gameName); return; }
        return;
      }

      // 检查水平边
      for (let r = 0; r <= this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const ex = this.boardOffsetX + c * this.cellSize;
          const ey = this.boardOffsetY + r * this.cellSize - 3;
          if (x > ex && x < ex + this.cellSize && y > ey - 15 && y < ey + 15) {
            if (this.undoMgr) this.undoMgr.save({ hEdges: this.hEdges.map(r => [...r]), vEdges: this.vEdges.map(r => [...r]) });
            this.hEdges[r][c] = this.hEdges[r][c] === 1 ? 0 : 1;
            this.checkVictory();
            return;
          }
        }
      }

      // 检查垂直边
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c <= this.size; c++) {
          const ex = this.boardOffsetX + c * this.cellSize - 3;
          const ey = this.boardOffsetY + r * this.cellSize;
          if (x > ex - 15 && x < ex + 15 && y > ey && y < ey + this.cellSize) {
            if (this.undoMgr) this.undoMgr.save({ hEdges: this.hEdges.map(r => [...r]), vEdges: this.vEdges.map(r => [...r]) });
            this.vEdges[r][c] = this.vEdges[r][c] === 1 ? 0 : 1;
            this.checkVictory();
            return;
          }
        }
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }

  checkVictory() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.hints[r][c] !== null) {
          let count = 0;
          if (this.hEdges[r][c] === 1) count++;
          if (this.hEdges[r + 1][c] === 1) count++;
          if (this.vEdges[r][c] === 1) count++;
          if (this.vEdges[r][c + 1] === 1) count++;
          if (count !== this.hints[r][c]) return;
        }
      }
    }

    const loopResult = isSingleLoop(this.hEdges, this.vEdges, this.size);
    if (!loopResult.valid) {
      console.log(`[SlitherLink] 回路检查失败: ${loopResult.reason}`);
      return;
    }

    console.log(`[SlitherLink] 通关！关卡: ${this.level}`);
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
    try {
      const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName + '_' + (this.difficulty || 'easy')) || '{}');
      winCount = p.unlocked || 0;
    } catch (e) {}
    const newlyAchieved = this.achievement.check(this.gameName, winCount);
    this._newAchievements = newlyAchieved;

    // ========== 独有成就解锁判断 ==========
    // 1. 回路高手：30秒内完成一关
    if (this.timer < 30) {
      const a = this.achievement.unlock('slither_speed_30');
      if (a) this._newAchievements = [...(this._newAchievements || []), a];
    }
    // 2. 独立成环：连续10关不使用提示
    if (!this._usedHint) {
      this._noHintStreak = (this._noHintStreak || 0) + 1;
      if (this._noHintStreak >= 10) {
        const a = this.achievement.unlock('slither_no_hint');
        if (a) this._newAchievements = [...(this._newAchievements || []), a];
      }
    } else {
      this._noHintStreak = 0;
    }
    // 3. 终极回路：通关10个困难数回
    let hardCount = 0;
    try {
      const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName + '_hard') || '{}');
      hardCount = p.unlocked || 0;
    } catch(e) {}
    if (this.difficulty === 'hard' && hardCount >= 10) {
      const a = this.achievement.unlock('slither_hard_10');
      if (a) this._newAchievements = [...(this._newAchievements || []), a];
    }

    sound.play('victory');
    saveGameProgress(this.gameName, this.difficulty, this.level);
    statsManager.endGame(true);
  }

  update() {
    this.animationTime += 0.08;
  }

  draw() {
    if (this.loadingOverlay.active) {
      this.loadingOverlay.draw();
      return;
    }
    drawBackground(this.ctx, this.width, this.height);
    this.headerBar.draw({ title: '数回' });
    _drawStatus(this.ctx, this.width, this.boardOffsetY, this.level, this.rows, this.cols);
    drawBoard(this.ctx, this.width, this.height, this.size, this.hints, this.hEdges, this.vEdges,
      this.boardOffsetX, this.boardOffsetY, this.cellSize);

    const buttons = [];
    if (this.undoMgr && this.undoMgr.canUndo()) { buttons.push({ id: 'undo', text: '撤销' }); }
    buttons.push({ id: 'restart', text: '重开' });
    if (this.hintMgr) { buttons.push({ id: 'hint', text: '提示' }); }
    this.bottomBar.setButtons(buttons);
    this.bottomBar.draw();

    if (this.victory) {
      this.victoryPanel.setSubtitle('第 ' + this.level + ' 关');
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }

    if (this.tutorial && this.tutorial.shouldShow()) this.tutorial.draw();
  }

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.undoMgr && this.undoMgr.canUndo()) {
          this._usedUndo = true;  // 标记使用了撤销
          const state = this.undoMgr.undo();
          if (state) {
            this.hEdges = state.hEdges;
            this.vEdges = state.vEdges;
            sound.playClick();
            this.draw();
          }
        }
        break;
      case 'restart':
        this.hEdges = [];
        this.vEdges = [];
        for (let r = 0; r <= this.size; r++) {
          this.hEdges[r] = [];
          this.vEdges[r] = [];
          for (let c = 0; c <= this.size; c++) {
            this.hEdges[r][c] = 0;
            this.vEdges[r][c] = 0;
          }
        }
        this.victory = false;
        this.confetti.stop();
        if (this.undoMgr) this.undoMgr.clear();
        if (this.victoryPanel) this.victoryPanel.reset();
        sound.playClick();
        this.draw();
        break;
      case 'hint':
        if (this.hintMgr) { this._usedHint = true; this.hintMgr.showHint(); sound.playSuccess(); }
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
        break;
    }
  }

  destroy() {
    if (this.confetti) this.confetti.stop();
    this.loadingOverlay.destroy();
    this.canvas.removeEventListener('click', this.clickHandler);
  }
}

module.exports = SlitherLink;
