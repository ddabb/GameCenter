const statsManager = require('./stats-manager.js').getInstance();
const Confetti = require('./confetti');
class Nurikabe {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    
    this.level = level;
    statsManager.startGame(this.gameName, level) || 1; // 关卡号
    this.gameName = 'nurikabe';
    
    this.cellSize = Math.min(this.width * 0.9 / 7, 50);
    this.boardOffsetX = (this.width - this.cellSize * 7) / 2;
    this.boardOffsetY = 100;
    
    this.board = [];
    this.marks = [];
    this.animationTime = 0;
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);



    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    
    this.loadLevel();
    this.bindEvents();
  }
  
  async loadLevel() {
    if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
    // 尝试从 data/ 加载真实关卡
    const safeLevel = String(this.level).padStart(4, '0');
    try {
      const data = require(`../data/nurikabe/easy-${safeLevel}.json`)
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');

      if (data && data.grid) {
        this.size = data.size || 5;
        this.cellSize = Math.min(this.width * 0.9 / this.size, 50);
        this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
        this.boardOffsetY = 100;
        
        this.board = data.grid;
        this.marks = [];
        for (let r = 0; r < this.size; r++) {
          this.marks[r] = [];
          for (let c = 0; c < this.size; c++) {
            this.marks[r][c] = 0;
          }
        }
        this.victory = false;
        return;
      }
    } catch (e) { /* 使用内置题 */ }
    
    // 内置题目
    this.board = [
      [0,0,1,0,0,2,0],
      [0,0,0,0,0,0,0],
      [0,3,0,0,0,0,0],
      [0,0,0,2,0,0,0],
      [0,0,0,0,0,3,0],
      [0,1,0,0,0,0,0],
      [0,0,0,0,0,0,0]
    ];
    
    this.marks = [];
    for (let r = 0; r < 7; r++) {
      this.marks[r] = [];
      for (let c = 0; c < 7; c++) {
        this.marks[r][c] = 0; // 0=空, 1=黑色(墙), 2=白色(岛)
      }
    }
    this.victory = false;
  }
  
  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;// 撤销按钮检测
      if (this._undoBtn && x >= this._undoBtn.x && x <= this._undoBtn.x + this._undoBtn.w && y >= this._undoBtn.y && y <= this._undoBtn.y + this._undoBtn.h) {
        const state = this.undoMgr.undo();
        if (state) {
          this.board = state.board;
          this.marks = state.marks;
          this.draw();
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
          this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
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
      
      let col = Math.floor((x - this.boardOffsetX) / this.cellSize);
      let row = Math.floor((y - this.boardOffsetY) / this.cellSize);
      
      if (row >= 0 && row < 7 && col >= 0 && col < 7) {
        if (this.board[row][col] === 0) {
          // 循环切换：空 → 黑 → 白 → 空
          if (this.undoMgr) this.undoMgr.save({ marks: this.marks.map(r => [...r]) });
          this.marks[row][col] = (this.marks[row][col] + 1) % 3;
          this.checkVictory();
        }
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }
  
  update() {
    this.animationTime += 0.08;
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
  
  checkVictory() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === 0 && this.marks[r][c] === 0) return;
      }
    }
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

  drawBackground() {
    let gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f1a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
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
    this.ctx.fillText('🧱 数墙游戏', this.width / 2, 40);
    
    this.ctx.font = (this.width / 30) + 'px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText('用黑色墙壁分隔数字岛屿', this.width / 2, 70);
  }
  
  drawBoard() {
    // 棋盘阴影
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.beginPath();
    roundRect(ctx,this.boardOffsetX + 3, this.boardOffsetY + 5, 
                       this.cellSize * 7, this.cellSize * 7, 8);
    this.ctx.fill();
    
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        let x = this.boardOffsetX + c * this.cellSize;
        let y = this.boardOffsetY + r * this.cellSize;
        
        // 背景
        if (this.board[r][c] > 0) {
          // 数字格（岛屿）
          let pulse = Math.sin(this.animationTime) * 0.1 + 0.3;
          this.ctx.fillStyle = `rgba(107, 203, 119, ${pulse + 0.1})`;
          this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        } else if (this.marks[r][c] === 1) {
          // 黑色墙壁
          this.ctx.fillStyle = '#1a1a1a';
          this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        } else if (this.marks[r][c] === 2) {
          // 白色岛屿
          this.ctx.fillStyle = '#e8f5e9';
          this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        } else {
          // 空格
          this.ctx.fillStyle = '#2a2a3a';
          this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }
        
        // 数字
        if (this.board[r][c] > 0) {
          this.ctx.fillStyle = '#2E7D32';
          this.ctx.font = 'bold ' + (this.cellSize * 0.5) + 'px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(this.board[r][c], 
                            x + this.cellSize / 2, 
                            y + this.cellSize / 2 + this.cellSize * 0.15);
        }
        
        // 网格线
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
      }
    }
  }
  
  drawBottomBar() {
    this.drawButton(15, this.height - 55, 70, 40, '← 返回');
    this.drawButton(this.width - 85, this.height - 55, 70, 40, '重置');
    
    // 提示
    this.ctx.font = (this.width / 32) + 'px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('点击格子循环切换：空 → 墙 → 岛', this.width / 2, this.height - 70);
  }
  
  drawButton(x, y, w, h, text) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.beginPath();
    roundRect(ctx,x, y, w, h, 20);
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

module.exports = Nurikabe;
