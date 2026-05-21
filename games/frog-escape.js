// 躲避牛蛙 (Frog Escape) - Canvas版本
// 扫雷换皮：🐸牛蛙要躲避 | 💧水花=安全 | 数字=周围牛蛙数
const sound = require('./sound-manager.js');
const TutorialOverlay = require('./tutorial-overlay.js');
const HeaderBar = require('./components/header-bar');
const BottomBar = require('./components/bottom-bar');
const VictoryPanel = require('./components/victory-panel');

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/minesweeper';
const RECORDS_KEY = 'frog_escape_records';

const DIFFICULTIES = [
  { key: 'easy', label: '简单 9×9 · 10只', rows: 9, cols: 9, mines: 10 },
  { key: 'medium', label: '中等 16×16 · 40只', rows: 16, cols: 16, mines: 40 },
];

class FrogEscape {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.switchGame = switchGame;
    this.gameName = 'frog-escape';
    
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.difficulty = 'easy';
    this.rows = 9;
    this.cols = 9;
    this.totalMines = 10;
    this.cellSize = 36;
    this.boardOffsetX = 0;
    this.boardOffsetY = 0;

    this.board = [];      // 显示状态
    this._boardData = []; // 真实数据
    this.revealedCount = 0;
    this.flaggedCount = 0;
    this.flagMode = false;
    this.gameOver = false;
    this.won = false;
    this.time = 0;
    this.timerInterval = null;
    this._firstClick = true;
    this.bestTime = null;

    this._backBtn = null;
    this._ruleBtn = null;
    this._resultBtn = null;

    // 规则弹窗
    this.tutorial = new TutorialOverlay(ctx, this.width, this.height, 'frog-escape', {
      title: '🐸 躲避牛蛙',
      rules: [
        '点击格子，躲开所有牛蛙',
        '💧 安全区域会显示水花',
        '🔢 数字表示周围有多少只牛蛙',
        '🚩 长按标记可疑的牛蛙位置',
        '🏆 全部安全区域翻开后获胜'
      ],
      buttonText: '开始游戏'
    });

    this.loadRecord();
    this.startGame('easy');  // 初始化游戏

    // 共享 UI 组件
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });
    this.bindEvents();
  }

  loadRecord() {
    try {
      const r = JSON.parse(wx.getStorageSync(RECORDS_KEY) || '{}');
      this.bestTime = r[this.difficulty] || null;
    } catch (e) {}
  }

  update() {
    // 更新计时器显示（如果需要动态刷新）
  }

  saveRecord(time) {
    try {
      const r = JSON.parse(wx.getStorageSync(RECORDS_KEY) || '{}');
      const key = this.difficulty;
      if (!r[key] || time < r[key]) {
        r[key] = time;
        wx.setStorageSync(RECORDS_KEY, JSON.stringify(r));
        this.bestTime = time;
      }
    } catch (e) {}
  }

  startGame(diff) {
    const d = diff || this.difficulty;
    const diffInfo = DIFFICULTIES.find(x => x.key === d) || DIFFICULTIES[0];
    const { rows, cols, mines } = diffInfo;

    this.rows = rows;
    this.cols = cols;
    this.totalMines = mines;
    this.difficulty = d;

    // 计算格子大小
    const maxBoardWidth = this.width - 32;
    this.cellSize = Math.min(Math.floor(maxBoardWidth / cols), 48);
    this.boardOffsetX = (this.width - this.cellSize * cols) / 2;
    this.boardOffsetY = 100; // 留出顶部状态栏

    // 重置状态
    this.board = [];
    this._boardData = [];
    this.revealedCount = 0;
    this.flaggedCount = 0;
    this.flagMode = false;
    this.gameOver = false;
    this.won = false;
    this.time = 0;
    this._firstClick = true;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // 初始化显示棋盘
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push({ revealed: false, flagged: false, nearby: 0, isFrog: false });
      }
      this.board.push(row);
    }

    this.loadRecord();
    this.loadPuzzle();
  }

  loadPuzzle() {
    const totals = { easy: 1000, medium: 1000 };
    const maxIdx = totals[this.difficulty];
    const idx = Math.floor(Math.random() * maxIdx) + 1;
    const suffix = String(idx).padStart(4, '0');
    const url = `${CDN_BASE}/${this.difficulty}-${suffix}.json`;

    const self = this;
    wx.request({
      url,
      success(res) {
        if (res.statusCode === 200 && res.data) {
          self._boardData = self.buildBoardFromPuzzle(res.data);
        } else {
          self._boardData = self.generateBoard();
        }
        self._initBoard();
        self.draw();
      },
      fail() {
        self._boardData = self.generateBoard();
        self._initBoard();
        self.draw();
      }
    });
  }

  _initBoard() {
    // 根据 _boardData 初始化显示状态 board
    this.board = [];
    if (!this._boardData || this._boardData.length === 0) return;
    for (let r = 0; r < this._boardData.length; r++) {
      const row = [];
      for (let c = 0; c < this._boardData[r].length; c++) {
        row.push({
          revealed: false,
          flagged: false,
          isFrog: this._boardData[r][c].isFrog,
          nearby: this._boardData[r][c].nearby
        });
      }
      this.board.push(row);
    }
    this._firstClick = true;
    this.gameOver = false;
    this.cellsRevealed = 0;
    this.cellsFlagged = 0;
  }

  buildBoardFromPuzzle(puzzle) {
    const rows = puzzle.rows;
    const cols = puzzle.cols;
    this.rows = rows;
    this.cols = cols;
    this.totalMines = puzzle.mineCount;

    const data = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const isFrog = puzzle.board[r][c];
        const nearby = isFrog ? -1 : puzzle.numbers[r][c];
        row.push({ isFrog, nearby });
      }
      data.push(row);
    }
    return data;
  }

  generateBoard() {
    const { rows, cols, totalMines } = this;
    const data = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push({ isFrog: false, nearby: 0 });
      }
      data.push(row);
    }

    // 随机布雷
    let placed = 0;
    while (placed < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!data[r][c].isFrog) {
        data[r][c].isFrog = true;
        placed++;
      }
    }

    // 计算提示数
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!data[r][c].isFrog) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && data[nr][nc].isFrog) {
                count++;
              }
            }
          }
          data[r][c].nearby = count;
        }
      }
    }
    return data;
  }

  startTimer() {
    if (this.timerInterval) return;
    const self = this;
    this.timerInterval = setInterval(() => {
      self.time++;
    }, 1000);
  }

  formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  draw() {
    const ctx = this.ctx;

    // 背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    // 使用共享组件
    this.headerBar.draw({
      title: '躲避牛蛙',
      info: '剩余: ' + (this.totalMines - this.flaggedCount),
      info2: '时间: ' + this.formatTime(this.time)
    });

    const buttons = [];
    buttons.push({ id: 'flag', text: this.flagMode ? '🚩 标记中' : '🚩 标记' });
    buttons.push({ id: 'restart', text: '🔄 重开' });
    this.bottomBar.setButtons(buttons);
    this.bottomBar.draw();

    // 棋盘
    this._drawBoard();

    // 最佳时间
    if (this.bestTime) {
      ctx.fillStyle = 'rgba(255,215,0,0.8)';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 最短时间: ' + this.formatTime(this.bestTime), this.width / 2, this.height - 30);
    }

    // 规则按钮（保留，因为是小图标）
    this._drawRuleButton();

    // 规则弹窗
    if (this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }

    // 胜利/失败面板
    if (this.gameOver || this.won) {
      this.victoryPanel.setSubtitle(this.won ? '胜利！' : '失败！');
      this.victoryPanel.setAchievements(this._newAchievements || []);
      this.victoryPanel.draw();
    }
  }






  _drawBoard() {
    const ctx = this.ctx;
    const { rows, cols, cellSize } = this;
    const offsetX = this.boardOffsetX;
    const offsetY = this.boardOffsetY + 80; // 留出工具栏

    const colors = ['#3498db', '#27ae60', '#e74c3c', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22', '#7f8c8d'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const cell = this.board[r]?.[c];
        if (!cell) continue;

        // 格子背景
        if (cell.revealed) {
          ctx.fillStyle = cell.isFrog ? '#c0392b' : 'rgba(255,255,255,0.08)';
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
        }
        ctx.beginPath();
        roundRect(ctx, x + 1, y + 1, cellSize - 2, cellSize - 2, 4);
        ctx.fill();

        // 内容
        ctx.font = `${Math.floor(cellSize * 0.5)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (cell.revealed) {
          if (cell.isFrog) {
            ctx.fillText('🐸', x + cellSize / 2, y + cellSize / 2);
          } else if (cell.nearby === 0) {
            ctx.fillText('💧', x + cellSize / 2, y + cellSize / 2);
          } else {
            ctx.fillStyle = colors[cell.nearby] || '#fff';
            ctx.fillText(String(cell.nearby), x + cellSize / 2, y + cellSize / 2);
          }
        } else if (cell.flagged) {
          ctx.fillText('🚩', x + cellSize / 2, y + cellSize / 2);
        }
      }
    }
  }

  _drawRuleButton() {
    const ctx = this.ctx;
    const btnX = this.width - 50, btnY = 50, btnW = 35, btnH = 32;

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('?', btnX + btnW / 2, btnY + 21);

    this._ruleBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  }


  bindEvents() {
    this.clickHandler = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX, y = touch.clientY;

      // 规则弹窗优先处理
      if (this.tutorial.shouldShow()) {
        if (this.tutorial.hitTest(x, y)) {
          this.tutorial.dismiss();
        }
        return;
      }

      // 游戏结束时只处理结果按钮
      if (this.gameOver || this.won) {
        if (this.victoryPanel.handleClick(x, y)) return;
        return;
      }

      // 返回按钮
      if (this._backBtn && this._hitTest(this._backBtn, x, y)) {
        sound.play('click');
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.switchGame('menu');
        return;
      }

      // 规则按钮
      if (this._ruleBtn && this._hitTest(this._ruleBtn, x, y)) {
        sound.play('click');
        this.tutorial.show();
        return;
      }

      // 底部工具栏按钮检测（使用共享组件）
      const action = this.bottomBar.handleClick(x, y);
      if (action) {
        this._handleBottomAction(action);
        return;
      }

      // 难度切换
      if (this._diffBtn && this._hitTest(this._diffBtn, x, y)) {
        sound.play('click');
        const idx = DIFFICULTIES.findIndex(d => d.key === this.difficulty);
        const next = DIFFICULTIES[(idx + 1) % DIFFICULTIES.length];
        this.startGame(next.key);
        return;
      }

      // 标记模式切换
      if (this._flagBtn && this._hitTest(this._flagBtn, x, y)) {
        sound.play('click');
        this.flagMode = !this.flagMode;
        return;
      }

      // 帮助按钮
      if (this._helpBtn && this._hitTest(this._helpBtn, x, y)) {
        sound.play('click');
        this.tutorial.show();
        return;
      }

      // 棋盘点击
      this._handleBoardClick(x, y);
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }

  _handleBoardClick(x, y) {
    if (!this._boardData || this._boardData.length === 0) return;

    const offsetX = this.boardOffsetX;
    const offsetY = this.boardOffsetY + 80;
    const col = Math.floor((x - offsetX) / this.cellSize);
    const row = Math.floor((y - offsetY) / this.cellSize);

    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;

    const cell = this.board[row]?.[col];
    if (!cell) return;

    // 标记模式：点击切换旗帜
    if (this.flagMode && !cell.revealed) {
      this._toggleFlag(row, col);
      sound.play('flag');
      sound.play('success');
      return;
    }

    // 已翻开的数字格：检查 chord
    if (cell.revealed && cell.nearby > 0) {
      this._chord(row, col);
      return;
    }

    // 已翻开或已标记，忽略
    if (cell.revealed || cell.flagged) return;

    // 首次点击启动计时器
    if (this._firstClick) {
      this._firstClick = false;
      this.startTimer();
    }

    // 踩到牛蛙
    const boardCell = this._boardData?.[row]?.[col];
    if (boardCell && boardCell.isFrog) {
      this._revealCell(row, col);
      sound.play('fail');
      this._gameOver(false);
      return;
    }

    // 安全格
    sound.play('click');
    this._floodFill(row, col);
    this._checkWin();
    sound.play('click');
  }

  _toggleFlag(row, col) {
    const cell = this.board[row][col];
    if (cell.flagged) {
      cell.flagged = false;
      this.flaggedCount--;
    } else {
      cell.flagged = true;
      this.flaggedCount++;
    }
  }

  _revealCell(row, col) {
    const cell = this.board[row][col];
    const data = this._boardData?.[row]?.[col];
    if (!data) return;
    cell.revealed = true;
    cell.nearby = data.nearby;
    cell.isFrog = data.isFrog;
    this.revealedCount++;
  }

  _floodFill(row, col) {
    const stack = [[row, col]];
    const visited = new Set();
    visited.add(`${row},${col}`);

    while (stack.length > 0) {
      const [r, c] = stack.pop();
      const cell = this.board[r][c];
      if (cell.revealed) continue;

      const data = this._boardData?.[r]?.[c];
      if (!data) continue;

      cell.revealed = true;
      cell.nearby = data.nearby;
      cell.isFrog = data.isFrog;
      this.revealedCount++;

      if (data.nearby === 0 && !data.isFrog) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            const key = `${nr},${nc}`;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && !visited.has(key)) {
              visited.add(key);
              if (!this._boardData?.[nr]?.[nc]?.isFrog) {
                stack.push([nr, nc]);
              }
            }
          }
        }
      }
    }
  }

  _chord(row, col) {
    const cell = this.board[row][col];
    if (!cell.revealed || cell.nearby === 0) return;

    // 数周围标记数
    let flagged = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          if (this.board[nr][nc].flagged) flagged++;
        }
      }
    }

    if (flagged !== cell.nearby) return;

    // 翻开周围未标记格
    let exploded = false;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr, nc = col + dc;
        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
        const neighbor = this.board[nr][nc];
        if (neighbor.revealed || neighbor.flagged) continue;

        if (this._boardData?.[nr]?.[nc]?.isFrog) {
          neighbor.revealed = true;
          neighbor.isFrog = true;
          this.revealedCount++;
          exploded = true;
        } else {
          this._floodFill(nr, nc);
        }
      }
    }

    if (exploded) {
      sound.play('success');
      this._gameOver(false);
    } else {
      this._checkWin();
    }
  }

  _checkWin() {
    const safeCells = this.rows * this.cols - this.totalMines;
    if (this.revealedCount === safeCells) {
      this._gameOver(true);
    }
  }

  _gameOver(won) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    sound.play(won ? 'victory' : 'gameover');

    // 显示所有牛蛙
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this._boardData?.[r]?.[c]?.isFrog) {
          this.board[r][c].revealed = true;
          this.board[r][c].isFrog = true;
        }
      }
    }

    this.gameOver = true;
    this.won = won;

    if (won) {
      this.saveRecord(this.time);
    }
  }

  _hitTest(btn, x, y) {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  // 长按处理（外部调用）
  handleLongPress(e) {
    if (this.gameOver) return;
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX, y = touch.clientY;

    const offsetX = this.boardOffsetX;
    const offsetY = this.boardOffsetY + 80;
    const col = Math.floor((x - offsetX) / this.cellSize);
    const row = Math.floor((y - offsetY) / this.cellSize);

    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;

    const cell = this.board[row]?.[col];
    if (!cell || cell.revealed) return;

    this._toggleFlag(row, col);
    sound.play('flag');
    sound.play('success');
  }

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.undoMgr && this.undoMgr.canUndo()) {
          const state = this.undoMgr.undo();
          if (state) {
            this.grid = state.grid;
            this.revealed = state.revealed;
            this.flags = state.flags;
            sound.playClick();
            this.draw();
          }
        }
        break;
      case 'restart':
        this.startGame(this.difficulty);
        sound.playClick();
        this.draw();
        break;
      case 'hint':
        if (this.hintMgr) {
          this.hintMgr.showHint();
          sound.playSuccess();
        }
        break;
    }
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.canvas.removeEventListener('click', this.clickHandler);
  }
}

module.exports = FrogEscape;
