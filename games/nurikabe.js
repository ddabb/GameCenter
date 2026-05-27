/**
 * 数墙 (Nurikabe) Canvas 版
 * 规则（参考 freetools 实现）：
 * 1. 点击非数字格切换：白 ↔ 黑
 * 2. 每个数字格属于一个大小等于该数字的白色连通区域
 * 3. 所有黑色格子连通
 * 4. 没有 2×2 的全黑区域
 */
const LevelLoader = require('./level-loader');
const roundRect = require('../utils/round-rect.js');
const statsManager = require('./stats-manager.js').getInstance();
const Confetti = require('./confetti');
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const VictoryPanel = require('./components/victory-panel');
const HeaderBar = require('./components/header-bar');
const BottomBar = require('./components/bottom-bar');
const { getInstance: getRewardManager } = require('./reward-manager');

const CELL_WHITE = 0;
const CELL_BLACK = 1;

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
    this.numbers = [];   // 数字提示（CDN grid）
    this.board = [];     // 玩家状态：0=白, 1=黑
    this.solution = [];  // 答案（可选，用于提示）
    this._dataReady = false;

    this.cellSize = 50;
    this.boardOffsetX = 0;
    this.boardOffsetY = (this.headerBar ? this.headerBar.boardStartY : 100) + 65;

    this.victory = false;
    this.animationTime = 0;
    this.timer = 0;
    this.timerInterval = null;

    this.confetti = new Confetti(ctx, this.width, this.height);
    this.achievement = new AchievementManager();
    this.undoMgr = new UndoManager();

    this.tutorial = new TutorialOverlay(ctx, this.width, this.height, this.gameName);

    // 共享 UI 组件
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

    try {
      const data = await LevelLoader.load('nurikabe', this.level, this.difficulty);
      if (data && data.grid) {
        this.size = data.size || 5;
        this.numbers = data.grid;
        this.solution = data.solution || null;

        // 初始化：所有格为白
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

  formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  // ── 事件 ──────────────────────────────────────────────────────────────

  bindEvents() {
    this.clickHandler = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX, y = touch.clientY;

      // 规则弹窗优先
      if (this.tutorial && this.tutorial.shouldShow()) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }

      // 底部工具栏
      const action = this.bottomBar.handleClick(x, y);
      if (action) { this._handleBottomAction(action); return; }

      // 返回按钮
      if (this.headerBar.isBackButton(x, y)) {
        sound.play('click');
        this.switchGame('level-select', this.gameName);
        return;
      }

      // 胜利面板
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

      // 棋盘点击
      if (!this._dataReady) return;
      const col = Math.floor((x - this.boardOffsetX) / this.cellSize);
      const row = Math.floor((y - this.boardOffsetY) / this.cellSize);
      if (row < 0 || row >= this.size || col < 0 || col >= this.size) return;

      // 数字格不能切换
      if (this.numbers[row] && this.numbers[row][col] > 0) return;

      // 保存撤销
      if (this.undoMgr) this.undoMgr.save({ board: this.board.map(r => [...r]) });

      // 切换：白 ↔ 黑
      this.board[row][col] = this.board[row][col] === CELL_WHITE ? CELL_BLACK : CELL_WHITE;
      sound.play('click');
      this.checkCompletion();
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }

  // ── 胜利检查（参考 freetools 实现） ──────────────────────────────────

  checkCompletion() {
    const { size, numbers, board } = this;
    if (!board || board.length === 0) return;

    // 1. 检查 2×2 全黑
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        if (board[r][c] === CELL_BLACK &&
            board[r][c + 1] === CELL_BLACK &&
            board[r + 1][c] === CELL_BLACK &&
            board[r + 1][c + 1] === CELL_BLACK) {
          return;
        }
      }
    }

    // 2. BFS 找白色连通区域
    const visited = Array.from({ length: size }, () => Array(size).fill(false));
    const regionOf = Array.from({ length: size }, () => Array(size).fill(-1));
    let regionId = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!visited[r][c] && board[r][c] === CELL_WHITE) {
          const queue = [[r, c]];
          visited[r][c] = true;
          const cells = [];
          while (queue.length > 0) {
            const [cr, cc] = queue.shift();
            cells.push([cr, cc]);
            for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
              const nr = cr + dr, nc = cc + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size &&
                  !visited[nr][nc] && board[nr][nc] === CELL_WHITE) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
              }
            }
          }
          for (const [cr, cc] of cells) regionOf[cr][cc] = regionId;
          regionId++;
        }
      }
    }

    // 3. 每个白色区域恰好有一个数字，且区域大小=数字
    const numberInRegion = {};
    let numberCount = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (numbers[r] && numbers[r][c] > 0) {
          numberCount++;
          const rid = regionOf[r][c];
          if (rid === -1) return;                    // 数字格在黑格中
          if (numberInRegion[rid] !== undefined) return; // 一区域多数字
          numberInRegion[rid] = numbers[r][c];
        }
      }
    }

    if (Object.keys(numberInRegion).length !== numberCount) return; // 有数字不在白区域
    if (regionId !== numberCount) return; // 白区域数≠数字数

    const regionSizeMap = {};
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (regionOf[r][c] !== -1) {
          regionSizeMap[regionOf[r][c]] = (regionSizeMap[regionOf[r][c]] || 0) + 1;
        }
      }
    }
    for (const rid in numberInRegion) {
      if (regionSizeMap[rid] !== numberInRegion[rid]) return; // 区域大小≠数字
    }

    // 4. 黑格连通
    if (!this._areBlackCellsConnected()) return;

    // 全部通过
    this._onVictory();
  }

  _areBlackCellsConnected() {
    const { size, board } = this;
    let startR = -1, startC = -1;
    for (let r = 0; r < size && startR === -1; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === CELL_BLACK) { startR = r; startC = c; break; }
      }
    }
    if (startR === -1) return false;

    const visited = Array.from({ length: size }, () => Array(size).fill(false));
    const queue = [[startR, startC]];
    let count = 0;
    while (queue.length > 0) {
      const [r, c] = queue.shift();
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      if (visited[r][c] || board[r][c] !== CELL_BLACK) continue;
      visited[r][c] = true;
      count++;
      queue.push([r-1,c],[r+1,c],[r,c-1],[r,c+1]);
    }

    let totalBlack = 0;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (board[r][c] === CELL_BLACK) totalBlack++;
    return count === totalBlack;
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
    this.saveGameProgress();
    statsManager.endGame(true);
  }

  // ── 绘制 ──────────────────────────────────────────────────────────────

  update() {
    this.animationTime += 0.05;
  }

  draw() {
    const ctx = this.ctx;
    const W = this.width, H = this.height;

    // 背景
    if (!this._bgGradient) {
      this._bgGradient = ctx.createLinearGradient(0, 0, 0, H);
      this._bgGradient.addColorStop(0, '#e0f7fa');
      this._bgGradient.addColorStop(1, '#80deea');
    }
    ctx.fillStyle = this._bgGradient;
    ctx.fillRect(0, 0, W, H);

    // 头部
    this.headerBar.draw({ title: '数墙' });

    // 状态栏
    this._drawStatus();

    // 棋盘
    if (!this._dataReady) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⏳ 加载中...', W / 2, this.boardOffsetY + 80);
    } else {
      this._drawBoard();
    }

    // 底部工具栏
    const buttons = [];
    if (this.undoMgr && this.undoMgr.canUndo()) buttons.push({ id: 'undo', text: '撤销' });
    buttons.push({ id: 'restart', text: '重开' });
    this.bottomBar.setButtons(buttons);
    this.bottomBar.draw();

    // 规则弹窗
    if (this.tutorial && this.tutorial.shouldShow()) this.tutorial.draw();

    // 胜利面板
    if (this.victory) {
      this.victoryPanel.setSubtitle('第 ' + this.level + ' 关');
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }
  }

  _drawStatus() {
    const ctx = this.ctx;
    const y = this.boardOffsetY - 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    roundRect(ctx, this.width * 0.1, y - 12, this.width * 0.8, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#00796b';
    ctx.font = 'bold 12px Arial, -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(`第${this.level}关 · ${this.size}×${this.size}  ⏱ ${this.formatTime(this.timer)}`, this.width / 2, y);
    ctx.textAlign = 'left';
  }

  _drawBoard() {
    if (!this.board || this.board.length === 0 || !this.numbers || this.numbers.length === 0) return;
    const ctx = this.ctx;
    const { size, cellSize, boardOffsetX, boardOffsetY } = this;

    // 棋盘阴影 + 白色底板
    ctx.fillStyle = 'rgba(0, 105, 90, 0.15)';
    ctx.beginPath();
    roundRect(ctx, boardOffsetX + 3, boardOffsetY + 5, cellSize * size, cellSize * size, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    roundRect(ctx, boardOffsetX, boardOffsetY, cellSize * size, cellSize * size, 12);
    ctx.fill();

    // 裁剪到圆角区域内
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, boardOffsetX, boardOffsetY, cellSize * size, cellSize * size, 12);
    ctx.clip();

    for (let r = 0; r < size; r++) {
      if (!this.board[r]) continue;
      for (let c = 0; c < size; c++) {
        const x = boardOffsetX + c * cellSize;
        const y = boardOffsetY + r * cellSize;
        const isNumber = this.numbers[r] && this.numbers[r][c] > 0;
        const isBlack = this.board[r][c] === CELL_BLACK;

        // 格子背景
        if (isBlack) {
          // 黑格：深色渐变（参考 wxss: #37474f → #263238）
          const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
          grad.addColorStop(0, '#37474f');
          grad.addColorStop(1, '#263238');
          ctx.fillStyle = grad;
        } else if (isNumber) {
          // 数字格：淡青绿背景（参考 wxss: #e0f2f1）
          ctx.fillStyle = '#e0f2f1';
        } else {
          // 白格：微微泛青的白色
          ctx.fillStyle = '#fafffe';
        }
        ctx.fillRect(x, y, cellSize, cellSize);

        // 网格线
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // 数字
        if (isNumber) {
          ctx.fillStyle = '#00695c';
          ctx.font = `bold ${Math.floor(cellSize * 0.55)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.numbers[r][c], x + cellSize / 2, y + cellSize / 2 + 1);
          ctx.textBaseline = 'alphabetic';
        }
      }
    }

    ctx.restore();
  }

  // ── 底部操作 ──────────────────────────────────────────────────────────

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

  // ── 进度保存 ──────────────────────────────────────────────────────────

  saveGameProgress() {
    try {
      const key = 'progress_' + this.gameName + '_' + (this.difficulty || 'easy');
      const saved = wx.getStorageSync(key);
      const progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
      if (this.level >= progress.unlocked) progress.unlocked = this.level + 1;
      if (!progress.stars[this.level]) progress.stars[this.level] = 1;
      wx.setStorageSync(key, JSON.stringify(progress));
    } catch (e) {
      console.log('保存进度失败', e);
    }
  }

  destroy() {
    if (this.confetti) this.confetti.stop();
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  _drawAchievementPopup() {
    this._newAchievements = null;
  }
}

module.exports = Nurikabe;
