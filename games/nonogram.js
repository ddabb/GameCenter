const statsManager = require('./stats-manager.js').getInstance();
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');
const { HintManager } = require('./hint-manager');
const Confetti = require('./confetti');
/**
 * 数织 (Nonogram) - 小游戏版
 * 规则：根据行列提示填充格子，完成图案
 */
class Nonogram {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    
    this.level = level;
    statsManager.startGame(this.gameName, level) || 1;
    this.gameName = 'nonogram';
    
    this.size = 6;
    this.cellSize = Math.min(this.width * 0.8 / this.size, 45);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = 150;
    
    this.grid = [];
    this.rowHints = [];
    this.colHints = [];
    this.answer = [];
    
    this.animationTime = 0;
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);



    this.hintMgr = new HintManager(); this._levelData = null;
    
    this.loadLevel();
    this.bindEvents();
  }
  
  async loadLevel() {
    if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear(); if (this.hintMgr) this.hintMgr.reset();
    const safeLevel = String(this.level).padStart(4, '0');
    try {
      const data = require(`../data/nonogram/easy-${safeLevel}.json`);
      this._levelData = data

      if (data) {
        this.size = data.size || 6;
        this.cellSize = Math.min(this.width * 0.8 / this.size, 45);
        this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
        this.answer = data.answer || [];
        this.rowHints = data.rowHints || [];
        this.colHints = data.colHints || [];
      }
    } catch (e) {
      // 使用内置题目
      this.answer = [
        [0,1,0,0,1,0],
        [1,1,1,1,1,1],
        [1,1,1,1,1,1],
        [1,1,1,1,1,1],
        [0,1,1,1,1,0],
        [0,0,1,1,0,0]
      ];
      this.size = 6;
      this.rowHints = [[1,1],[6],[6],[6],[4],[2]];
      this.colHints = [[3,1],[3],[4],[4],[4],[1,1]];
    }
    
    // 初始化玩家网格
    this.grid = [];
    for (let r = 0; r < this.size; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.size; c++) {
        this.grid[r][c] = 0;
      }
    }
    
    this.victory = false;
  }
  
  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;
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
      }// 撤销按钮检测
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
          const answerData = this._levelData.answer;
          const hint = this.hintMgr.getHint('nonogram', answerData, this.grid);
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
      }// 顶部返回按钮（左上角）
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

      // 检查格子点击
      const col = Math.floor((x - this.boardOffsetX) / this.cellSize);
      const row = Math.floor((y - this.boardOffsetY) / this.cellSize);
      
      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        if (this.undoMgr) this.undoMgr.save({ grid: this.grid.map(r => [...r]) });
        this.grid[row][col] = this.grid[row][col] === 1 ? 0 : 1;
        this.checkVictory();
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }
  
  checkVictory() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] !== this.answer[r][c]) return;
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
  
  update() {
    this.animationTime += 0.08;
  }
  
  draw() {
    this.drawBackground();
      
    this.drawHeader();
    this.drawHints();
    this.drawBoard();
    this.drawBottomBar();
    
    if (this.victory) {
      this.drawVictory();
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
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('← 返回', 15, 38);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold ' + (this.width / 16) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎨 数织游戏', this.width / 2, 40);
    
    this.ctx.font = (this.width / 30) + 'px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText('根据提示填充格子', this.width / 2, 70);
    
    this.ctx.fillText('关卡 ' + this.level, this.width / 2, 95);
  }
  
  drawHints() {
    // 绘制列提示
    this.ctx.font = (this.cellSize * 0.35) + 'px Arial';
    this.ctx.textAlign = 'center';
    for (let c = 0; c < this.size; c++) {
      const x = this.boardOffsetX + c * this.cellSize + this.cellSize / 2;
      const hints = this.colHints[c];
      for (let i = 0; i < hints.length; i++) {
        const y = this.boardOffsetY - (hints.length - i - 1) * 18 - 5;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText(hints[i], x, y);
      }
    }
    
    // 绘制行提示
    this.ctx.textAlign = 'right';
    for (let r = 0; r < this.size; r++) {
      const y = this.boardOffsetY + r * this.cellSize + this.cellSize / 2 + 5;
      const hints = this.rowHints[r];
      let text = hints.join(' ');
      const x = this.boardOffsetX - 10;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.fillText(text, x, y);
    }
  }
  
  drawBoard() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const x = this.boardOffsetX + c * this.cellSize;
        const y = this.boardOffsetY + r * this.cellSize;
        
        // 背景
        this.ctx.fillStyle = '#2a2a4a';
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        
        // 填充
        if (this.grid[r][c] === 1) {
          let gradient = this.ctx.createLinearGradient(x, y, x + this.cellSize, y + this.cellSize);
          gradient.addColorStop(0, '#6BCB77');
          gradient.addColorStop(1, '#4CAF50');
          this.ctx.fillStyle = gradient;
          this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
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
  
  showBackButton() {
    const panelW = 260, panelH = 200;
    const panelX = (this.width - panelW) / 2;
    const panelY = (this.height - panelH) / 2;

    // 半透明遮罩
    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 面板背景
    this.roundRect(panelX, panelY, panelW, panelH, 16);
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
    this.roundRect(btnX, panelY + 100, btnW, btnH, 21);
    this.ctx.fillStyle = '#6BCB77';
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 17px Arial';
    this.ctx.fillText('下一关', this.width / 2, panelY + 126);
    this._nextBtn = { x: btnX, y: panelY + 100, w: btnW, h: btnH };

    // 返回选关按钮
    this.roundRect(btnX, panelY + 152, btnW, btnH, 21);
    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '15px Arial';
    this.ctx.fillText('返回选关', this.width / 2, panelY + 178);
    this._backBtn = { x: btnX, y: panelY + 152, w: btnW, h: btnH };
  }

  roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.arcTo(x + w, y, x + w, y + r, r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.arcTo(x, y + h, x, y + h - r, r);
    this.ctx.lineTo(x, y + r);
    this.ctx.arcTo(x, y, x + r, y, r);
    this.ctx.closePath();
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

module.exports = Nonogram;
