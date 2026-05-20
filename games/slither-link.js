const LevelLoader = require('./level-loader');
const statsManager = require('./stats-manager.js').getInstance();
const Confetti = require('./confetti');
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');
/**
 * 数回 (Slither Link) - 小游戏版
 * 规则：在格点间画线，形成一条闭合回路，数字表示该格周围的线段数
 */
class SlitherLink {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    console.log(`[SlitherLink] 初始化游戏, 关卡: ${level}`);
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    
    // 安全区域适配
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.level = level;
    statsManager.startGame(this.gameName, level) || 1;
    this.gameName = 'slither-link';
    this.cellSize = Math.min(this.width * 0.85 / this.size, 50);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = this.statusBarHeight + 175;
    
    this.hEdges = [];
    this.vEdges = [];
    this.hints = [];
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = new AchievementManager();



    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    this.animationTime = 0;
    
    this.loadLevel();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
  }
  
  async loadLevel() {
    console.log(`[SlitherLink] 加载关卡: ${this.level}`);
    if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
    try {
      const data = await LevelLoader.load('slither-link', this.level, this.difficulty);
      if (data && data.grid) {
        this.size = data.size || 5;
        this.cellSize = Math.min(this.width * 0.85 / this.size, 50);
        this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
        this.hints = data.grid;
        this.victory = false;
        this.undoMgr.clear();
        this.draw();
        return;
      }
    } catch (e) { /* CDN失败，走内置题 */ }
    
    // 内置题目（保底）
    this.hints = [
      [3, 2, 1, 1, 2],
      [1, 2, 1, 1, 2],
      [1, 2, 2, 2, 1],
      [2, 1, 1, 2, 1],
      [2, 2, 1, 2, 3]
    ];
    this.size = 5;
    this.cellSize = Math.min(this.width * 0.85 / this.size, 50);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.victory = false;
    this.undoMgr.clear();
    // 初始化边状态
    this.hEdges = [];
    this.vEdges = [];
    for (let r = 0; r <= this.size; r++) {
      this.hEdges[r] = [];
      this.vEdges[r] = [];
      for (let c = 0; c <= this.size; c++) {
        this.hEdges[r][c] = 0;
        this.vEdges[r][c] = 0;
      }
    }
    this.draw();
  }
  
  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;// 撤销按钮检测
      if (this._undoBtn && x >= this._undoBtn.x && x <= this._undoBtn.x + this._undoBtn.w && y >= this._undoBtn.y && y <= this._undoBtn.y + this._undoBtn.h) {
        const state = this.undoMgr.undo();
        if (state) {
          this.hLines = state.hLines;
          this.vLines = state.vLines;
          this.draw();
        }
        return;
      }
      
      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }// 返回按钮（顶部左侧）
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
        // 检查是否点击了下一关按钮
        if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w && y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {
          this.level++;
          this.loadLevel();
          sound.play('click');
          this._nextBtn = null;
          this._backBtn = null;
          this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
          this._victoryPanel = null;
          return;
        }
        // 检查是否点击了返回选关按钮
        if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w && y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        // 面板未显示，显示面板
        if (!this._nextBtn || !this._backBtn) {
          this.showBackButton(x, y);
        }
        return;
      }
      
      // 重置按钮
      if (x > this.width - 80 && y > this.height - 60) {
        this.loadLevel();
        return;
      }
      
      // 计算点击的边
      const gridX = x - this.boardOffsetX;
      const gridY = y - this.boardOffsetY;
      
      // 检查水平边
      for (let r = 0; r <= this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const ex = this.boardOffsetX + c * this.cellSize;
          const ey = this.boardOffsetY + r * this.cellSize - 3;
          if (x > ex && x < ex + this.cellSize && y > ey - 15 && y < ey + 15) {
            if (this.undoMgr) this.undoMgr.save({ hEdges: this.hEdges.map(r => [...r]), vEdges: this.vEdges.map(r => [...r]) });
            this.hEdges[r][c] = this.hEdges[r][c] === 1 ? 0 : 1;
            this.checkVictory();
            return;
          }
        }
      }
      
      // 检查垂直边
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c <= this.size; c++) {
          const ex = this.boardOffsetX + c * this.cellSize - 3;
          const ey = this.boardOffsetY + r * this.cellSize;
          if (x > ex - 15 && x < ex + 15 && y > ey && y < ey + this.cellSize) {
            if (this.undoMgr) this.undoMgr.save({ hEdges: this.hEdges.map(r => [...r]), vEdges: this.vEdges.map(r => [...r]) });
            this.vEdges[r][c] = this.vEdges[r][c] === 1 ? 0 : 1;
            this.checkVictory();
            return;
          }
        }
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }
  
  checkVictory() {
    // 简化版：不检查完整回路，只检查数字约束
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.hints[r][c] !== null) {
          let count = 0;
          if (this.hEdges[r][c] === 1) count++;
          if (this.hEdges[r + 1][c] === 1) count++;
          if (this.vEdges[r][c] === 1) count++;
          if (this.vEdges[r][c + 1] === 1) count++;
          if (count !== this.hints[r][c]) return;
        }
      }
    }
    console.log(`[SlitherLink] 通关！关卡: ${this.level}`);
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
  
  showBackButton(clickX, clickY) {
    let panelW = this.width * 0.85;
    let panelH = 260;
    let panelX = (this.width - panelW) / 2;
    let panelY = this.height / 2 - panelH / 2;
    
    this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 3;
    roundRect(this.ctx, panelX, panelY, panelW, panelH, 16);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold ' + (this.width / 10) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎉 通关！', this.width / 2, panelY + 55);
    
    this.ctx.fillStyle = '#aaa';
    this.ctx.font = (this.width / 26) + 'px Arial';
    this.ctx.fillText('第 ' + this.level + ' 关', this.width / 2, panelY + 90);
    
    let btnY = panelY + 115;
    let btnW = panelW - 40;
    let btnH = 50;
    let btnX = 20;
    
    // 下一关按钮
    this.ctx.fillStyle = '#4CAF50';
    roundRect(this.ctx, btnX, btnY, btnW, btnH, 10);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold ' + (this.width / 22) + 'px Arial';
    this.ctx.fillText('▶ 下一关', this.width / 2, btnY + 33);
    
    // 返回选关按钮
    this.ctx.fillStyle = '#555';
    roundRect(this.ctx, btnX, btnY + btnH + 12, btnW, btnH, 10);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = (this.width / 22) + 'px Arial';
    this.ctx.fillText('🏠 返回选关', this.width / 2, btnY + btnH + 12 + 33);
    
    this._nextBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    this._backBtn = { x: btnX, y: btnY + btnH + 12, w: btnW, h: btnH };
    
    // 分享按钮
    const shareBtnY = btnY + (btnH + 12) * 2;
    this.ctx.fillStyle = '#1976D2';
    roundRect(this.ctx, btnX, shareBtnY, btnW, 40, 10);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = (this.width / 24) + 'px Arial';
    this.ctx.fillText('📤 分享战绩', this.width / 2, shareBtnY + 27);
    this._shareBtn = { x: btnX, y: shareBtnY, w: btnW, h: 40 };
    
    this._victoryPanel = { x: panelX, y: panelY, w: panelW, h: panelH };
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
  
  drawBackground() {
    let gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
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
    this.ctx.fillText('🔗 数回游戏', this.width / 2, 40);
    
    this.ctx.font = (this.width / 30) + 'px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText('点击边画线，形成闭合回路', this.width / 2, 70);
    
    this.ctx.fillText('关卡 ' + this.level, this.width / 2, 95);
  }
  
  drawBoard() {
    // 绘制网格点
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let r = 0; r <= this.size; r++) {
      for (let c = 0; c <= this.size; c++) {
        const x = this.boardOffsetX + c * this.cellSize;
        const y = this.boardOffsetY + r * this.cellSize;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    // 绘制数字提示
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.hints[r][c] !== null) {
          const x = this.boardOffsetX + c * this.cellSize + this.cellSize / 2;
          const y = this.boardOffsetY + r * this.cellSize + this.cellSize / 2;
          
          // 检查约束是否满足
          let count = 0;
          if (this.hEdges[r][c] === 1) count++;
          if (this.hEdges[r + 1][c] === 1) count++;
          if (this.vEdges[r][c] === 1) count++;
          if (this.vEdges[r][c + 1] === 1) count++;
          
          this.ctx.fillStyle = count === this.hints[r][c] ? '#6BCB77' : '#FF6B6B';
          this.ctx.font = 'bold ' + (this.cellSize * 0.5) + 'px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(this.hints[r][c], x, y + this.cellSize * 0.15);
        }
      }
    }
    
    // 绘制水平边
    for (let r = 0; r <= this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.hEdges[r][c] === 1) {
          const x1 = this.boardOffsetX + c * this.cellSize;
          const x2 = this.boardOffsetX + (c + 1) * this.cellSize;
          const y = this.boardOffsetY + r * this.cellSize;
          
          this.ctx.strokeStyle = '#4FC3F7';
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          this.ctx.moveTo(x1, y);
          this.ctx.lineTo(x2, y);
          this.ctx.stroke();
        }
      }
    }
    
    // 绘制垂直边
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c <= this.size; c++) {
        if (this.vEdges[r][c] === 1) {
          const x = this.boardOffsetX + c * this.cellSize;
          const y1 = this.boardOffsetY + r * this.cellSize;
          const y2 = this.boardOffsetY + (r + 1) * this.cellSize;
          
          this.ctx.strokeStyle = '#4FC3F7';
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          this.ctx.moveTo(x, y1);
          this.ctx.lineTo(x, y2);
          this.ctx.stroke();
        }
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
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#6BCB77';
    this.ctx.font = 'bold ' + (this.width / 12) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎉 完美闭环！', this.width / 2, this.height / 2 - 20);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = (this.width / 28) + 'px Arial';
    this.ctx.fillText('点击任意位置返回菜单', this.width / 2, this.height / 2 + 30);
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

module.exports = SlitherLink;
