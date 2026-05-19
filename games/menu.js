class Menu {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    const { DailyChallenge } = require('./daily-challenge');
    this.dailyChallenge = new DailyChallenge();
    this._dailyBanner = null;
    
    // 右上角"我的"按钮
    this.profileBtn = {
      x: this.width - 80,
      y: 20,
      w: 65,
      h: 35
    };
    
    // 左上角音效开关
    this.soundBtn = {
      x: 10,
      y: 20,
      w: 50,
      h: 35
    };
    const sound = require('./sound-manager');
    this.soundEnabled = sound.enabled;
    
    this.games = [
      { name: 'othello', title: '黑白棋', icon: '⚫', color: '#2D5A27' },
      { name: 'akari', title: '数灯', icon: '💡', color: '#FFB800' },
      { name: 'sokoban', title: '推箱子', icon: '📦', color: '#8B4513' },
      { name: 'nurikabe', title: '数墙', icon: '🧱', color: '#607D8B' },
      { name: 'tents', title: '帐篷', icon: '⛺', color: '#4CAF50' },
      { name: '24point', title: '24点', icon: '🧮', color: '#FF5722' },
      { name: 'slither-link', title: '数回', icon: '🔗', color: '#2196F3' },
      { name: 'nonogram', title: '数织', icon: '🎨', color: '#9C27B0' },
      { name: 'battleship', title: '海战', icon: '🚢', color: '#00BCD4' },
      { name: 'merge-abc', title: 'ABC合成', icon: '🔤', color: '#f2b179' }
    ];
    
    this.gameTotalLevels = {
      'othello': 30, 'akari': 30, 'sokoban': 30, 'nurikabe': 30,
      'tents': 30, '24point': 50, 'slither-link': 30, 'nonogram': 30,
      'battleship': 30, 'merge-abc': 10
    };
    
    // 3列网格布局
    this.cols = 3;
    this.padding = 15;
    this.gridGap = 10;
    this.headerHeight = 70;
    this.footerHeight = 20;
    this.availableHeight = this.height - this.headerHeight - this.footerHeight - this.padding * 2;
    this.buttonSize = Math.min(
      (this.width - this.padding * 2 - this.gridGap * (this.cols - 1)) / this.cols,
      this.availableHeight / Math.ceil(this.games.length / this.cols)
    );
    this.rows = Math.ceil(this.games.length / this.cols);
    this.startY = this.headerHeight + this.padding + (this.availableHeight - (this.rows * this.buttonSize + (this.rows - 1) * this.gridGap)) / 2;
    
    this.animationTime = 0;
    this.bindEvents();
  }
  
  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;
      
      // 检查音效开关
      const sBtn = this.soundBtn;
      if (x >= sBtn.x && x <= sBtn.x + sBtn.w && y >= sBtn.y && y <= sBtn.y + sBtn.h) {
        const sound = require('./sound-manager');
        this.soundEnabled = sound.toggle();
        this.draw();
        return;
      }
      
      // 检查"我的"按钮
      const btn = this.profileBtn;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.switchGame('profile');
        return;
      }
      
      for (let i = 0; i < this.games.length; i++) {
        const col = i % this.cols;
        const row = Math.floor(i / this.cols);
        const buttonX = this.padding + col * (this.buttonSize + this.gridGap);
        const buttonY = this.startY + row * (this.buttonSize + this.gridGap);
        
        if (x >= buttonX && x <= buttonX + this.buttonSize &&
            y >= buttonY && y <= buttonY + this.buttonSize) {
          const gameName = this.games[i].name;
          // 黑白棋和合成ABC直接进入游戏，其他游戏跳转到选关页面
          if (gameName === 'othello' || gameName === 'merge-abc') {
            this.switchGame(gameName);
          } else {
            this.switchGame('level-select', gameName);
          }
          return;
        }
      }
      // 检查每日挑战横幅
      const db = this._dailyBanner;
      if (db && x >= db.x && x <= db.x + db.w && y >= db.y && y <= db.y + db.h) {
        const dc = this.dailyChallenge.getToday();
        // 黑白棋和合成ABC直接进入游戏，其他游戏跳转到选关页面
        if (dc.game === 'othello' || dc.game === 'merge-abc') {
          this.switchGame(dc.game);
        } else {
          this.switchGame('level-select', dc.game);
        }
        return;
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }
  
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  update() {
    this.animationTime += 0.05;
  }
  
  draw() {
    this.drawBackground();
    this.drawHeader();
    this.drawGrid();
  }
  
  drawBackground() {
    let gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // 装饰线
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      let y = (i * 80 + this.animationTime * 5) % this.height;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }
  
  drawHeader() {
    // 左上角音效开关
    const sBtn = this.soundBtn;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    this.roundRect(this.ctx,sBtn.x, sBtn.y, sBtn.w, sBtn.h, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.soundEnabled ? '🔊' : '🔇', sBtn.x + sBtn.w / 2, sBtn.y + sBtn.h / 2 + 5);
    
    // 右上角"我的"按钮
    const btn = this.profileBtn;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    this.roundRect(this.ctx,btn.x, btn.y, btn.w, btn.h, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('👤 我的', btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
    
    // 标题
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold ' + (this.width / 14) + 'px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('🎮 指尖谜题', this.padding, 75);
    
    // 分隔线
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.width * 0.15, 90);
    this.ctx.lineTo(this.width * 0.85, 90);
    this.ctx.stroke();
    
    // 每日挑战横幅
    this._drawDailyBanner();
  }
  
  _drawDailyBanner() {
    const dc = this.dailyChallenge.getToday();
    const bannerW = this.width * 0.9;
    const bannerH = 44;
    const bannerX = (this.width - bannerW) / 2;
    const bannerY = 96;
    this._dailyBanner = { x: bannerX, y: bannerY, w: bannerW, h: bannerH };
    
    this.ctx.fillStyle = dc.completed ? 'rgba(76,175,80,0.15)' : 'rgba(255,193,7,0.15)';
    this.ctx.beginPath();
    this.roundRect(this.ctx,bannerX, bannerY, bannerW, bannerH, 10);
    this.ctx.fill();
    this.ctx.strokeStyle = dc.completed ? 'rgba(76,175,80,0.3)' : 'rgba(255,193,7,0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = dc.completed ? '#4CAF50' : '#FFC107';
    this.ctx.font = 'bold 13px Arial';
    this.ctx.fillText(dc.completed ? '✅ 今日挑战已完成' : '📅 每日挑战', bannerX + 12, bannerY + 18);
    
    this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(dc.gameTitle + ' 第' + dc.level + '关' + (dc.completed ? '' : '  >'), bannerX + 12, bannerY + 35);
    
    const streak = this.dailyChallenge.getStreak();
    if (streak > 0) {
      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = '#FF6B6B';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.fillText('🔥' + streak + '天', bannerX + bannerW - 12, bannerY + 27);
    }
  }
  
  drawGrid() {
    for (let i = 0; i < this.games.length; i++) {
      const game = this.games[i];
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      // 最后一行居中
      const isLastRow = (i >= this.games.length - (this.games.length % this.cols || this.cols)) && row === Math.floor((this.games.length - 1) / this.cols);
      const offsetX = (isLastRow && this.games.length % this.cols !== 0)
        ? (this.cols - (this.games.length % this.cols)) * (this.buttonSize + this.gridGap) / 2
        : 0;
      const buttonX = this.padding + col * (this.buttonSize + this.gridGap) + offsetX;
      const buttonY = this.startY + row * (this.buttonSize + this.gridGap);
      
      // 悬浮动画
      const hover = Math.sin(this.animationTime + i * 0.5) * 2;
      const y = buttonY + hover;
      
      // 按钮阴影
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.beginPath();
      this.roundRect(this.ctx,buttonX + 2, y + 4, this.buttonSize, this.buttonSize, 16);
      this.ctx.fill();
      
      // 按钮主体渐变
      let gradient = this.ctx.createLinearGradient(buttonX, y, buttonX, y + this.buttonSize);
      gradient.addColorStop(0, this.lightenColor(game.color, 15));
      gradient.addColorStop(1, game.color);
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.roundRect(this.ctx,buttonX, y, this.buttonSize, this.buttonSize, 16);
      this.ctx.fill();
      
      // 顶部高光条
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.beginPath();
      this.roundRect(this.ctx,buttonX + 4, y + 4, this.buttonSize - 8, 6, 3);
      this.ctx.fill();
      
      // 图标
      const iconSize = this.buttonSize * 0.45;
      this.ctx.font = iconSize + 'px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(game.icon, buttonX + this.buttonSize / 2, y + this.buttonSize / 2 + 8);
      
      // 标题
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold ' + (this.buttonSize * 0.2) + 'px Arial';
      this.ctx.fillText(game.title, buttonX + this.buttonSize / 2, y + this.buttonSize - 25);
      
      // 通关进度
      try {
        const saved = wx.getStorageSync(`progress_${game.name}`);
        if (saved) {
          const progress = JSON.parse(saved);
          const completed = Object.keys(progress.stars).length;
          const total = this.gameTotalLevels[game.name] || 30;
          if (completed > 0) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = (this.buttonSize * 0.15) + 'px Arial';
            this.ctx.fillText(`${completed}/${total}`, buttonX + this.buttonSize / 2, y + this.buttonSize - 8);
            
            // 进度条
            const barW = this.buttonSize * 0.7;
            const barH = 3;
            const barX = buttonX + (this.buttonSize - barW) / 2;
            const barY = y + this.buttonSize - 3;
            const ratio = Math.min(completed / total, 1);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.fillRect(barX, barY, barW, barH);
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(barX, barY, barW * ratio, barH);
          }
        }
      } catch(e) {}
    }
  }
  
  lightenColor(hex, percent) {
    let num = parseInt(hex.replace('#', ''), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = (num >> 8 & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + 
      (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
      (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
  }
  
  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
  }
}

module.exports = Menu;
