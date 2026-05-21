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
/**
 * 战舰 (Battleship) - 小游戏版
 * 规则：猜测敌方战舰位置，击沉所有战舰获胜
 */
class Battleship {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    
    // 安全区域适配
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.level = level;
    statsManager.startGame(this.gameName, level) || 1; // 关卡号
    this.gameName = 'battleship';
    
    this.size = 8; // 8x8网格
    this.cellSize = Math.min(this.width * 0.85 / this.size, 42);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = this.statusBarHeight + 120;
    
    // 网格状态：0=空，1=战舰，-1=已打空，2=已击中
    this.grid = [];
    this.ships = [];
    
    this.shots = 0;
    this.hits = 0;
    this.totalShipCells = 0;
    this.animationTime = 0;
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = new AchievementManager();

    // 共享 UI 组件
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      title: '🎉 恭喜通关！',
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });



    this.hintMgr = new HintManager(); this._levelData = null;
    this.lastHit = null;
    
    this.loadLevel();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
  }
  
  async loadLevel() {
    if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear(); if (this.hintMgr) this.hintMgr.reset();
    try {
      const data = await LevelLoader.load('battleship', this.level, 'easy');
      if (data && data.grid) {
        this.size = data.size || 8;
        this.cellSize = Math.min(this.width * 0.85 / this.size, 42);
        this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
        this.boardOffsetY = 120;
        
        // 玩家视图：初始全为0（未探索）
        this.grid = [];
        for (let r = 0; r < this.size; r++) {
          this.grid[r] = [];
          for (let c = 0; c < this.size; c++) {
            this.grid[r][c] = 0; // 0=未探索
          }
        }
        
        // 保存答案稍后验证
        this.answerGrid = data.grid;
        this.rowCounts = data.rowCounts || [];
        this.colCounts = data.colCounts || [];
        
        // 统计战舰格数
        this.totalShipCells = 0;
        for (let r = 0; r < this.size; r++) {
          for (let c = 0; c < this.size; c++) {
            if (data.grid[r][c] === 1) this.totalShipCells++;
          }
        }
        
        this.ships = [];
        this.shots = 0;
        this.hits = 0;
        this.victory = false;
        this.lastHit = null;
        return;
      }
    } catch (e) { /* CDN失败，走内置题 */ }
    
    // 内置题目（简化版：随机生成）
    this.grid = [];
    for (let r = 0; r < this.size; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.size; c++) {
        this.grid[r][c] = 0; // 0=空，未探索
      }
    }
    
    // 放置战舰（简化版：随机放置）
    this.ships = [];
    const shipSizes = [4, 3, 3, 2]; // 一艘4格，两艘3格，一艘2格
    this.totalShipCells = shipSizes.reduce((a, b) => a + b, 0);
    
    for (const size of shipSizes) {
      let placed = false;
      while (!placed) {
        const horizontal = Math.random() < 0.5;
        const maxR = horizontal ? this.size : this.size - size;
        const maxC = horizontal ? this.size - size : this.size;
        
        const r = Math.floor(Math.random() * maxR);
        const c = Math.floor(Math.random() * maxC);
        
        // 检查是否可以放置
        let canPlace = true;
        for (let i = 0; i < size; i++) {
          const rr = horizontal ? r : r + i;
          const cc = horizontal ? c + i : c;
          if (this.grid[rr][cc] !== 0) {
            canPlace = false;
            break;
          }
        }
        
        if (canPlace) {
          const ship = [];
          for (let i = 0; i < size; i++) {
            const rr = horizontal ? r : r + i;
            const cc = horizontal ? c + i : c;
            this.grid[rr][cc] = 1; // 1=战舰
            ship.push({r: rr, c: cc});
          }
          this.ships.push(ship);
          placed = true;
        }
      }
    }
    
    this.shots = 0;
    this.hits = 0;
    this.victory = false;
    this.lastHit = null;
  }
  
  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;// 撤销按钮检测
      if (this._undoBtn && x >= this._undoBtn.x && x <= this._undoBtn.x + this._undoBtn.w && y >= this._undoBtn.y && y <= this._undoBtn.y + this._undoBtn.h) {
        const state = this.undoMgr.undo();
        if (state) {
          this.grid = state.grid;
          this.draw();
        }
        return;
      }
      
      // 提示按钮检测
      if (this._hintBtn && x >= this._hintBtn.x && x <= this._hintBtn.x + this._hintBtn.w && y >= this._hintBtn.y && y <= this._hintBtn.y + this._hintBtn.h) {
        if (this._levelData && this.hintMgr) {
          const answerData = this._levelData.grid;
          const hint = this.hintMgr.getHint('battleship', answerData, this.grid);
          if (hint) {
            this.grid[hint.row][hint.col] = hint.value;
            this.draw();
          }
        }
        return;
      }
      
      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }
      
      // 底部工具栏按钮
      const action = this.bottomBar.handleClick(x, y);
      if (action) {
        this._handleBottomAction(action);
        return;
      }
      
      // 顶部返回按钮
      if (this.headerBar.isBackButton(x, y)) {
        sound.play('click');
        this.switchGame('level-select', this.gameName);
        return;
      }
      
      // 通关面板
      if (this.victory) {
        const result = this.victoryPanel.handleClick(x, y);
        if (result === 'next') {
          this.level++;
          this.loadLevel();
          sound.play('click');
          this.victoryPanel.reset();
          this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear(); if (this.hintMgr) this.hintMgr.reset();
          return;
        }
        if (result === 'back') {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        this.victoryPanel.setSubtitle('关卡 ' + this.level);
        this.victoryPanel.setAchievements(this._newAchievements);
        this.victoryPanel.draw();
        return;
      }
      
      // 底部工具栏
      const bottomAction = this.bottomBar.handleClick(x, y);
      if (bottomAction === 'reset') {
        this.loadLevel();
        return;
      }
      
      // 检查格子点击
      const col = Math.floor((x - this.boardOffsetX) / this.cellSize);
      const row = Math.floor((y - this.boardOffsetY) / this.cellSize);
      
      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        // 只能点击未探索的格子
        if (this.grid[row][col] === 0 || this.grid[row][col] === 1) {
          if (this.grid[row][col] === 1) {
            this.grid[row][col] = 2; // 2=击中
            this.hits++;
            this.lastHit = {row, col, time: this.animationTime};
          } else {
            this.grid[row][col] = -1; // -1=打空
          }
          if (this.undoMgr) this.undoMgr.save({ grid: this.grid.map(r => [...r]), shots: this.shots, hits: this.hits, lastHit: this.lastHit });
            this.shots++;
          this.checkVictory();
        }
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }
  
  checkVictory() {
    if (this.hits >= this.totalShipCells) {
      this.victory = true;
      this.confetti.start();
      // 成就检测
      let winCount = 0;
      try { const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName) || '{}'); winCount = p.unlocked || 0; } catch(e) {}
      const newlyAchieved = this.achievement.check(this.gameName, winCount);
      this._newAchievements = newlyAchieved;
      sound.play('victory');
      this.saveGameProgress(); statsManager.endGame(true);
    }
  }
  
  update() {
    this.animationTime += 0.1;
  }
  
  draw() {
    this.drawBackground();
    
    this.headerBar.draw({
      title: '🚢 海战游戏',
      info: '点击格子寻找战舰',
      info2: `关卡 ${this.level}  |  开火 ${this.shots}  |  命中 ${this.hits}/${this.totalShipCells}`
    });
    this.drawBoard();
    this.bottomBar.setButtons([{ id: 'reset', text: '🔄 新局' }]);
    this.bottomBar.draw();
    
    if (this.victory) {
      this.victoryPanel.setSubtitle('关卡 ' + this.level);
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }
    
    // 规则弹窗
    if (this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
  }
  
  drawBackground() {
    let gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0d1b2a');
    gradient.addColorStop(1, '#1b263b');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // 波浪效果
    for (let i = 0; i < 5; i++) {
      let waveY = 50 + i * 60 + Math.sin(this.animationTime + i) * 5;
      this.ctx.strokeStyle = `rgba(65, 178, 224, ${0.1 - i * 0.015})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      for (let x = 0; x < this.width; x += 10) {
        let y = waveY + Math.sin((x + this.animationTime * 20) * 0.02) * 10;
        if (x === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }
  }
  
  drawBoard() {
    // 棋盘背景
    this.ctx.fillStyle = 'rgba(0, 50, 80, 0.5)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.boardOffsetX - 5, this.boardOffsetY - 5, 
                       this.cellSize * this.size + 10, this.cellSize * this.size + 10, 8);
    this.ctx.fill();
    
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const x = this.boardOffsetX + c * this.cellSize;
        const y = this.boardOffsetY + r * this.cellSize;
        const state = this.grid[r][c];
        
        // 海洋背景
        let waveOffset = Math.sin(this.animationTime + r + c) * 2;
        this.ctx.fillStyle = 'rgba(30, 80, 120, 0.8)';
        this.ctx.fillRect(x, y + waveOffset, this.cellSize, this.cellSize);
        
        if (state === -1) {
          // 打空 - 水花
          this.ctx.fillStyle = 'rgba(100, 150, 200, 0.5)';
          this.ctx.beginPath();
          this.ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize / 4, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (state === 2) {
          // 击中 - 爆炸效果
          let explosionSize = 1;
          if (this.lastHit && this.lastHit.row === r && this.lastHit.col === c) {
            let elapsed = this.animationTime - this.lastHit.time;
            if (elapsed < 1) {
              explosionSize = 1 + Math.sin(elapsed * Math.PI) * 0.3;
            }
          }
          
          // 火焰
          let gradient = this.ctx.createRadialGradient(
            x + this.cellSize / 2, y + this.cellSize / 2, 0,
            x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize / 2 * explosionSize
          );
          gradient.addColorStop(0, '#FF6B35');
          gradient.addColorStop(0.5, '#F7931E');
          gradient.addColorStop(1, '#FFD700');
          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, 
                       this.cellSize / 3 * explosionSize, 0, Math.PI * 2);
          this.ctx.fill();
        }
        
        // 网格线
        this.ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
      }
    }
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

  _handleBottomAction(action) {
    switch (action) {
      case 'reset':
        this.startGame(this.level);
        sound.play('click');
        this.draw();
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
        break;
    }
  }

  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  _drawAchievementPopup() {
    this._newAchievements = null;
  }

}

module.exports = Battleship;
