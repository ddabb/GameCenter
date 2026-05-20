const statsManager = require('./stats-manager.js').getInstance();
const Confetti = require('./confetti');
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');
const roundRect = require('../utils/round-rect.js');
// games/merge-abc.js
// ABC合成记 - 字母合并游戏(2048风格)

// 分数映射
const SCORES = {
  A: 3, B: 6, C: 12, D: 24, E: 48, F: 96, G: 192,
  H: 384, I: 768, J: 1536, K: 3072, L: 6144, M: 12288,
  N: 24576, O: 49152, P: 98304, Q: 196608, R: 393216,
  S: 786432, T: 1572864, U: 3145728, V: 6291456,
  W: 12582912, X: 25165824, Y: 50331648, Z: 100663296
};

// 方块颜色配置
const COLORS = {
  A: { bg: '#eee4da', color: '#776e65' },
  B: { bg: '#ede0c8', color: '#776e65' },
  C: { bg: '#f2b179', color: '#f9f6f2' },
  D: { bg: '#f59563', color: '#f9f6f2' },
  E: { bg: '#f67c5f', color: '#f9f6f2' },
  F: { bg: '#f65e3b', color: '#f9f6f2' },
  // G-K 渐变金色
  G: { bg: '#edcf72', color: '#f9f6f2' },
  H: { bg: '#edcc61', color: '#f9f6f2' },
  I: { bg: '#edc850', color: '#f9f6f2' },
  J: { bg: '#edc53f', color: '#f9f6f2' },
  K: { bg: '#edc22e', color: '#f9f6f2' },
  // L-N 深色
  L: { bg: '#3c3a32', color: '#f9f6f2' },
  M: { bg: '#3c3a32', color: '#f9f6f2' },
  N: { bg: '#3c3a32', color: '#f9f6f2' },
  // O-Z 金色传说
  O: { bg: '#f9d423', color: '#fff' },
  P: { bg: '#f9d423', color: '#fff' },
  Q: { bg: '#f9d423', color: '#fff' },
  R: { bg: '#f9d423', color: '#fff' },
  S: { bg: '#f9d423', color: '#fff' },
  T: { bg: '#f9d423', color: '#fff' },
  U: { bg: '#f9d423', color: '#fff' },
  V: { bg: '#f9d423', color: '#fff' },
  W: { bg: '#f9d423', color: '#fff' },
  X: { bg: '#f9d423', color: '#fff' },
  Y: { bg: '#f9d423', color: '#fff' },
  Z: { bg: '#ff4e50', color: '#fff' },
};

const TILES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';


class MergeABC {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;

    this.level = level;
    statsManager.startGame(this.gameName, level) || 1; // 关卡号

    // 安全区域适配 - 获取状态栏高度
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    // 布局参数
    this.padding = 15;
    this.boardOffsetY = this.statusBarHeight + 150;
    this.boardPadding = 12;
    this.gridGap = 10;

    // 计算格子大小
    this.boardWidth = this.width - this.padding * 2;
    this.cellSize = Math.floor((this.boardWidth - this.boardPadding * 2 - this.gridGap * 3) / 4);

    // 按钮尺寸
    this.btnWidth = Math.floor((this.boardWidth - 15) / 2);
    this.btnHeight = 44;
    this.btnY = this.boardOffsetY + this.cellSize * 4 + this.gridGap * 3 + this.boardPadding * 2 + 30;

    // 尝试恢复存档
    const saved = wx.getStorageSync('merge_abc_saved');
    if (saved && saved.board && saved.board.length === 16) {
      this._board = saved.board;
      this._score = saved.score || 0;
      this._bestScore = saved.bestScore || 0;
    } else {
      this._board = new Array(16).fill('');
      this._score = 0;
      this._bestScore = 0;
      this.addNewTile();
      this.addNewTile();
    }
    this._history = [];
    this._gameOver = false;
    this._showModal = false;
    this.gameName = 'merge-abc';
    this.confetti = new Confetti(this.ctx, this.width, this.height);



    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    this._animationTime = 0;

    // 加载最高分
    const storedBest = wx.getStorageSync('merge_abc_best');
    if (storedBest) this._bestScore = storedBest;

    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
  }

  bindEvents() {
    this.touchStartHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;
      
      if (this._showModal) {
        if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w && y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {
          this.level++;
          this.restart();
          this._nextBtn = null;
          this._backBtn = null;
          this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
          return;
        }
        if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w && y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        return;
      }
      
      // 撤销按钮检测
      if (this._undoBtn && x >= this._undoBtn.x && x <= this._undoBtn.x + this._undoBtn.w && y >= this._undoBtn.y && y <= this._undoBtn.y + this._undoBtn.h) {
        const state = this.undoMgr.undo();
        if (state) {
          this.grid = state.grid;
          this.draw();
        }
        return;
      }
      
      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }
      this._startX = x;
      this._startY = y;
    };

    this.touchEndHandler = (e) => {
      if (this._showModal) {
        const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w && y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {
          this.level++;
          this.restart();
          this._nextBtn = null;
          this._backBtn = null;
          this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
          return;
        }
        if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w && y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        return;
      }
      let touch = e.changedTouches ? e.changedTouches[0] : e;
      let endX = touch.clientX;
      let endY = touch.clientY;
      let dx = endX - this._startX;
      let dy = endY - this._startY;
      let absDx = Math.abs(dx);
      let absDy = Math.abs(dy);

      // 顶部返回按钮（考虑状态栏高度）
      if (endX >= 15 && endX <= 85 && endY >= this.statusBarHeight + 8 && endY <= this.statusBarHeight + 40) {
        sound.play('click');
        this.switchGame('menu');
        return;
      }

      if (Math.max(absDx, absDy) < 30) return;

      // 重玩按钮区域
      if (this.isInButton(this._startX, this._startY, this.padding, this.btnY, this.btnWidth, this.btnHeight)) {
        this.restart();
        return;
      }
      // 撤销按钮区域
      if (this.isInButton(this._startX, this._startY, this.padding + this.btnWidth + 15, this.btnY, this.btnWidth, this.btnHeight)) {
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



  showBackButton(ctx, width) {
    // 兼容调用：merge-abc 传 (ctx, width)，其他游戏不传（用 this.ctx / this.width）
    const c = ctx || this.ctx;
    const w = width || this.width;
    const h = this.height;

    const panelW = 260, panelH = 200;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    // 半透明遮罩
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(0, 0, w, h);

    // 面板背景
    roundRect(this.ctx, c, panelX, panelY, panelW, panelH, 16);
    c.fillStyle = '#1e2a4a';
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.2)';
    c.lineWidth = 1;
    c.stroke();

    // 标题
    c.fillStyle = '#6BCB77';
    c.font = 'bold 22px Arial';
    c.textAlign = 'center';
    c.fillText('🎉 恭喜通关!', w / 2, panelY + 50);

    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.font = '15px Arial';
    c.fillText('关卡 ' + this.level, w / 2, panelY + 80);

    // 下一关按钮
    const btnW = 180, btnH = 42, btnX = (w - btnW) / 2;
    roundRect(this.ctx, c, btnX, panelY + 100, btnW, btnH, 21);
    c.fillStyle = '#6BCB77';
    c.fill();
    c.fillStyle = '#fff';
    c.font = 'bold 17px Arial';
    c.fillText('下一关', w / 2, panelY + 126);
    this._nextBtn = { x: btnX, y: panelY + 100, w: btnW, h: btnH };

    // 返回选关按钮
    roundRect(this.ctx, c, btnX, panelY + 152, btnW, btnH, 21);
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.fill();
    c.fillStyle = '#fff';
    c.font = '15px Arial';
    c.fillText('返回选关', w / 2, panelY + 178);
    this._backBtn = { x: btnX, y: panelY + 152, w: btnW, h: btnH };
  }




  saveGameProgress() {
    try {
      const key = 'progress_' + this.gameName;
      const saved = wx.getStorageSync(key);
      let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
      // 解锁下一关
      if (this.level >= progress.unlocked) {
        progress.unlocked = this.level + 1;
      }
      // 记录通关（1星，后续可扩展星级评分）
      if (!progress.stars[this.level]) {
        progress.stars[this.level] = 1;
      }
      wx.setStorageSync(key, JSON.stringify(progress));
    } catch (e) {
      console.log('保存进度失败', e);
    }
  }

  destroy() {
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchend', this.touchEndHandler);
  }

  isInButton(x, y, bx, by, bw, bh) {
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
  }

  addNewTile() {
    const empty = [];
    this._board.forEach((cell, i) => { if (cell === '') empty.push(i); });
    if (empty.length === 0) return;
    const idx = empty[Math.floor(Math.random() * empty.length)];
    this._board[idx] = this.getRandomTile();
  }

  getRandomTile() {
    const r = Math.random();
    if (r < 0.75) return 'A';
    if (r < 0.85) return 'B';
    if (r < 0.95) return 'C';
    return 'D';
  }

  getScore() {
    let total = 0;
    for (let i = 0; i < this._board.length; i++) {
      total += SCORES[this._board[i]] || 0;
    }
    return total;
  }

  getNextTile(tile) {
    const idx = TILES.indexOf(tile);
    return idx < TILES.length - 1 ? TILES[idx + 1] : '';
  }

  compress(arr) {
    const result = arr.filter(x => x !== '');
    while (result.length < 4) result.push('');
    return result;
  }

  merge(arr) {
    const result = [];
    let i = 0;
    while (i < arr.length) {
      if (i < arr.length - 1 && arr[i] === arr[i + 1] && arr[i] !== '') {
        result.push(this.getNextTile(arr[i]));
        i += 2;
      } else if (arr[i] !== '') {
        result.push(arr[i]);
        i++;
      } else {
        i++;
      }
    }
    while (result.length < 4) result.push('');
    const merged = JSON.stringify(result) !== JSON.stringify(arr);
    return [merged, result];
  }

  moveLeft() {
    let moved = false;
    for (let row = 0; row < 4; row++) {
      let temp = [];
      for (let col = 0; col < 4; col++) {
        if (this._board[row * 4 + col] !== '') temp.push(this._board[row * 4 + col]);
      }
      temp = this.compress(temp);
      const [merged, result] = this.merge(temp);
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col;
        if (result[col] !== this._board[idx]) { this._board[idx] = result[col] || ''; moved = true; }
      }
    }
    return moved;
  }

  moveRight() {
    let moved = false;
    for (let row = 0; row < 4; row++) {
      let temp = [];
      for (let col = 3; col >= 0; col--) {
        if (this._board[row * 4 + col] !== '') temp.push(this._board[row * 4 + col]);
      }
      temp = this.compress(temp);
      const [merged, result] = this.merge(temp);
      for (let col = 3; col >= 0; col--) {
        const idx = row * 4 + col;
        if (result[3 - col] !== this._board[idx]) { this._board[idx] = result[3 - col] || ''; moved = true; }
      }
    }
    return moved;
  }

  moveUp() {
    let moved = false;
    for (let col = 0; col < 4; col++) {
      let temp = [];
      for (let row = 0; row < 4; row++) {
        if (this._board[row * 4 + col] !== '') temp.push(this._board[row * 4 + col]);
      }
      temp = this.compress(temp);
      const [merged, result] = this.merge(temp);
      for (let row = 0; row < 4; row++) {
        const idx = row * 4 + col;
        if (result[row] !== this._board[idx]) { this._board[idx] = result[row] || ''; moved = true; }
      }
    }
    return moved;
  }

  moveDown() {
    let moved = false;
    for (let col = 0; col < 4; col++) {
      let temp = [];
      for (let row = 3; row >= 0; row--) {
        if (this._board[row * 4 + col] !== '') temp.push(this._board[row * 4 + col]);
      }
      temp = this.compress(temp);
      const [merged, result] = this.merge(temp);
      for (let row = 3; row >= 0; row--) {
        const idx = row * 4 + col;
        if (result[3 - row] !== this._board[idx]) { this._board[idx] = result[3 - row] || ''; moved = true; }
      }
    }
    return moved;
  }

  handleMove(direction) {
    if (this._gameOver) return;
    let moved = false;
    switch (direction) {
      case 'left': moved = this.moveLeft(); break;
      case 'right': moved = this.moveRight(); break;
      case 'up': moved = this.moveUp(); break;
      case 'down': moved = this.moveDown(); break;
    }
    if (moved) {
      this.saveState();
      this.addNewTile();
      this._score = this.getScore();
      this.saveBestScore();
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
      this._score = this.getScore();
    }
  }

  checkGameOver() {
    const hasEmpty = this._board.some(cell => cell === '');
    if (hasEmpty) return;
    let canMove = false;
    for (let i = 0; i < 16; i++) {
      if (i % 4 !== 3 && this._board[i] === this._board[i + 1]) { canMove = true; break; }
      if (i + 4 < 16 && this._board[i] === this._board[i + 4]) { canMove = true; break; }
    }
    if (!canMove) {
      this._gameOver = true;
      this.saveGameProgress(); statsManager.endGame(true);
      this._showModal = true;
      this.saveBestScore();
    }
  }

  saveBestScore() {
    if (this._score > this._bestScore) {
      this._bestScore = this._score;
      wx.setStorageSync('merge_abc_best', this._bestScore);
    }
  }

  saveGame() {
    wx.setStorageSync('merge_abc_saved', {
      board: this._board,
      score: this._score,
      bestScore: this._bestScore
    });
  }

  restart() {
    this._board = new Array(16).fill('');
    this._history = [];
    this._gameOver = false;
    this._showModal = false;
    this._score = 0;
    this.addNewTile();
    this.addNewTile();
    this.saveGame();
  }

  update() {
    this._animationTime += 16;
  }

  draw() {
    const ctx = this.ctx;
    const width = this.width;

    // 背景
    ctx.fillStyle = '#faf8ef';
    ctx.fillRect(0, 0, width, this.height);

    // 顶部返回按钮（考虑状态栏高度）
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    roundRect(ctx, 15, this.statusBarHeight + 8, 70, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('← 返回', 50, this.statusBarHeight + 29);

    // 标题
    ctx.fillStyle = '#776e65';
    ctx.font = `bold ${width / 14}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🔤 ABC合成记', width / 2, this.statusBarHeight + 50);

    // 副标题
    ctx.fillStyle = '#9e948a';
    ctx.font = `${width / 32}px sans-serif`;
    ctx.fillText('相同字母合并,升级到Z!', width / 2, this.statusBarHeight + 75);

    // 分数栏
    const barY = this.statusBarHeight + 95;
    const barH = 44;
    const halfW = (width - this.padding * 2 - 10) / 2;

    ctx.fillStyle = '#bbada0';
    roundRect(this.ctx, this.padding, barY, halfW, barH, 10);
    ctx.fill();
    ctx.fillStyle = '#eee4da';
    ctx.font = `${width / 32}px sans-serif`;
    ctx.fillText('分数', this.padding + 16, barY + 16);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${width / 18}px sans-serif`;
    ctx.fillText(this._score, this.padding + 16, barY + 36);

    ctx.fillStyle = '#bbada0';
    roundRect(this.ctx, this.padding + halfW + 10, barY, halfW, barH, 10);
    ctx.fill();
    ctx.fillStyle = '#eee4da';
    ctx.font = `${width / 32}px sans-serif`;
    ctx.fillText('最高', this.padding + halfW + 26, barY + 16);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${width / 18}px sans-serif`;
    ctx.fillText(this._bestScore, this.padding + halfW + 26, barY + 36);

    // 棋盘背景
    const boardX = this.padding;
    const boardY = this.boardOffsetY;
    const boardInnerW = this.cellSize * 4 + this.gridGap * 3 + this.boardPadding * 2;
    ctx.fillStyle = '#bbada0';
    roundRect(this.ctx, boardX, boardY, boardInnerW, boardInnerW, 12);
    ctx.fill();

    // 绘制格子
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col;
        const tile = this._board[idx];
        const cellX = boardX + this.boardPadding + col * (this.cellSize + this.gridGap);
        const cellY = boardY + this.boardPadding + row * (this.cellSize + this.gridGap);

        if (tile === '') {
          // 空格
          ctx.fillStyle = 'rgba(238,228,218,0.35)';
          roundRect(this.ctx, cellX, cellY, this.cellSize, this.cellSize, 8);
          ctx.fill();
        } else {
          // 方块
          const c = COLORS[tile] || { bg: '#f9d423', color: '#fff' };
          ctx.fillStyle = c.bg;
          roundRect(this.ctx, cellX, cellY, this.cellSize, this.cellSize, 8);
          ctx.fill();

          // 字母
          let fontSize = this.cellSize * 0.5;
          if (tile >= 'G' && tile <= 'K') fontSize = this.cellSize * 0.42;
          if (tile >= 'L' && tile <= 'N') fontSize = this.cellSize * 0.38;
          if (tile >= 'O') fontSize = this.cellSize * 0.34;

          ctx.fillStyle = c.color;
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tile, cellX + this.cellSize / 2, cellY + this.cellSize / 2);
          ctx.textBaseline = 'alphabetic';
        }
      }
    }

    // 按钮
    const btnY = this.btnY;
    const btnFontSize = this.btnWidth / 8;

    // 重玩按钮
    ctx.fillStyle = '#8f7a66';
    roundRect(this.ctx, this.padding, btnY, this.btnWidth, this.btnHeight, 8);
    ctx.fill();
    ctx.fillStyle = '#f9f6f2';
    ctx.font = `bold ${btnFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🔄 新游戏', this.padding + this.btnWidth / 2, btnY + this.btnHeight / 2 + btnFontSize / 3);

    // 撤销按钮
    ctx.fillStyle = '#cdc1b4';
    roundRect(this.ctx, this.padding + this.btnWidth + 15, btnY, this.btnWidth, this.btnHeight, 8);
    ctx.fill();
    ctx.fillStyle = '#776e65';
    ctx.font = `bold ${btnFontSize}px sans-serif`;
    ctx.fillText('↩️ 撤销 (' + this._history.length + ')', this.padding + this.btnWidth + 15 + this.btnWidth / 2, btnY + this.btnHeight / 2 + btnFontSize / 3);

    // 提示
    const tipsY = btnY + this.btnHeight + 18;
    ctx.fillStyle = '#9e948a';
    ctx.font = `${width / 32}px sans-serif`;
    ctx.fillText('滑动屏幕控制方向', width / 2, tipsY);
    ctx.fillText('相同字母合成下一字母', width / 2, tipsY + 22);

    // 游戏结束弹窗
    if (this._showModal) {
      if (!this._nextBtn || !this._backBtn) {
        this.showBackButton(ctx, width);
      }
    }
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

module.exports = MergeABC;
