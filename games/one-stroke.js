const LevelLoader = require('./level-loader');
const Confetti = require('./confetti');
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');
const statsManager = require('./stats-manager.js').getInstance();

// 共享 UI 组件
const HeaderBar = require('./components/header-bar');
const BottomBar = require('./components/bottom-bar');
const VictoryPanel = require('./components/victory-panel');

// ========== GridPathFinder 简化版（内嵌，无需外部依赖） ==========
class GridPathFinder {
  constructor(rows, cols, holes) {
    this.rows = rows;
    this.cols = cols;
    this.holes = new Set(holes);
    this.path = [];
    this.visited = new Set();
    this.passedPot = 0;
  }

  setPassedPotAndPath(pot, start, visited) {
    this.passedPot = pot;
    this.path = [start];
    this.visited = new Set([start]);
  }

  run(depth) {
    // 简化版：用 DFS 找一条经过所有非洞格子的路径
    const total = this.rows * this.cols - this.holes.size;
    return this._dfs(this.path[0], total);
  }

  _dfs(current, total) {
    if (this.path.length === total) {
      return true;
    }
    const neighbors = this._getNeighbors(current);
    for (const n of neighbors) {
      if (this.visited.has(n)) continue;
      this.path.push(n);
      this.visited.add(n);
      if (this._dfs(n, total)) return true;
      this.path.pop();
      this.visited.delete(n);
    }
    return false;
  }

  _getNeighbors(idx) {
    const r = Math.floor(idx / this.cols);
    const c = idx % this.cols;
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    const result = [];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
      const nIdx = nr * this.cols + nc;
      if (this.holes.has(nIdx)) continue;
      result.push(nIdx);
    }
    return result;
  }

  getPath() {
    return this.path.slice();
  }

  // 静态方法：生成一个有效谜题（随机路径 + 随机洞）
  static generateValidPuzzle(rows, cols, holeRatio) {
    const total = rows * cols;
    const holeCount = Math.floor(total * holeRatio);
    // 先生成一条随机路径（哈密顿路径近似）
    const finder = new GridPathFinder(rows, cols, []);
    const start = Math.floor(Math.random() * total);
    finder.setPassedPotAndPath(0, start, true);
    finder.run(0);
    const path = finder.getPath();

    // 从路径中随机选一些格子作为洞（保留路径连续性）
    const holes = [];
    const candidate = path.slice(1, -1); // 不去掉起点终点
    for (let i = 0; i < holeCount && i < candidate.length; i++) {
      const ri = Math.floor(Math.random() * candidate.length);
      holes.push(candidate[ri]);
      candidate.splice(ri, 1);
    }
    return holes;
  }
}
// =========================================================================

class OneStroke {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.gameName = 'one-stroke';
    this.level = level || 1;
    this.difficulty = 'easy';

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

    this.cellSize = 50;
    this.boardOffsetX = 0;
    this.boardOffsetY = 0;

    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.undoMgr = new UndoManager();
    this.achievement = new AchievementManager();
    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);

    this._touchActive = false;
    this._lastTouchIdx = null;
    this._answerAnimTimer = null;
    this._showAnswer = false;
    this._answerAnimIndex = -1;

    statsManager.startGame(this.gameName, this.level);

    // 共享 UI 组件
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });
    this.bindEvents();
    this.loadLevel();
  }

  async loadLevel() {
    console.log(`[OneStroke] 加载关卡: ${this.level}, 难度: ${this.difficulty}`);
    if (this.confetti) this.confetti.stop();
    if (this.undoMgr) this.undoMgr.clear();
    this.stopTimer();

    try {
      const data = await LevelLoader.load('one-stroke', this.level, this.difficulty);
      if (data && data.holes) {
        this._initFromData(data);
        return;
      }
    } catch (e) {
      console.log('[OneStroke] CDN加载失败，使用本地生成', e.message);
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
    const cfg = { easy: [6,6], medium: [8,8], hard: [10,10] }[this.difficulty] || [6,6];
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
    this._drawGrid(this.ctx);
    if (this.answerPath && this._showAnswer) {
      this._drawAnswerPath(this.ctx);
    }
  }

  draw() {
    this.ctx.fillStyle = '#0a1628';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.drawBoard();
    // 使用共享组件
    this.headerBar.draw({
      title: '一笔画',
      info: '第 ' + this.level + ' 关',
      info2: '难度: ' + (this.difficulty || 'easy')
    });
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

  _drawGrid(ctx) {
    const { cellSize, boardOffsetX, boardOffsetY, rows, cols, grid, path } = this;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const x = boardOffsetX + c * cellSize;
        const y = boardOffsetY + r * cellSize;
        const isHole = grid[idx] === 1;
        const inPath = path.indexOf(idx) >= 0;
        const pathIdx = inPath ? path.indexOf(idx) : -1;

        // 格子背景
        if (isHole) {
          ctx.fillStyle = '#2a2a4a';
        } else if (inPath) {
          ctx.fillStyle = '#3a7ca5';
        } else {
          ctx.fillStyle = '#f0f0f0';
        }
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

        // 洞的标记
        if (isHole) {
          ctx.strokeStyle = '#666';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.25, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 路径序号
        if (inPath && !isHole) {
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.max(10, cellSize * 0.35)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pathIdx + 1, x + cellSize / 2, y + cellSize / 2);
        }

        // 格子边框
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }

    // 绘制路径连线
    if (path.length > 1) {
      ctx.strokeStyle = '#FFB800';
      ctx.lineWidth = Math.max(2, cellSize * 0.08);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const first = path[0];
      ctx.moveTo(boardOffsetX + (first % cols) * cellSize + cellSize / 2,
                boardOffsetY + Math.floor(first / cols) * cellSize + cellSize / 2);
      for (let i = 1; i < path.length; i++) {
        const idx = path[i];
        ctx.lineTo(boardOffsetX + (idx % cols) * cellSize + cellSize / 2,
                   boardOffsetY + Math.floor(idx / cols) * cellSize + cellSize / 2);
      }
      ctx.stroke();
    }
  }

  _drawAnswerPath(ctx) {
    const { cellSize, boardOffsetX, boardOffsetY, rows, cols, answerPath, _answerAnimIndex } = this;
    if (!answerPath || answerPath.length === 0) return;

    // 绘制已动画的答案路径
    ctx.strokeStyle = 'rgba(0, 255, 128, 0.7)';
    ctx.lineWidth = Math.max(3, cellSize * 0.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const end = Math.min(_answerAnimIndex + 1, answerPath.length);
    if (end > 0) {
      const first = answerPath[0];
      ctx.moveTo(boardOffsetX + (first % cols) * cellSize + cellSize / 2,
                boardOffsetY + Math.floor(first / rows) * cellSize + cellSize / 2);
      for (let i = 1; i < end; i++) {
        const idx = answerPath[i];
        ctx.lineTo(boardOffsetX + (idx % cols) * cellSize + cellSize / 2,
                   boardOffsetY + Math.floor(idx / cols) * cellSize + cellSize / 2);
      }
    }
    ctx.stroke();

    // 答案路径上的序号
    for (let i = 0; i <= _answerAnimIndex && i < answerPath.length; i++) {
      const idx = answerPath[i];
      const x = boardOffsetX + (idx % cols) * cellSize;
      const y = boardOffsetY + Math.floor(idx / cols) * cellSize;
      ctx.fillStyle = 'rgba(0, 255, 128, 0.3)';
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    }
  }

  // ========== 胜利面板 ==========


  _onVictory() {
    this.victory = true;
    this.isComplete = true;
    this.stopTimer();
    this.confetti.start();
    sound.playWin();
    statsManager.endGame(true);

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
        if (this.tutorial.hitTest(x, y)) {
          this.tutorial.dismiss();
          this.draw();
        }
        return;
      }

      // 返回按钮
      if (x >= 15 && x <= 85 && y >= this.statusBarHeight + 8 && y <= this.statusBarHeight + 40) {
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

      // 底部工具栏按钮检测（使用共享组件）
      const action = this.bottomBar.handleClick(x, y);
      if (action) {
        this._handleBottomAction(action);
        return;
      }

      this._handleCellClick(x, y);
    };

    this.canvas.addEventListener('click', this._clickHandler);

    // 触摸移动（滑动连续绘制）
    this._touchStartHandler = (e) => {
      if (this.victory || !this.isPlaying) return;
      const touch = e.touches[0];
      const x = touch.clientX, y = touch.clientY;
      // 返回按钮
      if (x >= 15 && x <= 85 && y >= this.statusBarHeight + 8 && y <= this.statusBarHeight + 40) {
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
      const touch = e.touches[0];
      this._handleCellClick(touch.clientX, touch.clientY, true);
    };
    this.canvas.addEventListener('touchmove', this._touchMoveHandler, { passive: true });

    this._touchEndHandler = () => {
      this._touchActive = false;
      this._lastTouchIdx = null;
    };
    this.canvas.addEventListener('touchend', this._touchEndHandler);
  }

  _handleCellClick(x, y, isSliding) {
    if (!this.isPlaying || this.victory) return;
    const idx = this._getCellAtPoint(x, y);
    if (idx === null) return;
    if (this.grid[idx] === 1) return; // 洞不可点击
    // 滑动时跳过重复格子
    if (isSliding && this._lastTouchIdx === idx) return;

    const path = this.path;

    // 已在路径中 → 截断
    const existingIdx = path.indexOf(idx);
    if (existingIdx >= 0) {
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
      // 滑动中不相邻 → 直接忽略，不重置起点
      if (isSliding) return;
      // 点击时不相邻：重置为新起点
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

  _formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
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

  _diffLabel(d) {
    return { easy: '简单', medium: '中等', hard: '困难' }[d] || '简单';
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
            // 循环播放
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
    // 返回按钮
    if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w &&
        y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
      this.stopTimer();
      if (this._answerAnimTimer) clearInterval(this._answerAnimTimer);
      this.confetti.stop();
      this.switchGame('level-select', this.gameName);
      return;
    }
    // 下一关
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
  }
}

module.exports = OneStroke;
