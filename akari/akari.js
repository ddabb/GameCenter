/**
 * akari.js - 数灯 (Akari) 微信小游戏 Canvas 版
 * 规则：点击放置灯泡(💡)/标记(X)，所有白格都要被照亮，灯泡不能互照
 *       数字格周围必须有恰好该数量的灯泡
 */
const LevelLoader = require('../games/level-loader');
const statsManager = require('../games/stats-manager.js').getInstance();
const sound = require('../games/sound-manager');
const TutorialOverlay = require('../games/tutorial-overlay');
const Confetti = require('../games/confetti');
const UndoManager = require('../games/undo-manager');
const { AchievementManager } = require('../games/achievement-manager');
const { HintManager } = require('../games/hint-manager');
const { ShareCard } = require('../games/share-card');
const VictoryPanel = require('../games/components/victory-panel');
const LoadingOverlay = require('../games/components/loading-overlay');
const HeaderBar = require('../games/components/header-bar');
const BottomBar = require('../games/components/bottom-bar');
const { getInstance: getRewardManager } = require('../games/reward-manager');
const core = require('./akari-core.js');
const renderer = require('./akari-renderer.js');

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
    this.config = core.DIFFICULTY_CONFIG[difficulty] || core.DIFFICULTY_CONFIG.easy;

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
    this.achievement = AchievementManager.getInstance();
    this.shareCard = new ShareCard(this.ctx, this.width, this.height);

    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.loadingOverlay = new LoadingOverlay(this.ctx, this.width, this.height, {
      gameName: '数灯'
    });
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight, {
      extraTopOffset: 0,
      bgColor: '#fef0f5',
      textColor: '#333',
      infoColor: '#888',
      backColor: 'rgba(0,0,0,0.5)',
      titleFontSize: 18,
      infoFontSize: 12,
      height: 48
    });
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight, {
      textColor: '#333',
      bgColor: 'rgba(0,0,0,0.06)',
      disabledColor: 'rgba(0,0,0,0.2)'
    });
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
    const headerH = this.statusBarHeight + 64 + statsBarH + 10;
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
    this.loadingOverlay.start();

    try {
      const data = await LevelLoader.load('akari', this.level, this.difficulty);
      this.loadingOverlay.stop();
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
        if (row.value) return (Array.isArray(row.value) ? row.value : String(row.value).split('')).map(core.mapCell);
        if (row.grid) return (Array.isArray(row.grid) ? row.grid : String(row.grid).split('')).map(core.mapCell);
      }
      if (!Array.isArray(row)) return String(row).split('').map(core.mapCell);
      return row.map(cell => {
        if (typeof cell === 'object' && cell !== null) {
          return cell.value !== undefined ? core.mapCell(cell.value) : (cell.val !== undefined ? core.mapCell(cell.val) : core.mapCell(cell));
        }
        return core.mapCell(cell);
      });
    });

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
          row.push(core.CELL_BLACK_0);
        } else {
          row.push(core.CELL_WHITE);
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
    this.lit = core.updateLit(this.grid, this.lights, this.size);
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
          sound.play('click');
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
        if (this.grid[row][col] >= core.CELL_BLACK) return;

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
          this._usedUndo = true;
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
    this._usedHint = true;  // 标记使用了提示
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
    const errors = core.verify(this.grid, this.lights, this.lit, this.size);

    if (errors.length === 0) {
      wx.showToast({ title: '✅ 验证通过', icon: 'success' });
    } else {
      wx.showToast({ title: '❌ ' + errors[0], icon: 'none' });
    }
    sound.play('click');
  }

  checkCompletion() {
    if (core.checkCompletion(this.grid, this.lights, this.lit, this.size)) {
      this._onVictory();
    }
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

    // ========== 独有成就解锁判断 ==========
    // 1. 闪电点灯：5秒内完成一关
    if (this.timer < 5) {
      const a = this.achievement.unlock('akari_speed_5');
      if (a) this._newAchievements = [...(this._newAchievements || []), a];
    }
    // 2. 暗夜行者：通关10个困难灯塔（需在 progress 里累计）
    let hardCount = 0;
    try {
      const p = JSON.parse(wx.getStorageSync(`progress_${this.gameName}_hard`) || '{}');
      hardCount = p.unlocked || 0;
    } catch (e) {}
    if (this.difficulty === 'hard' && hardCount >= 10) {
      const a = this.achievement.unlock('akari_hard_10');
      if (a) this._newAchievements = [...(this._newAchievements || []), a];
    }
    // 3. 独立思考：连续10关不使用提示（需要在使用提示时记录 streak）
    if (!this._usedHint) {
      this._noHintStreak = (this._noHintStreak || 0) + 1;
      if (this._noHintStreak >= 10) {
        const a = this.achievement.unlock('akari_no_hint');
        if (a) this._newAchievements = [...(this._newAchievements || []), a];
      }
    } else {
      this._noHintStreak = 0;
    }

    core.saveProgress(this.gameName, this.level, this.difficulty);
    statsManager.endGame(true);
    this.draw();
  }

  _drawAchievementPopup() {
    this._newAchievements = null;
  }

  update() {
    this.animationTime += 0.05;
  }

  draw() {
    if (this.loadingOverlay.active) {
      this.loadingOverlay.draw();
      return;
    }
    const ctx = this.ctx;

    ctx.fillStyle = '#fef0f5';
    ctx.fillRect(0, 0, this.width, this.height);

    this._drawHeader();
    renderer.drawStatsBar(ctx, this);
    renderer.drawGrid(ctx, this);
    renderer.drawBottomBar(ctx, this);

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
    this.headerBar.draw({ title: '灯塔' });
  }

  destroy() {
    this.stopTimer();
    if (this.confetti) this.confetti.stop();
    this.loadingOverlay.destroy();
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = Akari;
