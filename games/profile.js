/**
 * 用户信息页面 - 显示游戏进度、星级统计
 */
class Profile {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    
    // 游戏信息（与 level-select.js 保持一致）
    this.gameInfo = {
      'othello': { title: '黑白棋', icon: '⚫', color: '#2D5A27', totalLevels: 30 },
      'akari': { title: '数灯', icon: '💡', color: '#FFB800', totalLevels: 30 },
      'sokoban': { title: '推箱子', icon: '📦', color: '#8B4513', totalLevels: 30 },
      'nurikabe': { title: '数墙', icon: '🧱', color: '#607D8B', totalLevels: 30 },
      'tents': { title: '帐篷', icon: '⛺', color: '#4CAF50', totalLevels: 30 },
      '24point': { title: '24点', icon: '🧮', color: '#FF5722', totalLevels: 50 },
      'slither-link': { title: '数回', icon: '🔗', color: '#2196F3', totalLevels: 30 },
      'nonogram': { title: '数织', icon: '🎨', color: '#9C27B0', totalLevels: 30 },
      'battleship': { title: '海战', icon: '🚢', color: '#00BCD4', totalLevels: 30 },
      'merge-abc': { title: 'ABC合成', icon: '🔤', color: '#f2b179', totalLevels: 10 }
    };
    
    this.games = Object.keys(this.gameInfo).map(key => ({
      name: key,
      ...this.gameInfo[key]
    }));
    
    // 加载所有游戏的进度
    this.loadAllProgress();
    
    this.animationTime = 0;
    this.scrollY = 0;
    this.maxScroll = 0;
    this.bindEvents();
  }
  
  loadAllProgress() {
    this.progress = {};
    let totalCompleted = 0;
    let totalStars = 0;
    let totalLevels = 0;
    
    for (const game of this.games) {
      try {
        const saved = wx.getStorageSync(`progress_${game.name}`);
        if (saved) {
          this.progress[game.name] = JSON.parse(saved);
        } else {
          this.progress[game.name] = { unlocked: 1, stars: {} };
        }
      } catch (e) {
        this.progress[game.name] = { unlocked: 1, stars: {} };
      }
      
      const prog = this.progress[game.name];
      const completed = Object.keys(prog.stars).length;
      totalCompleted += completed;
      
      for (const star of Object.values(prog.stars)) {
        totalStars += star;
      }
      
      totalLevels += game.totalLevels;
    }
    
    this.totalCompleted = totalCompleted;
    this.totalStars = totalStars;
    this.totalLevels = totalLevels;
  }
  
  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;
      
      // 检查返回按钮
      if (y >= this.height - 70 && y <= this.height - 20) {
        if (x >= this.padding && x <= this.padding + 80) {
          this.switchGame('menu');
          return;
        }
        // 隐私政策按钮
        if (x >= this.width - this.padding - 90 && x <= this.width - this.padding) {
          this.switchGame('privacy');
          return;
        }
      }
      
      // 检查游戏项目点击（跳转到该游戏的选关页面）
      const itemHeight = 70;
      const startY = 160;
      
      // 检查统计按钮
      if (this.statsBtn && y >= this.statsBtn.y && y <= this.statsBtn.y + this.statsBtn.h &&
          x >= this.statsBtn.x && x <= this.statsBtn.x + this.statsBtn.w) {
        this.switchGame('stats');
        return;
      }
      
      const itemIndex = Math.floor((y - startY + this.scrollY) / itemHeight);
      if (itemIndex >= 0 && itemIndex < this.games.length) {
        this.switchGame('level-select', this.games[itemIndex].name);
      }
    };
    
    // 触摸滚动
    this.touchStartY = 0;
    this.touchStartScrollY = 0;
    
    this.touchStartHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      this.touchStartY = touch.clientY;
      this.touchStartScrollY = this.scrollY;
    };
    
    this.touchMoveHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let deltaY = this.touchStartY - touch.clientY;
      this.scrollY = Math.max(0, Math.min(this.maxScroll, this.touchStartScrollY + deltaY));
    };
    
    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: true });
    this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: true });
  }
  
  update() {
    this.animationTime += 0.05;
  }
  
  draw() {
    this.drawBackground();
    this.drawHeader();
    this.drawStats();
    this.drawGameList();
    this.drawFooter();
  }
  
  drawBackground() {
    let gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  
  drawHeader() {
    // 标题栏背景
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.fillRect(0, 0, this.width, 100);
    
    // 返回按钮
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.padding, 20, 60, 35, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('← 返回', this.padding + 30, 43);
    
    // 标题
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.fillText('👤 我的', this.width / 2, 43);
  }
  
  drawStats() {
    const centerX = this.width / 2;
    const cardY = 120;
    const cardWidth = this.width - this.padding * 2;
    const cardHeight = 100; // 增加20像素给按钮
    
    // 统计卡片背景
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.padding, cardY, cardWidth, cardHeight, 12);
    this.ctx.fill();
    
    // 三个统计项
    const itemWidth = cardWidth / 3;
    const stats = [
      { icon: '🎮', value: this.totalCompleted, label: '已通关' },
      { icon: '⭐', value: this.totalStars, label: '获得星星' },
      { icon: '📊', value: this.totalLevels, label: '总关卡' }
    ];
    
    stats.forEach((stat, i) => {
      const x = this.padding + itemWidth * i + itemWidth / 2;
      
      this.ctx.font = '28px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(stat.icon, x, cardY + 28);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 22px Arial';
      this.ctx.fillText(stat.value, x, cardY + 55);
      
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(stat.label, x, cardY + 72);
    });
    
    // 查看详细统计按钮
    this.statsBtn = { x: this.padding + 10, y: cardY + 82, w: cardWidth - 20, h: 28 };
    this.ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.statsBtn.x, this.statsBtn.y, this.statsBtn.w, this.statsBtn.h, 6);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(76, 175, 80, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('📊 查看详细统计', this.width / 2, this.statsBtn.y + 19);
  }
  
  drawGameList() {
    const itemHeight = 70;
    const startY = 180; // 从160调整为180，因为统计卡片高度增加
    const endY = this.height - 80;
    
    // 计算最大滚动
    const totalHeight = this.games.length * itemHeight;
    this.maxScroll = Math.max(0, totalHeight - (endY - startY));
    
    this.ctx.save();
    this.ctx.translate(0, -this.scrollY);
    
    for (let i = 0; i < this.games.length; i++) {
      const game = this.games[i];
      const info = this.gameInfo[game.name];
      const prog = this.progress[game.name];
      const completed = Object.keys(prog.stars).length;
      const stars = Object.values(prog.stars).reduce((a, b) => a + b, 0);
      
      const itemY = startY + i * itemHeight;
      
      // 项目背景
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      this.ctx.beginPath();
      roundRect(this.ctx,this.padding, itemY, this.width - this.padding * 2, itemHeight - 8, 10);
      this.ctx.fill();
      
      // 游戏图标
      this.ctx.font = '32px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(info.icon, this.padding + 30, itemY + itemHeight / 2 + 8);
      
      // 游戏名称
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(info.title, this.padding + 65, itemY + 28);
      
      // 进度文字
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(`${completed}/${info.totalLevels} 关`, this.padding + 65, itemY + 48);
      
      // 进度条
      const barX = this.padding + 140;
      const barWidth = this.width - barX - 80;
      const barHeight = 8;
      const barY = itemY + 36;
      const progress = info.totalLevels > 0 ? completed / info.totalLevels : 0;
      
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.beginPath();
      roundRect(this.ctx,barX, barY, barWidth, barHeight, 4);
      this.ctx.fill();
      
      this.ctx.fillStyle = info.color;
      this.ctx.beginPath();
      roundRect(this.ctx,barX, barY, barWidth * progress, barHeight, 4);
      this.ctx.fill();
      
      // 星星数量
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'right';
      this.ctx.fillText('⭐ ' + stars, this.width - this.padding - 10, itemY + itemHeight / 2 + 5);
    }
    
    this.ctx.restore();
  }
  
  drawFooter() {
    // 底部栏
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.fillRect(0, this.height - 70, this.width, 70);
    
    // 返回按钮
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.padding, this.height - 55, 80, 35, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('← 返回', this.padding + 40, this.height - 33);
    
    // 隐私政策按钮
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.width - this.padding - 90, this.height - 55, 90, 35, 8);
    this.ctx.fill();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '13px Arial';
    this.ctx.fillText('🔒 隐私政策', this.width - this.padding - 45, this.height - 33);
  }
  
  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
  }
}

module.exports = Profile;