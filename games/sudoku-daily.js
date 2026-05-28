/**
 * sudoku-daily.js - 每日数独 (Canvas版)
 * 核心理念：每日挑战 + 思维训练 + 成就感
 * 
 * 功能：
 * 1. 每日数独 - 从CDN加载每日题目
 * 2. 候选数显示
 * 3. 自动求解
 * 4. 计时系统
 * 5. 奖励系统
 */
const sudoku = require('./sudoku');
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const Confetti = require('./confetti');
const roundRect = require('../utils/round-rect.js');
const { AchievementManager } = require('./achievement-manager');
const { getInstance: getRewardManager } = require('./reward-manager');
const VictoryPanel = require('./components/victory-panel');
const HeaderBar = require('./components/header-bar');
const BottomBar = require('./components/bottom-bar');

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data';
const DAILY_CACHE_PREFIX = 'cdn_daily_sudoku_';
const DAILY_TS_PREFIX = 'cdn_daily_sudoku_ts_';
const PROGRESS_KEY = 'sudoku_daily_progress';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatDateValue(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getDailyCacheKey(dateValue) {
  return `${DAILY_CACHE_PREFIX}${dateValue.replace(/-/g, '')}`;
}

function buildDailyDisplay(dateValue) {
  const [year, month, day] = dateValue.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

class SudokuDaily {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.gameName = 'sudoku-daily';
    this.todayDate = formatDateValue(new Date());
    this.selectedDate = this.todayDate;
    
    this.board = [];
    this.originalBoard = [];
    this.selectedCell = { row: -1, col: -1 };
    this.showCandidates = true;
    this.victory = false;
    this.solving = false;
    
    this.timer = 0;
    this.timerInterval = null;
    this.startTime = 0;
    
    this.dailyData = null;
    this.loading = false;
    
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = AchievementManager.getInstance();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });

    this._calcLayout();
    this.initBoard();
    this.loadTodaySudoku();
    this.bindEvents();
  }

  _calcLayout() {
    // 参考一笔画的动态布局
    const topY = this.headerBar.boardStartY;
    const statusH = 36;           // 状态栏高度（日期+难度+计时）
    const numPadH = 185;          // 数字键盘高度
    const bottomBarH = 60;        // 底部工具栏高度
    const gapAbove = 8;           // 棋盘上方间距
    const gapBelow = 10;          // 棋盘下方间距

    // 状态区
    this._statusY = topY;
    this._statusH = statusH;

    // 棋盘：居中，尽可能大，但留出数字键盘和底部栏空间
    const boardTop = topY + statusH + gapAbove;
    const boardBottom = this.height - bottomBarH - numPadH - gapBelow;
    const maxBoardH = boardBottom - boardTop;
    const maxBoardW = this.width - 30;
    const boardSize = Math.min(maxBoardW, maxBoardH, 400);
    this._boardSize = boardSize;
    this._boardStartX = (this.width - boardSize) / 2;
    this._boardStartY = boardTop + (maxBoardH - boardSize) / 2;
    this._cellSize = boardSize / 9;

    // 数字键盘：棋盘下方
    this._btnSize = 44;
    this._btnGap = 8;
    this._numPadGridW = this._btnSize * 3 + this._btnGap * 2;
    this._numPadStartX = (this.width - this._numPadGridW) / 2;
    this._numPadStartY = this._boardStartY + boardSize + gapBelow;

    // 清除按钮
    this._clearBtnY = this._numPadStartY + 3 * (this._btnSize + this._btnGap) + 5;
  }
  
  initBoard() {
    this.board = [];
    for (let r = 0; r < 9; r++) {
      const row = [];
      for (let c = 0; c < 9; c++) {
        row.push({
          value: '',
          fixed: false,
          candidates: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          showCandidates: false,
          error: false
        });
      }
      this.board.push(row);
    }
    this.selectedCell = { row: -1, col: -1 };
  }
  
  loadTodaySudoku() {
    const dateValue = this.todayDate;
    const cacheKey = getDailyCacheKey(dateValue);
    const cached = wx.getStorageSync(cacheKey);
    
    this.loading = true;
    
    if (cached && cached.puzzle) {
      console.log('[Sudoku] 使用缓存');
      this.setPuzzle(cached);
      return;
    }
    
    const dateKey = dateValue.replace(/-/g, '');
    console.log(`[Sudoku] 从CDN加载: ${CDN_BASE}/sudoku/${dateKey}.json`);
    
    wx.request({
      url: `${CDN_BASE}/sudoku/${dateKey}.json`,
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        this.loading = false;
        if (res.statusCode === 200 && res.data && res.data.puzzle) {
          console.log('[Sudoku] CDN加载成功');
          wx.setStorageSync(cacheKey, res.data);
          this.setPuzzle(res.data);
        } else {
          console.log('[Sudoku] CDN无数据，生成备用');
          this.generateBackupSudoku();
        }
      },
      fail: (err) => {
        this.loading = false;
        console.log('[Sudoku] CDN加载失败', err);
        this.generateBackupSudoku();
      }
    });
  }
  
  setPuzzle(data) {
    this.dailyData = data;
    this.initBoard();
    
    const puzzle = data.puzzle;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const num = puzzle[r][c];
        if (num !== 0) {
          this.board[r][c].value = String(num);
          this.board[r][c].fixed = true;
        }
      }
    }
    
    this.originalBoard = puzzle.map(row => [...row]);
    this.startTimer();
    this.calculateCandidates();
    this.draw();
  }
  
  generateBackupSudoku() {
    try {
      const fullBoard = sudoku.generateFullBoard();
      const puzzle = sudoku.createPuzzle(fullBoard, 45);
      
      const [year, month, day] = this.todayDate.split('-');
      const backupData = {
        name: `${year}年${Number(month)}月${Number(day)}日数独`,
        level: '★★☆☆☆',
        difficulty: '中等',
        puzzle: puzzle
      };
      
      this.setPuzzle(backupData);
    } catch (e) {
      console.error('[Sudoku] 备用题目生成失败', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  }
  
  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.startTime = Date.now();
    this.timer = 0;
    this.timerInterval = setInterval(() => {
      this.timer = Math.floor((Date.now() - this.startTime) / 1000);
      this.drawTimer();
    }, 1000);
  }
  
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  
  drawTimer() {
    const minutes = Math.floor(this.timer / 60);
    const seconds = this.timer % 60;
    const timeStr = `${pad2(minutes)}:${pad2(seconds)}`;

    const x = this.width / 2;
    const y = this._statusY + this._statusH / 2 + 1;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.font = '13px Arial, -apple-system';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`⏱ ${timeStr}`, x, y);
  }
  
  calculateCandidates() {
    if (!this.showCandidates) return;
    
    const grid = [];
    for (let r = 0; r < 9; r++) {
      const row = [];
      for (let c = 0; c < 9; c++) {
        const val = this.board[r][c].value ? parseInt(this.board[r][c].value) : 0;
        row.push(val);
      }
      grid.push(row);
    }
    
    const candidates = sudoku.calculateAllCandidates(grid);
    
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cellCandidates = candidates[r][c];
        const arr = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        cellCandidates.forEach(n => arr[n - 1] = n);
        this.board[r][c].candidates = arr;
        this.board[r][c].showCandidates = this.board[r][c].value === '' && this.showCandidates;
      }
    }
  }
  
  onCellClick(row, col) {
    if (this.victory) return;
    if (this.board[row][col].fixed) return;
    
    this.selectedCell = { row, col };
    this.calculateCandidates();
    this.draw();
  }
  
  onNumberInput(num) {
    const { row, col } = this.selectedCell;
    if (row === -1 || col === -1) {
      wx.showToast({ title: '请先点击格子', icon: 'none' });
      return;
    }
    if (this.board[row][col].fixed) return;
    
    this.board[row][col].value = String(num);
    this.board[row][col].error = false;
    this.calculateCandidates();
    
    if (!this.victory) {
      sound.play('click');
    }
    
    this.checkVictory();
    this.draw();
  }
  
  onClearCell() {
    const { row, col } = this.selectedCell;
    if (row === -1 || col === -1) return;
    if (this.board[row][col].fixed) return;
    
    this.board[row][col].value = '';
    this.board[row][col].error = false;
    this.calculateCandidates();
    this.draw();
  }
  
  onCandidateClick(row, col, num) {
    if (this.board[row][col].fixed) return;
    if (this.board[row][col].candidates[num - 1] !== num) return;
    
    this.board[row][col].value = String(num);
    this.board[row][col].candidates = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    
    if (!this.victory) {
      sound.play('click');
    }
    
    this.checkVictory();
    this.draw();
  }
  
  checkVictory() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c].value === '') return;
      }
    }
    
    const grid = [];
    for (let r = 0; r < 9; r++) {
      const row = [];
      for (let c = 0; c < 9; c++) {
        row.push(parseInt(this.board[r][c].value));
      }
      grid.push(row);
    }
    
    if (!sudoku.isValidInput(grid)) {
      this.showErrors();
      return;
    }
    
    this.onVictory();
  }
  
  showErrors() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = parseInt(this.board[r][c].value);
        if (val > 0) {
          const rowSet = new Set();
          const colSet = new Set();
          const boxSet = new Set();
          
          for (let i = 0; i < 9; i++) {
            const rv = parseInt(this.board[r][i].value);
            const cv = parseInt(this.board[i][c].value);
            if (rv === val && i !== c) rowSet.add(rv);
            if (cv === val && i !== r) colSet.add(cv);
          }
          
          const br = Math.floor(r / 3) * 3;
          const bc = Math.floor(c / 3) * 3;
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              const vv = parseInt(this.board[br + i][bc + j].value);
              if (vv === val && (br + i !== r || bc + j !== c)) {
                boxSet.add(vv);
              }
            }
          }
          
          if (rowSet.has(val) || colSet.has(val) || boxSet.has(val)) {
            this.board[r][c].error = true;
          }
        }
      }
    }
    this.draw();
    sound.play('wrong');
  }
  
  onVictory() {
    this.victory = true;
    this.stopTimer();
    this.confetti.start();
    sound.play('victory');
    
    const rewardMgr = getRewardManager();
    const rewardResult = rewardMgr.processVictory(this.gameName, {
      difficulty: 'easy',
      level: 1,
      time: this.timer
    });
    rewardMgr.showRewardToast(rewardResult);
    
    const newlyAchieved = this.achievement.check(this.gameName, 1);
    this._newAchievements = newlyAchieved;
    
    this.saveProgress();
    
    this.draw();
  }
  
  saveProgress() {
    try {
      const saved = wx.getStorageSync(PROGRESS_KEY);
      const data = saved ? JSON.parse(saved) : {};
      data[this.todayDate] = {
        completed: true,
        time: this.timer,
        date: this.todayDate
      };
      wx.setStorageSync(PROGRESS_KEY, JSON.stringify(data));
    } catch (e) {}
  }
  
  solveSudoku() {
    if (this.solving) return;
    this.solving = true;
    
    const grid = [];
    for (let r = 0; r < 9; r++) {
      const row = [];
      for (let c = 0; c < 9; c++) {
        row.push(this.board[r][c].value ? parseInt(this.board[r][c].value) : 0);
      }
      grid.push(row);
    }
    
    if (!sudoku.isValidInput(grid)) {
      this.solving = false;
      wx.showToast({ title: '输入无效', icon: 'none' });
      return;
    }
    
    const solved = grid.map(r => [...r]);
    if (!sudoku.solve(solved)) {
      this.solving = false;
      wx.showToast({ title: '无解', icon: 'none' });
      return;
    }
    
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!this.board[r][c].fixed) {
          this.board[r][c].value = String(solved[r][c]);
        }
      }
    }
    
    this.solving = false;
    this.calculateCandidates();
    this.onVictory();
    this.draw();
  }
  
  toggleCandidates() {
    this.showCandidates = !this.showCandidates;
    this.calculateCandidates();
    this.draw();
  }
  
  bindEvents() {
    this.clickHandler = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;
      
      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }
      
      if (this.victory) {
        const result = this.victoryPanel.handleClick(x, y);
        if (result === 'next') {
          sound.play('click');
          this.victory = false;
          this.initBoard();
          this.loadTodaySudoku();
          this.victoryPanel.reset();
          this.draw();
          return;
        }
        if (result === 'back') {
          sound.play('click');
          this.switchGame('menu');
          return;
        }
        return;
      }
      
      if (this.headerBar.isBackButton(x, y)) {
        sound.play('click');
        this.switchGame('menu');
        return;
      }
      
      const bottomAction = this.bottomBar.handleClick(x, y);
      if (bottomAction) {
        this._handleBottomAction(bottomAction);
        return;
      }
      
      if (this._handleBoardClick(x, y)) return;
      if (this._handleNumberPadClick(x, y)) return;
    };
    
    this.canvas.addEventListener('click', this.clickHandler);
  }
  
  _handleBoardClick(x, y) {
    const startX = this._boardStartX;
    const startY = this._boardStartY;
    const boardSize = this._boardSize;
    const cellSize = this._cellSize;

    if (x < startX || x > startX + boardSize) return false;
    if (y < startY || y > startY + boardSize) return false;

    const col = Math.floor((x - startX) / cellSize);
    const row = Math.floor((y - startY) / cellSize);

    if (row >= 0 && row < 9 && col >= 0 && col < 9) {
      this.onCellClick(row, col);
      return true;
    }

    return false;
  }
  
  _handleNumberPadClick(x, y) {
    const btnSize = this._btnSize;
    const gap = this._btnGap;
    const startX = this._numPadStartX;
    const startY = this._numPadStartY;

    // 数字按钮区域
    if (y >= startY && y <= startY + 3 * (btnSize + gap)) {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const btnX = startX + col * (btnSize + gap);
          const btnY = startY + row * (btnSize + gap);
          if (x >= btnX && x <= btnX + btnSize && y >= btnY && y <= btnY + btnSize) {
            this.onNumberInput(row * 3 + col + 1);
            return true;
          }
        }
      }
    }

    // 清除按钮
    const clearBtnX = startX;
    const clearBtnY = this._clearBtnY;
    const clearBtnW = this._numPadGridW;
    const clearBtnH = 36;
    if (x >= clearBtnX && x <= clearBtnX + clearBtnW && y >= clearBtnY && y <= clearBtnY + clearBtnH) {
      this.onClearCell();
      return true;
    }

    return false;
  }
  
  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        this.onClearCell();
        break;
      case 'restart':
        sound.play('click');
        this.initBoard();
        this.loadTodaySudoku();
        break;
      case 'hint':
        this.solveSudoku();
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
        break;
    }
  }
  
  update() {}
  
  _drawStatus() {
    const ctx = this.ctx;
    const y = this._statusY;
    const name = this.dailyData ? this.dailyData.name : buildDailyDisplay(this.todayDate);
    const diff = this.dailyData ? (this.dailyData.difficulty || '') : '';

    // 左侧：日期·难度
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px Arial, -apple-system';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${name} · ${diff}`, 15, y + this._statusH / 2);

    // 右侧：计时器
    const minutes = Math.floor(this.timer / 60);
    const seconds = this.timer % 60;
    const timeStr = `${pad2(minutes)}:${pad2(seconds)}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '13px Arial, -apple-system';
    ctx.textAlign = 'right';
    ctx.fillText(`⏱ ${timeStr}`, this.width - 15, y + this._statusH / 2);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  draw() {
    this.ctx.fillStyle = '#0a1628';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.headerBar.draw({
      title: '每日数独'
    });

    this._drawStatus();
    this.drawBoard();
    this.drawNumberPad();

    this.bottomBar.setButtons([
      { id: 'undo', text: '清除' },
      { id: 'restart', text: '重置' },
      { id: 'hint', text: '求解' }
    ]);
    this.bottomBar.draw();

    if (this.victory) {
      this.victoryPanel.setSubtitle(buildDailyDisplay(this.todayDate));
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }

    if (this.tutorial && this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
  }
  
  drawBoard() {
    const startX = this._boardStartX;
    const startY = this._boardStartY;
    const boardSize = this._boardSize;
    const cellSize = this._cellSize;

    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    roundRect(this.ctx, startX, startY, boardSize, boardSize, 12);
    this.ctx.fill();

    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 4;
    this.ctx.fill();
    this.ctx.shadowColor = 'transparent';

    for (let i = 0; i <= 9; i++) {
      const pos = startX + i * cellSize;
      const posY = startY + i * cellSize;

      this.ctx.strokeStyle = i % 3 === 0 ? '#1a1a2e' : '#ddd';
      this.ctx.lineWidth = i % 3 === 0 ? 2.5 : 0.8;
      this.ctx.beginPath();
      this.ctx.moveTo(pos, startY);
      this.ctx.lineTo(pos, startY + boardSize);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(startX, posY);
      this.ctx.lineTo(startX + boardSize, posY);
      this.ctx.stroke();
    }

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = this.board[r][c];
        const cx = startX + c * cellSize;
        const cy = startY + r * cellSize;

        if (cell.value) {
          if (cell.fixed) {
            this.ctx.fillStyle = '#1a1a2e';
            this.ctx.font = `bold ${cellSize * 0.55}px Arial`;
          } else {
            this.ctx.fillStyle = cell.error ? '#e74c3c' : '#2196F3';
            this.ctx.font = `bold ${cellSize * 0.55}px Arial`;
          }
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(cell.value, cx + cellSize / 2, cy + cellSize / 2);
        } else if (this.showCandidates && cell.candidates.some(n => n > 0)) {
          const candSize = cellSize / 3;
          for (let n = 0; n < 9; n++) {
            if (cell.candidates[n] > 0) {
              const nr = Math.floor(n / 3);
              const nc = n % 3;
              const nx = cx + nc * candSize + candSize / 2;
              const ny = cy + nr * candSize + candSize / 2;

              this.ctx.fillStyle = '#666';
              this.ctx.font = `bold ${candSize * 0.55}px Arial`;
              this.ctx.textAlign = 'center';
              this.ctx.textBaseline = 'middle';
              this.ctx.fillText(String(n + 1), nx, ny);
            }
          }
        }
      }
    }

    if (this.selectedCell.row >= 0) {
      const sx = startX + this.selectedCell.col * cellSize;
      const sy = startY + this.selectedCell.row * cellSize;
      this.ctx.strokeStyle = '#2196F3';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4);

      this.ctx.fillStyle = 'rgba(33, 150, 243, 0.08)';
      this.ctx.fillRect(sx, sy, cellSize, cellSize);
    }
  }
  
  drawNumberPad() {
    const btnSize = this._btnSize;
    const gap = this._btnGap;
    const startX = this._numPadStartX;
    const startY = this._numPadStartY;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const btnX = startX + col * (btnSize + gap);
        const btnY = startY + row * (btnSize + gap);

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.beginPath();
        roundRect(this.ctx, btnX, btnY, btnSize, btnSize, 8);
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${btnSize * 0.5}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(String(row * 3 + col + 1), btnX + btnSize / 2, btnY + btnSize / 2);
      }
    }

    const clearBtnX = startX;
    const clearBtnY = this._clearBtnY;
    const clearBtnW = this._numPadGridW;
    const clearBtnH = 36;

    this.ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
    this.ctx.beginPath();
    roundRect(this.ctx, clearBtnX, clearBtnY, clearBtnW, clearBtnH, 8);
    this.ctx.fill();

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('清除', clearBtnX + clearBtnW / 2, clearBtnY + clearBtnH / 2);
  }
  
  _drawAchievementPopup() {
    this._newAchievements = null;
  }
  
  destroy() {
    this.stopTimer();
    this.canvas.removeEventListener('click', this.clickHandler);
  }
}

module.exports = SudokuDaily;
