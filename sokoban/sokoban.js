const LevelLoader = require('../games/level-loader');
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
const core = require('./sokoban-core.js');
const renderer = require('./sokoban-renderer.js');

class Sokoban {
  constructor(ctx, canvas, systemInfo, switchGame, level, difficulty = 'easy') {
    console.log(`[Sokoban] 初始化游戏, 关卡: ${level}`);
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;

    this.level = level;
    this.gameName = 'sokoban';
    statsManager.startGame(this.gameName, level) || 1;

    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.boxImage = null;
    this.loadBoxImage();

    this.difficulty = difficulty;
    this.difficulties = [
      { name: 'easy', label: '简单', size: 6 },
      { name: 'medium', label: '中等', size: 8 },
      { name: 'hard', label: '困难', size: 10 }
    ];

    this.size = 6;
    this.cellSize = Math.min(this.width * 0.8 / this.size, 45);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = this.statusBarHeight + 130;

    this.grid = [];
    this.boxes = [];
    this.player = {r: 1, c: 1};
    this.targets = [];
    this.moves = 0;
    this.history = [];
    this.animationTime = 0;
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = AchievementManager.getInstance();
    this.undoMgr = new UndoManager();

    this.shareCard = new ShareCard(this.ctx, this.width, this.height);

    this.levels = {
      easy: [
        { grid: [
          [1,1,1,1,1,1],
          [1,0,0,0,0,1],
          [1,0,2,0,0,1],
          [1,0,0,2,0,1],
          [1,0,0,0,0,1],
          [1,1,1,1,1,1]
        ], boxes: [{r:2,c:2},{r:3,c:3}], player: {r:4,c:2} }
      ],
      medium: [
        { grid: [
          [1,1,1,1,1,1,1,1],
          [1,0,0,0,0,0,0,1],
          [1,0,2,0,0,2,0,1],
          [1,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,1],
          [1,0,2,0,0,2,0,1],
          [1,0,0,0,0,0,0,1],
          [1,1,1,1,1,1,1,1]
        ], boxes: [{r:2,c:2},{r:3,c:3},{r:4,c:4},{r:5,c:5}], player: {r:1,c:1} }
      ],
      hard: [
        { grid: [
          [1,1,1,1,1,1,1,1,1,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,0,2,0,0,0,0,2,0,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,0,2,0,0,0,0,2,0,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,1,1,1,1,1,1,1,1,1]
        ], boxes: [{r:2,c:2},{r:3,c:3},{r:6,c:6},{r:7,c:7}], player: {r:4,c:4} }
      ]
    };

    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      gameName: this.gameName,
      onNextLevel: () => {
        this.level++;
        this.loadLevel();
        this.draw();
      },
      onBackToMenu: () => this.switchGame('menu')
    });
    this.boardOffsetY = this.headerBar.boardStartY + 25;

    this.loadLevel();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
  }

  loadBoxImage() {
    if (this.boxImage) return;
    try {
      const img = wx.createImage();
      img.onload = () => {
        this.boxImage = img;
        console.log('[Sokoban] 箱子图片加载成功');
      };
      img.onerror = () => {
        console.warn('[Sokoban] 箱子图片加载失败，使用默认绘制');
        this.boxImage = null;
      };
      img.src = 'assets/images/sokoban/box-orange.png';
    } catch (e) {
      console.warn('[Sokoban] 加载箱子图片异常:', e.message);
    }
  }

  async loadLevel() {
    console.log(`[Sokoban] 加载关卡: ${this.level}`);
    if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
    const data = await LevelLoader.load('sokoban', this.level, this.difficulty);
    if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
    if (data && data.grid) {
      const rows = data.rows || data.grid.length;
      const cols = data.cols || data.grid[0]?.length || rows;
      this.size = Math.max(rows, cols);
      this.cellSize = Math.min(this.width * 0.8 / this.size, 40);
      this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
      this.boardOffsetY = this.statusBarHeight + 130;

      this.grid = data.grid.map((row, r) =>
        row.map((cell, c) => {
          const isGoal = data.goals && data.goals.some(g => g[0] === r && g[1] === c);
          return isGoal ? 2 : cell;
        })
      );

      this.player = { r: data.playerStart[0], c: data.playerStart[1] };
      this.boxes = (data.boxes || []).map(b => ({ r: b[0], c: b[1] }));
      this.targets = (data.goals || []).map(g => ({ r: g[0], c: g[1] }));
      this.moves = 0;
      this.history = [];
      this.victory = false;
      return;
    }

    let lvl = this.levels[this.difficulty] && this.levels[this.difficulty][0];
    if (!lvl) {
      lvl = this.levels.easy[0];
    }
    this.size = lvl.grid.length;
    this.cellSize = Math.min(this.width * 0.8 / this.size, 40);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = this.statusBarHeight + 130;

    this.grid = lvl.grid.map(row => [...row]);
    this.boxes = lvl.boxes.map(b => ({...b}));
    this.player = {...lvl.player};
    this.moves = 0;
    this.history = [];
    this.victory = false;

    this.targets = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 2) {
          this.targets.push({r, c});
        }
      }
    }
  }

  setDifficulty(diff) {
    this.difficulty = diff;
    this.loadLevel();
  }

  move(dr, dc) {
    if (this.victory) return;

    const result = core.movePiece(this.grid, this.size, this.boxes, this.player, this.history, this.targets, dr, dc);
    if (!result.moved) return;

    this.moves++;

    if (result.victory) {
      this.onVictory();
    }
  }

  onVictory() {
    console.log(`[Sokoban] 通关!关卡: ${this.level}, 步数: ${this.moves}`);
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
    try { const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName) || '{}'); winCount = p.unlocked || 0; } catch(e) {}
    const newlyAchieved = this.achievement.check(this.gameName, winCount);
    this._newAchievements = newlyAchieved;
    sound.play('victory');
    core.saveProgress(this.gameName, this.level, this.difficulty);
    statsManager.endGame(true);
  }

  bindEvents() {
    this._startX = 0;
    this._startY = 0;

    this.touchStartHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      this._startX = touch.clientX;
      this._startY = touch.clientY;
    };

    this.touchEndHandler = (e) => {
      let touch = e.changedTouches ? e.changedTouches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;

      let dx = x - this._startX;
      let dy = y - this._startY;
      let absDx = Math.abs(dx);
      let absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) >= 30 && !this.victory) {
        if (absDx > absDy) {
          this.move(0, dx > 0 ? 1 : -1);
        } else {
          this.move(dy > 0 ? 1 : -1, 0);
        }
        return;
      }

      this._handleClick(x, y);
    };

    this.canvas.addEventListener('touchstart', this.touchStartHandler);
    this.canvas.addEventListener('touchend', this.touchEndHandler);
  }

  _handleClick(x, y) {
    const action = this.bottomBar.handleClick(x, y);
    if (action) {
      this._handleBottomAction(action);
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

    if (this.victory) {
      const action = this.victoryPanel.handleClick(x, y);
      if (action === 'next') {
        this.level++;
        this.loadLevel();
        sound.play('click');
        this.confetti.stop();
        if (this.undoMgr) this.undoMgr.clear();
        return;
      }
      if (action === 'back') {
        sound.play('click');
        this.switchGame('level-select', this.gameName);
        return;
      }
      return;
    }

    let diffY = 55;
    let diffW = 60;
    let diffGap = 8;
    let totalW = 3 * diffW + 2 * diffGap;
    let diffStartX = (this.width - totalW) / 2;
    for (let i = 0; i < 3; i++) {
      let bx = diffStartX + i * (diffW + diffGap);
      if (y > diffY - 18 && y < diffY + 18 && x > bx && x < bx + diffW) {
        this.setDifficulty(this.difficulties[i].name);
        return;
      }
    }

    if (x > this.width - 85 && y > this.height - 100 && y < this.height - 60) {
      this.loadLevel();
      return;
    }
    if (x > this.width - 85 && y > this.height - 55) {
      this.loadLevel();
      return;
    }

    let btnSize = 50;
    let btnY = this.boardOffsetY + this.size * this.cellSize + 20;
    let btnGap = 10;
    let btnStartX = (this.width - btnSize * 3 - btnGap * 2) / 2;

    if (x > btnStartX + btnSize + btnGap && x < btnStartX + btnSize * 2 + btnGap &&
        y > btnY && y < btnY + btnSize) {
      this.move(-1, 0);
    }
    if (x > btnStartX + btnSize + btnGap && x < btnStartX + btnSize * 2 + btnGap &&
        y > btnY + btnSize + btnGap && y < btnY + btnSize * 2 + btnGap) {
      this.move(1, 0);
    }
    if (x > btnStartX && x < btnStartX + btnSize &&
        y > btnY + btnSize + btnGap && y < btnY + btnSize * 2 + btnGap) {
      this.move(0, -1);
    }
    if (x > btnStartX + (btnSize + btnGap) * 2 && x < btnStartX + btnSize * 3 + btnGap * 2 &&
        y > btnY + btnSize + btnGap && y < btnY + btnSize * 2 + btnGap) {
      this.move(0, 1);
    }
  }

  destroy() {
    if (this.confetti) this.confetti.stop();
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchend', this.touchEndHandler);
  }

  update() {
    this.animationTime += 0.08;
  }

  draw() {
    this.ctx.fillStyle = '#0a1628';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.headerBar.draw({ title: '推箱子' });

    renderer.drawStatus(this.ctx, this.boardOffsetY, this.width, this.level, this.moves);
    renderer.drawBoard(this.ctx, this.grid, this.boxes, this.player, this.targets,
      this.boardOffsetX, this.boardOffsetY, this.cellSize, this.size,
      this.animationTime, this.boxImage);
    renderer.drawControls(this.ctx, this.boardOffsetY, this.cellSize, this.size, this.width);

    const buttons = [];
    if (this.undoMgr && this.undoMgr.canUndo()) {
      buttons.push({ id: 'undo', text: '撤销' });
    }
    buttons.push({ id: 'restart', text: '重开' });
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
          const state = this.undoMgr.undo();
          if (state) {
            this.grid = state.grid;
            this.player = state.player;
            this.boxes = state.boxes;
            sound.playClick();
            this.draw();
          }
        }
        break;
      case 'restart':
        this.loadLevel();
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

  _drawAchievementPopup() {
    this._newAchievements = null;
  }
}

module.exports = Sokoban;
