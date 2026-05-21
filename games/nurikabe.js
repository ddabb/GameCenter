const LevelLoader = require('./level-loader');
const statsManager = require('./stats-manager.js').getInstance();
const Confetti = require('./confetti');
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');

const VictoryPanel = require('./components/victory-panel');
const HeaderBar = require('./components/header-bar');
const BottomBar = require('./components/bottom-bar');
class Nurikabe {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    console.log(`[Nurikabe] 初始化游戏, 关卡: ${level}`);
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
    this.gameName = 'nurikabe';
    
    this.cellSize = Math.min(this.width * 0.9 / 7, 50);
    this.boardOffsetX = (this.width - this.cellSize * 7) / 2;
    this.boardOffsetY = this.statusBarHeight + 100;
    
    this.board = [];
    this.marks = [];
    this.animationTime = 0;
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = new AchievementManager();



    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    
    this.loadLevel();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);

    // 共享 UI 组件
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });
    this.bindEvents();
  }
  
  async loadLevel() {
    console.log(`[Nurikabe] 加载关卡: ${this.level}`);
    if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
    try {
      const data = await LevelLoader.load('nurikabe', this.level);
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
    } catch (e) { /* CDN失败，走内置题 */ }
    
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
      let y = touch.clientY;
      
      // 底部工具栏按钮检测（使用共享组件）
      const action = this.bottomBar.handleClick(x, y);
      if (action) {
        this._handleBottomAction(action);
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
    this.ctx.fillStyle = '#0a1628';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.drawBoard();
    // 使用共享组件
    this.headerBar.draw({
      title: '数连',
      info: '第 ' + this.level + ' 关',
      info2: this.size + '×' + this.size
    });
    const buttons = [];
    if (this.undoMgr && this.undoMgr.canUndo()) {
      buttons.push({ id: 'undo', text: '撤销' });
    }
    buttons.push({ id: 'restart', text: '重开' });
    this.bottomBar.setButtons(buttons);
    this.bottomBar.draw();
    
    if (this.victory) {
      this.victoryPanel.setSubtitle('第 ' + this.level + ' 关');
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }
    
    if (this.tutorial && this.tutorial.shouldShow()) this.tutorial.draw();
  }


  
  checkVictory() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === 0 && this.marks[r][c] === 0) return;
      }
    }
    console.log(`[Nurikabe] 通关！关卡: ${this.level}`);
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
  
  
  drawBoard() {
    // 棋盘阴影
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.boardOffsetX + 3, this.boardOffsetY + 5, 
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

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.undoMgr && this.undoMgr.canUndo()) {
          const state = this.undoMgr.undo();
          if (state) {
            this.board = state.board;
            this.marks = state.marks;
            sound.playClick();
            this.draw();
          }
        }
        break;
      case 'restart':
        this.initBoard();
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
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
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

module.exports = Nurikabe;
