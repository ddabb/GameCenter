/**
 * one-stroke.js — 一笔画（One Stroke）主类
 *
 * 游戏规则：
 *   1. 网格中有若干"洞"（不可经过），其余格子均可通行
 *   2. 从任意位置开始，拖动连线经过所有通行格子（每个格子仅一次）
 *   3. 正交相邻（上下左右）的格子才可连接
 *   4. 支持拖拽连续绘制（touchstart→touchmove→touchend）
 *
 * 模块拆分：
 *   - one-stroke-core.js   — 核心算法：DFS回溯路径搜索、谜题生成
 *   - one-stroke-renderer.js — 画面渲染：网格、路径线、答案动画
 *
 * 数据来源：优先CDN，失败后本地DFS生成
 *
 * 所属分包：one-stroke（独立分包）
 */

const LevelLoader = require('../games/level-loader');
const Confetti = require('../games/confetti');
const sound = require('../games/sound-manager');
const TutorialOverlay = require('../games/tutorial-overlay');
const UndoManager = require('../games/undo-manager');
const { AchievementManager } = require('../games/achievement-manager');
const { ShareCard } = require('../games/share-card');
const statsManager = require('../games/stats-manager.js').getInstance();
const { getInstance: getRewardManager } = require('../games/reward-manager');

const GridPathFinder = require('./one-stroke-core.js');
const renderer = require('./one-stroke-renderer.js');

// 共享 UI 组件
const HeaderBar = require('../games/components/header-bar');
const BottomBar = require('../games/components/bottom-bar');
const VictoryPanel = require('../games/components/victory-panel');
const LoadingOverlay = require('../games/components/loading-overlay');

class OneStroke {
  constructor(ctx, canvas, systemInfo, switchGame, level, difficulty = 'easy') {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.gameName = 'one-stroke';
    this.level = level || 1;
    this.difficulty = difficulty;

    this.grid = [];       // 0=有效, 1=洞
    this.rows = 6;
    this.cols = 6;
    this.path = [];       // 当前路径 [idx, ...]
    this.answerPath = null;
    this.totalValid = 0;
    this.isComplete = false;
    this.isPlaying = false;
    this.time = 0;
    this.timer = null;

    this.loadingOverlay = new LoadingOverlay(this.ctx, this.width, this.height, {
      gameName: '一笔画'
    });

    this.cellSize = 50;
    this.boardOffsetX = 0;
    this.boardOffsetY = 0;

    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.undoMgr = new UndoManager();
    this.achievement = AchievementManager.getInstance();

    // ---- 成就跟踪变量 ----
    this._liftedPen = false;  // 是否中途抬笔
    this._noLiftStreak = 0;

    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);

    this._touchActive = false;
    this._lastTouchIdx = null;
    this._isDragging = false;       // 标记是否拖拽中，用于阻止拖拽结束后的幽灵click
    this._answerAnimTimer = null;
    this._showAnswer = false;
    this._answerAnimIndex = -1;

    statsManager.startGame(this.gameName, this.level);

    // 共享 UI 组件
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
    console.log(`[OneStroke] 加载关卡: ${this.level}, 难度: ${this.difficulty}`);
    if (this.confetti) this.confetti.stop();
    if (this.undoMgr) this.undoMgr.clear();
    this.stopTimer();
    this.isPlaying = false;
    this.loadingOverlay.start();

    let data = null;
    try {
      data = await LevelLoader.load('one-stroke', this.level, this.difficulty);
    } catch (e) {
      console.log('[OneStroke] CDN加载失败，使用本地生成', e.message);
    }
    this.loadingOverlay.destroy();

    if (data && data.holes) {
      this._initFromData(data);
      return;
    }

    // 本地生成保底
    this._generateLocal();
  }

  _initFromData(data) {
    const { rows, cols } = data;
    this.rows = rows || 6;
    this.cols = cols || 6;
    this.grid = new Array(this.rows * this.cols).fill(0);
    for (const h of data.holes) {
      if (h >= 0 && h < this.grid.length) this.grid[h] = 1;
    }
    this.totalValid = this.grid.filter(v => v === 0).length;
    this.path = [];
    this.answerPath = (data.answer && data.answer.length > 0) ? data.answer : null;
    this.victory = false;
    this.isComplete = false;
    this.isPlaying = true;
    this.time = 0;
    this._showAnswer = false;
    this._answerAnimIndex = -1;
    this._calcLayout();
    this.startTimer();
    this.draw();
  }

  _generateLocal() {
    console.log('[OneStroke] 本地生成关卡');
    const cfg = { easy: [6, 6], medium: [8, 8], hard: [10, 10] }[this.difficulty] || [6, 6];
    this.rows = cfg[0];
    this.cols = cfg[1];
    const holes = GridPathFinder.generateValidPuzzle(this.rows, this.cols, 0.3);
    this.grid = new Array(this.rows * this.cols).fill(0);
    for (const h of holes) {
      if (h >= 0 && h < this.grid.length) this.grid[h] = 1;
    }
    this.totalValid = this.grid.filter(v => v === 0).length;

    // 计算答案
    try {
      const finder = new GridPathFinder(this.rows, this.cols, holes);
      let start = 0;
      for (let i = 0; i < this.rows * this.cols; i++) {
        if (this.grid[i] === 0) { start = i; break; }
      }
      finder.setPassedPotAndPath(0, start, true);
      finder.run(0);
      this.answerPath = finder.getPath();
    } catch (e) {
      this.answerPath = null;
    }

    this.path = [];
    this.victory = false;
    this.isComplete = false;
    this.isPlaying = true;
    this.time = 0;
    this._showAnswer = false;
    this._answerAnimIndex = -1;
    this._calcLayout();
    this.startTimer();
    this.draw();
  }

  _calcLayout() {
    const maxGridW = this.width * 0.92;
    const maxGridH = this.height - 200;
    const maxCellByW = Math.floor(maxGridW / this.cols);
    const maxCellByH = Math.floor(maxGridH / this.rows);
    const minSize = this.rows >= 10 ? 26 : (this.rows >= 8 ? 30 : 32);
    const maxSize = this.rows <= 6 ? 70 : (this.rows <= 8 ? 55 : 45);
    this.cellSize = Math.max(minSize, Math.min(maxCellByW, maxCellByH, maxSize));
    const gridW = this.cellSize * this.cols;
    const gridH = this.cellSize * this.rows;
    this.boardOffsetX = (this.width - gridW) / 2;
    this.boardOffsetY = this.statusBarHeight + 100;
  }

  _idxToRC(idx) {
    return [Math.floor(idx / this.cols), idx % this.cols];
  }

  _adjacent(a, b) {
    const [ra, ca] = this._idxToRC(a);
    const [rb, cb] = this._idxToRC(b);
    return (Math.abs(ra - rb) === 1 && ca === cb) || (ra === rb && Math.abs(ca - cb) === 1);
  }

  // ========== 绘制 ==========
  drawBoard() {
    if (!this.grid || this.grid.length === 0) return;
    renderer.drawGrid(this.ctx, this.cellSize, this.boardOffsetX, this.boardOffsetY, this.rows, this.cols, this.grid, this.path);
    if (this.answerPath && this._showAnswer) {
      renderer.drawAnswerPath(this.ctx, this.cellSize, this.boardOffsetX, this.boardOffsetY, this.rows, this.cols, this.answerPath, this._answerAnimIndex);
    }
  }

  draw() {
    if (this.loadingOverlay.active) {
      this.loadingOverlay.draw();
      return;
    }
    this.ctx.fillStyle = '#0a1628';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.headerBar.draw({
      title: '一笔画'
    });
    
    renderer.drawStatus(this.ctx, this.width, this.boardOffsetY, this.level, this.difficulty);
    
    this.drawBoard();
    const buttons = [];
    if (this.undoMgr && this.undoMgr.canUndo()) {
      buttons.push({ id: 'undo', text: '撤销' });
    }
    buttons.push({ id: 'restart', text: '重开' });
    if (this.hintMgr) {
      buttons.push({ id: 'hint', text: '提示' });
    }
    this.bottomBar.setButtons(buttons);
    this.bottomBar.draw();
    
    if (this.victory) {
      this.victoryPanel.setSubtitle('第 ' + this.level + ' 关');
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }
  }

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.undoMgr && this.undoMgr.canUndo()) {
          const prev = this.undoMgr.undo();
          if (prev) {
            this.path = prev;
            sound.playClick();
            this.draw();
          }
        }
        break;
      case 'restart':
        this.path = [];
        this.undoMgr.clear();
        this.startTimer();
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

  _onVictory() {
    this.victory = true;
    this.isComplete = true;
    this.stopTimer();
    this.confetti.start();
    sound.playWin();
    
    const rewardMgr = getRewardManager();
    const rewardResult = rewardMgr.processVictory(this.gameName, {
      difficulty: this.difficulty || 'easy',
      level: this.level,
      time: this.time || 0
    });
    rewardMgr.showRewardToast(rewardResult);
    
    statsManager.endGame(true);

    // ========== 成就检查 ==========
    let winCount = 0;
    try {
      const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName) || '{}');
      winCount = p.unlocked || 0;
    } catch (e) {}
    this._newAchievements = this.achievement.check(this.gameName, winCount);

    // ========== 独有成就解锁判断 ==========
    // 1. 一笔勾勒：30秒内完成一关
    if (this.time < 30) {
      const a = this.achievement.unlock('one_stroke_speed');
      if (a) this._newAchievements = [...(this._newAchievements || []), a];
    }
    // 2. 无暇笔触：连续10关不抬笔（一次完成，需记录是否中途抬笔）
    if (!this._liftedPen) {
      this._noLiftStreak = (this._noLiftStreak || 0) + 1;
      if (this._noLiftStreak >= 10) {
        const a = this.achievement.unlock('one_stroke_no_lift');
        if (a) this._newAchievements = [...(this._newAchievements || []), a];
      }
    } else {
      this._noLiftStreak = 0;
    }
    // 3. 笔画大师：通关50关
    if (winCount >= 50) {
      const a = this.achievement.unlock('one_stroke_win_50');
      if (a) this._newAchievements = [...(this._newAchievements || []), a];
    }

    try {
      const baseKey = 'progress_' + this.gameName;
      let saved = wx.getStorageSync(baseKey);
      let progress = saved ? JSON.parse(saved) : { unlocked: 1 };
      if (this.level >= (progress.unlocked || 1)) {
        progress.unlocked = this.level + 1;
        wx.setStorageSync(baseKey, JSON.stringify(progress));
      }

      const diffKey = `progress_${this.gameName}_${this.difficulty}`;
      let diffSaved = wx.getStorageSync(diffKey);
      let diffProgress = diffSaved ? JSON.parse(diffSaved) : { unlocked: 1 };
      if (this.level >= (diffProgress.unlocked || 1)) {
        diffProgress.unlocked = this.level + 1;
        wx.setStorageSync(diffKey, JSON.stringify(diffProgress));
      }
    } catch (e) {}

    this.draw();
  }

  // ========== 交互 ==========
  bindEvents() {
    this._clickHandler = (e) => {
      // 拖拽结束后（touchend）game.js 会自动生成幽灵 click，
      // 跳过它，避免意外修改路径（如截断最后一个格子或清空路径）
      if (this._isDragging) {
        this._isDragging = false;
        return;
      }
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;

      if (this.victory) {
        const action = this.victoryPanel.handleClick(x, y);
        if (action === 'next') {
          this.level++;
          this.loadLevel();
          sound.play('click');
          return;
        }
        if (action === 'back') {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        return;
      }

      if (this.tutorial && this.tutorial.shouldShow()) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }

      // 返回按钮
      if (this.headerBar.isBackButton(x, y)) {
        this.stopTimer();
        if (this._answerAnimTimer) clearInterval(this._answerAnimTimer);
        this.switchGame('level-select', this.gameName);
        return;
      }

      // 重开按钮
      if (x >= this.width - 90 && x <= this.width - 15 && y >= this.statusBarHeight + 8 && y <= this.statusBarHeight + 40) {
        this._reset();
        return;
      }

      // 底部工具栏按钮检测
      const action = this.bottomBar.handleClick(x, y);
      if (action) {
        this._handleBottomAction(action);
        return;
      }

      this._handleCellClick(x, y);
    };

    this.canvas.addEventListener('click', this._clickHandler);

    this._touchStartHandler = (e) => {
      if (this.victory || !this.isPlaying) return;
      this._isDragging = false;       // 新一次触摸开始，重置拖拽标记
      const touch = e.touches[0];
      const x = touch.clientX, y = touch.clientY;
      if (this.headerBar.isBackButton(x, y)) {
        this.stopTimer();
        if (this._answerAnimTimer) clearInterval(this._answerAnimTimer);
        this.switchGame('level-select', this.gameName);
        return;
      }
      this._touchActive = true;
      this._handleCellClick(x, y, false);
    };
    this.canvas.addEventListener('touchstart', this._touchStartHandler);

    this._touchMoveHandler = (e) => {
      if (!this._touchActive || this.victory || !this.isPlaying) return;
      this._isDragging = true;        // 发生滑动，标记为拖拽中
      const touch = e.touches[0];
      this._handleCellClick(touch.clientX, touch.clientY, true);
    };
    this.canvas.addEventListener('touchmove', this._touchMoveHandler, { passive: true });

    this._touchEndHandler = () => {
      this._touchActive = false;
      this._lastTouchIdx = null;
      // 注意：_isDragging 不在此处清除，留在 _clickHandler 中判断幽灵 click
    };
    this.canvas.addEventListener('touchend', this._touchEndHandler);

    // touchcancel：处理系统中断（如来电、通知栏下拉）和桌面端鼠标移出canvas的情况
    this._touchCancelHandler = () => {
      this._touchActive = false;
      this._lastTouchIdx = null;
      this._isDragging = false;
    };
    this.canvas.addEventListener('touchcancel', this._touchCancelHandler);
  }

  _handleCellClick(x, y, isSliding) {
    if (!this.isPlaying || this.victory) return;
    const idx = this._getCellAtPoint(x, y);
    if (idx === null) return;
    if (this.grid[idx] === 1) return; // 洞不可点击
    if (isSliding && this._lastTouchIdx === idx) return;

    const path = this.path;

    // 已在路径中 → 截断
    const existingIdx = path.indexOf(idx);
    if (existingIdx >= 0) {
      this._liftedPen = true;  // 标记抬笔（截断路径）
      this.undoMgr.save(path.slice());
      this.path = path.slice(0, existingIdx);
      this._lastTouchIdx = existingIdx > 0 ? path[existingIdx - 1] : null;
      sound.playClick();
      this.draw();
      return;
    }

    // 第一个格子
    if (path.length === 0) {
      this.undoMgr.save(path.slice());
      this.path = [idx];
      this._lastTouchIdx = idx;
      sound.playClick();
      this._checkComplete();
      this.draw();
      return;
    }

    // 必须与最后一个格子相邻
    const last = path[path.length - 1];
    if (!this._adjacent(last, idx)) {
      if (isSliding) return;
      this.undoMgr.save(path.slice());
      this.path = [idx];
      this._lastTouchIdx = idx;
      sound.playClick();
      this.draw();
      return;
    }

    // 正常添加
    this.undoMgr.save(path.slice());
    this.path.push(idx);
    this._lastTouchIdx = idx;
    sound.playClick();
    this._checkComplete();
    this.draw();
  }

  _getCellAtPoint(x, y) {
    const { cellSize, boardOffsetX, boardOffsetY, rows, cols } = this;
    const col = Math.floor((x - boardOffsetX) / cellSize);
    const row = Math.floor((y - boardOffsetY) / cellSize);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
    return row * cols + col;
  }

  _checkComplete() {
    if (this.path.length === this.totalValid) {
      this._onVictory();
    }
  }

  // ========== 计时器 ==========
  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.time++;
      if (!this.victory) this.draw();
    }, 1000);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ========== 控制 ==========
  _reset() {
    this.stopTimer();
    this.path = [];
    this.victory = false;
    this.isComplete = false;
    this.time = 0;
    this._showAnswer = false;
    this._answerAnimIndex = -1;
    if (this._answerAnimTimer) { clearInterval(this._answerAnimTimer); this._answerAnimTimer = null; }
    this.startTimer();
    this.draw();
  }

  nextPuzzle() {
    this.stopTimer();
    if (this._answerAnimTimer) { clearInterval(this._answerAnimTimer); this._answerAnimTimer = null; }
    this.level++;
    this.loadLevel();
  }

  setDifficulty(d) {
    this.difficulty = d;
    this.level = 1;
    this.loadLevel();
  }

  // ========== 答案动画 ==========
  showAnswer() {
    if (!this.answerPath) {
      wx.showToast({ title: '暂无答案', icon: 'none' });
      return;
    }
    this._showAnswer = true;
    this._answerAnimIndex = -1;
    this._savedPath = this.path.slice();
    this._savedTime = this.time;
    this.path = [];
    this.stopTimer();

    const totalSteps = this.answerPath.length;
    let animIdx = 0;
    this._answerAnimTimer = setInterval(() => {
      animIdx++;
      this._answerAnimIndex = animIdx;
      this.draw();
      if (animIdx >= totalSteps - 1) {
        clearInterval(this._answerAnimTimer);
        this._answerAnimTimer = null;
        setTimeout(() => {
          if (this._showAnswer) {
            this._answerAnimIndex = -1;
            this.draw();
            setTimeout(() => this.showAnswer(), 500);
          }
        }, 500);
      }
    }, 150);
  }

  hideAnswer() {
    if (this._answerAnimTimer) { clearInterval(this._answerAnimTimer); this._answerAnimTimer = null; }
    this._showAnswer = false;
    this._answerAnimIndex = -1;
    this.path = this._savedPath || [];
    this.time = this._savedTime || 0;
    this.startTimer();
    this.draw();
  }

  _handleVictoryClick(e) {
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX;
    const y = touch.clientY;
    if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w &&
        y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
      this.stopTimer();
      if (this._answerAnimTimer) clearInterval(this._answerAnimTimer);
      this.confetti.stop();
      this.switchGame('level-select', this.gameName);
      return;
    }
    if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w &&
        y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {
      this.nextPuzzle();
    }
  }

  // ========== 存档 ==========
  saveState() {
    try {
      wx.setStorageSync('onestroke_saved', {
        grid: this.grid,
        path: this.path,
        rows: this.rows,
        cols: this.cols,
        level: this.level,
        difficulty: this.difficulty,
        time: this.time,
        totalValid: this.totalValid,
        answerPath: this.answerPath
      });
    } catch (e) {}
  }

  loadState() {
    try {
      const s = wx.getStorageSync('onestroke_saved');
      if (s && s.grid) {
        this.grid = s.grid;
        this.path = s.path || [];
        this.rows = s.rows;
        this.cols = s.cols;
        this.level = s.level;
        this.difficulty = s.difficulty || 'easy';
        this.time = s.time || 0;
        this.totalValid = s.totalValid || this.grid.filter(v => v === 0).length;
        this.answerPath = s.answerPath || null;
        this.victory = false;
        this.isPlaying = true;
        this._calcLayout();
        this.startTimer();
        return true;
      }
    } catch (e) {}
    return false;
  }

  destroy() {
    this.stopTimer();
    this.loadingOverlay.destroy();
    if (this._answerAnimTimer) {
      clearInterval(this._answerAnimTimer);
      this._answerAnimTimer = null;
    }
    if (this._clickHandler) {
      this.canvas.removeEventListener('click', this._clickHandler);
    }
    if (this._touchStartHandler) {
      this.canvas.removeEventListener('touchstart', this._touchStartHandler);
    }
    if (this._touchMoveHandler) {
      this.canvas.removeEventListener('touchmove', this._touchMoveHandler);
    }
    if (this._touchEndHandler) {
      this.canvas.removeEventListener('touchend', this._touchEndHandler);
    }
    if (this._touchCancelHandler) {
      this.canvas.removeEventListener('touchcancel', this._touchCancelHandler);
    }
  }
}

module.exports = OneStroke;
