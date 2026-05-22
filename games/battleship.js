const LevelLoader = require('./level-loader');
const statsManager = require('./stats-manager.js').getInstance();
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');
const { HintManager } = require('./hint-manager');
const Confetti = require('./confetti');
const VictoryPanel = require('./components/victory-panel');
const HeaderBar = require('./components/header-bar');
const BottomBar = require('./components/bottom-bar');
const { getInstance: getRewardManager } = require('./reward-manager');

const CELL_EMPTY = 0;
const CELL_SHIP = 1;
const CELL_WATER = 2;

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/battleship';

class Battleship {
  constructor(ctx, canvas, systemInfo, switchGame, level, difficulty = 'easy') {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.gameName = 'battleship';
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.level = level;
    this.difficulty = difficulty;
    this.size = this._getSizeByDifficulty(difficulty);
    
    statsManager.startGame(this.gameName, level);
    
    this.cellSize = this._calcCellSize();
    this.hintAreaSize = 30;
    this.boardOffsetX = (this.width - this.cellSize * this.size - this.hintAreaSize) / 2;
    this.boardOffsetY = this.statusBarHeight + 100;
    
    this.grid = [];
    this.solution = [];
    this.rowHints = [];
    this.colHints = [];
    this.shipCount = 0;
    this.totalShips = 0;
    this.animationTime = 0;
    this.victory = false;
    this.timer = 0;
    this.timerInterval = null;
    
    this.undoMgr = new UndoManager();
    this.hintMgr = new HintManager();
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = new AchievementManager();
    
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      title: '🎉 恭喜通关！',
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });

    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
    this.loadPuzzle();
  }

  _getSizeByDifficulty(difficulty) {
    switch(difficulty) {
      case 'easy': return 6;
      case 'medium': return 8;
      case 'hard': return 10;
      default: return 6;
    }
  }

  _calcCellSize() {
    const maxW = this.width - 60;
    const maxH = this.height - 280;
    const sizeByW = Math.floor(maxW / this.size);
    const sizeByH = Math.floor(maxH / this.size);
    return Math.max(25, Math.min(sizeByW, sizeByH, 45));
  }

  _getHintSize() {
    return Math.max(25, Math.min(this.cellSize, 35));
  }

  async loadPuzzle() {
    if (this.confetti) this.confetti.stop();
    if (this.undoMgr) this.undoMgr.clear();
    if (this.hintMgr) this.hintMgr.reset();
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    try {
      const data = await LevelLoader.load('battleship', this.level, this.difficulty);
      if (data && data.grid) {
        this._applyPuzzle(data);
        return;
      }
    } catch (e) {
      console.log('[Battleship] CDN加载失败，使用内置题目');
    }
    
    this._generateFallback();
  }

  _applyPuzzle(puzzleData) {
    this.size = puzzleData.size || this.size;
    this.cellSize = this._calcCellSize();
    this.hintAreaSize = this._getHintSize();
    this.boardOffsetX = (this.width - this.cellSize * this.size - this.hintAreaSize) / 2;
    this.boardOffsetY = this.statusBarHeight + 100;
    
    let grid = puzzleData.grid;
    if (typeof grid[0][0] === 'string') {
      grid = grid.map(row => row.map(cell => cell === 'S' ? CELL_SHIP : CELL_EMPTY));
    }
    
    this.solution = grid;
    this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(CELL_EMPTY));
    this.rowHints = puzzleData.rowCounts || Array(this.size).fill(0);
    this.colHints = puzzleData.colCounts || Array(this.size).fill(0);
    
    this.totalShips = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.solution[r][c] === CELL_SHIP) this.totalShips++;
      }
    }
    
    this.shipCount = 0;
    this.victory = false;
    this.timer = 0;
    this.startTimer();
  }

  _generateFallback() {
    const rows = this.size, cols = this.size;
    const grid = Array(rows).fill(null).map(() => Array(cols).fill(CELL_EMPTY));
    
    const shipTypes = this.difficulty === 'easy' 
      ? [3, 2, 2, 1, 1]
      : this.difficulty === 'medium' 
        ? [4, 3, 2, 2, 1, 1]
        : [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    
    for (const length of shipTypes) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        attempts++;
        const isHorizontal = Math.random() > 0.5;
        const r = Math.floor(Math.random() * (rows - (isHorizontal ? 0 : length - 1)));
        const c = Math.floor(Math.random() * (cols - (isHorizontal ? length - 1 : 0)));
        
        let canPlace = true;
        for (let i = 0; i < length; i++) {
          const nr = isHorizontal ? r : r + i;
          const nc = isHorizontal ? c + i : c;
          if (nr >= rows || nc >= cols || grid[nr][nc] === CELL_SHIP) {
            canPlace = false;
            break;
          }
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const checkR = nr + dr;
              const checkC = nc + dc;
              if (checkR >= 0 && checkR < rows && checkC >= 0 && checkC < cols && grid[checkR][checkC] === CELL_SHIP) {
                canPlace = false;
                break;
              }
            }
            if (!canPlace) break;
          }
        }
        
        if (canPlace) {
          for (let i = 0; i < length; i++) {
            const nr = isHorizontal ? r : r + i;
            const nc = isHorizontal ? c + i : c;
            grid[nr][nc] = CELL_SHIP;
          }
          placed = true;
        }
      }
    }
    
    const rowCounts = Array(rows).fill(0);
    const colCounts = Array(cols).fill(0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === CELL_SHIP) {
          rowCounts[r]++;
          colCounts[c]++;
        }
      }
    }
    
    this._applyPuzzle({ size: this.size, grid, rowCounts, colCounts });
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

  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;
      
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
        sound.play('click');
        this.stopTimer();
        this.switchGame('level-select', this.gameName);
        return;
      }
      
      if (this.victory) {
        const result = this.victoryPanel.handleClick(x, y);
        if (result === 'next') {
          this.level++;
          this.loadPuzzle();
          sound.play('click');
          this.victoryPanel.reset();
          return;
        }
        if (result === 'back') {
          sound.play('click');
          this.stopTimer();
          this.switchGame('level-select', this.gameName);
          return;
        }
        this.victoryPanel.setSubtitle('关卡 ' + this.level);
        this.victoryPanel.setAchievements(this._newAchievements);
        this.victoryPanel.draw();
        return;
      }
      
      const col = Math.floor((x - this.boardOffsetX - this.hintAreaSize) / this.cellSize);
      const row = Math.floor((y - this.boardOffsetY - this.hintAreaSize) / this.cellSize);
      
      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        const prevState = this.grid[row][col];
        this.grid[row][col] = (this.grid[row][col] + 1) % 3;
        
        if (prevState === CELL_EMPTY && this.grid[row][col] === CELL_SHIP) {
          this.shipCount++;
        } else if (prevState === CELL_SHIP && this.grid[row][col] !== CELL_SHIP) {
          this.shipCount--;
        }
        
        sound.play('click');
        this._checkCompletion();
      }
      
      this.draw();
    };
    
    this.canvas.addEventListener('click', this.clickHandler);
  }

  _handleBottomAction(action) {
    switch (action) {
      case 'reset':
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(CELL_EMPTY));
        this.shipCount = 0;
        this.victory = false;
        this.undoMgr.clear();
        sound.play('click');
        this.draw();
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
        break;
      case 'hint':
        this._useHint();
        break;
      case 'undo':
        const state = this.undoMgr.undo();
        if (state) {
          this.grid = state.grid;
          this.shipCount = state.shipCount;
          this.draw();
        }
        break;
    }
  }

  _useHint() {
    const hint = this.hintMgr.getHint('battleship', this.solution, this.grid);
    if (hint) {
      this._undoMgr_save();
      this.grid[hint.row][hint.col] = hint.value;
      if (hint.value === CELL_SHIP) this.shipCount++;
      sound.play('click');
      this._checkCompletion();
      this.draw();
    }
  }

  _checkCompletion() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === CELL_SHIP && this.solution[r][c] !== CELL_SHIP) return;
        if (this.grid[r][c] !== CELL_SHIP && this.solution[r][c] === CELL_SHIP) return;
      }
    }
    
    for (let r = 0; r < this.size; r++) {
      let cnt = 0;
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === CELL_SHIP) cnt++;
      }
      if (cnt !== this.rowHints[r]) return;
    }
    
    for (let c = 0; c < this.size; c++) {
      let cnt = 0;
      for (let r = 0; r < this.size; r++) {
        if (this.grid[r][c] === CELL_SHIP) cnt++;
      }
      if (cnt !== this.colHints[c]) return;
    }
    
    this._onVictory();
  }

  _onVictory() {
    this.victory = true;
    this.confetti.start();
    sound.play('victory');
    
    const rewardMgr = getRewardManager();
    const rewardResult = rewardMgr.processVictory(this.gameName, {
      difficulty: this.difficulty,
      level: this.level,
      time: this.timer
    });
    rewardMgr.showRewardToast(rewardResult);
    
    let winCount = 0;
    try { 
      const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName + '_' + this.difficulty) || '{}'); 
      winCount = p.unlocked || 0; 
    } catch(e) {}
    
    const newlyAchieved = this.achievement.check(this.gameName, winCount);
    this._newAchievements = newlyAchieved;
    
    this._saveProgress();
    statsManager.endGame(true);
    this.stopTimer();
  }

  _saveProgress() {
    try {
      const key = 'progress_' + this.gameName + '_' + this.difficulty;
      const saved = wx.getStorageSync(key);
      let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
      
      if (this.level >= progress.unlocked) {
        progress.unlocked = this.level + 1;
      }
      if (!progress.stars[this.level]) {
        progress.stars[this.level] = 1;
      }
      wx.setStorageSync(key, JSON.stringify(progress));
    } catch (e) {
      console.log('[Battleship] 保存进度失败', e);
    }
  }

  update() {
    this.animationTime += 0.05;
  }

  draw() {
    this._drawBackground();
    this._drawHeader();
    this._drawHints();
    this._drawGrid();
    this._drawBottomBar();
    
    if (this.victory) {
      this.victoryPanel.setSubtitle('用时 ' + this._formatTime(this.timer));
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }
    
    if (this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
  }

  _drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  _drawHeader() {
    const timeStr = this._formatTime(this.timer);
    this.headerBar.draw({
      title: '🚢 战舰',
      info: this.difficulty === 'easy' ? '简单' : (this.difficulty === 'medium' ? '中等' : '困难'),
      info2: `第${this.level}关  |  ⏱ ${timeStr}  |  🚢 ${this.shipCount}/${this.totalShips}`
    });
  }

  _drawHints() {
    const hintSize = this.hintAreaSize;
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fillRect(this.boardOffsetX, this.boardOffsetY, hintSize + this.cellSize * this.size, hintSize + this.cellSize * this.size);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold ' + Math.min(14, hintSize * 0.6) + 'px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    for (let c = 0; c < this.size; c++) {
      const x = this.boardOffsetX + hintSize + c * this.cellSize + this.cellSize / 2;
      const y = this.boardOffsetY + hintSize / 2;
      
      if (this.colHints[c] > 0) {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillText(this.colHints[c], x, y);
      }
    }
    
    for (let r = 0; r < this.size; r++) {
      const x = this.boardOffsetX + hintSize / 2;
      const y = this.boardOffsetY + hintSize + r * this.cellSize + this.cellSize / 2;
      
      if (this.rowHints[r] > 0) {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillText(this.rowHints[r], x, y);
      }
    }
  }

  _drawGrid() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const x = this.boardOffsetX + this.hintAreaSize + c * this.cellSize;
        const y = this.boardOffsetY + this.hintAreaSize + r * this.cellSize;
        const state = this.grid[r][c];
        
        this.ctx.fillStyle = state === CELL_EMPTY ? '#2a3a5a' : (state === CELL_SHIP ? '#4a7ab8' : '#1e3a5f');
        this.ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
        this.ctx.lineWidth = 1;
        
        this.ctx.beginPath();
        roundRect(this.ctx, x + 1, y + 1, this.cellSize - 2, this.cellSize - 2, 4);
        this.ctx.fill();
        this.ctx.stroke();
        
        if (state === CELL_SHIP) {
          const scale = 1 + Math.sin(this.animationTime * 2) * 0.05;
          this.ctx.font = Math.floor(this.cellSize * 0.6 * scale) + 'px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('🚢', x + this.cellSize / 2, y + this.cellSize / 2);
        } else if (state === CELL_WATER) {
          this.ctx.font = Math.floor(this.cellSize * 0.5) + 'px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('💧', x + this.cellSize / 2, y + this.cellSize / 2);
        }
      }
    }
  }

  _drawBottomBar() {
    this.bottomBar.setButtons([
      { id: 'undo', text: '↩️ 撤销' },
      { id: 'reset', text: '🔄 重置' },
      { id: 'hint', text: '💡 提示' },
      { id: 'rule', text: '📖 规则' }
    ]);
    this.bottomBar.draw();
  }

  _drawAchievementPopup() {
    this._newAchievements = null;
  }

  destroy() {
    this.stopTimer();
    this.canvas.removeEventListener('click', this.clickHandler);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
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

module.exports = Battleship;
