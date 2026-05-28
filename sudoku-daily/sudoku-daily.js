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
const sudoku = require('./sudoku-algo');
const sound = require('../games/sound-manager');
const TutorialOverlay = require('../games/tutorial-overlay');
const Confetti = require('../games/confetti');
const core = require('./sudoku-daily-core.js');
const renderer = require('./sudoku-daily-renderer.js');
const { AchievementManager } = require('../games/achievement-manager');
const { getInstance: getRewardManager } = require('../games/reward-manager');
const VictoryPanel = require('../games/components/victory-panel');
const HeaderBar = require('../games/components/header-bar');
const BottomBar = require('../games/components/bottom-bar');

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
    this.todayDate = core.formatDateValue(new Date());
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
    const topY = this.headerBar.boardStartY;
    const statusH = 36;
    const numPadH = 185;
    const bottomBarH = 60;
    const gapAbove = 8;
    const gapBelow = 10;

    this._statusY = topY;
    this._statusH = statusH;

    const boardTop = topY + statusH + gapAbove;
    const boardBottom = this.height - bottomBarH - numPadH - gapBelow;
    const maxBoardH = boardBottom - boardTop;
    const maxBoardW = this.width - 30;
    const boardSize = Math.min(maxBoardW, maxBoardH, 400);
    this._boardSize = boardSize;
    this._boardStartX = (this.width - boardSize) / 2;
    this._boardStartY = boardTop + (maxBoardH - boardSize) / 2;
    this._cellSize = boardSize / 9;

    this._btnSize = 44;
    this._btnGap = 8;
    this._numPadGridW = this._btnSize * 3 + this._btnGap * 2;
    this._numPadStartX = (this.width - this._numPadGridW) / 2;
    this._numPadStartY = this._boardStartY + boardSize + gapBelow;

    this._clearBtnY = this._numPadStartY + 3 * (this._btnSize + this._btnGap) + 5;
  }
  
  initBoard() {
    this.board = core.createEmptyBoard();
    this.selectedCell = { row: -1, col: -1 };
  }
  
  loadTodaySudoku() {
    const dateValue = this.todayDate;
    const cacheKey = core.getDailyCacheKey(dateValue);
    const cached = wx.getStorageSync(cacheKey);
    
    this.loading = true;
    
    if (cached && cached.puzzle) {
      console.log('[Sudoku] 使用缓存');
      this.setPuzzle(cached);
      return;
    }
    
    const dateKey = dateValue.replace(/-/g, '');
    console.log(`[Sudoku] 从CDN加载: ${core.CDN_BASE}/sudoku/${dateKey}.json`);
    
    wx.request({
      url: `${core.CDN_BASE}/sudoku/${dateKey}.json`,
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
    renderer.drawTimer(this);
  }
  
  calculateCandidates() {
    core.calculateCandidates(this.board, this.showCandidates);
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
      const saved = wx.getStorageSync(core.PROGRESS_KEY);
      const data = saved ? JSON.parse(saved) : {};
      data[this.todayDate] = {
        completed: true,
        time: this.timer,
        date: this.todayDate
      };
      wx.setStorageSync(core.PROGRESS_KEY, JSON.stringify(data));
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
  
  draw() {
    this.ctx.fillStyle = '#0a1628';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.headerBar.draw({
      title: '每日数独'
    });

    renderer.drawStatus(this);
    renderer.drawBoard(this);
    renderer.drawNumberPad(this);

    this.bottomBar.setButtons([
      { id: 'undo', text: '清除' },
      { id: 'restart', text: '重置' },
      { id: 'hint', text: '求解' }
    ]);
    this.bottomBar.draw();

    if (this.victory) {
      this.victoryPanel.setSubtitle(core.buildDailyDisplay(this.todayDate));
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }

    if (this.tutorial && this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
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
