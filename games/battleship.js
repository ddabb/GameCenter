const statsManager = require('./stats-manager.js').getInstance();
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');
const { HintManager } = require('./hint-manager');
const Confetti = require('./confetti');
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
    
    this.level = level;
    statsManager.startGame(this.gameName, level) || 1; // 关卡号
    this.gameName = 'battleship';
    
    this.size = 8; // 8x8网格
    this.cellSize = Math.min(this.width * 0.85 / this.size, 42);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = 120;
    
    // 网格状态：0=空，1=战舰，-1=已打空，2=已击中
    this.grid = [];
    this.ships = [];
    
    this.shots = 0;
    this.hits = 0;
    this.totalShipCells = 0;
    this.animationTime = 0;
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);



    this.hintMgr = new HintManager(); this._levelData = null;
    this.lastHit = null;
    
    this.loadLevel();
    this.bindEvents();
  }
  
  async loadLevel() {
    if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear(); if (this.hintMgr) this.hintMgr.reset();
    // 尝试从 data/ 加载真实关卡
    const safeLevel = String(this.level).padStart(4, '0');
    try {
      const data = require(`../data/battleship/easy-${safeLevel}.json`);
      this._levelData = data

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
    } catch (e) { /* 使用内置题 */ }
    
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
      }// 顶部返回按钮
      if (x >= 15 && x <= 95 && y >= 10 && y <= 55) {
        sound.play('click');
          this.switchGame('level-select', this.gameName);
        return;
      }
      
      // 通关面板
      if (this.victory) {
        if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w && y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {
          this.level++;
          this.loadLevel();
          sound.play('click');
          this._nextBtn = null;
          this._backBtn = null;
          this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear(); if (this.hintMgr) this.hintMgr.reset();
          return;
        }
        if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w && y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        if (!this._nextBtn || !this._backBtn) {
          this.confetti.draw();
      if (this._newAchievements && this._newAchievements.length > 0) this._drawAchievementPopup();
      this.showBackButton();
        }
        return;
      }
      
      // 重置按钮
      if (x > this.width - 80 && y > this.height - 60) {
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
      
    this.drawHeader();
    this.drawBoard();
    this.drawBottomBar();
    
    if (this.victory) {
      this.drawVictory();
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
  
  drawHeader() {
    // 左上角返回按钮
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('← 返回', 15, 38);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold ' + (this.width / 16) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🚢 海战游戏', this.width / 2, 40);
    
    this.ctx.font = (this.width / 30) + 'px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText('点击格子寻找战舰', this.width / 2, 70);
    
    // 统计信息
    this.ctx.fillStyle = '#41B2E0';
    this.ctx.fillText(`关卡 ${this.level}  |  开火 ${this.shots}  |  命中 ${this.hits}/${this.totalShipCells}`, this.width / 2, 95);
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
  
  drawBottomBar() {
    this.drawButton(15, this.height - 55, 70, 40, '← 返回');
    this.drawButton(this.width - 85, this.height - 55, 70, 40, '新局');
  }
  
  drawButton(x, y, w, h, text) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.beginPath();
    roundRect(this.ctx,x, y, w, h, 20);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = (this.width / 32) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x + w / 2, y + 26);
  }
  
  drawVictory() {
    if (!this._nextBtn || !this._backBtn) {
      this.confetti.draw();
      if (this._newAchievements && this._newAchievements.length > 0) this._drawAchievementPopup();
      this.showBackButton();
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

  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
  }
}

module.exports = Battleship;
