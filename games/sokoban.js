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
class Sokoban {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    console.log(`[Sokoban] 初始化游戏, 关卡: ${level}`);
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    
    this.level = level;
    statsManager.startGame(this.gameName, level) || 1;
    this.gameName = 'sokoban';
    
    // 安全区域适配
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.difficulty = 'easy';
    this.difficulties = [
      { name: 'easy', label: '简单', size: 6 },
      { name: 'medium', label: '中等', size: 8 },
      { name: 'hard', label: '困难', size: 10 }
    ];
    
    this.size = 6;
    this.cellSize = Math.min(this.width * 0.8 / this.size, 45);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = this.statusBarHeight + 130;
    
    this.grid = []; // 0=空, 1=墙, 2=目标
    this.boxes = [];
    this.player = {r: 1, c: 1};
    this.targets = [];
    this.moves = 0;
    this.history = [];
    this.animationTime = 0;
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = new AchievementManager();



    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    
    this.levels = {
      easy: [
        { grid: [
          [1,1,1,1,1,1],
          [1,0,0,0,0,1],
          [1,0,2,0,0,1],
          [1,0,0,2,0,1],
          [1,0,0,0,0,1],
          [1,1,1,1,1,1]
        ], boxes: [{r:2,c:2},{r:3,c:3}], player: {r:4,c:2} }
      ],
      medium: [
        { grid: [
          [1,1,1,1,1,1,1,1],
          [1,0,0,0,0,0,0,1],
          [1,0,2,0,0,2,0,1],
          [1,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,1],
          [1,0,2,0,0,2,0,1],
          [1,0,0,0,0,0,0,1],
          [1,1,1,1,1,1,1,1]
        ], boxes: [{r:2,c:2},{r:3,c:3},{r:4,c:4},{r:5,c:5}], player: {r:1,c:1} }
      ],
      hard: [
        { grid: [
          [1,1,1,1,1,1,1,1,1,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,0,2,0,0,0,0,2,0,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,0,2,0,0,0,0,2,0,1],
          [1,0,0,0,0,0,0,0,0,1],
          [1,1,1,1,1,1,1,1,1,1]
        ], boxes: [{r:2,c:2},{r:3,c:3},{r:6,c:6},{r:7,c:7}], player: {r:4,c:4} }
      ]
    };
    
    this.loadLevel();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
  }
  
  async loadLevel() {
    console.log(`[Sokoban] 加载关卡: ${this.level}`);
    if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
      const data = await LevelLoader.load('sokoban', this.level);
      if (this.confetti) this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
      if (data && data.grid) {
        this.size = data.size || data.grid.length;
        this.cellSize = Math.min(this.width * 0.8 / this.size, 40);
        this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
        this.boardOffsetY = 130;
        
        // 转换 grid 并标记目标位置
        this.grid = data.grid.map((row, r) =>
          row.map((cell, c) => {
            const isGoal = data.goals && data.goals.some(g => g[0] === r && g[1] === c);
            return isGoal ? 2 : cell;
          })
        );
        
        this.player = { r: data.playerStart[0], c: data.playerStart[1] };
        this.boxes = (data.boxes || []).map(b => ({ r: b[0], c: b[1] }));
        this.targets = (data.goals || []).map(g => ({ r: g[0], c: g[1] }));
        this.moves = 0;
        this.history = [];
        this.victory = false;
        return;
      }
    
    // 内置题目
    let lvl = this.levels[this.difficulty] && this.levels[this.difficulty][0];
    if (!lvl) {
      lvl = this.levels.easy[0];
    }
    this.size = lvl.grid.length;
    this.cellSize = Math.min(this.width * 0.8 / this.size, 40);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = 130;
    
    this.grid = lvl.grid.map(row => [...row]);
    this.boxes = lvl.boxes.map(b => ({...b}));
    this.player = {...lvl.player};
    this.moves = 0;
    this.history = [];
    this.victory = false;
    
    // 统计目标数
    this.targets = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 2) {
          this.targets.push({r, c});
        }
      }
    }
  }
  
  setDifficulty(diff) {
    this.difficulty = diff;
    this.loadLevel();
  }
  
  isWall(r, c) {
    return r < 0 || r >= this.size || c < 0 || c >= this.size || this.grid[r][c] === 1;
  }
  
  getBox(r, c) {
    return this.boxes.findIndex(b => b.r === r && b.c === c);
  }
  
  move(dr, dc) {
    if (this.victory) return;
    
    let nr = this.player.r + dr;
    let nc = this.player.c + dc;
    
    if (this.isWall(nr, nc)) return;
    
    let boxIdx = this.getBox(nr, nc);
    
    if (boxIdx >= 0) {
      // 推动箱子
      let br = nr + dr;
      let bc = nc + dc;
      
      if (this.isWall(br, bc) || this.getBox(br, bc) >= 0) return;
      
      this.history.push({...this.boxes[boxIdx]});
      this.boxes[boxIdx].r = br;
      this.boxes[boxIdx].c = bc;
    } else {
      this.history.push(null);
    }
    
    this.player.r = nr;
    this.player.c = nc;
    this.moves++;
    
    this.checkVictory();
  }
  
  undo() {
    if (this.history.length === 0) return;
    
    let last = this.history.pop();
    if (last) {
      this.boxes = this.boxes.map((b, i) => {
        if (b.r === last.r + (this.player.r - last.r) && b.c === last.c + (this.player.c - last.c)) {
          return {...last};
        }
        return b;
      });
    }
    
    if (this.history.length > 0) {
      let prev = this.history[this.history.length - 1];
      if (prev) {
        this.player.r = prev.r + (this.player.r - this.boxes[0].r + prev.r);
        this.player.c = prev.c + (this.player.c - this.boxes[0].c + prev.c);
      }
    }
    
    this.moves = Math.max(0, this.moves - 1);
  }
  
  checkVictory() {
    for (let t of this.targets) {
      let onTarget = this.boxes.some(b => b.r === t.r && b.c === t.c);
      if (!onTarget) return;
    }
    console.log(`[Sokoban] 通关！关卡: ${this.level}, 步数: ${this.moves}`);
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
      }
      
      // 规则按钮
      if (this._ruleBtn && x >= this._ruleBtn.x && x <= this._ruleBtn.x + this._ruleBtn.w && y >= this._ruleBtn.y && y <= this._ruleBtn.y + this._ruleBtn.h) {
        this.tutorial.show();
        this.draw();
        return;
      }// 顶部返回按钮
      if (x >= 15 && x <= 85 && y >= this.statusBarHeight + 8 && y <= this.statusBarHeight + 40) {
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
      
      // 难度
      let diffY = 55;
      let diffW = 60;
      let diffGap = 8;
      let totalW = 3 * diffW + 2 * diffGap;
      let diffStartX = (this.width - totalW) / 2;
      for (let i = 0; i < 3; i++) {
        let bx = diffStartX + i * (diffW + diffGap);
        if (y > diffY - 18 && y < diffY + 18 && x > bx && x < bx + diffW) {
          this.setDifficulty(this.difficulties[i].name);
          return;
        }
      }
      
      // 重置
      if (x > this.width - 85 && y > this.height - 100 && y < this.height - 60) {
        this.loadLevel();
        return;
      }
      
      // 撤销
      if (x > this.width - 85 && y > this.height - 55) {
        this.undo();
        return;
      }
      
      // 方向键（上半部分）
      let btnSize = 50;
      let btnY = this.boardOffsetY + this.size * this.cellSize + 20;
      let btnGap = 10;
      let btnStartX = (this.width - btnSize * 3 - btnGap * 2) / 2;
      
      // 上
      if (x > btnStartX + btnSize + btnGap && x < btnStartX + btnSize * 2 + btnGap && 
          y > btnY && y < btnY + btnSize) {
        this.move(-1, 0);
      }
      // 下
      if (x > btnStartX + btnSize + btnGap && x < btnStartX + btnSize * 2 + btnGap && 
          y > btnY + btnSize + btnGap && y < btnY + btnSize * 2 + btnGap) {
        this.move(1, 0);
      }
      // 左
      if (x > btnStartX && x < btnStartX + btnSize && 
          y > btnY + btnSize + btnGap && y < btnY + btnSize * 2 + btnGap) {
        this.move(0, -1);
      }
      // 右
      if (x > btnStartX + (btnSize + btnGap) * 2 && x < btnStartX + btnSize * 3 + btnGap * 2 && 
          y > btnY + btnSize + btnGap && y < btnY + btnSize * 2 + btnGap) {
        this.move(0, 1);
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
      title: '推箱子',
      info: '第 ' + this.level + ' 关',
      info2: '步数: ' + this.moves
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


  
  drawBackground() {
    let gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#2d2d2d');
    gradient.addColorStop(1, '#1a1a1a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  
  drawDifficultyBar() {
    let y = 55;
    let w = 60;
    let h = 32;
    let gap = 8;
    let totalW = 3 * w + 2 * gap;
    let startX = (this.width - totalW) / 2;
    
    for (let i = 0; i < 3; i++) {
      let x = startX + i * (w + gap);
      let diff = this.difficulties[i];
      let isActive = diff.name === this.difficulty;
      
      if (isActive) {
        this.ctx.fillStyle = 'rgba(139, 69, 19, 0.5)';
        this.ctx.beginPath();
        roundRect(this.ctx,x - 2, y - h/2 - 2, w + 4, h + 4, 8);
        this.ctx.fill();
      }
      
      this.ctx.fillStyle = isActive ? '#8B4513' : 'rgba(255, 255, 255, 0.15)';
      this.ctx.beginPath();
      roundRect(this.ctx,x, y - h/2, w, h, 8);
      this.ctx.fill();
      
      this.ctx.fillStyle = isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)';
      this.ctx.font = (w * 0.35) + 'px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(diff.label, x + w/2, y + 6);
    }
  }
  
  
  drawBoard() {
    if (!this.grid || !this.grid.length) return;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        let x = this.boardOffsetX + c * this.cellSize;
        let y = this.boardOffsetY + r * this.cellSize;
        
        if (this.grid[r][c] === 1) {
          // 墙
          this.ctx.fillStyle = '#4a4a4a';
          this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
          this.ctx.strokeStyle = '#333';
          this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
        } else if (this.grid[r][c] === 2) {
          // 目标
          this.ctx.fillStyle = '#2a2a4a';
          this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
          this.ctx.fillStyle = '#6BCB77';
          this.ctx.beginPath();
          this.ctx.arc(x + this.cellSize/2, y + this.cellSize/2, this.cellSize/4, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          // 空地
          this.ctx.fillStyle = '#3a3a4a';
          this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }
        
        // 网格
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
      }
    }
    
    // 箱子
    for (let box of this.boxes) {
      let x = this.boardOffsetX + box.c * this.cellSize;
      let y = this.boardOffsetY + box.r * this.cellSize;
      let onTarget = this.grid[box.r][box.c] === 2;
      
      // 箱子阴影
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.beginPath();
      roundRect(this.ctx,x + 3, y + 4, this.cellSize - 4, this.cellSize - 4, 6);
      this.ctx.fill();
      
      // 箱子
      let grad = this.ctx.createLinearGradient(x, y, x + this.cellSize, y + this.cellSize);
      if (onTarget) {
        grad.addColorStop(0, '#6BCB77');
        grad.addColorStop(1, '#4CAF50');
      } else {
        grad.addColorStop(0, '#CD853F');
        grad.addColorStop(1, '#8B4513');
      }
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      roundRect(this.ctx,x + 2, y + 2, this.cellSize - 4, this.cellSize - 4, 6);
      this.ctx.fill();
      
      // 箱子图标
      this.ctx.fillStyle = '#fff';
      this.ctx.font = (this.cellSize * 0.5) + 'px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('📦', x + this.cellSize/2, y + this.cellSize/2 + 5);
    }
    
    // 玩家
    let px = this.boardOffsetX + this.player.c * this.cellSize;
    let py = this.boardOffsetY + this.player.r * this.cellSize;
    
    let pulse = Math.sin(this.animationTime * 2) * 2;
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(px + this.cellSize/2, py + this.cellSize/2, this.cellSize/2 + pulse, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.font = (this.cellSize * 0.6) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🧑', px + this.cellSize/2, py + this.cellSize/2 + this.cellSize * 0.15);
  }

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.undoMgr && this.undoMgr.canUndo()) {
          const state = this.undoMgr.undo();
          if (state) {
            this.grid = state.grid;
            this.player = state.player;
            this.boxes = state.boxes;
            sound.playClick();
            this.draw();
          }
        }
        break;
      case 'restart':
        this.initLevel();
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
  
  drawControls() {
    // 方向键
    let btnSize = 50;
    let btnY = this.boardOffsetY + this.size * this.cellSize + 20;
    let btnGap = 10;
    let btnStartX = (this.width - btnSize * 3 - btnGap * 2) / 2;
    
    let positions = [
      {r: 0, c: 1, text: '⬆️'},
      {r: 1, c: 0, text: '⬅️'},
      {r: 1, c: 2, text: '➡️'},
      {r: 1, c: 1, text: '⬇️'}
    ];
    
    for (let pos of positions) {
      let bx = btnStartX + pos.c * (btnSize + btnGap);
      let by = btnY + pos.r * (btnSize + btnGap);
      
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.beginPath();
      roundRect(this.ctx,bx, by, btnSize, btnSize, 12);
      this.ctx.fill();
      
      this.ctx.font = (btnSize * 0.5) + 'px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(pos.text, bx + btnSize/2, by + btnSize/2 + 8);
    }
    
    // 底部按钮
    this.drawButton(this.width - 85, this.height - 100, 70, 35, '重置');
    this.drawButton(this.width - 85, this.height - 55, 70, 40, '撤销');
    
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
  }
  
  drawButton(x, y, w, h, text) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.beginPath();
    roundRect(this.ctx,x, y, w, h, 20);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = (this.width / 34) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x + w/2, y + h/2 + 5);
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


  _drawAchievementPopup() {
    this._newAchievements = null;
  }

}

module.exports = Sokoban;