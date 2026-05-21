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
    
    // 安全区域适配
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.level = level;
    statsManager.startGame(this.gameName, level) || 1;
    this.gameName = 'nonogram';
    
    this.size = 6;
    this.cellSize = Math.min(this.width * 0.8 / this.size, 45);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = this.statusBarHeight + 150;
    
    this.grid = [];
    this.rowHints = [];
    this.colHints = [];
    this.answer = [];
    
    this.animationTime = 0;
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = new AchievementManager();



    this.hintMgr = new HintManager(); this._levelData = null;
    
    this.loadLevel();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
    
    // 共享 UI 组件
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });
  }
  
  async loadLevel() {
    if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear(); if (this.hintMgr) this.hintMgr.reset();
    try {
      const data = await LevelLoader.load('nonogram', this.level);
      if (data && data.answer) {
        this.size = data.size || 6;
        this.cellSize = Math.min(this.width * 0.8 / this.size, 45);
        this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
        this.answer = data.answer || [];
        this.rowHints = data.rowHints || [];
        this.colHints = data.colHints || [];
        this.victory = false;
        this.undoMgr.clear();
        this.draw();
        return;
      }
    } catch (e) { /* CDN失败，走内置题 */ }
    
    // 内置题目（保底）
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
    this.victory = false;
    this.undoMgr.clear();
    this.grid = [];
    for (let r = 0; r < this.size; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.size; c++) {
        this.grid[r][c] = 0;
      }
    }
    this.draw();
  }
  
  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;
      // 规则按钮（右上角）
    
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
          this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear(); if (this.hintMgr) this.hintMgr.reset();
          return;
        }
        if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w && y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        return;
      }// 底部工具栏按钮检测（使用共享组件）
      const action = this.bottomBar.handleClick(x, y);
      if (action) {
        this._handleBottomAction(action);
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
      
    // 顶部栏（使用共享组件）
    this.headerBar.draw({ title: '🎨 数织', info: `关卡 ${this.level}` });
    
    // 规则按钮（右上角）
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.ctx.beginPath();
    roundRect(this.ctx, this._ruleBtn.x, this._ruleBtn.y, this._ruleBtn.w, this._ruleBtn.h, 20);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 22px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('?', this._ruleBtn.x + 20, this._ruleBtn.y + 28);
    
    this.drawHints();
    this.drawBoard();
    
    // 底部工具栏
    const buttons = [{ id: 'reset', text: '🔄 重置', enabled: true }];
    if (this.undoMgr && this.undoMgr.canUndo()) {
      buttons.unshift({ id: 'undo', text: '↩️ 撤销', enabled: true });
    }
    if (this.hintMgr && this._levelData) {
      buttons.push({ id: 'hint', text: '💡 提示', enabled: true });
    }
    this.bottomBar.setButtons(buttons);
    this.bottomBar.draw();
    
    if (this.victory) {
      this.victoryPanel.setSubtitle(`第 ${this.level} 关`);
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
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
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

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.undoMgr && this.undoMgr.canUndo()) {
          const prev = this.undoMgr.undo();
          if (prev) {
            this.grid = prev.grid;
            sound.playClick();
            this.draw();
          }
        }
        break;
      case 'restart':
        this.initGrid();
        this.undoMgr.clear();
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

  _drawAchievementPopup() {
    this._newAchievements = null;
  }
}

module.exports = Nonogram;
