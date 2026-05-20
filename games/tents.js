const statsManager = require('./stats-manager.js').getInstance();
const Confetti = require('./confetti');
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');
class Tents {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    console.log(`[Tents] 初始化游戏, 关卡: ${level}`);
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
    this.gameName = 'tents';
    
    this.cellSize = Math.min(this.width * 0.85 / 7, 55);
    this.boardOffsetX = (this.width - this.cellSize * 7) / 2;
    this.boardOffsetY = this.statusBarHeight + 110;
    
    this.tents = [];
    this.animationTime = 0;
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = new AchievementManager();



    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    
    this.loadLevel();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
  }
  
  async loadLevel() {
    console.log(`[Tents] 加载关卡: ${this.level}`);
    if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
    // 尝试从 data/ 加载真实关卡
    const safeLevel = String(this.level).padStart(4, '0');
    try {
      const data = require(`../data/tents/easy/easy-${safeLevel}.json`);
const roundRect = require('../utils/round-rect.js');

      if (data && data.grid) {
        this.size = data.size || 6;
        this.cellSize = Math.min(this.width * 0.85 / this.size, 55);
        this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
        this.boardOffsetY = 110;
        
        // 转换树位置到 board
        this.board = [];
        for (let r = 0; r < this.size; r++) {
          this.board[r] = [];
          for (let c = 0; c < this.size; c++) {
            this.board[r][c] = data.grid[r] && data.grid[r][c] === 1 ? 1 : 0;
          }
        }
        
        // 初始化玩家网格
        this.tents = [];
        for (let r = 0; r < this.size; r++) {
          this.tents[r] = [];
          for (let c = 0; c < this.size; c++) {
            this.tents[r][c] = 0;
          }
        }
        this.victory = false;
        return;
      }
    } catch (e) { /* 使用内置题 */ }
    
    // 内置题目
    this.board = [
      [0,0,1,0,0,1,0],
      [0,1,0,0,0,0,0],
      [0,0,0,1,0,0,1],
      [0,0,0,0,1,0,0],
      [1,0,0,0,0,0,0],
      [0,0,0,0,0,1,0],
      [0,1,0,0,0,0,1]
    ];
    
    this.tents = [];
    for (let r = 0; r < 7; r++) {
      this.tents[r] = [];
      for (let c = 0; c < 7; c++) {
        this.tents[r][c] = 0;
      }
    }
    this.victory = false;
  }
  
  // 行提示（每行需要几个帐篷）
  getRowHints() {
    return [2, 1, 2, 1, 1, 1, 2];
  }
  
  // 列提示（每列需要几个帐篷）
  getColHints() {
    return [1, 2, 1, 1, 1, 1, 2];
  }
  
  // 计算某行已放置的帐篷数
  countRowTents(row) {
    let count = 0;
    for (let c = 0; c < 7; c++) {
      if (this.tents[row][c] === 1) count++;
    }
    return count;
  }
  
  // 计算某列已放置的帐篷数
  countColTents(col) {
    let count = 0;
    for (let r = 0; r < 7; r++) {
      if (this.tents[r][col] === 1) count++;
    }
    return count;
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
          this.draw();
        }
        return;
      }
      
      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }// 顶部返回按钮
      if (x >= 15 && x <= 85 && y >= this.statusBarHeight + 8 && y <= this.statusBarHeight + 40) {
        sound.play('click');
          this.switchGame('level-select', this.gameName);
        return;
      }

      // 规则按钮
      if (this._ruleBtn && x >= this._ruleBtn.x && x <= this._ruleBtn.x + this._ruleBtn.w && y >= this._ruleBtn.y && y <= this._ruleBtn.y + this._ruleBtn.h) {
        this.tutorial.show();
        this.draw();
        return;
      }
      
      // 通关面板
      // 规则按钮（右上角）
    this._ruleBtn = { x: this.width - 50, y: 20, w: 40, h: 40 };
    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.ctx.beginPath();
    roundRect(this.ctx, this._ruleBtn.x, this._ruleBtn.y, this._ruleBtn.w, this._ruleBtn.h, 20);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 22px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('?', this._ruleBtn.x + 20, this._ruleBtn.y + 28);

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
        if (this.board[row][col] !== 1) { // 不能在树上放帐篷
          if (this.undoMgr) this.undoMgr.save({ tents: this.tents.map(r => [...r]) });
          this.tents[row][col] = this.tents[row][col] === 1 ? 0 : 1;
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

    // 规则弹窗
    if (this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
  }
  
  checkVictory() {
    // 简化检测：所有非树格子都标记了帐篷或标记完成
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] !== 1 && this.tents[r][c] === 0) return;
      }
    }
    console.log(`[Tents] 通关！关卡: ${this.level}`);
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
    gradient.addColorStop(0, '#1B4332');
    gradient.addColorStop(1, '#0d2818');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // 添加星星效果
    for (let i = 0; i < 20; i++) {
      let sx = (i * 43 + this.animationTime * 5) % this.width;
      let sy = (i * 67) % (this.height * 0.4);
      let alpha = 0.3 + Math.sin(this.animationTime + i) * 0.2;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  drawHeader() {
    // 左上角返回按钮
    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.ctx.beginPath();
    roundRect(this.ctx, 15, this.statusBarHeight + 8, 70, 32, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('← 返回', 50, this.statusBarHeight + 29);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold ' + (this.width / 16) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⛺ 帐篷游戏', this.width / 2, 40);
    
    this.ctx.font = (this.width / 32) + 'px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText('在每棵树旁放置一个帐篷', this.width / 2, 70);
    
    this.ctx.fillText('关卡 ' + this.level, this.width / 2, 95);
  }
  
  drawBoard() {
    const rowHints = this.getRowHints();
    const colHints = this.getColHints();
    
    // 绘制列提示
    for (let c = 0; c < 7; c++) {
      let x = this.boardOffsetX + c * this.cellSize + this.cellSize / 2;
      let count = this.countColTents(c);
      let hint = colHints[c];
      
      this.ctx.font = 'bold ' + (this.cellSize * 0.35) + 'px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = count === hint ? '#6BCB77' : '#FF6B6B';
      this.ctx.fillText(`${count}/${hint}`, x, this.boardOffsetY - 10);
    }
    
    // 绘制行提示
    for (let r = 0; r < 7; r++) {
      let y = this.boardOffsetY + r * this.cellSize + this.cellSize / 2;
      let count = this.countRowTents(r);
      let hint = rowHints[r];
      
      this.ctx.font = 'bold ' + (this.cellSize * 0.35) + 'px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = count === hint ? '#6BCB77' : '#FF6B6B';
      this.ctx.fillText(`${count}/${hint}`, this.boardOffsetX - 20, y + 5);
    }
    
    // 棋盘阴影
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.boardOffsetX + 3, this.boardOffsetY + 5, 
                       this.cellSize * 7, this.cellSize * 7, 8);
    this.ctx.fill();
    
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        let x = this.boardOffsetX + c * this.cellSize;
        let y = this.boardOffsetY + r * this.cellSize;
        
        // 草地背景
        let grassGradient = this.ctx.createLinearGradient(x, y, x + this.cellSize, y + this.cellSize);
        grassGradient.addColorStop(0, '#2d5a27');
        grassGradient.addColorStop(1, '#1a3a18');
        this.ctx.fillStyle = grassGradient;
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        
        // 树
        if (this.board[r][c] === 1) {
          let tx = x + this.cellSize / 2;
          let ty = y + this.cellSize / 2;
          let treePulse = Math.sin(this.animationTime) * 2;
          
          // 树干
          this.ctx.fillStyle = '#5D4037';
          this.ctx.fillRect(tx - 5, ty + treePulse, 10, 20);
          
          // 树冠
          this.ctx.fillStyle = '#1B5E20';
          this.ctx.beginPath();
          this.ctx.arc(tx, ty - 5 + treePulse, this.cellSize * 0.35, 0, Math.PI * 2);
          this.ctx.fill();
          
          // 树高光
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          this.ctx.beginPath();
          this.ctx.arc(tx - 5, ty - 10 + treePulse, this.cellSize * 0.15, 0, Math.PI * 2);
          this.ctx.fill();
        }
        
        // 帐篷
        if (this.tents[r][c] === 1) {
          let tx = x + this.cellSize / 2;
          let ty = y + this.cellSize / 2;
          let tentPulse = Math.sin(this.animationTime * 2) * 1;
          
          // 帐篷阴影
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          this.ctx.beginPath();
          this.ctx.moveTo(tx, y + 8 + tentPulse);
          this.ctx.lineTo(x + this.cellSize - 5, y + this.cellSize - 5);
          this.ctx.lineTo(x + 5, y + this.cellSize - 5);
          this.ctx.closePath();
          this.ctx.fill();
          
          // 帐篷主体
          let tentGradient = this.ctx.createLinearGradient(tx, y, tx, y + this.cellSize);
          tentGradient.addColorStop(0, '#F5F5DC');
          tentGradient.addColorStop(1, '#D2B48C');
          this.ctx.fillStyle = tentGradient;
          this.ctx.beginPath();
          this.ctx.moveTo(tx, y + 8 + tentPulse);
          this.ctx.lineTo(x + this.cellSize - 5, y + this.cellSize - 5);
          this.ctx.lineTo(x + 5, y + this.cellSize - 5);
          this.ctx.closePath();
          this.ctx.fill();
          
          // 帐篷入口
          this.ctx.fillStyle = '#8B4513';
          this.ctx.fillRect(tx - 5, y + this.cellSize - 15, 10, 10);
        }
        
        // 网格线
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
      }
    }
  }
  
  drawBottomBar() {
    this.drawButton(this.width - 85, this.height - 55, 70, 40, '重置');
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
  showBackButton() {
    const panelW = 260, panelH = 200;
    const panelX = (this.width - panelW) / 2;
    const panelY = (this.height - panelH) / 2;

    // 半透明遮罩
    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 面板背景
    roundRect(this.ctx, panelX, panelY, panelW, panelH, 16);
    this.ctx.fillStyle = '#1e2a4a';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // 标题
    this.ctx.fillStyle = '#6BCB77';
    this.ctx.font = 'bold 22px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎉 恭喜通关！', this.width / 2, panelY + 50);

    this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
    this.ctx.font = '15px Arial';
    this.ctx.fillText('关卡 ' + this.level, this.width / 2, panelY + 80);

    // 下一关按钮
    const btnW = 180, btnH = 42, btnX = (this.width - btnW) / 2;
    roundRect(this.ctx, btnX, panelY + 100, btnW, btnH, 21);
    this.ctx.fillStyle = '#6BCB77';
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 17px Arial';
    this.ctx.fillText('下一关', this.width / 2, panelY + 126);
    this._nextBtn = { x: btnX, y: panelY + 100, w: btnW, h: btnH };

    // 返回选关按钮
    roundRect(this.ctx, btnX, panelY + 152, btnW, btnH, 21);
    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '15px Arial';
    this.ctx.fillText('返回选关', this.width / 2, panelY + 178);
    this._backBtn = { x: btnX, y: panelY + 152, w: btnW, h: btnH };
  }

}

module.exports = Tents;
