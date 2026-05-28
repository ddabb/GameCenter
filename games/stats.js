/**
 * 数据统计页面 - 展示通关时长、正确率等数据
 */
const roundRect = require('../utils/round-rect.js');
const statsManager = require('./stats-manager.js').getInstance();
const sound = require('./sound-manager');

class Stats {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.padding = 16;

    this.gameInfo = {
      'othello': { title: '黑白棋', icon: '⚫', color: '#2D5A27' },
      'akari': { title: '灯塔', icon: '💡', color: '#FFB800' },
      'sokoban': { title: '推箱子', icon: '📦', color: '#8B4513' },
      'nurikabe': { title: '数墙', icon: '🧱', color: '#607D8B' },
      'tents': { title: '帐篷', icon: '⛺', color: '#4CAF50' },
      '24point': { title: '24点', icon: '🧮', color: '#FF5722' },
      'slither-link': { title: '数回', icon: '🔗', color: '#2196F3' },
      'nonogram': { title: '数织', icon: '🎨', color: '#9C27B0' },
      'battleship': { title: '战舰', icon: '🚢', color: '#00BCD4' },
      'merge-abc': { title: '合成ABC', icon: '🔤', color: '#f2b179' }
    };

    this.games = Object.keys(this.gameInfo);
    this.allStats = statsManager.getAllStats();
    
    this.scrollY = 0;
    this.maxScroll = 0;
    this.animationTime = 0;
    
    this.bindEvents();
  }

  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;

      // 返回按钮
      if (y >= 15 && y <= 55 && x >= this.padding && x <= this.padding + 70) {
        this.switchGame('profile');
        return;
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
    this.drawOverallStats();
    this.drawGameStats();
  }

  drawBackground() {
    let gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawHeader() {
    // 返回按钮
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.padding, 15, 70, 35, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('← 返回', this.padding + 35, this.statusBarHeight + 38);

    // 标题
    this.ctx.font = 'bold 18px Arial';
    this.ctx.fillText('📊 数据统计', this.width / 2, 38);
  }

  drawOverallStats() {
    const cardY = 60;
    const cardH = 90;
    const cardW = this.width - this.padding * 2;

    // 卡片背景
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.padding, cardY, cardW, cardH, 12);
    this.ctx.fill();

    // 四个统计项
    const itemW = cardW / 4;
    const stats = [
      { icon: '🎮', value: this.allStats.totalPlays, label: '总对局' },
      { icon: '🏆', value: this.allStats.totalWins, label: '通关数' },
      { icon: '⏱️', value: statsManager.formatTime(this.allStats.totalTime), label: '总时长' },
      { icon: '📈', value: this.allStats.totalPlays > 0 ? Math.round((this.allStats.totalWins / this.allStats.totalPlays) * 100) + '%' : '0%', label: '胜率' }
    ];

    stats.forEach((stat, i) => {
      const x = this.padding + itemW * i + itemW / 2;

      this.ctx.font = '24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(stat.icon, x, cardY + 28);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 18px Arial';
      this.ctx.fillText(stat.value, x, cardY + 55);

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.font = '11px Arial';
      this.ctx.fillText(stat.label, x, cardY + 75);
    });
  }

  drawGameStats() {
    const startY = 165;
    const endY = this.height - 20;
    const itemH = 65;
    const cardW = this.width - this.padding * 2;

    // 计算最大滚动
    const totalH = this.games.length * itemH;
    this.maxScroll = Math.max(0, totalH - (endY - startY));

    this.ctx.save();
    this.ctx.translate(0, -this.scrollY);

    this.games.forEach((gameName, i) => {
      const info = this.gameInfo[gameName];
      const stats = this.allStats.gameStats[gameName];
      const winRate = statsManager.getWinRate(stats);
      const avgTime = stats.totalWins > 0 ? Math.round(stats.totalTime / stats.totalWins) : 0;

      const itemY = startY + i * itemH;

      // 卡片背景
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      this.ctx.beginPath();
      roundRect(this.ctx,this.padding, itemY, cardW, itemH - 6, 10);
      this.ctx.fill();

      // 游戏图标
      this.ctx.font = '28px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(info.icon, this.padding + 28, itemY + 32);

      // 游戏名称
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 15px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(info.title, this.padding + 58, itemY + 22);

      // 统计数据行
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.font = '12px Arial';

      // 胜率
      const winRateColor = winRate >= 70 ? '#4CAF50' : winRate >= 40 ? '#FFC107' : '#FF5722';
      this.ctx.fillStyle = winRateColor;
      this.ctx.fillText(`胜率 ${winRate}%`, this.padding + 58, itemY + 42);

      // 场均时长
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.fillText(`场均 ${avgTime}秒`, this.padding + 140, itemY + 42);

      // 胜率进度条
      const barX = this.padding + 230;
      const barW = cardW - 245;
      const barH = 6;
      const barY = itemY + 30;

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.beginPath();
      roundRect(this.ctx,barX, barY, barW, barH, 3);
      this.ctx.fill();

      this.ctx.fillStyle = winRateColor;
      this.ctx.beginPath();
      roundRect(this.ctx,barX, barY, barW * (winRate / 100), barH, 3);
      this.ctx.fill();

      // 最佳记录
      const bestTimes = stats.bestTimes;
      const bestLevels = Object.keys(bestTimes);
      if (bestLevels.length > 0) {
        const bestLevel = bestLevels.reduce((a, b) => bestTimes[a] < bestTimes[b] ? a : b);
        const bestTime = bestTimes[bestLevel];
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '11px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`⭐ 最佳 ${statsManager.formatTime(bestTime)}`, this.padding + cardW - 10, itemY + 52);
      }
    });

    this.ctx.restore();

    // 滚动条
    if (this.maxScroll > 0) {
      const trackH = endY - startY;
      const thumbH = Math.max(30, trackH * (trackH / totalH));
      const thumbY = startY + (this.scrollY / this.maxScroll) * (trackH - thumbH);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.beginPath();
      roundRect(this.ctx,this.width - 6, thumbY, 3, thumbH, 2);
      this.ctx.fill();
    }
  }

  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
  }
}

module.exports = Stats;
